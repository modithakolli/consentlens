import { createServer } from "node:http";
import { URL } from "node:url";
import { analyzePolicyFromUrl } from "./src/policyAnalyzer.js";
import { lookupApp } from "./src/appIntel.js";
import { getDomainIntel, lookupDomain } from "./src/domainIntel.js";
import { legalRightsForRegion } from "./src/legalRights.js";
import { getTrackerObservations, recordTrackerObservations } from "./src/trackerArchive.js";

const PORT = Number(process.env.PORT || 8787);
const APP_VERSION = "0.2.0";
const ALLOWED_ORIGINS = String(process.env.ALLOWED_ORIGINS || "*")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const MAX_BODY_BYTES = Number(process.env.MAX_BODY_BYTES || 256 * 1024);
const RATE_LIMIT_WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000);
const rateLimits = new Map();

const ROUTE_LIMITS = {
  default: 120,
  analyzePolicy: 12,
  trackerObservations: 30,
  lookup: 40
};

function originAllowed(origin) {
  if (!origin) return true;
  if (ALLOWED_ORIGINS.includes("*")) return true;
  return ALLOWED_ORIGINS.some((pattern) => {
    if (pattern.endsWith("*")) {
      return origin.startsWith(pattern.slice(0, -1));
    }
    return origin === pattern;
  });
}

function sendJson(response, status, body, origin = "*") {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  });
  response.end(JSON.stringify(body));
}

async function readJson(request) {
  const chunks = [];
  let total = 0;
  for await (const chunk of request) {
    total += chunk.length;
    if (total > MAX_BODY_BYTES) {
      const error = new Error("Request body too large");
      error.status = 413;
      throw error;
    }
    chunks.push(chunk);
  }

  if (!chunks.length) return {};

  const raw = Buffer.concat(chunks).toString("utf8").trim();
  if (!raw) return {};

  try {
    return JSON.parse(raw);
  } catch (error) {
    const parseError = new Error("Request body must be valid JSON");
    parseError.status = 400;
    throw parseError;
  }
}

function notFound(response, origin = "*") {
  sendJson(response, 404, { ok: false, error: "Route not found" }, origin);
}

function clientKey(request, routeName) {
  const remote = request.socket?.remoteAddress || "unknown";
  return `${routeName}:${remote}`;
}

function allowRequest(request, routeName, limit) {
  const now = Date.now();
  const key = clientKey(request, routeName);
  const windowState = rateLimits.get(key) || { count: 0, resetAt: now + RATE_LIMIT_WINDOW_MS };

  if (now > windowState.resetAt) {
    windowState.count = 0;
    windowState.resetAt = now + RATE_LIMIT_WINDOW_MS;
  }

  windowState.count += 1;
  rateLimits.set(key, windowState);

  if (windowState.count > limit) {
    return {
      allowed: false,
      retryAfter: Math.max(1, Math.ceil((windowState.resetAt - now) / 1000))
    };
  }

  return { allowed: true };
}

function routeLimit(routeName) {
  return ROUTE_LIMITS[routeName] || ROUTE_LIMITS.default;
}

function stringValue(value) {
  return String(value || "").trim();
}

function normalizeRegion(region) {
  return stringValue(region || "IN").toUpperCase().slice(0, 8) || "IN";
}

function normalizeDomains(value) {
  const items = Array.isArray(value) ? value : [];
  return Array.from(new Set(items.map((item) => stringValue(item)).filter(Boolean))).slice(0, 50);
}

function validateHttpUrl(input, label) {
  const parsed = new URL(String(input || ""));
  if (!["http:", "https:"].includes(parsed.protocol)) {
    const error = new Error(`${label} must use http or https`);
    error.status = 400;
    throw error;
  }
  return parsed;
}

function trackerMatchesForDomains(domains) {
  const uniqueHosts = new Set(domains.map((domain) => lookupDomain(domain).host));
  return Array.from(uniqueHosts)
    .map((host) => lookupDomain(host))
    .filter((entry) => entry.known);
}

async function handle(request, response) {
  const url = new URL(request.url, `http://${request.headers.host}`);
  const origin = request.headers.origin || "";

  if (!originAllowed(origin)) {
    sendJson(response, 403, { ok: false, error: "Origin not allowed" }, origin || "*");
    return;
  }

  if (request.method === "OPTIONS") {
    response.writeHead(204, {
      "Access-Control-Allow-Origin": origin || "*",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    });
    response.end();
    return;
  }

  if (request.method === "GET" && url.pathname === "/") {
    sendJson(response, 200, {
      ok: true,
      service: "ConsentLens API",
      version: APP_VERSION,
      status: "running",
      endpoints: [
        "/health",
        "/legal-rights",
        "/domain-intel",
        "/site-intel",
        "/app-intel",
        "/tracker-observations",
        "/tracker-archive",
        "/analyze-policy"
      ]
    }, origin || "*");
    return;
  }

  if (request.method === "GET" && url.pathname === "/health") {
    sendJson(response, 200, {
      ok: true,
      service: "consentlens-backend",
      version: APP_VERSION,
      features: {
        policyAnalysis: true,
        appIntel: true,
        domainIntel: true,
        trackerArchive: true
      }
    }, origin || "*");
    return;
  }

  if (request.method === "GET" && url.pathname === "/legal-rights") {
    const region = normalizeRegion(url.searchParams.get("region"));
    sendJson(response, 200, {
      ok: true,
      rights: legalRightsForRegion(region)
    }, origin || "*");
    return;
  }

  if (request.method === "GET" && url.pathname === "/tracker-archive") {
    const archive = await getTrackerObservations();
    sendJson(response, 200, {
      ok: true,
      archive: archive.slice(0, 100)
    }, origin || "*");
    return;
  }

  if (request.method === "POST" && url.pathname === "/domain-intel") {
    const limit = allowRequest(request, "domain-intel", routeLimit("lookup"));
    if (!limit.allowed) {
      sendJson(response, 429, { ok: false, error: "Rate limit exceeded" }, origin || "*");
      return;
    }

    const body = await readJson(request);
    const domains = normalizeDomains(body.domains);
    if (!domains.length) {
      sendJson(response, 400, { ok: false, error: "domains must be a non-empty array" }, origin || "*");
      return;
    }

    sendJson(response, 200, {
      ok: true,
      domains: getDomainIntel(domains)
    }, origin || "*");
    return;
  }

  if (request.method === "POST" && url.pathname === "/app-intel") {
    const limit = allowRequest(request, "app-intel", routeLimit("lookup"));
    if (!limit.allowed) {
      sendJson(response, 429, { ok: false, error: "Rate limit exceeded" }, origin || "*");
      return;
    }

    const body = await readJson(request);
    const query = stringValue(body.query || body.app || body.domain || body.name);
    if (!query) {
      sendJson(response, 400, { ok: false, error: "query is required" }, origin || "*");
      return;
    }

    sendJson(response, 200, {
      ok: true,
      app: lookupApp(query)
    }, origin || "*");
    return;
  }

  if (request.method === "POST" && url.pathname === "/site-intel") {
    const limit = allowRequest(request, "site-intel", routeLimit("lookup"));
    if (!limit.allowed) {
      sendJson(response, 429, { ok: false, error: "Rate limit exceeded" }, origin || "*");
      return;
    }

    const body = await readJson(request);
    const domain = stringValue(body.domain || body.pageHost || body.host);
    const domains = normalizeDomains(body.domains || (domain ? [domain] : []));
    const appQuery = stringValue(body.appQuery || body.app || domain);
    if (!domains.length && !domain) {
      sendJson(response, 400, { ok: false, error: "domain or domains is required" }, origin || "*");
      return;
    }

    const domainIntel = getDomainIntel(domains);
    const app = appQuery ? lookupApp(appQuery) : null;
    const trackerArchive = trackerMatchesForDomains(domains);

    sendJson(response, 200, {
      ok: true,
      domain,
      domains: domainIntel,
      app,
      trackerArchive,
      summary: {
        knownCompanies: domainIntel.filter((item) => item.known).length,
        knownTrackers: trackerArchive.length,
        appFound: Boolean(app?.found)
      }
    }, origin || "*");
    return;
  }

  if (request.method === "POST" && url.pathname === "/tracker-observations") {
    const limit = allowRequest(request, "tracker-observations", routeLimit("trackerObservations"));
    if (!limit.allowed) {
      sendJson(response, 429, { ok: false, error: "Rate limit exceeded" }, origin || "*");
      return;
    }

    const body = await readJson(request);
    const pageHost = stringValue(body.pageHost);
    const observations = Array.isArray(body.observations) ? body.observations.slice(0, 100) : [];
    if (!pageHost || !observations.length) {
      sendJson(response, 400, { ok: false, error: "pageHost and observations are required" }, origin || "*");
      return;
    }

    await recordTrackerObservations(pageHost, observations);
    sendJson(response, 200, { ok: true }, origin || "*");
    return;
  }

  if (request.method === "POST" && url.pathname === "/analyze-policy") {
    const limit = allowRequest(request, "analyze-policy", routeLimit("analyzePolicy"));
    if (!limit.allowed) {
      sendJson(response, 429, { ok: false, error: "Rate limit exceeded" }, origin || "*");
      return;
    }

    const body = await readJson(request);
    const policyUrl = stringValue(body.policyUrl);
    const pageUrl = stringValue(body.pageUrl);
    const region = normalizeRegion(body.region);

    if (!policyUrl) {
      sendJson(response, 400, { ok: false, error: "policyUrl is required" }, origin || "*");
      return;
    }

    let parsedPolicyUrl;
    let parsedPageUrl = "";
    try {
      parsedPolicyUrl = validateHttpUrl(policyUrl, "policyUrl");
      if (pageUrl) {
        parsedPageUrl = validateHttpUrl(pageUrl, "pageUrl").href;
      }
    } catch (error) {
      sendJson(response, error.status || 400, {
        ok: false,
        error: error.message || "Invalid URL"
      }, origin || "*");
      return;
    }

    const analysis = await analyzePolicyFromUrl({
      policyUrl: parsedPolicyUrl.href,
      pageUrl: parsedPageUrl,
      region
    });

    sendJson(response, 200, {
      ok: true,
      analysis
    }, origin || "*");
    return;
  }

  notFound(response, origin || "*");
}

const server = createServer((request, response) => {
  handle(request, response).catch((error) => {
    sendJson(response, error.status || 500, {
      ok: false,
      error: error.message || "Unexpected backend error"
    }, request.headers.origin || "*");
  });
});

server.listen(PORT, () => {
  console.log(`ConsentLens backend listening on http://localhost:${PORT}`);
});

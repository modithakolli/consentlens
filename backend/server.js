import { createServer } from "node:http";
import { URL } from "node:url";
import { analyzePolicyFromUrl } from "./src/policyAnalyzer.js";
import { getDomainIntel, getTrackerIntel } from "./src/domainIntel.js";
import { legalRightsForRegion } from "./src/legalRights.js";
import { lookupApp } from "./src/appIntel.js";

const PORT = Number(process.env.PORT || 8787);
const MAX_JSON_BYTES = 64 * 1024;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 60;
const ALLOWED_ORIGINS = String(process.env.ALLOWED_ORIGINS || "*")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const requestCounts = new Map();

function clientKey(request) {
  return request.headers["x-forwarded-for"] || request.socket.remoteAddress || "local";
}

function rateLimited(request) {
  const key = clientKey(request);
  const now = Date.now();
  const current = requestCounts.get(key) || { count: 0, resetAt: now + RATE_LIMIT_WINDOW_MS };
  if (now > current.resetAt) {
    requestCounts.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  current.count += 1;
  requestCounts.set(key, current);
  return current.count > RATE_LIMIT_MAX;
}

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
    if (total > MAX_JSON_BYTES) {
      throw new Error("JSON body too large");
    }
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function assertBody(body) {
  if (!isObject(body)) throw new Error("Request body must be a JSON object");
}

function assertUrl(value, field) {
  if (typeof value !== "string" || value.length > 2048) throw new Error(`${field} must be a URL string`);
  const url = new URL(value);
  if (!["http:", "https:"].includes(url.protocol)) throw new Error(`${field} must use http or https`);
  return url.toString();
}

function validateDomains(value) {
  if (!Array.isArray(value)) throw new Error("domains must be an array");
  return value
    .filter((domain) => typeof domain === "string")
    .map((domain) => domain.trim().toLowerCase())
    .filter((domain) => /^[a-z0-9.-]{1,253}$/.test(domain))
    .slice(0, 100);
}

function validateQuery(value) {
  const query = String(value || "").trim();
  if (!query || query.length > 120) throw new Error("query must be 1-120 characters");
  return query;
}

function notFound(response) {
  sendJson(response, 404, {
    ok: false,
    error: "Route not found"
  });
}

const server = createServer(async (request, response) => {
  try {
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

    if (rateLimited(request)) {
      sendJson(response, 429, { ok: false, error: "Rate limit exceeded" }, origin || "*");
      return;
    }

    if (request.method === "GET" && url.pathname === "/health") {
      sendJson(response, 200, {
        ok: true,
        service: "consentlens-backend",
        version: "0.1.0"
      }, origin || "*");
      return;
    }

    if (request.method === "GET" && url.pathname === "/legal-rights") {
      sendJson(response, 200, {
        ok: true,
        rights: legalRightsForRegion(url.searchParams.get("region") || "IN")
      }, origin || "*");
      return;
    }

    if (request.method === "GET" && url.pathname === "/tracker-intel") {
      sendJson(response, 200, {
        ok: true,
        trackerIntel: getTrackerIntel()
      }, origin || "*");
      return;
    }

    if (request.method === "POST" && url.pathname === "/domain-intel") {
      const body = await readJson(request);
      assertBody(body);
      sendJson(response, 200, {
        ok: true,
        domains: getDomainIntel(validateDomains(body.domains || []))
      }, origin || "*");
      return;
    }

    if (request.method === "POST" && url.pathname === "/app-intel") {
      const body = await readJson(request);
      assertBody(body);
      sendJson(response, 200, {
        ok: true,
        app: lookupApp(validateQuery(body.query || body.name || ""))
      }, origin || "*");
      return;
    }

    if (request.method === "POST" && url.pathname === "/analyze-policy") {
      const body = await readJson(request);
      assertBody(body);
      const analysis = await analyzePolicyFromUrl({
        policyUrl: assertUrl(body.policyUrl, "policyUrl"),
        pageUrl: body.pageUrl ? assertUrl(body.pageUrl, "pageUrl") : "",
        region: String(body.region || "IN").slice(0, 8).toUpperCase()
      });
      sendJson(response, 200, {
        ok: true,
        analysis
      }, origin || "*");
      return;
    }

    notFound(response);
  } catch (error) {
    sendJson(response, 500, {
      ok: false,
      error: error.message || "Unexpected backend error"
    }, "*");
  }
});

server.listen(PORT, () => {
  console.log(`ConsentLens backend listening on http://localhost:${PORT}`);
});

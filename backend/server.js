import { createServer } from "node:http";
import { URL } from "node:url";
import { analyzePolicyFromUrl } from "./src/policyAnalyzer.js";
import { getDomainIntel } from "./src/domainIntel.js";
import { legalRightsForRegion } from "./src/legalRights.js";
import { recordTrackerObservations } from "./src/trackerArchive.js";

const PORT = Number(process.env.PORT || 8787);
const ALLOWED_ORIGINS = String(process.env.ALLOWED_ORIGINS || "*")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

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
  for await (const chunk of request) {
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
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

    if (request.method === "POST" && url.pathname === "/domain-intel") {
      const body = await readJson(request);
      sendJson(response, 200, {
        ok: true,
        domains: getDomainIntel(body.domains || [])
      }, origin || "*");
      return;
    }

    if (request.method === "POST" && url.pathname === "/tracker-observations") {
      const body = await readJson(request);
      await recordTrackerObservations(body.pageHost || "", body.observations || []);
      sendJson(response, 200, {
        ok: true
      }, origin || "*");
      return;
    }

    if (request.method === "POST" && url.pathname === "/analyze-policy") {
      const body = await readJson(request);
      const analysis = await analyzePolicyFromUrl({
        policyUrl: body.policyUrl,
        pageUrl: body.pageUrl,
        region: body.region || "IN"
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

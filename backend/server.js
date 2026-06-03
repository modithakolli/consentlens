import { createServer } from "node:http";
import { URL } from "node:url";
import { analyzePolicyFromUrl } from "./src/policyAnalyzer.js";
import { getDomainIntel } from "./src/domainIntel.js";
import { legalRightsForRegion } from "./src/legalRights.js";

const PORT = Number(process.env.PORT || 8787);

function sendJson(response, status, body) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
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

    if (request.method === "OPTIONS") {
      sendJson(response, 204, {});
      return;
    }

    if (request.method === "GET" && url.pathname === "/health") {
      sendJson(response, 200, {
        ok: true,
        service: "consentlens-backend",
        version: "0.1.0"
      });
      return;
    }

    if (request.method === "GET" && url.pathname === "/legal-rights") {
      sendJson(response, 200, {
        ok: true,
        rights: legalRightsForRegion(url.searchParams.get("region") || "IN")
      });
      return;
    }

    if (request.method === "POST" && url.pathname === "/domain-intel") {
      const body = await readJson(request);
      sendJson(response, 200, {
        ok: true,
        domains: getDomainIntel(body.domains || [])
      });
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
      });
      return;
    }

    notFound(response);
  } catch (error) {
    sendJson(response, 500, {
      ok: false,
      error: error.message || "Unexpected backend error"
    });
  }
});

server.listen(PORT, () => {
  console.log(`ConsentLens backend listening on http://localhost:${PORT}`);
});

import { readFileSync } from "node:fs";

const TRACKER_INTEL_URL = new URL("../../extension/shared/tracker-intel.json", import.meta.url);
const TRACKER_RECORDS = JSON.parse(readFileSync(TRACKER_INTEL_URL, "utf8"));

function normalizeHost(hostname) {
  return String(hostname || "").replace(/^www\./, "").toLowerCase();
}

function matches(host, domain) {
  const normalized = normalizeHost(host);
  return normalized === domain || normalized.endsWith("." + domain);
}

function recordForHost(hostname) {
  const normalized = normalizeHost(hostname);
  const record = TRACKER_RECORDS.find((entry) => entry.domains.some((domain) => matches(normalized, domain)));
  if (!record) {
    return {
      host: normalized,
      company: "Unknown",
      category: "unknown",
      risk: "unknown",
      purpose: "Unknown third-party service",
      hq: "Unknown",
      reputation: "Unknown",
      known: false
    };
  }

  return {
    host: normalized,
    company: record.company,
    category: record.category,
    risk: record.risk,
    purpose: record.purpose,
    hq: record.hq,
    reputation: record.reputation,
    known: true
  };
}

export function lookupDomain(hostname) {
  return recordForHost(hostname);
}

export function getDomainIntel(domains) {
  return Array.from(new Set(domains.map(normalizeHost).filter(Boolean))).map(recordForHost);
}

export function getTrackerIntel() {
  return TRACKER_RECORDS.map((entry) => ({
    company: entry.company,
    category: entry.category,
    risk: entry.risk,
    purpose: entry.purpose,
    hq: entry.hq,
    reputation: entry.reputation,
    domains: entry.domains.slice()
  }));
}

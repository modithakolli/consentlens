import { URL } from "node:url";

export function text(value, max = 500) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export function publicDomain(value) {
  return text(value, 253).toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/^www\./, "");
}

export function httpsUrls(value, limit = 10) {
  return (Array.isArray(value) ? value : []).map((item) => text(item, 1000)).filter((item) => {
    try { return new URL(item).protocol === "https:"; } catch { return false; }
  }).slice(0, limit);
}

export function observations(value, limit = 100) {
  return (Array.isArray(value) ? value : []).slice(0, limit).map((entry) => ({
    host: publicDomain(entry?.host), company: text(entry?.company, 120), category: text(entry?.category, 40),
    risk: text(entry?.risk, 20), purpose: text(entry?.purpose, 300), hq: text(entry?.hq, 80),
    reputation: text(entry?.reputation, 200), known: Boolean(entry?.known), requests: Math.max(0, Number(entry?.requests) || 0)
  })).filter((entry) => entry.host);
}

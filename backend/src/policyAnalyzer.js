import dns from "node:dns/promises";
import net from "node:net";
import { legalRightsForRegion } from "./legalRights.js";

const SIGNALS = [
  { id: "identity", label: "Identity data", pattern: /name|email address|phone number|account information|profile information/i },
  { id: "device", label: "Device and browser data", pattern: /device id|advertising id|ip address|browser type|cookie|identifier/i },
  { id: "location", label: "Location data", pattern: /precise location|gps|geolocation|location data/i },
  { id: "behavior", label: "Usage and behavior", pattern: /usage data|browsing|clickstream|interactions|pages you visit|analytics/i },
  { id: "payments", label: "Payment data", pattern: /payment information|billing information|credit card|transaction/i },
  { id: "sensitive", label: "Sensitive data", pattern: /biometric|health|medical|sensitive personal|children/i },
  { id: "ai", label: "AI or automated processing", pattern: /artificial intelligence|machine learning|automated decision|profiling|train our models/i },
  { id: "sharing", label: "Third-party sharing", pattern: /service providers|vendors|partners|processors|subprocessors|affiliates/i },
  { id: "ads", label: "Advertising or sale/sharing", pattern: /advertising partners|targeted advertising|sell personal information|share personal information|cross-context behavioral advertising/i },
  { id: "retention", label: "Data retention", pattern: /retain|retention|as long as necessary|deleted|deletion/i }
];

const RETENTION_PATTERNS = [
  /retain[^.]{0,180}\./gi,
  /as long as necessary[^.]{0,180}\./gi,
  /deleted?[^.]{0,180}\./gi,
  /(\d+\s+(days?|months?|years?))[^.]{0,160}\./gi
];

const SELLING_PATTERNS = /sell personal information|share personal information|targeted advertising|cross-context behavioral advertising|advertising partners/i;
const AI_PATTERNS = /artificial intelligence|machine learning|automated decision|profiling|train our models|model training/i;
const POLICY_FETCH_TIMEOUT_MS = 8000;
const MAX_POLICY_BYTES = 2 * 1024 * 1024;
const MAX_POLICY_REDIRECTS = 3;
const BLOCKED_HOSTS = new Set(["localhost", "localhost.localdomain"]);

function ipv4ToNumber(address) {
  return address.split(".").reduce((sum, value) => (sum << 8) + Number(value), 0) >>> 0;
}

function ipv4InRange(address, start, end) {
  const value = ipv4ToNumber(address);
  return value >= ipv4ToNumber(start) && value <= ipv4ToNumber(end);
}

function isBlockedIp(address) {
  const kind = net.isIP(address);
  if (kind === 4) {
    return address === "0.0.0.0"
      || ipv4InRange(address, "10.0.0.0", "10.255.255.255")
      || ipv4InRange(address, "127.0.0.0", "127.255.255.255")
      || ipv4InRange(address, "169.254.0.0", "169.254.255.255")
      || ipv4InRange(address, "172.16.0.0", "172.31.255.255")
      || ipv4InRange(address, "192.168.0.0", "192.168.255.255");
  }

  if (kind === 6) {
    const normalized = address.toLowerCase();
    return normalized === "::1"
      || normalized === "::"
      || normalized.startsWith("fc")
      || normalized.startsWith("fd")
      || normalized.startsWith("fe80:");
  }

  return false;
}

async function assertSafePolicyUrl(url) {
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("Only http and https policy URLs are supported");
  }

  const hostname = url.hostname.toLowerCase();
  if (BLOCKED_HOSTS.has(hostname) || hostname.endsWith(".localhost")) {
    throw new Error("Policy URL host is not allowed");
  }

  if (net.isIP(hostname) && isBlockedIp(hostname)) {
    throw new Error("Policy URL resolves to a private or local address");
  }

  const addresses = await dns.lookup(hostname, { all: true, verbatim: true });
  if (!addresses.length || addresses.some((entry) => isBlockedIp(entry.address))) {
    throw new Error("Policy URL resolves to a private or local address");
  }
}

async function fetchPolicyHtml(url, redirectsRemaining = MAX_POLICY_REDIRECTS) {
  await assertSafePolicyUrl(url);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), POLICY_FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url.href, {
      redirect: "manual",
      signal: controller.signal,
      headers: {
        "Accept": "text/html,text/plain,application/xhtml+xml",
        "User-Agent": "ConsentLens/0.1 policy analyzer"
      }
    });

    if ([301, 302, 303, 307, 308].includes(response.status)) {
      if (redirectsRemaining <= 0) throw new Error("Policy fetch exceeded redirect limit");
      const location = response.headers.get("location");
      if (!location) throw new Error("Policy redirect did not include a location");
      return fetchPolicyHtml(new URL(location, url), redirectsRemaining - 1);
    }

    if (!response.ok) {
      throw new Error("Policy fetch failed with " + response.status);
    }

    const contentType = response.headers.get("content-type") || "";
    if (contentType && !/text|html|xml|json/i.test(contentType)) {
      throw new Error("Policy URL did not return readable text");
    }

    const contentLength = Number(response.headers.get("content-length") || 0);
    if (contentLength > MAX_POLICY_BYTES) {
      throw new Error("Policy response is too large to analyze safely");
    }

    const buffer = await response.arrayBuffer();
    if (buffer.byteLength > MAX_POLICY_BYTES) {
      throw new Error("Policy response is too large to analyze safely");
    }

    return new TextDecoder("utf-8", { fatal: false }).decode(buffer);
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error("Policy fetch timed out");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function sentences(text) {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 40 && sentence.length < 500);
}

function extractSignals(text) {
  const lines = sentences(text);
  return SIGNALS.map((signal) => {
    const evidence = lines.find((line) => signal.pattern.test(line));
    return evidence ? { ...signal, evidence } : null;
  }).filter(Boolean);
}

function riskLevel(signals) {
  let score = 0;
  signals.forEach((signal) => {
    if (["sensitive", "ads", "ai"].includes(signal.id)) score += 20;
    else if (["sharing", "location", "retention"].includes(signal.id)) score += 12;
    else score += 7;
  });
  const capped = Math.min(100, score);
  return {
    score: capped,
    level: capped >= 65 ? "High" : capped >= 30 ? "Medium" : "Low"
  };
}

function plainEnglish(signals) {
  const ids = new Set(signals.map((signal) => signal.id));
  const summary = [];
  if (ids.has("identity") || ids.has("device")) summary.push("The policy appears to cover identity, account, device, cookie, or browser identifiers.");
  if (ids.has("behavior")) summary.push("The company may collect usage or interaction data to understand how people use the service.");
  if (ids.has("sharing")) summary.push("The policy mentions sharing data with service providers, partners, affiliates, or processors.");
  if (ids.has("ads")) summary.push("There are signs of advertising, sale, sharing, or behavioral targeting language.");
  if (ids.has("retention")) summary.push("The policy includes retention or deletion language, which should be reviewed for how long data is kept.");
  if (ids.has("ai")) summary.push("The policy mentions AI, profiling, automated decisions, or model training.");
  if (!summary.length) summary.push("No major data-use signals were found in the fetched policy text.");
  return summary;
}

function extractRetention(text) {
  const matches = [];
  RETENTION_PATTERNS.forEach((pattern) => {
    for (const match of text.matchAll(pattern)) {
      const value = String(match[0] || "").replace(/\s+/g, " ").trim();
      if (value && !matches.includes(value)) matches.push(value);
    }
  });
  return matches.slice(0, 4);
}

function buildRiskPoints(signals, text) {
  const points = signals.map((signal) => ({
    title: signal.label,
    severity: ["sensitive", "ads", "ai"].includes(signal.id) ? "High" : ["sharing", "location", "retention"].includes(signal.id) ? "Medium" : "Low",
    evidence: signal.evidence
  }));

  if (!signals.some((signal) => signal.id === "retention")) {
    points.push({
      title: "Retention clarity",
      severity: "Medium",
      evidence: "No clear retention period was detected in the policy text."
    });
  }

  if (!AI_PATTERNS.test(text)) {
    points.push({
      title: "AI training clarity",
      severity: "Low",
      evidence: "No explicit AI training or automated decision language was detected."
    });
  }

  if (!SELLING_PATTERNS.test(text)) {
    points.push({
      title: "Sale or ad sharing",
      severity: "Low",
      evidence: "No direct sale or targeted advertising language was detected in the scanned text."
    });
  }

  return points.slice(0, 8);
}

function privacyLabel(signals, region) {
  const ids = new Set(signals.map((signal) => signal.id));
  let grade = "A";
  if (ids.has("ads") || ids.has("sensitive")) grade = "D";
  else if (ids.has("sharing") || ids.has("ai")) grade = "C";
  else if (ids.has("behavior") || ids.has("location")) grade = "B";

  return {
    grade,
    collects: Array.from(ids).filter((id) => ["identity", "device", "location", "behavior", "payments", "sensitive"].includes(id)),
    shares: Array.from(ids).filter((id) => ["sharing", "ads"].includes(id)),
    retention: ids.has("retention") ? "Retention/disposal language found" : "No retention language detected",
    rights: legalRightsForRegion(region || "IN").rights.slice(0, 4)
  };
}

export async function analyzePolicyFromUrl({ policyUrl, pageUrl, region }) {
  if (!policyUrl) {
    throw new Error("policyUrl is required");
  }

  const parsed = new URL(policyUrl);
  const html = await fetchPolicyHtml(parsed);
  const text = stripHtml(html).slice(0, 180000);
  const signals = extractSignals(text);
  const risk = riskLevel(signals);

  return {
    policyUrl: parsed.href,
    pageUrl: pageUrl || "",
    fetchedAt: Date.now(),
    risk,
    privacyLabel: privacyLabel(signals, region),
    summary: plainEnglish(signals),
    riskPoints: buildRiskPoints(signals, text),
    retention: extractRetention(text),
    aiTraining: AI_PATTERNS.test(text) ? "Mentioned" : "No explicit mention detected",
    saleOrSharing: SELLING_PATTERNS.test(text) ? "Advertising, sale, or sharing language detected" : "No direct sale/share signal detected",
    signals: signals.map((signal) => ({
      id: signal.id,
      label: signal.label,
      evidence: signal.evidence
    })),
    legal: legalRightsForRegion(region || "IN")
  };
}

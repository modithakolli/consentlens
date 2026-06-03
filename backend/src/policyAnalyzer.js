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
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("Only http and https policy URLs are supported");
  }

  const response = await fetch(parsed.href, {
    headers: {
      "User-Agent": "ConsentLens/0.1 policy analyzer"
    }
  });

  if (!response.ok) {
    throw new Error(`Policy fetch failed with ${response.status}`);
  }

  const html = await response.text();
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
    signals: signals.map((signal) => ({
      id: signal.id,
      label: signal.label,
      evidence: signal.evidence
    })),
    legal: legalRightsForRegion(region || "IN")
  };
}

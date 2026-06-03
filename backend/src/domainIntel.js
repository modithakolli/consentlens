const COMPANY_RULES = [
  { company: "Google", purpose: "Analytics, ads, identity, measurement", domains: ["google-analytics.com", "googletagmanager.com", "doubleclick.net", "googleadservices.com", "adservice.google.com", "google.com", "googleapis.com"] },
  { company: "Meta Platforms", purpose: "Advertising and social tracking", domains: ["facebook.com", "connect.facebook.net", "instagram.com"] },
  { company: "Microsoft", purpose: "Identity, ads, productivity services", domains: ["login.microsoftonline.com", "login.live.com", "bing.com", "clarity.ms"] },
  { company: "Adobe", purpose: "Tag management, analytics, marketing", domains: ["adobedtm.com", "assets.adobedtm.com", "omtrdc.net", "demdex.net"] },
  { company: "OneTrust", purpose: "Consent management", domains: ["cookielaw.org", "onetrust.com", "geolocation.onetrust.com"] },
  { company: "LivePerson", purpose: "Customer chat and support", domains: ["liveperson.net", "lpsnmedia.net"] },
  { company: "Quantcast", purpose: "Audience measurement and ads", domains: ["quantserve.com", "quantcount.com"] },
  { company: "Taboola", purpose: "Ads and content recommendation tracking", domains: ["taboola.com"] },
  { company: "Reddit", purpose: "Advertising pixel and social tracking", domains: ["reddit.com", "redditstatic.com"] },
  { company: "TikTok", purpose: "Advertising and social tracking", domains: ["tiktok.com"] },
  { company: "LinkedIn", purpose: "Advertising and identity", domains: ["linkedin.com", "licdn.com"] },
  { company: "Fingerprint", purpose: "Device fingerprinting and fraud detection", domains: ["fingerprint.com", "fingerprintjs.com"] },
  { company: "Cloudflare", purpose: "Security, performance, analytics", domains: ["cloudflare.com", "cloudflareinsights.com"] }
];

function normalizeHost(hostname) {
  return String(hostname || "").replace(/^www\./, "").toLowerCase();
}

function matches(host, domain) {
  const normalized = normalizeHost(host);
  return normalized === domain || normalized.endsWith("." + domain);
}

export function lookupDomain(hostname) {
  const rule = COMPANY_RULES.find((entry) => entry.domains.some((domain) => matches(hostname, domain)));
  return {
    host: normalizeHost(hostname),
    company: rule?.company || "Unknown",
    purpose: rule?.purpose || "Unknown third-party service",
    known: Boolean(rule)
  };
}

export function getDomainIntel(domains) {
  return Array.from(new Set(domains.map(normalizeHost).filter(Boolean))).map(lookupDomain);
}

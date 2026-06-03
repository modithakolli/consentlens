const COMPANY_RULES = [
  { company: "Google", purpose: "Analytics, ads, identity, measurement", hq: "United States", reputation: "High data collection footprint", domains: ["google-analytics.com", "googletagmanager.com", "doubleclick.net", "googleadservices.com", "adservice.google.com", "google.com", "googleapis.com"] },
  { company: "OpenAI", purpose: "AI products, chat, and API services", hq: "United States", reputation: "AI platform provider", domains: ["openai.com", "chatgpt.com", "oaistatic.com", "openaiassets.com", "images.ctfassets.net"] },
  { company: "Meta Platforms", purpose: "Advertising and social tracking", hq: "United States", reputation: "High tracking footprint", domains: ["facebook.com", "connect.facebook.net", "instagram.com"] },
  { company: "Microsoft", purpose: "Identity, ads, productivity services", hq: "United States", reputation: "Broad ecosystem services", domains: ["microsoft.com", "login.microsoftonline.com", "login.live.com", "bing.com", "clarity.ms", "msn.com", "office.com", "azure.com"] },
  { company: "Adobe", purpose: "Tag management, analytics, marketing", hq: "United States", reputation: "Common marketing tracker stack", domains: ["adobedtm.com", "assets.adobedtm.com", "omtrdc.net", "demdex.net"] },
  { company: "OneTrust", purpose: "Consent management", hq: "United States", reputation: "Consent infrastructure provider", domains: ["cookielaw.org", "onetrust.com", "geolocation.onetrust.com"] },
  { company: "LivePerson", purpose: "Customer chat and support", hq: "United States", reputation: "Support tooling with tracking surface", domains: ["liveperson.net", "lpsnmedia.net"] },
  { company: "Quantcast", purpose: "Audience measurement and ads", hq: "United States", reputation: "Measurement and ad targeting", domains: ["quantserve.com", "quantcount.com"] },
  { company: "Taboola", purpose: "Ads and content recommendation tracking", hq: "Israel", reputation: "Recommendation and ad network", domains: ["taboola.com"] },
  { company: "Reddit", purpose: "Advertising pixel and social tracking", hq: "United States", reputation: "Social advertising ecosystem", domains: ["reddit.com", "redditstatic.com"] },
  { company: "Contentful", purpose: "Content delivery and asset hosting", hq: "Germany", reputation: "Headless CMS and content infrastructure", domains: ["ctfassets.net", "contentful.com"] },
  { company: "TikTok", purpose: "Advertising and social tracking", hq: "Global", reputation: "High social/ad tracking footprint", domains: ["tiktok.com"] },
  { company: "LinkedIn", purpose: "Advertising and identity", hq: "United States", reputation: "Professional identity services", domains: ["linkedin.com", "licdn.com"] },
  { company: "Fingerprint", purpose: "Device fingerprinting and fraud detection", hq: "United States", reputation: "Device fingerprinting vendor", domains: ["fingerprint.com", "fingerprintjs.com"] },
  { company: "Cloudflare", purpose: "Security, performance, analytics", hq: "United States", reputation: "Infrastructure and performance provider", domains: ["cloudflare.com", "cloudflareinsights.com"] }
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
    hq: rule?.hq || "Unknown",
    reputation: rule?.reputation || "Unknown",
    known: Boolean(rule)
  };
}

export function getDomainIntel(domains) {
  return Array.from(new Set(domains.map(normalizeHost).filter(Boolean))).map(lookupDomain);
}

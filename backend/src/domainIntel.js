import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const MODULE_DIR = dirname(fileURLToPath(import.meta.url));
const SHARED_TRACKER_INTEL_PATH = resolve(MODULE_DIR, "../../extension/shared/tracker-intel.json");
const OBSERVED_TRACKER_PATH = resolve(MODULE_DIR, "../data/tracker-observations.json");

function loadSharedTrackerRules() {
  try {
    const raw = JSON.parse(readFileSync(SHARED_TRACKER_INTEL_PATH, "utf8"));
    return raw.flatMap((entry) => (entry.domains || []).map((domain) => ({
      company: entry.company,
      purpose: entry.purpose,
      hq: entry.hq,
      reputation: entry.reputation,
      domains: [domain]
    })));
  } catch (error) {
    return [];
  }
}

function loadObservedTrackerRules() {
  try {
    const raw = JSON.parse(readFileSync(OBSERVED_TRACKER_PATH, "utf8"));
    return raw.flatMap((entry) => {
      const host = normalizeHost(entry.host);
      if (!host) return [];
      return [{
        company: entry.known ? entry.company : "Observed tracker",
        purpose: entry.known ? entry.purpose : `Observed on ${(entry.observedSites || []).length || 1} sites`,
        hq: entry.hq || "Unknown",
        reputation: entry.reputation || "Observed on this device",
        domains: [host]
      }];
    });
  } catch (error) {
    return [];
  }
}

const SHARED_RULES = loadSharedTrackerRules();

const COMPANY_RULES = [
  { company: "Google", purpose: "Analytics, ads, identity, measurement", hq: "United States", reputation: "High data collection footprint", domains: ["google.com", "googleapis.com", "clients6.google.com", "gstatic.com", "fonts.googleapis.com", "fonts.gstatic.com", "translate.google.com", "google.co.in", "apis.google.com", "play.google.com", "mail.google.com", "drive.google.com", "meet.google.com", "chat.google.com", "ssl.gstatic.com", "lh3.google.com", "ogs.google.com", "googleusercontent.com"] },
  { company: "OpenAI", purpose: "AI products, chat, and API services", hq: "United States", reputation: "AI platform provider", domains: ["openai.com", "chatgpt.com", "oaistatic.com", "auth.openai.com", "auth-cdn.oaistatic.com", "api.oaistatsig.com", "openaiassets.com", "images.ctfassets.net"] },
  { company: "Meta Platforms", purpose: "Advertising and social tracking", hq: "United States", reputation: "High tracking footprint", domains: ["facebook.com", "connect.facebook.net", "instagram.com"] },
  { company: "Microsoft", purpose: "Identity, ads, productivity services", hq: "United States", reputation: "Broad ecosystem services", domains: ["microsoft.com", "login.microsoftonline.com", "login.live.com", "bing.com", "bat.bing.com", "bat.bing.net", "clarity.ms", "scripts.clarity.ms", "e.clarity.ms", "y.clarity.ms", "msn.com", "office.com", "azure.com"] },
  { company: "Adobe", purpose: "Tag management, analytics, marketing", hq: "United States", reputation: "Common marketing tracker stack", domains: ["adobedtm.com", "assets.adobedtm.com", "adoberesources.net", "omtrdc.net", "demdex.net"] },
  { company: "OneTrust", purpose: "Consent management", hq: "United States", reputation: "Consent infrastructure provider", domains: ["cookielaw.org", "onetrust.com", "geolocation.onetrust.com"] },
  { company: "LivePerson", purpose: "Customer chat and support", hq: "United States", reputation: "Support tooling with tracking surface", domains: ["liveperson.net", "lpsnmedia.net"] },
  { company: "Quantcast", purpose: "Audience measurement and ads", hq: "United States", reputation: "Measurement and ad targeting", domains: ["quantserve.com", "quantcount.com"] },
  { company: "Taboola", purpose: "Ads and content recommendation tracking", hq: "Israel", reputation: "Recommendation and ad network", domains: ["taboola.com"] },
  { company: "Reddit", purpose: "Advertising pixel and social tracking", hq: "United States", reputation: "Social advertising ecosystem", domains: ["reddit.com", "redditstatic.com", "pixel-config.reddit.com", "alb.reddit.com"] },
  { company: "Yahoo", purpose: "Ads, analytics, and audience measurement", hq: "United States", reputation: "Advertising and media data footprint", domains: ["yahoo.com", "yimg.com"] },
  { company: "Marketo", purpose: "Marketing automation and lead tracking", hq: "United States", reputation: "Marketing analytics provider", domains: ["munchkin.marketo.net", "marketo.net", "mktoresp.com"] },
  { company: "Qualtrics", purpose: "Surveys and experience analytics", hq: "United States", reputation: "Feedback and survey platform", domains: ["qualtrics.com"] },
  { company: "6sense", purpose: "B2B intent and advertising analytics", hq: "United States", reputation: "Marketing intelligence provider", domains: ["6sc.co"] },
  { company: "LiveRamp", purpose: "Identity resolution and advertising matching", hq: "United States", reputation: "Advertising identity graph provider", domains: ["rlcdn.com"] },
  { company: "Krux/Salesforce", purpose: "Data management and ad audience matching", hq: "United States", reputation: "Advertising data platform", domains: ["krxd.net"] },
  { company: "Akamai", purpose: "Security, bot detection, and delivery", hq: "United States", reputation: "Infrastructure and anti-abuse provider", domains: ["akamaihd.net", "go-mpulse.net", "akstat.io"] },
  { company: "Datadog", purpose: "Telemetry, monitoring, and analytics", hq: "United States", reputation: "Monitoring and observability platform", domains: ["datadoghq.com", "browser-intake-datadoghq.com"] },
  { company: "Amazon Web Services", purpose: "Cloud hosting and storage", hq: "United States", reputation: "Cloud infrastructure provider", domains: ["amazonaws.com", "cloudfront.net"] },
  { company: "Phenom", purpose: "Recruiting platform and candidate analytics", hq: "United States", reputation: "Hiring experience platform", domains: ["phenompeople.com"] },
  { company: "Zift Solutions", purpose: "Partner marketing analytics", hq: "United States", reputation: "Channel marketing provider", domains: ["ziftsolutions.com"] },
  { company: "Contentful", purpose: "Content delivery and asset hosting", hq: "Germany", reputation: "Headless CMS and content infrastructure", domains: ["ctfassets.net", "contentful.com"] },
  { company: "TikTok", purpose: "Advertising and social tracking", hq: "Global", reputation: "High social/ad tracking footprint", domains: ["tiktok.com"] },
  { company: "LinkedIn", purpose: "Advertising and identity", hq: "United States", reputation: "Professional identity services", domains: ["linkedin.com", "licdn.com", "snap.licdn.com", "px.ads.linkedin.com", "px4.ads.linkedin.com"] },
  { company: "Fingerprint", purpose: "Device fingerprinting and fraud detection", hq: "United States", reputation: "Device fingerprinting vendor", domains: ["fingerprint.com", "fingerprintjs.com"] },
  { company: "Cloudflare", purpose: "Security, performance, analytics", hq: "United States", reputation: "Infrastructure and performance provider", domains: ["cloudflare.com", "cloudflareinsights.com"] }
];

function buildLookupRules() {
  return [...SHARED_RULES, ...COMPANY_RULES, ...loadObservedTrackerRules()];
}

function normalizeHost(hostname) {
  return String(hostname || "").replace(/^www\./, "").toLowerCase();
}

function matches(host, domain) {
  const normalized = normalizeHost(host);
  return normalized === domain || normalized.endsWith("." + domain);
}

export function lookupDomain(hostname) {
  const rule = buildLookupRules().find((entry) => entry.domains.some((domain) => matches(hostname, domain)));
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

(function attachConsentLensRules(globalScope) {
  const TRACKER_DOMAINS = {
    analytics: [
      "google-analytics.com",
      "googletagmanager.com",
      "analytics.google.com",
      "assets.adobedtm.com",
      "adobedtm.com",
      "segment.io",
      "mixpanel.com",
      "amplitude.com",
      "hotjar.com",
      "fullstory.com",
      "heap.io",
      "quantserve.com",
      "quantcount.com",
      "analytics.ahrefs.com",
      "bat.bing.com",
      "bat.bing.net",
      "clarity.ms",
      "scripts.clarity.ms",
      "e.clarity.ms",
      "y.clarity.ms",
      "phenompeople.com",
      "pp-cdn.phenompeople.com",
      "cdn.phenompeople.com",
      "phenomtrackapi-ir.phenompeople.com"
    ],
    ads: [
      "ad.doubleclick.net",
      "doubleclick.net",
      "googleads.g.doubleclick.net",
      "stats.g.doubleclick.net",
      "fls.doubleclick.net",
      "15392685.fls.doubleclick.net",
      "googlesyndication.com",
      "googleadservices.com",
      "adservice.google.com",
      "facebook.com",
      "connect.facebook.net",
      "ads-twitter.com",
      "tiktok.com",
      "snap.licdn.com",
      "ads.linkedin.com",
      "px.ads.linkedin.com",
      "px4.ads.linkedin.com",
      "taboola.com",
      "reddit.com",
      "redditstatic.com"
    ],
    consent: [
      "cookielaw.org",
      "onetrust.com",
      "geolocation.onetrust.com"
    ],
    support: [
      "liveperson.net",
      "lpsnmedia.net"
    ],
    identity: [
      "accounts.google.com",
      "login.microsoftonline.com",
      "login.live.com",
      "appleid.apple.com",
      "okta.com",
      "auth0.com",
      "apis.google.com",
      "play.google.com",
      "mail.google.com",
      "drive.google.com",
      "meet.google.com",
      "chat.google.com"
    ],
    utility: [
      "google.com",
      "google.co.in",
      "googleapis.com",
      "ssl.gstatic.com",
      "gstatic.com",
      "fonts.gstatic.com",
      "lh3.google.com",
      "ogs.google.com",
      "translate.google.com",
      "googleusercontent.com",
      "github.githubassets.com",
      "avatars.githubusercontent.com",
      "user-images.githubusercontent.com",
      "alive.github.com",
      "github-cloud.s3.amazonaws.com"
    ],
    risk: [
      "fingerprint.com",
      "fingerprintjs.com",
      "perimeterx.net",
      "datadome.co",
      "arkoselabs.com",
      "cloudflareinsights.com"
    ]
  };

  const TRACKER_PROFILES = [
    { company: "Google", category: "analytics", risk: "medium", purpose: "Measurement and analytics", hq: "United States", reputation: "Common analytics stack", domains: ["google-analytics.com", "googletagmanager.com", "analytics.google.com"] },
    { company: "Google", category: "ads", risk: "high", purpose: "Advertising and conversion tracking", hq: "United States", reputation: "Large ad ecosystem", domains: ["doubleclick.net", "ad.doubleclick.net", "googleadservices.com", "adservice.google.com", "googlesyndication.com", "googleads.g.doubleclick.net", "stats.g.doubleclick.net", "fls.doubleclick.net", "15392685.fls.doubleclick.net"] },
    { company: "Google", category: "identity", risk: "medium", purpose: "Authentication and account identity", hq: "United States", reputation: "Identity provider surface", domains: ["accounts.google.com", "google.com", "google.co.in", "googleapis.com", "apis.google.com", "play.google.com", "mail.google.com", "drive.google.com", "meet.google.com", "chat.google.com"] },
    { company: "Google", category: "utility", risk: "low", purpose: "Shared web infrastructure and assets", hq: "United States", reputation: "Common shared asset and utility surface", domains: ["gstatic.com", "fonts.gstatic.com", "ssl.gstatic.com", "lh3.google.com", "ogs.google.com", "translate.google.com", "googleusercontent.com"] },
    { company: "GitHub", category: "utility", risk: "low", purpose: "First-party asset delivery and infrastructure", hq: "United States", reputation: "GitHub content and asset infrastructure", domains: ["github.githubassets.com", "avatars.githubusercontent.com", "user-images.githubusercontent.com", "alive.github.com", "github-cloud.s3.amazonaws.com"] },
    { company: "Microsoft", category: "analytics", risk: "medium", purpose: "Usage measurement and insights", hq: "United States", reputation: "Product telemetry and analytics", domains: ["clarity.ms", "scripts.clarity.ms", "e.clarity.ms", "y.clarity.ms", "bat.bing.com", "bat.bing.net"] },
    { company: "LinkedIn", category: "ads", risk: "high", purpose: "Advertising and identity", hq: "United States", reputation: "Professional identity services", domains: ["linkedin.com", "licdn.com", "snap.licdn.com", "px.ads.linkedin.com", "px4.ads.linkedin.com"] },
    { company: "Phenom", category: "analytics", risk: "medium", purpose: "Recruiting platform and candidate analytics", hq: "United States", reputation: "Hiring experience platform", domains: ["phenompeople.com", "phenomtrackapi-ir.phenompeople.com", "pp-cdn.phenompeople.com", "cdn.phenompeople.com", "cdn-bot.phenompeople.com"] },
    { company: "OneTrust", category: "consent", risk: "low", purpose: "Consent management", hq: "United States", reputation: "Consent infrastructure provider", domains: ["cookielaw.org", "onetrust.com", "geolocation.onetrust.com"] },
    { company: "Cloudflare", category: "risk", risk: "low", purpose: "Security, performance, and anti-bot controls", hq: "United States", reputation: "Infrastructure and performance provider", domains: ["cloudflare.com", "cloudflareinsights.com", "static.cloudflareinsights.com"] },
    { company: "Amazon Web Services", category: "utility", risk: "low", purpose: "Cloud hosting and storage", hq: "United States", reputation: "Cloud infrastructure provider", domains: ["amazonaws.com", "cloudfront.net"] }
  ];

  const DATA_PATTERNS = [
    { id: "identity", label: "Identity details", terms: ["name", "email address", "phone number", "account information", "profile information", "information you provide"] },
    { id: "location", label: "Location", terms: ["precise location", "gps", "location data", "geolocation"] },
    { id: "contacts", label: "Contacts", terms: ["contacts", "address book", "friends list"] },
    { id: "payments", label: "Payment data", terms: ["payment information", "billing information", "credit card", "transaction"] },
    { id: "device", label: "Device identifiers", terms: ["device id", "advertising id", "ip address", "browser type", "unique identifier"] },
    { id: "behavior", label: "Behavior and usage", terms: ["usage data", "browsing", "clickstream", "interactions", "interactions with our websites", "pages you visit", "record information"] },
    { id: "biometric", label: "Biometric or sensitive data", terms: ["biometric data", "face scan", "voiceprint", "health data", "medical information", "sensitive personal information"] },
    { id: "ai", label: "AI or automated processing", terms: ["automated decision", "automated decisions", "profiling", "train our models", "model training using your data"] }
  ];

  const SHARING_PATTERNS = [
    { id: "serviceProviders", label: "Service providers", terms: ["service providers", "vendors", "processors", "subprocessors", "third-party partners", "third party partners"] },
    { id: "advertisers", label: "Advertisers and ad networks", terms: ["advertising partners", "ad networks", "targeted advertising", "cross-context behavioral advertising", "marketing efforts", "assist in our marketing"] },
    { id: "affiliates", label: "Affiliates", terms: ["affiliates", "subsidiaries", "parent company", "corporate family"] },
    { id: "brokers", label: "Data brokers or resale", terms: ["data brokers", "sell personal information", "share personal information", "monetize"] },
    { id: "law", label: "Legal or government requests", terms: ["law enforcement", "legal process", "government request", "court order"] }
  ];

  const OAUTH_SCOPE_RISK = {
    "openid": { score: 1, note: "Basic sign-in identity." },
    "profile": { score: 1, note: "Basic profile details." },
    "email": { score: 1, note: "Email address access." },
    "offline_access": { score: 4, note: "Can keep access after you leave unless revoked." },
    "gmail.readonly": { score: 5, note: "Can read Gmail messages." },
    "gmail.modify": { score: 6, note: "Can read and change Gmail messages." },
    "gmail.send": { score: 6, note: "Can send email as you." },
    "drive": { score: 6, note: "Broad Google Drive access." },
    "drive.readonly": { score: 5, note: "Can read Google Drive files." },
    "calendar": { score: 4, note: "Calendar access." },
    "contacts": { score: 5, note: "Contacts access." },
    "mail.read": { score: 5, note: "Can read Microsoft mail." },
    "mail.readwrite": { score: 6, note: "Can read and change Microsoft mail." },
    "files.readwrite.all": { score: 6, note: "Broad Microsoft file read/write access." },
    "user.read": { score: 1, note: "Basic Microsoft profile access." },
    "contacts.read": { score: 4, note: "Microsoft contacts access." }
  };

  const DARK_PATTERN_TERMS = [
    "accept all",
    "i agree",
    "reject all",
    "manage choices",
    "legitimate interest",
    "continue without accepting",
    "do not sell",
    "unsubscribe",
    "privacy settings"
  ];

  function normalizeHost(hostname) {
    return String(hostname || "").replace(/^www\./, "").toLowerCase();
  }

  function domainMatches(hostname, domain) {
    const host = normalizeHost(hostname);
    return host === domain || host.endsWith("." + domain);
  }

  function categorizeDomain(hostname) {
    const categories = [];
    Object.entries(TRACKER_DOMAINS).forEach(([category, domains]) => {
      if (domains.some((domain) => domainMatches(hostname, domain))) {
        categories.push(category);
      }
    });
    return categories;
  }

  function lookupTracker(hostname) {
    const host = normalizeHost(hostname);
    const profile = TRACKER_PROFILES.find((entry) => entry.domains.some((domain) => domainMatches(host, domain)));
    return {
      host,
      company: profile?.company || "Unknown",
      category: profile?.category || (categorizeDomain(host)[0] || "unknown"),
      risk: profile?.risk || "unknown",
      purpose: profile?.purpose || "Unknown third-party service",
      hq: profile?.hq || "Unknown",
      reputation: profile?.reputation || "Unknown",
      known: Boolean(profile)
    };
  }

  globalScope.ConsentLensRules = {
    TRACKER_DOMAINS,
    TRACKER_PROFILES,
    DATA_PATTERNS,
    SHARING_PATTERNS,
    OAUTH_SCOPE_RISK,
    DARK_PATTERN_TERMS,
    normalizeHost,
    domainMatches,
    categorizeDomain,
    lookupTracker
  };
})(typeof self !== "undefined" ? self : window);

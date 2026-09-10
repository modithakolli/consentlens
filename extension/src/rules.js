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
      "lpsnmedia.net",
      "intercom.io",
      "intercomcdn.com"
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
    ,{ company: "Anthropic", category: "utility", risk: "low", purpose: "Claude application and asset delivery", hq: "United States", reputation: "AI product provider", domains: ["anthropic.com", "claude.ai", "anthropic.com", "s-cdn.anthropic.com", "assets-proxy.anthropic.com"] }
    ,{ company: "Stripe", category: "payments", risk: "medium", purpose: "Payment processing and fraud prevention", hq: "United States", reputation: "Payment service provider", domains: ["stripe.com", "js.stripe.com", "m.stripe.network"] }
    ,{ company: "Intercom", category: "support", risk: "medium", purpose: "Customer messaging and support", hq: "United States", reputation: "Support and messaging provider", domains: ["intercom.io", "widget.intercom.io", "intercomcdn.com"] }
    ,{ company: "hCaptcha", category: "risk", risk: "low", purpose: "Bot detection and abuse prevention", hq: "United States", reputation: "Anti-abuse provider", domains: ["hcaptcha.com", "js.hcaptcha.com"] }
    ,{ company: "SAP Customer Data Cloud (Gigya)", category: "identity", risk: "medium", purpose: "Customer identity and access management", hq: "Germany", reputation: "Identity provider", domains: ["gigya.com", "gigya-cs.com", "us1.gigya.com"] }
    ,{ company: "Akamai mPulse", category: "analytics", risk: "medium", purpose: "Website performance monitoring", hq: "United States", reputation: "Performance measurement provider", domains: ["go-mpulse.net", "rum.hlx.page"] }
  ];

  TRACKER_PROFILES.push(...(Array.isArray(globalScope.ConsentLensServiceProfiles) ? globalScope.ConsentLensServiceProfiles : []));

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

  // This intentionally covers the common multi-part public suffixes used by
  // the services we scan. It is a conservative local fallback, not a full PSL
  // implementation: an uncertain host remains third party rather than being
  // silently treated as first party.
  const MULTIPART_SUFFIXES = new Set([
    "co.uk", "org.uk", "ac.uk", "gov.uk", "com.au", "net.au", "org.au",
    "co.nz", "co.jp", "co.in", "com.br", "com.mx", "com.sg", "co.kr"
  ]);

  function registrableDomain(hostname) {
    const host = normalizeHost(hostname).replace(/\.$/, "");
    if (!host || host === "localhost" || /^\d{1,3}(?:\.\d{1,3}){3}$/.test(host) || host.includes(":")) return host;
    const labels = host.split(".").filter(Boolean);
    if (labels.length < 3) return host;
    const suffix = labels.slice(-2).join(".");
    return labels.slice(-(MULTIPART_SUFFIXES.has(suffix) ? 3 : 2)).join(".");
  }

  function isThirdPartyHost(requestHost, pageHost) {
    const requestDomain = registrableDomain(requestHost);
    const pageDomain = registrableDomain(pageHost);
    return Boolean(requestDomain && pageDomain && requestDomain !== pageDomain);
  }

  function lookupTracker(hostname) {
    const host = normalizeHost(hostname);
    const profile = TRACKER_PROFILES.find((entry) => entry.domains.some((domain) => domainMatches(host, domain)));
    return {
      host,
      company: profile?.company || "Unclassified third party",
      category: profile?.category || (categorizeDomain(host)[0] || "unknown"),
      risk: profile?.risk || "unknown",
      purpose: profile?.purpose || "Observed network request; ConsentLens has not classified this provider yet.",
      hq: profile?.hq || "Not established",
      reputation: profile?.reputation || "Unclassified — not a safety judgement",
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
    registrableDomain,
    isThirdPartyHost,
    categorizeDomain,
    lookupTracker
  };
})(typeof self !== "undefined" ? self : window);

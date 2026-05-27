(function attachConsentLensRules(globalScope) {
  const TRACKER_DOMAINS = {
    analytics: [
      "google-analytics.com",
      "googletagmanager.com",
      "analytics.google.com",
      "segment.io",
      "mixpanel.com",
      "amplitude.com",
      "hotjar.com",
      "fullstory.com",
      "heap.io"
    ],
    ads: [
      "doubleclick.net",
      "googlesyndication.com",
      "googleadservices.com",
      "facebook.com",
      "connect.facebook.net",
      "ads-twitter.com",
      "tiktok.com",
      "snap.licdn.com",
      "ads.linkedin.com"
    ],
    identity: [
      "accounts.google.com",
      "login.microsoftonline.com",
      "login.live.com",
      "appleid.apple.com",
      "okta.com",
      "auth0.com"
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

  const DATA_PATTERNS = [
    { id: "identity", label: "Identity details", terms: ["name", "email address", "phone number", "account information", "profile information", "information you provide"] },
    { id: "location", label: "Location", terms: ["precise location", "gps", "location data", "geolocation"] },
    { id: "contacts", label: "Contacts", terms: ["contacts", "address book", "friends list"] },
    { id: "payments", label: "Payment data", terms: ["payment information", "billing information", "credit card", "transaction"] },
    { id: "device", label: "Device identifiers", terms: ["device id", "advertising id", "ip address", "browser type", "unique identifier"] },
    { id: "behavior", label: "Behavior and usage", terms: ["usage data", "browsing", "clickstream", "interactions", "interactions with our websites", "pages you visit", "record information"] },
    { id: "biometric", label: "Biometric or sensitive data", terms: ["biometric", "face scan", "voice", "health", "medical", "sensitive personal"] },
    { id: "ai", label: "AI or automated processing", terms: ["artificial intelligence", "machine learning", "automated decision", "profiling", "train our models"] }
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

  globalScope.ConsentLensRules = {
    TRACKER_DOMAINS,
    DATA_PATTERNS,
    SHARING_PATTERNS,
    OAUTH_SCOPE_RISK,
    DARK_PATTERN_TERMS,
    normalizeHost,
    domainMatches,
    categorizeDomain
  };
})(typeof self !== "undefined" ? self : window);

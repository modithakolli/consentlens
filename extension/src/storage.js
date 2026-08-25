(function attachConsentLensStorage(globalScope) {
  const LIMITS = { trackerArchive: 300, activityTimeline: 30, policySnapshots: 50, consentReceipts: 50, evidenceQa: 50 };

  function string(value, max = 500) {
    return typeof value === "string" ? value.slice(0, max) : "";
  }

  function host(value) {
    return string(value, 253).replace(/^www\./, "").toLowerCase();
  }

  function safeArray(value, key) {
    return Array.isArray(value) ? value.slice(0, LIMITS[key] || 100).filter((item) => item && typeof item === "object") : [];
  }

  function strings(value, max = 12) {
    return Array.isArray(value) ? value.filter((item) => typeof item === "string").map((item) => string(item, 253)).filter(Boolean).slice(0, max) : [];
  }

  function settings(value, defaults) {
    const source = value && typeof value === "object" ? value : {};
    const apiBaseUrl = string(source.apiBaseUrl || defaults.apiBaseUrl, 500).replace(/\/+$/, "");
    return {
      apiBaseUrl: /^https?:\/\//i.test(apiBaseUrl) ? apiBaseUrl : defaults.apiBaseUrl,
      region: string(source.region || defaults.region, 8).toUpperCase() || defaults.region,
      syncObservations: Boolean(source.syncObservations),
      syncObservationsExplicit: Boolean(source.syncObservationsExplicit)
    };
  }

  function tracker(entry) {
    return {
      host: host(entry?.host), company: string(entry?.company, 120), category: string(entry?.category, 40),
      risk: string(entry?.risk, 20), purpose: string(entry?.purpose, 300), hq: string(entry?.hq, 80),
      reputation: string(entry?.reputation, 200), known: Boolean(entry?.known), firstSeen: Number(entry?.firstSeen) || Date.now(),
      lastSeen: Number(entry?.lastSeen) || Date.now(), observedSites: strings(entry?.observedSites).map(host).filter(Boolean),
      requestCount: Math.max(0, Number(entry?.requestCount) || 0), requests: Math.max(0, Number(entry?.requests) || 0)
    };
  }

  globalScope.ConsentLensStorage = { safeArray, settings, tracker, string, strings };
})(self);

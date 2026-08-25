(function attachConsentLensStorage(globalScope) {
  const LIMITS = { trackerArchive: 300, activityTimeline: 30, policySnapshots: 50, consentReceipts: 50, evidenceQa: 50 };

  function string(value, max = 500) {
    return typeof value === "string" ? value.slice(0, max) : "";
  }

  function host(value) {
    return string(value, 253).toLowerCase().replace(/^www\./, "");
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
      region: string(source.region || defaults.region, 8).toUpperCase().replace(/[^A-Z]/g, "") || defaults.region,
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

  function receipt(entry) {
    return { pageUrl: string(entry?.pageUrl, 1000), pageHost: host(entry?.pageHost), actionLabel: string(entry?.actionLabel, 120), acceptedAt: Number(entry?.acceptedAt) || Date.now() };
  }

  function timeline(entry) {
    return { key: string(entry?.key, 300), pageUrl: string(entry?.pageUrl, 1000), pageHost: host(entry?.pageHost), title: string(entry?.title, 300), score: Math.min(100, Math.max(0, Number(entry?.score) || 0)), level: string(entry?.level, 20), thirdParties: Math.max(0, Number(entry?.thirdParties) || 0), topTrackers: safeArray(entry?.topTrackers, "topTrackers").slice(0, 10), fingerprinting: Boolean(entry?.fingerprinting), savedAt: Number(entry?.savedAt) || Date.now() };
  }

  function policySnapshot(entry) {
    return { key: string(entry?.key, 1000), policyUrl: string(entry?.policyUrl, 1000), pageUrl: string(entry?.pageUrl, 1000), title: string(entry?.title, 300), signals: strings(entry?.signals, 30), summary: strings(entry?.summary, 20), privacyLabel: entry?.privacyLabel && typeof entry.privacyLabel === "object" ? entry.privacyLabel : null, risk: entry?.risk && typeof entry.risk === "object" ? entry.risk : null, rights: strings(entry?.rights, 20), savedAt: Number(entry?.savedAt) || Date.now() };
  }

  globalScope.ConsentLensStorage = { safeArray, settings, tracker, receipt, timeline, policySnapshot, string, strings };
})(self);

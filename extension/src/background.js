importScripts("rules.js");

const DEFAULT_SETTINGS = {
  apiBaseUrl: "http://localhost:8787",
  region: "IN",
  syncObservations: false
};

const tabState = new Map();
const trackerArchiveCache = new Map();
let trackerArchiveReady = false;

function blankState(tabId) {
  return {
    tabId,
    pageUrl: "",
    pageHost: "",
    requests: {},
    contentReport: null,
    updatedAt: Date.now()
  };
}

function getTabState(tabId) {
  if (!tabState.has(tabId)) {
    tabState.set(tabId, blankState(tabId));
  }
  return tabState.get(tabId);
}

function loadTrackerArchive() {
  return new Promise((resolve) => {
    chrome.storage.local.get({ trackerArchive: [] }, (result) => {
      trackerArchiveCache.clear();
      (Array.isArray(result.trackerArchive) ? result.trackerArchive : []).forEach((entry) => {
        if (entry?.host) {
          trackerArchiveCache.set(entry.host, entry);
        }
      });
      trackerArchiveReady = true;
      resolve();
    });
  });
}

function ensureTrackerArchiveLoaded() {
  if (trackerArchiveReady) {
    return Promise.resolve();
  }
  return loadTrackerArchive();
}

function mergeTrackerObservation(host, existing, next) {
  const observedSites = Array.from(new Set([
    ...(existing?.observedSites || []),
    ...(next?.observedSites || [])
  ])).slice(0, 12);

  return {
    host,
    company: next.company || existing?.company || "Observed tracker",
    category: next.category || existing?.category || "unknown",
    risk: next.risk || existing?.risk || "unknown",
    purpose: next.purpose || existing?.purpose || "Previously observed on this device",
    hq: next.hq || existing?.hq || "Unknown",
    reputation: next.reputation || existing?.reputation || "Unknown",
    known: Boolean(next.known || existing?.known),
    firstSeen: existing?.firstSeen || next.firstSeen || Date.now(),
    lastSeen: next.lastSeen || Date.now(),
    observedSites,
    requestCount: (existing?.requestCount || 0) + (next.requestCount || 0),
    requests: (existing?.requests || 0) + (next.requests || 0)
  };
}

function safeHost(url) {
  try {
    return ConsentLensRules.normalizeHost(new URL(url).hostname);
  } catch (error) {
    return "";
  }
}

function observeTrackers(report) {
  const pageHost = report.pageHost || safeHost(report.pageUrl || "");
  const observed = new Map();

  (report.thirdParties || []).forEach((party) => {
    const host = party.host;
    if (!host) return;
    const current = trackerArchiveCache.get(host) || null;
    const next = mergeTrackerObservation(host, current, {
      company: party.known ? party.company : "Observed tracker",
      category: party.category || party.categories?.[0] || "unknown",
      risk: party.risk || "unknown",
      purpose: party.known ? party.purpose : "Seen on multiple sites",
      hq: party.hq || "Unknown",
      reputation: party.reputation || "Unknown",
      known: Boolean(party.known),
      firstSeen: current?.firstSeen || Date.now(),
      lastSeen: Date.now(),
      observedSites: [...(current?.observedSites || []), pageHost].filter(Boolean),
      requestCount: party.count || 0,
      requests: party.count || 0
    });
    observed.set(host, next);
  });

  observed.forEach((entry, host) => trackerArchiveCache.set(host, entry));
  chrome.storage.local.set({
    trackerArchive: Array.from(trackerArchiveCache.values())
      .sort((a, b) => (b.lastSeen || 0) - (a.lastSeen || 0))
      .slice(0, 300)
  });
}

function isThirdParty(requestHost, pageHost) {
  if (!requestHost || !pageHost) return false;
  return requestHost !== pageHost && !requestHost.endsWith("." + pageHost);
}

function recordRequest(details) {
  if (details.tabId < 0 || !details.url) return;

  const pageHost = safeHost(details.initiator || details.documentUrl || "");
  const requestHost = safeHost(details.url);
  if (!requestHost || !pageHost || !isThirdParty(requestHost, pageHost)) return;

  const state = getTabState(details.tabId);
  state.pageHost = state.pageHost || pageHost;
  state.pageUrl = details.documentUrl || state.pageUrl;
  state.updatedAt = Date.now();

  const categories = ConsentLensRules.categorizeDomain(requestHost);
  if (!state.requests[requestHost]) {
    state.requests[requestHost] = {
      host: requestHost,
      count: 0,
      types: {},
      categories
    };
  }

  state.requests[requestHost].count += 1;
  state.requests[requestHost].types[details.type] = (state.requests[requestHost].types[details.type] || 0) + 1;
  state.requests[requestHost].categories = Array.from(new Set([...state.requests[requestHost].categories, ...categories]));
}

function scoreReport(state) {
  const requests = getThirdParties(state);
  const content = state.contentReport || {};
  let score = 0;
  const reasons = [];

  const trackerCategories = ["ads", "analytics", "identity", "risk"];
  const trackerCount = requests.filter((request) => request.categories.some((category) => trackerCategories.includes(category))).length;
  const thirdPartyCount = requests.length;
  const riskyDomains = requests.filter((request) => request.categories.includes("risk"));
  const adDomains = requests.filter((request) => request.categories.includes("ads"));
  const analyticsDomains = requests.filter((request) => request.categories.includes("analytics"));

  score += Math.min(20, thirdPartyCount * 1.5);
  score += trackerCount * 3;
  score += adDomains.length * 4;
  score += analyticsDomains.length * 2;
  score += riskyDomains.length * 8;

  if (content.cookieBanner?.hasBanner && !content.cookieBanner?.hasReject) {
    score += 15;
    reasons.push("Cookie banner appears to emphasize accepting without an equally visible reject choice.");
  }

  if (content.cookieBanner?.hasHiddenReject) {
    score += 8;
    reasons.push("Reject language appears, but a visible reject control was not detected.");
  }

  if (content.cookieBanner?.hasPreselectedOptionalToggles) {
    score += 10;
    reasons.push("Optional analytics, marketing, personalization, or partner toggles appear to be preselected.");
  }

  if (content.cookieBanner?.hasBanner && content.cookieBanner?.mentionsThirdParties) {
    score += 10;
    reasons.push("Cookie notice says data may be collected or used with third-party partners.");
  }

  if (content.oauth?.highRiskScopes?.length) {
    score += Math.min(30, content.oauth.highRiskScopes.reduce((sum, scope) => sum + scope.score, 0));
    reasons.push("OAuth consent includes scopes that can expose mail, files, contacts, or long-lived access.");
  }

  if (content.oauth?.purposeMismatch?.detected) {
    score += 12;
    reasons.push("OAuth permission scope may be broader than the apparent purpose of the app.");
  }

  if (content.fingerprinting?.detected) {
    score += content.fingerprinting.riskLevel === "High" ? 10 : 6;
    reasons.push("The page shows signs of fingerprinting or anti-bot style device identification.");
  }

  if (content.policySignals?.dataCollected?.some((item) => item.id === "biometric")) {
    score += 12;
    reasons.push("Policy text mentions biometric, health, or similarly sensitive data.");
  }

  if (content.policySignals?.sharing?.some((item) => item.id === "brokers" || item.id === "advertisers")) {
    score += 12;
    reasons.push("Policy text suggests advertising, sale, sharing, or resale risk.");
  }

  if (content.policySignals?.sharing?.some((item) => item.id === "serviceProviders")) {
    score += 6;
    reasons.push("Visible text mentions vendors, processors, or third-party partners.");
  }

  if (content.policySignals?.dataCollected?.some((item) => item.id === "ai")) {
    score += 8;
    reasons.push("Policy text mentions AI, profiling, model training, or automated decisions.");
  }

  const capped = Math.max(0, Math.min(100, Math.round(score)));
  const level = capped >= 65 ? "High" : capped >= 25 ? "Medium" : "Low";

  return {
    score: capped,
    level,
    reasons,
    counts: {
      thirdPartyDomains: thirdPartyCount,
      knownTrackerDomains: trackerCount,
      adDomains: adDomains.length,
      riskyDomains: riskyDomains.length
    }
  };
}

function buildPlainEnglish(state) {
  const content = state.contentReport || {};
  const data = content.policySignals?.dataCollected || [];
  const sharing = content.policySignals?.sharing || [];
  const oauthScopes = content.oauth?.scopes || [];
  const fingerprinting = content.fingerprinting || {};

  return {
    dataCollected: data.length
      ? data.map((item) => item.label)
      : ["No strong policy signal found on this page. Open the linked privacy policy for better coverage."],
    sharedWith: sharing.length
      ? sharing.map((item) => item.label)
      : ["No strong sharing signal found in visible page text."],
    oauth: oauthScopes.length
      ? "This page includes OAuth scopes. Review them before granting access, especially mail, files, contacts, and offline access."
      : "No OAuth consent scope was visible on this page.",
    trackers: getThirdParties(state).length
      ? "The page contacted third-party domains. Known ad, analytics, identity, and fingerprinting domains are highlighted below."
      : "No third-party requests have been observed yet for this tab.",
    fingerprinting: fingerprinting.detected
      ? `Possible fingerprinting signals detected: ${fingerprinting.evidence.slice(0, 3).join(", ")}.`
      : "No obvious fingerprinting signals were detected from visible page text or known risky domains."
  };
}

function updateBadge(tabId, report) {
  const level = report.risk.level;
  const text = level === "High" ? "HIGH" : level === "Medium" ? "MED" : "LOW";
  const color = level === "High" ? "#c93535" : level === "Medium" ? "#b26a00" : "#17895b";
  chrome.action.setBadgeText({ tabId, text });
  chrome.action.setBadgeBackgroundColor({ tabId, color });
  chrome.action.setTitle({
    tabId,
    title: `ConsentLens: ${level} risk (${report.risk.score}/100)`
  });
}

function getThirdParties(state) {
  const merged = new Map();
  Object.values(state.requests).forEach((request) => {
    const intel = ConsentLensRules.lookupTracker?.(request.host) || null;
    const observed = trackerArchiveCache.get(request.host) || null;
    merged.set(request.host, {
      ...request,
      company: intel?.company || observed?.company || "Unknown",
      category: intel?.category || observed?.category || request.categories?.[0] || "unknown",
      risk: intel?.risk || observed?.risk || "unknown",
      purpose: intel?.purpose || observed?.purpose || "Unknown third-party service",
      hq: intel?.hq || observed?.hq || "Unknown",
      reputation: intel?.reputation || observed?.reputation || "Unknown",
      known: Boolean(intel?.known),
      observed: Boolean(observed && !intel?.known)
    });
  });

  (state.contentReport?.visibleThirdPartyHints || []).forEach((hint) => {
    const intel = ConsentLensRules.lookupTracker?.(hint.host) || null;
    const observed = trackerArchiveCache.get(hint.host) || null;
    if (!merged.has(hint.host)) {
      merged.set(hint.host, {
        host: hint.host,
        count: 0,
        types: {},
        categories: hint.categories || [],
        source: "page",
        company: intel?.company || observed?.company || "Unknown",
        category: intel?.category || observed?.category || hint.categories?.[0] || "unknown",
        risk: intel?.risk || observed?.risk || "unknown",
        purpose: intel?.purpose || observed?.purpose || "Unknown third-party service",
        hq: intel?.hq || observed?.hq || "Unknown",
        reputation: intel?.reputation || observed?.reputation || "Unknown",
        known: Boolean(intel?.known),
        observed: Boolean(observed && !intel?.known)
      });
      return;
    }

    const existing = merged.get(hint.host);
    existing.categories = Array.from(new Set([...existing.categories, ...(hint.categories || [])]));
    if (intel?.known) {
      existing.company = intel.company;
      existing.category = intel.category;
      existing.risk = intel.risk;
      existing.purpose = intel.purpose;
      existing.hq = intel.hq;
      existing.reputation = intel.reputation;
      existing.known = true;
      existing.observed = false;
    } else if (observed) {
      existing.company = observed.company;
      existing.category = observed.category;
      existing.risk = observed.risk;
      existing.purpose = observed.purpose;
      existing.hq = observed.hq;
      existing.reputation = observed.reputation;
      existing.observed = true;
    }
  });

  return Array.from(merged.values());
}

function storePolicySnapshot(snapshot) {
  return new Promise((resolve) => {
    chrome.storage.local.get({ policySnapshots: [] }, (result) => {
      const snapshots = Array.isArray(result.policySnapshots) ? result.policySnapshots : [];
      const key = snapshot.policyUrl || snapshot.pageUrl || "unknown";
      const previous = snapshots.find((item) => item.key === key) || null;
      const currentSignals = Array.isArray(snapshot.signals) ? snapshot.signals.map((signal) => signal.id) : [];
      const previousSignals = Array.isArray(previous?.signals) ? previous.signals : [];
      const changes = {
        added: currentSignals.filter((id) => !previousSignals.includes(id)),
        removed: previousSignals.filter((id) => !currentSignals.includes(id))
      };
      const nextEntry = {
        key,
        policyUrl: snapshot.policyUrl,
        pageUrl: snapshot.pageUrl,
        title: snapshot.title || "",
        signals: currentSignals,
        summary: snapshot.summary || [],
        privacyLabel: snapshot.privacyLabel || null,
        risk: snapshot.risk || null,
        rights: snapshot.rights || [],
        savedAt: Date.now()
      };

      chrome.storage.local.set({
        policySnapshots: [nextEntry, ...snapshots.filter((item) => item.key !== key)].slice(0, 50)
      }, () => resolve({ previous, changes }));
    });
  });
}

function storeActivityTimeline(report, risk) {
  return new Promise((resolve) => {
    chrome.storage.local.get({ activityTimeline: [] }, (result) => {
      const timeline = Array.isArray(result.activityTimeline) ? result.activityTimeline : [];
      const pageHost = report.pageHost || safeHost(report.pageUrl || "");
      const entry = {
        key: pageHost || report.pageUrl || "unknown",
        pageUrl: report.pageUrl || "",
        pageHost,
        title: report.content?.pageTitle || "",
        score: risk.score,
        level: risk.level,
        thirdParties: report.thirdParties?.length || 0,
        topTrackers: (report.thirdParties || []).slice(0, 10).map((party) => ({
          host: party.host,
          company: party.company || "Unknown",
          category: party.category || party.categories?.[0] || "unknown",
          risk: party.risk || "unknown",
          purpose: party.purpose || "Unknown third-party service",
          count: party.count || 0
        })),
        fingerprinting: Boolean(report.content?.fingerprinting?.detected),
        savedAt: Date.now()
      };

      chrome.storage.local.set({
        activityTimeline: [entry, ...timeline.filter((item) => item.key !== entry.key)].slice(0, 30)
      }, () => resolve(entry));
    });
  });
}

function getSettings() {
  return new Promise((resolve) => {
    chrome.storage.local.get(DEFAULT_SETTINGS, (result) => {
      resolve({
        apiBaseUrl: String(result.apiBaseUrl || DEFAULT_SETTINGS.apiBaseUrl).replace(/\/+$/, ""),
        region: String(result.region || DEFAULT_SETTINGS.region).toUpperCase(),
        syncObservations: Boolean(result.syncObservations ?? DEFAULT_SETTINGS.syncObservations)
      });
    });
  });
}

function setSettings(next) {
  return new Promise((resolve) => {
    chrome.storage.local.set(next, resolve);
  });
}

function syncTrackerObservations(report, settings) {
  if (!settings?.apiBaseUrl) {
    return Promise.resolve();
  }

  const pageHost = report.pageHost || safeHost(report.pageUrl || "");
  const payload = {
    pageHost,
    observations: (report.thirdParties || []).map((party) => ({
      host: party.host,
      company: party.company || "Observed tracker",
      category: party.category || party.categories?.[0] || "unknown",
      risk: party.risk || "unknown",
      purpose: party.purpose || "Seen on multiple sites",
      hq: party.hq || "Unknown",
      reputation: party.reputation || "Unknown",
      known: Boolean(party.known),
      observedSites: [pageHost].filter(Boolean),
      requests: party.count || 0
    }))
  };

  return fetch(`${settings.apiBaseUrl}/tracker-observations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  }).then((response) => {
    if (!response.ok) {
      throw new Error(`Tracker observation sync failed with ${response.status}`);
    }
  });
}

function buildReport(tabId) {
  const state = getTabState(tabId);
  const requests = getThirdParties(state)
    .sort((a, b) => b.count - a.count)
    .slice(0, 60);

  return {
    pageUrl: state.pageUrl,
    pageHost: state.pageHost,
    updatedAt: state.updatedAt,
    risk: scoreReport(state),
    plainEnglish: buildPlainEnglish(state),
    content: state.contentReport,
    thirdParties: requests
  };
}

function bestPolicyLink(report) {
  const links = report.content?.policyLinks || [];
  return links.find((link) => /privacy/i.test(link.text + " " + link.href))
    || links.find((link) => /cookie/i.test(link.text + " " + link.href))
    || links[0]
    || null;
}

async function analyzeCurrentPolicy(tabId, region = "IN") {
  const settings = await getSettings();
  const report = buildReport(tabId);
  const policy = bestPolicyLink(report);

  if (!policy?.href) {
    return {
      policy: null,
      domainIntel: [],
      error: "No privacy or cookie policy link was detected on this page."
    };
  }

  const policyResponse = await fetch(`${settings.apiBaseUrl}/analyze-policy`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      policyUrl: policy.href,
      pageUrl: report.pageUrl,
      region: region || settings.region
    })
  });

  if (!policyResponse.ok) {
    throw new Error(`Backend policy analysis failed with ${policyResponse.status}`);
  }

  const policyPayload = await policyResponse.json();
  const changeRecord = await storePolicySnapshot({
    policyUrl: policyPayload.analysis.policyUrl,
    pageUrl: policyPayload.analysis.pageUrl,
    title: policyPayload.analysis.pageTitle || "",
    signals: policyPayload.analysis.signals,
    summary: policyPayload.analysis.summary || [],
    privacyLabel: policyPayload.analysis.privacyLabel || null,
    risk: policyPayload.analysis.risk || null,
    rights: policyPayload.analysis.legal?.rights || []
  });
  const domainResponse = await fetch(`${settings.apiBaseUrl}/domain-intel`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      domains: report.thirdParties.map((party) => party.host)
    })
  });

  const domainPayload = domainResponse.ok ? await domainResponse.json() : { domains: [] };

  return {
    policy: policyPayload.analysis,
    domainIntel: domainPayload.domains || [],
    changeRecord,
    error: ""
  };
}

function storeReceipt(receipt) {
  chrome.storage.local.get({ consentReceipts: [] }, (result) => {
    const receipts = Array.isArray(result.consentReceipts) ? result.consentReceipts : [];
    const next = [receipt, ...receipts].slice(0, 50);
    chrome.storage.local.set({ consentReceipts: next });
  });
}

function storeQaEntry(entry) {
  chrome.storage.local.get({ evidenceQa: [] }, (result) => {
    const history = Array.isArray(result.evidenceQa) ? result.evidenceQa : [];
    const next = [entry, ...history].slice(0, 50);
    chrome.storage.local.set({ evidenceQa: next });
  });
}

async function getStoredSettings() {
  return getSettings();
}

chrome.webRequest.onBeforeRequest.addListener(
  recordRequest,
  { urls: ["<all_urls>"] }
);

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(DEFAULT_SETTINGS, (result) => {
    chrome.storage.local.set({
      apiBaseUrl: result.apiBaseUrl || DEFAULT_SETTINGS.apiBaseUrl,
      region: result.region || DEFAULT_SETTINGS.region,
      syncObservations: result.syncObservations ?? DEFAULT_SETTINGS.syncObservations
    });
  });
  loadTrackerArchive();
});

chrome.runtime.onStartup.addListener(() => {
  loadTrackerArchive();
});

loadTrackerArchive();

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "loading") {
    const state = blankState(tabId);
    state.pageUrl = tab.url || "";
    state.pageHost = safeHost(tab.url || "");
    tabState.set(tabId, state);
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  tabState.delete(tabId);
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "CONSENTLENS_CONTENT_REPORT" && sender.tab?.id !== undefined) {
    const state = getTabState(sender.tab.id);
    state.contentReport = message.report;
    state.pageUrl = message.report.pageUrl || state.pageUrl;
    state.pageHost = safeHost(message.report.pageUrl || state.pageUrl);
    state.updatedAt = Date.now();
    const report = buildReport(sender.tab.id);
    updateBadge(sender.tab.id, report);
    storeActivityTimeline(report, report.risk);
    observeTrackers(report);
    getSettings().then((settings) => {
      if (settings.syncObservations) {
        syncTrackerObservations(report, settings).catch(() => {});
      }
    });
    sendResponse({ ok: true });
    return true;
  }

  if (message?.type === "CONSENTLENS_GET_REPORT") {
    const tabId = message.tabId;
    sendResponse({ ok: true, report: buildReport(tabId) });
    return true;
  }

  if (message?.type === "CONSENTLENS_STORE_RECEIPT") {
    storeReceipt(message.receipt);
    sendResponse({ ok: true });
    return true;
  }

  if (message?.type === "CONSENTLENS_GET_RECEIPTS") {
    chrome.storage.local.get({ consentReceipts: [] }, (result) => {
      sendResponse({ ok: true, receipts: result.consentReceipts || [] });
    });
    return true;
  }

  if (message?.type === "CONSENTLENS_GET_TIMELINE") {
    chrome.storage.local.get({ activityTimeline: [] }, (result) => {
      sendResponse({ ok: true, timeline: result.activityTimeline || [] });
    });
    return true;
  }

  if (message?.type === "CONSENTLENS_GET_MEMORY") {
    chrome.storage.local.get(
      {
        consentReceipts: [],
        activityTimeline: [],
        policySnapshots: [],
        evidenceQa: [],
        trackerArchive: []
      },
      (result) => {
        const receipts = Array.isArray(result.consentReceipts) ? result.consentReceipts : [];
        const timeline = Array.isArray(result.activityTimeline) ? result.activityTimeline : [];
        const policies = Array.isArray(result.policySnapshots) ? result.policySnapshots : [];
        const qaHistory = Array.isArray(result.evidenceQa) ? result.evidenceQa : [];
        const trackerArchive = Array.isArray(result.trackerArchive) ? result.trackerArchive : [];

        sendResponse({
          ok: true,
          memory: {
            counts: {
              receipts: receipts.length,
              timeline: timeline.length,
              policies: policies.length,
              qa: qaHistory.length,
              trackers: trackerArchive.length
            },
            items: [
              ...timeline.slice(0, 3).map((entry) => ({
                type: "timeline",
                title: entry.pageHost || entry.pageUrl || "Unknown site",
                detail: `${entry.level} (${entry.score}/100), ${entry.thirdParties} third-party domains`,
                when: entry.savedAt
              })),
              ...policies.slice(0, 3).map((entry) => ({
                type: "policy",
                title: entry.title || entry.pageUrl || "Policy snapshot",
                detail: `${(entry.signals || []).length} policy signals saved${entry.privacyLabel?.grade ? ` · grade ${entry.privacyLabel.grade}` : ""}${Array.isArray(entry.summary) && entry.summary.length ? ` · ${entry.summary[0]}` : ""}`,
                when: entry.savedAt
              })),
              ...receipts.slice(0, 3).map((entry) => ({
                type: "receipt",
                title: entry.pageUrl || "Consent receipt",
                detail: entry.actionLabel || "Accepted / reviewed",
                when: entry.acceptedAt
              })),
              ...qaHistory.slice(0, 3).map((entry) => ({
                type: "qa",
                title: entry.pageHost || "Evidence Q&A",
                detail: `${entry.question || "Question answered"}${entry.answer ? ` · ${String(entry.answer).slice(0, 90)}` : ""}`,
                when: entry.savedAt
              })),
              ...trackerArchive.slice(0, 3).map((entry) => ({
                type: "tracker",
                title: entry.host || "Observed tracker",
                detail: `${entry.company || "Observed tracker"} · seen on ${(entry.observedSites || []).slice(0, 3).join(", ") || "this device"}`,
                when: entry.lastSeen || entry.firstSeen
              }))
            ]
          }
        });
      }
    );
    return true;
  }

  if (message?.type === "CONSENTLENS_GET_SETTINGS") {
    getStoredSettings().then((settings) => sendResponse({ ok: true, settings }));
    return true;
  }

  if (message?.type === "CONSENTLENS_SET_SETTINGS") {
    setSettings({
      apiBaseUrl: String(message.settings?.apiBaseUrl || DEFAULT_SETTINGS.apiBaseUrl).replace(/\/+$/, ""),
      region: String(message.settings?.region || DEFAULT_SETTINGS.region).toUpperCase(),
      syncObservations: Boolean(message.settings?.syncObservations)
    }).then(() => sendResponse({ ok: true }));
    return true;
  }

  if (message?.type === "CONSENTLENS_ANALYZE_POLICY") {
    analyzeCurrentPolicy(message.tabId, message.region)
      .then((analysis) => sendResponse({ ok: true, analysis }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  if (message?.type === "CONSENTLENS_STORE_QA") {
    storeQaEntry(message.entry || {});
    sendResponse({ ok: true });
    return true;
  }


  if (message?.type === "CONSENTLENS_GET_DOMAIN_INTEL") {
    getSettings()
      .then(async (settings) => {
        const report = buildReport(message.tabId);
        const domainResponse = await fetch(`${settings.apiBaseUrl}/domain-intel`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            domains: report.thirdParties.map((party) => party.host)
          })
        });
        if (!domainResponse.ok) throw new Error(`Backend domain intelligence failed with ${domainResponse.status}`);
        const payload = await domainResponse.json();
        sendResponse({ ok: true, domains: payload.domains || [] });
      })
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  return false;
});

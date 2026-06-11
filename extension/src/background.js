importScripts("rules.js");

const DEFAULT_SETTINGS = {
  apiBaseUrl: "http://localhost:8787",
  region: "IN"
};

const tabState = new Map();
const MESSAGE_TYPES = new Set([
  "CONSENTLENS_CONTENT_REPORT",
  "CONSENTLENS_GET_REPORT",
  "CONSENTLENS_STORE_RECEIPT",
  "CONSENTLENS_GET_RECEIPTS",
  "CONSENTLENS_GET_TIMELINE",
  "CONSENTLENS_GET_SETTINGS",
  "CONSENTLENS_SET_SETTINGS",
  "CONSENTLENS_ANALYZE_POLICY",
  "CONSENTLENS_LOOKUP_APP"
]);

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function validTabId(tabId) {
  return Number.isInteger(tabId) && tabId >= 0;
}

function logError(source, error, details = {}) {
  const entry = {
    source,
    message: error?.message || String(error || "Unknown error"),
    details,
    loggedAt: Date.now()
  };
  chrome.storage.local.get({ errorLog: [] }, (result) => {
    const errorLog = Array.isArray(result.errorLog) ? result.errorLog : [];
    chrome.storage.local.set({ errorLog: [entry, ...errorLog].slice(0, 50) });
  });
}

function validMessage(message, sender) {
  if (!isObject(message) || !MESSAGE_TYPES.has(message.type)) return false;
  if (message.type === "CONSENTLENS_CONTENT_REPORT") return Boolean(sender.tab?.id !== undefined && isObject(message.report));
  if (["CONSENTLENS_GET_REPORT", "CONSENTLENS_ANALYZE_POLICY"].includes(message.type)) return validTabId(message.tabId);
  if (message.type === "CONSENTLENS_STORE_RECEIPT") return isObject(message.receipt);
  if (message.type === "CONSENTLENS_SET_SETTINGS") return isObject(message.settings);
  if (message.type === "CONSENTLENS_LOOKUP_APP") return typeof message.query === "string" && message.query.length <= 120;
  return true;
}

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

function safeHost(url) {
  try {
    return ConsentLensRules.normalizeHost(new URL(url).hostname);
  } catch (error) {
    return "";
  }
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

  if (content.cookieBanner?.rejectDeemphasized) {
    score += 8;
    reasons.push("The accept action appears visually stronger than the reject option.");
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
    merged.set(request.host, { ...request });
  });

  (state.contentReport?.visibleThirdPartyHints || []).forEach((hint) => {
    if (!merged.has(hint.host)) {
      merged.set(hint.host, {
        host: hint.host,
        count: 0,
        types: {},
        categories: hint.categories || [],
        source: "page"
      });
      return;
    }

    const existing = merged.get(hint.host);
    existing.categories = Array.from(new Set([...existing.categories, ...(hint.categories || [])]));
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
        region: String(result.region || DEFAULT_SETTINGS.region).toUpperCase()
      });
    });
  });
}

function setSettings(next) {
  return new Promise((resolve) => {
    chrome.storage.local.set(next, resolve);
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
    logError("policy-analysis", new Error(`Backend policy analysis failed with ${policyResponse.status}`), { tabId });
    throw new Error(`Backend policy analysis failed with ${policyResponse.status}`);
  }

  const policyPayload = await policyResponse.json();
  const changeRecord = await storePolicySnapshot({
    policyUrl: policyPayload.analysis.policyUrl,
    pageUrl: policyPayload.analysis.pageUrl,
    title: policyPayload.analysis.pageTitle || "",
    signals: policyPayload.analysis.signals
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

async function lookupApp(query) {
  const settings = await getSettings();
  const response = await fetch(`${settings.apiBaseUrl}/app-intel`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query })
  });

  if (!response.ok) {
    throw new Error(`Backend app lookup failed with ${response.status}`);
  }

  const payload = await response.json();
  return payload.app || null;
}

function storeReceipt(receipt) {
  chrome.storage.local.get({ consentReceipts: [] }, (result) => {
    const receipts = Array.isArray(result.consentReceipts) ? result.consentReceipts : [];
    const next = [receipt, ...receipts].slice(0, 50);
    chrome.storage.local.set({ consentReceipts: next });
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
      region: result.region || DEFAULT_SETTINGS.region
    });
  });
});

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
  if (!validMessage(message, sender)) {
    logError("message-validation", new Error("Rejected invalid extension message"), { type: message?.type || "unknown" });
    sendResponse({ ok: false, error: "Invalid message" });
    return true;
  }

  if (message?.type === "CONSENTLENS_CONTENT_REPORT" && sender.tab?.id !== undefined) {
    const state = getTabState(sender.tab.id);
    state.contentReport = message.report;
    state.pageUrl = message.report.pageUrl || state.pageUrl;
    state.pageHost = safeHost(message.report.pageUrl || state.pageUrl);
    state.updatedAt = Date.now();
    const report = buildReport(sender.tab.id);
    updateBadge(sender.tab.id, report);
    storeActivityTimeline(report, report.risk);
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

  if (message?.type === "CONSENTLENS_GET_SETTINGS") {
    getStoredSettings().then((settings) => sendResponse({ ok: true, settings }));
    return true;
  }

  if (message?.type === "CONSENTLENS_SET_SETTINGS") {
    setSettings({
      apiBaseUrl: String(message.settings?.apiBaseUrl || DEFAULT_SETTINGS.apiBaseUrl).replace(/\/+$/, ""),
      region: String(message.settings?.region || DEFAULT_SETTINGS.region).toUpperCase()
    }).then(() => sendResponse({ ok: true }));
    return true;
  }

  if (message?.type === "CONSENTLENS_ANALYZE_POLICY") {
    analyzeCurrentPolicy(message.tabId, message.region)
      .then((analysis) => sendResponse({ ok: true, analysis }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  if (message?.type === "CONSENTLENS_LOOKUP_APP") {
    lookupApp(message.query || "")
      .then((app) => sendResponse({ ok: true, app }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  return false;
});

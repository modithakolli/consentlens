importScripts("rules.js");

const tabState = new Map();

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
  const requests = Object.values(state.requests);
  const content = state.contentReport || {};
  let score = 0;
  const reasons = [];

  const trackerCount = requests.filter((request) => request.categories.length).length;
  const thirdPartyCount = requests.length;
  const riskyDomains = requests.filter((request) => request.categories.includes("risk"));
  const adDomains = requests.filter((request) => request.categories.includes("ads"));

  score += Math.min(20, thirdPartyCount * 1.5);
  score += trackerCount * 3;
  score += adDomains.length * 4;
  score += riskyDomains.length * 8;

  if (content.cookieBanner?.hasBanner && !content.cookieBanner?.hasReject) {
    score += 10;
    reasons.push("Cookie banner appears to emphasize accepting without an equally visible reject choice.");
  }

  if (content.oauth?.highRiskScopes?.length) {
    score += Math.min(30, content.oauth.highRiskScopes.reduce((sum, scope) => sum + scope.score, 0));
    reasons.push("OAuth consent includes scopes that can expose mail, files, contacts, or long-lived access.");
  }

  if (content.policySignals?.dataCollected?.some((item) => item.id === "biometric")) {
    score += 12;
    reasons.push("Policy text mentions biometric, health, or similarly sensitive data.");
  }

  if (content.policySignals?.sharing?.some((item) => item.id === "brokers" || item.id === "advertisers")) {
    score += 12;
    reasons.push("Policy text suggests advertising, sale, sharing, or resale risk.");
  }

  if (content.policySignals?.dataCollected?.some((item) => item.id === "ai")) {
    score += 8;
    reasons.push("Policy text mentions AI, profiling, model training, or automated decisions.");
  }

  const capped = Math.max(0, Math.min(100, Math.round(score)));
  const level = capped >= 70 ? "High" : capped >= 35 ? "Medium" : "Low";

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
    trackers: Object.values(state.requests).length
      ? "The page contacted third-party domains. Known ad, analytics, identity, and fingerprinting domains are highlighted below."
      : "No third-party requests have been observed yet for this tab."
  };
}

function buildReport(tabId) {
  const state = getTabState(tabId);
  const requests = Object.values(state.requests)
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

chrome.webRequest.onBeforeRequest.addListener(
  recordRequest,
  { urls: ["<all_urls>"] }
);

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
    sendResponse({ ok: true });
    return true;
  }

  if (message?.type === "CONSENTLENS_GET_REPORT") {
    const tabId = message.tabId;
    sendResponse({ ok: true, report: buildReport(tabId) });
    return true;
  }

  return false;
});

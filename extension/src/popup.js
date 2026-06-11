import { clear, el, setLoading } from "./popup/dom.js";
import { getActiveTab, openOptionsPage, scanActiveTab, sendMessage } from "./popup/chromeApi.js";
import {
  renderAppIntel,
  renderDsar,
  renderEvidenceQA,
  renderFingerprinting,
  renderGraph,
  renderPolicyIntelligence,
  renderPrivacyLabel,
  renderReceipts,
  renderReport,
  renderTimeline
} from "./popup/render.js";

let currentReport = null;
let currentAnalysis = null;

async function copyDsar() {
  const node = el("dsarDraft");
  const text = node.value || "";
  if (!text) return;

  try {
    await navigator.clipboard.writeText(text);
  } catch (error) {
    node.focus();
    node.select();
    document.execCommand("copy");
    node.setSelectionRange(0, 0);
  }
}

async function refresh() {
  const tab = await getActiveTab();
  if (!tab?.id) return;

  el("host").textContent = tab.url || "Current tab";
  await scanActiveTab(tab.id);

  const response = await sendMessage({
    type: "CONSENTLENS_GET_REPORT",
    tabId: tab.id
  });

  currentReport = response.report;
  currentAnalysis = null;
  renderReport(currentReport, null);

  const receiptResponse = await sendMessage({ type: "CONSENTLENS_GET_RECEIPTS" });
  renderReceipts(receiptResponse.receipts);

  const timelineResponse = await sendMessage({ type: "CONSENTLENS_GET_TIMELINE" });
  renderTimeline(timelineResponse.timeline);
  renderPolicyIntelligence(null);
}

async function lookupApp() {
  const query = el("appQuery").value.trim();
  if (!query) {
    renderAppIntel(null);
    return;
  }

  setLoading("appIntel", "Looking up app intelligence...");
  const response = await sendMessage({
    type: "CONSENTLENS_LOOKUP_APP",
    query
  });

  if (!response.ok) {
    renderAppIntel({
      found: false,
      summary: `${response.error}. Start the backend with: node backend/server.js`
    });
    return;
  }

  renderAppIntel(response.app);
}

async function analyzePolicy() {
  const tab = await getActiveTab();
  if (!tab?.id) return;

  setLoading("policyIntelligence", "Analyzing linked policy with local backend...");
  const response = await sendMessage({
    type: "CONSENTLENS_ANALYZE_POLICY",
    tabId: tab.id,
    region: "IN"
  });

  if (!response.ok) {
    renderPolicyIntelligence({ error: `${response.error}. Start the backend with: node backend/server.js` });
    return;
  }

  currentAnalysis = response.analysis;
  renderPolicyIntelligence(currentAnalysis);
  renderGraph(currentReport, currentAnalysis);
  renderPrivacyLabel(currentReport, currentAnalysis);
  renderFingerprinting(currentReport);
  renderDsar(currentReport, currentAnalysis);
  renderEvidenceQA(currentReport, currentAnalysis);
  renderAppIntel(null);
}

function bindEvents() {
  el("refresh").addEventListener("click", refresh);
  el("openSettings").addEventListener("click", openOptionsPage);
  el("copyDsar").addEventListener("click", copyDsar);
  el("askEvidence").addEventListener("click", () => renderEvidenceQA(currentReport, currentAnalysis));
  el("evidenceQuestion").addEventListener("input", () => renderEvidenceQA(currentReport, currentAnalysis));
  el("lookupApp").addEventListener("click", lookupApp);
  el("analyzePolicy").addEventListener("click", analyzePolicy);
}

bindEvents();
refresh().catch((error) => {
  const node = el("plainEnglish");
  clear(node);
  const p = document.createElement("p");
  p.textContent = `Unable to read this tab: ${error.message}`;
  node.appendChild(p);
});

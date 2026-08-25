const message = (payload) => chrome.runtime.sendMessage(payload);

export async function activeTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

export async function scan(tabId) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["src/rules.js", "src/scanners/page.js", "src/scanners/consent.js", "src/scanners/oauth.js", "src/scanners/fingerprinting.js", "src/ui/consent-warning.js", "src/ui/oauth-warning.js", "src/content.js"]
    });
    await chrome.tabs.sendMessage(tabId, { type: "CONSENTLENS_SCAN_NOW" });
  } catch {
    // Chrome-owned and otherwise protected pages cannot be inspected.
  }
}

export async function freshReport(tabId, previousUpdatedAt = 0, timeoutMs = 2500) {
  const started = Date.now();
  let latest = null;
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await message({ type: "CONSENTLENS_GET_REPORT", tabId });
      latest = response?.report || latest;
      if (latest?.updatedAt > previousUpdatedAt) return latest;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 120));
  }
  return latest;
}

export const getReceipts = () => message({ type: "CONSENTLENS_GET_RECEIPTS" });
export const getTimeline = () => message({ type: "CONSENTLENS_GET_TIMELINE" });
export const getMemory = () => message({ type: "CONSENTLENS_GET_MEMORY" });
export const analyzePolicy = (tabId, region = "IN") => message({ type: "CONSENTLENS_ANALYZE_POLICY", tabId, region });

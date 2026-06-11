const CONTENT_SCRIPT_FILES = [
  "src/rules.js",
  "src/scanners/page.js",
  "src/scanners/consent.js",
  "src/scanners/oauth.js",
  "src/scanners/fingerprinting.js",
  "src/ui/consent-warning.js",
  "src/ui/oauth-warning.js",
  "src/content.js"
];

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

export async function scanActiveTab(tabId) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: CONTENT_SCRIPT_FILES
    });
    await wait(150);
  } catch (error) {
    // Browser-internal pages and restricted schemes cannot be scanned.
  }
}

export function sendMessage(message) {
  return chrome.runtime.sendMessage(message);
}

export function openOptionsPage() {
  chrome.runtime.openOptionsPage();
}

const DEFAULTS = {
  apiBaseUrl: "http://localhost:8787",
  region: "IN"
};

function el(id) {
  return document.getElementById(id);
}

function readValues() {
  return {
    apiBaseUrl: el("apiBaseUrl").value.trim() || DEFAULTS.apiBaseUrl,
    region: (el("region").value.trim() || DEFAULTS.region).toUpperCase()
  };
}

function setStatus(text) {
  el("status").textContent = text;
}

async function loadSettings() {
  const response = await chrome.runtime.sendMessage({ type: "CONSENTLENS_GET_SETTINGS" });
  const settings = response.ok ? response.settings : DEFAULTS;
  el("apiBaseUrl").value = settings.apiBaseUrl || DEFAULTS.apiBaseUrl;
  el("region").value = settings.region || DEFAULTS.region;
}

async function saveSettings() {
  const settings = readValues();
  const response = await chrome.runtime.sendMessage({
    type: "CONSENTLENS_SET_SETTINGS",
    settings
  });

  if (!response.ok) {
    setStatus("Could not save settings.");
    return;
  }

  setStatus(`Saved backend URL: ${settings.apiBaseUrl} and region: ${settings.region}`);
}

async function resetSettings() {
  el("apiBaseUrl").value = DEFAULTS.apiBaseUrl;
  el("region").value = DEFAULTS.region;
  await saveSettings();
}

el("save").addEventListener("click", saveSettings);
el("reset").addEventListener("click", resetSettings);
loadSettings().catch(() => setStatus("Failed to load settings."));

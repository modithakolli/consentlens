const DEFAULTS = {
  apiBaseUrl: "http://localhost:8787",
  region: "IN",
  syncObservations: false
};

function el(id) {
  return document.getElementById(id);
}

function readValues() {
  return {
    apiBaseUrl: el("apiBaseUrl").value.trim() || DEFAULTS.apiBaseUrl,
    region: (el("region").value.trim() || DEFAULTS.region).toUpperCase(),
    syncObservations: Boolean(el("syncObservations").checked)
  };
}

function setStatus(text) {
  el("status").textContent = text;
}

async function checkStatus() {
  const settings = readValues();
  setStatus("Checking backend status...");
  try {
    const response = await fetch(`${settings.apiBaseUrl.replace(/\/+$/, "")}/health`);
    if (!response.ok) {
      setStatus(`Backend is reachable but returned ${response.status}.`);
      return;
    }
    const body = await response.json();
    setStatus(`Backend online: ${body.service || "ConsentLens backend"} (${body.version || "unknown version"}).`);
  } catch (error) {
    setStatus("Backend is offline or unreachable.");
  }
}

async function loadSettings() {
  const response = await chrome.runtime.sendMessage({ type: "CONSENTLENS_GET_SETTINGS" });
  const settings = response.ok ? response.settings : DEFAULTS;
  el("apiBaseUrl").value = settings.apiBaseUrl || DEFAULTS.apiBaseUrl;
  el("region").value = settings.region || DEFAULTS.region;
  el("syncObservations").checked = Boolean(settings.syncObservations);
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

  setStatus(`Saved backend URL: ${settings.apiBaseUrl}, region: ${settings.region}, tracker sync: ${settings.syncObservations ? "on" : "off"}`);
}

async function resetSettings() {
  el("apiBaseUrl").value = DEFAULTS.apiBaseUrl;
  el("region").value = DEFAULTS.region;
  el("syncObservations").checked = DEFAULTS.syncObservations;
  await saveSettings();
}

el("save").addEventListener("click", saveSettings);
el("check").addEventListener("click", checkStatus);
el("reset").addEventListener("click", resetSettings);
loadSettings().catch(() => setStatus("Failed to load settings."));
checkStatus().catch(() => {});

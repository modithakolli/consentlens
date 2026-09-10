import { el } from "./dom.js";

export function oauthRisk(scope) {
  const value = String(scope || "").toLowerCase();
  if (/mail\.readwrite|gmail\.modify|gmail\.send|files\.readwrite|drive$/.test(value)) return ["Critical", "Can change or broadly access sensitive content."];
  if (/gmail\.readonly|drive\.readonly|contacts|calendar|mail\.read/.test(value)) return ["High", "Can read sensitive personal or work information."];
  if (/offline_access/.test(value)) return ["Medium", "Access can continue after you leave unless you revoke it."];
  return ["Low", "Basic identity or profile access."];
}

function heatmap(oauth) {
  const wrap = document.createElement("div"); wrap.className = "oauthHeatmap";
  const heading = document.createElement("p"); heading.className = "note"; heading.textContent = "Permission heatmap"; wrap.appendChild(heading);
  (oauth.scopes || []).forEach((scope) => { const [level, detail] = oauthRisk(scope); const row = document.createElement("button"); row.type = "button"; row.className = `oauthScope ${level.toLowerCase()}`; row.title = detail; row.setAttribute("aria-label", `${scope}: ${level}. ${detail}`); const name = document.createElement("strong"); name.textContent = scope; const label = document.createElement("span"); label.textContent = level; row.append(name, label); wrap.appendChild(row); });
  return wrap;
}

export function renderOAuth(oauth) {
  const node = el("oauth"); if (!node) return; node.replaceChildren();
  if (!oauth?.hasOAuthProvider && !oauth?.buttons?.length && !oauth?.scopes?.length) { const note = document.createElement("p"); note.className = "note"; note.textContent = "No account-access request was detected on this page."; node.appendChild(note); return; }
  if (oauth.provider || oauth.appName) { const p = document.createElement("p"); p.textContent = `We saw a ${oauth.provider || "sign-in"} request${oauth.appName ? ` for ${oauth.appName}` : ""}. Access level: ${oauth.accessLevel || "Not established"}.`; node.appendChild(p); }
  if (oauth.scopes?.length) { const scopes = document.createElement("div"); oauth.scopes.forEach((scope) => { const chip = document.createElement("span"); chip.className = "pill"; chip.textContent = scope; scopes.appendChild(chip); }); node.append(scopes, heatmap(oauth)); }
  if (oauth.purposeMismatch?.detected) { const warning = document.createElement("p"); warning.className = "note"; warning.textContent = `Purpose mismatch: ${oauth.purposeMismatch.reason}`; node.appendChild(warning); }
}

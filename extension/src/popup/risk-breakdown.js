import { el } from "./dom.js";

export function renderRiskBreakdown(report, analysis) {
  const node = el("riskBreakdown"); if (!node) return; node.replaceChildren();
  if (!report) { const p = document.createElement("p"); p.className = "note"; p.textContent = "Refresh the page first to see the breakdown."; node.appendChild(p); return; }
  const cookieIssues = Boolean(report.risk?.reasons?.some((reason) => /cookie banner/i.test(reason)));
  const behavior = report.thirdParties?.filter((party) => ["analytics", "ads", "identity", "risk"].some((category) => party.categories?.includes(category))).length || 0;
  const items = [
    ["Outside services", Math.min(100, (report.thirdParties?.length || 0) * 12), `${report.thirdParties?.length || 0} domains`, report.thirdParties?.length > 4 ? "medium" : "low"],
    ["Tracking services", Math.min(100, behavior * 18), `${behavior} likely trackers`, behavior > 3 ? "high" : behavior > 1 ? "medium" : "low"],
    ["Cookie choices", cookieIssues ? 70 : 10, cookieIssues ? "Accept looks easier than Reject" : "No obvious imbalance", cookieIssues ? "medium" : "low"],
    ["Account access", report.content?.oauth?.scopes?.length ? 75 : 0, report.content?.oauth?.scopes?.length ? "Sign-in scopes are visible" : "No OAuth request", report.content?.oauth?.scopes?.length ? "medium" : "low"],
    ["Policy sharing", analysis?.policy?.privacyLabel?.shares?.length || report.content?.policySignals?.sharing?.length ? 60 : 0, analysis?.policy?.privacyLabel?.shares?.length || report.content?.policySignals?.sharing?.length ? "Sharing language is present" : "No strong sharing language", "medium"]
  ];
  items.forEach(([label, value, detail, tone]) => { const row = document.createElement("div"); row.className = "riskBar"; const top = document.createElement("div"); top.className = "riskBarTop"; top.innerHTML = ""; const name = document.createElement("span"); name.className = "riskBarLabel"; name.textContent = label; const note = document.createElement("span"); note.className = "riskBarValue"; note.textContent = `${detail} · ${value}/100`; top.append(name, note); const track = document.createElement("div"); track.className = "riskBarTrack"; const fill = document.createElement("div"); fill.className = `riskBarFill ${tone}`; fill.style.width = `${value}%`; track.appendChild(fill); row.append(top, track); node.appendChild(row); });
}

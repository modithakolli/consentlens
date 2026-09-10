import { el } from "./dom.js";

export function renderPolicyIntelligence(analysis, { report, confidenceSummary }) {
  const node = el("policyIntelligence");
  node.replaceChildren();
  if (!analysis) { const note = document.createElement("p"); note.className = "note"; note.textContent = "Use Analyze policy to fetch the linked policy, summarize key clauses, and show relevant privacy rights."; node.appendChild(note); return; }
  const confidence = confidenceSummary(report, analysis);
  const add = (text, className = "") => { const p = document.createElement("p"); p.className = className; p.textContent = text; node.appendChild(p); };
  add(`Source: ${analysis.source === "local" ? "Local estimate from the current page" : "Backend policy analysis"}`, "note");
  add(`Confidence: ${confidence.label}. ${confidence.detail}`, "note");
  if (analysis.source === "local") add(analysis.notice || "Backend unavailable, so this summary is built from the current page only.", "note");
  if (analysis.error) { add(analysis.error, "error"); return; }
  const policy = analysis.policy;
  add(`Policy risk: ${policy.risk.level} (${policy.risk.score}/100)`);
  if (policy.privacyLabel) add(`Privacy grade${analysis.source === "local" ? " (local estimate)" : ""}: ${policy.privacyLabel.grade}. Collects: ${policy.privacyLabel.collects.length ? policy.privacyLabel.collects.join(", ") : "none detected"}. Shares: ${policy.privacyLabel.shares.length ? policy.privacyLabel.shares.join(", ") : "none detected"}. Retention: ${policy.privacyLabel.retention}.`);
  (policy.riskPoints || []).slice(0, 6).forEach((point) => add(`${point.severity}: ${point.title}. Evidence: ${point.evidence}`));
  (policy.summary || []).slice(0, 3).forEach((text) => add(text));
  if (policy.legal) add(`${policy.legal.region}: ${policy.legal.law}. Rights may include ${policy.legal.rights.slice(0, 2).join("; ")}.`, "note");
  const known = (analysis.domainIntel || []).filter((item) => item.known).slice(0, 5);
  if (known.length) add(`Known companies: ${known.map((item) => `${item.company} (${item.purpose}, HQ: ${item.hq}, reputation: ${item.reputation})`).join("; ")}`, "note");
  if (analysis.changeRecord?.changes) { const { added, removed } = analysis.changeRecord.changes; add(`Policy change monitoring: ${added.length ? `new signals ${added.join(", ")}` : "no new signals"}${removed.length ? `; removed signals ${removed.join(", ")}` : ""}.`, "note"); }
}

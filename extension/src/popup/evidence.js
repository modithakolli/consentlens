import { el } from "./dom.js";

export function answerEvidenceQuestion(report, analysis, question) {
  if (!report) return "Load a page and click Refresh first so I have evidence to work from.";
  const q = String(question || "").toLowerCase().trim();
  const chunks = []; const policy = analysis?.policy;
  const collected = (policy?.privacyLabel?.collects || report.plainEnglish?.dataCollected || []).slice(0, 3);
  const shared = (policy?.privacyLabel?.shares || report.plainEnglish?.sharedWith || []).slice(0, 3);
  if (!q || /why|risk|danger|safe/.test(q)) { chunks.push(`Current page risk: ${report.risk.level} (${report.risk.score}/100).`); chunks.push(report.risk.reasons.length ? `Main reasons: ${report.risk.reasons.join(" ")}` : "No major risk reasons were detected from the available signals."); if (policy?.privacyLabel) chunks.push(`Policy label: ${policy.privacyLabel.grade}.`); }
  if (/data|collect|share|who gets access|who may reach/.test(q)) { chunks.push(collected.length ? `Likely collected: ${collected.join(", ")}.` : "The visible policy does not clearly say what is collected."); chunks.push(shared.length ? `Likely shared with: ${shared.join(", ")}.` : "The visible policy does not clearly say who receives the data."); }
  if (/oauth|google|microsoft|apple|github|login|account/.test(q)) chunks.push(report.plainEnglish?.oauth || "No account-access signal was found.");
  if (/fingerprint|tracking|tracker/.test(q)) chunks.push(report.plainEnglish?.fingerprinting || "No fingerprinting summary is available.");
  if (/delete|export|request|rights|access/.test(q)) chunks.push(policy?.privacyLabel?.rights?.length ? `Rights mentioned: ${policy.privacyLabel.rights.slice(0, 2).join("; ")}.` : "The current scan does not show a clear rights summary yet.");
  return chunks.length ? chunks.join(" ") : "Open the policy or ask about data, sharing, account access, or tracking.";
}

export function renderEvidenceQA(report, analysis, question) {
  const node = el("evidenceAnswer"); node.replaceChildren();
  const card = document.createElement("div"); card.className = "qaCard";
  const heading = document.createElement("p"); heading.className = "qaLabel"; heading.textContent = "Answer";
  const answer = document.createElement("p"); answer.className = "qaAnswer"; answer.textContent = answerEvidenceQuestion(report, analysis, question || el("evidenceQuestion")?.value);
  card.append(heading, answer); node.appendChild(card);
}

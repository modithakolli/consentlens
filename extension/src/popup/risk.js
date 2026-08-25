import { el, replace, textNode } from "./dom.js";

export function decision(report, analysis) {
  const score = report?.risk?.score || 0;
  const level = String(report?.risk?.level || "Low");
  const oauth = Boolean(report?.content?.oauth?.hasOAuthProvider || report?.content?.oauth?.scopes?.length);
  const services = report?.thirdParties?.length || 0;
  let verdict = "No urgent concern";
  let text = "This scan did not find a strong reason to pause.";
  if (level === "High" || score >= 65) [verdict, text] = ["Pause and review", "This page has signals worth checking before you continue."];
  if (level === "Medium" || score >= 30) [verdict, text] = ["Use caution", "A few data-use or choice signals deserve a closer look."];
  if (oauth) text = "This page asks to connect an account. Review the requested access before continuing.";
  else if (services) text += ` Your browser contacted ${services} outside service${services === 1 ? "" : "s"}.`;
  const risks = [...new Set((report?.risk?.reasons || []).map(friendlyReason))];
  if (services) risks.unshift(`${services} outside services`);
  if (analysis?.policy?.privacyLabel?.shares?.length) risks.push("Sharing mentioned in policy");
  return { verdict, text, risks: risks.slice(0, 3) };
}

export function friendlyReason(reason) {
  const value = String(reason || "").replace(/\s+/g, " ").trim();
  if (/cookie banner/i.test(value) && /reject|accept/i.test(value)) return "Cookie choices favor Accept";
  if (/third-party|outside companies/i.test(value)) return "Outside companies are involved";
  if (/fingerprinting|device identification/i.test(value)) return "Possible device fingerprinting";
  if (/oauth|account access/i.test(value)) return "Account access requested";
  if (/advertising|sale|sharing/i.test(value)) return "Sharing or advertising risk";
  return value || "Something worth reviewing";
}

export function renderRisk(report, analysis, onAction) {
  const value = decision(report, analysis);
  const level = String(report?.risk?.level || "Low").toLowerCase();
  el("decisionSummary").className = `decision ${level}`;
  el("riskCard").className = `risk ${level}`;
  el("decisionVerdict").textContent = value.verdict;
  el("decisionText").textContent = value.text;
  el("riskLevel").textContent = report?.risk?.level || "Low";
  el("riskScore").textContent = `${report?.risk?.score || 0}/100`;
  el("riskMeter").style.width = `${report?.risk?.score || 0}%`;
  replace(el("decisionRisks"), value.risks.map((risk) => textNode("span", risk, "chipButton")));
  replace(el("decisionActions"), ["Why this risk?", "Review policy", "What can I do?"].map((label) => {
    const button = textNode("button", label, "chipButton actionChip");
    button.type = "button";
    button.addEventListener("click", () => onAction(label));
    return button;
  }));
}

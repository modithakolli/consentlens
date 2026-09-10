import { el } from "./dom.js";

export function buildDsarDraft(report, analysis) {
  if (!report) return "Load a page and click Refresh to generate a data-rights request.";
  const host = report.pageHost || "this website";
  const policy = analysis?.policy;
  const rights = policy?.privacyLabel?.rights || [
    "Access my data.", "Delete my data.", "Export my data.", "Withdraw optional consent where applicable."
  ];
  const collected = policy?.privacyLabel?.collects?.length ? policy.privacyLabel.collects.join(", ") : "identity, device, usage, and third-party data categories";
  const shared = policy?.privacyLabel?.shares?.length ? policy.privacyLabel.shares.join(", ") : "service providers, analytics vendors, and advertising partners";
  return [
    `Subject: Data access / deletion request for ${host}`, "", "Hello,", "",
    `I am requesting a copy of the personal data associated with my account and browsing activity for ${host}, including categories I may have consented to through cookies, OAuth, or policy acceptance.`, "",
    "Please provide:", ...rights.map((right) => `- ${right}`), "",
    `Based on the current policy signals, likely data categories include: ${collected}.`,
    `Likely sharing categories include: ${shared}.`, "",
    "Please confirm any retention periods, third-party recipients, and how to withdraw optional consent.", "", "Thank you."
  ].join("\n");
}

export function renderDsar(report, analysis) {
  const node = el("dsarDraft");
  if (node) node.value = buildDsarDraft(report, analysis);
}

export async function copyDsar() {
  const node = el("dsarDraft");
  const value = node?.value || "";
  if (!value) return;
  try {
    await navigator.clipboard.writeText(value);
  } catch {
    node.focus();
    node.select();
    document.execCommand("copy");
    node.setSelectionRange(0, 0);
  }
}

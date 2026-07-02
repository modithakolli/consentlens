import { appendPair, clear, el, textNode } from "./dom.js";

function list(target, items, fallback) {
  const node = el(target);
  clear(node);
  const values = items?.length ? items : [fallback];
  values.forEach((item) => {
    const li = document.createElement("li");
    li.textContent = typeof item === "string" ? item : item.label || item.scope || item.host;
    node.appendChild(li);
  });
}

function paragraph(target, items) {
  const node = el(target);
  clear(node);
  items.forEach((item) => node.appendChild(textNode("p", item)));
}

function tag(category) {
  const span = document.createElement("span");
  span.className = `tag ${category}`;
  span.textContent = category;
  return span;
}

function detailList(label, values, emptyText = "none recorded") {
  return `${label}: ${values?.length ? values.join(", ") : emptyText}`;
}

function renderControls(target, controls) {
  if (!controls?.length) return;
  const node = el(target);
  const heading = textNode("p", "Controls and account actions", "note");
  node.appendChild(heading);
  const list = document.createElement("ul");
  controls.slice(0, 5).forEach((control) => {
    const li = document.createElement("li");
    const strong = document.createElement("strong");
    strong.textContent = `${control.label}: `;
    li.append(strong, document.createTextNode(control.detail || "Review this setting in the product UI."));
    list.appendChild(li);
  });
  node.appendChild(list);
}

function graphNode(title, subtitle) {
  const node = document.createElement("div");
  node.className = "graphNode";
  appendPair(node, title, subtitle);
  return node;
}

function arrow() {
  const node = document.createElement("div");
  node.className = "graphArrow";
  node.textContent = "->";
  return node;
}

export function renderOAuth(oauth) {
  const node = el("oauth");
  clear(node);

  if (!oauth?.hasOAuthProvider && !oauth?.buttons?.length && !oauth?.scopes?.length) {
    node.appendChild(textNode("p", "No OAuth consent flow was visible on this page.", "note"));
    return;
  }

  if (oauth.provider || oauth.appName) {
    node.appendChild(textNode("p", `${oauth.provider || "OAuth"} consent${oauth.appName ? ` for ${oauth.appName}` : ""}. Access level: ${oauth.accessLevel || "Unknown"}.`));
  }

  if (oauth.buttons?.length) {
    node.appendChild(textNode("p", `Sign-in buttons found: ${oauth.buttons.join(", ")}`));
  }

  if (oauth.scopes?.length) {
    const scopes = document.createElement("div");
    oauth.scopes.forEach((scope) => {
      const chip = document.createElement("span");
      chip.className = "pill";
      chip.textContent = scope;
      scopes.appendChild(chip);
    });
    node.appendChild(scopes);
  }

  if (oauth.highRiskScopes?.length) {
    const ul = document.createElement("ul");
    oauth.highRiskScopes.forEach((scope) => {
      const li = document.createElement("li");
      li.textContent = `${scope.scope}: ${scope.note} (${scope.accessLevel || "Medium"} access)`;
      ul.appendChild(li);
    });
    node.appendChild(ul);
  }

  if (oauth.purposeMismatch?.detected) {
    node.appendChild(textNode("p", `Purpose mismatch: ${oauth.purposeMismatch.reason}`, "note"));
  }
}

export function renderStats(risk) {
  const stats = el("stats");
  clear(stats);
  [
    ["Third-party domains", risk.counts.thirdPartyDomains],
    ["Known trackers", risk.counts.knownTrackerDomains],
    ["Ad domains", risk.counts.adDomains],
    ["Risky domains", risk.counts.riskyDomains]
  ].forEach(([label, value]) => {
    const card = document.createElement("div");
    card.className = "stat";
    appendPair(card, String(value), label);
    stats.appendChild(card);
  });
}

export function renderThirdParties(thirdParties) {
  const node = el("thirdParties");
  clear(node);

  if (!thirdParties?.length) {
    node.appendChild(textNode("li", "No third-party requests observed yet. Refresh the page and interact with it for a fuller read.", "note"));
    return;
  }

  thirdParties.forEach((party) => {
    const li = document.createElement("li");
    const row = document.createElement("div");
    row.className = "domain";
    appendPair(row, party.host, `${party.count} requests`);
    li.appendChild(row);

    const tags = document.createElement("div");
    (party.categories.length ? party.categories : ["unknown"]).forEach((category) => tags.appendChild(tag(category)));
    li.appendChild(tags);
    node.appendChild(li);
  });
}

export function renderLinks(links) {
  const node = el("policyLinks");
  clear(node);

  if (!links?.length) {
    node.appendChild(textNode("li", "No obvious privacy, terms, cookie, or legal links found.", "note"));
    return;
  }

  links.slice(0, 8).forEach((link) => {
    const li = document.createElement("li");
    const a = document.createElement("a");
    a.href = link.href;
    a.target = "_blank";
    a.rel = "noreferrer";
    a.textContent = link.text || link.href;
    li.appendChild(a);
    node.appendChild(li);
  });
}

export function renderGraph(report, analysis) {
  const node = el("trackerGraph");
  clear(node);

  const thirdParties = report?.thirdParties || [];
  const domainIntel = analysis?.domainIntel || [];
  const domainMap = new Map(domainIntel.map((item) => [item.host, item]));

  if (!thirdParties.length) {
    node.appendChild(textNode("p", "No tracker graph yet. Refresh the page and load a site with third-party requests.", "note"));
    return;
  }

  thirdParties.slice(0, 8).forEach((party) => {
    const intel = domainMap.get(party.host) || {};
    const row = document.createElement("div");
    row.className = "graphRow";
    row.append(
      graphNode("You", "consent / browse"),
      arrow(),
      graphNode(report.pageHost || "This site", "site"),
      arrow(),
      graphNode(party.host, party.categories.length ? party.categories.join(", ") : "unknown"),
      arrow(),
      graphNode(intel.company || "Unknown company", `${intel.category || "unknown"} · ${intel.risk || "unknown"} risk`)
    );
    node.appendChild(row);
  });
}

export function renderPolicyIntelligence(analysis) {
  const node = el("policyIntelligence");
  clear(node);

  if (!analysis) {
    node.appendChild(textNode("p", "Run policy analysis to fetch the linked policy, summarize key clauses, and show relevant privacy rights.", "note"));
    return;
  }

  if (analysis.error) {
    node.appendChild(textNode("p", analysis.error, "error"));
    return;
  }

  const policy = analysis.policy;
  node.appendChild(textNode("p", `Policy risk: ${policy.risk.level} (${policy.risk.score}/100)`));

  if (policy.privacyLabel) {
    node.appendChild(textNode("p", `Privacy grade: ${policy.privacyLabel.grade}. Collects: ${policy.privacyLabel.collects.length ? policy.privacyLabel.collects.join(", ") : "none detected"}. Shares: ${policy.privacyLabel.shares.length ? policy.privacyLabel.shares.join(", ") : "none detected"}. Retention: ${policy.privacyLabel.retention}.`));
    if (policy.privacyLabel.controls?.length) {
      node.appendChild(textNode("p", `Policy controls: ${policy.privacyLabel.controls.join(", ")}`, "note"));
    }
  }

  policy.summary.slice(0, 5).forEach((text) => node.appendChild(textNode("p", text)));

  if (policy.controls?.length) {
    renderControls("policyIntelligence", policy.controls);
  }

  if (policy.legal) {
    node.appendChild(textNode("p", `${policy.legal.region}: ${policy.legal.law}. Rights may include ${policy.legal.rights.slice(0, 2).join("; ")}.`, "note"));
  }

  const known = analysis.domainIntel?.filter((item) => item.known).slice(0, 5) || [];
  if (known.length) {
    node.appendChild(textNode("p", `Known companies: ${known.map((item) => `${item.company} (${item.purpose}, HQ: ${item.hq}, reputation: ${item.reputation})`).join("; ")}`, "note"));
  }

  if (analysis.changeRecord?.changes) {
    const { added, removed } = analysis.changeRecord.changes;
    node.appendChild(textNode("p", `Policy change monitoring: ${added.length ? `new signals ${added.join(", ")}` : "no new signals"}${removed.length ? `; removed signals ${removed.join(", ")}` : ""}.`, "note"));
  }
}

export function renderPrivacyLabel(report, analysis) {
  const node = el("privacyLabel");
  clear(node);

  const label = analysis?.policy?.privacyLabel;
  if (label) {
    node.appendChild(textNode("p", `Privacy grade ${label.grade}: collects ${label.collects.length ? label.collects.join(", ") : "nothing obvious"}; shares ${label.shares.length ? label.shares.join(", ") : "nothing obvious"}; retention ${label.retention}.`));
    if (label.controls?.length) {
      node.appendChild(textNode("p", `Controls: ${label.controls.join(", ")}`, "note"));
    }
    return;
  }

  node.appendChild(textNode("p", report?.thirdParties?.length
    ? `This site sends data to ${report.thirdParties.length} third-party domains. Click Analyze to generate a privacy nutrition label.`
    : "No privacy nutrition label yet. Load a page with policy links or third-party requests, then click Analyze.", "note"));
}

export function renderTimeline(timeline) {
  const node = el("privacyTimeline");
  clear(node);
  if (!timeline?.length) {
    node.appendChild(textNode("li", "No recent analyses saved yet.", "note"));
    return;
  }
  timeline.slice(0, 8).forEach((item) => {
    const when = new Date(item.savedAt).toLocaleString();
    const profile = item.siteIntel?.name ? `, profile: ${item.siteIntel.name}` : "";
    node.appendChild(textNode("li", `${item.pageHost || "Unknown site"}: ${item.level} (${item.score}/100), ${item.thirdParties} third-party domains${profile}, ${item.fingerprinting ? "fingerprinting signaled" : "no fingerprinting signaled"} on ${when}`));
  });
}

export function buildDsarDraft(report, analysis) {
  if (!report) return "Load a page and click Refresh to generate a DSAR draft.";
  const host = report.pageHost || "this website";
  const policy = analysis?.policy;
  const rights = policy?.privacyLabel?.rights || ["Access my data.", "Delete my data.", "Export my data.", "Withdraw optional consent where applicable."];
  const collected = policy?.privacyLabel?.collects?.length ? policy.privacyLabel.collects.join(", ") : "identity, device, usage, and third-party data categories";
  const shared = policy?.privacyLabel?.shares?.length ? policy.privacyLabel.shares.join(", ") : "service providers, analytics vendors, and advertising partners";
  const controls = policy?.privacyLabel?.controls?.length ? policy.privacyLabel.controls.join(", ") : "training, activity, delete-account, and export controls";
  return [
    `Subject: Data access / deletion request for ${host}`,
    "",
    "Hello,",
    "",
    `I am requesting a copy of the personal data associated with my account and browsing activity for ${host}, including the categories I may have consented to through cookies, OAuth, or policy acceptance.`,
    "",
    "Please provide:",
    ...rights.map((right) => `- ${right}`),
    "",
    `Based on the current policy signals, likely data categories include: ${collected}.`,
    `Likely sharing categories include: ${shared}.`,
    `Important controls to review include: ${controls}.`,
    "",
    "Please confirm any retention periods, third-party recipients, and how to withdraw optional consent.",
    "",
    "Thank you."
  ].join("\n");
}

export function renderDsar(report, analysis) {
  el("dsarDraft").value = buildDsarDraft(report, analysis);
}

export function renderFingerprinting(report) {
  const node = el("fingerprinting");
  clear(node);
  if (!report) {
    node.appendChild(textNode("p", "Load a page and click Refresh to inspect fingerprinting hints.", "note"));
    return;
  }
  const fingerprinting = report.content?.fingerprinting;
  if (!fingerprinting?.detected) {
    node.appendChild(textNode("p", "No obvious fingerprinting signals were detected from the visible page text or risky domains.", "note"));
    return;
  }
  node.appendChild(textNode("p", `Risk level: ${fingerprinting.riskLevel}. Evidence: ${fingerprinting.evidence.join(", ")}.`));
  node.appendChild(textNode("p", "This can be used for anti-bot checks, fraud controls, or cross-session identification. It is worth pausing before continuing.", "note"));
}

export function renderAppIntel(app) {
  const node = el("appIntel");
  clear(node);
  if (!app) {
    node.appendChild(textNode("p", "Search for a service to see a quick privacy profile.", "note"));
    return;
  }
  if (!app.found) {
    node.appendChild(textNode("p", app.summary || "No local app record found.", "note"));
    return;
  }
  node.appendChild(textNode("p", `${app.name} - privacy score ${app.privacyScore}/100`));
  node.appendChild(textNode("p", app.platform, "note"));
  ["dataCategories", "permissions", "thirdParties", "concerns"].forEach((key) => {
    const label = {
      dataCategories: "Data categories",
      permissions: "Typical permissions",
      thirdParties: "Third parties",
      concerns: "Concerns"
    }[key];
    node.appendChild(textNode("p", `${label}: ${app[key]?.length ? app[key].join(", ") : "none recorded"}`));
  });
  if (app.controls?.length) {
    renderControls("appIntel", app.controls);
  }
  if (app.retention?.length) {
    const label = textNode("p", "Retention and persistence", "note");
    node.appendChild(label);
    const list = document.createElement("ul");
    app.retention.slice(0, 5).forEach((item) => {
      const li = document.createElement("li");
      li.textContent = `${item.label}: ${item.detail}`;
      list.appendChild(li);
    });
    node.appendChild(list);
  }
  if (app.summary) node.appendChild(textNode("p", app.summary, "note"));
}

export function renderSiteIntel(siteIntel) {
  const node = el("siteIntel");
  clear(node);
  if (!siteIntel) {
    node.appendChild(textNode("p", "Open a site and refresh to build automatic site intelligence from the current host.", "note"));
    return;
  }
  if (siteIntel.company || siteIntel.category) {
    const title = siteIntel.company && siteIntel.company !== "Unknown" ? siteIntel.company : (siteIntel.host || "Current site");
    node.appendChild(textNode("p", `${title} - ${siteIntel.category || "unknown"} · ${siteIntel.risk || "unknown"} risk`));
    node.appendChild(textNode("p", siteIntel.purpose || "Unknown purpose", "note"));
    node.appendChild(textNode("p", `HQ: ${siteIntel.hq || "Unknown"} · Reputation: ${siteIntel.reputation || "Unknown"}`, "note"));
    return;
  }
  node.appendChild(textNode("p", `${siteIntel.name} - privacy score ${siteIntel.privacyScore}/100`));
  node.appendChild(textNode("p", siteIntel.platform, "note"));
  node.appendChild(textNode("p", detailList("Data categories", siteIntel.dataCategories)));
  node.appendChild(textNode("p", detailList("Typical permissions", siteIntel.permissions)));
  node.appendChild(textNode("p", detailList("Third parties", siteIntel.thirdParties)));
  node.appendChild(textNode("p", detailList("Concerns", siteIntel.concerns)));
  if (siteIntel.controls?.length) {
    renderControls("siteIntel", siteIntel.controls);
  }
  if (siteIntel.retention?.length) {
    const label = textNode("p", "Retention and persistence", "note");
    node.appendChild(label);
    const list = document.createElement("ul");
    siteIntel.retention.slice(0, 5).forEach((item) => {
      const li = document.createElement("li");
      li.textContent = `${item.label}: ${item.detail}`;
      list.appendChild(li);
    });
    node.appendChild(list);
  }
  if (siteIntel.summary) node.appendChild(textNode("p", siteIntel.summary, "note"));
}

export function answerEvidenceQuestion(report, analysis, question) {
  if (!report) return "Load a page and click Refresh first so I have evidence to work from.";
  const q = String(question || "").toLowerCase().trim();
  const chunks = [`Current page risk: ${report.risk.level} (${report.risk.score}/100).`];
  if (!q || /why|risk|danger|safe/.test(q)) chunks.push(report.risk.reasons.length ? `Main reasons: ${report.risk.reasons.join(" ")}` : "No major risk reasons were detected from the available signals.");
  if (/data|collect|share/.test(q)) {
    chunks.push(`Likely collected: ${report.plainEnglish.dataCollected.slice(0, 3).join(", ")}.`);
    chunks.push(`Likely shared with: ${report.plainEnglish.sharedWith.slice(0, 3).join(", ")}.`);
  }
  if (/oauth|google|microsoft|apple|github|login/.test(q)) {
    chunks.push(report.plainEnglish.oauth);
    if (report.content?.oauth?.purposeMismatch?.detected) chunks.push(`Purpose mismatch: ${report.content.oauth.purposeMismatch.reason}`);
  }
  if (/fingerprint|tracking|tracker/.test(q)) chunks.push(report.plainEnglish.fingerprinting);
  if (analysis?.policy?.privacyLabel) chunks.push(`Policy label: ${analysis.policy.privacyLabel.grade}, with rights that may include ${analysis.policy.privacyLabel.rights.slice(0, 2).join("; ")}.`);
  if (analysis?.policy?.privacyLabel?.controls?.length) chunks.push(`Policy controls: ${analysis.policy.privacyLabel.controls.slice(0, 3).join(", ")}.`);
  return chunks.join(" ");
}

export function renderEvidenceQA(report, analysis, question) {
  const node = el("evidenceAnswer");
  clear(node);
  node.appendChild(textNode("p", answerEvidenceQuestion(report, analysis, question || el("evidenceQuestion").value)));
}

export function renderReceipts(receipts) {
  const node = el("receipts");
  clear(node);
  if (!receipts?.length) {
    node.appendChild(textNode("li", "No consent receipts saved yet.", "note"));
    return;
  }
  receipts.slice(0, 5).forEach((receipt) => {
    const date = new Date(receipt.acceptedAt).toLocaleString();
    const host = (() => {
      try {
        return new URL(receipt.pageUrl).hostname.replace(/^www\./, "");
      } catch (error) {
        return receipt.pageTitle || "Unknown site";
      }
    })();
    node.appendChild(textNode("li", `${host}: ${receipt.actionLabel} on ${date}`));
  });
}

export function renderReport(report, analysis) {
  const levelClass = report.risk.level.toLowerCase();
  const riskCard = el("riskCard");
  riskCard.className = `risk ${levelClass}`;
  el("riskLevel").textContent = report.risk.level;
  el("riskScore").textContent = `${report.risk.score}/100`;
  el("riskMeter").style.width = `${report.risk.score}%`;

  paragraph("plainEnglish", [
    `Trackers: ${report.plainEnglish.trackers}`,
    `OAuth: ${report.plainEnglish.oauth}`,
    ...(report.risk.reasons.length ? report.risk.reasons : ["No major red flags from the available page signals."])
  ]);

  list("dataCollected", report.plainEnglish.dataCollected, "No clear data collection signal found.");
  list("sharedWith", report.plainEnglish.sharedWith, "No clear sharing signal found.");
  renderOAuth(report.content?.oauth);
  renderStats(report.risk);
  renderThirdParties(report.thirdParties);
  renderLinks(report.content?.policyLinks);
  renderGraph(report, analysis);
  renderPrivacyLabel(report, analysis);
  renderSiteIntel(report.siteIntel);
  renderFingerprinting(report);
  renderDsar(report, analysis);
  renderEvidenceQA(report, analysis, el("evidenceQuestion").value);
}

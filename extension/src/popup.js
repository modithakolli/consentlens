function el(id) {
  return document.getElementById(id);
}

let currentReport = null;
let currentAnalysis = null;

function list(target, items, fallback) {
  const node = el(target);
  node.innerHTML = "";
  const values = items?.length ? items : [fallback];
  values.forEach((item) => {
    const li = document.createElement("li");
    li.textContent = typeof item === "string" ? item : item.label || item.scope || item.host;
    node.appendChild(li);
  });
}

function paragraph(target, items) {
  const node = el(target);
  node.innerHTML = "";
  items.forEach((item) => {
    const p = document.createElement("p");
    p.textContent = item;
    node.appendChild(p);
  });
}

function tag(category) {
  const span = document.createElement("span");
  span.className = `tag ${category}`;
  span.textContent = category;
  return span;
}

function renderOAuth(oauth) {
  const node = el("oauth");
  node.innerHTML = "";

  if (!oauth?.hasOAuthProvider && !oauth?.buttons?.length && !oauth?.scopes?.length) {
    node.innerHTML = "<p class='note'>No OAuth consent flow was visible on this page.</p>";
    return;
  }

  if (oauth.provider || oauth.appName) {
    const p = document.createElement("p");
    p.textContent = `${oauth.provider || "OAuth"} consent${oauth.appName ? ` for ${oauth.appName}` : ""}. Access level: ${oauth.accessLevel || "Unknown"}.`;
    node.appendChild(p);
  }

  if (oauth.buttons?.length) {
    const p = document.createElement("p");
    p.textContent = `Sign-in buttons found: ${oauth.buttons.join(", ")}`;
    node.appendChild(p);
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
    const warning = document.createElement("p");
    warning.className = "note";
    warning.textContent = `Purpose mismatch: ${oauth.purposeMismatch.reason}`;
    node.appendChild(warning);
  }
}

function renderStats(risk) {
  const stats = el("stats");
  stats.innerHTML = "";
  [
    ["Third-party domains", risk.counts.thirdPartyDomains],
    ["Known trackers", risk.counts.knownTrackerDomains],
    ["Ad domains", risk.counts.adDomains],
    ["Risky domains", risk.counts.riskyDomains]
  ].forEach(([label, value]) => {
    const card = document.createElement("div");
    card.className = "stat";
    card.innerHTML = `<strong>${value}</strong><span>${label}</span>`;
    stats.appendChild(card);
  });
}

function renderThirdParties(thirdParties) {
  const node = el("thirdParties");
  node.innerHTML = "";

  if (!thirdParties?.length) {
    const li = document.createElement("li");
    li.className = "note";
    li.textContent = "No third-party requests observed yet. Refresh the page and interact with it for a fuller read.";
    node.appendChild(li);
    return;
  }

  thirdParties.forEach((party) => {
    const li = document.createElement("li");
    const row = document.createElement("div");
    row.className = "domain";
    row.innerHTML = `<strong>${party.host}</strong><span>${party.count} requests</span>`;
    li.appendChild(row);

    const tags = document.createElement("div");
    if (party.categories.length) {
      party.categories.forEach((category) => tags.appendChild(tag(category)));
    } else {
      tags.appendChild(tag("unknown"));
    }
    li.appendChild(tags);
    node.appendChild(li);
  });
}

function renderLinks(links) {
  const node = el("policyLinks");
  node.innerHTML = "";

  if (!links?.length) {
    const li = document.createElement("li");
    li.className = "note";
    li.textContent = "No obvious privacy, terms, cookie, or legal links found.";
    node.appendChild(li);
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

function renderGraph(report, analysis) {
  const node = el("trackerGraph");
  node.innerHTML = "";

  const thirdParties = report.thirdParties || [];
  const domainIntel = analysis?.domainIntel || [];
  const domainMap = new Map(domainIntel.map((item) => [item.host, item]));

  if (!thirdParties.length) {
    const p = document.createElement("p");
    p.className = "note";
    p.textContent = "No tracker graph yet. Refresh the page and load a site with third-party requests.";
    node.appendChild(p);
    return;
  }

  thirdParties.slice(0, 8).forEach((party) => {
    const intel = domainMap.get(party.host) || {};
    const row = document.createElement("div");
    row.className = "graphRow";

    const user = document.createElement("div");
    user.className = "graphNode";
    user.innerHTML = `<strong>You</strong><span>consent / browse</span>`;

    const source = document.createElement("div");
    source.className = "graphNode";
    source.innerHTML = `<strong>${report.pageHost || "This site"}</strong><span>site</span>`;

    const arrow1 = document.createElement("div");
    arrow1.className = "graphArrow";
    arrow1.textContent = "->";

    const tracker = document.createElement("div");
    tracker.className = "graphNode";
    tracker.innerHTML = `<strong>${party.host}</strong><span>${party.categories.length ? party.categories.join(", ") : "unknown"}</span>`;

    const arrow2 = document.createElement("div");
    arrow2.className = "graphArrow";
    arrow2.textContent = "->";

    const company = document.createElement("div");
    company.className = "graphNode";
    company.innerHTML = `<strong>${intel.company || "Unknown company"}</strong><span>${intel.purpose || "Unknown purpose"}</span>`;

    const arrow3 = document.createElement("div");
    arrow3.className = "graphArrow";
    arrow3.textContent = "->";

    row.append(user, arrow1, source, arrow2, tracker, arrow3, company);
    node.appendChild(row);
  });
}

function renderPolicyIntelligence(analysis) {
  const node = el("policyIntelligence");
  node.innerHTML = "";

  if (!analysis) {
    const p = document.createElement("p");
    p.className = "note";
    p.textContent = "Run policy analysis to fetch the linked policy, summarize key clauses, and show relevant privacy rights.";
    node.appendChild(p);
    return;
  }

  if (analysis.error) {
    const p = document.createElement("p");
    p.className = "error";
    p.textContent = analysis.error;
    node.appendChild(p);
    return;
  }

  const policy = analysis.policy;
  const risk = document.createElement("p");
  risk.textContent = `Policy risk: ${policy.risk.level} (${policy.risk.score}/100)`;
  node.appendChild(risk);

  if (policy.privacyLabel) {
    const label = document.createElement("p");
    label.textContent = `Privacy grade: ${policy.privacyLabel.grade}. Collects: ${policy.privacyLabel.collects.length ? policy.privacyLabel.collects.join(", ") : "none detected"}. Shares: ${policy.privacyLabel.shares.length ? policy.privacyLabel.shares.join(", ") : "none detected"}. Retention: ${policy.privacyLabel.retention}.`;
    node.appendChild(label);
  }

  policy.summary.slice(0, 5).forEach((text) => {
    const p = document.createElement("p");
    p.textContent = text;
    node.appendChild(p);
  });

  if (policy.legal) {
    const legal = document.createElement("p");
    legal.className = "note";
    legal.textContent = `${policy.legal.region}: ${policy.legal.law}. Rights may include ${policy.legal.rights.slice(0, 2).join("; ")}.`;
    node.appendChild(legal);
  }

  if (analysis.domainIntel?.length) {
    const known = analysis.domainIntel.filter((item) => item.known).slice(0, 5);
    if (known.length) {
      const p = document.createElement("p");
      p.className = "note";
      p.textContent = `Known companies: ${known.map((item) => `${item.company} (${item.purpose}, HQ: ${item.hq}, reputation: ${item.reputation})`).join("; ")}`;
      node.appendChild(p);
    }
  }

  if (analysis.changeRecord?.changes) {
    const { added, removed } = analysis.changeRecord.changes;
    const p = document.createElement("p");
    p.className = "note";
    p.textContent = `Policy change monitoring: ${added.length ? `new signals ${added.join(", ")}` : "no new signals"}${removed.length ? `; removed signals ${removed.join(", ")}` : ""}.`;
    node.appendChild(p);
  }
}

function renderPrivacyLabel(report, analysis) {
  const node = el("privacyLabel");
  node.innerHTML = "";

  const policy = analysis?.policy;
  if (policy?.privacyLabel) {
    const p = document.createElement("p");
    p.textContent = `Privacy grade ${policy.privacyLabel.grade}: collects ${policy.privacyLabel.collects.length ? policy.privacyLabel.collects.join(", ") : "nothing obvious"}; shares ${policy.privacyLabel.shares.length ? policy.privacyLabel.shares.join(", ") : "nothing obvious"}; retention ${policy.privacyLabel.retention}.`;
    node.appendChild(p);
    return;
  }

  const p = document.createElement("p");
  p.className = "note";
  p.textContent = report.thirdParties?.length
    ? `This site sends data to ${report.thirdParties.length} third-party domains. Click Analyze to generate a privacy nutrition label.`
    : "No privacy nutrition label yet. Load a page with policy links or third-party requests, then click Analyze.";
  node.appendChild(p);
}

function renderTimeline(timeline) {
  const node = el("privacyTimeline");
  node.innerHTML = "";

  if (!timeline?.length) {
    const li = document.createElement("li");
    li.className = "note";
    li.textContent = "No recent analyses saved yet.";
    node.appendChild(li);
    return;
  }

  timeline.slice(0, 8).forEach((item) => {
    const li = document.createElement("li");
    const when = new Date(item.savedAt).toLocaleString();
    li.textContent = `${item.pageHost || "Unknown site"}: ${item.level} (${item.score}/100), ${item.thirdParties} third-party domains, ${item.fingerprinting ? "fingerprinting signaled" : "no fingerprinting signaled"} on ${when}`;
    node.appendChild(li);
  });
}

function buildDsarDraft(report, analysis) {
  if (!report) {
    return "Load a page and click Refresh to generate a DSAR draft.";
  }

  const host = report.pageHost || "this website";
  const policy = analysis?.policy;
  const rights = policy?.privacyLabel?.rights || [
    "Access my data.",
    "Delete my data.",
    "Export my data.",
    "Withdraw optional consent where applicable."
  ];
  const collected = policy?.privacyLabel?.collects?.length ? policy.privacyLabel.collects.join(", ") : "identity, device, usage, and third-party data categories";
  const shared = policy?.privacyLabel?.shares?.length ? policy.privacyLabel.shares.join(", ") : "service providers, analytics vendors, and advertising partners";

  return [
    `Subject: Data access / deletion request for ${host}`,
    "",
    `Hello,`,
    "",
    `I am requesting a copy of the personal data associated with my account and browsing activity for ${host}, including the categories I may have consented to through cookies, OAuth, or policy acceptance.`,
    "",
    `Please provide:`,
    ...rights.map((right) => `- ${right}`),
    "",
    `Based on the current policy signals, likely data categories include: ${collected}.`,
    `Likely sharing categories include: ${shared}.`,
    "",
    "Please confirm any retention periods, third-party recipients, and how to withdraw optional consent.",
    "",
    "Thank you."
  ].join("\n");
}

function renderDsar(report, analysis) {
  const node = el("dsarDraft");
  node.value = buildDsarDraft(report, analysis);
}

async function copyDsar() {
  const node = el("dsarDraft");
  const text = node.value || "";
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
  } catch (error) {
    node.focus();
    node.select();
    document.execCommand("copy");
    node.setSelectionRange(0, 0);
  }
}

function renderFingerprinting(report) {
  const node = el("fingerprinting");
  node.innerHTML = "";
  if (!report) {
    const p = document.createElement("p");
    p.className = "note";
    p.textContent = "Load a page and click Refresh to inspect fingerprinting hints.";
    node.appendChild(p);
    return;
  }
  const fingerprinting = report.content?.fingerprinting;

  if (!fingerprinting?.detected) {
    const p = document.createElement("p");
    p.className = "note";
    p.textContent = "No obvious fingerprinting signals were detected from the visible page text or risky domains.";
    node.appendChild(p);
    return;
  }

  const summary = document.createElement("p");
  summary.textContent = `Risk level: ${fingerprinting.riskLevel}. Evidence: ${fingerprinting.evidence.join(", ")}.`;
  node.appendChild(summary);

  const suggestions = document.createElement("p");
  suggestions.className = "note";
  suggestions.textContent = "This can be used for anti-bot checks, fraud controls, or cross-session identification. It is worth pausing before continuing.";
  node.appendChild(suggestions);
}

function answerEvidenceQuestion(report, analysis, question) {
  if (!report) {
    return "Load a page and click Refresh first so I have evidence to work from.";
  }

  const q = String(question || "").toLowerCase().trim();
  const chunks = [];
  const riskLine = `Current page risk: ${report.risk.level} (${report.risk.score}/100).`;
  chunks.push(riskLine);

  if (!q || /why|risk|danger|safe/.test(q)) {
    chunks.push(report.risk.reasons.length ? `Main reasons: ${report.risk.reasons.join(" ")}` : "No major risk reasons were detected from the available signals.");
  }

  if (/data|collect|share/.test(q)) {
    chunks.push(`Likely collected: ${report.plainEnglish.dataCollected.slice(0, 3).join(", ")}.`);
    chunks.push(`Likely shared with: ${report.plainEnglish.sharedWith.slice(0, 3).join(", ")}.`);
  }

  if (/oauth|google|microsoft|apple|github|login/.test(q)) {
    chunks.push(report.plainEnglish.oauth);
    if (report.content?.oauth?.purposeMismatch?.detected) {
      chunks.push(`Purpose mismatch: ${report.content.oauth.purposeMismatch.reason}`);
    }
  }

  if (/fingerprint|tracking|tracker/.test(q)) {
    chunks.push(report.plainEnglish.fingerprinting);
  }

  if (analysis?.policy?.privacyLabel) {
    chunks.push(`Policy label: ${analysis.policy.privacyLabel.grade}, with rights that may include ${analysis.policy.privacyLabel.rights.slice(0, 2).join("; ")}.`);
  }

  return chunks.join(" ");
}

function renderEvidenceQA(report, analysis, question) {
  const node = el("evidenceAnswer");
  node.innerHTML = "";

  const p = document.createElement("p");
  p.textContent = answerEvidenceQuestion(report, analysis, question || el("evidenceQuestion").value);
  node.appendChild(p);
}

function renderReceipts(receipts) {
  const node = el("receipts");
  node.innerHTML = "";

  if (!receipts?.length) {
    const li = document.createElement("li");
    li.className = "note";
    li.textContent = "No consent receipts saved yet.";
    node.appendChild(li);
    return;
  }

  receipts.slice(0, 5).forEach((receipt) => {
    const li = document.createElement("li");
    const date = new Date(receipt.acceptedAt).toLocaleString();
    const host = (() => {
      try {
        return new URL(receipt.pageUrl).hostname.replace(/^www\./, "");
      } catch (error) {
        return receipt.pageTitle || "Unknown site";
      }
    })();
    li.textContent = `${host}: ${receipt.actionLabel} on ${date}`;
    node.appendChild(li);
  });
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function scanActiveTab(tabId) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: [
        "src/rules.js",
        "src/scanners/page.js",
        "src/scanners/consent.js",
        "src/scanners/oauth.js",
        "src/scanners/fingerprinting.js",
        "src/ui/consent-warning.js",
        "src/ui/oauth-warning.js",
        "src/content.js"
      ]
    });
    await wait(150);
  } catch (error) {
    // Browser-internal pages and some restricted pages cannot be scanned.
  }
}

async function refresh() {
  const tab = await getActiveTab();
  if (!tab?.id) return;

  el("host").textContent = tab.url || "Current tab";
  await scanActiveTab(tab.id);

  const response = await chrome.runtime.sendMessage({
    type: "CONSENTLENS_GET_REPORT",
    tabId: tab.id
  });

  const report = response.report;
  currentReport = report;
  currentAnalysis = null;
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
  renderGraph(report, null);
  renderPrivacyLabel(report, null);
  renderFingerprinting(report);
  renderDsar(report, null);
  renderEvidenceQA(report, null, el("evidenceQuestion").value);

  const receiptResponse = await chrome.runtime.sendMessage({
    type: "CONSENTLENS_GET_RECEIPTS"
  });
  renderReceipts(receiptResponse.receipts);
  const timelineResponse = await chrome.runtime.sendMessage({
    type: "CONSENTLENS_GET_TIMELINE"
  });
  renderTimeline(timelineResponse.timeline);
  renderPolicyIntelligence(null);
}

el("refresh").addEventListener("click", refresh);
el("openSettings").addEventListener("click", () => chrome.runtime.openOptionsPage());
el("copyDsar").addEventListener("click", copyDsar);
el("askEvidence").addEventListener("click", () => renderEvidenceQA(currentReport, currentAnalysis));
el("evidenceQuestion").addEventListener("input", () => renderEvidenceQA(currentReport, currentAnalysis));
el("analyzePolicy").addEventListener("click", async () => {
  const tab = await getActiveTab();
  if (!tab?.id) return;

  const node = el("policyIntelligence");
  node.innerHTML = "";
  const loading = document.createElement("p");
  loading.className = "note";
  loading.textContent = "Analyzing linked policy with local backend...";
  node.appendChild(loading);

  const response = await chrome.runtime.sendMessage({
    type: "CONSENTLENS_ANALYZE_POLICY",
    tabId: tab.id,
    region: "IN"
  });

  if (!response.ok) {
    renderPolicyIntelligence({ error: `${response.error}. Start the backend with: node backend/server.js` });
    return;
  }

  currentAnalysis = response.analysis;
  renderPolicyIntelligence(response.analysis);
  renderGraph(currentReport, currentAnalysis);
  renderPrivacyLabel(currentReport, currentAnalysis);
  renderFingerprinting(currentReport);
  renderDsar(currentReport, currentAnalysis);
  renderEvidenceQA(currentReport, currentAnalysis);
});
refresh().catch((error) => {
  paragraph("plainEnglish", [`Unable to read this tab: ${error.message}`]);
});

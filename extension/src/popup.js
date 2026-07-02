function el(id) {
  return document.getElementById(id);
}

let currentReport = null;
let currentAnalysis = null;
let currentDomainIntel = [];

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
    const note = document.createElement("p");
    note.className = "note";
    note.textContent = "No OAuth consent flow was visible on this page.";
    node.appendChild(note);
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
    const strong = document.createElement("strong");
    strong.textContent = String(value);
    const span = document.createElement("span");
    span.textContent = label;
    card.append(strong, span);
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
    const host = document.createElement("strong");
    host.textContent = party.host;
    const count = document.createElement("span");
    count.textContent = `${party.count} requests`;
    row.append(host, count);
    li.appendChild(row);

    const intel = resolvePartyIntel(party);
    if (intel.known) {
      const note = document.createElement("p");
      note.className = "note";
      note.textContent = `${intel.company}: ${intel.purpose}${intel.reputation ? ` (${intel.reputation})` : ""}`;
      li.appendChild(note);
    } else if (intel.purpose || intel.category) {
      const note = document.createElement("p");
      note.className = "note";
      note.textContent = `${intel.category || "unknown"}: ${intel.purpose || "Unknown third-party service"}`;
      li.appendChild(note);
    }

    const tags = document.createElement("div");
    const categories = party.categories?.length ? party.categories : [intel.category || "unknown"];
    categories.forEach((category) => tags.appendChild(tag(category)));
    if (!categories.length) {
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

function domainIntelMap() {
  return new Map(currentDomainIntel.map((item) => [item.host, item]));
}

function resolvePartyIntel(party) {
  const fallback = domainIntelMap().get(party.host) || {};
  return {
    host: party.host,
    company: party.company || fallback.company || "Unknown",
    category: party.category || party.categories?.[0] || fallback.category || "unknown",
    risk: party.risk || fallback.risk || "unknown",
    purpose: party.purpose || fallback.purpose || "Unknown third-party service",
    hq: party.hq || fallback.hq || "Unknown",
    reputation: party.reputation || fallback.reputation || "Unknown",
    known: Boolean(party.known || fallback.known)
  };
}

function svgText(svg, x, y, text, className = "flowText") {
  const node = document.createElementNS("http://www.w3.org/2000/svg", "text");
  node.setAttribute("x", x);
  node.setAttribute("y", y);
  node.setAttribute("text-anchor", "middle");
  node.setAttribute("class", className);
  node.textContent = String(text || "").length > 22 ? String(text).slice(0, 20) + "..." : String(text || "");
  svg.appendChild(node);
}

function svgNode(svg, x, y, label, sublabel, color) {
  const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  circle.setAttribute("cx", x);
  circle.setAttribute("cy", y);
  circle.setAttribute("r", 31);
  circle.setAttribute("fill", color);
  circle.setAttribute("class", "flowNode");
  svg.appendChild(circle);
  svgText(svg, x, y - 2, label);
  svgText(svg, x, y + 14, sublabel, "flowSubtext");
}

function svgLine(svg, x1, y1, x2, y2) {
  const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
  line.setAttribute("x1", x1);
  line.setAttribute("y1", y1);
  line.setAttribute("x2", x2);
  line.setAttribute("y2", y2);
  line.setAttribute("class", "flowLine");
  svg.appendChild(line);
}

function renderGraph(report, analysis) {
  const node = el("trackerGraph");
  node.innerHTML = "";
  const thirdParties = (report.thirdParties || []).slice(0, 7);

  if (!thirdParties.length) {
    const p = document.createElement("p");
    p.className = "note";
    p.textContent = "No data flow yet. Refresh the page and load a site with third-party requests.";
    node.appendChild(p);
    return;
  }

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 590 260");
  svg.setAttribute("class", "graphSvg");
  const centerX = 295;
  const centerY = 130;
  svgNode(svg, 82, centerY, "You", "browse", "#eef8f1");
  svgNode(svg, centerX, centerY, report.pageHost || "This site", "site", "#edf6ff");
  svgLine(svg, 113, centerY, centerX - 31, centerY);

  thirdParties.forEach((party, index) => {
    const intel = resolvePartyIntel(party);
    const angle = (-90 + index * (180 / Math.max(1, thirdParties.length - 1))) * Math.PI / 180;
    const x = centerX + Math.cos(angle) * 205;
    const y = centerY + Math.sin(angle) * 92;
    const category = intel.category || "unknown";
    const color = intel.risk === "high" || category === "ads"
      ? "#fdecec"
      : intel.risk === "medium" || category === "analytics"
        ? "#edf6ff"
        : category === "consent"
          ? "#f2edf9"
          : "#f8fafc";
    svgLine(svg, centerX + Math.cos(angle) * 34, centerY + Math.sin(angle) * 34, x - Math.cos(angle) * 34, y - Math.sin(angle) * 34);
    const sublabel = intel.known ? intel.company : `${category} / ${intel.risk}`;
    svgNode(svg, x, y, party.host, sublabel, color);
  });

  node.appendChild(svg);
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

  (policy.riskPoints || []).slice(0, 6).forEach((point) => {
    const p = document.createElement("p");
    p.textContent = point.severity + ": " + point.title + ". Evidence: " + point.evidence;
    node.appendChild(p);
  });

  policy.summary.slice(0, 3).forEach((text) => {
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

function labelItem(title, value, detail) {
  const box = document.createElement("div");
  box.className = "labelItem";
  const strong = document.createElement("strong");
  strong.textContent = value;
  const span = document.createElement("span");
  span.textContent = detail ? title + ": " + detail : title;
  box.append(strong, span);
  return box;
}

function renderPrivacyLabel(report, analysis) {
  const node = el("privacyLabel");
  node.innerHTML = "";
  const policy = analysis?.policy;

  if (policy?.privacyLabel) {
    const label = policy.privacyLabel;
    node.append(
      labelItem("Privacy grade", label.grade, policy.risk.level + " policy risk"),
      labelItem("Data collected", label.collects.length ? label.collects.join(", ") : "No strong signal", "from policy text"),
      labelItem("Shared or sold", label.shares.length ? label.shares.join(", ") : policy.saleOrSharing, "evidence-based"),
      labelItem("Retention", policy.retention?.[0] || label.retention, "policy wording"),
      labelItem("AI training", policy.aiTraining || "No explicit mention detected", "policy wording"),
      labelItem("Rights", label.rights.length ? label.rights.slice(0, 2).join("; ") : "Review region", "plain-language guide")
    );
    return;
  }

  node.append(
    labelItem("Privacy grade", "Pending", "click Analyze"),
    labelItem("Data collected", report.plainEnglish.dataCollected.slice(0, 2).join(", "), "visible page signal"),
    labelItem("Shared with", report.plainEnglish.sharedWith.slice(0, 2).join(", "), "visible page signal"),
    labelItem("Third parties", String(report.thirdParties?.length || 0), "network and page hints"),
    labelItem("AI training", "Unknown", "policy analysis needed"),
    labelItem("Retention", "Unknown", "policy analysis needed")
  );
}

function renderSiteIntelligence(report) {
  const node = el("siteIntelligence");
  node.innerHTML = "";
  const mergedIntel = (report.thirdParties || []).map(resolvePartyIntel);
  const known = mergedIntel.filter((item) => item.known).length;
  const companies = Array.from(new Set(mergedIntel.filter((item) => item.known).map((item) => item.company))).slice(0, 3);
  const companyCounts = new Map();
  mergedIntel.filter((item) => item.known).forEach((item) => {
    companyCounts.set(item.company, (companyCounts.get(item.company) || 0) + 1);
  });
  const categories = new Map();
  (report.thirdParties || []).forEach((party) => (party.categories?.length ? party.categories : ["unknown"]).forEach((category) => categories.set(category, (categories.get(category) || 0) + 1)));
  const topCategory = Array.from(categories.entries()).sort((a, b) => b[1] - a[1])[0];
  const topCompany = Array.from(companyCounts.entries()).sort((a, b) => b[1] - a[1])[0];
  node.append(
    labelItem("Current site", report.pageHost || "Unknown", "active tab"),
    labelItem("Known companies", String(known), companies.length ? companies.join(", ") : "more rules needed"),
    labelItem("Dominant purpose", topCategory ? topCategory[0] : "unknown", topCategory ? topCategory[1] + " domains" : "no category yet"),
    labelItem("Top company", topCompany ? topCompany[0] : "unknown", topCompany ? `${topCompany[1]} domains in the current flow` : "waiting on richer rules"),
    labelItem("Recommended action", report.risk.level === "High" ? "Review before accepting" : "Keep monitoring", report.risk.level + " risk")
  );
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
    const headline = `${item.pageHost || "Unknown site"}: ${item.level} (${item.score}/100), ${item.thirdParties} third-party domains, ${item.fingerprinting ? "fingerprinting signaled" : "no fingerprinting signaled"} on ${when}`;
    li.textContent = headline;
    if (Array.isArray(item.topTrackers) && item.topTrackers.length) {
      const detail = document.createElement("p");
      detail.className = "note";
      detail.textContent = `Top trackers: ${item.topTrackers.slice(0, 3).map((tracker) => `${tracker.company} (${tracker.category}, ${tracker.count})`).join("; ")}`;
      li.appendChild(detail);
    }
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
    try {
      await chrome.tabs.sendMessage(tabId, { type: "CONSENTLENS_SCAN_NOW" });
    } catch (messageError) {
      // Ignore pages that do not have the content script ready yet.
    }
  } catch (error) {
    // Browser-internal pages and some restricted pages cannot be scanned.
  }
}

async function waitForFreshReport(tabId, previousUpdatedAt, timeoutMs = 2500) {
  const startedAt = Date.now();
  let latest = null;
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await chrome.runtime.sendMessage({
        type: "CONSENTLENS_GET_REPORT",
        tabId
      });
      latest = response?.report || latest;
      if (latest?.updatedAt && latest.updatedAt > previousUpdatedAt) {
        return latest;
      }
    } catch (error) {
      // Keep polling until timeout.
    }
    await wait(120);
  }

  return latest;
}

async function refresh() {
  const tab = await getActiveTab();
  if (!tab?.id) return;

  el("host").textContent = tab.url || "Current tab";
  const previousUpdatedAt = currentReport?.updatedAt || 0;
  await scanActiveTab(tab.id);
  const report = await waitForFreshReport(tab.id, previousUpdatedAt);
  if (!report) {
    paragraph("plainEnglish", ["Unable to read this tab yet. Try refreshing once more after the page finishes loading."]);
    return;
  }
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
  try {
    const domainResponse = await chrome.runtime.sendMessage({
      type: "CONSENTLENS_GET_DOMAIN_INTEL",
      tabId: tab.id
    });
    currentDomainIntel = domainResponse.ok ? domainResponse.domains || [] : [];
  } catch (error) {
    currentDomainIntel = [];
  }

  renderOAuth(report.content?.oauth);
  renderStats(report.risk);
  renderThirdParties(report.thirdParties);
  renderLinks(report.content?.policyLinks);
  renderGraph(report, null);
  renderPrivacyLabel(report, null);
  renderSiteIntelligence(report);
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
el("analyzeNutrition").addEventListener("click", () => el("analyzePolicy").click());
["Why is this risky?", "What data is collected?", "Who gets access?", "Can I request deletion?"].forEach((question) => {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = question;
  button.addEventListener("click", () => {
    el("evidenceQuestion").value = question;
    renderEvidenceQA(currentReport, currentAnalysis, question);
  });
  el("faqBar")?.appendChild(button);
});

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
  currentDomainIntel = response.analysis.domainIntel || currentDomainIntel;
  renderPolicyIntelligence(response.analysis);
  renderGraph(currentReport, currentAnalysis);
  renderPrivacyLabel(currentReport, currentAnalysis);
  renderSiteIntelligence(currentReport);
  renderFingerprinting(currentReport);
  renderDsar(currentReport, currentAnalysis);
  renderEvidenceQA(currentReport, currentAnalysis);
});
refresh().catch((error) => {
  paragraph("plainEnglish", [`Unable to read this tab: ${error.message}`]);
});

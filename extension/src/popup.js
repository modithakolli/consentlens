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

function stripWording(text) {
  return String(text || "")
    .replace(/\s+/g, " ")
    .trim();
}

function displayHost(value) {
  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch (error) {
    return stripWording(value) || "Current tab";
  }
}

function friendlyReason(reason) {
  const text = stripWording(reason);
  if (!text) return "Something worth a second look";
  if (/cookie banner/i.test(text) && /reject|accept/i.test(text)) return "Cookie choices favor Accept";
  if (/third-party partners?/i.test(text) || /third-party domains?/i.test(text)) return "Outside companies are involved";
  if (/fingerprinting|device identification/i.test(text)) return "Possible device fingerprinting";
  if (/oauth/i.test(text) && /scope|access/i.test(text)) return "Account access requested";
  if (/advertising, sale, sharing, or resale/i.test(text) || /sharing.*advertisers?/i.test(text)) return "Sharing or sale risk";
  if (/ai|model training|automated decisions?/i.test(text)) return "AI or automated processing";
  if (/data collection/i.test(text)) return "Broad data collection";
  if (/retention/i.test(text)) return "Retention is unclear";
  return text.length > 38 ? `${text.slice(0, 35)}...` : text;
}

function friendlyCategory(category) {
  const value = String(category || "unknown");
  if (value === "analytics") return "Analytics";
  if (value === "ads") return "Advertising";
  if (value === "identity") return "Sign-in / identity";
  if (value === "consent") return "Consent tools";
  if (value === "support") return "Support tools";
  if (value === "risk") return "Risk / fingerprinting";
  return value === "unknown" ? "Unknown" : value.charAt(0).toUpperCase() + value.slice(1);
}

function renderChips(target, values, className = "chipButton") {
  const node = el(target);
  node.innerHTML = "";
  const items = values?.length ? values : ["None"];
  items.slice(0, 4).forEach((value) => {
    const chip = document.createElement("span");
    chip.className = className;
    chip.textContent = value;
    node.appendChild(chip);
  });
}

function confidenceSummary(report, analysis) {
  if (analysis?.source === "local") {
    return {
      label: "Medium",
      detail: "Policy summary came from the current page because the backend was unavailable."
    };
  }

  if (analysis?.policy) {
    return {
      label: "High",
      detail: "Network requests, page text, and the linked policy were analyzed."
    };
  }

  if ((report?.thirdParties || []).length || report?.content?.policyLinks?.length) {
    return {
      label: "Medium",
      detail: "Network traffic and visible page signals were analyzed."
    };
  }

  return {
    label: "Low",
    detail: "Only a limited scan was possible from the current page."
  };
}

function buildDecisionSummary(report, analysis) {
  const score = report?.risk?.score ?? 0;
  const level = String(report?.risk?.level || "Low");
  const hasOAuth = Boolean(report?.content?.oauth?.hasOAuthProvider || report?.content?.oauth?.scopes?.length);
  const fingerprinting = Boolean(report?.content?.fingerprinting?.detected);
  const serviceCount = Array.isArray(report?.thirdParties) ? report.thirdParties.length : 0;
  const policy = analysis?.policy || null;
  const reasons = Array.isArray(report?.risk?.reasons) ? report.risk.reasons : [];

  let verdict = "Probably okay";
  let text = "I did not see strong warning signs in the current scan.";

  if (level === "High" || score >= 65) {
    verdict = "Yes, pause and review";
    text = "This page uses enough tracking or access requests that I would slow down before accepting.";
  } else if (level === "Medium" || score >= 30) {
    verdict = "Use caution";
    text = "Nothing looks catastrophic, but there are a few tracking or sharing signals worth a closer look.";
  }

  if (hasOAuth) {
    text = report?.content?.oauth?.purposeMismatch?.detected
      ? "It asks for account access, and the request may be broader than the app's purpose."
      : "It asks to connect an account, so review the permissions before continuing.";
  } else if (!fingerprinting) {
    text = `${text} Good news: it did not ask for your Google, Microsoft, or GitHub account.`;
  }

  if (fingerprinting) {
    text = `${text} We also saw signs of device identification.`;
  }

  if (policy?.privacyLabel?.retention && !/not stated/i.test(policy.privacyLabel.retention)) {
    text = `${text} The policy suggests data may be kept for ${policy.privacyLabel.retention}.`;
  }

  if (serviceCount && !/outside service|outside companies/i.test(text)) {
    text = `${text} This site uses ${serviceCount} outside service${serviceCount === 1 ? "" : "s"}.`;
  }

  const risks = [];
  reasons.map(friendlyReason).forEach((reason) => {
    if (!risks.includes(reason)) risks.push(reason);
  });
  if ((report?.thirdParties || []).length) {
    risks.unshift(`${report.thirdParties.length} outside services`);
  }
  if (hasOAuth) {
    risks.push("Account access requested");
  }
  if (fingerprinting) {
    risks.push("Possible device fingerprinting");
  }
  if (policy?.privacyLabel?.shares?.length) {
    risks.push("Sharing mentioned in policy");
  }

  const actions = level === "High"
    ? ["Review cookie settings", "Read the policy", "Pause before signing in"]
    : level === "Medium"
      ? ["Skim the policy", "Check sharing controls", "Continue if comfortable"]
      : ["Looks okay", "Open the policy if curious", "Keep an eye on it"];

  return {
    verdict,
    text,
    risks: risks.slice(0, 4),
    actions: actions.slice(0, 3)
  };
}

function renderDecisionSummary(report, analysis) {
  const node = el("decisionSummary");
  if (!node || !report) return;
  node.classList.remove("low", "medium", "high");
  node.classList.add(String(report.risk?.level || "low").toLowerCase());

  const summary = buildDecisionSummary(report, analysis);
  el("decisionVerdict").textContent = summary.verdict;
  el("decisionText").textContent = summary.text;
  renderChips("decisionRisks", summary.risks);
  renderChips("decisionActions", summary.actions);
}

function buildPlainEnglishLines(report, analysis) {
  if (!report) {
    return ["Refresh the page to build a readable summary."];
  }

  const lines = [];
  const thirdParties = Array.isArray(report.thirdParties) ? report.thirdParties.length : 0;
  const categoryCounts = new Map();
  (report.thirdParties || []).forEach((party) => {
    const categories = party.categories?.length ? party.categories : ["unknown"];
    categories.forEach((category) => {
      categoryCounts.set(category, (categoryCounts.get(category) || 0) + 1);
    });
  });

  if (thirdParties) {
    const groups = [];
    const analytics = categoryCounts.get("analytics");
    const ads = categoryCounts.get("ads");
    const identity = categoryCounts.get("identity");
    const consent = categoryCounts.get("consent");
    if (analytics) groups.push(`${analytics} analytics service${analytics > 1 ? "s" : ""}`);
    if (ads) groups.push(`${ads} advertising service${ads > 1 ? "s" : ""}`);
    if (identity) groups.push(`${identity} sign-in service${identity > 1 ? "s" : ""}`);
    if (consent) groups.push(`${consent} consent tool${consent > 1 ? "s" : ""}`);
    lines.push(
      groups.length
        ? `Your browser contacted ${thirdParties} outside companies while loading this page. Some help with ${groups.join(", ")}.`
        : `Your browser contacted ${thirdParties} outside companies while loading this page.`
    );
  } else {
    lines.push("We did not see outside companies on this scan.");
  }

  if (report.risk?.reasons?.some((reason) => /cookie banner/i.test(reason))) {
    lines.push("The cookie prompt looks a bit one-sided, with Accept easier to find than Reject.");
  }

  if (report.content?.oauth?.hasOAuthProvider || report.content?.oauth?.scopes?.length) {
    lines.push(
      report.content?.oauth?.purposeMismatch?.detected
        ? "It asks for account access, and the request may be broader than the app's purpose."
        : "It asks for account access, so review the permissions before continuing."
    );
  } else {
    lines.push("Good news: it did not ask for your Google, Microsoft, or GitHub account.");
  }

  if (report.content?.fingerprinting?.detected) {
    lines.push("We saw signs of device identification without cookies.");
  } else {
    lines.push("We did not detect advanced tracking like browser fingerprinting.");
  }

  if (analysis?.policy?.privacyLabel?.retention && !/not stated/i.test(analysis.policy.privacyLabel.retention)) {
    lines.push(`The policy suggests data may be kept for ${analysis.policy.privacyLabel.retention}.`);
  } else if (analysis?.policy?.privacyLabel) {
    lines.push("The policy still leaves some questions open, like retention.");
  }

  return lines.slice(0, 4);
}

function renderPlainEnglish(report, analysis) {
  paragraph("plainEnglish", buildPlainEnglishLines(report, analysis));
}

function renderOAuth(oauth) {
  const node = el("oauth");
  node.innerHTML = "";

  if (!oauth?.hasOAuthProvider && !oauth?.buttons?.length && !oauth?.scopes?.length) {
    const note = document.createElement("p");
    note.className = "note";
    note.textContent = "Good news: this page did not ask to access your Google, Microsoft, or GitHub account.";
    node.appendChild(note);
    return;
  }

  if (oauth.provider || oauth.appName) {
    const p = document.createElement("p");
    p.textContent = `We saw a ${oauth.provider || "sign-in"} request${oauth.appName ? ` for ${oauth.appName}` : ""}. Access level: ${oauth.accessLevel || "Unknown"}.`;
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
    const note = document.createElement("p");
    note.className = "note";
    note.textContent = `${intel.company}: ${intel.purpose}${intel.reputation && intel.known ? ` (${intel.reputation})` : ""}`;
    li.appendChild(note);
    const evidence = document.createElement("p");
    evidence.className = "note";
    evidence.textContent = intel.evidence;
    li.appendChild(evidence);

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

function renderLinks(links, inferredLinks = []) {
  const node = el("policyLinks");
  node.innerHTML = "";

  const explicit = Array.isArray(links) ? links : [];
  const inferred = Array.isArray(inferredLinks) ? inferredLinks : [];

  if (!explicit.length && !inferred.length) {
    const li = document.createElement("li");
    li.className = "note";
    li.textContent = "We couldn't find a privacy policy linked from this page. It may be tucked away elsewhere on the site.";
    node.appendChild(li);
    return;
  }

  if (!explicit.length && inferred.length) {
    const li = document.createElement("li");
    li.className = "note";
    li.textContent = "No explicit policy link was visible, so I tried a few likely policy pages for this site.";
    node.appendChild(li);
  }

  [...explicit, ...inferred].slice(0, 8).forEach((link) => {
    const li = document.createElement("li");
    const a = document.createElement("a");
    a.href = link.href;
    a.target = "_blank";
    a.rel = "noreferrer";
    a.textContent = link.text || link.href;
    li.appendChild(a);
    if (link.inferred) {
      const note = document.createElement("p");
      note.className = "note";
      note.textContent = "Likely policy page";
      li.appendChild(note);
    }
    node.appendChild(li);
  });
}

function domainIntelMap() {
  return new Map(currentDomainIntel.map((item) => [item.host, item]));
}

function resolvePartyIntel(party) {
  const fallback = domainIntelMap().get(party.host) || {};
  const company = party.company || fallback.company || "Unidentified service";
  const known = Boolean(party.known || fallback.known);
  const observed = Boolean(party.observed || fallback.observed);
  const inferred = Boolean((party.category || party.categories?.length || party.purpose) && !known && !observed);
  return {
    host: party.host,
    company,
    category: party.category || party.categories?.[0] || fallback.category || "unknown",
    risk: party.risk || fallback.risk || "unknown",
    purpose: party.purpose || fallback.purpose || "Unknown third-party service",
    hq: party.hq || fallback.hq || "Unknown",
    reputation: party.reputation || fallback.reputation || "Unknown",
    known,
    observed,
    evidence: known
      ? "Known company mapping"
      : observed
        ? "Observed on this device"
        : inferred
          ? "Inferred from the current scan"
          : "Not yet mapped"
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
    const sublabel = intel.known ? intel.company : intel.observed ? `Observed / ${category}` : `${category} / ${intel.risk}`;
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
    p.textContent = "Use Analyze policy to fetch the linked policy, summarize key clauses, and show relevant privacy rights.";
    node.appendChild(p);
    return;
  }

  const confidence = confidenceSummary(currentReport, analysis);
  const source = analysis.source === "local" ? "Local estimate from the current page" : "Backend policy analysis";

  const sourceLine = document.createElement("p");
  sourceLine.className = "note";
  sourceLine.textContent = `Source: ${source}`;
  node.appendChild(sourceLine);

  const confidenceLine = document.createElement("p");
  confidenceLine.className = "note";
  confidenceLine.textContent = `Confidence: ${confidence.label}. ${confidence.detail}`;
  node.appendChild(confidenceLine);

  if (analysis.source === "local") {
    const note = document.createElement("p");
    note.className = "note";
    note.textContent = analysis.notice || "Backend unavailable, so this summary is built from the current page only.";
    node.appendChild(note);
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
    label.textContent = `Privacy grade${analysis.source === "local" ? " (local estimate)" : ""}: ${policy.privacyLabel.grade}. Collects: ${policy.privacyLabel.collects.length ? policy.privacyLabel.collects.join(", ") : "none detected"}. Shares: ${policy.privacyLabel.shares.length ? policy.privacyLabel.shares.join(", ") : "none detected"}. Retention: ${policy.privacyLabel.retention}.`;
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

function localDataCollectedSummary(report) {
  const items = new Set();
  if (report?.content?.oauth?.hasOAuthProvider || report?.content?.oauth?.scopes?.length) items.add("account access");
  if (report?.content?.fingerprinting?.detected) items.add("device or browser identifiers");
  if (report?.risk?.reasons?.some((reason) => /cookie banner/i.test(reason))) items.add("cookie and consent preferences");
  if ((report?.thirdParties || []).length) items.add("browsing activity and page interactions");
  if (report?.content?.policySignals?.dataCollected?.length) {
    report.content.policySignals.dataCollected.forEach((item) => items.add(item.label));
  }
  return Array.from(items);
}

function localSharedWithSummary(report) {
  const items = new Set();
  const categories = new Set((report?.thirdParties || []).flatMap((party) => party.categories || []));
  if (categories.has("analytics")) items.add("analytics vendors");
  if (categories.has("ads")) items.add("advertising partners");
  if (categories.has("identity")) items.add("sign-in services");
  if (categories.has("consent")) items.add("cookie consent tools");
  if (categories.has("support")) items.add("support providers");
  if ((report?.thirdParties || []).length) items.add("service providers");
  if (report?.content?.policySignals?.sharing?.length) {
    report.content.policySignals.sharing.forEach((item) => items.add(item.label));
  }
  return Array.from(items);
}

function renderPrivacyLabel(report, analysis) {
  const node = el("privacyLabel");
  node.innerHTML = "";
  const policy = analysis?.policy;
  const confidence = confidenceSummary(report, analysis);

  if (policy?.privacyLabel) {
    const label = policy.privacyLabel;
    const dataCollected = analysis.source === "local"
      ? localDataCollectedSummary(report).join(", ") || "Not visible from the current page"
      : (label.collects.length ? label.collects.join(", ") : "none detected");
    const shared = analysis.source === "local"
      ? localSharedWithSummary(report).join(", ") || "Not visible from the current page"
      : (label.shares.length ? label.shares.join(", ") : policy.saleOrSharing);
    node.append(
      labelItem("Privacy grade", label.grade, policy.risk.level + " policy risk"),
      labelItem("Confidence", confidence.label, confidence.detail),
      labelItem("Data collected", dataCollected, analysis.source === "local" ? "page-level estimate" : "from policy text"),
      labelItem("Shared or sold", shared, analysis.source === "local" ? "page-level estimate" : "evidence-based"),
      labelItem("Retention", policy.retention?.[0] || label.retention, "policy wording"),
      labelItem("AI training", policy.aiTraining || "No explicit mention detected", "policy wording"),
      labelItem("Rights", label.rights.length ? label.rights.slice(0, 2).join("; ") : "Review region", "plain-language guide")
    );
    return;
  }

  node.append(
    labelItem("Privacy grade", "Pending", "click Build label"),
    labelItem("Confidence", confidence.label, confidence.detail),
    labelItem("Data collected", "Open the policy to confirm", "from the page"),
    labelItem("Shared with", "Open the policy to confirm", "from the page"),
    labelItem("Third parties", String(report.thirdParties?.length || 0), "network and page hints"),
    labelItem("AI training", "Unknown", "needs policy analysis"),
    labelItem("Retention", "Unknown", "needs policy analysis")
  );
}

function renderSiteIntelligence(report) {
  const node = el("siteIntelligence");
  node.innerHTML = "";
  const mergedIntel = (report.thirdParties || []).map(resolvePartyIntel);
  const companyList = Array.from(new Set(
    mergedIntel
      .filter((item) => item.company && item.company !== "Unidentified service")
      .map((item) => item.company)
  )).slice(0, 4);
  const known = mergedIntel.filter((item) => item.known).length;
  const inferred = mergedIntel.filter((item) => !item.known && item.evidence === "Inferred from the current scan").length;
  const companyCounts = new Map();
  mergedIntel.filter((item) => item.known).forEach((item) => {
    companyCounts.set(item.company, (companyCounts.get(item.company) || 0) + 1);
  });
  const categories = new Map();
  (report.thirdParties || []).forEach((party) => (party.categories?.length ? party.categories : ["unknown"]).forEach((category) => categories.set(category, (categories.get(category) || 0) + 1)));
  const topCategory = Array.from(categories.entries()).sort((a, b) => b[1] - a[1])[0];
  const topCompany = Array.from(companyCounts.entries()).sort((a, b) => b[1] - a[1])[0];
  node.append(
    labelItem("Website", report.pageHost || "Unknown", "active tab"),
    labelItem("Companies involved", companyList.length ? companyList.join(", ") : "No company match yet", known ? `${known} known mappings` : inferred ? `${inferred} inferred` : "Needs a richer database"),
    labelItem("Main service type", topCategory ? friendlyCategory(topCategory[0]) : "Unknown", topCategory ? `${topCategory[1]} domain${topCategory[1] === 1 ? "" : "s"} seen` : "No category yet"),
    labelItem("Top company", topCompany ? topCompany[0] : "Unidentified service", topCompany ? `${topCompany[1]} mapped domain${topCompany[1] === 1 ? "" : "s"}` : "No strong company match yet"),
    labelItem("Recommended action", report.risk.level === "High" ? "Review before accepting" : "Keep monitoring", report.risk.level === "High" ? "High risk" : `${report.risk.level} risk`)
  );
}

function renderRiskBreakdown(report, analysis) {
  const node = el("riskBreakdown");
  if (!node) return;
  node.innerHTML = "";

  if (!report) {
    const p = document.createElement("p");
    p.className = "note";
    p.textContent = "Refresh the page first to see the breakdown.";
    node.appendChild(p);
    return;
  }

  const policy = analysis?.policy || null;
  const hasOAuth = Boolean(report.content?.oauth?.hasOAuthProvider || report.content?.oauth?.scopes?.length);
  const hasFingerprinting = Boolean(report.content?.fingerprinting?.detected);
  const cookieIssues = Boolean(report.risk?.reasons?.some((reason) => /cookie banner/i.test(reason)));
  const sharingIssues = Boolean(policy?.privacyLabel?.shares?.length || report.content?.policySignals?.sharing?.length);
  const behaviorSignals = report.thirdParties?.filter((party) => ["analytics", "ads", "identity", "risk"].some((category) => party.categories?.includes(category))).length || 0;

  const items = [
    { label: "Outside services", value: Math.min(100, (report.thirdParties?.length || 0) * 12), detail: `${report.thirdParties?.length || 0} domains`, tone: report.thirdParties?.length ? (report.thirdParties.length > 4 ? "medium" : "low") : "low" },
    { label: "Tracking services", value: Math.min(100, behaviorSignals * 18), detail: `${behaviorSignals} likely trackers`, tone: behaviorSignals > 3 ? "high" : behaviorSignals > 1 ? "medium" : "low" },
    { label: "Cookie choices", value: cookieIssues ? 70 : 10, detail: cookieIssues ? "Accept looks easier than Reject" : "No obvious imbalance", tone: cookieIssues ? "medium" : "low" },
    { label: "Account access", value: hasOAuth ? 75 : 0, detail: hasOAuth ? "Sign-in scopes are visible" : "No OAuth request", tone: hasOAuth ? "medium" : "low" },
    { label: "Fingerprinting", value: hasFingerprinting ? (report.content?.fingerprinting?.riskLevel === "High" ? 85 : 60) : 0, detail: hasFingerprinting ? "Device identification possible" : "No obvious signals", tone: hasFingerprinting ? "high" : "low" },
    { label: "Policy sharing", value: sharingIssues ? 60 : 0, detail: sharingIssues ? "Sharing language is present" : "No strong sharing language", tone: sharingIssues ? "medium" : "low" }
  ];

  items.forEach((item) => {
    const row = document.createElement("div");
    row.className = "riskBar";

    const top = document.createElement("div");
    top.className = "riskBarTop";
    const label = document.createElement("span");
    label.className = "riskBarLabel";
    label.textContent = item.label;
    const value = document.createElement("span");
    value.className = "riskBarValue";
    value.textContent = `${item.detail} · ${item.value}/100`;
    top.append(label, value);

    const track = document.createElement("div");
    track.className = "riskBarTrack";
    const fill = document.createElement("div");
    fill.className = `riskBarFill ${item.tone}`;
    fill.style.width = `${item.value}%`;
    track.appendChild(fill);

    row.append(top, track);
    node.appendChild(row);
  });
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

  const answer = answerEvidenceQuestion(report, analysis, question || el("evidenceQuestion").value);
  const card = document.createElement("div");
  card.className = "qaCard";

  const heading = document.createElement("p");
  heading.className = "qaLabel";
  heading.textContent = "Answer";

  const asked = document.createElement("p");
  asked.className = "qaQuestion";
  asked.textContent = `Question: ${question || el("evidenceQuestion").value || "Ask anything about the page"}`;

  const p = document.createElement("p");
  p.className = "qaAnswer";
  p.textContent = answer;

  card.append(heading, asked, p);
  node.appendChild(card);
  node.scrollIntoView?.({ behavior: "smooth", block: "nearest" });
}

async function askEvidence(question) {
  const query = String(question || el("evidenceQuestion").value || "").trim();
  if (!query) {
    return;
  }

  const panel = el("evidencePanel");
  if (panel) {
  panel.open = true;
  }

  renderEvidenceQA(currentReport, currentAnalysis, query);
  el("evidenceAnswer")?.scrollIntoView?.({ behavior: "smooth", block: "start" });
  const answer = answerEvidenceQuestion(currentReport, currentAnalysis, query);
  try {
    await chrome.runtime.sendMessage({
      type: "CONSENTLENS_STORE_QA",
      entry: {
        question: query,
        answer,
        pageUrl: currentReport?.pageUrl || "",
        pageHost: currentReport?.pageHost || "",
        savedAt: Date.now()
      }
    });
  } catch (error) {
    // Local history is best effort.
  }
  await loadMemory();
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

function renderMemory(memory) {
  const summary = el("memorySummary");
  const feed = el("memoryFeed");
  summary.innerHTML = "";
  feed.innerHTML = "";

  const hasCounts = Boolean(memory && Object.values(memory.counts || {}).some((value) => Number(value) > 0));
  const hasItems = Boolean(memory?.items?.length);

  if (!memory) {
    const li = document.createElement("li");
    li.className = "note";
    li.textContent = "No saved intelligence yet.";
    feed.appendChild(li);
    return;
  }

  const counts = memory.counts || {};
  if (hasCounts) {
    summary.append(
      labelItem("Site scans", String(counts.timeline || 0), "recent site activity"),
      labelItem("Policy snapshots", String(counts.policies || 0), "stored policy notes"),
      labelItem("Consent receipts", String(counts.receipts || 0), "accepted or reviewed flows"),
      labelItem("Q&A answers", String(counts.qa || 0), "answers saved locally"),
      labelItem("Tracker archive", String(counts.trackers || 0), "observed domains remembered")
    );
  }

  if (!hasItems) {
    const li = document.createElement("li");
    li.className = "note";
    li.textContent = "No saved intelligence yet.";
    feed.appendChild(li);
    return;
  }

  memory.items.slice(0, 8).forEach((item) => {
    const li = document.createElement("li");
    const date = item.when ? new Date(item.when).toLocaleString() : "just now";
    const title = document.createElement("strong");
    title.textContent = item.title;
    const detail = document.createElement("span");
    detail.textContent = `${item.detail} - ${date}`;
    li.append(title, document.createElement("br"), detail);
    feed.appendChild(li);
  });
}

function buildLocalPolicyAnalysis(report, region = "IN") {
  if (!report) {
    return {
      source: "local",
      policy: null,
      domainIntel: [],
      changeRecord: null,
      error: "Load a page first, then try Analyze policy again."
    };
  }

  const score = report.risk?.score || 0;
  const grade = score >= 75 ? "C" : score >= 45 ? "B" : "A";
  const collected = (report.content?.policySignals?.dataCollected || []).map((item) => item.label);
  const shared = (report.content?.policySignals?.sharing || []).map((item) => item.label);
  const collectedFallback = collected.length ? collected : localDataCollectedSummary(report);
  const sharedFallback = shared.length ? shared : localSharedWithSummary(report);
  const risks = (report.risk?.reasons || []).slice(0, 5).map((reason) => ({
    severity: "Note",
    title: reason,
    evidence: reason
  }));

  return {
    source: "local",
    policy: {
      policyUrl: null,
      pageUrl: report.pageUrl || "",
      pageTitle: report.content?.pageTitle || "",
      risk: report.risk || { score: 0, level: "Low" },
      privacyLabel: {
        grade,
        collects: collectedFallback.length ? collectedFallback : ["Not visible from the current page"],
        shares: sharedFallback.length ? sharedFallback : ["Not visible from the current page"],
        retention: "Not stated on the visible page",
        rights: [
          `${region}: request access to your personal data.`,
          `${region}: ask to delete or export your data.`,
          `${region}: review or withdraw optional consent where available.`
        ]
      },
      riskPoints: risks,
      summary: [
        "Local estimate based on the current page and tracker signals.",
        report.plainEnglish?.trackers || "Tracker details are visible in the scan.",
        report.plainEnglish?.oauth || "OAuth details are visible in the scan."
      ],
      legal: {
        region,
        law: "Local privacy guidance",
        rights: [
          `${region}: ask for access to your data.`,
          `${region}: ask for deletion or export where applicable.`
        ]
      },
      aiTraining: "Unknown from visible page text",
      saleOrSharing: shared.length ? shared.join(", ") : "Not visible from the current page",
      retention: "Not stated on the visible page"
    },
    domainIntel: currentDomainIntel,
    changeRecord: null,
    error: ""
  };
}

function renderCurrentMemory(memory) {
  renderMemory(memory);
}

async function loadMemory() {
  try {
    const response = await chrome.runtime.sendMessage({ type: "CONSENTLENS_GET_MEMORY" });
    renderCurrentMemory(response.ok ? response.memory : null);
  } catch (error) {
    renderCurrentMemory(null);
  }
}

function setRefreshBusy(isBusy) {
  const button = el("refresh");
  if (!button) return;
  button.disabled = Boolean(isBusy);
  button.textContent = isBusy ? "Refreshing..." : "Refresh";
}

function setSimpleView() {
  document.body.classList.remove("expandedView");
  ["advancedPanel", "evidencePanel", "dataRightsSection"].forEach((id) => {
    const node = el(id);
    if (node) node.open = false;
  });
}

function revealSection(sectionId, detailsId = "advancedPanel") {
  document.body.classList.add("expandedView");
  const details = el(detailsId);
  if (details) details.open = true;
  const target = el(sectionId);
  if (target?.scrollIntoView) {
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  }
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

  setRefreshBusy(true);
  try {
    setSimpleView();
    el("host").textContent = displayHost(tab.url || "Current tab");
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

    renderPlainEnglish(report, null);
    renderDecisionSummary(report, null);
    list("dataCollected", report.plainEnglish.dataCollected, "No clear data collection signal found.");
    list("sharedWith", report.plainEnglish.sharedWith, "No clear sharing signal found.");
    currentDomainIntel = [];

    renderOAuth(report.content?.oauth);
    renderStats(report.risk);
    renderThirdParties(report.thirdParties);
    renderLinks(report.content?.policyLinks, report.content?.inferredPolicyLinks);
    renderGraph(report, null);
    renderPrivacyLabel(report, null);
    renderSiteIntelligence(report);
    renderRiskBreakdown(report, null);
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
    await loadMemory();
  } finally {
    setRefreshBusy(false);
  }
}

el("refresh").addEventListener("click", refresh);
el("openSettings").addEventListener("click", () => chrome.runtime.openOptionsPage());
el("copyDsar").addEventListener("click", copyDsar);
el("askEvidence").addEventListener("click", () => askEvidence(el("evidenceQuestion").value));
el("evidenceQuestion").addEventListener("input", () => renderEvidenceQA(currentReport, currentAnalysis));
el("analyzeNutrition").addEventListener("click", () => {
  revealSection("privacyLabelSection");
  el("analyzePolicy").click();
});
el("viewDetails").addEventListener("click", () => revealSection("privacyLabelSection"));
el("whyRisk").addEventListener("click", () => revealSection("policySection"));
el("whatCanIDo").addEventListener("click", () => revealSection("dataRightsSection"));
["Why is this risky?", "What data is collected?", "Who gets access?", "Can I request deletion?"].forEach((question) => {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = question;
  button.addEventListener("click", () => {
    el("evidenceQuestion").value = question;
    askEvidence(question);
  });
  el("faqBar")?.appendChild(button);
});

el("analyzePolicy").addEventListener("click", async () => {
  const tab = await getActiveTab();
  if (!tab?.id) return;

  document.body.classList.add("expandedView");
  el("advancedPanel") && (el("advancedPanel").open = true);
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
    const fallback = buildLocalPolicyAnalysis(currentReport, "IN");
    fallback.notice = `Showing a local summary instead because the backend is unavailable.`;
    currentAnalysis = fallback;
    renderPlainEnglish(currentReport, currentAnalysis);
    renderDecisionSummary(currentReport, currentAnalysis);
    renderPolicyIntelligence(fallback);
    renderGraph(currentReport, currentAnalysis);
    renderPrivacyLabel(currentReport, currentAnalysis);
    renderSiteIntelligence(currentReport);
    renderRiskBreakdown(currentReport, currentAnalysis);
    renderFingerprinting(currentReport);
    renderDsar(currentReport, currentAnalysis);
    renderEvidenceQA(currentReport, currentAnalysis);
    await loadMemory();
    return;
  }

    currentAnalysis = response.analysis;
    currentDomainIntel = response.analysis.domainIntel || currentDomainIntel;
  renderPlainEnglish(currentReport, currentAnalysis);
  renderDecisionSummary(currentReport, currentAnalysis);
  renderPolicyIntelligence(response.analysis);
  renderGraph(currentReport, currentAnalysis);
  renderPrivacyLabel(currentReport, currentAnalysis);
  renderSiteIntelligence(currentReport);
  renderRiskBreakdown(currentReport, currentAnalysis);
  renderFingerprinting(currentReport);
  renderDsar(currentReport, currentAnalysis);
  renderEvidenceQA(currentReport, currentAnalysis);
  await loadMemory();
});
el("advancedPanel")?.addEventListener("toggle", (event) => {
  document.body.classList.toggle("expandedView", Boolean(event.currentTarget.open));
});
refresh().catch((error) => {
  paragraph("plainEnglish", [`Unable to read this tab: ${error.message}`]);
});
loadMemory().catch(() => {});

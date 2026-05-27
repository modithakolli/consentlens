function el(id) {
  return document.getElementById(id);
}

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
        "src/ui/consent-warning.js",
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
}

el("refresh").addEventListener("click", refresh);
refresh().catch((error) => {
  paragraph("plainEnglish", [`Unable to read this tab: ${error.message}`]);
});

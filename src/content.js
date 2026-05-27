(function scanConsentSurface() {
  if (window.__consentLensScanNow) {
    window.__consentLensScanNow();
    return;
  }

  const rules = window.ConsentLensRules;
  let bypassConsentWarning = false;

  function pageText() {
    return (document.body?.innerText || "").replace(/\s+/g, " ").trim().slice(0, 120000);
  }

  function nodeText(node) {
    return (node?.innerText || node?.textContent || "").replace(/\s+/g, " ").trim();
  }

  function findMatchingSignals(text, patterns) {
    const lower = text.toLowerCase();
    return patterns
      .map((pattern) => {
        const matchedTerms = pattern.terms.filter((term) => lower.includes(term));
        return matchedTerms.length ? { ...pattern, matchedTerms } : null;
      })
      .filter(Boolean);
  }

  function findPolicyLinks() {
    return Array.from(document.querySelectorAll("a[href]"))
      .map((link) => ({
        text: (link.innerText || link.getAttribute("aria-label") || "").trim(),
        href: link.href
      }))
      .filter((link) => /privacy|cookie policy|cookies policy|terms of use|terms and conditions|legal|do not sell|data protection|personal data protection|privacy statement/i.test(link.text + " " + link.href))
      .slice(0, 20);
  }

  function findConsentText() {
    const candidates = Array.from(document.querySelectorAll(
      "[id*='cookie' i], [class*='cookie' i], [id*='consent' i], [class*='consent' i], [id*='onetrust' i], [class*='onetrust' i], [role='dialog'], dialog"
    ));

    const consentCandidates = candidates
      .map(nodeText)
      .filter((text) => /cookie|consent|privacy|accept all|manage settings|manage choices|reject all|third-party|third party/i.test(text))
      .sort((a, b) => b.length - a.length);

    return (consentCandidates[0] || "").slice(0, 12000);
  }

  function signalText(fullText, consentText) {
    if (consentText) return consentText;
    if (/privacy policy|cookie policy|data protection|personal data protection/i.test(document.title)) {
      return fullText;
    }
    return "";
  }

  function scanCookieBanner(text) {
    const lower = text.toLowerCase();
    const cookieTerms = ["cookie", "cookies", "consent", "privacy choices"];
    const hasBanner = cookieTerms.some((term) => lower.includes(term));
    const hasAccept = /accept all|agree|allow all/i.test(text);
    const hasReject = /reject all|decline|necessary only|continue without accepting/i.test(text);
    const hasManage = /manage choices|preferences|privacy settings|customize/i.test(text);
    const mentionsThirdParties = /third-party|third party|partners|marketing|advertising|analytics/i.test(text);

    return {
      hasBanner,
      hasAccept,
      hasReject,
      hasManage,
      mentionsThirdParties,
      possibleDarkPattern: hasBanner && hasAccept && !hasReject
    };
  }

  function parseScopesFromUrl(url) {
    try {
      const parsed = new URL(url);
      const rawScopes = parsed.searchParams.get("scope") || parsed.searchParams.get("scopes") || "";
      return rawScopes.split(/[\s,+]+/).map((scope) => scope.trim().toLowerCase()).filter(Boolean);
    } catch (error) {
      return [];
    }
  }

  function scanOAuth() {
    const urls = [window.location.href];
    document.querySelectorAll("a[href], form[action]").forEach((node) => {
      const href = node.href || node.action;
      if (href) urls.push(href);
    });

    const buttons = Array.from(document.querySelectorAll("button, a, [role='button']"))
      .map((node) => (node.innerText || node.getAttribute("aria-label") || "").trim())
      .filter((text) => text.length <= 90)
      .filter((text) => /(continue|sign in|signin|log in|login)\s+with\s+(google|microsoft|github|apple)/i.test(text))
      .slice(0, 20);

    const scopes = Array.from(new Set(urls.flatMap(parseScopesFromUrl)));
    const highRiskScopes = scopes
      .map((scope) => {
        const compact = scope.replace(/^https:\/\/www\.googleapis\.com\/auth\//, "");
        const entry = rules.OAUTH_SCOPE_RISK[compact] || rules.OAUTH_SCOPE_RISK[scope];
        return entry ? { scope, score: entry.score, note: entry.note } : null;
      })
      .filter((scope) => scope && scope.score >= 4);

    return {
      buttons,
      scopes,
      highRiskScopes,
      hasOAuthProvider: urls.some((url) => /accounts\.google\.com|login\.microsoftonline\.com|login\.live\.com|appleid\.apple\.com|github\.com\/login\/oauth/i.test(url))
    };
  }

  function visibleDomainClues() {
    const domains = new Set();
    document.querySelectorAll("script[src], iframe[src], img[src], link[href]").forEach((node) => {
      const source = node.src || node.href;
      try {
        const host = rules.normalizeHost(new URL(source).hostname);
        if (host && host !== rules.normalizeHost(location.hostname)) domains.add(host);
      } catch (error) {
        // Ignore invalid or browser-internal URLs.
      }
    });
    return Array.from(domains).slice(0, 80).map((host) => ({
      host,
      categories: rules.categorizeDomain(host)
    }));
  }

  function buildReport() {
    const text = pageText();
    const consentText = findConsentText();
    const focusedSignalText = signalText(text, consentText);
    return {
      pageUrl: location.href,
      pageTitle: document.title,
      scannedAt: Date.now(),
      policyLinks: findPolicyLinks(),
      cookieBanner: scanCookieBanner((consentText || text).slice(0, 40000)),
      oauth: scanOAuth(),
      policySignals: {
        dataCollected: findMatchingSignals(focusedSignalText, rules.DATA_PATTERNS),
        sharing: findMatchingSignals(focusedSignalText, rules.SHARING_PATTERNS)
      },
      visibleThirdPartyHints: visibleDomainClues()
    };
  }

  function classifyConsentClick(target) {
    const control = target?.closest?.("button, a, input[type='button'], input[type='submit'], [role='button']");
    if (!control) return null;

    const label = (
      control.innerText ||
      control.value ||
      control.getAttribute("aria-label") ||
      control.getAttribute("title") ||
      ""
    ).replace(/\s+/g, " ").trim();

    if (!label || label.length > 80) return null;

    const isAccept = /^(accept all|allow all|agree|i agree|accept cookies|accept|ok|got it|yes, i agree)$/i.test(label);
    const isManage = /manage|settings|preferences|customize|reject|decline|necessary/i.test(label);

    if (!isAccept || isManage) return null;

    return { control, label };
  }

  function explainConsent(report) {
    const items = [];
    const sharing = report.policySignals?.sharing || [];
    const data = report.policySignals?.dataCollected || [];
    const thirdPartyHints = report.visibleThirdPartyHints || [];
    const knownTrackers = thirdPartyHints.filter((hint) => hint.categories?.some((category) => ["ads", "analytics", "risk"].includes(category)));

    if (report.cookieBanner?.mentionsThirdParties || sharing.length) {
      items.push("Your activity may be shared with third-party partners, vendors, analytics tools, or advertising services.");
    }

    if (data.some((item) => item.id === "behavior")) {
      items.push("Your interactions on this site may be collected to measure behavior or improve marketing.");
    }

    if (knownTrackers.length) {
      items.push(`This page exposes ${knownTrackers.length} known ad, analytics, or tracking-related third-party domain${knownTrackers.length === 1 ? "" : "s"}.`);
    }

    if (report.cookieBanner?.hasManage && !report.cookieBanner?.hasReject) {
      items.push("There is a settings option, but no equally obvious reject choice was detected.");
    }

    if (!items.length) {
      items.push("This looks like a broad consent action. Review cookie settings if you do not want optional tracking.");
    }

    return items.slice(0, 4);
  }

  function removeConsentOverlay() {
    document.getElementById("consentlens-warning-overlay")?.remove();
  }

  function showConsentWarning(action) {
    removeConsentOverlay();

    const report = buildReport();
    sendReport();
    const explanations = explainConsent(report);
    const overlay = document.createElement("div");
    overlay.id = "consentlens-warning-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");

    const panel = document.createElement("div");
    panel.className = "consentlens-panel";

    const title = document.createElement("h2");
    title.textContent = "Before you accept";

    const body = document.createElement("p");
    body.textContent = `You clicked "${action.label}". ConsentLens found signals worth reviewing first.`;

    const list = document.createElement("ul");
    explanations.forEach((text) => {
      const item = document.createElement("li");
      item.textContent = text;
      list.appendChild(item);
    });

    const actions = document.createElement("div");
    actions.className = "consentlens-actions";

    const reviewButton = document.createElement("button");
    reviewButton.type = "button";
    reviewButton.className = "consentlens-secondary";
    reviewButton.textContent = report.cookieBanner?.hasManage ? "Review settings" : "Go back";
    reviewButton.addEventListener("click", removeConsentOverlay);

    const acceptButton = document.createElement("button");
    acceptButton.type = "button";
    acceptButton.className = "consentlens-primary";
    acceptButton.textContent = "Accept anyway";
    acceptButton.addEventListener("click", () => {
      removeConsentOverlay();
      bypassConsentWarning = true;
      action.control.click();
      window.setTimeout(() => {
        bypassConsentWarning = false;
      }, 0);
    });

    actions.append(reviewButton, acceptButton);
    panel.append(title, body, list, actions);
    overlay.appendChild(panel);
    document.documentElement.appendChild(overlay);
  }

  function installConsentInterception() {
    if (window.__consentLensInterceptInstalled) return;
    window.__consentLensInterceptInstalled = true;

    document.addEventListener("click", (event) => {
      if (bypassConsentWarning) return;

      const action = classifyConsentClick(event.target);
      if (!action) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      showConsentWarning(action);
    }, true);
  }

  function injectWarningStyles() {
    if (document.getElementById("consentlens-warning-styles")) return;

    const style = document.createElement("style");
    style.id = "consentlens-warning-styles";
    style.textContent = `
      #consentlens-warning-overlay {
        position: fixed;
        inset: 0;
        z-index: 2147483647;
        display: grid;
        place-items: center;
        padding: 24px;
        background: rgba(12, 18, 32, 0.48);
        color: #172033;
        font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }

      #consentlens-warning-overlay .consentlens-panel {
        width: min(460px, calc(100vw - 32px));
        border: 1px solid #d8deea;
        border-radius: 8px;
        background: #fff;
        box-shadow: 0 24px 80px rgba(12, 18, 32, 0.28);
        padding: 18px;
      }

      #consentlens-warning-overlay h2 {
        margin: 0 0 8px;
        color: #172033;
        font-size: 20px;
        line-height: 1.2;
        letter-spacing: 0;
      }

      #consentlens-warning-overlay p {
        margin: 0 0 12px;
        color: #4d5a70;
        font-size: 14px;
        line-height: 1.45;
      }

      #consentlens-warning-overlay ul {
        margin: 0 0 16px;
        padding-left: 20px;
        color: #172033;
        font-size: 14px;
        line-height: 1.45;
      }

      #consentlens-warning-overlay li {
        margin: 7px 0;
      }

      #consentlens-warning-overlay .consentlens-actions {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
      }

      #consentlens-warning-overlay button {
        min-height: 36px;
        border-radius: 6px;
        border: 1px solid #cbd3df;
        padding: 7px 12px;
        cursor: pointer;
        font: inherit;
      }

      #consentlens-warning-overlay .consentlens-secondary {
        background: #fff;
        color: #172033;
      }

      #consentlens-warning-overlay .consentlens-primary {
        border-color: #b82f2f;
        background: #c93535;
        color: #fff;
      }
    `;
    document.documentElement.appendChild(style);
  }

  function sendReport() {
    try {
      const result = chrome.runtime.sendMessage({
        type: "CONSENTLENS_CONTENT_REPORT",
        report: buildReport()
      });
      if (result && typeof result.catch === "function") {
        result.catch(() => {});
      }
    } catch (error) {
      // Some browser pages block extension messaging.
    }
  }

  window.__consentLensScanNow = sendReport;
  injectWarningStyles();
  installConsentInterception();
  sendReport();

  let timer = null;
  const observer = new MutationObserver(() => {
    clearTimeout(timer);
    timer = setTimeout(sendReport, 1200);
  });

  if (document.body) {
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true
    });
  }
})();

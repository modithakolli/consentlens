(function scanConsentSurface() {
  if (window.__consentLensScanNow) {
    window.__consentLensScanNow();
    return;
  }

  const rules = window.ConsentLensRules;

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

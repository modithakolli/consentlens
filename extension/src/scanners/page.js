(function attachPageScanner(globalScope) {
  function pageText() {
    return (document.body?.innerText || "").replace(/\s+/g, " ").trim().slice(0, 120000);
  }

  function nodeText(node) {
    return (node?.innerText || node?.textContent || "").replace(/\s+/g, " ").trim();
  }

  function findMatchingSignals(text, patterns) {
    const lower = String(text || "").toLowerCase();
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

  function visibleDomainClues() {
    const domains = new Set();
    document.querySelectorAll("script[src], iframe[src], img[src], link[href]").forEach((node) => {
      const source = node.src || node.href;
      try {
        const host = ConsentLensRules.normalizeHost(new URL(source).hostname);
        if (host && host !== ConsentLensRules.normalizeHost(location.hostname)) domains.add(host);
      } catch (error) {
        // Ignore invalid or browser-internal URLs.
      }
    });

    return Array.from(domains).slice(0, 80).map((host) => ({
      host,
      categories: ConsentLensRules.categorizeDomain(host)
    }));
  }

  function scan() {
    return {
      fullText: pageText(),
      nodeText,
      policyLinks: findPolicyLinks(),
      visibleThirdPartyHints: visibleDomainClues()
    };
  }

  globalScope.ConsentLensPageScanner = {
    scan,
    nodeText,
    findMatchingSignals
  };
})(window);

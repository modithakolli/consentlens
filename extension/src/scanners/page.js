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
    const keywords = /privacy|cookie policy|cookies policy|terms of use|terms and conditions|terms & conditions|candidate privacy|legal|do not sell|data protection|personal data protection|privacy statement|user agreement/i;
    const badLabels = /skip to|jump to|search|footer|content|close|menu/i;

    return Array.from(document.querySelectorAll("a[href]"))
      .map((link) => ({
        text: (link.innerText || link.getAttribute("aria-label") || "").trim(),
        href: link.href
      }))
      .filter((link) => {
        const combined = link.text + " " + link.href;
        if (!keywords.test(combined)) return false;
        if (badLabels.test(link.text) && !keywords.test(link.text)) return false;
        try {
          const url = new URL(link.href);
          return ["http:", "https:"].includes(url.protocol);
        } catch (error) {
          return false;
        }
      })
      .filter((link, index, links) => links.findIndex((item) => item.href === link.href) === index)
      .sort((a, b) => {
        const score = (link) => {
          const value = (link.text + " " + link.href).toLowerCase();
          if (value.includes("privacy")) return 0;
          if (value.includes("cookie")) return 1;
          if (value.includes("terms")) return 2;
          return 3;
        };
        return score(a) - score(b);
      })
      .slice(0, 12);
  }

  function inferPolicyLinks() {
    const baseUrl = new URL(location.href);
    const candidates = [
      ["Privacy policy", "/privacy-policy"],
      ["Privacy policy", "/privacy"],
      ["Privacy notice", "/privacy-notice"],
      ["Privacy statement", "/privacy-statement"],
      ["Cookie policy", "/cookie-policy"],
      ["Cookies policy", "/cookies-policy"],
      ["Terms of use", "/terms-of-use"],
      ["Terms and conditions", "/terms-and-conditions"],
      ["Legal", "/legal/privacy"],
      ["Data protection", "/data-protection"]
    ];

    return candidates.map(([text, path]) => ({
      text: `${text} (inferred)`,
      href: new URL(path, baseUrl.origin).href,
      inferred: true
    }));
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
    const policyLinks = findPolicyLinks();
    return {
      fullText: pageText(),
      nodeText,
      policyLinks,
      inferredPolicyLinks: policyLinks.length ? [] : inferPolicyLinks(),
      visibleThirdPartyHints: visibleDomainClues()
    };
  }

  globalScope.ConsentLensPageScanner = {
    scan,
    nodeText,
    findMatchingSignals
  };
})(window);

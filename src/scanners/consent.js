(function attachConsentScanner(globalScope) {
  function findConsentText() {
    const candidates = Array.from(document.querySelectorAll(
      "[id*='cookie' i], [class*='cookie' i], [id*='consent' i], [class*='consent' i], [id*='onetrust' i], [class*='onetrust' i], [role='dialog'], dialog"
    ));

    const consentCandidates = candidates
      .map(ConsentLensPageScanner.nodeText)
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
    const lower = String(text || "").toLowerCase();
    const cookieTerms = ["cookie", "cookies", "consent", "privacy choices"];
    const hasBanner = cookieTerms.some((term) => lower.includes(term));
    const hasAccept = /accept all|agree|allow all/i.test(text);
    const hasReject = /reject all|decline|necessary only|continue without accepting/i.test(text);
    const hasManage = /manage choices|manage settings|preferences|privacy settings|customize/i.test(text);
    const mentionsThirdParties = /third-party|third party|partners|marketing|advertising|analytics/i.test(text);
    const mentionsProfiling = /profiling|behavioral|personalized ads|targeted ads|cross-site|cross site/i.test(text);

    return {
      hasBanner,
      hasAccept,
      hasReject,
      hasManage,
      mentionsThirdParties,
      mentionsProfiling,
      possibleDarkPattern: hasBanner && hasAccept && !hasReject
    };
  }

  function buildSummary(cookieBanner, policySignals, visibleThirdPartyHints) {
    const summary = [];
    const sharing = policySignals.sharing || [];
    const data = policySignals.dataCollected || [];
    const knownTrackers = visibleThirdPartyHints.filter((hint) => hint.categories?.some((category) => ["ads", "analytics", "risk"].includes(category)));

    if (cookieBanner.mentionsThirdParties || sharing.length) {
      summary.push({
        kind: "sharing",
        label: "Third-party sharing",
        detail: "Your activity may be shared with partners, vendors, analytics tools, or advertising services."
      });
    }

    if (data.some((item) => item.id === "behavior") || cookieBanner.mentionsProfiling) {
      summary.push({
        kind: "behavior",
        label: "Behavior tracking",
        detail: "Your interactions may be used to understand behavior, personalize content, or support marketing."
      });
    }

    if (knownTrackers.length) {
      summary.push({
        kind: "trackers",
        label: "Known tracking services",
        detail: `${knownTrackers.length} known ad, analytics, or tracking-related third-party domain${knownTrackers.length === 1 ? "" : "s"} are visible on this page.`
      });
    }

    if (cookieBanner.hasManage && !cookieBanner.hasReject) {
      summary.push({
        kind: "darkPattern",
        label: "Consent design risk",
        detail: "A settings option exists, but an equally obvious reject choice was not detected."
      });
    }

    return summary;
  }

  function scan(page) {
    const consentText = findConsentText();
    const focusedSignalText = signalText(page.fullText, consentText);
    const cookieBanner = scanCookieBanner((consentText || page.fullText).slice(0, 40000));
    const policySignals = {
      dataCollected: ConsentLensPageScanner.findMatchingSignals(focusedSignalText, ConsentLensRules.DATA_PATTERNS),
      sharing: ConsentLensPageScanner.findMatchingSignals(focusedSignalText, ConsentLensRules.SHARING_PATTERNS)
    };

    return {
      consentText,
      signalText: focusedSignalText,
      cookieBanner,
      summary: buildSummary(cookieBanner, policySignals, page.visibleThirdPartyHints)
    };
  }

  globalScope.ConsentLensConsentScanner = {
    scan,
    buildSummary
  };
})(window);

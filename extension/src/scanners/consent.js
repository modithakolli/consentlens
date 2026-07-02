(function attachConsentScanner(globalScope) {
  const CONSENT_CONTEXT_TERMS = /cookie|consent|privacy|tracking|third-party|third party|marketing|advertising|personal data|preferences|manage settings|manage choices|reject all|accept all|opt in|opt out|gdpr|ccpa|cpra|dpdp/i;

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

  function closestConsentContext(control) {
    let node = control;
    for (let depth = 0; node && depth < 4; depth += 1, node = node.parentElement) {
      const text = ConsentLensPageScanner.nodeText(node);
      if (CONSENT_CONTEXT_TERMS.test(text)) {
        return text;
      }
    }
    return "";
  }

  function hasConsentContext(control, label) {
    const text = `${label || ""} ${closestConsentContext(control)}`.trim();
    return CONSENT_CONTEXT_TERMS.test(text);
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
    const hasHiddenReject = hasReject && !findVisibleControl(/reject all|decline|necessary only|continue without accepting/i);
    const hasPreselectedOptionalToggles = findPreselectedOptionalToggles();
    const acceptButtons = findVisibleControls(/accept all|allow all|i agree|accept cookies/i);
    const rejectButtons = findVisibleControls(/reject all|decline|necessary only|continue without accepting/i);
    const acceptEmphasis = acceptButtons.length > rejectButtons.length;
    const rejectDeemphasized = acceptButtons.some((accept) => (
      rejectButtons.length === 0 || rejectButtons.every((reject) => visualWeight(accept) > visualWeight(reject) * 1.4)
    ));
    const darkPatterns = [
      !hasReject ? "No equally clear reject choice detected." : "",
      hasHiddenReject ? "Reject language exists, but the reject control appears hidden." : "",
      acceptEmphasis ? "Accept controls are more numerous than reject controls." : "",
      rejectDeemphasized ? "Accept action appears visually stronger than reject." : "",
      hasPreselectedOptionalToggles ? "Optional tracking choices appear preselected." : ""
    ].filter(Boolean);

    return {
      hasBanner,
      hasAccept,
      hasReject,
      hasManage,
      mentionsThirdParties,
      mentionsProfiling,
      hasHiddenReject,
      hasPreselectedOptionalToggles,
      acceptEmphasis,
      rejectDeemphasized,
      darkPatterns,
      possibleDarkPattern: hasBanner && hasAccept && darkPatterns.length > 0
    };
  }

  function findVisibleControls(pattern) {
    return Array.from(document.querySelectorAll("button, a, input[type='button'], input[type='submit'], [role='button']"))
      .filter((node) => {
        const text = (node.innerText || node.value || node.getAttribute("aria-label") || node.getAttribute("title") || "").replace(/\s+/g, " ").trim();
        if (!pattern.test(text)) return false;
        const rect = node.getBoundingClientRect();
        const style = getComputedStyle(node);
        return rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none";
      });
  }

  function findVisibleControl(pattern) {
    return findVisibleControls(pattern)[0] || null;
  }

  function visualWeight(node) {
    const rect = node.getBoundingClientRect();
    const style = getComputedStyle(node);
    const area = rect.width * rect.height;
    const colorWeight = style.backgroundColor && style.backgroundColor !== "rgba(0, 0, 0, 0)" ? 1.25 : 1;
    const fontWeight = Number.parseInt(style.fontWeight, 10) >= 600 ? 1.15 : 1;
    return area * colorWeight * fontWeight;
  }

  function findPreselectedOptionalToggles() {
    return Array.from(document.querySelectorAll("input[type='checkbox']:checked, input[type='radio']:checked, [role='switch'][aria-checked='true']"))
      .some((node) => {
        const container = node.closest("label, li, div, section") || node;
        const text = ConsentLensPageScanner.nodeText(container).toLowerCase();
        return /marketing|advertising|analytics|personalization|partners|third-party|third party|optional/.test(text) && !/strictly necessary|essential|required/.test(text);
      });
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

    if (cookieBanner.hasHiddenReject) {
      summary.push({
        kind: "hiddenReject",
        label: "Hidden reject option",
        detail: "Reject language appears in the banner text, but ConsentLens did not find a visible reject button."
      });
    }

    if (cookieBanner.hasPreselectedOptionalToggles) {
      summary.push({
        kind: "preselected",
        label: "Preselected optional tracking",
        detail: "Optional analytics, marketing, personalization, or partner toggles appear to be enabled by default."
      });
    }

    if (cookieBanner.rejectDeemphasized) {
      summary.push({
        kind: "deemphasizedReject",
        label: "Reject is less prominent",
        detail: "The accept action appears visually stronger than the reject option."
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

  function consentClickAllowed(control) {
    const label = (
      control?.innerText ||
      control?.value ||
      control?.getAttribute("aria-label") ||
      control?.getAttribute("title") ||
      ""
    ).replace(/\s+/g, " ").trim();

    if (!label || label.length > 80) return false;
    const isConsentLabel = /^(accept all|allow all|accept cookies|accept privacy settings|accept tracking|allow cookies|agree|i agree|yes, i agree|ok|okay|got it)$/i.test(label);
    if (!isConsentLabel) return false;
    return hasConsentContext(control, label);
  }

  globalScope.ConsentLensConsentScanner = {
    scan,
    buildSummary,
    consentClickAllowed
  };
})(window);

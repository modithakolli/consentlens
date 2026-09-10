(function attachConsentScanner(globalScope) {
  const CONSENT_SELECTOR = "[id*='cookie' i], [class*='cookie' i], [id*='consent' i], [class*='consent' i], [id*='onetrust' i], [class*='onetrust' i], [id*='didomi' i], [class*='didomi' i], [id*='sp_message' i], [class*='sp_message' i], [role='dialog'], dialog";
  const CONTROL_SELECTOR = "button, a, input[type='button'], input[type='submit'], [role='button']";
  const CONSENT_TERMS = /cookie|consent|privacy|accept all|allow all|manage settings|manage choices|reject all|third-party|third party/i;

  function findConsentRoot() {
    const candidates = Array.from(document.querySelectorAll(
      CONSENT_SELECTOR
    ));
    return candidates
      .map((node) => ({ node, text: ConsentLensPageScanner.nodeText(node) }))
      .filter(({ node, text }) => CONSENT_TERMS.test(text) && (node.querySelectorAll?.(CONTROL_SELECTOR).length || 0))
      .sort((a, b) => {
        const aControls = a.node.querySelectorAll?.(CONTROL_SELECTOR).length || 0;
        const bControls = b.node.querySelectorAll?.(CONTROL_SELECTOR).length || 0;
        return bControls - aControls || b.text.length - a.text.length;
      })[0]?.node || null;
  }

  function findConsentText() {
    return ConsentLensPageScanner.nodeText(findConsentRoot()).slice(0, 12000);
  }

  function signalText(fullText, consentText) {
    if (consentText) return consentText;
    if (/privacy policy|cookie policy|data protection|personal data protection/i.test(document.title)) {
      return fullText;
    }
    return "";
  }

  function scanCookieBanner(text, root) {
    const lower = String(text || "").toLowerCase();
    const cookieTerms = ["cookie", "cookies", "consent", "privacy choices"];
    const hasBanner = Boolean(root) && cookieTerms.some((term) => lower.includes(term));
    const hasAccept = /accept all|agree|allow all/i.test(text);
    const hasReject = /reject all|decline|necessary only|continue without accepting/i.test(text);
    const hasManage = /manage choices|manage settings|preferences|privacy settings|customize/i.test(text);
    const mentionsThirdParties = /third-party|third party|partners|marketing|advertising|analytics/i.test(text);
    const mentionsProfiling = /profiling|behavioral|personalized ads|targeted ads|cross-site|cross site/i.test(text);
    const hasHiddenReject = hasReject && !findVisibleControl(/reject all|decline|necessary only|continue without accepting/i, root);
    const hasPreselectedOptionalToggles = findPreselectedOptionalToggles(root);
    const acceptButtons = findVisibleControls(/accept all|allow all|i agree|accept cookies/i, root);
    const rejectButtons = findVisibleControls(/reject all|decline|necessary only|continue without accepting/i, root);
    const acceptEmphasis = hasBanner && visuallyEmphasized(acceptButtons, rejectButtons);
    const darkPatterns = [];
    if (hasBanner && hasAccept && !hasReject) darkPatterns.push({ id: "missing-reject", severity: "high", label: "No equally clear reject choice", evidence: "Accept was visible but a direct reject choice was not detected." });
    if (hasHiddenReject) darkPatterns.push({ id: "hidden-reject", severity: "high", label: "Hidden reject option", evidence: "Reject language was present but no visible reject control was found." });
    if (hasManage && !hasReject) darkPatterns.push({ id: "multi-step-reject", severity: "medium", label: "More steps to refuse", evidence: "Settings were offered but a direct reject choice was not detected." });
    if (hasPreselectedOptionalToggles) darkPatterns.push({ id: "default-opt-in", severity: "high", label: "Optional tracking preselected", evidence: "An optional marketing, analytics, or partner toggle appeared enabled." });
    if (acceptEmphasis) darkPatterns.push({ id: "accept-emphasis", severity: "medium", label: "Accept action emphasized", evidence: "More visible accept controls than reject controls were detected." });
    if (/are you sure|you.?ll miss out|don.?t miss|no,? thanks|i don.?t care/i.test(lower)) darkPatterns.push({ id: "confirm-shaming", severity: "medium", label: "Potential confirm shaming", evidence: "The consent text appears to use guilt or loss framing." });
    if (/legitimate interest/.test(lower) && !/object|opt.?out|withdraw/.test(lower)) darkPatterns.push({ id: "legitimate-interest-clarity", severity: "medium", label: "Legitimate-interest clarity gap", evidence: "Legitimate interest was mentioned without a visible objection or opt-out signal." });

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
      darkPatterns,
      possibleDarkPattern: darkPatterns.length > 0
    };
  }

  function findVisibleControls(pattern, root = document) {
    return Array.from(root?.querySelectorAll?.(CONTROL_SELECTOR) || [])
      .filter((node) => {
        const text = (node.innerText || node.value || node.getAttribute("aria-label") || node.getAttribute("title") || "").replace(/\s+/g, " ").trim();
        if (!pattern.test(text)) return false;
        const rect = node.getBoundingClientRect();
        const style = getComputedStyle(node);
        return rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none";
      });
  }

  function findVisibleControl(pattern, root) {
    return findVisibleControls(pattern, root)[0] || null;
  }

  function visuallyEmphasized(acceptButtons, rejectButtons) {
    if (!acceptButtons.length || !rejectButtons.length) return false;
    const weight = (node) => {
      const rect = node.getBoundingClientRect();
      const style = getComputedStyle(node);
      return rect.width * rect.height * (Number(style.fontWeight) >= 600 ? 1.1 : 1);
    };
    return Math.max(...acceptButtons.map(weight)) > Math.max(...rejectButtons.map(weight)) * 1.25;
  }

  function findPreselectedOptionalToggles(root = document) {
    return Array.from(root?.querySelectorAll?.("input[type='checkbox']:checked, input[type='radio']:checked, [role='switch'][aria-checked='true']") || [])
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

    return summary;
  }

  function getText(node) {
    return String(
      node?.innerText ||
      node?.value ||
      node?.getAttribute?.("aria-label") ||
      node?.getAttribute?.("title") ||
      ""
    ).replace(/\s+/g, " ").trim();
  }

  function gatherContext(control) {
    const chunks = [];
    let current = control;
    for (let depth = 0; current && depth < 12; depth += 1, current = current.parentElement) {
      const text = ConsentLensPageScanner.nodeText(current);
      if (text) chunks.push(text);
    }
    return chunks.join(" ").slice(0, 8000);
  }

  function consentClickAllowed(target, report) {
    const control = target?.closest?.("button, a, input[type='button'], input[type='submit'], [role='button']");
    if (!control) return false;

    const label = getText(control);
    if (!label || label.length > 80) return false;

    const lower = label.toLowerCase();
    const acceptLike = /^(accept all|accept cookies?|accept selected|accept selection|accept optional|accept preferences|allow all|allow cookies?|allow selected|agree|i agree|save and continue|continue with recommended|ok|okay|got it|yes, i agree|yes, accept)$/i.test(label)
      || (/^(accept|allow|agree|ok|okay|got it|continue|yes)$/i.test(label) && /cookie|consent|privacy|tracking|analytics|advertising|marketing|preferences|choice|choices|third-party|third party/i.test(gatherContext(control)));
    const rejectLike = /^(reject|reject all|decline|decline all|necessary only|manage|manage choices|manage settings|preferences|privacy settings|customize|limit)$/i.test(label);
    if (rejectLike || !acceptLike) return false;

    const context = gatherContext(control);
    if (/cookie|consent|privacy|tracking|analytics|advertising|marketing|preferences|choice|choices|third-party|third party/i.test(context)) return true;

    const container = control.closest?.("[role='dialog'], dialog, form, section, aside, div");
    if (container) {
      const containerText = ConsentLensPageScanner.nodeText(container);
      const controls = container.querySelectorAll?.("button, a, input[type='button'], input[type='submit'], [role='button']") || [];
      if (controls.length >= 2 && /accept|reject|manage|settings|preferences|privacy|cookies|consent|tracking|analytics|advertising|marketing/i.test(containerText)) {
        return true;
      }
      if (controls.length >= 2 && /accept|okay|ok|agree|allow|continue/i.test(label) && /cookie|privacy|consent|tracking/i.test(containerText)) {
        return true;
      }
    }

    return false;
  }

  function scan(page) {
    const consentRoot = findConsentRoot();
    const consentText = ConsentLensPageScanner.nodeText(consentRoot).slice(0, 12000);
    const focusedSignalText = signalText(page.fullText, consentText);
    const cookieBanner = scanCookieBanner(consentText.slice(0, 40000), consentRoot);
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
    buildSummary,
    consentClickAllowed
  };
})(window);

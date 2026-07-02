(function bootConsentLens() {
  if (window.__consentLensScanNow) {
    window.__consentLensScanNow();
    return;
  }

  function buildReport() {
    const page = window.ConsentLensPageScanner.scan();
    const consent = window.ConsentLensConsentScanner.scan(page);
    const oauth = window.ConsentLensOAuthScanner.scan(page);
    const fingerprinting = window.ConsentLensFingerprintScanner.scan(page);

    return {
      pageUrl: location.href,
      pageTitle: document.title,
      scannedAt: Date.now(),
      policyLinks: page.policyLinks,
      cookieBanner: consent.cookieBanner,
      oauth,
      policySignals: {
        dataCollected: window.ConsentLensPageScanner.findMatchingSignals(consent.signalText, ConsentLensRules.DATA_PATTERNS),
        sharing: window.ConsentLensPageScanner.findMatchingSignals(consent.signalText, ConsentLensRules.SHARING_PATTERNS)
      },
      visibleThirdPartyHints: page.visibleThirdPartyHints,
      consentSummary: consent.summary,
      fingerprinting
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

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message?.type === "CONSENTLENS_SCAN_NOW") {
      sendReport();
      sendResponse({ ok: true });
      return false;
    }
  });

  window.__consentLensBuildReport = buildReport;
  window.__consentLensScanNow = sendReport;

  window.ConsentLensConsentWarning.install({
    buildReport,
    sendReport
  });

  window.ConsentLensOAuthWarning.install({
    buildReport,
    sendReport
  });

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

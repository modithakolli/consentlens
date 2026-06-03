(function attachFingerprintingScanner(globalScope) {
  const TERMS = [
    { id: "canvas", label: "Canvas fingerprinting", pattern: /canvas fingerprint|canvas.*fingerprint|to identify your browser/i },
    { id: "webgl", label: "WebGL fingerprinting", pattern: /webgl fingerprint|webgl.*identify|gpu.*fingerprint/i },
    { id: "audio", label: "Audio fingerprinting", pattern: /audio fingerprint|audio context.*fingerprint|oscillator/i },
    { id: "fonts", label: "Font enumeration", pattern: /font enumeration|installed fonts|font fingerprint/i },
    { id: "device", label: "Device fingerprinting", pattern: /device fingerprint|browser fingerprint|unique device identifier|device characteristics/i },
    { id: "fraud", label: "Fraud detection / anti-bot", pattern: /fraud detection|bot detection|anti-bot|challenge/i }
  ];

  function scan(page) {
    const text = `${page.fullText || ""} ${document.title || ""}`.toLowerCase();
    const visibleRiskDomains = (page.visibleThirdPartyHints || []).filter((hint) => hint.categories?.includes("risk"));
    const matches = TERMS.filter((term) => term.pattern.test(text));

    const detected = matches.length > 0 || visibleRiskDomains.length > 0;
    const evidence = matches.map((match) => match.label);
    if (visibleRiskDomains.length) {
      evidence.push(`${visibleRiskDomains.length} risky third-party domain${visibleRiskDomains.length === 1 ? "" : "s"} visible`);
    }

    return {
      detected,
      riskLevel: detected ? (visibleRiskDomains.length || matches.length > 1 ? "High" : "Medium") : "Low",
      signals: matches.map((match) => ({ id: match.id, label: match.label })),
      evidence: Array.from(new Set(evidence))
    };
  }

  globalScope.ConsentLensFingerprintScanner = {
    scan
  };
})(window);

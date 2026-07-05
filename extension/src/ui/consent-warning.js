(function attachConsentWarning(globalScope) {
  let bypassConsentWarning = false;

  const CONSENT_CONTAINER_SELECTOR = "[role='dialog'], dialog, [id*='cookie' i], [class*='cookie' i], [id*='consent' i], [class*='consent' i], [id*='privacy' i], [class*='privacy' i], [id*='onetrust' i], [class*='onetrust' i]";
  const CONSENT_CONTEXT_PATTERN = /cookie|consent|privacy|tracking|analytics|advertising|marketing|preferences|choice|choices|third-party|third party/i;
  const ACCEPT_LABEL_PATTERN = /^(accept all|accept cookies?|accept selected|accept selection|accept optional|accept preferences|allow all|allow cookies?|allow selected|agree|i agree|save and continue|continue with recommended|ok|okay|got it|yes, i agree|yes, accept)$/i;
  const GENERIC_ACCEPT_PATTERN = /^(accept|allow|agree|ok|okay|got it|continue|yes)$/i;
  const REJECT_OR_SETTINGS_PATTERN = /reject|decline|necessary|manage|settings|preferences|customize|limit/i;

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
    for (let depth = 0; current && depth < 5; depth += 1, current = current.parentElement) {
      const text = ConsentLensPageScanner.nodeText(current);
      if (text) chunks.push(text);
      if (current.matches?.(CONSENT_CONTAINER_SELECTOR)) break;
    }
    return chunks.join(" ").slice(0, 8000);
  }

  function hasConsentContext(control, report) {
    const context = gatherContext(control);
    if (CONSENT_CONTEXT_PATTERN.test(context)) return true;

    const container = control.closest(CONSENT_CONTAINER_SELECTOR) || control.closest("[role='dialog'], dialog, form, section, aside, div");
    if (container) {
      const containerText = ConsentLensPageScanner.nodeText(container);
      const controls = container.querySelectorAll("button, a, input[type='button'], input[type='submit'], [role='button']");
      const hasChoiceSet = controls.length >= 2;
      if (hasChoiceSet && CONSENT_CONTEXT_PATTERN.test(containerText)) return true;
      if (hasChoiceSet && /accept|reject|manage|settings|preferences|privacy|cookies|consent|tracking|analytics|advertising|marketing/i.test(containerText)) return true;
      if (hasChoiceSet && /accept|okay|ok|agree|allow|continue/i.test(getText(control)) && /cookie|privacy|consent|tracking/i.test(containerText)) return true;
    }

    const bannerText = String(report?.consentText || report?.signalText || "");
    if (CONSENT_CONTEXT_PATTERN.test(bannerText) && /accept|reject|manage|settings|preferences/i.test(context)) {
      return true;
    }

    if (report?.cookieBanner?.hasBanner && (report?.cookieBanner?.hasAccept || report?.cookieBanner?.hasManage || report?.cookieBanner?.hasReject)) {
      return true;
    }

    if ((report?.consentSummary || []).length && /accept|allow|agree|cookie|privacy|consent/i.test(gatherContext(control))) {
      return true;
    }

    return false;
  }

  function classifyConsentClick(target, report) {
    const control = target?.closest?.("button, a, input[type='button'], input[type='submit'], [role='button']");
    if (!control) return null;

    const label = getText(control);

    if (!label || label.length > 80) return null;

    const lower = label.toLowerCase();
    const isRejectLike = REJECT_OR_SETTINGS_PATTERN.test(label);
    const isAcceptLike = ACCEPT_LABEL_PATTERN.test(label) || (GENERIC_ACCEPT_PATTERN.test(label) && hasConsentContext(control, report));

    if (isRejectLike || !isAcceptLike) return null;

    if (!hasConsentContext(control, report)) return null;

    return { control, label };
  }

  function removeConsentOverlay() {
    document.getElementById("consentlens-warning-overlay")?.remove();
  }

  function fallbackSummary() {
    return [{
      label: "Broad consent action",
      detail: "Review cookie settings if you do not want optional analytics, advertising, or personalization."
    }];
  }

  function showConsentWarning(action, buildReport, sendReport) {
    removeConsentOverlay();

    const report = buildReport();
    sendReport();
    const summary = report.consentSummary?.length ? report.consentSummary : fallbackSummary();
    const overlay = document.createElement("div");
    overlay.id = "consentlens-warning-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");

    const panel = document.createElement("div");
    panel.className = "consentlens-panel";

    const title = document.createElement("h2");
    title.textContent = "Before you accept";

    const body = document.createElement("p");
    body.textContent = `You clicked "${action.label}". This is a consent action, so here is the short version of what it may allow.`;

    const list = document.createElement("ul");
    summary.slice(0, 5).forEach((item) => {
      const li = document.createElement("li");
      const strong = document.createElement("strong");
      strong.textContent = `${item.label}: `;
      li.append(strong, document.createTextNode(item.detail));
      list.appendChild(li);
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
      try {
        chrome.runtime.sendMessage({
          type: "CONSENTLENS_STORE_RECEIPT",
          receipt: {
            kind: "cookie-consent",
            pageUrl: location.href,
            pageTitle: document.title,
            actionLabel: action.label,
            acceptedAt: Date.now(),
            summary: summary.slice(0, 5)
          }
        });
      } catch (error) {
        // Receipts are best-effort and should never block the user's choice.
      }
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
        width: min(500px, calc(100vw - 32px));
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

      #consentlens-warning-overlay strong {
        color: #111827;
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

  function install({ buildReport, sendReport }) {
    injectWarningStyles();
    if (window.__consentLensInterceptInstalled) return;
    window.__consentLensInterceptInstalled = true;

    document.addEventListener("click", (event) => {
      if (bypassConsentWarning) return;

      const report = typeof buildReport === "function" ? buildReport() : null;
      const action = classifyConsentClick(event.target, report);
      if (!action) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      showConsentWarning(action, buildReport, sendReport);
    }, true);
  }

  globalScope.ConsentLensConsentWarning = {
    install
  };
})(window);

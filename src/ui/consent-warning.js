(function attachConsentWarning(globalScope) {
  let bypassConsentWarning = false;

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
    body.textContent = `You clicked "${action.label}". Here is what that consent may allow.`;

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

      const action = classifyConsentClick(event.target);
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

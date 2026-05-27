(function attachOAuthWarning(globalScope) {
  let bypassOAuthWarning = false;

  function parseUrl(url) {
    try {
      return new URL(url);
    } catch (error) {
      return null;
    }
  }

  function classifyOAuthClick(target) {
    const control = target?.closest?.("a[href], button, [role='button']");
    if (!control) return null;

    const label = (control.innerText || control.getAttribute("aria-label") || control.getAttribute("title") || "").replace(/\s+/g, " ").trim();
    const href = control.href || control.getAttribute("formaction") || "";
    const looksLikeProviderButton = /(continue|sign in|signin|log in|login)\s+with\s+(google|microsoft|github|apple)/i.test(label);
    const parsed = parseUrl(href);
    const isProviderUrl = parsed && /accounts\.google\.com|login\.microsoftonline\.com|login\.live\.com|appleid\.apple\.com|github\.com\/login\/oauth/i.test(parsed.href);

    if (!looksLikeProviderButton && !isProviderUrl) return null;

    return { control, label: label || "OAuth sign-in", href };
  }

  function removeOverlay() {
    document.getElementById("consentlens-oauth-overlay")?.remove();
  }

  function scopeSummary(oauth) {
    if (!oauth?.scopeDetails?.length) {
      return ["The exact permission scopes are not visible yet. The provider consent screen should still be reviewed carefully."];
    }

    const high = oauth.scopeDetails.filter((scope) => scope.score >= 4);
    const details = high.length ? high : oauth.scopeDetails.slice(0, 3);
    return details.map((scope) => `${scope.compact || scope.scope}: ${scope.note || "Review this permission."}`);
  }

  function showOAuthWarning(action, buildReport, sendReport) {
    removeOverlay();

    const report = buildReport();
    sendReport();
    const oauth = report.oauth || {};
    const overlay = document.createElement("div");
    overlay.id = "consentlens-oauth-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");

    const panel = document.createElement("div");
    panel.className = "consentlens-oauth-panel";

    const title = document.createElement("h2");
    title.textContent = "Before you continue";

    const body = document.createElement("p");
    body.textContent = `${oauth.provider || "This provider"} sign-in may grant account access to ${oauth.appName || "this app"}. Access level: ${oauth.accessLevel || "Unknown"}.`;

    const list = document.createElement("ul");
    scopeSummary(oauth).forEach((text) => {
      const item = document.createElement("li");
      item.textContent = text;
      list.appendChild(item);
    });

    if (oauth.purposeMismatch?.detected) {
      const item = document.createElement("li");
      item.textContent = oauth.purposeMismatch.reason;
      list.appendChild(item);
    }

    const actions = document.createElement("div");
    actions.className = "consentlens-oauth-actions";

    const cancelButton = document.createElement("button");
    cancelButton.type = "button";
    cancelButton.className = "consentlens-oauth-secondary";
    cancelButton.textContent = "Go back";
    cancelButton.addEventListener("click", removeOverlay);

    const continueButton = document.createElement("button");
    continueButton.type = "button";
    continueButton.className = "consentlens-oauth-primary";
    continueButton.textContent = "Continue";
    continueButton.addEventListener("click", () => {
      removeOverlay();
      bypassOAuthWarning = true;
      action.control.click();
      window.setTimeout(() => {
        bypassOAuthWarning = false;
      }, 0);
    });

    actions.append(cancelButton, continueButton);
    panel.append(title, body, list, actions);
    overlay.appendChild(panel);
    document.documentElement.appendChild(overlay);
  }

  function injectStyles() {
    if (document.getElementById("consentlens-oauth-styles")) return;

    const style = document.createElement("style");
    style.id = "consentlens-oauth-styles";
    style.textContent = `
      #consentlens-oauth-overlay {
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

      #consentlens-oauth-overlay .consentlens-oauth-panel {
        width: min(500px, calc(100vw - 32px));
        border: 1px solid #d8deea;
        border-radius: 8px;
        background: #fff;
        box-shadow: 0 24px 80px rgba(12, 18, 32, 0.28);
        padding: 18px;
      }

      #consentlens-oauth-overlay h2 {
        margin: 0 0 8px;
        color: #172033;
        font-size: 20px;
        line-height: 1.2;
        letter-spacing: 0;
      }

      #consentlens-oauth-overlay p,
      #consentlens-oauth-overlay li {
        color: #172033;
        font-size: 14px;
        line-height: 1.45;
      }

      #consentlens-oauth-overlay p {
        margin: 0 0 12px;
        color: #4d5a70;
      }

      #consentlens-oauth-overlay ul {
        margin: 0 0 16px;
        padding-left: 20px;
      }

      #consentlens-oauth-overlay li {
        margin: 7px 0;
      }

      #consentlens-oauth-overlay .consentlens-oauth-actions {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
      }

      #consentlens-oauth-overlay button {
        min-height: 36px;
        border-radius: 6px;
        border: 1px solid #cbd3df;
        padding: 7px 12px;
        cursor: pointer;
        font: inherit;
      }

      #consentlens-oauth-overlay .consentlens-oauth-secondary {
        background: #fff;
        color: #172033;
      }

      #consentlens-oauth-overlay .consentlens-oauth-primary {
        border-color: #245a8d;
        background: #245a8d;
        color: #fff;
      }
    `;
    document.documentElement.appendChild(style);
  }

  function install({ buildReport, sendReport }) {
    injectStyles();
    if (window.__consentLensOAuthInterceptInstalled) return;
    window.__consentLensOAuthInterceptInstalled = true;

    document.addEventListener("click", (event) => {
      if (bypassOAuthWarning) return;

      const action = classifyOAuthClick(event.target);
      if (!action) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      showOAuthWarning(action, buildReport, sendReport);
    }, true);
  }

  globalScope.ConsentLensOAuthWarning = {
    install
  };
})(window);

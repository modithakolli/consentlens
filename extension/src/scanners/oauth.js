(function attachOAuthScanner(globalScope) {
  const PROVIDERS = [
    { id: "google", label: "Google", hostPattern: /accounts\.google\.com/i },
    { id: "microsoft", label: "Microsoft", hostPattern: /login\.microsoftonline\.com|login\.live\.com/i },
    { id: "apple", label: "Apple", hostPattern: /appleid\.apple\.com/i },
    { id: "github", label: "GitHub", hostPattern: /github\.com\/login\/oauth/i }
  ];

  function parseUrl(url) {
    try {
      return new URL(url);
    } catch (error) {
      return null;
    }
  }

  function parseScopesFromUrl(url) {
    const parsed = parseUrl(url);
    if (!parsed) return [];
    const rawScopes = parsed.searchParams.get("scope") || parsed.searchParams.get("scopes") || "";
    return rawScopes.split(/[\s,+]+/).map((scope) => scope.trim().toLowerCase()).filter(Boolean);
  }

  function compactScope(scope) {
    return scope
      .replace(/^https:\/\/www\.googleapis\.com\/auth\//, "")
      .replace(/^https:\/\/graph\.microsoft\.com\//, "")
      .toLowerCase();
  }

  function riskForScope(scope) {
    const compact = compactScope(scope);
    const entry = ConsentLensRules.OAUTH_SCOPE_RISK[compact] || ConsentLensRules.OAUTH_SCOPE_RISK[scope];
    if (!entry) {
      return {
        scope,
        compact,
        score: 2,
        accessLevel: "Unknown",
        note: "This scope is not in the local risk dictionary yet."
      };
    }

    return {
      scope,
      compact,
      ...entry,
      accessLevel: entry.score >= 5 ? "High" : entry.score >= 3 ? "Medium" : "Low"
    };
  }

  function providerForUrl(url) {
    return PROVIDERS.find((provider) => provider.hostPattern.test(url));
  }

  function collectOAuthUrls() {
    const urls = [location.href];
    document.querySelectorAll("a[href], form[action]").forEach((node) => {
      const href = node.href || node.action;
      if (href) urls.push(href);
    });
    return urls;
  }

  function metaDescription() {
    return document.querySelector("meta[name='description'], meta[property='og:description']")?.content || "";
  }

  function signInButtons() {
    return Array.from(document.querySelectorAll("button, a, [role='button']"))
      .map((node) => (node.innerText || node.getAttribute("aria-label") || "").replace(/\s+/g, " ").trim())
      .filter((text) => text.length <= 90)
      .filter((text) => /(continue|sign in|signin|log in|login)\s+with\s+(google|microsoft|github|apple)/i.test(text))
      .slice(0, 20);
  }

  function inferPurpose(text) {
    const lower = String(text || "").toLowerCase();
    const purposes = [];
    [
      ["notes", /note|notebook|document/i],
      ["productivity", /task|calendar|meeting|project|workflow|productivity/i],
      ["storage", /file|drive|storage|backup|sync/i],
      ["communication", /email|mail|message|chat|contact/i],
      ["marketing", /marketing|crm|lead|campaign|sales/i],
      ["analytics", /analytics|insight|report|dashboard|measurement/i],
      ["developer", /developer|api|automation|integration|deploy|code/i]
    ].forEach(([purpose, pattern]) => {
      if (pattern.test(lower)) purposes.push(purpose);
    });
    return Array.from(new Set(purposes));
  }

  function hostFromUrl(url) {
    const parsed = parseUrl(url);
    return parsed?.hostname?.replace(/^www\./, "") || "";
  }

  function appNameFromPage(providerUrls) {
    const parsed = providerUrls[0]?.parsed || null;
    const explicit = parsed?.searchParams.get("client_name") || parsed?.searchParams.get("app_name");
    if (explicit) return explicit;

    const consentHeadings = Array.from(document.querySelectorAll("h1, h2, [role='heading']"))
      .map((node) => node.innerText?.replace(/\s+/g, " ").trim())
      .filter(Boolean)
      .find((text) => /wants access|sign in|permissions|authorize|consent/i.test(text));

    if (consentHeadings) return consentHeadings;

    const title = document.title.replace(/\s+/g, " ").trim();
    if (title) return title;

    const redirectHost = hostFromUrl(parsed?.searchParams.get("redirect_uri") || "");
    return redirectHost || "";
  }

  function purposeMismatch(scopes, purposes) {
    const riskyScopes = scopes.filter((scope) => scope.score >= 5);
    if (!riskyScopes.length) return null;

    const broadMailOrFiles = riskyScopes.some((scope) => /mail|gmail|drive|files|contacts/i.test(scope.compact));
    const narrowPurpose = purposes.some((purpose) => ["notes", "productivity"].includes(purpose));

    if (broadMailOrFiles && narrowPurpose) {
      return {
        detected: true,
        reason: "The page appears to describe a narrow productivity use, but the OAuth scopes include broad mail, file, or contact access."
      };
    }

    return null;
  }

  function scan(page) {
    const urls = collectOAuthUrls();
    const providerUrls = urls
      .map((url) => ({ url, provider: providerForUrl(url), parsed: parseUrl(url) }))
      .filter((entry) => entry.provider);

    const scopes = Array.from(new Set(urls.flatMap(parseScopesFromUrl))).map(riskForScope);
    const highRiskScopes = scopes.filter((scope) => scope.score >= 4);
    const provider = providerUrls[0]?.provider || null;
    const parsed = providerUrls[0]?.parsed || null;
    const appName = appNameFromPage(providerUrls);
    const clientId = parsed?.searchParams.get("client_id") || "";
    const redirectUri = parsed?.searchParams.get("redirect_uri") || "";
    const redirectHost = hostFromUrl(redirectUri);
    const purposes = inferPurpose(`${document.title} ${metaDescription()} ${redirectHost} ${page.fullText.slice(0, 3000)}`);

    return {
      provider: provider?.label || "",
      appName,
      clientId,
      redirectUri,
      redirectHost,
      buttons: signInButtons(),
      scopes: scopes.map((scope) => scope.scope),
      scopeDetails: scopes,
      highRiskScopes,
      accessLevel: highRiskScopes.some((scope) => scope.score >= 5) ? "High" : highRiskScopes.length ? "Medium" : "Low",
      purposeHints: purposes,
      purposeMismatch: purposeMismatch(scopes, purposes),
      hasOAuthProvider: Boolean(providerUrls.length)
    };
  }

  globalScope.ConsentLensOAuthScanner = {
    scan
  };
})(window);

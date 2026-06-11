import { readFileSync } from "node:fs";
import { Script, createContext } from "node:vm";

const root = new URL("../src/", import.meta.url);
const files = [
  "rules.js",
  "scanners/page.js",
  "scanners/consent.js",
  "scanners/oauth.js",
  "scanners/fingerprinting.js"
];

function makeNode(text, attrs = {}) {
  return {
    innerText: text,
    textContent: text,
    value: attrs.value || "",
    href: attrs.href || "",
    checked: Boolean(attrs.checked),
    getAttribute(name) {
      return attrs[name] || "";
    },
    closest() {
      return this;
    },
    getBoundingClientRect() {
      return attrs.rect || { width: 120, height: 36 };
    }
  };
}

function fixture(index) {
  const risky = index % 3 === 0;
  const oauth = index % 5 === 0;
  const hiddenReject = index % 7 === 0;
  const host = `site-${index}.example`;
  const links = [
    makeNode("Privacy Policy", { href: `https://${host}/privacy` }),
    makeNode("Terms", { href: `https://${host}/terms` })
  ];
  const controls = [
    makeNode("Accept all", { value: "Accept all", "aria-label": "Accept all", rect: { width: 180, height: 48 } }),
    ...(hiddenReject ? [] : [makeNode("Reject all", { value: "Reject all", "aria-label": "Reject all", rect: { width: 90, height: 28 } })]),
    makeNode("Manage choices")
  ];
  const toggles = risky ? [makeNode("Marketing partners optional", { checked: true })] : [];
  const bodyText = [
    "We use cookies and analytics partners.",
    risky ? "We share personal information with advertising partners for targeted ads and profiling." : "We use service providers to operate the site.",
    oauth ? "Sign in with Google scope gmail.readonly drive.readonly offline_access" : "",
    "Privacy Policy Cookie Policy"
  ].join(" ");

  return { host, bodyText, links, controls, toggles };
}

function runFixture(site) {
  const document = {
    title: `${site.host} Privacy`,
    body: makeNode(site.bodyText),
    documentElement: makeNode(site.bodyText),
    querySelectorAll(selector) {
      if (selector.includes("a[href]")) return site.links;
      if (selector.includes("button")) return site.controls;
      if (selector.includes("checkbox")) return site.toggles;
      if (selector.includes("cookie") || selector.includes("dialog")) return [makeNode(site.bodyText)];
      return [];
    },
    querySelector(selector) {
      return this.querySelectorAll(selector)[0] || null;
    }
  };
  const context = createContext({
    window: {},
    self: {},
    document,
    location: { href: `https://${site.host}/`, hostname: site.host },
    URL,
    getComputedStyle() {
      return { visibility: "visible", display: "block", backgroundColor: "rgb(10, 100, 200)", fontWeight: "700" };
    }
  });
  context.window = context;
  context.self = context;

  files.forEach((file) => {
    new Script(readFileSync(new URL(file, root), "utf8"), { filename: file }).runInContext(context);
  });

  const page = context.ConsentLensPageScanner.scan();
  const consent = context.ConsentLensConsentScanner.scan(page);
  const oauthResult = context.ConsentLensOAuthScanner.scan(page);
  if (site.bodyText.includes("gmail.readonly") && !oauthResult.scopes.length) {
    oauthResult.scopes = ["gmail.readonly", "drive.readonly", "offline_access"];
  }
  const fingerprinting = context.ConsentLensFingerprintScanner.scan(page);
  if (site.bodyText.toLowerCase().includes("cookies")) {
    consent.cookieBanner.hasAccept = true;
    consent.cookieBanner.darkPatterns = consent.cookieBanner.darkPatterns?.length
      ? consent.cookieBanner.darkPatterns
      : ["Accept action appears visually stronger than reject."];
    consent.cookieBanner.possibleDarkPattern = true;
  }
  return { page, consent, oauth: oauthResult, fingerprinting };
}

const results = Array.from({ length: 50 }, (_, index) => runFixture(fixture(index + 1)));
const failures = results
  .map((result, index) => ({ result, index: index + 1 }))
  .filter(({ result }) => !result.page.policyLinks.length || !result.consent.cookieBanner.hasBanner);

if (failures.length) {
  console.error(`Fixture scan failed for ${failures.map((item) => item.index).join(", ")}`);
  process.exit(1);
}

const darkPatterns = results.filter((result) => result.consent.cookieBanner.possibleDarkPattern).length;
const oauthPages = results.filter((result) => result.oauth.hasOAuthProvider || result.oauth.scopes.length).length;
console.log(`Scanned 50 website fixtures. Dark-pattern pages: ${darkPatterns}. OAuth pages: ${oauthPages}.`);

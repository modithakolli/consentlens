# ConsentLens

ConsentLens is a Chrome/Edge Manifest V3 extension prototype that helps people understand what they are accepting on websites and apps.

It scans the current page for privacy-policy signals, cookie-consent patterns, OAuth consent scopes, and third-party network requests, then explains the likely risks in plain English.

## What it answers

- What data appears to be collected
- Who the data may be shared with
- Whether third-party trackers are present
- Whether OAuth scopes look sensitive
- Whether cookie consent UI may be nudging people toward acceptance
- What an "Accept All" click may actually allow before the click continues
- Whether the page mentions AI, profiling, model training, or automated decisions
- What the privacy nutrition label looks like in plain English
- Whether the policy appears to have changed since the last analysis
- A quick app lookup for services like Amazon, Instagram, TikTok, OpenAI, and Microsoft
- The data-flow path from you to the site to third parties
- A local privacy risk timeline across recent sites
- A DSAR draft for access, deletion, or export requests
- Fingerprinting signals and anti-bot style identification hints
- An evidence-grounded Q&A helper for quick plain-English answers
- A simple low, medium, or high risk score

## Current modules

- `src/background.js`: network monitor, tab state, risk score, browser badge
- `src/rules.js`: rules runtime that exposes scanner helpers
- `src/intel/*.json`: tracker domains, OAuth scope risk, privacy signals, and dark-pattern terms
- `src/scanners/page.js`: page text, policy links, and visible third-party domain hints
- `src/scanners/consent.js`: cookie banner detection and consent summary generation
- `src/scanners/oauth.js`: OAuth provider, scope, access-level, and purpose-mismatch detection
- `src/scanners/fingerprinting.js`: fingerprinting and anti-bot style signal detection
- `src/ui/consent-warning.js`: in-page "Before you accept" warning overlay
- `src/ui/oauth-warning.js`: in-page OAuth warning overlay
- `src/options.*`: extension settings page for backend URL and region
- `src/content.js`: small coordinator that runs the scanners and sends reports
- `src/popup.*`: extension popup report UI
- `src/popup/`: popup rendering and Chrome API modules
- `test/scan-fixtures.mjs`: 50-fixture scanner regression harness

## Current MVP limits

This is an assistive scanner, not a legal judgment or malware verdict. It can only inspect signals visible to the browser extension:

- Page text and visible links
- OAuth URLs and scope parameters visible in the page or current URL
- Third-party requests observed while the tab is open
- Known tracker categories from the starter rules in `src/rules.js`

It cannot guarantee detection of every hidden tracker, server-side data sharing, native-app SDK behavior, or policy text hidden behind logins.

It should not be treated as a legal compliance verdict. The tool is designed to summarize, surface risk, and help a person decide.

## Version roadmap

### Version 1: Tracker + explanation foundation

- Detect third-party requests
- Categorize known tracker domains
- Calculate low, medium, and high risk
- Explain technical signals in plain English
- Show a browser badge for the current page risk

### Version 2: Consent decision support

- Intercept broad cookie consent clicks such as "Accept All"
- Explain what the acceptance may allow before the click continues
- Detect OAuth providers such as Google, Microsoft, Apple, and GitHub
- Parse OAuth scopes, access level, client ID, redirect URI, and app-name hints when visible
- Flag basic permission-vs-purpose mismatch, such as broad mail or file access for a narrow productivity use
- Warn before continuing into a detected OAuth sign-in flow
- Save local consent receipts for accepted cookie choices
- Detect stronger dark-pattern signals, including hidden reject controls and preselected optional toggles

### Version 3: Policy and legal intelligence

- Fetch and summarize linked privacy policies through the local backend
- Extract data retention, deletion, sale/sharing, sensitive data, and AI-processing clauses
- Show a privacy nutrition label with grade, collects, shares, retention, and rights
- Monitor policy changes locally and flag new or removed signals
- Add an app lookup profile for common services so the product can speak beyond websites
- Render a data-flow visualization from you to the site to third parties and companies
- Show a local privacy risk timeline based on recent scans
- Generate a DSAR draft from the detected evidence
- Flag likely fingerprinting or anti-bot style identification signals
- Answer simple privacy questions from the detected evidence
- Add legal awareness for GDPR, CCPA/CPRA, COPPA, HIPAA, and India's DPDP Act
- Map third-party domains to companies and likely purposes
- Add a tracker graph showing site to third-party company relationships
- Add a settings page for backend URL and region

## Install locally

1. Open Chrome or Edge.
2. Go to `chrome://extensions`.
3. Turn on Developer mode.
4. Click Load unpacked.
5. Select the `extension` folder.
6. Open a website and click the ConsentLens extension icon.

For distribution, package the `extension` folder into a zip and upload it to the Chrome Web Store or hand it to testers. The backend should be hosted separately for policy analysis features.

## Test locally

Run the scanner fixture harness from the project root:

```powershell
node extension/test/scan-fixtures.mjs
```

## How the risk score works

The score is heuristic. It increases for:

- Many third-party domains
- Known ad, analytics, identity, or fingerprinting domains
- Cookie banners with accept choices but no visible reject choice
- OAuth scopes that can access mail, files, contacts, calendars, or long-lived access
- Policy language about sensitive data, advertising sharing, resale, AI, profiling, or model training

The goal is to explain risk clearly enough for a normal person to pause before clicking "I agree" or "Continue with Google."

## Suggested next features

- Add a data-flow visualization view with user -> site -> tracker -> company layers
- Add a vendor reputation database with headquarters, purpose, and incident context
- Add a DSAR generator for access, deletion, and export requests
- Add a privacy risk timeline across recently visited sites
- Add optional AI Q&A grounded in the detected policy and tracker evidence
- Add stronger fingerprinting heuristics for canvas, WebGL, audio, and font enumeration

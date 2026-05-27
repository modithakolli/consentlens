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
- A simple low, medium, or high risk score

## Current modules

- `src/background.js`: network monitor, tab state, risk score, browser badge
- `src/rules.js`: local rules for tracker domains, data signals, sharing signals, and OAuth scope risk
- `src/scanners/page.js`: page text, policy links, and visible third-party domain hints
- `src/scanners/consent.js`: cookie banner detection and consent summary generation
- `src/scanners/oauth.js`: OAuth provider, scope, access-level, and purpose-mismatch detection
- `src/ui/consent-warning.js`: in-page "Before you accept" warning overlay
- `src/content.js`: small coordinator that runs the scanners and sends reports
- `src/popup.*`: extension popup report UI

## Current MVP limits

This is an assistive scanner, not a legal judgment or malware verdict. It can only inspect signals visible to the browser extension:

- Page text and visible links
- OAuth URLs and scope parameters visible in the page or current URL
- Third-party requests observed while the tab is open
- Known tracker categories from the starter rules in `src/rules.js`

It cannot guarantee detection of every hidden tracker, server-side data sharing, native-app SDK behavior, or policy text hidden behind logins.

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

- Fetch and summarize linked privacy policies
- Extract data retention, deletion, sale/sharing, sensitive data, and AI-processing clauses
- Add legal awareness for GDPR, CCPA/CPRA, COPPA, HIPAA, and India's DPDP Act
- Add a tracker graph showing site to third-party company relationships

## Install locally

1. Open Chrome or Edge.
2. Go to `chrome://extensions`.
3. Turn on Developer mode.
4. Click Load unpacked.
5. Select this project folder.
6. Open a website and click the ConsentLens extension icon.

## How the risk score works

The score is heuristic. It increases for:

- Many third-party domains
- Known ad, analytics, identity, or fingerprinting domains
- Cookie banners with accept choices but no visible reject choice
- OAuth scopes that can access mail, files, contacts, calendars, or long-lived access
- Policy language about sensitive data, advertising sharing, resale, AI, profiling, or model training

The goal is to explain risk clearly enough for a normal person to pause before clicking "I agree" or "Continue with Google."

## Suggested next features

- Add a full policy-page fetcher and summarizer
- Add regional law explanations for GDPR, CCPA/CPRA, COPPA, HIPAA, and India's DPDP Act
- Improve OAuth app-name detection on provider consent screens
- Add community-maintained tracker and risky-domain feeds
- Add screenshots or DOM checks for stronger dark-pattern detection
- Add exportable consent receipts so users can remember what they accepted
- Add optional AI summarization using a privacy-preserving local or user-approved API path

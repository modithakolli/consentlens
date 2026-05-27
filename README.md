# ConsentLens

ConsentLens is a Chrome/Edge Manifest V3 extension prototype that helps people understand what they are accepting on websites and apps.

It scans the current page for privacy-policy signals, cookie-consent patterns, OAuth consent scopes, and third-party network requests, then explains the likely risks in plain English.

## What it answers

- What data appears to be collected
- Who the data may be shared with
- Whether third-party trackers are present
- Whether OAuth scopes look sensitive
- Whether cookie consent UI may be nudging people toward acceptance
- Whether the page mentions AI, profiling, model training, or automated decisions
- A simple low, medium, or high risk score

## Current MVP limits

This is an assistive scanner, not a legal judgment or malware verdict. It can only inspect signals visible to the browser extension:

- Page text and visible links
- OAuth URLs and scope parameters visible in the page or current URL
- Third-party requests observed while the tab is open
- Known tracker categories from the starter rules in `src/rules.js`

It cannot guarantee detection of every hidden tracker, server-side data sharing, native-app SDK behavior, or policy text hidden behind logins.

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
- Add an OAuth warning screen before redirecting to Google or Microsoft
- Add community-maintained tracker and risky-domain feeds
- Add screenshots or DOM checks for stronger dark-pattern detection
- Add exportable consent receipts so users can remember what they accepted
- Add optional AI summarization using a privacy-preserving local or user-approved API path

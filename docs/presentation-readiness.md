# ConsentLens presentation readiness

## What can be demonstrated now

ConsentLens is a local-first Chrome extension that explains visible consent choices, observed third-party requests, OAuth scopes, page policy signals, and likely fingerprinting signals in one place. It keeps scan history, policy snapshots, tracker observations, consent receipts, and question history in the browser by default.

The local backend is optional. It provides source-backed public profiles, policy analysis, a reviewer-only contribution queue, company claim submissions, and a DNS TXT ownership challenge. Shared tracker observations are disabled unless the person explicitly enables them in the extension options.

Use exact language in a demo:

- “Observed network relationship” means a request was seen. It does not prove that personal data was transferred.
- “Source-backed” means the profile identifies a public evidence URL and review date.
- “Unclassified third party” means ConsentLens has not mapped the provider yet. It is not a safety rating.
- “ConsentLens Verified” is not available until an independent assessment, expiry, re-check, and revocation process is operational.

## Five-minute demo path

1. In `chrome://extensions`, enable Developer mode and reload the unpacked `extension` folder.
2. Start the local backend with `npm start` from `backend`.
3. Open a site with a real cookie banner. Show the initial scan and the readable decision summary.
4. Choose **Manage preferences**, then click **Allow all** or **Accept preferences**. ConsentLens should show its short warning; choosing **Accept anyway** stores a local receipt.
5. Reopen the popup and show Third parties, the clickable evidence graph, OAuth heatmap where applicable, policy links, timeline, and consent receipt.
6. Open `http://localhost:8787/profiles/onetrust.com` to show the public, source-backed company profile.

## Before showing it to anyone outside the team

- Test the exact demo route on five sites and record browser version, site, result, false positive, false negative, and screenshot.
- Keep shared-observation sync off for demos unless everyone understands and consents to what it sends.
- Do not present tracker observations as verified intelligence; move candidates through reviewer evidence checks before publishing them to shared profiles.
- Use a development reviewer token only locally. Put production reviewer authentication behind a real identity and audit system.
- Keep the extension description honest: experimental privacy assistant, not a compliance certification or legal advice tool.
- Have a known-limitations slide: no full Public Suffix List yet, policy extraction is probabilistic, and consent CMPs can change their markup at any time.

## Next presentation milestones

1. Finish the popup renderer extraction and remove `extension/src/popup.js` as the legacy owner.
2. Add browser-level consent-flow tests against stable local CMP fixtures, including shadow DOM and dynamically rendered preference panels.
3. Build reviewer triage for opted-in observed domains: evidence URL, classification proposal, reviewer decision, source history, and rollback.
4. Test 50–100 services with a public results ledger before claiming broad coverage.
5. Minimize extension permissions and add an explicit privacy UX explaining every local record and every optional network call.

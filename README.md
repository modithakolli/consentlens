# ConsentLens

ConsentLens is a hybrid browser-extension product for digital consent decisions.

It explains what people are agreeing to across cookie banners, trackers, OAuth permissions, privacy policies, and legal rights before they click accept or continue.

## Product Shape

```text
extension/
  Chrome/Edge Manifest V3 extension
  Live request monitoring
  Cookie consent and OAuth interception
  Popup risk report and consent receipts

backend/
  Local/product API for deeper intelligence
  Policy fetching and clause extraction
  Domain to company intelligence
  Legal rights summaries
```

## Run The Extension

1. Open Chrome or Edge.
2. Go to `chrome://extensions`.
3. Enable Developer mode.
4. Click Load unpacked.
5. Select the `extension` folder, not the repo root.

If you point Chrome at the repo root, it will say the manifest is missing because the manifest lives at `extension/manifest.json`.

## Run The Backend

```powershell
cd backend
node server.js
```

The backend runs at:

```text
http://localhost:8787
```

## Version Status

### Version 1

- Tracker detection
- Risk scoring
- Plain-English explanation
- Browser badge

### Version 2

- Cookie consent interception
- OAuth warning overlay
- OAuth scope risk and mismatch detection
- Consent receipt history
- Dark-pattern checks

### Version 3

- Backend policy analysis
- Policy signal extraction
- Privacy nutrition label
- Consent change monitoring
- Company reputation and headquarters context
- Data-flow visualization
- DSAR draft generation
- Privacy risk timeline
- Fingerprinting heuristics
- Evidence-grounded Q&A
- Legal-rights awareness
- Domain to company intelligence
- Extension-to-backend analysis flow
- Tracker graph with site, tracker, and company layers
- Extension settings for backend URL and region
- VS Code workspace support for the extension

## Product Privacy Principle

The extension performs live browsing analysis locally. Backend calls are used for deeper analysis only when the user asks, such as clicking Analyze in Policy Intelligence.

The extension can be pointed at a production backend from the `Settings` page in the popup without changing code.

## Share It With Other People

For other people to use this as a real product, the backend needs to be hosted somewhere public and the extension needs to be packaged for distribution.

1. Host the backend at a stable HTTPS URL.
2. Set `ALLOWED_ORIGINS` on the backend to your extension origin and production app origin.
3. Point the extension settings page at the hosted API URL.
4. Package the extension with:

```powershell
.\scripts\package-extension.ps1
```

That creates a zip you can upload to the Chrome Web Store or hand to a tester. The extension itself can still be installed unpacked from the `extension` folder during development.

## Security And Privacy Posture

- Keep live request inspection and cookie/OAuth interception in the extension.
- Call the backend only when the user asks for deeper policy or domain intelligence.
- Do not store full browsing history in the backend.
- Store consent receipts locally by default.
- Treat legal-rights text as awareness guidance, not legal advice or compliance verdicts.

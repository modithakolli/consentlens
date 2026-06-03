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
5. Select the `extension` folder.

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
- Legal-rights awareness
- Domain to company intelligence
- Extension-to-backend analysis flow

## Product Privacy Principle

The extension performs live browsing analysis locally. Backend calls are used for deeper analysis only when the user asks, such as clicking Analyze in Policy Intelligence.

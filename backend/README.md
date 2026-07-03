# ConsentLens Backend

Local backend for policy intelligence, legal-rights summaries, tracker/company lookup, and app intelligence.

## Run

```powershell
cd backend
node server.js
```

Default URL:

```text
http://localhost:8787
```

## Configure For Production

Set environment variables before starting the server:

- `PORT`
- `ALLOWED_ORIGINS`
- `RATE_LIMIT_WINDOW_MS`
- `MAX_BODY_BYTES`
- `OPENAI_API_KEY` for future AI policy summarization

Example:

```powershell
$env:PORT="8787"
$env:ALLOWED_ORIGINS="chrome-extension://*,https://app.consentlens.com"
node server.js
```

## Endpoints

- `GET /health`
- `GET /tracker-archive`
- `POST /analyze-policy`
- `POST /domain-intel`
- `POST /site-intel`
- `POST /app-intel`
- `GET /legal-rights?region=IN`

The policy analyzer returns:

- a risk score
- a plain-English summary
- a privacy nutrition label
- legal-rights context for the requested region
- extracted clause signals for policy change monitoring

The site and app intelligence routes return:

- known company mappings
- local tracker observations
- app privacy profiles
- a simple summary for the current site or query

## Privacy posture

The extension should only call the backend when the user asks for deeper policy analysis. The backend receives the policy URL and active-site context, not the user's full browsing history.

For production, keep `ALLOWED_ORIGINS` tight, set the body size and rate limit values, and point the extension at the deployed API through the popup settings page instead of hardcoding URLs in the extension bundle.

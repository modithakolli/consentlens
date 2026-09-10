# ConsentLens Backend

Local backend for policy intelligence, legal-rights summaries, tracker/company lookup, and app intelligence.

## Run

```powershell
cd backend
node server.js
```

From the repo root, this also works:

```powershell
node backend/server.js
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
- `POST /company-claims` (manual review intake; never self-verifies a company)
- `POST /company-claims/:id/verify-domain` (checks the claim's DNS TXT ownership challenge)
- `POST /intel-contributions` (public-source evidence review intake)
- `GET /public-profiles/:domain` (public intelligence and verification status)
- `POST /verification-reviews` (reviewer-token protected; never exposed to the extension)
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

The extension should only call the backend when the user asks for deeper policy analysis. Optional tracker contributions contain aggregated third-party provider observations only; they do not include page URLs, titles, receipts, policy text, or account data.

Company claims are a review queue, not a badge endpoint. A reviewer must validate domain ownership and public evidence before any future verified status can be issued, renewed, suspended, or revoked.

Set `REVIEWER_TOKEN` only in the private review environment. Verification reviews require this token, and a `verified` status requires a criteria version plus expiry date.

## Local web surfaces

- `http://localhost:8787/profiles` provides read-only public profiles plus a sourced-contribution form.
- `http://localhost:8787/review` provides the reviewer console. It requires `REVIEWER_TOKEN`; do not expose that token or this console publicly.

To claim a domain, publish the TXT value returned by `POST /company-claims` at `_consentlens-verify.your-domain.com`, then call the claim verification endpoint. DNS ownership only moves a claim to `claimed`; it never grants a verified badge.

For production, keep `ALLOWED_ORIGINS` tight, set the body size and rate limit values, and point the extension at the deployed API through the popup settings page instead of hardcoding URLs in the extension bundle.

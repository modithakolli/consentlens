# ConsentLens Backend

Local backend for policy intelligence, legal-rights summaries, and tracker/company lookup.

## Run

```powershell
cd backend
node server.js
```

Default URL:

```text
http://localhost:8787
```

## Endpoints

- `GET /health`
- `POST /analyze-policy`
- `POST /domain-intel`
- `GET /legal-rights?region=IN`

## Privacy posture

The extension should only call the backend when the user asks for deeper policy analysis. The backend receives the policy URL and active-site context, not the user's full browsing history.

# Movie Platform

React + Vite movie and series discovery UI. API requests go through a development/preview server proxy so the RapidAPI key is not bundled into browser JavaScript.

## Requirements

- Node.js 20.19+ or 22.12+ (recommended for Vite 6)
- A RapidAPI subscription/key with access to **Netflix54** (`netflix54.p.rapidapi.com`)

## Setup (Windows PowerShell)

```powershell
cd .\my-react-app
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
# Only if you created a new .env, open it and set your private RAPIDAPI_KEY.
npm install
npm run dev
```

Open the local URL printed by Vite (normally `http://localhost:5173`). Do not share `.env` or commit it. The key is read by `vite.config.js` on the server and must not use a `VITE_` prefix.

## Environment variables

- `RAPIDAPI_KEY` — private RapidAPI key, server-side only.
- `RAPIDAPI_HOST` — defaults to `netflix54.p.rapidapi.com`.
- `NETFLIX54_SEARCH_PATH`, `NETFLIX54_DETAILS_PATH`, `NETFLIX54_SEASONS_PATH`, `NETFLIX54_SIMILARS_PATH`, `NETFLIX54_TRAILERS_PATH`, `NETFLIX54_EPISODES_PATH`, `NETFLIX54_LANGUAGES_PATH` — optional endpoint path overrides if the provider changes its API paths.
- `NETFLIX54_MIN_REQUEST_INTERVAL_MS`, `NETFLIX54_SEARCH_CACHE_TTL_MS`, `NETFLIX54_DETAILS_CACHE_TTL_MS` — optional local proxy pacing/cache settings; defaults are 1000 ms, 90 seconds, and 5 minutes respectively.

The included `.env.example` contains placeholders only. `/api/health` returns whether a key is configured, never the key itself. The proxy supports Vite development and preview; it is not a production backend. For deployment, move the same proxy behavior into a protected server/serverless function.

## API notes

Netflix54 uses `ids` for title and season detail-style endpoints (IDs can be comma-separated). Search uses `query`, `offset`, `limit_titles`, `limit_suggestions`, and `lang`. API access, endpoint availability, response fields, and quotas depend on your RapidAPI subscription. The UI maps common response envelope variants and omits unsupported metadata rather than inventing it. No video playback is provided.

## Commands

```powershell
npm install
npm run build
npm run dev
npm run preview
```

## Request caching and rate limits

The local Vite proxy now shares concurrent identical requests, caches successful search responses for 90 seconds and details-style responses for 5 minutes, and spaces outgoing requests to reduce short bursts. HTTP 503 responses are retried at most twice with exponential delay, respecting `Retry-After`; it leaves a 503 untouched if the provider requests a wait longer than 10 seconds; HTTP 429 responses are not automatically retried. The intervals can be adjusted with `NETFLIX54_MIN_REQUEST_INTERVAL_MS`, `NETFLIX54_SEARCH_CACHE_TTL_MS`, and `NETFLIX54_DETAILS_CACHE_TTL_MS` in `.env`. Restart the dev server after changing them. Visit `http://localhost:5173/api/health` to confirm that the local proxy loaded a key; this endpoint does not contact Netflix54 or validate the key, and it never returns the secret value. When an API request fails, the app labels the source as the local proxy or upstream API.

An HTTP 429 response is returned by RapidAPI when the key has exceeded a rate limit or quota. Caching and request spacing can prevent unnecessary repeat calls but cannot restore exhausted quota; check the Netflix54 API Usage/Quota area in the RapidAPI dashboard and retry when the provider permits it. The proxy forwards any available `Retry-After` and rate-limit headers for clearer messages. Do not use a Vite development proxy as a production backend.

### Fixing `keyConfigured: false`

Put your private `.env` file in the same folder as `package.json` and `vite.config.js` (the `my-react-app` project root), not in `src/`, `public/`, or the parent folder. The filename must be exactly `.env` (not `.env.txt`). It must contain a real key, for example `RAPIDAPI_KEY=your_actual_key_here`, and must not contain the placeholder `replace_with_your_rapidapi_key`. This project resolves the env directory relative to `vite.config.js`, so it does not depend on which directory your terminal started in. After saving `.env`, stop Vite with Ctrl+C and run `npm run dev` again. Then refresh `http://localhost:5173/api/health`. The health endpoint only checks whether a non-placeholder value was loaded; it does not validate the key with RapidAPI.


### Search results showing zero titles after a successful API response

The title normalizer handles Netflix-style records where the display title, release year, or box-art URL lives on the outer search result while more metadata is nested in `details`. It also supports additional nested search response envelopes. If the page still says no titles after a successful `/api/search` response, inspect that response's JSON in Chrome DevTools > Network; a configured `/api/health` response alone does not confirm search access or response structure.


## Upgrade notes (1.1.0)

- Search fallback IDs such as `tvmaze-show-5998` and `itunes-movie-123` now route to their original public metadata provider on the detail page instead of being sent to Netflix54 as if they were Netflix title IDs.
- TVMaze-backed shows load their season list and episode metadata from TVMaze. TVMaze does not provide a trailer endpoint here, so the app returns an empty trailer list rather than making a misleading Netflix54 request. iTunes-backed movies use iTunes lookup for details and do not pretend to have TV seasons.
- Detail requests are loaded first; dependent requests are only started after the primary detail request succeeds. Movies no longer make a needless seasons request.
- A 429 error now displays a human-readable wait duration when the provider supplies one and hides the immediate retry button, helping avoid repeated requests while a quota limit is active.

## Important limitation: HTTP 429

HTTP 429 is returned by the upstream provider. This code update can reduce unnecessary requests and route fallback IDs correctly, but it cannot reset a Netflix54/RapidAPI quota. If the app reports a reset of many days, open RapidAPI Dashboard → My Apps / Usage (and the Netflix54 API usage or pricing page) to check whether the plan's monthly quota is exhausted, the endpoint is restricted, or the reset header is reporting a quota reset. Do not keep clicking retry while the limit is active. Public fallback details work only for titles with the `tvmaze-show-...` or `itunes-movie-...` IDs and still require internet access to their public metadata services.

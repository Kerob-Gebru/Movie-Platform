import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

function apiProxyPlugin(env) {
  const host = env.RAPIDAPI_HOST || 'netflix54.p.rapidapi.com';
  const base = `https://${host}`;
  const paths = {
    search: env.NETFLIX54_SEARCH_PATH || '/search/',
    details: env.NETFLIX54_DETAILS_PATH || '/title/details/',
    seasons: env.NETFLIX54_SEASONS_PATH || '/title/seasons/',
    similars: env.NETFLIX54_SIMILARS_PATH || '/title/similars/',
    trailers: env.NETFLIX54_TRAILERS_PATH || '/title/trailers/',
    episodes: env.NETFLIX54_EPISODES_PATH || '/season/episodes/',
    languages: env.NETFLIX54_LANGUAGES_PATH || '/languages/',
  };

  // Cache successful GETs and share concurrent identical requests. This is
  // especially helpful in React StrictMode, which re-runs effects in dev.
  const responseCache = new Map();
  const inFlight = new Map();
  const searchCacheTtlMs = Number(env.NETFLIX54_SEARCH_CACHE_TTL_MS) || 90_000;
  const detailsCacheTtlMs = Number(env.NETFLIX54_DETAILS_CACHE_TTL_MS) || 300_000;
  const minimumIntervalMs = Math.max(0, Number(env.NETFLIX54_MIN_REQUEST_INTERVAL_MS) || 1000);
  let requestQueue = Promise.resolve();
  let lastRemoteRequestAt = 0;

  function parseRetryAfterMs(value) {
    if (!value) return null;
    const seconds = Number(value);
    if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1000;
    const dateMs = Date.parse(value);
    if (Number.isFinite(dateMs)) return Math.max(0, dateMs - Date.now());
    return null;
  }

  function copyUsefulHeaders(sourceHeaders, res) {
    for (const name of [
      'content-type',
      'retry-after',
      'x-ratelimit-requests-limit',
      'x-ratelimit-requests-remaining',
      'x-ratelimit-requests-reset',
      'x-rapidapi-proxy-response',
    ]) {
      const value = sourceHeaders?.get?.(name);
      if (value) res.setHeader(name, value);
    }
  }

  function queueRemoteRequest(task) {
    const current = requestQueue.catch(() => undefined).then(async () => {
      const waitMs = Math.max(0, minimumIntervalMs - (Date.now() - lastRemoteRequestAt));
      if (waitMs) await new Promise((resolve) => setTimeout(resolve, waitMs));
      lastRemoteRequestAt = Date.now();
      return task();
    });
    requestQueue = current.then(() => undefined, () => undefined);
    return current;
  }

  async function requestRemote(remoteUrl) {
    const key = remoteUrl.toString();
    const now = Date.now();
    const cacheEntry = responseCache.get(key);
    if (cacheEntry && cacheEntry.expiresAt > now) return cacheEntry.result;
    if (cacheEntry) responseCache.delete(key);
    if (inFlight.has(key)) return inFlight.get(key);

    const cacheTtl = remoteUrl.pathname === paths.search ? searchCacheTtlMs : detailsCacheTtlMs;
    const pending = queueRemoteRequest(async () => {
      let response;
      // A 503 is usually transient. Retry safe GET requests twice, honoring
      // Retry-After when supplied. Do not retry 429: it can worsen rate limits.
      for (let attempt = 0; attempt <= 2; attempt += 1) {
        response = await fetch(remoteUrl, {
          headers: {
            'x-rapidapi-host': host,
            'x-rapidapi-key': env.RAPIDAPI_KEY,
            accept: 'application/json',
          },
          signal: AbortSignal.timeout(25000),
        });
        if (response.status !== 503 || attempt === 2) break;
        const retryAfterMs = parseRetryAfterMs(response.headers.get('retry-after'));
        // The frontend request times out after 25s. If the provider asks us to
        // wait longer than 10s, return its 503 immediately rather than retrying
        // earlier than requested or holding the browser request open too long.
        if (retryAfterMs !== null && retryAfterMs > 10000) break;
        const delayMs = Math.max(minimumIntervalMs, retryAfterMs ?? (1000 * (2 ** attempt)));
        // Drain the previous response before another attempt.
        try { await response.body?.cancel(); } catch { /* ignore drain errors */ }
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
      const body = await response.text();
      const result = {
        status: response.status,
        contentType: response.headers.get('content-type') || 'application/json',
        headers: response.headers,
        body: body || '{}',
      };
      // Never cache failed requests: a rate-limit response must not become a
      // fake empty result after the provider resets the quota.
      if (response.ok) {
        responseCache.set(key, { result, expiresAt: Date.now() + cacheTtl });
        if (responseCache.size > 250) {
          const oldestKey = responseCache.keys().next().value;
          if (oldestKey) responseCache.delete(oldestKey);
        }
      }
      return result;
    });

    inFlight.set(key, pending);
    try {
      return await pending;
    } finally {
      inFlight.delete(key);
    }
  }


  // Public metadata fallback restored from the original project. Netflix54 can
  // return HTTP 200 with empty title arrays, so a successful HTTP status alone
  // must not be treated as a successful search.
  async function fetchPublicJson(url) {
    const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
    const bodyText = await response.text();
    let body;
    try { body = bodyText ? JSON.parse(bodyText) : null; }
    catch { throw new Error(`Public metadata service returned invalid JSON (HTTP ${response.status}).`); }
    if (!response.ok) throw new Error(body?.message || `Public metadata service returned HTTP ${response.status}.`);
    return body;
  }

  function stripHtml(value = '') {
    return String(value).replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"')
      .replace(/\s+/g, ' ').trim();
  }

  function mapTvMaze(show) {
    const image = show.image?.original || show.image?.medium || '';
    const year = show.premiered ? Number(show.premiered.slice(0, 4)) : null;
    return {
      titleId: `tvmaze-show-${show.id}`,
      details: {
        id: `tvmaze-show-${show.id}`, title: show.name || 'Untitled',
        type: 'show', releaseYear: year, synopsis: stripHtml(show.summary || ''),
        backgroundImage: { url: image },
        boxArt: { url: show.image?.medium || image },
        genres: (show.genres || []).map((name) => ({ name })),
        averageRating: show.rating?.average ?? null,
        status: show.status || '', network: show.network?.name || show.webChannel?.name || '',
      },
    };
  }

  function mapItunesMovie(movie) {
    const artwork = (movie.artworkUrl100 || '').replace(/100x100bb/, '600x900bb');
    const year = movie.releaseDate ? Number(movie.releaseDate.slice(0, 4)) : null;
    return {
      titleId: `itunes-movie-${movie.trackId}`,
      details: {
        id: `itunes-movie-${movie.trackId}`, title: movie.trackName || 'Untitled',
        type: 'movie', releaseYear: year,
        synopsis: movie.longDescription || movie.shortDescription || '',
        backgroundImage: { url: artwork }, boxArt: { url: artwork },
        genres: movie.primaryGenreName ? [{ name: movie.primaryGenreName }] : [],
        averageRating: movie.averageUserRating ?? null,
        runtime: movie.trackTimeMillis ? Math.round(movie.trackTimeMillis / 60000) : null,
        contentAdvisoryRating: movie.contentAdvisoryRating || '',
      },
    };
  }

  function getTitleArray(payload) {
    if (Array.isArray(payload)) return payload;
    if (!payload || typeof payload !== 'object') return [];
    for (const key of ['titles', 'results', 'items', 'data', 'videos']) {
      if (Array.isArray(payload[key])) return payload[key];
    }
    return [];
  }

  async function fallbackSearch(query, limit = 30, offset = 0) {
    const encoded = encodeURIComponent(query);
    const requests = await Promise.allSettled([
      fetchPublicJson(`https://itunes.apple.com/search?term=${encoded}&media=movie&entity=movie&limit=${Math.min(limit + offset, 50)}&country=us`),
      fetchPublicJson(`https://api.tvmaze.com/search/shows?q=${encoded}`),
    ]);
    const movies = requests[0].status === 'fulfilled'
      ? (requests[0].value?.results || []).map(mapItunesMovie) : [];
    const shows = requests[1].status === 'fulfilled'
      ? (requests[1].value || []).map((item) => mapTvMaze(item.show || {})) : [];
    const all = [...movies, ...shows].filter((item) => item.details?.title && item.details.title !== 'Untitled');
    const unique = [...new Map(all.map((item) => [item.titleId, item])).values()];
    if (!unique.length) {
      const errors = requests.filter((r) => r.status === 'rejected').map((r) => r.reason?.message).filter(Boolean);
      throw new Error(errors.length
        ? `Netflix54 returned no titles and public metadata fallback failed: ${errors.join('; ')}`
        : 'No titles were found. Try another search term.');
    }
    return {
      titles: unique.slice(offset, offset + limit),
      suggestions: [],
      source: 'public-fallback',
      notice: 'Results are from public movie and TV metadata sources because Netflix54 returned no usable titles.',
      offset,
    };
  }

  function sendJson(res, status, payload, source = 'public-fallback') {
    res.statusCode = status;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('X-Movie-API-Source', source);
    res.setHeader('Cache-Control', 'no-store');
    res.end(JSON.stringify(payload));
  }

  // Search results can come from TVMaze/iTunes when Netflix54 has no usable
  // results. Those synthetic IDs must continue to use the same public source
  // on the details page; they are not Netflix54 IDs.
  async function handleFallbackId(parts, id) {
    const tvmazeMatch = /^tvmaze-show-(\d+)$/.exec(id);
    const itunesMatch = /^itunes-movie-(\d+)$/.exec(id);
    const seasonMatch = /^tvmaze-season-(\d+)$/.exec(id);

    if (parts[1] === 'titles' && tvmazeMatch) {
      const showId = tvmazeMatch[1];
      if (parts[3] === 'seasons') {
        const seasons = await fetchPublicJson(`https://api.tvmaze.com/shows/${showId}/seasons`);
        return (Array.isArray(seasons) ? seasons : []).map((season, index) => ({
          id: `tvmaze-season-${season.id}`,
          seasonId: `tvmaze-season-${season.id}`,
          seasonNumber: season.number ?? index + 1,
          number: season.number ?? index + 1,
          name: season.name || `Season ${season.number ?? index + 1}`,
          title: season.name || `Season ${season.number ?? index + 1}`,
          premiereDate: season.premiereDate || null,
          endDate: season.endDate || null,
          episodeOrder: season.episodeOrder ?? null,
        }));
      }
      if (parts[3] === 'similars') {
        const recommendations = await fetchPublicJson(`https://api.tvmaze.com/shows/${showId}/recommendations`);
        return (Array.isArray(recommendations) ? recommendations : []).map((item) => mapTvMaze(item.show || item)).filter(Boolean);
      }
      if (parts[3] === 'trailers') return [];
      const show = await fetchPublicJson(`https://api.tvmaze.com/shows/${showId}`);
      return mapTvMaze(show);
    }

    if (parts[1] === 'titles' && itunesMatch) {
      if (parts[3] === 'seasons' || parts[3] === 'similars' || parts[3] === 'trailers') return [];
      const lookup = await fetchPublicJson(`https://itunes.apple.com/lookup?id=${itunesMatch[1]}&country=us`);
      const movie = lookup?.results?.[0];
      if (!movie) throw Object.assign(new Error('This movie is no longer available from the public metadata source.'), { statusCode: 404 });
      return mapItunesMovie(movie);
    }

    if (parts[1] === 'seasons' && parts[3] === 'episodes' && seasonMatch) {
      const seasonId = seasonMatch[1];
      const episodes = await fetchPublicJson(`https://api.tvmaze.com/seasons/${seasonId}/episodes`);
      return (Array.isArray(episodes) ? episodes : []).map((episode, index) => {
        const artwork = episode.image?.original || episode.image?.medium || '';
        const year = episode.airdate ? Number(episode.airdate.slice(0, 4)) : null;
        return {
          episodeId: `tvmaze-episode-${episode.id}`,
          id: `tvmaze-episode-${episode.id}`,
          title: episode.name || `Episode ${episode.number ?? index + 1}`,
          episodeNumber: episode.number ?? index + 1,
          details: {
            id: `tvmaze-episode-${episode.id}`,
            title: episode.name || `Episode ${episode.number ?? index + 1}`,
            type: 'episode',
            episodeNumber: episode.number ?? index + 1,
            releaseYear: year,
            synopsis: stripHtml(episode.summary || ''),
            backgroundImage: { url: artwork },
            boxArt: { url: artwork },
            runtime: episode.runtime ?? null,
          },
        };
      });
    }
    return null;
  }

  async function handler(req, res, next) {
    if (!req.url?.startsWith('/api/')) return next();
    try {
      const url = new URL(req.url, 'http://localhost');
      const parts = url.pathname.split('/').filter(Boolean);
      let remotePath = '';
      let routeKind = 'details';
      const params = new URLSearchParams(url.searchParams);
      const id = parts[2] ? decodeURIComponent(parts[2]) : '';
      const setIds = (value) => {
        params.delete('id');
        params.delete('title_id');
        params.delete('season_id');
        params.set('ids', value);
      };

      if (parts[1] === 'health') {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('X-Movie-API-Source', 'local-proxy');
        res.end(JSON.stringify({
          ok: true,
          keyConfigured: Boolean(env.RAPIDAPI_KEY && env.RAPIDAPI_KEY !== 'replace_with_your_rapidapi_key'),
          host,
          message: env.RAPIDAPI_KEY && env.RAPIDAPI_KEY !== 'replace_with_your_rapidapi_key'
            ? 'The local proxy loaded a RapidAPI key. This does not verify the provider or subscription.'
            : 'RAPIDAPI_KEY is not configured in the .env file loaded by Vite.',
        }));
        return;
      }
      if (parts[1] === 'search') {
        remotePath = paths.search;
        routeKind = 'search';
      } else if (parts[1] === 'languages') {
        remotePath = paths.languages;
      } else if (parts[1] === 'titles' && parts[3] === 'seasons') {
        remotePath = paths.seasons;
        setIds(id);
      } else if (parts[1] === 'titles' && parts[3] === 'similars') {
        remotePath = paths.similars;
        setIds(id);
      } else if (parts[1] === 'titles' && parts[3] === 'trailers') {
        remotePath = paths.trailers;
        setIds(id);
      } else if (parts[1] === 'titles' && id) {
        remotePath = paths.details;
        setIds(id);
      } else if (parts[1] === 'seasons' && parts[3] === 'episodes') {
        remotePath = paths.episodes;
        setIds(id);
      } else {
        res.statusCode = 404;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ message: 'Unknown API route.' }));
        return;
      }

      // Route synthetic fallback IDs to TVMaze/iTunes before checking the
      // RapidAPI key or building a Netflix54 request.
      const isFallbackId = /^(?:tvmaze-show-\d+|itunes-movie-\d+|tvmaze-season-\d+)$/.test(id);
      if (isFallbackId) {
        try {
          const fallbackPayload = await handleFallbackId(parts, id);
          if (fallbackPayload !== null) {
            sendJson(res, 200, fallbackPayload);
            return;
          }
        } catch (fallbackError) {
          sendJson(res, fallbackError.statusCode || 502, {
            message: fallbackError.message || 'The public metadata source could not load this title.',
          }, 'fallback-unavailable');
          return;
        }
      }

      if (!env.RAPIDAPI_KEY || env.RAPIDAPI_KEY === 'replace_with_your_rapidapi_key') {
        res.statusCode = 503;
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('X-Movie-API-Source', 'local-proxy');
        res.end(JSON.stringify({ code: 'RAPIDAPI_KEY_MISSING', message: 'The local Vite proxy did not load RAPIDAPI_KEY. Confirm .env is in the project root and restart Vite.' }));
        return;
      }

      const remoteUrl = new URL(remotePath, base);
      for (const [key, value] of params.entries()) remoteUrl.searchParams.set(key, value);
      const result = await requestRemote(remoteUrl);
      // When Netflix54 has exhausted its quota, keep search usable by falling
      // back to public metadata APIs instead of showing the provider's 429 page.
      // This does not bypass the quota; it avoids calling Netflix54 for search.
      if (routeKind === 'search') {
        let payload;
        try { payload = JSON.parse(result.body); } catch { payload = null; }
        const hasNoUsableTitles = result.status >= 200 && result.status < 300 && getTitleArray(payload).length === 0;
        if (result.status === 429 || hasNoUsableTitles) {
          const query = params.get('query') || '';
          if (query.trim()) {
            const offset = Math.max(0, Number(params.get('offset') || 0));
            const limit = Math.min(Math.max(Number(params.get('limit_titles') || 30), 1), 50);
            try {
              const fallback = await fallbackSearch(query, limit, offset);
              fallback.notice = result.status === 429
                ? 'Netflix54 monthly quota is exhausted. Showing results from public metadata sources instead.'
                : fallback.notice;
              res.statusCode = 200;
              res.setHeader('X-Movie-API-Source', 'public-fallback');
              res.setHeader('Cache-Control', 'no-store');
              res.setHeader('Content-Type', 'application/json; charset=utf-8');
              res.end(JSON.stringify(fallback));
              return;
            } catch (fallbackError) {
              res.statusCode = 502;
              res.setHeader('X-Movie-API-Source', 'fallback-unavailable');
              res.setHeader('Cache-Control', 'no-store');
              res.setHeader('Content-Type', 'application/json; charset=utf-8');
              res.end(JSON.stringify({
                message: `Netflix54 ${result.status === 429 ? 'quota is exhausted and' : 'returned no usable titles, and'} public metadata fallback failed: ${fallbackError.message || 'No results were returned by any configured source.'}`,
              }));
              return;
            }
          }
        }
      }
      res.statusCode = result.status;
      res.setHeader('X-Movie-API-Source', 'rapidapi-upstream');
      res.setHeader('Cache-Control', result.status >= 500 ? 'no-store' : 'no-cache');
      res.setHeader('Content-Type', result.contentType);
      copyUsefulHeaders(result.headers, res);
      res.end(result.body);
    } catch (error) {
      res.statusCode = error.name === 'TimeoutError' ? 504 : 502;
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('X-Movie-API-Source', 'local-proxy-transport');
      res.setHeader('Cache-Control', 'no-store');
      res.end(JSON.stringify({ code: 'MOVIE_API_TRANSPORT_ERROR', message: error.message || 'The local proxy could not contact RapidAPI.' }));
    }
  }

  return {
    name: 'movie-platform-api-proxy',
    configureServer(server) {
      server.middlewares.use((req, res, next) => { handler(req, res, next); });
    },
    configurePreviewServer(server) {
      server.middlewares.use((req, res, next) => { handler(req, res, next); });
    },
  };
}

export default defineConfig(({ mode }) => {
  // Resolve the project root from this config file, not process.cwd().
  // This makes .env loading reliable when Vite is launched from an IDE,
  // a parent directory, or a terminal whose working directory differs.
  const configDir = dirname(fileURLToPath(import.meta.url));
  const root = resolve(configDir);
  const env = loadEnv(mode, root, '');
  return {
    root,
    envDir: root,
    plugins: [react(), apiProxyPlugin(env)],
    server: { port: 5173 },
    preview: { port: 4173 },
  };
});

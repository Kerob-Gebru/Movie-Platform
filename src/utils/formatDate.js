export function unwrapTitles(payload, depth = 0) {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== 'object' || depth > 8) return [];

  // Prefer arrays that are explicitly documented as title/result collections.
  // Netflix54 responses and proxies may wrap these in one or more objects.
  const listKeys = [
    'titles', 'results', 'items', 'videos', 'searchResults', 'titleResults',
    'seasons', 'episodes', 'trailers', 'similars', 'suggestions',
  ];
  let emptyCollection = null;
  for (const key of listKeys) {
    if (Array.isArray(payload[key])) {
      if (payload[key].length) return payload[key];
      emptyCollection = payload[key];
    }
  }

  // Common response wrappers. Recurse through object wrappers instead of
  // assuming the collection is always at response.data.titles.
  for (const key of ['data', 'response', 'payload', 'result', 'search', 'catalog']) {
    if (payload[key] && typeof payload[key] === 'object') {
      const nested = unwrapTitles(payload[key], depth + 1);
      if (nested.length) return nested;
    }
  }

  // Some responses return a single title object rather than an array.
  const looksLikeTitle = Boolean(
    payload.titleId || payload.videoId || payload.netflixid || payload.id ||
    payload.title || payload.titleName || payload.episodeTitle ||
    payload.seasonId || payload.episodeId || payload.details || payload.summary ||
    payload.itemSummary
  );
  if (looksLikeTitle) return [payload];

  // Last-resort handling for undocumented wrappers: select an array only if
  // its entries resemble titles, rather than returning arbitrary metadata.
  for (const value of Object.values(payload)) {
    if (Array.isArray(value) && value.some((entry) => entry && typeof entry === 'object' && (
      entry.titleId || entry.videoId || entry.netflixid || entry.title || entry.titleName || entry.details || entry.itemSummary
    ))) return value;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const nested = unwrapTitles(value, depth + 1);
      if (nested.length) return nested;
    }
  }
  return emptyCollection ?? [];
}

export function normalizeTitle(item) {
  const nestedData = Array.isArray(item?.data) ? item.data[0] : item?.data;
  const d = item?.details ?? nestedData ?? item ?? {};
  const summary = d.summary ?? item?.summary ?? d.itemSummary ?? item?.itemSummary ?? {};
  const itemSummary = d.itemSummary ?? item?.itemSummary ?? {};
  const image = (...values) => {
    for (const value of values) {
      if (typeof value === 'string' && value.trim()) return value;
      if (value && typeof value.url === 'string' && value.url.trim()) return value.url;
      if (value && typeof value.src === 'string' && value.src.trim()) return value.src;
    }
    return '';
  };
  const rawType = String(d.type ?? d.titleType ?? d.videoType ?? summary.type ?? summary.titleType ?? itemSummary.type ?? item?.type ?? item?.titleType ?? item?.videoType ?? '').toLowerCase().replace(/[ _-]+/g, ' ').trim();
  const inferredShow = Number(d.seasonCount ?? summary.seasonCount ?? itemSummary.seasonCount ?? item?.seasonCount ?? 0) > 0 || Array.isArray(d.seasons) || Array.isArray(item?.seasons);
  const type = ['show', 'series', 'tv', 'tv show', 'tvshow', 'series title', 'tv series', 'television series'].includes(rawType) ? 'show'
    : ['movie', 'film', 'movies', 'movie title', 'feature film'].includes(rawType) ? 'movie' : inferredShow ? 'show' : 'unknown';
  const rawGenres = d.genres ?? summary.genres ?? itemSummary.genres ?? item?.genres ?? [];
  const rawCast = d.cast ?? d.starring ?? summary.cast ?? itemSummary.cast ?? item?.cast ?? item?.starring ?? [];
  const rawRating = d.averageRating ?? d.rating?.average ?? d.userRating ?? d.rating ?? summary.averageRating ?? itemSummary.averageRating ?? item?.averageRating ?? item?.rating ?? item?.userRating ?? null;
  const ratingValue = rawRating && typeof rawRating === 'object' ? (rawRating.average ?? rawRating.value ?? null) : rawRating;
  const runtime = d.runtime ?? d.runtimeMinutes ?? d.displayRuntime ?? d.infoDensityRuntime ?? d.duration ?? summary.runtime ?? itemSummary.runtime ?? item?.runtime ?? item?.displayRuntime ?? null;
  const images = d.images ?? summary.images ?? itemSummary.images ?? item?.images ?? {};
  const background = image(d.backgroundImage, d.heroImage, d.landscapeImage, d.storyArt, d.storyArtImage, images.background, images.hero, images.storyArt, summary.backgroundImage, summary.storyArt, itemSummary.backgroundImage, item?.backgroundImage, item?.heroImage, item?.landscapeImage, item?.storyArt, item?.storyArtImage);
  const poster = image(d.boxArt, d.boxart, d.posterImage, d.poster, d.image, d.img, d.imageUrl, images.boxArt, images.poster, images.boxart, summary.boxArt, summary.posterImage, itemSummary.boxArt, item?.boxArt, item?.boxart, item?.posterImage, item?.poster, item?.image, item?.img, item?.imageUrl);
  const seasons = d.seasonCount ?? summary.seasonCount ?? itemSummary.seasonCount ?? item?.seasonCount ?? (Array.isArray(d.seasons) ? d.seasons.length : Array.isArray(item?.seasons) ? item.seasons.length : 0);
  return {
    id: String(item?.titleId ?? d.titleId ?? d.netflixid ?? d.id ?? d.videoId ?? d.trackIds?.videoId ?? item?.videoId ?? item?.id ?? item?.seasonId ?? item?.episodeId ?? ''),
    title: d.title ?? d.titleName ?? d.name ?? summary.title ?? summary.titleName ?? itemSummary.title ?? itemSummary.titleName ?? item?.title ?? item?.titleName ?? item?.name ?? item?.episodeTitle ?? 'Untitled',
    type,
    year: d.releaseYear ?? d.year ?? d.release_date?.slice?.(0, 4) ?? summary.releaseYear ?? itemSummary.releaseYear ?? item?.releaseYear ?? item?.year ?? item?.release_date?.slice?.(0, 4) ?? null,
    rating: ratingValue,
    synopsis: d.synopsis ?? d.description ?? d.overview ?? d.contextualSynopsis?.text ?? d.currentContextualSynopsis?.text ?? summary.contextualSynopsis?.text ?? itemSummary.contextualSynopsis?.text ?? item?.synopsis ?? item?.description ?? item?.overview ?? item?.contextualSynopsis?.text ?? item?.currentContextualSynopsis?.text ?? '',
    background,
    poster,
    logo: image(d.logoImage, summary.logoImage, itemSummary.logoImage, item?.logoImage),
    genres: Array.isArray(rawGenres) ? rawGenres.map((g) => typeof g === 'string' ? g : g?.name).filter(Boolean) : [],
    cast: Array.isArray(rawCast) ? rawCast.map((p) => typeof p === 'string' ? p : p?.name).filter(Boolean) : [],
    maturity: d.maturity?.rating?.value ?? d.maturityRating ?? d.contentAdvisoryRating ?? summary.maturity?.rating?.value ?? itemSummary.maturity?.rating?.value ?? item?.maturity?.rating?.value ?? item?.maturityRating ?? '',
    seasons: Number(seasons) || 0,
    episodes: Number(d.episodeCount ?? summary.episodeCount ?? itemSummary.episodeCount ?? item?.episodeCount ?? 0) || 0,
    runtime,
    seasonNumber: d.seasonNumber ?? d.seq ?? d.season ?? item?.seasonNumber ?? null,
    episodeNumber: d.episodeNumber ?? d.episode ?? item?.episodeNumber ?? null,
    playable: d.availability?.isPlayable ?? false,
    raw: item,
  };
}

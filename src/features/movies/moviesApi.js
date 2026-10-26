import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import baseApi from '../../services/baseApi';
import { unwrapTitles } from '../../utils/formatDate';

function apiError(error) {
  const response = error.response;
  const data = response?.data;
  const status = response?.status;
  const headers = response?.headers;
  const retryHeader = headers?.['retry-after'];
  const resetHeader = headers?.['x-ratelimit-requests-reset'];
  const retryValue = retryHeader || resetHeader;
  const retrySeconds = Number(retryValue);
  let retryAfterSeconds = Number.isFinite(retrySeconds) && retrySeconds > 0 ? retrySeconds : null;
  if (retryAfterSeconds === null && retryHeader) {
    const retryDate = Date.parse(retryHeader);
    if (Number.isFinite(retryDate)) retryAfterSeconds = Math.max(0, Math.ceil((retryDate - Date.now()) / 1000));
  }
  const source = headers?.['x-movie-api-source'] || '';
  const providerMessage = data?.message || data?.error?.message || (typeof data?.error === 'string' ? data.error : '') || (typeof data === 'string' ? data.slice(0, 300) : '') || error.message;

  if (status === 429) {
    const seconds = Math.ceil(retryAfterSeconds || 0);
    const waitLabel = seconds >= 86400
      ? `${Math.floor(seconds / 86400)} days${Math.floor((seconds % 86400) / 3600) ? ` ${Math.floor((seconds % 86400) / 3600)} hours` : ''}`
      : seconds >= 3600
        ? `${Math.floor(seconds / 3600)} hours${Math.floor((seconds % 3600) / 60) ? ` ${Math.floor((seconds % 3600) / 60)} minutes` : ''}`
        : seconds >= 60
          ? `${Math.floor(seconds / 60)} minutes`
          : `${seconds} seconds`;
    const waitMessage = retryAfterSeconds && retryAfterSeconds > 0
      ? `The provider reports a reset in about ${waitLabel}. Check your RapidAPI quota dashboard before retrying.`
      : 'Wait for the provider limit to reset before trying again.';
    return {
      message: `Netflix54/RapidAPI rate-limited this request (HTTP 429). ${waitMessage}`,
      status,
      retryAfterSeconds,
      providerMessage,
    };
  }
  if (status === 503 && source === 'local-proxy') {
    return {
      message: 'The local API proxy returned HTTP 503 because it could not load the configured RapidAPI key. Check .env at the project root, then restart Vite.',
      status,
      source,
      providerMessage,
    };
  }
  if (status === 503 && source === 'rapidapi-upstream') {
    return {
      message: `Netflix54/RapidAPI returned HTTP 503 (Service Unavailable). ${retryAfterSeconds ? `The provider asks you to wait about ${Math.ceil(retryAfterSeconds)} seconds.` : 'The proxy made up to two short retries, but the provider is still unavailable.'} Try again later.`,
      status,
      source,
      retryAfterSeconds,
      providerMessage,
    };
  }
  if (status === 502 || status === 504) {
    return {
      message: `The local proxy could not complete the request (HTTP ${status}). Check network access to RapidAPI and try again.`,
      status,
      source,
      providerMessage,
    };
  }
  if (status === 401 || status === 403) {
    return {
      message: 'RapidAPI rejected the request. Check that your key is valid and that your RapidAPI account is subscribed to Netflix54.',
      status,
      providerMessage,
    };
  }
  return {
    message: providerMessage || 'The movie service could not be reached.',
    status,
    providerMessage,
  };
}

function makeSearchKey({ query = '', offset = 0, limit_titles = 30, limit_suggestions = 20, lang = 'en' } = {}) {
  return JSON.stringify([query.trim().toLowerCase(), offset, limit_titles, limit_suggestions, lang]);
}

export const fetchMovies = createAsyncThunk('movies/fetchMovies', async ({ query = '', offset = 0, limit_titles = 30, limit_suggestions = 20, lang = 'en' } = {}, { rejectWithValue, signal }) => {
  const cleanQuery = query.trim();
  if (!cleanQuery) return { titles: [] };
  try {
    const response = await baseApi.get('search', {
      params: { query: cleanQuery, offset, limit_titles, limit_suggestions, lang },
      signal,
    });
    return { payload: response.data, searchKey: makeSearchKey({ query: cleanQuery, offset, limit_titles, limit_suggestions, lang }) };
  } catch (error) { return rejectWithValue(apiError(error)); }
}, {
  // React StrictMode re-runs initial effects during development. Skip an
  // identical search while its first request is already pending.
  condition: (args = {}, { getState }) => {
    const state = getState().movies;
    const key = makeSearchKey(args);
    return !(state.loading && state.activeSearchKey === key);
  },
});

export const fetchMovieDetails = createAsyncThunk('movies/fetchMovieDetails', async (id, { rejectWithValue, signal }) => {
  try { const response = await baseApi.get(`titles/${encodeURIComponent(id)}`, { signal }); return unwrapTitles(response.data)[0] ?? response.data; }
  catch (error) { return rejectWithValue(apiError(error)); }
});
export const fetchMovieSeasons = createAsyncThunk('movies/fetchMovieSeasons', async (id, { rejectWithValue, signal }) => {
  try { const response = await baseApi.get(`titles/${encodeURIComponent(id)}/seasons`, { signal }); return response.data; }
  catch (error) { return rejectWithValue(apiError(error)); }
});
export const fetchSeasonEpisodes = createAsyncThunk('movies/fetchSeasonEpisodes', async ({ seasonId, titleId }, { rejectWithValue, signal }) => {
  try { const response = await baseApi.get(`seasons/${encodeURIComponent(seasonId)}/episodes`, { signal }); return { seasonId: String(seasonId), payload: response.data }; }
  catch (error) { return rejectWithValue({ ...apiError(error), seasonId: String(seasonId) }); }
});
export const fetchSimilarMovies = createAsyncThunk('movies/fetchSimilarMovies', async (id, { rejectWithValue, signal }) => {
  try { const response = await baseApi.get(`titles/${encodeURIComponent(id)}/similars`, { signal }); return response.data; }
  catch (error) { return rejectWithValue(apiError(error)); }
});
export const fetchTrailers = createAsyncThunk('movies/fetchTrailers', async (id, { rejectWithValue, signal }) => {
  try { const response = await baseApi.get(`titles/${encodeURIComponent(id)}/trailers`, { signal }); return response.data; }
  catch (error) { return rejectWithValue(apiError(error)); }
});

const moviesSlice = createSlice({
  name: 'movies',
  initialState: { searchResults: [], searchResultsKey: null, activeSearchKey: null, currentDetails: null, seasons: [], seasonsLoading: false, seasonsError: null, episodesBySeason: {}, episodeLoading: false, episodeError: null, similarTitles: [], trailers: [], loading: false, detailsLoading: false, error: null, source: null, activeSearchRequestId: null },
  reducers: {
    clearMovieError(state) { state.error = null; },
    clearCurrentDetails(state) { state.currentDetails = null; state.seasons = []; state.seasonsLoading = false; state.seasonsError = null; state.episodesBySeason = {}; state.similarTitles = []; state.trailers = []; state.error = null; state.episodeError = null; },
  },
  extraReducers(builder) {
    builder
      .addCase(fetchMovies.pending, (state, action) => { state.loading = true; state.error = null; state.searchResults = []; state.source = null; state.activeSearchKey = makeSearchKey(action.meta.arg); state.activeSearchRequestId = action.meta.requestId; })
      .addCase(fetchMovies.fulfilled, (state, action) => {
        if (state.activeSearchRequestId !== action.meta.requestId) return;
        state.loading = false; state.activeSearchRequestId = null;
        state.searchResults = unwrapTitles(action.payload?.payload);
        state.searchResultsKey = action.payload?.searchKey || state.activeSearchKey;
        state.source = action.payload?.payload?.source || null;
        state.activeSearchKey = null;
      })
      .addCase(fetchMovies.rejected, (state, action) => {
        if (state.activeSearchRequestId !== action.meta.requestId) return;
        state.loading = false; state.activeSearchRequestId = null; state.activeSearchKey = null;
        state.error = action.payload || { message: action.error.message };
        if (action.meta.aborted) state.error = null;
      })
      .addCase(fetchMovieDetails.pending, (state) => { state.detailsLoading = true; state.error = null; })
      .addCase(fetchMovieDetails.fulfilled, (state, action) => { state.detailsLoading = false; state.currentDetails = action.payload; })
      .addCase(fetchMovieDetails.rejected, (state, action) => { state.detailsLoading = false; state.error = action.payload || { message: action.error.message }; })
      .addCase(fetchMovieSeasons.pending, (state) => { state.seasonsLoading = true; state.seasonsError = null; state.seasons = []; state.episodesBySeason = {}; })
      .addCase(fetchMovieSeasons.fulfilled, (state, action) => { state.seasonsLoading = false; state.seasons = unwrapTitles(action.payload); })
      .addCase(fetchMovieSeasons.rejected, (state, action) => { state.seasonsLoading = false; state.seasonsError = action.payload || { message: action.error.message }; })
      .addCase(fetchSeasonEpisodes.pending, (state) => { state.episodeLoading = true; state.episodeError = null; })
      .addCase(fetchSeasonEpisodes.fulfilled, (state, action) => { state.episodeLoading = false; state.episodesBySeason[action.payload.seasonId] = unwrapTitles(action.payload.payload); })
      .addCase(fetchSeasonEpisodes.rejected, (state, action) => { state.episodeLoading = false; state.episodeError = action.payload || { message: action.error.message }; })
      .addCase(fetchSimilarMovies.fulfilled, (state, action) => { state.similarTitles = unwrapTitles(action.payload); })
      .addCase(fetchTrailers.fulfilled, (state, action) => { state.trailers = unwrapTitles(action.payload); });
  },
});
export const { clearMovieError, clearCurrentDetails } = moviesSlice.actions;
export default moviesSlice.reducer;

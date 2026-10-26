import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, CalendarDays, Clapperboard, Plus, Star, Tv, Clock3, Users } from 'lucide-react';
import { fetchMovieDetails, fetchMovieSeasons, fetchSeasonEpisodes, fetchSimilarMovies, fetchTrailers, clearCurrentDetails } from './moviesApi';
import { normalizeTitle, unwrapTitles } from '../../utils/formatDate';
import { toggleFavorite } from '../favorites/favoritesSlice';
import Loader from '../../components/Loader';
import ErrorMessage from '../../components/ErrorMessage';
import MovieList from './components/MovieList';

function getSeasonId(season) {
  const id = season?.seasonId ?? season?.id ?? season?.ids ?? season?.season_id ?? season?.seasonIdList?.[0];
  return id == null ? '' : String(id);
}
function getSeasonLabel(season, index) {
  return season?.name || season?.title || season?.seasonName || `Season ${season?.seasonNumber ?? season?.seq ?? index + 1}`;
}

export default function MovieDetails() {
  const { id } = useParams();
  const dispatch = useDispatch();
  const { currentDetails, detailsLoading, error, seasons, seasonsLoading, seasonsError, episodesBySeason, episodeLoading, episodeError, similarTitles, trailers } = useSelector((state) => state.movies);
  const favorites = useSelector((state) => state.favorites.items);
  const [selectedSeasonId, setSelectedSeasonId] = useState('');
  const title = normalizeTitle(currentDetails);
  const isFavorite = Boolean(title.id) && favorites.some((item) => String(item.id) === String(title.id));
  const normalizedSeasons = useMemo(() => seasons.map((season, index) => ({ raw: season, id: getSeasonId(season), label: getSeasonLabel(season, index), number: season?.seasonNumber ?? season?.seq ?? index + 1 })), [seasons]);
  const selectedSeason = normalizedSeasons.find((season) => season.id === selectedSeasonId) || normalizedSeasons[0];
  const episodes = selectedSeason ? (episodesBySeason[selectedSeason.id] || []).map(normalizeTitle) : [];

  useEffect(() => {
    let active = true;
    dispatch(clearCurrentDetails());
    setSelectedSeasonId('');

    // Load the primary detail first. Only request dependent resources after it
    // succeeds, and do not request seasons for movies. This avoids wasting API
    // quota when the provider rejects the main details request.
    dispatch(fetchMovieDetails(id)).unwrap().then((detail) => {
      if (!active) return;
      const normalized = normalizeTitle(detail);
      if (normalized.type === 'show') dispatch(fetchMovieSeasons(id));
      dispatch(fetchSimilarMovies(id));
      dispatch(fetchTrailers(id));
    }).catch(() => {
      // The slice stores and displays the actionable API error.
    });

    return () => { active = false; };
  }, [dispatch, id]);

  useEffect(() => {
    if (selectedSeason?.id && !episodesBySeason[selectedSeason.id]) {
      dispatch(fetchSeasonEpisodes({ seasonId: selectedSeason.id, titleId: id }));
      setSelectedSeasonId(selectedSeason.id);
    }
  }, [dispatch, id, selectedSeason, episodesBySeason]);

  if (detailsLoading && !currentDetails) return <main className="page-container page-content"><Loader label="Loading title details..." /></main>;
  if (error && !currentDetails) return <main className="page-container page-content"><ErrorMessage error={error} onRetry={() => dispatch(fetchMovieDetails(id))} /></main>;
  if (!currentDetails) return <main className="page-container page-content"><p className="muted-copy">No title details are available.</p></main>;

  const similar = unwrapTitles(similarTitles).map(normalizeTitle).filter((item) => item.id && item.title !== 'Untitled');
  const detailImage = title.background ? { '--hero-image': `url("${title.background}")` } : undefined;
  return <main>
    <section className="detail-hero" style={detailImage}>
      <div className="detail-hero-overlay" /><div className="page-container detail-hero-content">
        <Link to="/" className="back-link"><ArrowLeft size={16} /> Back to discover</Link>
        <span className="section-kicker">{title.type === 'show' ? 'SERIES' : title.type === 'movie' ? 'MOVIE' : 'TITLE'} · TITLE DETAILS</span>
        <h1>{title.title}</h1>
        <div className="detail-meta">
          {title.year && <span><CalendarDays size={15} />{title.year}</span>}
          {title.maturity && <span>{title.maturity}</span>}
          {title.runtime && <span><Clock3 size={15} />{typeof title.runtime === 'number' ? `${title.runtime} min` : title.runtime}</span>}
          {title.seasons > 0 && <span><Tv size={15} />{title.seasons} seasons</span>}
          {title.rating != null && title.rating !== '' && Number.isFinite(Number(title.rating)) && <span><Star size={15} fill="currentColor" />{Number(title.rating).toFixed(1)}</span>}
        </div>
        {title.synopsis && <p className="detail-synopsis">{title.synopsis}</p>}
        <div className="hero-actions"><button className="button button-primary" onClick={() => dispatch(toggleFavorite(title))}><Plus size={17} />{isFavorite ? 'Remove favorite' : 'Add to favorites'}</button></div>
      </div>
    </section>
    <div className="page-container page-content details-content">
      <section>
        <div className="section-heading"><div><span className="section-kicker">THE STORY</span><h2>About this title</h2></div></div>
        <p className="long-synopsis">{title.synopsis || 'No synopsis has been provided by the API.'}</p>
        <div className="info-cards">
          <div className="info-card"><span className="info-card-icon"><Clapperboard size={19} /></span><div><span className="info-label">Genres</span><strong>{title.genres.join(' · ') || 'Not listed'}</strong></div></div>
          {title.cast.length > 0 && <div className="info-card"><span className="info-card-icon"><Users size={19} /></span><div><span className="info-label">Cast</span><strong>{title.cast.join(' · ')}</strong></div></div>}
          {(title.episodes > 0 || title.seasons > 0 || normalizedSeasons.length > 0) && <div className="info-card"><span className="info-card-icon"><Tv size={19} /></span><div><span className="info-label">Episodes / seasons</span><strong>{title.episodes || 'Episode count unavailable'} episodes · {normalizedSeasons.length || title.seasons || 'Season count unavailable'} seasons</strong></div></div>}
        </div>
      </section>

      {title.type === 'show' && <section className="seasons-section details-section">
        <div className="section-heading"><div><span className="section-kicker">SERIES GUIDE</span><h2>Seasons and episodes</h2></div></div>
        {seasonsLoading && <Loader label="Loading seasons..." />}
        {seasonsError && <ErrorMessage error={seasonsError} onRetry={() => dispatch(fetchMovieSeasons(id))} />}
        {!seasonsLoading && normalizedSeasons.length > 0 && <><label className="season-select-label" htmlFor="season-select">Choose a season</label>
        <select id="season-select" className="season-select" value={selectedSeason?.id || ''} onChange={(event) => setSelectedSeasonId(event.target.value)}>
          {normalizedSeasons.map((season) => <option key={season.id || season.number} value={season.id}>{season.label}</option>)}
        </select></>}
        {!seasonsLoading && !seasonsError && normalizedSeasons.length === 0 && <p className="muted-copy">Season information is not available for this title.</p>}
        {episodeLoading && <Loader label="Loading episodes..." />}
        {episodeError && <ErrorMessage error={episodeError} onRetry={() => selectedSeason?.id && dispatch(fetchSeasonEpisodes({ seasonId: selectedSeason.id, titleId: id }))} />}
        {!episodeLoading && !episodeError && selectedSeason && episodes.length === 0 && <p className="muted-copy">No episode details are available for this season, or the provider did not return any episodes.</p>}
        {episodes.length > 0 && <div className="episode-list">{episodes.map((episode, index) => <article className="episode-card" key={episode.id || `${selectedSeason.id}-${index}`}>
          {(episode.poster || episode.background) && <img src={episode.poster || episode.background} alt="" loading="lazy" onError={(event) => { event.currentTarget.style.display = 'none'; }} />}
          <div className="episode-copy"><div className="episode-heading"><strong>{episode.episodeNumber ? `Episode ${episode.episodeNumber}: ` : `Episode ${index + 1}: `}{episode.title}</strong>{episode.runtime && <span>{episode.runtime} min</span>}</div>
            {episode.synopsis && <p>{episode.synopsis}</p>}
            {episode.year && <small>{episode.year}</small>}
          </div>
        </article>)}</div>}
      </section>}

      {Array.isArray(trailers) && trailers.length > 0 && <section className="details-section"><div className="section-heading"><div><span className="section-kicker">WATCH A PREVIEW</span><h2>Trailers</h2></div></div><div className="trailer-list">{trailers.map((trailer, i) => { const url = trailer.url || trailer.trailerUrl || trailer.videoUrl || trailer.webLink; return url && /^https?:\/\//i.test(url) ? <a key={trailer.id || i} className="button button-secondary" href={url} target="_blank" rel="noreferrer">{trailer.name || trailer.title || `Trailer ${i + 1}`}</a> : null; })}</div></section>}
      {similar.length > 0 && <section className="details-section"><div className="section-heading"><div><span className="section-kicker">MORE LIKE THIS</span><h2>You may also like</h2></div></div><MovieList items={similar.slice(0, 6)} /></section>}
    </div>
  </main>;
}

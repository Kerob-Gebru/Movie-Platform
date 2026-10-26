import { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { ArrowRight, Play, Sparkles, ShieldCheck, Clapperboard } from 'lucide-react';
import { fetchMovies } from '../features/movies/moviesApi';
import { normalizeTitle, unwrapTitles } from '../utils/formatDate';
import MovieList from '../features/movies/components/MovieList';
import Loader from '../components/Loader';
import ErrorMessage from '../components/ErrorMessage';

const genres = ['Sci-Fi', 'Thriller', 'Drama', 'Comedy', 'Adventure', 'Horror'];

export default function HomePage() {
  const dispatch = useDispatch();
  const { searchResults, loading, error, source } = useSelector((state) => state.movies);
  useEffect(() => { dispatch(fetchMovies({ query: 'the', limit_titles: 30, lang: 'en' })); }, [dispatch]);
  const titles = useMemo(() => unwrapTitles(searchResults).map(normalizeTitle).filter((item) => item.title !== 'Untitled'), [searchResults]);
  const featured = titles[0] || null;
  const unique = featured ? titles.filter((item) => item.id !== featured.id) : titles;
  const shows = unique.filter((item) => item.type === 'show');
  const movies = unique.filter((item) => item.type === 'movie');
  const unclassified = unique.filter((item) => item.type === 'unknown');

  const featuredPath = featured?.id ? `/movie/${encodeURIComponent(featured.id)}` : '/search?q=popular';

  return <main>
    <section className="hero" style={featured?.background ? { '--hero-image': `url("${featured.background}")` } : undefined}>
      <div className="hero-overlay" /><div className="hero-content page-container">
        <div className="eyebrow"><span className="eyebrow-line" /><Sparkles size={14} /> YOUR NEXT OBSESSION STARTS HERE</div>
        <div className="hero-brand"><span className="hero-overline">THE WORLD IS FULL OF</span>{featured?.logo ? <img src={featured.logo} alt={featured.title} className="hero-logo" /> : <h1>{featured?.title || 'Discover your next favorite'}</h1>}</div>
        <div className="hero-tags"><span className="tag-highlight">FEATURED</span><span>{featured?.year || 'Explore the catalog'}</span><span className="hero-dot" /><span>{featured?.type === 'show' ? 'TV Series' : featured?.type === 'movie' ? 'Movie' : 'Featured title'}</span>{featured?.seasons > 0 && <><span className="hero-dot" /><span>{`${featured.seasons} Seasons`}</span></>}</div>
        <p className="hero-description">{featured?.synopsis || 'Search movies and television series, explore available details, and build your personal favorites list.'}</p>
        <div className="hero-actions"><Link className="button button-primary" to={featuredPath}><Play size={18} fill="currentColor" /> Explore title</Link><Link className="button button-glass" to={featuredPath}><Clapperboard size={18} /> More info</Link></div>
        <div className="hero-footnote"><ShieldCheck size={15} /> Your watchlist. Your next favorite. All in one place.</div>
      </div><div className="hero-pagination"><span className="pagination-active" /><span /><span /><span /></div><div className="hero-bottom-fade" />
    </section>
    <div className="page-container home-content">
      <section className="welcome-strip"><div className="welcome-icon"><Sparkles size={20} /></div><div><strong>Find your next favorite</strong><p>Explore shows, stories, and hidden gems tailored to your mood.</p></div><Link to="/search?q=popular" className="welcome-link">Explore library <ArrowRight size={16} /></Link></section>
      {loading && <Loader label="Loading your first recommendations..." />}
      {source && <p className="source-notice">Data source: {source === 'netflix54' ? 'Netflix54' : source}</p>}
      {error && !titles.length && <ErrorMessage error={error} onRetry={() => dispatch(fetchMovies({ query: 'the', limit_titles: 30, lang: 'en' }))} />}
      {!loading && !error && titles.length === 0 && <div className="notice">No titles were found. Try searching for a specific movie or series.</div>}
      {!loading && !error && (shows.length > 0 || unclassified.length > 0) && <section className="title-section"><div className="section-heading"><div><span className="section-kicker">START HERE</span><h2>{shows.length > 0 ? 'Series to explore' : 'More titles to explore'}</h2></div><Link to="/search?q=popular" className="see-all">See all <ArrowRight size={16} /></Link></div><MovieList items={(shows.length > 0 ? shows : unclassified).slice(0, 6)} /></section>}
      <section className="genre-section" id="genres"><div className="section-heading"><div><span className="section-kicker">WHAT'S YOUR MOOD?</span><h2>Browse by genre</h2></div></div><div className="genre-grid">{genres.map((genre, i) => <Link key={genre} to={`/search?q=${encodeURIComponent(genre)}`} className={`genre-tile genre-${i}`}><span>{genre}</span><ArrowRight size={17} /></Link>)}</div></section>
      {!loading && !error && movies.length > 0 && <section className="title-section"><div className="section-heading"><div><span className="section-kicker">MOVIE NIGHT</span><h2>Movies to explore</h2></div></div><MovieList items={movies.slice(0, 6)} /></section>}
    </div>
  </main>;
}

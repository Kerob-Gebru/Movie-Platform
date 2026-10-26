import { useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { SlidersHorizontal } from 'lucide-react';
import { fetchMovies } from '../features/movies/moviesApi';
import { setFilter, setLanguage } from '../features/search/searchSlice';
import { normalizeTitle, unwrapTitles } from '../utils/formatDate';
import MovieList from '../features/movies/components/MovieList';
import Loader from '../components/Loader';
import ErrorMessage from '../components/ErrorMessage';

export default function SearchPage() {
  const [params] = useSearchParams();
  const query = params.get('q') || 'the';
  const dispatch = useDispatch();
  const { searchResults, loading, error } = useSelector((state) => state.movies);
  const { filter, language } = useSelector((state) => state.search);

  useEffect(() => { dispatch(fetchMovies({ query, limit_titles: 50, lang: language })); }, [dispatch, query, language]);
  const titles = useMemo(() => unwrapTitles(searchResults).map(normalizeTitle).filter((item) => item.title !== 'Untitled'), [searchResults]);
  const filtered = titles.filter((item) => filter === 'all' || item.type === filter);

  return <main className="page-container page-content search-page">
    <div className="search-page-heading"><div><span className="section-kicker">DISCOVER SOMETHING NEW</span><h1>Search results</h1><p>Showing matches for <strong>“{query}”</strong></p></div></div>
    <div className="filters-bar"><span><SlidersHorizontal size={17} /> Filter results</span><div className="filter-controls">
      <label>Type<select value={filter} onChange={(e) => dispatch(setFilter(e.target.value))}><option value="all">All titles</option><option value="movie">Movies</option><option value="show">Series</option></select></label>
      <label>Language<select value={language} onChange={(e) => dispatch(setLanguage(e.target.value))}><option value="en">English</option><option value="fr">French</option><option value="es">Spanish</option><option value="ar">Arabic</option><option value="ru">Russian</option></select></label>
    </div></div>
    {loading && <Loader label="Searching the catalog..." />}
    {error && <ErrorMessage error={error} onRetry={() => dispatch(fetchMovies({ query, limit_titles: 50, lang: language }))} />}
    {!loading && !error && <><p className="result-count">{filtered.length} title(s) shown</p><MovieList items={filtered} /></>}
  </main>;
}

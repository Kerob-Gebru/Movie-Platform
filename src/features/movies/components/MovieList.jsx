import MovieCard from './MovieCard';

export default function MovieList({ items = [] }) {
  if (!items.length) return <div className="empty-state"><h2>No titles found</h2><p>Try a different search term.</p></div>;
  return <div className="title-grid">{items.map((item, index) => <MovieCard key={item.id || `${item.title}-${index}`} title={item} index={index} />)}</div>;
}

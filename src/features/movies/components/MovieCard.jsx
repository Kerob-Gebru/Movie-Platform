import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Play, Star } from 'lucide-react';

export default function MovieCard({ title, index = 0 }) {
  const [imageFailed, setImageFailed] = useState(false);
  const image = title.poster || title.background;
  const detailPath = title.id ? `/movie/${encodeURIComponent(title.id)}` : '/';
  return <article className="title-card" style={{ '--card-index': index }}>
    <Link to={detailPath} className="poster-wrap" aria-label={`View ${title.title}`}>
      {image && !imageFailed
        ? <img src={image} alt={`${title.title} artwork`} loading="lazy" onError={() => setImageFailed(true)} />
        : <div className="poster-placeholder"><span className="placeholder-mark">N</span><span>{title.title}</span></div>}
      <div className="poster-shade" /><span className="card-play"><Play size={18} fill="currentColor" /></span>
      {title.maturity && <span className="maturity-pill">{title.maturity}</span>}
      {title.rating && <span className="rating-pill"><Star size={12} fill="currentColor" /> {Number(title.rating).toFixed(1)}</span>}
    </Link>
    <div className="card-info"><Link to={detailPath} className="card-title">{title.title}</Link><div className="card-meta"><span>{title.year || 'Year unavailable'}</span><span className="meta-dot" /><span>{title.type === 'show' ? 'Series' : title.type === 'movie' ? 'Movie' : 'Title'}</span></div></div>
  </article>;
}

import { useSelector } from 'react-redux';
import TitleCard from '../movies/components/MovieCard';

export default function FavoritesList() {
  const items = useSelector((state) => state.favorites.items);
  if (!items.length) return <div className="empty-state"><h2>Your favorites list is empty</h2><p>Open a movie or series and choose “Add to favorites”.</p></div>;
  return <div className="title-grid">{items.map((item, index) => <TitleCard key={item.id} title={item} index={index} />)}</div>;
}

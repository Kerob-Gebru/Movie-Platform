import FavoritesList from '../features/favorites/FavoritesList';

export default function FavoritesPage() {
  return <main className="page-container page-content"><span className="section-kicker">YOUR PERSONAL COLLECTION</span><h1>My favorites</h1><p className="page-intro">The movies and series you saved for later.</p><FavoritesList /></main>;
}

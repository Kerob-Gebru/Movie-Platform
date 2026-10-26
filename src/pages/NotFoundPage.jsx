import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return <main className="page-container page-content empty-state"><span className="section-kicker">404 · NOT FOUND</span><h1>We couldn't find that page</h1><p>The page may have moved, or the address may be incorrect.</p><Link to="/" className="button button-primary">Return home</Link></main>;
}

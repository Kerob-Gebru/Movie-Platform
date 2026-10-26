import { Link, NavLink } from 'react-router-dom';
import { Clapperboard, Heart, Menu, X } from 'lucide-react';
import { useState } from 'react';
import SearchBar from '../features/search/SearchBar';
import ThemeToggle from '../features/theme/ThemeToggle';
import { useSelector, useDispatch } from 'react-redux';
import { signOut } from '../features/auth/authSlice';

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const user = useSelector((state) => state.auth.user);
  const dispatch = useDispatch();

  return <header className="navbar">
    <div className="nav-inner">
      <Link to="/" className="brand"><span className="brand-mark"><Clapperboard size={22} /></span><span>Net<span className="brand-accent">flix</span></span></Link>
      <nav className={`nav-links ${menuOpen ? 'nav-links-open' : ''}`}>
        <NavLink to="/" end onClick={() => setMenuOpen(false)}>Home</NavLink>
        <NavLink to="/search?q=popular" onClick={() => setMenuOpen(false)}>Discover</NavLink>
        <NavLink to="/favorites" onClick={() => setMenuOpen(false)}><Heart size={15} /> Favorites</NavLink>
        <a href="/#genres" onClick={() => setMenuOpen(false)}>Genres</a>
      </nav>
      <SearchBar />
      <div className="nav-actions"><ThemeToggle />{user ? <button className="text-button" onClick={() => dispatch(signOut())}>Sign out</button> : <Link className="nav-login" to="/login">Sign in</Link>}</div>
      <button className="menu-toggle icon-button" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle navigation">{menuOpen ? <X /> : <Menu />}</button>
    </div>
  </header>;
}

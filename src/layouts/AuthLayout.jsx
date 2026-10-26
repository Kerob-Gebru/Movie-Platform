import { Link, Outlet } from 'react-router-dom';
import Footer from '../components/Footer';

export default function AuthLayout() {
  return <><header className="auth-top"><Link to="/" className="brand"><span className="brand-accent">Netflix</span></Link></header><main className="auth-page"><Outlet /></main><Footer /></>;
}

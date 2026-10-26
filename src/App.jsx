import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import AppRoutes from './routes/AppRoutes';

function ScrollToTop() {
  const { pathname, search } = useLocation();
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'auto' }); }, [pathname, search]);
  return null;
}

export default function App() {
  const mode = useSelector((state) => state.theme.mode);
  useEffect(() => { document.documentElement.dataset.theme = mode; }, [mode]);
  return <><ScrollToTop /><AppRoutes /></>;
}

import { useDispatch, useSelector } from 'react-redux';
import { Moon, Sun } from 'lucide-react';
import { toggleTheme } from './themeSlice';

export default function ThemeToggle() {
  const mode = useSelector((state) => state.theme.mode);
  const dispatch = useDispatch();
  return <button type="button" className="icon-button" onClick={() => dispatch(toggleTheme())} aria-label="Toggle light and dark theme" title="Toggle theme">
    {mode === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
  </button>;
}

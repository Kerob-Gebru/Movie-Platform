import { Navigate, Route, Routes } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import AuthLayout from '../layouts/AuthLayout';
import HomePage from '../pages/HomePage';
import SearchPage from '../pages/SearchPage';
import FavoritesPage from '../pages/FavoritesPage';
import MovieDetailsPage from '../pages/MovieDetailsPage';
import NotFoundPage from '../pages/NotFoundPage';
import LoginForm from '../features/auth/LoginForm';
import RegisterForm from '../features/auth/RegisterForm';

export default function AppRoutes() {
  return <Routes>
    <Route element={<MainLayout />}>
      <Route path="/" element={<HomePage />} />
      <Route path="/search" element={<SearchPage />} />
      <Route path="/favorites" element={<FavoritesPage />} />
      <Route path="/movie/:id" element={<MovieDetailsPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Route>
    <Route element={<AuthLayout />}>
      <Route path="/login" element={<LoginForm />} />
      <Route path="/register" element={<RegisterForm />} />
    </Route>
  </Routes>;
}

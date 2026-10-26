import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../features/auth/authSlice';
import themeReducer from '../features/theme/themeSlice';
import favoritesReducer from '../features/favorites/favoritesSlice';
import searchReducer from '../features/search/searchSlice';
import moviesReducer from '../features/movies/moviesApi';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    theme: themeReducer,
    favorites: favoritesReducer,
    search: searchReducer,
    movies: moviesReducer,
  },
});

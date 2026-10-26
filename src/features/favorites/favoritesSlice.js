import { createSlice } from '@reduxjs/toolkit';

const favoritesSlice = createSlice({
  name: 'favorites',
  initialState: { items: [] },
  reducers: {
    toggleFavorite(state, action) {
      const movie = action.payload;
      const index = state.items.findIndex((item) => item.id === movie.id);
      if (index >= 0) state.items.splice(index, 1);
      else state.items.push(movie);
    },
    removeFavorite(state, action) {
      state.items = state.items.filter((item) => item.id !== action.payload);
    },
  },
});

export const { toggleFavorite, removeFavorite } = favoritesSlice.actions;
export default favoritesSlice.reducer;

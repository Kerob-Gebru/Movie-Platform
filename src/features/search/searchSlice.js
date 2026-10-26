import { createSlice } from '@reduxjs/toolkit';

const searchSlice = createSlice({
  name: 'search',
  initialState: { query: '', filter: 'all', language: 'en' },
  reducers: {
    setQuery(state, action) { state.query = action.payload; },
    setFilter(state, action) { state.filter = action.payload; },
    setLanguage(state, action) { state.language = action.payload; },
  },
});

export const { setQuery, setFilter, setLanguage } = searchSlice.actions;
export default searchSlice.reducer;

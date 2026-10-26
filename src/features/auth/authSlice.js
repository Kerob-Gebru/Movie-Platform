import { createSlice } from '@reduxjs/toolkit';

const initialState = { user: null, status: 'idle' };

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    signInDemo(state, action) {
      state.user = { name: action.payload.name, email: action.payload.email };
      state.status = 'signed-in';
    },
    signOut(state) { state.user = null; state.status = 'idle'; },
  },
});

export const { signInDemo, signOut } = authSlice.actions;
export default authSlice.reducer;

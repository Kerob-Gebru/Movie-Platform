import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { signInDemo } from './authSlice';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const dispatch = useDispatch();
  const navigate = useNavigate();

  function submit(event) {
    event.preventDefault();
    if (!email.trim() || !password) return;
    dispatch(signInDemo({ name: email.split('@')[0], email }));
    navigate('/');
  }

  return <form className="auth-card" onSubmit={submit}>
    <span className="section-kicker">WELCOME BACK</span><h1>Sign in</h1>
    <p className="auth-note">Demo interface only — this form does not authenticate against a server.</p>
    <label>Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@example.com" /></label>
    <label>Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="Enter any demo password" /></label>
    <button className="button button-primary" type="submit">Sign in</button>
    <p>New here? <Link to="/register">Create an account</Link></p>
  </form>;
}

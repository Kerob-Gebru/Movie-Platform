import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { signInDemo } from './authSlice';

export default function RegisterForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const dispatch = useDispatch();
  const navigate = useNavigate();

  function submit(event) {
    event.preventDefault();
    if (!name.trim() || !email.trim() || password.length < 4) return;
    dispatch(signInDemo({ name: name.trim(), email: email.trim() }));
    navigate('/');
  }

  return <form className="auth-card" onSubmit={submit}>
    <span className="section-kicker">JOIN THE COMMUNITY</span><h1>Create account</h1>
    <p className="auth-note">Demo interface only — no account is saved to a server.</p>
    <label>Name<input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Your name" /></label>
    <label>Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@example.com" /></label>
    <label>Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={4} required placeholder="At least 4 characters" /></label>
    <button className="button button-primary" type="submit">Create account</button>
    <p>Already registered? <Link to="/login">Sign in</Link></p>
  </form>;
}

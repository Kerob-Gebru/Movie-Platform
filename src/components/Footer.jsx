import { Clapperboard, Github, Instagram, Twitter } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Footer() {
  return <footer className="footer"><div className="page-container footer-inner">
    <Link to="/" className="brand footer-brand"><span className="brand-mark"><Clapperboard size={19} /></span><span>Net<span className="brand-accent">flix</span></span></Link>
    <p>Stories worth staying in for.</p>
    <div className="footer-socials"><a href="https://github.com" aria-label="GitHub"><Github size={17} /></a><a href="https://instagram.com" aria-label="Instagram"><Instagram size={17} /></a><a href="https://twitter.com" aria-label="Twitter"><Twitter size={17} /></a></div>
    <small>Movie metadata provided by a third-party API. This is an independent discovery interface.</small>
  </div></footer>;
}

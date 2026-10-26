import { useState } from 'react';
import { Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setQuery } from './searchSlice';

export default function SearchBar({ initialValue = '' }) {
  const [value, setValue] = useState(initialValue);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  function submit(event) {
    event.preventDefault();
    const query = value.trim();
    if (!query) return;
    dispatch(setQuery(query));
    navigate(`/search?q=${encodeURIComponent(query)}`);
  }

  return <form className="nav-search" onSubmit={submit}>
    <Search size={17} />
    <input value={value} onChange={(event) => setValue(event.target.value)} placeholder="Search titles..." aria-label="Search titles" />
    <button aria-label="Submit search" type="submit">↵</button>
  </form>;
}

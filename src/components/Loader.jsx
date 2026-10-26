export default function Loader({ label = 'Finding something great to watch...' }) {
  return <div className="loading-state" role="status" aria-live="polite"><span className="loader" /><p>{label}</p><span className="loading-track"><span /></span></div>;
}

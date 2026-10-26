import { AlertCircle, RefreshCw } from 'lucide-react';

function getHelpText(error) {
  const status = Number(error?.status);
  if (status === 429) {
    return 'This is a rate limit returned by Netflix54/RapidAPI, not an empty search result. Do not keep retrying while the limit is active. Check your RapidAPI Usage/Quota dashboard for the exact reset time; local code cannot restore an exhausted provider quota.';
  }
  if (status === 401 || status === 403) {
    return 'Check that the private RAPIDAPI_KEY in your local .env file is correct and that your RapidAPI account is subscribed to Netflix54.';
  }
  if (status === 503 && error?.source === 'local-proxy') {
    return 'The local proxy did not load RAPIDAPI_KEY. Make sure .env is in the project root, then stop and restart Vite. Open /api/health to check whether the key is loaded without revealing the key itself.';
  }
  if (status === 503 && error?.source === 'rapidapi-upstream') {
    return 'This HTTP 503 came from Netflix54/RapidAPI, not the React page. The proxy automatically retried twice. Check the provider status and try again later; repeated manual retries will not fix an upstream outage.';
  }
  if (status === 503) {
    return 'A service returned HTTP 503. Open /api/health to verify local proxy configuration; the error details below identify whether the local proxy or provider is responsible.';
  }
  if (status === 404) {
    return 'The API route or title may not be available. Check the configured Netflix54 endpoint paths in .env.';
  }
  return 'Check your network connection and the Netflix54 API configuration. Try again after confirming the service is available.';
}

export default function ErrorMessage({ error, onRetry }) {
  const message = error?.message || error?.data?.message || 'We could not load titles right now.';
  const status = Number(error?.status);
  return <div className="error-state" role="alert" aria-live="polite">
    <AlertCircle size={28} />
    <h3>{status === 429 ? 'API rate limit reached' : 'We hit a little snag'}</h3>
    <p>{message}</p>
    {onRetry && status !== 429 && <button className="button button-secondary" onClick={onRetry}><RefreshCw size={16} /> Try again</button>}
    <small>{getHelpText(error)}</small>
    {error?.providerMessage && error.providerMessage !== message && <small className="error-provider-detail">Provider detail: {String(error.providerMessage).slice(0, 300)}</small>}
  </div>;
}

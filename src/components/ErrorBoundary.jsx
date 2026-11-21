import { Component } from 'react';

const CHUNK_ERROR = /dynamically imported module|Failed to fetch|Loading chunk|Importing a module script failed/i;

function Fallback({ error, fullScreen }) {
  const stale = CHUNK_ERROR.test(String(error?.message || ''));
  return (
    <div className={`flex items-center justify-center p-6 ${fullScreen ? 'min-h-screen bg-dark-950 text-dark-100' : 'min-h-[50vh]'}`}>
      <div role="alert" className="w-full max-w-md rounded-2xl border border-white/10 bg-dark-800/60 p-8 text-center">
        <p className="mb-3 text-4xl" aria-hidden="true">⚠️</p>
        <h1 className="text-xl font-bold text-dark-50">{stale ? 'This page could not be loaded' : 'Something went wrong'}</h1>
        <p className="mt-2 text-sm text-dark-300">
          {stale
            ? 'Your connection may have dropped, or a newer version of Convertix was released. Reloading usually fixes it.'
            : 'An unexpected error stopped this page. Your files were not uploaded anywhere and nothing was lost on the server. Reload to try again.'}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button type="button" onClick={() => window.location.reload()} className="rounded-xl bg-gradient-to-r from-primary-700 to-primary-600 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:from-primary-600 hover:to-primary-500">
            Reload page
          </button>
          <a href={import.meta.env.BASE_URL} className="rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-semibold text-dark-100 transition-colors hover:bg-white/10">
            Go to Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}

/**
 * Catches render errors (and failed lazy-loaded pages) so the user sees a recovery screen,
 * not a blank page. Give it a `key` that changes on navigation to reset it.
 */
export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Convertix error:', error, info?.componentStack);
  }

  render() {
    if (this.state.error) return <Fallback error={this.state.error} fullScreen={this.props.fullScreen} />;
    return this.props.children;
  }
}

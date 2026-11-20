import { Link, useLocation } from 'react-router-dom';
import { SearchX } from 'lucide-react';
import PageTransition from '@/components/PageTransition';
import PageHeader from '@/components/ui/PageHeader';

export default function NotFound() {
  const { pathname } = useLocation();
  return (
    <PageTransition>
      <PageHeader icon={SearchX} accent="neutral" title="Page not found" description="That address doesn't match any tool." />
      <div className="rounded-2xl border border-white/10 bg-dark-800/60 p-8 text-center">
        <p className="text-sm text-dark-300">
          There is nothing at <code className="rounded bg-white/5 px-1.5 py-0.5 text-dark-100">{pathname}</code>. Use the sidebar, or press{' '}
          <kbd className="rounded border border-white/15 bg-dark-800 px-1.5 py-0.5 text-xs font-semibold text-dark-100">Ctrl K</kbd> to search for a tool.
        </p>
        <Link to="/" className="mt-5 inline-flex rounded-xl bg-gradient-to-r from-primary-700 to-primary-600 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:from-primary-600 hover:to-primary-500">
          Go to Dashboard
        </Link>
      </div>
    </PageTransition>
  );
}

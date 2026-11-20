import { ChevronRight } from 'lucide-react';

/** Collapsible "Advanced" section: keeps rarely-used options out of the way. */
export default function Disclosure({ title, children, defaultOpen = false, className = '' }) {
  return (
    <details open={defaultOpen} className={`group rounded-xl border border-white/10 bg-dark-900/30 ${className}`}>
      <summary className="flex cursor-pointer list-none items-center gap-2 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-dark-300 transition-colors hover:text-dark-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-secondary-400 [&::-webkit-details-marker]:hidden">
        <ChevronRight className="h-3.5 w-3.5 transition-transform group-open:rotate-90" aria-hidden="true" />
        {title}
      </summary>
      <div className="space-y-4 border-t border-white/5 px-3.5 py-3.5">{children}</div>
    </details>
  );
}

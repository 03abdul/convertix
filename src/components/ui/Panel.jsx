/** Standard surface. Optional heading row with an action on the right. */
export default function Panel({ title, description, action, children, className = '', bodyClassName = '' }) {
  return (
    <section className={`rounded-2xl border border-white/10 bg-dark-800/60 ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between gap-3 px-5 pt-4">
          <div className="min-w-0">
            {title && <h2 className="text-sm font-bold text-dark-100">{title}</h2>}
            {description && <p className="mt-0.5 text-xs text-dark-400">{description}</p>}
          </div>
          {action}
        </div>
      )}
      <div className={`p-5 ${title || action ? 'pt-4' : ''} ${bodyClassName}`}>{children}</div>
    </section>
  );
}

/** Small uppercase label used to group controls inside a panel. */
export function SectionLabel({ children, className = '' }) {
  return <p className={`mb-2 text-[11px] font-bold uppercase tracking-wider text-dark-400 ${className}`}>{children}</p>;
}

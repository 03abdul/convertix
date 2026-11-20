const ACCENTS = {
  secondary: 'bg-secondary-500/15 border-secondary-500/25 text-secondary-400',
  primary: 'bg-primary-500/15 border-primary-500/25 text-primary-400',
  accent: 'bg-accent-500/15 border-accent-500/25 text-accent-400',
  error: 'bg-error-500/15 border-error-500/25 text-error-400',
  success: 'bg-success-500/15 border-success-500/25 text-success-400',
  neutral: 'bg-white/5 border-white/10 text-dark-200',
};

/** Page title row: icon chip, title, one-line description, optional actions on the right. */
export default function PageHeader({ icon: Icon, title, description, accent = 'secondary', actions }) {
  return (
    <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div className="flex min-w-0 items-start gap-3.5">
        {Icon && (
          <span className={`mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${ACCENTS[accent] || ACCENTS.secondary}`}>
            <Icon className="h-5 w-5" aria-hidden="true" />
          </span>
        )}
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold tracking-tight text-dark-50">{title}</h1>
          {description && <p className="mt-0.5 max-w-2xl text-sm text-dark-400">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </header>
  );
}

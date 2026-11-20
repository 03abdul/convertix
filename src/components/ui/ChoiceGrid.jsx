/**
 * Grid of selectable cards for picking an operation or tool.
 * options: [{ value, label, description?, icon? }]
 */
export default function ChoiceGrid({ value, onChange, options, ariaLabel, columns = 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4', compact = false }) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className={`grid gap-2 ${columns}`}>
      {options.map((option) => {
        const selected = option.value === value;
        const Icon = option.icon;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className={`group flex items-start gap-3 rounded-xl border text-left transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-secondary-400 ${compact ? 'p-2.5' : 'p-3.5'} ${
              selected
                ? 'border-secondary-500/50 bg-secondary-500/10 shadow shadow-secondary-500/10'
                : 'border-white/10 bg-dark-800/50 hover:border-white/20 hover:bg-dark-800/80'
            }`}
          >
            {Icon && (
              <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${selected ? 'bg-secondary-500/20 text-secondary-300' : 'bg-white/5 text-dark-300 group-hover:text-dark-100'}`}>
                <Icon className="h-4 w-4" aria-hidden="true" />
              </span>
            )}
            <span className="min-w-0">
              <span className={`block text-sm font-semibold ${selected ? 'text-secondary-100' : 'text-dark-100'}`}>{option.label}</span>
              {option.description && !compact && <span className="mt-0.5 block text-xs leading-snug text-dark-400">{option.description}</span>}
            </span>
          </button>
        );
      })}
    </div>
  );
}

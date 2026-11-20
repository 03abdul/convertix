import { useRef } from 'react';

/**
 * Pill-style single choice (radio group semantics, arrow-key navigation).
 * options: [{ value, label, icon?, disabled?, title? }]
 */
export default function Segmented({ value, onChange, options, ariaLabel, size = 'md', fullWidth = false, className = '' }) {
  const refs = useRef([]);

  const onKeyDown = (event, index) => {
    const enabled = options.map((option, i) => (option.disabled ? -1 : i)).filter((i) => i >= 0);
    const position = enabled.indexOf(index);
    let next = null;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = enabled[(position + 1) % enabled.length];
    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = enabled[(position - 1 + enabled.length) % enabled.length];
    if (next === null) return;
    event.preventDefault();
    onChange(options[next].value);
    refs.current[next]?.focus();
  };

  // Keep the group reachable by keyboard even when nothing is selected (e.g. a custom slider value).
  const firstEnabled = options.findIndex((option) => !option.disabled);
  const hasSelection = options.some((option) => option.value === value);

  const padding = size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm';

  return (
    <div role="radiogroup" aria-label={ariaLabel} className={`inline-flex flex-wrap gap-1 rounded-xl border border-white/10 bg-dark-900/60 p-1 ${fullWidth ? 'flex w-full' : ''} ${className}`}>
      {options.map((option, index) => {
        const selected = option.value === value;
        const Icon = option.icon;
        return (
          <button
            key={option.value}
            ref={(element) => { refs.current[index] = element; }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected || (!hasSelection && index === firstEnabled) ? 0 : -1}
            disabled={option.disabled}
            title={option.title}
            onClick={() => onChange(option.value)}
            onKeyDown={(event) => onKeyDown(event, index)}
            className={`inline-flex items-center justify-center gap-1.5 rounded-lg font-semibold transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-secondary-400 disabled:cursor-not-allowed disabled:opacity-40 ${padding} ${fullWidth ? 'flex-1' : ''} ${
              selected ? 'bg-secondary-500 text-dark-950 shadow shadow-secondary-500/25' : 'text-dark-300 hover:bg-white/5 hover:text-dark-100'
            }`}
          >
            {Icon && <Icon className="h-4 w-4" aria-hidden="true" />}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

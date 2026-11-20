import { useId } from 'react';
import { ChevronDown } from 'lucide-react';

const control = 'w-full rounded-lg border border-white/10 bg-dark-900/60 px-3 py-2 text-sm text-dark-100 placeholder:text-dark-500 transition-colors focus:border-secondary-500/50 focus:outline-none focus-visible:ring-1 focus-visible:ring-secondary-500/40 disabled:opacity-40';

/** Label + control + optional hint. Pass a render function to receive the generated id. */
export function Field({ label, hint, className = '', children }) {
  const id = useId();
  return (
    <div className={className}>
      {label && <label htmlFor={id} className="mb-1.5 block text-xs font-medium text-dark-400">{label}</label>}
      {typeof children === 'function' ? children(id) : children}
      {hint && <p className="mt-1 text-xs text-dark-500">{hint}</p>}
    </div>
  );
}

export function TextInput({ label, hint, className = '', ...props }) {
  return (
    <Field label={label} hint={hint} className={className}>
      {(id) => <input id={id} type="text" className={control} {...props} />}
    </Field>
  );
}

export function NumberInput({ label, hint, className = '', onChange, ...props }) {
  return (
    <Field label={label} hint={hint} className={className}>
      {(id) => <input id={id} type="number" className={control} onChange={(event) => onChange?.(event.target.value === '' ? '' : Number(event.target.value))} {...props} />}
    </Field>
  );
}

export function Select({ label, hint, className = '', children, ...props }) {
  return (
    <Field label={label} hint={hint} className={className}>
      {(id) => (
        <div className="relative">
          <select id={id} className={`${control} appearance-none pr-9`} {...props}>{children}</select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-dark-400" aria-hidden="true" />
        </div>
      )}
    </Field>
  );
}

/** Labelled range input with a live value readout. `onChange` receives a number. */
export function Slider({ label, value, onChange, min = 0, max = 100, step = 1, unit = '%', format, hint, minLabel, maxLabel, disabled = false, className = '' }) {
  const id = useId();
  const shown = format ? format(value) : `${value}${unit}`;
  return (
    <div className={className}>
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <label htmlFor={id} className="text-xs font-medium text-dark-300">{label}</label>
        <span className="rounded-md bg-secondary-500/10 px-2 py-0.5 text-xs font-bold tabular-nums text-secondary-300">{shown}</span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-1.5 w-full cursor-pointer accent-secondary-500 disabled:cursor-not-allowed disabled:opacity-40"
      />
      {(minLabel || maxLabel) && (
        <div className="mt-1 flex justify-between text-[11px] text-dark-500"><span>{minLabel}</span><span>{maxLabel}</span></div>
      )}
      {hint && <p className="mt-1 text-xs text-dark-500">{hint}</p>}
    </div>
  );
}

/** Switch with a label and optional description. */
export function Toggle({ checked, onChange, label, description, disabled = false, className = '' }) {
  return (
    <label className={`flex cursor-pointer items-start justify-between gap-4 ${disabled ? 'cursor-not-allowed opacity-50' : ''} ${className}`}>
      <span className="min-w-0">
        <span className="block text-sm font-medium text-dark-100">{label}</span>
        {description && <span className="mt-0.5 block text-xs text-dark-400">{description}</span>}
      </span>
      <span className="relative mt-0.5 inline-flex shrink-0">
        <input
          type="checkbox"
          role="switch"
          checked={checked}
          disabled={disabled}
          onChange={(event) => onChange(event.target.checked)}
          className="peer sr-only"
        />
        <span className="h-5 w-9 rounded-full bg-dark-600 transition-colors peer-checked:bg-secondary-500 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-secondary-400" />
        <span className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4" />
      </span>
    </label>
  );
}

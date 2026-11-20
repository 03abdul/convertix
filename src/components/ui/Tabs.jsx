import { useId, useRef } from 'react';

/**
 * Accessible tab strip. Render each section with <TabPanel>.
 * tabs: [{ id, label, icon?, badge? }]
 */
export function Tabs({ tabs, value, onChange, ariaLabel, idPrefix, className = '' }) {
  const generated = useId();
  const group = idPrefix || generated;
  const refs = useRef([]);

  const onKeyDown = (event, index) => {
    let next = null;
    if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
    if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = tabs.length - 1;
    if (next === null) return;
    event.preventDefault();
    onChange(tabs[next].id);
    refs.current[next]?.focus();
  };

  return (
    <div role="tablist" aria-label={ariaLabel} className={`flex gap-1 overflow-x-auto rounded-xl border border-white/10 bg-dark-900/60 p-1 scrollbar-thin ${className}`}>
      {tabs.map((tab, index) => {
        const selected = tab.id === value;
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            ref={(element) => { refs.current[index] = element; }}
            type="button"
            role="tab"
            id={`${group}-tab-${tab.id}`}
            aria-selected={selected}
            aria-controls={`${group}-panel-${tab.id}`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tab.id)}
            onKeyDown={(event) => onKeyDown(event, index)}
            className={`relative flex min-w-fit flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-2 text-xs font-semibold transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-secondary-400 ${
              selected ? 'bg-secondary-500/15 text-secondary-200' : 'text-dark-300 hover:bg-white/5 hover:text-dark-100'
            }`}
          >
            {Icon && <Icon className="h-3.5 w-3.5" aria-hidden="true" />}
            {tab.label}
            {tab.badge ? <span className="h-1.5 w-1.5 rounded-full bg-secondary-400" aria-label="has changes" /> : null}
          </button>
        );
      })}
    </div>
  );
}

export function TabPanel({ id, value, idPrefix, children }) {
  if (id !== value) return null;
  return <div role="tabpanel" id={`${idPrefix}-panel-${id}`} aria-labelledby={`${idPrefix}-tab-${id}`} className="space-y-5">{children}</div>;
}

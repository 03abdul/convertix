import { useEffect, useRef } from 'react';
import { Keyboard, X } from 'lucide-react';

function Key({ children }) {
  return (
    <kbd className="rounded-md border border-white/15 bg-dark-800 px-1.5 py-0.5 font-sans text-[11px] font-semibold text-dark-100">
      {children}
    </kbd>
  );
}

export default function ShortcutsDialog({ open, onClose, navItems }) {
  const closeRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const previouslyFocused = document.activeElement;
    closeRef.current?.focus();
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      previouslyFocused?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-dark-950/70 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div role="dialog" aria-modal="true" aria-labelledby="shortcuts-title" className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-white/10 bg-dark-900 p-6 shadow-2xl">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary-500/15 border border-secondary-500/20">
            <Keyboard className="h-4 w-4 text-secondary-400" />
          </div>
          <h2 id="shortcuts-title" className="flex-1 text-lg font-bold">Keyboard shortcuts</h2>
          <button ref={closeRef} type="button" aria-label="Close shortcuts" onClick={onClose} className="rounded-lg p-2 text-dark-400 hover:bg-white/5 hover:text-dark-100">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <section>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-dark-400">General</h3>
            <ul className="space-y-2 text-sm text-dark-200">
              <li className="flex items-center justify-between gap-3"><span>Search tools</span><span className="flex gap-1"><Key>Ctrl</Key><Key>K</Key> <span className="text-dark-500">or</span> <Key>/</Key></span></li>
              <li className="flex items-center justify-between gap-3"><span>Paste an image or file</span><span className="flex gap-1"><Key>Ctrl</Key><Key>V</Key></span></li>
              <li className="flex items-center justify-between gap-3"><span>Show this help</span><Key>?</Key></li>
              <li className="flex items-center justify-between gap-3"><span>Close dialog</span><Key>Esc</Key></li>
            </ul>
            <h3 className="mb-2 mt-5 text-xs font-bold uppercase tracking-wider text-dark-400">Image Editor</h3>
            <ul className="space-y-2 text-sm text-dark-200">
              <li className="flex items-center justify-between gap-3"><span>Undo</span><span className="flex gap-1"><Key>Ctrl</Key><Key>Z</Key></span></li>
              <li className="flex items-center justify-between gap-3"><span>Redo</span><span className="flex gap-1"><Key>Ctrl</Key><Key>Shift</Key><Key>Z</Key></span></li>
            </ul>
            <h3 className="mb-2 mt-5 text-xs font-bold uppercase tracking-wider text-dark-400">Before / after slider</h3>
            <ul className="space-y-2 text-sm text-dark-200">
              <li className="flex items-center justify-between gap-3"><span>Move divider</span><span className="flex gap-1"><Key>←</Key><Key>→</Key></span></li>
              <li className="flex items-center justify-between gap-3"><span>Move faster</span><span className="flex gap-1"><Key>Shift</Key><Key>←</Key><Key>→</Key></span></li>
            </ul>
          </section>

          <section>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-dark-400">Go to… <span className="font-normal normal-case text-dark-500">(press G, then a key)</span></h3>
            <ul className="space-y-2 text-sm text-dark-200">
              {navItems.filter((item) => item.shortcut).map((item) => (
                <li key={item.to} className="flex items-center justify-between gap-3">
                  <span>{item.group === 'Documents' ? 'Document Converter' : item.label}</span>
                  <span className="flex gap-1"><Key>G</Key><Key>{item.shortcut.toUpperCase()}</Key></span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}

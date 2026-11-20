import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { CircleHelp, Trash2, TriangleAlert } from 'lucide-react';
import { useId, useRef } from 'react';
import { useModalFocus } from '@/hooks/useModalFocus';

const TONES = {
  danger: {
    icon: Trash2,
    chip: 'bg-error-500/15 text-error-400 border-error-500/25',
    confirm: 'from-error-700 to-error-600 hover:from-error-600 hover:to-error-600 shadow-error-500/20',
  },
  warning: {
    icon: TriangleAlert,
    chip: 'bg-warning-500/15 text-warning-400 border-warning-500/25',
    confirm: 'from-primary-700 to-primary-600 hover:from-primary-600 hover:to-primary-600 shadow-primary-500/20',
  },
  default: {
    icon: CircleHelp,
    chip: 'bg-primary-500/15 text-primary-300 border-primary-500/25',
    confirm: 'from-primary-700 to-primary-600 hover:from-primary-600 hover:to-primary-600 shadow-primary-500/20',
  },
};

/** Modal that asks the user to confirm. `dialog` is null when closed; `onClose(true|false)` answers it. */
export default function ConfirmDialog({ dialog, onClose }) {
  const reduceMotion = useReducedMotion();
  const titleId = useId();
  const messageId = useId();
  const panelRef = useRef(null);
  const cancelRef = useRef(null);
  const confirmRef = useRef(null);
  const tone = TONES[dialog?.tone] || TONES.default;
  const Icon = tone.icon;

  // For destructive actions the safe choice (Cancel) gets focus first.
  useModalFocus({
    open: Boolean(dialog),
    onClose: () => onClose(false),
    panelRef,
    initialFocusRef: dialog?.tone === 'danger' ? cancelRef : confirmRef,
  });

  return (
    <AnimatePresence>
      {dialog && (
        <motion.div
          key="confirm-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[120] flex items-center justify-center bg-dark-950/70 p-4 backdrop-blur-sm"
          onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(false); }}
        >
          <motion.div
            ref={panelRef}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={messageId}
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.97 }}
            animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 460, damping: 34 }}
            className="w-full max-w-md rounded-2xl border border-white/10 bg-dark-900 p-6 shadow-2xl shadow-black/60"
          >
            <div className="flex items-start gap-4">
              <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${tone.chip}`}>
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <h2 id={titleId} className="text-lg font-bold text-dark-50">{dialog.title}</h2>
                <p id={messageId} className="mt-1.5 text-sm leading-relaxed text-dark-300">{dialog.message}</p>
              </div>
            </div>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                ref={cancelRef}
                type="button"
                onClick={() => onClose(false)}
                className="rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-semibold text-dark-100 transition-colors hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-secondary-400"
              >
                {dialog.cancelLabel || 'Cancel'}
              </button>
              <button
                ref={confirmRef}
                type="button"
                onClick={() => onClose(true)}
                className={`rounded-xl bg-gradient-to-r px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition-all active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary-300 ${tone.confirm}`}
              >
                {dialog.confirmLabel || 'Confirm'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { CheckCircle2, CircleAlert, Info, TriangleAlert, X } from 'lucide-react';
import { TOAST_DURATION, TOAST_TITLE, pushToast, removeToast } from '@/utils/toasts';

const FeedbackContext = createContext(null);

const STYLES = {
  success: { icon: CheckCircle2, ring: 'border-success-500/30', chip: 'bg-success-500/15 text-success-400', bar: 'bg-success-400', accent: 'from-success-500/10' },
  error: { icon: CircleAlert, ring: 'border-error-500/35', chip: 'bg-error-500/15 text-error-400', bar: 'bg-error-400', accent: 'from-error-500/10' },
  warning: { icon: TriangleAlert, ring: 'border-warning-500/35', chip: 'bg-warning-500/15 text-warning-400', bar: 'bg-warning-400', accent: 'from-warning-500/10' },
  info: { icon: Info, ring: 'border-primary-500/35', chip: 'bg-primary-500/15 text-primary-300', bar: 'bg-primary-400', accent: 'from-primary-500/10' },
};

function Toast({ toast, onDismiss, reduceMotion }) {
  const style = STYLES[toast.type];
  const Icon = style.icon;
  const duration = toast.duration ?? TOAST_DURATION[toast.type];
  const title = toast.title ?? TOAST_TITLE[toast.type];

  return (
    <motion.div
      layout={!reduceMotion}
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, x: 28, scale: 0.97 }}
      animate={reduceMotion ? { opacity: 1 } : { opacity: 1, x: 0, scale: 1 }}
      exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: 28, scale: 0.97, transition: { duration: 0.18 } }}
      transition={{ type: 'spring', stiffness: 420, damping: 34 }}
      role={toast.type === 'error' ? 'alert' : 'status'}
      className={`group pointer-events-auto relative overflow-hidden rounded-2xl border bg-gradient-to-br to-dark-900 ${style.accent} bg-dark-900 shadow-2xl shadow-black/50 ${style.ring}`}
    >
      <div className="flex items-start gap-3 p-4 pr-3">
        <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${style.chip}`}>
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 text-sm font-bold text-dark-50">
            {title}
            {toast.count > 1 && <span className="rounded-full bg-white/10 px-1.5 py-px text-[11px] font-bold tabular-nums text-dark-200" aria-label={`${toast.count} times`}>×{toast.count}</span>}
          </p>
          <p className="mt-0.5 break-words text-sm leading-snug text-dark-300">{toast.message}</p>
          {toast.action && (
            <button
              type="button"
              onClick={() => { toast.action.onClick(); onDismiss(toast.id); }}
              className="mt-2.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold text-dark-50 transition-colors hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-secondary-400"
            >
              {toast.action.label}
            </button>
          )}
        </div>
        <button
          type="button"
          aria-label="Dismiss notification"
          onClick={() => onDismiss(toast.id)}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-dark-400 transition-colors hover:bg-white/10 hover:text-dark-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-secondary-400"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      {/* The countdown bar doubles as the timer: when it finishes, the toast closes. Hover or focus pauses it. */}
      <div className="h-[3px] w-full bg-white/5">
        <div
          key={toast.nonce}
          className={`toast-bar h-full origin-left ${style.bar}`}
          style={{ animationDuration: `${duration}ms` }}
          onAnimationEnd={() => onDismiss(toast.id)}
        />
      </div>
    </motion.div>
  );
}

export function FeedbackProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const reduceMotion = useReducedMotion();

  const dismiss = useCallback((id) => setToasts((current) => removeToast(current, id)), []);

  /**
   * Shows a popup. `type` is 'success' | 'error' | 'warning' | 'info' (default 'error').
   * options: { title, duration (ms), action: { label, onClick } }
   */
  const notify = useCallback((message, type = 'error', options = {}) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setToasts((current) => pushToast(current, { id, message, type, ...options }));
  }, []);

  const value = useMemo(() => ({ notify, dismiss }), [notify, dismiss]);

  return (
    <FeedbackContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-3 top-[4.75rem] z-[100] flex flex-col gap-2.5 sm:left-auto sm:right-4 sm:w-[24rem]"
        aria-live="polite"
        aria-relevant="additions"
        data-testid="toast-region"
      >
        <AnimatePresence initial={false}>
          {toasts.map((toast) => <Toast key={toast.id} toast={toast} onDismiss={dismiss} reduceMotion={reduceMotion} />)}
        </AnimatePresence>
      </div>
    </FeedbackContext.Provider>
  );
}

export function useFeedback() {
  const context = useContext(FeedbackContext);
  if (!context) throw new Error('useFeedback must be used within FeedbackProvider');
  return context;
}

export function getErrorMessage(error) {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
}

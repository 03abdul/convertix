import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

const DialogContext = createContext(null);

export function DialogProvider({ children }) {
  const [dialog, setDialog] = useState(null);
  const resolver = useRef(null);

  const close = useCallback((answer) => {
    resolver.current?.(answer);
    resolver.current = null;
    setDialog(null);
  }, []);

  /**
   * Opens the custom confirm dialog and resolves to true (confirmed) or false (cancelled).
   * options: { title, message, confirmLabel, cancelLabel, tone: 'danger' | 'warning' | 'default' }
   */
  const confirm = useCallback((options) => new Promise((resolve) => {
    resolver.current?.(false); // a newer request replaces an open one
    resolver.current = resolve;
    setDialog(options);
  }), []);

  const value = useMemo(() => ({ confirm }), [confirm]);

  return (
    <DialogContext.Provider value={value}>
      {children}
      <ConfirmDialog dialog={dialog} onClose={close} />
    </DialogContext.Provider>
  );
}

/** Returns confirm(options) -> Promise<boolean>. Use instead of window.confirm. */
export function useConfirm() {
  const context = useContext(DialogContext);
  if (!context) throw new Error('useConfirm must be used within DialogProvider');
  return context.confirm;
}

export const TOAST_TYPES = ['success', 'error', 'warning', 'info'];
export const MAX_TOASTS = 4;

/** How long each kind stays on screen (ms). Errors stay longer: they need reading. */
export const TOAST_DURATION = { success: 4500, info: 5000, warning: 7000, error: 9000 };

export const TOAST_TITLE = {
  success: 'Done',
  error: 'Something went wrong',
  warning: 'Heads up',
  info: 'Note',
};

/**
 * Adds a toast to the list.
 *  - An identical message of the same type is merged (count goes up, timer restarts) instead of stacking.
 *  - At most `max` toasts stay visible; the oldest are dropped first.
 */
export function pushToast(list, toast, max = MAX_TOASTS) {
  const type = TOAST_TYPES.includes(toast.type) ? toast.type : 'error';
  const existing = list.find((item) => item.message === toast.message && item.type === type);
  if (existing) {
    return list.map((item) => (item.id === existing.id ? { ...item, count: item.count + 1, nonce: item.nonce + 1 } : item));
  }
  const next = [...list, { ...toast, type, count: 1, nonce: 0 }];
  return next.slice(-max);
}

export function removeToast(list, id) {
  return list.filter((item) => item.id !== id);
}

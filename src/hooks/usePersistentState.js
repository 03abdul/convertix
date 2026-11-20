import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * useState that remembers its value in localStorage (per-tool settings such as quality or format).
 * Stored values are merged over `initial` so newly added options still get defaults.
 * Works when storage is unavailable (private mode, blocked): it just behaves like useState.
 */
export function usePersistentState(key, initial) {
  const initialRef = useRef(initial);
  const [value, setValue] = useState(() => {
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return { ...initial, ...parsed };
        return parsed;
      }
    } catch { /* ignore unreadable or unavailable storage */ }
    return initial;
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch { /* storage full or blocked */ }
  }, [key, value]);

  const reset = useCallback(() => setValue(initialRef.current), []);
  return [value, setValue, reset];
}

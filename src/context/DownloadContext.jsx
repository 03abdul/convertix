import { createContext, useContext, useReducer, useCallback, useEffect, useRef, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { useFeedback } from '@/context/FeedbackContext';
import { formatBytes } from '@/utils/format';

const DownloadContext = createContext(null);

// Every processed file is held in memory so it can be downloaded later. Cap the total so a long
// session (or a few big batches) cannot exhaust the tab: the oldest files are dropped first.
export const MAX_STORED_BYTES = 300 * 1024 * 1024;
export const MAX_STORED_ITEMS = 200;

const initialState = { items: [], evicted: 0 };

/** Drops the oldest items until the list fits the caps. The newest item is always kept. */
export function trimItems(items, maxBytes = MAX_STORED_BYTES, maxItems = MAX_STORED_ITEMS) {
  let total = items.reduce((sum, item) => sum + (item.size || 0), 0);
  let start = 0;
  while (start < items.length - 1 && (total > maxBytes || items.length - start > maxItems)) {
    total -= items[start].size || 0;
    start += 1;
  }
  return { items: items.slice(start), evicted: start };
}

function withTrim(state, items) {
  const trimmed = trimItems(items);
  return { items: trimmed.items, evicted: state.evicted + trimmed.evicted };
}

function reducer(state, action) {
  switch (action.type) {
    case 'ADD_ITEM':
      return withTrim(state, [...state.items, action.payload]);
    case 'ADD_ITEMS':
      return withTrim(state, [...state.items, ...action.payload]);
    case 'UPDATE_ITEM':
      return {
        ...state,
        items: state.items.map((it) =>
          it.id === action.payload.id ? { ...it, ...action.payload } : it
        ),
      };
    case 'REMOVE_ITEM':
      return { ...state, items: state.items.filter((it) => it.id !== action.payload) };
    case 'CLEAR_ALL':
      return { items: [], evicted: 0 };
    default:
      return state;
  }
}

export function DownloadProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [failedItems, setFailedItems] = useState([]);
  const { addRecentFile } = useApp();
  const { notify } = useFeedback();
  const notifiedEvictions = useRef(0);

  useEffect(() => {
    const newlyEvicted = state.evicted - notifiedEvictions.current;
    if (newlyEvicted > 0) {
      notifiedEvictions.current = state.evicted;
      notify(
        `Removed ${newlyEvicted} older file${newlyEvicted === 1 ? '' : 's'} from Downloads to save memory (limit ${formatBytes(MAX_STORED_BYTES)}). Download files you want to keep.`,
        'warning',
        { title: 'Older files removed' }
      );
    } else if (state.evicted === 0) {
      notifiedEvictions.current = 0;
    }
  }, [state.evicted, notify]);

  const addItem = useCallback((item) => {
    const id = `dl-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const entry = {
      id,
      name: item.name,
      blob: item.blob,
      size: item.size || item.blob?.size || 0,
      source: item.source || 'Unknown',
      timestamp: Date.now(),
      status: 'done',
    };
    dispatch({ type: 'ADD_ITEM', payload: entry });
    addRecentFile(entry);
    return id;
  }, [addRecentFile]);

  const addItems = useCallback((items) => {
    const entries = items.map((item, i) => ({
      id: `dl-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
      name: item.name,
      blob: item.blob,
      size: item.size || item.blob?.size || 0,
      source: item.source || 'Unknown',
      timestamp: Date.now(),
      status: 'done',
    }));
    dispatch({ type: 'ADD_ITEMS', payload: entries });
    entries.forEach(addRecentFile);
    return entries.map((e) => e.id);
  }, [addRecentFile]);

  const removeItem = useCallback((id) => {
    dispatch({ type: 'REMOVE_ITEM', payload: id });
  }, []);

  const clearAll = useCallback(() => {
    dispatch({ type: 'CLEAR_ALL' });
    setFailedItems([]);
  }, []);

  const addFailedItems = useCallback((items) => {
    setFailedItems((current) => [
      ...current,
      ...items.map((item) => ({
        ...item,
        id: `failed-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        timestamp: Date.now(),
      })),
    ]);
  }, []);

  const removeFailedItem = useCallback((id) => {
    setFailedItems((current) => current.filter((item) => item.id !== id));
  }, []);

  return (
    <DownloadContext.Provider value={{ items: state.items, failedItems, addItem, addItems, removeItem, clearAll, addRecentFile, addFailedItems, removeFailedItem }}>
      {children}
    </DownloadContext.Provider>
  );
}

export function useDownloads() {
  const ctx = useContext(DownloadContext);
  if (!ctx) throw new Error('useDownloads must be used within DownloadProvider');
  return ctx;
}

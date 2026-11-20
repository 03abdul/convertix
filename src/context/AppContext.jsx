import { createContext, useContext, useState, useCallback } from 'react';

const AppContext = createContext(null);

const DEFAULT_SETTINGS = {
  defaultFormat: 'webp',
  defaultQuality: 85,
  preserveMetadata: true,
};

export function AppProvider({ children }) {
  const [settings, setSettings] = useState(() => {
    try {
      const stored = localStorage.getItem('mediaforge-settings');
      if (stored) return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
    } catch {}
    return DEFAULT_SETTINGS;
  });

  const [recentFiles, setRecentFiles] = useState(() => {
    try {
      const stored = sessionStorage.getItem('mediaforge-recent');
      if (stored) return JSON.parse(stored);
    } catch {}
    return [];
  });

  const updateSettings = useCallback((updates) => {
    setSettings((prev) => {
      const next = { ...prev, ...updates };
      try {
        localStorage.setItem('mediaforge-settings', JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  const addRecentFile = useCallback((file) => {
    setRecentFiles((prev) => {
      const entry = {
        name: file.name,
        source: file.source || 'Unknown',
        timestamp: Date.now(),
        size: file.size || 0,
      };
      const next = [entry, ...prev.filter((f) => f.name !== entry.name)].slice(0, 12);
      try {
        sessionStorage.setItem('mediaforge-recent', JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  const clearRecentFiles = useCallback(() => {
    setRecentFiles([]);
    sessionStorage.removeItem('mediaforge-recent');
  }, []);

  return (
    <AppContext.Provider
      value={{ settings, updateSettings, recentFiles, addRecentFile, clearRecentFiles }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

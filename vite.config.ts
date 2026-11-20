import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  // Module workers: the image worker lazy-loads UTIF via dynamic import, which IIFE workers cannot do.
  worker: { format: 'es' },
  build: {
    // heic2any ships a ~1.3 MB WASM-in-JS decoder; it is only fetched when a HEIC file is opened.
    chunkSizeWarningLimit: 1400,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (/node_modules\/(react|react-dom|react-router|react-router-dom|scheduler)\//.test(id)) return 'react-vendor';
          if (id.includes('framer-motion')) return 'motion';
          if (id.includes('pdf-lib')) return 'pdf-lib';
          return undefined;
        },
      },
    },
  },
});

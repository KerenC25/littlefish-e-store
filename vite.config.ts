import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Reads .env, .env.local and real environment variables (CI sets these from repo variables).
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  return {
    plugins: [react()],
    // Plain globals rather than import.meta.env, so the same modules also run under Jest.
    define: {
      __LFM_SUPABASE_URL__: JSON.stringify(env.VITE_SUPABASE_URL ?? ''),
      __LFM_SUPABASE_ANON_KEY__: JSON.stringify(env.VITE_SUPABASE_ANON_KEY ?? ''),
    },
    build: {
      rollupOptions: {
        output: {
          // Split heavy, rarely-changing vendor code into long-term cacheable chunks.
          manualChunks: {
            react: ['react', 'react-dom', 'react-router-dom'],
            redux: ['@reduxjs/toolkit', 'react-redux'],
            mui: ['@mui/material', '@emotion/react', '@emotion/styled'],
          },
        },
      },
    },
  };
});

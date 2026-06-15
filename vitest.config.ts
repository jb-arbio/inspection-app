import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
    // The whole suite shares one global fake-indexeddb (fake-indexeddb/auto) and
    // the singleton Dexie connection in src/lib/firstVisit/db. With files run in
    // parallel, one file's localDb writes/clear() can collide with another's
    // in-flight DB state, causing intermittent failures (pre-existing). Serialize
    // files so each owns the database for the duration of its run.
    fileParallelism: false,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});

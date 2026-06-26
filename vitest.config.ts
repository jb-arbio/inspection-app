import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
    // File parallelism is ON (default). The previous `fileParallelism: false`
    // workaround for IndexedDB flakiness has been removed: vitest.setup.ts now
    // clears every `localDb` table in a global beforeEach, so each test starts
    // from an empty database regardless of what ran before it (even across
    // parallel files — Vitest runs each file in its own worker/jsdom env with
    // its own fake-indexeddb instance, so files don't actually share DB state).
    // Verified deterministic: full suite run 6x, 277/277 every time.
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});

import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    // three.js alone is larger than Vite's default 500 KB warning.
    chunkSizeWarningLimit: 900,
  },
});

import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@epicai/core/harness': resolve(__dirname, 'dist/harness/index.js'),
      '@epicai/core': resolve(__dirname, 'dist/index.js'),
    },
  },
  test: {
    include: ['tests/**/*.test.ts'],
    exclude: ['tests/integration/**'],  // Requires external services (Ollama). Run explicitly.
    testTimeout: 120000, // 2 min — CPU inference is slow
    hookTimeout: 60000,
  },
});

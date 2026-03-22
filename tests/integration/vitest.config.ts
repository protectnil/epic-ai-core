import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@epicai/core/harness': resolve(__dirname, '../../dist/harness/index.js'),
      '@epicai/core': resolve(__dirname, '../../dist/index.js'),
    },
  },
  test: {
    include: ['tests/integration/**/*.test.ts'],
    testTimeout: 300000, // 5 min — CPU inference with tool calling is slow
    hookTimeout: 60000,
  },
});

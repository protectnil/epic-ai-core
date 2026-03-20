import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    testTimeout: 120000, // 2 min — CPU inference is slow
    hookTimeout: 60000,
  },
});

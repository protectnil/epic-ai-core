import { defineConfig, loadEnv } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig(({ mode }) => {
  // Load .env from project root so droplets with .env get EPICAI_LOG_LOKI_* etc.
  const env = loadEnv(mode, resolve(__dirname, '../..'), '');
  Object.assign(process.env, env);

  return {
    resolve: {
      alias: {
        '@epicai/core/harness': resolve(__dirname, '../../dist/harness/index.js'),
        '@epicai/core': resolve(__dirname, '../../dist/index.js'),
      },
    },
    test: {
      include: ['tests/integration/**/*.test.ts'],
      globalSetup: ['tests/integration/global-setup.ts'],
      testTimeout: 300000, // 5 min — CPU inference with tool calling is slow
      hookTimeout: 60000,
    },
  };
});

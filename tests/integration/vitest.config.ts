import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';

// Load .env from project root so droplets with .env get EPICAI_LOG_LOKI_* etc.
try {
  const envPath = resolve(__dirname, '../../.env');
  const envContent = readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx);
    const val = trimmed.slice(eqIdx + 1);
    if (!(key in process.env)) {
      process.env[key] = val;
    }
  }
} catch {
  // No .env file — fine, env vars come from shell
}

export default defineConfig({
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
});

/**
 * @epicai/core — Harness Public Export Surface Test
 * Verifies that the @epicai/core/harness subpath export resolves correctly
 * and exposes the documented API surface.
 */
import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';

describe('Harness public export surface', () => {
  it('dist/harness/index.js exists and is importable', async () => {
    const entrypoint = resolve(__dirname, '..', '..', 'dist', 'harness', 'index.js');
    expect(existsSync(entrypoint)).toBe(true);

    const mod = await import(entrypoint);

    // Verify all documented exports exist
    expect(typeof mod.createHarnessRunner).toBe('function');
    expect(mod.HarnessProfile).toBeDefined();
    expect(mod.HarnessProfile.Stdio).toBe('stdio');
    expect(mod.HarnessProfile.Http).toBe('http');
    expect(mod.HarnessProfile.Api).toBe('api');
    expect(typeof mod.HarnessRunner).toBe('function');
    expect(typeof mod.StdioHarnessBackend).toBe('function');
    expect(typeof mod.HttpHarnessBackend).toBe('function');
    expect(typeof mod.ApiHarnessBackend).toBe('function');
    expect(typeof mod.runAssertions).toBe('function');
    expect(mod.CANONICAL_TOOLS).toBeDefined();
    expect(mod.CANONICAL_TOOL_NAMES).toBeDefined();
    expect(mod.DEFAULT_TIMEOUTS).toBeDefined();
  });

  it('dist/harness/index.d.ts type declarations exist', () => {
    const dts = resolve(__dirname, '..', '..', 'dist', 'harness', 'index.d.ts');
    expect(existsSync(dts)).toBe(true);
  });

  it('dist/harness/cli.js CLI entrypoint exists', () => {
    const cli = resolve(__dirname, '..', '..', 'dist', 'harness', 'cli.js');
    expect(existsSync(cli)).toBe(true);
  });

  it('package.json exports ./harness subpath', async () => {
    const pkg = await import('../../package.json', { with: { type: 'json' } });
    const exports = pkg.default.exports;
    expect(exports['./harness']).toBeDefined();
    expect(exports['./harness'].import).toBe('./dist/harness/index.js');
    expect(exports['./harness'].types).toBe('./dist/harness/index.d.ts');
  });

  it('package.json registers epicai-harness bin', async () => {
    const pkg = await import('../../package.json', { with: { type: 'json' } });
    expect(pkg.default.bin['epicai-harness']).toBe('./dist/harness/cli.js');
  });

  it('createHarnessRunner returns a runner with runAll and runProfile', () => {
    // Import from the dist entrypoint to match what consumers get
    const { createHarnessRunner } = require(resolve(__dirname, '..', '..', 'dist', 'harness', 'index.js'));
    const runner = createHarnessRunner({ profiles: [] });
    expect(typeof runner.runAll).toBe('function');
    expect(typeof runner.runProfile).toBe('function');
  });
});

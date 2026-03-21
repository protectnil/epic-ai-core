/**
 * @epicai/core — Harness Public Export Surface Test
 * Verifies that the @epicai/core/harness subpath export resolves correctly
 * and exposes the documented API surface.
 */
import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';

describe('Harness public export surface', () => {
  it('@epicai/core/harness subpath resolves and exports documented API', async () => {
    // Use Node's actual package resolution by importing the subpath.
    // This exercises the exports map in package.json, not a filesystem path.
    const mod = await import('@epicai/core/harness');

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

  it('@epicai/core/harness exports type declarations', () => {
    const dts = resolve(__dirname, '..', '..', 'dist', 'harness', 'index.d.ts');
    expect(existsSync(dts)).toBe(true);
  });

  it('epicai-harness bin resolves to an existing file', () => {
    // Resolve the bin path the way npm does — read package.json bin entry, resolve relative to package root
    const pkg = JSON.parse(require('node:fs').readFileSync(resolve(__dirname, '..', '..', 'package.json'), 'utf-8'));
    const binPath = resolve(__dirname, '..', '..', pkg.bin['epicai-harness']);
    expect(existsSync(binPath)).toBe(true);
  });

  it('createHarnessRunner from subpath returns functional runner', async () => {
    const { createHarnessRunner } = await import('@epicai/core/harness');
    const runner = createHarnessRunner({ profiles: [] });
    expect(typeof runner.runAll).toBe('function');
    expect(typeof runner.runProfile).toBe('function');
    // Empty profiles should return empty results
    const reports = await runner.runAll();
    expect(reports).toHaveLength(0);
  });
});

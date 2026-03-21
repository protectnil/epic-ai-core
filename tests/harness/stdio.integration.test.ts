/**
 * @epicai/core — Harness STDIO Integration Tests
 */
import { describe, it, expect } from 'vitest';
import { createHarnessRunner, HarnessProfile } from '../../src/harness/index.js';

describe('Harness STDIO Profile', { timeout: 30_000 }, () => {
  it('passes all shared assertions', async () => {
    const runner = createHarnessRunner({ profiles: [HarnessProfile.Stdio] });
    const [report] = await runner.runAll();

    for (const result of report.results) {
      if (!result.passed) {
        console.error(`FAIL: ${result.name} — ${result.error}`);
      }
    }

    expect(report.profile).toBe(HarnessProfile.Stdio);
    expect(report.failed).toBe(0);
    expect(report.passed).toBeGreaterThan(0);
  });
});

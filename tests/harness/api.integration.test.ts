/**
 * @epicai/core — Harness API Integration Tests
 */
import { describe, it, expect } from 'vitest';
import { createHarnessRunner, HarnessProfile, ApiHarnessBackend } from '../../src/harness/index.js';

describe('Harness API Profile', { timeout: 30_000 }, () => {
  it('passes all shared assertions', async () => {
    const runner = createHarnessRunner({ profiles: [HarnessProfile.Api] });
    const [report] = await runner.runAll();

    for (const result of report.results) {
      if (!result.passed) {
        console.error(`FAIL: ${result.name} — ${result.error}`);
      }
    }

    expect(report.profile).toBe(HarnessProfile.Api);
    expect(report.failed).toBe(0);
    expect(report.passed).toBeGreaterThan(0);
  });

  it('supports paginated vulnerability listing', async () => {
    const backend = new ApiHarnessBackend();
    await backend.start();

    try {
      const page1 = await backend.fetchVulnerabilities(0, 10);
      expect(page1.data).toHaveLength(10);
      expect(page1.pagination.total).toBe(25);
      expect(page1.pagination.hasMore).toBe(true);

      const page2 = await backend.fetchVulnerabilities(10, 10);
      expect(page2.data).toHaveLength(10);
      expect(page2.pagination.hasMore).toBe(true);

      const page3 = await backend.fetchVulnerabilities(20, 10);
      expect(page3.data).toHaveLength(5);
      expect(page3.pagination.hasMore).toBe(false);

      // Deterministic — same data every run
      expect(page1.data[0].id).toBe('VULN-1000');
    } finally {
      await backend.stop();
    }
  });

  it('returns broken JSON from malformed endpoint', async () => {
    const backend = new ApiHarnessBackend();
    await backend.start();

    try {
      const raw = await backend.fetchMalformedEndpoint();
      expect(() => JSON.parse(raw)).toThrow();
      expect(raw).toContain('truncated');
    } finally {
      await backend.stop();
    }
  });

  it('rejects requests without auth token', async () => {
    const backend = new ApiHarnessBackend();
    await backend.start();

    try {
      const addr = (backend as unknown as { port: number }).port;
      const res = await fetch(`http://127.0.0.1:${addr}/api/v1/health`);
      expect(res.status).toBe(401);
    } finally {
      await backend.stop();
    }
  });
});

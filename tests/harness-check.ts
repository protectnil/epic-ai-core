#!/usr/bin/env npx tsx
/**
 * @epicai/legion — Standalone Harness Check
 * Proves all three transport profiles work without vitest.
 * Run: npx tsx tests/harness-check.ts
 */

import { HarnessRunner } from '../dist/harness/runner.js';
import { HarnessProfile, DEFAULT_TIMEOUTS } from '../dist/harness/types.js';

const runner = new HarnessRunner({
  profiles: [HarnessProfile.Stdio, HarnessProfile.Http, HarnessProfile.Api],
  timeouts: DEFAULT_TIMEOUTS,
});

const reports = await runner.runAll();

let exitCode = 0;
for (const report of reports) {
  const status = report.failed === 0 ? 'PASS' : 'FAIL';
  console.log(`\n[${status}] ${report.profile} — ${report.passed} passed, ${report.failed} failed (${report.durationMs}ms)`);
  for (const r of report.results) {
    const icon = r.passed ? '  ✓' : '  ✗';
    const detail = r.error ? ` — ${r.error}` : '';
    console.log(`${icon} ${r.name} (${r.durationMs}ms)${detail}`);
  }
  if (report.failed > 0) exitCode = 1;
}

console.log(`\nDone.`);
process.exit(exitCode);

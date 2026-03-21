/**
 * @epicai/core — Test Harness Fixtures
 * Deterministic test data factories, seeded with 1337.
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

import { SeededRandom, SEED } from './seed.js';

export const ECHO_PAYLOAD = { message: 'harness-echo-test-1337' };
export const ECHO_EXPECTED = { message: 'harness-echo-test-1337' };

export const SLEEP_PAYLOAD = { ms: 100 };
export const SLEEP_EXPECTED = { slept: 100 };

export const SLEEP_OVER_MAX_PAYLOAD = { ms: 6000 };
export const SLEEP_OVER_MAX_EXPECTED = { slept: 5000 };

export const FAIL_PAYLOAD = { reason: 'harness-test-failure' };
export const FAIL_EXPECTED_CODE = 'HARNESS_FAIL';

export const MALFORMED_PAYLOAD_INJECTION = { variant: 2 };

export const APPROVAL_PAYLOAD = { action: 'delete_all_records' };

export const MULTI_STEP_PAYLOAD_1 = { step: 1 };
export const MULTI_STEP_PAYLOAD_2 = { step: 2 };

export const PING_EXPECTED_STATUS = 'ok';

/** Auth token for the API harness backend */
export const API_AUTH_TOKEN = 'harness-token-1337';

/** Deterministic vulnerability fixtures for API backend pagination */
export function createVulnerabilityFixtures(count: number = 25): Array<{
  id: string;
  severity: string;
  title: string;
  cvss: number;
}> {
  const localRng = new SeededRandom(SEED);
  const severities = ['critical', 'high', 'medium', 'low'] as const;
  const results = [];
  for (let i = 0; i < count; i++) {
    results.push({
      id: `VULN-${1000 + i}`,
      severity: localRng.pick(severities),
      title: `Harness Vulnerability ${i + 1}`,
      cvss: Math.round(localRng.next() * 100) / 10,
    });
  }
  return results;
}

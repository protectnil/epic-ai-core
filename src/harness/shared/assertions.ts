/**
 * @epicai/legion — Test Harness Assertion Suite
 * Shared assertions that run against any HarnessBackend.
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

import type { HarnessBackend, AssertionResult } from '../types.js';
import { CANONICAL_TOOL_NAMES } from './toolDefs.js';
import {
  ECHO_PAYLOAD, ECHO_EXPECTED,
  SLEEP_PAYLOAD, SLEEP_EXPECTED,
  SLEEP_OVER_MAX_PAYLOAD, SLEEP_OVER_MAX_EXPECTED,
  FAIL_PAYLOAD, FAIL_EXPECTED_CODE,
  MALFORMED_PAYLOAD_INJECTION,
  APPROVAL_PAYLOAD,
  MULTI_STEP_PAYLOAD_1, MULTI_STEP_PAYLOAD_2,
  PING_EXPECTED_STATUS,
} from './fixtures.js';

type AssertFn = (backend: HarnessBackend) => Promise<void>;

interface TestCase {
  name: string;
  fn: AssertFn;
}

function assertEqual(actual: unknown, expected: unknown, message: string): void {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) {
    throw new Error(`${message}: expected ${e}, got ${a}`);
  }
}

function assertTruthy(value: unknown, message: string): void {
  if (!value) {
    throw new Error(`${message}: expected truthy, got ${JSON.stringify(value)}`);
  }
}

const TESTS: TestCase[] = [
  // Tool discovery
  {
    name: 'listTools returns all 8 canonical tools',
    fn: async (b) => {
      const tools = await b.listTools();
      const names = tools.map(t => t.name).sort();
      const expected = [...CANONICAL_TOOL_NAMES].sort();
      assertEqual(names, expected, 'Tool names mismatch');
    },
  },

  // Health
  {
    name: 'healthCheck returns true',
    fn: async (b) => {
      const healthy = await b.healthCheck();
      assertEqual(healthy, true, 'Health check');
    },
  },

  // Echo
  {
    name: 'echo returns input unchanged',
    fn: async (b) => {
      const result = await b.callTool('echo', ECHO_PAYLOAD);
      assertEqual(result.isError, false, 'echo isError');
      assertEqual(result.content, ECHO_EXPECTED, 'echo content');
    },
  },

  // Sleep
  {
    name: 'sleep delays for the specified duration',
    fn: async (b) => {
      const result = await b.callTool('sleep', SLEEP_PAYLOAD);
      assertEqual(result.isError, false, 'sleep isError');
      assertEqual(result.content, SLEEP_EXPECTED, 'sleep content');
      if (result.durationMs < 50) {
        throw new Error(`sleep duration too short: ${result.durationMs}ms (expected >= 50ms for 100ms sleep)`);
      }
    },
  },
  {
    name: 'sleep clamps to max 5000ms',
    fn: async (b) => {
      const result = await b.callTool('sleep', SLEEP_OVER_MAX_PAYLOAD);
      assertEqual(result.isError, false, 'sleep-over-max isError');
      assertEqual(result.content, SLEEP_OVER_MAX_EXPECTED, 'sleep-over-max content');
    },
  },

  // Fail
  {
    name: 'fail returns structured error',
    fn: async (b) => {
      const result = await b.callTool('fail', FAIL_PAYLOAD);
      assertEqual(result.isError, true, 'fail isError');
      const content = result.content as Record<string, unknown>;
      assertEqual(content.code, FAIL_EXPECTED_CODE, 'fail error code');
      assertTruthy(content.message, 'fail has message');
      assertTruthy(content.timestamp, 'fail has timestamp');
    },
  },

  // Malformed
  {
    name: 'malformed returns parseable but invalid data',
    fn: async (b) => {
      const result = await b.callTool('malformed', { variant: 0 });
      assertEqual(result.isError, false, 'malformed isError');
      const content = result.content as Record<string, unknown>;
      assertEqual(content.partial, true, 'malformed has partial flag');
    },
  },
  {
    name: 'malformed variant 2 includes sensitive keys for redaction testing',
    fn: async (b) => {
      const result = await b.callTool('malformed', MALFORMED_PAYLOAD_INJECTION);
      assertEqual(result.isError, false, 'malformed-redaction isError');
      const content = result.content as Record<string, unknown>;
      // Verify sensitive keys exist (for redaction testing upstream)
      const creds = content.credentials as Record<string, unknown>;
      assertTruthy(creds?.apiKey, 'malformed has apiKey for redaction testing');
      // Verify nested structure
      const nested = content.nested as Record<string, unknown>;
      const deep = nested?.deep as Record<string, unknown>;
      assertTruthy(deep?.secret, 'malformed has nested secret for redaction testing');
      // Verify array
      assertTruthy(Array.isArray(content.tokens), 'malformed has tokens array');
    },
  },
  {
    name: 'malformed variant 3 includes injection lines for sanitization testing',
    fn: async (b) => {
      const result = await b.callTool('malformed', { variant: 3 });
      assertEqual(result.isError, false, 'malformed-injection isError');
      // Variant 3 is a multi-line string with injection lines
      const content = typeof result.content === 'string' ? result.content : String(result.content);
      assertTruthy(content.includes('ignore previous instructions'), 'malformed has injection line');
      assertTruthy(content.includes('Normal tool output'), 'malformed has normal lines');
    },
  },

  // Approval target
  {
    name: 'approval_target returns action confirmation',
    fn: async (b) => {
      const result = await b.callTool('approval_target', APPROVAL_PAYLOAD);
      assertEqual(result.isError, false, 'approval_target isError');
      const content = result.content as Record<string, unknown>;
      assertEqual(content.action, APPROVAL_PAYLOAD.action, 'approval_target action');
      assertEqual(content.approved, true, 'approval_target approved');
    },
  },

  // Multi-step
  {
    name: 'multi_step step 1 returns follow-up instruction',
    fn: async (b) => {
      const result = await b.callTool('multi_step', MULTI_STEP_PAYLOAD_1);
      assertEqual(result.isError, false, 'multi_step step 1 isError');
      const content = result.content as Record<string, unknown>;
      assertEqual(content.nextTool, 'echo', 'multi_step nextTool');
      assertEqual(content.done, false, 'multi_step step 1 not done');
      assertTruthy(content.nextArgs, 'multi_step has nextArgs');
    },
  },
  {
    name: 'multi_step step 2 returns completion',
    fn: async (b) => {
      const result = await b.callTool('multi_step', MULTI_STEP_PAYLOAD_2);
      assertEqual(result.isError, false, 'multi_step step 2 isError');
      const content = result.content as Record<string, unknown>;
      assertEqual(content.done, true, 'multi_step step 2 done');
      assertEqual(content.step, 2, 'multi_step step number');
    },
  },

  // Stateful counter
  {
    name: 'stateful_counter increments per call',
    fn: async (b) => {
      await b.reset();
      const r1 = await b.callTool('stateful_counter', {});
      const r2 = await b.callTool('stateful_counter', {});
      const r3 = await b.callTool('stateful_counter', {});
      assertEqual((r1.content as Record<string, unknown>).count, 1, 'counter call 1');
      assertEqual((r2.content as Record<string, unknown>).count, 2, 'counter call 2');
      assertEqual((r3.content as Record<string, unknown>).count, 3, 'counter call 3');
    },
  },
  {
    name: 'stateful_counter resets correctly',
    fn: async (b) => {
      await b.callTool('stateful_counter', {});
      await b.reset();
      const result = await b.callTool('stateful_counter', {});
      assertEqual((result.content as Record<string, unknown>).count, 1, 'counter after reset');
    },
  },

  // Ping
  {
    name: 'ping returns healthy status with backend identity',
    fn: async (b) => {
      const result = await b.callTool('ping', {});
      assertEqual(result.isError, false, 'ping isError');
      const content = result.content as Record<string, unknown>;
      assertEqual(content.status, PING_EXPECTED_STATUS, 'ping status');
      assertEqual(content.backend, b.profile, 'ping backend identity');
      assertTruthy(content.timestamp, 'ping has timestamp');
    },
  },
];

export async function runAssertions(backend: HarnessBackend, perToolTimeoutMs?: number): Promise<AssertionResult[]> {
  const results: AssertionResult[] = [];
  const timeout = perToolTimeoutMs ?? 10_000;

  for (const test of TESTS) {
    const start = Date.now();
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([
        test.fn(backend),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error(`Assertion "${test.name}" exceeded ${timeout}ms per-tool timeout`)), timeout);
        }),
      ]);
      results.push({ name: test.name, passed: true, durationMs: Date.now() - start });
    } catch (err) {
      results.push({
        name: test.name,
        passed: false,
        error: err instanceof Error ? err.message : String(err),
        durationMs: Date.now() - start,
      });
    } finally {
      if (timer !== undefined) clearTimeout(timer);
    }
  }

  return results;
}

/**
 * @epicai/legion/harness — Test Harness Public Entrypoint
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

import {
  HarnessProfile,
  DEFAULT_TIMEOUTS,
  type HarnessConfig,
  type HarnessBackend,
  type HarnessReport,
  type HarnessToolResult,
  type AssertionResult,
  type ToolInfo,
  type HarnessTimeouts,
} from './types.js';
import { HarnessRunner } from './runner.js';

export {
  HarnessProfile,
  HarnessRunner,
  DEFAULT_TIMEOUTS,
  type HarnessConfig,
  type HarnessBackend,
  type HarnessReport,
  type HarnessToolResult,
  type AssertionResult,
  type ToolInfo,
  type HarnessTimeouts,
};

export { StdioHarnessBackend } from './stdio/server.js';
export { HttpHarnessBackend } from './http/server.js';
export { ApiHarnessBackend } from './api/server.js';
export { CANONICAL_TOOLS, CANONICAL_TOOL_NAMES } from './shared/toolDefs.js';
export { runAssertions } from './shared/assertions.js';

/**
 * Create a harness runner with sensible defaults.
 * Pass partial config to override profiles or timeouts.
 */
export function createHarnessRunner(config?: Partial<HarnessConfig>): HarnessRunner {
  return new HarnessRunner({
    profiles: config?.profiles ?? [HarnessProfile.Stdio, HarnessProfile.Http, HarnessProfile.Api],
    timeouts: { ...DEFAULT_TIMEOUTS, ...config?.timeouts },
  });
}

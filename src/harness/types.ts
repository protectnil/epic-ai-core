/**
 * @epicai/legion — Test Harness Types
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

export enum HarnessProfile {
  Stdio = 'stdio',
  Http = 'http',
  Api = 'api',
}

export const SLEEP_MAX = 5000;
export const PER_TOOL_TIMEOUT = 10_000;
export const PER_SCENARIO_TIMEOUT = 30_000;
export const HTTP_CONNECT_TIMEOUT = 2000;

export interface HarnessTimeouts {
  /** Max time per individual tool call assertion (default 10s) */
  perTool: number;
  /** Max time for an entire profile run (default 30s) */
  perScenario: number;
}

export const DEFAULT_TIMEOUTS: HarnessTimeouts = {
  perTool: PER_TOOL_TIMEOUT,
  perScenario: PER_SCENARIO_TIMEOUT,
};

export interface ToolInfo {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface HarnessToolResult {
  content: unknown;
  isError: boolean;
  durationMs: number;
}

export interface HarnessBackend {
  readonly profile: HarnessProfile;
  start(): Promise<void>;
  stop(): Promise<void>;
  healthCheck(): Promise<boolean>;
  reset(): Promise<void>;
  listTools(): Promise<ToolInfo[]>;
  callTool(name: string, args: Record<string, unknown>): Promise<HarnessToolResult>;
}

export interface HarnessConfig {
  profiles: HarnessProfile[];
  timeouts: HarnessTimeouts;
}

export interface AssertionResult {
  name: string;
  passed: boolean;
  error?: string;
  durationMs: number;
}

export interface HarnessReport {
  profile: HarnessProfile;
  passed: number;
  failed: number;
  results: AssertionResult[];
  durationMs: number;
}

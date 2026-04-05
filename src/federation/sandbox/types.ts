/**
 * @epicai/legion — Adapter Sandbox Types
 * Built on the Epic AI Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

export type SandboxMode = 'none' | 'worker-thread' | 'process';

export type EgressEnforcement = 'networkpolicy' | 'netns-nftables' | 'sandbox-exec' | 'none';

export interface AdapterSandboxConfig {
  mode: SandboxMode;
  allowedEnvVars: string[];
  allowedHosts: string[];
  egressEnforcement: EgressEnforcement;
  fileSystemAccess: 'none' | 'read-only';
  maxMemoryMb: number;
  timeoutMs: number;
}

export const DEFAULT_SANDBOX_CONFIG: AdapterSandboxConfig = {
  mode: 'process',
  allowedEnvVars: [],
  allowedHosts: [],
  egressEnforcement: 'none',
  fileSystemAccess: 'none',
  maxMemoryMb: 256,
  timeoutMs: 30_000,
};

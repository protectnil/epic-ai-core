/**
 * @epicai/core — Test Harness Runner
 * Runs the shared assertion suite against any configured backend.
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

import {
  HarnessProfile,
  type HarnessConfig,
  type HarnessBackend,
  type HarnessReport,
} from './types.js';
import { runAssertions } from './shared/assertions.js';
import { StdioHarnessBackend } from './stdio/server.js';
import { HttpHarnessBackend } from './http/server.js';
import { ApiHarnessBackend } from './api/server.js';

function createBackend(profile: HarnessProfile): HarnessBackend {
  switch (profile) {
    case HarnessProfile.Stdio:
      return new StdioHarnessBackend();
    case HarnessProfile.Http:
      return new HttpHarnessBackend();
    case HarnessProfile.Api:
      return new ApiHarnessBackend();
    default:
      throw new Error(`Unknown harness profile: ${profile}`);
  }
}

export class HarnessRunner {
  private readonly config: HarnessConfig;

  constructor(config: HarnessConfig) {
    this.config = config;
  }

  async runAll(): Promise<HarnessReport[]> {
    const reports: HarnessReport[] = [];
    for (const profile of this.config.profiles) {
      reports.push(await this.runProfile(profile));
    }
    return reports;
  }

  async runProfile(profile: HarnessProfile): Promise<HarnessReport> {
    const backend = createBackend(profile);
    const start = Date.now();

    try {
      await backend.start();

      const healthy = await backend.healthCheck();
      if (!healthy) {
        return {
          profile,
          passed: 0,
          failed: 1,
          results: [{ name: 'healthCheck', passed: false, error: 'Backend failed health check after start', durationMs: Date.now() - start }],
          durationMs: Date.now() - start,
        };
      }

      const results = await runAssertions(backend);
      const passed = results.filter(r => r.passed).length;
      const failed = results.filter(r => !r.passed).length;

      return { profile, passed, failed, results, durationMs: Date.now() - start };
    } catch (err) {
      return {
        profile,
        passed: 0,
        failed: 1,
        results: [{
          name: 'runner',
          passed: false,
          error: err instanceof Error ? err.message : String(err),
          durationMs: Date.now() - start,
        }],
        durationMs: Date.now() - start,
      };
    } finally {
      try {
        await backend.stop();
      } catch {
        // Best-effort cleanup
      }
    }
  }
}

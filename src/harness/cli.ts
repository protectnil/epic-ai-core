#!/usr/bin/env node
/**
 * @epicai/core — Test Harness CLI
 * `npx epicai-harness --profile stdio|http|api`
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 *
 * NOTE: CLI tool — console.log/console.error are the user interface.
 */

import { HarnessProfile, DEFAULT_TIMEOUTS } from './types.js';
import { HarnessRunner } from './runner.js';

function parseArgs(args: string[]): HarnessProfile[] {
  const profiles: HarnessProfile[] = [];

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--profile' && args[i + 1]) {
      const value = args[++i].toLowerCase();
      if (value === 'stdio') profiles.push(HarnessProfile.Stdio);
      else if (value === 'http') profiles.push(HarnessProfile.Http);
      else if (value === 'api') profiles.push(HarnessProfile.Api);
      else {
        console.error(`Unknown profile: ${value}. Valid: stdio, http, api`);
        process.exit(1);
      }
    }
    if (args[i] === '--help' || args[i] === '-h') {
      console.log('');
      console.log('  Epic AI\u00AE Test Harness');
      console.log('');
      console.log('  Usage: epicai-harness [--profile stdio|http|api]');
      console.log('');
      console.log('  Options:');
      console.log('    --profile <name>  Run a specific profile (can repeat)');
      console.log('    --help            Show this help');
      console.log('');
      console.log('  If no --profile is given, all three profiles run.');
      console.log('');
      process.exit(0);
    }
  }

  return profiles.length > 0 ? profiles : [HarnessProfile.Stdio, HarnessProfile.Http, HarnessProfile.Api];
}

async function main(): Promise<void> {
  const profiles = parseArgs(process.argv.slice(2));

  console.log('');
  console.log('  Epic AI\u00AE Test Harness');
  console.log('  ======================');
  console.log('');

  const runner = new HarnessRunner({ profiles, timeouts: DEFAULT_TIMEOUTS });
  const reports = await runner.runAll();

  let totalPassed = 0;
  let totalFailed = 0;

  for (const report of reports) {
    console.log(`  Profile: ${report.profile} (${report.durationMs}ms)`);
    console.log('  ' + '-'.repeat(40));

    for (const result of report.results) {
      const status = result.passed ? '\u2713' : '\u2717';
      const suffix = result.error ? ` — ${result.error}` : '';
      console.log(`    ${status} ${result.name} (${result.durationMs}ms)${suffix}`);
    }

    console.log(`  ${report.passed} passed, ${report.failed} failed`);
    console.log('');

    totalPassed += report.passed;
    totalFailed += report.failed;
  }

  console.log(`  Total: ${totalPassed} passed, ${totalFailed} failed`);
  console.log('');

  process.exit(totalFailed > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('Harness failed:', err);
  process.exit(1);
});

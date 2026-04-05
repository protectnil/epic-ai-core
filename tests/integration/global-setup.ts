/**
 * Global setup/teardown for integration tests.
 * Ensures Loki logs are flushed before vitest exits (vitest calls process.exit()).
 */
import { flushAllLogs } from '../../src/logger.js';

export async function teardown(): Promise<void> {
  await flushAllLogs();
}

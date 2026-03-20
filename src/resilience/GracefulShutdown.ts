/**
 * @epic-ai/core — Graceful Shutdown
 * Ensures in-flight operations complete, pending approvals persist,
 * and audit trail flushes before the agent stops.
 * Built on the Epic AI Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

export interface ShutdownTask {
  name: string;
  fn: () => Promise<void>;
  timeoutMs?: number;
}

export class GracefulShutdown {
  private readonly tasks: ShutdownTask[] = [];
  private shuttingDown = false;

  /**
   * Register a shutdown task. Tasks execute in registration order.
   */
  register(task: ShutdownTask): this {
    this.tasks.push(task);
    return this;
  }

  /**
   * Execute all shutdown tasks in order with per-task timeouts.
   * Returns results for each task.
   */
  async execute(globalTimeoutMs: number = 30000): Promise<ShutdownResult> {
    if (this.shuttingDown) {
      return { success: false, results: [], error: 'Shutdown already in progress' };
    }

    this.shuttingDown = true;
    const results: TaskResult[] = [];
    const startTime = Date.now();

    for (const task of this.tasks) {
      const elapsed = Date.now() - startTime;
      if (elapsed >= globalTimeoutMs) {
        results.push({ name: task.name, success: false, error: 'Global timeout exceeded' });
        continue;
      }

      const taskTimeout = Math.min(
        task.timeoutMs ?? 10000,
        globalTimeoutMs - elapsed,
      );

      try {
        await Promise.race([
          task.fn(),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error(`Task "${task.name}" timed out after ${taskTimeout}ms`)), taskTimeout),
          ),
        ]);
        results.push({ name: task.name, success: true });
      } catch (error) {
        results.push({
          name: task.name,
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    this.shuttingDown = false;

    return {
      success: results.every(r => r.success),
      results,
      durationMs: Date.now() - startTime,
    };
  }

  /**
   * Register process signal handlers for graceful shutdown.
   * Calls execute() on SIGTERM, SIGINT.
   * Uses process.once() to prevent handler accumulation on repeated calls.
   * Returns a deregister function to remove the handlers.
   */
  registerSignalHandlers(callback?: (result: ShutdownResult) => void): () => void {
    const handler = async () => {
      const result = await this.execute();
      if (callback) callback(result);
      process.exit(result.success ? 0 : 1);
    };

    process.once('SIGTERM', handler);
    process.once('SIGINT', handler);

    return () => {
      process.off('SIGTERM', handler);
      process.off('SIGINT', handler);
    };
  }
}

interface TaskResult {
  name: string;
  success: boolean;
  error?: string;
}

interface ShutdownResult {
  success: boolean;
  results: TaskResult[];
  durationMs?: number;
  error?: string;
}

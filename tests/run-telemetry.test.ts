/**
 * @epicai/legion — Run Telemetry Tests
 * Verifies the human-readable summary emitted from agent lifecycle events.
 */

import { describe, it, expect } from 'vitest';
import { ObservabilityEmitter, RunTelemetryCollector } from '../src/index.js';

describe('RunTelemetryCollector', () => {
  it('tracks event and log counts with a readable summary', () => {
    const telemetry = new RunTelemetryCollector({
      maxRecentEntries: 6,
      startedAt: new Date('2026-03-21T00:00:00.000Z'),
      runId: 'run-1',
    });
    const emitter = new ObservabilityEmitter();
    const detach = telemetry.attach(emitter);

    emitter.info('starting run', { runId: 'run-1' }, 'orchestrator');

    emitter.emitEvent({
      type: 'plan',
      data: { iteration: 1, toolCalls: ['echo'] },
      timestamp: new Date('2026-03-21T00:00:00.000Z'),
    });
    emitter.emitEvent({
      type: 'action',
      data: { tool: 'echo', server: 'stdio', durationMs: 12 },
      timestamp: new Date('2026-03-21T00:00:00.012Z'),
    });
    emitter.emitEvent({
      type: 'result',
      data: { tool: 'echo', content: { ok: true }, isError: false },
      timestamp: new Date('2026-03-21T00:00:00.025Z'),
    });
    emitter.emitEvent({
      type: 'narrative',
      data: { text: 'done' },
      timestamp: new Date('2026-03-21T00:00:00.040Z'),
    });
    emitter.emitEvent({
      type: 'done',
      data: { loopIterations: 1, actionsExecuted: 1, actionsPending: 0 },
      timestamp: new Date('2026-03-21T00:00:00.050Z'),
    });

    emitter.warn('finished run', { status: 'ok' }, 'orchestrator');
    detach();

    const snapshot = telemetry.snapshot();
    expect(snapshot.eventCounts.plan).toBe(1);
    expect(snapshot.eventCounts.action).toBe(1);
    expect(snapshot.eventCounts.result).toBe(1);
    expect(snapshot.eventCounts.narrative).toBe(1);
    expect(snapshot.eventCounts.done).toBe(1);
    expect(snapshot.logCounts.info).toBe(1);
    expect(snapshot.logCounts.warn).toBe(1);
    expect(snapshot.lastEventType).toBe('done');
    expect(snapshot.durationMs).toBe(50);
    expect(snapshot.runId).toBe('run-1');

    const summary = telemetry.format();
    expect(summary).toContain('Run ');
    expect(summary).toContain('Events: plan=1 action=1');
    expect(summary).toContain('Logs: debug=0 info=1 warn=1 error=0');
    expect(summary).toContain('[plan]');
    expect(summary).toContain('[done]');
    expect(summary).toContain('starting run');
    expect(summary).toContain('finished run');
  });

  it('retains only the configured recent entries', () => {
    const telemetry = new RunTelemetryCollector({ maxRecentEntries: 2 });

    telemetry.recordEvent({
      type: 'plan',
      data: { iteration: 1, toolCalls: ['a'] },
      timestamp: new Date('2026-03-21T00:00:00.000Z'),
    });
    telemetry.recordEvent({
      type: 'action',
      data: { tool: 'a', server: 'x', durationMs: 1 },
      timestamp: new Date('2026-03-21T00:00:00.001Z'),
    });
    telemetry.recordEvent({
      type: 'result',
      data: { tool: 'a', content: 'ok', isError: false },
      timestamp: new Date('2026-03-21T00:00:00.002Z'),
    });

    const snapshot = telemetry.snapshot();
    expect(snapshot.recentSteps).toHaveLength(2);
    expect(snapshot.recentSteps[0].type).toBe('action');
    expect(snapshot.recentSteps[1].type).toBe('result');
  });
});

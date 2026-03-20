/**
 * @epicai/core — Sanitization & Logger Tests
 * Covers the raw planner-message boundary and consoleLogger behavior.
 */

import { describe, it, expect, vi } from 'vitest';
import { ObservabilityEmitter } from '../src/observability/EventEmitter.js';

describe('ObservabilityEmitter.consoleLogger', () => {
  it('writes to stderr, not stdout', () => {
    const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    const stdoutSpy = vi.spyOn(process.stdout, 'write');

    const logger = ObservabilityEmitter.consoleLogger();
    logger({ level: 'info', message: 'test', timestamp: new Date() });

    expect(stderrSpy).toHaveBeenCalledTimes(1);
    expect(stdoutSpy).not.toHaveBeenCalled();

    stderrSpy.mockRestore();
    stdoutSpy.mockRestore();
  });

  it('outputs valid JSON per line', () => {
    let output = '';
    vi.spyOn(process.stderr, 'write').mockImplementation((chunk) => {
      output += String(chunk);
      return true;
    });

    const logger = ObservabilityEmitter.consoleLogger();
    logger({ level: 'warn', message: 'test warning', timestamp: new Date(), data: { foo: 'bar' } });

    const parsed = JSON.parse(output.trim());
    expect(parsed.level).toBe('warn');
    expect(parsed.msg).toBe('test warning');
    expect(parsed.data.foo).toBe('bar');

    vi.restoreAllMocks();
  });

  it('deep-redacts nested keys', () => {
    let output = '';
    vi.spyOn(process.stderr, 'write').mockImplementation((chunk) => {
      output += String(chunk);
      return true;
    });

    const logger = ObservabilityEmitter.consoleLogger(['secret', 'token']);
    logger({
      level: 'info',
      message: 'test',
      timestamp: new Date(),
      data: {
        safe: 'visible',
        secret: 'should-be-redacted',
        nested: {
          token: 'also-redacted',
          ok: 'visible',
          deeper: {
            secret: 'deep-redacted',
          },
        },
      },
    });

    const parsed = JSON.parse(output.trim());
    expect(parsed.data.safe).toBe('visible');
    expect(parsed.data.secret).toBe('[REDACTED]');
    expect(parsed.data.nested.token).toBe('[REDACTED]');
    expect(parsed.data.nested.ok).toBe('visible');
    expect(parsed.data.nested.deeper.secret).toBe('[REDACTED]');

    vi.restoreAllMocks();
  });

  it('deep-redacts inside arrays', () => {
    let output = '';
    vi.spyOn(process.stderr, 'write').mockImplementation((chunk) => {
      output += String(chunk);
      return true;
    });

    const logger = ObservabilityEmitter.consoleLogger(['password']);
    logger({
      level: 'info',
      message: 'test',
      timestamp: new Date(),
      data: {
        users: [
          { name: 'alice', password: 'secret1' },
          { name: 'bob', password: 'secret2' },
        ],
      },
    });

    const parsed = JSON.parse(output.trim());
    expect(parsed.data.users[0].name).toBe('alice');
    expect(parsed.data.users[0].password).toBe('[REDACTED]');
    expect(parsed.data.users[1].password).toBe('[REDACTED]');

    vi.restoreAllMocks();
  });

  it('does not misclassify objects as circular across separate log calls', () => {
    const outputs: string[] = [];
    vi.spyOn(process.stderr, 'write').mockImplementation((chunk) => {
      outputs.push(String(chunk));
      return true;
    });

    const sharedObj = { key: 'value', secret: 'hidden' };
    const logger = ObservabilityEmitter.consoleLogger(['secret']);

    // Log the same object twice — second call should NOT see it as circular
    logger({ level: 'info', message: 'first', timestamp: new Date(), data: { ref: sharedObj } });
    logger({ level: 'info', message: 'second', timestamp: new Date(), data: { ref: sharedObj } });

    const parsed1 = JSON.parse(outputs[0].trim());
    const parsed2 = JSON.parse(outputs[1].trim());

    // Both should have the object redacted properly, not marked as circular
    expect(parsed1.data.ref.key).toBe('value');
    expect(parsed1.data.ref.secret).toBe('[REDACTED]');
    expect(parsed2.data.ref.key).toBe('value');
    expect(parsed2.data.ref.secret).toBe('[REDACTED]');
    // Neither should have _circular
    expect(parsed1.data.ref._circular).toBeUndefined();
    expect(parsed2.data.ref._circular).toBeUndefined();

    vi.restoreAllMocks();
  });

  it('handles actual circular references without infinite loop', () => {
    let output = '';
    vi.spyOn(process.stderr, 'write').mockImplementation((chunk) => {
      output += String(chunk);
      return true;
    });

    const circular: Record<string, unknown> = { name: 'root' };
    circular.self = circular; // actual circular reference

    const logger = ObservabilityEmitter.consoleLogger();
    logger({ level: 'info', message: 'circular test', timestamp: new Date(), data: { obj: circular } });

    const parsed = JSON.parse(output.trim());
    expect(parsed.data.obj.name).toBe('root');
    // The circular ref should be detected and marked, not infinite loop
    expect(parsed.data.obj.self._circular).toBe(true);

    vi.restoreAllMocks();
  });
});

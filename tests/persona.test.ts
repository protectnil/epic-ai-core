/**
 * @epicai/core — Persona Layer Tests
 */

import { describe, it, expect } from 'vitest';
import { PersonaManager } from '../src/persona/PersonaManager.js';

describe('PersonaManager', () => {
  it('registers and retrieves a persona', () => {
    const mgr = new PersonaManager();
    mgr.register({
      name: 'sentinel',
      tone: 'commanding',
      domain: 'cybersecurity',
      systemPrompt: 'You are the Sentinel.',
    });

    expect(mgr.active().name).toBe('sentinel');
  });

  it('switches between personas', () => {
    const mgr = new PersonaManager();
    mgr.register({ name: 'sentinel', tone: 'commanding', domain: 'cyber', systemPrompt: 'Sentinel.' });
    mgr.register({ name: 'nila', tone: 'gen-z', domain: 'athletics', systemPrompt: 'NILA.' });

    expect(mgr.active().name).toBe('sentinel'); // first registered is default
    mgr.switch('nila');
    expect(mgr.active().name).toBe('nila');
  });

  it('throws on switching to unregistered persona', () => {
    const mgr = new PersonaManager();
    mgr.register({ name: 'sentinel', tone: 'commanding', domain: 'cyber', systemPrompt: 'Sentinel.' });

    expect(() => mgr.switch('nonexistent')).toThrow('not registered');
  });

  it('builds system prompt with constraints', () => {
    const mgr = new PersonaManager();
    mgr.register({
      name: 'sentinel',
      tone: 'commanding',
      domain: 'cybersecurity',
      systemPrompt: 'You are the Sentinel.',
      constraints: ['Never minimize severity', 'Always state the autonomy tier'],
    });

    const prompt = mgr.buildSystemPrompt();
    expect(prompt).toContain('You are the Sentinel.');
    expect(prompt).toContain('RULES:');
    expect(prompt).toContain('1. Never minimize severity');
    expect(prompt).toContain('2. Always state the autonomy tier');
  });

  it('builds system prompt with vocabulary replacement', () => {
    const mgr = new PersonaManager();
    mgr.register({
      name: 'nila',
      tone: 'gen-z',
      domain: 'athletics',
      systemPrompt: 'You help the ATHLETE with NIL deals.',
      vocabulary: { 'ATHLETE': 'student-athlete', 'NIL': 'name, image, and likeness' },
    });

    const prompt = mgr.buildSystemPrompt();
    expect(prompt).toContain('student-athlete');
    expect(prompt).toContain('name, image, and likeness');
    expect(prompt).not.toContain('ATHLETE');
  });

  it('builds system prompt with memory context', () => {
    const mgr = new PersonaManager();
    mgr.register({
      name: 'sentinel',
      tone: 'commanding',
      domain: 'cybersecurity',
      systemPrompt: 'You are the Sentinel.',
    });

    const prompt = mgr.buildSystemPrompt({
      userId: 'analyst-1',
      sessionId: 'session-1',
      messageHistory: [],
      retrievedMemories: [
        {
          id: 'm1', userId: 'analyst-1', type: 'preference',
          content: 'Prefers critical alerts only',
          importance: 'high', createdAt: new Date(),
          accessCount: 5, lastAccessed: null, isDeleted: false,
          metadata: {},
        },
      ],
      activeTools: ['search', 'contain'],
    });

    expect(prompt).toContain('KNOWN CONTEXT:');
    expect(prompt).toContain('[HIGH] preference: Prefers critical alerts only');
    expect(prompt).toContain('AVAILABLE TOOLS: search, contain');
  });

  it('lists all registered personas', () => {
    const mgr = new PersonaManager();
    mgr.register({ name: 'a', tone: 't', domain: 'd', systemPrompt: 'p' });
    mgr.register({ name: 'b', tone: 't', domain: 'd', systemPrompt: 'p' });

    expect(mgr.list()).toHaveLength(2);
  });
});

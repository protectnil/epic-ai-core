/**
 * @epicai/core — Retrieval + Memory Tests
 * Tests RankFusion, HybridRetriever, PersistentMemory with in-memory adapters.
 */

import { describe, it, expect } from 'vitest';
import { RankFusion } from '../src/retrieval/RankFusion.js';
import { HybridRetriever } from '../src/retrieval/HybridRetriever.js';
import { InMemoryAdapter } from '../src/retrieval/adapters/InMemoryAdapter.js';
import { PersistentMemory } from '../src/memory/PersistentMemory.js';
import { InMemoryStore } from '../src/memory/adapters/InMemoryStore.js';
import type { ScoredResult } from '../src/types/index.js';

describe('RankFusion', () => {
  it('fuses results via RRF', () => {
    const dense: ScoredResult[] = [
      { id: 'a', content: 'doc A', score: 0.9, metadata: {} },
      { id: 'b', content: 'doc B', score: 0.8, metadata: {} },
      { id: 'c', content: 'doc C', score: 0.7, metadata: {} },
    ];
    const sparse: ScoredResult[] = [
      { id: 'b', content: 'doc B', score: 0.95, metadata: {} },
      { id: 'a', content: 'doc A', score: 0.6, metadata: {} },
    ];
    const bm25: ScoredResult[] = [
      { id: 'c', content: 'doc C', score: 1.0, metadata: {} },
      { id: 'b', content: 'doc B', score: 0.5, metadata: {} },
    ];

    const fused = RankFusion.rrf([
      { type: 'dense', results: dense },
      { type: 'sparse', results: sparse },
      { type: 'bm25', results: bm25 },
    ]);

    // 'b' appears in all three — should be ranked highest
    expect(fused[0].id).toBe('b');
    expect(fused[0].fusionSources).toHaveLength(3);
    expect(fused[0].fusionScore).toBeGreaterThan(0);
  });

  it('weighted fusion respects weights', () => {
    const dense: ScoredResult[] = [
      { id: 'a', content: 'doc A', score: 1.0, metadata: {} },
    ];
    const sparse: ScoredResult[] = [
      { id: 'a', content: 'doc A', score: 0.5, metadata: {} },
    ];
    const bm25: ScoredResult[] = [
      { id: 'a', content: 'doc A', score: 0.1, metadata: {} },
    ];

    const fused = RankFusion.weighted(
      { type: 'dense', results: dense, weight: 0.5 },
      { type: 'sparse', results: sparse, weight: 0.3 },
      { type: 'bm25', results: bm25, weight: 0.2 },
    );

    // 0.5*1.0 + 0.3*0.5 + 0.2*0.1 = 0.67
    expect(fused[0].fusionScore).toBeCloseTo(0.67, 1);
  });
});

describe('HybridRetriever', () => {
  it('searches across triple representation and fuses', async () => {
    const adapter = new InMemoryAdapter();
    await adapter.index([
      { id: '1', content: 'network intrusion detected on firewall', metadata: { domain: 'network' } },
      { id: '2', content: 'unauthorized access to vault secrets', metadata: { domain: 'access' } },
      { id: '3', content: 'SQL injection attempt on web application', metadata: { domain: 'app-sec' } },
    ]);

    const retriever = new HybridRetriever({
      dense: { provider: 'memory', adapter },
      sparse: { provider: 'memory', adapter },
      bm25: { provider: 'memory', adapter },
      fusion: 'rrf',
      maxResults: 10,
      minScore: 0,
    });

    const results = await retriever.search('intrusion');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].content).toContain('intrusion');
  });

  it('indexes documents across all three paths', async () => {
    const adapter = new InMemoryAdapter();
    const retriever = new HybridRetriever({
      dense: { provider: 'memory', adapter },
      sparse: { provider: 'memory', adapter },
      bm25: { provider: 'memory', adapter },
      fusion: 'rrf',
      maxResults: 10,
      minScore: 0,
    });

    const result = await retriever.index([
      { id: '1', content: 'test document' },
      { id: '2', content: 'another document' },
    ]);

    expect(result.indexed).toBe(2);
    expect(result.dense).toBe(2);
    expect(result.sparse).toBe(2);
    expect(result.bm25).toBe(2);
  });
});

describe('PersistentMemory', () => {
  it('etches and recalls memories', async () => {
    const store = new InMemoryStore();
    const memory = new PersistentMemory({ store, cacheTTLMs: 3600000 });

    await memory.etch('user-1', {
      type: 'preference',
      content: { alertThreshold: 'high-only' },
      importance: 'high',
    });

    await memory.etch('user-1', {
      type: 'finding',
      content: 'Lateral movement detected in subnet 10.0.1.0/24',
      importance: 'normal',
    });

    const recalled = await memory.recall('user-1');
    expect(recalled).toHaveLength(2);
  });

  it('filters by importance', async () => {
    const store = new InMemoryStore();
    const memory = new PersistentMemory({ store, cacheTTLMs: 3600000 });

    await memory.etch('user-1', { type: 'a', content: 'low', importance: 'normal' });
    await memory.etch('user-1', { type: 'b', content: 'critical', importance: 'high' });

    const high = await memory.recall('user-1', { importance: 'high' });
    expect(high).toHaveLength(1);
    expect(high[0].content).toBe('critical');
  });

  it('auto-promotes importance on repeated access', async () => {
    const store = new InMemoryStore();
    const memory = new PersistentMemory({ store, cacheTTLMs: 3600000 });

    await memory.etch('user-1', { type: 'pref', content: 'test', importance: 'normal' });

    // Access 6 times — should promote to medium
    for (let i = 0; i < 6; i++) {
      await memory.recall('user-1');
    }

    const recalled = await memory.recall('user-1');
    expect(recalled[0].importance).toBe('medium');
  });

  it('soft deletes with forget', async () => {
    const store = new InMemoryStore();
    const memory = new PersistentMemory({ store, cacheTTLMs: 3600000 });

    const etched = await memory.etch('user-1', { type: 'temp', content: 'delete me', importance: 'normal' });
    await memory.forget('user-1', etched.id);

    const recalled = await memory.recall('user-1');
    expect(recalled).toHaveLength(0);
  });

  it('generates context summary', async () => {
    const store = new InMemoryStore();
    const memory = new PersistentMemory({ store, cacheTTLMs: 3600000 });

    await memory.etch('user-1', { type: 'preference', content: 'a', importance: 'high' });
    await memory.etch('user-1', { type: 'preference', content: 'b', importance: 'normal' });
    await memory.etch('user-1', { type: 'finding', content: 'c', importance: 'high' });

    const ctx = await memory.context('user-1');
    expect(ctx.totalMemories).toBe(3);
    expect(ctx.importantMemories).toBe(2);
    expect(ctx.memoryTypes.get('preference')).toBe(2);
    expect(ctx.memoryTypes.get('finding')).toBe(1);
  });
});

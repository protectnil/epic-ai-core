/**
 * @epicai/legion — Domain Classifier
 * Tier 1 of three-tier tool resolution. Narrows adapters to
 * the ~5-20 most relevant before BM25 scoring.
 * Pass 1: keyword match (zero-cost).
 * Pass 2: semantic fallback via MiniLM-L6-v2 (if keyword match yields <3).
 * Built on the Epic AI Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

import { createLogger } from '../logger.js';
import type { AdapterCatalog, AdapterCatalogEntry } from './AdapterCatalog.js';

const log = createLogger('federation.domain-classifier');

// =============================================================================
// Types
// =============================================================================

export interface DomainClassifierConfig {
  strategy: 'keyword-only' | 'keyword-then-semantic' | 'semantic-only';
  semanticFallbackThreshold: number;
  semanticModel: string;
  semanticTopK: number;
  maxAdaptersToTier2: number;
}

export const DEFAULT_DOMAIN_CLASSIFIER_CONFIG: DomainClassifierConfig = {
  strategy: 'keyword-then-semantic',
  semanticFallbackThreshold: 3,
  semanticModel: 'Xenova/all-MiniLM-L6-v2',
  semanticTopK: 10,
  maxAdaptersToTier2: 20,
};

// =============================================================================
// Tokenizer
// =============================================================================

const STOPWORDS = new Set([
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'shall', 'can', 'to', 'of', 'in', 'for',
  'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through', 'during',
  'before', 'after', 'above', 'below', 'between', 'out', 'off', 'over',
  'under', 'again', 'further', 'then', 'once', 'here', 'there', 'when',
  'where', 'why', 'how', 'all', 'each', 'every', 'both', 'few', 'more',
  'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own',
  'same', 'so', 'than', 'too', 'very', 'just', 'because', 'but', 'and',
  'or', 'if', 'while', 'about', 'up', 'it', 'its', 'my', 'me', 'we',
  'our', 'you', 'your', 'he', 'she', 'they', 'them', 'this', 'that',
  'what', 'which', 'who', 'whom', 'show', 'get', 'list', 'find', 'check',
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\-_]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 1 && !STOPWORDS.has(t));
}

// =============================================================================
// Semantic Engine (lazy-loaded)
// =============================================================================

interface SemanticEngine {
  embedQuery(text: string): Promise<Float32Array>;
  embedAdapters(entries: AdapterCatalogEntry[]): Promise<Map<string, Float32Array>>;
}

let semanticEngine: SemanticEngine | null = null;
let semanticEngineLoading: Promise<SemanticEngine | null> | null = null;

async function loadSemanticEngine(modelName: string): Promise<SemanticEngine | null> {
  if (semanticEngine) return semanticEngine;
  if (semanticEngineLoading) return semanticEngineLoading;

  semanticEngineLoading = (async () => {
    try {
      const { pipeline } = await import('@xenova/transformers');
      const extractor = await pipeline('feature-extraction', modelName);

      const engine: SemanticEngine = {
        async embedQuery(text: string): Promise<Float32Array> {
          const output = await extractor(text, { pooling: 'mean', normalize: true });
          return output.data as Float32Array;
        },

        async embedAdapters(entries: AdapterCatalogEntry[]): Promise<Map<string, Float32Array>> {
          const embeddings = new Map<string, Float32Array>();
          for (const entry of entries) {
            const text = `${entry.displayName}: ${entry.description}`;
            const output = await extractor(text, { pooling: 'mean', normalize: true });
            embeddings.set(entry.name, output.data as Float32Array);
          }
          return embeddings;
        },
      };

      semanticEngine = engine;
      log.info('semantic engine loaded', { model: modelName });
      return engine;
    } catch (err) {
      log.warn('semantic engine unavailable — keyword-only mode', { error: String(err) });
      return null;
    }
  })();

  return semanticEngineLoading;
}

function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  let dot = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
  }
  return dot; // Vectors are already normalized
}

// =============================================================================
// Domain Classifier
// =============================================================================

export class DomainClassifier {
  private readonly config: DomainClassifierConfig;
  private adapterEmbeddings: Map<string, Float32Array> | null = null;

  constructor(
    private readonly catalog: AdapterCatalog,
    config?: Partial<DomainClassifierConfig>,
  ) {
    this.config = { ...DEFAULT_DOMAIN_CLASSIFIER_CONFIG, ...config };
  }

  /**
   * Classify a query and return the most relevant adapter catalog entries.
   * Returns at most `maxAdaptersToTier2` entries.
   * Returns empty array if no matches (caller falls through to BM25 over connected adapters).
   */
  async classify(query: string): Promise<AdapterCatalogEntry[]> {
    if (this.config.strategy === 'semantic-only') {
      return this.semanticMatch(query);
    }

    // Pass 1: keyword match
    const tokens = tokenize(query);
    const keywordMatches = this.catalog.byKeywords(tokens);

    log.debug('keyword match', { query, tokens: tokens.length, matches: keywordMatches.length });

    if (this.config.strategy === 'keyword-only') {
      return keywordMatches.slice(0, this.config.maxAdaptersToTier2);
    }

    // keyword-then-semantic: use semantic fallback if keyword match is insufficient
    if (keywordMatches.length >= this.config.semanticFallbackThreshold) {
      return keywordMatches.slice(0, this.config.maxAdaptersToTier2);
    }

    // Pass 2: semantic fallback
    log.debug('keyword match below threshold — activating semantic fallback', {
      keywordMatches: keywordMatches.length,
      threshold: this.config.semanticFallbackThreshold,
    });

    const semanticMatches = await this.semanticMatch(query);

    // Merge: keyword matches first (exact relevance), then semantic supplements
    const seen = new Set(keywordMatches.map(e => e.name));
    const merged = [...keywordMatches];
    for (const entry of semanticMatches) {
      if (!seen.has(entry.name)) {
        seen.add(entry.name);
        merged.push(entry);
      }
    }

    return merged.slice(0, this.config.maxAdaptersToTier2);
  }

  private async semanticMatch(query: string): Promise<AdapterCatalogEntry[]> {
    const engine = await loadSemanticEngine(this.config.semanticModel);
    if (!engine) {
      // Semantic engine unavailable — return empty (falls through to BM25)
      return [];
    }

    // Compute adapter embeddings on first use, cache for subsequent queries
    if (!this.adapterEmbeddings) {
      const entries = this.catalog.entries().filter(e => !this.catalog.isRevoked(e.name));
      this.adapterEmbeddings = await engine.embedAdapters(entries);
    }

    const queryEmbedding = await engine.embedQuery(query);

    // Score all adapters by cosine similarity
    const scores: { name: string; score: number }[] = [];
    for (const [name, embedding] of this.adapterEmbeddings) {
      scores.push({ name, score: cosineSimilarity(queryEmbedding, embedding) });
    }

    // Sort descending, take top K
    scores.sort((a, b) => b.score - a.score);
    const topK = scores.slice(0, this.config.semanticTopK);

    const results: AdapterCatalogEntry[] = [];
    for (const { name } of topK) {
      const entry = this.catalog.byName(name);
      if (entry) results.push(entry);
    }

    log.debug('semantic match', { query, topK: topK.length, topScore: topK[0]?.score });
    return results;
  }
}

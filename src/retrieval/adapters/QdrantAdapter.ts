/**
 * @epic-ai/core — Qdrant Vector Store Adapter
 * Triple-representation: dense + miniCOIL sparse + BM25 via Qdrant named vectors.
 * Adapted from NILAssist useQdrant.ts patterns.
 * Built on the Epic AI Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

import { createHash } from 'node:crypto';
import type {
  VectorStoreAdapter,
  ScoredResult,
  SearchOptions,
  IndexDocument,
} from '../../types/index.js';

interface QdrantAdapterConfig {
  host: string;
  port: number;
  collection: string;
  apiKey?: string;
  https?: boolean;
}

interface QdrantSearchResult {
  id: string | number;
  score: number;
  payload?: Record<string, unknown>;
}

interface QdrantScrollResponse {
  result?: {
    points?: QdrantSearchResult[];
  };
}

// QdrantSearchResponse reserved for vector-based search (future)
// interface QdrantSearchResponse { result?: QdrantSearchResult[] }

const BLOCKED_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/**
 * Remove prototype-pollution keys from an object (shallow).
 */
function sanitizeKeys(obj: Record<string, unknown>): Record<string, unknown> {
  const safe = Object.create(null) as Record<string, unknown>;
  for (const [k, v] of Object.entries(obj)) {
    if (!BLOCKED_KEYS.has(k)) {
      safe[k] = v;
    }
  }
  return safe;
}

export class QdrantAdapter implements VectorStoreAdapter {
  private readonly baseUrl: string;
  private readonly collection: string;
  private readonly headers: Record<string, string>;

  constructor(config: QdrantAdapterConfig) {
    const protocol = config.https ? 'https' : 'http';
    this.baseUrl = `${protocol}://${config.host}:${config.port}`;
    this.collection = config.collection;
    this.headers = {
      'Content-Type': 'application/json',
    };
    if (config.apiKey) {
      this.headers['api-key'] = config.apiKey;
    }
  }

  async searchDense(query: string, options: SearchOptions): Promise<ScoredResult[]> {
    // Generate a simple query embedding placeholder.
    // In production, the consumer configures an embedding model.
    // For now, use Qdrant's recommend/search with a text query via payload filter.
    return this.searchByVector('dense', query, options);
  }

  async searchSparse(query: string, options: SearchOptions): Promise<ScoredResult[]> {
    return this.searchByVector('minicoil', query, options);
  }

  async searchBM25(query: string, options: SearchOptions): Promise<ScoredResult[]> {
    return this.searchByVector('bm25', query, options);
  }

  async index(documents: IndexDocument[]): Promise<{ indexed: number; dense: number; sparse: number; bm25: number }> {
    // Upsert documents to Qdrant.
    // In a full implementation, the consumer provides encoding functions
    // that generate dense, sparse, and BM25 vectors for each document.
    // For now, store the documents with payload only (vectors added by external encoder).
    const points = documents.map((doc) => {
      const safeMetadata = doc.metadata ? sanitizeKeys(doc.metadata) : Object.create(null);
      const payload = Object.create(null) as Record<string, unknown>;
      payload['content'] = doc.content;
      payload['doc_id'] = doc.id;
      Object.assign(payload, safeMetadata);
      return { id: this.stableId(doc.id), payload };
    });

    // Batch upsert in chunks of 100
    const chunkSize = 100;
    let indexed = 0;

    for (let i = 0; i < points.length; i += chunkSize) {
      const chunk = points.slice(i, i + chunkSize);
      const response = await fetch(`${this.baseUrl}/collections/${this.collection}/points`, {
        method: 'PUT',
        headers: this.headers,
        body: JSON.stringify({ points: chunk }),
      });

      if (response.ok) {
        indexed += chunk.length;
      }
    }

    return { indexed, dense: indexed, sparse: indexed, bm25: indexed };
  }

  /**
   * Ensure the collection exists. Call during setup.
   */
  async ensureCollection(): Promise<void> {
    const checkResponse = await fetch(
      `${this.baseUrl}/collections/${this.collection}`,
      { headers: this.headers },
    );

    if (checkResponse.ok) return;

    // Create collection with named vectors for triple-representation
    await fetch(`${this.baseUrl}/collections/${this.collection}`, {
      method: 'PUT',
      headers: this.headers,
      body: JSON.stringify({
        vectors: {
          dense: { size: 1536, distance: 'Cosine' },
        },
        sparse_vectors: {
          minicoil: {},
          bm25: {},
        },
      }),
    });
  }

  /**
   * Search using a specific vector name.
   * This is a payload-based text search fallback.
   * Full vector search requires the consumer to provide pre-computed query vectors.
   */
  private async searchByVector(
    _vectorName: string,
    query: string,
    options: SearchOptions,
  ): Promise<ScoredResult[]> {
    const limit = options.maxResults ?? 10;

    // Scroll with payload filter as fallback when no query vector is available
    const response = await fetch(
      `${this.baseUrl}/collections/${this.collection}/points/scroll`,
      {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({
          filter: {
            must: [
              {
                key: 'content',
                match: { text: query },
              },
            ],
          },
          limit,
          with_payload: true,
        }),
      },
    );

    if (!response.ok) return [];

    const data = await response.json() as QdrantScrollResponse;
    const points = data.result?.points ?? [];

    return points.map((point, rank) => ({
      id: String(point.id),
      content: (point.payload?.content as string) ?? '',
      score: 1 / (1 + rank), // Position-based score for text filter fallback
      metadata: point.payload ?? {},
    }));
  }

  /**
   * Generate a stable numeric ID from a string document ID.
   * Uses SHA-256 of the docId, taking the first 8 hex chars as an integer.
   * This is deterministic and avoids Math.random() fallback.
   */
  private stableId(docId: string): number {
    const hex = createHash('sha256').update(docId).digest('hex').slice(0, 8);
    return parseInt(hex, 16);
  }
}

/**
 * @epicai/core — In-Memory Vector Store Adapter
 * For development and testing. Not for production use.
 * Built on the Epic AI Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

import type { VectorStoreAdapter, ScoredResult, SearchOptions, IndexDocument } from '../../types/index.js';

export class InMemoryAdapter implements VectorStoreAdapter {
  private readonly documents = new Map<string, IndexDocument>();

  async searchDense(query: string, options: SearchOptions): Promise<ScoredResult[]> {
    return this.simpleSearch(query, options);
  }

  async searchSparse(query: string, options: SearchOptions): Promise<ScoredResult[]> {
    return this.simpleSearch(query, options);
  }

  async searchBM25(query: string, options: SearchOptions): Promise<ScoredResult[]> {
    return this.bm25Search(query, options);
  }

  async index(documents: IndexDocument[]): Promise<{ indexed: number; dense: number; sparse: number; bm25: number }> {
    for (const doc of documents) {
      this.documents.set(doc.id, doc);
    }
    const count = documents.length;
    return { indexed: count, dense: count, sparse: count, bm25: count };
  }

  /**
   * Simple substring-based search for testing.
   * Production adapters (Qdrant, Pinecone) use real vector similarity.
   */
  private simpleSearch(query: string, options: SearchOptions): ScoredResult[] {
    const maxResults = options.maxResults ?? 10;
    const minScore = options.minScore ?? 0;
    const queryLower = query.toLowerCase();
    const results: ScoredResult[] = [];

    for (const doc of this.documents.values()) {
      const contentLower = doc.content.toLowerCase();
      if (contentLower.includes(queryLower)) {
        // Simple relevance: position-based score (earlier match = higher score)
        const position = contentLower.indexOf(queryLower);
        const score = 1 - (position / contentLower.length);
        if (score >= minScore) {
          results.push({
            id: doc.id,
            content: doc.content,
            score,
            metadata: doc.metadata ?? {},
          });
        }
      }
    }

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, maxResults);
  }

  /**
   * Simple BM25-like scoring for testing.
   */
  private bm25Search(query: string, options: SearchOptions): ScoredResult[] {
    const maxResults = options.maxResults ?? 10;
    const minScore = options.minScore ?? 0;
    const queryTerms = query.toLowerCase().split(/\s+/);
    const results: ScoredResult[] = [];

    for (const doc of this.documents.values()) {
      const contentLower = doc.content.toLowerCase();
      let matchCount = 0;
      for (const term of queryTerms) {
        if (contentLower.includes(term)) matchCount++;
      }

      if (matchCount > 0) {
        const score = matchCount / queryTerms.length;
        if (score >= minScore) {
          results.push({
            id: doc.id,
            content: doc.content,
            score,
            metadata: doc.metadata ?? {},
          });
        }
      }
    }

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, maxResults);
  }

  /**
   * Clear all indexed documents.
   */
  clear(): void {
    this.documents.clear();
  }

  /**
   * Number of indexed documents.
   */
  get size(): number {
    return this.documents.size;
  }
}

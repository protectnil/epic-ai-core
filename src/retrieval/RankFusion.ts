/**
 * @epicai/core — Rank Fusion
 * Reciprocal Rank Fusion (RRF), weighted fusion, and custom fusion strategies.
 * Adapted from production patterns in NILAssist (useRetriever.ts).
 * Built on the Epic AI Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

import type { ScoredResult, FusionSource, RetrievalResult } from '../types/index.js';

/** Default RRF constant. Standard value from the original RRF paper. */
const DEFAULT_K = 60;

export class RankFusion {
  /**
   * Reciprocal Rank Fusion — merges multiple ranked lists into one.
   * score(d) = sum over all result sets of 1 / (k + rank(d))
   *
   * Documents appearing in multiple result sets receive higher fused scores.
   * Uses Map-based O(n) deduplication.
   *
   * @param resultSets - Arrays of results from different retrieval strategies
   * @param k - RRF constant (default 60)
   */
  static rrf(
    resultSets: { type: 'dense' | 'sparse' | 'bm25'; results: ScoredResult[] }[],
    k: number = DEFAULT_K,
  ): RetrievalResult[] {
    const fusedScores = new Map<string, number>();
    const fusedSources = new Map<string, FusionSource[]>();
    const documents = new Map<string, ScoredResult>();

    for (const { type, results } of resultSets) {
      for (let rank = 0; rank < results.length; rank++) {
        const result = results[rank];
        const rrfScore = 1 / (k + rank + 1);

        const currentScore = fusedScores.get(result.id) ?? 0;
        fusedScores.set(result.id, currentScore + rrfScore);

        const sources = fusedSources.get(result.id) ?? [];
        sources.push({ type, rank, originalScore: result.score });
        fusedSources.set(result.id, sources);

        // Keep the first document data encountered (prefer dense results)
        if (!documents.has(result.id)) {
          documents.set(result.id, result);
        }
      }
    }

    return this.buildResults(fusedScores, fusedSources, documents);
  }

  /**
   * Weighted fusion — each result set has a weight multiplier.
   */
  static weighted(
    ...weightedSets: { type: 'dense' | 'sparse' | 'bm25'; results: ScoredResult[]; weight: number }[]
  ): RetrievalResult[] {
    const fusedScores = new Map<string, number>();
    const fusedSources = new Map<string, FusionSource[]>();
    const documents = new Map<string, ScoredResult>();

    for (const { type, results, weight } of weightedSets) {
      for (let rank = 0; rank < results.length; rank++) {
        const result = results[rank];
        const weightedScore = weight * result.score;

        const currentScore = fusedScores.get(result.id) ?? 0;
        fusedScores.set(result.id, currentScore + weightedScore);

        const sources = fusedSources.get(result.id) ?? [];
        sources.push({ type, rank, originalScore: result.score });
        fusedSources.set(result.id, sources);

        if (!documents.has(result.id)) {
          documents.set(result.id, result);
        }
      }
    }

    return this.buildResults(fusedScores, fusedSources, documents);
  }

  /**
   * Custom fusion — consumer provides their own fusion function.
   */
  static custom(
    resultSets: Map<string, ScoredResult[]>,
    fusionFn: (results: Map<string, ScoredResult[]>) => RetrievalResult[],
  ): RetrievalResult[] {
    return fusionFn(resultSets);
  }

  private static buildResults(
    fusedScores: Map<string, number>,
    fusedSources: Map<string, FusionSource[]>,
    documents: Map<string, ScoredResult>,
  ): RetrievalResult[] {
    const results: RetrievalResult[] = [];

    for (const [id, fusionScore] of fusedScores) {
      const doc = documents.get(id);
      if (!doc) continue;

      results.push({
        id,
        content: doc.content,
        fusionScore,
        fusionSources: fusedSources.get(id) ?? [],
        metadata: doc.metadata,
      });
    }

    // Sort by fused score descending
    results.sort((a, b) => b.fusionScore - a.fusionScore);

    return results;
  }
}

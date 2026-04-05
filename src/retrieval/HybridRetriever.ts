/**
 * @epicai/legion — Hybrid Retriever
 * Triple-representation search: dense + miniCOIL sparse + BM25, fused via RRF.
 * Built on the Epic AI Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

import type {
  HybridRetrieverConfig,
  VectorStoreAdapter,
  RetrievalResult,
  IndexDocument,
  SearchOptions,
} from '../types/index.js';
import { RankFusion } from './RankFusion.js';

export class HybridRetriever {
  private readonly denseStore: VectorStoreAdapter;
  private readonly sparseStore: VectorStoreAdapter;
  private readonly bm25Store: VectorStoreAdapter;
  private readonly config: HybridRetrieverConfig;

  constructor(config: HybridRetrieverConfig) {
    this.config = config;

    // Resolve adapters from config
    if (!config.dense.adapter) throw new Error('Dense vector store adapter is required');
    if (!config.sparse.adapter) throw new Error('Sparse vector store adapter is required');
    if (!config.bm25.adapter) throw new Error('BM25 vector store adapter is required');

    this.denseStore = config.dense.adapter;
    this.sparseStore = config.sparse.adapter;
    this.bm25Store = config.bm25.adapter;
  }

  /**
   * Search across all three retrieval paths and fuse results.
   */
  async search(query: string, options?: SearchOptions): Promise<RetrievalResult[]> {
    const maxResults = options?.maxResults ?? this.config.maxResults;
    const minScore = options?.minScore ?? this.config.minScore;
    const searchOpts: SearchOptions = { maxResults: maxResults * 2, minScore: 0 };

    // Fan out to all three paths in parallel
    const [denseResults, sparseResults, bm25Results] = await Promise.all([
      this.denseStore.searchDense(query, searchOpts),
      this.sparseStore.searchSparse(query, searchOpts),
      this.bm25Store.searchBM25(query, searchOpts),
    ]);

    // Fuse results based on configured strategy
    let fused: RetrievalResult[];

    switch (this.config.fusion) {
      case 'rrf':
        fused = RankFusion.rrf([
          { type: 'dense', results: denseResults },
          { type: 'sparse', results: sparseResults },
          { type: 'bm25', results: bm25Results },
        ]);
        break;

      case 'weighted': {
        const weights = this.config.fusionWeights ?? { dense: 0.5, sparse: 0.3, bm25: 0.2 };
        fused = RankFusion.weighted(
          { type: 'dense', results: denseResults, weight: weights.dense },
          { type: 'sparse', results: sparseResults, weight: weights.sparse },
          { type: 'bm25', results: bm25Results, weight: weights.bm25 },
        );
        break;
      }

      case 'custom':
        if (!this.config.customFusion) {
          throw new Error('Custom fusion strategy requires a customFusion function');
        }
        fused = RankFusion.custom(
          new Map([
            ['dense', denseResults],
            ['sparse', sparseResults],
            ['bm25', bm25Results],
          ]),
          this.config.customFusion,
        );
        break;

      default:
        fused = RankFusion.rrf([
          { type: 'dense', results: denseResults },
          { type: 'sparse', results: sparseResults },
          { type: 'bm25', results: bm25Results },
        ]);
    }

    // Apply minScore filter and limit results
    return fused
      .filter(r => r.fusionScore >= minScore)
      .slice(0, maxResults);
  }

  /**
   * Index documents across all three retrieval paths.
   * Each adapter generates the appropriate representation (dense, sparse, BM25).
   */
  async index(documents: IndexDocument[]): Promise<{ indexed: number; dense: number; sparse: number; bm25: number }> {
    const [denseResult, sparseResult, bm25Result] = await Promise.all([
      this.denseStore.index(documents),
      this.sparseStore.index(documents),
      this.bm25Store.index(documents),
    ]);

    return {
      indexed: documents.length,
      dense: denseResult.dense,
      sparse: sparseResult.sparse,
      bm25: bm25Result.bm25,
    };
  }
}

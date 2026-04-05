/**
 * @epicai/legion — Tool Pre-Filter
 * Narrows N registered tools to a ranked shortlist before the orchestrator LLM sees them.
 *
 * Two-tier routing:
 *   Tier 1: Hybrid retrieval (BM25 + miniCOIL sparse) via RRF
 *           Uses precomputed sparse vectors from vector-index.json (ships in npm package).
 *           Falls back to BM25-only when vector index is not loaded.
 *           Dense semantic search is not yet implemented — requires runtime embedding model.
 *   Tier 2: Model-assisted classification — handled by the orchestrator
 *
 * Built on the Epic AI Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

import type { Tool } from '../types/index.js';
import type { ScoredResult } from '../types/index.js';
import { RankFusion } from '../retrieval/RankFusion.js';
import { expandQuery } from './QueryExpander.js';

// BM25 tuning parameters
const K1 = 1.2;   // term frequency saturation
const B = 0.75;    // document length normalization

const DEFAULT_MAX_TOOLS = 8;
const DEFAULT_MAX_PER_SERVER = 3;

const STOPWORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'not', 'is', 'are', 'was', 'were',
  'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
  'will', 'would', 'could', 'should', 'may', 'might', 'can', 'shall',
  'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as',
  'into', 'about', 'between', 'through', 'during', 'before', 'after',
  'it', 'its', 'this', 'that', 'these', 'those', 'i', 'we', 'you',
  'he', 'she', 'they', 'me', 'him', 'her', 'us', 'them', 'my', 'your',
  'his', 'our', 'their', 'what', 'which', 'who', 'whom', 'how', 'when',
  'where', 'why', 'if', 'then', 'than', 'so', 'no', 'all', 'each',
  'any', 'some', 'such', 'only', 'just', 'also', 'very',
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(t => t.length >= 2 && !STOPWORDS.has(t));
}

interface ToolDocument {
  tool: Tool;
  terms: string[];
  termFreq: Map<string, number>;
  length: number;
}

export interface PreFilterOptions {
  maxTools?: number;
  maxPerServer?: number;
}

// ─── Static Vector Index (from vector-index.json) ───────────

interface VectorRecord {
  id: string;                          // adapter_id
  dense: number[];                     // OpenAI 1536d
  minicoil: { indices: number[]; values: number[] };
  payload: Record<string, unknown>;
}

/** Cosine similarity between two dense vectors */
function cosineSim(a: number[], b: number[]): number {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

/** Sparse dot product between query sparse vector and document sparse vector */
function sparseDot(
  qIndices: number[], qValues: number[],
  dIndices: number[], dValues: number[]
): number {
  // Build map from document indices for O(n) lookup
  const dMap = new Map<number, number>();
  for (let i = 0; i < dIndices.length; i++) {
    dMap.set(dIndices[i], dValues[i]);
  }
  let score = 0;
  for (let i = 0; i < qIndices.length; i++) {
    const dVal = dMap.get(qIndices[i]);
    if (dVal !== undefined) score += qValues[i] * dVal;
  }
  return score;
}

/** Generate miniCOIL-style sparse vector from query text using n-gram hashing
 *  (lightweight approximation matching the hash function used in embed-tools.py) */
function queryMiniCOILSparse(text: string): { indices: number[]; values: number[] } {
  const tokens = tokenize(text);
  const map = new Map<number, number>();
  for (const w of tokens) {
    for (let n = 2; n <= 3; n++) {
      for (let i = 0; i <= w.length - n; i++) {
        const ng = w.slice(i, i + n);
        let h = 0;
        for (let j = 0; j < ng.length; j++) h = ((h << 5) - h + ng.charCodeAt(j)) | 0;
        const idx = Math.abs(h) % 100000;
        map.set(idx, (map.get(idx) || 0) + 1);
      }
    }
  }
  return { indices: [...map.keys()], values: [...map.values()] };
}

// ─── ToolPreFilter ──────────────────────────────────────────

export class ToolPreFilter {
  private docs: ToolDocument[] = [];
  private idf: Map<string, number> = new Map();
  private avgDocLength = 0;
  private toolIdMap: Map<string, Tool> = new Map();

  // Static vector index (loaded from vector-index.json)
  private vectorIndex: VectorRecord[] = [];
  private vectorIdMap: Map<string, VectorRecord> = new Map();

  /**
   * Load precomputed vectors from vector-index.json.
   * Enables hybrid retrieval (BM25 + miniCOIL + dense) without any external database.
   */
  loadVectorIndex(records: VectorRecord[]): void {
    this.vectorIndex = records;
    this.vectorIdMap = new Map();
    for (const rec of records) {
      this.vectorIdMap.set(rec.id, rec);
    }
  }

  /**
   * Index the full tool catalog for BM25 scoring.
   */
  index(tools: Tool[]): void {
    this.docs = tools.map(tool => {
      const text = [
        tool.name.replace(/[_:-]/g, ' '),
        tool.description,
        ...Object.keys((tool.parameters as { properties?: Record<string, unknown> }).properties ?? {}),
      ].join(' ');

      const terms = tokenize(text);
      const termFreq = new Map<string, number>();
      for (const t of terms) {
        termFreq.set(t, (termFreq.get(t) ?? 0) + 1);
      }

      return { tool, terms, termFreq, length: terms.length };
    });

    this.toolIdMap = new Map();
    for (const doc of this.docs) {
      const id = `${doc.tool.server}:${doc.tool.name}`;
      this.toolIdMap.set(id, doc.tool);
    }

    const docCount = this.docs.length;
    const docFreq = new Map<string, number>();
    for (const doc of this.docs) {
      const seen = new Set<string>();
      for (const t of doc.terms) {
        if (!seen.has(t)) {
          docFreq.set(t, (docFreq.get(t) ?? 0) + 1);
          seen.add(t);
        }
      }
    }

    this.idf = new Map();
    for (const [term, df] of docFreq) {
      this.idf.set(term, Math.log((docCount - df + 0.5) / (df + 0.5) + 1));
    }

    this.avgDocLength = this.docs.length > 0
      ? this.docs.reduce((sum, d) => sum + d.length, 0) / this.docs.length
      : 0;
  }

  /** BM25 scoring */
  private scoreBM25(queryTerms: string[]): { tool: Tool; score: number; id: string }[] {
    const scored: { tool: Tool; score: number; id: string }[] = [];

    for (const doc of this.docs) {
      let score = 0;
      for (const qt of queryTerms) {
        const tf = doc.termFreq.get(qt) ?? 0;
        if (tf === 0) continue;

        const idf = this.idf.get(qt) ?? 0;
        const numerator = tf * (K1 + 1);
        const denominator = tf + K1 * (1 - B + B * (doc.length / this.avgDocLength));
        score += idf * (numerator / denominator);
      }
      const id = `${doc.tool.server}:${doc.tool.name}`;
      scored.push({ tool: doc.tool, score, id });
    }

    return scored;
  }

  /** Dense cosine similarity search against the static vector index.
   *  Used when a query embedding is available (e.g., from OpenAI at runtime). */
  searchDense(queryDense: number[], maxResults: number): ScoredResult[] {
    const scored: { id: string; score: number }[] = [];

    for (const rec of this.vectorIndex) {
      const score = cosineSim(queryDense, rec.dense);
      scored.push({ id: rec.id, score });
    }

    scored.sort((a, b) => b.score - a.score);

    return scored.slice(0, maxResults).map(s => ({
      id: s.id,
      score: s.score,
      content: '',
      metadata: {},
    }));
  }

  /** Sparse dot product search against the static vector index */
  private searchSparse(
    queryIndices: number[], queryValues: number[],
    field: 'minicoil', maxResults: number
  ): ScoredResult[] {
    const scored: { id: string; score: number }[] = [];

    for (const rec of this.vectorIndex) {
      const sparse = rec[field];
      const score = sparseDot(queryIndices, queryValues, sparse.indices, sparse.values);
      if (score > 0) scored.push({ id: rec.id, score });
    }

    scored.sort((a, b) => b.score - a.score);

    return scored.slice(0, maxResults).map(s => ({
      id: s.id,
      score: s.score,
      content: '',
      metadata: {},
    }));
  }

  /**
   * Select the top-K tools most relevant to the user query.
   *
   * When vector index is loaded:
   *   Runs BM25 + miniCOIL sparse in parallel, fuses via RRF.
   *   Dense semantic search is not yet implemented (requires runtime embedding model).
   *
   * When no vector index:
   *   Falls back to BM25-only ranking.
   */
  async select(query: string, options?: PreFilterOptions): Promise<Tool[]> {
    const maxTools = options?.maxTools ?? DEFAULT_MAX_TOOLS;
    const maxPerServer = options?.maxPerServer ?? DEFAULT_MAX_PER_SERVER;

    if (this.docs.length <= maxTools) {
      return this.docs.map(d => d.tool);
    }

    // Expand query with domain-specific synonyms before tokenizing
    const expandedQuery = expandQuery(query);
    const queryTerms = tokenize(expandedQuery);
    if (queryTerms.length === 0) {
      return this.docs.slice(0, maxTools).map(d => d.tool);
    }

    // BM25 scores — always computed (zero inference cost)
    const bm25Scored = this.scoreBM25(queryTerms);

    let rankedIds: string[];

    if (this.vectorIndex.length > 0) {
      // Hybrid path: BM25 tool-level + miniCOIL adapter-level + dense adapter-level
      const topN = maxTools * 3;

      // BM25 results (tool-level → collapse to adapter/server ID)
      const bm25Results: ScoredResult[] = bm25Scored
        .filter(s => s.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, topN)
        .map(s => ({ id: s.tool.server, score: s.score, content: '', metadata: {} }));

      // Deduplicate BM25 by server (keep highest score per server)
      const bm25ByServer = new Map<string, ScoredResult>();
      for (const r of bm25Results) {
        const existing = bm25ByServer.get(r.id);
        if (!existing || r.score > existing.score) bm25ByServer.set(r.id, r);
      }
      const bm25Deduped = [...bm25ByServer.values()];

      // miniCOIL sparse search (adapter-level, n-gram hash approximation)
      // Full miniCOIL model available server-side via Qdrant in enterprise deployments
      const qMiniCOIL = queryMiniCOILSparse(expandedQuery);
      const minicoilResults = this.searchSparse(qMiniCOIL.indices, qMiniCOIL.values, 'minicoil', topN);

      // Dense semantic search — NOT YET IMPLEMENTED
      // Requires a runtime embedding model (e.g. OpenAI text-embedding-3-small).
      // When implemented, query embeddings will be compared against precomputed dense vectors.
      // For now, routing uses BM25 + miniCOIL sparse only.
      const denseResults: ScoredResult[] = []; // always empty until dense is implemented

      // Fuse via RRF
      const fused = RankFusion.rrf([
        { type: 'bm25', results: bm25Deduped },
        { type: 'sparse', results: minicoilResults },
        ...(denseResults.length > 0 ? [{ type: 'dense' as const, results: denseResults }] : []),
      ]);

      // Map fused adapter IDs back to tools
      rankedIds = [];
      for (const r of fused) {
        // Find all tools from this server in the BM25 results
        const serverTools = bm25Scored
          .filter(s => s.tool.server === r.id && s.score > 0)
          .sort((a, b) => b.score - a.score);
        for (const st of serverTools) {
          rankedIds.push(`${st.tool.server}:${st.tool.name}`);
        }
      }
    } else {
      // BM25-only path
      rankedIds = bm25Scored
        .filter(s => s.score > 0)
        .sort((a, b) => b.score - a.score)
        .map(s => s.id);
    }

    // Select with server diversity constraint
    const selected: Tool[] = [];
    const serverCounts = new Map<string, number>();

    for (const id of rankedIds) {
      if (selected.length >= maxTools) break;

      const tool = this.toolIdMap.get(id);
      if (!tool) continue;

      const serverCount = serverCounts.get(tool.server) ?? 0;
      if (serverCount >= maxPerServer) continue;

      selected.push(tool);
      serverCounts.set(tool.server, serverCount + 1);
    }

    return selected;
  }

  /** Synchronous select — BM25-only */
  selectSync(query: string, options?: PreFilterOptions): Tool[] {
    const maxTools = options?.maxTools ?? DEFAULT_MAX_TOOLS;
    const maxPerServer = options?.maxPerServer ?? DEFAULT_MAX_PER_SERVER;

    if (this.docs.length <= maxTools) {
      return this.docs.map(d => d.tool);
    }

    const queryTerms = tokenize(query);
    if (queryTerms.length === 0) {
      return this.docs.slice(0, maxTools).map(d => d.tool);
    }

    const scored = this.scoreBM25(queryTerms);
    scored.sort((a, b) => b.score - a.score);

    const selected: Tool[] = [];
    const serverCounts = new Map<string, number>();

    for (const { tool, score } of scored) {
      if (selected.length >= maxTools) break;
      if (score === 0) break;

      const serverCount = serverCounts.get(tool.server) ?? 0;
      if (serverCount >= maxPerServer) continue;

      selected.push(tool);
      serverCounts.set(tool.server, serverCount + 1);
    }

    return selected;
  }

  /** Whether hybrid vector index is loaded */
  get isHybrid(): boolean {
    return this.vectorIndex.length > 0;
  }

  /** Number of indexed tools */
  get size(): number {
    return this.docs.length;
  }

  /** Number of vectors in the static index */
  get vectorCount(): number {
    return this.vectorIndex.length;
  }
}

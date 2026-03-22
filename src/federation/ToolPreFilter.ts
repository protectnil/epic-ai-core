/**
 * @epicai/core — Tool Pre-Filter
 * Narrows N registered tools to a ranked shortlist before the orchestrator LLM sees them.
 * Uses BM25 scoring over tool names and descriptions — zero dependencies, sub-millisecond.
 *
 * Why: Small models (7B) can't produce structured tool_calls when given 50+ tools.
 * qwen2.5:7b handles ~8 reliably. This filter selects the most relevant 5-8 tools
 * so the model sees a focused context regardless of how many adapters are connected.
 *
 * Built on the Epic AI Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

import type { Tool } from '../types/index.js';

// BM25 tuning parameters
const K1 = 1.2;   // term frequency saturation
const B = 0.75;    // document length normalization

const DEFAULT_MAX_TOOLS = 8;
const DEFAULT_MAX_PER_SERVER = 3;

// Common stopwords that add noise to matching
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

/**
 * Tokenize a string into lowercase terms, splitting on non-alphanumeric characters.
 * Strips stopwords and terms shorter than 2 characters.
 */
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
  maxTools?: number;        // Max tools to return (default: 8)
  maxPerServer?: number;    // Max tools from a single server (default: 3)
}

export class ToolPreFilter {
  private docs: ToolDocument[] = [];
  private idf: Map<string, number> = new Map();
  private avgDocLength = 0;

  /**
   * Index the full tool catalog. Call once after all servers are connected,
   * or again if the catalog changes.
   */
  index(tools: Tool[]): void {
    // Build term-frequency documents from tool name + description + parameter names
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

    // Compute IDF across the corpus
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
      // Standard BM25 IDF: log((N - df + 0.5) / (df + 0.5) + 1)
      this.idf.set(term, Math.log((docCount - df + 0.5) / (df + 0.5) + 1));
    }

    this.avgDocLength = this.docs.length > 0
      ? this.docs.reduce((sum, d) => sum + d.length, 0) / this.docs.length
      : 0;
  }

  /**
   * Select the top-K tools most relevant to the user query.
   * Returns tools ranked by BM25 score with server diversity enforcement.
   */
  select(query: string, options?: PreFilterOptions): Tool[] {
    const maxTools = options?.maxTools ?? DEFAULT_MAX_TOOLS;
    const maxPerServer = options?.maxPerServer ?? DEFAULT_MAX_PER_SERVER;

    if (this.docs.length <= maxTools) {
      // No filtering needed — everything fits
      return this.docs.map(d => d.tool);
    }

    const queryTerms = tokenize(query);
    if (queryTerms.length === 0) {
      // No useful query terms — return first maxTools (arbitrary but deterministic)
      return this.docs.slice(0, maxTools).map(d => d.tool);
    }

    // Score each document with BM25
    const scored: { tool: Tool; score: number }[] = [];

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
      scored.push({ tool: doc.tool, score });
    }

    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);

    // Select with server diversity constraint
    const selected: Tool[] = [];
    const serverCounts = new Map<string, number>();

    for (const { tool, score } of scored) {
      if (selected.length >= maxTools) break;
      if (score === 0) break; // No relevance at all

      const serverCount = serverCounts.get(tool.server) ?? 0;
      if (serverCount >= maxPerServer) continue;

      selected.push(tool);
      serverCounts.set(tool.server, serverCount + 1);
    }

    return selected;
  }

  /**
   * Number of indexed tools.
   */
  get size(): number {
    return this.docs.length;
  }
}

/**
 * @epicai/legion — Token & Cost Tracker
 * Tracks token usage and estimated costs across orchestrator and generator calls.
 * Built on the Epic AI Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

export interface CostEntry {
  provider: string;
  model: string;
  role: 'orchestrator' | 'generator';
  usage: TokenUsage;
  estimatedCostUsd: number;
  timestamp: Date;
}

export interface CostSummary {
  totalInputTokens: number;
  totalOutputTokens: number;
  totalTokens: number;
  totalEstimatedCostUsd: number;
  byRole: {
    orchestrator: { tokens: number; costUsd: number };
    generator: { tokens: number; costUsd: number };
  };
  entries: CostEntry[];
}

// Default pricing per 1M tokens (USD) — consumer can override
const DEFAULT_PRICING: Record<string, { input: number; output: number }> = {
  'gpt-4.1': { input: 2.00, output: 8.00 },
  'gpt-4o': { input: 2.50, output: 10.00 },
  'claude-sonnet-4-6': { input: 3.00, output: 15.00 },
  'claude-opus-4-6': { input: 15.00, output: 75.00 },
  'qwen2.5:7b': { input: 0, output: 0 }, // local model — free
  'llama3.1:8b': { input: 0, output: 0 }, // local model — free
  'mistral:7b': { input: 0, output: 0 }, // local model — free
  'ollama': { input: 0, output: 0 }, // local — free
};

export class TokenTracker {
  private readonly entries: CostEntry[] = [];
  private readonly pricing: Record<string, { input: number; output: number }>;

  constructor(customPricing?: Record<string, { input: number; output: number }>) {
    this.pricing = { ...DEFAULT_PRICING, ...customPricing };
  }

  /**
   * Record token usage from an LLM call.
   */
  record(
    provider: string,
    model: string,
    role: 'orchestrator' | 'generator',
    usage: TokenUsage,
  ): CostEntry {
    const pricing = this.pricing[model] ?? this.pricing[provider] ?? { input: 0, output: 0 };
    const estimatedCostUsd =
      (usage.inputTokens / 1_000_000) * pricing.input +
      (usage.outputTokens / 1_000_000) * pricing.output;

    const entry: CostEntry = {
      provider,
      model,
      role,
      usage,
      estimatedCostUsd,
      timestamp: new Date(),
    };

    this.entries.push(entry);
    return entry;
  }

  /**
   * Estimate token count from text (rough: ~4 chars per token).
   */
  static estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  /**
   * Get cost summary across all recorded entries.
   */
  summary(): CostSummary {
    let totalInput = 0;
    let totalOutput = 0;
    let totalCost = 0;
    let orchTokens = 0;
    let orchCost = 0;
    let genTokens = 0;
    let genCost = 0;

    for (const entry of this.entries) {
      totalInput += entry.usage.inputTokens;
      totalOutput += entry.usage.outputTokens;
      totalCost += entry.estimatedCostUsd;

      if (entry.role === 'orchestrator') {
        orchTokens += entry.usage.totalTokens;
        orchCost += entry.estimatedCostUsd;
      } else {
        genTokens += entry.usage.totalTokens;
        genCost += entry.estimatedCostUsd;
      }
    }

    return {
      totalInputTokens: totalInput,
      totalOutputTokens: totalOutput,
      totalTokens: totalInput + totalOutput,
      totalEstimatedCostUsd: totalCost,
      byRole: {
        orchestrator: { tokens: orchTokens, costUsd: orchCost },
        generator: { tokens: genTokens, costUsd: genCost },
      },
      entries: [...this.entries],
    };
  }

  /**
   * Reset all tracked entries.
   */
  reset(): void {
    this.entries.length = 0;
  }
}

/**
 * Tisane MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: No official vendor MCP server exists for Tisane.
//   Community: None published.
//   Our adapter covers: 6 tools (parse text, hypernyms, hyponyms, inflections, word senses, feature values).
//   No community MCP servers cover Tisane NLP.
// Recommendation: Use this adapter. No community alternatives exist.
//
// Base URL: https://api.tisane.ai
// Auth: Azure API Management subscription key passed as header `Ocp-Apim-Subscription-Key`
// Docs: https://tisane.ai/developer/
// Rate limits: Free Community Plan — 50,000 requests lifetime, 10 requests/minute. Paid plans available.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface TisaneConfig {
  /** Azure API Management subscription key (Ocp-Apim-Subscription-Key) */
  apiKey: string;
  /** Optional base URL override (default: https://api.tisane.ai) */
  baseUrl?: string;
}

export class TisaneMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: TisaneConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? 'https://api.tisane.ai';
  }

  static catalog() {
    return {
      name: 'tisane',
      displayName: 'Tisane',
      version: '1.0.0',
      category: 'ai',
      keywords: [
        'tisane', 'nlp', 'natural-language-processing', 'text-analysis', 'sentiment',
        'abuse-detection', 'hate-speech', 'toxicity', 'morphology', 'linguistics',
        'hypernym', 'hyponym', 'word-sense', 'inflection', 'multilingual', 'parse',
      ],
      toolNames: [
        'parse_text', 'list_hypernyms', 'list_hyponyms',
        'list_inflections', 'list_word_senses', 'list_feature_values',
      ],
      description: 'Tisane NLP — parse text for sentiment, abuse detection, hate speech, entities, topics, and morphology across 30+ languages; explore word relationships and inflections.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'parse_text',
        description: 'Analyze text using Tisane NLP — detects sentiment, abusive content, hate speech, spam, entities, topics, and performs morphological analysis. Supports 30+ languages.',
        inputSchema: {
          type: 'object',
          properties: {
            content: {
              type: 'string',
              description: 'The text content to analyze',
            },
            language: {
              type: 'string',
              description: 'BCP 47 language code of the content (e.g. "en" for English, "fr" for French, "de" for German)',
            },
            settings: {
              type: 'object',
              description: 'Optional analysis settings — e.g. { "snippets": true, "topic": true, "sentiment": true, "abuse": ["slur","personal_attack"] }',
              additionalProperties: true,
            },
          },
          required: ['content', 'language'],
        },
      },
      {
        name: 'list_hypernyms',
        description: 'List hypernyms (broader/parent concepts) for a given lexical family — walks up the semantic hierarchy',
        inputSchema: {
          type: 'object',
          properties: {
            family: {
              type: 'string',
              description: 'Lexical family identifier to find hypernyms for',
            },
            max_level: {
              type: 'number',
              description: 'Maximum number of levels to traverse up the hierarchy (default: unlimited)',
            },
          },
          required: ['family'],
        },
      },
      {
        name: 'list_hyponyms',
        description: 'List hyponyms (narrower/child concepts) for a given lexical family — walks down the semantic hierarchy',
        inputSchema: {
          type: 'object',
          properties: {
            family: {
              type: 'string',
              description: 'Lexical family identifier to find hyponyms for',
            },
            max_level: {
              type: 'number',
              description: 'Maximum number of levels to traverse down the hierarchy (default: unlimited)',
            },
          },
          required: ['family'],
        },
      },
      {
        name: 'list_inflections',
        description: 'List all inflected forms (conjugations, declensions, plural forms) of a lexeme in a given language',
        inputSchema: {
          type: 'object',
          properties: {
            language: {
              type: 'string',
              description: 'BCP 47 language code (e.g. "en", "fr", "de", "es")',
            },
            lexeme: {
              type: 'string',
              description: 'Base form (lemma) of the word to inflect (e.g. "run", "be", "good")',
            },
            family: {
              type: 'string',
              description: 'Lexical family identifier (alternative to lexeme + language)',
            },
          },
        },
      },
      {
        name: 'list_word_senses',
        description: 'List all word senses (meanings) for a word in a given language — returns sense IDs, definitions, and semantic tags',
        inputSchema: {
          type: 'object',
          properties: {
            language: {
              type: 'string',
              description: 'BCP 47 language code (e.g. "en", "fr")',
            },
            word: {
              type: 'string',
              description: 'The word to look up senses for (e.g. "bank", "run", "light")',
            },
          },
          required: ['language', 'word'],
        },
      },
      {
        name: 'list_feature_values',
        description: 'List all possible values for a morphological feature type in a given language (e.g. tense values: past, present, future)',
        inputSchema: {
          type: 'object',
          properties: {
            language: {
              type: 'string',
              description: 'BCP 47 language code (e.g. "en", "fr", "de")',
            },
            type: {
              type: 'string',
              description: 'Feature type to list values for (e.g. "tense", "number", "gender", "case")',
            },
            description: {
              type: 'string',
              description: 'Optional description filter to narrow results',
            },
          },
          required: ['language', 'type'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'parse_text':          return this.parseText(args);
        case 'list_hypernyms':      return this.listHypernyms(args);
        case 'list_hyponyms':       return this.listHyponyms(args);
        case 'list_inflections':    return this.listInflections(args);
        case 'list_word_senses':    return this.listWordSenses(args);
        case 'list_feature_values': return this.listFeatureValues(args);
        default:
          return { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true };
      }
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Tool execution failed: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true,
      };
    }
  }

  private commonHeaders(): Record<string, string> {
    return {
      'Ocp-Apim-Subscription-Key': this.apiKey,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  private buildUrl(path: string, params: Record<string, string | undefined>): string {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) qs.set(k, v);
    }
    const query = qs.toString();
    return `${this.baseUrl}${path}${query ? '?' + query : ''}`;
  }

  private async fetchGet(path: string, params: Record<string, string | undefined> = {}): Promise<ToolResult> {
    const url = this.buildUrl(path, params);
    const response = await this.fetchWithRetry(url, {
      method: 'GET',
      headers: this.commonHeaders(),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Tisane returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async fetchPost(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const url = `${this.baseUrl}${path}`;
    const response = await this.fetchWithRetry(url, {
      method: 'POST',
      headers: this.commonHeaders(),
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Tisane returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async parseText(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.content) return { content: [{ type: 'text', text: 'content is required' }], isError: true };
    if (!args.language) return { content: [{ type: 'text', text: 'language is required' }], isError: true };
    const body: Record<string, unknown> = {
      content: args.content,
      language: args.language,
      settings: (args.settings as Record<string, unknown>) ?? {},
    };
    return this.fetchPost('/parse', body);
  }

  private async listHypernyms(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.family) return { content: [{ type: 'text', text: 'family is required' }], isError: true };
    const params: Record<string, string | undefined> = {
      family: args.family as string,
    };
    if (args.max_level !== undefined) params.maxLevel = String(args.max_level);
    return this.fetchGet('/hypernyms', params);
  }

  private async listHyponyms(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.family) return { content: [{ type: 'text', text: 'family is required' }], isError: true };
    const params: Record<string, string | undefined> = {
      family: args.family as string,
    };
    if (args.max_level !== undefined) params.maxLevel = String(args.max_level);
    return this.fetchGet('/hyponyms', params);
  }

  private async listInflections(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string | undefined> = {};
    if (args.language) params.language = args.language as string;
    if (args.lexeme) params.lexeme = args.lexeme as string;
    if (args.family) params.family = args.family as string;
    if (!params.language && !params.family) {
      return { content: [{ type: 'text', text: 'Either language+lexeme or family is required' }], isError: true };
    }
    return this.fetchGet('/inflections', params);
  }

  private async listWordSenses(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.language) return { content: [{ type: 'text', text: 'language is required' }], isError: true };
    if (!args.word) return { content: [{ type: 'text', text: 'word is required' }], isError: true };
    const params: Record<string, string | undefined> = {
      language: args.language as string,
      word: args.word as string,
    };
    return this.fetchGet('/senses', params);
  }

  private async listFeatureValues(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.language) return { content: [{ type: 'text', text: 'language is required' }], isError: true };
    if (!args.type) return { content: [{ type: 'text', text: 'type is required' }], isError: true };
    const params: Record<string, string | undefined> = {
      language: args.language as string,
      type: args.type as string,
    };
    if (args.description) params.description = args.description as string;
    return this.fetchGet('/values', params);
  }
}

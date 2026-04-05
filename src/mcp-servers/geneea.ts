/**
 * Geneea MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// No official Geneea MCP server was found on GitHub.
//
// Base URL: https://api.geneea.com
// Auth: API key passed as query parameter `user_key` or via Authorization header: `user_key <KEY>`
// Docs: https://www.geneea.com/pricing — sign up to obtain API key
// Rate limits: Depends on plan. Contact Geneea for enterprise quotas.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface GeneeaConfig {
  apiKey: string;
  /** Optional base URL override (default: https://api.geneea.com) */
  baseUrl?: string;
}

export class GeneeaMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: GeneeaConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? 'https://api.geneea.com';
  }

  static catalog() {
    return {
      name: 'geneea',
      displayName: 'Geneea',
      version: '1.0.0',
      category: 'ai',
      keywords: [
        'geneea', 'nlp', 'natural language processing', 'sentiment', 'entities',
        'named entity recognition', 'ner', 'lemmatization', 'topic detection',
        'text analysis', 'diacritization', 'text correction', 'language detection',
        'document analysis', 'ai', 'machine learning', 'text mining',
      ],
      toolNames: [
        'get_account_info',
        'get_service_status',
        'correct_text',
        'extract_entities',
        'lemmatize_text',
        'analyze_sentiment',
        'detect_topic',
      ],
      description: 'NLP text analysis: named-entity recognition, sentiment analysis, topic detection, lemmatization, and text correction (diacritization) via the Geneea Intelligence API.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'get_account_info',
        description: 'Retrieve information about the current Geneea user account including plan type and remaining API quotas',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_service_status',
        description: 'Check the operational status of the Geneea Interpretor NLP service',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'correct_text',
        description: 'Perform text correction and diacritization on a document — fixes missing diacritics in Czech and other supported languages',
        inputSchema: {
          type: 'object',
          properties: {
            text: {
              type: 'string',
              description: 'Raw document text to correct',
            },
            url: {
              type: 'string',
              description: 'URL of document to fetch and correct (use instead of text)',
            },
            id: {
              type: 'string',
              description: 'Optional unique identifier for the document',
            },
            language: {
              type: 'string',
              description: 'Language code of the document — auto-detected if omitted (e.g. en, cs, de)',
            },
            extractor: {
              type: 'string',
              description: 'Text extractor for HTML documents: default, article, or keep-everything (default: default)',
            },
            returnTextInfo: {
              type: 'boolean',
              description: 'Include raw document text in the response (default: false)',
            },
          },
        },
      },
      {
        name: 'extract_entities',
        description: 'Perform named-entity recognition (NER) on a document — extracts persons, organizations, locations, and other entities with disambiguation links',
        inputSchema: {
          type: 'object',
          properties: {
            text: {
              type: 'string',
              description: 'Raw document text to analyze for named entities',
            },
            url: {
              type: 'string',
              description: 'URL of document to fetch and analyze (use instead of text)',
            },
            id: {
              type: 'string',
              description: 'Optional unique identifier for the document',
            },
            language: {
              type: 'string',
              description: 'Language code of the document — auto-detected if omitted (e.g. en, cs, de)',
            },
            extractor: {
              type: 'string',
              description: 'Text extractor for HTML documents: default, article, or keep-everything (default: default)',
            },
            returnTextInfo: {
              type: 'boolean',
              description: 'Include raw document text in the response (default: false)',
            },
          },
        },
      },
      {
        name: 'lemmatize_text',
        description: 'Perform lemmatization on a document — reduces words to their base/dictionary forms, tokens separated by spaces, sentences by newlines',
        inputSchema: {
          type: 'object',
          properties: {
            text: {
              type: 'string',
              description: 'Raw document text to lemmatize',
            },
            url: {
              type: 'string',
              description: 'URL of document to fetch and lemmatize (use instead of text)',
            },
            id: {
              type: 'string',
              description: 'Optional unique identifier for the document',
            },
            language: {
              type: 'string',
              description: 'Language code of the document — auto-detected if omitted (e.g. en, cs, de)',
            },
            extractor: {
              type: 'string',
              description: 'Text extractor for HTML documents: default, article, or keep-everything (default: default)',
            },
            returnTextInfo: {
              type: 'boolean',
              description: 'Include raw document text in the response (default: false)',
            },
          },
        },
      },
      {
        name: 'analyze_sentiment',
        description: 'Perform sentiment analysis on a document — returns sentiment score from -1.0 (very negative) to 1.0 (very positive) with language detection',
        inputSchema: {
          type: 'object',
          properties: {
            text: {
              type: 'string',
              description: 'Raw document text to analyze for sentiment',
            },
            url: {
              type: 'string',
              description: 'URL of document to fetch and analyze (use instead of text)',
            },
            id: {
              type: 'string',
              description: 'Optional unique identifier for the document',
            },
            language: {
              type: 'string',
              description: 'Language code of the document — auto-detected if omitted (e.g. en, cs, de)',
            },
            extractor: {
              type: 'string',
              description: 'Text extractor for HTML documents: default, article, or keep-everything (default: default)',
            },
            returnTextInfo: {
              type: 'boolean',
              description: 'Include raw document text in the response (default: false)',
            },
          },
        },
      },
      {
        name: 'detect_topic',
        description: 'Perform topic detection on a document — returns the most likely topic label with confidence score and a probability distribution over all topic labels',
        inputSchema: {
          type: 'object',
          properties: {
            text: {
              type: 'string',
              description: 'Raw document text to classify by topic',
            },
            url: {
              type: 'string',
              description: 'URL of document to fetch and classify (use instead of text)',
            },
            id: {
              type: 'string',
              description: 'Optional unique identifier for the document',
            },
            language: {
              type: 'string',
              description: 'Language code of the document — auto-detected if omitted (e.g. en, cs, de)',
            },
            extractor: {
              type: 'string',
              description: 'Text extractor for HTML documents: default, article, or keep-everything (default: default)',
            },
            returnTextInfo: {
              type: 'boolean',
              description: 'Include raw document text in the response (default: false)',
            },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'get_account_info':
          return this.getAccountInfo();
        case 'get_service_status':
          return this.getServiceStatus();
        case 'correct_text':
          return this.analyzeDocument('/s1/correction', args);
        case 'extract_entities':
          return this.analyzeDocument('/s1/entities', args);
        case 'lemmatize_text':
          return this.analyzeDocument('/s1/lemmatize', args);
        case 'analyze_sentiment':
          return this.analyzeDocument('/s1/sentiment', args);
        case 'detect_topic':
          return this.analyzeDocument('/s1/topic', args);
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

  private authHeaders(): Record<string, string> {
    return {
      'Authorization': `user_key ${this.apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  private async getAccountInfo(): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}/account`, {
      method: 'GET',
      headers: this.authHeaders(),
    });

    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }

    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Geneea returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getServiceStatus(): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}/status`, {
      method: 'GET',
      headers: this.authHeaders(),
    });

    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }

    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Geneea returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async analyzeDocument(path: string, args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {};
    if (args.text !== undefined) body.text = args.text;
    if (args.url !== undefined) body.url = args.url;
    if (args.id !== undefined) body.id = args.id;
    if (args.language !== undefined) body.language = args.language;
    if (args.extractor !== undefined) body.extractor = args.extractor;
    if (args.returnTextInfo !== undefined) body.returnTextInfo = args.returnTextInfo;

    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.authHeaders(),
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }

    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Geneea returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }
}

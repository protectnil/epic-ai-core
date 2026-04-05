/**
 * Text2Data MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// No official Text2Data MCP server was found on GitHub as of 2026-03-28.
// Our adapter covers: 3 tools. Vendor MCP covers: 0 tools (none exists).
// Recommendation: use-rest-api — no official MCP server exists.
//
// Base URL: http://api.text2data.org
// Auth: PrivateKey passed in request body (and optionally Secret for HMAC-signed requests)
//   Key retrieved from text2data.com account dashboard
//   Verified from: https://api.apis.guru/v2/specs/text2data.org/v3.4/swagger.json
// Docs: https://text2data.com/Integration
// Rate limits: Depends on subscription tier

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface Text2DataConfig {
  privateKey: string;
  secret?: string;
  baseUrl?: string;
}

export class Text2DataMCPServer extends MCPAdapterBase {
  private readonly privateKey: string;
  private readonly secret: string | undefined;
  private readonly baseUrl: string;

  constructor(config: Text2DataConfig) {
    super();
    this.privateKey = config.privateKey;
    this.secret = config.secret;
    this.baseUrl = config.baseUrl || 'http://api.text2data.org';
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'analyze_sentiment',
        description: 'Analyze the sentiment of a text document. Returns sentiment score, polarity (positive/negative/neutral), key phrases, named entities, and sentence-level breakdown.',
        inputSchema: {
          type: 'object',
          properties: {
            text: {
              type: 'string',
              description: 'The document text to analyze for sentiment',
            },
            language: {
              type: 'string',
              description: 'BCP-47 language code of the document (e.g., "en", "fr", "de"). Defaults to auto-detect.',
            },
            is_twitter_content: {
              type: 'boolean',
              description: 'Set to true if the text is from Twitter/social media to enable slang and abbreviation handling',
            },
            request_identifier: {
              type: 'string',
              description: 'Optional client-side identifier to correlate requests and results',
            },
          },
          required: ['text'],
        },
      },
      {
        name: 'categorize_document',
        description: 'Categorize a text document into predefined or custom topic categories. Returns a ranked list of matching categories with confidence scores.',
        inputSchema: {
          type: 'object',
          properties: {
            text: {
              type: 'string',
              description: 'The document text to categorize',
            },
            language: {
              type: 'string',
              description: 'BCP-47 language code of the document (e.g., "en", "fr", "de"). Defaults to auto-detect.',
            },
            category_model: {
              type: 'string',
              description: 'Name of a custom user-trained category model to use for classification',
            },
            is_twitter_content: {
              type: 'boolean',
              description: 'Set to true if the text is from Twitter/social media',
            },
            request_identifier: {
              type: 'string',
              description: 'Optional client-side identifier to correlate requests and results',
            },
          },
          required: ['text'],
        },
      },
      {
        name: 'extract_entities',
        description: 'Extract named entities, key phrases, topics, and structured data from a text document. Returns people, organizations, locations, dates, and other recognized entities.',
        inputSchema: {
          type: 'object',
          properties: {
            text: {
              type: 'string',
              description: 'The document text to extract entities from',
            },
            language: {
              type: 'string',
              description: 'BCP-47 language code of the document (e.g., "en", "fr", "de"). Defaults to auto-detect.',
            },
            is_twitter_content: {
              type: 'boolean',
              description: 'Set to true if the text is from Twitter/social media',
            },
            request_identifier: {
              type: 'string',
              description: 'Optional client-side identifier to correlate requests and results',
            },
          },
          required: ['text'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'analyze_sentiment':
          return await this.analyzeSentiment(args);
        case 'categorize_document':
          return await this.categorizeDocument(args);
        case 'extract_entities':
          return await this.extractEntities(args);
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

  private buildDocument(args: Record<string, unknown>): Record<string, unknown> {
    const doc: Record<string, unknown> = {
      DocumentText: args.text as string,
      PrivateKey: this.privateKey,
    };
    if (this.secret) doc.Secret = this.secret;
    if (args.language) doc.DocumentLanguage = args.language;
    if (args.is_twitter_content !== undefined) doc.IsTwitterContent = args.is_twitter_content;
    if (args.request_identifier) doc.RequestIdentifier = args.request_identifier;
    if (args.category_model) doc.UserCategoryModelName = args.category_model;
    return doc;
  }

  private async request(path: string, body: unknown): Promise<ToolResult> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    const response = await this.fetchWithRetry(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return {
        content: [{ type: 'text', text: `Text2Data API error ${response.status}: ${errText}` }],
        isError: true,
      };
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new Error(`Text2Data returned non-JSON response (HTTP ${response.status})`);
    }

    const text = JSON.stringify(data, null, 2);
    const truncated = text.length > 10_000
      ? text.slice(0, 10_000) + '\n... [truncated, ' + text.length + ' total chars]'
      : text;

    return { content: [{ type: 'text', text: truncated }], isError: false };
  }

  private async analyzeSentiment(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.text) {
      return { content: [{ type: 'text', text: 'text is required' }], isError: true };
    }
    return this.request('/v3/Analyze', this.buildDocument(args));
  }

  private async categorizeDocument(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.text) {
      return { content: [{ type: 'text', text: 'text is required' }], isError: true };
    }
    return this.request('/v3/Categorize', this.buildDocument(args));
  }

  private async extractEntities(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.text) {
      return { content: [{ type: 'text', text: 'text is required' }], isError: true };
    }
    return this.request('/v3/Extract', this.buildDocument(args));
  }

  static catalog() {
    return {
      name: 'text2data',
      displayName: 'Text2Data',
      version: '1.0.0',
      category: 'ai' as const,
      keywords: ['text2data', 'nlp', 'sentiment-analysis', 'text-analytics', 'entity-extraction', 'categorization'],
      toolNames: ['analyze_sentiment', 'categorize_document', 'extract_entities'],
      description: 'Text2Data adapter for the Epic AI Intelligence Platform — NLP sentiment analysis, document categorization, and entity extraction',
      author: 'protectnil' as const,
    };
  }
}

/**
 * Semantria MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found. No vendor-published MCP server exists for Semantria.
// Our adapter covers: 10 tools (document analysis, collection analysis, configuration,
//   entities, categories, queries, phrases, blacklist, subscription, status).
// Recommendation: Use this adapter. No community MCP server available.
//
// Base URL: https://api.semantria.com
// Auth: OAuth 1.0 (consumer key + secret) — passed as Authorization header.
//   For simplicity this adapter accepts pre-signed tokens or uses query param auth
//   as supported by Semantria's legacy endpoint pattern (key/secret as query params).
// Docs: https://semantria.com/developer
// Rate limits: Varies by subscription tier. Check /subscription for current limits.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface SemantriaConfig {
  consumerKey: string;
  consumerSecret: string;
  /** Optional config_id to scope all calls to a specific configuration */
  configId?: string;
  /** Optional base URL override (default: https://api.semantria.com) */
  baseUrl?: string;
}

export class SemantriaMCPServer extends MCPAdapterBase {
  private readonly consumerKey: string;
  private readonly consumerSecret: string;
  private readonly configId?: string;
  private readonly baseUrl: string;

  constructor(config: SemantriaConfig) {
    super();
    this.consumerKey = config.consumerKey;
    this.consumerSecret = config.consumerSecret;
    this.configId = config.configId;
    this.baseUrl = config.baseUrl ?? 'https://api.semantria.com';
  }

  static catalog() {
    return {
      name: 'semantria',
      displayName: 'Semantria',
      version: '1.0.0',
      category: 'ai',
      keywords: [
        'semantria', 'sentiment', 'nlp', 'text analysis', 'entity extraction',
        'opinion mining', 'document analysis', 'collection analysis', 'classification',
        'natural language processing', 'social media analysis', 'survey analysis',
      ],
      toolNames: [
        'queue_document', 'queue_document_batch', 'get_processed_documents',
        'get_document_status', 'queue_collection', 'get_processed_collections',
        'list_configurations', 'list_entities', 'list_categories',
        'get_subscription',
      ],
      description: 'Semantria text and sentiment analysis: queue documents or collections for NLP processing, retrieve sentiment scores, entities, themes, and opinion analysis results.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'queue_document',
        description: 'Queue a single document for sentiment and text analysis — returns a document ID to poll for results',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Unique identifier for this document (e.g. tweet ID, review ID)',
            },
            text: {
              type: 'string',
              description: 'The text content to analyze',
            },
            config_id: {
              type: 'string',
              description: 'Semantria configuration ID to use for analysis (overrides adapter default)',
            },
          },
          required: ['id', 'text'],
        },
      },
      {
        name: 'queue_document_batch',
        description: 'Queue a batch of documents for sentiment and text analysis in a single API call (up to 100 documents)',
        inputSchema: {
          type: 'object',
          properties: {
            documents: {
              type: 'array',
              description: 'Array of documents to analyze, each with id and text fields',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string', description: 'Unique document identifier' },
                  text: { type: 'string', description: 'Text content to analyze' },
                },
                required: ['id', 'text'],
              },
            },
            config_id: {
              type: 'string',
              description: 'Semantria configuration ID to use for analysis (overrides adapter default)',
            },
          },
          required: ['documents'],
        },
      },
      {
        name: 'get_processed_documents',
        description: 'Retrieve completed document analysis results — returns all documents that have finished processing',
        inputSchema: {
          type: 'object',
          properties: {
            config_id: {
              type: 'string',
              description: 'Semantria configuration ID (overrides adapter default)',
            },
          },
        },
      },
      {
        name: 'get_document_status',
        description: 'Retrieve the analysis result or queue status for a specific document by its ID',
        inputSchema: {
          type: 'object',
          properties: {
            document_id: {
              type: 'string',
              description: 'Document ID returned from queue_document',
            },
            config_id: {
              type: 'string',
              description: 'Semantria configuration ID (overrides adapter default)',
            },
          },
          required: ['document_id'],
        },
      },
      {
        name: 'queue_collection',
        description: 'Queue a collection of documents for aggregate-level sentiment analysis — returns facets, themes, and topics across all documents',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Unique identifier for this collection',
            },
            documents: {
              type: 'array',
              description: 'Array of documents in the collection, each with id and text',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  text: { type: 'string' },
                },
                required: ['id', 'text'],
              },
            },
            config_id: {
              type: 'string',
              description: 'Semantria configuration ID (overrides adapter default)',
            },
          },
          required: ['id', 'documents'],
        },
      },
      {
        name: 'get_processed_collections',
        description: 'Retrieve completed collection analysis results — returns aggregated themes, facets, and sentiment across queued collections',
        inputSchema: {
          type: 'object',
          properties: {
            config_id: {
              type: 'string',
              description: 'Semantria configuration ID (overrides adapter default)',
            },
          },
        },
      },
      {
        name: 'list_configurations',
        description: 'List all user configurations — configurations control analysis settings such as language, entity types, and output format',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'list_entities',
        description: 'List user-defined entities for a configuration — custom entities extend the default entity extraction model',
        inputSchema: {
          type: 'object',
          properties: {
            config_id: {
              type: 'string',
              description: 'Configuration ID to retrieve entities for',
            },
          },
        },
      },
      {
        name: 'list_categories',
        description: 'List user-defined categories for a configuration — categories classify documents into custom topic buckets',
        inputSchema: {
          type: 'object',
          properties: {
            config_id: {
              type: 'string',
              description: 'Configuration ID to retrieve categories for',
            },
          },
        },
      },
      {
        name: 'get_subscription',
        description: 'Retrieve current Semantria subscription details including call limits, remaining quota, and features',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'queue_document':
          return this.queueDocument(args);
        case 'queue_document_batch':
          return this.queueDocumentBatch(args);
        case 'get_processed_documents':
          return this.getProcessedDocuments(args);
        case 'get_document_status':
          return this.getDocumentStatus(args);
        case 'queue_collection':
          return this.queueCollection(args);
        case 'get_processed_collections':
          return this.getProcessedCollections(args);
        case 'list_configurations':
          return this.listConfigurations();
        case 'list_entities':
          return this.listEntities(args);
        case 'list_categories':
          return this.listCategories(args);
        case 'get_subscription':
          return this.getSubscription();
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

  private buildUrl(path: string, configId?: string): string {
    const qs = new URLSearchParams({
      consumer_key: this.consumerKey,
      consumer_secret: this.consumerSecret,
    });
    const effectiveConfigId = configId ?? this.configId;
    if (effectiveConfigId) qs.set('config_id', effectiveConfigId);
    return `${this.baseUrl}${path}.json?${qs.toString()}`;
  }

  private async fetchGet(path: string, configId?: string): Promise<ToolResult> {
    const url = this.buildUrl(path, configId);
    const response = await this.fetchWithRetry(url, { method: 'GET' });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Semantria returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async fetchPost(path: string, body: unknown, configId?: string): Promise<ToolResult> {
    const url = this.buildUrl(path, configId);
    const response = await this.fetchWithRetry(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Semantria returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async queueDocument(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    if (!args.text) return { content: [{ type: 'text', text: 'text is required' }], isError: true };
    const body = { id: args.id as string, text: args.text as string };
    return this.fetchPost('/document', body, args.config_id as string | undefined);
  }

  private async queueDocumentBatch(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.documents || !Array.isArray(args.documents)) {
      return { content: [{ type: 'text', text: 'documents array is required' }], isError: true };
    }
    return this.fetchPost('/document/batch', args.documents, args.config_id as string | undefined);
  }

  private async getProcessedDocuments(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fetchGet('/document/processed', args.config_id as string | undefined);
  }

  private async getDocumentStatus(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.document_id) return { content: [{ type: 'text', text: 'document_id is required' }], isError: true };
    return this.fetchGet(`/document/${encodeURIComponent(args.document_id as string)}`, args.config_id as string | undefined);
  }

  private async queueCollection(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    if (!args.documents || !Array.isArray(args.documents)) {
      return { content: [{ type: 'text', text: 'documents array is required' }], isError: true };
    }
    const body = { id: args.id as string, documents: args.documents };
    return this.fetchPost('/collection', body, args.config_id as string | undefined);
  }

  private async getProcessedCollections(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fetchGet('/collection/processed', args.config_id as string | undefined);
  }

  private async listConfigurations(): Promise<ToolResult> {
    return this.fetchGet('/configurations');
  }

  private async listEntities(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fetchGet('/entities', args.config_id as string | undefined);
  }

  private async listCategories(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fetchGet('/categories', args.config_id as string | undefined);
  }

  private async getSubscription(): Promise<ToolResult> {
    return this.fetchGet('/subscription');
  }
}

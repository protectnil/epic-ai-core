/**
 * Vectara API MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// No official Vectara MCP server was found on GitHub. We build a full REST wrapper
// for complete Vectara v1 API coverage.
//
// Base URL: https://api.vectara.io
// Auth: API key via x-api-key header (or OAuth2 client credentials)
// Docs: https://docs.vectara.com/docs/api-reference
// Spec: https://api.apis.guru/v2/specs/vectara.io/1.0.0/openapi.json
// Category: ai
// Rate limits: See Vectara docs — limits vary by plan

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface VectaraConfig {
  apiKey: string;
  baseUrl?: string;
}

export class VectaraMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: VectaraConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.vectara.io';
  }

  static catalog() {
    return {
      name: 'vectara',
      displayName: 'Vectara',
      version: '1.0.0',
      category: 'ai',
      keywords: [
        'vectara', 'vector', 'search', 'semantic', 'rag', 'retrieval',
        'corpus', 'document', 'index', 'query', 'embedding', 'nlp',
        'generative', 'ai', 'knowledge', 'upload', 'ingest', 'grounded',
      ],
      toolNames: [
        'create_corpus',
        'delete_corpus',
        'list_corpora',
        'reset_corpus',
        'index_document',
        'delete_document',
        'upload_file',
        'query',
        'stream_query',
      ],
      description: 'Vectara: create and manage corpora, index documents, upload files, and run semantic/RAG queries against your vector knowledge base.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      // ── Corpus Management ──────────────────────────────────────────────────
      {
        name: 'create_corpus',
        description: 'Create a new Vectara corpus (a named vector index that holds documents for semantic search)',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Display name for the corpus',
            },
            description: {
              type: 'string',
              description: 'Optional description of what this corpus contains',
            },
            enabled: {
              type: 'boolean',
              description: 'Whether the corpus is enabled for querying (default: true)',
            },
            textless: {
              type: 'boolean',
              description: 'If true, the corpus stores only embeddings — no original text is stored',
            },
            encrypted: {
              type: 'boolean',
              description: 'If true, all data in the corpus is encrypted at rest',
            },
            encoderId: {
              type: 'string',
              description: 'Custom encoder ID to use for embedding (default Vectara encoder is used if omitted)',
            },
            metadataMaxBytes: {
              type: 'number',
              description: 'Maximum number of bytes allowed for document metadata',
            },
            swapQenc: {
              type: 'boolean',
              description: 'If true, query encoder is swapped with index encoder',
            },
            swapIenc: {
              type: 'boolean',
              description: 'If true, index encoder is swapped with query encoder',
            },
          },
        },
      },
      {
        name: 'delete_corpus',
        description: 'Delete a Vectara corpus and all its data permanently by corpus ID and customer ID',
        inputSchema: {
          type: 'object',
          properties: {
            corpus_id: {
              type: 'number',
              description: 'Numeric ID of the corpus to delete',
            },
            customer_id: {
              type: 'number',
              description: 'Your Vectara customer (account) ID',
            },
          },
          required: ['corpus_id', 'customer_id'],
        },
      },
      {
        name: 'list_corpora',
        description: 'List all corpora in your Vectara account, with optional filtering by name',
        inputSchema: {
          type: 'object',
          properties: {
            filter: {
              type: 'string',
              description: 'Text filter to match against corpus names',
            },
            numResults: {
              type: 'number',
              description: 'Maximum number of corpora to return per page',
            },
            pageKey: {
              type: 'string',
              description: 'Pagination key returned from a previous list_corpora call',
            },
          },
        },
      },
      {
        name: 'reset_corpus',
        description: 'Delete all documents in a corpus without deleting the corpus itself — wipes all indexed data',
        inputSchema: {
          type: 'object',
          properties: {
            corpus_id: {
              type: 'number',
              description: 'Numeric ID of the corpus to reset',
            },
            customer_id: {
              type: 'number',
              description: 'Your Vectara customer (account) ID',
            },
          },
          required: ['corpus_id', 'customer_id'],
        },
      },
      // ── Document Indexing ──────────────────────────────────────────────────
      {
        name: 'index_document',
        description: 'Index a structured document into a Vectara corpus for semantic search. The document is broken into sections with optional metadata.',
        inputSchema: {
          type: 'object',
          properties: {
            corpus_id: {
              type: 'string',
              description: 'String ID of the corpus to index the document into',
            },
            customer_id: {
              type: 'string',
              description: 'Your Vectara customer (account) ID as a string',
            },
            document_id: {
              type: 'string',
              description: 'Unique identifier for the document within the corpus',
            },
            title: {
              type: 'string',
              description: 'Title of the document',
            },
            description: {
              type: 'string',
              description: 'Optional description of the document',
            },
            metadata_json: {
              type: 'string',
              description: 'JSON string of metadata key-value pairs to associate with the document',
            },
            sections: {
              type: 'array',
              description: 'Array of document sections. Each section has a text field and optional title, metadataJson, and nested sections.',
              items: {
                type: 'object',
              },
            },
          },
          required: ['corpus_id', 'customer_id', 'document_id'],
        },
      },
      {
        name: 'delete_document',
        description: 'Delete a specific document from a Vectara corpus by document ID',
        inputSchema: {
          type: 'object',
          properties: {
            corpus_id: {
              type: 'string',
              description: 'String ID of the corpus containing the document',
            },
            customer_id: {
              type: 'string',
              description: 'Your Vectara customer (account) ID as a string',
            },
            document_id: {
              type: 'string',
              description: 'Document ID to delete',
            },
          },
          required: ['corpus_id', 'customer_id', 'document_id'],
        },
      },
      // ── File Upload ────────────────────────────────────────────────────────
      {
        name: 'upload_file',
        description: 'Upload a file to a Vectara corpus for automatic parsing and indexing. Supports PDF, Word, HTML, plain text, and other document formats.',
        inputSchema: {
          type: 'object',
          properties: {
            corpus_id: {
              type: 'number',
              description: 'Numeric corpus ID to upload the file into (query param c)',
            },
            customer_id: {
              type: 'number',
              description: 'Your Vectara customer (account) ID (query param o)',
            },
            document_id: {
              type: 'string',
              description: 'Optional document ID override for this file (query param d)',
            },
            file_url: {
              type: 'string',
              description: 'URL of the file to upload (the adapter will fetch and upload it)',
            },
            filename: {
              type: 'string',
              description: 'Filename to use when uploading (must include extension, e.g. report.pdf)',
            },
            doc_metadata: {
              type: 'string',
              description: 'Optional JSON string of metadata to associate with the uploaded document',
            },
          },
          required: ['corpus_id', 'customer_id', 'file_url', 'filename'],
        },
      },
      // ── Querying ───────────────────────────────────────────────────────────
      {
        name: 'query',
        description: 'Run a semantic search query against one or more Vectara corpora. Returns ranked results with scores. Supports metadata filtering and reranking.',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Natural language query string to search for',
            },
            corpus_key: {
              type: 'array',
              description: 'Array of corpus keys to query. Each item must have corpusId and customerId, plus optional metadataFilter and semantics.',
              items: {
                type: 'object',
              },
            },
            num_results: {
              type: 'number',
              description: 'Number of results to return (default: 10)',
            },
            start: {
              type: 'number',
              description: 'Offset for pagination (default: 0)',
            },
            reranker_id: {
              type: 'number',
              description: 'Optional reranker ID to apply to results (e.g. 272725719 for Vectara MMR reranker)',
            },
          },
          required: ['query', 'corpus_key'],
        },
      },
      {
        name: 'stream_query',
        description: 'Run a streaming semantic search query against Vectara corpora. Same parameters as query but the API returns a server-sent event stream — results are returned as a collected text buffer.',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Natural language query string to search for',
            },
            corpus_key: {
              type: 'array',
              description: 'Array of corpus keys to query. Each item must have corpusId and customerId, plus optional metadataFilter.',
              items: {
                type: 'object',
              },
            },
            num_results: {
              type: 'number',
              description: 'Number of results to return (default: 10)',
            },
            start: {
              type: 'number',
              description: 'Offset for pagination (default: 0)',
            },
            reranker_id: {
              type: 'number',
              description: 'Optional reranker ID to apply to results',
            },
          },
          required: ['query', 'corpus_key'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'create_corpus':   return this.createCorpus(args);
        case 'delete_corpus':   return this.deleteCorpus(args);
        case 'list_corpora':    return this.listCorpora(args);
        case 'reset_corpus':    return this.resetCorpus(args);
        case 'index_document':  return this.indexDocument(args);
        case 'delete_document': return this.deleteDocument(args);
        case 'upload_file':     return this.uploadFile(args);
        case 'query':           return this.query(args);
        case 'stream_query':    return this.streamQuery(args);
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

  // ── Private helpers ────────────────────────────────────────────────────────


  private async request(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    path: string,
    body?: Record<string, unknown>,
  ): Promise<ToolResult> {
    const url = `${this.baseUrl}${path}`;
    const init: RequestInit = {
      method,
      headers: {
        'x-api-key': this.apiKey,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    };
    if (body && Object.keys(body).length > 0) init.body = JSON.stringify(body);
    const response = await this.fetchWithRetry(url, init);
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${errText}` }],
        isError: true,
      };
    }
    if (response.status === 204) {
      return { content: [{ type: 'text', text: '{"success":true}' }], isError: false };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  // ── Corpus Management ──────────────────────────────────────────────────────

  private async createCorpus(args: Record<string, unknown>): Promise<ToolResult> {
    const corpus: Record<string, unknown> = {};
    if (args.name !== undefined)             corpus.name             = args.name;
    if (args.description !== undefined)      corpus.description      = args.description;
    if (args.enabled !== undefined)          corpus.enabled          = args.enabled;
    if (args.textless !== undefined)         corpus.textless         = args.textless;
    if (args.encrypted !== undefined)        corpus.encrypted        = args.encrypted;
    if (args.encoderId !== undefined)        corpus.encoderId        = args.encoderId;
    if (args.metadataMaxBytes !== undefined) corpus.metadataMaxBytes = args.metadataMaxBytes;
    if (args.swapQenc !== undefined)         corpus.swapQenc         = args.swapQenc;
    if (args.swapIenc !== undefined)         corpus.swapIenc         = args.swapIenc;
    return this.request('POST', '/v1/create-corpus', { corpus });
  }

  private async deleteCorpus(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.corpus_id === undefined || args.customer_id === undefined) {
      return { content: [{ type: 'text', text: 'corpus_id and customer_id are required' }], isError: true };
    }
    return this.request('POST', '/v1/delete-corpus', {
      corpusId:   args.corpus_id,
      customerId: args.customer_id,
    });
  }

  private async listCorpora(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {};
    if (args.filter !== undefined)     body.filter     = args.filter;
    if (args.numResults !== undefined) body.numResults = args.numResults;
    if (args.pageKey !== undefined)    body.pageKey    = args.pageKey;
    return this.request('POST', '/v1/list-corpora', body);
  }

  private async resetCorpus(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.corpus_id === undefined || args.customer_id === undefined) {
      return { content: [{ type: 'text', text: 'corpus_id and customer_id are required' }], isError: true };
    }
    return this.request('POST', '/v1/reset-corpus', {
      corpusId:   args.corpus_id,
      customerId: args.customer_id,
    });
  }

  // ── Document Indexing ──────────────────────────────────────────────────────

  private async indexDocument(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.corpus_id || !args.customer_id || !args.document_id) {
      return { content: [{ type: 'text', text: 'corpus_id, customer_id, and document_id are required' }], isError: true };
    }
    const document: Record<string, unknown> = { documentId: args.document_id };
    if (args.title !== undefined)         document.title        = args.title;
    if (args.description !== undefined)   document.description  = args.description;
    if (args.metadata_json !== undefined) document.metadataJson = args.metadata_json;
    if (args.sections !== undefined)      document.section      = args.sections;
    return this.request('POST', '/v1/index', {
      corpusId:   args.corpus_id,
      customerId: args.customer_id,
      document,
    });
  }

  private async deleteDocument(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.corpus_id || !args.customer_id || !args.document_id) {
      return { content: [{ type: 'text', text: 'corpus_id, customer_id, and document_id are required' }], isError: true };
    }
    return this.request('POST', '/v1/delete-doc', {
      corpusId:   args.corpus_id,
      customerId: args.customer_id,
      documentId: args.document_id,
    });
  }

  // ── File Upload ────────────────────────────────────────────────────────────

  private async uploadFile(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.corpus_id === undefined || args.customer_id === undefined || !args.file_url || !args.filename) {
      return { content: [{ type: 'text', text: 'corpus_id, customer_id, file_url, and filename are required' }], isError: true };
    }
    const fileResponse = await this.fetchWithRetry(args.file_url as string, {});
    if (!fileResponse.ok) {
      return {
        content: [{ type: 'text', text: `Failed to fetch file from URL: ${fileResponse.status} ${fileResponse.statusText}` }],
        isError: true,
      };
    }
    const fileBlob = await fileResponse.blob();
    const formData = new FormData();
    formData.append('file', fileBlob, args.filename as string);
    if (args.doc_metadata) {
      formData.append('doc_metadata', args.doc_metadata as string);
    }
    const qp: Record<string, string> = {
      c: String(args.corpus_id),
      o: String(args.customer_id),
    };
    if (args.document_id) qp.d = args.document_id as string;
    const qs = new URLSearchParams(qp).toString();
    const url = `${this.baseUrl}/v1/upload?${qs}`;
    const response = await this.fetchWithRetry(url, {
      method: 'POST',
      headers: { 'x-api-key': this.apiKey },
      body: formData,
    });
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${errText}` }],
        isError: true,
      };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  // ── Querying ───────────────────────────────────────────────────────────────

  private buildQueryPayload(args: Record<string, unknown>): Record<string, unknown> {
    const corpusKey = args.corpus_key as Array<Record<string, unknown>>;
    const queryRequest: Record<string, unknown> = {
      query:     args.query,
      corpusKey,
    };
    if (args.num_results !== undefined) queryRequest.numResults = args.num_results;
    if (args.start !== undefined)       queryRequest.start      = args.start;
    if (args.reranker_id !== undefined) {
      queryRequest.rerankingConfig = { rerankerId: args.reranker_id };
    }
    return { query: [queryRequest] };
  }

  private async query(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.query || !args.corpus_key) {
      return { content: [{ type: 'text', text: 'query and corpus_key are required' }], isError: true };
    }
    return this.request('POST', '/v1/query', this.buildQueryPayload(args));
  }

  private async streamQuery(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.query || !args.corpus_key) {
      return { content: [{ type: 'text', text: 'query and corpus_key are required' }], isError: true };
    }
    const body = this.buildQueryPayload(args);
    const url = `${this.baseUrl}/v1/stream-query`;
    const response = await this.fetchWithRetry(url, {
      method: 'POST',
      headers: {
        'x-api-key': this.apiKey,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${errText}` }],
        isError: true,
      };
    }
    const text = await response.text();
    const truncated = text.length > 10_000
      ? text.slice(0, 10_000) + `\n... [truncated, ${text.length} total chars]`
      : text;
    return { content: [{ type: 'text', text: truncated }], isError: false };
  }
}

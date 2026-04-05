/**
 * Cohere MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// cohere-ai/north-mcp-python-sdk is an authentication framework for building MCP servers
// using Cohere's North platform — it is NOT a Cohere API adapter covering Command/Embed/Rerank.
// cohere-ai/mcp-atlassian is an Atlassian connector, not a Cohere API server.
// No official Cohere MCP server covering core inference endpoints exists.
// Our adapter covers: 17 tools. Vendor MCP covers: 0 tools (no official MCP server).
// Recommendation: use-rest-api — no official MCP server found.
//
// NOTE: v1/classify and v1/connectors are marked DEPRECATED in Cohere docs as of 2026.
// They still function but are no longer recommended for new integrations.
// v2/audio/transcriptions exists in the API but is not implemented in this adapter.
//
// Base URL: https://api.cohere.com
// Auth: Bearer token — Authorization: Bearer <API_KEY>
// Docs: https://docs.cohere.com/reference/about
// Rate limits: Chat 500 req/min; Embed 2,000 req/min; Rerank 1,000 req/min (production keys)

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface CohereConfig {
  apiKey: string;
  baseUrl?: string;
}

export class CohereMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: CohereConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = (config.baseUrl ?? 'https://api.cohere.com').replace(/\/$/, '');
  }

  static catalog() {
    return {
      name: 'cohere',
      displayName: 'Cohere',
      version: '1.0.0',
      category: 'ai-ml' as const,
      keywords: ['cohere', 'command', 'embed', 'rerank', 'classify', 'llm', 'embeddings', 'rag', 'semantic-search', 'nlp', 'ai'],
      toolNames: [
        'chat', 'embed', 'rerank', 'classify',
        'list_models', 'get_model',
        'tokenize', 'detokenize',
        'list_embed_jobs', 'create_embed_job', 'get_embed_job', 'cancel_embed_job',
        'list_datasets', 'get_dataset', 'delete_dataset',
        'list_connectors', 'get_connector',
      ],
      description: 'Cohere LLM inference: chat generation, text embeddings, reranking, classification, tokenization, batch embed jobs, datasets, and connectors.',
      author: 'protectnil' as const,
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'chat',
        description: 'Generate a text response using a Cohere Command model with optional RAG documents, tool use, and multi-turn conversation history.',
        inputSchema: {
          type: 'object',
          properties: {
            model: {
              type: 'string',
              description: 'Cohere model ID (e.g. command-r-plus-08-2024, command-r-08-2024, command-a-03-2025)',
            },
            messages: {
              type: 'array',
              description: 'Array of message objects with role (user|assistant|system|tool) and content fields',
              items: { type: 'object' },
            },
            documents: {
              type: 'array',
              description: 'Optional array of document objects for RAG grounding. Each document has id and data or text fields.',
              items: { type: 'object' },
            },
            temperature: {
              type: 'number',
              description: 'Sampling temperature 0–1 (default: 0.3). Higher = more creative.',
            },
            max_tokens: {
              type: 'number',
              description: 'Maximum number of tokens to generate in the response',
            },
            p: {
              type: 'number',
              description: 'Top-p nucleus sampling value (0–0.99). Controls diversity.',
            },
            k: {
              type: 'number',
              description: 'Top-k sampling value (0–500). Limits token candidate pool.',
            },
            stop_sequences: {
              type: 'array',
              description: 'Array of strings that stop generation when produced',
              items: { type: 'string' },
            },
            seed: {
              type: 'number',
              description: 'Random seed for deterministic sampling',
            },
            frequency_penalty: {
              type: 'number',
              description: 'Penalizes repeated tokens (0–1). Higher reduces repetition.',
            },
            presence_penalty: {
              type: 'number',
              description: 'Penalizes tokens already in the output (0–1).',
            },
          },
          required: ['model', 'messages'],
        },
      },
      {
        name: 'embed',
        description: 'Generate vector embeddings for texts or images using a Cohere Embed model. Supports float, int8, binary quantization types.',
        inputSchema: {
          type: 'object',
          properties: {
            model: {
              type: 'string',
              description: 'Embed model ID (e.g. embed-v4.0, embed-english-v3.0, embed-multilingual-v3.0)',
            },
            texts: {
              type: 'array',
              description: 'Array of strings to embed (provide either texts or images, not both)',
              items: { type: 'string' },
            },
            input_type: {
              type: 'string',
              description: 'Prepend type for retrieval optimization: search_document, search_query, classification, or clustering',
            },
            embedding_types: {
              type: 'array',
              description: 'Quantization formats to return: float, int8, uint8, binary, ubinary (default: [float])',
              items: { type: 'string' },
            },
            truncate: {
              type: 'string',
              description: 'Truncation strategy when input exceeds model max: NONE, START, or END (default: END)',
            },
          },
          required: ['model', 'texts'],
        },
      },
      {
        name: 'rerank',
        description: 'Rerank a list of documents by relevance to a query using a Cohere Rerank model. Returns scored and ordered results.',
        inputSchema: {
          type: 'object',
          properties: {
            model: {
              type: 'string',
              description: 'Rerank model ID (e.g. rerank-v3.5, rerank-english-v3.0, rerank-multilingual-v3.0)',
            },
            query: {
              type: 'string',
              description: 'The search query to rank documents against',
            },
            documents: {
              type: 'array',
              description: 'Documents to rank — each item is a string or an object with a text field',
              items: {},
            },
            top_n: {
              type: 'number',
              description: 'Number of top results to return (default: returns all documents ranked)',
            },
            return_documents: {
              type: 'boolean',
              description: 'Whether to include original document text in the response (default: false)',
            },
            max_tokens_per_doc: {
              type: 'number',
              description: 'Maximum number of tokens per document before truncation (default: 4096). Use for long-document reranking.',
            },
          },
          required: ['model', 'query', 'documents'],
        },
      },
      {
        name: 'classify',
        description: 'DEPRECATED by Cohere. Classify texts into categories using few-shot examples with a Cohere model. Returns predicted label and confidence score per input.',
        inputSchema: {
          type: 'object',
          properties: {
            inputs: {
              type: 'array',
              description: 'Array of strings to classify',
              items: { type: 'string' },
            },
            examples: {
              type: 'array',
              description: 'Labeled training examples — each object has text and label fields',
              items: { type: 'object' },
            },
            model: {
              type: 'string',
              description: 'Model to use for classification (uses Cohere default if omitted)',
            },
          },
          required: ['inputs', 'examples'],
        },
      },
      {
        name: 'list_models',
        description: 'List Cohere models available to the API key, with optional filtering by endpoint compatibility and pagination.',
        inputSchema: {
          type: 'object',
          properties: {
            endpoint: {
              type: 'string',
              description: 'Filter to models for a specific endpoint: chat, embed, rerank, classify, summarize, generate',
            },
            page_size: {
              type: 'number',
              description: 'Maximum models to return per page (default: 20, max: 1000)',
            },
            page_token: {
              type: 'string',
              description: 'Pagination token from a previous list_models response',
            },
          },
        },
      },
      {
        name: 'get_model',
        description: 'Get details for a specific Cohere model by ID, including capabilities, max tokens, and endpoints supported.',
        inputSchema: {
          type: 'object',
          properties: {
            model_id: {
              type: 'string',
              description: 'The model identifier (e.g. command-r-plus-08-2024)',
            },
          },
          required: ['model_id'],
        },
      },
      {
        name: 'tokenize',
        description: 'Tokenize text using a Cohere model tokenizer and return token IDs and corresponding token strings.',
        inputSchema: {
          type: 'object',
          properties: {
            text: {
              type: 'string',
              description: 'Text to tokenize',
            },
            model: {
              type: 'string',
              description: 'Model whose tokenizer to use (e.g. command-r-plus-08-2024)',
            },
          },
          required: ['text', 'model'],
        },
      },
      {
        name: 'detokenize',
        description: 'Convert a list of token IDs back into the original text string using a Cohere model tokenizer.',
        inputSchema: {
          type: 'object',
          properties: {
            tokens: {
              type: 'array',
              description: 'Array of integer token IDs to convert back to text',
              items: { type: 'number' },
            },
            model: {
              type: 'string',
              description: 'Model whose tokenizer to use (e.g. command-r-plus-08-2024)',
            },
          },
          required: ['tokens', 'model'],
        },
      },
      {
        name: 'list_embed_jobs',
        description: 'List all asynchronous batch embed jobs for the current API key, including status and dataset references.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'create_embed_job',
        description: 'Launch an async batch embed job against a Cohere Dataset of type embed-input. Use for large-scale offline embedding.',
        inputSchema: {
          type: 'object',
          properties: {
            model: {
              type: 'string',
              description: 'Embed model ID to use for the batch job (e.g. embed-english-v3.0)',
            },
            dataset_id: {
              type: 'string',
              description: 'ID of the Dataset (type: embed-input) to embed',
            },
            input_type: {
              type: 'string',
              description: 'Prepend type: search_document, search_query, classification, or clustering',
            },
            embedding_types: {
              type: 'array',
              description: 'Quantization formats: float, int8, uint8, binary, ubinary (default: [float])',
              items: { type: 'string' },
            },
            name: {
              type: 'string',
              description: 'Optional display name for the embed job',
            },
          },
          required: ['model', 'dataset_id', 'input_type'],
        },
      },
      {
        name: 'get_embed_job',
        description: 'Get status and details of a specific async batch embed job by its job ID.',
        inputSchema: {
          type: 'object',
          properties: {
            job_id: {
              type: 'string',
              description: 'The embed job ID returned from create_embed_job',
            },
          },
          required: ['job_id'],
        },
      },
      {
        name: 'cancel_embed_job',
        description: 'Cancel a running async embed job. Stops processing and releases resources.',
        inputSchema: {
          type: 'object',
          properties: {
            job_id: {
              type: 'string',
              description: 'The embed job ID to cancel',
            },
          },
          required: ['job_id'],
        },
      },
      {
        name: 'list_datasets',
        description: 'List all datasets uploaded to the Cohere account, with optional filtering by dataset type and name.',
        inputSchema: {
          type: 'object',
          properties: {
            dataset_type: {
              type: 'string',
              description: 'Filter by dataset type: embed-input, reranker-finetune-input, single-label-classification-finetune-input, etc.',
            },
            before: {
              type: 'string',
              description: 'Return datasets created before this ISO 8601 timestamp',
            },
            after: {
              type: 'string',
              description: 'Return datasets created after this ISO 8601 timestamp',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of datasets to return (default: 10)',
            },
          },
        },
      },
      {
        name: 'get_dataset',
        description: 'Get metadata and status for a specific Cohere dataset by ID.',
        inputSchema: {
          type: 'object',
          properties: {
            dataset_id: {
              type: 'string',
              description: 'The dataset ID',
            },
          },
          required: ['dataset_id'],
        },
      },
      {
        name: 'delete_dataset',
        description: 'Permanently delete a dataset from the Cohere account by ID.',
        inputSchema: {
          type: 'object',
          properties: {
            dataset_id: {
              type: 'string',
              description: 'The dataset ID to delete',
            },
          },
          required: ['dataset_id'],
        },
      },
      {
        name: 'list_connectors',
        description: 'DEPRECATED by Cohere. List all connectors configured in the Cohere account for grounding chat responses with external data sources.',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of connectors to return (default: 20)',
            },
            offset: {
              type: 'number',
              description: 'Number of connectors to skip for pagination (default: 0)',
            },
          },
        },
      },
      {
        name: 'get_connector',
        description: 'DEPRECATED by Cohere. Get full configuration details for a specific Cohere connector by ID.',
        inputSchema: {
          type: 'object',
          properties: {
            connector_id: {
              type: 'string',
              description: 'The connector ID',
            },
          },
          required: ['connector_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'chat':
          return this.chat(args);
        case 'embed':
          return this.embed(args);
        case 'rerank':
          return this.rerank(args);
        case 'classify':
          return this.classify(args);
        case 'list_models':
          return this.listModels(args);
        case 'get_model':
          return this.getModel(args);
        case 'tokenize':
          return this.tokenize(args);
        case 'detokenize':
          return this.detokenize(args);
        case 'list_embed_jobs':
          return this.listEmbedJobs();
        case 'create_embed_job':
          return this.createEmbedJob(args);
        case 'get_embed_job':
          return this.getEmbedJob(args);
        case 'cancel_embed_job':
          return this.cancelEmbedJob(args);
        case 'list_datasets':
          return this.listDatasets(args);
        case 'get_dataset':
          return this.getDataset(args);
        case 'delete_dataset':
          return this.deleteDataset(args);
        case 'list_connectors':
          return this.listConnectors(args);
        case 'get_connector':
          return this.getConnector(args);
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

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private get headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  private async fetchJson(url: string, init: RequestInit): Promise<ToolResult> {
    const response = await this.fetchWithRetry(url, init);
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return {
        content: [{ type: 'text', text: `API error ${response.status}: ${errText}` }],
        isError: true,
      };
    }
    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new Error(`Cohere returned non-JSON response (HTTP ${response.status})`);
    }
    return {
      content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }],
      isError: false,
    };
  }

  private async chat(args: Record<string, unknown>): Promise<ToolResult> {
    const model = args.model as string;
    const messages = args.messages as unknown[];
    if (!model || !messages) {
      return { content: [{ type: 'text', text: 'model and messages are required' }], isError: true };
    }
    const body: Record<string, unknown> = { model, messages };
    if (args.documents) body.documents = args.documents;
    if (typeof args.temperature === 'number') body.temperature = args.temperature;
    if (args.max_tokens) body.max_tokens = args.max_tokens;
    if (typeof args.p === 'number') body.p = args.p;
    if (typeof args.k === 'number') body.k = args.k;
    if (args.stop_sequences) body.stop_sequences = args.stop_sequences;
    if (typeof args.seed === 'number') body.seed = args.seed;
    if (typeof args.frequency_penalty === 'number') body.frequency_penalty = args.frequency_penalty;
    if (typeof args.presence_penalty === 'number') body.presence_penalty = args.presence_penalty;
    return this.fetchJson(`${this.baseUrl}/v2/chat`, { method: 'POST', headers: this.headers, body: JSON.stringify(body) });
  }

  private async embed(args: Record<string, unknown>): Promise<ToolResult> {
    const model = args.model as string;
    const texts = args.texts as string[];
    if (!model || !texts) {
      return { content: [{ type: 'text', text: 'model and texts are required' }], isError: true };
    }
    const body: Record<string, unknown> = { model, texts };
    if (args.input_type) body.input_type = args.input_type;
    if (args.embedding_types) body.embedding_types = args.embedding_types;
    if (args.truncate) body.truncate = args.truncate;
    return this.fetchJson(`${this.baseUrl}/v2/embed`, { method: 'POST', headers: this.headers, body: JSON.stringify(body) });
  }

  private async rerank(args: Record<string, unknown>): Promise<ToolResult> {
    const model = args.model as string;
    const query = args.query as string;
    const documents = args.documents as unknown[];
    if (!model || !query || !documents) {
      return { content: [{ type: 'text', text: 'model, query, and documents are required' }], isError: true };
    }
    const body: Record<string, unknown> = { model, query, documents };
    if (args.top_n) body.top_n = args.top_n;
    if (typeof args.return_documents === 'boolean') body.return_documents = args.return_documents;
    if (args.max_tokens_per_doc) body.max_tokens_per_doc = args.max_tokens_per_doc;
    return this.fetchJson(`${this.baseUrl}/v2/rerank`, { method: 'POST', headers: this.headers, body: JSON.stringify(body) });
  }

  private async classify(args: Record<string, unknown>): Promise<ToolResult> {
    const inputs = args.inputs as string[];
    const examples = args.examples as unknown[];
    if (!inputs || !examples) {
      return { content: [{ type: 'text', text: 'inputs and examples are required' }], isError: true };
    }
    const body: Record<string, unknown> = { inputs, examples };
    if (args.model) body.model = args.model;
    // v1/classify is deprecated by Cohere; no v2/classify endpoint exists. Kept for backward compatibility.
    return this.fetchJson(`${this.baseUrl}/v1/classify`, { method: 'POST', headers: this.headers, body: JSON.stringify(body) });
  }

  private async listModels(args: Record<string, unknown>): Promise<ToolResult> {
    const params: string[] = [];
    if (args.endpoint) params.push(`endpoint=${encodeURIComponent(args.endpoint as string)}`);
    if (args.page_size) params.push(`page_size=${encodeURIComponent(args.page_size as string)}`);
    if (args.page_token) params.push(`page_token=${encodeURIComponent(args.page_token as string)}`);
    const qs = params.length > 0 ? `?${params.join('&')}` : '';
    return this.fetchJson(`${this.baseUrl}/v1/models${qs}`, { method: 'GET', headers: this.headers });
  }

  private async getModel(args: Record<string, unknown>): Promise<ToolResult> {
    const modelId = args.model_id as string;
    if (!modelId) {
      return { content: [{ type: 'text', text: 'model_id is required' }], isError: true };
    }
    return this.fetchJson(`${this.baseUrl}/v1/models/${encodeURIComponent(modelId)}`, { method: 'GET', headers: this.headers });
  }

  private async tokenize(args: Record<string, unknown>): Promise<ToolResult> {
    const text = args.text as string;
    const model = args.model as string;
    if (!text || !model) {
      return { content: [{ type: 'text', text: 'text and model are required' }], isError: true };
    }
    return this.fetchJson(`${this.baseUrl}/v1/tokenize`, { method: 'POST', headers: this.headers, body: JSON.stringify({ text, model }) });
  }

  private async detokenize(args: Record<string, unknown>): Promise<ToolResult> {
    const tokens = args.tokens as number[];
    const model = args.model as string;
    if (!tokens || !model) {
      return { content: [{ type: 'text', text: 'tokens and model are required' }], isError: true };
    }
    return this.fetchJson(`${this.baseUrl}/v1/detokenize`, { method: 'POST', headers: this.headers, body: JSON.stringify({ tokens, model }) });
  }

  private async listEmbedJobs(): Promise<ToolResult> {
    return this.fetchJson(`${this.baseUrl}/v1/embed-jobs`, { method: 'GET', headers: this.headers });
  }

  private async createEmbedJob(args: Record<string, unknown>): Promise<ToolResult> {
    const model = args.model as string;
    const datasetId = args.dataset_id as string;
    const inputType = args.input_type as string;
    if (!model || !datasetId || !inputType) {
      return { content: [{ type: 'text', text: 'model, dataset_id, and input_type are required' }], isError: true };
    }
    const body: Record<string, unknown> = { model, dataset_id: datasetId, input_type: inputType };
    if (args.embedding_types) body.embedding_types = args.embedding_types;
    if (args.name) body.name = args.name;
    return this.fetchJson(`${this.baseUrl}/v1/embed-jobs`, { method: 'POST', headers: this.headers, body: JSON.stringify(body) });
  }

  private async getEmbedJob(args: Record<string, unknown>): Promise<ToolResult> {
    const jobId = args.job_id as string;
    if (!jobId) {
      return { content: [{ type: 'text', text: 'job_id is required' }], isError: true };
    }
    return this.fetchJson(`${this.baseUrl}/v1/embed-jobs/${encodeURIComponent(jobId)}`, { method: 'GET', headers: this.headers });
  }

  private async cancelEmbedJob(args: Record<string, unknown>): Promise<ToolResult> {
    const jobId = args.job_id as string;
    if (!jobId) {
      return { content: [{ type: 'text', text: 'job_id is required' }], isError: true };
    }
    return this.fetchJson(`${this.baseUrl}/v1/embed-jobs/${encodeURIComponent(jobId)}/cancel`, { method: 'POST', headers: this.headers, body: '{}' });
  }

  private async listDatasets(args: Record<string, unknown>): Promise<ToolResult> {
    const params: string[] = [];
    if (args.dataset_type) params.push(`datasetType=${encodeURIComponent(args.dataset_type as string)}`);
    if (args.before) params.push(`before=${encodeURIComponent(args.before as string)}`);
    if (args.after) params.push(`after=${encodeURIComponent(args.after as string)}`);
    if (args.limit) params.push(`limit=${encodeURIComponent(args.limit as string)}`);
    const qs = params.length > 0 ? `?${params.join('&')}` : '';
    return this.fetchJson(`${this.baseUrl}/v1/datasets${qs}`, { method: 'GET', headers: this.headers });
  }

  private async getDataset(args: Record<string, unknown>): Promise<ToolResult> {
    const datasetId = args.dataset_id as string;
    if (!datasetId) {
      return { content: [{ type: 'text', text: 'dataset_id is required' }], isError: true };
    }
    return this.fetchJson(`${this.baseUrl}/v1/datasets/${encodeURIComponent(datasetId)}`, { method: 'GET', headers: this.headers });
  }

  private async deleteDataset(args: Record<string, unknown>): Promise<ToolResult> {
    const datasetId = args.dataset_id as string;
    if (!datasetId) {
      return { content: [{ type: 'text', text: 'dataset_id is required' }], isError: true };
    }
    const response = await this.fetchWithRetry(`${this.baseUrl}/v1/datasets/${encodeURIComponent(datasetId)}`, {
      method: 'DELETE',
      headers: this.headers,
    });
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `API error ${response.status}: ${errText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: JSON.stringify({ deleted: true, dataset_id: datasetId }) }], isError: false };
  }

  private async listConnectors(args: Record<string, unknown>): Promise<ToolResult> {
    const limit = (args.limit as number) ?? 20;
    const offset = (args.offset as number) ?? 0;
    return this.fetchJson(
      `${this.baseUrl}/v1/connectors?limit=${limit}&offset=${offset}`,
      { method: 'GET', headers: this.headers },
    );
  }

  private async getConnector(args: Record<string, unknown>): Promise<ToolResult> {
    const connectorId = args.connector_id as string;
    if (!connectorId) {
      return { content: [{ type: 'text', text: 'connector_id is required' }], isError: true };
    }
    return this.fetchJson(`${this.baseUrl}/v1/connectors/${encodeURIComponent(connectorId)}`, { method: 'GET', headers: this.headers });
  }
}

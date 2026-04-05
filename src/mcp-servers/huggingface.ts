/**
 * Hugging Face MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://hf.co/mcp (remote, streamable-HTTP + SSE + stdio) — transport: streamable-HTTP (production)
//   GitHub: https://github.com/huggingface/hf-mcp-server — actively maintained (last commit 2026-03)
// Vendor MCP built-in tools (6): Spaces Semantic Search, Papers Semantic Search, Model Search, Dataset Search,
//   Documentation Semantic Search, Run and Manage Jobs — these are semantic/search-oriented, not REST CRUD.
// Our adapter covers: 14 tools (Hub REST CRUD: list/get/search models/datasets/spaces, user/org, inference).
// Recommendation: use-both — vendor MCP has Papers search and Gradio Space federation not in our REST adapter;
//   our REST adapter has direct inference execution (text generation, classification, embeddings, summarization),
//   user profile reads, and org model listing not exposed by the vendor MCP built-in tools.
//
// Base URL: https://huggingface.co/api  (Hub API)
//           https://router.huggingface.co  (Inference Providers router — replaces deprecated api-inference.huggingface.co)
// Auth: Authorization: Bearer {api_token} (User Access Token with read or Inference permissions)
// Docs: https://huggingface.co/docs/hub/api
// Rate limits: Free tier — rate limited; PRO account unlocks higher limits. Exact limits not published.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface HuggingFaceConfig {
  apiKey: string;
  baseUrl?: string;
  inferenceBaseUrl?: string;
}

export class HuggingFaceMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly inferenceBaseUrl: string;

  constructor(config: HuggingFaceConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? 'https://huggingface.co/api';
    this.inferenceBaseUrl = config.inferenceBaseUrl ?? 'https://router.huggingface.co';
  }

  static catalog() {
    return {
      name: 'huggingface',
      displayName: 'Hugging Face',
      version: '1.0.0',
      category: 'ai-ml' as const,
      keywords: ['huggingface', 'hf', 'model', 'dataset', 'space', 'inference', 'transformer', 'ml', 'ai', 'nlp', 'embedding'],
      toolNames: [
        'list_models', 'get_model', 'search_models',
        'list_datasets', 'get_dataset',
        'list_spaces', 'get_space',
        'get_user', 'list_user_models', 'list_org_models',
        'run_inference_text_generation', 'run_inference_text_classification',
        'run_inference_embeddings', 'run_inference_summarization',
      ],
      description: 'Hugging Face Hub: search and retrieve models, datasets, and spaces. Run serverless inference for text generation, classification, embeddings, and summarization.',
      author: 'protectnil' as const,
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_models',
        description: 'List models on Hugging Face Hub with optional filters for task, library, language, author, and sort order',
        inputSchema: {
          type: 'object',
          properties: {
            search: { type: 'string', description: 'Full-text search query to filter models by name or description' },
            author: { type: 'string', description: 'Filter by author or organization username (e.g. google, meta-llama)' },
            filter: { type: 'string', description: 'Filter by pipeline tag / task type (e.g. text-generation, text-classification, image-classification)' },
            language: { type: 'string', description: 'Filter by language code (e.g. en, fr, zh)' },
            library: { type: 'string', description: 'Filter by ML framework library (e.g. transformers, diffusers, timm)' },
            sort: { type: 'string', description: 'Sort field: downloads, likes, lastModified (default: lastModified)' },
            limit: { type: 'number', description: 'Number of results to return (default: 20, max: 100)' },
          },
        },
      },
      {
        name: 'get_model',
        description: 'Retrieve full metadata for a specific Hugging Face model including pipeline tag, downloads, and card data',
        inputSchema: {
          type: 'object',
          properties: {
            model_id: { type: 'string', description: 'Model ID in owner/model-name format (e.g. google/flan-t5-base, meta-llama/Llama-3-8B)' },
          },
          required: ['model_id'],
        },
      },
      {
        name: 'search_models',
        description: 'Search Hugging Face Hub models by full-text query with filters for task, language, and minimum download count',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Full-text search query (model name, description, or tags)' },
            task: { type: 'string', description: 'Filter by task / pipeline tag (e.g. text-generation, summarization, question-answering)' },
            language: { type: 'string', description: 'Filter by language code (e.g. en, de)' },
            limit: { type: 'number', description: 'Number of results to return (default: 20, max: 100)' },
          },
          required: ['query'],
        },
      },
      {
        name: 'list_datasets',
        description: 'List datasets on Hugging Face Hub with optional filters for task, language, author, and search query',
        inputSchema: {
          type: 'object',
          properties: {
            search: { type: 'string', description: 'Full-text search query to filter datasets' },
            author: { type: 'string', description: 'Filter by author or organization username' },
            filter: { type: 'string', description: 'Filter by task category tag (e.g. question-answering, text-classification)' },
            language: { type: 'string', description: 'Filter by language code (e.g. en)' },
            sort: { type: 'string', description: 'Sort field: downloads, likes, lastModified (default: lastModified)' },
            limit: { type: 'number', description: 'Number of results to return (default: 20, max: 100)' },
          },
        },
      },
      {
        name: 'get_dataset',
        description: 'Retrieve full metadata for a specific Hugging Face dataset including task categories, languages, and card data',
        inputSchema: {
          type: 'object',
          properties: {
            dataset_id: { type: 'string', description: 'Dataset ID in owner/dataset-name format (e.g. squad, HuggingFaceH4/ultrachat_200k)' },
          },
          required: ['dataset_id'],
        },
      },
      {
        name: 'list_spaces',
        description: 'List Spaces (demo applications) on Hugging Face Hub with optional filters for author, SDK, and search query',
        inputSchema: {
          type: 'object',
          properties: {
            search: { type: 'string', description: 'Full-text search query to filter spaces' },
            author: { type: 'string', description: 'Filter by author or organization username' },
            sdk: { type: 'string', description: 'Filter by Space SDK: gradio, streamlit, static, docker' },
            sort: { type: 'string', description: 'Sort field: likes, lastModified (default: lastModified)' },
            limit: { type: 'number', description: 'Number of results to return (default: 20, max: 100)' },
          },
        },
      },
      {
        name: 'get_space',
        description: 'Retrieve full metadata for a specific Hugging Face Space including SDK, runtime, and hardware info',
        inputSchema: {
          type: 'object',
          properties: {
            space_id: { type: 'string', description: 'Space ID in owner/space-name format (e.g. stabilityai/stable-diffusion)' },
          },
          required: ['space_id'],
        },
      },
      {
        name: 'get_user',
        description: 'Retrieve public profile information for a Hugging Face user or organization',
        inputSchema: {
          type: 'object',
          properties: {
            username: { type: 'string', description: 'Hugging Face username or organization name' },
          },
          required: ['username'],
        },
      },
      {
        name: 'list_user_models',
        description: 'List all models owned by a specific Hugging Face user or organization',
        inputSchema: {
          type: 'object',
          properties: {
            username: { type: 'string', description: 'Hugging Face username or organization name' },
            limit: { type: 'number', description: 'Number of models to return (default: 30, max: 100)' },
          },
          required: ['username'],
        },
      },
      {
        name: 'list_org_models',
        description: 'List all models owned by a specific Hugging Face organization with optional task filter',
        inputSchema: {
          type: 'object',
          properties: {
            org: { type: 'string', description: 'Organization name on Hugging Face (e.g. google, mistralai)' },
            filter: { type: 'string', description: 'Filter by pipeline tag / task (e.g. text-generation)' },
            limit: { type: 'number', description: 'Number of models to return (default: 30, max: 100)' },
          },
          required: ['org'],
        },
      },
      {
        name: 'run_inference_text_generation',
        description: 'Run serverless text generation inference on any supported model using the Hugging Face Inference API',
        inputSchema: {
          type: 'object',
          properties: {
            model_id: { type: 'string', description: 'Model ID to run inference on (e.g. mistralai/Mistral-7B-Instruct-v0.3)' },
            inputs: { type: 'string', description: 'Prompt text to generate from' },
            max_new_tokens: { type: 'number', description: 'Maximum number of tokens to generate (default: 200)' },
            temperature: { type: 'number', description: 'Sampling temperature 0.0–2.0 (default: 1.0, lower = more deterministic)' },
            provider: { type: 'string', description: 'Inference provider to route through (e.g. together-ai, fireworks-ai; default: auto)' },
          },
          required: ['model_id', 'inputs'],
        },
      },
      {
        name: 'run_inference_text_classification',
        description: 'Run serverless text classification inference (sentiment analysis, topic detection) on a supported model',
        inputSchema: {
          type: 'object',
          properties: {
            model_id: { type: 'string', description: 'Text classification model ID (e.g. distilbert/distilbert-base-uncased-finetuned-sst-2-english)' },
            inputs: { type: 'string', description: 'Text to classify' },
          },
          required: ['model_id', 'inputs'],
        },
      },
      {
        name: 'run_inference_embeddings',
        description: 'Generate vector embeddings for text using a sentence-transformers or feature-extraction model',
        inputSchema: {
          type: 'object',
          properties: {
            model_id: { type: 'string', description: 'Feature extraction / embedding model ID (e.g. sentence-transformers/all-MiniLM-L6-v2)' },
            inputs: { type: 'string', description: 'Text to embed (single string or JSON-serialized array of strings for batch)' },
          },
          required: ['model_id', 'inputs'],
        },
      },
      {
        name: 'run_inference_summarization',
        description: 'Run serverless text summarization inference to condense long documents into shorter summaries',
        inputSchema: {
          type: 'object',
          properties: {
            model_id: { type: 'string', description: 'Summarization model ID (e.g. facebook/bart-large-cnn, google/pegasus-xsum)' },
            inputs: { type: 'string', description: 'Text to summarize' },
            max_length: { type: 'number', description: 'Maximum length of the generated summary in tokens (default: 130)' },
            min_length: { type: 'number', description: 'Minimum length of the generated summary in tokens (default: 30)' },
          },
          required: ['model_id', 'inputs'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_models':
          return await this.listModels(args);
        case 'get_model':
          return await this.getModel(args);
        case 'search_models':
          return await this.searchModels(args);
        case 'list_datasets':
          return await this.listDatasets(args);
        case 'get_dataset':
          return await this.getDataset(args);
        case 'list_spaces':
          return await this.listSpaces(args);
        case 'get_space':
          return await this.getSpace(args);
        case 'get_user':
          return await this.getUser(args);
        case 'list_user_models':
          return await this.listUserModels(args);
        case 'list_org_models':
          return await this.listOrgModels(args);
        case 'run_inference_text_generation':
          return await this.runInferenceTextGeneration(args);
        case 'run_inference_text_classification':
          return await this.runInferenceTextClassification(args);
        case 'run_inference_embeddings':
          return await this.runInferenceEmbeddings(args);
        case 'run_inference_summarization':
          return await this.runInferenceSummarization(args);
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

  // ── Private helpers ──────────────────────────────────────────────────────────

  private get hubHeaders(): Record<string, string> {
    return { Authorization: `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' };
  }

  private async hubGet(path: string, params?: URLSearchParams): Promise<ToolResult> {
    const url = `${this.baseUrl}${path}${params && params.toString() ? `?${params}` : ''}`;
    const response = await this.fetchWithRetry(url, { headers: this.hubHeaders });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error ${response.status}: ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listModels(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.search) params.set('search', String(args.search));
    if (args.author) params.set('author', String(args.author));
    if (args.filter) params.set('filter', String(args.filter));
    if (args.language) params.set('language', String(args.language));
    if (args.library) params.set('library', String(args.library));
    if (args.sort) params.set('sort', String(args.sort));
    params.set('limit', String((args.limit as number) ?? 20));
    return this.hubGet('/models', params);
  }

  private async getModel(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.model_id as string;
    if (!id) return { content: [{ type: 'text', text: 'model_id is required' }], isError: true };
    return this.hubGet(`/models/${encodeURIComponent(id)}`);
  }

  private async searchModels(args: Record<string, unknown>): Promise<ToolResult> {
    const query = args.query as string;
    if (!query) return { content: [{ type: 'text', text: 'query is required' }], isError: true };
    const params = new URLSearchParams({ search: query });
    if (args.task) params.set('filter', String(args.task));
    if (args.language) params.set('language', String(args.language));
    params.set('limit', String((args.limit as number) ?? 20));
    return this.hubGet('/models', params);
  }

  private async listDatasets(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.search) params.set('search', String(args.search));
    if (args.author) params.set('author', String(args.author));
    if (args.filter) params.set('filter', String(args.filter));
    if (args.language) params.set('language', String(args.language));
    if (args.sort) params.set('sort', String(args.sort));
    params.set('limit', String((args.limit as number) ?? 20));
    return this.hubGet('/datasets', params);
  }

  private async getDataset(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.dataset_id as string;
    if (!id) return { content: [{ type: 'text', text: 'dataset_id is required' }], isError: true };
    return this.hubGet(`/datasets/${encodeURIComponent(id)}`);
  }

  private async listSpaces(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.search) params.set('search', String(args.search));
    if (args.author) params.set('author', String(args.author));
    if (args.sdk) params.set('sdk', String(args.sdk));
    if (args.sort) params.set('sort', String(args.sort));
    params.set('limit', String((args.limit as number) ?? 20));
    return this.hubGet('/spaces', params);
  }

  private async getSpace(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.space_id as string;
    if (!id) return { content: [{ type: 'text', text: 'space_id is required' }], isError: true };
    return this.hubGet(`/spaces/${encodeURIComponent(id)}`);
  }

  private async getUser(args: Record<string, unknown>): Promise<ToolResult> {
    const username = args.username as string;
    if (!username) return { content: [{ type: 'text', text: 'username is required' }], isError: true };
    return this.hubGet(`/users/${encodeURIComponent(username)}`);
  }

  private async listUserModels(args: Record<string, unknown>): Promise<ToolResult> {
    const username = args.username as string;
    if (!username) return { content: [{ type: 'text', text: 'username is required' }], isError: true };
    const params = new URLSearchParams({
      author: username,
      limit: String((args.limit as number) ?? 30),
    });
    return this.hubGet('/models', params);
  }

  private async listOrgModels(args: Record<string, unknown>): Promise<ToolResult> {
    const org = args.org as string;
    if (!org) return { content: [{ type: 'text', text: 'org is required' }], isError: true };
    const params = new URLSearchParams({
      author: org,
      limit: String((args.limit as number) ?? 30),
    });
    if (args.filter) params.set('filter', String(args.filter));
    return this.hubGet('/models', params);
  }

  private async runInferenceTextGeneration(args: Record<string, unknown>): Promise<ToolResult> {
    const modelId = args.model_id as string;
    const inputs = args.inputs as string;
    if (!modelId || !inputs) {
      return { content: [{ type: 'text', text: 'model_id and inputs are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      inputs,
      parameters: {
        max_new_tokens: (args.max_new_tokens as number) ?? 200,
        temperature: (args.temperature as number) ?? 1.0,
      },
    };
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };
    if (args.provider) headers['X-HF-Provider'] = String(args.provider);
    const response = await this.fetchWithRetry(`${this.inferenceBaseUrl}/models/${encodeURIComponent(modelId)}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Inference error ${response.status}: ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async runInferenceTextClassification(args: Record<string, unknown>): Promise<ToolResult> {
    const modelId = args.model_id as string;
    const inputs = args.inputs as string;
    if (!modelId || !inputs) {
      return { content: [{ type: 'text', text: 'model_id and inputs are required' }], isError: true };
    }
    const response = await this.fetchWithRetry(`${this.inferenceBaseUrl}/models/${encodeURIComponent(modelId)}`, {
      method: 'POST',
      headers: this.hubHeaders,
      body: JSON.stringify({ inputs }),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Inference error ${response.status}: ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async runInferenceEmbeddings(args: Record<string, unknown>): Promise<ToolResult> {
    const modelId = args.model_id as string;
    const inputs = args.inputs as string;
    if (!modelId || !inputs) {
      return { content: [{ type: 'text', text: 'model_id and inputs are required' }], isError: true };
    }
    const response = await this.fetchWithRetry(`${this.inferenceBaseUrl}/models/${encodeURIComponent(modelId)}`, {
      method: 'POST',
      headers: this.hubHeaders,
      body: JSON.stringify({ inputs }),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Inference error ${response.status}: ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async runInferenceSummarization(args: Record<string, unknown>): Promise<ToolResult> {
    const modelId = args.model_id as string;
    const inputs = args.inputs as string;
    if (!modelId || !inputs) {
      return { content: [{ type: 'text', text: 'model_id and inputs are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      inputs,
      parameters: {
        max_length: (args.max_length as number) ?? 130,
        min_length: (args.min_length as number) ?? 30,
      },
    };
    const response = await this.fetchWithRetry(`${this.inferenceBaseUrl}/models/${encodeURIComponent(modelId)}`, {
      method: 'POST',
      headers: this.hubHeaders,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Inference error ${response.status}: ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }
}

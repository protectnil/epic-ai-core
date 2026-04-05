/**
 * LlamaIndex Cloud MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/run-llama/mcp-server-llamacloud — transport: stdio, auth: API key
// Published as @llamaindex/mcp-server-llamacloud on npm. Last release: v0.1.3, Jun 24 2025 (maintained).
// That MCP server only exposes per-index query tools (dynamic, auto-named get_information_{index_name});
// it does NOT expose pipeline management, project management, file upload, or parse job operations.
// A second package @llamaindex/llama-cloud-mcp exposes only 2 tools (docs_search + code_executor).
// Neither MCP exposes the full REST API surface. Decision: use-rest-api.
// MCP fails criterion 3 (does not expose 10+ fixed tools covering the full API surface).
//
// Our adapter covers: 18 tools. Vendor MCP covers: dynamic query-only tools (not a fixed API surface).
// Recommendation: Use this REST adapter for full pipeline/project/file/parse management.
//
// Base URL: https://api.cloud.llamaindex.ai (base; paths include /api/v1, /api/v1/beta, /api/v2 prefixes)
// Auth: Bearer token (LLAMA_CLOUD_API_KEY from LlamaIndex Cloud dashboard)
// Docs: https://developers.api.llamaindex.ai/api
// Rate limits: Not publicly documented; enforced server-side. Retry on 429 with Retry-After header.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface LlamaIndexConfig {
  /** LlamaIndex Cloud API key (LLAMA_CLOUD_API_KEY from the LlamaIndex Cloud dashboard). */
  apiKey: string;
  /** Base URL override (default: https://api.cloud.llamaindex.ai/api/v1). */
  baseUrl?: string;
}

export class LlamaIndexMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: LlamaIndexConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = (config.baseUrl ?? 'https://api.cloud.llamaindex.ai').replace(/\/$/, '');
  }

  static catalog() {
    return {
      name: 'llamaindex-api',
      displayName: 'LlamaIndex Cloud',
      version: '1.0.0',
      category: 'ai-ml' as const,
      keywords: [
        'llamaindex', 'llama cloud', 'rag', 'retrieval augmented generation', 'vector search',
        'pipeline', 'index', 'document', 'ingest', 'parse', 'llama parse', 'embedding',
        'knowledge base', 'ai', 'ml',
      ],
      toolNames: [
        'list_pipelines', 'get_pipeline', 'create_pipeline', 'delete_pipeline',
        'list_pipeline_files', 'add_files_to_pipeline', 'get_pipeline_file_status',
        'list_projects', 'get_project', 'create_project',
        'upload_file', 'list_files', 'delete_file',
        'query_pipeline', 'retrieve_pipeline',
        'create_parse_job', 'get_parse_job_status', 'get_parse_job_result',
      ],
      description: 'Manage LlamaIndex Cloud pipelines, projects, documents, and parse jobs. Query and retrieve from RAG pipelines.',
      author: 'protectnil' as const,
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_pipelines',
        description: 'List all managed ingestion pipelines (indexes) in the LlamaIndex Cloud project with optional pagination.',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: { type: 'string', description: 'Filter by project ID (optional).' },
            page: { type: 'number', description: 'Page number for pagination (default: 1).' },
            page_size: { type: 'number', description: 'Items per page (default: 10).' },
          },
        },
      },
      {
        name: 'get_pipeline',
        description: 'Get metadata and configuration for a specific LlamaIndex Cloud pipeline (index) by ID.',
        inputSchema: {
          type: 'object',
          properties: {
            pipeline_id: { type: 'string', description: 'The pipeline ID.' },
          },
          required: ['pipeline_id'],
        },
      },
      {
        name: 'create_pipeline',
        description: 'Create a new LlamaIndex Cloud ingestion pipeline (managed index) with embedding and transformation config.',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Human-readable pipeline name.' },
            project_id: { type: 'string', description: 'Project ID to create the pipeline in.' },
            embedding_config: {
              type: 'object',
              description: 'Embedding model config, e.g. {"type":"OPENAI_EMBEDDING","component":{"model_name":"text-embedding-3-small"}} (optional).',
            },
            transform_config: {
              type: 'object',
              description: 'Transformation config for chunking and parsing (optional).',
            },
          },
          required: ['name', 'project_id'],
        },
      },
      {
        name: 'delete_pipeline',
        description: 'Delete a LlamaIndex Cloud pipeline and all its indexed documents.',
        inputSchema: {
          type: 'object',
          properties: {
            pipeline_id: { type: 'string', description: 'The pipeline ID to delete.' },
          },
          required: ['pipeline_id'],
        },
      },
      {
        name: 'list_pipeline_files',
        description: 'List files currently added to a pipeline with their ingestion status (PENDING, SUCCESS, ERROR).',
        inputSchema: {
          type: 'object',
          properties: {
            pipeline_id: { type: 'string', description: 'The pipeline ID.' },
            page: { type: 'number', description: 'Page number for pagination (default: 1).' },
            page_size: { type: 'number', description: 'Items per page (default: 10).' },
          },
          required: ['pipeline_id'],
        },
      },
      {
        name: 'add_files_to_pipeline',
        description: 'Add one or more uploaded files to a pipeline for ingestion and indexing.',
        inputSchema: {
          type: 'object',
          properties: {
            pipeline_id: { type: 'string', description: 'The pipeline ID.' },
            file_ids: {
              type: 'array',
              description: 'Array of file IDs to add to the pipeline for ingestion.',
              items: { type: 'string' },
            },
          },
          required: ['pipeline_id', 'file_ids'],
        },
      },
      {
        name: 'get_pipeline_file_status',
        description: 'Get the ingestion status counts for a pipeline (SUCCESS, ERROR, PENDING counts).',
        inputSchema: {
          type: 'object',
          properties: {
            pipeline_id: { type: 'string', description: 'The pipeline ID.' },
          },
          required: ['pipeline_id'],
        },
      },
      {
        name: 'list_projects',
        description: 'List all LlamaIndex Cloud projects with optional pagination.',
        inputSchema: {
          type: 'object',
          properties: {
            page: { type: 'number', description: 'Page number for pagination (default: 1).' },
            page_size: { type: 'number', description: 'Items per page (default: 10).' },
          },
        },
      },
      {
        name: 'get_project',
        description: 'Get details for a specific LlamaIndex Cloud project by ID.',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: { type: 'string', description: 'The project ID.' },
          },
          required: ['project_id'],
        },
      },
      {
        name: 'create_project',
        description: 'Create a new LlamaIndex Cloud project to organize pipelines and files.',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Project name.' },
          },
          required: ['name'],
        },
      },
      {
        name: 'upload_file',
        description: 'Upload a text document to LlamaIndex Cloud for later addition to a pipeline.',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: { type: 'string', description: 'Project ID to upload the file into.' },
            file_name: { type: 'string', description: 'File name including extension (e.g. "report.txt").' },
            text: { type: 'string', description: 'Document text content.' },
            metadata: {
              type: 'object',
              description: 'Optional key-value metadata to attach to the document.',
            },
          },
          required: ['project_id', 'file_name', 'text'],
        },
      },
      {
        name: 'list_files',
        description: 'List files uploaded to a LlamaIndex Cloud project with optional pagination.',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: { type: 'string', description: 'Project ID to list files for.' },
            page: { type: 'number', description: 'Page number for pagination (default: 1).' },
            page_size: { type: 'number', description: 'Items per page (default: 10).' },
          },
          required: ['project_id'],
        },
      },
      {
        name: 'delete_file',
        description: 'Delete an uploaded file from a LlamaIndex Cloud project by file ID.',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: { type: 'string', description: 'The project ID that owns the file.' },
            file_id: { type: 'string', description: 'The file ID to delete.' },
          },
          required: ['project_id', 'file_id'],
        },
      },
      {
        name: 'query_pipeline',
        description: 'Run a natural language query against a LlamaIndex Cloud pipeline and retrieve a synthesized response.',
        inputSchema: {
          type: 'object',
          properties: {
            pipeline_id: { type: 'string', description: 'The pipeline ID to query.' },
            query: { type: 'string', description: 'Natural language question to answer from the indexed documents.' },
            top_k: { type: 'number', description: 'Number of top retrieved nodes to use for synthesis (default: 8).' },
          },
          required: ['pipeline_id', 'query'],
        },
      },
      {
        name: 'retrieve_pipeline',
        description: 'Retrieve relevant document chunks from a LlamaIndex Cloud pipeline without synthesis — returns raw nodes with scores.',
        inputSchema: {
          type: 'object',
          properties: {
            pipeline_id: { type: 'string', description: 'The pipeline ID to retrieve from.' },
            query: { type: 'string', description: 'Query string for semantic retrieval.' },
            top_k: { type: 'number', description: 'Number of top nodes to retrieve (default: 8).' },
          },
          required: ['pipeline_id', 'query'],
        },
      },
      {
        name: 'create_parse_job',
        description: 'Submit a document URL or file ID to LlamaParse v2 for extraction and parsing into structured text.',
        inputSchema: {
          type: 'object',
          properties: {
            file_id: { type: 'string', description: 'LlamaIndex Cloud file ID to parse (use if file already uploaded).' },
            url: { type: 'string', description: 'Publicly accessible URL to fetch and parse (alternative to file_id).' },
            parse_mode: {
              type: 'string',
              description: 'Parsing tier: fast, cost_effective, agentic, agentic_plus (default: fast). Maps to the v2 API "tier" parameter.',
            },
          },
        },
      },
      {
        name: 'get_parse_job_status',
        description: 'Check the status of a LlamaParse job by job ID — returns status: PENDING, SUCCESS, or ERROR.',
        inputSchema: {
          type: 'object',
          properties: {
            job_id: { type: 'string', description: 'The parse job ID returned by create_parse_job.' },
          },
          required: ['job_id'],
        },
      },
      {
        name: 'get_parse_job_result',
        description: 'Retrieve the parsed text result from a completed LlamaParse job by job ID.',
        inputSchema: {
          type: 'object',
          properties: {
            job_id: { type: 'string', description: 'The parse job ID returned by create_parse_job.' },
            result_type: {
              type: 'string',
              description: 'Result format to retrieve: markdown, text, or json (default: markdown).',
            },
          },
          required: ['job_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_pipelines':
          return await this.listPipelines(args);
        case 'get_pipeline':
          return await this.getPipeline(args);
        case 'create_pipeline':
          return await this.createPipeline(args);
        case 'delete_pipeline':
          return await this.deletePipeline(args);
        case 'list_pipeline_files':
          return await this.listPipelineFiles(args);
        case 'add_files_to_pipeline':
          return await this.addFilesToPipeline(args);
        case 'get_pipeline_file_status':
          return await this.getPipelineFileStatus(args);
        case 'list_projects':
          return await this.listProjects(args);
        case 'get_project':
          return await this.getProject(args);
        case 'create_project':
          return await this.createProject(args);
        case 'upload_file':
          return await this.uploadFile(args);
        case 'list_files':
          return await this.listFiles(args);
        case 'delete_file':
          return await this.deleteFile(args);
        case 'query_pipeline':
          return await this.queryPipeline(args);
        case 'retrieve_pipeline':
          return await this.retrievePipeline(args);
        case 'create_parse_job':
          return await this.createParseJob(args);
        case 'get_parse_job_status':
          return await this.getParseJobStatus(args);
        case 'get_parse_job_result':
          return await this.getParseJobResult(args);
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

  private get authHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  private async get(path: string, params?: URLSearchParams): Promise<ToolResult> {
    const qs = params?.toString();
    const url = `${this.baseUrl}${path}${qs ? `?${qs}` : ''}`;
    const response = await this.fetchWithRetry(url, { method: 'GET', headers: this.authHeaders });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async post(path: string, body: unknown): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.authHeaders,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async put(path: string, body: unknown): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'PUT',
      headers: this.authHeaders,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async del(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, { method: 'DELETE', headers: this.authHeaders });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: 'Deleted successfully.' }], isError: false };
  }

  private async listPipelines(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.project_id) params.set('project_id', args.project_id as string);
    if (args.page) params.set('page', String(args.page));
    if (args.page_size) params.set('page_size', String(args.page_size));
    return this.get('/api/v1/pipelines', params);
  }

  private async getPipeline(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.pipeline_id) return { content: [{ type: 'text', text: 'pipeline_id is required' }], isError: true };
    return this.get(`/api/v1/pipelines/${encodeURIComponent(args.pipeline_id as string)}`);
  }

  private async createPipeline(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name || !args.project_id) return { content: [{ type: 'text', text: 'name and project_id are required' }], isError: true };
    const body: Record<string, unknown> = { name: args.name, project_id: args.project_id };
    if (args.embedding_config) body.embedding_config = args.embedding_config;
    if (args.transform_config) body.transform_config = args.transform_config;
    return this.post('/api/v1/pipelines', body);
  }

  private async deletePipeline(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.pipeline_id) return { content: [{ type: 'text', text: 'pipeline_id is required' }], isError: true };
    return this.del(`/api/v1/pipelines/${encodeURIComponent(args.pipeline_id as string)}`);
  }

  private async listPipelineFiles(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.pipeline_id) return { content: [{ type: 'text', text: 'pipeline_id is required' }], isError: true };
    const params = new URLSearchParams();
    if (args.page) params.set('page', String(args.page));
    if (args.page_size) params.set('page_size', String(args.page_size));
    return this.get(`/api/v1/pipelines/${encodeURIComponent(args.pipeline_id as string)}/files`, params);
  }

  private async addFilesToPipeline(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.pipeline_id || !args.file_ids) return { content: [{ type: 'text', text: 'pipeline_id and file_ids are required' }], isError: true };
    // API uses PUT, not POST, for adding files to a pipeline.
    return this.put(`/api/v1/pipelines/${encodeURIComponent(args.pipeline_id as string)}/files`, { file_ids: args.file_ids });
  }

  private async getPipelineFileStatus(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.pipeline_id) return { content: [{ type: 'text', text: 'pipeline_id is required' }], isError: true };
    return this.get(`/api/v1/pipelines/${encodeURIComponent(args.pipeline_id as string)}/files/status-counts`);
  }

  private async listProjects(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.page) params.set('page', String(args.page));
    if (args.page_size) params.set('page_size', String(args.page_size));
    return this.get('/api/v1/projects', params);
  }

  private async getProject(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.project_id) return { content: [{ type: 'text', text: 'project_id is required' }], isError: true };
    return this.get(`/api/v1/projects/${encodeURIComponent(args.project_id as string)}`);
  }

  private async createProject(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name) return { content: [{ type: 'text', text: 'name is required' }], isError: true };
    return this.post('/api/v1/projects', { name: args.name });
  }

  private async uploadFile(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.project_id || !args.file_name || !args.text) {
      return { content: [{ type: 'text', text: 'project_id, file_name, and text are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      project_id: args.project_id,
      file_name: args.file_name,
      text: args.text,
    };
    if (args.metadata) body.metadata = args.metadata;
    return this.post('/api/v1/beta/files', body);
  }

  private async listFiles(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.project_id) return { content: [{ type: 'text', text: 'project_id is required' }], isError: true };
    const params = new URLSearchParams({ project_id: args.project_id as string });
    if (args.page) params.set('page', String(args.page));
    if (args.page_size) params.set('page_size', String(args.page_size));
    return this.get('/api/v1/beta/files', params);
  }

  private async deleteFile(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.project_id || !args.file_id) return { content: [{ type: 'text', text: 'project_id and file_id are required' }], isError: true };
    return this.del(`/api/v1/beta/files/${encodeURIComponent(args.file_id as string)}?project_id=${encodeURIComponent(args.project_id as string)}`);
  }

  private async queryPipeline(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.pipeline_id || !args.query) return { content: [{ type: 'text', text: 'pipeline_id and query are required' }], isError: true };
    const body: Record<string, unknown> = { query: args.query };
    if (args.top_k !== undefined) body.top_k = args.top_k;
    return this.post(`/api/v1/pipelines/${encodeURIComponent(args.pipeline_id as string)}/query`, body);
  }

  private async retrievePipeline(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.pipeline_id || !args.query) return { content: [{ type: 'text', text: 'pipeline_id and query are required' }], isError: true };
    const body: Record<string, unknown> = { query: args.query };
    if (args.top_k !== undefined) body.top_k = args.top_k;
    // Verified: POST /api/v1/pipelines/{pipeline_id}/retrieve (docs: "Run Search" endpoint)
    return this.post(`/api/v1/pipelines/${encodeURIComponent(args.pipeline_id as string)}/retrieve`, body);
  }

  private async createParseJob(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.file_id && !args.url) return { content: [{ type: 'text', text: 'Either file_id or url is required' }], isError: true };
    // v2 API: POST /api/v2/parse (JSON body with file_id or url + tier parameter)
    const body: Record<string, unknown> = {
      tier: (args.parse_mode as string) ?? 'fast',
    };
    if (args.file_id) body.file_id = args.file_id;
    if (args.url) body.url = args.url;
    return this.post('/api/v2/parse', body);
  }

  private async getParseJobStatus(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.job_id) return { content: [{ type: 'text', text: 'job_id is required' }], isError: true };
    // v2 API: GET /api/v2/parse/{job_id} returns job status in response body
    return this.get(`/api/v2/parse/${encodeURIComponent(args.job_id as string)}`);
  }

  private async getParseJobResult(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.job_id) return { content: [{ type: 'text', text: 'job_id is required' }], isError: true };
    // v2 API: GET /api/v2/parse/{job_id}?expand=markdown (or text, json) returns result inline
    const resultType = (args.result_type as string) ?? 'markdown';
    const params = new URLSearchParams({ expand: resultType });
    return this.get(`/api/v2/parse/${encodeURIComponent(args.job_id as string)}`, params);
  }
}

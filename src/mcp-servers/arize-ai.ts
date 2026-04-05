/**
 * Arize AI (Phoenix) MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/Arize-ai/phoenix (npm: @arizeai/phoenix-mcp) — transport: stdio, auth: API key
// The phoenix-mcp package lives at js/packages/phoenix-mcp in the Arize-ai/phoenix monorepo.
// It is actively maintained (last commit 2026-03-26, version 1.1.0). Exposes 21 tools.
// Our adapter covers: 15 tools (REST surface: projects, spans, datasets, experiments, prompts).
// Vendor MCP covers: 21 tools (adds: list-sessions, get-session, list-traces, list-annotation-configs,
//   get-spans, get-span-annotations, upsert-prompt, get-prompt-by-identifier, get-latest-prompt,
//   get-prompt-version, add-dataset-examples, list-experiments-for-dataset, get-experiment-by-id,
//   list-traces, get-trace, phoenix-support — MCP tool names use kebab-case).
// Integration: use-both
// MCP-sourced tools (6 unique to MCP): list-sessions, get-session, list-annotation-configs,
//   add-dataset-examples, phoenix-support, get-span-annotations
// REST-sourced tools (15, covering projects/spans/datasets/experiments/prompts):
//   list_projects, get_project, create_project, delete_project, list_spans, get_span, get_trace,
//   list_datasets, get_dataset, get_dataset_examples, delete_dataset, list_experiments,
//   get_experiment, list_prompts, get_prompt
// Shared (overlap — MCP also covers these operations, but our REST adapter provides them too):
//   list-projects/list_projects, get-project/get_project, get-spans/list_spans,
//   list-datasets/list_datasets, get-dataset/get_dataset, get-dataset-examples/get_dataset_examples,
//   list-experiments-for-dataset/list_experiments, get-experiment-by-id/get_experiment,
//   list-prompts/list_prompts, get-prompt/get_prompt, list-traces/get_trace
// NOTE: create_project, delete_project, delete_dataset are REST-only (not in vendor MCP).
//       The FederationManager routes shared tools through MCP by default.
//
// Base URL: https://app.phoenix.arize.com (Phoenix Cloud); override with self-hosted URL
// Auth: Bearer API key — set in Authorization header
// Docs: https://arize.com/docs/phoenix/sdk-api-reference/rest-api/overview
// Rate limits: Not published; depends on Phoenix Cloud plan or self-hosted resources

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface ArizeAIConfig {
  apiKey: string;
  baseUrl?: string; // default: https://app.phoenix.arize.com; self-hosted e.g. http://localhost:6006
}

export class ArizeAIMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: ArizeAIConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? 'https://app.phoenix.arize.com';
  }

  get tools(): ToolDefinition[] {
    return [
      // ── Projects ──────────────────────────────────────────────────────────
      {
        name: 'list_projects',
        description: 'List all projects (tracing namespaces) in the Phoenix instance',
        inputSchema: {
          type: 'object',
          properties: {
            cursor: { type: 'string', description: 'Pagination cursor from a previous response' },
            limit: { type: 'number', description: 'Maximum projects to return (default: 50)' },
          },
        },
      },
      {
        name: 'get_project',
        description: 'Get details of a specific Phoenix project by name or ID',
        inputSchema: {
          type: 'object',
          properties: {
            project_identifier: { type: 'string', description: 'Project name or unique ID' },
          },
          required: ['project_identifier'],
        },
      },
      {
        name: 'create_project',
        description: 'Create a new Phoenix project (tracing namespace) with optional description',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Project name (must be unique)' },
            description: { type: 'string', description: 'Optional project description' },
          },
          required: ['name'],
        },
      },
      {
        name: 'delete_project',
        description: 'Delete a Phoenix project and all its associated traces and spans',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: { type: 'string', description: 'Project unique ID to delete' },
          },
          required: ['project_id'],
        },
      },
      // ── Spans & Traces ────────────────────────────────────────────────────
      {
        name: 'list_spans',
        description: 'Query LLM trace spans with filters for project, time range, and limit — useful for debugging and analysis',
        inputSchema: {
          type: 'object',
          properties: {
            project_name: { type: 'string', description: 'Filter spans to a specific project name' },
            start_time: { type: 'string', description: 'ISO 8601 timestamp — return spans after this time' },
            end_time: { type: 'string', description: 'ISO 8601 timestamp — return spans before this time' },
            filter_condition: { type: 'string', description: 'Filter expression (e.g. span_kind == "LLM")' },
            limit: { type: 'number', description: 'Maximum number of spans to return (default: 50)' },
            cursor: { type: 'string', description: 'Pagination cursor from a previous response' },
          },
        },
      },
      {
        name: 'get_span',
        description: 'Retrieve a single trace span by its span ID including all attributes and events',
        inputSchema: {
          type: 'object',
          properties: {
            span_id: { type: 'string', description: 'The unique span ID' },
          },
          required: ['span_id'],
        },
      },
      {
        name: 'get_trace',
        description: 'Retrieve all spans belonging to a trace by trace ID',
        inputSchema: {
          type: 'object',
          properties: {
            trace_id: { type: 'string', description: 'The unique trace ID' },
          },
          required: ['trace_id'],
        },
      },
      // ── Datasets ──────────────────────────────────────────────────────────
      {
        name: 'list_datasets',
        description: 'List all datasets stored in the Phoenix instance with metadata and example counts',
        inputSchema: {
          type: 'object',
          properties: {
            cursor: { type: 'string', description: 'Pagination cursor from a previous response' },
            limit: { type: 'number', description: 'Maximum datasets to return (default: 50)' },
          },
        },
      },
      {
        name: 'get_dataset',
        description: 'Retrieve a dataset by ID including metadata and version information',
        inputSchema: {
          type: 'object',
          properties: {
            dataset_id: { type: 'string', description: 'The unique dataset ID' },
          },
          required: ['dataset_id'],
        },
      },
      {
        name: 'get_dataset_examples',
        description: 'Retrieve the examples (rows) of a dataset, optionally filtered by version',
        inputSchema: {
          type: 'object',
          properties: {
            dataset_id: { type: 'string', description: 'The unique dataset ID' },
            version_id: { type: 'string', description: 'Dataset version ID (default: latest)' },
            cursor: { type: 'string', description: 'Pagination cursor from a previous response' },
            limit: { type: 'number', description: 'Maximum examples to return (default: 100)' },
          },
          required: ['dataset_id'],
        },
      },
      {
        name: 'delete_dataset',
        description: 'Delete a dataset and all its versions and examples from Phoenix',
        inputSchema: {
          type: 'object',
          properties: {
            dataset_id: { type: 'string', description: 'The unique dataset ID to delete' },
          },
          required: ['dataset_id'],
        },
      },
      // ── Experiments ───────────────────────────────────────────────────────
      {
        name: 'list_experiments',
        description: 'List experiments associated with a specific dataset, including run counts and evaluation scores',
        inputSchema: {
          type: 'object',
          properties: {
            dataset_id: { type: 'string', description: 'The dataset ID to list experiments for' },
            cursor: { type: 'string', description: 'Pagination cursor from a previous response' },
            limit: { type: 'number', description: 'Maximum experiments to return (default: 50)' },
          },
          required: ['dataset_id'],
        },
      },
      {
        name: 'get_experiment',
        description: 'Retrieve a single experiment by ID including run results, scores, and evaluation annotations',
        inputSchema: {
          type: 'object',
          properties: {
            experiment_id: { type: 'string', description: 'The unique experiment ID' },
          },
          required: ['experiment_id'],
        },
      },
      // ── Prompts ───────────────────────────────────────────────────────────
      {
        name: 'list_prompts',
        description: 'List prompt templates managed in the Phoenix prompt registry with version info',
        inputSchema: {
          type: 'object',
          properties: {
            cursor: { type: 'string', description: 'Pagination cursor from a previous response' },
            limit: { type: 'number', description: 'Maximum prompts to return (default: 50)' },
          },
        },
      },
      {
        name: 'get_prompt',
        description: 'Retrieve a specific prompt template by name or ID, including all versions',
        inputSchema: {
          type: 'object',
          properties: {
            prompt_identifier: { type: 'string', description: 'Prompt name or unique ID' },
          },
          required: ['prompt_identifier'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_projects':
          return await this.listProjects(args);
        case 'get_project':
          return await this.getProject(args);
        case 'create_project':
          return await this.createProject(args);
        case 'delete_project':
          return await this.deleteProject(args);
        case 'list_spans':
          return await this.listSpans(args);
        case 'get_span':
          return await this.getSpan(args);
        case 'get_trace':
          return await this.getTrace(args);
        case 'list_datasets':
          return await this.listDatasets(args);
        case 'get_dataset':
          return await this.getDataset(args);
        case 'get_dataset_examples':
          return await this.getDatasetExamples(args);
        case 'delete_dataset':
          return await this.deleteDataset(args);
        case 'list_experiments':
          return await this.listExperiments(args);
        case 'get_experiment':
          return await this.getExperiment(args);
        case 'list_prompts':
          return await this.listPrompts(args);
        case 'get_prompt':
          return await this.getPrompt(args);
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

  private get headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  private async fetchJSON(url: string, init?: RequestInit): Promise<ToolResult> {
    const response = await this.fetchWithRetry(url, { headers: this.headers, ...init });
    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }
    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new Error(`Phoenix returned non-JSON response (HTTP ${response.status})`);
    }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listProjects(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.cursor) params.set('cursor', String(args.cursor));
    if (args.limit) params.set('limit', String(args.limit));
    const qs = params.toString();
    return this.fetchJSON(`${this.baseUrl}/v1/projects${qs ? `?${qs}` : ''}`);
  }

  private async getProject(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fetchJSON(`${this.baseUrl}/v1/projects/${encodeURIComponent(String(args.project_identifier))}`);
  }

  private async createProject(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = { name: args.name };
    if (args.description) body.description = args.description;
    return this.fetchJSON(`${this.baseUrl}/v1/projects`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  private async deleteProject(args: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/v1/projects/${encodeURIComponent(String(args.project_id))}`,
      { method: 'DELETE', headers: this.headers },
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: JSON.stringify({ status: 'deleted', project_id: args.project_id }) }], isError: false };
  }

  private async listSpans(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.project_name) params.set('project_name', String(args.project_name));
    if (args.start_time) params.set('start_time', String(args.start_time));
    if (args.end_time) params.set('end_time', String(args.end_time));
    if (args.filter_condition) params.set('filter_condition', String(args.filter_condition));
    if (args.limit) params.set('limit', String(args.limit));
    if (args.cursor) params.set('cursor', String(args.cursor));
    const qs = params.toString();
    return this.fetchJSON(`${this.baseUrl}/v1/spans${qs ? `?${qs}` : ''}`);
  }

  private async getSpan(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fetchJSON(`${this.baseUrl}/v1/spans/${encodeURIComponent(String(args.span_id))}`);
  }

  private async getTrace(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fetchJSON(`${this.baseUrl}/v1/traces/${encodeURIComponent(String(args.trace_id))}`);
  }

  private async listDatasets(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.cursor) params.set('cursor', String(args.cursor));
    if (args.limit) params.set('limit', String(args.limit));
    const qs = params.toString();
    return this.fetchJSON(`${this.baseUrl}/v1/datasets${qs ? `?${qs}` : ''}`);
  }

  private async getDataset(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fetchJSON(`${this.baseUrl}/v1/datasets/${encodeURIComponent(String(args.dataset_id))}`);
  }

  private async getDatasetExamples(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.version_id) params.set('version_id', String(args.version_id));
    if (args.cursor) params.set('cursor', String(args.cursor));
    if (args.limit) params.set('limit', String(args.limit));
    const qs = params.toString();
    return this.fetchJSON(
      `${this.baseUrl}/v1/datasets/${encodeURIComponent(String(args.dataset_id))}/examples${qs ? `?${qs}` : ''}`,
    );
  }

  private async deleteDataset(args: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/v1/datasets/${encodeURIComponent(String(args.dataset_id))}`,
      { method: 'DELETE', headers: this.headers },
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: JSON.stringify({ status: 'deleted', dataset_id: args.dataset_id }) }], isError: false };
  }

  private async listExperiments(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.cursor) params.set('cursor', String(args.cursor));
    if (args.limit) params.set('limit', String(args.limit));
    const qs = params.toString();
    return this.fetchJSON(
      `${this.baseUrl}/v1/datasets/${encodeURIComponent(String(args.dataset_id))}/experiments${qs ? `?${qs}` : ''}`,
    );
  }

  private async getExperiment(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fetchJSON(`${this.baseUrl}/v1/experiments/${encodeURIComponent(String(args.experiment_id))}`);
  }

  private async listPrompts(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.cursor) params.set('cursor', String(args.cursor));
    if (args.limit) params.set('limit', String(args.limit));
    const qs = params.toString();
    return this.fetchJSON(`${this.baseUrl}/v1/prompts${qs ? `?${qs}` : ''}`);
  }

  private async getPrompt(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fetchJSON(`${this.baseUrl}/v1/prompts/${encodeURIComponent(String(args.prompt_identifier))}`);
  }

  static catalog() {
    return {
      name: 'arize-ai',
      displayName: 'Arize AI (Phoenix)',
      version: '1.0.0',
      category: 'ai-ml' as const,
      keywords: ['arize', 'phoenix', 'llm', 'observability', 'tracing', 'spans', 'evals', 'experiments', 'datasets', 'prompts', 'ai monitoring'],
      toolNames: [
        'list_projects', 'get_project', 'create_project', 'delete_project',
        'list_spans', 'get_span', 'get_trace',
        'list_datasets', 'get_dataset', 'get_dataset_examples', 'delete_dataset',
        'list_experiments', 'get_experiment',
        'list_prompts', 'get_prompt',
      ],
      description: 'LLM observability and evaluation via Arize Phoenix: query traces and spans, manage datasets, run experiments, and version prompts.',
      author: 'protectnil' as const,
    };
  }
}

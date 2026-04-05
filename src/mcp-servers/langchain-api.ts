/**
 * LangSmith MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/langchain-ai/langsmith-mcp-server — transport: stdio + streamable-HTTP, auth: LANGSMITH-API-KEY header
// Vendor MCP is actively maintained (langchain-ai org, latest release Feb 25, 2026). Covers 14 tools: runs, prompts, projects,
// datasets, examples, experiments, billing, threads.
// Our adapter covers: 16 tools (core REST operations). Vendor MCP covers: 14 tools.
// Recommendation: use-both — our adapter has unique tools (query_runs, create_dataset, create_example, list_feedback, create_feedback,
// get_trace) not in the vendor MCP; vendor MCP has unique tools (get_thread_history, fetch_runs with pagination, get_billing_usage,
// run_experiment, update_examples, read_dataset, read_example) not in our adapter. Union gives broadest coverage.
// MCP-sourced tools (7): get_thread_history, fetch_runs, get_billing_usage, run_experiment, update_examples, read_dataset, read_example
// REST-sourced tools (16): list_projects, get_project, list_runs, get_run, query_runs, list_datasets, get_dataset, create_dataset,
//   list_examples, create_example, list_feedback, create_feedback, list_prompts, get_prompt, list_experiments, get_trace
//
// Base URL: https://api.smith.langchain.com/api/v1
// Auth: x-api-key header (LangSmith API key from Settings → API Keys)
// Docs: https://api.smith.langchain.com/redoc
// Rate limits: Not publicly documented; varies by plan

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface LangChainConfig {
  apiKey: string;
  baseUrl?: string;
}

export class LangChainMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: LangChainConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? 'https://api.smith.langchain.com/api/v1';
  }

  static catalog() {
    return {
      name: 'langchain-api',
      displayName: 'LangSmith',
      version: '1.0.0',
      category: 'ai-ml',
      keywords: ['langsmith', 'langchain', 'llm', 'tracing', 'observability', 'runs', 'traces', 'datasets', 'evaluation', 'prompts', 'feedback'],
      toolNames: [
        'list_projects', 'get_project',
        'list_runs', 'get_run', 'query_runs',
        'list_datasets', 'get_dataset', 'create_dataset',
        'list_examples', 'create_example',
        'list_feedback', 'create_feedback',
        'list_prompts', 'get_prompt',
        'list_experiments', 'get_trace',
      ],
      description: 'LangSmith LLM observability: query traces/runs, manage datasets and examples, retrieve prompts, log feedback, and monitor evaluation experiments.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_projects',
        description: 'List LangSmith projects (also called sessions) with optional pagination and name filter',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Number of projects to return (default: 20, max: 100)',
            },
            offset: {
              type: 'number',
              description: 'Offset for pagination (default: 0)',
            },
            name: {
              type: 'string',
              description: 'Filter projects by name (partial match)',
            },
          },
        },
      },
      {
        name: 'get_project',
        description: 'Get details of a specific LangSmith project including run statistics and metadata',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: {
              type: 'string',
              description: 'LangSmith project (session) ID',
            },
          },
          required: ['project_id'],
        },
      },
      {
        name: 'list_runs',
        description: 'List LangSmith traced runs with filters for project, run type, error status, and date range',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: {
              type: 'string',
              description: 'Filter runs by project ID (use list_projects to find IDs)',
            },
            project_name: {
              type: 'string',
              description: 'Filter runs by project name (alternative to project_id)',
            },
            run_type: {
              type: 'string',
              description: 'Filter by run type: chain, llm, tool, retriever, embedding, prompt (default: all)',
            },
            is_root: {
              type: 'boolean',
              description: 'Return only root-level runs (true) or all runs including sub-runs (false)',
            },
            error: {
              type: 'boolean',
              description: 'Filter to runs with errors (true) or successful runs (false)',
            },
            limit: {
              type: 'number',
              description: 'Number of results to return (default: 20, max: 100)',
            },
            offset: {
              type: 'number',
              description: 'Offset for pagination (default: 0)',
            },
            start_time: {
              type: 'string',
              description: 'Filter runs after this ISO 8601 timestamp',
            },
            end_time: {
              type: 'string',
              description: 'Filter runs before this ISO 8601 timestamp',
            },
          },
        },
      },
      {
        name: 'get_run',
        description: 'Get full details of a specific LangSmith run including inputs, outputs, and metadata',
        inputSchema: {
          type: 'object',
          properties: {
            run_id: {
              type: 'string',
              description: 'LangSmith run ID (UUID)',
            },
          },
          required: ['run_id'],
        },
      },
      {
        name: 'query_runs',
        description: 'Query LangSmith runs using FQL (filter query language) for advanced filtering and sorting',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: {
              type: 'string',
              description: 'Filter runs within a specific project',
            },
            filter: {
              type: 'string',
              description: 'FQL filter expression (e.g. \'and(gt(total_tokens, 1000), eq(error, "true"))\')',
            },
            trace_filter: {
              type: 'string',
              description: 'FQL filter applied at the trace level for root run filtering',
            },
            limit: {
              type: 'number',
              description: 'Number of results to return (default: 20)',
            },
            offset: {
              type: 'number',
              description: 'Offset for pagination (default: 0)',
            },
          },
        },
      },
      {
        name: 'list_datasets',
        description: 'List LangSmith evaluation datasets with optional name filter and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Number of datasets to return (default: 20)',
            },
            offset: {
              type: 'number',
              description: 'Offset for pagination (default: 0)',
            },
            name: {
              type: 'string',
              description: 'Filter datasets by name (partial match)',
            },
          },
        },
      },
      {
        name: 'get_dataset',
        description: 'Get full details of a specific LangSmith dataset including example count and metadata',
        inputSchema: {
          type: 'object',
          properties: {
            dataset_id: {
              type: 'string',
              description: 'LangSmith dataset ID',
            },
          },
          required: ['dataset_id'],
        },
      },
      {
        name: 'create_dataset',
        description: 'Create a new LangSmith evaluation dataset with a name and optional description',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Name for the new dataset',
            },
            description: {
              type: 'string',
              description: 'Optional description of the dataset purpose',
            },
            data_type: {
              type: 'string',
              description: 'Dataset type: kv (key-value, default), llm (completion-style), or chat (conversation-style)',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'list_examples',
        description: 'List examples (input/output pairs) within a LangSmith dataset',
        inputSchema: {
          type: 'object',
          properties: {
            dataset_id: {
              type: 'string',
              description: 'Dataset ID to list examples from',
            },
            limit: {
              type: 'number',
              description: 'Number of examples to return (default: 20)',
            },
            offset: {
              type: 'number',
              description: 'Offset for pagination (default: 0)',
            },
          },
          required: ['dataset_id'],
        },
      },
      {
        name: 'create_example',
        description: 'Add a new input/output example to a LangSmith dataset for evaluation',
        inputSchema: {
          type: 'object',
          properties: {
            dataset_id: {
              type: 'string',
              description: 'Dataset ID to add the example to',
            },
            inputs: {
              type: 'object',
              description: 'Input data for the example (key-value pairs matching your pipeline inputs)',
            },
            outputs: {
              type: 'object',
              description: 'Expected output data for the example (reference outputs for evaluation)',
            },
          },
          required: ['dataset_id', 'inputs'],
        },
      },
      {
        name: 'list_feedback',
        description: 'List user feedback entries for LangSmith runs, filterable by run IDs and feedback key',
        inputSchema: {
          type: 'object',
          properties: {
            run_ids: {
              type: 'array',
              description: 'List of run IDs to retrieve feedback for',
            },
            key: {
              type: 'string',
              description: 'Filter by feedback key (e.g. "thumbs_up", "correctness")',
            },
            limit: {
              type: 'number',
              description: 'Number of feedback entries to return (default: 20)',
            },
            offset: {
              type: 'number',
              description: 'Offset for pagination (default: 0)',
            },
          },
        },
      },
      {
        name: 'create_feedback',
        description: 'Create a feedback entry (score, comment, or annotation) for a specific LangSmith run',
        inputSchema: {
          type: 'object',
          properties: {
            run_id: {
              type: 'string',
              description: 'Run ID to attach feedback to',
            },
            key: {
              type: 'string',
              description: 'Feedback key/type (e.g. "thumbs_up", "correctness", "helpfulness")',
            },
            score: {
              type: 'number',
              description: 'Numeric score (e.g. 0 or 1 for thumbs down/up, 0-1 for continuous rating)',
            },
            value: {
              type: 'string',
              description: 'String value for the feedback (alternative to or alongside score)',
            },
            comment: {
              type: 'string',
              description: 'Optional free-text comment explaining the feedback',
            },
          },
          required: ['run_id', 'key'],
        },
      },
      {
        name: 'list_prompts',
        description: 'List LangSmith Hub prompts with optional visibility filter and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Number of prompts to return (default: 20)',
            },
            offset: {
              type: 'number',
              description: 'Offset for pagination (default: 0)',
            },
            is_public: {
              type: 'boolean',
              description: 'Filter to public prompts (true) or private prompts (false)',
            },
            query: {
              type: 'string',
              description: 'Search query to filter prompts by name or description',
            },
          },
        },
      },
      {
        name: 'get_prompt',
        description: 'Get a specific LangSmith Hub prompt by name including template and metadata',
        inputSchema: {
          type: 'object',
          properties: {
            prompt_name: {
              type: 'string',
              description: 'Prompt name in LangSmith Hub (e.g. "my-org/my-prompt" or "my-prompt")',
            },
          },
          required: ['prompt_name'],
        },
      },
      {
        name: 'list_experiments',
        description: 'List LangSmith evaluation experiments (dataset-linked project runs) with metrics',
        inputSchema: {
          type: 'object',
          properties: {
            dataset_id: {
              type: 'string',
              description: 'Filter experiments by dataset ID (required for meaningful results)',
            },
            limit: {
              type: 'number',
              description: 'Number of experiments to return (default: 20)',
            },
            offset: {
              type: 'number',
              description: 'Offset for pagination (default: 0)',
            },
          },
        },
      },
      {
        name: 'get_trace',
        description: 'Get all runs in a LangSmith trace tree by trace ID, returning the full call hierarchy',
        inputSchema: {
          type: 'object',
          properties: {
            run_id: {
              type: 'string',
              description: 'Root run ID of the trace to retrieve',
            },
          },
          required: ['run_id'],
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
        case 'list_runs':
          return await this.listRuns(args);
        case 'get_run':
          return await this.getRun(args);
        case 'query_runs':
          return await this.queryRuns(args);
        case 'list_datasets':
          return await this.listDatasets(args);
        case 'get_dataset':
          return await this.getDataset(args);
        case 'create_dataset':
          return await this.createDataset(args);
        case 'list_examples':
          return await this.listExamples(args);
        case 'create_example':
          return await this.createExample(args);
        case 'list_feedback':
          return await this.listFeedback(args);
        case 'create_feedback':
          return await this.createFeedback(args);
        case 'list_prompts':
          return await this.listPrompts(args);
        case 'get_prompt':
          return await this.getPrompt(args);
        case 'list_experiments':
          return await this.listExperiments(args);
        case 'get_trace':
          return await this.getTrace(args);
        default:
          return {
            content: [{ type: 'text', text: `Unknown tool: ${name}` }],
            isError: true,
          };
      }
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Tool execution failed: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true,
      };
    }
  }

  private get headers(): Record<string, string> {
    return {
      'x-api-key': this.apiKey,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
  }

  private async fetchJSON(url: string, options: RequestInit = {}): Promise<{ ok: boolean; status: number; statusText: string; data: unknown }> {
    const response = await this.fetchWithRetry(url, { headers: this.headers, ...options });
    let data: unknown;
    try {
      data = await response.json();
    } catch {
      data = { status: response.status, statusText: response.statusText };
    }
    return { ok: response.ok, status: response.status, statusText: response.statusText, data };
  }

  private async listProjects(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.limit !== undefined) params.set('limit', String(args.limit));
    if (args.offset !== undefined) params.set('offset', String(args.offset));
    if (args.name !== undefined) params.set('name', args.name as string);

    const { ok, status, statusText, data } = await this.fetchJSON(`${this.baseUrl}/sessions?${params}`);
    if (!ok) return { content: [{ type: 'text', text: `API error ${status}: ${statusText}` }], isError: true };
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getProject(args: Record<string, unknown>): Promise<ToolResult> {
    const { ok, status, statusText, data } = await this.fetchJSON(
      `${this.baseUrl}/sessions/${encodeURIComponent(args.project_id as string)}`
    );
    if (!ok) return { content: [{ type: 'text', text: `API error ${status}: ${statusText}` }], isError: true };
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listRuns(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.project_id !== undefined) params.set('session', String(args.project_id));
    if (args.project_name !== undefined) params.set('session_name', String(args.project_name));
    if (args.run_type !== undefined) params.set('run_type', String(args.run_type));
    if (args.is_root !== undefined) params.set('is_root', String(args.is_root));
    if (args.error !== undefined) params.set('error', String(args.error));
    if (args.limit !== undefined) params.set('limit', String(args.limit));
    if (args.offset !== undefined) params.set('offset', String(args.offset));
    if (args.start_time !== undefined) params.set('start_time', String(args.start_time));
    if (args.end_time !== undefined) params.set('end_time', String(args.end_time));

    const { ok, status, statusText, data } = await this.fetchJSON(`${this.baseUrl}/runs?${params}`);
    if (!ok) return { content: [{ type: 'text', text: `API error ${status}: ${statusText}` }], isError: true };
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getRun(args: Record<string, unknown>): Promise<ToolResult> {
    const { ok, status, statusText, data } = await this.fetchJSON(
      `${this.baseUrl}/runs/${encodeURIComponent(args.run_id as string)}`
    );
    if (!ok) return { content: [{ type: 'text', text: `API error ${status}: ${statusText}` }], isError: true };
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async queryRuns(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {};
    if (args.project_id !== undefined) body.session = [args.project_id];
    if (args.filter !== undefined) body.filter = args.filter;
    if (args.trace_filter !== undefined) body.trace_filter = args.trace_filter;
    if (args.limit !== undefined) body.limit = args.limit;
    if (args.offset !== undefined) body.offset = args.offset;

    const { ok, status, statusText, data } = await this.fetchJSON(`${this.baseUrl}/runs/query`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
    if (!ok) return { content: [{ type: 'text', text: `API error ${status}: ${statusText}` }], isError: true };
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listDatasets(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.limit !== undefined) params.set('limit', String(args.limit));
    if (args.offset !== undefined) params.set('offset', String(args.offset));
    if (args.name !== undefined) params.set('name', args.name as string);

    const { ok, status, statusText, data } = await this.fetchJSON(`${this.baseUrl}/datasets?${params}`);
    if (!ok) return { content: [{ type: 'text', text: `API error ${status}: ${statusText}` }], isError: true };
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getDataset(args: Record<string, unknown>): Promise<ToolResult> {
    const { ok, status, statusText, data } = await this.fetchJSON(
      `${this.baseUrl}/datasets/${encodeURIComponent(args.dataset_id as string)}`
    );
    if (!ok) return { content: [{ type: 'text', text: `API error ${status}: ${statusText}` }], isError: true };
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async createDataset(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = { name: args.name };
    if (args.description !== undefined) body.description = args.description;
    if (args.data_type !== undefined) body.data_type = args.data_type;

    const { ok, status, statusText, data } = await this.fetchJSON(`${this.baseUrl}/datasets`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
    if (!ok) return { content: [{ type: 'text', text: `API error ${status}: ${statusText}` }], isError: true };
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listExamples(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams({ dataset: args.dataset_id as string });
    if (args.limit !== undefined) params.set('limit', String(args.limit));
    if (args.offset !== undefined) params.set('offset', String(args.offset));

    const { ok, status, statusText, data } = await this.fetchJSON(`${this.baseUrl}/examples?${params}`);
    if (!ok) return { content: [{ type: 'text', text: `API error ${status}: ${statusText}` }], isError: true };
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async createExample(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {
      dataset_id: args.dataset_id,
      inputs: args.inputs,
    };
    if (args.outputs !== undefined) body.outputs = args.outputs;

    const { ok, status, statusText, data } = await this.fetchJSON(`${this.baseUrl}/examples`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
    if (!ok) return { content: [{ type: 'text', text: `API error ${status}: ${statusText}` }], isError: true };
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listFeedback(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.run_ids !== undefined) {
      (args.run_ids as string[]).forEach((id) => params.append('run', id));
    }
    if (args.key !== undefined) params.set('key', String(args.key));
    if (args.limit !== undefined) params.set('limit', String(args.limit));
    if (args.offset !== undefined) params.set('offset', String(args.offset));

    const { ok, status, statusText, data } = await this.fetchJSON(`${this.baseUrl}/feedback?${params}`);
    if (!ok) return { content: [{ type: 'text', text: `API error ${status}: ${statusText}` }], isError: true };
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async createFeedback(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {
      run_id: args.run_id,
      key: args.key,
    };
    if (args.score !== undefined) body.score = args.score;
    if (args.value !== undefined) body.value = args.value;
    if (args.comment !== undefined) body.comment = args.comment;

    const { ok, status, statusText, data } = await this.fetchJSON(`${this.baseUrl}/feedback`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
    if (!ok) return { content: [{ type: 'text', text: `API error ${status}: ${statusText}` }], isError: true };
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listPrompts(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.limit !== undefined) params.set('limit', String(args.limit));
    if (args.offset !== undefined) params.set('offset', String(args.offset));
    if (args.is_public !== undefined) params.set('is_public', String(args.is_public));
    if (args.query !== undefined) params.set('query', String(args.query));

    const { ok, status, statusText, data } = await this.fetchJSON(`${this.baseUrl}/repos?${params}`);
    if (!ok) return { content: [{ type: 'text', text: `API error ${status}: ${statusText}` }], isError: true };
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getPrompt(args: Record<string, unknown>): Promise<ToolResult> {
    const { ok, status, statusText, data } = await this.fetchJSON(
      `${this.baseUrl}/repos/${encodeURIComponent(args.prompt_name as string)}`
    );
    if (!ok) return { content: [{ type: 'text', text: `API error ${status}: ${statusText}` }], isError: true };
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listExperiments(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.dataset_id !== undefined) params.set('reference_dataset', args.dataset_id as string);
    if (args.limit !== undefined) params.set('limit', String(args.limit));
    if (args.offset !== undefined) params.set('offset', String(args.offset));

    const { ok, status, statusText, data } = await this.fetchJSON(`${this.baseUrl}/sessions?${params}`);
    if (!ok) return { content: [{ type: 'text', text: `API error ${status}: ${statusText}` }], isError: true };
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getTrace(args: Record<string, unknown>): Promise<ToolResult> {
    // Fetch a trace tree by getting all runs with the same trace_id
    const params = new URLSearchParams({ trace: args.run_id as string });

    const { ok, status, statusText, data } = await this.fetchJSON(`${this.baseUrl}/runs?${params}`);
    if (!ok) return { content: [{ type: 'text', text: `API error ${status}: ${statusText}` }], isError: true };
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }
}

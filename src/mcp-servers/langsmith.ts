/**
 * LangSmith MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/langchain-ai/langsmith-mcp-server — transport: stdio + streamable-HTTP, auth: LANGSMITH-API-KEY header
// Vendor MCP is actively maintained (langchain-ai org, latest release Feb 25, 2026). Covers 14 tools: list_prompts, get_prompt,
//   get_thread_history, fetch_runs, list_projects, list_datasets, list_examples, read_dataset, read_example, create_dataset,
//   update_examples, list_experiments, run_experiment, get_billing_usage.
// Our adapter covers: 16 tools (runs, projects, feedback, datasets, examples, prompts). Vendor MCP covers: 14 tools.
// Recommendation: use-both — our adapter has unique tools (create_project, delete_project, create_run, update_run,
//   create_feedback, list_feedback, get_dataset, create_dataset, create_example, list_runs with cursor) not in the vendor MCP;
//   vendor MCP has unique tools (get_thread_history, get_billing_usage, run_experiment, update_examples, read_example, fetch_runs paginated).
// MCP-sourced tools (6): get_thread_history, get_billing_usage, run_experiment, update_examples, read_example, fetch_runs
// REST-sourced tools (16): list_projects, get_project, create_project, delete_project, list_runs, get_run, create_run, update_run,
//   create_feedback, list_feedback, list_datasets, get_dataset, create_dataset, list_examples, create_example, list_prompts
//
// Base URL: https://api.smith.langchain.com
// Auth: X-Api-Key header (LangSmith API key from Settings → API Keys)
// Docs: https://api.smith.langchain.com/redoc
// Rate limits: Varies by plan — developer plan is rate-limited; contact LangChain for enterprise limits

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface LangSmithConfig {
  apiKey: string;
  baseUrl?: string;
}

export class LangSmithMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: LangSmithConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.smith.langchain.com';
  }

  static catalog() {
    return {
      name: 'langsmith',
      displayName: 'LangSmith',
      version: '1.0.0',
      category: 'ai-ml',
      keywords: [
        'langsmith', 'langchain', 'llm', 'tracing', 'observability', 'runs', 'traces',
        'spans', 'feedback', 'datasets', 'evaluation', 'experiments', 'prompts',
        'projects', 'monitoring', 'ai observability',
      ],
      toolNames: [
        'list_projects', 'get_project', 'create_project', 'delete_project',
        'list_runs', 'get_run', 'create_run', 'update_run',
        'create_feedback', 'list_feedback',
        'list_datasets', 'get_dataset', 'create_dataset',
        'list_examples', 'create_example',
        'list_prompts',
      ],
      description: 'LangSmith LLM observability: query and create traces/runs, manage projects, submit feedback, handle datasets, examples, and prompts for LLM evaluation.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_projects',
        description: 'List all LangSmith projects (also called tracing sessions) with optional name filter and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Filter projects by name (partial match supported)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of projects to return (default: 100)',
            },
            offset: {
              type: 'number',
              description: 'Number of projects to skip for pagination (default: 0)',
            },
          },
        },
      },
      {
        name: 'get_project',
        description: 'Get details for a specific LangSmith project by project ID including run counts and metadata',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: {
              type: 'string',
              description: 'UUID of the LangSmith project',
            },
          },
          required: ['project_id'],
        },
      },
      {
        name: 'create_project',
        description: 'Create a new LangSmith project for organizing traces and runs',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Name for the new project',
            },
            description: {
              type: 'string',
              description: 'Optional description for the project',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'delete_project',
        description: 'Delete a LangSmith project and all its associated runs by project ID',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: {
              type: 'string',
              description: 'UUID of the LangSmith project to delete',
            },
          },
          required: ['project_id'],
        },
      },
      {
        name: 'list_runs',
        description: 'List runs (traces/spans) in a project with optional filters for run type, status, date range, and error state',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: {
              type: 'string',
              description: 'UUID of the project to list runs from',
            },
            project_name: {
              type: 'string',
              description: 'Project name to list runs from (alternative to project_id)',
            },
            run_type: {
              type: 'string',
              description: 'Filter by run type: chain, llm, tool, retriever, embedding (default: returns all)',
            },
            error: {
              type: 'boolean',
              description: 'Filter to only errored runs (default: returns all)',
            },
            start_time: {
              type: 'string',
              description: 'ISO 8601 datetime — only return runs starting after this time',
            },
            end_time: {
              type: 'string',
              description: 'ISO 8601 datetime — only return runs starting before this time',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of runs to return (default: 100, max: 100)',
            },
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
          },
        },
      },
      {
        name: 'get_run',
        description: 'Get detailed information for a specific LangSmith run by run ID including inputs, outputs, and metadata',
        inputSchema: {
          type: 'object',
          properties: {
            run_id: {
              type: 'string',
              description: 'UUID of the run to retrieve',
            },
          },
          required: ['run_id'],
        },
      },
      {
        name: 'create_run',
        description: 'Create a new run (trace or span) in LangSmith for logging LLM calls, chains, or tool invocations',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Name of the run',
            },
            run_type: {
              type: 'string',
              description: 'Type of run: chain, llm, tool, retriever, embedding',
            },
            inputs: {
              type: 'object',
              description: 'Input data for the run as a JSON object',
            },
            session_name: {
              type: 'string',
              description: 'Project name to associate this run with',
            },
            start_time: {
              type: 'string',
              description: 'ISO 8601 start time (default: current time)',
            },
          },
          required: ['name', 'run_type', 'inputs'],
        },
      },
      {
        name: 'update_run',
        description: 'Update an existing run with outputs, end time, or error information to complete a trace',
        inputSchema: {
          type: 'object',
          properties: {
            run_id: {
              type: 'string',
              description: 'UUID of the run to update',
            },
            outputs: {
              type: 'object',
              description: 'Output data for the run as a JSON object',
            },
            error: {
              type: 'string',
              description: 'Error message if the run failed',
            },
            end_time: {
              type: 'string',
              description: 'ISO 8601 end time (default: current time)',
            },
          },
          required: ['run_id'],
        },
      },
      {
        name: 'create_feedback',
        description: 'Submit human or automated feedback on a run — supports thumbs up/down, scores, and free-text comments',
        inputSchema: {
          type: 'object',
          properties: {
            run_id: {
              type: 'string',
              description: 'UUID of the run to submit feedback on',
            },
            key: {
              type: 'string',
              description: 'Feedback metric name (e.g. correctness, helpfulness, thumbs_up)',
            },
            score: {
              type: 'number',
              description: 'Numeric score (e.g. 0 or 1 for thumbs down/up, 0.0-1.0 for scaled)',
            },
            value: {
              type: 'string',
              description: 'Categorical value label (e.g. positive, negative)',
            },
            comment: {
              type: 'string',
              description: 'Free-text comment or explanation for the feedback',
            },
            source_type: {
              type: 'string',
              description: 'Source of feedback: human, model, api (default: api)',
            },
          },
          required: ['run_id', 'key'],
        },
      },
      {
        name: 'list_feedback',
        description: 'List feedback entries for one or more runs with optional key and source type filters',
        inputSchema: {
          type: 'object',
          properties: {
            run_ids: {
              type: 'string',
              description: 'Comma-separated list of run UUIDs to retrieve feedback for',
            },
            key: {
              type: 'string',
              description: 'Filter by feedback key/metric name',
            },
            source: {
              type: 'string',
              description: 'Filter by source: human, model, api',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of feedback entries to return (default: 100)',
            },
          },
        },
      },
      {
        name: 'list_datasets',
        description: 'List all LangSmith datasets used for evaluation and testing with optional name filter',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Filter datasets by name (partial match)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of datasets to return (default: 100)',
            },
            offset: {
              type: 'number',
              description: 'Number of datasets to skip for pagination (default: 0)',
            },
          },
        },
      },
      {
        name: 'get_dataset',
        description: 'Get details for a specific LangSmith dataset by dataset ID including example count and metadata',
        inputSchema: {
          type: 'object',
          properties: {
            dataset_id: {
              type: 'string',
              description: 'UUID of the dataset',
            },
          },
          required: ['dataset_id'],
        },
      },
      {
        name: 'create_dataset',
        description: 'Create a new LangSmith dataset for storing evaluation examples',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Name for the new dataset',
            },
            description: {
              type: 'string',
              description: 'Optional description for the dataset',
            },
            data_type: {
              type: 'string',
              description: 'Dataset type: kv (key-value pairs, default), llm (prompt-completion), chat (message threads)',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'list_examples',
        description: 'List examples (input/output pairs) within a dataset with optional pagination',
        inputSchema: {
          type: 'object',
          properties: {
            dataset_id: {
              type: 'string',
              description: 'UUID of the dataset to list examples from',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of examples to return (default: 100)',
            },
            offset: {
              type: 'number',
              description: 'Number of examples to skip for pagination (default: 0)',
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
              description: 'UUID of the dataset to add the example to',
            },
            inputs: {
              type: 'object',
              description: 'Input data for the example as a JSON object',
            },
            outputs: {
              type: 'object',
              description: 'Expected output/ground truth for the example as a JSON object',
            },
            metadata: {
              type: 'object',
              description: 'Optional metadata tags for the example as a JSON object',
            },
          },
          required: ['dataset_id', 'inputs'],
        },
      },
      {
        name: 'list_prompts',
        description: 'List prompts stored in the LangSmith prompt hub with optional visibility and name filters',
        inputSchema: {
          type: 'object',
          properties: {
            is_public: {
              type: 'boolean',
              description: 'Filter by visibility: true for public prompts, false for private (default: returns all)',
            },
            query: {
              type: 'string',
              description: 'Search query to filter prompts by name or description',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of prompts to return (default: 100)',
            },
            offset: {
              type: 'number',
              description: 'Number of prompts to skip for pagination (default: 0)',
            },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_projects':
          return this.listProjects(args);
        case 'get_project':
          return this.getProject(args);
        case 'create_project':
          return this.createProject(args);
        case 'delete_project':
          return this.deleteProject(args);
        case 'list_runs':
          return this.listRuns(args);
        case 'get_run':
          return this.getRun(args);
        case 'create_run':
          return this.createRun(args);
        case 'update_run':
          return this.updateRun(args);
        case 'create_feedback':
          return this.createFeedback(args);
        case 'list_feedback':
          return this.listFeedback(args);
        case 'list_datasets':
          return this.listDatasets(args);
        case 'get_dataset':
          return this.getDataset(args);
        case 'create_dataset':
          return this.createDataset(args);
        case 'list_examples':
          return this.listExamples(args);
        case 'create_example':
          return this.createExample(args);
        case 'list_prompts':
          return this.listPrompts(args);
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

  private get headers(): Record<string, string> {
    return {
      'X-Api-Key': this.apiKey,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
  }

  private async httpGet(path: string, params: Record<string, string> = {}): Promise<ToolResult> {
    const qs = new URLSearchParams(params).toString();
    const url = `${this.baseUrl}${path}${qs ? '?' + qs : ''}`;
    const response = await this.fetchWithRetry(url, { method: 'GET', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async httpPost(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async httpPatch(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'PATCH',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async httpDelete(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'DELETE',
      headers: this.headers,
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: JSON.stringify({ deleted: true }) }], isError: false };
  }

  private async listProjects(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      limit: String((args.limit as number) || 100),
      offset: String((args.offset as number) || 0),
    };
    if (args.name) params.name = args.name as string;
    return this.httpGet('/api/v1/sessions', params);
  }

  private async getProject(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.project_id) return { content: [{ type: 'text', text: 'project_id is required' }], isError: true };
    return this.httpGet(`/api/v1/sessions/${encodeURIComponent(args.project_id as string)}`);
  }

  private async createProject(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name) return { content: [{ type: 'text', text: 'name is required' }], isError: true };
    const body: Record<string, unknown> = { name: args.name };
    if (args.description) body.description = args.description;
    return this.httpPost('/api/v1/sessions', body);
  }

  private async deleteProject(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.project_id) return { content: [{ type: 'text', text: 'project_id is required' }], isError: true };
    return this.httpDelete(`/api/v1/sessions/${encodeURIComponent(args.project_id as string)}`);
  }

  private async listRuns(args: Record<string, unknown>): Promise<ToolResult> {
    // LangSmith /api/v1/runs requires POST with filter body (not GET with query params)
    const body: Record<string, unknown> = {
      limit: (args.limit as number) || 100,
    };
    if (args.project_id) body.session = args.project_id;
    if (args.project_name) body.session_name = args.project_name;
    if (args.run_type) body.run_type = args.run_type;
    if (typeof args.error === 'boolean') body.error = args.error;
    if (args.start_time) body.start_time = args.start_time;
    if (args.end_time) body.end_time = args.end_time;
    if (args.cursor) body.cursor = args.cursor;
    return this.httpPost('/api/v1/runs/query', body);
  }

  private async getRun(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.run_id) return { content: [{ type: 'text', text: 'run_id is required' }], isError: true };
    return this.httpGet(`/api/v1/runs/${encodeURIComponent(args.run_id as string)}`);
  }

  private async createRun(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name || !args.run_type || !args.inputs) {
      return { content: [{ type: 'text', text: 'name, run_type, and inputs are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      name: args.name,
      run_type: args.run_type,
      inputs: args.inputs,
      start_time: args.start_time || new Date().toISOString(),
    };
    if (args.session_name) body.session_name = args.session_name;
    return this.httpPost('/api/v1/runs', body);
  }

  private async updateRun(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.run_id) return { content: [{ type: 'text', text: 'run_id is required' }], isError: true };
    const body: Record<string, unknown> = {
      end_time: args.end_time || new Date().toISOString(),
    };
    if (args.outputs) body.outputs = args.outputs;
    if (args.error) body.error = args.error;
    return this.httpPatch(`/api/v1/runs/${encodeURIComponent(args.run_id as string)}`, body);
  }

  private async createFeedback(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.run_id || !args.key) {
      return { content: [{ type: 'text', text: 'run_id and key are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      run_id: args.run_id,
      key: args.key,
      source_type: (args.source_type as string) || 'api',
    };
    if (args.score !== undefined) body.score = args.score;
    if (args.value) body.value = args.value;
    if (args.comment) body.comment = args.comment;
    return this.httpPost('/api/v1/feedback', body);
  }

  private async listFeedback(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      limit: String((args.limit as number) || 100),
    };
    if (args.run_ids) params.run = args.run_ids as string;
    if (args.key) params.key = args.key as string;
    if (args.source) params.source = args.source as string;
    return this.httpGet('/api/v1/feedback', params);
  }

  private async listDatasets(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      limit: String((args.limit as number) || 100),
      offset: String((args.offset as number) || 0),
    };
    if (args.name) params.name = args.name as string;
    return this.httpGet('/api/v1/datasets', params);
  }

  private async getDataset(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.dataset_id) return { content: [{ type: 'text', text: 'dataset_id is required' }], isError: true };
    return this.httpGet(`/api/v1/datasets/${encodeURIComponent(args.dataset_id as string)}`);
  }

  private async createDataset(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name) return { content: [{ type: 'text', text: 'name is required' }], isError: true };
    const body: Record<string, unknown> = {
      name: args.name,
      data_type: (args.data_type as string) || 'kv',
    };
    if (args.description) body.description = args.description;
    return this.httpPost('/api/v1/datasets', body);
  }

  private async listExamples(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.dataset_id) return { content: [{ type: 'text', text: 'dataset_id is required' }], isError: true };
    const params: Record<string, string> = {
      dataset: args.dataset_id as string,
      limit: String((args.limit as number) || 100),
      offset: String((args.offset as number) || 0),
    };
    return this.httpGet('/api/v1/examples', params);
  }

  private async createExample(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.dataset_id || !args.inputs) {
      return { content: [{ type: 'text', text: 'dataset_id and inputs are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      dataset_id: args.dataset_id,
      inputs: args.inputs,
    };
    if (args.outputs) body.outputs = args.outputs;
    if (args.metadata) body.metadata = args.metadata;
    return this.httpPost('/api/v1/examples', body);
  }

  private async listPrompts(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      limit: String((args.limit as number) || 100),
      offset: String((args.offset as number) || 0),
    };
    if (typeof args.is_public === 'boolean') params.is_public = String(args.is_public);
    if (args.query) params.query = args.query as string;
    return this.httpGet('/api/v1/repos', params);
  }
}

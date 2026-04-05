/**
 * Optimizely MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28 — closed beta only, not publicly released
// Optimizely announced an Experimentation MCP server (announced 2025-07-31) in closed beta.
// As of 2026-03-28 no public GitHub repo or npm package has shipped. Sign-up: optimizely.com/beta
// Announcement: https://www.optimizely.com/insights/blog/experimentation-mcp-server/
// Decision: use-rest-api — no official MCP available publicly.
// Our adapter covers: 16 tools (Web Experimentation + Feature Experimentation REST API v2).
// Recommendation: Use this adapter. Reassess when Optimizely MCP exits closed beta.
//
// Base URL: https://api.optimizely.com/v2
// Auth: Bearer token — Personal Access Token or OAuth2 access token in Authorization header
// Docs: https://docs.developers.optimizely.com/web-experimentation/docs/rest-api-introduction
// Rate limits: Not publicly documented; contact Optimizely support for enterprise rate limit details

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface OptimizelyConfig {
  accessToken: string;
  baseUrl?: string;
}

export class OptimizelyMCPServer extends MCPAdapterBase {
  private readonly accessToken: string;
  private readonly baseUrl: string;

  constructor(config: OptimizelyConfig) {
    super();
    this.accessToken = config.accessToken;
    this.baseUrl = config.baseUrl || 'https://api.optimizely.com/v2';
  }

  static catalog() {
    return {
      name: 'optimizely',
      displayName: 'Optimizely',
      version: '1.0.0',
      category: 'misc',
      keywords: [
        'optimizely', 'experimentation', 'a/b test', 'feature flag', 'rollout',
        'experiment', 'variation', 'audience', 'project', 'campaign', 'results',
        'feature experimentation', 'web experimentation', 'personalization',
      ],
      toolNames: [
        'list_projects', 'get_project',
        'list_experiments', 'get_experiment', 'create_experiment', 'update_experiment', 'archive_experiment',
        'list_features', 'get_feature', 'create_feature', 'update_feature',
        'list_audiences', 'get_audience', 'create_audience',
        'get_results', 'list_environments',
      ],
      description: 'Optimizely experimentation: manage A/B tests, feature flags, audiences, projects, and retrieve experiment results via REST API v2.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_projects',
        description: 'List all Optimizely projects accessible to the authenticated account',
        inputSchema: {
          type: 'object',
          properties: {
            per_page: {
              type: 'number',
              description: 'Number of projects per page (default: 25, max: 100)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
          },
        },
      },
      {
        name: 'get_project',
        description: 'Get detailed information about a specific Optimizely project by project ID',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: {
              type: 'number',
              description: 'Numeric Optimizely project ID',
            },
          },
          required: ['project_id'],
        },
      },
      {
        name: 'list_experiments',
        description: 'List experiments in an Optimizely project with optional status and type filters',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: {
              type: 'number',
              description: 'Project ID to list experiments for',
            },
            status: {
              type: 'string',
              description: 'Filter by status: active, paused, archived (default: returns all)',
            },
            experiment_type: {
              type: 'string',
              description: 'Filter by type: a/b, multivariate, personalization',
            },
            per_page: {
              type: 'number',
              description: 'Number of results per page (default: 25, max: 100)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
          },
          required: ['project_id'],
        },
      },
      {
        name: 'get_experiment',
        description: 'Get full details for a single Optimizely experiment including variations, metrics, and audiences',
        inputSchema: {
          type: 'object',
          properties: {
            experiment_id: {
              type: 'number',
              description: 'Numeric experiment ID',
            },
          },
          required: ['experiment_id'],
        },
      },
      {
        name: 'create_experiment',
        description: 'Create a new A/B experiment in an Optimizely project with specified variations and metrics',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: {
              type: 'number',
              description: 'Project ID to create the experiment in',
            },
            name: {
              type: 'string',
              description: 'Human-readable experiment name',
            },
            description: {
              type: 'string',
              description: 'Optional description of the experiment hypothesis',
            },
            type: {
              type: 'string',
              description: 'Experiment type: a/b (default), multivariate, personalization',
            },
            holdback: {
              type: 'number',
              description: 'Percentage of traffic held back from the experiment (0–10000, in basis points)',
            },
          },
          required: ['project_id', 'name'],
        },
      },
      {
        name: 'update_experiment',
        description: 'Update an existing experiment — modify name, description, status, traffic allocation, or metrics',
        inputSchema: {
          type: 'object',
          properties: {
            experiment_id: {
              type: 'number',
              description: 'Experiment ID to update',
            },
            name: {
              type: 'string',
              description: 'Updated experiment name',
            },
            description: {
              type: 'string',
              description: 'Updated description',
            },
            status: {
              type: 'string',
              description: 'New status: active, paused',
            },
            holdback: {
              type: 'number',
              description: 'Updated holdback percentage in basis points',
            },
          },
          required: ['experiment_id'],
        },
      },
      {
        name: 'archive_experiment',
        description: 'Archive an Optimizely experiment — removes it from active views without deleting results',
        inputSchema: {
          type: 'object',
          properties: {
            experiment_id: {
              type: 'number',
              description: 'Experiment ID to archive',
            },
          },
          required: ['experiment_id'],
        },
      },
      {
        name: 'list_features',
        description: 'List feature flags in an Optimizely project with optional environment and status filters',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: {
              type: 'number',
              description: 'Project ID to list features for',
            },
            per_page: {
              type: 'number',
              description: 'Number of results per page (default: 25, max: 100)',
            },
            page: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
          },
          required: ['project_id'],
        },
      },
      {
        name: 'get_feature',
        description: 'Get detailed configuration for a specific feature flag including variables and rollout rules',
        inputSchema: {
          type: 'object',
          properties: {
            feature_id: {
              type: 'number',
              description: 'Numeric feature flag ID',
            },
          },
          required: ['feature_id'],
        },
      },
      {
        name: 'create_feature',
        description: 'Create a new feature flag in an Optimizely project with optional variables',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: {
              type: 'number',
              description: 'Project ID to create the feature in',
            },
            key: {
              type: 'string',
              description: 'Unique feature key used in SDK calls (snake_case, e.g. "checkout_redesign")',
            },
            name: {
              type: 'string',
              description: 'Human-readable feature name',
            },
            description: {
              type: 'string',
              description: 'Optional description of the feature',
            },
          },
          required: ['project_id', 'key', 'name'],
        },
      },
      {
        name: 'update_feature',
        description: 'Update a feature flag — modify name, description, or variable definitions',
        inputSchema: {
          type: 'object',
          properties: {
            feature_id: {
              type: 'number',
              description: 'Feature flag ID to update',
            },
            name: {
              type: 'string',
              description: 'Updated feature name',
            },
            description: {
              type: 'string',
              description: 'Updated description',
            },
          },
          required: ['feature_id'],
        },
      },
      {
        name: 'list_audiences',
        description: 'List audiences defined in an Optimizely project with optional name filter',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: {
              type: 'number',
              description: 'Project ID to list audiences for',
            },
            per_page: {
              type: 'number',
              description: 'Number of results per page (default: 25, max: 100)',
            },
            page: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
          },
          required: ['project_id'],
        },
      },
      {
        name: 'get_audience',
        description: 'Get targeting conditions and metadata for a specific Optimizely audience by ID',
        inputSchema: {
          type: 'object',
          properties: {
            audience_id: {
              type: 'number',
              description: 'Numeric audience ID',
            },
          },
          required: ['audience_id'],
        },
      },
      {
        name: 'create_audience',
        description: 'Create a new audience with targeting conditions for use in experiments and feature rollouts',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: {
              type: 'number',
              description: 'Project ID to create the audience in',
            },
            name: {
              type: 'string',
              description: 'Audience name (e.g. "Mobile Users - US")',
            },
            description: {
              type: 'string',
              description: 'Optional description of who the audience targets',
            },
            conditions: {
              type: 'string',
              description: 'JSON string of audience conditions per Optimizely audience schema (e.g. browser, location, custom attributes)',
            },
          },
          required: ['project_id', 'name', 'conditions'],
        },
      },
      {
        name: 'get_results',
        description: 'Retrieve statistical experiment results including conversion rates, lift, and significance for all metrics',
        inputSchema: {
          type: 'object',
          properties: {
            experiment_id: {
              type: 'number',
              description: 'Experiment ID to retrieve results for',
            },
          },
          required: ['experiment_id'],
        },
      },
      {
        name: 'list_environments',
        description: 'List deployment environments in an Optimizely project (e.g. production, staging, development)',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: {
              type: 'number',
              description: 'Project ID to list environments for',
            },
          },
          required: ['project_id'],
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
        case 'list_experiments':
          return this.listExperiments(args);
        case 'get_experiment':
          return this.getExperiment(args);
        case 'create_experiment':
          return this.createExperiment(args);
        case 'update_experiment':
          return this.updateExperiment(args);
        case 'archive_experiment':
          return this.archiveExperiment(args);
        case 'list_features':
          return this.listFeatures(args);
        case 'get_feature':
          return this.getFeature(args);
        case 'create_feature':
          return this.createFeature(args);
        case 'update_feature':
          return this.updateFeature(args);
        case 'list_audiences':
          return this.listAudiences(args);
        case 'get_audience':
          return this.getAudience(args);
        case 'create_audience':
          return this.createAudience(args);
        case 'get_results':
          return this.getResults(args);
        case 'list_environments':
          return this.listEnvironments(args);
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
      Authorization: `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  private async apiGet(path: string, params: Record<string, string> = {}): Promise<ToolResult> {
    const qs = new URLSearchParams(params).toString();
    const url = `${this.baseUrl}${path}${qs ? '?' + qs : ''}`;
    const response = await this.fetchWithRetry(url, { method: 'GET', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apiPost(path: string, body: Record<string, unknown>): Promise<ToolResult> {
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

  private async apiPatch(path: string, body: Record<string, unknown>): Promise<ToolResult> {
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

  private async listProjects(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      per_page: String((args.per_page as number) ?? 25),
      page: String((args.page as number) ?? 1),
    };
    return this.apiGet('/projects', params);
  }

  private async getProject(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.project_id) return { content: [{ type: 'text', text: 'project_id is required' }], isError: true };
    return this.apiGet(`/projects/${encodeURIComponent(args.project_id as string)}`);
  }

  private async listExperiments(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.project_id) return { content: [{ type: 'text', text: 'project_id is required' }], isError: true };
    const params: Record<string, string> = {
      project_id: String(args.project_id),
      per_page: String((args.per_page as number) ?? 25),
      page: String((args.page as number) ?? 1),
    };
    if (args.status) params.status = args.status as string;
    if (args.experiment_type) params.type = args.experiment_type as string;
    return this.apiGet('/experiments', params);
  }

  private async getExperiment(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.experiment_id) return { content: [{ type: 'text', text: 'experiment_id is required' }], isError: true };
    return this.apiGet(`/experiments/${encodeURIComponent(args.experiment_id as string)}`);
  }

  private async createExperiment(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.project_id || !args.name) {
      return { content: [{ type: 'text', text: 'project_id and name are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      project_id: args.project_id,
      name: args.name,
      type: (args.type as string) ?? 'a/b',
    };
    if (args.description) body.description = args.description;
    if (args.holdback !== undefined) body.holdback = args.holdback;
    return this.apiPost('/experiments', body);
  }

  private async updateExperiment(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.experiment_id) return { content: [{ type: 'text', text: 'experiment_id is required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.name) body.name = args.name;
    if (args.description) body.description = args.description;
    if (args.status) body.status = args.status;
    if (args.holdback !== undefined) body.holdback = args.holdback;
    return this.apiPatch(`/experiments/${encodeURIComponent(args.experiment_id as string)}`, body);
  }

  private async archiveExperiment(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.experiment_id) return { content: [{ type: 'text', text: 'experiment_id is required' }], isError: true };
    return this.apiPatch(`/experiments/${encodeURIComponent(args.experiment_id as string)}`, { status: 'archived' });
  }

  private async listFeatures(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.project_id) return { content: [{ type: 'text', text: 'project_id is required' }], isError: true };
    const params: Record<string, string> = {
      project_id: String(args.project_id),
      per_page: String((args.per_page as number) ?? 25),
      page: String((args.page as number) ?? 1),
    };
    return this.apiGet('/features', params);
  }

  private async getFeature(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.feature_id) return { content: [{ type: 'text', text: 'feature_id is required' }], isError: true };
    return this.apiGet(`/features/${encodeURIComponent(args.feature_id as string)}`);
  }

  private async createFeature(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.project_id || !args.key || !args.name) {
      return { content: [{ type: 'text', text: 'project_id, key, and name are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      project_id: args.project_id,
      key: args.key,
      name: args.name,
    };
    if (args.description) body.description = args.description;
    return this.apiPost('/features', body);
  }

  private async updateFeature(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.feature_id) return { content: [{ type: 'text', text: 'feature_id is required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.name) body.name = args.name;
    if (args.description) body.description = args.description;
    return this.apiPatch(`/features/${encodeURIComponent(args.feature_id as string)}`, body);
  }

  private async listAudiences(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.project_id) return { content: [{ type: 'text', text: 'project_id is required' }], isError: true };
    const params: Record<string, string> = {
      project_id: String(args.project_id),
      per_page: String((args.per_page as number) ?? 25),
      page: String((args.page as number) ?? 1),
    };
    return this.apiGet('/audiences', params);
  }

  private async getAudience(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.audience_id) return { content: [{ type: 'text', text: 'audience_id is required' }], isError: true };
    return this.apiGet(`/audiences/${encodeURIComponent(args.audience_id as string)}`);
  }

  private async createAudience(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.project_id || !args.name || !args.conditions) {
      return { content: [{ type: 'text', text: 'project_id, name, and conditions are required' }], isError: true };
    }
    let conditionsParsed: unknown;
    try {
      conditionsParsed = JSON.parse(args.conditions as string);
    } catch {
      return { content: [{ type: 'text', text: 'conditions must be valid JSON' }], isError: true };
    }
    const body: Record<string, unknown> = {
      project_id: args.project_id,
      name: args.name,
      conditions: conditionsParsed,
    };
    if (args.description) body.description = args.description;
    return this.apiPost('/audiences', body);
  }

  private async getResults(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.experiment_id) return { content: [{ type: 'text', text: 'experiment_id is required' }], isError: true };
    return this.apiGet(`/experiments/${encodeURIComponent(args.experiment_id as string)}/results`);
  }

  private async listEnvironments(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.project_id) return { content: [{ type: 'text', text: 'project_id is required' }], isError: true };
    return this.apiGet('/environments', { project_id: String(args.project_id) });
  }
}

/**
 * Weights & Biases MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/wandb/wandb-mcp-server — transport: stdio + hosted HTTPS, auth: API key
// MCP maintained: yes — last commit 2026-03-25. MCP tool count: 6.
// Vendor MCP tools (6): query_wandb_tool, query_weave_traces_tool, count_weave_traces_tool,
//   create_wandb_report_tool, query_wandb_entity_projects, query_wandb_support_bot.
// Our adapter covers 12 tools via GraphQL (projects, runs, artifacts, sweeps, reports, metrics).
// Integration: use-both — MCP has unique tools (Weave traces, support bot, natural-language run queries)
//   not available via REST/GraphQL; our adapter has unique tools (list_artifacts, list_artifact_versions,
//   list_sweeps, get_sweep, list_reports, get_run_metrics) not exposed by the MCP.
// MCP-sourced tools (6): query_wandb_tool (run search), query_weave_traces_tool, count_weave_traces_tool,
//   create_wandb_report_tool, query_wandb_entity_projects, query_wandb_support_bot.
// REST-sourced tools (12): list_projects, get_project, list_runs, get_run, search_runs,
//   list_artifacts, get_artifact, list_artifact_versions, list_sweeps, get_sweep,
//   list_reports, get_run_metrics.
// Combined coverage: 18 tools (MCP: 6 + REST: 12; shared: 0 — different interfaces to same data).
//
// Base URL: https://api.wandb.ai
// Auth: Bearer token — Authorization: Bearer <api_key>. Obtain API key at wandb.ai/settings.
// Docs: https://docs.wandb.ai/ref/python/public-api / https://docs.wandb.ai/platform/mcp-server
// Rate limits: Not publicly documented; W&B recommends limiting to ~10 req/s per key.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface WandBConfig {
  apiKey: string;
  baseUrl?: string;
}

export class WandBMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: WandBConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? 'https://api.wandb.ai';
  }

  static catalog() {
    return {
      name: 'wandb',
      displayName: 'Weights & Biases',
      version: '1.0.0',
      category: 'ai-ml' as const,
      keywords: ['wandb', 'weights-biases', 'mlops', 'experiment', 'run', 'sweep', 'artifact', 'model', 'training', 'metrics', 'ml'],
      toolNames: [
        'list_projects', 'get_project', 'list_runs', 'get_run', 'search_runs',
        'list_artifacts', 'get_artifact', 'list_artifact_versions',
        'list_sweeps', 'get_sweep',
        'list_reports', 'get_run_metrics',
      ],
      description: 'ML experiment tracking: list and query runs, sweeps, artifacts, projects, and metrics. Supports filtering, search, and pagination.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_projects',
        description: 'List W&B projects for an entity (user or team) with optional pagination',
        inputSchema: {
          type: 'object',
          properties: {
            entity: { type: 'string', description: 'Entity name — W&B username or team name' },
            perPage: { type: 'number', description: 'Results per page (default: 50, max: 100)' },
            page: { type: 'number', description: 'Page number for pagination (default: 1)' },
          },
          required: ['entity'],
        },
      },
      {
        name: 'get_project',
        description: 'Get details for a single W&B project by entity and project name',
        inputSchema: {
          type: 'object',
          properties: {
            entity: { type: 'string', description: 'Entity (user or team) name' },
            project: { type: 'string', description: 'Project name' },
          },
          required: ['entity', 'project'],
        },
      },
      {
        name: 'list_runs',
        description: 'List runs for a W&B project with optional filters for state and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            entity: { type: 'string', description: 'Entity (user or team) name' },
            project: { type: 'string', description: 'Project name' },
            perPage: { type: 'number', description: 'Results per page (default: 50, max: 100)' },
            page: { type: 'number', description: 'Page number for pagination (default: 1)' },
            state: { type: 'string', description: 'Filter by run state: running, finished, crashed, killed (optional)' },
          },
          required: ['entity', 'project'],
        },
      },
      {
        name: 'get_run',
        description: 'Get full details for a single W&B run including config, summary, and system metrics',
        inputSchema: {
          type: 'object',
          properties: {
            entity: { type: 'string', description: 'Entity (user or team) name' },
            project: { type: 'string', description: 'Project name' },
            runId: { type: 'string', description: 'Run ID (the short alphanumeric ID shown in the W&B UI)' },
          },
          required: ['entity', 'project', 'runId'],
        },
      },
      {
        name: 'search_runs',
        description: 'Search and filter W&B runs using MongoDB-style query filters on config and summary metrics',
        inputSchema: {
          type: 'object',
          properties: {
            entity: { type: 'string', description: 'Entity (user or team) name' },
            project: { type: 'string', description: 'Project name' },
            filters: { type: 'object', description: 'MongoDB-style filter object, e.g. {"config.lr": {"$gt": 0.001}}' },
            order: { type: 'string', description: 'Sort field prefixed with + (asc) or - (desc), e.g. -summary_metrics.val_acc' },
            perPage: { type: 'number', description: 'Results per page (default: 50, max: 100)' },
          },
          required: ['entity', 'project'],
        },
      },
      {
        name: 'list_artifacts',
        description: 'List artifact collections for a W&B project, optionally filtered by artifact type',
        inputSchema: {
          type: 'object',
          properties: {
            entity: { type: 'string', description: 'Entity (user or team) name' },
            project: { type: 'string', description: 'Project name' },
            type: { type: 'string', description: 'Artifact type filter: dataset, model, result, or custom type (optional)' },
            perPage: { type: 'number', description: 'Results per page (default: 50)' },
          },
          required: ['entity', 'project'],
        },
      },
      {
        name: 'get_artifact',
        description: 'Get details for a specific W&B artifact collection including versions and metadata',
        inputSchema: {
          type: 'object',
          properties: {
            entity: { type: 'string', description: 'Entity (user or team) name' },
            project: { type: 'string', description: 'Project name' },
            artifactName: { type: 'string', description: 'Artifact collection name' },
            artifactType: { type: 'string', description: 'Artifact type (e.g. model, dataset)' },
          },
          required: ['entity', 'project', 'artifactName', 'artifactType'],
        },
      },
      {
        name: 'list_artifact_versions',
        description: 'List all versions of a W&B artifact collection with aliases and file metadata',
        inputSchema: {
          type: 'object',
          properties: {
            entity: { type: 'string', description: 'Entity (user or team) name' },
            project: { type: 'string', description: 'Project name' },
            artifactName: { type: 'string', description: 'Artifact collection name' },
            artifactType: { type: 'string', description: 'Artifact type (e.g. model, dataset)' },
            perPage: { type: 'number', description: 'Results per page (default: 50)' },
          },
          required: ['entity', 'project', 'artifactName', 'artifactType'],
        },
      },
      {
        name: 'list_sweeps',
        description: 'List hyperparameter sweeps for a W&B project with status and run counts',
        inputSchema: {
          type: 'object',
          properties: {
            entity: { type: 'string', description: 'Entity (user or team) name' },
            project: { type: 'string', description: 'Project name' },
          },
          required: ['entity', 'project'],
        },
      },
      {
        name: 'get_sweep',
        description: 'Get configuration and run details for a specific W&B hyperparameter sweep',
        inputSchema: {
          type: 'object',
          properties: {
            entity: { type: 'string', description: 'Entity (user or team) name' },
            project: { type: 'string', description: 'Project name' },
            sweepId: { type: 'string', description: 'Sweep ID' },
          },
          required: ['entity', 'project', 'sweepId'],
        },
      },
      {
        name: 'list_reports',
        description: 'List W&B reports (Weights & Biases reports/pages) for a project',
        inputSchema: {
          type: 'object',
          properties: {
            entity: { type: 'string', description: 'Entity (user or team) name' },
            project: { type: 'string', description: 'Project name' },
            perPage: { type: 'number', description: 'Results per page (default: 50)' },
          },
          required: ['entity', 'project'],
        },
      },
      {
        name: 'get_run_metrics',
        description: 'Get sampled metric history for a W&B run, optionally limited to specific metric keys',
        inputSchema: {
          type: 'object',
          properties: {
            entity: { type: 'string', description: 'Entity (user or team) name' },
            project: { type: 'string', description: 'Project name' },
            runId: { type: 'string', description: 'Run ID' },
            keys: { type: 'array', description: 'Specific metric keys to retrieve (optional — returns all if omitted)', items: { type: 'string' } },
            samples: { type: 'number', description: 'Number of samples to return (default: 500, max: 10000)' },
          },
          required: ['entity', 'project', 'runId'],
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
        case 'search_runs':
          return await this.searchRuns(args);
        case 'list_artifacts':
          return await this.listArtifacts(args);
        case 'get_artifact':
          return await this.getArtifact(args);
        case 'list_artifact_versions':
          return await this.listArtifactVersions(args);
        case 'list_sweeps':
          return await this.listSweeps(args);
        case 'get_sweep':
          return await this.getSweep(args);
        case 'list_reports':
          return await this.listReports(args);
        case 'get_run_metrics':
          return await this.getRunMetrics(args);
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

  private headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  private async graphql(query: string, variables: Record<string, unknown>): Promise<unknown> {
    const response = await this.fetchWithRetry(`${this.baseUrl}/graphql`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ query, variables }),
    });
    if (!response.ok) {
      const text = await response.text().catch(() => response.statusText);
      throw new Error(`W&B API error: ${response.status} ${text}`);
    }
    const data = await response.json() as { errors?: Array<{ message: string }>; data: unknown };
    if (data.errors && data.errors.length > 0) {
      throw new Error(`W&B GraphQL error: ${data.errors.map((e) => e.message).join(', ')}`);
    }
    return data.data;
  }

  private async listProjects(args: Record<string, unknown>): Promise<ToolResult> {
    const entity = args.entity as string;
    const perPage = (args.perPage as number) ?? 50;
    const page = (args.page as number) ?? 1;

    const data = await this.graphql(`
      query ListProjects($entity: String!, $first: Int, $after: String) {
        entity(name: $entity) {
          projects(first: $first) {
            pageInfo { hasNextPage endCursor }
            edges {
              node {
                id name description entityName
                createdAt updatedAt
                runCount
              }
            }
          }
        }
      }
    `, { entity, first: perPage, after: page > 1 ? String((page - 1) * perPage) : null });

    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getProject(args: Record<string, unknown>): Promise<ToolResult> {
    const data = await this.graphql(`
      query GetProject($entity: String!, $project: String!) {
        project(entityName: $entity, name: $project) {
          id name description entityName
          createdAt updatedAt
          runCount artifactCount
        }
      }
    `, { entity: args.entity as string, project: args.project as string });

    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listRuns(args: Record<string, unknown>): Promise<ToolResult> {
    const variables: Record<string, unknown> = {
      entity: args.entity as string,
      project: args.project as string,
      first: (args.perPage as number) ?? 50,
    };
    if (args.state) variables.state = args.state;

    const data = await this.graphql(`
      query ListRuns($entity: String!, $project: String!, $first: Int, $state: String) {
        project(entityName: $entity, name: $project) {
          runs(first: $first, filters: $state) {
            pageInfo { hasNextPage endCursor }
            edges {
              node {
                id name displayName state
                createdAt heartbeatAt
                user { name }
                tags
                summaryMetrics
              }
            }
          }
        }
      }
    `, variables);

    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getRun(args: Record<string, unknown>): Promise<ToolResult> {
    const data = await this.graphql(`
      query GetRun($entity: String!, $project: String!, $runId: String!) {
        project(entityName: $entity, name: $project) {
          run(name: $runId) {
            id name displayName state
            createdAt heartbeatAt updatedAt
            user { name }
            tags
            config
            summaryMetrics
            host
            commit
            jobType
            notes
          }
        }
      }
    `, { entity: args.entity as string, project: args.project as string, runId: args.runId as string });

    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async searchRuns(args: Record<string, unknown>): Promise<ToolResult> {
    const variables: Record<string, unknown> = {
      entity: args.entity as string,
      project: args.project as string,
      first: (args.perPage as number) ?? 50,
    };
    if (args.filters) variables.filters = JSON.stringify(args.filters);
    if (args.order) variables.order = args.order;

    const data = await this.graphql(`
      query SearchRuns($entity: String!, $project: String!, $first: Int, $filters: JSONString, $order: String) {
        project(entityName: $entity, name: $project) {
          runs(first: $first, filters: $filters, order: $order) {
            pageInfo { hasNextPage endCursor }
            edges {
              node {
                id name displayName state
                createdAt heartbeatAt
                user { name }
                tags
                config
                summaryMetrics
              }
            }
          }
        }
      }
    `, variables);

    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listArtifacts(args: Record<string, unknown>): Promise<ToolResult> {
    const variables: Record<string, unknown> = {
      entity: args.entity as string,
      project: args.project as string,
      first: (args.perPage as number) ?? 50,
    };
    if (args.type) variables.type = args.type;

    const data = await this.graphql(`
      query ListArtifacts($entity: String!, $project: String!, $type: String, $first: Int) {
        project(entityName: $entity, name: $project) {
          artifactCollections(collectionTypes: [$type], first: $first) {
            pageInfo { hasNextPage endCursor }
            edges {
              node {
                id name description
                artifactSequenceType
                createdAt
                artifactMembershipsCount
              }
            }
          }
        }
      }
    `, variables);

    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getArtifact(args: Record<string, unknown>): Promise<ToolResult> {
    const data = await this.graphql(`
      query GetArtifact($entity: String!, $project: String!, $artifactName: String!, $artifactType: String!) {
        project(entityName: $entity, name: $project) {
          artifactCollection(name: $artifactName, collectionType: $artifactType) {
            id name description artifactSequenceType
            createdAt updatedAt
            artifactMembershipsCount
            tags { name }
          }
        }
      }
    `, {
      entity: args.entity as string,
      project: args.project as string,
      artifactName: args.artifactName as string,
      artifactType: args.artifactType as string,
    });

    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listArtifactVersions(args: Record<string, unknown>): Promise<ToolResult> {
    const data = await this.graphql(`
      query ListArtifactVersions($entity: String!, $project: String!, $artifactName: String!, $artifactType: String!, $first: Int) {
        project(entityName: $entity, name: $project) {
          artifactCollection(name: $artifactName, collectionType: $artifactType) {
            artifactMemberships(first: $first) {
              pageInfo { hasNextPage endCursor }
              edges {
                node {
                  versionIndex aliases { alias }
                  artifact {
                    id digest size state
                    createdAt
                    description
                    metadata
                    fileCount
                  }
                }
              }
            }
          }
        }
      }
    `, {
      entity: args.entity as string,
      project: args.project as string,
      artifactName: args.artifactName as string,
      artifactType: args.artifactType as string,
      first: (args.perPage as number) ?? 50,
    });

    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listSweeps(args: Record<string, unknown>): Promise<ToolResult> {
    const data = await this.graphql(`
      query ListSweeps($entity: String!, $project: String!) {
        project(entityName: $entity, name: $project) {
          sweeps {
            edges {
              node {
                id name displayName state
                createdAt updatedAt
                runCountExpected runCount
                bestLoss
              }
            }
          }
        }
      }
    `, { entity: args.entity as string, project: args.project as string });

    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getSweep(args: Record<string, unknown>): Promise<ToolResult> {
    const data = await this.graphql(`
      query GetSweep($entity: String!, $project: String!, $sweepId: String!) {
        project(entityName: $entity, name: $project) {
          sweep(sweepName: $sweepId) {
            id name displayName state
            createdAt updatedAt
            config
            runCountExpected runCount
            bestLoss
            runs(first: 20) {
              edges {
                node { id name displayName state summaryMetrics }
              }
            }
          }
        }
      }
    `, { entity: args.entity as string, project: args.project as string, sweepId: args.sweepId as string });

    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listReports(args: Record<string, unknown>): Promise<ToolResult> {
    const data = await this.graphql(`
      query ListReports($entity: String!, $project: String!, $first: Int) {
        project(entityName: $entity, name: $project) {
          views(first: $first, viewType: "runs/graphs") {
            pageInfo { hasNextPage endCursor }
            edges {
              node {
                id name description
                createdAt updatedAt
                user { name }
              }
            }
          }
        }
      }
    `, { entity: args.entity as string, project: args.project as string, first: (args.perPage as number) ?? 50 });

    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getRunMetrics(args: Record<string, unknown>): Promise<ToolResult> {
    const variables: Record<string, unknown> = {
      entity: args.entity as string,
      project: args.project as string,
      runId: args.runId as string,
      samples: (args.samples as number) ?? 500,
    };
    if (args.keys) variables.keys = args.keys;

    const data = await this.graphql(`
      query GetRunMetrics($entity: String!, $project: String!, $runId: String!, $keys: [String], $samples: Int) {
        project(entityName: $entity, name: $project) {
          run(name: $runId) {
            id name
            sampledHistory(keys: $keys, samples: $samples)
          }
        }
      }
    `, variables);

    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }
}

/**
 * Power BI MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP (Modeling): https://github.com/microsoft/powerbi-modeling-mcp — transport: stdio, local desktop only.
//   Covers semantic modeling (DAX, measures, relationships) via Tabular Object Model. Tools: connection_operations,
//   database_operations, transaction_operations, model_operations, table_operations, column_operations,
//   measure_operations, relationship_operations, hierarchy_operations, partition_operations, perspective_operations,
//   role_operations, table_permission_operations. ~13 operation-group tools. Semantic modeling ONLY.
// Official MCP (Remote): https://api.powerbi.com/v1.0/myorg/mcp (docs: https://learn.microsoft.com/en-us/power-bi/developer/mcp/)
//   — transport: streamable-HTTP, auth: Azure AD Bearer token. Tools: get_semantic_model_schema, run_dax_query.
//   Covers only natural-language DAX queries against cloud semantic models. Preview as of 2026-03.
// Our adapter covers: 18 tools (cloud REST API — reports, datasets, workspaces, dashboards, dataflows,
//   pipelines, refresh operations, capacity, apps). Neither vendor MCP covers cloud REST operations.
// Integration: use-both
//   REST-sourced tools (18): list_workspaces, list_reports, get_report, clone_report, list_datasets, get_dataset,
//     refresh_dataset, get_refresh_history, get_dataset_tables, list_dashboards, list_dashboard_tiles,
//     list_dataflows, refresh_dataflow, list_pipelines, get_pipeline, deploy_pipeline_stage, get_capacity, list_apps
//   Modeling MCP-sourced tools (~13 groups): semantic model design, DAX measures, tables, columns, relationships
//   Remote MCP-sourced tools (2): get_semantic_model_schema, run_dax_query (natural-language data queries)
// Recommendation: use-both — our REST adapter handles all cloud management operations (zero overlap with vendor MCPs).
//   Use Modeling MCP for semantic model design. Use Remote MCP for conversational DAX queries.
//
// Base URL: https://api.powerbi.com/v1.0/myorg
// Auth: Azure AD / Microsoft Entra Bearer token — obtain via OAuth2 client credentials flow:
//   POST https://login.microsoftonline.com/{tenantId}/oauth2/v2.0/token
//   scope: https://analysis.windows.net/powerbi/api/.default
// Docs: https://learn.microsoft.com/en-us/rest/api/power-bi/
// Rate limits: Not formally documented; Microsoft recommends ≤200 requests/hour for dataset refreshes;
//   general REST calls are throttled at service level per tenant

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface PowerBIConfig {
  /**
   * Azure AD / Microsoft Entra access token for the Power BI service.
   * Obtain via OAuth2 client credentials flow:
   *   POST https://login.microsoftonline.com/{tenantId}/oauth2/v2.0/token
   *   with scope https://analysis.windows.net/powerbi/api/.default
   */
  accessToken: string;
  /**
   * Override the Power BI REST API base URL.
   * Defaults to https://api.powerbi.com/v1.0/myorg
   */
  baseUrl?: string;
}

export class PowerBIMCPServer extends MCPAdapterBase {
  private readonly accessToken: string;
  private readonly baseUrl: string;

  constructor(config: PowerBIConfig) {
    super();
    this.accessToken = config.accessToken;
    this.baseUrl = (config.baseUrl ?? 'https://api.powerbi.com/v1.0/myorg').replace(/\/$/, '');
  }

  static catalog() {
    return {
      name: 'power-bi',
      displayName: 'Power BI',
      version: '1.0.0',
      category: 'data' as const,
      keywords: ['power-bi', 'powerbi', 'microsoft', 'report', 'dataset', 'dashboard', 'workspace', 'dataflow', 'pipeline', 'bi', 'analytics', 'refresh'],
      toolNames: [
        'list_workspaces', 'list_reports', 'get_report', 'clone_report',
        'list_datasets', 'get_dataset', 'refresh_dataset', 'get_refresh_history', 'get_dataset_tables',
        'list_dashboards', 'list_dashboard_tiles',
        'list_dataflows', 'refresh_dataflow',
        'list_pipelines', 'get_pipeline', 'deploy_pipeline_stage',
        'get_capacity', 'list_apps',
      ],
      description: 'Manage Power BI cloud resources: reports, datasets, dashboards, dataflows, deployment pipelines, and scheduled refreshes.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_workspaces',
        description: 'List all Power BI workspaces (groups) the service principal has access to, with optional OData filter and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            filter: {
              type: 'string',
              description: "OData $filter expression (e.g. \"type eq 'Workspace'\")",
            },
            top: {
              type: 'number',
              description: 'Maximum number of workspaces to return ($top)',
            },
            skip: {
              type: 'number',
              description: 'Number of workspaces to skip for pagination ($skip)',
            },
          },
        },
      },
      {
        name: 'list_reports',
        description: 'List reports in a workspace, or all reports in My workspace if no workspaceId is provided',
        inputSchema: {
          type: 'object',
          properties: {
            workspaceId: {
              type: 'string',
              description: 'The workspace (group) ID (GUID). Omit to list reports in My workspace.',
            },
          },
        },
      },
      {
        name: 'get_report',
        description: 'Get metadata and configuration details of a specific Power BI report by ID',
        inputSchema: {
          type: 'object',
          properties: {
            reportId: {
              type: 'string',
              description: 'The report ID (GUID)',
            },
            workspaceId: {
              type: 'string',
              description: 'The workspace ID containing the report. Omit for My workspace.',
            },
          },
          required: ['reportId'],
        },
      },
      {
        name: 'clone_report',
        description: 'Clone a Power BI report to another workspace or dataset, creating an independent copy',
        inputSchema: {
          type: 'object',
          properties: {
            reportId: {
              type: 'string',
              description: 'The source report ID (GUID) to clone',
            },
            workspaceId: {
              type: 'string',
              description: 'The workspace ID containing the source report. Omit for My workspace.',
            },
            name: {
              type: 'string',
              description: 'Name for the cloned report',
            },
            targetWorkspaceId: {
              type: 'string',
              description: 'Target workspace ID to clone the report into (optional, defaults to same workspace)',
            },
            targetDatasetId: {
              type: 'string',
              description: 'Target dataset ID to rebind the cloned report to (optional)',
            },
          },
          required: ['reportId', 'name'],
        },
      },
      {
        name: 'list_datasets',
        description: 'List datasets (semantic models) in a workspace, or all datasets in My workspace if no workspaceId is provided',
        inputSchema: {
          type: 'object',
          properties: {
            workspaceId: {
              type: 'string',
              description: 'The workspace (group) ID. Omit to list datasets in My workspace.',
            },
          },
        },
      },
      {
        name: 'get_dataset',
        description: 'Get metadata and configuration details of a specific Power BI dataset (semantic model)',
        inputSchema: {
          type: 'object',
          properties: {
            datasetId: {
              type: 'string',
              description: 'The dataset ID (GUID)',
            },
            workspaceId: {
              type: 'string',
              description: 'The workspace ID containing the dataset. Omit for My workspace.',
            },
          },
          required: ['datasetId'],
        },
      },
      {
        name: 'refresh_dataset',
        description: 'Trigger an on-demand refresh for a Power BI dataset. Returns 202 Accepted on success.',
        inputSchema: {
          type: 'object',
          properties: {
            datasetId: {
              type: 'string',
              description: 'The dataset ID (GUID) to refresh',
            },
            workspaceId: {
              type: 'string',
              description: 'The workspace ID containing the dataset. Omit for My workspace.',
            },
            notifyOption: {
              type: 'string',
              description: 'Notification option: MailOnCompletion, MailOnFailure, or NoNotification (default: NoNotification)',
            },
          },
          required: ['datasetId'],
        },
      },
      {
        name: 'get_refresh_history',
        description: 'Get the refresh history for a Power BI dataset including status and timestamps of recent refreshes',
        inputSchema: {
          type: 'object',
          properties: {
            datasetId: {
              type: 'string',
              description: 'The dataset ID (GUID)',
            },
            workspaceId: {
              type: 'string',
              description: 'The workspace ID containing the dataset. Omit for My workspace.',
            },
            top: {
              type: 'number',
              description: 'Maximum number of refresh history records to return ($top)',
            },
          },
          required: ['datasetId'],
        },
      },
      {
        name: 'get_dataset_tables',
        description: 'List tables in a push or streaming dataset to inspect schema and column definitions',
        inputSchema: {
          type: 'object',
          properties: {
            datasetId: {
              type: 'string',
              description: 'The dataset ID (GUID)',
            },
            workspaceId: {
              type: 'string',
              description: 'The workspace ID containing the dataset. Omit for My workspace.',
            },
          },
          required: ['datasetId'],
        },
      },
      {
        name: 'list_dashboards',
        description: 'List dashboards in a workspace, or all dashboards in My workspace if no workspaceId is provided',
        inputSchema: {
          type: 'object',
          properties: {
            workspaceId: {
              type: 'string',
              description: 'The workspace (group) ID. Omit to list dashboards in My workspace.',
            },
          },
        },
      },
      {
        name: 'list_dashboard_tiles',
        description: 'List all tiles on a specific Power BI dashboard with their datasource info',
        inputSchema: {
          type: 'object',
          properties: {
            dashboardId: {
              type: 'string',
              description: 'The dashboard ID (GUID)',
            },
            workspaceId: {
              type: 'string',
              description: 'The workspace ID containing the dashboard. Omit for My workspace.',
            },
          },
          required: ['dashboardId'],
        },
      },
      {
        name: 'list_dataflows',
        description: 'List dataflows in a Power BI workspace including their schedule and datasource configurations',
        inputSchema: {
          type: 'object',
          properties: {
            workspaceId: {
              type: 'string',
              description: 'The workspace (group) ID to list dataflows from',
            },
          },
          required: ['workspaceId'],
        },
      },
      {
        name: 'refresh_dataflow',
        description: 'Trigger an on-demand refresh for a Power BI dataflow in a workspace',
        inputSchema: {
          type: 'object',
          properties: {
            workspaceId: {
              type: 'string',
              description: 'The workspace ID containing the dataflow',
            },
            dataflowId: {
              type: 'string',
              description: 'The dataflow ID (GUID) to refresh',
            },
            notifyOption: {
              type: 'string',
              description: 'Notification option: MailOnCompletion, MailOnFailure, or NoNotification (default: NoNotification)',
            },
          },
          required: ['workspaceId', 'dataflowId'],
        },
      },
      {
        name: 'list_pipelines',
        description: 'List all deployment pipelines the user has access to for promoting content between dev/test/production',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_pipeline',
        description: 'Get details and stage configuration for a specific Power BI deployment pipeline',
        inputSchema: {
          type: 'object',
          properties: {
            pipelineId: {
              type: 'string',
              description: 'The deployment pipeline ID (GUID)',
            },
          },
          required: ['pipelineId'],
        },
      },
      {
        name: 'deploy_pipeline_stage',
        description: 'Deploy content from one pipeline stage to the next (e.g. dev to test, or test to production)',
        inputSchema: {
          type: 'object',
          properties: {
            pipelineId: {
              type: 'string',
              description: 'The deployment pipeline ID (GUID)',
            },
            sourceStageOrder: {
              type: 'number',
              description: 'Source stage order: 0=development, 1=test, 2=production',
            },
            isBackwardDeployment: {
              type: 'boolean',
              description: 'Deploy backward from a higher stage to a lower stage (default: false)',
            },
          },
          required: ['pipelineId', 'sourceStageOrder'],
        },
      },
      {
        name: 'get_capacity',
        description: 'List all Power BI Premium and Fabric capacities the user has access to',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'list_apps',
        description: 'List all Power BI apps installed for the authenticated user',
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
        case 'list_workspaces':
          return await this.listWorkspaces(args);
        case 'list_reports':
          return await this.listReports(args);
        case 'get_report':
          return await this.getReport(args);
        case 'clone_report':
          return await this.cloneReport(args);
        case 'list_datasets':
          return await this.listDatasets(args);
        case 'get_dataset':
          return await this.getDataset(args);
        case 'refresh_dataset':
          return await this.refreshDataset(args);
        case 'get_refresh_history':
          return await this.getRefreshHistory(args);
        case 'get_dataset_tables':
          return await this.getDatasetTables(args);
        case 'list_dashboards':
          return await this.listDashboards(args);
        case 'list_dashboard_tiles':
          return await this.listDashboardTiles(args);
        case 'list_dataflows':
          return await this.listDataflows(args);
        case 'refresh_dataflow':
          return await this.refreshDataflow(args);
        case 'list_pipelines':
          return await this.listPipelines();
        case 'get_pipeline':
          return await this.getPipeline(args);
        case 'deploy_pipeline_stage':
          return await this.deployPipelineStage(args);
        case 'get_capacity':
          return await this.getCapacity();
        case 'list_apps':
          return await this.listApps();
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

  private get authHeaders(): Record<string, string> {
    return {
      'Authorization': `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
    };
  }

  private async fetchJSON(url: string, options?: RequestInit): Promise<ToolResult> {
    const response = await this.fetchWithRetry(url, { headers: this.authHeaders, ...options });
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      return {
        content: [{ type: 'text', text: `Power BI API error: HTTP ${response.status} ${response.statusText}${body ? ` — ${body.slice(0, 500)}` : ''}` }],
        isError: true,
      };
    }
    // Some Power BI operations return 202/204 with no body
    if (response.status === 202 || response.status === 204) {
      return { content: [{ type: 'text', text: `Operation accepted (HTTP ${response.status})` }], isError: false };
    }
    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new Error(`Power BI returned non-JSON response (HTTP ${response.status})`);
    }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private groupPath(workspaceId?: string): string {
    return workspaceId ? `/groups/${encodeURIComponent(workspaceId)}` : '';
  }

  private async listWorkspaces(args: Record<string, unknown>): Promise<ToolResult> {
    const params: string[] = [];
    if (args.filter) params.push(`$filter=${encodeURIComponent(args.filter as string)}`);
    if (args.top) params.push(`$top=${encodeURIComponent(args.top as number)}`);
    if (args.skip) params.push(`$skip=${encodeURIComponent(args.skip as number)}`);
    const qs = params.length ? `?${params.join('&')}` : '';
    return this.fetchJSON(`${this.baseUrl}/groups${qs}`);
  }

  private async listReports(args: Record<string, unknown>): Promise<ToolResult> {
    const prefix = this.groupPath(args.workspaceId as string | undefined);
    return this.fetchJSON(`${this.baseUrl}${prefix}/reports`);
  }

  private async getReport(args: Record<string, unknown>): Promise<ToolResult> {
    const reportId = args.reportId as string;
    if (!reportId) return { content: [{ type: 'text', text: 'reportId is required' }], isError: true };
    const prefix = this.groupPath(args.workspaceId as string | undefined);
    return this.fetchJSON(`${this.baseUrl}${prefix}/reports/${encodeURIComponent(reportId)}`);
  }

  private async cloneReport(args: Record<string, unknown>): Promise<ToolResult> {
    const reportId = args.reportId as string;
    const name = args.name as string;
    if (!reportId || !name) return { content: [{ type: 'text', text: 'reportId and name are required' }], isError: true };
    const prefix = this.groupPath(args.workspaceId as string | undefined);
    const body: Record<string, unknown> = { name };
    if (args.targetWorkspaceId) body.targetWorkspaceId = args.targetWorkspaceId;
    if (args.targetDatasetId) body.targetModelId = args.targetDatasetId;
    return this.fetchJSON(
      `${this.baseUrl}${prefix}/reports/${encodeURIComponent(reportId)}/Clone`,
      { method: 'POST', body: JSON.stringify(body) },
    );
  }

  private async listDatasets(args: Record<string, unknown>): Promise<ToolResult> {
    const prefix = this.groupPath(args.workspaceId as string | undefined);
    return this.fetchJSON(`${this.baseUrl}${prefix}/datasets`);
  }

  private async getDataset(args: Record<string, unknown>): Promise<ToolResult> {
    const datasetId = args.datasetId as string;
    if (!datasetId) return { content: [{ type: 'text', text: 'datasetId is required' }], isError: true };
    const prefix = this.groupPath(args.workspaceId as string | undefined);
    return this.fetchJSON(`${this.baseUrl}${prefix}/datasets/${encodeURIComponent(datasetId)}`);
  }

  private async refreshDataset(args: Record<string, unknown>): Promise<ToolResult> {
    const datasetId = args.datasetId as string;
    if (!datasetId) return { content: [{ type: 'text', text: 'datasetId is required' }], isError: true };
    const prefix = this.groupPath(args.workspaceId as string | undefined);
    const body: Record<string, unknown> = {};
    if (args.notifyOption) body.notifyOption = args.notifyOption as string;
    return this.fetchJSON(
      `${this.baseUrl}${prefix}/datasets/${encodeURIComponent(datasetId)}/refreshes`,
      { method: 'POST', body: JSON.stringify(body) },
    );
  }

  private async getRefreshHistory(args: Record<string, unknown>): Promise<ToolResult> {
    const datasetId = args.datasetId as string;
    if (!datasetId) return { content: [{ type: 'text', text: 'datasetId is required' }], isError: true };
    const prefix = this.groupPath(args.workspaceId as string | undefined);
    const qs = args.top ? `?$top=${encodeURIComponent(args.top as number)}` : '';
    return this.fetchJSON(`${this.baseUrl}${prefix}/datasets/${encodeURIComponent(datasetId)}/refreshes${qs}`);
  }

  private async getDatasetTables(args: Record<string, unknown>): Promise<ToolResult> {
    const datasetId = args.datasetId as string;
    if (!datasetId) return { content: [{ type: 'text', text: 'datasetId is required' }], isError: true };
    const prefix = this.groupPath(args.workspaceId as string | undefined);
    return this.fetchJSON(`${this.baseUrl}${prefix}/datasets/${encodeURIComponent(datasetId)}/tables`);
  }

  private async listDashboards(args: Record<string, unknown>): Promise<ToolResult> {
    const prefix = this.groupPath(args.workspaceId as string | undefined);
    return this.fetchJSON(`${this.baseUrl}${prefix}/dashboards`);
  }

  private async listDashboardTiles(args: Record<string, unknown>): Promise<ToolResult> {
    const dashboardId = args.dashboardId as string;
    if (!dashboardId) return { content: [{ type: 'text', text: 'dashboardId is required' }], isError: true };
    const prefix = this.groupPath(args.workspaceId as string | undefined);
    return this.fetchJSON(`${this.baseUrl}${prefix}/dashboards/${encodeURIComponent(dashboardId)}/tiles`);
  }

  private async listDataflows(args: Record<string, unknown>): Promise<ToolResult> {
    const workspaceId = args.workspaceId as string;
    if (!workspaceId) return { content: [{ type: 'text', text: 'workspaceId is required' }], isError: true };
    return this.fetchJSON(`${this.baseUrl}/groups/${encodeURIComponent(workspaceId)}/dataflows`);
  }

  private async refreshDataflow(args: Record<string, unknown>): Promise<ToolResult> {
    const workspaceId = args.workspaceId as string;
    const dataflowId = args.dataflowId as string;
    if (!workspaceId || !dataflowId) return { content: [{ type: 'text', text: 'workspaceId and dataflowId are required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.notifyOption) body.notifyOption = args.notifyOption as string;
    return this.fetchJSON(
      `${this.baseUrl}/groups/${encodeURIComponent(workspaceId)}/dataflows/${encodeURIComponent(dataflowId)}/refreshes`,
      { method: 'POST', body: JSON.stringify(body) },
    );
  }

  private async listPipelines(): Promise<ToolResult> {
    return this.fetchJSON(`${this.baseUrl}/pipelines`);
  }

  private async getPipeline(args: Record<string, unknown>): Promise<ToolResult> {
    const pipelineId = args.pipelineId as string;
    if (!pipelineId) return { content: [{ type: 'text', text: 'pipelineId is required' }], isError: true };
    return this.fetchJSON(`${this.baseUrl}/pipelines/${encodeURIComponent(pipelineId)}`);
  }

  private async deployPipelineStage(args: Record<string, unknown>): Promise<ToolResult> {
    const pipelineId = args.pipelineId as string;
    const sourceStageOrder = args.sourceStageOrder as number;
    if (!pipelineId || sourceStageOrder === undefined) {
      return { content: [{ type: 'text', text: 'pipelineId and sourceStageOrder are required' }], isError: true };
    }
    const body: Record<string, unknown> = { sourceStageOrder };
    if (args.isBackwardDeployment !== undefined) body.isBackwardDeployment = args.isBackwardDeployment as boolean;
    return this.fetchJSON(
      `${this.baseUrl}/pipelines/${encodeURIComponent(pipelineId)}/deploy`,
      { method: 'POST', body: JSON.stringify(body) },
    );
  }

  private async getCapacity(): Promise<ToolResult> {
    return this.fetchJSON(`${this.baseUrl}/capacities`);
  }

  private async listApps(): Promise<ToolResult> {
    return this.fetchJSON(`${this.baseUrl}/apps`);
  }
}

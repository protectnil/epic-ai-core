/**
 * Airbyte MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// No official Airbyte MCP server was found on GitHub. The airbytehq organization
// publishes agent connector tooling with MCP compatibility (PydanticAI-based) but
// no standalone MCP server covering the general platform management REST API.
//
// Base URL: https://api.airbyte.com/v1
// Auth: Bearer access token (obtain via POST /v1/applications/token with client_id + client_secret)
// Docs: https://reference.airbyte.com/reference/getting-started
// Rate limits: Not publicly documented; recommended to stay under 100 req/min per token

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface AirbyteConfig {
  /**
   * Bearer access token for the Airbyte Cloud API.
   * Obtain via POST https://api.airbyte.com/v1/applications/token
   * using your client_id and client_secret.
   */
  accessToken: string;
  /**
   * Override the API base URL (e.g. for self-managed Airbyte Enterprise).
   * Defaults to https://api.airbyte.com/v1
   */
  baseUrl?: string;
}

export class AirbyteMCPServer extends MCPAdapterBase {
  private readonly accessToken: string;
  private readonly baseUrl: string;

  constructor(config: AirbyteConfig) {
    super();
    this.accessToken = config.accessToken;
    this.baseUrl = config.baseUrl || 'https://api.airbyte.com/v1';
  }

  private get headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      // --- Workspaces ---
      {
        name: 'list_workspaces',
        description: 'List all Airbyte workspaces accessible to the authenticated token with optional pagination.',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Maximum number of workspaces to return (default: 20)' },
            offset: { type: 'number', description: 'Number of workspaces to skip for pagination (default: 0)' },
          },
        },
      },
      {
        name: 'get_workspace',
        description: 'Get details of a specific Airbyte workspace by its ID.',
        inputSchema: {
          type: 'object',
          properties: {
            workspaceId: { type: 'string', description: 'The workspace ID to retrieve' },
          },
          required: ['workspaceId'],
        },
      },
      // --- Sources ---
      {
        name: 'list_sources',
        description: 'List all sources in an Airbyte workspace with optional pagination.',
        inputSchema: {
          type: 'object',
          properties: {
            workspaceId: { type: 'string', description: 'The workspace ID to list sources for' },
            limit: { type: 'number', description: 'Maximum number of sources to return (default: 20)' },
            offset: { type: 'number', description: 'Number of sources to skip for pagination (default: 0)' },
          },
          required: ['workspaceId'],
        },
      },
      {
        name: 'get_source',
        description: 'Get details of a specific Airbyte source by its ID including configuration and schema.',
        inputSchema: {
          type: 'object',
          properties: {
            sourceId: { type: 'string', description: 'The source ID to retrieve' },
          },
          required: ['sourceId'],
        },
      },
      {
        name: 'create_source',
        description: 'Create a new data source in an Airbyte workspace using a source definition and configuration.',
        inputSchema: {
          type: 'object',
          properties: {
            workspaceId: { type: 'string', description: 'The workspace ID to create the source in' },
            name: { type: 'string', description: 'Display name for the source' },
            sourceDefinitionId: { type: 'string', description: 'The source definition ID (connector type)' },
            connectionConfiguration: { type: 'object', description: 'Connector-specific configuration object (credentials, host, etc.)' },
          },
          required: ['workspaceId', 'name', 'sourceDefinitionId', 'connectionConfiguration'],
        },
      },
      {
        name: 'delete_source',
        description: 'Delete a source from an Airbyte workspace by its ID. This also removes all connections using this source.',
        inputSchema: {
          type: 'object',
          properties: {
            sourceId: { type: 'string', description: 'The source ID to delete' },
          },
          required: ['sourceId'],
        },
      },
      // --- Destinations ---
      {
        name: 'list_destinations',
        description: 'List all destinations in an Airbyte workspace with optional pagination.',
        inputSchema: {
          type: 'object',
          properties: {
            workspaceId: { type: 'string', description: 'The workspace ID to list destinations for' },
            limit: { type: 'number', description: 'Maximum number of destinations to return (default: 20)' },
            offset: { type: 'number', description: 'Number of destinations to skip for pagination (default: 0)' },
          },
          required: ['workspaceId'],
        },
      },
      {
        name: 'get_destination',
        description: 'Get details of a specific Airbyte destination by its ID including configuration.',
        inputSchema: {
          type: 'object',
          properties: {
            destinationId: { type: 'string', description: 'The destination ID to retrieve' },
          },
          required: ['destinationId'],
        },
      },
      {
        name: 'create_destination',
        description: 'Create a new data destination in an Airbyte workspace using a destination definition and configuration.',
        inputSchema: {
          type: 'object',
          properties: {
            workspaceId: { type: 'string', description: 'The workspace ID to create the destination in' },
            name: { type: 'string', description: 'Display name for the destination' },
            destinationDefinitionId: { type: 'string', description: 'The destination definition ID (connector type)' },
            connectionConfiguration: { type: 'object', description: 'Connector-specific configuration object' },
          },
          required: ['workspaceId', 'name', 'destinationDefinitionId', 'connectionConfiguration'],
        },
      },
      {
        name: 'delete_destination',
        description: 'Delete a destination from an Airbyte workspace by its ID.',
        inputSchema: {
          type: 'object',
          properties: {
            destinationId: { type: 'string', description: 'The destination ID to delete' },
          },
          required: ['destinationId'],
        },
      },
      // --- Connections ---
      {
        name: 'list_connections',
        description: 'List all sync connections in an Airbyte workspace with optional pagination.',
        inputSchema: {
          type: 'object',
          properties: {
            workspaceId: { type: 'string', description: 'The workspace ID to list connections for' },
            limit: { type: 'number', description: 'Maximum number of connections to return (default: 20)' },
            offset: { type: 'number', description: 'Number of connections to skip for pagination (default: 0)' },
          },
          required: ['workspaceId'],
        },
      },
      {
        name: 'get_connection',
        description: 'Get full details of a specific Airbyte connection by ID, including sync schedule and stream configuration.',
        inputSchema: {
          type: 'object',
          properties: {
            connectionId: { type: 'string', description: 'The connection ID to retrieve' },
          },
          required: ['connectionId'],
        },
      },
      {
        name: 'create_connection',
        description: 'Create a new sync connection between a source and destination in Airbyte with schedule and stream config.',
        inputSchema: {
          type: 'object',
          properties: {
            sourceId: { type: 'string', description: 'The source ID to sync data from' },
            destinationId: { type: 'string', description: 'The destination ID to sync data to' },
            name: { type: 'string', description: 'Display name for the connection' },
            schedule: { type: 'object', description: 'Sync schedule: { scheduleType: "manual"|"cron"|"basic", cronExpression?, basicSchedule?: { units, timeUnit } }' },
            syncCatalog: { type: 'object', description: 'Stream catalog config specifying which streams to sync and their sync modes' },
            namespaceDefinition: { type: 'string', description: 'Namespace definition: source, destination, or customformat (default: source)' },
            prefix: { type: 'string', description: 'Optional stream prefix for destination tables' },
          },
          required: ['sourceId', 'destinationId'],
        },
      },
      {
        name: 'update_connection',
        description: 'Update an existing Airbyte connection schedule, stream configuration, or namespace settings.',
        inputSchema: {
          type: 'object',
          properties: {
            connectionId: { type: 'string', description: 'The connection ID to update' },
            name: { type: 'string', description: 'New display name for the connection' },
            schedule: { type: 'object', description: 'Updated sync schedule configuration' },
            syncCatalog: { type: 'object', description: 'Updated stream catalog configuration' },
            status: { type: 'string', description: 'Connection status: active or inactive' },
          },
          required: ['connectionId'],
        },
      },
      {
        name: 'delete_connection',
        description: 'Delete an Airbyte connection by its ID. This stops all future syncs for this connection.',
        inputSchema: {
          type: 'object',
          properties: {
            connectionId: { type: 'string', description: 'The connection ID to delete' },
          },
          required: ['connectionId'],
        },
      },
      // --- Jobs ---
      {
        name: 'list_jobs',
        description: 'List sync or reset jobs for a connection with optional filtering by type and status.',
        inputSchema: {
          type: 'object',
          properties: {
            connectionId: { type: 'string', description: 'The connection ID to list jobs for' },
            limit: { type: 'number', description: 'Maximum number of jobs to return (default: 20)' },
            offset: { type: 'number', description: 'Number of jobs to skip for pagination (default: 0)' },
            jobType: { type: 'string', description: 'Filter by job type: "sync" or "reset"' },
            status: { type: 'string', description: 'Filter by status: pending, running, succeeded, failed, cancelled' },
          },
          required: ['connectionId'],
        },
      },
      {
        name: 'get_job',
        description: 'Get details and current status of a specific Airbyte sync or reset job by its ID.',
        inputSchema: {
          type: 'object',
          properties: {
            jobId: { type: 'string', description: 'The job ID to retrieve' },
          },
          required: ['jobId'],
        },
      },
      {
        name: 'trigger_sync',
        description: 'Trigger a sync or full reset job for an Airbyte connection immediately.',
        inputSchema: {
          type: 'object',
          properties: {
            connectionId: { type: 'string', description: 'The connection ID to trigger a job for' },
            jobType: { type: 'string', description: 'Type of job to trigger: "sync" (default) or "reset"' },
          },
          required: ['connectionId'],
        },
      },
      {
        name: 'cancel_job',
        description: 'Cancel a running Airbyte sync or reset job by its ID.',
        inputSchema: {
          type: 'object',
          properties: {
            jobId: { type: 'string', description: 'The job ID to cancel' },
          },
          required: ['jobId'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_workspaces': return await this.listWorkspaces(args);
        case 'get_workspace': return await this.getWorkspace(args);
        case 'list_sources': return await this.listSources(args);
        case 'get_source': return await this.getSource(args);
        case 'create_source': return await this.createSource(args);
        case 'delete_source': return await this.deleteSource(args);
        case 'list_destinations': return await this.listDestinations(args);
        case 'get_destination': return await this.getDestination(args);
        case 'create_destination': return await this.createDestination(args);
        case 'delete_destination': return await this.deleteDestination(args);
        case 'list_connections': return await this.listConnections(args);
        case 'get_connection': return await this.getConnection(args);
        case 'create_connection': return await this.createConnection(args);
        case 'update_connection': return await this.updateConnection(args);
        case 'delete_connection': return await this.deleteConnection(args);
        case 'list_jobs': return await this.listJobs(args);
        case 'get_job': return await this.getJob(args);
        case 'trigger_sync': return await this.triggerSync(args);
        case 'cancel_job': return await this.cancelJob(args);
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

  private async apiGet(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, { method: 'GET', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apiPost(path: string, body: unknown): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    // 204 No Content
    if (response.status === 204) {
      return { content: [{ type: 'text', text: JSON.stringify({ success: true }) }], isError: false };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apiDelete(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, { method: 'DELETE', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: JSON.stringify({ success: true }) }], isError: false };
  }

  private async listWorkspaces(args: Record<string, unknown>): Promise<ToolResult> {
    const limit = (args.limit as number) ?? 20;
    const offset = (args.offset as number) ?? 0;
    return this.apiGet(`/workspaces?limit=${limit}&offset=${offset}`);
  }

  private async getWorkspace(args: Record<string, unknown>): Promise<ToolResult> {
    const workspaceId = args.workspaceId as string;
    if (!workspaceId) return { content: [{ type: 'text', text: 'workspaceId is required' }], isError: true };
    return this.apiGet(`/workspaces/${encodeURIComponent(workspaceId)}`);
  }

  private async listSources(args: Record<string, unknown>): Promise<ToolResult> {
    const workspaceId = args.workspaceId as string;
    if (!workspaceId) return { content: [{ type: 'text', text: 'workspaceId is required' }], isError: true };
    const limit = (args.limit as number) ?? 20;
    const offset = (args.offset as number) ?? 0;
    return this.apiGet(`/sources?workspaceId=${encodeURIComponent(workspaceId)}&limit=${limit}&offset=${offset}`);
  }

  private async getSource(args: Record<string, unknown>): Promise<ToolResult> {
    const sourceId = args.sourceId as string;
    if (!sourceId) return { content: [{ type: 'text', text: 'sourceId is required' }], isError: true };
    return this.apiGet(`/sources/${encodeURIComponent(sourceId)}`);
  }

  private async createSource(args: Record<string, unknown>): Promise<ToolResult> {
    const { workspaceId, name, sourceDefinitionId, connectionConfiguration } = args;
    if (!workspaceId || !name || !sourceDefinitionId || !connectionConfiguration) {
      return { content: [{ type: 'text', text: 'workspaceId, name, sourceDefinitionId, and connectionConfiguration are required' }], isError: true };
    }
    return this.apiPost('/sources', { workspaceId, name, sourceDefinitionId, connectionConfiguration });
  }

  private async deleteSource(args: Record<string, unknown>): Promise<ToolResult> {
    const sourceId = args.sourceId as string;
    if (!sourceId) return { content: [{ type: 'text', text: 'sourceId is required' }], isError: true };
    return this.apiDelete(`/sources/${encodeURIComponent(sourceId)}`);
  }

  private async listDestinations(args: Record<string, unknown>): Promise<ToolResult> {
    const workspaceId = args.workspaceId as string;
    if (!workspaceId) return { content: [{ type: 'text', text: 'workspaceId is required' }], isError: true };
    const limit = (args.limit as number) ?? 20;
    const offset = (args.offset as number) ?? 0;
    return this.apiGet(`/destinations?workspaceId=${encodeURIComponent(workspaceId)}&limit=${limit}&offset=${offset}`);
  }

  private async getDestination(args: Record<string, unknown>): Promise<ToolResult> {
    const destinationId = args.destinationId as string;
    if (!destinationId) return { content: [{ type: 'text', text: 'destinationId is required' }], isError: true };
    return this.apiGet(`/destinations/${encodeURIComponent(destinationId)}`);
  }

  private async createDestination(args: Record<string, unknown>): Promise<ToolResult> {
    const { workspaceId, name, destinationDefinitionId, connectionConfiguration } = args;
    if (!workspaceId || !name || !destinationDefinitionId || !connectionConfiguration) {
      return { content: [{ type: 'text', text: 'workspaceId, name, destinationDefinitionId, and connectionConfiguration are required' }], isError: true };
    }
    return this.apiPost('/destinations', { workspaceId, name, destinationDefinitionId, connectionConfiguration });
  }

  private async deleteDestination(args: Record<string, unknown>): Promise<ToolResult> {
    const destinationId = args.destinationId as string;
    if (!destinationId) return { content: [{ type: 'text', text: 'destinationId is required' }], isError: true };
    return this.apiDelete(`/destinations/${encodeURIComponent(destinationId)}`);
  }

  private async listConnections(args: Record<string, unknown>): Promise<ToolResult> {
    const workspaceId = args.workspaceId as string;
    if (!workspaceId) return { content: [{ type: 'text', text: 'workspaceId is required' }], isError: true };
    const limit = (args.limit as number) ?? 20;
    const offset = (args.offset as number) ?? 0;
    return this.apiGet(`/connections?workspaceId=${encodeURIComponent(workspaceId)}&limit=${limit}&offset=${offset}`);
  }

  private async getConnection(args: Record<string, unknown>): Promise<ToolResult> {
    const connectionId = args.connectionId as string;
    if (!connectionId) return { content: [{ type: 'text', text: 'connectionId is required' }], isError: true };
    return this.apiGet(`/connections/${encodeURIComponent(connectionId)}`);
  }

  private async createConnection(args: Record<string, unknown>): Promise<ToolResult> {
    const { sourceId, destinationId } = args;
    if (!sourceId || !destinationId) {
      return { content: [{ type: 'text', text: 'sourceId and destinationId are required' }], isError: true };
    }
    const body: Record<string, unknown> = { sourceId, destinationId };
    if (args.name) body.name = args.name;
    if (args.schedule) body.schedule = args.schedule;
    if (args.syncCatalog) body.syncCatalog = args.syncCatalog;
    if (args.namespaceDefinition) body.namespaceDefinition = args.namespaceDefinition;
    if (args.prefix) body.prefix = args.prefix;
    return this.apiPost('/connections', body);
  }

  private async updateConnection(args: Record<string, unknown>): Promise<ToolResult> {
    const connectionId = args.connectionId as string;
    if (!connectionId) return { content: [{ type: 'text', text: 'connectionId is required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.name) body.name = args.name;
    if (args.schedule) body.schedule = args.schedule;
    if (args.syncCatalog) body.syncCatalog = args.syncCatalog;
    if (args.status) body.status = args.status;
    const response = await this.fetchWithRetry(`${this.baseUrl}/connections/${encodeURIComponent(connectionId)}`, {
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

  private async deleteConnection(args: Record<string, unknown>): Promise<ToolResult> {
    const connectionId = args.connectionId as string;
    if (!connectionId) return { content: [{ type: 'text', text: 'connectionId is required' }], isError: true };
    return this.apiDelete(`/connections/${encodeURIComponent(connectionId)}`);
  }

  private async listJobs(args: Record<string, unknown>): Promise<ToolResult> {
    const connectionId = args.connectionId as string;
    if (!connectionId) return { content: [{ type: 'text', text: 'connectionId is required' }], isError: true };
    const limit = (args.limit as number) ?? 20;
    const offset = (args.offset as number) ?? 0;
    let url = `/jobs?connectionId=${encodeURIComponent(connectionId)}&limit=${limit}&offset=${offset}`;
    if (args.jobType) url += `&jobType=${encodeURIComponent(args.jobType as string)}`;
    if (args.status) url += `&status=${encodeURIComponent(args.status as string)}`;
    return this.apiGet(url);
  }

  private async getJob(args: Record<string, unknown>): Promise<ToolResult> {
    const jobId = args.jobId as string;
    if (!jobId) return { content: [{ type: 'text', text: 'jobId is required' }], isError: true };
    return this.apiGet(`/jobs/${encodeURIComponent(jobId)}`);
  }

  private async triggerSync(args: Record<string, unknown>): Promise<ToolResult> {
    const connectionId = args.connectionId as string;
    if (!connectionId) return { content: [{ type: 'text', text: 'connectionId is required' }], isError: true };
    const jobType = (args.jobType as string) ?? 'sync';
    return this.apiPost('/jobs', { connectionId, jobType });
  }

  private async cancelJob(args: Record<string, unknown>): Promise<ToolResult> {
    const jobId = args.jobId as string;
    if (!jobId) return { content: [{ type: 'text', text: 'jobId is required' }], isError: true };
    const response = await this.fetchWithRetry(`${this.baseUrl}/jobs/${encodeURIComponent(jobId)}`, {
      method: 'DELETE',
      headers: this.headers,
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: JSON.stringify({ success: true, message: `Job ${jobId} cancelled` }) }], isError: false };
  }

  static catalog() {
    return {
      name: 'airbyte',
      displayName: 'Airbyte',
      version: '1.0.0',
      category: 'data' as const,
      keywords: ['airbyte'],
      toolNames: ['list_workspaces', 'get_workspace', 'list_sources', 'get_source', 'create_source', 'delete_source', 'list_destinations', 'get_destination', 'create_destination', 'delete_destination', 'list_connections', 'get_connection', 'create_connection', 'update_connection', 'delete_connection', 'list_jobs', 'get_job', 'trigger_sync', 'cancel_job'],
      description: 'Airbyte adapter for the Epic AI Intelligence Platform',
      author: 'protectnil' as const,
    };
  }
}

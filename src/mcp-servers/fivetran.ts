/**
 * Fivetran MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/fivetran/fivetran-mcp — official Fivetran MCP server.
//   Published by Fivetran (vendor). Last commit: 2026-03-24. Transport: stdio. Auth: API key.
//   Actively maintained; ships 100+ tools covering the full Fivetran REST API including
//   connections (30 tools), destinations (14), groups (11), transformations (10),
//   transformation projects (6), users (17), teams (21), webhooks (7), external logging (6),
//   hybrid agents (6), proxy agents (6), private links (5), system keys (6), roles (1),
//   account (1), metadata (2), public metadata (1), HVR (1).
// Our adapter covers: 18 tools (core connector/connection, destination, user, and webhook ops).
// Vendor MCP covers: 100+ tools (full API surface including operations our adapter lacks).
//
// Integration: use-both
//   The vendor MCP exposes 100+ tools; our adapter covers 18 tools, all of which are
//   also present in the vendor MCP (shared coverage). The vendor MCP is a strict superset.
//   However, this adapter provides an air-gapped, TypeScript-native, zero-Python-dependency
//   alternative. Use the vendor MCP for full coverage; use this adapter for air-gapped
//   or TypeScript-native deployments where installing Python+pip at runtime is not possible.
// Recommendation: use-vendor-mcp for full coverage; use-rest-api for air-gapped deployments.
//
// NOTE: /connectors/ paths still work — Fivetran continues to support both /connectors
//   and /connections paths after the Nov 2024 rename. No migration needed.
//
// Base URL: https://api.fivetran.com/v1
// Auth: HTTP Basic — Base64-encode "api_key:api_secret" in the Authorization header.
//   Both Scoped API keys and System keys are supported.
// Docs: https://fivetran.com/docs/rest-api/api-reference
// Rate limits: Not publicly documented; Fivetran applies per-account rate limits.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface FivetranConfig {
  /** Fivetran API key */
  apiKey: string;
  /** Fivetran API secret */
  apiSecret: string;
  /** Override the base URL (default: https://api.fivetran.com/v1) */
  baseUrl?: string;
}

export class FivetranMCPServer extends MCPAdapterBase {
  private readonly baseUrl: string;
  private readonly authHeader: string;

  constructor(config: FivetranConfig) {
    super();
    this.baseUrl = (config.baseUrl ?? 'https://api.fivetran.com/v1').replace(/\/$/, '');
    const encoded = Buffer.from(`${config.apiKey}:${config.apiSecret}`).toString('base64');
    this.authHeader = `Basic ${encoded}`;
  }

  static catalog() {
    return {
      name: 'fivetran',
      displayName: 'Fivetran',
      version: '1.0.0',
      category: 'data' as const,
      keywords: [
        'fivetran', 'etl', 'elt', 'connector', 'data pipeline', 'sync', 'destination',
        'data integration', 'warehouse', 'transformation', 'dbt', 'webhook', 'group',
        'schema', 'data movement', 'replication',
      ],
      toolNames: [
        'list_groups', 'get_group', 'list_connectors_in_group', 'get_connector',
        'create_connector', 'update_connector', 'delete_connector', 'sync_connector',
        'update_connector_schedule', 'get_connector_sync_status',
        'list_destinations', 'get_destination', 'list_users', 'get_user',
        'list_webhooks', 'create_webhook', 'update_webhook', 'delete_webhook',
      ],
      description: 'Fivetran data pipeline management: list and manage connectors and destinations, trigger syncs, manage users and groups, and configure webhook notifications for pipeline events.',
      author: 'protectnil' as const,
    };
  }

  private get headers(): Record<string, string> {
    return {
      Authorization: this.authHeader,
      'Content-Type': 'application/json;version=2',
      Accept: 'application/json;version=2',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_groups',
        description: 'List all Fivetran groups (destinations/schemas) in the account with optional cursor-based pagination',
        inputSchema: {
          type: 'object',
          properties: {
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response to fetch the next page',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of groups to return (default: 100)',
            },
          },
        },
      },
      {
        name: 'get_group',
        description: 'Retrieve details of a specific Fivetran group (destination container) by ID',
        inputSchema: {
          type: 'object',
          properties: {
            group_id: {
              type: 'string',
              description: 'The Fivetran group ID',
            },
          },
          required: ['group_id'],
        },
      },
      {
        name: 'list_connectors_in_group',
        description: 'List all Fivetran connectors (data sources) within a specific group (destination)',
        inputSchema: {
          type: 'object',
          properties: {
            group_id: {
              type: 'string',
              description: 'The Fivetran group (destination) ID to list connectors for',
            },
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of connectors to return (default: 100)',
            },
          },
          required: ['group_id'],
        },
      },
      {
        name: 'get_connector',
        description: 'Retrieve configuration, status, and sync state for a specific Fivetran connector by ID',
        inputSchema: {
          type: 'object',
          properties: {
            connector_id: {
              type: 'string',
              description: 'The Fivetran connector ID',
            },
          },
          required: ['connector_id'],
        },
      },
      {
        name: 'create_connector',
        description: 'Create a new Fivetran connector (data source) in a group with service type and configuration',
        inputSchema: {
          type: 'object',
          properties: {
            group_id: {
              type: 'string',
              description: 'The group (destination) ID to create the connector in',
            },
            service: {
              type: 'string',
              description: 'The connector service type (e.g. google_analytics, salesforce, postgres)',
            },
            config: {
              type: 'object',
              description: 'Service-specific connector configuration object (schema, credentials, etc.)',
              properties: {},
            },
            paused: {
              type: 'boolean',
              description: 'If true, create the connector in a paused state (default: false)',
            },
            run_setup_tests: {
              type: 'boolean',
              description: 'If true, run connection setup tests after creation (default: false)',
            },
          },
          required: ['group_id', 'service'],
        },
      },
      {
        name: 'update_connector',
        description: 'Update the configuration or settings of an existing Fivetran connector',
        inputSchema: {
          type: 'object',
          properties: {
            connector_id: {
              type: 'string',
              description: 'The Fivetran connector ID to update',
            },
            config: {
              type: 'object',
              description: 'Service-specific configuration fields to update',
              properties: {},
            },
            paused: {
              type: 'boolean',
              description: 'Pause or unpause the connector',
            },
            sync_frequency: {
              type: 'number',
              description: 'New sync frequency in minutes (e.g. 60, 360, 720, 1440)',
            },
          },
          required: ['connector_id'],
        },
      },
      {
        name: 'delete_connector',
        description: 'Delete a Fivetran connector permanently — this stops all future syncs and removes the connector',
        inputSchema: {
          type: 'object',
          properties: {
            connector_id: {
              type: 'string',
              description: 'The Fivetran connector ID to delete',
            },
          },
          required: ['connector_id'],
        },
      },
      {
        name: 'sync_connector',
        description: 'Trigger an on-demand sync for a Fivetran connector, bypassing the scheduled sync frequency',
        inputSchema: {
          type: 'object',
          properties: {
            connector_id: {
              type: 'string',
              description: 'The Fivetran connector ID to sync',
            },
            force: {
              type: 'boolean',
              description: 'If true, force a full re-sync rather than an incremental sync (default: false)',
            },
          },
          required: ['connector_id'],
        },
      },
      {
        name: 'update_connector_schedule',
        description: 'Update the sync schedule (frequency and paused state) for a Fivetran connector',
        inputSchema: {
          type: 'object',
          properties: {
            connector_id: {
              type: 'string',
              description: 'The Fivetran connector ID',
            },
            sync_frequency: {
              type: 'number',
              description: 'Sync frequency in minutes (e.g. 60, 360, 720, 1440)',
            },
            paused: {
              type: 'boolean',
              description: 'If true, pause the connector sync schedule',
            },
            pause_after_trial: {
              type: 'boolean',
              description: 'If true, automatically pause the connector after the trial period ends',
            },
          },
          required: ['connector_id'],
        },
      },
      {
        name: 'get_connector_sync_status',
        description: 'Get the current sync state, setup state, and data update state for a specific connector',
        inputSchema: {
          type: 'object',
          properties: {
            connector_id: {
              type: 'string',
              description: 'The Fivetran connector ID to check status for',
            },
          },
          required: ['connector_id'],
        },
      },
      {
        name: 'list_destinations',
        description: 'List all Fivetran destinations (data warehouses and databases) in the account',
        inputSchema: {
          type: 'object',
          properties: {
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of destinations to return (default: 100)',
            },
          },
        },
      },
      {
        name: 'get_destination',
        description: 'Retrieve configuration and connection details for a specific Fivetran destination by group ID',
        inputSchema: {
          type: 'object',
          properties: {
            group_id: {
              type: 'string',
              description: 'The group ID whose destination to retrieve',
            },
          },
          required: ['group_id'],
        },
      },
      {
        name: 'list_users',
        description: 'List all users in the Fivetran account with optional cursor-based pagination',
        inputSchema: {
          type: 'object',
          properties: {
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of users to return (default: 100)',
            },
          },
        },
      },
      {
        name: 'get_user',
        description: 'Retrieve details of a specific Fivetran user including role and account membership',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: {
              type: 'string',
              description: 'The Fivetran user ID',
            },
          },
          required: ['user_id'],
        },
      },
      {
        name: 'list_webhooks',
        description: 'List all webhooks configured in the Fivetran account or for a specific group',
        inputSchema: {
          type: 'object',
          properties: {
            group_id: {
              type: 'string',
              description: 'Filter webhooks by group ID (optional — lists account-level webhooks if omitted)',
            },
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of webhooks to return (default: 100)',
            },
          },
        },
      },
      {
        name: 'create_webhook',
        description: 'Create a new Fivetran webhook to receive notifications for sync and pipeline events',
        inputSchema: {
          type: 'object',
          properties: {
            url: {
              type: 'string',
              description: 'HTTPS URL to receive webhook POST payloads',
            },
            events: {
              type: 'array',
              description: 'List of event types to subscribe to: sync_start, sync_end, dbt_run_start, dbt_run_succeeded, dbt_run_failed',
              items: { type: 'string' },
            },
            active: {
              type: 'boolean',
              description: 'Whether the webhook is active (default: true)',
            },
            secret: {
              type: 'string',
              description: 'Optional secret for HMAC payload verification',
            },
            group_id: {
              type: 'string',
              description: 'Associate the webhook with a specific group (omit for account-level webhook)',
            },
          },
          required: ['url', 'events'],
        },
      },
      {
        name: 'update_webhook',
        description: 'Update an existing Fivetran webhook URL, subscribed events, or active state',
        inputSchema: {
          type: 'object',
          properties: {
            webhook_id: {
              type: 'string',
              description: 'The Fivetran webhook ID to update',
            },
            url: {
              type: 'string',
              description: 'Updated HTTPS URL for webhook delivery',
            },
            events: {
              type: 'array',
              description: 'Updated list of event types to subscribe to',
              items: { type: 'string' },
            },
            active: {
              type: 'boolean',
              description: 'Enable or disable the webhook',
            },
            secret: {
              type: 'string',
              description: 'Updated HMAC secret',
            },
          },
          required: ['webhook_id'],
        },
      },
      {
        name: 'delete_webhook',
        description: 'Delete a Fivetran webhook permanently by webhook ID',
        inputSchema: {
          type: 'object',
          properties: {
            webhook_id: {
              type: 'string',
              description: 'The Fivetran webhook ID to delete',
            },
          },
          required: ['webhook_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      const h = this.headers;

      switch (name) {
        case 'list_groups':
          return this.listGroups(args, h);
        case 'get_group':
          return this.getGroup(args, h);
        case 'list_connectors_in_group':
          return this.listConnectorsInGroup(args, h);
        case 'get_connector':
          return this.getConnector(args, h);
        case 'create_connector':
          return this.createConnector(args, h);
        case 'update_connector':
          return this.updateConnector(args, h);
        case 'delete_connector':
          return this.deleteConnector(args, h);
        case 'sync_connector':
          return this.syncConnector(args, h);
        case 'update_connector_schedule':
          return this.updateConnectorSchedule(args, h);
        case 'get_connector_sync_status':
          return this.getConnectorSyncStatus(args, h);
        case 'list_destinations':
          return this.listDestinations(args, h);
        case 'get_destination':
          return this.getDestination(args, h);
        case 'list_users':
          return this.listUsers(args, h);
        case 'get_user':
          return this.getUser(args, h);
        case 'list_webhooks':
          return this.listWebhooks(args, h);
        case 'create_webhook':
          return this.createWebhook(args, h);
        case 'update_webhook':
          return this.updateWebhook(args, h);
        case 'delete_webhook':
          return this.deleteWebhook(args, h);
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

  private buildQs(params: URLSearchParams): string {
    const s = params.toString();
    return s ? `?${s}` : '';
  }

  private async get(path: string, h: Record<string, string>): Promise<Response> {
    return fetch(`${this.baseUrl}${path}`, { method: 'GET', headers: h });
  }

  private async post(path: string, body: unknown, h: Record<string, string>): Promise<Response> {
    return fetch(`${this.baseUrl}${path}`, { method: 'POST', headers: h, body: JSON.stringify(body) });
  }

  private async patch(path: string, body: unknown, h: Record<string, string>): Promise<Response> {
    return fetch(`${this.baseUrl}${path}`, { method: 'PATCH', headers: h, body: JSON.stringify(body) });
  }

  private async delete(path: string, h: Record<string, string>): Promise<Response> {
    return fetch(`${this.baseUrl}${path}`, { method: 'DELETE', headers: h });
  }

  private ok(response: Response, label: string): ToolResult | null {
    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `${label}: HTTP ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }
    return null;
  }

  private async json(response: Response): Promise<ToolResult> {
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async listGroups(args: Record<string, unknown>, h: Record<string, string>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.cursor) params.set('cursor', args.cursor as string);
    if (args.limit) params.set('limit', String(args.limit));

    const response = await this.get(`/groups${this.buildQs(params)}`, h);
    const err = this.ok(response, 'Failed to list groups');
    if (err) return err;
    return this.json(response);
  }

  private async getGroup(args: Record<string, unknown>, h: Record<string, string>): Promise<ToolResult> {
    const groupId = args.group_id as string;
    if (!groupId) return { content: [{ type: 'text', text: 'group_id is required' }], isError: true };

    const response = await this.get(`/groups/${encodeURIComponent(groupId)}`, h);
    const err = this.ok(response, 'Failed to get group');
    if (err) return err;
    return this.json(response);
  }

  private async listConnectorsInGroup(args: Record<string, unknown>, h: Record<string, string>): Promise<ToolResult> {
    const groupId = args.group_id as string;
    if (!groupId) return { content: [{ type: 'text', text: 'group_id is required' }], isError: true };

    const params = new URLSearchParams();
    if (args.cursor) params.set('cursor', args.cursor as string);
    params.set('limit', String((args.limit as number) ?? 100));

    const response = await this.get(`/groups/${encodeURIComponent(groupId)}/connectors${this.buildQs(params)}`, h);
    const err = this.ok(response, 'Failed to list connectors');
    if (err) return err;
    return this.json(response);
  }

  private async getConnector(args: Record<string, unknown>, h: Record<string, string>): Promise<ToolResult> {
    const connectorId = args.connector_id as string;
    if (!connectorId) return { content: [{ type: 'text', text: 'connector_id is required' }], isError: true };

    const response = await this.get(`/connectors/${encodeURIComponent(connectorId)}`, h);
    const err = this.ok(response, 'Failed to get connector');
    if (err) return err;
    return this.json(response);
  }

  private async createConnector(args: Record<string, unknown>, h: Record<string, string>): Promise<ToolResult> {
    const groupId = args.group_id as string;
    const service = args.service as string;
    if (!groupId || !service) return { content: [{ type: 'text', text: 'group_id and service are required' }], isError: true };

    const body: Record<string, unknown> = { group_id: groupId, service };
    if (args.config) body.config = args.config;
    if (typeof args.paused === 'boolean') body.paused = args.paused;
    if (typeof args.run_setup_tests === 'boolean') body.run_setup_tests = args.run_setup_tests;

    const response = await this.post('/connectors', body, h);
    const err = this.ok(response, 'Failed to create connector');
    if (err) return err;
    return this.json(response);
  }

  private async updateConnector(args: Record<string, unknown>, h: Record<string, string>): Promise<ToolResult> {
    const connectorId = args.connector_id as string;
    if (!connectorId) return { content: [{ type: 'text', text: 'connector_id is required' }], isError: true };

    const body: Record<string, unknown> = {};
    if (args.config) body.config = args.config;
    if (typeof args.paused === 'boolean') body.paused = args.paused;
    if (args.sync_frequency !== undefined) body.sync_frequency = args.sync_frequency;

    const response = await this.patch(`/connectors/${encodeURIComponent(connectorId)}`, body, h);
    const err = this.ok(response, 'Failed to update connector');
    if (err) return err;
    return this.json(response);
  }

  private async deleteConnector(args: Record<string, unknown>, h: Record<string, string>): Promise<ToolResult> {
    const connectorId = args.connector_id as string;
    if (!connectorId) return { content: [{ type: 'text', text: 'connector_id is required' }], isError: true };

    const response = await this.delete(`/connectors/${encodeURIComponent(connectorId)}`, h);
    const err = this.ok(response, 'Failed to delete connector');
    if (err) return err;
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async syncConnector(args: Record<string, unknown>, h: Record<string, string>): Promise<ToolResult> {
    const connectorId = args.connector_id as string;
    if (!connectorId) return { content: [{ type: 'text', text: 'connector_id is required' }], isError: true };

    const body: Record<string, unknown> = {};
    if (typeof args.force === 'boolean') body.force = args.force;

    const response = await this.post(`/connectors/${encodeURIComponent(connectorId)}/sync`, body, h);
    const err = this.ok(response, 'Failed to trigger sync');
    if (err) return err;
    return this.json(response);
  }

  private async updateConnectorSchedule(args: Record<string, unknown>, h: Record<string, string>): Promise<ToolResult> {
    const connectorId = args.connector_id as string;
    if (!connectorId) return { content: [{ type: 'text', text: 'connector_id is required' }], isError: true };

    const body: Record<string, unknown> = {};
    if (args.sync_frequency !== undefined) body.sync_frequency = args.sync_frequency;
    if (typeof args.paused === 'boolean') body.paused = args.paused;
    if (typeof args.pause_after_trial === 'boolean') body.pause_after_trial = args.pause_after_trial;

    const response = await this.patch(`/connectors/${encodeURIComponent(connectorId)}`, body, h);
    const err = this.ok(response, 'Failed to update connector schedule');
    if (err) return err;
    return this.json(response);
  }

  private async getConnectorSyncStatus(args: Record<string, unknown>, h: Record<string, string>): Promise<ToolResult> {
    const connectorId = args.connector_id as string;
    if (!connectorId) return { content: [{ type: 'text', text: 'connector_id is required' }], isError: true };

    const response = await this.get(`/connectors/${encodeURIComponent(connectorId)}`, h);
    const err = this.ok(response, 'Failed to get connector sync status');
    if (err) return err;

    const raw = await response.json() as { data?: { sync_state?: string; setup_state?: string; data_update_state?: string; status?: unknown } };
    const statusFields = raw.data
      ? {
          connector_id: connectorId,
          sync_state: raw.data.sync_state,
          setup_state: raw.data.setup_state,
          data_update_state: raw.data.data_update_state,
          status: raw.data.status,
        }
      : raw;

    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(statusFields, null, 2)) }], isError: false };
  }

  private async listDestinations(args: Record<string, unknown>, h: Record<string, string>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.cursor) params.set('cursor', args.cursor as string);
    if (args.limit) params.set('limit', String(args.limit));

    const response = await this.get(`/destinations${this.buildQs(params)}`, h);
    const err = this.ok(response, 'Failed to list destinations');
    if (err) return err;
    return this.json(response);
  }

  private async getDestination(args: Record<string, unknown>, h: Record<string, string>): Promise<ToolResult> {
    const groupId = args.group_id as string;
    if (!groupId) return { content: [{ type: 'text', text: 'group_id is required' }], isError: true };

    const response = await this.get(`/destinations/${encodeURIComponent(groupId)}`, h);
    const err = this.ok(response, 'Failed to get destination');
    if (err) return err;
    return this.json(response);
  }

  private async listUsers(args: Record<string, unknown>, h: Record<string, string>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.cursor) params.set('cursor', args.cursor as string);
    if (args.limit) params.set('limit', String(args.limit));

    const response = await this.get(`/users${this.buildQs(params)}`, h);
    const err = this.ok(response, 'Failed to list users');
    if (err) return err;
    return this.json(response);
  }

  private async getUser(args: Record<string, unknown>, h: Record<string, string>): Promise<ToolResult> {
    const userId = args.user_id as string;
    if (!userId) return { content: [{ type: 'text', text: 'user_id is required' }], isError: true };

    const response = await this.get(`/users/${encodeURIComponent(userId)}`, h);
    const err = this.ok(response, 'Failed to get user');
    if (err) return err;
    return this.json(response);
  }

  private async listWebhooks(args: Record<string, unknown>, h: Record<string, string>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.cursor) params.set('cursor', args.cursor as string);
    if (args.limit) params.set('limit', String(args.limit));

    // Group-scoped webhooks live under /groups/{id}/webhooks; account-level under /webhooks
    const path = args.group_id
      ? `/groups/${encodeURIComponent(args.group_id as string)}/webhooks${this.buildQs(params)}`
      : `/webhooks${this.buildQs(params)}`;

    const response = await this.get(path, h);
    const err = this.ok(response, 'Failed to list webhooks');
    if (err) return err;
    return this.json(response);
  }

  private async createWebhook(args: Record<string, unknown>, h: Record<string, string>): Promise<ToolResult> {
    const url = args.url as string;
    const events = args.events as string[];
    if (!url || !events || events.length === 0) {
      return { content: [{ type: 'text', text: 'url and events are required' }], isError: true };
    }

    const body: Record<string, unknown> = { url, events };
    if (typeof args.active === 'boolean') body.active = args.active;
    if (args.secret) body.secret = args.secret;
    if (args.group_id) body.group_id = args.group_id;

    // Group-scoped webhooks use /groups/{id}/webhooks; account-level use /webhooks
    const path = args.group_id
      ? `/groups/${encodeURIComponent(args.group_id as string)}/webhooks`
      : '/webhooks';

    const response = await this.post(path, body, h);
    const err = this.ok(response, 'Failed to create webhook');
    if (err) return err;
    return this.json(response);
  }

  private async updateWebhook(args: Record<string, unknown>, h: Record<string, string>): Promise<ToolResult> {
    const webhookId = args.webhook_id as string;
    if (!webhookId) return { content: [{ type: 'text', text: 'webhook_id is required' }], isError: true };

    const body: Record<string, unknown> = {};
    if (args.url) body.url = args.url;
    if (args.events) body.events = args.events;
    if (typeof args.active === 'boolean') body.active = args.active;
    if (args.secret) body.secret = args.secret;

    const response = await this.patch(`/webhooks/${encodeURIComponent(webhookId)}`, body, h);
    const err = this.ok(response, 'Failed to update webhook');
    if (err) return err;
    return this.json(response);
  }

  private async deleteWebhook(args: Record<string, unknown>, h: Record<string, string>): Promise<ToolResult> {
    const webhookId = args.webhook_id as string;
    if (!webhookId) return { content: [{ type: 'text', text: 'webhook_id is required' }], isError: true };

    const response = await this.delete(`/webhooks/${encodeURIComponent(webhookId)}`, h);
    const err = this.ok(response, 'Failed to delete webhook');
    if (err) return err;
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }
}

/**
 * Svix MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Svix is a webhook delivery platform. No official MCP server.
// Our adapter covers: 20 tools — list_applications, get_application, create_application, update_application,
//   delete_application, list_endpoints, get_endpoint, create_endpoint, update_endpoint, delete_endpoint,
//   get_endpoint_secret, rotate_endpoint_secret, get_endpoint_stats, list_messages, get_message,
//   create_message, list_attempts_by_msg, get_attempt, resend_webhook, list_event_types.
//
// Integration: rest-only
// Base URL: https://api.svix.com
// Auth: Bearer token (from Svix dashboard)
// Docs: https://docs.svix.com/api-reference
// Rate limits: Varies by plan; standard tier allows ~1000 req/min

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface SvixConfig {
  /** Svix authentication token from the dashboard */
  authToken: string;
  /** Optional base URL override (default: https://api.svix.com) */
  baseUrl?: string;
}

export class SvixMCPServer extends MCPAdapterBase {
  private readonly authToken: string;
  private readonly baseUrl: string;

  constructor(config: SvixConfig) {
    super();
    this.authToken = config.authToken;
    this.baseUrl = config.baseUrl ?? 'https://api.svix.com';
  }

  static catalog() {
    return {
      name: 'svix',
      displayName: 'Svix',
      version: '1.0.0',
      category: 'devops' as const,
      keywords: ['svix', 'webhook', 'delivery', 'endpoint', 'event', 'message', 'notification', 'devops'],
      toolNames: [
        'list_applications', 'get_application', 'create_application', 'update_application', 'delete_application',
        'list_endpoints', 'get_endpoint', 'create_endpoint', 'update_endpoint', 'delete_endpoint',
        'get_endpoint_secret', 'rotate_endpoint_secret', 'get_endpoint_stats',
        'list_messages', 'get_message', 'create_message',
        'list_attempts_by_msg', 'get_attempt', 'resend_webhook',
        'list_event_types',
      ],
      description: 'Webhook delivery and management via the Svix REST API — applications, endpoints, messages, delivery attempts, and event types.',
      author: 'protectnil' as const,
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_applications',
        description: 'List all Svix applications with optional pagination.',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Number of applications to return (default 50)' },
            iterator: { type: 'string', description: 'Pagination cursor from previous response' },
          },
        },
      },
      {
        name: 'get_application',
        description: 'Retrieve a single Svix application by ID.',
        inputSchema: {
          type: 'object',
          properties: {
            app_id: { type: 'string', description: 'Application ID or UID' },
          },
          required: ['app_id'],
        },
      },
      {
        name: 'create_application',
        description: 'Create a new Svix application. Each application typically maps to one user/tenant.',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Application name (required)' },
            uid: { type: 'string', description: 'Optional unique identifier for the application' },
            rateLimit: { type: 'number', description: 'Optional rate limit for message delivery (messages/second)' },
            metadata: { type: 'object', description: 'Key-value metadata to attach to the application' },
          },
          required: ['name'],
        },
      },
      {
        name: 'update_application',
        description: 'Update an existing Svix application name, UID, rate limit, or metadata.',
        inputSchema: {
          type: 'object',
          properties: {
            app_id: { type: 'string', description: 'Application ID or UID to update' },
            name: { type: 'string', description: 'New application name' },
            uid: { type: 'string', description: 'New unique identifier' },
            rateLimit: { type: 'number', description: 'New rate limit (messages/second)' },
            metadata: { type: 'object', description: 'Key-value metadata (replaces existing)' },
          },
          required: ['app_id', 'name'],
        },
      },
      {
        name: 'delete_application',
        description: 'Delete a Svix application and all its endpoints and messages.',
        inputSchema: {
          type: 'object',
          properties: {
            app_id: { type: 'string', description: 'Application ID or UID to delete' },
          },
          required: ['app_id'],
        },
      },
      {
        name: 'list_endpoints',
        description: 'List all endpoints for a Svix application.',
        inputSchema: {
          type: 'object',
          properties: {
            app_id: { type: 'string', description: 'Application ID or UID' },
            limit: { type: 'number', description: 'Number of endpoints to return (default 50)' },
            iterator: { type: 'string', description: 'Pagination cursor from previous response' },
          },
          required: ['app_id'],
        },
      },
      {
        name: 'get_endpoint',
        description: 'Retrieve a single endpoint by ID for a Svix application.',
        inputSchema: {
          type: 'object',
          properties: {
            app_id: { type: 'string', description: 'Application ID or UID' },
            endpoint_id: { type: 'string', description: 'Endpoint ID or UID' },
          },
          required: ['app_id', 'endpoint_id'],
        },
      },
      {
        name: 'create_endpoint',
        description: 'Create a new webhook endpoint for a Svix application.',
        inputSchema: {
          type: 'object',
          properties: {
            app_id: { type: 'string', description: 'Application ID or UID' },
            url: { type: 'string', description: 'Destination URL for webhook delivery (required)' },
            version: { type: 'number', description: 'Endpoint API version (required, e.g. 1)' },
            description: { type: 'string', description: 'Human-readable description' },
            filterTypes: { type: 'array', items: { type: 'string' }, description: 'Event types to subscribe to (empty = all)' },
            channels: { type: 'array', items: { type: 'string' }, description: 'Channels to subscribe to' },
            disabled: { type: 'boolean', description: 'Whether the endpoint is disabled' },
            rateLimit: { type: 'number', description: 'Per-endpoint rate limit (messages/second)' },
            uid: { type: 'string', description: 'Optional unique identifier for the endpoint' },
          },
          required: ['app_id', 'url', 'version'],
        },
      },
      {
        name: 'update_endpoint',
        description: 'Update an existing Svix endpoint URL, filter types, channels, or other settings.',
        inputSchema: {
          type: 'object',
          properties: {
            app_id: { type: 'string', description: 'Application ID or UID' },
            endpoint_id: { type: 'string', description: 'Endpoint ID or UID to update' },
            url: { type: 'string', description: 'New destination URL (required)' },
            version: { type: 'number', description: 'API version (required)' },
            description: { type: 'string', description: 'New description' },
            filterTypes: { type: 'array', items: { type: 'string' }, description: 'Updated event type filter list' },
            channels: { type: 'array', items: { type: 'string' }, description: 'Updated channel list' },
            disabled: { type: 'boolean', description: 'Enable or disable the endpoint' },
          },
          required: ['app_id', 'endpoint_id', 'url', 'version'],
        },
      },
      {
        name: 'delete_endpoint',
        description: 'Delete a Svix webhook endpoint from an application.',
        inputSchema: {
          type: 'object',
          properties: {
            app_id: { type: 'string', description: 'Application ID or UID' },
            endpoint_id: { type: 'string', description: 'Endpoint ID or UID to delete' },
          },
          required: ['app_id', 'endpoint_id'],
        },
      },
      {
        name: 'get_endpoint_secret',
        description: 'Retrieve the signing secret for a Svix endpoint (used to verify webhook authenticity).',
        inputSchema: {
          type: 'object',
          properties: {
            app_id: { type: 'string', description: 'Application ID or UID' },
            endpoint_id: { type: 'string', description: 'Endpoint ID or UID' },
          },
          required: ['app_id', 'endpoint_id'],
        },
      },
      {
        name: 'rotate_endpoint_secret',
        description: 'Rotate the signing secret for a Svix endpoint, optionally providing a new key.',
        inputSchema: {
          type: 'object',
          properties: {
            app_id: { type: 'string', description: 'Application ID or UID' },
            endpoint_id: { type: 'string', description: 'Endpoint ID or UID' },
            key: { type: 'string', description: 'Optional new signing key (base64-encoded, min 32 bytes)' },
          },
          required: ['app_id', 'endpoint_id'],
        },
      },
      {
        name: 'get_endpoint_stats',
        description: 'Get delivery statistics for a Svix endpoint — success, failure, and pending counts.',
        inputSchema: {
          type: 'object',
          properties: {
            app_id: { type: 'string', description: 'Application ID or UID' },
            endpoint_id: { type: 'string', description: 'Endpoint ID or UID' },
            since: { type: 'string', description: 'Start of stats window (ISO 8601 datetime)' },
            until: { type: 'string', description: 'End of stats window (ISO 8601 datetime)' },
          },
          required: ['app_id', 'endpoint_id'],
        },
      },
      {
        name: 'list_messages',
        description: 'List webhook messages sent to a Svix application with optional filters.',
        inputSchema: {
          type: 'object',
          properties: {
            app_id: { type: 'string', description: 'Application ID or UID' },
            limit: { type: 'number', description: 'Number of messages to return (default 50)' },
            iterator: { type: 'string', description: 'Pagination cursor' },
            channel: { type: 'string', description: 'Filter by channel name' },
            before: { type: 'string', description: 'Return messages before this timestamp (ISO 8601)' },
            after: { type: 'string', description: 'Return messages after this timestamp (ISO 8601)' },
          },
          required: ['app_id'],
        },
      },
      {
        name: 'get_message',
        description: 'Retrieve a single Svix message by ID.',
        inputSchema: {
          type: 'object',
          properties: {
            app_id: { type: 'string', description: 'Application ID or UID' },
            msg_id: { type: 'string', description: 'Message ID or event ID' },
          },
          required: ['app_id', 'msg_id'],
        },
      },
      {
        name: 'create_message',
        description: 'Send a new webhook message to all subscribed endpoints of a Svix application.',
        inputSchema: {
          type: 'object',
          properties: {
            app_id: { type: 'string', description: 'Application ID or UID' },
            eventType: { type: 'string', description: 'Event type identifier (e.g. "user.created")' },
            payload: { type: 'object', description: 'JSON payload to deliver to endpoints' },
            eventId: { type: 'string', description: 'Optional unique event ID for idempotency' },
            channels: { type: 'array', items: { type: 'string' }, description: 'Target specific channels only' },
            payloadRetentionPeriod: { type: 'number', description: 'Days to retain payload (default 90)' },
          },
          required: ['app_id', 'eventType', 'payload'],
        },
      },
      {
        name: 'list_attempts_by_msg',
        description: 'List delivery attempts for a specific Svix message across all endpoints.',
        inputSchema: {
          type: 'object',
          properties: {
            app_id: { type: 'string', description: 'Application ID or UID' },
            msg_id: { type: 'string', description: 'Message ID or event ID' },
            limit: { type: 'number', description: 'Number of attempts to return (default 50)' },
            iterator: { type: 'string', description: 'Pagination cursor' },
            status: { type: 'number', description: 'Filter by delivery status (0=success, 1=pending, 2=fail, 3=sending)' },
            endpoint_id: { type: 'string', description: 'Filter attempts by endpoint ID' },
          },
          required: ['app_id', 'msg_id'],
        },
      },
      {
        name: 'get_attempt',
        description: 'Retrieve a single delivery attempt for a Svix message, including response body and status code.',
        inputSchema: {
          type: 'object',
          properties: {
            app_id: { type: 'string', description: 'Application ID or UID' },
            msg_id: { type: 'string', description: 'Message ID or event ID' },
            attempt_id: { type: 'string', description: 'Attempt ID' },
          },
          required: ['app_id', 'msg_id', 'attempt_id'],
        },
      },
      {
        name: 'resend_webhook',
        description: 'Resend a specific Svix webhook message to a specific endpoint.',
        inputSchema: {
          type: 'object',
          properties: {
            app_id: { type: 'string', description: 'Application ID or UID' },
            msg_id: { type: 'string', description: 'Message ID or event ID to resend' },
            endpoint_id: { type: 'string', description: 'Target endpoint ID or UID' },
          },
          required: ['app_id', 'msg_id', 'endpoint_id'],
        },
      },
      {
        name: 'list_event_types',
        description: 'List all event types defined in the Svix environment with their schemas.',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Number of event types to return (default 50)' },
            iterator: { type: 'string', description: 'Pagination cursor' },
            include_archived: { type: 'boolean', description: 'Include archived event types (default false)' },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_applications': return await this.listApplications(args);
        case 'get_application': return await this.getApplication(args);
        case 'create_application': return await this.createApplication(args);
        case 'update_application': return await this.updateApplication(args);
        case 'delete_application': return await this.deleteApplication(args);
        case 'list_endpoints': return await this.listEndpoints(args);
        case 'get_endpoint': return await this.getEndpoint(args);
        case 'create_endpoint': return await this.createEndpoint(args);
        case 'update_endpoint': return await this.updateEndpoint(args);
        case 'delete_endpoint': return await this.deleteEndpoint(args);
        case 'get_endpoint_secret': return await this.getEndpointSecret(args);
        case 'rotate_endpoint_secret': return await this.rotateEndpointSecret(args);
        case 'get_endpoint_stats': return await this.getEndpointStats(args);
        case 'list_messages': return await this.listMessages(args);
        case 'get_message': return await this.getMessage(args);
        case 'create_message': return await this.createMessage(args);
        case 'list_attempts_by_msg': return await this.listAttemptsByMsg(args);
        case 'get_attempt': return await this.getAttempt(args);
        case 'resend_webhook': return await this.resendWebhook(args);
        case 'list_event_types': return await this.listEventTypes(args);
        default:
          return { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true };
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { content: [{ type: 'text', text: `Error calling ${name}: ${message}` }], isError: true };
    }
  }

  private async request(method: string, path: string, body?: unknown): Promise<unknown> {
    const url = `${this.baseUrl}${path}`;
    const res = await this.fetchWithRetry(url, {
      method,
      headers: {
        Authorization: `Bearer ${this.authToken}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    if (!res.ok) {
      throw new Error(`Svix API error ${res.status}: ${text.slice(0, 500)}`);
    }
    if (!text) return {};
    const data = JSON.parse(text);
    const str = JSON.stringify(data);
    return str.length > 10240 ? JSON.parse(str.slice(0, 10240) + '"') : data;
  }

  private ok(data: unknown): ToolResult {
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private buildQuery(params: Record<string, unknown>): string {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null) q.set(k, String(v));
    }
    const s = q.toString();
    return s ? `?${s}` : '';
  }

  private async listApplications(args: Record<string, unknown>): Promise<ToolResult> {
    const q = this.buildQuery({ limit: args.limit, iterator: args.iterator });
    return this.ok(await this.request('GET', `/api/v1/app/${q}`));
  }

  private async getApplication(args: Record<string, unknown>): Promise<ToolResult> {
    return this.ok(await this.request('GET', `/api/v1/app/${args.app_id}/`));
  }

  private async createApplication(args: Record<string, unknown>): Promise<ToolResult> {
    const { app_id: _unused, ...body } = args;
    return this.ok(await this.request('POST', '/api/v1/app/', body));
  }

  private async updateApplication(args: Record<string, unknown>): Promise<ToolResult> {
    const { app_id, ...body } = args;
    return this.ok(await this.request('PUT', `/api/v1/app/${app_id}/`, body));
  }

  private async deleteApplication(args: Record<string, unknown>): Promise<ToolResult> {
    await this.request('DELETE', `/api/v1/app/${args.app_id}/`);
    return this.ok({ deleted: true, app_id: args.app_id });
  }

  private async listEndpoints(args: Record<string, unknown>): Promise<ToolResult> {
    const q = this.buildQuery({ limit: args.limit, iterator: args.iterator });
    return this.ok(await this.request('GET', `/api/v1/app/${args.app_id}/endpoint/${q}`));
  }

  private async getEndpoint(args: Record<string, unknown>): Promise<ToolResult> {
    return this.ok(await this.request('GET', `/api/v1/app/${args.app_id}/endpoint/${args.endpoint_id}/`));
  }

  private async createEndpoint(args: Record<string, unknown>): Promise<ToolResult> {
    const { app_id, ...body } = args;
    return this.ok(await this.request('POST', `/api/v1/app/${app_id}/endpoint/`, body));
  }

  private async updateEndpoint(args: Record<string, unknown>): Promise<ToolResult> {
    const { app_id, endpoint_id, ...body } = args;
    return this.ok(await this.request('PUT', `/api/v1/app/${app_id}/endpoint/${endpoint_id}/`, body));
  }

  private async deleteEndpoint(args: Record<string, unknown>): Promise<ToolResult> {
    await this.request('DELETE', `/api/v1/app/${args.app_id}/endpoint/${args.endpoint_id}/`);
    return this.ok({ deleted: true, endpoint_id: args.endpoint_id });
  }

  private async getEndpointSecret(args: Record<string, unknown>): Promise<ToolResult> {
    return this.ok(await this.request('GET', `/api/v1/app/${args.app_id}/endpoint/${args.endpoint_id}/secret/`));
  }

  private async rotateEndpointSecret(args: Record<string, unknown>): Promise<ToolResult> {
    const { app_id, endpoint_id, key } = args;
    await this.request('POST', `/api/v1/app/${app_id}/endpoint/${endpoint_id}/secret/rotate/`, key ? { key } : {});
    return this.ok({ rotated: true, endpoint_id });
  }

  private async getEndpointStats(args: Record<string, unknown>): Promise<ToolResult> {
    const q = this.buildQuery({ since: args.since, until: args.until });
    return this.ok(await this.request('GET', `/api/v1/app/${args.app_id}/endpoint/${args.endpoint_id}/stats/${q}`));
  }

  private async listMessages(args: Record<string, unknown>): Promise<ToolResult> {
    const q = this.buildQuery({ limit: args.limit, iterator: args.iterator, channel: args.channel, before: args.before, after: args.after });
    return this.ok(await this.request('GET', `/api/v1/app/${args.app_id}/msg/${q}`));
  }

  private async getMessage(args: Record<string, unknown>): Promise<ToolResult> {
    return this.ok(await this.request('GET', `/api/v1/app/${args.app_id}/msg/${args.msg_id}/`));
  }

  private async createMessage(args: Record<string, unknown>): Promise<ToolResult> {
    const { app_id, ...body } = args;
    return this.ok(await this.request('POST', `/api/v1/app/${app_id}/msg/`, body));
  }

  private async listAttemptsByMsg(args: Record<string, unknown>): Promise<ToolResult> {
    const q = this.buildQuery({ limit: args.limit, iterator: args.iterator, status: args.status, endpoint_id: args.endpoint_id });
    return this.ok(await this.request('GET', `/api/v1/app/${args.app_id}/msg/${args.msg_id}/attempt/${q}`));
  }

  private async getAttempt(args: Record<string, unknown>): Promise<ToolResult> {
    return this.ok(await this.request('GET', `/api/v1/app/${args.app_id}/msg/${args.msg_id}/attempt/${args.attempt_id}/`));
  }

  private async resendWebhook(args: Record<string, unknown>): Promise<ToolResult> {
    await this.request('POST', `/api/v1/app/${args.app_id}/msg/${args.msg_id}/endpoint/${args.endpoint_id}/resend/`, {});
    return this.ok({ queued: true, msg_id: args.msg_id, endpoint_id: args.endpoint_id });
  }

  private async listEventTypes(args: Record<string, unknown>): Promise<ToolResult> {
    const q = this.buildQuery({ limit: args.limit, iterator: args.iterator, include_archived: args.include_archived });
    return this.ok(await this.request('GET', `/api/v1/event-type/${q}`));
  }
}

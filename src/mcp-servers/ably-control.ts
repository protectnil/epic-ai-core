/**
 * Ably Control API MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// No official Ably Control API MCP server was found on GitHub. We build a full REST wrapper
// for complete Control API coverage.
//
// Base URL: https://control.ably.net/v1
// Auth: HTTP Bearer token (Ably Control API token — create at https://ably.com/users/access_tokens)
// Docs: https://ably.com/documentation/control-api
// Spec: https://api.apis.guru/v2/specs/ably.net/control/1.0.14/openapi.json
// Category: communication
// Rate limits: See Ably docs — Control API is a management-plane API, not subject to channel rate limits

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface AblyControlConfig {
  accessToken: string;
  baseUrl?: string;
}

export class AblyControlMCPServer extends MCPAdapterBase {
  private readonly accessToken: string;
  private readonly baseUrl: string;

  constructor(config: AblyControlConfig) {
    super();
    this.accessToken = config.accessToken;
    this.baseUrl = config.baseUrl || 'https://control.ably.net/v1';
  }

  static catalog() {
    return {
      name: 'ably-control',
      displayName: 'Ably Control API',
      version: '1.0.0',
      category: 'communication',
      keywords: [
        'ably', 'control', 'realtime', 'messaging', 'pubsub', 'app management',
        'api key', 'namespace', 'queue', 'reactor', 'rule', 'webhook',
        'push notifications', 'channel', 'apns', 'token', 'account',
      ],
      toolNames: [
        'get_account_token_details',
        'list_apps', 'create_app', 'update_app', 'delete_app', 'update_app_apns',
        'list_keys', 'create_key', 'update_key', 'revoke_key',
        'list_namespaces', 'create_namespace', 'update_namespace', 'delete_namespace',
        'list_queues', 'create_queue', 'delete_queue',
        'list_rules', 'get_rule', 'create_rule', 'update_rule', 'delete_rule',
      ],
      description: 'Ably Control API: manage Ably applications, API keys, namespaces, queues, and Reactor rules from your account.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      // ── Account ────────────────────────────────────────────────────────────
      {
        name: 'get_account_token_details',
        description: 'Get details about the current Control API access token, including the account ID and user information',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      // ── Apps ───────────────────────────────────────────────────────────────
      {
        name: 'list_apps',
        description: 'List all Ably applications in the account',
        inputSchema: {
          type: 'object',
          properties: {
            account_id: {
              type: 'string',
              description: 'Ably account ID to list apps for (obtained from get_account_token_details)',
            },
          },
          required: ['account_id'],
        },
      },
      {
        name: 'create_app',
        description: 'Create a new Ably application in the account',
        inputSchema: {
          type: 'object',
          properties: {
            account_id: {
              type: 'string',
              description: 'Ably account ID under which to create the app',
            },
            name: {
              type: 'string',
              description: 'Display name for the new application',
            },
            status: {
              type: 'string',
              description: 'Initial status of the app: enabled or disabled (default: enabled)',
            },
            tlsOnly: {
              type: 'boolean',
              description: 'If true, only TLS connections are permitted',
            },
          },
          required: ['account_id'],
        },
      },
      {
        name: 'update_app',
        description: 'Update an existing Ably application by app ID — rename, change status, or toggle TLS enforcement',
        inputSchema: {
          type: 'object',
          properties: {
            app_id: {
              type: 'string',
              description: 'Ably application ID to update',
            },
            name: {
              type: 'string',
              description: 'New display name for the application',
            },
            status: {
              type: 'string',
              description: 'New status: enabled or disabled',
            },
            tlsOnly: {
              type: 'boolean',
              description: 'If true, only TLS connections are permitted',
            },
          },
          required: ['app_id'],
        },
      },
      {
        name: 'delete_app',
        description: 'Delete an Ably application by app ID (irreversible — all keys, channels, and queues will be removed)',
        inputSchema: {
          type: 'object',
          properties: {
            app_id: {
              type: 'string',
              description: 'Ably application ID to delete',
            },
          },
          required: ['app_id'],
        },
      },
      {
        name: 'update_app_apns',
        description: "Update an Ably application's Apple Push Notification Service (APNs) configuration from a .p12 certificate file",
        inputSchema: {
          type: 'object',
          properties: {
            app_id: {
              type: 'string',
              description: 'Ably application ID to update APNs settings for',
            },
            p12_file_base64: {
              type: 'string',
              description: 'Base64-encoded contents of the .p12 certificate file',
            },
            p12_password: {
              type: 'string',
              description: 'Password for the .p12 certificate file',
            },
          },
          required: ['app_id', 'p12_file_base64'],
        },
      },
      // ── Keys ───────────────────────────────────────────────────────────────
      {
        name: 'list_keys',
        description: 'List all API keys for an Ably application, including their capabilities and status',
        inputSchema: {
          type: 'object',
          properties: {
            app_id: {
              type: 'string',
              description: 'Ably application ID to list keys for',
            },
          },
          required: ['app_id'],
        },
      },
      {
        name: 'create_key',
        description: 'Create a new API key for an Ably application with specified capabilities',
        inputSchema: {
          type: 'object',
          properties: {
            app_id: {
              type: 'string',
              description: 'Ably application ID to create the key under',
            },
            name: {
              type: 'string',
              description: 'Display name for the API key',
            },
            capability: {
              type: 'object',
              description: 'Capabilities object mapping channel name patterns to permission arrays (e.g. {"*": ["publish","subscribe","presence"]})',
            },
          },
          required: ['app_id'],
        },
      },
      {
        name: 'update_key',
        description: 'Update an existing Ably API key — change name or capabilities',
        inputSchema: {
          type: 'object',
          properties: {
            app_id: {
              type: 'string',
              description: 'Ably application ID that owns the key',
            },
            key_id: {
              type: 'string',
              description: 'API key ID to update',
            },
            name: {
              type: 'string',
              description: 'New display name for the key',
            },
            capability: {
              type: 'object',
              description: 'Updated capabilities object mapping channel patterns to permission arrays',
            },
          },
          required: ['app_id', 'key_id'],
        },
      },
      {
        name: 'revoke_key',
        description: 'Revoke an Ably API key immediately — all clients using this key will be disconnected',
        inputSchema: {
          type: 'object',
          properties: {
            app_id: {
              type: 'string',
              description: 'Ably application ID that owns the key',
            },
            key_id: {
              type: 'string',
              description: 'API key ID to revoke',
            },
          },
          required: ['app_id', 'key_id'],
        },
      },
      // ── Namespaces ─────────────────────────────────────────────────────────
      {
        name: 'list_namespaces',
        description: 'List all channel namespaces for an Ably application, showing persistence and push-publishing rules',
        inputSchema: {
          type: 'object',
          properties: {
            app_id: {
              type: 'string',
              description: 'Ably application ID to list namespaces for',
            },
          },
          required: ['app_id'],
        },
      },
      {
        name: 'create_namespace',
        description: 'Create a new channel namespace for an Ably application with optional persistence and push settings',
        inputSchema: {
          type: 'object',
          properties: {
            app_id: {
              type: 'string',
              description: 'Ably application ID to create the namespace under',
            },
            id: {
              type: 'string',
              description: 'Namespace identifier — channel names starting with this prefix:* will use these settings',
            },
            persisted: {
              type: 'boolean',
              description: 'If true, messages on channels in this namespace are persisted to history',
            },
            pushEnabled: {
              type: 'boolean',
              description: 'If true, push notifications can be published to channels in this namespace',
            },
            tlsOnly: {
              type: 'boolean',
              description: 'If true, only TLS connections are permitted on channels in this namespace',
            },
          },
          required: ['app_id'],
        },
      },
      {
        name: 'update_namespace',
        description: 'Update an existing channel namespace — modify persistence, push-enabled, or TLS settings',
        inputSchema: {
          type: 'object',
          properties: {
            app_id: {
              type: 'string',
              description: 'Ably application ID that owns the namespace',
            },
            namespace_id: {
              type: 'string',
              description: 'Namespace identifier to update',
            },
            persisted: {
              type: 'boolean',
              description: 'If true, messages on channels in this namespace are persisted to history',
            },
            pushEnabled: {
              type: 'boolean',
              description: 'If true, push notifications can be published to channels in this namespace',
            },
            tlsOnly: {
              type: 'boolean',
              description: 'If true, only TLS connections are permitted on channels in this namespace',
            },
          },
          required: ['app_id', 'namespace_id'],
        },
      },
      {
        name: 'delete_namespace',
        description: 'Delete a channel namespace from an Ably application by namespace ID',
        inputSchema: {
          type: 'object',
          properties: {
            app_id: {
              type: 'string',
              description: 'Ably application ID that owns the namespace',
            },
            namespace_id: {
              type: 'string',
              description: 'Namespace identifier to delete',
            },
          },
          required: ['app_id', 'namespace_id'],
        },
      },
      // ── Queues ─────────────────────────────────────────────────────────────
      {
        name: 'list_queues',
        description: 'List all Ably queues for an application, including AMQP/STOMP endpoint details and stats',
        inputSchema: {
          type: 'object',
          properties: {
            app_id: {
              type: 'string',
              description: 'Ably application ID to list queues for',
            },
          },
          required: ['app_id'],
        },
      },
      {
        name: 'create_queue',
        description: 'Create a new Ably queue for an application with optional TTL, max length, and dead-letter settings',
        inputSchema: {
          type: 'object',
          properties: {
            app_id: {
              type: 'string',
              description: 'Ably application ID to create the queue under',
            },
            name: {
              type: 'string',
              description: 'Queue name (must be unique within the app)',
            },
            ttl: {
              type: 'number',
              description: 'Time-to-live for messages in the queue in seconds (default: 60)',
            },
            maxLength: {
              type: 'number',
              description: 'Maximum number of messages in the queue before older messages are dropped (default: 10000)',
            },
            region: {
              type: 'string',
              description: 'AWS region where the queue will be provisioned (e.g. us-east-1-a)',
            },
          },
          required: ['app_id', 'name'],
        },
      },
      {
        name: 'delete_queue',
        description: 'Delete an Ably queue from an application by queue ID (all unprocessed messages are lost)',
        inputSchema: {
          type: 'object',
          properties: {
            app_id: {
              type: 'string',
              description: 'Ably application ID that owns the queue',
            },
            queue_id: {
              type: 'string',
              description: 'Queue ID to delete',
            },
          },
          required: ['app_id', 'queue_id'],
        },
      },
      // ── Reactor Rules ──────────────────────────────────────────────────────
      {
        name: 'list_rules',
        description: 'List all Reactor rules for an Ably application — these define integrations triggered by channel events (webhooks, Firehose, queues, etc.)',
        inputSchema: {
          type: 'object',
          properties: {
            app_id: {
              type: 'string',
              description: 'Ably application ID to list Reactor rules for',
            },
          },
          required: ['app_id'],
        },
      },
      {
        name: 'get_rule',
        description: 'Get the full configuration for a specific Ably Reactor rule by rule ID',
        inputSchema: {
          type: 'object',
          properties: {
            app_id: {
              type: 'string',
              description: 'Ably application ID that owns the rule',
            },
            rule_id: {
              type: 'string',
              description: 'Reactor rule ID to retrieve',
            },
          },
          required: ['app_id', 'rule_id'],
        },
      },
      {
        name: 'create_rule',
        description: 'Create a new Reactor rule to forward Ably channel events to an external target (HTTP, AWS SQS, Kinesis, Lambda, Azure Functions, Google Cloud Functions, IFTTT, Zapier, etc.)',
        inputSchema: {
          type: 'object',
          properties: {
            app_id: {
              type: 'string',
              description: 'Ably application ID to create the rule under',
            },
            status: {
              type: 'string',
              description: 'Rule status: enabled or disabled',
            },
            requestMode: {
              type: 'string',
              description: 'Message delivery mode: single (one request per message) or batch',
            },
            source: {
              type: 'object',
              description: 'Event source — channel filter and event type. Example: {"channelFilter": "chat:*", "type": "channel.message"}',
            },
            target: {
              type: 'object',
              description: 'Integration target config — shape depends on rule type (HTTP, SQS, Kinesis, Lambda, etc.)',
            },
          },
          required: ['app_id', 'source', 'target'],
        },
      },
      {
        name: 'update_rule',
        description: 'Update an existing Ably Reactor rule — modify status, source filter, or target configuration',
        inputSchema: {
          type: 'object',
          properties: {
            app_id: {
              type: 'string',
              description: 'Ably application ID that owns the rule',
            },
            rule_id: {
              type: 'string',
              description: 'Reactor rule ID to update',
            },
            status: {
              type: 'string',
              description: 'Updated status: enabled or disabled',
            },
            requestMode: {
              type: 'string',
              description: 'Updated delivery mode: single or batch',
            },
            source: {
              type: 'object',
              description: 'Updated event source with channelFilter and type',
            },
            target: {
              type: 'object',
              description: 'Updated target configuration',
            },
          },
          required: ['app_id', 'rule_id'],
        },
      },
      {
        name: 'delete_rule',
        description: 'Delete an Ably Reactor rule by rule ID — the integration will stop forwarding events immediately',
        inputSchema: {
          type: 'object',
          properties: {
            app_id: {
              type: 'string',
              description: 'Ably application ID that owns the rule',
            },
            rule_id: {
              type: 'string',
              description: 'Reactor rule ID to delete',
            },
          },
          required: ['app_id', 'rule_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'get_account_token_details': return this.getAccountTokenDetails();
        case 'list_apps':                 return this.listApps(args);
        case 'create_app':                return this.createApp(args);
        case 'update_app':                return this.updateApp(args);
        case 'delete_app':                return this.deleteApp(args);
        case 'update_app_apns':           return this.updateAppApns(args);
        case 'list_keys':                 return this.listKeys(args);
        case 'create_key':                return this.createKey(args);
        case 'update_key':                return this.updateKey(args);
        case 'revoke_key':                return this.revokeKey(args);
        case 'list_namespaces':           return this.listNamespaces(args);
        case 'create_namespace':          return this.createNamespace(args);
        case 'update_namespace':          return this.updateNamespace(args);
        case 'delete_namespace':          return this.deleteNamespace(args);
        case 'list_queues':               return this.listQueues(args);
        case 'create_queue':              return this.createQueue(args);
        case 'delete_queue':              return this.deleteQueue(args);
        case 'list_rules':                return this.listRules(args);
        case 'get_rule':                  return this.getRule(args);
        case 'create_rule':               return this.createRule(args);
        case 'update_rule':               return this.updateRule(args);
        case 'delete_rule':               return this.deleteRule(args);
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

  private get authHeader(): string {
    return `Bearer ${this.accessToken}`;
  }

  private async request(
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
    path: string,
    body?: Record<string, unknown>,
  ): Promise<ToolResult> {
    const url = `${this.baseUrl}${path}`;
    const init: RequestInit = {
      method,
      headers: {
        Authorization: this.authHeader,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    };
    if (body && Object.keys(body).length > 0) init.body = JSON.stringify(body);
    const response = await this.fetchWithRetry(url, init);
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${errText}` }],
        isError: true,
      };
    }
    if (response.status === 204) {
      return { content: [{ type: 'text', text: '{"success":true}' }], isError: false };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  // ── Account ────────────────────────────────────────────────────────────────

  private async getAccountTokenDetails(): Promise<ToolResult> {
    return this.request('GET', '/me');
  }

  // ── Apps ───────────────────────────────────────────────────────────────────

  private async listApps(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.account_id) return { content: [{ type: 'text', text: 'account_id is required' }], isError: true };
    return this.request('GET', `/accounts/${encodeURIComponent(args.account_id as string)}/apps`);
  }

  private async createApp(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.account_id) return { content: [{ type: 'text', text: 'account_id is required' }], isError: true };
    const { account_id, ...body } = args;
    return this.request('POST', `/accounts/${encodeURIComponent(account_id as string)}/apps`, body as Record<string, unknown>);
  }

  private async updateApp(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.app_id) return { content: [{ type: 'text', text: 'app_id is required' }], isError: true };
    const { app_id, ...body } = args;
    return this.request('PATCH', `/apps/${encodeURIComponent(app_id as string)}`, body as Record<string, unknown>);
  }

  private async deleteApp(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.app_id) return { content: [{ type: 'text', text: 'app_id is required' }], isError: true };
    return this.request('DELETE', `/apps/${encodeURIComponent(args.app_id as string)}`);
  }

  private async updateAppApns(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.app_id || !args.p12_file_base64) {
      return { content: [{ type: 'text', text: 'app_id and p12_file_base64 are required' }], isError: true };
    }
    const body: Record<string, unknown> = { p12File: args.p12_file_base64 };
    if (args.p12_password) body.p12Password = args.p12_password;
    return this.request('POST', `/apps/${encodeURIComponent(args.app_id as string)}/pkcs12`, body);
  }

  // ── Keys ───────────────────────────────────────────────────────────────────

  private async listKeys(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.app_id) return { content: [{ type: 'text', text: 'app_id is required' }], isError: true };
    return this.request('GET', `/apps/${encodeURIComponent(args.app_id as string)}/keys`);
  }

  private async createKey(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.app_id) return { content: [{ type: 'text', text: 'app_id is required' }], isError: true };
    const { app_id, ...body } = args;
    return this.request('POST', `/apps/${encodeURIComponent(app_id as string)}/keys`, body as Record<string, unknown>);
  }

  private async updateKey(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.app_id || !args.key_id) {
      return { content: [{ type: 'text', text: 'app_id and key_id are required' }], isError: true };
    }
    const { app_id, key_id, ...body } = args;
    return this.request('PATCH', `/apps/${encodeURIComponent(app_id as string)}/keys/${encodeURIComponent(key_id as string)}`, body as Record<string, unknown>);
  }

  private async revokeKey(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.app_id || !args.key_id) {
      return { content: [{ type: 'text', text: 'app_id and key_id are required' }], isError: true };
    }
    return this.request('POST', `/apps/${encodeURIComponent(args.app_id as string)}/keys/${encodeURIComponent(args.key_id as string)}/revoke`);
  }

  // ── Namespaces ─────────────────────────────────────────────────────────────

  private async listNamespaces(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.app_id) return { content: [{ type: 'text', text: 'app_id is required' }], isError: true };
    return this.request('GET', `/apps/${encodeURIComponent(args.app_id as string)}/namespaces`);
  }

  private async createNamespace(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.app_id) return { content: [{ type: 'text', text: 'app_id is required' }], isError: true };
    const { app_id, ...body } = args;
    return this.request('POST', `/apps/${encodeURIComponent(app_id as string)}/namespaces`, body as Record<string, unknown>);
  }

  private async updateNamespace(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.app_id || !args.namespace_id) {
      return { content: [{ type: 'text', text: 'app_id and namespace_id are required' }], isError: true };
    }
    const { app_id, namespace_id, ...body } = args;
    return this.request('PATCH', `/apps/${encodeURIComponent(app_id as string)}/namespaces/${encodeURIComponent(namespace_id as string)}`, body as Record<string, unknown>);
  }

  private async deleteNamespace(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.app_id || !args.namespace_id) {
      return { content: [{ type: 'text', text: 'app_id and namespace_id are required' }], isError: true };
    }
    return this.request('DELETE', `/apps/${encodeURIComponent(args.app_id as string)}/namespaces/${encodeURIComponent(args.namespace_id as string)}`);
  }

  // ── Queues ─────────────────────────────────────────────────────────────────

  private async listQueues(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.app_id) return { content: [{ type: 'text', text: 'app_id is required' }], isError: true };
    return this.request('GET', `/apps/${encodeURIComponent(args.app_id as string)}/queues`);
  }

  private async createQueue(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.app_id || !args.name) {
      return { content: [{ type: 'text', text: 'app_id and name are required' }], isError: true };
    }
    const { app_id, ...body } = args;
    return this.request('POST', `/apps/${encodeURIComponent(app_id as string)}/queues`, body as Record<string, unknown>);
  }

  private async deleteQueue(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.app_id || !args.queue_id) {
      return { content: [{ type: 'text', text: 'app_id and queue_id are required' }], isError: true };
    }
    return this.request('DELETE', `/apps/${encodeURIComponent(args.app_id as string)}/queues/${encodeURIComponent(args.queue_id as string)}`);
  }

  // ── Reactor Rules ──────────────────────────────────────────────────────────

  private async listRules(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.app_id) return { content: [{ type: 'text', text: 'app_id is required' }], isError: true };
    return this.request('GET', `/apps/${encodeURIComponent(args.app_id as string)}/rules`);
  }

  private async getRule(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.app_id || !args.rule_id) {
      return { content: [{ type: 'text', text: 'app_id and rule_id are required' }], isError: true };
    }
    return this.request('GET', `/apps/${encodeURIComponent(args.app_id as string)}/rules/${encodeURIComponent(args.rule_id as string)}`);
  }

  private async createRule(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.app_id || !args.source || !args.target) {
      return { content: [{ type: 'text', text: 'app_id, source, and target are required' }], isError: true };
    }
    const { app_id, ...body } = args;
    return this.request('POST', `/apps/${encodeURIComponent(app_id as string)}/rules`, body as Record<string, unknown>);
  }

  private async updateRule(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.app_id || !args.rule_id) {
      return { content: [{ type: 'text', text: 'app_id and rule_id are required' }], isError: true };
    }
    const { app_id, rule_id, ...body } = args;
    return this.request('PATCH', `/apps/${encodeURIComponent(app_id as string)}/rules/${encodeURIComponent(rule_id as string)}`, body as Record<string, unknown>);
  }

  private async deleteRule(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.app_id || !args.rule_id) {
      return { content: [{ type: 'text', text: 'app_id and rule_id are required' }], isError: true };
    }
    return this.request('DELETE', `/apps/${encodeURIComponent(args.app_id as string)}/rules/${encodeURIComponent(args.rule_id as string)}`);
  }
}

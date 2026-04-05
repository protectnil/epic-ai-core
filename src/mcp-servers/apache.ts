/**
 * Apache Qakka MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// No official Apache Qakka MCP server was found on GitHub as of 2026-03-28.
// Our adapter covers: 9 tools. Vendor MCP covers: 0 tools (none exists).
// Recommendation: use-rest-api — no official MCP server exists.
//
// Base URL: https://apache.local (self-hosted; override via config.baseUrl)
// Auth: None documented — Qakka is self-hosted; add Bearer/Basic via config if your deployment requires it
// Docs: https://github.com/apache/usergrid-qakka
// Rate limits: Not documented — self-hosted deployment; limits depend on your infrastructure.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface ApacheConfig {
  /** Base URL of the Qakka deployment (default: https://apache.local) */
  baseUrl?: string;
  /** Optional Bearer token if your Qakka deployment requires auth */
  apiToken?: string;
}

export class ApacheMCPServer extends MCPAdapterBase {
  private readonly baseUrl: string;
  private readonly apiToken: string | undefined;

  constructor(config: ApacheConfig = {}) {
    super();
    this.baseUrl = config.baseUrl ?? 'https://apache.local';
    this.apiToken = config.apiToken;
  }

  static catalog() {
    return {
      name: 'apache',
      displayName: 'Apache Qakka',
      version: '1.0.0',
      category: 'devops',
      keywords: [
        'apache', 'qakka', 'queue', 'message-queue', 'messaging', 'distributed',
        'pub-sub', 'async', 'worker', 'job-queue', 'task-queue', 'broker',
        'usergrid', 'apache-qakka',
      ],
      toolNames: [
        'list_queues', 'create_queue', 'delete_queue',
        'get_queue_config', 'update_queue_config',
        'send_message', 'get_next_messages', 'ack_message',
        'get_message_data', 'get_status',
      ],
      description: 'Apache Qakka distributed message queue: create and manage queues, send and receive messages, acknowledge processing, and check system status.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_queues',
        description: 'List all queues in the Qakka system with their names and configuration',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'create_queue',
        description: 'Create a new Qakka message queue with the specified name and optional configuration',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Unique name for the new queue (required)',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'delete_queue',
        description: 'Delete a Qakka queue by name — requires confirm flag to prevent accidental deletion',
        inputSchema: {
          type: 'object',
          properties: {
            queue_name: {
              type: 'string',
              description: 'Name of the queue to delete',
            },
            confirm: {
              type: 'boolean',
              description: 'Must be true to confirm deletion (default: false)',
            },
          },
          required: ['queue_name'],
        },
      },
      {
        name: 'get_queue_config',
        description: 'Get the current configuration for a named Qakka queue including retention and region settings',
        inputSchema: {
          type: 'object',
          properties: {
            queue_name: {
              type: 'string',
              description: 'Name of the queue',
            },
          },
          required: ['queue_name'],
        },
      },
      {
        name: 'update_queue_config',
        description: 'Update configuration for an existing Qakka queue such as retention policy or region assignments',
        inputSchema: {
          type: 'object',
          properties: {
            queue_name: {
              type: 'string',
              description: 'Name of the queue to update',
            },
            config: {
              type: 'object',
              description: 'Queue configuration object with fields to update (e.g. name, regions)',
            },
          },
          required: ['queue_name'],
        },
      },
      {
        name: 'send_message',
        description: 'Send a message to a Qakka queue with binary or JSON payload, optional region targeting and delivery delay',
        inputSchema: {
          type: 'object',
          properties: {
            queue_name: {
              type: 'string',
              description: 'Name of the queue to send the message to',
            },
            content_type: {
              type: 'string',
              description: 'MIME content type of the message payload (e.g. application/json, application/octet-stream)',
            },
            data: {
              type: 'string',
              description: 'Message payload as a string or base64-encoded bytes',
            },
            regions: {
              type: 'string',
              description: 'Comma-separated list of regions to send the message to (default: local region)',
            },
            delay: {
              type: 'string',
              description: 'Delivery delay in seconds before the message becomes visible (e.g. "30")',
            },
            expiration: {
              type: 'string',
              description: 'Message expiration time in seconds from now (e.g. "3600")',
            },
          },
          required: ['queue_name', 'content_type', 'data'],
        },
      },
      {
        name: 'get_next_messages',
        description: 'Retrieve the next available messages from a Qakka queue for processing — messages become in-flight until acknowledged',
        inputSchema: {
          type: 'object',
          properties: {
            queue_name: {
              type: 'string',
              description: 'Name of the queue to receive messages from',
            },
            count: {
              type: 'number',
              description: 'Number of messages to retrieve in one call (default: 1)',
            },
          },
          required: ['queue_name'],
        },
      },
      {
        name: 'ack_message',
        description: 'Acknowledge that a Qakka queue message has been successfully processed — removes it from the in-flight state',
        inputSchema: {
          type: 'object',
          properties: {
            queue_name: {
              type: 'string',
              description: 'Name of the queue containing the message',
            },
            queue_message_id: {
              type: 'string',
              description: 'UUID of the queue message to acknowledge (from get_next_messages response)',
            },
          },
          required: ['queue_name', 'queue_message_id'],
        },
      },
      {
        name: 'get_message_data',
        description: 'Retrieve the data payload associated with a specific Qakka queue message by its message ID',
        inputSchema: {
          type: 'object',
          properties: {
            queue_name: {
              type: 'string',
              description: 'Name of the queue containing the message',
            },
            queue_message_id: {
              type: 'string',
              description: 'UUID of the queue message whose data is to be retrieved',
            },
          },
          required: ['queue_name', 'queue_message_id'],
        },
      },
      {
        name: 'get_status',
        description: 'Check the health and status of the Qakka web application and queue system',
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
        case 'list_queues':
          return this.listQueues();
        case 'create_queue':
          return this.createQueue(args);
        case 'delete_queue':
          return this.deleteQueue(args);
        case 'get_queue_config':
          return this.getQueueConfig(args);
        case 'update_queue_config':
          return this.updateQueueConfig(args);
        case 'send_message':
          return this.sendMessage(args);
        case 'get_next_messages':
          return this.getNextMessages(args);
        case 'ack_message':
          return this.ackMessage(args);
        case 'get_message_data':
          return this.getMessageData(args);
        case 'get_status':
          return this.getStatus();
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

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json', 'Accept': 'application/json' };
    if (this.apiToken) {
      headers['Authorization'] = `Bearer ${this.apiToken}`;
    }
    return headers;
  }

  private async request(method: string, path: string, body?: unknown): Promise<ToolResult> {
    const options: RequestInit = {
      method,
      headers: this.buildHeaders(),
    };
    if (body !== undefined) {
      options.body = JSON.stringify(body);
    }
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, options);
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
      return {
        content: [{ type: 'text', text: `Qakka API returned non-JSON (HTTP ${response.status})` }],
        isError: true,
      };
    }
    return {
      content: [{ type: 'text', text: this.truncate(data) }],
      isError: false,
    };
  }

  private async listQueues(): Promise<ToolResult> {
    return this.request('GET', '/queues');
  }

  private async createQueue(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name) {
      return { content: [{ type: 'text', text: 'name is required' }], isError: true };
    }
    return this.request('POST', '/queues', { name: args.name });
  }

  private async deleteQueue(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.queue_name) {
      return { content: [{ type: 'text', text: 'queue_name is required' }], isError: true };
    }
    const confirm = args.confirm === true ? 'true' : 'false';
    return this.request('DELETE', `/queues/${encodeURIComponent(args.queue_name as string)}?confirm=${confirm}`);
  }

  private async getQueueConfig(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.queue_name) {
      return { content: [{ type: 'text', text: 'queue_name is required' }], isError: true };
    }
    return this.request('GET', `/queues/${encodeURIComponent(args.queue_name as string)}/config`);
  }

  private async updateQueueConfig(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.queue_name) {
      return { content: [{ type: 'text', text: 'queue_name is required' }], isError: true };
    }
    const body = args.config ?? {};
    return this.request('PUT', `/queues/${encodeURIComponent(args.queue_name as string)}/config`, body);
  }

  private async sendMessage(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.queue_name) {
      return { content: [{ type: 'text', text: 'queue_name is required' }], isError: true };
    }
    if (!args.content_type) {
      return { content: [{ type: 'text', text: 'content_type is required' }], isError: true };
    }
    if (args.data === undefined) {
      return { content: [{ type: 'text', text: 'data is required' }], isError: true };
    }
    const params = new URLSearchParams({ contentType: args.content_type as string });
    if (args.regions) params.set('regions', args.regions as string);
    if (args.delay) params.set('delay', args.delay as string);
    if (args.expiration) params.set('expiration', args.expiration as string);
    const path = `/queues/${encodeURIComponent(args.queue_name as string)}/messages?${params.toString()}`;
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: { ...this.buildHeaders(), 'Content-Type': 'application/octet-stream' },
      body: args.data as string,
    });
    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }
    let data: unknown;
    try { data = await response.json(); } catch {
      return { content: [{ type: 'text', text: `Qakka API returned non-JSON (HTTP ${response.status})` }], isError: true };
    }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getNextMessages(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.queue_name) {
      return { content: [{ type: 'text', text: 'queue_name is required' }], isError: true };
    }
    const count = (args.count as number) ?? 1;
    return this.request('GET', `/queues/${encodeURIComponent(args.queue_name as string)}/messages?count=${count}`);
  }

  private async ackMessage(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.queue_name) {
      return { content: [{ type: 'text', text: 'queue_name is required' }], isError: true };
    }
    if (!args.queue_message_id) {
      return { content: [{ type: 'text', text: 'queue_message_id is required' }], isError: true };
    }
    return this.request(
      'DELETE',
      `/queues/${encodeURIComponent(args.queue_name as string)}/messages/${encodeURIComponent(args.queue_message_id as string)}`,
    );
  }

  private async getMessageData(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.queue_name) {
      return { content: [{ type: 'text', text: 'queue_name is required' }], isError: true };
    }
    if (!args.queue_message_id) {
      return { content: [{ type: 'text', text: 'queue_message_id is required' }], isError: true };
    }
    return this.request(
      'GET',
      `/queues/${encodeURIComponent(args.queue_name as string)}/data/${encodeURIComponent(args.queue_message_id as string)}`,
    );
  }

  private async getStatus(): Promise<ToolResult> {
    return this.request('GET', '/status');
  }
}

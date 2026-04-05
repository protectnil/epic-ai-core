/**
 * Firebase Cloud Messaging (FCM) MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// No official Firebase Cloud Messaging MCP server was found on GitHub.
// Note: The apis.guru entry for javatpoint.com resolves to the FCM v1 API spec.
//
// Base URL: https://fcm.googleapis.com
// Auth: OAuth2 — requires service account token with scope https://www.googleapis.com/auth/firebase.messaging
// Docs: https://firebase.google.com/docs/reference/fcm/rest/v1/projects.messages
// Rate limits: 600,000 messages/min per project (varies by target type)

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface JavatpointFCMConfig {
  projectId: string;  // Firebase project ID
  accessToken: string; // OAuth2 Bearer token from service account
}

export class JavatpointMCPServer extends MCPAdapterBase {
  private readonly projectId: string;
  private readonly accessToken: string;
  private readonly baseUrl = 'https://fcm.googleapis.com';

  constructor(config: JavatpointFCMConfig) {
    super();
    this.projectId = config.projectId;
    this.accessToken = config.accessToken;
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'send_message',
        description: 'Send a Firebase Cloud Messaging (FCM) notification or data message to a device token, topic, or condition',
        inputSchema: {
          type: 'object',
          properties: {
            token: { type: 'string', description: 'Target device registration token (mutually exclusive with topic/condition)' },
            topic: { type: 'string', description: 'Target topic name (mutually exclusive with token/condition)' },
            condition: { type: 'string', description: 'Target condition expression, e.g. "topics in [topic1] && topics in [topic2]"' },
            title: { type: 'string', description: 'Notification title' },
            body: { type: 'string', description: 'Notification body text' },
            image: { type: 'string', description: 'URL of the notification image' },
            data: { type: 'object', description: 'Key-value data payload (string values only)' },
            android_priority: { type: 'string', description: 'Android message priority: NORMAL or HIGH' },
            apns_priority: { type: 'string', description: 'APNs priority: 5 (low) or 10 (high)' },
            ttl: { type: 'string', description: 'Time-to-live duration string, e.g. "3600s"' },
            validate_only: { type: 'boolean', description: 'If true, validate the message without sending it (default: false)' },
          },
        },
      },
      {
        name: 'send_batch_messages',
        description: 'Send multiple FCM messages in a single batch request (up to 500 messages)',
        inputSchema: {
          type: 'object',
          properties: {
            messages: {
              type: 'array',
              description: 'Array of message objects, each with token/topic/condition and optional notification/data',
              items: {
                type: 'object',
                properties: {
                  token: { type: 'string', description: 'Device token' },
                  topic: { type: 'string', description: 'Topic name' },
                  title: { type: 'string', description: 'Notification title' },
                  body: { type: 'string', description: 'Notification body' },
                  data: { type: 'object', description: 'Data payload' },
                },
              },
            },
            validate_only: { type: 'boolean', description: 'Validate without sending (default: false)' },
          },
          required: ['messages'],
        },
      },
      {
        name: 'send_to_topic',
        description: 'Send a notification to all devices subscribed to a specific FCM topic',
        inputSchema: {
          type: 'object',
          properties: {
            topic: { type: 'string', description: 'Topic name (without /topics/ prefix)' },
            title: { type: 'string', description: 'Notification title' },
            body: { type: 'string', description: 'Notification body' },
            data: { type: 'object', description: 'Key-value data payload' },
            image: { type: 'string', description: 'Notification image URL' },
          },
          required: ['topic'],
        },
      },
      {
        name: 'send_multicast',
        description: 'Send the same message to up to 500 device registration tokens at once',
        inputSchema: {
          type: 'object',
          properties: {
            tokens: { type: 'array', items: { type: 'string' }, description: 'List of device registration tokens (max 500)' },
            title: { type: 'string', description: 'Notification title' },
            body: { type: 'string', description: 'Notification body' },
            data: { type: 'object', description: 'Key-value data payload' },
            image: { type: 'string', description: 'Notification image URL' },
          },
          required: ['tokens'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'send_message': return await this.sendMessage(args);
        case 'send_batch_messages': return await this.sendBatchMessages(args);
        case 'send_to_topic': return await this.sendToTopic(args);
        case 'send_multicast': return await this.sendMulticast(args);
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

  private async fetchJSON(url: string, init?: RequestInit): Promise<ToolResult> {
    const response = await this.fetchWithRetry(url, { headers: this.headers, ...init });
    let data: unknown;
    try { data = await response.json(); } catch { data = { status: response.status, statusText: response.statusText }; }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: !response.ok };
  }

  private buildNotificationPayload(args: Record<string, unknown>): Record<string, unknown> {
    const msg: Record<string, unknown> = {};
    if (args.token) msg.token = args.token;
    if (args.topic) msg.topic = args.topic;
    if (args.condition) msg.condition = args.condition;
    if (args.data) msg.data = args.data;
    if (args.title || args.body || args.image) {
      msg.notification = {
        ...(args.title ? { title: args.title } : {}),
        ...(args.body ? { body: args.body } : {}),
        ...(args.image ? { image: args.image } : {}),
      };
    }
    if (args.android_priority || args.ttl) {
      msg.android = {
        ...(args.android_priority ? { priority: args.android_priority } : {}),
        ...(args.ttl ? { ttl: args.ttl } : {}),
      };
    }
    if (args.apns_priority) {
      msg.apns = { headers: { 'apns-priority': args.apns_priority } };
    }
    return msg;
  }

  private async sendMessage(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = { message: this.buildNotificationPayload(args) };
    if (args.validate_only) body.validate_only = true;
    return this.fetchJSON(`${this.baseUrl}/v1/projects/${encodeURIComponent(this.projectId)}/messages:send`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  private async sendBatchMessages(args: Record<string, unknown>): Promise<ToolResult> {
    const messages = (args.messages as Record<string, unknown>[]).map(m => ({
      message: this.buildNotificationPayload(m),
    }));
    // FCM batch uses multipart/mixed but we simplify to sending them sequentially
    const results = await Promise.all(
      messages.map(m => this.fetchJSON(`${this.baseUrl}/v1/projects/${encodeURIComponent(this.projectId)}/messages:send`, {
        method: 'POST',
        body: JSON.stringify({ message: m.message, ...(args.validate_only ? { validate_only: true } : {}) }),
      })),
    );
    return {
      content: [{ type: 'text', text: this.truncate({ results: results.map(r => JSON.parse(r.content[0].text)) }) }],
      isError: results.some(r => r.isError),
    };
  }

  private async sendToTopic(args: Record<string, unknown>): Promise<ToolResult> {
    return this.sendMessage({ ...args, topic: String(args.topic) });
  }

  private async sendMulticast(args: Record<string, unknown>): Promise<ToolResult> {
    const tokens = args.tokens as string[];
    const results = await Promise.all(
      tokens.map(token => this.sendMessage({ ...args, token })),
    );
    return {
      content: [{ type: 'text', text: this.truncate({ sent: tokens.length, results: results.map(r => JSON.parse(r.content[0].text)) }) }],
      isError: results.some(r => r.isError),
    };
  }

  static catalog() {
    return {
      name: 'javatpoint',
      displayName: 'Firebase Cloud Messaging (FCM)',
      version: '1.0.0',
      category: 'education' as const,
      keywords: ['firebase', 'fcm', 'push notifications', 'google', 'mobile', 'messaging', 'notifications', 'android', 'ios'],
      toolNames: ['send_message', 'send_batch_messages', 'send_to_topic', 'send_multicast'],
      description: 'Firebase Cloud Messaging: send push notifications and data messages to device tokens, topics, and conditions for iOS, Android, and web apps.',
      author: 'protectnil' as const,
    };
  }
}

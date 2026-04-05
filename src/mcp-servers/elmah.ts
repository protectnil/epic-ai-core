/**
 * elmah.io MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03. elmah.io has not published an official MCP server.
//
// Base URL: https://api.elmah.io
// Auth: API key passed as query parameter `api_key` on every request.
//   Example: GET https://api.elmah.io/v3/logs?api_key=YOUR_KEY
// Docs: https://docs.elmah.io/using-the-rest-api/
// Rate limits: 500 requests/minute, 3600 requests/hour.
// Note: elmah.io is a cloud-based error logging and uptime monitoring service.
//   Core concepts: logs (containers for messages), messages (individual errors/events),
//   deployments (version tracking), heartbeats (uptime checks), source maps (JS deobfuscation).

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface ElmahConfig {
  apiKey: string;
  baseUrl?: string;
}

export class ElmahMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: ElmahConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.elmah.io';
  }

  static catalog() {
    return {
      name: 'elmah',
      displayName: 'elmah.io',
      version: '1.0.0',
      category: 'observability' as const,
      keywords: [
        'elmah', 'elmah.io', 'error logging', 'observability', 'monitoring',
        'exception', 'log', 'message', 'deployment', 'heartbeat', 'uptime',
        'source map', 'javascript', 'cloud logging', 'alerting', 'diagnostics',
      ],
      toolNames: [
        'list_logs', 'get_log', 'create_log', 'disable_log', 'enable_log', 'diagnose_log',
        'list_messages', 'get_message', 'create_message', 'bulk_create_messages',
        'delete_message', 'delete_all_messages', 'fix_message', 'fix_all_messages', 'hide_message',
        'list_deployments', 'get_deployment', 'create_deployment', 'delete_deployment',
        'create_heartbeat',
        'create_or_update_source_map',
        'list_uptime_checks',
      ],
      description: 'Manage elmah.io error logging: logs, messages (errors/events), deployments, heartbeats, source maps, and uptime checks via the elmah.io v3 REST API.',
      author: 'protectnil',
    };
  }

  private async request(method: string, path: string, body?: unknown): Promise<ToolResult> {
    const sep = path.includes('?') ? '&' : '?';
    const url = `${this.baseUrl}${path}${sep}api_key=${encodeURIComponent(this.apiKey)}`;
    try {
      const resp = await this.fetchWithRetry(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
      const text = await resp.text();
      if (resp.status === 204) {
        return { content: [{ type: 'text', text: 'Success (no content)' }], isError: false };
      }
      let data: unknown;
      try { data = JSON.parse(text); } catch { data = text; }
      if (!resp.ok) {
        return { content: [{ type: 'text', text: `HTTP ${resp.status}: ${text}` }], isError: true };
      }
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
    } catch (err) {
      return { content: [{ type: 'text', text: String(err) }], isError: true };
    }
  }

  private qs(params: Record<string, string | number | boolean | undefined>): string {
    const parts = Object.entries(params)
      .filter(([, v]) => v !== undefined && v !== '')
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
    return parts.length ? '?' + parts.join('&') : '';
  }

  get tools(): ToolDefinition[] {
    return [
      // ── Logs ───────────────────────────────────────────────────────────────
      {
        name: 'list_logs',
        description: 'Fetch a list of all logs in the elmah.io account',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'get_log',
        description: 'Fetch a single elmah.io log by its ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'The ID of the log to fetch' },
          },
          required: ['id'],
        },
      },
      {
        name: 'create_log',
        description: 'Create a new log in elmah.io',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'The name of the new log' },
          },
          required: ['name'],
        },
      },
      {
        name: 'disable_log',
        description: 'Disable a log by its ID — stops it from receiving new messages',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'The ID of the log to disable' },
          },
          required: ['id'],
        },
      },
      {
        name: 'enable_log',
        description: 'Enable a previously disabled log by its ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'The ID of the log to enable' },
          },
          required: ['id'],
        },
      },
      {
        name: 'diagnose_log',
        description: 'Help diagnose logging problems for a log — returns diagnostic information',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'The ID of the log to diagnose' },
          },
          required: ['id'],
        },
      },
      // ── Messages ───────────────────────────────────────────────────────────
      {
        name: 'list_messages',
        description: 'Fetch messages (errors/events) from a log, with optional Lucene query and date range filters',
        inputSchema: {
          type: 'object',
          properties: {
            logId: { type: 'string', description: 'The ID of the log to fetch messages from' },
            pageIndex: { type: 'number', description: 'Page number for pagination (default: 0)' },
            pageSize: { type: 'number', description: 'Number of messages to return (max 100, default: 15)' },
            query: { type: 'string', description: 'Full-text or Lucene query to filter messages' },
            from: { type: 'string', description: 'Start date/time filter (ISO 8601, not included)' },
            to: { type: 'string', description: 'End date/time filter (ISO 8601, not included)' },
            includeHeaders: { type: 'boolean', description: 'Include server variables and cookies in results (slower)' },
          },
          required: ['logId'],
        },
      },
      {
        name: 'get_message',
        description: 'Fetch a single message by its ID from a log',
        inputSchema: {
          type: 'object',
          properties: {
            logId: { type: 'string', description: 'The ID of the log containing the message' },
            id: { type: 'string', description: 'The ID of the message to fetch' },
          },
          required: ['logId', 'id'],
        },
      },
      {
        name: 'create_message',
        description: 'Create a new error/event message in a log',
        inputSchema: {
          type: 'object',
          properties: {
            logId: { type: 'string', description: 'The ID of the log to post the message to' },
            title: { type: 'string', description: 'Short description of the error or event' },
            severity: { type: 'string', description: 'Severity level: Verbose, Debug, Information, Warning, Error, Fatal' },
            type: { type: 'string', description: 'Exception type (e.g. System.NullReferenceException)' },
            detail: { type: 'string', description: 'Full stack trace or detailed description' },
            application: { type: 'string', description: 'Application name or identifier' },
            source: { type: 'string', description: 'Source file or component name' },
            statusCode: { type: 'number', description: 'HTTP status code associated with the error' },
            url: { type: 'string', description: 'URL that caused the error' },
            method: { type: 'string', description: 'HTTP method (GET, POST, etc.)' },
            version: { type: 'string', description: 'Application version string' },
            user: { type: 'string', description: 'Username or user ID associated with the error' },
          },
          required: ['logId', 'title'],
        },
      },
      {
        name: 'bulk_create_messages',
        description: 'Create multiple error/event messages in a log in a single request',
        inputSchema: {
          type: 'object',
          properties: {
            logId: { type: 'string', description: 'The ID of the log' },
            messages: {
              type: 'array',
              description: 'Array of message objects to create',
              items: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  severity: { type: 'string' },
                  type: { type: 'string' },
                  detail: { type: 'string' },
                },
              },
            },
          },
          required: ['logId', 'messages'],
        },
      },
      {
        name: 'delete_message',
        description: 'Delete a single message by its ID from a log',
        inputSchema: {
          type: 'object',
          properties: {
            logId: { type: 'string', description: 'The ID of the log containing the message' },
            id: { type: 'string', description: 'The ID of the message to delete' },
          },
          required: ['logId', 'id'],
        },
      },
      {
        name: 'delete_all_messages',
        description: 'Delete all messages from a log matching an optional Lucene query',
        inputSchema: {
          type: 'object',
          properties: {
            logId: { type: 'string', description: 'The ID of the log to delete messages from' },
            query: { type: 'string', description: 'Optional Lucene query to filter which messages to delete' },
          },
          required: ['logId'],
        },
      },
      {
        name: 'fix_message',
        description: 'Mark a specific message as fixed by its ID',
        inputSchema: {
          type: 'object',
          properties: {
            logId: { type: 'string', description: 'The ID of the log containing the message' },
            id: { type: 'string', description: 'The ID of the message to fix' },
            markAllAsFixed: { type: 'boolean', description: 'If true, mark all instances of this message as fixed' },
          },
          required: ['logId', 'id'],
        },
      },
      {
        name: 'fix_all_messages',
        description: 'Mark all messages matching a query in a log as fixed',
        inputSchema: {
          type: 'object',
          properties: {
            logId: { type: 'string', description: 'The ID of the log' },
            query: { type: 'string', description: 'Lucene query to filter which messages to fix' },
          },
          required: ['logId'],
        },
      },
      {
        name: 'hide_message',
        description: 'Hide a message by its ID so it no longer appears in the UI',
        inputSchema: {
          type: 'object',
          properties: {
            logId: { type: 'string', description: 'The ID of the log containing the message' },
            id: { type: 'string', description: 'The ID of the message to hide' },
          },
          required: ['logId', 'id'],
        },
      },
      // ── Deployments ────────────────────────────────────────────────────────
      {
        name: 'list_deployments',
        description: 'Fetch a list of all deployments tracked in elmah.io',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'get_deployment',
        description: 'Fetch a deployment by its ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'The ID of the deployment to fetch' },
          },
          required: ['id'],
        },
      },
      {
        name: 'create_deployment',
        description: 'Create a new deployment record to track a software release in elmah.io',
        inputSchema: {
          type: 'object',
          properties: {
            version: { type: 'string', description: 'The version string of the deployment (e.g. 1.2.3)' },
            description: { type: 'string', description: 'Description or changelog for this deployment' },
            userName: { type: 'string', description: 'The name of the person who deployed' },
            userEmail: { type: 'string', description: 'The email of the person who deployed' },
            created: { type: 'string', description: 'Deployment timestamp in ISO 8601 format (default: now)' },
            logId: { type: 'string', description: 'Associate the deployment with a specific log ID (optional)' },
          },
          required: ['version'],
        },
      },
      {
        name: 'delete_deployment',
        description: 'Delete a deployment record by its ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'The ID of the deployment to delete' },
          },
          required: ['id'],
        },
      },
      // ── Heartbeats ─────────────────────────────────────────────────────────
      {
        name: 'create_heartbeat',
        description: 'Send a heartbeat ping for an uptime check — call this on a schedule to confirm your app is running',
        inputSchema: {
          type: 'object',
          properties: {
            logId: { type: 'string', description: 'The ID of the log containing the heartbeat check' },
            id: { type: 'string', description: 'The ID of the heartbeat check to ping' },
            result: { type: 'string', description: 'Result of the heartbeat: Healthy, Degraded, or Unhealthy' },
            reason: { type: 'string', description: 'Optional reason for Degraded or Unhealthy status' },
            took: { type: 'number', description: 'Milliseconds the health check took to run' },
            application: { type: 'string', description: 'Application name sending the heartbeat' },
            version: { type: 'string', description: 'Application version' },
          },
          required: ['logId', 'id'],
        },
      },
      // ── Source Maps ────────────────────────────────────────────────────────
      {
        name: 'create_or_update_source_map',
        description: 'Create or update a source map translation for minified JavaScript in a log',
        inputSchema: {
          type: 'object',
          properties: {
            logId: { type: 'string', description: 'The ID of the log to upload the source map for' },
            path: { type: 'string', description: 'The minified JavaScript file path this source map applies to' },
            sourceMap: { type: 'string', description: 'The source map content or URL' },
            minifiedJavaScript: { type: 'string', description: 'The minified JavaScript content or URL' },
          },
          required: ['logId'],
        },
      },
      // ── Uptime Checks ──────────────────────────────────────────────────────
      {
        name: 'list_uptime_checks',
        description: 'Fetch a list of uptime checks configured in elmah.io (currently in closed beta)',
        inputSchema: { type: 'object', properties: {} },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    const a = args as Record<string, string & boolean & number & unknown[]>;
    switch (name) {
      case 'list_logs':
        return this.request('GET', '/v3/logs');
      case 'get_log':
        return this.request('GET', `/v3/logs/${a.id}`);
      case 'create_log':
        return this.request('POST', '/v3/logs', { name: a.name });
      case 'disable_log':
        return this.request('POST', `/v3/logs/${a.id}/_disable`);
      case 'enable_log':
        return this.request('POST', `/v3/logs/${a.id}/_enable`);
      case 'diagnose_log':
        return this.request('GET', `/v3/logs/${a.id}/_diagnose`);
      case 'list_messages': {
        const qs = this.qs({ pageIndex: a.pageIndex, pageSize: a.pageSize, query: a.query, from: a.from, to: a.to, includeHeaders: a.includeHeaders });
        return this.request('GET', `/v3/messages/${a.logId}${qs}`);
      }
      case 'get_message':
        return this.request('GET', `/v3/messages/${a.logId}/${a.id}`);
      case 'create_message': {
        const body: Record<string, unknown> = { title: a.title };
        if (a.severity) body.severity = a.severity;
        if (a.type) body.type = a.type;
        if (a.detail) body.detail = a.detail;
        if (a.application) body.application = a.application;
        if (a.source) body.source = a.source;
        if (a.statusCode) body.statusCode = a.statusCode;
        if (a.url) body.url = a.url;
        if (a.method) body.method = a.method;
        if (a.version) body.version = a.version;
        if (a.user) body.user = a.user;
        return this.request('POST', `/v3/messages/${a.logId}`, body);
      }
      case 'bulk_create_messages':
        return this.request('POST', `/v3/messages/${a.logId}/_bulk`, a.messages);
      case 'delete_message':
        return this.request('DELETE', `/v3/messages/${a.logId}/${a.id}`);
      case 'delete_all_messages': {
        const qs = a.query ? this.qs({ query: a.query }) : '';
        return this.request('DELETE', `/v3/messages/${a.logId}${qs}`);
      }
      case 'fix_message': {
        const qs = a.markAllAsFixed !== undefined ? this.qs({ markAllAsFixed: a.markAllAsFixed }) : '';
        return this.request('POST', `/v3/messages/${a.logId}/${a.id}/_fix${qs}`);
      }
      case 'fix_all_messages': {
        const qs = a.query ? this.qs({ query: a.query }) : '';
        return this.request('POST', `/v3/messages/${a.logId}/_fix${qs}`);
      }
      case 'hide_message':
        return this.request('POST', `/v3/messages/${a.logId}/${a.id}/_hide`);
      case 'list_deployments':
        return this.request('GET', '/v3/deployments');
      case 'get_deployment':
        return this.request('GET', `/v3/deployments/${a.id}`);
      case 'create_deployment': {
        const body: Record<string, unknown> = { version: a.version };
        if (a.description) body.description = a.description;
        if (a.userName) body.userName = a.userName;
        if (a.userEmail) body.userEmail = a.userEmail;
        if (a.created) body.created = a.created;
        if (a.logId) body.logId = a.logId;
        return this.request('POST', '/v3/deployments', body);
      }
      case 'delete_deployment':
        return this.request('DELETE', `/v3/deployments/${a.id}`);
      case 'create_heartbeat': {
        const body: Record<string, unknown> = {};
        if (a.result) body.result = a.result;
        if (a.reason) body.reason = a.reason;
        if (a.took) body.took = a.took;
        if (a.application) body.application = a.application;
        if (a.version) body.version = a.version;
        return this.request('POST', `/v3/heartbeats/${a.logId}/${a.id}`, body);
      }
      case 'create_or_update_source_map': {
        const body: Record<string, unknown> = {};
        if (a.path) body.path = a.path;
        if (a.sourceMap) body.sourceMap = a.sourceMap;
        if (a.minifiedJavaScript) body.minifiedJavaScript = a.minifiedJavaScript;
        return this.request('POST', `/v3/sourcemaps/${a.logId}`, body);
      }
      case 'list_uptime_checks':
        return this.request('GET', '/v3/uptimechecks');
      default:
        return { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true };
    }
  }
}

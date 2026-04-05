/**
 * Mimecast MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28 — no official Mimecast MCP server for the Email
//   Security platform exists on GitHub or in vendor documentation.
//   NOTE: Mimecast does publish an "Incydr MCP server" (mimecastsupport.zendesk.com/hc/en-us/articles/46837183313299)
//   but this is for Mimecast Incydr (insider threat / DLP product), NOT the Email Security gateway.
//   It is not relevant to this adapter.
// Our adapter covers: 22 tools. Vendor MCP covers: 0 tools (N/A).
// Recommendation: use-rest-api — no relevant MCP server exists for Mimecast Email Security.
//
// Base URL: https://api.mimecast.com (global)
//   Regional: https://us-api.mimecast.com (US), https://uk-api.mimecast.com (UK)
//   API 2.0 base: https://api.services.mimecast.com (global)
// Auth: This adapter targets API 1.0 endpoint paths using OAuth2 client_credentials flow
//   (Mimecast API 2.0 auth). The canonical API 1.0 auth is HMAC-SHA1 (access key + secret key).
//   If deploying against pure API 1.0, switch to HMAC-SHA1 per:
//   https://integrations.mimecast.com/documentation/api-overview/authorization/
//   Token endpoint (API 2.0 OAuth2): https://api.services.mimecast.com/oauth/token
// Docs: https://integrations.mimecast.com/documentation/endpoint-reference/
//   API 2.0: https://developer.services.mimecast.com/
// Rate limits: Not publicly documented; recommend 10 req/sec or less per token
// Note: All API 1.0 endpoints use POST with JSON request body. GET is not used.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface MimecastConfig {
  clientId: string;
  clientSecret: string;
  baseUrl?: string;
}

export class MimecastMCPServer extends MCPAdapterBase {
  private readonly baseUrl: string;
  private readonly clientId: string;
  private readonly clientSecret: string;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(config: MimecastConfig) {
    super();
    this.baseUrl = (config.baseUrl || 'https://api.mimecast.com').replace(/\/$/, '');
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
  }

  static catalog() {
    return {
      name: 'mimecast',
      displayName: 'Mimecast',
      version: '1.0.0',
      category: 'cybersecurity' as const,
      keywords: [
        'mimecast', 'email', 'security', 'email-security', 'spam', 'phishing',
        'malware', 'dlp', 'archive', 'ttp', 'url-protect', 'attachment-protect',
        'impersonation', 'threat', 'held-messages', 'blocklist', 'policy',
        'audit', 'siem', 'rejection', 'message-finder', 'tracking',
      ],
      toolNames: [
        'search_messages', 'get_message_info',
        'get_held_messages', 'release_held_message', 'reject_held_message',
        'get_archive_message_list',
        'get_dlp_logs', 'get_audit_events', 'get_rejection_logs',
        'get_message_release_logs', 'get_siem_logs',
        'get_ttp_url_logs', 'get_ttp_attachment_logs', 'get_ttp_impersonation_logs',
        'get_managed_urls', 'create_managed_url', 'delete_managed_url',
        'list_blocked_senders', 'create_blocked_sender', 'delete_blocked_sender',
        'find_groups', 'get_group_members',
      ],
      description: 'Manage Mimecast email security: search and track messages, manage held messages, retrieve DLP/audit/TTP logs, manage blocked senders and URL policies, query the archive, and manage directory groups.',
      author: 'protectnil',
    };
  }

  private async ensureToken(): Promise<string> {
    const now = Date.now();
    if (this.accessToken && this.tokenExpiry > now) {
      return this.accessToken;
    }

    const response = await this.fetchWithRetry(`${this.baseUrl}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: this.clientId,
        client_secret: this.clientSecret,
      }).toString(),
    });

    if (!response.ok) {
      throw new Error(`Mimecast auth failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as { access_token: string; expires_in: number };
    this.accessToken = data.access_token;
    this.tokenExpiry = now + (data.expires_in - 60) * 1000;
    return this.accessToken;
  }

  private async request(endpoint: string, body: unknown): Promise<unknown> {
    const token = await this.ensureToken();
    const response = await this.fetchWithRetry(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`Mimecast API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'search_messages',
        description: 'Search and track messages in Mimecast by sender, recipient, subject, or content. Returns message tracking data with delivery status.',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query matching sender, recipient, subject, or body content',
            },
            from_date: {
              type: 'string',
              description: 'Start date in ISO 8601 format (e.g. 2026-03-01T00:00:00+0000)',
            },
            to_date: {
              type: 'string',
              description: 'End date in ISO 8601 format (e.g. 2026-03-31T23:59:59+0000)',
            },
            sender: {
              type: 'string',
              description: 'Filter by sender email address',
            },
            recipient: {
              type: 'string',
              description: 'Filter by recipient email address',
            },
            limit: {
              type: 'number',
              description: 'Maximum results to return (default: 100)',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'get_message_info',
        description: 'Get detailed information about a specific email message in Mimecast by its ID, including delivery status and headers.',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Mimecast message ID',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'get_held_messages',
        description: 'Retrieve messages currently held for review in Mimecast (DLP, malware, sandbox, or policy holds).',
        inputSchema: {
          type: 'object',
          properties: {
            hold_reason: {
              type: 'string',
              description: 'Filter by reason: dlp, malware, archive, awaiting-sandbox-verdict (omit for all)',
            },
            limit: {
              type: 'number',
              description: 'Maximum results (default: 100)',
            },
          },
        },
      },
      {
        name: 'release_held_message',
        description: 'Release a held message in Mimecast, allowing it to be delivered to the recipient.',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Held message ID to release',
            },
            message: {
              type: 'string',
              description: 'Optional comment/reason for releasing',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'reject_held_message',
        description: 'Reject and permanently discard a held message in Mimecast.',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Held message ID to reject',
            },
            message: {
              type: 'string',
              description: 'Optional reason for rejection',
            },
            notify: {
              type: 'boolean',
              description: 'Notify the sender that the message was rejected (default: false)',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'get_archive_message_list',
        description: 'Retrieve a list of archived messages from the Mimecast email archive with optional date and content filters.',
        inputSchema: {
          type: 'object',
          properties: {
            from: {
              type: 'string',
              description: 'Filter by sender email address',
            },
            to: {
              type: 'string',
              description: 'Filter by recipient email address',
            },
            subject: {
              type: 'string',
              description: 'Filter by subject text',
            },
            start: {
              type: 'string',
              description: 'Start date in ISO 8601 format',
            },
            end: {
              type: 'string',
              description: 'End date in ISO 8601 format',
            },
            limit: {
              type: 'number',
              description: 'Maximum results to return (default: 100)',
            },
          },
        },
      },
      {
        name: 'get_dlp_logs',
        description: 'Retrieve Data Loss Prevention (DLP) event logs from Mimecast. Requires Monitoring | Data Leak Prevention | Read permission.',
        inputSchema: {
          type: 'object',
          properties: {
            from: {
              type: 'string',
              description: 'Start datetime in ISO 8601 format (e.g. 2026-03-01T00:00:00+0000)',
            },
            to: {
              type: 'string',
              description: 'End datetime in ISO 8601 format',
            },
            limit: {
              type: 'number',
              description: 'Maximum results (default: 100)',
            },
          },
        },
      },
      {
        name: 'get_audit_events',
        description: 'Retrieve admin audit events from Mimecast (policy changes, user actions, configuration). Requires Account | Logs | Read permission.',
        inputSchema: {
          type: 'object',
          properties: {
            from: {
              type: 'string',
              description: 'Start datetime in ISO 8601 format',
            },
            to: {
              type: 'string',
              description: 'End datetime in ISO 8601 format',
            },
            query: {
              type: 'string',
              description: 'Text search within audit event descriptions',
            },
            limit: {
              type: 'number',
              description: 'Maximum results (default: 100)',
            },
          },
        },
      },
      {
        name: 'get_rejection_logs',
        description: 'Retrieve email rejection logs from Mimecast showing messages blocked at the gateway.',
        inputSchema: {
          type: 'object',
          properties: {
            from: {
              type: 'string',
              description: 'Start datetime in ISO 8601 format',
            },
            to: {
              type: 'string',
              description: 'End datetime in ISO 8601 format',
            },
            sender: {
              type: 'string',
              description: 'Filter by sender email or domain',
            },
            limit: {
              type: 'number',
              description: 'Maximum results (default: 100)',
            },
          },
        },
      },
      {
        name: 'get_message_release_logs',
        description: 'Retrieve message release logs showing which held messages were released and by whom.',
        inputSchema: {
          type: 'object',
          properties: {
            from: {
              type: 'string',
              description: 'Start datetime in ISO 8601 format',
            },
            to: {
              type: 'string',
              description: 'End datetime in ISO 8601 format',
            },
            limit: {
              type: 'number',
              description: 'Maximum results (default: 100)',
            },
          },
        },
      },
      {
        name: 'get_siem_logs',
        description: 'Retrieve SIEM-formatted logs from Mimecast for integration with SIEM platforms. Returns JSON-encoded log data.',
        inputSchema: {
          type: 'object',
          properties: {
            token: {
              type: 'string',
              description: 'Pagination token from a previous response (omit for first call)',
            },
          },
        },
      },
      {
        name: 'get_ttp_url_logs',
        description: 'Retrieve Targeted Threat Protection (TTP) URL Protect click logs showing rewritten URL access attempts.',
        inputSchema: {
          type: 'object',
          properties: {
            from: {
              type: 'string',
              description: 'Start datetime in ISO 8601 format',
            },
            to: {
              type: 'string',
              description: 'End datetime in ISO 8601 format',
            },
            url_category: {
              type: 'string',
              description: 'Filter by URL category (e.g. malicious, suspicious)',
            },
            limit: {
              type: 'number',
              description: 'Maximum results (default: 100)',
            },
          },
        },
      },
      {
        name: 'get_ttp_attachment_logs',
        description: 'Retrieve TTP Attachment Protection logs showing sandboxed attachment verdicts.',
        inputSchema: {
          type: 'object',
          properties: {
            from: {
              type: 'string',
              description: 'Start datetime in ISO 8601 format',
            },
            to: {
              type: 'string',
              description: 'End datetime in ISO 8601 format',
            },
            result: {
              type: 'string',
              description: 'Filter by verdict: clean, malicious, unknown, processing',
            },
            limit: {
              type: 'number',
              description: 'Maximum results (default: 100)',
            },
          },
        },
      },
      {
        name: 'get_ttp_impersonation_logs',
        description: 'Retrieve TTP Impersonation Protect logs showing emails flagged for executive impersonation or domain spoofing.',
        inputSchema: {
          type: 'object',
          properties: {
            from: {
              type: 'string',
              description: 'Start datetime in ISO 8601 format',
            },
            to: {
              type: 'string',
              description: 'End datetime in ISO 8601 format',
            },
            action: {
              type: 'string',
              description: 'Filter by action taken: hold, bounce, delete, none',
            },
            limit: {
              type: 'number',
              description: 'Maximum results (default: 100)',
            },
          },
        },
      },
      {
        name: 'get_managed_urls',
        description: 'List managed URLs in TTP URL Protect (allowed/blocked URLs). Supports filtering by URL and action.',
        inputSchema: {
          type: 'object',
          properties: {
            url: {
              type: 'string',
              description: 'Filter by URL value (partial match supported)',
            },
            action: {
              type: 'string',
              description: 'Filter by action: block or permit',
            },
          },
        },
      },
      {
        name: 'create_managed_url',
        description: 'Create a new managed URL in Mimecast TTP URL Protect to block or permit a specific URL.',
        inputSchema: {
          type: 'object',
          properties: {
            url: {
              type: 'string',
              description: 'URL to manage (e.g. https://malicious.example.com)',
            },
            action: {
              type: 'string',
              description: 'Action to apply: block or permit',
            },
            matchType: {
              type: 'string',
              description: 'Match type: explicit (exact match) or domain (entire domain)',
            },
            comment: {
              type: 'string',
              description: 'Comment describing why this URL is managed',
            },
            disableRewrite: {
              type: 'boolean',
              description: 'Disable URL rewriting for permitted URLs (default: false)',
            },
          },
          required: ['url', 'action'],
        },
      },
      {
        name: 'delete_managed_url',
        description: 'Delete a managed URL from Mimecast TTP URL Protect by its ID.',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Managed URL ID to delete',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'list_blocked_senders',
        description: 'List blocked sender policies in Mimecast — email addresses and domains blocked at the gateway.',
        inputSchema: {
          type: 'object',
          properties: {
            policy_type: {
              type: 'string',
              description: 'Filter by policy type: internal or external (omit for all)',
            },
            limit: {
              type: 'number',
              description: 'Maximum results (default: 100)',
            },
          },
        },
      },
      {
        name: 'create_blocked_sender',
        description: 'Add an email address or domain to the Mimecast blocked senders list.',
        inputSchema: {
          type: 'object',
          properties: {
            sender: {
              type: 'string',
              description: 'Sender email address or domain to block (e.g. spammer@evil.com or @evil.com)',
            },
            to: {
              type: 'string',
              description: 'Target recipient scope (e.g. specific user email or leave blank for all users)',
            },
            comment: {
              type: 'string',
              description: 'Comment describing why this sender is blocked',
            },
          },
          required: ['sender'],
        },
      },
      {
        name: 'delete_blocked_sender',
        description: 'Remove an entry from the Mimecast blocked senders list by policy ID.',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Blocked sender policy ID to delete',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'find_groups',
        description: 'Search for directory groups in Mimecast by name. Returns group IDs used for policy targeting.',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search term to match against group names',
            },
            limit: {
              type: 'number',
              description: 'Maximum results (default: 100)',
            },
          },
        },
      },
      {
        name: 'get_group_members',
        description: 'Retrieve members of a Mimecast directory group by group ID.',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Group ID from find_groups',
            },
            limit: {
              type: 'number',
              description: 'Maximum members to return (default: 100)',
            },
          },
          required: ['id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'search_messages':
          return await this.searchMessages(args);
        case 'get_message_info':
          return await this.getMessageInfo(args);
        case 'get_held_messages':
          return await this.getHeldMessages(args);
        case 'release_held_message':
          return await this.releaseHeldMessage(args);
        case 'reject_held_message':
          return await this.rejectHeldMessage(args);
        case 'get_archive_message_list':
          return await this.getArchiveMessageList(args);
        case 'get_dlp_logs':
          return await this.getDlpLogs(args);
        case 'get_audit_events':
          return await this.getAuditEvents(args);
        case 'get_rejection_logs':
          return await this.getRejectionLogs(args);
        case 'get_message_release_logs':
          return await this.getMessageReleaseLogs(args);
        case 'get_siem_logs':
          return await this.getSiemLogs(args);
        case 'get_ttp_url_logs':
          return await this.getTtpUrlLogs(args);
        case 'get_ttp_attachment_logs':
          return await this.getTtpAttachmentLogs(args);
        case 'get_ttp_impersonation_logs':
          return await this.getTtpImpersonationLogs(args);
        case 'get_managed_urls':
          return await this.getManagedUrls(args);
        case 'create_managed_url':
          return await this.createManagedUrl(args);
        case 'delete_managed_url':
          return await this.deleteManagedUrl(args);
        case 'list_blocked_senders':
          return await this.listBlockedSenders(args);
        case 'create_blocked_sender':
          return await this.createBlockedSender(args);
        case 'delete_blocked_sender':
          return await this.deleteBlockedSender(args);
        case 'find_groups':
          return await this.findGroups(args);
        case 'get_group_members':
          return await this.getGroupMembers(args);
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

  private result(data: unknown): ToolResult {
    const text = JSON.stringify(data, null, 2);
    return { content: [{ type: 'text', text: this.truncate(text) }], isError: false };
  }

  private async searchMessages(args: Record<string, unknown>): Promise<ToolResult> {
    const payload: Record<string, unknown> = {
      query: args.query,
      pageSize: args.limit || 100,
    };
    if (args.from_date) payload.from = args.from_date;
    if (args.to_date) payload.to = args.to_date;
    if (args.sender) payload.from_address = args.sender;
    if (args.recipient) payload.to_address = args.recipient;
    const data = await this.request('/api/message-finder/search', payload);
    return this.result(data);
  }

  private async getMessageInfo(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.id as string;
    if (!id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    const data = await this.request('/api/message-finder/get-message-info', { id });
    return this.result(data);
  }

  private async getHeldMessages(args: Record<string, unknown>): Promise<ToolResult> {
    const payload: Record<string, unknown> = { pageSize: args.limit || 100 };
    if (args.hold_reason) payload.reason = args.hold_reason;
    const data = await this.request('/api/gateway/get-hold-message-list', payload);
    return this.result(data);
  }

  private async releaseHeldMessage(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.id as string;
    if (!id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    const payload: Record<string, unknown> = { id };
    if (args.message) payload.message = args.message;
    const data = await this.request('/api/gateway/hold-release', payload);
    return this.result(data);
  }

  private async rejectHeldMessage(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.id as string;
    if (!id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    const payload: Record<string, unknown> = { id, notify: args.notify ?? false };
    if (args.message) payload.message = args.message;
    const data = await this.request('/api/gateway/hold-reject', payload);
    return this.result(data);
  }

  private async getArchiveMessageList(args: Record<string, unknown>): Promise<ToolResult> {
    const payload: Record<string, unknown> = { pageSize: args.limit || 100 };
    if (args.from) payload.from = args.from;
    if (args.to) payload.to = args.to;
    if (args.subject) payload.subject = args.subject;
    if (args.start) payload.start = args.start;
    if (args.end) payload.end = args.end;
    const data = await this.request('/api/archive/get-message-list', payload);
    return this.result(data);
  }

  private async getDlpLogs(args: Record<string, unknown>): Promise<ToolResult> {
    const payload: Record<string, unknown> = { pageSize: args.limit || 100 };
    if (args.from) payload.from = args.from;
    if (args.to) payload.to = args.to;
    const data = await this.request('/api/dlp/get-logs', payload);
    return this.result(data);
  }

  private async getAuditEvents(args: Record<string, unknown>): Promise<ToolResult> {
    const payload: Record<string, unknown> = { pageSize: args.limit || 100 };
    if (args.from) payload.from = args.from;
    if (args.to) payload.to = args.to;
    if (args.query) payload.query = args.query;
    const data = await this.request('/api/audit/get-audit-events', payload);
    return this.result(data);
  }

  private async getRejectionLogs(args: Record<string, unknown>): Promise<ToolResult> {
    const payload: Record<string, unknown> = { pageSize: args.limit || 100 };
    if (args.from) payload.from = args.from;
    if (args.to) payload.to = args.to;
    if (args.sender) payload.sender = args.sender;
    const data = await this.request('/api/gateway/get-rejections', payload);
    return this.result(data);
  }

  private async getMessageReleaseLogs(args: Record<string, unknown>): Promise<ToolResult> {
    const payload: Record<string, unknown> = { pageSize: args.limit || 100 };
    if (args.from) payload.from = args.from;
    if (args.to) payload.to = args.to;
    const data = await this.request('/api/gateway/get-held-release-logs', payload);
    return this.result(data);
  }

  private async getSiemLogs(args: Record<string, unknown>): Promise<ToolResult> {
    const payload: Record<string, unknown> = {};
    if (args.token) payload.token = args.token;
    const data = await this.request('/api/audit/get-siem-logs', payload);
    return this.result(data);
  }

  private async getTtpUrlLogs(args: Record<string, unknown>): Promise<ToolResult> {
    const payload: Record<string, unknown> = { pageSize: args.limit || 100 };
    if (args.from) payload.from = args.from;
    if (args.to) payload.to = args.to;
    if (args.url_category) payload.urlCategory = args.url_category;
    const data = await this.request('/api/ttp/url/get-logs', payload);
    return this.result(data);
  }

  private async getTtpAttachmentLogs(args: Record<string, unknown>): Promise<ToolResult> {
    const payload: Record<string, unknown> = { pageSize: args.limit || 100 };
    if (args.from) payload.from = args.from;
    if (args.to) payload.to = args.to;
    if (args.result) payload.result = args.result;
    const data = await this.request('/api/ttp/attachment/get-logs', payload);
    return this.result(data);
  }

  private async getTtpImpersonationLogs(args: Record<string, unknown>): Promise<ToolResult> {
    const payload: Record<string, unknown> = { pageSize: args.limit || 100 };
    if (args.from) payload.from = args.from;
    if (args.to) payload.to = args.to;
    if (args.action) payload.action = args.action;
    const data = await this.request('/api/ttp/impersonation/get-logs', payload);
    return this.result(data);
  }

  private async getManagedUrls(args: Record<string, unknown>): Promise<ToolResult> {
    const payload: Record<string, unknown> = {};
    if (args.url) payload.url = args.url;
    if (args.action) payload.action = args.action;
    const data = await this.request('/api/ttp/url/get-all-managed-urls', payload);
    return this.result(data);
  }

  private async createManagedUrl(args: Record<string, unknown>): Promise<ToolResult> {
    const url = args.url as string;
    const action = args.action as string;
    if (!url || !action) return { content: [{ type: 'text', text: 'url and action are required' }], isError: true };
    const payload: Record<string, unknown> = {
      url,
      action,
      matchType: (args.matchType as string) || 'explicit',
      disableRewrite: args.disableRewrite ?? false,
    };
    if (args.comment) payload.comment = args.comment;
    const data = await this.request('/api/ttp/url/create-managed-url', payload);
    return this.result(data);
  }

  private async deleteManagedUrl(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.id as string;
    if (!id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    const data = await this.request('/api/ttp/url/delete-managed-url', { id });
    return this.result(data);
  }

  private async listBlockedSenders(args: Record<string, unknown>): Promise<ToolResult> {
    const payload: Record<string, unknown> = { pageSize: args.limit || 100 };
    if (args.policy_type) payload.policyType = args.policy_type;
    const data = await this.request('/api/policy/blockedsenders/get-policy', payload);
    return this.result(data);
  }

  private async createBlockedSender(args: Record<string, unknown>): Promise<ToolResult> {
    const sender = args.sender as string;
    if (!sender) return { content: [{ type: 'text', text: 'sender is required' }], isError: true };
    const payload: Record<string, unknown> = {
      policy: {
        description: (args.comment as string) || `Blocked sender: ${sender}`,
        fromPart: 'envelope_from',
        from: { type: 'email_domain', emailDomain: sender },
        to: { type: args.to ? 'email_address' : 'everyone', emailAddress: args.to || '' },
        action: 'block',
      },
    };
    const data = await this.request('/api/policy/blockedsenders/create-policy', payload);
    return this.result(data);
  }

  private async deleteBlockedSender(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.id as string;
    if (!id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    const data = await this.request('/api/policy/blockedsenders/delete-policy', { id });
    return this.result(data);
  }

  private async findGroups(args: Record<string, unknown>): Promise<ToolResult> {
    const payload: Record<string, unknown> = { pageSize: args.limit || 100 };
    if (args.query) payload.query = args.query;
    const data = await this.request('/api/directory/find-groups', payload);
    return this.result(data);
  }

  private async getGroupMembers(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.id as string;
    if (!id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    const data = await this.request('/api/directory/get-group-members', {
      id,
      pageSize: args.limit || 100,
    });
    return this.result(data);
  }
}

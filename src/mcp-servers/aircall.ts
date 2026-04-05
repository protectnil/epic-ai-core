/**
 * Aircall MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// No official Aircall MCP server was found on GitHub. A community-built read-only
// server exists at https://github.com/itaygadot111/aircall-mcp-server (stdio, limited
// to calls/transcripts only — not actively maintained). We build a full REST wrapper
// for complete API coverage.
//
// Base URL: https://api.aircall.io/v1
// Auth: HTTP Basic Auth — base64(API_ID:API_TOKEN) in Authorization header
// Docs: https://developer.aircall.io/api-references/
// Rate limits: 60 requests/min per company (120/min for Advanced Messaging accounts)

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface AircallConfig {
  apiId: string;
  apiToken: string;
  baseUrl?: string;
}

export class AircallMCPServer extends MCPAdapterBase {
  private readonly apiId: string;
  private readonly apiToken: string;
  private readonly baseUrl: string;

  constructor(config: AircallConfig) {
    super();
    this.apiId = config.apiId;
    this.apiToken = config.apiToken;
    this.baseUrl = config.baseUrl || 'https://api.aircall.io/v1';
  }

  static catalog() {
    return {
      name: 'aircall',
      displayName: 'Aircall',
      version: '1.0.0',
      category: 'communication',
      keywords: [
        'aircall', 'phone', 'call', 'voip', 'cloud phone', 'sales calls',
        'support calls', 'call center', 'transcript', 'recording', 'ivr',
        'contact', 'user', 'team', 'number', 'webhook', 'tag',
      ],
      toolNames: [
        'list_calls', 'get_call', 'search_calls', 'add_call_tags', 'transfer_call',
        'list_users', 'get_user', 'create_user', 'update_user', 'delete_user',
        'list_numbers', 'get_number', 'update_number',
        'list_teams', 'get_team', 'create_team', 'delete_team', 'add_user_to_team', 'remove_user_from_team',
        'list_contacts', 'get_contact', 'create_contact', 'update_contact', 'delete_contact',
        'list_webhooks', 'create_webhook', 'update_webhook', 'delete_webhook',
        'list_tags', 'create_tag',
      ],
      description: 'Aircall cloud phone system: manage calls, recordings, transcripts, users, numbers, teams, contacts, webhooks, and tags.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      // ── Calls ──────────────────────────────────────────────────────────────
      {
        name: 'list_calls',
        description: 'List call logs with optional filters for direction, user, number, date range, and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            direction: {
              type: 'string',
              description: 'Filter by call direction: inbound or outbound',
            },
            user_id: {
              type: 'number',
              description: 'Filter calls by the Aircall user ID who handled the call',
            },
            number_id: {
              type: 'number',
              description: 'Filter calls by the Aircall phone number ID',
            },
            from: {
              type: 'number',
              description: 'Unix timestamp — return calls started after this time',
            },
            to: {
              type: 'number',
              description: 'Unix timestamp — return calls started before this time',
            },
            order: {
              type: 'string',
              description: 'Sort order: asc or desc by started_at (default: desc)',
            },
            per_page: {
              type: 'number',
              description: 'Results per page (max: 50, default: 20)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
          },
        },
      },
      {
        name: 'get_call',
        description: 'Get full details for a single call by ID, including recording URL, transcript, tags, and participants',
        inputSchema: {
          type: 'object',
          properties: {
            call_id: {
              type: 'number',
              description: 'Aircall call ID to retrieve',
            },
          },
          required: ['call_id'],
        },
      },
      {
        name: 'search_calls',
        description: 'Search call logs by phone number, contact name, or tag with optional date range filters',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search term: phone number (e.g. +14155552671), contact name, or tag name',
            },
            from: {
              type: 'number',
              description: 'Unix timestamp — search calls after this time',
            },
            to: {
              type: 'number',
              description: 'Unix timestamp — search calls before this time',
            },
            per_page: {
              type: 'number',
              description: 'Results per page (max: 50, default: 20)',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'add_call_tags',
        description: 'Add one or more tags to a completed call by call ID',
        inputSchema: {
          type: 'object',
          properties: {
            call_id: {
              type: 'number',
              description: 'Aircall call ID to tag',
            },
            tag_ids: {
              type: 'array',
              description: 'Array of tag IDs to apply to the call',
              items: { type: 'number' },
            },
          },
          required: ['call_id', 'tag_ids'],
        },
      },
      {
        name: 'transfer_call',
        description: 'Transfer an active call to another user or number by call ID',
        inputSchema: {
          type: 'object',
          properties: {
            call_id: {
              type: 'number',
              description: 'Aircall call ID of the active call to transfer',
            },
            user_id: {
              type: 'number',
              description: 'Destination user ID to transfer the call to',
            },
          },
          required: ['call_id', 'user_id'],
        },
      },
      // ── Users ──────────────────────────────────────────────────────────────
      {
        name: 'list_users',
        description: 'List all users in the Aircall account with their roles, availability, and assigned numbers',
        inputSchema: {
          type: 'object',
          properties: {
            per_page: {
              type: 'number',
              description: 'Results per page (max: 50, default: 20)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
          },
        },
      },
      {
        name: 'get_user',
        description: 'Get details for a single Aircall user by user ID, including role, availability, and phone numbers',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: {
              type: 'number',
              description: 'Aircall user ID to retrieve',
            },
          },
          required: ['user_id'],
        },
      },
      {
        name: 'create_user',
        description: 'Invite a new user to the Aircall account by email with optional role assignment',
        inputSchema: {
          type: 'object',
          properties: {
            email: {
              type: 'string',
              description: 'Email address of the user to invite',
            },
            first_name: {
              type: 'string',
              description: 'First name of the new user',
            },
            last_name: {
              type: 'string',
              description: 'Last name of the new user',
            },
            role: {
              type: 'string',
              description: 'User role: admin or agent (default: agent)',
            },
          },
          required: ['email', 'first_name', 'last_name'],
        },
      },
      {
        name: 'update_user',
        description: 'Update an existing Aircall user profile — name, role, time zone, or availability state',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: {
              type: 'number',
              description: 'Aircall user ID to update',
            },
            first_name: {
              type: 'string',
              description: 'Updated first name',
            },
            last_name: {
              type: 'string',
              description: 'Updated last name',
            },
            role: {
              type: 'string',
              description: 'Updated role: admin or agent',
            },
            time_zone: {
              type: 'string',
              description: 'IANA time zone (e.g. America/New_York)',
            },
            availability: {
              type: 'string',
              description: 'Availability state: available or unavailable',
            },
          },
          required: ['user_id'],
        },
      },
      {
        name: 'delete_user',
        description: 'Remove a user from the Aircall account by user ID',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: {
              type: 'number',
              description: 'Aircall user ID to delete',
            },
          },
          required: ['user_id'],
        },
      },
      // ── Numbers ────────────────────────────────────────────────────────────
      {
        name: 'list_numbers',
        description: 'List all phone numbers in the Aircall account with their assigned users and IVR configuration',
        inputSchema: {
          type: 'object',
          properties: {
            per_page: {
              type: 'number',
              description: 'Results per page (max: 50, default: 20)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
          },
        },
      },
      {
        name: 'get_number',
        description: 'Get configuration details for a specific Aircall phone number by number ID',
        inputSchema: {
          type: 'object',
          properties: {
            number_id: {
              type: 'number',
              description: 'Aircall number ID to retrieve',
            },
          },
          required: ['number_id'],
        },
      },
      {
        name: 'update_number',
        description: 'Update the name, business hours, or IVR settings for an Aircall phone number',
        inputSchema: {
          type: 'object',
          properties: {
            number_id: {
              type: 'number',
              description: 'Aircall number ID to update',
            },
            name: {
              type: 'string',
              description: 'Display name for the phone number',
            },
            open: {
              type: 'boolean',
              description: 'Whether the number is open for calls (business hours override)',
            },
          },
          required: ['number_id'],
        },
      },
      // ── Teams ──────────────────────────────────────────────────────────────
      {
        name: 'list_teams',
        description: 'List all teams in the Aircall account with their member counts and assigned numbers',
        inputSchema: {
          type: 'object',
          properties: {
            per_page: {
              type: 'number',
              description: 'Results per page (max: 50, default: 20)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
          },
        },
      },
      {
        name: 'get_team',
        description: 'Get details for a single Aircall team by team ID, including member list and assigned numbers',
        inputSchema: {
          type: 'object',
          properties: {
            team_id: {
              type: 'number',
              description: 'Aircall team ID to retrieve',
            },
          },
          required: ['team_id'],
        },
      },
      {
        name: 'create_team',
        description: 'Create a new team in the Aircall account with an optional name',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Display name for the new team',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'delete_team',
        description: 'Delete an Aircall team by team ID (members are not deleted, only removed from the team)',
        inputSchema: {
          type: 'object',
          properties: {
            team_id: {
              type: 'number',
              description: 'Aircall team ID to delete',
            },
          },
          required: ['team_id'],
        },
      },
      {
        name: 'add_user_to_team',
        description: 'Add a user to an Aircall team by team ID and user ID',
        inputSchema: {
          type: 'object',
          properties: {
            team_id: {
              type: 'number',
              description: 'Aircall team ID to add the user to',
            },
            user_id: {
              type: 'number',
              description: 'Aircall user ID to add to the team',
            },
          },
          required: ['team_id', 'user_id'],
        },
      },
      {
        name: 'remove_user_from_team',
        description: 'Remove a user from an Aircall team by team ID and user ID',
        inputSchema: {
          type: 'object',
          properties: {
            team_id: {
              type: 'number',
              description: 'Aircall team ID to remove the user from',
            },
            user_id: {
              type: 'number',
              description: 'Aircall user ID to remove from the team',
            },
          },
          required: ['team_id', 'user_id'],
        },
      },
      // ── Contacts ───────────────────────────────────────────────────────────
      {
        name: 'list_contacts',
        description: 'List all contacts in the Aircall phonebook with optional search and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            per_page: {
              type: 'number',
              description: 'Results per page (max: 50, default: 20)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
          },
        },
      },
      {
        name: 'get_contact',
        description: 'Get a single Aircall contact by contact ID, including phone numbers and linked calls',
        inputSchema: {
          type: 'object',
          properties: {
            contact_id: {
              type: 'number',
              description: 'Aircall contact ID to retrieve',
            },
          },
          required: ['contact_id'],
        },
      },
      {
        name: 'create_contact',
        description: 'Create a new contact in the Aircall phonebook with name and phone number',
        inputSchema: {
          type: 'object',
          properties: {
            first_name: {
              type: 'string',
              description: 'Contact first name',
            },
            last_name: {
              type: 'string',
              description: 'Contact last name',
            },
            information: {
              type: 'array',
              description: 'Array of contact info objects, each with label (phone_number, email) and value',
              items: { type: 'object' },
            },
          },
          required: ['first_name'],
        },
      },
      {
        name: 'update_contact',
        description: 'Update an existing Aircall contact name or phone numbers by contact ID',
        inputSchema: {
          type: 'object',
          properties: {
            contact_id: {
              type: 'number',
              description: 'Aircall contact ID to update',
            },
            first_name: {
              type: 'string',
              description: 'Updated first name',
            },
            last_name: {
              type: 'string',
              description: 'Updated last name',
            },
            information: {
              type: 'array',
              description: 'Updated array of contact info objects with label and value',
              items: { type: 'object' },
            },
          },
          required: ['contact_id'],
        },
      },
      {
        name: 'delete_contact',
        description: 'Delete a contact from the Aircall phonebook by contact ID',
        inputSchema: {
          type: 'object',
          properties: {
            contact_id: {
              type: 'number',
              description: 'Aircall contact ID to delete',
            },
          },
          required: ['contact_id'],
        },
      },
      // ── Webhooks ───────────────────────────────────────────────────────────
      {
        name: 'list_webhooks',
        description: 'List all registered webhooks for the Aircall account with their event subscriptions and URLs',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'create_webhook',
        description: 'Register a new webhook URL for Aircall call events (call.created, call.answered, call.ended, etc.)',
        inputSchema: {
          type: 'object',
          properties: {
            label: {
              type: 'string',
              description: 'Display label for the webhook',
            },
            url: {
              type: 'string',
              description: 'HTTPS URL that will receive POST payloads for subscribed events',
            },
            custom_headers: {
              type: 'object',
              description: 'Optional custom HTTP headers to include with each webhook delivery',
            },
          },
          required: ['url'],
        },
      },
      {
        name: 'update_webhook',
        description: 'Update the URL, label, or custom headers of an existing Aircall webhook by webhook ID',
        inputSchema: {
          type: 'object',
          properties: {
            webhook_id: {
              type: 'number',
              description: 'Aircall webhook ID to update',
            },
            label: {
              type: 'string',
              description: 'New display label for the webhook',
            },
            url: {
              type: 'string',
              description: 'New HTTPS URL for the webhook',
            },
          },
          required: ['webhook_id'],
        },
      },
      {
        name: 'delete_webhook',
        description: 'Delete a registered webhook from the Aircall account by webhook ID',
        inputSchema: {
          type: 'object',
          properties: {
            webhook_id: {
              type: 'number',
              description: 'Aircall webhook ID to delete',
            },
          },
          required: ['webhook_id'],
        },
      },
      // ── Tags ───────────────────────────────────────────────────────────────
      {
        name: 'list_tags',
        description: 'List all call tags defined in the Aircall account with their IDs and colors',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'create_tag',
        description: 'Create a new call tag in the Aircall account with a name and optional color',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Display name for the tag (e.g. "follow-up", "VIP", "bug-report")',
            },
            color: {
              type: 'string',
              description: 'Hex color code for the tag (e.g. #FF5733)',
            },
          },
          required: ['name'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_calls':           return this.listCalls(args);
        case 'get_call':             return this.getCall(args);
        case 'search_calls':         return this.searchCalls(args);
        case 'add_call_tags':        return this.addCallTags(args);
        case 'transfer_call':        return this.transferCall(args);
        case 'list_users':           return this.listUsers(args);
        case 'get_user':             return this.getUser(args);
        case 'create_user':          return this.createUser(args);
        case 'update_user':          return this.updateUser(args);
        case 'delete_user':          return this.deleteUser(args);
        case 'list_numbers':         return this.listNumbers(args);
        case 'get_number':           return this.getNumber(args);
        case 'update_number':        return this.updateNumber(args);
        case 'list_teams':           return this.listTeams(args);
        case 'get_team':             return this.getTeam(args);
        case 'create_team':          return this.createTeam(args);
        case 'delete_team':          return this.deleteTeam(args);
        case 'add_user_to_team':     return this.addUserToTeam(args);
        case 'remove_user_from_team':return this.removeUserFromTeam(args);
        case 'list_contacts':        return this.listContacts(args);
        case 'get_contact':          return this.getContact(args);
        case 'create_contact':       return this.createContact(args);
        case 'update_contact':       return this.updateContact(args);
        case 'delete_contact':       return this.deleteContact(args);
        case 'list_webhooks':        return this.listWebhooks();
        case 'create_webhook':       return this.createWebhook(args);
        case 'update_webhook':       return this.updateWebhook(args);
        case 'delete_webhook':       return this.deleteWebhook(args);
        case 'list_tags':            return this.listTags();
        case 'create_tag':           return this.createTag(args);
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
    const credentials = Buffer.from(`${this.apiId}:${this.apiToken}`).toString('base64');
    return `Basic ${credentials}`;
  }

  private async request(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    path: string,
    params?: Record<string, string>,
    body?: Record<string, unknown>,
  ): Promise<ToolResult> {
    let url = `${this.baseUrl}${path}`;
    if (params && Object.keys(params).length > 0) {
      url += '?' + new URLSearchParams(params).toString();
    }
    const init: RequestInit = {
      method,
      headers: {
        Authorization: this.authHeader,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    };
    if (body) init.body = JSON.stringify(body);
    const response = await this.fetchWithRetry(url, init);
    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }
    if (response.status === 204) {
      return { content: [{ type: 'text', text: '{"success":true}' }], isError: false };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  // ── Calls ──────────────────────────────────────────────────────────────────

  private async listCalls(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      per_page: String((args.per_page as number) ?? 20),
      page: String((args.page as number) ?? 1),
    };
    if (args.direction) params.direction = args.direction as string;
    if (args.user_id)   params.user_id   = String(args.user_id);
    if (args.number_id) params.number_id = String(args.number_id);
    if (args.from)      params.from      = String(args.from);
    if (args.to)        params.to        = String(args.to);
    if (args.order)     params.order     = args.order as string;
    return this.request('GET', '/calls', params);
  }

  private async getCall(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.call_id) return { content: [{ type: 'text', text: 'call_id is required' }], isError: true };
    return this.request('GET', `/calls/${encodeURIComponent(args.call_id as string)}`);
  }

  private async searchCalls(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.query) return { content: [{ type: 'text', text: 'query is required' }], isError: true };
    const params: Record<string, string> = {
      per_page: String((args.per_page as number) ?? 20),
    };
    if (args.from) params.from = String(args.from);
    if (args.to)   params.to   = String(args.to);
    // Aircall uses a `filters` query parameter for search
    params['filters[number]'] = args.query as string;
    return this.request('GET', '/calls/search', params);
  }

  private async addCallTags(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.call_id || !args.tag_ids) {
      return { content: [{ type: 'text', text: 'call_id and tag_ids are required' }], isError: true };
    }
    return this.request('POST', `/calls/${encodeURIComponent(args.call_id as string)}/tags`, undefined, { tag_ids: args.tag_ids });
  }

  private async transferCall(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.call_id || !args.user_id) {
      return { content: [{ type: 'text', text: 'call_id and user_id are required' }], isError: true };
    }
    return this.request('POST', `/calls/${encodeURIComponent(args.call_id as string)}/transfers`, undefined, { user_id: args.user_id });
  }

  // ── Users ──────────────────────────────────────────────────────────────────

  private async listUsers(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request('GET', '/users', {
      per_page: String((args.per_page as number) ?? 20),
      page:     String((args.page as number) ?? 1),
    });
  }

  private async getUser(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.user_id) return { content: [{ type: 'text', text: 'user_id is required' }], isError: true };
    return this.request('GET', `/users/${encodeURIComponent(args.user_id as string)}`);
  }

  private async createUser(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.email || !args.first_name || !args.last_name) {
      return { content: [{ type: 'text', text: 'email, first_name, and last_name are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      email: args.email,
      first_name: args.first_name,
      last_name: args.last_name,
    };
    if (args.role) body.role = args.role;
    return this.request('POST', '/users', undefined, body);
  }

  private async updateUser(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.user_id) return { content: [{ type: 'text', text: 'user_id is required' }], isError: true };
    const { user_id, ...rest } = args;
    return this.request('PUT', `/users/${user_id}`, undefined, rest as Record<string, unknown>);
  }

  private async deleteUser(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.user_id) return { content: [{ type: 'text', text: 'user_id is required' }], isError: true };
    return this.request('DELETE', `/users/${encodeURIComponent(args.user_id as string)}`);
  }

  // ── Numbers ────────────────────────────────────────────────────────────────

  private async listNumbers(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request('GET', '/numbers', {
      per_page: String((args.per_page as number) ?? 20),
      page:     String((args.page as number) ?? 1),
    });
  }

  private async getNumber(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.number_id) return { content: [{ type: 'text', text: 'number_id is required' }], isError: true };
    return this.request('GET', `/numbers/${encodeURIComponent(args.number_id as string)}`);
  }

  private async updateNumber(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.number_id) return { content: [{ type: 'text', text: 'number_id is required' }], isError: true };
    const { number_id, ...rest } = args;
    return this.request('PUT', `/numbers/${number_id}`, undefined, rest as Record<string, unknown>);
  }

  // ── Teams ──────────────────────────────────────────────────────────────────

  private async listTeams(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request('GET', '/teams', {
      per_page: String((args.per_page as number) ?? 20),
      page:     String((args.page as number) ?? 1),
    });
  }

  private async getTeam(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.team_id) return { content: [{ type: 'text', text: 'team_id is required' }], isError: true };
    return this.request('GET', `/teams/${encodeURIComponent(args.team_id as string)}`);
  }

  private async createTeam(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name) return { content: [{ type: 'text', text: 'name is required' }], isError: true };
    return this.request('POST', '/teams', undefined, { name: args.name });
  }

  private async deleteTeam(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.team_id) return { content: [{ type: 'text', text: 'team_id is required' }], isError: true };
    return this.request('DELETE', `/teams/${encodeURIComponent(args.team_id as string)}`);
  }

  private async addUserToTeam(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.team_id || !args.user_id) {
      return { content: [{ type: 'text', text: 'team_id and user_id are required' }], isError: true };
    }
    return this.request('POST', `/teams/${encodeURIComponent(args.team_id as string)}/users/${encodeURIComponent(args.user_id as string)}`);
  }

  private async removeUserFromTeam(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.team_id || !args.user_id) {
      return { content: [{ type: 'text', text: 'team_id and user_id are required' }], isError: true };
    }
    return this.request('DELETE', `/teams/${encodeURIComponent(args.team_id as string)}/users/${encodeURIComponent(args.user_id as string)}`);
  }

  // ── Contacts ───────────────────────────────────────────────────────────────

  private async listContacts(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request('GET', '/contacts', {
      per_page: String((args.per_page as number) ?? 20),
      page:     String((args.page as number) ?? 1),
    });
  }

  private async getContact(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.contact_id) return { content: [{ type: 'text', text: 'contact_id is required' }], isError: true };
    return this.request('GET', `/contacts/${encodeURIComponent(args.contact_id as string)}`);
  }

  private async createContact(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.first_name) return { content: [{ type: 'text', text: 'first_name is required' }], isError: true };
    const body: Record<string, unknown> = { first_name: args.first_name };
    if (args.last_name)    body.last_name    = args.last_name;
    if (args.information)  body.information  = args.information;
    return this.request('POST', '/contacts', undefined, body);
  }

  private async updateContact(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.contact_id) return { content: [{ type: 'text', text: 'contact_id is required' }], isError: true };
    const { contact_id, ...rest } = args;
    return this.request('PUT', `/contacts/${contact_id}`, undefined, rest as Record<string, unknown>);
  }

  private async deleteContact(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.contact_id) return { content: [{ type: 'text', text: 'contact_id is required' }], isError: true };
    return this.request('DELETE', `/contacts/${encodeURIComponent(args.contact_id as string)}`);
  }

  // ── Webhooks ───────────────────────────────────────────────────────────────

  private async listWebhooks(): Promise<ToolResult> {
    return this.request('GET', '/webhooks');
  }

  private async createWebhook(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.url) return { content: [{ type: 'text', text: 'url is required' }], isError: true };
    const body: Record<string, unknown> = { url: args.url };
    if (args.label)          body.label          = args.label;
    if (args.custom_headers) body.custom_headers = args.custom_headers;
    return this.request('POST', '/webhooks', undefined, body);
  }

  private async updateWebhook(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.webhook_id) return { content: [{ type: 'text', text: 'webhook_id is required' }], isError: true };
    const { webhook_id, ...rest } = args;
    return this.request('PUT', `/webhooks/${webhook_id}`, undefined, rest as Record<string, unknown>);
  }

  private async deleteWebhook(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.webhook_id) return { content: [{ type: 'text', text: 'webhook_id is required' }], isError: true };
    return this.request('DELETE', `/webhooks/${encodeURIComponent(args.webhook_id as string)}`);
  }

  // ── Tags ───────────────────────────────────────────────────────────────────

  private async listTags(): Promise<ToolResult> {
    return this.request('GET', '/tags');
  }

  private async createTag(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name) return { content: [{ type: 'text', text: 'name is required' }], isError: true };
    const body: Record<string, unknown> = { name: args.name };
    if (args.color) body.color = args.color;
    return this.request('POST', '/tags', undefined, body);
  }
}

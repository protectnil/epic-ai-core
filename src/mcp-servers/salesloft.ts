/**
 * Salesloft MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// No official Salesloft-published MCP server exists. CData ships a read-only third-party
// adapter (github.com/CDataSoftware/salesloft-mcp-server-by-cdata) via JDBC — not official.
// This adapter provides full read/write coverage of the Salesloft API v2.
//
// Base URL: https://api.salesloft.com/v2
// Auth: Bearer token — OAuth2 access token or API key from Salesloft Settings → API Keys
// Docs: https://developers.salesloft.com/api.html
// Rate limits: 600 requests/minute per token (documented in API response headers)

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface SalesloftConfig {
  accessToken: string;
  /** Override base URL (default: https://api.salesloft.com/v2) */
  baseUrl?: string;
}

export class SalesloftMCPServer extends MCPAdapterBase {
  private readonly accessToken: string;
  private readonly baseUrl: string;

  constructor(config: SalesloftConfig) {
    super();
    this.accessToken = config.accessToken;
    this.baseUrl = (config.baseUrl || 'https://api.salesloft.com').replace(/\/$/, '') + '/v2';
  }

  static catalog() {
    return {
      name: 'salesloft',
      displayName: 'Salesloft',
      version: '1.0.0',
      category: 'crm' as const,
      keywords: ['salesloft', 'sales-engagement', 'cadence', 'outreach', 'prospect', 'sequence', 'people', 'account', 'call', 'email', 'task', 'note', 'step'],
      toolNames: [
        'list_people', 'get_person', 'create_person', 'update_person',
        'list_accounts', 'get_account', 'create_account', 'update_account',
        'list_cadences', 'get_cadence',
        'list_cadence_memberships', 'create_cadence_membership',
        'list_calls', 'list_email_activities',
        'list_notes', 'create_note',
        'list_tasks', 'create_task',
        'list_users',
        'get_me',
      ],
      description: 'Salesloft sales engagement: manage people, accounts, cadences, memberships, calls, emails, notes, tasks, and users via API v2.',
      author: 'protectnil' as const,
    };
  }

  get tools(): ToolDefinition[] {
    return [
      // ── People ───────────────────────────────────────────────────────────────
      {
        name: 'list_people',
        description: 'List people (prospects/contacts) in Salesloft with optional filters by email, account, or cadence, and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            email_addresses: {
              type: 'string',
              description: 'Filter by exact email address',
            },
            account_id: {
              type: 'number',
              description: 'Filter people by Salesloft account ID',
            },
            cadence_id: {
              type: 'number',
              description: 'Filter people currently enrolled in this cadence ID',
            },
            per_page: {
              type: 'number',
              description: 'Number of records per page (max 100, default: 25)',
            },
            page: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
            sort_by: {
              type: 'string',
              description: 'Field to sort by (e.g. last_name, created_at)',
            },
            sort_direction: {
              type: 'string',
              description: 'Sort direction: ASC or DESC (default: DESC)',
            },
          },
        },
      },
      {
        name: 'get_person',
        description: 'Retrieve full details for a single Salesloft person by their numeric ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'number',
              description: 'Salesloft person ID',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'create_person',
        description: 'Create a new person (prospect) in Salesloft with email, name, title, and optional account assignment',
        inputSchema: {
          type: 'object',
          properties: {
            email_address: {
              type: 'string',
              description: 'Primary email address (required)',
            },
            first_name: {
              type: 'string',
              description: 'First name',
            },
            last_name: {
              type: 'string',
              description: 'Last name',
            },
            title: {
              type: 'string',
              description: 'Job title',
            },
            phone: {
              type: 'string',
              description: 'Primary phone number',
            },
            account_id: {
              type: 'number',
              description: 'Salesloft account ID to associate this person with',
            },
            city: {
              type: 'string',
              description: 'City',
            },
            state: {
              type: 'string',
              description: 'State or province',
            },
            country: {
              type: 'string',
              description: 'Country',
            },
          },
          required: ['email_address'],
        },
      },
      {
        name: 'update_person',
        description: 'Update an existing Salesloft person\'s fields by their numeric ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'number',
              description: 'Salesloft person ID to update',
            },
            first_name: {
              type: 'string',
              description: 'Updated first name',
            },
            last_name: {
              type: 'string',
              description: 'Updated last name',
            },
            title: {
              type: 'string',
              description: 'Updated job title',
            },
            phone: {
              type: 'string',
              description: 'Updated phone number',
            },
            account_id: {
              type: 'number',
              description: 'Updated account ID',
            },
            do_not_contact: {
              type: 'boolean',
              description: 'If true, mark person as do-not-contact',
            },
          },
          required: ['id'],
        },
      },
      // ── Accounts ─────────────────────────────────────────────────────────────
      {
        name: 'list_accounts',
        description: 'List company account records in Salesloft with optional filters by name or domain, and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Filter accounts by name (prefix search)',
            },
            domain: {
              type: 'string',
              description: 'Filter accounts by website domain',
            },
            per_page: {
              type: 'number',
              description: 'Number of records per page (max 100, default: 25)',
            },
            page: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
            sort_by: {
              type: 'string',
              description: 'Field to sort by (e.g. name, created_at)',
            },
            sort_direction: {
              type: 'string',
              description: 'Sort direction: ASC or DESC (default: DESC)',
            },
          },
        },
      },
      {
        name: 'get_account',
        description: 'Retrieve full details for a single Salesloft account by its numeric ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'number',
              description: 'Salesloft account ID',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'create_account',
        description: 'Create a new company account in Salesloft with name, domain, and optional industry details',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Company name (required)',
            },
            domain: {
              type: 'string',
              description: 'Company website domain (e.g. acmecorp.com)',
            },
            industry: {
              type: 'string',
              description: 'Industry name',
            },
            phone: {
              type: 'string',
              description: 'Company phone number',
            },
            city: {
              type: 'string',
              description: 'City',
            },
            state: {
              type: 'string',
              description: 'State or province',
            },
            country: {
              type: 'string',
              description: 'Country',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'update_account',
        description: 'Update an existing Salesloft account by its numeric ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'number',
              description: 'Salesloft account ID to update',
            },
            name: {
              type: 'string',
              description: 'Updated company name',
            },
            domain: {
              type: 'string',
              description: 'Updated website domain',
            },
            industry: {
              type: 'string',
              description: 'Updated industry',
            },
            phone: {
              type: 'string',
              description: 'Updated phone number',
            },
          },
          required: ['id'],
        },
      },
      // ── Cadences ─────────────────────────────────────────────────────────────
      {
        name: 'list_cadences',
        description: 'List cadence (automated outreach sequence) records in Salesloft, optionally filtered to team or personal cadences',
        inputSchema: {
          type: 'object',
          properties: {
            team_cadence: {
              type: 'boolean',
              description: 'If true, return only team cadences. If false, return only personal cadences. Omit for all.',
            },
            per_page: {
              type: 'number',
              description: 'Number of records per page (max 100, default: 25)',
            },
            page: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
            sort_by: {
              type: 'string',
              description: 'Field to sort by (e.g. name, created_at)',
            },
            sort_direction: {
              type: 'string',
              description: 'Sort direction: ASC or DESC (default: DESC)',
            },
          },
        },
      },
      {
        name: 'get_cadence',
        description: 'Retrieve full details for a single Salesloft cadence by its numeric ID including steps and settings',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'number',
              description: 'Salesloft cadence ID',
            },
          },
          required: ['id'],
        },
      },
      // ── Cadence Memberships ──────────────────────────────────────────────────
      {
        name: 'list_cadence_memberships',
        description: 'List cadence memberships in Salesloft — shows which people are enrolled in which cadences',
        inputSchema: {
          type: 'object',
          properties: {
            person_id: {
              type: 'number',
              description: 'Filter memberships by person ID',
            },
            cadence_id: {
              type: 'number',
              description: 'Filter memberships by cadence ID',
            },
            per_page: {
              type: 'number',
              description: 'Number of records per page (max 100, default: 25)',
            },
            page: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
          },
        },
      },
      {
        name: 'create_cadence_membership',
        description: 'Enroll a person in a Salesloft cadence at a specific step',
        inputSchema: {
          type: 'object',
          properties: {
            person_id: {
              type: 'number',
              description: 'Salesloft person ID to enroll',
            },
            cadence_id: {
              type: 'number',
              description: 'Salesloft cadence ID to enroll the person in',
            },
            user_id: {
              type: 'number',
              description: 'Salesloft user ID who will own this enrollment (defaults to token owner)',
            },
          },
          required: ['person_id', 'cadence_id'],
        },
      },
      // ── Activities ───────────────────────────────────────────────────────────
      {
        name: 'list_calls',
        description: 'List call activity records in Salesloft with optional filters by person ID or cadence ID',
        inputSchema: {
          type: 'object',
          properties: {
            person_id: {
              type: 'number',
              description: 'Filter calls by Salesloft person ID',
            },
            cadence_id: {
              type: 'number',
              description: 'Filter calls by cadence ID',
            },
            per_page: {
              type: 'number',
              description: 'Number of records per page (max 100, default: 25)',
            },
            page: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
          },
        },
      },
      {
        name: 'list_email_activities',
        description: 'List email activity records (sent emails) in Salesloft with optional filters by person ID or cadence ID',
        inputSchema: {
          type: 'object',
          properties: {
            person_id: {
              type: 'number',
              description: 'Filter email activities by Salesloft person ID',
            },
            cadence_id: {
              type: 'number',
              description: 'Filter email activities by cadence ID',
            },
            per_page: {
              type: 'number',
              description: 'Number of records per page (max 100, default: 25)',
            },
            page: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
          },
        },
      },
      // ── Notes ────────────────────────────────────────────────────────────────
      {
        name: 'list_notes',
        description: 'List note records in Salesloft with optional filters by person ID or account ID',
        inputSchema: {
          type: 'object',
          properties: {
            person_id: {
              type: 'number',
              description: 'Filter notes by Salesloft person ID',
            },
            account_id: {
              type: 'number',
              description: 'Filter notes by Salesloft account ID',
            },
            per_page: {
              type: 'number',
              description: 'Number of records per page (max 100, default: 25)',
            },
            page: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
          },
        },
      },
      {
        name: 'create_note',
        description: 'Create a note in Salesloft associated with a person or account',
        inputSchema: {
          type: 'object',
          properties: {
            content: {
              type: 'string',
              description: 'Text content of the note',
            },
            person_id: {
              type: 'number',
              description: 'Salesloft person ID to associate the note with',
            },
            account_id: {
              type: 'number',
              description: 'Salesloft account ID to associate the note with',
            },
            call_id: {
              type: 'number',
              description: 'Salesloft call ID to associate the note with',
            },
          },
          required: ['content'],
        },
      },
      // ── Tasks ────────────────────────────────────────────────────────────────
      {
        name: 'list_tasks',
        description: 'List task records in Salesloft with optional filters by person ID, due date range, and completion status',
        inputSchema: {
          type: 'object',
          properties: {
            person_id: {
              type: 'number',
              description: 'Filter tasks by Salesloft person ID',
            },
            due_on_start: {
              type: 'string',
              description: 'Filter tasks due on or after this date (ISO 8601 format, e.g. 2026-03-01)',
            },
            due_on_end: {
              type: 'string',
              description: 'Filter tasks due on or before this date (ISO 8601 format)',
            },
            per_page: {
              type: 'number',
              description: 'Number of records per page (max 100, default: 25)',
            },
            page: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
          },
        },
      },
      {
        name: 'create_task',
        description: 'Create a task in Salesloft associated with a person, with optional due date and reminder',
        inputSchema: {
          type: 'object',
          properties: {
            subject: {
              type: 'string',
              description: 'Task subject or title',
            },
            person_id: {
              type: 'number',
              description: 'Salesloft person ID to associate the task with',
            },
            due_on: {
              type: 'string',
              description: 'Due date in ISO 8601 format (e.g. 2026-04-01)',
            },
            remind_at: {
              type: 'string',
              description: 'Reminder datetime in ISO 8601 format',
            },
          },
          required: ['subject'],
        },
      },
      // ── Users ────────────────────────────────────────────────────────────────
      {
        name: 'list_users',
        description: 'List Salesloft user accounts in the team with optional pagination',
        inputSchema: {
          type: 'object',
          properties: {
            per_page: {
              type: 'number',
              description: 'Number of records per page (max 100, default: 25)',
            },
            page: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
          },
        },
      },
      {
        name: 'get_me',
        description: 'Retrieve details about the currently authenticated Salesloft user including ID, name, email, and team',
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
        case 'list_people':               return this.listPeople(args);
        case 'get_person':                return this.getPerson(args);
        case 'create_person':             return this.createPerson(args);
        case 'update_person':             return this.updatePerson(args);
        case 'list_accounts':             return this.listAccounts(args);
        case 'get_account':               return this.getAccount(args);
        case 'create_account':            return this.createAccount(args);
        case 'update_account':            return this.updateAccount(args);
        case 'list_cadences':             return this.listCadences(args);
        case 'get_cadence':               return this.getCadence(args);
        case 'list_cadence_memberships':  return this.listCadenceMemberships(args);
        case 'create_cadence_membership': return this.createCadenceMembership(args);
        case 'list_calls':                return this.listCalls(args);
        case 'list_email_activities':     return this.listEmailActivities(args);
        case 'list_notes':                return this.listNotes(args);
        case 'create_note':               return this.createNote(args);
        case 'list_tasks':                return this.listTasks(args);
        case 'create_task':               return this.createTask(args);
        case 'list_users':                return this.listUsers(args);
        case 'get_me':                    return this.getMe();
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

  // ── Private helpers ────────────────────────────────────────────────────────

  private get headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  private async fetchJson(url: string, init?: RequestInit): Promise<ToolResult> {
    const response = await this.fetchWithRetry(url, { headers: this.headers, ...init });
    if (!response.ok) {
      let detail: unknown;
      try { detail = await response.json(); } catch { detail = await response.text(); }
      return {
        content: [{ type: 'text', text: `Salesloft API error ${response.status} ${response.statusText}: ${JSON.stringify(detail)}` }],
        isError: true,
      };
    }
    const data = await response.json();
    return {
      content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }],
      isError: false,
    };
  }

  private buildListParams(
    args: Record<string, unknown>,
    filterMap: Record<string, string> = {},
  ): URLSearchParams {
    const p = new URLSearchParams();
    for (const [argKey, paramName] of Object.entries(filterMap)) {
      if (args[argKey] !== undefined) p.set(paramName, String(args[argKey]));
    }
    p.set('per_page', String((args.per_page as number) || 25));
    p.set('page', String((args.page as number) || 1));
    if (args.sort_by) p.set('sort_by', args.sort_by as string);
    if (args.sort_direction) p.set('sort_direction', args.sort_direction as string);
    return p;
  }

  private async listPeople(args: Record<string, unknown>): Promise<ToolResult> {
    const p = this.buildListParams(args, {
      email_addresses: 'filter[email_addresses]',
      account_id: 'filter[account_id]',
      cadence_id: 'filter[cadence_id]',
    });
    return this.fetchJson(`${this.baseUrl}/people?${p}`);
  }

  private async getPerson(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.id as number;
    if (!id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.fetchJson(`${this.baseUrl}/people/${id}`);
  }

  private async createPerson(args: Record<string, unknown>): Promise<ToolResult> {
    const email_address = args.email_address as string;
    if (!email_address) return { content: [{ type: 'text', text: 'email_address is required' }], isError: true };

    const body: Record<string, unknown> = { email_address };
    for (const f of ['first_name', 'last_name', 'title', 'phone', 'city', 'state', 'country']) {
      if (args[f] !== undefined) body[f] = args[f];
    }
    if (args.account_id !== undefined) body.account_id = args.account_id;

    return this.fetchJson(`${this.baseUrl}/people`, { method: 'POST', body: JSON.stringify(body) });
  }

  private async updatePerson(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.id as number;
    if (!id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };

    const body: Record<string, unknown> = {};
    for (const f of ['first_name', 'last_name', 'title', 'phone', 'account_id', 'do_not_contact']) {
      if (args[f] !== undefined) body[f] = args[f];
    }

    return this.fetchJson(`${this.baseUrl}/people/${id}`, { method: 'PUT', body: JSON.stringify(body) });
  }

  private async listAccounts(args: Record<string, unknown>): Promise<ToolResult> {
    const p = this.buildListParams(args, {
      name: 'filter[name]',
      domain: 'filter[domain]',
    });
    return this.fetchJson(`${this.baseUrl}/accounts?${p}`);
  }

  private async getAccount(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.id as number;
    if (!id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.fetchJson(`${this.baseUrl}/accounts/${id}`);
  }

  private async createAccount(args: Record<string, unknown>): Promise<ToolResult> {
    const name = args.name as string;
    if (!name) return { content: [{ type: 'text', text: 'name is required' }], isError: true };

    const body: Record<string, unknown> = { name };
    for (const f of ['domain', 'industry', 'phone', 'city', 'state', 'country']) {
      if (args[f] !== undefined) body[f] = args[f];
    }

    return this.fetchJson(`${this.baseUrl}/accounts`, { method: 'POST', body: JSON.stringify(body) });
  }

  private async updateAccount(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.id as number;
    if (!id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };

    const body: Record<string, unknown> = {};
    for (const f of ['name', 'domain', 'industry', 'phone']) {
      if (args[f] !== undefined) body[f] = args[f];
    }

    return this.fetchJson(`${this.baseUrl}/accounts/${id}`, { method: 'PUT', body: JSON.stringify(body) });
  }

  private async listCadences(args: Record<string, unknown>): Promise<ToolResult> {
    const p = this.buildListParams(args);
    if (typeof args.team_cadence === 'boolean') p.set('filter[team_cadence]', String(args.team_cadence));
    return this.fetchJson(`${this.baseUrl}/cadences?${p}`);
  }

  private async getCadence(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.id as number;
    if (!id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.fetchJson(`${this.baseUrl}/cadences/${id}`);
  }

  private async listCadenceMemberships(args: Record<string, unknown>): Promise<ToolResult> {
    const p = this.buildListParams(args, {
      person_id: 'filter[person_id]',
      cadence_id: 'filter[cadence_id]',
    });
    return this.fetchJson(`${this.baseUrl}/cadence_memberships?${p}`);
  }

  private async createCadenceMembership(args: Record<string, unknown>): Promise<ToolResult> {
    const person_id = args.person_id as number;
    const cadence_id = args.cadence_id as number;
    if (!person_id || !cadence_id) {
      return { content: [{ type: 'text', text: 'person_id and cadence_id are required' }], isError: true };
    }

    const body: Record<string, unknown> = { person_id, cadence_id };
    if (args.user_id !== undefined) body.user_id = args.user_id;

    return this.fetchJson(`${this.baseUrl}/cadence_memberships`, { method: 'POST', body: JSON.stringify(body) });
  }

  private async listCalls(args: Record<string, unknown>): Promise<ToolResult> {
    const p = this.buildListParams(args, {
      person_id: 'filter[person_id]',
      cadence_id: 'filter[cadence_id]',
    });
    return this.fetchJson(`${this.baseUrl}/activities/calls?${p}`);
  }

  private async listEmailActivities(args: Record<string, unknown>): Promise<ToolResult> {
    const p = this.buildListParams(args, {
      person_id: 'filter[person_id]',
      cadence_id: 'filter[cadence_id]',
    });
    return this.fetchJson(`${this.baseUrl}/activities/emails?${p}`);
  }

  private async listNotes(args: Record<string, unknown>): Promise<ToolResult> {
    const p = this.buildListParams(args, {
      person_id: 'filter[person_id]',
      account_id: 'filter[account_id]',
    });
    return this.fetchJson(`${this.baseUrl}/notes?${p}`);
  }

  private async createNote(args: Record<string, unknown>): Promise<ToolResult> {
    const content = args.content as string;
    if (!content) return { content: [{ type: 'text', text: 'content is required' }], isError: true };

    const body: Record<string, unknown> = { content };
    if (args.person_id !== undefined) body.person_id = args.person_id;
    if (args.account_id !== undefined) body.account_id = args.account_id;
    if (args.call_id !== undefined) body.call_id = args.call_id;

    return this.fetchJson(`${this.baseUrl}/notes`, { method: 'POST', body: JSON.stringify(body) });
  }

  private async listTasks(args: Record<string, unknown>): Promise<ToolResult> {
    const p = this.buildListParams(args, {
      person_id: 'filter[person_id]',
    });
    if (args.due_on_start) p.set('filter[due_on_start]', args.due_on_start as string);
    if (args.due_on_end) p.set('filter[due_on_end]', args.due_on_end as string);
    return this.fetchJson(`${this.baseUrl}/tasks?${p}`);
  }

  private async createTask(args: Record<string, unknown>): Promise<ToolResult> {
    const subject = args.subject as string;
    if (!subject) return { content: [{ type: 'text', text: 'subject is required' }], isError: true };

    const body: Record<string, unknown> = { subject };
    if (args.person_id !== undefined) body.person_id = args.person_id;
    if (args.due_on) body.due_on = args.due_on;
    if (args.remind_at) body.remind_at = args.remind_at;

    return this.fetchJson(`${this.baseUrl}/tasks`, { method: 'POST', body: JSON.stringify(body) });
  }

  private async listUsers(args: Record<string, unknown>): Promise<ToolResult> {
    const p = new URLSearchParams();
    p.set('per_page', String((args.per_page as number) || 25));
    p.set('page', String((args.page as number) || 1));
    return this.fetchJson(`${this.baseUrl}/users?${p}`);
  }

  private async getMe(): Promise<ToolResult> {
    return this.fetchJson(`${this.baseUrl}/me`);
  }
}

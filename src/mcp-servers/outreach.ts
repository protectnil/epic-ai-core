/**
 * Outreach MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://support.outreach.io/hc/en-us/articles/46370115253403 — transport: streamable-HTTP, auth: OAuth2
//   Vendor-hosted MCP server launched February 2026. Official (published by Outreach).
//   Actively maintained. Tool count: ~10 tools (fetch_kaia_meetings, emails_search,
//   sequence_search_by_name, prospect_get_by_id, prospect_search_by_name,
//   prospect_search_by_ext_id, account_get_by_id, account_search_by_name,
//   account_search_by_ext_id, opportunity_get_by_id).
//   MCP tools are read/lookup-only. Our REST adapter adds write operations the MCP lacks.
// Integration: use-both
//   MCP-sourced tools (10): fetch_kaia_meetings, emails_search, sequence_search_by_name,
//     prospect_get_by_id, prospect_search_by_name, prospect_search_by_ext_id,
//     account_get_by_id, account_search_by_name, account_search_by_ext_id, opportunity_get_by_id
//   REST-sourced tools (23): list_prospects, get_prospect, create_prospect, update_prospect,
//     list_accounts, get_account, create_account, list_sequences, get_sequence,
//     list_sequence_states, create_sequence_state, list_opportunities, get_opportunity,
//     create_opportunity, list_mailings, get_mailing, list_calls, get_call,
//     list_tasks, get_task, create_task, list_users, get_user
//   Combined coverage: 33 tools (MCP: 10 + REST: 23; shared: 0 — MCP tools use different
//   naming convention than REST adapter tools)
// Our adapter covers: 23 tools. Vendor MCP covers: 10 tools.
//
// Base URL: https://api.outreach.io/api/v2
// Auth: OAuth2 Bearer token (access tokens valid 2 hours; refresh tokens valid 14 days)
// Content-Type for write requests: application/vnd.api+json
// All request bodies follow JSON:API 1.0: { data: { type: '...', attributes: {...} } }
// All responses follow JSON:API 1.0: { data: { id, type, attributes, relationships } }
// Docs: https://developers.outreach.io/api/reference/overview/
// Rate limits: Not publicly documented; Outreach applies per-token rate limits

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface OutreachConfig {
  accessToken: string;
  baseUrl?: string;
}

export class OutreachMCPServer extends MCPAdapterBase {
  private readonly accessToken: string;
  private readonly baseUrl: string;

  constructor(config: OutreachConfig) {
    super();
    this.accessToken = config.accessToken;
    this.baseUrl = config.baseUrl || 'https://api.outreach.io/api/v2';
  }

  static catalog() {
    return {
      name: 'outreach',
      displayName: 'Outreach',
      version: '1.0.0',
      category: 'crm',
      keywords: [
        'outreach', 'sales', 'engagement', 'prospect', 'sequence', 'cadence',
        'email', 'mailing', 'account', 'opportunity', 'call', 'task', 'user',
        'outbound', 'sdr', 'sales-development',
      ],
      toolNames: [
        'list_prospects', 'get_prospect', 'create_prospect', 'update_prospect',
        'list_accounts', 'get_account', 'create_account',
        'list_sequences', 'get_sequence',
        'list_sequence_states', 'create_sequence_state',
        'list_opportunities', 'get_opportunity', 'create_opportunity',
        'list_mailings', 'get_mailing',
        'list_calls', 'get_call',
        'list_tasks', 'get_task', 'create_task',
        'list_users', 'get_user',
      ],
      description: 'Sales engagement: manage prospects, accounts, sequences, opportunities, mailings, calls, tasks, and users in Outreach.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_prospects',
        description: 'List Outreach prospects with optional filters for email, account, stage, or owner. Returns paginated JSON:API collection.',
        inputSchema: {
          type: 'object',
          properties: {
            filter_email: {
              type: 'string',
              description: 'Filter prospects by exact email address',
            },
            filter_account_id: {
              type: 'number',
              description: 'Filter prospects by Outreach account ID',
            },
            filter_owner_id: {
              type: 'number',
              description: 'Filter prospects by owning user ID',
            },
            filter_stage_id: {
              type: 'number',
              description: 'Filter prospects by stage ID',
            },
            page_size: {
              type: 'number',
              description: 'Number of prospects per page (max 1000, default: 50)',
            },
            page_number: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
            sort: {
              type: 'string',
              description: 'Sort field with optional direction prefix: createdAt, -createdAt, updatedAt, -updatedAt, name, -name',
            },
          },
        },
      },
      {
        name: 'get_prospect',
        description: 'Get a single Outreach prospect by ID, including all attributes and relationships.',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'number',
              description: 'Outreach prospect ID',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'create_prospect',
        description: 'Create a new prospect in Outreach with email, name, title, company, and optional account association.',
        inputSchema: {
          type: 'object',
          properties: {
            emails: {
              type: 'array',
              description: 'Array of email address strings for the prospect',
            },
            firstName: {
              type: 'string',
              description: 'Prospect first name',
            },
            lastName: {
              type: 'string',
              description: 'Prospect last name',
            },
            title: {
              type: 'string',
              description: 'Prospect job title',
            },
            company: {
              type: 'string',
              description: 'Prospect company name',
            },
            phones: {
              type: 'array',
              description: 'Array of phone number strings for the prospect',
            },
            account_id: {
              type: 'number',
              description: 'Outreach account ID to associate this prospect with',
            },
          },
        },
      },
      {
        name: 'update_prospect',
        description: 'Update attributes of an existing Outreach prospect by ID.',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'number',
              description: 'Outreach prospect ID to update',
            },
            firstName: {
              type: 'string',
              description: 'Updated first name',
            },
            lastName: {
              type: 'string',
              description: 'Updated last name',
            },
            title: {
              type: 'string',
              description: 'Updated job title',
            },
            company: {
              type: 'string',
              description: 'Updated company name',
            },
            emails: {
              type: 'array',
              description: 'Replacement array of email address strings',
            },
            phones: {
              type: 'array',
              description: 'Replacement array of phone number strings',
            },
            account_id: {
              type: 'number',
              description: 'New owning account ID',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'list_accounts',
        description: 'List Outreach account records (companies/organizations) with optional name or domain filters.',
        inputSchema: {
          type: 'object',
          properties: {
            filter_name: {
              type: 'string',
              description: 'Filter accounts by name (prefix match)',
            },
            filter_domain: {
              type: 'string',
              description: 'Filter accounts by website domain',
            },
            page_size: {
              type: 'number',
              description: 'Number of accounts per page (max 1000, default: 50)',
            },
            page_number: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
            sort: {
              type: 'string',
              description: 'Sort field with optional direction prefix: name, -name, createdAt, -createdAt',
            },
          },
        },
      },
      {
        name: 'get_account',
        description: 'Get a single Outreach account by ID.',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'number',
              description: 'Outreach account ID',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'create_account',
        description: 'Create a new account (company) in Outreach.',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Account (company) name',
            },
            domain: {
              type: 'string',
              description: 'Company website domain (e.g. acme.com)',
            },
            industry: {
              type: 'string',
              description: 'Industry classification',
            },
            employees: {
              type: 'number',
              description: 'Number of employees',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'list_sequences',
        description: 'List Outreach sequences (automated outreach campaigns) with optional enabled/disabled filter.',
        inputSchema: {
          type: 'object',
          properties: {
            filter_enabled: {
              type: 'boolean',
              description: 'Filter by enabled (true) or disabled (false) state',
            },
            page_size: {
              type: 'number',
              description: 'Number of sequences per page (max 1000, default: 50)',
            },
            page_number: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
          },
        },
      },
      {
        name: 'get_sequence',
        description: 'Get a single Outreach sequence by ID, including steps and configuration.',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'number',
              description: 'Outreach sequence ID',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'list_sequence_states',
        description: 'List sequence states (active prospect enrollments in sequences) with optional filters by sequence or prospect.',
        inputSchema: {
          type: 'object',
          properties: {
            filter_sequence_id: {
              type: 'number',
              description: 'Filter by sequence ID',
            },
            filter_prospect_id: {
              type: 'number',
              description: 'Filter by prospect ID',
            },
            filter_state: {
              type: 'string',
              description: 'Filter by state: active, paused, finished',
            },
            page_size: {
              type: 'number',
              description: 'Number of sequence states per page (max 1000, default: 50)',
            },
            page_number: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
          },
        },
      },
      {
        name: 'create_sequence_state',
        description: 'Enroll a prospect into an Outreach sequence by creating a sequence state.',
        inputSchema: {
          type: 'object',
          properties: {
            sequence_id: {
              type: 'number',
              description: 'ID of the sequence to enroll the prospect into',
            },
            prospect_id: {
              type: 'number',
              description: 'ID of the prospect to enroll',
            },
            mailbox_id: {
              type: 'number',
              description: 'ID of the mailbox to send from (optional)',
            },
          },
          required: ['sequence_id', 'prospect_id'],
        },
      },
      {
        name: 'list_opportunities',
        description: 'List Outreach opportunities with optional filters by account or prospect.',
        inputSchema: {
          type: 'object',
          properties: {
            filter_account_id: {
              type: 'number',
              description: 'Filter opportunities by Outreach account ID',
            },
            filter_prospect_id: {
              type: 'number',
              description: 'Filter opportunities by Outreach prospect ID',
            },
            page_size: {
              type: 'number',
              description: 'Number of opportunities per page (max 1000, default: 50)',
            },
            page_number: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
          },
        },
      },
      {
        name: 'get_opportunity',
        description: 'Get a single Outreach opportunity by ID.',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'number',
              description: 'Outreach opportunity ID',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'create_opportunity',
        description: 'Create a new opportunity in Outreach linked to an account and optional prospect.',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Opportunity name',
            },
            amount: {
              type: 'number',
              description: 'Opportunity value amount',
            },
            closeDate: {
              type: 'string',
              description: 'Expected close date in ISO 8601 format (YYYY-MM-DD)',
            },
            account_id: {
              type: 'number',
              description: 'Account ID to associate with this opportunity',
            },
            prospect_id: {
              type: 'number',
              description: 'Prospect ID to associate with this opportunity',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'list_mailings',
        description: 'List Outreach mailings (individual email sends) with optional filters by prospect or sequence.',
        inputSchema: {
          type: 'object',
          properties: {
            filter_prospect_id: {
              type: 'number',
              description: 'Filter mailings by prospect ID',
            },
            filter_sequence_id: {
              type: 'number',
              description: 'Filter mailings by sequence ID',
            },
            page_size: {
              type: 'number',
              description: 'Number of mailings per page (max 1000, default: 50)',
            },
            page_number: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
          },
        },
      },
      {
        name: 'get_mailing',
        description: 'Get a single Outreach mailing by ID, including open/click/reply status.',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'number',
              description: 'Outreach mailing ID',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'list_calls',
        description: 'List Outreach call records with optional filters by prospect, user, or date range.',
        inputSchema: {
          type: 'object',
          properties: {
            filter_prospect_id: {
              type: 'number',
              description: 'Filter calls by prospect ID',
            },
            filter_user_id: {
              type: 'number',
              description: 'Filter calls by user (caller) ID',
            },
            page_size: {
              type: 'number',
              description: 'Number of calls per page (max 1000, default: 50)',
            },
            page_number: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
          },
        },
      },
      {
        name: 'get_call',
        description: 'Get a single Outreach call record by ID, including disposition, duration, and notes.',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'number',
              description: 'Outreach call ID',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'list_tasks',
        description: 'List Outreach tasks with optional filters by state (incomplete, complete) or assigned user.',
        inputSchema: {
          type: 'object',
          properties: {
            filter_state: {
              type: 'string',
              description: 'Filter by task state: incomplete, complete',
            },
            filter_owner_id: {
              type: 'number',
              description: 'Filter tasks by assigned user ID',
            },
            filter_prospect_id: {
              type: 'number',
              description: 'Filter tasks by prospect ID',
            },
            page_size: {
              type: 'number',
              description: 'Number of tasks per page (max 1000, default: 50)',
            },
            page_number: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
          },
        },
      },
      {
        name: 'get_task',
        description: 'Get a single Outreach task by ID.',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'number',
              description: 'Outreach task ID',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'create_task',
        description: 'Create a new task in Outreach assigned to a user and optionally linked to a prospect.',
        inputSchema: {
          type: 'object',
          properties: {
            subject: {
              type: 'string',
              description: 'Task subject/title',
            },
            taskType: {
              type: 'string',
              description: 'Task type: call, email, in_person, linkedin, other',
            },
            dueAt: {
              type: 'string',
              description: 'Task due date in ISO 8601 format',
            },
            owner_id: {
              type: 'number',
              description: 'ID of the user to assign the task to',
            },
            prospect_id: {
              type: 'number',
              description: 'ID of the prospect to associate with this task',
            },
          },
          required: ['subject'],
        },
      },
      {
        name: 'list_users',
        description: 'List Outreach users (team members) in the organization with optional filter by email.',
        inputSchema: {
          type: 'object',
          properties: {
            filter_email: {
              type: 'string',
              description: 'Filter users by email address',
            },
            page_size: {
              type: 'number',
              description: 'Number of users per page (max 1000, default: 50)',
            },
            page_number: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
          },
        },
      },
      {
        name: 'get_user',
        description: 'Get a single Outreach user by ID, including role and team membership.',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'number',
              description: 'Outreach user ID',
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
        case 'list_prospects':
          return await this.listProspects(args);
        case 'get_prospect':
          return await this.getProspect(args);
        case 'create_prospect':
          return await this.createProspect(args);
        case 'update_prospect':
          return await this.updateProspect(args);
        case 'list_accounts':
          return await this.listAccounts(args);
        case 'get_account':
          return await this.getAccount(args);
        case 'create_account':
          return await this.createAccount(args);
        case 'list_sequences':
          return await this.listSequences(args);
        case 'get_sequence':
          return await this.getSequence(args);
        case 'list_sequence_states':
          return await this.listSequenceStates(args);
        case 'create_sequence_state':
          return await this.createSequenceState(args);
        case 'list_opportunities':
          return await this.listOpportunities(args);
        case 'get_opportunity':
          return await this.getOpportunity(args);
        case 'create_opportunity':
          return await this.createOpportunity(args);
        case 'list_mailings':
          return await this.listMailings(args);
        case 'get_mailing':
          return await this.getMailing(args);
        case 'list_calls':
          return await this.listCalls(args);
        case 'get_call':
          return await this.getCall(args);
        case 'list_tasks':
          return await this.listTasks(args);
        case 'get_task':
          return await this.getTask(args);
        case 'create_task':
          return await this.createTask(args);
        case 'list_users':
          return await this.listUsers(args);
        case 'get_user':
          return await this.getUser(args);
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

  // ─── Private helpers ──────────────────────────────────────────────────────

  private get headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.accessToken}`,
      'Content-Type': 'application/vnd.api+json',
      Accept: 'application/vnd.api+json',
    };
  }

  private buildListUrl(
    resource: string,
    args: Record<string, unknown>,
    filterMap: Record<string, string> = {},
  ): string {
    const params = new URLSearchParams();
    for (const [argKey, paramName] of Object.entries(filterMap)) {
      if (args[argKey] !== undefined) {
        params.set(paramName, String(args[argKey]));
      }
    }
    params.set('page[size]', String((args.page_size as number) || 50));
    params.set('page[number]', String((args.page_number as number) || 1));
    if (args.sort) params.set('sort', args.sort as string);
    return `${this.baseUrl}/${resource}?${params.toString()}`;
  }

  private async getJson(url: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(url, { method: 'GET', headers: this.headers });
    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }
    const data = await response.json();
    const text = JSON.stringify(data, null, 2);
    const truncated = text.length > 10_000
      ? text.slice(0, 10_000) + `\n... [truncated, ${text.length} total chars]`
      : text;
    return { content: [{ type: 'text', text: truncated }], isError: false };
  }

  private async postJson(url: string, body: unknown): Promise<ToolResult> {
    const response = await this.fetchWithRetry(url, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }
    const data = await response.json();
    const text = JSON.stringify(data, null, 2);
    const truncated = text.length > 10_000
      ? text.slice(0, 10_000) + `\n... [truncated, ${text.length} total chars]`
      : text;
    return { content: [{ type: 'text', text: truncated }], isError: false };
  }

  private async patchJson(url: string, body: unknown): Promise<ToolResult> {
    const response = await this.fetchWithRetry(url, {
      method: 'PATCH',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }
    const data = await response.json();
    const text = JSON.stringify(data, null, 2);
    const truncated = text.length > 10_000
      ? text.slice(0, 10_000) + `\n... [truncated, ${text.length} total chars]`
      : text;
    return { content: [{ type: 'text', text: truncated }], isError: false };
  }

  // ─── Tool implementations ─────────────────────────────────────────────────

  private async listProspects(args: Record<string, unknown>): Promise<ToolResult> {
    const url = this.buildListUrl('prospects', args, {
      filter_email: 'filter[emails]',
      filter_account_id: 'filter[account][id]',
      filter_owner_id: 'filter[owner][id]',
      filter_stage_id: 'filter[stage][id]',
    });
    return this.getJson(url);
  }

  private async getProspect(args: Record<string, unknown>): Promise<ToolResult> {
    return this.getJson(`${this.baseUrl}/prospects/${encodeURIComponent(args.id as string)}`);
  }

  private async createProspect(args: Record<string, unknown>): Promise<ToolResult> {
    const attributes: Record<string, unknown> = {};
    if (args.emails) attributes.emails = args.emails;
    if (args.firstName) attributes.firstName = args.firstName;
    if (args.lastName) attributes.lastName = args.lastName;
    if (args.title) attributes.title = args.title;
    if (args.company) attributes.company = args.company;
    if (args.phones) attributes.phones = args.phones;

    const body: Record<string, unknown> = { data: { type: 'prospect', attributes } };
    if (args.account_id) {
      (body.data as Record<string, unknown>).relationships = {
        account: { data: { type: 'account', id: args.account_id } },
      };
    }
    return this.postJson(`${this.baseUrl}/prospects`, body);
  }

  private async updateProspect(args: Record<string, unknown>): Promise<ToolResult> {
    const { id, account_id, ...rest } = args;
    const attributes: Record<string, unknown> = {};
    for (const key of ['firstName', 'lastName', 'title', 'company', 'emails', 'phones']) {
      if (rest[key] !== undefined) attributes[key] = rest[key];
    }
    const body: Record<string, unknown> = {
      data: { type: 'prospect', id: String(id), attributes },
    };
    if (account_id !== undefined) {
      (body.data as Record<string, unknown>).relationships = {
        account: { data: { type: 'account', id: account_id } },
      };
    }
    return this.patchJson(`${this.baseUrl}/prospects/${id}`, body);
  }

  private async listAccounts(args: Record<string, unknown>): Promise<ToolResult> {
    const url = this.buildListUrl('accounts', args, {
      filter_name: 'filter[name]',
      filter_domain: 'filter[domain]',
    });
    return this.getJson(url);
  }

  private async getAccount(args: Record<string, unknown>): Promise<ToolResult> {
    return this.getJson(`${this.baseUrl}/accounts/${encodeURIComponent(args.id as string)}`);
  }

  private async createAccount(args: Record<string, unknown>): Promise<ToolResult> {
    const attributes: Record<string, unknown> = {};
    if (args.name) attributes.name = args.name;
    if (args.domain) attributes.domain = args.domain;
    if (args.industry) attributes.industry = args.industry;
    if (args.employees) attributes.employees = args.employees;
    const body = { data: { type: 'account', attributes } };
    return this.postJson(`${this.baseUrl}/accounts`, body);
  }

  private async listSequences(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (typeof args.filter_enabled === 'boolean') {
      params.set('filter[enabled]', String(args.filter_enabled));
    }
    params.set('page[size]', String((args.page_size as number) || 50));
    params.set('page[number]', String((args.page_number as number) || 1));
    return this.getJson(`${this.baseUrl}/sequences?${params.toString()}`);
  }

  private async getSequence(args: Record<string, unknown>): Promise<ToolResult> {
    return this.getJson(`${this.baseUrl}/sequences/${encodeURIComponent(args.id as string)}`);
  }

  private async listSequenceStates(args: Record<string, unknown>): Promise<ToolResult> {
    const url = this.buildListUrl('sequenceStates', args, {
      filter_sequence_id: 'filter[sequence][id]',
      filter_prospect_id: 'filter[prospect][id]',
      filter_state: 'filter[state]',
    });
    return this.getJson(url);
  }

  private async createSequenceState(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {
      data: {
        type: 'sequenceState',
        relationships: {
          sequence: { data: { type: 'sequence', id: args.sequence_id } },
          prospect: { data: { type: 'prospect', id: args.prospect_id } },
        },
      },
    };
    if (args.mailbox_id) {
      ((body.data as Record<string, unknown>).relationships as Record<string, unknown>).mailbox = {
        data: { type: 'mailbox', id: args.mailbox_id },
      };
    }
    return this.postJson(`${this.baseUrl}/sequenceStates`, body);
  }

  private async listOpportunities(args: Record<string, unknown>): Promise<ToolResult> {
    const url = this.buildListUrl('opportunities', args, {
      filter_account_id: 'filter[account][id]',
      filter_prospect_id: 'filter[prospect][id]',
    });
    return this.getJson(url);
  }

  private async getOpportunity(args: Record<string, unknown>): Promise<ToolResult> {
    return this.getJson(`${this.baseUrl}/opportunities/${encodeURIComponent(args.id as string)}`);
  }

  private async createOpportunity(args: Record<string, unknown>): Promise<ToolResult> {
    const attributes: Record<string, unknown> = {};
    if (args.name) attributes.name = args.name;
    if (args.amount !== undefined) attributes.amount = args.amount;
    if (args.closeDate) attributes.closeDate = args.closeDate;
    const body: Record<string, unknown> = { data: { type: 'opportunity', attributes } };
    const relationships: Record<string, unknown> = {};
    if (args.account_id) {
      relationships.account = { data: { type: 'account', id: args.account_id } };
    }
    if (args.prospect_id) {
      relationships.prospect = { data: { type: 'prospect', id: args.prospect_id } };
    }
    if (Object.keys(relationships).length > 0) {
      (body.data as Record<string, unknown>).relationships = relationships;
    }
    return this.postJson(`${this.baseUrl}/opportunities`, body);
  }

  private async listMailings(args: Record<string, unknown>): Promise<ToolResult> {
    const url = this.buildListUrl('mailings', args, {
      filter_prospect_id: 'filter[prospect][id]',
      filter_sequence_id: 'filter[sequence][id]',
    });
    return this.getJson(url);
  }

  private async getMailing(args: Record<string, unknown>): Promise<ToolResult> {
    return this.getJson(`${this.baseUrl}/mailings/${encodeURIComponent(args.id as string)}`);
  }

  private async listCalls(args: Record<string, unknown>): Promise<ToolResult> {
    const url = this.buildListUrl('calls', args, {
      filter_prospect_id: 'filter[prospect][id]',
      filter_user_id: 'filter[user][id]',
    });
    return this.getJson(url);
  }

  private async getCall(args: Record<string, unknown>): Promise<ToolResult> {
    return this.getJson(`${this.baseUrl}/calls/${encodeURIComponent(args.id as string)}`);
  }

  private async listTasks(args: Record<string, unknown>): Promise<ToolResult> {
    const url = this.buildListUrl('tasks', args, {
      filter_state: 'filter[state]',
      filter_owner_id: 'filter[owner][id]',
      filter_prospect_id: 'filter[prospect][id]',
    });
    return this.getJson(url);
  }

  private async getTask(args: Record<string, unknown>): Promise<ToolResult> {
    return this.getJson(`${this.baseUrl}/tasks/${encodeURIComponent(args.id as string)}`);
  }

  private async createTask(args: Record<string, unknown>): Promise<ToolResult> {
    const attributes: Record<string, unknown> = {};
    if (args.subject) attributes.subject = args.subject;
    if (args.taskType) attributes.taskType = args.taskType;
    if (args.dueAt) attributes.dueAt = args.dueAt;
    const body: Record<string, unknown> = { data: { type: 'task', attributes } };
    const relationships: Record<string, unknown> = {};
    if (args.owner_id) relationships.owner = { data: { type: 'user', id: args.owner_id } };
    if (args.prospect_id) relationships.prospect = { data: { type: 'prospect', id: args.prospect_id } };
    if (Object.keys(relationships).length > 0) {
      (body.data as Record<string, unknown>).relationships = relationships;
    }
    return this.postJson(`${this.baseUrl}/tasks`, body);
  }

  private async listUsers(args: Record<string, unknown>): Promise<ToolResult> {
    const url = this.buildListUrl('users', args, {
      filter_email: 'filter[email]',
    });
    return this.getJson(url);
  }

  private async getUser(args: Record<string, unknown>): Promise<ToolResult> {
    return this.getJson(`${this.baseUrl}/users/${encodeURIComponent(args.id as string)}`);
  }
}

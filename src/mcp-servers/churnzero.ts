/**
 * ChurnZero MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// No official ChurnZero MCP server was found on GitHub or npmjs.com.
//
// IMPORTANT — Two ChurnZero API surfaces exist:
//   1. REST/OData API (https://{instance}.us1app.churnzero.net/public/v1)
//      Auth: HTTP Basic (email:apiKey, base64-encoded). READ-ONLY — only GET endpoints documented.
//      Entities: Account, Contact, Event, EventType, Segment, SegmentColumnSet, Task,
//                TaskPriority, TaskStatus, UserAccount, Survey, Journey, JourneyMilestone,
//                JourneyMilestoneAchievement, JourneyMilestoneTask, JourneyInstance, JourneyProgress
//   2. Tracking/Write API (https://{instance}.us1app.churnzero.net/i)
//      Auth: appKey query parameter. Supports setAttribute (upsert), trackEvent, incrementAttribute,
//      deleteContact, deleteAccount. All operations use GET requests with query parameters.
//
// This adapter uses the OData REST API for reads and attempts REST-style POST/PATCH for writes.
// Write endpoints (create_account, update_account, create_contact, track_event, create_task)
// are NOT documented in the official OData API — the OData surface is read-only.
// The write operations may work against undocumented endpoints or require migration to the /i API.
//
// Base URL: https://{instance}.us1app.churnzero.net/public/v1
// Auth: HTTP Basic — base64(email:apiKey). API keys managed at Admin > API Keys.
// Docs: https://app.churnzero.net/developers
// Rate limits: Soft max and hard max per minute per instance (exact values not published).

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface ChurnZeroConfig {
  instance: string;
  email: string;
  apiKey: string;
  baseUrl?: string;
}

export class ChurnZeroMCPServer extends MCPAdapterBase {
  private readonly authHeader: string;
  private readonly baseUrl: string;

  constructor(config: ChurnZeroConfig) {
    super();
    // Basic auth: base64(email:apiKey) — confirmed via app.churnzero.net/developers
    const credentials = Buffer.from(`${config.email}:${config.apiKey}`).toString('base64');
    this.authHeader = `Basic ${credentials}`;
    this.baseUrl = config.baseUrl || `https://${config.instance}.us1app.churnzero.net/public/v1`;
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_accounts',
        description: 'List accounts (customers) in ChurnZero with OData filtering, sorting, field selection, and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            filter: {
              type: 'string',
              description: "OData $filter expression (e.g. Name eq 'Acme Corp' or IsActive eq true)",
            },
            select: {
              type: 'string',
              description: 'Comma-separated OData $select field list (e.g. Id,Name,ChurnScore)',
            },
            top: {
              type: 'number',
              description: 'OData $top — maximum number of records to return (default: 100, max: 1000)',
            },
            skip: {
              type: 'number',
              description: 'OData $skip — number of records to skip for pagination (default: 0)',
            },
            order_by: {
              type: 'string',
              description: 'OData $orderby expression (e.g. Name asc or ChurnScore desc)',
            },
          },
        },
      },
      {
        name: 'get_account',
        description: 'Get a specific account by its ChurnZero internal ID, returning all fields including health score and churn risk',
        inputSchema: {
          type: 'object',
          properties: {
            account_id: {
              type: 'string',
              description: 'ChurnZero internal account ID',
            },
          },
          required: ['account_id'],
        },
      },
      {
        name: 'create_account',
        description: 'Create a new account in ChurnZero with external ID, name, and optional attributes',
        inputSchema: {
          type: 'object',
          properties: {
            external_id: {
              type: 'string',
              description: 'Your external system ID for this account (must be unique)',
            },
            name: {
              type: 'string',
              description: 'Display name for the account',
            },
            owner_email: {
              type: 'string',
              description: 'Email of the ChurnZero user who owns this account',
            },
            mrr: {
              type: 'number',
              description: 'Monthly recurring revenue for the account',
            },
            renewal_date: {
              type: 'string',
              description: 'Contract renewal date in ISO 8601 format (e.g. 2026-12-31)',
            },
            attributes: {
              type: 'object',
              description: 'Additional custom attribute key-value pairs',
            },
          },
          required: ['external_id', 'name'],
        },
      },
      {
        name: 'update_account',
        description: 'Update attributes on an existing ChurnZero account by internal ID',
        inputSchema: {
          type: 'object',
          properties: {
            account_id: {
              type: 'string',
              description: 'ChurnZero internal account ID',
            },
            name: {
              type: 'string',
              description: 'New display name',
            },
            owner_email: {
              type: 'string',
              description: 'New owner email address',
            },
            mrr: {
              type: 'number',
              description: 'Updated monthly recurring revenue',
            },
            renewal_date: {
              type: 'string',
              description: 'Updated contract renewal date in ISO 8601 format',
            },
            attributes: {
              type: 'object',
              description: 'Custom attribute key-value pairs to update',
            },
          },
          required: ['account_id'],
        },
      },
      {
        name: 'list_contacts',
        description: 'List contacts in ChurnZero with OData filtering, sorting, field selection, and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            filter: {
              type: 'string',
              description: 'OData $filter expression (e.g. AccountId eq 12345 or Email eq \'user@example.com\')',
            },
            select: {
              type: 'string',
              description: 'Comma-separated OData $select field list',
            },
            top: {
              type: 'number',
              description: 'OData $top — maximum number of records to return (default: 100)',
            },
            skip: {
              type: 'number',
              description: 'OData $skip — number of records to skip for pagination',
            },
            order_by: {
              type: 'string',
              description: 'OData $orderby expression',
            },
          },
        },
      },
      {
        name: 'get_contact',
        description: 'Get a specific contact by their ChurnZero internal ID',
        inputSchema: {
          type: 'object',
          properties: {
            contact_id: {
              type: 'string',
              description: 'ChurnZero internal contact ID',
            },
          },
          required: ['contact_id'],
        },
      },
      {
        name: 'create_contact',
        description: 'Create a new contact in ChurnZero and associate them with an account',
        inputSchema: {
          type: 'object',
          properties: {
            external_id: {
              type: 'string',
              description: 'Your external system ID for this contact (must be unique)',
            },
            account_external_id: {
              type: 'string',
              description: 'External ID of the account to associate this contact with',
            },
            first_name: {
              type: 'string',
              description: 'Contact first name',
            },
            last_name: {
              type: 'string',
              description: 'Contact last name',
            },
            email: {
              type: 'string',
              description: 'Contact email address',
            },
            title: {
              type: 'string',
              description: 'Contact job title',
            },
            attributes: {
              type: 'object',
              description: 'Custom attribute key-value pairs',
            },
          },
          required: ['external_id', 'account_external_id', 'email'],
        },
      },
      {
        name: 'list_events',
        description: 'List events tracked in ChurnZero with OData filtering, sorting, and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            filter: {
              type: 'string',
              description: 'OData $filter expression (e.g. AccountId eq 12345 or EventName eq \'Login\')',
            },
            select: {
              type: 'string',
              description: 'Comma-separated OData $select field list',
            },
            top: {
              type: 'number',
              description: 'OData $top — maximum number of records to return (default: 100)',
            },
            skip: {
              type: 'number',
              description: 'OData $skip — number of records to skip for pagination',
            },
            order_by: {
              type: 'string',
              description: 'OData $orderby expression (e.g. EventDate desc)',
            },
          },
        },
      },
      {
        name: 'track_event',
        description: 'Track a custom product usage event for an account or contact in ChurnZero',
        inputSchema: {
          type: 'object',
          properties: {
            account_external_id: {
              type: 'string',
              description: 'Your external ID for the account (required)',
            },
            contact_external_id: {
              type: 'string',
              description: 'Your external ID for the contact (optional — omit for account-level events)',
            },
            event_name: {
              type: 'string',
              description: 'Name of the event to track (e.g. "Feature Used", "Report Exported")',
            },
            event_date: {
              type: 'string',
              description: 'ISO 8601 timestamp of the event (defaults to current time if omitted)',
            },
            attributes: {
              type: 'object',
              description: 'Key-value pairs of additional event attributes (string or numeric values)',
            },
          },
          required: ['account_external_id', 'event_name'],
        },
      },
      {
        name: 'list_tasks',
        description: 'List tasks assigned to CSMs in ChurnZero with OData filtering, sorting, and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            filter: {
              type: 'string',
              description: 'OData $filter expression (e.g. Status eq \'Open\' or AssigneeId eq 42)',
            },
            select: {
              type: 'string',
              description: 'Comma-separated OData $select field list',
            },
            top: {
              type: 'number',
              description: 'OData $top — maximum number of records to return (default: 100)',
            },
            skip: {
              type: 'number',
              description: 'OData $skip — number of records to skip for pagination',
            },
            order_by: {
              type: 'string',
              description: 'OData $orderby expression (e.g. DueDate asc)',
            },
          },
        },
      },
      {
        name: 'create_task',
        description: 'Create a new task in ChurnZero and assign it to a CSM for an account',
        inputSchema: {
          type: 'object',
          properties: {
            subject: {
              type: 'string',
              description: 'Task subject/title',
            },
            account_external_id: {
              type: 'string',
              description: 'External ID of the account this task is for',
            },
            assignee_email: {
              type: 'string',
              description: 'Email of the ChurnZero user to assign the task to',
            },
            due_date: {
              type: 'string',
              description: 'Task due date in ISO 8601 format',
            },
            priority: {
              type: 'string',
              description: 'Task priority: High | Medium | Low (default: Medium)',
            },
            notes: {
              type: 'string',
              description: 'Optional notes or description for the task',
            },
          },
          required: ['subject', 'account_external_id'],
        },
      },
      {
        name: 'list_segments',
        description: 'List account or contact segments defined in ChurnZero for health scoring and targeting',
        inputSchema: {
          type: 'object',
          properties: {
            entity_type: {
              type: 'string',
              description: 'Entity type to list segments for: Account | Contact (default: Account)',
            },
            top: {
              type: 'number',
              description: 'Maximum number of segments to return (default: 100)',
            },
            skip: {
              type: 'number',
              description: 'Number of segments to skip for pagination',
            },
          },
        },
      },
      {
        name: 'get_segment_members',
        description: 'Get the members (accounts or contacts) belonging to a specific ChurnZero segment',
        inputSchema: {
          type: 'object',
          properties: {
            segment_id: {
              type: 'string',
              description: 'ChurnZero segment ID',
            },
            top: {
              type: 'number',
              description: 'Maximum number of members to return (default: 100)',
            },
            skip: {
              type: 'number',
              description: 'Number of members to skip for pagination',
            },
          },
          required: ['segment_id'],
        },
      },
    ];
  }

  private buildODataParams(args: Record<string, unknown>): string {
    const params = new URLSearchParams();
    if (args.filter) params.set('$filter', args.filter as string);
    if (args.select) params.set('$select', args.select as string);
    if (args.top) params.set('$top', String(args.top));
    if (args.skip) params.set('$skip', String(args.skip));
    if (args.order_by) params.set('$orderby', args.order_by as string);
    return params.toString() ? '?' + params.toString() : '';
  }

  private get headers(): Record<string, string> {
    return {
      Authorization: this.authHeader,
      'Content-Type': 'application/json',
    };
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_accounts':
          return await this.listAccounts(args);
        case 'get_account':
          return await this.getAccount(args);
        case 'create_account':
          return await this.createAccount(args);
        case 'update_account':
          return await this.updateAccount(args);
        case 'list_contacts':
          return await this.listContacts(args);
        case 'get_contact':
          return await this.getContact(args);
        case 'create_contact':
          return await this.createContact(args);
        case 'list_events':
          return await this.listEvents(args);
        case 'track_event':
          return await this.trackEvent(args);
        case 'list_tasks':
          return await this.listTasks(args);
        case 'create_task':
          return await this.createTask(args);
        case 'list_segments':
          return await this.listSegments(args);
        case 'get_segment_members':
          return await this.getSegmentMembers(args);
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

  private async listAccounts(args: Record<string, unknown>): Promise<ToolResult> {
    const url = `${this.baseUrl}/Account${this.buildODataParams(args)}`;
    const response = await this.fetchWithRetry(url, { method: 'GET', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to list accounts: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async getAccount(args: Record<string, unknown>): Promise<ToolResult> {
    const account_id = args.account_id as string;
    if (!account_id) {
      return { content: [{ type: 'text', text: 'account_id is required' }], isError: true };
    }
    const url = `${this.baseUrl}/Account(${encodeURIComponent(account_id)})`;
    const response = await this.fetchWithRetry(url, { method: 'GET', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to get account: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async createAccount(args: Record<string, unknown>): Promise<ToolResult> {
    const external_id = args.external_id as string;
    const name = args.name as string;
    if (!external_id || !name) {
      return { content: [{ type: 'text', text: 'external_id and name are required' }], isError: true };
    }
    const payload: Record<string, unknown> = { externalId: external_id, name };
    if (args.owner_email) payload.ownerEmail = args.owner_email;
    if (typeof args.mrr === 'number') payload.mrr = args.mrr;
    if (args.renewal_date) payload.renewalDate = args.renewal_date;
    if (args.attributes) payload.attributes = args.attributes;

    const response = await this.fetchWithRetry(`${this.baseUrl}/Account`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to create account: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json().catch(() => ({ success: true }));
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async updateAccount(args: Record<string, unknown>): Promise<ToolResult> {
    const account_id = args.account_id as string;
    if (!account_id) {
      return { content: [{ type: 'text', text: 'account_id is required' }], isError: true };
    }
    const payload: Record<string, unknown> = {};
    if (args.name) payload.name = args.name;
    if (args.owner_email) payload.ownerEmail = args.owner_email;
    if (typeof args.mrr === 'number') payload.mrr = args.mrr;
    if (args.renewal_date) payload.renewalDate = args.renewal_date;
    if (args.attributes) payload.attributes = args.attributes;

    const url = `${this.baseUrl}/Account(${encodeURIComponent(account_id)})`;
    const response = await this.fetchWithRetry(url, {
      method: 'PATCH',
      headers: this.headers,
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to update account: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json().catch(() => ({ success: true }));
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async listContacts(args: Record<string, unknown>): Promise<ToolResult> {
    const url = `${this.baseUrl}/Contact${this.buildODataParams(args)}`;
    const response = await this.fetchWithRetry(url, { method: 'GET', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to list contacts: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async getContact(args: Record<string, unknown>): Promise<ToolResult> {
    const contact_id = args.contact_id as string;
    if (!contact_id) {
      return { content: [{ type: 'text', text: 'contact_id is required' }], isError: true };
    }
    const url = `${this.baseUrl}/Contact(${encodeURIComponent(contact_id)})`;
    const response = await this.fetchWithRetry(url, { method: 'GET', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to get contact: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async createContact(args: Record<string, unknown>): Promise<ToolResult> {
    const external_id = args.external_id as string;
    const account_external_id = args.account_external_id as string;
    const email = args.email as string;
    if (!external_id || !account_external_id || !email) {
      return { content: [{ type: 'text', text: 'external_id, account_external_id, and email are required' }], isError: true };
    }
    const payload: Record<string, unknown> = {
      externalId: external_id,
      accountExternalId: account_external_id,
      email,
    };
    if (args.first_name) payload.firstName = args.first_name;
    if (args.last_name) payload.lastName = args.last_name;
    if (args.title) payload.title = args.title;
    if (args.attributes) payload.attributes = args.attributes;

    const response = await this.fetchWithRetry(`${this.baseUrl}/Contact`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to create contact: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json().catch(() => ({ success: true }));
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async listEvents(args: Record<string, unknown>): Promise<ToolResult> {
    const url = `${this.baseUrl}/Event${this.buildODataParams(args)}`;
    const response = await this.fetchWithRetry(url, { method: 'GET', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to list events: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async trackEvent(args: Record<string, unknown>): Promise<ToolResult> {
    const account_external_id = args.account_external_id as string;
    const event_name = args.event_name as string;
    if (!account_external_id || !event_name) {
      return { content: [{ type: 'text', text: 'account_external_id and event_name are required' }], isError: true };
    }
    const payload: Record<string, unknown> = {
      accountExternalId: account_external_id,
      eventName: event_name,
    };
    if (args.contact_external_id) payload.contactExternalId = args.contact_external_id;
    if (args.event_date) payload.eventDate = args.event_date;
    if (args.attributes) payload.attributes = args.attributes;

    const response = await this.fetchWithRetry(`${this.baseUrl}/Event`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to track event: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json().catch(() => ({ success: true }));
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async listTasks(args: Record<string, unknown>): Promise<ToolResult> {
    const url = `${this.baseUrl}/Task${this.buildODataParams(args)}`;
    const response = await this.fetchWithRetry(url, { method: 'GET', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to list tasks: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async createTask(args: Record<string, unknown>): Promise<ToolResult> {
    const subject = args.subject as string;
    const account_external_id = args.account_external_id as string;
    if (!subject || !account_external_id) {
      return { content: [{ type: 'text', text: 'subject and account_external_id are required' }], isError: true };
    }
    const payload: Record<string, unknown> = {
      subject,
      accountExternalId: account_external_id,
    };
    if (args.assignee_email) payload.assigneeEmail = args.assignee_email;
    if (args.due_date) payload.dueDate = args.due_date;
    if (args.priority) payload.priority = args.priority;
    if (args.notes) payload.notes = args.notes;

    const response = await this.fetchWithRetry(`${this.baseUrl}/Task`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to create task: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json().catch(() => ({ success: true }));
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async listSegments(args: Record<string, unknown>): Promise<ToolResult> {
    const entity_type = (args.entity_type as string) ?? 'Account';
    const params = new URLSearchParams({ entityType: entity_type });
    if (args.top) params.set('$top', String(args.top));
    if (args.skip) params.set('$skip', String(args.skip));
    const url = `${this.baseUrl}/Segment?${params.toString()}`;
    const response = await this.fetchWithRetry(url, { method: 'GET', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to list segments: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async getSegmentMembers(args: Record<string, unknown>): Promise<ToolResult> {
    const segment_id = args.segment_id as string;
    if (!segment_id) {
      return { content: [{ type: 'text', text: 'segment_id is required' }], isError: true };
    }
    const params = new URLSearchParams();
    if (args.top) params.set('$top', String(args.top));
    if (args.skip) params.set('$skip', String(args.skip));
    const qs = params.toString() ? `?${params.toString()}` : '';
    const url = `${this.baseUrl}/Segment(${encodeURIComponent(segment_id)})/Members${qs}`;
    const response = await this.fetchWithRetry(url, { method: 'GET', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to get segment members: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  static catalog() {
    return {
      name: 'churnzero',
      displayName: 'Churn Zero',
      version: '1.0.0',
      category: 'crm' as const,
      keywords: ['churnzero'],
      toolNames: ['list_accounts', 'get_account', 'create_account', 'update_account', 'list_contacts', 'get_contact', 'create_contact', 'list_events', 'track_event', 'list_tasks', 'create_task', 'list_segments', 'get_segment_members'],
      description: 'Churn Zero adapter for the Epic AI Intelligence Platform',
      author: 'protectnil' as const,
    };
  }
}

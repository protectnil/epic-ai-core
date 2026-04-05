/**
 * Inboxroute MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// No official Inboxroute MCP server was found on GitHub.
//
// Base URL: https://api.inboxroute.com/api
// Auth: API key passed as Authorization header on every request
// Docs: https://www.inboxroute.com/email-api-documentation/
// Spec: https://api.apis.guru/v2/specs/inboxroute.com/0.9/swagger.json
// Rate limits: Not publicly documented; contact Inboxroute support for production limits.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface InboxrouteConfig {
  /** Inboxroute API key */
  apiKey: string;
  /** Optional base URL override (default: https://api.inboxroute.com/api) */
  baseUrl?: string;
}

export class InboxrouteMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: InboxrouteConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? 'https://api.inboxroute.com/api';
  }

  static catalog() {
    return {
      name: 'inboxroute',
      displayName: 'Inboxroute',
      version: '1.0.0',
      category: 'communication' as const,
      keywords: [
        'inboxroute', 'email', 'email-marketing', 'mailing-list', 'contact',
        'contacts', 'subscriber', 'subscription', 'opt-in', 'list', 'newsletter',
        'unsubscribe', 'double-optin', 'single-optin', 'email-api', 'marketing',
      ],
      toolNames: [
        'list_contacts',
        'update_contact',
        'delete_contact',
        'list_contact_lists',
        'create_contact_list',
        'update_contact_list',
        'delete_contact_list',
        'subscribe_to_list',
      ],
      description: 'Inboxroute email marketing API: manage contact lists, contacts, and subscriptions — create lists, update subscriber data, and handle opt-in subscriptions.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      // -- Contacts ---------------------------------------------------------
      {
        name: 'list_contacts',
        description: 'List contacts with optional filtering by contact list, pagination, and sorting',
        inputSchema: {
          type: 'object',
          properties: {
            listid: {
              type: 'string',
              description: 'Unique 16-character ID of the contact list to filter contacts by',
            },
            offset: {
              type: 'integer',
              description: 'Number of records to skip for pagination (default: 0)',
            },
            limit: {
              type: 'integer',
              description: 'Maximum number of contacts to return per page',
            },
            sort: {
              type: 'string',
              description: 'Property to sort by. Append "-" for descending order (e.g. "email" or "-email")',
            },
          },
        },
      },
      {
        name: 'update_contact',
        description: "Update a contact's email address, status, IP address, confirmation date, or custom fields",
        inputSchema: {
          type: 'object',
          properties: {
            contactid: {
              type: 'string',
              description: 'Unique 16-character ID of the contact to update',
            },
            email: {
              type: 'string',
              description: 'New email address for the contact',
            },
            status: {
              type: 'integer',
              description: 'Contact status: 1=Active, 2=Unconfirmed, 3=Unsubscribed, 4=Deleted, 5=Cleaned (hard bounce or spam complaint)',
              enum: [1, 2, 3, 4, 5],
            },
            confirmed: {
              type: 'string',
              description: 'Date-time (ISO 8601) when the subscriber confirmed list opt-in',
              format: 'date-time',
            },
            ip: {
              type: 'string',
              description: "Subscriber's IP address at the time of opt-in confirmation",
            },
            customfields: {
              type: 'object',
              description: 'Dictionary of custom field keys to their updated values',
              additionalProperties: true,
            },
          },
          required: ['contactid'],
        },
      },
      {
        name: 'delete_contact',
        description: 'Permanently delete a contact by their contact ID',
        inputSchema: {
          type: 'object',
          properties: {
            contactid: {
              type: 'string',
              description: 'Unique 16-character ID of the contact to delete',
            },
          },
          required: ['contactid'],
        },
      },
      // -- Contact Lists ----------------------------------------------------
      {
        name: 'list_contact_lists',
        description: 'List all contact lists in the account with optional pagination and sorting',
        inputSchema: {
          type: 'object',
          properties: {
            offset: {
              type: 'integer',
              description: 'Number of records to skip for pagination (default: 0)',
            },
            limit: {
              type: 'integer',
              description: 'Maximum number of contact lists to return per page',
            },
            sort: {
              type: 'string',
              description: 'Property to sort by. Append "-" for descending order (e.g. "name" or "-name")',
            },
          },
        },
      },
      {
        name: 'create_contact_list',
        description: 'Create a new contact list with a name, optional custom fields schema, and event customizations',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Name of the new contact list',
            },
            customfields: {
              type: 'array',
              description: 'Array of ContactCustomFieldSchema objects defining custom fields for this list',
              items: { type: 'object', additionalProperties: true },
            },
            eventcustomizations: {
              type: 'array',
              description: 'Array of ContactListEventCustomization objects for subscription event customizations',
              items: { type: 'object', additionalProperties: true },
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'update_contact_list',
        description: "Update an existing contact list's name, custom fields schema, or event customizations",
        inputSchema: {
          type: 'object',
          properties: {
            listid: {
              type: 'string',
              description: 'Unique 16-character ID of the contact list to update',
            },
            name: {
              type: 'string',
              description: 'New name for the contact list',
            },
            customfields: {
              type: 'array',
              description: 'Updated array of ContactCustomFieldSchema objects',
              items: { type: 'object', additionalProperties: true },
            },
            eventcustomizations: {
              type: 'array',
              description: 'Updated array of ContactListEventCustomization objects',
              items: { type: 'object', additionalProperties: true },
            },
          },
          required: ['listid'],
        },
      },
      {
        name: 'delete_contact_list',
        description: 'Permanently delete a contact list and all its contacts by list ID',
        inputSchema: {
          type: 'object',
          properties: {
            listid: {
              type: 'string',
              description: 'Unique 16-character ID of the contact list to delete',
            },
          },
          required: ['listid'],
        },
      },
      // -- Subscriptions ----------------------------------------------------
      {
        name: 'subscribe_to_list',
        description: 'Subscribe an email address to a contact list — supports both single opt-in (immediate confirmation) and double opt-in (email confirmation required)',
        inputSchema: {
          type: 'object',
          properties: {
            listid: {
              type: 'string',
              description: 'Unique 16-character ID of the contact list to subscribe to',
            },
            email: {
              type: 'string',
              description: 'Email address of the subscriber',
            },
            fullname: {
              type: 'string',
              description: 'Full name of the subscriber in "Last Name, First Name" format',
            },
            lang: {
              type: 'string',
              description: 'ISO 639-1 language code for subscriber communications (e.g. "en", "fr", "es")',
            },
            singleoptin: {
              type: 'boolean',
              description: 'If true, immediately activates subscription without sending a confirmation email. Requires confirmed date and ip.',
            },
            confirmed: {
              type: 'string',
              description: 'Date-time (ISO 8601) when the subscriber opted in — required when singleoptin is true',
              format: 'date-time',
            },
            ip: {
              type: 'string',
              description: "Subscriber's IP address at time of opt-in — required when singleoptin is true",
            },
          },
          required: ['listid', 'email'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_contacts':       return this.listContacts(args);
        case 'update_contact':      return this.updateContact(args);
        case 'delete_contact':      return this.deleteContact(args);
        case 'list_contact_lists':  return this.listContactLists(args);
        case 'create_contact_list': return this.createContactList(args);
        case 'update_contact_list': return this.updateContactList(args);
        case 'delete_contact_list': return this.deleteContactList(args);
        case 'subscribe_to_list':   return this.subscribeToList(args);
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

  // -- Helpers --------------------------------------------------------------

  private get authHeaders(): Record<string, string> {
    return {
      Authorization: this.apiKey,
      'Content-Type': 'application/json',
    };
  }

  private async doGet(path: string, params?: URLSearchParams): Promise<ToolResult> {
    const qs = params?.toString();
    const url = `${this.baseUrl}${path}${qs ? '?' + qs : ''}`;
    const response = await this.fetchWithRetry(url, { headers: this.authHeaders });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async doPost(path: string, body: unknown): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.authHeaders,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json().catch(() => ({}));
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async doPut(path: string, body: unknown): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'PUT',
      headers: this.authHeaders,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json().catch(() => ({}));
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async doDelete(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'DELETE',
      headers: this.authHeaders,
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: JSON.stringify({ success: true, status: response.status }) }], isError: false };
  }

  // -- Contacts -------------------------------------------------------------

  private async listContacts(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.listid) params.set('listid', args.listid as string);
    if (args.offset !== undefined) params.set('offset', String(args.offset));
    if (args.limit !== undefined) params.set('limit', String(args.limit));
    if (args.sort) params.set('sort', args.sort as string);
    return this.doGet('/contacts', params.toString() ? params : undefined);
  }

  private async updateContact(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.contactid) {
      return { content: [{ type: 'text', text: 'contactid is required' }], isError: true };
    }
    const body: Record<string, unknown> = {};
    if (args.email !== undefined) body['email'] = args.email;
    if (args.status !== undefined) body['status'] = args.status;
    if (args.confirmed !== undefined) body['confirmed'] = args.confirmed;
    if (args.ip !== undefined) body['ip'] = args.ip;
    if (args.customfields !== undefined) body['customfields'] = args.customfields;
    return this.doPut(`/contacts/${encodeURIComponent(args.contactid as string)}`, body);
  }

  private async deleteContact(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.contactid) {
      return { content: [{ type: 'text', text: 'contactid is required' }], isError: true };
    }
    return this.doDelete(`/contacts/${encodeURIComponent(args.contactid as string)}`);
  }

  // -- Contact Lists --------------------------------------------------------

  private async listContactLists(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.offset !== undefined) params.set('offset', String(args.offset));
    if (args.limit !== undefined) params.set('limit', String(args.limit));
    if (args.sort) params.set('sort', args.sort as string);
    return this.doGet('/contacts/lists', params.toString() ? params : undefined);
  }

  private async createContactList(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name) {
      return { content: [{ type: 'text', text: 'name is required' }], isError: true };
    }
    const body: Record<string, unknown> = { name: args.name };
    if (args.customfields !== undefined) body['customfields'] = args.customfields;
    if (args.eventcustomizations !== undefined) body['eventcustomizations'] = args.eventcustomizations;
    return this.doPost('/contacts/lists', body);
  }

  private async updateContactList(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.listid) {
      return { content: [{ type: 'text', text: 'listid is required' }], isError: true };
    }
    const body: Record<string, unknown> = {};
    if (args.name !== undefined) body['name'] = args.name;
    if (args.customfields !== undefined) body['customfields'] = args.customfields;
    if (args.eventcustomizations !== undefined) body['eventcustomizations'] = args.eventcustomizations;
    return this.doPut(`/contacts/lists/${encodeURIComponent(args.listid as string)}`, body);
  }

  private async deleteContactList(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.listid) {
      return { content: [{ type: 'text', text: 'listid is required' }], isError: true };
    }
    return this.doDelete(`/contacts/lists/${encodeURIComponent(args.listid as string)}`);
  }

  // -- Subscriptions --------------------------------------------------------

  private async subscribeToList(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.listid || !args.email) {
      return { content: [{ type: 'text', text: 'listid and email are required' }], isError: true };
    }
    const body: Record<string, unknown> = { email: args.email };
    if (args.fullname !== undefined) body['fullname'] = args.fullname;
    if (args.lang !== undefined) body['lang'] = args.lang;
    if (args.singleoptin !== undefined) body['singleoptin'] = args.singleoptin;
    if (args.confirmed !== undefined) body['confirmed'] = args.confirmed;
    if (args.ip !== undefined) body['ip'] = args.ip;
    return this.doPost(`/subscription/${encodeURIComponent(args.listid as string)}`, body);
  }
}

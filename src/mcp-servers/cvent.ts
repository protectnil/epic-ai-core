/**
 * Cvent MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// No official Cvent MCP server was found on GitHub or the MCP registry.
// Note: CData publishes a read-only community MCP (https://github.com/CDataSoftware/cvent-mcp-server-by-cdata)
//   but it is not official, read-only only, uses JDBC not REST, and does not meet the 4-criteria threshold.
//
// Base URL: https://api-platform.cvent.com/ea (US region)
//           https://api-platform-eur.cvent.com/ea (EU region)
// Auth: OAuth2 client credentials — POST /ea/oauth2/token with Basic auth (base64 clientId:clientSecret)
//       Token valid for 60 minutes.
// Docs: https://developers.cvent.com/docs/rest-api/overview
// Rate limits: Not publicly documented; contact Cvent for enterprise rate limit details.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface CventConfig {
  clientId: string;
  clientSecret: string;
  baseUrl?: string;
}

export class CventMCPServer extends MCPAdapterBase {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly baseUrl: string;
  private bearerToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(config: CventConfig) {
    super();
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.baseUrl = config.baseUrl || 'https://api-platform.cvent.com/ea';
  }

  static catalog() {
    return {
      name: 'cvent',
      displayName: 'Cvent',
      version: '1.0.0',
      category: 'misc',
      keywords: [
        'cvent', 'event management', 'event planning', 'conference', 'registration',
        'attendee', 'session', 'speaker', 'venue', 'event marketing', 'virtual event',
        'webinar', 'meeting management', 'hospitality',
      ],
      toolNames: [
        'list_events', 'get_event', 'create_event', 'update_event',
        'list_contacts', 'get_contact', 'create_contact',
        'list_registrations', 'get_registration', 'create_registration',
        'list_sessions', 'get_session', 'create_session',
        'list_admission_items', 'get_admission_item',
      ],
      description: 'Cvent event management: create and manage events, contacts, registrations, sessions, and admission items for conferences and meetings.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_events',
        description: 'List Cvent events with optional filters for status, date range, and type',
        inputSchema: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              description: 'Filter events by status: Active, Closed, Cancelled, Pending, Draft (default: no filter)',
            },
            start_date_after: {
              type: 'string',
              description: 'Return events starting on or after this date (ISO 8601: YYYY-MM-DDTHH:mm:ssZ)',
            },
            start_date_before: {
              type: 'string',
              description: 'Return events starting on or before this date (ISO 8601: YYYY-MM-DDTHH:mm:ssZ)',
            },
            token: {
              type: 'string',
              description: 'Pagination token from a previous response to retrieve the next page',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of events to return (default: 25, max: 200)',
            },
          },
        },
      },
      {
        name: 'get_event',
        description: 'Retrieve full details for a specific Cvent event by its event ID',
        inputSchema: {
          type: 'object',
          properties: {
            event_id: {
              type: 'string',
              description: 'Unique Cvent event ID (UUID format)',
            },
          },
          required: ['event_id'],
        },
      },
      {
        name: 'create_event',
        description: 'Create a new Cvent event with title, dates, location, and capacity settings',
        inputSchema: {
          type: 'object',
          properties: {
            title: {
              type: 'string',
              description: 'Display title of the event',
            },
            start_date: {
              type: 'string',
              description: 'Event start date and time in ISO 8601 format (e.g. 2026-06-15T09:00:00Z)',
            },
            end_date: {
              type: 'string',
              description: 'Event end date and time in ISO 8601 format (e.g. 2026-06-17T18:00:00Z)',
            },
            timezone: {
              type: 'string',
              description: 'IANA timezone identifier for the event (e.g. America/New_York, Europe/London)',
            },
            currency: {
              type: 'string',
              description: 'ISO 4217 currency code for registration fees (e.g. USD, EUR)',
            },
            capacity: {
              type: 'number',
              description: 'Maximum number of attendees for the event',
            },
            description: {
              type: 'string',
              description: 'Plain text or HTML description of the event',
            },
          },
          required: ['title', 'start_date', 'end_date', 'timezone'],
        },
      },
      {
        name: 'update_event',
        description: 'Update fields on an existing Cvent event such as title, capacity, dates, or status',
        inputSchema: {
          type: 'object',
          properties: {
            event_id: {
              type: 'string',
              description: 'Unique Cvent event ID to update',
            },
            title: {
              type: 'string',
              description: 'New title for the event',
            },
            start_date: {
              type: 'string',
              description: 'Updated start date and time in ISO 8601 format',
            },
            end_date: {
              type: 'string',
              description: 'Updated end date and time in ISO 8601 format',
            },
            capacity: {
              type: 'number',
              description: 'Updated maximum number of attendees',
            },
            status: {
              type: 'string',
              description: 'Updated event status: Active, Closed, Cancelled, Pending',
            },
          },
          required: ['event_id'],
        },
      },
      {
        name: 'list_contacts',
        description: 'List contacts in the Cvent address book with optional search by name or email',
        inputSchema: {
          type: 'object',
          properties: {
            email: {
              type: 'string',
              description: 'Filter contacts by exact email address',
            },
            first_name: {
              type: 'string',
              description: 'Filter contacts by first name (partial match)',
            },
            last_name: {
              type: 'string',
              description: 'Filter contacts by last name (partial match)',
            },
            token: {
              type: 'string',
              description: 'Pagination token from a previous response',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of contacts to return (default: 25, max: 200)',
            },
          },
        },
      },
      {
        name: 'get_contact',
        description: 'Retrieve full profile for a specific Cvent contact by their contact ID',
        inputSchema: {
          type: 'object',
          properties: {
            contact_id: {
              type: 'string',
              description: 'Unique Cvent contact ID (UUID format)',
            },
          },
          required: ['contact_id'],
        },
      },
      {
        name: 'create_contact',
        description: 'Create a new contact in the Cvent address book',
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
            email: {
              type: 'string',
              description: 'Contact email address (must be unique in the address book)',
            },
            company_name: {
              type: 'string',
              description: 'Contact company or organization name',
            },
            title: {
              type: 'string',
              description: 'Contact job title',
            },
            phone: {
              type: 'string',
              description: 'Contact phone number',
            },
          },
          required: ['first_name', 'last_name', 'email'],
        },
      },
      {
        name: 'list_registrations',
        description: 'List registrations for a Cvent event with optional filters for status and contact',
        inputSchema: {
          type: 'object',
          properties: {
            event_id: {
              type: 'string',
              description: 'Event ID to list registrations for',
            },
            status: {
              type: 'string',
              description: 'Filter by registration status: Accepted, Cancelled, Pending, Waitlisted (default: no filter)',
            },
            contact_id: {
              type: 'string',
              description: 'Filter registrations for a specific contact by their contact ID',
            },
            token: {
              type: 'string',
              description: 'Pagination token from a previous response',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of registrations to return (default: 25, max: 200)',
            },
          },
          required: ['event_id'],
        },
      },
      {
        name: 'get_registration',
        description: 'Retrieve full details for a specific Cvent event registration by registration ID',
        inputSchema: {
          type: 'object',
          properties: {
            event_id: {
              type: 'string',
              description: 'Event ID that the registration belongs to',
            },
            registration_id: {
              type: 'string',
              description: 'Unique registration ID (UUID format)',
            },
          },
          required: ['event_id', 'registration_id'],
        },
      },
      {
        name: 'create_registration',
        description: 'Register a contact for a Cvent event with a specified admission item',
        inputSchema: {
          type: 'object',
          properties: {
            event_id: {
              type: 'string',
              description: 'Event ID to register the contact for',
            },
            contact_id: {
              type: 'string',
              description: 'Contact ID to register (must already exist in the address book)',
            },
            admission_item_id: {
              type: 'string',
              description: 'Admission item ID to assign to the registration (use list_admission_items to find valid IDs)',
            },
          },
          required: ['event_id', 'contact_id', 'admission_item_id'],
        },
      },
      {
        name: 'list_sessions',
        description: 'List sessions within a Cvent event with optional filters for category and date',
        inputSchema: {
          type: 'object',
          properties: {
            event_id: {
              type: 'string',
              description: 'Event ID to list sessions for',
            },
            category: {
              type: 'string',
              description: 'Filter sessions by category name (e.g. "Keynote", "Workshop", "Breakout")',
            },
            token: {
              type: 'string',
              description: 'Pagination token from a previous response',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of sessions to return (default: 25, max: 200)',
            },
          },
          required: ['event_id'],
        },
      },
      {
        name: 'get_session',
        description: 'Retrieve full details for a specific session within a Cvent event',
        inputSchema: {
          type: 'object',
          properties: {
            event_id: {
              type: 'string',
              description: 'Event ID that contains the session',
            },
            session_id: {
              type: 'string',
              description: 'Unique session ID (UUID format)',
            },
          },
          required: ['event_id', 'session_id'],
        },
      },
      {
        name: 'create_session',
        description: 'Create a new session within a Cvent event with name, start/end times, and capacity',
        inputSchema: {
          type: 'object',
          properties: {
            event_id: {
              type: 'string',
              description: 'Event ID to create the session within',
            },
            name: {
              type: 'string',
              description: 'Display name of the session',
            },
            start_time: {
              type: 'string',
              description: 'Session start date and time in ISO 8601 format',
            },
            end_time: {
              type: 'string',
              description: 'Session end date and time in ISO 8601 format',
            },
            capacity: {
              type: 'number',
              description: 'Maximum number of attendees for this session',
            },
            description: {
              type: 'string',
              description: 'Description of the session content',
            },
            category: {
              type: 'string',
              description: 'Session category (e.g. "Keynote", "Workshop", "Breakout")',
            },
          },
          required: ['event_id', 'name', 'start_time', 'end_time'],
        },
      },
      {
        name: 'list_admission_items',
        description: 'List admission items (ticket types) available for a Cvent event, including pricing and capacity',
        inputSchema: {
          type: 'object',
          properties: {
            event_id: {
              type: 'string',
              description: 'Event ID to list admission items for',
            },
            token: {
              type: 'string',
              description: 'Pagination token from a previous response',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of admission items to return (default: 25, max: 200)',
            },
          },
          required: ['event_id'],
        },
      },
      {
        name: 'get_admission_item',
        description: 'Retrieve full details for a specific Cvent admission item by its ID',
        inputSchema: {
          type: 'object',
          properties: {
            event_id: {
              type: 'string',
              description: 'Event ID that the admission item belongs to',
            },
            admission_item_id: {
              type: 'string',
              description: 'Unique admission item ID (UUID format)',
            },
          },
          required: ['event_id', 'admission_item_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_events':
          return this.listEvents(args);
        case 'get_event':
          return this.getEvent(args);
        case 'create_event':
          return this.createEvent(args);
        case 'update_event':
          return this.updateEvent(args);
        case 'list_contacts':
          return this.listContacts(args);
        case 'get_contact':
          return this.getContact(args);
        case 'create_contact':
          return this.createContact(args);
        case 'list_registrations':
          return this.listRegistrations(args);
        case 'get_registration':
          return this.getRegistration(args);
        case 'create_registration':
          return this.createRegistration(args);
        case 'list_sessions':
          return this.listSessions(args);
        case 'get_session':
          return this.getSession(args);
        case 'create_session':
          return this.createSession(args);
        case 'list_admission_items':
          return this.listAdmissionItems(args);
        case 'get_admission_item':
          return this.getAdmissionItem(args);
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

  private async getOrRefreshToken(): Promise<string> {
    const now = Date.now();
    if (this.bearerToken && this.tokenExpiry > now) {
      return this.bearerToken;
    }
    const response = await this.fetchWithRetry(`${this.baseUrl}/oauth2/token`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${this.clientId}:${this.clientSecret}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });
    if (!response.ok) {
      throw new Error(`OAuth2 token request failed: ${response.status} ${response.statusText}`);
    }
    const data = await response.json() as { access_token: string; expires_in: number };
    this.bearerToken = data.access_token;
    this.tokenExpiry = now + (data.expires_in - 60) * 1000;
    return this.bearerToken;
  }


  private async apiGet(path: string, params?: Record<string, string>): Promise<ToolResult> {
    const token = await this.getOrRefreshToken();
    const qs = params && Object.keys(params).length > 0 ? '?' + new URLSearchParams(params).toString() : '';
    const url = `${this.baseUrl}${path}${qs}`;
    const response = await this.fetchWithRetry(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apiPost(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const token = await this.getOrRefreshToken();
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apiPatch(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const token = await this.getOrRefreshToken();
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listEvents(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (args.status) params.status = args.status as string;
    if (args.start_date_after) params['start_date[gte]'] = args.start_date_after as string;
    if (args.start_date_before) params['start_date[lte]'] = args.start_date_before as string;
    if (args.token) params.token = args.token as string;
    if (args.limit) params.limit = String(args.limit);
    return this.apiGet('/events', params);
  }

  private async getEvent(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.event_id) return { content: [{ type: 'text', text: 'event_id is required' }], isError: true };
    return this.apiGet(`/events/${encodeURIComponent(args.event_id as string)}`);
  }

  private async createEvent(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.title || !args.start_date || !args.end_date || !args.timezone) {
      return { content: [{ type: 'text', text: 'title, start_date, end_date, and timezone are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      title: args.title,
      startDate: args.start_date,
      endDate: args.end_date,
      timezone: args.timezone,
    };
    if (args.currency) body.currency = args.currency;
    if (args.capacity !== undefined) body.capacity = args.capacity;
    if (args.description) body.description = args.description;
    return this.apiPost('/events', body);
  }

  private async updateEvent(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.event_id) return { content: [{ type: 'text', text: 'event_id is required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.title) body.title = args.title;
    if (args.start_date) body.startDate = args.start_date;
    if (args.end_date) body.endDate = args.end_date;
    if (args.capacity !== undefined) body.capacity = args.capacity;
    if (args.status) body.status = args.status;
    return this.apiPatch(`/events/${encodeURIComponent(args.event_id as string)}`, body);
  }

  private async listContacts(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (args.email) params.email = args.email as string;
    if (args.first_name) params.firstName = args.first_name as string;
    if (args.last_name) params.lastName = args.last_name as string;
    if (args.token) params.token = args.token as string;
    if (args.limit) params.limit = String(args.limit);
    return this.apiGet('/contacts', params);
  }

  private async getContact(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.contact_id) return { content: [{ type: 'text', text: 'contact_id is required' }], isError: true };
    return this.apiGet(`/contacts/${encodeURIComponent(args.contact_id as string)}`);
  }

  private async createContact(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.first_name || !args.last_name || !args.email) {
      return { content: [{ type: 'text', text: 'first_name, last_name, and email are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      firstName: args.first_name,
      lastName: args.last_name,
      email: args.email,
    };
    if (args.company_name) body.companyName = args.company_name;
    if (args.title) body.title = args.title;
    if (args.phone) body.phone = args.phone;
    return this.apiPost('/contacts', body);
  }

  private async listRegistrations(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.event_id) return { content: [{ type: 'text', text: 'event_id is required' }], isError: true };
    const params: Record<string, string> = {};
    if (args.status) params.status = args.status as string;
    if (args.contact_id) params.contactId = args.contact_id as string;
    if (args.token) params.token = args.token as string;
    if (args.limit) params.limit = String(args.limit);
    return this.apiGet(`/events/${encodeURIComponent(args.event_id as string)}/registrations`, params);
  }

  private async getRegistration(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.event_id || !args.registration_id) {
      return { content: [{ type: 'text', text: 'event_id and registration_id are required' }], isError: true };
    }
    return this.apiGet(`/events/${encodeURIComponent(args.event_id as string)}/registrations/${encodeURIComponent(args.registration_id as string)}`);
  }

  private async createRegistration(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.event_id || !args.contact_id || !args.admission_item_id) {
      return { content: [{ type: 'text', text: 'event_id, contact_id, and admission_item_id are required' }], isError: true };
    }
    return this.apiPost(`/events/${encodeURIComponent(args.event_id as string)}/registrations`, {
      contactId: args.contact_id,
      admissionItemId: args.admission_item_id,
    });
  }

  private async listSessions(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.event_id) return { content: [{ type: 'text', text: 'event_id is required' }], isError: true };
    const params: Record<string, string> = {};
    if (args.category) params.category = args.category as string;
    if (args.token) params.token = args.token as string;
    if (args.limit) params.limit = String(args.limit);
    return this.apiGet(`/events/${encodeURIComponent(args.event_id as string)}/sessions`, params);
  }

  private async getSession(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.event_id || !args.session_id) {
      return { content: [{ type: 'text', text: 'event_id and session_id are required' }], isError: true };
    }
    return this.apiGet(`/events/${encodeURIComponent(args.event_id as string)}/sessions/${encodeURIComponent(args.session_id as string)}`);
  }

  private async createSession(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.event_id || !args.name || !args.start_time || !args.end_time) {
      return { content: [{ type: 'text', text: 'event_id, name, start_time, and end_time are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      name: args.name,
      startTime: args.start_time,
      endTime: args.end_time,
    };
    if (args.capacity !== undefined) body.capacity = args.capacity;
    if (args.description) body.description = args.description;
    if (args.category) body.category = args.category;
    return this.apiPost(`/events/${encodeURIComponent(args.event_id as string)}/sessions`, body);
  }

  private async listAdmissionItems(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.event_id) return { content: [{ type: 'text', text: 'event_id is required' }], isError: true };
    const params: Record<string, string> = {};
    if (args.token) params.token = args.token as string;
    if (args.limit) params.limit = String(args.limit);
    return this.apiGet(`/events/${encodeURIComponent(args.event_id as string)}/admission-items`, params);
  }

  private async getAdmissionItem(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.event_id || !args.admission_item_id) {
      return { content: [{ type: 'text', text: 'event_id and admission_item_id are required' }], isError: true };
    }
    return this.apiGet(`/events/${encodeURIComponent(args.event_id as string)}/admission-items/${encodeURIComponent(args.admission_item_id as string)}`);
  }
}

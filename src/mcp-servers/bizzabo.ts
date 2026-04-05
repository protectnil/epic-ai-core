/**
 * Bizzabo MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28 — No official Bizzabo MCP server exists.
// The Bizzabo GitHub organization (https://github.com/bizzabo) contains no MCP server.
// Our adapter covers: 15 tools. Vendor MCP covers: 0 tools (N/A — no official MCP).
// Recommendation: use-rest-api — this REST adapter is the primary integration.
//
// Base URL: https://api.bizzabo.com/v1
// Auth: OAuth 2.0 client credentials flow. Requires Client ID, Client Secret, and Account ID.
//       Token endpoint: https://auth.bizzabo.com/oauth2/token (JSON body, not form-encoded).
//       audience field required in token request. Token valid 24 hours. Bearer prefix on requests.
//       Also supports direct Bearer token (static API key) from Integrations → API tab.
// Docs: https://bizzabo.stoplight.io/docs/bizzabo-partner-apis
// Rate limits: Not publicly documented. Page-based pagination with size parameter (max 200/page).
//              Contact Bizzabo support for enterprise rate limit allocations.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface BizzaboConfig {
  apiToken?: string;
  clientId?: string;
  clientSecret?: string;
  accountId?: string;
  baseUrl?: string;
}

export class BizzaboMCPServer extends MCPAdapterBase {
  private readonly apiToken: string | undefined;
  private readonly clientId: string | undefined;
  private readonly clientSecret: string | undefined;
  private readonly accountId: string | undefined;
  private readonly baseUrl: string;

  private bearerToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(config: BizzaboConfig) {
    super();
    this.apiToken = config.apiToken;
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.accountId = config.accountId;
    this.baseUrl = config.baseUrl || 'https://api.bizzabo.com/v1';

    if (!config.apiToken && !(config.clientId && config.clientSecret)) {
      throw new Error('Bizzabo adapter requires either apiToken or clientId + clientSecret');
    }
  }

  static catalog() {
    return {
      name: 'bizzabo',
      displayName: 'Bizzabo',
      version: '1.0.0',
      category: 'misc',
      keywords: [
        'bizzabo', 'event', 'events', 'conference', 'b2b event', 'registration',
        'attendee', 'speaker', 'session', 'agenda', 'sponsor', 'exhibitor',
        'contact', 'ticket', 'event management', 'event platform',
      ],
      toolNames: [
        'list_events',
        'get_event',
        'list_registrations',
        'get_registration',
        'list_contacts',
        'get_contact',
        'create_contact',
        'update_contact',
        'list_sessions',
        'get_session',
        'list_speakers',
        'get_speaker',
        'list_agenda_items',
        'list_sponsors',
        'list_tickets',
      ],
      description: 'Bizzabo B2B event management: list and inspect events, manage registrations and contacts, browse sessions, speakers, sponsors, and tickets across your event portfolio.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_events',
        description: 'List all events in the Bizzabo account (live, upcoming, past, and draft) with optional status filter and pagination.',
        inputSchema: {
          type: 'object',
          properties: {
            size: {
              type: 'number',
              description: 'Number of events to return per page (default: 20, max: 100).',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 0, zero-indexed).',
            },
            status: {
              type: 'string',
              description: 'Filter events by status: live, future, past, draft.',
            },
          },
        },
      },
      {
        name: 'get_event',
        description: 'Get full details of a single Bizzabo event by its event ID, including dates, location, capacity, and branding.',
        inputSchema: {
          type: 'object',
          properties: {
            event_id: {
              type: 'string',
              description: 'Bizzabo event ID.',
            },
          },
          required: ['event_id'],
        },
      },
      {
        name: 'list_registrations',
        description: 'List registrations for a specific event, including attendee details, ticket types, and registration status.',
        inputSchema: {
          type: 'object',
          properties: {
            event_id: {
              type: 'string',
              description: 'Event ID to list registrations for.',
            },
            size: {
              type: 'number',
              description: 'Number of registrations per page (default: 20, max: 100).',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 0, zero-indexed).',
            },
            status: {
              type: 'string',
              description: 'Filter by registration status: approved, pending, cancelled, declined.',
            },
          },
          required: ['event_id'],
        },
      },
      {
        name: 'get_registration',
        description: 'Get full details of a single registration by event ID and registration ID, including attendee profile and ticket assignment.',
        inputSchema: {
          type: 'object',
          properties: {
            event_id: {
              type: 'string',
              description: 'Event ID containing the registration.',
            },
            registration_id: {
              type: 'string',
              description: 'Registration ID to retrieve.',
            },
          },
          required: ['event_id', 'registration_id'],
        },
      },
      {
        name: 'list_contacts',
        description: 'List contacts in the Bizzabo account — includes ticket holders, speakers, exhibitors, and non-ticket attendees for an event.',
        inputSchema: {
          type: 'object',
          properties: {
            event_id: {
              type: 'string',
              description: 'Event ID to list contacts for.',
            },
            size: {
              type: 'number',
              description: 'Number of contacts per page (default: 20, max: 100).',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 0, zero-indexed).',
            },
          },
          required: ['event_id'],
        },
      },
      {
        name: 'get_contact',
        description: 'Get profile details for a single Bizzabo contact by event ID and contact ID.',
        inputSchema: {
          type: 'object',
          properties: {
            event_id: {
              type: 'string',
              description: 'Event ID the contact is associated with.',
            },
            contact_id: {
              type: 'string',
              description: 'Contact ID to retrieve.',
            },
          },
          required: ['event_id', 'contact_id'],
        },
      },
      {
        name: 'create_contact',
        description: 'Create a new contact in a Bizzabo event with name, email, and optional profile details.',
        inputSchema: {
          type: 'object',
          properties: {
            event_id: {
              type: 'string',
              description: 'Event ID to create the contact in.',
            },
            email: {
              type: 'string',
              description: 'Contact email address.',
            },
            first_name: {
              type: 'string',
              description: 'Contact first name.',
            },
            last_name: {
              type: 'string',
              description: 'Contact last name.',
            },
            company: {
              type: 'string',
              description: 'Contact company or organization.',
            },
            title: {
              type: 'string',
              description: 'Contact job title.',
            },
            phone: {
              type: 'string',
              description: 'Contact phone number.',
            },
          },
          required: ['event_id', 'email', 'first_name', 'last_name'],
        },
      },
      {
        name: 'update_contact',
        description: 'Update profile fields on an existing Bizzabo contact by event ID and contact ID. Send only the fields to change.',
        inputSchema: {
          type: 'object',
          properties: {
            event_id: {
              type: 'string',
              description: 'Event ID the contact belongs to.',
            },
            contact_id: {
              type: 'string',
              description: 'Contact ID to update.',
            },
            email: {
              type: 'string',
              description: 'Updated email address.',
            },
            first_name: {
              type: 'string',
              description: 'Updated first name.',
            },
            last_name: {
              type: 'string',
              description: 'Updated last name.',
            },
            company: {
              type: 'string',
              description: 'Updated company name.',
            },
            title: {
              type: 'string',
              description: 'Updated job title.',
            },
            phone: {
              type: 'string',
              description: 'Updated phone number.',
            },
          },
          required: ['event_id', 'contact_id'],
        },
      },
      {
        name: 'list_sessions',
        description: 'List all sessions (agenda items with speakers) for a Bizzabo event, including time, location, and track information.',
        inputSchema: {
          type: 'object',
          properties: {
            event_id: {
              type: 'string',
              description: 'Event ID to list sessions for.',
            },
            size: {
              type: 'number',
              description: 'Number of sessions per page (default: 20, max: 100).',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 0, zero-indexed).',
            },
          },
          required: ['event_id'],
        },
      },
      {
        name: 'get_session',
        description: 'Get full details of a specific event session by event ID and session ID, including speaker list and abstract.',
        inputSchema: {
          type: 'object',
          properties: {
            event_id: {
              type: 'string',
              description: 'Event ID containing the session.',
            },
            session_id: {
              type: 'string',
              description: 'Session ID to retrieve.',
            },
          },
          required: ['event_id', 'session_id'],
        },
      },
      {
        name: 'list_speakers',
        description: 'List all speakers for a Bizzabo event with their name, company, title, and assigned sessions.',
        inputSchema: {
          type: 'object',
          properties: {
            event_id: {
              type: 'string',
              description: 'Event ID to list speakers for.',
            },
            size: {
              type: 'number',
              description: 'Number of speakers per page (default: 20, max: 100).',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 0, zero-indexed).',
            },
          },
          required: ['event_id'],
        },
      },
      {
        name: 'get_speaker',
        description: 'Get detailed profile for a specific event speaker by event ID and speaker ID.',
        inputSchema: {
          type: 'object',
          properties: {
            event_id: {
              type: 'string',
              description: 'Event ID the speaker belongs to.',
            },
            speaker_id: {
              type: 'string',
              description: 'Speaker ID to retrieve.',
            },
          },
          required: ['event_id', 'speaker_id'],
        },
      },
      {
        name: 'list_agenda_items',
        description: 'List all agenda items (sessions, breaks, networking) for a Bizzabo event ordered by start time.',
        inputSchema: {
          type: 'object',
          properties: {
            event_id: {
              type: 'string',
              description: 'Event ID to retrieve the agenda for.',
            },
            size: {
              type: 'number',
              description: 'Number of agenda items per page (default: 50, max: 200).',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 0, zero-indexed).',
            },
          },
          required: ['event_id'],
        },
      },
      {
        name: 'list_sponsors',
        description: 'List all sponsors and exhibitors for a Bizzabo event, including tier level and contact details.',
        inputSchema: {
          type: 'object',
          properties: {
            event_id: {
              type: 'string',
              description: 'Event ID to list sponsors for.',
            },
            size: {
              type: 'number',
              description: 'Number of sponsors per page (default: 20, max: 100).',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 0, zero-indexed).',
            },
          },
          required: ['event_id'],
        },
      },
      {
        name: 'list_tickets',
        description: 'List ticket types available for a Bizzabo event, including pricing, availability, and sale period.',
        inputSchema: {
          type: 'object',
          properties: {
            event_id: {
              type: 'string',
              description: 'Event ID to list ticket types for.',
            },
            size: {
              type: 'number',
              description: 'Number of ticket types per page (default: 20, max: 100).',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 0, zero-indexed).',
            },
          },
          required: ['event_id'],
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
        case 'list_registrations':
          return this.listRegistrations(args);
        case 'get_registration':
          return this.getRegistration(args);
        case 'list_contacts':
          return this.listContacts(args);
        case 'get_contact':
          return this.getContact(args);
        case 'create_contact':
          return this.createContact(args);
        case 'update_contact':
          return this.updateContact(args);
        case 'list_sessions':
          return this.listSessions(args);
        case 'get_session':
          return this.getSession(args);
        case 'list_speakers':
          return this.listSpeakers(args);
        case 'get_speaker':
          return this.getSpeaker(args);
        case 'list_agenda_items':
          return this.listAgendaItems(args);
        case 'list_sponsors':
          return this.listSponsors(args);
        case 'list_tickets':
          return this.listTickets(args);
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

  // ── OAuth2 token management ───────────────────────────────────────────────

  private async getOrRefreshToken(): Promise<string> {
    // If a static API token is configured, use it directly
    if (this.apiToken) return this.apiToken;

    const now = Date.now();
    if (this.bearerToken && this.tokenExpiry > now) {
      return this.bearerToken;
    }

    if (!this.clientId || !this.clientSecret) {
      throw new Error('Bizzabo OAuth2 requires clientId and clientSecret');
    }

    const tokenUrl = 'https://auth.bizzabo.com/oauth2/token';
    const bodyObj: Record<string, unknown> = {
      grant_type: 'client_credentials',
      client_id: this.clientId,
      client_secret: this.clientSecret,
      audience: 'https://api.bizzabo.com',
    };
    if (this.accountId) bodyObj['account_id'] = Number(this.accountId);

    const response = await this.fetchWithRetry(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bodyObj),
    });

    if (!response.ok) {
      throw new Error(`Bizzabo OAuth2 token request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as { access_token: string; expires_in: number };
    this.bearerToken = data.access_token;
    this.tokenExpiry = now + (data.expires_in - 60) * 1000;
    return this.bearerToken;
  }

  // ── HTTP helpers ──────────────────────────────────────────────────────────

  private async bzGet(path: string, params?: Record<string, string>): Promise<ToolResult> {
    const token = await this.getOrRefreshToken();
    const qs = params && Object.keys(params).length > 0
      ? '?' + new URLSearchParams(params).toString()
      : '';
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}${qs}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });
    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      return { content: [{ type: 'text', text: `API error ${response.status} ${response.statusText}: ${errText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async bzPost(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const token = await this.getOrRefreshToken();
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      return { content: [{ type: 'text', text: `API error ${response.status} ${response.statusText}: ${errText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async bzPut(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const token = await this.getOrRefreshToken();
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      return { content: [{ type: 'text', text: `API error ${response.status} ${response.statusText}: ${errText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private buildPaginationParams(args: Record<string, unknown>, defaultSize = 20): Record<string, string> {
    return {
      size: String((args.size as number) || defaultSize),
      page: String((args.page as number) || 0),
    };
  }

  // ── Tool implementations ──────────────────────────────────────────────────

  private async listEvents(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.buildPaginationParams(args);
    if (args.status) params['status'] = args.status as string;
    return this.bzGet('/events', params);
  }

  private async getEvent(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.event_id) return { content: [{ type: 'text', text: 'event_id is required' }], isError: true };
    return this.bzGet(`/events/${encodeURIComponent(args.event_id as string)}`);
  }

  private async listRegistrations(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.event_id) return { content: [{ type: 'text', text: 'event_id is required' }], isError: true };
    const params = this.buildPaginationParams(args);
    if (args.status) params['status'] = args.status as string;
    return this.bzGet(`/events/${encodeURIComponent(args.event_id as string)}/registrations`, params);
  }

  private async getRegistration(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.event_id || !args.registration_id) {
      return { content: [{ type: 'text', text: 'event_id and registration_id are required' }], isError: true };
    }
    return this.bzGet(`/events/${encodeURIComponent(args.event_id as string)}/registrations/${encodeURIComponent(args.registration_id as string)}`);
  }

  private async listContacts(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.event_id) return { content: [{ type: 'text', text: 'event_id is required' }], isError: true };
    const params = this.buildPaginationParams(args);
    return this.bzGet(`/events/${encodeURIComponent(args.event_id as string)}/contacts`, params);
  }

  private async getContact(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.event_id || !args.contact_id) {
      return { content: [{ type: 'text', text: 'event_id and contact_id are required' }], isError: true };
    }
    return this.bzGet(`/events/${encodeURIComponent(args.event_id as string)}/contacts/${encodeURIComponent(args.contact_id as string)}`);
  }

  private async createContact(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.event_id || !args.email || !args.first_name || !args.last_name) {
      return { content: [{ type: 'text', text: 'event_id, email, first_name, and last_name are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      email: args.email,
      firstName: args.first_name,
      lastName: args.last_name,
    };
    if (args.company) body['company'] = args.company;
    if (args.title) body['jobTitle'] = args.title;
    if (args.phone) body['phone'] = args.phone;
    return this.bzPost(`/events/${encodeURIComponent(args.event_id as string)}/contacts`, body);
  }

  private async updateContact(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.event_id || !args.contact_id) {
      return { content: [{ type: 'text', text: 'event_id and contact_id are required' }], isError: true };
    }
    const body: Record<string, unknown> = {};
    if (args.email) body['email'] = args.email;
    if (args.first_name) body['firstName'] = args.first_name;
    if (args.last_name) body['lastName'] = args.last_name;
    if (args.company) body['company'] = args.company;
    if (args.title) body['jobTitle'] = args.title;
    if (args.phone) body['phone'] = args.phone;
    return this.bzPut(`/events/${encodeURIComponent(args.event_id as string)}/contacts/${encodeURIComponent(args.contact_id as string)}`, body);
  }

  private async listSessions(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.event_id) return { content: [{ type: 'text', text: 'event_id is required' }], isError: true };
    const params = this.buildPaginationParams(args);
    return this.bzGet(`/events/${encodeURIComponent(args.event_id as string)}/sessions`, params);
  }

  private async getSession(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.event_id || !args.session_id) {
      return { content: [{ type: 'text', text: 'event_id and session_id are required' }], isError: true };
    }
    return this.bzGet(`/events/${encodeURIComponent(args.event_id as string)}/sessions/${encodeURIComponent(args.session_id as string)}`);
  }

  private async listSpeakers(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.event_id) return { content: [{ type: 'text', text: 'event_id is required' }], isError: true };
    const params = this.buildPaginationParams(args);
    return this.bzGet(`/events/${encodeURIComponent(args.event_id as string)}/speakers`, params);
  }

  private async getSpeaker(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.event_id || !args.speaker_id) {
      return { content: [{ type: 'text', text: 'event_id and speaker_id are required' }], isError: true };
    }
    return this.bzGet(`/events/${encodeURIComponent(args.event_id as string)}/speakers/${encodeURIComponent(args.speaker_id as string)}`);
  }

  private async listAgendaItems(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.event_id) return { content: [{ type: 'text', text: 'event_id is required' }], isError: true };
    const params = this.buildPaginationParams(args, 50);
    return this.bzGet(`/events/${encodeURIComponent(args.event_id as string)}/agenda`, params);
  }

  private async listSponsors(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.event_id) return { content: [{ type: 'text', text: 'event_id is required' }], isError: true };
    const params = this.buildPaginationParams(args);
    return this.bzGet(`/events/${encodeURIComponent(args.event_id as string)}/partners`, params);
  }

  private async listTickets(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.event_id) return { content: [{ type: 'text', text: 'event_id is required' }], isError: true };
    const params = this.buildPaginationParams(args);
    return this.bzGet(`/events/${encodeURIComponent(args.event_id as string)}/tickets`, params);
  }
}

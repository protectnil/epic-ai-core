/**
 * Hopin (RingCentral Events) MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// No official Hopin / RingCentral Events MCP server was found on GitHub or the developer portal.
// Hopin was acquired by RingCentral; the product is now branded RingCentral Events.
// The external API is documented at https://developer.events.ringcentral.com/external-api
// Our adapter covers: 18 tools. Vendor MCP covers: 0 tools (no official MCP).
// Recommendation: use-rest-api
//
// Base URL: https://api.hopin.com (legacy Hopin base; RingCentral Events API also at
//   https://api.events.ringcentral.com — both active as of 2026-03-28)
// Auth: OAuth2 Authorization Code flow (redirect_uri + code exchange) per official docs at
//   https://developer.events.ringcentral.com/external-api/guides/authentication
//   NOTE: The official docs document Authorization Code flow only, NOT client_credentials.
//   Client credentials (server-to-server) is NOT documented. This adapter implements
//   client_credentials as a pragmatic server-to-server approach; confirm with RingCentral Events
//   support whether a machine-to-machine (client_credentials) grant is available before production use.
//   Token URL: https://api.hopin.com/v1/oauth/token (legacy endpoint; unconfirmed in current docs)
// Docs: https://developer.events.ringcentral.com/external-api/reference
// Rate limits: Not publicly documented; implement exponential backoff on 429 responses

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface HopinConfig {
  clientId: string;
  clientSecret: string;
  baseUrl?: string;
  tokenUrl?: string;
}

export class HopinMCPServer extends MCPAdapterBase {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly baseUrl: string;
  private readonly tokenUrl: string;
  private bearerToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(config: HopinConfig) {
    super();
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.baseUrl = config.baseUrl ?? 'https://api.hopin.com';
    this.tokenUrl = config.tokenUrl ?? 'https://api.hopin.com/v1/oauth/token';
  }

  static catalog() {
    return {
      name: 'hopin',
      displayName: 'Hopin (RingCentral Events)',
      version: '1.0.0',
      category: 'collaboration' as const,
      keywords: [
        'hopin', 'ringcentral events', 'virtual event', 'hybrid event', 'event',
        'registration', 'attendee', 'session', 'speaker', 'booth', 'networking',
        'webinar', 'conference', 'live stream',
      ],
      toolNames: [
        'list_events',
        'get_event',
        'create_event',
        'update_event',
        'list_registrations',
        'get_registration',
        'create_registration',
        'cancel_registration',
        'list_sessions',
        'get_session',
        'create_session',
        'update_session',
        'list_speakers',
        'get_speaker',
        'create_speaker',
        'list_attendees',
        'get_attendee',
        'list_booths',
      ],
      description: 'Hopin / RingCentral Events: manage virtual and hybrid events, registrations, sessions, speakers, attendees, and booths.',
      author: 'protectnil' as const,
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_events',
        description: 'List virtual and hybrid events in the organization with optional status filter and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              description: 'Filter by event status: draft, published, live, ended, cancelled (default: all)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of events to return (default: 20, max: 100)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
          },
        },
      },
      {
        name: 'get_event',
        description: 'Get full details for a specific Hopin event including dates, capacity, and settings',
        inputSchema: {
          type: 'object',
          properties: {
            event_id: {
              type: 'string',
              description: 'Unique identifier of the event',
            },
          },
          required: ['event_id'],
        },
      },
      {
        name: 'create_event',
        description: 'Create a new virtual or hybrid event with name, dates, capacity, and registration settings',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Display name for the event',
            },
            start_at: {
              type: 'string',
              description: 'Event start time in ISO 8601 format (e.g. 2026-06-01T09:00:00Z)',
            },
            end_at: {
              type: 'string',
              description: 'Event end time in ISO 8601 format (e.g. 2026-06-01T17:00:00Z)',
            },
            description: {
              type: 'string',
              description: 'Public description of the event shown on the registration page',
            },
            capacity: {
              type: 'number',
              description: 'Maximum number of attendees (default: unlimited)',
            },
            registration_open: {
              type: 'boolean',
              description: 'Whether registration is open immediately (default: false)',
            },
          },
          required: ['name', 'start_at', 'end_at'],
        },
      },
      {
        name: 'update_event',
        description: 'Update an existing Hopin event name, description, dates, or capacity',
        inputSchema: {
          type: 'object',
          properties: {
            event_id: {
              type: 'string',
              description: 'Unique identifier of the event to update',
            },
            name: {
              type: 'string',
              description: 'New display name for the event',
            },
            start_at: {
              type: 'string',
              description: 'New start time in ISO 8601 format',
            },
            end_at: {
              type: 'string',
              description: 'New end time in ISO 8601 format',
            },
            description: {
              type: 'string',
              description: 'New event description',
            },
            capacity: {
              type: 'number',
              description: 'New maximum attendee capacity',
            },
          },
          required: ['event_id'],
        },
      },
      {
        name: 'list_registrations',
        description: 'List registrations for a Hopin event with optional status and date range filters',
        inputSchema: {
          type: 'object',
          properties: {
            event_id: {
              type: 'string',
              description: 'Unique identifier of the event',
            },
            status: {
              type: 'string',
              description: 'Filter by registration status: confirmed, cancelled, waitlisted (default: all)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of registrations to return (default: 50, max: 200)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
          },
          required: ['event_id'],
        },
      },
      {
        name: 'get_registration',
        description: 'Get details for a specific event registration including attendee info and ticket type',
        inputSchema: {
          type: 'object',
          properties: {
            event_id: {
              type: 'string',
              description: 'Unique identifier of the event',
            },
            registration_id: {
              type: 'string',
              description: 'Unique identifier of the registration',
            },
          },
          required: ['event_id', 'registration_id'],
        },
      },
      {
        name: 'create_registration',
        description: 'Register an attendee for a Hopin event with name and email',
        inputSchema: {
          type: 'object',
          properties: {
            event_id: {
              type: 'string',
              description: 'Unique identifier of the event',
            },
            email: {
              type: 'string',
              description: 'Email address of the attendee to register',
            },
            first_name: {
              type: 'string',
              description: 'First name of the attendee',
            },
            last_name: {
              type: 'string',
              description: 'Last name of the attendee',
            },
            ticket_type_id: {
              type: 'string',
              description: 'ID of the ticket type to assign (uses default ticket if omitted)',
            },
          },
          required: ['event_id', 'email', 'first_name', 'last_name'],
        },
      },
      {
        name: 'cancel_registration',
        description: 'Cancel a specific attendee registration for a Hopin event by patching its status to cancelled',
        inputSchema: {
          type: 'object',
          properties: {
            event_id: {
              type: 'string',
              description: 'Unique identifier of the event',
            },
            registration_id: {
              type: 'string',
              description: 'Unique identifier of the registration to cancel',
            },
          },
          required: ['event_id', 'registration_id'],
        },
      },
      {
        name: 'list_sessions',
        description: 'List sessions (stages, workshops, breakouts) for a Hopin event with optional type filter',
        inputSchema: {
          type: 'object',
          properties: {
            event_id: {
              type: 'string',
              description: 'Unique identifier of the event',
            },
            session_type: {
              type: 'string',
              description: 'Filter by session type: stage, session, networking (default: all)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of sessions to return (default: 50)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
          },
          required: ['event_id'],
        },
      },
      {
        name: 'get_session',
        description: 'Get details for a specific session including schedule, capacity, and assigned speakers',
        inputSchema: {
          type: 'object',
          properties: {
            event_id: {
              type: 'string',
              description: 'Unique identifier of the event',
            },
            session_id: {
              type: 'string',
              description: 'Unique identifier of the session',
            },
          },
          required: ['event_id', 'session_id'],
        },
      },
      {
        name: 'create_session',
        description: 'Create a new session (stage, workshop, breakout) within a Hopin event',
        inputSchema: {
          type: 'object',
          properties: {
            event_id: {
              type: 'string',
              description: 'Unique identifier of the event to add the session to',
            },
            name: {
              type: 'string',
              description: 'Display name for the session',
            },
            start_at: {
              type: 'string',
              description: 'Session start time in ISO 8601 format',
            },
            end_at: {
              type: 'string',
              description: 'Session end time in ISO 8601 format',
            },
            description: {
              type: 'string',
              description: 'Description of the session content',
            },
            session_type: {
              type: 'string',
              description: 'Type of session: stage, session, networking (default: session)',
            },
            capacity: {
              type: 'number',
              description: 'Maximum attendees for this session',
            },
          },
          required: ['event_id', 'name', 'start_at', 'end_at'],
        },
      },
      {
        name: 'update_session',
        description: 'Update an existing session name, schedule, description, or capacity',
        inputSchema: {
          type: 'object',
          properties: {
            event_id: {
              type: 'string',
              description: 'Unique identifier of the event',
            },
            session_id: {
              type: 'string',
              description: 'Unique identifier of the session to update',
            },
            name: {
              type: 'string',
              description: 'New display name for the session',
            },
            start_at: {
              type: 'string',
              description: 'New start time in ISO 8601 format',
            },
            end_at: {
              type: 'string',
              description: 'New end time in ISO 8601 format',
            },
            description: {
              type: 'string',
              description: 'New session description',
            },
            capacity: {
              type: 'number',
              description: 'New maximum capacity',
            },
          },
          required: ['event_id', 'session_id'],
        },
      },
      {
        name: 'list_speakers',
        description: 'List speakers assigned to a Hopin event with their profile and session assignments',
        inputSchema: {
          type: 'object',
          properties: {
            event_id: {
              type: 'string',
              description: 'Unique identifier of the event',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of speakers to return (default: 50)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
          },
          required: ['event_id'],
        },
      },
      {
        name: 'get_speaker',
        description: 'Get profile details for a specific event speaker including bio, photo, and session assignments',
        inputSchema: {
          type: 'object',
          properties: {
            event_id: {
              type: 'string',
              description: 'Unique identifier of the event',
            },
            speaker_id: {
              type: 'string',
              description: 'Unique identifier of the speaker',
            },
          },
          required: ['event_id', 'speaker_id'],
        },
      },
      {
        name: 'create_speaker',
        description: 'Add a speaker to a Hopin event with name, bio, and optional session assignment',
        inputSchema: {
          type: 'object',
          properties: {
            event_id: {
              type: 'string',
              description: 'Unique identifier of the event',
            },
            name: {
              type: 'string',
              description: 'Full name of the speaker',
            },
            email: {
              type: 'string',
              description: 'Email address of the speaker',
            },
            bio: {
              type: 'string',
              description: 'Speaker biography shown on the event page',
            },
            headline: {
              type: 'string',
              description: 'Speaker title or company (e.g. "CEO at Acme Corp")',
            },
            session_id: {
              type: 'string',
              description: 'Session ID to assign the speaker to (optional)',
            },
          },
          required: ['event_id', 'name', 'email'],
        },
      },
      {
        name: 'list_attendees',
        description: 'List attendees who have joined a live or ended Hopin event with check-in status',
        inputSchema: {
          type: 'object',
          properties: {
            event_id: {
              type: 'string',
              description: 'Unique identifier of the event',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of attendees to return (default: 50, max: 200)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
          },
          required: ['event_id'],
        },
      },
      {
        name: 'get_attendee',
        description: 'Get details for a specific event attendee including check-in time and sessions attended',
        inputSchema: {
          type: 'object',
          properties: {
            event_id: {
              type: 'string',
              description: 'Unique identifier of the event',
            },
            attendee_id: {
              type: 'string',
              description: 'Unique identifier of the attendee',
            },
          },
          required: ['event_id', 'attendee_id'],
        },
      },
      {
        name: 'list_booths',
        description: 'List sponsor and exhibitor booths for a Hopin event with contact and category info',
        inputSchema: {
          type: 'object',
          properties: {
            event_id: {
              type: 'string',
              description: 'Unique identifier of the event',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of booths to return (default: 50)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
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
        case 'list_events': return this.listEvents(args);
        case 'get_event': return this.getEvent(args);
        case 'create_event': return this.createEvent(args);
        case 'update_event': return this.updateEvent(args);
        case 'list_registrations': return this.listRegistrations(args);
        case 'get_registration': return this.getRegistration(args);
        case 'create_registration': return this.createRegistration(args);
        case 'cancel_registration': return this.cancelRegistration(args);
        case 'list_sessions': return this.listSessions(args);
        case 'get_session': return this.getSession(args);
        case 'create_session': return this.createSession(args);
        case 'update_session': return this.updateSession(args);
        case 'list_speakers': return this.listSpeakers(args);
        case 'get_speaker': return this.getSpeaker(args);
        case 'create_speaker': return this.createSpeaker(args);
        case 'list_attendees': return this.listAttendees(args);
        case 'get_attendee': return this.getAttendee(args);
        case 'list_booths': return this.listBooths(args);
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
    if (this.bearerToken && this.tokenExpiry > now) return this.bearerToken;
    const response = await this.fetchWithRetry(this.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: this.clientId,
        client_secret: this.clientSecret,
      }).toString(),
    });
    if (!response.ok) throw new Error(`OAuth2 token request failed: ${response.status} ${response.statusText}`);
    const data = await response.json() as { access_token: string; expires_in: number };
    this.bearerToken = data.access_token;
    this.tokenExpiry = now + (data.expires_in - 60) * 1000;
    return this.bearerToken;
  }

  private async apiGet(path: string, params?: Record<string, string>): Promise<ToolResult> {
    const token = await this.getOrRefreshToken();
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}${qs}`, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
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
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
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
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listEvents(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      limit: String((args.limit as number) ?? 20),
      page: String((args.page as number) ?? 1),
    };
    if (args.status) params.status = args.status as string;
    return this.apiGet('/v1/events', params);
  }

  private async getEvent(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.event_id) return { content: [{ type: 'text', text: 'event_id is required' }], isError: true };
    return this.apiGet(`/v1/events/${encodeURIComponent(args.event_id as string)}`);
  }

  private async createEvent(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name || !args.start_at || !args.end_at) {
      return { content: [{ type: 'text', text: 'name, start_at, and end_at are required' }], isError: true };
    }
    const body: Record<string, unknown> = { name: args.name, start_at: args.start_at, end_at: args.end_at };
    if (args.description) body.description = args.description;
    if (args.capacity) body.capacity = args.capacity;
    if (typeof args.registration_open === 'boolean') body.registration_open = args.registration_open;
    return this.apiPost('/v1/events', body);
  }

  private async updateEvent(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.event_id) return { content: [{ type: 'text', text: 'event_id is required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.name) body.name = args.name;
    if (args.start_at) body.start_at = args.start_at;
    if (args.end_at) body.end_at = args.end_at;
    if (args.description) body.description = args.description;
    if (args.capacity) body.capacity = args.capacity;
    return this.apiPatch(`/v1/events/${encodeURIComponent(args.event_id as string)}`, body);
  }

  private async listRegistrations(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.event_id) return { content: [{ type: 'text', text: 'event_id is required' }], isError: true };
    const params: Record<string, string> = {
      limit: String((args.limit as number) ?? 50),
      page: String((args.page as number) ?? 1),
    };
    if (args.status) params.status = args.status as string;
    return this.apiGet(`/v1/events/${encodeURIComponent(args.event_id as string)}/registrations`, params);
  }

  private async getRegistration(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.event_id || !args.registration_id) {
      return { content: [{ type: 'text', text: 'event_id and registration_id are required' }], isError: true };
    }
    return this.apiGet(`/v1/events/${encodeURIComponent(args.event_id as string)}/registrations/${encodeURIComponent(args.registration_id as string)}`);
  }

  private async createRegistration(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.event_id || !args.email || !args.first_name || !args.last_name) {
      return { content: [{ type: 'text', text: 'event_id, email, first_name, and last_name are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      email: args.email,
      first_name: args.first_name,
      last_name: args.last_name,
    };
    if (args.ticket_type_id) body.ticket_type_id = args.ticket_type_id;
    return this.apiPost(`/v1/events/${encodeURIComponent(args.event_id as string)}/registrations`, body);
  }

  private async cancelRegistration(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.event_id || !args.registration_id) {
      return { content: [{ type: 'text', text: 'event_id and registration_id are required' }], isError: true };
    }
    // The RingCentral Events API uses PATCH to update registrations (including cancellation).
    // There is no DELETE endpoint for individual registrations per the official API reference.
    return this.apiPatch(
      `/v1/events/${encodeURIComponent(args.event_id as string)}/registrations/${encodeURIComponent(args.registration_id as string)}`,
      { data: { type: 'registration', attributes: { status: 'cancelled' } } },
    );
  }

  private async listSessions(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.event_id) return { content: [{ type: 'text', text: 'event_id is required' }], isError: true };
    const params: Record<string, string> = {
      limit: String((args.limit as number) ?? 50),
      page: String((args.page as number) ?? 1),
    };
    if (args.session_type) params.session_type = args.session_type as string;
    return this.apiGet(`/v1/events/${encodeURIComponent(args.event_id as string)}/sessions`, params);
  }

  private async getSession(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.event_id || !args.session_id) {
      return { content: [{ type: 'text', text: 'event_id and session_id are required' }], isError: true };
    }
    return this.apiGet(`/v1/events/${encodeURIComponent(args.event_id as string)}/sessions/${encodeURIComponent(args.session_id as string)}`);
  }

  private async createSession(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.event_id || !args.name || !args.start_at || !args.end_at) {
      return { content: [{ type: 'text', text: 'event_id, name, start_at, and end_at are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      name: args.name,
      start_at: args.start_at,
      end_at: args.end_at,
      session_type: args.session_type ?? 'session',
    };
    if (args.description) body.description = args.description;
    if (args.capacity) body.capacity = args.capacity;
    return this.apiPost(`/v1/events/${encodeURIComponent(args.event_id as string)}/sessions`, body);
  }

  private async updateSession(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.event_id || !args.session_id) {
      return { content: [{ type: 'text', text: 'event_id and session_id are required' }], isError: true };
    }
    const body: Record<string, unknown> = {};
    if (args.name) body.name = args.name;
    if (args.start_at) body.start_at = args.start_at;
    if (args.end_at) body.end_at = args.end_at;
    if (args.description) body.description = args.description;
    if (args.capacity) body.capacity = args.capacity;
    return this.apiPatch(`/v1/events/${encodeURIComponent(args.event_id as string)}/sessions/${encodeURIComponent(args.session_id as string)}`, body);
  }

  private async listSpeakers(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.event_id) return { content: [{ type: 'text', text: 'event_id is required' }], isError: true };
    const params: Record<string, string> = {
      limit: String((args.limit as number) ?? 50),
      page: String((args.page as number) ?? 1),
    };
    return this.apiGet(`/v1/events/${encodeURIComponent(args.event_id as string)}/speakers`, params);
  }

  private async getSpeaker(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.event_id || !args.speaker_id) {
      return { content: [{ type: 'text', text: 'event_id and speaker_id are required' }], isError: true };
    }
    return this.apiGet(`/v1/events/${encodeURIComponent(args.event_id as string)}/speakers/${encodeURIComponent(args.speaker_id as string)}`);
  }

  private async createSpeaker(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.event_id || !args.name || !args.email) {
      return { content: [{ type: 'text', text: 'event_id, name, and email are required' }], isError: true };
    }
    const body: Record<string, unknown> = { name: args.name, email: args.email };
    if (args.bio) body.bio = args.bio;
    if (args.headline) body.headline = args.headline;
    if (args.session_id) body.session_id = args.session_id;
    return this.apiPost(`/v1/events/${encodeURIComponent(args.event_id as string)}/speakers`, body);
  }

  private async listAttendees(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.event_id) return { content: [{ type: 'text', text: 'event_id is required' }], isError: true };
    const params: Record<string, string> = {
      limit: String((args.limit as number) ?? 50),
      page: String((args.page as number) ?? 1),
    };
    return this.apiGet(`/v1/events/${encodeURIComponent(args.event_id as string)}/attendees`, params);
  }

  private async getAttendee(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.event_id || !args.attendee_id) {
      return { content: [{ type: 'text', text: 'event_id and attendee_id are required' }], isError: true };
    }
    return this.apiGet(`/v1/events/${encodeURIComponent(args.event_id as string)}/attendees/${encodeURIComponent(args.attendee_id as string)}`);
  }

  private async listBooths(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.event_id) return { content: [{ type: 'text', text: 'event_id is required' }], isError: true };
    const params: Record<string, string> = {
      limit: String((args.limit as number) ?? 50),
      page: String((args.page as number) ?? 1),
    };
    return this.apiGet(`/v1/events/${encodeURIComponent(args.event_id as string)}/booths`, params);
  }
}

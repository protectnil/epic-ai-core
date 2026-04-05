/**
 * Google Calendar MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/googleworkspace/cli — transport: stdio, auth: OAuth2
// The official Google Workspace CLI (googleworkspace/cli, Apache-2.0, active 2026) exposes
// Google Calendar and other Workspace services via `gws mcp -s calendar` over stdio.
// It covers 100+ tools across all Workspace APIs, dynamically built from Google Discovery Service.
// Our adapter covers: 16 tools (calendars, events, ACL, free/busy, settings, colors). Vendor MCP covers: 100+ tools.
// Recommendation: Use the Workspace CLI MCP for full coverage. Use this adapter for
// air-gapped deployments or when only Calendar access is needed without full Workspace setup.
//
// Base URL: https://www.googleapis.com/calendar/v3
// Auth: OAuth2 Bearer token (scope: https://www.googleapis.com/auth/calendar or .readonly)
// Docs: https://developers.google.com/workspace/calendar/api/v3/reference
// Rate limits: 1,000,000 quota units/day; per-user rate limiting applies.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface GoogleCalendarConfig {
  accessToken: string;
}

export class GoogleCalendarMCPServer extends MCPAdapterBase {
  private readonly baseUrl = 'https://www.googleapis.com/calendar/v3';
  private readonly token: string;

  constructor(config: GoogleCalendarConfig) {
    super();
    this.token = config.accessToken;
  }

  static catalog() {
    return {
      name: 'google-calendar',
      displayName: 'Google Calendar',
      version: '1.0.0',
      category: 'collaboration' as const,
      keywords: [
        'google', 'calendar', 'gcal', 'event', 'meeting', 'schedule', 'invite',
        'attendee', 'availability', 'free busy', 'workspace', 'reminder', 'recurrence',
      ],
      toolNames: [
        'list_calendars',
        'get_calendar',
        'create_calendar',
        'delete_calendar',
        'list_events',
        'get_event',
        'create_event',
        'update_event',
        'delete_event',
        'move_event',
        'query_free_busy',
        'list_acl_rules',
        'create_acl_rule',
        'delete_acl_rule',
        'get_settings',
        'get_colors',
      ],
      description: 'Google Calendar management: create, update, and delete events and calendars, manage ACL sharing rules, query free/busy availability, and access calendar settings.',
      author: 'protectnil' as const,
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_calendars',
        description: 'List all calendars in the authenticated user\'s calendar list, including shared calendars and their access roles.',
        inputSchema: {
          type: 'object',
          properties: {
            maxResults: {
              type: 'number',
              description: 'Maximum number of calendars to return (default: 100)',
            },
            pageToken: {
              type: 'string',
              description: 'Page token for pagination from a previous response',
            },
            showHidden: {
              type: 'boolean',
              description: 'Whether to include hidden calendars (default: false)',
            },
            showDeleted: {
              type: 'boolean',
              description: 'Whether to include deleted calendars (default: false)',
            },
          },
        },
      },
      {
        name: 'get_calendar',
        description: 'Get metadata for a specific Google Calendar by calendar ID, including time zone and description.',
        inputSchema: {
          type: 'object',
          properties: {
            calendarId: {
              type: 'string',
              description: 'Calendar ID (use "primary" for the authenticated user\'s primary calendar)',
            },
          },
          required: ['calendarId'],
        },
      },
      {
        name: 'create_calendar',
        description: 'Create a new secondary Google Calendar for the authenticated user.',
        inputSchema: {
          type: 'object',
          properties: {
            summary: {
              type: 'string',
              description: 'Calendar title (required)',
            },
            description: {
              type: 'string',
              description: 'Optional calendar description',
            },
            timeZone: {
              type: 'string',
              description: 'Calendar time zone in IANA format (e.g., "America/New_York"). Defaults to the user\'s account time zone.',
            },
          },
          required: ['summary'],
        },
      },
      {
        name: 'delete_calendar',
        description: 'Delete a secondary Google Calendar. Cannot delete the primary calendar.',
        inputSchema: {
          type: 'object',
          properties: {
            calendarId: {
              type: 'string',
              description: 'Calendar ID to delete (must be a secondary calendar, not "primary")',
            },
          },
          required: ['calendarId'],
        },
      },
      {
        name: 'list_events',
        description: 'List events from a Google Calendar with optional time range, search query, and pagination.',
        inputSchema: {
          type: 'object',
          properties: {
            calendarId: {
              type: 'string',
              description: 'Calendar ID (default: "primary")',
            },
            timeMin: {
              type: 'string',
              description: 'RFC3339 lower bound for event start time (e.g., "2026-03-24T00:00:00Z")',
            },
            timeMax: {
              type: 'string',
              description: 'RFC3339 upper bound for event start time (e.g., "2026-04-24T00:00:00Z")',
            },
            maxResults: {
              type: 'number',
              description: 'Maximum number of events to return (default: 25, max: 2500)',
            },
            pageToken: {
              type: 'string',
              description: 'Page token for pagination from a previous response',
            },
            q: {
              type: 'string',
              description: 'Free-text search query to filter events by title, description, or location',
            },
            showDeleted: {
              type: 'boolean',
              description: 'Whether to include deleted events (default: false)',
            },
            singleEvents: {
              type: 'boolean',
              description: 'Whether to expand recurring events into instances (default: true)',
            },
            orderBy: {
              type: 'string',
              description: 'Sort order: startTime (default, requires singleEvents=true) or updated',
            },
          },
        },
      },
      {
        name: 'get_event',
        description: 'Get full details for a specific Google Calendar event by calendar ID and event ID.',
        inputSchema: {
          type: 'object',
          properties: {
            calendarId: {
              type: 'string',
              description: 'Calendar ID (default: "primary")',
            },
            eventId: {
              type: 'string',
              description: 'Event ID (from list_events)',
            },
          },
          required: ['eventId'],
        },
      },
      {
        name: 'create_event',
        description: 'Create a new event on a Google Calendar with title, time, location, description, and attendees.',
        inputSchema: {
          type: 'object',
          properties: {
            calendarId: {
              type: 'string',
              description: 'Calendar ID to create the event on (default: "primary")',
            },
            summary: {
              type: 'string',
              description: 'Event title (required)',
            },
            start: {
              type: 'string',
              description: 'Event start time as RFC3339 timestamp (e.g., "2026-04-01T10:00:00-07:00")',
            },
            end: {
              type: 'string',
              description: 'Event end time as RFC3339 timestamp (e.g., "2026-04-01T11:00:00-07:00")',
            },
            description: {
              type: 'string',
              description: 'Event description or agenda',
            },
            location: {
              type: 'string',
              description: 'Event location (address, room name, or conference URL)',
            },
            attendees: {
              type: 'array',
              items: { type: 'string' },
              description: 'List of attendee email addresses to invite',
            },
            sendNotifications: {
              type: 'boolean',
              description: 'Whether to send invitation emails to attendees (default: true)',
            },
            recurrence: {
              type: 'array',
              items: { type: 'string' },
              description: 'RRULE recurrence rules (e.g., ["RRULE:FREQ=WEEKLY;BYDAY=MO"])',
            },
          },
          required: ['summary', 'start', 'end'],
        },
      },
      {
        name: 'update_event',
        description: 'Update an existing Google Calendar event using patch semantics — only supplied fields are changed.',
        inputSchema: {
          type: 'object',
          properties: {
            calendarId: {
              type: 'string',
              description: 'Calendar ID (default: "primary")',
            },
            eventId: {
              type: 'string',
              description: 'Event ID to update (required)',
            },
            summary: {
              type: 'string',
              description: 'New event title',
            },
            start: {
              type: 'string',
              description: 'New start time as RFC3339 timestamp',
            },
            end: {
              type: 'string',
              description: 'New end time as RFC3339 timestamp',
            },
            description: {
              type: 'string',
              description: 'New event description',
            },
            location: {
              type: 'string',
              description: 'New event location',
            },
            attendees: {
              type: 'array',
              items: { type: 'string' },
              description: 'Replacement list of attendee email addresses',
            },
            sendNotifications: {
              type: 'boolean',
              description: 'Whether to send update notifications to attendees (default: true)',
            },
          },
          required: ['eventId'],
        },
      },
      {
        name: 'delete_event',
        description: 'Delete a Google Calendar event. Use sendNotifications to control whether cancellation emails are sent.',
        inputSchema: {
          type: 'object',
          properties: {
            calendarId: {
              type: 'string',
              description: 'Calendar ID (default: "primary")',
            },
            eventId: {
              type: 'string',
              description: 'Event ID to delete (required)',
            },
            sendNotifications: {
              type: 'boolean',
              description: 'Whether to send cancellation notifications to attendees (default: true)',
            },
          },
          required: ['eventId'],
        },
      },
      {
        name: 'move_event',
        description: 'Move a Google Calendar event from one calendar to another.',
        inputSchema: {
          type: 'object',
          properties: {
            calendarId: {
              type: 'string',
              description: 'Source calendar ID containing the event (default: "primary")',
            },
            eventId: {
              type: 'string',
              description: 'Event ID to move (required)',
            },
            destinationCalendarId: {
              type: 'string',
              description: 'Destination calendar ID to move the event to (required)',
            },
          },
          required: ['eventId', 'destinationCalendarId'],
        },
      },
      {
        name: 'query_free_busy',
        description: 'Query free/busy availability for a set of calendars over a time range to find open meeting slots.',
        inputSchema: {
          type: 'object',
          properties: {
            timeMin: {
              type: 'string',
              description: 'RFC3339 start of the query interval (required, e.g., "2026-03-24T08:00:00Z")',
            },
            timeMax: {
              type: 'string',
              description: 'RFC3339 end of the query interval (required)',
            },
            calendarIds: {
              type: 'array',
              items: { type: 'string' },
              description: 'List of calendar IDs to query (required, e.g., ["primary", "user@example.com"])',
            },
            timeZone: {
              type: 'string',
              description: 'IANA time zone for the response (default: UTC)',
            },
          },
          required: ['timeMin', 'timeMax', 'calendarIds'],
        },
      },
      {
        name: 'list_acl_rules',
        description: 'List access control rules for a Google Calendar, showing who has access and at what permission level.',
        inputSchema: {
          type: 'object',
          properties: {
            calendarId: {
              type: 'string',
              description: 'Calendar ID to list ACL rules for (required)',
            },
            pageToken: {
              type: 'string',
              description: 'Page token for pagination',
            },
          },
          required: ['calendarId'],
        },
      },
      {
        name: 'create_acl_rule',
        description: 'Share a Google Calendar with a user or domain by creating an access control rule.',
        inputSchema: {
          type: 'object',
          properties: {
            calendarId: {
              type: 'string',
              description: 'Calendar ID to add the ACL rule to (required)',
            },
            role: {
              type: 'string',
              description: 'Access role: none, freeBusyReader, reader, writer, or owner (required)',
            },
            scopeType: {
              type: 'string',
              description: 'Scope type: default (public), user, group, or domain (required)',
            },
            scopeValue: {
              type: 'string',
              description: 'Scope value: email address for user/group, domain name for domain type',
            },
            sendNotifications: {
              type: 'boolean',
              description: 'Whether to send sharing notification email (default: true)',
            },
          },
          required: ['calendarId', 'role', 'scopeType'],
        },
      },
      {
        name: 'delete_acl_rule',
        description: 'Remove an access control rule from a Google Calendar, revoking the specified user\'s or domain\'s access.',
        inputSchema: {
          type: 'object',
          properties: {
            calendarId: {
              type: 'string',
              description: 'Calendar ID containing the ACL rule (required)',
            },
            ruleId: {
              type: 'string',
              description: 'ACL rule ID to delete (from list_acl_rules)',
            },
          },
          required: ['calendarId', 'ruleId'],
        },
      },
      {
        name: 'get_settings',
        description: 'Get the authenticated user\'s Google Calendar settings, including time zone, date format, and notification preferences.',
        inputSchema: {
          type: 'object',
          properties: {
            setting: {
              type: 'string',
              description: 'Specific setting name to retrieve (omit to list all settings). Examples: timezone, dateFieldOrder, defaultEventLength.',
            },
          },
        },
      },
      {
        name: 'get_colors',
        description: 'Get the color definitions available for Google Calendar events and calendars.',
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
        case 'list_calendars':
          return await this.listCalendars(args);
        case 'get_calendar':
          return await this.getCalendar(args);
        case 'create_calendar':
          return await this.createCalendar(args);
        case 'delete_calendar':
          return await this.deleteCalendar(args);
        case 'list_events':
          return await this.listEvents(args);
        case 'get_event':
          return await this.getEvent(args);
        case 'create_event':
          return await this.createEvent(args);
        case 'update_event':
          return await this.updateEvent(args);
        case 'delete_event':
          return await this.deleteEvent(args);
        case 'move_event':
          return await this.moveEvent(args);
        case 'query_free_busy':
          return await this.queryFreeBusy(args);
        case 'list_acl_rules':
          return await this.listAclRules(args);
        case 'create_acl_rule':
          return await this.createAclRule(args);
        case 'delete_acl_rule':
          return await this.deleteAclRule(args);
        case 'get_settings':
          return await this.getSettings(args);
        case 'get_colors':
          return await this.getColors();
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

  private get headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.token}`,
      'Content-Type': 'application/json',
    };
  }

  private async listCalendars(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    params.set('maxResults', String((args.maxResults as number) ?? 100));
    if (args.pageToken) params.set('pageToken', args.pageToken as string);
    if (args.showHidden) params.set('showHidden', 'true');
    if (args.showDeleted) params.set('showDeleted', 'true');
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/users/me/calendarList?${params}`,
      { headers: this.headers },
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Google Calendar API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getCalendar(args: Record<string, unknown>): Promise<ToolResult> {
    const calendarId = args.calendarId as string;
    if (!calendarId) {
      return { content: [{ type: 'text', text: 'calendarId is required' }], isError: true };
    }
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/calendars/${encodeURIComponent(calendarId)}`,
      { headers: this.headers },
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Google Calendar API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async createCalendar(args: Record<string, unknown>): Promise<ToolResult> {
    const summary = args.summary as string;
    if (!summary) {
      return { content: [{ type: 'text', text: 'summary is required' }], isError: true };
    }
    const body: Record<string, unknown> = { summary };
    if (args.description) body.description = args.description;
    if (args.timeZone) body.timeZone = args.timeZone;
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/calendars`,
      { method: 'POST', headers: this.headers, body: JSON.stringify(body) },
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Google Calendar API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async deleteCalendar(args: Record<string, unknown>): Promise<ToolResult> {
    const calendarId = args.calendarId as string;
    if (!calendarId) {
      return { content: [{ type: 'text', text: 'calendarId is required' }], isError: true };
    }
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/calendars/${encodeURIComponent(calendarId)}`,
      { method: 'DELETE', headers: this.headers },
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Google Calendar API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: JSON.stringify({ deleted: true, calendarId }) }], isError: false };
  }

  private async listEvents(args: Record<string, unknown>): Promise<ToolResult> {
    const calendarId = (args.calendarId as string) ?? 'primary';
    const params = new URLSearchParams();
    params.set('maxResults', String((args.maxResults as number) ?? 25));
    params.set('singleEvents', String(args.singleEvents !== false));
    if (args.orderBy) {
      params.set('orderBy', args.orderBy as string);
    } else if (args.singleEvents !== false) {
      params.set('orderBy', 'startTime');
    }
    if (args.timeMin) params.set('timeMin', args.timeMin as string);
    if (args.timeMax) params.set('timeMax', args.timeMax as string);
    if (args.pageToken) params.set('pageToken', args.pageToken as string);
    if (args.q) params.set('q', args.q as string);
    if (args.showDeleted) params.set('showDeleted', 'true');
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/calendars/${encodeURIComponent(calendarId)}/events?${params}`,
      { headers: this.headers },
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Google Calendar API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getEvent(args: Record<string, unknown>): Promise<ToolResult> {
    const calendarId = (args.calendarId as string) ?? 'primary';
    const eventId = args.eventId as string;
    if (!eventId) {
      return { content: [{ type: 'text', text: 'eventId is required' }], isError: true };
    }
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
      { headers: this.headers },
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Google Calendar API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async createEvent(args: Record<string, unknown>): Promise<ToolResult> {
    const calendarId = (args.calendarId as string) ?? 'primary';
    if (!args.summary || !args.start || !args.end) {
      return { content: [{ type: 'text', text: 'summary, start, and end are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      summary: args.summary,
      start: { dateTime: args.start, timeZone: 'UTC' },
      end: { dateTime: args.end, timeZone: 'UTC' },
    };
    if (args.description) body.description = args.description;
    if (args.location) body.location = args.location;
    if (args.attendees) body.attendees = (args.attendees as string[]).map(email => ({ email }));
    if (args.recurrence) body.recurrence = args.recurrence;
    const params = new URLSearchParams();
    params.set('sendNotifications', String(args.sendNotifications !== false));
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/calendars/${encodeURIComponent(calendarId)}/events?${params}`,
      { method: 'POST', headers: this.headers, body: JSON.stringify(body) },
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Google Calendar API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async updateEvent(args: Record<string, unknown>): Promise<ToolResult> {
    const calendarId = (args.calendarId as string) ?? 'primary';
    const eventId = args.eventId as string;
    if (!eventId) {
      return { content: [{ type: 'text', text: 'eventId is required' }], isError: true };
    }
    const body: Record<string, unknown> = {};
    if (args.summary !== undefined) body.summary = args.summary;
    if (args.description !== undefined) body.description = args.description;
    if (args.location !== undefined) body.location = args.location;
    if (args.start !== undefined) body.start = { dateTime: args.start };
    if (args.end !== undefined) body.end = { dateTime: args.end };
    if (args.attendees !== undefined) body.attendees = (args.attendees as string[]).map(email => ({ email }));
    const params = new URLSearchParams();
    params.set('sendNotifications', String(args.sendNotifications !== false));
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}?${params}`,
      { method: 'PATCH', headers: this.headers, body: JSON.stringify(body) },
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Google Calendar API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async deleteEvent(args: Record<string, unknown>): Promise<ToolResult> {
    const calendarId = (args.calendarId as string) ?? 'primary';
    const eventId = args.eventId as string;
    if (!eventId) {
      return { content: [{ type: 'text', text: 'eventId is required' }], isError: true };
    }
    const params = new URLSearchParams();
    params.set('sendNotifications', String(args.sendNotifications !== false));
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}?${params}`,
      { method: 'DELETE', headers: this.headers },
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Google Calendar API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: JSON.stringify({ deleted: true, eventId }) }], isError: false };
  }

  private async moveEvent(args: Record<string, unknown>): Promise<ToolResult> {
    const calendarId = (args.calendarId as string) ?? 'primary';
    const eventId = args.eventId as string;
    const destinationCalendarId = args.destinationCalendarId as string;
    if (!eventId || !destinationCalendarId) {
      return { content: [{ type: 'text', text: 'eventId and destinationCalendarId are required' }], isError: true };
    }
    const params = new URLSearchParams({ destination: destinationCalendarId });
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}/move?${params}`,
      { method: 'POST', headers: this.headers },
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Google Calendar API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async queryFreeBusy(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.timeMin || !args.timeMax || !args.calendarIds) {
      return { content: [{ type: 'text', text: 'timeMin, timeMax, and calendarIds are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      timeMin: args.timeMin,
      timeMax: args.timeMax,
      items: (args.calendarIds as string[]).map(id => ({ id })),
    };
    if (args.timeZone) body.timeZone = args.timeZone;
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/freeBusy`,
      { method: 'POST', headers: this.headers, body: JSON.stringify(body) },
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Google Calendar API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listAclRules(args: Record<string, unknown>): Promise<ToolResult> {
    const calendarId = args.calendarId as string;
    if (!calendarId) {
      return { content: [{ type: 'text', text: 'calendarId is required' }], isError: true };
    }
    const params = new URLSearchParams();
    if (args.pageToken) params.set('pageToken', args.pageToken as string);
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/calendars/${encodeURIComponent(calendarId)}/acl${params.toString() ? '?' + params.toString() : ''}`,
      { headers: this.headers },
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Google Calendar API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async createAclRule(args: Record<string, unknown>): Promise<ToolResult> {
    const calendarId = args.calendarId as string;
    const role = args.role as string;
    const scopeType = args.scopeType as string;
    if (!calendarId || !role || !scopeType) {
      return { content: [{ type: 'text', text: 'calendarId, role, and scopeType are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      role,
      scope: { type: scopeType, ...(args.scopeValue ? { value: args.scopeValue } : {}) },
    };
    const params = new URLSearchParams();
    params.set('sendNotifications', String(args.sendNotifications !== false));
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/calendars/${encodeURIComponent(calendarId)}/acl?${params}`,
      { method: 'POST', headers: this.headers, body: JSON.stringify(body) },
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Google Calendar API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async deleteAclRule(args: Record<string, unknown>): Promise<ToolResult> {
    const calendarId = args.calendarId as string;
    const ruleId = args.ruleId as string;
    if (!calendarId || !ruleId) {
      return { content: [{ type: 'text', text: 'calendarId and ruleId are required' }], isError: true };
    }
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/calendars/${encodeURIComponent(calendarId)}/acl/${encodeURIComponent(ruleId)}`,
      { method: 'DELETE', headers: this.headers },
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Google Calendar API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: JSON.stringify({ deleted: true, ruleId }) }], isError: false };
  }

  private async getSettings(args: Record<string, unknown>): Promise<ToolResult> {
    const setting = args.setting as string | undefined;
    const url = setting
      ? `${this.baseUrl}/users/me/settings/${encodeURIComponent(setting)}`
      : `${this.baseUrl}/users/me/settings`;
    const response = await this.fetchWithRetry(url, { headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Google Calendar API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getColors(): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}/colors`, { headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Google Calendar API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }
}

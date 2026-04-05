/**
 * Citrix Online GoToMeeting MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// No official GoToMeeting MCP server was found on GitHub or npm.
//
// Our adapter covers: 26 tools (full GoToMeeting REST API surface — meetings, organizers, groups, attendees).
// Integration: use-our-adapter
//
// Base URL: https://api.citrixonline.com/G2M/rest
// Auth: Bearer token (OAuth2 access token from Citrix Identity Provider)
// Docs: https://developer.citrixonline.com/
// API Version: 1.0.0
// Rate limits: Not publicly documented
//
// Coverage: meetings (CRUD, start, attendees), organizers (CRUD), groups (list, organizers,
//   attendees, meetings), historical meetings, upcoming meetings

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface GoToMeetingConfig {
  accessToken: string;
  baseUrl?: string;
}

export class CitrixonlineGotomeetingMCPServer extends MCPAdapterBase {
  private readonly baseUrl: string;
  private readonly accessToken: string;

  constructor(config: GoToMeetingConfig) {
    super();
    this.baseUrl = config.baseUrl ?? 'https://api.citrixonline.com/G2M/rest';
    this.accessToken = config.accessToken;
  }

  get tools(): ToolDefinition[] {
    return [
      // -- Meetings ----------------------------------------------------------
      {
        name: 'create_meeting',
        description: 'Create a new GoToMeeting scheduled meeting for the authenticated organizer',
        inputSchema: {
          type: 'object',
          properties: {
            subject: { type: 'string', description: 'Meeting subject/title (max 100 characters)' },
            starttime: { type: 'string', description: 'Meeting start time in ISO8601 UTC format (e.g. 2025-07-01T22:00:00Z)' },
            endtime: { type: 'string', description: 'Meeting end time in ISO8601 UTC format (e.g. 2025-07-01T23:00:00Z)' },
            passwordrequired: { type: 'boolean', description: 'Whether a password is required to join the meeting' },
            conferencecallinfo: { type: 'string', description: 'Conference call type: PSTN, Free, Hybrid, Private, or VoIP' },
            timezonekey: { type: 'string', description: 'DEPRECATED — must be provided as empty string' },
            meetingtype: { type: 'string', description: 'Meeting type (e.g. scheduled)' },
          },
          required: ['subject', 'starttime', 'endtime', 'passwordrequired', 'conferencecallinfo', 'timezonekey', 'meetingtype'],
        },
      },
      {
        name: 'get_meeting',
        description: 'Get details of a specific GoToMeeting by its meeting ID',
        inputSchema: {
          type: 'object',
          properties: {
            meetingId: { type: 'string', description: 'The unique meeting ID' },
          },
          required: ['meetingId'],
        },
      },
      {
        name: 'update_meeting',
        description: 'Update an existing GoToMeeting — change subject, times, password requirements, or conference call info',
        inputSchema: {
          type: 'object',
          properties: {
            meetingId: { type: 'string', description: 'The unique meeting ID to update' },
            subject: { type: 'string', description: 'New meeting subject/title (max 100 characters)' },
            starttime: { type: 'string', description: 'New start time in ISO8601 UTC format' },
            endtime: { type: 'string', description: 'New end time in ISO8601 UTC format' },
            passwordrequired: { type: 'boolean', description: 'Whether a password is required to join' },
            conferencecallinfo: { type: 'string', description: 'Conference call type: PSTN, Free, Hybrid, Private, or VoIP' },
            timezonekey: { type: 'string', description: 'DEPRECATED — must be provided as empty string' },
            meetingtype: { type: 'string', description: 'Meeting type' },
          },
          required: ['meetingId', 'subject', 'starttime', 'endtime', 'passwordrequired', 'conferencecallinfo', 'timezonekey', 'meetingtype'],
        },
      },
      {
        name: 'delete_meeting',
        description: 'Delete/cancel a GoToMeeting by its meeting ID',
        inputSchema: {
          type: 'object',
          properties: {
            meetingId: { type: 'string', description: 'The unique meeting ID to delete' },
          },
          required: ['meetingId'],
        },
      },
      {
        name: 'start_meeting',
        description: 'Get the start URL for a GoToMeeting (generates a host URL to begin the meeting)',
        inputSchema: {
          type: 'object',
          properties: {
            meetingId: { type: 'string', description: 'The unique meeting ID to start' },
          },
          required: ['meetingId'],
        },
      },
      {
        name: 'get_meeting_attendees',
        description: 'Get the list of attendees who joined a specific past GoToMeeting session',
        inputSchema: {
          type: 'object',
          properties: {
            meetingId: { type: 'integer', description: 'The unique meeting ID (numeric)' },
          },
          required: ['meetingId'],
        },
      },
      {
        name: 'get_upcoming_meetings',
        description: 'Get all upcoming scheduled meetings for the authenticated organizer',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_historical_meetings',
        description: 'Get historical (past) meetings for the authenticated organizer within a date range',
        inputSchema: {
          type: 'object',
          properties: {
            startDate: { type: 'string', description: 'Start of date range in ISO8601 UTC format (e.g. 2025-01-01T00:00:00Z)' },
            endDate: { type: 'string', description: 'End of date range in ISO8601 UTC format (e.g. 2025-06-30T23:59:59Z)' },
          },
          required: ['startDate', 'endDate'],
        },
      },
      // -- Organizers --------------------------------------------------------
      {
        name: 'get_organizers',
        description: 'Get all organizers in the account, or search for a specific organizer by email address',
        inputSchema: {
          type: 'object',
          properties: {
            email: { type: 'string', description: 'Filter by organizer email address (optional — omit to list all organizers)' },
          },
        },
      },
      {
        name: 'create_organizer',
        description: 'Create a new GoToMeeting organizer in the account',
        inputSchema: {
          type: 'object',
          properties: {
            organizerEmail: { type: 'string', description: "The organizer's email address" },
            firstName: { type: 'string', description: "The organizer's first name" },
            lastName: { type: 'string', description: "The organizer's surname" },
            productType: { type: 'string', description: "Product to assign: G2M, G2W, G2T, or OPENVOICE" },
          },
          required: ['organizerEmail', 'firstName', 'lastName', 'productType'],
        },
      },
      {
        name: 'delete_organizer_by_email',
        description: 'Delete a GoToMeeting organizer by their email address',
        inputSchema: {
          type: 'object',
          properties: {
            email: { type: 'string', description: "The organizer's email address to delete" },
          },
          required: ['email'],
        },
      },
      {
        name: 'get_organizer',
        description: "Get a specific organizer's details by their organizer key",
        inputSchema: {
          type: 'object',
          properties: {
            organizerKey: { type: 'string', description: "The organizer's unique key" },
          },
          required: ['organizerKey'],
        },
      },
      {
        name: 'update_organizer',
        description: "Update an organizer's status or product assignment",
        inputSchema: {
          type: 'object',
          properties: {
            organizerKey: { type: 'string', description: "The organizer's unique key" },
            productType: { type: 'string', description: "Product to assign: G2M, G2W, G2T, or OPENVOICE (omit status to activate)" },
            status: { type: 'string', enum: ['suspended'], description: "Set to 'suspended' to remove all products and suspend the organizer" },
          },
          required: ['organizerKey'],
        },
      },
      {
        name: 'delete_organizer',
        description: "Delete a GoToMeeting organizer by their organizer key",
        inputSchema: {
          type: 'object',
          properties: {
            organizerKey: { type: 'string', description: "The organizer's unique key to delete" },
          },
          required: ['organizerKey'],
        },
      },
      {
        name: 'get_organizer_upcoming_meetings',
        description: "Get all upcoming scheduled meetings for a specific organizer",
        inputSchema: {
          type: 'object',
          properties: {
            organizerKey: { type: 'string', description: "The organizer's unique key" },
          },
          required: ['organizerKey'],
        },
      },
      {
        name: 'get_organizer_historical_meetings',
        description: "Get historical meetings for a specific organizer within a date range",
        inputSchema: {
          type: 'object',
          properties: {
            organizerKey: { type: 'string', description: "The organizer's unique key" },
            startDate: { type: 'string', description: 'Start of date range in ISO8601 UTC format' },
            endDate: { type: 'string', description: 'End of date range in ISO8601 UTC format' },
          },
          required: ['organizerKey', 'startDate', 'endDate'],
        },
      },
      {
        name: 'get_organizer_attendees',
        description: "Get all attendees across a specific organizer's past meetings within a date range",
        inputSchema: {
          type: 'object',
          properties: {
            organizerKey: { type: 'string', description: "The organizer's unique key" },
            startDate: { type: 'string', description: 'Start of date range in ISO8601 UTC format' },
            endDate: { type: 'string', description: 'End of date range in ISO8601 UTC format' },
          },
          required: ['organizerKey', 'startDate', 'endDate'],
        },
      },
      // -- Groups ------------------------------------------------------------
      {
        name: 'get_groups',
        description: 'Get all organizer groups defined in the GoToMeeting account',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_group_organizers',
        description: 'Get all organizers belonging to a specific group',
        inputSchema: {
          type: 'object',
          properties: {
            groupKey: { type: 'string', description: "The group's unique key" },
          },
          required: ['groupKey'],
        },
      },
      {
        name: 'create_organizer_in_group',
        description: 'Create a new organizer and assign them to a specific group',
        inputSchema: {
          type: 'object',
          properties: {
            groupKey: { type: 'string', description: "The group's unique key to assign the organizer to" },
            organizerEmail: { type: 'string', description: "The new organizer's email address" },
            firstName: { type: 'string', description: "The organizer's first name" },
            lastName: { type: 'string', description: "The organizer's surname" },
            productType: { type: 'string', description: "Product to assign: G2M, G2W, G2T, or OPENVOICE" },
          },
          required: ['groupKey', 'organizerEmail', 'firstName', 'lastName', 'productType'],
        },
      },
      {
        name: 'get_group_upcoming_meetings',
        description: 'Get all upcoming meetings scheduled by organizers in a specific group',
        inputSchema: {
          type: 'object',
          properties: {
            groupKey: { type: 'string', description: "The group's unique key" },
          },
          required: ['groupKey'],
        },
      },
      {
        name: 'get_group_historical_meetings',
        description: 'Get past meetings held by organizers in a specific group within a date range',
        inputSchema: {
          type: 'object',
          properties: {
            groupKey: { type: 'string', description: "The group's unique key" },
            startDate: { type: 'string', description: 'Start of date range in ISO8601 UTC format' },
            endDate: { type: 'string', description: 'End of date range in ISO8601 UTC format' },
          },
          required: ['groupKey', 'startDate', 'endDate'],
        },
      },
      {
        name: 'get_group_attendees',
        description: 'Get all attendees across past meetings held by organizers in a specific group',
        inputSchema: {
          type: 'object',
          properties: {
            groupKey: { type: 'string', description: "The group's unique key" },
            startDate: { type: 'string', description: 'Start of date range in ISO8601 UTC format (optional)' },
            endDate: { type: 'string', description: 'End of date range in ISO8601 UTC format (optional)' },
          },
          required: ['groupKey'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'create_meeting':
          return await this.createMeeting(args);
        case 'get_meeting':
          return await this.getMeeting(args);
        case 'update_meeting':
          return await this.updateMeeting(args);
        case 'delete_meeting':
          return await this.deleteMeeting(args);
        case 'start_meeting':
          return await this.startMeeting(args);
        case 'get_meeting_attendees':
          return await this.getMeetingAttendees(args);
        case 'get_upcoming_meetings':
          return await this.getUpcomingMeetings();
        case 'get_historical_meetings':
          return await this.getHistoricalMeetings(args);
        case 'get_organizers':
          return await this.getOrganizers(args);
        case 'create_organizer':
          return await this.createOrganizer(args);
        case 'delete_organizer_by_email':
          return await this.deleteOrganizerByEmail(args);
        case 'get_organizer':
          return await this.getOrganizer(args);
        case 'update_organizer':
          return await this.updateOrganizer(args);
        case 'delete_organizer':
          return await this.deleteOrganizer(args);
        case 'get_organizer_upcoming_meetings':
          return await this.getOrganizerUpcomingMeetings(args);
        case 'get_organizer_historical_meetings':
          return await this.getOrganizerHistoricalMeetings(args);
        case 'get_organizer_attendees':
          return await this.getOrganizerAttendees(args);
        case 'get_groups':
          return await this.getGroups();
        case 'get_group_organizers':
          return await this.getGroupOrganizers(args);
        case 'create_organizer_in_group':
          return await this.createOrganizerInGroup(args);
        case 'get_group_upcoming_meetings':
          return await this.getGroupUpcomingMeetings(args);
        case 'get_group_historical_meetings':
          return await this.getGroupHistoricalMeetings(args);
        case 'get_group_attendees':
          return await this.getGroupAttendees(args);
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

  // -- Private helpers -------------------------------------------------------

  private get headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
    };
  }

  private async fetchJSON(url: string, init?: RequestInit): Promise<ToolResult> {
    const response = await this.fetchWithRetry(url, { headers: this.headers, ...init });
    if (!response.ok) {
      let errText: string;
      try {
        const err = await response.json() as { message?: string; description?: string };
        errText = err.message ?? err.description ?? `${response.status} ${response.statusText}`;
      } catch {
        errText = `${response.status} ${response.statusText}`;
      }
      return { content: [{ type: 'text', text: `API error: ${errText}` }], isError: true };
    }
    let data: unknown;
    try {
      data = response.status === 204 ? { status: 'success' } : await response.json();
    } catch {
      throw new Error(`GoToMeeting returned non-JSON response (HTTP ${response.status})`);
    }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private buildMeetingBody(args: Record<string, unknown>): Record<string, unknown> {
    return {
      subject: args.subject,
      starttime: args.starttime,
      endtime: args.endtime,
      passwordrequired: args.passwordrequired,
      conferencecallinfo: args.conferencecallinfo,
      timezonekey: args.timezonekey ?? '',
      meetingtype: args.meetingtype,
    };
  }

  // -- Meetings --------------------------------------------------------------

  private async createMeeting(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fetchJSON(`${this.baseUrl}/meetings`, {
      method: 'POST',
      body: JSON.stringify(this.buildMeetingBody(args)),
    });
  }

  private async getMeeting(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fetchJSON(`${this.baseUrl}/meetings/${encodeURIComponent(String(args.meetingId))}`);
  }

  private async updateMeeting(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fetchJSON(`${this.baseUrl}/meetings/${encodeURIComponent(String(args.meetingId))}`, {
      method: 'PUT',
      body: JSON.stringify(this.buildMeetingBody(args)),
    });
  }

  private async deleteMeeting(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fetchJSON(
      `${this.baseUrl}/meetings/${encodeURIComponent(String(args.meetingId))}`,
      { method: 'DELETE' },
    );
  }

  private async startMeeting(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fetchJSON(`${this.baseUrl}/meetings/${encodeURIComponent(String(args.meetingId))}/start`);
  }

  private async getMeetingAttendees(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fetchJSON(`${this.baseUrl}/meetings/${encodeURIComponent(String(args.meetingId))}/attendees`);
  }

  private async getUpcomingMeetings(): Promise<ToolResult> {
    return this.fetchJSON(`${this.baseUrl}/upcomingMeetings`);
  }

  private async getHistoricalMeetings(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams({
      startDate: String(args.startDate),
      endDate: String(args.endDate),
    });
    return this.fetchJSON(`${this.baseUrl}/historicalMeetings?${params}`);
  }

  // -- Organizers ------------------------------------------------------------

  private async getOrganizers(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.email) params.set('email', String(args.email));
    const query = params.toString();
    return this.fetchJSON(`${this.baseUrl}/organizers${query ? `?${query}` : ''}`);
  }

  private async createOrganizer(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fetchJSON(`${this.baseUrl}/organizers`, {
      method: 'POST',
      body: JSON.stringify({
        organizerEmail: args.organizerEmail,
        firstName: args.firstName,
        lastName: args.lastName,
        productType: args.productType,
      }),
    });
  }

  private async deleteOrganizerByEmail(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams({ email: String(args.email) });
    return this.fetchJSON(`${this.baseUrl}/organizers?${params}`, { method: 'DELETE' });
  }

  private async getOrganizer(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fetchJSON(`${this.baseUrl}/organizers/${encodeURIComponent(String(args.organizerKey))}`);
  }

  private async updateOrganizer(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {};
    if (args.productType !== undefined) body.productType = args.productType;
    if (args.status !== undefined) body.status = args.status;
    return this.fetchJSON(`${this.baseUrl}/organizers/${encodeURIComponent(String(args.organizerKey))}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  private async deleteOrganizer(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fetchJSON(
      `${this.baseUrl}/organizers/${encodeURIComponent(String(args.organizerKey))}`,
      { method: 'DELETE' },
    );
  }

  private async getOrganizerUpcomingMeetings(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fetchJSON(`${this.baseUrl}/organizers/${encodeURIComponent(String(args.organizerKey))}/upcomingMeetings`);
  }

  private async getOrganizerHistoricalMeetings(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams({
      startDate: String(args.startDate),
      endDate: String(args.endDate),
    });
    return this.fetchJSON(`${this.baseUrl}/organizers/${encodeURIComponent(String(args.organizerKey))}/historicalMeetings?${params}`);
  }

  private async getOrganizerAttendees(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams({
      startDate: String(args.startDate),
      endDate: String(args.endDate),
    });
    return this.fetchJSON(`${this.baseUrl}/organizers/${encodeURIComponent(String(args.organizerKey))}/attendees?${params}`);
  }

  // -- Groups ----------------------------------------------------------------

  private async getGroups(): Promise<ToolResult> {
    return this.fetchJSON(`${this.baseUrl}/groups`);
  }

  private async getGroupOrganizers(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fetchJSON(`${this.baseUrl}/groups/${encodeURIComponent(String(args.groupKey))}/organizers`);
  }

  private async createOrganizerInGroup(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fetchJSON(`${this.baseUrl}/groups/${encodeURIComponent(String(args.groupKey))}/organizers`, {
      method: 'POST',
      body: JSON.stringify({
        organizerEmail: args.organizerEmail,
        firstName: args.firstName,
        lastName: args.lastName,
        productType: args.productType,
      }),
    });
  }

  private async getGroupUpcomingMeetings(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fetchJSON(`${this.baseUrl}/groups/${encodeURIComponent(String(args.groupKey))}/upcomingMeetings`);
  }

  private async getGroupHistoricalMeetings(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams({
      startDate: String(args.startDate),
      endDate: String(args.endDate),
    });
    return this.fetchJSON(`${this.baseUrl}/groups/${encodeURIComponent(String(args.groupKey))}/historicalMeetings?${params}`);
  }

  private async getGroupAttendees(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.startDate) params.set('startDate', String(args.startDate));
    if (args.endDate) params.set('endDate', String(args.endDate));
    const query = params.toString();
    return this.fetchJSON(`${this.baseUrl}/groups/${encodeURIComponent(String(args.groupKey))}/attendees${query ? `?${query}` : ''}`);
  }
}

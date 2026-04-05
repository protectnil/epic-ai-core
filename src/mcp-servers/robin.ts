/**
 * Robin MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// No official Robin (robinpowered.com) MCP server was found on GitHub, npm, or the Robin developer docs.
// Our adapter covers: 17 tools. Vendor MCP covers: 0 tools.
// Recommendation: use-rest-api — no MCP server exists.
//
// Base URL: https://api.robinpowered.com/v1.0
// Auth: Access token via Authorization: Access-Token {token} header
// Docs: https://docs.robinpowered.com/docs/getting-started
// Rate limits: Not publicly documented; 429 responses on exceeded limits

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface RobinConfig {
  accessToken: string;
  baseUrl?: string;
}

export class RobinMCPServer extends MCPAdapterBase {
  private readonly accessToken: string;
  private readonly baseUrl: string;

  constructor(config: RobinConfig) {
    super();
    this.accessToken = config.accessToken;
    this.baseUrl = config.baseUrl || 'https://api.robinpowered.com/v1.0';
  }

  static catalog() {
    return {
      name: 'robin',
      displayName: 'Robin',
      version: '1.0.0',
      category: 'misc',
      keywords: ['robin', 'office', 'workspace', 'room booking', 'desk booking', 'space management', 'hot desk', 'meeting room', 'occupancy', 'floor plan', 'hybrid work'],
      toolNames: [
        'list_spaces', 'get_space', 'list_space_availability',
        'list_events', 'get_event', 'create_event', 'update_event', 'delete_event',
        'list_seats', 'get_seat', 'list_seat_reservations', 'create_seat_reservation',
        'list_locations', 'get_location',
        'list_users', 'get_user',
        'get_organization',
      ],
      description: 'Robin workspace management: book meeting rooms and desks, check space availability, manage office events and seat reservations.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_spaces',
        description: 'List bookable spaces (meeting rooms, conference rooms) in a Robin location or organization',
        inputSchema: {
          type: 'object',
          properties: {
            location_id: {
              type: 'number',
              description: 'Filter by location ID',
            },
            type: {
              type: 'string',
              description: 'Filter by space type (e.g. meeting_room, phone_booth)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            per_page: {
              type: 'number',
              description: 'Results per page (default: 25)',
            },
          },
        },
      },
      {
        name: 'get_space',
        description: 'Get details for a specific Robin space (room) by its ID including capacity and amenities',
        inputSchema: {
          type: 'object',
          properties: {
            space_id: {
              type: 'number',
              description: 'Space ID to retrieve',
            },
          },
          required: ['space_id'],
        },
      },
      {
        name: 'list_space_availability',
        description: 'Check availability windows for a Robin space over a date/time range to find open booking slots',
        inputSchema: {
          type: 'object',
          properties: {
            space_id: {
              type: 'number',
              description: 'Space ID to check availability for',
            },
            after: {
              type: 'string',
              description: 'Start of availability window in ISO 8601 format (e.g. 2026-04-01T08:00:00Z)',
            },
            before: {
              type: 'string',
              description: 'End of availability window in ISO 8601 format',
            },
          },
          required: ['space_id', 'after', 'before'],
        },
      },
      {
        name: 'list_events',
        description: 'List events (meetings) booked in Robin spaces with optional space, date, and location filters',
        inputSchema: {
          type: 'object',
          properties: {
            space_id: {
              type: 'number',
              description: 'Filter by space ID',
            },
            location_id: {
              type: 'number',
              description: 'Filter by location ID',
            },
            after: {
              type: 'string',
              description: 'Return events starting after this ISO 8601 datetime',
            },
            before: {
              type: 'string',
              description: 'Return events starting before this ISO 8601 datetime',
            },
            page: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
            per_page: {
              type: 'number',
              description: 'Results per page (default: 25)',
            },
          },
        },
      },
      {
        name: 'get_event',
        description: 'Get details for a specific Robin event/meeting by its event ID',
        inputSchema: {
          type: 'object',
          properties: {
            event_id: {
              type: 'string',
              description: 'Event ID to retrieve',
            },
          },
          required: ['event_id'],
        },
      },
      {
        name: 'create_event',
        description: 'Book a meeting room in Robin by creating an event with title, time, space, and attendees',
        inputSchema: {
          type: 'object',
          properties: {
            title: {
              type: 'string',
              description: 'Event title/meeting name',
            },
            space_id: {
              type: 'number',
              description: 'ID of the space (room) to book',
            },
            start_time: {
              type: 'string',
              description: 'Event start time in ISO 8601 format (e.g. 2026-04-01T09:00:00Z)',
            },
            end_time: {
              type: 'string',
              description: 'Event end time in ISO 8601 format',
            },
            description: {
              type: 'string',
              description: 'Optional event description or agenda',
            },
          },
          required: ['title', 'space_id', 'start_time', 'end_time'],
        },
      },
      {
        name: 'update_event',
        description: 'Update an existing Robin event — change title, time, or space for a booked meeting',
        inputSchema: {
          type: 'object',
          properties: {
            event_id: {
              type: 'string',
              description: 'Event ID to update',
            },
            title: {
              type: 'string',
              description: 'New title for the event',
            },
            start_time: {
              type: 'string',
              description: 'New start time in ISO 8601 format',
            },
            end_time: {
              type: 'string',
              description: 'New end time in ISO 8601 format',
            },
            description: {
              type: 'string',
              description: 'Updated event description',
            },
          },
          required: ['event_id'],
        },
      },
      {
        name: 'delete_event',
        description: 'Cancel and delete a Robin room booking event by its event ID',
        inputSchema: {
          type: 'object',
          properties: {
            event_id: {
              type: 'string',
              description: 'Event ID to cancel and delete',
            },
          },
          required: ['event_id'],
        },
      },
      {
        name: 'list_seats',
        description: 'List desk/hot-desk seats available in a Robin location for seat booking',
        inputSchema: {
          type: 'object',
          properties: {
            location_id: {
              type: 'number',
              description: 'Location ID to list seats for',
            },
            page: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
            per_page: {
              type: 'number',
              description: 'Results per page (default: 25)',
            },
          },
        },
      },
      {
        name: 'get_seat',
        description: 'Get details for a specific Robin desk/seat by its seat ID',
        inputSchema: {
          type: 'object',
          properties: {
            seat_id: {
              type: 'number',
              description: 'Seat ID to retrieve',
            },
          },
          required: ['seat_id'],
        },
      },
      {
        name: 'list_seat_reservations',
        description: 'List desk reservations in Robin with optional user, location, and date filters',
        inputSchema: {
          type: 'object',
          properties: {
            location_id: {
              type: 'number',
              description: 'Filter by location ID',
            },
            user_id: {
              type: 'number',
              description: 'Filter by user ID',
            },
            after: {
              type: 'string',
              description: 'Return reservations after this ISO 8601 datetime',
            },
            before: {
              type: 'string',
              description: 'Return reservations before this ISO 8601 datetime',
            },
            page: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
          },
        },
      },
      {
        name: 'create_seat_reservation',
        description: 'Reserve a specific desk/seat in Robin for a user on a given date',
        inputSchema: {
          type: 'object',
          properties: {
            seat_id: {
              type: 'number',
              description: 'Seat ID to reserve',
            },
            user_id: {
              type: 'number',
              description: 'User ID making the reservation',
            },
            start_time: {
              type: 'string',
              description: 'Reservation start time in ISO 8601 format',
            },
            end_time: {
              type: 'string',
              description: 'Reservation end time in ISO 8601 format',
            },
          },
          required: ['seat_id', 'user_id', 'start_time', 'end_time'],
        },
      },
      {
        name: 'list_locations',
        description: 'List all office locations configured in the Robin organization',
        inputSchema: {
          type: 'object',
          properties: {
            page: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
            per_page: {
              type: 'number',
              description: 'Results per page (default: 25)',
            },
          },
        },
      },
      {
        name: 'get_location',
        description: 'Get details for a specific Robin office location by its ID',
        inputSchema: {
          type: 'object',
          properties: {
            location_id: {
              type: 'number',
              description: 'Location ID to retrieve',
            },
          },
          required: ['location_id'],
        },
      },
      {
        name: 'list_users',
        description: 'List users in the Robin organization with optional search by name or email',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search by name or email',
            },
            page: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
            per_page: {
              type: 'number',
              description: 'Results per page (default: 25)',
            },
          },
        },
      },
      {
        name: 'get_user',
        description: 'Get profile and details for a specific Robin user by their user ID',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: {
              type: 'number',
              description: 'User ID to retrieve',
            },
          },
          required: ['user_id'],
        },
      },
      {
        name: 'get_organization',
        description: 'Get information about the authenticated Robin organization including name and settings',
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
        case 'list_spaces':
          return this.listSpaces(args);
        case 'get_space':
          return this.getSpace(args);
        case 'list_space_availability':
          return this.listSpaceAvailability(args);
        case 'list_events':
          return this.listEvents(args);
        case 'get_event':
          return this.getEvent(args);
        case 'create_event':
          return this.createEvent(args);
        case 'update_event':
          return this.updateEvent(args);
        case 'delete_event':
          return this.deleteEvent(args);
        case 'list_seats':
          return this.listSeats(args);
        case 'get_seat':
          return this.getSeat(args);
        case 'list_seat_reservations':
          return this.listSeatReservations(args);
        case 'create_seat_reservation':
          return this.createSeatReservation(args);
        case 'list_locations':
          return this.listLocations(args);
        case 'get_location':
          return this.getLocation(args);
        case 'list_users':
          return this.listUsers(args);
        case 'get_user':
          return this.getUser(args);
        case 'get_organization':
          return this.getOrganization();
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
      'Authorization': `Access-Token ${this.accessToken}`,
      'Content-Type': 'application/json',
    };
  }

  private async apiGet(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, { headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apiPost(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apiPatch(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'PATCH',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apiDelete(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, { method: 'DELETE', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: JSON.stringify({ success: true }) }], isError: false };
  }

  private buildQs(params: Record<string, string | number | undefined>): string {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) p.set(k, String(v));
    }
    const s = p.toString();
    return s ? '?' + s : '';
  }

  private async listSpaces(args: Record<string, unknown>): Promise<ToolResult> {
    return this.apiGet('/spaces' + this.buildQs({
      location_id: args.location_id as number,
      type: args.type as string,
      page: args.page as number,
      per_page: args.per_page as number,
    }));
  }

  private async getSpace(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.space_id) return { content: [{ type: 'text', text: 'space_id is required' }], isError: true };
    return this.apiGet(`/spaces/${encodeURIComponent(args.space_id as string)}`);
  }

  private async listSpaceAvailability(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.space_id || !args.after || !args.before) {
      return { content: [{ type: 'text', text: 'space_id, after, and before are required' }], isError: true };
    }
    return this.apiGet(`/spaces/${encodeURIComponent(args.space_id as string)}/availability` + this.buildQs({ after: args.after as string, before: args.before as string }));
  }

  private async listEvents(args: Record<string, unknown>): Promise<ToolResult> {
    return this.apiGet('/events' + this.buildQs({
      space_id: args.space_id as number,
      location_id: args.location_id as number,
      after: args.after as string,
      before: args.before as string,
      page: args.page as number,
      per_page: args.per_page as number,
    }));
  }

  private async getEvent(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.event_id) return { content: [{ type: 'text', text: 'event_id is required' }], isError: true };
    return this.apiGet(`/events/${encodeURIComponent(args.event_id as string)}`);
  }

  private async createEvent(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.title || !args.space_id || !args.start_time || !args.end_time) {
      return { content: [{ type: 'text', text: 'title, space_id, start_time, and end_time are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      title: args.title,
      space_id: args.space_id,
      start_time: args.start_time,
      end_time: args.end_time,
    };
    if (args.description) body.description = args.description;
    return this.apiPost('/events', body);
  }

  private async updateEvent(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.event_id) return { content: [{ type: 'text', text: 'event_id is required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.title) body.title = args.title;
    if (args.start_time) body.start_time = args.start_time;
    if (args.end_time) body.end_time = args.end_time;
    if (args.description) body.description = args.description;
    return this.apiPatch(`/events/${encodeURIComponent(args.event_id as string)}`, body);
  }

  private async deleteEvent(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.event_id) return { content: [{ type: 'text', text: 'event_id is required' }], isError: true };
    return this.apiDelete(`/events/${encodeURIComponent(args.event_id as string)}`);
  }

  private async listSeats(args: Record<string, unknown>): Promise<ToolResult> {
    return this.apiGet('/seats' + this.buildQs({ location_id: args.location_id as number, page: args.page as number, per_page: args.per_page as number }));
  }

  private async getSeat(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.seat_id) return { content: [{ type: 'text', text: 'seat_id is required' }], isError: true };
    return this.apiGet(`/seats/${encodeURIComponent(args.seat_id as string)}`);
  }

  private async listSeatReservations(args: Record<string, unknown>): Promise<ToolResult> {
    return this.apiGet('/reservations/seats' + this.buildQs({
      location_id: args.location_id as number,
      user_id: args.user_id as number,
      after: args.after as string,
      before: args.before as string,
      page: args.page as number,
    }));
  }

  private async createSeatReservation(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.seat_id || !args.user_id || !args.start_time || !args.end_time) {
      return { content: [{ type: 'text', text: 'seat_id, user_id, start_time, and end_time are required' }], isError: true };
    }
    return this.apiPost(`/seats/${encodeURIComponent(args.seat_id as string)}/reservations`, {
      user_id: args.user_id,
      start_time: args.start_time,
      end_time: args.end_time,
    });
  }

  private async listLocations(args: Record<string, unknown>): Promise<ToolResult> {
    return this.apiGet('/locations' + this.buildQs({ page: args.page as number, per_page: args.per_page as number }));
  }

  private async getLocation(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.location_id) return { content: [{ type: 'text', text: 'location_id is required' }], isError: true };
    return this.apiGet(`/locations/${encodeURIComponent(args.location_id as string)}`);
  }

  private async listUsers(args: Record<string, unknown>): Promise<ToolResult> {
    return this.apiGet('/users' + this.buildQs({ query: args.query as string, page: args.page as number, per_page: args.per_page as number }));
  }

  private async getUser(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.user_id) return { content: [{ type: 'text', text: 'user_id is required' }], isError: true };
    return this.apiGet(`/users/${encodeURIComponent(args.user_id as string)}`);
  }

  private async getOrganization(): Promise<ToolResult> {
    return this.apiGet('/organizations/current');
  }
}

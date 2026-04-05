/**
 * Eventbrite MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// No official Eventbrite MCP server published by Eventbrite was found on GitHub or npmjs.com.
// Several community forks exist (joshuachestang/eventbrite-mcp-server,
// vishalsachdev/eventbrite-mcp, ibraheem4/eventbrite-mcp) — none are official or
// actively maintained by Eventbrite. All are community-authored with limited tool counts (<5).
// Our adapter covers: 18 tools. Vendor MCP covers: N/A (no official server).
// Recommendation: use-rest-api — no official Eventbrite MCP server exists.
//
// Base URL: https://www.eventbriteapi.com/v3
// Auth: Bearer token (private API token or OAuth2 access token) in Authorization header
//   OAuth2 authorization: https://www.eventbrite.com/oauth/authorize
//   OAuth2 token: https://www.eventbrite.com/oauth/token
// Docs: https://www.eventbrite.com/platform/api
// Rate limits: ~2000 requests/hour (third-party sources; Eventbrite does not publicly
//   document exact rate limits on their developer portal)

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface EventbriteConfig {
  apiToken: string;
  baseUrl?: string;
}

export class EventbriteMCPServer extends MCPAdapterBase {
  private readonly apiToken: string;
  private readonly baseUrl: string;

  constructor(config: EventbriteConfig) {
    super();
    this.apiToken = config.apiToken;
    this.baseUrl = config.baseUrl || 'https://www.eventbriteapi.com/v3';
  }

  static catalog() {
    return {
      name: 'eventbrite',
      displayName: 'Eventbrite',
      version: '1.0.0',
      category: 'misc',
      keywords: [
        'eventbrite', 'event', 'ticket', 'ticketing', 'attendee', 'registration',
        'venue', 'organizer', 'category', 'order', 'checkout', 'capacity',
        'event management', 'conference', 'concert', 'webinar',
      ],
      toolNames: [
        'list_events',
        'get_event',
        'search_events',
        'create_event',
        'update_event',
        'publish_event',
        'cancel_event',
        'list_event_attendees',
        'get_attendee',
        'list_event_orders',
        'get_order',
        'list_organizations',
        'get_organization',
        'list_venues',
        'get_venue',
        'create_venue',
        'list_categories',
        'get_user_profile',
      ],
      description: 'Eventbrite event ticketing: list, create, and manage events, retrieve attendees and orders, manage venues and organizers.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_events',
        description: 'List events for an organization with optional status, date range, and pagination filters',
        inputSchema: {
          type: 'object',
          properties: {
            organization_id: {
              type: 'string',
              description: 'Organization ID to list events for',
            },
            status: {
              type: 'string',
              description: 'Filter by event status: draft, live, started, ended, completed, canceled (default: live)',
            },
            time_filter: {
              type: 'string',
              description: 'Filter by time: all, future, past, today (default: all)',
            },
            order_by: {
              type: 'string',
              description: 'Sort order: start_asc, start_desc, created_asc, created_desc, name_asc, name_desc (default: start_asc)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            page_size: {
              type: 'number',
              description: 'Number of results per page (max: 200, default: 50)',
            },
          },
          required: ['organization_id'],
        },
      },
      {
        name: 'get_event',
        description: 'Retrieve full details for a specific event by event ID including description, capacity, and ticket classes',
        inputSchema: {
          type: 'object',
          properties: {
            event_id: {
              type: 'string',
              description: 'Eventbrite event ID',
            },
            expand: {
              type: 'string',
              description: 'Comma-separated expansions: organizer, venue, ticket_classes, logo, format, category (default: none)',
            },
          },
          required: ['event_id'],
        },
      },
      {
        name: 'search_events',
        description: 'Search public Eventbrite events by keyword, location, date, and category with pagination',
        inputSchema: {
          type: 'object',
          properties: {
            q: {
              type: 'string',
              description: 'Search query keywords',
            },
            location_address: {
              type: 'string',
              description: 'Location address or city to search near (e.g. "San Francisco, CA")',
            },
            location_within: {
              type: 'string',
              description: 'Search radius from location (e.g. 10km, 25mi)',
            },
            start_date_range_start: {
              type: 'string',
              description: 'Start of date range filter in ISO 8601 format (e.g. 2026-01-01T00:00:00)',
            },
            start_date_range_end: {
              type: 'string',
              description: 'End of date range filter in ISO 8601 format',
            },
            categories: {
              type: 'string',
              description: 'Comma-separated category IDs to filter by',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
          },
        },
      },
      {
        name: 'create_event',
        description: 'Create a new draft event for an organization with name, date, venue, and capacity settings',
        inputSchema: {
          type: 'object',
          properties: {
            organization_id: {
              type: 'string',
              description: 'Organization ID that will own the event',
            },
            name: {
              type: 'string',
              description: 'Event name (displayed to attendees)',
            },
            description: {
              type: 'string',
              description: 'Event description in plain text or HTML',
            },
            start_utc: {
              type: 'string',
              description: 'Event start time in UTC (ISO 8601, e.g. 2026-06-01T18:00:00Z)',
            },
            end_utc: {
              type: 'string',
              description: 'Event end time in UTC (ISO 8601)',
            },
            timezone: {
              type: 'string',
              description: 'Timezone for display (e.g. America/New_York)',
            },
            currency: {
              type: 'string',
              description: 'ISO 4217 currency code (e.g. USD, EUR — default: USD)',
            },
            online_event: {
              type: 'boolean',
              description: 'Whether this is an online event (default: false)',
            },
            venue_id: {
              type: 'string',
              description: 'Venue ID if using a pre-existing venue',
            },
            capacity: {
              type: 'number',
              description: 'Maximum number of attendees',
            },
          },
          required: ['organization_id', 'name', 'start_utc', 'end_utc', 'timezone'],
        },
      },
      {
        name: 'update_event',
        description: 'Update an existing event name, description, date, venue, or capacity',
        inputSchema: {
          type: 'object',
          properties: {
            event_id: {
              type: 'string',
              description: 'Eventbrite event ID to update',
            },
            name: {
              type: 'string',
              description: 'Updated event name',
            },
            description: {
              type: 'string',
              description: 'Updated event description',
            },
            start_utc: {
              type: 'string',
              description: 'Updated start time in UTC (ISO 8601)',
            },
            end_utc: {
              type: 'string',
              description: 'Updated end time in UTC (ISO 8601)',
            },
            capacity: {
              type: 'number',
              description: 'Updated maximum attendee capacity',
            },
          },
          required: ['event_id'],
        },
      },
      {
        name: 'publish_event',
        description: 'Publish a draft event making it publicly visible and open for ticket sales',
        inputSchema: {
          type: 'object',
          properties: {
            event_id: {
              type: 'string',
              description: 'Eventbrite event ID to publish',
            },
          },
          required: ['event_id'],
        },
      },
      {
        name: 'cancel_event',
        description: 'Cancel a live or draft event and optionally send cancellation notifications to attendees',
        inputSchema: {
          type: 'object',
          properties: {
            event_id: {
              type: 'string',
              description: 'Eventbrite event ID to cancel',
            },
          },
          required: ['event_id'],
        },
      },
      {
        name: 'list_event_attendees',
        description: 'List all attendees for a specific event with optional status and page filters',
        inputSchema: {
          type: 'object',
          properties: {
            event_id: {
              type: 'string',
              description: 'Eventbrite event ID',
            },
            status: {
              type: 'string',
              description: 'Filter by attendee status: attending, not_attending, checked_in, waitlisted (default: attending)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            page_size: {
              type: 'number',
              description: 'Number of attendees per page (max: 500, default: 50)',
            },
          },
          required: ['event_id'],
        },
      },
      {
        name: 'get_attendee',
        description: 'Retrieve a single attendee record by event ID and attendee ID including profile and ticket details',
        inputSchema: {
          type: 'object',
          properties: {
            event_id: {
              type: 'string',
              description: 'Eventbrite event ID',
            },
            attendee_id: {
              type: 'string',
              description: 'Attendee ID',
            },
          },
          required: ['event_id', 'attendee_id'],
        },
      },
      {
        name: 'list_event_orders',
        description: 'List all orders placed for a specific event with status and pagination filters',
        inputSchema: {
          type: 'object',
          properties: {
            event_id: {
              type: 'string',
              description: 'Eventbrite event ID',
            },
            status: {
              type: 'string',
              description: 'Filter by order status: active, inactive, all (default: active)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            page_size: {
              type: 'number',
              description: 'Number of orders per page (max: 200, default: 50)',
            },
          },
          required: ['event_id'],
        },
      },
      {
        name: 'get_order',
        description: 'Retrieve a specific order by order ID including buyer details, attendees, and payment status',
        inputSchema: {
          type: 'object',
          properties: {
            order_id: {
              type: 'string',
              description: 'Eventbrite order ID',
            },
            expand: {
              type: 'string',
              description: 'Comma-separated expansions: attendees, event, promotional_code (default: none)',
            },
          },
          required: ['order_id'],
        },
      },
      {
        name: 'list_organizations',
        description: 'List organizations the authenticated user belongs to',
        inputSchema: {
          type: 'object',
          properties: {
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            page_size: {
              type: 'number',
              description: 'Number of organizations per page (default: 50)',
            },
          },
        },
      },
      {
        name: 'get_organization',
        description: 'Retrieve details for a specific organization by ID including name, logo, and contact information',
        inputSchema: {
          type: 'object',
          properties: {
            organization_id: {
              type: 'string',
              description: 'Eventbrite organization ID',
            },
          },
          required: ['organization_id'],
        },
      },
      {
        name: 'list_venues',
        description: 'List venues owned by an organization with address and capacity information',
        inputSchema: {
          type: 'object',
          properties: {
            organization_id: {
              type: 'string',
              description: 'Organization ID to list venues for',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
          },
          required: ['organization_id'],
        },
      },
      {
        name: 'get_venue',
        description: 'Retrieve details for a specific venue by ID including address and capacity',
        inputSchema: {
          type: 'object',
          properties: {
            venue_id: {
              type: 'string',
              description: 'Eventbrite venue ID',
            },
          },
          required: ['venue_id'],
        },
      },
      {
        name: 'create_venue',
        description: 'Create a new venue for an organization with name, address, and capacity',
        inputSchema: {
          type: 'object',
          properties: {
            organization_id: {
              type: 'string',
              description: 'Organization ID that will own the venue',
            },
            name: {
              type: 'string',
              description: 'Venue name',
            },
            address_1: {
              type: 'string',
              description: 'Street address line 1',
            },
            address_2: {
              type: 'string',
              description: 'Street address line 2 (optional)',
            },
            city: {
              type: 'string',
              description: 'City',
            },
            region: {
              type: 'string',
              description: 'State or region code (e.g. CA)',
            },
            postal_code: {
              type: 'string',
              description: 'Postal or ZIP code',
            },
            country: {
              type: 'string',
              description: 'ISO 3166-1 alpha-2 country code (e.g. US)',
            },
            capacity: {
              type: 'number',
              description: 'Maximum capacity of the venue',
            },
          },
          required: ['organization_id', 'name', 'address_1', 'city', 'country'],
        },
      },
      {
        name: 'list_categories',
        description: 'List all Eventbrite event categories and subcategories for use when creating or filtering events',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_user_profile',
        description: 'Retrieve the profile of the authenticated user including name, email, and organization memberships',
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
        case 'list_events':
          return this.listEvents(args);
        case 'get_event':
          return this.getEvent(args);
        case 'search_events':
          return this.searchEvents(args);
        case 'create_event':
          return this.createEvent(args);
        case 'update_event':
          return this.updateEvent(args);
        case 'publish_event':
          return this.publishEvent(args);
        case 'cancel_event':
          return this.cancelEvent(args);
        case 'list_event_attendees':
          return this.listEventAttendees(args);
        case 'get_attendee':
          return this.getAttendee(args);
        case 'list_event_orders':
          return this.listEventOrders(args);
        case 'get_order':
          return this.getOrder(args);
        case 'list_organizations':
          return this.listOrganizations(args);
        case 'get_organization':
          return this.getOrganization(args);
        case 'list_venues':
          return this.listVenues(args);
        case 'get_venue':
          return this.getVenue(args);
        case 'create_venue':
          return this.createVenue(args);
        case 'list_categories':
          return this.listCategories();
        case 'get_user_profile':
          return this.getUserProfile();
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
      'Authorization': `Bearer ${this.apiToken}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
  }

  private async ebGet(path: string, params: Record<string, string> = {}): Promise<ToolResult> {
    const qs = new URLSearchParams(params).toString();
    const url = `${this.baseUrl}/${path}${qs ? '?' + qs : ''}`;
    const response = await this.fetchWithRetry(url, { headers: this.headers });

    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `Eventbrite API error: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }

    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async ebPost(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}/${path}`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `Eventbrite API error: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }

    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listEvents(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.organization_id) {
      return { content: [{ type: 'text', text: 'organization_id is required' }], isError: true };
    }
    const params: Record<string, string> = {
      status: (args.status as string) || 'live',
      page_size: String((args.page_size as number) || 50),
    };
    if (args.time_filter) params.time_filter = args.time_filter as string;
    if (args.order_by) params.order_by = args.order_by as string;
    if (args.page) params.page = String(args.page as number);
    return this.ebGet(`organizations/${encodeURIComponent(args.organization_id as string)}/events/`, params);
  }

  private async getEvent(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.event_id) return { content: [{ type: 'text', text: 'event_id is required' }], isError: true };
    const params: Record<string, string> = {};
    if (args.expand) params.expand = args.expand as string;
    return this.ebGet(`events/${encodeURIComponent(args.event_id as string)}/`, params);
  }

  private async searchEvents(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (args.q) params.q = args.q as string;
    if (args.location_address) params['location.address'] = args.location_address as string;
    if (args.location_within) params['location.within'] = args.location_within as string;
    if (args.start_date_range_start) params['start_date.range_start'] = args.start_date_range_start as string;
    if (args.start_date_range_end) params['start_date.range_end'] = args.start_date_range_end as string;
    if (args.categories) params.categories = args.categories as string;
    if (args.page) params.page = String(args.page as number);
    return this.ebGet('events/search/', params);
  }

  private async createEvent(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.organization_id || !args.name || !args.start_utc || !args.end_utc || !args.timezone) {
      return { content: [{ type: 'text', text: 'organization_id, name, start_utc, end_utc, and timezone are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      event: {
        name: { html: args.name as string },
        start: { utc: args.start_utc, timezone: args.timezone },
        end: { utc: args.end_utc, timezone: args.timezone },
        currency: (args.currency as string) || 'USD',
        online_event: (args.online_event as boolean) || false,
      },
    };
    if (args.description) (body.event as Record<string, unknown>).description = { html: args.description as string };
    if (args.venue_id) (body.event as Record<string, unknown>).venue_id = args.venue_id;
    if (args.capacity) (body.event as Record<string, unknown>).capacity = args.capacity;
    return this.ebPost(`organizations/${encodeURIComponent(args.organization_id as string)}/events/`, body);
  }

  private async updateEvent(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.event_id) return { content: [{ type: 'text', text: 'event_id is required' }], isError: true };
    const eventBody: Record<string, unknown> = {};
    if (args.name) eventBody.name = { html: args.name as string };
    if (args.description) eventBody.description = { html: args.description as string };
    if (args.start_utc) eventBody.start = { utc: args.start_utc };
    if (args.end_utc) eventBody.end = { utc: args.end_utc };
    if (args.capacity) eventBody.capacity = args.capacity;
    const response = await this.fetchWithRetry(`${this.baseUrl}/events/${encodeURIComponent(args.event_id as string)}/`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({ event: eventBody }),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Eventbrite API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async publishEvent(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.event_id) return { content: [{ type: 'text', text: 'event_id is required' }], isError: true };
    return this.ebPost(`events/${encodeURIComponent(args.event_id as string)}/publish/`, {});
  }

  private async cancelEvent(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.event_id) return { content: [{ type: 'text', text: 'event_id is required' }], isError: true };
    return this.ebPost(`events/${encodeURIComponent(args.event_id as string)}/cancel/`, {});
  }

  private async listEventAttendees(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.event_id) return { content: [{ type: 'text', text: 'event_id is required' }], isError: true };
    const params: Record<string, string> = {
      status: (args.status as string) || 'attending',
      page_size: String((args.page_size as number) || 50),
    };
    if (args.page) params.page = String(args.page as number);
    return this.ebGet(`events/${encodeURIComponent(args.event_id as string)}/attendees/`, params);
  }

  private async getAttendee(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.event_id || !args.attendee_id) {
      return { content: [{ type: 'text', text: 'event_id and attendee_id are required' }], isError: true };
    }
    return this.ebGet(`events/${encodeURIComponent(args.event_id as string)}/attendees/${encodeURIComponent(args.attendee_id as string)}/`);
  }

  private async listEventOrders(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.event_id) return { content: [{ type: 'text', text: 'event_id is required' }], isError: true };
    const params: Record<string, string> = {
      status: (args.status as string) || 'active',
      page_size: String((args.page_size as number) || 50),
    };
    if (args.page) params.page = String(args.page as number);
    return this.ebGet(`events/${encodeURIComponent(args.event_id as string)}/orders/`, params);
  }

  private async getOrder(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.order_id) return { content: [{ type: 'text', text: 'order_id is required' }], isError: true };
    const params: Record<string, string> = {};
    if (args.expand) params.expand = args.expand as string;
    return this.ebGet(`orders/${encodeURIComponent(args.order_id as string)}/`, params);
  }

  private async listOrganizations(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      page_size: String((args.page_size as number) || 50),
    };
    if (args.page) params.page = String(args.page as number);
    return this.ebGet('users/me/organizations/', params);
  }

  private async getOrganization(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.organization_id) return { content: [{ type: 'text', text: 'organization_id is required' }], isError: true };
    return this.ebGet(`organizations/${encodeURIComponent(args.organization_id as string)}/`);
  }

  private async listVenues(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.organization_id) return { content: [{ type: 'text', text: 'organization_id is required' }], isError: true };
    const params: Record<string, string> = {};
    if (args.page) params.page = String(args.page as number);
    return this.ebGet(`organizations/${encodeURIComponent(args.organization_id as string)}/venues/`, params);
  }

  private async getVenue(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.venue_id) return { content: [{ type: 'text', text: 'venue_id is required' }], isError: true };
    return this.ebGet(`venues/${encodeURIComponent(args.venue_id as string)}/`);
  }

  private async createVenue(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.organization_id || !args.name || !args.address_1 || !args.city || !args.country) {
      return { content: [{ type: 'text', text: 'organization_id, name, address_1, city, and country are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      venue: {
        name: args.name,
        address: {
          address_1: args.address_1,
          city: args.city,
          country: args.country,
        },
      },
    };
    const addr = (body.venue as Record<string, unknown>).address as Record<string, unknown>;
    if (args.address_2) addr.address_2 = args.address_2;
    if (args.region) addr.region = args.region;
    if (args.postal_code) addr.postal_code = args.postal_code;
    if (args.capacity) (body.venue as Record<string, unknown>).capacity = args.capacity;
    return this.ebPost(`organizations/${encodeURIComponent(args.organization_id as string)}/venues/`, body);
  }

  private async listCategories(): Promise<ToolResult> {
    return this.ebGet('categories/');
  }

  private async getUserProfile(): Promise<ToolResult> {
    return this.ebGet('users/me/');
  }
}

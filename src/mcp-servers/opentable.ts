/**
 * OpenTable MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28 — no official OpenTable MCP server exists.
//   Community scrapers exist (Apify, Bright Data) but do not originate from OpenTable Inc.
//   and are not suitable for production partner integrations.
// Our adapter covers: 15 tools. Vendor MCP covers: 0 tools (no official MCP).
// Recommendation: use-rest-api — no official vendor MCP server exists.
//
// Base URL: https://platform.opentable.com/api/2
// Auth: Bearer token (OAuth2 client credentials via dev.opentable.com partner program)
// Docs: https://docs.opentable.com/ (partner-gated; requires approved API partner account)
//       https://www.opentable.com/restaurant-solutions/api-partners/
// Rate limits: Not publicly documented; partners subject to per-key throttles — contact partnersupport@opentable.com

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface OpenTableConfig {
  accessToken: string;
  baseUrl?: string;
}

export class OpenTableMCPServer extends MCPAdapterBase {
  private readonly accessToken: string;
  private readonly baseUrl: string;

  constructor(config: OpenTableConfig) {
    super();
    this.accessToken = config.accessToken;
    this.baseUrl = config.baseUrl || 'https://platform.opentable.com/api/2';
  }

  static catalog() {
    return {
      name: 'opentable',
      displayName: 'OpenTable',
      version: '1.0.0',
      category: 'misc',
      keywords: [
        'opentable', 'restaurant', 'reservation', 'booking', 'dining', 'table',
        'guest', 'availability', 'seating', 'hospitality', 'cover', 'waitlist',
      ],
      toolNames: [
        'list_restaurants', 'get_restaurant', 'search_restaurants',
        'get_availability', 'create_reservation', 'get_reservation',
        'update_reservation', 'cancel_reservation', 'list_reservations',
        'get_guest', 'search_guests', 'create_guest', 'update_guest',
        'list_shifts', 'get_floor_plan',
      ],
      description: 'OpenTable restaurant management: search restaurants, check availability, create and manage reservations, and look up guest profiles.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_restaurants',
        description: 'List restaurants accessible to the authenticated partner account with optional pagination',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of restaurants to return (default: 50, max: 200)',
            },
            offset: {
              type: 'number',
              description: 'Pagination offset — number of records to skip (default: 0)',
            },
          },
        },
      },
      {
        name: 'get_restaurant',
        description: 'Get detailed profile information for a specific restaurant by its OpenTable restaurant ID',
        inputSchema: {
          type: 'object',
          properties: {
            restaurant_id: {
              type: 'string',
              description: 'OpenTable restaurant ID (numeric string, e.g. "12345")',
            },
          },
          required: ['restaurant_id'],
        },
      },
      {
        name: 'search_restaurants',
        description: 'Search for restaurants by name, city, cuisine type, or neighborhood with optional geo filters',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Free-text search query for restaurant name or cuisine',
            },
            city: {
              type: 'string',
              description: 'City to filter results by (e.g. "New York", "San Francisco")',
            },
            cuisine: {
              type: 'string',
              description: 'Cuisine type to filter by (e.g. "Italian", "Japanese", "American")',
            },
            neighborhood: {
              type: 'string',
              description: 'Neighborhood name to filter by',
            },
            latitude: {
              type: 'number',
              description: 'Latitude for proximity search (requires longitude)',
            },
            longitude: {
              type: 'number',
              description: 'Longitude for proximity search (requires latitude)',
            },
            radius_km: {
              type: 'number',
              description: 'Search radius in kilometers when using geo coordinates (default: 5)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results (default: 25, max: 100)',
            },
          },
        },
      },
      {
        name: 'get_availability',
        description: 'Check real-time reservation availability for a restaurant by date, time, and party size',
        inputSchema: {
          type: 'object',
          properties: {
            restaurant_id: {
              type: 'string',
              description: 'OpenTable restaurant ID',
            },
            date: {
              type: 'string',
              description: 'Requested date in YYYY-MM-DD format',
            },
            time: {
              type: 'string',
              description: 'Requested time in HH:MM (24-hour) format (e.g. "19:00")',
            },
            party_size: {
              type: 'number',
              description: 'Number of diners in the party (minimum: 1)',
            },
          },
          required: ['restaurant_id', 'date', 'time', 'party_size'],
        },
      },
      {
        name: 'create_reservation',
        description: 'Create a new reservation for a guest at a restaurant for a specific date, time, and party size',
        inputSchema: {
          type: 'object',
          properties: {
            restaurant_id: {
              type: 'string',
              description: 'OpenTable restaurant ID',
            },
            date: {
              type: 'string',
              description: 'Reservation date in YYYY-MM-DD format',
            },
            time: {
              type: 'string',
              description: 'Reservation time in HH:MM (24-hour) format',
            },
            party_size: {
              type: 'number',
              description: 'Number of diners',
            },
            first_name: {
              type: 'string',
              description: "Guest's first name",
            },
            last_name: {
              type: 'string',
              description: "Guest's last name",
            },
            email: {
              type: 'string',
              description: "Guest's email address for confirmation",
            },
            phone: {
              type: 'string',
              description: "Guest's phone number (e.g. +14155550123)",
            },
            special_requests: {
              type: 'string',
              description: 'Special requests or notes for the restaurant (e.g. anniversary, dietary restrictions)',
            },
          },
          required: ['restaurant_id', 'date', 'time', 'party_size', 'first_name', 'last_name', 'email'],
        },
      },
      {
        name: 'get_reservation',
        description: 'Retrieve full details for an existing reservation by its confirmation ID',
        inputSchema: {
          type: 'object',
          properties: {
            reservation_id: {
              type: 'string',
              description: 'OpenTable reservation confirmation ID',
            },
          },
          required: ['reservation_id'],
        },
      },
      {
        name: 'update_reservation',
        description: 'Modify an existing reservation — change date, time, party size, or special requests',
        inputSchema: {
          type: 'object',
          properties: {
            reservation_id: {
              type: 'string',
              description: 'OpenTable reservation confirmation ID to update',
            },
            date: {
              type: 'string',
              description: 'New date in YYYY-MM-DD format (omit to keep current)',
            },
            time: {
              type: 'string',
              description: 'New time in HH:MM (24-hour) format (omit to keep current)',
            },
            party_size: {
              type: 'number',
              description: 'New party size (omit to keep current)',
            },
            special_requests: {
              type: 'string',
              description: 'Updated special requests for the restaurant',
            },
          },
          required: ['reservation_id'],
        },
      },
      {
        name: 'cancel_reservation',
        description: 'Cancel an existing reservation by confirmation ID — sends cancellation notification to guest',
        inputSchema: {
          type: 'object',
          properties: {
            reservation_id: {
              type: 'string',
              description: 'OpenTable reservation confirmation ID to cancel',
            },
            reason: {
              type: 'string',
              description: 'Cancellation reason (optional, used for restaurant records)',
            },
          },
          required: ['reservation_id'],
        },
      },
      {
        name: 'list_reservations',
        description: 'List reservations for a restaurant with optional date range, status, and guest filters',
        inputSchema: {
          type: 'object',
          properties: {
            restaurant_id: {
              type: 'string',
              description: 'OpenTable restaurant ID to list reservations for',
            },
            date_from: {
              type: 'string',
              description: 'Start date filter in YYYY-MM-DD format',
            },
            date_to: {
              type: 'string',
              description: 'End date filter in YYYY-MM-DD format',
            },
            status: {
              type: 'string',
              description: 'Filter by status: confirmed, seated, completed, cancelled, no_show (default: confirmed)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of reservations to return (default: 50, max: 200)',
            },
            offset: {
              type: 'number',
              description: 'Pagination offset (default: 0)',
            },
          },
          required: ['restaurant_id'],
        },
      },
      {
        name: 'get_guest',
        description: 'Retrieve a guest profile including visit history, preferences, and loyalty status by guest ID',
        inputSchema: {
          type: 'object',
          properties: {
            guest_id: {
              type: 'string',
              description: 'OpenTable guest profile ID',
            },
          },
          required: ['guest_id'],
        },
      },
      {
        name: 'search_guests',
        description: 'Search for guest profiles by name, email, or phone number within the partner account',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search term — guest name, email address, or phone number',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results to return (default: 20)',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'create_guest',
        description: 'Create a new guest profile with contact information and dining preferences',
        inputSchema: {
          type: 'object',
          properties: {
            first_name: {
              type: 'string',
              description: "Guest's first name",
            },
            last_name: {
              type: 'string',
              description: "Guest's last name",
            },
            email: {
              type: 'string',
              description: "Guest's email address",
            },
            phone: {
              type: 'string',
              description: "Guest's phone number",
            },
            notes: {
              type: 'string',
              description: 'Internal notes about the guest (e.g. dietary restrictions, VIP status)',
            },
          },
          required: ['first_name', 'last_name', 'email'],
        },
      },
      {
        name: 'update_guest',
        description: 'Update an existing guest profile — modify contact information, preferences, or notes',
        inputSchema: {
          type: 'object',
          properties: {
            guest_id: {
              type: 'string',
              description: 'OpenTable guest profile ID to update',
            },
            first_name: {
              type: 'string',
              description: "Updated first name",
            },
            last_name: {
              type: 'string',
              description: "Updated last name",
            },
            email: {
              type: 'string',
              description: "Updated email address",
            },
            phone: {
              type: 'string',
              description: "Updated phone number",
            },
            notes: {
              type: 'string',
              description: 'Updated internal notes',
            },
          },
          required: ['guest_id'],
        },
      },
      {
        name: 'list_shifts',
        description: 'List service shifts (lunch, dinner, brunch) for a restaurant on a specific date',
        inputSchema: {
          type: 'object',
          properties: {
            restaurant_id: {
              type: 'string',
              description: 'OpenTable restaurant ID',
            },
            date: {
              type: 'string',
              description: 'Date to retrieve shifts for in YYYY-MM-DD format',
            },
          },
          required: ['restaurant_id', 'date'],
        },
      },
      {
        name: 'get_floor_plan',
        description: 'Retrieve the floor plan and table layout for a restaurant including table IDs, capacities, and sections',
        inputSchema: {
          type: 'object',
          properties: {
            restaurant_id: {
              type: 'string',
              description: 'OpenTable restaurant ID',
            },
          },
          required: ['restaurant_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_restaurants':
          return this.listRestaurants(args);
        case 'get_restaurant':
          return this.getRestaurant(args);
        case 'search_restaurants':
          return this.searchRestaurants(args);
        case 'get_availability':
          return this.getAvailability(args);
        case 'create_reservation':
          return this.createReservation(args);
        case 'get_reservation':
          return this.getReservation(args);
        case 'update_reservation':
          return this.updateReservation(args);
        case 'cancel_reservation':
          return this.cancelReservation(args);
        case 'list_reservations':
          return this.listReservations(args);
        case 'get_guest':
          return this.getGuest(args);
        case 'search_guests':
          return this.searchGuests(args);
        case 'create_guest':
          return this.createGuest(args);
        case 'update_guest':
          return this.updateGuest(args);
        case 'list_shifts':
          return this.listShifts(args);
        case 'get_floor_plan':
          return this.getFloorPlan(args);
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
      Authorization: `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  private async apiGet(path: string, params: Record<string, string> = {}): Promise<ToolResult> {
    const qs = new URLSearchParams(params).toString();
    const url = `${this.baseUrl}${path}${qs ? '?' + qs : ''}`;
    const response = await this.fetchWithRetry(url, { method: 'GET', headers: this.headers });
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

  private async apiPut(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'PUT',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apiDelete(path: string, body: Record<string, unknown> = {}): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'DELETE',
      headers: this.headers,
      body: Object.keys(body).length > 0 ? JSON.stringify(body) : undefined,
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listRestaurants(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      limit: String((args.limit as number) ?? 50),
      offset: String((args.offset as number) ?? 0),
    };
    return this.apiGet('/restaurants', params);
  }

  private async getRestaurant(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.restaurant_id) return { content: [{ type: 'text', text: 'restaurant_id is required' }], isError: true };
    return this.apiGet(`/restaurants/${encodeURIComponent(args.restaurant_id as string)}`);
  }

  private async searchRestaurants(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      limit: String((args.limit as number) ?? 25),
    };
    if (args.query) params.query = args.query as string;
    if (args.city) params.city = args.city as string;
    if (args.cuisine) params.cuisine = args.cuisine as string;
    if (args.neighborhood) params.neighborhood = args.neighborhood as string;
    if (args.latitude) params.latitude = String(args.latitude);
    if (args.longitude) params.longitude = String(args.longitude);
    if (args.radius_km) params.radius_km = String(args.radius_km);
    return this.apiGet('/restaurants/search', params);
  }

  private async getAvailability(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.restaurant_id || !args.date || !args.time || !args.party_size) {
      return { content: [{ type: 'text', text: 'restaurant_id, date, time, and party_size are required' }], isError: true };
    }
    const params: Record<string, string> = {
      date: args.date as string,
      time: args.time as string,
      party_size: String(args.party_size),
    };
    return this.apiGet(`/restaurants/${encodeURIComponent(args.restaurant_id as string)}/availability`, params);
  }

  private async createReservation(args: Record<string, unknown>): Promise<ToolResult> {
    const required = ['restaurant_id', 'date', 'time', 'party_size', 'first_name', 'last_name', 'email'];
    for (const field of required) {
      if (!args[field]) return { content: [{ type: 'text', text: `${field} is required` }], isError: true };
    }
    const body: Record<string, unknown> = {
      date: args.date,
      time: args.time,
      party_size: args.party_size,
      guest: {
        first_name: args.first_name,
        last_name: args.last_name,
        email: args.email,
        ...(args.phone ? { phone: args.phone } : {}),
      },
    };
    if (args.special_requests) body.special_requests = args.special_requests;
    return this.apiPost(`/restaurants/${encodeURIComponent(args.restaurant_id as string)}/reservations`, body);
  }

  private async getReservation(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.reservation_id) return { content: [{ type: 'text', text: 'reservation_id is required' }], isError: true };
    return this.apiGet(`/reservations/${encodeURIComponent(args.reservation_id as string)}`);
  }

  private async updateReservation(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.reservation_id) return { content: [{ type: 'text', text: 'reservation_id is required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.date) body.date = args.date;
    if (args.time) body.time = args.time;
    if (args.party_size) body.party_size = args.party_size;
    if (args.special_requests) body.special_requests = args.special_requests;
    return this.apiPut(`/reservations/${encodeURIComponent(args.reservation_id as string)}`, body);
  }

  private async cancelReservation(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.reservation_id) return { content: [{ type: 'text', text: 'reservation_id is required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.reason) body.reason = args.reason;
    return this.apiDelete(`/reservations/${encodeURIComponent(args.reservation_id as string)}`, body);
  }

  private async listReservations(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.restaurant_id) return { content: [{ type: 'text', text: 'restaurant_id is required' }], isError: true };
    const params: Record<string, string> = {
      limit: String((args.limit as number) ?? 50),
      offset: String((args.offset as number) ?? 0),
    };
    if (args.date_from) params.date_from = args.date_from as string;
    if (args.date_to) params.date_to = args.date_to as string;
    if (args.status) params.status = args.status as string;
    return this.apiGet(`/restaurants/${encodeURIComponent(args.restaurant_id as string)}/reservations`, params);
  }

  private async getGuest(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.guest_id) return { content: [{ type: 'text', text: 'guest_id is required' }], isError: true };
    return this.apiGet(`/guests/${encodeURIComponent(args.guest_id as string)}`);
  }

  private async searchGuests(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.query) return { content: [{ type: 'text', text: 'query is required' }], isError: true };
    const params: Record<string, string> = {
      query: args.query as string,
      limit: String((args.limit as number) ?? 20),
    };
    return this.apiGet('/guests/search', params);
  }

  private async createGuest(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.first_name || !args.last_name || !args.email) {
      return { content: [{ type: 'text', text: 'first_name, last_name, and email are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      first_name: args.first_name,
      last_name: args.last_name,
      email: args.email,
    };
    if (args.phone) body.phone = args.phone;
    if (args.notes) body.notes = args.notes;
    return this.apiPost('/guests', body);
  }

  private async updateGuest(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.guest_id) return { content: [{ type: 'text', text: 'guest_id is required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.first_name) body.first_name = args.first_name;
    if (args.last_name) body.last_name = args.last_name;
    if (args.email) body.email = args.email;
    if (args.phone) body.phone = args.phone;
    if (args.notes) body.notes = args.notes;
    return this.apiPut(`/guests/${encodeURIComponent(args.guest_id as string)}`, body);
  }

  private async listShifts(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.restaurant_id || !args.date) {
      return { content: [{ type: 'text', text: 'restaurant_id and date are required' }], isError: true };
    }
    return this.apiGet(`/restaurants/${encodeURIComponent(args.restaurant_id as string)}/shifts`, { date: args.date as string });
  }

  private async getFloorPlan(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.restaurant_id) return { content: [{ type: 'text', text: 'restaurant_id is required' }], isError: true };
    return this.apiGet(`/restaurants/${encodeURIComponent(args.restaurant_id as string)}/floor_plan`);
  }
}

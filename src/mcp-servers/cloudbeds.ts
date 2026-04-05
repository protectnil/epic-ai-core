/**
 * Cloudbeds MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Base URL: https://api.cloudbeds.com
// Auth: OAuth2 Bearer token
// Docs: https://api.cloudbeds.com/api/docs/v1.2
// Rate limits: Not publicly documented; varies by plan

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface CloudbedsConfig {
  accessToken: string;
  baseUrl?: string;
}

export class CloudbedsMCPServer extends MCPAdapterBase {
  private readonly accessToken: string;
  private readonly baseUrl: string;

  constructor(config: CloudbedsConfig) {
    super();
    this.accessToken = config.accessToken;
    this.baseUrl = config.baseUrl || 'https://api.cloudbeds.com';
  }

  static catalog() {
    return {
      name: 'cloudbeds',
      displayName: 'Cloudbeds',
      version: '1.0.0',
      category: 'hospitality',
      keywords: ['cloudbeds', 'pms', 'hotel', 'property management', 'reservation', 'hospitality', 'housekeeping', 'front desk', 'booking', 'rooms'],
      toolNames: [
        'get_reservations', 'get_reservation', 'create_reservation',
        'get_guests', 'get_guest',
        'get_rooms', 'get_room_types', 'get_availability', 'get_rates',
        'post_payment', 'get_housekeeping', 'get_transactions', 'get_dashboard_stats',
      ],
      description: 'Cloudbeds PMS: manage hotel reservations, guests, rooms, availability, rates, payments, housekeeping, and transactions.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'get_reservations',
        description: 'List hotel reservations with optional filters for status, date range, and property',
        inputSchema: {
          type: 'object',
          properties: {
            property_id: {
              type: 'string',
              description: 'Property ID to filter reservations (optional if account has one property)',
            },
            status: {
              type: 'string',
              description: 'Reservation status filter: not_confirmed, confirmed, checked_in, checked_out, canceled, no_show',
            },
            start_date: {
              type: 'string',
              description: 'Filter by arrival date from (YYYY-MM-DD)',
            },
            end_date: {
              type: 'string',
              description: 'Filter by arrival date to (YYYY-MM-DD)',
            },
            page_number: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            page_size: {
              type: 'number',
              description: 'Number of results per page (default: 20, max: 100)',
            },
          },
        },
      },
      {
        name: 'get_reservation',
        description: 'Get detailed information for a specific hotel reservation by reservation ID',
        inputSchema: {
          type: 'object',
          properties: {
            reservation_id: {
              type: 'string',
              description: 'Unique reservation ID',
            },
          },
          required: ['reservation_id'],
        },
      },
      {
        name: 'create_reservation',
        description: 'Create a new hotel reservation for a guest with room, dates, and rate details',
        inputSchema: {
          type: 'object',
          properties: {
            property_id: {
              type: 'string',
              description: 'Property ID where the reservation will be created',
            },
            guest_id: {
              type: 'string',
              description: 'Existing guest ID (omit to create a new guest)',
            },
            guest_first_name: {
              type: 'string',
              description: 'Guest first name (required if guest_id not provided)',
            },
            guest_last_name: {
              type: 'string',
              description: 'Guest last name (required if guest_id not provided)',
            },
            guest_email: {
              type: 'string',
              description: 'Guest email address',
            },
            room_id: {
              type: 'string',
              description: 'Room ID to reserve',
            },
            start_date: {
              type: 'string',
              description: 'Check-in date (YYYY-MM-DD)',
            },
            end_date: {
              type: 'string',
              description: 'Check-out date (YYYY-MM-DD)',
            },
            adults: {
              type: 'number',
              description: 'Number of adult guests (default: 1)',
            },
            children: {
              type: 'number',
              description: 'Number of child guests (default: 0)',
            },
            rate_plan_id: {
              type: 'string',
              description: 'Rate plan ID to apply to the reservation',
            },
          },
          required: ['property_id', 'room_id', 'start_date', 'end_date'],
        },
      },
      {
        name: 'get_guests',
        description: 'List hotel guests with optional search by name or email',
        inputSchema: {
          type: 'object',
          properties: {
            property_id: {
              type: 'string',
              description: 'Property ID to filter guests',
            },
            search: {
              type: 'string',
              description: 'Search term for guest name or email',
            },
            page_number: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            page_size: {
              type: 'number',
              description: 'Results per page (default: 20)',
            },
          },
        },
      },
      {
        name: 'get_guest',
        description: 'Get detailed profile information for a specific hotel guest by guest ID',
        inputSchema: {
          type: 'object',
          properties: {
            guest_id: {
              type: 'string',
              description: 'Unique guest ID',
            },
          },
          required: ['guest_id'],
        },
      },
      {
        name: 'get_rooms',
        description: 'List all rooms for a property with their current status and details',
        inputSchema: {
          type: 'object',
          properties: {
            property_id: {
              type: 'string',
              description: 'Property ID to list rooms for',
            },
            room_type_id: {
              type: 'string',
              description: 'Filter by room type ID',
            },
          },
        },
      },
      {
        name: 'get_room_types',
        description: 'List room types for a property including capacity, amenities, and descriptions',
        inputSchema: {
          type: 'object',
          properties: {
            property_id: {
              type: 'string',
              description: 'Property ID to list room types for',
            },
          },
        },
      },
      {
        name: 'get_availability',
        description: 'Check room availability for a property over a date range',
        inputSchema: {
          type: 'object',
          properties: {
            property_id: {
              type: 'string',
              description: 'Property ID to check availability for',
            },
            start_date: {
              type: 'string',
              description: 'Start date for availability check (YYYY-MM-DD)',
            },
            end_date: {
              type: 'string',
              description: 'End date for availability check (YYYY-MM-DD)',
            },
            room_type_id: {
              type: 'string',
              description: 'Filter availability by room type ID',
            },
          },
          required: ['start_date', 'end_date'],
        },
      },
      {
        name: 'get_rates',
        description: 'Get rate plans and pricing for a property over a date range',
        inputSchema: {
          type: 'object',
          properties: {
            property_id: {
              type: 'string',
              description: 'Property ID to retrieve rates for',
            },
            start_date: {
              type: 'string',
              description: 'Start date for rate query (YYYY-MM-DD)',
            },
            end_date: {
              type: 'string',
              description: 'End date for rate query (YYYY-MM-DD)',
            },
            room_type_id: {
              type: 'string',
              description: 'Filter rates by room type ID',
            },
          },
          required: ['start_date', 'end_date'],
        },
      },
      {
        name: 'post_payment',
        description: 'Post a payment to a reservation in Cloudbeds PMS',
        inputSchema: {
          type: 'object',
          properties: {
            reservation_id: {
              type: 'string',
              description: 'Reservation ID to post the payment to',
            },
            amount: {
              type: 'number',
              description: 'Payment amount in the property currency',
            },
            payment_type: {
              type: 'string',
              description: 'Payment type: credit_card, cash, check, bank_transfer, other',
            },
            description: {
              type: 'string',
              description: 'Optional description or note for the payment',
            },
          },
          required: ['reservation_id', 'amount', 'payment_type'],
        },
      },
      {
        name: 'get_housekeeping',
        description: 'Get housekeeping status and tasks for rooms in a property',
        inputSchema: {
          type: 'object',
          properties: {
            property_id: {
              type: 'string',
              description: 'Property ID to retrieve housekeeping status for',
            },
            status: {
              type: 'string',
              description: 'Filter by housekeeping status: clean, dirty, inspected, out_of_order',
            },
          },
        },
      },
      {
        name: 'get_transactions',
        description: 'List financial transactions for a reservation or property with optional date filter',
        inputSchema: {
          type: 'object',
          properties: {
            reservation_id: {
              type: 'string',
              description: 'Filter transactions by reservation ID',
            },
            property_id: {
              type: 'string',
              description: 'Property ID to retrieve transactions for',
            },
            start_date: {
              type: 'string',
              description: 'Start date for transaction filter (YYYY-MM-DD)',
            },
            end_date: {
              type: 'string',
              description: 'End date for transaction filter (YYYY-MM-DD)',
            },
            page_number: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
          },
        },
      },
      {
        name: 'get_dashboard_stats',
        description: 'Get dashboard statistics for a property including occupancy, revenue, and arrivals/departures',
        inputSchema: {
          type: 'object',
          properties: {
            property_id: {
              type: 'string',
              description: 'Property ID to retrieve dashboard statistics for',
            },
            date: {
              type: 'string',
              description: 'Date for statistics snapshot (YYYY-MM-DD, default: today)',
            },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'get_reservations':
          return this.getReservations(args);
        case 'get_reservation':
          return this.getReservation(args);
        case 'create_reservation':
          return this.createReservation(args);
        case 'get_guests':
          return this.getGuests(args);
        case 'get_guest':
          return this.getGuest(args);
        case 'get_rooms':
          return this.getRooms(args);
        case 'get_room_types':
          return this.getRoomTypes(args);
        case 'get_availability':
          return this.getAvailability(args);
        case 'get_rates':
          return this.getRates(args);
        case 'post_payment':
          return this.postPayment(args);
        case 'get_housekeeping':
          return this.getHousekeeping(args);
        case 'get_transactions':
          return this.getTransactions(args);
        case 'get_dashboard_stats':
          return this.getDashboardStats(args);
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

  private authHeaders(): Record<string, string> {
    return {
      'Authorization': `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
    };
  }

  private async apiGet(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      headers: this.authHeaders(),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apiPost(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.authHeaders(),
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getReservations(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.property_id) params.set('propertyID', args.property_id as string);
    if (args.status) params.set('reservationStatus', args.status as string);
    if (args.start_date) params.set('startDate', args.start_date as string);
    if (args.end_date) params.set('endDate', args.end_date as string);
    params.set('pageNumber', String((args.page_number as number) || 1));
    params.set('pageSize', String((args.page_size as number) || 20));
    return this.apiGet(`/api/v1.2/getReservations?${params.toString()}`);
  }

  private async getReservation(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.reservation_id) {
      return { content: [{ type: 'text', text: 'reservation_id is required' }], isError: true };
    }
    const params = new URLSearchParams({ reservationID: args.reservation_id as string });
    return this.apiGet(`/api/v1.2/getReservation?${params.toString()}`);
  }

  private async createReservation(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.property_id || !args.room_id || !args.start_date || !args.end_date) {
      return { content: [{ type: 'text', text: 'property_id, room_id, start_date, and end_date are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      propertyID: args.property_id,
      roomID: args.room_id,
      startDate: args.start_date,
      endDate: args.end_date,
      adults: (args.adults as number) || 1,
      children: (args.children as number) || 0,
    };
    if (args.guest_id) body.guestID = args.guest_id;
    if (args.guest_first_name) body.guestFirstName = args.guest_first_name;
    if (args.guest_last_name) body.guestLastName = args.guest_last_name;
    if (args.guest_email) body.guestEmail = args.guest_email;
    if (args.rate_plan_id) body.ratePlanID = args.rate_plan_id;
    return this.apiPost('/api/v1.2/postReservation', body);
  }

  private async getGuests(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.property_id) params.set('propertyID', args.property_id as string);
    if (args.search) params.set('guestName', args.search as string);
    params.set('pageNumber', String((args.page_number as number) || 1));
    params.set('pageSize', String((args.page_size as number) || 20));
    return this.apiGet(`/api/v1.2/getGuests?${params.toString()}`);
  }

  private async getGuest(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.guest_id) {
      return { content: [{ type: 'text', text: 'guest_id is required' }], isError: true };
    }
    const params = new URLSearchParams({ guestID: args.guest_id as string });
    return this.apiGet(`/api/v1.2/getGuest?${params.toString()}`);
  }

  private async getRooms(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.property_id) params.set('propertyID', args.property_id as string);
    if (args.room_type_id) params.set('roomTypeID', args.room_type_id as string);
    return this.apiGet(`/api/v1.2/getRooms?${params.toString()}`);
  }

  private async getRoomTypes(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.property_id) params.set('propertyID', args.property_id as string);
    return this.apiGet(`/api/v1.2/getRoomTypes?${params.toString()}`);
  }

  private async getAvailability(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.start_date || !args.end_date) {
      return { content: [{ type: 'text', text: 'start_date and end_date are required' }], isError: true };
    }
    const params = new URLSearchParams({
      startDate: args.start_date as string,
      endDate: args.end_date as string,
    });
    if (args.property_id) params.set('propertyID', args.property_id as string);
    if (args.room_type_id) params.set('roomTypeID', args.room_type_id as string);
    return this.apiGet(`/api/v1.2/getAvailabilityCalendar?${params.toString()}`);
  }

  private async getRates(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.start_date || !args.end_date) {
      return { content: [{ type: 'text', text: 'start_date and end_date are required' }], isError: true };
    }
    const params = new URLSearchParams({
      startDate: args.start_date as string,
      endDate: args.end_date as string,
    });
    if (args.property_id) params.set('propertyID', args.property_id as string);
    if (args.room_type_id) params.set('roomTypeID', args.room_type_id as string);
    return this.apiGet(`/api/v1.2/getRates?${params.toString()}`);
  }

  private async postPayment(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.reservation_id || args.amount === undefined || !args.payment_type) {
      return { content: [{ type: 'text', text: 'reservation_id, amount, and payment_type are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      reservationID: args.reservation_id,
      amount: args.amount,
      type: args.payment_type,
    };
    if (args.description) body.description = args.description;
    return this.apiPost('/api/v1.2/postPayment', body);
  }

  private async getHousekeeping(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.property_id) params.set('propertyID', args.property_id as string);
    if (args.status) params.set('housekeepingStatus', args.status as string);
    return this.apiGet(`/api/v1.2/getHousekeepingStatus?${params.toString()}`);
  }

  private async getTransactions(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.reservation_id) params.set('reservationID', args.reservation_id as string);
    if (args.property_id) params.set('propertyID', args.property_id as string);
    if (args.start_date) params.set('startDate', args.start_date as string);
    if (args.end_date) params.set('endDate', args.end_date as string);
    params.set('pageNumber', String((args.page_number as number) || 1));
    return this.apiGet(`/api/v1.2/getTransactions?${params.toString()}`);
  }

  private async getDashboardStats(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.property_id) params.set('propertyID', args.property_id as string);
    if (args.date) params.set('date', args.date as string);
    return this.apiGet(`/api/v1.2/getDashboard?${params.toString()}`);
  }
}

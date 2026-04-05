/**
 * Oracle Opera PMS MCP Adapter (OHIP)
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Oracle Hospitality Integration Platform (OHIP) — REST API for Opera Property Management System.
// Oracle Opera is the world's most widely deployed hotel PMS, used by Marriott, Hilton, IHG, and thousands of independent properties.
// Base URL is configurable per property (e.g. https://{tenant}.hospitality.oracle.com/fidelio).
// Auth: OAuth2 client credentials — POST /oauth/token with client_id, client_secret, grant_type=client_credentials.
// Docs: https://docs.oracle.com/en/industries/hospitality/integration_platforms/ohip/
// Rate limits: Oracle-defined; typically 100 req/sec per app registration. Consult your OHIP app enrollment.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface OperaPmsConfig {
  baseUrl: string;
  clientId: string;
  clientSecret: string;
  hotelId?: string;
}

export class OperaPmsMCPServer extends MCPAdapterBase {
  private readonly baseUrl: string;
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly hotelId: string;
  private bearerToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(config: OperaPmsConfig) {
    super();
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.hotelId = config.hotelId || '';
  }

  static catalog() {
    return {
      name: 'opera-pms',
      displayName: 'Oracle Opera PMS (OHIP)',
      version: '1.0.0',
      category: 'hospitality',
      keywords: [
        'opera', 'oracle', 'ohip', 'pms', 'property management', 'hotel', 'hospitality',
        'reservation', 'guest', 'check-in', 'check-out', 'folio', 'housekeeping',
        'room', 'rate plan', 'profile', 'marriott', 'hilton', 'ihg',
      ],
      toolNames: [
        'search_reservations', 'get_reservation', 'create_reservation', 'update_reservation',
        'check_in', 'check_out', 'get_guest_profile', 'search_guests',
        'get_room_availability', 'get_rate_plans', 'post_charge',
        'get_folio', 'get_housekeeping_status', 'update_room_status',
      ],
      description: 'Oracle Opera PMS via OHIP: manage hotel reservations, guest profiles, room availability, rate plans, folios, charges, and housekeeping status for any Opera-powered property.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'search_reservations',
        description: 'Search hotel reservations by guest name, confirmation number, arrival/departure dates, or room number',
        inputSchema: {
          type: 'object',
          properties: {
            hotel_id: {
              type: 'string',
              description: 'Opera hotel ID (uses configured default if omitted)',
            },
            confirmation_number: {
              type: 'string',
              description: 'Reservation confirmation number',
            },
            guest_name: {
              type: 'string',
              description: 'Guest surname or full name to search',
            },
            arrival_date: {
              type: 'string',
              description: 'Arrival date in YYYY-MM-DD format',
            },
            departure_date: {
              type: 'string',
              description: 'Departure date in YYYY-MM-DD format',
            },
            room_number: {
              type: 'string',
              description: 'Room number to find current or upcoming guest',
            },
            reservation_status: {
              type: 'string',
              description: 'Reservation status: Reserved, CheckedIn, CheckedOut, Cancelled, NoShow',
            },
            limit: {
              type: 'number',
              description: 'Maximum results to return (default: 20)',
            },
          },
        },
      },
      {
        name: 'get_reservation',
        description: 'Retrieve full details for a single Opera reservation by reservation ID',
        inputSchema: {
          type: 'object',
          properties: {
            reservation_id: {
              type: 'string',
              description: 'Opera reservation ID',
            },
            hotel_id: {
              type: 'string',
              description: 'Opera hotel ID (uses configured default if omitted)',
            },
          },
          required: ['reservation_id'],
        },
      },
      {
        name: 'create_reservation',
        description: 'Create a new hotel reservation in Opera PMS',
        inputSchema: {
          type: 'object',
          properties: {
            hotel_id: {
              type: 'string',
              description: 'Opera hotel ID (uses configured default if omitted)',
            },
            profile_id: {
              type: 'string',
              description: 'Existing Opera guest profile ID (use instead of guest name fields if known)',
            },
            guest_first_name: {
              type: 'string',
              description: 'Guest first name (used when creating without an existing profile)',
            },
            guest_last_name: {
              type: 'string',
              description: 'Guest last name',
            },
            arrival_date: {
              type: 'string',
              description: 'Arrival date in YYYY-MM-DD format (required)',
            },
            departure_date: {
              type: 'string',
              description: 'Departure date in YYYY-MM-DD format (required)',
            },
            room_type: {
              type: 'string',
              description: 'Room type code (e.g. KING, DBL, SUITE)',
            },
            rate_plan_code: {
              type: 'string',
              description: 'Rate plan code for pricing',
            },
            adults: {
              type: 'number',
              description: 'Number of adults (default: 1)',
            },
            children: {
              type: 'number',
              description: 'Number of children (default: 0)',
            },
            comments: {
              type: 'string',
              description: 'Reservation comments or special requests',
            },
          },
          required: ['arrival_date', 'departure_date'],
        },
      },
      {
        name: 'update_reservation',
        description: 'Update an existing Opera reservation (dates, room type, rate plan, comments)',
        inputSchema: {
          type: 'object',
          properties: {
            reservation_id: {
              type: 'string',
              description: 'Opera reservation ID to update (required)',
            },
            hotel_id: {
              type: 'string',
              description: 'Opera hotel ID (uses configured default if omitted)',
            },
            arrival_date: {
              type: 'string',
              description: 'New arrival date in YYYY-MM-DD format',
            },
            departure_date: {
              type: 'string',
              description: 'New departure date in YYYY-MM-DD format',
            },
            room_type: {
              type: 'string',
              description: 'New room type code',
            },
            rate_plan_code: {
              type: 'string',
              description: 'New rate plan code',
            },
            room_number: {
              type: 'string',
              description: 'Assign a specific room number',
            },
            comments: {
              type: 'string',
              description: 'Updated comments or special requests',
            },
          },
          required: ['reservation_id'],
        },
      },
      {
        name: 'check_in',
        description: 'Perform check-in for a guest reservation in Opera PMS',
        inputSchema: {
          type: 'object',
          properties: {
            reservation_id: {
              type: 'string',
              description: 'Opera reservation ID to check in (required)',
            },
            hotel_id: {
              type: 'string',
              description: 'Opera hotel ID (uses configured default if omitted)',
            },
            room_number: {
              type: 'string',
              description: 'Room number to assign at check-in (overrides pre-assigned room)',
            },
          },
          required: ['reservation_id'],
        },
      },
      {
        name: 'check_out',
        description: 'Perform check-out for a guest reservation in Opera PMS',
        inputSchema: {
          type: 'object',
          properties: {
            reservation_id: {
              type: 'string',
              description: 'Opera reservation ID to check out (required)',
            },
            hotel_id: {
              type: 'string',
              description: 'Opera hotel ID (uses configured default if omitted)',
            },
          },
          required: ['reservation_id'],
        },
      },
      {
        name: 'get_guest_profile',
        description: 'Retrieve an Opera guest profile by profile ID',
        inputSchema: {
          type: 'object',
          properties: {
            profile_id: {
              type: 'string',
              description: 'Opera guest profile ID (required)',
            },
          },
          required: ['profile_id'],
        },
      },
      {
        name: 'search_guests',
        description: 'Search Opera guest profiles by name, email, phone, or loyalty number',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Guest surname or full name',
            },
            email: {
              type: 'string',
              description: 'Guest email address',
            },
            phone: {
              type: 'string',
              description: 'Guest phone number',
            },
            membership_number: {
              type: 'string',
              description: 'Loyalty/membership number',
            },
            limit: {
              type: 'number',
              description: 'Maximum results to return (default: 20)',
            },
          },
        },
      },
      {
        name: 'get_room_availability',
        description: 'Check room availability and inventory by room type for a date range',
        inputSchema: {
          type: 'object',
          properties: {
            hotel_id: {
              type: 'string',
              description: 'Opera hotel ID (uses configured default if omitted)',
            },
            arrival_date: {
              type: 'string',
              description: 'Arrival date in YYYY-MM-DD format (required)',
            },
            departure_date: {
              type: 'string',
              description: 'Departure date in YYYY-MM-DD format (required)',
            },
            room_type: {
              type: 'string',
              description: 'Room type code to check (omit to see all types)',
            },
            adults: {
              type: 'number',
              description: 'Number of adults to filter by occupancy (default: 1)',
            },
          },
          required: ['arrival_date', 'departure_date'],
        },
      },
      {
        name: 'get_rate_plans',
        description: 'Retrieve available rate plans for a hotel and date range',
        inputSchema: {
          type: 'object',
          properties: {
            hotel_id: {
              type: 'string',
              description: 'Opera hotel ID (uses configured default if omitted)',
            },
            arrival_date: {
              type: 'string',
              description: 'Arrival date in YYYY-MM-DD format',
            },
            departure_date: {
              type: 'string',
              description: 'Departure date in YYYY-MM-DD format',
            },
            room_type: {
              type: 'string',
              description: 'Room type code to filter applicable rates',
            },
          },
        },
      },
      {
        name: 'post_charge',
        description: 'Post a charge to a guest folio for a reservation',
        inputSchema: {
          type: 'object',
          properties: {
            reservation_id: {
              type: 'string',
              description: 'Opera reservation ID to post charge to (required)',
            },
            hotel_id: {
              type: 'string',
              description: 'Opera hotel ID (uses configured default if omitted)',
            },
            transaction_code: {
              type: 'string',
              description: 'Transaction/charge code (e.g. RB for room service, LQ for minibar)',
            },
            amount: {
              type: 'number',
              description: 'Charge amount (required)',
            },
            currency_code: {
              type: 'string',
              description: 'Currency code (e.g. USD, EUR) (default: property currency)',
            },
            description: {
              type: 'string',
              description: 'Charge description or reference',
            },
            folio_window: {
              type: 'number',
              description: 'Folio window number (default: 1)',
            },
          },
          required: ['reservation_id', 'transaction_code', 'amount'],
        },
      },
      {
        name: 'get_folio',
        description: 'Retrieve the guest folio (bill) for a reservation',
        inputSchema: {
          type: 'object',
          properties: {
            reservation_id: {
              type: 'string',
              description: 'Opera reservation ID (required)',
            },
            hotel_id: {
              type: 'string',
              description: 'Opera hotel ID (uses configured default if omitted)',
            },
            folio_window: {
              type: 'number',
              description: 'Folio window number (default: 1 for the primary folio)',
            },
          },
          required: ['reservation_id'],
        },
      },
      {
        name: 'get_housekeeping_status',
        description: 'Retrieve housekeeping status for all rooms or a specific room in the property',
        inputSchema: {
          type: 'object',
          properties: {
            hotel_id: {
              type: 'string',
              description: 'Opera hotel ID (uses configured default if omitted)',
            },
            room_number: {
              type: 'string',
              description: 'Specific room number (omit to get all rooms)',
            },
            floor: {
              type: 'string',
              description: 'Floor number to filter rooms',
            },
            housekeeping_status: {
              type: 'string',
              description: 'Status filter: Clean, Dirty, Inspected, OutOfService, OutOfOrder',
            },
          },
        },
      },
      {
        name: 'update_room_status',
        description: 'Update the housekeeping status for a specific room',
        inputSchema: {
          type: 'object',
          properties: {
            hotel_id: {
              type: 'string',
              description: 'Opera hotel ID (uses configured default if omitted)',
            },
            room_number: {
              type: 'string',
              description: 'Room number to update (required)',
            },
            housekeeping_status: {
              type: 'string',
              description: 'New housekeeping status: Clean, Dirty, Inspected, OutOfService, OutOfOrder (required)',
            },
            notes: {
              type: 'string',
              description: 'Housekeeping notes or reason for status change',
            },
          },
          required: ['room_number', 'housekeeping_status'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'search_reservations':
          return this.searchReservations(args);
        case 'get_reservation':
          return this.getReservation(args);
        case 'create_reservation':
          return this.createReservation(args);
        case 'update_reservation':
          return this.updateReservation(args);
        case 'check_in':
          return this.checkIn(args);
        case 'check_out':
          return this.checkOut(args);
        case 'get_guest_profile':
          return this.getGuestProfile(args);
        case 'search_guests':
          return this.searchGuests(args);
        case 'get_room_availability':
          return this.getRoomAvailability(args);
        case 'get_rate_plans':
          return this.getRatePlans(args);
        case 'post_charge':
          return this.postCharge(args);
        case 'get_folio':
          return this.getFolio(args);
        case 'get_housekeeping_status':
          return this.getHousekeepingStatus(args);
        case 'update_room_status':
          return this.updateRoomStatus(args);
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
    const response = await this.fetchWithRetry(`${this.baseUrl}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: this.clientId,
        client_secret: this.clientSecret,
      }).toString(),
    });
    if (!response.ok) {
      throw new Error(`OAuth2 token request failed: ${response.status} ${response.statusText}`);
    }
    const data = await response.json() as { access_token: string; expires_in: number };
    this.bearerToken = data.access_token;
    this.tokenExpiry = now + (data.expires_in - 60) * 1000;
    return this.bearerToken;
  }

  private async authHeaders(): Promise<Record<string, string>> {
    const token = await this.getOrRefreshToken();
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
  }

  private resolveHotelId(args: Record<string, unknown>): string {
    return (args.hotel_id as string) || this.hotelId;
  }

  private async apiGet(path: string): Promise<ToolResult> {
    const headers = await this.authHeaders();
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, { method: 'GET', headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apiPost(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const headers = await this.authHeaders();
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apiPut(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const headers = await this.authHeaders();
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private buildParams(fields: Record<string, string | number | undefined>): string {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined && value !== null && value !== '') {
        params.set(key, String(value));
      }
    }
    const qs = params.toString();
    return qs ? `?${qs}` : '';
  }

  private async searchReservations(args: Record<string, unknown>): Promise<ToolResult> {
    const hotelId = this.resolveHotelId(args);
    const qs = this.buildParams({
      confirmationNumber: args.confirmation_number as string,
      guestName: args.guest_name as string,
      arrivalDate: args.arrival_date as string,
      departureDate: args.departure_date as string,
      roomNumber: args.room_number as string,
      reservationStatus: args.reservation_status as string,
      limit: (args.limit as number) || 20,
    });
    return this.apiGet(`/hsuite/v1/hotels/${encodeURIComponent(hotelId)}/reservations${qs}`);
  }

  private async getReservation(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.reservation_id) {
      return { content: [{ type: 'text', text: 'reservation_id is required' }], isError: true };
    }
    const hotelId = this.resolveHotelId(args);
    return this.apiGet(`/hsuite/v1/hotels/${encodeURIComponent(hotelId)}/reservations/${encodeURIComponent(args.reservation_id as string)}`);
  }

  private async createReservation(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.arrival_date || !args.departure_date) {
      return { content: [{ type: 'text', text: 'arrival_date and departure_date are required' }], isError: true };
    }
    const hotelId = this.resolveHotelId(args);
    const body: Record<string, unknown> = {
      arrivalDate: args.arrival_date,
      departureDate: args.departure_date,
      adults: (args.adults as number) || 1,
      children: (args.children as number) || 0,
    };
    if (args.profile_id) body.profileId = args.profile_id;
    if (args.guest_first_name) body.guestFirstName = args.guest_first_name;
    if (args.guest_last_name) body.guestLastName = args.guest_last_name;
    if (args.room_type) body.roomType = args.room_type;
    if (args.rate_plan_code) body.ratePlanCode = args.rate_plan_code;
    if (args.comments) body.comments = args.comments;
    return this.apiPost(`/hsuite/v1/hotels/${encodeURIComponent(hotelId)}/reservations`, body);
  }

  private async updateReservation(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.reservation_id) {
      return { content: [{ type: 'text', text: 'reservation_id is required' }], isError: true };
    }
    const hotelId = this.resolveHotelId(args);
    const body: Record<string, unknown> = {};
    if (args.arrival_date) body.arrivalDate = args.arrival_date;
    if (args.departure_date) body.departureDate = args.departure_date;
    if (args.room_type) body.roomType = args.room_type;
    if (args.rate_plan_code) body.ratePlanCode = args.rate_plan_code;
    if (args.room_number) body.roomNumber = args.room_number;
    if (args.comments) body.comments = args.comments;
    return this.apiPut(`/hsuite/v1/hotels/${encodeURIComponent(hotelId)}/reservations/${encodeURIComponent(args.reservation_id as string)}`, body);
  }

  private async checkIn(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.reservation_id) {
      return { content: [{ type: 'text', text: 'reservation_id is required' }], isError: true };
    }
    const hotelId = this.resolveHotelId(args);
    const body: Record<string, unknown> = {};
    if (args.room_number) body.roomNumber = args.room_number;
    return this.apiPost(`/hsuite/v1/hotels/${encodeURIComponent(hotelId)}/reservations/${encodeURIComponent(args.reservation_id as string)}/checkIn`, body);
  }

  private async checkOut(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.reservation_id) {
      return { content: [{ type: 'text', text: 'reservation_id is required' }], isError: true };
    }
    const hotelId = this.resolveHotelId(args);
    return this.apiPost(`/hsuite/v1/hotels/${encodeURIComponent(hotelId)}/reservations/${encodeURIComponent(args.reservation_id as string)}/checkOut`, {});
  }

  private async getGuestProfile(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.profile_id) {
      return { content: [{ type: 'text', text: 'profile_id is required' }], isError: true };
    }
    return this.apiGet(`/hsuite/v1/profiles/${encodeURIComponent(args.profile_id as string)}`);
  }

  private async searchGuests(args: Record<string, unknown>): Promise<ToolResult> {
    const qs = this.buildParams({
      name: args.name as string,
      email: args.email as string,
      phone: args.phone as string,
      membershipNumber: args.membership_number as string,
      limit: (args.limit as number) || 20,
    });
    return this.apiGet(`/hsuite/v1/profiles${qs}`);
  }

  private async getRoomAvailability(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.arrival_date || !args.departure_date) {
      return { content: [{ type: 'text', text: 'arrival_date and departure_date are required' }], isError: true };
    }
    const hotelId = this.resolveHotelId(args);
    const qs = this.buildParams({
      arrivalDate: args.arrival_date as string,
      departureDate: args.departure_date as string,
      roomType: args.room_type as string,
      adults: (args.adults as number) || 1,
    });
    return this.apiGet(`/hsuite/v1/hotels/${encodeURIComponent(hotelId)}/availability${qs}`);
  }

  private async getRatePlans(args: Record<string, unknown>): Promise<ToolResult> {
    const hotelId = this.resolveHotelId(args);
    const qs = this.buildParams({
      arrivalDate: args.arrival_date as string,
      departureDate: args.departure_date as string,
      roomType: args.room_type as string,
    });
    return this.apiGet(`/hsuite/v1/hotels/${encodeURIComponent(hotelId)}/ratePlans${qs}`);
  }

  private async postCharge(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.reservation_id || !args.transaction_code || args.amount === undefined) {
      return { content: [{ type: 'text', text: 'reservation_id, transaction_code, and amount are required' }], isError: true };
    }
    const hotelId = this.resolveHotelId(args);
    const body: Record<string, unknown> = {
      transactionCode: args.transaction_code,
      amount: args.amount,
      folioWindow: (args.folio_window as number) || 1,
    };
    if (args.currency_code) body.currencyCode = args.currency_code;
    if (args.description) body.description = args.description;
    return this.apiPost(`/hsuite/v1/hotels/${encodeURIComponent(hotelId)}/reservations/${encodeURIComponent(args.reservation_id as string)}/charges`, body);
  }

  private async getFolio(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.reservation_id) {
      return { content: [{ type: 'text', text: 'reservation_id is required' }], isError: true };
    }
    const hotelId = this.resolveHotelId(args);
    const window = (args.folio_window as number) || 1;
    return this.apiGet(`/hsuite/v1/hotels/${encodeURIComponent(hotelId)}/reservations/${encodeURIComponent(args.reservation_id as string)}/folios/${window}`);
  }

  private async getHousekeepingStatus(args: Record<string, unknown>): Promise<ToolResult> {
    const hotelId = this.resolveHotelId(args);
    const qs = this.buildParams({
      roomNumber: args.room_number as string,
      floor: args.floor as string,
      housekeepingStatus: args.housekeeping_status as string,
    });
    return this.apiGet(`/hsuite/v1/hotels/${encodeURIComponent(hotelId)}/housekeeping${qs}`);
  }

  private async updateRoomStatus(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.room_number || !args.housekeeping_status) {
      return { content: [{ type: 'text', text: 'room_number and housekeeping_status are required' }], isError: true };
    }
    const hotelId = this.resolveHotelId(args);
    const body: Record<string, unknown> = {
      housekeepingStatus: args.housekeeping_status,
    };
    if (args.notes) body.notes = args.notes;
    return this.apiPut(`/hsuite/v1/hotels/${encodeURIComponent(hotelId)}/housekeeping/${encodeURIComponent(args.room_number as string)}`, body);
  }
}

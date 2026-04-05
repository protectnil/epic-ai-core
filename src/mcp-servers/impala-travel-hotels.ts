/**
 * Impala Travel Hotels MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// No official Impala Travel MCP server was found on GitHub.
// We build a full REST wrapper covering hotel listings, bookings, and rate plans.
//
// Base URL: https://sandbox.impala.travel/v1
// Auth: API key via x-api-key header
// Docs: https://docs.impala.travel/
// Rate limits: Sandbox — refer to account dashboard; production varies by plan

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface ImpalaHotelsConfig {
  apiKey: string;
  baseUrl?: string;
}

export class ImpalaHotelsMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: ImpalaHotelsConfig) {
    super();
    this.apiKey   = config.apiKey;
    this.baseUrl  = config.baseUrl || 'https://sandbox.impala.travel/v1';
  }

  static catalog() {
    return {
      name: 'impala-travel-hotels',
      displayName: 'Impala Travel Hotels',
      version: '1.0.0',
      category: 'travel',
      keywords: [
        'impala', 'travel', 'hotel', 'hotels', 'booking', 'bookings', 'accommodation',
        'hospitality', 'rate-plan', 'rate plan', 'room', 'cancel', 'reservation',
        'hotel search', 'property', 'lodging', 'check-in', 'check-out',
      ],
      toolNames: [
        'list_hotels',
        'retrieve_hotel',
        'list_rate_plans',
        'get_rate_plan',
        'list_bookings',
        'create_booking',
        'retrieve_booking',
        'update_booking',
        'cancel_booking',
        'update_booking_contact',
      ],
      description: 'Impala Travel Hotels API: search hotels, view rate plans, and manage the full booking lifecycle including create, update, and cancel.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      // ── Hotels ────────────────────────────────────────────────────────────────
      {
        name: 'list_hotels',
        description: 'List all hotels available in the Impala inventory — returns hotel ids, names, locations, and amenity summaries',
        inputSchema: {
          type: 'object',
          properties: {
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            pageSize: {
              type: 'number',
              description: 'Number of hotels per page (default: 20, max: 100)',
            },
          },
        },
      },
      {
        name: 'retrieve_hotel',
        description: 'Retrieve full details for a single hotel by its ID — includes amenities, images, location, and policies',
        inputSchema: {
          type: 'object',
          properties: {
            hotelId: {
              type: 'string',
              description: 'The unique hotel identifier returned by list_hotels',
            },
          },
          required: ['hotelId'],
        },
      },
      // ── Rate Plans ────────────────────────────────────────────────────────────
      {
        name: 'list_rate_plans',
        description: 'List all rate plans (rate calendar) for a hotel — shows available room types, nightly prices, and availability windows',
        inputSchema: {
          type: 'object',
          properties: {
            hotelId: {
              type: 'string',
              description: 'The hotel ID to retrieve rate plans for',
            },
            startDate: {
              type: 'string',
              description: 'Start date for the rate calendar in YYYY-MM-DD format',
            },
            endDate: {
              type: 'string',
              description: 'End date for the rate calendar in YYYY-MM-DD format',
            },
          },
          required: ['hotelId'],
        },
      },
      {
        name: 'get_rate_plan',
        description: 'Get a specific rate plan for a hotel by rate plan ID — returns nightly prices and availability for that plan',
        inputSchema: {
          type: 'object',
          properties: {
            hotelId: {
              type: 'string',
              description: 'The hotel ID',
            },
            ratePlanId: {
              type: 'string',
              description: 'The rate plan ID to retrieve',
            },
          },
          required: ['hotelId', 'ratePlanId'],
        },
      },
      // ── Bookings ──────────────────────────────────────────────────────────────
      {
        name: 'list_bookings',
        description: 'List all bookings in the account — returns booking IDs, status, hotel, guest info, and dates',
        inputSchema: {
          type: 'object',
          properties: {
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            pageSize: {
              type: 'number',
              description: 'Number of bookings per page (default: 20)',
            },
          },
        },
      },
      {
        name: 'create_booking',
        description: 'Create a new hotel booking — reserves a room for a guest at a specified hotel with check-in/check-out dates',
        inputSchema: {
          type: 'object',
          properties: {
            hotelId: {
              type: 'string',
              description: 'The hotel ID to book',
            },
            ratePlanId: {
              type: 'string',
              description: 'The rate plan ID to book under',
            },
            checkIn: {
              type: 'string',
              description: 'Check-in date in YYYY-MM-DD format',
            },
            checkOut: {
              type: 'string',
              description: 'Check-out date in YYYY-MM-DD format',
            },
            guestFirstName: {
              type: 'string',
              description: 'Guest first name',
            },
            guestLastName: {
              type: 'string',
              description: 'Guest last name',
            },
            guestEmail: {
              type: 'string',
              description: 'Guest email address',
            },
            guestPhone: {
              type: 'string',
              description: 'Guest phone number including country code (e.g. +12125551234)',
            },
            specialRequests: {
              type: 'string',
              description: 'Optional special requests or notes for the booking',
            },
          },
          required: ['hotelId', 'ratePlanId', 'checkIn', 'checkOut', 'guestFirstName', 'guestLastName', 'guestEmail'],
        },
      },
      {
        name: 'retrieve_booking',
        description: 'Retrieve full details of a single booking by its ID — includes status, guest info, room, and dates',
        inputSchema: {
          type: 'object',
          properties: {
            bookingId: {
              type: 'string',
              description: 'The unique booking ID',
            },
          },
          required: ['bookingId'],
        },
      },
      {
        name: 'update_booking',
        description: 'Update a hotel booking — change dates, rate plan, or other booking details',
        inputSchema: {
          type: 'object',
          properties: {
            bookingId: {
              type: 'string',
              description: 'The unique booking ID to update',
            },
            checkIn: {
              type: 'string',
              description: 'New check-in date in YYYY-MM-DD format (optional)',
            },
            checkOut: {
              type: 'string',
              description: 'New check-out date in YYYY-MM-DD format (optional)',
            },
            ratePlanId: {
              type: 'string',
              description: 'New rate plan ID (optional)',
            },
            specialRequests: {
              type: 'string',
              description: 'Updated special requests (optional)',
            },
          },
          required: ['bookingId'],
        },
      },
      {
        name: 'cancel_booking',
        description: 'Cancel an existing hotel booking by its ID — sends cancellation to the property',
        inputSchema: {
          type: 'object',
          properties: {
            bookingId: {
              type: 'string',
              description: 'The unique booking ID to cancel',
            },
          },
          required: ['bookingId'],
        },
      },
      {
        name: 'update_booking_contact',
        description: 'Update the contact information for a booking — change guest name, email, or phone number',
        inputSchema: {
          type: 'object',
          properties: {
            bookingId: {
              type: 'string',
              description: 'The unique booking ID',
            },
            firstName: {
              type: 'string',
              description: 'Updated guest first name',
            },
            lastName: {
              type: 'string',
              description: 'Updated guest last name',
            },
            email: {
              type: 'string',
              description: 'Updated guest email address',
            },
            phone: {
              type: 'string',
              description: 'Updated guest phone number including country code',
            },
          },
          required: ['bookingId'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_hotels':          return this.listHotels(args);
        case 'retrieve_hotel':       return this.retrieveHotel(args);
        case 'list_rate_plans':      return this.listRatePlans(args);
        case 'get_rate_plan':        return this.getRatePlan(args);
        case 'list_bookings':        return this.listBookings(args);
        case 'create_booking':       return this.createBooking(args);
        case 'retrieve_booking':     return this.retrieveBooking(args);
        case 'update_booking':       return this.updateBooking(args);
        case 'cancel_booking':       return this.cancelBooking(args);
        case 'update_booking_contact': return this.updateBookingContact(args);
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

  private async get(path: string, params: Record<string, string> = {}): Promise<ToolResult> {
    const qs = Object.keys(params).length > 0 ? '?' + new URLSearchParams(params).toString() : '';
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}${qs}`, {
      headers: {
        'x-api-key': this.apiKey,
        Accept: 'application/json',
      },
    });
    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async post(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: {
        'x-api-key': this.apiKey,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async put(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'PUT',
      headers: {
        'x-api-key': this.apiKey,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async del(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'DELETE',
      headers: {
        'x-api-key': this.apiKey,
        Accept: 'application/json',
      },
    });
    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }
    const data = response.status !== 204 ? await response.json() : { success: true };
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  // ── Hotels ────────────────────────────────────────────────────────────────

  private listHotels(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (args.page)     params.page     = String(args.page);
    if (args.pageSize) params.pageSize = String(args.pageSize);
    return this.get('/hotels', params);
  }

  private retrieveHotel(args: Record<string, unknown>): Promise<ToolResult> {
    return this.get(`/hotels/${args.hotelId}`);
  }

  // ── Rate Plans ────────────────────────────────────────────────────────────

  private listRatePlans(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (args.startDate) params.startDate = String(args.startDate);
    if (args.endDate)   params.endDate   = String(args.endDate);
    return this.get(`/hotels/${args.hotelId}/rate-plans`, params);
  }

  private getRatePlan(args: Record<string, unknown>): Promise<ToolResult> {
    return this.get(`/hotels/${args.hotelId}/rate-plans/${args.ratePlanId}`);
  }

  // ── Bookings ──────────────────────────────────────────────────────────────

  private listBookings(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (args.page)     params.page     = String(args.page);
    if (args.pageSize) params.pageSize = String(args.pageSize);
    return this.get('/bookings', params);
  }

  private createBooking(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {
      hotelId:  args.hotelId,
      ratePlanId: args.ratePlanId,
      checkIn:  args.checkIn,
      checkOut: args.checkOut,
      bookingContact: {
        firstName: args.guestFirstName,
        lastName:  args.guestLastName,
        email:     args.guestEmail,
      },
    };
    if (args.guestPhone)       (body.bookingContact as Record<string,unknown>).phone = args.guestPhone;
    if (args.specialRequests)  body.specialRequests = args.specialRequests;
    return this.post('/bookings', body);
  }

  private retrieveBooking(args: Record<string, unknown>): Promise<ToolResult> {
    return this.get(`/bookings/${args.bookingId}`);
  }

  private updateBooking(args: Record<string, unknown>): Promise<ToolResult> {
    const { bookingId, ...rest } = args;
    return this.put(`/bookings/${bookingId}`, rest);
  }

  private cancelBooking(args: Record<string, unknown>): Promise<ToolResult> {
    return this.del(`/bookings/${args.bookingId}`);
  }

  private updateBookingContact(args: Record<string, unknown>): Promise<ToolResult> {
    const { bookingId, ...contact } = args;
    return this.put(`/bookings/${bookingId}/booking-contact`, contact);
  }
}

/**
 * Mews PMS MCP Adapter (Connector API)
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Mews Connector API — REST API for Mews Hotel PMS.
// Mews is a cloud-native PMS used by Accor, Generator, Mama Shelter, and thousands of independent hotels.
// Base URL: https://api.mews.com (production) or https://api.mews-demo.com (sandbox).
// Auth: Client Token + Access Token pair sent in every request body.
// Docs: https://mews-systems.gitbook.io/connector-api/
// Rate limits: 3,000 req/min for most endpoints; 300 req/min for reporting endpoints.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface MewsConfig {
  clientToken: string;
  accessToken: string;
  baseUrl?: string;
}

export class MewsMCPServer extends MCPAdapterBase {
  private readonly clientToken: string;
  private readonly accessToken: string;
  private readonly baseUrl: string;

  constructor(config: MewsConfig) {
    super();
    this.clientToken = config.clientToken;
    this.accessToken = config.accessToken;
    this.baseUrl = (config.baseUrl || 'https://api.mews.com').replace(/\/$/, '');
  }

  static catalog() {
    return {
      name: 'mews',
      displayName: 'Mews PMS',
      version: '1.0.0',
      category: 'hospitality',
      keywords: [
        'mews', 'pms', 'hotel', 'property management', 'hospitality', 'reservation',
        'guest', 'room', 'space', 'availability', 'rate', 'accounting', 'bill',
        'service', 'outlet', 'connector api', 'accor', 'generator',
      ],
      toolNames: [
        'search_reservations', 'get_reservation', 'get_customers', 'get_customer',
        'get_spaces', 'get_availability', 'get_rates', 'add_reservation',
        'update_reservation', 'get_accounting_items', 'get_bills', 'close_bill',
        'get_services', 'get_outlets',
      ],
      description: 'Mews PMS via Connector API: manage hotel reservations, guest profiles, room availability, rates, accounting items, bills, and services for any Mews-powered property.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'search_reservations',
        description: 'Search Mews reservations by start/end interval, state, or customer IDs',
        inputSchema: {
          type: 'object',
          properties: {
            start_utc: {
              type: 'string',
              description: 'Search interval start in ISO 8601 UTC format (e.g. 2024-06-01T00:00:00Z)',
            },
            end_utc: {
              type: 'string',
              description: 'Search interval end in ISO 8601 UTC format',
            },
            time_filter: {
              type: 'string',
              description: 'Which reservation timestamps to match against the interval: Collision (any overlap, default), Creation, Start, End, Cancellation',
            },
            states: {
              type: 'array',
              items: { type: 'string' },
              description: 'Reservation states to filter: Enquired, Requested, Optional, Confirmed, Started, Processed, Cancelled',
            },
            customer_ids: {
              type: 'array',
              items: { type: 'string' },
              description: 'List of Mews customer IDs to filter reservations',
            },
            limit: {
              type: 'number',
              description: 'Maximum results per page (default: 50, max: 1000)',
            },
          },
        },
      },
      {
        name: 'get_reservation',
        description: 'Retrieve a single Mews reservation by its reservation ID',
        inputSchema: {
          type: 'object',
          properties: {
            reservation_id: {
              type: 'string',
              description: 'Mews reservation (booking) ID (required)',
            },
          },
          required: ['reservation_id'],
        },
      },
      {
        name: 'get_customers',
        description: 'Search Mews customer (guest) profiles by name, email, or customer IDs',
        inputSchema: {
          type: 'object',
          properties: {
            customer_ids: {
              type: 'array',
              items: { type: 'string' },
              description: 'List of specific Mews customer IDs to retrieve',
            },
            emails: {
              type: 'array',
              items: { type: 'string' },
              description: 'List of email addresses to search for',
            },
            first_name: {
              type: 'string',
              description: 'Customer first name (partial match)',
            },
            last_name: {
              type: 'string',
              description: 'Customer last name (partial match)',
            },
            limit: {
              type: 'number',
              description: 'Maximum results to return (default: 50)',
            },
          },
        },
      },
      {
        name: 'get_customer',
        description: 'Retrieve a single Mews customer (guest) profile by customer ID',
        inputSchema: {
          type: 'object',
          properties: {
            customer_id: {
              type: 'string',
              description: 'Mews customer ID (required)',
            },
          },
          required: ['customer_id'],
        },
      },
      {
        name: 'get_spaces',
        description: 'Retrieve all spaces (rooms and bookable units) configured in the Mews property',
        inputSchema: {
          type: 'object',
          properties: {
            space_ids: {
              type: 'array',
              items: { type: 'string' },
              description: 'Specific space IDs to retrieve (omit for all spaces)',
            },
            space_type_ids: {
              type: 'array',
              items: { type: 'string' },
              description: 'Space type IDs to filter by room category',
            },
          },
        },
      },
      {
        name: 'get_availability',
        description: 'Get space (room) availability for a date range, returning available counts by space type',
        inputSchema: {
          type: 'object',
          properties: {
            start_utc: {
              type: 'string',
              description: 'Availability start date in ISO 8601 UTC format (required)',
            },
            end_utc: {
              type: 'string',
              description: 'Availability end date in ISO 8601 UTC format (required)',
            },
            space_type_ids: {
              type: 'array',
              items: { type: 'string' },
              description: 'Space type IDs to check (omit for all types)',
            },
          },
          required: ['start_utc', 'end_utc'],
        },
      },
      {
        name: 'get_rates',
        description: 'Retrieve rate plans and pricing configured for the Mews property',
        inputSchema: {
          type: 'object',
          properties: {
            rate_ids: {
              type: 'array',
              items: { type: 'string' },
              description: 'Specific rate IDs to retrieve (omit for all rates)',
            },
            service_ids: {
              type: 'array',
              items: { type: 'string' },
              description: 'Service IDs to filter rates by booking service',
            },
          },
        },
      },
      {
        name: 'add_reservation',
        description: 'Create one or more new reservations in Mews PMS',
        inputSchema: {
          type: 'object',
          properties: {
            service_id: {
              type: 'string',
              description: 'Mews service ID for the booking (accommodation service ID) (required)',
            },
            start_utc: {
              type: 'string',
              description: 'Reservation start (arrival) in ISO 8601 UTC format (required)',
            },
            end_utc: {
              type: 'string',
              description: 'Reservation end (departure) in ISO 8601 UTC format (required)',
            },
            rate_id: {
              type: 'string',
              description: 'Rate plan ID to apply (required)',
            },
            space_type_id: {
              type: 'string',
              description: 'Space type ID (room category) to book',
            },
            space_id: {
              type: 'string',
              description: 'Specific space ID to assign',
            },
            customer_id: {
              type: 'string',
              description: 'Mews customer ID for the owner of the reservation',
            },
            adult_count: {
              type: 'number',
              description: 'Number of adults (default: 1)',
            },
            child_count: {
              type: 'number',
              description: 'Number of children (default: 0)',
            },
            notes: {
              type: 'string',
              description: 'Notes or special requests for the reservation',
            },
          },
          required: ['service_id', 'start_utc', 'end_utc', 'rate_id'],
        },
      },
      {
        name: 'update_reservation',
        description: 'Update an existing Mews reservation (dates, space, notes, or guest count)',
        inputSchema: {
          type: 'object',
          properties: {
            reservation_id: {
              type: 'string',
              description: 'Mews reservation ID to update (required)',
            },
            start_utc: {
              type: 'string',
              description: 'New start (arrival) in ISO 8601 UTC format',
            },
            end_utc: {
              type: 'string',
              description: 'New end (departure) in ISO 8601 UTC format',
            },
            space_id: {
              type: 'string',
              description: 'New space (room) ID to assign',
            },
            adult_count: {
              type: 'number',
              description: 'Updated number of adults',
            },
            child_count: {
              type: 'number',
              description: 'Updated number of children',
            },
            notes: {
              type: 'string',
              description: 'Updated notes or special requests',
            },
          },
          required: ['reservation_id'],
        },
      },
      {
        name: 'get_accounting_items',
        description: 'Retrieve accounting (transaction) items for a date range or specific bills/customers',
        inputSchema: {
          type: 'object',
          properties: {
            start_utc: {
              type: 'string',
              description: 'Start of accounting period in ISO 8601 UTC format',
            },
            end_utc: {
              type: 'string',
              description: 'End of accounting period in ISO 8601 UTC format',
            },
            bill_ids: {
              type: 'array',
              items: { type: 'string' },
              description: 'Bill IDs to retrieve items for',
            },
            customer_ids: {
              type: 'array',
              items: { type: 'string' },
              description: 'Customer IDs to retrieve accounting items for',
            },
            states: {
              type: 'array',
              items: { type: 'string' },
              description: 'Item states: Open, Closed',
            },
            limit: {
              type: 'number',
              description: 'Maximum results to return (default: 50)',
            },
          },
        },
      },
      {
        name: 'get_bills',
        description: 'Retrieve guest bills (invoices/folios) by customer, reservation, or bill IDs',
        inputSchema: {
          type: 'object',
          properties: {
            bill_ids: {
              type: 'array',
              items: { type: 'string' },
              description: 'Specific bill IDs to retrieve',
            },
            customer_ids: {
              type: 'array',
              items: { type: 'string' },
              description: 'Customer IDs to retrieve bills for',
            },
            reservation_ids: {
              type: 'array',
              items: { type: 'string' },
              description: 'Reservation IDs to retrieve associated bills',
            },
            states: {
              type: 'array',
              items: { type: 'string' },
              description: 'Bill states: Open, Closed',
            },
            limit: {
              type: 'number',
              description: 'Maximum results to return (default: 50)',
            },
          },
        },
      },
      {
        name: 'close_bill',
        description: 'Close (finalize) an open guest bill in Mews',
        inputSchema: {
          type: 'object',
          properties: {
            bill_id: {
              type: 'string',
              description: 'Mews bill ID to close (required)',
            },
          },
          required: ['bill_id'],
        },
      },
      {
        name: 'get_services',
        description: 'Retrieve services (bookable products and accommodation offerings) configured in the Mews property',
        inputSchema: {
          type: 'object',
          properties: {
            service_ids: {
              type: 'array',
              items: { type: 'string' },
              description: 'Specific service IDs to retrieve (omit for all services)',
            },
          },
        },
      },
      {
        name: 'get_outlets',
        description: 'Retrieve outlets (POS revenue centers) configured in the Mews property',
        inputSchema: {
          type: 'object',
          properties: {
            outlet_ids: {
              type: 'array',
              items: { type: 'string' },
              description: 'Specific outlet IDs to retrieve (omit for all outlets)',
            },
          },
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
        case 'get_customers':
          return this.getCustomers(args);
        case 'get_customer':
          return this.getCustomer(args);
        case 'get_spaces':
          return this.getSpaces(args);
        case 'get_availability':
          return this.getAvailability(args);
        case 'get_rates':
          return this.getRates(args);
        case 'add_reservation':
          return this.addReservation(args);
        case 'update_reservation':
          return this.updateReservation(args);
        case 'get_accounting_items':
          return this.getAccountingItems(args);
        case 'get_bills':
          return this.getBills(args);
        case 'close_bill':
          return this.closeBill(args);
        case 'get_services':
          return this.getServices(args);
        case 'get_outlets':
          return this.getOutlets(args);
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

  // Mews Connector API sends auth tokens in every request body — no Authorization header.
  private authBody(): Record<string, string> {
    return {
      ClientToken: this.clientToken,
      AccessToken: this.accessToken,
    };
  }

  private async connectorPost(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const payload = { ...this.authBody(), ...body };
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async searchReservations(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {
      Limitation: { Count: (args.limit as number) || 50 },
    };
    if (args.start_utc || args.end_utc) {
      body.StartUtc = args.start_utc;
      body.EndUtc = args.end_utc;
      body.TimeFilter = args.time_filter || 'Collision';
    }
    if (args.states) body.States = args.states;
    if (args.customer_ids) body.CustomerIds = args.customer_ids;
    return this.connectorPost('/api/connector/v1/reservations/getAll', body);
  }

  private async getReservation(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.reservation_id) {
      return { content: [{ type: 'text', text: 'reservation_id is required' }], isError: true };
    }
    return this.connectorPost('/api/connector/v1/reservations/getAll', {
      ReservationIds: [args.reservation_id],
      Limitation: { Count: 1 },
    });
  }

  private async getCustomers(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {
      Limitation: { Count: (args.limit as number) || 50 },
    };
    if (args.customer_ids) body.Ids = args.customer_ids;
    if (args.emails) body.Emails = args.emails;
    if (args.first_name) body.FirstName = args.first_name;
    if (args.last_name) body.LastName = args.last_name;
    return this.connectorPost('/api/connector/v1/customers/getAll', body);
  }

  private async getCustomer(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.customer_id) {
      return { content: [{ type: 'text', text: 'customer_id is required' }], isError: true };
    }
    return this.connectorPost('/api/connector/v1/customers/getAll', {
      Ids: [args.customer_id],
      Limitation: { Count: 1 },
    });
  }

  private async getSpaces(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {};
    if (args.space_ids) body.Ids = args.space_ids;
    if (args.space_type_ids) body.SpaceTypeIds = args.space_type_ids;
    return this.connectorPost('/api/connector/v1/spaces/getAll', body);
  }

  private async getAvailability(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.start_utc || !args.end_utc) {
      return { content: [{ type: 'text', text: 'start_utc and end_utc are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      StartUtc: args.start_utc,
      EndUtc: args.end_utc,
    };
    if (args.space_type_ids) body.SpaceTypeIds = args.space_type_ids;
    return this.connectorPost('/api/connector/v1/availability/get', body);
  }

  private async getRates(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {};
    if (args.rate_ids) body.Ids = args.rate_ids;
    if (args.service_ids) body.ServiceIds = args.service_ids;
    return this.connectorPost('/api/connector/v1/rates/getAll', body);
  }

  private async addReservation(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.service_id || !args.start_utc || !args.end_utc || !args.rate_id) {
      return { content: [{ type: 'text', text: 'service_id, start_utc, end_utc, and rate_id are required' }], isError: true };
    }
    const reservation: Record<string, unknown> = {
      ServiceId: args.service_id,
      StartUtc: args.start_utc,
      EndUtc: args.end_utc,
      RateId: args.rate_id,
      AdultCount: (args.adult_count as number) || 1,
      ChildCount: (args.child_count as number) || 0,
    };
    if (args.space_type_id) reservation.RequestedSpaceTypeId = args.space_type_id;
    if (args.space_id) reservation.SpaceId = args.space_id;
    if (args.customer_id) reservation.CustomerId = args.customer_id;
    if (args.notes) reservation.Notes = args.notes;
    return this.connectorPost('/api/connector/v1/reservations/add', {
      Reservations: [reservation],
    });
  }

  private async updateReservation(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.reservation_id) {
      return { content: [{ type: 'text', text: 'reservation_id is required' }], isError: true };
    }
    const update: Record<string, unknown> = {
      ReservationId: args.reservation_id,
    };
    if (args.start_utc) update.StartUtc = args.start_utc;
    if (args.end_utc) update.EndUtc = args.end_utc;
    if (args.space_id) update.SpaceId = args.space_id;
    if (args.adult_count !== undefined) update.AdultCount = args.adult_count;
    if (args.child_count !== undefined) update.ChildCount = args.child_count;
    if (args.notes) update.Notes = args.notes;
    return this.connectorPost('/api/connector/v1/reservations/update', update);
  }

  private async getAccountingItems(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {
      Limitation: { Count: (args.limit as number) || 50 },
    };
    if (args.start_utc || args.end_utc) {
      body.ConsumptionUtc = { StartUtc: args.start_utc, EndUtc: args.end_utc };
    }
    if (args.bill_ids) body.BillIds = args.bill_ids;
    if (args.customer_ids) body.CustomerIds = args.customer_ids;
    if (args.states) body.States = args.states;
    return this.connectorPost('/api/connector/v1/accountingItems/getAll', body);
  }

  private async getBills(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {
      Limitation: { Count: (args.limit as number) || 50 },
    };
    if (args.bill_ids) body.Ids = args.bill_ids;
    if (args.customer_ids) body.CustomerIds = args.customer_ids;
    if (args.reservation_ids) body.ReservationIds = args.reservation_ids;
    if (args.states) body.States = args.states;
    return this.connectorPost('/api/connector/v1/bills/getAll', body);
  }

  private async closeBill(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.bill_id) {
      return { content: [{ type: 'text', text: 'bill_id is required' }], isError: true };
    }
    return this.connectorPost('/api/connector/v1/bills/close', {
      BillId: args.bill_id,
    });
  }

  private async getServices(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {};
    if (args.service_ids) body.Ids = args.service_ids;
    return this.connectorPost('/api/connector/v1/services/getAll', body);
  }

  private async getOutlets(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {};
    if (args.outlet_ids) body.Ids = args.outlet_ids;
    return this.connectorPost('/api/connector/v1/outlets/getAll', body);
  }
}

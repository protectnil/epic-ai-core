/**
 * OnSched Consumer MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// No official OnSched MCP server was found on GitHub or the OnSched developer portal.
// Our adapter covers: 27 tools (appointments, availability, customers, locations, resources, services).
// Recommendation: Use this adapter. No community or vendor MCP available.
//
// Base URL: https://sandbox-api.onsched.com (sandbox) / https://api.onsched.com (production)
// Auth: OAuth2 client credentials (tokenUrl: https://sandbox-identity.onsched.com/connect/token)
//   Obtain a Bearer token via client_credentials grant; pass as Authorization header.
// Docs: https://onsched.readme.io/docs
// Rate limits: Not publicly documented; contact OnSched support for enterprise limits.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface OnSchedConsumerConfig {
  /** OAuth2 Bearer token obtained via client_credentials grant */
  accessToken: string;
  /** Optional base URL override (default: https://sandbox-api.onsched.com) */
  baseUrl?: string;
}

export class OnSchedConsumerMCPServer extends MCPAdapterBase {
  private readonly accessToken: string;
  private readonly baseUrl: string;

  constructor(config: OnSchedConsumerConfig) {
    super();
    this.accessToken = config.accessToken;
    this.baseUrl = config.baseUrl ?? 'https://sandbox-api.onsched.com';
  }

  static catalog() {
    return {
      name: 'onsched-consumer',
      displayName: 'OnSched Consumer',
      version: '1.0.0',
      category: 'productivity',
      keywords: [
        'onsched', 'scheduling', 'appointment', 'booking', 'calendar', 'availability',
        'reservation', 'customer', 'resource', 'service', 'location', 'reschedule',
        'cancel', 'confirm', 'noshow', 'online', 'time-slot',
      ],
      toolNames: [
        'list_appointments', 'create_appointment', 'get_appointment',
        'book_appointment', 'cancel_appointment', 'confirm_appointment',
        'reschedule_appointment', 'reserve_appointment', 'set_noshow',
        'delete_appointment', 'get_appointment_booking_fields', 'get_appointment_custom_fields',
        'get_available_times', 'get_available_days', 'get_unavailable_times',
        'list_customers', 'create_customer', 'get_customer', 'update_customer',
        'delete_customer', 'list_locations', 'get_location',
        'list_resources', 'get_resource', 'list_services', 'get_service',
        'list_service_groups',
      ],
      description: 'OnSched consumer booking API — manage appointments, check availability, handle customers, locations, resources, and services for online scheduling workflows.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_appointments',
        description: 'List appointments with optional filters for location, email, service, calendar, resource, customer, date range, and status',
        inputSchema: {
          type: 'object',
          properties: {
            locationId: { type: 'string', description: 'Filter by business location ID' },
            email: { type: 'string', description: 'Filter by customer email address' },
            lastname: { type: 'string', description: 'Filter by customer last name or part of it' },
            serviceId: { type: 'string', description: 'Filter by service ID' },
            calendarId: { type: 'string', description: 'Filter by calendar ID' },
            resourceId: { type: 'string', description: 'Filter by resource ID' },
            customerId: { type: 'string', description: 'Filter by customer ID' },
            startDate: { type: 'string', description: 'Filter on/after this date (YYYY-MM-DD)' },
            endDate: { type: 'string', description: 'Filter on/before this date (YYYY-MM-DD)' },
            status: { type: 'string', description: 'Filter by status: IN, BK, CN, RE, RS' },
            bookedBy: { type: 'string', description: 'Filter by email of who booked the appointment' },
            offset: { type: 'integer', description: 'Starting row (default: 0)' },
            limit: { type: 'integer', description: 'Page size (default: 20, max: 100)' },
          },
        },
      },
      {
        name: 'create_appointment',
        description: 'Create a new appointment — posts with "IN" (initial) status by default, or use completeBooking="BK" to book in one step',
        inputSchema: {
          type: 'object',
          properties: {
            completeBooking: { type: 'string', description: 'Complete booking in one step: "BK" (booked), "RS" (reserved), or "IN" (initial, for payment flows)' },
            body: { type: 'object', description: 'Appointment body including serviceId, startDateTime, endDateTime, locationId, resourceId, customerId, email, name, timezoneName' },
          },
          required: ['body'],
        },
      },
      {
        name: 'get_appointment',
        description: 'Get details of a specific appointment by its ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Appointment ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'book_appointment',
        description: 'Complete booking of an initial (IN status) appointment — transitions it to BK (booked) status and sends notifications',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Appointment ID to book' },
            body: { type: 'object', description: 'Booking details including customer info, resourceId, and any custom fields' },
          },
          required: ['id'],
        },
      },
      {
        name: 'cancel_appointment',
        description: 'Cancel a booked appointment by ID, transitioning it to CN (cancelled) status',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Appointment ID to cancel' },
            body: { type: 'object', description: 'Optional cancellation details (reason, notes)' },
          },
          required: ['id'],
        },
      },
      {
        name: 'confirm_appointment',
        description: 'Confirm a booked appointment by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Appointment ID to confirm' },
          },
          required: ['id'],
        },
      },
      {
        name: 'reschedule_appointment',
        description: 'Reschedule an existing appointment to a new time slot',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Appointment ID to reschedule' },
            body: { type: 'object', description: 'New schedule details including startDateTime, endDateTime, resourceId' },
          },
          required: ['id', 'body'],
        },
      },
      {
        name: 'reserve_appointment',
        description: 'Reserve a time slot for an appointment — transitions to RS (reserved) status with a hold expiry',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Appointment ID to reserve' },
            body: { type: 'object', description: 'Reservation details' },
          },
          required: ['id'],
        },
      },
      {
        name: 'set_noshow',
        description: 'Mark an appointment as a no-show',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Appointment ID to mark as no-show' },
          },
          required: ['id'],
        },
      },
      {
        name: 'delete_appointment',
        description: 'Delete an appointment by ID (permanent deletion)',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Appointment ID to delete' },
          },
          required: ['id'],
        },
      },
      {
        name: 'get_appointment_booking_fields',
        description: 'Get the custom field labels configured for the appointment booking form',
        inputSchema: {
          type: 'object',
          properties: {
            locationId: { type: 'string', description: 'Optional location ID to scope field labels' },
          },
        },
      },
      {
        name: 'get_appointment_custom_fields',
        description: 'Get the list of custom field definitions for appointments',
        inputSchema: {
          type: 'object',
          properties: {
            locationId: { type: 'string', description: 'Optional location ID to scope custom fields' },
          },
        },
      },
      {
        name: 'get_available_times',
        description: 'Get available booking time slots for a service within a date range',
        inputSchema: {
          type: 'object',
          properties: {
            serviceId: { type: 'string', description: 'Service ID to check availability for' },
            startDate: { type: 'string', description: 'Start of date range (YYYY-MM-DD)' },
            endDate: { type: 'string', description: 'End of date range (YYYY-MM-DD)' },
            locationId: { type: 'string', description: 'Optional location ID filter' },
            resourceId: { type: 'string', description: 'Optional resource ID filter' },
            tzOffset: { type: 'integer', description: 'Timezone offset in hours (e.g. -5 for EST)' },
            duration: { type: 'integer', description: 'Override service duration in minutes' },
          },
          required: ['serviceId', 'startDate', 'endDate'],
        },
      },
      {
        name: 'get_available_days',
        description: 'Get available booking days (not individual times) for a service within a date range',
        inputSchema: {
          type: 'object',
          properties: {
            serviceId: { type: 'string', description: 'Service ID to check availability for' },
            startDate: { type: 'string', description: 'Start of date range (YYYY-MM-DD)' },
            endDate: { type: 'string', description: 'End of date range (YYYY-MM-DD)' },
            locationId: { type: 'string', description: 'Optional location ID filter' },
            resourceId: { type: 'string', description: 'Optional resource ID filter' },
          },
          required: ['serviceId', 'startDate', 'endDate'],
        },
      },
      {
        name: 'get_unavailable_times',
        description: 'Get unavailable/blocked time slots for a service within a date range',
        inputSchema: {
          type: 'object',
          properties: {
            serviceId: { type: 'string', description: 'Service ID to check for blocked times' },
            startDate: { type: 'string', description: 'Start of date range (YYYY-MM-DD)' },
            endDate: { type: 'string', description: 'End of date range (YYYY-MM-DD)' },
            locationId: { type: 'string', description: 'Optional location ID filter' },
          },
          required: ['serviceId', 'startDate', 'endDate'],
        },
      },
      {
        name: 'list_customers',
        description: 'List customers with optional filters for email, name, phone, and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            locationId: { type: 'string', description: 'Filter by business location ID' },
            email: { type: 'string', description: 'Filter by email address' },
            lastname: { type: 'string', description: 'Filter by last name or part of it' },
            offset: { type: 'integer', description: 'Starting row (default: 0)' },
            limit: { type: 'integer', description: 'Page size (default: 20, max: 100)' },
          },
        },
      },
      {
        name: 'create_customer',
        description: 'Create a new customer record in OnSched',
        inputSchema: {
          type: 'object',
          properties: {
            body: { type: 'object', description: 'Customer details including email, firstname, lastname, phone, address fields' },
          },
          required: ['body'],
        },
      },
      {
        name: 'get_customer',
        description: 'Get a customer record by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Customer ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'update_customer',
        description: 'Update an existing customer record',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Customer ID to update' },
            body: { type: 'object', description: 'Updated customer fields (email, firstname, lastname, phone, address)' },
          },
          required: ['id', 'body'],
        },
      },
      {
        name: 'delete_customer',
        description: 'Delete a customer record by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Customer ID to delete' },
          },
          required: ['id'],
        },
      },
      {
        name: 'list_locations',
        description: 'List all business locations configured in the OnSched account',
        inputSchema: {
          type: 'object',
          properties: {
            offset: { type: 'integer', description: 'Starting row (default: 0)' },
            limit: { type: 'integer', description: 'Page size (default: 20, max: 100)' },
          },
        },
      },
      {
        name: 'get_location',
        description: 'Get details of a specific business location by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Location ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'list_resources',
        description: 'List bookable resources (staff, rooms, equipment) with optional location filter',
        inputSchema: {
          type: 'object',
          properties: {
            locationId: { type: 'string', description: 'Filter by business location ID' },
            serviceId: { type: 'string', description: 'Filter by service ID (resources linked to this service)' },
            offset: { type: 'integer', description: 'Starting row (default: 0)' },
            limit: { type: 'integer', description: 'Page size (default: 20, max: 100)' },
          },
        },
      },
      {
        name: 'get_resource',
        description: 'Get details of a specific bookable resource by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Resource ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'list_services',
        description: 'List bookable services with optional location filter and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            locationId: { type: 'string', description: 'Filter by business location ID' },
            serviceGroupId: { type: 'string', description: 'Filter by service group ID' },
            offset: { type: 'integer', description: 'Starting row (default: 0)' },
            limit: { type: 'integer', description: 'Page size (default: 20, max: 100)' },
          },
        },
      },
      {
        name: 'get_service',
        description: 'Get details of a specific service by ID including duration, pricing, and booking settings',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Service ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'list_service_groups',
        description: 'List service groups to organize and browse services by category',
        inputSchema: {
          type: 'object',
          properties: {
            locationId: { type: 'string', description: 'Filter by business location ID' },
            offset: { type: 'integer', description: 'Starting row (default: 0)' },
            limit: { type: 'integer', description: 'Page size (default: 20, max: 100)' },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_appointments':              return this.listAppointments(args);
        case 'create_appointment':             return this.createAppointment(args);
        case 'get_appointment':                return this.getAppointment(args);
        case 'book_appointment':               return this.bookAppointment(args);
        case 'cancel_appointment':             return this.cancelAppointment(args);
        case 'confirm_appointment':            return this.confirmAppointment(args);
        case 'reschedule_appointment':         return this.rescheduleAppointment(args);
        case 'reserve_appointment':            return this.reserveAppointment(args);
        case 'set_noshow':                     return this.setNoShow(args);
        case 'delete_appointment':             return this.deleteAppointment(args);
        case 'get_appointment_booking_fields': return this.getAppointmentBookingFields(args);
        case 'get_appointment_custom_fields':  return this.getAppointmentCustomFields(args);
        case 'get_available_times':            return this.getAvailableTimes(args);
        case 'get_available_days':             return this.getAvailableDays(args);
        case 'get_unavailable_times':          return this.getUnavailableTimes(args);
        case 'list_customers':                 return this.listCustomers(args);
        case 'create_customer':                return this.createCustomer(args);
        case 'get_customer':                   return this.getCustomer(args);
        case 'update_customer':                return this.updateCustomer(args);
        case 'delete_customer':                return this.deleteCustomer(args);
        case 'list_locations':                 return this.listLocations(args);
        case 'get_location':                   return this.getLocation(args);
        case 'list_resources':                 return this.listResources(args);
        case 'get_resource':                   return this.getResource(args);
        case 'list_services':                  return this.listServices(args);
        case 'get_service':                    return this.getService(args);
        case 'list_service_groups':            return this.listServiceGroups(args);
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

  private buildUrl(path: string, params: Record<string, string | number | undefined> = {}): string {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) qs.set(k, String(v));
    }
    const query = qs.toString();
    return `${this.baseUrl}${path}${query ? '?' + query : ''}`;
  }

  private get headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  private async fetchGet(path: string, params: Record<string, string | number | undefined> = {}): Promise<ToolResult> {
    const url = this.buildUrl(path, params);
    const response = await this.fetchWithRetry(url, { method: 'GET', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`OnSched returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async fetchPost(path: string, body: unknown = {}, params: Record<string, string | undefined> = {}): Promise<ToolResult> {
    const url = this.buildUrl(path, params);
    const response = await this.fetchWithRetry(url, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`OnSched returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async fetchPut(path: string, body: unknown = {}): Promise<ToolResult> {
    const url = this.buildUrl(path);
    const response = await this.fetchWithRetry(url, {
      method: 'PUT',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`OnSched returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async fetchDelete(path: string): Promise<ToolResult> {
    const url = this.buildUrl(path);
    const response = await this.fetchWithRetry(url, { method: 'DELETE', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { data = { success: true }; }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  // --- Appointments ---

  private async listAppointments(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string | number | undefined> = {};
    if (args.locationId)  params.locationId  = args.locationId  as string;
    if (args.email)       params.email       = args.email       as string;
    if (args.lastname)    params.lastname    = args.lastname    as string;
    if (args.serviceId)   params.serviceId   = args.serviceId   as string;
    if (args.calendarId)  params.calendarId  = args.calendarId  as string;
    if (args.resourceId)  params.resourceId  = args.resourceId  as string;
    if (args.customerId)  params.customerId  = args.customerId  as string;
    if (args.startDate)   params.startDate   = args.startDate   as string;
    if (args.endDate)     params.endDate     = args.endDate     as string;
    if (args.status)      params.status      = args.status      as string;
    if (args.bookedBy)    params.bookedBy    = args.bookedBy    as string;
    if (args.offset !== undefined) params.offset = args.offset as number;
    if (args.limit  !== undefined) params.limit  = args.limit  as number;
    return this.fetchGet('/consumer/v1/appointments', params);
  }

  private async createAppointment(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.body) return { content: [{ type: 'text', text: 'body is required' }], isError: true };
    const params: Record<string, string | undefined> = {};
    if (args.completeBooking) params.completeBooking = args.completeBooking as string;
    return this.fetchPost('/consumer/v1/appointments', args.body, params);
  }

  private async getAppointment(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.fetchGet(`/consumer/v1/appointments/${encodeURIComponent(args.id as string)}`);
  }

  private async bookAppointment(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.fetchPut(`/consumer/v1/appointments/${encodeURIComponent(args.id as string)}/book`, args.body ?? {});
  }

  private async cancelAppointment(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.fetchPut(`/consumer/v1/appointments/${encodeURIComponent(args.id as string)}/cancel`, args.body ?? {});
  }

  private async confirmAppointment(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.fetchPut(`/consumer/v1/appointments/${encodeURIComponent(args.id as string)}/confirm`, {});
  }

  private async rescheduleAppointment(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id)   return { content: [{ type: 'text', text: 'id is required' }],   isError: true };
    if (!args.body) return { content: [{ type: 'text', text: 'body is required' }], isError: true };
    return this.fetchPut(`/consumer/v1/appointments/${encodeURIComponent(args.id as string)}/reschedule`, args.body);
  }

  private async reserveAppointment(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.fetchPut(`/consumer/v1/appointments/${encodeURIComponent(args.id as string)}/reserve`, args.body ?? {});
  }

  private async setNoShow(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.fetchPut(`/consumer/v1/appointments/${encodeURIComponent(args.id as string)}/noshow`, {});
  }

  private async deleteAppointment(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.fetchDelete(`/consumer/v1/appointments/${encodeURIComponent(args.id as string)}`);
  }

  private async getAppointmentBookingFields(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string | undefined> = {};
    if (args.locationId) params.locationId = args.locationId as string;
    return this.fetchGet('/consumer/v1/appointments/bookingfields', params);
  }

  private async getAppointmentCustomFields(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string | undefined> = {};
    if (args.locationId) params.locationId = args.locationId as string;
    return this.fetchGet('/consumer/v1/appointments/customfields', params);
  }

  // --- Availability ---

  private async getAvailableTimes(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.serviceId) return { content: [{ type: 'text', text: 'serviceId is required' }], isError: true };
    if (!args.startDate) return { content: [{ type: 'text', text: 'startDate is required' }], isError: true };
    if (!args.endDate)   return { content: [{ type: 'text', text: 'endDate is required' }],   isError: true };
    const params: Record<string, string | number | undefined> = {};
    if (args.locationId) params.locationId = args.locationId as string;
    if (args.resourceId) params.resourceId = args.resourceId as string;
    if (args.tzOffset  !== undefined) params.tzOffset  = args.tzOffset  as number;
    if (args.duration  !== undefined) params.duration  = args.duration  as number;
    return this.fetchGet(
      `/consumer/v1/availability/${encodeURIComponent(args.serviceId as string)}/${encodeURIComponent(args.startDate as string)}/${encodeURIComponent(args.endDate as string)}`,
      params,
    );
  }

  private async getAvailableDays(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.serviceId) return { content: [{ type: 'text', text: 'serviceId is required' }], isError: true };
    if (!args.startDate) return { content: [{ type: 'text', text: 'startDate is required' }], isError: true };
    if (!args.endDate)   return { content: [{ type: 'text', text: 'endDate is required' }],   isError: true };
    const params: Record<string, string | undefined> = {};
    if (args.locationId) params.locationId = args.locationId as string;
    if (args.resourceId) params.resourceId = args.resourceId as string;
    return this.fetchGet(
      `/consumer/v1/availability/${encodeURIComponent(args.serviceId as string)}/${encodeURIComponent(args.startDate as string)}/${encodeURIComponent(args.endDate as string)}/days`,
      params,
    );
  }

  private async getUnavailableTimes(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.serviceId) return { content: [{ type: 'text', text: 'serviceId is required' }], isError: true };
    if (!args.startDate) return { content: [{ type: 'text', text: 'startDate is required' }], isError: true };
    if (!args.endDate)   return { content: [{ type: 'text', text: 'endDate is required' }],   isError: true };
    const params: Record<string, string | undefined> = {};
    if (args.locationId) params.locationId = args.locationId as string;
    return this.fetchGet(
      `/consumer/v1/availability/${encodeURIComponent(args.serviceId as string)}/${encodeURIComponent(args.startDate as string)}/${encodeURIComponent(args.endDate as string)}/unavailable`,
      params,
    );
  }

  // --- Customers ---

  private async listCustomers(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string | number | undefined> = {};
    if (args.locationId) params.locationId = args.locationId as string;
    if (args.email)      params.email      = args.email      as string;
    if (args.lastname)   params.lastname   = args.lastname   as string;
    if (args.offset !== undefined) params.offset = args.offset as number;
    if (args.limit  !== undefined) params.limit  = args.limit  as number;
    return this.fetchGet('/consumer/v1/customers', params);
  }

  private async createCustomer(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.body) return { content: [{ type: 'text', text: 'body is required' }], isError: true };
    return this.fetchPost('/consumer/v1/customers', args.body);
  }

  private async getCustomer(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.fetchGet(`/consumer/v1/customers/${encodeURIComponent(args.id as string)}`);
  }

  private async updateCustomer(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id)   return { content: [{ type: 'text', text: 'id is required' }],   isError: true };
    if (!args.body) return { content: [{ type: 'text', text: 'body is required' }], isError: true };
    return this.fetchPut(`/consumer/v1/customers/${encodeURIComponent(args.id as string)}`, args.body);
  }

  private async deleteCustomer(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.fetchDelete(`/consumer/v1/customers/${encodeURIComponent(args.id as string)}`);
  }

  // --- Locations ---

  private async listLocations(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string | number | undefined> = {};
    if (args.offset !== undefined) params.offset = args.offset as number;
    if (args.limit  !== undefined) params.limit  = args.limit  as number;
    return this.fetchGet('/consumer/v1/locations', params);
  }

  private async getLocation(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.fetchGet(`/consumer/v1/locations/${encodeURIComponent(args.id as string)}`);
  }

  // --- Resources ---

  private async listResources(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string | number | undefined> = {};
    if (args.locationId) params.locationId = args.locationId as string;
    if (args.serviceId)  params.serviceId  = args.serviceId  as string;
    if (args.offset !== undefined) params.offset = args.offset as number;
    if (args.limit  !== undefined) params.limit  = args.limit  as number;
    return this.fetchGet('/consumer/v1/resources', params);
  }

  private async getResource(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.fetchGet(`/consumer/v1/resources/${encodeURIComponent(args.id as string)}`);
  }

  // --- Services ---

  private async listServices(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string | number | undefined> = {};
    if (args.locationId)     params.locationId     = args.locationId     as string;
    if (args.serviceGroupId) params.serviceGroupId = args.serviceGroupId as string;
    if (args.offset !== undefined) params.offset = args.offset as number;
    if (args.limit  !== undefined) params.limit  = args.limit  as number;
    return this.fetchGet('/consumer/v1/services', params);
  }

  private async getService(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.fetchGet(`/consumer/v1/services/${encodeURIComponent(args.id as string)}`);
  }

  private async listServiceGroups(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string | number | undefined> = {};
    if (args.locationId) params.locationId = args.locationId as string;
    if (args.offset !== undefined) params.offset = args.offset as number;
    if (args.limit  !== undefined) params.limit  = args.limit  as number;
    return this.fetchGet('/consumer/v1/servicegroups', params);
  }
}

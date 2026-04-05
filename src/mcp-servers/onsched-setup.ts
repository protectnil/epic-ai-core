/**
 * OnSched Setup MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// No official OnSched MCP server was found on GitHub or npm.
// We build a full REST wrapper covering the OnSched Setup API v1.
//
// Base URL: https://sandbox-api.onsched.com (sandbox) / https://api.onsched.com (production)
// Auth: OAuth2 client credentials — POST https://sandbox-identity.onsched.com/connect/token
//   Body: grant_type=client_credentials&client_id=ID&client_secret=SECRET&scope=OnSchedApi
// Docs: https://sandbox-api.onsched.com/index.html
// Rate limits: Not publicly documented; contact OnSched support for production limits

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface OnSchedSetupConfig {
  clientId: string;
  clientSecret: string;
  /** Optional base URL override (default: https://sandbox-api.onsched.com) */
  baseUrl?: string;
  /** Optional identity server URL override (default: https://sandbox-identity.onsched.com) */
  identityUrl?: string;
}

export class OnSchedSetupMCPServer extends MCPAdapterBase {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly baseUrl: string;
  private readonly identityUrl: string;

  private bearerToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(config: OnSchedSetupConfig) {
    super();
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.baseUrl = config.baseUrl ?? 'https://sandbox-api.onsched.com';
    this.identityUrl = config.identityUrl ?? 'https://sandbox-identity.onsched.com';
  }

  static catalog() {
    return {
      name: 'onsched-setup',
      displayName: 'OnSched Setup',
      version: '1.0.0',
      category: 'productivity',
      keywords: [
        'onsched', 'scheduling', 'booking', 'appointment', 'calendar', 'resource',
        'availability', 'service', 'location', 'setup', 'business', 'staff',
        'time slot', 'reminder', 'customer', 'region', 'allocation', 'block',
        'email template', 'recurring', 'business hours',
      ],
      toolNames: [
        'list_locations',
        'get_location',
        'create_location',
        'update_location',
        'delete_location',
        'list_services',
        'get_service',
        'create_service',
        'update_service',
        'delete_service',
        'list_resources',
        'get_resource',
        'create_resource',
        'update_resource',
        'delete_resource',
        'list_resource_allocations',
        'create_resource_allocation',
        'get_resource_availability',
        'list_calendars',
        'get_calendar',
        'list_appointments',
        'get_appointment',
        'list_customers',
        'get_customer',
        'get_company',
        'update_company',
        'list_service_groups',
        'create_service_group',
        'list_resource_groups',
        'create_resource_group',
        'list_business_users',
        'get_business_user',
      ],
      description: 'OnSched Setup API: configure and manage scheduling infrastructure including locations, services, resources, calendars, appointments, customers, and company settings.',
      author: 'protectnil',
    };
  }

  private async getOrRefreshToken(): Promise<string> {
    const now = Date.now();
    if (this.bearerToken && this.tokenExpiry > now) {
      return this.bearerToken;
    }

    const response = await this.fetchWithRetry(`${this.identityUrl}/connect/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: this.clientId,
        client_secret: this.clientSecret,
        scope: 'OnSchedApi',
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

  private async apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
    const token = await this.getOrRefreshToken();
    return fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string> ?? {}),
      },
    });
  }
  get tools(): ToolDefinition[] {
    return [
      // ── Locations ─────────────────────────────────────────────────────────
      {
        name: 'list_locations',
        description: 'List all scheduling locations with optional filters for name, service, friendly ID, and deleted status',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Filter by location name (partial match)' },
            serviceId: { type: 'string', description: 'Filter locations that offer a specific service ID' },
            friendlyId: { type: 'string', description: 'Filter by location friendly/slug ID' },
            deleted: { type: 'boolean', description: 'Include deleted locations (default: false)' },
            offset: { type: 'number', description: 'Pagination offset (default: 0)' },
            limit: { type: 'number', description: 'Number of results per page (default: 20, max: 100)' },
          },
        },
      },
      {
        name: 'get_location',
        description: 'Get a single scheduling location by its ID including address, hours, settings, and linked services',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'The location ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'create_location',
        description: 'Create a new scheduling location with name, address, timezone, and business hours configuration',
        inputSchema: {
          type: 'object',
          properties: {
            body: {
              type: 'object',
              description: 'Location object — name, address, timezoneName, phone, email, and other config fields per OnSched API spec',
            },
          },
          required: ['body'],
        },
      },
      {
        name: 'update_location',
        description: 'Update an existing scheduling location by ID with new configuration values',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'The location ID to update' },
            body: {
              type: 'object',
              description: 'Partial location object with fields to update per OnSched API spec',
            },
          },
          required: ['id', 'body'],
        },
      },
      {
        name: 'delete_location',
        description: 'Soft-delete a scheduling location by ID (can be recovered with recover_location)',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'The location ID to delete' },
          },
          required: ['id'],
        },
      },
      // ── Services ──────────────────────────────────────────────────────────
      {
        name: 'list_services',
        description: 'List all bookable services with optional filters for location, service group, and deleted status',
        inputSchema: {
          type: 'object',
          properties: {
            locationId: { type: 'string', description: 'Filter services by location ID' },
            serviceGroupId: { type: 'string', description: 'Filter services by service group ID' },
            deleted: { type: 'boolean', description: 'Include deleted services (default: false)' },
            offset: { type: 'number', description: 'Pagination offset (default: 0)' },
            limit: { type: 'number', description: 'Number of results per page (default: 20, max: 100)' },
          },
        },
      },
      {
        name: 'get_service',
        description: 'Get a single bookable service by ID including duration, pricing, availability, and linked resources',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'The service ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'create_service',
        description: 'Create a new bookable service with name, duration, description, and scheduling configuration',
        inputSchema: {
          type: 'object',
          properties: {
            body: {
              type: 'object',
              description: 'Service object — name, duration, description, locationId, serviceGroupId, and other config fields per OnSched API spec',
            },
          },
          required: ['body'],
        },
      },
      {
        name: 'update_service',
        description: 'Update an existing bookable service by ID with new configuration values',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'The service ID to update' },
            body: {
              type: 'object',
              description: 'Partial service object with fields to update per OnSched API spec',
            },
          },
          required: ['id', 'body'],
        },
      },
      {
        name: 'delete_service',
        description: 'Soft-delete a bookable service by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'The service ID to delete' },
          },
          required: ['id'],
        },
      },
      // ── Resources ─────────────────────────────────────────────────────────
      {
        name: 'list_resources',
        description: 'List schedulable resources (staff, rooms, equipment) with optional filters for location, group, name, and email',
        inputSchema: {
          type: 'object',
          properties: {
            locationId: { type: 'string', description: 'Filter resources by location ID' },
            resourceGroupId: { type: 'string', description: 'Filter resources by resource group ID' },
            email: { type: 'string', description: 'Filter by resource email address' },
            name: { type: 'string', description: 'Filter by resource name (partial match)' },
            deleted: { type: 'boolean', description: 'Include deleted resources (default: false)' },
            offset: { type: 'number', description: 'Pagination offset (default: 0)' },
            limit: { type: 'number', description: 'Number of results per page (default: 20, max: 100)' },
          },
        },
      },
      {
        name: 'get_resource',
        description: 'Get a single schedulable resource by ID including name, email, availability, and linked services',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'The resource ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'create_resource',
        description: 'Create a new schedulable resource (staff member, room, or equipment) with name, email, and service associations',
        inputSchema: {
          type: 'object',
          properties: {
            body: {
              type: 'object',
              description: 'Resource object — name, email, locationId, resourceGroupId, and other config fields per OnSched API spec',
            },
          },
          required: ['body'],
        },
      },
      {
        name: 'update_resource',
        description: 'Update an existing schedulable resource by ID with new configuration values',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'The resource ID to update' },
            body: {
              type: 'object',
              description: 'Partial resource object with fields to update per OnSched API spec',
            },
          },
          required: ['id', 'body'],
        },
      },
      {
        name: 'delete_resource',
        description: 'Soft-delete a schedulable resource by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'The resource ID to delete' },
          },
          required: ['id'],
        },
      },
      {
        name: 'list_resource_allocations',
        description: 'List time allocations for a specific resource with optional date range filter',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'The resource ID' },
            startDate: { type: 'string', description: 'Filter allocations from this date (YYYY-MM-DD)' },
            endDate: { type: 'string', description: 'Filter allocations to this date (YYYY-MM-DD)' },
            offset: { type: 'number', description: 'Pagination offset (default: 0)' },
            limit: { type: 'number', description: 'Number of results per page (default: 20, max: 100)' },
          },
          required: ['id'],
        },
      },
      {
        name: 'create_resource_allocation',
        description: 'Create a time allocation for a resource defining when they are available for booking',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'The resource ID to create allocation for' },
            body: {
              type: 'object',
              description: 'Allocation object — startDate, endDate, startTime, endTime, repeat, and other fields per OnSched API spec',
            },
          },
          required: ['id', 'body'],
        },
      },
      {
        name: 'get_resource_availability',
        description: 'Get the weekly recurring availability schedule for a specific resource',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'The resource ID' },
          },
          required: ['id'],
        },
      },
      // ── Calendars ─────────────────────────────────────────────────────────
      {
        name: 'list_calendars',
        description: 'List all calendars for a location with optional filter for deleted calendars',
        inputSchema: {
          type: 'object',
          properties: {
            locationId: { type: 'string', description: 'Filter calendars by location ID' },
            deleted: { type: 'boolean', description: 'Include deleted calendars (default: false)' },
            offset: { type: 'number', description: 'Pagination offset (default: 0)' },
            limit: { type: 'number', description: 'Number of results per page (default: 20, max: 100)' },
          },
        },
      },
      {
        name: 'get_calendar',
        description: 'Get a single calendar by ID including its services and scheduling configuration',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'The calendar ID' },
          },
          required: ['id'],
        },
      },
      // ── Appointments ──────────────────────────────────────────────────────
      {
        name: 'list_appointments',
        description: 'List appointments with optional filters for location, customer, service, resource, date range, and status',
        inputSchema: {
          type: 'object',
          properties: {
            locationId: { type: 'string', description: 'Filter appointments by location ID' },
            email: { type: 'string', description: 'Filter by customer email address' },
            lastname: { type: 'string', description: 'Filter by customer last name' },
            serviceId: { type: 'string', description: 'Filter by service ID' },
            calendarId: { type: 'string', description: 'Filter by calendar ID' },
            resourceId: { type: 'string', description: 'Filter by resource ID' },
            customerId: { type: 'string', description: 'Filter by customer ID' },
            startDate: { type: 'string', description: 'Filter appointments from this date (YYYY-MM-DD)' },
            endDate: { type: 'string', description: 'Filter appointments to this date (YYYY-MM-DD)' },
            status: { type: 'string', description: 'Filter by status: IN, CN, RE, etc.' },
            offset: { type: 'number', description: 'Pagination offset (default: 0)' },
            limit: { type: 'number', description: 'Number of results per page (default: 20, max: 100)' },
          },
        },
      },
      {
        name: 'get_appointment',
        description: 'Get a single appointment by ID including customer info, service, resource, and status',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'The appointment ID' },
          },
          required: ['id'],
        },
      },
      // ── Customers ─────────────────────────────────────────────────────────
      {
        name: 'list_customers',
        description: 'List customers with optional filters for location, group, email, last name, and deleted status',
        inputSchema: {
          type: 'object',
          properties: {
            locationId: { type: 'string', description: 'Filter customers by location ID' },
            groupId: { type: 'string', description: 'Filter by customer group ID' },
            email: { type: 'string', description: 'Filter by customer email address' },
            lastname: { type: 'string', description: 'Filter by customer last name' },
            deleted: { type: 'boolean', description: 'Include deleted customers (default: false)' },
            offset: { type: 'number', description: 'Pagination offset (default: 0)' },
            limit: { type: 'number', description: 'Number of results per page (default: 20, max: 100)' },
          },
        },
      },
      {
        name: 'get_customer',
        description: 'Get a single customer by ID including contact info, appointment history, and profile data',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'The customer ID' },
          },
          required: ['id'],
        },
      },
      // ── Company ───────────────────────────────────────────────────────────
      {
        name: 'get_company',
        description: 'Get the current company account details including name, address, timezone, and global scheduling settings',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'update_company',
        description: 'Update the company account settings including name, address, timezone, and scheduling configuration',
        inputSchema: {
          type: 'object',
          properties: {
            body: {
              type: 'object',
              description: 'Company object with fields to update per OnSched API spec',
            },
          },
          required: ['body'],
        },
      },
      // ── Service Groups ────────────────────────────────────────────────────
      {
        name: 'list_service_groups',
        description: 'List service groups for organizing services by category within a location',
        inputSchema: {
          type: 'object',
          properties: {
            locationId: { type: 'string', description: 'Filter service groups by location ID' },
            offset: { type: 'number', description: 'Pagination offset (default: 0)' },
            limit: { type: 'number', description: 'Number of results per page (default: 20, max: 100)' },
          },
        },
      },
      {
        name: 'create_service_group',
        description: 'Create a new service group to categorize and organize services within a location',
        inputSchema: {
          type: 'object',
          properties: {
            body: {
              type: 'object',
              description: 'Service group object — name, description, locationId per OnSched API spec',
            },
          },
          required: ['body'],
        },
      },
      // ── Resource Groups ───────────────────────────────────────────────────
      {
        name: 'list_resource_groups',
        description: 'List resource groups for organizing resources (staff teams, room types) within a location',
        inputSchema: {
          type: 'object',
          properties: {
            locationId: { type: 'string', description: 'Filter resource groups by location ID' },
            deleted: { type: 'boolean', description: 'Include deleted resource groups (default: false)' },
            offset: { type: 'number', description: 'Pagination offset (default: 0)' },
            limit: { type: 'number', description: 'Number of results per page (default: 20, max: 100)' },
          },
        },
      },
      {
        name: 'create_resource_group',
        description: 'Create a new resource group to categorize and organize resources within a location',
        inputSchema: {
          type: 'object',
          properties: {
            body: {
              type: 'object',
              description: 'Resource group object — name, description, locationId per OnSched API spec',
            },
          },
          required: ['body'],
        },
      },
      // ── Business Users ────────────────────────────────────────────────────
      {
        name: 'list_business_users',
        description: 'List business users (admin and staff accounts) with optional filters for location, email, and role',
        inputSchema: {
          type: 'object',
          properties: {
            locationId: { type: 'string', description: 'Filter users by location ID' },
            email: { type: 'string', description: 'Filter by user email address' },
            role: { type: 'string', description: 'Filter by user role (e.g., OWNER, ADMIN, SUPERUSER)' },
            offset: { type: 'number', description: 'Pagination offset (default: 0)' },
            limit: { type: 'number', description: 'Number of results per page (default: 20, max: 100)' },
          },
        },
      },
      {
        name: 'get_business_user',
        description: 'Get a single business user by ID including name, email, role, and location permissions',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'The business user ID' },
          },
          required: ['id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_locations':         return this.listLocations(args);
        case 'get_location':           return this.getLocation(args);
        case 'create_location':        return this.createLocation(args);
        case 'update_location':        return this.updateLocation(args);
        case 'delete_location':        return this.deleteLocation(args);
        case 'list_services':          return this.listServices(args);
        case 'get_service':            return this.getService(args);
        case 'create_service':         return this.createService(args);
        case 'update_service':         return this.updateService(args);
        case 'delete_service':         return this.deleteService(args);
        case 'list_resources':         return this.listResources(args);
        case 'get_resource':           return this.getResource(args);
        case 'create_resource':        return this.createResource(args);
        case 'update_resource':        return this.updateResource(args);
        case 'delete_resource':        return this.deleteResource(args);
        case 'list_resource_allocations':  return this.listResourceAllocations(args);
        case 'create_resource_allocation': return this.createResourceAllocation(args);
        case 'get_resource_availability':  return this.getResourceAvailability(args);
        case 'list_calendars':         return this.listCalendars(args);
        case 'get_calendar':           return this.getCalendar(args);
        case 'list_appointments':      return this.listAppointments(args);
        case 'get_appointment':        return this.getAppointment(args);
        case 'list_customers':         return this.listCustomers(args);
        case 'get_customer':           return this.getCustomer(args);
        case 'get_company':            return this.getCompany();
        case 'update_company':         return this.updateCompany(args);
        case 'list_service_groups':    return this.listServiceGroups(args);
        case 'create_service_group':   return this.createServiceGroup(args);
        case 'list_resource_groups':   return this.listResourceGroups(args);
        case 'create_resource_group':  return this.createResourceGroup(args);
        case 'list_business_users':    return this.listBusinessUsers(args);
        case 'get_business_user':      return this.getBusinessUser(args);
        default:
          return {
            content: [{ type: 'text', text: `Unknown tool: ${name}` }],
            isError: true,
          };
      }
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Tool execution failed: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true,
      };
    }
  }

  private buildQuery(params: Record<string, unknown>): string {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null) q.set(k, String(v));
    }
    const s = q.toString();
    return s ? '?' + s : '';
  }

  private async handleResponse(response: Response): Promise<ToolResult> {
    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }
    const data = await response.json();
    return {
      content: [{ type: 'text', text: this.truncate(data) }],
      isError: false,
    };
  }

  // ── Locations ─────────────────────────────────────────────────────────────

  private async listLocations(args: Record<string, unknown>): Promise<ToolResult> {
    const qs = this.buildQuery({
      name: args.name, serviceId: args.serviceId, friendlyId: args.friendlyId,
      deleted: args.deleted, offset: args.offset, limit: args.limit,
    });
    return this.handleResponse(await this.apiFetch(`/setup/v1/locations${qs}`));
  }

  private async getLocation(args: Record<string, unknown>): Promise<ToolResult> {
    return this.handleResponse(await this.apiFetch(`/setup/v1/locations/${args.id}`));
  }

  private async createLocation(args: Record<string, unknown>): Promise<ToolResult> {
    return this.handleResponse(await this.apiFetch('/setup/v1/locations', {
      method: 'POST',
      body: JSON.stringify(args.body),
    }));
  }

  private async updateLocation(args: Record<string, unknown>): Promise<ToolResult> {
    return this.handleResponse(await this.apiFetch(`/setup/v1/locations/${args.id}`, {
      method: 'PUT',
      body: JSON.stringify(args.body),
    }));
  }

  private async deleteLocation(args: Record<string, unknown>): Promise<ToolResult> {
    return this.handleResponse(await this.apiFetch(`/setup/v1/locations/${args.id}`, {
      method: 'DELETE',
    }));
  }

  // ── Services ──────────────────────────────────────────────────────────────

  private async listServices(args: Record<string, unknown>): Promise<ToolResult> {
    const qs = this.buildQuery({
      locationId: args.locationId, serviceGroupId: args.serviceGroupId,
      deleted: args.deleted, offset: args.offset, limit: args.limit,
    });
    return this.handleResponse(await this.apiFetch(`/setup/v1/services${qs}`));
  }

  private async getService(args: Record<string, unknown>): Promise<ToolResult> {
    return this.handleResponse(await this.apiFetch(`/setup/v1/services/${args.id}`));
  }

  private async createService(args: Record<string, unknown>): Promise<ToolResult> {
    return this.handleResponse(await this.apiFetch('/setup/v1/services', {
      method: 'POST',
      body: JSON.stringify(args.body),
    }));
  }

  private async updateService(args: Record<string, unknown>): Promise<ToolResult> {
    return this.handleResponse(await this.apiFetch(`/setup/v1/services/${args.id}`, {
      method: 'PUT',
      body: JSON.stringify(args.body),
    }));
  }

  private async deleteService(args: Record<string, unknown>): Promise<ToolResult> {
    return this.handleResponse(await this.apiFetch(`/setup/v1/services/${args.id}`, {
      method: 'DELETE',
    }));
  }

  // ── Resources ─────────────────────────────────────────────────────────────

  private async listResources(args: Record<string, unknown>): Promise<ToolResult> {
    const qs = this.buildQuery({
      locationId: args.locationId, resourceGroupId: args.resourceGroupId,
      email: args.email, name: args.name, deleted: args.deleted,
      offset: args.offset, limit: args.limit,
    });
    return this.handleResponse(await this.apiFetch(`/setup/v1/resources${qs}`));
  }

  private async getResource(args: Record<string, unknown>): Promise<ToolResult> {
    return this.handleResponse(await this.apiFetch(`/setup/v1/resources/${args.id}`));
  }

  private async createResource(args: Record<string, unknown>): Promise<ToolResult> {
    return this.handleResponse(await this.apiFetch('/setup/v1/resources', {
      method: 'POST',
      body: JSON.stringify(args.body),
    }));
  }

  private async updateResource(args: Record<string, unknown>): Promise<ToolResult> {
    return this.handleResponse(await this.apiFetch(`/setup/v1/resources/${args.id}`, {
      method: 'PUT',
      body: JSON.stringify(args.body),
    }));
  }

  private async deleteResource(args: Record<string, unknown>): Promise<ToolResult> {
    return this.handleResponse(await this.apiFetch(`/setup/v1/resources/${args.id}`, {
      method: 'DELETE',
    }));
  }

  private async listResourceAllocations(args: Record<string, unknown>): Promise<ToolResult> {
    const qs = this.buildQuery({
      startDate: args.startDate, endDate: args.endDate,
      offset: args.offset, limit: args.limit,
    });
    return this.handleResponse(await this.apiFetch(`/setup/v1/resources/${args.id}/allocations${qs}`));
  }

  private async createResourceAllocation(args: Record<string, unknown>): Promise<ToolResult> {
    return this.handleResponse(await this.apiFetch(`/setup/v1/resources/${args.id}/allocations`, {
      method: 'POST',
      body: JSON.stringify(args.body),
    }));
  }

  private async getResourceAvailability(args: Record<string, unknown>): Promise<ToolResult> {
    return this.handleResponse(await this.apiFetch(`/setup/v1/resources/${args.id}/availability`));
  }

  // ── Calendars ─────────────────────────────────────────────────────────────

  private async listCalendars(args: Record<string, unknown>): Promise<ToolResult> {
    const qs = this.buildQuery({
      locationId: args.locationId, deleted: args.deleted,
      offset: args.offset, limit: args.limit,
    });
    return this.handleResponse(await this.apiFetch(`/setup/v1/calendars${qs}`));
  }

  private async getCalendar(args: Record<string, unknown>): Promise<ToolResult> {
    return this.handleResponse(await this.apiFetch(`/setup/v1/calendars/${args.id}`));
  }

  // ── Appointments ──────────────────────────────────────────────────────────

  private async listAppointments(args: Record<string, unknown>): Promise<ToolResult> {
    const qs = this.buildQuery({
      locationId: args.locationId, email: args.email, lastname: args.lastname,
      serviceId: args.serviceId, calendarId: args.calendarId, resourceId: args.resourceId,
      customerId: args.customerId, startDate: args.startDate, endDate: args.endDate,
      status: args.status, offset: args.offset, limit: args.limit,
    });
    return this.handleResponse(await this.apiFetch(`/setup/v1/appointments${qs}`));
  }

  private async getAppointment(args: Record<string, unknown>): Promise<ToolResult> {
    return this.handleResponse(await this.apiFetch(`/setup/v1/appointments/${args.id}`));
  }

  // ── Customers ─────────────────────────────────────────────────────────────

  private async listCustomers(args: Record<string, unknown>): Promise<ToolResult> {
    const qs = this.buildQuery({
      locationId: args.locationId, groupId: args.groupId, email: args.email,
      lastname: args.lastname, deleted: args.deleted, offset: args.offset, limit: args.limit,
    });
    return this.handleResponse(await this.apiFetch(`/setup/v1/customers${qs}`));
  }

  private async getCustomer(args: Record<string, unknown>): Promise<ToolResult> {
    return this.handleResponse(await this.apiFetch(`/setup/v1/customers/${args.id}`));
  }

  // ── Company ───────────────────────────────────────────────────────────────

  private async getCompany(): Promise<ToolResult> {
    return this.handleResponse(await this.apiFetch('/setup/v1/companies'));
  }

  private async updateCompany(args: Record<string, unknown>): Promise<ToolResult> {
    return this.handleResponse(await this.apiFetch('/setup/v1/companies', {
      method: 'PUT',
      body: JSON.stringify(args.body),
    }));
  }

  // ── Service Groups ────────────────────────────────────────────────────────

  private async listServiceGroups(args: Record<string, unknown>): Promise<ToolResult> {
    const qs = this.buildQuery({
      locationId: args.locationId, offset: args.offset, limit: args.limit,
    });
    return this.handleResponse(await this.apiFetch(`/setup/v1/servicegroups${qs}`));
  }

  private async createServiceGroup(args: Record<string, unknown>): Promise<ToolResult> {
    return this.handleResponse(await this.apiFetch('/setup/v1/servicegroups', {
      method: 'POST',
      body: JSON.stringify(args.body),
    }));
  }

  // ── Resource Groups ───────────────────────────────────────────────────────

  private async listResourceGroups(args: Record<string, unknown>): Promise<ToolResult> {
    const qs = this.buildQuery({
      locationId: args.locationId, deleted: args.deleted,
      offset: args.offset, limit: args.limit,
    });
    return this.handleResponse(await this.apiFetch(`/setup/v1/resourcegroups${qs}`));
  }

  private async createResourceGroup(args: Record<string, unknown>): Promise<ToolResult> {
    return this.handleResponse(await this.apiFetch('/setup/v1/resourcegroups', {
      method: 'POST',
      body: JSON.stringify(args.body),
    }));
  }

  // ── Business Users ────────────────────────────────────────────────────────

  private async listBusinessUsers(args: Record<string, unknown>): Promise<ToolResult> {
    const qs = this.buildQuery({
      locationId: args.locationId, email: args.email, role: args.role,
      offset: args.offset, limit: args.limit,
    });
    return this.handleResponse(await this.apiFetch(`/setup/v1/businessusers${qs}`));
  }

  private async getBusinessUser(args: Record<string, unknown>): Promise<ToolResult> {
    return this.handleResponse(await this.apiFetch(`/setup/v1/businessusers/${args.id}`));
  }
}

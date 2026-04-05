/**
 * Envoy MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://envoy.com/products/ai-for-envoy — transport: N/A (beta, not yet publicly released), auth: N/A
// NOTE: Envoy (envoy.com) announced an MCP integration in beta as of 2026-03-28, accessible via "Register for beta trial"
//   at envoy.com/products/ai-for-envoy. No published GitHub repo, npm package, or documented endpoint found.
//   The beta is not an official released MCP server — it is a closed beta. The Envoy AI Gateway (envoyproxy.io)
//   also supports MCP but is a separate product (an API gateway proxy), not the workplace SaaS.
// Our adapter covers: 21 tools. Vendor MCP covers: 0 tools (beta, not released as of 2026-03-28).
// Recommendation: use-rest-api — no released vendor MCP server; REST adapter is the only integration available.
//   Re-evaluate when Envoy MCP exits beta. Document beta URL above for future contributors.
//
// Base URL: https://api.envoy.com/v1
// Auth: API key passed as Bearer token in the Authorization header.
//       Obtain via Envoy Dashboard → Settings → API Keys (private apps).
//       OAuth2 client credentials or authorization code are available for public/partner apps.
// Docs: https://developers.envoy.com/hub/docs/intro
//       https://developers.envoy.com/hub/reference/overview-1
// Rate limits: Not publicly documented; standard REST rate limiting enforced per API key.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface EnvoyConfig {
  apiKey: string;
  baseUrl?: string;
}

export class EnvoyMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: EnvoyConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.envoy.com/v1';
  }

  static catalog() {
    return {
      name: 'envoy',
      displayName: 'Envoy',
      version: '1.0.0',
      category: 'misc',
      keywords: [
        'envoy', 'visitor management', 'workplace', 'desk booking', 'room booking',
        'employee registration', 'visitor', 'invite', 'sign-in', 'badge', 'kiosk',
        'location', 'office', 'hybrid work', 'workplace platform',
      ],
      toolNames: [
        'list_locations', 'get_location',
        'list_invites', 'get_invite', 'create_invite', 'update_invite', 'delete_invite',
        'list_entries', 'get_entry', 'sign_out_visitor',
        'list_employees', 'get_employee', 'create_employee', 'update_employee', 'delete_employee',
        'list_desks', 'get_desk_availability', 'create_desk_reservation', 'cancel_desk_reservation',
        'list_flows', 'list_agreements',
      ],
      description: 'Envoy workplace platform: manage visitor invites, sign-ins, employee registrations, desk reservations, and location configuration.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_locations',
        description: 'List all workplace locations configured in the Envoy account with address and capacity info',
        inputSchema: {
          type: 'object',
          properties: {
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            per_page: {
              type: 'number',
              description: 'Results per page (default: 25, max: 100)',
            },
          },
        },
      },
      {
        name: 'get_location',
        description: 'Retrieve full details of a single Envoy location including address, timezone, and settings',
        inputSchema: {
          type: 'object',
          properties: {
            location_id: {
              type: 'string',
              description: 'Envoy location ID',
            },
          },
          required: ['location_id'],
        },
      },
      {
        name: 'list_invites',
        description: 'List visitor invites with optional filters for location, date range, status, and host',
        inputSchema: {
          type: 'object',
          properties: {
            location_id: {
              type: 'string',
              description: 'Filter invites by location ID',
            },
            status: {
              type: 'string',
              description: 'Filter by invite status: pending, approved, declined (default: all)',
            },
            start_date: {
              type: 'string',
              description: 'Return invites with expected arrival on or after YYYY-MM-DD',
            },
            end_date: {
              type: 'string',
              description: 'Return invites with expected arrival on or before YYYY-MM-DD',
            },
            host_email: {
              type: 'string',
              description: 'Filter invites by host email address',
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
        name: 'get_invite',
        description: 'Retrieve full details of a visitor invite by invite ID including visitor info and host',
        inputSchema: {
          type: 'object',
          properties: {
            invite_id: {
              type: 'string',
              description: 'Envoy invite ID',
            },
          },
          required: ['invite_id'],
        },
      },
      {
        name: 'create_invite',
        description: 'Create a visitor invite for a specific location and expected arrival date',
        inputSchema: {
          type: 'object',
          properties: {
            location_id: {
              type: 'string',
              description: 'Location ID where the visitor will arrive',
            },
            visitor_email: {
              type: 'string',
              description: 'Email address of the expected visitor',
            },
            visitor_name: {
              type: 'string',
              description: 'Full name of the expected visitor',
            },
            expected_arrival: {
              type: 'string',
              description: 'Expected arrival date and time in ISO 8601 format e.g. 2026-04-01T10:00:00-05:00',
            },
            host_email: {
              type: 'string',
              description: 'Email of the employee hosting the visitor',
            },
            note: {
              type: 'string',
              description: 'Optional note or message to include with the invite',
            },
            flow_id: {
              type: 'string',
              description: 'Sign-in flow ID to use for this visitor (defaults to location default)',
            },
          },
          required: ['location_id', 'visitor_email', 'visitor_name', 'expected_arrival', 'host_email'],
        },
      },
      {
        name: 'update_invite',
        description: 'Update an existing visitor invite to change arrival time, host, or notes',
        inputSchema: {
          type: 'object',
          properties: {
            invite_id: {
              type: 'string',
              description: 'Envoy invite ID to update',
            },
            expected_arrival: {
              type: 'string',
              description: 'New expected arrival in ISO 8601 format',
            },
            host_email: {
              type: 'string',
              description: 'New host email address',
            },
            note: {
              type: 'string',
              description: 'Updated note for the invite',
            },
          },
          required: ['invite_id'],
        },
      },
      {
        name: 'delete_invite',
        description: 'Delete a visitor invite by ID, cancelling the scheduled visit',
        inputSchema: {
          type: 'object',
          properties: {
            invite_id: {
              type: 'string',
              description: 'Envoy invite ID to delete',
            },
          },
          required: ['invite_id'],
        },
      },
      {
        name: 'list_entries',
        description: 'List visitor sign-in entries (completed arrivals) with filters for location and date range',
        inputSchema: {
          type: 'object',
          properties: {
            location_id: {
              type: 'string',
              description: 'Filter sign-in entries by location ID',
            },
            start_date: {
              type: 'string',
              description: 'Return entries signed in on or after YYYY-MM-DD',
            },
            end_date: {
              type: 'string',
              description: 'Return entries signed in on or before YYYY-MM-DD',
            },
            signed_out: {
              type: 'boolean',
              description: 'Filter to signed-out visitors only (true) or currently on-site only (false)',
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
        name: 'get_entry',
        description: 'Retrieve full details of a visitor sign-in entry including sign-in and sign-out times',
        inputSchema: {
          type: 'object',
          properties: {
            entry_id: {
              type: 'string',
              description: 'Envoy entry ID',
            },
          },
          required: ['entry_id'],
        },
      },
      {
        name: 'sign_out_visitor',
        description: 'Manually sign out a visitor who is currently checked in at a location',
        inputSchema: {
          type: 'object',
          properties: {
            entry_id: {
              type: 'string',
              description: 'Entry ID of the currently signed-in visitor to sign out',
            },
          },
          required: ['entry_id'],
        },
      },
      {
        name: 'list_employees',
        description: 'List employees registered in Envoy with optional location and status filters',
        inputSchema: {
          type: 'object',
          properties: {
            location_id: {
              type: 'string',
              description: 'Filter employees by home location ID',
            },
            status: {
              type: 'string',
              description: 'Filter by status: active, inactive (default: active)',
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
        name: 'get_employee',
        description: 'Retrieve profile of an employee by Envoy employee ID including location and contact info',
        inputSchema: {
          type: 'object',
          properties: {
            employee_id: {
              type: 'string',
              description: 'Envoy employee ID',
            },
          },
          required: ['employee_id'],
        },
      },
      {
        name: 'create_employee',
        description: 'Add a new employee record to Envoy for visitor host lookups and desk reservations',
        inputSchema: {
          type: 'object',
          properties: {
            email: {
              type: 'string',
              description: 'Employee email address',
            },
            name: {
              type: 'string',
              description: 'Full name of the employee',
            },
            phone: {
              type: 'string',
              description: 'Employee phone number for visitor notifications',
            },
            location_id: {
              type: 'string',
              description: 'Primary location ID for this employee',
            },
          },
          required: ['email', 'name'],
        },
      },
      {
        name: 'update_employee',
        description: 'Update an employee record in Envoy by employee ID',
        inputSchema: {
          type: 'object',
          properties: {
            employee_id: {
              type: 'string',
              description: 'Envoy employee ID to update',
            },
            name: {
              type: 'string',
              description: 'Updated full name',
            },
            phone: {
              type: 'string',
              description: 'Updated phone number',
            },
            location_id: {
              type: 'string',
              description: 'Updated primary location ID',
            },
          },
          required: ['employee_id'],
        },
      },
      {
        name: 'delete_employee',
        description: 'Remove an employee record from Envoy by employee ID',
        inputSchema: {
          type: 'object',
          properties: {
            employee_id: {
              type: 'string',
              description: 'Envoy employee ID to delete',
            },
          },
          required: ['employee_id'],
        },
      },
      {
        name: 'list_desks',
        description: 'List desks available at a location with zone, floor, and amenity information',
        inputSchema: {
          type: 'object',
          properties: {
            location_id: {
              type: 'string',
              description: 'Location ID to list desks for',
            },
            floor: {
              type: 'string',
              description: 'Filter desks by floor name or number',
            },
            zone: {
              type: 'string',
              description: 'Filter desks by zone or neighborhood name',
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
          required: ['location_id'],
        },
      },
      {
        name: 'get_desk_availability',
        description: 'Check availability of desks at a location for a specific date or date range',
        inputSchema: {
          type: 'object',
          properties: {
            location_id: {
              type: 'string',
              description: 'Location ID to check desk availability for',
            },
            date: {
              type: 'string',
              description: 'Date to check availability for in YYYY-MM-DD format',
            },
            end_date: {
              type: 'string',
              description: 'End date for a range check in YYYY-MM-DD format (optional)',
            },
            floor: {
              type: 'string',
              description: 'Filter to desks on a specific floor',
            },
          },
          required: ['location_id', 'date'],
        },
      },
      {
        name: 'create_desk_reservation',
        description: 'Reserve a desk for an employee at a location for a specific date',
        inputSchema: {
          type: 'object',
          properties: {
            desk_id: {
              type: 'string',
              description: 'Desk ID to reserve',
            },
            employee_id: {
              type: 'string',
              description: 'Envoy employee ID making the reservation',
            },
            date: {
              type: 'string',
              description: 'Reservation date in YYYY-MM-DD format',
            },
          },
          required: ['desk_id', 'employee_id', 'date'],
        },
      },
      {
        name: 'cancel_desk_reservation',
        description: 'Cancel an existing desk reservation by reservation ID',
        inputSchema: {
          type: 'object',
          properties: {
            reservation_id: {
              type: 'string',
              description: 'Desk reservation ID to cancel',
            },
          },
          required: ['reservation_id'],
        },
      },
      {
        name: 'list_flows',
        description: 'List sign-in flows configured for a location (visitor types, questions, NDA agreements)',
        inputSchema: {
          type: 'object',
          properties: {
            location_id: {
              type: 'string',
              description: 'Location ID to list sign-in flows for',
            },
          },
          required: ['location_id'],
        },
      },
      {
        name: 'list_agreements',
        description: 'List legal agreements (NDAs, policies) configured in Envoy sign-in flows for a location',
        inputSchema: {
          type: 'object',
          properties: {
            location_id: {
              type: 'string',
              description: 'Location ID to list agreements for',
            },
            flow_id: {
              type: 'string',
              description: 'Optionally filter agreements by sign-in flow ID',
            },
          },
          required: ['location_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_locations': return this.listLocations(args);
        case 'get_location': return this.getLocation(args);
        case 'list_invites': return this.listInvites(args);
        case 'get_invite': return this.getInvite(args);
        case 'create_invite': return this.createInvite(args);
        case 'update_invite': return this.updateInvite(args);
        case 'delete_invite': return this.deleteInvite(args);
        case 'list_entries': return this.listEntries(args);
        case 'get_entry': return this.getEntry(args);
        case 'sign_out_visitor': return this.signOutVisitor(args);
        case 'list_employees': return this.listEmployees(args);
        case 'get_employee': return this.getEmployee(args);
        case 'create_employee': return this.createEmployee(args);
        case 'update_employee': return this.updateEmployee(args);
        case 'delete_employee': return this.deleteEmployee(args);
        case 'list_desks': return this.listDesks(args);
        case 'get_desk_availability': return this.getDeskAvailability(args);
        case 'create_desk_reservation': return this.createDeskReservation(args);
        case 'cancel_desk_reservation': return this.cancelDeskReservation(args);
        case 'list_flows': return this.listFlows(args);
        case 'list_agreements': return this.listAgreements(args);
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
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  private async envGet(path: string, params: Record<string, string> = {}): Promise<ToolResult> {
    const qs = Object.keys(params).length ? '?' + new URLSearchParams(params).toString() : '';
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}${qs}`, { headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async envPost(path: string, body: Record<string, unknown>): Promise<ToolResult> {
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

  private async envPatch(path: string, body: Record<string, unknown>): Promise<ToolResult> {
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

  private async envDelete(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'DELETE',
      headers: this.headers,
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: JSON.stringify({ success: true, status: response.status }) }], isError: false };
  }


  private async listLocations(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      page: String((args.page as number) ?? 1),
      per_page: String((args.per_page as number) ?? 25),
    };
    return this.envGet('/locations', params);
  }

  private async getLocation(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.location_id) return { content: [{ type: 'text', text: 'location_id is required' }], isError: true };
    return this.envGet(`/locations/${encodeURIComponent(args.location_id as string)}`);
  }

  private async listInvites(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      page: String((args.page as number) ?? 1),
      per_page: String((args.per_page as number) ?? 25),
    };
    if (args.location_id) params['filter[location-id]'] = args.location_id as string;
    if (args.status) params['filter[status]'] = args.status as string;
    if (args.start_date) params['filter[start-date]'] = args.start_date as string;
    if (args.end_date) params['filter[end-date]'] = args.end_date as string;
    if (args.host_email) params['filter[host-email]'] = args.host_email as string;
    return this.envGet('/invites', params);
  }

  private async getInvite(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.invite_id) return { content: [{ type: 'text', text: 'invite_id is required' }], isError: true };
    return this.envGet(`/invites/${encodeURIComponent(args.invite_id as string)}`);
  }

  private async createInvite(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.location_id || !args.visitor_email || !args.visitor_name || !args.expected_arrival || !args.host_email) {
      return { content: [{ type: 'text', text: 'location_id, visitor_email, visitor_name, expected_arrival, and host_email are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      data: {
        type: 'invites',
        attributes: {
          'expected-arrival-time': args.expected_arrival,
          'visitor-email': args.visitor_email,
          'visitor-name': args.visitor_name,
          'host-email': args.host_email,
        },
        relationships: {
          location: { data: { type: 'locations', id: args.location_id } },
        },
      },
    };
    if (args.note) (body.data as Record<string, unknown>).attributes = {
      ...(body.data as Record<string, Record<string, unknown>>).attributes,
      note: args.note,
    };
    if (args.flow_id) {
      (body.data as Record<string, unknown>).relationships = {
        ...(body.data as Record<string, Record<string, unknown>>).relationships,
        flow: { data: { type: 'flows', id: args.flow_id } },
      };
    }
    return this.envPost('/invites', body);
  }

  private async updateInvite(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.invite_id) return { content: [{ type: 'text', text: 'invite_id is required' }], isError: true };
    const attributes: Record<string, unknown> = {};
    if (args.expected_arrival) attributes['expected-arrival-time'] = args.expected_arrival;
    if (args.host_email) attributes['host-email'] = args.host_email;
    if (args.note) attributes.note = args.note;
    return this.envPatch(`/invites/${encodeURIComponent(args.invite_id as string)}`, {
      data: { type: 'invites', id: args.invite_id, attributes },
    });
  }

  private async deleteInvite(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.invite_id) return { content: [{ type: 'text', text: 'invite_id is required' }], isError: true };
    return this.envDelete(`/invites/${encodeURIComponent(args.invite_id as string)}`);
  }

  private async listEntries(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      page: String((args.page as number) ?? 1),
      per_page: String((args.per_page as number) ?? 25),
    };
    if (args.location_id) params['filter[location-id]'] = args.location_id as string;
    if (args.start_date) params['filter[start-date]'] = args.start_date as string;
    if (args.end_date) params['filter[end-date]'] = args.end_date as string;
    if (typeof args.signed_out === 'boolean') params['filter[signed-out]'] = String(args.signed_out);
    return this.envGet('/entries', params);
  }

  private async getEntry(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.entry_id) return { content: [{ type: 'text', text: 'entry_id is required' }], isError: true };
    return this.envGet(`/entries/${encodeURIComponent(args.entry_id as string)}`);
  }

  private async signOutVisitor(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.entry_id) return { content: [{ type: 'text', text: 'entry_id is required' }], isError: true };
    return this.envPatch(`/entries/${encodeURIComponent(args.entry_id as string)}`, {
      data: {
        type: 'entries',
        id: args.entry_id,
        attributes: { 'signed-out-at': new Date().toISOString() },
      },
    });
  }

  private async listEmployees(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      page: String((args.page as number) ?? 1),
      per_page: String((args.per_page as number) ?? 25),
    };
    if (args.location_id) params['filter[location-id]'] = args.location_id as string;
    if (args.status) params['filter[status]'] = args.status as string;
    return this.envGet('/employees', params);
  }

  private async getEmployee(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.employee_id) return { content: [{ type: 'text', text: 'employee_id is required' }], isError: true };
    return this.envGet(`/employees/${encodeURIComponent(args.employee_id as string)}`);
  }

  private async createEmployee(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.email || !args.name) return { content: [{ type: 'text', text: 'email and name are required' }], isError: true };
    const attributes: Record<string, unknown> = { email: args.email, name: args.name };
    if (args.phone) attributes.phone = args.phone;
    const data: Record<string, unknown> = { type: 'employees', attributes };
    if (args.location_id) {
      data.relationships = { location: { data: { type: 'locations', id: args.location_id } } };
    }
    return this.envPost('/employees', { data });
  }

  private async updateEmployee(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.employee_id) return { content: [{ type: 'text', text: 'employee_id is required' }], isError: true };
    const attributes: Record<string, unknown> = {};
    if (args.name) attributes.name = args.name;
    if (args.phone) attributes.phone = args.phone;
    const data: Record<string, unknown> = { type: 'employees', id: args.employee_id, attributes };
    if (args.location_id) {
      data.relationships = { location: { data: { type: 'locations', id: args.location_id } } };
    }
    return this.envPatch(`/employees/${encodeURIComponent(args.employee_id as string)}`, { data });
  }

  private async deleteEmployee(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.employee_id) return { content: [{ type: 'text', text: 'employee_id is required' }], isError: true };
    return this.envDelete(`/employees/${encodeURIComponent(args.employee_id as string)}`);
  }

  private async listDesks(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.location_id) return { content: [{ type: 'text', text: 'location_id is required' }], isError: true };
    const params: Record<string, string> = {
      'filter[location-id]': args.location_id as string,
      page: String((args.page as number) ?? 1),
      per_page: String((args.per_page as number) ?? 25),
    };
    if (args.floor) params['filter[floor]'] = args.floor as string;
    if (args.zone) params['filter[zone]'] = args.zone as string;
    return this.envGet('/desks', params);
  }

  private async getDeskAvailability(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.location_id || !args.date) return { content: [{ type: 'text', text: 'location_id and date are required' }], isError: true };
    const params: Record<string, string> = {
      'filter[location-id]': args.location_id as string,
      'filter[date]': args.date as string,
    };
    if (args.end_date) params['filter[end-date]'] = args.end_date as string;
    if (args.floor) params['filter[floor]'] = args.floor as string;
    return this.envGet('/desks/availability', params);
  }

  private async createDeskReservation(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.desk_id || !args.employee_id || !args.date) {
      return { content: [{ type: 'text', text: 'desk_id, employee_id, and date are required' }], isError: true };
    }
    return this.envPost('/desk-reservations', {
      data: {
        type: 'desk-reservations',
        attributes: { date: args.date },
        relationships: {
          desk: { data: { type: 'desks', id: args.desk_id } },
          employee: { data: { type: 'employees', id: args.employee_id } },
        },
      },
    });
  }

  private async cancelDeskReservation(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.reservation_id) return { content: [{ type: 'text', text: 'reservation_id is required' }], isError: true };
    return this.envDelete(`/desk-reservations/${encodeURIComponent(args.reservation_id as string)}`);
  }

  private async listFlows(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.location_id) return { content: [{ type: 'text', text: 'location_id is required' }], isError: true };
    return this.envGet('/flows', { 'filter[location-id]': args.location_id as string });
  }

  private async listAgreements(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.location_id) return { content: [{ type: 'text', text: 'location_id is required' }], isError: true };
    const params: Record<string, string> = { 'filter[location-id]': args.location_id as string };
    if (args.flow_id) params['filter[flow-id]'] = args.flow_id as string;
    return this.envGet('/agreements', params);
  }
}

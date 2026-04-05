/**
 * Zenoti MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// No official Zenoti MCP server was found on GitHub.
//
// Base URL: https://api.zenoti.com
// Auth: Authorization header with API key (apikey scheme)
// Docs: https://docs.zenoti.com
// Rate limits: Varies by plan; typically 60-120 req/min

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface ZenotiConfig {
  apiKey: string;
  baseUrl?: string;
}

export class ZenotiMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: ZenotiConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.zenoti.com';
  }

  static catalog() {
    return {
      name: 'zenoti',
      displayName: 'Zenoti',
      version: '1.0.0',
      category: 'commerce' as const,
      keywords: ['zenoti', 'salon', 'spa', 'wellness', 'appointments', 'booking'],
      toolNames: [
        'list_centers',
        'get_center',
        'list_services',
        'get_service',
        'list_employees',
        'get_employee',
        'list_appointments',
        'get_appointment',
        'create_appointment',
        'update_appointment',
        'cancel_appointment',
        'list_clients',
        'get_client',
        'create_client',
        'list_invoices',
        'get_invoice',
      ],
      description: 'Zenoti salon/spa management adapter for the Epic AI Intelligence Platform',
      author: 'protectnil' as const,
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_centers',
        description: 'List all centers (locations/branches) in the Zenoti organization.',
        inputSchema: {
          type: 'object',
          properties: {
            page: { type: 'number', description: 'Page number for pagination (default: 1)' },
            size: { type: 'number', description: 'Number of results per page (default: 20, max: 100)' },
          },
        },
      },
      {
        name: 'get_center',
        description: 'Retrieve details for a specific center by its ID.',
        inputSchema: {
          type: 'object',
          properties: {
            center_id: { type: 'string', description: 'Unique identifier of the center' },
          },
          required: ['center_id'],
        },
      },
      {
        name: 'list_services',
        description: 'List services offered at a given center.',
        inputSchema: {
          type: 'object',
          properties: {
            center_id: { type: 'string', description: 'Center ID to list services for' },
            page: { type: 'number', description: 'Page number (default: 1)' },
            size: { type: 'number', description: 'Results per page (default: 20)' },
          },
          required: ['center_id'],
        },
      },
      {
        name: 'get_service',
        description: 'Retrieve details for a specific service by its ID.',
        inputSchema: {
          type: 'object',
          properties: {
            service_id: { type: 'string', description: 'Unique identifier of the service' },
          },
          required: ['service_id'],
        },
      },
      {
        name: 'list_employees',
        description: 'List employees (therapists/staff) at a given center.',
        inputSchema: {
          type: 'object',
          properties: {
            center_id: { type: 'string', description: 'Center ID to list employees for' },
            page: { type: 'number', description: 'Page number (default: 1)' },
            size: { type: 'number', description: 'Results per page (default: 20)' },
          },
          required: ['center_id'],
        },
      },
      {
        name: 'get_employee',
        description: 'Retrieve details for a specific employee by their ID.',
        inputSchema: {
          type: 'object',
          properties: {
            employee_id: { type: 'string', description: 'Unique identifier of the employee' },
          },
          required: ['employee_id'],
        },
      },
      {
        name: 'list_appointments',
        description: 'List appointments at a center with optional date range and status filters.',
        inputSchema: {
          type: 'object',
          properties: {
            center_id: { type: 'string', description: 'Center ID to list appointments for' },
            start_date: { type: 'string', description: 'Start date filter (ISO 8601 format, e.g. 2026-03-01)' },
            end_date: { type: 'string', description: 'End date filter (ISO 8601 format, e.g. 2026-03-31)' },
            status: { type: 'string', description: 'Filter by appointment status (e.g. Booked, Completed, Cancelled)' },
            page: { type: 'number', description: 'Page number (default: 1)' },
            size: { type: 'number', description: 'Results per page (default: 20)' },
          },
          required: ['center_id'],
        },
      },
      {
        name: 'get_appointment',
        description: 'Retrieve details for a specific appointment by its ID.',
        inputSchema: {
          type: 'object',
          properties: {
            appointment_id: { type: 'string', description: 'Unique identifier of the appointment' },
          },
          required: ['appointment_id'],
        },
      },
      {
        name: 'create_appointment',
        description: 'Book a new appointment at a center for a client.',
        inputSchema: {
          type: 'object',
          properties: {
            center_id: { type: 'string', description: 'Center ID where the appointment will be booked' },
            service_id: { type: 'string', description: 'Service ID for the appointment' },
            client_id: { type: 'string', description: 'Client ID for whom the appointment is being booked' },
            employee_id: { type: 'string', description: 'Employee (therapist) ID for the appointment (optional)' },
            start_time: { type: 'string', description: 'Appointment start time in ISO 8601 format (e.g. 2026-04-01T10:00:00)' },
            notes: { type: 'string', description: 'Optional notes for the appointment' },
          },
          required: ['center_id', 'service_id', 'client_id', 'start_time'],
        },
      },
      {
        name: 'update_appointment',
        description: 'Update an existing appointment (reschedule, change employee, add notes).',
        inputSchema: {
          type: 'object',
          properties: {
            appointment_id: { type: 'string', description: 'Unique identifier of the appointment to update' },
            start_time: { type: 'string', description: 'New start time in ISO 8601 format' },
            employee_id: { type: 'string', description: 'New employee ID' },
            notes: { type: 'string', description: 'Updated notes' },
          },
          required: ['appointment_id'],
        },
      },
      {
        name: 'cancel_appointment',
        description: 'Cancel an existing appointment by its ID.',
        inputSchema: {
          type: 'object',
          properties: {
            appointment_id: { type: 'string', description: 'Unique identifier of the appointment to cancel' },
            reason: { type: 'string', description: 'Cancellation reason (optional)' },
          },
          required: ['appointment_id'],
        },
      },
      {
        name: 'list_clients',
        description: 'Search and list clients at a center.',
        inputSchema: {
          type: 'object',
          properties: {
            center_id: { type: 'string', description: 'Center ID to list clients for' },
            search: { type: 'string', description: 'Search term (name, email, or phone)' },
            page: { type: 'number', description: 'Page number (default: 1)' },
            size: { type: 'number', description: 'Results per page (default: 20)' },
          },
          required: ['center_id'],
        },
      },
      {
        name: 'get_client',
        description: 'Retrieve details for a specific client by their ID.',
        inputSchema: {
          type: 'object',
          properties: {
            client_id: { type: 'string', description: 'Unique identifier of the client' },
          },
          required: ['client_id'],
        },
      },
      {
        name: 'create_client',
        description: 'Create a new client record in Zenoti.',
        inputSchema: {
          type: 'object',
          properties: {
            center_id: { type: 'string', description: 'Center ID where the client is being registered' },
            first_name: { type: 'string', description: "Client's first name" },
            last_name: { type: 'string', description: "Client's last name" },
            email: { type: 'string', description: "Client's email address" },
            phone: { type: 'string', description: "Client's phone number" },
            gender: { type: 'string', description: "Client's gender (Male, Female, Other)" },
            date_of_birth: { type: 'string', description: "Client's date of birth (YYYY-MM-DD)" },
          },
          required: ['center_id', 'first_name', 'last_name'],
        },
      },
      {
        name: 'list_invoices',
        description: 'List invoices for a center with optional date range filters.',
        inputSchema: {
          type: 'object',
          properties: {
            center_id: { type: 'string', description: 'Center ID to list invoices for' },
            start_date: { type: 'string', description: 'Start date filter (ISO 8601 format)' },
            end_date: { type: 'string', description: 'End date filter (ISO 8601 format)' },
            status: { type: 'string', description: 'Invoice status filter (e.g. Paid, Unpaid)' },
            page: { type: 'number', description: 'Page number (default: 1)' },
            size: { type: 'number', description: 'Results per page (default: 20)' },
          },
          required: ['center_id'],
        },
      },
      {
        name: 'get_invoice',
        description: 'Retrieve details for a specific invoice by its ID.',
        inputSchema: {
          type: 'object',
          properties: {
            invoice_id: { type: 'string', description: 'Unique identifier of the invoice' },
          },
          required: ['invoice_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_centers': return await this.listCenters(args);
        case 'get_center': return await this.getCenter(args);
        case 'list_services': return await this.listServices(args);
        case 'get_service': return await this.getService(args);
        case 'list_employees': return await this.listEmployees(args);
        case 'get_employee': return await this.getEmployee(args);
        case 'list_appointments': return await this.listAppointments(args);
        case 'get_appointment': return await this.getAppointment(args);
        case 'create_appointment': return await this.createAppointment(args);
        case 'update_appointment': return await this.updateAppointment(args);
        case 'cancel_appointment': return await this.cancelAppointment(args);
        case 'list_clients': return await this.listClients(args);
        case 'get_client': return await this.getClient(args);
        case 'create_client': return await this.createClient(args);
        case 'list_invoices': return await this.listInvoices(args);
        case 'get_invoice': return await this.getInvoice(args);
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
    return { Authorization: `apikey ${this.apiKey}`, 'Content-Type': 'application/json' };
  }


  private async httpGet(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, { method: 'GET', headers: this.headers });
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `Zenoti API error ${response.status}: ${errText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Zenoti returned non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async httpPost(path: string, body: unknown): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST', headers: this.headers, body: JSON.stringify(body),
    });
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `Zenoti API error ${response.status}: ${errText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Zenoti returned non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async httpPatch(path: string, body: unknown): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'PATCH', headers: this.headers, body: JSON.stringify(body),
    });
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `Zenoti API error ${response.status}: ${errText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Zenoti returned non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listCenters(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.page) params.set('page', String(args.page));
    if (args.size) params.set('size', String(args.size));
    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.httpGet(`/v1/centers${qs}`);
  }

  private async getCenter(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.center_id as string;
    if (!id) return { content: [{ type: 'text', text: 'center_id is required' }], isError: true };
    return this.httpGet(`/v1/centers/${encodeURIComponent(id)}`);
  }

  private async listServices(args: Record<string, unknown>): Promise<ToolResult> {
    const centerId = args.center_id as string;
    if (!centerId) return { content: [{ type: 'text', text: 'center_id is required' }], isError: true };
    const params = new URLSearchParams({ center_id: centerId });
    if (args.page) params.set('page', String(args.page));
    if (args.size) params.set('size', String(args.size));
    return this.httpGet(`/v1/catalog/services?${params.toString()}`);
  }

  private async getService(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.service_id as string;
    if (!id) return { content: [{ type: 'text', text: 'service_id is required' }], isError: true };
    return this.httpGet(`/v1/catalog/services/${encodeURIComponent(id)}`);
  }

  private async listEmployees(args: Record<string, unknown>): Promise<ToolResult> {
    const centerId = args.center_id as string;
    if (!centerId) return { content: [{ type: 'text', text: 'center_id is required' }], isError: true };
    const params = new URLSearchParams({ center_id: centerId });
    if (args.page) params.set('page', String(args.page));
    if (args.size) params.set('size', String(args.size));
    return this.httpGet(`/v1/employees?${params.toString()}`);
  }

  private async getEmployee(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.employee_id as string;
    if (!id) return { content: [{ type: 'text', text: 'employee_id is required' }], isError: true };
    return this.httpGet(`/v1/employees/${encodeURIComponent(id)}`);
  }

  private async listAppointments(args: Record<string, unknown>): Promise<ToolResult> {
    const centerId = args.center_id as string;
    if (!centerId) return { content: [{ type: 'text', text: 'center_id is required' }], isError: true };
    const params = new URLSearchParams({ center_id: centerId });
    if (args.start_date) params.set('start_date', args.start_date as string);
    if (args.end_date) params.set('end_date', args.end_date as string);
    if (args.status) params.set('status', args.status as string);
    if (args.page) params.set('page', String(args.page));
    if (args.size) params.set('size', String(args.size));
    return this.httpGet(`/v1/appointments?${params.toString()}`);
  }

  private async getAppointment(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.appointment_id as string;
    if (!id) return { content: [{ type: 'text', text: 'appointment_id is required' }], isError: true };
    return this.httpGet(`/v1/appointments/${encodeURIComponent(id)}`);
  }

  private async createAppointment(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.center_id || !args.service_id || !args.client_id || !args.start_time) {
      return { content: [{ type: 'text', text: 'center_id, service_id, client_id, and start_time are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      center_id: args.center_id,
      service_id: args.service_id,
      client_id: args.client_id,
      start_time: args.start_time,
    };
    if (args.employee_id) body['employee_id'] = args.employee_id;
    if (args.notes) body['notes'] = args.notes;
    return this.httpPost('/v1/appointments', body);
  }

  private async updateAppointment(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.appointment_id as string;
    if (!id) return { content: [{ type: 'text', text: 'appointment_id is required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.start_time) body['start_time'] = args.start_time;
    if (args.employee_id) body['employee_id'] = args.employee_id;
    if (args.notes) body['notes'] = args.notes;
    return this.httpPatch(`/v1/appointments/${encodeURIComponent(id)}`, body);
  }

  private async cancelAppointment(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.appointment_id as string;
    if (!id) return { content: [{ type: 'text', text: 'appointment_id is required' }], isError: true };
    const body: Record<string, unknown> = { status: 'Cancelled' };
    if (args.reason) body['reason'] = args.reason;
    return this.httpPatch(`/v1/appointments/${encodeURIComponent(id)}`, body);
  }

  private async listClients(args: Record<string, unknown>): Promise<ToolResult> {
    const centerId = args.center_id as string;
    if (!centerId) return { content: [{ type: 'text', text: 'center_id is required' }], isError: true };
    const params = new URLSearchParams({ center_id: centerId });
    if (args.search) params.set('search', args.search as string);
    if (args.page) params.set('page', String(args.page));
    if (args.size) params.set('size', String(args.size));
    return this.httpGet(`/v1/clients?${params.toString()}`);
  }

  private async getClient(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.client_id as string;
    if (!id) return { content: [{ type: 'text', text: 'client_id is required' }], isError: true };
    return this.httpGet(`/v1/clients/${encodeURIComponent(id)}`);
  }

  private async createClient(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.center_id || !args.first_name || !args.last_name) {
      return { content: [{ type: 'text', text: 'center_id, first_name, and last_name are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      center_id: args.center_id,
      first_name: args.first_name,
      last_name: args.last_name,
    };
    if (args.email) body['email'] = args.email;
    if (args.phone) body['mobile_phone'] = { country_code: '1', number: args.phone };
    if (args.gender) body['gender'] = args.gender;
    if (args.date_of_birth) body['date_of_birth'] = args.date_of_birth;
    return this.httpPost('/v1/clients', body);
  }

  private async listInvoices(args: Record<string, unknown>): Promise<ToolResult> {
    const centerId = args.center_id as string;
    if (!centerId) return { content: [{ type: 'text', text: 'center_id is required' }], isError: true };
    const params = new URLSearchParams({ center_id: centerId });
    if (args.start_date) params.set('start_date', args.start_date as string);
    if (args.end_date) params.set('end_date', args.end_date as string);
    if (args.status) params.set('status', args.status as string);
    if (args.page) params.set('page', String(args.page));
    if (args.size) params.set('size', String(args.size));
    return this.httpGet(`/v1/invoices?${params.toString()}`);
  }

  private async getInvoice(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.invoice_id as string;
    if (!id) return { content: [{ type: 'text', text: 'invoice_id is required' }], isError: true };
    return this.httpGet(`/v1/invoices/${encodeURIComponent(id)}`);
  }
}

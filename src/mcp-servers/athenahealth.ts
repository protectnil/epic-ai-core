/**
 * Athenahealth MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None publicly released as of 2026-03-28.
// Athenahealth announced/piloted an MCP server (athenaOne platform APIs, HIMSS 2026) but has not released
// a public GitHub repo or npm package as of this date. Two community adapters exist:
//   - https://github.com/ophydami/Athenahealth-MCP  (community, not official)
//   - https://github.com/ibbykhazanchi/athenahealth-mcp  (community, not official, ~4 tools)
// Neither qualifies under the official MCP criteria. Our adapter is a verified REST wrapper.
// Our adapter covers: 19 tools. Vendor MCP covers: N/A (not released).
// Recommendation: use-rest-api — no official MCP exists.
//
// Base URL (production): https://api.platform.athenahealth.com/v1/{practiceid}
// Base URL (preview):    https://api.preview.platform.athenahealth.com/v1/{practiceid}
// Auth: OAuth2 client credentials — token endpoint: https://api.platform.athenahealth.com/oauth2/v1/token
//   Token request uses Basic auth (base64 clientId:clientSecret) + grant_type=client_credentials
// Docs: https://docs.athenahealth.com/api/guides/overview
//       https://dev-portal-prod.developer.athena.io/api/guides/products-needed-api
// Rate limits: Not publicly specified; governed by partner tier. Use exponential backoff on 429.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface AthenaHealthConfig {
  clientId: string;
  clientSecret: string;
  practiceId: string;
  environment?: 'production' | 'preview';
}

export class AthenaHealthMCPServer extends MCPAdapterBase {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly practiceId: string;
  private readonly baseUrl: string;
  private readonly tokenUrl: string;
  private bearerToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(config: AthenaHealthConfig) {
    super();
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.practiceId = config.practiceId;
    const env = config.environment ?? 'production';
    const host = env === 'preview'
      ? 'api.preview.platform.athenahealth.com'
      : 'api.platform.athenahealth.com';
    this.baseUrl = `https://${host}/v1/${this.practiceId}`;
    this.tokenUrl = `https://${host}/oauth2/v1/token`;
  }

  static catalog() {
    return {
      name: 'athenahealth',
      displayName: 'Athenahealth',
      version: '1.0.0',
      category: 'misc' as const,
      keywords: [
        'athenahealth', 'ehr', 'emr', 'electronic health record', 'healthcare',
        'patient', 'appointment', 'clinical', 'medical', 'practice management',
        'chart', 'prescription', 'medication', 'diagnosis', 'provider',
      ],
      toolNames: [
        'get_practice_info',
        'search_patients', 'get_patient', 'create_patient', 'update_patient',
        'list_appointments', 'get_appointment', 'book_appointment', 'cancel_appointment',
        'get_patient_chart', 'list_problems', 'list_medications', 'list_allergies',
        'list_vitals', 'list_lab_results',
        'list_providers', 'get_provider',
        'list_departments', 'get_department',
      ],
      description: 'Access athenahealth EHR/PM: manage patients, appointments, clinical chart data, medications, labs, providers, and departments.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'get_practice_info',
        description: 'Retrieve configuration and details for the configured practice including departments and providers',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'search_patients',
        description: 'Search for patients by name, date of birth, or other demographic fields',
        inputSchema: {
          type: 'object',
          properties: {
            firstname: {
              type: 'string',
              description: 'Patient first name (partial match supported)',
            },
            lastname: {
              type: 'string',
              description: 'Patient last name (partial match supported)',
            },
            dob: {
              type: 'string',
              description: 'Date of birth in MM/DD/YYYY format',
            },
            email: {
              type: 'string',
              description: 'Patient email address',
            },
            phone: {
              type: 'string',
              description: 'Patient phone number (10 digits, no formatting)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results to return (default: 20, max: 100)',
            },
            offset: {
              type: 'number',
              description: 'Offset for pagination (default: 0)',
            },
          },
        },
      },
      {
        name: 'get_patient',
        description: 'Retrieve full demographic and contact information for a specific patient by their athenahealth patient ID',
        inputSchema: {
          type: 'object',
          properties: {
            patient_id: {
              type: 'string',
              description: 'Athenahealth patient ID',
            },
          },
          required: ['patient_id'],
        },
      },
      {
        name: 'create_patient',
        description: 'Register a new patient in the practice with demographic and contact information',
        inputSchema: {
          type: 'object',
          properties: {
            firstname: { type: 'string', description: 'Patient first name' },
            lastname: { type: 'string', description: 'Patient last name' },
            dob: { type: 'string', description: 'Date of birth in MM/DD/YYYY format' },
            sex: { type: 'string', description: 'Patient sex: M or F' },
            email: { type: 'string', description: 'Patient email address' },
            mobilephone: { type: 'string', description: '10-digit mobile phone number' },
            address1: { type: 'string', description: 'Street address line 1' },
            city: { type: 'string', description: 'City' },
            state: { type: 'string', description: '2-letter state abbreviation' },
            zip: { type: 'string', description: '5-digit ZIP code' },
            department_id: { type: 'string', description: 'Default department ID for the patient' },
          },
          required: ['firstname', 'lastname', 'dob', 'sex', 'department_id'],
        },
      },
      {
        name: 'update_patient',
        description: 'Update demographic or contact information for an existing patient',
        inputSchema: {
          type: 'object',
          properties: {
            patient_id: { type: 'string', description: 'Athenahealth patient ID to update' },
            firstname: { type: 'string', description: 'Updated first name' },
            lastname: { type: 'string', description: 'Updated last name' },
            email: { type: 'string', description: 'Updated email address' },
            mobilephone: { type: 'string', description: 'Updated mobile phone number' },
            address1: { type: 'string', description: 'Updated street address' },
            city: { type: 'string', description: 'Updated city' },
            state: { type: 'string', description: 'Updated 2-letter state abbreviation' },
            zip: { type: 'string', description: 'Updated ZIP code' },
          },
          required: ['patient_id'],
        },
      },
      {
        name: 'list_appointments',
        description: 'List scheduled appointments with optional filters for date range, department, provider, and status',
        inputSchema: {
          type: 'object',
          properties: {
            start_date: { type: 'string', description: 'Start of date range in MM/DD/YYYY format (default: today)' },
            end_date: { type: 'string', description: 'End of date range in MM/DD/YYYY format (default: today + 7 days)' },
            department_id: { type: 'string', description: 'Filter by department ID' },
            provider_id: { type: 'string', description: 'Filter by provider ID' },
            patient_id: { type: 'string', description: 'Filter appointments for a specific patient' },
            appointment_type_id: { type: 'string', description: 'Filter by appointment type ID' },
            limit: { type: 'number', description: 'Maximum results to return (default: 20, max: 200)' },
            offset: { type: 'number', description: 'Offset for pagination (default: 0)' },
          },
        },
      },
      {
        name: 'get_appointment',
        description: 'Get details of a specific appointment by appointment ID including patient, provider, and notes',
        inputSchema: {
          type: 'object',
          properties: {
            appointment_id: { type: 'string', description: 'Athenahealth appointment ID' },
          },
          required: ['appointment_id'],
        },
      },
      {
        name: 'book_appointment',
        description: 'Book a patient into an open appointment slot by appointment ID',
        inputSchema: {
          type: 'object',
          properties: {
            appointment_id: { type: 'string', description: 'ID of the open appointment slot to book' },
            patient_id: { type: 'string', description: 'Athenahealth patient ID to book into the slot' },
            appointment_type_id: { type: 'string', description: 'Appointment type ID' },
            reason_for_visit: { type: 'string', description: 'Reason for the visit (shown to provider)' },
          },
          required: ['appointment_id', 'patient_id'],
        },
      },
      {
        name: 'cancel_appointment',
        description: 'Cancel a scheduled patient appointment with an optional cancellation reason',
        inputSchema: {
          type: 'object',
          properties: {
            appointment_id: { type: 'string', description: 'ID of the appointment to cancel' },
            patient_id: { type: 'string', description: 'Patient ID associated with the appointment' },
            cancellation_reason: { type: 'string', description: 'Reason for cancellation (optional, shown in chart notes)' },
          },
          required: ['appointment_id', 'patient_id'],
        },
      },
      {
        name: 'get_patient_chart',
        description: 'Retrieve a summary of the patient chart including demographics, active problems, and recent encounters',
        inputSchema: {
          type: 'object',
          properties: {
            patient_id: { type: 'string', description: 'Athenahealth patient ID' },
            department_id: { type: 'string', description: 'Department context for the chart (required by some endpoints)' },
          },
          required: ['patient_id'],
        },
      },
      {
        name: 'list_problems',
        description: 'List active and inactive medical problems on a patient chart by patient ID',
        inputSchema: {
          type: 'object',
          properties: {
            patient_id: { type: 'string', description: 'Athenahealth patient ID' },
            show_inactive: { type: 'boolean', description: 'Include resolved/inactive problems (default: false)' },
          },
          required: ['patient_id'],
        },
      },
      {
        name: 'list_medications',
        description: 'List current and historical medications on a patient chart',
        inputSchema: {
          type: 'object',
          properties: {
            patient_id: { type: 'string', description: 'Athenahealth patient ID' },
            department_id: { type: 'string', description: 'Department ID for medication context' },
            show_inactive: { type: 'boolean', description: 'Include discontinued medications (default: false)' },
          },
          required: ['patient_id'],
        },
      },
      {
        name: 'list_allergies',
        description: 'List documented allergies and adverse reactions on a patient chart',
        inputSchema: {
          type: 'object',
          properties: {
            patient_id: { type: 'string', description: 'Athenahealth patient ID' },
          },
          required: ['patient_id'],
        },
      },
      {
        name: 'list_vitals',
        description: 'List recorded vital signs for a patient across encounters, optionally filtered by date range',
        inputSchema: {
          type: 'object',
          properties: {
            patient_id: { type: 'string', description: 'Athenahealth patient ID' },
            department_id: { type: 'string', description: 'Department context' },
            start_date: { type: 'string', description: 'Start of date range in MM/DD/YYYY format' },
            end_date: { type: 'string', description: 'End of date range in MM/DD/YYYY format' },
          },
          required: ['patient_id'],
        },
      },
      {
        name: 'list_lab_results',
        description: 'List laboratory results for a patient with optional date range and result status filters',
        inputSchema: {
          type: 'object',
          properties: {
            patient_id: { type: 'string', description: 'Athenahealth patient ID' },
            department_id: { type: 'string', description: 'Department context for the results' },
            start_date: { type: 'string', description: 'Start of date range in MM/DD/YYYY format' },
            end_date: { type: 'string', description: 'End of date range in MM/DD/YYYY format' },
            limit: { type: 'number', description: 'Maximum results to return (default: 20, max: 100)' },
          },
          required: ['patient_id'],
        },
      },
      {
        name: 'list_providers',
        description: 'List all providers in the practice with specialty, NPI, and contact details',
        inputSchema: {
          type: 'object',
          properties: {
            department_id: { type: 'string', description: 'Filter providers by department ID' },
            limit: { type: 'number', description: 'Maximum results to return (default: 50)' },
            offset: { type: 'number', description: 'Offset for pagination' },
          },
        },
      },
      {
        name: 'get_provider',
        description: 'Get profile details for a specific provider by their athenahealth provider ID',
        inputSchema: {
          type: 'object',
          properties: {
            provider_id: { type: 'string', description: 'Athenahealth provider ID' },
          },
          required: ['provider_id'],
        },
      },
      {
        name: 'list_departments',
        description: 'List all departments in the practice with location, phone, and service hours',
        inputSchema: {
          type: 'object',
          properties: {
            provider_id: { type: 'string', description: 'Filter departments by provider ID' },
            limit: { type: 'number', description: 'Maximum results to return (default: 50)' },
          },
        },
      },
      {
        name: 'get_department',
        description: 'Get details for a specific practice department by department ID',
        inputSchema: {
          type: 'object',
          properties: {
            department_id: { type: 'string', description: 'Athenahealth department ID' },
          },
          required: ['department_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'get_practice_info':
          return this.getPracticeInfo();
        case 'search_patients':
          return this.searchPatients(args);
        case 'get_patient':
          return this.getPatient(args);
        case 'create_patient':
          return this.createPatient(args);
        case 'update_patient':
          return this.updatePatient(args);
        case 'list_appointments':
          return this.listAppointments(args);
        case 'get_appointment':
          return this.getAppointment(args);
        case 'book_appointment':
          return this.bookAppointment(args);
        case 'cancel_appointment':
          return this.cancelAppointment(args);
        case 'get_patient_chart':
          return this.getPatientChart(args);
        case 'list_problems':
          return this.listProblems(args);
        case 'list_medications':
          return this.listMedications(args);
        case 'list_allergies':
          return this.listAllergies(args);
        case 'list_vitals':
          return this.listVitals(args);
        case 'list_lab_results':
          return this.listLabResults(args);
        case 'list_providers':
          return this.listProviders(args);
        case 'get_provider':
          return this.getProvider(args);
        case 'list_departments':
          return this.listDepartments(args);
        case 'get_department':
          return this.getDepartment(args);
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
    const response = await this.fetchWithRetry(this.tokenUrl, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${btoa(`${this.clientId}:${this.clientSecret}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });
    if (!response.ok) {
      throw new Error(`OAuth2 token request failed: ${response.status} ${response.statusText}`);
    }
    const data = await response.json() as { access_token: string; expires_in: number };
    this.bearerToken = data.access_token;
    this.tokenExpiry = now + (data.expires_in - 60) * 1000;
    return this.bearerToken;
  }

  private async apiGet(path: string, params?: Record<string, string>): Promise<ToolResult> {
    const token = await this.getOrRefreshToken();
    const qs = params && Object.keys(params).length > 0 ? '?' + new URLSearchParams(params).toString() : '';
    const url = `${this.baseUrl}${path}${qs}`;
    const response = await this.fetchWithRetry(url, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Athenahealth API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apiPost(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const token = await this.getOrRefreshToken();
    const form = new URLSearchParams();
    for (const [k, v] of Object.entries(body)) {
      if (v !== undefined && v !== null) form.append(k, String(v));
    }
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: form.toString(),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Athenahealth API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apiPut(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const token = await this.getOrRefreshToken();
    const form = new URLSearchParams();
    for (const [k, v] of Object.entries(body)) {
      if (v !== undefined && v !== null) form.append(k, String(v));
    }
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: form.toString(),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Athenahealth API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getPracticeInfo(): Promise<ToolResult> {
    return this.apiGet('');
  }

  private async searchPatients(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (args.firstname) params.firstname = args.firstname as string;
    if (args.lastname) params.lastname = args.lastname as string;
    if (args.dob) params.dob = args.dob as string;
    if (args.email) params.email = args.email as string;
    if (args.phone) params.homephone = args.phone as string;
    if (args.limit !== undefined) params.limit = String(args.limit);
    if (args.offset !== undefined) params.offset = String(args.offset);
    return this.apiGet('/patients', params);
  }

  private async getPatient(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.patient_id) return { content: [{ type: 'text', text: 'patient_id is required' }], isError: true };
    return this.apiGet(`/patients/${encodeURIComponent(args.patient_id as string)}`);
  }

  private async createPatient(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.firstname || !args.lastname || !args.dob || !args.sex || !args.department_id) {
      return { content: [{ type: 'text', text: 'firstname, lastname, dob, sex, and department_id are required' }], isError: true };
    }
    return this.apiPost('/patients', args as Record<string, unknown>);
  }

  private async updatePatient(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.patient_id) return { content: [{ type: 'text', text: 'patient_id is required' }], isError: true };
    const { patient_id, ...fields } = args;
    return this.apiPut(`/patients/${patient_id as string}`, fields);
  }

  private async listAppointments(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (args.start_date) params.startdate = args.start_date as string;
    if (args.end_date) params.enddate = args.end_date as string;
    if (args.department_id) params.departmentid = args.department_id as string;
    if (args.provider_id) params.providerid = args.provider_id as string;
    if (args.patient_id) params.patientid = args.patient_id as string;
    if (args.appointment_type_id) params.appointmenttypeid = args.appointment_type_id as string;
    if (args.limit !== undefined) params.limit = String(args.limit);
    if (args.offset !== undefined) params.offset = String(args.offset);
    return this.apiGet('/appointments/booked', params);
  }

  private async getAppointment(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.appointment_id) return { content: [{ type: 'text', text: 'appointment_id is required' }], isError: true };
    return this.apiGet(`/appointments/${encodeURIComponent(args.appointment_id as string)}`);
  }

  private async bookAppointment(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.appointment_id || !args.patient_id) {
      return { content: [{ type: 'text', text: 'appointment_id and patient_id are required' }], isError: true };
    }
    const body: Record<string, unknown> = { patientid: args.patient_id };
    if (args.appointment_type_id) body.appointmenttypeid = args.appointment_type_id;
    if (args.reason_for_visit) body.reasonid = args.reason_for_visit;
    return this.apiPost(`/appointments/${encodeURIComponent(args.appointment_id as string)}`, body);
  }

  private async cancelAppointment(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.appointment_id || !args.patient_id) {
      return { content: [{ type: 'text', text: 'appointment_id and patient_id are required' }], isError: true };
    }
    const body: Record<string, unknown> = { patientid: args.patient_id };
    if (args.cancellation_reason) body.cancellationreasonid = args.cancellation_reason;
    return this.apiPost(`/appointments/${encodeURIComponent(args.appointment_id as string)}/cancel`, body);
  }

  private async getPatientChart(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.patient_id) return { content: [{ type: 'text', text: 'patient_id is required' }], isError: true };
    const params: Record<string, string> = {};
    if (args.department_id) params.departmentid = args.department_id as string;
    return this.apiGet(`/patients/${encodeURIComponent(args.patient_id as string)}/chart/summary`, params);
  }

  private async listProblems(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.patient_id) return { content: [{ type: 'text', text: 'patient_id is required' }], isError: true };
    const params: Record<string, string> = {};
    if (args.show_inactive) params.showinactive = 'true';
    return this.apiGet(`/patients/${encodeURIComponent(args.patient_id as string)}/problems`, params);
  }

  private async listMedications(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.patient_id) return { content: [{ type: 'text', text: 'patient_id is required' }], isError: true };
    const params: Record<string, string> = {};
    if (args.department_id) params.departmentid = args.department_id as string;
    if (args.show_inactive) params.showinactive = 'true';
    return this.apiGet(`/patients/${encodeURIComponent(args.patient_id as string)}/medications`, params);
  }

  private async listAllergies(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.patient_id) return { content: [{ type: 'text', text: 'patient_id is required' }], isError: true };
    return this.apiGet(`/patients/${encodeURIComponent(args.patient_id as string)}/allergies`);
  }

  private async listVitals(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.patient_id) return { content: [{ type: 'text', text: 'patient_id is required' }], isError: true };
    const params: Record<string, string> = {};
    if (args.department_id) params.departmentid = args.department_id as string;
    if (args.start_date) params.startdate = args.start_date as string;
    if (args.end_date) params.enddate = args.end_date as string;
    return this.apiGet(`/patients/${encodeURIComponent(args.patient_id as string)}/vitals`, params);
  }

  private async listLabResults(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.patient_id) return { content: [{ type: 'text', text: 'patient_id is required' }], isError: true };
    const params: Record<string, string> = {};
    if (args.department_id) params.departmentid = args.department_id as string;
    if (args.start_date) params.startdate = args.start_date as string;
    if (args.end_date) params.enddate = args.end_date as string;
    if (args.limit !== undefined) params.limit = String(args.limit);
    return this.apiGet(`/patients/${encodeURIComponent(args.patient_id as string)}/documents/labresult`, params);
  }

  private async listProviders(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (args.department_id) params.departmentid = args.department_id as string;
    if (args.limit !== undefined) params.limit = String(args.limit);
    if (args.offset !== undefined) params.offset = String(args.offset);
    return this.apiGet('/providers', params);
  }

  private async getProvider(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.provider_id) return { content: [{ type: 'text', text: 'provider_id is required' }], isError: true };
    return this.apiGet(`/providers/${encodeURIComponent(args.provider_id as string)}`);
  }

  private async listDepartments(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (args.provider_id) params.providerid = args.provider_id as string;
    if (args.limit !== undefined) params.limit = String(args.limit);
    return this.apiGet('/departments', params);
  }

  private async getDepartment(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.department_id) return { content: [{ type: 'text', text: 'department_id is required' }], isError: true };
    return this.apiGet(`/departments/${encodeURIComponent(args.department_id as string)}`);
  }
}

/**
 * Accela MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// No official Accela MCP server was found on GitHub or the Accela Developer Portal.
// Community GitHub resources exist (michaelachrisco/Accela-GitHub-Resources) but none implement MCP.
//
// Base URL: https://apis.accela.com
// Auth: OAuth2 — Authorization Code, Implicit, or Password Credential flows.
//   Token endpoint: https://auth.accela.com/oauth2/token
//   Token info: https://auth.accela.com/oauth2/tokeninfo
//   Bearer token required in Authorization header for all API calls.
// Docs: https://developer.accela.com/docs/
// Rate limits: Not publicly documented. Rate limiting introduced in Construct 4.2.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface AccelaConfig {
  /** OAuth2 Bearer access token obtained via Accela auth flows */
  accessToken: string;
  /** Agency name required for scoped API calls (e.g. "CITYOFTEST") */
  agencyName?: string;
  /** Optional base URL override (default: https://apis.accela.com) */
  baseUrl?: string;
}

export class AccelaMCPServer extends MCPAdapterBase {
  private readonly accessToken: string;
  private readonly baseUrl: string;

  constructor(config: AccelaConfig) {
    super();
    this.accessToken = config.accessToken;
    this.baseUrl = config.baseUrl ?? 'https://apis.accela.com';
  }

  static catalog() {
    return {
      name: 'accela',
      displayName: 'Accela',
      version: '1.0.0',
      category: 'misc',
      keywords: [
        'accela', 'permit', 'permitting', 'license', 'licensing', 'government',
        'civic', 'inspection', 'code enforcement', 'building permit', 'land use',
        'planning', 'zoning', 'asset management', 'complaint', 'work order',
      ],
      toolNames: [
        'list_records', 'get_record', 'create_record', 'update_record',
        'list_record_documents', 'get_record_document',
        'list_inspections', 'get_inspection', 'schedule_inspection', 'update_inspection_result',
        'list_record_contacts', 'get_record_contact',
        'list_record_addresses', 'list_record_parcels',
        'list_record_conditions', 'add_record_condition',
        'list_record_fees', 'list_record_custom_forms',
        'search_records',
      ],
      description: 'Government permitting, licensing, and inspections via Accela Civic Platform. Manage permits, inspections, conditions, fees, documents, and contacts.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_records',
        description: 'List permit, license, or enforcement records with optional filters for type, status, agency, and date range',
        inputSchema: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              description: 'Record module type filter (e.g. Building, License, Enforcement, Planning)',
            },
            status: {
              type: 'string',
              description: 'Filter by record status (e.g. Open, Closed, Issued, Expired)',
            },
            opened_date_from: {
              type: 'string',
              description: 'Filter records opened on or after this date (format: MM/DD/YYYY)',
            },
            opened_date_to: {
              type: 'string',
              description: 'Filter records opened on or before this date (format: MM/DD/YYYY)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of records to return (default: 20, max: 1000)',
            },
            offset: {
              type: 'number',
              description: 'Number of records to skip for pagination (default: 0)',
            },
            fields: {
              type: 'string',
              description: 'Comma-separated list of fields to return (default: all)',
            },
          },
        },
      },
      {
        name: 'get_record',
        description: 'Get full details of a single permit, license, or enforcement record by its record ID',
        inputSchema: {
          type: 'object',
          properties: {
            record_id: {
              type: 'string',
              description: 'Accela record ID (e.g. BLDG-2024-001234 or the internal Accela ID)',
            },
            fields: {
              type: 'string',
              description: 'Comma-separated list of fields to return (default: all)',
            },
          },
          required: ['record_id'],
        },
      },
      {
        name: 'create_record',
        description: 'Create a new permit, license, or civic record in the Accela system',
        inputSchema: {
          type: 'object',
          properties: {
            type: {
              type: 'object',
              description: 'Record type object with group, type, subType, and category fields identifying the record module',
            },
            name: {
              type: 'string',
              description: 'Descriptive name or short description of the record',
            },
            description: {
              type: 'string',
              description: 'Full description of the permit or license application',
            },
            status: {
              type: 'string',
              description: 'Initial record status (default: Application Accepted)',
            },
          },
          required: ['type'],
        },
      },
      {
        name: 'update_record',
        description: 'Update status, description, or other fields on an existing permit or license record',
        inputSchema: {
          type: 'object',
          properties: {
            record_id: {
              type: 'string',
              description: 'Accela record ID to update',
            },
            status: {
              type: 'string',
              description: 'New status to set on the record (e.g. Issued, Closed, Approved)',
            },
            description: {
              type: 'string',
              description: 'Updated description text',
            },
            name: {
              type: 'string',
              description: 'Updated record name',
            },
          },
          required: ['record_id'],
        },
      },
      {
        name: 'list_record_documents',
        description: 'List all documents attached to a permit or license record',
        inputSchema: {
          type: 'object',
          properties: {
            record_id: {
              type: 'string',
              description: 'Accela record ID to list documents for',
            },
            fields: {
              type: 'string',
              description: 'Comma-separated fields to return (default: all)',
            },
          },
          required: ['record_id'],
        },
      },
      {
        name: 'get_record_document',
        description: 'Get metadata for a specific document attached to a permit record',
        inputSchema: {
          type: 'object',
          properties: {
            record_id: {
              type: 'string',
              description: 'Accela record ID',
            },
            document_id: {
              type: 'string',
              description: 'Document ID to retrieve metadata for',
            },
          },
          required: ['record_id', 'document_id'],
        },
      },
      {
        name: 'list_inspections',
        description: 'List inspections for a permit record with optional status and date filters',
        inputSchema: {
          type: 'object',
          properties: {
            record_id: {
              type: 'string',
              description: 'Accela record ID to list inspections for',
            },
            status: {
              type: 'string',
              description: 'Filter by inspection status (e.g. Scheduled, Approved, Failed, Pending)',
            },
            scheduled_date_from: {
              type: 'string',
              description: 'Filter inspections scheduled on or after this date (MM/DD/YYYY)',
            },
            scheduled_date_to: {
              type: 'string',
              description: 'Filter inspections scheduled on or before this date (MM/DD/YYYY)',
            },
            limit: {
              type: 'number',
              description: 'Maximum inspections to return (default: 20)',
            },
            offset: {
              type: 'number',
              description: 'Pagination offset (default: 0)',
            },
          },
          required: ['record_id'],
        },
      },
      {
        name: 'get_inspection',
        description: 'Get full details of a specific inspection by inspection ID and parent record ID',
        inputSchema: {
          type: 'object',
          properties: {
            record_id: {
              type: 'string',
              description: 'Parent permit record ID',
            },
            inspection_id: {
              type: 'string',
              description: 'Inspection ID to retrieve',
            },
          },
          required: ['record_id', 'inspection_id'],
        },
      },
      {
        name: 'schedule_inspection',
        description: 'Schedule a new inspection for a permit record on a specific date and time',
        inputSchema: {
          type: 'object',
          properties: {
            record_id: {
              type: 'string',
              description: 'Permit record ID to schedule the inspection under',
            },
            inspection_type: {
              type: 'object',
              description: 'Inspection type object with group and value fields (e.g. {"group": "Building", "value": "Framing"})',
            },
            scheduled_date: {
              type: 'string',
              description: 'Scheduled inspection date (format: MM/DD/YYYY)',
            },
            scheduled_time: {
              type: 'string',
              description: 'Scheduled inspection time in HH:MM AM/PM format (e.g. 10:00 AM)',
            },
            request_comment: {
              type: 'string',
              description: 'Comment or instructions for the inspector',
            },
          },
          required: ['record_id', 'inspection_type'],
        },
      },
      {
        name: 'update_inspection_result',
        description: 'Record the result of a completed inspection (pass, fail, approved, or corrections required)',
        inputSchema: {
          type: 'object',
          properties: {
            record_id: {
              type: 'string',
              description: 'Parent permit record ID',
            },
            inspection_id: {
              type: 'string',
              description: 'Inspection ID to update',
            },
            result: {
              type: 'object',
              description: 'Result object with value field (e.g. {"value": "Approved"} or {"value": "Failed"})',
            },
            result_comment: {
              type: 'string',
              description: 'Inspector notes or result comments',
            },
            completed_date: {
              type: 'string',
              description: 'Date the inspection was completed (MM/DD/YYYY)',
            },
          },
          required: ['record_id', 'inspection_id', 'result'],
        },
      },
      {
        name: 'list_record_contacts',
        description: 'List all contacts (applicant, owner, contractor, etc.) associated with a permit record',
        inputSchema: {
          type: 'object',
          properties: {
            record_id: {
              type: 'string',
              description: 'Permit record ID to list contacts for',
            },
            fields: {
              type: 'string',
              description: 'Comma-separated fields to return (default: all)',
            },
          },
          required: ['record_id'],
        },
      },
      {
        name: 'get_record_contact',
        description: 'Get detailed information for a specific contact attached to a permit record',
        inputSchema: {
          type: 'object',
          properties: {
            record_id: {
              type: 'string',
              description: 'Permit record ID',
            },
            contact_id: {
              type: 'string',
              description: 'Contact ID to retrieve',
            },
          },
          required: ['record_id', 'contact_id'],
        },
      },
      {
        name: 'list_record_addresses',
        description: 'List all addresses associated with a permit or license record',
        inputSchema: {
          type: 'object',
          properties: {
            record_id: {
              type: 'string',
              description: 'Permit record ID to list addresses for',
            },
          },
          required: ['record_id'],
        },
      },
      {
        name: 'list_record_parcels',
        description: 'List all parcels (land parcels) associated with a permit or license record',
        inputSchema: {
          type: 'object',
          properties: {
            record_id: {
              type: 'string',
              description: 'Permit record ID to list parcels for',
            },
            fields: {
              type: 'string',
              description: 'Comma-separated fields to return (default: all)',
            },
          },
          required: ['record_id'],
        },
      },
      {
        name: 'list_record_conditions',
        description: 'List all conditions of approval attached to a permit or license record',
        inputSchema: {
          type: 'object',
          properties: {
            record_id: {
              type: 'string',
              description: 'Permit record ID to list conditions for',
            },
            status: {
              type: 'string',
              description: 'Filter by condition status (e.g. Applied, Met, NotMet)',
            },
          },
          required: ['record_id'],
        },
      },
      {
        name: 'add_record_condition',
        description: 'Add a condition of approval to a permit or license record',
        inputSchema: {
          type: 'object',
          properties: {
            record_id: {
              type: 'string',
              description: 'Permit record ID to add the condition to',
            },
            condition_type: {
              type: 'object',
              description: 'Condition type object with value field (e.g. {"value": "Standard Condition"})',
            },
            condition_description: {
              type: 'string',
              description: 'Description of the condition requirement',
            },
            status: {
              type: 'string',
              description: 'Initial condition status (default: Applied)',
            },
          },
          required: ['record_id', 'condition_type', 'condition_description'],
        },
      },
      {
        name: 'list_record_fees',
        description: 'List all fees assessed on a permit or license record including amounts and payment status',
        inputSchema: {
          type: 'object',
          properties: {
            record_id: {
              type: 'string',
              description: 'Permit record ID to list fees for',
            },
          },
          required: ['record_id'],
        },
      },
      {
        name: 'list_record_custom_forms',
        description: 'List custom form (application-specific questionnaire) data attached to a permit record',
        inputSchema: {
          type: 'object',
          properties: {
            record_id: {
              type: 'string',
              description: 'Permit record ID to retrieve custom form data for',
            },
          },
          required: ['record_id'],
        },
      },
      {
        name: 'search_records',
        description: 'Search permit and license records by address, parcel number, applicant name, or record type across the agency',
        inputSchema: {
          type: 'object',
          properties: {
            keyword: {
              type: 'string',
              description: 'General text search across record fields',
            },
            address: {
              type: 'string',
              description: 'Street address to search for (partial match supported)',
            },
            parcel: {
              type: 'string',
              description: 'Parcel number to search for',
            },
            applicant_last_name: {
              type: 'string',
              description: 'Applicant last name to search',
            },
            record_type: {
              type: 'string',
              description: 'Filter results to a specific module type (e.g. Building, License)',
            },
            limit: {
              type: 'number',
              description: 'Maximum results to return (default: 20, max: 1000)',
            },
            offset: {
              type: 'number',
              description: 'Pagination offset (default: 0)',
            },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_records':
          return this.listRecords(args);
        case 'get_record':
          return this.getRecord(args);
        case 'create_record':
          return this.createRecord(args);
        case 'update_record':
          return this.updateRecord(args);
        case 'list_record_documents':
          return this.listRecordDocuments(args);
        case 'get_record_document':
          return this.getRecordDocument(args);
        case 'list_inspections':
          return this.listInspections(args);
        case 'get_inspection':
          return this.getInspection(args);
        case 'schedule_inspection':
          return this.scheduleInspection(args);
        case 'update_inspection_result':
          return this.updateInspectionResult(args);
        case 'list_record_contacts':
          return this.listRecordContacts(args);
        case 'get_record_contact':
          return this.getRecordContact(args);
        case 'list_record_addresses':
          return this.listRecordAddresses(args);
        case 'list_record_parcels':
          return this.listRecordParcels(args);
        case 'list_record_conditions':
          return this.listRecordConditions(args);
        case 'add_record_condition':
          return this.addRecordCondition(args);
        case 'list_record_fees':
          return this.listRecordFees(args);
        case 'list_record_custom_forms':
          return this.listRecordCustomForms(args);
        case 'search_records':
          return this.searchRecords(args);
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
    };
  }

  private buildQuery(params: Record<string, string | undefined>): string {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) qs.set(k, v);
    }
    const str = qs.toString();
    return str ? `?${str}` : '';
  }

  private async get(path: string, params: Record<string, string | undefined> = {}): Promise<ToolResult> {
    const url = `${this.baseUrl}${path}${this.buildQuery(params)}`;
    const response = await this.fetchWithRetry(url, { method: 'GET', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Accela returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async post(path: string, body: unknown): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Accela returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async put(path: string, body: unknown): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'PUT',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Accela returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listRecords(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string | undefined> = {
      type: args.type as string | undefined,
      status: args.status as string | undefined,
      openedDateFrom: args.opened_date_from as string | undefined,
      openedDateTo: args.opened_date_to as string | undefined,
      limit: args.limit !== undefined ? String(args.limit) : '20',
      offset: args.offset !== undefined ? String(args.offset) : '0',
      fields: args.fields as string | undefined,
    };
    return this.get('/v4/records', params);
  }

  private async getRecord(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.record_id) return { content: [{ type: 'text', text: 'record_id is required' }], isError: true };
    const params: Record<string, string | undefined> = {
      fields: args.fields as string | undefined,
    };
    return this.get(`/v4/records/${encodeURIComponent(args.record_id as string)}`, params);
  }

  private async createRecord(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.type) return { content: [{ type: 'text', text: 'type is required' }], isError: true };
    const body: Record<string, unknown> = { type: args.type };
    if (args.name) body.name = args.name;
    if (args.description) body.description = args.description;
    if (args.status) body.status = { value: args.status };
    return this.post('/v4/records', body);
  }

  private async updateRecord(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.record_id) return { content: [{ type: 'text', text: 'record_id is required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.status) body.status = { value: args.status };
    if (args.description) body.description = args.description;
    if (args.name) body.name = args.name;
    return this.put(`/v4/records/${encodeURIComponent(args.record_id as string)}`, body);
  }

  private async listRecordDocuments(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.record_id) return { content: [{ type: 'text', text: 'record_id is required' }], isError: true };
    const params: Record<string, string | undefined> = {
      fields: args.fields as string | undefined,
    };
    return this.get(`/v4/records/${encodeURIComponent(args.record_id as string)}/documents`, params);
  }

  private async getRecordDocument(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.record_id || !args.document_id) return { content: [{ type: 'text', text: 'record_id and document_id are required' }], isError: true };
    return this.get(`/v4/records/${encodeURIComponent(args.record_id as string)}/documents/${encodeURIComponent(args.document_id as string)}`);
  }

  private async listInspections(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.record_id) return { content: [{ type: 'text', text: 'record_id is required' }], isError: true };
    const params: Record<string, string | undefined> = {
      status: args.status as string | undefined,
      scheduledDateFrom: args.scheduled_date_from as string | undefined,
      scheduledDateTo: args.scheduled_date_to as string | undefined,
      limit: args.limit !== undefined ? String(args.limit) : '20',
      offset: args.offset !== undefined ? String(args.offset) : '0',
    };
    return this.get(`/v4/records/${encodeURIComponent(args.record_id as string)}/inspections`, params);
  }

  private async getInspection(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.record_id || !args.inspection_id) return { content: [{ type: 'text', text: 'record_id and inspection_id are required' }], isError: true };
    return this.get(`/v4/records/${encodeURIComponent(args.record_id as string)}/inspections/${encodeURIComponent(args.inspection_id as string)}`);
  }

  private async scheduleInspection(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.record_id || !args.inspection_type) return { content: [{ type: 'text', text: 'record_id and inspection_type are required' }], isError: true };
    const body: Record<string, unknown> = {
      type: args.inspection_type,
    };
    if (args.scheduled_date) body.scheduledDate = args.scheduled_date;
    if (args.scheduled_time) body.scheduledTime = args.scheduled_time;
    if (args.request_comment) body.requestComment = args.request_comment;
    return this.post(`/v4/records/${encodeURIComponent(args.record_id as string)}/inspections`, body);
  }

  private async updateInspectionResult(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.record_id || !args.inspection_id || !args.result) {
      return { content: [{ type: 'text', text: 'record_id, inspection_id, and result are required' }], isError: true };
    }
    const body: Record<string, unknown> = { result: args.result };
    if (args.result_comment) body.resultComment = args.result_comment;
    if (args.completed_date) body.completedDate = args.completed_date;
    return this.put(`/v4/records/${encodeURIComponent(args.record_id as string)}/inspections/${encodeURIComponent(args.inspection_id as string)}`, body);
  }

  private async listRecordContacts(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.record_id) return { content: [{ type: 'text', text: 'record_id is required' }], isError: true };
    const params: Record<string, string | undefined> = {
      fields: args.fields as string | undefined,
    };
    return this.get(`/v4/records/${encodeURIComponent(args.record_id as string)}/contacts`, params);
  }

  private async getRecordContact(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.record_id || !args.contact_id) return { content: [{ type: 'text', text: 'record_id and contact_id are required' }], isError: true };
    return this.get(`/v4/records/${encodeURIComponent(args.record_id as string)}/contacts/${encodeURIComponent(args.contact_id as string)}`);
  }

  private async listRecordAddresses(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.record_id) return { content: [{ type: 'text', text: 'record_id is required' }], isError: true };
    return this.get(`/v4/records/${encodeURIComponent(args.record_id as string)}/addresses`);
  }

  private async listRecordParcels(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.record_id) return { content: [{ type: 'text', text: 'record_id is required' }], isError: true };
    const params: Record<string, string | undefined> = {
      fields: args.fields as string | undefined,
    };
    return this.get(`/v4/records/${encodeURIComponent(args.record_id as string)}/parcels`, params);
  }

  private async listRecordConditions(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.record_id) return { content: [{ type: 'text', text: 'record_id is required' }], isError: true };
    const params: Record<string, string | undefined> = {
      status: args.status as string | undefined,
    };
    return this.get(`/v4/records/${encodeURIComponent(args.record_id as string)}/conditions`, params);
  }

  private async addRecordCondition(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.record_id || !args.condition_type || !args.condition_description) {
      return { content: [{ type: 'text', text: 'record_id, condition_type, and condition_description are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      type: args.condition_type,
      description: args.condition_description,
    };
    if (args.status) body.status = { value: args.status };
    return this.post(`/v4/records/${encodeURIComponent(args.record_id as string)}/conditions`, body);
  }

  private async listRecordFees(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.record_id) return { content: [{ type: 'text', text: 'record_id is required' }], isError: true };
    return this.get(`/v4/records/${encodeURIComponent(args.record_id as string)}/fees`);
  }

  private async listRecordCustomForms(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.record_id) return { content: [{ type: 'text', text: 'record_id is required' }], isError: true };
    return this.get(`/v4/records/${encodeURIComponent(args.record_id as string)}/customForms`);
  }

  private async searchRecords(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string | undefined> = {
      keyword: args.keyword as string | undefined,
      address: args.address as string | undefined,
      parcel: args.parcel as string | undefined,
      applicantLastName: args.applicant_last_name as string | undefined,
      type: args.record_type as string | undefined,
      limit: args.limit !== undefined ? String(args.limit) : '20',
      offset: args.offset !== undefined ? String(args.offset) : '0',
    };
    return this.get('/v4/records/search', params);
  }
}

/**
 * SlideRoom MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// No official SlideRoom MCP server was found on GitHub or the vendor website.
//
// Base URL: https://api.slideroom.com
// Auth: API key passed as query parameter `apiKey` on every request
// Docs: https://api.slideroom.com/schema/v2
// Rate limits: Not publicly documented; contact SlideRoom support for limits.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface SlideRoomConfig {
  apiKey: string;
  /** Optional base URL override (default: https://api.slideroom.com) */
  baseUrl?: string;
}

export class SlideRoomMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: SlideRoomConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? 'https://api.slideroom.com';
  }

  static catalog() {
    return {
      name: 'slideroom',
      displayName: 'SlideRoom',
      version: '1.0.0',
      category: 'education',
      keywords: [
        'slideroom', 'admissions', 'application', 'applicant', 'export',
        'portfolio', 'review', 'higher education', 'enrollment', 'attributes',
        'college', 'university', 'liaison', 'submission',
      ],
      toolNames: [
        'get_applicant_attributes',
        'set_applicant_attributes',
        'delete_applicant_attribute',
        'list_applicant_attribute_names',
        'list_application_attribute_names',
        'get_application_attributes',
        'set_application_attributes',
        'delete_application_attribute',
        'request_applications_export',
        'request_application_export',
        'get_export_status',
      ],
      description: 'SlideRoom admissions platform: manage applicant and application custom attributes, request bulk and individual application exports in CSV, PDF, ZIP, or JSON formats.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'get_applicant_attributes',
        description: 'Get all custom attributes for an applicant by email address, with optional pool and CommonApp year filters',
        inputSchema: {
          type: 'object',
          properties: {
            email: {
              type: 'string',
              description: 'Email address of the applicant to retrieve attributes for',
            },
            pool: {
              type: 'string',
              description: 'Attribute pool to query: Standard or CommonAppSDS (default: Standard)',
            },
            commonAppYear: {
              type: 'number',
              description: 'CommonApp year filter (integer, e.g. 2024) — required when pool is CommonAppSDS',
            },
          },
          required: ['email'],
        },
      },
      {
        name: 'set_applicant_attributes',
        description: 'Add or update custom attributes for an applicant — null values are stored as null, not deleted',
        inputSchema: {
          type: 'object',
          properties: {
            email: {
              type: 'string',
              description: 'Email address of the applicant to update',
            },
            attributes: {
              type: 'object',
              description: 'Key-value pairs of attribute names and values to set (e.g. {"gpa": "3.9", "major": "CS"})',
            },
            pool: {
              type: 'string',
              description: 'Attribute pool to update: Standard or CommonAppSDS (default: Standard)',
            },
            commonAppYear: {
              type: 'number',
              description: 'CommonApp year (integer) — required when pool is CommonAppSDS',
            },
          },
          required: ['email', 'attributes'],
        },
      },
      {
        name: 'delete_applicant_attribute',
        description: 'Delete a specific custom attribute by name for an applicant identified by email',
        inputSchema: {
          type: 'object',
          properties: {
            email: {
              type: 'string',
              description: 'Email address of the applicant',
            },
            name: {
              type: 'string',
              description: 'Name of the custom attribute to delete',
            },
            pool: {
              type: 'string',
              description: 'Attribute pool: Standard or CommonAppSDS (default: Standard)',
            },
            commonAppYear: {
              type: 'number',
              description: 'CommonApp year (integer) — required when pool is CommonAppSDS',
            },
          },
          required: ['email', 'name'],
        },
      },
      {
        name: 'list_applicant_attribute_names',
        description: 'List all custom applicant attribute names defined in the organization',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'list_application_attribute_names',
        description: 'List all custom application attribute names defined in the organization',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_application_attributes',
        description: 'Get all custom attributes for a specific application by application ID',
        inputSchema: {
          type: 'object',
          properties: {
            applicationId: {
              type: 'number',
              description: 'Numeric ID of the application to retrieve attributes for',
            },
          },
          required: ['applicationId'],
        },
      },
      {
        name: 'set_application_attributes',
        description: 'Add or update custom attributes for a specific application — requires Advanced Plan for API Import',
        inputSchema: {
          type: 'object',
          properties: {
            applicationId: {
              type: 'number',
              description: 'Numeric ID of the application to update',
            },
            attributes: {
              type: 'object',
              description: 'Key-value pairs of attribute names and values to set (e.g. {"score": "95", "reviewer": "Smith"})',
            },
          },
          required: ['applicationId', 'attributes'],
        },
      },
      {
        name: 'delete_application_attribute',
        description: 'Delete a specific custom attribute by name for a given application ID',
        inputSchema: {
          type: 'object',
          properties: {
            applicationId: {
              type: 'number',
              description: 'Numeric ID of the application',
            },
            name: {
              type: 'string',
              description: 'Name of the custom attribute to delete',
            },
          },
          required: ['applicationId', 'name'],
        },
      },
      {
        name: 'request_applications_export',
        description: 'Request an asynchronous bulk export of applications in CSV, TSV, XLSX, PDF, ZIP, or JSON format — returns a token to poll with get_export_status',
        inputSchema: {
          type: 'object',
          properties: {
            format: {
              type: 'string',
              description: 'Export format: csv, tsv, txt, tab, xlsx, pdf, zip, or json (default: csv)',
            },
            roundType: {
              type: 'string',
              description: 'Round filter: Assigned, Current, Named, or All (default: Current)',
            },
            roundName: {
              type: 'string',
              description: 'Specific round name to export (used when roundType is Named)',
            },
          },
        },
      },
      {
        name: 'request_application_export',
        description: 'Request an asynchronous export for a single application in CSV, PDF, or ZIP format — returns a token to poll with get_export_status',
        inputSchema: {
          type: 'object',
          properties: {
            applicationId: {
              type: 'number',
              description: 'Numeric ID of the application to export',
            },
            format: {
              type: 'string',
              description: 'Export format: csv, tsv, txt, tab, xlsx, pdf, zip, or json (default: csv)',
            },
          },
          required: ['applicationId'],
        },
      },
      {
        name: 'get_export_status',
        description: 'Check the status and retrieve the download URL for an export previously requested via request_applications_export or request_application_export',
        inputSchema: {
          type: 'object',
          properties: {
            token: {
              type: 'string',
              description: 'Export token returned by request_applications_export or request_application_export',
            },
          },
          required: ['token'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'get_applicant_attributes':
          return this.getApplicantAttributes(args);
        case 'set_applicant_attributes':
          return this.setApplicantAttributes(args);
        case 'delete_applicant_attribute':
          return this.deleteApplicantAttribute(args);
        case 'list_applicant_attribute_names':
          return this.listApplicantAttributeNames();
        case 'list_application_attribute_names':
          return this.listApplicationAttributeNames();
        case 'get_application_attributes':
          return this.getApplicationAttributes(args);
        case 'set_application_attributes':
          return this.setApplicationAttributes(args);
        case 'delete_application_attribute':
          return this.deleteApplicationAttribute(args);
        case 'request_applications_export':
          return this.requestApplicationsExport(args);
        case 'request_application_export':
          return this.requestApplicationExport(args);
        case 'get_export_status':
          return this.getExportStatus(args);
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

  private buildUrl(path: string, params: Record<string, string | undefined> = {}): string {
    const qs = new URLSearchParams({ apiKey: this.apiKey });
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) qs.set(k, v);
    }
    return `${this.baseUrl}${path}?${qs.toString()}`;
  }

  private async apiGet(path: string, params: Record<string, string | undefined> = {}): Promise<ToolResult> {
    const url = this.buildUrl(path, params);
    const response = await this.fetchWithRetry(url, {});
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apiPost(path: string, body: unknown, params: Record<string, string | undefined> = {}): Promise<ToolResult> {
    const url = this.buildUrl(path, params);
    const response = await this.fetchWithRetry(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apiDelete(path: string, params: Record<string, string | undefined> = {}): Promise<ToolResult> {
    const url = this.buildUrl(path, params);
    const response = await this.fetchWithRetry(url, { method: 'DELETE' });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getApplicantAttributes(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.email) return { content: [{ type: 'text', text: 'email is required' }], isError: true };
    const params: Record<string, string | undefined> = { email: args.email as string };
    if (args.pool) params.pool = args.pool as string;
    if (args.commonAppYear !== undefined) params.commonAppYear = String(args.commonAppYear);
    return this.apiGet('/api/v2/applicant/attributes', params);
  }

  private async setApplicantAttributes(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.email) return { content: [{ type: 'text', text: 'email is required' }], isError: true };
    if (!args.attributes || typeof args.attributes !== 'object') {
      return { content: [{ type: 'text', text: 'attributes is required and must be an object' }], isError: true };
    }
    const params: Record<string, string | undefined> = { email: args.email as string };
    if (args.pool) params.pool = args.pool as string;
    if (args.commonAppYear !== undefined) params.commonAppYear = String(args.commonAppYear);
    return this.apiPost('/api/v2/applicant/attributes', args.attributes, params);
  }

  private async deleteApplicantAttribute(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.email) return { content: [{ type: 'text', text: 'email is required' }], isError: true };
    if (!args.name) return { content: [{ type: 'text', text: 'name is required' }], isError: true };
    const params: Record<string, string | undefined> = {
      email: args.email as string,
      name: args.name as string,
    };
    if (args.pool) params.pool = args.pool as string;
    if (args.commonAppYear !== undefined) params.commonAppYear = String(args.commonAppYear);
    return this.apiDelete('/api/v2/applicant/attributes', params);
  }

  private async listApplicantAttributeNames(): Promise<ToolResult> {
    return this.apiGet('/api/v2/applicant/attributes/names');
  }

  private async listApplicationAttributeNames(): Promise<ToolResult> {
    return this.apiGet('/api/v2/application/attributes/names');
  }

  private async getApplicationAttributes(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.applicationId === undefined) {
      return { content: [{ type: 'text', text: 'applicationId is required' }], isError: true };
    }
    return this.apiGet(`/api/v2/application/${encodeURIComponent(String(args.applicationId))}/attributes`);
  }

  private async setApplicationAttributes(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.applicationId === undefined) {
      return { content: [{ type: 'text', text: 'applicationId is required' }], isError: true };
    }
    if (!args.attributes || typeof args.attributes !== 'object') {
      return { content: [{ type: 'text', text: 'attributes is required and must be an object' }], isError: true };
    }
    return this.apiPost(
      `/api/v2/application/${encodeURIComponent(String(args.applicationId))}/attributes`,
      args.attributes,
    );
  }

  private async deleteApplicationAttribute(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.applicationId === undefined) {
      return { content: [{ type: 'text', text: 'applicationId is required' }], isError: true };
    }
    if (!args.name) return { content: [{ type: 'text', text: 'name is required' }], isError: true };
    return this.apiDelete(
      `/api/v2/application/${encodeURIComponent(String(args.applicationId))}/attributes`,
      { name: args.name as string },
    );
  }

  private async requestApplicationsExport(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string | undefined> = {};
    if (args.format) params.format = args.format as string;
    if (args.roundType) params.roundType = args.roundType as string;
    if (args.roundName) params.roundName = args.roundName as string;
    const url = this.buildUrl('/api/v2/application/request-export', params);
    const response = await this.fetchWithRetry(url, { method: 'POST' });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async requestApplicationExport(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.applicationId === undefined) {
      return { content: [{ type: 'text', text: 'applicationId is required' }], isError: true };
    }
    const params: Record<string, string | undefined> = {};
    if (args.format) params.format = args.format as string;
    const url = this.buildUrl(
      `/api/v2/application/${encodeURIComponent(String(args.applicationId))}/request-export`,
      params,
    );
    const response = await this.fetchWithRetry(url, { method: 'POST' });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getExportStatus(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.token) return { content: [{ type: 'text', text: 'token is required' }], isError: true };
    return this.apiGet(`/api/v2/export/${encodeURIComponent(args.token as string)}`);
  }
}

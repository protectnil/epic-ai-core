/**
 * OneTrust MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// No official OneTrust MCP server was found on GitHub or the OneTrust developer portal.
// This adapter covers the OneTrust REST API for privacy, consent, and compliance operations.
//
// Base URL: https://{your-tenant}.onetrust.com (tenant-specific; no shared default)
// Auth: OAuth2 client credentials — POST {baseUrl}/v1/oauth/token
//   (per https://developer.onetrust.com/onetrust/reference/quick-start-guide)
// Docs: https://developer.onetrust.com/onetrust/reference/onetrust-api-reference
// Rate limits: Not publicly documented; OneTrust recommends contacting support for limits

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface OneTrustConfig {
  /** OAuth2 client ID from OneTrust Global Settings */
  clientId: string;
  /** OAuth2 client secret from OneTrust Global Settings */
  clientSecret: string;
  /** Full tenant base URL, e.g. https://app.onetrust.com (no trailing /api) */
  baseUrl: string;
}

export class OneTrustMCPServer extends MCPAdapterBase {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly baseUrl: string;
  private bearerToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(config: OneTrustConfig) {
    super();
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
  }

  static catalog() {
    return {
      name: 'onetrust',
      displayName: 'OneTrust',
      version: '1.0.0',
      category: 'compliance',
      keywords: ['onetrust', 'privacy', 'compliance', 'gdpr', 'ccpa', 'dsar', 'consent', 'cookie', 'assessment', 'data-map', 'dpia'],
      toolNames: [
        'list_assessments', 'get_assessment', 'create_assessment',
        'list_privacy_requests', 'get_privacy_request', 'create_privacy_request',
        'list_data_maps', 'get_data_map',
        'list_consent_purposes', 'get_consent_preference',
        'list_compliance_tasks', 'update_compliance_task',
        'list_vendors', 'get_vendor',
      ],
      description: 'Privacy, consent, and compliance automation via OneTrust: manage DSARs, assessments, data maps, consent preferences, vendors, and compliance tasks.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_assessments',
        description: 'List privacy assessments (PIAs/DPIAs) in OneTrust with optional status filter and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              description: 'Filter by assessment status: InProgress, Complete, Approved, Rejected (default: all)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 0)',
            },
            size: {
              type: 'number',
              description: 'Number of results per page (default: 20, max: 100)',
            },
          },
        },
      },
      {
        name: 'get_assessment',
        description: 'Get full details of a specific OneTrust privacy assessment by its assessment ID',
        inputSchema: {
          type: 'object',
          properties: {
            assessmentId: {
              type: 'string',
              description: 'UUID of the assessment to retrieve',
            },
          },
          required: ['assessmentId'],
        },
      },
      {
        name: 'create_assessment',
        description: 'Create a new privacy assessment (PIA/DPIA) in OneTrust from a template',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Name/title of the new assessment',
            },
            templateId: {
              type: 'string',
              description: 'UUID of the assessment template to use',
            },
            respondentEmail: {
              type: 'string',
              description: 'Email address of the primary respondent',
            },
          },
          required: ['name', 'templateId'],
        },
      },
      {
        name: 'list_privacy_requests',
        description: 'List data subject access requests (DSARs) in OneTrust with optional status and type filters',
        inputSchema: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              description: 'Filter by request status: New, InProgress, Completed, Cancelled (default: all)',
            },
            requestType: {
              type: 'string',
              description: 'Filter by request type: Access, Deletion, Portability, Rectification, OptOut (default: all)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 0)',
            },
            size: {
              type: 'number',
              description: 'Number of results per page (default: 20, max: 100)',
            },
          },
        },
      },
      {
        name: 'get_privacy_request',
        description: 'Get full details of a specific OneTrust data subject request (DSAR) by its request ID',
        inputSchema: {
          type: 'object',
          properties: {
            requestId: {
              type: 'string',
              description: 'UUID of the data subject request to retrieve',
            },
          },
          required: ['requestId'],
        },
      },
      {
        name: 'create_privacy_request',
        description: 'Submit a new data subject request (DSAR) on behalf of an individual in OneTrust',
        inputSchema: {
          type: 'object',
          properties: {
            requestType: {
              type: 'string',
              description: 'Type of request: Access, Deletion, Portability, Rectification, OptOut',
            },
            firstName: {
              type: 'string',
              description: 'Data subject first name',
            },
            lastName: {
              type: 'string',
              description: 'Data subject last name',
            },
            email: {
              type: 'string',
              description: 'Data subject email address',
            },
            regulation: {
              type: 'string',
              description: 'Applicable regulation: GDPR, CCPA, LGPD, PDPA (default: GDPR)',
            },
          },
          required: ['requestType', 'email'],
        },
      },
      {
        name: 'list_data_maps',
        description: 'List data inventory (data map) entries in OneTrust representing processing activities or data elements',
        inputSchema: {
          type: 'object',
          properties: {
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 0)',
            },
            size: {
              type: 'number',
              description: 'Number of results per page (default: 20, max: 100)',
            },
            search: {
              type: 'string',
              description: 'Search term to filter data map entries by name',
            },
          },
        },
      },
      {
        name: 'get_data_map',
        description: 'Get full details of a specific OneTrust data map (processing activity) record by its ID',
        inputSchema: {
          type: 'object',
          properties: {
            dataMapId: {
              type: 'string',
              description: 'UUID of the data map record to retrieve',
            },
          },
          required: ['dataMapId'],
        },
      },
      {
        name: 'list_consent_purposes',
        description: 'List consent purposes defined in OneTrust for a given collection point or globally',
        inputSchema: {
          type: 'object',
          properties: {
            collectionPointId: {
              type: 'string',
              description: 'UUID of the collection point to retrieve purposes for (default: all purposes)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 0)',
            },
            size: {
              type: 'number',
              description: 'Number of results per page (default: 20)',
            },
          },
        },
      },
      {
        name: 'get_consent_preference',
        description: 'Get current consent preferences for a specific data subject by email or identifier',
        inputSchema: {
          type: 'object',
          properties: {
            identifier: {
              type: 'string',
              description: 'Data subject identifier (email address or external ID)',
            },
            identifierType: {
              type: 'string',
              description: 'Type of identifier: email or externalId (default: email)',
            },
          },
          required: ['identifier'],
        },
      },
      {
        name: 'list_compliance_tasks',
        description: 'List compliance tasks in OneTrust with optional status filter and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              description: 'Filter by task status: Open, InProgress, Completed, Overdue (default: all)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 0)',
            },
            size: {
              type: 'number',
              description: 'Number of results per page (default: 20, max: 100)',
            },
          },
        },
      },
      {
        name: 'update_compliance_task',
        description: 'Update the status or assignee of a compliance task in OneTrust',
        inputSchema: {
          type: 'object',
          properties: {
            taskId: {
              type: 'string',
              description: 'UUID of the compliance task to update',
            },
            status: {
              type: 'string',
              description: 'New status: Open, InProgress, Completed',
            },
            assigneeEmail: {
              type: 'string',
              description: 'Email address of the new assignee (optional)',
            },
            note: {
              type: 'string',
              description: 'Optional note to attach to the update',
            },
          },
          required: ['taskId'],
        },
      },
      {
        name: 'list_vendors',
        description: 'List third-party vendors in OneTrust with optional risk rating and status filters',
        inputSchema: {
          type: 'object',
          properties: {
            riskRating: {
              type: 'string',
              description: 'Filter by risk rating: Critical, High, Medium, Low (default: all)',
            },
            status: {
              type: 'string',
              description: 'Filter by vendor status: Active, Inactive, UnderReview (default: all)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 0)',
            },
            size: {
              type: 'number',
              description: 'Number of results per page (default: 20)',
            },
          },
        },
      },
      {
        name: 'get_vendor',
        description: 'Get full details of a specific third-party vendor record in OneTrust by its ID',
        inputSchema: {
          type: 'object',
          properties: {
            vendorId: {
              type: 'string',
              description: 'UUID of the vendor record to retrieve',
            },
          },
          required: ['vendorId'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_assessments':
          return await this.listAssessments(args);
        case 'get_assessment':
          return await this.getAssessment(args);
        case 'create_assessment':
          return await this.createAssessment(args);
        case 'list_privacy_requests':
          return await this.listPrivacyRequests(args);
        case 'get_privacy_request':
          return await this.getPrivacyRequest(args);
        case 'create_privacy_request':
          return await this.createPrivacyRequest(args);
        case 'list_data_maps':
          return await this.listDataMaps(args);
        case 'get_data_map':
          return await this.getDataMap(args);
        case 'list_consent_purposes':
          return await this.listConsentPurposes(args);
        case 'get_consent_preference':
          return await this.getConsentPreference(args);
        case 'list_compliance_tasks':
          return await this.listComplianceTasks(args);
        case 'update_compliance_task':
          return await this.updateComplianceTask(args);
        case 'list_vendors':
          return await this.listVendors(args);
        case 'get_vendor':
          return await this.getVendor(args);
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

  // OAuth2 client credentials with 60-second early refresh
  private async getOrRefreshToken(): Promise<string> {
    const now = Date.now();
    if (this.bearerToken && this.tokenExpiry > now) {
      return this.bearerToken;
    }
    const response = await this.fetchWithRetry(`${this.baseUrl}/v1/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
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

  private async getHeaders(): Promise<Record<string, string>> {
    const token = await this.getOrRefreshToken();
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
  }

  private async listAssessments(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    params.set('page', String(args.page ?? 0));
    params.set('size', String(args.size ?? 20));
    if (args.status) params.set('status', String(args.status));

    const headers = await this.getHeaders();
    const response = await this.fetchWithRetry(`${this.baseUrl}/privacyautomation/v1/assessments?${params}`, { headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: this.truncate(await response.json()) }], isError: false };
  }

  private async getAssessment(args: Record<string, unknown>): Promise<ToolResult> {
    const headers = await this.getHeaders();
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/privacyautomation/v1/assessments/${encodeURIComponent(String(args.assessmentId))}`,
      { headers }
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: this.truncate(await response.json()) }], isError: false };
  }

  private async createAssessment(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = { name: args.name, templateId: args.templateId };
    if (args.respondentEmail) body.respondentEmail = args.respondentEmail;

    const headers = await this.getHeaders();
    const response = await this.fetchWithRetry(`${this.baseUrl}/privacyautomation/v1/assessments`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: this.truncate(await response.json()) }], isError: false };
  }

  private async listPrivacyRequests(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    params.set('page', String(args.page ?? 0));
    params.set('size', String(args.size ?? 20));
    if (args.status) params.set('status', String(args.status));
    if (args.requestType) params.set('requestType', String(args.requestType));

    const headers = await this.getHeaders();
    const response = await this.fetchWithRetry(`${this.baseUrl}/dsar/v1/requests?${params}`, { headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: this.truncate(await response.json()) }], isError: false };
  }

  private async getPrivacyRequest(args: Record<string, unknown>): Promise<ToolResult> {
    const headers = await this.getHeaders();
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/dsar/v1/requests/${encodeURIComponent(String(args.requestId))}`,
      { headers }
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: this.truncate(await response.json()) }], isError: false };
  }

  private async createPrivacyRequest(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {
      requestType: args.requestType,
      email: args.email,
    };
    if (args.firstName) body.firstName = args.firstName;
    if (args.lastName) body.lastName = args.lastName;
    if (args.regulation) body.regulation = args.regulation;

    const headers = await this.getHeaders();
    const response = await this.fetchWithRetry(`${this.baseUrl}/dsar/v1/requests`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: this.truncate(await response.json()) }], isError: false };
  }

  private async listDataMaps(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    params.set('page', String(args.page ?? 0));
    params.set('size', String(args.size ?? 20));
    if (args.search) params.set('search', String(args.search));

    const headers = await this.getHeaders();
    const response = await this.fetchWithRetry(`${this.baseUrl}/datamap/v1/processing-activities?${params}`, { headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: this.truncate(await response.json()) }], isError: false };
  }

  private async getDataMap(args: Record<string, unknown>): Promise<ToolResult> {
    const headers = await this.getHeaders();
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/datamap/v1/processing-activities/${encodeURIComponent(String(args.dataMapId))}`,
      { headers }
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: this.truncate(await response.json()) }], isError: false };
  }

  private async listConsentPurposes(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    params.set('page', String(args.page ?? 0));
    params.set('size', String(args.size ?? 20));
    if (args.collectionPointId) params.set('collectionPointId', String(args.collectionPointId));

    const headers = await this.getHeaders();
    const response = await this.fetchWithRetry(`${this.baseUrl}/consent/v2/purposes?${params}`, { headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: this.truncate(await response.json()) }], isError: false };
  }

  private async getConsentPreference(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    params.set('identifier', String(args.identifier));
    if (args.identifierType) params.set('identifierType', String(args.identifierType));

    const headers = await this.getHeaders();
    const response = await this.fetchWithRetry(`${this.baseUrl}/consent/v2/preferences?${params}`, { headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: this.truncate(await response.json()) }], isError: false };
  }

  private async listComplianceTasks(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    params.set('page', String(args.page ?? 0));
    params.set('size', String(args.size ?? 20));
    if (args.status) params.set('status', String(args.status));

    const headers = await this.getHeaders();
    const response = await this.fetchWithRetry(`${this.baseUrl}/privacyautomation/v1/tasks?${params}`, { headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: this.truncate(await response.json()) }], isError: false };
  }

  private async updateComplianceTask(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {};
    if (args.status) body.status = args.status;
    if (args.assigneeEmail) body.assigneeEmail = args.assigneeEmail;
    if (args.note) body.note = args.note;

    const headers = await this.getHeaders();
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/privacyautomation/v1/tasks/${encodeURIComponent(String(args.taskId))}`,
      { method: 'PATCH', headers, body: JSON.stringify(body) }
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: this.truncate(await response.json()) }], isError: false };
  }

  private async listVendors(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    params.set('page', String(args.page ?? 0));
    params.set('size', String(args.size ?? 20));
    if (args.riskRating) params.set('riskRating', String(args.riskRating));
    if (args.status) params.set('status', String(args.status));

    const headers = await this.getHeaders();
    const response = await this.fetchWithRetry(`${this.baseUrl}/thirdparty/v1/vendors?${params}`, { headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: this.truncate(await response.json()) }], isError: false };
  }

  private async getVendor(args: Record<string, unknown>): Promise<ToolResult> {
    const headers = await this.getHeaders();
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/thirdparty/v1/vendors/${encodeURIComponent(String(args.vendorId))}`,
      { headers }
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: this.truncate(await response.json()) }], isError: false };
  }
}

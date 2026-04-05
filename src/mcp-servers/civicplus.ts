/**
 * CivicPlus MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// No official CivicPlus MCP server was found on GitHub or npm.
// Community MCP: github.com/chrisjamesbond/seeclickfix-mcp-server — NOT official (not published by CivicPlus),
//   last commit Jul 2025, only 1 tool (get_requests via Open311 API), stdio transport. Fails criteria 1 & 3.
//
// This adapter targets the CivicPlus SeeClickFix 311 CRM APIv2 for Organizations (private org API).
// Our adapter covers: 13 tools. Vendor MCP: N/A (no official server).
// Recommendation: use-rest-api — no official vendor MCP exists.
//
// Base URL: https://seeclickfix.com/api/v2
// Sandbox URL: https://int.seeclickfix.com/api/v2 (prefix int. to any URL for sandbox testing)
// Auth: Bearer token — Personal Access Token from CivicPlus Account → Password & Security page
// Docs: https://dev.seeclickfix.com/ | https://www.civicplus.help/seeclickfix/docs/seeclickfix-api-information
// Rate limits: Not publicly documented; use sandbox for bulk testing
// NOTE: update_issue uses PATCH — the public API docs describe status changes via POST /issues/{id}/close
//   and POST /issues/{id}/open. The private organizational API may differ; update_issue is UNVERIFIED.
// NOTE: search_issues uses a /issues/search sub-path — the public API uses search= parameter on GET /issues.
//   The private org API endpoint is not publicly documented; search_issues path is UNVERIFIED.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface CivicPlusConfig {
  apiToken: string;
  organizationId: string;
  baseUrl?: string;
}

export class CivicPlusMCPServer extends MCPAdapterBase {
  private readonly apiToken: string;
  private readonly organizationId: string;
  private readonly baseUrl: string;

  constructor(config: CivicPlusConfig) {
    super();
    this.apiToken = config.apiToken;
    this.organizationId = config.organizationId;
    this.baseUrl = config.baseUrl || 'https://seeclickfix.com/api/v2';
  }

  static catalog() {
    return {
      name: 'civicplus',
      displayName: 'CivicPlus',
      version: '1.0.0',
      category: 'misc',
      keywords: [
        'civicplus', 'seeclickfix', '311', 'government', 'citizen', 'request', 'issue', 'service request',
        'municipal', 'city', 'county', 'public works', 'pothole', 'street light', 'graffiti',
        'civic engagement', 'local government', 'community', 'zone', 'agency',
      ],
      toolNames: [
        'list_issues', 'get_issue', 'create_issue', 'update_issue',
        'list_issue_comments', 'create_issue_comment',
        'list_zones', 'get_zone',
        'get_organization', 'list_request_types', 'get_request_type',
        'list_issue_subscribers', 'search_issues',
      ],
      description: 'CivicPlus SeeClickFix 311 CRM: manage citizen service requests, track issues, post comments, query zones and service request types for government operations.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_issues',
        description: 'List citizen service requests (issues) in the organization with optional status, date, and type filters',
        inputSchema: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              description: 'Filter by status: open, acknowledged, closed, archived (default: open)',
            },
            after: {
              type: 'string',
              description: 'Return issues created after this date (ISO 8601, e.g. 2026-01-01)',
            },
            before: {
              type: 'string',
              description: 'Return issues created before this date (ISO 8601)',
            },
            requestTypeId: {
              type: 'number',
              description: 'Filter by request type ID',
            },
            zoneId: {
              type: 'number',
              description: 'Filter by zone (district/agency) ID',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            perPage: {
              type: 'number',
              description: 'Results per page (default: 20, max: 100)',
            },
          },
        },
      },
      {
        name: 'get_issue',
        description: 'Get full details for a specific citizen service request by its ID including location, status, and description',
        inputSchema: {
          type: 'object',
          properties: {
            issueId: {
              type: 'number',
              description: 'Service request (issue) ID',
            },
          },
          required: ['issueId'],
        },
      },
      {
        name: 'create_issue',
        description: 'Create a new citizen service request with type, description, and location coordinates',
        inputSchema: {
          type: 'object',
          properties: {
            requestTypeId: {
              type: 'number',
              description: 'Request type ID specifying the category of the issue',
            },
            description: {
              type: 'string',
              description: 'Description of the issue or problem being reported',
            },
            lat: {
              type: 'number',
              description: 'Latitude of the issue location',
            },
            lng: {
              type: 'number',
              description: 'Longitude of the issue location',
            },
            address: {
              type: 'string',
              description: 'Street address of the issue (alternative to lat/lng)',
            },
          },
          required: ['requestTypeId', 'description'],
        },
      },
      {
        name: 'update_issue',
        description: 'Update the status or assignment of an existing citizen service request',
        inputSchema: {
          type: 'object',
          properties: {
            issueId: {
              type: 'number',
              description: 'Service request (issue) ID to update',
            },
            status: {
              type: 'string',
              description: 'New status: open, acknowledged, closed, archived',
            },
            assignedTo: {
              type: 'string',
              description: 'Username or email of staff member to assign the issue to',
            },
          },
          required: ['issueId'],
        },
      },
      {
        name: 'list_issue_comments',
        description: 'List all public and internal comments on a citizen service request',
        inputSchema: {
          type: 'object',
          properties: {
            issueId: {
              type: 'number',
              description: 'Service request (issue) ID',
            },
          },
          required: ['issueId'],
        },
      },
      {
        name: 'create_issue_comment',
        description: 'Post a public or internal comment on a citizen service request',
        inputSchema: {
          type: 'object',
          properties: {
            issueId: {
              type: 'number',
              description: 'Service request (issue) ID to comment on',
            },
            comment: {
              type: 'string',
              description: 'Comment text',
            },
            visibility: {
              type: 'string',
              description: 'Comment visibility: public or internal (default: public)',
            },
          },
          required: ['issueId', 'comment'],
        },
      },
      {
        name: 'list_zones',
        description: 'List all zones (districts, agencies, or service areas) in the organization',
        inputSchema: {
          type: 'object',
          properties: {
            page: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
            perPage: {
              type: 'number',
              description: 'Results per page (default: 20, max: 100)',
            },
          },
        },
      },
      {
        name: 'get_zone',
        description: 'Get details for a specific zone or service area in the CivicPlus organization',
        inputSchema: {
          type: 'object',
          properties: {
            zoneId: {
              type: 'number',
              description: 'Zone ID',
            },
          },
          required: ['zoneId'],
        },
      },
      {
        name: 'get_organization',
        description: 'Get profile and configuration details for the CivicPlus organization',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'list_request_types',
        description: 'List all available service request types in the organization (pothole, graffiti, streetlight, etc.)',
        inputSchema: {
          type: 'object',
          properties: {
            zoneId: {
              type: 'number',
              description: 'Filter request types available in a specific zone',
            },
          },
        },
      },
      {
        name: 'get_request_type',
        description: 'Get details for a specific service request type including required fields and assigned zone',
        inputSchema: {
          type: 'object',
          properties: {
            requestTypeId: {
              type: 'number',
              description: 'Request type ID',
            },
          },
          required: ['requestTypeId'],
        },
      },
      {
        name: 'list_issue_subscribers',
        description: 'List citizens who have subscribed to receive updates on a specific service request',
        inputSchema: {
          type: 'object',
          properties: {
            issueId: {
              type: 'number',
              description: 'Service request (issue) ID',
            },
          },
          required: ['issueId'],
        },
      },
      {
        name: 'search_issues',
        description: 'Search citizen service requests by keyword, address, or geographic bounding box',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Keyword or phrase to search in issue descriptions and titles',
            },
            address: {
              type: 'string',
              description: 'Street address to search near',
            },
            lat: {
              type: 'number',
              description: 'Latitude for geographic search center',
            },
            lng: {
              type: 'number',
              description: 'Longitude for geographic search center',
            },
            radius: {
              type: 'number',
              description: 'Search radius in meters around lat/lng (default: 500)',
            },
            status: {
              type: 'string',
              description: 'Filter by status: open, acknowledged, closed (default: open)',
            },
            page: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
            perPage: {
              type: 'number',
              description: 'Results per page (default: 20, max: 100)',
            },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_issues':
          return this.listIssues(args);
        case 'get_issue':
          return this.getIssue(args);
        case 'create_issue':
          return this.createIssue(args);
        case 'update_issue':
          return this.updateIssue(args);
        case 'list_issue_comments':
          return this.listIssueComments(args);
        case 'create_issue_comment':
          return this.createIssueComment(args);
        case 'list_zones':
          return this.listZones(args);
        case 'get_zone':
          return this.getZone(args);
        case 'get_organization':
          return this.getOrganization();
        case 'list_request_types':
          return this.listRequestTypes(args);
        case 'get_request_type':
          return this.getRequestType(args);
        case 'list_issue_subscribers':
          return this.listIssueSubscribers(args);
        case 'search_issues':
          return this.searchIssues(args);
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
      'Authorization': `Bearer ${this.apiToken}`,
      'Content-Type': 'application/json',
    };
  }

  private async civicGet(path: string, params: Record<string, string> = {}): Promise<ToolResult> {
    const qs = new URLSearchParams(params).toString();
    const url = `${this.baseUrl}${path}${qs ? '?' + qs : ''}`;
    const response = await this.fetchWithRetry(url, { method: 'GET', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`CivicPlus returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async civicPost(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`CivicPlus returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async civicPatch(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'PATCH',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`CivicPlus returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listIssues(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      page: String((args.page as number) ?? 1),
      per_page: String((args.perPage as number) ?? 20),
    };
    if (args.status) params.status = args.status as string;
    if (args.after) params.after = args.after as string;
    if (args.before) params.before = args.before as string;
    if (args.requestTypeId) params.request_type_id = String(args.requestTypeId);
    if (args.zoneId) params.zone_id = String(args.zoneId);
    return this.civicGet(`/organizations/${this.organizationId}/issues`, params);
  }

  private async getIssue(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.issueId) return { content: [{ type: 'text', text: 'issueId is required' }], isError: true };
    return this.civicGet(`/organizations/${this.organizationId}/issues/${encodeURIComponent(args.issueId as string)}`);
  }

  private async createIssue(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.requestTypeId || !args.description) return { content: [{ type: 'text', text: 'requestTypeId and description are required' }], isError: true };
    const body: Record<string, unknown> = {
      request_type_id: args.requestTypeId,
      description: args.description,
    };
    if (args.lat) body.lat = args.lat;
    if (args.lng) body.lng = args.lng;
    if (args.address) body.address = args.address;
    return this.civicPost(`/organizations/${this.organizationId}/issues`, body);
  }

  private async updateIssue(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.issueId) return { content: [{ type: 'text', text: 'issueId is required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.status) body.status = args.status;
    if (args.assignedTo) body.assigned_to = args.assignedTo;
    return this.civicPatch(`/organizations/${this.organizationId}/issues/${encodeURIComponent(args.issueId as string)}`, body);
  }

  private async listIssueComments(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.issueId) return { content: [{ type: 'text', text: 'issueId is required' }], isError: true };
    return this.civicGet(`/organizations/${this.organizationId}/issues/${encodeURIComponent(args.issueId as string)}/comments`);
  }

  private async createIssueComment(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.issueId || !args.comment) return { content: [{ type: 'text', text: 'issueId and comment are required' }], isError: true };
    const body: Record<string, unknown> = {
      comment: args.comment,
      visibility: (args.visibility as string) ?? 'public',
    };
    return this.civicPost(`/organizations/${this.organizationId}/issues/${encodeURIComponent(args.issueId as string)}/comments`, body);
  }

  private async listZones(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      page: String((args.page as number) ?? 1),
      per_page: String((args.perPage as number) ?? 20),
    };
    return this.civicGet(`/organizations/${this.organizationId}/zones`, params);
  }

  private async getZone(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.zoneId) return { content: [{ type: 'text', text: 'zoneId is required' }], isError: true };
    return this.civicGet(`/organizations/${this.organizationId}/zones/${encodeURIComponent(args.zoneId as string)}`);
  }

  private async getOrganization(): Promise<ToolResult> {
    return this.civicGet(`/organizations/${this.organizationId}`);
  }

  private async listRequestTypes(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (args.zoneId) params.zone_id = String(args.zoneId);
    return this.civicGet(`/organizations/${this.organizationId}/request_types`, params);
  }

  private async getRequestType(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.requestTypeId) return { content: [{ type: 'text', text: 'requestTypeId is required' }], isError: true };
    return this.civicGet(`/organizations/${this.organizationId}/request_types/${encodeURIComponent(args.requestTypeId as string)}`);
  }

  private async listIssueSubscribers(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.issueId) return { content: [{ type: 'text', text: 'issueId is required' }], isError: true };
    return this.civicGet(`/organizations/${this.organizationId}/issues/${encodeURIComponent(args.issueId as string)}/subscribers`);
  }

  private async searchIssues(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      page: String((args.page as number) ?? 1),
      per_page: String((args.perPage as number) ?? 20),
    };
    if (args.query) params.q = args.query as string;
    if (args.address) params.address = args.address as string;
    if (args.lat) params.lat = String(args.lat);
    if (args.lng) params.lng = String(args.lng);
    if (args.radius) params.radius = String(args.radius);
    if (args.status) params.status = args.status as string;
    return this.civicGet(`/organizations/${this.organizationId}/issues/search`, params);
  }
}

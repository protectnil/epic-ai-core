/**
 * ServiceNow ITSM MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None from ServiceNow Inc. as of 2026-03.
// Community servers exist (michaelbuckner/servicenow-mcp, ShunyaAI/snow-mcp with 60+ tools) but are not
// official ServiceNow-published servers. ShunyaAI/snow-mcp covers ITSM, ITOM, and AppDev via Python.
// Our adapter covers: 16 tools (incidents, changes, problems, catalog requests, users, CI records).
// Recommendation: Use this adapter for REST-only environments. Evaluate snow-mcp for Python-friendly deployments.
//
// Base URL: https://{instance}.service-now.com/api/now
// Auth: Basic auth (username:password) or Bearer token
// Docs: https://developer.servicenow.com/dev.do#!/reference/api/latest/rest/c_TableAPI
// Rate limits: Default 3,000 req/10min per instance; configurable via system properties

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';
import type { AdapterCatalogEntry } from '../federation/AdapterCatalog.js';

interface ServiceNowITSMConfig {
  instance: string;
  username?: string;
  password?: string;
  bearerToken?: string;
  baseUrl?: string;
}

export class ServiceNowITSMMCPServer extends MCPAdapterBase {
  private readonly baseUrl: string;
  private readonly authHeader: string;

  constructor(config: ServiceNowITSMConfig) {
    super();
    this.baseUrl = config.baseUrl || `https://${config.instance}.service-now.com/api/now`;

    if (config.bearerToken) {
      this.authHeader = `Bearer ${config.bearerToken}`;
    } else if (config.username && config.password) {
      this.authHeader = `Basic ${Buffer.from(`${config.username}:${config.password}`).toString('base64')}`;
    } else {
      throw new Error(
        'ServiceNowITSMMCPServer: authentication required. Provide either bearerToken or both username and password.',
      );
    }
  }

  static catalog(): AdapterCatalogEntry {
    return {
      name: 'servicenow-itsm',
      displayName: 'ServiceNow ITSM',
      version: '1.0.0',
      category: 'misc',
      keywords: [
        'servicenow', 'itsm', 'incident', 'change', 'problem', 'request', 'catalog',
        'cmdb', 'asset', 'configuration-item', 'ticket', 'itil', 'service-desk',
        'helpdesk', 'snow', 'change-management', 'problem-management',
      ],
      toolNames: [
        'list_incidents', 'get_incident', 'create_incident', 'update_incident',
        'list_change_requests', 'get_change_request', 'create_change_request',
        'list_problems', 'get_problem', 'list_requests', 'get_request',
        'list_catalog_items', 'list_users', 'get_user',
        'list_configuration_items', 'get_configuration_item',
      ],
      description: 'IT Service Management: manage incidents, change requests, problems, and service catalog requests. Query CMDB configuration items and user records.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_incidents',
        description: 'List ServiceNow incidents with optional filters for state, priority, assignment group, and date range; supports pagination',
        inputSchema: {
          type: 'object',
          properties: {
            state: {
              type: 'string',
              description: 'Filter by state value: 1=New, 2=In Progress, 3=On Hold, 6=Resolved, 7=Closed',
            },
            priority: {
              type: 'string',
              description: 'Filter by priority: 1=Critical, 2=High, 3=Moderate, 4=Low, 5=Planning',
            },
            assigned_to: {
              type: 'string',
              description: 'Filter by assigned user sys_id or username',
            },
            assignment_group: {
              type: 'string',
              description: 'Filter by assignment group sys_id or name',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of incidents to return (default: 20, max: 1000)',
            },
            offset: {
              type: 'number',
              description: 'Number of records to skip for pagination (default: 0)',
            },
            sysparm_query: {
              type: 'string',
              description: 'Raw ServiceNow encoded query string for advanced filtering',
            },
          },
        },
      },
      {
        name: 'get_incident',
        description: 'Retrieve a single ServiceNow incident by sys_id or incident number (e.g., INC0010001)',
        inputSchema: {
          type: 'object',
          properties: {
            sys_id: {
              type: 'string',
              description: 'The incident sys_id (32-character GUID)',
            },
            number: {
              type: 'string',
              description: 'The incident number (e.g., INC0010001) — used if sys_id is not provided',
            },
          },
        },
      },
      {
        name: 'create_incident',
        description: 'Create a new ServiceNow incident record with short description, urgency, impact, and category',
        inputSchema: {
          type: 'object',
          properties: {
            short_description: {
              type: 'string',
              description: 'Brief description of the incident (required)',
            },
            description: {
              type: 'string',
              description: 'Detailed description of the incident',
            },
            urgency: {
              type: 'string',
              description: 'Urgency: 1=High, 2=Medium, 3=Low',
            },
            impact: {
              type: 'string',
              description: 'Impact: 1=High, 2=Medium, 3=Low',
            },
            category: {
              type: 'string',
              description: 'Incident category (e.g., software, hardware, network, database)',
            },
            caller_id: {
              type: 'string',
              description: 'sys_id or username of the caller or requester',
            },
            assignment_group: {
              type: 'string',
              description: 'sys_id or name of the group to assign this incident to',
            },
          },
          required: ['short_description'],
        },
      },
      {
        name: 'update_incident',
        description: 'Update fields on an existing ServiceNow incident by sys_id, such as state, work notes, or assignment',
        inputSchema: {
          type: 'object',
          properties: {
            sys_id: {
              type: 'string',
              description: 'The incident sys_id to update',
            },
            fields: {
              type: 'object',
              description: 'Field names and new values (e.g., state, work_notes, assigned_to, close_code, close_notes)',
              additionalProperties: true,
            },
          },
          required: ['sys_id', 'fields'],
        },
      },
      {
        name: 'list_change_requests',
        description: 'List ServiceNow change requests with optional filters for type, state, and risk; supports pagination',
        inputSchema: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              description: 'Change type: standard, normal, emergency',
            },
            state: {
              type: 'string',
              description: 'Filter by state: -5=New, -4=Assess, -3=Authorize, -2=Scheduled, -1=Implement, 0=Review, 3=Closed',
            },
            risk: {
              type: 'string',
              description: 'Filter by risk: 1=High, 2=Moderate, 3=Low, 4=Critical',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of change requests to return (default: 20)',
            },
            offset: {
              type: 'number',
              description: 'Number of records to skip for pagination (default: 0)',
            },
            sysparm_query: {
              type: 'string',
              description: 'Raw ServiceNow encoded query string for advanced filtering',
            },
          },
        },
      },
      {
        name: 'get_change_request',
        description: 'Retrieve a single ServiceNow change request by sys_id or change number (e.g., CHG0000001)',
        inputSchema: {
          type: 'object',
          properties: {
            sys_id: {
              type: 'string',
              description: 'The change request sys_id (32-character GUID)',
            },
            number: {
              type: 'string',
              description: 'The change request number (e.g., CHG0000001) — used if sys_id is not provided',
            },
          },
        },
      },
      {
        name: 'create_change_request',
        description: 'Create a new ServiceNow change request with type, short description, and risk classification',
        inputSchema: {
          type: 'object',
          properties: {
            short_description: {
              type: 'string',
              description: 'Brief description of the change',
            },
            type: {
              type: 'string',
              description: 'Change type: standard, normal, emergency (default: normal)',
            },
            description: {
              type: 'string',
              description: 'Detailed description and justification for the change',
            },
            risk: {
              type: 'string',
              description: 'Risk level: 1=High, 2=Moderate, 3=Low, 4=Critical',
            },
            assignment_group: {
              type: 'string',
              description: 'sys_id or name of the group to assign this change to',
            },
          },
          required: ['short_description'],
        },
      },
      {
        name: 'list_problems',
        description: 'List ServiceNow problem records with optional filters for state, impact, and assignment; supports pagination',
        inputSchema: {
          type: 'object',
          properties: {
            state: {
              type: 'string',
              description: 'Filter by problem state: 101=New, 102=Assess, 103=Root Cause Analysis, 104=Fix in Progress, 105=Resolved, 106=Closed',
            },
            impact: {
              type: 'string',
              description: 'Filter by impact: 1=High, 2=Medium, 3=Low',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of problems to return (default: 20)',
            },
            offset: {
              type: 'number',
              description: 'Number of records to skip for pagination (default: 0)',
            },
            sysparm_query: {
              type: 'string',
              description: 'Raw ServiceNow encoded query string for advanced filtering',
            },
          },
        },
      },
      {
        name: 'get_problem',
        description: 'Retrieve a single ServiceNow problem record by sys_id or problem number (e.g., PRB0000001)',
        inputSchema: {
          type: 'object',
          properties: {
            sys_id: {
              type: 'string',
              description: 'The problem sys_id (32-character GUID)',
            },
            number: {
              type: 'string',
              description: 'The problem number (e.g., PRB0000001) — used if sys_id is not provided',
            },
          },
        },
      },
      {
        name: 'list_requests',
        description: 'List ServiceNow service catalog requests (sc_request) with optional state and date filters',
        inputSchema: {
          type: 'object',
          properties: {
            state: {
              type: 'string',
              description: 'Filter by request state: 1=Pending Approval, 2=Approved, 3=Rejected, 4=Cancelled',
            },
            requested_for: {
              type: 'string',
              description: 'Filter by the user the request was made for (sys_id or username)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of requests to return (default: 20)',
            },
            offset: {
              type: 'number',
              description: 'Number of records to skip for pagination (default: 0)',
            },
            sysparm_query: {
              type: 'string',
              description: 'Raw ServiceNow encoded query string for advanced filtering',
            },
          },
        },
      },
      {
        name: 'get_request',
        description: 'Retrieve a single service catalog request by sys_id or request number (e.g., REQ0000001)',
        inputSchema: {
          type: 'object',
          properties: {
            sys_id: {
              type: 'string',
              description: 'The request sys_id (32-character GUID)',
            },
            number: {
              type: 'string',
              description: 'The request number (e.g., REQ0000001) — used if sys_id is not provided',
            },
          },
        },
      },
      {
        name: 'list_catalog_items',
        description: 'List available service catalog items with optional category and active status filters',
        inputSchema: {
          type: 'object',
          properties: {
            category: {
              type: 'string',
              description: 'Filter by catalog category sys_id or name',
            },
            active: {
              type: 'boolean',
              description: 'Filter by active status: true for active items only (default: true)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of catalog items to return (default: 20)',
            },
            offset: {
              type: 'number',
              description: 'Number of records to skip for pagination (default: 0)',
            },
          },
        },
      },
      {
        name: 'list_users',
        description: 'List ServiceNow user records with optional filters for active status and department',
        inputSchema: {
          type: 'object',
          properties: {
            active: {
              type: 'boolean',
              description: 'Filter by active status: true for active users only (default: true)',
            },
            department: {
              type: 'string',
              description: 'Filter by department name or sys_id',
            },
            name: {
              type: 'string',
              description: 'Filter by user name (partial match)',
            },
            email: {
              type: 'string',
              description: 'Filter by email address',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of users to return (default: 20)',
            },
            offset: {
              type: 'number',
              description: 'Number of records to skip for pagination (default: 0)',
            },
          },
        },
      },
      {
        name: 'get_user',
        description: 'Retrieve a single ServiceNow user record by sys_id, username, or email address',
        inputSchema: {
          type: 'object',
          properties: {
            sys_id: {
              type: 'string',
              description: 'The user sys_id (32-character GUID)',
            },
            user_name: {
              type: 'string',
              description: 'The user login name — used if sys_id is not provided',
            },
            email: {
              type: 'string',
              description: 'The user email address — used if sys_id and user_name are not provided',
            },
          },
        },
      },
      {
        name: 'list_configuration_items',
        description: 'List CMDB configuration items with optional filters for class, name, and operational status',
        inputSchema: {
          type: 'object',
          properties: {
            sys_class_name: {
              type: 'string',
              description: 'Filter by CI class (e.g., cmdb_ci_server, cmdb_ci_application, cmdb_ci_database)',
            },
            name: {
              type: 'string',
              description: 'Filter by CI name (partial match)',
            },
            operational_status: {
              type: 'string',
              description: 'Filter by operational status: 1=Operational, 2=Non-Operational, 3=Repair in Progress',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of CIs to return (default: 20)',
            },
            offset: {
              type: 'number',
              description: 'Number of records to skip for pagination (default: 0)',
            },
            sysparm_query: {
              type: 'string',
              description: 'Raw ServiceNow encoded query string for advanced filtering',
            },
          },
        },
      },
      {
        name: 'get_configuration_item',
        description: 'Retrieve a single CMDB configuration item by sys_id or CI name',
        inputSchema: {
          type: 'object',
          properties: {
            sys_id: {
              type: 'string',
              description: 'The CI sys_id (32-character GUID)',
            },
            name: {
              type: 'string',
              description: 'The CI name — used if sys_id is not provided',
            },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_incidents':
          return await this.listIncidents(args);
        case 'get_incident':
          return await this.getIncident(args);
        case 'create_incident':
          return await this.createIncident(args);
        case 'update_incident':
          return await this.updateIncident(args);
        case 'list_change_requests':
          return await this.listChangeRequests(args);
        case 'get_change_request':
          return await this.getChangeRequest(args);
        case 'create_change_request':
          return await this.createChangeRequest(args);
        case 'list_problems':
          return await this.listProblems(args);
        case 'get_problem':
          return await this.getProblem(args);
        case 'list_requests':
          return await this.listRequests(args);
        case 'get_request':
          return await this.getRequest(args);
        case 'list_catalog_items':
          return await this.listCatalogItems(args);
        case 'list_users':
          return await this.listUsers(args);
        case 'get_user':
          return await this.getUser(args);
        case 'list_configuration_items':
          return await this.listConfigurationItems(args);
        case 'get_configuration_item':
          return await this.getConfigurationItem(args);
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

  private requestHeaders(): Record<string, string> {
    return {
      Authorization: this.authHeader,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  private async fetchTable(
    table: string,
    queryParts: string[],
    limit: number,
    offset: number,
  ): Promise<ToolResult> {
    const params = new URLSearchParams();
    params.set('sysparm_limit', String(limit));
    params.set('sysparm_offset', String(offset));
    if (queryParts.length > 0) params.set('sysparm_query', queryParts.join('^'));

    const response = await this.fetchWithRetry(`${this.baseUrl}/table/${table}?${params}`, {
      method: 'GET',
      headers: this.requestHeaders(),
    });
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`ServiceNow API error: ${response.status} ${response.statusText}${body ? ` — ${body.slice(0, 200)}` : ''}`);
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async fetchByIdOrQuery(table: string, sysId?: string, queryString?: string): Promise<ToolResult> {
    if (sysId) {
      const response = await this.fetchWithRetry(
        `${this.baseUrl}/table/${table}/${encodeURIComponent(sysId)}`,
        { method: 'GET', headers: this.requestHeaders() },
      );
      if (!response.ok) {
        const body = await response.text().catch(() => '');
        throw new Error(`ServiceNow API error: ${response.status} ${response.statusText}${body ? ` — ${body.slice(0, 200)}` : ''}`);
      }
      const data = await response.json();
      return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
    }
    if (queryString) {
      const params = new URLSearchParams({ sysparm_query: queryString, sysparm_limit: '1' });
      const response = await this.fetchWithRetry(
        `${this.baseUrl}/table/${table}?${params}`,
        { method: 'GET', headers: this.requestHeaders() },
      );
      if (!response.ok) {
        const body = await response.text().catch(() => '');
        throw new Error(`ServiceNow API error: ${response.status} ${response.statusText}${body ? ` — ${body.slice(0, 200)}` : ''}`);
      }
      const data = await response.json();
      return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
    }
    return { content: [{ type: 'text', text: 'Either sys_id or a lookup identifier is required' }], isError: true };
  }

  private async postTable(table: string, body: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}/table/${table}`, {
      method: 'POST',
      headers: this.requestHeaders(),
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const errBody = await response.text().catch(() => '');
      throw new Error(`ServiceNow API error: ${response.status} ${response.statusText}${errBody ? ` — ${errBody.slice(0, 200)}` : ''}`);
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listIncidents(args: Record<string, unknown>): Promise<ToolResult> {
    const queryParts: string[] = [];
    if (args.state) queryParts.push(`state=${encodeURIComponent(String(args.state))}`);
    if (args.priority) queryParts.push(`priority=${encodeURIComponent(String(args.priority))}`);
    if (args.assigned_to) queryParts.push(`assigned_to=${encodeURIComponent(String(args.assigned_to))}`);
    if (args.assignment_group) queryParts.push(`assignment_group=${encodeURIComponent(String(args.assignment_group))}`);
    if (args.sysparm_query) queryParts.push(String(args.sysparm_query));
    return this.fetchTable('incident', queryParts, (args.limit as number) ?? 20, (args.offset as number) ?? 0);
  }

  private async getIncident(args: Record<string, unknown>): Promise<ToolResult> {
    const sysId = args.sys_id as string | undefined;
    const number = args.number as string | undefined;
    if (!sysId && !number) {
      return { content: [{ type: 'text', text: 'sys_id or number is required' }], isError: true };
    }
    return this.fetchByIdOrQuery('incident', sysId, number ? `number=${encodeURIComponent(number)}` : undefined);
  }

  private async createIncident(args: Record<string, unknown>): Promise<ToolResult> {
    const shortDesc = args.short_description as string;
    if (!shortDesc) {
      return { content: [{ type: 'text', text: 'short_description is required' }], isError: true };
    }
    const body: Record<string, unknown> = { short_description: shortDesc };
    if (args.description) body['description'] = args.description;
    if (args.urgency) body['urgency'] = args.urgency;
    if (args.impact) body['impact'] = args.impact;
    if (args.category) body['category'] = args.category;
    if (args.caller_id) body['caller_id'] = args.caller_id;
    if (args.assignment_group) body['assignment_group'] = args.assignment_group;
    return this.postTable('incident', body);
  }

  private async updateIncident(args: Record<string, unknown>): Promise<ToolResult> {
    const sysId = args.sys_id as string;
    const fields = args.fields as Record<string, unknown>;
    if (!sysId || !fields) {
      return { content: [{ type: 'text', text: 'sys_id and fields are required' }], isError: true };
    }
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/table/incident/${encodeURIComponent(sysId)}`,
      { method: 'PATCH', headers: this.requestHeaders(), body: JSON.stringify(fields) },
    );
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`ServiceNow API error: ${response.status} ${response.statusText}${body ? ` — ${body.slice(0, 200)}` : ''}`);
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listChangeRequests(args: Record<string, unknown>): Promise<ToolResult> {
    const queryParts: string[] = [];
    if (args.type) queryParts.push(`type=${encodeURIComponent(String(args.type))}`);
    if (args.state) queryParts.push(`state=${encodeURIComponent(String(args.state))}`);
    if (args.risk) queryParts.push(`risk=${encodeURIComponent(String(args.risk))}`);
    if (args.sysparm_query) queryParts.push(String(args.sysparm_query));
    return this.fetchTable('change_request', queryParts, (args.limit as number) ?? 20, (args.offset as number) ?? 0);
  }

  private async getChangeRequest(args: Record<string, unknown>): Promise<ToolResult> {
    const sysId = args.sys_id as string | undefined;
    const number = args.number as string | undefined;
    if (!sysId && !number) {
      return { content: [{ type: 'text', text: 'sys_id or number is required' }], isError: true };
    }
    return this.fetchByIdOrQuery('change_request', sysId, number ? `number=${encodeURIComponent(number)}` : undefined);
  }

  private async createChangeRequest(args: Record<string, unknown>): Promise<ToolResult> {
    const shortDesc = args.short_description as string;
    if (!shortDesc) {
      return { content: [{ type: 'text', text: 'short_description is required' }], isError: true };
    }
    const body: Record<string, unknown> = { short_description: shortDesc };
    if (args.type) body['type'] = args.type;
    if (args.description) body['description'] = args.description;
    if (args.risk) body['risk'] = args.risk;
    if (args.assignment_group) body['assignment_group'] = args.assignment_group;
    return this.postTable('change_request', body);
  }

  private async listProblems(args: Record<string, unknown>): Promise<ToolResult> {
    const queryParts: string[] = [];
    if (args.state) queryParts.push(`state=${encodeURIComponent(String(args.state))}`);
    if (args.impact) queryParts.push(`impact=${encodeURIComponent(String(args.impact))}`);
    if (args.sysparm_query) queryParts.push(String(args.sysparm_query));
    return this.fetchTable('problem', queryParts, (args.limit as number) ?? 20, (args.offset as number) ?? 0);
  }

  private async getProblem(args: Record<string, unknown>): Promise<ToolResult> {
    const sysId = args.sys_id as string | undefined;
    const number = args.number as string | undefined;
    if (!sysId && !number) {
      return { content: [{ type: 'text', text: 'sys_id or number is required' }], isError: true };
    }
    return this.fetchByIdOrQuery('problem', sysId, number ? `number=${encodeURIComponent(number)}` : undefined);
  }

  private async listRequests(args: Record<string, unknown>): Promise<ToolResult> {
    const queryParts: string[] = [];
    if (args.state) queryParts.push(`state=${encodeURIComponent(String(args.state))}`);
    if (args.requested_for) queryParts.push(`requested_for=${encodeURIComponent(String(args.requested_for))}`);
    if (args.sysparm_query) queryParts.push(String(args.sysparm_query));
    return this.fetchTable('sc_request', queryParts, (args.limit as number) ?? 20, (args.offset as number) ?? 0);
  }

  private async getRequest(args: Record<string, unknown>): Promise<ToolResult> {
    const sysId = args.sys_id as string | undefined;
    const number = args.number as string | undefined;
    if (!sysId && !number) {
      return { content: [{ type: 'text', text: 'sys_id or number is required' }], isError: true };
    }
    return this.fetchByIdOrQuery('sc_request', sysId, number ? `number=${encodeURIComponent(number)}` : undefined);
  }

  private async listCatalogItems(args: Record<string, unknown>): Promise<ToolResult> {
    const queryParts: string[] = [];
    const active = args.active !== false;
    queryParts.push(`active=${active}`);
    if (args.category) queryParts.push(`category=${encodeURIComponent(String(args.category))}`);
    return this.fetchTable('sc_cat_item', queryParts, (args.limit as number) ?? 20, (args.offset as number) ?? 0);
  }

  private async listUsers(args: Record<string, unknown>): Promise<ToolResult> {
    const queryParts: string[] = [];
    const active = args.active !== false;
    queryParts.push(`active=${active}`);
    if (args.department) queryParts.push(`department.name=${encodeURIComponent(String(args.department))}`);
    if (args.name) queryParts.push(`nameLIKE${encodeURIComponent(String(args.name))}`);
    if (args.email) queryParts.push(`email=${encodeURIComponent(String(args.email))}`);
    return this.fetchTable('sys_user', queryParts, (args.limit as number) ?? 20, (args.offset as number) ?? 0);
  }

  private async getUser(args: Record<string, unknown>): Promise<ToolResult> {
    const sysId = args.sys_id as string | undefined;
    const userName = args.user_name as string | undefined;
    const email = args.email as string | undefined;
    if (!sysId && !userName && !email) {
      return { content: [{ type: 'text', text: 'sys_id, user_name, or email is required' }], isError: true };
    }
    let query: string | undefined;
    if (userName) query = `user_name=${encodeURIComponent(userName)}`;
    else if (email) query = `email=${encodeURIComponent(email)}`;
    return this.fetchByIdOrQuery('sys_user', sysId, query);
  }

  private async listConfigurationItems(args: Record<string, unknown>): Promise<ToolResult> {
    const queryParts: string[] = [];
    if (args.sys_class_name) queryParts.push(`sys_class_name=${encodeURIComponent(String(args.sys_class_name))}`);
    if (args.name) queryParts.push(`nameLIKE${encodeURIComponent(String(args.name))}`);
    if (args.operational_status) queryParts.push(`operational_status=${encodeURIComponent(String(args.operational_status))}`);
    if (args.sysparm_query) queryParts.push(String(args.sysparm_query));
    return this.fetchTable('cmdb_ci', queryParts, (args.limit as number) ?? 20, (args.offset as number) ?? 0);
  }

  private async getConfigurationItem(args: Record<string, unknown>): Promise<ToolResult> {
    const sysId = args.sys_id as string | undefined;
    const name = args.name as string | undefined;
    if (!sysId && !name) {
      return { content: [{ type: 'text', text: 'sys_id or name is required' }], isError: true };
    }
    return this.fetchByIdOrQuery('cmdb_ci', sysId, name ? `name=${encodeURIComponent(name)}` : undefined);
  }
}

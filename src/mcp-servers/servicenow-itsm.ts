/** ServiceNow ITSM MCP Server
 * Provides access to ServiceNow ITSM incidents and service requests via the ServiceNow REST API
 *
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

import { ToolDefinition, ToolResult } from './types.js';

interface ServiceNowITSMConfig {
  username: string;
  password: string;
  instance: string;
  baseUrl?: string;
}

export class ServiceNowITSMMCPServer {
  private readonly username: string;
  private readonly password: string;
  private readonly baseUrl: string;

  constructor(config: ServiceNowITSMConfig) {
    this.username = config.username;
    this.password = config.password;
    this.baseUrl = config.baseUrl || `https://${config.instance}.service-now.com/api/now`;
  }

  private get authHeader(): string {
    const credentials = Buffer.from(`${this.username}:${this.password}`).toString('base64');
    return `Basic ${credentials}`;
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_incidents',
        description: 'List ServiceNow incidents with optional state, priority, and pagination filtering',
        inputSchema: {
          type: 'object',
          properties: {
            state: {
              type: 'string',
              description: 'Filter by incident state value (e.g. 1=New, 2=In Progress, 6=Resolved, 7=Closed)',
            },
            priority: {
              type: 'string',
              description: 'Filter by priority (1=Critical, 2=High, 3=Moderate, 4=Low)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of incidents to return (default: 20)',
            },
            offset: {
              type: 'number',
              description: 'Number of records to skip for pagination (default: 0)',
            },
            sysparm_query: {
              type: 'string',
              description: 'ServiceNow encoded query string for advanced filtering',
            },
          },
        },
      },
      {
        name: 'get_incident',
        description: 'Retrieve a single ServiceNow incident by sys_id or incident number',
        inputSchema: {
          type: 'object',
          properties: {
            sys_id: {
              type: 'string',
              description: 'The ServiceNow sys_id of the incident record',
            },
            number: {
              type: 'string',
              description: 'The incident number (e.g. INC0010001) — used if sys_id is not provided',
            },
          },
        },
      },
      {
        name: 'create_incident',
        description: 'Create a new ServiceNow incident record',
        inputSchema: {
          type: 'object',
          properties: {
            short_description: {
              type: 'string',
              description: 'Brief description of the incident',
            },
            description: {
              type: 'string',
              description: 'Detailed description of the incident',
            },
            caller_id: {
              type: 'string',
              description: 'sys_id or username of the caller/requester',
            },
            urgency: {
              type: 'string',
              description: 'Urgency level: 1=High, 2=Medium, 3=Low',
            },
            impact: {
              type: 'string',
              description: 'Impact level: 1=High, 2=Medium, 3=Low',
            },
            category: {
              type: 'string',
              description: 'Incident category (e.g. software, hardware, network)',
            },
          },
          required: ['short_description'],
        },
      },
      {
        name: 'update_incident',
        description: 'Update fields on an existing ServiceNow incident by sys_id',
        inputSchema: {
          type: 'object',
          properties: {
            sys_id: {
              type: 'string',
              description: 'The ServiceNow sys_id of the incident to update',
            },
            fields: {
              type: 'object',
              description: 'Field names and updated values (e.g. state, work_notes, assigned_to)',
              additionalProperties: true,
            },
          },
          required: ['sys_id', 'fields'],
        },
      },
      {
        name: 'list_requests',
        description: 'List ServiceNow service catalog requests (sc_request) with optional filtering',
        inputSchema: {
          type: 'object',
          properties: {
            state: {
              type: 'string',
              description: 'Filter by request state value',
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
              description: 'ServiceNow encoded query string for advanced filtering',
            },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      const headers: Record<string, string> = {
        Authorization: this.authHeader,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      };

      switch (name) {
        case 'list_incidents': {
          const params = new URLSearchParams();
          params.set('sysparm_limit', String((args.limit as number) || 20));
          params.set('sysparm_offset', String((args.offset as number) || 0));
          const queryParts: string[] = [];
          if (args.state) queryParts.push(`state=${encodeURIComponent(args.state as string)}`);
          if (args.priority) queryParts.push(`priority=${encodeURIComponent(args.priority as string)}`);
          if (args.sysparm_query) queryParts.push(args.sysparm_query as string);
          if (queryParts.length > 0) params.set('sysparm_query', queryParts.join('^'));
          const response = await fetch(`${this.baseUrl}/table/incident?${params.toString()}`, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list incidents: ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`ServiceNow returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_incident': {
          const sysId = args.sys_id as string;
          const number = args.number as string;
          if (!sysId && !number) {
            return { content: [{ type: 'text', text: 'sys_id or number is required' }], isError: true };
          }
          let url: string;
          if (sysId) {
            url = `${this.baseUrl}/table/incident/${encodeURIComponent(sysId)}`;
          } else {
            url = `${this.baseUrl}/table/incident?sysparm_query=number=${encodeURIComponent(number)}&sysparm_limit=1`;
          }
          const response = await fetch(url, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to get incident: ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`ServiceNow returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'create_incident': {
          const shortDescription = args.short_description as string;
          if (!shortDescription) {
            return { content: [{ type: 'text', text: 'short_description is required' }], isError: true };
          }
          const body: Record<string, unknown> = { short_description: shortDescription };
          if (args.description) body.description = args.description;
          if (args.caller_id) body.caller_id = args.caller_id;
          if (args.urgency) body.urgency = args.urgency;
          if (args.impact) body.impact = args.impact;
          if (args.category) body.category = args.category;
          const response = await fetch(
            `${this.baseUrl}/table/incident`,
            { method: 'POST', headers, body: JSON.stringify(body) }
          );
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to create incident: ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`ServiceNow returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'update_incident': {
          const sysId = args.sys_id as string;
          const fields = args.fields as Record<string, unknown>;
          if (!sysId || !fields) {
            return { content: [{ type: 'text', text: 'sys_id and fields are required' }], isError: true };
          }
          const response = await fetch(
            `${this.baseUrl}/table/incident/${encodeURIComponent(sysId)}`,
            { method: 'PATCH', headers, body: JSON.stringify(fields) }
          );
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to update incident: ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`ServiceNow returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_requests': {
          const params = new URLSearchParams();
          params.set('sysparm_limit', String((args.limit as number) || 20));
          params.set('sysparm_offset', String((args.offset as number) || 0));
          const queryParts: string[] = [];
          if (args.state) queryParts.push(`state=${encodeURIComponent(args.state as string)}`);
          if (args.sysparm_query) queryParts.push(args.sysparm_query as string);
          if (queryParts.length > 0) params.set('sysparm_query', queryParts.join('^'));
          const response = await fetch(`${this.baseUrl}/table/sc_request?${params.toString()}`, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list requests: ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`ServiceNow returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

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
}

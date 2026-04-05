/**
 * xMatters MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// No official xMatters MCP server was found on GitHub, npm, or xMatters developer docs as of 2026-03-28.
// Community tool: github.com/xmatters/xmtoolbox (Node.js library, not MCP — not a replacement).
// Our adapter covers: 20 tools. Vendor MCP covers: 0 tools.
// Recommendation: use-rest-api — no official MCP exists.
//
// Base URL: https://{company}.xmatters.com/api/xm/1
// Auth: HTTP Basic (Authorization: Basic base64(user:pass)) OR OAuth2 Bearer token
//   (POST https://{company}.xmatters.com/oauth2/token with client_credentials grant).
//   Bearer token is preferred; Basic requires REST Web Service User role on the account.
// Docs: https://help.xmatters.com/xmapi/
// Rate limits: Not publicly documented; xMatters recommends staying below 60 req/min per token

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface XMattersConfig {
  /** Full base URL of your xMatters instance, e.g. "https://mycompany.xmatters.com" */
  baseUrl: string;
  /** OAuth Bearer token (preferred) */
  apiToken?: string;
  /** Basic-auth username (used when apiToken is not supplied) */
  username?: string;
  /** Basic-auth password (used when apiToken is not supplied) */
  password?: string;
}

export class XMattersMCPServer extends MCPAdapterBase {
  private readonly baseUrl: string;
  private readonly authHeader: string;

  constructor(config: XMattersConfig) {
    super();
    const root = config.baseUrl.replace(/\/$/, '');
    this.baseUrl = root.endsWith('/api/xm/1') ? root : `${root}/api/xm/1`;

    if (config.apiToken) {
      this.authHeader = `Bearer ${config.apiToken}`;
    } else if (config.username && config.password) {
      const encoded = Buffer.from(`${config.username}:${config.password}`).toString('base64');
      this.authHeader = `Basic ${encoded}`;
    } else {
      throw new Error('XMattersMCPServer: supply apiToken or username+password');
    }
  }

  static catalog() {
    return {
      name: 'xmatters',
      displayName: 'xMatters',
      version: '1.0.0',
      category: 'communication' as const,
      keywords: ['xmatters', 'incident', 'notification', 'alert', 'on-call', 'escalation', 'event', 'paging', 'itops'],
      toolNames: [
        'trigger_event', 'get_event', 'list_events', 'terminate_event',
        'get_person', 'search_people', 'create_person', 'update_person', 'delete_person',
        'get_group', 'list_groups', 'create_group', 'update_group',
        'get_on_call', 'list_shifts',
        'get_device', 'list_devices',
        'list_subscriptions',
        'list_audit_logs',
        'list_sites',
      ],
      description: 'Trigger and manage xMatters notifications, on-call schedules, groups, people, devices, and audit logs for IT operations alerting.',
      author: 'protectnil' as const,
    };
  }

  get tools(): ToolDefinition[] {
    return [
      // ── Events ──────────────────────────────────────────────────────────────
      {
        name: 'trigger_event',
        description: 'Trigger a new xMatters event (notification) to specified recipients with optional properties and priority.',
        inputSchema: {
          type: 'object',
          properties: {
            recipients: {
              type: 'array',
              description: 'Array of recipient objects, each with a "targetName" (user, group, or dynamic team name).',
              items: { type: 'object' },
            },
            properties: {
              type: 'object',
              description: 'Key-value map of event properties matching the form property names configured in xMatters.',
            },
            priority: {
              type: 'string',
              description: 'Event priority: LOW, MEDIUM, or HIGH (default: MEDIUM).',
            },
            planConstantUrls: {
              type: 'array',
              description: 'Array of plan constant URL objects to include with the event.',
              items: { type: 'object' },
            },
          },
          required: ['recipients'],
        },
      },
      {
        name: 'get_event',
        description: 'Retrieve details of a specific xMatters event by UUID, including status, recipients, and properties.',
        inputSchema: {
          type: 'object',
          properties: {
            eventId: {
              type: 'string',
              description: 'UUID of the xMatters event to retrieve.',
            },
          },
          required: ['eventId'],
        },
      },
      {
        name: 'list_events',
        description: 'List xMatters events with optional filters for status, date range, and pagination.',
        inputSchema: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              description: 'Filter by event status: ACTIVE, SUSPENDED, or TERMINATED.',
            },
            from: {
              type: 'string',
              description: 'ISO 8601 start timestamp for the filter window (e.g. 2026-01-01T00:00:00Z).',
            },
            to: {
              type: 'string',
              description: 'ISO 8601 end timestamp for the filter window.',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of events to return (default: 100).',
            },
            offset: {
              type: 'number',
              description: 'Number of records to skip for pagination (default: 0).',
            },
          },
        },
      },
      {
        name: 'terminate_event',
        description: 'Terminate (stop) an active xMatters event by UUID, halting all in-flight notifications.',
        inputSchema: {
          type: 'object',
          properties: {
            eventId: {
              type: 'string',
              description: 'UUID of the xMatters event to terminate.',
            },
          },
          required: ['eventId'],
        },
      },
      // ── People ───────────────────────────────────────────────────────────────
      {
        name: 'get_person',
        description: 'Retrieve an xMatters user (person) by UUID or targetName, including contact devices and groups.',
        inputSchema: {
          type: 'object',
          properties: {
            personId: {
              type: 'string',
              description: 'UUID or targetName of the xMatters user.',
            },
          },
          required: ['personId'],
        },
      },
      {
        name: 'search_people',
        description: 'Search xMatters users by name or custom property value with pagination support.',
        inputSchema: {
          type: 'object',
          properties: {
            search: {
              type: 'string',
              description: 'Search term matched against first name, last name, and targetName.',
            },
            propertyName: {
              type: 'string',
              description: 'Custom user property name to search against.',
            },
            propertyValue: {
              type: 'string',
              description: 'Custom user property value to match.',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results (default: 100).',
            },
            offset: {
              type: 'number',
              description: 'Records to skip for pagination (default: 0).',
            },
          },
        },
      },
      {
        name: 'create_person',
        description: 'Create a new xMatters user (person) with login credentials, site, and role assignments.',
        inputSchema: {
          type: 'object',
          properties: {
            targetName: {
              type: 'string',
              description: 'Unique login username for the new user.',
            },
            firstName: {
              type: 'string',
              description: 'First name of the person.',
            },
            lastName: {
              type: 'string',
              description: 'Last name of the person.',
            },
            status: {
              type: 'string',
              description: 'Account status: ACTIVE or INACTIVE (default: ACTIVE).',
            },
            roles: {
              type: 'array',
              description: 'Array of role name strings to assign (e.g. ["Standard User"]).',
              items: { type: 'string' },
            },
            site: {
              type: 'object',
              description: 'Site object with "name" property identifying the xMatters site.',
            },
          },
          required: ['targetName', 'firstName', 'lastName'],
        },
      },
      {
        name: 'update_person',
        description: 'Update an existing xMatters user\'s profile fields such as name, status, or site.',
        inputSchema: {
          type: 'object',
          properties: {
            personId: {
              type: 'string',
              description: 'UUID of the person to update.',
            },
            firstName: {
              type: 'string',
              description: 'Updated first name.',
            },
            lastName: {
              type: 'string',
              description: 'Updated last name.',
            },
            status: {
              type: 'string',
              description: 'Updated status: ACTIVE or INACTIVE.',
            },
            site: {
              type: 'object',
              description: 'Updated site object with "name" property.',
            },
          },
          required: ['personId'],
        },
      },
      {
        name: 'delete_person',
        description: 'Delete an xMatters user (person) by UUID. This action is permanent.',
        inputSchema: {
          type: 'object',
          properties: {
            personId: {
              type: 'string',
              description: 'UUID of the xMatters user to delete.',
            },
          },
          required: ['personId'],
        },
      },
      // ── Groups ───────────────────────────────────────────────────────────────
      {
        name: 'get_group',
        description: 'Retrieve details of an xMatters group by UUID or targetName, including observers and supervisors.',
        inputSchema: {
          type: 'object',
          properties: {
            groupId: {
              type: 'string',
              description: 'UUID or targetName of the xMatters group.',
            },
          },
          required: ['groupId'],
        },
      },
      {
        name: 'list_groups',
        description: 'List xMatters groups with optional name/description search and pagination.',
        inputSchema: {
          type: 'object',
          properties: {
            search: {
              type: 'string',
              description: 'Filter groups whose name or description contains this string.',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of groups to return (default: 100).',
            },
            offset: {
              type: 'number',
              description: 'Records to skip for pagination (default: 0).',
            },
          },
        },
      },
      {
        name: 'create_group',
        description: 'Create a new xMatters group with a unique targetName and optional description and observers.',
        inputSchema: {
          type: 'object',
          properties: {
            targetName: {
              type: 'string',
              description: 'Unique name for the new group.',
            },
            description: {
              type: 'string',
              description: 'Human-readable description of the group.',
            },
            allowDuplicates: {
              type: 'boolean',
              description: 'Whether duplicate notifications to the same recipient are allowed (default: true).',
            },
            useDefaultDevices: {
              type: 'boolean',
              description: 'Whether to use recipients\' default devices (default: true).',
            },
            observers: {
              type: 'array',
              description: 'Array of observer objects (users who can view the group).',
              items: { type: 'object' },
            },
          },
          required: ['targetName'],
        },
      },
      {
        name: 'update_group',
        description: 'Update an existing xMatters group\'s description, status, or notification settings.',
        inputSchema: {
          type: 'object',
          properties: {
            groupId: {
              type: 'string',
              description: 'UUID of the group to update.',
            },
            description: {
              type: 'string',
              description: 'Updated group description.',
            },
            status: {
              type: 'string',
              description: 'Group status: ACTIVE or INACTIVE.',
            },
            allowDuplicates: {
              type: 'boolean',
              description: 'Whether duplicate notifications are allowed.',
            },
          },
          required: ['groupId'],
        },
      },
      // ── On-call & Shifts ─────────────────────────────────────────────────────
      {
        name: 'get_on_call',
        description: 'Retrieve the current on-call members for an xMatters group, including escalation order.',
        inputSchema: {
          type: 'object',
          properties: {
            groupId: {
              type: 'string',
              description: 'UUID or targetName of the group whose on-call schedule to retrieve.',
            },
          },
          required: ['groupId'],
        },
      },
      {
        name: 'list_shifts',
        description: 'List all shifts for an xMatters group, including rotation schedules and time zones.',
        inputSchema: {
          type: 'object',
          properties: {
            groupId: {
              type: 'string',
              description: 'UUID or targetName of the group to retrieve shifts for.',
            },
          },
          required: ['groupId'],
        },
      },
      // ── Devices ──────────────────────────────────────────────────────────────
      {
        name: 'get_device',
        description: 'Retrieve an xMatters device by UUID, including type, address, and delay settings.',
        inputSchema: {
          type: 'object',
          properties: {
            deviceId: {
              type: 'string',
              description: 'UUID of the device to retrieve.',
            },
          },
          required: ['deviceId'],
        },
      },
      {
        name: 'list_devices',
        description: 'List all notification devices for an xMatters user, including email, SMS, and voice devices.',
        inputSchema: {
          type: 'object',
          properties: {
            personId: {
              type: 'string',
              description: 'UUID or targetName of the person whose devices to list.',
            },
            deviceType: {
              type: 'string',
              description: 'Filter by device type: EMAIL, TEXT_PHONE, VOICE, APPLE_PUSH, ANDROID_PUSH.',
            },
          },
          required: ['personId'],
        },
      },
      // ── Subscriptions ────────────────────────────────────────────────────────
      {
        name: 'list_subscriptions',
        description: 'List xMatters subscriptions for a person or all subscriptions, with optional filters.',
        inputSchema: {
          type: 'object',
          properties: {
            personId: {
              type: 'string',
              description: 'UUID of the person whose subscriptions to list. Omit to list all subscriptions.',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results (default: 100).',
            },
            offset: {
              type: 'number',
              description: 'Records to skip for pagination (default: 0).',
            },
          },
        },
      },
      // ── Audit Logs ───────────────────────────────────────────────────────────
      {
        name: 'list_audit_logs',
        description: 'Retrieve xMatters audit log entries filtered by date range and optional event type.',
        inputSchema: {
          type: 'object',
          properties: {
            from: {
              type: 'string',
              description: 'ISO 8601 start timestamp for the audit window (e.g. 2026-01-01T00:00:00Z).',
            },
            to: {
              type: 'string',
              description: 'ISO 8601 end timestamp for the audit window.',
            },
            auditType: {
              type: 'string',
              description: 'Filter by audit event type, e.g. EVENT_CREATED, PERSON_UPDATED, GROUP_MODIFIED.',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of audit records to return (default: 100).',
            },
            offset: {
              type: 'number',
              description: 'Records to skip for pagination (default: 0).',
            },
          },
        },
      },
      // ── Sites ────────────────────────────────────────────────────────────────
      {
        name: 'list_sites',
        description: 'List all xMatters sites (physical or logical locations) in the organization.',
        inputSchema: {
          type: 'object',
          properties: {
            search: {
              type: 'string',
              description: 'Filter sites whose name contains this string.',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of sites to return (default: 100).',
            },
            offset: {
              type: 'number',
              description: 'Records to skip for pagination (default: 0).',
            },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'trigger_event':    return await this.triggerEvent(args);
        case 'get_event':        return await this.getEvent(args);
        case 'list_events':      return await this.listEvents(args);
        case 'terminate_event':  return await this.terminateEvent(args);
        case 'get_person':       return await this.getPerson(args);
        case 'search_people':    return await this.searchPeople(args);
        case 'create_person':    return await this.createPerson(args);
        case 'update_person':    return await this.updatePerson(args);
        case 'delete_person':    return await this.deletePerson(args);
        case 'get_group':        return await this.getGroup(args);
        case 'list_groups':      return await this.listGroups(args);
        case 'create_group':     return await this.createGroup(args);
        case 'update_group':     return await this.updateGroup(args);
        case 'get_on_call':      return await this.getOnCall(args);
        case 'list_shifts':      return await this.listShifts(args);
        case 'get_device':       return await this.getDevice(args);
        case 'list_devices':     return await this.listDevices(args);
        case 'list_subscriptions': return await this.listSubscriptions(args);
        case 'list_audit_logs':  return await this.listAuditLogs(args);
        case 'list_sites':       return await this.listSites(args);
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

  // ── Private helpers ─────────────────────────────────────────────────────────

  private headers(): Record<string, string> {
    return {
      Authorization: this.authHeader,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  private async request(method: string, path: string, body?: unknown): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method,
      headers: this.headers(),
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return {
        content: [{ type: 'text', text: `xMatters API error ${response.status}: ${errText}` }],
        isError: true,
      };
    }

    if (response.status === 204) {
      return { content: [{ type: 'text', text: '{"success":true}' }], isError: false };
    }

    const data: unknown = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async triggerEvent(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.recipients) {
      return { content: [{ type: 'text', text: 'recipients is required' }], isError: true };
    }
    const body: Record<string, unknown> = { recipients: args.recipients };
    if (args.properties) body.properties = args.properties;
    if (args.priority) body.priority = args.priority;
    if (args.planConstantUrls) body.planConstantUrls = args.planConstantUrls;
    return this.request('POST', '/events', body);
  }

  private async getEvent(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.eventId as string;
    if (!id) return { content: [{ type: 'text', text: 'eventId is required' }], isError: true };
    return this.request('GET', `/events/${encodeURIComponent(id)}`);
  }

  private async listEvents(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.status) params.set('status', args.status as string);
    if (args.from) params.set('from', args.from as string);
    if (args.to) params.set('to', args.to as string);
    params.set('limit', String((args.limit as number) || 100));
    params.set('offset', String((args.offset as number) || 0));
    return this.request('GET', `/events?${params.toString()}`);
  }

  private async terminateEvent(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.eventId as string;
    if (!id) return { content: [{ type: 'text', text: 'eventId is required' }], isError: true };
    // xMatters terminates events via POST with status=TERMINATED in body, not DELETE
    return this.request('POST', `/events/${encodeURIComponent(id)}`, { id, status: 'TERMINATED' });
  }

  private async getPerson(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.personId as string;
    if (!id) return { content: [{ type: 'text', text: 'personId is required' }], isError: true };
    return this.request('GET', `/people/${encodeURIComponent(id)}`);
  }

  private async searchPeople(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.search) params.set('search', args.search as string);
    if (args.propertyName) params.set('propertyName', args.propertyName as string);
    if (args.propertyValue) params.set('propertyValue', args.propertyValue as string);
    params.set('limit', String((args.limit as number) || 100));
    params.set('offset', String((args.offset as number) || 0));
    return this.request('GET', `/people?${params.toString()}`);
  }

  private async createPerson(args: Record<string, unknown>): Promise<ToolResult> {
    const { targetName, firstName, lastName } = args as Record<string, string>;
    if (!targetName || !firstName || !lastName) {
      return { content: [{ type: 'text', text: 'targetName, firstName, and lastName are required' }], isError: true };
    }
    const body: Record<string, unknown> = { targetName, firstName, lastName };
    if (args.status) body.status = args.status;
    if (args.roles) body.roles = args.roles;
    if (args.site) body.site = args.site;
    return this.request('POST', '/people', body);
  }

  private async updatePerson(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.personId as string;
    if (!id) return { content: [{ type: 'text', text: 'personId is required' }], isError: true };
    const body: Record<string, unknown> = { id };
    if (args.firstName) body.firstName = args.firstName;
    if (args.lastName) body.lastName = args.lastName;
    if (args.status) body.status = args.status;
    if (args.site) body.site = args.site;
    return this.request('POST', '/people', body);
  }

  private async deletePerson(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.personId as string;
    if (!id) return { content: [{ type: 'text', text: 'personId is required' }], isError: true };
    return this.request('DELETE', `/people/${encodeURIComponent(id)}`);
  }

  private async getGroup(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.groupId as string;
    if (!id) return { content: [{ type: 'text', text: 'groupId is required' }], isError: true };
    return this.request('GET', `/groups/${encodeURIComponent(id)}`);
  }

  private async listGroups(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.search) params.set('search', args.search as string);
    params.set('limit', String((args.limit as number) || 100));
    params.set('offset', String((args.offset as number) || 0));
    return this.request('GET', `/groups?${params.toString()}`);
  }

  private async createGroup(args: Record<string, unknown>): Promise<ToolResult> {
    const targetName = args.targetName as string;
    if (!targetName) return { content: [{ type: 'text', text: 'targetName is required' }], isError: true };
    const body: Record<string, unknown> = { targetName };
    if (args.description) body.description = args.description;
    if (args.allowDuplicates !== undefined) body.allowDuplicates = args.allowDuplicates;
    if (args.useDefaultDevices !== undefined) body.useDefaultDevices = args.useDefaultDevices;
    if (args.observers) body.observers = args.observers;
    return this.request('POST', '/groups', body);
  }

  private async updateGroup(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.groupId as string;
    if (!id) return { content: [{ type: 'text', text: 'groupId is required' }], isError: true };
    const body: Record<string, unknown> = { id };
    if (args.description !== undefined) body.description = args.description;
    if (args.status !== undefined) body.status = args.status;
    if (args.allowDuplicates !== undefined) body.allowDuplicates = args.allowDuplicates;
    return this.request('POST', '/groups', body);
  }

  private async getOnCall(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.groupId as string;
    if (!id) return { content: [{ type: 'text', text: 'groupId is required' }], isError: true };
    return this.request('GET', `/on-call?groups=${encodeURIComponent(id)}`);
  }

  private async listShifts(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.groupId as string;
    if (!id) return { content: [{ type: 'text', text: 'groupId is required' }], isError: true };
    return this.request('GET', `/groups/${encodeURIComponent(id)}/shifts`);
  }

  private async getDevice(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.deviceId as string;
    if (!id) return { content: [{ type: 'text', text: 'deviceId is required' }], isError: true };
    return this.request('GET', `/devices/${encodeURIComponent(id)}`);
  }

  private async listDevices(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.personId as string;
    if (!id) return { content: [{ type: 'text', text: 'personId is required' }], isError: true };
    const params = new URLSearchParams({ personId: id });
    if (args.deviceType) params.set('deviceType', args.deviceType as string);
    return this.request('GET', `/devices?${params.toString()}`);
  }

  private async listSubscriptions(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.personId) params.set('personId', args.personId as string);
    params.set('limit', String((args.limit as number) || 100));
    params.set('offset', String((args.offset as number) || 0));
    return this.request('GET', `/subscriptions?${params.toString()}`);
  }

  private async listAuditLogs(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.from) params.set('from', args.from as string);
    if (args.to) params.set('to', args.to as string);
    if (args.auditType) params.set('auditType', args.auditType as string);
    params.set('limit', String((args.limit as number) || 100));
    params.set('offset', String((args.offset as number) || 0));
    return this.request('GET', `/audits?${params.toString()}`);
  }

  private async listSites(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.search) params.set('search', args.search as string);
    params.set('limit', String((args.limit as number) || 100));
    params.set('offset', String((args.offset as number) || 0));
    return this.request('GET', `/sites?${params.toString()}`);
  }
}

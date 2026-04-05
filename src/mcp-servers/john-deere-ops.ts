/**
 * John Deere Operations Center MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// Community repos exist (glama.ai/@CoreyFransen08/john-deere-ops-mcp, github.com/easavin/ag-mcp) but neither
// is published or maintained by John Deere Inc. No official Deere MCP server found on GitHub or npmjs.
// Our adapter covers: 15 tools (organizations, fields, equipment, files, field operations, machine alerts).
// Recommendation: use-rest-api — no official MCP server exists.
//
// Base URL: https://api.deere.com/platform (production) / https://sandboxapi.deere.com/platform (sandbox)
// Auth: OAuth2 authorization code flow (user-delegated); access token passed as Bearer header
//       Token endpoint: https://signin.johndeere.com/oauth2/aus78tnlaysMraFhC1t7/v1/token
//       Scopes: ag1 (read ag data), ag2 (write ag data), eq1 (read equipment/alerts), files (files)
// Docs: https://developer.deere.com/dev-doc-landing
// Rate limits: Not officially published; implement exponential backoff on 429 responses

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface JohnDeereOpsConfig {
  accessToken: string;
  baseUrl?: string;
}

export class JohnDeereOpsMCPServer extends MCPAdapterBase {
  private readonly accessToken: string;
  private readonly baseUrl: string;

  constructor(config: JohnDeereOpsConfig) {
    super();
    this.accessToken = config.accessToken;
    this.baseUrl = config.baseUrl || 'https://api.deere.com';
  }

  static catalog() {
    return {
      name: 'john-deere-ops',
      displayName: 'John Deere Operations Center',
      version: '1.0.0',
      category: 'misc' as const,
      keywords: [
        'john-deere', 'deere', 'agriculture', 'ag', 'farm', 'field', 'crop',
        'equipment', 'machine', 'tractor', 'harvest', 'planting', 'operations-center',
        'precision-ag', 'telematics', 'jdlink', 'boundary', 'organization',
      ],
      toolNames: [
        'list_organizations', 'get_organization',
        'list_fields', 'get_field',
        'list_equipment', 'get_equipment', 'get_equipment_location',
        'list_machine_alerts', 'get_machine_alert',
        'list_field_operations', 'get_field_operation',
        'list_files', 'get_file',
        'list_work_plans', 'get_work_plan',
      ],
      description: 'John Deere Operations Center agriculture platform: organizations, fields, equipment, machine alerts, field operations (harvest/planting/application), work plans, and file management.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_organizations',
        description: 'List John Deere Operations Center organizations accessible to the authenticated user with connection status',
        inputSchema: {
          type: 'object',
          properties: {
            embed: {
              type: 'string',
              description: 'Comma-separated resources to embed in response (e.g. activeCropSeasons)',
            },
          },
        },
      },
      {
        name: 'get_organization',
        description: 'Get details for a specific John Deere Operations Center organization by ID including preferences and active crop seasons',
        inputSchema: {
          type: 'object',
          properties: {
            org_id: {
              type: 'string',
              description: 'Organization ID from list_organizations',
            },
          },
          required: ['org_id'],
        },
      },
      {
        name: 'list_fields',
        description: 'List agricultural fields within a John Deere organization including boundaries and active crop season data',
        inputSchema: {
          type: 'object',
          properties: {
            org_id: {
              type: 'string',
              description: 'Organization ID to list fields for',
            },
            embed: {
              type: 'string',
              description: 'Comma-separated resources to embed (e.g. activeCropSeasons,boundaries)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of fields to return (default: 100)',
            },
            start: {
              type: 'number',
              description: 'Offset for pagination (default: 0)',
            },
          },
          required: ['org_id'],
        },
      },
      {
        name: 'get_field',
        description: 'Get details for a specific agricultural field including boundary geometry, area, and crop season info',
        inputSchema: {
          type: 'object',
          properties: {
            org_id: {
              type: 'string',
              description: 'Organization ID that owns the field',
            },
            field_id: {
              type: 'string',
              description: 'Field ID to retrieve',
            },
            embed: {
              type: 'string',
              description: 'Comma-separated resources to embed (e.g. boundaries,activeCropSeasons)',
            },
          },
          required: ['org_id', 'field_id'],
        },
      },
      {
        name: 'list_equipment',
        description: 'List machines and implements registered in a John Deere Operations Center organization with telematics status',
        inputSchema: {
          type: 'object',
          properties: {
            org_id: {
              type: 'string',
              description: 'Organization ID to list equipment for',
            },
            embed: {
              type: 'string',
              description: 'Comma-separated resources to embed (e.g. currentLocation,engineHours)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of equipment records to return (default: 100)',
            },
            start: {
              type: 'number',
              description: 'Offset for pagination (default: 0)',
            },
          },
          required: ['org_id'],
        },
      },
      {
        name: 'get_equipment',
        description: 'Get detailed information for a specific piece of farm equipment by machine ID including make, model, and engine hours',
        inputSchema: {
          type: 'object',
          properties: {
            org_id: {
              type: 'string',
              description: 'Organization ID that owns the equipment',
            },
            machine_id: {
              type: 'string',
              description: 'Machine ID from list_equipment',
            },
            embed: {
              type: 'string',
              description: 'Comma-separated resources to embed (e.g. currentLocation,engineHours)',
            },
          },
          required: ['org_id', 'machine_id'],
        },
      },
      {
        name: 'get_equipment_location',
        description: 'Get current GPS location and heading for a John Deere connected machine via JDLink telematics',
        inputSchema: {
          type: 'object',
          properties: {
            org_id: {
              type: 'string',
              description: 'Organization ID that owns the equipment',
            },
            machine_id: {
              type: 'string',
              description: 'Machine ID to get location for',
            },
          },
          required: ['org_id', 'machine_id'],
        },
      },
      {
        name: 'list_machine_alerts',
        description: 'List active DTC and geofence alerts for a specific machine including fault codes, engine hours, and alert type',
        inputSchema: {
          type: 'object',
          properties: {
            machine_id: {
              type: 'string',
              description: 'Machine principal ID to retrieve alerts for (from list_equipment)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of alerts to return (default: 50)',
            },
            start: {
              type: 'number',
              description: 'Offset for pagination (default: 0)',
            },
          },
          required: ['machine_id'],
        },
      },
      {
        name: 'get_machine_alert',
        description: 'Get details for a specific machine alert including fault code description, suspect parameter name, and failure mode indicator',
        inputSchema: {
          type: 'object',
          properties: {
            machine_id: {
              type: 'string',
              description: 'Machine principal ID that owns the alert',
            },
            alert_id: {
              type: 'string',
              description: 'Alert ID from list_machine_alerts',
            },
          },
          required: ['machine_id', 'alert_id'],
        },
      },
      {
        name: 'list_field_operations',
        description: 'List field operations (seeding, application, harvest, tillage) for a specific field with optional date range filters',
        inputSchema: {
          type: 'object',
          properties: {
            org_id: {
              type: 'string',
              description: 'Organization ID that owns the field',
            },
            field_id: {
              type: 'string',
              description: 'Field ID to retrieve operations for (from list_fields)',
            },
            operation_type: {
              type: 'string',
              description: 'Filter by type: harvest, seeding, application, tillage (default: all)',
            },
            start_date: {
              type: 'string',
              description: 'Start date filter in ISO 8601 format (e.g. 2025-04-01)',
            },
            end_date: {
              type: 'string',
              description: 'End date filter in ISO 8601 format (e.g. 2025-11-30)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of operations to return (default: 50)',
            },
          },
          required: ['org_id', 'field_id'],
        },
      },
      {
        name: 'get_field_operation',
        description: 'Get details for a specific field operation including crop, area worked, applied rate, machines used, and associated field boundaries',
        inputSchema: {
          type: 'object',
          properties: {
            org_id: {
              type: 'string',
              description: 'Organization ID that owns the field operation',
            },
            field_id: {
              type: 'string',
              description: 'Field ID that owns the field operation',
            },
            operation_id: {
              type: 'string',
              description: 'Field operation ID from list_field_operations',
            },
          },
          required: ['org_id', 'field_id', 'operation_id'],
        },
      },
      {
        name: 'list_files',
        description: 'List files (prescription maps, as-applied data, shapefiles) in the John Deere Operations Center for an organization',
        inputSchema: {
          type: 'object',
          properties: {
            org_id: {
              type: 'string',
              description: 'Organization ID to list files for',
            },
            type: {
              type: 'string',
              description: 'Filter by file type: prescription, as-applied, imagery (default: all)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of files to return (default: 50)',
            },
            start: {
              type: 'number',
              description: 'Offset for pagination (default: 0)',
            },
          },
          required: ['org_id'],
        },
      },
      {
        name: 'get_file',
        description: 'Get metadata and download URL for a specific file in the John Deere Operations Center',
        inputSchema: {
          type: 'object',
          properties: {
            org_id: {
              type: 'string',
              description: 'Organization ID that owns the file',
            },
            file_id: {
              type: 'string',
              description: 'File ID from list_files',
            },
          },
          required: ['org_id', 'file_id'],
        },
      },
      {
        name: 'list_work_plans',
        description: 'List work plans assigned to operators and equipment in a John Deere Operations Center organization',
        inputSchema: {
          type: 'object',
          properties: {
            org_id: {
              type: 'string',
              description: 'Organization ID to retrieve work plans for',
            },
            status: {
              type: 'string',
              description: 'Filter by status: active, completed, pending (default: all)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of work plans to return (default: 50)',
            },
          },
          required: ['org_id'],
        },
      },
      {
        name: 'get_work_plan',
        description: 'Get details for a specific work plan including assigned operator, equipment, fields, and crop application instructions',
        inputSchema: {
          type: 'object',
          properties: {
            org_id: {
              type: 'string',
              description: 'Organization ID that owns the work plan',
            },
            plan_id: {
              type: 'string',
              description: 'Work plan ID from list_work_plans',
            },
          },
          required: ['org_id', 'plan_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_organizations':
          return this.listOrganizations(args);
        case 'get_organization':
          return this.getOrganization(args);
        case 'list_fields':
          return this.listFields(args);
        case 'get_field':
          return this.getField(args);
        case 'list_equipment':
          return this.listEquipment(args);
        case 'get_equipment':
          return this.getEquipment(args);
        case 'get_equipment_location':
          return this.getEquipmentLocation(args);
        case 'list_machine_alerts':
          return this.listMachineAlerts(args);
        case 'get_machine_alert':
          return this.getMachineAlert(args);
        case 'list_field_operations':
          return this.listFieldOperations(args);
        case 'get_field_operation':
          return this.getFieldOperation(args);
        case 'list_files':
          return this.listFiles(args);
        case 'get_file':
          return this.getFile(args);
        case 'list_work_plans':
          return this.listWorkPlans(args);
        case 'get_work_plan':
          return this.getWorkPlan(args);
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
      Accept: 'application/vnd.deere.axiom.v3+json',
      'Content-Type': 'application/json',
    };
  }

  private async apiGet(path: string, params: Record<string, string> = {}): Promise<ToolResult> {
    const qs = new URLSearchParams(params).toString();
    const url = `${this.baseUrl}${path}${qs ? '?' + qs : ''}`;
    const response = await this.fetchWithRetry(url, { method: 'GET', headers: this.headers });
    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listOrganizations(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (args.embed) params.embed = args.embed as string;
    return this.apiGet('/platform/organizations', params);
  }

  private async getOrganization(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.org_id) return { content: [{ type: 'text', text: 'org_id is required' }], isError: true };
    return this.apiGet(`/platform/organizations/${encodeURIComponent(args.org_id as string)}`);
  }

  private async listFields(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.org_id) return { content: [{ type: 'text', text: 'org_id is required' }], isError: true };
    const params: Record<string, string> = {
      limit: String((args.limit as number) ?? 100),
      start: String((args.start as number) ?? 0),
    };
    if (args.embed) params.embed = args.embed as string;
    return this.apiGet(`/platform/organizations/${encodeURIComponent(args.org_id as string)}/fields`, params);
  }

  private async getField(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.org_id || !args.field_id) return { content: [{ type: 'text', text: 'org_id and field_id are required' }], isError: true };
    const params: Record<string, string> = {};
    if (args.embed) params.embed = args.embed as string;
    return this.apiGet(`/platform/organizations/${encodeURIComponent(args.org_id as string)}/fields/${encodeURIComponent(args.field_id as string)}`, params);
  }

  private async listEquipment(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.org_id) return { content: [{ type: 'text', text: 'org_id is required' }], isError: true };
    const params: Record<string, string> = {
      limit: String((args.limit as number) ?? 100),
      start: String((args.start as number) ?? 0),
    };
    if (args.embed) params.embed = args.embed as string;
    return this.apiGet(`/platform/organizations/${encodeURIComponent(args.org_id as string)}/machines`, params);
  }

  private async getEquipment(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.org_id || !args.machine_id) return { content: [{ type: 'text', text: 'org_id and machine_id are required' }], isError: true };
    const params: Record<string, string> = {};
    if (args.embed) params.embed = args.embed as string;
    return this.apiGet(`/platform/organizations/${encodeURIComponent(args.org_id as string)}/machines/${encodeURIComponent(args.machine_id as string)}`, params);
  }

  private async getEquipmentLocation(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.org_id || !args.machine_id) return { content: [{ type: 'text', text: 'org_id and machine_id are required' }], isError: true };
    return this.apiGet(`/platform/organizations/${encodeURIComponent(args.org_id as string)}/machines/${encodeURIComponent(args.machine_id as string)}/locations/current`);
  }

  private async listMachineAlerts(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.machine_id) return { content: [{ type: 'text', text: 'machine_id is required' }], isError: true };
    const params: Record<string, string> = {
      limit: String((args.limit as number) ?? 50),
      start: String((args.start as number) ?? 0),
    };
    return this.apiGet(`/platform/machines/${encodeURIComponent(args.machine_id as string)}/alerts`, params);
  }

  private async getMachineAlert(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.machine_id || !args.alert_id) return { content: [{ type: 'text', text: 'machine_id and alert_id are required' }], isError: true };
    return this.apiGet(`/platform/machines/${encodeURIComponent(args.machine_id as string)}/alerts/${encodeURIComponent(args.alert_id as string)}`);
  }

  private async listFieldOperations(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.org_id || !args.field_id) return { content: [{ type: 'text', text: 'org_id and field_id are required' }], isError: true };
    const params: Record<string, string> = {
      limit: String((args.limit as number) ?? 50),
    };
    if (args.operation_type) params.operationType = args.operation_type as string;
    if (args.start_date) params.startDate = args.start_date as string;
    if (args.end_date) params.endDate = args.end_date as string;
    return this.apiGet(`/platform/organizations/${encodeURIComponent(args.org_id as string)}/fields/${encodeURIComponent(args.field_id as string)}/fieldOperations`, params);
  }

  private async getFieldOperation(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.org_id || !args.field_id || !args.operation_id) return { content: [{ type: 'text', text: 'org_id, field_id, and operation_id are required' }], isError: true };
    return this.apiGet(`/platform/organizations/${encodeURIComponent(args.org_id as string)}/fields/${encodeURIComponent(args.field_id as string)}/fieldOperations/${encodeURIComponent(args.operation_id as string)}`);
  }

  private async listFiles(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.org_id) return { content: [{ type: 'text', text: 'org_id is required' }], isError: true };
    const params: Record<string, string> = {
      limit: String((args.limit as number) ?? 50),
      start: String((args.start as number) ?? 0),
    };
    if (args.type) params.type = args.type as string;
    return this.apiGet(`/platform/organizations/${encodeURIComponent(args.org_id as string)}/files`, params);
  }

  private async getFile(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.org_id || !args.file_id) return { content: [{ type: 'text', text: 'org_id and file_id are required' }], isError: true };
    return this.apiGet(`/platform/organizations/${encodeURIComponent(args.org_id as string)}/files/${encodeURIComponent(args.file_id as string)}`);
  }

  private async listWorkPlans(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.org_id) return { content: [{ type: 'text', text: 'org_id is required' }], isError: true };
    const params: Record<string, string> = {
      limit: String((args.limit as number) ?? 50),
    };
    if (args.status) params.status = args.status as string;
    return this.apiGet(`/platform/organizations/${encodeURIComponent(args.org_id as string)}/workPlans`, params);
  }

  private async getWorkPlan(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.org_id || !args.plan_id) return { content: [{ type: 'text', text: 'org_id and plan_id are required' }], isError: true };
    return this.apiGet(`/platform/organizations/${encodeURIComponent(args.org_id as string)}/workPlans/${encodeURIComponent(args.plan_id as string)}`);
  }
}

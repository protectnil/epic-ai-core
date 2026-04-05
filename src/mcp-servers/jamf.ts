/**
 * Jamf Pro MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// Jamf hosts a remote MCP server at https://mcp.jamf.com for API documentation lookup only
// (not a device management MCP — it exposes API spec documentation, not operational tools).
// Community MCP: https://github.com/dbankscard/jamf-mcp-server — transport: stdio, auth: Bearer token
//   108 tools, last commit Feb 2026, maintained. NOT published by Jamf — community project.
//   Fails criterion 1 (not official). Decision: use-rest-api.
// Our adapter covers: 13 tools (Jamf Pro API endpoints verified). Vendor MCP covers: 108 tools (community).
// Recommendation: use-rest-api — no official Jamf MCP server exists for device management.
//   Community MCP (dbankscard/jamf-mcp-server) documented above for reference only.
//
// IMPORTANT — Mixed API surface: Jamf has two APIs:
//   Jamf Pro API (modern, JSON, /api/v1/...): computers-inventory, scripts, categories,
//     mobile-devices, computer-groups, users, inventory-information, oauth/token
//   Classic API (legacy, XML/JSON, /JSSResource/...): policies, osxconfigurationprofiles
//   This adapter uses Jamf Pro API for all supported endpoints.
//   Policies and macOS configuration profiles are only in the Classic API and are NOT
//   implemented in this adapter (no verified Jamf Pro API equivalent exists as of 2026-03-28).
//   trigger_policy does not exist in either API (Jamf Nation confirmed policies cannot be
//   triggered remotely via API — the Jamf binary on the managed device initiates policy runs).
//
// Base URL: https://{instance}.jamfcloud.com (cloud) or https://{on-prem-host}:8443 (on-prem)
// Auth: OAuth2 client credentials flow via /api/oauth/token (Jamf Pro 10.49+)
// Docs: https://developer.jamf.com/jamf-pro/docs/jamf-pro-api-overview
// Rate limits: Not officially published; community guidance is max 5 concurrent requests to avoid 429s

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface JamfConfig {
  clientId: string;
  clientSecret: string;
  baseUrl: string;
}

export class JamfMCPServer extends MCPAdapterBase {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly baseUrl: string;
  private bearerToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(config: JamfConfig) {
    super();
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    // baseUrl is required for Jamf — no default because every instance is unique
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
  }

  static catalog() {
    return {
      name: 'jamf',
      displayName: 'Jamf Pro',
      version: '1.0.0',
      category: 'misc' as const,
      keywords: [
        'jamf', 'mdm', 'apple', 'mac', 'macos', 'ios', 'ipad', 'device-management',
        'computer', 'mobile-device', 'inventory', 'compliance',
        'script', 'smart-group', 'category', 'user',
      ],
      toolNames: [
        'list_computers', 'get_computer', 'search_computers',
        'list_mobile_devices', 'get_mobile_device',
        'list_scripts', 'get_script',
        'list_groups', 'get_group',
        'get_inventory_summary', 'list_categories',
        'list_users', 'get_user',
      ],
      description: 'Jamf Pro Apple device management: computers, mobile devices, scripts, computer groups, categories, users, and inventory (Jamf Pro API endpoints only).',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_computers',
        description: 'List managed Mac computers from Jamf Pro inventory with optional filters for OS version, model, or management status',
        inputSchema: {
          type: 'object',
          properties: {
            section: {
              type: 'string',
              description: 'Inventory sections to include: GENERAL, HARDWARE, OS, USER_AND_LOCATION, STORAGE, APPLICATIONS (default: GENERAL)',
            },
            filter: {
              type: 'string',
              description: 'RSQL filter expression (e.g. general.managementId!="" to get managed only)',
            },
            sort: {
              type: 'string',
              description: 'Sort field and direction (e.g. general.name:asc)',
            },
            page: {
              type: 'number',
              description: 'Page number (0-indexed, default: 0)',
            },
            page_size: {
              type: 'number',
              description: 'Results per page (default: 100, max: 2000)',
            },
          },
        },
      },
      {
        name: 'get_computer',
        description: 'Get full inventory record for a specific Mac computer by its Jamf ID including hardware, OS, and installed apps',
        inputSchema: {
          type: 'object',
          properties: {
            computer_id: {
              type: 'string',
              description: 'Jamf computer ID (numeric string)',
            },
            section: {
              type: 'string',
              description: 'Comma-separated sections: GENERAL, HARDWARE, OS, USER_AND_LOCATION, STORAGE, APPLICATIONS, CERTIFICATES (default: all)',
            },
          },
          required: ['computer_id'],
        },
      },
      {
        name: 'search_computers',
        description: 'Search Mac computers by name, serial number, username, or MAC address using a RSQL filter query',
        inputSchema: {
          type: 'object',
          properties: {
            filter: {
              type: 'string',
              description: 'RSQL filter (e.g. general.name=="MacBook*" or hardware.serialNumber=="C02X*")',
            },
            page_size: {
              type: 'number',
              description: 'Maximum results to return (default: 50)',
            },
          },
          required: ['filter'],
        },
      },
      {
        name: 'list_mobile_devices',
        description: 'List managed iOS, iPadOS, and tvOS devices from Jamf Pro with optional filters',
        inputSchema: {
          type: 'object',
          properties: {
            filter: {
              type: 'string',
              description: 'RSQL filter expression to narrow results',
            },
            sort: {
              type: 'string',
              description: 'Sort field and direction (e.g. displayName:asc)',
            },
            page: {
              type: 'number',
              description: 'Page number (0-indexed, default: 0)',
            },
            page_size: {
              type: 'number',
              description: 'Results per page (default: 100, max: 2000)',
            },
          },
        },
      },
      {
        name: 'get_mobile_device',
        description: 'Get full inventory record for a specific iOS/iPadOS device by Jamf mobile device ID',
        inputSchema: {
          type: 'object',
          properties: {
            device_id: {
              type: 'string',
              description: 'Jamf mobile device ID (numeric string)',
            },
          },
          required: ['device_id'],
        },
      },
      {
        name: 'list_scripts',
        description: 'List all scripts stored in Jamf Pro with their names, categories, and script language',
        inputSchema: {
          type: 'object',
          properties: {
            filter: {
              type: 'string',
              description: 'RSQL filter expression (e.g. name=="*Deploy*")',
            },
            sort: {
              type: 'string',
              description: 'Sort field and direction (e.g. name:asc)',
            },
            page: {
              type: 'number',
              description: 'Page number (0-indexed, default: 0)',
            },
            page_size: {
              type: 'number',
              description: 'Results per page (default: 100)',
            },
          },
        },
      },
      {
        name: 'get_script',
        description: 'Get the full script content and metadata for a specific Jamf Pro script by ID',
        inputSchema: {
          type: 'object',
          properties: {
            script_id: {
              type: 'string',
              description: 'Jamf script ID (numeric string)',
            },
          },
          required: ['script_id'],
        },
      },
      {
        name: 'list_groups',
        description: 'List all smart groups and static groups for computers and mobile devices in Jamf Pro',
        inputSchema: {
          type: 'object',
          properties: {
            filter: {
              type: 'string',
              description: 'RSQL filter expression (e.g. groupType==SMART_GROUP)',
            },
            sort: {
              type: 'string',
              description: 'Sort field: name, groupType, isSmart (e.g. name:asc)',
            },
            page: {
              type: 'number',
              description: 'Page number (0-indexed, default: 0)',
            },
            page_size: {
              type: 'number',
              description: 'Results per page (default: 100)',
            },
          },
        },
      },
      {
        name: 'get_group',
        description: 'Get membership and criteria details for a specific Jamf Pro device group by ID',
        inputSchema: {
          type: 'object',
          properties: {
            group_id: {
              type: 'string',
              description: 'Jamf group ID (numeric string)',
            },
          },
          required: ['group_id'],
        },
      },
      {
        name: 'get_inventory_summary',
        description: 'Get statistics summary of managed and unmanaged computers and mobile devices in Jamf Pro inventory',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'list_categories',
        description: 'List all categories defined in Jamf Pro used to organize policies, scripts, and packages',
        inputSchema: {
          type: 'object',
          properties: {
            filter: {
              type: 'string',
              description: 'RSQL filter expression (e.g. name=="Security*")',
            },
            sort: {
              type: 'string',
              description: 'Sort field and direction (e.g. name:asc)',
            },
            page: {
              type: 'number',
              description: 'Page number (0-indexed, default: 0)',
            },
            page_size: {
              type: 'number',
              description: 'Results per page (default: 100)',
            },
          },
        },
      },
      {
        name: 'list_users',
        description: 'List local user accounts known to Jamf Pro with their associated devices and directory status',
        inputSchema: {
          type: 'object',
          properties: {
            filter: {
              type: 'string',
              description: 'RSQL filter expression (e.g. username=="jsmith")',
            },
            page: {
              type: 'number',
              description: 'Page number (0-indexed, default: 0)',
            },
            page_size: {
              type: 'number',
              description: 'Results per page (default: 100)',
            },
          },
        },
      },
      {
        name: 'get_user',
        description: 'Get account details and assigned devices for a specific Jamf Pro user by user ID',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: {
              type: 'string',
              description: 'Jamf user ID (numeric string)',
            },
          },
          required: ['user_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_computers':
          return this.listComputers(args);
        case 'get_computer':
          return this.getComputer(args);
        case 'search_computers':
          return this.searchComputers(args);
        case 'list_mobile_devices':
          return this.listMobileDevices(args);
        case 'get_mobile_device':
          return this.getMobileDevice(args);
        case 'list_scripts':
          return this.listScripts(args);
        case 'get_script':
          return this.getScript(args);
        case 'list_groups':
          return this.listGroups(args);
        case 'get_group':
          return this.getGroup(args);
        case 'get_inventory_summary':
          return this.getInventorySummary();
        case 'list_categories':
          return this.listCategories(args);
        case 'list_users':
          return this.listUsers(args);
        case 'get_user':
          return this.getUser(args);
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

    const response = await this.fetchWithRetry(`${this.baseUrl}/api/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
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

  private async authHeaders(): Promise<Record<string, string>> {
    const token = await this.getOrRefreshToken();
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  private async apiGet(path: string, params: Record<string, string> = {}): Promise<ToolResult> {
    const headers = await this.authHeaders();
    const qs = new URLSearchParams(params).toString();
    const url = `${this.baseUrl}${path}${qs ? '?' + qs : ''}`;
    const response = await this.fetchWithRetry(url, { method: 'GET', headers });
    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listComputers(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      'page-size': String((args.page_size as number) ?? 100),
      page: String((args.page as number) ?? 0),
    };
    if (args.section) params.section = args.section as string;
    if (args.filter) params.filter = args.filter as string;
    if (args.sort) params.sort = args.sort as string;
    return this.apiGet('/api/v1/computers-inventory', params);
  }

  private async getComputer(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.computer_id) return { content: [{ type: 'text', text: 'computer_id is required' }], isError: true };
    const params: Record<string, string> = {};
    if (args.section) params.section = args.section as string;
    return this.apiGet(`/api/v1/computers-inventory-detail/${encodeURIComponent(args.computer_id as string)}`, params);
  }

  private async searchComputers(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.filter) return { content: [{ type: 'text', text: 'filter is required' }], isError: true };
    const params: Record<string, string> = {
      filter: args.filter as string,
      'page-size': String((args.page_size as number) ?? 50),
      page: '0',
    };
    return this.apiGet('/api/v1/computers-inventory', params);
  }

  private async listMobileDevices(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      'page-size': String((args.page_size as number) ?? 100),
      page: String((args.page as number) ?? 0),
    };
    if (args.filter) params.filter = args.filter as string;
    if (args.sort) params.sort = args.sort as string;
    return this.apiGet('/api/v2/mobile-devices', params);
  }

  private async getMobileDevice(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.device_id) return { content: [{ type: 'text', text: 'device_id is required' }], isError: true };
    return this.apiGet(`/api/v2/mobile-devices/${encodeURIComponent(args.device_id as string)}/detail`);
  }

  private async listScripts(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      'page-size': String((args.page_size as number) ?? 100),
      page: String((args.page as number) ?? 0),
    };
    if (args.filter) params.filter = args.filter as string;
    if (args.sort) params.sort = args.sort as string;
    return this.apiGet('/api/v1/scripts', params);
  }

  private async getScript(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.script_id) return { content: [{ type: 'text', text: 'script_id is required' }], isError: true };
    return this.apiGet(`/api/v1/scripts/${encodeURIComponent(args.script_id as string)}`);
  }

  private async listGroups(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      'page-size': String((args.page_size as number) ?? 100),
      page: String((args.page as number) ?? 0),
    };
    if (args.filter) params.filter = args.filter as string;
    if (args.sort) params.sort = args.sort as string;
    return this.apiGet('/api/v1/computer-groups', params);
  }

  private async getGroup(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.group_id) return { content: [{ type: 'text', text: 'group_id is required' }], isError: true };
    return this.apiGet(`/api/v1/computer-groups/${encodeURIComponent(args.group_id as string)}`);
  }

  private async getInventorySummary(): Promise<ToolResult> {
    return this.apiGet('/api/v1/inventory-information');
  }

  private async listCategories(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      'page-size': String((args.page_size as number) ?? 100),
      page: String((args.page as number) ?? 0),
    };
    if (args.filter) params.filter = args.filter as string;
    if (args.sort) params.sort = args.sort as string;
    return this.apiGet('/api/v1/categories', params);
  }

  private async listUsers(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      'page-size': String((args.page_size as number) ?? 100),
      page: String((args.page as number) ?? 0),
    };
    if (args.filter) params.filter = args.filter as string;
    return this.apiGet('/api/v1/users', params);
  }

  private async getUser(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.user_id) return { content: [{ type: 'text', text: 'user_id is required' }], isError: true };
    return this.apiGet(`/api/v1/users/${encodeURIComponent(args.user_id as string)}`);
  }
}

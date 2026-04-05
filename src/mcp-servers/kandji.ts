/**
 * Kandji MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28 — no official Kandji/Iru MCP server exists.
// A community MCP server exists at https://github.com/mangopudding/mcp-server-iru-api (23 tools,
// last commit October 2025) but is NOT published by Kandji/Iru — it is a community project.
// It does not meet criterion 1 (vendor-published). Decision: use-rest-api.
// Our adapter covers: 14 tools. Community MCP covers: ~23 tools (not official).
// Recommendation: REST adapter is the authoritative integration. Community MCP documents additional
// operations (device actions, compliance summary, licensing, tags, audit events, lost mode,
// device parameters, device status, behavioral detections, vulnerability detections,
// affected devices/software) not yet in this adapter.
//
// Note: Kandji has rebranded to Iru as of 2026. API documentation continues
// to be available at api-docs.kandji.io. Existing API tokens and URLs remain valid.
//
// Base URL: https://{subdomain}.api.kandji.io (US) or https://{subdomain}.api.eu.kandji.io (EU)
//   Find your subdomain in Kandji/Iru Settings > Access
//   The baseUrl must include your full tenant-specific subdomain (e.g. https://acme.api.kandji.io)
// Auth: Bearer token (tenant-level API token generated in Settings > Access > Add API Token)
// Docs: https://api-docs.kandji.io
// Rate limits: 10,000 requests per hour per customer

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface KandjiConfig {
  apiToken: string;
  baseUrl: string;
}

export class KandjiMCPServer extends MCPAdapterBase {
  private readonly apiToken: string;
  private readonly baseUrl: string;

  constructor(config: KandjiConfig) {
    super();
    this.apiToken = config.apiToken;
    // baseUrl is required for Kandji — every tenant has a unique subdomain
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
  }

  static catalog() {
    return {
      name: 'kandji',
      displayName: 'Kandji',
      version: '1.0.0',
      category: 'misc' as const,
      keywords: [
        'kandji', 'iru', 'mdm', 'apple', 'mac', 'macos', 'ios', 'ipad', 'tvos',
        'device-management', 'blueprint', 'library', 'compliance', 'threat',
        'vulnerability', 'patch', 'activation-lock', 'endpoint',
      ],
      toolNames: [
        'list_devices', 'get_device', 'get_device_details', 'get_device_apps',
        'search_devices',
        'list_blueprints', 'get_blueprint',
        'list_library_items', 'get_library_item',
        'list_threats', 'get_threat_details',
        'list_vulnerabilities',
        'list_users', 'get_user',
      ],
      description: 'Kandji (Iru) Apple MDM: devices, blueprints, library items, threat detection, vulnerability management, and compliance status for Mac, iPhone, iPad, and Apple TV.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_devices',
        description: 'List all managed Apple devices enrolled in Kandji with optional filters for platform, blueprint, and management status',
        inputSchema: {
          type: 'object',
          properties: {
            platform: {
              type: 'string',
              description: 'Filter by platform: Mac, iPhone, iPad, AppleTV, iPod (default: all)',
            },
            blueprint_id: {
              type: 'string',
              description: 'Filter devices assigned to a specific blueprint UUID',
            },
            mdm_enabled: {
              type: 'boolean',
              description: 'Filter by MDM enrollment status: true (enrolled), false (not enrolled)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of devices to return (default: 300)',
            },
            offset: {
              type: 'number',
              description: 'Offset for pagination (default: 0)',
            },
          },
        },
      },
      {
        name: 'get_device',
        description: 'Get basic information for a specific Kandji-managed device by device ID including serial number, OS version, and blueprint',
        inputSchema: {
          type: 'object',
          properties: {
            device_id: {
              type: 'string',
              description: 'Device UUID from list_devices',
            },
          },
          required: ['device_id'],
        },
      },
      {
        name: 'get_device_details',
        description: 'Get full hardware, OS, and MDM details for a Kandji device including storage, RAM, battery, and compliance status',
        inputSchema: {
          type: 'object',
          properties: {
            device_id: {
              type: 'string',
              description: 'Device UUID to get details for',
            },
          },
          required: ['device_id'],
        },
      },
      {
        name: 'get_device_apps',
        description: 'Get the list of installed applications on a specific Kandji-managed device with version and bundle ID',
        inputSchema: {
          type: 'object',
          properties: {
            device_id: {
              type: 'string',
              description: 'Device UUID to retrieve installed applications for',
            },
          },
          required: ['device_id'],
        },
      },
      {
        name: 'search_devices',
        description: 'Search Kandji devices by serial number, name, username, or asset tag with optional platform filter',
        inputSchema: {
          type: 'object',
          properties: {
            serial_number: {
              type: 'string',
              description: 'Device serial number (partial match supported)',
            },
            device_name: {
              type: 'string',
              description: 'Device name (partial match supported)',
            },
            user_email: {
              type: 'string',
              description: 'Assigned user email address',
            },
            asset_tag: {
              type: 'string',
              description: 'Asset tag assigned to the device',
            },
            platform: {
              type: 'string',
              description: 'Filter by platform: Mac, iPhone, iPad, AppleTV (default: all)',
            },
          },
        },
      },
      {
        name: 'list_blueprints',
        description: 'List all Kandji blueprints that define device configuration, policies, and library items for enrolled devices',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of blueprints to return (default: 100)',
            },
            offset: {
              type: 'number',
              description: 'Offset for pagination (default: 0)',
            },
          },
        },
      },
      {
        name: 'get_blueprint',
        description: 'Get details for a specific Kandji blueprint including assigned library items, enrollment settings, and device count',
        inputSchema: {
          type: 'object',
          properties: {
            blueprint_id: {
              type: 'string',
              description: 'Blueprint UUID from list_blueprints',
            },
          },
          required: ['blueprint_id'],
        },
      },
      {
        name: 'list_library_items',
        description: 'List Kandji library items (apps, profiles, scripts, OS updates) available across all blueprints',
        inputSchema: {
          type: 'object',
          properties: {
            item_type: {
              type: 'string',
              description: 'Filter by type: profile, app, script, automatic-app, os-update (default: all)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of library items to return (default: 100)',
            },
            offset: {
              type: 'number',
              description: 'Offset for pagination (default: 0)',
            },
          },
        },
      },
      {
        name: 'get_library_item',
        description: 'Get configuration details and deployment status for a specific Kandji library item by ID',
        inputSchema: {
          type: 'object',
          properties: {
            library_item_id: {
              type: 'string',
              description: 'Library item UUID from list_library_items',
            },
            item_type: {
              type: 'string',
              description: 'Item type to construct the correct path: profile, app, script, automatic-app, os-update (required)',
            },
          },
          required: ['library_item_id', 'item_type'],
        },
      },
      {
        name: 'list_threats',
        description: 'List detected security threats and malware across Kandji-managed devices with severity and status filters',
        inputSchema: {
          type: 'object',
          properties: {
            classification: {
              type: 'string',
              description: 'Filter by threat classification: malware, pup, adware (default: all)',
            },
            status: {
              type: 'string',
              description: 'Filter by status: quarantined, blocked, not_quarantined (default: all)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of threats to return (default: 50)',
            },
            offset: {
              type: 'number',
              description: 'Offset for pagination (default: 0)',
            },
          },
        },
      },
      {
        name: 'get_threat_details',
        description: 'Get detailed information about a specific threat detection on a Kandji device including file path and remediation steps',
        inputSchema: {
          type: 'object',
          properties: {
            threat_id: {
              type: 'string',
              description: 'Threat detection UUID from list_threats',
            },
          },
          required: ['threat_id'],
        },
      },
      {
        name: 'list_vulnerabilities',
        description: 'List known software vulnerabilities detected on Kandji-managed devices with CVE identifiers and affected application counts',
        inputSchema: {
          type: 'object',
          properties: {
            severity: {
              type: 'string',
              description: 'Filter by CVSS severity: critical, high, medium, low (default: all)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of vulnerabilities to return (default: 50)',
            },
            offset: {
              type: 'number',
              description: 'Offset for pagination (default: 0)',
            },
          },
        },
      },
      {
        name: 'list_users',
        description: 'List users associated with Kandji-managed devices including directory service status and assigned device count',
        inputSchema: {
          type: 'object',
          properties: {
            email: {
              type: 'string',
              description: 'Filter by user email address (partial match supported)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of users to return (default: 100)',
            },
            offset: {
              type: 'number',
              description: 'Offset for pagination (default: 0)',
            },
          },
        },
      },
      {
        name: 'get_user',
        description: 'Get profile and assigned devices for a specific Kandji user by user ID',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: {
              type: 'string',
              description: 'User UUID from list_users',
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
        case 'list_devices':
          return this.listDevices(args);
        case 'get_device':
          return this.getDevice(args);
        case 'get_device_details':
          return this.getDeviceDetails(args);
        case 'get_device_apps':
          return this.getDeviceApps(args);
        case 'search_devices':
          return this.searchDevices(args);
        case 'list_blueprints':
          return this.listBlueprints(args);
        case 'get_blueprint':
          return this.getBlueprint(args);
        case 'list_library_items':
          return this.listLibraryItems(args);
        case 'get_library_item':
          return this.getLibraryItem(args);
        case 'list_threats':
          return this.listThreats(args);
        case 'get_threat_details':
          return this.getThreatDetails(args);
        case 'list_vulnerabilities':
          return this.listVulnerabilities(args);
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

  private get headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.apiToken}`,
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

  private async listDevices(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      limit: String((args.limit as number) ?? 300),
      offset: String((args.offset as number) ?? 0),
    };
    if (args.platform) params.platform = args.platform as string;
    if (args.blueprint_id) params.blueprint_id = args.blueprint_id as string;
    if (typeof args.mdm_enabled === 'boolean') params.mdm_enabled = String(args.mdm_enabled);
    return this.apiGet('/api/v1/devices', params);
  }

  private async getDevice(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.device_id) return { content: [{ type: 'text', text: 'device_id is required' }], isError: true };
    return this.apiGet(`/api/v1/devices/${encodeURIComponent(args.device_id as string)}`);
  }

  private async getDeviceDetails(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.device_id) return { content: [{ type: 'text', text: 'device_id is required' }], isError: true };
    return this.apiGet(`/api/v1/devices/${encodeURIComponent(args.device_id as string)}/details`);
  }

  private async getDeviceApps(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.device_id) return { content: [{ type: 'text', text: 'device_id is required' }], isError: true };
    return this.apiGet(`/api/v1/devices/${encodeURIComponent(args.device_id as string)}/apps`);
  }

  private async searchDevices(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (args.serial_number) params.serial_number = args.serial_number as string;
    if (args.device_name) params.device_name = args.device_name as string;
    if (args.user_email) params.user_email = args.user_email as string;
    if (args.asset_tag) params.asset_tag = args.asset_tag as string;
    if (args.platform) params.platform = args.platform as string;
    return this.apiGet('/api/v1/devices', params);
  }

  private async listBlueprints(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      limit: String((args.limit as number) ?? 100),
      offset: String((args.offset as number) ?? 0),
    };
    return this.apiGet('/api/v1/blueprints', params);
  }

  private async getBlueprint(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.blueprint_id) return { content: [{ type: 'text', text: 'blueprint_id is required' }], isError: true };
    return this.apiGet(`/api/v1/blueprints/${encodeURIComponent(args.blueprint_id as string)}`);
  }

  private async listLibraryItems(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      limit: String((args.limit as number) ?? 100),
      offset: String((args.offset as number) ?? 0),
    };
    if (args.item_type) params.item_type = args.item_type as string;
    return this.apiGet('/api/v1/library/library-items', params);
  }

  private async getLibraryItem(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.library_item_id || !args.item_type) {
      return { content: [{ type: 'text', text: 'library_item_id and item_type are required' }], isError: true };
    }
    const typeMap: Record<string, string> = {
      profile: 'custom-profiles',
      app: 'custom-apps',
      script: 'custom-scripts',
      'automatic-app': 'auto-apps',
      'os-update': 'os-updates',
    };
    const itemTypePath = typeMap[args.item_type as string] ?? (args.item_type as string);
    return this.apiGet(`/api/v1/library/${itemTypePath}/${encodeURIComponent(args.library_item_id as string)}`);
  }

  private async listThreats(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      limit: String((args.limit as number) ?? 50),
      offset: String((args.offset as number) ?? 0),
    };
    if (args.classification) params.classification = args.classification as string;
    if (args.status) params.status = args.status as string;
    return this.apiGet('/api/v1/threat-details', params);
  }

  private async getThreatDetails(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.threat_id) return { content: [{ type: 'text', text: 'threat_id is required' }], isError: true };
    return this.apiGet(`/api/v1/threat-details/${encodeURIComponent(args.threat_id as string)}`);
  }

  private async listVulnerabilities(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      limit: String((args.limit as number) ?? 50),
      offset: String((args.offset as number) ?? 0),
    };
    if (args.severity) params.severity = args.severity as string;
    return this.apiGet('/api/v1/vulnerability-management/vulnerabilities', params);
  }

  private async listUsers(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      limit: String((args.limit as number) ?? 100),
      offset: String((args.offset as number) ?? 0),
    };
    if (args.email) params.email = args.email as string;
    return this.apiGet('/api/v1/users', params);
  }

  private async getUser(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.user_id) return { content: [{ type: 'text', text: 'user_id is required' }], isError: true };
    return this.apiGet(`/api/v1/users/${encodeURIComponent(args.user_id as string)}`);
  }
}

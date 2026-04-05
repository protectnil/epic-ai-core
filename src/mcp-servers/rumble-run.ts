/**
 * Rumble Run (runZero) MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// No official Rumble/runZero MCP server was found on GitHub as of 2026-03-28.
// Our adapter covers: 12 tools. Vendor MCP covers: 0 tools (none exists).
// Recommendation: use-rest-api — no official MCP server exists.
//
// Base URL: https://console.rumble.run/api/v1.0
// Auth: Authorization: Bearer {api_key}
//   API key generated from Rumble console: Account > API Keys
//   Verified from: https://api.apis.guru/v2/specs/rumble.run/2.15.0/openapi.json
// Note: Rumble Network Discovery has been rebranded to runZero. This API is frozen at v2.15.0.
// Docs: https://console.rumble.run/docs/api
// Rate limits: Not publicly documented

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface RumbleRunConfig {
  apiKey: string;
  baseUrl?: string;
}

export class RumbleRunMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: RumbleRunConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://console.rumble.run/api/v1.0';
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_assets',
        description: 'List all discovered network assets in the organization inventory. Returns host information including IP, MAC, OS, open ports, and services.',
        inputSchema: {
          type: 'object',
          properties: {
            search: {
              type: 'string',
              description: 'Search filter string (e.g., "os:windows" or "alive:t")',
            },
          },
        },
      },
      {
        name: 'get_asset',
        description: 'Get full details for a specific network asset by asset ID, including all discovered services, open ports, OS fingerprint, and tags.',
        inputSchema: {
          type: 'object',
          properties: {
            asset_id: {
              type: 'string',
              description: 'The unique asset ID',
            },
          },
          required: ['asset_id'],
        },
      },
      {
        name: 'update_asset_tags',
        description: 'Update the tags on a network asset. Tags are key=value pairs used to label and organize assets.',
        inputSchema: {
          type: 'object',
          properties: {
            asset_id: {
              type: 'string',
              description: 'The asset ID to update',
            },
            tags: {
              type: 'object',
              description: 'Key-value tags to apply to the asset (e.g., {"env": "production", "owner": "infra"})',
            },
          },
          required: ['asset_id', 'tags'],
        },
      },
      {
        name: 'list_services',
        description: 'List all discovered network services across all assets. Returns service details including protocol, port, product, and version.',
        inputSchema: {
          type: 'object',
          properties: {
            search: {
              type: 'string',
              description: 'Search filter string (e.g., "port:22" or "protocol:tcp")',
            },
          },
        },
      },
      {
        name: 'list_sites',
        description: 'List all network scan sites configured in the organization. Sites represent network segments or scan targets.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_site',
        description: 'Get details for a specific scan site by site ID, including name, description, and scan configuration.',
        inputSchema: {
          type: 'object',
          properties: {
            site_id: {
              type: 'string',
              description: 'The unique site ID',
            },
          },
          required: ['site_id'],
        },
      },
      {
        name: 'create_scan',
        description: 'Create and start a new network scan task for a site. Returns the created task with its ID and status.',
        inputSchema: {
          type: 'object',
          properties: {
            site_id: {
              type: 'string',
              description: 'The site ID to scan',
            },
            scan_targets: {
              type: 'string',
              description: 'Comma-separated list of scan targets (CIDR ranges or IPs, e.g., "192.168.1.0/24,10.0.0.1")',
            },
            scan_excludes: {
              type: 'string',
              description: 'Comma-separated list of targets to exclude from the scan',
            },
          },
          required: ['site_id'],
        },
      },
      {
        name: 'list_tasks',
        description: 'List all scan tasks for the organization, including their status (pending, running, completed, stopped) and scan parameters.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_task',
        description: 'Get details and current status for a specific scan task by task ID.',
        inputSchema: {
          type: 'object',
          properties: {
            task_id: {
              type: 'string',
              description: 'The unique task ID',
            },
          },
          required: ['task_id'],
        },
      },
      {
        name: 'stop_task',
        description: 'Stop or cancel a running scan task. Also removes recurring and scheduled tasks.',
        inputSchema: {
          type: 'object',
          properties: {
            task_id: {
              type: 'string',
              description: 'The task ID to stop',
            },
          },
          required: ['task_id'],
        },
      },
      {
        name: 'list_agents',
        description: 'List all deployed Rumble scan agents in the organization. Agents perform distributed network scans from within network segments.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_organization',
        description: 'Get the current organization details including name, license status, and configuration.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_assets':
          return await this.listAssets(args);
        case 'get_asset':
          return await this.getAsset(args);
        case 'update_asset_tags':
          return await this.updateAssetTags(args);
        case 'list_services':
          return await this.listServices(args);
        case 'list_sites':
          return await this.listSites();
        case 'get_site':
          return await this.getSite(args);
        case 'create_scan':
          return await this.createScan(args);
        case 'list_tasks':
          return await this.listTasks();
        case 'get_task':
          return await this.getTask(args);
        case 'stop_task':
          return await this.stopTask(args);
        case 'list_agents':
          return await this.listAgents();
        case 'get_organization':
          return await this.getOrganization();
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

  private async request(path: string, method: string, body?: unknown): Promise<ToolResult> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };

    const response = await this.fetchWithRetry(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return {
        content: [{ type: 'text', text: `Rumble Run API error ${response.status}: ${errText}` }],
        isError: true,
      };
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new Error(`Rumble Run returned non-JSON response (HTTP ${response.status})`);
    }

    const text = JSON.stringify(data, null, 2);
    const truncated = text.length > 10_000
      ? text.slice(0, 10_000) + '\n... [truncated, ' + text.length + ' total chars]'
      : text;

    return { content: [{ type: 'text', text: truncated }], isError: false };
  }

  private async listAssets(args: Record<string, unknown>): Promise<ToolResult> {
    let path = '/org/assets';
    if (args.search) path += `?search=${encodeURIComponent(args.search as string)}`;
    return this.request(path, 'GET');
  }

  private async getAsset(args: Record<string, unknown>): Promise<ToolResult> {
    const assetId = args.asset_id as string;
    if (!assetId) {
      return { content: [{ type: 'text', text: 'asset_id is required' }], isError: true };
    }
    return this.request(`/org/assets/${encodeURIComponent(assetId)}`, 'GET');
  }

  private async updateAssetTags(args: Record<string, unknown>): Promise<ToolResult> {
    const assetId = args.asset_id as string;
    const tags = args.tags;
    if (!assetId || !tags) {
      return { content: [{ type: 'text', text: 'asset_id and tags are required' }], isError: true };
    }
    return this.request(`/org/assets/${encodeURIComponent(assetId)}/tags`, 'PATCH', tags);
  }

  private async listServices(args: Record<string, unknown>): Promise<ToolResult> {
    let path = '/org/services';
    if (args.search) path += `?search=${encodeURIComponent(args.search as string)}`;
    return this.request(path, 'GET');
  }

  private async listSites(): Promise<ToolResult> {
    return this.request('/org/sites', 'GET');
  }

  private async getSite(args: Record<string, unknown>): Promise<ToolResult> {
    const siteId = args.site_id as string;
    if (!siteId) {
      return { content: [{ type: 'text', text: 'site_id is required' }], isError: true };
    }
    return this.request(`/org/sites/${encodeURIComponent(siteId)}`, 'GET');
  }

  private async createScan(args: Record<string, unknown>): Promise<ToolResult> {
    const siteId = args.site_id as string;
    if (!siteId) {
      return { content: [{ type: 'text', text: 'site_id is required' }], isError: true };
    }
    const body: Record<string, unknown> = {};
    if (args.scan_targets) body.scan_targets = args.scan_targets;
    if (args.scan_excludes) body.scan_excludes = args.scan_excludes;
    return this.request(`/org/sites/${encodeURIComponent(siteId)}/scan`, 'PUT', body);
  }

  private async listTasks(): Promise<ToolResult> {
    return this.request('/org/tasks', 'GET');
  }

  private async getTask(args: Record<string, unknown>): Promise<ToolResult> {
    const taskId = args.task_id as string;
    if (!taskId) {
      return { content: [{ type: 'text', text: 'task_id is required' }], isError: true };
    }
    return this.request(`/org/tasks/${encodeURIComponent(taskId)}`, 'GET');
  }

  private async stopTask(args: Record<string, unknown>): Promise<ToolResult> {
    const taskId = args.task_id as string;
    if (!taskId) {
      return { content: [{ type: 'text', text: 'task_id is required' }], isError: true };
    }
    return this.request(`/org/tasks/${encodeURIComponent(taskId)}/stop`, 'POST');
  }

  private async listAgents(): Promise<ToolResult> {
    return this.request('/org/agents', 'GET');
  }

  private async getOrganization(): Promise<ToolResult> {
    return this.request('/org', 'GET');
  }

  static catalog() {
    return {
      name: 'rumble-run',
      displayName: 'Rumble Run (runZero)',
      version: '1.0.0',
      category: 'cybersecurity' as const,
      keywords: ['rumble', 'runzero', 'network-discovery', 'asset-inventory', 'cybersecurity'],
      toolNames: ['list_assets', 'get_asset', 'update_asset_tags', 'list_services', 'list_sites', 'get_site', 'create_scan', 'list_tasks', 'get_task', 'stop_task', 'list_agents', 'get_organization'],
      description: 'Rumble Run (runZero) adapter for the Epic AI Intelligence Platform — network discovery, asset inventory, and scan management',
      author: 'protectnil' as const,
    };
  }
}

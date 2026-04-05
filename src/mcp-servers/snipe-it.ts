/**
 * Snipe-IT MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// No official Snipe-IT MCP server was found on GitHub. Community servers exist (e.g., jameshgordy/snipeit-mcp,
// Wil-Collier/snipeit-mcp) but none are published by Grokability (the Snipe-IT vendor). Not official.
//
// Base URL: https://<your-domain>/api/v1  (self-hosted — must be configured per deployment)
// Auth: Bearer token — Authorization: Bearer <api_token>
//       Token generated in Snipe-IT UI: Settings → API → Create Token
// Docs: https://snipe-it.readme.io/reference/api-overview
// Rate limits: Not formally documented. Throttling depends on server configuration.
//              Include Accept: application/json and Content-Type: application/json on all requests.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface SnipeItConfig {
  apiToken: string;
  baseUrl: string;   // Required: self-hosted instance URL, e.g. https://assets.example.com/api/v1
}

export class SnipeItMCPServer extends MCPAdapterBase {
  private readonly apiToken: string;
  private readonly baseUrl: string;

  constructor(config: SnipeItConfig) {
    super();
    this.apiToken = config.apiToken;
    this.baseUrl = config.baseUrl.replace(/\/+$/, '');
  }

  static catalog() {
    return {
      name: 'snipe-it',
      displayName: 'Snipe-IT',
      version: '1.0.0',
      category: 'misc',
      keywords: [
        'snipe-it', 'snipeit', 'asset management', 'hardware', 'itam', 'inventory', 'license',
        'accessories', 'consumables', 'user', 'checkout', 'checkin', 'depreciation',
      ],
      toolNames: [
        'list_hardware', 'get_hardware', 'create_hardware', 'update_hardware', 'delete_hardware',
        'checkout_hardware', 'checkin_hardware', 'list_users', 'get_user', 'list_categories',
        'list_manufacturers', 'list_models', 'list_licenses', 'list_accessories', 'list_locations',
      ],
      description: 'Snipe-IT IT asset management: manage hardware assets, users, licenses, accessories, check-in/check-out workflows, and asset lifecycle tracking.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_hardware',
        description: 'List hardware assets with optional filters for status, category, model, manufacturer, location, and search query',
        inputSchema: {
          type: 'object',
          properties: {
            search: {
              type: 'string',
              description: 'Search term to filter hardware by name, serial, or asset tag (optional)',
            },
            status: {
              type: 'string',
              description: 'Filter by status label: RTD (ready to deploy), Deployed, Archived, etc. (optional)',
            },
            category_id: {
              type: 'number',
              description: 'Filter by category ID (optional)',
            },
            model_id: {
              type: 'number',
              description: 'Filter by model ID (optional)',
            },
            manufacturer_id: {
              type: 'number',
              description: 'Filter by manufacturer ID (optional)',
            },
            location_id: {
              type: 'number',
              description: 'Filter by location ID (optional)',
            },
            assigned_to: {
              type: 'number',
              description: 'Filter by assigned user ID (optional)',
            },
            limit: {
              type: 'number',
              description: 'Number of results per page (default: 50, max: 500)',
            },
            offset: {
              type: 'number',
              description: 'Number of results to skip (default: 0)',
            },
            sort: {
              type: 'string',
              description: 'Field to sort by: name, serial, asset_tag, created_at, updated_at (default: created_at)',
            },
            order: {
              type: 'string',
              description: 'Sort direction: asc or desc (default: desc)',
            },
          },
        },
      },
      {
        name: 'get_hardware',
        description: 'Get full details for a specific hardware asset by its Snipe-IT asset ID',
        inputSchema: {
          type: 'object',
          properties: {
            asset_id: {
              type: 'number',
              description: 'Snipe-IT hardware asset ID',
            },
          },
          required: ['asset_id'],
        },
      },
      {
        name: 'create_hardware',
        description: 'Create a new hardware asset record in Snipe-IT',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Asset name',
            },
            asset_tag: {
              type: 'string',
              description: 'Unique asset tag identifier',
            },
            model_id: {
              type: 'number',
              description: 'Model ID (from list_models)',
            },
            serial: {
              type: 'string',
              description: 'Serial number (optional)',
            },
            status_id: {
              type: 'number',
              description: 'Status label ID (1=RTD, 2=Deployed, 3=Archived, 4=Broken)',
            },
            purchase_date: {
              type: 'string',
              description: 'Purchase date in YYYY-MM-DD format (optional)',
            },
            purchase_cost: {
              type: 'number',
              description: 'Purchase cost (optional)',
            },
            notes: {
              type: 'string',
              description: 'Additional notes (optional)',
            },
          },
          required: ['name', 'asset_tag', 'model_id', 'status_id'],
        },
      },
      {
        name: 'update_hardware',
        description: 'Update an existing hardware asset\'s details by asset ID',
        inputSchema: {
          type: 'object',
          properties: {
            asset_id: {
              type: 'number',
              description: 'Asset ID to update',
            },
            name: {
              type: 'string',
              description: 'New asset name (optional)',
            },
            serial: {
              type: 'string',
              description: 'New serial number (optional)',
            },
            status_id: {
              type: 'number',
              description: 'New status label ID (optional)',
            },
            notes: {
              type: 'string',
              description: 'Updated notes (optional)',
            },
            purchase_cost: {
              type: 'number',
              description: 'Updated purchase cost (optional)',
            },
          },
          required: ['asset_id'],
        },
      },
      {
        name: 'delete_hardware',
        description: 'Delete a hardware asset record from Snipe-IT by asset ID. Asset must be unassigned before deletion.',
        inputSchema: {
          type: 'object',
          properties: {
            asset_id: {
              type: 'number',
              description: 'Asset ID to delete',
            },
          },
          required: ['asset_id'],
        },
      },
      {
        name: 'checkout_hardware',
        description: 'Check out a hardware asset to a user, location, or another asset',
        inputSchema: {
          type: 'object',
          properties: {
            asset_id: {
              type: 'number',
              description: 'Asset ID to check out',
            },
            checkout_to_type: {
              type: 'string',
              description: 'Target type: user, location, or asset',
            },
            assigned_user: {
              type: 'number',
              description: 'User ID to assign to (required if checkout_to_type is user)',
            },
            assigned_location: {
              type: 'number',
              description: 'Location ID to assign to (required if checkout_to_type is location)',
            },
            assigned_asset: {
              type: 'number',
              description: 'Asset ID to assign to (required if checkout_to_type is asset)',
            },
            note: {
              type: 'string',
              description: 'Checkout note (optional)',
            },
            expected_checkin: {
              type: 'string',
              description: 'Expected check-in date in YYYY-MM-DD format (optional)',
            },
          },
          required: ['asset_id', 'checkout_to_type'],
        },
      },
      {
        name: 'checkin_hardware',
        description: 'Check in a hardware asset to return it to the inventory from an assignment',
        inputSchema: {
          type: 'object',
          properties: {
            asset_id: {
              type: 'number',
              description: 'Asset ID to check in',
            },
            note: {
              type: 'string',
              description: 'Check-in note (optional)',
            },
            status_id: {
              type: 'number',
              description: 'Status to set after check-in (optional — defaults to RTD)',
            },
          },
          required: ['asset_id'],
        },
      },
      {
        name: 'list_users',
        description: 'List users in Snipe-IT with optional search and filter parameters',
        inputSchema: {
          type: 'object',
          properties: {
            search: {
              type: 'string',
              description: 'Search term for name, email, or username (optional)',
            },
            limit: {
              type: 'number',
              description: 'Results per page (default: 50)',
            },
            offset: {
              type: 'number',
              description: 'Results offset (default: 0)',
            },
          },
        },
      },
      {
        name: 'get_user',
        description: 'Get details for a specific Snipe-IT user by user ID',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: {
              type: 'number',
              description: 'Snipe-IT user ID',
            },
          },
          required: ['user_id'],
        },
      },
      {
        name: 'list_categories',
        description: 'List all asset categories defined in Snipe-IT with type and asset counts',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Results per page (default: 50)',
            },
            offset: {
              type: 'number',
              description: 'Results offset (default: 0)',
            },
          },
        },
      },
      {
        name: 'list_manufacturers',
        description: 'List all manufacturers in Snipe-IT with asset and model counts',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Results per page (default: 50)',
            },
            offset: {
              type: 'number',
              description: 'Results offset (default: 0)',
            },
          },
        },
      },
      {
        name: 'list_models',
        description: 'List hardware models with optional filter by manufacturer and category',
        inputSchema: {
          type: 'object',
          properties: {
            manufacturer_id: {
              type: 'number',
              description: 'Filter by manufacturer ID (optional)',
            },
            category_id: {
              type: 'number',
              description: 'Filter by category ID (optional)',
            },
            limit: {
              type: 'number',
              description: 'Results per page (default: 50)',
            },
            offset: {
              type: 'number',
              description: 'Results offset (default: 0)',
            },
          },
        },
      },
      {
        name: 'list_licenses',
        description: 'List software licenses with optional search, sorted by seats available or expiration date',
        inputSchema: {
          type: 'object',
          properties: {
            search: {
              type: 'string',
              description: 'Search by license name or serial (optional)',
            },
            limit: {
              type: 'number',
              description: 'Results per page (default: 50)',
            },
            offset: {
              type: 'number',
              description: 'Results offset (default: 0)',
            },
          },
        },
      },
      {
        name: 'list_accessories',
        description: 'List accessories inventory including quantities available and assigned',
        inputSchema: {
          type: 'object',
          properties: {
            search: {
              type: 'string',
              description: 'Search by accessory name (optional)',
            },
            category_id: {
              type: 'number',
              description: 'Filter by category ID (optional)',
            },
            limit: {
              type: 'number',
              description: 'Results per page (default: 50)',
            },
            offset: {
              type: 'number',
              description: 'Results offset (default: 0)',
            },
          },
        },
      },
      {
        name: 'list_locations',
        description: 'List all physical locations configured in Snipe-IT with asset counts',
        inputSchema: {
          type: 'object',
          properties: {
            search: {
              type: 'string',
              description: 'Search by location name (optional)',
            },
            limit: {
              type: 'number',
              description: 'Results per page (default: 50)',
            },
            offset: {
              type: 'number',
              description: 'Results offset (default: 0)',
            },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_hardware':
          return this.listHardware(args);
        case 'get_hardware':
          return this.getHardware(args);
        case 'create_hardware':
          return this.createHardware(args);
        case 'update_hardware':
          return this.updateHardware(args);
        case 'delete_hardware':
          return this.deleteHardware(args);
        case 'checkout_hardware':
          return this.checkoutHardware(args);
        case 'checkin_hardware':
          return this.checkinHardware(args);
        case 'list_users':
          return this.listUsers(args);
        case 'get_user':
          return this.getUser(args);
        case 'list_categories':
          return this.listCategories(args);
        case 'list_manufacturers':
          return this.listManufacturers(args);
        case 'list_models':
          return this.listModels(args);
        case 'list_licenses':
          return this.listLicenses(args);
        case 'list_accessories':
          return this.listAccessories(args);
        case 'list_locations':
          return this.listLocations(args);
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
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    };
  }

  private async get(path: string, params: Record<string, string> = {}): Promise<ToolResult> {
    const qs = new URLSearchParams(params).toString();
    const url = `${this.baseUrl}${path}${qs ? '?' + qs : ''}`;
    const response = await this.fetchWithRetry(url, { headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async post(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async patch(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'PATCH',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async del(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'DELETE',
      headers: this.headers,
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listHardware(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      limit: String((args.limit as number) || 50),
      offset: String((args.offset as number) || 0),
    };
    if (args.search) params.search = args.search as string;
    if (args.status) params.status = args.status as string;
    if (args.category_id) params.category_id = String(args.category_id);
    if (args.model_id) params.model_id = String(args.model_id);
    if (args.manufacturer_id) params.manufacturer_id = String(args.manufacturer_id);
    if (args.location_id) params.location_id = String(args.location_id);
    if (args.assigned_to) params.assigned_to = String(args.assigned_to);
    if (args.sort) params.sort = args.sort as string;
    if (args.order) params.order = args.order as string;
    return this.get('/hardware', params);
  }

  private async getHardware(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.asset_id) return { content: [{ type: 'text', text: 'asset_id is required' }], isError: true };
    return this.get(`/hardware/${encodeURIComponent(args.asset_id as string)}`);
  }

  private async createHardware(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name || !args.asset_tag || !args.model_id || !args.status_id) {
      return { content: [{ type: 'text', text: 'name, asset_tag, model_id, and status_id are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      name: args.name,
      asset_tag: args.asset_tag,
      model_id: args.model_id,
      status_id: args.status_id,
    };
    if (args.serial) body.serial = args.serial;
    if (args.purchase_date) body.purchase_date = args.purchase_date;
    if (args.purchase_cost !== undefined) body.purchase_cost = args.purchase_cost;
    if (args.notes) body.notes = args.notes;
    return this.post('/hardware', body);
  }

  private async updateHardware(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.asset_id) return { content: [{ type: 'text', text: 'asset_id is required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.name) body.name = args.name;
    if (args.serial) body.serial = args.serial;
    if (args.status_id !== undefined) body.status_id = args.status_id;
    if (args.notes) body.notes = args.notes;
    if (args.purchase_cost !== undefined) body.purchase_cost = args.purchase_cost;
    return this.patch(`/hardware/${encodeURIComponent(args.asset_id as string)}`, body);
  }

  private async deleteHardware(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.asset_id) return { content: [{ type: 'text', text: 'asset_id is required' }], isError: true };
    return this.del(`/hardware/${encodeURIComponent(args.asset_id as string)}`);
  }

  private async checkoutHardware(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.asset_id || !args.checkout_to_type) {
      return { content: [{ type: 'text', text: 'asset_id and checkout_to_type are required' }], isError: true };
    }
    const body: Record<string, unknown> = { checkout_to_type: args.checkout_to_type };
    if (args.assigned_user !== undefined) body.assigned_user = args.assigned_user;
    if (args.assigned_location !== undefined) body.assigned_location = args.assigned_location;
    if (args.assigned_asset !== undefined) body.assigned_asset = args.assigned_asset;
    if (args.note) body.note = args.note;
    if (args.expected_checkin) body.expected_checkin = args.expected_checkin;
    return this.post(`/hardware/${encodeURIComponent(args.asset_id as string)}/checkout`, body);
  }

  private async checkinHardware(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.asset_id) return { content: [{ type: 'text', text: 'asset_id is required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.note) body.note = args.note;
    if (args.status_id !== undefined) body.status_id = args.status_id;
    return this.post(`/hardware/${encodeURIComponent(args.asset_id as string)}/checkin`, body);
  }

  private async listUsers(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      limit: String((args.limit as number) || 50),
      offset: String((args.offset as number) || 0),
    };
    if (args.search) params.search = args.search as string;
    return this.get('/users', params);
  }

  private async getUser(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.user_id) return { content: [{ type: 'text', text: 'user_id is required' }], isError: true };
    return this.get(`/users/${encodeURIComponent(args.user_id as string)}`);
  }

  private async listCategories(args: Record<string, unknown>): Promise<ToolResult> {
    return this.get('/categories', {
      limit: String((args.limit as number) || 50),
      offset: String((args.offset as number) || 0),
    });
  }

  private async listManufacturers(args: Record<string, unknown>): Promise<ToolResult> {
    return this.get('/manufacturers', {
      limit: String((args.limit as number) || 50),
      offset: String((args.offset as number) || 0),
    });
  }

  private async listModels(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      limit: String((args.limit as number) || 50),
      offset: String((args.offset as number) || 0),
    };
    if (args.manufacturer_id) params.manufacturer_id = String(args.manufacturer_id);
    if (args.category_id) params.category_id = String(args.category_id);
    return this.get('/models', params);
  }

  private async listLicenses(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      limit: String((args.limit as number) || 50),
      offset: String((args.offset as number) || 0),
    };
    if (args.search) params.search = args.search as string;
    return this.get('/licenses', params);
  }

  private async listAccessories(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      limit: String((args.limit as number) || 50),
      offset: String((args.offset as number) || 0),
    };
    if (args.search) params.search = args.search as string;
    if (args.category_id) params.category_id = String(args.category_id);
    return this.get('/accessories', params);
  }

  private async listLocations(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      limit: String((args.limit as number) || 50),
      offset: String((args.offset as number) || 0),
    };
    if (args.search) params.search = args.search as string;
    return this.get('/locations', params);
  }
}

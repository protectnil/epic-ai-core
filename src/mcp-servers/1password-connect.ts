/**
 * 1Password Connect MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// No official 1Password Connect MCP server was found on GitHub or npm.
// (1Password CLI has community wrappers but not a maintained MCP server for Connect API.)
//
// Base URL: http://localhost:8080/v1  (self-hosted 1Password Connect server)
// Auth: Bearer JWT token (ConnectToken) — issued by the 1Password Connect server
// Docs: https://developer.1password.com/docs/connect/
// Rate limits: Not documented; depends on self-hosted server configuration

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface OnePasswordConnectConfig {
  connectToken: string;    // JWT token issued by the 1Password Connect server
  baseUrl?: string;        // Connect server base URL (default: http://localhost:8080/v1)
}

export class OnePasswordConnectMCPServer extends MCPAdapterBase {
  private readonly token: string;
  private readonly baseUrl: string;

  constructor(config: OnePasswordConnectConfig) {
    super();
    this.token = config.connectToken;
    this.baseUrl = config.baseUrl ?? 'http://localhost:8080/v1';
  }

  static catalog() {
    return {
      name: '1password-connect',
      displayName: '1Password Connect',
      version: '1.0.0',
      category: 'identity' as const,
      keywords: ['1password', 'password', 'vault', 'secrets', 'credentials', 'items', 'files', 'connect', 'secure-notes', 'api-credentials'],
      toolNames: [
        'list_vaults',
        'get_vault',
        'list_items',
        'get_item',
        'create_item',
        'update_item',
        'patch_item',
        'delete_item',
        'list_item_files',
        'get_item_file',
        'get_api_activity',
        'get_server_health',
      ],
      description: '1Password Connect API: manage vaults, items (passwords, API credentials, secure notes, SSH keys), and files in a self-hosted 1Password Connect server. Query API activity logs.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      // ── Vaults ──────────────────────────────────────────────────────────────
      {
        name: 'list_vaults',
        description: 'List all accessible 1Password vaults with optional SCIM eq filter by vault name',
        inputSchema: {
          type: 'object',
          properties: {
            filter: {
              type: 'string',
              description: 'SCIM eq filter to narrow results by vault name (e.g. name eq "Personal")',
            },
          },
        },
      },
      {
        name: 'get_vault',
        description: 'Get details and metadata of a specific 1Password vault by its UUID',
        inputSchema: {
          type: 'object',
          properties: {
            vault_uuid: {
              type: 'string',
              description: 'UUID of the vault to retrieve',
            },
          },
          required: ['vault_uuid'],
        },
      },
      // ── Items ────────────────────────────────────────────────────────────────
      {
        name: 'list_items',
        description: 'List all items in a vault with optional SCIM eq filter by item title, category, or tags',
        inputSchema: {
          type: 'object',
          properties: {
            vault_uuid: {
              type: 'string',
              description: 'UUID of the vault to list items from',
            },
            filter: {
              type: 'string',
              description: 'SCIM eq filter (e.g. title eq "My Login" or category eq "LOGIN")',
            },
          },
          required: ['vault_uuid'],
        },
      },
      {
        name: 'get_item',
        description: 'Get full details of a specific item in a vault including fields, sections, and file references',
        inputSchema: {
          type: 'object',
          properties: {
            vault_uuid: {
              type: 'string',
              description: 'UUID of the vault containing the item',
            },
            item_uuid: {
              type: 'string',
              description: 'UUID of the item to retrieve',
            },
          },
          required: ['vault_uuid', 'item_uuid'],
        },
      },
      {
        name: 'create_item',
        description: 'Create a new item in a vault; supports categories: LOGIN, PASSWORD, API_CREDENTIAL, SERVER, DATABASE, SECURE_NOTE, SSH_KEY, and more',
        inputSchema: {
          type: 'object',
          properties: {
            vault_uuid: {
              type: 'string',
              description: 'UUID of the vault to create the item in',
            },
            category: {
              type: 'string',
              description: 'Item category: LOGIN, PASSWORD, API_CREDENTIAL, SERVER, DATABASE, CREDIT_CARD, SECURE_NOTE, SSH_KEY, CUSTOM, etc.',
            },
            title: {
              type: 'string',
              description: 'Item title (display name)',
            },
            fields: {
              type: 'array',
              description: 'Array of field objects with id, label, value, type, and optional section',
            },
            tags: {
              type: 'array',
              description: 'Array of string tags for categorizing the item',
            },
            favorite: {
              type: 'boolean',
              description: 'Mark item as a favorite (default: false)',
            },
            urls: {
              type: 'array',
              description: 'Array of URL objects with href (required), label, and primary (boolean)',
            },
          },
          required: ['vault_uuid', 'category'],
        },
      },
      {
        name: 'update_item',
        description: 'Fully replace an existing item in a vault (PUT); all item fields must be provided',
        inputSchema: {
          type: 'object',
          properties: {
            vault_uuid: {
              type: 'string',
              description: 'UUID of the vault containing the item',
            },
            item_uuid: {
              type: 'string',
              description: 'UUID of the item to replace',
            },
            category: {
              type: 'string',
              description: 'Item category: LOGIN, PASSWORD, API_CREDENTIAL, SERVER, DATABASE, SECURE_NOTE, SSH_KEY, CUSTOM, etc.',
            },
            title: {
              type: 'string',
              description: 'Item title',
            },
            fields: {
              type: 'array',
              description: 'Array of field objects with id, label, value, type, and optional section',
            },
            tags: {
              type: 'array',
              description: 'Array of string tags',
            },
            favorite: {
              type: 'boolean',
              description: 'Mark as favorite',
            },
            urls: {
              type: 'array',
              description: 'Array of URL objects with href, label, and primary',
            },
          },
          required: ['vault_uuid', 'item_uuid', 'category'],
        },
      },
      {
        name: 'patch_item',
        description: 'Partially update an item using JSON Patch operations (add, remove, replace, move, copy, test)',
        inputSchema: {
          type: 'object',
          properties: {
            vault_uuid: {
              type: 'string',
              description: 'UUID of the vault containing the item',
            },
            item_uuid: {
              type: 'string',
              description: 'UUID of the item to patch',
            },
            patches: {
              type: 'array',
              description: 'Array of JSON Patch operations, each with op (add/remove/replace/move/copy/test), path, and value',
            },
          },
          required: ['vault_uuid', 'item_uuid', 'patches'],
        },
      },
      {
        name: 'delete_item',
        description: 'Permanently delete an item from a vault by vault UUID and item UUID',
        inputSchema: {
          type: 'object',
          properties: {
            vault_uuid: {
              type: 'string',
              description: 'UUID of the vault containing the item',
            },
            item_uuid: {
              type: 'string',
              description: 'UUID of the item to delete',
            },
          },
          required: ['vault_uuid', 'item_uuid'],
        },
      },
      // ── Files ────────────────────────────────────────────────────────────────
      {
        name: 'list_item_files',
        description: 'List all files attached to an item in a vault, with optional inline base64 file content',
        inputSchema: {
          type: 'object',
          properties: {
            vault_uuid: {
              type: 'string',
              description: 'UUID of the vault containing the item',
            },
            item_uuid: {
              type: 'string',
              description: 'UUID of the item to list files from',
            },
            inline_files: {
              type: 'boolean',
              description: 'If true, include base64-encoded file content inline in the response (default: false)',
            },
          },
          required: ['vault_uuid', 'item_uuid'],
        },
      },
      {
        name: 'get_item_file',
        description: 'Get metadata and optionally the base64-encoded content of a specific file attached to an item',
        inputSchema: {
          type: 'object',
          properties: {
            vault_uuid: {
              type: 'string',
              description: 'UUID of the vault containing the item',
            },
            item_uuid: {
              type: 'string',
              description: 'UUID of the item containing the file',
            },
            file_uuid: {
              type: 'string',
              description: 'UUID of the file to retrieve',
            },
            inline_files: {
              type: 'boolean',
              description: 'If true, include base64-encoded file content inline in the response (default: false)',
            },
          },
          required: ['vault_uuid', 'item_uuid', 'file_uuid'],
        },
      },
      // ── Activity & Health ────────────────────────────────────────────────────
      {
        name: 'get_api_activity',
        description: 'Retrieve a paginated list of API requests made to the Connect server for audit and monitoring',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Number of API events to retrieve in a single request (default: 50)',
            },
            offset: {
              type: 'number',
              description: 'How far into the collection to start (default: 0)',
            },
          },
        },
      },
      {
        name: 'get_server_health',
        description: 'Get the health status of the 1Password Connect server and its dependencies (sync, sqlite)',
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
        case 'list_vaults':
          return await this.listVaults(args);
        case 'get_vault':
          return await this.getVault(args);
        case 'list_items':
          return await this.listItems(args);
        case 'get_item':
          return await this.getItem(args);
        case 'create_item':
          return await this.createItem(args);
        case 'update_item':
          return await this.updateItem(args);
        case 'patch_item':
          return await this.patchItem(args);
        case 'delete_item':
          return await this.deleteItem(args);
        case 'list_item_files':
          return await this.listItemFiles(args);
        case 'get_item_file':
          return await this.getItemFile(args);
        case 'get_api_activity':
          return await this.getApiActivity(args);
        case 'get_server_health':
          return await this.getServerHealth();
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

  private authHeaders(): Record<string, string> {
    return {
      'Authorization': `Bearer ${this.token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
  }

  private async listVaults(args: Record<string, unknown>): Promise<ToolResult> {
    const filter = args.filter as string | undefined;

    let url = `${this.baseUrl}/vaults`;
    if (filter) {
      url += `?filter=${encodeURIComponent(filter)}`;
    }

    const response = await this.fetchWithRetry(url, { headers: this.authHeaders() });

    if (!response.ok) {
      const errText = await response.text();
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText} — ${errText}` }],
        isError: true,
      };
    }

    const data = await response.json();
    return {
      content: [{ type: 'text', text: this.truncate(data) }],
      isError: false,
    };
  }

  private async getVault(args: Record<string, unknown>): Promise<ToolResult> {
    const vaultUuid = encodeURIComponent(args.vault_uuid as string);

    const response = await this.fetchWithRetry(`${this.baseUrl}/vaults/${vaultUuid}`, {
      headers: this.authHeaders(),
    });

    if (!response.ok) {
      const errText = await response.text();
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText} — ${errText}` }],
        isError: true,
      };
    }

    const data = await response.json();
    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      isError: false,
    };
  }

  private async listItems(args: Record<string, unknown>): Promise<ToolResult> {
    const vaultUuid = encodeURIComponent(args.vault_uuid as string);
    const filter = args.filter as string | undefined;

    let url = `${this.baseUrl}/vaults/${vaultUuid}/items`;
    if (filter) {
      url += `?filter=${encodeURIComponent(filter)}`;
    }

    const response = await this.fetchWithRetry(url, { headers: this.authHeaders() });

    if (!response.ok) {
      const errText = await response.text();
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText} — ${errText}` }],
        isError: true,
      };
    }

    const data = await response.json();
    return {
      content: [{ type: 'text', text: this.truncate(data) }],
      isError: false,
    };
  }

  private async getItem(args: Record<string, unknown>): Promise<ToolResult> {
    const vaultUuid = encodeURIComponent(args.vault_uuid as string);
    const itemUuid = encodeURIComponent(args.item_uuid as string);

    const response = await this.fetchWithRetry(`${this.baseUrl}/vaults/${vaultUuid}/items/${itemUuid}`, {
      headers: this.authHeaders(),
    });

    if (!response.ok) {
      const errText = await response.text();
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText} — ${errText}` }],
        isError: true,
      };
    }

    const data = await response.json();
    return {
      content: [{ type: 'text', text: this.truncate(data) }],
      isError: false,
    };
  }

  private async createItem(args: Record<string, unknown>): Promise<ToolResult> {
    const vaultUuid = encodeURIComponent(args.vault_uuid as string);

    const body: Record<string, unknown> = {
      vault: { id: args.vault_uuid as string },
      category: args.category as string,
    };
    if (args.title !== undefined) body.title = args.title;
    if (args.fields !== undefined) body.fields = args.fields;
    if (args.tags !== undefined) body.tags = args.tags;
    if (args.favorite !== undefined) body.favorite = args.favorite;
    if (args.urls !== undefined) body.urls = args.urls;

    const response = await this.fetchWithRetry(`${this.baseUrl}/vaults/${vaultUuid}/items`, {
      method: 'POST',
      headers: this.authHeaders(),
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text();
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText} — ${errText}` }],
        isError: true,
      };
    }

    const data = await response.json();
    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      isError: false,
    };
  }

  private async updateItem(args: Record<string, unknown>): Promise<ToolResult> {
    const vaultUuid = encodeURIComponent(args.vault_uuid as string);
    const itemUuid = encodeURIComponent(args.item_uuid as string);

    const body: Record<string, unknown> = {
      id: args.item_uuid as string,
      vault: { id: args.vault_uuid as string },
      category: args.category as string,
    };
    if (args.title !== undefined) body.title = args.title;
    if (args.fields !== undefined) body.fields = args.fields;
    if (args.tags !== undefined) body.tags = args.tags;
    if (args.favorite !== undefined) body.favorite = args.favorite;
    if (args.urls !== undefined) body.urls = args.urls;

    const response = await this.fetchWithRetry(`${this.baseUrl}/vaults/${vaultUuid}/items/${itemUuid}`, {
      method: 'PUT',
      headers: this.authHeaders(),
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text();
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText} — ${errText}` }],
        isError: true,
      };
    }

    const data = await response.json();
    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      isError: false,
    };
  }

  private async patchItem(args: Record<string, unknown>): Promise<ToolResult> {
    const vaultUuid = encodeURIComponent(args.vault_uuid as string);
    const itemUuid = encodeURIComponent(args.item_uuid as string);
    const patches = args.patches;

    const response = await this.fetchWithRetry(`${this.baseUrl}/vaults/${vaultUuid}/items/${itemUuid}`, {
      method: 'PATCH',
      headers: this.authHeaders(),
      body: JSON.stringify(patches),
    });

    if (!response.ok) {
      const errText = await response.text();
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText} — ${errText}` }],
        isError: true,
      };
    }

    const data = await response.json();
    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      isError: false,
    };
  }

  private async deleteItem(args: Record<string, unknown>): Promise<ToolResult> {
    const vaultUuid = encodeURIComponent(args.vault_uuid as string);
    const itemUuid = encodeURIComponent(args.item_uuid as string);

    const response = await this.fetchWithRetry(`${this.baseUrl}/vaults/${vaultUuid}/items/${itemUuid}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errText = await response.text();
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText} — ${errText}` }],
        isError: true,
      };
    }

    return {
      content: [{ type: 'text', text: JSON.stringify({ status: 'deleted', item_uuid: args.item_uuid }, null, 2) }],
      isError: false,
    };
  }

  private async listItemFiles(args: Record<string, unknown>): Promise<ToolResult> {
    const vaultUuid = encodeURIComponent(args.vault_uuid as string);
    const itemUuid = encodeURIComponent(args.item_uuid as string);
    const inlineFiles = args.inline_files as boolean | undefined;

    let url = `${this.baseUrl}/vaults/${vaultUuid}/items/${itemUuid}/files`;
    if (inlineFiles !== undefined) {
      url += `?inline_files=${inlineFiles}`;
    }

    const response = await this.fetchWithRetry(url, { headers: this.authHeaders() });

    if (!response.ok) {
      const errText = await response.text();
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText} — ${errText}` }],
        isError: true,
      };
    }

    const data = await response.json();
    return {
      content: [{ type: 'text', text: this.truncate(data) }],
      isError: false,
    };
  }

  private async getItemFile(args: Record<string, unknown>): Promise<ToolResult> {
    const vaultUuid = encodeURIComponent(args.vault_uuid as string);
    const itemUuid = encodeURIComponent(args.item_uuid as string);
    const fileUuid = encodeURIComponent(args.file_uuid as string);
    const inlineFiles = args.inline_files as boolean | undefined;

    let url = `${this.baseUrl}/vaults/${vaultUuid}/items/${itemUuid}/files/${fileUuid}`;
    if (inlineFiles !== undefined) {
      url += `?inline_files=${inlineFiles}`;
    }

    const response = await this.fetchWithRetry(url, { headers: this.authHeaders() });

    if (!response.ok) {
      const errText = await response.text();
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText} — ${errText}` }],
        isError: true,
      };
    }

    const data = await response.json();
    return {
      content: [{ type: 'text', text: this.truncate(data) }],
      isError: false,
    };
  }

  private async getApiActivity(args: Record<string, unknown>): Promise<ToolResult> {
    const limit = (args.limit as number) ?? 50;
    const offset = (args.offset as number) ?? 0;

    const response = await this.fetchWithRetry(
      `${this.baseUrl}/activity?limit=${limit}&offset=${offset}`,
      { headers: this.authHeaders() },
    );

    if (!response.ok) {
      const errText = await response.text();
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText} — ${errText}` }],
        isError: true,
      };
    }

    const data = await response.json();
    return {
      content: [{ type: 'text', text: this.truncate(data) }],
      isError: false,
    };
  }

  private async getServerHealth(): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}/health`, {
      headers: { 'Accept': 'application/json' },
    });

    if (!response.ok) {
      const errText = await response.text();
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText} — ${errText}` }],
        isError: true,
      };
    }

    const data = await response.json();
    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      isError: false,
    };
  }
}

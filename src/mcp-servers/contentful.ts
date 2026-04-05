/**
 * Contentful MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/contentful/contentful-mcp-server — transport: stdio + remote HTTP (OAuth)
//   Published by Contentful (contentful org). Actively maintained; npm @contentful/mcp-server.
//   Also available as a remote MCP server at https://mcp.contentful.com (OAuth, HTTP transport).
//   Vendor MCP exposes 43 tools: get_initial_context, list_content_types, get_content_type,
//     create_content_type, update_content_type, publish_content_type, unpublish_content_type,
//     delete_content_type, search_entries, get_entry, create_entry, update_entry, publish_entry,
//     unpublish_entry, delete_entry, upload_asset, list_assets, get_asset, update_asset,
//     publish_asset, unpublish_asset, delete_asset, list_spaces, get_space, list_environments,
//     create_environment, delete_environment, list_locales, get_locale, create_locale, update_locale,
//     delete_locale, list_tags, create_tag, create_ai_action, invoke_ai_action,
//     get_ai_action_invocation, get_ai_action, list_ai_actions, update_ai_action,
//     publish_ai_action, unpublish_ai_action, get_environment
//
// Integration: use-both
//   MCP-sourced tools (unique to MCP, not in our adapter): get_initial_context,
//     create_content_type, update_content_type, publish_content_type, unpublish_content_type,
//     delete_content_type, search_entries, upload_asset, update_asset, list_locales, get_locale,
//     create_locale, update_locale, delete_locale, list_tags, create_tag, create_ai_action,
//     invoke_ai_action, get_ai_action_invocation, get_ai_action, list_ai_actions, update_ai_action,
//     publish_ai_action, unpublish_ai_action
//   REST-adapter-only tools (not covered by vendor MCP): get_environment
//   Shared (both cover, MCP takes priority): list_spaces, get_space, list_environments,
//     create_environment, delete_environment, list_content_types, get_content_type,
//     list_entries, get_entry, create_entry, update_entry, delete_entry, publish_entry,
//     unpublish_entry, list_assets, get_asset, delete_asset, publish_asset, unpublish_asset
//
// Our adapter covers: 20 tools. Vendor MCP covers: 43 tools. Combined coverage: ~44 unique tools.
//
// Base URL: https://api.contentful.com
// Auth: Bearer personal access token (PAT) or OAuth token in Authorization header
// Docs: https://www.contentful.com/developers/docs/references/content-management-api/
// Rate limits: 10 req/s per token (burst allowed); rate limit headers returned on each response.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface ContentfulConfig {
  accessToken: string;
  spaceId?: string;
  environmentId?: string;
  baseUrl?: string;
}

export class ContentfulMCPServer extends MCPAdapterBase {
  private readonly accessToken: string;
  private readonly spaceId: string;
  private readonly environmentId: string;
  private readonly baseUrl: string;

  constructor(config: ContentfulConfig) {
    super();
    this.accessToken = config.accessToken;
    this.spaceId = config.spaceId ?? '';
    this.environmentId = config.environmentId ?? 'master';
    this.baseUrl = config.baseUrl || 'https://api.contentful.com';
  }

  static catalog() {
    return {
      name: 'contentful',
      displayName: 'Contentful',
      version: '1.0.0',
      category: 'misc',
      keywords: [
        'contentful', 'cms', 'headless', 'content', 'entry', 'asset', 'space',
        'environment', 'content-type', 'locale', 'publish', 'draft',
        'media', 'structured-content', 'api-first',
      ],
      toolNames: [
        'list_spaces', 'get_space',
        'list_environments', 'get_environment', 'create_environment', 'delete_environment',
        'list_content_types', 'get_content_type',
        'list_entries', 'get_entry', 'create_entry', 'update_entry', 'delete_entry',
        'publish_entry', 'unpublish_entry',
        'list_assets', 'get_asset', 'delete_asset', 'publish_asset', 'unpublish_asset',
      ],
      description: 'Contentful headless CMS management: spaces, environments, content types, entries, assets, and publish/unpublish workflows via the CMA.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_spaces',
        description: 'List all Contentful spaces accessible with the current access token',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Number of spaces to return (max 100, default: 25)',
            },
            skip: {
              type: 'number',
              description: 'Number of spaces to skip for pagination (default: 0)',
            },
          },
        },
      },
      {
        name: 'get_space',
        description: 'Retrieve details for a specific Contentful space by space ID',
        inputSchema: {
          type: 'object',
          properties: {
            space_id: {
              type: 'string',
              description: 'Contentful space ID (uses config default if omitted)',
            },
          },
        },
      },
      {
        name: 'list_environments',
        description: 'List all environments in a Contentful space including master and sandbox environments',
        inputSchema: {
          type: 'object',
          properties: {
            space_id: {
              type: 'string',
              description: 'Contentful space ID (uses config default if omitted)',
            },
          },
        },
      },
      {
        name: 'get_environment',
        description: 'Retrieve details for a specific environment in a Contentful space',
        inputSchema: {
          type: 'object',
          properties: {
            space_id: {
              type: 'string',
              description: 'Contentful space ID (uses config default if omitted)',
            },
            environment_id: {
              type: 'string',
              description: 'Environment ID (e.g. master, staging) (uses config default if omitted)',
            },
          },
        },
      },
      {
        name: 'create_environment',
        description: 'Create a new environment in a Contentful space, optionally cloned from an existing environment',
        inputSchema: {
          type: 'object',
          properties: {
            environment_id: {
              type: 'string',
              description: 'ID for the new environment (e.g. staging, feature-branch)',
            },
            name: {
              type: 'string',
              description: 'Display name for the new environment',
            },
            source_environment_id: {
              type: 'string',
              description: 'Environment ID to clone content types from (default: master)',
            },
            space_id: {
              type: 'string',
              description: 'Contentful space ID (uses config default if omitted)',
            },
          },
          required: ['environment_id', 'name'],
        },
      },
      {
        name: 'delete_environment',
        description: 'Delete an environment from a Contentful space — cannot delete master environment',
        inputSchema: {
          type: 'object',
          properties: {
            environment_id: {
              type: 'string',
              description: 'Environment ID to delete (must not be master)',
            },
            space_id: {
              type: 'string',
              description: 'Contentful space ID (uses config default if omitted)',
            },
          },
          required: ['environment_id'],
        },
      },
      {
        name: 'list_content_types',
        description: 'List all content types (models) in a Contentful environment with their fields and display field',
        inputSchema: {
          type: 'object',
          properties: {
            space_id: {
              type: 'string',
              description: 'Contentful space ID (uses config default if omitted)',
            },
            environment_id: {
              type: 'string',
              description: 'Environment ID (uses config default if omitted)',
            },
            limit: {
              type: 'number',
              description: 'Number of content types to return (max 1000, default: 100)',
            },
            skip: {
              type: 'number',
              description: 'Number of content types to skip for pagination (default: 0)',
            },
          },
        },
      },
      {
        name: 'get_content_type',
        description: 'Retrieve a specific content type definition including all fields and validations',
        inputSchema: {
          type: 'object',
          properties: {
            content_type_id: {
              type: 'string',
              description: 'Contentful content type ID',
            },
            space_id: {
              type: 'string',
              description: 'Contentful space ID (uses config default if omitted)',
            },
            environment_id: {
              type: 'string',
              description: 'Environment ID (uses config default if omitted)',
            },
          },
          required: ['content_type_id'],
        },
      },
      {
        name: 'list_entries',
        description: 'List entries in a Contentful environment with optional content type, search query, and field filters',
        inputSchema: {
          type: 'object',
          properties: {
            space_id: {
              type: 'string',
              description: 'Contentful space ID (uses config default if omitted)',
            },
            environment_id: {
              type: 'string',
              description: 'Environment ID (uses config default if omitted)',
            },
            content_type: {
              type: 'string',
              description: 'Filter entries by content type ID',
            },
            query: {
              type: 'string',
              description: 'Full-text search query across all text fields',
            },
            limit: {
              type: 'number',
              description: 'Number of entries to return (max 1000, default: 100)',
            },
            skip: {
              type: 'number',
              description: 'Number of entries to skip for pagination (default: 0)',
            },
            order: {
              type: 'string',
              description: 'Sort field with optional - prefix for descending (e.g. -sys.updatedAt)',
            },
            include: {
              type: 'number',
              description: 'Levels of linked entries to include (0-10, default: 1)',
            },
          },
        },
      },
      {
        name: 'get_entry',
        description: 'Retrieve a specific Contentful entry by entry ID with all field values',
        inputSchema: {
          type: 'object',
          properties: {
            entry_id: {
              type: 'string',
              description: 'Contentful entry ID',
            },
            space_id: {
              type: 'string',
              description: 'Contentful space ID (uses config default if omitted)',
            },
            environment_id: {
              type: 'string',
              description: 'Environment ID (uses config default if omitted)',
            },
          },
          required: ['entry_id'],
        },
      },
      {
        name: 'create_entry',
        description: 'Create a new entry in a Contentful environment for a specific content type with field values',
        inputSchema: {
          type: 'object',
          properties: {
            content_type_id: {
              type: 'string',
              description: 'ID of the content type for the new entry',
            },
            fields: {
              type: 'string',
              description: 'JSON object of field values keyed by field ID, each value an object keyed by locale (e.g. {"title":{"en-US":"My Title"}})',
            },
            space_id: {
              type: 'string',
              description: 'Contentful space ID (uses config default if omitted)',
            },
            environment_id: {
              type: 'string',
              description: 'Environment ID (uses config default if omitted)',
            },
          },
          required: ['content_type_id', 'fields'],
        },
      },
      {
        name: 'update_entry',
        description: 'Update fields on an existing Contentful entry by entry ID (requires current version for conflict detection)',
        inputSchema: {
          type: 'object',
          properties: {
            entry_id: {
              type: 'string',
              description: 'Contentful entry ID to update',
            },
            version: {
              type: 'number',
              description: 'Current entry version (from sys.version) — required for optimistic concurrency',
            },
            fields: {
              type: 'string',
              description: 'JSON object of field values to update, keyed by field ID then locale',
            },
            space_id: {
              type: 'string',
              description: 'Contentful space ID (uses config default if omitted)',
            },
            environment_id: {
              type: 'string',
              description: 'Environment ID (uses config default if omitted)',
            },
          },
          required: ['entry_id', 'version', 'fields'],
        },
      },
      {
        name: 'delete_entry',
        description: 'Delete an entry from a Contentful environment — entry must be unpublished first',
        inputSchema: {
          type: 'object',
          properties: {
            entry_id: {
              type: 'string',
              description: 'Contentful entry ID to delete',
            },
            space_id: {
              type: 'string',
              description: 'Contentful space ID (uses config default if omitted)',
            },
            environment_id: {
              type: 'string',
              description: 'Environment ID (uses config default if omitted)',
            },
          },
          required: ['entry_id'],
        },
      },
      {
        name: 'publish_entry',
        description: 'Publish a Contentful entry to make it available via the Delivery API',
        inputSchema: {
          type: 'object',
          properties: {
            entry_id: {
              type: 'string',
              description: 'Contentful entry ID to publish',
            },
            version: {
              type: 'number',
              description: 'Current entry version (from sys.version) — required for publish',
            },
            space_id: {
              type: 'string',
              description: 'Contentful space ID (uses config default if omitted)',
            },
            environment_id: {
              type: 'string',
              description: 'Environment ID (uses config default if omitted)',
            },
          },
          required: ['entry_id', 'version'],
        },
      },
      {
        name: 'unpublish_entry',
        description: 'Unpublish a Contentful entry to remove it from the Delivery API (entry remains as draft)',
        inputSchema: {
          type: 'object',
          properties: {
            entry_id: {
              type: 'string',
              description: 'Contentful entry ID to unpublish',
            },
            space_id: {
              type: 'string',
              description: 'Contentful space ID (uses config default if omitted)',
            },
            environment_id: {
              type: 'string',
              description: 'Environment ID (uses config default if omitted)',
            },
          },
          required: ['entry_id'],
        },
      },
      {
        name: 'list_assets',
        description: 'List media assets in a Contentful environment with optional search query and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            space_id: {
              type: 'string',
              description: 'Contentful space ID (uses config default if omitted)',
            },
            environment_id: {
              type: 'string',
              description: 'Environment ID (uses config default if omitted)',
            },
            query: {
              type: 'string',
              description: 'Full-text search query across asset titles and descriptions',
            },
            limit: {
              type: 'number',
              description: 'Number of assets to return (max 1000, default: 100)',
            },
            skip: {
              type: 'number',
              description: 'Number of assets to skip for pagination (default: 0)',
            },
            order: {
              type: 'string',
              description: 'Sort field with optional - prefix for descending (e.g. -sys.createdAt)',
            },
          },
        },
      },
      {
        name: 'get_asset',
        description: 'Retrieve a specific media asset by asset ID including file metadata and URLs',
        inputSchema: {
          type: 'object',
          properties: {
            asset_id: {
              type: 'string',
              description: 'Contentful asset ID',
            },
            space_id: {
              type: 'string',
              description: 'Contentful space ID (uses config default if omitted)',
            },
            environment_id: {
              type: 'string',
              description: 'Environment ID (uses config default if omitted)',
            },
          },
          required: ['asset_id'],
        },
      },
      {
        name: 'delete_asset',
        description: 'Delete a media asset from a Contentful environment — asset must be unpublished first',
        inputSchema: {
          type: 'object',
          properties: {
            asset_id: {
              type: 'string',
              description: 'Contentful asset ID to delete',
            },
            space_id: {
              type: 'string',
              description: 'Contentful space ID (uses config default if omitted)',
            },
            environment_id: {
              type: 'string',
              description: 'Environment ID (uses config default if omitted)',
            },
          },
          required: ['asset_id'],
        },
      },
      {
        name: 'publish_asset',
        description: 'Publish a Contentful asset to make it available via the Delivery API',
        inputSchema: {
          type: 'object',
          properties: {
            asset_id: {
              type: 'string',
              description: 'Contentful asset ID to publish',
            },
            version: {
              type: 'number',
              description: 'Current asset version (from sys.version) — required for publish',
            },
            space_id: {
              type: 'string',
              description: 'Contentful space ID (uses config default if omitted)',
            },
            environment_id: {
              type: 'string',
              description: 'Environment ID (uses config default if omitted)',
            },
          },
          required: ['asset_id', 'version'],
        },
      },
      {
        name: 'unpublish_asset',
        description: 'Unpublish a Contentful asset to remove it from the Delivery API',
        inputSchema: {
          type: 'object',
          properties: {
            asset_id: {
              type: 'string',
              description: 'Contentful asset ID to unpublish',
            },
            space_id: {
              type: 'string',
              description: 'Contentful space ID (uses config default if omitted)',
            },
            environment_id: {
              type: 'string',
              description: 'Environment ID (uses config default if omitted)',
            },
          },
          required: ['asset_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_spaces': return this.listSpaces(args);
        case 'get_space': return this.getSpace(args);
        case 'list_environments': return this.listEnvironments(args);
        case 'get_environment': return this.getEnvironment(args);
        case 'create_environment': return this.createEnvironment(args);
        case 'delete_environment': return this.deleteEnvironment(args);
        case 'list_content_types': return this.listContentTypes(args);
        case 'get_content_type': return this.getContentType(args);
        case 'list_entries': return this.listEntries(args);
        case 'get_entry': return this.getEntry(args);
        case 'create_entry': return this.createEntry(args);
        case 'update_entry': return this.updateEntry(args);
        case 'delete_entry': return this.deleteEntry(args);
        case 'publish_entry': return this.publishEntry(args);
        case 'unpublish_entry': return this.unpublishEntry(args);
        case 'list_assets': return this.listAssets(args);
        case 'get_asset': return this.getAsset(args);
        case 'delete_asset': return this.deleteAsset(args);
        case 'publish_asset': return this.publishAsset(args);
        case 'unpublish_asset': return this.unpublishAsset(args);
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
      'Content-Type': 'application/vnd.contentful.management.v1+json',
    };
  }

  private resolveSpace(args: Record<string, unknown>): string {
    return (args.space_id as string) || this.spaceId;
  }

  private resolveEnv(args: Record<string, unknown>): string {
    return (args.environment_id as string) || this.environmentId;
  }


  private async cmaGet(path: string, params: Record<string, string> = {}): Promise<ToolResult> {
    const qs = new URLSearchParams(params).toString();
    const url = `${this.baseUrl}${path}${qs ? '?' + qs : ''}`;
    const response = await this.fetchWithRetry(url, { method: 'GET', headers: this.headers });
    if (!response.ok) {
      const body = await response.text();
      return { content: [{ type: 'text', text: `API error ${response.status}: ${body}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async cmaPost(path: string, body: Record<string, unknown>, extraHeaders: Record<string, string> = {}): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: { ...this.headers, ...extraHeaders },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const err = await response.text();
      return { content: [{ type: 'text', text: `API error ${response.status}: ${err}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async cmaPut(path: string, body: Record<string, unknown>, extraHeaders: Record<string, string> = {}): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'PUT',
      headers: { ...this.headers, ...extraHeaders },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const err = await response.text();
      return { content: [{ type: 'text', text: `API error ${response.status}: ${err}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async cmaDelete(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'DELETE',
      headers: this.headers,
    });
    if (!response.ok) {
      const err = await response.text();
      return { content: [{ type: 'text', text: `API error ${response.status}: ${err}` }], isError: true };
    }
    return { content: [{ type: 'text', text: JSON.stringify({ deleted: true }) }], isError: false };
  }

  private async listSpaces(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      limit: String((args.limit as number) ?? 25),
      skip: String((args.skip as number) ?? 0),
    };
    return this.cmaGet('/spaces', params);
  }

  private async getSpace(args: Record<string, unknown>): Promise<ToolResult> {
    const spaceId = this.resolveSpace(args);
    if (!spaceId) return { content: [{ type: 'text', text: 'space_id is required (or set in config)' }], isError: true };
    return this.cmaGet(`/spaces/${spaceId}`);
  }

  private async listEnvironments(args: Record<string, unknown>): Promise<ToolResult> {
    const spaceId = this.resolveSpace(args);
    if (!spaceId) return { content: [{ type: 'text', text: 'space_id is required (or set in config)' }], isError: true };
    return this.cmaGet(`/spaces/${spaceId}/environments`);
  }

  private async getEnvironment(args: Record<string, unknown>): Promise<ToolResult> {
    const spaceId = this.resolveSpace(args);
    const envId = this.resolveEnv(args);
    if (!spaceId) return { content: [{ type: 'text', text: 'space_id is required (or set in config)' }], isError: true };
    return this.cmaGet(`/spaces/${spaceId}/environments/${envId}`);
  }

  private async createEnvironment(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.environment_id || !args.name) {
      return { content: [{ type: 'text', text: 'environment_id and name are required' }], isError: true };
    }
    const spaceId = this.resolveSpace(args);
    if (!spaceId) return { content: [{ type: 'text', text: 'space_id is required (or set in config)' }], isError: true };
    const body: Record<string, unknown> = { name: args.name };
    const headers: Record<string, string> = {};
    if (args.source_environment_id) {
      headers['X-Contentful-Source-Environment'] = args.source_environment_id as string;
    }
    return this.cmaPut(`/spaces/${spaceId}/environments/${encodeURIComponent(args.environment_id as string)}`, body, headers);
  }

  private async deleteEnvironment(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.environment_id) return { content: [{ type: 'text', text: 'environment_id is required' }], isError: true };
    const spaceId = this.resolveSpace(args);
    if (!spaceId) return { content: [{ type: 'text', text: 'space_id is required (or set in config)' }], isError: true };
    return this.cmaDelete(`/spaces/${spaceId}/environments/${encodeURIComponent(args.environment_id as string)}`);
  }

  private async listContentTypes(args: Record<string, unknown>): Promise<ToolResult> {
    const spaceId = this.resolveSpace(args);
    const envId = this.resolveEnv(args);
    if (!spaceId) return { content: [{ type: 'text', text: 'space_id is required (or set in config)' }], isError: true };
    const params: Record<string, string> = {
      limit: String((args.limit as number) ?? 100),
      skip: String((args.skip as number) ?? 0),
    };
    return this.cmaGet(`/spaces/${spaceId}/environments/${envId}/content_types`, params);
  }

  private async getContentType(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.content_type_id) return { content: [{ type: 'text', text: 'content_type_id is required' }], isError: true };
    const spaceId = this.resolveSpace(args);
    const envId = this.resolveEnv(args);
    if (!spaceId) return { content: [{ type: 'text', text: 'space_id is required (or set in config)' }], isError: true };
    return this.cmaGet(`/spaces/${spaceId}/environments/${envId}/content_types/${encodeURIComponent(args.content_type_id as string)}`);
  }

  private async listEntries(args: Record<string, unknown>): Promise<ToolResult> {
    const spaceId = this.resolveSpace(args);
    const envId = this.resolveEnv(args);
    if (!spaceId) return { content: [{ type: 'text', text: 'space_id is required (or set in config)' }], isError: true };
    const params: Record<string, string> = {
      limit: String((args.limit as number) ?? 100),
      skip: String((args.skip as number) ?? 0),
    };
    if (args.content_type) params.content_type = args.content_type as string;
    if (args.query) params.query = args.query as string;
    if (args.order) params.order = args.order as string;
    if (args.include !== undefined) params.include = String(args.include);
    return this.cmaGet(`/spaces/${spaceId}/environments/${envId}/entries`, params);
  }

  private async getEntry(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.entry_id) return { content: [{ type: 'text', text: 'entry_id is required' }], isError: true };
    const spaceId = this.resolveSpace(args);
    const envId = this.resolveEnv(args);
    if (!spaceId) return { content: [{ type: 'text', text: 'space_id is required (or set in config)' }], isError: true };
    return this.cmaGet(`/spaces/${spaceId}/environments/${envId}/entries/${encodeURIComponent(args.entry_id as string)}`);
  }

  private async createEntry(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.content_type_id || !args.fields) {
      return { content: [{ type: 'text', text: 'content_type_id and fields are required' }], isError: true };
    }
    const spaceId = this.resolveSpace(args);
    const envId = this.resolveEnv(args);
    if (!spaceId) return { content: [{ type: 'text', text: 'space_id is required (or set in config)' }], isError: true };
    let fieldsObj: unknown;
    try { fieldsObj = JSON.parse(args.fields as string); } catch {
      return { content: [{ type: 'text', text: 'fields must be valid JSON' }], isError: true };
    }
    return this.cmaPost(
      `/spaces/${spaceId}/environments/${envId}/entries`,
      { fields: fieldsObj },
      { 'X-Contentful-Content-Type': args.content_type_id as string },
    );
  }

  private async updateEntry(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.entry_id || args.version === undefined || !args.fields) {
      return { content: [{ type: 'text', text: 'entry_id, version, and fields are required' }], isError: true };
    }
    const spaceId = this.resolveSpace(args);
    const envId = this.resolveEnv(args);
    if (!spaceId) return { content: [{ type: 'text', text: 'space_id is required (or set in config)' }], isError: true };
    let fieldsObj: unknown;
    try { fieldsObj = JSON.parse(args.fields as string); } catch {
      return { content: [{ type: 'text', text: 'fields must be valid JSON' }], isError: true };
    }
    return this.cmaPut(
      `/spaces/${spaceId}/environments/${envId}/entries/${encodeURIComponent(args.entry_id as string)}`,
      { fields: fieldsObj },
      { 'X-Contentful-Version': String(args.version) },
    );
  }

  private async deleteEntry(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.entry_id) return { content: [{ type: 'text', text: 'entry_id is required' }], isError: true };
    const spaceId = this.resolveSpace(args);
    const envId = this.resolveEnv(args);
    if (!spaceId) return { content: [{ type: 'text', text: 'space_id is required (or set in config)' }], isError: true };
    return this.cmaDelete(`/spaces/${spaceId}/environments/${envId}/entries/${encodeURIComponent(args.entry_id as string)}`);
  }

  private async publishEntry(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.entry_id || args.version === undefined) {
      return { content: [{ type: 'text', text: 'entry_id and version are required' }], isError: true };
    }
    const spaceId = this.resolveSpace(args);
    const envId = this.resolveEnv(args);
    if (!spaceId) return { content: [{ type: 'text', text: 'space_id is required (or set in config)' }], isError: true };
    return this.cmaPut(
      `/spaces/${spaceId}/environments/${envId}/entries/${encodeURIComponent(args.entry_id as string)}/published`,
      {},
      { 'X-Contentful-Version': String(args.version) },
    );
  }

  private async unpublishEntry(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.entry_id) return { content: [{ type: 'text', text: 'entry_id is required' }], isError: true };
    const spaceId = this.resolveSpace(args);
    const envId = this.resolveEnv(args);
    if (!spaceId) return { content: [{ type: 'text', text: 'space_id is required (or set in config)' }], isError: true };
    return this.cmaDelete(`/spaces/${spaceId}/environments/${envId}/entries/${encodeURIComponent(args.entry_id as string)}/published`);
  }

  private async listAssets(args: Record<string, unknown>): Promise<ToolResult> {
    const spaceId = this.resolveSpace(args);
    const envId = this.resolveEnv(args);
    if (!spaceId) return { content: [{ type: 'text', text: 'space_id is required (or set in config)' }], isError: true };
    const params: Record<string, string> = {
      limit: String((args.limit as number) ?? 100),
      skip: String((args.skip as number) ?? 0),
    };
    if (args.query) params.query = args.query as string;
    if (args.order) params.order = args.order as string;
    return this.cmaGet(`/spaces/${spaceId}/environments/${envId}/assets`, params);
  }

  private async getAsset(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.asset_id) return { content: [{ type: 'text', text: 'asset_id is required' }], isError: true };
    const spaceId = this.resolveSpace(args);
    const envId = this.resolveEnv(args);
    if (!spaceId) return { content: [{ type: 'text', text: 'space_id is required (or set in config)' }], isError: true };
    return this.cmaGet(`/spaces/${spaceId}/environments/${envId}/assets/${encodeURIComponent(args.asset_id as string)}`);
  }

  private async deleteAsset(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.asset_id) return { content: [{ type: 'text', text: 'asset_id is required' }], isError: true };
    const spaceId = this.resolveSpace(args);
    const envId = this.resolveEnv(args);
    if (!spaceId) return { content: [{ type: 'text', text: 'space_id is required (or set in config)' }], isError: true };
    return this.cmaDelete(`/spaces/${spaceId}/environments/${envId}/assets/${encodeURIComponent(args.asset_id as string)}`);
  }

  private async publishAsset(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.asset_id || args.version === undefined) {
      return { content: [{ type: 'text', text: 'asset_id and version are required' }], isError: true };
    }
    const spaceId = this.resolveSpace(args);
    const envId = this.resolveEnv(args);
    if (!spaceId) return { content: [{ type: 'text', text: 'space_id is required (or set in config)' }], isError: true };
    return this.cmaPut(
      `/spaces/${spaceId}/environments/${envId}/assets/${encodeURIComponent(args.asset_id as string)}/published`,
      {},
      { 'X-Contentful-Version': String(args.version) },
    );
  }

  private async unpublishAsset(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.asset_id) return { content: [{ type: 'text', text: 'asset_id is required' }], isError: true };
    const spaceId = this.resolveSpace(args);
    const envId = this.resolveEnv(args);
    if (!spaceId) return { content: [{ type: 'text', text: 'space_id is required (or set in config)' }], isError: true };
    return this.cmaDelete(`/spaces/${spaceId}/environments/${envId}/assets/${encodeURIComponent(args.asset_id as string)}/published`);
  }
}

/**
 * Canva MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://www.canva.com/help/mcp-canva-usage/ — transport: streamable-HTTP, auth: OAuth2
//   Hosted on canva.com (AI Connector). Official, vendor-maintained, last updated 2026-01-29.
//   Exposes 4 tools: create_design, export_design, get_design, list_designs.
//   Criteria check: official=yes, maintained=yes, tools=4 (FAILS ≥10 threshold), transport=streamable-HTTP.
//   Decision: use-rest-api — MCP fails the 10+ tools criterion (only 4 tools).
// Also: https://www.canva.dev/docs/apps/mcp-server/ (Dev MCP) — developer tooling only, not API management.
// Our adapter covers: 17 tools (designs, folders, assets metadata, brand templates, exports, autofill, users). Vendor MCP covers: 4 tools (strict subset of our adapter).
// Recommendation: use-rest-api — vendor MCP only has 4 tools. Our REST adapter provides fuller coverage.
//
// Base URL: https://api.canva.com/rest/v1
// Auth: OAuth2 Authorization Code with PKCE — Bearer access token in Authorization header
//       Token endpoint: POST https://api.canva.com/rest/v1/oauth/token
//       Auth endpoint:  https://www.canva.com/api/oauth/authorize
// Docs: https://www.canva.dev/docs/connect/
// Rate limits: Designs list: 100 req/min per user. Exports: 750 per 5-min window / 5,000 per 24h per integration;
//              75 per 5-min window / 500 per 24h per user. Other endpoints vary.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface CanvaConfig {
  accessToken: string;
  clientId?: string;
  clientSecret?: string;
  baseUrl?: string;
}

export class CanvaMCPServer extends MCPAdapterBase {
  private readonly accessToken: string;
  private readonly baseUrl: string;

  constructor(config: CanvaConfig) {
    super();
    this.accessToken = config.accessToken;
    this.baseUrl = config.baseUrl ?? 'https://api.canva.com/rest/v1';
  }

  static catalog() {
    return {
      name: 'canva',
      displayName: 'Canva',
      version: '1.0.0',
      category: 'misc',
      keywords: [
        'canva', 'design', 'graphic', 'template', 'brand', 'asset', 'image',
        'export', 'pdf', 'presentation', 'marketing', 'creative', 'visual',
        'folder', 'autofill', 'comment', 'collaboration',
      ],
      toolNames: [
        'list_designs', 'get_design', 'create_design',
        'list_folders', 'get_folder', 'create_folder', 'move_to_folder',
        'get_asset', 'update_asset', 'delete_asset',
        'list_brand_templates', 'get_brand_template',
        'create_export_job', 'get_export_job',
        'create_autofill_job', 'get_autofill_job',
        'get_user_profile',
      ],
      description: 'Canva Connect API: manage designs, folders, asset metadata, brand templates, exports, autofill personalization, and user profiles.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_designs',
        description: 'List all Canva designs for the authenticated user with optional keyword search and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Keyword search to filter designs by title',
            },
            continuation: {
              type: 'string',
              description: 'Pagination continuation token from a previous response',
            },
            ownership: {
              type: 'string',
              description: 'Filter by ownership: owned (user owns), shared (shared with user), any (default: any)',
            },
          },
        },
      },
      {
        name: 'get_design',
        description: 'Get metadata and details for a specific Canva design by its design ID',
        inputSchema: {
          type: 'object',
          properties: {
            design_id: {
              type: 'string',
              description: 'Canva design ID (e.g. DAFVztcSCxc)',
            },
          },
          required: ['design_id'],
        },
      },
      {
        name: 'create_design',
        description: 'Create a new blank Canva design with optional design type, title, width, and height',
        inputSchema: {
          type: 'object',
          properties: {
            design_type: {
              type: 'string',
              description: 'Preset design type: presentation, doc, whiteboard, logo, poster, video, social_media. Omit for custom dimensions.',
            },
            title: {
              type: 'string',
              description: 'Title for the new design',
            },
            width: {
              type: 'number',
              description: 'Custom width in pixels (use with height for custom size; ignored if design_type is set)',
            },
            height: {
              type: 'number',
              description: 'Custom height in pixels (use with width for custom size; ignored if design_type is set)',
            },
            unit: {
              type: 'string',
              description: 'Unit for custom dimensions: px (pixels), cm, mm, in (default: px)',
            },
          },
        },
      },
      {
        name: 'list_folders',
        description: 'List folders in the user content library with optional pagination, starting from root or a specific folder',
        inputSchema: {
          type: 'object',
          properties: {
            folder_id: {
              type: 'string',
              description: 'Parent folder ID to list contents of; use "root" for top-level folders (default: root)',
            },
            continuation: {
              type: 'string',
              description: 'Pagination continuation token from a previous response',
            },
          },
        },
      },
      {
        name: 'get_folder',
        description: 'Get metadata for a specific Canva folder by its folder ID',
        inputSchema: {
          type: 'object',
          properties: {
            folder_id: {
              type: 'string',
              description: 'Canva folder ID to retrieve',
            },
          },
          required: ['folder_id'],
        },
      },
      {
        name: 'create_folder',
        description: 'Create a new folder in the user content library under a specified parent folder',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Name for the new folder',
            },
            parent_folder_id: {
              type: 'string',
              description: 'Parent folder ID to create the folder in; use "root" for the top level (default: root)',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'move_to_folder',
        description: 'Move a design or asset into a specific Canva folder',
        inputSchema: {
          type: 'object',
          properties: {
            folder_id: {
              type: 'string',
              description: 'Destination folder ID to move the item into',
            },
            item_id: {
              type: 'string',
              description: 'ID of the design or asset to move',
            },
          },
          required: ['folder_id', 'item_id'],
        },
      },
      {
        name: 'get_asset',
        description: 'Get metadata and download URL for a specific Canva asset by its asset ID',
        inputSchema: {
          type: 'object',
          properties: {
            asset_id: {
              type: 'string',
              description: 'Canva asset ID to retrieve',
            },
          },
          required: ['asset_id'],
        },
      },
      {
        name: 'update_asset',
        description: 'Update the name or tags of an existing Canva asset',
        inputSchema: {
          type: 'object',
          properties: {
            asset_id: {
              type: 'string',
              description: 'Canva asset ID to update',
            },
            name: {
              type: 'string',
              description: 'New name for the asset',
            },
            tags: {
              type: 'array',
              description: 'Array of string tags to assign to the asset (replaces existing tags)',
            },
          },
          required: ['asset_id'],
        },
      },
      {
        name: 'delete_asset',
        description: 'Permanently delete a Canva asset from the user upload folder',
        inputSchema: {
          type: 'object',
          properties: {
            asset_id: {
              type: 'string',
              description: 'Canva asset ID to delete',
            },
          },
          required: ['asset_id'],
        },
      },
      {
        name: 'list_brand_templates',
        description: 'List brand templates available to the authenticated user with optional keyword search and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Keyword search to filter brand templates by title',
            },
            continuation: {
              type: 'string',
              description: 'Pagination continuation token from a previous response',
            },
            dataset: {
              type: 'string',
              description: 'Filter templates that contain a specific dataset name',
            },
          },
        },
      },
      {
        name: 'get_brand_template',
        description: 'Get metadata and dataset schema for a specific Canva brand template by its template ID',
        inputSchema: {
          type: 'object',
          properties: {
            brand_template_id: {
              type: 'string',
              description: 'Canva brand template ID',
            },
          },
          required: ['brand_template_id'],
        },
      },
      {
        name: 'create_export_job',
        description: 'Create an async job to export a Canva design to PDF, PNG, JPG, GIF, PPTX, or MP4 format',
        inputSchema: {
          type: 'object',
          properties: {
            design_id: {
              type: 'string',
              description: 'Canva design ID to export',
            },
            format_type: {
              type: 'string',
              description: 'Export format type: pdf, png, jpg, gif, pptx, mp4',
            },
            export_quality: {
              type: 'string',
              description: 'Export quality: regular or pro (default: regular). Applies to pdf, jpg, png.',
            },
            pages: {
              type: 'array',
              description: 'Array of 1-based page numbers to export. Omit to export all pages.',
            },
          },
          required: ['design_id', 'format_type'],
        },
      },
      {
        name: 'get_export_job',
        description: 'Get the status and download URL of an async Canva design export job by export ID',
        inputSchema: {
          type: 'object',
          properties: {
            export_id: {
              type: 'string',
              description: 'Export job ID returned from create_export_job',
            },
          },
          required: ['export_id'],
        },
      },
      {
        name: 'create_autofill_job',
        description: 'Create an async autofill job to generate a personalized design from a brand template with input data',
        inputSchema: {
          type: 'object',
          properties: {
            brand_template_id: {
              type: 'string',
              description: 'Canva brand template ID to autofill',
            },
            title: {
              type: 'string',
              description: 'Title for the generated design',
            },
            data: {
              type: 'object',
              description: 'Key-value object of dataset field names to values for autofill (e.g. {"name": "Alice", "company": "Acme"})',
            },
          },
          required: ['brand_template_id', 'data'],
        },
      },
      {
        name: 'get_autofill_job',
        description: 'Get the status and resulting design ID of an async Canva autofill job by job ID',
        inputSchema: {
          type: 'object',
          properties: {
            job_id: {
              type: 'string',
              description: 'Autofill job ID returned from create_autofill_job',
            },
          },
          required: ['job_id'],
        },
      },
      {
        name: 'get_user_profile',
        description: 'Get the authenticated user profile including display name, email, and team information',
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
        case 'list_designs':
          return this.listDesigns(args);
        case 'get_design':
          return this.getDesign(args);
        case 'create_design':
          return this.createDesign(args);
        case 'list_folders':
          return this.listFolders(args);
        case 'get_folder':
          return this.getFolder(args);
        case 'create_folder':
          return this.createFolder(args);
        case 'move_to_folder':
          return this.moveToFolder(args);
        case 'get_asset':
          return this.getAsset(args);
        case 'update_asset':
          return this.updateAsset(args);
        case 'delete_asset':
          return this.deleteAsset(args);
        case 'list_brand_templates':
          return this.listBrandTemplates(args);
        case 'get_brand_template':
          return this.getBrandTemplate(args);
        case 'create_export_job':
          return this.createExportJob(args);
        case 'get_export_job':
          return this.getExportJob(args);
        case 'create_autofill_job':
          return this.createAutofillJob(args);
        case 'get_autofill_job':
          return this.getAutofillJob(args);
        case 'get_user_profile':
          return this.getUserProfile();
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
      'Content-Type': 'application/json',
    };
  }

  private async canvaGet(path: string, params?: Record<string, string>): Promise<ToolResult> {
    const qs = params && Object.keys(params).length > 0 ? '?' + new URLSearchParams(params).toString() : '';
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}${qs}`, { method: 'GET', headers: this.headers });
    if (!response.ok) {
      const body = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `API error: ${response.status} — ${body}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async canvaPost(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const errBody = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `API error: ${response.status} — ${errBody}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async canvaPatch(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'PATCH',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const errBody = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `API error: ${response.status} — ${errBody}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async canvaDelete(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, { method: 'DELETE', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: JSON.stringify({ success: true }) }], isError: false };
  }

  private async listDesigns(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (args.query) params.query = args.query as string;
    if (args.continuation) params.continuation = args.continuation as string;
    if (args.ownership) params.ownership = args.ownership as string;
    return this.canvaGet('/designs', params);
  }

  private async getDesign(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.design_id) return { content: [{ type: 'text', text: 'design_id is required' }], isError: true };
    return this.canvaGet(`/designs/${encodeURIComponent(args.design_id as string)}`);
  }

  private async createDesign(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {};
    if (args.design_type) {
      body.design_type = { type: args.design_type };
    } else if (args.width && args.height) {
      body.design_type = {
        type: 'custom',
        width: args.width,
        height: args.height,
        unit: args.unit ?? 'px',
      };
    }
    if (args.title) body.title = args.title;
    return this.canvaPost('/designs', body);
  }

  private async listFolders(args: Record<string, unknown>): Promise<ToolResult> {
    const folderId = (args.folder_id as string) ?? 'root';
    const params: Record<string, string> = {};
    if (args.continuation) params.continuation = args.continuation as string;
    return this.canvaGet(`/folders/${folderId}/items`, params);
  }

  private async getFolder(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.folder_id) return { content: [{ type: 'text', text: 'folder_id is required' }], isError: true };
    return this.canvaGet(`/folders/${encodeURIComponent(args.folder_id as string)}`);
  }

  private async createFolder(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name) return { content: [{ type: 'text', text: 'name is required' }], isError: true };
    const body: Record<string, unknown> = {
      name: args.name,
      parent_folder_id: (args.parent_folder_id as string) ?? 'root',
    };
    return this.canvaPost('/folders', body);
  }

  private async moveToFolder(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.folder_id || !args.item_id) return { content: [{ type: 'text', text: 'folder_id and item_id are required' }], isError: true };
    return this.canvaPost('/folders/move', { to_folder_id: args.folder_id, item_id: args.item_id });
  }

  private async getAsset(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.asset_id) return { content: [{ type: 'text', text: 'asset_id is required' }], isError: true };
    return this.canvaGet(`/assets/${encodeURIComponent(args.asset_id as string)}`);
  }

  private async updateAsset(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.asset_id) return { content: [{ type: 'text', text: 'asset_id is required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.name) body.name = args.name;
    if (args.tags) body.tags = args.tags;
    return this.canvaPatch(`/assets/${encodeURIComponent(args.asset_id as string)}`, body);
  }

  private async deleteAsset(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.asset_id) return { content: [{ type: 'text', text: 'asset_id is required' }], isError: true };
    return this.canvaDelete(`/assets/${encodeURIComponent(args.asset_id as string)}`);
  }

  private async listBrandTemplates(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (args.query) params.query = args.query as string;
    if (args.continuation) params.continuation = args.continuation as string;
    if (args.dataset) params.dataset = args.dataset as string;
    return this.canvaGet('/brand-templates', params);
  }

  private async getBrandTemplate(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.brand_template_id) return { content: [{ type: 'text', text: 'brand_template_id is required' }], isError: true };
    return this.canvaGet(`/brand-templates/${encodeURIComponent(args.brand_template_id as string)}`);
  }

  private async createExportJob(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.design_id || !args.format_type) return { content: [{ type: 'text', text: 'design_id and format_type are required' }], isError: true };
    const format: Record<string, unknown> = { type: args.format_type };
    if (args.export_quality) format.export_quality = args.export_quality;
    if (Array.isArray(args.pages)) format.pages = args.pages;
    const body: Record<string, unknown> = {
      design_id: args.design_id,
      format,
    };
    return this.canvaPost('/exports', body);
  }

  private async getExportJob(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.export_id) return { content: [{ type: 'text', text: 'export_id is required' }], isError: true };
    return this.canvaGet(`/exports/${encodeURIComponent(args.export_id as string)}`);
  }

  private async createAutofillJob(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.brand_template_id || !args.data) return { content: [{ type: 'text', text: 'brand_template_id and data are required' }], isError: true };
    const body: Record<string, unknown> = {
      brand_template_id: args.brand_template_id,
      data: args.data,
    };
    if (args.title) body.title = args.title;
    return this.canvaPost('/autofills', body);
  }

  private async getAutofillJob(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.job_id) return { content: [{ type: 'text', text: 'job_id is required' }], isError: true };
    return this.canvaGet(`/autofills/${encodeURIComponent(args.job_id as string)}`);
  }

  private async getUserProfile(): Promise<ToolResult> {
    return this.canvaGet('/users/me/profile');
  }
}

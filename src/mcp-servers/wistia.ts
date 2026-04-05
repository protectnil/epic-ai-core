/**
 * Wistia MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// No official Wistia MCP server was found on GitHub, npmjs.com, or Wistia developer docs.
//
// Note: Wistia introduced a date-versioned "modern" API (e.g. X-Wistia-Api-Version: 2026-01) alongside the
//   perpetually supported v1 API. This adapter uses v1 (/v1/ prefix). The modern API adds Folders, Webinars,
//   Allowed Domains, Customizations, and Taggings endpoints not covered here. v1 is perpetually supported.
// Note: list_project_medias calls GET /v1/projects/{hashed_id}.json — the same endpoint as get_project.
//   In Wistia v1, the project detail response includes media items inline; there is no separate
//   list-project-medias endpoint. The tool is functionally correct but returns identical data to get_project.
//
// Base URL: https://api.wistia.com/v1
// Auth: Bearer token (API password from Account Settings → API Access)
// Docs: https://docs.wistia.com/reference/getting-started-with-the-data-api
// Rate limits: 600 requests/minute across api.wistia.com and upload.wistia.com

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface WistiaConfig {
  apiToken: string;
  baseUrl?: string;
}

export class WistiaMCPServer extends MCPAdapterBase {
  private readonly apiToken: string;
  private readonly baseUrl: string;

  constructor(config: WistiaConfig) {
    super();
    this.apiToken = config.apiToken;
    this.baseUrl = config.baseUrl || 'https://api.wistia.com/v1';
  }

  static catalog() {
    return {
      name: 'wistia',
      displayName: 'Wistia',
      version: '1.0.0',
      category: 'misc',
      keywords: ['wistia', 'video', 'media', 'hosting', 'analytics', 'embed', 'projects', 'captions', 'stats'],
      toolNames: [
        'list_medias', 'get_media', 'update_media', 'delete_media', 'copy_media',
        'list_projects', 'get_project', 'create_project', 'update_project', 'delete_project', 'copy_project',
        'list_project_medias',
        'get_account',
        'list_captions', 'get_captions', 'delete_captions',
        'get_media_stats', 'get_project_stats', 'get_account_stats',
        'list_events',
      ],
      description: 'Wistia video hosting: manage media and projects, retrieve engagement analytics, view captions, and track account-level stats.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_medias',
        description: 'List media files in Wistia with optional filters by project, name, type, and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: { type: 'string', description: 'Filter by project hashed ID' },
            name: { type: 'string', description: 'Filter by media name (exact match)' },
            type: { type: 'string', description: 'Filter by type: Video, Audio, Image, PdfDocument, MicrosoftOfficeDocument, Swf, UnknownType' },
            page: { type: 'number', description: 'Page number for pagination (default: 1)' },
            per_page: { type: 'number', description: 'Results per page (max 100, default: 10)' },
            sort_by: { type: 'string', description: 'Sort field: name, created, updated, duration (default: name)' },
            sort_direction: { type: 'number', description: 'Sort direction: 1 for asc, 0 for desc (default: 1)' },
          },
        },
      },
      {
        name: 'get_media',
        description: 'Get details, embed codes, and asset URLs for a specific Wistia media by hashed ID',
        inputSchema: {
          type: 'object',
          properties: {
            hashed_id: { type: 'string', description: 'Wistia media hashed ID (e.g. abc1234xyz)' },
          },
          required: ['hashed_id'],
        },
      },
      {
        name: 'update_media',
        description: 'Update metadata fields (name, description, thumbnail) for a Wistia media',
        inputSchema: {
          type: 'object',
          properties: {
            hashed_id: { type: 'string', description: 'Wistia media hashed ID' },
            name: { type: 'string', description: 'New name for the media' },
            description: { type: 'string', description: 'New description for the media' },
            thumbnail_media_id: { type: 'string', description: 'Hashed ID of an image media to use as thumbnail' },
          },
          required: ['hashed_id'],
        },
      },
      {
        name: 'delete_media',
        description: 'Delete a Wistia media permanently by hashed ID',
        inputSchema: {
          type: 'object',
          properties: {
            hashed_id: { type: 'string', description: 'Wistia media hashed ID to delete' },
          },
          required: ['hashed_id'],
        },
      },
      {
        name: 'copy_media',
        description: 'Copy a Wistia media into the same or a different project',
        inputSchema: {
          type: 'object',
          properties: {
            hashed_id: { type: 'string', description: 'Hashed ID of the media to copy' },
            project_id: { type: 'string', description: 'Target project hashed ID (defaults to original project)' },
            owner: { type: 'string', description: 'Email of user to assign the new media to' },
          },
          required: ['hashed_id'],
        },
      },
      {
        name: 'list_projects',
        description: 'List all Wistia projects with optional sorting and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            page: { type: 'number', description: 'Page number for pagination (default: 1)' },
            per_page: { type: 'number', description: 'Results per page (max 100, default: 10)' },
            sort_by: { type: 'string', description: 'Sort field: name, created, updated (default: name)' },
            sort_direction: { type: 'number', description: 'Sort direction: 1 for asc, 0 for desc (default: 1)' },
          },
        },
      },
      {
        name: 'get_project',
        description: 'Get details for a specific Wistia project including media list by project hashed ID',
        inputSchema: {
          type: 'object',
          properties: {
            hashed_id: { type: 'string', description: 'Wistia project hashed ID' },
          },
          required: ['hashed_id'],
        },
      },
      {
        name: 'create_project',
        description: 'Create a new Wistia project with a name and optional description and privacy settings',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Name of the new project' },
            anonymize_visitors: { type: 'boolean', description: 'Anonymize visitor tracking (default: false)' },
          },
          required: ['name'],
        },
      },
      {
        name: 'update_project',
        description: 'Update the name or anonymize settings for a Wistia project',
        inputSchema: {
          type: 'object',
          properties: {
            hashed_id: { type: 'string', description: 'Wistia project hashed ID' },
            name: { type: 'string', description: 'New project name' },
            anonymize_visitors: { type: 'boolean', description: 'Anonymize visitor tracking' },
          },
          required: ['hashed_id'],
        },
      },
      {
        name: 'delete_project',
        description: 'Delete a Wistia project and all its media permanently',
        inputSchema: {
          type: 'object',
          properties: {
            hashed_id: { type: 'string', description: 'Wistia project hashed ID to delete' },
          },
          required: ['hashed_id'],
        },
      },
      {
        name: 'copy_project',
        description: 'Copy a Wistia project and all its media into a new project',
        inputSchema: {
          type: 'object',
          properties: {
            hashed_id: { type: 'string', description: 'Hashed ID of the project to copy' },
            owner: { type: 'string', description: 'Email of the user to assign the copied project to' },
          },
          required: ['hashed_id'],
        },
      },
      {
        name: 'list_project_medias',
        description: 'List all media files within a specific Wistia project',
        inputSchema: {
          type: 'object',
          properties: {
            hashed_id: { type: 'string', description: 'Wistia project hashed ID' },
          },
          required: ['hashed_id'],
        },
      },
      {
        name: 'get_account',
        description: 'Get Wistia account information including name, URL, and media usage',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'list_captions',
        description: 'List all caption tracks available for a Wistia media',
        inputSchema: {
          type: 'object',
          properties: {
            hashed_id: { type: 'string', description: 'Wistia media hashed ID' },
          },
          required: ['hashed_id'],
        },
      },
      {
        name: 'get_captions',
        description: 'Get caption content for a specific language track on a Wistia media',
        inputSchema: {
          type: 'object',
          properties: {
            hashed_id: { type: 'string', description: 'Wistia media hashed ID' },
            language_code: { type: 'string', description: 'BCP-47 language code (e.g. en, es, fr)' },
          },
          required: ['hashed_id', 'language_code'],
        },
      },
      {
        name: 'delete_captions',
        description: 'Delete a caption track for a specific language from a Wistia media',
        inputSchema: {
          type: 'object',
          properties: {
            hashed_id: { type: 'string', description: 'Wistia media hashed ID' },
            language_code: { type: 'string', description: 'BCP-47 language code of the caption track to delete' },
          },
          required: ['hashed_id', 'language_code'],
        },
      },
      {
        name: 'get_media_stats',
        description: 'Get engagement stats (plays, hours watched, visitor count) for a Wistia media',
        inputSchema: {
          type: 'object',
          properties: {
            hashed_id: { type: 'string', description: 'Wistia media hashed ID' },
          },
          required: ['hashed_id'],
        },
      },
      {
        name: 'get_project_stats',
        description: 'Get aggregate video stats for all media in a Wistia project',
        inputSchema: {
          type: 'object',
          properties: {
            hashed_id: { type: 'string', description: 'Wistia project hashed ID' },
          },
          required: ['hashed_id'],
        },
      },
      {
        name: 'get_account_stats',
        description: 'Get account-level aggregate stats including total plays and load count',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'list_events',
        description: 'List individual viewer events for a Wistia media with optional date range and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            media_id: { type: 'string', description: 'Wistia media hashed ID' },
            start_date: { type: 'string', description: 'Start date filter in YYYY-MM-DD format' },
            end_date: { type: 'string', description: 'End date filter in YYYY-MM-DD format' },
            page: { type: 'number', description: 'Page number for pagination (default: 1)' },
            per_page: { type: 'number', description: 'Results per page (max 100, default: 10)' },
          },
          required: ['media_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_medias': return this.listMedias(args);
        case 'get_media': return this.getMedia(args);
        case 'update_media': return this.updateMedia(args);
        case 'delete_media': return this.deleteMedia(args);
        case 'copy_media': return this.copyMedia(args);
        case 'list_projects': return this.listProjects(args);
        case 'get_project': return this.getProject(args);
        case 'create_project': return this.createProject(args);
        case 'update_project': return this.updateProject(args);
        case 'delete_project': return this.deleteProject(args);
        case 'copy_project': return this.copyProject(args);
        case 'list_project_medias': return this.listProjectMedias(args);
        case 'get_account': return this.getAccount();
        case 'list_captions': return this.listCaptions(args);
        case 'get_captions': return this.getCaptions(args);
        case 'delete_captions': return this.deleteCaptions(args);
        case 'get_media_stats': return this.getMediaStats(args);
        case 'get_project_stats': return this.getProjectStats(args);
        case 'get_account_stats': return this.getAccountStats();
        case 'list_events': return this.listEvents(args);
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
    return { Authorization: `Bearer ${this.apiToken}` };
  }


  private async get(path: string, params?: Record<string, string>): Promise<ToolResult> {
    const qs = params && Object.keys(params).length > 0 ? '?' + new URLSearchParams(params).toString() : '';
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}${qs}`, { headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async post(path: string, params: Record<string, string>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: { ...this.headers, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(params).toString(),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async put(path: string, params: Record<string, string>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'PUT',
      headers: { ...this.headers, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(params).toString(),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async del(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, { method: 'DELETE', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json().catch(() => ({ deleted: true }));
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listMedias(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      page: String((args.page as number) ?? 1),
      per_page: String((args.per_page as number) ?? 10),
    };
    if (args.project_id) params.project_id = args.project_id as string;
    if (args.name) params.name = args.name as string;
    if (args.type) params.type = args.type as string;
    if (args.sort_by) params.sort_by = args.sort_by as string;
    if (args.sort_direction !== undefined) params.sort_direction = String(args.sort_direction);
    return this.get('/medias.json', params);
  }

  private async getMedia(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.hashed_id) return { content: [{ type: 'text', text: 'hashed_id is required' }], isError: true };
    return this.get(`/medias/${encodeURIComponent(args.hashed_id as string)}.json`);
  }

  private async updateMedia(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.hashed_id) return { content: [{ type: 'text', text: 'hashed_id is required' }], isError: true };
    const params: Record<string, string> = {};
    if (args.name) params['media[name]'] = args.name as string;
    if (args.description) params['media[description]'] = args.description as string;
    if (args.thumbnail_media_id) params['media[thumbnail_media_id]'] = args.thumbnail_media_id as string;
    return this.put(`/medias/${encodeURIComponent(args.hashed_id as string)}.json`, params);
  }

  private async deleteMedia(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.hashed_id) return { content: [{ type: 'text', text: 'hashed_id is required' }], isError: true };
    return this.del(`/medias/${encodeURIComponent(args.hashed_id as string)}.json`);
  }

  private async copyMedia(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.hashed_id) return { content: [{ type: 'text', text: 'hashed_id is required' }], isError: true };
    const params: Record<string, string> = {};
    if (args.project_id) params.project_id = args.project_id as string;
    if (args.owner) params.owner = args.owner as string;
    return this.post(`/medias/${encodeURIComponent(args.hashed_id as string)}/copy.json`, params);
  }

  private async listProjects(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      page: String((args.page as number) ?? 1),
      per_page: String((args.per_page as number) ?? 10),
    };
    if (args.sort_by) params.sort_by = args.sort_by as string;
    if (args.sort_direction !== undefined) params.sort_direction = String(args.sort_direction);
    return this.get('/projects.json', params);
  }

  private async getProject(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.hashed_id) return { content: [{ type: 'text', text: 'hashed_id is required' }], isError: true };
    return this.get(`/projects/${encodeURIComponent(args.hashed_id as string)}.json`);
  }

  private async createProject(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name) return { content: [{ type: 'text', text: 'name is required' }], isError: true };
    const params: Record<string, string> = { 'project[name]': args.name as string };
    if (typeof args.anonymize_visitors === 'boolean') {
      params['project[anonymize_visitors]'] = String(args.anonymize_visitors);
    }
    return this.post('/projects.json', params);
  }

  private async updateProject(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.hashed_id) return { content: [{ type: 'text', text: 'hashed_id is required' }], isError: true };
    const params: Record<string, string> = {};
    if (args.name) params['project[name]'] = args.name as string;
    if (typeof args.anonymize_visitors === 'boolean') {
      params['project[anonymize_visitors]'] = String(args.anonymize_visitors);
    }
    return this.put(`/projects/${encodeURIComponent(args.hashed_id as string)}.json`, params);
  }

  private async deleteProject(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.hashed_id) return { content: [{ type: 'text', text: 'hashed_id is required' }], isError: true };
    return this.del(`/projects/${encodeURIComponent(args.hashed_id as string)}.json`);
  }

  private async copyProject(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.hashed_id) return { content: [{ type: 'text', text: 'hashed_id is required' }], isError: true };
    const params: Record<string, string> = {};
    if (args.owner) params.owner = args.owner as string;
    return this.post(`/projects/${encodeURIComponent(args.hashed_id as string)}/copy.json`, params);
  }

  private async listProjectMedias(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.hashed_id) return { content: [{ type: 'text', text: 'hashed_id is required' }], isError: true };
    return this.get(`/projects/${encodeURIComponent(args.hashed_id as string)}.json`);
  }

  private async getAccount(): Promise<ToolResult> {
    return this.get('/account.json');
  }

  private async listCaptions(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.hashed_id) return { content: [{ type: 'text', text: 'hashed_id is required' }], isError: true };
    return this.get(`/medias/${encodeURIComponent(args.hashed_id as string)}/captions.json`);
  }

  private async getCaptions(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.hashed_id || !args.language_code) {
      return { content: [{ type: 'text', text: 'hashed_id and language_code are required' }], isError: true };
    }
    return this.get(`/medias/${encodeURIComponent(args.hashed_id as string)}/captions/${encodeURIComponent(args.language_code as string)}.json`);
  }

  private async deleteCaptions(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.hashed_id || !args.language_code) {
      return { content: [{ type: 'text', text: 'hashed_id and language_code are required' }], isError: true };
    }
    return this.del(`/medias/${encodeURIComponent(args.hashed_id as string)}/captions/${encodeURIComponent(args.language_code as string)}.json`);
  }

  private async getMediaStats(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.hashed_id) return { content: [{ type: 'text', text: 'hashed_id is required' }], isError: true };
    return this.get(`/stats/medias/${encodeURIComponent(args.hashed_id as string)}.json`);
  }

  private async getProjectStats(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.hashed_id) return { content: [{ type: 'text', text: 'hashed_id is required' }], isError: true };
    return this.get(`/stats/projects/${encodeURIComponent(args.hashed_id as string)}.json`);
  }

  private async getAccountStats(): Promise<ToolResult> {
    return this.get('/stats/account.json');
  }

  private async listEvents(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.media_id) return { content: [{ type: 'text', text: 'media_id is required' }], isError: true };
    const params: Record<string, string> = {
      media_id: args.media_id as string,
      page: String((args.page as number) ?? 1),
      per_page: String((args.per_page as number) ?? 10),
    };
    if (args.start_date) params.start_date = args.start_date as string;
    if (args.end_date) params.end_date = args.end_date as string;
    return this.get('/stats/events.json', params);
  }
}

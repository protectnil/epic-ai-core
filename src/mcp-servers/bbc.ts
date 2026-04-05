/**
 * BBC Nitro MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: No official BBC vendor MCP server found.
//   No community MCP servers found for BBC Nitro API.
// Our adapter covers: 10 tools (programmes, broadcasts, schedules, groups, images, people, services, versions, availabilities, items).
//   Recommendation: Use this adapter for BBC programmes metadata access.
//
// Base URL: https://programmes.api.bbc.com
// Auth: API key passed as query parameter `api_key` on every request
// Docs: https://developer.bbc.co.uk/nitro
// Rate limits: Registration required at https://developer.bbc.co.uk/user/register
// Note: This is an unofficial spec. Some endpoints may require BBC developer registration.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface BBCConfig {
  apiKey: string;
  /** Optional base URL override (default: https://programmes.api.bbc.com) */
  baseUrl?: string;
}

export class BBCMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: BBCConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? 'https://programmes.api.bbc.com';
  }

  static catalog() {
    return {
      name: 'bbc',
      displayName: 'BBC Nitro',
      version: '1.0.0',
      category: 'media',
      keywords: [
        'bbc', 'nitro', 'programmes', 'iplayer', 'radio', 'television', 'tv',
        'broadcast', 'schedule', 'episode', 'series', 'brand', 'media',
        'availability', 'on-demand', 'uk', 'public-broadcasting',
      ],
      toolNames: [
        'list_programmes', 'list_broadcasts', 'list_schedules', 'list_groups',
        'list_images', 'list_people', 'list_services', 'list_versions',
        'list_availabilities', 'list_items',
      ],
      description: 'BBC Nitro API for BBC Programmes Metadata — browse programmes, broadcasts, schedules, groups, images, people, services, versions, and on-demand availability for BBC iPlayer and Radio.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_programmes',
        description: 'Search and browse BBC programmes metadata — brands, series, and episodes for BBC TV and Radio',
        inputSchema: {
          type: 'object',
          properties: {
            pid: {
              type: 'string',
              description: 'Filter by specific programme PID (e.g. b006q2x0 for Doctor Who)',
            },
            entity_type: {
              type: 'string',
              description: 'Programme type filter: brand, series, episode, clip',
            },
            title: {
              type: 'string',
              description: 'Search programmes by title text',
            },
            media_type: {
              type: 'string',
              description: 'Filter by media type: audio or video',
            },
            sort: {
              type: 'string',
              description: 'Sort order: title, -title, pid, -pid (default: title)',
            },
            page: {
              type: 'integer',
              description: 'Page number for paginated results (default: 1)',
            },
            page_size: {
              type: 'integer',
              description: 'Number of results per page (default: 10, max: 300)',
            },
          },
        },
      },
      {
        name: 'list_broadcasts',
        description: 'Find metadata for TV and radio broadcasts — scheduled transmissions on BBC linear services',
        inputSchema: {
          type: 'object',
          properties: {
            pid: {
              type: 'string',
              description: 'Filter by broadcast PID',
            },
            descendants_of: {
              type: 'string',
              description: 'Filter broadcasts that are descendants of a programme PID',
            },
            start_from: {
              type: 'string',
              description: 'Filter broadcasts starting from this ISO 8601 datetime (e.g. 2024-01-01T00:00:00Z)',
            },
            start_to: {
              type: 'string',
              description: 'Filter broadcasts starting before this ISO 8601 datetime',
            },
            service_id: {
              type: 'string',
              description: 'Filter by BBC service ID (e.g. bbc_one, bbc_radio_fourfm)',
            },
            sort: {
              type: 'string',
              description: 'Sort order: start_date, -start_date (default: start_date)',
            },
            page: {
              type: 'integer',
              description: 'Page number (default: 1)',
            },
            page_size: {
              type: 'integer',
              description: 'Results per page (default: 10, max: 300)',
            },
          },
        },
      },
      {
        name: 'list_schedules',
        description: 'Get TV and radio broadcast schedules for BBC services — find what is on and when',
        inputSchema: {
          type: 'object',
          properties: {
            service_id: {
              type: 'string',
              description: 'BBC service ID to get schedule for (e.g. bbc_one, bbc_two, bbc_radio_fourfm)',
            },
            start_from: {
              type: 'string',
              description: 'Schedule start datetime in ISO 8601 format (e.g. 2024-01-01T00:00:00Z)',
            },
            start_to: {
              type: 'string',
              description: 'Schedule end datetime in ISO 8601 format',
            },
            page: {
              type: 'integer',
              description: 'Page number (default: 1)',
            },
            page_size: {
              type: 'integer',
              description: 'Results per page (default: 10, max: 300)',
            },
          },
        },
      },
      {
        name: 'list_groups',
        description: 'Find metadata for curated BBC programme groups — seasons, collections, galleries, and franchises',
        inputSchema: {
          type: 'object',
          properties: {
            pid: {
              type: 'string',
              description: 'Filter by group PID',
            },
            group_type: {
              type: 'string',
              description: 'Group type filter: collection, season, gallery, franchise',
            },
            descendants_of: {
              type: 'string',
              description: 'Filter groups that are descendants of a programme PID',
            },
            page: {
              type: 'integer',
              description: 'Page number (default: 1)',
            },
            page_size: {
              type: 'integer',
              description: 'Results per page (default: 10, max: 300)',
            },
          },
        },
      },
      {
        name: 'list_images',
        description: 'Find metadata for BBC programme images — artwork, stills, and promotional images',
        inputSchema: {
          type: 'object',
          properties: {
            pid: {
              type: 'string',
              description: 'Filter by image PID',
            },
            descendants_of: {
              type: 'string',
              description: 'Filter images associated with a programme PID',
            },
            page: {
              type: 'integer',
              description: 'Page number (default: 1)',
            },
            page_size: {
              type: 'integer',
              description: 'Results per page (default: 10, max: 300)',
            },
          },
        },
      },
      {
        name: 'list_people',
        description: 'Find the people behind and in BBC programmes — cast, crew, guests, and contributors',
        inputSchema: {
          type: 'object',
          properties: {
            pid: {
              type: 'string',
              description: 'Filter by person PID',
            },
            programme: {
              type: 'string',
              description: 'Filter people associated with a specific programme PID',
            },
            page: {
              type: 'integer',
              description: 'Page number (default: 1)',
            },
            page_size: {
              type: 'integer',
              description: 'Results per page (default: 10, max: 300)',
            },
          },
        },
      },
      {
        name: 'list_services',
        description: 'Get information about BBC linear services used for broadcast transmission — TV and radio channels',
        inputSchema: {
          type: 'object',
          properties: {
            service_id: {
              type: 'string',
              description: 'Filter by specific service ID (e.g. bbc_one, bbc_radio_fourfm)',
            },
            type: {
              type: 'string',
              description: 'Service type filter: TV or Radio',
            },
            page: {
              type: 'integer',
              description: 'Page number (default: 1)',
            },
            page_size: {
              type: 'integer',
              description: 'Results per page (default: 10, max: 300)',
            },
          },
        },
      },
      {
        name: 'list_versions',
        description: 'Get metadata on editorial programme versions — original, signed, audio-described, open-subtitled, and broadcast variants',
        inputSchema: {
          type: 'object',
          properties: {
            pid: {
              type: 'string',
              description: 'Filter by version PID',
            },
            descendants_of: {
              type: 'string',
              description: 'Filter versions that are descendants of a programme PID',
            },
            version_type: {
              type: 'string',
              description: 'Filter by version type: original, signed, audio-described, open-subtitled',
            },
            page: {
              type: 'integer',
              description: 'Page number (default: 1)',
            },
            page_size: {
              type: 'integer',
              description: 'Results per page (default: 10, max: 300)',
            },
          },
        },
      },
      {
        name: 'list_availabilities',
        description: 'Discover on-demand availability details for BBC programmes and their versions — what is available on iPlayer',
        inputSchema: {
          type: 'object',
          properties: {
            descendants_of: {
              type: 'string',
              description: 'Filter availabilities for descendants of a programme PID',
            },
            availability: {
              type: 'string',
              description: 'Filter by availability status: available',
            },
            media_set: {
              type: 'string',
              description: 'Filter by media set (e.g. pc, mobile-download)',
            },
            sort: {
              type: 'string',
              description: 'Sort order: scheduled_start (default)',
            },
            sort_direction: {
              type: 'string',
              description: 'Sort direction: ascending or descending',
            },
            page: {
              type: 'integer',
              description: 'Page number (default: 1)',
            },
            page_size: {
              type: 'integer',
              description: 'Results per page (default: 10, max: 300)',
            },
          },
        },
      },
      {
        name: 'list_items',
        description: 'Look inside BBC programmes to find segments — chapters, tracks, and items within an episode',
        inputSchema: {
          type: 'object',
          properties: {
            pid: {
              type: 'string',
              description: 'Filter by item PID',
            },
            descendants_of: {
              type: 'string',
              description: 'Filter items that are descendants of a programme PID',
            },
            item_type: {
              type: 'string',
              description: 'Filter by item type: chapter, music, speech',
            },
            page: {
              type: 'integer',
              description: 'Page number (default: 1)',
            },
            page_size: {
              type: 'integer',
              description: 'Results per page (default: 10, max: 300)',
            },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_programmes':
          return this.listProgrammes(args);
        case 'list_broadcasts':
          return this.listBroadcasts(args);
        case 'list_schedules':
          return this.listSchedules(args);
        case 'list_groups':
          return this.listGroups(args);
        case 'list_images':
          return this.listImages(args);
        case 'list_people':
          return this.listPeople(args);
        case 'list_services':
          return this.listServices(args);
        case 'list_versions':
          return this.listVersions(args);
        case 'list_availabilities':
          return this.listAvailabilities(args);
        case 'list_items':
          return this.listItems(args);
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

  private buildUrl(path: string, params: Record<string, string | undefined>): string {
    const qs = new URLSearchParams({ api_key: this.apiKey });
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) qs.set(k, v);
    }
    return `${this.baseUrl}${path}?${qs.toString()}`;
  }

  private async get(path: string, params: Record<string, string | undefined> = {}): Promise<ToolResult> {
    const url = this.buildUrl(path, params);
    const response = await this.fetchWithRetry(url, { method: 'GET' });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`BBC Nitro returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private buildPaginationParams(args: Record<string, unknown>): Record<string, string | undefined> {
    const params: Record<string, string | undefined> = {};
    if (args.page !== undefined) params.page = String(args.page);
    if (args.page_size !== undefined) params.page_size = String(args.page_size);
    return params;
  }

  private async listProgrammes(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string | undefined> = { ...this.buildPaginationParams(args) };
    if (args.pid) params['filter[pid]'] = args.pid as string;
    if (args.entity_type) params['filter[entity_type]'] = args.entity_type as string;
    if (args.title) params['filter[title]'] = args.title as string;
    if (args.media_type) params['filter[media_type]'] = args.media_type as string;
    if (args.sort) params.sort = args.sort as string;
    return this.get('/programmes', params);
  }

  private async listBroadcasts(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string | undefined> = { ...this.buildPaginationParams(args) };
    if (args.pid) params['filter[pid]'] = args.pid as string;
    if (args.descendants_of) params['filter[descendants_of]'] = args.descendants_of as string;
    if (args.start_from) params['filter[start][gte]'] = args.start_from as string;
    if (args.start_to) params['filter[start][lt]'] = args.start_to as string;
    if (args.service_id) params['filter[service_id]'] = args.service_id as string;
    if (args.sort) params.sort = args.sort as string;
    return this.get('/broadcasts', params);
  }

  private async listSchedules(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string | undefined> = { ...this.buildPaginationParams(args) };
    if (args.service_id) params['filter[service_id]'] = args.service_id as string;
    if (args.start_from) params['filter[start][gte]'] = args.start_from as string;
    if (args.start_to) params['filter[start][lt]'] = args.start_to as string;
    return this.get('/schedules', params);
  }

  private async listGroups(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string | undefined> = { ...this.buildPaginationParams(args) };
    if (args.pid) params['filter[pid]'] = args.pid as string;
    if (args.group_type) params['filter[group_type]'] = args.group_type as string;
    if (args.descendants_of) params['filter[descendants_of]'] = args.descendants_of as string;
    return this.get('/groups', params);
  }

  private async listImages(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string | undefined> = { ...this.buildPaginationParams(args) };
    if (args.pid) params['filter[pid]'] = args.pid as string;
    if (args.descendants_of) params['filter[descendants_of]'] = args.descendants_of as string;
    return this.get('/images', params);
  }

  private async listPeople(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string | undefined> = { ...this.buildPaginationParams(args) };
    if (args.pid) params['filter[pid]'] = args.pid as string;
    if (args.programme) params['filter[programme]'] = args.programme as string;
    return this.get('/people', params);
  }

  private async listServices(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string | undefined> = { ...this.buildPaginationParams(args) };
    if (args.service_id) params['filter[id]'] = args.service_id as string;
    if (args.type) params['filter[type]'] = args.type as string;
    return this.get('/services', params);
  }

  private async listVersions(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string | undefined> = { ...this.buildPaginationParams(args) };
    if (args.pid) params['filter[pid]'] = args.pid as string;
    if (args.descendants_of) params['filter[descendants_of]'] = args.descendants_of as string;
    if (args.version_type) params['filter[version_type]'] = args.version_type as string;
    return this.get('/versions', params);
  }

  private async listAvailabilities(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string | undefined> = { ...this.buildPaginationParams(args) };
    if (args.descendants_of) params['filter[descendants_of]'] = args.descendants_of as string;
    if (args.availability) params['filter[availability]'] = args.availability as string;
    if (args.media_set) params['filter[media_set]'] = args.media_set as string;
    if (args.sort) params.sort = args.sort as string;
    if (args.sort_direction) params.sort_direction = args.sort_direction as string;
    return this.get('/availabilities', params);
  }

  private async listItems(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string | undefined> = { ...this.buildPaginationParams(args) };
    if (args.pid) params['filter[pid]'] = args.pid as string;
    if (args.descendants_of) params['filter[descendants_of]'] = args.descendants_of as string;
    if (args.item_type) params['filter[item_type]'] = args.item_type as string;
    return this.get('/items', params);
  }
}

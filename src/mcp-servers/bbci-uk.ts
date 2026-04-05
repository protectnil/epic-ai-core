/**
 * BBC iPlayer Business Layer (BBCI) MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03.
// Base URL: https://ibl.api.bbci.co.uk/ibl/v1
// Auth: None (public API) — requires 'api_key' query param or x-api-key header for some endpoints
// Docs: http://developer.bbc.co.uk/  |  https://github.com/Mermade/bbcparse
// Note: Unofficial spec; some endpoints may require a BBC API key in production.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface BbciConfig {
  apiKey?: string;
  baseUrl?: string;
}

export class BbciUkMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: BbciConfig = {}) {
    super();
    this.apiKey = config.apiKey || '';
    this.baseUrl = config.baseUrl || 'https://ibl.api.bbci.co.uk/ibl/v1';
  }

  static catalog() {
    return {
      name: 'bbci-uk',
      displayName: 'BBC iPlayer',
      version: '1.0.0',
      category: 'media' as const,
      keywords: [
        'bbc', 'iplayer', 'tv', 'media', 'broadcast', 'programmes', 'episodes',
        'channels', 'schedule', 'clips', 'categories', 'highlights', 'search',
        'uk', 'streaming', 'entertainment',
      ],
      toolNames: [
        'get_categories',
        'get_subcategories',
        'list_episodes_by_category',
        'list_highlights_by_category',
        'list_programmes_by_category',
        'list_channels',
        'list_broadcasts_by_channel',
        'list_highlights_by_channel',
        'list_programmes_by_channel',
        'get_schedule_by_channel',
        'get_clips',
        'get_episode',
        'get_onward_journey',
        'get_episode_recommendations',
        'list_popular_episodes',
        'list_episodes_by_group',
        'get_home_highlights',
        'get_programme',
        'list_episodes_by_programme',
        'list_programmes_atoz',
        'list_regions',
        'search',
        'search_suggest',
        'get_status',
      ],
      description: 'Browse BBC iPlayer programmes, episodes, channels, schedules, and search content via the BBC iPlayer Business Layer API.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      // ── Categories ────────────────────────────────────────────────────────
      {
        name: 'get_categories',
        description: 'List all top-level BBC iPlayer content categories (e.g. Drama, Comedy, News).',
        inputSchema: {
          type: 'object',
          properties: {
            lang: { type: 'string', description: 'Language: en, cy, ga, gd, pi (default: en)' },
          },
        },
      },
      {
        name: 'get_subcategories',
        description: 'Get sub-categories for a given BBC iPlayer category.',
        inputSchema: {
          type: 'object',
          properties: {
            category: { type: 'string', description: 'Parent category slug (e.g. drama, comedy)' },
            lang: { type: 'string', description: 'Language: en, cy, ga, gd, pi (default: en)' },
          },
          required: ['category'],
        },
      },
      {
        name: 'list_episodes_by_category',
        description: 'List all available episodes for a given BBC iPlayer category, with pagination and sorting.',
        inputSchema: {
          type: 'object',
          properties: {
            category: { type: 'string', description: 'Category slug (e.g. drama, news)' },
            rights: { type: 'string', description: 'Rights context: web, mobile, tv (default: web)' },
            availability: { type: 'string', description: 'Filter: available or all (default: available)' },
            page: { type: 'number', description: 'Page number (default: 1)' },
            per_page: { type: 'number', description: 'Results per page (default: 10, max: 4)' },
            sort: { type: 'string', description: 'Sort order (e.g. title)' },
            lang: { type: 'string', description: 'Language code (default: en)' },
          },
          required: ['category'],
        },
      },
      {
        name: 'list_highlights_by_category',
        description: 'List the editorial highlights (featured content) for a given BBC iPlayer category.',
        inputSchema: {
          type: 'object',
          properties: {
            category: { type: 'string', description: 'Category slug' },
            rights: { type: 'string', description: 'Rights context: web, mobile, tv (default: web)' },
            availability: { type: 'string', description: 'Filter: available or all (default: available)' },
            lang: { type: 'string', description: 'Language code (default: en)' },
            initial_child_count: { type: 'number', description: 'Number of child items (1-4, default: 4)' },
          },
          required: ['category'],
        },
      },
      {
        name: 'list_programmes_by_category',
        description: 'List all programmes (brands/series) for a given BBC iPlayer category.',
        inputSchema: {
          type: 'object',
          properties: {
            category: { type: 'string', description: 'Category slug' },
            rights: { type: 'string', description: 'Rights context: web, mobile, tv (default: web)' },
            availability: { type: 'string', description: 'Filter: available or all (default: available)' },
            page: { type: 'number', description: 'Page number (default: 1)' },
            per_page: { type: 'number', description: 'Results per page' },
            lang: { type: 'string', description: 'Language code (default: en)' },
          },
          required: ['category'],
        },
      },
      // ── Channels ──────────────────────────────────────────────────────────
      {
        name: 'list_channels',
        description: 'List all BBC iPlayer channels, optionally filtered by region.',
        inputSchema: {
          type: 'object',
          properties: {
            region: { type: 'string', description: 'Region code to filter channels (e.g. england, scotland)' },
            lang: { type: 'string', description: 'Language code (default: en)' },
          },
        },
      },
      {
        name: 'list_broadcasts_by_channel',
        description: 'Get broadcast schedule for a specific BBC channel, with optional date filter.',
        inputSchema: {
          type: 'object',
          properties: {
            channel: { type: 'string', description: 'Channel ID (e.g. bbc_one, bbc_two, bbc_radio_four)' },
            rights: { type: 'string', description: 'Rights context: web, mobile, tv (default: web)' },
            availability: { type: 'string', description: 'Filter: available or all (default: available)' },
            page: { type: 'number', description: 'Page number' },
            per_page: { type: 'number', description: 'Results per page' },
            from: { type: 'string', description: 'Start datetime filter (ISO 8601)' },
            lang: { type: 'string', description: 'Language code (default: en)' },
          },
          required: ['channel'],
        },
      },
      {
        name: 'list_highlights_by_channel',
        description: 'List editorial highlights for a specific BBC channel, including live content.',
        inputSchema: {
          type: 'object',
          properties: {
            channel: { type: 'string', description: 'Channel ID (e.g. bbc_one, bbc_iplayer)' },
            rights: { type: 'string', description: 'Rights context: web, mobile, tv (default: web)' },
            availability: { type: 'string', description: 'Filter: available or all (default: available)' },
            live: { type: 'boolean', description: 'Include live content (default: false)' },
            lang: { type: 'string', description: 'Language code (default: en)' },
          },
          required: ['channel'],
        },
      },
      {
        name: 'list_programmes_by_channel',
        description: 'List all programmes available on a specific BBC channel.',
        inputSchema: {
          type: 'object',
          properties: {
            channel: { type: 'string', description: 'Channel ID' },
            rights: { type: 'string', description: 'Rights context: web, mobile, tv (default: web)' },
            availability: { type: 'string', description: 'Filter: available or all (default: available)' },
            page: { type: 'number', description: 'Page number' },
            per_page: { type: 'number', description: 'Results per page' },
            lang: { type: 'string', description: 'Language code (default: en)' },
          },
          required: ['channel'],
        },
      },
      {
        name: 'get_schedule_by_channel',
        description: 'Get the broadcast schedule for a BBC channel on a specific date.',
        inputSchema: {
          type: 'object',
          properties: {
            channel: { type: 'string', description: 'Channel ID (e.g. bbc_one)' },
            date: { type: 'string', description: 'Schedule date in YYYY-MM-DD format' },
            rights: { type: 'string', description: 'Rights context: web, mobile, tv (default: web)' },
            availability: { type: 'string', description: 'Filter: available or all (default: available)' },
            lang: { type: 'string', description: 'Language code (default: en)' },
          },
          required: ['channel', 'date'],
        },
      },
      // ── Episodes & Clips ──────────────────────────────────────────────────
      {
        name: 'get_clips',
        description: 'Get clip details for a BBC programme/episode by PID.',
        inputSchema: {
          type: 'object',
          properties: {
            pid: { type: 'string', description: 'BBC programme ID (PID), min 8 chars (e.g. b09xtfl3)' },
            rights: { type: 'string', description: 'Rights context: web, mobile, tv (default: web)' },
            availability: { type: 'string', description: 'Filter: available or all (default: available)' },
          },
          required: ['pid'],
        },
      },
      {
        name: 'get_episode',
        description: 'Get full details for a specific BBC episode by PID, including availability and metadata.',
        inputSchema: {
          type: 'object',
          properties: {
            pid: { type: 'string', description: 'Episode PID (e.g. b09xtfl3)' },
            rights: { type: 'string', description: 'Rights context: web, mobile, tv (default: web)' },
            availability: { type: 'string', description: 'Filter: available or all (default: available)' },
            initial_child_count: { type: 'number', description: 'Number of child items (1-4)' },
          },
          required: ['pid'],
        },
      },
      {
        name: 'get_onward_journey',
        description: 'Get the next episode recommendation (onward journey) after a given episode.',
        inputSchema: {
          type: 'object',
          properties: {
            pid: { type: 'string', description: 'Current episode PID' },
            rights: { type: 'string', description: 'Rights context: web, mobile, tv (default: web)' },
            availability: { type: 'string', description: 'Filter: available or all (default: available)' },
          },
          required: ['pid'],
        },
      },
      {
        name: 'get_episode_recommendations',
        description: 'Get personalized programme recommendations based on a given episode.',
        inputSchema: {
          type: 'object',
          properties: {
            pid: { type: 'string', description: 'Episode PID to base recommendations on' },
            rights: { type: 'string', description: 'Rights context: web, mobile, tv (default: web)' },
            availability: { type: 'string', description: 'Filter: available or all (default: available)' },
            page: { type: 'number', description: 'Page number' },
            per_page: { type: 'number', description: 'Results per page' },
          },
          required: ['pid'],
        },
      },
      // ── Groups & Popular ──────────────────────────────────────────────────
      {
        name: 'list_popular_episodes',
        description: 'Get the most popular BBC iPlayer episodes across all channels.',
        inputSchema: {
          type: 'object',
          properties: {
            rights: { type: 'string', description: 'Rights context: web, mobile, tv (default: web)' },
            availability: { type: 'string', description: 'Filter: available or all (default: available)' },
            page: { type: 'number', description: 'Page number' },
            per_page: { type: 'number', description: 'Results per page' },
            initial_child_count: { type: 'number', description: 'Number of child items (1-4)' },
            mixin: { type: 'string', description: 'Optional mixin: live or promotions' },
            lang: { type: 'string', description: 'Language code (default: en)' },
          },
        },
      },
      {
        name: 'list_episodes_by_group',
        description: 'List episodes belonging to a group, brand, or series by PID.',
        inputSchema: {
          type: 'object',
          properties: {
            pid: { type: 'string', description: 'Group/brand/series PID' },
            rights: { type: 'string', description: 'Rights context: web, mobile, tv (default: web)' },
            availability: { type: 'string', description: 'Filter: available or all (default: available)' },
            page: { type: 'number', description: 'Page number' },
            per_page: { type: 'number', description: 'Results per page' },
            initial_child_count: { type: 'number', description: 'Number of child items (1-4)' },
            mixin: { type: 'string', description: 'Optional mixin: live or promotions' },
            lang: { type: 'string', description: 'Language code (default: en)' },
          },
          required: ['pid'],
        },
      },
      // ── Home ──────────────────────────────────────────────────────────────
      {
        name: 'get_home_highlights',
        description: 'Get the editorial homepage highlights for BBC iPlayer.',
        inputSchema: {
          type: 'object',
          properties: {
            rights: { type: 'string', description: 'Rights context: web, mobile, tv (default: web)' },
            availability: { type: 'string', description: 'Filter: available or all (default: available)' },
            lang: { type: 'string', description: 'Language code (default: en)' },
            initial_child_count: { type: 'number', description: 'Number of child items (1-4)' },
          },
        },
      },
      // ── Programmes ────────────────────────────────────────────────────────
      {
        name: 'get_programme',
        description: 'Get details for a BBC programme (brand or series) by PID.',
        inputSchema: {
          type: 'object',
          properties: {
            pid: { type: 'string', description: 'Programme PID' },
            rights: { type: 'string', description: 'Rights context: web, mobile, tv (default: web)' },
            availability: { type: 'string', description: 'Filter: available or all (default: available)' },
            initial_child_count: { type: 'number', description: 'Number of child items (1-4)' },
          },
          required: ['pid'],
        },
      },
      {
        name: 'list_episodes_by_programme',
        description: 'List child episodes for a given programme PID (brand or series).',
        inputSchema: {
          type: 'object',
          properties: {
            pid: { type: 'string', description: 'Parent programme PID' },
            rights: { type: 'string', description: 'Rights context: web, mobile, tv (default: web)' },
            availability: { type: 'string', description: 'Filter: available or all (default: available)' },
            page: { type: 'number', description: 'Page number' },
            per_page: { type: 'number', description: 'Results per page' },
          },
          required: ['pid'],
        },
      },
      {
        name: 'list_programmes_atoz',
        description: 'List BBC iPlayer programmes starting with a given letter (A-Z or 0-9).',
        inputSchema: {
          type: 'object',
          properties: {
            letter: { type: 'string', description: 'Initial letter: a-z or 0-9' },
            rights: { type: 'string', description: 'Rights context: web, mobile, tv (default: web)' },
            availability: { type: 'string', description: 'Filter: available or all (default: available)' },
            sort: { type: 'string', description: 'Sort order (required by API)' },
            page: { type: 'number', description: 'Page number' },
            per_page: { type: 'number', description: 'Results per page' },
          },
          required: ['letter', 'sort'],
        },
      },
      // ── Meta ──────────────────────────────────────────────────────────────
      {
        name: 'list_regions',
        description: 'List all available BBC iPlayer regions.',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'search',
        description: 'Search BBC iPlayer for programmes and episodes by keyword query.',
        inputSchema: {
          type: 'object',
          properties: {
            q: { type: 'string', description: 'Search query string' },
            rights: { type: 'string', description: 'Rights context: web, mobile, tv (default: web)' },
            availability: { type: 'string', description: 'Filter: available or all (default: available)' },
            lang: { type: 'string', description: 'Language code (default: en)' },
          },
          required: ['q'],
        },
      },
      {
        name: 'search_suggest',
        description: 'Get autocomplete search suggestions for a query prefix on BBC iPlayer.',
        inputSchema: {
          type: 'object',
          properties: {
            q: { type: 'string', description: 'Partial search query for autocomplete' },
            rights: { type: 'string', description: 'Rights context: web, mobile, tv (default: web)' },
            availability: { type: 'string', description: 'Filter: available or all (default: available)' },
            lang: { type: 'string', description: 'Language code (default: en)' },
          },
          required: ['q'],
        },
      },
      {
        name: 'get_status',
        description: 'Check the operational status of the BBC iPlayer API.',
        inputSchema: { type: 'object', properties: {} },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'get_categories':             return await this.getCategories(args);
        case 'get_subcategories':          return await this.getSubcategories(args);
        case 'list_episodes_by_category':  return await this.listEpisodesByCategory(args);
        case 'list_highlights_by_category': return await this.listHighlightsByCategory(args);
        case 'list_programmes_by_category': return await this.listProgrammesByCategory(args);
        case 'list_channels':              return await this.listChannels(args);
        case 'list_broadcasts_by_channel': return await this.listBroadcastsByChannel(args);
        case 'list_highlights_by_channel': return await this.listHighlightsByChannel(args);
        case 'list_programmes_by_channel': return await this.listProgrammesByChannel(args);
        case 'get_schedule_by_channel':    return await this.getScheduleByChannel(args);
        case 'get_clips':                  return await this.getClips(args);
        case 'get_episode':                return await this.getEpisode(args);
        case 'get_onward_journey':         return await this.getOnwardJourney(args);
        case 'get_episode_recommendations': return await this.getEpisodeRecommendations(args);
        case 'list_popular_episodes':      return await this.listPopularEpisodes(args);
        case 'list_episodes_by_group':     return await this.listEpisodesByGroup(args);
        case 'get_home_highlights':        return await this.getHomeHighlights(args);
        case 'get_programme':              return await this.getProgramme(args);
        case 'list_episodes_by_programme': return await this.listEpisodesByProgramme(args);
        case 'list_programmes_atoz':       return await this.listProgrammesAtoz(args);
        case 'list_regions':               return await this.listRegions();
        case 'search':                     return await this.search(args);
        case 'search_suggest':             return await this.searchSuggest(args);
        case 'get_status':                 return await this.getStatus();
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

  // ── Private helpers ──────────────────────────────────────────────────────

  private buildParams(args: Record<string, unknown>, extras: string[] = []): string {
    const params = new URLSearchParams();
    if (this.apiKey) params.set('api_key', this.apiKey);

    const known = ['rights', 'availability', 'page', 'per_page', 'lang', 'initial_child_count', 'live', 'from', 'mixin', 'sort', 'sort_direction'];
    for (const key of [...known, ...extras]) {
      if (args[key] !== undefined) params.set(key, String(args[key]));
    }
    return params.toString() ? `?${params.toString()}` : '';
  }

  private async bbciRequest(path: string): Promise<ToolResult> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (this.apiKey) headers['x-api-key'] = this.apiKey;

    const response = await this.fetchWithRetry(url, { headers });

    if (!response.ok) {
      let detail = '';
      try { detail = await response.text(); } catch { /* ignore */ }
      return {
        content: [{ type: 'text', text: `BBC iPlayer API error ${response.status} ${response.statusText}${detail ? ': ' + detail.slice(0, 400) : ''}` }],
        isError: true,
      };
    }

    let data: unknown;
    try { data = await response.json(); } catch {
      return { content: [{ type: 'text', text: `BBC iPlayer returned non-JSON response (HTTP ${response.status})` }], isError: true };
    }

    const text = JSON.stringify(data, null, 2);
    const truncated = text.length > 10_000 ? text.slice(0, 10_000) + `\n... [truncated, ${text.length} total chars]` : text;
    return { content: [{ type: 'text', text: truncated }], isError: false };
  }

  // ── Categories ────────────────────────────────────────────────────────────

  private async getCategories(args: Record<string, unknown>): Promise<ToolResult> {
    return this.bbciRequest(`/categories${this.buildParams(args)}`);
  }

  private async getSubcategories(args: Record<string, unknown>): Promise<ToolResult> {
    return this.bbciRequest(`/categories/${args.category}${this.buildParams(args)}`);
  }

  private async listEpisodesByCategory(args: Record<string, unknown>): Promise<ToolResult> {
    return this.bbciRequest(`/categories/${args.category}/episodes${this.buildParams(args, ['sort'])}`);
  }

  private async listHighlightsByCategory(args: Record<string, unknown>): Promise<ToolResult> {
    return this.bbciRequest(`/categories/${args.category}/highlights${this.buildParams(args)}`);
  }

  private async listProgrammesByCategory(args: Record<string, unknown>): Promise<ToolResult> {
    return this.bbciRequest(`/categories/${args.category}/programmes${this.buildParams(args)}`);
  }

  // ── Channels ──────────────────────────────────────────────────────────────

  private async listChannels(args: Record<string, unknown>): Promise<ToolResult> {
    return this.bbciRequest(`/channels${this.buildParams(args, ['region'])}`);
  }

  private async listBroadcastsByChannel(args: Record<string, unknown>): Promise<ToolResult> {
    return this.bbciRequest(`/channels/${args.channel}/broadcasts${this.buildParams(args, ['from'])}`);
  }

  private async listHighlightsByChannel(args: Record<string, unknown>): Promise<ToolResult> {
    return this.bbciRequest(`/channels/${args.channel}/highlights${this.buildParams(args, ['live'])}`);
  }

  private async listProgrammesByChannel(args: Record<string, unknown>): Promise<ToolResult> {
    return this.bbciRequest(`/channels/${args.channel}/programmes${this.buildParams(args)}`);
  }

  private async getScheduleByChannel(args: Record<string, unknown>): Promise<ToolResult> {
    return this.bbciRequest(`/channels/${args.channel}/schedule/${args.date}${this.buildParams(args)}`);
  }

  // ── Episodes & Clips ──────────────────────────────────────────────────────

  private async getClips(args: Record<string, unknown>): Promise<ToolResult> {
    return this.bbciRequest(`/clips/${args.pid}${this.buildParams(args)}`);
  }

  private async getEpisode(args: Record<string, unknown>): Promise<ToolResult> {
    return this.bbciRequest(`/episodes/${args.pid}${this.buildParams(args)}`);
  }

  private async getOnwardJourney(args: Record<string, unknown>): Promise<ToolResult> {
    return this.bbciRequest(`/episodes/${args.pid}/next${this.buildParams(args)}`);
  }

  private async getEpisodeRecommendations(args: Record<string, unknown>): Promise<ToolResult> {
    return this.bbciRequest(`/episodes/${args.pid}/recommendations${this.buildParams(args)}`);
  }

  // ── Groups & Popular ──────────────────────────────────────────────────────

  private async listPopularEpisodes(args: Record<string, unknown>): Promise<ToolResult> {
    return this.bbciRequest(`/groups/popular/episodes${this.buildParams(args, ['mixin'])}`);
  }

  private async listEpisodesByGroup(args: Record<string, unknown>): Promise<ToolResult> {
    return this.bbciRequest(`/groups/${args.pid}/episodes${this.buildParams(args, ['mixin'])}`);
  }

  // ── Home ──────────────────────────────────────────────────────────────────

  private async getHomeHighlights(args: Record<string, unknown>): Promise<ToolResult> {
    return this.bbciRequest(`/home/highlights${this.buildParams(args)}`);
  }

  // ── Programmes ────────────────────────────────────────────────────────────

  private async getProgramme(args: Record<string, unknown>): Promise<ToolResult> {
    return this.bbciRequest(`/programmes/${args.pid}${this.buildParams(args)}`);
  }

  private async listEpisodesByProgramme(args: Record<string, unknown>): Promise<ToolResult> {
    return this.bbciRequest(`/programmes/${args.pid}/episodes${this.buildParams(args)}`);
  }

  private async listProgrammesAtoz(args: Record<string, unknown>): Promise<ToolResult> {
    return this.bbciRequest(`/atoz/${args.letter}/programmes${this.buildParams(args, ['sort'])}`);
  }

  // ── Meta ──────────────────────────────────────────────────────────────────

  private async listRegions(): Promise<ToolResult> {
    return this.bbciRequest('/regions');
  }

  private async search(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.buildParams(args, ['q']);
    return this.bbciRequest(`/search${params}`);
  }

  private async searchSuggest(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.buildParams(args, ['q']);
    return this.bbciRequest(`/search-suggest${params}`);
  }

  private async getStatus(): Promise<ToolResult> {
    return this.bbciRequest('/status');
  }
}

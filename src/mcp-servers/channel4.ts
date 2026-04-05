/**
 * Channel 4 MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// No official Channel 4 MCP server was found on GitHub as of 2026-03-28.
// Our adapter covers: 12 tools. Vendor MCP covers: 0 tools (none exists).
// Recommendation: use-rest-api — no official MCP server exists.
//
// Base URL: https://channel4.com/pmlsd
// Auth: API key required — passed as query parameter `apikey`
//   Register at: http://developer.channel4.com/apps/register
//   Docs: http://developer.channel4.com/docs/read/ProgrammesAPIGuide
// Response format: Atom feeds (application/xml) — all endpoints return .atom XML
// Rate limits: Not publicly documented

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface Channel4Config {
  apiKey: string;
  baseUrl?: string;
}

export class Channel4MCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: Channel4Config) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://channel4.com/pmlsd';
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'get_atoz',
        description: 'List all Channel 4 programmes in alphabetical order. Returns an Atom feed of all brands. Optionally filter to a specific starting letter.',
        inputSchema: {
          type: 'object',
          properties: {
            start_letter: {
              type: 'string',
              description: 'Filter to programmes starting with this letter (a-z). If omitted, returns all programmes.',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
          },
        },
      },
      {
        name: 'search_programmes',
        description: 'Search Channel 4 programmes by title keyword. Returns an Atom feed of matching brands. Supports pagination.',
        inputSchema: {
          type: 'object',
          properties: {
            q: {
              type: 'string',
              description: 'Search query — programme title or keyword to match',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
          },
          required: ['q'],
        },
      },
      {
        name: 'get_programme',
        description: 'Get full programme details for a specific Channel 4 brand, including all available episodes and clips. Returns an Atom feed.',
        inputSchema: {
          type: 'object',
          properties: {
            brand_web_safe_title: {
              type: 'string',
              description: 'URL-safe brand title (e.g., "black-mirror" or "the-it-crowd")',
            },
          },
          required: ['brand_web_safe_title'],
        },
      },
      {
        name: 'get_episode_guide',
        description: 'Get the episode guide for a Channel 4 brand — all series and episodes. Optionally filter to a specific series number or episode.',
        inputSchema: {
          type: 'object',
          properties: {
            brand_web_safe_title: {
              type: 'string',
              description: 'URL-safe brand title (e.g., "black-mirror")',
            },
            series_number: {
              type: 'number',
              description: 'Filter to a specific series number',
            },
            episode_number: {
              type: 'number',
              description: 'Filter to a specific episode number within the series (requires series_number)',
            },
          },
          required: ['brand_web_safe_title'],
        },
      },
      {
        name: 'get_programme_videos',
        description: 'Get available video assets (episodes and clips) for a Channel 4 programme. Optionally filter to a specific series or episode.',
        inputSchema: {
          type: 'object',
          properties: {
            brand_web_safe_title: {
              type: 'string',
              description: 'URL-safe brand title (e.g., "black-mirror")',
            },
            series_number: {
              type: 'number',
              description: 'Filter to a specific series number',
            },
            episode_number: {
              type: 'number',
              description: 'Filter to a specific episode number within the series (requires series_number)',
            },
            clip_asset_id: {
              type: 'string',
              description: 'Filter to a specific clip asset ID',
            },
          },
          required: ['brand_web_safe_title'],
        },
      },
      {
        name: 'get_programme_epg',
        description: 'Get the Electronic Programme Guide (EPG) schedule for a specific Channel 4 brand — upcoming broadcast times.',
        inputSchema: {
          type: 'object',
          properties: {
            brand_web_safe_title: {
              type: 'string',
              description: 'URL-safe brand title (e.g., "black-mirror")',
            },
          },
          required: ['brand_web_safe_title'],
        },
      },
      {
        name: 'get_programme_by_id',
        description: 'Get all long-form content (episodes and clips) for a programme by its Channel 4 programme ID.',
        inputSchema: {
          type: 'object',
          properties: {
            programme_id: {
              type: 'string',
              description: 'The Channel 4 programme ID',
            },
          },
          required: ['programme_id'],
        },
      },
      {
        name: 'get_categories',
        description: 'List all Channel 4 content categories (tags). Returns an Atom feed of category names.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_category_programmes',
        description: 'List Channel 4 programmes within a specific category. Optionally filter by channel and sort order (popular or title). Supports pagination.',
        inputSchema: {
          type: 'object',
          properties: {
            category: {
              type: 'string',
              description: 'Category slug (e.g., "drama", "comedy", "news")',
            },
            channel: {
              type: 'string',
              description: 'Filter to a specific channel (e.g., "c4", "e4", "more4")',
            },
            sort: {
              type: 'string',
              description: 'Sort order: "popular" or "title" (default: title)',
            },
            on_demand: {
              type: 'boolean',
              description: 'If true, filter to 4oD (on-demand) content only',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
          },
          required: ['category'],
        },
      },
      {
        name: 'get_brands_on_demand',
        description: 'List all Channel 4 programmes available on 4oD (on-demand). Supports pagination and optional popular sorting.',
        inputSchema: {
          type: 'object',
          properties: {
            popular: {
              type: 'boolean',
              description: 'If true, sort by popularity (default: alphabetical)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
          },
        },
      },
      {
        name: 'get_popular_brands',
        description: 'List the most popular Channel 4 programmes across all content. Supports pagination.',
        inputSchema: {
          type: 'object',
          properties: {
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
          },
        },
      },
      {
        name: 'get_tv_listings',
        description: 'Get the Channel 4 TV schedule (listings) for a specific date. Optionally filter to a specific channel.',
        inputSchema: {
          type: 'object',
          properties: {
            year: {
              type: 'number',
              description: 'Year (e.g., 2024)',
            },
            month: {
              type: 'number',
              description: 'Month (1-12)',
            },
            day: {
              type: 'number',
              description: 'Day of month (1-31)',
            },
            channel: {
              type: 'string',
              description: 'Optional channel filter (e.g., "c4", "e4", "more4", "film4")',
            },
          },
          required: ['year', 'month', 'day'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'get_atoz':
          return await this.getAtoz(args);
        case 'search_programmes':
          return await this.searchProgrammes(args);
        case 'get_programme':
          return await this.getProgramme(args);
        case 'get_episode_guide':
          return await this.getEpisodeGuide(args);
        case 'get_programme_videos':
          return await this.getProgrammeVideos(args);
        case 'get_programme_epg':
          return await this.getProgrammeEpg(args);
        case 'get_programme_by_id':
          return await this.getProgrammeById(args);
        case 'get_categories':
          return await this.getCategories();
        case 'get_category_programmes':
          return await this.getCategoryProgrammes(args);
        case 'get_brands_on_demand':
          return await this.getBrandsOnDemand(args);
        case 'get_popular_brands':
          return await this.getPopularBrands(args);
        case 'get_tv_listings':
          return await this.getTvListings(args);
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

  private async request(path: string): Promise<ToolResult> {
    const separator = path.includes('?') ? '&' : '?';
    const url = `${this.baseUrl}${path}${separator}apikey=${encodeURIComponent(this.apiKey)}`;
    const headers: Record<string, string> = {
      Accept: 'application/atom+xml, application/xml, text/xml',
    };

    const response = await this.fetchWithRetry(url, { method: 'GET', headers });

    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return {
        content: [{ type: 'text', text: `Channel 4 API error ${response.status}: ${errText}` }],
        isError: true,
      };
    }

    const text = await response.text();
    const truncated = text.length > 10_000
      ? text.slice(0, 10_000) + '\n... [truncated, ' + text.length + ' total chars]'
      : text;

    return { content: [{ type: 'text', text: truncated }], isError: false };
  }

  private pad(n: number): string {
    return String(n).padStart(2, '0');
  }

  private async getAtoz(args: Record<string, unknown>): Promise<ToolResult> {
    const letter = args.start_letter as string | undefined;
    const page = (args.page as number) ?? 1;
    if (letter) {
      const pageSuffix = page > 1 ? `/page-${page}` : '';
      return this.request(`/atoz/${encodeURIComponent(letter.toLowerCase())}${pageSuffix}.atom`);
    }
    return this.request('/atoz.atom');
  }

  private async searchProgrammes(args: Record<string, unknown>): Promise<ToolResult> {
    const q = args.q as string;
    if (!q) {
      return { content: [{ type: 'text', text: 'q is required' }], isError: true };
    }
    const page = (args.page as number) ?? 1;
    const pageSuffix = page > 1 ? `/page-${page}` : '';
    return this.request(`/search/${encodeURIComponent(q)}${pageSuffix}.atom`);
  }

  private async getProgramme(args: Record<string, unknown>): Promise<ToolResult> {
    const title = args.brand_web_safe_title as string;
    if (!title) {
      return { content: [{ type: 'text', text: 'brand_web_safe_title is required' }], isError: true };
    }
    return this.request(`/${encodeURIComponent(title)}.atom`);
  }

  private async getEpisodeGuide(args: Record<string, unknown>): Promise<ToolResult> {
    const title = args.brand_web_safe_title as string;
    if (!title) {
      return { content: [{ type: 'text', text: 'brand_web_safe_title is required' }], isError: true };
    }
    const series = args.series_number as number | undefined;
    const episode = args.episode_number as number | undefined;
    if (series !== undefined && episode !== undefined) {
      return this.request(`/${encodeURIComponent(title)}/episode-guide/series-${series}/episode-${episode}.atom`);
    }
    if (series !== undefined) {
      return this.request(`/${encodeURIComponent(title)}/episode-guide/series-${series}.atom`);
    }
    return this.request(`/${encodeURIComponent(title)}/episode-guide.atom`);
  }

  private async getProgrammeVideos(args: Record<string, unknown>): Promise<ToolResult> {
    const title = args.brand_web_safe_title as string;
    if (!title) {
      return { content: [{ type: 'text', text: 'brand_web_safe_title is required' }], isError: true };
    }
    const series = args.series_number as number | undefined;
    const episode = args.episode_number as number | undefined;
    const clipId = args.clip_asset_id as string | undefined;
    if (clipId) {
      return this.request(`/${encodeURIComponent(title)}/videos/${encodeURIComponent(clipId)}.atom`);
    }
    if (series !== undefined && episode !== undefined) {
      return this.request(`/${encodeURIComponent(title)}/videos/series-${series}/episode-${episode}.atom`);
    }
    if (series !== undefined) {
      return this.request(`/${encodeURIComponent(title)}/videos/series-${series}.atom`);
    }
    return this.request(`/${encodeURIComponent(title)}/videos/all.atom`);
  }

  private async getProgrammeEpg(args: Record<string, unknown>): Promise<ToolResult> {
    const title = args.brand_web_safe_title as string;
    if (!title) {
      return { content: [{ type: 'text', text: 'brand_web_safe_title is required' }], isError: true };
    }
    return this.request(`/${encodeURIComponent(title)}/epg.atom`);
  }

  private async getProgrammeById(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.programme_id as string;
    if (!id) {
      return { content: [{ type: 'text', text: 'programme_id is required' }], isError: true };
    }
    return this.request(`/programme/${encodeURIComponent(id)}.atom`);
  }

  private async getCategories(): Promise<ToolResult> {
    return this.request('/categories.atom');
  }

  private async getCategoryProgrammes(args: Record<string, unknown>): Promise<ToolResult> {
    const category = args.category as string;
    if (!category) {
      return { content: [{ type: 'text', text: 'category is required' }], isError: true };
    }
    const channel = args.channel as string | undefined;
    const sort = args.sort as string | undefined;
    const onDemand = args.on_demand as boolean | undefined;
    const page = (args.page as number) ?? 1;
    const pageSuffix = page > 1 ? `/page-${page}` : '';

    let path = `/categories/${encodeURIComponent(category)}`;
    if (channel) {
      path += `/channel/${encodeURIComponent(channel)}`;
    }
    if (onDemand) {
      path += '/4od';
    }
    if (sort === 'popular') {
      path += '/popular';
    } else if (sort === 'title') {
      path += '/title';
    }
    path += `${pageSuffix}.atom`;
    return this.request(path);
  }

  private async getBrandsOnDemand(args: Record<string, unknown>): Promise<ToolResult> {
    const popular = args.popular as boolean | undefined;
    const page = (args.page as number) ?? 1;
    const pageSuffix = page > 1 ? `/page-${page}` : '';
    if (popular) {
      return this.request(`/brands/4od/popular${pageSuffix}.atom`);
    }
    return this.request(`/brands/4od${pageSuffix}.atom`);
  }

  private async getPopularBrands(args: Record<string, unknown>): Promise<ToolResult> {
    const page = (args.page as number) ?? 1;
    const pageSuffix = page > 1 ? `/page-${page}` : '';
    return this.request(`/brands/popular${pageSuffix}.atom`);
  }

  private async getTvListings(args: Record<string, unknown>): Promise<ToolResult> {
    const year = args.year as number;
    const month = args.month as number;
    const day = args.day as number;
    if (!year || !month || !day) {
      return { content: [{ type: 'text', text: 'year, month, and day are required' }], isError: true };
    }
    const channel = args.channel as string | undefined;
    const yyyy = String(year);
    const mm = this.pad(month);
    const dd = this.pad(day);
    if (channel) {
      return this.request(`/tv-listings/daily/${yyyy}/${mm}/${dd}/${encodeURIComponent(channel)}.atom`);
    }
    return this.request(`/tv-listings/daily/${yyyy}/${mm}/${dd}.atom`);
  }

  static catalog() {
    return {
      name: 'channel4',
      displayName: 'Channel 4',
      version: '1.0.0',
      category: 'media' as const,
      keywords: ['channel4', 'channel-4', 'c4', '4od', 'uk-tv', 'television', 'programmes', 'episodes', 'streaming', 'on-demand', 'media', 'broadcast', 'tv-listings', 'epg'],
      toolNames: ['get_atoz', 'search_programmes', 'get_programme', 'get_episode_guide', 'get_programme_videos', 'get_programme_epg', 'get_programme_by_id', 'get_categories', 'get_category_programmes', 'get_brands_on_demand', 'get_popular_brands', 'get_tv_listings'],
      description: 'Channel 4 API adapter — access UK television programme data, episode guides, 4oD on-demand listings, category browsing, TV schedule, and video assets for Channel 4, E4, More4, and Film4.',
      author: 'protectnil' as const,
    };
  }
}

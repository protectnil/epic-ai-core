/**
 * Associated Press MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28 — AP has not published an official MCP server.
// Community MCP: https://github.com/rbonestell/ap-mcp-server — transport: stdio, auth: API key (unofficial, not published by AP)
//   Last release: v1.2.6 on Sep 9, 2025 (within 6 months). 26 tools. Does NOT qualify as "official" per protocol.
// Our adapter covers: 12 tools (content search, feed, item retrieval, multimedia).
// Recommendation: use-rest-api — no official MCP exists. Community MCP (rbonestell) fails the "official" criterion.
//   Community MCP adds account management and monitoring tools not in our adapter; those endpoints are real but
//   beyond our current scope. Decision: use-rest-api for now; community MCP may be evaluated separately.
//
// NOTE: list_categories calls GET /content/categories — this endpoint is NOT documented in the AP Media API Swagger
//   (api.ap.org/media/v/swagger). Tool is marked UNVERIFIED. Consider removing if AP support confirms it does not exist.
//
// Base URL: https://api.ap.org/media/v
// Auth: API key in "x-api-key" header (x-apikey also supported per docs). Contact AP Customer Support to obtain a key.
// Docs: https://api.ap.org/media/v/docs/  |  Swagger: https://api.ap.org/media/v/swagger/
//       Samples: https://github.com/TheAssociatedPress/APISamples
// Rate limits: Not publicly specified; governed by contract tier. Allow up to 30s timeout on /content/feed.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface AssociatedPressConfig {
  apiKey: string;
  baseUrl?: string;
}

export class AssociatedPressMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: AssociatedPressConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = (config.baseUrl ?? 'https://api.ap.org/media/v').replace(/\/$/, '');
  }

  static catalog() {
    return {
      name: 'associated-press',
      displayName: 'Associated Press',
      version: '1.0.0',
      category: 'misc' as const,
      keywords: [
        'associated press', 'ap', 'news', 'wire service', 'journalism', 'media',
        'content', 'articles', 'stories', 'photos', 'video', 'feed', 'search',
        'breaking news', 'press wire',
      ],
      toolNames: [
        'search_content', 'get_content_feed', 'get_item', 'get_item_by_uri',
        'search_photos', 'search_videos', 'get_rendition',
        'list_categories', 'search_by_subject', 'search_by_product',
        'get_latest_news', 'search_by_date_range',
      ],
      description: 'Access AP wire service content: search articles, photos, and video; poll live feeds; retrieve full item metadata and renditions.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'search_content',
        description: 'Search AP content across text, photos, and video using keyword queries with optional type and date filters',
        inputSchema: {
          type: 'object',
          properties: {
            q: {
              type: 'string',
              description: 'Search query. Supports field operators: type:text, type:picture, type:video, productid:NNNN, mindate:>now-3d',
            },
            page_size: {
              type: 'number',
              description: 'Number of results per page (default: 10, max: 100)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 0)',
            },
            sort: {
              type: 'string',
              description: 'Sort order: versioncreated:desc (newest first, default) or versioncreated:asc',
            },
            exclude: {
              type: 'string',
              description: 'Comma-separated fields to exclude from response (e.g. renditions.main)',
            },
          },
          required: ['q'],
        },
      },
      {
        name: 'get_content_feed',
        description: 'Poll the AP live content feed for new and updated items. Use next_page links from previous responses for continuous monitoring.',
        inputSchema: {
          type: 'object',
          properties: {
            q: {
              type: 'string',
              description: 'Filter query (e.g. productid:31990+AND+mindate:>now-3d). Omit for all content.',
            },
            page_size: {
              type: 'number',
              description: 'Number of items per page (default: 10, max: 100)',
            },
            exclude: {
              type: 'string',
              description: 'Comma-separated fields to exclude (e.g. renditions.main reduces response size)',
            },
            next_page: {
              type: 'string',
              description: 'Full next_page URL returned by a previous feed response — use to poll for new content',
            },
          },
        },
      },
      {
        name: 'get_item',
        description: 'Retrieve full metadata for a specific AP content item by its item ID',
        inputSchema: {
          type: 'object',
          properties: {
            item_id: {
              type: 'string',
              description: 'AP item ID (e.g. tag:ap.org,2024:XXX or bare numeric/alphanumeric ID)',
            },
          },
          required: ['item_id'],
        },
      },
      {
        name: 'get_item_by_uri',
        description: 'Retrieve a specific AP content item using its full URI as returned in search or feed results',
        inputSchema: {
          type: 'object',
          properties: {
            uri: {
              type: 'string',
              description: 'Full item URI from an AP search or feed response (e.g. https://api.ap.org/media/v/content/...)',
            },
          },
          required: ['uri'],
        },
      },
      {
        name: 'search_photos',
        description: 'Search AP photographic content with keyword queries and optional subject or date filters',
        inputSchema: {
          type: 'object',
          properties: {
            q: {
              type: 'string',
              description: 'Keyword search query for photos',
            },
            page_size: {
              type: 'number',
              description: 'Number of results (default: 10, max: 100)',
            },
            page: {
              type: 'number',
              description: 'Page number (default: 0)',
            },
            exclude: {
              type: 'string',
              description: 'Fields to exclude from each result (e.g. renditions.main)',
            },
          },
          required: ['q'],
        },
      },
      {
        name: 'search_videos',
        description: 'Search AP video content with keyword queries',
        inputSchema: {
          type: 'object',
          properties: {
            q: {
              type: 'string',
              description: 'Keyword search query for videos',
            },
            page_size: {
              type: 'number',
              description: 'Number of results (default: 10, max: 100)',
            },
            page: {
              type: 'number',
              description: 'Page number (default: 0)',
            },
          },
          required: ['q'],
        },
      },
      {
        name: 'get_rendition',
        description: 'Download or retrieve the URL of a specific rendition (image, video, text file) for an AP content item',
        inputSchema: {
          type: 'object',
          properties: {
            rendition_href: {
              type: 'string',
              description: 'Full href URL from a rendition object in an AP item response',
            },
          },
          required: ['rendition_href'],
        },
      },
      {
        name: 'list_categories',
        description: 'List available AP content categories and product IDs for filtering searches and feeds',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'search_by_subject',
        description: 'Search AP content filtered to a specific subject or topic category',
        inputSchema: {
          type: 'object',
          properties: {
            subject: {
              type: 'string',
              description: 'Subject or topic to filter by (e.g. sports, politics, technology)',
            },
            q: {
              type: 'string',
              description: 'Additional keyword query to narrow results within the subject',
            },
            page_size: {
              type: 'number',
              description: 'Number of results (default: 10, max: 100)',
            },
          },
          required: ['subject'],
        },
      },
      {
        name: 'search_by_product',
        description: 'Search AP content filtered to a specific product ID (wire service feed category)',
        inputSchema: {
          type: 'object',
          properties: {
            product_id: {
              type: 'string',
              description: 'AP product ID number to filter by (e.g. 31990 for AP Top News)',
            },
            q: {
              type: 'string',
              description: 'Additional keyword query within the product',
            },
            page_size: {
              type: 'number',
              description: 'Number of results (default: 10, max: 100)',
            },
          },
          required: ['product_id'],
        },
      },
      {
        name: 'get_latest_news',
        description: 'Retrieve the most recent AP text news items from the past 24 hours',
        inputSchema: {
          type: 'object',
          properties: {
            page_size: {
              type: 'number',
              description: 'Number of items to retrieve (default: 20, max: 100)',
            },
            exclude: {
              type: 'string',
              description: 'Fields to exclude from each result (e.g. renditions.main)',
            },
          },
        },
      },
      {
        name: 'search_by_date_range',
        description: 'Search AP content published within a specific date range using AP date query syntax',
        inputSchema: {
          type: 'object',
          properties: {
            q: {
              type: 'string',
              description: 'Keyword query to search within the date range',
            },
            from_date: {
              type: 'string',
              description: 'Start date in ISO 8601 format (e.g. 2024-01-01T00:00:00Z) or relative (e.g. now-7d)',
            },
            to_date: {
              type: 'string',
              description: 'End date in ISO 8601 format (e.g. 2024-01-31T23:59:59Z) or now',
            },
            content_type: {
              type: 'string',
              description: 'Filter by content type: text, picture, video (omit for all types)',
            },
            page_size: {
              type: 'number',
              description: 'Number of results (default: 10, max: 100)',
            },
          },
          required: ['q', 'from_date'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'search_content':
          return this.searchContent(args);
        case 'get_content_feed':
          return this.getContentFeed(args);
        case 'get_item':
          return this.getItem(args);
        case 'get_item_by_uri':
          return this.getItemByUri(args);
        case 'search_photos':
          return this.searchPhotos(args);
        case 'search_videos':
          return this.searchVideos(args);
        case 'get_rendition':
          return this.getRendition(args);
        case 'list_categories':
          return this.listCategories();
        case 'search_by_subject':
          return this.searchBySubject(args);
        case 'search_by_product':
          return this.searchByProduct(args);
        case 'get_latest_news':
          return this.getLatestNews(args);
        case 'search_by_date_range':
          return this.searchByDateRange(args);
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
      'x-api-key': this.apiKey,
      'User-Agent': 'EpicAI-AP-Adapter/1.0',
    };
  }

  private async apGet(path: string, params?: Record<string, string>): Promise<ToolResult> {
    const qs = params && Object.keys(params).length > 0 ? '?' + new URLSearchParams(params).toString() : '';
    const url = `${this.baseUrl}${path}${qs}`;
    const response = await this.fetchWithRetry(url, { method: 'GET', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `AP API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apGetAbsolute(url: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(url, { method: 'GET', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `AP API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async searchContent(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.q) return { content: [{ type: 'text', text: 'q is required' }], isError: true };
    const params: Record<string, string> = { q: args.q as string };
    if (args.page_size !== undefined) params.page_size = String(args.page_size);
    if (args.page !== undefined) params.page = String(args.page);
    if (args.sort) params.sort = args.sort as string;
    if (args.exclude) params.exclude = args.exclude as string;
    return this.apGet('/content/search', params);
  }

  private async getContentFeed(args: Record<string, unknown>): Promise<ToolResult> {
    // If a next_page full URL is provided, follow it directly
    if (args.next_page) {
      return this.apGetAbsolute(args.next_page as string);
    }
    const params: Record<string, string> = {};
    if (args.q) params.q = args.q as string;
    if (args.page_size !== undefined) params.page_size = String(args.page_size);
    if (args.exclude) params.exclude = args.exclude as string;
    return this.apGet('/content/feed', params);
  }

  private async getItem(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.item_id) return { content: [{ type: 'text', text: 'item_id is required' }], isError: true };
    return this.apGet(`/content/${encodeURIComponent(args.item_id as string)}`);
  }

  private async getItemByUri(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.uri) return { content: [{ type: 'text', text: 'uri is required' }], isError: true };
    return this.apGetAbsolute(args.uri as string);
  }

  private async searchPhotos(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.q) return { content: [{ type: 'text', text: 'q is required' }], isError: true };
    const params: Record<string, string> = { q: `type:picture AND ${args.q as string}` };
    if (args.page_size !== undefined) params.page_size = String(args.page_size);
    if (args.page !== undefined) params.page = String(args.page);
    if (args.exclude) params.exclude = args.exclude as string;
    return this.apGet('/content/search', params);
  }

  private async searchVideos(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.q) return { content: [{ type: 'text', text: 'q is required' }], isError: true };
    const params: Record<string, string> = { q: `type:video AND ${args.q as string}` };
    if (args.page_size !== undefined) params.page_size = String(args.page_size);
    if (args.page !== undefined) params.page = String(args.page);
    return this.apGet('/content/search', params);
  }

  private async getRendition(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.rendition_href) return { content: [{ type: 'text', text: 'rendition_href is required' }], isError: true };
    // Rendition links may redirect; return the href and status for the caller
    const href = args.rendition_href as string;
    const response = await this.fetchWithRetry(href, {
      method: 'HEAD',
      headers: this.headers,
      redirect: 'follow',
    });
    const result = {
      href,
      final_url: response.url,
      status: response.status,
      content_type: response.headers.get('content-type'),
      content_length: response.headers.get('content-length'),
    };
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }], isError: !response.ok };
  }

  private async listCategories(): Promise<ToolResult> {
    // The AP API exposes taxonomy/category endpoints
    return this.apGet('/content/categories');
  }

  private async searchBySubject(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.subject) return { content: [{ type: 'text', text: 'subject is required' }], isError: true };
    const baseQ = args.q ? `${args.q as string} AND subject:${args.subject as string}` : `subject:${args.subject as string}`;
    const params: Record<string, string> = { q: baseQ };
    if (args.page_size !== undefined) params.page_size = String(args.page_size);
    return this.apGet('/content/search', params);
  }

  private async searchByProduct(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.product_id) return { content: [{ type: 'text', text: 'product_id is required' }], isError: true };
    const baseQ = args.q
      ? `productid:${args.product_id as string} AND ${args.q as string}`
      : `productid:${args.product_id as string}`;
    const params: Record<string, string> = { q: baseQ };
    if (args.page_size !== undefined) params.page_size = String(args.page_size);
    return this.apGet('/content/search', params);
  }

  private async getLatestNews(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      q: 'type:text AND mindate:>now-24h',
      page_size: String((args.page_size as number) ?? 20),
    };
    if (args.exclude) params.exclude = args.exclude as string;
    return this.apGet('/content/feed', params);
  }

  private async searchByDateRange(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.q || !args.from_date) return { content: [{ type: 'text', text: 'q and from_date are required' }], isError: true };
    let q = args.q as string;
    q += ` AND mindate:>=${args.from_date as string}`;
    if (args.to_date) q += ` AND maxdate:<=${args.to_date as string}`;
    if (args.content_type) q += ` AND type:${args.content_type as string}`;
    const params: Record<string, string> = { q };
    if (args.page_size !== undefined) params.page_size = String(args.page_size);
    return this.apGet('/content/search', params);
  }
}

/**
 * Brandwatch MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// No official Brandwatch MCP server found on GitHub, npm, or the Brandwatch developer portal.
// Community MCP lists do not include a Brandwatch entry. Build this REST wrapper for all deployments.
// Our adapter covers: 17 tools. Vendor MCP covers: 0 tools.
// Recommendation: use-rest-api — no official MCP server exists.
//
// Base URL: https://api.brandwatch.com
// Auth: OAuth2 resource-owner password flow (API user credential type)
//       POST https://api.brandwatch.com/oauth/token
//       ?username=EMAIL&grant_type=api-password&client_id=brandwatch-api-client
//       Body: password=PASSWORD (form-urlencoded). Returns bearer access_token.
//       Token validity: ~1 year by default; adapter refreshes proactively.
// Docs: https://developers.brandwatch.com/docs/getting-started
// Rate limits: 30 requests per 10-minute rolling window (per client). HTTP 429 on breach.
//   Headers: x-rate-limit, x-rate-limit-used returned on each response.
//
// NOTE on data retrieval endpoints: Brandwatch docs confirm the following operations exist:
//   Total Mentions (count), Topics, Top Sites, Top Authors, Basic charts (volume/sentiment by dimension).
//   Exact URL paths for /data/volume, /data/sentiment, /data/volume/topics, /data/topsites,
//   /data/authors are consistent with documented examples and the official Python bcr-api library
//   but were partially obscured in public docs. Marked UNVERIFIED where paths cannot be confirmed
//   from the public documentation page content alone.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface BrandwatchConfig {
  username: string;
  password: string;
  baseUrl?: string;
}

export class BrandwatchMCPServer extends MCPAdapterBase {
  private readonly username: string;
  private readonly password: string;
  private readonly baseUrl: string;

  private bearerToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(config: BrandwatchConfig) {
    super();
    this.username = config.username;
    this.password = config.password;
    this.baseUrl = config.baseUrl ?? 'https://api.brandwatch.com';
  }

  static catalog() {
    return {
      name: 'brandwatch',
      displayName: 'Brandwatch',
      version: '1.0.0',
      category: 'social',
      keywords: [
        'brandwatch', 'social listening', 'consumer intelligence', 'mention', 'sentiment',
        'social media monitoring', 'query', 'project', 'topic', 'buzz', 'influencer',
        'brand monitoring', 'analytics', 'media', 'online conversation',
      ],
      toolNames: [
        'list_projects', 'get_project',
        'list_queries', 'get_query', 'create_query',
        'list_query_groups', 'get_query_group',
        'list_mentions', 'get_mention', 'search_mentions',
        'get_mention_volume', 'get_mention_sentiment',
        'get_topics', 'get_top_sites', 'get_top_authors',
        'list_categories', 'list_tags',
      ],
      description: 'Brandwatch social listening and consumer intelligence: monitor brand mentions, analyze sentiment, explore topics, and query social media data across projects.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      // ── Projects ──────────────────────────────────────────────────────────
      {
        name: 'list_projects',
        description: 'List all Brandwatch projects the authenticated user has access to',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_project',
        description: 'Get details for a specific Brandwatch project by project ID',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: { type: 'number', description: 'Brandwatch project ID (integer)' },
          },
          required: ['project_id'],
        },
      },
      // ── Queries ───────────────────────────────────────────────────────────
      {
        name: 'list_queries',
        description: 'List all keyword-based search queries in a Brandwatch project',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: { type: 'number', description: 'Project ID to list queries for' },
          },
          required: ['project_id'],
        },
      },
      {
        name: 'get_query',
        description: 'Get full details for a specific Brandwatch query including boolean search string',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: { type: 'number', description: 'Project ID that contains the query' },
            query_id: { type: 'number', description: 'Query ID to retrieve' },
          },
          required: ['project_id', 'query_id'],
        },
      },
      {
        name: 'create_query',
        description: 'Create a new keyword-based monitoring query in a Brandwatch project with Boolean search syntax',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: { type: 'number', description: 'Project ID to create the query in' },
            name: { type: 'string', description: 'Display name for the query' },
            booleanQuery: {
              type: 'string',
              description: 'Boolean search string using AND, OR, NOT operators and quoted phrases',
            },
            languages: {
              type: 'string',
              description: 'Comma-separated language codes to filter (e.g. "en,es,fr")',
            },
            startDate: {
              type: 'string',
              description: 'Backfill start date in ISO 8601 format (e.g. 2024-01-01T00:00:00Z)',
            },
          },
          required: ['project_id', 'name', 'booleanQuery'],
        },
      },
      // ── Query Groups ──────────────────────────────────────────────────────
      {
        name: 'list_query_groups',
        description: 'List query groups in a Brandwatch project (groups aggregate multiple queries)',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: { type: 'number', description: 'Project ID to list query groups for' },
          },
          required: ['project_id'],
        },
      },
      {
        name: 'get_query_group',
        description: 'Get details for a specific query group including its constituent query IDs',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: { type: 'number', description: 'Project ID that contains the query group' },
            group_id: { type: 'number', description: 'Query group ID to retrieve' },
          },
          required: ['project_id', 'group_id'],
        },
      },
      // ── Mentions ──────────────────────────────────────────────────────────
      {
        name: 'list_mentions',
        description: 'List recent mentions matching a query with date range, sentiment, and pagination filters',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: { type: 'number', description: 'Project ID' },
            query_id: { type: 'number', description: 'Query ID to retrieve mentions for' },
            startDate: {
              type: 'string',
              description: 'Start date for mentions in ISO 8601 format (e.g. 2024-01-01T00:00:00Z)',
            },
            endDate: {
              type: 'string',
              description: 'End date for mentions in ISO 8601 format',
            },
            pageSize: { type: 'number', description: 'Mentions per page (default: 50, max: 5000)' },
            page: { type: 'number', description: 'Page number for pagination (default: 0)' },
            sentiment: {
              type: 'string',
              description: 'Filter by sentiment: positive, negative, neutral',
            },
            orderBy: {
              type: 'string',
              description: 'Sort field: date or engagementScore (default: date)',
            },
            orderDirection: {
              type: 'string',
              description: 'Sort direction: asc or desc (default: desc)',
            },
          },
          required: ['project_id', 'query_id', 'startDate', 'endDate'],
        },
      },
      {
        name: 'get_mention',
        description: 'Get full text and metadata for a single Brandwatch mention by its mention ID',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: { type: 'number', description: 'Project ID' },
            mention_id: { type: 'number', description: 'Mention ID to retrieve' },
          },
          required: ['project_id', 'mention_id'],
        },
      },
      {
        name: 'search_mentions',
        description: 'Search mentions within a query using keyword filters, site, country, and sentiment',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: { type: 'number', description: 'Project ID' },
            query_id: { type: 'number', description: 'Query ID to search within' },
            startDate: { type: 'string', description: 'Start date ISO 8601' },
            endDate: { type: 'string', description: 'End date ISO 8601' },
            keyword: { type: 'string', description: 'Additional keyword to filter within results' },
            site: { type: 'string', description: 'Filter by source site (e.g. twitter.com)' },
            country: { type: 'string', description: 'Filter by country code (ISO 3166-1 alpha-2, e.g. US)' },
            sentiment: { type: 'string', description: 'Filter by sentiment: positive, negative, neutral' },
            pageSize: { type: 'number', description: 'Results per page (default: 50)' },
            page: { type: 'number', description: 'Page number (default: 0)' },
          },
          required: ['project_id', 'query_id', 'startDate', 'endDate'],
        },
      },
      // ── Volume & Sentiment Analytics ──────────────────────────────────────
      {
        name: 'get_mention_volume',
        description: 'Get daily mention volume totals for a query over a date range for trend analysis',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: { type: 'number', description: 'Project ID' },
            query_id: { type: 'number', description: 'Query ID' },
            startDate: { type: 'string', description: 'Start date ISO 8601' },
            endDate: { type: 'string', description: 'End date ISO 8601' },
            granularity: {
              type: 'string',
              description: 'Time bucket size: hourly, daily, weekly, monthly (default: daily)',
            },
          },
          required: ['project_id', 'query_id', 'startDate', 'endDate'],
        },
      },
      {
        name: 'get_mention_sentiment',
        description: 'Get sentiment breakdown (positive, negative, neutral counts) for a query over a date range',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: { type: 'number', description: 'Project ID' },
            query_id: { type: 'number', description: 'Query ID' },
            startDate: { type: 'string', description: 'Start date ISO 8601' },
            endDate: { type: 'string', description: 'End date ISO 8601' },
          },
          required: ['project_id', 'query_id', 'startDate', 'endDate'],
        },
      },
      // ── Topics & Trends ───────────────────────────────────────────────────
      {
        name: 'get_topics',
        description: 'Get trending topics and themes from a query mentions over a date range',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: { type: 'number', description: 'Project ID' },
            query_id: { type: 'number', description: 'Query ID' },
            startDate: { type: 'string', description: 'Start date ISO 8601' },
            endDate: { type: 'string', description: 'End date ISO 8601' },
            limit: { type: 'number', description: 'Max topics to return (default: 20)' },
          },
          required: ['project_id', 'query_id', 'startDate', 'endDate'],
        },
      },
      {
        name: 'get_top_sites',
        description: 'Get the top source sites driving mention volume for a query over a date range',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: { type: 'number', description: 'Project ID' },
            query_id: { type: 'number', description: 'Query ID' },
            startDate: { type: 'string', description: 'Start date ISO 8601' },
            endDate: { type: 'string', description: 'End date ISO 8601' },
            limit: { type: 'number', description: 'Max sites to return (default: 20)' },
          },
          required: ['project_id', 'query_id', 'startDate', 'endDate'],
        },
      },
      {
        name: 'get_top_authors',
        description: 'Get the most prolific authors or accounts generating mentions in a query over a date range',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: { type: 'number', description: 'Project ID' },
            query_id: { type: 'number', description: 'Query ID' },
            startDate: { type: 'string', description: 'Start date ISO 8601' },
            endDate: { type: 'string', description: 'End date ISO 8601' },
            limit: { type: 'number', description: 'Max authors to return (default: 20)' },
          },
          required: ['project_id', 'query_id', 'startDate', 'endDate'],
        },
      },
      // ── Categories & Tags ─────────────────────────────────────────────────
      {
        name: 'list_categories',
        description: 'List mention categories configured in a Brandwatch project for classification',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: { type: 'number', description: 'Project ID to list categories for' },
          },
          required: ['project_id'],
        },
      },
      {
        name: 'list_tags',
        description: 'List all tags available in a Brandwatch project for mention labeling',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: { type: 'number', description: 'Project ID to list tags for' },
          },
          required: ['project_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_projects':         return this.listProjects();
        case 'get_project':           return this.getProject(args);
        case 'list_queries':          return this.listQueries(args);
        case 'get_query':             return this.getQuery(args);
        case 'create_query':          return this.createQuery(args);
        case 'list_query_groups':     return this.listQueryGroups(args);
        case 'get_query_group':       return this.getQueryGroup(args);
        case 'list_mentions':         return this.listMentions(args);
        case 'get_mention':           return this.getMention(args);
        case 'search_mentions':       return this.searchMentions(args);
        case 'get_mention_volume':    return this.getMentionVolume(args);
        case 'get_mention_sentiment': return this.getMentionSentiment(args);
        case 'get_topics':            return this.getTopics(args);
        case 'get_top_sites':         return this.getTopSites(args);
        case 'get_top_authors':       return this.getTopAuthors(args);
        case 'list_categories':       return this.listCategories(args);
        case 'list_tags':             return this.listTags(args);
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

  // ── Private helpers ────────────────────────────────────────────────────────

  private async getOrRefreshToken(): Promise<string> {
    const now = Date.now();
    if (this.bearerToken && this.tokenExpiry > now) return this.bearerToken;

    const url = new URL(`${this.baseUrl}/oauth/token`);
    url.searchParams.set('username', this.username);
    url.searchParams.set('grant_type', 'api-password');
    url.searchParams.set('client_id', 'brandwatch-api-client');

    const response = await this.fetchWithRetry(url.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ password: this.password }).toString(),
    });
    if (!response.ok) throw new Error(`Brandwatch OAuth token request failed: ${response.statusText}`);
    const data = await response.json() as { access_token: string; expires_in: number };
    this.bearerToken = data.access_token;
    // Default token validity is ~1 year; expires_in is in seconds
    this.tokenExpiry = now + ((data.expires_in ?? 31536000) - 60) * 1000;
    return this.bearerToken;
  }

  private async get(path: string, params: Record<string, string> = {}): Promise<ToolResult> {
    const token = await this.getOrRefreshToken();
    const qs = Object.keys(params).length ? '?' + new URLSearchParams(params).toString() : '';
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}${qs}`, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async post(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const token = await this.getOrRefreshToken();
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  // ── Tool implementations ──────────────────────────────────────────────────

  private async listProjects(): Promise<ToolResult> {
    return this.get('/projects');
  }

  private async getProject(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.project_id) return { content: [{ type: 'text', text: 'project_id is required' }], isError: true };
    return this.get(`/projects/${encodeURIComponent(args.project_id as string)}`);
  }

  private async listQueries(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.project_id) return { content: [{ type: 'text', text: 'project_id is required' }], isError: true };
    return this.get(`/projects/${encodeURIComponent(args.project_id as string)}/queries`);
  }

  private async getQuery(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.project_id || !args.query_id) {
      return { content: [{ type: 'text', text: 'project_id and query_id are required' }], isError: true };
    }
    return this.get(`/projects/${encodeURIComponent(args.project_id as string)}/queries/${encodeURIComponent(args.query_id as string)}`);
  }

  private async createQuery(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.project_id || !args.name || !args.booleanQuery) {
      return { content: [{ type: 'text', text: 'project_id, name, and booleanQuery are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      name: args.name,
      booleanQuery: args.booleanQuery,
    };
    if (args.languages) body.languages = (args.languages as string).split(',');
    if (args.startDate) body.startDate = args.startDate;
    return this.post(`/projects/${encodeURIComponent(args.project_id as string)}/queries`, body);
  }

  private async listQueryGroups(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.project_id) return { content: [{ type: 'text', text: 'project_id is required' }], isError: true };
    return this.get(`/projects/${encodeURIComponent(args.project_id as string)}/querygroups`);
  }

  private async getQueryGroup(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.project_id || !args.group_id) {
      return { content: [{ type: 'text', text: 'project_id and group_id are required' }], isError: true };
    }
    return this.get(`/projects/${encodeURIComponent(args.project_id as string)}/querygroups/${encodeURIComponent(args.group_id as string)}`);
  }

  private async listMentions(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.project_id || !args.query_id || !args.startDate || !args.endDate) {
      return { content: [{ type: 'text', text: 'project_id, query_id, startDate, and endDate are required' }], isError: true };
    }
    const params: Record<string, string> = {
      startDate: args.startDate as string,
      endDate: args.endDate as string,
      pageSize: String((args.pageSize as number) ?? 50),
      page: String((args.page as number) ?? 0),
      orderBy: (args.orderBy as string) ?? 'date',
      orderDirection: (args.orderDirection as string) ?? 'desc',
    };
    if (args.sentiment) params.sentiment = args.sentiment as string;
    return this.get(`/projects/${encodeURIComponent(args.project_id as string)}/data/mentions/fulltext`, params);
  }

  private async getMention(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.project_id || !args.mention_id) {
      return { content: [{ type: 'text', text: 'project_id and mention_id are required' }], isError: true };
    }
    return this.get(`/projects/${encodeURIComponent(args.project_id as string)}/data/mentions/${encodeURIComponent(args.mention_id as string)}`);
  }

  private async searchMentions(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.project_id || !args.query_id || !args.startDate || !args.endDate) {
      return { content: [{ type: 'text', text: 'project_id, query_id, startDate, and endDate are required' }], isError: true };
    }
    const params: Record<string, string> = {
      startDate: args.startDate as string,
      endDate: args.endDate as string,
      pageSize: String((args.pageSize as number) ?? 50),
      page: String((args.page as number) ?? 0),
    };
    if (args.keyword) params.keyword = args.keyword as string;
    if (args.site) params.site = args.site as string;
    if (args.country) params.country = args.country as string;
    if (args.sentiment) params.sentiment = args.sentiment as string;
    return this.get(`/projects/${encodeURIComponent(args.project_id as string)}/data/mentions`, params);
  }

  private async getMentionVolume(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.project_id || !args.query_id || !args.startDate || !args.endDate) {
      return { content: [{ type: 'text', text: 'project_id, query_id, startDate, and endDate are required' }], isError: true };
    }
    const params: Record<string, string> = {
      startDate: args.startDate as string,
      endDate: args.endDate as string,
      granularity: (args.granularity as string) ?? 'daily',
    };
    return this.get(`/projects/${encodeURIComponent(args.project_id as string)}/data/volume`, params);
  }

  private async getMentionSentiment(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.project_id || !args.query_id || !args.startDate || !args.endDate) {
      return { content: [{ type: 'text', text: 'project_id, query_id, startDate, and endDate are required' }], isError: true };
    }
    const params: Record<string, string> = {
      startDate: args.startDate as string,
      endDate: args.endDate as string,
    };
    return this.get(`/projects/${encodeURIComponent(args.project_id as string)}/data/sentiment`, params);
  }

  private async getTopics(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.project_id || !args.query_id || !args.startDate || !args.endDate) {
      return { content: [{ type: 'text', text: 'project_id, query_id, startDate, and endDate are required' }], isError: true };
    }
    const params: Record<string, string> = {
      startDate: args.startDate as string,
      endDate: args.endDate as string,
      limit: String((args.limit as number) ?? 20),
    };
    return this.get(`/projects/${encodeURIComponent(args.project_id as string)}/data/volume/topics`, params);
  }

  private async getTopSites(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.project_id || !args.query_id || !args.startDate || !args.endDate) {
      return { content: [{ type: 'text', text: 'project_id, query_id, startDate, and endDate are required' }], isError: true };
    }
    const params: Record<string, string> = {
      startDate: args.startDate as string,
      endDate: args.endDate as string,
      limit: String((args.limit as number) ?? 20),
    };
    return this.get(`/projects/${encodeURIComponent(args.project_id as string)}/data/topsites`, params);
  }

  private async getTopAuthors(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.project_id || !args.query_id || !args.startDate || !args.endDate) {
      return { content: [{ type: 'text', text: 'project_id, query_id, startDate, and endDate are required' }], isError: true };
    }
    const params: Record<string, string> = {
      startDate: args.startDate as string,
      endDate: args.endDate as string,
      limit: String((args.limit as number) ?? 20),
    };
    return this.get(`/projects/${encodeURIComponent(args.project_id as string)}/data/authors`, params);
  }

  private async listCategories(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.project_id) return { content: [{ type: 'text', text: 'project_id is required' }], isError: true };
    return this.get(`/projects/${encodeURIComponent(args.project_id as string)}/categories`);
  }

  private async listTags(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.project_id) return { content: [{ type: 'text', text: 'project_id is required' }], isError: true };
    return this.get(`/projects/${encodeURIComponent(args.project_id as string)}/tags`);
  }
}

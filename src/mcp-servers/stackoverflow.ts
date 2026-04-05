/**
 * Stack Overflow MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://mcp.stackoverflow.com (hosted remote server) — transport: streamable-HTTP (via npx mcp-remote), auth: OAuth2 (Stack Exchange)
// GitHub repo (README only): https://github.com/StackExchange/Stack-MCP — 3 commits, released Dec 2025, in public beta.
// Vendor MCP exposes 2 tools: so_search, get_content. Fails criterion #3 (fewer than 10 tools).
// Our adapter covers: 13 tools (questions, answers, comments, users, tags, badges, search, site info).
// Recommendation: use-rest-api — vendor MCP fails criterion #3 (2 tools, not 10+ named tools).
//   Also: 100 calls/day cap makes it unsuitable for production. Our adapter provides full structured
//   data access across all Stack Exchange sites without the daily cap.
//
// Base URL: https://api.stackexchange.com/2.3
// Auth: API key (rate limit: 10,000 requests/day with key vs 300/day without). Optional OAuth2 access_token
//   for write operations. Pass key and access_token as query parameters.
// Docs: https://api.stackexchange.com/docs
// Rate limits: 300 requests/day (no key), 10,000/day (with key), throttle on burst — responses include
//   quota_max and quota_remaining fields

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface StackOverflowConfig {
  /** Stack Exchange API key. Register at https://stackapps.com/apps/oauth/register */
  apiKey: string;
  /** Optional OAuth2 access token for write operations and authenticated reads */
  accessToken?: string;
  /**
   * Stack Exchange site to query (default: stackoverflow).
   * Other values: superuser, serverfault, askubuntu, math, unix, etc.
   */
  site?: string;
}

export class StackOverflowMCPServer extends MCPAdapterBase {
  private readonly baseUrl = 'https://api.stackexchange.com/2.3';
  private readonly apiKey: string;
  private readonly accessToken?: string;
  private readonly defaultSite: string;

  constructor(config: StackOverflowConfig) {
    super();
    this.apiKey = config.apiKey;
    this.accessToken = config.accessToken;
    this.defaultSite = config.site ?? 'stackoverflow';
  }

  static catalog() {
    return {
      name: 'stackoverflow',
      displayName: 'Stack Overflow',
      version: '1.0.0',
      category: 'misc' as const,
      keywords: ['stackoverflow', 'stack-overflow', 'stack-exchange', 'questions', 'answers', 'programming', 'developer', 'qa', 'knowledge', 'tags', 'badges'],
      toolNames: [
        'search_questions', 'get_question', 'get_answers', 'get_answer',
        'get_comments', 'get_user', 'search_users', 'get_user_answers',
        'get_user_questions', 'search_tags', 'get_tag_info',
        'list_badges', 'get_site_info',
      ],
      description: 'Search and retrieve Stack Overflow questions, answers, comments, users, tags, and badges via the Stack Exchange API.',
      author: 'protectnil' as const,
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'search_questions',
        description: 'Search Stack Overflow questions by full-text query, title, or tags with sort and date range filters.',
        inputSchema: {
          type: 'object',
          properties: {
            intitle: {
              type: 'string',
              description: 'Search within question titles only',
            },
            q: {
              type: 'string',
              description: 'Full-text search query across title, body, and tags',
            },
            tagged: {
              type: 'string',
              description: 'Semicolon-separated tags to filter by (e.g. "javascript;typescript")',
            },
            nottagged: {
              type: 'string',
              description: 'Semicolon-separated tags to exclude',
            },
            sort: {
              type: 'string',
              description: 'Sort order: activity (default), votes, creation, relevance',
            },
            order: {
              type: 'string',
              description: 'Order direction: desc (default) or asc',
            },
            pagesize: {
              type: 'number',
              description: 'Number of results per page (max 100, default 30)',
            },
            page: {
              type: 'number',
              description: 'Page number (1-based, default 1)',
            },
            fromdate: {
              type: 'number',
              description: 'Unix timestamp — earliest question creation date',
            },
            todate: {
              type: 'number',
              description: 'Unix timestamp — latest question creation date',
            },
            accepted: {
              type: 'boolean',
              description: 'Filter to only questions with (true) or without (false) an accepted answer',
            },
            min: {
              type: 'number',
              description: 'Minimum value for the sort field (e.g. minimum vote score)',
            },
            site: {
              type: 'string',
              description: 'Stack Exchange site to query (default: stackoverflow). Other values: superuser, serverfault, etc.',
            },
          },
        },
      },
      {
        name: 'get_question',
        description: 'Get one or more Stack Overflow questions by ID including vote score, tags, and answer count.',
        inputSchema: {
          type: 'object',
          properties: {
            ids: {
              type: 'string',
              description: 'Semicolon-separated question IDs (e.g. "12345;67890")',
            },
            filter: {
              type: 'string',
              description: 'API filter string to include additional fields (e.g. "withbody" to include question body)',
            },
            site: {
              type: 'string',
              description: 'Stack Exchange site (default: stackoverflow)',
            },
          },
          required: ['ids'],
        },
      },
      {
        name: 'get_answers',
        description: 'Get all answers for one or more questions by question ID, sorted by votes or activity.',
        inputSchema: {
          type: 'object',
          properties: {
            ids: {
              type: 'string',
              description: 'Semicolon-separated question IDs',
            },
            sort: {
              type: 'string',
              description: 'Sort order: activity, votes (default), creation',
            },
            order: {
              type: 'string',
              description: 'Order direction: desc (default) or asc',
            },
            pagesize: {
              type: 'number',
              description: 'Number of results per page (max 100, default 30)',
            },
            page: {
              type: 'number',
              description: 'Page number (1-based, default 1)',
            },
            filter: {
              type: 'string',
              description: 'API filter string (use "withbody" to include answer body text)',
            },
            site: {
              type: 'string',
              description: 'Stack Exchange site (default: stackoverflow)',
            },
          },
          required: ['ids'],
        },
      },
      {
        name: 'get_answer',
        description: 'Get one or more answers by answer ID including body, vote score, and accepted status.',
        inputSchema: {
          type: 'object',
          properties: {
            ids: {
              type: 'string',
              description: 'Semicolon-separated answer IDs',
            },
            filter: {
              type: 'string',
              description: 'API filter string (use "withbody" to include answer body text)',
            },
            site: {
              type: 'string',
              description: 'Stack Exchange site (default: stackoverflow)',
            },
          },
          required: ['ids'],
        },
      },
      {
        name: 'get_comments',
        description: 'Get comments on a question or answer by post ID. Returns comment text, score, and author.',
        inputSchema: {
          type: 'object',
          properties: {
            ids: {
              type: 'string',
              description: 'Semicolon-separated post IDs (question or answer IDs)',
            },
            sort: {
              type: 'string',
              description: 'Sort order: creation (default), votes',
            },
            order: {
              type: 'string',
              description: 'Order direction: desc (default) or asc',
            },
            pagesize: {
              type: 'number',
              description: 'Number of comments per page (max 100)',
            },
            page: {
              type: 'number',
              description: 'Page number (1-based, default 1)',
            },
            site: {
              type: 'string',
              description: 'Stack Exchange site (default: stackoverflow)',
            },
          },
          required: ['ids'],
        },
      },
      {
        name: 'get_user',
        description: 'Get Stack Overflow user profile by user ID including reputation, badges, and account info.',
        inputSchema: {
          type: 'object',
          properties: {
            ids: {
              type: 'string',
              description: 'Semicolon-separated user IDs',
            },
            filter: {
              type: 'string',
              description: 'API filter string for additional fields',
            },
            site: {
              type: 'string',
              description: 'Stack Exchange site (default: stackoverflow)',
            },
          },
          required: ['ids'],
        },
      },
      {
        name: 'search_users',
        description: 'Search Stack Overflow users by display name with sort options for reputation, creation, or name.',
        inputSchema: {
          type: 'object',
          properties: {
            inname: {
              type: 'string',
              description: 'Filter users whose display name contains this string',
            },
            sort: {
              type: 'string',
              description: 'Sort order: reputation (default), creation, name, modified',
            },
            order: {
              type: 'string',
              description: 'Order direction: desc (default) or asc',
            },
            pagesize: {
              type: 'number',
              description: 'Number of results per page (max 100)',
            },
            page: {
              type: 'number',
              description: 'Page number (1-based, default 1)',
            },
            min: {
              type: 'number',
              description: 'Minimum reputation score',
            },
            site: {
              type: 'string',
              description: 'Stack Exchange site (default: stackoverflow)',
            },
          },
          required: ['inname'],
        },
      },
      {
        name: 'get_user_answers',
        description: "Get answers posted by a specific user, sorted by votes or activity.",
        inputSchema: {
          type: 'object',
          properties: {
            userId: {
              type: 'number',
              description: 'User ID to retrieve answers for',
            },
            sort: {
              type: 'string',
              description: 'Sort order: activity, votes (default), creation',
            },
            order: {
              type: 'string',
              description: 'Order direction: desc (default) or asc',
            },
            pagesize: {
              type: 'number',
              description: 'Number of results per page (max 100, default 30)',
            },
            page: {
              type: 'number',
              description: 'Page number (1-based, default 1)',
            },
            filter: {
              type: 'string',
              description: 'API filter string (use "withbody" to include answer body text)',
            },
            site: {
              type: 'string',
              description: 'Stack Exchange site (default: stackoverflow)',
            },
          },
          required: ['userId'],
        },
      },
      {
        name: 'get_user_questions',
        description: "Get questions asked by a specific user, sorted by votes, activity, or creation date.",
        inputSchema: {
          type: 'object',
          properties: {
            userId: {
              type: 'number',
              description: 'User ID to retrieve questions for',
            },
            sort: {
              type: 'string',
              description: 'Sort order: activity, votes (default), creation, hot, week, month',
            },
            order: {
              type: 'string',
              description: 'Order direction: desc (default) or asc',
            },
            pagesize: {
              type: 'number',
              description: 'Number of results per page (max 100, default 30)',
            },
            page: {
              type: 'number',
              description: 'Page number (1-based, default 1)',
            },
            site: {
              type: 'string',
              description: 'Stack Exchange site (default: stackoverflow)',
            },
          },
          required: ['userId'],
        },
      },
      {
        name: 'search_tags',
        description: 'Search Stack Overflow tags by name fragment, sorted by popularity or activity.',
        inputSchema: {
          type: 'object',
          properties: {
            inname: {
              type: 'string',
              description: 'Filter tags whose name contains this string',
            },
            sort: {
              type: 'string',
              description: 'Sort order: popular (default), activity, name',
            },
            order: {
              type: 'string',
              description: 'Order direction: desc (default) or asc',
            },
            pagesize: {
              type: 'number',
              description: 'Number of results per page (max 100)',
            },
            page: {
              type: 'number',
              description: 'Page number (1-based, default 1)',
            },
            site: {
              type: 'string',
              description: 'Stack Exchange site (default: stackoverflow)',
            },
          },
          required: ['inname'],
        },
      },
      {
        name: 'get_tag_info',
        description: 'Get metadata for specific tags including question count, usage frequency, and related tags.',
        inputSchema: {
          type: 'object',
          properties: {
            tags: {
              type: 'string',
              description: 'Semicolon-separated tag names to look up (e.g. "javascript;python")',
            },
            site: {
              type: 'string',
              description: 'Stack Exchange site (default: stackoverflow)',
            },
          },
          required: ['tags'],
        },
      },
      {
        name: 'list_badges',
        description: 'List all badges on the site or badges awarded to a specific user, with type and class filters.',
        inputSchema: {
          type: 'object',
          properties: {
            userId: {
              type: 'number',
              description: 'If provided, return badges awarded to this specific user',
            },
            inname: {
              type: 'string',
              description: 'Filter badges whose name contains this string',
            },
            sort: {
              type: 'string',
              description: 'Sort order: rank (default), name, type',
            },
            order: {
              type: 'string',
              description: 'Order direction: desc (default) or asc',
            },
            pagesize: {
              type: 'number',
              description: 'Number of results per page (max 100)',
            },
            site: {
              type: 'string',
              description: 'Stack Exchange site (default: stackoverflow)',
            },
          },
        },
      },
      {
        name: 'get_site_info',
        description: 'Get metadata about the Stack Exchange site including user count, question count, and API quota.',
        inputSchema: {
          type: 'object',
          properties: {
            site: {
              type: 'string',
              description: 'Stack Exchange site to get info for (default: stackoverflow)',
            },
          },
        },
      },
    ];
  }

  private addAuth(params: URLSearchParams, site?: string): void {
    params.set('key', this.apiKey);
    if (this.accessToken) params.set('access_token', this.accessToken);
    params.set('site', (site as string | undefined) ?? this.defaultSite);
  }

  private async get(path: string, params: URLSearchParams): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}?${params}`, { method: 'GET' });
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return {
        content: [{ type: 'text', text: `Stack Exchange API error (HTTP ${response.status}): ${errText}` }],
        isError: true,
      };
    }
    let data: unknown;
    try {
      data = await response.json();
    } catch {
      return {
        content: [{ type: 'text', text: `Stack Exchange returned non-JSON response (HTTP ${response.status})` }],
        isError: true,
      };
    }
    return {
      content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }],
      isError: false,
    };
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'search_questions':
          return this.searchQuestions(args);
        case 'get_question':
          return this.getQuestion(args);
        case 'get_answers':
          return this.getAnswers(args);
        case 'get_answer':
          return this.getAnswer(args);
        case 'get_comments':
          return this.getComments(args);
        case 'get_user':
          return this.getUser(args);
        case 'search_users':
          return this.searchUsers(args);
        case 'get_user_answers':
          return this.getUserAnswers(args);
        case 'get_user_questions':
          return this.getUserQuestions(args);
        case 'search_tags':
          return this.searchTags(args);
        case 'get_tag_info':
          return this.getTagInfo(args);
        case 'list_badges':
          return this.listBadges(args);
        case 'get_site_info':
          return this.getSiteInfo(args);
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

  private async searchQuestions(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.intitle) params.set('intitle', args.intitle as string);
    if (args.q) params.set('q', args.q as string);
    if (args.tagged) params.set('tagged', args.tagged as string);
    if (args.nottagged) params.set('nottagged', args.nottagged as string);
    if (args.sort) params.set('sort', args.sort as string);
    if (args.order) params.set('order', args.order as string);
    if (args.pagesize !== undefined) params.set('pagesize', String(args.pagesize));
    if (args.page !== undefined) params.set('page', String(args.page));
    if (args.fromdate !== undefined) params.set('fromdate', String(args.fromdate));
    if (args.todate !== undefined) params.set('todate', String(args.todate));
    if (args.accepted !== undefined) params.set('accepted', String(args.accepted));
    if (args.min !== undefined) params.set('min', String(args.min));
    this.addAuth(params, args.site as string | undefined);
    return this.get('/search/advanced', params);
  }

  private async getQuestion(args: Record<string, unknown>): Promise<ToolResult> {
    const ids = args.ids as string;
    if (!ids) {
      return { content: [{ type: 'text', text: 'ids is required' }], isError: true };
    }
    const params = new URLSearchParams();
    if (args.filter) params.set('filter', args.filter as string);
    this.addAuth(params, args.site as string | undefined);
    return this.get(`/questions/${encodeURIComponent(ids)}`, params);
  }

  private async getAnswers(args: Record<string, unknown>): Promise<ToolResult> {
    const ids = args.ids as string;
    if (!ids) {
      return { content: [{ type: 'text', text: 'ids is required' }], isError: true };
    }
    const params = new URLSearchParams();
    if (args.sort) params.set('sort', args.sort as string);
    if (args.order) params.set('order', args.order as string);
    if (args.pagesize !== undefined) params.set('pagesize', String(args.pagesize));
    if (args.page !== undefined) params.set('page', String(args.page));
    if (args.filter) params.set('filter', args.filter as string);
    this.addAuth(params, args.site as string | undefined);
    return this.get(`/questions/${encodeURIComponent(ids)}/answers`, params);
  }

  private async getAnswer(args: Record<string, unknown>): Promise<ToolResult> {
    const ids = args.ids as string;
    if (!ids) {
      return { content: [{ type: 'text', text: 'ids is required' }], isError: true };
    }
    const params = new URLSearchParams();
    if (args.filter) params.set('filter', args.filter as string);
    this.addAuth(params, args.site as string | undefined);
    return this.get(`/answers/${encodeURIComponent(ids)}`, params);
  }

  private async getComments(args: Record<string, unknown>): Promise<ToolResult> {
    const ids = args.ids as string;
    if (!ids) {
      return { content: [{ type: 'text', text: 'ids is required' }], isError: true };
    }
    const params = new URLSearchParams();
    if (args.sort) params.set('sort', args.sort as string);
    if (args.order) params.set('order', args.order as string);
    if (args.pagesize !== undefined) params.set('pagesize', String(args.pagesize));
    if (args.page !== undefined) params.set('page', String(args.page));
    this.addAuth(params, args.site as string | undefined);
    return this.get(`/posts/${encodeURIComponent(ids)}/comments`, params);
  }

  private async getUser(args: Record<string, unknown>): Promise<ToolResult> {
    const ids = args.ids as string;
    if (!ids) {
      return { content: [{ type: 'text', text: 'ids is required' }], isError: true };
    }
    const params = new URLSearchParams();
    if (args.filter) params.set('filter', args.filter as string);
    this.addAuth(params, args.site as string | undefined);
    return this.get(`/users/${encodeURIComponent(ids)}`, params);
  }

  private async searchUsers(args: Record<string, unknown>): Promise<ToolResult> {
    const inname = args.inname as string;
    if (!inname) {
      return { content: [{ type: 'text', text: 'inname is required' }], isError: true };
    }
    const params = new URLSearchParams({ inname });
    if (args.sort) params.set('sort', args.sort as string);
    if (args.order) params.set('order', args.order as string);
    if (args.pagesize !== undefined) params.set('pagesize', String(args.pagesize));
    if (args.page !== undefined) params.set('page', String(args.page));
    if (args.min !== undefined) params.set('min', String(args.min));
    this.addAuth(params, args.site as string | undefined);
    return this.get('/users', params);
  }

  private async getUserAnswers(args: Record<string, unknown>): Promise<ToolResult> {
    const userId = args.userId as number;
    if (userId === undefined || userId === null) {
      return { content: [{ type: 'text', text: 'userId is required' }], isError: true };
    }
    const params = new URLSearchParams();
    if (args.sort) params.set('sort', args.sort as string);
    if (args.order) params.set('order', args.order as string);
    if (args.pagesize !== undefined) params.set('pagesize', String(args.pagesize));
    if (args.page !== undefined) params.set('page', String(args.page));
    if (args.filter) params.set('filter', args.filter as string);
    this.addAuth(params, args.site as string | undefined);
    return this.get(`/users/${userId}/answers`, params);
  }

  private async getUserQuestions(args: Record<string, unknown>): Promise<ToolResult> {
    const userId = args.userId as number;
    if (userId === undefined || userId === null) {
      return { content: [{ type: 'text', text: 'userId is required' }], isError: true };
    }
    const params = new URLSearchParams();
    if (args.sort) params.set('sort', args.sort as string);
    if (args.order) params.set('order', args.order as string);
    if (args.pagesize !== undefined) params.set('pagesize', String(args.pagesize));
    if (args.page !== undefined) params.set('page', String(args.page));
    this.addAuth(params, args.site as string | undefined);
    return this.get(`/users/${userId}/questions`, params);
  }

  private async searchTags(args: Record<string, unknown>): Promise<ToolResult> {
    const inname = args.inname as string;
    if (!inname) {
      return { content: [{ type: 'text', text: 'inname is required' }], isError: true };
    }
    const params = new URLSearchParams({ inname });
    if (args.sort) params.set('sort', args.sort as string);
    if (args.order) params.set('order', args.order as string);
    if (args.pagesize !== undefined) params.set('pagesize', String(args.pagesize));
    if (args.page !== undefined) params.set('page', String(args.page));
    this.addAuth(params, args.site as string | undefined);
    return this.get('/tags', params);
  }

  private async getTagInfo(args: Record<string, unknown>): Promise<ToolResult> {
    const tags = args.tags as string;
    if (!tags) {
      return { content: [{ type: 'text', text: 'tags is required' }], isError: true };
    }
    const params = new URLSearchParams();
    this.addAuth(params, args.site as string | undefined);
    return this.get(`/tags/${encodeURIComponent(tags)}/info`, params);
  }

  private async listBadges(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.inname) params.set('inname', args.inname as string);
    if (args.sort) params.set('sort', args.sort as string);
    if (args.order) params.set('order', args.order as string);
    if (args.pagesize !== undefined) params.set('pagesize', String(args.pagesize));
    this.addAuth(params, args.site as string | undefined);

    const path = args.userId !== undefined
      ? `/users/${encodeURIComponent(args.userId as number)}/badges`
      : '/badges';
    return this.get(path, params);
  }

  private async getSiteInfo(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    this.addAuth(params, args.site as string | undefined);
    return this.get('/info', params);
  }
}

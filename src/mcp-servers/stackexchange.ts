/**
 * StackExchange MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// No official StackExchange MCP server was found on GitHub as of 2026-03-28.
// Our adapter covers: 14 tools. Vendor MCP covers: 0 tools (none exists).
// Recommendation: use-rest-api — no official MCP server exists.
//
// Base URL: https://api.stackexchange.com/2.0
// Auth: Optional — API key via `key` query param increases quota from 300 to 10,000 req/day
//   Access token required for write operations and /me endpoints
//   Register app at: https://stackapps.com/apps/oauth/register
// Docs: https://api.stackexchange.com/docs
// Note: Responses include `items`, `has_more`, `quota_remaining`, `quota_max`

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface StackExchangeConfig {
  apiKey?: string;
  accessToken?: string;
  baseUrl?: string;
}

export class StackExchangeMCPServer extends MCPAdapterBase {
  private readonly apiKey: string | undefined;
  private readonly accessToken: string | undefined;
  private readonly baseUrl: string;

  constructor(config: StackExchangeConfig = {}) {
    super();
    this.apiKey = config.apiKey;
    this.accessToken = config.accessToken;
    this.baseUrl = config.baseUrl || 'https://api.stackexchange.com/2.0';
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'search_questions',
        description: 'Search Stack Exchange questions by keyword, tags, or title. Returns questions with vote counts, answer counts, and accepted answer status.',
        inputSchema: {
          type: 'object',
          properties: {
            site: { type: 'string', description: 'Stack Exchange site (e.g., "stackoverflow", "serverfault"). Default: stackoverflow' },
            q: { type: 'string', description: 'Free-form search query text' },
            tagged: { type: 'string', description: 'Semicolon-delimited tags to filter by (e.g., "javascript;react")' },
            title: { type: 'string', description: 'Search by question title text' },
            sort: { type: 'string', description: 'Sort order: activity, creation, votes, relevance (default: activity)' },
            order: { type: 'string', description: 'Sort direction: desc or asc (default: desc)' },
            page: { type: 'number', description: 'Page number (default: 1)' },
            pagesize: { type: 'number', description: 'Results per page, max 100 (default: 20)' },
          },
        },
      },
      {
        name: 'get_questions',
        description: 'Get details for one or more questions by their IDs. Returns question body, tags, vote score, and answer count.',
        inputSchema: {
          type: 'object',
          properties: {
            ids: { type: 'string', description: 'Semicolon-delimited list of question IDs (e.g., "1234;5678")' },
            site: { type: 'string', description: 'Stack Exchange site (default: stackoverflow)' },
            filter: { type: 'string', description: 'Response filter — use "withbody" to include question body text' },
          },
          required: ['ids'],
        },
      },
      {
        name: 'get_answers',
        description: 'Get answers for one or more questions by question ID. Returns answer body, vote score, and accepted status.',
        inputSchema: {
          type: 'object',
          properties: {
            ids: { type: 'string', description: 'Semicolon-delimited list of question IDs to get answers for' },
            site: { type: 'string', description: 'Stack Exchange site (default: stackoverflow)' },
            sort: { type: 'string', description: 'Sort order: activity, creation, votes (default: votes)' },
            filter: { type: 'string', description: 'Response filter — use "withbody" to include answer body text' },
            page: { type: 'number', description: 'Page number (default: 1)' },
            pagesize: { type: 'number', description: 'Results per page, max 100 (default: 20)' },
          },
          required: ['ids'],
        },
      },
      {
        name: 'get_comments',
        description: 'Get comments on questions or answers by their post IDs.',
        inputSchema: {
          type: 'object',
          properties: {
            ids: { type: 'string', description: 'Semicolon-delimited list of post IDs (question or answer IDs)' },
            site: { type: 'string', description: 'Stack Exchange site (default: stackoverflow)' },
            filter: { type: 'string', description: 'Response filter — use "withbody" to include comment body text' },
          },
          required: ['ids'],
        },
      },
      {
        name: 'get_tags',
        description: 'List tags on a Stack Exchange site sorted by usage count. Returns tag name, count, and synonym info.',
        inputSchema: {
          type: 'object',
          properties: {
            site: { type: 'string', description: 'Stack Exchange site (default: stackoverflow)' },
            inname: { type: 'string', description: 'Filter tags containing this string (e.g., "react" returns react, reactjs, etc.)' },
            sort: { type: 'string', description: 'Sort order: popular, activity, name (default: popular)' },
            page: { type: 'number', description: 'Page number (default: 1)' },
            pagesize: { type: 'number', description: 'Results per page, max 100 (default: 20)' },
          },
        },
      },
      {
        name: 'get_users',
        description: 'Get user profiles by user ID. Returns reputation, badge counts, and profile details.',
        inputSchema: {
          type: 'object',
          properties: {
            ids: { type: 'string', description: 'Semicolon-delimited list of user IDs' },
            site: { type: 'string', description: 'Stack Exchange site (default: stackoverflow)' },
          },
          required: ['ids'],
        },
      },
      {
        name: 'get_site_info',
        description: 'Get information about a Stack Exchange site including question/answer counts, API quota, and site configuration.',
        inputSchema: {
          type: 'object',
          properties: {
            site: { type: 'string', description: 'Stack Exchange site (default: stackoverflow)' },
          },
        },
      },
      {
        name: 'get_badges',
        description: 'List badges available on a Stack Exchange site, optionally filtered by name.',
        inputSchema: {
          type: 'object',
          properties: {
            site: { type: 'string', description: 'Stack Exchange site (default: stackoverflow)' },
            inname: { type: 'string', description: 'Filter badges whose name contains this string' },
            sort: { type: 'string', description: 'Sort order: rank, name, type (default: name)' },
            page: { type: 'number', description: 'Page number (default: 1)' },
            pagesize: { type: 'number', description: 'Results per page, max 100 (default: 20)' },
          },
        },
      },
      {
        name: 'get_errors',
        description: 'List error codes returned by the Stack Exchange API with their descriptions.',
        inputSchema: {
          type: 'object',
          properties: {
            page: { type: 'number', description: 'Page number (default: 1)' },
            pagesize: { type: 'number', description: 'Results per page (default: 20)' },
          },
        },
      },
      {
        name: 'get_posts',
        description: 'Get posts (questions and answers combined) by IDs from a Stack Exchange site.',
        inputSchema: {
          type: 'object',
          properties: {
            ids: { type: 'string', description: 'Semicolon-delimited list of post IDs' },
            site: { type: 'string', description: 'Stack Exchange site (default: stackoverflow)' },
            filter: { type: 'string', description: 'Response filter — use "withbody" to include body text' },
          },
          required: ['ids'],
        },
      },
      {
        name: 'get_me',
        description: "Get the authenticated user's profile, reputation, and badge counts. Requires access_token.",
        inputSchema: {
          type: 'object',
          properties: {
            site: { type: 'string', description: 'Stack Exchange site (default: stackoverflow)' },
          },
        },
      },
      {
        name: 'get_my_questions',
        description: 'Get questions asked by the authenticated user. Requires access_token.',
        inputSchema: {
          type: 'object',
          properties: {
            site: { type: 'string', description: 'Stack Exchange site (default: stackoverflow)' },
            sort: { type: 'string', description: 'Sort order: activity, creation, votes (default: activity)' },
            page: { type: 'number', description: 'Page number (default: 1)' },
            pagesize: { type: 'number', description: 'Results per page (default: 20)' },
          },
        },
      },
      {
        name: 'get_my_answers',
        description: 'Get answers posted by the authenticated user. Requires access_token.',
        inputSchema: {
          type: 'object',
          properties: {
            site: { type: 'string', description: 'Stack Exchange site (default: stackoverflow)' },
            sort: { type: 'string', description: 'Sort order: activity, creation, votes (default: activity)' },
            page: { type: 'number', description: 'Page number (default: 1)' },
            pagesize: { type: 'number', description: 'Results per page (default: 20)' },
          },
        },
      },
      {
        name: 'get_events',
        description: 'Get recent events on a Stack Exchange site since a given Unix timestamp. Returns questions, answers, comments, and user events.',
        inputSchema: {
          type: 'object',
          properties: {
            site: { type: 'string', description: 'Stack Exchange site (default: stackoverflow)' },
            since: { type: 'number', description: 'Unix timestamp — return only events after this time' },
            pagesize: { type: 'number', description: 'Results per page, max 100 (default: 20)' },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'search_questions':
          return await this.searchQuestions(args);
        case 'get_questions':
          return await this.getQuestions(args);
        case 'get_answers':
          return await this.getAnswers(args);
        case 'get_comments':
          return await this.getComments(args);
        case 'get_tags':
          return await this.getTags(args);
        case 'get_users':
          return await this.getUsers(args);
        case 'get_site_info':
          return await this.getSiteInfo(args);
        case 'get_badges':
          return await this.getBadges(args);
        case 'get_errors':
          return await this.getErrors(args);
        case 'get_posts':
          return await this.getPosts(args);
        case 'get_me':
          return await this.getMe(args);
        case 'get_my_questions':
          return await this.getMyQuestions(args);
        case 'get_my_answers':
          return await this.getMyAnswers(args);
        case 'get_events':
          return await this.getEvents(args);
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

  private buildParams(extra: Record<string, string | number | undefined>, site?: string): URLSearchParams {
    const params = new URLSearchParams();
    params.set('site', (site as string) || 'stackoverflow');
    if (this.apiKey) params.set('key', this.apiKey);
    if (this.accessToken) params.set('access_token', this.accessToken);
    for (const [k, v] of Object.entries(extra)) {
      if (v !== undefined && v !== null) params.set(k, String(v));
    }
    return params;
  }

  private async request(path: string, params: URLSearchParams): Promise<ToolResult> {
    const url = `${this.baseUrl}${path}?${params.toString()}`;
    const response = await this.fetchWithRetry(url, {
      headers: { 'User-Agent': 'EpicAI-StackExchange-MCP/1.0' },
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return {
        content: [{ type: 'text', text: `StackExchange API error ${response.status}: ${errText}` }],
        isError: true,
      };
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new Error(`StackExchange returned non-JSON response (HTTP ${response.status})`);
    }

    const text = JSON.stringify(data, null, 2);
    const truncated = text.length > 10_000
      ? text.slice(0, 10_000) + '\n... [truncated, ' + text.length + ' total chars]'
      : text;

    return { content: [{ type: 'text', text: truncated }], isError: false };
  }

  private async searchQuestions(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.buildParams({
      q: args.q as string,
      tagged: args.tagged as string,
      intitle: args.title as string,
      sort: (args.sort as string) || 'activity',
      order: (args.order as string) || 'desc',
      page: args.page as number,
      pagesize: args.pagesize as number,
    }, args.site as string);
    return this.request('/search/advanced', params);
  }

  private async getQuestions(args: Record<string, unknown>): Promise<ToolResult> {
    const ids = args.ids as string;
    if (!ids) return { content: [{ type: 'text', text: 'ids is required' }], isError: true };
    const params = this.buildParams({ filter: args.filter as string }, args.site as string);
    return this.request(`/questions/${encodeURIComponent(ids)}`, params);
  }

  private async getAnswers(args: Record<string, unknown>): Promise<ToolResult> {
    const ids = args.ids as string;
    if (!ids) return { content: [{ type: 'text', text: 'ids is required' }], isError: true };
    const params = this.buildParams({
      sort: (args.sort as string) || 'votes',
      filter: args.filter as string,
      page: args.page as number,
      pagesize: args.pagesize as number,
    }, args.site as string);
    return this.request(`/questions/${encodeURIComponent(ids)}/answers`, params);
  }

  private async getComments(args: Record<string, unknown>): Promise<ToolResult> {
    const ids = args.ids as string;
    if (!ids) return { content: [{ type: 'text', text: 'ids is required' }], isError: true };
    const params = this.buildParams({ filter: args.filter as string }, args.site as string);
    return this.request(`/posts/${encodeURIComponent(ids)}/comments`, params);
  }

  private async getTags(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.buildParams({
      inname: args.inname as string,
      sort: (args.sort as string) || 'popular',
      page: args.page as number,
      pagesize: args.pagesize as number,
    }, args.site as string);
    return this.request('/tags', params);
  }

  private async getUsers(args: Record<string, unknown>): Promise<ToolResult> {
    const ids = args.ids as string;
    if (!ids) return { content: [{ type: 'text', text: 'ids is required' }], isError: true };
    const params = this.buildParams({}, args.site as string);
    return this.request(`/users/${encodeURIComponent(ids)}`, params);
  }

  private async getSiteInfo(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.buildParams({}, args.site as string);
    return this.request('/info', params);
  }

  private async getBadges(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.buildParams({
      inname: args.inname as string,
      sort: (args.sort as string) || 'name',
      page: args.page as number,
      pagesize: args.pagesize as number,
    }, args.site as string);
    return this.request('/badges', params);
  }

  private async getErrors(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (this.apiKey) params.set('key', this.apiKey);
    if (args.page) params.set('page', String(args.page));
    if (args.pagesize) params.set('pagesize', String(args.pagesize));
    return this.request('/errors', params);
  }

  private async getPosts(args: Record<string, unknown>): Promise<ToolResult> {
    const ids = args.ids as string;
    if (!ids) return { content: [{ type: 'text', text: 'ids is required' }], isError: true };
    const params = this.buildParams({ filter: args.filter as string }, args.site as string);
    return this.request(`/posts/${encodeURIComponent(ids)}`, params);
  }

  private async getMe(args: Record<string, unknown>): Promise<ToolResult> {
    if (!this.accessToken) {
      return { content: [{ type: 'text', text: 'access_token is required for get_me' }], isError: true };
    }
    const params = this.buildParams({}, args.site as string);
    return this.request('/me', params);
  }

  private async getMyQuestions(args: Record<string, unknown>): Promise<ToolResult> {
    if (!this.accessToken) {
      return { content: [{ type: 'text', text: 'access_token is required for get_my_questions' }], isError: true };
    }
    const params = this.buildParams({
      sort: (args.sort as string) || 'activity',
      page: args.page as number,
      pagesize: args.pagesize as number,
    }, args.site as string);
    return this.request('/me/questions', params);
  }

  private async getMyAnswers(args: Record<string, unknown>): Promise<ToolResult> {
    if (!this.accessToken) {
      return { content: [{ type: 'text', text: 'access_token is required for get_my_answers' }], isError: true };
    }
    const params = this.buildParams({
      sort: (args.sort as string) || 'activity',
      page: args.page as number,
      pagesize: args.pagesize as number,
    }, args.site as string);
    return this.request('/me/answers', params);
  }

  private async getEvents(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.buildParams({
      since: args.since as number,
      pagesize: args.pagesize as number,
    }, args.site as string);
    return this.request('/events', params);
  }

  static catalog() {
    return {
      name: 'stackexchange',
      displayName: 'StackExchange',
      version: '1.0.0',
      category: 'data' as const,
      keywords: ['stackexchange', 'stackoverflow', 'qa', 'questions', 'answers', 'programming'],
      toolNames: ['search_questions', 'get_questions', 'get_answers', 'get_comments', 'get_tags', 'get_users', 'get_site_info', 'get_badges', 'get_errors', 'get_posts', 'get_me', 'get_my_questions', 'get_my_answers', 'get_events'],
      description: 'StackExchange adapter for the Epic AI Intelligence Platform — search Q&A across 130+ Stack Exchange communities including Stack Overflow',
      author: 'protectnil' as const,
    };
  }
}

/**
 * StackOverflow MCP Server
 * Stack Exchange API v2.3 adapter for questions, answers, users, and tags
 *
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */
import { ToolDefinition, ToolResult } from './types.js';

interface StackOverflowConfig {
  apiKey: string;
  accessToken?: string;
}

export class StackOverflowMCPServer {
  private readonly baseUrl = 'https://api.stackexchange.com/2.3';
  private readonly apiKey: string;
  private readonly accessToken?: string;

  constructor(config: StackOverflowConfig) {
    this.apiKey = config.apiKey;
    this.accessToken = config.accessToken;
  }

  private addAuth(params: URLSearchParams): void {
    params.append('key', this.apiKey);
    if (this.accessToken) params.append('access_token', this.accessToken);
    params.append('site', 'stackoverflow');
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'search_questions',
        description: 'Search Stack Overflow questions by query and optional filters',
        inputSchema: {
          type: 'object',
          properties: {
            intitle: { type: 'string', description: 'Search within question titles' },
            q: { type: 'string', description: 'Full-text search query' },
            tagged: { type: 'string', description: 'Semicolon-separated tags to filter by' },
            sort: { type: 'string', description: 'Sort order: activity, votes, creation, relevance' },
            order: { type: 'string', description: 'Order: desc or asc' },
            pagesize: { type: 'number', description: 'Number of results per page (max: 100)' },
            page: { type: 'number', description: 'Page number' },
            fromdate: { type: 'number', description: 'Unix timestamp for earliest creation date' },
            todate: { type: 'number', description: 'Unix timestamp for latest creation date' },
          },
        },
      },
      {
        name: 'get_question',
        description: 'Get a Stack Overflow question by ID including answers',
        inputSchema: {
          type: 'object',
          properties: {
            ids: { type: 'string', description: 'Semicolon-separated question IDs' },
            filter: { type: 'string', description: 'API filter string for response fields' },
          },
          required: ['ids'],
        },
      },
      {
        name: 'get_answers',
        description: 'Get answers for one or more Stack Overflow questions',
        inputSchema: {
          type: 'object',
          properties: {
            ids: { type: 'string', description: 'Semicolon-separated question IDs' },
            sort: { type: 'string', description: 'Sort order: activity, votes, creation' },
            order: { type: 'string', description: 'Order: desc or asc' },
            pagesize: { type: 'number', description: 'Number of results per page (max: 100)' },
            page: { type: 'number', description: 'Page number' },
          },
          required: ['ids'],
        },
      },
      {
        name: 'get_user',
        description: 'Get Stack Overflow user profile by user ID',
        inputSchema: {
          type: 'object',
          properties: {
            ids: { type: 'string', description: 'Semicolon-separated user IDs' },
            filter: { type: 'string', description: 'API filter string for response fields' },
          },
          required: ['ids'],
        },
      },
      {
        name: 'search_tags',
        description: 'Search for Stack Overflow tags by name',
        inputSchema: {
          type: 'object',
          properties: {
            inname: { type: 'string', description: 'Filter tags containing this string' },
            sort: { type: 'string', description: 'Sort order: popular, activity, name' },
            order: { type: 'string', description: 'Order: desc or asc' },
            pagesize: { type: 'number', description: 'Number of results per page (max: 100)' },
            page: { type: 'number', description: 'Page number' },
          },
          required: ['inname'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'search_questions':
          return await this.searchQuestions(args);
        case 'get_question':
          return await this.getQuestion(args);
        case 'get_answers':
          return await this.getAnswers(args);
        case 'get_user':
          return await this.getUser(args);
        case 'search_tags':
          return await this.searchTags(args);
        default:
          return { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true };
      }
    } catch (error) {
      return {
        content: [{ type: 'text', text: error instanceof Error ? error.message : String(error) }],
        isError: true,
      };
    }
  }

  private async searchQuestions(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.intitle) params.append('intitle', args.intitle as string);
    if (args.q) params.append('q', args.q as string);
    if (args.tagged) params.append('tagged', args.tagged as string);
    if (args.sort) params.append('sort', args.sort as string);
    if (args.order) params.append('order', args.order as string);
    if (args.pagesize !== undefined) params.append('pagesize', String(args.pagesize));
    if (args.page !== undefined) params.append('page', String(args.page));
    if (args.fromdate !== undefined) params.append('fromdate', String(args.fromdate));
    if (args.todate !== undefined) params.append('todate', String(args.todate));
    this.addAuth(params);
    const response = await fetch(`${this.baseUrl}/search/advanced?${params}`, { method: 'GET' });
    if (!response.ok) throw new Error(`Stack Exchange API error: ${response.status} ${response.statusText}`);
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async getQuestion(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.filter) params.append('filter', args.filter as string);
    this.addAuth(params);
    const ids = (args.ids as string).replace(/;/g, ';');
    const response = await fetch(`${this.baseUrl}/questions/${ids}?${params}`, { method: 'GET' });
    if (!response.ok) throw new Error(`Stack Exchange API error: ${response.status} ${response.statusText}`);
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async getAnswers(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.sort) params.append('sort', args.sort as string);
    if (args.order) params.append('order', args.order as string);
    if (args.pagesize !== undefined) params.append('pagesize', String(args.pagesize));
    if (args.page !== undefined) params.append('page', String(args.page));
    this.addAuth(params);
    const response = await fetch(`${this.baseUrl}/questions/${args.ids}/answers?${params}`, { method: 'GET' });
    if (!response.ok) throw new Error(`Stack Exchange API error: ${response.status} ${response.statusText}`);
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async getUser(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.filter) params.append('filter', args.filter as string);
    this.addAuth(params);
    const response = await fetch(`${this.baseUrl}/users/${args.ids}?${params}`, { method: 'GET' });
    if (!response.ok) throw new Error(`Stack Exchange API error: ${response.status} ${response.statusText}`);
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async searchTags(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams({ inname: args.inname as string });
    if (args.sort) params.append('sort', args.sort as string);
    if (args.order) params.append('order', args.order as string);
    if (args.pagesize !== undefined) params.append('pagesize', String(args.pagesize));
    if (args.page !== undefined) params.append('page', String(args.page));
    this.addAuth(params);
    const response = await fetch(`${this.baseUrl}/tags?${params}`, { method: 'GET' });
    if (!response.ok) throw new Error(`Stack Exchange API error: ${response.status} ${response.statusText}`);
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }
}

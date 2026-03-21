/**
 * Dev.to MCP Server
 * Dev.to / Forem API adapter for articles, comments, and search
 *
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */
import { ToolDefinition, ToolResult } from './types.js';

interface DevToConfig {
  apiKey: string;
}

export class DevToMCPServer {
  private readonly baseUrl = 'https://dev.to/api';
  private readonly headers: Record<string, string>;

  constructor(config: DevToConfig) {
    this.headers = {
      'api-key': config.apiKey,
      'Content-Type': 'application/json',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_articles',
        description: 'List published articles with optional filters',
        inputSchema: {
          type: 'object',
          properties: {
            page: { type: 'number', description: 'Page number for pagination' },
            per_page: { type: 'number', description: 'Number of articles per page (max: 1000)' },
            tag: { type: 'string', description: 'Filter by tag' },
            username: { type: 'string', description: 'Filter by author username' },
            state: { type: 'string', description: 'Article state: fresh, rising, all' },
            top: { type: 'number', description: 'Number of days to filter top articles by' },
          },
        },
      },
      {
        name: 'get_article',
        description: 'Get a single Dev.to article by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'Article ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'create_article',
        description: 'Create a new article on Dev.to',
        inputSchema: {
          type: 'object',
          properties: {
            title: { type: 'string', description: 'Article title' },
            body_markdown: { type: 'string', description: 'Article body in Markdown' },
            published: { type: 'boolean', description: 'Whether to publish immediately' },
            tags: { type: 'string', description: 'Comma-separated list of tags (max 4)' },
            canonical_url: { type: 'string', description: 'Original URL if cross-posting' },
            description: { type: 'string', description: 'Article description/excerpt' },
          },
          required: ['title', 'body_markdown'],
        },
      },
      {
        name: 'list_comments',
        description: 'List comments for an article or podcast episode',
        inputSchema: {
          type: 'object',
          properties: {
            a_id: { type: 'number', description: 'Article ID' },
            p_id: { type: 'number', description: 'Podcast episode ID' },
          },
        },
      },
      {
        name: 'search_articles',
        description: 'Search Dev.to articles by query string',
        inputSchema: {
          type: 'object',
          properties: {
            q: { type: 'string', description: 'Search query' },
            page: { type: 'number', description: 'Page number for pagination' },
            per_page: { type: 'number', description: 'Number of results per page' },
          },
          required: ['q'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_articles':
          return await this.listArticles(args);
        case 'get_article':
          return await this.getArticle(args.id as number);
        case 'create_article':
          return await this.createArticle(args);
        case 'list_comments':
          return await this.listComments(args);
        case 'search_articles':
          return await this.searchArticles(args);
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

  private async listArticles(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.page !== undefined) params.append('page', String(args.page));
    if (args.per_page !== undefined) params.append('per_page', String(args.per_page));
    if (args.tag) params.append('tag', args.tag as string);
    if (args.username) params.append('username', args.username as string);
    if (args.state) params.append('state', args.state as string);
    if (args.top !== undefined) params.append('top', String(args.top));
    const response = await fetch(`${this.baseUrl}/articles?${params}`, { method: 'GET', headers: this.headers });
    if (!response.ok) throw new Error(`Dev.to API error: ${response.status} ${response.statusText}`);
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async getArticle(id: number): Promise<ToolResult> {
    const response = await fetch(`${this.baseUrl}/articles/${id}`, { method: 'GET', headers: this.headers });
    if (!response.ok) throw new Error(`Dev.to API error: ${response.status} ${response.statusText}`);
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async createArticle(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {
      article: {
        title: args.title,
        body_markdown: args.body_markdown,
        published: args.published ?? false,
      },
    };
    if (args.tags) (body.article as Record<string, unknown>).tags = (args.tags as string).split(',').map((t: string) => t.trim());
    if (args.canonical_url) (body.article as Record<string, unknown>).canonical_url = args.canonical_url;
    if (args.description) (body.article as Record<string, unknown>).description = args.description;
    const response = await fetch(`${this.baseUrl}/articles`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error(`Dev.to API error: ${response.status} ${response.statusText}`);
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async listComments(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.a_id !== undefined) params.append('a_id', String(args.a_id));
    if (args.p_id !== undefined) params.append('p_id', String(args.p_id));
    const response = await fetch(`${this.baseUrl}/comments?${params}`, { method: 'GET', headers: this.headers });
    if (!response.ok) throw new Error(`Dev.to API error: ${response.status} ${response.statusText}`);
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async searchArticles(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams({ q: args.q as string });
    if (args.page !== undefined) params.append('page', String(args.page));
    if (args.per_page !== undefined) params.append('per_page', String(args.per_page));
    const response = await fetch(`${this.baseUrl}/articles/search?${params}`, { method: 'GET', headers: this.headers });
    if (!response.ok) throw new Error(`Dev.to API error: ${response.status} ${response.statusText}`);
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }
}

/**
 * Substack MCP Server
 * Substack API v1 adapter for publications, posts, subscribers, and search
 *
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */
import { ToolDefinition, ToolResult } from './types.js';

interface SubstackConfig {
  apiKey: string;
}

export class SubstackMCPServer {
  private readonly baseUrl = 'https://substack.com/api/v1';
  private readonly headers: Record<string, string>;

  constructor(config: SubstackConfig) {
    this.headers = {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_posts',
        description: 'List posts for a Substack publication',
        inputSchema: {
          type: 'object',
          properties: {
            publication_url: { type: 'string', description: 'Publication subdomain (e.g. myNewsletter)' },
            limit: { type: 'number', description: 'Number of posts to return' },
            offset: { type: 'number', description: 'Pagination offset' },
            type: { type: 'string', description: 'Post type: newsletter, podcast, thread' },
          },
          required: ['publication_url'],
        },
      },
      {
        name: 'get_post',
        description: 'Get a single Substack post by slug',
        inputSchema: {
          type: 'object',
          properties: {
            publication_url: { type: 'string', description: 'Publication subdomain' },
            slug: { type: 'string', description: 'Post slug' },
          },
          required: ['publication_url', 'slug'],
        },
      },
      {
        name: 'list_subscribers',
        description: 'List subscribers for a Substack publication',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Number of subscribers to return' },
            offset: { type: 'number', description: 'Pagination offset' },
            type: { type: 'string', description: 'Subscriber type: active, free, paid, comp' },
          },
        },
      },
      {
        name: 'get_publication',
        description: 'Get metadata for a Substack publication',
        inputSchema: {
          type: 'object',
          properties: {
            publication_url: { type: 'string', description: 'Publication subdomain' },
          },
          required: ['publication_url'],
        },
      },
      {
        name: 'search_posts',
        description: 'Search posts within a Substack publication',
        inputSchema: {
          type: 'object',
          properties: {
            publication_url: { type: 'string', description: 'Publication subdomain' },
            query: { type: 'string', description: 'Search query string' },
            limit: { type: 'number', description: 'Number of results to return' },
            offset: { type: 'number', description: 'Pagination offset' },
          },
          required: ['publication_url', 'query'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_posts':
          return await this.listPosts(args);
        case 'get_post':
          return await this.getPost(args);
        case 'list_subscribers':
          return await this.listSubscribers(args);
        case 'get_publication':
          return await this.getPublication(args);
        case 'search_posts':
          return await this.searchPosts(args);
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

  private async listPosts(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.limit !== undefined) params.append('limit', String(args.limit));
    if (args.offset !== undefined) params.append('offset', String(args.offset));
    if (args.type) params.append('type', args.type as string);
    const response = await fetch(`${this.baseUrl}/publication/${args.publication_url}/posts?${params}`, { method: 'GET', headers: this.headers });
    if (!response.ok) throw new Error(`Substack API error: ${response.status} ${response.statusText}`);
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async getPost(args: Record<string, unknown>): Promise<ToolResult> {
    const response = await fetch(`${this.baseUrl}/publication/${args.publication_url}/posts/${args.slug}`, { method: 'GET', headers: this.headers });
    if (!response.ok) throw new Error(`Substack API error: ${response.status} ${response.statusText}`);
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async listSubscribers(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.limit !== undefined) params.append('limit', String(args.limit));
    if (args.offset !== undefined) params.append('offset', String(args.offset));
    if (args.type) params.append('type', args.type as string);
    const response = await fetch(`${this.baseUrl}/subscribers?${params}`, { method: 'GET', headers: this.headers });
    if (!response.ok) throw new Error(`Substack API error: ${response.status} ${response.statusText}`);
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async getPublication(args: Record<string, unknown>): Promise<ToolResult> {
    const response = await fetch(`${this.baseUrl}/publication/${args.publication_url}`, { method: 'GET', headers: this.headers });
    if (!response.ok) throw new Error(`Substack API error: ${response.status} ${response.statusText}`);
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async searchPosts(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams({ query: args.query as string });
    if (args.limit !== undefined) params.append('limit', String(args.limit));
    if (args.offset !== undefined) params.append('offset', String(args.offset));
    const response = await fetch(`${this.baseUrl}/publication/${args.publication_url}/search?${params}`, { method: 'GET', headers: this.headers });
    if (!response.ok) throw new Error(`Substack API error: ${response.status} ${response.statusText}`);
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }
}

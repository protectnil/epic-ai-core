/**
 * LinkedIn MCP Server
 * LinkedIn API v2 adapter for profiles, connections, people search, companies, and posts
 *
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */
import { ToolDefinition, ToolResult } from './types.js';

interface LinkedInConfig {
  accessToken: string;
}

export class LinkedInMCPServer {
  private readonly baseUrl = 'https://api.linkedin.com/v2';
  private readonly headers: Record<string, string>;

  constructor(config: LinkedInConfig) {
    this.headers = {
      Authorization: `Bearer ${config.accessToken}`,
      'Content-Type': 'application/json',
      'X-Restli-Protocol-Version': '2.0.0',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'get_profile',
        description: 'Get the authenticated user profile or a specific member profile',
        inputSchema: {
          type: 'object',
          properties: {
            person_id: { type: 'string', description: 'LinkedIn person URN ID (omit for own profile)' },
            fields: { type: 'string', description: 'Comma-separated fields to return' },
          },
        },
      },
      {
        name: 'get_connections',
        description: 'Get first-degree connections for the authenticated user',
        inputSchema: {
          type: 'object',
          properties: {
            start: { type: 'number', description: 'Pagination start index' },
            count: { type: 'number', description: 'Number of results (max: 500)' },
          },
        },
      },
      {
        name: 'search_people',
        description: 'Search for LinkedIn members using People Search API',
        inputSchema: {
          type: 'object',
          properties: {
            keywords: { type: 'string', description: 'Keywords to search for' },
            first_name: { type: 'string', description: 'First name filter' },
            last_name: { type: 'string', description: 'Last name filter' },
            company_name: { type: 'string', description: 'Company name filter' },
            title: { type: 'string', description: 'Title filter' },
            start: { type: 'number', description: 'Pagination start index' },
            count: { type: 'number', description: 'Number of results (max: 10)' },
          },
        },
      },
      {
        name: 'get_company',
        description: 'Get information about a LinkedIn company/organization',
        inputSchema: {
          type: 'object',
          properties: {
            organization_id: { type: 'string', description: 'LinkedIn organization URN or numeric ID' },
            fields: { type: 'string', description: 'Comma-separated fields to return' },
          },
          required: ['organization_id'],
        },
      },
      {
        name: 'get_posts',
        description: 'Get posts (shares/ugcPosts) for the authenticated user or an organization',
        inputSchema: {
          type: 'object',
          properties: {
            author_urn: { type: 'string', description: 'Author URN (person or organization URN)' },
            start: { type: 'number', description: 'Pagination start index' },
            count: { type: 'number', description: 'Number of results (max: 100)' },
          },
          required: ['author_urn'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'get_profile':
          return await this.getProfile(args);
        case 'get_connections':
          return await this.getConnections(args);
        case 'search_people':
          return await this.searchPeople(args);
        case 'get_company':
          return await this.getCompany(args);
        case 'get_posts':
          return await this.getPosts(args);
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

  private async getProfile(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.fields) params.append('projection', `(${args.fields})`);
    const path = args.person_id ? `/people/(id:${args.person_id})` : '/me';
    const query = params.toString() ? `?${params}` : '';
    const response = await fetch(`${this.baseUrl}${path}${query}`, { method: 'GET', headers: this.headers });
    if (!response.ok) throw new Error(`LinkedIn API error: ${response.status} ${response.statusText}`);
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async getConnections(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams({ q: 'viewer' });
    if (args.start !== undefined) params.append('start', String(args.start));
    if (args.count !== undefined) params.append('count', String(args.count));
    const response = await fetch(`${this.baseUrl}/connections?${params}`, { method: 'GET', headers: this.headers });
    if (!response.ok) throw new Error(`LinkedIn API error: ${response.status} ${response.statusText}`);
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async searchPeople(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams({ q: 'people' });
    if (args.keywords) params.append('keywords', args.keywords as string);
    if (args.first_name) params.append('firstName', args.first_name as string);
    if (args.last_name) params.append('lastName', args.last_name as string);
    if (args.company_name) params.append('facetCompany', args.company_name as string);
    if (args.title) params.append('facetTitle', args.title as string);
    if (args.start !== undefined) params.append('start', String(args.start));
    if (args.count !== undefined) params.append('count', String(args.count));
    const response = await fetch(`${this.baseUrl}/search?${params}`, { method: 'GET', headers: this.headers });
    if (!response.ok) throw new Error(`LinkedIn API error: ${response.status} ${response.statusText}`);
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async getCompany(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.fields) params.append('projection', `(${args.fields})`);
    const query = params.toString() ? `?${params}` : '';
    const response = await fetch(`${this.baseUrl}/organizations/${args.organization_id}${query}`, { method: 'GET', headers: this.headers });
    if (!response.ok) throw new Error(`LinkedIn API error: ${response.status} ${response.statusText}`);
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async getPosts(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams({ q: 'authors', authors: `List(${args.author_urn})` });
    if (args.start !== undefined) params.append('start', String(args.start));
    if (args.count !== undefined) params.append('count', String(args.count));
    const response = await fetch(`${this.baseUrl}/ugcPosts?${params}`, { method: 'GET', headers: this.headers });
    if (!response.ok) throw new Error(`LinkedIn API error: ${response.status} ${response.statusText}`);
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }
}

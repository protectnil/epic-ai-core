/**
 * @epicai/core — Splunk MCP Server
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */
import { ToolDefinition, ToolResult } from './types.js';

export class SplunkMCPServer {
  private readonly baseUrl: string;
  private readonly headers: Record<string, string>;

  constructor(config: { host: string; username: string; password: string }) {
    this.baseUrl = `https://${config.host}:8089`;
    const credentials = Buffer.from(`${config.username}:${config.password}`).toString('base64');
    this.headers = {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'search_jobs',
        description: 'Create a new search job in Splunk',
        inputSchema: {
          type: 'object',
          properties: {
            search: { type: 'string', description: 'The SPL search query' },
            earliest_time: { type: 'string', description: 'Earliest time (e.g., "-24h")' },
            latest_time: { type: 'string', description: 'Latest time (e.g., "now")' },
            count: { type: 'number', description: 'Maximum results (default: 100)' },
          },
          required: ['search'],
        },
      },
      {
        name: 'get_search_results',
        description: 'Retrieve results from a completed search job',
        inputSchema: {
          type: 'object',
          properties: {
            search_id: { type: 'string', description: 'Search job ID' },
            offset: { type: 'number', description: 'Starting offset (default: 0)' },
            count: { type: 'number', description: 'Number of results (default: 100)' },
          },
          required: ['search_id'],
        },
      },
      {
        name: 'list_alerts',
        description: 'List all configured alerts in Splunk',
        inputSchema: {
          type: 'object',
          properties: {
            count: { type: 'number', description: 'Maximum alerts (default: 100)' },
            owner: { type: 'string', description: 'Filter by owner username' },
          },
        },
      },
      {
        name: 'get_notable_events',
        description: 'Retrieve notable events from Splunk Enterprise Security',
        inputSchema: {
          type: 'object',
          properties: {
            search_query: { type: 'string', description: 'Optional SPL filter (no pipe characters)' },
            count: { type: 'number', description: 'Maximum events (default: 100)' },
          },
        },
      },
      {
        name: 'list_saved_searches',
        description: 'List all saved searches',
        inputSchema: {
          type: 'object',
          properties: {
            count: { type: 'number', description: 'Maximum searches (default: 100)' },
            app: { type: 'string', description: 'Filter by Splunk app name' },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'search_jobs':
          return await this.searchJobs(args.search as string, args.earliest_time as string | undefined, args.latest_time as string | undefined, args.count as number | undefined);
        case 'get_search_results':
          return await this.getSearchResults(args.search_id as string, args.offset as number | undefined, args.count as number | undefined);
        case 'list_alerts':
          return await this.listAlerts(args.count as number | undefined, args.owner as string | undefined);
        case 'get_notable_events':
          return await this.getNotableEvents(args.search_query as string | undefined, args.count as number | undefined);
        case 'list_saved_searches':
          return await this.listSavedSearches(args.count as number | undefined, args.app as string | undefined);
        default:
          return { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true };
      }
    } catch (error) {
      return { content: [{ type: 'text', text: error instanceof Error ? error.message : String(error) }], isError: true };
    }
  }

  private async searchJobs(search: string, earliestTime?: string, latestTime?: string, count?: number): Promise<ToolResult> {
    const params = new URLSearchParams({
      search,
      earliest_time: earliestTime || '-24h',
      latest_time: latestTime || 'now',
      count: String(count || 100),
    });

    const response = await fetch(`${this.baseUrl}/services/search/jobs`, {
      method: 'POST',
      headers: this.headers,
      body: params.toString(),
    });

    if (!response.ok) throw new Error(`Splunk API error: ${response.status} ${response.statusText}`);

    const xml = await response.text();
    return { content: [{ type: 'text', text: JSON.stringify({ raw: xml, message: 'Search job created' }, null, 2) }], isError: false };
  }

  private async getSearchResults(searchId: string, offset?: number, count?: number): Promise<ToolResult> {
    const params = new URLSearchParams({ output_mode: 'json', offset: String(offset || 0), count: String(count || 100) });

    const response = await fetch(`${this.baseUrl}/services/search/jobs/${encodeURIComponent(searchId)}/results?${params}`, {
      method: 'GET',
      headers: this.headers,
    });

    if (!response.ok) throw new Error(`Splunk API error: ${response.status} ${response.statusText}`);

    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Splunk returned non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async listAlerts(count?: number, owner?: string): Promise<ToolResult> {
    const params = new URLSearchParams({ output_mode: 'json', count: String(count || 100) });
    if (owner) params.append('owner', owner);

    const response = await fetch(`${this.baseUrl}/services/alerts/alert_actions?${params}`, {
      method: 'GET',
      headers: this.headers,
    });

    if (!response.ok) throw new Error(`Splunk API error: ${response.status} ${response.statusText}`);

    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Splunk returned non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async getNotableEvents(searchQuery?: string, count?: number): Promise<ToolResult> {
    // Reject queries with pipe characters to prevent SPL injection.
    if (searchQuery && searchQuery.includes('|')) {
      return { content: [{ type: 'text', text: 'search_query must not contain pipe characters' }], isError: true };
    }

    const params = new URLSearchParams({
      search: 'search index=notable',
      earliest_time: '-7d',
      latest_time: 'now',
      count: String(count || 100),
      output_mode: 'json',
    });
    if (searchQuery) params.append('search_filter', searchQuery);

    const response = await fetch(`${this.baseUrl}/services/search/jobs`, {
      method: 'POST',
      headers: this.headers,
      body: params.toString(),
    });

    if (!response.ok) throw new Error(`Splunk API error: ${response.status} ${response.statusText}`);

    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Splunk returned non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async listSavedSearches(count?: number, app?: string): Promise<ToolResult> {
    const params = new URLSearchParams({ output_mode: 'json', count: String(count || 100) });
    if (app) params.append('app', app);

    const response = await fetch(`${this.baseUrl}/services/saved/searches?${params}`, {
      method: 'GET',
      headers: this.headers,
    });

    if (!response.ok) throw new Error(`Splunk API error: ${response.status} ${response.statusText}`);

    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Splunk returned non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }
}

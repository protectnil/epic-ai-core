/**
 * Splunk MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://splunkbase.splunk.com/app/7931 — "Splunk MCP Server" by Splunk LLC.
//   v1.0.5 released 2026-03-26. Transport: streamable-HTTP (https://{host}:8089/services/mcp).
//   Auth: Bearer token. Maintained actively (Splunk Supported).
//   Vendor MCP covers 10 core tools: splunk_run_query, splunk_get_info, splunk_get_indexes,
//   splunk_get_index_info, splunk_get_metadata, splunk_get_user_info, splunk_get_user_list,
//   splunk_get_kv_store_collections, splunk_get_knowledge_objects + 3 AI Assistant tools.
// Our adapter covers: 14 tools. Vendor MCP covers: 10 core + 3 saia_ tools = 13 total.
// Recommendation: use-both — each side has unique operations the other lacks.
//   MCP-sourced tools (5 unique to MCP): splunk_get_info, splunk_get_metadata,
//     splunk_get_user_info, splunk_get_user_list, splunk_get_knowledge_objects (full object types),
//     saia_generate_spl, saia_explain_spl, saia_optimize_spl.
//   REST-sourced tools (unique to our adapter): get_search_job_status, get_search_events,
//     get_notable_events, run_saved_search, get_saved_search, query_kvstore_collection, list_apps.
//   Shared operations (MCP preferred): create_search_job/splunk_run_query,
//     list_indexes/splunk_get_indexes, get_index/splunk_get_index_info,
//     list_saved_searches/splunk_get_knowledge_objects, list_alerts/splunk_get_knowledge_objects.
//
// Base URL: https://{host}:8089 (Splunk REST API management port)
// Auth: Basic authentication (username + password) or Bearer token (Splunk auth token)
// Docs: https://docs.splunk.com/Documentation/Splunk/latest/RESTREF/RESTprolog
// Rate limits: Not publicly documented; governed by instance resource limits

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface SplunkConfig {
  host: string;
  username?: string;
  password?: string;
  /** Splunk auth token as alternative to username/password Basic auth */
  token?: string;
  /** Management port (default: 8089) */
  port?: number;
}

export class SplunkMCPServer extends MCPAdapterBase {
  private readonly baseUrl: string;
  private readonly authHeader: string;

  constructor(config: SplunkConfig) {
    super();
    const port = config.port ?? 8089;
    this.baseUrl = `https://${config.host}:${port}`;
    if (config.token) {
      this.authHeader = `Bearer ${config.token}`;
    } else if (config.username && config.password) {
      this.authHeader = `Basic ${Buffer.from(`${config.username}:${config.password}`).toString('base64')}`;
    } else {
      throw new Error('SplunkConfig requires either token or username+password');
    }
  }

  static catalog() {
    return {
      name: 'splunk',
      displayName: 'Splunk',
      version: '1.0.0',
      category: 'cybersecurity' as const,
      keywords: ['splunk', 'siem', 'spl', 'search', 'logs', 'events', 'alerts', 'notable', 'enterprise security', 'index', 'saved search', 'kv store', 'observability'],
      toolNames: [
        'create_search_job', 'get_search_job_status', 'get_search_results', 'get_search_events',
        'list_alerts', 'get_notable_events',
        'list_saved_searches', 'get_saved_search', 'run_saved_search',
        'list_indexes', 'get_index',
        'list_kvstore_collections', 'query_kvstore_collection',
        'list_apps',
      ],
      description: 'Splunk Enterprise/Cloud SIEM: create and run SPL searches, retrieve results and events, manage alerts and notable events, query saved searches, indexes, KV Store, and apps.',
      author: 'protectnil' as const,
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'create_search_job',
        description: 'Create and run a new SPL search job in Splunk, returning the job SID for result retrieval',
        inputSchema: {
          type: 'object',
          properties: {
            search: {
              type: 'string',
              description: 'SPL search query string (must start with "search" or a generating command)',
            },
            earliest_time: {
              type: 'string',
              description: 'Earliest time bound for the search (e.g. -24h, -7d, 2025-01-01T00:00:00, default: -24h)',
            },
            latest_time: {
              type: 'string',
              description: 'Latest time bound for the search (e.g. now, -1h, default: now)',
            },
            count: {
              type: 'number',
              description: 'Maximum number of results to return (default: 100, max: 50000)',
            },
            app: {
              type: 'string',
              description: 'Splunk app context for the search (default: search)',
            },
          },
          required: ['search'],
        },
      },
      {
        name: 'get_search_job_status',
        description: 'Poll the status of a running search job to check if it is queued, running, or done',
        inputSchema: {
          type: 'object',
          properties: {
            sid: {
              type: 'string',
              description: 'Search job ID (SID) returned by create_search_job',
            },
          },
          required: ['sid'],
        },
      },
      {
        name: 'get_search_results',
        description: 'Retrieve final results from a completed Splunk search job in JSON format',
        inputSchema: {
          type: 'object',
          properties: {
            sid: {
              type: 'string',
              description: 'Search job ID (SID) for a completed search',
            },
            offset: {
              type: 'number',
              description: 'Number of results to skip for pagination (default: 0)',
            },
            count: {
              type: 'number',
              description: 'Maximum number of results to return (default: 100, max: 50000)',
            },
          },
          required: ['sid'],
        },
      },
      {
        name: 'get_search_events',
        description: 'Retrieve raw events from a running or completed search job — available before the job finishes unlike get_search_results',
        inputSchema: {
          type: 'object',
          properties: {
            sid: {
              type: 'string',
              description: 'Search job ID (SID)',
            },
            offset: {
              type: 'number',
              description: 'Number of events to skip for pagination (default: 0)',
            },
            count: {
              type: 'number',
              description: 'Maximum number of events to return (default: 100)',
            },
          },
          required: ['sid'],
        },
      },
      {
        name: 'list_alerts',
        description: 'List fired alert instances from Splunk — shows all alerts that have triggered, with owner and trigger count',
        inputSchema: {
          type: 'object',
          properties: {
            count: {
              type: 'number',
              description: 'Maximum number of fired alerts to return (default: 100)',
            },
            offset: {
              type: 'number',
              description: 'Number of alerts to skip for pagination (default: 0)',
            },
            owner: {
              type: 'string',
              description: 'Filter fired alerts by owner username',
            },
            app: {
              type: 'string',
              description: 'Filter by Splunk app name (default: all apps)',
            },
          },
        },
      },
      {
        name: 'get_notable_events',
        description: 'Search notable events from Splunk Enterprise Security index=notable with optional SPL filter and time range',
        inputSchema: {
          type: 'object',
          properties: {
            filter: {
              type: 'string',
              description: 'Additional SPL filter expression appended after the base notable search (no pipe characters)',
            },
            earliest_time: {
              type: 'string',
              description: 'Earliest time for notable events search (default: -7d)',
            },
            latest_time: {
              type: 'string',
              description: 'Latest time for notable events search (default: now)',
            },
            count: {
              type: 'number',
              description: 'Maximum number of notable events to return (default: 100)',
            },
          },
        },
      },
      {
        name: 'list_saved_searches',
        description: 'List saved searches and reports with their schedule, owner, and alert configuration',
        inputSchema: {
          type: 'object',
          properties: {
            count: {
              type: 'number',
              description: 'Maximum number of saved searches to return (default: 100)',
            },
            offset: {
              type: 'number',
              description: 'Number of saved searches to skip for pagination (default: 0)',
            },
            app: {
              type: 'string',
              description: 'Filter by Splunk app name',
            },
            owner: {
              type: 'string',
              description: 'Filter by owner username',
            },
          },
        },
      },
      {
        name: 'get_saved_search',
        description: 'Get full configuration for a specific saved search including SPL query, schedule, and alert actions',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Name of the saved search to retrieve',
            },
            app: {
              type: 'string',
              description: 'App context the saved search belongs to (default: search)',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'run_saved_search',
        description: 'Immediately dispatch a saved search and return the SID for result retrieval',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Name of the saved search to run',
            },
            app: {
              type: 'string',
              description: 'App context the saved search belongs to (default: search)',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'list_indexes',
        description: 'List all Splunk indexes with size, event count, and data retention configuration',
        inputSchema: {
          type: 'object',
          properties: {
            count: {
              type: 'number',
              description: 'Maximum number of indexes to return (default: 100)',
            },
            offset: {
              type: 'number',
              description: 'Number of indexes to skip for pagination (default: 0)',
            },
          },
        },
      },
      {
        name: 'get_index',
        description: 'Get detailed configuration and statistics for a specific Splunk index',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Index name to retrieve details for',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'list_kvstore_collections',
        description: 'List KV Store collections available in a Splunk app',
        inputSchema: {
          type: 'object',
          properties: {
            app: {
              type: 'string',
              description: 'Splunk app to list KV Store collections from (default: search)',
            },
          },
        },
      },
      {
        name: 'query_kvstore_collection',
        description: 'Query records from a KV Store collection with optional filter, limit, and skip',
        inputSchema: {
          type: 'object',
          properties: {
            app: {
              type: 'string',
              description: 'Splunk app the KV Store collection belongs to (default: search)',
            },
            collection: {
              type: 'string',
              description: 'KV Store collection name to query',
            },
            query: {
              type: 'string',
              description: 'JSON query filter object (e.g. {"status":"open"}) — omit to return all records',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of records to return (default: 100)',
            },
            skip: {
              type: 'number',
              description: 'Number of records to skip for pagination (default: 0)',
            },
          },
          required: ['collection'],
        },
      },
      {
        name: 'list_apps',
        description: 'List installed Splunk apps with version, status, and visibility information',
        inputSchema: {
          type: 'object',
          properties: {
            count: {
              type: 'number',
              description: 'Maximum number of apps to return (default: 100)',
            },
            offset: {
              type: 'number',
              description: 'Number of apps to skip for pagination (default: 0)',
            },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'create_search_job':
          return await this.createSearchJob(args);
        case 'get_search_job_status':
          return await this.getSearchJobStatus(args);
        case 'get_search_results':
          return await this.getSearchResults(args);
        case 'get_search_events':
          return await this.getSearchEvents(args);
        case 'list_alerts':
          return await this.listAlerts(args);
        case 'get_notable_events':
          return await this.getNotableEvents(args);
        case 'list_saved_searches':
          return await this.listSavedSearches(args);
        case 'get_saved_search':
          return await this.getSavedSearch(args);
        case 'run_saved_search':
          return await this.runSavedSearch(args);
        case 'list_indexes':
          return await this.listIndexes(args);
        case 'get_index':
          return await this.getIndex(args);
        case 'list_kvstore_collections':
          return await this.listKvstoreCollections(args);
        case 'query_kvstore_collection':
          return await this.queryKvstoreCollection(args);
        case 'list_apps':
          return await this.listApps(args);
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
      Authorization: this.authHeader,
      'Content-Type': 'application/x-www-form-urlencoded',
    };
  }

  private async createSearchJob(args: Record<string, unknown>): Promise<ToolResult> {
    const search = args.search as string;
    if (!search) {
      return { content: [{ type: 'text', text: 'search is required' }], isError: true };
    }
    const params = new URLSearchParams({
      search,
      earliest_time: (args.earliest_time as string) ?? '-24h',
      latest_time: (args.latest_time as string) ?? 'now',
      count: String((args.count as number) ?? 100),
      output_mode: 'json',
    });
    if (args.app) params.set('app', args.app as string);

    const response = await this.fetchWithRetry(`${this.baseUrl}/services/search/jobs`, {
      method: 'POST',
      headers: this.headers,
      body: params.toString(),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to create search job: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getSearchJobStatus(args: Record<string, unknown>): Promise<ToolResult> {
    const sid = args.sid as string;
    if (!sid) {
      return { content: [{ type: 'text', text: 'sid is required' }], isError: true };
    }
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/services/search/jobs/${encodeURIComponent(sid)}?output_mode=json`,
      { method: 'GET', headers: this.headers },
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to get search job status: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getSearchResults(args: Record<string, unknown>): Promise<ToolResult> {
    const sid = args.sid as string;
    if (!sid) {
      return { content: [{ type: 'text', text: 'sid is required' }], isError: true };
    }
    const params = new URLSearchParams({
      output_mode: 'json',
      offset: String((args.offset as number) ?? 0),
      count: String((args.count as number) ?? 100),
    });
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/services/search/jobs/${encodeURIComponent(sid)}/results?${params}`,
      { method: 'GET', headers: this.headers },
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to get search results: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getSearchEvents(args: Record<string, unknown>): Promise<ToolResult> {
    const sid = args.sid as string;
    if (!sid) {
      return { content: [{ type: 'text', text: 'sid is required' }], isError: true };
    }
    const params = new URLSearchParams({
      output_mode: 'json',
      offset: String((args.offset as number) ?? 0),
      count: String((args.count as number) ?? 100),
    });
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/services/search/jobs/${encodeURIComponent(sid)}/events?${params}`,
      { method: 'GET', headers: this.headers },
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to get search events: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listAlerts(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams({
      output_mode: 'json',
      count: String((args.count as number) ?? 100),
      offset: String((args.offset as number) ?? 0),
    });
    if (args.owner) params.set('owner', args.owner as string);
    if (args.app) params.set('app', args.app as string);

    const response = await this.fetchWithRetry(`${this.baseUrl}/services/alerts/fired_alerts?${params}`, {
      method: 'GET',
      headers: this.headers,
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to list alerts: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getNotableEvents(args: Record<string, unknown>): Promise<ToolResult> {
    const filter = args.filter as string | undefined;
    // Reject pipe characters to prevent SPL injection
    if (filter && filter.includes('|')) {
      return { content: [{ type: 'text', text: 'filter must not contain pipe characters' }], isError: true };
    }

    const baseSearch = filter
      ? `search index=notable ${filter}`
      : 'search index=notable';

    const params = new URLSearchParams({
      search: baseSearch,
      earliest_time: (args.earliest_time as string) ?? '-7d',
      latest_time: (args.latest_time as string) ?? 'now',
      count: String((args.count as number) ?? 100),
      output_mode: 'json',
    });

    const response = await this.fetchWithRetry(`${this.baseUrl}/services/search/jobs`, {
      method: 'POST',
      headers: this.headers,
      body: params.toString(),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to get notable events: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listSavedSearches(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams({
      output_mode: 'json',
      count: String((args.count as number) ?? 100),
      offset: String((args.offset as number) ?? 0),
    });
    if (args.app) params.set('app', args.app as string);
    if (args.owner) params.set('owner', args.owner as string);

    const response = await this.fetchWithRetry(`${this.baseUrl}/services/saved/searches?${params}`, {
      method: 'GET',
      headers: this.headers,
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to list saved searches: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getSavedSearch(args: Record<string, unknown>): Promise<ToolResult> {
    const name = args.name as string;
    if (!name) {
      return { content: [{ type: 'text', text: 'name is required' }], isError: true };
    }
    const app = (args.app as string) ?? 'search';
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/servicesNS/-/${encodeURIComponent(app)}/saved/searches/${encodeURIComponent(name)}?output_mode=json`,
      { method: 'GET', headers: this.headers },
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to get saved search: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async runSavedSearch(args: Record<string, unknown>): Promise<ToolResult> {
    const name = args.name as string;
    if (!name) {
      return { content: [{ type: 'text', text: 'name is required' }], isError: true };
    }
    const app = (args.app as string) ?? 'search';
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/servicesNS/-/${encodeURIComponent(app)}/saved/searches/${encodeURIComponent(name)}/dispatch`,
      {
        method: 'POST',
        headers: this.headers,
        body: 'output_mode=json',
      },
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to run saved search: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listIndexes(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams({
      output_mode: 'json',
      count: String((args.count as number) ?? 100),
      offset: String((args.offset as number) ?? 0),
    });
    const response = await this.fetchWithRetry(`${this.baseUrl}/services/data/indexes?${params}`, {
      method: 'GET',
      headers: this.headers,
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to list indexes: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getIndex(args: Record<string, unknown>): Promise<ToolResult> {
    const name = args.name as string;
    if (!name) {
      return { content: [{ type: 'text', text: 'name is required' }], isError: true };
    }
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/services/data/indexes/${encodeURIComponent(name)}?output_mode=json`,
      { method: 'GET', headers: this.headers },
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to get index: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listKvstoreCollections(args: Record<string, unknown>): Promise<ToolResult> {
    const app = (args.app as string) ?? 'search';
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/servicesNS/-/${encodeURIComponent(app)}/storage/collections/config?output_mode=json`,
      { method: 'GET', headers: this.headers },
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to list KV store collections: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async queryKvstoreCollection(args: Record<string, unknown>): Promise<ToolResult> {
    const collection = args.collection as string;
    if (!collection) {
      return { content: [{ type: 'text', text: 'collection is required' }], isError: true };
    }
    const app = (args.app as string) ?? 'search';
    const params = new URLSearchParams({
      output_mode: 'json',
      limit: String((args.limit as number) ?? 100),
      skip: String((args.skip as number) ?? 0),
    });
    if (args.query) params.set('query', args.query as string);

    const response = await this.fetchWithRetry(
      `${this.baseUrl}/servicesNS/-/${encodeURIComponent(app)}/storage/collections/data/${encodeURIComponent(collection)}?${params}`,
      { method: 'GET', headers: this.headers },
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to query KV store collection: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listApps(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams({
      output_mode: 'json',
      count: String((args.count as number) ?? 100),
      offset: String((args.offset as number) ?? 0),
    });
    const response = await this.fetchWithRetry(`${this.baseUrl}/services/apps/local?${params}`, {
      method: 'GET',
      headers: this.headers,
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to list apps: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }
}

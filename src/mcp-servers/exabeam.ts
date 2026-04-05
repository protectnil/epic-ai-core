/**
 * Exabeam MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://developers.exabeam.com/exabeam/docs/exabeam-mcp-server-for-developers
//   transport: SSE, auth: API key. Published by Exabeam (official). Maintained (updated ~2026-02).
//   This is an "MCP for Developers" server — it exposes Exabeam's API documentation surface
//   (browse endpoints, retrieve schemas, generate code snippets). It does NOT expose security
//   operations tools (search events, manage cases, query UEBA data). Tool count: N/A — the server
//   is a documentation assistant, not a security operations tool.
// Our adapter covers: 14 tools (core SOC operations). Vendor MCP covers: API docs browsing only.
// Recommendation: use-rest-api — the vendor MCP is a developer docs assistant, not a SOC tool.
//   The MCP fails criterion 3 (10+ security operations tools). Our adapter is the authoritative
//   integration for security operations use cases.
//
// Base URL: region-specific — user MUST supply their regional base URL.
//   US West:   https://api.us-west.exabeam.cloud
//   US East:   https://api.us-east.exabeam.cloud
//   Canada:    https://api.ca.exabeam.cloud
//   Europe:    https://api.eu.exabeam.cloud
//   Singapore: https://api.sg.exabeam.cloud
//   Australia: https://api.au.exabeam.cloud
//   Japan:     https://api.jp.exabeam.cloud
// Auth: OAuth 2.0 Client Credentials — POST /auth/v1/token with JSON body
//   {client_id, client_secret, grant_type: "client_credentials"}
// Docs: https://developers.exabeam.com/exabeam/
// Rate limits: Auth API: 50 req/5 min per source IP. Public APIs: 100 req/min per source IP.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface ExabeamConfig {
  /** Regional base URL, e.g. https://api.us-west.exabeam.cloud */
  baseUrl: string;
  clientId: string;
  clientSecret: string;
}

export class ExabeamMCPServer extends MCPAdapterBase {
  private readonly baseUrl: string;
  private readonly clientId: string;
  private readonly clientSecret: string;
  private accessToken: string = '';
  private tokenExpiry: number = 0;

  constructor(config: ExabeamConfig) {
    super();
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
  }

  static catalog() {
    return {
      name: 'exabeam',
      displayName: 'Exabeam',
      version: '1.0.0',
      category: 'cybersecurity' as const,
      keywords: [
        'exabeam', 'ueba', 'siem', 'soc', 'security', 'user behavior analytics',
        'risk score', 'threat detection', 'incident', 'case', 'alert', 'watchlist',
        'correlation rule', 'context table', 'notable user', 'session', 'event',
      ],
      toolNames: [
        'search_events', 'get_user_sessions', 'get_user_risk_score', 'list_notable_users',
        'get_asset_info', 'list_watchlisted_users', 'get_rules', 'list_cases', 'get_case',
        'update_case', 'list_alerts', 'get_alert', 'list_context_tables', 'query_context_table',
      ],
      description: 'Exabeam New-Scale SOC platform: search security events, investigate user risk scores, manage UEBA cases and alerts, query context tables, and review correlation rules.',
      author: 'protectnil' as const,
    };
  }

  private async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    const response = await this.fetchWithRetry(`${this.baseUrl}/auth/v1/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        grant_type: 'client_credentials',
      }),
    });

    if (!response.ok) {
      throw new Error(`Exabeam auth failed (HTTP ${response.status}): ${await response.text()}`);
    }

    const data = await response.json() as { access_token: string; expires_in?: number };
    this.accessToken = data.access_token;
    this.tokenExpiry = Date.now() + ((data.expires_in ?? 3600) - 60) * 1000;
    return this.accessToken;
  }


  get tools(): ToolDefinition[] {
    return [
      {
        name: 'search_events',
        description: 'Search security events in the Exabeam data lake using a query string with optional time range and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query string using Exabeam search syntax (e.g. "event_type:authentication")',
            },
            start_time: {
              type: 'string',
              description: 'Start of search window in ISO 8601 format (e.g. 2024-01-01T00:00:00.000Z)',
            },
            end_time: {
              type: 'string',
              description: 'End of search window in ISO 8601 format',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of events to return (default: 100, max: 1000)',
            },
            offset: {
              type: 'number',
              description: 'Pagination offset (default: 0)',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'get_user_sessions',
        description: 'Retrieve UEBA behavioral analytics sessions for a specific user within a time range',
        inputSchema: {
          type: 'object',
          properties: {
            username: {
              type: 'string',
              description: 'The username to retrieve sessions for',
            },
            start_time: {
              type: 'string',
              description: 'Start of time range in ISO 8601 format',
            },
            end_time: {
              type: 'string',
              description: 'End of time range in ISO 8601 format',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of sessions to return (default: 20)',
            },
          },
          required: ['username'],
        },
      },
      {
        name: 'get_user_risk_score',
        description: 'Retrieve the current risk score and risk score history for a specific user',
        inputSchema: {
          type: 'object',
          properties: {
            username: {
              type: 'string',
              description: 'The username to retrieve risk information for',
            },
          },
          required: ['username'],
        },
      },
      {
        name: 'list_notable_users',
        description: 'List users with elevated risk scores (notable users) in Exabeam with lookback period and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            unit: {
              type: 'string',
              description: 'Time unit for lookback: d (days), w (weeks) — default: d',
            },
            num: {
              type: 'number',
              description: 'Number of time units to look back (default: 7)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of notable users to return (default: 25)',
            },
            offset: {
              type: 'number',
              description: 'Pagination offset (default: 0)',
            },
          },
        },
      },
      {
        name: 'get_asset_info',
        description: 'Retrieve asset details and risk information for a hostname or IP address from Exabeam',
        inputSchema: {
          type: 'object',
          properties: {
            hostname: {
              type: 'string',
              description: 'The hostname to look up (provide either hostname or ip_address)',
            },
            ip_address: {
              type: 'string',
              description: 'The IP address to look up (provide either hostname or ip_address)',
            },
          },
        },
      },
      {
        name: 'list_watchlisted_users',
        description: 'List users currently on an Exabeam watchlist, optionally filtered by watchlist name',
        inputSchema: {
          type: 'object',
          properties: {
            watchlist_name: {
              type: 'string',
              description: 'Name of the watchlist to retrieve (optional — returns all if omitted)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of users to return (default: 50)',
            },
            offset: {
              type: 'number',
              description: 'Pagination offset (default: 0)',
            },
          },
        },
      },
      {
        name: 'get_rules',
        description: 'List Exabeam behavioral analytics and correlation rules with optional name filter and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            filter: {
              type: 'string',
              description: 'Optional filter string to narrow results by rule name',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of rules to return (default: 50)',
            },
            offset: {
              type: 'number',
              description: 'Pagination offset (default: 0)',
            },
          },
        },
      },
      {
        name: 'list_cases',
        description: 'List Exabeam Threat Center cases with optional status and priority filters',
        inputSchema: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              description: 'Filter by case status: open, in_progress, closed (default: open)',
            },
            priority: {
              type: 'string',
              description: 'Filter by priority: low, medium, high, critical',
            },
            assignee: {
              type: 'string',
              description: 'Filter by assigned analyst username',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of cases to return (default: 25)',
            },
            offset: {
              type: 'number',
              description: 'Pagination offset (default: 0)',
            },
          },
        },
      },
      {
        name: 'get_case',
        description: 'Retrieve full details of a specific Exabeam Threat Center case including notes and timeline',
        inputSchema: {
          type: 'object',
          properties: {
            case_id: {
              type: 'string',
              description: 'The unique case ID to retrieve',
            },
          },
          required: ['case_id'],
        },
      },
      {
        name: 'update_case',
        description: 'Update the status, priority, or assignee of an Exabeam Threat Center case',
        inputSchema: {
          type: 'object',
          properties: {
            case_id: {
              type: 'string',
              description: 'The unique case ID to update',
            },
            status: {
              type: 'string',
              description: 'New status: open, in_progress, closed',
            },
            priority: {
              type: 'string',
              description: 'New priority: low, medium, high, critical',
            },
            assignee: {
              type: 'string',
              description: 'Username of the analyst to assign the case to',
            },
            note: {
              type: 'string',
              description: 'Optional note to add to the case timeline',
            },
          },
          required: ['case_id'],
        },
      },
      {
        name: 'list_alerts',
        description: 'List Exabeam Threat Center alerts with optional filters for status, severity, and rule name',
        inputSchema: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              description: 'Filter by alert status: open, acknowledged, closed',
            },
            severity: {
              type: 'string',
              description: 'Filter by severity: low, medium, high, critical',
            },
            rule_name: {
              type: 'string',
              description: 'Filter by triggering rule name',
            },
            start_time: {
              type: 'string',
              description: 'Filter alerts after this ISO 8601 timestamp',
            },
            end_time: {
              type: 'string',
              description: 'Filter alerts before this ISO 8601 timestamp',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of alerts to return (default: 50)',
            },
            offset: {
              type: 'number',
              description: 'Pagination offset (default: 0)',
            },
          },
        },
      },
      {
        name: 'get_alert',
        description: 'Retrieve full details of a specific Exabeam Threat Center alert by ID',
        inputSchema: {
          type: 'object',
          properties: {
            alert_id: {
              type: 'string',
              description: 'The unique alert ID to retrieve',
            },
          },
          required: ['alert_id'],
        },
      },
      {
        name: 'list_context_tables',
        description: 'List Exabeam context tables including threat intelligence and custom tables',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of context tables to return (default: 50)',
            },
            offset: {
              type: 'number',
              description: 'Pagination offset (default: 0)',
            },
          },
        },
      },
      {
        name: 'query_context_table',
        description: 'Query an Exabeam context table by name to look up threat intelligence or contextual data',
        inputSchema: {
          type: 'object',
          properties: {
            table_name: {
              type: 'string',
              description: 'Name of the context table to query',
            },
            lookup_value: {
              type: 'string',
              description: 'Value to look up in the context table (e.g. IP address, domain, username)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of records to return (default: 50)',
            },
          },
          required: ['table_name'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      const token = await this.getAccessToken();
      const headers: Record<string, string> = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      };

      switch (name) {
        case 'search_events':
          return this.searchEvents(args, headers);
        case 'get_user_sessions':
          return this.getUserSessions(args, headers);
        case 'get_user_risk_score':
          return this.getUserRiskScore(args, headers);
        case 'list_notable_users':
          return this.listNotableUsers(args, headers);
        case 'get_asset_info':
          return this.getAssetInfo(args, headers);
        case 'list_watchlisted_users':
          return this.listWatchlistedUsers(args, headers);
        case 'get_rules':
          return this.getRules(args, headers);
        case 'list_cases':
          return this.listCases(args, headers);
        case 'get_case':
          return this.getCase(args, headers);
        case 'update_case':
          return this.updateCase(args, headers);
        case 'list_alerts':
          return this.listAlerts(args, headers);
        case 'get_alert':
          return this.getAlert(args, headers);
        case 'list_context_tables':
          return this.listContextTables(args, headers);
        case 'query_context_table':
          return this.queryContextTable(args, headers);
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

  private async searchEvents(args: Record<string, unknown>, headers: Record<string, string>): Promise<ToolResult> {
    const query = args.query as string;
    if (!query) {
      return { content: [{ type: 'text', text: 'query is required' }], isError: true };
    }

    const body: Record<string, unknown> = { query };
    if (args.start_time) body.startTime = args.start_time;
    if (args.end_time) body.endTime = args.end_time;
    if (args.limit) body.limit = args.limit;
    if (args.offset !== undefined) body.offset = args.offset;

    const response = await this.fetchWithRetry(`${this.baseUrl}/search/v2/events`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      return { content: [{ type: 'text', text: `Event search failed (HTTP ${response.status}): ${await response.text()}` }], isError: true };
    }

    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async getUserSessions(args: Record<string, unknown>, headers: Record<string, string>): Promise<ToolResult> {
    const username = args.username as string;
    if (!username) {
      return { content: [{ type: 'text', text: 'username is required' }], isError: true };
    }

    const params = new URLSearchParams();
    if (args.start_time) params.set('startTime', args.start_time as string);
    if (args.end_time) params.set('endTime', args.end_time as string);
    if (args.limit) params.set('limit', String(args.limit));

    const qs = params.toString() ? `?${params.toString()}` : '';
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/uba/api/user/${encodeURIComponent(username)}/sequences${qs}`,
      { method: 'GET', headers },
    );

    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to get user sessions (HTTP ${response.status}): ${await response.text()}` }], isError: true };
    }

    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async getUserRiskScore(args: Record<string, unknown>, headers: Record<string, string>): Promise<ToolResult> {
    const username = args.username as string;
    if (!username) {
      return { content: [{ type: 'text', text: 'username is required' }], isError: true };
    }

    const response = await this.fetchWithRetry(
      `${this.baseUrl}/uba/api/user/${encodeURIComponent(username)}/riskScoreHistory`,
      { method: 'GET', headers },
    );

    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to get user risk score (HTTP ${response.status}): ${await response.text()}` }], isError: true };
    }

    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async listNotableUsers(args: Record<string, unknown>, headers: Record<string, string>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.unit) params.set('unit', args.unit as string);
    if (args.num) params.set('num', String(args.num));
    if (args.limit) params.set('numberOfResults', String(args.limit));
    if (args.offset !== undefined) params.set('offset', String(args.offset));

    const qs = params.toString() ? `?${params.toString()}` : '';
    const response = await this.fetchWithRetry(`${this.baseUrl}/uba/api/users/notable${qs}`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to list notable users (HTTP ${response.status}): ${await response.text()}` }], isError: true };
    }

    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async getAssetInfo(args: Record<string, unknown>, headers: Record<string, string>): Promise<ToolResult> {
    const hostname = args.hostname as string;
    const ipAddress = args.ip_address as string;

    if (!hostname && !ipAddress) {
      return { content: [{ type: 'text', text: 'hostname or ip_address is required' }], isError: true };
    }

    const identifier = hostname || ipAddress;
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/uba/api/asset/${encodeURIComponent(identifier)}`,
      { method: 'GET', headers },
    );

    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to get asset info (HTTP ${response.status}): ${await response.text()}` }], isError: true };
    }

    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async listWatchlistedUsers(args: Record<string, unknown>, headers: Record<string, string>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.watchlist_name) params.set('watchlistName', args.watchlist_name as string);
    if (args.limit) params.set('limit', String(args.limit));
    if (args.offset !== undefined) params.set('offset', String(args.offset));

    const qs = params.toString() ? `?${params.toString()}` : '';
    const response = await this.fetchWithRetry(`${this.baseUrl}/uba/api/watchlist/users${qs}`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to list watchlisted users (HTTP ${response.status}): ${await response.text()}` }], isError: true };
    }

    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async getRules(args: Record<string, unknown>, headers: Record<string, string>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.filter) params.set('filter', args.filter as string);
    if (args.limit) params.set('limit', String(args.limit));
    if (args.offset !== undefined) params.set('offset', String(args.offset));

    const qs = params.toString() ? `?${params.toString()}` : '';
    const response = await this.fetchWithRetry(`${this.baseUrl}/uba/api/rules${qs}`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to get rules (HTTP ${response.status}): ${await response.text()}` }], isError: true };
    }

    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async listCases(args: Record<string, unknown>, headers: Record<string, string>): Promise<ToolResult> {
    const body: Record<string, unknown> = {};
    if (args.status) body.status = args.status;
    if (args.priority) body.priority = args.priority;
    if (args.assignee) body.assignee = args.assignee;
    if (args.limit) body.limit = args.limit;
    if (args.offset !== undefined) body.offset = args.offset;

    const response = await this.fetchWithRetry(`${this.baseUrl}/threat-center/v1/search/cases`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to list cases (HTTP ${response.status}): ${await response.text()}` }], isError: true };
    }

    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async getCase(args: Record<string, unknown>, headers: Record<string, string>): Promise<ToolResult> {
    const caseId = args.case_id as string;
    if (!caseId) {
      return { content: [{ type: 'text', text: 'case_id is required' }], isError: true };
    }

    const response = await this.fetchWithRetry(
      `${this.baseUrl}/threat-center/v1/cases/${encodeURIComponent(caseId)}`,
      { method: 'GET', headers },
    );

    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to get case (HTTP ${response.status}): ${await response.text()}` }], isError: true };
    }

    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async updateCase(args: Record<string, unknown>, headers: Record<string, string>): Promise<ToolResult> {
    const caseId = args.case_id as string;
    if (!caseId) {
      return { content: [{ type: 'text', text: 'case_id is required' }], isError: true };
    }

    const body: Record<string, unknown> = {};
    if (args.status) body.status = args.status;
    if (args.priority) body.priority = args.priority;
    if (args.assignee) body.assignee = args.assignee;
    if (args.note) body.note = args.note;

    const response = await this.fetchWithRetry(
      `${this.baseUrl}/threat-center/v1/cases/${encodeURIComponent(caseId)}`,
      { method: 'POST', headers, body: JSON.stringify(body) },
    );

    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to update case (HTTP ${response.status}): ${await response.text()}` }], isError: true };
    }

    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async listAlerts(args: Record<string, unknown>, headers: Record<string, string>): Promise<ToolResult> {
    const body: Record<string, unknown> = {};
    if (args.status) body.status = args.status;
    if (args.severity) body.severity = args.severity;
    if (args.rule_name) body.ruleName = args.rule_name;
    if (args.start_time) body.startTime = args.start_time;
    if (args.end_time) body.endTime = args.end_time;
    if (args.limit) body.limit = args.limit;
    if (args.offset !== undefined) body.offset = args.offset;

    const response = await this.fetchWithRetry(`${this.baseUrl}/threat-center/v1/search/alerts`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to list alerts (HTTP ${response.status}): ${await response.text()}` }], isError: true };
    }

    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async getAlert(args: Record<string, unknown>, headers: Record<string, string>): Promise<ToolResult> {
    const alertId = args.alert_id as string;
    if (!alertId) {
      return { content: [{ type: 'text', text: 'alert_id is required' }], isError: true };
    }

    const response = await this.fetchWithRetry(
      `${this.baseUrl}/threat-center/v1/alerts/${encodeURIComponent(alertId)}`,
      { method: 'GET', headers },
    );

    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to get alert (HTTP ${response.status}): ${await response.text()}` }], isError: true };
    }

    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async listContextTables(args: Record<string, unknown>, headers: Record<string, string>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.limit) params.set('limit', String(args.limit));
    if (args.offset !== undefined) params.set('offset', String(args.offset));

    const qs = params.toString() ? `?${params.toString()}` : '';
    const response = await this.fetchWithRetry(`${this.baseUrl}/uba/api/context-tables${qs}`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to list context tables (HTTP ${response.status}): ${await response.text()}` }], isError: true };
    }

    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async queryContextTable(args: Record<string, unknown>, headers: Record<string, string>): Promise<ToolResult> {
    const tableName = args.table_name as string;
    if (!tableName) {
      return { content: [{ type: 'text', text: 'table_name is required' }], isError: true };
    }

    const params = new URLSearchParams();
    if (args.lookup_value) params.set('lookupValue', args.lookup_value as string);
    if (args.limit) params.set('limit', String(args.limit));

    const qs = params.toString() ? `?${params.toString()}` : '';
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/uba/api/context-tables/${encodeURIComponent(tableName)}/query${qs}`,
      { method: 'GET', headers },
    );

    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to query context table (HTTP ${response.status}): ${await response.text()}` }], isError: true };
    }

    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }
}

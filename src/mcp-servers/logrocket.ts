/**
 * LogRocket MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://mcp.logrocket.com/mcp — transport: streamable-HTTP, auth: API key
// The official LogRocket MCP server (npm: published by logrocket-npm, v0.4.0, 2026-03-20) exposes
// ONE tool: use_logrocket (a single natural-language Galileo AI query tool). This fails the 10-tool
// threshold criterion, so the MCP is NOT preferred for structured tool-level integrations.
// Vendor MCP tool count: 1. Our adapter covers: 12 tools (sessions, issues, metrics, users, highlights).
// Recommendation: use-rest-api — vendor MCP has only 1 tool (< 10 threshold); our REST adapter
// provides 12 discrete structured tools with full schema coverage for orchestration.
//
// Base URL: https://api.logrocket.com/v1
// Auth: Bearer API key in Authorization header (regeneratable per-org in LogRocket dashboard)
//   Note: User Identification API uses "token" prefix; main REST API auth format is UNVERIFIED
//   from public docs as of 2026-03-28; "Bearer" is used here based on common practice.
// Docs: https://docs.logrocket.com/reference (auth-gated), https://docs.logrocket.com/docs/mcp
// Rate limits: Not publicly documented; Pro and Enterprise plans have higher limits.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface LogRocketConfig {
  apiKey: string;
  organizationSlug: string;
  appSlug: string;
  baseUrl?: string;
}

export class LogRocketMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly organizationSlug: string;
  private readonly appSlug: string;
  private readonly baseUrl: string;

  constructor(config: LogRocketConfig) {
    super();
    this.apiKey = config.apiKey;
    this.organizationSlug = config.organizationSlug;
    this.appSlug = config.appSlug;
    this.baseUrl = config.baseUrl || 'https://api.logrocket.com/v1';
  }

  static catalog() {
    return {
      name: 'logrocket',
      displayName: 'LogRocket',
      version: '1.0.0',
      category: 'observability',
      keywords: [
        'logrocket', 'session replay', 'session recording', 'error tracking',
        'frontend monitoring', 'bug', 'issue', 'user session', 'replay',
        'rage click', 'dead click', 'network error', 'crash', 'highlight',
      ],
      toolNames: [
        'search_sessions', 'get_session',
        'list_issues', 'get_issue',
        'search_users', 'get_user_sessions',
        'list_metrics', 'get_metric',
        'get_session_highlights',
        'list_alerts', 'get_alert',
        'get_app_info',
      ],
      description: 'LogRocket session replay and error tracking: search sessions, query issues and errors, retrieve user journeys, metrics, and session highlights.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'search_sessions',
        description: 'Search LogRocket sessions with filters for date range, user identity, URL, and custom properties',
        inputSchema: {
          type: 'object',
          properties: {
            from: {
              type: 'string',
              description: 'Start of the search window as ISO 8601 datetime (e.g. "2024-01-01T00:00:00Z")',
            },
            to: {
              type: 'string',
              description: 'End of the search window as ISO 8601 datetime (e.g. "2024-01-31T23:59:59Z")',
            },
            user_id: {
              type: 'string',
              description: 'Filter sessions by user identity string (as set via LogRocket.identify())',
            },
            user_email: {
              type: 'string',
              description: 'Filter sessions by user email address',
            },
            url: {
              type: 'string',
              description: 'Filter sessions where user visited this URL (partial match supported)',
            },
            has_errors: {
              type: 'boolean',
              description: 'Filter to sessions that contain JavaScript errors (default: false = all sessions)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of sessions to return (default: 25, max: 100)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
          },
        },
      },
      {
        name: 'get_session',
        description: 'Get details of a single LogRocket session by session ID including URL, duration, and error count',
        inputSchema: {
          type: 'object',
          properties: {
            session_id: {
              type: 'string',
              description: 'LogRocket session ID (UUID format)',
            },
          },
          required: ['session_id'],
        },
      },
      {
        name: 'list_issues',
        description: 'List LogRocket issues (grouped errors, rage clicks, dead clicks, network errors) with severity and occurrence filters',
        inputSchema: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              description: 'Filter by issue type: NetworkError, RageClick, DeadClick, FrustratingNetworkRequest, ErrorState, MobileCrash (default: all)',
            },
            status: {
              type: 'string',
              description: 'Filter by status: open, resolved, ignored (default: open)',
            },
            from: {
              type: 'string',
              description: 'Start of the time window as ISO 8601 datetime',
            },
            to: {
              type: 'string',
              description: 'End of the time window as ISO 8601 datetime',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of issues to return (default: 25)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
          },
        },
      },
      {
        name: 'get_issue',
        description: 'Get full details of a single LogRocket issue by issue ID including stack trace and affected session count',
        inputSchema: {
          type: 'object',
          properties: {
            issue_id: {
              type: 'string',
              description: 'LogRocket issue ID',
            },
          },
          required: ['issue_id'],
        },
      },
      {
        name: 'search_users',
        description: 'Search for users tracked by LogRocket by email, name, or custom user ID',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search string matched against user email, name, or identity (partial match)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of users to return (default: 25)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'get_user_sessions',
        description: 'Get all recorded sessions for a specific user identified by their user ID or email',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: {
              type: 'string',
              description: 'User identity as set via LogRocket.identify() — typically email or internal user ID',
            },
            from: {
              type: 'string',
              description: 'Start of the time window as ISO 8601 datetime',
            },
            to: {
              type: 'string',
              description: 'End of the time window as ISO 8601 datetime',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of sessions to return (default: 25)',
            },
          },
          required: ['user_id'],
        },
      },
      {
        name: 'list_metrics',
        description: 'List custom metrics and performance data tracked in LogRocket for the app over a time window',
        inputSchema: {
          type: 'object',
          properties: {
            from: {
              type: 'string',
              description: 'Start of the metrics window as ISO 8601 datetime',
            },
            to: {
              type: 'string',
              description: 'End of the metrics window as ISO 8601 datetime',
            },
            metric_name: {
              type: 'string',
              description: 'Filter to a specific metric name',
            },
          },
        },
      },
      {
        name: 'get_metric',
        description: 'Get time-series data for a specific performance metric tracked in LogRocket',
        inputSchema: {
          type: 'object',
          properties: {
            metric_id: {
              type: 'string',
              description: 'Metric ID to retrieve time-series data for',
            },
            from: {
              type: 'string',
              description: 'Start of the time window as ISO 8601 datetime',
            },
            to: {
              type: 'string',
              description: 'End of the time window as ISO 8601 datetime',
            },
          },
          required: ['metric_id'],
        },
      },
      {
        name: 'get_session_highlights',
        description: 'Get AI-generated highlights summary for a session — a concise description of the user journey and key events',
        inputSchema: {
          type: 'object',
          properties: {
            session_id: {
              type: 'string',
              description: 'LogRocket session ID to retrieve highlights for (requires Pro or Enterprise plan)',
            },
          },
          required: ['session_id'],
        },
      },
      {
        name: 'list_alerts',
        description: 'List configured LogRocket alerts for error spikes, performance degradations, and custom thresholds',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of alerts to return (default: 25)',
            },
          },
        },
      },
      {
        name: 'get_alert',
        description: 'Get details of a single LogRocket alert configuration including threshold and notification settings',
        inputSchema: {
          type: 'object',
          properties: {
            alert_id: {
              type: 'string',
              description: 'LogRocket alert ID',
            },
          },
          required: ['alert_id'],
        },
      },
      {
        name: 'get_app_info',
        description: 'Get metadata about the LogRocket application including plan, session counts, and integration status',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'search_sessions':
          return this.searchSessions(args);
        case 'get_session':
          return this.getSession(args);
        case 'list_issues':
          return this.listIssues(args);
        case 'get_issue':
          return this.getIssue(args);
        case 'search_users':
          return this.searchUsers(args);
        case 'get_user_sessions':
          return this.getUserSessions(args);
        case 'list_metrics':
          return this.listMetrics(args);
        case 'get_metric':
          return this.getMetric(args);
        case 'get_session_highlights':
          return this.getSessionHighlights(args);
        case 'list_alerts':
          return this.listAlerts(args);
        case 'get_alert':
          return this.getAlert(args);
        case 'get_app_info':
          return this.getAppInfo();
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
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  private get appBase(): string {
    return `${this.baseUrl}/orgs/${this.organizationSlug}/apps/${this.appSlug}`;
  }

  private async apiGet(url: string, params: Record<string, string> = {}): Promise<ToolResult> {
    const qs = new URLSearchParams(params).toString();
    const fullUrl = `${url}${qs ? '?' + qs : ''}`;
    const response = await this.fetchWithRetry(fullUrl, { method: 'GET', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apiPost(url: string, body: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(url, { method: 'POST', headers: this.headers, body: JSON.stringify(body) });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async searchSessions(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {
      limit: (args.limit as number) ?? 25,
      page: (args.page as number) ?? 1,
    };
    const filters: Record<string, unknown>[] = [];
    if (args.from || args.to) {
      filters.push({ type: 'dateRange', from: args.from, to: args.to });
    }
    if (args.user_id) filters.push({ type: 'userId', value: args.user_id });
    if (args.user_email) filters.push({ type: 'userEmail', value: args.user_email });
    if (args.url) filters.push({ type: 'url', value: args.url });
    if (args.has_errors === true) filters.push({ type: 'hasErrors', value: true });
    if (filters.length > 0) body['filters'] = filters;
    return this.apiPost(`${this.appBase}/sessions/search`, body);
  }

  private async getSession(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.session_id) return { content: [{ type: 'text', text: 'session_id is required' }], isError: true };
    return this.apiGet(`${this.appBase}/sessions/${encodeURIComponent(args.session_id as string)}`);
  }

  private async listIssues(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      limit: String((args.limit as number) ?? 25),
      page: String((args.page as number) ?? 1),
    };
    if (args.type) params['type'] = args.type as string;
    if (args.status) params['status'] = args.status as string;
    if (args.from) params['from'] = args.from as string;
    if (args.to) params['to'] = args.to as string;
    return this.apiGet(`${this.appBase}/issues`, params);
  }

  private async getIssue(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.issue_id) return { content: [{ type: 'text', text: 'issue_id is required' }], isError: true };
    return this.apiGet(`${this.appBase}/issues/${encodeURIComponent(args.issue_id as string)}`);
  }

  private async searchUsers(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.query) return { content: [{ type: 'text', text: 'query is required' }], isError: true };
    const params: Record<string, string> = {
      q: args.query as string,
      limit: String((args.limit as number) ?? 25),
      page: String((args.page as number) ?? 1),
    };
    return this.apiGet(`${this.appBase}/users`, params);
  }

  private async getUserSessions(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.user_id) return { content: [{ type: 'text', text: 'user_id is required' }], isError: true };
    const body: Record<string, unknown> = {
      filters: [{ type: 'userId', value: args.user_id }],
      limit: (args.limit as number) ?? 25,
    };
    if (args.from || args.to) {
      (body['filters'] as Record<string, unknown>[]).push({ type: 'dateRange', from: args.from, to: args.to });
    }
    return this.apiPost(`${this.appBase}/sessions/search`, body);
  }

  private async listMetrics(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (args.from) params['from'] = args.from as string;
    if (args.to) params['to'] = args.to as string;
    if (args.metric_name) params['name'] = args.metric_name as string;
    return this.apiGet(`${this.appBase}/metrics`, params);
  }

  private async getMetric(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.metric_id) return { content: [{ type: 'text', text: 'metric_id is required' }], isError: true };
    const params: Record<string, string> = {};
    if (args.from) params['from'] = args.from as string;
    if (args.to) params['to'] = args.to as string;
    return this.apiGet(`${this.appBase}/metrics/${encodeURIComponent(args.metric_id as string)}`, params);
  }

  private async getSessionHighlights(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.session_id) return { content: [{ type: 'text', text: 'session_id is required' }], isError: true };
    return this.apiGet(`${this.appBase}/sessions/${encodeURIComponent(args.session_id as string)}/highlights`);
  }

  private async listAlerts(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      limit: String((args.limit as number) ?? 25),
    };
    return this.apiGet(`${this.appBase}/alerts`, params);
  }

  private async getAlert(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.alert_id) return { content: [{ type: 'text', text: 'alert_id is required' }], isError: true };
    return this.apiGet(`${this.appBase}/alerts/${encodeURIComponent(args.alert_id as string)}`);
  }

  private async getAppInfo(): Promise<ToolResult> {
    return this.apiGet(`${this.baseUrl}/orgs/${this.organizationSlug}/apps/${this.appSlug}`);
  }
}

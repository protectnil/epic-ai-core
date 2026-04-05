/**
 * Pendo MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://app.pendo.io/mcp/v0/shttp — transport: Streamable HTTP (with SSE fallback), auth: OAuth
// The official Pendo MCP server is in open beta as of 2026-03. Hosted by Pendo. Requires admin enablement per org.
// Vendor MCP covers: 11 tools (all read-only analytics queries). Our adapter covers: 15 tools (CRUD + aggregation).
// Integration: use-both
// MCP-sourced tools (7): activityQuery, visitorQuery, visitorMetadataSchema, accountQuery, accountMetadataSchema,
//   guideMetrics, searchEntities, sessionReplayList, get_feedback_items, get_feedback_insights, generate_feedback_topics
//   (MCP tools are read-only analytics; unique to MCP: sessionReplayList, get_feedback_items, get_feedback_insights, generate_feedback_topics)
// REST-sourced tools (15): list_visitors, get_visitor, search_visitors, list_accounts, get_account, search_accounts,
//   list_pages, get_page, get_page_analytics, list_features, get_feature, get_feature_analytics,
//   list_guides, get_guide, run_aggregation
// Combined coverage: MCP for OAuth analytics queries; REST adapter for server-to-server CRUD and aggregation.
// Recommendation: use-both — each side has unique capabilities. MCP has session replay and feedback tools not in REST API.
//                 REST adapter has structural CRUD (pages, features, guides config) and aggregation not in MCP.
//
// Base URL: https://app.pendo.io
// Auth: x-pendo-integration-key header (static integration key from Pendo Settings → Integrations)
// Docs: https://developers.pendo.io/
// Rate limits: Not publicly documented; Pendo enforces per-key limits — rotate keys for high-volume use

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface PendoConfig {
  integrationKey: string;
  baseUrl?: string;
}

export class PendoMCPServer extends MCPAdapterBase {
  private readonly integrationKey: string;
  private readonly baseUrl: string;

  constructor(config: PendoConfig) {
    super();
    this.integrationKey = config.integrationKey;
    this.baseUrl = config.baseUrl || 'https://app.pendo.io';
  }

  static catalog() {
    return {
      name: 'pendo',
      displayName: 'Pendo',
      version: '1.0.0',
      category: 'misc',
      keywords: [
        'pendo', 'product analytics', 'user engagement', 'in-app guide', 'onboarding',
        'visitor', 'account', 'feature adoption', 'page analytics', 'nps', 'feedback',
        'retention', 'product management', 'user behavior', 'saas analytics',
      ],
      toolNames: [
        'list_visitors', 'get_visitor', 'search_visitors',
        'list_accounts', 'get_account', 'search_accounts',
        'list_pages', 'get_page', 'get_page_analytics',
        'list_features', 'get_feature', 'get_feature_analytics',
        'list_guides', 'get_guide',
        'run_aggregation',
      ],
      description: 'Pendo product analytics: query visitors, accounts, pages, features, and in-app guides. Run aggregation queries for retention, adoption, and engagement metrics.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_visitors',
        description: 'List visitor profiles with optional filters and pagination — returns visitor IDs, metadata, and last activity',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of visitors to return (default: 50, max: 500)',
            },
            offset: {
              type: 'number',
              description: 'Pagination offset (default: 0)',
            },
          },
        },
      },
      {
        name: 'get_visitor',
        description: 'Get detailed profile and metadata for a specific visitor by visitor ID',
        inputSchema: {
          type: 'object',
          properties: {
            visitor_id: {
              type: 'string',
              description: 'Pendo visitor ID (as set in your Pendo snippet identify call)',
            },
          },
          required: ['visitor_id'],
        },
      },
      {
        name: 'search_visitors',
        description: 'Search for visitors by metadata field values using Pendo filter syntax',
        inputSchema: {
          type: 'object',
          properties: {
            filter: {
              type: 'string',
              description: 'Pendo filter string (e.g. "visitor.email contains \'@example.com\'")',
            },
            limit: {
              type: 'number',
              description: 'Maximum results (default: 50)',
            },
          },
          required: ['filter'],
        },
      },
      {
        name: 'list_accounts',
        description: 'List account records with optional pagination — returns account IDs and metadata',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of accounts to return (default: 50, max: 500)',
            },
            offset: {
              type: 'number',
              description: 'Pagination offset (default: 0)',
            },
          },
        },
      },
      {
        name: 'get_account',
        description: 'Get detailed profile and metadata for a specific account by account ID',
        inputSchema: {
          type: 'object',
          properties: {
            account_id: {
              type: 'string',
              description: 'Pendo account ID (as set in your Pendo snippet identify call)',
            },
          },
          required: ['account_id'],
        },
      },
      {
        name: 'search_accounts',
        description: 'Search accounts by metadata field values using Pendo filter syntax',
        inputSchema: {
          type: 'object',
          properties: {
            filter: {
              type: 'string',
              description: 'Pendo filter string (e.g. "account.name contains \'Acme\'")',
            },
            limit: {
              type: 'number',
              description: 'Maximum results (default: 50)',
            },
          },
          required: ['filter'],
        },
      },
      {
        name: 'list_pages',
        description: 'List all tracked pages in the Pendo subscription with names, URLs, and rule definitions',
        inputSchema: {
          type: 'object',
          properties: {
            app_id: {
              type: 'string',
              description: 'App ID to scope pages to a specific application (omit for all apps)',
            },
          },
        },
      },
      {
        name: 'get_page',
        description: 'Get definition and configuration for a specific Pendo page by page ID',
        inputSchema: {
          type: 'object',
          properties: {
            page_id: {
              type: 'string',
              description: 'Pendo page ID',
            },
          },
          required: ['page_id'],
        },
      },
      {
        name: 'get_page_analytics',
        description: 'Get usage analytics for a Pendo page — views, unique visitors, average time, and trend data',
        inputSchema: {
          type: 'object',
          properties: {
            page_id: {
              type: 'string',
              description: 'Pendo page ID to get analytics for',
            },
            period: {
              type: 'string',
              description: 'Time period: hourly, daily, weekly, monthly (default: daily)',
            },
            first: {
              type: 'string',
              description: 'Start of date range in YYYY-MM-DD format',
            },
            last: {
              type: 'string',
              description: 'End of date range in YYYY-MM-DD format',
            },
          },
          required: ['page_id'],
        },
      },
      {
        name: 'list_features',
        description: 'List all tracked features (click targets) in the Pendo subscription',
        inputSchema: {
          type: 'object',
          properties: {
            app_id: {
              type: 'string',
              description: 'App ID to scope features to a specific application',
            },
          },
        },
      },
      {
        name: 'get_feature',
        description: 'Get definition and selector configuration for a specific tracked feature by feature ID',
        inputSchema: {
          type: 'object',
          properties: {
            feature_id: {
              type: 'string',
              description: 'Pendo feature ID',
            },
          },
          required: ['feature_id'],
        },
      },
      {
        name: 'get_feature_analytics',
        description: 'Get click and usage analytics for a tracked feature — clicks, unique clickers, and trend over time',
        inputSchema: {
          type: 'object',
          properties: {
            feature_id: {
              type: 'string',
              description: 'Pendo feature ID to get analytics for',
            },
            period: {
              type: 'string',
              description: 'Time period: hourly, daily, weekly, monthly (default: daily)',
            },
            first: {
              type: 'string',
              description: 'Start of date range in YYYY-MM-DD format',
            },
            last: {
              type: 'string',
              description: 'End of date range in YYYY-MM-DD format',
            },
          },
          required: ['feature_id'],
        },
      },
      {
        name: 'list_guides',
        description: 'List all in-app guides in the subscription with state, targeting, and launch method',
        inputSchema: {
          type: 'object',
          properties: {
            state: {
              type: 'string',
              description: 'Filter by state: public, staged, disabled, draft (default: all)',
            },
            app_id: {
              type: 'string',
              description: 'App ID to scope guides to a specific application',
            },
          },
        },
      },
      {
        name: 'get_guide',
        description: 'Get detailed configuration and step content for a specific Pendo in-app guide by guide ID',
        inputSchema: {
          type: 'object',
          properties: {
            guide_id: {
              type: 'string',
              description: 'Pendo guide ID',
            },
          },
          required: ['guide_id'],
        },
      },
      {
        name: 'run_aggregation',
        description: 'Run a custom aggregation query against Pendo data — supports visitor/account/page/feature/guide pipelines for advanced analytics',
        inputSchema: {
          type: 'object',
          properties: {
            pipeline: {
              type: 'string',
              description: 'JSON array string of Pendo aggregation pipeline stages (e.g. "[{\\"source\\":{\\"visitors\\":{}}},{\\"count\\":\\"numVisitors\\"}]")',
            },
          },
          required: ['pipeline'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_visitors':
          return this.listVisitors(args);
        case 'get_visitor':
          return this.getVisitor(args);
        case 'search_visitors':
          return this.searchVisitors(args);
        case 'list_accounts':
          return this.listAccounts(args);
        case 'get_account':
          return this.getAccount(args);
        case 'search_accounts':
          return this.searchAccounts(args);
        case 'list_pages':
          return this.listPages(args);
        case 'get_page':
          return this.getPage(args);
        case 'get_page_analytics':
          return this.getPageAnalytics(args);
        case 'list_features':
          return this.listFeatures(args);
        case 'get_feature':
          return this.getFeature(args);
        case 'get_feature_analytics':
          return this.getFeatureAnalytics(args);
        case 'list_guides':
          return this.listGuides(args);
        case 'get_guide':
          return this.getGuide(args);
        case 'run_aggregation':
          return this.runAggregation(args);
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
      'x-pendo-integration-key': this.integrationKey,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  private async apiGet(path: string, params: Record<string, string> = {}): Promise<ToolResult> {
    const qs = new URLSearchParams(params).toString();
    const url = `${this.baseUrl}${path}${qs ? '?' + qs : ''}`;
    const response = await this.fetchWithRetry(url, { method: 'GET', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apiPost(path: string, body: unknown): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listVisitors(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      limit: String((args.limit as number) ?? 50),
      offset: String((args.offset as number) ?? 0),
    };
    return this.apiGet('/api/v1/visitor', params);
  }

  private async getVisitor(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.visitor_id) return { content: [{ type: 'text', text: 'visitor_id is required' }], isError: true };
    return this.apiGet(`/api/v1/visitor/${encodeURIComponent(args.visitor_id as string)}`);
  }

  private async searchVisitors(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.filter) return { content: [{ type: 'text', text: 'filter is required' }], isError: true };
    const pipeline = [
      { source: { visitors: {} } },
      { filter: args.filter },
      { limit: { limit: (args.limit as number) ?? 50 } },
    ];
    return this.apiPost('/api/v1/aggregation', pipeline);
  }

  private async listAccounts(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      limit: String((args.limit as number) ?? 50),
      offset: String((args.offset as number) ?? 0),
    };
    return this.apiGet('/api/v1/account', params);
  }

  private async getAccount(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.account_id) return { content: [{ type: 'text', text: 'account_id is required' }], isError: true };
    return this.apiGet(`/api/v1/account/${encodeURIComponent(args.account_id as string)}`);
  }

  private async searchAccounts(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.filter) return { content: [{ type: 'text', text: 'filter is required' }], isError: true };
    const pipeline = [
      { source: { accounts: {} } },
      { filter: args.filter },
      { limit: { limit: (args.limit as number) ?? 50 } },
    ];
    return this.apiPost('/api/v1/aggregation', pipeline);
  }

  private async listPages(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (args.app_id) params.appId = args.app_id as string;
    return this.apiGet('/api/v1/page', params);
  }

  private async getPage(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.page_id) return { content: [{ type: 'text', text: 'page_id is required' }], isError: true };
    return this.apiGet(`/api/v1/page/${encodeURIComponent(args.page_id as string)}`);
  }

  private async getPageAnalytics(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.page_id) return { content: [{ type: 'text', text: 'page_id is required' }], isError: true };
    const params: Record<string, string> = {
      period: (args.period as string) ?? 'dayRange',
    };
    if (args.first) params.first = args.first as string;
    if (args.last) params.last = args.last as string;
    return this.apiGet(`/api/v1/page/${encodeURIComponent(args.page_id as string)}/numvisitors`, params);
  }

  private async listFeatures(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (args.app_id) params.appId = args.app_id as string;
    return this.apiGet('/api/v1/feature', params);
  }

  private async getFeature(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.feature_id) return { content: [{ type: 'text', text: 'feature_id is required' }], isError: true };
    return this.apiGet(`/api/v1/feature/${encodeURIComponent(args.feature_id as string)}`);
  }

  private async getFeatureAnalytics(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.feature_id) return { content: [{ type: 'text', text: 'feature_id is required' }], isError: true };
    const params: Record<string, string> = {
      period: (args.period as string) ?? 'dayRange',
    };
    if (args.first) params.first = args.first as string;
    if (args.last) params.last = args.last as string;
    return this.apiGet(`/api/v1/feature/${encodeURIComponent(args.feature_id as string)}/numclicks`, params);
  }

  private async listGuides(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (args.state) params.state = args.state as string;
    if (args.app_id) params.appId = args.app_id as string;
    return this.apiGet('/api/v1/guide', params);
  }

  private async getGuide(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.guide_id) return { content: [{ type: 'text', text: 'guide_id is required' }], isError: true };
    return this.apiGet(`/api/v1/guide/${encodeURIComponent(args.guide_id as string)}`);
  }

  private async runAggregation(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.pipeline) return { content: [{ type: 'text', text: 'pipeline is required' }], isError: true };
    let pipeline: unknown;
    try {
      pipeline = JSON.parse(args.pipeline as string);
    } catch {
      return { content: [{ type: 'text', text: 'pipeline must be a valid JSON array string' }], isError: true };
    }
    return this.apiPost('/api/v1/aggregation', pipeline);
  }
}

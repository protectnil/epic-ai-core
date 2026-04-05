/**
 * Google Analytics (GA4) MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/googleanalytics/google-analytics-mcp — transport: stdio, auth: OAuth2 / service account
// Published by: googleanalytics org (official Google). Last release: v0.2.0 (Mar 11, 2026). Maintained.
// MCP exposes 6 tools: get_account_summaries, get_property_details, list_google_ads_links,
//   run_report, get_custom_dimensions_and_metrics, run_realtime_report.
// Fails the 10+ tools criterion — does not meet full coverage threshold.
// Our adapter covers: 7 tools. Vendor MCP covers: 6 tools.
// Recommendation: use-rest-api — vendor MCP has only 6 tools and no batch/pivot/funnel/compatibility coverage.
//
// Base URL: https://analyticsdata.googleapis.com/v1beta (core reporting; runFunnelReport is v1alpha)
// Auth: Bearer token (OAuth2 access token or service account token) in Authorization header
// Docs: https://developers.google.com/analytics/devguides/reporting/data/v1
// Rate limits: 10 requests/second per property; 50,000 requests/day per project (default quota)
// NOTE: runFunnelReport uses v1alpha endpoint (POST /v1alpha/{property}:runFunnelReport), not v1beta.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface GoogleAnalyticsConfig {
  accessToken: string;
  baseUrl?: string;
}

export class GoogleAnalyticsMCPServer extends MCPAdapterBase {
  private readonly accessToken: string;
  private readonly baseUrl: string;
  private readonly alphaBaseUrl: string;

  constructor(config: GoogleAnalyticsConfig) {
    super();
    this.accessToken = config.accessToken;
    this.baseUrl = config.baseUrl || 'https://analyticsdata.googleapis.com/v1beta';
    this.alphaBaseUrl = 'https://analyticsdata.googleapis.com/v1alpha';
  }

  static catalog() {
    return {
      name: 'google-analytics',
      displayName: 'Google Analytics (GA4)',
      version: '1.0.0',
      category: 'misc',
      keywords: [
        'google', 'analytics', 'ga4', 'gtm', 'metrics', 'dimensions', 'sessions', 'users',
        'pageviews', 'events', 'conversions', 'bounce rate', 'engagement', 'traffic',
        'acquisition', 'retention', 'funnel', 'audience', 'reporting', 'realtime',
      ],
      toolNames: [
        'run_report', 'run_realtime_report', 'batch_run_reports',
        'run_pivot_report', 'get_metadata',
        'check_compatibility', 'run_funnel_report',
      ],
      description: 'Google Analytics GA4 reporting: run custom reports, real-time reports, pivot reports, funnel reports, and retrieve property metadata.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'run_report',
        description: 'Run a custom GA4 report for a property with dimensions, metrics, date ranges, and optional filters',
        inputSchema: {
          type: 'object',
          properties: {
            property_id: {
              type: 'string',
              description: 'GA4 property ID (numeric, e.g. 123456789)',
            },
            dimensions: {
              type: 'array',
              description: 'List of dimension names to include (e.g. ["date", "country", "sessionSource"])',
            },
            metrics: {
              type: 'array',
              description: 'List of metric names to include (e.g. ["sessions", "activeUsers", "screenPageViews"])',
            },
            date_ranges: {
              type: 'array',
              description: 'Date ranges as array of objects with startDate and endDate (e.g. [{"startDate":"30daysAgo","endDate":"today"}])',
            },
            dimension_filter: {
              type: 'object',
              description: 'Optional dimension filter expression object (see GA4 FilterExpression schema)',
            },
            metric_filter: {
              type: 'object',
              description: 'Optional metric filter expression object',
            },
            order_bys: {
              type: 'array',
              description: 'Optional sort order array (e.g. [{"metric":{"metricName":"sessions"},"desc":true}])',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of rows to return (default: 1000, max: 100000)',
            },
            offset: {
              type: 'number',
              description: 'Row offset for pagination (default: 0)',
            },
            keep_empty_rows: {
              type: 'boolean',
              description: 'Include rows with zero metric values (default: false)',
            },
          },
          required: ['property_id', 'dimensions', 'metrics', 'date_ranges'],
        },
      },
      {
        name: 'run_realtime_report',
        description: 'Run a real-time GA4 report showing users active in the last 30 minutes for a property',
        inputSchema: {
          type: 'object',
          properties: {
            property_id: {
              type: 'string',
              description: 'GA4 property ID (numeric)',
            },
            dimensions: {
              type: 'array',
              description: 'Realtime dimension names (e.g. ["country", "city", "unifiedScreenName"])',
            },
            metrics: {
              type: 'array',
              description: 'Realtime metric names (e.g. ["activeUsers", "screenPageViews"])',
            },
            dimension_filter: {
              type: 'object',
              description: 'Optional dimension filter expression object',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of rows to return (default: 1000)',
            },
          },
          required: ['property_id', 'dimensions', 'metrics'],
        },
      },
      {
        name: 'batch_run_reports',
        description: 'Run up to 5 GA4 reports in a single API call to reduce quota usage',
        inputSchema: {
          type: 'object',
          properties: {
            property_id: {
              type: 'string',
              description: 'GA4 property ID (numeric)',
            },
            requests: {
              type: 'array',
              description: 'Array of up to 5 report request objects, each with dimensions, metrics, and dateRanges fields',
            },
          },
          required: ['property_id', 'requests'],
        },
      },
      {
        name: 'run_pivot_report',
        description: 'Run a pivot table GA4 report to cross-tabulate dimensions against metrics',
        inputSchema: {
          type: 'object',
          properties: {
            property_id: {
              type: 'string',
              description: 'GA4 property ID (numeric)',
            },
            dimensions: {
              type: 'array',
              description: 'List of dimension names to include in the pivot report',
            },
            metrics: {
              type: 'array',
              description: 'List of metric names to include in the pivot report',
            },
            date_ranges: {
              type: 'array',
              description: 'Date ranges array with startDate and endDate',
            },
            pivots: {
              type: 'array',
              description: 'Pivot specifications — each defines fieldNames, limit, and optional orderBys',
            },
          },
          required: ['property_id', 'dimensions', 'metrics', 'date_ranges', 'pivots'],
        },
      },
      {
        name: 'get_metadata',
        description: 'Get available dimensions and metrics for a GA4 property, including custom dimensions and metrics',
        inputSchema: {
          type: 'object',
          properties: {
            property_id: {
              type: 'string',
              description: 'GA4 property ID (numeric). Use "0" for universal metadata (no custom dimensions).',
            },
          },
          required: ['property_id'],
        },
      },
      {
        name: 'check_compatibility',
        description: 'Check which dimensions and metrics are compatible with each other for a GA4 report',
        inputSchema: {
          type: 'object',
          properties: {
            property_id: {
              type: 'string',
              description: 'GA4 property ID (numeric)',
            },
            dimensions: {
              type: 'array',
              description: 'List of dimension names to check compatibility for',
            },
            metrics: {
              type: 'array',
              description: 'List of metric names to check compatibility for',
            },
          },
          required: ['property_id'],
        },
      },
      {
        name: 'run_funnel_report',
        description: 'Run a funnel report to analyze step-by-step user progression through a defined sequence of events',
        inputSchema: {
          type: 'object',
          properties: {
            property_id: {
              type: 'string',
              description: 'GA4 property ID (numeric)',
            },
            date_ranges: {
              type: 'array',
              description: 'Date ranges array with startDate and endDate',
            },
            funnel_steps: {
              type: 'array',
              description: 'Array of funnel step objects, each with a name and filterExpression defining the step condition',
            },
            funnel_breakdown_dimension: {
              type: 'object',
              description: 'Optional dimension to use for funnel breakdown (e.g. {"dimensionName":"deviceCategory"})',
            },
            segment: {
              type: 'object',
              description: 'Optional segment to filter funnel data by user or session conditions',
            },
          },
          required: ['property_id', 'date_ranges', 'funnel_steps'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'run_report':
          return this.runReport(args);
        case 'run_realtime_report':
          return this.runRealtimeReport(args);
        case 'batch_run_reports':
          return this.batchRunReports(args);
        case 'run_pivot_report':
          return this.runPivotReport(args);
        case 'get_metadata':
          return this.getMetadata(args);
        case 'check_compatibility':
          return this.checkCompatibility(args);
        case 'run_funnel_report':
          return this.runFunnelReport(args);
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
      Authorization: `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
    };
  }

  private async gaPost(path: string, body: Record<string, unknown>, useAlpha = false): Promise<ToolResult> {
    const base = useAlpha ? this.alphaBaseUrl : this.baseUrl;
    const response = await this.fetchWithRetry(`${base}${path}`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `API error: ${response.status} ${errText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async gaGet(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'GET',
      headers: this.headers,
    });
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `API error: ${response.status} ${errText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private buildDimensions(dimensions: unknown): Array<{ name: string }> {
    if (!Array.isArray(dimensions)) return [];
    return dimensions.map((d) => (typeof d === 'string' ? { name: d } : d as { name: string }));
  }

  private buildMetrics(metrics: unknown): Array<{ name: string }> {
    if (!Array.isArray(metrics)) return [];
    return metrics.map((m) => (typeof m === 'string' ? { name: m } : m as { name: string }));
  }

  private async runReport(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.property_id || !args.dimensions || !args.metrics || !args.date_ranges) {
      return { content: [{ type: 'text', text: 'property_id, dimensions, metrics, and date_ranges are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      dimensions: this.buildDimensions(args.dimensions),
      metrics: this.buildMetrics(args.metrics),
      dateRanges: args.date_ranges,
      limit: (args.limit as number) || 1000,
    };
    if (args.offset) body.offset = args.offset;
    if (args.dimension_filter) body.dimensionFilter = args.dimension_filter;
    if (args.metric_filter) body.metricFilter = args.metric_filter;
    if (args.order_bys) body.orderBys = args.order_bys;
    if (typeof args.keep_empty_rows === 'boolean') body.keepEmptyRows = args.keep_empty_rows;
    return this.gaPost(`/properties/${encodeURIComponent(args.property_id as string)}:runReport`, body);
  }

  private async runRealtimeReport(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.property_id || !args.dimensions || !args.metrics) {
      return { content: [{ type: 'text', text: 'property_id, dimensions, and metrics are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      dimensions: this.buildDimensions(args.dimensions),
      metrics: this.buildMetrics(args.metrics),
      limit: (args.limit as number) || 1000,
    };
    if (args.dimension_filter) body.dimensionFilter = args.dimension_filter;
    return this.gaPost(`/properties/${encodeURIComponent(args.property_id as string)}:runRealtimeReport`, body);
  }

  private async batchRunReports(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.property_id || !args.requests) {
      return { content: [{ type: 'text', text: 'property_id and requests are required' }], isError: true };
    }
    const requests = args.requests as Array<Record<string, unknown>>;
    if (requests.length > 5) {
      return { content: [{ type: 'text', text: 'batch_run_reports accepts a maximum of 5 requests per call' }], isError: true };
    }
    return this.gaPost(`/properties/${encodeURIComponent(args.property_id as string)}:batchRunReports`, { requests });
  }

  private async runPivotReport(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.property_id || !args.dimensions || !args.metrics || !args.date_ranges || !args.pivots) {
      return { content: [{ type: 'text', text: 'property_id, dimensions, metrics, date_ranges, and pivots are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      dimensions: this.buildDimensions(args.dimensions),
      metrics: this.buildMetrics(args.metrics),
      dateRanges: args.date_ranges,
      pivots: args.pivots,
    };
    if (args.dimension_filter) body.dimensionFilter = args.dimension_filter;
    return this.gaPost(`/properties/${encodeURIComponent(args.property_id as string)}:runPivotReport`, body);
  }

  private async getMetadata(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.property_id) return { content: [{ type: 'text', text: 'property_id is required' }], isError: true };
    return this.gaGet(`/properties/${encodeURIComponent(args.property_id as string)}/metadata`);
  }

  private async checkCompatibility(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.property_id) return { content: [{ type: 'text', text: 'property_id is required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.dimensions) body.dimensions = this.buildDimensions(args.dimensions);
    if (args.metrics) body.metrics = this.buildMetrics(args.metrics);
    return this.gaPost(`/properties/${encodeURIComponent(args.property_id as string)}:checkCompatibility`, body);
  }

  private async runFunnelReport(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.property_id || !args.date_ranges || !args.funnel_steps) {
      return { content: [{ type: 'text', text: 'property_id, date_ranges, and funnel_steps are required' }], isError: true };
    }
    const steps = args.funnel_steps as Array<Record<string, unknown>>;
    const body: Record<string, unknown> = {
      dateRanges: args.date_ranges,
      funnel: { steps },
    };
    if (args.funnel_breakdown_dimension) body.funnelBreakdown = { breakdownDimension: args.funnel_breakdown_dimension };
    if (args.segment) body.userSegment = args.segment;
    // runFunnelReport is a v1alpha endpoint, not v1beta
    return this.gaPost(`/properties/${encodeURIComponent(args.property_id as string)}:runFunnelReport`, body, true);
  }
}

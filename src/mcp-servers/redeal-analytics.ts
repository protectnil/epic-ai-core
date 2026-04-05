/**
 * Redeal Analytics MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found — no official vendor MCP server exists.
// Our adapter covers: 4 tools for event analytics, filtering by company, site, deal, and event type.
// Recommendation: Use this adapter. No community MCP servers available.
//
// Base URL: https://analytics.redeal.io/api/1.0.0
// Auth: None specified in spec (unauthenticated or handled upstream)
// Docs: https://analytics.redeal.io
// Analytics API: Retrieve event analytics data for Redeal deals, sites, and companies.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface RedealAnalyticsConfig {
  /** Optional base URL override (default: https://analytics.redeal.io/api/1.0.0) */
  baseUrl?: string;
  /** Optional Bearer token if required by the deployment */
  apiKey?: string;
}

export class RedealAnalyticsMCPServer extends MCPAdapterBase {
  private readonly baseUrl: string;
  private readonly apiKey?: string;

  constructor(config: RedealAnalyticsConfig = {}) {
    super();
    this.baseUrl = config.baseUrl ?? 'https://analytics.redeal.io/api/1.0.0';
    this.apiKey = config.apiKey;
  }

  static catalog() {
    return {
      name: 'redeal-analytics',
      displayName: 'Redeal Analytics',
      version: '1.0.0',
      category: 'analytics',
      keywords: [
        'redeal', 'analytics', 'events', 'deals', 'real estate', 'site',
        'company', 'metrics', 'tracking', 'event type', 'reporting',
        'pageview', 'engagement', 'conversion', 'property',
      ],
      toolNames: [
        'get_events',
        'get_events_by_company',
        'get_events_by_deal',
        'get_events_by_site',
      ],
      description: 'Retrieve Redeal analytics event data filtered by company, site, deal, or event type — supports pagination via next token and execution ID.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'get_events',
        description: 'Retrieve analytics events from Redeal — optionally filter by company, site, deal, or event type; supports pagination',
        inputSchema: {
          type: 'object',
          properties: {
            company: {
              type: 'string',
              description: 'Company ID to filter events by (optional)',
            },
            site: {
              type: 'string',
              description: 'Site ID to filter events by (optional)',
            },
            deal: {
              type: 'string',
              description: 'Deal ID to filter events by (optional)',
            },
            type: {
              type: 'string',
              description: 'Type of event records to return (e.g. "pageview", "engagement", "conversion") (optional)',
            },
            nexttoken: {
              type: 'string',
              description: 'Pagination token from a previous response to fetch the next page of results (optional)',
            },
            queryexecutionid: {
              type: 'string',
              description: 'Execution ID from a previous response to continue fetching results (optional)',
            },
          },
        },
      },
      {
        name: 'get_events_by_company',
        description: 'Retrieve all analytics events for a specific company ID — convenience wrapper around get_events filtered by company',
        inputSchema: {
          type: 'object',
          properties: {
            company: {
              type: 'string',
              description: 'Company ID to retrieve analytics events for',
            },
            type: {
              type: 'string',
              description: 'Optional event type filter (e.g. "pageview", "engagement")',
            },
            nexttoken: {
              type: 'string',
              description: 'Pagination token for next page (optional)',
            },
            queryexecutionid: {
              type: 'string',
              description: 'Execution ID for continued pagination (optional)',
            },
          },
          required: ['company'],
        },
      },
      {
        name: 'get_events_by_deal',
        description: 'Retrieve all analytics events for a specific deal ID — useful for tracking engagement and conversions on a single deal',
        inputSchema: {
          type: 'object',
          properties: {
            deal: {
              type: 'string',
              description: 'Deal ID to retrieve analytics events for',
            },
            type: {
              type: 'string',
              description: 'Optional event type filter (e.g. "pageview", "conversion")',
            },
            nexttoken: {
              type: 'string',
              description: 'Pagination token for next page (optional)',
            },
            queryexecutionid: {
              type: 'string',
              description: 'Execution ID for continued pagination (optional)',
            },
          },
          required: ['deal'],
        },
      },
      {
        name: 'get_events_by_site',
        description: 'Retrieve all analytics events for a specific site ID — useful for site-level traffic and engagement analysis',
        inputSchema: {
          type: 'object',
          properties: {
            site: {
              type: 'string',
              description: 'Site ID to retrieve analytics events for',
            },
            type: {
              type: 'string',
              description: 'Optional event type filter',
            },
            nexttoken: {
              type: 'string',
              description: 'Pagination token for next page (optional)',
            },
            queryexecutionid: {
              type: 'string',
              description: 'Execution ID for continued pagination (optional)',
            },
          },
          required: ['site'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'get_events':
          return this.getEvents(args);
        case 'get_events_by_company':
          return this.getEvents(args);
        case 'get_events_by_deal':
          return this.getEvents(args);
        case 'get_events_by_site':
          return this.getEvents(args);
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

  private async getEvents(args: Record<string, unknown>): Promise<ToolResult> {
    const qs = new URLSearchParams();
    const stringFields = ['company', 'site', 'deal', 'type', 'nexttoken', 'queryexecutionid'] as const;
    for (const field of stringFields) {
      if (args[field]) qs.set(field, args[field] as string);
    }
    const url = `${this.baseUrl}/events${qs.toString() ? '?' + qs.toString() : ''}`;
    const headers: Record<string, string> = { 'Accept': 'application/json' };
    if (this.apiKey) headers['Authorization'] = `Bearer ${this.apiKey}`;
    const response = await this.fetchWithRetry(url, { method: 'GET', headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Redeal returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }
}

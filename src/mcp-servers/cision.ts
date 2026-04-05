/**
 * Cision MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// No official Cision MCP server was found on GitHub, npm, or Cision developer docs as of 2026-03-28.
//
// Base URL: https://api.cision.one
// Auth: Static API token passed as X-Auth-Token header. Token is generated in the CisionOne Admin UI
//   (Administration > API Clients). There is no programmatic login endpoint — the token is a
//   long-lived static key provisioned by the platform administrator.
// Docs: https://developers.cision.one/docs/api/v2
// Rate limits: 10 requests/minute (1 request every 6 seconds) across all endpoints; 429 on breach
//
// NOTE: The CisionOne v2 public API exposes exactly 3 endpoints:
//   GET /public/api/v2/streams                    — list org's Mention Streams
//   GET /public/api/v2/mentions/{streamId}        — list mentions for a stream
//   GET /public/api/v2/streams/{streamId}/stats   — get aggregated stream statistics
//
// Our adapter covers: 3 tools (full public API coverage). Vendor MCP covers: 0 tools (no MCP server).
// Recommendation: use-rest-api — this adapter provides complete coverage of the published v2 API.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface CisionConfig {
  /** Static API token from CisionOne Admin UI (Administration > API Clients). */
  apiToken: string;
  baseUrl?: string;
}

export class CisionMCPServer extends MCPAdapterBase {
  private readonly apiToken: string;
  private readonly baseUrl: string;

  constructor(config: CisionConfig) {
    super();
    this.apiToken = config.apiToken;
    this.baseUrl = config.baseUrl || 'https://api.cision.one';
  }

  static catalog() {
    return {
      name: 'cision',
      displayName: 'Cision',
      version: '1.0.0',
      category: 'misc',
      keywords: [
        'cision', 'pr', 'public relations', 'media monitoring', 'media intelligence',
        'mention', 'coverage', 'earned media', 'brand monitoring', 'cisionone',
        'mention stream', 'media analytics', 'communication', 'reputation',
      ],
      toolNames: [
        'list_mention_streams',
        'list_mentions',
        'get_mention_stream_summary',
      ],
      description: 'Cision PR and media intelligence: list Mention Streams, retrieve media mentions from a stream, and get aggregated stream analytics.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_mention_streams',
        description: 'List all Mention Streams (media monitoring searches) configured in the Cision account; returns stream IDs and names',
        inputSchema: {
          type: 'object',
          properties: {
            format: {
              type: 'string',
              description: 'Response format: json or csv (default: json)',
            },
          },
        },
      },
      {
        name: 'list_mentions',
        description: 'List media mentions for a specific Mention Stream with optional date range filters; returns mention content, outlet, and metadata',
        inputSchema: {
          type: 'object',
          properties: {
            streamId: {
              type: 'string',
              description: 'Mention Stream ID to retrieve mentions from',
            },
            startDate: {
              type: 'string',
              description: 'Start of date range (ISO 8601 datetime, e.g. 2026-01-01T00:00:00Z)',
            },
            endDate: {
              type: 'string',
              description: 'End of date range (ISO 8601 datetime)',
            },
            format: {
              type: 'string',
              description: 'Response format: json or csv (default: json)',
            },
          },
          required: ['streamId', 'startDate', 'endDate', 'format'],
        },
      },
      {
        name: 'get_mention_stream_summary',
        description: 'Get aggregated analytics summary for a Mention Stream including volume, sentiment, and top outlets for a given date range',
        inputSchema: {
          type: 'object',
          properties: {
            streamId: {
              type: 'string',
              description: 'Mention Stream ID',
            },
            startDate: {
              type: 'string',
              description: 'Start date for analytics period (ISO 8601 datetime)',
            },
            endDate: {
              type: 'string',
              description: 'End date for analytics period (ISO 8601 datetime)',
            },
            format: {
              type: 'string',
              description: 'Response format: json or csv (default: json)',
            },
          },
          required: ['streamId', 'startDate', 'endDate', 'format'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_mention_streams':
          return this.listMentionStreams(args);
        case 'list_mentions':
          return this.listMentions(args);
        case 'get_mention_stream_summary':
          return this.getMentionStreamSummary(args);
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

  private authHeaders(): Record<string, string> {
    return { 'X-Auth-Token': this.apiToken, 'Content-Type': 'application/json' };
  }

  private async cisionGet(path: string, params: Record<string, string> = {}): Promise<ToolResult> {
    const headers = this.authHeaders();
    const qs = new URLSearchParams(params).toString();
    const url = `${this.baseUrl}${path}${qs ? '?' + qs : ''}`;
    const response = await this.fetchWithRetry(url, { method: 'GET', headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Cision returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listMentionStreams(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (args.format) params.format = args.format as string;
    return this.cisionGet('/public/api/v2/streams', params);
  }

  private async listMentions(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.streamId) return { content: [{ type: 'text', text: 'streamId is required' }], isError: true };
    if (!args.startDate) return { content: [{ type: 'text', text: 'startDate is required' }], isError: true };
    if (!args.endDate) return { content: [{ type: 'text', text: 'endDate is required' }], isError: true };
    if (!args.format) return { content: [{ type: 'text', text: 'format is required (json or csv)' }], isError: true };
    const params: Record<string, string> = {
      startDate: args.startDate as string,
      endDate: args.endDate as string,
      format: args.format as string,
    };
    return this.cisionGet(`/public/api/v2/mentions/${encodeURIComponent(args.streamId as string)}`, params);
  }

  private async getMentionStreamSummary(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.streamId) return { content: [{ type: 'text', text: 'streamId is required' }], isError: true };
    if (!args.startDate) return { content: [{ type: 'text', text: 'startDate is required' }], isError: true };
    if (!args.endDate) return { content: [{ type: 'text', text: 'endDate is required' }], isError: true };
    if (!args.format) return { content: [{ type: 'text', text: 'format is required (json or csv)' }], isError: true };
    const params: Record<string, string> = {
      startDate: args.startDate as string,
      endDate: args.endDate as string,
      format: args.format as string,
    };
    return this.cisionGet(`/public/api/v2/streams/${encodeURIComponent(args.streamId as string)}/stats`, params);
  }
}

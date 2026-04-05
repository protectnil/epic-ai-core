/**
 * Hotjar MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// No official Hotjar MCP server found. A community-only server (github.com/yasin749/hotjar-mcp-server)
// exists but is not published by Hotjar, covers only 3 survey tools, and is NOT official.
// Our adapter covers: 3 tools. Vendor MCP covers: 0 tools (official).
// Recommendation: use-rest-api — no qualifying official MCP exists.
//
// IMPORTANT: The Hotjar public REST API is intentionally limited. Per official docs, it exposes ONLY:
//   - Survey list and fetch
//   - Survey responses (export)
//   - User lookup and deletion (GDPR)
// Heatmaps, recordings, funnels, and events are NOT available via the public REST API.
// All previously defined tools for those features have been removed as fabricated.
//
// Base URL: https://api.hotjar.io/v1  (NOTE: api.hotjar.io — NOT api.hotjar.com)
// Auth: OAuth2 client credentials flow — POST https://api.hotjar.io/v1/oauth/token
//   with grant_type=client_credentials, client_id, client_secret (form-encoded).
//   Returns Bearer access token (expires_in: 3600 seconds).
// Docs: https://help.hotjar.com/hc/en-us/articles/36820005914001-Hotjar-API-Reference
// Rate limits: Not documented (responds 429 on breach)

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface HotjarConfig {
  clientId: string;
  clientSecret: string;
  baseUrl?: string;
  tokenUrl?: string;
}

export class HotjarMCPServer extends MCPAdapterBase {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly baseUrl: string;
  private readonly tokenUrl: string;
  private bearerToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(config: HotjarConfig) {
    super();
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.baseUrl = config.baseUrl ?? 'https://api.hotjar.io/v1';
    this.tokenUrl = config.tokenUrl ?? 'https://api.hotjar.io/v1/oauth/token';
  }

  static catalog() {
    return {
      name: 'hotjar',
      displayName: 'Hotjar',
      version: '1.0.0',
      category: 'misc' as const,
      keywords: [
        'hotjar', 'heatmap', 'session recording', 'replay', 'survey', 'feedback',
        'funnel', 'behavior analytics', 'ux', 'user research', 'click map',
        'scroll map', 'rage click', 'conversion',
      ],
      toolNames: [
        'list_surveys',
        'get_survey',
        'list_survey_responses',
      ],
      description: 'Hotjar surveys: list surveys for a site, retrieve individual survey details and questions, export survey responses.',
      author: 'protectnil' as const,
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_surveys',
        description: 'List surveys for a Hotjar site with optional pagination — returns survey IDs, names, types, and enabled status',
        inputSchema: {
          type: 'object',
          properties: {
            site_id: {
              type: 'number',
              description: 'Numeric Hotjar site ID',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of surveys to return (default: 20, max: 100)',
            },
            cursor: {
              type: 'string',
              description: 'Cursor for pagination from a previous response next_cursor field',
            },
          },
          required: ['site_id'],
        },
      },
      {
        name: 'get_survey',
        description: 'Get configuration and statistics for a specific Hotjar survey including question count and response rate',
        inputSchema: {
          type: 'object',
          properties: {
            site_id: {
              type: 'number',
              description: 'Numeric Hotjar site ID',
            },
            survey_id: {
              type: 'number',
              description: 'Numeric survey ID',
            },
          },
          required: ['site_id', 'survey_id'],
        },
      },
      {
        name: 'list_survey_responses',
        description: 'Export individual responses for a Hotjar survey sorted by creation date descending with pagination',
        inputSchema: {
          type: 'object',
          properties: {
            site_id: {
              type: 'number',
              description: 'Numeric Hotjar site ID',
            },
            survey_id: {
              type: 'number',
              description: 'Numeric survey ID',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of responses to return (default: 20, max: 100)',
            },
            cursor: {
              type: 'string',
              description: 'Cursor for pagination from a previous response next_cursor field',
            },
          },
          required: ['site_id', 'survey_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_surveys': return this.listSurveys(args);
        case 'get_survey': return this.getSurvey(args);
        case 'list_survey_responses': return this.listSurveyResponses(args);
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

  private async getOrRefreshToken(): Promise<string> {
    const now = Date.now();
    if (this.bearerToken && this.tokenExpiry > now) return this.bearerToken;
    const response = await this.fetchWithRetry(this.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: this.clientId,
        client_secret: this.clientSecret,
      }).toString(),
    });
    if (!response.ok) throw new Error(`OAuth2 token request failed: ${response.status} ${response.statusText}`);
    const data = await response.json() as { access_token: string; expires_in: number };
    this.bearerToken = data.access_token;
    this.tokenExpiry = now + (data.expires_in - 60) * 1000;
    return this.bearerToken;
  }

  private async apiGet(path: string, params?: Record<string, string>): Promise<ToolResult> {
    const token = await this.getOrRefreshToken();
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}${qs}`, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listSurveys(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.site_id) return { content: [{ type: 'text', text: 'site_id is required' }], isError: true };
    const params: Record<string, string> = { limit: String((args.limit as number) ?? 20) };
    if (args.cursor) params.cursor = args.cursor as string;
    return this.apiGet(`/sites/${encodeURIComponent(args.site_id as string)}/surveys`, params);
  }

  private async getSurvey(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.site_id || !args.survey_id) {
      return { content: [{ type: 'text', text: 'site_id and survey_id are required' }], isError: true };
    }
    return this.apiGet(`/sites/${encodeURIComponent(args.site_id as string)}/surveys/${encodeURIComponent(args.survey_id as string)}`);
  }

  private async listSurveyResponses(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.site_id || !args.survey_id) {
      return { content: [{ type: 'text', text: 'site_id and survey_id are required' }], isError: true };
    }
    const params: Record<string, string> = { limit: String((args.limit as number) ?? 20) };
    if (args.cursor) params.cursor = args.cursor as string;
    return this.apiGet(`/sites/${encodeURIComponent(args.site_id as string)}/surveys/${encodeURIComponent(args.survey_id as string)}/responses`, params);
  }

}

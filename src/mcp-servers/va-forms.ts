/**
 * VA Forms MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// No official VA Forms MCP server was found on GitHub or developer.va.gov.
//
// Base URL: https://api.va.gov/services/va_forms/v0
// Auth: API key passed as HTTP header `apikey` on every request
// Docs: https://developer.va.gov/explore/api/va-forms
// Rate limits: Reduced limit in sandbox; production limits not published — standard VA Lighthouse throttling (429 on excess)

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface VAFormsConfig {
  apiKey: string;
  /** Optional base URL override (default: https://api.va.gov/services/va_forms/v0) */
  baseUrl?: string;
}

export class VAFormsMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: VAFormsConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? 'https://api.va.gov/services/va_forms/v0';
  }

  static catalog() {
    return {
      name: 'va-forms',
      displayName: 'VA Forms',
      version: '1.0.0',
      category: 'government',
      keywords: [
        'va', 'veterans affairs', 'va forms', 'government', 'veteran', 'pdf',
        'benefits', 'health care', 'claim', 'form', 'disability', 'pension',
        'education', 'compensation', 'military', 'federal',
      ],
      toolNames: [
        'list_forms',
        'get_form',
      ],
      description: 'Search and retrieve VA forms with PDF links, metadata, revision dates, and SHA256 checksums for version tracking.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_forms',
        description: 'Search all available VA forms by form number, keyword, or title — returns PDF links, metadata, revision dates, and validity status',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Optional search query to filter forms by form number or title (e.g. "10-10EZ", "health care", "disability")',
            },
          },
        },
      },
      {
        name: 'get_form',
        description: 'Get full details and complete revision history for a specific VA form by its form name, including SHA256 checksums for each version',
        inputSchema: {
          type: 'object',
          properties: {
            form_name: {
              type: 'string',
              description: 'The exact VA form name including prefix and hyphens (e.g. "10-10EZ", "21-526EZ", "22-1990")',
            },
          },
          required: ['form_name'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_forms':
          return this.listForms(args);
        case 'get_form':
          return this.getForm(args);
        default:
          return {
            content: [{ type: 'text', text: `Unknown tool: ${name}` }],
            isError: true,
          };
      }
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Tool execution failed: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true,
      };
    }
  }

  private async request(path: string, params?: Record<string, string>): Promise<ToolResult> {
    const url = new URL(`${this.baseUrl}${path}`);
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        url.searchParams.set(k, v);
      }
    }

    const response = await this.fetchWithRetry(url.toString(), {
      headers: {
        'apikey': this.apiKey,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }

    const data = await response.json();
    return {
      content: [{ type: 'text', text: this.truncate(data) }],
      isError: false,
    };
  }

  private async listForms(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (args.query) {
      params.query = args.query as string;
    }
    return this.request('/forms', Object.keys(params).length > 0 ? params : undefined);
  }

  private async getForm(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.form_name) {
      return {
        content: [{ type: 'text', text: 'form_name is required' }],
        isError: true,
      };
    }
    const formName = encodeURIComponent(args.form_name as string);
    return this.request(`/forms/${formName}`);
  }
}

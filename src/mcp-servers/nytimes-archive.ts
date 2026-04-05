/**
 * NYTimes Archive MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// No official vendor MCP available.
// Base URL: https://api.nytimes.com/svc/archive/v1
// Auth: api-key query parameter appended to every request URL
// Docs: https://developer.nytimes.com/docs/archive-product/1/overview
// Rate limits: 10 requests/minute, 4000 requests/day
// Coverage: All NYT articles by month going back to January 1851

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface NYTimesArchiveConfig {
  apiKey: string;
  baseUrl?: string;
}

export class NYTimesArchiveMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: NYTimesArchiveConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.nytimes.com/svc/archive/v1';
  }

  static catalog() {
    return {
      name: 'nytimes-archive',
      displayName: 'NYTimes Archive',
      version: '1.0.0',
      category: 'media',
      keywords: [
        'new york times', 'nytimes', 'nyt', 'newspaper', 'news', 'archive',
        'historical news', 'journalism', 'media', 'press', 'monthly archive',
        'article metadata', 'history', '1851', 'publication', 'editorial',
        'news database', 'article list', 'monthly articles',
      ],
      toolNames: [
        'get_monthly_archive',
      ],
      description: 'Retrieve all New York Times articles published in a given month, going back to January 1851. Returns article metadata including headlines, abstracts, bylines, publication dates, web URLs, and multimedia information. Useful for building local databases of NYT article metadata.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'get_monthly_archive',
        description: 'Get all New York Times articles published in a specific year and month, going back to January 1851. Returns full article metadata: headlines, abstracts, bylines, pub dates, web URLs, document type, section, and multimedia links.',
        inputSchema: {
          type: 'object',
          properties: {
            year: {
              type: 'integer',
              description: 'The year to retrieve articles for (e.g. 2024). Valid range: 1851–2030.',
              minimum: 1851,
              maximum: 2030,
            },
            month: {
              type: 'integer',
              description: 'The month number to retrieve articles for (1 = January, 12 = December). Valid range: 1–12.',
              minimum: 1,
              maximum: 12,
            },
          },
          required: ['year', 'month'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'get_monthly_archive': return this.getMonthlyArchive(args);
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

  // ── Private helpers ────────────────────────────────────────────────────────

  private async getMonthlyArchive(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.year == null) {
      return { content: [{ type: 'text', text: 'year is required' }], isError: true };
    }
    if (args.month == null) {
      return { content: [{ type: 'text', text: 'month is required' }], isError: true };
    }

    const year  = Number(args.year);
    const month = Number(args.month);

    if (!Number.isInteger(year) || year < 1851 || year > 2030) {
      return { content: [{ type: 'text', text: 'year must be an integer between 1851 and 2030' }], isError: true };
    }
    if (!Number.isInteger(month) || month < 1 || month > 12) {
      return { content: [{ type: 'text', text: 'month must be an integer between 1 and 12' }], isError: true };
    }

    const url = `${this.baseUrl}/${year}/${month}.json?api-key=${this.apiKey}`;
    const response = await this.fetchWithRetry(url, {});

    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }

    const data = await response.json() as Record<string, unknown>;

    if ((data as Record<string, unknown>).fault) {
      const fault = (data as Record<string, unknown>).fault as Record<string, unknown>;
      return {
        content: [{ type: 'text', text: `NYTimes API error: ${JSON.stringify(fault)}` }],
        isError: true,
      };
    }

    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }
}

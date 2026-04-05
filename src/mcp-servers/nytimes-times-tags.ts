/**
 * NYTimes Times Newswire MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03.
// No official New York Times MCP server was found on GitHub.
//
// Base URL: https://api.nytimes.com/svc/news/v3
// Auth: API key passed as query parameter `api-key`
//       Register at https://developer.nytimes.com/signup
// Docs: https://developer.nytimes.com/docs/timeswire-product/1/overview
// Rate limits: 500 requests/day, 5 requests/minute per API key.
// Spec: https://api.apis.guru/v2/specs/nytimes.com/timeswire/3.0.0/openapi.json

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface NYTimesTimesWireConfig {
  apiKey: string;
  baseUrl?: string;
}

export class NYTimesTimesTagsMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: NYTimesTimesWireConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? 'https://api.nytimes.com/svc/news/v3';
  }

  static catalog() {
    return {
      name: 'nytimes-times-tags',
      displayName: 'NYTimes Times Newswire',
      version: '1.0.0',
      category: 'media' as const,
      keywords: [
        'nytimes', 'new york times', 'news', 'newswire', 'articles', 'journalism',
        'media', 'content', 'section', 'wire', 'published', 'breaking news',
        'open data', 'nyt',
      ],
      toolNames: [
        'get_content_by_url',
        'list_content_by_source_section',
        'list_content_by_source_section_timeperiod',
      ],
      description:
        'Access the NYTimes Times Newswire API to retrieve links and metadata for New York Times articles and blog ' +
        'posts as soon as they are published. Filter by source, section, and time period.',
      author: 'protectnil' as const,
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'get_content_by_url',
        description:
          'Retrieve NYTimes article metadata and content details for a specific article by its full URL. ' +
          'Returns title, abstract, section, byline, multimedia, and related URLs.',
        inputSchema: {
          type: 'object',
          properties: {
            url: {
              type: 'string',
              description:
                'The complete URL of the NYTimes article or blog post to retrieve (e.g. ' +
                'https://www.nytimes.com/2026/03/28/technology/ai-news.html).',
            },
          },
          required: ['url'],
        },
      },
      {
        name: 'list_content_by_source_section',
        description:
          'List the most recently published NYTimes articles filtered by originating source and section. ' +
          'Supports pagination via limit and offset. Returns up to 20 results per request.',
        inputSchema: {
          type: 'object',
          properties: {
            source: {
              type: 'string',
              description:
                'Originating source of the content. Use "all" for both NYT and INYT, "nyt" for New York Times ' +
                'only, or "iht" for International New York Times only.',
              enum: ['all', 'nyt', 'iht'],
            },
            section: {
              type: 'string',
              description:
                'Section name to filter articles. Use "all" for all sections, or a specific section name ' +
                '(e.g. technology, sports, politics, business, arts). Separate multiple sections with semicolons.',
            },
            limit: {
              type: 'number',
              description: 'Number of results to return (1–20, default: 20).',
            },
            offset: {
              type: 'number',
              description: 'Starting point of the result set for pagination (default: 0).',
            },
          },
          required: ['source', 'section'],
        },
      },
      {
        name: 'list_content_by_source_section_timeperiod',
        description:
          'List recently published NYTimes articles filtered by source, section, and a rolling time window ' +
          'specified in hours. Useful for fetching breaking news within the last N hours.',
        inputSchema: {
          type: 'object',
          properties: {
            source: {
              type: 'string',
              description:
                'Originating source of the content. Use "all" for both NYT and INYT, "nyt" for New York Times ' +
                'only, or "iht" for International New York Times only.',
              enum: ['all', 'nyt', 'iht'],
            },
            section: {
              type: 'string',
              description:
                'Section name to filter articles. Use "all" for all sections, or a specific section name ' +
                '(e.g. technology, sports, politics, business, arts).',
            },
            time_period: {
              type: 'number',
              description:
                'Number of hours back from the current time to include articles. For example, 24 returns ' +
                'articles published in the last 24 hours.',
            },
            limit: {
              type: 'number',
              description: 'Number of results to return (1–20, default: 20).',
            },
            offset: {
              type: 'number',
              description: 'Starting point of the result set for pagination (default: 0).',
            },
          },
          required: ['source', 'section', 'time_period'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'get_content_by_url':
          return await this.getContentByUrl(args);
        case 'list_content_by_source_section':
          return await this.listContentBySourceSection(args);
        case 'list_content_by_source_section_timeperiod':
          return await this.listContentBySourceSectionTimeperiod(args);
        default:
          return {
            content: [{ type: 'text', text: `Unknown tool: ${name}` }],
            isError: true,
          };
      }
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Tool execution failed: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }

  private async request(path: string, params?: URLSearchParams): Promise<ToolResult> {
    const qp = new URLSearchParams(params);
    qp.set('api-key', this.apiKey);
    const qs = `?${qp.toString()}`;

    const response = await this.fetchWithRetry(`${this.baseUrl}${path}${qs}`, { method: 'GET' });

    if (!response.ok) {
      let errText = '';
      try { errText = await response.text(); } catch { /* ignore */ }
      return {
        content: [
          {
            type: 'text',
            text: `NYTimes API error ${response.status} ${response.statusText}: ${errText}`,
          },
        ],
        isError: true,
      };
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      const txt = await response.text().catch(() => '');
      return {
        content: [{ type: 'text', text: this.truncate(txt || JSON.stringify({ status: response.status })) }],
        isError: false,
      };
    }

    return {
      content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }],
      isError: false,
    };
  }

  private async getContentByUrl(args: Record<string, unknown>): Promise<ToolResult> {
    const url = args.url as string;
    if (!url) {
      return {
        content: [{ type: 'text', text: 'url is required' }],
        isError: true,
      };
    }
    const params = new URLSearchParams({ url });
    return this.request('/content.json', params);
  }

  private async listContentBySourceSection(args: Record<string, unknown>): Promise<ToolResult> {
    const source = args.source as string;
    const section = args.section as string;
    if (!source || !section) {
      return {
        content: [{ type: 'text', text: 'source and section are required' }],
        isError: true,
      };
    }
    const params = new URLSearchParams();
    if (args.limit) params.set('limit', String(args.limit as number));
    if (args.offset) params.set('offset', String(args.offset as number));
    return this.request(
      `/content/${encodeURIComponent(source)}/${encodeURIComponent(section)}.json`,
      params,
    );
  }

  private async listContentBySourceSectionTimeperiod(args: Record<string, unknown>): Promise<ToolResult> {
    const source = args.source as string;
    const section = args.section as string;
    const timePeriod = args.time_period as number;
    if (!source || !section || timePeriod === undefined || timePeriod === null) {
      return {
        content: [{ type: 'text', text: 'source, section, and time_period are required' }],
        isError: true,
      };
    }
    const params = new URLSearchParams();
    if (args.limit) params.set('limit', String(args.limit as number));
    if (args.offset) params.set('offset', String(args.offset as number));
    return this.request(
      `/content/${encodeURIComponent(source)}/${encodeURIComponent(section)}/${encodeURIComponent(String(timePeriod))}.json`,
      params,
    );
  }
}

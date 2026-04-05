/**
 * WebScraping.AI MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Spec: https://api.apis.guru/v2/specs/webscraping.ai/2.0.7/openapi.json
// Source: https://webscraping.ai/openapi.yml
// Base URL: https://api.webscraping.ai
// Auth: api_key query parameter
// Rate limits: Depends on plan. Free: 100 requests/month. Startup+: higher quotas.
// Docs: https://webscraping.ai

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface WebScrapingConfig {
  /** WebScraping.AI API key */
  apiKey: string;
}

export class WebScrapingMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.webscraping.ai';

  constructor(config: WebScrapingConfig) {
    super();
    this.apiKey = config.apiKey;
  }

  static catalog() {
    return {
      name: 'webscraping',
      displayName: 'WebScraping.AI',
      version: '1.0.0',
      category: 'data',
      keywords: [
        'webscraping', 'scraping', 'web scraping', 'html', 'css selector', 'proxy',
        'headless', 'javascript rendering', 'data extraction', 'web crawling',
      ],
      toolNames: [
        'scrape_html',
        'scrape_selected',
        'scrape_selected_multiple',
        'get_account_quota',
      ],
      description: 'WebScraping.AI: extract full-page HTML or targeted CSS-selected content from any URL with Chrome JS rendering, rotating proxies, and automatic bot bypass.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'scrape_html',
        description: 'Fetch the full rendered HTML of a page at a given URL, optionally using a headless browser and rotating proxies',
        inputSchema: {
          type: 'object',
          properties: {
            url: {
              type: 'string',
              description: 'URL of the target page to scrape',
            },
            js: {
              type: 'boolean',
              description: 'Execute on-page JavaScript using a headless browser (true by default)',
            },
            proxy: {
              type: 'string',
              description: 'Proxy type: datacenter (default) or residential. Residential proxies bypass stricter bot detection.',
            },
            country: {
              type: 'string',
              description: 'Country of the proxy to use, e.g. US (default). Only on Startup and Custom plans.',
            },
            device: {
              type: 'string',
              description: 'Device emulation: desktop or mobile',
            },
            timeout: {
              type: 'number',
              description: 'Maximum processing time in ms (default: 10000, max: 30000)',
            },
            js_timeout: {
              type: 'number',
              description: 'Maximum JavaScript rendering time in ms (default: 2000)',
            },
            error_on_404: {
              type: 'boolean',
              description: 'Return an error when the target page returns HTTP 404 (false by default)',
            },
            error_on_redirect: {
              type: 'boolean',
              description: 'Return an error on redirect from the target page (false by default)',
            },
          },
          required: ['url'],
        },
      },
      {
        name: 'scrape_selected',
        description: 'Fetch the HTML of a single CSS-selected element on a page at a given URL',
        inputSchema: {
          type: 'object',
          properties: {
            url: {
              type: 'string',
              description: 'URL of the target page',
            },
            selector: {
              type: 'string',
              description: 'CSS selector for the element to extract (e.g. h1, .price, #main-content)',
            },
            js: {
              type: 'boolean',
              description: 'Execute on-page JavaScript using a headless browser (true by default)',
            },
            proxy: {
              type: 'string',
              description: 'Proxy type: datacenter (default) or residential',
            },
            country: {
              type: 'string',
              description: 'Country of the proxy to use, e.g. US (default)',
            },
            device: {
              type: 'string',
              description: 'Device emulation: desktop or mobile',
            },
            timeout: {
              type: 'number',
              description: 'Maximum processing time in ms (default: 10000)',
            },
            js_timeout: {
              type: 'number',
              description: 'Maximum JavaScript rendering time in ms (default: 2000)',
            },
            error_on_404: {
              type: 'boolean',
              description: 'Return error on 404 HTTP status on the target page (false by default)',
            },
            error_on_redirect: {
              type: 'boolean',
              description: 'Return error on redirect on the target page (false by default)',
            },
          },
          required: ['url', 'selector'],
        },
      },
      {
        name: 'scrape_selected_multiple',
        description: 'Fetch HTML of multiple CSS-selected elements on a page at a given URL, returning an array of matched content',
        inputSchema: {
          type: 'object',
          properties: {
            url: {
              type: 'string',
              description: 'URL of the target page',
            },
            selectors: {
              type: 'array',
              description: 'Array of CSS selectors to extract (e.g. ["h1", ".price", "#description"])',
            },
            js: {
              type: 'boolean',
              description: 'Execute on-page JavaScript using a headless browser (true by default)',
            },
            proxy: {
              type: 'string',
              description: 'Proxy type: datacenter (default) or residential',
            },
            country: {
              type: 'string',
              description: 'Country of the proxy to use, e.g. US (default)',
            },
            device: {
              type: 'string',
              description: 'Device emulation: desktop or mobile',
            },
            timeout: {
              type: 'number',
              description: 'Maximum processing time in ms (default: 10000)',
            },
            js_timeout: {
              type: 'number',
              description: 'Maximum JavaScript rendering time in ms (default: 2000)',
            },
            error_on_404: {
              type: 'boolean',
              description: 'Return error on 404 on the target page (false by default)',
            },
            error_on_redirect: {
              type: 'boolean',
              description: 'Return error on redirect on the target page (false by default)',
            },
          },
          required: ['url', 'selectors'],
        },
      },
      {
        name: 'get_account_quota',
        description: 'Get information about the remaining API call quota for the current WebScraping.AI account',
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
        case 'scrape_html':
          return this.scrapeHtml(args);
        case 'scrape_selected':
          return this.scrapeSelected(args);
        case 'scrape_selected_multiple':
          return this.scrapeSelectedMultiple(args);
        case 'get_account_quota':
          return this.getAccountQuota();
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

  private buildParams(args: Record<string, unknown>, extra: Record<string, string> = {}): URLSearchParams {
    const qs = new URLSearchParams({ api_key: this.apiKey, ...extra });
    const optionals: Array<keyof typeof args> = ['js', 'proxy', 'country', 'device', 'timeout', 'js_timeout', 'error_on_404', 'error_on_redirect'];
    for (const key of optionals) {
      if (args[key] !== undefined) qs.set(key as string, String(args[key]));
    }
    return qs;
  }

  private async get(path: string, qs: URLSearchParams): Promise<ToolResult> {
    const url = `${this.baseUrl}${path}?${qs.toString()}`;
    const response = await this.fetchWithRetry(url, { method: 'GET', headers: { 'Accept': 'application/json, text/html' } });
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `API error: ${response.status} ${errText}` }], isError: true };
    }
    const contentType = response.headers.get('content-type') ?? '';
    let data: unknown;
    if (contentType.includes('application/json')) {
      try { data = await response.json(); } catch { throw new Error(`WebScraping.AI returned malformed JSON (HTTP ${response.status})`); }
    } else {
      data = await response.text();
    }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async scrapeHtml(args: Record<string, unknown>): Promise<ToolResult> {
    const { url } = args as { url: string };
    const qs = this.buildParams(args, { url });
    return this.get('/html', qs);
  }

  private async scrapeSelected(args: Record<string, unknown>): Promise<ToolResult> {
    const { url, selector } = args as { url: string; selector: string };
    const qs = this.buildParams(args, { url, selector });
    return this.get('/selected', qs);
  }

  private async scrapeSelectedMultiple(args: Record<string, unknown>): Promise<ToolResult> {
    const { url, selectors } = args as { url: string; selectors: string[] };
    const qs = this.buildParams(args, { url });
    for (const sel of selectors) qs.append('selectors', sel);
    return this.get('/selected-multiple', qs);
  }

  private async getAccountQuota(): Promise<ToolResult> {
    const qs = new URLSearchParams({ api_key: this.apiKey });
    return this.get('/account', qs);
  }
}

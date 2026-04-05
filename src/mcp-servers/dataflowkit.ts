/**
 * Dataflow Kit MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// No official Dataflow Kit MCP server was found on GitHub or the MCP registry.
//
// Base URL: https://api.dataflowkit.com/v1
// Auth: api_key query parameter (required on all requests)
// Docs: https://dataflowkit.com/open-api  |  https://api.dataflowkit.com/v1/swagger.yaml
// Rate limits: Not publicly documented. Apply reasonable backoff.
// Coverage: fetch (page download), parse (CSS-selector scraping), serp (search engine results),
//           url-to-pdf (headless Chrome PDF), url-to-screenshot (headless Chrome screenshot)

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface DataflowkitConfig {
  apiKey: string;
  baseUrl?: string;
}

export class DataflowkitMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: DataflowkitConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.dataflowkit.com/v1';
  }

  static catalog() {
    return {
      name: 'dataflowkit',
      displayName: 'Dataflow Kit',
      version: '1.3.0',
      category: 'data',
      keywords: [
        'dataflowkit', 'web scraper', 'scraping', 'headless chrome', 'proxy', 'SERP',
        'search engine results', 'page fetch', 'CSS selectors', 'parse', 'extract',
        'url to pdf', 'url to screenshot', 'screenshot', 'web automation', 'crawl',
        'google scrape', 'bing scrape', 'duckduckgo', 'yandex', 'baidu',
      ],
      toolNames: [
        'fetch_page', 'parse_page', 'scrape_serp', 'convert_url_to_pdf', 'capture_screenshot',
      ],
      description: 'Dataflow Kit web scraper: fetch and render JavaScript-driven pages, extract structured data with CSS selectors, scrape SERP results from Google/Bing/DuckDuckGo, and convert URLs to PDF or screenshots using Headless Chrome with worldwide proxy support.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'fetch_page',
        description: 'Download a web page using either a fast base fetcher (server-side rendered pages) or a Headless Chrome fetcher (JavaScript-driven pages). Returns the raw HTML content.',
        inputSchema: {
          type: 'object',
          properties: {
            url: {
              type: 'string',
              description: 'Full URL of the web page to download (e.g. "https://example.com/news")',
            },
            type: {
              type: 'string',
              description: 'Fetcher type: "base" for fast server-side rendered pages, "chrome" for JavaScript-heavy pages that require rendering (default: "base")',
            },
            proxy: {
              type: 'string',
              description: 'Route the request through a proxy by specifying an ISO 3166-1 alpha-2 country code (e.g. "us", "de", "jp"). Useful for geo-blocked content.',
            },
            waitDelay: {
              type: 'number',
              description: 'Seconds to wait after page load before capturing content (0-30). Useful when dynamic content loads after initial render.',
            },
            output: {
              type: 'string',
              description: 'Output mode: omit for inline response, "file" to upload result to Dataflow Kit Storage and receive a download URL.',
            },
          },
          required: ['url'],
        },
      },
      {
        name: 'parse_page',
        description: 'Extract structured data from web pages using CSS selectors. Specify a collection name, output format, and a list of fields with selectors to scrape text, links, or images. Supports multi-page crawling via a paginator.',
        inputSchema: {
          type: 'object',
          properties: {
            url: {
              type: 'string',
              description: 'Full URL of the web page to parse',
            },
            name: {
              type: 'string',
              description: 'Collection name for the extracted dataset (e.g. "product-listings", "news-articles")',
            },
            format: {
              type: 'string',
              description: 'Output format for extracted data: "json", "csv", "excel", "jsonlines", or "xml" (default: "json")',
            },
            fields: {
              type: 'array',
              description: 'Array of field definitions. Each field requires: name (string), selector (CSS selector), type (0=image, 1=text, 2=link), attrs (array of attributes to extract)',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string', description: 'Field identifier in the output' },
                  selector: { type: 'string', description: 'CSS selector to locate the element' },
                  type: { type: 'integer', description: '0 = image, 1 = text, 2 = link' },
                  attrs: { type: 'array', description: 'Attributes to extract (e.g. ["text", "href", "src"])', items: { type: 'string' } },
                },
              },
            },
            commonParent: {
              type: 'string',
              description: 'CSS selector for the common ancestor block of all fields - use when each set of fields shares a parent element (e.g. ".product-card")',
            },
            fetcherType: {
              type: 'string',
              description: 'Fetcher type for the request: "base" (default) or "chrome" (for JavaScript-rendered pages)',
            },
            proxy: {
              type: 'string',
              description: 'ISO 3166-1 alpha-2 country code for proxy routing (e.g. "us", "gb")',
            },
          },
          required: ['url', 'name', 'format', 'fields'],
        },
      },
      {
        name: 'scrape_serp',
        description: 'Scrape Search Engine Result Pages (SERP) from Google, Google Images, Google News, Google Shopping, Bing, DuckDuckGo, Baidu, or Yandex. Returns organic results, news, images, and more as structured data.',
        inputSchema: {
          type: 'object',
          properties: {
            url: {
              type: 'string',
              description: 'Full search engine URL with query parameters (e.g. "https://www.google.com/search?q=web+scraping+tools", "https://www.bing.com/search?q=AI+tools")',
            },
            name: {
              type: 'string',
              description: 'Collection name for the SERP results dataset',
            },
            format: {
              type: 'string',
              description: 'Output format: "json", "csv", "excel", "jsonlines", or "xml" (default: "json")',
            },
            proxy: {
              type: 'string',
              description: 'ISO 3166-1 alpha-2 country code for proxy routing - REQUIRED for SERP requests to avoid blocks (e.g. "us", "gb", "de")',
            },
            pageNum: {
              type: 'integer',
              description: 'Number of search result pages to crawl (default: 1, increases results proportionally)',
            },
            fields: {
              type: 'array',
              description: 'Custom CSS selectors to extract additional SERP data beyond defaults (optional)',
              items: { type: 'object' },
            },
          },
          required: ['url', 'name', 'format', 'proxy'],
        },
      },
      {
        name: 'convert_url_to_pdf',
        description: 'Convert a web page to a PDF document using Headless Chrome. Supports custom paper size, orientation, margins, page ranges, headers/footers, background graphics, and proxy routing for geo-blocked sites.',
        inputSchema: {
          type: 'object',
          properties: {
            url: {
              type: 'string',
              description: 'Full URL of the web page to convert to PDF (e.g. "https://example.com/report")',
            },
            paperSize: {
              type: 'string',
              description: 'Page size: "A4", "A3", "Letter", "Legal", "Tabloid" (default: "A4")',
            },
            landscape: {
              type: 'boolean',
              description: 'Page orientation: true = landscape, false = portrait (default: false)',
            },
            printBackground: {
              type: 'boolean',
              description: 'Include background graphics and colors in the PDF (default: false)',
            },
            printHeaderFooter: {
              type: 'boolean',
              description: 'Add date, page title, and page number header/footer (default: false)',
            },
            marginTop: {
              type: 'number',
              description: 'Top margin in inches (e.g. 0.5)',
            },
            marginBottom: {
              type: 'number',
              description: 'Bottom margin in inches',
            },
            marginLeft: {
              type: 'number',
              description: 'Left margin in inches',
            },
            marginRight: {
              type: 'number',
              description: 'Right margin in inches',
            },
            pageRanges: {
              type: 'string',
              description: 'Page ranges to include (e.g. "1-5", "1,3,5-10"). Default: all pages.',
            },
            scale: {
              type: 'number',
              description: 'Content scale factor (0.1-2.0, default: 1.0)',
            },
            proxy: {
              type: 'string',
              description: 'ISO 3166-1 alpha-2 country code for proxy routing (e.g. "us", "jp")',
            },
            waitDelay: {
              type: 'number',
              description: 'Seconds to wait after page load before capturing (0-30)',
            },
            output: {
              type: 'string',
              description: 'Set to "file" to upload PDF to Dataflow Kit Storage and receive a download URL instead of binary content',
            },
          },
          required: ['url'],
        },
      },
      {
        name: 'capture_screenshot',
        description: 'Capture a screenshot of a web page using Headless Chrome. Supports full-page or viewport screenshots, element-level capture via CSS selector, JPG/PNG format, custom dimensions, and proxy routing.',
        inputSchema: {
          type: 'object',
          properties: {
            url: {
              type: 'string',
              description: 'Full URL of the web page to screenshot (e.g. "https://example.com")',
            },
            format: {
              type: 'string',
              description: 'Output image format: "jpg" or "png" (default: "jpg")',
            },
            fullPage: {
              type: 'boolean',
              description: 'Capture the full scrollable page instead of just the viewport (default: false). When true, ignores offsetX/offsetY/width/height.',
            },
            clipSelector: {
              type: 'string',
              description: 'CSS selector to capture only a specific element on the page (e.g. "#main-chart", ".hero-banner")',
            },
            width: {
              type: 'integer',
              description: 'Viewport/capture area width in device-independent pixels (default: 1280)',
            },
            height: {
              type: 'integer',
              description: 'Viewport/capture area height in device-independent pixels (default: 800)',
            },
            offsetx: {
              type: 'integer',
              description: 'X offset of the capture rectangle in device-independent pixels',
            },
            offsety: {
              type: 'integer',
              description: 'Y offset of the capture rectangle in device-independent pixels',
            },
            quality: {
              type: 'integer',
              description: 'JPEG compression quality 0-100 (only applies when format is "jpg", default: 80)',
            },
            scale: {
              type: 'number',
              description: 'Image scale factor (0.1-3.0, default: 1.0)',
            },
            printBackground: {
              type: 'boolean',
              description: 'Render background graphics (default: false)',
            },
            proxy: {
              type: 'string',
              description: 'ISO 3166-1 alpha-2 country code for proxy routing (e.g. "us", "de")',
            },
            waitDelay: {
              type: 'number',
              description: 'Seconds to wait after page load before capturing (0-30)',
            },
            output: {
              type: 'string',
              description: 'Set to "file" to upload image to Dataflow Kit Storage and receive a download URL',
            },
          },
          required: ['url'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'fetch_page':
          return this.fetchPage(args);
        case 'parse_page':
          return this.parsePage(args);
        case 'scrape_serp':
          return this.scrapeSerp(args);
        case 'convert_url_to_pdf':
          return this.convertUrlToPdf(args);
        case 'capture_screenshot':
          return this.captureScreenshot(args);
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

  private apiUrl(path: string): string {
    return `${this.baseUrl}${path}?api_key=${encodeURIComponent(this.apiKey)}`;
  }

  private async postJson(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(this.apiUrl(path), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `API error ${response.status}: ${errText}` }], isError: true };
    }
    const contentType = response.headers.get('content-type') ?? '';
    if (contentType.includes('application/json')) {
      const data = await response.json() as unknown;
      return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
    }
    // text/plain response (e.g. a storage URL or raw HTML)
    const text = await response.text();
    return { content: [{ type: 'text', text: this.truncate(text) }], isError: false };
  }

  private async fetchPage(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.url) return { content: [{ type: 'text', text: 'url is required' }], isError: true };
    const body: Record<string, unknown> = {
      url: args.url,
      type: (args.type as string) || 'base',
    };
    if (args.proxy) body.proxy = args.proxy;
    if (args.waitDelay !== undefined) body.waitDelay = args.waitDelay;
    if (args.output) body.output = args.output;
    return this.postJson('/fetch', body);
  }

  private async parsePage(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.url) return { content: [{ type: 'text', text: 'url is required' }], isError: true };
    if (!args.name) return { content: [{ type: 'text', text: 'name is required' }], isError: true };
    if (!args.format) return { content: [{ type: 'text', text: 'format is required' }], isError: true };
    if (!args.fields) return { content: [{ type: 'text', text: 'fields is required' }], isError: true };
    const fetchReq: Record<string, unknown> = {
      url: args.url as string,
      type: (args.fetcherType as string) || 'base',
    };
    if (args.proxy) fetchReq.proxy = args.proxy;
    const body: Record<string, unknown> = {
      name: args.name,
      format: args.format,
      fields: args.fields,
      request: fetchReq,
    };
    if (args.commonParent) body.commonParent = args.commonParent;
    return this.postJson('/parse', body);
  }

  private async scrapeSerp(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.url) return { content: [{ type: 'text', text: 'url is required' }], isError: true };
    if (!args.name) return { content: [{ type: 'text', text: 'name is required' }], isError: true };
    if (!args.format) return { content: [{ type: 'text', text: 'format is required' }], isError: true };
    if (!args.proxy) return { content: [{ type: 'text', text: 'proxy is required for SERP requests' }], isError: true };
    const body: Record<string, unknown> = {
      url: args.url,
      name: args.name,
      format: args.format,
      proxy: args.proxy,
      type: 'chrome',
    };
    if (args.pageNum !== undefined) body.pageNum = args.pageNum;
    if (args.fields) body.fields = args.fields;
    return this.postJson('/serp', body);
  }

  private async convertUrlToPdf(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.url) return { content: [{ type: 'text', text: 'url is required' }], isError: true };
    const body: Record<string, unknown> = { url: args.url };
    const optionalFields = [
      'paperSize', 'landscape', 'printBackground', 'printHeaderFooter',
      'marginTop', 'marginBottom', 'marginLeft', 'marginRight',
      'pageRanges', 'scale', 'proxy', 'waitDelay', 'output',
    ];
    for (const f of optionalFields) {
      if (args[f] !== undefined) body[f] = args[f];
    }
    return this.postJson('/convert/url/pdf', body);
  }

  private async captureScreenshot(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.url) return { content: [{ type: 'text', text: 'url is required' }], isError: true };
    const body: Record<string, unknown> = { url: args.url };
    const optionalFields = [
      'format', 'fullPage', 'clipSelector', 'width', 'height',
      'offsetx', 'offsety', 'quality', 'scale', 'printBackground',
      'proxy', 'waitDelay', 'output',
    ];
    for (const f of optionalFields) {
      if (args[f] !== undefined) body[f] = args[f];
    }
    return this.postJson('/convert/url/screenshot', body);
  }
}

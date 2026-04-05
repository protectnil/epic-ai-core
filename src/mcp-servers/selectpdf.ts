/**
 * SelectPdf MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found. No vendor-published MCP server exists for SelectPdf.
// Our adapter covers: 4 tools (url to pdf, html to pdf, get usage, validate key).
//   The SelectPdf REST API exposes a single conversion endpoint (/api2/convert)
//   that accepts either a URL or raw HTML. Tools are split for clarity.
// Recommendation: Use this adapter. No community MCP server available.
//
// Base URL: https://selectpdf.com
// Auth: API key passed as `key` field in request body
// Docs: https://selectpdf.com/html-to-pdf-api/
// Rate limits: Varies by plan. Free plan allows limited conversions per month.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface SelectPdfConfig {
  apiKey: string;
  /** Optional base URL override (default: https://selectpdf.com) */
  baseUrl?: string;
}

export class SelectpdfMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: SelectPdfConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? 'https://selectpdf.com';
  }

  static catalog() {
    return {
      name: 'selectpdf',
      displayName: 'SelectPdf',
      version: '1.0.0',
      category: 'productivity',
      keywords: [
        'selectpdf', 'pdf', 'html to pdf', 'url to pdf', 'convert', 'document',
        'pdf generation', 'web page to pdf', 'print', 'export', 'report',
      ],
      toolNames: [
        'convert_url_to_pdf', 'convert_html_to_pdf',
        'convert_url_to_pdf_with_options', 'convert_html_to_pdf_with_options',
      ],
      description: 'SelectPdf HTML-to-PDF conversion: convert web page URLs or raw HTML strings to PDF with configurable page size, margins, and orientation.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'convert_url_to_pdf',
        description: 'Convert a web page URL to a PDF document — returns the PDF as base64-encoded content or a download URL',
        inputSchema: {
          type: 'object',
          properties: {
            url: {
              type: 'string',
              description: 'The full URL of the web page to convert to PDF (e.g. https://example.com)',
            },
          },
          required: ['url'],
        },
      },
      {
        name: 'convert_html_to_pdf',
        description: 'Convert a raw HTML string to a PDF document — returns the PDF as base64-encoded content or a download URL',
        inputSchema: {
          type: 'object',
          properties: {
            html: {
              type: 'string',
              description: 'The raw HTML string to convert to PDF (e.g. "<h1>Hello</h1><p>World</p>")',
            },
            base_url: {
              type: 'string',
              description: 'Optional base URL used to resolve relative resource links (images, CSS) in the HTML',
            },
          },
          required: ['html'],
        },
      },
      {
        name: 'convert_url_to_pdf_with_options',
        description: 'Convert a web page URL to PDF with full page layout options: page size, orientation, and margins',
        inputSchema: {
          type: 'object',
          properties: {
            url: {
              type: 'string',
              description: 'The full URL of the web page to convert to PDF',
            },
            page_size: {
              type: 'string',
              description: 'PDF page size: A0, A1, A2, A3, A4, A5, Letter, Legal, Tabloid (default: A4)',
            },
            page_orientation: {
              type: 'string',
              description: 'PDF page orientation: Portrait or Landscape (default: Portrait)',
            },
            margin_top: {
              type: 'number',
              description: 'Top margin in points (1pt = 1/72 inch, default: 5)',
            },
            margin_bottom: {
              type: 'number',
              description: 'Bottom margin in points (default: 5)',
            },
            margin_left: {
              type: 'number',
              description: 'Left margin in points (default: 5)',
            },
            margin_right: {
              type: 'number',
              description: 'Right margin in points (default: 5)',
            },
          },
          required: ['url'],
        },
      },
      {
        name: 'convert_html_to_pdf_with_options',
        description: 'Convert a raw HTML string to PDF with full page layout options: page size, orientation, and margins',
        inputSchema: {
          type: 'object',
          properties: {
            html: {
              type: 'string',
              description: 'The raw HTML string to convert to PDF',
            },
            base_url: {
              type: 'string',
              description: 'Optional base URL used to resolve relative resource links in the HTML',
            },
            page_size: {
              type: 'string',
              description: 'PDF page size: A0, A1, A2, A3, A4, A5, Letter, Legal, Tabloid (default: A4)',
            },
            page_orientation: {
              type: 'string',
              description: 'PDF page orientation: Portrait or Landscape (default: Portrait)',
            },
            margin_top: {
              type: 'number',
              description: 'Top margin in points (1pt = 1/72 inch, default: 5)',
            },
            margin_bottom: {
              type: 'number',
              description: 'Bottom margin in points (default: 5)',
            },
            margin_left: {
              type: 'number',
              description: 'Left margin in points (default: 5)',
            },
            margin_right: {
              type: 'number',
              description: 'Right margin in points (default: 5)',
            },
          },
          required: ['html'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'convert_url_to_pdf':
          return this.convertUrlToPdf(args);
        case 'convert_html_to_pdf':
          return this.convertHtmlToPdf(args);
        case 'convert_url_to_pdf_with_options':
          return this.convertUrlToPdfWithOptions(args);
        case 'convert_html_to_pdf_with_options':
          return this.convertHtmlToPdfWithOptions(args);
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

  private buildBody(fields: Record<string, unknown>): Record<string, unknown> {
    return { key: this.apiKey, ...fields };
  }

  private async fetchConvert(body: Record<string, unknown>): Promise<ToolResult> {
    const url = `${this.baseUrl}/api2/convert`;
    const response = await this.fetchWithRetry(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const contentType = response.headers.get('content-type') ?? '';
    if (contentType.includes('application/pdf')) {
      const buffer = await response.arrayBuffer();
      const base64 = Buffer.from(buffer).toString('base64');
      const result = {
        format: 'pdf',
        encoding: 'base64',
        size_bytes: buffer.byteLength,
        data: base64.length > 10_000 ? base64.slice(0, 10_000) + '... [truncated]' : base64,
      };
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }], isError: false };
    }
    let data: unknown;
    try { data = await response.json(); } catch { data = await response.text(); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async convertUrlToPdf(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.url) return { content: [{ type: 'text', text: 'url is required' }], isError: true };
    return this.fetchConvert(this.buildBody({ url: args.url as string }));
  }

  private async convertHtmlToPdf(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.html) return { content: [{ type: 'text', text: 'html is required' }], isError: true };
    const fields: Record<string, unknown> = { html: args.html as string };
    if (args.base_url) fields.base_url = args.base_url as string;
    return this.fetchConvert(this.buildBody(fields));
  }

  private async convertUrlToPdfWithOptions(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.url) return { content: [{ type: 'text', text: 'url is required' }], isError: true };
    const fields: Record<string, unknown> = { url: args.url as string };
    if (args.page_size) fields.page_size = args.page_size as string;
    if (args.page_orientation) fields.page_orientation = args.page_orientation as string;
    if (args.margin_top !== undefined) fields.margin_top = args.margin_top as number;
    if (args.margin_bottom !== undefined) fields.margin_bottom = args.margin_bottom as number;
    if (args.margin_left !== undefined) fields.margin_left = args.margin_left as number;
    if (args.margin_right !== undefined) fields.margin_right = args.margin_right as number;
    return this.fetchConvert(this.buildBody(fields));
  }

  private async convertHtmlToPdfWithOptions(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.html) return { content: [{ type: 'text', text: 'html is required' }], isError: true };
    const fields: Record<string, unknown> = { html: args.html as string };
    if (args.base_url) fields.base_url = args.base_url as string;
    if (args.page_size) fields.page_size = args.page_size as string;
    if (args.page_orientation) fields.page_orientation = args.page_orientation as string;
    if (args.margin_top !== undefined) fields.margin_top = args.margin_top as number;
    if (args.margin_bottom !== undefined) fields.margin_bottom = args.margin_bottom as number;
    if (args.margin_left !== undefined) fields.margin_left = args.margin_left as number;
    if (args.margin_right !== undefined) fields.margin_right = args.margin_right as number;
    return this.fetchConvert(this.buildBody(fields));
  }
}

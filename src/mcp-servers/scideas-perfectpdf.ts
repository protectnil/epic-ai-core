/**
 * scideas PerfectPDF MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// PerfectPDF is a single-endpoint HTML-to-PDF conversion API by scideas.net.
// It uses headless Google Chrome to render HTML/CSS markup and return a PDF document.
//
// Base URL: https://services.scideas.net
// Auth: API key passed in request body as `api_key` field
// Docs: https://services.scideas.net/perfectpdf
// Rate limits: Not publicly documented; plan-dependent

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface ScideasPerfectPDFConfig {
  apiKey: string;
  baseUrl?: string; // default: https://services.scideas.net
}

export class ScideasPerfectpdfMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: ScideasPerfectPDFConfig) {
    super();
    this.apiKey  = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://services.scideas.net';
  }

  static catalog() {
    return {
      name: 'scideas-perfectpdf',
      displayName: 'scideas PerfectPDF',
      version: '1.0.0',
      category: 'productivity',
      keywords: [
        'pdf', 'html to pdf', 'convert', 'document', 'perfectpdf', 'scideas',
        'headless chrome', 'render', 'export', 'report', 'invoice', 'printing',
        'css', 'markup', 'document generation',
      ],
      toolNames: [
        'convert_html_to_pdf',
      ],
      description: 'scideas PerfectPDF: convert HTML/CSS markup to a PDF document using headless Google Chrome — one focused endpoint, high quality output.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'convert_html_to_pdf',
        description: 'Convert an HTML/CSS string to a PDF document using headless Google Chrome. Returns PDF content. Ideal for generating invoices, reports, certificates, or any document from HTML markup.',
        inputSchema: {
          type: 'object',
          properties: {
            html: {
              type: 'string',
              description: 'Full HTML/CSS markup to convert to PDF. Include a complete HTML document with <html>, <head>, and <body> tags for best results.',
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
        case 'convert_html_to_pdf': return this.convertHtmlToPdf(args);
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

  // ── Private helpers ──────────────────────────────────────────────────────────

  private async post(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json, application/pdf',
      },
      body: JSON.stringify({ ...body, api_key: this.apiKey }),
    });

    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/pdf')) {
      const buf = await response.arrayBuffer();
      const b64 = Buffer.from(buf).toString('base64');
      const truncated = b64.length > 10_000
        ? b64.slice(0, 10_000) + `\n... [truncated, ${b64.length} total base64 chars]`
        : b64;
      return { content: [{ type: 'text', text: `PDF (base64):\n${truncated}` }], isError: false };
    }

    const data: unknown = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  // ── Tool implementations ──────────────────────────────────────────────────────

  private async convertHtmlToPdf(args: Record<string, unknown>): Promise<ToolResult> {
    const html = args.html as string;
    if (!html || typeof html !== 'string') {
      return { content: [{ type: 'text', text: 'html is required and must be a string' }], isError: true };
    }
    return this.post('/perfectpdf/api', { html });
  }
}

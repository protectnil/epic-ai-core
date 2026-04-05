/**
 * Api2Pdf MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// No official Api2Pdf MCP server was found on GitHub. We build a full REST wrapper
// for complete API coverage.
//
// Base URL: https://v2018.api2pdf.com
// Auth: API key — GET requests use ?apikey= query param; POST requests use Authorization header
// Docs: https://www.api2pdf.com/documentation/
// Spec: https://api.apis.guru/v2/specs/api2pdf.com/1.0.0/openapi.json
// Category: productivity
// Rate limits: None stated — serverless AWS Lambda backend, scales on demand

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface Api2PdfConfig {
  apiKey: string;
  baseUrl?: string;
}

export class Api2PdfMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: Api2PdfConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://v2018.api2pdf.com';
  }

  static catalog() {
    return {
      name: 'api2pdf',
      displayName: 'Api2Pdf',
      version: '1.0.0',
      category: 'productivity',
      keywords: [
        'api2pdf', 'pdf', 'pdf generation', 'html to pdf', 'url to pdf',
        'headless chrome', 'wkhtmltopdf', 'libreoffice', 'word to pdf',
        'excel to pdf', 'powerpoint to pdf', 'merge pdf', 'barcode',
        'qr code', 'zxing', 'document conversion', 'file conversion',
      ],
      toolNames: [
        'chrome_html_to_pdf',
        'chrome_url_to_pdf_get',
        'chrome_url_to_pdf_post',
        'libreoffice_convert',
        'merge_pdfs',
        'wkhtmltopdf_html_to_pdf',
        'wkhtmltopdf_url_to_pdf_get',
        'wkhtmltopdf_url_to_pdf_post',
        'generate_barcode',
      ],
      description: 'Api2Pdf: generate PDFs from HTML or URLs using Headless Chrome or wkhtmltopdf, convert Office documents with LibreOffice, merge PDFs, and generate barcodes/QR codes — all powered by AWS Lambda.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      // ── Headless Chrome ────────────────────────────────────────────────────
      {
        name: 'chrome_html_to_pdf',
        description: 'Convert raw HTML string to a PDF using Headless Chrome on AWS Lambda. Supports advanced options like margins, headers, footers, and page size.',
        inputSchema: {
          type: 'object',
          properties: {
            html: {
              type: 'string',
              description: 'Raw HTML content to convert to PDF',
            },
            inlinePdf: {
              type: 'boolean',
              description: 'If true, the PDF opens inline in a browser window. Defaults to false (download).',
            },
            fileName: {
              type: 'string',
              description: 'Output PDF file name. A random name is used if not specified.',
            },
            options: {
              type: 'object',
              description: 'Advanced Headless Chrome options such as margins, headers, footers, landscape mode, and page size. See https://www.api2pdf.com/documentation/advanced-options-headless-chrome/',
            },
          },
          required: ['html'],
        },
      },
      {
        name: 'chrome_url_to_pdf_get',
        description: 'Convert a URL or web page to PDF using Headless Chrome (GET request, simpler but fewer options). Returns PDF file or JSON depending on the output parameter.',
        inputSchema: {
          type: 'object',
          properties: {
            url: {
              type: 'string',
              description: 'URL of the page to convert to PDF. Must start with http:// or https://.',
            },
            output: {
              type: 'string',
              description: 'Specify "json" to receive a JSON response with the PDF URL. Defaults to direct PDF download.',
            },
          },
          required: ['url'],
        },
      },
      {
        name: 'chrome_url_to_pdf_post',
        description: 'Convert a URL or web page to PDF using Headless Chrome (POST request with full options support including margins, headers, and footers).',
        inputSchema: {
          type: 'object',
          properties: {
            url: {
              type: 'string',
              description: 'URL of the web page to convert to PDF. Must start with http:// or https://.',
            },
            inlinePdf: {
              type: 'boolean',
              description: 'If true, the PDF opens inline in a browser window. Defaults to false.',
            },
            fileName: {
              type: 'string',
              description: 'Output PDF file name. A random name is used if not specified.',
            },
            options: {
              type: 'object',
              description: 'Advanced Headless Chrome options such as margins, headers, footers, landscape mode, and page size.',
            },
          },
          required: ['url'],
        },
      },
      // ── LibreOffice ────────────────────────────────────────────────────────
      {
        name: 'libreoffice_convert',
        description: 'Convert an Office document (Word .docx, Excel .xlsx, PowerPoint .pptx) or image (jpg, gif, png) to PDF using LibreOffice on AWS Lambda.',
        inputSchema: {
          type: 'object',
          properties: {
            url: {
              type: 'string',
              description: 'Publicly accessible URL of the Office document or image to convert to PDF.',
            },
            inlinePdf: {
              type: 'boolean',
              description: 'If true, the PDF opens inline in a browser window. Defaults to false.',
            },
            fileName: {
              type: 'string',
              description: 'Output PDF file name. A random name is used if not specified.',
            },
          },
          required: ['url'],
        },
      },
      // ── PDF Merge ──────────────────────────────────────────────────────────
      {
        name: 'merge_pdfs',
        description: 'Merge multiple PDF files into a single PDF. Provide an array of publicly accessible PDF URLs and they will be combined in order.',
        inputSchema: {
          type: 'object',
          properties: {
            urls: {
              type: 'array',
              items: { type: 'string' },
              description: 'Array of publicly accessible PDF URLs to merge in order.',
            },
            inlinePdf: {
              type: 'boolean',
              description: 'If true, the merged PDF opens inline in a browser window. Defaults to false.',
            },
            fileName: {
              type: 'string',
              description: 'Output merged PDF file name. A random name is used if not specified.',
            },
          },
          required: ['urls'],
        },
      },
      // ── wkhtmltopdf ────────────────────────────────────────────────────────
      {
        name: 'wkhtmltopdf_html_to_pdf',
        description: 'Convert raw HTML to PDF using wkhtmltopdf on AWS Lambda. A lighter-weight alternative to Headless Chrome for simpler documents.',
        inputSchema: {
          type: 'object',
          properties: {
            html: {
              type: 'string',
              description: 'Raw HTML content to convert to PDF.',
            },
            inlinePdf: {
              type: 'boolean',
              description: 'If true, the PDF opens inline in a browser window. Defaults to false.',
            },
            fileName: {
              type: 'string',
              description: 'Output PDF file name. A random name is used if not specified.',
            },
            options: {
              type: 'object',
              description: 'Advanced wkhtmltopdf options such as margins, orientation, and page size. See https://www.api2pdf.com/documentation/advanced-options-wkhtmltopdf/',
            },
          },
          required: ['html'],
        },
      },
      {
        name: 'wkhtmltopdf_url_to_pdf_get',
        description: 'Convert a URL to PDF using wkhtmltopdf (GET request, simpler syntax). Returns PDF file or JSON depending on the output parameter.',
        inputSchema: {
          type: 'object',
          properties: {
            url: {
              type: 'string',
              description: 'URL of the page to convert to PDF. Must start with http:// or https://.',
            },
            output: {
              type: 'string',
              description: 'Specify "json" to receive a JSON response with the PDF URL. Defaults to direct PDF download.',
            },
          },
          required: ['url'],
        },
      },
      {
        name: 'wkhtmltopdf_url_to_pdf_post',
        description: 'Convert a URL to PDF using wkhtmltopdf (POST request with full advanced options support).',
        inputSchema: {
          type: 'object',
          properties: {
            url: {
              type: 'string',
              description: 'URL of the web page to convert to PDF. Must start with http:// or https://.',
            },
            inlinePdf: {
              type: 'boolean',
              description: 'If true, the PDF opens inline in a browser window. Defaults to false.',
            },
            fileName: {
              type: 'string',
              description: 'Output PDF file name. A random name is used if not specified.',
            },
            options: {
              type: 'object',
              description: 'Advanced wkhtmltopdf options such as margins, orientation, and page size.',
            },
          },
          required: ['url'],
        },
      },
      // ── Barcodes / QR Codes ────────────────────────────────────────────────
      {
        name: 'generate_barcode',
        description: 'Generate barcodes and QR codes using ZXING (Zebra Crossing). Supports QR_CODE, CODE_128, EAN_13, UPC_A, DATA_MATRIX, and many other formats.',
        inputSchema: {
          type: 'object',
          properties: {
            value: {
              type: 'string',
              description: 'The data to encode in the barcode (e.g., a URL for QR codes, a product code for EAN/UPC).',
            },
            type: {
              type: 'string',
              description: 'Barcode format type. Examples: QR_CODE, CODE_128, EAN_13, UPC_A, DATA_MATRIX, AZTEC, PDF_417.',
            },
          },
          required: ['value'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'chrome_html_to_pdf':           return this.chromeHtmlToPdf(args);
        case 'chrome_url_to_pdf_get':        return this.chromeUrlToPdfGet(args);
        case 'chrome_url_to_pdf_post':       return this.chromeUrlToPdfPost(args);
        case 'libreoffice_convert':          return this.libreofficeConvert(args);
        case 'merge_pdfs':                   return this.mergePdfs(args);
        case 'wkhtmltopdf_html_to_pdf':      return this.wkhtmltopdfHtmlToPdf(args);
        case 'wkhtmltopdf_url_to_pdf_get':   return this.wkhtmltopdfUrlToPdfGet(args);
        case 'wkhtmltopdf_url_to_pdf_post':  return this.wkhtmltopdfUrlToPdfPost(args);
        case 'generate_barcode':             return this.generateBarcode(args);
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

  private async postRequest(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const url = `${this.baseUrl}${path}`;
    const response = await this.fetchWithRetry(url, {
      method: 'POST',
      headers: {
        Authorization: this.apiKey,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${errText}` }],
        isError: true,
      };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getRequest(path: string, params: Record<string, string>): Promise<ToolResult> {
    const qs = new URLSearchParams({ ...params, apikey: this.apiKey });
    const url = `${this.baseUrl}${path}?${qs.toString()}`;
    const response = await this.fetchWithRetry(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${errText}` }],
        isError: true,
      };
    }
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const data = await response.json();
      return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
    }
    // PDF binary — return metadata only
    return {
      content: [{ type: 'text', text: JSON.stringify({ success: true, contentType, url: response.url }) }],
      isError: false,
    };
  }

  // ── Headless Chrome ────────────────────────────────────────────────────────

  private async chromeHtmlToPdf(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.html) return { content: [{ type: 'text', text: 'html is required' }], isError: true };
    return this.postRequest('/chrome/html', args as Record<string, unknown>);
  }

  private async chromeUrlToPdfGet(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.url) return { content: [{ type: 'text', text: 'url is required' }], isError: true };
    const params: Record<string, string> = { url: args.url as string };
    if (args.output) params.output = args.output as string;
    return this.getRequest('/chrome/url', params);
  }

  private async chromeUrlToPdfPost(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.url) return { content: [{ type: 'text', text: 'url is required' }], isError: true };
    return this.postRequest('/chrome/url', args as Record<string, unknown>);
  }

  // ── LibreOffice ────────────────────────────────────────────────────────────

  private async libreofficeConvert(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.url) return { content: [{ type: 'text', text: 'url is required' }], isError: true };
    return this.postRequest('/libreoffice/convert', args as Record<string, unknown>);
  }

  // ── PDF Merge ──────────────────────────────────────────────────────────────

  private async mergePdfs(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.urls || !Array.isArray(args.urls) || args.urls.length === 0) {
      return { content: [{ type: 'text', text: 'urls array is required and must not be empty' }], isError: true };
    }
    return this.postRequest('/merge', args as Record<string, unknown>);
  }

  // ── wkhtmltopdf ────────────────────────────────────────────────────────────

  private async wkhtmltopdfHtmlToPdf(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.html) return { content: [{ type: 'text', text: 'html is required' }], isError: true };
    return this.postRequest('/wkhtmltopdf/html', args as Record<string, unknown>);
  }

  private async wkhtmltopdfUrlToPdfGet(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.url) return { content: [{ type: 'text', text: 'url is required' }], isError: true };
    const params: Record<string, string> = { url: args.url as string };
    if (args.output) params.output = args.output as string;
    return this.getRequest('/wkhtmltopdf/url', params);
  }

  private async wkhtmltopdfUrlToPdfPost(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.url) return { content: [{ type: 'text', text: 'url is required' }], isError: true };
    return this.postRequest('/wkhtmltopdf/url', args as Record<string, unknown>);
  }

  // ── Barcodes / QR Codes ────────────────────────────────────────────────────

  private async generateBarcode(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.value) return { content: [{ type: 'text', text: 'value is required' }], isError: true };
    const params: Record<string, string> = { value: args.value as string };
    if (args.type) params.type = args.type as string;
    return this.getRequest('/zebra', params);
  }
}

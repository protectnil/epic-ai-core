/**
 * Adobe Acrobat PDF Services MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
//   Adobe publishes an App Builder MCP template (github.com/adobe/generator-app-remote-mcp-server-generic)
//   and an AEM MCP server, but NO official Adobe PDF Services MCP server was found.
//   An Adobe Express Developer MCP exists (@adobe/express-developer-mcp) but covers Express design tools only,
//   not PDF Services (create, extract, OCR, compress, merge, split, protect).
//
// Base URL: https://pdf-services.adobe.io
// Auth: OAuth2 Client Credentials — POST https://ims-na1.adobelogin.com/ims/token/v3
//   Headers: x-api-key: <client_id> (required on every API call in addition to Bearer token)
// Docs: https://developer.adobe.com/document-services/docs/overview/pdf-services-api/
// OpenAPI spec: https://developer.adobe.com/document-services/docs/apis/
// Rate limits: Free tier — 500 Document Transactions/month. Paid tiers vary by contract.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface AdobeAcrobatConfig {
  /** Adobe API client ID (credential from Adobe Developer Console) */
  clientId: string;
  /** Adobe API client secret */
  clientSecret: string;
  /** Optional base URL override (default: https://pdf-services.adobe.io) */
  baseUrl?: string;
}

export class AdobeAcrobatAPIMCPServer extends MCPAdapterBase {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly baseUrl: string;
  private bearerToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(config: AdobeAcrobatConfig) {
    super();
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.baseUrl = config.baseUrl ?? 'https://pdf-services.adobe.io';
  }

  static catalog() {
    return {
      name: 'adobe-acrobat-api',
      displayName: 'Adobe Acrobat PDF Services',
      version: '1.0.0',
      category: 'misc',
      keywords: [
        'adobe', 'acrobat', 'pdf', 'pdf services', 'document', 'ocr',
        'convert', 'compress', 'merge', 'split', 'watermark', 'protect',
        'extract', 'word', 'excel', 'powerpoint', 'html', 'linearize',
      ],
      toolNames: [
        'upload_asset', 'get_asset',
        'create_pdf_from_url', 'create_pdf_from_office',
        'export_pdf_to_word', 'export_pdf_to_excel', 'export_pdf_to_powerpoint',
        'export_pdf_to_image',
        'ocr_pdf',
        'compress_pdf',
        'merge_pdfs',
        'split_pdf',
        'protect_pdf',
        'remove_protection',
        'watermark_pdf',
        'get_pdf_properties',
        'extract_pdf_content',
        'linearize_pdf',
        'get_operation_status',
      ],
      description: 'Adobe PDF Services API: create, convert, compress, merge, split, protect, watermark, OCR, and extract content from PDF documents.',
      author: 'protectnil',
    };
  }

  private async getOrRefreshToken(): Promise<string> {
    const now = Date.now();
    if (this.bearerToken && this.tokenExpiry > now) {
      return this.bearerToken;
    }

    const response = await this.fetchWithRetry('https://ims-na1.adobelogin.com/ims/token/v3', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        grant_type: 'client_credentials',
        scope: 'openid,AdobeID,DCAPI',
      }).toString(),
    });

    if (!response.ok) {
      throw new Error(`OAuth2 token request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as { access_token: string; expires_in: number };
    this.bearerToken = data.access_token;
    this.tokenExpiry = now + (data.expires_in - 60) * 1000;
    return this.bearerToken;
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'upload_asset',
        description: 'Upload a PDF or office document to Adobe PDF Services as an asset — returns assetID for use in subsequent operations',
        inputSchema: {
          type: 'object',
          properties: {
            media_type: {
              type: 'string',
              description: 'MIME type of the document to upload: application/pdf, application/vnd.openxmlformats-officedocument.wordprocessingml.document, etc.',
            },
          },
          required: ['media_type'],
        },
      },
      {
        name: 'get_asset',
        description: 'Get metadata and download URI for a previously uploaded asset by asset ID',
        inputSchema: {
          type: 'object',
          properties: {
            asset_id: {
              type: 'string',
              description: 'Asset ID returned by upload_asset',
            },
          },
          required: ['asset_id'],
        },
      },
      {
        name: 'create_pdf_from_url',
        description: 'Create a PDF from a web page URL — renders the page and converts it to PDF',
        inputSchema: {
          type: 'object',
          properties: {
            url: {
              type: 'string',
              description: 'Public URL of the web page to convert to PDF',
            },
            include_header_footer: {
              type: 'boolean',
              description: 'Include page header and footer in the generated PDF (default: false)',
            },
            page_layout: {
              type: 'object',
              description: 'Page layout options: {pageWidth: 8.5, pageHeight: 11, marginTop: 0.5, marginBottom: 0.5, marginLeft: 0.5, marginRight: 0.5} in inches',
            },
          },
          required: ['url'],
        },
      },
      {
        name: 'create_pdf_from_office',
        description: 'Convert a Word, Excel, or PowerPoint document (by asset ID) to PDF',
        inputSchema: {
          type: 'object',
          properties: {
            asset_id: {
              type: 'string',
              description: 'Asset ID of the uploaded Office document to convert to PDF',
            },
          },
          required: ['asset_id'],
        },
      },
      {
        name: 'export_pdf_to_word',
        description: 'Export a PDF document to Microsoft Word (.docx) format by asset ID',
        inputSchema: {
          type: 'object',
          properties: {
            asset_id: {
              type: 'string',
              description: 'Asset ID of the PDF to export to Word',
            },
            ocr_lang: {
              type: 'string',
              description: 'Language for OCR on scanned PDFs (default: en-US). ISO 639-1 language code.',
            },
          },
          required: ['asset_id'],
        },
      },
      {
        name: 'export_pdf_to_excel',
        description: 'Export a PDF document to Microsoft Excel (.xlsx) format by asset ID',
        inputSchema: {
          type: 'object',
          properties: {
            asset_id: {
              type: 'string',
              description: 'Asset ID of the PDF to export to Excel',
            },
            ocr_lang: {
              type: 'string',
              description: 'Language for OCR on scanned PDFs (default: en-US)',
            },
          },
          required: ['asset_id'],
        },
      },
      {
        name: 'export_pdf_to_powerpoint',
        description: 'Export a PDF document to Microsoft PowerPoint (.pptx) format by asset ID',
        inputSchema: {
          type: 'object',
          properties: {
            asset_id: {
              type: 'string',
              description: 'Asset ID of the PDF to export to PowerPoint',
            },
          },
          required: ['asset_id'],
        },
      },
      {
        name: 'export_pdf_to_image',
        description: 'Export PDF pages to images (JPEG or PNG) — returns image files for each page',
        inputSchema: {
          type: 'object',
          properties: {
            asset_id: {
              type: 'string',
              description: 'Asset ID of the PDF to export to images',
            },
            output_type: {
              type: 'string',
              description: 'Image format: jpeg or png (default: jpeg)',
            },
          },
          required: ['asset_id'],
        },
      },
      {
        name: 'ocr_pdf',
        description: 'Run OCR on a scanned PDF to produce a searchable text-layer PDF, preserving original appearance',
        inputSchema: {
          type: 'object',
          properties: {
            asset_id: {
              type: 'string',
              description: 'Asset ID of the scanned PDF to OCR',
            },
            ocr_lang: {
              type: 'string',
              description: 'Language for OCR recognition (default: en-US). Supports en-US, fr-FR, de-DE, ja-JP, etc.',
            },
            ocr_type: {
              type: 'string',
              description: 'OCR output type: searchableImage (preserve appearance) or searchableImageExact (exact match, default: searchableImage)',
            },
          },
          required: ['asset_id'],
        },
      },
      {
        name: 'compress_pdf',
        description: 'Compress a PDF to reduce file size while maintaining quality, with selectable compression level',
        inputSchema: {
          type: 'object',
          properties: {
            asset_id: {
              type: 'string',
              description: 'Asset ID of the PDF to compress',
            },
            compression_level: {
              type: 'string',
              description: 'Compression level: LOW (best quality), MEDIUM (balanced), HIGH (smallest size, default: MEDIUM)',
            },
          },
          required: ['asset_id'],
        },
      },
      {
        name: 'merge_pdfs',
        description: 'Combine multiple PDF documents into a single PDF in the specified order',
        inputSchema: {
          type: 'object',
          properties: {
            asset_ids: {
              type: 'array',
              description: 'Ordered array of asset IDs to merge into a single PDF (minimum 2)',
            },
          },
          required: ['asset_ids'],
        },
      },
      {
        name: 'split_pdf',
        description: 'Split a PDF into multiple smaller PDFs by page count, page ranges, or number of output files',
        inputSchema: {
          type: 'object',
          properties: {
            asset_id: {
              type: 'string',
              description: 'Asset ID of the PDF to split',
            },
            split_type: {
              type: 'string',
              description: 'Split method: pageCount (split every N pages), pageRanges (explicit ranges), or fileCount (equal parts)',
            },
            page_count: {
              type: 'number',
              description: 'Pages per output file when split_type is pageCount (e.g. 10)',
            },
            page_ranges: {
              type: 'array',
              description: 'Array of page ranges when split_type is pageRanges: [{start: 1, end: 5}, {start: 6, end: 10}]',
            },
            file_count: {
              type: 'number',
              description: 'Number of output files to split into when split_type is fileCount',
            },
          },
          required: ['asset_id', 'split_type'],
        },
      },
      {
        name: 'protect_pdf',
        description: 'Password-protect a PDF with owner and user passwords and set permission restrictions',
        inputSchema: {
          type: 'object',
          properties: {
            asset_id: {
              type: 'string',
              description: 'Asset ID of the PDF to protect',
            },
            owner_password: {
              type: 'string',
              description: 'Owner password (required) — grants full control of the document',
            },
            user_password: {
              type: 'string',
              description: 'User password (optional) — required to open the document',
            },
            encryption_algorithm: {
              type: 'string',
              description: 'Encryption algorithm: AES_128 or AES_256 (default: AES_256)',
            },
            content_encryption: {
              type: 'string',
              description: 'What to encrypt: ALL_CONTENT or ALL_CONTENT_EXCEPT_METADATA (default: ALL_CONTENT)',
            },
            permissions: {
              type: 'object',
              description: 'Permission restrictions: {print: "LOW_QUALITY", copy: false, edit: false, editNotes: false, fillAndSign: true, accessibility: true, assemble: false}',
            },
          },
          required: ['asset_id', 'owner_password'],
        },
      },
      {
        name: 'remove_protection',
        description: 'Remove password protection from a PDF using its owner or user password',
        inputSchema: {
          type: 'object',
          properties: {
            asset_id: {
              type: 'string',
              description: 'Asset ID of the protected PDF',
            },
            password: {
              type: 'string',
              description: 'Owner or user password to unlock the document',
            },
          },
          required: ['asset_id', 'password'],
        },
      },
      {
        name: 'watermark_pdf',
        description: 'Add a text or image watermark to all pages of a PDF document',
        inputSchema: {
          type: 'object',
          properties: {
            asset_id: {
              type: 'string',
              description: 'Asset ID of the PDF to watermark',
            },
            watermark_type: {
              type: 'string',
              description: 'Watermark type: Text or Image',
            },
            text: {
              type: 'string',
              description: 'Watermark text content (required when watermark_type is Text)',
            },
            font_name: {
              type: 'string',
              description: 'Font name for text watermark (default: Helvetica)',
            },
            font_size: {
              type: 'number',
              description: 'Font size in points for text watermark (default: 36)',
            },
            color: {
              type: 'string',
              description: 'Hex color for text watermark (default: #FF0000)',
            },
            opacity: {
              type: 'number',
              description: 'Watermark opacity 0-100 (default: 100)',
            },
            rotation: {
              type: 'number',
              description: 'Rotation angle in degrees: 0, 45, or 90 (default: 45)',
            },
            watermark_page_option: {
              type: 'string',
              description: 'Apply to: ALL_PAGES, FIRST_PAGE, or LAST_PAGE (default: ALL_PAGES)',
            },
            appear_on_foreground: {
              type: 'boolean',
              description: 'Place watermark on foreground (true) or background (false, default)',
            },
          },
          required: ['asset_id', 'watermark_type'],
        },
      },
      {
        name: 'get_pdf_properties',
        description: 'Extract document metadata and properties from a PDF (page count, dimensions, author, title, creation date)',
        inputSchema: {
          type: 'object',
          properties: {
            asset_id: {
              type: 'string',
              description: 'Asset ID of the PDF to inspect',
            },
          },
          required: ['asset_id'],
        },
      },
      {
        name: 'extract_pdf_content',
        description: 'Extract text, tables, and image references from a PDF into structured JSON (PDF Extract API)',
        inputSchema: {
          type: 'object',
          properties: {
            asset_id: {
              type: 'string',
              description: 'Asset ID of the PDF to extract content from',
            },
            elements_to_extract: {
              type: 'array',
              description: 'Elements to extract: ["text"], ["tables"], or ["text", "tables"] (default: ["text"])',
            },
            renditions_to_extract: {
              type: 'array',
              description: 'Renditions to include: ["tables"] for table images, ["figures"] for figure images (optional)',
            },
          },
          required: ['asset_id'],
        },
      },
      {
        name: 'linearize_pdf',
        description: 'Linearize (optimize for fast web view) a PDF so the first page renders before the full file downloads',
        inputSchema: {
          type: 'object',
          properties: {
            asset_id: {
              type: 'string',
              description: 'Asset ID of the PDF to linearize',
            },
          },
          required: ['asset_id'],
        },
      },
      {
        name: 'get_operation_status',
        description: 'Poll the status of an async Adobe PDF Services operation using its polling location URL',
        inputSchema: {
          type: 'object',
          properties: {
            polling_url: {
              type: 'string',
              description: 'Polling URL returned in the x-request-id header or location header of a submitted job',
            },
          },
          required: ['polling_url'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'upload_asset':
          return this.uploadAsset(args);
        case 'get_asset':
          return this.getAsset(args);
        case 'create_pdf_from_url':
          return this.createPdfFromUrl(args);
        case 'create_pdf_from_office':
          return this.createPdfFromOffice(args);
        case 'export_pdf_to_word':
          return this.exportPdfToWord(args);
        case 'export_pdf_to_excel':
          return this.exportPdfToExcel(args);
        case 'export_pdf_to_powerpoint':
          return this.exportPdfToPowerpoint(args);
        case 'export_pdf_to_image':
          return this.exportPdfToImage(args);
        case 'ocr_pdf':
          return this.ocrPdf(args);
        case 'compress_pdf':
          return this.compressPdf(args);
        case 'merge_pdfs':
          return this.mergePdfs(args);
        case 'split_pdf':
          return this.splitPdf(args);
        case 'protect_pdf':
          return this.protectPdf(args);
        case 'remove_protection':
          return this.removeProtection(args);
        case 'watermark_pdf':
          return this.watermarkPdf(args);
        case 'get_pdf_properties':
          return this.getPdfProperties(args);
        case 'extract_pdf_content':
          return this.extractPdfContent(args);
        case 'linearize_pdf':
          return this.linearizePdf(args);
        case 'get_operation_status':
          return this.getOperationStatus(args);
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

  private async authHeaders(): Promise<Record<string, string>> {
    const token = await this.getOrRefreshToken();
    return {
      Authorization: `Bearer ${token}`,
      'x-api-key': this.clientId,
      'Content-Type': 'application/json',
    };
  }

  private async submitJob(endpoint: string, body: unknown): Promise<ToolResult> {
    const headers = await this.authHeaders();
    const response = await this.fetchWithRetry(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (response.status === 201) {
      // Job submitted; location header contains polling URL
      const location = response.headers.get('x-request-id') ?? response.headers.get('location') ?? 'unknown';
      const pollUrl = response.headers.get('location') ?? `${this.baseUrl}${endpoint}/${location}`;
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            status: 'submitted',
            polling_url: pollUrl,
            request_id: location,
            message: 'Job submitted. Use get_operation_status with the polling_url to check completion.',
          }, null, 2),
        }],
        isError: false,
      };
    }

    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `API error: ${response.status} ${errText}` }], isError: true };
    }

    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Adobe PDF Services returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async uploadAsset(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.media_type) return { content: [{ type: 'text', text: 'media_type is required' }], isError: true };
    const headers = await this.authHeaders();
    const response = await this.fetchWithRetry(`${this.baseUrl}/assets`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ mediaType: args.media_type }),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Adobe PDF Services returned non-JSON (HTTP ${response.status})`); }
    return {
      content: [{
        type: 'text',
        text: this.truncate({
          ...(data as Record<string, unknown>),
          note: 'Use the uploadUri to PUT your file content (binary), then use assetID in subsequent operations.',
        }),
      }],
      isError: false,
    };
  }

  private async getAsset(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.asset_id) return { content: [{ type: 'text', text: 'asset_id is required' }], isError: true };
    const headers = await this.authHeaders();
    const response = await this.fetchWithRetry(`${this.baseUrl}/assets/${encodeURIComponent(args.asset_id as string)}`, {
      method: 'GET',
      headers,
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Adobe PDF Services returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async createPdfFromUrl(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.url) return { content: [{ type: 'text', text: 'url is required' }], isError: true };
    const body: Record<string, unknown> = {
      inputUrl: args.url,
    };
    if (args.include_header_footer !== undefined) body.includeHeaderFooter = args.include_header_footer;
    if (args.page_layout) body.pageLayout = args.page_layout;
    return this.submitJob('/operation/htmltopdf', body);
  }

  private async createPdfFromOffice(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.asset_id) return { content: [{ type: 'text', text: 'asset_id is required' }], isError: true };
    return this.submitJob('/operation/createpdf', { assetID: args.asset_id });
  }

  private async exportPdfToWord(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.asset_id) return { content: [{ type: 'text', text: 'asset_id is required' }], isError: true };
    const body: Record<string, unknown> = {
      assetID: args.asset_id,
      targetFormat: 'docx',
    };
    if (args.ocr_lang) body.ocrLang = args.ocr_lang;
    return this.submitJob('/operation/exportpdf', body);
  }

  private async exportPdfToExcel(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.asset_id) return { content: [{ type: 'text', text: 'asset_id is required' }], isError: true };
    const body: Record<string, unknown> = {
      assetID: args.asset_id,
      targetFormat: 'xlsx',
    };
    if (args.ocr_lang) body.ocrLang = args.ocr_lang;
    return this.submitJob('/operation/exportpdf', body);
  }

  private async exportPdfToPowerpoint(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.asset_id) return { content: [{ type: 'text', text: 'asset_id is required' }], isError: true };
    return this.submitJob('/operation/exportpdf', {
      assetID: args.asset_id,
      targetFormat: 'pptx',
    });
  }

  private async exportPdfToImage(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.asset_id) return { content: [{ type: 'text', text: 'asset_id is required' }], isError: true };
    return this.submitJob('/operation/exportpdftoimages', {
      assetID: args.asset_id,
      targetFormat: (args.output_type as string) ?? 'jpeg',
      outputType: 'listOfPageImages',
    });
  }

  private async ocrPdf(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.asset_id) return { content: [{ type: 'text', text: 'asset_id is required' }], isError: true };
    const body: Record<string, unknown> = { assetID: args.asset_id };
    if (args.ocr_lang) body.ocrLang = args.ocr_lang;
    if (args.ocr_type) body.ocrType = args.ocr_type;
    return this.submitJob('/operation/ocr', body);
  }

  private async compressPdf(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.asset_id) return { content: [{ type: 'text', text: 'asset_id is required' }], isError: true };
    const body: Record<string, unknown> = {
      assetID: args.asset_id,
      compressionLevel: (args.compression_level as string) ?? 'MEDIUM',
    };
    return this.submitJob('/operation/compresspdf', body);
  }

  private async mergePdfs(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.asset_ids || !Array.isArray(args.asset_ids) || (args.asset_ids as unknown[]).length < 2) {
      return { content: [{ type: 'text', text: 'asset_ids must be an array with at least 2 items' }], isError: true };
    }
    const assets = (args.asset_ids as string[]).map((id) => ({ assetID: id }));
    return this.submitJob('/operation/combinepdf', { assets });
  }

  private async splitPdf(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.asset_id || !args.split_type) {
      return { content: [{ type: 'text', text: 'asset_id and split_type are required' }], isError: true };
    }
    const body: Record<string, unknown> = { assetID: args.asset_id };
    const splitType = args.split_type as string;
    if (splitType === 'pageCount') {
      if (!args.page_count) return { content: [{ type: 'text', text: 'page_count required for pageCount split' }], isError: true };
      body.splitoption = { pageCount: args.page_count };
    } else if (splitType === 'pageRanges') {
      if (!args.page_ranges) return { content: [{ type: 'text', text: 'page_ranges required for pageRanges split' }], isError: true };
      body.splitoption = { pageRanges: args.page_ranges };
    } else if (splitType === 'fileCount') {
      if (!args.file_count) return { content: [{ type: 'text', text: 'file_count required for fileCount split' }], isError: true };
      body.splitoption = { fileCount: args.file_count };
    } else {
      return { content: [{ type: 'text', text: 'split_type must be pageCount, pageRanges, or fileCount' }], isError: true };
    }
    return this.submitJob('/operation/splitpdf', body);
  }

  private async protectPdf(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.asset_id || !args.owner_password) {
      return { content: [{ type: 'text', text: 'asset_id and owner_password are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      assetID: args.asset_id,
      passwordProtection: {
        ownerPassword: args.owner_password,
      },
      encryptionAlgorithm: (args.encryption_algorithm as string) ?? 'AES_256',
      contentEncryption: (args.content_encryption as string) ?? 'ALL_CONTENT',
    };
    if (args.user_password) {
      (body.passwordProtection as Record<string, unknown>).userPassword = args.user_password;
    }
    if (args.permissions) body.permissions = args.permissions;
    return this.submitJob('/operation/protectpdf', body);
  }

  private async removeProtection(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.asset_id || !args.password) {
      return { content: [{ type: 'text', text: 'asset_id and password are required' }], isError: true };
    }
    return this.submitJob('/operation/removeprotection', {
      assetID: args.asset_id,
      password: args.password,
    });
  }

  private async watermarkPdf(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.asset_id || !args.watermark_type) {
      return { content: [{ type: 'text', text: 'asset_id and watermark_type are required' }], isError: true };
    }
    const body: Record<string, unknown> = { assetID: args.asset_id };
    if ((args.watermark_type as string).toUpperCase() === 'TEXT') {
      if (!args.text) return { content: [{ type: 'text', text: 'text is required for text watermark' }], isError: true };
      const textWatermark: Record<string, unknown> = { text: args.text };
      if (args.font_name) textWatermark.fontName = args.font_name;
      if (args.font_size) textWatermark.fontSize = args.font_size;
      if (args.color) textWatermark.fontColor = args.color;
      if (args.opacity !== undefined) textWatermark.opacity = args.opacity;
      if (args.rotation !== undefined) textWatermark.rotation = args.rotation;
      body.watermark = { textWatermark };
    } else {
      if (!args.asset_id) return { content: [{ type: 'text', text: 'Image watermark type requires additional image asset configuration' }], isError: true };
      body.watermark = { imageWatermark: { assetID: args.asset_id } };
    }
    if (args.watermark_page_option) body.watermarkPageOption = args.watermark_page_option;
    if (args.appear_on_foreground !== undefined) body.appearOnForeground = args.appear_on_foreground;
    return this.submitJob('/operation/addwatermark', body);
  }

  private async getPdfProperties(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.asset_id) return { content: [{ type: 'text', text: 'asset_id is required' }], isError: true };
    return this.submitJob('/operation/pdfproperties', { assetID: args.asset_id });
  }

  private async extractPdfContent(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.asset_id) return { content: [{ type: 'text', text: 'asset_id is required' }], isError: true };
    const body: Record<string, unknown> = {
      assetID: args.asset_id,
      elementsToExtract: args.elements_to_extract ?? ['text'],
    };
    if (args.renditions_to_extract) body.renditionsToExtract = args.renditions_to_extract;
    return this.submitJob('/operation/extractpdf', body);
  }

  private async linearizePdf(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.asset_id) return { content: [{ type: 'text', text: 'asset_id is required' }], isError: true };
    return this.submitJob('/operation/linearizepdf', { assetID: args.asset_id });
  }

  private async getOperationStatus(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.polling_url) return { content: [{ type: 'text', text: 'polling_url is required' }], isError: true };
    const pollingUrl = args.polling_url as string;
    if (!pollingUrl.startsWith(this.baseUrl)) {
      return { content: [{ type: 'text', text: `Invalid polling_url: must start with ${this.baseUrl}` }], isError: true };
    }
    const headers = await this.authHeaders();
    const response = await this.fetchWithRetry(pollingUrl, {
      method: 'GET',
      headers,
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Adobe PDF Services returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }
}

/**
 * PDF Blocks MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03. PDF Blocks has not published an official MCP server.
//
// Base URL: https://api.pdfblocks.com (global) or https://eu.api.pdfblocks.com (EU-only)
// Auth: API key header — X-Api-Key: <api_key>
// Docs: https://www.pdfblocks.com/docs/api/v1
// Rate limits: Not publicly documented; enforced per account tier.
// Note: All endpoints accept multipart/form-data with binary file uploads.
//       This adapter accepts base64-encoded file content and converts to binary.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface PDFBlocksConfig {
  apiKey: string;
  baseUrl?: string;
}

export class PDFBlocksMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: PDFBlocksConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.pdfblocks.com';
  }

  static catalog() {
    return {
      name: 'pdfblocks',
      displayName: 'PDF Blocks',
      version: '1.0.0',
      category: 'productivity' as const,
      keywords: [
        'pdf', 'merge', 'password', 'watermark', 'pages', 'extract',
        'rotate', 'restrictions', 'signatures', 'pdf processing',
      ],
      toolNames: [
        'merge_documents',
        'add_password',
        'remove_password',
        'add_restrictions',
        'remove_restrictions',
        'add_text_watermark',
        'add_image_watermark',
        'extract_pages',
        'remove_pages',
        'reverse_pages',
        'rotate_pages',
        'remove_signatures',
      ],
      description: 'Secure PDF processing API: merge documents, add/remove passwords, apply watermarks, manipulate pages (extract, remove, rotate, reverse), and strip restrictions or signatures.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      // ── Document Operations ───────────────────────────────────────────────
      {
        name: 'merge_documents',
        description: 'Merge two or more PDF documents into a single PDF. Documents are merged in the order provided.',
        inputSchema: {
          type: 'object',
          properties: {
            files: {
              type: 'array',
              description: 'Array of base64-encoded PDF file contents to merge in order',
              items: { type: 'string' },
            },
            file_urls: {
              type: 'array',
              description: 'Array of publicly accessible PDF URLs to merge in order (alternative to files)',
              items: { type: 'string' },
            },
          },
        },
      },
      // ── Password ──────────────────────────────────────────────────────────
      {
        name: 'add_password',
        description: 'Add an open password to a PDF document. Returns the password-protected PDF.',
        inputSchema: {
          type: 'object',
          properties: {
            file: { type: 'string', description: 'Base64-encoded PDF file content' },
            file_url: { type: 'string', description: 'Publicly accessible PDF URL (alternative to file)' },
            password: { type: 'string', description: 'Password required to open the file (4–32 printable ASCII characters)' },
            encryption_algorithm: { type: 'string', description: 'Encryption algorithm: AES-128 or AES-256 (default: AES-128)' },
          },
          required: ['password'],
        },
      },
      {
        name: 'remove_password',
        description: 'Remove the open password from a password-protected PDF document.',
        inputSchema: {
          type: 'object',
          properties: {
            file: { type: 'string', description: 'Base64-encoded PDF file content' },
            file_url: { type: 'string', description: 'Publicly accessible PDF URL (alternative to file)' },
            password: { type: 'string', description: 'Current password required to open the file' },
          },
          required: ['password'],
        },
      },
      // ── Restrictions ──────────────────────────────────────────────────────
      {
        name: 'add_restrictions',
        description: 'Add permissions restrictions to a PDF: control printing, copying, editing, annotations, and form filling.',
        inputSchema: {
          type: 'object',
          properties: {
            file: { type: 'string', description: 'Base64-encoded PDF file content' },
            file_url: { type: 'string', description: 'Publicly accessible PDF URL (alternative to file)' },
            allow_print: { type: 'boolean', description: 'Allow printing (default: true)' },
            allow_copy_content: { type: 'boolean', description: 'Allow copying text and images (default: true)' },
            allow_change_content: { type: 'boolean', description: 'Allow content changes (default: true)' },
            allow_fill_form: { type: 'boolean', description: 'Allow form field filling (default: true)' },
            allow_comment_and_fill_form: { type: 'boolean', description: 'Allow annotations and form filling (default: true)' },
            allow_assemble_document: { type: 'boolean', description: 'Allow document assembly (default: true)' },
            allow_accessibility: { type: 'boolean', description: 'Allow accessibility program access (default: true)' },
          },
        },
      },
      {
        name: 'remove_restrictions',
        description: 'Remove all permissions restrictions from a PDF document.',
        inputSchema: {
          type: 'object',
          properties: {
            file: { type: 'string', description: 'Base64-encoded PDF file content' },
            file_url: { type: 'string', description: 'Publicly accessible PDF URL (alternative to file)' },
          },
        },
      },
      // ── Watermarks ────────────────────────────────────────────────────────
      {
        name: 'add_text_watermark',
        description: 'Add a text watermark (up to 3 lines) to every page of a PDF document.',
        inputSchema: {
          type: 'object',
          properties: {
            file: { type: 'string', description: 'Base64-encoded PDF file content' },
            file_url: { type: 'string', description: 'Publicly accessible PDF URL (alternative to file)' },
            line_1: { type: 'string', description: 'First line of the watermark text (max 32 characters)' },
            line_2: { type: 'string', description: 'Second line of the watermark text (max 32 characters)' },
            line_3: { type: 'string', description: 'Third line of the watermark text (max 32 characters)' },
            color: { type: 'string', description: 'Text color: Red, Blue, Gray, or Black (default: Gray)' },
            margin: { type: 'number', description: 'Distance in inches from page border to watermark (default: 1)' },
            template: { type: 'number', description: 'Watermark layout template ID (default: 1001)' },
          },
        },
      },
      {
        name: 'add_image_watermark',
        description: 'Add a PNG or JPEG image as a watermark to every page of a PDF document.',
        inputSchema: {
          type: 'object',
          properties: {
            file: { type: 'string', description: 'Base64-encoded PDF file content' },
            file_url: { type: 'string', description: 'Publicly accessible PDF URL (alternative to file)' },
            image: { type: 'string', description: 'Base64-encoded PNG or JPEG image to use as watermark' },
            image_url: { type: 'string', description: 'Publicly accessible PNG or JPEG URL (alternative to image)' },
            transparency: { type: 'number', description: 'Watermark transparency from 0 (opaque) to 100 (transparent, default: 50)' },
            margin: { type: 'number', description: 'Distance in inches from page border to image watermark (default: 1)' },
          },
        },
      },
      // ── Page Operations ───────────────────────────────────────────────────
      {
        name: 'extract_pages',
        description: 'Extract a range of pages from a PDF document into a new PDF.',
        inputSchema: {
          type: 'object',
          properties: {
            file: { type: 'string', description: 'Base64-encoded PDF file content' },
            file_url: { type: 'string', description: 'Publicly accessible PDF URL (alternative to file)' },
            first_page: { type: 'number', description: 'First page of range to extract (default: first page)' },
            last_page: { type: 'number', description: 'Last page of range to extract (default: last page)' },
          },
        },
      },
      {
        name: 'remove_pages',
        description: 'Remove a range of pages from a PDF document.',
        inputSchema: {
          type: 'object',
          properties: {
            file: { type: 'string', description: 'Base64-encoded PDF file content' },
            file_url: { type: 'string', description: 'Publicly accessible PDF URL (alternative to file)' },
            first_page: { type: 'number', description: 'First page of range to remove (default: first page)' },
            last_page: { type: 'number', description: 'Last page of range to remove (default: last page)' },
          },
        },
      },
      {
        name: 'reverse_pages',
        description: 'Reverse the page order of a PDF document so the last page becomes first.',
        inputSchema: {
          type: 'object',
          properties: {
            file: { type: 'string', description: 'Base64-encoded PDF file content' },
            file_url: { type: 'string', description: 'Publicly accessible PDF URL (alternative to file)' },
          },
        },
      },
      {
        name: 'rotate_pages',
        description: 'Rotate a range of pages in a PDF document by a specified angle.',
        inputSchema: {
          type: 'object',
          properties: {
            file: { type: 'string', description: 'Base64-encoded PDF file content' },
            file_url: { type: 'string', description: 'Publicly accessible PDF URL (alternative to file)' },
            angle: { type: 'number', description: 'Rotation angle in degrees: 90, 180, 270, -90, -180, or -270' },
            first_page: { type: 'number', description: 'First page of range to rotate (default: first page)' },
            last_page: { type: 'number', description: 'Last page of range to rotate (default: last page)' },
          },
          required: ['angle'],
        },
      },
      // ── Signatures ────────────────────────────────────────────────────────
      {
        name: 'remove_signatures',
        description: 'Remove all digital signatures from a PDF document.',
        inputSchema: {
          type: 'object',
          properties: {
            file: { type: 'string', description: 'Base64-encoded PDF file content' },
            file_url: { type: 'string', description: 'Publicly accessible PDF URL (alternative to file)' },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'merge_documents':     return await this.mergeDocuments(args);
        case 'add_password':        return await this.addPassword(args);
        case 'remove_password':     return await this.removePassword(args);
        case 'add_restrictions':    return await this.addRestrictions(args);
        case 'remove_restrictions': return await this.removeRestrictions(args);
        case 'add_text_watermark':  return await this.addTextWatermark(args);
        case 'add_image_watermark': return await this.addImageWatermark(args);
        case 'extract_pages':       return await this.extractPages(args);
        case 'remove_pages':        return await this.removePages(args);
        case 'reverse_pages':       return await this.reversePages(args);
        case 'rotate_pages':        return await this.rotatePages(args);
        case 'remove_signatures':   return await this.removeSignatures(args);
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

  private buildFormData(
    args: Record<string, unknown>,
    fileFields: string[] = ['file'],
    extraStringFields: string[] = [],
    extraNumberFields: string[] = [],
    extraBoolFields: string[] = [],
  ): FormData {
    const form = new FormData();

    // Binary file fields: accept base64 string, decode to Blob
    for (const field of fileFields) {
      if (args[field]) {
        const b64 = args[field] as string;
        const binary = atob(b64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        form.append(field, new Blob([bytes], { type: 'application/octet-stream' }), `${field}.pdf`);
      }
    }

    for (const field of extraStringFields) {
      if (args[field] !== undefined) form.append(field, String(args[field]));
    }
    for (const field of extraNumberFields) {
      if (args[field] !== undefined) form.append(field, String(args[field]));
    }
    for (const field of extraBoolFields) {
      if (args[field] !== undefined) form.append(field, String(args[field]));
    }

    return form;
  }

  private async apiRequest(path: string, form: FormData): Promise<ToolResult> {
    const url = `${this.baseUrl}${path}`;
    const response = await this.fetchWithRetry(url, {
      method: 'POST',
      headers: { 'X-Api-Key': this.apiKey },
      body: form,
    });

    if (!response.ok) {
      let detail = '';
      try { detail = await response.text(); } catch { /* ignore */ }
      return {
        content: [{ type: 'text', text: `PDF Blocks API error ${response.status} ${response.statusText}${detail ? ': ' + detail.slice(0, 400) : ''}` }],
        isError: true,
      };
    }

    // Successful response is the binary PDF; return content-type and size info
    const contentType = response.headers.get('content-type') || 'application/pdf';
    const buffer = await response.arrayBuffer();
    const bytes = buffer.byteLength;
    const b64 = Buffer.from(buffer).toString('base64');

    const preview = `PDF Blocks success. Content-Type: ${contentType}. Size: ${bytes} bytes.\nBase64 output (first 500 chars): ${b64.slice(0, 500)}${b64.length > 500 ? '...' : ''}`;
    const truncated = preview.length > 10_000
      ? preview.slice(0, 10_000) + `\n... [truncated, ${preview.length} total chars]`
      : preview;
    return { content: [{ type: 'text', text: truncated }], isError: false };
  }

  // ── Document Operations ────────────────────────────────────────────────────

  private async mergeDocuments(args: Record<string, unknown>): Promise<ToolResult> {
    const form = new FormData();
    const files = (args.files as string[] | undefined) || [];
    for (const b64 of files) {
      const binary = atob(b64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      form.append('file', new Blob([bytes], { type: 'application/pdf' }), 'document.pdf');
    }
    return this.apiRequest('/v1/merge_documents', form);
  }

  private async addPassword(args: Record<string, unknown>): Promise<ToolResult> {
    const form = this.buildFormData(args, ['file'], ['password', 'encryption_algorithm']);
    return this.apiRequest('/v1/add_password', form);
  }

  private async removePassword(args: Record<string, unknown>): Promise<ToolResult> {
    const form = this.buildFormData(args, ['file'], ['password']);
    return this.apiRequest('/v1/remove_password', form);
  }

  private async addRestrictions(args: Record<string, unknown>): Promise<ToolResult> {
    const form = this.buildFormData(
      args,
      ['file'],
      [],
      [],
      ['allow_print', 'allow_copy_content', 'allow_change_content', 'allow_fill_form',
       'allow_comment_and_fill_form', 'allow_assemble_document', 'allow_accessibility'],
    );
    return this.apiRequest('/v1/add_restrictions', form);
  }

  private async removeRestrictions(args: Record<string, unknown>): Promise<ToolResult> {
    const form = this.buildFormData(args, ['file']);
    return this.apiRequest('/v1/remove_restrictions', form);
  }

  private async addTextWatermark(args: Record<string, unknown>): Promise<ToolResult> {
    const form = this.buildFormData(args, ['file'], ['line_1', 'line_2', 'line_3', 'color'], ['margin', 'template']);
    return this.apiRequest('/v1/add_watermark/text', form);
  }

  private async addImageWatermark(args: Record<string, unknown>): Promise<ToolResult> {
    const form = this.buildFormData(args, ['file', 'image'], [], ['transparency', 'margin']);
    return this.apiRequest('/v1/add_watermark/image', form);
  }

  private async extractPages(args: Record<string, unknown>): Promise<ToolResult> {
    const form = this.buildFormData(args, ['file'], [], ['first_page', 'last_page']);
    return this.apiRequest('/v1/extract_pages', form);
  }

  private async removePages(args: Record<string, unknown>): Promise<ToolResult> {
    const form = this.buildFormData(args, ['file'], [], ['first_page', 'last_page']);
    return this.apiRequest('/v1/remove_pages', form);
  }

  private async reversePages(args: Record<string, unknown>): Promise<ToolResult> {
    const form = this.buildFormData(args, ['file']);
    return this.apiRequest('/v1/reverse_pages', form);
  }

  private async rotatePages(args: Record<string, unknown>): Promise<ToolResult> {
    const form = this.buildFormData(args, ['file'], [], ['angle', 'first_page', 'last_page']);
    return this.apiRequest('/v1/rotate_pages', form);
  }

  private async removeSignatures(args: Record<string, unknown>): Promise<ToolResult> {
    const form = this.buildFormData(args, ['file']);
    return this.apiRequest('/v1/remove_signatures', form);
  }
}

/**
 * Cloudmersive OCR MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// No official Cloudmersive OCR MCP server was found on GitHub.
// Cloudmersive provides OCR, image preprocessing, and document recognition
// as REST APIs. We build a full REST wrapper covering image OCR, PDF OCR,
// photo document recognition (business cards, receipts, forms), and image
// preprocessing utilities (binarize, unrotate, unskew, page angle detection).
//
// Base URL: https://api.cloudmersive.com
// Auth: API key in request header — Apikey: <YOUR_API_KEY>
// Docs: https://api.cloudmersive.com/docs/ocr.asp
// Rate limits: Free tier ~800 calls/month; paid plans vary by subscription

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface CloudmersiveOCRConfig {
  apiKey: string;
  baseUrl?: string;
}

export class CloudmersiveOCRMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: CloudmersiveOCRConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.cloudmersive.com';
  }

  static catalog() {
    return {
      name: 'cloudmersive-ocr',
      displayName: 'Cloudmersive OCR',
      version: '1.0.0',
      category: 'engineering',
      keywords: [
        'cloudmersive', 'ocr', 'optical character recognition', 'text extraction',
        'document', 'image', 'pdf', 'scan', 'receipt', 'business card', 'form',
        'photo', 'binarize', 'unrotate', 'unskew', 'preprocessing', 'invoice',
        'structured data', 'word location', 'line location', 'page angle',
      ],
      toolNames: [
        'image_to_text',
        'image_to_lines_with_location',
        'image_to_words_with_location',
        'pdf_to_text',
        'pdf_to_lines_with_location',
        'pdf_to_words_with_location',
        'photo_to_text',
        'photo_to_words_with_location',
        'recognize_business_card',
        'recognize_receipt',
        'recognize_form',
        'recognize_form_advanced',
        'receipt_to_csv',
        'preprocess_binarize',
        'preprocess_binarize_advanced',
        'preprocess_get_page_angle',
        'preprocess_unrotate',
        'preprocess_unrotate_advanced',
        'preprocess_unskew',
      ],
      description: 'Cloudmersive OCR API: extract text from images and PDFs, recognize business cards, receipts and forms, and preprocess documents with binarize, unrotate, and unskew operations.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      // ── Image OCR ──────────────────────────────────────────────────────────
      {
        name: 'image_to_text',
        description: 'Convert a scanned image (JPEG, PNG) to plain text via OCR — intended for scanned documents, not smartphone photos',
        inputSchema: {
          type: 'object',
          properties: {
            imageBase64: {
              type: 'string',
              description: 'Base64-encoded image file content (JPEG, PNG, etc.)',
            },
            recognitionMode: {
              type: 'string',
              description: 'Recognition mode: Basic (fast, 1-2 API calls/page), Normal (fault-tolerant, 26-30 calls), Advanced (highest quality, 28-30 calls). Default: Basic',
            },
            language: {
              type: 'string',
              description: 'Language code: ENG (English), ARA (Arabic), ZHO (Chinese Simplified), ZHO-HANT (Chinese Traditional), FRA (French), DEU (German), etc. Default: ENG',
            },
            preprocessing: {
              type: 'string',
              description: 'Preprocessing mode: Auto (default), DropShadow, DisablePreprocessing',
            },
          },
          required: ['imageBase64'],
        },
      },
      {
        name: 'image_to_lines_with_location',
        description: 'Convert a scanned image to text lines with bounding box location data for each line — returns structured line/position metadata',
        inputSchema: {
          type: 'object',
          properties: {
            imageBase64: {
              type: 'string',
              description: 'Base64-encoded image file content (JPEG, PNG, etc.)',
            },
            language: {
              type: 'string',
              description: 'Language code: ENG (default), ARA, ZHO, FRA, DEU, etc.',
            },
            preprocessing: {
              type: 'string',
              description: 'Preprocessing mode: Auto (default), DropShadow, DisablePreprocessing',
            },
          },
          required: ['imageBase64'],
        },
      },
      {
        name: 'image_to_words_with_location',
        description: 'Convert a scanned image to individual words with bounding box coordinates for each word — enables word-level positional analysis',
        inputSchema: {
          type: 'object',
          properties: {
            imageBase64: {
              type: 'string',
              description: 'Base64-encoded image file content (JPEG, PNG, etc.)',
            },
            language: {
              type: 'string',
              description: 'Language code: ENG (default), ARA, ZHO, FRA, DEU, etc.',
            },
            preprocessing: {
              type: 'string',
              description: 'Preprocessing mode: Auto (default), DropShadow, DisablePreprocessing',
            },
          },
          required: ['imageBase64'],
        },
      },
      // ── PDF OCR ────────────────────────────────────────────────────────────
      {
        name: 'pdf_to_text',
        description: 'Convert a PDF file to plain text via OCR — supports multi-page PDFs, intended for scanned documents',
        inputSchema: {
          type: 'object',
          properties: {
            pdfBase64: {
              type: 'string',
              description: 'Base64-encoded PDF file content',
            },
            recognitionMode: {
              type: 'string',
              description: 'Recognition mode: Basic (1-2 calls/page), Normal (26-30 calls), Advanced (28-30 calls). Default: Basic',
            },
            language: {
              type: 'string',
              description: 'Language code: ENG (default), ARA, ZHO, FRA, DEU, etc.',
            },
            preprocessing: {
              type: 'string',
              description: 'Preprocessing mode: Auto (default), DropShadow, DisablePreprocessing',
            },
          },
          required: ['pdfBase64'],
        },
      },
      {
        name: 'pdf_to_lines_with_location',
        description: 'Convert a PDF to text lines with bounding box location data per line — returns structured positional line metadata across all pages',
        inputSchema: {
          type: 'object',
          properties: {
            pdfBase64: {
              type: 'string',
              description: 'Base64-encoded PDF file content',
            },
            language: {
              type: 'string',
              description: 'Language code: ENG (default), ARA, ZHO, FRA, DEU, etc.',
            },
            preprocessing: {
              type: 'string',
              description: 'Preprocessing mode: Auto (default), DropShadow, DisablePreprocessing',
            },
          },
          required: ['pdfBase64'],
        },
      },
      {
        name: 'pdf_to_words_with_location',
        description: 'Convert a PDF to individual words with bounding box coordinates per word — enables word-level positional analysis across all PDF pages',
        inputSchema: {
          type: 'object',
          properties: {
            pdfBase64: {
              type: 'string',
              description: 'Base64-encoded PDF file content',
            },
            language: {
              type: 'string',
              description: 'Language code: ENG (default), ARA, ZHO, FRA, DEU, etc.',
            },
            preprocessing: {
              type: 'string',
              description: 'Preprocessing mode: Auto (default), DropShadow, DisablePreprocessing',
            },
          },
          required: ['pdfBase64'],
        },
      },
      // ── Photo OCR ──────────────────────────────────────────────────────────
      {
        name: 'photo_to_text',
        description: 'Convert a photo of a document to text via OCR — designed for smartphone photos, handles skew, rotation, and background content',
        inputSchema: {
          type: 'object',
          properties: {
            imageBase64: {
              type: 'string',
              description: 'Base64-encoded photo of a document (JPEG, PNG)',
            },
            recognitionMode: {
              type: 'string',
              description: 'Recognition mode: Basic (fast) or Advanced (higher quality). Default: Basic',
            },
            language: {
              type: 'string',
              description: 'Language code: ENG (default), ARA, ZHO, FRA, DEU, etc.',
            },
          },
          required: ['imageBase64'],
        },
      },
      {
        name: 'photo_to_words_with_location',
        description: 'Convert a photo of a document or receipt to words with bounding box coordinates — for photos taken with smartphones, not scanners',
        inputSchema: {
          type: 'object',
          properties: {
            imageBase64: {
              type: 'string',
              description: 'Base64-encoded photo of a document or receipt (JPEG, PNG)',
            },
            recognitionMode: {
              type: 'string',
              description: 'Recognition mode: Normal (highly fault tolerant, default) or Basic',
            },
            language: {
              type: 'string',
              description: 'Language code: ENG (default), ARA, ZHO, FRA, DEU, etc.',
            },
            preprocessing: {
              type: 'string',
              description: 'Preprocessing mode: Auto (default), DropShadow, DisablePreprocessing',
            },
            diagnostics: {
              type: 'string',
              description: 'Enable diagnostics output: true or false (default: false)',
            },
          },
          required: ['imageBase64'],
        },
      },
      // ── Document Recognition ───────────────────────────────────────────────
      {
        name: 'recognize_business_card',
        description: 'Recognize a photo of a business card and extract structured fields: person name, title, company, address, phone, and email',
        inputSchema: {
          type: 'object',
          properties: {
            imageBase64: {
              type: 'string',
              description: 'Base64-encoded photo of a business card (JPEG, PNG)',
            },
          },
          required: ['imageBase64'],
        },
      },
      {
        name: 'recognize_receipt',
        description: 'Recognize a photo of a receipt and extract structured data: business name, address, total, line items, date, and phone number',
        inputSchema: {
          type: 'object',
          properties: {
            imageBase64: {
              type: 'string',
              description: 'Base64-encoded photo of a receipt (JPEG, PNG)',
            },
            recognitionMode: {
              type: 'string',
              description: 'Recognition mode: Normal (default) or Advanced (includes handwriting)',
            },
            language: {
              type: 'string',
              description: 'Language code: ENG (default), ARA, ZHO, FRA, DEU, etc.',
            },
            preprocessing: {
              type: 'string',
              description: 'Preprocessing mode: None (default), Auto, DropShadow',
            },
          },
          required: ['imageBase64'],
        },
      },
      {
        name: 'recognize_form',
        description: 'Recognize a photo of a form and extract key business fields using custom field definitions provided as a template',
        inputSchema: {
          type: 'object',
          properties: {
            imageBase64: {
              type: 'string',
              description: 'Base64-encoded photo of a form (JPEG, PNG)',
            },
            formTemplateDefinition: {
              type: 'string',
              description: 'JSON string defining form field extraction template (optional; omit for auto-extraction)',
            },
            recognitionMode: {
              type: 'string',
              description: 'Recognition mode: Normal (default) or Advanced (enables handwriting)',
            },
            preprocessing: {
              type: 'string',
              description: 'Preprocessing mode: Auto (default), DropShadow, DisablePreprocessing',
            },
            diagnostics: {
              type: 'string',
              description: 'Enable diagnostics output: true or false (default: false)',
            },
            language: {
              type: 'string',
              description: 'Language code: ENG (default), ARA, ZHO, FRA, DEU, etc.',
            },
          },
          required: ['imageBase64'],
        },
      },
      {
        name: 'recognize_form_advanced',
        description: 'Recognize a photo of a form using stored template definitions from a Cloudmersive configuration bucket — requires bucket ID and secret key',
        inputSchema: {
          type: 'object',
          properties: {
            imageBase64: {
              type: 'string',
              description: 'Base64-encoded photo of a form (JPEG, PNG)',
            },
            bucketID: {
              type: 'string',
              description: 'Cloudmersive configuration bucket ID storing the form template',
            },
            bucketSecretKey: {
              type: 'string',
              description: 'Cloudmersive configuration bucket secret key',
            },
            recognitionMode: {
              type: 'string',
              description: 'Recognition mode: Normal (default) or Advanced (enables handwriting)',
            },
            preprocessing: {
              type: 'string',
              description: 'Preprocessing mode: Auto (default), DropShadow, DisablePreprocessing',
            },
            diagnostics: {
              type: 'string',
              description: 'Enable diagnostics output: true or false (default: false)',
            },
          },
          required: ['imageBase64', 'bucketID', 'bucketSecretKey'],
        },
      },
      {
        name: 'receipt_to_csv',
        description: 'Convert a photo of a receipt into a structured CSV file containing line items, totals, and business information',
        inputSchema: {
          type: 'object',
          properties: {
            imageBase64: {
              type: 'string',
              description: 'Base64-encoded photo of a receipt (JPEG, PNG)',
            },
          },
          required: ['imageBase64'],
        },
      },
      // ── Preprocessing ──────────────────────────────────────────────────────
      {
        name: 'preprocess_binarize',
        description: 'Apply adaptive binarization to a document image, converting to high-contrast black and white to improve OCR accuracy',
        inputSchema: {
          type: 'object',
          properties: {
            imageBase64: {
              type: 'string',
              description: 'Base64-encoded image to binarize (JPEG, PNG)',
            },
          },
          required: ['imageBase64'],
        },
      },
      {
        name: 'preprocess_binarize_advanced',
        description: 'Apply deep learning-based advanced adaptive binarization to a document image — higher accuracy than standard binarize, upsamples to 300 DPI',
        inputSchema: {
          type: 'object',
          properties: {
            imageBase64: {
              type: 'string',
              description: 'Base64-encoded image to binarize with ML (JPEG, PNG)',
            },
          },
          required: ['imageBase64'],
        },
      },
      {
        name: 'preprocess_get_page_angle',
        description: 'Detect the rotation angle of a document image in radians — useful to determine if unrotation is needed before OCR',
        inputSchema: {
          type: 'object',
          properties: {
            imageBase64: {
              type: 'string',
              description: 'Base64-encoded document image to measure rotation angle (JPEG, PNG)',
            },
          },
          required: ['imageBase64'],
        },
      },
      {
        name: 'preprocess_unrotate',
        description: 'Detect and correct rotation in a scanned document image — straightens pages scanned at an angle for improved OCR and PDF conversion',
        inputSchema: {
          type: 'object',
          properties: {
            imageBase64: {
              type: 'string',
              description: 'Base64-encoded rotated document image to unrotate (JPEG, PNG)',
            },
          },
          required: ['imageBase64'],
        },
      },
      {
        name: 'preprocess_unrotate_advanced',
        description: 'Detect and correct rotation in a document image using deep learning — more accurate than standard unrotate for complex cases',
        inputSchema: {
          type: 'object',
          properties: {
            imageBase64: {
              type: 'string',
              description: 'Base64-encoded rotated document image to unrotate with deep learning (JPEG, PNG)',
            },
          },
          required: ['imageBase64'],
        },
      },
      {
        name: 'preprocess_unskew',
        description: 'Detect and correct perspective skew in a photo of a document — straightens documents photographed at an angle',
        inputSchema: {
          type: 'object',
          properties: {
            imageBase64: {
              type: 'string',
              description: 'Base64-encoded skewed document photo to correct (JPEG, PNG)',
            },
          },
          required: ['imageBase64'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'image_to_text':
          return this.imageToText(args);
        case 'image_to_lines_with_location':
          return this.imageToLinesWithLocation(args);
        case 'image_to_words_with_location':
          return this.imageToWordsWithLocation(args);
        case 'pdf_to_text':
          return this.pdfToText(args);
        case 'pdf_to_lines_with_location':
          return this.pdfToLinesWithLocation(args);
        case 'pdf_to_words_with_location':
          return this.pdfToWordsWithLocation(args);
        case 'photo_to_text':
          return this.photoToText(args);
        case 'photo_to_words_with_location':
          return this.photoToWordsWithLocation(args);
        case 'recognize_business_card':
          return this.recognizeBusinessCard(args);
        case 'recognize_receipt':
          return this.recognizeReceipt(args);
        case 'recognize_form':
          return this.recognizeForm(args);
        case 'recognize_form_advanced':
          return this.recognizeFormAdvanced(args);
        case 'receipt_to_csv':
          return this.receiptToCsv(args);
        case 'preprocess_binarize':
          return this.preprocessBinarize(args);
        case 'preprocess_binarize_advanced':
          return this.preprocessBinarizeAdvanced(args);
        case 'preprocess_get_page_angle':
          return this.preprocessGetPageAngle(args);
        case 'preprocess_unrotate':
          return this.preprocessUnrotate(args);
        case 'preprocess_unrotate_advanced':
          return this.preprocessUnrotateAdvanced(args);
        case 'preprocess_unskew':
          return this.preprocessUnskew(args);
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

  // ── Private helpers ────────────────────────────────────────────────────────

  /**
   * Build a multipart/form-data body from a base64-encoded file.
   * Returns { body, contentType } where contentType includes the boundary.
   */
  private buildFormData(base64: string, fieldName: string): { body: Uint8Array; contentType: string } {
    const boundary = '----EpicAIBoundary' + Math.random().toString(36).slice(2);
    const fileBytes = Buffer.from(base64, 'base64');
    const header = `--${boundary}\r\nContent-Disposition: form-data; name="${fieldName}"; filename="file"\r\nContent-Type: application/octet-stream\r\n\r\n`;
    const footer = `\r\n--${boundary}--\r\n`;
    const headerBytes = Buffer.from(header, 'utf8');
    const footerBytes = Buffer.from(footer, 'utf8');
    const body = Buffer.concat([headerBytes, fileBytes, footerBytes]);
    return { body: new Uint8Array(body), contentType: `multipart/form-data; boundary=${boundary}` };
  }

  private async postMultipart(
    path: string,
    imageBase64: string,
    fieldName: string,
    headers: Record<string, string>,
  ): Promise<ToolResult> {
    const { body, contentType } = this.buildFormData(imageBase64, fieldName);

    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': contentType },
      body,
    });

    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }

    const respContentType = response.headers.get('content-type') ?? '';
    if (respContentType.includes('application/json') || respContentType.includes('text/json')) {
      const data = await response.json() as unknown;
      return {
        content: [{ type: 'text', text: this.truncate(data) }],
        isError: false,
      };
    }

    // Binary response (binarized image bytes) — return base64
    const buffer = await response.arrayBuffer();
    const b64 = Buffer.from(buffer).toString('base64');
    return {
      content: [{ type: 'text', text: JSON.stringify({ resultBase64: b64, bytes: buffer.byteLength }) }],
      isError: false,
    };
  }

  private authHeaders(extra: Record<string, string> = {}): Record<string, string> {
    return {
      'Apikey': this.apiKey,
      'Accept': 'application/json',
      ...extra,
    };
  }

  // ── Image OCR ──────────────────────────────────────────────────────────────

  private async imageToText(args: Record<string, unknown>): Promise<ToolResult> {
    const headers = this.authHeaders();
    if (args.recognitionMode) headers['recognitionMode'] = String(args.recognitionMode);
    if (args.language) headers['language'] = String(args.language);
    if (args.preprocessing) headers['preprocessing'] = String(args.preprocessing);
    return this.postMultipart('/ocr/image/toText', String(args.imageBase64), 'imageFile', headers);
  }

  private async imageToLinesWithLocation(args: Record<string, unknown>): Promise<ToolResult> {
    const headers = this.authHeaders();
    if (args.language) headers['language'] = String(args.language);
    if (args.preprocessing) headers['preprocessing'] = String(args.preprocessing);
    return this.postMultipart('/ocr/image/to/lines-with-location', String(args.imageBase64), 'imageFile', headers);
  }

  private async imageToWordsWithLocation(args: Record<string, unknown>): Promise<ToolResult> {
    const headers = this.authHeaders();
    if (args.language) headers['language'] = String(args.language);
    if (args.preprocessing) headers['preprocessing'] = String(args.preprocessing);
    return this.postMultipart('/ocr/image/to/words-with-location', String(args.imageBase64), 'imageFile', headers);
  }

  // ── PDF OCR ────────────────────────────────────────────────────────────────

  private async pdfToText(args: Record<string, unknown>): Promise<ToolResult> {
    const headers = this.authHeaders();
    if (args.recognitionMode) headers['recognitionMode'] = String(args.recognitionMode);
    if (args.language) headers['language'] = String(args.language);
    if (args.preprocessing) headers['preprocessing'] = String(args.preprocessing);
    return this.postMultipart('/ocr/pdf/toText', String(args.pdfBase64), 'imageFile', headers);
  }

  private async pdfToLinesWithLocation(args: Record<string, unknown>): Promise<ToolResult> {
    const headers = this.authHeaders();
    if (args.language) headers['language'] = String(args.language);
    if (args.preprocessing) headers['preprocessing'] = String(args.preprocessing);
    return this.postMultipart('/ocr/pdf/to/lines-with-location', String(args.pdfBase64), 'imageFile', headers);
  }

  private async pdfToWordsWithLocation(args: Record<string, unknown>): Promise<ToolResult> {
    const headers = this.authHeaders();
    if (args.language) headers['language'] = String(args.language);
    if (args.preprocessing) headers['preprocessing'] = String(args.preprocessing);
    return this.postMultipart('/ocr/pdf/to/words-with-location', String(args.pdfBase64), 'imageFile', headers);
  }

  // ── Photo OCR ──────────────────────────────────────────────────────────────

  private async photoToText(args: Record<string, unknown>): Promise<ToolResult> {
    const headers = this.authHeaders();
    if (args.recognitionMode) headers['recognitionMode'] = String(args.recognitionMode);
    if (args.language) headers['language'] = String(args.language);
    return this.postMultipart('/ocr/photo/toText', String(args.imageBase64), 'imageFile', headers);
  }

  private async photoToWordsWithLocation(args: Record<string, unknown>): Promise<ToolResult> {
    const headers = this.authHeaders();
    if (args.recognitionMode) headers['recognitionMode'] = String(args.recognitionMode);
    if (args.language) headers['language'] = String(args.language);
    if (args.preprocessing) headers['preprocessing'] = String(args.preprocessing);
    if (args.diagnostics) headers['diagnostics'] = String(args.diagnostics);
    return this.postMultipart('/ocr/photo/to/words-with-location', String(args.imageBase64), 'imageFile', headers);
  }

  // ── Document Recognition ───────────────────────────────────────────────────

  private async recognizeBusinessCard(args: Record<string, unknown>): Promise<ToolResult> {
    return this.postMultipart('/ocr/photo/recognize/business-card', String(args.imageBase64), 'imageFile', this.authHeaders());
  }

  private async recognizeReceipt(args: Record<string, unknown>): Promise<ToolResult> {
    const headers = this.authHeaders();
    if (args.recognitionMode) headers['recognitionMode'] = String(args.recognitionMode);
    if (args.language) headers['language'] = String(args.language);
    if (args.preprocessing) headers['preprocessing'] = String(args.preprocessing);
    return this.postMultipart('/ocr/photo/recognize/receipt', String(args.imageBase64), 'imageFile', headers);
  }

  private async recognizeForm(args: Record<string, unknown>): Promise<ToolResult> {
    const headers = this.authHeaders();
    if (args.formTemplateDefinition) headers['formTemplateDefinition'] = String(args.formTemplateDefinition);
    if (args.recognitionMode) headers['recognitionMode'] = String(args.recognitionMode);
    if (args.preprocessing) headers['preprocessing'] = String(args.preprocessing);
    if (args.diagnostics) headers['diagnostics'] = String(args.diagnostics);
    if (args.language) headers['language'] = String(args.language);
    return this.postMultipart('/ocr/photo/recognize/form', String(args.imageBase64), 'imageFile', headers);
  }

  private async recognizeFormAdvanced(args: Record<string, unknown>): Promise<ToolResult> {
    const headers = this.authHeaders();
    if (args.bucketID) headers['bucketID'] = String(args.bucketID);
    if (args.bucketSecretKey) headers['bucketSecretKey'] = String(args.bucketSecretKey);
    if (args.recognitionMode) headers['recognitionMode'] = String(args.recognitionMode);
    if (args.preprocessing) headers['preprocessing'] = String(args.preprocessing);
    if (args.diagnostics) headers['diagnostics'] = String(args.diagnostics);
    return this.postMultipart('/ocr/photo/recognize/form/advanced', String(args.imageBase64), 'imageFile', headers);
  }

  private async receiptToCsv(args: Record<string, unknown>): Promise<ToolResult> {
    const { body, contentType } = this.buildFormData(String(args.imageBase64), 'imageFile');

    const response = await this.fetchWithRetry(`${this.baseUrl}/ocr/receipts/photo/to/csv`, {
      method: 'POST',
      headers: { 'Apikey': this.apiKey, 'Content-Type': contentType, 'Accept': 'application/json' },
      body,
    });

    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }

    const text = await response.text();
    return {
      content: [{ type: 'text', text: this.truncate(text) }],
      isError: false,
    };
  }

  // ── Preprocessing ──────────────────────────────────────────────────────────

  private async preprocessBinarize(args: Record<string, unknown>): Promise<ToolResult> {
    return this.postMultipart('/ocr/preprocessing/image/binarize', String(args.imageBase64), 'imageFile', this.authHeaders());
  }

  private async preprocessBinarizeAdvanced(args: Record<string, unknown>): Promise<ToolResult> {
    return this.postMultipart('/ocr/preprocessing/image/binarize/advanced', String(args.imageBase64), 'imageFile', this.authHeaders());
  }

  private async preprocessGetPageAngle(args: Record<string, unknown>): Promise<ToolResult> {
    return this.postMultipart('/ocr/preprocessing/image/get-page-angle', String(args.imageBase64), 'imageFile', this.authHeaders());
  }

  private async preprocessUnrotate(args: Record<string, unknown>): Promise<ToolResult> {
    return this.postMultipart('/ocr/preprocessing/image/unrotate', String(args.imageBase64), 'imageFile', this.authHeaders());
  }

  private async preprocessUnrotateAdvanced(args: Record<string, unknown>): Promise<ToolResult> {
    return this.postMultipart('/ocr/preprocessing/image/unrotate/advanced', String(args.imageBase64), 'imageFile', this.authHeaders());
  }

  private async preprocessUnskew(args: Record<string, unknown>): Promise<ToolResult> {
    return this.postMultipart('/ocr/preprocessing/image/unskew', String(args.imageBase64), 'imageFile', this.authHeaders());
  }
}

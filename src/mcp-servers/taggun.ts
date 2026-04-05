/**
 * Taggun MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Base URL: https://api.taggun.io
// Auth: apikey header (API key from Taggun dashboard)
// Docs: https://docs.taggun.io/
// Rate limits: Varies by plan

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface TaggunConfig {
  apiKey: string;
  baseUrl?: string;
}

export class TaggunMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: TaggunConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.taggun.io';
  }

  static catalog() {
    return {
      name: 'taggun',
      displayName: 'Taggun',
      version: '1.0.0',
      category: 'finance' as const,
      keywords: ['taggun', 'receipt', 'ocr', 'transcription', 'validation', 'campaign'],
      toolNames: [
        'transcribe_receipt_url',
        'transcribe_receipt_url_verbose',
        'transcribe_receipt_encoded',
        'transcribe_receipt_encoded_verbose',
        'match_receipt_url',
        'validate_receipt_campaign',
        'list_campaign_settings',
        'get_campaign_settings',
        'create_campaign_settings',
        'update_campaign_settings',
        'delete_campaign_settings',
        'add_merchant_name',
        'submit_receipt_feedback',
      ],
      description: 'Taggun adapter for AI-powered receipt transcription, OCR, and campaign validation.',
      author: 'protectnil' as const,
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'transcribe_receipt_url',
        description: 'Transcribe a receipt from a URL. Returns merchant name, total amount, tax, date, and line items.',
        inputSchema: {
          type: 'object',
          properties: {
            url: { type: 'string', description: 'HTTPS URL pointing to a receipt image (JPG, PNG, PDF, GIF).' },
            extractTime: { type: 'boolean', description: 'Set true to extract time from the receipt.' },
            incognito: { type: 'boolean', description: 'Set true to avoid saving the receipt in storage.' },
            language: { type: 'string', description: 'Language hint (e.g. "en", "de"). Leave empty for auto-detect.' },
            near: { type: 'string', description: 'Geo location hint for merchant lookup (e.g. "37.7749,-122.4194").' },
            ignoreMerchantName: { type: 'string', description: 'Merchant name to ignore if detected.' },
            ipAddress: { type: 'string', description: 'IP address of the end user for geo context.' },
            referenceId: { type: 'string', description: 'Unique reference ID for tracking and feedback.' },
            refresh: { type: 'boolean', description: 'Set true to force re-process even if cached.' },
            subAccountId: { type: 'string', description: 'Sub-account ID for billing purposes.' },
          },
          required: ['url'],
        },
      },
      {
        name: 'transcribe_receipt_url_verbose',
        description: 'Transcribe a receipt from a URL with verbose output — includes confidence scores and detailed field data.',
        inputSchema: {
          type: 'object',
          properties: {
            url: { type: 'string', description: 'HTTPS URL pointing to a receipt image (JPG, PNG, PDF, GIF).' },
            extractTime: { type: 'boolean', description: 'Set true to extract time from the receipt.' },
            incognito: { type: 'boolean', description: 'Set true to avoid saving the receipt in storage.' },
            language: { type: 'string', description: 'Language hint (e.g. "en", "de"). Leave empty for auto-detect.' },
            near: { type: 'string', description: 'Geo location hint for merchant lookup.' },
            ignoreMerchantName: { type: 'string', description: 'Merchant name to ignore if detected.' },
            ipAddress: { type: 'string', description: 'IP address of the end user.' },
            referenceId: { type: 'string', description: 'Unique reference ID for tracking.' },
            refresh: { type: 'boolean', description: 'Set true to force re-process if cached.' },
            subAccountId: { type: 'string', description: 'Sub-account ID for billing.' },
          },
          required: ['url'],
        },
      },
      {
        name: 'transcribe_receipt_encoded',
        description: 'Transcribe a receipt from a base64-encoded image payload. Use when receipt is already in memory.',
        inputSchema: {
          type: 'object',
          properties: {
            image: { type: 'string', description: 'Base64-encoded image content.' },
            contentType: { type: 'string', description: 'MIME type of the image (e.g. "image/jpeg", "image/png", "application/pdf").' },
            filename: { type: 'string', description: 'Original filename including extension (e.g. "receipt.jpg").' },
            extractTime: { type: 'boolean', description: 'Set true to extract time from the receipt.' },
            incognito: { type: 'boolean', description: 'Set true to avoid saving the receipt.' },
            language: { type: 'string', description: 'Language hint for OCR.' },
            near: { type: 'string', description: 'Geo location hint for merchant lookup.' },
            ignoreMerchantName: { type: 'string', description: 'Merchant name to ignore.' },
            ipAddress: { type: 'string', description: 'IP address of the end user.' },
            referenceId: { type: 'string', description: 'Unique reference ID for tracking.' },
            refresh: { type: 'boolean', description: 'Force re-process if cached.' },
            subAccountId: { type: 'string', description: 'Sub-account ID for billing.' },
          },
          required: ['image', 'contentType', 'filename'],
        },
      },
      {
        name: 'transcribe_receipt_encoded_verbose',
        description: 'Transcribe a base64-encoded receipt image with verbose output including confidence scores.',
        inputSchema: {
          type: 'object',
          properties: {
            image: { type: 'string', description: 'Base64-encoded image content.' },
            contentType: { type: 'string', description: 'MIME type of the image (e.g. "image/jpeg", "image/png", "application/pdf").' },
            filename: { type: 'string', description: 'Original filename including extension (e.g. "receipt.jpg").' },
            extractTime: { type: 'boolean', description: 'Set true to extract time from the receipt.' },
            incognito: { type: 'boolean', description: 'Set true to avoid saving the receipt.' },
            language: { type: 'string', description: 'Language hint for OCR.' },
            near: { type: 'string', description: 'Geo location hint for merchant lookup.' },
            ignoreMerchantName: { type: 'string', description: 'Merchant name to ignore.' },
            ipAddress: { type: 'string', description: 'IP address of the end user.' },
            referenceId: { type: 'string', description: 'Unique reference ID for tracking.' },
            refresh: { type: 'boolean', description: 'Force re-process if cached.' },
            subAccountId: { type: 'string', description: 'Sub-account ID for billing.' },
          },
          required: ['image', 'contentType', 'filename'],
        },
      },
      {
        name: 'match_receipt_url',
        description: 'Detect and match a receipt from URL against keywords and metadata. Returns match score and matched keywords.',
        inputSchema: {
          type: 'object',
          properties: {
            url: { type: 'string', description: 'HTTPS URL pointing to a receipt image.' },
            extractTime: { type: 'boolean', description: 'Set true to extract time.' },
            incognito: { type: 'boolean', description: 'Set true to avoid saving.' },
            language: { type: 'string', description: 'Language hint.' },
            near: { type: 'string', description: 'Geo location hint.' },
            ignoreMerchantName: { type: 'string', description: 'Merchant name to ignore.' },
            ipAddress: { type: 'string', description: 'End user IP address.' },
            referenceId: { type: 'string', description: 'Unique reference ID.' },
            refresh: { type: 'boolean', description: 'Force re-process.' },
            subAccountId: { type: 'string', description: 'Sub-account ID.' },
          },
          required: ['url'],
        },
      },
      {
        name: 'validate_receipt_campaign',
        description: 'Validate a receipt against campaign settings by uploading an image. Returns validation result.',
        inputSchema: {
          type: 'object',
          properties: {
            campaignId: { type: 'string', description: 'Campaign ID to validate the receipt against.' },
            receiptUrl: { type: 'string', description: 'HTTPS URL of the receipt image for validation context (optional).' },
            ipAddress: { type: 'string', description: 'End user IP address.' },
            referenceId: { type: 'string', description: 'Reference ID for tracking.' },
            subAccountId: { type: 'string', description: 'Sub-account ID.' },
          },
          required: ['campaignId'],
        },
      },
      {
        name: 'list_campaign_settings',
        description: 'List all campaign setting IDs configured for your account.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_campaign_settings',
        description: 'Get detailed campaign settings for a specific campaign ID.',
        inputSchema: {
          type: 'object',
          properties: {
            campaignId: { type: 'string', description: 'Campaign ID to retrieve settings for.' },
          },
          required: ['campaignId'],
        },
      },
      {
        name: 'create_campaign_settings',
        description: 'Create new campaign validation settings for a campaign ID.',
        inputSchema: {
          type: 'object',
          properties: {
            campaignId: { type: 'string', description: 'Campaign ID to create settings for.' },
            settings: {
              type: 'object',
              description: 'Campaign settings object with validation rules (keywords, date range, amount thresholds).',
            },
          },
          required: ['campaignId', 'settings'],
        },
      },
      {
        name: 'update_campaign_settings',
        description: 'Update existing campaign validation settings for a campaign ID.',
        inputSchema: {
          type: 'object',
          properties: {
            campaignId: { type: 'string', description: 'Campaign ID to update settings for.' },
            settings: {
              type: 'object',
              description: 'Updated campaign settings object.',
            },
          },
          required: ['campaignId', 'settings'],
        },
      },
      {
        name: 'delete_campaign_settings',
        description: 'Delete campaign settings for a specific campaign ID.',
        inputSchema: {
          type: 'object',
          properties: {
            campaignId: { type: 'string', description: 'Campaign ID to delete settings for.' },
          },
          required: ['campaignId'],
        },
      },
      {
        name: 'add_merchant_name',
        description: 'Add a keyword to your account model to help predict merchant names in future OCR.',
        inputSchema: {
          type: 'object',
          properties: {
            keyword: { type: 'string', description: 'Merchant name keyword to add to the model.' },
            merchantName: { type: 'string', description: 'Canonical merchant name this keyword should map to.' },
          },
          required: ['keyword', 'merchantName'],
        },
      },
      {
        name: 'submit_receipt_feedback',
        description: 'Submit manually verified receipt data as feedback to improve OCR accuracy for a given receipt.',
        inputSchema: {
          type: 'object',
          properties: {
            receiptId: { type: 'string', description: 'Receipt ID returned from a prior transcription call.' },
            merchantName: { type: 'string', description: 'Correct merchant name for this receipt.' },
            totalAmount: { type: 'number', description: 'Correct total amount on the receipt.' },
            taxAmount: { type: 'number', description: 'Correct tax amount on the receipt.' },
            date: { type: 'string', description: 'Correct receipt date in ISO 8601 format.' },
          },
          required: ['receiptId'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'transcribe_receipt_url':          return await this.transcribeReceiptUrl(args);
        case 'transcribe_receipt_url_verbose':  return await this.transcribeReceiptUrlVerbose(args);
        case 'transcribe_receipt_encoded':      return await this.transcribeReceiptEncoded(args);
        case 'transcribe_receipt_encoded_verbose': return await this.transcribeReceiptEncodedVerbose(args);
        case 'match_receipt_url':               return await this.matchReceiptUrl(args);
        case 'validate_receipt_campaign':       return await this.validateReceiptCampaign(args);
        case 'list_campaign_settings':          return await this.listCampaignSettings();
        case 'get_campaign_settings':           return await this.getCampaignSettings(args);
        case 'create_campaign_settings':        return await this.createCampaignSettings(args);
        case 'update_campaign_settings':        return await this.updateCampaignSettings(args);
        case 'delete_campaign_settings':        return await this.deleteCampaignSettings(args);
        case 'add_merchant_name':               return await this.addMerchantName(args);
        case 'submit_receipt_feedback':         return await this.submitReceiptFeedback(args);
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

  private get headers(): Record<string, string> {
    return { 'apikey': this.apiKey, 'Content-Type': 'application/json' };
  }

  private async apiGet(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, { method: 'GET', headers: this.headers });
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `Taggun API error ${response.status}: ${errText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Taggun returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apiPost(path: string, body: unknown): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `Taggun API error ${response.status}: ${errText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Taggun returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apiPut(path: string, body: unknown): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'PUT',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `Taggun API error ${response.status}: ${errText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Taggun returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apiDelete(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, { method: 'DELETE', headers: this.headers });
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `Taggun API error ${response.status}: ${errText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Taggun returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private buildReceiptBody(args: Record<string, unknown>, extraRequired?: Record<string, unknown>): Record<string, unknown> {
    const body: Record<string, unknown> = { ...extraRequired };
    for (const k of ['extractTime', 'incognito', 'language', 'near', 'ignoreMerchantName',
      'ipAddress', 'referenceId', 'refresh', 'subAccountId']) {
      if (args[k] !== undefined) body[k] = args[k];
    }
    return body;
  }

  private async transcribeReceiptUrl(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.url) return { content: [{ type: 'text', text: 'url is required' }], isError: true };
    const body = this.buildReceiptBody(args, { url: args.url });
    return this.apiPost('/api/receipt/v1/simple/url', body);
  }

  private async transcribeReceiptUrlVerbose(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.url) return { content: [{ type: 'text', text: 'url is required' }], isError: true };
    const body = this.buildReceiptBody(args, { url: args.url });
    return this.apiPost('/api/receipt/v1/verbose/url', body);
  }

  private async transcribeReceiptEncoded(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.image || !args.contentType || !args.filename) {
      return { content: [{ type: 'text', text: 'image, contentType, and filename are required' }], isError: true };
    }
    const body = this.buildReceiptBody(args, {
      image: args.image,
      contentType: args.contentType,
      filename: args.filename,
    });
    return this.apiPost('/api/receipt/v1/simple/encoded', body);
  }

  private async transcribeReceiptEncodedVerbose(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.image || !args.contentType || !args.filename) {
      return { content: [{ type: 'text', text: 'image, contentType, and filename are required' }], isError: true };
    }
    const body = this.buildReceiptBody(args, {
      image: args.image,
      contentType: args.contentType,
      filename: args.filename,
    });
    return this.apiPost('/api/receipt/v1/verbose/encoded', body);
  }

  private async matchReceiptUrl(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.url) return { content: [{ type: 'text', text: 'url is required' }], isError: true };
    const body = this.buildReceiptBody(args, { url: args.url });
    return this.apiPost('/api/receipt/v1/match/file', body);
  }

  private async validateReceiptCampaign(args: Record<string, unknown>): Promise<ToolResult> {
    const campaignId = args.campaignId as string;
    if (!campaignId) return { content: [{ type: 'text', text: 'campaignId is required' }], isError: true };
    const body: Record<string, unknown> = {};
    for (const k of ['receiptUrl', 'ipAddress', 'referenceId', 'subAccountId']) {
      if (args[k] !== undefined) body[k] = args[k];
    }
    return this.apiPost(`/api/validation/v1/campaign/file?campaignId=${encodeURIComponent(campaignId)}`, body);
  }

  private async listCampaignSettings(): Promise<ToolResult> {
    return this.apiGet('/api/validation/v1/campaign/settings/list');
  }

  private async getCampaignSettings(args: Record<string, unknown>): Promise<ToolResult> {
    const campaignId = args.campaignId as string;
    if (!campaignId) return { content: [{ type: 'text', text: 'campaignId is required' }], isError: true };
    return this.apiGet(`/api/validation/v1/campaign/settings/${encodeURIComponent(campaignId)}`);
  }

  private async createCampaignSettings(args: Record<string, unknown>): Promise<ToolResult> {
    const campaignId = args.campaignId as string;
    if (!campaignId || !args.settings) {
      return { content: [{ type: 'text', text: 'campaignId and settings are required' }], isError: true };
    }
    return this.apiPost(`/api/validation/v1/campaign/settings/create/${encodeURIComponent(campaignId)}`, args.settings);
  }

  private async updateCampaignSettings(args: Record<string, unknown>): Promise<ToolResult> {
    const campaignId = args.campaignId as string;
    if (!campaignId || !args.settings) {
      return { content: [{ type: 'text', text: 'campaignId and settings are required' }], isError: true };
    }
    return this.apiPut(`/api/validation/v1/campaign/settings/update/${encodeURIComponent(campaignId)}`, args.settings);
  }

  private async deleteCampaignSettings(args: Record<string, unknown>): Promise<ToolResult> {
    const campaignId = args.campaignId as string;
    if (!campaignId) return { content: [{ type: 'text', text: 'campaignId is required' }], isError: true };
    return this.apiDelete(`/api/validation/v1/campaign/settings/delete/${encodeURIComponent(campaignId)}`);
  }

  private async addMerchantName(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.keyword || !args.merchantName) {
      return { content: [{ type: 'text', text: 'keyword and merchantName are required' }], isError: true };
    }
    const body = { keyword: args.keyword, merchantName: args.merchantName };
    return this.apiPost('/api/account/v1/merchantname/add', body);
  }

  private async submitReceiptFeedback(args: Record<string, unknown>): Promise<ToolResult> {
    const receiptId = args.receiptId as string;
    if (!receiptId) return { content: [{ type: 'text', text: 'receiptId is required' }], isError: true };
    const body: Record<string, unknown> = { receiptId };
    for (const k of ['merchantName', 'totalAmount', 'taxAmount', 'date']) {
      if (args[k] !== undefined) body[k] = args[k];
    }
    return this.apiPost('/api/account/v1/feedback', body);
  }
}

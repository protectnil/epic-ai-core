/**
 * Billingo HU MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// No official Billingo MCP server was found on GitHub.
//
// Base URL: https://api.billingo.hu/v3
// Auth: X-API-KEY header (API key from Billingo dashboard → API Management)
// Docs: https://app.swaggerhub.com/apis/Billingo/Billingo/3.0.7
// Rate limits: Not publicly specified; recommended ≤ 60 req/min

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface BillingoHuConfig {
  apiKey: string;
  /** Override base URL (default: https://api.billingo.hu/v3) */
  baseUrl?: string;
}

export class BillingoHuMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: BillingoHuConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? 'https://api.billingo.hu/v3';
  }

  get tools(): ToolDefinition[] {
    return [
      // ── Bank Accounts ────────────────────────────────────────────────
      {
        name: 'list_bank_accounts',
        description: 'List all bank accounts configured in the Billingo organization.',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'create_bank_account',
        description: 'Create a new bank account in Billingo.',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Bank account name' },
            account_number: { type: 'string', description: 'IBAN or domestic account number' },
            currency: { type: 'string', description: 'ISO 4217 currency code (e.g. HUF, EUR)' },
          },
          required: ['name', 'account_number', 'currency'],
        },
      },
      {
        name: 'get_bank_account',
        description: 'Retrieve a single bank account by its ID.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'integer', description: 'Bank account ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'update_bank_account',
        description: 'Update an existing bank account by its ID.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'integer', description: 'Bank account ID' },
            name: { type: 'string', description: 'Bank account name' },
            account_number: { type: 'string', description: 'IBAN or domestic account number' },
            currency: { type: 'string', description: 'ISO 4217 currency code' },
          },
          required: ['id'],
        },
      },
      {
        name: 'delete_bank_account',
        description: 'Delete a bank account by its ID.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'integer', description: 'Bank account ID' },
          },
          required: ['id'],
        },
      },
      // ── Currency ─────────────────────────────────────────────────────
      {
        name: 'get_currency_conversion_rate',
        description: 'Get the current exchange rate between two currencies.',
        inputSchema: {
          type: 'object',
          properties: {
            from: { type: 'string', description: 'Source currency ISO 4217 code (e.g. EUR)' },
            to: { type: 'string', description: 'Target currency ISO 4217 code (e.g. HUF)' },
          },
          required: ['from', 'to'],
        },
      },
      // ── Document Blocks ───────────────────────────────────────────────
      {
        name: 'list_document_blocks',
        description: 'List all document blocks (custom text/template blocks) defined in the organization.',
        inputSchema: { type: 'object', properties: {} },
      },
      // ── Documents (Invoices, Proformas, etc.) ─────────────────────────
      {
        name: 'list_documents',
        description: 'List all documents (invoices, proforma invoices, receipts, etc.) with optional filters.',
        inputSchema: {
          type: 'object',
          properties: {
            page: { type: 'integer', description: 'Page number (default: 1)' },
            per_page: { type: 'integer', description: 'Results per page (default: 25, max: 100)' },
            block_id: { type: 'integer', description: 'Filter by document block ID' },
            partner_id: { type: 'integer', description: 'Filter by partner ID' },
            payment_method: { type: 'string', description: 'Filter by payment method code' },
            payment_status: { type: 'string', description: 'Filter by payment status (e.g. paid, unpaid, expired)' },
            start_date: { type: 'string', description: 'Filter documents created on or after this date (YYYY-MM-DD)' },
            end_date: { type: 'string', description: 'Filter documents created on or before this date (YYYY-MM-DD)' },
            start_number: { type: 'integer', description: 'Filter by minimum document number' },
            end_number: { type: 'integer', description: 'Filter by maximum document number' },
            type: { type: 'string', description: 'Document type: invoice, proforma, receipt, draft' },
          },
        },
      },
      {
        name: 'create_document',
        description: 'Create a new document (invoice, proforma invoice, receipt, or draft). Returns the created document with its ID.',
        inputSchema: {
          type: 'object',
          properties: {
            partner_id: { type: 'integer', description: 'Partner (buyer) ID' },
            block_id: { type: 'integer', description: 'Document block ID used for numbering' },
            bank_account_id: { type: 'integer', description: 'Bank account ID for payment' },
            type: { type: 'string', description: 'Document type: invoice, proforma, receipt, draft' },
            fulfillment_date: { type: 'string', description: 'Fulfillment/delivery date (YYYY-MM-DD)' },
            due_date: { type: 'string', description: 'Payment due date (YYYY-MM-DD)' },
            payment_method: { type: 'string', description: 'Payment method code (e.g. bankcard, transfer, cash)' },
            language: { type: 'string', description: 'Document language code (e.g. hu, en, de)' },
            currency: { type: 'string', description: 'ISO 4217 currency code' },
            conversion_rate: { type: 'number', description: 'Exchange rate to HUF if non-HUF currency' },
            items: {
              type: 'array',
              description: 'Line items array. Each item: { name, quantity, unit, unit_price, vat_type (e.g. "27%", "AAM"), entitlement }',
            },
            comment: { type: 'string', description: 'Optional internal comment on the document' },
          },
          required: ['partner_id', 'block_id', 'bank_account_id', 'type', 'fulfillment_date', 'due_date', 'payment_method', 'currency', 'items'],
        },
      },
      {
        name: 'get_document',
        description: 'Retrieve a single document (invoice/proforma/receipt) by its ID.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'integer', description: 'Document ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'cancel_document',
        description: 'Cancel a document (creates a cancellation document and marks the original as cancelled).',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'integer', description: 'Document ID to cancel' },
          },
          required: ['id'],
        },
      },
      {
        name: 'create_document_from_proforma',
        description: 'Create a final invoice from an existing proforma invoice.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'integer', description: 'Proforma document ID to convert to invoice' },
          },
          required: ['id'],
        },
      },
      {
        name: 'download_document',
        description: 'Download a document as a PDF. Returns raw PDF bytes encoded as base64.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'integer', description: 'Document ID to download' },
          },
          required: ['id'],
        },
      },
      {
        name: 'get_document_public_url',
        description: 'Retrieve the public download URL for a document (shareable PDF link).',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'integer', description: 'Document ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'send_document',
        description: 'Send a document (invoice) by email to one or more recipients.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'integer', description: 'Document ID to send' },
            emails: {
              type: 'array',
              description: 'Array of email address strings to send the document to',
            },
          },
          required: ['id', 'emails'],
        },
      },
      {
        name: 'get_document_online_szamla_status',
        description: 'Retrieve the Online Számla (Hungarian electronic invoice reporting) status for a document.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'integer', description: 'Document ID' },
          },
          required: ['id'],
        },
      },
      // ── Payments ─────────────────────────────────────────────────────
      {
        name: 'get_document_payment',
        description: 'Retrieve the payment history for a document.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'integer', description: 'Document ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'update_document_payment',
        description: 'Add or update payment history entries on a document (mark as paid, partial payment, etc.).',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'integer', description: 'Document ID' },
            payments: {
              type: 'array',
              description: 'Array of payment objects: [{ date (YYYY-MM-DD), price (number), conversion_rate (number) }]',
            },
          },
          required: ['id', 'payments'],
        },
      },
      {
        name: 'delete_document_payment',
        description: 'Delete all payment history on a document (reset to unpaid).',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'integer', description: 'Document ID' },
          },
          required: ['id'],
        },
      },
      // ── Organization ─────────────────────────────────────────────────
      {
        name: 'get_organization',
        description: 'Retrieve the organization (company) data registered in the Billingo account.',
        inputSchema: { type: 'object', properties: {} },
      },
      // ── Partners ─────────────────────────────────────────────────────
      {
        name: 'list_partners',
        description: 'List all partners (clients/customers) in the Billingo account.',
        inputSchema: {
          type: 'object',
          properties: {
            page: { type: 'integer', description: 'Page number (default: 1)' },
            per_page: { type: 'integer', description: 'Results per page (default: 25, max: 100)' },
          },
        },
      },
      {
        name: 'create_partner',
        description: 'Create a new partner (client/customer) in the Billingo account.',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Partner company or individual name' },
            address: {
              type: 'object',
              description: 'Address object: { country_code, post_code, city, address }',
            },
            emails: { type: 'array', description: 'Array of email address strings' },
            taxcode: { type: 'string', description: 'Tax ID / VAT number of the partner' },
            iban: { type: 'string', description: 'IBAN bank account number' },
            swift: { type: 'string', description: 'SWIFT/BIC code' },
            taxtype: { type: 'string', description: 'Tax type code (e.g. HAS_TAX_NUMBER, NO_TAX_NUMBER)' },
            phone: { type: 'string', description: 'Contact phone number' },
            general_ledger_number: { type: 'string', description: 'General ledger account number' },
          },
          required: ['name', 'address'],
        },
      },
      {
        name: 'get_partner',
        description: 'Retrieve a single partner by their ID.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'integer', description: 'Partner ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'update_partner',
        description: 'Update an existing partner by their ID.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'integer', description: 'Partner ID' },
            name: { type: 'string', description: 'Partner name' },
            address: {
              type: 'object',
              description: 'Address object: { country_code, post_code, city, address }',
            },
            emails: { type: 'array', description: 'Array of email address strings' },
            taxcode: { type: 'string', description: 'Tax ID / VAT number' },
            phone: { type: 'string', description: 'Contact phone number' },
          },
          required: ['id'],
        },
      },
      {
        name: 'delete_partner',
        description: 'Delete a partner by their ID.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'integer', description: 'Partner ID' },
          },
          required: ['id'],
        },
      },
      // ── Products ─────────────────────────────────────────────────────
      {
        name: 'list_products',
        description: 'List all products (service/product catalog items) in the Billingo account.',
        inputSchema: {
          type: 'object',
          properties: {
            page: { type: 'integer', description: 'Page number (default: 1)' },
            per_page: { type: 'integer', description: 'Results per page (default: 25, max: 100)' },
          },
        },
      },
      {
        name: 'create_product',
        description: 'Create a new product or service in the Billingo product catalog.',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Product/service name' },
            comment: { type: 'string', description: 'Optional description or comment' },
            currency: { type: 'string', description: 'ISO 4217 currency code for the unit price' },
            vat: { type: 'string', description: 'VAT rate code (e.g. "27%", "AAM", "EU_AAM")' },
            net_unit_price: { type: 'number', description: 'Net (before tax) unit price' },
            unit: { type: 'string', description: 'Unit of measure (e.g. db, ora, piece, hour)' },
          },
          required: ['name', 'currency', 'vat', 'net_unit_price', 'unit'],
        },
      },
      {
        name: 'get_product',
        description: 'Retrieve a single product by its ID.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'integer', description: 'Product ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'update_product',
        description: 'Update an existing product in the catalog by its ID.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'integer', description: 'Product ID' },
            name: { type: 'string', description: 'Product/service name' },
            comment: { type: 'string', description: 'Optional description or comment' },
            currency: { type: 'string', description: 'ISO 4217 currency code' },
            vat: { type: 'string', description: 'VAT rate code' },
            net_unit_price: { type: 'number', description: 'Net unit price' },
            unit: { type: 'string', description: 'Unit of measure' },
          },
          required: ['id'],
        },
      },
      {
        name: 'delete_product',
        description: 'Delete a product from the catalog by its ID.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'integer', description: 'Product ID' },
          },
          required: ['id'],
        },
      },
      // ── Utilities ─────────────────────────────────────────────────────
      {
        name: 'convert_legacy_id',
        description: 'Convert a legacy Billingo v2 ID to a v3 ID.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'integer', description: 'Legacy v2 document/partner/product ID' },
          },
          required: ['id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_bank_accounts':             return await this.request('GET', '/bank-accounts');
        case 'create_bank_account':            return await this.request('POST', '/bank-accounts', args);
        case 'get_bank_account':               return await this.request('GET', `/bank-accounts/${this.id(args)}`);
        case 'update_bank_account':            return await this.request('PUT', `/bank-accounts/${this.id(args)}`, this.omit(args, 'id'));
        case 'delete_bank_account':            return await this.request('DELETE', `/bank-accounts/${this.id(args)}`);
        case 'get_currency_conversion_rate':   return await this.request('GET', `/currencies?from=${args.from}&to=${args.to}`);
        case 'list_document_blocks':           return await this.request('GET', '/document-blocks');
        case 'list_documents':                 return await this.request('GET', `/documents?${this.qs(args)}`);
        case 'create_document':                return await this.request('POST', '/documents', args);
        case 'get_document':                   return await this.request('GET', `/documents/${this.id(args)}`);
        case 'cancel_document':                return await this.request('POST', `/documents/${this.id(args)}/cancel`);
        case 'create_document_from_proforma':  return await this.request('POST', `/documents/${this.id(args)}/create-from-proforma`);
        case 'download_document':              return await this.downloadPdf(`/documents/${this.id(args)}/download`);
        case 'get_document_public_url':        return await this.request('GET', `/documents/${this.id(args)}/public-url`);
        case 'send_document':                  return await this.request('POST', `/documents/${this.id(args)}/send`, { emails: args.emails });
        case 'get_document_online_szamla_status': return await this.request('GET', `/documents/${this.id(args)}/online-szamla`);
        case 'get_document_payment':           return await this.request('GET', `/documents/${this.id(args)}/payments`);
        case 'update_document_payment':        return await this.request('PUT', `/documents/${this.id(args)}/payments`, { payments: args.payments });
        case 'delete_document_payment':        return await this.request('DELETE', `/documents/${this.id(args)}/payments`);
        case 'get_organization':               return await this.request('GET', '/organization');
        case 'list_partners':                  return await this.request('GET', `/partners?${this.qs(args)}`);
        case 'create_partner':                 return await this.request('POST', '/partners', args);
        case 'get_partner':                    return await this.request('GET', `/partners/${this.id(args)}`);
        case 'update_partner':                 return await this.request('PUT', `/partners/${this.id(args)}`, this.omit(args, 'id'));
        case 'delete_partner':                 return await this.request('DELETE', `/partners/${this.id(args)}`);
        case 'list_products':                  return await this.request('GET', `/products?${this.qs(args)}`);
        case 'create_product':                 return await this.request('POST', '/products', args);
        case 'get_product':                    return await this.request('GET', `/products/${this.id(args)}`);
        case 'update_product':                 return await this.request('PUT', `/products/${this.id(args)}`, this.omit(args, 'id'));
        case 'delete_product':                 return await this.request('DELETE', `/products/${this.id(args)}`);
        case 'convert_legacy_id':              return await this.request('GET', `/utils/convert-legacy-id/${this.id(args)}`);
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

  private id(args: Record<string, unknown>): string {
    const v = args.id;
    if (v === undefined || v === null) throw new Error('"id" is required');
    return encodeURIComponent(String(v));
  }

  private omit(args: Record<string, unknown>, ...keys: string[]): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(args)) {
      if (!keys.includes(k)) result[k] = v;
    }
    return result;
  }

  private qs(args: Record<string, unknown>): string {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(args)) {
      if (v !== undefined && v !== null) params.set(k, String(v));
    }
    return params.toString();
  }

  private get headers(): Record<string, string> {
    return { 'X-API-KEY': this.apiKey, 'Content-Type': 'application/json', 'Accept': 'application/json' };
  }

  private async request(method: string, path: string, body?: unknown): Promise<ToolResult> {
    const url = `${this.baseUrl}${path}`;
    const init: RequestInit = { method, headers: this.headers };
    if (body && method !== 'GET' && method !== 'DELETE') {
      init.body = JSON.stringify(body);
    }
    const response = await this.fetchWithRetry(url, init);
    if (response.status === 204) {
      return { content: [{ type: 'text', text: 'Success (no content)' }], isError: false };
    }
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `Billingo API error ${response.status}: ${errText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Billingo returned non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async downloadPdf(path: string): Promise<ToolResult> {
    const url = `${this.baseUrl}${path}`;
    const response = await this.fetchWithRetry(url, { method: 'GET', headers: this.headers });
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `Billingo API error ${response.status}: ${errText}` }], isError: true };
    }
    const contentType = response.headers.get('content-type') ?? '';
    if (contentType.includes('application/pdf')) {
      const buf = await response.arrayBuffer();
      const b64 = Buffer.from(buf).toString('base64');
      return { content: [{ type: 'text', text: `PDF data (base64, ${buf.byteLength} bytes):\n${b64.slice(0, 200)}...` }], isError: false };
    }
    const text = await response.text();
    return { content: [{ type: 'text', text: this.truncate(text) }], isError: false };
  }

  static catalog() {
    return {
      name: 'billingo-hu',
      displayName: 'Billingo',
      version: '1.0.0',
      category: 'finance' as const,
      keywords: ['billingo', 'invoice', 'invoicing', 'billing', 'hungary', 'hungarian', 'vat', 'finance', 'accounting'],
      toolNames: [
        'list_bank_accounts', 'create_bank_account', 'get_bank_account', 'update_bank_account', 'delete_bank_account',
        'get_currency_conversion_rate',
        'list_document_blocks',
        'list_documents', 'create_document', 'get_document', 'cancel_document', 'create_document_from_proforma',
        'download_document', 'get_document_public_url', 'send_document', 'get_document_online_szamla_status',
        'get_document_payment', 'update_document_payment', 'delete_document_payment',
        'get_organization',
        'list_partners', 'create_partner', 'get_partner', 'update_partner', 'delete_partner',
        'list_products', 'create_product', 'get_product', 'update_product', 'delete_product',
        'convert_legacy_id',
      ],
      description: 'Billingo Hungarian invoicing adapter for the Epic AI Intelligence Platform',
      author: 'protectnil' as const,
    };
  }
}

/**
 * Taxamo MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Base URL: https://api.taxamo.com
// Auth: Token header (API key from Taxamo dashboard)
// Docs: https://www.taxamo.com/apidocs/
// Rate limits: Varies by plan

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface TaxamoConfig {
  apiKey: string;
  baseUrl?: string;
}

export class TaxamoMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: TaxamoConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.taxamo.com';
  }

  static catalog() {
    return {
      name: 'taxamo',
      displayName: 'Taxamo',
      version: '1.0.0',
      category: 'finance' as const,
      keywords: ['taxamo', 'vat', 'tax', 'eu', 'transactions', 'settlement'],
      toolNames: [
        'calculate_simple_tax',
        'calculate_tax',
        'validate_vat_number',
        'create_transaction',
        'get_transaction',
        'update_transaction',
        'confirm_transaction',
        'cancel_transaction',
        'list_transactions',
        'create_refund',
        'list_refunds',
        'create_payment',
        'list_payments',
        'get_settlement',
        'get_settlement_summary',
        'get_refunds_report',
        'get_eu_vies_report',
        'locate_ip',
      ],
      description: 'Taxamo adapter for EU VAT compliance — tax calculation, transaction management, and settlement reporting.',
      author: 'protectnil' as const,
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'calculate_simple_tax',
        description: 'Calculate EU VAT for a simple single-line transaction using query parameters. Returns tax rate and amount.',
        inputSchema: {
          type: 'object',
          properties: {
            currency_code: { type: 'string', description: 'ISO 4217 currency code, e.g. EUR, USD' },
            amount: { type: 'number', description: 'Transaction amount (net). Required if total_amount not provided.' },
            total_amount: { type: 'number', description: 'Total amount including tax. Required if amount not provided.' },
            unit_price: { type: 'number', description: 'Unit price. Used with quantity.' },
            quantity: { type: 'number', description: 'Quantity (defaults to 1).' },
            product_type: { type: 'string', description: 'Product type per /dictionaries/product_types (e.g. "e-book").' },
            buyer_credit_card_prefix: { type: 'string', description: 'First 6 digits of buyer credit card for country detection.' },
            buyer_tax_number: { type: 'string', description: 'Buyer EU VAT number for B2B reverse-charge detection.' },
            billing_country_code: { type: 'string', description: 'Buyer billing country ISO 2-letter code.' },
            force_country_code: { type: 'string', description: 'Force tax calculation to a specific country ISO 2-letter code.' },
            order_date: { type: 'string', description: 'Order date in yyyy-MM-dd format.' },
            tax_deducted: { type: 'boolean', description: 'True if tax is deducted and no VAT should be applied.' },
          },
          required: ['currency_code'],
        },
      },
      {
        name: 'calculate_tax',
        description: 'Calculate EU VAT for a full transaction with multiple line items. Returns detailed tax breakdown per line.',
        inputSchema: {
          type: 'object',
          properties: {
            currency_code: { type: 'string', description: 'ISO 4217 currency code for the transaction.' },
            transaction_lines: {
              type: 'array',
              description: 'Array of line items. Each: { amount, quantity, unit_price, product_type, custom_id, description }.',
            },
            buyer_ip: { type: 'string', description: 'Buyer IP address for geo-location country detection.' },
            buyer_credit_card_prefix: { type: 'string', description: 'First 6 digits of buyer credit card.' },
            billing_country_code: { type: 'string', description: 'Buyer billing country ISO 2-letter code.' },
            buyer_tax_number: { type: 'string', description: 'Buyer EU VAT number.' },
            force_country_code: { type: 'string', description: 'Force a specific tax country ISO 2-letter code.' },
            order_date: { type: 'string', description: 'Order date in yyyy-MM-dd format.' },
            buyer_email: { type: 'string', description: "Buyer's email address." },
            buyer_name: { type: 'string', description: "Buyer's full name or company name." },
          },
          required: ['currency_code', 'transaction_lines'],
        },
      },
      {
        name: 'validate_vat_number',
        description: 'Validate a European VAT number via VIES. Returns validity status and company details if valid.',
        inputSchema: {
          type: 'object',
          properties: {
            tax_number: { type: 'string', description: 'EU VAT number to validate (e.g. GB123456789).' },
          },
          required: ['tax_number'],
        },
      },
      {
        name: 'create_transaction',
        description: 'Store a VAT transaction in Taxamo for settlement and reporting purposes.',
        inputSchema: {
          type: 'object',
          properties: {
            currency_code: { type: 'string', description: 'ISO 4217 currency code.' },
            transaction_lines: {
              type: 'array',
              description: 'Line items array. Each: { amount, quantity, unit_price, product_type, custom_id, description }.',
            },
            buyer_ip: { type: 'string', description: 'Buyer IP address.' },
            buyer_credit_card_prefix: { type: 'string', description: 'First 6 digits of buyer credit card.' },
            billing_country_code: { type: 'string', description: 'Buyer billing country ISO 2-letter code.' },
            buyer_tax_number: { type: 'string', description: 'Buyer EU VAT number.' },
            buyer_email: { type: 'string', description: "Buyer's email address." },
            buyer_name: { type: 'string', description: "Buyer's name." },
            custom_id: { type: 'string', description: 'Your order/invoice ID for cross-reference.' },
            invoice_number: { type: 'string', description: 'Invoice number.' },
            invoice_date: { type: 'string', description: 'Invoice date.' },
            status: { type: 'string', description: 'Transaction status: N (new) or C (confirmed).' },
            force_country_code: { type: 'string', description: 'Force a specific tax country.' },
            order_date: { type: 'string', description: 'Order date in yyyy-MM-dd format.' },
            manual_mode: { type: 'boolean', description: 'Use manual mode, bypassing country detection.' },
          },
          required: ['currency_code', 'transaction_lines'],
        },
      },
      {
        name: 'get_transaction',
        description: 'Retrieve full transaction data including tax details, evidence, and line items by transaction key.',
        inputSchema: {
          type: 'object',
          properties: {
            key: { type: 'string', description: 'Taxamo transaction key returned from create_transaction.' },
          },
          required: ['key'],
        },
      },
      {
        name: 'update_transaction',
        description: 'Update a transaction before confirmation. Modifies buyer info, line items, or status.',
        inputSchema: {
          type: 'object',
          properties: {
            key: { type: 'string', description: 'Transaction key to update.' },
            currency_code: { type: 'string', description: 'ISO 4217 currency code.' },
            transaction_lines: { type: 'array', description: 'Updated line items array.' },
            buyer_email: { type: 'string', description: "Buyer's email." },
            buyer_name: { type: 'string', description: "Buyer's name." },
            custom_id: { type: 'string', description: 'Your order/invoice ID.' },
            invoice_number: { type: 'string', description: 'Invoice number.' },
          },
          required: ['key'],
        },
      },
      {
        name: 'confirm_transaction',
        description: 'Confirm a transaction to lock it for VAT settlement. Once confirmed, it appears in settlement reports.',
        inputSchema: {
          type: 'object',
          properties: {
            key: { type: 'string', description: 'Transaction key to confirm.' },
          },
          required: ['key'],
        },
      },
      {
        name: 'cancel_transaction',
        description: 'Cancel (delete) an unconfirmed transaction.',
        inputSchema: {
          type: 'object',
          properties: {
            key: { type: 'string', description: 'Transaction key to cancel.' },
          },
          required: ['key'],
        },
      },
      {
        name: 'list_transactions',
        description: 'Browse and filter transactions. Supports pagination, date range, status, and country filters.',
        inputSchema: {
          type: 'object',
          properties: {
            filter_text: { type: 'string', description: 'Free text search filter.' },
            offset: { type: 'number', description: 'Pagination offset (0-based).' },
            key_or_custom_id: { type: 'string', description: 'Match by transaction key or custom_id.' },
            currency_code: { type: 'string', description: 'Filter by currency code.' },
            order_date_to: { type: 'string', description: 'Filter by order date to (yyyy-MM-dd).' },
            date_from: { type: 'string', description: 'Filter by created date from (yyyy-MM-dd).' },
            order_date_from: { type: 'string', description: 'Filter by order date from (yyyy-MM-dd).' },
            total_amount_greater_than: { type: 'string', description: 'Filter transactions above this amount.' },
            total_amount_less_than: { type: 'string', description: 'Filter transactions below this amount.' },
            tax_country_code: { type: 'string', description: 'Filter by 2-letter tax country code.' },
            status: { type: 'string', description: 'Filter by status: N (new), C (confirmed).' },
            invoice_number: { type: 'string', description: 'Filter by invoice number.' },
          },
        },
      },
      {
        name: 'create_refund',
        description: 'Create a refund for a confirmed transaction. Supports full or partial refund.',
        inputSchema: {
          type: 'object',
          properties: {
            key: { type: 'string', description: 'Transaction key to refund.' },
            amount: { type: 'number', description: 'Net amount to refund.' },
            total_amount: { type: 'number', description: 'Gross amount including tax to refund.' },
            line_key: { type: 'string', description: 'Specific line key to refund.' },
            custom_id: { type: 'string', description: 'Line custom identifier to target.' },
            refund_reason: { type: 'string', description: 'Reason for refund, displayed on credit note.' },
          },
          required: ['key'],
        },
      },
      {
        name: 'list_refunds',
        description: 'List all refunds for a specific transaction.',
        inputSchema: {
          type: 'object',
          properties: {
            key: { type: 'string', description: 'Transaction key to list refunds for.' },
          },
          required: ['key'],
        },
      },
      {
        name: 'create_payment',
        description: 'Register a payment against a transaction. Use negative amount to register a refund.',
        inputSchema: {
          type: 'object',
          properties: {
            key: { type: 'string', description: 'Transaction key to register payment against.' },
            amount: { type: 'number', description: 'Payment amount. Use negative to register a refund.' },
            payment_information: { type: 'string', description: 'Additional payment information (e.g. payment reference).' },
            payment_timestamp: { type: 'string', description: "Payment timestamp in yyyy-MM-dd'T'HH:mm:ss.SSSZ format." },
          },
          required: ['key', 'amount'],
        },
      },
      {
        name: 'list_payments',
        description: 'List all registered payments for a transaction.',
        inputSchema: {
          type: 'object',
          properties: {
            key: { type: 'string', description: 'Transaction key to list payments for.' },
          },
          required: ['key'],
        },
      },
      {
        name: 'get_settlement',
        description: 'Fetch VAT settlement details for a specific quarter including totals by country.',
        inputSchema: {
          type: 'object',
          properties: {
            quarter: { type: 'string', description: 'Quarter in YYYY-QN format, e.g. 2026-Q1.' },
            tax_country_code: { type: 'string', description: 'Optional 2-letter country code to filter settlement.' },
          },
          required: ['quarter'],
        },
      },
      {
        name: 'get_settlement_summary',
        description: 'Fetch a summary of VAT settlement for a specific quarter — totals and payment status.',
        inputSchema: {
          type: 'object',
          properties: {
            quarter: { type: 'string', description: 'Quarter in YYYY-QN format, e.g. 2026-Q1.' },
          },
          required: ['quarter'],
        },
      },
      {
        name: 'get_refunds_report',
        description: 'Fetch settlement refunds report for a date range, grouped by country.',
        inputSchema: {
          type: 'object',
          properties: {
            date_from: { type: 'string', description: 'Start date in yyyy-MM-dd format.' },
            date_to: { type: 'string', description: 'End date in yyyy-MM-dd format.' },
            tax_country_code: { type: 'string', description: 'Optional 2-letter country code filter.' },
          },
          required: ['date_from'],
        },
      },
      {
        name: 'get_eu_vies_report',
        description: 'Calculate the EU VIES (VAT Information Exchange System) report for a given country and period.',
        inputSchema: {
          type: 'object',
          properties: {
            eu_country_code: { type: 'string', description: 'EU 2-letter country code for VIES report.' },
            start_month: { type: 'string', description: 'Start month in yyyy-MM format.' },
            end_month: { type: 'string', description: 'End month in yyyy-MM format.' },
            lff_sequence_number: { type: 'string', description: 'Sequence number for local file format.' },
          },
          required: ['eu_country_code', 'start_month', 'end_month'],
        },
      },
      {
        name: 'locate_ip',
        description: 'Geo-locate an IP address to determine the buyer country for VAT purposes. Omit ip for caller IP.',
        inputSchema: {
          type: 'object',
          properties: {
            ip: { type: 'string', description: 'IPv4 or IPv6 address to look up. Omit to locate the caller IP.' },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'calculate_simple_tax':   return await this.calculateSimpleTax(args);
        case 'calculate_tax':          return await this.calculateTax(args);
        case 'validate_vat_number':    return await this.validateVatNumber(args);
        case 'create_transaction':     return await this.createTransaction(args);
        case 'get_transaction':        return await this.getTransaction(args);
        case 'update_transaction':     return await this.updateTransaction(args);
        case 'confirm_transaction':    return await this.confirmTransaction(args);
        case 'cancel_transaction':     return await this.cancelTransaction(args);
        case 'list_transactions':      return await this.listTransactions(args);
        case 'create_refund':          return await this.createRefund(args);
        case 'list_refunds':           return await this.listRefunds(args);
        case 'create_payment':         return await this.createPayment(args);
        case 'list_payments':          return await this.listPayments(args);
        case 'get_settlement':         return await this.getSettlement(args);
        case 'get_settlement_summary': return await this.getSettlementSummary(args);
        case 'get_refunds_report':     return await this.getRefundsReport(args);
        case 'get_eu_vies_report':     return await this.getEuViesReport(args);
        case 'locate_ip':              return await this.locateIp(args);
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
    return { 'Token': this.apiKey, 'Content-Type': 'application/json' };
  }

  private async apiGet(path: string, params?: Record<string, unknown>): Promise<ToolResult> {
    let url = `${this.baseUrl}${path}`;
    if (params && Object.keys(params).length > 0) {
      const qs = new URLSearchParams();
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== null) qs.set(k, String(v));
      }
      url += '?' + qs.toString();
    }
    const response = await this.fetchWithRetry(url, { method: 'GET', headers: this.headers });
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `Taxamo API error ${response.status}: ${errText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Taxamo returned non-JSON (HTTP ${response.status})`); }
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
      return { content: [{ type: 'text', text: `Taxamo API error ${response.status}: ${errText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Taxamo returned non-JSON (HTTP ${response.status})`); }
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
      return { content: [{ type: 'text', text: `Taxamo API error ${response.status}: ${errText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Taxamo returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apiDelete(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, { method: 'DELETE', headers: this.headers });
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `Taxamo API error ${response.status}: ${errText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Taxamo returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async calculateSimpleTax(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, unknown> = { currency_code: args.currency_code };
    for (const k of ['amount', 'total_amount', 'unit_price', 'quantity', 'product_type',
      'buyer_credit_card_prefix', 'buyer_tax_number', 'billing_country_code',
      'force_country_code', 'order_date', 'tax_deducted']) {
      if (args[k] !== undefined) params[k] = args[k];
    }
    return this.apiGet('/api/v1/tax/calculate', params);
  }

  private async calculateTax(args: Record<string, unknown>): Promise<ToolResult> {
    const transaction: Record<string, unknown> = {
      currency_code: args.currency_code,
      transaction_lines: args.transaction_lines,
    };
    for (const k of ['buyer_ip', 'buyer_credit_card_prefix', 'billing_country_code',
      'buyer_tax_number', 'force_country_code', 'order_date', 'buyer_email', 'buyer_name']) {
      if (args[k] !== undefined) transaction[k] = args[k];
    }
    return this.apiPost('/api/v1/tax/calculate', { transaction });
  }

  private async validateVatNumber(args: Record<string, unknown>): Promise<ToolResult> {
    const taxNumber = args.tax_number as string;
    if (!taxNumber) return { content: [{ type: 'text', text: 'tax_number is required' }], isError: true };
    return this.apiGet(`/api/v1/tax/vat_numbers/${encodeURIComponent(taxNumber)}/validate`);
  }

  private async createTransaction(args: Record<string, unknown>): Promise<ToolResult> {
    const transaction: Record<string, unknown> = {
      currency_code: args.currency_code,
      transaction_lines: args.transaction_lines,
    };
    for (const k of ['buyer_ip', 'buyer_credit_card_prefix', 'billing_country_code',
      'buyer_tax_number', 'buyer_email', 'buyer_name', 'custom_id', 'invoice_number',
      'invoice_date', 'status', 'force_country_code', 'order_date']) {
      if (args[k] !== undefined) transaction[k] = args[k];
    }
    const body: Record<string, unknown> = { transaction };
    if (args.manual_mode !== undefined) body['manual_mode'] = args.manual_mode;
    return this.apiPost('/api/v1/transactions', body);
  }

  private async getTransaction(args: Record<string, unknown>): Promise<ToolResult> {
    const key = args.key as string;
    if (!key) return { content: [{ type: 'text', text: 'key is required' }], isError: true };
    return this.apiGet(`/api/v1/transactions/${encodeURIComponent(key)}`);
  }

  private async updateTransaction(args: Record<string, unknown>): Promise<ToolResult> {
    const key = args.key as string;
    if (!key) return { content: [{ type: 'text', text: 'key is required' }], isError: true };
    const transaction: Record<string, unknown> = {};
    for (const k of ['currency_code', 'transaction_lines', 'buyer_email', 'buyer_name',
      'custom_id', 'invoice_number', 'billing_country_code', 'buyer_tax_number']) {
      if (args[k] !== undefined) transaction[k] = args[k];
    }
    return this.apiPut(`/api/v1/transactions/${encodeURIComponent(key)}`, { transaction });
  }

  private async confirmTransaction(args: Record<string, unknown>): Promise<ToolResult> {
    const key = args.key as string;
    if (!key) return { content: [{ type: 'text', text: 'key is required' }], isError: true };
    return this.apiPost(`/api/v1/transactions/${encodeURIComponent(key)}/confirm`, { transaction: {} });
  }

  private async cancelTransaction(args: Record<string, unknown>): Promise<ToolResult> {
    const key = args.key as string;
    if (!key) return { content: [{ type: 'text', text: 'key is required' }], isError: true };
    return this.apiDelete(`/api/v1/transactions/${encodeURIComponent(key)}`);
  }

  private async listTransactions(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, unknown> = {};
    for (const k of ['filter_text', 'offset', 'has_note', 'key_or_custom_id', 'currency_code',
      'order_date_to', 'date_from', 'order_date_from', 'total_amount_greater_than',
      'format', 'total_amount_less_than', 'tax_country_code', 'status', 'invoice_number']) {
      if (args[k] !== undefined) params[k] = args[k];
    }
    return this.apiGet('/api/v1/transactions', params);
  }

  private async createRefund(args: Record<string, unknown>): Promise<ToolResult> {
    const key = args.key as string;
    if (!key) return { content: [{ type: 'text', text: 'key is required' }], isError: true };
    const body: Record<string, unknown> = {};
    for (const k of ['amount', 'total_amount', 'line_key', 'custom_id', 'refund_reason']) {
      if (args[k] !== undefined) body[k] = args[k];
    }
    return this.apiPost(`/api/v1/transactions/${encodeURIComponent(key)}/refunds`, body);
  }

  private async listRefunds(args: Record<string, unknown>): Promise<ToolResult> {
    const key = args.key as string;
    if (!key) return { content: [{ type: 'text', text: 'key is required' }], isError: true };
    return this.apiGet(`/api/v1/transactions/${encodeURIComponent(key)}/refunds`);
  }

  private async createPayment(args: Record<string, unknown>): Promise<ToolResult> {
    const key = args.key as string;
    if (!key || args.amount === undefined) {
      return { content: [{ type: 'text', text: 'key and amount are required' }], isError: true };
    }
    const body: Record<string, unknown> = { amount: args.amount };
    if (args.payment_information !== undefined) body['payment_information'] = args.payment_information;
    if (args.payment_timestamp !== undefined) body['payment_timestamp'] = args.payment_timestamp;
    return this.apiPost(`/api/v1/transactions/${encodeURIComponent(key)}/payments`, body);
  }

  private async listPayments(args: Record<string, unknown>): Promise<ToolResult> {
    const key = args.key as string;
    if (!key) return { content: [{ type: 'text', text: 'key is required' }], isError: true };
    return this.apiGet(`/api/v1/transactions/${encodeURIComponent(key)}/payments`);
  }

  private async getSettlement(args: Record<string, unknown>): Promise<ToolResult> {
    const quarter = args.quarter as string;
    if (!quarter) return { content: [{ type: 'text', text: 'quarter is required' }], isError: true };
    const params: Record<string, unknown> = {};
    if (args.tax_country_code) params['tax_country_code'] = args.tax_country_code;
    return this.apiGet(`/api/v1/settlement/${encodeURIComponent(quarter)}`, params);
  }

  private async getSettlementSummary(args: Record<string, unknown>): Promise<ToolResult> {
    const quarter = args.quarter as string;
    if (!quarter) return { content: [{ type: 'text', text: 'quarter is required' }], isError: true };
    return this.apiGet(`/api/v1/settlement/summary/${encodeURIComponent(quarter)}`);
  }

  private async getRefundsReport(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, unknown> = { date_from: args.date_from };
    if (args.date_to) params['date_to'] = args.date_to;
    if (args.tax_country_code) params['tax_country_code'] = args.tax_country_code;
    return this.apiGet('/api/v1/settlement/refunds', params);
  }

  private async getEuViesReport(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, unknown> = {
      eu_country_code: args.eu_country_code,
      start_month: args.start_month,
      end_month: args.end_month,
    };
    if (args.lff_sequence_number) params['lff_sequence_number'] = args.lff_sequence_number;
    return this.apiGet('/api/v1/reports/eu/vies', params);
  }

  private async locateIp(args: Record<string, unknown>): Promise<ToolResult> {
    const ip = args.ip as string | undefined;
    if (ip) return this.apiGet(`/api/v1/geoip/${encodeURIComponent(ip)}`);
    return this.apiGet('/api/v1/geoip');
  }
}

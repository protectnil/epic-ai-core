/**
 * IDTBeyond MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// No official IDTBeyond MCP server was found on GitHub.
// We build a full REST wrapper covering mobile top-ups, products, balance, charges, and number validation.
//
// Base URL: https://api.idtbeyond.com/v1
// Auth: app-id and app-key headers
// Docs: https://api.idtbeyond.com/v1/iatu/docs
// Rate limits: Refer to your IDTBeyond account agreement

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface IDTBeyondConfig {
  appId: string;
  appKey: string;
  baseUrl?: string;
}

export class IDTBeyondMCPServer extends MCPAdapterBase {
  private readonly appId: string;
  private readonly appKey: string;
  private readonly baseUrl: string;

  constructor(config: IDTBeyondConfig) {
    super();
    this.appId   = config.appId;
    this.appKey  = config.appKey;
    this.baseUrl = config.baseUrl || 'https://api.idtbeyond.com/v1';
  }

  static catalog() {
    return {
      name: 'idtbeyond',
      displayName: 'IDTBeyond',
      version: '1.0.0',
      category: 'telecom',
      keywords: [
        'idtbeyond', 'idt', 'topup', 'top-up', 'mobile', 'recharge', 'telecom',
        'airtime', 'prepaid', 'phone', 'wireless', 'international', 'balance',
        'pin', 'transfer', 'mobile money', 'voucher', 'number validation',
        'products', 'promotions', 'charges', 'revenue',
      ],
      toolNames: [
        'get_account_balance',
        'validate_mobile_number',
        'list_products',
        'get_local_value',
        'get_promotions',
        'topup_mobile',
        'search_topups',
        'list_all_topups',
        'get_topup_totals',
        'reverse_topup',
        'list_all_charges',
        'get_status',
      ],
      description: 'IDTBeyond IATU API: top up international mobile phones, validate numbers, browse carrier products and promotions, and manage your account balance and transaction history.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      // ── Account ───────────────────────────────────────────────────────────────
      {
        name: 'get_account_balance',
        description: 'Retrieve the current account balance for your IDTBeyond IATU account',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_status',
        description: 'Check the current operational status of the IDTBeyond API',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      // ── Number Validation ────────────────────────────────────────────────────
      {
        name: 'validate_mobile_number',
        description: 'Validate a mobile phone number — returns carrier, country, number type, and whether the number is valid for top-up',
        inputSchema: {
          type: 'object',
          properties: {
            mobile_number: {
              type: 'string',
              description: 'The mobile number to validate including country code (e.g. 13059521234)',
            },
            country_code: {
              type: 'string',
              description: 'ISO 3166-1 alpha-2 country code (e.g. US, MX, BR)',
            },
          },
          required: ['mobile_number', 'country_code'],
        },
      },
      // ── Products ──────────────────────────────────────────────────────────────
      {
        name: 'list_products',
        description: 'List all available top-up products — returns carrier names, face values, costs, and country coverage',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_local_value',
        description: 'Get the estimated local value a recipient will receive for a given top-up product',
        inputSchema: {
          type: 'object',
          properties: {
            country_code: {
              type: 'string',
              description: 'ISO 3166-1 alpha-2 country code (e.g. MX, BR, PH)',
            },
            carrier_code: {
              type: 'string',
              description: 'The carrier code as returned by list_products',
            },
            amount: {
              type: 'number',
              description: 'The face value amount of the top-up product',
            },
            currency_code: {
              type: 'string',
              description: 'ISO 4217 currency code for the amount (e.g. USD)',
            },
          },
          required: ['country_code', 'carrier_code', 'amount', 'currency_code'],
        },
      },
      {
        name: 'get_promotions',
        description: 'Retrieve current promotions and bonus offers available on IDTBeyond top-up products',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      // ── Top-ups ───────────────────────────────────────────────────────────────
      {
        name: 'topup_mobile',
        description: 'Execute a mobile top-up — send airtime or data credit to a mobile number',
        inputSchema: {
          type: 'object',
          properties: {
            mobile_number: {
              type: 'string',
              description: 'The recipient mobile number including country code (e.g. 13059521234)',
            },
            country_code: {
              type: 'string',
              description: 'ISO 3166-1 alpha-2 country code of the recipient (e.g. MX)',
            },
            carrier_code: {
              type: 'string',
              description: 'Carrier code as returned by list_products',
            },
            amount: {
              type: 'number',
              description: 'Face value amount of the top-up product in the local currency',
            },
            currency_code: {
              type: 'string',
              description: 'ISO 4217 currency code for the amount (e.g. USD)',
            },
            client_transaction_id: {
              type: 'string',
              description: 'Your unique transaction identifier for idempotency and tracking (max 20 chars)',
            },
          },
          required: ['mobile_number', 'country_code', 'carrier_code', 'amount', 'currency_code', 'client_transaction_id'],
        },
      },
      {
        name: 'search_topups',
        description: 'Search top-up transaction history using filters like date range, mobile number, or client transaction ID',
        inputSchema: {
          type: 'object',
          properties: {
            date_from: {
              type: 'string',
              description: 'Start date for the search range in YYYY-MM-DD format',
            },
            date_to: {
              type: 'string',
              description: 'End date for the search range in YYYY-MM-DD format',
            },
            mobile_number: {
              type: 'string',
              description: 'Filter by recipient mobile number (optional)',
            },
            client_transaction_id: {
              type: 'string',
              description: 'Filter by your client transaction ID (optional)',
            },
          },
        },
      },
      {
        name: 'list_all_topups',
        description: 'List all top-up transactions for the account in JSON format — returns full transaction history',
        inputSchema: {
          type: 'object',
          properties: {
            date_from: {
              type: 'string',
              description: 'Start date filter in YYYY-MM-DD format (optional)',
            },
            date_to: {
              type: 'string',
              description: 'End date filter in YYYY-MM-DD format (optional)',
            },
          },
        },
      },
      {
        name: 'get_topup_totals',
        description: 'Get a summary of top-up transaction totals — aggregated counts and amounts for the account',
        inputSchema: {
          type: 'object',
          properties: {
            date_from: {
              type: 'string',
              description: 'Start date filter in YYYY-MM-DD format (optional)',
            },
            date_to: {
              type: 'string',
              description: 'End date filter in YYYY-MM-DD format (optional)',
            },
          },
        },
      },
      {
        name: 'reverse_topup',
        description: 'Reverse a previously executed top-up transaction — cancels the top-up if the carrier supports it',
        inputSchema: {
          type: 'object',
          properties: {
            client_transaction_id: {
              type: 'string',
              description: 'The client transaction ID of the top-up to reverse',
            },
            mobile_number: {
              type: 'string',
              description: 'The mobile number that received the original top-up',
            },
          },
          required: ['client_transaction_id', 'mobile_number'],
        },
      },
      // ── Charges ───────────────────────────────────────────────────────────────
      {
        name: 'list_all_charges',
        description: 'List all charges on the account in JSON format — returns fees, deductions, and billing history',
        inputSchema: {
          type: 'object',
          properties: {
            date_from: {
              type: 'string',
              description: 'Start date filter in YYYY-MM-DD format (optional)',
            },
            date_to: {
              type: 'string',
              description: 'End date filter in YYYY-MM-DD format (optional)',
            },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'get_account_balance':   return this.getAccountBalance();
        case 'get_status':            return this.getStatus();
        case 'validate_mobile_number': return this.validateMobileNumber(args);
        case 'list_products':         return this.listProducts();
        case 'get_local_value':       return this.getLocalValue(args);
        case 'get_promotions':        return this.getPromotions();
        case 'topup_mobile':          return this.topupMobile(args);
        case 'search_topups':         return this.searchTopups(args);
        case 'list_all_topups':       return this.listAllTopups(args);
        case 'get_topup_totals':      return this.getTopupTotals(args);
        case 'reverse_topup':         return this.reverseTopup(args);
        case 'list_all_charges':      return this.listAllCharges(args);
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

  private async get(path: string, params: Record<string, string> = {}): Promise<ToolResult> {
    const qs = Object.keys(params).length > 0 ? '?' + new URLSearchParams(params).toString() : '';
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}${qs}`, {
      headers: {
        'app-id':  this.appId,
        'app-key': this.appKey,
        Accept: 'application/json',
      },
    });
    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async post(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: {
        'app-id':  this.appId,
        'app-key': this.appKey,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  // ── Method implementations ────────────────────────────────────────────────

  private getAccountBalance(): Promise<ToolResult> {
    return this.get('/iatu/balance');
  }

  private getStatus(): Promise<ToolResult> {
    return this.get('/status');
  }

  private validateMobileNumber(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      mobile_number: String(args.mobile_number),
      country_code:  String(args.country_code),
    };
    return this.get('/iatu/number-validator', params);
  }

  private listProducts(): Promise<ToolResult> {
    return this.get('/iatu/products/reports/all');
  }

  private getLocalValue(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      country_code:  String(args.country_code),
      carrier_code:  String(args.carrier_code),
      amount:        String(args.amount),
      currency_code: String(args.currency_code),
    };
    return this.get('/iatu/products/reports/local-value', params);
  }

  private getPromotions(): Promise<ToolResult> {
    return this.get('/iatu/products/promotions');
  }

  private topupMobile(args: Record<string, unknown>): Promise<ToolResult> {
    return this.post('/iatu/topups', {
      mobile_number:        args.mobile_number,
      country_code:         args.country_code,
      carrier_code:         args.carrier_code,
      amount:               args.amount,
      currency_code:        args.currency_code,
      client_transaction_id: args.client_transaction_id,
    });
  }

  private searchTopups(args: Record<string, unknown>): Promise<ToolResult> {
    return this.post('/iatu/topups/reports', args);
  }

  private listAllTopups(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (args.date_from) params.date_from = String(args.date_from);
    if (args.date_to)   params.date_to   = String(args.date_to);
    return this.get('/iatu/topups/reports/all', params);
  }

  private getTopupTotals(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (args.date_from) params.date_from = String(args.date_from);
    if (args.date_to)   params.date_to   = String(args.date_to);
    return this.get('/iatu/topups/reports/totals', params);
  }

  private reverseTopup(args: Record<string, unknown>): Promise<ToolResult> {
    return this.post('/iatu/topups/reverse', {
      client_transaction_id: args.client_transaction_id,
      mobile_number:         args.mobile_number,
    });
  }

  private listAllCharges(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (args.date_from) params.date_from = String(args.date_from);
    if (args.date_to)   params.date_to   = String(args.date_to);
    return this.get('/iatu/charges/reports/all', params);
  }
}

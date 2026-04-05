/**
 * eBay Sell Finances MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// No official eBay Sell Finances MCP server was found on GitHub.
//
// Base URL: https://apiz.ebay.com/sell/finances/v1
// Auth: OAuth2 authorization code flow — scope: https://api.ebay.com/oauth/api_scope/sell.finances
//       Token URL: https://api.ebay.com/identity/v1/oauth2/token
// Docs: https://developer.ebay.com/api-docs/sell/finances/overview.html
// Rate limits: Not publicly documented; standard eBay API limits apply (5,000 calls/day on Basic plan)

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface EbayFinancesConfig {
  /** OAuth2 access token with scope https://api.ebay.com/oauth/api_scope/sell.finances */
  accessToken: string;
  /** eBay marketplace ID (default: EBAY_US). Required for non-US marketplaces. */
  marketplaceId?: string;
  /** Optional base URL override */
  baseUrl?: string;
}

export class ApizEbaySellFinancesMCPServer extends MCPAdapterBase {
  private readonly accessToken: string;
  private readonly marketplaceId: string;
  private readonly baseUrl: string;

  constructor(config: EbayFinancesConfig) {
    super();
    this.accessToken = config.accessToken;
    this.marketplaceId = config.marketplaceId ?? 'EBAY_US';
    this.baseUrl = config.baseUrl ?? 'https://apiz.ebay.com/sell/finances/v1';
  }

  static catalog() {
    return {
      name: 'apiz-ebay-sell-finances',
      displayName: 'eBay Sell Finances',
      version: '1.0.0',
      category: 'finance' as const,
      keywords: [
        'ebay', 'sell', 'finances', 'payout', 'transaction', 'transfer',
        'seller', 'funds', 'marketplace', 'ecommerce', 'revenue', 'settlement',
        'financial', 'payment', 'disbursement',
      ],
      toolNames: [
        'list_payouts',
        'get_payout',
        'get_payout_summary',
        'get_seller_funds_summary',
        'list_transactions',
        'get_transaction_summary',
        'get_transfer',
      ],
      description: 'eBay seller financial data: payouts, transactions, transfers, and funds summaries via the eBay Sell Finances API.',
      author: 'protectnil' as const,
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_payouts',
        description: 'List eBay seller payouts with optional filters for payout status, date range, and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            filter: {
              type: 'string',
              description: 'Filter by payout status or date range. Examples: "payoutStatus:{SUCCEEDED}", "payoutDate:[2024-01-01T00:00:00.000Z..2024-12-31T23:59:59.999Z]"',
            },
            limit: {
              type: 'number',
              description: 'Number of payouts to return per page (default: 20, max: 200)',
            },
            offset: {
              type: 'number',
              description: 'Number of payouts to skip for pagination (default: 0)',
            },
            sort: {
              type: 'string',
              description: 'Sort field. Use "payoutDate" for ascending or "-payoutDate" for descending (default: descending)',
            },
          },
        },
      },
      {
        name: 'get_payout',
        description: 'Retrieve details of a single eBay seller payout by its unique payout ID, including amount and status',
        inputSchema: {
          type: 'object',
          properties: {
            payout_id: {
              type: 'string',
              description: 'The unique identifier of the payout to retrieve',
            },
          },
          required: ['payout_id'],
        },
      },
      {
        name: 'get_payout_summary',
        description: 'Get aggregate payout totals for an eBay seller, with optional filters for status and date range',
        inputSchema: {
          type: 'object',
          properties: {
            filter: {
              type: 'string',
              description: 'Filter by payout status or date range. Examples: "payoutStatus:{SUCCEEDED}", "payoutDate:[2024-01-01T00:00:00.000Z..]"',
            },
          },
        },
      },
      {
        name: 'get_seller_funds_summary',
        description: 'Retrieve the seller\'s current available, processing, and on-hold fund balances across all eBay payouts',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'list_transactions',
        description: 'List eBay seller monetary transactions including sales, refunds, credits, and disputes with optional type, status, and date filters',
        inputSchema: {
          type: 'object',
          properties: {
            filter: {
              type: 'string',
              description: 'Filter by type, status, or date. Examples: "transactionType:{SALE}", "transactionStatus:{PAYOUT}", "transactionDate:[2024-01-01T00:00:00.000Z..]"',
            },
            limit: {
              type: 'number',
              description: 'Number of transactions to return per page (default: 20, max: 200)',
            },
            offset: {
              type: 'number',
              description: 'Number of transactions to skip for pagination (default: 0)',
            },
            sort: {
              type: 'string',
              description: 'Sort field. Currently only default sort (descending by transaction date) is supported.',
            },
          },
        },
      },
      {
        name: 'get_transaction_summary',
        description: 'Get aggregate totals for eBay seller transactions grouped by type and status, with optional date range and type filters',
        inputSchema: {
          type: 'object',
          properties: {
            filter: {
              type: 'string',
              description: 'Filter by transaction type, status, or date range. Examples: "transactionType:{SALE}", "transactionDate:[2024-01-01T00:00:00.000Z..]"',
            },
          },
        },
      },
      {
        name: 'get_transfer',
        description: 'Retrieve details of a TRANSFER-type eBay transaction by transfer ID, including fee breakdowns and funding source',
        inputSchema: {
          type: 'object',
          properties: {
            transfer_id: {
              type: 'string',
              description: 'The unique identifier of the TRANSFER transaction to retrieve',
            },
          },
          required: ['transfer_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_payouts':
          return await this.listPayouts(args);
        case 'get_payout':
          return await this.getPayout(args);
        case 'get_payout_summary':
          return await this.getPayoutSummary(args);
        case 'get_seller_funds_summary':
          return await this.getSellerFundsSummary();
        case 'list_transactions':
          return await this.listTransactions(args);
        case 'get_transaction_summary':
          return await this.getTransactionSummary(args);
        case 'get_transfer':
          return await this.getTransfer(args);
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

  private buildHeaders(): Record<string, string> {
    return {
      'Authorization': `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
      'X-EBAY-C-MARKETPLACE-ID': this.marketplaceId,
    };
  }

  private async listPayouts(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.filter) params.set('filter', String(args.filter));
    if (args.limit !== undefined) params.set('limit', String(args.limit));
    if (args.offset !== undefined) params.set('offset', String(args.offset));
    if (args.sort) params.set('sort', String(args.sort));

    const qs = params.toString();
    const url = `${this.baseUrl}/payout${qs ? '?' + qs : ''}`;
    const response = await this.fetchWithRetry(url, { headers: this.buildHeaders() });

    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }

    const data = await response.json() as unknown;
    const text = JSON.stringify(data, null, 2);
    const truncated = text.length > 10_000
      ? text.slice(0, 10_000) + `\n... [truncated, ${text.length} total chars]`
      : text;

    return { content: [{ type: 'text', text: truncated }], isError: false };
  }

  private async getPayout(args: Record<string, unknown>): Promise<ToolResult> {
    const payoutId = args.payout_id as string;
    if (!payoutId) {
      return {
        content: [{ type: 'text', text: 'payout_id is required' }],
        isError: true,
      };
    }

    const url = `${this.baseUrl}/payout/${encodeURIComponent(payoutId)}`;
    const response = await this.fetchWithRetry(url, { headers: this.buildHeaders() });

    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }

    const data = await response.json() as unknown;
    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      isError: false,
    };
  }

  private async getPayoutSummary(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.filter) params.set('filter', String(args.filter));

    const qs = params.toString();
    const url = `${this.baseUrl}/payout_summary${qs ? '?' + qs : ''}`;
    const response = await this.fetchWithRetry(url, { headers: this.buildHeaders() });

    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }

    const data = await response.json() as unknown;
    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      isError: false,
    };
  }

  private async getSellerFundsSummary(): Promise<ToolResult> {
    const url = `${this.baseUrl}/seller_funds_summary`;
    const response = await this.fetchWithRetry(url, { headers: this.buildHeaders() });

    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }

    const data = await response.json() as unknown;
    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      isError: false,
    };
  }

  private async listTransactions(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.filter) params.set('filter', String(args.filter));
    if (args.limit !== undefined) params.set('limit', String(args.limit));
    if (args.offset !== undefined) params.set('offset', String(args.offset));
    if (args.sort) params.set('sort', String(args.sort));

    const qs = params.toString();
    const url = `${this.baseUrl}/transaction${qs ? '?' + qs : ''}`;
    const response = await this.fetchWithRetry(url, { headers: this.buildHeaders() });

    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }

    const data = await response.json() as unknown;
    const text = JSON.stringify(data, null, 2);
    const truncated = text.length > 10_000
      ? text.slice(0, 10_000) + `\n... [truncated, ${text.length} total chars]`
      : text;

    return { content: [{ type: 'text', text: truncated }], isError: false };
  }

  private async getTransactionSummary(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.filter) params.set('filter', String(args.filter));

    const qs = params.toString();
    const url = `${this.baseUrl}/transaction_summary${qs ? '?' + qs : ''}`;
    const response = await this.fetchWithRetry(url, { headers: this.buildHeaders() });

    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }

    const data = await response.json() as unknown;
    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      isError: false,
    };
  }

  private async getTransfer(args: Record<string, unknown>): Promise<ToolResult> {
    const transferId = args.transfer_id as string;
    if (!transferId) {
      return {
        content: [{ type: 'text', text: 'transfer_id is required' }],
        isError: true,
      };
    }

    const url = `${this.baseUrl}/transfer/${encodeURIComponent(transferId)}`;
    const response = await this.fetchWithRetry(url, { headers: this.buildHeaders() });

    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }

    const data = await response.json() as unknown;
    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      isError: false,
    };
  }
}

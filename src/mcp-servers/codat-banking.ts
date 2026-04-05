/**
 * Codat Banking MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03. Codat has not published an official MCP server.
//
// Base URL: https://api.codat.io
// Auth: API key — Authorization: Basic <base64(apiKey:)>  (username=apiKey, password=empty)
// Docs: https://docs.codat.io/banking-api/overview
// Rate limits: Not publicly documented for banking endpoints.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface CodatBankingConfig {
  apiKey: string;
  baseUrl?: string;
}

export class CodatBankingMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly authHeader: string;

  constructor(config: CodatBankingConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.codat.io';
    // Codat uses Basic auth: base64(apiKey + ":")
    this.authHeader = `Basic ${Buffer.from(`${this.apiKey}:`).toString('base64')}`;
  }

  static catalog() {
    return {
      name: 'codat-banking',
      displayName: 'Codat Banking',
      version: '1.0.0',
      category: 'finance' as const,
      keywords: ['codat', 'banking', 'accounts', 'transactions', 'balances', 'open-banking', 'fintech', 'financial-data'],
      toolNames: [
        'list_accounts', 'get_account',
        'list_account_balances',
        'list_transaction_categories', 'get_transaction_category',
        'list_transactions', 'get_transaction',
        'list_bank_transactions',
      ],
      description: 'Access Codat banking data: bank accounts, balances, transactions, and transaction categories via the Codat Banking API.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      // Accounts
      {
        name: 'list_accounts',
        description: 'List all banking accounts for a company connection',
        inputSchema: {
          type: 'object',
          properties: {
            company_id: { type: 'string', description: 'Codat company ID' },
            connection_id: { type: 'string', description: 'Codat data connection ID' },
            page: { type: 'number', description: 'Page number (default: 1)' },
            page_size: { type: 'number', description: 'Items per page (max 5000, default: 100)' },
            query: { type: 'string', description: 'Codat query filter string' },
            order_by: { type: 'string', description: 'Field to order results by' },
          },
          required: ['company_id', 'connection_id'],
        },
      },
      {
        name: 'get_account',
        description: 'Get a single banking account by its ID',
        inputSchema: {
          type: 'object',
          properties: {
            company_id: { type: 'string', description: 'Codat company ID' },
            connection_id: { type: 'string', description: 'Codat data connection ID' },
            account_id: { type: 'string', description: 'Banking account ID' },
          },
          required: ['company_id', 'connection_id', 'account_id'],
        },
      },
      // Account Balances
      {
        name: 'list_account_balances',
        description: 'List account balance history for a company connection',
        inputSchema: {
          type: 'object',
          properties: {
            company_id: { type: 'string', description: 'Codat company ID' },
            connection_id: { type: 'string', description: 'Codat data connection ID' },
            page: { type: 'number', description: 'Page number (default: 1)' },
            page_size: { type: 'number', description: 'Items per page (max 5000, default: 100)' },
            query: { type: 'string', description: 'Codat query filter string' },
            order_by: { type: 'string', description: 'Field to order results by' },
          },
          required: ['company_id', 'connection_id'],
        },
      },
      // Transaction Categories
      {
        name: 'list_transaction_categories',
        description: 'List all transaction categories for a company connection',
        inputSchema: {
          type: 'object',
          properties: {
            company_id: { type: 'string', description: 'Codat company ID' },
            connection_id: { type: 'string', description: 'Codat data connection ID' },
            page: { type: 'number', description: 'Page number (default: 1)' },
            page_size: { type: 'number', description: 'Items per page (max 5000, default: 100)' },
            query: { type: 'string', description: 'Codat query filter string' },
            order_by: { type: 'string', description: 'Field to order results by' },
          },
          required: ['company_id', 'connection_id'],
        },
      },
      {
        name: 'get_transaction_category',
        description: 'Get a single transaction category by its ID',
        inputSchema: {
          type: 'object',
          properties: {
            company_id: { type: 'string', description: 'Codat company ID' },
            connection_id: { type: 'string', description: 'Codat data connection ID' },
            transaction_category_id: { type: 'string', description: 'Transaction category ID' },
          },
          required: ['company_id', 'connection_id', 'transaction_category_id'],
        },
      },
      // Transactions (connection-scoped)
      {
        name: 'list_transactions',
        description: 'List banking transactions for a company connection, with optional filtering by date and account',
        inputSchema: {
          type: 'object',
          properties: {
            company_id: { type: 'string', description: 'Codat company ID' },
            connection_id: { type: 'string', description: 'Codat data connection ID' },
            page: { type: 'number', description: 'Page number (default: 1)' },
            page_size: { type: 'number', description: 'Items per page (max 5000, default: 100)' },
            query: { type: 'string', description: 'Codat query filter string (e.g. accountId=xxx)' },
            order_by: { type: 'string', description: 'Field to order results by (e.g. -date)' },
          },
          required: ['company_id', 'connection_id'],
        },
      },
      {
        name: 'get_transaction',
        description: 'Get a single banking transaction by its ID',
        inputSchema: {
          type: 'object',
          properties: {
            company_id: { type: 'string', description: 'Codat company ID' },
            connection_id: { type: 'string', description: 'Codat data connection ID' },
            transaction_id: { type: 'string', description: 'Transaction ID' },
          },
          required: ['company_id', 'connection_id', 'transaction_id'],
        },
      },
      // Bank Transactions (company-scoped — all connections)
      {
        name: 'list_bank_transactions',
        description: 'List all banking transactions for a company across all connections',
        inputSchema: {
          type: 'object',
          properties: {
            company_id: { type: 'string', description: 'Codat company ID' },
            page: { type: 'number', description: 'Page number (default: 1)' },
            page_size: { type: 'number', description: 'Items per page (max 5000, default: 100)' },
            query: { type: 'string', description: 'Codat query filter string' },
            order_by: { type: 'string', description: 'Field to order results by' },
          },
          required: ['company_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_accounts':
          return await this.get(
            `/companies/${args.company_id}/connections/${args.connection_id}/data/banking-accounts`,
            this.pageParams(args),
          );

        case 'get_account':
          return await this.get(
            `/companies/${args.company_id}/connections/${args.connection_id}/data/banking-accounts/${args.account_id}`,
          );

        case 'list_account_balances':
          return await this.get(
            `/companies/${args.company_id}/connections/${args.connection_id}/data/banking-accountBalances`,
            this.pageParams(args),
          );

        case 'list_transaction_categories':
          return await this.get(
            `/companies/${args.company_id}/connections/${args.connection_id}/data/banking-transactionCategories`,
            this.pageParams(args),
          );

        case 'get_transaction_category':
          return await this.get(
            `/companies/${args.company_id}/connections/${args.connection_id}/data/banking-transactionCategories/${args.transaction_category_id}`,
          );

        case 'list_transactions':
          return await this.get(
            `/companies/${args.company_id}/connections/${args.connection_id}/data/banking-transactions`,
            this.pageParams(args),
          );

        case 'get_transaction':
          return await this.get(
            `/companies/${args.company_id}/connections/${args.connection_id}/data/banking-transactions/${args.transaction_id}`,
          );

        case 'list_bank_transactions':
          return await this.get(
            `/companies/${args.company_id}/data/banking-transactions`,
            this.pageParams(args),
          );

        default:
          return {
            content: [{ type: 'text', text: `Unknown tool: ${name}` }],
            isError: true,
          };
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        content: [{ type: 'text', text: `Error calling ${name}: ${msg}` }],
        isError: true,
      };
    }
  }

  // Private helpers

  private pageParams(args: Record<string, unknown>): URLSearchParams {
    const params = new URLSearchParams();
    if (args.page) params.set('page', String(args.page));
    if (args.page_size) params.set('pageSize', String(args.page_size));
    if (args.query) params.set('query', args.query as string);
    if (args.order_by) params.set('orderBy', args.order_by as string);
    return params;
  }

  private async get(path: string, params?: URLSearchParams): Promise<ToolResult> {
    const qs = params && params.toString() ? `?${params}` : '';
    const url = `${this.baseUrl}${path}${qs}`;

    const res = await this.fetchWithRetry(url, {
      method: 'GET',
      headers: {
        Authorization: this.authHeader,
        Accept: 'application/json',
      },
    });

    const raw = await res.text();
    const text = raw.length > 10240 ? raw.slice(0, 10240) + '\n…[truncated]' : raw;

    if (!res.ok) {
      return {
        content: [{ type: 'text', text: `HTTP ${res.status} ${res.statusText}: ${text}` }],
        isError: true,
      };
    }

    return {
      content: [{ type: 'text', text }],
      isError: false,
    };
  }
}

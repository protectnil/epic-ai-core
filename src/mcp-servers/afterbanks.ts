/**
 * Afterbanks MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// No official Afterbanks MCP server was found on GitHub.
//
// Base URL: https://www.afterbanks.com
// Auth: servicekey parameter in POST request body (all authenticated endpoints use POST with form data).
//   Obtain your servicekey from the Afterbanks dashboard: https://www.afterbanks.com/panel/
// Rate limits: Determined by your servicekey plan. Contact Afterbanks for rate limit details.
// Docs: https://www.afterbanks.com/api/documentation/
// Note: Afterbanks is a Spanish open banking aggregator supporting 100+ banks. All monetary
//   amounts are returned in the account's native currency. The API is Spanish-language at the
//   spec level but responses are locale-independent.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface AfterbanksConfig {
  servicekey: string;
  baseUrl?: string;
}

export class AfterbanksMCPServer extends MCPAdapterBase {
  private readonly servicekey: string;
  private readonly baseUrl: string;

  constructor(config: AfterbanksConfig) {
    super();
    this.servicekey = config.servicekey;
    this.baseUrl = (config.baseUrl || 'https://www.afterbanks.com').replace(/\/$/, '');
  }

  private async postForm(path: string, params: Record<string, string>): Promise<ToolResult> {
    const body = new URLSearchParams(params);
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return {
        content: [{ type: 'text', text: `Afterbanks API error ${response.status}: ${errText}` }],
        isError: true,
      };
    }

    const data = await response.json();
    return {
      content: [{ type: 'text', text: this.truncate(data) }],
      isError: false,
    };
  }

  private async get(path: string, params?: Record<string, string>): Promise<ToolResult> {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}${qs}`, { method: 'GET' });

    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return {
        content: [{ type: 'text', text: `Afterbanks API error ${response.status}: ${errText}` }],
        isError: true,
      };
    }

    const data = await response.json();
    return {
      content: [{ type: 'text', text: this.truncate(data) }],
      isError: false,
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'get_supported_banks',
        description: 'List all banks and financial institutions supported by Afterbanks, optionally filtered by country code. Returns bank identifiers needed for account aggregation.',
        inputSchema: {
          type: 'object',
          properties: {
            country_code: {
              type: 'string',
              description: 'ISO 3166-1 alpha-2 country code to filter banks by country (e.g. ES, PT, MX). Leave empty for all countries.',
            },
          },
        },
      },
      {
        name: 'get_accounts_and_transactions',
        description: 'Retrieve the global position (accounts, balances, and recent transactions) for a bank user. Connects to the bank in real-time using the provided credentials.',
        inputSchema: {
          type: 'object',
          properties: {
            service: {
              type: 'string',
              description: 'Bank service identifier as returned by get_supported_banks (e.g. "N26_GLOBAL", "BBVA_ES")',
            },
            user: {
              type: 'string',
              description: 'Bank login username or DNI/NIF for the customer',
            },
            pass: {
              type: 'string',
              description: 'Bank login password for the customer',
            },
            pass2: {
              type: 'string',
              description: 'Second password or PIN if required by the bank (optional)',
            },
            documentType: {
              type: 'string',
              description: 'Document type for identification if required by the bank (optional, e.g. NIF, NIE, passport)',
            },
            products: {
              type: 'string',
              description: 'Comma-separated list of product types to retrieve: ACCOUNTS, CARDS, LOANS, DEPOSITS, INVESTMENTS, PENSIONS. Defaults to ACCOUNTS.',
            },
            startdate: {
              type: 'string',
              description: 'Start date for transaction history in DD-MM-YYYY format (e.g. 01-01-2026). Defaults to 90 days ago.',
            },
          },
          required: ['service', 'user', 'pass'],
        },
      },
      {
        name: 'get_license_usage',
        description: 'Retrieve usage statistics and quota information for the current Afterbanks servicekey, including API call counts and remaining credits.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'get_supported_banks':
          return await this.getSupportedBanks(args);
        case 'get_accounts_and_transactions':
          return await this.getAccountsAndTransactions(args);
        case 'get_license_usage':
          return await this.postForm('/me', { servicekey: this.servicekey });
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

  private async getSupportedBanks(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (args.country_code) params['country_code'] = args.country_code as string;
    return this.get('/forms', Object.keys(params).length ? params : undefined);
  }

  private async getAccountsAndTransactions(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.service || !args.user || !args.pass) {
      return {
        content: [{ type: 'text', text: 'service, user, and pass are required' }],
        isError: true,
      };
    }
    const params: Record<string, string> = {
      servicekey: this.servicekey,
      service: args.service as string,
      user: args.user as string,
      pass: args.pass as string,
    };
    if (args.pass2) params['pass2'] = args.pass2 as string;
    if (args.documentType) params['documentType'] = args.documentType as string;
    if (args.products) params['products'] = args.products as string;
    if (args.startdate) params['startdate'] = args.startdate as string;
    return this.postForm('/serviceV3', params);
  }

  static catalog() {
    return {
      name: 'afterbanks',
      displayName: 'Afterbanks',
      version: '1.0.0',
      category: 'finance' as const,
      keywords: [
        'afterbanks', 'open-banking', 'bank', 'account', 'transaction', 'balance',
        'aggregation', 'finance', 'spain', 'psd2', 'pfm',
      ],
      toolNames: [
        'get_supported_banks',
        'get_accounts_and_transactions',
        'get_license_usage',
      ],
      description: 'Afterbanks open banking aggregator: retrieve real-time bank account balances and transactions across 100+ Spanish and international banks using credential-based aggregation.',
      author: 'protectnil' as const,
    };
  }
}

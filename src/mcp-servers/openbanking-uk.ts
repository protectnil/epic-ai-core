/**
 * Open Banking UK (Open Data API) MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03. Open Banking UK has not published an official MCP server.
//
// Base URL: https://developer.openbanking.org.uk/reference-implementation/open-banking/v1.3
// Auth: None — Open Data API is publicly accessible (read-only open data)
// Docs: https://openbanking.atlassian.net/wiki/spaces/DZ/pages/23857/Open+Data+API+Specifications
//       https://github.com/OpenBankingUK/opendata-api-spec-compiled
// Rate limits: Not documented. Standard fair-use policy applies.
// Note: This adapter targets the Open Data API (v1.3) which exposes ATMs, branches,
//   personal current accounts, business current accounts, SME loans, and commercial credit
//   cards as open data. Conditional request headers (If-Modified-Since, If-None-Match) are
//   supported to reduce unnecessary data transfer.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface OpenBankingUKConfig {
  /** Override base URL; defaults to the Open Banking reference implementation endpoint */
  baseUrl?: string;
}

export class OpenBankingUkMCPServer extends MCPAdapterBase {
  private readonly baseUrl: string;

  constructor(config: OpenBankingUKConfig = {}) {
    super();
    this.baseUrl = (config.baseUrl || 'https://developer.openbanking.org.uk/reference-implementation/open-banking/v1.3').replace(/\/$/, '');
  }

  static catalog() {
    return {
      name: 'openbanking-uk',
      displayName: 'Open Banking UK (Open Data)',
      version: '1.0.0',
      category: 'finance',
      keywords: [
        'openbanking', 'open banking', 'uk banking', 'open data',
        'atm', 'branch', 'bank branch', 'cash machine',
        'personal current account', 'pca', 'business current account', 'bca',
        'sme loan', 'unsecured loan', 'commercial credit card', 'ccc',
        'financial products', 'uk finance', 'banking data',
        'sort code', 'bic', 'bank', 'uk bank', 'fin-data',
      ],
      toolNames: [
        'list_atms',
        'list_branches',
        'list_personal_current_accounts',
        'list_business_current_accounts',
        'list_unsecured_sme_loans',
        'list_commercial_credit_cards',
      ],
      description: 'Open Banking UK Open Data API: query ATM locations and services, bank branch details, personal and business current accounts, unsecured SME loans, and commercial credit cards across UK banks.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      // ── ATMs ──────────────────────────────────────────────────────────────
      {
        name: 'list_atms',
        description: 'List all ATM locations and services published by participating UK banks — includes address, geo-coordinates, currencies, accessibility features, and available ATM services such as cash withdrawal, deposits, and balance enquiry',
        inputSchema: {
          type: 'object',
          properties: {
            if_modified_since: {
              type: 'string',
              description: 'Only return data if modified since this date (HTTP date format, e.g. Mon, 01 Jan 2024 00:00:00 GMT). Reduces bandwidth for polling use cases.',
            },
            if_none_match: {
              type: 'string',
              description: 'Only return data if the ETag does not match this value. Use with the ETag from a previous response.',
            },
          },
        },
      },
      // ── Branches ─────────────────────────────────────────────────────────
      {
        name: 'list_branches',
        description: 'List all bank branch locations published by participating UK banks — includes address, opening hours, services available, accessibility information, and contact details',
        inputSchema: {
          type: 'object',
          properties: {
            if_modified_since: {
              type: 'string',
              description: 'Only return data if modified since this date (HTTP date format). Reduces bandwidth for polling use cases.',
            },
            if_none_match: {
              type: 'string',
              description: 'Only return data if the ETag does not match this value.',
            },
          },
        },
      },
      // ── Personal Current Accounts ─────────────────────────────────────────
      {
        name: 'list_personal_current_accounts',
        description: 'List all personal current account (PCA) products published by participating UK banks — includes eligibility criteria, fees, interest rates, overdraft terms, and account features',
        inputSchema: {
          type: 'object',
          properties: {
            if_modified_since: {
              type: 'string',
              description: 'Only return data if modified since this date (HTTP date format).',
            },
            if_none_match: {
              type: 'string',
              description: 'Only return data if the ETag does not match this value.',
            },
          },
        },
      },
      // ── Business Current Accounts ─────────────────────────────────────────
      {
        name: 'list_business_current_accounts',
        description: 'List all business current account (BCA) products published by participating UK banks — includes eligibility, monthly fees, transaction fees, overdraft details, and account features for business customers',
        inputSchema: {
          type: 'object',
          properties: {
            if_modified_since: {
              type: 'string',
              description: 'Only return data if modified since this date (HTTP date format).',
            },
            if_none_match: {
              type: 'string',
              description: 'Only return data if the ETag does not match this value.',
            },
          },
        },
      },
      // ── Unsecured SME Loans ───────────────────────────────────────────────
      {
        name: 'list_unsecured_sme_loans',
        description: 'List all unsecured SME loan products published by participating UK banks — includes loan amounts, terms, interest rates (fixed/variable), eligibility criteria, and repayment options for small and medium-sized enterprises',
        inputSchema: {
          type: 'object',
          properties: {
            if_modified_since: {
              type: 'string',
              description: 'Only return data if modified since this date (HTTP date format).',
            },
            if_none_match: {
              type: 'string',
              description: 'Only return data if the ETag does not match this value.',
            },
          },
        },
      },
      // ── Commercial Credit Cards ───────────────────────────────────────────
      {
        name: 'list_commercial_credit_cards',
        description: 'List all commercial credit card (CCC) products published by participating UK banks — includes credit limits, APR, annual fees, rewards, eligibility criteria, and features for business credit card products',
        inputSchema: {
          type: 'object',
          properties: {
            if_modified_since: {
              type: 'string',
              description: 'Only return data if modified since this date (HTTP date format).',
            },
            if_none_match: {
              type: 'string',
              description: 'Only return data if the ETag does not match this value.',
            },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_atms':                      return this.listAtms(args);
        case 'list_branches':                  return this.listBranches(args);
        case 'list_personal_current_accounts': return this.listPersonalCurrentAccounts(args);
        case 'list_business_current_accounts': return this.listBusinessCurrentAccounts(args);
        case 'list_unsecured_sme_loans':       return this.listUnsecuredSmeLoans(args);
        case 'list_commercial_credit_cards':   return this.listCommercialCreditCards(args);
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

  private buildHeaders(args: Record<string, unknown>): Record<string, string> {
    const headers: Record<string, string> = {
      'Accept': 'application/prs.openbanking.opendata.v1.3+json, application/json',
    };
    if (args.if_modified_since) {
      headers['If-Modified-Since'] = args.if_modified_since as string;
    }
    if (args.if_none_match) {
      headers['If-None-Match'] = args.if_none_match as string;
    }
    return headers;
  }

  private async get(path: string, args: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      headers: this.buildHeaders(args),
    });

    // 304 Not Modified — data unchanged since conditional request
    if (response.status === 304) {
      return {
        content: [{ type: 'text', text: JSON.stringify({ status: 304, message: 'Not Modified — data unchanged since conditional request timestamp' }) }],
        isError: false,
      };
    }

    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }

    const data = await response.json() as unknown;
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  // ── Endpoint methods ───────────────────────────────────────────────────────

  private async listAtms(args: Record<string, unknown>): Promise<ToolResult> {
    return this.get('/atms', args);
  }

  private async listBranches(args: Record<string, unknown>): Promise<ToolResult> {
    return this.get('/branches', args);
  }

  private async listPersonalCurrentAccounts(args: Record<string, unknown>): Promise<ToolResult> {
    return this.get('/personal-current-accounts', args);
  }

  private async listBusinessCurrentAccounts(args: Record<string, unknown>): Promise<ToolResult> {
    return this.get('/business-current-accounts', args);
  }

  private async listUnsecuredSmeLoans(args: Record<string, unknown>): Promise<ToolResult> {
    return this.get('/unsecured-sme-loans', args);
  }

  private async listCommercialCreditCards(args: Record<string, unknown>): Promise<ToolResult> {
    return this.get('/commercial-credit-cards', args);
  }
}

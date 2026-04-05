/**
 * IBANAPI MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// No official IBANAPI MCP server was found on GitHub.
//
// Base URL: https://api.ibanapi.com/v1
// Auth: API key passed as query parameter `api_key` on every request
//   Obtain your API key from https://ibanapi.com
// Docs: https://ibanapi.com/iban-api
// Spec: https://api.apis.guru/v2/specs/ibanapi.com/1.0.0/openapi.json
// Rate limits: Determined by your plan. Free tier includes limited validations/month.
//   Remaining credits accessible via the /balance endpoint.
// Note: IBANAPI validates International Bank Account Numbers (IBANs), extracts bank
//   and branch details, and provides API usage quota tracking.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface IbanapiConfig {
  /** IBANAPI API key — obtain from https://ibanapi.com */
  apiKey: string;
  /** Optional base URL override (default: https://api.ibanapi.com/v1) */
  baseUrl?: string;
}

export class IbanapiMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: IbanapiConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = (config.baseUrl ?? 'https://api.ibanapi.com/v1').replace(/\/$/, '');
  }

  static catalog() {
    return {
      name: 'ibanapi',
      displayName: 'IBANAPI — IBAN Validation',
      version: '1.0.0',
      category: 'finance' as const,
      keywords: [
        'ibanapi', 'iban', 'validation', 'bank', 'finance', 'international',
        'account', 'banking', 'bic', 'swift', 'sepa', 'payment', 'wire-transfer',
        'account-number', 'bank-account', 'verify', 'country', 'currency',
        'financial', 'routing',
      ],
      toolNames: ['validate_iban', 'validate_iban_basic', 'get_account_balance'],
      description: 'Validate International Bank Account Numbers (IBANs), extract bank and branch details, BIC/SWIFT codes, and check API usage balance. Supports all SEPA and international IBAN formats.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'validate_iban',
        description: 'Validate an IBAN and return full details including bank name, branch, BIC/SWIFT code, account number, country, currency, and SEPA membership. Use for payment verification and financial compliance.',
        inputSchema: {
          type: 'object',
          properties: {
            iban: {
              type: 'string',
              description: 'The IBAN to validate (e.g. "GB29NWBK60161331926819"). Spaces are accepted and stripped by the API.',
            },
          },
          required: ['iban'],
        },
      },
      {
        name: 'validate_iban_basic',
        description: 'Perform a basic structural validation of an IBAN (format check, checksum, country code) without returning full bank details. Faster and uses fewer API credits than full validation.',
        inputSchema: {
          type: 'object',
          properties: {
            iban: {
              type: 'string',
              description: 'The IBAN to validate (e.g. "DE89370400440532013000"). Spaces are accepted.',
            },
          },
          required: ['iban'],
        },
      },
      {
        name: 'get_account_balance',
        description: 'Retrieve the current API account balance, remaining validation credits (bank_balance, basic_balance), and subscription expiry date for the configured IBANAPI key.',
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
        case 'validate_iban':       return this.validateIban(args);
        case 'validate_iban_basic': return this.validateIbanBasic(args);
        case 'get_account_balance': return this.getAccountBalance();
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

  // ── Helpers ────────────────────────────────────────────────────────────────

  private async doGet(path: string, params: Record<string, string> = {}): Promise<ToolResult> {
    const qs = new URLSearchParams({ api_key: this.apiKey, ...params });
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}?${qs.toString()}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return {
        content: [{ type: 'text', text: `IBANAPI error ${response.status}: ${errText}` }],
        isError: true,
      };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  // ── Tool Implementations ───────────────────────────────────────────────────

  private async validateIban(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.iban) {
      return { content: [{ type: 'text', text: 'iban is required' }], isError: true };
    }
    return this.doGet('/validate', { iban: args.iban as string });
  }

  private async validateIbanBasic(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.iban) {
      return { content: [{ type: 'text', text: 'iban is required' }], isError: true };
    }
    return this.doGet('/validate-basic', { iban: args.iban as string });
  }

  private async getAccountBalance(): Promise<ToolResult> {
    return this.doGet('/balance');
  }
}

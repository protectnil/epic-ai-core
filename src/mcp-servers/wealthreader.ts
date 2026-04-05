/**
 * Wealth Reader MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: No official Wealth Reader vendor MCP exists.
// Our adapter covers: 3 tools (list entities, fetch financial assets, list error codes).
//   Wealth Reader API provides PSD2-extended access to financial assets — investments,
//   credit cards, insurance, and loans — beyond standard open banking APIs.
// Recommendation: Use this adapter for wealth/financial asset aggregation beyond PSD2 scope.
//
// Base URL: https://api.wealthreader.com
// Auth: api_key passed in request body (POST /entities) or via separate credential setup
// Docs: https://docs-es.wealthreader.com/
// Rate limits: Consult Wealth Reader enterprise agreement.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface WealthReaderConfig {
  apiKey: string;
  /** Optional base URL override (default: https://api.wealthreader.com) */
  baseUrl?: string;
}

export class WealthReaderMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: WealthReaderConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? 'https://api.wealthreader.com';
  }

  static catalog() {
    return {
      name: 'wealthreader',
      displayName: 'Wealth Reader',
      version: '1.0.0',
      category: 'finance',
      keywords: [
        'wealthreader', 'wealth', 'finance', 'financial', 'assets', 'investments',
        'portfolio', 'funds', 'stocks', 'credit card', 'insurance', 'loans',
        'banking', 'psd2', 'open banking', 'balance', 'accounts',
      ],
      toolNames: [
        'list_entities', 'get_financial_assets', 'list_error_codes',
      ],
      description: 'Wealth Reader financial asset aggregation — retrieves investment portfolios, credit cards, insurance, and loans from any financial institution worldwide, extending PSD2 open banking APIs.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_entities',
        description: 'List all financial institutions (banks, brokers, insurers) supported by Wealth Reader — returns entity codes, names, and login form field requirements needed for get_financial_assets',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_financial_assets',
        description: 'Retrieve financial assets and portfolio details from a financial institution — returns investments (stocks/funds), credit cards, insurance, and loans with ownership and composition details. Supports 2-factor auth (OTP) and credential tokenization.',
        inputSchema: {
          type: 'object',
          properties: {
            code: {
              type: 'string',
              description: 'Entity/institution code (obtain via list_entities, e.g. "BBVA_ES")',
            },
            user: {
              type: 'string',
              description: 'Username/login for the financial institution. Mock users: MOCKDATA (success), MOCKOTP (triggers OTP), MOCKLOGINKO (login error)',
            },
            password: {
              type: 'string',
              description: 'Password for the financial institution login',
            },
            document_type: {
              type: 'string',
              description: 'Document type if required by the entity: NIF, Pasaporte, or "Tarjeta de residencia"',
              enum: ['NIF', 'Pasaporte', 'Tarjeta de residencia'],
            },
            second_password: {
              type: 'string',
              description: 'Second password if required by the entity',
            },
            token: {
              type: 'string',
              description: 'Tokenized credential value (use instead of user/password if credentials were previously tokenized with tokenize=true)',
            },
            tokenize: {
              type: 'boolean',
              description: 'If true, Wealth Reader will securely store the credentials and return a token for future use without re-entering credentials (default: false)',
            },
            SESSION: {
              type: 'string',
              description: 'Session value from a prior 2FA challenge response — required to complete a 2-factor authentication flow',
            },
            OTP: {
              type: 'string',
              description: 'One-time password sent by the institution — required when completing a 2FA flow where the challenge type is OTP',
            },
            contract_code: {
              type: 'string',
              description: 'Contract code for institutions where a user has multiple contracts — obtained from a prior call that returned available contracts',
            },
          },
          required: ['code'],
        },
      },
      {
        name: 'list_error_codes',
        description: 'List all Wealth Reader API error codes with descriptions — useful for interpreting errors from get_financial_assets and determining correct retry behavior',
        inputSchema: {
          type: 'object',
          properties: {
            lang: {
              type: 'string',
              description: 'Response language: es (Spanish, default) or en (English)',
              enum: ['es', 'en'],
            },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_entities':
          return this.listEntities();
        case 'get_financial_assets':
          return this.getFinancialAssets(args);
        case 'list_error_codes':
          return this.listErrorCodes(args);
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

  private async listEntities(): Promise<ToolResult> {
    const url = `${this.baseUrl}/entities`;
    const response = await this.fetchWithRetry(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Wealth Reader returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getFinancialAssets(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.code) {
      return { content: [{ type: 'text', text: 'code is required' }], isError: true };
    }
    const body = new URLSearchParams();
    body.set('api_key', this.apiKey);
    body.set('code', args.code as string);
    if (args.user) body.set('user', args.user as string);
    if (args.password) body.set('password', args.password as string);
    if (args.document_type) body.set('document_type', args.document_type as string);
    if (args.second_password) body.set('second_password', args.second_password as string);
    if (args.token) body.set('token', args.token as string);
    if (args.tokenize !== undefined) body.set('tokenize', String(args.tokenize));
    if (args.SESSION) body.set('SESSION', args.SESSION as string);
    if (args.OTP) body.set('OTP', args.OTP as string);
    if (args.contract_code) body.set('contract_code', args.contract_code as string);

    const url = `${this.baseUrl}/entities`;
    const response = await this.fetchWithRetry(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Wealth Reader returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listErrorCodes(args: Record<string, unknown>): Promise<ToolResult> {
    const lang = (args.lang as string) ?? 'es';
    const url = `${this.baseUrl}/error-codes?lang=${encodeURIComponent(lang)}`;
    const response = await this.fetchWithRetry(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Wealth Reader returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }
}

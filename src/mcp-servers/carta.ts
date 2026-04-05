/**
 * Carta MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28.
// No official Carta MCP server was found on GitHub or the Carta developer portal.
// Recommendation: use-rest-api — this adapter is the only available integration path.
//
// Base URL: https://api.carta.com (production) | https://mock-api.carta.com (sandbox)
// API version prefix: /v1alpha1/ — all Carta REST endpoints are under /v1alpha1/
// Auth: OAuth2 Authorization Code or Client Credentials. Bearer token in Authorization header.
//       Token endpoint: POST https://login.app.carta.com/o/access_token/
//       Authorize URL:  https://login.app.carta.com/o/authorize/
//       Access tokens expire after 3600s; refresh tokens expire after 14 days.
//       This adapter accepts a pre-obtained access token via config.
// Docs: https://docs.carta.com/api-platform/docs/introduction
//       https://docs.carta.com/api-platform/reference/issuers
// Rate limits: Not formally published. See https://docs.carta.com/api-platform/docs/rate-limits
// API suites: Issuer API (/v1alpha1/issuers/), Investor API (/v1alpha1/investors/),
//             Portfolio API (/v1alpha1/portfolios/), Launch API (/v1alpha1/launch/)
// AUDIT NOTE: Endpoints for list_transactions, get_transaction, list_fundraising_rounds,
//   get_fundraising_round, list_documents, list_holdings, get_holding, list_portfolio_companies
//   use inferred paths — not confirmed from published API reference. Marked UNVERIFIED.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface CartaConfig {
  accessToken: string;
  baseUrl?: string;
}

export class CartaMCPServer extends MCPAdapterBase {
  private readonly accessToken: string;
  private readonly baseUrl: string;

  constructor(config: CartaConfig) {
    super();
    this.accessToken = config.accessToken;
    this.baseUrl = config.baseUrl || 'https://api.carta.com';
  }

  get tools(): ToolDefinition[] {
    return [
      // Company / Issuer
      {
        name: 'get_company',
        description: 'Get profile and settings for a Carta company including name, EIN, and incorporation details',
        inputSchema: {
          type: 'object',
          properties: {
            company_id: { type: 'string', description: 'Carta company ID' },
          },
          required: ['company_id'],
        },
      },
      // Stakeholders
      {
        name: 'list_stakeholders',
        description: 'List all stakeholders on the cap table for a company with pagination',
        inputSchema: {
          type: 'object',
          properties: {
            company_id: { type: 'string', description: 'Carta company ID' },
            limit: { type: 'number', description: 'Maximum number of stakeholders to return' },
            offset: { type: 'number', description: 'Pagination offset' },
          },
          required: ['company_id'],
        },
      },
      {
        name: 'get_stakeholder',
        description: 'Retrieve full details for a single stakeholder by ID including contact info and holdings',
        inputSchema: {
          type: 'object',
          properties: {
            company_id: { type: 'string', description: 'Carta company ID' },
            stakeholder_id: { type: 'string', description: 'Carta stakeholder ID' },
          },
          required: ['company_id', 'stakeholder_id'],
        },
      },
      // Cap Table
      {
        name: 'get_cap_table',
        description: 'Retrieve the cap table summary for a company including share classes, ownership percentages, and fully diluted totals',
        inputSchema: {
          type: 'object',
          properties: {
            company_id: { type: 'string', description: 'Carta company ID' },
            as_of_date: { type: 'string', description: 'ISO 8601 date for a point-in-time cap table snapshot (e.g. 2026-01-01)' },
          },
          required: ['company_id'],
        },
      },
      // Securities
      {
        name: 'list_securities',
        description: 'List all securities issued by a company — stock options, RSUs, warrants, convertible notes, SAFEs, with optional type filter',
        inputSchema: {
          type: 'object',
          properties: {
            company_id: { type: 'string', description: 'Carta company ID' },
            security_type: { type: 'string', description: 'Filter by type: stock_option, rsu, warrant, convertible_note, safe, common_stock, preferred_stock' },
            stakeholder_id: { type: 'string', description: 'Filter securities by stakeholder ID' },
            limit: { type: 'number', description: 'Maximum number of securities to return' },
            offset: { type: 'number', description: 'Pagination offset' },
          },
          required: ['company_id'],
        },
      },
      {
        name: 'get_security',
        description: 'Get full details of a single security grant by its ID including grant date, quantity, and status',
        inputSchema: {
          type: 'object',
          properties: {
            company_id: { type: 'string', description: 'Carta company ID' },
            security_id: { type: 'string', description: 'Security (grant) ID' },
          },
          required: ['company_id', 'security_id'],
        },
      },
      // Vesting
      {
        name: 'list_vesting_schedules',
        description: 'List all vesting events for a specific security grant ordered by vest date',
        inputSchema: {
          type: 'object',
          properties: {
            company_id: { type: 'string', description: 'Carta company ID' },
            security_id: { type: 'string', description: 'Security (grant) ID to retrieve vesting events for' },
          },
          required: ['company_id', 'security_id'],
        },
      },
      // Equity Plans
      {
        name: 'list_equity_plans',
        description: 'List equity incentive plans (EIPs) for a company including authorized share pool sizes',
        inputSchema: {
          type: 'object',
          properties: {
            company_id: { type: 'string', description: 'Carta company ID' },
          },
          required: ['company_id'],
        },
      },
      {
        name: 'get_equity_plan',
        description: 'Get details of a specific equity incentive plan including shares authorized, issued, and available',
        inputSchema: {
          type: 'object',
          properties: {
            company_id: { type: 'string', description: 'Carta company ID' },
            plan_id: { type: 'string', description: 'Equity plan ID' },
          },
          required: ['company_id', 'plan_id'],
        },
      },
      // Share Classes
      {
        name: 'list_share_classes',
        description: 'List all share classes for a company including authorized shares, par value, and liquidation preferences',
        inputSchema: {
          type: 'object',
          properties: {
            company_id: { type: 'string', description: 'Carta company ID' },
          },
          required: ['company_id'],
        },
      },
      {
        name: 'get_share_class',
        description: 'Get details of a specific share class including voting rights, seniority, and authorized shares',
        inputSchema: {
          type: 'object',
          properties: {
            company_id: { type: 'string', description: 'Carta company ID' },
            share_class_id: { type: 'string', description: 'Share class ID' },
          },
          required: ['company_id', 'share_class_id'],
        },
      },
      // Transactions
      {
        name: 'list_transactions',
        description: 'List cap table transactions (issuances, transfers, cancellations, exercises, repurchases) with optional type filter',
        inputSchema: {
          type: 'object',
          properties: {
            company_id: { type: 'string', description: 'Carta company ID' },
            transaction_type: { type: 'string', description: 'Filter by type: issuance, transfer, cancellation, exercise, repurchase, conversion' },
            stakeholder_id: { type: 'string', description: 'Filter by stakeholder ID' },
            start_date: { type: 'string', description: 'ISO 8601 start date for transaction date filter' },
            end_date: { type: 'string', description: 'ISO 8601 end date for transaction date filter' },
            limit: { type: 'number', description: 'Maximum number of transactions to return' },
            offset: { type: 'number', description: 'Pagination offset' },
          },
          required: ['company_id'],
        },
      },
      {
        name: 'get_transaction',
        description: 'Get details of a specific cap table transaction by its ID',
        inputSchema: {
          type: 'object',
          properties: {
            company_id: { type: 'string', description: 'Carta company ID' },
            transaction_id: { type: 'string', description: 'Transaction ID' },
          },
          required: ['company_id', 'transaction_id'],
        },
      },
      // Fundraising Rounds
      {
        name: 'list_fundraising_rounds',
        description: 'List all fundraising rounds for a company including pre-money valuation and total raised',
        inputSchema: {
          type: 'object',
          properties: {
            company_id: { type: 'string', description: 'Carta company ID' },
            limit: { type: 'number', description: 'Maximum number of rounds to return' },
            offset: { type: 'number', description: 'Pagination offset' },
          },
          required: ['company_id'],
        },
      },
      {
        name: 'get_fundraising_round',
        description: 'Get details of a specific fundraising round including investors, amounts, and closing dates',
        inputSchema: {
          type: 'object',
          properties: {
            company_id: { type: 'string', description: 'Carta company ID' },
            round_id: { type: 'string', description: 'Fundraising round ID' },
          },
          required: ['company_id', 'round_id'],
        },
      },
      // 409A Valuations
      {
        name: 'list_valuations',
        description: 'List 409A valuations for a company ordered by effective date',
        inputSchema: {
          type: 'object',
          properties: {
            company_id: { type: 'string', description: 'Carta company ID' },
          },
          required: ['company_id'],
        },
      },
      // Investor / Fund (Investor API)
      {
        name: 'list_holdings',
        description: 'List portfolio holdings for an investor fund across all Carta-managed investments with current values',
        inputSchema: {
          type: 'object',
          properties: {
            fund_id: { type: 'string', description: 'Fund or portfolio entity ID for the investor' },
            limit: { type: 'number', description: 'Maximum number of holdings to return' },
            offset: { type: 'number', description: 'Pagination offset' },
          },
          required: ['fund_id'],
        },
      },
      {
        name: 'get_holding',
        description: 'Get details of a single fund holding including security type, cost basis, and current position',
        inputSchema: {
          type: 'object',
          properties: {
            fund_id: { type: 'string', description: 'Fund entity ID' },
            holding_id: { type: 'string', description: 'Holding ID' },
          },
          required: ['fund_id', 'holding_id'],
        },
      },
      {
        name: 'list_portfolio_companies',
        description: 'List all portfolio companies in which a fund has active holdings on Carta',
        inputSchema: {
          type: 'object',
          properties: {
            fund_id: { type: 'string', description: 'Fund entity ID' },
            limit: { type: 'number', description: 'Maximum number of companies to return' },
            offset: { type: 'number', description: 'Pagination offset' },
          },
          required: ['fund_id'],
        },
      },
      // Documents
      {
        name: 'list_documents',
        description: 'List documents (grant letters, board consents, side letters) associated with a company',
        inputSchema: {
          type: 'object',
          properties: {
            company_id: { type: 'string', description: 'Carta company ID' },
            document_type: { type: 'string', description: 'Filter by document type: grant_notice, board_consent, option_agreement, side_letter' },
            limit: { type: 'number', description: 'Maximum number of documents to return' },
            offset: { type: 'number', description: 'Pagination offset' },
          },
          required: ['company_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'get_company': return this.getCompany(args);
        case 'list_stakeholders': return this.listStakeholders(args);
        case 'get_stakeholder': return this.getStakeholder(args);
        case 'get_cap_table': return this.getCapTable(args);
        case 'list_securities': return this.listSecurities(args);
        case 'get_security': return this.getSecurity(args);
        case 'list_vesting_schedules': return this.listVestingSchedules(args);
        case 'list_equity_plans': return this.listEquityPlans(args);
        case 'get_equity_plan': return this.getEquityPlan(args);
        case 'list_share_classes': return this.listShareClasses(args);
        case 'get_share_class': return this.getShareClass(args);
        case 'list_transactions': return this.listTransactions(args);
        case 'get_transaction': return this.getTransaction(args);
        case 'list_fundraising_rounds': return this.listFundraisingRounds(args);
        case 'get_fundraising_round': return this.getFundraisingRound(args);
        case 'list_valuations': return this.listValuations(args);
        case 'list_holdings': return this.listHoldings(args);
        case 'get_holding': return this.getHolding(args);
        case 'list_portfolio_companies': return this.listPortfolioCompanies(args);
        case 'list_documents': return this.listDocuments(args);
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

  private headers(): Record<string, string> {
    return { Authorization: `Bearer ${this.accessToken}`, 'Content-Type': 'application/json', Accept: 'application/json' };
  }

  private async get(path: string, params?: URLSearchParams): Promise<ToolResult> {
    const qs = params?.toString();
    const url = `${this.baseUrl}${path}${qs ? `?${qs}` : ''}`;
    const response = await this.fetchWithRetry(url, { method: 'GET', headers: this.headers() });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Carta returned non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private buildParams(args: Record<string, unknown>, fields: string[]): URLSearchParams {
    const params = new URLSearchParams();
    for (const field of fields) {
      if (args[field] !== undefined) params.set(field, String(args[field]));
    }
    return params;
  }

  private async getCompany(args: Record<string, unknown>): Promise<ToolResult> {
    // Carta Issuer API: GET /v1alpha1/issuers/{issuerId}
    return this.get(`/v1alpha1/issuers/${encodeURIComponent(args.company_id as string)}`);
  }

  private async listStakeholders(args: Record<string, unknown>): Promise<ToolResult> {
    // Carta Issuer API: GET /v1alpha1/issuers/{issuerId}/stakeholders
    return this.get(
      `/v1alpha1/issuers/${encodeURIComponent(args.company_id as string)}/stakeholders`,
      this.buildParams(args, ['limit', 'offset']),
    );
  }

  private async getStakeholder(args: Record<string, unknown>): Promise<ToolResult> {
    // Carta Issuer API: GET /v1alpha1/issuers/{issuerId}/stakeholders/{stakeholderId}
    return this.get(`/v1alpha1/issuers/${encodeURIComponent(args.company_id as string)}/stakeholders/${encodeURIComponent(args.stakeholder_id as string)}`);
  }

  private async getCapTable(args: Record<string, unknown>): Promise<ToolResult> {
    // Carta Issuer API: GET /v1alpha1/issuers/{issuerId}/capitalizationTable
    const params = new URLSearchParams();
    if (args.as_of_date) params.set('as_of_date', args.as_of_date as string);
    return this.get(`/v1alpha1/issuers/${encodeURIComponent(args.company_id as string)}/capitalizationTable`, params);
  }

  private async listSecurities(args: Record<string, unknown>): Promise<ToolResult> {
    // Carta Issuer API: securities are split by type (optionGrants, restrictedStockUnits, etc.)
    // This tool routes by security_type or defaults to optionGrants (most common)
    const params = this.buildParams(args, ['limit', 'offset']);
    if (args.stakeholder_id) params.set('stakeholderId', args.stakeholder_id as string);
    const secType = (args.security_type as string) ?? '';
    let path: string;
    if (secType === 'rsu' || secType === 'restricted_stock_unit') {
      path = `/v1alpha1/issuers/${encodeURIComponent(args.company_id as string)}/restrictedStockUnits`;
    } else if (secType === 'rsa' || secType === 'restricted_stock_award') {
      path = `/v1alpha1/issuers/${encodeURIComponent(args.company_id as string)}/restrictedStockAwards`;
    } else if (secType === 'warrant') {
      path = `/v1alpha1/issuers/${encodeURIComponent(args.company_id as string)}/warrants`;
    } else if (secType === 'convertible_note') {
      path = `/v1alpha1/issuers/${encodeURIComponent(args.company_id as string)}/convertibleNotes`;
    } else {
      // default: option grants
      path = `/v1alpha1/issuers/${encodeURIComponent(args.company_id as string)}/optionGrants`;
    }
    return this.get(path, params);
  }

  private async getSecurity(args: Record<string, unknown>): Promise<ToolResult> {
    // Carta Issuer API: GET /v1alpha1/issuers/{issuerId}/optionGrants/{id}
    // Defaults to optionGrant; security_type routing could be added if needed
    return this.get(`/v1alpha1/issuers/${encodeURIComponent(args.company_id as string)}/optionGrants/${encodeURIComponent(args.security_id as string)}`);
  }

  private async listVestingSchedules(args: Record<string, unknown>): Promise<ToolResult> {
    // Carta Issuer API: GET /v1alpha1/issuers/{issuerId}/optionGrants/{id}/vestingSchedule
    return this.get(`/v1alpha1/issuers/${encodeURIComponent(args.company_id as string)}/optionGrants/${encodeURIComponent(args.security_id as string)}/vestingSchedule`);
  }

  private async listEquityPlans(args: Record<string, unknown>): Promise<ToolResult> {
    // Carta Issuer API: equity plans are part of issuer securities templates (scope: read_issuer_securitiestemplates)
    // Path inferred as /v1alpha1/issuers/{issuerId}/equityIncentivePlans — UNVERIFIED exact path
    return this.get(`/v1alpha1/issuers/${encodeURIComponent(args.company_id as string)}/equityIncentivePlans`);
  }

  private async getEquityPlan(args: Record<string, unknown>): Promise<ToolResult> {
    // Path inferred — UNVERIFIED exact path
    return this.get(`/v1alpha1/issuers/${encodeURIComponent(args.company_id as string)}/equityIncentivePlans/${encodeURIComponent(args.plan_id as string)}`);
  }

  private async listShareClasses(args: Record<string, unknown>): Promise<ToolResult> {
    // Carta Issuer API: GET /v1alpha1/issuers/{issuerId}/shareClasses (confirmed via scope read_issuer_shareclasses)
    return this.get(`/v1alpha1/issuers/${encodeURIComponent(args.company_id as string)}/shareClasses`);
  }

  private async getShareClass(args: Record<string, unknown>): Promise<ToolResult> {
    // Carta Issuer API: GET /v1alpha1/issuers/{issuerId}/shareClasses/{shareClassId}
    return this.get(`/v1alpha1/issuers/${encodeURIComponent(args.company_id as string)}/shareClasses/${encodeURIComponent(args.share_class_id as string)}`);
  }

  private async listTransactions(args: Record<string, unknown>): Promise<ToolResult> {
    // UNVERIFIED: Carta API reference does not show a generic /transactions endpoint.
    // Transactions are reflected in individual security endpoints. Path is inferred.
    const params = this.buildParams(args, ['limit', 'offset']);
    if (args.transaction_type) params.set('transactionType', args.transaction_type as string);
    if (args.stakeholder_id) params.set('stakeholderId', args.stakeholder_id as string);
    if (args.start_date) params.set('startDate', args.start_date as string);
    if (args.end_date) params.set('endDate', args.end_date as string);
    return this.get(`/v1alpha1/issuers/${encodeURIComponent(args.company_id as string)}/transactions`, params);
  }

  private async getTransaction(args: Record<string, unknown>): Promise<ToolResult> {
    // UNVERIFIED: path inferred
    return this.get(`/v1alpha1/issuers/${encodeURIComponent(args.company_id as string)}/transactions/${encodeURIComponent(args.transaction_id as string)}`);
  }

  private async listFundraisingRounds(args: Record<string, unknown>): Promise<ToolResult> {
    // UNVERIFIED: fundraising rounds are visible in Carta UI but exact API path not confirmed.
    // Path inferred from Carta cap table structure.
    return this.get(
      `/v1alpha1/issuers/${encodeURIComponent(args.company_id as string)}/fundraisingRounds`,
      this.buildParams(args, ['limit', 'offset']),
    );
  }

  private async getFundraisingRound(args: Record<string, unknown>): Promise<ToolResult> {
    // UNVERIFIED: path inferred
    return this.get(`/v1alpha1/issuers/${encodeURIComponent(args.company_id as string)}/fundraisingRounds/${encodeURIComponent(args.round_id as string)}`);
  }

  private async listValuations(args: Record<string, unknown>): Promise<ToolResult> {
    // Carta Issuer API: GET /v1alpha1/issuers/{issuerId}/valuations (confirmed via scope read_issuer_valuations)
    return this.get(`/v1alpha1/issuers/${encodeURIComponent(args.company_id as string)}/valuations`);
  }

  private async listHoldings(args: Record<string, unknown>): Promise<ToolResult> {
    // Carta Investor API: holdings are accessed via /v1alpha1/investors/firms/{firmId}/funds/{fundId}/investments
    // Exact holdings path not confirmed — using inferred path. UNVERIFIED.
    return this.get(
      `/v1alpha1/investors/funds/${encodeURIComponent(args.fund_id as string)}/holdings`,
      this.buildParams(args, ['limit', 'offset']),
    );
  }

  private async getHolding(args: Record<string, unknown>): Promise<ToolResult> {
    // UNVERIFIED: path inferred from Investor API structure
    return this.get(`/v1alpha1/investors/funds/${encodeURIComponent(args.fund_id as string)}/holdings/${encodeURIComponent(args.holding_id as string)}`);
  }

  private async listPortfolioCompanies(args: Record<string, unknown>): Promise<ToolResult> {
    // Carta Investor API: List Investments confirmed at /v1alpha1/investors/firms/{firmId}/funds/{fundId}/investments
    // fund_id used directly — UNVERIFIED exact path without firmId
    return this.get(
      `/v1alpha1/investors/funds/${encodeURIComponent(args.fund_id as string)}/investments`,
      this.buildParams(args, ['limit', 'offset']),
    );
  }

  private async listDocuments(args: Record<string, unknown>): Promise<ToolResult> {
    // UNVERIFIED: Carta API does not show a generic /documents endpoint in the published reference.
    // Path inferred from issuer structure.
    const params = this.buildParams(args, ['limit', 'offset']);
    if (args.document_type) params.set('documentType', args.document_type as string);
    return this.get(`/v1alpha1/issuers/${encodeURIComponent(args.company_id as string)}/documents`, params);
  }

  static catalog() {
    return {
      name: 'carta',
      displayName: 'Carta',
      version: '1.0.0',
      category: 'finance' as const,
      keywords: ['carta', 'cap table', 'equity', 'stock option', 'rsu', 'warrant', 'safe', 'convertible note', 'vesting', 'stakeholder', 'share class', '409a', 'fundraising', 'portfolio', 'startup finance'],
      toolNames: ['get_company', 'list_stakeholders', 'get_stakeholder', 'get_cap_table', 'list_securities', 'get_security', 'list_vesting_schedules', 'list_equity_plans', 'get_equity_plan', 'list_share_classes', 'get_share_class', 'list_transactions', 'get_transaction', 'list_fundraising_rounds', 'get_fundraising_round', 'list_valuations', 'list_holdings', 'get_holding', 'list_portfolio_companies', 'list_documents'],
      description: 'Carta equity management: cap tables, securities, vesting, stakeholders, share classes, fundraising rounds, 409A valuations, and investor fund holdings.',
      author: 'protectnil' as const,
    };
  }
}

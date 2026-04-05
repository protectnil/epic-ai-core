/**
 * Codat Assess MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03.
//
// Base URL: https://api.codat.io
// Auth: HTTP Basic — "Basic " + base64(apiKey)
//   Codat docs: the API key is base64-encoded and used as the Basic auth credential.
// Docs: https://docs.codat.io/assess-api
// Rate limits: Not publicly documented; Codat enforces per-client limits server-side.
// OpenAPI spec: https://api.apis.guru/v2/specs/codat.io/assess/1.0/openapi.json

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface CodatAssessConfig {
  /** Codat API key — will be base64-encoded into the Authorization header */
  apiKey: string;
  baseUrl?: string;
}

export class CodatAssessMCPServer extends MCPAdapterBase {
  private readonly authHeader: string;
  private readonly baseUrl: string;

  constructor(config: CodatAssessConfig) {
    super();
    this.authHeader = 'Basic ' + Buffer.from(config.apiKey).toString('base64');
    this.baseUrl = config.baseUrl || 'https://api.codat.io';
  }

  static catalog() {
    return {
      name: 'codat-assess',
      displayName: 'Codat Assess',
      version: '1.0.0',
      category: 'finance' as const,
      keywords: [
        'codat', 'assess', 'financial reports', 'balance sheet', 'profit and loss',
        'cash flow', 'accounting metrics', 'commerce metrics', 'data integrity',
        'enhanced financials', 'subscriptions', 'mrr', 'lending', 'underwriting',
      ],
      toolNames: [
        'get_enhanced_balance_sheet_accounts',
        'get_enhanced_cash_flow_transactions',
        'get_enhanced_invoices_report',
        'get_enhanced_profit_and_loss_accounts',
        'list_available_account_categories',
        'get_data_integrity_details',
        'get_data_integrity_status',
        'get_data_integrity_summaries',
        'get_excel_report_status',
        'generate_excel_report',
        'get_excel_report_download',
        'download_excel_report',
        'get_accounting_marketing_metrics',
        'list_accounts_categories',
        'update_accounts_categories',
        'get_account_category',
        'update_account_category',
        'get_commerce_customer_retention_metrics',
        'get_commerce_lifetime_value_metrics',
        'get_commerce_orders_metrics',
        'get_commerce_refunds_metrics',
        'get_commerce_revenue_metrics',
        'get_enhanced_balance_sheet',
        'get_enhanced_profit_and_loss',
        'get_enhanced_financial_metrics',
        'get_recurring_revenue_metrics',
        'request_recurring_revenue_metrics',
      ],
      description:
        'Access Codat Assess: enhanced financial reports, data integrity checks, account categorization, commerce and accounting metrics, Excel report generation, and subscription MRR analytics.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      // ── Enhanced Reports (company-level) ──────────────────────────────────
      {
        name: 'get_enhanced_balance_sheet_accounts',
        description:
          'Retrieve enhanced balance sheet accounts for a company for a specific report date and period count',
        inputSchema: {
          type: 'object',
          properties: {
            companyId: {
              type: 'string',
              description: 'Unique identifier for the Codat company',
            },
            reportDate: {
              type: 'string',
              description: 'Report date in YYYY-MM-DD format (report created up to this date)',
            },
            numberOfPeriods: {
              type: 'integer',
              description: 'Number of periods to return in the report',
            },
          },
          required: ['companyId', 'reportDate', 'numberOfPeriods'],
        },
      },
      {
        name: 'get_enhanced_cash_flow_transactions',
        description:
          'Get enhanced cash flow transactions report for a company with pagination support',
        inputSchema: {
          type: 'object',
          properties: {
            companyId: {
              type: 'string',
              description: 'Unique identifier for the Codat company',
            },
            page: {
              type: 'integer',
              description: 'Page number for pagination (required, starts at 1)',
            },
            pageSize: {
              type: 'integer',
              description: 'Number of records per page',
            },
            query: {
              type: 'string',
              description: 'Codat query string to filter results',
            },
          },
          required: ['companyId', 'page'],
        },
      },
      {
        name: 'get_enhanced_invoices_report',
        description:
          'Get enhanced invoices report for a company, enriched with additional data points',
        inputSchema: {
          type: 'object',
          properties: {
            companyId: {
              type: 'string',
              description: 'Unique identifier for the Codat company',
            },
            page: {
              type: 'integer',
              description: 'Page number for pagination (required, starts at 1)',
            },
            pageSize: {
              type: 'integer',
              description: 'Number of records per page',
            },
            query: {
              type: 'string',
              description: 'Codat query string to filter results',
            },
          },
          required: ['companyId', 'page'],
        },
      },
      {
        name: 'get_enhanced_profit_and_loss_accounts',
        description:
          'Retrieve enhanced profit and loss accounts for a company for a specific report date',
        inputSchema: {
          type: 'object',
          properties: {
            companyId: {
              type: 'string',
              description: 'Unique identifier for the Codat company',
            },
            reportDate: {
              type: 'string',
              description: 'Report date in YYYY-MM-DD format (report created up to this date)',
            },
            numberOfPeriods: {
              type: 'integer',
              description: 'Number of periods to return in the report',
            },
          },
          required: ['companyId', 'reportDate', 'numberOfPeriods'],
        },
      },
      // ── Account Categories (global) ───────────────────────────────────────
      {
        name: 'list_available_account_categories',
        description:
          'List all available account categories that Codat Assess can assign to accounts',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      // ── Data Integrity ────────────────────────────────────────────────────
      {
        name: 'get_data_integrity_details',
        description:
          'List detailed data integrity records for a specific data type within a company',
        inputSchema: {
          type: 'object',
          properties: {
            companyId: {
              type: 'string',
              description: 'Unique identifier for the Codat company',
            },
            dataType: {
              type: 'string',
              description: 'Codat data type key (e.g. banking-transactions, accountTransactions)',
            },
            page: {
              type: 'integer',
              description: 'Page number for pagination (required, starts at 1)',
            },
            pageSize: {
              type: 'integer',
              description: 'Number of records per page',
            },
            query: {
              type: 'string',
              description: 'Codat query string to filter results',
            },
            orderBy: {
              type: 'string',
              description: 'Field to order results by',
            },
          },
          required: ['companyId', 'dataType', 'page'],
        },
      },
      {
        name: 'get_data_integrity_status',
        description:
          'Get overall data integrity status for a specific data type within a company',
        inputSchema: {
          type: 'object',
          properties: {
            companyId: {
              type: 'string',
              description: 'Unique identifier for the Codat company',
            },
            dataType: {
              type: 'string',
              description: 'Codat data type key (e.g. banking-transactions, accountTransactions)',
            },
          },
          required: ['companyId', 'dataType'],
        },
      },
      {
        name: 'get_data_integrity_summaries',
        description:
          'Get data integrity summary statistics for a specific data type within a company',
        inputSchema: {
          type: 'object',
          properties: {
            companyId: {
              type: 'string',
              description: 'Unique identifier for the Codat company',
            },
            dataType: {
              type: 'string',
              description: 'Codat data type key (e.g. banking-transactions, accountTransactions)',
            },
            query: {
              type: 'string',
              description: 'Codat query string to filter results',
            },
          },
          required: ['companyId', 'dataType'],
        },
      },
      // ── Excel Reports ─────────────────────────────────────────────────────
      {
        name: 'get_excel_report_status',
        description:
          'Get the generation status of an Excel assess report for a company',
        inputSchema: {
          type: 'object',
          properties: {
            companyId: {
              type: 'string',
              description: 'Unique identifier for the Codat company',
            },
            reportType: {
              type: 'string',
              description: 'Type of report to check status for (e.g. assess, audit)',
            },
          },
          required: ['companyId', 'reportType'],
        },
      },
      {
        name: 'generate_excel_report',
        description:
          'Trigger generation of an Excel assess report for a company by report type',
        inputSchema: {
          type: 'object',
          properties: {
            companyId: {
              type: 'string',
              description: 'Unique identifier for the Codat company',
            },
            reportType: {
              type: 'string',
              description: 'Type of report to generate (e.g. assess, audit)',
            },
          },
          required: ['companyId', 'reportType'],
        },
      },
      {
        name: 'get_excel_report_download',
        description:
          'Get the download URL or content for a previously generated Excel assess report',
        inputSchema: {
          type: 'object',
          properties: {
            companyId: {
              type: 'string',
              description: 'Unique identifier for the Codat company',
            },
            reportType: {
              type: 'string',
              description: 'Type of report to download (e.g. assess, audit)',
            },
          },
          required: ['companyId', 'reportType'],
        },
      },
      {
        name: 'download_excel_report',
        description:
          'Download a generated Excel assess report for a company (POST variant)',
        inputSchema: {
          type: 'object',
          properties: {
            companyId: {
              type: 'string',
              description: 'Unique identifier for the Codat company',
            },
            reportType: {
              type: 'string',
              description: 'Type of report to download (e.g. assess, audit)',
            },
          },
          required: ['companyId', 'reportType'],
        },
      },
      // ── Accounting Metrics ────────────────────────────────────────────────
      {
        name: 'get_accounting_marketing_metrics',
        description:
          'Get marketing metrics from an accounting source for a given company and connection',
        inputSchema: {
          type: 'object',
          properties: {
            companyId: {
              type: 'string',
              description: 'Unique identifier for the Codat company',
            },
            connectionId: {
              type: 'string',
              description: 'Unique identifier for the data connection',
            },
            reportDate: {
              type: 'string',
              description: 'Report date in YYYY-MM-DD format',
            },
            periodLength: {
              type: 'integer',
              description: 'Number of months per period (e.g. 2 = 2 months per period)',
            },
            numberOfPeriods: {
              type: 'integer',
              description: 'Number of periods to return',
            },
            periodUnit: {
              type: 'string',
              description: 'Period unit of time returned (e.g. month, week, day, year)',
            },
            includeDisplayNames: {
              type: 'boolean',
              description: 'Include dimension and item display names in measures',
            },
            showInputValues: {
              type: 'boolean',
              description: 'Include input values within the response',
            },
          },
          required: ['companyId', 'connectionId', 'reportDate', 'periodLength', 'numberOfPeriods', 'periodUnit'],
        },
      },
      // ── Account Categories (connection-level) ─────────────────────────────
      {
        name: 'list_accounts_categories',
        description:
          'List suggested and confirmed account categories for all accounts in a connection',
        inputSchema: {
          type: 'object',
          properties: {
            companyId: {
              type: 'string',
              description: 'Unique identifier for the Codat company',
            },
            connectionId: {
              type: 'string',
              description: 'Unique identifier for the data connection',
            },
            page: {
              type: 'integer',
              description: 'Page number for pagination (required, starts at 1)',
            },
            pageSize: {
              type: 'integer',
              description: 'Number of records per page',
            },
            query: {
              type: 'string',
              description: 'Codat query string to filter results',
            },
            orderBy: {
              type: 'string',
              description: 'Field to order results by',
            },
          },
          required: ['companyId', 'connectionId', 'page'],
        },
      },
      {
        name: 'update_accounts_categories',
        description:
          'Confirm or update categories for multiple accounts in bulk for a connection',
        inputSchema: {
          type: 'object',
          properties: {
            companyId: {
              type: 'string',
              description: 'Unique identifier for the Codat company',
            },
            connectionId: {
              type: 'string',
              description: 'Unique identifier for the data connection',
            },
            categories: {
              type: 'array',
              description: 'Array of account category objects to confirm or update',
            },
          },
          required: ['companyId', 'connectionId', 'categories'],
        },
      },
      {
        name: 'get_account_category',
        description:
          'Get the suggested and confirmed category for a specific account in a connection',
        inputSchema: {
          type: 'object',
          properties: {
            companyId: {
              type: 'string',
              description: 'Unique identifier for the Codat company',
            },
            connectionId: {
              type: 'string',
              description: 'Unique identifier for the data connection',
            },
            accountId: {
              type: 'string',
              description: 'Nominal account ID',
            },
          },
          required: ['companyId', 'connectionId', 'accountId'],
        },
      },
      {
        name: 'update_account_category',
        description:
          'Update or confirm the category for a specific account in a connection',
        inputSchema: {
          type: 'object',
          properties: {
            companyId: {
              type: 'string',
              description: 'Unique identifier for the Codat company',
            },
            connectionId: {
              type: 'string',
              description: 'Unique identifier for the data connection',
            },
            accountId: {
              type: 'string',
              description: 'Nominal account ID',
            },
            confirmed: {
              type: 'object',
              description: 'Confirmed category object with type, subtype, and detailType fields',
            },
          },
          required: ['companyId', 'connectionId', 'accountId'],
        },
      },
      // ── Commerce Metrics ──────────────────────────────────────────────────
      {
        name: 'get_commerce_customer_retention_metrics',
        description:
          'Get customer retention metrics for a company from its commerce data connection',
        inputSchema: {
          type: 'object',
          properties: {
            companyId: {
              type: 'string',
              description: 'Unique identifier for the Codat company',
            },
            connectionId: {
              type: 'string',
              description: 'Unique identifier for the data connection',
            },
            reportDate: {
              type: 'string',
              description: 'Report date in YYYY-MM-DD format',
            },
            periodLength: {
              type: 'integer',
              description: 'Number of months per period',
            },
            numberOfPeriods: {
              type: 'integer',
              description: 'Number of periods to return',
            },
            periodUnit: {
              type: 'string',
              description: 'Period unit of time returned (e.g. month, week, day, year)',
            },
            includeDisplayNames: {
              type: 'boolean',
              description: 'Include dimension and item display names in measures',
            },
          },
          required: ['companyId', 'connectionId', 'reportDate', 'periodLength', 'numberOfPeriods', 'periodUnit'],
        },
      },
      {
        name: 'get_commerce_lifetime_value_metrics',
        description:
          'Get customer lifetime value metrics for a company from its commerce data connection',
        inputSchema: {
          type: 'object',
          properties: {
            companyId: {
              type: 'string',
              description: 'Unique identifier for the Codat company',
            },
            connectionId: {
              type: 'string',
              description: 'Unique identifier for the data connection',
            },
            reportDate: {
              type: 'string',
              description: 'Report date in YYYY-MM-DD format',
            },
            periodLength: {
              type: 'integer',
              description: 'Number of months per period',
            },
            numberOfPeriods: {
              type: 'integer',
              description: 'Number of periods to return',
            },
            periodUnit: {
              type: 'string',
              description: 'Period unit of time returned (e.g. month, week, day, year)',
            },
            includeDisplayNames: {
              type: 'boolean',
              description: 'Include dimension and item display names in measures',
            },
          },
          required: ['companyId', 'connectionId', 'reportDate', 'periodLength', 'numberOfPeriods', 'periodUnit'],
        },
      },
      {
        name: 'get_commerce_orders_metrics',
        description:
          'Get order metrics for a company from its commerce data connection',
        inputSchema: {
          type: 'object',
          properties: {
            companyId: {
              type: 'string',
              description: 'Unique identifier for the Codat company',
            },
            connectionId: {
              type: 'string',
              description: 'Unique identifier for the data connection',
            },
            reportDate: {
              type: 'string',
              description: 'Report date in YYYY-MM-DD format',
            },
            periodLength: {
              type: 'integer',
              description: 'Number of months per period',
            },
            numberOfPeriods: {
              type: 'integer',
              description: 'Number of periods to return',
            },
            periodUnit: {
              type: 'string',
              description: 'Period unit of time returned (e.g. month, week, day, year)',
            },
            includeDisplayNames: {
              type: 'boolean',
              description: 'Include dimension and item display names in measures',
            },
          },
          required: ['companyId', 'connectionId', 'reportDate', 'periodLength', 'numberOfPeriods', 'periodUnit'],
        },
      },
      {
        name: 'get_commerce_refunds_metrics',
        description:
          'Get refund metrics for a company from its commerce data connection',
        inputSchema: {
          type: 'object',
          properties: {
            companyId: {
              type: 'string',
              description: 'Unique identifier for the Codat company',
            },
            connectionId: {
              type: 'string',
              description: 'Unique identifier for the data connection',
            },
            reportDate: {
              type: 'string',
              description: 'Report date in YYYY-MM-DD format',
            },
            periodLength: {
              type: 'integer',
              description: 'Number of months per period',
            },
            numberOfPeriods: {
              type: 'integer',
              description: 'Number of periods to return',
            },
            periodUnit: {
              type: 'string',
              description: 'Period unit of time returned (e.g. month, week, day, year)',
            },
            includeDisplayNames: {
              type: 'boolean',
              description: 'Include dimension and item display names in measures',
            },
          },
          required: ['companyId', 'connectionId', 'reportDate', 'periodLength', 'numberOfPeriods', 'periodUnit'],
        },
      },
      {
        name: 'get_commerce_revenue_metrics',
        description:
          'Get revenue metrics for a company from its commerce data connection',
        inputSchema: {
          type: 'object',
          properties: {
            companyId: {
              type: 'string',
              description: 'Unique identifier for the Codat company',
            },
            connectionId: {
              type: 'string',
              description: 'Unique identifier for the data connection',
            },
            reportDate: {
              type: 'string',
              description: 'Report date in YYYY-MM-DD format',
            },
            periodLength: {
              type: 'integer',
              description: 'Number of months per period',
            },
            numberOfPeriods: {
              type: 'integer',
              description: 'Number of periods to return',
            },
            periodUnit: {
              type: 'string',
              description: 'Period unit of time returned (e.g. month, week, day, year)',
            },
            includeDisplayNames: {
              type: 'boolean',
              description: 'Include dimension and item display names in measures',
            },
          },
          required: ['companyId', 'connectionId', 'reportDate', 'periodLength', 'numberOfPeriods', 'periodUnit'],
        },
      },
      // ── Enhanced Balance Sheet / P&L (connection-level) ───────────────────
      {
        name: 'get_enhanced_balance_sheet',
        description:
          'Get an enhanced balance sheet report for a company connection with categorized accounts',
        inputSchema: {
          type: 'object',
          properties: {
            companyId: {
              type: 'string',
              description: 'Unique identifier for the Codat company',
            },
            connectionId: {
              type: 'string',
              description: 'Unique identifier for the data connection',
            },
            reportDate: {
              type: 'string',
              description: 'Report date in YYYY-MM-DD format',
            },
            periodLength: {
              type: 'integer',
              description: 'Number of months per period',
            },
            numberOfPeriods: {
              type: 'integer',
              description: 'Number of periods to return',
            },
            includeDisplayNames: {
              type: 'boolean',
              description: 'Include dimension and item display names in measures',
            },
          },
          required: ['companyId', 'connectionId', 'reportDate', 'periodLength', 'numberOfPeriods'],
        },
      },
      {
        name: 'get_enhanced_profit_and_loss',
        description:
          'Get an enhanced profit and loss report for a company connection with categorized accounts',
        inputSchema: {
          type: 'object',
          properties: {
            companyId: {
              type: 'string',
              description: 'Unique identifier for the Codat company',
            },
            connectionId: {
              type: 'string',
              description: 'Unique identifier for the data connection',
            },
            reportDate: {
              type: 'string',
              description: 'Report date in YYYY-MM-DD format',
            },
            periodLength: {
              type: 'integer',
              description: 'Number of months per period',
            },
            numberOfPeriods: {
              type: 'integer',
              description: 'Number of periods to return',
            },
            includeDisplayNames: {
              type: 'boolean',
              description: 'Include dimension and item display names in measures',
            },
          },
          required: ['companyId', 'connectionId', 'reportDate', 'periodLength', 'numberOfPeriods'],
        },
      },
      // ── Financial Metrics ─────────────────────────────────────────────────
      {
        name: 'get_enhanced_financial_metrics',
        description:
          'List key financial metrics for a company connection over specified periods',
        inputSchema: {
          type: 'object',
          properties: {
            companyId: {
              type: 'string',
              description: 'Unique identifier for the Codat company',
            },
            connectionId: {
              type: 'string',
              description: 'Unique identifier for the data connection',
            },
            reportDate: {
              type: 'string',
              description: 'Report date in YYYY-MM-DD format',
            },
            periodLength: {
              type: 'integer',
              description: 'Number of months per period',
            },
            numberOfPeriods: {
              type: 'integer',
              description: 'Number of periods to return',
            },
            showMetricInputs: {
              type: 'boolean',
              description: 'Include the input values used to calculate each metric',
            },
          },
          required: ['companyId', 'connectionId', 'reportDate', 'periodLength', 'numberOfPeriods'],
        },
      },
      // ── Subscription / MRR ────────────────────────────────────────────────
      {
        name: 'get_recurring_revenue_metrics',
        description:
          'Get key MRR and subscription revenue metrics for a company connection',
        inputSchema: {
          type: 'object',
          properties: {
            companyId: {
              type: 'string',
              description: 'Unique identifier for the Codat company',
            },
            connectionId: {
              type: 'string',
              description: 'Unique identifier for the data connection',
            },
          },
          required: ['companyId', 'connectionId'],
        },
      },
      {
        name: 'request_recurring_revenue_metrics',
        description:
          'Request production of key subscription revenue metrics for a company connection',
        inputSchema: {
          type: 'object',
          properties: {
            companyId: {
              type: 'string',
              description: 'Unique identifier for the Codat company',
            },
            connectionId: {
              type: 'string',
              description: 'Unique identifier for the data connection',
            },
          },
          required: ['companyId', 'connectionId'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'get_enhanced_balance_sheet_accounts':
          return await this.getEnhancedBalanceSheetAccounts(args);
        case 'get_enhanced_cash_flow_transactions':
          return await this.getEnhancedCashFlowTransactions(args);
        case 'get_enhanced_invoices_report':
          return await this.getEnhancedInvoicesReport(args);
        case 'get_enhanced_profit_and_loss_accounts':
          return await this.getEnhancedProfitAndLossAccounts(args);
        case 'list_available_account_categories':
          return await this.listAvailableAccountCategories();
        case 'get_data_integrity_details':
          return await this.getDataIntegrityDetails(args);
        case 'get_data_integrity_status':
          return await this.getDataIntegrityStatus(args);
        case 'get_data_integrity_summaries':
          return await this.getDataIntegritySummaries(args);
        case 'get_excel_report_status':
          return await this.getExcelReportStatus(args);
        case 'generate_excel_report':
          return await this.generateExcelReport(args);
        case 'get_excel_report_download':
          return await this.getExcelReportDownload(args);
        case 'download_excel_report':
          return await this.downloadExcelReport(args);
        case 'get_accounting_marketing_metrics':
          return await this.getAccountingMarketingMetrics(args);
        case 'list_accounts_categories':
          return await this.listAccountsCategories(args);
        case 'update_accounts_categories':
          return await this.updateAccountsCategories(args);
        case 'get_account_category':
          return await this.getAccountCategory(args);
        case 'update_account_category':
          return await this.updateAccountCategory(args);
        case 'get_commerce_customer_retention_metrics':
          return await this.getCommerceCustomerRetentionMetrics(args);
        case 'get_commerce_lifetime_value_metrics':
          return await this.getCommerceLifetimeValueMetrics(args);
        case 'get_commerce_orders_metrics':
          return await this.getCommerceOrdersMetrics(args);
        case 'get_commerce_refunds_metrics':
          return await this.getCommerceRefundsMetrics(args);
        case 'get_commerce_revenue_metrics':
          return await this.getCommerceRevenueMetrics(args);
        case 'get_enhanced_balance_sheet':
          return await this.getEnhancedBalanceSheet(args);
        case 'get_enhanced_profit_and_loss':
          return await this.getEnhancedProfitAndLoss(args);
        case 'get_enhanced_financial_metrics':
          return await this.getEnhancedFinancialMetrics(args);
        case 'get_recurring_revenue_metrics':
          return await this.getRecurringRevenueMetrics(args);
        case 'request_recurring_revenue_metrics':
          return await this.requestRecurringRevenueMetrics(args);
        default:
          return {
            content: [{ type: 'text', text: `Unknown tool: ${name}` }],
            isError: true,
          };
      }
    } catch (err) {
      return {
        content: [{ type: 'text', text: `Error: ${String(err)}` }],
        isError: true,
      };
    }
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private async request(
    method: string,
    path: string,
    query?: Record<string, unknown>,
    body?: unknown,
  ): Promise<ToolResult> {
    const url = new URL(this.baseUrl + path);
    if (query) {
      for (const [k, v] of Object.entries(query)) {
        if (v !== undefined && v !== null) {
          url.searchParams.set(k, String(v));
        }
      }
    }

    const headers: Record<string, string> = {
      Authorization: this.authHeader,
      'Content-Type': 'application/json',
    };

    const init: RequestInit = { method, headers };
    if (body !== undefined) {
      init.body = JSON.stringify(body);
    }

    const res = await this.fetchWithRetry(url.toString(), init);
    let text = await res.text();
    const MAX = 10 * 1024;
    if (text.length > MAX) {
      text = text.slice(0, MAX) + '\n[truncated]';
    }

    if (!res.ok) {
      return {
        content: [{ type: 'text', text: `HTTP ${res.status}: ${text}` }],
        isError: true,
      };
    }
    return { content: [{ type: 'text', text }], isError: false };
  }

  private async getEnhancedBalanceSheetAccounts(args: Record<string, unknown>): Promise<ToolResult> {
    const { companyId, reportDate, numberOfPeriods } = args;
    return this.request(
      'GET',
      `/companies/${companyId}/reports/enhancedBalanceSheet/accounts`,
      { reportDate, numberOfPeriods },
    );
  }

  private async getEnhancedCashFlowTransactions(args: Record<string, unknown>): Promise<ToolResult> {
    const { companyId, page, pageSize, query } = args;
    return this.request(
      'GET',
      `/companies/${companyId}/reports/enhancedCashFlow/transactions`,
      { page, pageSize, query },
    );
  }

  private async getEnhancedInvoicesReport(args: Record<string, unknown>): Promise<ToolResult> {
    const { companyId, page, pageSize, query } = args;
    return this.request(
      'GET',
      `/companies/${companyId}/reports/enhancedInvoices`,
      { page, pageSize, query },
    );
  }

  private async getEnhancedProfitAndLossAccounts(args: Record<string, unknown>): Promise<ToolResult> {
    const { companyId, reportDate, numberOfPeriods } = args;
    return this.request(
      'GET',
      `/companies/${companyId}/reports/enhancedProfitAndLoss/accounts`,
      { reportDate, numberOfPeriods },
    );
  }

  private async listAvailableAccountCategories(): Promise<ToolResult> {
    return this.request('GET', '/data/assess/accounts/categories');
  }

  private async getDataIntegrityDetails(args: Record<string, unknown>): Promise<ToolResult> {
    const { companyId, dataType, page, pageSize, query, orderBy } = args;
    return this.request(
      'GET',
      `/data/companies/${companyId}/assess/dataTypes/${dataType}/dataIntegrity/details`,
      { page, pageSize, query, orderBy },
    );
  }

  private async getDataIntegrityStatus(args: Record<string, unknown>): Promise<ToolResult> {
    const { companyId, dataType } = args;
    return this.request(
      'GET',
      `/data/companies/${companyId}/assess/dataTypes/${dataType}/dataIntegrity/status`,
    );
  }

  private async getDataIntegritySummaries(args: Record<string, unknown>): Promise<ToolResult> {
    const { companyId, dataType, query } = args;
    return this.request(
      'GET',
      `/data/companies/${companyId}/assess/dataTypes/${dataType}/dataIntegrity/summaries`,
      { query },
    );
  }

  private async getExcelReportStatus(args: Record<string, unknown>): Promise<ToolResult> {
    const { companyId, reportType } = args;
    return this.request(
      'GET',
      `/data/companies/${companyId}/assess/excel`,
      { reportType },
    );
  }

  private async generateExcelReport(args: Record<string, unknown>): Promise<ToolResult> {
    const { companyId, reportType } = args;
    return this.request(
      'POST',
      `/data/companies/${companyId}/assess/excel`,
      { reportType },
    );
  }

  private async getExcelReportDownload(args: Record<string, unknown>): Promise<ToolResult> {
    const { companyId, reportType } = args;
    return this.request(
      'GET',
      `/data/companies/${companyId}/assess/excel/download`,
      { reportType },
    );
  }

  private async downloadExcelReport(args: Record<string, unknown>): Promise<ToolResult> {
    const { companyId, reportType } = args;
    return this.request(
      'GET',
      `/data/companies/${companyId}/assess/excel/download`,
      { reportType },
    );
  }

  private async getAccountingMarketingMetrics(args: Record<string, unknown>): Promise<ToolResult> {
    const {
      companyId,
      connectionId,
      reportDate,
      periodLength,
      numberOfPeriods,
      periodUnit,
      includeDisplayNames,
      showInputValues,
    } = args;
    return this.request(
      'GET',
      `/data/companies/${companyId}/connections/${connectionId}/assess/accountingMetrics/marketing`,
      { reportDate, periodLength, numberOfPeriods, periodUnit, includeDisplayNames, showInputValues },
    );
  }

  private async listAccountsCategories(args: Record<string, unknown>): Promise<ToolResult> {
    const { companyId, connectionId, page, pageSize, query, orderBy } = args;
    return this.request(
      'GET',
      `/data/companies/${companyId}/connections/${connectionId}/assess/accounts/categories`,
      { page, pageSize, query, orderBy },
    );
  }

  private async updateAccountsCategories(args: Record<string, unknown>): Promise<ToolResult> {
    const { companyId, connectionId, categories } = args;
    return this.request(
      'PATCH',
      `/data/companies/${companyId}/connections/${connectionId}/assess/accounts/categories`,
      undefined,
      { categories },
    );
  }

  private async getAccountCategory(args: Record<string, unknown>): Promise<ToolResult> {
    const { companyId, connectionId, accountId } = args;
    return this.request(
      'GET',
      `/data/companies/${companyId}/connections/${connectionId}/assess/accounts/${accountId}/categories`,
    );
  }

  private async updateAccountCategory(args: Record<string, unknown>): Promise<ToolResult> {
    const { companyId, connectionId, accountId, confirmed } = args;
    return this.request(
      'PATCH',
      `/data/companies/${companyId}/connections/${connectionId}/assess/accounts/${accountId}/categories`,
      undefined,
      { confirmed },
    );
  }

  private async getCommerceCustomerRetentionMetrics(args: Record<string, unknown>): Promise<ToolResult> {
    const { companyId, connectionId, reportDate, periodLength, numberOfPeriods, periodUnit, includeDisplayNames } = args;
    return this.request(
      'GET',
      `/data/companies/${companyId}/connections/${connectionId}/assess/commerceMetrics/customerRetention`,
      { reportDate, periodLength, numberOfPeriods, periodUnit, includeDisplayNames },
    );
  }

  private async getCommerceLifetimeValueMetrics(args: Record<string, unknown>): Promise<ToolResult> {
    const { companyId, connectionId, reportDate, periodLength, numberOfPeriods, periodUnit, includeDisplayNames } = args;
    return this.request(
      'GET',
      `/data/companies/${companyId}/connections/${connectionId}/assess/commerceMetrics/lifetimeValue`,
      { reportDate, periodLength, numberOfPeriods, periodUnit, includeDisplayNames },
    );
  }

  private async getCommerceOrdersMetrics(args: Record<string, unknown>): Promise<ToolResult> {
    const { companyId, connectionId, reportDate, periodLength, numberOfPeriods, periodUnit, includeDisplayNames } = args;
    return this.request(
      'GET',
      `/data/companies/${companyId}/connections/${connectionId}/assess/commerceMetrics/orders`,
      { reportDate, periodLength, numberOfPeriods, periodUnit, includeDisplayNames },
    );
  }

  private async getCommerceRefundsMetrics(args: Record<string, unknown>): Promise<ToolResult> {
    const { companyId, connectionId, reportDate, periodLength, numberOfPeriods, periodUnit, includeDisplayNames } = args;
    return this.request(
      'GET',
      `/data/companies/${companyId}/connections/${connectionId}/assess/commerceMetrics/refunds`,
      { reportDate, periodLength, numberOfPeriods, periodUnit, includeDisplayNames },
    );
  }

  private async getCommerceRevenueMetrics(args: Record<string, unknown>): Promise<ToolResult> {
    const { companyId, connectionId, reportDate, periodLength, numberOfPeriods, periodUnit, includeDisplayNames } = args;
    return this.request(
      'GET',
      `/data/companies/${companyId}/connections/${connectionId}/assess/commerceMetrics/revenue`,
      { reportDate, periodLength, numberOfPeriods, periodUnit, includeDisplayNames },
    );
  }

  private async getEnhancedBalanceSheet(args: Record<string, unknown>): Promise<ToolResult> {
    const { companyId, connectionId, reportDate, periodLength, numberOfPeriods, includeDisplayNames } = args;
    return this.request(
      'GET',
      `/data/companies/${companyId}/connections/${connectionId}/assess/enhancedBalanceSheet`,
      { reportDate, periodLength, numberOfPeriods, includeDisplayNames },
    );
  }

  private async getEnhancedProfitAndLoss(args: Record<string, unknown>): Promise<ToolResult> {
    const { companyId, connectionId, reportDate, periodLength, numberOfPeriods, includeDisplayNames } = args;
    return this.request(
      'GET',
      `/data/companies/${companyId}/connections/${connectionId}/assess/enhancedProfitAndLoss`,
      { reportDate, periodLength, numberOfPeriods, includeDisplayNames },
    );
  }

  private async getEnhancedFinancialMetrics(args: Record<string, unknown>): Promise<ToolResult> {
    const { companyId, connectionId, reportDate, periodLength, numberOfPeriods, showMetricInputs } = args;
    return this.request(
      'GET',
      `/data/companies/${companyId}/connections/${connectionId}/assess/financialMetrics`,
      { reportDate, periodLength, numberOfPeriods, showMetricInputs },
    );
  }

  private async getRecurringRevenueMetrics(args: Record<string, unknown>): Promise<ToolResult> {
    const { companyId, connectionId } = args;
    return this.request(
      'GET',
      `/data/companies/${companyId}/connections/${connectionId}/assess/subscriptions/mrr`,
    );
  }

  private async requestRecurringRevenueMetrics(args: Record<string, unknown>): Promise<ToolResult> {
    const { companyId, connectionId } = args;
    return this.request(
      'GET',
      `/data/companies/${companyId}/connections/${connectionId}/assess/subscriptions/process`,
    );
  }
}

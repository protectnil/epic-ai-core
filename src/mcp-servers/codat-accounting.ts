/**
 * Codat Accounting MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03. Codat has not published an official MCP server.
//
// Base URL: https://api.codat.io
// Auth: API Key in Authorization header — "Basic <base64-encoded-api-key>"
//   Codat base64-encodes just the API key (not user:password) per their docs.
// Docs: https://docs.codat.io/accounting-api
// Rate limits: Not publicly documented; Codat enforces per-tenant limits server-side.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface CodatAccountingConfig {
  apiKey: string;
  companyId: string;
  connectionId?: string;
  baseUrl?: string;
}

export class CodatAccountingMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly companyId: string;
  private readonly connectionId: string;
  private readonly baseUrl: string;

  constructor(config: CodatAccountingConfig) {
    super();
    this.apiKey = config.apiKey;
    this.companyId = config.companyId;
    this.connectionId = config.connectionId || '';
    this.baseUrl = config.baseUrl || 'https://api.codat.io';
  }

  static catalog() {
    return {
      name: 'codat-accounting',
      displayName: 'Codat Accounting',
      version: '1.0.0',
      category: 'finance' as const,
      keywords: ['codat', 'accounting', 'invoice', 'bill', 'customer', 'supplier', 'journal', 'balance sheet', 'profit loss', 'payment', 'bank', 'finance'],
      toolNames: [
        'get_company_info',
        'list_accounts', 'get_account',
        'get_balance_sheet', 'get_profit_and_loss', 'get_cash_flow_statement',
        'list_customers', 'get_customer',
        'list_suppliers', 'get_supplier',
        'list_invoices', 'get_invoice',
        'list_bills', 'get_bill',
        'list_bill_payments', 'get_bill_payment',
        'list_payments', 'get_payment',
        'list_credit_notes', 'get_credit_note',
        'list_bill_credit_notes', 'get_bill_credit_note',
        'list_journal_entries', 'get_journal_entry',
        'list_journals', 'get_journal',
        'list_purchase_orders', 'get_purchase_order',
        'list_bank_accounts', 'get_bank_account',
        'list_tax_rates', 'get_tax_rate',
        'list_tracking_categories',
        'list_items', 'get_item',
        'get_aged_creditors_report', 'get_aged_debtors_report',
      ],
      description: 'Access Codat accounting data: financial statements, customers, suppliers, invoices, bills, payments, journals, and more via the Codat Accounting REST API.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      // ── Company ───────────────────────────────────────────────────────────
      {
        name: 'get_company_info',
        description: 'Get general company information for the Codat company, including registration details and fiscal year',
        inputSchema: { type: 'object', properties: {} },
      },
      // ── Chart of Accounts ─────────────────────────────────────────────────
      {
        name: 'list_accounts',
        description: 'List all accounts in the chart of accounts for the company',
        inputSchema: {
          type: 'object',
          properties: {
            page: { type: 'number', description: 'Page number (default: 1)' },
            pageSize: { type: 'number', description: 'Results per page (max 5000, default: 100)' },
            query: { type: 'string', description: 'Codat query string to filter results (e.g. status=Active)' },
          },
        },
      },
      {
        name: 'get_account',
        description: 'Get a single chart of accounts entry by account ID',
        inputSchema: {
          type: 'object',
          properties: {
            accountId: { type: 'string', description: 'The Codat account ID' },
          },
          required: ['accountId'],
        },
      },
      // ── Financial Statements ──────────────────────────────────────────────
      {
        name: 'get_balance_sheet',
        description: 'Get the balance sheet report for the company showing assets, liabilities, and equity',
        inputSchema: {
          type: 'object',
          properties: {
            periodLength: { type: 'number', description: 'Number of months per reporting period (default: 1)' },
            periodsToCompare: { type: 'number', description: 'Number of periods to compare (default: 2)' },
            startMonth: { type: 'string', description: 'Start month in YYYY-MM-DD format (default: first available)' },
          },
        },
      },
      {
        name: 'get_profit_and_loss',
        description: 'Get the profit and loss (income statement) report for the company',
        inputSchema: {
          type: 'object',
          properties: {
            periodLength: { type: 'number', description: 'Number of months per reporting period (default: 1)' },
            periodsToCompare: { type: 'number', description: 'Number of periods to compare (default: 2)' },
            startMonth: { type: 'string', description: 'Start month in YYYY-MM-DD format (default: first available)' },
          },
        },
      },
      {
        name: 'get_cash_flow_statement',
        description: 'Get the cash flow statement report for the company',
        inputSchema: {
          type: 'object',
          properties: {
            periodLength: { type: 'number', description: 'Number of months per reporting period (default: 1)' },
            periodsToCompare: { type: 'number', description: 'Number of periods to compare (default: 2)' },
            startMonth: { type: 'string', description: 'Start month in YYYY-MM-DD format (default: first available)' },
          },
        },
      },
      // ── Customers ─────────────────────────────────────────────────────────
      {
        name: 'list_customers',
        description: 'List customers for the company, with optional filtering and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            page: { type: 'number', description: 'Page number (default: 1)' },
            pageSize: { type: 'number', description: 'Results per page (default: 100)' },
            query: { type: 'string', description: 'Filter query string (e.g. status=Active)' },
          },
        },
      },
      {
        name: 'get_customer',
        description: 'Get a single customer record by customer ID',
        inputSchema: {
          type: 'object',
          properties: {
            customerId: { type: 'string', description: 'The Codat customer ID' },
          },
          required: ['customerId'],
        },
      },
      // ── Suppliers ─────────────────────────────────────────────────────────
      {
        name: 'list_suppliers',
        description: 'List suppliers (vendors) for the company, with optional filtering and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            page: { type: 'number', description: 'Page number (default: 1)' },
            pageSize: { type: 'number', description: 'Results per page (default: 100)' },
            query: { type: 'string', description: 'Filter query string (e.g. status=Active)' },
          },
        },
      },
      {
        name: 'get_supplier',
        description: 'Get a single supplier record by supplier ID',
        inputSchema: {
          type: 'object',
          properties: {
            supplierId: { type: 'string', description: 'The Codat supplier ID' },
          },
          required: ['supplierId'],
        },
      },
      // ── Invoices ──────────────────────────────────────────────────────────
      {
        name: 'list_invoices',
        description: 'List sales invoices for the company, with optional filtering by status or customer',
        inputSchema: {
          type: 'object',
          properties: {
            page: { type: 'number', description: 'Page number (default: 1)' },
            pageSize: { type: 'number', description: 'Results per page (default: 100)' },
            query: { type: 'string', description: 'Filter query (e.g. status=Submitted, customerRef.id=abc123)' },
          },
        },
      },
      {
        name: 'get_invoice',
        description: 'Get a single invoice by invoice ID',
        inputSchema: {
          type: 'object',
          properties: {
            invoiceId: { type: 'string', description: 'The Codat invoice ID' },
          },
          required: ['invoiceId'],
        },
      },
      // ── Bills ─────────────────────────────────────────────────────────────
      {
        name: 'list_bills',
        description: 'List purchase bills (accounts payable) for the company',
        inputSchema: {
          type: 'object',
          properties: {
            page: { type: 'number', description: 'Page number (default: 1)' },
            pageSize: { type: 'number', description: 'Results per page (default: 100)' },
            query: { type: 'string', description: 'Filter query string (e.g. status=Open)' },
          },
        },
      },
      {
        name: 'get_bill',
        description: 'Get a single bill by bill ID',
        inputSchema: {
          type: 'object',
          properties: {
            billId: { type: 'string', description: 'The Codat bill ID' },
          },
          required: ['billId'],
        },
      },
      // ── Bill Payments ─────────────────────────────────────────────────────
      {
        name: 'list_bill_payments',
        description: 'List bill payments (accounts payable payments) for the company',
        inputSchema: {
          type: 'object',
          properties: {
            page: { type: 'number', description: 'Page number (default: 1)' },
            pageSize: { type: 'number', description: 'Results per page (default: 100)' },
            query: { type: 'string', description: 'Filter query string' },
          },
        },
      },
      {
        name: 'get_bill_payment',
        description: 'Get a single bill payment by bill payment ID',
        inputSchema: {
          type: 'object',
          properties: {
            billPaymentId: { type: 'string', description: 'The Codat bill payment ID' },
          },
          required: ['billPaymentId'],
        },
      },
      // ── Payments ──────────────────────────────────────────────────────────
      {
        name: 'list_payments',
        description: 'List customer payments (accounts receivable payments) for the company',
        inputSchema: {
          type: 'object',
          properties: {
            page: { type: 'number', description: 'Page number (default: 1)' },
            pageSize: { type: 'number', description: 'Results per page (default: 100)' },
            query: { type: 'string', description: 'Filter query string' },
          },
        },
      },
      {
        name: 'get_payment',
        description: 'Get a single customer payment by payment ID',
        inputSchema: {
          type: 'object',
          properties: {
            paymentId: { type: 'string', description: 'The Codat payment ID' },
          },
          required: ['paymentId'],
        },
      },
      // ── Credit Notes ──────────────────────────────────────────────────────
      {
        name: 'list_credit_notes',
        description: 'List credit notes (customer credits against invoices) for the company',
        inputSchema: {
          type: 'object',
          properties: {
            page: { type: 'number', description: 'Page number (default: 1)' },
            pageSize: { type: 'number', description: 'Results per page (default: 100)' },
            query: { type: 'string', description: 'Filter query string' },
          },
        },
      },
      {
        name: 'get_credit_note',
        description: 'Get a single credit note by credit note ID',
        inputSchema: {
          type: 'object',
          properties: {
            creditNoteId: { type: 'string', description: 'The Codat credit note ID' },
          },
          required: ['creditNoteId'],
        },
      },
      // ── Bill Credit Notes ─────────────────────────────────────────────────
      {
        name: 'list_bill_credit_notes',
        description: 'List bill credit notes (supplier credits against bills) for the company',
        inputSchema: {
          type: 'object',
          properties: {
            page: { type: 'number', description: 'Page number (default: 1)' },
            pageSize: { type: 'number', description: 'Results per page (default: 100)' },
            query: { type: 'string', description: 'Filter query string' },
          },
        },
      },
      {
        name: 'get_bill_credit_note',
        description: 'Get a single bill credit note by bill credit note ID',
        inputSchema: {
          type: 'object',
          properties: {
            billCreditNoteId: { type: 'string', description: 'The Codat bill credit note ID' },
          },
          required: ['billCreditNoteId'],
        },
      },
      // ── Journal Entries ───────────────────────────────────────────────────
      {
        name: 'list_journal_entries',
        description: 'List journal entries for the company',
        inputSchema: {
          type: 'object',
          properties: {
            page: { type: 'number', description: 'Page number (default: 1)' },
            pageSize: { type: 'number', description: 'Results per page (default: 100)' },
            query: { type: 'string', description: 'Filter query string' },
          },
        },
      },
      {
        name: 'get_journal_entry',
        description: 'Get a single journal entry by journal entry ID',
        inputSchema: {
          type: 'object',
          properties: {
            journalEntryId: { type: 'string', description: 'The Codat journal entry ID' },
          },
          required: ['journalEntryId'],
        },
      },
      // ── Journals ──────────────────────────────────────────────────────────
      {
        name: 'list_journals',
        description: 'List journals (ledger books) for the company',
        inputSchema: {
          type: 'object',
          properties: {
            page: { type: 'number', description: 'Page number (default: 1)' },
            pageSize: { type: 'number', description: 'Results per page (default: 100)' },
            query: { type: 'string', description: 'Filter query string' },
          },
        },
      },
      {
        name: 'get_journal',
        description: 'Get a single journal (ledger book) by journal ID',
        inputSchema: {
          type: 'object',
          properties: {
            journalId: { type: 'string', description: 'The Codat journal ID' },
          },
          required: ['journalId'],
        },
      },
      // ── Purchase Orders ───────────────────────────────────────────────────
      {
        name: 'list_purchase_orders',
        description: 'List purchase orders for the company',
        inputSchema: {
          type: 'object',
          properties: {
            page: { type: 'number', description: 'Page number (default: 1)' },
            pageSize: { type: 'number', description: 'Results per page (default: 100)' },
            query: { type: 'string', description: 'Filter query string (e.g. status=Open)' },
          },
        },
      },
      {
        name: 'get_purchase_order',
        description: 'Get a single purchase order by purchase order ID',
        inputSchema: {
          type: 'object',
          properties: {
            purchaseOrderId: { type: 'string', description: 'The Codat purchase order ID' },
          },
          required: ['purchaseOrderId'],
        },
      },
      // ── Bank Accounts ─────────────────────────────────────────────────────
      {
        name: 'list_bank_accounts',
        description: 'List bank accounts connected to the company. Requires connectionId in adapter config.',
        inputSchema: {
          type: 'object',
          properties: {
            page: { type: 'number', description: 'Page number (default: 1)' },
            pageSize: { type: 'number', description: 'Results per page (default: 100)' },
            query: { type: 'string', description: 'Filter query string' },
          },
        },
      },
      {
        name: 'get_bank_account',
        description: 'Get a single bank account by account ID. Requires connectionId in adapter config.',
        inputSchema: {
          type: 'object',
          properties: {
            accountId: { type: 'string', description: 'The bank account ID' },
          },
          required: ['accountId'],
        },
      },
      // ── Tax Rates ─────────────────────────────────────────────────────────
      {
        name: 'list_tax_rates',
        description: 'List all tax rates configured in the company accounting system',
        inputSchema: {
          type: 'object',
          properties: {
            page: { type: 'number', description: 'Page number (default: 1)' },
            pageSize: { type: 'number', description: 'Results per page (default: 100)' },
            query: { type: 'string', description: 'Filter query string' },
          },
        },
      },
      {
        name: 'get_tax_rate',
        description: 'Get a single tax rate by tax rate ID',
        inputSchema: {
          type: 'object',
          properties: {
            taxRateId: { type: 'string', description: 'The Codat tax rate ID' },
          },
          required: ['taxRateId'],
        },
      },
      // ── Tracking Categories ───────────────────────────────────────────────
      {
        name: 'list_tracking_categories',
        description: 'List tracking categories (cost centres, classes, departments) for the company',
        inputSchema: {
          type: 'object',
          properties: {
            page: { type: 'number', description: 'Page number (default: 1)' },
            pageSize: { type: 'number', description: 'Results per page (default: 100)' },
            query: { type: 'string', description: 'Filter query string' },
          },
        },
      },
      // ── Items ─────────────────────────────────────────────────────────────
      {
        name: 'list_items',
        description: 'List items (products and services catalog) for the company',
        inputSchema: {
          type: 'object',
          properties: {
            page: { type: 'number', description: 'Page number (default: 1)' },
            pageSize: { type: 'number', description: 'Results per page (default: 100)' },
            query: { type: 'string', description: 'Filter query string' },
          },
        },
      },
      {
        name: 'get_item',
        description: 'Get a single item (product or service) by item ID',
        inputSchema: {
          type: 'object',
          properties: {
            itemId: { type: 'string', description: 'The Codat item ID' },
          },
          required: ['itemId'],
        },
      },
      // ── Aged Reports ──────────────────────────────────────────────────────
      {
        name: 'get_aged_creditors_report',
        description: 'Get the aged creditors report showing outstanding amounts owed to suppliers, grouped by age bucket',
        inputSchema: {
          type: 'object',
          properties: {
            reportDate: { type: 'string', description: 'Report date in YYYY-MM-DD format (default: today)' },
            numberOfPeriods: { type: 'number', description: 'Number of aging periods (default: 4)' },
            periodLengthDays: { type: 'number', description: 'Length of each aging period in days (default: 30)' },
          },
        },
      },
      {
        name: 'get_aged_debtors_report',
        description: 'Get the aged debtors report showing outstanding amounts owed by customers, grouped by age bucket',
        inputSchema: {
          type: 'object',
          properties: {
            reportDate: { type: 'string', description: 'Report date in YYYY-MM-DD format (default: today)' },
            numberOfPeriods: { type: 'number', description: 'Number of aging periods (default: 4)' },
            periodLengthDays: { type: 'number', description: 'Length of each aging period in days (default: 30)' },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'get_company_info':           return await this.getCompanyInfo();
        case 'list_accounts':              return await this.listAccounts(args);
        case 'get_account':                return await this.getAccount(args);
        case 'get_balance_sheet':          return await this.getBalanceSheet(args);
        case 'get_profit_and_loss':        return await this.getProfitAndLoss(args);
        case 'get_cash_flow_statement':    return await this.getCashFlowStatement(args);
        case 'list_customers':             return await this.listCustomers(args);
        case 'get_customer':               return await this.getCustomer(args);
        case 'list_suppliers':             return await this.listSuppliers(args);
        case 'get_supplier':               return await this.getSupplier(args);
        case 'list_invoices':              return await this.listInvoices(args);
        case 'get_invoice':                return await this.getInvoice(args);
        case 'list_bills':                 return await this.listBills(args);
        case 'get_bill':                   return await this.getBill(args);
        case 'list_bill_payments':         return await this.listBillPayments(args);
        case 'get_bill_payment':           return await this.getBillPayment(args);
        case 'list_payments':              return await this.listPayments(args);
        case 'get_payment':                return await this.getPayment(args);
        case 'list_credit_notes':          return await this.listCreditNotes(args);
        case 'get_credit_note':            return await this.getCreditNote(args);
        case 'list_bill_credit_notes':     return await this.listBillCreditNotes(args);
        case 'get_bill_credit_note':       return await this.getBillCreditNote(args);
        case 'list_journal_entries':       return await this.listJournalEntries(args);
        case 'get_journal_entry':          return await this.getJournalEntry(args);
        case 'list_journals':              return await this.listJournals(args);
        case 'get_journal':                return await this.getJournal(args);
        case 'list_purchase_orders':       return await this.listPurchaseOrders(args);
        case 'get_purchase_order':         return await this.getPurchaseOrder(args);
        case 'list_bank_accounts':         return await this.listBankAccounts(args);
        case 'get_bank_account':           return await this.getBankAccount(args);
        case 'list_tax_rates':             return await this.listTaxRates(args);
        case 'get_tax_rate':               return await this.getTaxRate(args);
        case 'list_tracking_categories':   return await this.listTrackingCategories(args);
        case 'list_items':                 return await this.listItems(args);
        case 'get_item':                   return await this.getItem(args);
        case 'get_aged_creditors_report':  return await this.getAgedCreditorsReport(args);
        case 'get_aged_debtors_report':    return await this.getAgedDebtorsReport(args);
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

  private buildHeaders(): Record<string, string> {
    const encoded = Buffer.from(this.apiKey).toString('base64');
    return {
      Authorization: `Basic ${encoded}`,
      'Content-Type': 'application/json',
    };
  }

  private requireConnection(): ToolResult | null {
    if (!this.connectionId) {
      return {
        content: [{ type: 'text', text: 'connectionId is required in the adapter config for connection-scoped endpoints (e.g. bank accounts)' }],
        isError: true,
      };
    }
    return null;
  }

  private async codatRequest(path: string, options: RequestInit = {}): Promise<ToolResult> {
    const url = `${this.baseUrl}${path}`;
    const response = await this.fetchWithRetry(url, { ...options, headers: this.buildHeaders() });

    if (!response.ok) {
      let detail = '';
      try { detail = await response.text(); } catch { /* ignore */ }
      return {
        content: [{ type: 'text', text: `Codat API error ${response.status} ${response.statusText}${detail ? ': ' + detail.slice(0, 400) : ''}` }],
        isError: true,
      };
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      return { content: [{ type: 'text', text: `Codat returned non-JSON response (HTTP ${response.status})` }], isError: false };
    }

    const text = JSON.stringify(data, null, 2);
    const truncated = text.length > 10_000
      ? text.slice(0, 10_000) + `\n... [truncated, ${text.length} total chars]`
      : text;
    return { content: [{ type: 'text', text: truncated }], isError: false };
  }

  private paginationParams(args: Record<string, unknown>): string {
    const params = new URLSearchParams();
    if (args.page) params.set('page', String(args.page));
    if (args.pageSize) params.set('pageSize', String(args.pageSize));
    if (args.query) params.set('query', args.query as string);
    const qs = params.toString();
    return qs ? `?${qs}` : '';
  }

  private companyPath(sub: string): string {
    return `/companies/${encodeURIComponent(this.companyId)}/${sub}`;
  }

  private connPath(sub: string): string {
    return `/companies/${encodeURIComponent(this.companyId)}/connections/${encodeURIComponent(this.connectionId)}/${sub}`;
  }

  // ── Company ───────────────────────────────────────────────────────────────

  private async getCompanyInfo(): Promise<ToolResult> {
    return this.codatRequest(this.companyPath('data/info'));
  }

  // ── Chart of Accounts ─────────────────────────────────────────────────────

  private async listAccounts(args: Record<string, unknown>): Promise<ToolResult> {
    return this.codatRequest(this.companyPath(`data/accounts${this.paginationParams(args)}`));
  }

  private async getAccount(args: Record<string, unknown>): Promise<ToolResult> {
    return this.codatRequest(this.companyPath(`data/accounts/${encodeURIComponent(args.accountId as string)}`));
  }

  // ── Financial Statements ──────────────────────────────────────────────────

  private async getBalanceSheet(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.periodLength) params.set('periodLength', String(args.periodLength));
    if (args.periodsToCompare) params.set('periodsToCompare', String(args.periodsToCompare));
    if (args.startMonth) params.set('startMonth', args.startMonth as string);
    const qs = params.toString();
    return this.codatRequest(this.companyPath(`data/financials/balanceSheet${qs ? '?' + qs : ''}`));
  }

  private async getProfitAndLoss(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.periodLength) params.set('periodLength', String(args.periodLength));
    if (args.periodsToCompare) params.set('periodsToCompare', String(args.periodsToCompare));
    if (args.startMonth) params.set('startMonth', args.startMonth as string);
    const qs = params.toString();
    return this.codatRequest(this.companyPath(`data/financials/profitAndLoss${qs ? '?' + qs : ''}`));
  }

  private async getCashFlowStatement(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.periodLength) params.set('periodLength', String(args.periodLength));
    if (args.periodsToCompare) params.set('periodsToCompare', String(args.periodsToCompare));
    if (args.startMonth) params.set('startMonth', args.startMonth as string);
    const qs = params.toString();
    return this.codatRequest(this.companyPath(`data/financials/cashFlowStatement${qs ? '?' + qs : ''}`));
  }

  // ── Customers ─────────────────────────────────────────────────────────────

  private async listCustomers(args: Record<string, unknown>): Promise<ToolResult> {
    return this.codatRequest(this.companyPath(`data/customers${this.paginationParams(args)}`));
  }

  private async getCustomer(args: Record<string, unknown>): Promise<ToolResult> {
    return this.codatRequest(this.companyPath(`data/customers/${encodeURIComponent(args.customerId as string)}`));
  }

  // ── Suppliers ─────────────────────────────────────────────────────────────

  private async listSuppliers(args: Record<string, unknown>): Promise<ToolResult> {
    return this.codatRequest(this.companyPath(`data/suppliers${this.paginationParams(args)}`));
  }

  private async getSupplier(args: Record<string, unknown>): Promise<ToolResult> {
    return this.codatRequest(this.companyPath(`data/suppliers/${encodeURIComponent(args.supplierId as string)}`));
  }

  // ── Invoices ──────────────────────────────────────────────────────────────

  private async listInvoices(args: Record<string, unknown>): Promise<ToolResult> {
    return this.codatRequest(this.companyPath(`data/invoices${this.paginationParams(args)}`));
  }

  private async getInvoice(args: Record<string, unknown>): Promise<ToolResult> {
    return this.codatRequest(this.companyPath(`data/invoices/${encodeURIComponent(args.invoiceId as string)}`));
  }

  // ── Bills ─────────────────────────────────────────────────────────────────

  private async listBills(args: Record<string, unknown>): Promise<ToolResult> {
    return this.codatRequest(this.companyPath(`data/bills${this.paginationParams(args)}`));
  }

  private async getBill(args: Record<string, unknown>): Promise<ToolResult> {
    return this.codatRequest(this.companyPath(`data/bills/${encodeURIComponent(args.billId as string)}`));
  }

  // ── Bill Payments ─────────────────────────────────────────────────────────

  private async listBillPayments(args: Record<string, unknown>): Promise<ToolResult> {
    return this.codatRequest(this.companyPath(`data/billPayments${this.paginationParams(args)}`));
  }

  private async getBillPayment(args: Record<string, unknown>): Promise<ToolResult> {
    return this.codatRequest(this.companyPath(`data/billPayments/${encodeURIComponent(args.billPaymentId as string)}`));
  }

  // ── Payments ──────────────────────────────────────────────────────────────

  private async listPayments(args: Record<string, unknown>): Promise<ToolResult> {
    return this.codatRequest(this.companyPath(`data/payments${this.paginationParams(args)}`));
  }

  private async getPayment(args: Record<string, unknown>): Promise<ToolResult> {
    return this.codatRequest(this.companyPath(`data/payments/${encodeURIComponent(args.paymentId as string)}`));
  }

  // ── Credit Notes ──────────────────────────────────────────────────────────

  private async listCreditNotes(args: Record<string, unknown>): Promise<ToolResult> {
    return this.codatRequest(this.companyPath(`data/creditNotes${this.paginationParams(args)}`));
  }

  private async getCreditNote(args: Record<string, unknown>): Promise<ToolResult> {
    return this.codatRequest(this.companyPath(`data/creditNotes/${encodeURIComponent(args.creditNoteId as string)}`));
  }

  // ── Bill Credit Notes ─────────────────────────────────────────────────────

  private async listBillCreditNotes(args: Record<string, unknown>): Promise<ToolResult> {
    return this.codatRequest(this.companyPath(`data/billCreditNotes${this.paginationParams(args)}`));
  }

  private async getBillCreditNote(args: Record<string, unknown>): Promise<ToolResult> {
    return this.codatRequest(this.companyPath(`data/billCreditNotes/${encodeURIComponent(args.billCreditNoteId as string)}`));
  }

  // ── Journal Entries ───────────────────────────────────────────────────────

  private async listJournalEntries(args: Record<string, unknown>): Promise<ToolResult> {
    return this.codatRequest(this.companyPath(`data/journalEntries${this.paginationParams(args)}`));
  }

  private async getJournalEntry(args: Record<string, unknown>): Promise<ToolResult> {
    return this.codatRequest(this.companyPath(`data/journalEntries/${encodeURIComponent(args.journalEntryId as string)}`));
  }

  // ── Journals ──────────────────────────────────────────────────────────────

  private async listJournals(args: Record<string, unknown>): Promise<ToolResult> {
    return this.codatRequest(this.companyPath(`data/journals${this.paginationParams(args)}`));
  }

  private async getJournal(args: Record<string, unknown>): Promise<ToolResult> {
    return this.codatRequest(this.companyPath(`data/journals/${encodeURIComponent(args.journalId as string)}`));
  }

  // ── Purchase Orders ───────────────────────────────────────────────────────

  private async listPurchaseOrders(args: Record<string, unknown>): Promise<ToolResult> {
    return this.codatRequest(this.companyPath(`data/purchaseOrders${this.paginationParams(args)}`));
  }

  private async getPurchaseOrder(args: Record<string, unknown>): Promise<ToolResult> {
    return this.codatRequest(this.companyPath(`data/purchaseOrders/${encodeURIComponent(args.purchaseOrderId as string)}`));
  }

  // ── Bank Accounts ─────────────────────────────────────────────────────────

  private async listBankAccounts(args: Record<string, unknown>): Promise<ToolResult> {
    const guard = this.requireConnection();
    if (guard) return guard;
    return this.codatRequest(this.connPath(`data/bankAccounts${this.paginationParams(args)}`));
  }

  private async getBankAccount(args: Record<string, unknown>): Promise<ToolResult> {
    const guard = this.requireConnection();
    if (guard) return guard;
    return this.codatRequest(this.connPath(`data/bankAccounts/${encodeURIComponent(args.accountId as string)}`));
  }

  // ── Tax Rates ─────────────────────────────────────────────────────────────

  private async listTaxRates(args: Record<string, unknown>): Promise<ToolResult> {
    return this.codatRequest(this.companyPath(`data/taxRates${this.paginationParams(args)}`));
  }

  private async getTaxRate(args: Record<string, unknown>): Promise<ToolResult> {
    return this.codatRequest(this.companyPath(`data/taxRates/${encodeURIComponent(args.taxRateId as string)}`));
  }

  // ── Tracking Categories ───────────────────────────────────────────────────

  private async listTrackingCategories(args: Record<string, unknown>): Promise<ToolResult> {
    return this.codatRequest(this.companyPath(`data/trackingCategories${this.paginationParams(args)}`));
  }

  // ── Items ─────────────────────────────────────────────────────────────────

  private async listItems(args: Record<string, unknown>): Promise<ToolResult> {
    return this.codatRequest(this.companyPath(`data/items${this.paginationParams(args)}`));
  }

  private async getItem(args: Record<string, unknown>): Promise<ToolResult> {
    return this.codatRequest(this.companyPath(`data/items/${encodeURIComponent(args.itemId as string)}`));
  }

  // ── Aged Reports ──────────────────────────────────────────────────────────

  private async getAgedCreditorsReport(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.reportDate) params.set('reportDate', args.reportDate as string);
    if (args.numberOfPeriods) params.set('numberOfPeriods', String(args.numberOfPeriods));
    if (args.periodLengthDays) params.set('periodLengthDays', String(args.periodLengthDays));
    const qs = params.toString();
    return this.codatRequest(this.companyPath(`reports/agedCreditor${qs ? '?' + qs : ''}`));
  }

  private async getAgedDebtorsReport(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.reportDate) params.set('reportDate', args.reportDate as string);
    if (args.numberOfPeriods) params.set('numberOfPeriods', String(args.numberOfPeriods));
    if (args.periodLengthDays) params.set('periodLengthDays', String(args.periodLengthDays));
    const qs = params.toString();
    return this.codatRequest(this.companyPath(`reports/agedDebtor${qs ? '?' + qs : ''}`));
  }
}

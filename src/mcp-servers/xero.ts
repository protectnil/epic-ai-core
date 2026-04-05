/**
 * Xero MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/XeroAPI/xero-mcp-server — transport: stdio, auth: OAuth2 PKCE or Bearer token.
//   Published by XeroAPI (official). Last updated: December 26, 2025. Actively maintained.
//   Tool count: 46 tools (list-accounts, list-contacts, list-invoices, list-credit-notes,
//   list-items, list-manual-journals, list-profit-and-loss, list-quotes, list-tax-rates,
//   list-payments, list-trial-balance, list-bank-transactions, list-payroll-employees,
//   list-report-balance-sheet, list-payroll-employee-leave, list-payroll-employee-leave-balances,
//   list-payroll-employee-leave-types, list-payroll-leave-periods, list-payroll-leave-types,
//   list-timesheets, list-aged-receivables-by-contact, list-aged-payables-by-contact,
//   list-contact-groups, list-tracking-categories, list-organisation-details,
//   create-bank-transaction, create-contact, create-credit-note, create-invoice, create-item,
//   create-manual-journal, create-payment, create-quote, create-payroll-timesheet,
//   create-tracking-category, create-tracking-option, update-bank-transaction, update-contact,
//   update-invoice, update-item, update-manual-journal, update-quote, update-credit-note,
//   update-tracking-category, update-tracking-options, update-payroll-timesheet-line,
//   approve-payroll-timesheet, revert-payroll-timesheet, add-payroll-timesheet-line,
//   delete-payroll-timesheet, get-payroll-timesheet).
//   MCP is a strict superset: covers all our REST tools plus payroll, quotes, items, tracking, journals.
// Our adapter covers: 14 tools. Vendor MCP covers: 46 tools (full API + payroll surface).
// Recommendation: use-vendor-mcp — MCP meets all 4 criteria and is a strict superset of our REST adapter.
//   This REST adapter is retained as an air-gapped fallback only.
//
// Base URL: https://api.xero.com/api.xro/2.0
// Auth: Bearer token + Xero-Tenant-Id header (required for all API calls)
//   Obtain tokens via OAuth2 PKCE at https://identity.xero.com/connect/token
//   Get tenant ID from https://api.xero.com/connections after auth
// Docs: https://developer.xero.com/documentation/api/accounting/overview
// Rate limits: 60 req/min per access token; 10,000 req/day per app

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface XeroConfig {
  /** OAuth2 Bearer access token from Xero identity server */
  accessToken: string;
  /** Xero tenant (organisation) ID — required on every API call */
  tenantId: string;
  /** Optional base URL override (default: https://api.xero.com/api.xro/2.0) */
  baseUrl?: string;
}

export class XeroMCPServer extends MCPAdapterBase {
  private readonly accessToken: string;
  private readonly tenantId: string;
  private readonly baseUrl: string;

  constructor(config: XeroConfig) {
    super();
    this.accessToken = config.accessToken;
    this.tenantId = config.tenantId;
    this.baseUrl = (config.baseUrl ?? 'https://api.xero.com/api.xro/2.0').replace(/\/$/, '');
  }

  static catalog() {
    return {
      name: 'xero',
      displayName: 'Xero',
      version: '1.0.0',
      category: 'finance' as const,
      keywords: ['xero', 'accounting', 'invoice', 'payment', 'contact', 'account', 'bank', 'credit-note', 'reconcile', 'finance', 'bookkeeping'],
      toolNames: [
        'list_invoices', 'get_invoice', 'create_invoice', 'update_invoice',
        'list_contacts', 'get_contact', 'create_contact',
        'list_accounts',
        'list_payments', 'create_payment',
        'list_credit_notes', 'get_credit_note',
        'list_bank_transactions',
        'get_balance_sheet',
      ],
      description: 'Accounting and finance: manage invoices, contacts, payments, bank transactions, credit notes, and chart of accounts in Xero.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_invoices',
        description: 'List Xero invoices with optional filters for status, date range, and contact, with pagination',
        inputSchema: {
          type: 'object',
          properties: {
            status: { type: 'string', description: 'Filter by status: DRAFT, SUBMITTED, AUTHORISED, PAID, VOIDED (optional)' },
            contactId: { type: 'string', description: 'Filter by contact GUID (optional)' },
            page: { type: 'number', description: 'Page number — 100 results per page (optional)' },
            dateFrom: { type: 'string', description: 'Filter invoices on or after this date (YYYY-MM-DD) (optional)' },
            dateTo: { type: 'string', description: 'Filter invoices on or before this date (YYYY-MM-DD) (optional)' },
            where: { type: 'string', description: 'Xero filter expression, e.g. AmountDue>0 (optional)' },
          },
        },
      },
      {
        name: 'get_invoice',
        description: 'Retrieve a single Xero invoice by invoice GUID or invoice number with full line item detail',
        inputSchema: {
          type: 'object',
          properties: {
            invoice_id: { type: 'string', description: 'Xero invoice GUID or invoice number' },
          },
          required: ['invoice_id'],
        },
      },
      {
        name: 'create_invoice',
        description: 'Create a new invoice in Xero — accounts receivable (ACCREC) or accounts payable (ACCPAY)',
        inputSchema: {
          type: 'object',
          properties: {
            type: { type: 'string', description: 'Invoice type: ACCREC (accounts receivable) or ACCPAY (accounts payable)' },
            contact_id: { type: 'string', description: 'Xero contact GUID for the invoice recipient' },
            line_items: { type: 'array', description: 'Array of line items with Description, Quantity, UnitAmount, and AccountCode fields', items: { type: 'object' } },
            due_date: { type: 'string', description: 'Invoice due date (YYYY-MM-DD) (optional)' },
            reference: { type: 'string', description: 'Reference number for the invoice (optional)' },
            status: { type: 'string', description: 'Invoice status on creation: DRAFT or AUTHORISED (default: DRAFT)' },
          },
          required: ['type', 'contact_id', 'line_items'],
        },
      },
      {
        name: 'update_invoice',
        description: 'Update an existing Xero invoice — change status, add line items, or update reference',
        inputSchema: {
          type: 'object',
          properties: {
            invoice_id: { type: 'string', description: 'Xero invoice GUID' },
            status: { type: 'string', description: 'New invoice status: DRAFT, SUBMITTED, AUTHORISED, VOIDED (optional)' },
            reference: { type: 'string', description: 'New reference value (optional)' },
            due_date: { type: 'string', description: 'New due date (YYYY-MM-DD) (optional)' },
          },
          required: ['invoice_id'],
        },
      },
      {
        name: 'list_contacts',
        description: 'List Xero contacts (customers and suppliers) with optional search and filter, paginated',
        inputSchema: {
          type: 'object',
          properties: {
            page: { type: 'number', description: 'Page number — 100 results per page (optional)' },
            where: { type: 'string', description: 'Xero filter expression, e.g. IsCustomer=true (optional)' },
            searchTerm: { type: 'string', description: 'Search contacts by name or email (optional)' },
          },
        },
      },
      {
        name: 'get_contact',
        description: 'Retrieve a single Xero contact by GUID with full details including balances and payment history',
        inputSchema: {
          type: 'object',
          properties: {
            contact_id: { type: 'string', description: 'Xero contact GUID' },
          },
          required: ['contact_id'],
        },
      },
      {
        name: 'create_contact',
        description: 'Create a new contact in Xero with name, email, phone, and address details',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Contact name (required — must be unique in the Xero organisation)' },
            emailAddress: { type: 'string', description: 'Contact email address (optional)' },
            firstName: { type: 'string', description: 'Contact first name (optional)' },
            lastName: { type: 'string', description: 'Contact last name (optional)' },
            phoneNumber: { type: 'string', description: 'Contact phone number (optional)' },
            isCustomer: { type: 'boolean', description: 'Mark as customer (optional)' },
            isSupplier: { type: 'boolean', description: 'Mark as supplier (optional)' },
          },
          required: ['name'],
        },
      },
      {
        name: 'list_accounts',
        description: 'List Xero chart of accounts with optional filter by account type',
        inputSchema: {
          type: 'object',
          properties: {
            type: { type: 'string', description: 'Filter by account type: BANK, CURRENT, EXPENSE, REVENUE, EQUITY, LIABILITY, etc. (optional)' },
            where: { type: 'string', description: 'Xero filter expression (optional)' },
          },
        },
      },
      {
        name: 'list_payments',
        description: 'List payments recorded in Xero with optional filters for status and date range',
        inputSchema: {
          type: 'object',
          properties: {
            status: { type: 'string', description: 'Filter by payment status: AUTHORISED, DELETED (optional)' },
            where: { type: 'string', description: 'Xero filter expression (optional)' },
            page: { type: 'number', description: 'Page number for pagination (optional)' },
          },
        },
      },
      {
        name: 'create_payment',
        description: 'Record a payment against an invoice or credit note in Xero — links payment to bank account',
        inputSchema: {
          type: 'object',
          properties: {
            invoice_id: { type: 'string', description: 'Invoice GUID to apply the payment to' },
            account_id: { type: 'string', description: 'Bank account GUID the payment is deposited into' },
            amount: { type: 'number', description: 'Payment amount' },
            date: { type: 'string', description: 'Payment date (YYYY-MM-DD)' },
            reference: { type: 'string', description: 'Payment reference number (optional)' },
          },
          required: ['invoice_id', 'account_id', 'amount', 'date'],
        },
      },
      {
        name: 'list_credit_notes',
        description: 'List Xero credit notes with optional status and date filters',
        inputSchema: {
          type: 'object',
          properties: {
            status: { type: 'string', description: 'Filter by status: DRAFT, SUBMITTED, AUTHORISED, PAID, VOIDED (optional)' },
            page: { type: 'number', description: 'Page number for pagination (optional)' },
            where: { type: 'string', description: 'Xero filter expression (optional)' },
          },
        },
      },
      {
        name: 'get_credit_note',
        description: 'Retrieve a single Xero credit note by ID with full line item and allocation details',
        inputSchema: {
          type: 'object',
          properties: {
            credit_note_id: { type: 'string', description: 'Xero credit note GUID' },
          },
          required: ['credit_note_id'],
        },
      },
      {
        name: 'list_bank_transactions',
        description: 'List Xero bank transactions with optional filters for bank account and transaction type',
        inputSchema: {
          type: 'object',
          properties: {
            bankAccountId: { type: 'string', description: 'Filter by bank account GUID (optional)' },
            type: { type: 'string', description: 'Transaction type: SPEND, RECEIVE, SPEND-TRANSFER, RECEIVE-TRANSFER (optional)' },
            page: { type: 'number', description: 'Page number for pagination (optional)' },
            where: { type: 'string', description: 'Xero filter expression (optional)' },
          },
        },
      },
      {
        name: 'get_balance_sheet',
        description: 'Retrieve a Xero balance sheet report for a given date with optional comparison periods',
        inputSchema: {
          type: 'object',
          properties: {
            date: { type: 'string', description: 'Report date (YYYY-MM-DD, default: today)' },
            periods: { type: 'number', description: 'Number of comparison periods (default: 1, max: 11)' },
            timeframe: { type: 'string', description: 'Comparison timeframe: MONTH, QUARTER, YEAR (default: MONTH)' },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_invoices':
          return await this.listInvoices(args);
        case 'get_invoice':
          return await this.getInvoice(args);
        case 'create_invoice':
          return await this.createInvoice(args);
        case 'update_invoice':
          return await this.updateInvoice(args);
        case 'list_contacts':
          return await this.listContacts(args);
        case 'get_contact':
          return await this.getContact(args);
        case 'create_contact':
          return await this.createContact(args);
        case 'list_accounts':
          return await this.listAccounts(args);
        case 'list_payments':
          return await this.listPayments(args);
        case 'create_payment':
          return await this.createPayment(args);
        case 'list_credit_notes':
          return await this.listCreditNotes(args);
        case 'get_credit_note':
          return await this.getCreditNote(args);
        case 'list_bank_transactions':
          return await this.listBankTransactions(args);
        case 'get_balance_sheet':
          return await this.getBalanceSheet(args);
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

  private authHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.accessToken}`,
      'Xero-Tenant-Id': this.tenantId,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  private async fetchJson(url: string, options?: RequestInit): Promise<ToolResult> {
    const response = await this.fetchWithRetry(url, { headers: this.authHeaders(), ...options });
    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `Xero API error: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }
    const data = await response.json().catch(() => { throw new Error(`Xero returned non-JSON (HTTP ${response.status})`); });
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listInvoices(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.status) params.set('Statuses', args.status as string);
    if (args.contactId) params.set('ContactIDs', args.contactId as string);
    if (args.page) params.set('page', String(args.page));
    if (args.dateFrom) params.set('DateFrom', args.dateFrom as string);
    if (args.dateTo) params.set('DateTo', args.dateTo as string);
    if (args.where) params.set('where', args.where as string);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.fetchJson(`${this.baseUrl}/Invoices${qs}`);
  }

  private async getInvoice(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fetchJson(`${this.baseUrl}/Invoices/${encodeURIComponent(args.invoice_id as string)}`);
  }

  private async createInvoice(args: Record<string, unknown>): Promise<ToolResult> {
    const body = {
      Invoices: [{
        Type: args.type,
        Contact: { ContactID: args.contact_id },
        LineItems: args.line_items,
        ...(args.due_date ? { DueDate: args.due_date } : {}),
        ...(args.reference ? { Reference: args.reference } : {}),
        ...(args.status ? { Status: args.status } : { Status: 'DRAFT' }),
      }],
    };
    return this.fetchJson(`${this.baseUrl}/Invoices`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  private async updateInvoice(args: Record<string, unknown>): Promise<ToolResult> {
    const patch: Record<string, unknown> = {};
    if (args.status) patch.Status = args.status;
    if (args.reference) patch.Reference = args.reference;
    if (args.due_date) patch.DueDate = args.due_date;
    return this.fetchJson(
      `${this.baseUrl}/Invoices/${encodeURIComponent(args.invoice_id as string)}`,
      { method: 'POST', body: JSON.stringify({ Invoices: [patch] }) },
    );
  }

  private async listContacts(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.page) params.set('page', String(args.page));
    if (args.where) params.set('where', args.where as string);
    if (args.searchTerm) params.set('searchTerm', args.searchTerm as string);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.fetchJson(`${this.baseUrl}/Contacts${qs}`);
  }

  private async getContact(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fetchJson(`${this.baseUrl}/Contacts/${encodeURIComponent(args.contact_id as string)}`);
  }

  private async createContact(args: Record<string, unknown>): Promise<ToolResult> {
    const contact: Record<string, unknown> = { Name: args.name };
    if (args.emailAddress) contact.EmailAddress = args.emailAddress;
    if (args.firstName) contact.FirstName = args.firstName;
    if (args.lastName) contact.LastName = args.lastName;
    if (args.isCustomer !== undefined) contact.IsCustomer = args.isCustomer;
    if (args.isSupplier !== undefined) contact.IsSupplier = args.isSupplier;
    if (args.phoneNumber) {
      contact.Phones = [{ PhoneType: 'DEFAULT', PhoneNumber: args.phoneNumber }];
    }
    return this.fetchJson(`${this.baseUrl}/Contacts`, {
      method: 'POST',
      body: JSON.stringify({ Contacts: [contact] }),
    });
  }

  private async listAccounts(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    // If both type and where are provided, where takes precedence
    if (args.where) {
      params.set('where', args.where as string);
    } else if (args.type) {
      params.set('where', `Type=="${encodeURIComponent(args.type as string)}"`);
    }
    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.fetchJson(`${this.baseUrl}/Accounts${qs}`);
  }

  private async listPayments(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.status) params.set('where', `Status=="${encodeURIComponent(args.status as string)}"`);
    if (args.where) params.set('where', args.where as string);
    if (args.page) params.set('page', String(args.page));
    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.fetchJson(`${this.baseUrl}/Payments${qs}`);
  }

  private async createPayment(args: Record<string, unknown>): Promise<ToolResult> {
    const body = {
      Payments: [{
        Invoice: { InvoiceID: args.invoice_id },
        Account: { AccountID: args.account_id },
        Amount: args.amount,
        Date: args.date,
        ...(args.reference ? { Reference: args.reference } : {}),
      }],
    };
    return this.fetchJson(`${this.baseUrl}/Payments`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  private async listCreditNotes(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.status) params.set('where', `Status=="${encodeURIComponent(args.status as string)}"`);
    if (args.where) params.set('where', args.where as string);
    if (args.page) params.set('page', String(args.page));
    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.fetchJson(`${this.baseUrl}/CreditNotes${qs}`);
  }

  private async getCreditNote(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fetchJson(`${this.baseUrl}/CreditNotes/${encodeURIComponent(args.credit_note_id as string)}`);
  }

  private async listBankTransactions(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    const whereClauses: string[] = [];
    if (args.bankAccountId) whereClauses.push(`BankAccount.AccountID=GUID("${encodeURIComponent(args.bankAccountId as string)}")`);
    if (args.type) whereClauses.push(`Type=="${encodeURIComponent(args.type as string)}"`);
    if (args.where) whereClauses.push(args.where as string);
    if (whereClauses.length > 0) params.set('where', whereClauses.join('&&'));
    if (args.page) params.set('page', String(args.page));
    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.fetchJson(`${this.baseUrl}/BankTransactions${qs}`);
  }

  private async getBalanceSheet(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.date) params.set('date', args.date as string);
    if (args.periods) params.set('periods', String(args.periods));
    if (args.timeframe) params.set('timeframe', args.timeframe as string);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.fetchJson(`${this.baseUrl}/Reports/BalanceSheet${qs}`);
  }
}

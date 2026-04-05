/**
 * QuickBooks Online MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/intuit/quickbooks-online-mcp-server — transport: stdio, auth: OAuth2 refresh token
// Published by intuit (Intuit's official GitHub org). Repo has only 2 commits as of 2026-03-28 — very new, low activity.
// Vendor MCP covers: ~55 tools (Create/Delete/Get/Search/Update for Account, BillPayment, Bill, Customer, Employee,
//   Estimate, Invoice, Item, JournalEntry, Purchase, Vendor — 11 entities × 5 ops). Does NOT meet the 6-month
//   activity threshold (only 2 commits total); treat as use-rest-api until MCP is proven maintained.
// Our adapter covers: 20 tools (core accounting operations).
// Recommendation: use-rest-api — MCP server is official but has only 2 total commits with no activity history;
//   does not meet the "actively maintained (commits within 6 months)" criterion. Reassess if MCP gains activity.
//
// Base URL: https://quickbooks.api.intuit.com/v3/company/{realmId}
//   Sandbox: https://sandbox-quickbooks.api.intuit.com/v3/company/{realmId}
// Auth: OAuth2 Bearer token (access_token from Intuit OAuth2 flow)
// Docs: https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/account
//       https://developer.intuit.com/app/developer/qbo/docs/learn/explore-the-quickbooks-online-api
// Rate limits: 500 req/min per OAuth2 token (throttled at Intuit gateway)

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface QuickBooksConfig {
  /** OAuth2 access token obtained from the Intuit OAuth2 flow. */
  accessToken: string;
  /** Company realm ID (visible in the QuickBooks Online URL after login). */
  realmId: string;
  /**
   * Use sandbox endpoint for development and testing.
   * Defaults to false (production).
   */
  sandbox?: boolean;
}

export class QuickBooksMCPServer extends MCPAdapterBase {
  private readonly accessToken: string;
  private readonly baseUrl: string;

  constructor(config: QuickBooksConfig) {
    super();
    this.accessToken = config.accessToken;
    const host = config.sandbox
      ? 'sandbox-quickbooks.api.intuit.com'
      : 'quickbooks.api.intuit.com';
    this.baseUrl = `https://${host}/v3/company/${encodeURIComponent(config.realmId)}`;
  }

  static catalog() {
    return {
      name: 'quickbooks',
      displayName: 'QuickBooks Online',
      version: '1.0.0',
      category: 'finance' as const,
      keywords: [
        'quickbooks', 'intuit', 'accounting', 'invoice', 'bill', 'payment',
        'vendor', 'customer', 'estimate', 'expense', 'purchase', 'report',
        'profit', 'loss', 'balance sheet', 'cash flow', 'account', 'journal',
        'tax', 'payroll',
      ],
      toolNames: [
        'query',
        'get_invoice',
        'create_invoice',
        'update_invoice',
        'get_customer',
        'list_customers',
        'create_customer',
        'get_vendor',
        'list_vendors',
        'get_bill',
        'create_bill',
        'get_payment',
        'list_payments',
        'create_payment',
        'get_account',
        'list_accounts',
        'get_estimate',
        'create_estimate',
        'get_report',
        'get_company_info',
      ],
      description:
        'QuickBooks Online accounting: manage invoices, bills, payments, customers, vendors, accounts, and estimates. Run SQL-like queries against any entity and generate profit/loss, balance sheet, and cash flow reports.',
      author: 'protectnil' as const,
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'query',
        description:
          'Execute a QuickBooks SQL-like query (QBO Query Language) against any entity type — Invoice, Customer, Vendor, Bill, Payment, Account, etc.',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description:
                'QuickBooks query string (e.g. SELECT * FROM Invoice WHERE TotalAmt > 100 ORDER BY TxnDate DESC MAXRESULTS 50).',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'get_invoice',
        description:
          'Retrieve a single QuickBooks Online invoice by its ID, including line items, customer, amounts, and status.',
        inputSchema: {
          type: 'object',
          properties: {
            invoice_id: {
              type: 'string',
              description: 'QuickBooks invoice entity ID.',
            },
          },
          required: ['invoice_id'],
        },
      },
      {
        name: 'create_invoice',
        description:
          'Create a new invoice in QuickBooks Online for a customer with line items, optional due date, and private notes.',
        inputSchema: {
          type: 'object',
          properties: {
            customer_ref_id: {
              type: 'string',
              description: 'QuickBooks customer entity ID (CustomerRef.value).',
            },
            line_items: {
              type: 'array',
              items: { type: 'object' },
              description:
                'Array of line item objects with Amount, DetailType, and SalesItemLineDetail (or DescriptionLineDetail).',
            },
            due_date: {
              type: 'string',
              description: 'Invoice due date in YYYY-MM-DD format.',
            },
            private_note: {
              type: 'string',
              description: 'Private memo visible only inside QuickBooks.',
            },
            email_status: {
              type: 'string',
              description: 'Email status: NeedToSend, EmailSent (default: NeedToSend).',
            },
          },
          required: ['customer_ref_id', 'line_items'],
        },
      },
      {
        name: 'update_invoice',
        description:
          'Update an existing QuickBooks invoice (sparse update — only supply fields to change). Requires the current SyncToken from get_invoice.',
        inputSchema: {
          type: 'object',
          properties: {
            invoice_id: {
              type: 'string',
              description: 'QuickBooks invoice entity ID.',
            },
            sync_token: {
              type: 'string',
              description: 'Current SyncToken from the invoice record (required for optimistic concurrency).',
            },
            fields: {
              type: 'object',
              description: 'Key-value pairs of fields to update (e.g. { "DueDate": "2026-04-01", "PrivateNote": "Revised" }).',
            },
          },
          required: ['invoice_id', 'sync_token', 'fields'],
        },
      },
      {
        name: 'get_customer',
        description:
          'Retrieve a single QuickBooks customer by ID, including contact info, balance, and payment terms.',
        inputSchema: {
          type: 'object',
          properties: {
            customer_id: {
              type: 'string',
              description: 'QuickBooks customer entity ID.',
            },
          },
          required: ['customer_id'],
        },
      },
      {
        name: 'list_customers',
        description:
          'List QuickBooks Online customers with optional pagination and active/inactive filter.',
        inputSchema: {
          type: 'object',
          properties: {
            max_results: {
              type: 'number',
              description: 'Maximum number of customers to return (default: 100, max: 1000).',
            },
            start_position: {
              type: 'number',
              description: 'Starting position for pagination (1-based, default: 1).',
            },
            active: {
              type: 'boolean',
              description: 'Filter by active status: true for active, false for inactive.',
            },
          },
        },
      },
      {
        name: 'create_customer',
        description:
          'Create a new customer record in QuickBooks Online.',
        inputSchema: {
          type: 'object',
          properties: {
            display_name: {
              type: 'string',
              description: 'Display name for the customer (must be unique across all customers and vendors).',
            },
            company_name: {
              type: 'string',
              description: 'Company or business name.',
            },
            primary_email: {
              type: 'string',
              description: 'Primary email address.',
            },
            primary_phone: {
              type: 'string',
              description: 'Primary phone number.',
            },
            billing_address: {
              type: 'object',
              description:
                'Billing address object with Line1, City, CountrySubDivisionCode, PostalCode, Country fields.',
            },
          },
          required: ['display_name'],
        },
      },
      {
        name: 'get_vendor',
        description:
          'Retrieve a single QuickBooks vendor by ID, including contact info, balance, and terms.',
        inputSchema: {
          type: 'object',
          properties: {
            vendor_id: {
              type: 'string',
              description: 'QuickBooks vendor entity ID.',
            },
          },
          required: ['vendor_id'],
        },
      },
      {
        name: 'list_vendors',
        description:
          'List QuickBooks Online vendors with optional pagination.',
        inputSchema: {
          type: 'object',
          properties: {
            max_results: {
              type: 'number',
              description: 'Maximum number of vendors to return (default: 100).',
            },
            start_position: {
              type: 'number',
              description: 'Starting position for pagination (1-based, default: 1).',
            },
          },
        },
      },
      {
        name: 'get_bill',
        description:
          'Retrieve a single QuickBooks bill (accounts payable) by ID, including vendor, line items, and due date.',
        inputSchema: {
          type: 'object',
          properties: {
            bill_id: {
              type: 'string',
              description: 'QuickBooks bill entity ID.',
            },
          },
          required: ['bill_id'],
        },
      },
      {
        name: 'create_bill',
        description:
          'Create a new accounts-payable bill in QuickBooks Online for a vendor.',
        inputSchema: {
          type: 'object',
          properties: {
            vendor_ref_id: {
              type: 'string',
              description: 'QuickBooks vendor entity ID (VendorRef.value).',
            },
            line_items: {
              type: 'array',
              items: { type: 'object' },
              description: 'Array of bill line item objects with Amount, DetailType, and AccountBasedExpenseLineDetail.',
            },
            due_date: {
              type: 'string',
              description: 'Bill due date in YYYY-MM-DD format.',
            },
            txn_date: {
              type: 'string',
              description: 'Transaction date in YYYY-MM-DD format (default: today).',
            },
          },
          required: ['vendor_ref_id', 'line_items'],
        },
      },
      {
        name: 'get_payment',
        description:
          'Retrieve a single QuickBooks customer payment by ID.',
        inputSchema: {
          type: 'object',
          properties: {
            payment_id: {
              type: 'string',
              description: 'QuickBooks payment entity ID.',
            },
          },
          required: ['payment_id'],
        },
      },
      {
        name: 'list_payments',
        description:
          'List QuickBooks customer payments with optional pagination.',
        inputSchema: {
          type: 'object',
          properties: {
            max_results: {
              type: 'number',
              description: 'Maximum number of payments to return (default: 100).',
            },
            start_position: {
              type: 'number',
              description: 'Starting position for pagination (1-based, default: 1).',
            },
          },
        },
      },
      {
        name: 'create_payment',
        description:
          'Record a customer payment in QuickBooks Online, optionally linked to specific invoices.',
        inputSchema: {
          type: 'object',
          properties: {
            customer_ref_id: {
              type: 'string',
              description: 'QuickBooks customer entity ID.',
            },
            total_amount: {
              type: 'number',
              description: 'Total payment amount.',
            },
            txn_date: {
              type: 'string',
              description: 'Transaction date in YYYY-MM-DD format (default: today).',
            },
            payment_method_ref_id: {
              type: 'string',
              description: 'Payment method entity ID (optional).',
            },
            line_items: {
              type: 'array',
              items: { type: 'object' },
              description:
                'Optional array of LinkedTxn objects to apply the payment to specific invoices (each with TxnId and TxnType="Invoice").',
            },
          },
          required: ['customer_ref_id', 'total_amount'],
        },
      },
      {
        name: 'get_account',
        description:
          'Retrieve a single QuickBooks chart-of-accounts entry by ID.',
        inputSchema: {
          type: 'object',
          properties: {
            account_id: {
              type: 'string',
              description: 'QuickBooks account entity ID.',
            },
          },
          required: ['account_id'],
        },
      },
      {
        name: 'list_accounts',
        description:
          'List chart-of-accounts entries in QuickBooks Online, optionally filtered by account type.',
        inputSchema: {
          type: 'object',
          properties: {
            account_type: {
              type: 'string',
              description:
                'Filter by account type: Bank, AccountsReceivable, AccountsPayable, CreditCard, Expense, Income, OtherCurrentAsset, FixedAsset, Equity.',
            },
            max_results: {
              type: 'number',
              description: 'Maximum number of accounts to return (default: 100).',
            },
          },
        },
      },
      {
        name: 'get_estimate',
        description:
          'Retrieve a single QuickBooks estimate (quote) by ID.',
        inputSchema: {
          type: 'object',
          properties: {
            estimate_id: {
              type: 'string',
              description: 'QuickBooks estimate entity ID.',
            },
          },
          required: ['estimate_id'],
        },
      },
      {
        name: 'create_estimate',
        description:
          'Create a new customer estimate (quote) in QuickBooks Online.',
        inputSchema: {
          type: 'object',
          properties: {
            customer_ref_id: {
              type: 'string',
              description: 'QuickBooks customer entity ID.',
            },
            line_items: {
              type: 'array',
              items: { type: 'object' },
              description: 'Array of line item objects with Amount, DetailType, and SalesItemLineDetail.',
            },
            expiration_date: {
              type: 'string',
              description: 'Estimate expiration date in YYYY-MM-DD format.',
            },
            private_note: {
              type: 'string',
              description: 'Private memo visible only inside QuickBooks.',
            },
          },
          required: ['customer_ref_id', 'line_items'],
        },
      },
      {
        name: 'get_report',
        description:
          'Generate a financial report from QuickBooks Online — ProfitAndLoss, BalanceSheet, CashFlow, GeneralLedger, or TrialBalance.',
        inputSchema: {
          type: 'object',
          properties: {
            report_type: {
              type: 'string',
              description:
                'Report type: ProfitAndLoss, ProfitAndLossDetail, BalanceSheet, BalanceSheetDetail, CashFlow, GeneralLedger, TrialBalance, AgedReceivables, AgedPayables.',
            },
            start_date: {
              type: 'string',
              description: 'Report start date in YYYY-MM-DD format.',
            },
            end_date: {
              type: 'string',
              description: 'Report end date in YYYY-MM-DD format.',
            },
            accounting_method: {
              type: 'string',
              description: 'Accounting method: Cash or Accrual (default: Accrual).',
            },
          },
          required: ['report_type'],
        },
      },
      {
        name: 'get_company_info',
        description:
          'Retrieve company information for the connected QuickBooks Online account — name, address, fiscal year start, and contact details.',
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
        case 'query':
          return await this.executeQuery(args);
        case 'get_invoice':
          return await this.getEntity('invoice', args.invoice_id as string);
        case 'create_invoice':
          return await this.createInvoice(args);
        case 'update_invoice':
          return await this.updateInvoice(args);
        case 'get_customer':
          return await this.getEntity('customer', args.customer_id as string);
        case 'list_customers':
          return await this.listEntityQuery('Customer', args);
        case 'create_customer':
          return await this.createCustomer(args);
        case 'get_vendor':
          return await this.getEntity('vendor', args.vendor_id as string);
        case 'list_vendors':
          return await this.listEntityQuery('Vendor', args);
        case 'get_bill':
          return await this.getEntity('bill', args.bill_id as string);
        case 'create_bill':
          return await this.createBill(args);
        case 'get_payment':
          return await this.getEntity('payment', args.payment_id as string);
        case 'list_payments':
          return await this.listEntityQuery('Payment', args);
        case 'create_payment':
          return await this.createPayment(args);
        case 'get_account':
          return await this.getEntity('account', args.account_id as string);
        case 'list_accounts':
          return await this.listAccounts(args);
        case 'get_estimate':
          return await this.getEntity('estimate', args.estimate_id as string);
        case 'create_estimate':
          return await this.createEstimate(args);
        case 'get_report':
          return await this.getReport(args);
        case 'get_company_info':
          return await this.getCompanyInfo();
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

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private get authHeaders(): Record<string, string> {
    return {
      'Authorization': `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
  }

  private truncatedResult(data: unknown): ToolResult {
    const text = JSON.stringify(data, null, 2);
    const truncated = text.length > 10_000
      ? text.slice(0, 10_000) + `\n... [truncated, ${text.length} total chars]`
      : text;
    return { content: [{ type: 'text', text: truncated }], isError: false };
  }

  private async fetchJson(url: string, init?: RequestInit): Promise<ToolResult> {
    const response = await this.fetchWithRetry(url, { ...init, headers: { ...this.authHeaders, ...(init?.headers as Record<string, string> | undefined) } });
    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `QuickBooks API error: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }
    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new Error(`QuickBooks returned non-JSON response (HTTP ${response.status})`);
    }
    return this.truncatedResult(data);
  }

  private async executeQuery(args: Record<string, unknown>): Promise<ToolResult> {
    const q = args.query as string;
    if (!q) {
      return { content: [{ type: 'text', text: 'query is required' }], isError: true };
    }
    const params = new URLSearchParams({ query: q });
    return this.fetchJson(`${this.baseUrl}/query?${params.toString()}&minorversion=65`);
  }

  private async getEntity(entity: string, id: string): Promise<ToolResult> {
    if (!id) {
      return { content: [{ type: 'text', text: `${entity}_id is required` }], isError: true };
    }
    return this.fetchJson(`${this.baseUrl}/${entity}/${encodeURIComponent(id)}?minorversion=65`);
  }

  private async listEntityQuery(entityType: string, args: Record<string, unknown>): Promise<ToolResult> {
    const maxResults = (args.max_results as number) ?? 100;
    const startPos = (args.start_position as number) ?? 1;
    let where = '';
    if (args.active !== undefined) {
      where = ` WHERE Active = ${args.active ? 'true' : 'false'}`;
    }
    const q = `SELECT * FROM ${entityType}${where} STARTPOSITION ${startPos} MAXRESULTS ${maxResults}`;
    const params = new URLSearchParams({ query: q });
    return this.fetchJson(`${this.baseUrl}/query?${params.toString()}&minorversion=65`);
  }

  private async createInvoice(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {
      CustomerRef: { value: args.customer_ref_id },
      Line: args.line_items,
    };
    if (args.due_date) body.DueDate = args.due_date;
    if (args.private_note) body.PrivateNote = args.private_note;
    if (args.email_status) body.EmailStatus = args.email_status;
    return this.fetchJson(`${this.baseUrl}/invoice?minorversion=65`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  private async updateInvoice(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.invoice_id as string;
    const syncToken = args.sync_token as string;
    const fields = args.fields as Record<string, unknown>;
    if (!id || !syncToken || !fields) {
      return { content: [{ type: 'text', text: 'invoice_id, sync_token, and fields are required' }], isError: true };
    }
    const body = { Id: id, SyncToken: syncToken, sparse: true, ...fields };
    return this.fetchJson(`${this.baseUrl}/invoice?minorversion=65`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  private async createCustomer(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {
      DisplayName: args.display_name,
    };
    if (args.company_name) body.CompanyName = args.company_name;
    if (args.primary_email) body.PrimaryEmailAddr = { Address: args.primary_email };
    if (args.primary_phone) body.PrimaryPhone = { FreeFormNumber: args.primary_phone };
    if (args.billing_address) body.BillAddr = args.billing_address;
    return this.fetchJson(`${this.baseUrl}/customer?minorversion=65`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  private async createBill(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {
      VendorRef: { value: args.vendor_ref_id },
      Line: args.line_items,
    };
    if (args.due_date) body.DueDate = args.due_date;
    if (args.txn_date) body.TxnDate = args.txn_date;
    return this.fetchJson(`${this.baseUrl}/bill?minorversion=65`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  private async createPayment(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {
      CustomerRef: { value: args.customer_ref_id },
      TotalAmt: args.total_amount,
    };
    if (args.txn_date) body.TxnDate = args.txn_date;
    if (args.payment_method_ref_id) body.PaymentMethodRef = { value: args.payment_method_ref_id };
    if (args.line_items) body.Line = args.line_items;
    return this.fetchJson(`${this.baseUrl}/payment?minorversion=65`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  private async listAccounts(args: Record<string, unknown>): Promise<ToolResult> {
    const maxResults = (args.max_results as number) ?? 100;
    let where = '';
    if (args.account_type) {
      where = ` WHERE AccountType = '${encodeURIComponent(args.account_type as string)}'`;
    }
    const q = `SELECT * FROM Account${where} MAXRESULTS ${maxResults}`;
    const params = new URLSearchParams({ query: q });
    return this.fetchJson(`${this.baseUrl}/query?${params.toString()}&minorversion=65`);
  }

  private async createEstimate(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {
      CustomerRef: { value: args.customer_ref_id },
      Line: args.line_items,
    };
    if (args.expiration_date) body.ExpirationDate = args.expiration_date;
    if (args.private_note) body.PrivateNote = args.private_note;
    return this.fetchJson(`${this.baseUrl}/estimate?minorversion=65`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  private async getReport(args: Record<string, unknown>): Promise<ToolResult> {
    const reportType = args.report_type as string;
    if (!reportType) {
      return { content: [{ type: 'text', text: 'report_type is required' }], isError: true };
    }
    const params = new URLSearchParams({ minorversion: '65' });
    if (args.start_date) params.set('start_date', args.start_date as string);
    if (args.end_date) params.set('end_date', args.end_date as string);
    if (args.accounting_method) params.set('accounting_method', args.accounting_method as string);
    return this.fetchJson(`${this.baseUrl}/reports/${encodeURIComponent(reportType)}?${params.toString()}`);
  }

  private async getCompanyInfo(): Promise<ToolResult> {
    // CompanyInfo is a singleton accessible via the query endpoint
    const params = new URLSearchParams({ query: `SELECT * FROM CompanyInfo`, minorversion: '65' });
    return this.fetchJson(`${this.baseUrl}/query?${params.toString()}`);
  }
}

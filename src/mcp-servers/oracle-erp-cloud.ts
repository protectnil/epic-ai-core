/**
 * Oracle ERP Cloud MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// The oracle/mcp repo (github.com/oracle/mcp) covers Oracle Database and OCI services only —
// not FSCM (Fusion Financials/Procurement/SCM) REST APIs. No official FSCM MCP server found.
//
// Base URL: https://{hostname}.fa.{dc}.oraclecloud.com/fscmRestApi/resources/11.13.18.05
//   The hostname and datacenter (e.g. us2, uk1, eu1) are tenant-specific.
//   Configure via baseUrl constructor option. Set to full path through version segment.
//   NOTE: list_employees / get_employee use Oracle HCM Cloud (hcmRestApi), not fscmRestApi.
//   For HCM tools, configure baseUrl to https://{hostname}.fa.{dc}.oraclecloud.com/hcmRestApi/resources/11.13.18.05
// Auth: Basic Authentication (Base64 encoded username:password) or OAuth2 access token
//   This adapter uses Basic Auth. For OAuth2, pre-exchange token and pass as accessToken.
// Docs: https://docs.oracle.com/en/cloud/saas/financials/25b/farfa/ (Financials/AP/AR/GL)
//       https://docs.oracle.com/en/cloud/saas/procurement/25c/fapra/ (Procurement/Suppliers/POs)
//       https://docs.oracle.com/en/cloud/saas/human-resources/farws/ (HCM/Workers)
// Rate limits: Not publicly documented; governed by Oracle service limits per tenant
// Recommendation: use-rest-api — no official FSCM MCP server exists.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface OracleERPCloudConfig {
  username?: string;       // Basic auth username
  password?: string;       // Basic auth password
  accessToken?: string;    // OAuth2 access token (alternative to username/password)
  baseUrl: string;         // Required: full base URL e.g. https://acme.fa.us2.oraclecloud.com/fscmRestApi/resources/11.13.18.05
}

export class OracleERPCloudMCPServer extends MCPAdapterBase {
  private readonly baseUrl: string;
  private readonly authHeader: string;

  constructor(config: OracleERPCloudConfig) {
    super();
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    if (config.accessToken) {
      this.authHeader = `Bearer ${config.accessToken}`;
    } else if (config.username && config.password) {
      this.authHeader = `Basic ${btoa(`${config.username}:${config.password}`)}`;
    } else {
      throw new Error('OracleERPCloudConfig requires either accessToken or username+password');
    }
  }

  static catalog() {
    return {
      name: 'oracle-erp-cloud',
      displayName: 'Oracle ERP Cloud',
      version: '1.0.0',
      category: 'finance',
      keywords: [
        'oracle', 'erp', 'oracle erp cloud', 'fusion financials', 'fscm',
        'invoice', 'payable', 'receivable', 'ledger', 'journal', 'purchase order',
        'supplier', 'general ledger', 'accounting', 'procurement', 'financial reporting',
      ],
      toolNames: [
        'list_invoices', 'get_invoice', 'create_invoice',
        'list_suppliers', 'get_supplier', 'search_suppliers',
        'list_purchase_orders', 'get_purchase_order',
        'list_journal_batches', 'get_journal_batch', 'create_journal_batch',
        'list_ledgers', 'get_ledger',
        'list_payables', 'list_receivables',
        'list_employees', 'get_employee',
      ],
      description: 'Oracle ERP Cloud (Fusion Financials/FSCM): manage invoices, suppliers, purchase orders, journal entries, ledgers, payables, receivables, and employee records.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_invoices',
        description: 'List payable invoices with optional filters for supplier, status, date range, and business unit',
        inputSchema: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              description: 'Filter by status: UNPAID, PAID, CANCELLED, HOLDS (default: all)',
            },
            supplier_name: {
              type: 'string',
              description: 'Filter by supplier name (partial match)',
            },
            invoice_date_from: {
              type: 'string',
              description: 'Start date filter in YYYY-MM-DD format',
            },
            invoice_date_to: {
              type: 'string',
              description: 'End date filter in YYYY-MM-DD format',
            },
            business_unit: {
              type: 'string',
              description: 'Business unit name to scope results',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of invoices to return (default: 50)',
            },
            offset: {
              type: 'number',
              description: 'Pagination offset (default: 0)',
            },
          },
        },
      },
      {
        name: 'get_invoice',
        description: 'Get full details for a specific payable invoice by invoice ID including line items and payment info',
        inputSchema: {
          type: 'object',
          properties: {
            invoice_id: {
              type: 'number',
              description: 'Oracle ERP invoice identifier',
            },
          },
          required: ['invoice_id'],
        },
      },
      {
        name: 'create_invoice',
        description: 'Create a new payable invoice in Oracle ERP Cloud for a supplier with line items',
        inputSchema: {
          type: 'object',
          properties: {
            supplier_id: {
              type: 'number',
              description: 'Supplier (vendor) identifier',
            },
            invoice_number: {
              type: 'string',
              description: 'Vendor invoice number',
            },
            invoice_date: {
              type: 'string',
              description: 'Invoice date in YYYY-MM-DD format',
            },
            invoice_amount: {
              type: 'number',
              description: 'Total invoice amount in the specified currency',
            },
            currency_code: {
              type: 'string',
              description: 'ISO currency code (e.g. USD, EUR, GBP)',
            },
            business_unit: {
              type: 'string',
              description: 'Business unit name for the invoice',
            },
            description: {
              type: 'string',
              description: 'Invoice description or reference',
            },
          },
          required: ['supplier_id', 'invoice_number', 'invoice_date', 'invoice_amount', 'currency_code'],
        },
      },
      {
        name: 'list_suppliers',
        description: 'List suppliers (vendors) in Oracle ERP Cloud with optional name filter and status',
        inputSchema: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              description: 'Filter by status: Active, Inactive (default: Active)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of suppliers to return (default: 50)',
            },
            offset: {
              type: 'number',
              description: 'Pagination offset (default: 0)',
            },
          },
        },
      },
      {
        name: 'get_supplier',
        description: 'Get detailed profile for a specific supplier including contact, banking, and payment terms',
        inputSchema: {
          type: 'object',
          properties: {
            supplier_id: {
              type: 'number',
              description: 'Oracle ERP supplier identifier',
            },
          },
          required: ['supplier_id'],
        },
      },
      {
        name: 'search_suppliers',
        description: 'Search for suppliers by name, tax ID, or email address',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search term — supplier name, tax registration number, or email',
            },
            limit: {
              type: 'number',
              description: 'Maximum results (default: 25)',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'list_purchase_orders',
        description: 'List purchase orders with filters for status, supplier, date range, and business unit',
        inputSchema: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              description: 'Filter by status: OPEN, CLOSED, CANCELLED, FINALLY_CLOSED (default: OPEN)',
            },
            supplier_id: {
              type: 'number',
              description: 'Filter by supplier ID',
            },
            creation_date_from: {
              type: 'string',
              description: 'Start date filter in YYYY-MM-DD format',
            },
            creation_date_to: {
              type: 'string',
              description: 'End date filter in YYYY-MM-DD format',
            },
            limit: {
              type: 'number',
              description: 'Maximum results (default: 50)',
            },
            offset: {
              type: 'number',
              description: 'Pagination offset (default: 0)',
            },
          },
        },
      },
      {
        name: 'get_purchase_order',
        description: 'Get full details for a specific purchase order including line items, schedules, and distributions',
        inputSchema: {
          type: 'object',
          properties: {
            po_header_id: {
              type: 'number',
              description: 'Purchase order header identifier',
            },
          },
          required: ['po_header_id'],
        },
      },
      {
        name: 'list_journal_batches',
        description: 'List general ledger journal batches with optional ledger, period, and status filters (Oracle GL uses journalBatches resource)',
        inputSchema: {
          type: 'object',
          properties: {
            ledger_id: {
              type: 'number',
              description: 'Ledger identifier to scope journal batches',
            },
            period_name: {
              type: 'string',
              description: 'Accounting period name (e.g. "Feb-26", "Mar-26")',
            },
            status: {
              type: 'string',
              description: 'Filter by batch status: Draft, Posted, Unposted (default: all)',
            },
            limit: {
              type: 'number',
              description: 'Maximum results (default: 50)',
            },
            offset: {
              type: 'number',
              description: 'Pagination offset (default: 0)',
            },
          },
        },
      },
      {
        name: 'get_journal_batch',
        description: 'Get full details for a specific general ledger journal batch including all headers and lines',
        inputSchema: {
          type: 'object',
          properties: {
            batch_id: {
              type: 'number',
              description: 'Journal batch identifier (JeBatchId)',
            },
          },
          required: ['batch_id'],
        },
      },
      {
        name: 'create_journal_batch',
        description: 'Create a new journal batch in the general ledger for a specified ledger and accounting period',
        inputSchema: {
          type: 'object',
          properties: {
            ledger_id: {
              type: 'number',
              description: 'Target ledger identifier',
            },
            period_name: {
              type: 'string',
              description: 'Accounting period (e.g. "Mar-26")',
            },
            currency_code: {
              type: 'string',
              description: 'ISO currency code (e.g. USD)',
            },
            batch_name: {
              type: 'string',
              description: 'Journal batch name or reference',
            },
            description: {
              type: 'string',
              description: 'Journal batch description',
            },
          },
          required: ['ledger_id', 'period_name', 'currency_code', 'batch_name'],
        },
      },
      {
        name: 'list_ledgers',
        description: 'List general ledgers available to the authenticated user in Oracle ERP Cloud',
        inputSchema: {
          type: 'object',
          properties: {
            ledger_type: {
              type: 'string',
              description: 'Filter by ledger type: PRIMARY, SECONDARY, REPORTING (default: all)',
            },
            currency_code: {
              type: 'string',
              description: 'Filter by ledger currency (e.g. USD, EUR)',
            },
            limit: {
              type: 'number',
              description: 'Maximum results (default: 50)',
            },
          },
        },
      },
      {
        name: 'get_ledger',
        description: 'Get configuration details for a specific general ledger including accounting calendar and chart of accounts',
        inputSchema: {
          type: 'object',
          properties: {
            ledger_id: {
              type: 'number',
              description: 'Ledger identifier',
            },
          },
          required: ['ledger_id'],
        },
      },
      {
        name: 'list_payables',
        description: 'List accounts payable transactions including invoices and payments with balance summaries',
        inputSchema: {
          type: 'object',
          properties: {
            supplier_id: {
              type: 'number',
              description: 'Filter by supplier identifier',
            },
            due_date_from: {
              type: 'string',
              description: 'Due date start filter in YYYY-MM-DD format',
            },
            due_date_to: {
              type: 'string',
              description: 'Due date end filter in YYYY-MM-DD format',
            },
            limit: {
              type: 'number',
              description: 'Maximum results (default: 50)',
            },
          },
        },
      },
      {
        name: 'list_receivables',
        description: 'List accounts receivable transactions — customer invoices, receipts, and credit memos',
        inputSchema: {
          type: 'object',
          properties: {
            customer_name: {
              type: 'string',
              description: 'Filter by customer name (partial match)',
            },
            status: {
              type: 'string',
              description: 'Filter by status: OPEN, CLOSED, CREDITED (default: OPEN)',
            },
            due_date_from: {
              type: 'string',
              description: 'Due date start filter in YYYY-MM-DD format',
            },
            due_date_to: {
              type: 'string',
              description: 'Due date end filter in YYYY-MM-DD format',
            },
            limit: {
              type: 'number',
              description: 'Maximum results (default: 50)',
            },
          },
        },
      },
      {
        name: 'list_employees',
        description: 'List employees from Oracle HCM Cloud integration with optional department and status filters',
        inputSchema: {
          type: 'object',
          properties: {
            department: {
              type: 'string',
              description: 'Filter by department name',
            },
            status: {
              type: 'string',
              description: 'Filter by employment status: Active, Inactive (default: Active)',
            },
            limit: {
              type: 'number',
              description: 'Maximum results (default: 50)',
            },
            offset: {
              type: 'number',
              description: 'Pagination offset (default: 0)',
            },
          },
        },
      },
      {
        name: 'get_employee',
        description: 'Get details for a specific employee including position, compensation, and assignment information',
        inputSchema: {
          type: 'object',
          properties: {
            employee_id: {
              type: 'number',
              description: 'Oracle ERP employee (person) identifier',
            },
          },
          required: ['employee_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_invoices':
          return this.listInvoices(args);
        case 'get_invoice':
          return this.getInvoice(args);
        case 'create_invoice':
          return this.createInvoice(args);
        case 'list_suppliers':
          return this.listSuppliers(args);
        case 'get_supplier':
          return this.getSupplier(args);
        case 'search_suppliers':
          return this.searchSuppliers(args);
        case 'list_purchase_orders':
          return this.listPurchaseOrders(args);
        case 'get_purchase_order':
          return this.getPurchaseOrder(args);
        case 'list_journal_batches':
          return this.listJournalBatches(args);
        case 'get_journal_batch':
          return this.getJournalBatch(args);
        case 'create_journal_batch':
          return this.createJournalBatch(args);
        case 'list_ledgers':
          return this.listLedgers(args);
        case 'get_ledger':
          return this.getLedger(args);
        case 'list_payables':
          return this.listPayables(args);
        case 'list_receivables':
          return this.listReceivables(args);
        case 'list_employees':
          return this.listEmployees(args);
        case 'get_employee':
          return this.getEmployee(args);
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

  private get headers(): Record<string, string> {
    return {
      Authorization: this.authHeader,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  private buildQuery(filters: Record<string, string>): string {
    const parts = Object.entries(filters).map(([k, v]) => `${k}="${v}"`);
    return parts.length > 0 ? parts.join(';') : '';
  }

  private async apiGet(path: string, params: Record<string, string> = {}): Promise<ToolResult> {
    const qs = new URLSearchParams(params).toString();
    const url = `${this.baseUrl}${path}${qs ? '?' + qs : ''}`;
    const response = await this.fetchWithRetry(url, { method: 'GET', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apiPost(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listInvoices(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      limit: String((args.limit as number) ?? 50),
      offset: String((args.offset as number) ?? 0),
    };
    const filters: Record<string, string> = {};
    if (args.status) filters.PaymentStatusCode = args.status as string;
    if (args.supplier_name) filters.SupplierName = args.supplier_name as string;
    if (args.business_unit) filters.BusinessUnit = args.business_unit as string;
    if (args.invoice_date_from) filters.InvoiceDateFrom = args.invoice_date_from as string;
    if (args.invoice_date_to) filters.InvoiceDateTo = args.invoice_date_to as string;
    const q = this.buildQuery(filters);
    if (q) params.q = q;
    return this.apiGet('/invoices', params);
  }

  private async getInvoice(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.invoice_id) return { content: [{ type: 'text', text: 'invoice_id is required' }], isError: true };
    return this.apiGet(`/invoices/${encodeURIComponent(args.invoice_id as string)}`);
  }

  private async createInvoice(args: Record<string, unknown>): Promise<ToolResult> {
    const required = ['supplier_id', 'invoice_number', 'invoice_date', 'invoice_amount', 'currency_code'];
    for (const field of required) {
      if (args[field] === undefined || args[field] === null) {
        return { content: [{ type: 'text', text: `${field} is required` }], isError: true };
      }
    }
    const body: Record<string, unknown> = {
      SupplierId: args.supplier_id,
      InvoiceNumber: args.invoice_number,
      InvoiceDate: args.invoice_date,
      InvoiceAmount: args.invoice_amount,
      InvoiceCurrencyCode: args.currency_code,
    };
    if (args.business_unit) body.BusinessUnit = args.business_unit;
    if (args.description) body.Description = args.description;
    return this.apiPost('/invoices', body);
  }

  private async listSuppliers(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      limit: String((args.limit as number) ?? 50),
      offset: String((args.offset as number) ?? 0),
    };
    const filters: Record<string, string> = {};
    if (args.status) filters.Status = args.status as string;
    const q = this.buildQuery(filters);
    if (q) params.q = q;
    return this.apiGet('/suppliers', params);
  }

  private async getSupplier(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.supplier_id) return { content: [{ type: 'text', text: 'supplier_id is required' }], isError: true };
    return this.apiGet(`/suppliers/${encodeURIComponent(args.supplier_id as string)}`);
  }

  private async searchSuppliers(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.query) return { content: [{ type: 'text', text: 'query is required' }], isError: true };
    const params: Record<string, string> = {
      q: `SupplierName LIKE "*${encodeURIComponent(args.query as string)}*"`,
      limit: String((args.limit as number) ?? 25),
    };
    return this.apiGet('/suppliers', params);
  }

  private async listPurchaseOrders(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      limit: String((args.limit as number) ?? 50),
      offset: String((args.offset as number) ?? 0),
    };
    const filters: Record<string, string> = {};
    if (args.status) filters.Status = args.status as string;
    if (args.supplier_id) filters.SupplierId = String(args.supplier_id);
    if (args.creation_date_from) filters.CreationDateFrom = args.creation_date_from as string;
    if (args.creation_date_to) filters.CreationDateTo = args.creation_date_to as string;
    const q = this.buildQuery(filters);
    if (q) params.q = q;
    return this.apiGet('/purchaseOrders', params);
  }

  private async getPurchaseOrder(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.po_header_id) return { content: [{ type: 'text', text: 'po_header_id is required' }], isError: true };
    return this.apiGet(`/purchaseOrders/${encodeURIComponent(args.po_header_id as string)}`);
  }

  private async listJournalBatches(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      limit: String((args.limit as number) ?? 50),
      offset: String((args.offset as number) ?? 0),
    };
    const filters: Record<string, string> = {};
    if (args.ledger_id) filters.LedgerId = String(args.ledger_id);
    if (args.period_name) filters.PeriodName = args.period_name as string;
    if (args.status) filters.Status = args.status as string;
    const q = this.buildQuery(filters);
    if (q) params.q = q;
    return this.apiGet('/journalBatches', params);
  }

  private async getJournalBatch(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.batch_id) return { content: [{ type: 'text', text: 'batch_id is required' }], isError: true };
    return this.apiGet(`/journalBatches/${encodeURIComponent(args.batch_id as string)}`);
  }

  private async createJournalBatch(args: Record<string, unknown>): Promise<ToolResult> {
    const required = ['ledger_id', 'period_name', 'currency_code', 'batch_name'];
    for (const field of required) {
      if (!args[field]) return { content: [{ type: 'text', text: `${field} is required` }], isError: true };
    }
    const body: Record<string, unknown> = {
      LedgerId: args.ledger_id,
      PeriodName: args.period_name,
      CurrencyCode: args.currency_code,
      BatchName: args.batch_name,
    };
    if (args.description) body.Description = args.description;
    return this.apiPost('/journalBatches', body);
  }

  private async listLedgers(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      limit: String((args.limit as number) ?? 50),
    };
    const filters: Record<string, string> = {};
    if (args.ledger_type) filters.LedgerType = args.ledger_type as string;
    if (args.currency_code) filters.CurrencyCode = args.currency_code as string;
    const q = this.buildQuery(filters);
    if (q) params.q = q;
    return this.apiGet('/ledgers', params);
  }

  private async getLedger(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.ledger_id) return { content: [{ type: 'text', text: 'ledger_id is required' }], isError: true };
    return this.apiGet(`/ledgers/${encodeURIComponent(args.ledger_id as string)}`);
  }

  private async listPayables(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      limit: String((args.limit as number) ?? 50),
    };
    const filters: Record<string, string> = {};
    if (args.supplier_id) filters.SupplierId = String(args.supplier_id);
    if (args.due_date_from) filters.DueDateFrom = args.due_date_from as string;
    if (args.due_date_to) filters.DueDateTo = args.due_date_to as string;
    const q = this.buildQuery(filters);
    if (q) params.q = q;
    return this.apiGet('/payablesInvoices', params);
  }

  private async listReceivables(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      limit: String((args.limit as number) ?? 50),
    };
    const filters: Record<string, string> = {};
    if (args.customer_name) filters.CustomerName = args.customer_name as string;
    if (args.status) filters.Status = args.status as string;
    if (args.due_date_from) filters.DueDateFrom = args.due_date_from as string;
    if (args.due_date_to) filters.DueDateTo = args.due_date_to as string;
    const q = this.buildQuery(filters);
    if (q) params.q = q;
    return this.apiGet('/receivablesInvoices', params);
  }

  private async listEmployees(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      limit: String((args.limit as number) ?? 50),
      offset: String((args.offset as number) ?? 0),
    };
    const filters: Record<string, string> = {};
    if (args.department) filters.DepartmentName = args.department as string;
    if (args.status) filters.WorkerStatus = args.status as string;
    const q = this.buildQuery(filters);
    if (q) params.q = q;
    return this.apiGet('/workers', params);
  }

  private async getEmployee(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.employee_id) return { content: [{ type: 'text', text: 'employee_id is required' }], isError: true };
    return this.apiGet(`/workers/${encodeURIComponent(args.employee_id as string)}`);
  }
}

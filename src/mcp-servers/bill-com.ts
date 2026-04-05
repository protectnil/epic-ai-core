/**
 * BILL (Bill.com) MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// No official BILL (Bill.com) MCP server was found on GitHub, npm, or BILL developer docs as of
// 2026-03-28. Community servers found (christian-sidak/billcom — 0 stars, released 2026-03-15,
// community-only classification on PulseMCP) are not official. BILL does not publish an MCP server.
// Recommendation: use-rest-api — Use this REST wrapper for all deployments.
//
// Base URL: https://gateway.bill.com/connect/v3  (production)
//           https://gateway.stage.bill.com/connect/v3  (sandbox)
// Auth: Session-based. POST /login with userName, password, organizationId, devKey to receive a
//       sessionId. Pass sessionId and devKey as headers on all subsequent requests.
//       Sessions expire after 35 minutes of inactivity — this adapter re-authenticates before each call.
// Docs: https://developer.bill.com/docs/home
//       https://developer.bill.com/reference/api-reference-overview
// Rate limits: 18,000 API calls per developer key per hour (confirmed from developer docs)

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface BillComConfig {
  userName: string;
  password: string;
  organizationId: string;
  devKey: string;
  /**
   * Production: https://gateway.bill.com/connect/v3
   * Sandbox:    https://gateway.stage.bill.com/connect/v3
   */
  baseUrl?: string;
}

export class BillComMCPServer extends MCPAdapterBase {
  private readonly userName: string;
  private readonly password: string;
  private readonly organizationId: string;
  private readonly devKey: string;
  private readonly baseUrl: string;
  private sessionId: string | null = null;

  constructor(config: BillComConfig) {
    super();
    this.userName = config.userName;
    this.password = config.password;
    this.organizationId = config.organizationId;
    this.devKey = config.devKey;
    this.baseUrl = config.baseUrl || 'https://gateway.stage.bill.com/connect/v3';
  }

  private async login(): Promise<void> {
    const response = await this.fetchWithRetry(`${this.baseUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userName: this.userName,
        password: this.password,
        organizationId: this.organizationId,
        devKey: this.devKey,
      }),
    });
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      throw new Error(`BILL login failed (HTTP ${response.status}): ${errText}`);
    }
    const data = await response.json() as Record<string, unknown>;
    if (!data.sessionId) {
      throw new Error(`BILL login succeeded but no sessionId in response: ${JSON.stringify(data)}`);
    }
    this.sessionId = data.sessionId as string;
  }

  private async authHeaders(): Promise<Record<string, string>> {
    await this.login();
    return {
      'Content-Type': 'application/json',
      devKey: this.devKey,
      sessionId: this.sessionId as string,
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_vendors',
        description: 'List vendors in the BILL account with pagination and optional filter criteria.',
        inputSchema: {
          type: 'object',
          properties: {
            max: { type: 'number', description: 'Maximum vendors to return (default: 100)' },
            start: { type: 'number', description: 'Starting index for pagination (0-based, default: 0)' },
            filter: {
              type: 'object',
              description: 'Optional filter criteria as key-value pairs, e.g. { "isActive": "1" }',
            },
          },
        },
      },
      {
        name: 'get_vendor',
        description: 'Retrieve a specific vendor by their BILL vendor ID.',
        inputSchema: {
          type: 'object',
          properties: {
            vendorId: { type: 'string', description: 'BILL vendor ID' },
          },
          required: ['vendorId'],
        },
      },
      {
        name: 'create_vendor',
        description: 'Create a new vendor in BILL with name, email, address, and contact information.',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Vendor name (required)' },
            email: { type: 'string', description: 'Vendor email address' },
            address1: { type: 'string', description: 'Street address line 1' },
            address2: { type: 'string', description: 'Street address line 2' },
            addressCity: { type: 'string', description: 'City' },
            addressState: { type: 'string', description: 'State (2-letter code)' },
            addressZip: { type: 'string', description: 'ZIP/postal code' },
            phone: { type: 'string', description: 'Phone number' },
          },
          required: ['name'],
        },
      },
      {
        name: 'update_vendor',
        description: 'Partially update fields on an existing vendor record in BILL by vendor ID using PATCH.',
        inputSchema: {
          type: 'object',
          properties: {
            vendorId: { type: 'string', description: 'BILL vendor ID to update' },
            name: { type: 'string', description: 'Updated vendor name (optional)' },
            email: { type: 'string', description: 'Updated email address (optional)' },
            address1: { type: 'string', description: 'Updated street address (optional)' },
            addressCity: { type: 'string', description: 'Updated city (optional)' },
            addressState: { type: 'string', description: 'Updated state (optional)' },
            addressZip: { type: 'string', description: 'Updated ZIP code (optional)' },
            isActive: { type: 'string', description: 'Set active status: "1" for active, "2" for inactive (optional)' },
          },
          required: ['vendorId'],
        },
      },
      {
        name: 'list_bills',
        description: 'List accounts payable bills in BILL with pagination and optional filter by payment status or vendor.',
        inputSchema: {
          type: 'object',
          properties: {
            max: { type: 'number', description: 'Maximum bills to return (default: 100)' },
            start: { type: 'number', description: 'Starting index for pagination (0-based, default: 0)' },
            filter: {
              type: 'object',
              description: 'Optional filter criteria, e.g. { "paymentStatus": "1" } where 1=open, 2=scheduled, 3=paid, 4=partial, 5=void',
            },
          },
        },
      },
      {
        name: 'get_bill',
        description: 'Retrieve a specific accounts payable bill by its BILL ID including line items and payment status.',
        inputSchema: {
          type: 'object',
          properties: {
            billId: { type: 'string', description: 'BILL bill ID' },
          },
          required: ['billId'],
        },
      },
      {
        name: 'create_bill',
        description: 'Create a new accounts payable bill in BILL from a vendor with invoice date, due date, amount, and optional line items.',
        inputSchema: {
          type: 'object',
          properties: {
            vendorId: { type: 'string', description: 'Vendor ID this bill is from' },
            invoiceDate: { type: 'string', description: 'Invoice date (YYYY-MM-DD)' },
            dueDate: { type: 'string', description: 'Payment due date (YYYY-MM-DD)' },
            amount: { type: 'number', description: 'Total bill amount in dollars' },
            invoiceNumber: { type: 'string', description: 'Vendor invoice number (optional)' },
            description: { type: 'string', description: 'Bill description or memo (optional)' },
            billLineItems: {
              type: 'array',
              description: 'Line items array, each with amount, chartOfAccountId, and description (optional)',
            },
          },
          required: ['vendorId', 'invoiceDate', 'dueDate', 'amount'],
        },
      },
      {
        name: 'update_bill',
        description: 'Partially update fields on an existing bill in BILL using PATCH — change due date, description, or line items before payment.',
        inputSchema: {
          type: 'object',
          properties: {
            billId: { type: 'string', description: 'BILL bill ID to update' },
            dueDate: { type: 'string', description: 'Updated due date (YYYY-MM-DD, optional)' },
            description: { type: 'string', description: 'Updated description (optional)' },
            billLineItems: { type: 'array', description: 'Updated line items array (optional)' },
          },
          required: ['billId'],
        },
      },
      {
        name: 'pay_bill',
        description: 'Pay a single bill by creating a v3 payment using a funding account (bank account or wallet) with specified amount and optional process date.',
        inputSchema: {
          type: 'object',
          properties: {
            billId: { type: 'string', description: 'Bill ID to pay (begins with 00n)' },
            vendorId: { type: 'string', description: 'Vendor ID to pay (begins with 009)' },
            amount: { type: 'number', description: 'Amount to pay in dollars (can be partial)' },
            fundingAccountType: { type: 'string', description: 'Funding account type: BANK_ACCOUNT, CARD_ACCOUNT, or WALLET' },
            fundingAccountId: { type: 'string', description: 'BILL-generated ID of the funding account (not required for WALLET type)' },
            processDate: { type: 'string', description: 'Requested payment processing date (YYYY-MM-DD, optional — defaults to next available date)' },
          },
          required: ['billId', 'amount', 'fundingAccountType'],
        },
      },
      {
        name: 'pay_bills_bulk',
        description: 'Pay multiple bills in a single BILL v3 API request. Each payment specifies vendorId, billId, amount, fundingAccount, and optional processDate.',
        inputSchema: {
          type: 'object',
          properties: {
            payments: {
              type: 'array',
              description: 'Array of payment objects, each with billId, vendorId, amount, fundingAccount {type, id}, and optional processDate',
            },
          },
          required: ['payments'],
        },
      },
      {
        name: 'list_payments',
        description: 'List sent accounts payable payments with pagination and optional filter by status or vendor.',
        inputSchema: {
          type: 'object',
          properties: {
            max: { type: 'number', description: 'Maximum payments to return (default: 100)' },
            start: { type: 'number', description: 'Starting index for pagination (0-based, default: 0)' },
            filter: {
              type: 'object',
              description: 'Optional filter criteria as key-value pairs',
            },
          },
        },
      },
      {
        name: 'get_payment',
        description: 'Retrieve details of a specific accounts payable payment by its BILL payment ID.',
        inputSchema: {
          type: 'object',
          properties: {
            paymentId: { type: 'string', description: 'BILL payment ID' },
          },
          required: ['paymentId'],
        },
      },
      {
        name: 'list_customers',
        description: 'List customers in the BILL account (accounts receivable) with pagination and optional filter.',
        inputSchema: {
          type: 'object',
          properties: {
            max: { type: 'number', description: 'Maximum customers to return (default: 100)' },
            start: { type: 'number', description: 'Starting index for pagination (0-based, default: 0)' },
            filter: {
              type: 'object',
              description: 'Optional filter criteria as key-value pairs, e.g. { "isActive": "1" }',
            },
          },
        },
      },
      {
        name: 'get_customer',
        description: 'Retrieve a specific customer by their BILL customer ID including contact and billing information.',
        inputSchema: {
          type: 'object',
          properties: {
            customerId: { type: 'string', description: 'BILL customer ID' },
          },
          required: ['customerId'],
        },
      },
      {
        name: 'create_customer',
        description: 'Create a new customer record in BILL for accounts receivable invoicing.',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Customer name (required)' },
            email: { type: 'string', description: 'Customer email address' },
            address1: { type: 'string', description: 'Street address line 1' },
            addressCity: { type: 'string', description: 'City' },
            addressState: { type: 'string', description: 'State (2-letter code)' },
            addressZip: { type: 'string', description: 'ZIP/postal code' },
            phone: { type: 'string', description: 'Phone number' },
          },
          required: ['name'],
        },
      },
      {
        name: 'list_invoices',
        description: 'List accounts receivable invoices in BILL with pagination and optional status filter.',
        inputSchema: {
          type: 'object',
          properties: {
            max: { type: 'number', description: 'Maximum invoices to return (default: 100)' },
            start: { type: 'number', description: 'Starting index for pagination (0-based, default: 0)' },
            filter: {
              type: 'object',
              description: 'Optional filter criteria, e.g. { "status": "1" } where 0=draft, 1=sent, 2=partial, 3=paid, 4=void',
            },
          },
        },
      },
      {
        name: 'get_invoice',
        description: 'Retrieve a specific accounts receivable invoice by its BILL invoice ID.',
        inputSchema: {
          type: 'object',
          properties: {
            invoiceId: { type: 'string', description: 'BILL invoice ID' },
          },
          required: ['invoiceId'],
        },
      },
      {
        name: 'create_invoice',
        description: 'Create a new accounts receivable invoice in BILL for a customer with due date, amount, and optional line items.',
        inputSchema: {
          type: 'object',
          properties: {
            customerId: { type: 'string', description: 'Customer ID to invoice' },
            invoiceDate: { type: 'string', description: 'Invoice date (YYYY-MM-DD)' },
            dueDate: { type: 'string', description: 'Payment due date (YYYY-MM-DD)' },
            amount: { type: 'number', description: 'Total invoice amount in dollars' },
            invoiceNumber: { type: 'string', description: 'Invoice number (optional)' },
            description: { type: 'string', description: 'Invoice description or memo (optional)' },
            invoiceLineItems: {
              type: 'array',
              description: 'Line items array, each with quantity, unitPrice, chartOfAccountId, and description (optional)',
            },
          },
          required: ['customerId', 'invoiceDate', 'dueDate', 'amount'],
        },
      },
      {
        name: 'list_chart_of_accounts',
        description: 'List chart of accounts entries in BILL — bank accounts, expense accounts, and income accounts used for bill and invoice coding.',
        inputSchema: {
          type: 'object',
          properties: {
            max: { type: 'number', description: 'Maximum accounts to return (default: 100)' },
            start: { type: 'number', description: 'Starting index for pagination (0-based, default: 0)' },
            filter: {
              type: 'object',
              description: 'Optional filter criteria as key-value pairs',
            },
          },
        },
      },
      {
        name: 'list_departments',
        description: 'List departments configured in the BILL account for expense coding and reporting.',
        inputSchema: {
          type: 'object',
          properties: {
            max: { type: 'number', description: 'Maximum departments to return (default: 100)' },
            start: { type: 'number', description: 'Starting index for pagination (0-based, default: 0)' },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      const headers = await this.authHeaders();
      switch (name) {
        case 'list_vendors': return this.listVendors(args, headers);
        case 'get_vendor': return this.getVendor(args, headers);
        case 'create_vendor': return this.createVendor(args, headers);
        case 'update_vendor': return this.updateVendor(args, headers);
        case 'list_bills': return this.listBills(args, headers);
        case 'get_bill': return this.getBill(args, headers);
        case 'create_bill': return this.createBill(args, headers);
        case 'update_bill': return this.updateBill(args, headers);
        case 'pay_bill': return this.payBill(args, headers);
        case 'pay_bills_bulk': return this.payBillsBulk(args, headers);
        case 'list_payments': return this.listPayments(args, headers);
        case 'get_payment': return this.getPayment(args, headers);
        case 'list_customers': return this.listCustomers(args, headers);
        case 'get_customer': return this.getCustomer(args, headers);
        case 'create_customer': return this.createCustomer(args, headers);
        case 'list_invoices': return this.listInvoices(args, headers);
        case 'get_invoice': return this.getInvoice(args, headers);
        case 'create_invoice': return this.createInvoice(args, headers);
        case 'list_chart_of_accounts': return this.listChartOfAccounts(args, headers);
        case 'list_departments': return this.listDepartments(args, headers);
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

  private async listVendors(args: Record<string, unknown>, headers: Record<string, string>): Promise<ToolResult> {
    const params = new URLSearchParams();
    params.set('max', String(args.max || 100));
    params.set('start', String(args.start || 0));
    if (args.filter && typeof args.filter === 'object') {
      for (const [k, v] of Object.entries(args.filter as Record<string, unknown>)) {
        params.set(k, String(v));
      }
    }
    const response = await this.fetchWithRetry(`${this.baseUrl}/vendors?${params}`, { method: 'GET', headers });
    if (!response.ok) {
      const err = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `Failed to list vendors (HTTP ${response.status}): ${err}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async getVendor(args: Record<string, unknown>, headers: Record<string, string>): Promise<ToolResult> {
    if (!args.vendorId) return { content: [{ type: 'text', text: 'vendorId is required' }], isError: true };
    const response = await this.fetchWithRetry(`${this.baseUrl}/vendors/${encodeURIComponent(String(args.vendorId))}`, { method: 'GET', headers });
    if (!response.ok) {
      const err = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `Failed to get vendor (HTTP ${response.status}): ${err}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async createVendor(args: Record<string, unknown>, headers: Record<string, string>): Promise<ToolResult> {
    if (!args.name) return { content: [{ type: 'text', text: 'name is required' }], isError: true };
    const vendor: Record<string, unknown> = { name: args.name };
    for (const field of ['email', 'address1', 'address2', 'addressCity', 'addressState', 'addressZip', 'phone']) {
      if (args[field]) vendor[field] = args[field];
    }
    const response = await this.fetchWithRetry(`${this.baseUrl}/vendors`, { method: 'POST', headers, body: JSON.stringify(vendor) });
    if (!response.ok) {
      const err = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `Failed to create vendor (HTTP ${response.status}): ${err}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async updateVendor(args: Record<string, unknown>, headers: Record<string, string>): Promise<ToolResult> {
    if (!args.vendorId) return { content: [{ type: 'text', text: 'vendorId is required' }], isError: true };
    const updates: Record<string, unknown> = {};
    for (const field of ['name', 'email', 'address1', 'addressCity', 'addressState', 'addressZip', 'isActive']) {
      if (args[field] !== undefined) updates[field] = args[field];
    }
    const response = await this.fetchWithRetry(`${this.baseUrl}/vendors/${encodeURIComponent(String(args.vendorId))}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(updates),
    });
    if (!response.ok) {
      const err = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `Failed to update vendor (HTTP ${response.status}): ${err}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async listBills(args: Record<string, unknown>, headers: Record<string, string>): Promise<ToolResult> {
    const params = new URLSearchParams();
    params.set('max', String(args.max || 100));
    params.set('start', String(args.start || 0));
    if (args.filter && typeof args.filter === 'object') {
      for (const [k, v] of Object.entries(args.filter as Record<string, unknown>)) {
        params.set(k, String(v));
      }
    }
    const response = await this.fetchWithRetry(`${this.baseUrl}/bills?${params}`, { method: 'GET', headers });
    if (!response.ok) {
      const err = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `Failed to list bills (HTTP ${response.status}): ${err}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async getBill(args: Record<string, unknown>, headers: Record<string, string>): Promise<ToolResult> {
    if (!args.billId) return { content: [{ type: 'text', text: 'billId is required' }], isError: true };
    const response = await this.fetchWithRetry(`${this.baseUrl}/bills/${encodeURIComponent(String(args.billId))}`, { method: 'GET', headers });
    if (!response.ok) {
      const err = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `Failed to get bill (HTTP ${response.status}): ${err}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async createBill(args: Record<string, unknown>, headers: Record<string, string>): Promise<ToolResult> {
    if (!args.vendorId || !args.invoiceDate || !args.dueDate || args.amount === undefined) {
      return { content: [{ type: 'text', text: 'vendorId, invoiceDate, dueDate, and amount are required' }], isError: true };
    }
    const bill: Record<string, unknown> = {
      vendorId: args.vendorId,
      invoiceDate: args.invoiceDate,
      dueDate: args.dueDate,
      amount: args.amount,
    };
    if (args.invoiceNumber) bill.invoiceNumber = args.invoiceNumber;
    if (args.description) bill.description = args.description;
    if (args.billLineItems) bill.billLineItems = args.billLineItems;
    const response = await this.fetchWithRetry(`${this.baseUrl}/bills`, { method: 'POST', headers, body: JSON.stringify(bill) });
    if (!response.ok) {
      const err = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `Failed to create bill (HTTP ${response.status}): ${err}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async updateBill(args: Record<string, unknown>, headers: Record<string, string>): Promise<ToolResult> {
    if (!args.billId) return { content: [{ type: 'text', text: 'billId is required' }], isError: true };
    const updates: Record<string, unknown> = {};
    if (args.dueDate !== undefined) updates.dueDate = args.dueDate;
    if (args.description !== undefined) updates.description = args.description;
    if (args.billLineItems !== undefined) updates.billLineItems = args.billLineItems;
    const response = await this.fetchWithRetry(`${this.baseUrl}/bills/${encodeURIComponent(String(args.billId))}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(updates),
    });
    if (!response.ok) {
      const err = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `Failed to update bill (HTTP ${response.status}): ${err}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async payBill(args: Record<string, unknown>, headers: Record<string, string>): Promise<ToolResult> {
    if (!args.billId || args.amount === undefined || !args.fundingAccountType) {
      return { content: [{ type: 'text', text: 'billId, amount, and fundingAccountType are required' }], isError: true };
    }
    const fundingAccount: Record<string, unknown> = { type: args.fundingAccountType };
    if (args.fundingAccountId) fundingAccount.id = args.fundingAccountId;
    const payment: Record<string, unknown> = {
      billId: args.billId,
      amount: args.amount,
      fundingAccount,
    };
    if (args.vendorId) payment.vendorId = args.vendorId;
    if (args.processDate) payment.processDate = args.processDate;
    const response = await this.fetchWithRetry(`${this.baseUrl}/payments`, { method: 'POST', headers, body: JSON.stringify(payment) });
    if (!response.ok) {
      const err = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `Failed to pay bill (HTTP ${response.status}): ${err}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async payBillsBulk(args: Record<string, unknown>, headers: Record<string, string>): Promise<ToolResult> {
    if (!args.payments) return { content: [{ type: 'text', text: 'payments array is required' }], isError: true };
    const response = await this.fetchWithRetry(`${this.baseUrl}/payments/bulk`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ payments: args.payments }),
    });
    if (!response.ok) {
      const err = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `Failed to pay bills in bulk (HTTP ${response.status}): ${err}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async listPayments(args: Record<string, unknown>, headers: Record<string, string>): Promise<ToolResult> {
    const params = new URLSearchParams();
    params.set('max', String(args.max || 100));
    params.set('start', String(args.start || 0));
    if (args.filter && typeof args.filter === 'object') {
      for (const [k, v] of Object.entries(args.filter as Record<string, unknown>)) {
        params.set(k, String(v));
      }
    }
    const response = await this.fetchWithRetry(`${this.baseUrl}/payments?${params}`, { method: 'GET', headers });
    if (!response.ok) {
      const err = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `Failed to list payments (HTTP ${response.status}): ${err}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async getPayment(args: Record<string, unknown>, headers: Record<string, string>): Promise<ToolResult> {
    if (!args.paymentId) return { content: [{ type: 'text', text: 'paymentId is required' }], isError: true };
    const response = await this.fetchWithRetry(`${this.baseUrl}/payments/${encodeURIComponent(String(args.paymentId))}`, { method: 'GET', headers });
    if (!response.ok) {
      const err = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `Failed to get payment (HTTP ${response.status}): ${err}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async listCustomers(args: Record<string, unknown>, headers: Record<string, string>): Promise<ToolResult> {
    const params = new URLSearchParams();
    params.set('max', String(args.max || 100));
    params.set('start', String(args.start || 0));
    if (args.filter && typeof args.filter === 'object') {
      for (const [k, v] of Object.entries(args.filter as Record<string, unknown>)) {
        params.set(k, String(v));
      }
    }
    const response = await this.fetchWithRetry(`${this.baseUrl}/customers?${params}`, { method: 'GET', headers });
    if (!response.ok) {
      const err = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `Failed to list customers (HTTP ${response.status}): ${err}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async getCustomer(args: Record<string, unknown>, headers: Record<string, string>): Promise<ToolResult> {
    if (!args.customerId) return { content: [{ type: 'text', text: 'customerId is required' }], isError: true };
    const response = await this.fetchWithRetry(`${this.baseUrl}/customers/${encodeURIComponent(String(args.customerId))}`, { method: 'GET', headers });
    if (!response.ok) {
      const err = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `Failed to get customer (HTTP ${response.status}): ${err}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async createCustomer(args: Record<string, unknown>, headers: Record<string, string>): Promise<ToolResult> {
    if (!args.name) return { content: [{ type: 'text', text: 'name is required' }], isError: true };
    const customer: Record<string, unknown> = { name: args.name };
    for (const field of ['email', 'address1', 'addressCity', 'addressState', 'addressZip', 'phone']) {
      if (args[field]) customer[field] = args[field];
    }
    const response = await this.fetchWithRetry(`${this.baseUrl}/customers`, { method: 'POST', headers, body: JSON.stringify(customer) });
    if (!response.ok) {
      const err = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `Failed to create customer (HTTP ${response.status}): ${err}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async listInvoices(args: Record<string, unknown>, headers: Record<string, string>): Promise<ToolResult> {
    const params = new URLSearchParams();
    params.set('max', String(args.max || 100));
    params.set('start', String(args.start || 0));
    if (args.filter && typeof args.filter === 'object') {
      for (const [k, v] of Object.entries(args.filter as Record<string, unknown>)) {
        params.set(k, String(v));
      }
    }
    const response = await this.fetchWithRetry(`${this.baseUrl}/invoices?${params}`, { method: 'GET', headers });
    if (!response.ok) {
      const err = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `Failed to list invoices (HTTP ${response.status}): ${err}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async getInvoice(args: Record<string, unknown>, headers: Record<string, string>): Promise<ToolResult> {
    if (!args.invoiceId) return { content: [{ type: 'text', text: 'invoiceId is required' }], isError: true };
    const response = await this.fetchWithRetry(`${this.baseUrl}/invoices/${encodeURIComponent(String(args.invoiceId))}`, { method: 'GET', headers });
    if (!response.ok) {
      const err = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `Failed to get invoice (HTTP ${response.status}): ${err}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async createInvoice(args: Record<string, unknown>, headers: Record<string, string>): Promise<ToolResult> {
    if (!args.customerId || !args.invoiceDate || !args.dueDate || args.amount === undefined) {
      return { content: [{ type: 'text', text: 'customerId, invoiceDate, dueDate, and amount are required' }], isError: true };
    }
    const invoice: Record<string, unknown> = {
      customerId: args.customerId,
      invoiceDate: args.invoiceDate,
      dueDate: args.dueDate,
      amount: args.amount,
    };
    if (args.invoiceNumber) invoice.invoiceNumber = args.invoiceNumber;
    if (args.description) invoice.description = args.description;
    if (args.invoiceLineItems) invoice.invoiceLineItems = args.invoiceLineItems;
    const response = await this.fetchWithRetry(`${this.baseUrl}/invoices`, { method: 'POST', headers, body: JSON.stringify(invoice) });
    if (!response.ok) {
      const err = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `Failed to create invoice (HTTP ${response.status}): ${err}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async listChartOfAccounts(args: Record<string, unknown>, headers: Record<string, string>): Promise<ToolResult> {
    const params = new URLSearchParams();
    params.set('max', String(args.max || 100));
    params.set('start', String(args.start || 0));
    if (args.filter && typeof args.filter === 'object') {
      for (const [k, v] of Object.entries(args.filter as Record<string, unknown>)) {
        params.set(k, String(v));
      }
    }
    const response = await this.fetchWithRetry(`${this.baseUrl}/classifications/chart-of-accounts?${params}`, { method: 'GET', headers });
    if (!response.ok) {
      const err = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `Failed to list chart of accounts (HTTP ${response.status}): ${err}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async listDepartments(args: Record<string, unknown>, headers: Record<string, string>): Promise<ToolResult> {
    const params = new URLSearchParams();
    params.set('max', String(args.max || 100));
    params.set('start', String(args.start || 0));
    const response = await this.fetchWithRetry(`${this.baseUrl}/classifications/departments?${params}`, { method: 'GET', headers });
    if (!response.ok) {
      const err = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `Failed to list departments (HTTP ${response.status}): ${err}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  static catalog() {
    return {
      name: 'bill-com',
      displayName: 'BILL (Bill.com)',
      version: '1.0.0',
      category: 'finance' as const,
      keywords: ['bill.com', 'bill', 'accounts-payable', 'accounts-receivable', 'ap', 'ar', 'invoices', 'payments', 'vendors', 'finance', 'ap-automation'],
      toolNames: [
        'list_vendors', 'get_vendor', 'create_vendor', 'update_vendor',
        'list_bills', 'get_bill', 'create_bill', 'update_bill',
        'pay_bill', 'pay_bills_bulk',
        'list_payments', 'get_payment',
        'list_customers', 'get_customer', 'create_customer',
        'list_invoices', 'get_invoice', 'create_invoice',
        'list_chart_of_accounts',
        'list_departments',
      ],
      description: 'AP/AR automation: manage vendors, bills, invoices, customers, payments, chart of accounts, and departments.',
      author: 'protectnil' as const,
    };
  }
}

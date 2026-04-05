/**
 * Sage Intacct MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://mcp.intacct.com/mcp — transport: streamable-HTTP, auth: OAuth 2.0
// Sage ships an official Intacct MCP server (v1.0, launched Nov 2025) via their Developer Portal.
// Docs: https://developer.sage.com/intacct/mcps/intacct-mcp/latest/intacct-mcp-server
// That server is built on the Sage Intacct REST API and requires Sage-hosted OAuth infrastructure
// (not air-gap compatible). Tool count not publicly enumerated; covers the REST API surface.
// Our adapter covers: 12 tools (core finance operations) using the XML API (legacy SOAP-over-HTTP).
// Recommendation: use-both — vendor MCP uses REST API (OAuth environments); our adapter uses the
// XML API (server-to-server, air-gap, existing Sender ID credentials). Each integration path
// exposes different capabilities; the XML API is the primary pattern for ERP-level integrations.
//
// Endpoint: POST https://api.intacct.com/ia/xml/xmlgw.phtml (session acquisition gateway)
// Auth flow: senderId/senderPassword + companyId/userId/userPassword → getAPISession →
//   sessionId + per-session endpoint URL used for all subsequent calls.
// Docs: https://developer.intacct.com/api/
// Rate limits: Not publicly documented; Sage recommends reducing sync frequency for static objects

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface SageIntacctConfig {
  senderId: string;
  senderPassword: string;
  companyId: string;
  userId: string;
  userPassword: string;
  /** Override gateway URL (default: https://api.intacct.com/ia/xml/xmlgw.phtml) */
  endpointUrl?: string;
}

interface IntacctSession {
  sessionId: string;
  endpoint: string;
}

export class SageIntacctMCPServer extends MCPAdapterBase {
  private readonly senderId: string;
  private readonly senderPassword: string;
  private readonly companyId: string;
  private readonly userId: string;
  private readonly userPassword: string;
  private readonly gatewayUrl: string;
  private session: IntacctSession | null = null;

  constructor(config: SageIntacctConfig) {
    super();
    this.senderId = config.senderId;
    this.senderPassword = config.senderPassword;
    this.companyId = config.companyId;
    this.userId = config.userId;
    this.userPassword = config.userPassword;
    this.gatewayUrl = config.endpointUrl || 'https://api.intacct.com/ia/xml/xmlgw.phtml';
  }

  static catalog() {
    return {
      name: 'sage-intacct',
      displayName: 'Sage Intacct',
      version: '1.0.0',
      category: 'finance' as const,
      keywords: ['sage', 'intacct', 'accounting', 'finance', 'ar', 'ap', 'gl', 'invoice', 'bill', 'vendor', 'customer', 'journal', 'payment', 'general-ledger'],
      toolNames: [
        'query_objects', 'get_object', 'inspect_object',
        'create_ar_invoice', 'create_ap_bill',
        'create_journal_entry',
        'create_customer', 'create_vendor',
        'get_gl_account_balance',
        'list_open_ar_invoices', 'list_open_ap_bills',
        'list_departments',
      ],
      description: 'Sage Intacct XML API: query, read, and create financial records including AR invoices, AP bills, journal entries, customers, vendors, and GL accounts.',
      author: 'protectnil' as const,
    };
  }

  get tools(): ToolDefinition[] {
    return [
      // ── Query & Read ─────────────────────────────────────────────────────────
      {
        name: 'query_objects',
        description: 'Query Sage Intacct objects by filter expression using readByQuery (e.g. ARINVOICE, VENDOR, CUSTOMER, GLACCOUNT, APPYMT)',
        inputSchema: {
          type: 'object',
          properties: {
            object: {
              type: 'string',
              description: 'Sage Intacct object name in uppercase (e.g. ARINVOICE, VENDOR, CUSTOMER, APPYMT, GLACCOUNT, DEPARTMENT, PROJECT)',
            },
            query: {
              type: 'string',
              description: "Filter expression (e.g. STATUS = 'open' AND CUSTOMERID = 'C001'). Leave empty for all records.",
            },
            fields: {
              type: 'string',
              description: 'Comma-separated field list or * for all (default: *)',
            },
            page_size: {
              type: 'number',
              description: 'Number of records per page (max 1000, default: 100)',
            },
          },
          required: ['object'],
        },
      },
      {
        name: 'get_object',
        description: 'Retrieve a single Sage Intacct record by its key or ID using the read function',
        inputSchema: {
          type: 'object',
          properties: {
            object: {
              type: 'string',
              description: 'Sage Intacct object name in uppercase (e.g. ARINVOICE, VENDOR, CUSTOMER)',
            },
            key: {
              type: 'string',
              description: 'The RECORDNO or ID of the record to retrieve',
            },
            fields: {
              type: 'string',
              description: 'Comma-separated field list or * for all (default: *)',
            },
          },
          required: ['object', 'key'],
        },
      },
      {
        name: 'inspect_object',
        description: 'Retrieve the full field schema for a Sage Intacct object type — useful for discovering available fields before querying',
        inputSchema: {
          type: 'object',
          properties: {
            object: {
              type: 'string',
              description: 'Sage Intacct object name in uppercase (e.g. ARINVOICE, VENDOR, PROJECT)',
            },
          },
          required: ['object'],
        },
      },
      // ── AR Invoices ──────────────────────────────────────────────────────────
      {
        name: 'create_ar_invoice',
        description: 'Create an Accounts Receivable invoice in Sage Intacct for a customer with line items and due date',
        inputSchema: {
          type: 'object',
          properties: {
            customer_id: {
              type: 'string',
              description: 'Sage Intacct customer ID (CUSTOMERID)',
            },
            date_created: {
              type: 'string',
              description: 'Invoice date in MM/DD/YYYY format',
            },
            due_date: {
              type: 'string',
              description: 'Due date in MM/DD/YYYY format',
            },
            invoice_number: {
              type: 'string',
              description: 'Your invoice number or reference',
            },
            description: {
              type: 'string',
              description: 'Invoice description or memo',
            },
            gl_account_no: {
              type: 'string',
              description: 'GL account number for the revenue line',
            },
            amount: {
              type: 'number',
              description: 'Invoice line amount',
            },
            department_id: {
              type: 'string',
              description: 'Optional department ID for the line item',
            },
          },
          required: ['customer_id', 'date_created', 'due_date', 'gl_account_no', 'amount'],
        },
      },
      {
        name: 'list_open_ar_invoices',
        description: 'List open Accounts Receivable invoices in Sage Intacct, optionally filtered by customer',
        inputSchema: {
          type: 'object',
          properties: {
            customer_id: {
              type: 'string',
              description: 'Filter by Sage Intacct customer ID',
            },
            page_size: {
              type: 'number',
              description: 'Number of records per page (max 1000, default: 100)',
            },
          },
        },
      },
      // ── AP Bills ─────────────────────────────────────────────────────────────
      {
        name: 'create_ap_bill',
        description: 'Create an Accounts Payable bill (vendor bill) in Sage Intacct with line items and due date',
        inputSchema: {
          type: 'object',
          properties: {
            vendor_id: {
              type: 'string',
              description: 'Sage Intacct vendor ID (VENDORID)',
            },
            date_created: {
              type: 'string',
              description: 'Bill date in MM/DD/YYYY format',
            },
            due_date: {
              type: 'string',
              description: 'Due date in MM/DD/YYYY format',
            },
            bill_number: {
              type: 'string',
              description: 'Vendor bill number or reference',
            },
            description: {
              type: 'string',
              description: 'Bill description or memo',
            },
            gl_account_no: {
              type: 'string',
              description: 'GL account number for the expense line',
            },
            amount: {
              type: 'number',
              description: 'Bill line amount',
            },
            department_id: {
              type: 'string',
              description: 'Optional department ID for the line item',
            },
          },
          required: ['vendor_id', 'date_created', 'due_date', 'gl_account_no', 'amount'],
        },
      },
      {
        name: 'list_open_ap_bills',
        description: 'List open Accounts Payable bills in Sage Intacct, optionally filtered by vendor',
        inputSchema: {
          type: 'object',
          properties: {
            vendor_id: {
              type: 'string',
              description: 'Filter by Sage Intacct vendor ID',
            },
            page_size: {
              type: 'number',
              description: 'Number of records per page (max 1000, default: 100)',
            },
          },
        },
      },
      // ── Journal Entries ──────────────────────────────────────────────────────
      {
        name: 'create_journal_entry',
        description: 'Create a General Ledger journal entry in Sage Intacct with debit and credit lines',
        inputSchema: {
          type: 'object',
          properties: {
            journal: {
              type: 'string',
              description: 'Journal symbol (e.g. GJ for General Journal)',
            },
            date_created: {
              type: 'string',
              description: 'Journal entry date in MM/DD/YYYY format',
            },
            description: {
              type: 'string',
              description: 'Description or memo for the journal entry',
            },
            reference_number: {
              type: 'string',
              description: 'Optional reference number for the journal entry',
            },
            lines: {
              type: 'array',
              description: 'Array of journal entry lines with glaccountno, amount, and type (debit/credit)',
              items: {
                type: 'object',
              },
            },
          },
          required: ['journal', 'date_created', 'lines'],
        },
      },
      // ── Customers ────────────────────────────────────────────────────────────
      {
        name: 'create_customer',
        description: 'Create a new customer record in Sage Intacct with contact and billing information',
        inputSchema: {
          type: 'object',
          properties: {
            customer_id: {
              type: 'string',
              description: 'Unique customer ID (auto-generated if omitted)',
            },
            name: {
              type: 'string',
              description: 'Customer display name',
            },
            email: {
              type: 'string',
              description: 'Primary email address',
            },
            phone: {
              type: 'string',
              description: 'Primary phone number',
            },
            address1: {
              type: 'string',
              description: 'Billing address line 1',
            },
            city: {
              type: 'string',
              description: 'Billing city',
            },
            state: {
              type: 'string',
              description: 'Billing state or province',
            },
            zip: {
              type: 'string',
              description: 'Billing ZIP or postal code',
            },
            country: {
              type: 'string',
              description: 'Billing country (default: United States)',
            },
          },
          required: ['name'],
        },
      },
      // ── Vendors ──────────────────────────────────────────────────────────────
      {
        name: 'create_vendor',
        description: 'Create a new vendor record in Sage Intacct with contact and payment information',
        inputSchema: {
          type: 'object',
          properties: {
            vendor_id: {
              type: 'string',
              description: 'Unique vendor ID (auto-generated if omitted)',
            },
            name: {
              type: 'string',
              description: 'Vendor display name',
            },
            email: {
              type: 'string',
              description: 'Primary email address',
            },
            phone: {
              type: 'string',
              description: 'Primary phone number',
            },
            address1: {
              type: 'string',
              description: 'Mailing address line 1',
            },
            city: {
              type: 'string',
              description: 'City',
            },
            state: {
              type: 'string',
              description: 'State or province',
            },
            zip: {
              type: 'string',
              description: 'ZIP or postal code',
            },
          },
          required: ['name'],
        },
      },
      // ── GL ───────────────────────────────────────────────────────────────────
      {
        name: 'get_gl_account_balance',
        description: 'Retrieve the current balance for a GL account in Sage Intacct by account number',
        inputSchema: {
          type: 'object',
          properties: {
            account_no: {
              type: 'string',
              description: 'The GL account number to query',
            },
            reporting_period: {
              type: 'string',
              description: "Reporting period name (e.g. 'Month Ended March 2026'). Defaults to current period if omitted.",
            },
          },
          required: ['account_no'],
        },
      },
      // ── Departments ──────────────────────────────────────────────────────────
      {
        name: 'list_departments',
        description: 'List all departments configured in Sage Intacct for use in dimension-based reporting',
        inputSchema: {
          type: 'object',
          properties: {
            page_size: {
              type: 'number',
              description: 'Number of records per page (max 1000, default: 100)',
            },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'query_objects':         return this.queryObjects(args);
        case 'get_object':            return this.getObject(args);
        case 'inspect_object':        return this.inspectObject(args);
        case 'create_ar_invoice':     return this.createArInvoice(args);
        case 'list_open_ar_invoices': return this.listOpenArInvoices(args);
        case 'create_ap_bill':        return this.createApBill(args);
        case 'list_open_ap_bills':    return this.listOpenApBills(args);
        case 'create_journal_entry':  return this.createJournalEntry(args);
        case 'create_customer':       return this.createCustomer(args);
        case 'create_vendor':         return this.createVendor(args);
        case 'get_gl_account_balance': return this.getGlAccountBalance(args);
        case 'list_departments':      return this.listDepartments(args);
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

  // ── Session management ────────────────────────────────────────────────────

  private buildEnvelope(functionXml: string, useSession = false): string {
    const controlBlock = `<control>
      <senderid>${this.esc(this.senderId)}</senderid>
      <password>${this.esc(this.senderPassword)}</password>
      <controlid>ctrl-${Date.now()}</controlid>
      <uniqueid>false</uniqueid>
      <dtdversion>3.0</dtdversion>
      <includewhitespace>false</includewhitespace>
    </control>`;

    const authBlock = useSession && this.session
      ? `<authentication><sessionid>${this.esc(this.session.sessionId)}</sessionid></authentication>`
      : `<authentication>
          <login>
            <userid>${this.esc(this.userId)}</userid>
            <companyid>${this.esc(this.companyId)}</companyid>
            <password>${this.esc(this.userPassword)}</password>
          </login>
        </authentication>`;

    return `<?xml version="1.0" encoding="UTF-8"?><request>${controlBlock}<operation>${authBlock}<content><function controlid="fn-${Date.now()}">${functionXml}</function></content></operation></request>`;
  }

  private esc(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  private parseDate(dateStr: string): { year: string; month: string; day: string } {
    const parts = dateStr.split('/');
    return { year: parts[2] ?? '', month: parts[0] ?? '', day: parts[1] ?? '' };
  }

  private async getSession(): Promise<IntacctSession> {
    if (this.session) return this.session;

    const xml = this.buildEnvelope('<getAPISession/>');
    const response = await this.fetchWithRetry(this.gatewayUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/xml' },
      body: xml,
    });

    if (!response.ok) {
      throw new Error(`Sage Intacct session request failed: HTTP ${response.status} ${response.statusText}`);
    }

    const text = await response.text();
    const sessionId = text.match(/<sessionid>([^<]+)<\/sessionid>/)?.[1];
    const endpoint = text.match(/<endpoint>([^<]+)<\/endpoint>/)?.[1];

    if (!sessionId || !endpoint) {
      throw new Error(`Failed to parse Sage Intacct session response: ${text.substring(0, 500)}`);
    }

    this.session = { sessionId, endpoint };
    return this.session;
  }

  private async postFunction(functionXml: string): Promise<string> {
    const session = await this.getSession();
    const xml = this.buildEnvelope(functionXml, true);

    const response = await this.fetchWithRetry(session.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/xml' },
      body: xml,
    });

    if (!response.ok) {
      throw new Error(`Sage Intacct API request failed: HTTP ${response.status} ${response.statusText}`);
    }

    return response.text();
  }

  private parseResponse(xml: string): { success: boolean; data: string } {
    const hasError = xml.includes('<status>failure</status>') || xml.includes('<errorno>');
    if (hasError) {
      const msg = xml.match(/<description2>([^<]+)<\/description2>/)?.[1]
        || xml.match(/<description>([^<]+)<\/description>/)?.[1]
        || xml.match(/<errorno>([^<]+)<\/errorno>/)?.[1]
        || 'Unknown Sage Intacct error';
      return { success: false, data: msg };
    }
    return { success: true, data: xml };
  }

  private respond(xml: string, operation: string): ToolResult {
    const result = this.parseResponse(xml);
    if (!result.success) {
      return { content: [{ type: 'text', text: `${operation} failed: ${result.data}` }], isError: true };
    }
    const text = result.data.length > 10_000
      ? result.data.slice(0, 10_000) + `\n... [truncated, ${result.data.length} total chars]`
      : result.data;
    return { content: [{ type: 'text', text: text }], isError: false };
  }

  // ── Tool implementations ──────────────────────────────────────────────────

  private async queryObjects(args: Record<string, unknown>): Promise<ToolResult> {
    const object = args.object as string;
    if (!object) return { content: [{ type: 'text', text: 'object is required' }], isError: true };

    const query = (args.query as string) || '';
    const fields = (args.fields as string) || '*';
    const pageSize = (args.page_size as number) || 100;

    const functionXml = `<readByQuery><object>${this.esc(object)}</object><fields>${this.esc(fields)}</fields><query>${this.esc(query)}</query><pagesize>${pageSize}</pagesize></readByQuery>`;
    const xml = await this.postFunction(functionXml);
    return this.respond(xml, `Query ${object}`);
  }

  private async getObject(args: Record<string, unknown>): Promise<ToolResult> {
    const object = args.object as string;
    const key = args.key as string;
    if (!object || !key) return { content: [{ type: 'text', text: 'object and key are required' }], isError: true };

    const fields = (args.fields as string) || '*';
    const functionXml = `<read><object>${this.esc(object)}</object><keys>${this.esc(key)}</keys><fields>${this.esc(fields)}</fields></read>`;
    const xml = await this.postFunction(functionXml);
    return this.respond(xml, `Read ${object}`);
  }

  private async inspectObject(args: Record<string, unknown>): Promise<ToolResult> {
    const object = args.object as string;
    if (!object) return { content: [{ type: 'text', text: 'object is required' }], isError: true };

    const functionXml = `<inspect detail="1"><object>${this.esc(object)}</object></inspect>`;
    const xml = await this.postFunction(functionXml);
    return this.respond(xml, `Inspect ${object}`);
  }

  private async createArInvoice(args: Record<string, unknown>): Promise<ToolResult> {
    const customerId = args.customer_id as string;
    const dateCreated = args.date_created as string;
    const dueDate = args.due_date as string;
    const glAccountNo = args.gl_account_no as string;
    const amount = args.amount as number;

    if (!customerId || !dateCreated || !dueDate || !glAccountNo || amount === undefined) {
      return { content: [{ type: 'text', text: 'customer_id, date_created, due_date, gl_account_no, and amount are required' }], isError: true };
    }

    const d = this.parseDate(dateCreated);
    const dd = this.parseDate(dueDate);
    const invoiceNo = (args.invoice_number as string) || '';
    const description = (args.description as string) || '';
    const deptId = (args.department_id as string) || '';

    const functionXml = `<create_invoice>
      <customerid>${this.esc(customerId)}</customerid>
      <datecreated><year>${d.year}</year><month>${d.month}</month><day>${d.day}</day></datecreated>
      <datedue><year>${dd.year}</year><month>${dd.month}</month><day>${dd.day}</day></datedue>
      <invoiceno>${this.esc(invoiceNo)}</invoiceno>
      <description>${this.esc(description)}</description>
      <invoiceitems>
        <lineitem>
          <glaccountno>${this.esc(glAccountNo)}</glaccountno>
          <amount>${amount}</amount>
          <memo>${this.esc(description)}</memo>
          ${deptId ? `<departmentid>${this.esc(deptId)}</departmentid>` : ''}
        </lineitem>
      </invoiceitems>
    </create_invoice>`;

    const xml = await this.postFunction(functionXml);
    return this.respond(xml, 'Create AR invoice');
  }

  private async listOpenArInvoices(args: Record<string, unknown>): Promise<ToolResult> {
    const pageSize = (args.page_size as number) || 100;
    const customerId = args.customer_id as string;
    const query = customerId
      ? `STATUS = 'open' AND CUSTOMERID = '${customerId.replace(/'/g, "\\'")}'`
      : `STATUS = 'open'`;

    const functionXml = `<readByQuery><object>ARINVOICE</object><fields>*</fields><query>${this.esc(query)}</query><pagesize>${pageSize}</pagesize></readByQuery>`;
    const xml = await this.postFunction(functionXml);
    return this.respond(xml, 'List open AR invoices');
  }

  private async createApBill(args: Record<string, unknown>): Promise<ToolResult> {
    const vendorId = args.vendor_id as string;
    const dateCreated = args.date_created as string;
    const dueDate = args.due_date as string;
    const glAccountNo = args.gl_account_no as string;
    const amount = args.amount as number;

    if (!vendorId || !dateCreated || !dueDate || !glAccountNo || amount === undefined) {
      return { content: [{ type: 'text', text: 'vendor_id, date_created, due_date, gl_account_no, and amount are required' }], isError: true };
    }

    const d = this.parseDate(dateCreated);
    const dd = this.parseDate(dueDate);
    const billNo = (args.bill_number as string) || '';
    const description = (args.description as string) || '';
    const deptId = (args.department_id as string) || '';

    const functionXml = `<create_bill>
      <vendorid>${this.esc(vendorId)}</vendorid>
      <datecreated><year>${d.year}</year><month>${d.month}</month><day>${d.day}</day></datecreated>
      <datedue><year>${dd.year}</year><month>${dd.month}</month><day>${dd.day}</day></datedue>
      <billno>${this.esc(billNo)}</billno>
      <description>${this.esc(description)}</description>
      <billitems>
        <lineitem>
          <glaccountno>${this.esc(glAccountNo)}</glaccountno>
          <amount>${amount}</amount>
          <memo>${this.esc(description)}</memo>
          ${deptId ? `<departmentid>${this.esc(deptId)}</departmentid>` : ''}
        </lineitem>
      </billitems>
    </create_bill>`;

    const xml = await this.postFunction(functionXml);
    return this.respond(xml, 'Create AP bill');
  }

  private async listOpenApBills(args: Record<string, unknown>): Promise<ToolResult> {
    const pageSize = (args.page_size as number) || 100;
    const vendorId = args.vendor_id as string;
    const query = vendorId
      ? `STATUS = 'open' AND VENDORID = '${vendorId.replace(/'/g, "\\'")}'`
      : `STATUS = 'open'`;

    const functionXml = `<readByQuery><object>APBILL</object><fields>*</fields><query>${this.esc(query)}</query><pagesize>${pageSize}</pagesize></readByQuery>`;
    const xml = await this.postFunction(functionXml);
    return this.respond(xml, 'List open AP bills');
  }

  private async createJournalEntry(args: Record<string, unknown>): Promise<ToolResult> {
    const journal = args.journal as string;
    const dateCreated = args.date_created as string;
    const lines = args.lines as Array<Record<string, unknown>>;

    if (!journal || !dateCreated || !lines || lines.length === 0) {
      return { content: [{ type: 'text', text: 'journal, date_created, and lines are required' }], isError: true };
    }

    const d = this.parseDate(dateCreated);
    const description = (args.description as string) || '';
    const referenceNumber = (args.reference_number as string) || '';

    const lineXml = lines.map((line) => {
      const accountNo = this.esc(String(line.glaccountno || ''));
      const trtype = String(line.type || 'debit') === 'credit' ? 'credit' : 'debit';
      const amount = Number(line.amount || 0);
      return `<glentry><accountno>${accountNo}</accountno><tr_type>${trtype === 'debit' ? '1' : '-1'}</tr_type><amount>${amount}</amount></glentry>`;
    }).join('');

    const functionXml = `<create_gltransaction>
      <journalid>${this.esc(journal)}</journalid>
      <datecreated><year>${d.year}</year><month>${d.month}</month><day>${d.day}</day></datecreated>
      <description>${this.esc(description)}</description>
      <referenceno>${this.esc(referenceNumber)}</referenceno>
      <gltransactionentries>${lineXml}</gltransactionentries>
    </create_gltransaction>`;

    const xml = await this.postFunction(functionXml);
    return this.respond(xml, 'Create journal entry');
  }

  private async createCustomer(args: Record<string, unknown>): Promise<ToolResult> {
    const name = args.name as string;
    if (!name) return { content: [{ type: 'text', text: 'name is required' }], isError: true };

    const customerId = (args.customer_id as string) || '';
    const email = (args.email as string) || '';
    const phone = (args.phone as string) || '';
    const address1 = (args.address1 as string) || '';
    const city = (args.city as string) || '';
    const state = (args.state as string) || '';
    const zip = (args.zip as string) || '';
    const country = (args.country as string) || 'United States';

    const functionXml = `<create><CUSTOMER>
      ${customerId ? `<CUSTOMERID>${this.esc(customerId)}</CUSTOMERID>` : ''}
      <NAME>${this.esc(name)}</NAME>
      ${email ? `<EMAIL1>${this.esc(email)}</EMAIL1>` : ''}
      ${phone ? `<PHONE1>${this.esc(phone)}</PHONE1>` : ''}
      <MAILADDRESS>
        ${address1 ? `<ADDRESS1>${this.esc(address1)}</ADDRESS1>` : ''}
        ${city ? `<CITY>${this.esc(city)}</CITY>` : ''}
        ${state ? `<STATE>${this.esc(state)}</STATE>` : ''}
        ${zip ? `<ZIP>${this.esc(zip)}</ZIP>` : ''}
        <COUNTRY>${this.esc(country)}</COUNTRY>
      </MAILADDRESS>
    </CUSTOMER></create>`;

    const xml = await this.postFunction(functionXml);
    return this.respond(xml, 'Create customer');
  }

  private async createVendor(args: Record<string, unknown>): Promise<ToolResult> {
    const name = args.name as string;
    if (!name) return { content: [{ type: 'text', text: 'name is required' }], isError: true };

    const vendorId = (args.vendor_id as string) || '';
    const email = (args.email as string) || '';
    const phone = (args.phone as string) || '';
    const address1 = (args.address1 as string) || '';
    const city = (args.city as string) || '';
    const state = (args.state as string) || '';
    const zip = (args.zip as string) || '';

    const functionXml = `<create><VENDOR>
      ${vendorId ? `<VENDORID>${this.esc(vendorId)}</VENDORID>` : ''}
      <NAME>${this.esc(name)}</NAME>
      ${email ? `<EMAIL1>${this.esc(email)}</EMAIL1>` : ''}
      ${phone ? `<PHONE1>${this.esc(phone)}</PHONE1>` : ''}
      <MAILADDRESS>
        ${address1 ? `<ADDRESS1>${this.esc(address1)}</ADDRESS1>` : ''}
        ${city ? `<CITY>${this.esc(city)}</CITY>` : ''}
        ${state ? `<STATE>${this.esc(state)}</STATE>` : ''}
        ${zip ? `<ZIP>${this.esc(zip)}</ZIP>` : ''}
      </MAILADDRESS>
    </VENDOR></create>`;

    const xml = await this.postFunction(functionXml);
    return this.respond(xml, 'Create vendor');
  }

  private async getGlAccountBalance(args: Record<string, unknown>): Promise<ToolResult> {
    const accountNo = args.account_no as string;
    if (!accountNo) return { content: [{ type: 'text', text: 'account_no is required' }], isError: true };

    const reportingPeriod = (args.reporting_period as string) || '';
    const periodFilter = reportingPeriod ? `REPORTINGPERIOD = '${reportingPeriod.replace(/'/g, "\\'")}'` : '';
    const query = periodFilter
      ? `ACCOUNTNO = '${accountNo.replace(/'/g, "\\'")}' AND ${periodFilter}`
      : `ACCOUNTNO = '${accountNo.replace(/'/g, "\\'")}'`;

    const functionXml = `<readByQuery><object>GLACCOUNT</object><fields>ACCOUNTNO,TITLE,NORMALBALANCE,CLOSINGTYPE</fields><query>${this.esc(query)}</query><pagesize>1</pagesize></readByQuery>`;
    const xml = await this.postFunction(functionXml);
    return this.respond(xml, `Get GL account balance for ${accountNo}`);
  }

  private async listDepartments(args: Record<string, unknown>): Promise<ToolResult> {
    const pageSize = (args.page_size as number) || 100;
    const functionXml = `<readByQuery><object>DEPARTMENT</object><fields>*</fields><query></query><pagesize>${pageSize}</pagesize></readByQuery>`;
    const xml = await this.postFunction(functionXml);
    return this.respond(xml, 'List departments');
  }
}

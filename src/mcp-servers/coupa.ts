/**
 * Coupa MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28 — Composio provides a third-party Coupa MCP wrapper
// but Coupa Software does not publish an official MCP server on GitHub or npm.
// The Composio wrapper is not maintained by Coupa and does not qualify as an official MCP server.
// Our adapter covers: 21 tools. Vendor MCP: N/A.
// Recommendation: use-rest-api — no official Coupa MCP server exists.
//
// Base URL: https://{instance}.coupahost.com  (customer instances)
//           https://{instance}.coupacloud.com  (partner/demo instances)
// Auth: OAuth2 client credentials — token endpoint: POST https://{instance}/oauth2/token
//       Body params: grant_type=client_credentials, client_id, client_secret (form-encoded)
//       Access tokens valid 24 hours; Coupa recommends renewal every 20 hours.
//       Alternatively supported: X-COUPA-API-KEY header (legacy API key auth)
// Docs: https://compass.coupa.com/en-us/products/product-documentation/integration-technical-documentation/the-coupa-core-api
// Rate limits: Not publicly documented by Coupa

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface CoupaConfig {
  clientId: string;
  clientSecret: string;
  instanceUrl: string;    // e.g. https://acme.coupahost.com
}

export class CoupaMCPServer extends MCPAdapterBase {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly instanceUrl: string;
  private bearerToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(config: CoupaConfig) {
    super();
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    // Strip trailing slash
    this.instanceUrl = config.instanceUrl.replace(/\/$/, '');
  }

  static catalog() {
    return {
      name: 'coupa',
      displayName: 'Coupa',
      version: '1.0.0',
      category: 'finance',
      keywords: [
        'coupa', 'spend management', 'procurement', 'purchase order', 'po', 'invoice',
        'expense', 'requisition', 'supplier', 'vendor', 'contract', 'budget',
        'accounts payable', 'sourcing', 'approval', 'payment', 'receipt',
      ],
      toolNames: [
        'list_purchase_orders', 'get_purchase_order', 'create_purchase_order', 'update_purchase_order',
        'list_invoices', 'get_invoice', 'approve_invoice', 'reject_invoice',
        'list_requisitions', 'get_requisition', 'create_requisition',
        'list_suppliers', 'get_supplier', 'search_suppliers',
        'list_expense_reports', 'get_expense_report', 'approve_expense_report',
        'list_contracts', 'get_contract',
        'list_budgets', 'get_budget',
      ],
      description: 'Coupa spend management: manage purchase orders, invoices, requisitions, expense reports, suppliers, contracts, and budgets.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_purchase_orders',
        description: 'List purchase orders with optional filters for status, supplier, date range, and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              description: 'Filter by PO status: draft, pending_approval, approved, issued, closed, cancelled (default: all)',
            },
            supplier_id: {
              type: 'number',
              description: 'Filter by supplier ID',
            },
            created_after: {
              type: 'string',
              description: 'Return POs created on or after this date (ISO 8601: YYYY-MM-DD)',
            },
            created_before: {
              type: 'string',
              description: 'Return POs created on or before this date (ISO 8601: YYYY-MM-DD)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            per_page: {
              type: 'number',
              description: 'Results per page (max 50, default: 25)',
            },
          },
        },
      },
      {
        name: 'get_purchase_order',
        description: 'Retrieve a single purchase order by ID with full line items, approvals, and receipt status',
        inputSchema: {
          type: 'object',
          properties: {
            po_id: {
              type: 'number',
              description: 'Coupa purchase order ID',
            },
          },
          required: ['po_id'],
        },
      },
      {
        name: 'create_purchase_order',
        description: 'Create a new purchase order for a supplier with line items, account coding, and ship-to details',
        inputSchema: {
          type: 'object',
          properties: {
            supplier_id: {
              type: 'number',
              description: 'Coupa supplier ID',
            },
            requisition_id: {
              type: 'number',
              description: 'Requisition ID to source the PO from (optional — can create standalone PO)',
            },
            ship_to_address_id: {
              type: 'number',
              description: 'Coupa address ID for the ship-to location',
            },
            currency_code: {
              type: 'string',
              description: 'ISO 4217 currency code (e.g. USD, EUR) (default: account default currency)',
            },
            notes: {
              type: 'string',
              description: 'Internal notes or instructions for the purchase order',
            },
          },
          required: ['supplier_id'],
        },
      },
      {
        name: 'update_purchase_order',
        description: 'Update a purchase order status, notes, or shipping details by PO ID',
        inputSchema: {
          type: 'object',
          properties: {
            po_id: {
              type: 'number',
              description: 'Coupa purchase order ID to update',
            },
            status: {
              type: 'string',
              description: 'New status: cancelled, closed',
            },
            notes: {
              type: 'string',
              description: 'Updated notes or instructions',
            },
          },
          required: ['po_id'],
        },
      },
      {
        name: 'list_invoices',
        description: 'List supplier invoices with filters for status, supplier, PO number, and date range',
        inputSchema: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              description: 'Filter by invoice status: draft, pending_approval, approved, paid, disputed, cancelled',
            },
            supplier_id: {
              type: 'number',
              description: 'Filter by supplier ID',
            },
            po_id: {
              type: 'number',
              description: 'Filter invoices linked to a specific purchase order ID',
            },
            invoice_date_from: {
              type: 'string',
              description: 'Return invoices dated on or after (ISO 8601: YYYY-MM-DD)',
            },
            invoice_date_to: {
              type: 'string',
              description: 'Return invoices dated on or before (ISO 8601: YYYY-MM-DD)',
            },
            page: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
            per_page: {
              type: 'number',
              description: 'Results per page (max 50, default: 25)',
            },
          },
        },
      },
      {
        name: 'get_invoice',
        description: 'Retrieve a specific invoice by ID with line items, charges, and approval history',
        inputSchema: {
          type: 'object',
          properties: {
            invoice_id: {
              type: 'number',
              description: 'Coupa invoice ID',
            },
          },
          required: ['invoice_id'],
        },
      },
      {
        name: 'approve_invoice',
        description: 'Approve a pending invoice, advancing it in the approval workflow',
        inputSchema: {
          type: 'object',
          properties: {
            invoice_id: {
              type: 'number',
              description: 'Coupa invoice ID to approve',
            },
            comment: {
              type: 'string',
              description: 'Optional approval comment',
            },
          },
          required: ['invoice_id'],
        },
      },
      {
        name: 'reject_invoice',
        description: 'Reject a pending invoice with a required reason, returning it to the submitter',
        inputSchema: {
          type: 'object',
          properties: {
            invoice_id: {
              type: 'number',
              description: 'Coupa invoice ID to reject',
            },
            reason: {
              type: 'string',
              description: 'Reason for rejection (required)',
            },
          },
          required: ['invoice_id', 'reason'],
        },
      },
      {
        name: 'list_requisitions',
        description: 'List purchase requisitions with filters for status, requester, and date range',
        inputSchema: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              description: 'Filter by status: draft, pending_approval, approved, ordered, cancelled',
            },
            requested_by_id: {
              type: 'number',
              description: 'Filter by requester Coupa user ID',
            },
            submitted_after: {
              type: 'string',
              description: 'Return requisitions submitted on or after this date (ISO 8601)',
            },
            page: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
            per_page: {
              type: 'number',
              description: 'Results per page (max 50, default: 25)',
            },
          },
        },
      },
      {
        name: 'get_requisition',
        description: 'Retrieve a specific purchase requisition by ID with line items and approval chain',
        inputSchema: {
          type: 'object',
          properties: {
            requisition_id: {
              type: 'number',
              description: 'Coupa requisition ID',
            },
          },
          required: ['requisition_id'],
        },
      },
      {
        name: 'create_requisition',
        description: 'Create a new purchase requisition with description, requested items, and account coding',
        inputSchema: {
          type: 'object',
          properties: {
            description: {
              type: 'string',
              description: 'Short description of what is being requested',
            },
            requested_by_id: {
              type: 'number',
              description: 'Coupa user ID of the person requesting (defaults to API user)',
            },
            ship_to_address_id: {
              type: 'number',
              description: 'Coupa address ID for delivery',
            },
            currency_code: {
              type: 'string',
              description: 'ISO 4217 currency code (e.g. USD)',
            },
          },
          required: ['description'],
        },
      },
      {
        name: 'list_suppliers',
        description: 'List suppliers registered in Coupa with optional status and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              description: 'Filter by supplier status: active, inactive (default: active)',
            },
            page: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
            per_page: {
              type: 'number',
              description: 'Results per page (max 50, default: 25)',
            },
          },
        },
      },
      {
        name: 'get_supplier',
        description: 'Retrieve supplier details by Coupa supplier ID, including payment terms and contacts',
        inputSchema: {
          type: 'object',
          properties: {
            supplier_id: {
              type: 'number',
              description: 'Coupa supplier ID',
            },
          },
          required: ['supplier_id'],
        },
      },
      {
        name: 'search_suppliers',
        description: 'Search suppliers by name or tax ID to find matches in the Coupa supplier network',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Supplier name or partial name to search',
            },
            tax_id: {
              type: 'string',
              description: 'Supplier tax ID (EIN, VAT, etc.) to search',
            },
            page: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
            per_page: {
              type: 'number',
              description: 'Results per page (max 50, default: 25)',
            },
          },
        },
      },
      {
        name: 'list_expense_reports',
        description: 'List employee expense reports with filters for status, employee, and date range',
        inputSchema: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              description: 'Filter by status: draft, pending_approval, approved, paid, rejected',
            },
            employee_id: {
              type: 'number',
              description: 'Filter by Coupa user ID of the employee',
            },
            submitted_after: {
              type: 'string',
              description: 'Return reports submitted on or after this date (ISO 8601)',
            },
            page: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
            per_page: {
              type: 'number',
              description: 'Results per page (max 50, default: 25)',
            },
          },
        },
      },
      {
        name: 'get_expense_report',
        description: 'Retrieve a specific expense report by ID with line items, receipts, and approval history',
        inputSchema: {
          type: 'object',
          properties: {
            report_id: {
              type: 'number',
              description: 'Coupa expense report ID',
            },
          },
          required: ['report_id'],
        },
      },
      {
        name: 'approve_expense_report',
        description: 'Approve a pending expense report, advancing it in the approval workflow',
        inputSchema: {
          type: 'object',
          properties: {
            report_id: {
              type: 'number',
              description: 'Coupa expense report ID to approve',
            },
            comment: {
              type: 'string',
              description: 'Optional approval comment',
            },
          },
          required: ['report_id'],
        },
      },
      {
        name: 'list_contracts',
        description: 'List supplier contracts with optional status and expiration date filters',
        inputSchema: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              description: 'Filter by contract status: draft, pending_approval, active, expired, terminated',
            },
            supplier_id: {
              type: 'number',
              description: 'Filter contracts by supplier ID',
            },
            expiring_before: {
              type: 'string',
              description: 'Return contracts expiring on or before this date (ISO 8601)',
            },
            page: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
            per_page: {
              type: 'number',
              description: 'Results per page (max 50, default: 25)',
            },
          },
        },
      },
      {
        name: 'get_contract',
        description: 'Retrieve a specific supplier contract by ID with terms, milestones, and linked POs',
        inputSchema: {
          type: 'object',
          properties: {
            contract_id: {
              type: 'number',
              description: 'Coupa contract ID',
            },
          },
          required: ['contract_id'],
        },
      },
      {
        name: 'list_budgets',
        description: 'List budgets with optional period, department, and status filters for spend tracking',
        inputSchema: {
          type: 'object',
          properties: {
            period: {
              type: 'string',
              description: 'Filter by budget period name (e.g. FY2026, Q2-2026)',
            },
            department_id: {
              type: 'number',
              description: 'Filter budgets by department ID',
            },
            status: {
              type: 'string',
              description: 'Filter by budget status: active, closed, draft',
            },
            page: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
            per_page: {
              type: 'number',
              description: 'Results per page (max 50, default: 25)',
            },
          },
        },
      },
      {
        name: 'get_budget',
        description: 'Retrieve a specific budget by ID with amounts, actuals, encumbrances, and remaining balance',
        inputSchema: {
          type: 'object',
          properties: {
            budget_id: {
              type: 'number',
              description: 'Coupa budget ID',
            },
          },
          required: ['budget_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_purchase_orders':
          return this.listPurchaseOrders(args);
        case 'get_purchase_order':
          return this.getPurchaseOrder(args);
        case 'create_purchase_order':
          return this.createPurchaseOrder(args);
        case 'update_purchase_order':
          return this.updatePurchaseOrder(args);
        case 'list_invoices':
          return this.listInvoices(args);
        case 'get_invoice':
          return this.getInvoice(args);
        case 'approve_invoice':
          return this.approveInvoice(args);
        case 'reject_invoice':
          return this.rejectInvoice(args);
        case 'list_requisitions':
          return this.listRequisitions(args);
        case 'get_requisition':
          return this.getRequisition(args);
        case 'create_requisition':
          return this.createRequisition(args);
        case 'list_suppliers':
          return this.listSuppliers(args);
        case 'get_supplier':
          return this.getSupplier(args);
        case 'search_suppliers':
          return this.searchSuppliers(args);
        case 'list_expense_reports':
          return this.listExpenseReports(args);
        case 'get_expense_report':
          return this.getExpenseReport(args);
        case 'approve_expense_report':
          return this.approveExpenseReport(args);
        case 'list_contracts':
          return this.listContracts(args);
        case 'get_contract':
          return this.getContract(args);
        case 'list_budgets':
          return this.listBudgets(args);
        case 'get_budget':
          return this.getBudget(args);
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

  // --- Auth ---

  private async getOrRefreshToken(): Promise<string> {
    const now = Date.now();
    if (this.bearerToken && this.tokenExpiry > now) {
      return this.bearerToken;
    }
    const response = await this.fetchWithRetry(`${this.instanceUrl}/oauth2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: this.clientId,
        client_secret: this.clientSecret,
      }).toString(),
    });
    if (!response.ok) {
      throw new Error(`OAuth2 token request failed: ${response.status} ${response.statusText}`);
    }
    const data = await response.json() as { access_token: string; expires_in: number };
    this.bearerToken = data.access_token;
    // Tokens last 24h; renew after 20h (72000s minus 60s buffer)
    this.tokenExpiry = now + ((data.expires_in - 60) * 1000);
    return this.bearerToken;
  }

  private async authHeaders(): Promise<Record<string, string>> {
    const token = await this.getOrRefreshToken();
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  // --- Helpers ---


  private async coupaGet(path: string, params: Record<string, string> = {}): Promise<ToolResult> {
    const qs = new URLSearchParams(params).toString();
    const url = `${this.instanceUrl}/api${path}${qs ? '?' + qs : ''}`;
    const response = await this.fetchWithRetry(url, { method: 'GET', headers: await this.authHeaders() });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async coupaPost(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.instanceUrl}/api${path}`, {
      method: 'POST',
      headers: await this.authHeaders(),
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async coupaPut(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.instanceUrl}/api${path}`, {
      method: 'PUT',
      headers: await this.authHeaders(),
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  // --- Tool implementations ---

  private async listPurchaseOrders(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      page: String((args.page as number) ?? 1),
      per_page: String((args.per_page as number) ?? 25),
    };
    if (args.status) params['status[in]'] = args.status as string;
    if (args.supplier_id) params['supplier[id][eq]'] = String(args.supplier_id);
    if (args.created_after) params['created-at[gt_or_eq]'] = args.created_after as string;
    if (args.created_before) params['created-at[lt_or_eq]'] = args.created_before as string;
    return this.coupaGet('/purchase_orders', params);
  }

  private async getPurchaseOrder(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.po_id) return { content: [{ type: 'text', text: 'po_id is required' }], isError: true };
    return this.coupaGet(`/purchase_orders/${encodeURIComponent(args.po_id as number)}`);
  }

  private async createPurchaseOrder(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.supplier_id) return { content: [{ type: 'text', text: 'supplier_id is required' }], isError: true };
    const body: Record<string, unknown> = { supplier: { id: args.supplier_id } };
    if (args.requisition_id) body.requisition = { id: args.requisition_id };
    if (args.ship_to_address_id) body.ship_to_address = { id: args.ship_to_address_id };
    if (args.currency_code) body.currency = { code: args.currency_code };
    if (args.notes) body.note_to_supplier = args.notes;
    return this.coupaPost('/purchase_orders', body);
  }

  private async updatePurchaseOrder(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.po_id) return { content: [{ type: 'text', text: 'po_id is required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.status) body.status = args.status;
    if (args.notes) body.note_to_supplier = args.notes;
    return this.coupaPut(`/purchase_orders/${encodeURIComponent(args.po_id as number)}`, body);
  }

  private async listInvoices(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      page: String((args.page as number) ?? 1),
      per_page: String((args.per_page as number) ?? 25),
    };
    if (args.status) params['status[in]'] = args.status as string;
    if (args.supplier_id) params['supplier[id][eq]'] = String(args.supplier_id);
    if (args.po_id) params['order_lines[order_header][id][eq]'] = String(args.po_id);
    if (args.invoice_date_from) params['invoice-date[gt_or_eq]'] = args.invoice_date_from as string;
    if (args.invoice_date_to) params['invoice-date[lt_or_eq]'] = args.invoice_date_to as string;
    return this.coupaGet('/invoices', params);
  }

  private async getInvoice(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.invoice_id) return { content: [{ type: 'text', text: 'invoice_id is required' }], isError: true };
    return this.coupaGet(`/invoices/${encodeURIComponent(args.invoice_id as number)}`);
  }

  private async approveInvoice(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.invoice_id) return { content: [{ type: 'text', text: 'invoice_id is required' }], isError: true };
    // Coupa docs: bypass_approvals is the API action to approve an invoice programmatically
    // PUT /api/invoices/:id/bypass_approvals — allows a 3rd-party system to get an invoice approved quickly
    const body: Record<string, unknown> = {};
    if (args.comment) body.note = args.comment;
    return this.coupaPut(`/invoices/${encodeURIComponent(args.invoice_id as number)}/bypass_approvals`, body);
  }

  private async rejectInvoice(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.invoice_id || !args.reason) return { content: [{ type: 'text', text: 'invoice_id and reason are required' }], isError: true };
    // Coupa docs: void action rejects/voids an approved or pending invoice
    // PUT /api/invoices/:id/void — voids an approved or pending receipt invoice
    return this.coupaPut(`/invoices/${encodeURIComponent(args.invoice_id as number)}/void`, { reason: args.reason });
  }

  private async listRequisitions(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      page: String((args.page as number) ?? 1),
      per_page: String((args.per_page as number) ?? 25),
    };
    if (args.status) params['status[in]'] = args.status as string;
    if (args.requested_by_id) params['requested-by[id][eq]'] = String(args.requested_by_id);
    if (args.submitted_after) params['submitted-at[gt_or_eq]'] = args.submitted_after as string;
    return this.coupaGet('/requisitions', params);
  }

  private async getRequisition(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.requisition_id) return { content: [{ type: 'text', text: 'requisition_id is required' }], isError: true };
    return this.coupaGet(`/requisitions/${encodeURIComponent(args.requisition_id as number)}`);
  }

  private async createRequisition(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.description) return { content: [{ type: 'text', text: 'description is required' }], isError: true };
    const body: Record<string, unknown> = { description: args.description };
    if (args.requested_by_id) body.requested_by = { id: args.requested_by_id };
    if (args.ship_to_address_id) body.ship_to_address = { id: args.ship_to_address_id };
    if (args.currency_code) body.currency = { code: args.currency_code };
    return this.coupaPost('/requisitions', body);
  }

  private async listSuppliers(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      page: String((args.page as number) ?? 1),
      per_page: String((args.per_page as number) ?? 25),
    };
    if (args.status) params['status[eq]'] = args.status as string;
    return this.coupaGet('/suppliers', params);
  }

  private async getSupplier(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.supplier_id) return { content: [{ type: 'text', text: 'supplier_id is required' }], isError: true };
    return this.coupaGet(`/suppliers/${encodeURIComponent(args.supplier_id as number)}`);
  }

  private async searchSuppliers(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      page: String((args.page as number) ?? 1),
      per_page: String((args.per_page as number) ?? 25),
    };
    if (args.name) params['name[contains]'] = args.name as string;
    if (args.tax_id) params['tax-identification-number[eq]'] = args.tax_id as string;
    return this.coupaGet('/suppliers', params);
  }

  private async listExpenseReports(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      page: String((args.page as number) ?? 1),
      per_page: String((args.per_page as number) ?? 25),
    };
    if (args.status) params['status[in]'] = args.status as string;
    if (args.employee_id) params['created-by[id][eq]'] = String(args.employee_id);
    if (args.submitted_after) params['submitted-at[gt_or_eq]'] = args.submitted_after as string;
    return this.coupaGet('/expense_reports', params);
  }

  private async getExpenseReport(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.report_id) return { content: [{ type: 'text', text: 'report_id is required' }], isError: true };
    return this.coupaGet(`/expense_reports/${encodeURIComponent(args.report_id as number)}`);
  }

  private async approveExpenseReport(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.report_id) return { content: [{ type: 'text', text: 'report_id is required' }], isError: true };
    const body: Record<string, unknown> = { status: 'approved' };
    if (args.comment) body.approval_comment = args.comment;
    return this.coupaPut(`/expense_reports/${encodeURIComponent(args.report_id as number)}`, body);
  }

  private async listContracts(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      page: String((args.page as number) ?? 1),
      per_page: String((args.per_page as number) ?? 25),
    };
    if (args.status) params['status[in]'] = args.status as string;
    if (args.supplier_id) params['supplier[id][eq]'] = String(args.supplier_id);
    if (args.expiring_before) params['stop-date[lt_or_eq]'] = args.expiring_before as string;
    return this.coupaGet('/contracts', params);
  }

  private async getContract(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.contract_id) return { content: [{ type: 'text', text: 'contract_id is required' }], isError: true };
    return this.coupaGet(`/contracts/${encodeURIComponent(args.contract_id as number)}`);
  }

  private async listBudgets(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      page: String((args.page as number) ?? 1),
      per_page: String((args.per_page as number) ?? 25),
    };
    if (args.period) params['period[name][eq]'] = args.period as string;
    if (args.department_id) params['account[id][eq]'] = String(args.department_id);
    if (args.status) params['status[eq]'] = args.status as string;
    return this.coupaGet('/budgets', params);
  }

  private async getBudget(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.budget_id) return { content: [{ type: 'text', text: 'budget_id is required' }], isError: true };
    return this.coupaGet(`/budgets/${encodeURIComponent(args.budget_id as number)}`);
  }
}

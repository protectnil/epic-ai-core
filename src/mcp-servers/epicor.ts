/**
 * Epicor Kinetic ERP MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Epicor Kinetic ERP REST API
// Base URL: configurable (on-prem or cloud, e.g. https://yourserver/epicor/api/v2)
// Auth: OAuth2 Bearer token or API key (X-API-Key header)
// Docs: https://help.epicor.com/EEW/api-reference
// Rate limits: varies by installation; no public limit documented

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface EpicorConfig {
  baseUrl: string;
  /** Provide one of bearerToken or apiKey */
  bearerToken?: string;
  apiKey?: string;
}

export class EpicorMCPServer extends MCPAdapterBase {
  private readonly baseUrl: string;
  private readonly bearerToken: string | undefined;
  private readonly apiKey: string | undefined;

  constructor(config: EpicorConfig) {
    super();
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.bearerToken = config.bearerToken;
    this.apiKey = config.apiKey;
  }

  static catalog() {
    return {
      name: 'epicor',
      displayName: 'Epicor Kinetic ERP',
      version: '1.0.0',
      category: 'manufacturing',
      keywords: [
        'epicor', 'kinetic', 'erp', 'manufacturing', 'parts', 'bom',
        'bill of materials', 'orders', 'jobs', 'customers', 'invoices',
        'purchase orders', 'inventory', 'production', 'shop floor',
      ],
      toolNames: [
        'list_parts', 'get_part', 'list_orders', 'get_order', 'create_order',
        'list_jobs', 'get_job', 'list_customers', 'get_customer',
        'list_invoices', 'get_invoice', 'list_purchase_orders',
        'create_purchase_order', 'get_inventory', 'list_bom',
      ],
      description: 'Epicor Kinetic ERP: manage parts, sales orders, manufacturing jobs, customers, invoices, purchase orders, inventory, and bill of materials.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_parts',
        description: 'List parts from the Epicor parts master, optionally filtered by search term, class, or type',
        inputSchema: {
          type: 'object',
          properties: {
            search: { type: 'string', description: 'Search term to filter parts by part number or description' },
            class_id: { type: 'string', description: 'Part class ID to filter results' },
            part_type: { type: 'string', description: 'Part type: M (manufactured), P (purchased), S (sales kit)' },
            top: { type: 'number', description: 'Maximum number of results to return (default: 50)' },
            skip: { type: 'number', description: 'Number of records to skip for pagination' },
          },
        },
      },
      {
        name: 'get_part',
        description: 'Get full details for a specific part by part number including description, UOM, cost, and attributes',
        inputSchema: {
          type: 'object',
          properties: {
            part_num: { type: 'string', description: 'Epicor part number' },
          },
          required: ['part_num'],
        },
      },
      {
        name: 'list_orders',
        description: 'List sales orders, optionally filtered by customer, status, or date range',
        inputSchema: {
          type: 'object',
          properties: {
            customer_id: { type: 'string', description: 'Customer ID (CustNum) to filter orders' },
            open_only: { type: 'boolean', description: 'Return only open orders (default: false)' },
            from_date: { type: 'string', description: 'Filter orders on or after this date (YYYY-MM-DD)' },
            to_date: { type: 'string', description: 'Filter orders on or before this date (YYYY-MM-DD)' },
            top: { type: 'number', description: 'Maximum number of results to return (default: 50)' },
            skip: { type: 'number', description: 'Number of records to skip for pagination' },
          },
        },
      },
      {
        name: 'get_order',
        description: 'Get full details for a specific sales order by order number, including lines and releases',
        inputSchema: {
          type: 'object',
          properties: {
            order_num: { type: 'number', description: 'Epicor sales order number' },
          },
          required: ['order_num'],
        },
      },
      {
        name: 'create_order',
        description: 'Create a new sales order in Epicor Kinetic ERP',
        inputSchema: {
          type: 'object',
          properties: {
            cust_num: { type: 'number', description: 'Customer number (CustNum)' },
            po_num: { type: 'string', description: 'Customer purchase order number' },
            need_by_date: { type: 'string', description: 'Required delivery date (YYYY-MM-DD)' },
            order_date: { type: 'string', description: 'Order date (YYYY-MM-DD); defaults to today' },
            lines: {
              type: 'array',
              description: 'Array of order line items',
              items: {
                type: 'object',
                properties: {
                  part_num: { type: 'string', description: 'Part number' },
                  order_qty: { type: 'number', description: 'Quantity ordered' },
                  unit_price: { type: 'number', description: 'Unit selling price' },
                },
              },
            },
          },
          required: ['cust_num'],
        },
      },
      {
        name: 'list_jobs',
        description: 'List manufacturing jobs, optionally filtered by part, status, or date range',
        inputSchema: {
          type: 'object',
          properties: {
            part_num: { type: 'string', description: 'Part number to filter jobs' },
            job_type: { type: 'string', description: 'Job type: P (production), R (rework), E (engineering)' },
            open_only: { type: 'boolean', description: 'Return only open jobs (default: false)' },
            from_date: { type: 'string', description: 'Filter jobs started on or after this date (YYYY-MM-DD)' },
            top: { type: 'number', description: 'Maximum number of results to return (default: 50)' },
            skip: { type: 'number', description: 'Number of records to skip for pagination' },
          },
        },
      },
      {
        name: 'get_job',
        description: 'Get full details for a manufacturing job by job number, including operations and materials',
        inputSchema: {
          type: 'object',
          properties: {
            job_num: { type: 'string', description: 'Epicor job number' },
          },
          required: ['job_num'],
        },
      },
      {
        name: 'list_customers',
        description: 'List customers from the Epicor customer master, optionally filtered by name or territory',
        inputSchema: {
          type: 'object',
          properties: {
            search: { type: 'string', description: 'Search by customer name or ID' },
            territory_id: { type: 'string', description: 'Sales territory ID to filter customers' },
            top: { type: 'number', description: 'Maximum number of results to return (default: 50)' },
            skip: { type: 'number', description: 'Number of records to skip for pagination' },
          },
        },
      },
      {
        name: 'get_customer',
        description: 'Get full customer record by customer number including contacts, addresses, and terms',
        inputSchema: {
          type: 'object',
          properties: {
            cust_num: { type: 'number', description: 'Epicor customer number (CustNum)' },
          },
          required: ['cust_num'],
        },
      },
      {
        name: 'list_invoices',
        description: 'List AR invoices, optionally filtered by customer, open status, or date range',
        inputSchema: {
          type: 'object',
          properties: {
            cust_num: { type: 'number', description: 'Customer number to filter invoices' },
            open_only: { type: 'boolean', description: 'Return only open (unpaid) invoices (default: false)' },
            from_date: { type: 'string', description: 'Invoice date on or after (YYYY-MM-DD)' },
            to_date: { type: 'string', description: 'Invoice date on or before (YYYY-MM-DD)' },
            top: { type: 'number', description: 'Maximum number of results to return (default: 50)' },
            skip: { type: 'number', description: 'Number of records to skip for pagination' },
          },
        },
      },
      {
        name: 'get_invoice',
        description: 'Get full invoice details by invoice number including lines, taxes, and payment history',
        inputSchema: {
          type: 'object',
          properties: {
            invoice_num: { type: 'number', description: 'Epicor AR invoice number' },
          },
          required: ['invoice_num'],
        },
      },
      {
        name: 'list_purchase_orders',
        description: 'List purchase orders, optionally filtered by vendor, status, or date range',
        inputSchema: {
          type: 'object',
          properties: {
            vendor_num: { type: 'number', description: 'Vendor number to filter purchase orders' },
            open_only: { type: 'boolean', description: 'Return only open purchase orders (default: false)' },
            from_date: { type: 'string', description: 'PO date on or after (YYYY-MM-DD)' },
            top: { type: 'number', description: 'Maximum number of results to return (default: 50)' },
            skip: { type: 'number', description: 'Number of records to skip for pagination' },
          },
        },
      },
      {
        name: 'create_purchase_order',
        description: 'Create a new purchase order in Epicor Kinetic',
        inputSchema: {
          type: 'object',
          properties: {
            vendor_num: { type: 'number', description: 'Vendor number' },
            buyer_id: { type: 'string', description: 'Buyer (purchaser) ID' },
            order_date: { type: 'string', description: 'Purchase order date (YYYY-MM-DD)' },
            lines: {
              type: 'array',
              description: 'Array of PO line items',
              items: {
                type: 'object',
                properties: {
                  part_num: { type: 'string', description: 'Part number to purchase' },
                  order_qty: { type: 'number', description: 'Quantity to order' },
                  unit_price: { type: 'number', description: 'Agreed unit price' },
                  due_date: { type: 'string', description: 'Expected delivery date (YYYY-MM-DD)' },
                },
              },
            },
          },
          required: ['vendor_num'],
        },
      },
      {
        name: 'get_inventory',
        description: 'Get current inventory quantity on hand for a part, optionally by warehouse and bin',
        inputSchema: {
          type: 'object',
          properties: {
            part_num: { type: 'string', description: 'Part number to check inventory for' },
            warehouse_code: { type: 'string', description: 'Warehouse code to limit results (optional)' },
            plant: { type: 'string', description: 'Plant (site) to limit results (optional)' },
          },
          required: ['part_num'],
        },
      },
      {
        name: 'list_bom',
        description: 'List bill of materials (BOM) components for a given part, showing all child parts and quantities',
        inputSchema: {
          type: 'object',
          properties: {
            part_num: { type: 'string', description: 'Parent part number to retrieve BOM for' },
            rev_num: { type: 'string', description: 'Revision number (defaults to active revision)' },
          },
          required: ['part_num'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_parts': return this.listParts(args);
        case 'get_part': return this.getPart(args);
        case 'list_orders': return this.listOrders(args);
        case 'get_order': return this.getOrder(args);
        case 'create_order': return this.createOrder(args);
        case 'list_jobs': return this.listJobs(args);
        case 'get_job': return this.getJob(args);
        case 'list_customers': return this.listCustomers(args);
        case 'get_customer': return this.getCustomer(args);
        case 'list_invoices': return this.listInvoices(args);
        case 'get_invoice': return this.getInvoice(args);
        case 'list_purchase_orders': return this.listPurchaseOrders(args);
        case 'create_purchase_order': return this.createPurchaseOrder(args);
        case 'get_inventory': return this.getInventory(args);
        case 'list_bom': return this.listBom(args);
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

  private authHeaders(): Record<string, string> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.bearerToken) {
      headers['Authorization'] = `Bearer ${this.bearerToken}`;
    } else if (this.apiKey) {
      headers['X-API-Key'] = this.apiKey;
    }
    return headers;
  }

  private async apiGet(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      headers: this.authHeaders(),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apiPost(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.authHeaders(),
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private buildOdataQuery(filters: string[], top?: number, skip?: number): string {
    const parts: string[] = [];
    if (filters.length > 0) parts.push(`$filter=${filters.join(' and ')}`);
    if (top !== undefined) parts.push(`$top=${top}`);
    if (skip !== undefined) parts.push(`$skip=${skip}`);
    return parts.length > 0 ? '?' + parts.join('&') : '';
  }

  private async listParts(args: Record<string, unknown>): Promise<ToolResult> {
    const filters: string[] = [];
    if (args.search) filters.push(`contains(PartNum,'${args.search}') or contains(PartDescription,'${args.search}')`);
    if (args.class_id) filters.push(`ClassID eq '${args.class_id}'`);
    if (args.part_type) filters.push(`TypeCode eq '${args.part_type}'`);
    const qs = this.buildOdataQuery(filters, (args.top as number) || 50, args.skip as number | undefined);
    return this.apiGet(`/Erp.BO.PartSvc/Parts${qs}`);
  }

  private async getPart(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.part_num) return { content: [{ type: 'text', text: 'part_num is required' }], isError: true };
    return this.apiGet(`/Erp.BO.PartSvc/Parts('${encodeURIComponent(args.part_num as string)}')`);
  }

  private async listOrders(args: Record<string, unknown>): Promise<ToolResult> {
    const filters: string[] = [];
    if (args.customer_id) filters.push(`CustNum eq ${args.customer_id}`);
    if (args.open_only) filters.push(`OpenOrder eq true`);
    if (args.from_date) filters.push(`OrderDate ge ${args.from_date}`);
    if (args.to_date) filters.push(`OrderDate le ${args.to_date}`);
    const qs = this.buildOdataQuery(filters, (args.top as number) || 50, args.skip as number | undefined);
    return this.apiGet(`/Erp.BO.SalesOrderSvc/SalesOrders${qs}`);
  }

  private async getOrder(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.order_num) return { content: [{ type: 'text', text: 'order_num is required' }], isError: true };
    return this.apiGet(`/Erp.BO.SalesOrderSvc/SalesOrders(${args.order_num})`);
  }

  private async createOrder(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.cust_num) return { content: [{ type: 'text', text: 'cust_num is required' }], isError: true };
    const body: Record<string, unknown> = {
      CustNum: args.cust_num,
      PONum: args.po_num ?? '',
      NeedByDate: args.need_by_date ?? '',
      OrderDate: args.order_date ?? new Date().toISOString().slice(0, 10),
      OrderHed: { OrderLines: args.lines ?? [] },
    };
    return this.apiPost('/Erp.BO.SalesOrderSvc/SalesOrders', body);
  }

  private async listJobs(args: Record<string, unknown>): Promise<ToolResult> {
    const filters: string[] = [];
    if (args.part_num) filters.push(`PartNum eq '${args.part_num}'`);
    if (args.job_type) filters.push(`JobType eq '${args.job_type}'`);
    if (args.open_only) filters.push(`JobComplete eq false`);
    if (args.from_date) filters.push(`StartDate ge ${args.from_date}`);
    const qs = this.buildOdataQuery(filters, (args.top as number) || 50, args.skip as number | undefined);
    return this.apiGet(`/Erp.BO.JobEntrySvc/JobHeads${qs}`);
  }

  private async getJob(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.job_num) return { content: [{ type: 'text', text: 'job_num is required' }], isError: true };
    return this.apiGet(`/Erp.BO.JobEntrySvc/JobHeads('${encodeURIComponent(args.job_num as string)}')`);
  }

  private async listCustomers(args: Record<string, unknown>): Promise<ToolResult> {
    const filters: string[] = [];
    if (args.search) filters.push(`contains(Name,'${args.search}') or contains(CustID,'${args.search}')`);
    if (args.territory_id) filters.push(`TerritoryID eq '${args.territory_id}'`);
    const qs = this.buildOdataQuery(filters, (args.top as number) || 50, args.skip as number | undefined);
    return this.apiGet(`/Erp.BO.CustomerSvc/Customers${qs}`);
  }

  private async getCustomer(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.cust_num) return { content: [{ type: 'text', text: 'cust_num is required' }], isError: true };
    return this.apiGet(`/Erp.BO.CustomerSvc/Customers(${args.cust_num})`);
  }

  private async listInvoices(args: Record<string, unknown>): Promise<ToolResult> {
    const filters: string[] = [];
    if (args.cust_num) filters.push(`CustNum eq ${args.cust_num}`);
    if (args.open_only) filters.push(`OpenInvoice eq true`);
    if (args.from_date) filters.push(`InvoiceDate ge ${args.from_date}`);
    if (args.to_date) filters.push(`InvoiceDate le ${args.to_date}`);
    const qs = this.buildOdataQuery(filters, (args.top as number) || 50, args.skip as number | undefined);
    return this.apiGet(`/Erp.BO.ARInvoiceSvc/ARInvoices${qs}`);
  }

  private async getInvoice(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.invoice_num) return { content: [{ type: 'text', text: 'invoice_num is required' }], isError: true };
    return this.apiGet(`/Erp.BO.ARInvoiceSvc/ARInvoices(${args.invoice_num})`);
  }

  private async listPurchaseOrders(args: Record<string, unknown>): Promise<ToolResult> {
    const filters: string[] = [];
    if (args.vendor_num) filters.push(`VendorNum eq ${args.vendor_num}`);
    if (args.open_only) filters.push(`OpenOrder eq true`);
    if (args.from_date) filters.push(`OrderDate ge ${args.from_date}`);
    const qs = this.buildOdataQuery(filters, (args.top as number) || 50, args.skip as number | undefined);
    return this.apiGet(`/Erp.BO.POSvc/POes${qs}`);
  }

  private async createPurchaseOrder(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.vendor_num) return { content: [{ type: 'text', text: 'vendor_num is required' }], isError: true };
    const body: Record<string, unknown> = {
      VendorNum: args.vendor_num,
      BuyerID: args.buyer_id ?? '',
      OrderDate: args.order_date ?? new Date().toISOString().slice(0, 10),
      POLines: args.lines ?? [],
    };
    return this.apiPost('/Erp.BO.POSvc/POes', body);
  }

  private async getInventory(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.part_num) return { content: [{ type: 'text', text: 'part_num is required' }], isError: true };
    const filters: string[] = [`PartNum eq '${args.part_num}'`];
    if (args.warehouse_code) filters.push(`WarehouseCode eq '${args.warehouse_code}'`);
    if (args.plant) filters.push(`Plant eq '${args.plant}'`);
    const qs = this.buildOdataQuery(filters);
    return this.apiGet(`/Erp.BO.PartBinSvc/PartBins${qs}`);
  }

  private async listBom(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.part_num) return { content: [{ type: 'text', text: 'part_num is required' }], isError: true };
    const filters: string[] = [`PartNum eq '${args.part_num}'`];
    if (args.rev_num) filters.push(`RevisionNum eq '${args.rev_num}'`);
    const qs = this.buildOdataQuery(filters);
    return this.apiGet(`/Erp.BO.PartRevSvc/PartMtls${qs}`);
  }
}

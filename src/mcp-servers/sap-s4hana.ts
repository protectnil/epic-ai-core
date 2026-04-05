/**
 * SAP S/4HANA MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// No official SAP S/4HANA MCP server was found on GitHub or the SAP Business Technology Platform.
// SAP has MCP servers for CAP/UI5/Fiori development tools only, not for S/4HANA business APIs.
//
// Base URL: https://{tenant}.s4hana.ondemand.com/sap/opu/odata/sap (tenant-specific)
// Auth: OAuth2 client credentials via SAP BTP token endpoint
//       POST https://{subdomain}.authentication.{region}.hana.ondemand.com/oauth/token
// Docs: https://api.sap.com/package/SAPS4HANACloud/odata
// Rate limits: Not publicly documented; governed by SAP S/4HANA Cloud tenant quotas
// NOTE: API_PURCHASEORDER_PROCESS_SRV (OData V2) was deprecated in S/4HANA Cloud 2308 release.
//       SAP recommends migrating to the V4 successor API. Decommissioning date TBD.
//       See SAP Note 3502308 for details.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface SAPS4HANAConfig {
  clientId: string;
  clientSecret: string;
  subdomain: string;
  region: string;
  apiServer: string;
  baseUrl?: string;
}

export class SAPS4HANAMCPServer extends MCPAdapterBase {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly subdomain: string;
  private readonly region: string;
  private readonly baseUrl: string;
  private bearerToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(config: SAPS4HANAConfig) {
    super();
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.subdomain = config.subdomain;
    this.region = config.region;
    this.baseUrl = config.baseUrl || `${config.apiServer}/sap/opu/odata/sap`;
  }

  static catalog() {
    return {
      name: 'sap-s4hana',
      displayName: 'SAP S/4HANA',
      version: '1.0.0',
      category: 'misc',
      keywords: ['sap', 's4hana', 'erp', 'odata', 'purchase order', 'sales order', 'invoice', 'material', 'vendor', 'customer', 'finance', 'supply chain', 'procurement', 'btp'],
      toolNames: [
        'list_purchase_orders', 'get_purchase_order', 'create_purchase_order',
        'list_sales_orders', 'get_sales_order',
        'list_supplier_invoices', 'get_supplier_invoice',
        'list_customers', 'get_customer',
        'list_suppliers', 'get_supplier',
        'list_materials', 'get_material',
        'list_cost_centers', 'get_profit_center',
      ],
      description: 'SAP S/4HANA Cloud ERP: query purchase orders, sales orders, invoices, materials, customers, suppliers, and financial master data.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_purchase_orders',
        description: 'List purchase orders from SAP S/4HANA with optional supplier, status, and date range filters',
        inputSchema: {
          type: 'object',
          properties: {
            supplier: {
              type: 'string',
              description: 'Filter by supplier (vendor) account number',
            },
            purchase_order_type: {
              type: 'string',
              description: 'Filter by purchase order type (e.g. NB for standard, UB for stock transfer)',
            },
            creation_date_from: {
              type: 'string',
              description: 'Filter orders created on or after this date (YYYY-MM-DD)',
            },
            creation_date_to: {
              type: 'string',
              description: 'Filter orders created on or before this date (YYYY-MM-DD)',
            },
            top: {
              type: 'number',
              description: 'Maximum results to return (default: 50, max: 1000)',
            },
            skip: {
              type: 'number',
              description: 'Number of records to skip for pagination (default: 0)',
            },
          },
        },
      },
      {
        name: 'get_purchase_order',
        description: 'Get full details for a specific SAP S/4HANA purchase order including line items and delivery schedule',
        inputSchema: {
          type: 'object',
          properties: {
            purchase_order: {
              type: 'string',
              description: 'Purchase order number (10-digit, e.g. 4500000001)',
            },
          },
          required: ['purchase_order'],
        },
      },
      {
        name: 'create_purchase_order',
        description: 'Create a new purchase order in SAP S/4HANA with supplier, items, and delivery details',
        inputSchema: {
          type: 'object',
          properties: {
            supplier: {
              type: 'string',
              description: 'Supplier account number',
            },
            company_code: {
              type: 'string',
              description: 'Company code (4-character identifier, e.g. 1000)',
            },
            purchasing_organization: {
              type: 'string',
              description: 'Purchasing organization code (e.g. 1000)',
            },
            purchasing_group: {
              type: 'string',
              description: 'Purchasing group code (e.g. 001)',
            },
            currency: {
              type: 'string',
              description: 'Document currency code (e.g. USD, EUR)',
            },
          },
          required: ['supplier', 'company_code', 'purchasing_organization', 'purchasing_group'],
        },
      },
      {
        name: 'list_sales_orders',
        description: 'List sales orders from SAP S/4HANA with optional customer, sales organization, and date filters',
        inputSchema: {
          type: 'object',
          properties: {
            sold_to_party: {
              type: 'string',
              description: 'Filter by sold-to customer account number',
            },
            sales_organization: {
              type: 'string',
              description: 'Filter by sales organization code',
            },
            creation_date_from: {
              type: 'string',
              description: 'Filter orders created on or after this date (YYYY-MM-DD)',
            },
            creation_date_to: {
              type: 'string',
              description: 'Filter orders created on or before this date (YYYY-MM-DD)',
            },
            top: {
              type: 'number',
              description: 'Maximum results to return (default: 50)',
            },
            skip: {
              type: 'number',
              description: 'Number of records to skip for pagination (default: 0)',
            },
          },
        },
      },
      {
        name: 'get_sales_order',
        description: 'Get full details for a specific SAP S/4HANA sales order including items, pricing, and delivery schedule',
        inputSchema: {
          type: 'object',
          properties: {
            sales_order: {
              type: 'string',
              description: 'Sales order number (e.g. 0000001234)',
            },
          },
          required: ['sales_order'],
        },
      },
      {
        name: 'list_supplier_invoices',
        description: 'List supplier invoices in SAP S/4HANA with optional supplier, company code, and posting date filters',
        inputSchema: {
          type: 'object',
          properties: {
            supplier: {
              type: 'string',
              description: 'Filter by supplier account number',
            },
            company_code: {
              type: 'string',
              description: 'Filter by company code',
            },
            posting_date_from: {
              type: 'string',
              description: 'Filter invoices posted on or after this date (YYYY-MM-DD)',
            },
            posting_date_to: {
              type: 'string',
              description: 'Filter invoices posted on or before this date (YYYY-MM-DD)',
            },
            top: {
              type: 'number',
              description: 'Maximum results to return (default: 50)',
            },
            skip: {
              type: 'number',
              description: 'Number of records to skip for pagination (default: 0)',
            },
          },
        },
      },
      {
        name: 'get_supplier_invoice',
        description: 'Get details for a specific SAP S/4HANA supplier invoice by document number and fiscal year',
        inputSchema: {
          type: 'object',
          properties: {
            supplier_invoice: {
              type: 'string',
              description: 'Supplier invoice document number',
            },
            fiscal_year: {
              type: 'string',
              description: 'Fiscal year of the invoice (e.g. 2026)',
            },
          },
          required: ['supplier_invoice', 'fiscal_year'],
        },
      },
      {
        name: 'list_customers',
        description: 'List customer master data from SAP S/4HANA with optional name, country, and sales area filters',
        inputSchema: {
          type: 'object',
          properties: {
            customer_name: {
              type: 'string',
              description: 'Filter by customer name (partial match supported)',
            },
            country: {
              type: 'string',
              description: 'Filter by country key (ISO 2-letter code, e.g. US, DE)',
            },
            top: {
              type: 'number',
              description: 'Maximum results to return (default: 50)',
            },
            skip: {
              type: 'number',
              description: 'Number of records to skip for pagination (default: 0)',
            },
          },
        },
      },
      {
        name: 'get_customer',
        description: 'Get full master data for a specific SAP S/4HANA customer by customer account number',
        inputSchema: {
          type: 'object',
          properties: {
            customer: {
              type: 'string',
              description: 'Customer account number (up to 10 digits)',
            },
          },
          required: ['customer'],
        },
      },
      {
        name: 'list_suppliers',
        description: 'List supplier (vendor) master data from SAP S/4HANA with optional name and country filters',
        inputSchema: {
          type: 'object',
          properties: {
            supplier_name: {
              type: 'string',
              description: 'Filter by supplier name (partial match supported)',
            },
            country: {
              type: 'string',
              description: 'Filter by country key (ISO 2-letter code)',
            },
            top: {
              type: 'number',
              description: 'Maximum results to return (default: 50)',
            },
            skip: {
              type: 'number',
              description: 'Number of records to skip for pagination (default: 0)',
            },
          },
        },
      },
      {
        name: 'get_supplier',
        description: 'Get full master data for a specific SAP S/4HANA supplier by supplier account number',
        inputSchema: {
          type: 'object',
          properties: {
            supplier: {
              type: 'string',
              description: 'Supplier account number (up to 10 digits)',
            },
          },
          required: ['supplier'],
        },
      },
      {
        name: 'list_materials',
        description: 'List material master records from SAP S/4HANA with optional material type and plant filters',
        inputSchema: {
          type: 'object',
          properties: {
            material_type: {
              type: 'string',
              description: 'Filter by material type (e.g. FERT for finished goods, ROH for raw materials)',
            },
            plant: {
              type: 'string',
              description: 'Filter by plant code (4-character, e.g. 1000)',
            },
            top: {
              type: 'number',
              description: 'Maximum results to return (default: 50)',
            },
            skip: {
              type: 'number',
              description: 'Number of records to skip for pagination (default: 0)',
            },
          },
        },
      },
      {
        name: 'get_material',
        description: 'Get material master data for a specific material by material number including plant-level data',
        inputSchema: {
          type: 'object',
          properties: {
            material: {
              type: 'string',
              description: 'Material number (up to 18 characters)',
            },
          },
          required: ['material'],
        },
      },
      {
        name: 'list_cost_centers',
        description: 'List cost centers from SAP S/4HANA controlling area with optional name and validity filters',
        inputSchema: {
          type: 'object',
          properties: {
            controlling_area: {
              type: 'string',
              description: 'Controlling area code (4-character, e.g. 1000)',
            },
            cost_center_name: {
              type: 'string',
              description: 'Filter by cost center name (partial match)',
            },
            top: {
              type: 'number',
              description: 'Maximum results to return (default: 50)',
            },
            skip: {
              type: 'number',
              description: 'Number of records to skip for pagination (default: 0)',
            },
          },
        },
      },
      {
        name: 'get_profit_center',
        description: 'Get details for a specific SAP S/4HANA profit center by controlling area and profit center ID',
        inputSchema: {
          type: 'object',
          properties: {
            controlling_area: {
              type: 'string',
              description: 'Controlling area code',
            },
            profit_center: {
              type: 'string',
              description: 'Profit center ID',
            },
          },
          required: ['controlling_area', 'profit_center'],
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
        case 'list_sales_orders':
          return this.listSalesOrders(args);
        case 'get_sales_order':
          return this.getSalesOrder(args);
        case 'list_supplier_invoices':
          return this.listSupplierInvoices(args);
        case 'get_supplier_invoice':
          return this.getSupplierInvoice(args);
        case 'list_customers':
          return this.listCustomers(args);
        case 'get_customer':
          return this.getCustomer(args);
        case 'list_suppliers':
          return this.listSuppliers(args);
        case 'get_supplier':
          return this.getSupplier(args);
        case 'list_materials':
          return this.listMaterials(args);
        case 'get_material':
          return this.getMaterial(args);
        case 'list_cost_centers':
          return this.listCostCenters(args);
        case 'get_profit_center':
          return this.getProfitCenter(args);
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

  private async getOrRefreshToken(): Promise<string> {
    const now = Date.now();
    if (this.bearerToken && this.tokenExpiry > now) {
      return this.bearerToken;
    }
    const tokenUrl = `https://${this.subdomain}.authentication.${this.region}.hana.ondemand.com/oauth/token`;
    const response = await this.fetchWithRetry(tokenUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${this.clientId}:${this.clientSecret}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });
    if (!response.ok) {
      throw new Error(`OAuth2 token request failed: ${response.status} ${response.statusText}`);
    }
    const data = await response.json() as { access_token: string; expires_in: number };
    this.bearerToken = data.access_token;
    this.tokenExpiry = now + (data.expires_in - 60) * 1000;
    return this.bearerToken;
  }

  private async authHeaders(): Promise<Record<string, string>> {
    const token = await this.getOrRefreshToken();
    return {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    };
  }

  private async odataGet(service: string, entity: string, params: Record<string, string | number | undefined>): Promise<ToolResult> {
    const p = new URLSearchParams({ $format: 'json' });
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) p.set(k, String(v));
    }
    const headers = await this.authHeaders();
    const response = await this.fetchWithRetry(`${this.baseUrl}/${service}/${entity}?${p.toString()}`, { headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async odataPost(service: string, entity: string, body: Record<string, unknown>): Promise<ToolResult> {
    const headers = await this.authHeaders();
    const response = await this.fetchWithRetry(`${this.baseUrl}/${service}/${entity}?$format=json`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private buildFilter(conditions: string[]): string {
    return conditions.filter(Boolean).join(' and ');
  }

  private async listPurchaseOrders(args: Record<string, unknown>): Promise<ToolResult> {
    const filters: string[] = [];
    if (args.supplier) filters.push(`Supplier eq '${encodeURIComponent(args.supplier as string)}'`);
    if (args.purchase_order_type) filters.push(`PurchaseOrderType eq '${encodeURIComponent(args.purchase_order_type as string)}'`);
    if (args.creation_date_from) filters.push(`CreationDate ge datetime'${encodeURIComponent(args.creation_date_from as string)}T00:00:00'`);
    if (args.creation_date_to) filters.push(`CreationDate le datetime'${encodeURIComponent(args.creation_date_to as string)}T23:59:59'`);
    const params: Record<string, string | number | undefined> = {
      $top: (args.top as number) || 50,
      $skip: (args.skip as number) || 0,
    };
    if (filters.length) params.$filter = this.buildFilter(filters);
    return this.odataGet('API_PURCHASEORDER_PROCESS_SRV', 'A_PurchaseOrder', params);
  }

  private async getPurchaseOrder(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.purchase_order) return { content: [{ type: 'text', text: 'purchase_order is required' }], isError: true };
    return this.odataGet('API_PURCHASEORDER_PROCESS_SRV', `A_PurchaseOrder('${encodeURIComponent(args.purchase_order as string)}')`, { $expand: 'to_PurchaseOrderItem' });
  }

  private async createPurchaseOrder(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.supplier || !args.company_code || !args.purchasing_organization || !args.purchasing_group) {
      return { content: [{ type: 'text', text: 'supplier, company_code, purchasing_organization, and purchasing_group are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      Supplier: args.supplier,
      CompanyCode: args.company_code,
      PurchasingOrganization: args.purchasing_organization,
      PurchasingGroup: args.purchasing_group,
    };
    if (args.currency) body.DocumentCurrency = args.currency;
    return this.odataPost('API_PURCHASEORDER_PROCESS_SRV', 'A_PurchaseOrder', body);
  }

  private async listSalesOrders(args: Record<string, unknown>): Promise<ToolResult> {
    const filters: string[] = [];
    if (args.sold_to_party) filters.push(`SoldToParty eq '${encodeURIComponent(args.sold_to_party as string)}'`);
    if (args.sales_organization) filters.push(`SalesOrganization eq '${encodeURIComponent(args.sales_organization as string)}'`);
    if (args.creation_date_from) filters.push(`CreationDate ge datetime'${encodeURIComponent(args.creation_date_from as string)}T00:00:00'`);
    if (args.creation_date_to) filters.push(`CreationDate le datetime'${encodeURIComponent(args.creation_date_to as string)}T23:59:59'`);
    const params: Record<string, string | number | undefined> = {
      $top: (args.top as number) || 50,
      $skip: (args.skip as number) || 0,
    };
    if (filters.length) params.$filter = this.buildFilter(filters);
    return this.odataGet('API_SALES_ORDER_SRV', 'A_SalesOrder', params);
  }

  private async getSalesOrder(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.sales_order) return { content: [{ type: 'text', text: 'sales_order is required' }], isError: true };
    return this.odataGet('API_SALES_ORDER_SRV', `A_SalesOrder('${encodeURIComponent(args.sales_order as string)}')`, { $expand: 'to_Item' });
  }

  private async listSupplierInvoices(args: Record<string, unknown>): Promise<ToolResult> {
    const filters: string[] = [];
    if (args.supplier) filters.push(`InvoicingParty eq '${encodeURIComponent(args.supplier as string)}'`);
    if (args.company_code) filters.push(`CompanyCode eq '${encodeURIComponent(args.company_code as string)}'`);
    if (args.posting_date_from) filters.push(`PostingDate ge datetime'${encodeURIComponent(args.posting_date_from as string)}T00:00:00'`);
    if (args.posting_date_to) filters.push(`PostingDate le datetime'${encodeURIComponent(args.posting_date_to as string)}T23:59:59'`);
    const params: Record<string, string | number | undefined> = {
      $top: (args.top as number) || 50,
      $skip: (args.skip as number) || 0,
    };
    if (filters.length) params.$filter = this.buildFilter(filters);
    return this.odataGet('API_SUPPLIERINVOICE_PROCESS_SRV', 'A_SupplierInvoice', params);
  }

  private async getSupplierInvoice(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.supplier_invoice || !args.fiscal_year) {
      return { content: [{ type: 'text', text: 'supplier_invoice and fiscal_year are required' }], isError: true };
    }
    return this.odataGet('API_SUPPLIERINVOICE_PROCESS_SRV', `A_SupplierInvoice(SupplierInvoice='${encodeURIComponent(args.supplier_invoice as string)}',FiscalYear='${encodeURIComponent(args.fiscal_year as string)}')`, {});
  }

  private async listCustomers(args: Record<string, unknown>): Promise<ToolResult> {
    const filters: string[] = [];
    if (args.customer_name) filters.push(`substringof('${encodeURIComponent(args.customer_name as string)}', CustomerName)`);
    if (args.country) filters.push(`Country eq '${encodeURIComponent(args.country as string)}'`);
    const params: Record<string, string | number | undefined> = {
      $top: (args.top as number) || 50,
      $skip: (args.skip as number) || 0,
    };
    if (filters.length) params.$filter = this.buildFilter(filters);
    return this.odataGet('API_BUSINESS_PARTNER', 'A_Customer', params);
  }

  private async getCustomer(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.customer) return { content: [{ type: 'text', text: 'customer is required' }], isError: true };
    return this.odataGet('API_BUSINESS_PARTNER', `A_Customer('${encodeURIComponent(args.customer as string)}')`, {});
  }

  private async listSuppliers(args: Record<string, unknown>): Promise<ToolResult> {
    const filters: string[] = [];
    if (args.supplier_name) filters.push(`substringof('${encodeURIComponent(args.supplier_name as string)}', SupplierName)`);
    if (args.country) filters.push(`Country eq '${encodeURIComponent(args.country as string)}'`);
    const params: Record<string, string | number | undefined> = {
      $top: (args.top as number) || 50,
      $skip: (args.skip as number) || 0,
    };
    if (filters.length) params.$filter = this.buildFilter(filters);
    return this.odataGet('API_BUSINESS_PARTNER', 'A_Supplier', params);
  }

  private async getSupplier(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.supplier) return { content: [{ type: 'text', text: 'supplier is required' }], isError: true };
    return this.odataGet('API_BUSINESS_PARTNER', `A_Supplier('${encodeURIComponent(args.supplier as string)}')`, {});
  }

  private async listMaterials(args: Record<string, unknown>): Promise<ToolResult> {
    const filters: string[] = [];
    if (args.material_type) filters.push(`MaterialType eq '${encodeURIComponent(args.material_type as string)}'`);
    const params: Record<string, string | number | undefined> = {
      $top: (args.top as number) || 50,
      $skip: (args.skip as number) || 0,
    };
    if (filters.length) params.$filter = this.buildFilter(filters);
    if (args.plant) params.$expand = 'to_Plant';
    return this.odataGet('API_PRODUCT_SRV', 'A_Product', params);
  }

  private async getMaterial(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.material) return { content: [{ type: 'text', text: 'material is required' }], isError: true };
    return this.odataGet('API_PRODUCT_SRV', `A_Product('${encodeURIComponent(args.material as string)}')`, { $expand: 'to_Description,to_Plant' });
  }

  private async listCostCenters(args: Record<string, unknown>): Promise<ToolResult> {
    const filters: string[] = [];
    if (args.controlling_area) filters.push(`ControllingArea eq '${encodeURIComponent(args.controlling_area as string)}'`);
    if (args.cost_center_name) filters.push(`substringof('${encodeURIComponent(args.cost_center_name as string)}', CostCenterName)`);
    const params: Record<string, string | number | undefined> = {
      $top: (args.top as number) || 50,
      $skip: (args.skip as number) || 0,
    };
    if (filters.length) params.$filter = this.buildFilter(filters);
    return this.odataGet('API_COSTCENTER_SRV', 'A_CostCenter', params);
  }

  private async getProfitCenter(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.controlling_area || !args.profit_center) {
      return { content: [{ type: 'text', text: 'controlling_area and profit_center are required' }], isError: true };
    }
    return this.odataGet('API_PROFITCENTER_SRV', `A_ProfitCenter(ControllingArea='${encodeURIComponent(args.controlling_area as string)}',ProfitCenter='${encodeURIComponent(args.profit_center as string)}')`, {});
  }
}

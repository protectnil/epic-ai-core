/**
 * Avalara AvaTax MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/avadev/mcp — transport: streamable-HTTP (type: "http"),
//   auth: OAuth 2.1. Endpoint: https://mcp.avalara.com/avatax. Published by Avalara (avadev org),
//   last commit 2025-11-21, actively maintained. Covers: calculate_tax, get_transaction,
//   get_transactions, get_nexus_definitions, get_nexus, create_nexus, get_companies, and more.
//   Tool count not fully verifiable from public docs (page truncates); confirmed 7+ tools.
// Also noted: https://github.com/CDataSoftware/avalara-avatax-mcp-server-by-cdata —
//   CData read-only JDBC bridge, NOT Avalara-official, requires a CData license.
// Our adapter covers 24 tools (full AvaTax REST v2 surface). Vendor MCP covers write/read
//   operations but tool count is smaller than our REST coverage.
// Recommendation: use-both — Avalara's official MCP handles core tax calculation and nexus
//   reads via OAuth 2.1 (streamable-HTTP). Our REST adapter covers void, adjust, address
//   resolution, items, locations, certificates, customers, and tax rate lookups not confirmed
//   in the MCP. Use MCP for OAuth-authenticated workflows; REST adapter for air-gapped or
//   full-API-surface deployments.
//
// Base URL:
//   Production: https://rest.avatax.com
//   Sandbox:    https://sandbox-rest.avatax.com
// Auth: HTTP Basic — accountId (account number) : licenseKey
//   Header: Authorization: Basic base64(accountId:licenseKey)
// Docs: https://developer.avalara.com/api-reference/avatax/rest/v2/
// Rate limits: Not published. Enterprise plans have dedicated limits; contact Avalara support.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface AvalaraConfig {
  accountId: string;    // Avalara account number (numeric string)
  licenseKey: string;   // Avalara license key
  baseUrl?: string;     // default: https://rest.avatax.com; pass https://sandbox-rest.avatax.com for sandbox
}

export class AvalaraMCPServer extends MCPAdapterBase {
  private readonly authHeader: string;
  private readonly baseUrl: string;

  constructor(config: AvalaraConfig) {
    super();
    this.authHeader = 'Basic ' + Buffer.from(`${config.accountId}:${config.licenseKey}`).toString('base64');
    this.baseUrl = config.baseUrl ?? 'https://rest.avatax.com';
  }

  get tools(): ToolDefinition[] {
    return [
      // ── Utilities ─────────────────────────────────────────────────────────
      {
        name: 'ping',
        description: 'Test connectivity to the Avalara AvaTax API and verify that credentials are valid',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      // ── Transactions ──────────────────────────────────────────────────────
      {
        name: 'calculate_tax',
        description: 'Create a SalesOrder (uncommitted) transaction to estimate tax in real time without recording it to the ledger',
        inputSchema: {
          type: 'object',
          properties: {
            company_code: { type: 'string', description: 'Avalara company code (default: DEFAULT)' },
            customer_code: { type: 'string', description: 'Unique customer identifier' },
            date: { type: 'string', description: 'Transaction date in YYYY-MM-DD format (default: today)' },
            lines: {
              type: 'array',
              description: 'Line items: each item is { number, quantity, amount, itemCode, description, taxCode }',
            },
            ship_from: { type: 'object', description: 'Origin address: { line1, city, region, postalCode, country }' },
            ship_to: { type: 'object', description: 'Destination address: { line1, city, region, postalCode, country }' },
            currency_code: { type: 'string', description: 'ISO 4217 currency code (default: USD)' },
            customer_usage_type: { type: 'string', description: 'Entity use code for exemption (e.g. A for federal government)' },
          },
          required: ['customer_code', 'lines', 'ship_from', 'ship_to'],
        },
      },
      {
        name: 'commit_transaction',
        description: 'Create and commit a SalesInvoice transaction to the Avalara ledger for tax reporting and remittance',
        inputSchema: {
          type: 'object',
          properties: {
            company_code: { type: 'string', description: 'Avalara company code (default: DEFAULT)' },
            transaction_code: { type: 'string', description: 'Unique transaction code for later adjustment or void' },
            customer_code: { type: 'string', description: 'Unique customer identifier' },
            date: { type: 'string', description: 'Transaction date in YYYY-MM-DD format (default: today)' },
            lines: {
              type: 'array',
              description: 'Line items: each item is { number, quantity, amount, itemCode, description, taxCode }',
            },
            ship_from: { type: 'object', description: 'Origin address: { line1, city, region, postalCode, country }' },
            ship_to: { type: 'object', description: 'Destination address: { line1, city, region, postalCode, country }' },
            currency_code: { type: 'string', description: 'ISO 4217 currency code (default: USD)' },
            customer_usage_type: { type: 'string', description: 'Entity use code for exemption' },
            purchase_order_no: { type: 'string', description: 'Purchase order number for reference' },
          },
          required: ['transaction_code', 'customer_code', 'lines', 'ship_from', 'ship_to'],
        },
      },
      {
        name: 'get_transaction',
        description: 'Retrieve a committed transaction by company code and transaction code',
        inputSchema: {
          type: 'object',
          properties: {
            company_code: { type: 'string', description: 'Avalara company code' },
            transaction_code: { type: 'string', description: 'Transaction code to retrieve' },
          },
          required: ['company_code', 'transaction_code'],
        },
      },
      {
        name: 'list_transactions',
        description: 'List committed transactions for a company with optional date range and OData filter',
        inputSchema: {
          type: 'object',
          properties: {
            company_code: { type: 'string', description: 'Avalara company code' },
            start_date: { type: 'string', description: 'Filter transactions on or after this date (YYYY-MM-DD)' },
            end_date: { type: 'string', description: 'Filter transactions on or before this date (YYYY-MM-DD)' },
            filter: { type: 'string', description: 'OData-style filter expression (e.g. status eq Committed)' },
            top: { type: 'number', description: 'Maximum records to return (default: 20, max: 1000)' },
            skip: { type: 'number', description: 'Records to skip for pagination (default: 0)' },
            order_by: { type: 'string', description: 'Sort field (e.g. date desc)' },
          },
          required: ['company_code'],
        },
      },
      {
        name: 'void_transaction',
        description: 'Void a committed transaction by company code and transaction code with a void reason code',
        inputSchema: {
          type: 'object',
          properties: {
            company_code: { type: 'string', description: 'Avalara company code' },
            transaction_code: { type: 'string', description: 'Transaction code to void' },
            void_reason: {
              type: 'string',
              description: 'Void reason: DocVoided, DocDeleted, DocReversed, AdjustmentCancelled (default: DocVoided)',
            },
          },
          required: ['company_code', 'transaction_code'],
        },
      },
      {
        name: 'adjust_transaction',
        description: 'Create or adjust a committed transaction (createoradjust) — replaces an existing transaction with updated line items',
        inputSchema: {
          type: 'object',
          properties: {
            company_code: { type: 'string', description: 'Avalara company code (default: DEFAULT)' },
            transaction_code: { type: 'string', description: 'Transaction code to adjust or create' },
            customer_code: { type: 'string', description: 'Unique customer identifier' },
            date: { type: 'string', description: 'Transaction date in YYYY-MM-DD format' },
            lines: {
              type: 'array',
              description: 'Revised line items: each item is { number, quantity, amount, itemCode, description, taxCode }',
            },
            ship_from: { type: 'object', description: 'Origin address: { line1, city, region, postalCode, country }' },
            ship_to: { type: 'object', description: 'Destination address: { line1, city, region, postalCode, country }' },
            currency_code: { type: 'string', description: 'ISO 4217 currency code (default: USD)' },
            adjust_reason: {
              type: 'number',
              description: 'Adjustment reason code (0=NotAdjusted, 1=SourcingIssue, 2=ReconciledWithGeneralLedger, etc.)',
            },
          },
          required: ['transaction_code', 'customer_code', 'lines', 'ship_from', 'ship_to'],
        },
      },
      // ── Addresses ─────────────────────────────────────────────────────────
      {
        name: 'resolve_address',
        description: 'Validate and standardize a postal address using Avalara address validation, returning rooftop-level geocodes',
        inputSchema: {
          type: 'object',
          properties: {
            line1: { type: 'string', description: 'Street address line 1' },
            line2: { type: 'string', description: 'Street address line 2 (optional)' },
            city: { type: 'string', description: 'City name' },
            region: { type: 'string', description: 'State/province/region code (e.g. CA, TX)' },
            postal_code: { type: 'string', description: 'Postal/ZIP code' },
            country: { type: 'string', description: 'ISO 3166-1 alpha-2 country code (e.g. US, CA)' },
            text_case: { type: 'string', description: 'Output casing: Upper or Mixed (default: Upper)' },
          },
          required: ['line1', 'city', 'region', 'postal_code', 'country'],
        },
      },
      // ── Companies ─────────────────────────────────────────────────────────
      {
        name: 'list_companies',
        description: 'List all companies configured in the Avalara account with optional OData filter and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            filter: { type: 'string', description: 'OData-style filter expression (e.g. isDefault eq true)' },
            top: { type: 'number', description: 'Maximum records to return (default: 20)' },
            skip: { type: 'number', description: 'Records to skip for pagination (default: 0)' },
            include: { type: 'string', description: 'Comma-separated related objects to include (e.g. Nexus,Settings)' },
          },
        },
      },
      {
        name: 'get_company',
        description: 'Get full details of a specific Avalara company by its numeric company ID',
        inputSchema: {
          type: 'object',
          properties: {
            company_id: { type: 'number', description: 'Avalara company ID (integer)' },
            include: { type: 'string', description: 'Comma-separated related objects to include (e.g. Nexus,Settings)' },
          },
          required: ['company_id'],
        },
      },
      // ── Nexus ─────────────────────────────────────────────────────────────
      {
        name: 'list_nexus',
        description: 'List nexus registrations for a company — jurisdictions where the company has tax collection obligations',
        inputSchema: {
          type: 'object',
          properties: {
            company_code: { type: 'string', description: 'Avalara company code' },
            filter: { type: 'string', description: 'OData-style filter (e.g. country eq US and region eq CA)' },
            top: { type: 'number', description: 'Maximum records to return (default: 20)' },
            skip: { type: 'number', description: 'Records to skip for pagination (default: 0)' },
          },
          required: ['company_code'],
        },
      },
      {
        name: 'create_nexus',
        description: 'Declare nexus for a company in a specific country and region',
        inputSchema: {
          type: 'object',
          properties: {
            company_code: { type: 'string', description: 'Avalara company code' },
            country: { type: 'string', description: 'ISO 3166-1 alpha-2 country code (e.g. US)' },
            region: { type: 'string', description: 'State/province/region code (e.g. CA)' },
            nexus_type_id: {
              type: 'string',
              description: 'Nexus type: SalesOrSellersUseTax, SalesTax, SellersUseTax (default: SalesOrSellersUseTax)',
            },
            effective_date: { type: 'string', description: 'Nexus effective date (YYYY-MM-DD)' },
          },
          required: ['company_code', 'country', 'region'],
        },
      },
      {
        name: 'delete_nexus',
        description: 'Remove a nexus registration from a company by company code and nexus ID',
        inputSchema: {
          type: 'object',
          properties: {
            company_code: { type: 'string', description: 'Avalara company code' },
            nexus_id: { type: 'number', description: 'Nexus record ID to delete' },
          },
          required: ['company_code', 'nexus_id'],
        },
      },
      // ── Items ─────────────────────────────────────────────────────────────
      {
        name: 'list_items',
        description: 'List item (product) tax code mappings for a company with optional filter',
        inputSchema: {
          type: 'object',
          properties: {
            company_code: { type: 'string', description: 'Avalara company code' },
            filter: { type: 'string', description: 'OData-style filter (e.g. itemCode eq WIDGET001)' },
            top: { type: 'number', description: 'Maximum records to return (default: 20)' },
            skip: { type: 'number', description: 'Records to skip for pagination (default: 0)' },
          },
          required: ['company_code'],
        },
      },
      {
        name: 'create_item',
        description: 'Create a new item (product/SKU) record with a tax code mapping for a company',
        inputSchema: {
          type: 'object',
          properties: {
            company_code: { type: 'string', description: 'Avalara company code' },
            item_code: { type: 'string', description: 'Your internal product/SKU code' },
            tax_code: { type: 'string', description: 'Avalara tax code to assign (e.g. P0000000 for tangible personal property)' },
            description: { type: 'string', description: 'Human-readable item description' },
          },
          required: ['company_code', 'item_code', 'tax_code'],
        },
      },
      {
        name: 'delete_item',
        description: 'Delete an item (product/SKU) record from a company by item ID',
        inputSchema: {
          type: 'object',
          properties: {
            company_code: { type: 'string', description: 'Avalara company code' },
            item_id: { type: 'number', description: 'Item record ID to delete' },
          },
          required: ['company_code', 'item_id'],
        },
      },
      // ── Locations ─────────────────────────────────────────────────────────
      {
        name: 'list_locations',
        description: 'List business locations registered for a company (used for sourcing rules and nexus)',
        inputSchema: {
          type: 'object',
          properties: {
            company_code: { type: 'string', description: 'Avalara company code' },
            filter: { type: 'string', description: 'OData-style filter expression' },
            top: { type: 'number', description: 'Maximum records to return (default: 20)' },
            skip: { type: 'number', description: 'Records to skip for pagination (default: 0)' },
          },
          required: ['company_code'],
        },
      },
      // ── Tax Codes & Rates ─────────────────────────────────────────────────
      {
        name: 'list_tax_codes',
        description: 'Search the Avalara system tax code definitions library by filter or free text',
        inputSchema: {
          type: 'object',
          properties: {
            filter: { type: 'string', description: 'OData-style filter (e.g. taxCode eq P0000000)' },
            top: { type: 'number', description: 'Maximum records to return (default: 20)' },
            skip: { type: 'number', description: 'Records to skip for pagination (default: 0)' },
          },
        },
      },
      {
        name: 'get_tax_rates_by_address',
        description: 'Get the combined tax rate (state + county + city + special) for a specific address',
        inputSchema: {
          type: 'object',
          properties: {
            line1: { type: 'string', description: 'Street address line 1' },
            city: { type: 'string', description: 'City name' },
            region: { type: 'string', description: 'State/province/region code (e.g. CA)' },
            postal_code: { type: 'string', description: 'Postal/ZIP code' },
            country: { type: 'string', description: 'ISO 3166-1 alpha-2 country code (default: US)' },
          },
          required: ['line1', 'city', 'region', 'postal_code'],
        },
      },
      {
        name: 'get_tax_rates_by_postal_code',
        description: 'Get estimated tax rates for a postal code and country — faster than address lookup but less precise',
        inputSchema: {
          type: 'object',
          properties: {
            country: { type: 'string', description: 'ISO 3166-1 alpha-2 country code (e.g. US)' },
            postal_code: { type: 'string', description: 'Postal/ZIP code' },
          },
          required: ['country', 'postal_code'],
        },
      },
      // ── Customers ─────────────────────────────────────────────────────────
      {
        name: 'list_customers',
        description: 'List customers registered for a company, optionally with their active exemption certificates',
        inputSchema: {
          type: 'object',
          properties: {
            company_code: { type: 'string', description: 'Avalara company code' },
            filter: { type: 'string', description: 'OData-style filter (e.g. customerCode eq CUST001)' },
            include: { type: 'string', description: 'Include related data: certificates (to fetch associated certificates)' },
            top: { type: 'number', description: 'Maximum records to return (default: 20)' },
            skip: { type: 'number', description: 'Records to skip for pagination (default: 0)' },
          },
          required: ['company_code'],
        },
      },
      {
        name: 'get_customer',
        description: 'Get details of a specific customer by company code and customer code',
        inputSchema: {
          type: 'object',
          properties: {
            company_code: { type: 'string', description: 'Avalara company code' },
            customer_code: { type: 'string', description: 'Customer code identifier' },
            include: { type: 'string', description: 'Include related data: certificates' },
          },
          required: ['company_code', 'customer_code'],
        },
      },
      // ── Certificates ──────────────────────────────────────────────────────
      {
        name: 'list_certificates',
        description: 'List exemption certificates for a company with optional filter and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            company_code: { type: 'string', description: 'Avalara company code' },
            filter: { type: 'string', description: 'OData-style filter (e.g. status eq Complete)' },
            top: { type: 'number', description: 'Maximum records to return (default: 20)' },
            skip: { type: 'number', description: 'Records to skip for pagination (default: 0)' },
            include: { type: 'string', description: 'Include related data: customers, exposure_zone' },
          },
          required: ['company_code'],
        },
      },
      {
        name: 'list_customer_certificates',
        description: 'List all valid exemption certificates associated with a specific customer',
        inputSchema: {
          type: 'object',
          properties: {
            company_code: { type: 'string', description: 'Avalara company code' },
            customer_code: { type: 'string', description: 'Customer code identifier' },
            include: { type: 'string', description: 'Include related data: certificates' },
          },
          required: ['company_code', 'customer_code'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'ping':
          return await this.ping();
        case 'calculate_tax':
          return await this.calculateTax(args);
        case 'commit_transaction':
          return await this.commitTransaction(args);
        case 'get_transaction':
          return await this.getTransaction(args);
        case 'list_transactions':
          return await this.listTransactions(args);
        case 'void_transaction':
          return await this.voidTransaction(args);
        case 'adjust_transaction':
          return await this.adjustTransaction(args);
        case 'resolve_address':
          return await this.resolveAddress(args);
        case 'list_companies':
          return await this.listCompanies(args);
        case 'get_company':
          return await this.getCompany(args);
        case 'list_nexus':
          return await this.listNexus(args);
        case 'create_nexus':
          return await this.createNexus(args);
        case 'delete_nexus':
          return await this.deleteNexus(args);
        case 'list_items':
          return await this.listItems(args);
        case 'create_item':
          return await this.createItem(args);
        case 'delete_item':
          return await this.deleteItem(args);
        case 'list_locations':
          return await this.listLocations(args);
        case 'list_tax_codes':
          return await this.listTaxCodes(args);
        case 'get_tax_rates_by_address':
          return await this.getTaxRatesByAddress(args);
        case 'get_tax_rates_by_postal_code':
          return await this.getTaxRatesByPostalCode(args);
        case 'list_customers':
          return await this.listCustomers(args);
        case 'get_customer':
          return await this.getCustomer(args);
        case 'list_certificates':
          return await this.listCertificates(args);
        case 'list_customer_certificates':
          return await this.listCustomerCertificates(args);
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

  private get headers(): Record<string, string> {
    return {
      Authorization: this.authHeader,
      'Content-Type': 'application/json',
    };
  }

  private async fetchJSON(url: string, init?: RequestInit): Promise<ToolResult> {
    const response = await this.fetchWithRetry(url, { headers: this.headers, ...init });
    if (!response.ok) {
      let errText: string;
      try {
        const err = await response.json() as { error?: { message?: string } };
        errText = err.error?.message ?? `${response.status} ${response.statusText}`;
      } catch {
        errText = `${response.status} ${response.statusText}`;
      }
      return { content: [{ type: 'text', text: `API error: ${errText}` }], isError: true };
    }
    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new Error(`Avalara returned non-JSON response (HTTP ${response.status})`);
    }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private odataParams(args: Record<string, unknown>, extra?: URLSearchParams): URLSearchParams {
    const p = extra ?? new URLSearchParams();
    if (args.filter) p.set('$filter', String(args.filter));
    if (args.top) p.set('$top', String(args.top));
    if (args.skip) p.set('$skip', String(args.skip));
    if (args.order_by) p.set('$orderBy', String(args.order_by));
    if (args.include) p.set('$include', String(args.include));
    return p;
  }

  private async ping(): Promise<ToolResult> {
    return this.fetchJSON(`${this.baseUrl}/api/v2/utilities/ping`);
  }

  private buildTransactionBody(
    type: 'SalesOrder' | 'SalesInvoice',
    args: Record<string, unknown>,
    commit: boolean,
  ): Record<string, unknown> {
    const today = new Date().toISOString().slice(0, 10);
    return {
      type,
      companyCode: (args.company_code as string) ?? 'DEFAULT',
      ...(args.transaction_code ? { code: args.transaction_code } : {}),
      date: (args.date as string) ?? today,
      customerCode: args.customer_code,
      currencyCode: (args.currency_code as string) ?? 'USD',
      commit,
      ...(args.customer_usage_type ? { customerUsageType: args.customer_usage_type } : {}),
      ...(args.purchase_order_no ? { purchaseOrderNo: args.purchase_order_no } : {}),
      addresses: { shipFrom: args.ship_from, shipTo: args.ship_to },
      lines: args.lines,
    };
  }

  private async calculateTax(args: Record<string, unknown>): Promise<ToolResult> {
    const body = this.buildTransactionBody('SalesOrder', args, false);
    return this.fetchJSON(`${this.baseUrl}/api/v2/transactions/create`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  private async commitTransaction(args: Record<string, unknown>): Promise<ToolResult> {
    const body = this.buildTransactionBody('SalesInvoice', args, true);
    return this.fetchJSON(`${this.baseUrl}/api/v2/transactions/createoradjust`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  private async getTransaction(args: Record<string, unknown>): Promise<ToolResult> {
    const cc = encodeURIComponent(String(args.company_code));
    const tc = encodeURIComponent(String(args.transaction_code));
    return this.fetchJSON(`${this.baseUrl}/api/v2/companies/${cc}/transactions/${tc}`);
  }

  private async listTransactions(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.odataParams(args);
    if (args.start_date || args.end_date) {
      const parts: string[] = [];
      if (args.start_date) parts.push(`date ge ${String(args.start_date)}`);
      if (args.end_date) parts.push(`date le ${String(args.end_date)}`);
      const combined = parts.join(' and ');
      params.set('$filter', params.get('$filter') ? `(${params.get('$filter')}) and ${combined}` : combined);
    }
    const qs = params.toString();
    const cc = encodeURIComponent(String(args.company_code));
    return this.fetchJSON(`${this.baseUrl}/api/v2/companies/${cc}/transactions${qs ? `?${qs}` : ''}`);
  }

  private async voidTransaction(args: Record<string, unknown>): Promise<ToolResult> {
    const cc = encodeURIComponent(String(args.company_code));
    const tc = encodeURIComponent(String(args.transaction_code));
    return this.fetchJSON(`${this.baseUrl}/api/v2/companies/${cc}/transactions/${tc}/void`, {
      method: 'POST',
      body: JSON.stringify({ code: (args.void_reason as string) ?? 'DocVoided' }),
    });
  }

  private async adjustTransaction(args: Record<string, unknown>): Promise<ToolResult> {
    const today = new Date().toISOString().slice(0, 10);
    const body: Record<string, unknown> = {
      type: 'SalesInvoice',
      companyCode: (args.company_code as string) ?? 'DEFAULT',
      code: args.transaction_code,
      date: (args.date as string) ?? today,
      customerCode: args.customer_code,
      currencyCode: (args.currency_code as string) ?? 'USD',
      commit: true,
      ...(args.adjust_reason !== undefined ? { adjustmentReason: args.adjust_reason } : {}),
      addresses: { shipFrom: args.ship_from, shipTo: args.ship_to },
      lines: args.lines,
    };
    return this.fetchJSON(`${this.baseUrl}/api/v2/transactions/createoradjust`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  private async resolveAddress(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams({
      line1: String(args.line1),
      city: String(args.city),
      region: String(args.region),
      postalCode: String(args.postal_code),
      country: String(args.country),
    });
    if (args.line2) params.set('line2', String(args.line2));
    if (args.text_case) params.set('textCase', String(args.text_case));
    return this.fetchJSON(`${this.baseUrl}/api/v2/addresses/resolve?${params}`);
  }

  private async listCompanies(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.odataParams(args);
    const qs = params.toString();
    return this.fetchJSON(`${this.baseUrl}/api/v2/companies${qs ? `?${qs}` : ''}`);
  }

  private async getCompany(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.include) params.set('$include', String(args.include));
    const qs = params.toString();
    return this.fetchJSON(`${this.baseUrl}/api/v2/companies/${encodeURIComponent(String(args.company_id))}${qs ? `?${qs}` : ''}`);
  }

  private async listNexus(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.odataParams(args);
    const qs = params.toString();
    const cc = encodeURIComponent(String(args.company_code));
    return this.fetchJSON(`${this.baseUrl}/api/v2/companies/${cc}/nexus${qs ? `?${qs}` : ''}`);
  }

  private async createNexus(args: Record<string, unknown>): Promise<ToolResult> {
    const body = [{
      country: args.country,
      region: args.region,
      nexusTypeId: (args.nexus_type_id as string) ?? 'SalesOrSellersUseTax',
      ...(args.effective_date ? { effectiveDate: args.effective_date } : {}),
    }];
    const cc = encodeURIComponent(String(args.company_code));
    return this.fetchJSON(`${this.baseUrl}/api/v2/companies/${cc}/nexus`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  private async deleteNexus(args: Record<string, unknown>): Promise<ToolResult> {
    const cc = encodeURIComponent(String(args.company_code));
    return this.fetchJSON(
      `${this.baseUrl}/api/v2/companies/${cc}/nexus/${encodeURIComponent(String(args.nexus_id))}`,
      { method: 'DELETE' },
    );
  }

  private async listItems(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.odataParams(args);
    const qs = params.toString();
    const cc = encodeURIComponent(String(args.company_code));
    return this.fetchJSON(`${this.baseUrl}/api/v2/companies/${cc}/items${qs ? `?${qs}` : ''}`);
  }

  private async createItem(args: Record<string, unknown>): Promise<ToolResult> {
    const body = [{
      itemCode: args.item_code,
      taxCode: args.tax_code,
      description: args.description ?? '',
    }];
    const cc = encodeURIComponent(String(args.company_code));
    return this.fetchJSON(`${this.baseUrl}/api/v2/companies/${cc}/items`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  private async deleteItem(args: Record<string, unknown>): Promise<ToolResult> {
    const cc = encodeURIComponent(String(args.company_code));
    return this.fetchJSON(
      `${this.baseUrl}/api/v2/companies/${cc}/items/${encodeURIComponent(String(args.item_id))}`,
      { method: 'DELETE' },
    );
  }

  private async listLocations(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.odataParams(args);
    const qs = params.toString();
    const cc = encodeURIComponent(String(args.company_code));
    return this.fetchJSON(`${this.baseUrl}/api/v2/companies/${cc}/locations${qs ? `?${qs}` : ''}`);
  }

  private async listTaxCodes(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.odataParams(args);
    const qs = params.toString();
    return this.fetchJSON(`${this.baseUrl}/api/v2/definitions/taxcodes${qs ? `?${qs}` : ''}`);
  }

  private async getTaxRatesByAddress(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams({
      line1: String(args.line1),
      city: String(args.city),
      region: String(args.region),
      postalCode: String(args.postal_code),
      country: (args.country as string) ?? 'US',
    });
    return this.fetchJSON(`${this.baseUrl}/api/v2/taxrates/byaddress?${params}`);
  }

  private async getTaxRatesByPostalCode(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams({
      country: String(args.country),
      postalCode: String(args.postal_code),
    });
    return this.fetchJSON(`${this.baseUrl}/api/v2/taxrates/bypostalcode?${params}`);
  }

  private async listCustomers(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.odataParams(args);
    const qs = params.toString();
    const cc = encodeURIComponent(String(args.company_code));
    return this.fetchJSON(`${this.baseUrl}/api/v2/companies/${cc}/customers${qs ? `?${qs}` : ''}`);
  }

  private async getCustomer(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.include) params.set('$include', String(args.include));
    const qs = params.toString();
    const cc = encodeURIComponent(String(args.company_code));
    const cust = encodeURIComponent(String(args.customer_code));
    return this.fetchJSON(`${this.baseUrl}/api/v2/companies/${cc}/customers/${cust}${qs ? `?${qs}` : ''}`);
  }

  private async listCertificates(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.odataParams(args);
    const qs = params.toString();
    const cc = encodeURIComponent(String(args.company_code));
    return this.fetchJSON(`${this.baseUrl}/api/v2/companies/${cc}/certificates${qs ? `?${qs}` : ''}`);
  }

  private async listCustomerCertificates(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.include) params.set('$include', String(args.include));
    const qs = params.toString();
    const cc = encodeURIComponent(String(args.company_code));
    const cust = encodeURIComponent(String(args.customer_code));
    return this.fetchJSON(`${this.baseUrl}/api/v2/companies/${cc}/customers/${cust}/certificates${qs ? `?${qs}` : ''}`);
  }

  static catalog() {
    return {
      name: 'avalara',
      displayName: 'Avalara AvaTax',
      version: '1.0.0',
      category: 'finance' as const,
      keywords: ['avalara', 'avatax', 'tax', 'sales tax', 'vat', 'nexus', 'exemption', 'certificate', 'transaction', 'compliance', 'tax calculation', 'address validation'],
      toolNames: [
        'ping',
        'calculate_tax', 'commit_transaction', 'get_transaction', 'list_transactions',
        'void_transaction', 'adjust_transaction',
        'resolve_address',
        'list_companies', 'get_company',
        'list_nexus', 'create_nexus', 'delete_nexus',
        'list_items', 'create_item', 'delete_item',
        'list_locations',
        'list_tax_codes', 'get_tax_rates_by_address', 'get_tax_rates_by_postal_code',
        'list_customers', 'get_customer',
        'list_certificates', 'list_customer_certificates',
      ],
      description: 'Sales tax compliance via Avalara AvaTax: calculate and commit transactions, validate addresses, manage nexus registrations, items, customers, and exemption certificates.',
      author: 'protectnil' as const,
    };
  }
}

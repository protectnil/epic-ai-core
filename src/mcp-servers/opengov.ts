/**
 * OpenGov MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28 — no official OpenGov MCP server exists.
//   A community Socrata/OpenGov MCP server (github.com/srobbin/opengov-mcp-server) targets
//   public Socrata data portals (open civic data), not the OpenGov Procurement & Planning platform.
//   That server is unrelated to the OpenGov SaaS API covered here.
// Our adapter covers: 18 tools. Vendor MCP covers: 0 tools (no official MCP).
// Recommendation: use-rest-api — no official MCP server exists.
//
// Base URL: https://api.procurement.opengov.com/gateway
// Auth: Token header — include API key as `Token: YOUR_API_KEY`.
//   API keys are generated in the OpenGov Control Panel / Settings (Procurement suite)
//   or via the Developer Portal: https://developer.opengov.com/docs/app-management/api-key
// Docs: https://developer.opengov.com/docs/quickstart
//       https://developer.opengov.com/docs/app-management/api-key
//       https://opengov-procurement.redoc.ly/ (full ReDoc API reference)
// Rate limits: Not publicly documented; apply standard retry-on-429 backoff

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface OpenGovConfig {
  apiKey: string;
  baseUrl?: string;
}

export class OpenGovMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: OpenGovConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = (config.baseUrl || 'https://api.procurement.opengov.com/gateway').replace(/\/$/, '');
  }

  static catalog() {
    return {
      name: 'opengov',
      displayName: 'OpenGov',
      version: '1.0.0',
      category: 'misc',
      keywords: [
        'opengov', 'government', 'budget', 'procurement', 'requisition',
        'contract', 'purchase-order', 'vendor', 'supplier', 'public-sector',
        'local-government', 'municipal', 'spending', 'transparency',
      ],
      toolNames: [
        'list_datasets', 'get_dataset',
        'list_contract_orders', 'get_contract_order', 'search_contract_orders',
        'list_requisitions', 'get_requisition', 'search_requisitions',
        'list_vendors', 'get_vendor', 'search_vendors',
        'list_bids', 'get_bid',
        'list_solicitations', 'get_solicitation', 'search_solicitations',
        'list_line_items', 'get_line_item',
      ],
      description: 'OpenGov government procurement and budgeting: query contract orders, requisitions, vendors, bids, solicitations, and procurement datasets for local and state government.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_datasets',
        description: 'List available procurement datasets and schemas in the OpenGov instance',
        inputSchema: {
          type: 'object',
          properties: {
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            per_page: {
              type: 'number',
              description: 'Results per page (default: 25)',
            },
          },
        },
      },
      {
        name: 'get_dataset',
        description: 'Get metadata and schema details for a specific OpenGov dataset by its ID',
        inputSchema: {
          type: 'object',
          properties: {
            dataset_id: {
              type: 'string',
              description: 'Dataset identifier',
            },
          },
          required: ['dataset_id'],
        },
      },
      {
        name: 'list_contract_orders',
        description: 'List contract orders (purchase orders issued against contracts) with optional status and date filters',
        inputSchema: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              description: 'Filter by order status: draft, pending_approval, approved, issued, closed, cancelled',
            },
            from_date: {
              type: 'string',
              description: 'Filter orders created on or after this date (YYYY-MM-DD)',
            },
            to_date: {
              type: 'string',
              description: 'Filter orders created on or before this date (YYYY-MM-DD)',
            },
            page: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
            per_page: {
              type: 'number',
              description: 'Results per page (default: 25)',
            },
          },
        },
      },
      {
        name: 'get_contract_order',
        description: 'Get full details of a specific contract order including line items, vendor, and approval history',
        inputSchema: {
          type: 'object',
          properties: {
            order_id: {
              type: 'string',
              description: 'Contract order ID',
            },
          },
          required: ['order_id'],
        },
      },
      {
        name: 'search_contract_orders',
        description: 'Search contract orders by vendor name, amount range, department, or keyword',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Keyword search across order title, description, and vendor name',
            },
            vendor_name: {
              type: 'string',
              description: 'Filter by vendor name (partial match)',
            },
            min_amount: {
              type: 'number',
              description: 'Minimum total order amount in dollars',
            },
            max_amount: {
              type: 'number',
              description: 'Maximum total order amount in dollars',
            },
            page: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
            per_page: {
              type: 'number',
              description: 'Results per page (default: 25)',
            },
          },
        },
      },
      {
        name: 'list_requisitions',
        description: 'List purchase requisitions (internal purchase requests) with optional status and date filters',
        inputSchema: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              description: 'Filter by status: draft, submitted, pending_approval, approved, rejected, cancelled',
            },
            from_date: {
              type: 'string',
              description: 'Filter requisitions submitted on or after this date (YYYY-MM-DD)',
            },
            to_date: {
              type: 'string',
              description: 'Filter requisitions submitted on or before this date (YYYY-MM-DD)',
            },
            page: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
            per_page: {
              type: 'number',
              description: 'Results per page (default: 25)',
            },
          },
        },
      },
      {
        name: 'get_requisition',
        description: 'Get full details of a specific requisition including line items, requester, and approval workflow status',
        inputSchema: {
          type: 'object',
          properties: {
            requisition_id: {
              type: 'string',
              description: 'Requisition ID',
            },
          },
          required: ['requisition_id'],
        },
      },
      {
        name: 'search_requisitions',
        description: 'Search purchase requisitions by requester, department, description, or amount range',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Keyword search across requisition title and description',
            },
            department: {
              type: 'string',
              description: 'Filter by department or cost center name',
            },
            min_amount: {
              type: 'number',
              description: 'Minimum total requisition amount in dollars',
            },
            max_amount: {
              type: 'number',
              description: 'Maximum total requisition amount in dollars',
            },
            page: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
            per_page: {
              type: 'number',
              description: 'Results per page (default: 25)',
            },
          },
        },
      },
      {
        name: 'list_vendors',
        description: 'List registered vendors/suppliers in the OpenGov system with optional status filter',
        inputSchema: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              description: 'Filter by vendor status: active, inactive, pending, suspended',
            },
            page: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
            per_page: {
              type: 'number',
              description: 'Results per page (default: 25)',
            },
          },
        },
      },
      {
        name: 'get_vendor',
        description: 'Get detailed profile of a specific vendor including contact information, certifications, and bid history',
        inputSchema: {
          type: 'object',
          properties: {
            vendor_id: {
              type: 'string',
              description: 'Vendor ID',
            },
          },
          required: ['vendor_id'],
        },
      },
      {
        name: 'search_vendors',
        description: 'Search vendors by name, certification type, commodity code, or business category',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Vendor name or keyword search',
            },
            certification: {
              type: 'string',
              description: 'Filter by certification type (e.g. MBE, WBE, SBE, DBE, DVBE)',
            },
            commodity_code: {
              type: 'string',
              description: 'Filter by commodity or NIGP code',
            },
            page: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
            per_page: {
              type: 'number',
              description: 'Results per page (default: 25)',
            },
          },
        },
      },
      {
        name: 'list_bids',
        description: 'List bids received for a solicitation, including vendor name, amount, and award status',
        inputSchema: {
          type: 'object',
          properties: {
            solicitation_id: {
              type: 'string',
              description: 'Solicitation ID to list bids for',
            },
            page: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
            per_page: {
              type: 'number',
              description: 'Results per page (default: 25)',
            },
          },
          required: ['solicitation_id'],
        },
      },
      {
        name: 'get_bid',
        description: 'Get full details of a specific bid response including line items, attachments, and evaluation scores',
        inputSchema: {
          type: 'object',
          properties: {
            bid_id: {
              type: 'string',
              description: 'Bid ID',
            },
          },
          required: ['bid_id'],
        },
      },
      {
        name: 'list_solicitations',
        description: 'List procurement solicitations (RFPs, RFQs, ITBs) with optional status, type, and date filters',
        inputSchema: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              description: 'Filter by status: draft, open, closed, awarded, cancelled',
            },
            solicitation_type: {
              type: 'string',
              description: 'Filter by type: RFP (Request for Proposal), RFQ (Request for Quote), ITB (Invitation to Bid)',
            },
            from_date: {
              type: 'string',
              description: 'Filter solicitations opened on or after this date (YYYY-MM-DD)',
            },
            to_date: {
              type: 'string',
              description: 'Filter solicitations closed on or before this date (YYYY-MM-DD)',
            },
            page: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
            per_page: {
              type: 'number',
              description: 'Results per page (default: 25)',
            },
          },
        },
      },
      {
        name: 'get_solicitation',
        description: 'Get full details of a specific solicitation including scope, attachments, questions, and award information',
        inputSchema: {
          type: 'object',
          properties: {
            solicitation_id: {
              type: 'string',
              description: 'Solicitation ID',
            },
          },
          required: ['solicitation_id'],
        },
      },
      {
        name: 'search_solicitations',
        description: 'Search solicitations by title, department, commodity code, or keyword across open and historical solicitations',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Keyword search across solicitation title and description',
            },
            department: {
              type: 'string',
              description: 'Filter by issuing department or agency name',
            },
            commodity_code: {
              type: 'string',
              description: 'Filter by NIGP commodity code',
            },
            page: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
            per_page: {
              type: 'number',
              description: 'Results per page (default: 25)',
            },
          },
        },
      },
      {
        name: 'list_line_items',
        description: 'List line items for a specific contract order or requisition with amounts and account codes',
        inputSchema: {
          type: 'object',
          properties: {
            order_id: {
              type: 'string',
              description: 'Contract order ID to list line items for',
            },
            requisition_id: {
              type: 'string',
              description: 'Requisition ID to list line items for (use instead of order_id)',
            },
          },
        },
      },
      {
        name: 'get_line_item',
        description: 'Get details of a specific line item including quantity, unit price, account code, and remaining balance',
        inputSchema: {
          type: 'object',
          properties: {
            line_item_id: {
              type: 'string',
              description: 'Line item ID',
            },
          },
          required: ['line_item_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_datasets':
          return this.listDatasets(args);
        case 'get_dataset':
          return this.getDataset(args);
        case 'list_contract_orders':
          return this.listContractOrders(args);
        case 'get_contract_order':
          return this.getContractOrder(args);
        case 'search_contract_orders':
          return this.searchContractOrders(args);
        case 'list_requisitions':
          return this.listRequisitions(args);
        case 'get_requisition':
          return this.getRequisition(args);
        case 'search_requisitions':
          return this.searchRequisitions(args);
        case 'list_vendors':
          return this.listVendors(args);
        case 'get_vendor':
          return this.getVendor(args);
        case 'search_vendors':
          return this.searchVendors(args);
        case 'list_bids':
          return this.listBids(args);
        case 'get_bid':
          return this.getBid(args);
        case 'list_solicitations':
          return this.listSolicitations(args);
        case 'get_solicitation':
          return this.getSolicitation(args);
        case 'search_solicitations':
          return this.searchSolicitations(args);
        case 'list_line_items':
          return this.listLineItems(args);
        case 'get_line_item':
          return this.getLineItem(args);
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
      Token: this.apiKey,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  private async get(path: string, params?: Record<string, string>): Promise<ToolResult> {
    const qs = params && Object.keys(params).length > 0 ? '?' + new URLSearchParams(params).toString() : '';
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}${qs}`, { headers: this.headers });
    if (!response.ok) {
      const text = await response.text();
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText} — ${text}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private paginationParams(args: Record<string, unknown>): Record<string, string> {
    return {
      'page[number]': String((args.page as number) ?? 1),
      'page[size]': String((args.per_page as number) ?? 25),
    };
  }

  private async listDatasets(args: Record<string, unknown>): Promise<ToolResult> {
    return this.get('/datasets/v1', this.paginationParams(args));
  }

  private async getDataset(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.dataset_id) return { content: [{ type: 'text', text: 'dataset_id is required' }], isError: true };
    return this.get(`/datasets/v1/${encodeURIComponent(args.dataset_id as string)}`);
  }

  private async listContractOrders(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = this.paginationParams(args);
    if (args.status) params['filter[status]'] = args.status as string;
    if (args.from_date) params['filter[created_at][gte]'] = args.from_date as string;
    if (args.to_date) params['filter[created_at][lte]'] = args.to_date as string;
    return this.get('/contract-orders/v1', params);
  }

  private async getContractOrder(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.order_id) return { content: [{ type: 'text', text: 'order_id is required' }], isError: true };
    return this.get(`/contract-orders/v1/${encodeURIComponent(args.order_id as string)}`);
  }

  private async searchContractOrders(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = this.paginationParams(args);
    if (args.query) params['filter[query]'] = args.query as string;
    if (args.vendor_name) params['filter[vendor_name]'] = args.vendor_name as string;
    if (args.min_amount !== undefined) params['filter[amount][gte]'] = String(args.min_amount);
    if (args.max_amount !== undefined) params['filter[amount][lte]'] = String(args.max_amount);
    return this.get('/contract-orders/v1', params);
  }

  private async listRequisitions(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = this.paginationParams(args);
    if (args.status) params['filter[status]'] = args.status as string;
    if (args.from_date) params['filter[submitted_at][gte]'] = args.from_date as string;
    if (args.to_date) params['filter[submitted_at][lte]'] = args.to_date as string;
    return this.get('/requisitions/v1', params);
  }

  private async getRequisition(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.requisition_id) return { content: [{ type: 'text', text: 'requisition_id is required' }], isError: true };
    return this.get(`/requisitions/v1/${encodeURIComponent(args.requisition_id as string)}`);
  }

  private async searchRequisitions(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = this.paginationParams(args);
    if (args.query) params['filter[query]'] = args.query as string;
    if (args.department) params['filter[department]'] = args.department as string;
    if (args.min_amount !== undefined) params['filter[amount][gte]'] = String(args.min_amount);
    if (args.max_amount !== undefined) params['filter[amount][lte]'] = String(args.max_amount);
    return this.get('/requisitions/v1', params);
  }

  private async listVendors(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = this.paginationParams(args);
    if (args.status) params['filter[status]'] = args.status as string;
    return this.get('/vendors/v1', params);
  }

  private async getVendor(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.vendor_id) return { content: [{ type: 'text', text: 'vendor_id is required' }], isError: true };
    return this.get(`/vendors/v1/${encodeURIComponent(args.vendor_id as string)}`);
  }

  private async searchVendors(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = this.paginationParams(args);
    if (args.query) params['filter[query]'] = args.query as string;
    if (args.certification) params['filter[certification]'] = args.certification as string;
    if (args.commodity_code) params['filter[commodity_code]'] = args.commodity_code as string;
    return this.get('/vendors/v1', params);
  }

  private async listBids(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.solicitation_id) return { content: [{ type: 'text', text: 'solicitation_id is required' }], isError: true };
    const params: Record<string, string> = {
      ...this.paginationParams(args),
      'filter[solicitation_id]': args.solicitation_id as string,
    };
    return this.get('/bids/v1', params);
  }

  private async getBid(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.bid_id) return { content: [{ type: 'text', text: 'bid_id is required' }], isError: true };
    return this.get(`/bids/v1/${encodeURIComponent(args.bid_id as string)}`);
  }

  private async listSolicitations(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = this.paginationParams(args);
    if (args.status) params['filter[status]'] = args.status as string;
    if (args.solicitation_type) params['filter[type]'] = args.solicitation_type as string;
    if (args.from_date) params['filter[open_date][gte]'] = args.from_date as string;
    if (args.to_date) params['filter[close_date][lte]'] = args.to_date as string;
    return this.get('/solicitations/v1', params);
  }

  private async getSolicitation(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.solicitation_id) return { content: [{ type: 'text', text: 'solicitation_id is required' }], isError: true };
    return this.get(`/solicitations/v1/${encodeURIComponent(args.solicitation_id as string)}`);
  }

  private async searchSolicitations(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = this.paginationParams(args);
    if (args.query) params['filter[query]'] = args.query as string;
    if (args.department) params['filter[department]'] = args.department as string;
    if (args.commodity_code) params['filter[commodity_code]'] = args.commodity_code as string;
    return this.get('/solicitations/v1', params);
  }

  private async listLineItems(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.order_id && !args.requisition_id) return { content: [{ type: 'text', text: 'order_id or requisition_id is required' }], isError: true };
    if (args.order_id) return this.get(`/contract-orders/v1/${encodeURIComponent(args.order_id as string)}/line-items`);
    return this.get(`/requisitions/v1/${encodeURIComponent(args.requisition_id as string)}/line-items`);
  }

  private async getLineItem(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.line_item_id) return { content: [{ type: 'text', text: 'line_item_id is required' }], isError: true };
    return this.get(`/line-items/v1/${encodeURIComponent(args.line_item_id as string)}`);
  }
}

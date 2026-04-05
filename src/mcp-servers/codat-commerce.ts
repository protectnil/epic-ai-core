/**
 * Codat Commerce MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// No official Codat Commerce MCP server was found on GitHub.
// This adapter wraps the Codat Commerce REST API (v2.1.0), which standardizes
// access to commerce and POS data across 11+ platforms (Shopify, Square, etc.).
//
// Base URL: https://api.codat.io
// Auth: API key — Authorization header as "Basic <base64-encoded-api-key>"
//   The API key is base64-encoded and sent as a Basic auth header (no username/password pair).
//   Example: Authorization: Basic <btoa(apiKey)>
// Docs: https://docs.codat.io/commerce-api/overview
// Rate limits: Not formally documented; see https://docs.codat.io/using-the-api/rate-limits

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface CodatCommerceConfig {
  apiKey: string;
  baseUrl?: string;
}

export class CodatCommerceMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: CodatCommerceConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.codat.io';
  }

  static catalog() {
    return {
      name: 'codat-commerce',
      displayName: 'Codat Commerce',
      version: '1.0.0',
      category: 'commerce',
      keywords: [
        'codat', 'commerce', 'ecommerce', 'pos', 'point of sale', 'shopify', 'square',
        'orders', 'payments', 'customers', 'products', 'transactions', 'disputes',
        'tax', 'inventory', 'locations', 'payment methods', 'product categories',
        'standardized data', 'smb', 'fintech', 'merchant',
      ],
      toolNames: [
        'list_customers',
        'list_disputes',
        'get_company_info',
        'list_locations',
        'list_orders',
        'list_payment_methods',
        'list_payments',
        'list_product_categories',
        'list_products',
        'list_tax_components',
        'list_transactions',
      ],
      description: 'Codat Commerce: standardized access to commerce/POS data across Shopify, Square, and 9+ platforms — orders, payments, customers, products, disputes, and transactions.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_customers',
        description: 'List all commerce customers for a company and data connection, with pagination and optional filtering',
        inputSchema: {
          type: 'object',
          properties: {
            companyId: {
              type: 'string',
              description: 'Unique identifier (UUID) for the SMB company in Codat (required)',
            },
            connectionId: {
              type: 'string',
              description: 'Unique identifier (UUID) for the company data connection (required)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1, minimum: 0)',
            },
            pageSize: {
              type: 'number',
              description: 'Number of records per page (default: 100, max: 5000)',
            },
            query: {
              type: 'string',
              description: 'Codat query string to filter results (see https://docs.codat.io/using-the-api/querying)',
            },
            orderBy: {
              type: 'string',
              description: 'Field to order results by, e.g. "-modifiedDate" for descending',
            },
          },
          required: ['companyId', 'connectionId'],
        },
      },
      {
        name: 'list_disputes',
        description: 'List commerce disputes for a company and data connection, with pagination and optional filtering',
        inputSchema: {
          type: 'object',
          properties: {
            companyId: {
              type: 'string',
              description: 'Unique identifier (UUID) for the SMB company in Codat (required)',
            },
            connectionId: {
              type: 'string',
              description: 'Unique identifier (UUID) for the company data connection (required)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1, minimum: 0)',
            },
            pageSize: {
              type: 'number',
              description: 'Number of records per page (default: 100, max: 5000)',
            },
            query: {
              type: 'string',
              description: 'Codat query string to filter results',
            },
            orderBy: {
              type: 'string',
              description: 'Field to order results by, e.g. "-modifiedDate" for descending',
            },
          },
          required: ['companyId', 'connectionId'],
        },
      },
      {
        name: 'get_company_info',
        description: 'Retrieve commerce platform company info including addresses, tax registration, and social media details',
        inputSchema: {
          type: 'object',
          properties: {
            companyId: {
              type: 'string',
              description: 'Unique identifier (UUID) for the SMB company in Codat (required)',
            },
            connectionId: {
              type: 'string',
              description: 'Unique identifier (UUID) for the company data connection (required)',
            },
          },
          required: ['companyId', 'connectionId'],
        },
      },
      {
        name: 'list_locations',
        description: 'List commerce platform locations where products are held or orders were placed, with pagination',
        inputSchema: {
          type: 'object',
          properties: {
            companyId: {
              type: 'string',
              description: 'Unique identifier (UUID) for the SMB company in Codat (required)',
            },
            connectionId: {
              type: 'string',
              description: 'Unique identifier (UUID) for the company data connection (required)',
            },
          },
          required: ['companyId', 'connectionId'],
        },
      },
      {
        name: 'list_orders',
        description: 'List orders placed or held on the linked commerce platform, with pagination and filtering',
        inputSchema: {
          type: 'object',
          properties: {
            companyId: {
              type: 'string',
              description: 'Unique identifier (UUID) for the SMB company in Codat (required)',
            },
            connectionId: {
              type: 'string',
              description: 'Unique identifier (UUID) for the company data connection (required)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1, minimum: 0)',
            },
            pageSize: {
              type: 'number',
              description: 'Number of records per page (default: 100, max: 5000)',
            },
            query: {
              type: 'string',
              description: 'Codat query string to filter results',
            },
            orderBy: {
              type: 'string',
              description: 'Field to order results by, e.g. "-modifiedDate" for descending',
            },
          },
          required: ['companyId', 'connectionId'],
        },
      },
      {
        name: 'list_payment_methods',
        description: 'List payment methods (card, cash, online) available in the linked commerce platform',
        inputSchema: {
          type: 'object',
          properties: {
            companyId: {
              type: 'string',
              description: 'Unique identifier (UUID) for the SMB company in Codat (required)',
            },
            connectionId: {
              type: 'string',
              description: 'Unique identifier (UUID) for the company data connection (required)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1, minimum: 0)',
            },
            pageSize: {
              type: 'number',
              description: 'Number of records per page (default: 100, max: 5000)',
            },
            query: {
              type: 'string',
              description: 'Codat query string to filter results',
            },
            orderBy: {
              type: 'string',
              description: 'Field to order results by, e.g. "-modifiedDate" for descending',
            },
          },
          required: ['companyId', 'connectionId'],
        },
      },
      {
        name: 'list_payments',
        description: 'List commerce payments for a company and data connection, with pagination and optional filtering',
        inputSchema: {
          type: 'object',
          properties: {
            companyId: {
              type: 'string',
              description: 'Unique identifier (UUID) for the SMB company in Codat (required)',
            },
            connectionId: {
              type: 'string',
              description: 'Unique identifier (UUID) for the company data connection (required)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1, minimum: 0)',
            },
            pageSize: {
              type: 'number',
              description: 'Number of records per page (default: 100, max: 5000)',
            },
            query: {
              type: 'string',
              description: 'Codat query string to filter results',
            },
            orderBy: {
              type: 'string',
              description: 'Field to order results by, e.g. "-modifiedDate" for descending',
            },
          },
          required: ['companyId', 'connectionId'],
        },
      },
      {
        name: 'list_product_categories',
        description: 'List product categories from the commerce platform, used to classify products by type or tax profile',
        inputSchema: {
          type: 'object',
          properties: {
            companyId: {
              type: 'string',
              description: 'Unique identifier (UUID) for the SMB company in Codat (required)',
            },
            connectionId: {
              type: 'string',
              description: 'Unique identifier (UUID) for the company data connection (required)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1, minimum: 0)',
            },
            pageSize: {
              type: 'number',
              description: 'Number of records per page (default: 100, max: 5000)',
            },
            query: {
              type: 'string',
              description: 'Codat query string to filter results',
            },
            orderBy: {
              type: 'string',
              description: 'Field to order results by, e.g. "-modifiedDate" for descending',
            },
          },
          required: ['companyId', 'connectionId'],
        },
      },
      {
        name: 'list_products',
        description: 'List products from the linked commerce platform, with pagination and optional filtering',
        inputSchema: {
          type: 'object',
          properties: {
            companyId: {
              type: 'string',
              description: 'Unique identifier (UUID) for the SMB company in Codat (required)',
            },
            connectionId: {
              type: 'string',
              description: 'Unique identifier (UUID) for the company data connection (required)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1, minimum: 0)',
            },
            pageSize: {
              type: 'number',
              description: 'Number of records per page (default: 100, max: 5000)',
            },
            query: {
              type: 'string',
              description: 'Codat query string to filter results',
            },
            orderBy: {
              type: 'string',
              description: 'Field to order results by, e.g. "-modifiedDate" for descending',
            },
          },
          required: ['companyId', 'connectionId'],
        },
      },
      {
        name: 'list_tax_components',
        description: 'List tax components from the commerce platform, used for tax calculation on orders and products',
        inputSchema: {
          type: 'object',
          properties: {
            companyId: {
              type: 'string',
              description: 'Unique identifier (UUID) for the SMB company in Codat (required)',
            },
            connectionId: {
              type: 'string',
              description: 'Unique identifier (UUID) for the company data connection (required)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1, minimum: 0)',
            },
            pageSize: {
              type: 'number',
              description: 'Number of records per page (default: 100, max: 5000)',
            },
            query: {
              type: 'string',
              description: 'Codat query string to filter results',
            },
            orderBy: {
              type: 'string',
              description: 'Field to order results by, e.g. "-modifiedDate" for descending',
            },
          },
          required: ['companyId', 'connectionId'],
        },
      },
      {
        name: 'list_transactions',
        description: 'List commerce transactions for a company and data connection, with pagination and optional filtering',
        inputSchema: {
          type: 'object',
          properties: {
            companyId: {
              type: 'string',
              description: 'Unique identifier (UUID) for the SMB company in Codat (required)',
            },
            connectionId: {
              type: 'string',
              description: 'Unique identifier (UUID) for the company data connection (required)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1, minimum: 0)',
            },
            pageSize: {
              type: 'number',
              description: 'Number of records per page (default: 100, max: 5000)',
            },
            query: {
              type: 'string',
              description: 'Codat query string to filter results',
            },
            orderBy: {
              type: 'string',
              description: 'Field to order results by, e.g. "-modifiedDate" for descending',
            },
          },
          required: ['companyId', 'connectionId'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_customers':
          return this.listResource(args, 'commerce-customers');
        case 'list_disputes':
          return this.listResource(args, 'commerce-disputes');
        case 'get_company_info':
          return this.getCompanyInfo(args);
        case 'list_locations':
          return this.listResource(args, 'commerce-locations');
        case 'list_orders':
          return this.listResource(args, 'commerce-orders');
        case 'list_payment_methods':
          return this.listResource(args, 'commerce-paymentMethods');
        case 'list_payments':
          return this.listResource(args, 'commerce-payments');
        case 'list_product_categories':
          return this.listResource(args, 'commerce-productCategories');
        case 'list_products':
          return this.listResource(args, 'commerce-products');
        case 'list_tax_components':
          return this.listResource(args, 'commerce-taxComponents');
        case 'list_transactions':
          return this.listResource(args, 'commerce-transactions');
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

  private buildAuthHeader(): string {
    // Codat uses Basic auth with just the API key (base64 encoded), no username:password pair
    return `Basic ${btoa(this.apiKey)}`;
  }

  private async listResource(args: Record<string, unknown>, resource: string): Promise<ToolResult> {
    const companyId = args.companyId as string;
    const connectionId = args.connectionId as string;

    if (!companyId || !connectionId) {
      return {
        content: [{ type: 'text', text: 'Missing required parameters: companyId and connectionId' }],
        isError: true,
      };
    }

    const params = new URLSearchParams();
    const page = (args.page as number) ?? 1;
    params.set('page', String(page));

    if (args.pageSize !== undefined) {
      params.set('pageSize', String(args.pageSize as number));
    }
    if (args.query) {
      params.set('query', args.query as string);
    }
    if (args.orderBy) {
      params.set('orderBy', args.orderBy as string);
    }

    const url = `${this.baseUrl}/companies/${encodeURIComponent(companyId)}/connections/${encodeURIComponent(connectionId)}/data/${resource}?${params.toString()}`;

    const response = await this.fetchWithRetry(url, {
      headers: {
        'Authorization': this.buildAuthHeader(),
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }

    const data = await response.json();
    const text = JSON.stringify(data, null, 2);
    const truncated = text.length > 10_000
      ? text.slice(0, 10_000) + '\n... [truncated, ' + text.length + ' total chars]'
      : text;

    return {
      content: [{ type: 'text', text: truncated }],
      isError: false,
    };
  }

  private async getCompanyInfo(args: Record<string, unknown>): Promise<ToolResult> {
    const companyId = args.companyId as string;
    const connectionId = args.connectionId as string;

    if (!companyId || !connectionId) {
      return {
        content: [{ type: 'text', text: 'Missing required parameters: companyId and connectionId' }],
        isError: true,
      };
    }

    const url = `${this.baseUrl}/companies/${encodeURIComponent(companyId)}/connections/${encodeURIComponent(connectionId)}/data/commerce-info`;

    const response = await this.fetchWithRetry(url, {
      headers: {
        'Authorization': this.buildAuthHeader(),
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }

    const data = await response.json();
    const text = JSON.stringify(data, null, 2);
    const truncated = text.length > 10_000
      ? text.slice(0, 10_000) + '\n... [truncated, ' + text.length + ' total chars]'
      : text;

    return {
      content: [{ type: 'text', text: truncated }],
      isError: false,
    };
  }
}

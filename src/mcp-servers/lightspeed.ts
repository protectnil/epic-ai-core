/**
 * Lightspeed MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28.
// No official Lightspeed HQ MCP server was found on GitHub or npmjs.com. Community forks exist but
// none are vendor-published, actively maintained, expose 10+ tools, or use stdio/streamable-HTTP transport.
// Our adapter covers: 18 tools. Vendor MCP covers: 0 tools.
// Recommendation: use-rest-api — no qualifying MCP server exists.
//
// Base URL: https://api.lightspeedapp.com/API/V3/Account/{accountId}
//   All resource endpoints follow the pattern: /API/V3/Account/{accountId}/{Resource}.json
//   (e.g. /API/V3/Account/123/Item.json, /API/V3/Account/123/Sale/456.json)
// Auth: OAuth2 — access token passed as Bearer header. Token obtained via Authorization Code Grant.
//   Scopes defined at https://developers.lightspeedhq.com/retail/authentication/scopes/
// Docs: https://developers.lightspeedhq.com/retail/introduction/introduction/
// Rate limits: Leaky-bucket algorithm. Time-of-day buckets:
//   09:00–18:00 EST: bucket=60, drip=1 unit/sec
//   18:00–21:00 EST: bucket=60, drip=1 unit/sec
//   21:00–09:00 EST: bucket=180, drip=3 units/sec
//   GET requests cost 1 unit; PUT/POST/DELETE cost 10 units. HTTP 429 on overflow.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface LightspeedConfig {
  accessToken: string;
  accountId: string;
  baseUrl?: string;
}

export class LightspeedMCPServer extends MCPAdapterBase {
  private readonly accessToken: string;
  private readonly accountId: string;
  private readonly baseUrl: string;

  constructor(config: LightspeedConfig) {
    super();
    this.accessToken = config.accessToken;
    this.accountId = config.accountId;
    this.baseUrl = config.baseUrl || 'https://api.lightspeedapp.com/API/V3';
  }

  static catalog() {
    return {
      name: 'lightspeed',
      displayName: 'Lightspeed',
      version: '1.0.0',
      category: 'commerce',
      keywords: [
        'lightspeed', 'pos', 'point of sale', 'retail', 'restaurant', 'inventory',
        'item', 'sale', 'customer', 'order', 'employee', 'category', 'product',
        'stock', 'transaction', 'receipt', 'register',
      ],
      toolNames: [
        'list_items', 'get_item', 'create_item', 'update_item', 'delete_item',
        'list_sales', 'get_sale', 'create_sale',
        'list_customers', 'get_customer', 'create_customer', 'update_customer',
        'list_categories', 'get_category',
        'list_inventory', 'get_inventory_item',
        'list_employees', 'get_employee',
      ],
      description: 'Lightspeed Retail POS: manage inventory items, sales transactions, customers, categories, and employees via the R-Series V3 API.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_items',
        description: 'List inventory items in the Lightspeed account with optional filters for category, archived status, and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of items to return (default: 100, max: 100)',
            },
            offset: {
              type: 'number',
              description: 'Number of records to skip for pagination (default: 0)',
            },
            archived: {
              type: 'boolean',
              description: 'Include archived items (default: false)',
            },
            categoryID: {
              type: 'string',
              description: 'Filter items by category ID',
            },
            load_relations: {
              type: 'string',
              description: 'Comma-separated list of related objects to load, e.g. "Category,ItemImages" (default: "all")',
            },
          },
        },
      },
      {
        name: 'get_item',
        description: 'Get detailed information about a single inventory item by its item ID',
        inputSchema: {
          type: 'object',
          properties: {
            item_id: {
              type: 'string',
              description: 'The Lightspeed item ID (itemID field)',
            },
            load_relations: {
              type: 'string',
              description: 'Comma-separated related objects to include, e.g. "Category,ItemImages"',
            },
          },
          required: ['item_id'],
        },
      },
      {
        name: 'create_item',
        description: 'Create a new inventory item in Lightspeed with description, price, and category',
        inputSchema: {
          type: 'object',
          properties: {
            description: {
              type: 'string',
              description: 'Display name/description of the item',
            },
            defaultCost: {
              type: 'string',
              description: 'Cost of the item (e.g. "9.99")',
            },
            avgCost: {
              type: 'string',
              description: 'Average cost of the item (e.g. "9.99")',
            },
            taxClassID: {
              type: 'string',
              description: 'Tax class ID to apply to this item',
            },
            categoryID: {
              type: 'string',
              description: 'Category ID to assign this item to',
            },
          },
          required: ['description'],
        },
      },
      {
        name: 'update_item',
        description: 'Update an existing inventory item fields such as description, price, or category',
        inputSchema: {
          type: 'object',
          properties: {
            item_id: {
              type: 'string',
              description: 'The Lightspeed item ID to update',
            },
            description: {
              type: 'string',
              description: 'New display name/description',
            },
            defaultCost: {
              type: 'string',
              description: 'Updated cost (e.g. "12.50")',
            },
            categoryID: {
              type: 'string',
              description: 'New category ID',
            },
            archived: {
              type: 'boolean',
              description: 'Set true to archive the item (soft delete)',
            },
          },
          required: ['item_id'],
        },
      },
      {
        name: 'delete_item',
        description: 'Archive (soft-delete) an inventory item by setting its archived flag to true',
        inputSchema: {
          type: 'object',
          properties: {
            item_id: {
              type: 'string',
              description: 'The Lightspeed item ID to archive',
            },
          },
          required: ['item_id'],
        },
      },
      {
        name: 'list_sales',
        description: 'List sales/transactions with optional filters for date range, customer, register, and status',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of sales to return (default: 100, max: 100)',
            },
            offset: {
              type: 'number',
              description: 'Number of records to skip for pagination (default: 0)',
            },
            timeStamp: {
              type: 'string',
              description: 'Filter sales modified after this ISO 8601 timestamp (e.g. ">,2024-01-01T00:00:00+00:00")',
            },
            customerID: {
              type: 'string',
              description: 'Filter sales by customer ID',
            },
            completed: {
              type: 'boolean',
              description: 'Filter by completion status (true=completed sales only)',
            },
            load_relations: {
              type: 'string',
              description: 'Related objects to load (e.g. "SaleLines,Customer")',
            },
          },
        },
      },
      {
        name: 'get_sale',
        description: 'Get full details of a single sale/transaction by its sale ID including line items',
        inputSchema: {
          type: 'object',
          properties: {
            sale_id: {
              type: 'string',
              description: 'The Lightspeed sale ID (saleID field)',
            },
            load_relations: {
              type: 'string',
              description: 'Related objects to include (default: "all")',
            },
          },
          required: ['sale_id'],
        },
      },
      {
        name: 'create_sale',
        description: 'Create a new sale/transaction record with customer association and register assignment',
        inputSchema: {
          type: 'object',
          properties: {
            registerID: {
              type: 'string',
              description: 'Register ID to associate this sale with',
            },
            customerID: {
              type: 'string',
              description: 'Customer ID for this sale (optional — use 0 for walk-in)',
            },
            employeeID: {
              type: 'string',
              description: 'Employee ID who is creating the sale',
            },
            note: {
              type: 'string',
              description: 'Optional note for the sale record',
            },
          },
          required: ['registerID'],
        },
      },
      {
        name: 'list_customers',
        description: 'List customers with optional filters for search term, email, and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of customers to return (default: 100, max: 100)',
            },
            offset: {
              type: 'number',
              description: 'Number of records to skip (default: 0)',
            },
            firstName: {
              type: 'string',
              description: 'Filter by first name (supports wildcards, e.g. "John%")',
            },
            lastName: {
              type: 'string',
              description: 'Filter by last name',
            },
            email: {
              type: 'string',
              description: 'Filter by email address (exact match)',
            },
            archived: {
              type: 'boolean',
              description: 'Include archived customers (default: false)',
            },
          },
        },
      },
      {
        name: 'get_customer',
        description: 'Get detailed profile information for a single customer by customer ID',
        inputSchema: {
          type: 'object',
          properties: {
            customer_id: {
              type: 'string',
              description: 'The Lightspeed customer ID (customerID field)',
            },
            load_relations: {
              type: 'string',
              description: 'Related objects to include (e.g. "Contact,CreditAccount")',
            },
          },
          required: ['customer_id'],
        },
      },
      {
        name: 'create_customer',
        description: 'Create a new customer record in Lightspeed with contact and account information',
        inputSchema: {
          type: 'object',
          properties: {
            firstName: {
              type: 'string',
              description: 'Customer first name',
            },
            lastName: {
              type: 'string',
              description: 'Customer last name',
            },
            email: {
              type: 'string',
              description: 'Customer email address',
            },
            phone: {
              type: 'string',
              description: 'Customer phone number',
            },
            note: {
              type: 'string',
              description: 'Internal note on the customer record',
            },
          },
          required: ['firstName', 'lastName'],
        },
      },
      {
        name: 'update_customer',
        description: 'Update an existing customer record fields such as name, email, or phone',
        inputSchema: {
          type: 'object',
          properties: {
            customer_id: {
              type: 'string',
              description: 'The Lightspeed customer ID to update',
            },
            firstName: {
              type: 'string',
              description: 'Updated first name',
            },
            lastName: {
              type: 'string',
              description: 'Updated last name',
            },
            email: {
              type: 'string',
              description: 'Updated email address',
            },
            phone: {
              type: 'string',
              description: 'Updated phone number',
            },
          },
          required: ['customer_id'],
        },
      },
      {
        name: 'list_categories',
        description: 'List all product categories in the Lightspeed account with pagination',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of categories to return (default: 100, max: 100)',
            },
            offset: {
              type: 'number',
              description: 'Number of records to skip (default: 0)',
            },
          },
        },
      },
      {
        name: 'get_category',
        description: 'Get details of a single product category by category ID',
        inputSchema: {
          type: 'object',
          properties: {
            category_id: {
              type: 'string',
              description: 'The Lightspeed category ID (categoryID field)',
            },
          },
          required: ['category_id'],
        },
      },
      {
        name: 'list_inventory',
        description: 'List inventory records showing stock counts across shops for all items',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of inventory records to return (default: 100, max: 100)',
            },
            offset: {
              type: 'number',
              description: 'Number of records to skip (default: 0)',
            },
            itemID: {
              type: 'string',
              description: 'Filter to a specific item ID',
            },
            shopID: {
              type: 'string',
              description: 'Filter to a specific shop/location ID',
            },
          },
        },
      },
      {
        name: 'get_inventory_item',
        description: 'Get inventory stock count for a specific item at a specific shop location',
        inputSchema: {
          type: 'object',
          properties: {
            item_id: {
              type: 'string',
              description: 'The Lightspeed item ID',
            },
            shop_id: {
              type: 'string',
              description: 'The Lightspeed shop/location ID',
            },
          },
          required: ['item_id', 'shop_id'],
        },
      },
      {
        name: 'list_employees',
        description: 'List all employees in the Lightspeed account with role and contact information',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of employees to return (default: 100, max: 100)',
            },
            offset: {
              type: 'number',
              description: 'Number of records to skip (default: 0)',
            },
            archived: {
              type: 'boolean',
              description: 'Include archived employees (default: false)',
            },
          },
        },
      },
      {
        name: 'get_employee',
        description: 'Get detailed profile for a single employee by their employee ID',
        inputSchema: {
          type: 'object',
          properties: {
            employee_id: {
              type: 'string',
              description: 'The Lightspeed employee ID (employeeID field)',
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
        case 'list_items':
          return this.listItems(args);
        case 'get_item':
          return this.getItem(args);
        case 'create_item':
          return this.createItem(args);
        case 'update_item':
          return this.updateItem(args);
        case 'delete_item':
          return this.deleteItem(args);
        case 'list_sales':
          return this.listSales(args);
        case 'get_sale':
          return this.getSale(args);
        case 'create_sale':
          return this.createSale(args);
        case 'list_customers':
          return this.listCustomers(args);
        case 'get_customer':
          return this.getCustomer(args);
        case 'create_customer':
          return this.createCustomer(args);
        case 'update_customer':
          return this.updateCustomer(args);
        case 'list_categories':
          return this.listCategories(args);
        case 'get_category':
          return this.getCategory(args);
        case 'list_inventory':
          return this.listInventory(args);
        case 'get_inventory_item':
          return this.getInventoryItem(args);
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
      Authorization: `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
    };
  }

  private get acctBase(): string {
    return `${this.baseUrl}/Account/${this.accountId}`;
  }

  private async apiGet(path: string, params: Record<string, string> = {}): Promise<ToolResult> {
    const qs = new URLSearchParams(params).toString();
    const url = `${this.acctBase}/${path}.json${qs ? '?' + qs : ''}`;
    const response = await this.fetchWithRetry(url, { method: 'GET', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apiPost(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const url = `${this.acctBase}/${path}.json`;
    const response = await this.fetchWithRetry(url, { method: 'POST', headers: this.headers, body: JSON.stringify(body) });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apiPut(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const url = `${this.acctBase}/${path}.json`;
    const response = await this.fetchWithRetry(url, { method: 'PUT', headers: this.headers, body: JSON.stringify(body) });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listItems(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      limit: String((args.limit as number) ?? 100),
      offset: String((args.offset as number) ?? 0),
    };
    if (typeof args.archived === 'boolean') params['archived'] = String(args.archived ? 1 : 0);
    if (args.categoryID) params['categoryID'] = args.categoryID as string;
    if (args.load_relations) params['load_relations'] = args.load_relations as string;
    return this.apiGet('Item', params);
  }

  private async getItem(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.item_id) return { content: [{ type: 'text', text: 'item_id is required' }], isError: true };
    const params: Record<string, string> = {};
    if (args.load_relations) params['load_relations'] = args.load_relations as string;
    return this.apiGet(`Item/${encodeURIComponent(args.item_id as string)}`, params);
  }

  private async createItem(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.description) return { content: [{ type: 'text', text: 'description is required' }], isError: true };
    const body: Record<string, unknown> = { description: args.description };
    if (args.defaultCost) body['defaultCost'] = args.defaultCost;
    if (args.avgCost) body['avgCost'] = args.avgCost;
    if (args.taxClassID) body['taxClassID'] = args.taxClassID;
    if (args.categoryID) body['categoryID'] = args.categoryID;
    return this.apiPost('Item', body);
  }

  private async updateItem(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.item_id) return { content: [{ type: 'text', text: 'item_id is required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.description) body['description'] = args.description;
    if (args.defaultCost) body['defaultCost'] = args.defaultCost;
    if (args.categoryID) body['categoryID'] = args.categoryID;
    if (typeof args.archived === 'boolean') body['archived'] = args.archived;
    return this.apiPut(`Item/${encodeURIComponent(args.item_id as string)}`, body);
  }

  private async deleteItem(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.item_id) return { content: [{ type: 'text', text: 'item_id is required' }], isError: true };
    return this.apiPut(`Item/${encodeURIComponent(args.item_id as string)}`, { archived: true });
  }

  private async listSales(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      limit: String((args.limit as number) ?? 100),
      offset: String((args.offset as number) ?? 0),
    };
    if (args.timeStamp) params['timeStamp'] = args.timeStamp as string;
    if (args.customerID) params['customerID'] = args.customerID as string;
    if (typeof args.completed === 'boolean') params['completed'] = String(args.completed ? 1 : 0);
    if (args.load_relations) params['load_relations'] = args.load_relations as string;
    return this.apiGet('Sale', params);
  }

  private async getSale(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.sale_id) return { content: [{ type: 'text', text: 'sale_id is required' }], isError: true };
    const params: Record<string, string> = {};
    if (args.load_relations) params['load_relations'] = args.load_relations as string;
    else params['load_relations'] = 'all';
    return this.apiGet(`Sale/${encodeURIComponent(args.sale_id as string)}`, params);
  }

  private async createSale(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.registerID) return { content: [{ type: 'text', text: 'registerID is required' }], isError: true };
    const body: Record<string, unknown> = { registerID: args.registerID };
    if (args.customerID) body['customerID'] = args.customerID;
    if (args.employeeID) body['employeeID'] = args.employeeID;
    if (args.note) body['note'] = args.note;
    return this.apiPost('Sale', body);
  }

  private async listCustomers(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      limit: String((args.limit as number) ?? 100),
      offset: String((args.offset as number) ?? 0),
    };
    if (args.firstName) params['firstName'] = args.firstName as string;
    if (args.lastName) params['lastName'] = args.lastName as string;
    if (args.email) params['Contact.email'] = args.email as string;
    if (typeof args.archived === 'boolean') params['archived'] = String(args.archived ? 1 : 0);
    return this.apiGet('Customer', params);
  }

  private async getCustomer(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.customer_id) return { content: [{ type: 'text', text: 'customer_id is required' }], isError: true };
    const params: Record<string, string> = {};
    if (args.load_relations) params['load_relations'] = args.load_relations as string;
    return this.apiGet(`Customer/${encodeURIComponent(args.customer_id as string)}`, params);
  }

  private async createCustomer(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.firstName || !args.lastName) return { content: [{ type: 'text', text: 'firstName and lastName are required' }], isError: true };
    const body: Record<string, unknown> = {
      firstName: args.firstName,
      lastName: args.lastName,
    };
    if (args.note) body['note'] = args.note;
    if (args.email || args.phone) {
      const contact: Record<string, unknown> = {};
      if (args.email) contact['email'] = args.email;
      if (args.phone) contact['phone'] = args.phone;
      body['Contact'] = contact;
    }
    return this.apiPost('Customer', body);
  }

  private async updateCustomer(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.customer_id) return { content: [{ type: 'text', text: 'customer_id is required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.firstName) body['firstName'] = args.firstName;
    if (args.lastName) body['lastName'] = args.lastName;
    if (args.email || args.phone) {
      const contact: Record<string, unknown> = {};
      if (args.email) contact['email'] = args.email;
      if (args.phone) contact['phone'] = args.phone;
      body['Contact'] = contact;
    }
    return this.apiPut(`Customer/${encodeURIComponent(args.customer_id as string)}`, body);
  }

  private async listCategories(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      limit: String((args.limit as number) ?? 100),
      offset: String((args.offset as number) ?? 0),
    };
    return this.apiGet('Category', params);
  }

  private async getCategory(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.category_id) return { content: [{ type: 'text', text: 'category_id is required' }], isError: true };
    return this.apiGet(`Category/${encodeURIComponent(args.category_id as string)}`);
  }

  private async listInventory(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      limit: String((args.limit as number) ?? 100),
      offset: String((args.offset as number) ?? 0),
    };
    if (args.itemID) params['itemID'] = args.itemID as string;
    if (args.shopID) params['shopID'] = args.shopID as string;
    return this.apiGet('Inventory', params);
  }

  private async getInventoryItem(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.item_id || !args.shop_id) return { content: [{ type: 'text', text: 'item_id and shop_id are required' }], isError: true };
    return this.apiGet('Inventory', {
      itemID: args.item_id as string,
      shopID: args.shop_id as string,
    });
  }

  private async listEmployees(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      limit: String((args.limit as number) ?? 100),
      offset: String((args.offset as number) ?? 0),
    };
    if (typeof args.archived === 'boolean') params['archived'] = String(args.archived ? 1 : 0);
    return this.apiGet('Employee', params);
  }

  private async getEmployee(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.employee_id) return { content: [{ type: 'text', text: 'employee_id is required' }], isError: true };
    return this.apiGet(`Employee/${encodeURIComponent(args.employee_id as string)}`);
  }
}

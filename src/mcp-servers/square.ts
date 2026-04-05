/**
 * Square MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/square/square-mcp-server — transport: stdio + remote (hosted at connect.squareup.com/mcp), auth: OAuth2 access token
// Their server exposes 3 generic tools: make_api_request, get_type_info, get_service_info — a single unified
//   wrapper, not named domain tools. Fails criterion #3 (fewer than 10 named tools).
// Our adapter covers: 18 tools (payments, refunds, customers, orders, catalog, invoices, disputes, locations).
// Vendor MCP covers: all Square APIs via make_api_request but requires prompt-engineering the path/method.
// Recommendation: use-rest-api — vendor MCP fails criterion #3 (3 generic tools, not 10+ named tools).
//   MCP documented here for reference; our adapter provides named, typed tool resolution.
//
// Base URL: https://connect.squareup.com/v2 (production) | https://connect.squareupsandbox.com/v2 (sandbox)
// Auth: Bearer token (Square access token or OAuth2 bearer)
// Docs: https://developer.squareup.com/reference/square
// Rate limits: ~100 requests/second per access token for most endpoints

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface SquareConfig {
  accessToken: string;
  /**
   * Production: https://connect.squareup.com/v2
   * Sandbox:    https://connect.squareupsandbox.com/v2
   */
  baseUrl?: string;
  /**
   * Square-Version header — API version date (e.g. 2026-01-22).
   * Defaults to 2026-01-22 (current as of adapter authorship).
   */
  apiVersion?: string;
}

export class SquareMCPServer extends MCPAdapterBase {
  private readonly accessToken: string;
  private readonly baseUrl: string;
  private readonly apiVersion: string;

  constructor(config: SquareConfig) {
    super();
    this.accessToken = config.accessToken;
    this.baseUrl = config.baseUrl ?? 'https://connect.squareup.com/v2';
    this.apiVersion = config.apiVersion ?? '2026-01-22';
  }

  static catalog() {
    return {
      name: 'square',
      displayName: 'Square',
      version: '1.0.0',
      category: 'commerce' as const,
      keywords: ['square', 'payment', 'pos', 'point-of-sale', 'commerce', 'order', 'invoice', 'refund', 'customer', 'catalog', 'dispute', 'location'],
      toolNames: [
        'list_locations', 'list_payments', 'get_payment', 'create_payment', 'refund_payment',
        'list_refunds', 'list_customers', 'search_customers', 'create_customer', 'get_customer',
        'create_order', 'get_order', 'search_orders', 'list_catalog', 'search_catalog',
        'list_invoices', 'create_invoice', 'list_disputes',
      ],
      description: 'Payments, orders, catalog, invoices, refunds, customers, and disputes for Square sellers.',
      author: 'protectnil' as const,
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_locations',
        description: "List all of the seller's locations including name, address, status, and capabilities.",
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'list_payments',
        description: 'List payments taken by the account ordered by created_at descending. Filter by time range, location, or status.',
        inputSchema: {
          type: 'object',
          properties: {
            beginTime: {
              type: 'string',
              description: 'RFC 3339 timestamp — return payments at or after this time',
            },
            endTime: {
              type: 'string',
              description: 'RFC 3339 timestamp — return payments at or before this time',
            },
            locationId: {
              type: 'string',
              description: 'Filter by location ID',
            },
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results to return (1–100, default 100)',
            },
          },
        },
      },
      {
        name: 'get_payment',
        description: 'Retrieve a single payment by its ID, including status, amount, source, and associated order.',
        inputSchema: {
          type: 'object',
          properties: {
            paymentId: {
              type: 'string',
              description: 'The unique payment ID to retrieve',
            },
          },
          required: ['paymentId'],
        },
      },
      {
        name: 'create_payment',
        description: 'Create a payment using a source (card nonce, token, or stored card). Requires an idempotency key to prevent duplicates.',
        inputSchema: {
          type: 'object',
          properties: {
            sourceId: {
              type: 'string',
              description: 'Payment source ID (card nonce, payment token, or stored card ID)',
            },
            idempotencyKey: {
              type: 'string',
              description: 'Unique key to prevent duplicate payments (UUID recommended)',
            },
            amountMoney: {
              type: 'object',
              description: 'Amount object with amount (in smallest currency unit) and currency (ISO 4217). Example: { amount: 1000, currency: "USD" }',
            },
            locationId: {
              type: 'string',
              description: 'ID of the location associated with the payment',
            },
            note: {
              type: 'string',
              description: 'Optional note to associate with the payment (max 500 characters)',
            },
            referenceId: {
              type: 'string',
              description: 'Optional ID for correlating the payment with an external system',
            },
            customerId: {
              type: 'string',
              description: 'Customer ID to associate with this payment',
            },
          },
          required: ['sourceId', 'idempotencyKey', 'amountMoney'],
        },
      },
      {
        name: 'refund_payment',
        description: 'Refund a completed payment. Partial refunds are supported by specifying a smaller amountMoney.',
        inputSchema: {
          type: 'object',
          properties: {
            idempotencyKey: {
              type: 'string',
              description: 'Unique key to prevent duplicate refunds (UUID recommended)',
            },
            amountMoney: {
              type: 'object',
              description: 'Amount to refund with amount (smallest currency unit) and currency. May be less than the original payment.',
            },
            paymentId: {
              type: 'string',
              description: 'ID of the payment to refund',
            },
            reason: {
              type: 'string',
              description: 'Reason for the refund (max 192 characters)',
            },
          },
          required: ['idempotencyKey', 'amountMoney', 'paymentId'],
        },
      },
      {
        name: 'list_refunds',
        description: 'List refunds for the account ordered by created_at descending. Filter by time range and location.',
        inputSchema: {
          type: 'object',
          properties: {
            beginTime: {
              type: 'string',
              description: 'RFC 3339 timestamp — return refunds at or after this time',
            },
            endTime: {
              type: 'string',
              description: 'RFC 3339 timestamp — return refunds at or before this time',
            },
            locationId: {
              type: 'string',
              description: 'Filter by location ID',
            },
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
            limit: {
              type: 'number',
              description: 'Maximum results to return (1–100, default 100)',
            },
          },
        },
      },
      {
        name: 'list_customers',
        description: "List customer profiles associated with the seller's account. Supports sorting and pagination.",
        inputSchema: {
          type: 'object',
          properties: {
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results to return (1–100)',
            },
            sortField: {
              type: 'string',
              description: 'Sort field: DEFAULT or CREATED_AT',
            },
            sortOrder: {
              type: 'string',
              description: 'Sort order: ASC or DESC',
            },
          },
        },
      },
      {
        name: 'search_customers',
        description: 'Search customer profiles by email address, phone number, reference ID, or name with optional filters.',
        inputSchema: {
          type: 'object',
          properties: {
            emailAddress: {
              type: 'string',
              description: 'Filter customers whose email address exactly matches this value',
            },
            phoneNumber: {
              type: 'string',
              description: 'Filter customers whose phone number exactly matches this value',
            },
            referenceId: {
              type: 'string',
              description: 'Filter customers by external reference ID',
            },
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results to return (1–100)',
            },
          },
        },
      },
      {
        name: 'create_customer',
        description: 'Create a new customer profile with name, email, phone, and optional reference ID.',
        inputSchema: {
          type: 'object',
          properties: {
            idempotencyKey: {
              type: 'string',
              description: 'Unique key to prevent duplicate customer records',
            },
            givenName: {
              type: 'string',
              description: "Customer's first name",
            },
            familyName: {
              type: 'string',
              description: "Customer's last name",
            },
            emailAddress: {
              type: 'string',
              description: "Customer's email address",
            },
            phoneNumber: {
              type: 'string',
              description: "Customer's phone number",
            },
            referenceId: {
              type: 'string',
              description: 'External ID to associate with the customer record',
            },
            note: {
              type: 'string',
              description: 'A custom note about the customer',
            },
          },
        },
      },
      {
        name: 'get_customer',
        description: 'Retrieve a single customer profile by customer ID, including payment methods and contact info.',
        inputSchema: {
          type: 'object',
          properties: {
            customerId: {
              type: 'string',
              description: 'The unique customer ID to retrieve',
            },
          },
          required: ['customerId'],
        },
      },
      {
        name: 'create_order',
        description: 'Create a new order with line items, taxes, discounts, and fulfillment details tied to a location.',
        inputSchema: {
          type: 'object',
          properties: {
            locationId: {
              type: 'string',
              description: 'Location ID where the order is placed',
            },
            idempotencyKey: {
              type: 'string',
              description: 'Unique key to prevent duplicate orders',
            },
            lineItems: {
              type: 'array',
              description: 'Array of line item objects, each with name, quantity, and basePriceMoney',
            },
            customerId: {
              type: 'string',
              description: 'Customer ID to associate with the order',
            },
            referenceId: {
              type: 'string',
              description: 'Your internal reference ID for this order',
            },
          },
          required: ['locationId', 'idempotencyKey'],
        },
      },
      {
        name: 'get_order',
        description: 'Retrieve a single order by ID including line items, fulfillment status, and totals.',
        inputSchema: {
          type: 'object',
          properties: {
            orderId: {
              type: 'string',
              description: 'The unique order ID to retrieve',
            },
          },
          required: ['orderId'],
        },
      },
      {
        name: 'search_orders',
        description: 'Search orders across one or more locations with filters for state, date range, and customer ID.',
        inputSchema: {
          type: 'object',
          properties: {
            locationIds: {
              type: 'array',
              description: 'List of location IDs to search orders within',
            },
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of orders to return (1–500)',
            },
            stateFilter: {
              type: 'array',
              description: 'Filter by order states: OPEN, COMPLETED, CANCELED (array of strings)',
            },
            customerId: {
              type: 'string',
              description: 'Filter orders associated with a specific customer ID',
            },
          },
        },
      },
      {
        name: 'list_catalog',
        description: 'List all CatalogObjects (items, variations, taxes, discounts, modifiers) with optional type filter.',
        inputSchema: {
          type: 'object',
          properties: {
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
            types: {
              type: 'string',
              description: 'Comma-separated CatalogObject types: ITEM, ITEM_VARIATION, TAX, DISCOUNT, MODIFIER, MODIFIER_LIST, CATEGORY',
            },
          },
        },
      },
      {
        name: 'search_catalog',
        description: 'Search catalog objects by text query across item names, descriptions, and variations.',
        inputSchema: {
          type: 'object',
          properties: {
            textFilter: {
              type: 'string',
              description: 'Text to search across catalog item names and descriptions',
            },
            objectTypes: {
              type: 'array',
              description: 'Filter by object types: ITEM, ITEM_VARIATION, CATEGORY, TAX, DISCOUNT (array of strings)',
            },
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
            limit: {
              type: 'number',
              description: 'Maximum results to return (1–1000)',
            },
          },
        },
      },
      {
        name: 'list_invoices',
        description: 'List invoices for a given location, ordered by created_at descending.',
        inputSchema: {
          type: 'object',
          properties: {
            locationId: {
              type: 'string',
              description: 'Location ID to filter invoices by',
            },
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
            limit: {
              type: 'number',
              description: 'Maximum results to return (1–200)',
            },
          },
          required: ['locationId'],
        },
      },
      {
        name: 'create_invoice',
        description: 'Create an invoice for an existing order. Configure delivery method, payment schedule, and due dates.',
        inputSchema: {
          type: 'object',
          properties: {
            orderId: {
              type: 'string',
              description: 'Order ID this invoice is for (order must exist and have an unfulfilled payment)',
            },
            idempotencyKey: {
              type: 'string',
              description: 'Unique key to prevent duplicate invoices',
            },
            primaryRecipient: {
              type: 'object',
              description: 'Primary recipient object with customerId or email_address',
            },
            paymentRequests: {
              type: 'array',
              description: 'Array of payment request objects defining amount, due date, and request type (BALANCE, DEPOSIT, INSTALLMENT)',
            },
            deliveryMethod: {
              type: 'string',
              description: 'How the invoice is delivered: EMAIL, SMS, or SHARE_MANUALLY',
            },
          },
          required: ['orderId', 'idempotencyKey'],
        },
      },
      {
        name: 'list_disputes',
        description: 'List disputes (chargebacks) for the account with optional filters for state and location.',
        inputSchema: {
          type: 'object',
          properties: {
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
            states: {
              type: 'string',
              description: 'Filter by dispute state: INQUIRY_EVIDENCE_REQUIRED, INQUIRY_PROCESSING, INQUIRY_CLOSED, EVIDENCE_REQUIRED, PROCESSING, WON, LOST, ACCEPTED, WAITING_THIRD_PARTY',
            },
            locationId: {
              type: 'string',
              description: 'Filter disputes by location ID',
            },
          },
        },
      },
    ];
  }

  private get authHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
      'Square-Version': this.apiVersion,
    };
  }

  private async request(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method,
      headers: this.authHeaders,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return {
        content: [{ type: 'text', text: `Square API error (HTTP ${response.status}): ${errText}` }],
        isError: true,
      };
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      return {
        content: [{ type: 'text', text: `Square returned non-JSON response (HTTP ${response.status})` }],
        isError: true,
      };
    }

    return {
      content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }],
      isError: false,
    };
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_locations':
          return this.listLocations();

        case 'list_payments':
          return this.listPayments(args);

        case 'get_payment':
          return this.getPayment(args);

        case 'create_payment':
          return this.createPayment(args);

        case 'refund_payment':
          return this.refundPayment(args);

        case 'list_refunds':
          return this.listRefunds(args);

        case 'list_customers':
          return this.listCustomers(args);

        case 'search_customers':
          return this.searchCustomers(args);

        case 'create_customer':
          return this.createCustomer(args);

        case 'get_customer':
          return this.getCustomer(args);

        case 'create_order':
          return this.createOrder(args);

        case 'get_order':
          return this.getOrder(args);

        case 'search_orders':
          return this.searchOrders(args);

        case 'list_catalog':
          return this.listCatalog(args);

        case 'search_catalog':
          return this.searchCatalog(args);

        case 'list_invoices':
          return this.listInvoices(args);

        case 'create_invoice':
          return this.createInvoice(args);

        case 'list_disputes':
          return this.listDisputes(args);

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

  private async listLocations(): Promise<ToolResult> {
    return this.request('GET', '/locations');
  }

  private async listPayments(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.beginTime) params.set('begin_time', args.beginTime as string);
    if (args.endTime) params.set('end_time', args.endTime as string);
    if (args.locationId) params.set('location_id', args.locationId as string);
    if (args.cursor) params.set('cursor', args.cursor as string);
    if (args.limit) params.set('limit', String(args.limit));
    const qs = params.toString();
    return this.request('GET', `/payments${qs ? `?${qs}` : ''}`);
  }

  private async getPayment(args: Record<string, unknown>): Promise<ToolResult> {
    const paymentId = args.paymentId as string;
    if (!paymentId) {
      return { content: [{ type: 'text', text: 'paymentId is required' }], isError: true };
    }
    return this.request('GET', `/payments/${encodeURIComponent(paymentId)}`);
  }

  private async createPayment(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.sourceId || !args.idempotencyKey || !args.amountMoney) {
      return {
        content: [{ type: 'text', text: 'sourceId, idempotencyKey, and amountMoney are required' }],
        isError: true,
      };
    }
    const body: Record<string, unknown> = {
      source_id: args.sourceId,
      idempotency_key: args.idempotencyKey,
      amount_money: args.amountMoney,
    };
    if (args.locationId) body.location_id = args.locationId;
    if (args.note) body.note = args.note;
    if (args.referenceId) body.reference_id = args.referenceId;
    if (args.customerId) body.customer_id = args.customerId;
    return this.request('POST', '/payments', body);
  }

  private async refundPayment(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.idempotencyKey || !args.amountMoney || !args.paymentId) {
      return {
        content: [{ type: 'text', text: 'idempotencyKey, amountMoney, and paymentId are required' }],
        isError: true,
      };
    }
    const body: Record<string, unknown> = {
      idempotency_key: args.idempotencyKey,
      amount_money: args.amountMoney,
      payment_id: args.paymentId,
    };
    if (args.reason) body.reason = args.reason;
    return this.request('POST', '/refunds', body);
  }

  private async listRefunds(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.beginTime) params.set('begin_time', args.beginTime as string);
    if (args.endTime) params.set('end_time', args.endTime as string);
    if (args.locationId) params.set('location_id', args.locationId as string);
    if (args.cursor) params.set('cursor', args.cursor as string);
    if (args.limit) params.set('limit', String(args.limit));
    const qs = params.toString();
    return this.request('GET', `/refunds${qs ? `?${qs}` : ''}`);
  }

  private async listCustomers(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.cursor) params.set('cursor', args.cursor as string);
    if (args.limit) params.set('limit', String(args.limit));
    if (args.sortField) params.set('sort_field', args.sortField as string);
    if (args.sortOrder) params.set('sort_order', args.sortOrder as string);
    const qs = params.toString();
    return this.request('GET', `/customers${qs ? `?${qs}` : ''}`);
  }

  private async searchCustomers(args: Record<string, unknown>): Promise<ToolResult> {
    const filter: Record<string, unknown> = {};
    if (args.emailAddress) filter.email_address = { exact: args.emailAddress };
    if (args.phoneNumber) filter.phone_number = { exact: args.phoneNumber };
    if (args.referenceId) filter.reference_id = { exact: args.referenceId };

    const body: Record<string, unknown> = {
      query: { filter },
    };
    if (args.limit) body.limit = args.limit;
    if (args.cursor) body.cursor = args.cursor;
    return this.request('POST', '/customers/search', body);
  }

  private async createCustomer(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {};
    if (args.idempotencyKey) body.idempotency_key = args.idempotencyKey;
    if (args.givenName) body.given_name = args.givenName;
    if (args.familyName) body.family_name = args.familyName;
    if (args.emailAddress) body.email_address = args.emailAddress;
    if (args.phoneNumber) body.phone_number = args.phoneNumber;
    if (args.referenceId) body.reference_id = args.referenceId;
    if (args.note) body.note = args.note;
    return this.request('POST', '/customers', body);
  }

  private async getCustomer(args: Record<string, unknown>): Promise<ToolResult> {
    const customerId = args.customerId as string;
    if (!customerId) {
      return { content: [{ type: 'text', text: 'customerId is required' }], isError: true };
    }
    return this.request('GET', `/customers/${encodeURIComponent(customerId)}`);
  }

  private async createOrder(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.locationId || !args.idempotencyKey) {
      return {
        content: [{ type: 'text', text: 'locationId and idempotencyKey are required' }],
        isError: true,
      };
    }
    const order: Record<string, unknown> = { location_id: args.locationId };
    if (args.lineItems) order.line_items = args.lineItems;
    if (args.customerId) order.customer_id = args.customerId;
    if (args.referenceId) order.reference_id = args.referenceId;
    return this.request('POST', '/orders', { idempotency_key: args.idempotencyKey, order });
  }

  private async getOrder(args: Record<string, unknown>): Promise<ToolResult> {
    const orderId = args.orderId as string;
    if (!orderId) {
      return { content: [{ type: 'text', text: 'orderId is required' }], isError: true };
    }
    return this.request('GET', `/orders/${encodeURIComponent(orderId)}`);
  }

  private async searchOrders(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {};
    if (args.locationIds) body.location_ids = args.locationIds;
    if (args.cursor) body.cursor = args.cursor;
    if (args.limit) body.limit = args.limit;

    const filter: Record<string, unknown> = {};
    if (args.stateFilter) filter.state_filter = { states: args.stateFilter };
    if (args.customerId) filter.customer_filter = { customer_ids: [args.customerId] };
    if (Object.keys(filter).length > 0) body.query = { filter };

    return this.request('POST', '/orders/search', body);
  }

  private async listCatalog(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.cursor) params.set('cursor', args.cursor as string);
    if (args.types) params.set('types', args.types as string);
    const qs = params.toString();
    return this.request('GET', `/catalog/list${qs ? `?${qs}` : ''}`);
  }

  private async searchCatalog(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {};
    if (args.textFilter) body.text_filter = { keyword: args.textFilter };
    if (args.objectTypes) body.object_types = args.objectTypes;
    if (args.cursor) body.cursor = args.cursor;
    if (args.limit) body.limit = args.limit;
    return this.request('POST', '/catalog/search', body);
  }

  private async listInvoices(args: Record<string, unknown>): Promise<ToolResult> {
    const locationId = args.locationId as string;
    if (!locationId) {
      return { content: [{ type: 'text', text: 'locationId is required' }], isError: true };
    }
    const params = new URLSearchParams({ location_id: locationId });
    if (args.cursor) params.set('cursor', args.cursor as string);
    if (args.limit) params.set('limit', String(args.limit));
    return this.request('GET', `/invoices?${params}`);
  }

  private async createInvoice(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.orderId || !args.idempotencyKey) {
      return {
        content: [{ type: 'text', text: 'orderId and idempotencyKey are required' }],
        isError: true,
      };
    }
    const invoice: Record<string, unknown> = {
      order_id: args.orderId,
    };
    if (args.primaryRecipient) invoice.primary_recipient = args.primaryRecipient;
    if (args.paymentRequests) invoice.payment_requests = args.paymentRequests;
    if (args.deliveryMethod) invoice.delivery_method = args.deliveryMethod;
    return this.request('POST', '/invoices', { idempotency_key: args.idempotencyKey, invoice });
  }

  private async listDisputes(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.cursor) params.set('cursor', args.cursor as string);
    if (args.states) params.set('states', args.states as string);
    if (args.locationId) params.set('location_id', args.locationId as string);
    const qs = params.toString();
    return this.request('GET', `/disputes${qs ? `?${qs}` : ''}`);
  }
}

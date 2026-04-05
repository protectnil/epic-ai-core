/**
 * Billbee MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// No official Billbee MCP server was found on GitHub.
//
// Base URL: https://app.billbee.io
// Auth: Dual — X-Billbee-Api-Key header (developer API key) + HTTP Basic Auth (username + API password).
//   Both must be present on every request.
//   API key: Billbee → Account → API → Developer API Key
//   API password: Billbee → Account → API → API Password (separate from login password)
// Docs: https://app.billbee.io/swagger
// Rate limits: Extra-throttled endpoints noted per tool (e.g. invoice creation: 1/5 min per order)

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface BillbeeConfig {
  apiKey: string;
  username: string;
  /** Billbee API password (from API settings — NOT the login password) */
  apiPassword: string;
  /** Override base URL (default: https://app.billbee.io) */
  baseUrl?: string;
}

export class BillbeeMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly username: string;
  private readonly apiPassword: string;
  private readonly baseUrl: string;

  constructor(config: BillbeeConfig) {
    super();
    this.apiKey = config.apiKey;
    this.username = config.username;
    this.apiPassword = config.apiPassword;
    this.baseUrl = config.baseUrl ?? 'https://app.billbee.io';
  }

  get tools(): ToolDefinition[] {
    return [
      // ── Orders ───────────────────────────────────────────────────────
      {
        name: 'list_orders',
        description: 'Get a list of all orders, optionally filtered by date range, state, or page.',
        inputSchema: {
          type: 'object',
          properties: {
            minOrderDate: { type: 'string', description: 'ISO 8601 start date filter (e.g. 2026-01-01T00:00:00)' },
            maxOrderDate: { type: 'string', description: 'ISO 8601 end date filter (e.g. 2026-03-31T23:59:59)' },
            page: { type: 'integer', description: 'Page number (default: 1)' },
            pageSize: { type: 'integer', description: 'Page size (default: 50, max: 250)' },
            shopId: { type: 'integer', description: 'Filter by specific shop/channel ID' },
            minimumBillBeeOrderId: { type: 'integer', description: 'Filter orders with ID >= this value' },
            modifiedAtMin: { type: 'string', description: 'ISO 8601 filter for last modification date (minimum)' },
            modifiedAtMax: { type: 'string', description: 'ISO 8601 filter for last modification date (maximum)' },
            articleTitleSource: { type: 'integer', description: '0=BillbeeTitle, 1=ExtTitle, 2=BothTitles' },
            excludeTags: { type: 'boolean', description: 'Exclude tags from response to reduce payload' },
          },
        },
      },
      {
        name: 'get_order',
        description: 'Get a single order by its internal Billbee order ID.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'integer', description: 'Internal Billbee order ID' },
            articleTitleSource: { type: 'integer', description: '0=BillbeeTitle, 1=ExtTitle, 2=BothTitles' },
          },
          required: ['id'],
        },
      },
      {
        name: 'get_order_by_ext_ref',
        description: 'Get a single order by its external order number (e.g. marketplace order number).',
        inputSchema: {
          type: 'object',
          properties: {
            extRef: { type: 'string', description: 'External order reference number' },
          },
          required: ['extRef'],
        },
      },
      {
        name: 'find_order',
        description: 'Find a single order by its external ID and partner/channel name.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'External order ID' },
            partner: { type: 'string', description: 'Partner/channel name (e.g. amazon, ebay, etsy)' },
          },
          required: ['id', 'partner'],
        },
      },
      {
        name: 'create_order',
        description: 'Create a new order in Billbee.',
        inputSchema: {
          type: 'object',
          properties: {
            order: {
              type: 'object',
              description: 'Order object. Key fields: ExternalId, State, Currency, BuyerEmail, ShippingAddress, InvoiceAddress, OrderItems (array)',
            },
            shopId: { type: 'integer', description: 'Shop/channel ID to assign the order to' },
          },
          required: ['order'],
        },
      },
      {
        name: 'patch_order',
        description: 'Update one or more fields of an existing order. Use get_patchable_order_fields to see valid field names.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'integer', description: 'Internal Billbee order ID' },
            fields: {
              type: 'object',
              description: 'Key-value pairs of fields to update (field names from get_patchable_order_fields)',
            },
          },
          required: ['id', 'fields'],
        },
      },
      {
        name: 'update_order_state',
        description: 'Change the main state of an order (e.g. paid, shipped, cancelled).',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'integer', description: 'Internal Billbee order ID' },
            NewStateId: { type: 'integer', description: 'New state ID (use list_order_states for valid values)' },
            Comment: { type: 'string', description: 'Optional comment for the state change' },
          },
          required: ['id', 'NewStateId'],
        },
      },
      {
        name: 'add_order_shipment',
        description: 'Add a shipment (tracking information) to an existing order.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'integer', description: 'Internal Billbee order ID' },
            ShippingId: { type: 'string', description: 'Tracking number / shipment ID' },
            ShippingProviderId: { type: 'integer', description: 'Shipping provider ID (from get_shipping_providers)' },
            ShippingProviderProductId: { type: 'integer', description: 'Shipping product ID' },
            Comment: { type: 'string', description: 'Optional comment' },
            TrackingUrl: { type: 'string', description: 'Direct tracking URL' },
          },
          required: ['id', 'ShippingId'],
        },
      },
      {
        name: 'create_order_invoice',
        description: 'Create an invoice PDF for an existing order. Throttled: max 1 per 5 minutes per order.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'integer', description: 'Internal Billbee order ID' },
            includeInvoicePdf: { type: 'boolean', description: 'Include base64-encoded PDF in response' },
            templateId: { type: 'integer', description: 'Invoice template/layout ID (optional)' },
            sendToCloudId: { type: 'integer', description: 'Cloud storage ID to upload PDF to (optional)' },
          },
          required: ['id'],
        },
      },
      {
        name: 'create_order_delivery_note',
        description: 'Create a delivery note for an existing order. Throttled: max 1 per 5 minutes per order.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'integer', description: 'Internal Billbee order ID' },
            includePdf: { type: 'boolean', description: 'Include base64-encoded PDF in response' },
            templateId: { type: 'integer', description: 'Delivery note template ID (optional)' },
            sendToCloudId: { type: 'integer', description: 'Cloud storage ID to upload PDF to (optional)' },
          },
          required: ['id'],
        },
      },
      {
        name: 'add_order_tags',
        description: 'Attach one or more tags to an order.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'integer', description: 'Internal Billbee order ID' },
            Tags: { type: 'array', description: 'Array of tag strings to attach' },
          },
          required: ['id', 'Tags'],
        },
      },
      {
        name: 'update_order_tags',
        description: 'Replace all tags on an order with the provided set.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'integer', description: 'Internal Billbee order ID' },
            Tags: { type: 'array', description: 'Array of tag strings (replaces all existing tags)' },
          },
          required: ['id', 'Tags'],
        },
      },
      {
        name: 'send_order_message',
        description: 'Send a message to the buyer of an order.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'integer', description: 'Internal Billbee order ID' },
            SendMode: { type: 'integer', description: 'Send mode: 0=email, 1=marketplace message' },
            Message: { type: 'string', description: 'Message body text' },
            Subject: { type: 'string', description: 'Email subject (required for SendMode 0)' },
            AlternativeMail: { type: 'string', description: 'Override recipient email address' },
          },
          required: ['id', 'SendMode', 'Message'],
        },
      },
      {
        name: 'trigger_order_event',
        description: 'Trigger a rule/automation event on an order.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'integer', description: 'Internal Billbee order ID' },
            Name: { type: 'string', description: 'Event name to trigger' },
            DelayInMinutes: { type: 'integer', description: 'Optional delay before triggering the event' },
          },
          required: ['id', 'Name'],
        },
      },
      {
        name: 'get_order_invoices',
        description: 'Get a list of all invoices, optionally filtered by date range. Throttled: 1 request per page per minute.',
        inputSchema: {
          type: 'object',
          properties: {
            minInvoiceDate: { type: 'string', description: 'ISO 8601 minimum invoice date filter' },
            maxInvoiceDate: { type: 'string', description: 'ISO 8601 maximum invoice date filter' },
            page: { type: 'integer', description: 'Page number (default: 1)' },
            pageSize: { type: 'integer', description: 'Page size (default: 50)' },
            shopId: { type: 'integer', description: 'Filter by shop ID' },
            isNet: { type: 'boolean', description: 'Show net prices' },
            sendCondition: { type: 'integer', description: 'Filter by send condition' },
          },
        },
      },
      {
        name: 'get_patchable_order_fields',
        description: 'Returns a list of fields that can be updated via the patch_order tool.',
        inputSchema: { type: 'object', properties: {} },
      },
      // ── Products ─────────────────────────────────────────────────────
      {
        name: 'list_products',
        description: 'Get a list of all products in the Billbee product catalog.',
        inputSchema: {
          type: 'object',
          properties: {
            page: { type: 'integer', description: 'Page number (default: 1)' },
            pageSize: { type: 'integer', description: 'Page size (default: 50, max: 250)' },
            minCreatedAt: { type: 'string', description: 'ISO 8601 minimum creation date filter' },
          },
        },
      },
      {
        name: 'get_product',
        description: 'Queries a single product by its internal Billbee ID or by SKU.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Product ID or SKU' },
            lookupBy: { type: 'string', description: 'Lookup mode: id (default) or sku' },
          },
          required: ['id'],
        },
      },
      {
        name: 'create_product',
        description: 'Create a new product in the Billbee product catalog.',
        inputSchema: {
          type: 'object',
          properties: {
            product: {
              type: 'object',
              description: 'Product object. Key fields: Title (array of {Text, LanguageCode}), SKU, Price, Weight, StockDesired',
            },
          },
          required: ['product'],
        },
      },
      {
        name: 'delete_product',
        description: 'Delete a product from the catalog by its ID.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'integer', description: 'Product ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'patch_product',
        description: 'Update one or more fields of a product.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'integer', description: 'Product ID' },
            fields: {
              type: 'object',
              description: 'Key-value pairs of fields to update',
            },
          },
          required: ['id', 'fields'],
        },
      },
      {
        name: 'get_patchable_product_fields',
        description: 'Returns a list of fields that can be updated via the patch_product tool.',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'update_product_stock',
        description: 'Update the stock quantity for a single product.',
        inputSchema: {
          type: 'object',
          properties: {
            BillbeeId: { type: 'integer', description: 'Internal Billbee product ID' },
            StockId: { type: 'integer', description: 'Stock location ID' },
            NewQuantity: { type: 'number', description: 'New absolute stock quantity' },
            OldQuantity: { type: 'number', description: 'Previous quantity (for conflict detection, optional)' },
            DeltaQuantity: { type: 'number', description: 'Delta to add/subtract instead of absolute (optional)' },
            Reason: { type: 'string', description: 'Reason for the stock change' },
          },
          required: ['BillbeeId'],
        },
      },
      {
        name: 'update_product_stock_multiple',
        description: 'Update stock quantities for multiple products in a single request.',
        inputSchema: {
          type: 'object',
          properties: {
            entries: {
              type: 'array',
              description: 'Array of stock update objects: [{ BillbeeId, StockId, NewQuantity, Reason }]',
            },
          },
          required: ['entries'],
        },
      },
      {
        name: 'update_product_stock_code',
        description: 'Update the stock code (SKU/location code) of a product.',
        inputSchema: {
          type: 'object',
          properties: {
            BillbeeId: { type: 'integer', description: 'Internal Billbee product ID' },
            StockId: { type: 'integer', description: 'Stock location ID' },
            StockCode: { type: 'string', description: 'New stock code / SKU' },
          },
          required: ['BillbeeId', 'StockCode'],
        },
      },
      {
        name: 'get_reserved_product_amount',
        description: 'Query the reserved (committed to orders) stock amount for a product by ID or SKU.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Product ID or SKU' },
            lookupBy: { type: 'string', description: 'Lookup mode: id (default) or sku' },
          },
          required: ['id'],
        },
      },
      {
        name: 'get_product_stocks',
        description: 'Query all defined stock locations in the Billbee account.',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'get_product_categories',
        description: 'Get a list of all product categories defined in Billbee.',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'get_product_custom_fields',
        description: 'Get a list of all custom product fields defined in the account.',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'get_product_custom_field',
        description: 'Get a single custom product field definition by its ID.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'integer', description: 'Custom field definition ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'get_product_images',
        description: 'Get all images for a product.',
        inputSchema: {
          type: 'object',
          properties: {
            productId: { type: 'integer', description: 'Product ID' },
          },
          required: ['productId'],
        },
      },
      {
        name: 'get_product_image',
        description: 'Get a single image from a product by image ID.',
        inputSchema: {
          type: 'object',
          properties: {
            productId: { type: 'integer', description: 'Product ID' },
            imageId: { type: 'integer', description: 'Image ID' },
          },
          required: ['productId', 'imageId'],
        },
      },
      {
        name: 'delete_product_image',
        description: 'Delete a single image from a product.',
        inputSchema: {
          type: 'object',
          properties: {
            productId: { type: 'integer', description: 'Product ID' },
            imageId: { type: 'integer', description: 'Image ID' },
          },
          required: ['productId', 'imageId'],
        },
      },
      {
        name: 'delete_product_images',
        description: 'Delete multiple product images by their IDs.',
        inputSchema: {
          type: 'object',
          properties: {
            imageIds: { type: 'array', description: 'Array of image ID integers to delete' },
          },
          required: ['imageIds'],
        },
      },
      // ── Customers ─────────────────────────────────────────────────────
      {
        name: 'list_customers',
        description: 'Get a list of all customers with optional pagination.',
        inputSchema: {
          type: 'object',
          properties: {
            page: { type: 'integer', description: 'Page number (default: 1)' },
            pageSize: { type: 'integer', description: 'Page size (default: 50, max: 250)' },
          },
        },
      },
      {
        name: 'get_customer',
        description: 'Get a single customer by their internal Billbee ID.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'integer', description: 'Customer ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'create_customer',
        description: 'Create a new customer record in Billbee.',
        inputSchema: {
          type: 'object',
          properties: {
            customer: {
              type: 'object',
              description: 'Customer object. Key fields: Name, Email, Tel1, DefaultMailAddress, AddressAddition',
            },
          },
          required: ['customer'],
        },
      },
      {
        name: 'update_customer',
        description: 'Update an existing customer by their ID.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'integer', description: 'Customer ID' },
            customer: {
              type: 'object',
              description: 'Updated customer object',
            },
          },
          required: ['id', 'customer'],
        },
      },
      {
        name: 'get_customer_orders',
        description: 'Get all orders belonging to a specific customer.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'integer', description: 'Customer ID' },
            page: { type: 'integer', description: 'Page number' },
            pageSize: { type: 'integer', description: 'Page size' },
          },
          required: ['id'],
        },
      },
      {
        name: 'get_customer_addresses',
        description: 'Get all addresses associated with a customer.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'integer', description: 'Customer ID' },
            page: { type: 'integer', description: 'Page number' },
            pageSize: { type: 'integer', description: 'Page size' },
          },
          required: ['id'],
        },
      },
      {
        name: 'add_customer_address',
        description: 'Add a new address to an existing customer.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'integer', description: 'Customer ID' },
            address: {
              type: 'object',
              description: 'Address object: { FirstName, LastName, Street, City, Zip, CountryISO2, AddressType }',
            },
          },
          required: ['id', 'address'],
        },
      },
      // ── Customer Addresses (standalone) ──────────────────────────────
      {
        name: 'list_customer_addresses',
        description: 'Get a paginated list of all customer addresses across all customers.',
        inputSchema: {
          type: 'object',
          properties: {
            page: { type: 'integer', description: 'Page number' },
            pageSize: { type: 'integer', description: 'Page size' },
          },
        },
      },
      {
        name: 'get_customer_address',
        description: 'Get a single customer address by its standalone address ID.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'integer', description: 'Customer address ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'create_customer_address',
        description: 'Create a new standalone customer address record.',
        inputSchema: {
          type: 'object',
          properties: {
            address: {
              type: 'object',
              description: 'Address object: { CustomerId, FirstName, LastName, Street, City, Zip, CountryISO2, AddressType }',
            },
          },
          required: ['address'],
        },
      },
      {
        name: 'update_customer_address',
        description: 'Update all fields of a customer address by its ID.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'integer', description: 'Customer address ID' },
            address: {
              type: 'object',
              description: 'Updated address object',
            },
          },
          required: ['id', 'address'],
        },
      },
      // ── Shipments ─────────────────────────────────────────────────────
      {
        name: 'list_shipments',
        description: 'Get a list of all shipments, optionally filtered by date.',
        inputSchema: {
          type: 'object',
          properties: {
            page: { type: 'integer', description: 'Page number' },
            pageSize: { type: 'integer', description: 'Page size' },
            createdAtMin: { type: 'string', description: 'ISO 8601 minimum creation date filter' },
            createdAtMax: { type: 'string', description: 'ISO 8601 maximum creation date filter' },
            orderId: { type: 'integer', description: 'Filter by order ID' },
            minimumShipmentId: { type: 'integer', description: 'Filter shipments with ID >= this value' },
            shippingProviderId: { type: 'integer', description: 'Filter by shipping provider ID' },
          },
        },
      },
      {
        name: 'create_shipment',
        description: 'Create a new shipment with the selected shipping provider.',
        inputSchema: {
          type: 'object',
          properties: {
            OrderId: { type: 'integer', description: 'Internal Billbee order ID to create shipment for' },
            ProviderId: { type: 'integer', description: 'Shipping provider ID' },
            ProviderProductId: { type: 'integer', description: 'Shipping provider product/service ID' },
            ShipDate: { type: 'string', description: 'ISO 8601 shipment date' },
            ClientReference: { type: 'string', description: 'Optional client reference for the shipment' },
            Dimension: {
              type: 'object',
              description: 'Package dimensions: { width, height, length } in cm',
            },
            WeightInGram: { type: 'integer', description: 'Package weight in grams' },
          },
          required: ['OrderId', 'ProviderId', 'ProviderProductId'],
        },
      },
      {
        name: 'ship_order_with_label',
        description: 'Create a shipment for an order and generate a shipping label PDF in one call.',
        inputSchema: {
          type: 'object',
          properties: {
            OrderId: { type: 'integer', description: 'Internal Billbee order ID' },
            ProviderId: { type: 'integer', description: 'Shipping provider ID' },
            ProviderProductId: { type: 'integer', description: 'Shipping product ID' },
            ChangeStateToSend: { type: 'boolean', description: 'Automatically set order state to Shipped after label creation' },
            ClientReference: { type: 'string', description: 'Optional client reference string' },
            WeightInGram: { type: 'integer', description: 'Package weight in grams (overrides order weight)' },
            ShipDate: { type: 'string', description: 'ISO 8601 ship date' },
          },
          required: ['OrderId', 'ProviderId', 'ProviderProductId'],
        },
      },
      {
        name: 'get_shipping_providers',
        description: 'Get all configured shipping providers and their products/services.',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'get_shipping_carriers',
        description: 'Get a list of all supported shipping carriers.',
        inputSchema: { type: 'object', properties: {} },
      },
      // ── Enumerations ─────────────────────────────────────────────────
      {
        name: 'list_order_states',
        description: 'Returns a list of all defined order state codes and names.',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'list_payment_types',
        description: 'Returns a list of all defined payment type codes and names.',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'list_shipment_types',
        description: 'Returns a list of all defined shipment type codes and names.',
        inputSchema: { type: 'object', properties: {} },
      },
      // ── Events ───────────────────────────────────────────────────────
      {
        name: 'list_events',
        description: 'Get a list of all account events, optionally filtered by date and type. Throttled: 2 calls per page per hour.',
        inputSchema: {
          type: 'object',
          properties: {
            minDate: { type: 'string', description: 'ISO 8601 minimum event date' },
            maxDate: { type: 'string', description: 'ISO 8601 maximum event date' },
            page: { type: 'integer', description: 'Page number' },
            pageSize: { type: 'integer', description: 'Page size' },
            typeId: { type: 'array', description: 'Array of event type IDs to filter by' },
            orderId: { type: 'integer', description: 'Filter events by order ID' },
          },
        },
      },
      // ── Search ───────────────────────────────────────────────────────
      {
        name: 'search',
        description: 'Search for products, customers, and/or orders using a search term. Supports Lucene query syntax.',
        inputSchema: {
          type: 'object',
          properties: {
            Term: { type: 'string', description: 'Search term (supports Lucene syntax)' },
            Type: {
              type: 'array',
              description: 'Entity types to search: ["order"], ["product"], ["customer"], or any combination',
            },
          },
          required: ['Term'],
        },
      },
      // ── Cloud Storage ─────────────────────────────────────────────────
      {
        name: 'list_cloud_storages',
        description: 'Get a list of all connected cloud storage providers (e.g. Dropbox, Google Drive).',
        inputSchema: { type: 'object', properties: {} },
      },
      // ── Layouts ───────────────────────────────────────────────────────
      {
        name: 'list_layouts',
        description: 'Get a list of all document layouts (invoice/delivery note templates) defined in Billbee.',
        inputSchema: { type: 'object', properties: {} },
      },
      // ── Webhooks ─────────────────────────────────────────────────────
      {
        name: 'list_webhooks',
        description: 'Get all registered webhooks for the current account.',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'get_webhook',
        description: 'Look up a single registered webhook by its ID.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Webhook ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'create_webhook',
        description: 'Register a new webhook for the account.',
        inputSchema: {
          type: 'object',
          properties: {
            WebHookUri: { type: 'string', description: 'Target URL for webhook POST delivery' },
            Secret: { type: 'string', description: 'Shared secret for HMAC signature validation' },
            Description: { type: 'string', description: 'Human-readable description of the webhook' },
            IsPaused: { type: 'boolean', description: 'Whether the webhook is paused (default false)' },
            Filters: {
              type: 'array',
              description: 'Array of event filter strings (use list_webhook_filters for valid values)',
            },
            Headers: { type: 'object', description: 'Custom HTTP headers to include in deliveries' },
          },
          required: ['WebHookUri', 'Secret'],
        },
      },
      {
        name: 'update_webhook',
        description: 'Update an existing webhook registration.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Webhook ID' },
            WebHookUri: { type: 'string', description: 'Target URL for webhook delivery' },
            Secret: { type: 'string', description: 'Shared secret for HMAC validation' },
            Description: { type: 'string', description: 'Human-readable description' },
            IsPaused: { type: 'boolean', description: 'Pause state' },
            Filters: { type: 'array', description: 'Event filter strings' },
          },
          required: ['id'],
        },
      },
      {
        name: 'delete_webhook',
        description: 'Delete a webhook registration by its ID.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Webhook ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'delete_all_webhooks',
        description: 'Delete all webhook registrations for the current account.',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'list_webhook_filters',
        description: 'Returns a list of all valid event filter names for webhook registration.',
        inputSchema: { type: 'object', properties: {} },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        // Orders
        case 'list_orders':                   return await this.request('GET', `/api/v1/orders?${this.qs(args)}`);
        case 'get_order':                     return await this.request('GET', `/api/v1/orders/${this.id(args)}?${this.qs(this.omit(args,'id'))}`);
        case 'get_order_by_ext_ref':          return await this.request('GET', `/api/v1/orders/findbyextref/${encodeURIComponent(String(args.extRef))}`);
        case 'find_order':                    return await this.request('GET', `/api/v1/orders/find/${encodeURIComponent(String(args.id))}/${encodeURIComponent(String(args.partner))}`);
        case 'create_order':                  return await this.request('POST', `/api/v1/orders?${this.qs({shopId: args.shopId})}`, args.order);
        case 'patch_order':                   return await this.request('PATCH', `/api/v1/orders/${this.id(args)}`, args.fields);
        case 'update_order_state':            return await this.request('PUT', `/api/v1/orders/${this.id(args)}/orderstate`, this.omit(args, 'id'));
        case 'add_order_shipment':            return await this.request('POST', `/api/v1/orders/${this.id(args)}/shipment`, this.omit(args, 'id'));
        case 'create_order_invoice':          return await this.request('POST', `/api/v1/orders/CreateInvoice/${this.id(args)}?${this.qs(this.omit(args,'id'))}`);
        case 'create_order_delivery_note':    return await this.request('POST', `/api/v1/orders/CreateDeliveryNote/${this.id(args)}?${this.qs(this.omit(args,'id'))}`);
        case 'add_order_tags':                return await this.request('POST', `/api/v1/orders/${this.id(args)}/tags`, { Tags: args.Tags });
        case 'update_order_tags':             return await this.request('PUT', `/api/v1/orders/${this.id(args)}/tags`, { Tags: args.Tags });
        case 'send_order_message':            return await this.request('POST', `/api/v1/orders/${this.id(args)}/send-message`, this.omit(args, 'id'));
        case 'trigger_order_event':           return await this.request('POST', `/api/v1/orders/${this.id(args)}/trigger-event`, this.omit(args, 'id'));
        case 'get_order_invoices':            return await this.request('GET', `/api/v1/orders/invoices?${this.qs(args)}`);
        case 'get_patchable_order_fields':    return await this.request('GET', '/api/v1/orders/PatchableFields');
        // Products
        case 'list_products':                 return await this.request('GET', `/api/v1/products?${this.qs(args)}`);
        case 'get_product':                   return await this.request('GET', `/api/v1/products/${encodeURIComponent(String(args.id))}?${this.qs(this.omit(args,'id'))}`);
        case 'create_product':                return await this.request('POST', '/api/v1/products', args.product);
        case 'delete_product':                return await this.request('DELETE', `/api/v1/products/${this.id(args)}`);
        case 'patch_product':                 return await this.request('PATCH', `/api/v1/products/${this.id(args)}`, args.fields);
        case 'get_patchable_product_fields':  return await this.request('GET', '/api/v1/products/PatchableFields');
        case 'update_product_stock':          return await this.request('POST', '/api/v1/products/updatestock', args);
        case 'update_product_stock_multiple': return await this.request('POST', '/api/v1/products/updatestockmultiple', args.entries);
        case 'update_product_stock_code':     return await this.request('POST', '/api/v1/products/updatestockcode', args);
        case 'get_reserved_product_amount':   return await this.request('GET', `/api/v1/products/reservedamount?id=${encodeURIComponent(String(args.id))}&lookupBy=${args.lookupBy ?? 'id'}`);
        case 'get_product_stocks':            return await this.request('GET', '/api/v1/products/stocks');
        case 'get_product_categories':        return await this.request('GET', '/api/v1/products/category');
        case 'get_product_custom_fields':     return await this.request('GET', '/api/v1/products/custom-fields');
        case 'get_product_custom_field':      return await this.request('GET', `/api/v1/products/custom-fields/${this.id(args)}`);
        case 'get_product_images':            return await this.request('GET', `/api/v1/products/${encodeURIComponent(String(args.productId))}/images`);
        case 'get_product_image':             return await this.request('GET', `/api/v1/products/${encodeURIComponent(String(args.productId))}/images/${encodeURIComponent(String(args.imageId))}`);
        case 'delete_product_image':          return await this.request('DELETE', `/api/v1/products/${encodeURIComponent(String(args.productId))}/images/${encodeURIComponent(String(args.imageId))}`);
        case 'delete_product_images':         return await this.request('POST', '/api/v1/products/images/delete', args.imageIds);
        // Customers
        case 'list_customers':               return await this.request('GET', `/api/v1/customers?${this.qs(args)}`);
        case 'get_customer':                 return await this.request('GET', `/api/v1/customers/${this.id(args)}`);
        case 'create_customer':              return await this.request('POST', '/api/v1/customers', args.customer);
        case 'update_customer':              return await this.request('PUT', `/api/v1/customers/${this.id(args)}`, args.customer);
        case 'get_customer_orders':          return await this.request('GET', `/api/v1/customers/${this.id(args)}/orders?${this.qs(this.omit(args,'id'))}`);
        case 'get_customer_addresses':       return await this.request('GET', `/api/v1/customers/${this.id(args)}/addresses?${this.qs(this.omit(args,'id'))}`);
        case 'add_customer_address':         return await this.request('POST', `/api/v1/customers/${this.id(args)}/addresses`, args.address);
        // Customer Addresses
        case 'list_customer_addresses':      return await this.request('GET', `/api/v1/customer-addresses?${this.qs(args)}`);
        case 'get_customer_address':         return await this.request('GET', `/api/v1/customer-addresses/${this.id(args)}`);
        case 'create_customer_address':      return await this.request('POST', '/api/v1/customer-addresses', args.address);
        case 'update_customer_address':      return await this.request('PUT', `/api/v1/customer-addresses/${this.id(args)}`, args.address);
        // Shipments
        case 'list_shipments':               return await this.request('GET', `/api/v1/shipment/shipments?${this.qs(args)}`);
        case 'create_shipment':              return await this.request('POST', '/api/v1/shipment/shipment', args);
        case 'ship_order_with_label':        return await this.request('POST', '/api/v1/shipment/shipwithlabel', args);
        case 'get_shipping_providers':       return await this.request('GET', '/api/v1/shipment/shippingproviders');
        case 'get_shipping_carriers':        return await this.request('GET', '/api/v1/shipment/shippingcarriers');
        // Enumerations
        case 'list_order_states':            return await this.request('GET', '/api/v1/enums/orderstates');
        case 'list_payment_types':           return await this.request('GET', '/api/v1/enums/paymenttypes');
        case 'list_shipment_types':          return await this.request('GET', '/api/v1/enums/shipmenttypes');
        // Events
        case 'list_events':                  return await this.request('GET', `/api/v1/events?${this.qs(args)}`);
        // Search
        case 'search':                       return await this.request('POST', '/api/v1/search', args);
        // Cloud & Layouts
        case 'list_cloud_storages':          return await this.request('GET', '/api/v1/cloudstorages');
        case 'list_layouts':                 return await this.request('GET', '/api/v1/layouts');
        // Webhooks
        case 'list_webhooks':                return await this.request('GET', '/api/v1/webhooks');
        case 'get_webhook':                  return await this.request('GET', `/api/v1/webhooks/${this.id(args)}`);
        case 'create_webhook':               return await this.request('POST', '/api/v1/webhooks', args);
        case 'update_webhook':               return await this.request('PUT', `/api/v1/webhooks/${this.id(args)}`, this.omit(args, 'id'));
        case 'delete_webhook':               return await this.request('DELETE', `/api/v1/webhooks/${this.id(args)}`);
        case 'delete_all_webhooks':          return await this.request('DELETE', '/api/v1/webhooks');
        case 'list_webhook_filters':         return await this.request('GET', '/api/v1/webhooks/filters');
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

  private id(args: Record<string, unknown>): string {
    const v = args.id;
    if (v === undefined || v === null) throw new Error('"id" is required');
    return encodeURIComponent(String(v));
  }

  private omit(args: Record<string, unknown>, ...keys: string[]): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(args)) {
      if (!keys.includes(k)) result[k] = v;
    }
    return result;
  }

  private qs(args: Record<string, unknown>): string {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(args)) {
      if (v !== undefined && v !== null) {
        if (Array.isArray(v)) {
          for (const item of v) params.append(k, String(item));
        } else {
          params.set(k, String(v));
        }
      }
    }
    return params.toString();
  }

  private get headers(): Record<string, string> {
    const basic = Buffer.from(`${this.username}:${this.apiPassword}`).toString('base64');
    return {
      'X-Billbee-Api-Key': this.apiKey,
      'Authorization': `Basic ${basic}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
  }

  private async request(method: string, path: string, body?: unknown): Promise<ToolResult> {
    const url = `${this.baseUrl}${path}`;
    const init: RequestInit = { method, headers: this.headers };
    if (body !== undefined && method !== 'GET' && method !== 'DELETE') {
      init.body = JSON.stringify(body);
    }
    const response = await this.fetchWithRetry(url, init);
    if (response.status === 204) {
      return { content: [{ type: 'text', text: 'Success (no content)' }], isError: false };
    }
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `Billbee API error ${response.status}: ${errText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Billbee returned non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  static catalog() {
    return {
      name: 'billbee',
      displayName: 'Billbee',
      version: '1.0.0',
      category: 'ecommerce' as const,
      keywords: ['billbee', 'ecommerce', 'orders', 'inventory', 'shipping', 'invoicing', 'multichannel', 'marketplace', 'amazon', 'ebay', 'etsy'],
      toolNames: [
        'list_orders', 'get_order', 'get_order_by_ext_ref', 'find_order', 'create_order', 'patch_order',
        'update_order_state', 'add_order_shipment', 'create_order_invoice', 'create_order_delivery_note',
        'add_order_tags', 'update_order_tags', 'send_order_message', 'trigger_order_event',
        'get_order_invoices', 'get_patchable_order_fields',
        'list_products', 'get_product', 'create_product', 'delete_product', 'patch_product',
        'get_patchable_product_fields', 'update_product_stock', 'update_product_stock_multiple',
        'update_product_stock_code', 'get_reserved_product_amount', 'get_product_stocks',
        'get_product_categories', 'get_product_custom_fields', 'get_product_custom_field',
        'get_product_images', 'get_product_image', 'delete_product_image', 'delete_product_images',
        'list_customers', 'get_customer', 'create_customer', 'update_customer',
        'get_customer_orders', 'get_customer_addresses', 'add_customer_address',
        'list_customer_addresses', 'get_customer_address', 'create_customer_address', 'update_customer_address',
        'list_shipments', 'create_shipment', 'ship_order_with_label',
        'get_shipping_providers', 'get_shipping_carriers',
        'list_order_states', 'list_payment_types', 'list_shipment_types',
        'list_events',
        'search',
        'list_cloud_storages', 'list_layouts',
        'list_webhooks', 'get_webhook', 'create_webhook', 'update_webhook',
        'delete_webhook', 'delete_all_webhooks', 'list_webhook_filters',
      ],
      description: 'Billbee multichannel e-commerce management adapter for the Epic AI Intelligence Platform',
      author: 'protectnil' as const,
    };
  }
}

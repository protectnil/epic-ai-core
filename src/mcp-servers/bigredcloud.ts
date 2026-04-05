/**
 * Big Red Cloud MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03. Big Red Cloud has not published an official MCP server.
//
// Base URL: https://app.bigredcloud.com/api
// Auth: API Key passed as query parameter `apiKey` on every request.
//   Obtain an API key from: https://www.bigredcloud.com/support/generating-api-key-guide/
// Docs: https://www.bigredcloud.com/support/api/
//   OpenAPI spec: https://app.bigredcloud.com/api/swagger/docs/v1
// Rate limits: Not publicly documented.
// OData: Most list endpoints support OData $filter, $orderby, $top, $skip via query params.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface BigRedCloudConfig {
  apiKey: string;
  baseUrl?: string;
}

export class BigRedCloudMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: BigRedCloudConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? 'https://app.bigredcloud.com/api';
  }

  static catalog() {
    return {
      name: 'bigredcloud',
      displayName: 'Big Red Cloud',
      version: '1.0.0',
      category: 'finance' as const,
      keywords: [
        'bigredcloud', 'big red cloud', 'accounting', 'bookkeeping', 'ireland', 'vat',
        'invoice', 'sales invoice', 'purchase', 'customer', 'supplier', 'bank account',
        'cash payment', 'cash receipt', 'product', 'quote', 'credit note', 'sales rep',
        'financial', 'small business', 'cloud accounting',
      ],
      toolNames: [
        'list_accounts', 'list_analysis_categories', 'list_bank_accounts', 'get_bank_account',
        'create_bank_account', 'update_bank_account', 'delete_bank_account',
        'list_customers', 'get_customer', 'create_customer', 'update_customer', 'delete_customer',
        'list_customer_transactions', 'list_customer_quotes',
        'list_suppliers', 'get_supplier', 'create_supplier', 'update_supplier', 'delete_supplier',
        'list_supplier_transactions',
        'list_sales_invoices', 'get_sales_invoice', 'create_sales_invoice',
        'list_purchases', 'get_purchase', 'create_purchase',
        'list_payments', 'get_payment', 'create_payment',
        'list_cash_payments', 'get_cash_payment', 'create_cash_payment',
        'list_cash_receipts', 'get_cash_receipt', 'create_cash_receipt',
        'list_products', 'get_product', 'create_product', 'update_product', 'delete_product',
        'list_quotes', 'get_quote', 'create_quote',
        'list_sales_credit_notes', 'get_sales_credit_note', 'create_sales_credit_note',
        'list_vat_rates', 'list_vat_categories', 'list_vat_types',
        'get_company_settings', 'list_sales_reps',
      ],
      description: 'Manage Big Red Cloud accounting: customers, suppliers, sales invoices, purchases, payments, products, quotes, and VAT via the Big Red Cloud REST API.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      // ── Accounts ──────────────────────────────────────────────────────────
      {
        name: 'list_accounts',
        description: 'List chart of accounts for the Big Red Cloud company. Supports OData ordering by id and code.',
        inputSchema: {
          type: 'object',
          properties: {
            top: { type: 'number', description: 'Maximum number of accounts to return (OData $top)' },
            skip: { type: 'number', description: 'Number of accounts to skip for pagination (OData $skip)' },
            orderby: { type: 'string', description: 'Order results by field: id or code (e.g. "code asc")' },
          },
        },
      },
      // ── Analysis Categories ────────────────────────────────────────────────
      {
        name: 'list_analysis_categories',
        description: 'List analysis categories. Supports OData filtering by categoryTypeId and ordering by id or orderIndex.',
        inputSchema: {
          type: 'object',
          properties: {
            category_type_id: { type: 'number', description: 'Filter by category type ID' },
            top: { type: 'number', description: 'Maximum number of results (OData $top)' },
            skip: { type: 'number', description: 'Number to skip for pagination (OData $skip)' },
          },
        },
      },
      // ── Bank Accounts ──────────────────────────────────────────────────────
      {
        name: 'list_bank_accounts',
        description: 'List all bank accounts for the company. Supports OData ordering by id or acCode.',
        inputSchema: {
          type: 'object',
          properties: {
            top: { type: 'number', description: 'Maximum number of results (OData $top)' },
            skip: { type: 'number', description: 'Number to skip for pagination (OData $skip)' },
          },
        },
      },
      {
        name: 'get_bank_account',
        description: 'Retrieve a single bank account by its ID.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'Bank account ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'create_bank_account',
        description: 'Create a new bank account record in Big Red Cloud.',
        inputSchema: {
          type: 'object',
          properties: {
            acCode: { type: 'string', description: 'Account code (required)' },
            accountName: { type: 'string', description: 'Account name' },
            accountNumber: { type: 'string', description: 'Bank account number' },
            sortCode: { type: 'string', description: 'Bank sort code' },
            internationalBankAccountNumber: { type: 'string', description: 'IBAN' },
            businessIdentifierCodes: { type: 'string', description: 'BIC/SWIFT code' },
            nominalAcCode: { type: 'string', description: 'Nominal account code' },
          },
          required: ['acCode'],
        },
      },
      {
        name: 'update_bank_account',
        description: 'Update an existing bank account by ID.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'Bank account ID to update (required)' },
            accountName: { type: 'string', description: 'Updated account name' },
            accountNumber: { type: 'string', description: 'Updated account number' },
            sortCode: { type: 'string', description: 'Updated sort code' },
            internationalBankAccountNumber: { type: 'string', description: 'Updated IBAN' },
            businessIdentifierCodes: { type: 'string', description: 'Updated BIC/SWIFT' },
          },
          required: ['id'],
        },
      },
      {
        name: 'delete_bank_account',
        description: 'Delete a bank account by ID.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'Bank account ID to delete' },
            timestamp: { type: 'string', description: 'Concurrency timestamp (base64 encoded) from the GET response' },
          },
          required: ['id', 'timestamp'],
        },
      },
      // ── Customers ─────────────────────────────────────────────────────────
      {
        name: 'list_customers',
        description: 'List all customers. Supports OData ordering by id and code.',
        inputSchema: {
          type: 'object',
          properties: {
            top: { type: 'number', description: 'Maximum number of results (OData $top)' },
            skip: { type: 'number', description: 'Number to skip for pagination (OData $skip)' },
            orderby: { type: 'string', description: 'Order by field: id or code' },
          },
        },
      },
      {
        name: 'get_customer',
        description: 'Retrieve a single customer by their ID.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'Customer ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'create_customer',
        description: 'Create a new customer record in Big Red Cloud.',
        inputSchema: {
          type: 'object',
          properties: {
            code: { type: 'string', description: 'Customer code (required)' },
            name: { type: 'string', description: 'Customer name (required)' },
            email: { type: 'string', description: 'Customer email address' },
            phone: { type: 'string', description: 'Customer phone number' },
            vatReg: { type: 'string', description: 'VAT registration number' },
            address: { type: 'array', items: { type: 'string' }, description: 'Address lines (up to 5)' },
            currencyId: { type: 'number', description: 'Currency ID for the customer' },
          },
          required: ['code', 'name'],
        },
      },
      {
        name: 'update_customer',
        description: 'Update an existing customer by ID.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'Customer ID to update (required)' },
            name: { type: 'string', description: 'Updated name' },
            email: { type: 'string', description: 'Updated email' },
            phone: { type: 'string', description: 'Updated phone' },
            vatReg: { type: 'string', description: 'Updated VAT registration number' },
            address: { type: 'array', items: { type: 'string' }, description: 'Updated address lines' },
          },
          required: ['id'],
        },
      },
      {
        name: 'delete_customer',
        description: 'Delete a customer by ID.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'Customer ID to delete' },
            timestamp: { type: 'string', description: 'Concurrency timestamp from the GET response' },
          },
          required: ['id', 'timestamp'],
        },
      },
      {
        name: 'list_customer_transactions',
        description: 'List all account transactions for a specific customer.',
        inputSchema: {
          type: 'object',
          properties: {
            customer_id: { type: 'number', description: 'Customer ID (required)' },
            top: { type: 'number', description: 'Maximum number of results (OData $top)' },
            skip: { type: 'number', description: 'Number to skip for pagination (OData $skip)' },
          },
          required: ['customer_id'],
        },
      },
      {
        name: 'list_customer_quotes',
        description: 'List all quotes associated with a specific customer.',
        inputSchema: {
          type: 'object',
          properties: {
            customer_id: { type: 'number', description: 'Customer ID (required)' },
          },
          required: ['customer_id'],
        },
      },
      // ── Suppliers ─────────────────────────────────────────────────────────
      {
        name: 'list_suppliers',
        description: 'List all suppliers. Supports OData ordering by id and code.',
        inputSchema: {
          type: 'object',
          properties: {
            top: { type: 'number', description: 'Maximum number of results (OData $top)' },
            skip: { type: 'number', description: 'Number to skip for pagination (OData $skip)' },
            orderby: { type: 'string', description: 'Order by field: id or code' },
          },
        },
      },
      {
        name: 'get_supplier',
        description: 'Retrieve a single supplier by their ID.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'Supplier ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'create_supplier',
        description: 'Create a new supplier record in Big Red Cloud.',
        inputSchema: {
          type: 'object',
          properties: {
            code: { type: 'string', description: 'Supplier code (required)' },
            name: { type: 'string', description: 'Supplier name (required)' },
            email: { type: 'string', description: 'Supplier email address' },
            phone: { type: 'string', description: 'Supplier phone number' },
            vatReg: { type: 'string', description: 'VAT registration number' },
            address: { type: 'array', items: { type: 'string' }, description: 'Address lines (up to 5)' },
          },
          required: ['code', 'name'],
        },
      },
      {
        name: 'update_supplier',
        description: 'Update an existing supplier by ID.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'Supplier ID to update (required)' },
            name: { type: 'string', description: 'Updated name' },
            email: { type: 'string', description: 'Updated email' },
            phone: { type: 'string', description: 'Updated phone' },
            address: { type: 'array', items: { type: 'string' }, description: 'Updated address lines' },
          },
          required: ['id'],
        },
      },
      {
        name: 'delete_supplier',
        description: 'Delete a supplier by ID.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'Supplier ID to delete' },
            timestamp: { type: 'string', description: 'Concurrency timestamp from the GET response' },
          },
          required: ['id', 'timestamp'],
        },
      },
      {
        name: 'list_supplier_transactions',
        description: 'List all account transactions for a specific supplier.',
        inputSchema: {
          type: 'object',
          properties: {
            supplier_id: { type: 'number', description: 'Supplier ID (required)' },
            top: { type: 'number', description: 'Maximum number of results (OData $top)' },
            skip: { type: 'number', description: 'Number to skip for pagination (OData $skip)' },
          },
          required: ['supplier_id'],
        },
      },
      // ── Sales Invoices ────────────────────────────────────────────────────
      {
        name: 'list_sales_invoices',
        description: 'List sales invoices. Supports OData ordering by id and entryDate.',
        inputSchema: {
          type: 'object',
          properties: {
            top: { type: 'number', description: 'Maximum number of results (OData $top)' },
            skip: { type: 'number', description: 'Number to skip for pagination (OData $skip)' },
            orderby: { type: 'string', description: 'Order by field: id or entryDate' },
          },
        },
      },
      {
        name: 'get_sales_invoice',
        description: 'Retrieve a single sales invoice by its ID.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'Sales invoice ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'create_sales_invoice',
        description: 'Create a new sales invoice in Big Red Cloud.',
        inputSchema: {
          type: 'object',
          properties: {
            acCode: { type: 'string', description: 'Customer account code (required)' },
            entryDate: { type: 'string', description: 'Invoice date in YYYY-MM-DD format (required)' },
            reference: { type: 'string', description: 'Invoice reference number' },
            details: {
              type: 'array',
              description: 'Invoice line items',
              items: {
                type: 'object',
                properties: {
                  productCode: { type: 'string', description: 'Product code' },
                  description: { type: 'string', description: 'Line description' },
                  quantity: { type: 'number', description: 'Quantity' },
                  unitPrice: { type: 'number', description: 'Unit price' },
                  vatRateId: { type: 'number', description: 'VAT rate ID' },
                },
              },
            },
          },
          required: ['acCode', 'entryDate'],
        },
      },
      // ── Purchases ─────────────────────────────────────────────────────────
      {
        name: 'list_purchases',
        description: 'List purchase invoices. Supports OData ordering by id and entryDate.',
        inputSchema: {
          type: 'object',
          properties: {
            top: { type: 'number', description: 'Maximum number of results (OData $top)' },
            skip: { type: 'number', description: 'Number to skip for pagination (OData $skip)' },
            orderby: { type: 'string', description: 'Order by field: id or entryDate' },
          },
        },
      },
      {
        name: 'get_purchase',
        description: 'Retrieve a single purchase invoice by its ID.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'Purchase invoice ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'create_purchase',
        description: 'Create a new purchase invoice in Big Red Cloud.',
        inputSchema: {
          type: 'object',
          properties: {
            acCode: { type: 'string', description: 'Supplier account code (required)' },
            entryDate: { type: 'string', description: 'Purchase date in YYYY-MM-DD format (required)' },
            reference: { type: 'string', description: 'Supplier invoice reference' },
            details: {
              type: 'array',
              description: 'Purchase line items',
              items: {
                type: 'object',
                properties: {
                  productCode: { type: 'string', description: 'Product code' },
                  description: { type: 'string', description: 'Line description' },
                  quantity: { type: 'number', description: 'Quantity' },
                  unitPrice: { type: 'number', description: 'Unit price' },
                  vatRateId: { type: 'number', description: 'VAT rate ID' },
                },
              },
            },
          },
          required: ['acCode', 'entryDate'],
        },
      },
      // ── Payments ──────────────────────────────────────────────────────────
      {
        name: 'list_payments',
        description: 'List payment records. Supports OData ordering by id and entryDate.',
        inputSchema: {
          type: 'object',
          properties: {
            top: { type: 'number', description: 'Maximum number of results (OData $top)' },
            skip: { type: 'number', description: 'Number to skip for pagination (OData $skip)' },
          },
        },
      },
      {
        name: 'get_payment',
        description: 'Retrieve a single payment by its ID.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'Payment ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'create_payment',
        description: 'Create a new payment (supplier payment) in Big Red Cloud.',
        inputSchema: {
          type: 'object',
          properties: {
            acCode: { type: 'string', description: 'Supplier account code (required)' },
            bankAccountId: { type: 'number', description: 'Bank account ID to pay from (required)' },
            entryDate: { type: 'string', description: 'Payment date in YYYY-MM-DD format (required)' },
            amount: { type: 'number', description: 'Payment amount (required)' },
            reference: { type: 'string', description: 'Payment reference' },
          },
          required: ['acCode', 'bankAccountId', 'entryDate', 'amount'],
        },
      },
      // ── Cash Payments ──────────────────────────────────────────────────────
      {
        name: 'list_cash_payments',
        description: 'List cash payment records.',
        inputSchema: {
          type: 'object',
          properties: {
            top: { type: 'number', description: 'Maximum number of results (OData $top)' },
            skip: { type: 'number', description: 'Number to skip for pagination (OData $skip)' },
          },
        },
      },
      {
        name: 'get_cash_payment',
        description: 'Retrieve a single cash payment by its ID.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'Cash payment ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'create_cash_payment',
        description: 'Create a new cash payment record in Big Red Cloud.',
        inputSchema: {
          type: 'object',
          properties: {
            acCode: { type: 'string', description: 'Account code (required)' },
            entryDate: { type: 'string', description: 'Payment date in YYYY-MM-DD format (required)' },
            amount: { type: 'number', description: 'Payment amount (required)' },
            reference: { type: 'string', description: 'Payment reference' },
            details: {
              type: 'array',
              description: 'Cash payment line items',
              items: {
                type: 'object',
                properties: {
                  accountCode: { type: 'string', description: 'Nominal account code' },
                  netAmount: { type: 'number', description: 'Net amount for this line' },
                  vatRateId: { type: 'number', description: 'VAT rate ID' },
                },
              },
            },
          },
          required: ['acCode', 'entryDate', 'amount'],
        },
      },
      // ── Cash Receipts ──────────────────────────────────────────────────────
      {
        name: 'list_cash_receipts',
        description: 'List cash receipt records.',
        inputSchema: {
          type: 'object',
          properties: {
            top: { type: 'number', description: 'Maximum number of results (OData $top)' },
            skip: { type: 'number', description: 'Number to skip for pagination (OData $skip)' },
          },
        },
      },
      {
        name: 'get_cash_receipt',
        description: 'Retrieve a single cash receipt by its ID.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'Cash receipt ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'create_cash_receipt',
        description: 'Create a new cash receipt record in Big Red Cloud.',
        inputSchema: {
          type: 'object',
          properties: {
            acCode: { type: 'string', description: 'Customer account code (required)' },
            entryDate: { type: 'string', description: 'Receipt date in YYYY-MM-DD format (required)' },
            amount: { type: 'number', description: 'Receipt amount (required)' },
            reference: { type: 'string', description: 'Receipt reference' },
            details: {
              type: 'array',
              description: 'Cash receipt line items',
              items: {
                type: 'object',
                properties: {
                  accountCode: { type: 'string', description: 'Nominal account code' },
                  netAmount: { type: 'number', description: 'Net amount for this line' },
                  vatRateId: { type: 'number', description: 'VAT rate ID' },
                },
              },
            },
          },
          required: ['acCode', 'entryDate', 'amount'],
        },
      },
      // ── Products ──────────────────────────────────────────────────────────
      {
        name: 'list_products',
        description: 'List products/services catalog. Supports OData ordering by id and code.',
        inputSchema: {
          type: 'object',
          properties: {
            top: { type: 'number', description: 'Maximum number of results (OData $top)' },
            skip: { type: 'number', description: 'Number to skip for pagination (OData $skip)' },
            orderby: { type: 'string', description: 'Order by field: id or code' },
          },
        },
      },
      {
        name: 'get_product',
        description: 'Retrieve a single product by its ID.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'Product ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'create_product',
        description: 'Create a new product or service in Big Red Cloud.',
        inputSchema: {
          type: 'object',
          properties: {
            code: { type: 'string', description: 'Product code (required)' },
            description: { type: 'string', description: 'Product description (required)' },
            salePrice: { type: 'number', description: 'Default sale price' },
            purchasePrice: { type: 'number', description: 'Default purchase price' },
            vatRateId: { type: 'number', description: 'Default VAT rate ID' },
            accountCode: { type: 'string', description: 'Nominal account code for this product' },
          },
          required: ['code', 'description'],
        },
      },
      {
        name: 'update_product',
        description: 'Update an existing product by ID.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'Product ID to update (required)' },
            description: { type: 'string', description: 'Updated description' },
            salePrice: { type: 'number', description: 'Updated sale price' },
            purchasePrice: { type: 'number', description: 'Updated purchase price' },
            vatRateId: { type: 'number', description: 'Updated VAT rate ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'delete_product',
        description: 'Delete a product by ID.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'Product ID to delete' },
            timestamp: { type: 'string', description: 'Concurrency timestamp from the GET response' },
          },
          required: ['id', 'timestamp'],
        },
      },
      // ── Quotes ────────────────────────────────────────────────────────────
      {
        name: 'list_quotes',
        description: 'List quotes/estimates. Supports OData ordering by id and entryDate.',
        inputSchema: {
          type: 'object',
          properties: {
            top: { type: 'number', description: 'Maximum number of results (OData $top)' },
            skip: { type: 'number', description: 'Number to skip for pagination (OData $skip)' },
          },
        },
      },
      {
        name: 'get_quote',
        description: 'Retrieve a single quote by its ID.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'Quote ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'create_quote',
        description: 'Create a new quote/estimate in Big Red Cloud.',
        inputSchema: {
          type: 'object',
          properties: {
            acCode: { type: 'string', description: 'Customer account code (required)' },
            entryDate: { type: 'string', description: 'Quote date in YYYY-MM-DD format (required)' },
            reference: { type: 'string', description: 'Quote reference' },
            details: {
              type: 'array',
              description: 'Quote line items',
              items: {
                type: 'object',
                properties: {
                  productCode: { type: 'string', description: 'Product code' },
                  description: { type: 'string', description: 'Line description' },
                  quantity: { type: 'number', description: 'Quantity' },
                  unitPrice: { type: 'number', description: 'Unit price' },
                  vatRateId: { type: 'number', description: 'VAT rate ID' },
                },
              },
            },
          },
          required: ['acCode', 'entryDate'],
        },
      },
      // ── Sales Credit Notes ─────────────────────────────────────────────────
      {
        name: 'list_sales_credit_notes',
        description: 'List sales credit notes.',
        inputSchema: {
          type: 'object',
          properties: {
            top: { type: 'number', description: 'Maximum number of results (OData $top)' },
            skip: { type: 'number', description: 'Number to skip for pagination (OData $skip)' },
          },
        },
      },
      {
        name: 'get_sales_credit_note',
        description: 'Retrieve a single sales credit note by its ID.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'Sales credit note ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'create_sales_credit_note',
        description: 'Create a new sales credit note in Big Red Cloud.',
        inputSchema: {
          type: 'object',
          properties: {
            acCode: { type: 'string', description: 'Customer account code (required)' },
            entryDate: { type: 'string', description: 'Credit note date in YYYY-MM-DD format (required)' },
            reference: { type: 'string', description: 'Credit note reference' },
            details: {
              type: 'array',
              description: 'Credit note line items',
              items: {
                type: 'object',
                properties: {
                  productCode: { type: 'string', description: 'Product code' },
                  description: { type: 'string', description: 'Line description' },
                  quantity: { type: 'number', description: 'Quantity' },
                  unitPrice: { type: 'number', description: 'Unit price' },
                  vatRateId: { type: 'number', description: 'VAT rate ID' },
                },
              },
            },
          },
          required: ['acCode', 'entryDate'],
        },
      },
      // ── VAT ───────────────────────────────────────────────────────────────
      {
        name: 'list_vat_rates',
        description: 'List all VAT rates configured in the company.',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'list_vat_categories',
        description: 'List VAT categories and their associated VAT rates.',
        inputSchema: {
          type: 'object',
          properties: {
            top: { type: 'number', description: 'Maximum number of results (OData $top)' },
            skip: { type: 'number', description: 'Number to skip for pagination (OData $skip)' },
          },
        },
      },
      {
        name: 'list_vat_types',
        description: 'List all VAT types available in the system.',
        inputSchema: { type: 'object', properties: {} },
      },
      // ── Company ───────────────────────────────────────────────────────────
      {
        name: 'get_company_settings',
        description: 'Retrieve company-level settings such as name, address, VAT registration, and financial year.',
        inputSchema: { type: 'object', properties: {} },
      },
      // ── Sales Reps ────────────────────────────────────────────────────────
      {
        name: 'list_sales_reps',
        description: 'List all sales representatives in the company.',
        inputSchema: {
          type: 'object',
          properties: {
            top: { type: 'number', description: 'Maximum number of results (OData $top)' },
            skip: { type: 'number', description: 'Number to skip for pagination (OData $skip)' },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_accounts':               return await this.listAccounts(args);
        case 'list_analysis_categories':    return await this.listAnalysisCategories(args);
        case 'list_bank_accounts':          return await this.listBankAccounts(args);
        case 'get_bank_account':            return await this.getBankAccount(args);
        case 'create_bank_account':         return await this.createBankAccount(args);
        case 'update_bank_account':         return await this.updateBankAccount(args);
        case 'delete_bank_account':         return await this.deleteBankAccount(args);
        case 'list_customers':              return await this.listCustomers(args);
        case 'get_customer':                return await this.getCustomer(args);
        case 'create_customer':             return await this.createCustomer(args);
        case 'update_customer':             return await this.updateCustomer(args);
        case 'delete_customer':             return await this.deleteCustomer(args);
        case 'list_customer_transactions':  return await this.listCustomerTransactions(args);
        case 'list_customer_quotes':        return await this.listCustomerQuotes(args);
        case 'list_suppliers':              return await this.listSuppliers(args);
        case 'get_supplier':                return await this.getSupplier(args);
        case 'create_supplier':             return await this.createSupplier(args);
        case 'update_supplier':             return await this.updateSupplier(args);
        case 'delete_supplier':             return await this.deleteSupplier(args);
        case 'list_supplier_transactions':  return await this.listSupplierTransactions(args);
        case 'list_sales_invoices':         return await this.listSalesInvoices(args);
        case 'get_sales_invoice':           return await this.getSalesInvoice(args);
        case 'create_sales_invoice':        return await this.createSalesInvoice(args);
        case 'list_purchases':              return await this.listPurchases(args);
        case 'get_purchase':                return await this.getPurchase(args);
        case 'create_purchase':             return await this.createPurchase(args);
        case 'list_payments':               return await this.listPayments(args);
        case 'get_payment':                 return await this.getPayment(args);
        case 'create_payment':              return await this.createPayment(args);
        case 'list_cash_payments':          return await this.listCashPayments(args);
        case 'get_cash_payment':            return await this.getCashPayment(args);
        case 'create_cash_payment':         return await this.createCashPayment(args);
        case 'list_cash_receipts':          return await this.listCashReceipts(args);
        case 'get_cash_receipt':            return await this.getCashReceipt(args);
        case 'create_cash_receipt':         return await this.createCashReceipt(args);
        case 'list_products':               return await this.listProducts(args);
        case 'get_product':                 return await this.getProduct(args);
        case 'create_product':              return await this.createProduct(args);
        case 'update_product':              return await this.updateProduct(args);
        case 'delete_product':              return await this.deleteProduct(args);
        case 'list_quotes':                 return await this.listQuotes(args);
        case 'get_quote':                   return await this.getQuote(args);
        case 'create_quote':                return await this.createQuote(args);
        case 'list_sales_credit_notes':     return await this.listSalesCreditNotes(args);
        case 'get_sales_credit_note':       return await this.getSalesCreditNote(args);
        case 'create_sales_credit_note':    return await this.createSalesCreditNote(args);
        case 'list_vat_rates':              return await this.listVatRates();
        case 'list_vat_categories':         return await this.listVatCategories(args);
        case 'list_vat_types':              return await this.listVatTypes();
        case 'get_company_settings':        return await this.getCompanySettings();
        case 'list_sales_reps':             return await this.listSalesReps(args);
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

  private buildUrl(path: string, extraParams?: Record<string, string>): string {
    const params = new URLSearchParams({ apiKey: this.apiKey, ...extraParams });
    return `${this.baseUrl}${path}?${params.toString()}`;
  }

  private buildODataParams(args: Record<string, unknown>): Record<string, string> {
    const params: Record<string, string> = {};
    if (args.top !== undefined) params['$top'] = String(args.top);
    if (args.skip !== undefined) params['$skip'] = String(args.skip);
    if (args.orderby) params['$orderby'] = args.orderby as string;
    return params;
  }

  private async brcRequest(
    path: string,
    options: RequestInit = {},
    extraParams?: Record<string, string>,
  ): Promise<ToolResult> {
    const url = this.buildUrl(path, extraParams);
    const response = await this.fetchWithRetry(url, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...(options.headers as Record<string, string> | undefined) },
    });

    if (!response.ok) {
      let detail = '';
      try { detail = await response.text(); } catch { /* ignore */ }
      return {
        content: [{ type: 'text', text: `Big Red Cloud API error ${response.status} ${response.statusText}${detail ? ': ' + detail.slice(0, 400) : ''}` }],
        isError: true,
      };
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      return { content: [{ type: 'text', text: `Big Red Cloud returned non-JSON response (HTTP ${response.status})` }], isError: true };
    }

    const text = JSON.stringify(data, null, 2);
    const truncated = text.length > 10_000
      ? text.slice(0, 10_000) + `\n... [truncated, ${text.length} total chars]`
      : text;
    return { content: [{ type: 'text', text: truncated }], isError: false };
  }

  // ── Accounts ──────────────────────────────────────────────────────────────

  private async listAccounts(args: Record<string, unknown>): Promise<ToolResult> {
    return this.brcRequest('/v1/accounts', {}, this.buildODataParams(args));
  }

  // ── Analysis Categories ────────────────────────────────────────────────────

  private async listAnalysisCategories(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.buildODataParams(args);
    if (args.category_type_id !== undefined) params['$filter'] = `categoryTypeId eq ${args.category_type_id}`;
    return this.brcRequest('/v1/analysisCategories', {}, params);
  }

  // ── Bank Accounts ──────────────────────────────────────────────────────────

  private async listBankAccounts(args: Record<string, unknown>): Promise<ToolResult> {
    return this.brcRequest('/v1/bankAccounts', {}, this.buildODataParams(args));
  }

  private async getBankAccount(args: Record<string, unknown>): Promise<ToolResult> {
    return this.brcRequest(`/v1/bankAccounts/${encodeURIComponent(String(args.id))}`);
  }

  private async createBankAccount(args: Record<string, unknown>): Promise<ToolResult> {
    return this.brcRequest('/v1/bankAccounts', { method: 'POST', body: JSON.stringify(args) });
  }

  private async updateBankAccount(args: Record<string, unknown>): Promise<ToolResult> {
    const { id, ...body } = args;
    return this.brcRequest(`/v1/bankAccounts/${encodeURIComponent(String(id))}`, { method: 'PUT', body: JSON.stringify({ id, ...body }) });
  }

  private async deleteBankAccount(args: Record<string, unknown>): Promise<ToolResult> {
    return this.brcRequest(`/v1/bankAccounts/${encodeURIComponent(String(args.id))}`, {
      method: 'DELETE',
      body: JSON.stringify({ id: args.id, timestamp: args.timestamp }),
    });
  }

  // ── Customers ─────────────────────────────────────────────────────────────

  private async listCustomers(args: Record<string, unknown>): Promise<ToolResult> {
    return this.brcRequest('/v1/customers', {}, this.buildODataParams(args));
  }

  private async getCustomer(args: Record<string, unknown>): Promise<ToolResult> {
    return this.brcRequest(`/v1/customers/${encodeURIComponent(String(args.id))}`);
  }

  private async createCustomer(args: Record<string, unknown>): Promise<ToolResult> {
    return this.brcRequest('/v1/customers', { method: 'POST', body: JSON.stringify(args) });
  }

  private async updateCustomer(args: Record<string, unknown>): Promise<ToolResult> {
    const { id, ...body } = args;
    return this.brcRequest(`/v1/customers/${encodeURIComponent(String(id))}`, { method: 'PUT', body: JSON.stringify({ id, ...body }) });
  }

  private async deleteCustomer(args: Record<string, unknown>): Promise<ToolResult> {
    return this.brcRequest(`/v1/customers/${encodeURIComponent(String(args.id))}`, {
      method: 'DELETE',
      body: JSON.stringify({ id: args.id, timestamp: args.timestamp }),
    });
  }

  private async listCustomerTransactions(args: Record<string, unknown>): Promise<ToolResult> {
    return this.brcRequest(`/v1/customers/${encodeURIComponent(String(args.customer_id))}/accountTrans`, {}, this.buildODataParams(args));
  }

  private async listCustomerQuotes(args: Record<string, unknown>): Promise<ToolResult> {
    return this.brcRequest(`/v1/customers/${encodeURIComponent(String(args.customer_id))}/quotes`);
  }

  // ── Suppliers ─────────────────────────────────────────────────────────────

  private async listSuppliers(args: Record<string, unknown>): Promise<ToolResult> {
    return this.brcRequest('/v1/suppliers', {}, this.buildODataParams(args));
  }

  private async getSupplier(args: Record<string, unknown>): Promise<ToolResult> {
    return this.brcRequest(`/v1/suppliers/${encodeURIComponent(String(args.id))}`);
  }

  private async createSupplier(args: Record<string, unknown>): Promise<ToolResult> {
    return this.brcRequest('/v1/suppliers', { method: 'POST', body: JSON.stringify(args) });
  }

  private async updateSupplier(args: Record<string, unknown>): Promise<ToolResult> {
    const { id, ...body } = args;
    return this.brcRequest(`/v1/suppliers/${encodeURIComponent(String(id))}`, { method: 'PUT', body: JSON.stringify({ id, ...body }) });
  }

  private async deleteSupplier(args: Record<string, unknown>): Promise<ToolResult> {
    return this.brcRequest(`/v1/suppliers/${encodeURIComponent(String(args.id))}`, {
      method: 'DELETE',
      body: JSON.stringify({ id: args.id, timestamp: args.timestamp }),
    });
  }

  private async listSupplierTransactions(args: Record<string, unknown>): Promise<ToolResult> {
    return this.brcRequest(`/v1/suppliers/${encodeURIComponent(String(args.supplier_id))}/accountTrans`, {}, this.buildODataParams(args));
  }

  // ── Sales Invoices ────────────────────────────────────────────────────────

  private async listSalesInvoices(args: Record<string, unknown>): Promise<ToolResult> {
    return this.brcRequest('/v1/salesInvoices', {}, this.buildODataParams(args));
  }

  private async getSalesInvoice(args: Record<string, unknown>): Promise<ToolResult> {
    return this.brcRequest(`/v1/salesInvoices/${encodeURIComponent(String(args.id))}`);
  }

  private async createSalesInvoice(args: Record<string, unknown>): Promise<ToolResult> {
    return this.brcRequest('/v1/salesInvoices', { method: 'POST', body: JSON.stringify(args) });
  }

  // ── Purchases ─────────────────────────────────────────────────────────────

  private async listPurchases(args: Record<string, unknown>): Promise<ToolResult> {
    return this.brcRequest('/v1/purchases', {}, this.buildODataParams(args));
  }

  private async getPurchase(args: Record<string, unknown>): Promise<ToolResult> {
    return this.brcRequest(`/v1/purchases/${encodeURIComponent(String(args.id))}`);
  }

  private async createPurchase(args: Record<string, unknown>): Promise<ToolResult> {
    return this.brcRequest('/v1/purchases', { method: 'POST', body: JSON.stringify(args) });
  }

  // ── Payments ──────────────────────────────────────────────────────────────

  private async listPayments(args: Record<string, unknown>): Promise<ToolResult> {
    return this.brcRequest('/v1/payments', {}, this.buildODataParams(args));
  }

  private async getPayment(args: Record<string, unknown>): Promise<ToolResult> {
    return this.brcRequest(`/v1/payments/${encodeURIComponent(String(args.id))}`);
  }

  private async createPayment(args: Record<string, unknown>): Promise<ToolResult> {
    return this.brcRequest('/v1/payments', { method: 'POST', body: JSON.stringify(args) });
  }

  // ── Cash Payments ──────────────────────────────────────────────────────────

  private async listCashPayments(args: Record<string, unknown>): Promise<ToolResult> {
    return this.brcRequest('/v1/cashPayments', {}, this.buildODataParams(args));
  }

  private async getCashPayment(args: Record<string, unknown>): Promise<ToolResult> {
    return this.brcRequest(`/v1/cashPayments/${encodeURIComponent(String(args.id))}`);
  }

  private async createCashPayment(args: Record<string, unknown>): Promise<ToolResult> {
    return this.brcRequest('/v1/cashPayments', { method: 'POST', body: JSON.stringify(args) });
  }

  // ── Cash Receipts ──────────────────────────────────────────────────────────

  private async listCashReceipts(args: Record<string, unknown>): Promise<ToolResult> {
    return this.brcRequest('/v1/cashReceipts', {}, this.buildODataParams(args));
  }

  private async getCashReceipt(args: Record<string, unknown>): Promise<ToolResult> {
    return this.brcRequest(`/v1/cashReceipts/${encodeURIComponent(String(args.id))}`);
  }

  private async createCashReceipt(args: Record<string, unknown>): Promise<ToolResult> {
    return this.brcRequest('/v1/cashReceipts', { method: 'POST', body: JSON.stringify(args) });
  }

  // ── Products ──────────────────────────────────────────────────────────────

  private async listProducts(args: Record<string, unknown>): Promise<ToolResult> {
    return this.brcRequest('/v1/products', {}, this.buildODataParams(args));
  }

  private async getProduct(args: Record<string, unknown>): Promise<ToolResult> {
    return this.brcRequest(`/v1/products/${encodeURIComponent(String(args.id))}`);
  }

  private async createProduct(args: Record<string, unknown>): Promise<ToolResult> {
    return this.brcRequest('/v1/products', { method: 'POST', body: JSON.stringify(args) });
  }

  private async updateProduct(args: Record<string, unknown>): Promise<ToolResult> {
    const { id, ...body } = args;
    return this.brcRequest(`/v1/products/${encodeURIComponent(String(id))}`, { method: 'PUT', body: JSON.stringify({ id, ...body }) });
  }

  private async deleteProduct(args: Record<string, unknown>): Promise<ToolResult> {
    return this.brcRequest(`/v1/products/${encodeURIComponent(String(args.id))}`, {
      method: 'DELETE',
      body: JSON.stringify({ id: args.id, timestamp: args.timestamp }),
    });
  }

  // ── Quotes ────────────────────────────────────────────────────────────────

  private async listQuotes(args: Record<string, unknown>): Promise<ToolResult> {
    return this.brcRequest('/v1/quotes', {}, this.buildODataParams(args));
  }

  private async getQuote(args: Record<string, unknown>): Promise<ToolResult> {
    return this.brcRequest(`/v1/quotes/${encodeURIComponent(String(args.id))}`);
  }

  private async createQuote(args: Record<string, unknown>): Promise<ToolResult> {
    return this.brcRequest('/v1/quotes/createQuoteWithGeneratingReference', { method: 'POST', body: JSON.stringify(args) });
  }

  // ── Sales Credit Notes ─────────────────────────────────────────────────────

  private async listSalesCreditNotes(args: Record<string, unknown>): Promise<ToolResult> {
    return this.brcRequest('/v1/salesCreditNotes', {}, this.buildODataParams(args));
  }

  private async getSalesCreditNote(args: Record<string, unknown>): Promise<ToolResult> {
    return this.brcRequest(`/v1/salesCreditNotes/${encodeURIComponent(String(args.id))}`);
  }

  private async createSalesCreditNote(args: Record<string, unknown>): Promise<ToolResult> {
    return this.brcRequest('/v1/salesCreditNotes', { method: 'POST', body: JSON.stringify(args) });
  }

  // ── VAT ───────────────────────────────────────────────────────────────────

  private async listVatRates(): Promise<ToolResult> {
    return this.brcRequest('/v1/vatRates');
  }

  private async listVatCategories(args: Record<string, unknown>): Promise<ToolResult> {
    return this.brcRequest('/v1/vatCategories', {}, this.buildODataParams(args));
  }

  private async listVatTypes(): Promise<ToolResult> {
    return this.brcRequest('/v1/vatTypes');
  }

  // ── Company ───────────────────────────────────────────────────────────────

  private async getCompanySettings(): Promise<ToolResult> {
    return this.brcRequest('/v1/companySettings');
  }

  // ── Sales Reps ────────────────────────────────────────────────────────────

  private async listSalesReps(args: Record<string, unknown>): Promise<ToolResult> {
    return this.brcRequest('/v1/salesReps', {}, this.buildODataParams(args));
  }
}

/**
 * Codat Sync for Expenses (Prealpha) MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// No official Codat Sync for Expenses MCP server was found on GitHub as of 2026-03-28.
// Our adapter covers: 12 tools. Vendor MCP covers: 0 tools (none exists).
// Recommendation: use-rest-api — no official MCP server exists.
//
// Integration: use-rest-api
// REST-sourced tools (12): get_company_config, set_company_config, create_partner_expense_connection,
//   create_expense_transactions, get_mapping_options, initiate_sync, get_last_successful_sync,
//   get_latest_sync_status, list_sync_statuses, get_sync_status, get_sync_transactions,
//   get_sync_transaction, upload_transaction_attachment
//
// Base URL: https://api.codat.io
// Auth: Bearer token (Authorization: Bearer <apiKey>)
// Docs: https://docs.codat.io/sync-for-expenses/overview
// Rate limits: Not publicly documented; respect 429 responses.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface CodatExpenseConfig {
  apiKey: string;
  baseUrl?: string;
}

export class CodatSyncForExpensesPrealphaMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: CodatExpenseConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.codat.io';
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'get_company_config',
        description: 'Get the expense sync configuration for a company, including accounting platform connection details and sync settings.',
        inputSchema: {
          type: 'object',
          properties: {
            companyId: {
              type: 'string',
              description: 'The Codat company ID',
            },
          },
          required: ['companyId'],
        },
      },
      {
        name: 'set_company_config',
        description: 'Set or update the expense sync configuration for a company.',
        inputSchema: {
          type: 'object',
          properties: {
            companyId: {
              type: 'string',
              description: 'The Codat company ID',
            },
            config: {
              type: 'object',
              description: 'Configuration object for expense sync (bankAccount, supplier, customer settings)',
              additionalProperties: true,
            },
          },
          required: ['companyId', 'config'],
        },
      },
      {
        name: 'create_partner_expense_connection',
        description: 'Create a Partner Expense connection for a company to enable expense transaction syncing.',
        inputSchema: {
          type: 'object',
          properties: {
            companyId: {
              type: 'string',
              description: 'The Codat company ID',
            },
          },
          required: ['companyId'],
        },
      },
      {
        name: 'create_expense_transactions',
        description: 'Submit one or more expense transactions for a company to be synced to their accounting platform.',
        inputSchema: {
          type: 'object',
          properties: {
            companyId: {
              type: 'string',
              description: 'The Codat company ID',
            },
            transactions: {
              type: 'array',
              description: 'Array of expense transaction objects to create',
              items: { type: 'object', additionalProperties: true },
            },
          },
          required: ['companyId', 'transactions'],
        },
      },
      {
        name: 'get_mapping_options',
        description: 'Retrieve the available mapping options for a company (chart of accounts, tracking categories, tax rates) to map expense transactions to accounting categories.',
        inputSchema: {
          type: 'object',
          properties: {
            companyId: {
              type: 'string',
              description: 'The Codat company ID',
            },
          },
          required: ['companyId'],
        },
      },
      {
        name: 'initiate_sync',
        description: 'Initiate a new expense sync for a company, triggering the push of queued expense transactions to the accounting platform.',
        inputSchema: {
          type: 'object',
          properties: {
            companyId: {
              type: 'string',
              description: 'The Codat company ID',
            },
            syncBody: {
              type: 'object',
              description: 'Optional sync request body (e.g. datasetIds to sync)',
              additionalProperties: true,
            },
          },
          required: ['companyId'],
        },
      },
      {
        name: 'get_last_successful_sync',
        description: 'Get the status of the most recently successfully completed sync for a company.',
        inputSchema: {
          type: 'object',
          properties: {
            companyId: {
              type: 'string',
              description: 'The Codat company ID',
            },
          },
          required: ['companyId'],
        },
      },
      {
        name: 'get_latest_sync_status',
        description: 'Get the status of the most recent sync (completed or in progress) for a company.',
        inputSchema: {
          type: 'object',
          properties: {
            companyId: {
              type: 'string',
              description: 'The Codat company ID',
            },
          },
          required: ['companyId'],
        },
      },
      {
        name: 'list_sync_statuses',
        description: 'List the status of all syncs for a company.',
        inputSchema: {
          type: 'object',
          properties: {
            companyId: {
              type: 'string',
              description: 'The Codat company ID',
            },
          },
          required: ['companyId'],
        },
      },
      {
        name: 'get_sync_status',
        description: 'Get the status of a specific sync by sync ID for a company.',
        inputSchema: {
          type: 'object',
          properties: {
            companyId: {
              type: 'string',
              description: 'The Codat company ID',
            },
            syncId: {
              type: 'string',
              description: 'The sync ID',
            },
          },
          required: ['companyId', 'syncId'],
        },
      },
      {
        name: 'get_sync_transactions',
        description: 'Get a paginated list of transactions associated with a specific sync for a company.',
        inputSchema: {
          type: 'object',
          properties: {
            companyId: {
              type: 'string',
              description: 'The Codat company ID',
            },
            syncId: {
              type: 'string',
              description: 'The sync ID',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (1-based)',
            },
            pageSize: {
              type: 'number',
              description: 'Number of results per page (default 100)',
            },
          },
          required: ['companyId', 'syncId'],
        },
      },
      {
        name: 'get_sync_transaction',
        description: 'Get details of a single transaction within a specific sync.',
        inputSchema: {
          type: 'object',
          properties: {
            companyId: {
              type: 'string',
              description: 'The Codat company ID',
            },
            syncId: {
              type: 'string',
              description: 'The sync ID',
            },
            transactionId: {
              type: 'string',
              description: 'The transaction ID',
            },
          },
          required: ['companyId', 'syncId', 'transactionId'],
        },
      },
      {
        name: 'upload_transaction_attachment',
        description: 'Upload a file attachment (e.g. receipt) for a specific expense transaction within a sync.',
        inputSchema: {
          type: 'object',
          properties: {
            companyId: {
              type: 'string',
              description: 'The Codat company ID',
            },
            syncId: {
              type: 'string',
              description: 'The sync ID',
            },
            transactionId: {
              type: 'string',
              description: 'The transaction ID to attach the file to',
            },
            fileContent: {
              type: 'string',
              description: 'Base64-encoded file content',
            },
            fileName: {
              type: 'string',
              description: 'Name of the file including extension (e.g. receipt.pdf)',
            },
            contentType: {
              type: 'string',
              description: 'MIME type of the file (e.g. application/pdf, image/jpeg)',
            },
          },
          required: ['companyId', 'syncId', 'transactionId', 'fileContent', 'fileName', 'contentType'],
        },
      },
    ];
  }

  static catalog() {
    return {
      name: 'codat-sync-for-expenses-prealpha',
      displayName: 'Codat Sync for Expenses',
      version: '1.0.0',
      category: 'finance' as const,
      keywords: ['codat', 'expenses', 'accounting', 'sync', 'corporate card', 'expense management'],
      toolNames: [
        'get_company_config', 'set_company_config', 'create_partner_expense_connection',
        'create_expense_transactions', 'get_mapping_options', 'initiate_sync',
        'get_last_successful_sync', 'get_latest_sync_status', 'list_sync_statuses',
        'get_sync_status', 'get_sync_transactions', 'get_sync_transaction',
        'upload_transaction_attachment',
      ],
      description: '13 tools for syncing corporate card and expense transactions to accounting platforms via Codat.',
      author: 'protectnil' as const,
    };
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'get_company_config':
          return await this.getCompanyConfig(args);
        case 'set_company_config':
          return await this.setCompanyConfig(args);
        case 'create_partner_expense_connection':
          return await this.createPartnerExpenseConnection(args);
        case 'create_expense_transactions':
          return await this.createExpenseTransactions(args);
        case 'get_mapping_options':
          return await this.getMappingOptions(args);
        case 'initiate_sync':
          return await this.initiateSync(args);
        case 'get_last_successful_sync':
          return await this.getLastSuccessfulSync(args);
        case 'get_latest_sync_status':
          return await this.getLatestSyncStatus(args);
        case 'list_sync_statuses':
          return await this.listSyncStatuses(args);
        case 'get_sync_status':
          return await this.getSyncStatus(args);
        case 'get_sync_transactions':
          return await this.getSyncTransactions(args);
        case 'get_sync_transaction':
          return await this.getSyncTransaction(args);
        case 'upload_transaction_attachment':
          return await this.uploadTransactionAttachment(args);
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
      Authorization: `Bearer ${this.apiKey}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    };
  }

  private async get(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, { headers: this.headers });
    const data = await response.json().catch(() => ({ status: response.status, statusText: response.statusText }));
    return {
      content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }],
      isError: !response.ok,
    };
  }

  private async post(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    const data = await response.json().catch(() => ({ status: response.status, statusText: response.statusText }));
    return {
      content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }],
      isError: !response.ok,
    };
  }

  private async getCompanyConfig(args: Record<string, unknown>): Promise<ToolResult> {
    const companyId = args.companyId as string;
    if (!companyId) return { content: [{ type: 'text', text: 'companyId is required' }], isError: true };
    return this.get(`/companies/${encodeURIComponent(companyId)}/sync/expenses/config`);
  }

  private async setCompanyConfig(args: Record<string, unknown>): Promise<ToolResult> {
    const companyId = args.companyId as string;
    if (!companyId) return { content: [{ type: 'text', text: 'companyId is required' }], isError: true };
    const config = (args.config as Record<string, unknown>) || {};
    return this.post(`/companies/${encodeURIComponent(companyId)}/sync/expenses/config`, config);
  }

  private async createPartnerExpenseConnection(args: Record<string, unknown>): Promise<ToolResult> {
    const companyId = args.companyId as string;
    if (!companyId) return { content: [{ type: 'text', text: 'companyId is required' }], isError: true };
    return this.post(`/companies/${encodeURIComponent(companyId)}/sync/expenses/connections/partnerExpense`, {});
  }

  private async createExpenseTransactions(args: Record<string, unknown>): Promise<ToolResult> {
    const companyId = args.companyId as string;
    if (!companyId) return { content: [{ type: 'text', text: 'companyId is required' }], isError: true };
    const transactions = args.transactions as unknown[];
    if (!transactions || !Array.isArray(transactions)) {
      return { content: [{ type: 'text', text: 'transactions array is required' }], isError: true };
    }
    return this.post(`/companies/${encodeURIComponent(companyId)}/sync/expenses/data/expense-transactions`, { items: transactions });
  }

  private async getMappingOptions(args: Record<string, unknown>): Promise<ToolResult> {
    const companyId = args.companyId as string;
    if (!companyId) return { content: [{ type: 'text', text: 'companyId is required' }], isError: true };
    return this.get(`/companies/${encodeURIComponent(companyId)}/sync/expenses/mappingOptions`);
  }

  private async initiateSync(args: Record<string, unknown>): Promise<ToolResult> {
    const companyId = args.companyId as string;
    if (!companyId) return { content: [{ type: 'text', text: 'companyId is required' }], isError: true };
    const body = (args.syncBody as Record<string, unknown>) || {};
    return this.post(`/companies/${encodeURIComponent(companyId)}/sync/expenses/syncs`, body);
  }

  private async getLastSuccessfulSync(args: Record<string, unknown>): Promise<ToolResult> {
    const companyId = args.companyId as string;
    if (!companyId) return { content: [{ type: 'text', text: 'companyId is required' }], isError: true };
    return this.get(`/companies/${encodeURIComponent(companyId)}/sync/expenses/syncs/lastSuccessful/status`);
  }

  private async getLatestSyncStatus(args: Record<string, unknown>): Promise<ToolResult> {
    const companyId = args.companyId as string;
    if (!companyId) return { content: [{ type: 'text', text: 'companyId is required' }], isError: true };
    return this.get(`/companies/${encodeURIComponent(companyId)}/sync/expenses/syncs/latest/status`);
  }

  private async listSyncStatuses(args: Record<string, unknown>): Promise<ToolResult> {
    const companyId = args.companyId as string;
    if (!companyId) return { content: [{ type: 'text', text: 'companyId is required' }], isError: true };
    return this.get(`/companies/${encodeURIComponent(companyId)}/sync/expenses/syncs/list/status`);
  }

  private async getSyncStatus(args: Record<string, unknown>): Promise<ToolResult> {
    const companyId = args.companyId as string;
    const syncId = args.syncId as string;
    if (!companyId || !syncId) {
      return { content: [{ type: 'text', text: 'companyId and syncId are required' }], isError: true };
    }
    return this.get(`/companies/${encodeURIComponent(companyId)}/sync/expenses/syncs/${encodeURIComponent(syncId)}/status`);
  }

  private async getSyncTransactions(args: Record<string, unknown>): Promise<ToolResult> {
    const companyId = args.companyId as string;
    const syncId = args.syncId as string;
    if (!companyId || !syncId) {
      return { content: [{ type: 'text', text: 'companyId and syncId are required' }], isError: true };
    }
    const params = new URLSearchParams();
    if (args.page !== undefined) params.set('page', String(args.page));
    if (args.pageSize !== undefined) params.set('pageSize', String(args.pageSize));
    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.get(`/companies/${encodeURIComponent(companyId)}/sync/expenses/syncs/${encodeURIComponent(syncId)}/transactions${qs}`);
  }

  private async getSyncTransaction(args: Record<string, unknown>): Promise<ToolResult> {
    const companyId = args.companyId as string;
    const syncId = args.syncId as string;
    const transactionId = args.transactionId as string;
    if (!companyId || !syncId || !transactionId) {
      return { content: [{ type: 'text', text: 'companyId, syncId, and transactionId are required' }], isError: true };
    }
    return this.get(`/companies/${encodeURIComponent(companyId)}/sync/expenses/syncs/${encodeURIComponent(syncId)}/transactions/${encodeURIComponent(transactionId)}`);
  }

  private async uploadTransactionAttachment(args: Record<string, unknown>): Promise<ToolResult> {
    const companyId = args.companyId as string;
    const syncId = args.syncId as string;
    const transactionId = args.transactionId as string;
    const fileContent = args.fileContent as string;
    const fileName = args.fileName as string;
    const contentType = args.contentType as string;
    if (!companyId || !syncId || !transactionId || !fileContent || !fileName || !contentType) {
      return { content: [{ type: 'text', text: 'companyId, syncId, transactionId, fileContent, fileName, and contentType are required' }], isError: true };
    }
    const fileBuffer = Buffer.from(fileContent, 'base64');
    const path = `/companies/${encodeURIComponent(companyId)}/sync/expenses/syncs/${encodeURIComponent(syncId)}/transactions/${encodeURIComponent(transactionId)}/attachments`;
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        Accept: 'application/json',
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
      body: fileBuffer,
    });
    const data = await response.json().catch(() => ({ status: response.status, statusText: response.statusText }));
    return {
      content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }],
      isError: !response.ok,
    };
  }
}

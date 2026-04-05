/**
 * Codat Sync for Commerce MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// No official Codat MCP server was found on GitHub or npm as of 2026-03.
//
// Base URL: https://api.codat.io
// Auth: API key via Authorization header (format: Basic base64(apiKey:))
// Docs: https://docs.codat.io/sync-for-commerce/overview
// Rate limits: Not publicly documented; standard Codat platform limits apply

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface CodatSyncForCommerceConfig {
  /** Codat API key */
  apiKey: string;
  /** Optional base URL override (default: https://api.codat.io) */
  baseUrl?: string;
}

export class CodatSyncForCommerceMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: CodatSyncForCommerceConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? 'https://api.codat.io';
  }

  static catalog() {
    return {
      name: 'codat-sync-for-commerce',
      displayName: 'Codat Sync for Commerce',
      version: '1.0.0',
      category: 'commerce' as const,
      keywords: [
        'codat', 'sync', 'commerce', 'ecommerce', 'accounting', 'integration',
        'company', 'connection', 'configuration', 'sync-status', 'platform',
      ],
      toolNames: [
        'list_companies', 'create_company',
        'list_connections', 'create_connection', 'update_connection',
        'get_configuration', 'set_configuration',
        'list_integrations', 'get_integration_branding',
        'request_sync', 'request_sync_for_date_range',
        'get_sync_status', 'get_last_successful_sync', 'get_latest_sync',
        'get_sync_by_id', 'list_syncs',
        'get_sync_flow_url',
      ],
      description: 'Codat Sync for Commerce: manage companies, connections, sync configuration, trigger data syncs, and monitor sync status between e-commerce and accounting platforms.',
      author: 'protectnil' as const,
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_companies',
        description: 'List all Codat companies with optional pagination and search filters.',
        inputSchema: {
          type: 'object',
          properties: {
            page: {
              type: 'number',
              description: 'Page number to retrieve (default: 1)',
            },
            pageSize: {
              type: 'number',
              description: 'Number of results per page (default: 100, max: 5000)',
            },
            query: {
              type: 'string',
              description: 'Query string to filter companies by name or reference',
            },
          },
        },
      },
      {
        name: 'create_company',
        description: 'Create a new Codat company to represent a merchant or business in the sync flow.',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Name of the company to create',
            },
            description: {
              type: 'string',
              description: 'Optional description or reference for the company',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'list_connections',
        description: 'List all data connections for a company, showing linked commerce and accounting platforms.',
        inputSchema: {
          type: 'object',
          properties: {
            company_id: {
              type: 'string',
              description: 'Codat company ID (UUID)',
            },
            page: {
              type: 'number',
              description: 'Page number to retrieve (default: 1)',
            },
            pageSize: {
              type: 'number',
              description: 'Number of results per page (default: 100)',
            },
            query: {
              type: 'string',
              description: 'Query string to filter connections by platform key or status',
            },
          },
          required: ['company_id'],
        },
      },
      {
        name: 'create_connection',
        description: 'Create a new data connection for a company to link a commerce or accounting platform by platform key.',
        inputSchema: {
          type: 'object',
          properties: {
            company_id: {
              type: 'string',
              description: 'Codat company ID (UUID)',
            },
            platform_key: {
              type: 'string',
              description: 'Platform integration key (e.g. shopify, quickbooks, xero)',
            },
          },
          required: ['company_id', 'platform_key'],
        },
      },
      {
        name: 'update_connection',
        description: 'Update the status of a data connection for a company (e.g. set to unlinked or inactive).',
        inputSchema: {
          type: 'object',
          properties: {
            company_id: {
              type: 'string',
              description: 'Codat company ID (UUID)',
            },
            connection_id: {
              type: 'string',
              description: 'Connection ID (UUID) to update',
            },
            status: {
              type: 'string',
              description: 'New connection status: Linked, Unlinked, or PendingAuth',
            },
          },
          required: ['company_id', 'connection_id'],
        },
      },
      {
        name: 'get_configuration',
        description: 'Get the sync configuration for a company, including account mappings and schedule settings.',
        inputSchema: {
          type: 'object',
          properties: {
            company_id: {
              type: 'string',
              description: 'Codat company ID (UUID)',
            },
          },
          required: ['company_id'],
        },
      },
      {
        name: 'set_configuration',
        description: 'Set or update the sync configuration for a company, including account mappings and sync schedule.',
        inputSchema: {
          type: 'object',
          properties: {
            company_id: {
              type: 'string',
              description: 'Codat company ID (UUID)',
            },
            configuration: {
              type: 'object',
              description: 'Configuration object with accountingSoftwareCompanyName, commerceSoftware, and schedule settings',
            },
          },
          required: ['company_id', 'configuration'],
        },
      },
      {
        name: 'list_integrations',
        description: 'List all available commerce and accounting integrations, optionally filtered by platform type.',
        inputSchema: {
          type: 'object',
          properties: {
            page: {
              type: 'number',
              description: 'Page number to retrieve (default: 1)',
            },
            pageSize: {
              type: 'number',
              description: 'Number of results per page (default: 100)',
            },
            query: {
              type: 'string',
              description: 'Filter integrations by name or platform key',
            },
          },
        },
      },
      {
        name: 'get_integration_branding',
        description: 'Get branding assets (logo, icon, colors) for a specific integration platform.',
        inputSchema: {
          type: 'object',
          properties: {
            platform_key: {
              type: 'string',
              description: 'Platform integration key (e.g. shopify, quickbooks)',
            },
          },
          required: ['platform_key'],
        },
      },
      {
        name: 'request_sync',
        description: 'Trigger a new commerce data sync for a company using the latest available data.',
        inputSchema: {
          type: 'object',
          properties: {
            company_id: {
              type: 'string',
              description: 'Codat company ID (UUID)',
            },
          },
          required: ['company_id'],
        },
      },
      {
        name: 'request_sync_for_date_range',
        description: 'Trigger a commerce data sync for a company for a specific date range.',
        inputSchema: {
          type: 'object',
          properties: {
            company_id: {
              type: 'string',
              description: 'Codat company ID (UUID)',
            },
            date_range_start: {
              type: 'string',
              description: 'Start date for sync in ISO 8601 format (e.g. 2024-01-01T00:00:00Z)',
            },
            date_range_finish: {
              type: 'string',
              description: 'End date for sync in ISO 8601 format (e.g. 2024-01-31T23:59:59Z)',
            },
          },
          required: ['company_id', 'date_range_start', 'date_range_finish'],
        },
      },
      {
        name: 'get_sync_status',
        description: 'Get the current sync status for a company showing all ongoing and completed syncs.',
        inputSchema: {
          type: 'object',
          properties: {
            company_id: {
              type: 'string',
              description: 'Codat company ID (UUID)',
            },
          },
          required: ['company_id'],
        },
      },
      {
        name: 'get_last_successful_sync',
        description: 'Get the most recently completed successful sync for a company.',
        inputSchema: {
          type: 'object',
          properties: {
            company_id: {
              type: 'string',
              description: 'Codat company ID (UUID)',
            },
          },
          required: ['company_id'],
        },
      },
      {
        name: 'get_latest_sync',
        description: 'Get the latest sync (regardless of status) for a company, including in-progress syncs.',
        inputSchema: {
          type: 'object',
          properties: {
            company_id: {
              type: 'string',
              description: 'Codat company ID (UUID)',
            },
          },
          required: ['company_id'],
        },
      },
      {
        name: 'get_sync_by_id',
        description: 'Get detailed status of a specific sync run by sync ID for a company.',
        inputSchema: {
          type: 'object',
          properties: {
            company_id: {
              type: 'string',
              description: 'Codat company ID (UUID)',
            },
            sync_id: {
              type: 'string',
              description: 'Sync ID (UUID) to retrieve',
            },
          },
          required: ['company_id', 'sync_id'],
        },
      },
      {
        name: 'list_syncs',
        description: 'List all sync history records for a company including status, date, and error details.',
        inputSchema: {
          type: 'object',
          properties: {
            company_id: {
              type: 'string',
              description: 'Codat company ID (UUID)',
            },
          },
          required: ['company_id'],
        },
      },
      {
        name: 'get_sync_flow_url',
        description: 'Get the URL to start a new sync flow for a company connecting commerce and accounting platforms.',
        inputSchema: {
          type: 'object',
          properties: {
            commerce_key: {
              type: 'string',
              description: 'Platform key of the commerce source (e.g. shopify, woocommerce)',
            },
            accounting_key: {
              type: 'string',
              description: 'Platform key of the accounting destination (e.g. quickbooks, xero)',
            },
            merchant_identifier: {
              type: 'string',
              description: 'Optional merchant identifier to pre-fill in the sync flow',
            },
          },
          required: ['commerce_key', 'accounting_key'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_companies':
          return await this.listCompanies(args);
        case 'create_company':
          return await this.createCompany(args);
        case 'list_connections':
          return await this.listConnections(args);
        case 'create_connection':
          return await this.createConnection(args);
        case 'update_connection':
          return await this.updateConnection(args);
        case 'get_configuration':
          return await this.getConfiguration(args);
        case 'set_configuration':
          return await this.setConfiguration(args);
        case 'list_integrations':
          return await this.listIntegrations(args);
        case 'get_integration_branding':
          return await this.getIntegrationBranding(args);
        case 'request_sync':
          return await this.requestSync(args);
        case 'request_sync_for_date_range':
          return await this.requestSyncForDateRange(args);
        case 'get_sync_status':
          return await this.getSyncStatus(args);
        case 'get_last_successful_sync':
          return await this.getLastSuccessfulSync(args);
        case 'get_latest_sync':
          return await this.getLatestSync(args);
        case 'get_sync_by_id':
          return await this.getSyncById(args);
        case 'list_syncs':
          return await this.listSyncs(args);
        case 'get_sync_flow_url':
          return await this.getSyncFlowUrl(args);
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

  private authHeader(): string {
    // Codat uses Basic auth with the API key as the username, empty password
    return `Basic ${Buffer.from(`${this.apiKey}:`).toString('base64')}`;
  }

  private async request(method: string, path: string, body?: unknown): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method,
      headers: {
        'Authorization': this.authHeader(),
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
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
      ? text.slice(0, 10_000) + `\n... [truncated, ${text.length} total chars]`
      : text;

    return {
      content: [{ type: 'text', text: truncated }],
      isError: false,
    };
  }

  private async listCompanies(args: Record<string, unknown>): Promise<ToolResult> {
    const page = (args.page as number) ?? 1;
    const pageSize = (args.pageSize as number) ?? 100;
    const query = args.query as string | undefined;

    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (query) params.set('query', query);

    return this.request('GET', `/companies?${params}`);
  }

  private async createCompany(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = { name: args.name };
    if (args.description) body.description = args.description;
    return this.request('POST', '/companies', body);
  }

  private async listConnections(args: Record<string, unknown>): Promise<ToolResult> {
    const companyId = args.company_id as string;
    const page = (args.page as number) ?? 1;
    const pageSize = (args.pageSize as number) ?? 100;
    const query = args.query as string | undefined;

    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (query) params.set('query', query);

    return this.request('GET', `/companies/${companyId}/connections?${params}`);
  }

  private async createConnection(args: Record<string, unknown>): Promise<ToolResult> {
    const companyId = args.company_id as string;
    return this.request('POST', `/companies/${companyId}/connections`, { platformKey: args.platform_key });
  }

  private async updateConnection(args: Record<string, unknown>): Promise<ToolResult> {
    const companyId = args.company_id as string;
    const connectionId = args.connection_id as string;
    const body: Record<string, unknown> = {};
    if (args.status) body.status = args.status;
    return this.request('PATCH', `/companies/${companyId}/connections/${connectionId}`, body);
  }

  private async getConfiguration(args: Record<string, unknown>): Promise<ToolResult> {
    const companyId = args.company_id as string;
    return this.request('GET', `/config/companies/${companyId}/sync/commerce`);
  }

  private async setConfiguration(args: Record<string, unknown>): Promise<ToolResult> {
    const companyId = args.company_id as string;
    return this.request('POST', `/config/companies/${companyId}/sync/commerce`, args.configuration);
  }

  private async listIntegrations(args: Record<string, unknown>): Promise<ToolResult> {
    const page = (args.page as number) ?? 1;
    const pageSize = (args.pageSize as number) ?? 100;
    const query = args.query as string | undefined;

    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (query) params.set('query', query);

    return this.request('GET', `/config/integrations?${params}`);
  }

  private async getIntegrationBranding(args: Record<string, unknown>): Promise<ToolResult> {
    const platformKey = args.platform_key as string;
    return this.request('GET', `/config/integrations/${platformKey}/branding`);
  }

  private async requestSync(args: Record<string, unknown>): Promise<ToolResult> {
    const companyId = args.company_id as string;
    return this.request('POST', `/companies/${companyId}/sync/commerce/latest`);
  }

  private async requestSyncForDateRange(args: Record<string, unknown>): Promise<ToolResult> {
    const companyId = args.company_id as string;
    return this.request('POST', `/meta/companies/${companyId}/sync/commerce/historic`, {
      dateRange: {
        start: args.date_range_start,
        finish: args.date_range_finish,
      },
    });
  }

  private async getSyncStatus(args: Record<string, unknown>): Promise<ToolResult> {
    const companyId = args.company_id as string;
    return this.request('GET', `/meta/companies/${companyId}/sync/commerce/status`);
  }

  private async getLastSuccessfulSync(args: Record<string, unknown>): Promise<ToolResult> {
    const companyId = args.company_id as string;
    return this.request('GET', `/companies/${companyId}/sync/commerce/syncs/lastSuccessful/status`);
  }

  private async getLatestSync(args: Record<string, unknown>): Promise<ToolResult> {
    const companyId = args.company_id as string;
    return this.request('GET', `/companies/${companyId}/sync/commerce/syncs/latest/status`);
  }

  private async getSyncById(args: Record<string, unknown>): Promise<ToolResult> {
    const companyId = args.company_id as string;
    const syncId = args.sync_id as string;
    return this.request('GET', `/companies/${companyId}/sync/commerce/syncs/${syncId}/status`);
  }

  private async listSyncs(args: Record<string, unknown>): Promise<ToolResult> {
    const companyId = args.company_id as string;
    return this.request('GET', `/companies/${companyId}/sync/commerce/syncs/list/status`);
  }

  private async getSyncFlowUrl(args: Record<string, unknown>): Promise<ToolResult> {
    const commerceKey = args.commerce_key as string;
    const accountingKey = args.accounting_key as string;
    const merchantIdentifier = args.merchant_identifier as string | undefined;

    const params = new URLSearchParams();
    if (merchantIdentifier) params.set('merchantIdentifier', merchantIdentifier);

    const query = params.toString();
    const path = `/config/sync/commerce/${commerceKey}/${accountingKey}/start${query ? '?' + query : ''}`;
    return this.request('GET', path);
  }
}

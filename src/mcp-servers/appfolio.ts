/**
 * AppFolio MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28.
//   Community implementation: https://github.com/CryptoCultCurt/appfolio-mcp-server
//   (npm: @fluegeldao/appfolio-mcp-server) — last commit Jan 12, 2026, community maintained,
//   reporting only, minimal tool set. Not recommended for production: limited coverage, no official support.
// Our adapter covers: 15 tools. Community MCP tool count: unknown (not official, no tool list in README).
// Recommendation: use-rest-api — no official MCP server exists. Community MCP not suitable for production.
//
// Base URL: https://{vhost}.appfolio.com/api/v2/reports
// Auth: HTTP Basic Auth — Authorization: Basic base64(clientId:clientSecret).
//   Client ID and Client Secret from AppFolio General Settings → Manage API Settings → Reports API Credentials.
// Docs: https://www.appfolio.com/stack/partners/api (partner login required for Reports API docs)
// Rate limits: All report endpoints rate-limited equally. Avoid bursting — stagger requests.
//   HTTP 429 returned when exceeded. next_page_url links are not rate-limited.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface AppFolioConfig {
  clientId: string;
  clientSecret: string;
  vhost: string;
}

export class AppFolioMCPServer extends MCPAdapterBase {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly baseUrl: string;

  constructor(config: AppFolioConfig) {
    super();
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    // BaseURL without credentials — credentials injected per-request via Authorization header
    this.baseUrl = `https://${config.vhost}.appfolio.com/api/v2/reports`;
  }

  static catalog() {
    return {
      name: 'appfolio',
      displayName: 'AppFolio',
      version: '1.0.0',
      category: 'misc',
      keywords: [
        'appfolio', 'property management', 'real estate', 'rental', 'landlord', 'tenant',
        'owner ledger', 'rent roll', 'maintenance', 'lease', 'vacancy', 'work order',
        'bank deposit', 'cash flow', 'property manager', 'multifamily', 'single family',
      ],
      toolNames: [
        'get_rent_roll', 'get_owner_statement', 'get_tenant_ledger', 'get_owner_ledger',
        'get_cash_flow', 'get_balance_sheet', 'get_income_statement',
        'get_maintenance_requests', 'get_work_orders',
        'get_lease_activity', 'get_lease_expiration',
        'get_vacancy_report', 'get_delinquency',
        'get_bank_deposit', 'get_check_register',
      ],
      description: 'AppFolio property management: pull rent rolls, owner and tenant ledgers, cash flow, maintenance requests, work orders, lease activity, vacancies, and financial reports.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'get_rent_roll',
        description: 'Get current rent roll showing all units with tenant names, rent amounts, lease dates, and occupancy status',
        inputSchema: {
          type: 'object',
          properties: {
            property_ids: {
              type: 'string',
              description: 'Comma-separated list of property IDs to filter (optional — returns all properties if omitted)',
            },
            as_of_date: {
              type: 'string',
              description: 'Report date in YYYY-MM-DD format (default: today)',
            },
          },
        },
      },
      {
        name: 'get_owner_statement',
        description: 'Get owner statement showing income, expenses, and owner draw for a date range',
        inputSchema: {
          type: 'object',
          properties: {
            from_date: {
              type: 'string',
              description: 'Start date in YYYY-MM-DD format (required)',
            },
            to_date: {
              type: 'string',
              description: 'End date in YYYY-MM-DD format (required)',
            },
            property_ids: {
              type: 'string',
              description: 'Comma-separated property IDs to include (optional)',
            },
          },
          required: ['from_date', 'to_date'],
        },
      },
      {
        name: 'get_tenant_ledger',
        description: 'Get tenant ledger showing charges, payments, and balances for tenants',
        inputSchema: {
          type: 'object',
          properties: {
            from_date: {
              type: 'string',
              description: 'Start date in YYYY-MM-DD format (required)',
            },
            to_date: {
              type: 'string',
              description: 'End date in YYYY-MM-DD format (required)',
            },
            property_ids: {
              type: 'string',
              description: 'Comma-separated property IDs to include (optional)',
            },
            tenant_ids: {
              type: 'string',
              description: 'Comma-separated tenant IDs to include (optional)',
            },
          },
          required: ['from_date', 'to_date'],
        },
      },
      {
        name: 'get_owner_ledger',
        description: 'Get owner ledger showing all transactions and running balance for property owners',
        inputSchema: {
          type: 'object',
          properties: {
            from_date: {
              type: 'string',
              description: 'Start date in YYYY-MM-DD format (required)',
            },
            to_date: {
              type: 'string',
              description: 'End date in YYYY-MM-DD format (required)',
            },
            property_ids: {
              type: 'string',
              description: 'Comma-separated property IDs to include (optional)',
            },
          },
          required: ['from_date', 'to_date'],
        },
      },
      {
        name: 'get_cash_flow',
        description: 'Get cash flow report showing income and expense categories for a date range',
        inputSchema: {
          type: 'object',
          properties: {
            from_date: {
              type: 'string',
              description: 'Start date in YYYY-MM-DD format (required)',
            },
            to_date: {
              type: 'string',
              description: 'End date in YYYY-MM-DD format (required)',
            },
            property_ids: {
              type: 'string',
              description: 'Comma-separated property IDs to include (optional)',
            },
          },
          required: ['from_date', 'to_date'],
        },
      },
      {
        name: 'get_balance_sheet',
        description: 'Get balance sheet showing assets, liabilities, and equity as of a specific date',
        inputSchema: {
          type: 'object',
          properties: {
            as_of_date: {
              type: 'string',
              description: 'Report date in YYYY-MM-DD format (required)',
            },
            property_ids: {
              type: 'string',
              description: 'Comma-separated property IDs to include (optional)',
            },
          },
          required: ['as_of_date'],
        },
      },
      {
        name: 'get_income_statement',
        description: 'Get income statement (profit and loss) for a date range by property or portfolio',
        inputSchema: {
          type: 'object',
          properties: {
            from_date: {
              type: 'string',
              description: 'Start date in YYYY-MM-DD format (required)',
            },
            to_date: {
              type: 'string',
              description: 'End date in YYYY-MM-DD format (required)',
            },
            property_ids: {
              type: 'string',
              description: 'Comma-separated property IDs to include (optional)',
            },
          },
          required: ['from_date', 'to_date'],
        },
      },
      {
        name: 'get_maintenance_requests',
        description: 'Get maintenance requests with status, category, assigned vendor, and completion date filters',
        inputSchema: {
          type: 'object',
          properties: {
            from_date: {
              type: 'string',
              description: 'Filter requests submitted on or after this date (YYYY-MM-DD)',
            },
            to_date: {
              type: 'string',
              description: 'Filter requests submitted on or before this date (YYYY-MM-DD)',
            },
            status: {
              type: 'string',
              description: 'Filter by status: open, closed (optional)',
            },
            property_ids: {
              type: 'string',
              description: 'Comma-separated property IDs to include (optional)',
            },
          },
        },
      },
      {
        name: 'get_work_orders',
        description: 'Get work orders with vendor, cost, status, and scheduled date for maintenance tracking',
        inputSchema: {
          type: 'object',
          properties: {
            from_date: {
              type: 'string',
              description: 'Filter work orders created on or after this date (YYYY-MM-DD, required)',
            },
            to_date: {
              type: 'string',
              description: 'Filter work orders created on or before this date (YYYY-MM-DD)',
            },
            property_ids: {
              type: 'string',
              description: 'Comma-separated property IDs to include (optional)',
            },
          },
          required: ['from_date'],
        },
      },
      {
        name: 'get_lease_activity',
        description: 'Get lease activity report showing new leases, renewals, and terminations for a date range',
        inputSchema: {
          type: 'object',
          properties: {
            from_date: {
              type: 'string',
              description: 'Start date in YYYY-MM-DD format (required)',
            },
            to_date: {
              type: 'string',
              description: 'End date in YYYY-MM-DD format (required)',
            },
            property_ids: {
              type: 'string',
              description: 'Comma-separated property IDs to include (optional)',
            },
          },
          required: ['from_date', 'to_date'],
        },
      },
      {
        name: 'get_lease_expiration',
        description: 'Get upcoming lease expirations within a date range to plan renewals and re-leasing',
        inputSchema: {
          type: 'object',
          properties: {
            from_date: {
              type: 'string',
              description: 'Start of expiration window in YYYY-MM-DD format (required)',
            },
            to_date: {
              type: 'string',
              description: 'End of expiration window in YYYY-MM-DD format (required)',
            },
            property_ids: {
              type: 'string',
              description: 'Comma-separated property IDs to include (optional)',
            },
          },
          required: ['from_date', 'to_date'],
        },
      },
      {
        name: 'get_vacancy_report',
        description: 'Get vacancy report showing vacant units, days vacant, and ready-to-rent status',
        inputSchema: {
          type: 'object',
          properties: {
            as_of_date: {
              type: 'string',
              description: 'Report date in YYYY-MM-DD format (default: today)',
            },
            property_ids: {
              type: 'string',
              description: 'Comma-separated property IDs to include (optional)',
            },
          },
        },
      },
      {
        name: 'get_delinquency',
        description: 'Get delinquency report showing tenants with past-due balances and aging buckets',
        inputSchema: {
          type: 'object',
          properties: {
            as_of_date: {
              type: 'string',
              description: 'Report date in YYYY-MM-DD format (default: today)',
            },
            property_ids: {
              type: 'string',
              description: 'Comma-separated property IDs to include (optional)',
            },
          },
        },
      },
      {
        name: 'get_bank_deposit',
        description: 'Get bank deposit report showing deposits made within a date range',
        inputSchema: {
          type: 'object',
          properties: {
            from_date: {
              type: 'string',
              description: 'Start date in YYYY-MM-DD format (required)',
            },
            to_date: {
              type: 'string',
              description: 'End date in YYYY-MM-DD format (required)',
            },
            property_ids: {
              type: 'string',
              description: 'Comma-separated property IDs to include (optional)',
            },
          },
          required: ['from_date', 'to_date'],
        },
      },
      {
        name: 'get_check_register',
        description: 'Get check register showing all disbursements and vendor payments within a date range',
        inputSchema: {
          type: 'object',
          properties: {
            from_date: {
              type: 'string',
              description: 'Start date in YYYY-MM-DD format (required)',
            },
            to_date: {
              type: 'string',
              description: 'End date in YYYY-MM-DD format (required)',
            },
            property_ids: {
              type: 'string',
              description: 'Comma-separated property IDs to include (optional)',
            },
          },
          required: ['from_date'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'get_rent_roll':
          return this.fetchReport('rent_roll', args);
        case 'get_owner_statement':
          return this.fetchReport('owner_statement', args);
        case 'get_tenant_ledger':
          return this.fetchReport('tenant_ledger', args);
        case 'get_owner_ledger':
          return this.fetchReport('owner_ledger', args);
        case 'get_cash_flow':
          return this.fetchReport('cash_flow_statement', args);
        case 'get_balance_sheet':
          return this.fetchReport('balance_sheet', args);
        case 'get_income_statement':
          return this.fetchReport('income_statement', args);
        case 'get_maintenance_requests':
          return this.fetchReport('maintenance_request', args);
        case 'get_work_orders':
          return this.fetchReport('work_order', args);
        case 'get_lease_activity':
          return this.fetchReport('lease_activity', args);
        case 'get_lease_expiration':
          return this.fetchReport('lease_expiration', args);
        case 'get_vacancy_report':
          return this.fetchReport('vacancy', args);
        case 'get_delinquency':
          return this.fetchReport('delinquency', args);
        case 'get_bank_deposit':
          return this.fetchReport('bank_deposit', args);
        case 'get_check_register':
          return this.fetchReport('check_register', args);
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

  // ---- Helpers ----

  private get authHeader(): string {
    return 'Basic ' + Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
  }

  private buildBody(args: Record<string, unknown>): Record<string, unknown> {
    const body: Record<string, unknown> = {};

    if (args.from_date) body.from_date = args.from_date;
    if (args.to_date) body.to_date = args.to_date;
    if (args.as_of_date) body.as_of_date = args.as_of_date;

    if (args.property_ids) {
      body.paginate_results = true;
      body.filters = { property_ids: (args.property_ids as string).split(',').map(s => s.trim()) };
    }
    if (args.tenant_ids) {
      body.filters = {
        ...(body.filters as Record<string, unknown> ?? {}),
        tenant_ids: (args.tenant_ids as string).split(',').map(s => s.trim()),
      };
    }
    if (args.status) {
      body.filters = {
        ...(body.filters as Record<string, unknown> ?? {}),
        status: args.status,
      };
    }

    return body;
  }

  private async fetchReport(reportName: string, args: Record<string, unknown>): Promise<ToolResult> {
    const url = `${this.baseUrl}/${reportName}.json`;
    const body = this.buildBody(args);

    const response = await this.fetchWithRetry(url, {
      method: 'POST',
      headers: {
        Authorization: this.authHeader,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `API error: ${response.status} ${errText}` }], isError: true };
    }

    const data = await response.json();

    // Collect all pages up to 10KB total
    const pages: unknown[] = [data];
    let nextPageUrl: string | undefined = (data as Record<string, unknown>).next_page_url as string | undefined;
    let totalChars = JSON.stringify(data).length;

    while (nextPageUrl && totalChars < 10_000) {
      const nextResponse = await this.fetchWithRetry(nextPageUrl, {
        headers: {
          Authorization: this.authHeader,
          Accept: 'application/json',
        },
      });
      if (!nextResponse.ok) break;
      const nextData = await nextResponse.json() as Record<string, unknown>;
      pages.push(nextData);
      totalChars += JSON.stringify(nextData).length;
      nextPageUrl = nextData.next_page_url as string | undefined;
    }

    const combined = pages.length === 1 ? pages[0] : { pages };
    return { content: [{ type: 'text', text: this.truncate(combined) }], isError: false };
  }
}

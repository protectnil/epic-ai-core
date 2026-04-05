/**
 * Agilysys InfoGenesis POS MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Agilysys InfoGenesis POS REST API — widely deployed in casinos, resorts, stadiums, and arenas.
// Used by MGM Resorts, Wynn, Hard Rock, and major sports venues.
// Base URL is configurable per property (on-premises or Agilysys hosted).
// Auth: API key passed as a header.
// Docs: https://developer.agilysys.com/infogenesis/
// Rate limits: property-specific; consult your Agilysys contract and configuration.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface InfogenesisConfig {
  baseUrl: string;
  apiKey: string;
}

export class InfogenesisMCPServer extends MCPAdapterBase {
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(config: InfogenesisConfig) {
    super();
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.apiKey = config.apiKey;
  }

  static catalog() {
    return {
      name: 'infogenesis',
      displayName: 'Agilysys InfoGenesis POS',
      version: '1.0.0',
      category: 'hospitality',
      keywords: [
        'infogenesis', 'agilysys', 'pos', 'point of sale', 'casino', 'resort', 'stadium',
        'hospitality', 'food and beverage', 'f&b', 'revenue center', 'check', 'tender',
        'discount', 'void', 'labor', 'sales', 'menu', 'employee',
      ],
      toolNames: [
        'get_checks', 'get_check_detail', 'get_menu_items', 'get_revenue_centers',
        'get_employees', 'get_tenders', 'get_discounts', 'get_voids',
        'get_daily_sales_summary', 'get_labor_report',
      ],
      description: 'Agilysys InfoGenesis POS: retrieve check data, menu items, revenue centers, employee records, tenders, discounts, voids, and sales/labor reports for casino, resort, and stadium food-and-beverage operations.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'get_checks',
        description: 'Retrieve a list of POS checks (orders/tickets) filtered by date range, revenue center, or status',
        inputSchema: {
          type: 'object',
          properties: {
            start_date: {
              type: 'string',
              description: 'Start date in YYYY-MM-DD format',
            },
            end_date: {
              type: 'string',
              description: 'End date in YYYY-MM-DD format',
            },
            revenue_center_id: {
              type: 'string',
              description: 'Revenue center ID to filter checks',
            },
            status: {
              type: 'string',
              description: 'Check status filter: open, closed, voided',
            },
            employee_id: {
              type: 'string',
              description: 'Employee ID to filter checks by server/cashier',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of checks to return (default: 50)',
            },
          },
        },
      },
      {
        name: 'get_check_detail',
        description: 'Retrieve full detail for a single POS check including line items, modifiers, taxes, and payment',
        inputSchema: {
          type: 'object',
          properties: {
            check_id: {
              type: 'string',
              description: 'POS check ID',
            },
          },
          required: ['check_id'],
        },
      },
      {
        name: 'get_menu_items',
        description: 'Retrieve the menu item catalog for a revenue center, optionally filtered by category or name',
        inputSchema: {
          type: 'object',
          properties: {
            revenue_center_id: {
              type: 'string',
              description: 'Revenue center ID to scope the menu',
            },
            category: {
              type: 'string',
              description: 'Menu category name or ID to filter items',
            },
            search: {
              type: 'string',
              description: 'Search term to filter menu items by name',
            },
            active_only: {
              type: 'boolean',
              description: 'Return only active/available items (default: true)',
            },
            limit: {
              type: 'number',
              description: 'Maximum results to return (default: 100)',
            },
          },
        },
      },
      {
        name: 'get_revenue_centers',
        description: 'List all revenue centers (outlets) configured in the InfoGenesis system',
        inputSchema: {
          type: 'object',
          properties: {
            active_only: {
              type: 'boolean',
              description: 'Return only active revenue centers (default: true)',
            },
          },
        },
      },
      {
        name: 'get_employees',
        description: 'Retrieve employee records configured in InfoGenesis, optionally filtered by revenue center or role',
        inputSchema: {
          type: 'object',
          properties: {
            revenue_center_id: {
              type: 'string',
              description: 'Revenue center ID to filter employees by outlet assignment',
            },
            role: {
              type: 'string',
              description: 'Employee role filter (e.g. server, cashier, manager)',
            },
            active_only: {
              type: 'boolean',
              description: 'Return only active employees (default: true)',
            },
            limit: {
              type: 'number',
              description: 'Maximum results to return (default: 50)',
            },
          },
        },
      },
      {
        name: 'get_tenders',
        description: 'Retrieve tender (payment method) types configured in InfoGenesis',
        inputSchema: {
          type: 'object',
          properties: {
            active_only: {
              type: 'boolean',
              description: 'Return only active tender types (default: true)',
            },
          },
        },
      },
      {
        name: 'get_discounts',
        description: 'Retrieve discount types and promotion codes configured in InfoGenesis',
        inputSchema: {
          type: 'object',
          properties: {
            revenue_center_id: {
              type: 'string',
              description: 'Revenue center ID to scope discounts',
            },
            active_only: {
              type: 'boolean',
              description: 'Return only active discounts (default: true)',
            },
          },
        },
      },
      {
        name: 'get_voids',
        description: 'Retrieve voided items and checks for a date range and revenue center',
        inputSchema: {
          type: 'object',
          properties: {
            start_date: {
              type: 'string',
              description: 'Start date in YYYY-MM-DD format',
            },
            end_date: {
              type: 'string',
              description: 'End date in YYYY-MM-DD format',
            },
            revenue_center_id: {
              type: 'string',
              description: 'Revenue center ID to filter voids',
            },
            employee_id: {
              type: 'string',
              description: 'Employee ID to filter voids by user',
            },
            limit: {
              type: 'number',
              description: 'Maximum results to return (default: 50)',
            },
          },
        },
      },
      {
        name: 'get_daily_sales_summary',
        description: 'Retrieve a daily sales summary report broken down by revenue center, category, and tender type',
        inputSchema: {
          type: 'object',
          properties: {
            date: {
              type: 'string',
              description: 'Business date in YYYY-MM-DD format (required)',
            },
            revenue_center_id: {
              type: 'string',
              description: 'Revenue center ID to scope the report (omit for all outlets)',
            },
          },
          required: ['date'],
        },
      },
      {
        name: 'get_labor_report',
        description: 'Retrieve a labor report showing hours worked and labor cost by employee and revenue center for a date range',
        inputSchema: {
          type: 'object',
          properties: {
            start_date: {
              type: 'string',
              description: 'Start date in YYYY-MM-DD format (required)',
            },
            end_date: {
              type: 'string',
              description: 'End date in YYYY-MM-DD format (required)',
            },
            revenue_center_id: {
              type: 'string',
              description: 'Revenue center ID to scope the report',
            },
            employee_id: {
              type: 'string',
              description: 'Employee ID to scope the report to a single employee',
            },
          },
          required: ['start_date', 'end_date'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'get_checks':
          return this.getChecks(args);
        case 'get_check_detail':
          return this.getCheckDetail(args);
        case 'get_menu_items':
          return this.getMenuItems(args);
        case 'get_revenue_centers':
          return this.getRevenueCenters(args);
        case 'get_employees':
          return this.getEmployees(args);
        case 'get_tenders':
          return this.getTenders(args);
        case 'get_discounts':
          return this.getDiscounts(args);
        case 'get_voids':
          return this.getVoids(args);
        case 'get_daily_sales_summary':
          return this.getDailySalesSummary(args);
        case 'get_labor_report':
          return this.getLaborReport(args);
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

  private authHeaders(): Record<string, string> {
    return {
      'x-api-key': this.apiKey,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
  }

  private async apiGet(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'GET',
      headers: this.authHeaders(),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private buildParams(fields: Record<string, string | number | boolean | undefined>): string {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined && value !== null && value !== '') {
        params.set(key, String(value));
      }
    }
    const qs = params.toString();
    return qs ? `?${qs}` : '';
  }

  private async getChecks(args: Record<string, unknown>): Promise<ToolResult> {
    const qs = this.buildParams({
      startDate: args.start_date as string,
      endDate: args.end_date as string,
      revenueCenterId: args.revenue_center_id as string,
      status: args.status as string,
      employeeId: args.employee_id as string,
      limit: args.limit as number,
    });
    return this.apiGet(`/api/v1/checks${qs}`);
  }

  private async getCheckDetail(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.check_id) {
      return { content: [{ type: 'text', text: 'check_id is required' }], isError: true };
    }
    return this.apiGet(`/api/v1/checks/${encodeURIComponent(args.check_id as string)}`);
  }

  private async getMenuItems(args: Record<string, unknown>): Promise<ToolResult> {
    const qs = this.buildParams({
      revenueCenterId: args.revenue_center_id as string,
      category: args.category as string,
      search: args.search as string,
      activeOnly: args.active_only !== undefined ? (args.active_only as boolean) : true,
      limit: (args.limit as number) || 100,
    });
    return this.apiGet(`/api/v1/menu-items${qs}`);
  }

  private async getRevenueCenters(args: Record<string, unknown>): Promise<ToolResult> {
    const qs = this.buildParams({
      activeOnly: args.active_only !== undefined ? (args.active_only as boolean) : true,
    });
    return this.apiGet(`/api/v1/revenue-centers${qs}`);
  }

  private async getEmployees(args: Record<string, unknown>): Promise<ToolResult> {
    const qs = this.buildParams({
      revenueCenterId: args.revenue_center_id as string,
      role: args.role as string,
      activeOnly: args.active_only !== undefined ? (args.active_only as boolean) : true,
      limit: (args.limit as number) || 50,
    });
    return this.apiGet(`/api/v1/employees${qs}`);
  }

  private async getTenders(args: Record<string, unknown>): Promise<ToolResult> {
    const qs = this.buildParams({
      activeOnly: args.active_only !== undefined ? (args.active_only as boolean) : true,
    });
    return this.apiGet(`/api/v1/tenders${qs}`);
  }

  private async getDiscounts(args: Record<string, unknown>): Promise<ToolResult> {
    const qs = this.buildParams({
      revenueCenterId: args.revenue_center_id as string,
      activeOnly: args.active_only !== undefined ? (args.active_only as boolean) : true,
    });
    return this.apiGet(`/api/v1/discounts${qs}`);
  }

  private async getVoids(args: Record<string, unknown>): Promise<ToolResult> {
    const qs = this.buildParams({
      startDate: args.start_date as string,
      endDate: args.end_date as string,
      revenueCenterId: args.revenue_center_id as string,
      employeeId: args.employee_id as string,
      limit: (args.limit as number) || 50,
    });
    return this.apiGet(`/api/v1/voids${qs}`);
  }

  private async getDailySalesSummary(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.date) {
      return { content: [{ type: 'text', text: 'date is required' }], isError: true };
    }
    const qs = this.buildParams({
      date: args.date as string,
      revenueCenterId: args.revenue_center_id as string,
    });
    return this.apiGet(`/api/v1/reports/daily-sales${qs}`);
  }

  private async getLaborReport(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.start_date || !args.end_date) {
      return { content: [{ type: 'text', text: 'start_date and end_date are required' }], isError: true };
    }
    const qs = this.buildParams({
      startDate: args.start_date as string,
      endDate: args.end_date as string,
      revenueCenterId: args.revenue_center_id as string,
      employeeId: args.employee_id as string,
    });
    return this.apiGet(`/api/v1/reports/labor${qs}`);
  }
}

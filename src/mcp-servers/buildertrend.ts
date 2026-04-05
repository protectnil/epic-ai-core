/**
 * Buildertrend MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Base URL: https://api.buildertrend.com
// Auth: API key via Authorization header (Bearer {api_key})
// Docs: https://developer.buildertrend.com
// Rate limits: Not publicly documented

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface BuildertrendConfig {
  apiKey: string;
  baseUrl?: string;
}

export class BuildertrendMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: BuildertrendConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.buildertrend.com';
  }

  static catalog() {
    return {
      name: 'buildertrend',
      displayName: 'Buildertrend',
      version: '1.0.0',
      category: 'construction',
      keywords: ['buildertrend', 'residential', 'construction', 'homebuilder', 'jobs', 'schedule', 'change orders', 'daily logs', 'to-dos', 'selections', 'warranties', 'budget'],
      toolNames: [
        'list_jobs', 'get_job',
        'list_schedules', 'get_schedule_item',
        'list_change_orders', 'create_change_order',
        'list_daily_logs', 'create_daily_log',
        'list_to_dos', 'create_to_do',
        'list_selections', 'list_warranties', 'get_budget_summary',
      ],
      description: 'Buildertrend residential construction management: manage jobs, schedules, change orders, daily logs, to-dos, selections, warranties, and budgets.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_jobs',
        description: 'List all residential construction jobs in Buildertrend with optional status filter',
        inputSchema: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              description: 'Filter by job status: active, lead, completed, canceled',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            page_size: {
              type: 'number',
              description: 'Number of results per page (default: 20)',
            },
          },
        },
      },
      {
        name: 'get_job',
        description: 'Get detailed information for a specific Buildertrend construction job',
        inputSchema: {
          type: 'object',
          properties: {
            job_id: {
              type: 'number',
              description: 'Buildertrend job ID',
            },
          },
          required: ['job_id'],
        },
      },
      {
        name: 'list_schedules',
        description: 'List schedule items for a construction job with optional date range filter',
        inputSchema: {
          type: 'object',
          properties: {
            job_id: {
              type: 'number',
              description: 'Job ID to list schedule items for',
            },
            start_date: {
              type: 'string',
              description: 'Filter schedule items starting on or after this date (YYYY-MM-DD)',
            },
            end_date: {
              type: 'string',
              description: 'Filter schedule items ending on or before this date (YYYY-MM-DD)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
          },
          required: ['job_id'],
        },
      },
      {
        name: 'get_schedule_item',
        description: 'Get detailed information for a specific schedule item in a Buildertrend job',
        inputSchema: {
          type: 'object',
          properties: {
            schedule_item_id: {
              type: 'number',
              description: 'Schedule item ID to retrieve',
            },
          },
          required: ['schedule_item_id'],
        },
      },
      {
        name: 'list_change_orders',
        description: 'List change orders for a construction job with optional status filter',
        inputSchema: {
          type: 'object',
          properties: {
            job_id: {
              type: 'number',
              description: 'Job ID to list change orders for',
            },
            status: {
              type: 'string',
              description: 'Filter by change order status: pending, approved, rejected, void',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
          },
          required: ['job_id'],
        },
      },
      {
        name: 'create_change_order',
        description: 'Create a new change order for a residential construction job in Buildertrend',
        inputSchema: {
          type: 'object',
          properties: {
            job_id: {
              type: 'number',
              description: 'Job ID to create the change order for',
            },
            title: {
              type: 'string',
              description: 'Change order title or summary',
            },
            description: {
              type: 'string',
              description: 'Detailed description of the change',
            },
            amount: {
              type: 'number',
              description: 'Change order amount (positive for increase, negative for decrease)',
            },
            reason: {
              type: 'string',
              description: 'Reason for the change: owner_request, design_change, unforeseen_condition, other',
            },
          },
          required: ['job_id', 'title', 'amount'],
        },
      },
      {
        name: 'list_daily_logs',
        description: 'List daily construction logs for a job with optional date range filter',
        inputSchema: {
          type: 'object',
          properties: {
            job_id: {
              type: 'number',
              description: 'Job ID to list daily logs for',
            },
            start_date: {
              type: 'string',
              description: 'Filter logs from this date (YYYY-MM-DD)',
            },
            end_date: {
              type: 'string',
              description: 'Filter logs through this date (YYYY-MM-DD)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
          },
          required: ['job_id'],
        },
      },
      {
        name: 'create_daily_log',
        description: 'Create a new daily construction log entry for a job in Buildertrend',
        inputSchema: {
          type: 'object',
          properties: {
            job_id: {
              type: 'number',
              description: 'Job ID to create the daily log for',
            },
            log_date: {
              type: 'string',
              description: 'Date of the log entry (YYYY-MM-DD)',
            },
            notes: {
              type: 'string',
              description: 'Daily log notes, observations, and work performed',
            },
            weather: {
              type: 'string',
              description: 'Weather conditions for the day',
            },
            workers_on_site: {
              type: 'number',
              description: 'Number of workers on site for the day',
            },
          },
          required: ['job_id', 'log_date', 'notes'],
        },
      },
      {
        name: 'list_to_dos',
        description: 'List to-do items for a construction job with optional status and assignee filters',
        inputSchema: {
          type: 'object',
          properties: {
            job_id: {
              type: 'number',
              description: 'Job ID to list to-do items for',
            },
            status: {
              type: 'string',
              description: 'Filter by to-do status: open, completed',
            },
            assigned_to_id: {
              type: 'number',
              description: 'Filter to-dos by assignee user ID',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
          },
          required: ['job_id'],
        },
      },
      {
        name: 'create_to_do',
        description: 'Create a new to-do item for a construction job in Buildertrend',
        inputSchema: {
          type: 'object',
          properties: {
            job_id: {
              type: 'number',
              description: 'Job ID to create the to-do for',
            },
            title: {
              type: 'string',
              description: 'To-do item title or task description',
            },
            description: {
              type: 'string',
              description: 'Detailed description of the to-do item',
            },
            assigned_to_id: {
              type: 'number',
              description: 'User ID to assign the to-do to',
            },
            due_date: {
              type: 'string',
              description: 'Due date for the to-do item (YYYY-MM-DD)',
            },
            priority: {
              type: 'string',
              description: 'To-do priority: low, medium, high',
            },
          },
          required: ['job_id', 'title'],
        },
      },
      {
        name: 'list_selections',
        description: 'List owner selections for a residential construction job (finishes, fixtures, options)',
        inputSchema: {
          type: 'object',
          properties: {
            job_id: {
              type: 'number',
              description: 'Job ID to list selections for',
            },
            status: {
              type: 'string',
              description: 'Filter by selection status: pending, approved, ordered',
            },
            category: {
              type: 'string',
              description: 'Filter by selection category (e.g. flooring, cabinets, fixtures)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
          },
          required: ['job_id'],
        },
      },
      {
        name: 'list_warranties',
        description: 'List warranty claims and service requests for a construction job',
        inputSchema: {
          type: 'object',
          properties: {
            job_id: {
              type: 'number',
              description: 'Job ID to list warranties for',
            },
            status: {
              type: 'string',
              description: 'Filter by warranty status: open, in_progress, closed',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
          },
          required: ['job_id'],
        },
      },
      {
        name: 'get_budget_summary',
        description: 'Get a budget summary for a construction job including contract amount, costs, and variance',
        inputSchema: {
          type: 'object',
          properties: {
            job_id: {
              type: 'number',
              description: 'Job ID to retrieve the budget summary for',
            },
          },
          required: ['job_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_jobs':
          return this.listJobs(args);
        case 'get_job':
          return this.getJob(args);
        case 'list_schedules':
          return this.listSchedules(args);
        case 'get_schedule_item':
          return this.getScheduleItem(args);
        case 'list_change_orders':
          return this.listChangeOrders(args);
        case 'create_change_order':
          return this.createChangeOrder(args);
        case 'list_daily_logs':
          return this.listDailyLogs(args);
        case 'create_daily_log':
          return this.createDailyLog(args);
        case 'list_to_dos':
          return this.listToDos(args);
        case 'create_to_do':
          return this.createToDo(args);
        case 'list_selections':
          return this.listSelections(args);
        case 'list_warranties':
          return this.listWarranties(args);
        case 'get_budget_summary':
          return this.getBudgetSummary(args);
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
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  private async apiGet(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      headers: this.authHeaders(),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apiPost(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.authHeaders(),
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listJobs(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams({
      page: String((args.page as number) || 1),
      pageSize: String((args.page_size as number) || 20),
    });
    if (args.status) params.set('status', args.status as string);
    return this.apiGet(`/v3/jobs?${params.toString()}`);
  }

  private async getJob(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.job_id === undefined) {
      return { content: [{ type: 'text', text: 'job_id is required' }], isError: true };
    }
    return this.apiGet(`/v3/jobs/${encodeURIComponent(String(args.job_id))}`);
  }

  private async listSchedules(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.job_id === undefined) {
      return { content: [{ type: 'text', text: 'job_id is required' }], isError: true };
    }
    const params = new URLSearchParams({
      jobId: String(args.job_id),
      page: String((args.page as number) || 1),
    });
    if (args.start_date) params.set('startDate', args.start_date as string);
    if (args.end_date) params.set('endDate', args.end_date as string);
    return this.apiGet(`/v3/schedules?${params.toString()}`);
  }

  private async getScheduleItem(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.schedule_item_id === undefined) {
      return { content: [{ type: 'text', text: 'schedule_item_id is required' }], isError: true };
    }
    return this.apiGet(`/v3/schedules/${encodeURIComponent(String(args.schedule_item_id))}`);
  }

  private async listChangeOrders(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.job_id === undefined) {
      return { content: [{ type: 'text', text: 'job_id is required' }], isError: true };
    }
    const params = new URLSearchParams({
      jobId: String(args.job_id),
      page: String((args.page as number) || 1),
    });
    if (args.status) params.set('status', args.status as string);
    return this.apiGet(`/v3/change-orders?${params.toString()}`);
  }

  private async createChangeOrder(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.job_id === undefined || !args.title || args.amount === undefined) {
      return { content: [{ type: 'text', text: 'job_id, title, and amount are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      jobId: args.job_id,
      title: args.title,
      amount: args.amount,
    };
    if (args.description) body.description = args.description;
    if (args.reason) body.reason = args.reason;
    return this.apiPost('/v3/change-orders', body);
  }

  private async listDailyLogs(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.job_id === undefined) {
      return { content: [{ type: 'text', text: 'job_id is required' }], isError: true };
    }
    const params = new URLSearchParams({
      jobId: String(args.job_id),
      page: String((args.page as number) || 1),
    });
    if (args.start_date) params.set('startDate', args.start_date as string);
    if (args.end_date) params.set('endDate', args.end_date as string);
    return this.apiGet(`/v3/daily-logs?${params.toString()}`);
  }

  private async createDailyLog(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.job_id === undefined || !args.log_date || !args.notes) {
      return { content: [{ type: 'text', text: 'job_id, log_date, and notes are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      jobId: args.job_id,
      date: args.log_date,
      notes: args.notes,
    };
    if (args.weather) body.weather = args.weather;
    if (args.workers_on_site !== undefined) body.workersOnSite = args.workers_on_site;
    return this.apiPost('/v3/daily-logs', body);
  }

  private async listToDos(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.job_id === undefined) {
      return { content: [{ type: 'text', text: 'job_id is required' }], isError: true };
    }
    const params = new URLSearchParams({
      jobId: String(args.job_id),
      page: String((args.page as number) || 1),
    });
    if (args.status) params.set('status', args.status as string);
    if (args.assigned_to_id !== undefined) params.set('assignedToId', String(args.assigned_to_id));
    return this.apiGet(`/v3/to-dos?${params.toString()}`);
  }

  private async createToDo(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.job_id === undefined || !args.title) {
      return { content: [{ type: 'text', text: 'job_id and title are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      jobId: args.job_id,
      title: args.title,
    };
    if (args.description) body.description = args.description;
    if (args.assigned_to_id !== undefined) body.assignedToId = args.assigned_to_id;
    if (args.due_date) body.dueDate = args.due_date;
    if (args.priority) body.priority = args.priority;
    return this.apiPost('/v3/to-dos', body);
  }

  private async listSelections(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.job_id === undefined) {
      return { content: [{ type: 'text', text: 'job_id is required' }], isError: true };
    }
    const params = new URLSearchParams({
      jobId: String(args.job_id),
      page: String((args.page as number) || 1),
    });
    if (args.status) params.set('status', args.status as string);
    if (args.category) params.set('category', args.category as string);
    return this.apiGet(`/v3/selections?${params.toString()}`);
  }

  private async listWarranties(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.job_id === undefined) {
      return { content: [{ type: 'text', text: 'job_id is required' }], isError: true };
    }
    const params = new URLSearchParams({
      jobId: String(args.job_id),
      page: String((args.page as number) || 1),
    });
    if (args.status) params.set('status', args.status as string);
    return this.apiGet(`/v3/warranties?${params.toString()}`);
  }

  private async getBudgetSummary(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.job_id === undefined) {
      return { content: [{ type: 'text', text: 'job_id is required' }], isError: true };
    }
    return this.apiGet(`/v3/jobs/${encodeURIComponent(String(args.job_id))}/budget-summary`);
  }
}

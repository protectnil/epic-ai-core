/**
 * SAP Concur MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/CDataSoftware/sap-concur-mcp-server-by-cdata — transport: stdio, auth: CData JDBC license
//   This is a CData read-only JDBC bridge, NOT an official SAP/Concur MCP server. Requires a paid CData license.
//   It exposes data as SQL-relational tables, not as REST operations. 0 useful action tools (read-only JDBC bridge).
//   No official SAP Concur MCP server exists as of 2026-03-28.
// Our adapter covers: 15 tools. Vendor MCP covers: 0 action tools (read-only JDBC, not comparable).
// Recommendation: use-rest-api — CData MCP fails criteria: not official SAP, read-only, requires external licensing.
//   Our REST adapter is the authoritative SAP Concur integration.
//
// Base URL: https://{datacenter}.api.concursolutions.com (geolocation-based)
//   Default: https://us.api.concursolutions.com — EU customers: https://eu.api.concursolutions.com
//   AP/US-GOV customers: https://usg.api.concursolutions.com
// Auth: OAuth2 Bearer token — obtain via POST /oauth2/v0/token (client credentials or refresh token)
//   Returns: { access_token, token_type: "Bearer", expires_in, refresh_token }
// Docs: https://developer.concur.com/api-reference/
//       Expense Reports v4: https://developer.concur.com/api-reference/expense/expense-report/v4.reports.html
//       Workflows v4: https://developer.concur.com/api-reference/expense/expense-report/v4.workflows.html
//       Expenses v4: https://developer.concur.com/api-reference/expense/expense-report/v4.expenses.html
//       Identity v4: https://developer.concur.com/api-reference/profile/v4.identity.html
// Rate limits: Not publicly documented; standard SAP throttling applies per OAuth2 token
// NOTE: get_user_profile uses /profile/v1/me (legacy). Current API is Identity v4 at
//   /profile/identity/v4/Users. The v1 endpoint may still function for backward compatibility.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface ConcurConfig {
  accessToken: string;
  baseUrl?: string;
}

export class ConcurMCPServer extends MCPAdapterBase {
  private readonly accessToken: string;
  private readonly baseUrl: string;

  constructor(config: ConcurConfig) {
    super();
    this.accessToken = config.accessToken;
    // Default to US datacenter. EU callers: https://eu.api.concursolutions.com
    // AP callers: https://usg.api.concursolutions.com
    this.baseUrl = (config.baseUrl ?? 'https://us.api.concursolutions.com').replace(/\/$/, '');
  }

  static catalog() {
    return {
      name: 'concur',
      displayName: 'SAP Concur',
      version: '1.0.0',
      category: 'finance' as const,
      keywords: ['concur', 'sap', 'expense', 'travel', 'reimbursement', 'report', 'receipt', 'approval', 'invoice', 'spend'],
      toolNames: [
        'list_expense_reports', 'get_expense_report', 'create_expense_report',
        'update_expense_report', 'submit_expense_report', 'approve_expense_report',
        'send_back_expense_report',
        'list_report_expenses', 'get_expense_entry',
        'get_expense_allocations', 'get_expense_attendees',
        'list_expense_comments', 'add_expense_comment',
        'list_request_policies',
        'get_user_profile',
      ],
      description: 'SAP Concur travel and expense management: expense reports, line items, allocations, attendees, approvals, comments, and user profiles.',
      author: 'protectnil' as const,
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_expense_reports',
        description: 'List expense reports for a user in SAP Concur with optional date range and status filters.',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: {
              type: 'string',
              description: 'Concur user UUID (from JWT sub claim or user profile)',
            },
            context_type: {
              type: 'string',
              description: 'Access context: TRAVELER (own reports) or MANAGER (approver view). Default: TRAVELER',
            },
            start_date: {
              type: 'string',
              description: 'Filter reports created on or after this date (YYYY-MM-DD)',
            },
            end_date: {
              type: 'string',
              description: 'Filter reports created on or before this date (YYYY-MM-DD)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of reports to return (default: 25)',
            },
          },
          required: ['user_id'],
        },
      },
      {
        name: 'get_expense_report',
        description: 'Get full header details of a single expense report including status, totals, and workflow state.',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: {
              type: 'string',
              description: 'Concur user UUID',
            },
            report_id: {
              type: 'string',
              description: 'Expense report ID',
            },
            context_type: {
              type: 'string',
              description: 'Access context: TRAVELER or MANAGER. Default: TRAVELER',
            },
          },
          required: ['user_id', 'report_id'],
        },
      },
      {
        name: 'create_expense_report',
        description: 'Create a new expense report header for a user. Returns the created report ID.',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: {
              type: 'string',
              description: 'Concur user UUID',
            },
            name: {
              type: 'string',
              description: 'Name/title of the expense report',
            },
            business_purpose: {
              type: 'string',
              description: 'Business purpose statement for the report',
            },
            policy_id: {
              type: 'string',
              description: 'Policy ID to apply — retrieve valid IDs using list_request_policies',
            },
            start_date: {
              type: 'string',
              description: 'Report start date (YYYY-MM-DD)',
            },
            end_date: {
              type: 'string',
              description: 'Report end date (YYYY-MM-DD)',
            },
          },
          required: ['user_id', 'name'],
        },
      },
      {
        name: 'update_expense_report',
        description: 'Update an existing expense report header fields such as name, business purpose, or dates.',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: {
              type: 'string',
              description: 'Concur user UUID',
            },
            report_id: {
              type: 'string',
              description: 'Expense report ID to update',
            },
            name: {
              type: 'string',
              description: 'New report name',
            },
            business_purpose: {
              type: 'string',
              description: 'New business purpose statement',
            },
            start_date: {
              type: 'string',
              description: 'New start date (YYYY-MM-DD)',
            },
            end_date: {
              type: 'string',
              description: 'New end date (YYYY-MM-DD)',
            },
          },
          required: ['user_id', 'report_id'],
        },
      },
      {
        name: 'submit_expense_report',
        description: 'Submit an expense report for approval workflow. Moves report from draft to submitted state.',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: {
              type: 'string',
              description: 'Concur user UUID',
            },
            report_id: {
              type: 'string',
              description: 'Expense report ID to submit',
            },
          },
          required: ['user_id', 'report_id'],
        },
      },
      {
        name: 'approve_expense_report',
        description: 'Approve an expense report as a manager or authorized approver, advancing it in the workflow.',
        inputSchema: {
          type: 'object',
          properties: {
            report_id: {
              type: 'string',
              description: 'The expense report ID to approve',
            },
            comment: {
              type: 'string',
              description: 'Optional approval comment',
            },
          },
          required: ['report_id'],
        },
      },
      {
        name: 'send_back_expense_report',
        description: 'Send an expense report back to the submitter for corrections with a required comment explaining why.',
        inputSchema: {
          type: 'object',
          properties: {
            report_id: {
              type: 'string',
              description: 'The expense report ID to send back',
            },
            comment: {
              type: 'string',
              description: 'Required explanation of why the report is being sent back',
            },
          },
          required: ['report_id', 'comment'],
        },
      },
      {
        name: 'list_report_expenses',
        description: 'List individual expense line items within a report, including amounts, categories, and receipt status.',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: {
              type: 'string',
              description: 'Concur user UUID',
            },
            report_id: {
              type: 'string',
              description: 'Expense report ID',
            },
            context_type: {
              type: 'string',
              description: 'Access context: TRAVELER or MANAGER. Default: TRAVELER',
            },
          },
          required: ['user_id', 'report_id'],
        },
      },
      {
        name: 'get_expense_entry',
        description: 'Get full details of a single expense line item including tax, custom fields, and receipt linkage.',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: {
              type: 'string',
              description: 'Concur user UUID',
            },
            report_id: {
              type: 'string',
              description: 'Expense report ID',
            },
            expense_id: {
              type: 'string',
              description: 'Expense line item ID',
            },
            context_type: {
              type: 'string',
              description: 'Access context: TRAVELER or MANAGER. Default: TRAVELER',
            },
          },
          required: ['user_id', 'report_id', 'expense_id'],
        },
      },
      {
        name: 'get_expense_allocations',
        description: 'Get cost center allocations for a specific expense line item, including percentages and accounting codes.',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: {
              type: 'string',
              description: 'Concur user UUID',
            },
            report_id: {
              type: 'string',
              description: 'Expense report ID',
            },
            expense_id: {
              type: 'string',
              description: 'Expense line item ID',
            },
            context_type: {
              type: 'string',
              description: 'Access context: TRAVELER or MANAGER. Default: TRAVELER',
            },
          },
          required: ['user_id', 'report_id', 'expense_id'],
        },
      },
      {
        name: 'get_expense_attendees',
        description: 'Get attendees associated with a specific expense line item such as a business meal or entertainment expense.',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: {
              type: 'string',
              description: 'Concur user UUID',
            },
            report_id: {
              type: 'string',
              description: 'Expense report ID',
            },
            expense_id: {
              type: 'string',
              description: 'Expense line item ID',
            },
            context_type: {
              type: 'string',
              description: 'Access context: TRAVELER or MANAGER. Default: TRAVELER',
            },
          },
          required: ['user_id', 'report_id', 'expense_id'],
        },
      },
      {
        name: 'list_expense_comments',
        description: 'List all comments on an expense report or a specific expense line item.',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: {
              type: 'string',
              description: 'Concur user UUID',
            },
            report_id: {
              type: 'string',
              description: 'Expense report ID',
            },
            expense_id: {
              type: 'string',
              description: 'Expense line item ID — if omitted, returns report-level comments',
            },
            context_type: {
              type: 'string',
              description: 'Access context: TRAVELER or MANAGER. Default: TRAVELER',
            },
          },
          required: ['user_id', 'report_id'],
        },
      },
      {
        name: 'add_expense_comment',
        description: 'Add a comment to an expense report for audit trail, clarification, or approval notes.',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: {
              type: 'string',
              description: 'Concur user UUID of the commenter',
            },
            report_id: {
              type: 'string',
              description: 'Expense report ID',
            },
            comment: {
              type: 'string',
              description: 'Comment text to add to the report',
            },
            expense_id: {
              type: 'string',
              description: 'Expense line item ID — if omitted, adds a report-level comment',
            },
          },
          required: ['user_id', 'report_id', 'comment'],
        },
      },
      {
        name: 'list_request_policies',
        description: 'List available expense report policies for an organization, including policy IDs and names needed for report creation.',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: {
              type: 'string',
              description: 'Concur user UUID — returns policies applicable to this user',
            },
          },
          required: ['user_id'],
        },
      },
      {
        name: 'get_user_profile',
        description: 'Get the Concur profile for a user by their login ID or email, including UUID needed for expense operations.',
        inputSchema: {
          type: 'object',
          properties: {
            login_id: {
              type: 'string',
              description: 'User login ID (typically email address)',
            },
          },
          required: ['login_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_expense_reports':
          return this.listExpenseReports(args);
        case 'get_expense_report':
          return this.getExpenseReport(args);
        case 'create_expense_report':
          return this.createExpenseReport(args);
        case 'update_expense_report':
          return this.updateExpenseReport(args);
        case 'submit_expense_report':
          return this.submitExpenseReport(args);
        case 'approve_expense_report':
          return this.approveExpenseReport(args);
        case 'send_back_expense_report':
          return this.sendBackExpenseReport(args);
        case 'list_report_expenses':
          return this.listReportExpenses(args);
        case 'get_expense_entry':
          return this.getExpenseEntry(args);
        case 'get_expense_allocations':
          return this.getExpenseAllocations(args);
        case 'get_expense_attendees':
          return this.getExpenseAttendees(args);
        case 'list_expense_comments':
          return this.listExpenseComments(args);
        case 'add_expense_comment':
          return this.addExpenseComment(args);
        case 'list_request_policies':
          return this.listRequestPolicies(args);
        case 'get_user_profile':
          return this.getUserProfile(args);
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

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private get headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
    };
  }

  private async fetchJson(url: string, init: RequestInit): Promise<ToolResult> {
    const response = await this.fetchWithRetry(url, init);
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return {
        content: [{ type: 'text', text: `API error ${response.status}: ${errText}` }],
        isError: true,
      };
    }
    let data: unknown;
    try {
      data = await response.json();
    } catch {
      data = { status: response.status, ok: true };
    }
    return {
      content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }],
      isError: false,
    };
  }

  private async listExpenseReports(args: Record<string, unknown>): Promise<ToolResult> {
    const userId = args.user_id as string;
    if (!userId) {
      return { content: [{ type: 'text', text: 'user_id is required' }], isError: true };
    }
    const contextType = (args.context_type as string) ?? 'TRAVELER';
    const params = new URLSearchParams();
    if (args.start_date) params.set('startDate', args.start_date as string);
    if (args.end_date) params.set('endDate', args.end_date as string);
    if (args.limit) params.set('limit', String(args.limit));
    const qs = params.toString();
    const url = `${this.baseUrl}/expensereports/v4/users/${encodeURIComponent(userId)}/context/${encodeURIComponent(contextType)}/reports${qs ? `?${qs}` : ''}`;
    return this.fetchJson(url, { method: 'GET', headers: this.headers });
  }

  private async getExpenseReport(args: Record<string, unknown>): Promise<ToolResult> {
    const userId = args.user_id as string;
    const reportId = args.report_id as string;
    if (!userId || !reportId) {
      return { content: [{ type: 'text', text: 'user_id and report_id are required' }], isError: true };
    }
    const contextType = (args.context_type as string) ?? 'TRAVELER';
    const url = `${this.baseUrl}/expensereports/v4/users/${encodeURIComponent(userId)}/context/${encodeURIComponent(contextType)}/reports/${encodeURIComponent(reportId)}`;
    return this.fetchJson(url, { method: 'GET', headers: this.headers });
  }

  private async createExpenseReport(args: Record<string, unknown>): Promise<ToolResult> {
    const userId = args.user_id as string;
    const reportName = args.name as string;
    if (!userId || !reportName) {
      return { content: [{ type: 'text', text: 'user_id and name are required' }], isError: true };
    }
    const body: Record<string, unknown> = { name: reportName };
    if (args.business_purpose) body.businessPurpose = args.business_purpose;
    if (args.policy_id) body.policy = { id: args.policy_id };
    if (args.start_date) body.startDate = args.start_date;
    if (args.end_date) body.endDate = args.end_date;
    const url = `${this.baseUrl}/expensereports/v4/users/${encodeURIComponent(userId)}/context/TRAVELER/reports`;
    return this.fetchJson(url, { method: 'POST', headers: this.headers, body: JSON.stringify(body) });
  }

  private async updateExpenseReport(args: Record<string, unknown>): Promise<ToolResult> {
    const userId = args.user_id as string;
    const reportId = args.report_id as string;
    if (!userId || !reportId) {
      return { content: [{ type: 'text', text: 'user_id and report_id are required' }], isError: true };
    }
    const body: Record<string, unknown> = {};
    if (args.name) body.name = args.name;
    if (args.business_purpose) body.businessPurpose = args.business_purpose;
    if (args.start_date) body.startDate = args.start_date;
    if (args.end_date) body.endDate = args.end_date;
    const url = `${this.baseUrl}/expensereports/v4/users/${encodeURIComponent(userId)}/context/TRAVELER/reports/${encodeURIComponent(reportId)}`;
    return this.fetchJson(url, { method: 'PATCH', headers: this.headers, body: JSON.stringify(body) });
  }

  private async submitExpenseReport(args: Record<string, unknown>): Promise<ToolResult> {
    const userId = args.user_id as string;
    const reportId = args.report_id as string;
    if (!userId || !reportId) {
      return { content: [{ type: 'text', text: 'user_id and report_id are required' }], isError: true };
    }
    const url = `${this.baseUrl}/expensereports/v4/users/${encodeURIComponent(userId)}/reports/${encodeURIComponent(reportId)}/submit`;
    return this.fetchJson(url, { method: 'PATCH', headers: this.headers, body: JSON.stringify({}) });
  }

  private async approveExpenseReport(args: Record<string, unknown>): Promise<ToolResult> {
    const reportId = args.report_id as string;
    if (!reportId) {
      return { content: [{ type: 'text', text: 'report_id is required' }], isError: true };
    }
    const body: Record<string, unknown> = {};
    if (args.comment) body.comment = args.comment;
    const url = `${this.baseUrl}/expensereports/v4/reports/${encodeURIComponent(reportId)}/approve`;
    return this.fetchJson(url, { method: 'PATCH', headers: this.headers, body: JSON.stringify(body) });
  }

  private async sendBackExpenseReport(args: Record<string, unknown>): Promise<ToolResult> {
    const reportId = args.report_id as string;
    const comment = args.comment as string;
    if (!reportId || !comment) {
      return { content: [{ type: 'text', text: 'report_id and comment are required' }], isError: true };
    }
    const url = `${this.baseUrl}/expensereports/v4/reports/${encodeURIComponent(reportId)}/sendBack`;
    return this.fetchJson(url, { method: 'PATCH', headers: this.headers, body: JSON.stringify({ comment }) });
  }

  private async listReportExpenses(args: Record<string, unknown>): Promise<ToolResult> {
    const userId = args.user_id as string;
    const reportId = args.report_id as string;
    if (!userId || !reportId) {
      return { content: [{ type: 'text', text: 'user_id and report_id are required' }], isError: true };
    }
    const contextType = (args.context_type as string) ?? 'TRAVELER';
    const url = `${this.baseUrl}/expensereports/v4/users/${encodeURIComponent(userId)}/context/${encodeURIComponent(contextType)}/reports/${encodeURIComponent(reportId)}/expenses`;
    return this.fetchJson(url, { method: 'GET', headers: this.headers });
  }

  private async getExpenseEntry(args: Record<string, unknown>): Promise<ToolResult> {
    const userId = args.user_id as string;
    const reportId = args.report_id as string;
    const expenseId = args.expense_id as string;
    if (!userId || !reportId || !expenseId) {
      return { content: [{ type: 'text', text: 'user_id, report_id, and expense_id are required' }], isError: true };
    }
    const contextType = (args.context_type as string) ?? 'TRAVELER';
    const url = `${this.baseUrl}/expensereports/v4/users/${encodeURIComponent(userId)}/context/${encodeURIComponent(contextType)}/reports/${encodeURIComponent(reportId)}/expenses/${encodeURIComponent(expenseId)}`;
    return this.fetchJson(url, { method: 'GET', headers: this.headers });
  }

  private async getExpenseAllocations(args: Record<string, unknown>): Promise<ToolResult> {
    const userId = args.user_id as string;
    const reportId = args.report_id as string;
    const expenseId = args.expense_id as string;
    if (!userId || !reportId || !expenseId) {
      return { content: [{ type: 'text', text: 'user_id, report_id, and expense_id are required' }], isError: true };
    }
    const contextType = (args.context_type as string) ?? 'TRAVELER';
    const url = `${this.baseUrl}/expensereports/v4/users/${encodeURIComponent(userId)}/context/${encodeURIComponent(contextType)}/reports/${encodeURIComponent(reportId)}/expenses/${encodeURIComponent(expenseId)}/allocations`;
    return this.fetchJson(url, { method: 'GET', headers: this.headers });
  }

  private async getExpenseAttendees(args: Record<string, unknown>): Promise<ToolResult> {
    const userId = args.user_id as string;
    const reportId = args.report_id as string;
    const expenseId = args.expense_id as string;
    if (!userId || !reportId || !expenseId) {
      return { content: [{ type: 'text', text: 'user_id, report_id, and expense_id are required' }], isError: true };
    }
    const contextType = (args.context_type as string) ?? 'TRAVELER';
    const url = `${this.baseUrl}/expensereports/v4/users/${encodeURIComponent(userId)}/context/${encodeURIComponent(contextType)}/reports/${encodeURIComponent(reportId)}/expenses/${encodeURIComponent(expenseId)}/attendees`;
    return this.fetchJson(url, { method: 'GET', headers: this.headers });
  }

  private async listExpenseComments(args: Record<string, unknown>): Promise<ToolResult> {
    const userId = args.user_id as string;
    const reportId = args.report_id as string;
    if (!userId || !reportId) {
      return { content: [{ type: 'text', text: 'user_id and report_id are required' }], isError: true };
    }
    const contextType = (args.context_type as string) ?? 'TRAVELER';
    let url: string;
    if (args.expense_id) {
      url = `${this.baseUrl}/expensereports/v4/users/${encodeURIComponent(userId)}/context/${encodeURIComponent(contextType)}/reports/${encodeURIComponent(reportId)}/expenses/${encodeURIComponent(args.expense_id as string)}/comments`;
    } else {
      url = `${this.baseUrl}/expensereports/v4/users/${encodeURIComponent(userId)}/context/${encodeURIComponent(contextType)}/reports/${encodeURIComponent(reportId)}/comments`;
    }
    return this.fetchJson(url, { method: 'GET', headers: this.headers });
  }

  private async addExpenseComment(args: Record<string, unknown>): Promise<ToolResult> {
    const userId = args.user_id as string;
    const reportId = args.report_id as string;
    const comment = args.comment as string;
    if (!userId || !reportId || !comment) {
      return { content: [{ type: 'text', text: 'user_id, report_id, and comment are required' }], isError: true };
    }
    const contextType = 'TRAVELER';
    let url: string;
    if (args.expense_id) {
      url = `${this.baseUrl}/expensereports/v4/users/${encodeURIComponent(userId)}/context/${contextType}/reports/${encodeURIComponent(reportId)}/expenses/${encodeURIComponent(args.expense_id as string)}/comments`;
    } else {
      url = `${this.baseUrl}/expensereports/v4/users/${encodeURIComponent(userId)}/context/${contextType}/reports/${encodeURIComponent(reportId)}/comments`;
    }
    return this.fetchJson(url, { method: 'POST', headers: this.headers, body: JSON.stringify({ comment }) });
  }

  private async listRequestPolicies(args: Record<string, unknown>): Promise<ToolResult> {
    const userId = args.user_id as string;
    if (!userId) {
      return { content: [{ type: 'text', text: 'user_id is required' }], isError: true };
    }
    const url = `${this.baseUrl}/expensereports/v4/users/${encodeURIComponent(userId)}/context/TRAVELER/expensepolicies`;
    return this.fetchJson(url, { method: 'GET', headers: this.headers });
  }

  private async getUserProfile(args: Record<string, unknown>): Promise<ToolResult> {
    const loginId = args.login_id as string;
    if (!loginId) {
      return { content: [{ type: 'text', text: 'login_id is required' }], isError: true };
    }
    const url = `${this.baseUrl}/profile/v1/me?loginId=${encodeURIComponent(loginId)}`;
    return this.fetchJson(url, { method: 'GET', headers: this.headers });
  }
}

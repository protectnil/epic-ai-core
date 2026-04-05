/**
 * Expensify MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// Expensify has an .mcp.json in their App repo (github.com/Expensify/App) for internal
// developer tooling only — it is not a public MCP server for the Expensify Integration API.
// Our adapter covers: 11 tools (full Integration Server API surface).
// Recommendation: Use this adapter for all Expensify automations.
//
// Base URL: https://integrations.expensify.com/Integration-Server/ExpensifyIntegrations
// Auth: partnerUserID + partnerUserSecret embedded in every requestJobDescription payload.
//   Credentials obtained at: https://www.expensify.com/tools/integrations/
// Docs: https://integrations.expensify.com/Integration-Server/doc/
// Rate limits: 5 requests per 10 seconds, 20 requests per 60 seconds per partner account
// Note: All operations use a single POST endpoint — the job type is specified in requestJobDescription.type

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface ExpensifyConfig {
  partnerUserID: string;
  partnerUserSecret: string;
  /** Override integration endpoint (default: https://integrations.expensify.com/Integration-Server/ExpensifyIntegrations) */
  baseUrl?: string;
}

export class ExpensifyMCPServer extends MCPAdapterBase {
  private readonly partnerUserID: string;
  private readonly partnerUserSecret: string;
  private readonly baseUrl: string;

  constructor(config: ExpensifyConfig) {
    super();
    this.partnerUserID = config.partnerUserID;
    this.partnerUserSecret = config.partnerUserSecret;
    this.baseUrl = config.baseUrl ?? 'https://integrations.expensify.com/Integration-Server/ExpensifyIntegrations';
  }

  static catalog() {
    return {
      name: 'expensify',
      displayName: 'Expensify',
      version: '1.0.0',
      category: 'finance' as const,
      keywords: [
        'expensify', 'expense', 'expense report', 'receipt', 'reimbursement', 'policy',
        'workspace', 'employee', 'approval', 'category', 'tag', 'reconciliation',
        'finance', 'spend management', 'corporate card',
      ],
      toolNames: [
        'create_expense', 'get_expense_reports', 'get_policy_list', 'update_report',
        'export_report', 'download_report', 'get_categories', 'get_tags', 'invite_employee',
        'update_employee', 'get_reconciliation',
      ],
      description: 'Expensify expense management: create expenses, retrieve and approve reports, manage policy employees and categories, export data, and reconcile corporate card transactions.',
      author: 'protectnil' as const,
    };
  }

  private credentials() {
    return {
      partnerUserID: this.partnerUserID,
      partnerUserSecret: this.partnerUserSecret,
    };
  }

  private async postJob(requestJobDescription: Record<string, unknown>): Promise<ToolResult> {
    const body = new URLSearchParams({
      requestJobDescription: JSON.stringify(requestJobDescription),
    });

    const response = await this.fetchWithRetry(this.baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `Expensify API error: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }

    const text = await response.text();
    // Expensify returns mixed JSON / plain-text depending on job type
    let parsed: unknown;
    try { parsed = JSON.parse(text); } catch { parsed = text; }
    const out = typeof parsed === 'string' ? parsed : JSON.stringify(parsed, null, 2);
    return { content: [{ type: 'text', text: this.truncate(out) }], isError: false };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'create_expense',
        description: 'Create a new expense transaction for an employee under a specific Expensify policy',
        inputSchema: {
          type: 'object',
          properties: {
            employee_email: {
              type: 'string',
              description: 'Email address of the employee submitting the expense',
            },
            merchant: {
              type: 'string',
              description: 'Merchant or vendor name',
            },
            amount: {
              type: 'number',
              description: 'Expense amount in cents (e.g. 1000 = $10.00)',
            },
            currency: {
              type: 'string',
              description: 'ISO 4217 currency code (e.g. USD, EUR, GBP)',
            },
            created: {
              type: 'string',
              description: 'Date of the expense in YYYY-MM-DD format',
            },
            comment: {
              type: 'string',
              description: 'Optional description or business purpose for the expense',
            },
            category: {
              type: 'string',
              description: 'Expense category as defined in the policy',
            },
            tag: {
              type: 'string',
              description: 'Expense tag value as defined in the policy',
            },
            policy_id: {
              type: 'string',
              description: 'Expensify policy ID to associate the expense with',
            },
            reimbursable: {
              type: 'boolean',
              description: 'Whether the expense is reimbursable (default: true)',
            },
          },
          required: ['employee_email', 'merchant', 'amount', 'currency', 'created'],
        },
      },
      {
        name: 'get_expense_reports',
        description: 'Retrieve expense reports for a policy with optional filters for state, date range, and employee',
        inputSchema: {
          type: 'object',
          properties: {
            policy_id: {
              type: 'string',
              description: 'The policy ID to retrieve reports from',
            },
            report_state: {
              type: 'string',
              description: 'Filter by report status: OPEN, SUBMITTED, APPROVED, REIMBURSED, CLOSED',
            },
            start_date: {
              type: 'string',
              description: 'Filter reports created on or after this date (YYYY-MM-DD)',
            },
            end_date: {
              type: 'string',
              description: 'Filter reports created on or before this date (YYYY-MM-DD)',
            },
            employee_email: {
              type: 'string',
              description: 'Filter reports for a specific employee email',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of reports to return',
            },
          },
          required: ['policy_id'],
        },
      },
      {
        name: 'get_policy_list',
        description: 'Retrieve all Expensify policies (workspaces) accessible with the current partner credentials',
        inputSchema: {
          type: 'object',
          properties: {
            admin_only: {
              type: 'boolean',
              description: 'If true, return only policies where the credentials hold admin access',
            },
          },
        },
      },
      {
        name: 'update_report',
        description: 'Submit, approve, reject, or reimburse an Expensify expense report with optional comment',
        inputSchema: {
          type: 'object',
          properties: {
            report_id: {
              type: 'string',
              description: 'The report ID to update',
            },
            action: {
              type: 'string',
              description: 'Action to perform: submit, approve, reject, reimburse',
            },
            comment: {
              type: 'string',
              description: 'Optional comment to add with the action',
            },
          },
          required: ['report_id', 'action'],
        },
      },
      {
        name: 'export_report',
        description: 'Export expense report data using a named template defined in the policy, returns a file reference',
        inputSchema: {
          type: 'object',
          properties: {
            policy_id: {
              type: 'string',
              description: 'The policy ID the export template belongs to',
            },
            template_name: {
              type: 'string',
              description: 'Name of the export template configured in Expensify',
            },
            report_state: {
              type: 'string',
              description: 'Filter by report status: OPEN, SUBMITTED, APPROVED, REIMBURSED, CLOSED',
            },
            start_date: {
              type: 'string',
              description: 'Export reports created on or after this date (YYYY-MM-DD)',
            },
            end_date: {
              type: 'string',
              description: 'Export reports created on or before this date (YYYY-MM-DD)',
            },
          },
          required: ['policy_id', 'template_name'],
        },
      },
      {
        name: 'download_report',
        description: 'Download a previously exported Expensify report file by its filename token',
        inputSchema: {
          type: 'object',
          properties: {
            filename: {
              type: 'string',
              description: 'The filename returned by export_report (e.g. "exportMyReports_12345.csv")',
            },
          },
          required: ['filename'],
        },
      },
      {
        name: 'get_categories',
        description: 'Retrieve all expense categories configured for an Expensify policy',
        inputSchema: {
          type: 'object',
          properties: {
            policy_id: {
              type: 'string',
              description: 'The policy ID to retrieve categories from',
            },
          },
          required: ['policy_id'],
        },
      },
      {
        name: 'get_tags',
        description: 'Retrieve all expense tags configured for an Expensify policy',
        inputSchema: {
          type: 'object',
          properties: {
            policy_id: {
              type: 'string',
              description: 'The policy ID to retrieve tags from',
            },
          },
          required: ['policy_id'],
        },
      },
      {
        name: 'invite_employee',
        description: 'Invite a new employee to an Expensify policy, optionally setting name and manager',
        inputSchema: {
          type: 'object',
          properties: {
            policy_id: {
              type: 'string',
              description: 'The policy ID to add the employee to',
            },
            employee_email: {
              type: 'string',
              description: 'Email address of the employee to invite',
            },
            first_name: {
              type: 'string',
              description: "Employee's first name",
            },
            last_name: {
              type: 'string',
              description: "Employee's last name",
            },
            manager_email: {
              type: 'string',
              description: "Email of the employee's approving manager",
            },
            role: {
              type: 'string',
              description: 'Policy role: employee, admin (default: employee)',
            },
          },
          required: ['policy_id', 'employee_email'],
        },
      },
      {
        name: 'update_employee',
        description: 'Update an existing employee record in an Expensify policy, e.g. change manager or role',
        inputSchema: {
          type: 'object',
          properties: {
            policy_id: {
              type: 'string',
              description: 'The policy ID the employee belongs to',
            },
            employee_email: {
              type: 'string',
              description: 'Email address of the employee to update',
            },
            manager_email: {
              type: 'string',
              description: 'Updated approving manager email',
            },
            first_name: {
              type: 'string',
              description: "Updated first name",
            },
            last_name: {
              type: 'string',
              description: "Updated last name",
            },
            role: {
              type: 'string',
              description: 'Updated policy role: employee, admin',
            },
          },
          required: ['policy_id', 'employee_email'],
        },
      },
      {
        name: 'get_reconciliation',
        description: 'Export corporate card transaction reconciliation data for a domain and card feed within a date range',
        inputSchema: {
          type: 'object',
          properties: {
            start_date: {
              type: 'string',
              description: 'Start date for reconciliation range (YYYY-MM-DD)',
            },
            end_date: {
              type: 'string',
              description: 'End date for reconciliation range (YYYY-MM-DD)',
            },
            domain: {
              type: 'string',
              description: 'The Expensify domain to reconcile (e.g. yourcompany.com)',
            },
            feed: {
              type: 'string',
              description: 'The card feed identifier to reconcile',
            },
          },
          required: ['start_date', 'end_date', 'domain'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'create_expense':
          return this.createExpense(args);
        case 'get_expense_reports':
          return this.getExpenseReports(args);
        case 'get_policy_list':
          return this.getPolicyList(args);
        case 'update_report':
          return this.updateReport(args);
        case 'export_report':
          return this.exportReport(args);
        case 'download_report':
          return this.downloadReport(args);
        case 'get_categories':
          return this.getCategories(args);
        case 'get_tags':
          return this.getTags(args);
        case 'invite_employee':
          return this.inviteEmployee(args);
        case 'update_employee':
          return this.updateEmployee(args);
        case 'get_reconciliation':
          return this.getReconciliation(args);
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

  private async createExpense(args: Record<string, unknown>): Promise<ToolResult> {
    const employeeEmail = args.employee_email as string;
    const merchant = args.merchant as string;
    const amount = args.amount as number;
    const currency = args.currency as string;
    const created = args.created as string;

    if (!employeeEmail || !merchant || amount === undefined || !currency || !created) {
      return { content: [{ type: 'text', text: 'employee_email, merchant, amount, currency, and created are required' }], isError: true };
    }

    const expense: Record<string, unknown> = { merchant, amount, currency, created };
    if (args.comment) expense.comment = args.comment;
    if (args.category) expense.category = args.category;
    if (args.tag) expense.tag = args.tag;
    if (typeof args.reimbursable === 'boolean') expense.reimbursable = args.reimbursable;

    const inputSettings: Record<string, unknown> = {
      type: 'expenses',
      employeeEmail,
      expenses: [expense],
    };
    if (args.policy_id) inputSettings.policyID = args.policy_id;

    return this.postJob({
      type: 'create',
      credentials: this.credentials(),
      inputSettings,
    });
  }

  private async getExpenseReports(args: Record<string, unknown>): Promise<ToolResult> {
    const policyId = args.policy_id as string;
    if (!policyId) {
      return { content: [{ type: 'text', text: 'policy_id is required' }], isError: true };
    }

    const filters: Record<string, unknown> = { policyID: policyId };
    if (args.report_state) filters.reportState = args.report_state;
    if (args.start_date) filters.startDate = args.start_date;
    if (args.end_date) filters.endDate = args.end_date;
    if (args.employee_email) filters.employeeEmail = args.employee_email;
    if (args.limit) filters.limit = args.limit;

    return this.postJob({
      type: 'get',
      credentials: this.credentials(),
      inputSettings: { type: 'reportInfos', filters },
      outputSettings: { fileExtension: 'json' },
    });
  }

  private async getPolicyList(args: Record<string, unknown>): Promise<ToolResult> {
    const inputSettings: Record<string, unknown> = { type: 'policyList' };
    if (args.admin_only) inputSettings.adminOnly = args.admin_only;

    return this.postJob({
      type: 'get',
      credentials: this.credentials(),
      inputSettings,
    });
  }

  private async updateReport(args: Record<string, unknown>): Promise<ToolResult> {
    const reportId = args.report_id as string;
    const action = args.action as string;

    if (!reportId || !action) {
      return { content: [{ type: 'text', text: 'report_id and action are required' }], isError: true };
    }

    const inputSettings: Record<string, unknown> = { type: 'report', reportID: reportId, action };
    if (args.comment) inputSettings.comment = args.comment;

    return this.postJob({
      type: 'update',
      credentials: this.credentials(),
      inputSettings,
    });
  }

  private async exportReport(args: Record<string, unknown>): Promise<ToolResult> {
    const policyId = args.policy_id as string;
    const templateName = args.template_name as string;

    if (!policyId || !templateName) {
      return { content: [{ type: 'text', text: 'policy_id and template_name are required' }], isError: true };
    }

    const filters: Record<string, unknown> = { policyID: policyId };
    if (args.report_state) filters.reportState = args.report_state;
    if (args.start_date) filters.startDate = args.start_date;
    if (args.end_date) filters.endDate = args.end_date;

    return this.postJob({
      type: 'file',
      credentials: this.credentials(),
      inputSettings: { type: 'combinedReportData', filters },
      onReceive: { immediateResponse: ['returnRandomFileName'] },
      outputSettings: { fileExtension: 'csv', fileBasename: templateName },
    });
  }

  private async downloadReport(args: Record<string, unknown>): Promise<ToolResult> {
    const filename = args.filename as string;
    if (!filename) {
      return { content: [{ type: 'text', text: 'filename is required' }], isError: true };
    }

    return this.postJob({
      type: 'download',
      credentials: this.credentials(),
      inputSettings: { type: 'combinedReportData', filename },
    });
  }

  private async getCategories(args: Record<string, unknown>): Promise<ToolResult> {
    const policyId = args.policy_id as string;
    if (!policyId) {
      return { content: [{ type: 'text', text: 'policy_id is required' }], isError: true };
    }

    return this.postJob({
      type: 'get',
      credentials: this.credentials(),
      inputSettings: { type: 'policy', fields: ['categories'], policyID: policyId },
    });
  }

  private async getTags(args: Record<string, unknown>): Promise<ToolResult> {
    const policyId = args.policy_id as string;
    if (!policyId) {
      return { content: [{ type: 'text', text: 'policy_id is required' }], isError: true };
    }

    return this.postJob({
      type: 'get',
      credentials: this.credentials(),
      inputSettings: { type: 'policy', fields: ['tags'], policyID: policyId },
    });
  }

  private async inviteEmployee(args: Record<string, unknown>): Promise<ToolResult> {
    const policyId = args.policy_id as string;
    const employeeEmail = args.employee_email as string;

    if (!policyId || !employeeEmail) {
      return { content: [{ type: 'text', text: 'policy_id and employee_email are required' }], isError: true };
    }

    const employee: Record<string, unknown> = { email: employeeEmail };
    if (args.first_name) employee.firstName = args.first_name;
    if (args.last_name) employee.lastName = args.last_name;
    if (args.manager_email) employee.managerEmail = args.manager_email;
    if (args.role) employee.role = args.role;

    return this.postJob({
      type: 'update',
      credentials: this.credentials(),
      inputSettings: { type: 'employees', policyID: policyId, employees: [employee] },
    });
  }

  private async updateEmployee(args: Record<string, unknown>): Promise<ToolResult> {
    const policyId = args.policy_id as string;
    const employeeEmail = args.employee_email as string;

    if (!policyId || !employeeEmail) {
      return { content: [{ type: 'text', text: 'policy_id and employee_email are required' }], isError: true };
    }

    const employee: Record<string, unknown> = { email: employeeEmail };
    if (args.manager_email) employee.managerEmail = args.manager_email;
    if (args.first_name) employee.firstName = args.first_name;
    if (args.last_name) employee.lastName = args.last_name;
    if (args.role) employee.role = args.role;

    return this.postJob({
      type: 'update',
      credentials: this.credentials(),
      inputSettings: { type: 'employees', policyID: policyId, employees: [employee] },
    });
  }

  private async getReconciliation(args: Record<string, unknown>): Promise<ToolResult> {
    const startDate = args.start_date as string;
    const endDate = args.end_date as string;
    const domain = args.domain as string;

    if (!startDate || !endDate || !domain) {
      return { content: [{ type: 'text', text: 'start_date, end_date, and domain are required' }], isError: true };
    }

    const inputSettings: Record<string, unknown> = { type: 'reconciliation', startDate, endDate, domain };
    if (args.feed) inputSettings.feed = args.feed;

    return this.postJob({
      type: 'reconciliation',
      credentials: this.credentials(),
      inputSettings,
    });
  }
}

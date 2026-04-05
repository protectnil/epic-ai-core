/**
 * Avaza MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03. No official Avaza MCP server was found on GitHub.
//
// Base URL: https://api.avaza.com
// Auth: OAuth2 Bearer token — Authorization: Bearer <access_token>
//   Also supports Personal Access Token (same header format)
// Docs: https://api.avaza.com/swagger/ui/index
// Spec: https://api.apis.guru/v2/specs/avaza.com/v1/swagger.json (Swagger 2.0)
// Rate limits: Not publicly documented.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface AvazaConfig {
  accessToken: string;
  baseUrl?: string;
}

export class AvazaMCPServer extends MCPAdapterBase {
  private readonly accessToken: string;
  private readonly baseUrl: string;

  constructor(config: AvazaConfig) {
    super();
    this.accessToken = config.accessToken;
    this.baseUrl = (config.baseUrl || 'https://api.avaza.com').replace(/\/$/, '');
  }

  static catalog() {
    return {
      name: 'avaza',
      displayName: 'Avaza',
      version: '1.0.0',
      category: 'productivity' as const,
      keywords: [
        'avaza', 'project management', 'timesheet', 'invoice', 'expense',
        'task', 'project', 'billing', 'time tracking', 'crm', 'estimate',
        'payment', 'company', 'contact', 'schedule', 'resource planning',
        'freelance', 'agency', 'professional services',
      ],
      toolNames: [
        'get_account',
        'list_companies', 'get_company', 'create_company', 'update_company',
        'list_contacts', 'get_contact', 'create_contact',
        'list_projects', 'get_project', 'create_project', 'update_project',
        'list_tasks', 'get_task', 'create_task', 'update_task', 'delete_task',
        'list_sections', 'create_section', 'delete_section',
        'list_timesheets', 'get_timesheet', 'create_timesheet', 'update_timesheet', 'delete_timesheet',
        'get_timesheet_summary',
        'list_expenses', 'get_expense', 'create_expense', 'update_expense', 'delete_expense',
        'get_expense_summary',
        'list_invoices', 'get_invoice', 'create_invoice',
        'list_estimates', 'get_estimate', 'create_estimate',
        'list_payments', 'get_payment', 'create_payment',
        'list_bills', 'get_bill', 'create_bill',
        'list_bill_payments', 'get_bill_payment', 'create_bill_payment',
        'list_credit_notes', 'get_credit_note',
        'list_users',
        'list_currencies',
        'list_taxes',
        'list_project_members', 'add_project_member',
        'start_timer', 'stop_timer', 'get_running_timer',
      ],
      description: 'Avaza project management and billing: manage projects, tasks, timesheets, expenses, invoices, estimates, payments, bills, contacts, and resource scheduling via the Avaza REST API.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      // ── Account ──────────────────────────────────────────────────────────
      {
        name: 'get_account',
        description: 'Get the current Avaza account details including subscription info and settings',
        inputSchema: { type: 'object', properties: {} },
      },
      // ── Companies ─────────────────────────────────────────────────────────
      {
        name: 'list_companies',
        description: 'List companies (clients/customers) in Avaza with optional name filter and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            page_size: { type: 'number', description: 'Results per page (default: 20)' },
            page_number: { type: 'number', description: 'Page number (default: 1)' },
          },
        },
      },
      {
        name: 'get_company',
        description: 'Retrieve a single company by its Avaza company ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'The Avaza company ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'create_company',
        description: 'Create a new company (client) in Avaza with a name and optional contact details',
        inputSchema: {
          type: 'object',
          properties: {
            CompanyName: { type: 'string', description: 'Company name (required)' },
            Phone: { type: 'string', description: 'Phone number' },
            Website: { type: 'string', description: 'Company website URL' },
            BillingAddress: { type: 'string', description: 'Billing address' },
            Comments: { type: 'string', description: 'Internal notes' },
          },
          required: ['CompanyName'],
        },
      },
      {
        name: 'update_company',
        description: 'Update an existing Avaza company record by ID',
        inputSchema: {
          type: 'object',
          properties: {
            CompanyID: { type: 'number', description: 'The company ID to update (required)' },
            CompanyName: { type: 'string', description: 'Updated company name' },
            Phone: { type: 'string', description: 'Updated phone number' },
            Website: { type: 'string', description: 'Updated website URL' },
            BillingAddress: { type: 'string', description: 'Updated billing address' },
            Comments: { type: 'string', description: 'Updated internal notes' },
          },
          required: ['CompanyID'],
        },
      },
      // ── Contacts ──────────────────────────────────────────────────────────
      {
        name: 'list_contacts',
        description: 'List contacts in Avaza with optional pagination',
        inputSchema: {
          type: 'object',
          properties: {
            page_size: { type: 'number', description: 'Results per page (default: 20)' },
            page_number: { type: 'number', description: 'Page number (default: 1)' },
          },
        },
      },
      {
        name: 'get_contact',
        description: 'Retrieve a single contact by their Avaza contact ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'The Avaza contact ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'create_contact',
        description: 'Create a new contact in Avaza, optionally linked to a company',
        inputSchema: {
          type: 'object',
          properties: {
            Firstname: { type: 'string', description: 'First name (required)' },
            Lastname: { type: 'string', description: 'Last name' },
            Email: { type: 'string', description: 'Email address' },
            Phone: { type: 'string', description: 'Phone number' },
            CompanyID: { type: 'number', description: 'Associate with an existing company ID' },
          },
          required: ['Firstname'],
        },
      },
      // ── Projects ──────────────────────────────────────────────────────────
      {
        name: 'list_projects',
        description: 'List projects in Avaza with optional status and pagination filters',
        inputSchema: {
          type: 'object',
          properties: {
            project_status: { type: 'string', description: 'Filter by status: Active, Completed, Prospective, OnHold, Cancelled' },
            page_size: { type: 'number', description: 'Results per page (default: 20)' },
            page_number: { type: 'number', description: 'Page number (default: 1)' },
          },
        },
      },
      {
        name: 'get_project',
        description: 'Retrieve a single project by its Avaza project ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'The Avaza project ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'create_project',
        description: 'Create a new project in Avaza with a title and optional budget/billing type',
        inputSchema: {
          type: 'object',
          properties: {
            Title: { type: 'string', description: 'Project title (required)' },
            CompanyID: { type: 'number', description: 'Client company ID to associate the project with' },
            ProjectStatus: { type: 'string', description: 'Status: Active (default), Completed, Prospective, OnHold, Cancelled' },
            BudgetType: { type: 'string', description: 'Budget type: NoLimit, HoursPerProject, HoursPerTask, FixedFee' },
            Budget: { type: 'number', description: 'Budget amount (used with BudgetType)' },
          },
          required: ['Title'],
        },
      },
      {
        name: 'update_project',
        description: 'Update an existing Avaza project — change status, title, or budget',
        inputSchema: {
          type: 'object',
          properties: {
            ProjectID: { type: 'number', description: 'The project ID to update (required)' },
            Title: { type: 'string', description: 'Updated project title' },
            ProjectStatus: { type: 'string', description: 'Updated status: Active, Completed, Prospective, OnHold, Cancelled' },
            Budget: { type: 'number', description: 'Updated budget amount' },
          },
          required: ['ProjectID'],
        },
      },
      // ── Tasks ─────────────────────────────────────────────────────────────
      {
        name: 'list_tasks',
        description: 'List tasks in Avaza with optional project or status filter',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: { type: 'number', description: 'Filter tasks by project ID' },
            status: { type: 'string', description: 'Filter by status: Active, Completed' },
            page_size: { type: 'number', description: 'Results per page (default: 20)' },
            page_number: { type: 'number', description: 'Page number (default: 1)' },
          },
        },
      },
      {
        name: 'get_task',
        description: 'Retrieve a single task by its Avaza task ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'The Avaza task ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'create_task',
        description: 'Create a new task in an Avaza project with optional assignee and due date',
        inputSchema: {
          type: 'object',
          properties: {
            Title: { type: 'string', description: 'Task title (required)' },
            ProjectID: { type: 'number', description: 'Project ID to assign the task to (required)' },
            AssignedToUserID: { type: 'string', description: 'User ID of the assignee (optional)' },
            DueDate: { type: 'string', description: 'Due date in ISO 8601 format, e.g. "2026-04-15T00:00:00Z" (optional)' },
            EstimatedHours: { type: 'number', description: 'Estimated hours for the task' },
            Notes: { type: 'string', description: 'Task description/notes' },
          },
          required: ['Title', 'ProjectID'],
        },
      },
      {
        name: 'update_task',
        description: 'Update an existing Avaza task — change title, status, assignee, or due date',
        inputSchema: {
          type: 'object',
          properties: {
            TaskID: { type: 'number', description: 'The task ID to update (required)' },
            Title: { type: 'string', description: 'Updated task title' },
            TaskStatusID: { type: 'number', description: 'Updated status ID' },
            AssignedToUserID: { type: 'string', description: 'Updated assignee user ID' },
            DueDate: { type: 'string', description: 'Updated due date in ISO 8601 format' },
            EstimatedHours: { type: 'number', description: 'Updated estimated hours' },
          },
          required: ['TaskID'],
        },
      },
      {
        name: 'delete_task',
        description: 'Delete a task from Avaza by its task ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'The task ID to delete' },
          },
          required: ['id'],
        },
      },
      // ── Sections ──────────────────────────────────────────────────────────
      {
        name: 'list_sections',
        description: 'List sections (task groups) in Avaza projects',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: { type: 'number', description: 'Filter sections by project ID' },
          },
        },
      },
      {
        name: 'create_section',
        description: 'Create a new section in an Avaza project for grouping tasks',
        inputSchema: {
          type: 'object',
          properties: {
            Title: { type: 'string', description: 'Section title (required)' },
            ProjectID: { type: 'number', description: 'Project ID (required)' },
          },
          required: ['Title', 'ProjectID'],
        },
      },
      {
        name: 'delete_section',
        description: 'Delete a section from an Avaza project',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'The section ID to delete' },
          },
          required: ['id'],
        },
      },
      // ── Timesheets ────────────────────────────────────────────────────────
      {
        name: 'list_timesheets',
        description: 'List timesheet entries in Avaza with optional project, user, or date range filters',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: { type: 'number', description: 'Filter by project ID' },
            user_id: { type: 'string', description: 'Filter by user ID' },
            date_from: { type: 'string', description: 'Start date filter in ISO 8601 format' },
            date_to: { type: 'string', description: 'End date filter in ISO 8601 format' },
            page_size: { type: 'number', description: 'Results per page (default: 20)' },
            page_number: { type: 'number', description: 'Page number (default: 1)' },
          },
        },
      },
      {
        name: 'get_timesheet',
        description: 'Retrieve a single timesheet entry by its Avaza timesheet ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'The timesheet entry ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'create_timesheet',
        description: 'Log a new timesheet entry in Avaza for a project or task',
        inputSchema: {
          type: 'object',
          properties: {
            ProjectID: { type: 'number', description: 'Project ID (required)' },
            Duration: { type: 'number', description: 'Duration in minutes (required)' },
            DateWorked: { type: 'string', description: 'Date worked in ISO 8601 format (required)' },
            TaskID: { type: 'number', description: 'Task ID (optional)' },
            Notes: { type: 'string', description: 'Time entry notes/description' },
            isBillable: { type: 'boolean', description: 'Whether the time is billable (default: true)' },
          },
          required: ['ProjectID', 'Duration', 'DateWorked'],
        },
      },
      {
        name: 'update_timesheet',
        description: 'Update an existing timesheet entry in Avaza',
        inputSchema: {
          type: 'object',
          properties: {
            TimesheetEntryID: { type: 'number', description: 'Timesheet entry ID to update (required)' },
            Duration: { type: 'number', description: 'Updated duration in minutes' },
            DateWorked: { type: 'string', description: 'Updated date worked' },
            Notes: { type: 'string', description: 'Updated notes' },
            isBillable: { type: 'boolean', description: 'Updated billable flag' },
          },
          required: ['TimesheetEntryID'],
        },
      },
      {
        name: 'delete_timesheet',
        description: 'Delete a timesheet entry from Avaza by its ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'The timesheet entry ID to delete' },
          },
          required: ['id'],
        },
      },
      {
        name: 'get_timesheet_summary',
        description: 'Get aggregated timesheet statistics: total hours, billable vs non-billable breakdown',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: { type: 'number', description: 'Filter summary by project ID' },
            user_id: { type: 'string', description: 'Filter summary by user ID' },
            date_from: { type: 'string', description: 'Start date in ISO 8601 format' },
            date_to: { type: 'string', description: 'End date in ISO 8601 format' },
          },
        },
      },
      // ── Expenses ──────────────────────────────────────────────────────────
      {
        name: 'list_expenses',
        description: 'List expense entries in Avaza with optional project, user, or date range filters',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: { type: 'number', description: 'Filter by project ID' },
            user_id: { type: 'string', description: 'Filter by user ID' },
            date_from: { type: 'string', description: 'Start date in ISO 8601 format' },
            date_to: { type: 'string', description: 'End date in ISO 8601 format' },
            page_size: { type: 'number', description: 'Results per page (default: 20)' },
            page_number: { type: 'number', description: 'Page number (default: 1)' },
          },
        },
      },
      {
        name: 'get_expense',
        description: 'Retrieve a single expense entry by its Avaza expense ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'The expense entry ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'create_expense',
        description: 'Create a new expense entry in Avaza with amount, category, and date',
        inputSchema: {
          type: 'object',
          properties: {
            Amount: { type: 'number', description: 'Expense amount (required)' },
            ExpenseCategoryID: { type: 'number', description: 'Expense category ID (required)' },
            DateOfExpense: { type: 'string', description: 'Date of expense in ISO 8601 format (required)' },
            ProjectID: { type: 'number', description: 'Project ID to assign this expense to (optional)' },
            Notes: { type: 'string', description: 'Expense description/notes' },
            isBillable: { type: 'boolean', description: 'Whether the expense is billable (default: true)' },
            CurrencyCode: { type: 'string', description: 'Currency code, e.g. "USD" (defaults to account currency)' },
          },
          required: ['Amount', 'ExpenseCategoryID', 'DateOfExpense'],
        },
      },
      {
        name: 'update_expense',
        description: 'Update an existing expense entry in Avaza',
        inputSchema: {
          type: 'object',
          properties: {
            ExpenseID: { type: 'number', description: 'Expense ID to update (required)' },
            Amount: { type: 'number', description: 'Updated amount' },
            Notes: { type: 'string', description: 'Updated notes' },
            isBillable: { type: 'boolean', description: 'Updated billable flag' },
            DateOfExpense: { type: 'string', description: 'Updated date in ISO 8601 format' },
          },
          required: ['ExpenseID'],
        },
      },
      {
        name: 'delete_expense',
        description: 'Delete an expense entry from Avaza by its ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'The expense ID to delete' },
          },
          required: ['id'],
        },
      },
      {
        name: 'get_expense_summary',
        description: 'Get aggregated expense statistics including totals by category and billable status',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: { type: 'number', description: 'Filter summary by project ID' },
            user_id: { type: 'string', description: 'Filter summary by user ID' },
            date_from: { type: 'string', description: 'Start date in ISO 8601 format' },
            date_to: { type: 'string', description: 'End date in ISO 8601 format' },
          },
        },
      },
      // ── Invoices ──────────────────────────────────────────────────────────
      {
        name: 'list_invoices',
        description: 'List invoices in Avaza with optional status and date filters',
        inputSchema: {
          type: 'object',
          properties: {
            invoice_status: { type: 'string', description: 'Filter by status: Draft, Sent, Paid, Overdue, Void' },
            date_from: { type: 'string', description: 'Start date in ISO 8601 format' },
            date_to: { type: 'string', description: 'End date in ISO 8601 format' },
            page_size: { type: 'number', description: 'Results per page (default: 20)' },
            page_number: { type: 'number', description: 'Page number (default: 1)' },
          },
        },
      },
      {
        name: 'get_invoice',
        description: 'Retrieve a single invoice by its Avaza invoice ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'The invoice ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'create_invoice',
        description: 'Create a new draft invoice in Avaza for a company',
        inputSchema: {
          type: 'object',
          properties: {
            CompanyID: { type: 'number', description: 'Company (client) ID to bill (required)' },
            InvoiceDate: { type: 'string', description: 'Invoice date in ISO 8601 format (required)' },
            DueDate: { type: 'string', description: 'Payment due date in ISO 8601 format' },
            Notes: { type: 'string', description: 'Invoice notes or payment terms' },
            LineItems: {
              type: 'array',
              description: 'Line items on the invoice',
              items: {
                type: 'object',
                properties: {
                  Description: { type: 'string', description: 'Line item description' },
                  Quantity: { type: 'number', description: 'Quantity' },
                  UnitPrice: { type: 'number', description: 'Unit price' },
                },
              },
            },
          },
          required: ['CompanyID', 'InvoiceDate'],
        },
      },
      // ── Estimates ─────────────────────────────────────────────────────────
      {
        name: 'list_estimates',
        description: 'List estimates (quotes) in Avaza with optional status filter',
        inputSchema: {
          type: 'object',
          properties: {
            estimate_status: { type: 'string', description: 'Filter by status: Draft, Sent, Accepted, Declined' },
            page_size: { type: 'number', description: 'Results per page (default: 20)' },
            page_number: { type: 'number', description: 'Page number (default: 1)' },
          },
        },
      },
      {
        name: 'get_estimate',
        description: 'Retrieve a single estimate by its Avaza estimate ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'The estimate ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'create_estimate',
        description: 'Create a new draft estimate (quote) in Avaza for a company',
        inputSchema: {
          type: 'object',
          properties: {
            CompanyID: { type: 'number', description: 'Company (client) ID (required)' },
            EstimateDate: { type: 'string', description: 'Estimate date in ISO 8601 format (required)' },
            ExpiryDate: { type: 'string', description: 'Expiry date in ISO 8601 format' },
            Notes: { type: 'string', description: 'Estimate notes' },
            LineItems: {
              type: 'array',
              description: 'Line items on the estimate',
              items: {
                type: 'object',
                properties: {
                  Description: { type: 'string', description: 'Line item description' },
                  Quantity: { type: 'number', description: 'Quantity' },
                  UnitPrice: { type: 'number', description: 'Unit price' },
                },
              },
            },
          },
          required: ['CompanyID', 'EstimateDate'],
        },
      },
      // ── Payments ──────────────────────────────────────────────────────────
      {
        name: 'list_payments',
        description: 'List invoice payments received in Avaza',
        inputSchema: {
          type: 'object',
          properties: {
            date_from: { type: 'string', description: 'Start date in ISO 8601 format' },
            date_to: { type: 'string', description: 'End date in ISO 8601 format' },
            page_size: { type: 'number', description: 'Results per page (default: 20)' },
            page_number: { type: 'number', description: 'Page number (default: 1)' },
          },
        },
      },
      {
        name: 'get_payment',
        description: 'Retrieve a single invoice payment by its Avaza payment transaction ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'The payment transaction ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'create_payment',
        description: 'Create a new payment and optionally allocate it to one or more invoices',
        inputSchema: {
          type: 'object',
          properties: {
            CompanyID: { type: 'number', description: 'Company ID receiving the payment (required)' },
            Amount: { type: 'number', description: 'Total payment amount (required)' },
            PaymentDate: { type: 'string', description: 'Payment date in ISO 8601 format (required)' },
            Notes: { type: 'string', description: 'Payment notes or reference' },
            Allocations: {
              type: 'array',
              description: 'Invoice allocations for this payment',
              items: {
                type: 'object',
                properties: {
                  InvoiceID: { type: 'number', description: 'Invoice ID to allocate payment to' },
                  Amount: { type: 'number', description: 'Amount to allocate to this invoice' },
                },
              },
            },
          },
          required: ['CompanyID', 'Amount', 'PaymentDate'],
        },
      },
      // ── Bills ─────────────────────────────────────────────────────────────
      {
        name: 'list_bills',
        description: 'List bills (vendor/supplier invoices) in Avaza',
        inputSchema: {
          type: 'object',
          properties: {
            page_size: { type: 'number', description: 'Results per page (default: 20)' },
            page_number: { type: 'number', description: 'Page number (default: 1)' },
          },
        },
      },
      {
        name: 'get_bill',
        description: 'Retrieve a single bill by its Avaza bill ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'The bill ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'create_bill',
        description: 'Create a new draft bill (vendor invoice) in Avaza',
        inputSchema: {
          type: 'object',
          properties: {
            CompanyID: { type: 'number', description: 'Vendor/supplier company ID (required)' },
            BillDate: { type: 'string', description: 'Bill date in ISO 8601 format (required)' },
            DueDate: { type: 'string', description: 'Payment due date in ISO 8601 format' },
            Notes: { type: 'string', description: 'Bill notes' },
          },
          required: ['CompanyID', 'BillDate'],
        },
      },
      // ── Bill Payments ─────────────────────────────────────────────────────
      {
        name: 'list_bill_payments',
        description: 'List bill (vendor) payments made in Avaza',
        inputSchema: {
          type: 'object',
          properties: {
            page_size: { type: 'number', description: 'Results per page (default: 20)' },
            page_number: { type: 'number', description: 'Page number (default: 1)' },
          },
        },
      },
      {
        name: 'get_bill_payment',
        description: 'Retrieve a single bill payment by its Avaza payment transaction ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'The bill payment transaction ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'create_bill_payment',
        description: 'Create a new bill payment and optionally allocate it to bills',
        inputSchema: {
          type: 'object',
          properties: {
            CompanyID: { type: 'number', description: 'Vendor company ID (required)' },
            Amount: { type: 'number', description: 'Total payment amount (required)' },
            PaymentDate: { type: 'string', description: 'Payment date in ISO 8601 format (required)' },
            Notes: { type: 'string', description: 'Payment notes' },
          },
          required: ['CompanyID', 'Amount', 'PaymentDate'],
        },
      },
      // ── Credit Notes ──────────────────────────────────────────────────────
      {
        name: 'list_credit_notes',
        description: 'List credit notes in Avaza',
        inputSchema: {
          type: 'object',
          properties: {
            page_size: { type: 'number', description: 'Results per page (default: 20)' },
            page_number: { type: 'number', description: 'Page number (default: 1)' },
          },
        },
      },
      {
        name: 'get_credit_note',
        description: 'Retrieve a single credit note by its Avaza credit note ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'The credit note ID' },
          },
          required: ['id'],
        },
      },
      // ── Users ─────────────────────────────────────────────────────────────
      {
        name: 'list_users',
        description: 'List users who have roles in the current Avaza account',
        inputSchema: { type: 'object', properties: {} },
      },
      // ── Lookups ───────────────────────────────────────────────────────────
      {
        name: 'list_currencies',
        description: 'List all currencies configured in the Avaza account',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'list_taxes',
        description: 'List all tax rates configured in the Avaza account',
        inputSchema: { type: 'object', properties: {} },
      },
      // ── Project Members ───────────────────────────────────────────────────
      {
        name: 'list_project_members',
        description: 'List members assigned to Avaza projects with optional project filter',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: { type: 'number', description: 'Filter by project ID' },
          },
        },
      },
      {
        name: 'add_project_member',
        description: 'Add a user as a member to an Avaza project',
        inputSchema: {
          type: 'object',
          properties: {
            ProjectID: { type: 'number', description: 'Project ID (required)' },
            UserID: { type: 'string', description: 'User ID to add as project member (required)' },
          },
          required: ['ProjectID', 'UserID'],
        },
      },
      // ── Timers ────────────────────────────────────────────────────────────
      {
        name: 'start_timer',
        description: 'Start a running timer on an existing Avaza timesheet entry',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'The timesheet entry ID to start the timer on' },
          },
          required: ['id'],
        },
      },
      {
        name: 'stop_timer',
        description: 'Stop the running timer on an Avaza timesheet entry',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'The timesheet entry ID to stop the timer on' },
          },
          required: ['id'],
        },
      },
      {
        name: 'get_running_timer',
        description: 'Get the currently running timer for the authenticated user, if any',
        inputSchema: { type: 'object', properties: {} },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'get_account':          return await this.avRequest('GET', '/api/Account', {});
        // Companies
        case 'list_companies':       return await this.avRequest('GET', '/api/Company', args);
        case 'get_company':          return await this.avRequest('GET', `/api/Company/${args.id}`, {});
        case 'create_company':       return await this.avRequest('POST', '/api/Company', args);
        case 'update_company':       return await this.avRequest('PUT', '/api/Company', args);
        // Contacts
        case 'list_contacts':        return await this.avRequest('GET', '/api/Contact', args);
        case 'get_contact':          return await this.avRequest('GET', `/api/Contact/${args.id}`, {});
        case 'create_contact':       return await this.avRequest('POST', '/api/Contact', args);
        // Projects
        case 'list_projects':        return await this.avRequest('GET', '/api/Project', args);
        case 'get_project':          return await this.avRequest('GET', `/api/Project/${args.id}`, {});
        case 'create_project':       return await this.avRequest('POST', '/api/Project', args);
        case 'update_project':       return await this.avRequest('PUT', '/api/Project', args);
        // Tasks
        case 'list_tasks':           return await this.avRequest('GET', '/api/Task', args);
        case 'get_task':             return await this.avRequest('GET', `/api/Task/${args.id}`, {});
        case 'create_task':          return await this.avRequest('POST', '/api/Task', args);
        case 'update_task':          return await this.avRequest('PUT', '/api/Task', args);
        case 'delete_task':          return await this.avRequest('DELETE', '/api/Task', { id: args.id });
        // Sections
        case 'list_sections':        return await this.avRequest('GET', '/api/Section', args);
        case 'create_section':       return await this.avRequest('POST', '/api/Section', args);
        case 'delete_section':       return await this.avRequest('DELETE', '/api/Section', { id: args.id });
        // Timesheets
        case 'list_timesheets':      return await this.avRequest('GET', '/api/Timesheet', args);
        case 'get_timesheet':        return await this.avRequest('GET', `/api/Timesheet/${args.id}`, {});
        case 'create_timesheet':     return await this.avRequest('POST', '/api/Timesheet', args);
        case 'update_timesheet':     return await this.avRequest('PUT', '/api/Timesheet', args);
        case 'delete_timesheet':     return await this.avRequest('DELETE', `/api/Timesheet/${args.id}`, {});
        case 'get_timesheet_summary': return await this.avRequest('GET', '/api/TimesheetSummary', args);
        // Expenses
        case 'list_expenses':        return await this.avRequest('GET', '/api/Expense', args);
        case 'get_expense':          return await this.avRequest('GET', `/api/Expense/${args.id}`, {});
        case 'create_expense':       return await this.avRequest('POST', '/api/Expense', args);
        case 'update_expense':       return await this.avRequest('PUT', '/api/Expense', args);
        case 'delete_expense':       return await this.avRequest('DELETE', '/api/Expense', { id: args.id });
        case 'get_expense_summary':  return await this.avRequest('GET', '/api/ExpenseSummary', args);
        // Invoices
        case 'list_invoices':        return await this.avRequest('GET', '/api/Invoice', args);
        case 'get_invoice':          return await this.avRequest('GET', `/api/Invoice/${args.id}`, {});
        case 'create_invoice':       return await this.avRequest('POST', '/api/Invoice', args);
        // Estimates
        case 'list_estimates':       return await this.avRequest('GET', '/api/Estimate', args);
        case 'get_estimate':         return await this.avRequest('GET', `/api/Estimate/${args.id}`, {});
        case 'create_estimate':      return await this.avRequest('POST', '/api/Estimate', args);
        // Payments
        case 'list_payments':        return await this.avRequest('GET', '/api/Payment', args);
        case 'get_payment':          return await this.avRequest('GET', `/api/Payment/${args.id}`, {});
        case 'create_payment':       return await this.avRequest('POST', '/api/Payment', args);
        // Bills
        case 'list_bills':           return await this.avRequest('GET', '/api/Bill', args);
        case 'get_bill':             return await this.avRequest('GET', `/api/Bill/${args.id}`, {});
        case 'create_bill':          return await this.avRequest('POST', '/api/Bill', args);
        // Bill Payments
        case 'list_bill_payments':   return await this.avRequest('GET', '/api/BillPayment', args);
        case 'get_bill_payment':     return await this.avRequest('GET', `/api/BillPayment/${args.id}`, {});
        case 'create_bill_payment':  return await this.avRequest('POST', '/api/BillPayment', args);
        // Credit Notes
        case 'list_credit_notes':    return await this.avRequest('GET', '/api/CreditNote', args);
        case 'get_credit_note':      return await this.avRequest('GET', `/api/CreditNote/${args.id}`, {});
        // Users / Lookups
        case 'list_users':           return await this.avRequest('GET', '/api/UserProfile', {});
        case 'list_currencies':      return await this.avRequest('GET', '/api/Currency', {});
        case 'list_taxes':           return await this.avRequest('GET', '/api/Tax', {});
        // Project Members
        case 'list_project_members': return await this.avRequest('GET', '/api/ProjectMember', args);
        case 'add_project_member':   return await this.avRequest('POST', '/api/ProjectMember', args);
        // Timers
        case 'start_timer':          return await this.avRequest('POST', `/api/TimesheetTimer/${args.id}`, {});
        case 'stop_timer':           return await this.avRequest('DELETE', `/api/TimesheetTimer/${args.id}`, {});
        case 'get_running_timer':    return await this.avRequest('GET', '/api/TimesheetTimer', {});
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

  private buildHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  private async avRequest(
    method: string,
    path: string,
    args: Record<string, unknown>,
  ): Promise<ToolResult> {
    let url = `${this.baseUrl}${path}`;
    let body: string | undefined;

    if (method === 'GET' || method === 'DELETE') {
      const params = new URLSearchParams();
      for (const [k, v] of Object.entries(args)) {
        if (v !== undefined && v !== null && k !== 'id') {
          params.set(k, String(v));
        }
      }
      const qs = params.toString();
      if (qs) url += `?${qs}`;
    } else {
      body = JSON.stringify(args);
    }

    const response = await this.fetchWithRetry(url, { method, headers: this.buildHeaders(), body });

    if (!response.ok) {
      let detail = '';
      try { detail = await response.text(); } catch { /* ignore */ }
      return {
        content: [{ type: 'text', text: `Avaza API error ${response.status} ${response.statusText}${detail ? ': ' + detail.slice(0, 400) : ''}` }],
        isError: true,
      };
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      return { content: [{ type: 'text', text: `Avaza returned non-JSON response (HTTP ${response.status})` }], isError: true };
    }

    const text = JSON.stringify(data, null, 2);
    const truncated = text.length > 10_000
      ? text.slice(0, 10_000) + `\n... [truncated, ${text.length} total chars]`
      : text;
    return { content: [{ type: 'text', text: truncated }], isError: false };
  }
}

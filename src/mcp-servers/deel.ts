/**
 * Deel MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://mcp.deel.com — transport: SSE (streamable-HTTP), auth: OAuth2 / Bearer token (PAT)
// Published by Deel (official). 30+ tools covering contracts, people, time-off, payments, invoices, EOR, HRIS.
// Actively maintained — referenced in Deel developer docs (developer.deel.com/mcp) as of 2026-03.
// Our adapter covers: 20 tools. Vendor MCP covers: 30+ tools (full API surface including write operations).
// Recommendation: use-vendor-mcp — official MCP meets all 4 criteria (official, maintained, 30+ tools, SSE).
//   Use this REST adapter for air-gapped deployments or clients that do not support SSE MCP.
//   Note: community fork github.com/JonasDNielsen/deel-mcp-server (25 read-only tools, 2024) is NOT official.
//
// Base URL: https://api.letsdeel.com
// Auth: Bearer token (Authorization: Bearer <token>). Generate from Deel account → Developer Center → API Tokens.
//   Personal Token: tied to user account, expires if user leaves org.
//   Organization Token: not user-linked, no expiry, cannot sign contracts.
//   OAuth2 also available.
// Docs: https://developer.deel.com/api/introduction
//       https://developer.deel.com/mcp
// Rate limits: Documented per-endpoint; general guidance ~600 req/min on paid plans.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface DeelConfig {
  /** Bearer API token (Personal or Organization token from Developer Center) */
  apiToken: string;
  /** Override base URL for sandbox or testing; defaults to production */
  baseUrl?: string;
}

export class DeelMCPServer extends MCPAdapterBase {
  private readonly apiToken: string;
  private readonly baseUrl: string;

  constructor(config: DeelConfig) {
    super();
    this.apiToken = config.apiToken;
    this.baseUrl = (config.baseUrl || 'https://api.letsdeel.com').replace(/\/$/, '');
  }

  static catalog() {
    return {
      name: 'deel',
      displayName: 'Deel',
      version: '1.0.0',
      category: 'finance' as const,
      keywords: ['deel', 'contractor', 'employee', 'eor', 'payroll', 'contract', 'invoice', 'hr', 'global-payroll', 'hiring', 'compliance', 'workforce'],
      toolNames: [
        'list_contracts', 'get_contract', 'list_people', 'get_person',
        'list_invoices', 'get_invoice', 'approve_invoice', 'list_deel_invoices',
        'list_contract_adjustments', 'create_contract_adjustment',
        'get_worker_payslips', 'get_worker_banks',
        'list_time_off_requests', 'list_leave_policies',
        'list_organizations', 'get_organization',
        'list_webhooks', 'create_webhook', 'delete_webhook',
        'list_payment_methods',
      ],
      description: 'Manage Deel contracts, workers, global payroll, invoices, time-off, and webhooks. Covers contractors, EOR employees, and GP workers.',
      author: 'protectnil',
    };
  }

  private get headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.apiToken}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_contracts',
        description: 'List all contracts in your Deel account with optional status filter. Returns contract ID, type (employee, contractor, EOR), status, worker name, and compensation.',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of contracts to return (default: 25, max: 100).',
            },
            offset: {
              type: 'number',
              description: 'Number of records to skip for pagination (default: 0).',
            },
            status: {
              type: 'string',
              description: 'Filter by contract status: active, pending, ended (optional).',
            },
          },
        },
      },
      {
        name: 'get_contract',
        description: 'Retrieve full details for a specific Deel contract by ID, including worker info, compensation, and start date.',
        inputSchema: {
          type: 'object',
          properties: {
            contract_id: {
              type: 'string',
              description: 'The Deel contract ID.',
            },
          },
          required: ['contract_id'],
        },
      },
      {
        name: 'list_people',
        description: 'List all people (workers, contractors, EOR employees) in your Deel organization, with optional search by name or email.',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of people to return (default: 25, max: 100).',
            },
            offset: {
              type: 'number',
              description: 'Number of records to skip for pagination (default: 0).',
            },
            search: {
              type: 'string',
              description: 'Search by name or email (optional).',
            },
          },
        },
      },
      {
        name: 'get_person',
        description: 'Retrieve full profile details for a specific person in your Deel organization by their person ID.',
        inputSchema: {
          type: 'object',
          properties: {
            person_id: {
              type: 'string',
              description: 'The Deel person ID.',
            },
          },
          required: ['person_id'],
        },
      },
      {
        name: 'list_invoices',
        description: 'List worker invoices in your Deel account. Returns invoice ID, amount, currency, status, and associated contract.',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of invoices to return (default: 25, max: 100).',
            },
            offset: {
              type: 'number',
              description: 'Number of records to skip for pagination (default: 0).',
            },
            contract_id: {
              type: 'string',
              description: 'Filter invoices by contract ID (optional).',
            },
            status: {
              type: 'string',
              description: 'Filter by invoice status: pending, approved, paid, declined (optional).',
            },
          },
        },
      },
      {
        name: 'get_invoice',
        description: 'Retrieve full details for a specific worker invoice by its ID, including line items and payment status.',
        inputSchema: {
          type: 'object',
          properties: {
            invoice_id: {
              type: 'string',
              description: 'The Deel invoice ID.',
            },
          },
          required: ['invoice_id'],
        },
      },
      {
        name: 'approve_invoice',
        description: 'Approve a pending worker invoice for payment processing.',
        inputSchema: {
          type: 'object',
          properties: {
            invoice_id: {
              type: 'string',
              description: 'The Deel invoice ID to approve.',
            },
          },
          required: ['invoice_id'],
        },
      },
      {
        name: 'list_deel_invoices',
        description: 'List Deel platform fee invoices billed to your organization (not worker invoices), with optional contract filter.',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of Deel fee invoices to return (default: 25, max: 100).',
            },
            offset: {
              type: 'number',
              description: 'Number of records to skip for pagination (default: 0).',
            },
            contract_id: {
              type: 'string',
              description: 'Filter by contract ID (optional).',
            },
          },
        },
      },
      {
        name: 'list_contract_adjustments',
        description: 'List all adjustments (bonuses, commissions, expenses) for a specific Deel contract.',
        inputSchema: {
          type: 'object',
          properties: {
            contract_id: {
              type: 'string',
              description: 'The Deel contract ID.',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of adjustments to return (default: 25, max: 100).',
            },
            offset: {
              type: 'number',
              description: 'Number of records to skip for pagination (default: 0).',
            },
          },
          required: ['contract_id'],
        },
      },
      {
        name: 'create_contract_adjustment',
        description: 'Create a new adjustment (bonus, commission, expense reimbursement) for a Deel contract.',
        inputSchema: {
          type: 'object',
          properties: {
            contract_id: {
              type: 'string',
              description: 'The Deel contract ID to add the adjustment to.',
            },
            name: {
              type: 'string',
              description: 'Adjustment name or description (e.g. "Q4 bonus").',
            },
            amount: {
              type: 'number',
              description: 'Adjustment amount in the contract currency.',
            },
            quantity: {
              type: 'number',
              description: 'Quantity (default: 1).',
            },
            adjustment_type: {
              type: 'string',
              description: 'Type of adjustment: bonus, commission, expense, allowance, deduction.',
            },
          },
          required: ['contract_id', 'name', 'amount'],
        },
      },
      {
        name: 'get_worker_payslips',
        description: 'Retrieve payslips for a Global Payroll (GP) worker, with optional pagination.',
        inputSchema: {
          type: 'object',
          properties: {
            worker_id: {
              type: 'string',
              description: 'The Deel GP worker ID.',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of payslips to return (default: 25, max: 100).',
            },
            offset: {
              type: 'number',
              description: 'Number of records to skip for pagination (default: 0).',
            },
          },
          required: ['worker_id'],
        },
      },
      {
        name: 'get_worker_banks',
        description: 'Retrieve bank account information on file for a specific Global Payroll worker.',
        inputSchema: {
          type: 'object',
          properties: {
            worker_id: {
              type: 'string',
              description: 'The Deel GP worker ID.',
            },
          },
          required: ['worker_id'],
        },
      },
      {
        name: 'list_time_off_requests',
        description: 'List time-off requests for a specific contract, with optional status and date range filters.',
        inputSchema: {
          type: 'object',
          properties: {
            contract_id: {
              type: 'string',
              description: 'The Deel contract ID.',
            },
            status: {
              type: 'string',
              description: 'Filter by status: pending, approved, rejected, cancelled (optional).',
            },
            start_date: {
              type: 'string',
              description: 'Filter requests starting on or after this date (ISO 8601 format, optional).',
            },
            end_date: {
              type: 'string',
              description: 'Filter requests ending on or before this date (ISO 8601 format, optional).',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of requests to return (default: 25).',
            },
            offset: {
              type: 'number',
              description: 'Number of records to skip for pagination (default: 0).',
            },
          },
          required: ['contract_id'],
        },
      },
      {
        name: 'list_leave_policies',
        description: 'List leave policies configured in your Deel organization.',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of policies to return (default: 25).',
            },
            offset: {
              type: 'number',
              description: 'Number of records to skip for pagination (default: 0).',
            },
          },
        },
      },
      {
        name: 'list_organizations',
        description: 'List organizations (legal entities) configured in your Deel account.',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of organizations to return (default: 25).',
            },
            offset: {
              type: 'number',
              description: 'Number of records to skip for pagination (default: 0).',
            },
          },
        },
      },
      {
        name: 'get_organization',
        description: 'Retrieve details for a specific organization (legal entity) in your Deel account.',
        inputSchema: {
          type: 'object',
          properties: {
            organization_id: {
              type: 'string',
              description: 'The Deel organization ID.',
            },
          },
          required: ['organization_id'],
        },
      },
      {
        name: 'list_webhooks',
        description: 'List all webhook subscriptions configured in your Deel account, including event types and endpoint URLs.',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of webhooks to return (default: 25).',
            },
            offset: {
              type: 'number',
              description: 'Number of records to skip for pagination (default: 0).',
            },
          },
        },
      },
      {
        name: 'create_webhook',
        description: 'Create a new webhook subscription to receive Deel event notifications at a specified URL.',
        inputSchema: {
          type: 'object',
          properties: {
            url: {
              type: 'string',
              description: 'HTTPS URL to receive webhook POST requests.',
            },
            events: {
              type: 'array',
              description: 'List of event types to subscribe to (e.g. ["contract.created", "invoice.approved"]).',
              items: { type: 'string' },
            },
            name: {
              type: 'string',
              description: 'Human-readable name for the webhook.',
            },
          },
          required: ['url', 'events'],
        },
      },
      {
        name: 'delete_webhook',
        description: 'Delete a webhook subscription by its ID.',
        inputSchema: {
          type: 'object',
          properties: {
            webhook_id: {
              type: 'string',
              description: 'The Deel webhook ID to delete.',
            },
          },
          required: ['webhook_id'],
        },
      },
      {
        name: 'list_payment_methods',
        description: 'List payment methods configured for your Deel organization account.',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of payment methods to return (default: 25).',
            },
            offset: {
              type: 'number',
              description: 'Number of records to skip for pagination (default: 0).',
            },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_contracts':
          return await this.listContracts(args);
        case 'get_contract':
          return await this.getContract(args);
        case 'list_people':
          return await this.listPeople(args);
        case 'get_person':
          return await this.getPerson(args);
        case 'list_invoices':
          return await this.listInvoices(args);
        case 'get_invoice':
          return await this.getInvoice(args);
        case 'approve_invoice':
          return await this.approveInvoice(args);
        case 'list_deel_invoices':
          return await this.listDeelInvoices(args);
        case 'list_contract_adjustments':
          return await this.listContractAdjustments(args);
        case 'create_contract_adjustment':
          return await this.createContractAdjustment(args);
        case 'get_worker_payslips':
          return await this.getWorkerPayslips(args);
        case 'get_worker_banks':
          return await this.getWorkerBanks(args);
        case 'list_time_off_requests':
          return await this.listTimeOffRequests(args);
        case 'list_leave_policies':
          return await this.listLeavePolicies(args);
        case 'list_organizations':
          return await this.listOrganizations(args);
        case 'get_organization':
          return await this.getOrganization(args);
        case 'list_webhooks':
          return await this.listWebhooks(args);
        case 'create_webhook':
          return await this.createWebhook(args);
        case 'delete_webhook':
          return await this.deleteWebhook(args);
        case 'list_payment_methods':
          return await this.listPaymentMethods(args);
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

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------


  private async request(path: string, options: RequestInit = {}): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'GET',
      ...options,
      headers: { ...this.headers, ...(options.headers as Record<string, string> || {}) },
    });

    if (!response.ok) {
      let errBody = '';
      try { errBody = await response.text(); } catch { /* ignore */ }
      return {
        content: [{ type: 'text', text: `API error: HTTP ${response.status} ${response.statusText}${errBody ? ` — ${errBody.slice(0, 500)}` : ''}` }],
        isError: true,
      };
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new Error(`Deel returned non-JSON response (HTTP ${response.status})`);
    }

    return {
      content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }],
      isError: false,
    };
  }

  private async listContracts(args: Record<string, unknown>): Promise<ToolResult> {
    const limit = (args.limit as number) || 25;
    const offset = (args.offset as number) || 0;
    let url = `/rest/v2/contracts?limit=${limit}&offset=${offset}`;
    if (args.status) url += `&status=${encodeURIComponent(args.status as string)}`;
    return this.request(url);
  }

  private async getContract(args: Record<string, unknown>): Promise<ToolResult> {
    const contractId = args.contract_id as string;
    if (!contractId) return { content: [{ type: 'text', text: 'contract_id is required' }], isError: true };
    return this.request(`/rest/v2/contracts/${encodeURIComponent(contractId)}`);
  }

  private async listPeople(args: Record<string, unknown>): Promise<ToolResult> {
    const limit = (args.limit as number) || 25;
    const offset = (args.offset as number) || 0;
    let url = `/rest/v2/people?limit=${limit}&offset=${offset}`;
    if (args.search) url += `&search=${encodeURIComponent(args.search as string)}`;
    return this.request(url);
  }

  private async getPerson(args: Record<string, unknown>): Promise<ToolResult> {
    const personId = args.person_id as string;
    if (!personId) return { content: [{ type: 'text', text: 'person_id is required' }], isError: true };
    return this.request(`/rest/v2/people/${encodeURIComponent(personId)}`);
  }

  private async listInvoices(args: Record<string, unknown>): Promise<ToolResult> {
    const limit = (args.limit as number) || 25;
    const offset = (args.offset as number) || 0;
    let url = `/rest/v2/invoices?limit=${limit}&offset=${offset}`;
    if (args.contract_id) url += `&contract_id=${encodeURIComponent(args.contract_id as string)}`;
    if (args.status) url += `&status=${encodeURIComponent(args.status as string)}`;
    return this.request(url);
  }

  private async getInvoice(args: Record<string, unknown>): Promise<ToolResult> {
    const invoiceId = args.invoice_id as string;
    if (!invoiceId) return { content: [{ type: 'text', text: 'invoice_id is required' }], isError: true };
    return this.request(`/rest/v2/invoices/${encodeURIComponent(invoiceId)}`);
  }

  private async approveInvoice(args: Record<string, unknown>): Promise<ToolResult> {
    const invoiceId = args.invoice_id as string;
    if (!invoiceId) return { content: [{ type: 'text', text: 'invoice_id is required' }], isError: true };
    return this.request(`/rest/v2/invoices/${encodeURIComponent(invoiceId)}/approve`, { method: 'POST' });
  }

  private async listDeelInvoices(args: Record<string, unknown>): Promise<ToolResult> {
    const limit = (args.limit as number) || 25;
    const offset = (args.offset as number) || 0;
    let url = `/rest/v2/invoices/deel?limit=${limit}&offset=${offset}`;
    if (args.contract_id) url += `&contract_id=${encodeURIComponent(args.contract_id as string)}`;
    return this.request(url);
  }

  private async listContractAdjustments(args: Record<string, unknown>): Promise<ToolResult> {
    const contractId = args.contract_id as string;
    if (!contractId) return { content: [{ type: 'text', text: 'contract_id is required' }], isError: true };
    const limit = (args.limit as number) || 25;
    const offset = (args.offset as number) || 0;
    return this.request(`/rest/v2/contracts/${encodeURIComponent(contractId)}/adjustments?limit=${limit}&offset=${offset}`);
  }

  private async createContractAdjustment(args: Record<string, unknown>): Promise<ToolResult> {
    const contractId = args.contract_id as string;
    if (!contractId) return { content: [{ type: 'text', text: 'contract_id is required' }], isError: true };
    if (!args.name) return { content: [{ type: 'text', text: 'name is required' }], isError: true };
    if (args.amount == null) return { content: [{ type: 'text', text: 'amount is required' }], isError: true };

    const body: Record<string, unknown> = {
      name: args.name,
      amount: args.amount,
      quantity: (args.quantity as number) || 1,
    };
    if (args.adjustment_type) body.adjustment_type = args.adjustment_type;

    return this.request(`/rest/v2/contracts/${encodeURIComponent(contractId)}/adjustments`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  private async getWorkerPayslips(args: Record<string, unknown>): Promise<ToolResult> {
    const workerId = args.worker_id as string;
    if (!workerId) return { content: [{ type: 'text', text: 'worker_id is required' }], isError: true };
    const limit = (args.limit as number) || 25;
    const offset = (args.offset as number) || 0;
    return this.request(`/rest/v2/gp/workers/${encodeURIComponent(workerId)}/payslips?limit=${limit}&offset=${offset}`);
  }

  private async getWorkerBanks(args: Record<string, unknown>): Promise<ToolResult> {
    const workerId = args.worker_id as string;
    if (!workerId) return { content: [{ type: 'text', text: 'worker_id is required' }], isError: true };
    return this.request(`/rest/v2/gp/workers/${encodeURIComponent(workerId)}/banks`);
  }

  private async listTimeOffRequests(args: Record<string, unknown>): Promise<ToolResult> {
    const contractId = args.contract_id as string;
    if (!contractId) return { content: [{ type: 'text', text: 'contract_id is required' }], isError: true };
    const limit = (args.limit as number) || 25;
    const offset = (args.offset as number) || 0;
    let url = `/rest/v2/contracts/${encodeURIComponent(contractId)}/time-offs?limit=${limit}&offset=${offset}`;
    if (args.status) url += `&status=${encodeURIComponent(args.status as string)}`;
    if (args.start_date) url += `&start_date=${encodeURIComponent(args.start_date as string)}`;
    if (args.end_date) url += `&end_date=${encodeURIComponent(args.end_date as string)}`;
    return this.request(url);
  }

  private async listLeavePolicies(args: Record<string, unknown>): Promise<ToolResult> {
    const limit = (args.limit as number) || 25;
    const offset = (args.offset as number) || 0;
    return this.request(`/rest/v2/leave-policies?limit=${limit}&offset=${offset}`);
  }

  private async listOrganizations(args: Record<string, unknown>): Promise<ToolResult> {
    const limit = (args.limit as number) || 25;
    const offset = (args.offset as number) || 0;
    return this.request(`/rest/v2/organizations?limit=${limit}&offset=${offset}`);
  }

  private async getOrganization(args: Record<string, unknown>): Promise<ToolResult> {
    const organizationId = args.organization_id as string;
    if (!organizationId) return { content: [{ type: 'text', text: 'organization_id is required' }], isError: true };
    return this.request(`/rest/v2/organizations/${encodeURIComponent(organizationId)}`);
  }

  private async listWebhooks(args: Record<string, unknown>): Promise<ToolResult> {
    const limit = (args.limit as number) || 25;
    const offset = (args.offset as number) || 0;
    return this.request(`/rest/v2/webhooks?limit=${limit}&offset=${offset}`);
  }

  private async createWebhook(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.url) return { content: [{ type: 'text', text: 'url is required' }], isError: true };
    if (!args.events) return { content: [{ type: 'text', text: 'events is required' }], isError: true };

    const body: Record<string, unknown> = {
      url: args.url,
      events: args.events,
    };
    if (args.name) body.name = args.name;

    return this.request('/rest/v2/webhooks', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  private async deleteWebhook(args: Record<string, unknown>): Promise<ToolResult> {
    const webhookId = args.webhook_id as string;
    if (!webhookId) return { content: [{ type: 'text', text: 'webhook_id is required' }], isError: true };
    return this.request(`/rest/v2/webhooks/${encodeURIComponent(webhookId)}`, { method: 'DELETE' });
  }

  private async listPaymentMethods(args: Record<string, unknown>): Promise<ToolResult> {
    const limit = (args.limit as number) || 25;
    const offset = (args.offset as number) || 0;
    return this.request(`/rest/v2/payment-methods?limit=${limit}&offset=${offset}`);
  }
}

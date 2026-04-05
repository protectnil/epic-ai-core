/**
 * Vertafore MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// No official Vertafore MCP server was found on GitHub or npm.
//
// Base URL: https://api.vertafore.com/v1 (AMS360 EMS — Enterprise Management Service)
// Sandbox: https://api-sandbox.vertafore.com/v1
// Auth: OAuth2 client credentials — POST /authgrant/v1/api/Token
// Docs: https://help.vertafore.com/devportal/
// Rate limits: Not publicly documented; enterprise tier agreements govern quotas.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface VertaforeConfig {
  clientId: string;
  clientSecret: string;
  agencyId: string;
  baseUrl?: string;
  tokenUrl?: string;
}

export class VertaforeMCPServer extends MCPAdapterBase {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly agencyId: string;
  private readonly baseUrl: string;
  private readonly tokenUrl: string;

  private bearerToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(config: VertaforeConfig) {
    super();
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.agencyId = config.agencyId;
    this.baseUrl = config.baseUrl || 'https://api.vertafore.com/v1';
    this.tokenUrl = config.tokenUrl || 'https://api.vertafore.com/authgrant/v1/api/Token';
  }

  static catalog() {
    return {
      name: 'vertafore',
      displayName: 'Vertafore',
      version: '1.0.0',
      category: 'misc',
      keywords: ['vertafore', 'ams360', 'insurance', 'agency', 'policy', 'customer', 'premium', 'carrier', 'producer', 'certificate', 'endorsement', 'renewal'],
      toolNames: [
        'list_customers', 'get_customer', 'search_customers', 'create_customer',
        'list_policies', 'get_policy', 'search_policies', 'create_policy',
        'list_activities', 'create_activity',
        'list_producers', 'list_companies',
      ],
      description: 'Vertafore AMS360 insurance agency management: search and manage customers, policies, activities, producers, and carrier companies for property and casualty insurance workflows.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_customers',
        description: 'List insurance customers in Vertafore AMS360 with optional filters for name, status, and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            page_size: {
              type: 'number',
              description: 'Results per page (default: 25, max: 100)',
            },
            is_active: {
              type: 'boolean',
              description: 'Filter by active status (default: true)',
            },
          },
        },
      },
      {
        name: 'get_customer',
        description: 'Get detailed information for a specific AMS360 customer by customer ID including contact and address data',
        inputSchema: {
          type: 'object',
          properties: {
            customer_id: {
              type: 'string',
              description: 'AMS360 customer ID',
            },
          },
          required: ['customer_id'],
        },
      },
      {
        name: 'search_customers',
        description: 'Search Vertafore AMS360 customers by name, email, phone, or ZIP code',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Customer name (partial match supported)',
            },
            email: {
              type: 'string',
              description: 'Customer email address',
            },
            phone: {
              type: 'string',
              description: 'Customer phone number',
            },
            zip_code: {
              type: 'string',
              description: 'Customer ZIP code',
            },
            page: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
            page_size: {
              type: 'number',
              description: 'Results per page (default: 25)',
            },
          },
        },
      },
      {
        name: 'create_customer',
        description: 'Create a new customer record in Vertafore AMS360 with contact and address information',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Customer full name or business name',
            },
            email: {
              type: 'string',
              description: 'Customer email address',
            },
            phone: {
              type: 'string',
              description: 'Customer phone number',
            },
            address: {
              type: 'string',
              description: 'Street address',
            },
            city: {
              type: 'string',
              description: 'City',
            },
            state: {
              type: 'string',
              description: 'State code (2-letter)',
            },
            zip_code: {
              type: 'string',
              description: 'ZIP code',
            },
            customer_type: {
              type: 'string',
              description: 'Customer type: C=Commercial, P=Personal (default: P)',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'list_policies',
        description: 'List insurance policies in AMS360 with optional filters for customer, line of business, and policy status',
        inputSchema: {
          type: 'object',
          properties: {
            customer_id: {
              type: 'string',
              description: 'Filter policies for a specific customer ID',
            },
            line_of_business: {
              type: 'string',
              description: 'Line of business filter (e.g. GL, AUTO, WC, PROP)',
            },
            policy_status: {
              type: 'string',
              description: 'Policy status: Active, Cancelled, Expired (default: Active)',
            },
            page: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
            page_size: {
              type: 'number',
              description: 'Results per page (default: 25)',
            },
          },
        },
      },
      {
        name: 'get_policy',
        description: 'Get detailed information for a specific AMS360 insurance policy by policy ID including coverage, premium, and expiration data',
        inputSchema: {
          type: 'object',
          properties: {
            policy_id: {
              type: 'string',
              description: 'AMS360 policy ID',
            },
          },
          required: ['policy_id'],
        },
      },
      {
        name: 'search_policies',
        description: 'Search AMS360 policies by policy number, customer name, or date range for effective and expiration dates',
        inputSchema: {
          type: 'object',
          properties: {
            policy_number: {
              type: 'string',
              description: 'Policy number (partial match supported)',
            },
            customer_name: {
              type: 'string',
              description: 'Filter by customer name',
            },
            effective_date_from: {
              type: 'string',
              description: 'Policy effective date range start (YYYY-MM-DD)',
            },
            effective_date_to: {
              type: 'string',
              description: 'Policy effective date range end (YYYY-MM-DD)',
            },
            expiration_date_from: {
              type: 'string',
              description: 'Policy expiration date range start (YYYY-MM-DD)',
            },
            expiration_date_to: {
              type: 'string',
              description: 'Policy expiration date range end (YYYY-MM-DD)',
            },
            page: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
            page_size: {
              type: 'number',
              description: 'Results per page (default: 25)',
            },
          },
        },
      },
      {
        name: 'create_policy',
        description: 'Create a new insurance policy record in AMS360 for an existing customer with carrier and coverage details',
        inputSchema: {
          type: 'object',
          properties: {
            customer_id: {
              type: 'string',
              description: 'AMS360 customer ID to attach this policy to',
            },
            policy_number: {
              type: 'string',
              description: 'Policy number assigned by the carrier',
            },
            company_code: {
              type: 'string',
              description: 'Insurance carrier/company code',
            },
            line_of_business: {
              type: 'string',
              description: 'Line of business code (e.g. GL, AUTO, WC)',
            },
            effective_date: {
              type: 'string',
              description: 'Policy effective date (YYYY-MM-DD)',
            },
            expiration_date: {
              type: 'string',
              description: 'Policy expiration date (YYYY-MM-DD)',
            },
            premium: {
              type: 'number',
              description: 'Annual premium amount in dollars',
            },
          },
          required: ['customer_id', 'policy_number', 'company_code', 'line_of_business', 'effective_date', 'expiration_date'],
        },
      },
      {
        name: 'list_activities',
        description: 'List AMS360 activities (tasks, notes, and follow-ups) with optional filters for customer, due date, and status',
        inputSchema: {
          type: 'object',
          properties: {
            customer_id: {
              type: 'string',
              description: 'Filter activities for a specific customer',
            },
            status: {
              type: 'string',
              description: 'Activity status: Open, Closed (default: Open)',
            },
            due_date_from: {
              type: 'string',
              description: 'Due date range start (YYYY-MM-DD)',
            },
            due_date_to: {
              type: 'string',
              description: 'Due date range end (YYYY-MM-DD)',
            },
            page: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
            page_size: {
              type: 'number',
              description: 'Results per page (default: 25)',
            },
          },
        },
      },
      {
        name: 'create_activity',
        description: 'Create a new activity (task, note, or follow-up) in AMS360 linked to a customer or policy',
        inputSchema: {
          type: 'object',
          properties: {
            customer_id: {
              type: 'string',
              description: 'Customer ID to link this activity to',
            },
            description: {
              type: 'string',
              description: 'Activity description or note text',
            },
            action_code: {
              type: 'string',
              description: 'Activity type code (e.g. NOTE, CALL, EMAIL, TASK)',
            },
            due_date: {
              type: 'string',
              description: 'Due date for the activity (YYYY-MM-DD)',
            },
            policy_id: {
              type: 'string',
              description: 'Optional policy ID to link this activity to',
            },
          },
          required: ['customer_id', 'description', 'action_code'],
        },
      },
      {
        name: 'list_producers',
        description: 'List insurance producers (agents) registered in the AMS360 agency with their codes and license information',
        inputSchema: {
          type: 'object',
          properties: {
            is_active: {
              type: 'boolean',
              description: 'Filter by active status (default: true)',
            },
            page: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
            page_size: {
              type: 'number',
              description: 'Results per page (default: 50)',
            },
          },
        },
      },
      {
        name: 'list_companies',
        description: 'List insurance carriers and companies configured in the AMS360 agency with their NAIC codes and contact information',
        inputSchema: {
          type: 'object',
          properties: {
            is_active: {
              type: 'boolean',
              description: 'Filter by active status (default: true)',
            },
            page: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
            page_size: {
              type: 'number',
              description: 'Results per page (default: 50)',
            },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_customers':
          return this.listCustomers(args);
        case 'get_customer':
          return this.getCustomer(args);
        case 'search_customers':
          return this.searchCustomers(args);
        case 'create_customer':
          return this.createCustomer(args);
        case 'list_policies':
          return this.listPolicies(args);
        case 'get_policy':
          return this.getPolicy(args);
        case 'search_policies':
          return this.searchPolicies(args);
        case 'create_policy':
          return this.createPolicy(args);
        case 'list_activities':
          return this.listActivities(args);
        case 'create_activity':
          return this.createActivity(args);
        case 'list_producers':
          return this.listProducers(args);
        case 'list_companies':
          return this.listCompanies(args);
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

  private async getOrRefreshToken(): Promise<string> {
    const now = Date.now();
    if (this.bearerToken && this.tokenExpiry > now) {
      return this.bearerToken;
    }
    const response = await this.fetchWithRetry(this.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: this.clientId,
        client_secret: this.clientSecret,
      }).toString(),
    });
    if (!response.ok) {
      throw new Error(`OAuth2 token request failed: ${response.status} ${response.statusText}`);
    }
    const data = await response.json() as { access_token: string; expires_in: number };
    this.bearerToken = data.access_token;
    this.tokenExpiry = now + (data.expires_in - 60) * 1000;
    return this.bearerToken;
  }


  private async apiGet(path: string, params?: Record<string, string>): Promise<ToolResult> {
    const token = await this.getOrRefreshToken();
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}${qs}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'AgencyId': this.agencyId,
      },
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apiPost(path: string, body: unknown): Promise<ToolResult> {
    const token = await this.getOrRefreshToken();
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'AgencyId': this.agencyId,
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listCustomers(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      page: String((args.page as number) || 1),
      pageSize: String((args.page_size as number) || 25),
    };
    if (args.is_active !== undefined) params.isActive = String(args.is_active);
    return this.apiGet('/customers', params);
  }

  private async getCustomer(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.customer_id) return { content: [{ type: 'text', text: 'customer_id is required' }], isError: true };
    return this.apiGet(`/customers/${encodeURIComponent(args.customer_id as string)}`);
  }

  private async searchCustomers(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      page: String((args.page as number) || 1),
      pageSize: String((args.page_size as number) || 25),
    };
    if (args.name) params.name = args.name as string;
    if (args.email) params.email = args.email as string;
    if (args.phone) params.phone = args.phone as string;
    if (args.zip_code) params.zipCode = args.zip_code as string;
    return this.apiGet('/customers/search', params);
  }

  private async createCustomer(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name) return { content: [{ type: 'text', text: 'name is required' }], isError: true };
    const body: Record<string, unknown> = {
      customerName: args.name,
      customerType: (args.customer_type as string) || 'P',
    };
    if (args.email) body.email = args.email;
    if (args.phone) body.phone = args.phone;
    if (args.address) body.address = args.address;
    if (args.city) body.city = args.city;
    if (args.state) body.state = args.state;
    if (args.zip_code) body.zipCode = args.zip_code;
    return this.apiPost('/customers', body);
  }

  private async listPolicies(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      page: String((args.page as number) || 1),
      pageSize: String((args.page_size as number) || 25),
      policyStatus: (args.policy_status as string) || 'Active',
    };
    if (args.customer_id) params.customerId = args.customer_id as string;
    if (args.line_of_business) params.lineOfBusiness = args.line_of_business as string;
    return this.apiGet('/policies', params);
  }

  private async getPolicy(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.policy_id) return { content: [{ type: 'text', text: 'policy_id is required' }], isError: true };
    return this.apiGet(`/policies/${encodeURIComponent(args.policy_id as string)}`);
  }

  private async searchPolicies(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      page: String((args.page as number) || 1),
      pageSize: String((args.page_size as number) || 25),
    };
    if (args.policy_number) params.policyNumber = args.policy_number as string;
    if (args.customer_name) params.customerName = args.customer_name as string;
    if (args.effective_date_from) params.effectiveDateFrom = args.effective_date_from as string;
    if (args.effective_date_to) params.effectiveDateTo = args.effective_date_to as string;
    if (args.expiration_date_from) params.expirationDateFrom = args.expiration_date_from as string;
    if (args.expiration_date_to) params.expirationDateTo = args.expiration_date_to as string;
    return this.apiGet('/policies/search', params);
  }

  private async createPolicy(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.customer_id || !args.policy_number || !args.company_code || !args.line_of_business || !args.effective_date || !args.expiration_date) {
      return { content: [{ type: 'text', text: 'customer_id, policy_number, company_code, line_of_business, effective_date, and expiration_date are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      customerId: args.customer_id,
      policyNumber: args.policy_number,
      companyCode: args.company_code,
      lineOfBusiness: args.line_of_business,
      effectiveDate: args.effective_date,
      expirationDate: args.expiration_date,
    };
    if (args.premium !== undefined) body.premium = args.premium;
    return this.apiPost('/policies', body);
  }

  private async listActivities(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      page: String((args.page as number) || 1),
      pageSize: String((args.page_size as number) || 25),
      status: (args.status as string) || 'Open',
    };
    if (args.customer_id) params.customerId = args.customer_id as string;
    if (args.due_date_from) params.dueDateFrom = args.due_date_from as string;
    if (args.due_date_to) params.dueDateTo = args.due_date_to as string;
    return this.apiGet('/activities', params);
  }

  private async createActivity(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.customer_id || !args.description || !args.action_code) {
      return { content: [{ type: 'text', text: 'customer_id, description, and action_code are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      customerId: args.customer_id,
      description: args.description,
      actionCode: args.action_code,
    };
    if (args.due_date) body.dueDate = args.due_date;
    if (args.policy_id) body.policyId = args.policy_id;
    return this.apiPost('/activities', body);
  }

  private async listProducers(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      page: String((args.page as number) || 1),
      pageSize: String((args.page_size as number) || 50),
    };
    if (args.is_active !== undefined) params.isActive = String(args.is_active);
    return this.apiGet('/producers', params);
  }

  private async listCompanies(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      page: String((args.page as number) || 1),
      pageSize: String((args.page_size as number) || 50),
    };
    if (args.is_active !== undefined) params.isActive = String(args.is_active);
    return this.apiGet('/companies', params);
  }
}

/**
 * Guidewire PolicyCenter MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// No official Guidewire MCP server was found on GitHub or npm.
//
// Base URL: https://{tenant}.cloud.guidewire.com/pc/rest (set via tenantUrl constructor config)
// Auth: OAuth2 client credentials flow.
//       Token endpoint: https://{tenant}.cloud.guidewire.com/oauth2/token (configurable via tokenUrl)
//       Grant type: client_credentials (client_id + client_secret as form-encoded body params)
//       Scopes: pc.policies, pc.accounts (configured in Guidewire Integration Gateway)
// Docs: https://docs.guidewire.com/cloud/pc/202503/apiref/
//       PolicyCenter Cloud API Consumer Guide: https://docs.guidewire.com/cloud/pc/202511/cloudapibf/
// Rate limits: Not publicly documented. Governed per-tenant by Guidewire Cloud infrastructure.
// Note: Base URL and API paths are tenant-specific. Paths below follow Guidewire Cloud API v1 conventions
//       as documented in the PolicyCenter Cloud API reference (202503 release).
//       Account API = /account/v1, Job API = /job/v1, Policy API = /policy/v1, Common API = /common/v1

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface GuidewireConfig {
  clientId: string;
  clientSecret: string;
  tenantUrl: string;      // e.g. https://my-company.cloud.guidewire.com/pc/rest
  tokenUrl: string;       // e.g. https://my-company.cloud.guidewire.com/oauth2/token
}

export class GuidewireMCPServer extends MCPAdapterBase {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly tenantUrl: string;
  private readonly tokenUrl: string;
  private bearerToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(config: GuidewireConfig) {
    super();
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.tenantUrl = config.tenantUrl.replace(/\/$/, '');
    this.tokenUrl = config.tokenUrl;
  }

  static catalog() {
    return {
      name: 'guidewire',
      displayName: 'Guidewire PolicyCenter',
      version: '1.0.0',
      category: 'misc',
      keywords: [
        'guidewire', 'policycenter', 'insurance', 'policy', 'quote', 'underwriting',
        'submission', 'account', 'p&c', 'property-casualty', 'renewal', 'endorsement',
        'claims', 'coverage', 'premium', 'insured',
      ],
      toolNames: [
        'list_accounts',
        'get_account',
        'search_accounts',
        'list_policies',
        'get_policy',
        'search_policies',
        'list_submissions',
        'get_submission',
        'create_submission',
        'list_renewals',
        'get_policy_documents',
        'list_activities',
        'get_activity',
      ],
      description: 'Guidewire PolicyCenter: manage insurance accounts, policies, quotes, submissions, renewals, and underwriting activities.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_accounts',
        description: 'List policyholder accounts with optional filters for account name, type, and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            account_name: {
              type: 'string',
              description: 'Filter accounts by name (partial match)',
            },
            account_type: {
              type: 'string',
              description: 'Filter by account type (e.g. Commercial, Personal)',
            },
            page_size: {
              type: 'number',
              description: 'Number of results per page (default: 25)',
            },
            offset: {
              type: 'number',
              description: 'Offset for pagination (default: 0)',
            },
          },
        },
      },
      {
        name: 'get_account',
        description: 'Retrieve a single policyholder account by ID including contact info, policies, and billing details',
        inputSchema: {
          type: 'object',
          properties: {
            account_id: {
              type: 'string',
              description: 'Guidewire account ID (e.g. ac:0001)',
            },
          },
          required: ['account_id'],
        },
      },
      {
        name: 'search_accounts',
        description: 'Search for policyholder accounts by first name, last name, or organization name',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search term for account holder name or organization',
            },
            page_size: {
              type: 'number',
              description: 'Number of results per page (default: 25)',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'list_policies',
        description: 'List policies with optional filters for account, status, product, and effective date range',
        inputSchema: {
          type: 'object',
          properties: {
            account_id: {
              type: 'string',
              description: 'Filter policies by policyholder account ID',
            },
            status: {
              type: 'string',
              description: 'Filter by policy status: In Force, Expired, Cancelled, Scheduled (default: In Force)',
            },
            product_code: {
              type: 'string',
              description: 'Filter by insurance product code (e.g. BusinessAuto, CommercialProperty)',
            },
            effective_date_min: {
              type: 'string',
              description: 'Filter policies with effective date on or after this date (ISO 8601, e.g. 2024-01-01)',
            },
            effective_date_max: {
              type: 'string',
              description: 'Filter policies with effective date on or before this date (ISO 8601)',
            },
            page_size: {
              type: 'number',
              description: 'Number of results per page (default: 25)',
            },
            offset: {
              type: 'number',
              description: 'Offset for pagination (default: 0)',
            },
          },
        },
      },
      {
        name: 'get_policy',
        description: 'Retrieve a single policy by ID with full coverage details, premiums, and endorsement history',
        inputSchema: {
          type: 'object',
          properties: {
            policy_id: {
              type: 'string',
              description: 'Guidewire policy ID or policy number (e.g. POL-0001)',
            },
          },
          required: ['policy_id'],
        },
      },
      {
        name: 'search_policies',
        description: 'Search for policies by policy number, insured name, or VIN across all statuses',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search term: policy number, insured name, or vehicle identification number (VIN)',
            },
            page_size: {
              type: 'number',
              description: 'Number of results per page (default: 25)',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'list_submissions',
        description: 'List policy submissions (new business quotes) with optional filters for status, product, and date range',
        inputSchema: {
          type: 'object',
          properties: {
            account_id: {
              type: 'string',
              description: 'Filter submissions by account ID',
            },
            status: {
              type: 'string',
              description: 'Filter by submission status: Draft, Quoted, Bound, Declined, Withdrawn',
            },
            product_code: {
              type: 'string',
              description: 'Filter by product code',
            },
            page_size: {
              type: 'number',
              description: 'Number of results per page (default: 25)',
            },
            offset: {
              type: 'number',
              description: 'Offset for pagination (default: 0)',
            },
          },
        },
      },
      {
        name: 'get_submission',
        description: 'Retrieve a single submission (new business quote) by ID including quoted premium and underwriting details',
        inputSchema: {
          type: 'object',
          properties: {
            submission_id: {
              type: 'string',
              description: 'Guidewire submission ID (e.g. sub:0001)',
            },
          },
          required: ['submission_id'],
        },
      },
      {
        name: 'create_submission',
        description: 'Create a new policy submission (quote request) for an existing account with product, effective date, base state, and producer code',
        inputSchema: {
          type: 'object',
          properties: {
            account_id: {
              type: 'string',
              description: 'Policyholder account ID to create the submission for (e.g. pc:1234)',
            },
            product_code: {
              type: 'string',
              description: 'Insurance product ID for the submission (e.g. PersonalAuto, BusinessAuto, CommercialProperty)',
            },
            effective_date: {
              type: 'string',
              description: 'Requested policy effective date (ISO 8601, e.g. 2025-01-01)',
            },
            base_state: {
              type: 'string',
              description: 'Two-letter jurisdiction/state code for the primary location (e.g. CA, NY). Required by Guidewire at runtime.',
            },
            producer_code: {
              type: 'string',
              description: 'Producer code ID (e.g. pc:16). Required by Guidewire at runtime.',
            },
            expiration_date: {
              type: 'string',
              description: 'Requested policy expiration date (ISO 8601, e.g. 2026-01-01)',
            },
          },
          required: ['account_id', 'product_code', 'effective_date'],
        },
      },
      {
        name: 'list_renewals',
        description: 'List policy renewal transactions with optional filters for status and expiration date range',
        inputSchema: {
          type: 'object',
          properties: {
            account_id: {
              type: 'string',
              description: 'Filter renewals by account ID',
            },
            status: {
              type: 'string',
              description: 'Filter by renewal status: Draft, Quoted, Bound',
            },
            expiration_date_min: {
              type: 'string',
              description: 'Filter renewals for policies expiring on or after this date (ISO 8601)',
            },
            expiration_date_max: {
              type: 'string',
              description: 'Filter renewals for policies expiring on or before this date (ISO 8601)',
            },
            page_size: {
              type: 'number',
              description: 'Number of results per page (default: 25)',
            },
            offset: {
              type: 'number',
              description: 'Offset for pagination (default: 0)',
            },
          },
        },
      },
      {
        name: 'get_policy_documents',
        description: 'Retrieve a list of documents attached to a policy such as declaration pages and endorsements',
        inputSchema: {
          type: 'object',
          properties: {
            policy_id: {
              type: 'string',
              description: 'Policy ID to retrieve documents for',
            },
          },
          required: ['policy_id'],
        },
      },
      {
        name: 'list_activities',
        description: 'List workflow activities (tasks) assigned to users or queues with optional status and priority filters',
        inputSchema: {
          type: 'object',
          properties: {
            assigned_user: {
              type: 'string',
              description: 'Filter activities assigned to a specific user (username)',
            },
            status: {
              type: 'string',
              description: 'Filter by activity status: open, complete (default: open)',
            },
            priority: {
              type: 'string',
              description: 'Filter by priority: urgent, high, normal, low',
            },
            page_size: {
              type: 'number',
              description: 'Number of results per page (default: 25)',
            },
            offset: {
              type: 'number',
              description: 'Offset for pagination (default: 0)',
            },
          },
        },
      },
      {
        name: 'get_activity',
        description: 'Retrieve a single workflow activity by ID including description, due date, and associated policy',
        inputSchema: {
          type: 'object',
          properties: {
            activity_id: {
              type: 'string',
              description: 'Guidewire activity ID',
            },
          },
          required: ['activity_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_accounts':
          return this.listAccounts(args);
        case 'get_account':
          return this.getAccount(args);
        case 'search_accounts':
          return this.searchAccounts(args);
        case 'list_policies':
          return this.listPolicies(args);
        case 'get_policy':
          return this.getPolicy(args);
        case 'search_policies':
          return this.searchPolicies(args);
        case 'list_submissions':
          return this.listSubmissions(args);
        case 'get_submission':
          return this.getSubmission(args);
        case 'create_submission':
          return this.createSubmission(args);
        case 'list_renewals':
          return this.listRenewals(args);
        case 'get_policy_documents':
          return this.getPolicyDocuments(args);
        case 'list_activities':
          return this.listActivities(args);
        case 'get_activity':
          return this.getActivity(args);
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
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
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

  private async gwGet(path: string, params: Record<string, string> = {}): Promise<ToolResult> {
    const token = await this.getOrRefreshToken();
    const qs = new URLSearchParams(params).toString();
    const url = `${this.tenantUrl}${path}${qs ? '?' + qs : ''}`;

    const response = await this.fetchWithRetry(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `API error: ${response.status} ${errText}` }], isError: true };
    }

    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async gwPost(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const token = await this.getOrRefreshToken();

    const response = await this.fetchWithRetry(`${this.tenantUrl}${path}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `API error: ${response.status} ${errText}` }], isError: true };
    }

    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private buildPageParams(args: Record<string, unknown>): Record<string, string> {
    const params: Record<string, string> = {};
    params['pageSize'] = String((args.page_size as number) || 25);
    if (args.offset) params['offset'] = String(args.offset);
    return params;
  }

  private async listAccounts(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.buildPageParams(args);
    if (args.account_name) params['accountName'] = args.account_name as string;
    if (args.account_type) params['accountType'] = args.account_type as string;
    return this.gwGet('/account/v1/accounts', params);
  }

  private async getAccount(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.account_id) return { content: [{ type: 'text', text: 'account_id is required' }], isError: true };
    return this.gwGet(`/account/v1/accounts/${encodeURIComponent(args.account_id as string)}`);
  }

  private async searchAccounts(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.query) return { content: [{ type: 'text', text: 'query is required' }], isError: true };
    // POST /account/v1/search/accounts-freetext — free-text account search per Guidewire Cloud API docs.
    const pageSize = (args.page_size as number) || 25;
    return this.gwPost('/account/v1/search/accounts-freetext', {
      data: {
        attributes: {
          searchValue: args.query,
          pageSize,
        },
      },
    });
  }

  private async listPolicies(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.buildPageParams(args);
    if (args.account_id) params['accountId'] = args.account_id as string;
    if (args.status) params['status'] = args.status as string;
    if (args.product_code) params['productCode'] = args.product_code as string;
    if (args.effective_date_min) params['effectiveDateMin'] = args.effective_date_min as string;
    if (args.effective_date_max) params['effectiveDateMax'] = args.effective_date_max as string;
    return this.gwGet('/policy/v1/policies', params);
  }

  private async getPolicy(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.policy_id) return { content: [{ type: 'text', text: 'policy_id is required' }], isError: true };
    return this.gwGet(`/policy/v1/policies/${encodeURIComponent(args.policy_id as string)}`);
  }

  private async searchPolicies(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.query) return { content: [{ type: 'text', text: 'query is required' }], isError: true };
    // POST /policy/v1/search/policies — free-text policy search per Guidewire Cloud API pattern.
    const pageSize = (args.page_size as number) || 25;
    return this.gwPost('/policy/v1/search/policies', {
      data: {
        attributes: {
          searchValue: args.query,
          pageSize,
        },
      },
    });
  }

  private async listSubmissions(args: Record<string, unknown>): Promise<ToolResult> {
    // Submissions are jobs of type "Submission" in the Job API.
    // GET /job/v1/jobs with filter=jobType:eq:Submission per Guidewire Cloud API docs.
    const params = this.buildPageParams(args);
    const filters: string[] = ['jobType:eq:Submission'];
    if (args.account_id) params['accountId'] = args.account_id as string;
    if (args.status) filters.push(`status:eq:${args.status as string}`);
    if (args.product_code) params['productCode'] = args.product_code as string;
    params['filter'] = filters.join(',');
    return this.gwGet('/job/v1/jobs', params);
  }

  private async getSubmission(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.submission_id) return { content: [{ type: 'text', text: 'submission_id is required' }], isError: true };
    // Submissions are jobs — retrieve via /job/v1/jobs/{jobId}
    return this.gwGet(`/job/v1/jobs/${encodeURIComponent(args.submission_id as string)}`);
  }

  private async createSubmission(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.account_id || !args.product_code || !args.effective_date) {
      return { content: [{ type: 'text', text: 'account_id, product_code, and effective_date are required' }], isError: true };
    }

    // Guidewire Cloud API schema: POST /job/v1/submissions with nested data.attributes.
    // Required: account.id, product.id, jobEffectiveDate, baseState.code, producerCode.id.
    // base_state and producer_code are optional here but may be required by Guidewire at runtime.
    const attributes: Record<string, unknown> = {
      account: { id: args.account_id },
      product: { id: args.product_code },
      jobEffectiveDate: args.effective_date,
    };
    if (args.base_state) attributes['baseState'] = { code: args.base_state };
    if (args.producer_code) attributes['producerCode'] = { id: args.producer_code };
    if (args.expiration_date) attributes['jobExpirationDate'] = args.expiration_date;

    return this.gwPost('/job/v1/submissions', { data: { attributes } });
  }

  private async listRenewals(args: Record<string, unknown>): Promise<ToolResult> {
    // Renewals are jobs of type "Renewal" in the Job API.
    // GET /job/v1/jobs with filter=jobType:eq:Renewal per Guidewire Cloud API docs.
    const params = this.buildPageParams(args);
    const filters: string[] = ['jobType:eq:Renewal'];
    if (args.account_id) params['accountId'] = args.account_id as string;
    if (args.status) filters.push(`status:eq:${args.status as string}`);
    if (args.expiration_date_min) filters.push(`jobExpirationDate:gte:${args.expiration_date_min as string}`);
    if (args.expiration_date_max) filters.push(`jobExpirationDate:lte:${args.expiration_date_max as string}`);
    params['filter'] = filters.join(',');
    return this.gwGet('/job/v1/jobs', params);
  }

  private async getPolicyDocuments(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.policy_id) return { content: [{ type: 'text', text: 'policy_id is required' }], isError: true };
    return this.gwGet(`/policy/v1/policies/${encodeURIComponent(args.policy_id as string)}/documents`);
  }

  private async listActivities(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.buildPageParams(args);
    if (args.assigned_user) params['assignedUser'] = args.assigned_user as string;
    if (args.status) params['status'] = args.status as string;
    if (args.priority) params['priority'] = args.priority as string;
    return this.gwGet('/common/v1/activities', params);
  }

  private async getActivity(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.activity_id) return { content: [{ type: 'text', text: 'activity_id is required' }], isError: true };
    return this.gwGet(`/common/v1/activities/${encodeURIComponent(args.activity_id as string)}`);
  }
}

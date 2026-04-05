/**
 * KnowBe4 MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28 — KnowBe4 has not published an official MCP server.
// Third-party MCP exists: https://github.com/mirage-security/knowbe4-mcp-server (Mirage Security, NOT KnowBe4) —
//   transport: stdio, auth: API token. Released Oct 8, 2025 (v1.0.0 only). Fails criteria #1 (not vendor-published).
//   Decision: use-rest-api.
// Our adapter covers: 14 tools. API has 24 endpoints. Missing endpoints added below (see ADDED tools).
//
// Base URL: https://us.api.knowbe4.com/v1 (region-specific: us, eu, ca, de, uk)
// Auth: Bearer token — API key from Account Settings > API > Reporting API
// Docs: https://developer.knowbe4.com/rest/reporting/
// Rate limits: 2000 req/day (+ 1 per licensed user), 4 req/sec max, ~50 req/min

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface KnowBe4Config {
  apiToken: string;
  region?: string; // us (default), eu, ca, de, uk
  baseUrl?: string;
}

export class KnowBe4MCPServer extends MCPAdapterBase {
  private readonly apiToken: string;
  private readonly baseUrl: string;

  constructor(config: KnowBe4Config) {
    super();
    this.apiToken = config.apiToken;
    const region = config.region || 'us';
    this.baseUrl = config.baseUrl || `https://${region}.api.knowbe4.com/v1`;
  }

  static catalog() {
    return {
      name: 'knowbe4',
      displayName: 'KnowBe4',
      version: '1.0.0',
      category: 'cybersecurity',
      keywords: [
        'knowbe4', 'security awareness', 'phishing', 'phishing simulation', 'training',
        'security training', 'risk score', 'phish-prone', 'campaign', 'user risk',
        'groups', 'compliance training', 'KSAT',
      ],
      toolNames: [
        'get_account_info', 'get_account_risk_score_history',
        'list_users', 'get_user', 'get_user_risk_score',
        'list_groups', 'get_group', 'get_group_risk_score_history', 'list_group_members',
        'list_phishing_campaigns', 'get_phishing_campaign', 'list_phishing_security_tests',
        'list_all_phishing_security_tests', 'get_phishing_security_test',
        'get_phishing_campaign_results', 'get_phishing_recipient',
        'list_training_campaigns', 'get_training_campaign',
        'list_training_enrollments', 'get_training_enrollment',
        'list_training_purchases', 'get_training_purchase',
        'list_training_policies', 'get_training_policy',
      ],
      description: 'KnowBe4 security awareness: query phishing campaigns, training enrollments, user risk scores, phish-prone percentages, and group data.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'get_account_info',
        description: 'Retrieve KnowBe4 account information including subscription, licensed users, and account settings',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'list_users',
        description: 'List all users in the KnowBe4 account with optional status and group filters and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              description: 'Filter by status: active, archived (default: active)',
            },
            group_id: {
              type: 'number',
              description: 'Filter users belonging to a specific group ID',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            per_page: {
              type: 'number',
              description: 'Results per page (max 500, default: 500)',
            },
          },
        },
      },
      {
        name: 'get_user',
        description: 'Get detailed profile and risk information for a specific KnowBe4 user by user ID',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: {
              type: 'number',
              description: 'KnowBe4 user ID',
            },
          },
          required: ['user_id'],
        },
      },
      {
        name: 'get_user_risk_score',
        description: 'Get the current risk score and phish-prone percentage history for a specific user',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: {
              type: 'number',
              description: 'KnowBe4 user ID',
            },
          },
          required: ['user_id'],
        },
      },
      {
        name: 'list_groups',
        description: 'List all user groups in the KnowBe4 account with optional type filter',
        inputSchema: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              description: 'Filter by group type: console_group, smart_group (default: returns all)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            per_page: {
              type: 'number',
              description: 'Results per page (max 500, default: 500)',
            },
          },
        },
      },
      {
        name: 'get_group',
        description: 'Get details for a specific KnowBe4 user group by group ID',
        inputSchema: {
          type: 'object',
          properties: {
            group_id: {
              type: 'number',
              description: 'KnowBe4 group ID',
            },
          },
          required: ['group_id'],
        },
      },
      {
        name: 'list_group_members',
        description: 'List all members of a specific KnowBe4 group with pagination support',
        inputSchema: {
          type: 'object',
          properties: {
            group_id: {
              type: 'number',
              description: 'KnowBe4 group ID',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            per_page: {
              type: 'number',
              description: 'Results per page (max 500, default: 500)',
            },
          },
          required: ['group_id'],
        },
      },
      {
        name: 'list_phishing_campaigns',
        description: 'List all phishing campaigns with optional status filter and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              description: 'Filter by campaign status: active, closed (default: returns all)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            per_page: {
              type: 'number',
              description: 'Results per page (max 500, default: 500)',
            },
          },
        },
      },
      {
        name: 'get_phishing_campaign',
        description: 'Get detailed information about a specific phishing campaign by campaign ID',
        inputSchema: {
          type: 'object',
          properties: {
            campaign_id: {
              type: 'number',
              description: 'KnowBe4 phishing campaign ID',
            },
          },
          required: ['campaign_id'],
        },
      },
      {
        name: 'list_phishing_security_tests',
        description: 'List phishing security tests (PSTs) within a campaign including click rates and delivery stats',
        inputSchema: {
          type: 'object',
          properties: {
            campaign_id: {
              type: 'number',
              description: 'Phishing campaign ID to retrieve tests for',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            per_page: {
              type: 'number',
              description: 'Results per page (max 500, default: 500)',
            },
          },
          required: ['campaign_id'],
        },
      },
      {
        name: 'get_phishing_campaign_results',
        description: 'Get recipient-level results for a phishing security test including who clicked, opened, or reported the email',
        inputSchema: {
          type: 'object',
          properties: {
            campaign_id: {
              type: 'number',
              description: 'Phishing campaign ID',
            },
            pst_id: {
              type: 'number',
              description: 'Phishing security test (PST) ID within the campaign',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            per_page: {
              type: 'number',
              description: 'Results per page (max 500, default: 500)',
            },
          },
          required: ['campaign_id', 'pst_id'],
        },
      },
      {
        name: 'list_training_campaigns',
        description: 'List all training campaigns with optional status filter showing completion rates and enrollment counts',
        inputSchema: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              description: 'Filter by campaign status: active, closed (default: returns all)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            per_page: {
              type: 'number',
              description: 'Results per page (max 500, default: 500)',
            },
          },
        },
      },
      {
        name: 'get_training_campaign',
        description: 'Get detailed information about a specific training campaign by campaign ID',
        inputSchema: {
          type: 'object',
          properties: {
            campaign_id: {
              type: 'number',
              description: 'KnowBe4 training campaign ID',
            },
          },
          required: ['campaign_id'],
        },
      },
      {
        name: 'list_training_enrollments',
        description: 'List training enrollments for a campaign showing user completion status, scores, and time spent',
        inputSchema: {
          type: 'object',
          properties: {
            campaign_id: {
              type: 'number',
              description: 'Training campaign ID to retrieve enrollments for',
            },
            status: {
              type: 'string',
              description: 'Filter by enrollment status: in_progress, passed, failed, not_started (default: returns all)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            per_page: {
              type: 'number',
              description: 'Results per page (max 500, default: 500)',
            },
          },
          required: ['campaign_id'],
        },
      },
      {
        name: 'get_account_risk_score_history',
        description: 'Get account-level risk score history showing phish-prone percentage trends over time, optionally full history',
        inputSchema: {
          type: 'object',
          properties: {
            full: {
              type: 'boolean',
              description: 'Include entire risk score history (default: false returns last 6 months)',
            },
          },
        },
      },
      {
        name: 'get_group_risk_score_history',
        description: 'Get risk score history for a specific KnowBe4 group showing phish-prone percentage over time',
        inputSchema: {
          type: 'object',
          properties: {
            group_id: {
              type: 'number',
              description: 'KnowBe4 group ID',
            },
            full: {
              type: 'boolean',
              description: 'Include entire risk score history (default: false returns last 6 months)',
            },
          },
          required: ['group_id'],
        },
      },
      {
        name: 'list_all_phishing_security_tests',
        description: 'List all phishing security tests (PSTs) across the entire account with optional campaign type filter',
        inputSchema: {
          type: 'object',
          properties: {
            campaign_type: {
              type: 'string',
              description: 'Filter by campaign type: callback (default: returns all types)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            per_page: {
              type: 'number',
              description: 'Results per page (max 500, default: 500)',
            },
          },
        },
      },
      {
        name: 'get_phishing_security_test',
        description: 'Get details for a specific phishing security test (PST) by PST ID including click rates and delivery stats',
        inputSchema: {
          type: 'object',
          properties: {
            pst_id: {
              type: 'number',
              description: 'Phishing security test (PST) ID',
            },
          },
          required: ['pst_id'],
        },
      },
      {
        name: 'get_phishing_recipient',
        description: 'Get result details for a specific recipient in a phishing security test showing click, open, and report actions',
        inputSchema: {
          type: 'object',
          properties: {
            pst_id: {
              type: 'number',
              description: 'Phishing security test (PST) ID',
            },
            recipient_id: {
              type: 'number',
              description: 'Recipient ID within the phishing security test',
            },
          },
          required: ['pst_id', 'recipient_id'],
        },
      },
      {
        name: 'get_training_enrollment',
        description: 'Get details for a specific training enrollment by enrollment ID including completion status and score',
        inputSchema: {
          type: 'object',
          properties: {
            enrollment_id: {
              type: 'number',
              description: 'Training enrollment ID',
            },
          },
          required: ['enrollment_id'],
        },
      },
      {
        name: 'list_training_purchases',
        description: 'List all store purchases (training content licenses) in the KnowBe4 account with module details',
        inputSchema: {
          type: 'object',
          properties: {
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            per_page: {
              type: 'number',
              description: 'Results per page (max 500, default: 500)',
            },
          },
        },
      },
      {
        name: 'get_training_purchase',
        description: 'Get details for a specific store purchase (training module license) by purchase ID',
        inputSchema: {
          type: 'object',
          properties: {
            store_purchase_id: {
              type: 'number',
              description: 'Store purchase ID from list_training_purchases',
            },
          },
          required: ['store_purchase_id'],
        },
      },
      {
        name: 'list_training_policies',
        description: 'List all training policies in the KnowBe4 account with policy names and associated training content',
        inputSchema: {
          type: 'object',
          properties: {
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            per_page: {
              type: 'number',
              description: 'Results per page (max 500, default: 500)',
            },
          },
        },
      },
      {
        name: 'get_training_policy',
        description: 'Get details for a specific training policy by policy ID including associated content and settings',
        inputSchema: {
          type: 'object',
          properties: {
            policy_id: {
              type: 'number',
              description: 'Policy ID from list_training_policies',
            },
          },
          required: ['policy_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'get_account_info':
          return this.getAccountInfo();
        case 'list_users':
          return this.listUsers(args);
        case 'get_user':
          return this.getUser(args);
        case 'get_user_risk_score':
          return this.getUserRiskScore(args);
        case 'list_groups':
          return this.listGroups(args);
        case 'get_group':
          return this.getGroup(args);
        case 'list_group_members':
          return this.listGroupMembers(args);
        case 'list_phishing_campaigns':
          return this.listPhishingCampaigns(args);
        case 'get_phishing_campaign':
          return this.getPhishingCampaign(args);
        case 'list_phishing_security_tests':
          return this.listPhishingSecurityTests(args);
        case 'get_phishing_campaign_results':
          return this.getPhishingCampaignResults(args);
        case 'list_training_campaigns':
          return this.listTrainingCampaigns(args);
        case 'get_training_campaign':
          return this.getTrainingCampaign(args);
        case 'list_training_enrollments':
          return this.listTrainingEnrollments(args);
        case 'get_account_risk_score_history':
          return this.getAccountRiskScoreHistory(args);
        case 'get_group_risk_score_history':
          return this.getGroupRiskScoreHistory(args);
        case 'list_all_phishing_security_tests':
          return this.listAllPhishingSecurityTests(args);
        case 'get_phishing_security_test':
          return this.getPhishingSecurityTest(args);
        case 'get_phishing_recipient':
          return this.getPhishingRecipient(args);
        case 'get_training_enrollment':
          return this.getTrainingEnrollment(args);
        case 'list_training_purchases':
          return this.listTrainingPurchases(args);
        case 'get_training_purchase':
          return this.getTrainingPurchase(args);
        case 'list_training_policies':
          return this.listTrainingPolicies(args);
        case 'get_training_policy':
          return this.getTrainingPolicy(args);
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

  private get headers(): Record<string, string> {
    return {
      'Authorization': `Bearer ${this.apiToken}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
  }

  private async get(path: string, params: Record<string, string> = {}): Promise<ToolResult> {
    const qs = new URLSearchParams(params).toString();
    const url = `${this.baseUrl}${path}${qs ? '?' + qs : ''}`;
    const response = await this.fetchWithRetry(url, { method: 'GET', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getAccountInfo(): Promise<ToolResult> {
    return this.get('/account');
  }

  private async listUsers(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      page: String((args.page as number) || 1),
      per_page: String((args.per_page as number) || 500),
    };
    if (args.status) params.status = args.status as string;
    if (args.group_id) params.group_id = String(args.group_id);
    return this.get('/users', params);
  }

  private async getUser(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.user_id) return { content: [{ type: 'text', text: 'user_id is required' }], isError: true };
    return this.get(`/users/${encodeURIComponent(args.user_id as string)}`);
  }

  private async getUserRiskScore(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.user_id) return { content: [{ type: 'text', text: 'user_id is required' }], isError: true };
    return this.get(`/users/${encodeURIComponent(args.user_id as string)}/risk_score_history`);
  }

  private async listGroups(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      page: String((args.page as number) || 1),
      per_page: String((args.per_page as number) || 500),
    };
    if (args.type) params.type = args.type as string;
    return this.get('/groups', params);
  }

  private async getGroup(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.group_id) return { content: [{ type: 'text', text: 'group_id is required' }], isError: true };
    return this.get(`/groups/${encodeURIComponent(args.group_id as string)}`);
  }

  private async listGroupMembers(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.group_id) return { content: [{ type: 'text', text: 'group_id is required' }], isError: true };
    const params: Record<string, string> = {
      page: String((args.page as number) || 1),
      per_page: String((args.per_page as number) || 500),
    };
    return this.get(`/groups/${encodeURIComponent(args.group_id as string)}/members`, params);
  }

  private async listPhishingCampaigns(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      page: String((args.page as number) || 1),
      per_page: String((args.per_page as number) || 500),
    };
    if (args.status) params.status = args.status as string;
    return this.get('/phishing/campaigns', params);
  }

  private async getPhishingCampaign(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.campaign_id) return { content: [{ type: 'text', text: 'campaign_id is required' }], isError: true };
    return this.get(`/phishing/campaigns/${encodeURIComponent(args.campaign_id as string)}`);
  }

  private async listPhishingSecurityTests(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.campaign_id) return { content: [{ type: 'text', text: 'campaign_id is required' }], isError: true };
    const params: Record<string, string> = {
      page: String((args.page as number) || 1),
      per_page: String((args.per_page as number) || 500),
    };
    return this.get(`/phishing/campaigns/${encodeURIComponent(args.campaign_id as string)}/security_tests`, params);
  }

  private async getPhishingCampaignResults(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.campaign_id || !args.pst_id) {
      return { content: [{ type: 'text', text: 'campaign_id and pst_id are required' }], isError: true };
    }
    const params: Record<string, string> = {
      page: String((args.page as number) || 1),
      per_page: String((args.per_page as number) || 500),
    };
    return this.get(`/phishing/campaigns/${encodeURIComponent(args.campaign_id as string)}/security_tests/${encodeURIComponent(args.pst_id as string)}/recipients`, params);
  }

  private async listTrainingCampaigns(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      page: String((args.page as number) || 1),
      per_page: String((args.per_page as number) || 500),
    };
    if (args.status) params.status = args.status as string;
    return this.get('/training/campaigns', params);
  }

  private async getTrainingCampaign(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.campaign_id) return { content: [{ type: 'text', text: 'campaign_id is required' }], isError: true };
    return this.get(`/training/campaigns/${encodeURIComponent(args.campaign_id as string)}`);
  }

  private async listTrainingEnrollments(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.campaign_id) return { content: [{ type: 'text', text: 'campaign_id is required' }], isError: true };
    const params: Record<string, string> = {
      page: String((args.page as number) || 1),
      per_page: String((args.per_page as number) || 500),
    };
    if (args.status) params.status = args.status as string;
    return this.get(`/training/campaigns/${encodeURIComponent(args.campaign_id as string)}/enrollments`, params);
  }

  private async getAccountRiskScoreHistory(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (args.full) params.full = 'true';
    return this.get('/account/risk_score_history', params);
  }

  private async getGroupRiskScoreHistory(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.group_id) return { content: [{ type: 'text', text: 'group_id is required' }], isError: true };
    const params: Record<string, string> = {};
    if (args.full) params.full = 'true';
    return this.get(`/groups/${encodeURIComponent(args.group_id as string)}/risk_score_history`, params);
  }

  private async listAllPhishingSecurityTests(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      page: String((args.page as number) || 1),
      per_page: String((args.per_page as number) || 500),
    };
    if (args.campaign_type) params.campaign_type = args.campaign_type as string;
    return this.get('/phishing/security_tests', params);
  }

  private async getPhishingSecurityTest(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.pst_id) return { content: [{ type: 'text', text: 'pst_id is required' }], isError: true };
    return this.get(`/phishing/security_tests/${encodeURIComponent(args.pst_id as string)}`);
  }

  private async getPhishingRecipient(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.pst_id || !args.recipient_id) {
      return { content: [{ type: 'text', text: 'pst_id and recipient_id are required' }], isError: true };
    }
    return this.get(`/phishing/security_tests/${encodeURIComponent(args.pst_id as string)}/recipients/${encodeURIComponent(args.recipient_id as string)}`);
  }

  private async getTrainingEnrollment(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.enrollment_id) return { content: [{ type: 'text', text: 'enrollment_id is required' }], isError: true };
    return this.get(`/training/enrollments/${encodeURIComponent(args.enrollment_id as string)}`);
  }

  private async listTrainingPurchases(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      page: String((args.page as number) || 1),
      per_page: String((args.per_page as number) || 500),
    };
    return this.get('/training/purchases', params);
  }

  private async getTrainingPurchase(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.store_purchase_id) return { content: [{ type: 'text', text: 'store_purchase_id is required' }], isError: true };
    return this.get(`/training/purchases/${encodeURIComponent(args.store_purchase_id as string)}`);
  }

  private async listTrainingPolicies(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      page: String((args.page as number) || 1),
      per_page: String((args.per_page as number) || 500),
    };
    return this.get('/training/policies', params);
  }

  private async getTrainingPolicy(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.policy_id) return { content: [{ type: 'text', text: 'policy_id is required' }], isError: true };
    return this.get(`/training/policies/${encodeURIComponent(args.policy_id as string)}`);
  }
}

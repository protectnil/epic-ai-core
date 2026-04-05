/**
 * Prisma Cloud MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28.
//   No official Palo Alto Networks / Prisma Cloud CSPM MCP server was found on GitHub or pan.dev.
//   NOTE: Prisma AIRS MCP Server (https://docs.paloaltonetworks.com/ai-runtime-security) is a DIFFERENT product
//   (AI Runtime Security for AI agent security scanning) — it does NOT cover CSPM cloud posture management.
//   Third-party community CSPM servers exist but are not officially maintained.
//
// Base URL: https://api.prismacloud.io (varies by tenant region — see pan.dev/prisma-cloud/api/cspm/api-urls)
// Auth: JWT token obtained by POST /login with username/password credentials (legacy auth).
//   Darwin release: use access key ID + secret key instead of username/password (see pan.dev Getting Started).
//   Token is passed as x-redlock-auth header. Tokens expire after ~10 minutes; refresh on 401.
// Docs: https://pan.dev/prisma-cloud/api/cspm/
// Rate limits: Not formally documented; recommended to implement exponential backoff on 429 responses

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface PrismaCloudConfig {
  username: string;
  password: string;
  baseUrl?: string;
}

export class PrismaCloudMCPServer extends MCPAdapterBase {
  private readonly baseUrl: string;
  private readonly username: string;
  private readonly password: string;
  private authToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(config: PrismaCloudConfig) {
    super();
    this.baseUrl = (config.baseUrl ?? 'https://api.prismacloud.io').replace(/\/$/, '');
    this.username = config.username;
    this.password = config.password;
  }

  static catalog() {
    return {
      name: 'prisma-cloud',
      displayName: 'Prisma Cloud',
      version: '1.0.0',
      category: 'cybersecurity' as const,
      keywords: ['prisma', 'prisma-cloud', 'cspm', 'palo-alto', 'cloud-security', 'alert', 'policy', 'compliance', 'vulnerability', 'posture', 'misconfiguration', 'cloud-account', 'inventory'],
      toolNames: [
        'list_alerts', 'get_alert', 'dismiss_alerts', 'reopen_alerts',
        'list_policies', 'get_policy',
        'get_compliance_posture', 'list_compliance_standards',
        'list_cloud_accounts', 'get_cloud_account',
        'list_resources', 'search_assets',
        'list_integrations',
        'get_audit_logs',
      ],
      description: 'Cloud security posture management: query alerts, policies, compliance posture, cloud accounts, and asset inventory in Prisma Cloud CSPM.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_alerts',
        description: 'List Prisma Cloud security alerts with optional filters for severity, status, time range, and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of alerts to return (default: 50, max: 10000)',
            },
            offset: {
              type: 'number',
              description: 'Pagination offset (default: 0)',
            },
            severity: {
              type: 'string',
              description: 'Filter by severity: critical, high, medium, low, informational',
            },
            status: {
              type: 'string',
              description: 'Filter by alert status: open, resolved, dismissed, snoozed',
            },
            timeAmount: {
              type: 'number',
              description: 'Time range amount combined with timeUnit (e.g. 7 for last 7 days)',
            },
            timeUnit: {
              type: 'string',
              description: 'Time range unit: minute, hour, day, week, month, year (default: day)',
            },
            policyName: {
              type: 'string',
              description: 'Filter alerts by policy name substring (optional)',
            },
          },
        },
      },
      {
        name: 'get_alert',
        description: 'Get full details for a specific Prisma Cloud alert including resource context and policy information',
        inputSchema: {
          type: 'object',
          properties: {
            alertId: {
              type: 'string',
              description: 'The Prisma Cloud alert ID',
            },
          },
          required: ['alertId'],
        },
      },
      {
        name: 'dismiss_alerts',
        description: 'Dismiss one or more Prisma Cloud alerts with a reason. Specify a time range to snooze instead of permanently dismiss.',
        inputSchema: {
          type: 'object',
          properties: {
            alertIds: {
              type: 'array',
              description: 'Array of alert IDs to dismiss',
              items: { type: 'string' },
            },
            reason: {
              type: 'string',
              description: "Dismissal reason: RESOURCE_DELETED, RESOURCE_OPERATION, NOT_APPLICABLE, OTHER",
            },
            comment: {
              type: 'string',
              description: 'Optional comment explaining the dismissal',
            },
            snoozeTime: {
              type: 'number',
              description: 'Snooze duration in milliseconds. When set, alerts are snoozed rather than permanently dismissed.',
            },
          },
          required: ['alertIds', 'reason'],
        },
      },
      {
        name: 'reopen_alerts',
        description: 'Reopen previously dismissed or snoozed Prisma Cloud alerts, setting their status back to open',
        inputSchema: {
          type: 'object',
          properties: {
            alertIds: {
              type: 'array',
              description: 'Array of alert IDs to reopen',
              items: { type: 'string' },
            },
          },
          required: ['alertIds'],
        },
      },
      {
        name: 'list_policies',
        description: 'List Prisma Cloud security policies with optional filters for type, severity, and enabled status',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of policies to return (default: 50)',
            },
            policyType: {
              type: 'string',
              description: 'Filter by policy type: config, network, audit_event, anomaly, iam, data',
            },
            severity: {
              type: 'string',
              description: 'Filter by severity: critical, high, medium, low, informational',
            },
            enabled: {
              type: 'boolean',
              description: 'Filter by enabled status (true = enabled policies only)',
            },
            cloudType: {
              type: 'string',
              description: 'Filter by cloud provider: aws, azure, gcp, alibaba_cloud, oci',
            },
          },
        },
      },
      {
        name: 'get_policy',
        description: 'Get full definition and metadata for a specific Prisma Cloud security policy',
        inputSchema: {
          type: 'object',
          properties: {
            policyId: {
              type: 'string',
              description: 'The Prisma Cloud policy ID',
            },
          },
          required: ['policyId'],
        },
      },
      {
        name: 'get_compliance_posture',
        description: 'Get cloud security compliance posture summary for a framework, showing pass/fail counts and percentage',
        inputSchema: {
          type: 'object',
          properties: {
            framework: {
              type: 'string',
              description: 'Compliance framework name filter (e.g. CIS, PCI DSS, HIPAA, SOC 2, ISO 27001, NIST) — optional',
            },
            timeAmount: {
              type: 'number',
              description: 'Time range amount (default: 1)',
            },
            timeUnit: {
              type: 'string',
              description: 'Time range unit: month, week, day (default: month)',
            },
          },
        },
      },
      {
        name: 'list_compliance_standards',
        description: 'List all compliance standards configured in Prisma Cloud including CIS, PCI DSS, HIPAA, and custom frameworks',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'list_cloud_accounts',
        description: 'List all cloud accounts onboarded to Prisma Cloud with their status and configuration details',
        inputSchema: {
          type: 'object',
          properties: {
            cloudType: {
              type: 'string',
              description: 'Filter by cloud provider: aws, azure, gcp, alibaba, oci (optional)',
            },
            accountStatus: {
              type: 'string',
              description: 'Filter by account status: active, inactive (optional)',
            },
          },
        },
      },
      {
        name: 'get_cloud_account',
        description: 'Get details and configuration for a specific cloud account onboarded to Prisma Cloud',
        inputSchema: {
          type: 'object',
          properties: {
            accountId: {
              type: 'string',
              description: 'The cloud account ID in Prisma Cloud',
            },
            cloudType: {
              type: 'string',
              description: 'Cloud provider type: aws, azure, gcp, alibaba, oci',
            },
          },
          required: ['accountId', 'cloudType'],
        },
      },
      {
        name: 'list_resources',
        description: 'List cloud resources in the Prisma Cloud asset inventory with optional filters for type and cloud provider',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of resources to return (default: 50)',
            },
            cloudType: {
              type: 'string',
              description: 'Filter by cloud provider: aws, azure, gcp, alibaba, oci',
            },
            resourceType: {
              type: 'string',
              description: 'Filter by resource type (e.g. aws_s3_bucket, azurerm_virtual_machine)',
            },
            accountId: {
              type: 'string',
              description: 'Filter resources belonging to a specific cloud account ID',
            },
          },
        },
      },
      {
        name: 'search_assets',
        description: 'Search for cloud assets using a RQL (Resource Query Language) config query to find misconfigurations',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: "RQL config query (e.g. \"config from cloud.resource where cloud.type = 'aws' AND api.name = 'aws-s3api-get-bucket-acl'\")",
            },
            timeAmount: {
              type: 'number',
              description: 'Time range amount (default: 1)',
            },
            timeUnit: {
              type: 'string',
              description: 'Time unit: month, week, day, hour (default: month)',
            },
            limit: {
              type: 'number',
              description: 'Maximum results to return (default: 100)',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'list_integrations',
        description: 'List third-party integrations configured in Prisma Cloud (Jira, Splunk, PagerDuty, Slack, etc.)',
        inputSchema: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              description: 'Filter by integration type: JIRA, SLACK, PAGERDUTY, SPLUNK, WEBHOOK, EMAIL (optional)',
            },
          },
        },
      },
      {
        name: 'get_audit_logs',
        description: 'Retrieve Prisma Cloud audit logs for user actions, policy changes, and system events',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of audit log entries to return (default: 50)',
            },
            timeAmount: {
              type: 'number',
              description: 'Time range amount (default: 1)',
            },
            timeUnit: {
              type: 'string',
              description: 'Time range unit: day, week, month (default: day)',
            },
            action: {
              type: 'string',
              description: 'Filter by audit action type (optional)',
            },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_alerts':
          return await this.listAlerts(args);
        case 'get_alert':
          return await this.getAlert(args);
        case 'dismiss_alerts':
          return await this.dismissAlerts(args);
        case 'reopen_alerts':
          return await this.reopenAlerts(args);
        case 'list_policies':
          return await this.listPolicies(args);
        case 'get_policy':
          return await this.getPolicy(args);
        case 'get_compliance_posture':
          return await this.getCompliancePosture(args);
        case 'list_compliance_standards':
          return await this.listComplianceStandards();
        case 'list_cloud_accounts':
          return await this.listCloudAccounts(args);
        case 'get_cloud_account':
          return await this.getCloudAccount(args);
        case 'list_resources':
          return await this.listResources(args);
        case 'search_assets':
          return await this.searchAssets(args);
        case 'list_integrations':
          return await this.listIntegrations(args);
        case 'get_audit_logs':
          return await this.getAuditLogs(args);
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

  private async getOrRefreshToken(): Promise<string> {
    const now = Date.now();
    if (this.authToken && this.tokenExpiry > now) {
      return this.authToken;
    }
    const response = await this.fetchWithRetry(`${this.baseUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: this.username, password: this.password }),
    });
    if (!response.ok) {
      throw new Error(`Prisma Cloud login failed: ${response.status} ${response.statusText}`);
    }
    let data: { token?: string; message?: string };
    try {
      data = await response.json() as { token?: string; message?: string };
    } catch {
      throw new Error('Prisma Cloud login returned invalid JSON');
    }
    if (!data.token) {
      throw new Error(`No token in Prisma Cloud login response${data.message ? `: ${data.message}` : ''}`);
    }
    this.authToken = data.token;
    // Tokens typically expire in 10 minutes; refresh 60s early
    this.tokenExpiry = now + (600 - 60) * 1000;
    return this.authToken;
  }

  private async authHeaders(): Promise<Record<string, string>> {
    const token = await this.getOrRefreshToken();
    return { 'x-redlock-auth': token, 'Content-Type': 'application/json' };
  }

  private async doFetch(url: string, options?: RequestInit): Promise<ToolResult> {
    const headers = await this.authHeaders();
    const response = await this.fetchWithRetry(url, { headers, ...options });
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      return {
        content: [{ type: 'text', text: `Prisma Cloud API error: ${response.status} ${response.statusText}${body ? ` — ${body.slice(0, 500)}` : ''}` }],
        isError: true,
      };
    }
    if (response.status === 204) {
      return { content: [{ type: 'text', text: 'Operation completed successfully (HTTP 204)' }], isError: false };
    }
    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new Error(`Prisma Cloud returned non-JSON response (HTTP ${response.status})`);
    }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private timeRange(args: Record<string, unknown>, defaultUnit = 'day', defaultAmount = 7): Record<string, unknown> {
    return {
      type: 'relative',
      value: {
        unit: (args.timeUnit as string) ?? defaultUnit,
        amount: (args.timeAmount as number) ?? defaultAmount,
      },
    };
  }

  private async listAlerts(args: Record<string, unknown>): Promise<ToolResult> {
    const limit = (args.limit as number) ?? 50;
    const offset = (args.offset as number) ?? 0;
    const filters: Array<{ name: string; operator: string; value: string }> = [];
    if (args.severity) filters.push({ name: 'alert.severity', operator: '=', value: args.severity as string });
    if (args.status) filters.push({ name: 'alert.status', operator: '=', value: args.status as string });
    if (args.policyName) filters.push({ name: 'policy.name', operator: '=', value: args.policyName as string });
    const body: Record<string, unknown> = {
      limit,
      offset,
      timeRange: this.timeRange(args, 'day', 7),
    };
    if (filters.length) body.filters = filters;
    return this.doFetch(`${this.baseUrl}/v2/alert`, { method: 'POST', body: JSON.stringify(body) });
  }

  private async getAlert(args: Record<string, unknown>): Promise<ToolResult> {
    const alertId = args.alertId as string;
    if (!alertId) return { content: [{ type: 'text', text: 'alertId is required' }], isError: true };
    return this.doFetch(`${this.baseUrl}/alert/${encodeURIComponent(alertId)}`);
  }

  private async dismissAlerts(args: Record<string, unknown>): Promise<ToolResult> {
    const alertIds = args.alertIds as string[];
    const reason = args.reason as string;
    if (!alertIds?.length || !reason) {
      return { content: [{ type: 'text', text: 'alertIds and reason are required' }], isError: true };
    }
    const body: Record<string, unknown> = { alerts: alertIds, dismissalReason: reason };
    if (args.comment) body.comment = args.comment as string;
    if (args.snoozeTime) body.snoozeValue = args.snoozeTime as number;
    return this.doFetch(`${this.baseUrl}/alert/dismiss`, { method: 'POST', body: JSON.stringify(body) });
  }

  private async reopenAlerts(args: Record<string, unknown>): Promise<ToolResult> {
    const alertIds = args.alertIds as string[];
    if (!alertIds?.length) return { content: [{ type: 'text', text: 'alertIds is required' }], isError: true };
    return this.doFetch(`${this.baseUrl}/alert/reopen`, { method: 'POST', body: JSON.stringify({ alerts: alertIds }) });
  }

  private async listPolicies(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.policyType) params.append('policy.type', args.policyType as string);
    if (args.severity) params.append('policy.severity', args.severity as string);
    if (args.cloudType) params.append('cloud.type', args.cloudType as string);
    if (typeof args.enabled === 'boolean') params.append('policy.enabled', String(args.enabled));
    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.doFetch(`${this.baseUrl}/policy${qs}`);
  }

  private async getPolicy(args: Record<string, unknown>): Promise<ToolResult> {
    const policyId = args.policyId as string;
    if (!policyId) return { content: [{ type: 'text', text: 'policyId is required' }], isError: true };
    return this.doFetch(`${this.baseUrl}/policy/${encodeURIComponent(policyId)}`);
  }

  private async getCompliancePosture(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = { timeRange: this.timeRange(args, 'month', 1) };
    if (args.framework) {
      body.filters = [{ name: 'complianceStandard', operator: '=', value: args.framework as string }];
    }
    return this.doFetch(`${this.baseUrl}/compliance/posture`, { method: 'POST', body: JSON.stringify(body) });
  }

  private async listComplianceStandards(): Promise<ToolResult> {
    return this.doFetch(`${this.baseUrl}/compliance`);
  }

  private async listCloudAccounts(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.cloudType) params.append('cloudType', args.cloudType as string);
    if (args.accountStatus) params.append('accountStatus', args.accountStatus as string);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.doFetch(`${this.baseUrl}/cloud${qs}`);
  }

  private async getCloudAccount(args: Record<string, unknown>): Promise<ToolResult> {
    const accountId = args.accountId as string;
    const cloudType = args.cloudType as string;
    if (!accountId || !cloudType) {
      return { content: [{ type: 'text', text: 'accountId and cloudType are required' }], isError: true };
    }
    return this.doFetch(`${this.baseUrl}/cloud/${encodeURIComponent(cloudType)}/${encodeURIComponent(accountId)}`);
  }

  private async listResources(args: Record<string, unknown>): Promise<ToolResult> {
    const limit = (args.limit as number) ?? 50;
    const filters: Array<{ name: string; operator: string; value: string }> = [];
    if (args.cloudType) filters.push({ name: 'cloud.type', operator: '=', value: args.cloudType as string });
    if (args.resourceType) filters.push({ name: 'asset.type', operator: '=', value: args.resourceType as string });
    if (args.accountId) filters.push({ name: 'cloud.accountId', operator: '=', value: args.accountId as string });
    const body: Record<string, unknown> = { limit, filters };
    return this.doFetch(`${this.baseUrl}/v2/inventories`, { method: 'POST', body: JSON.stringify(body) });
  }

  private async searchAssets(args: Record<string, unknown>): Promise<ToolResult> {
    const query = args.query as string;
    if (!query) return { content: [{ type: 'text', text: 'query is required' }], isError: true };
    const body = {
      query,
      timeRange: this.timeRange(args, 'month', 1),
      limit: (args.limit as number) ?? 100,
    };
    return this.doFetch(`${this.baseUrl}/search/config`, { method: 'POST', body: JSON.stringify(body) });
  }

  private async listIntegrations(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.type) params.append('type', args.type as string);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.doFetch(`${this.baseUrl}/integration${qs}`);
  }

  private async getAuditLogs(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.limit) params.append('limit', String(args.limit as number));
    const timeAmount = (args.timeAmount as number) ?? 1;
    const timeUnit = (args.timeUnit as string) ?? 'day';
    params.append('timeType', 'relative');
    params.append('timeAmount', String(timeAmount));
    params.append('timeUnit', timeUnit);
    if (args.action) params.append('action', args.action as string);
    return this.doFetch(`${this.baseUrl}/audit/redlock?${params.toString()}`);
  }
}

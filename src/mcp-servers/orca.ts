/**
 * Orca Security MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://pypi.org/project/orca-mcp-server/ — transport: stdio, auth: API token
//   Published by Orca Security (maintainer: orcasecurity on PyPI). Last release: v1.0.2, May 19, 2025.
//   MCP fails criteria: last publish >6 months ago (10+ months as of 2026-03-28), tool count
//   appears very small (only 'discovery_search' mentioned; package is 4.4 kB). Does NOT meet
//   the 10+ tools threshold. GitHub repo orcasecurity/orca-mcp-server is private.
//   Recommendation: use-rest-api — vendor MCP is unmaintained and under-featured.
// Our adapter covers: 15 tools. Vendor MCP covers: ~1-3 tools (unconfirmed, private repo).
//
// Base URL: https://api.orcasecurity.io (region-specific tenants may differ)
// Auth: Bearer API token — generate in Orca dashboard: Settings > Connections > Integrations > API Tokens
// Docs: https://docs.orcasecurity.io (requires login; API endpoint paths UNVERIFIED against live docs)
// Rate limits: Not publicly documented; Orca Alerts API limited to 1000 alerts per query

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface OrcaConfig {
  apiToken: string;
  /** Override for regional or tenant-specific base URL */
  baseUrl?: string;
}

export class OrcaMCPServer extends MCPAdapterBase {
  private readonly apiToken: string;
  private readonly baseUrl: string;

  constructor(config: OrcaConfig) {
    super();
    this.apiToken = config.apiToken;
    this.baseUrl = (config.baseUrl ?? 'https://api.orcasecurity.io').replace(/\/$/, '');
  }

  static catalog() {
    return {
      name: 'orca',
      displayName: 'Orca Security',
      version: '1.0.0',
      category: 'cybersecurity',
      keywords: ['orca', 'cnapp', 'cspm', 'cloud-security', 'alert', 'asset', 'vulnerability', 'attack-path', 'compliance', 'misconfiguration', 'cve'],
      toolNames: [
        'list_alerts', 'get_alert', 'dismiss_alert', 'reopen_alert',
        'list_assets', 'get_asset',
        'query_assets',
        'list_vulnerabilities', 'get_vulnerability',
        'get_attack_path', 'list_attack_paths',
        'get_compliance_status', 'list_compliance_frameworks',
        'list_alert_rules',
        'get_cloud_account',
      ],
      description: 'Orca Security CNAPP/CSPM: query alerts, assets, vulnerabilities, attack paths, compliance posture, and cloud accounts across AWS, Azure, and GCP.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_alerts',
        description: 'List Orca Security alerts with optional filters for severity, status, type, and cloud provider',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of alerts to return (default: 50, max: 1000)',
            },
            offset: {
              type: 'number',
              description: 'Pagination offset (default: 0)',
            },
            severity: {
              type: 'string',
              description: 'Filter by severity: critical, high, medium, low, info',
            },
            status: {
              type: 'string',
              description: 'Filter by status: open, dismissed, in_progress',
            },
            type: {
              type: 'string',
              description: 'Filter by alert type category, e.g. vulnerability, misconfiguration, malware, iam',
            },
            cloud_provider: {
              type: 'string',
              description: 'Filter by cloud provider: aws, azure, gcp',
            },
            asset_id: {
              type: 'string',
              description: 'Filter alerts by a specific asset ID',
            },
          },
        },
      },
      {
        name: 'get_alert',
        description: 'Get full details of a specific Orca Security alert by its alert ID',
        inputSchema: {
          type: 'object',
          properties: {
            alert_id: {
              type: 'string',
              description: 'Orca Security alert ID to retrieve',
            },
          },
          required: ['alert_id'],
        },
      },
      {
        name: 'dismiss_alert',
        description: 'Dismiss an Orca Security alert with a reason to suppress notifications',
        inputSchema: {
          type: 'object',
          properties: {
            alert_id: {
              type: 'string',
              description: 'Alert ID to dismiss',
            },
            reason: {
              type: 'string',
              description: 'Dismissal reason: acceptable_risk, false_positive, remediated, not_applicable',
            },
            note: {
              type: 'string',
              description: 'Optional explanatory note for the dismissal',
            },
          },
          required: ['alert_id', 'reason'],
        },
      },
      {
        name: 'reopen_alert',
        description: 'Reopen a previously dismissed Orca Security alert',
        inputSchema: {
          type: 'object',
          properties: {
            alert_id: {
              type: 'string',
              description: 'Alert ID to reopen',
            },
            note: {
              type: 'string',
              description: 'Optional note explaining why the alert is being reopened',
            },
          },
          required: ['alert_id'],
        },
      },
      {
        name: 'list_assets',
        description: 'List cloud assets monitored by Orca Security with optional type and cloud provider filters',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of assets to return (default: 50)',
            },
            offset: {
              type: 'number',
              description: 'Pagination offset (default: 0)',
            },
            type: {
              type: 'string',
              description: 'Filter by asset type: virtual_machine, storage, database, serverless, container, load_balancer, network',
            },
            cloud_provider: {
              type: 'string',
              description: 'Filter by cloud provider: aws, azure, gcp',
            },
            account_id: {
              type: 'string',
              description: 'Filter assets by cloud account ID',
            },
          },
        },
      },
      {
        name: 'get_asset',
        description: 'Get full details of a specific Orca Security monitored cloud asset by its asset ID',
        inputSchema: {
          type: 'object',
          properties: {
            asset_id: {
              type: 'string',
              description: 'Orca Security asset ID to retrieve',
            },
          },
          required: ['asset_id'],
        },
      },
      {
        name: 'query_assets',
        description: 'Run an advanced query against Orca Security asset inventory using filter expressions',
        inputSchema: {
          type: 'object',
          properties: {
            filter: {
              type: 'string',
              description: 'Filter expression to match assets, e.g. "type:virtual_machine AND cloud_provider:aws"',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results (default: 50)',
            },
            offset: {
              type: 'number',
              description: 'Pagination offset (default: 0)',
            },
          },
        },
      },
      {
        name: 'list_vulnerabilities',
        description: 'List CVE vulnerabilities detected by Orca across cloud assets with severity and CVE filters',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of vulnerabilities to return (default: 50)',
            },
            offset: {
              type: 'number',
              description: 'Pagination offset (default: 0)',
            },
            severity: {
              type: 'string',
              description: 'Filter by CVE severity: critical, high, medium, low',
            },
            cve_id: {
              type: 'string',
              description: 'Filter by specific CVE identifier, e.g. CVE-2024-12345',
            },
            asset_id: {
              type: 'string',
              description: 'Filter vulnerabilities for a specific asset ID',
            },
          },
        },
      },
      {
        name: 'get_vulnerability',
        description: 'Get details of a specific CVE vulnerability finding including affected assets and remediation steps',
        inputSchema: {
          type: 'object',
          properties: {
            cve_id: {
              type: 'string',
              description: 'CVE identifier to look up, e.g. CVE-2024-12345',
            },
          },
          required: ['cve_id'],
        },
      },
      {
        name: 'get_attack_path',
        description: 'Get Orca Security attack path analysis for a specific cloud asset showing exploitation routes',
        inputSchema: {
          type: 'object',
          properties: {
            asset_id: {
              type: 'string',
              description: 'Asset ID to analyze for attack paths',
            },
          },
          required: ['asset_id'],
        },
      },
      {
        name: 'list_attack_paths',
        description: 'List all detected attack paths in the cloud environment with optional severity filter',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of attack paths to return (default: 50)',
            },
            offset: {
              type: 'number',
              description: 'Pagination offset (default: 0)',
            },
            severity: {
              type: 'string',
              description: 'Filter by attack path risk severity: critical, high, medium, low',
            },
          },
        },
      },
      {
        name: 'get_compliance_status',
        description: 'Get compliance posture and pass/fail scores for a specific security framework in Orca',
        inputSchema: {
          type: 'object',
          properties: {
            framework: {
              type: 'string',
              description: 'Compliance framework identifier: CIS, PCI-DSS, HIPAA, SOC2, NIST, ISO27001, GDPR (default: all)',
            },
            cloud_provider: {
              type: 'string',
              description: 'Filter by cloud provider: aws, azure, gcp (default: all)',
            },
          },
        },
      },
      {
        name: 'list_compliance_frameworks',
        description: 'List all compliance frameworks enabled in the Orca Security account with their overall pass rates',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'list_alert_rules',
        description: 'List Orca Security alert rules (custom detection rules) configured in the account',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of rules to return (default: 50)',
            },
            offset: {
              type: 'number',
              description: 'Pagination offset (default: 0)',
            },
            enabled: {
              type: 'boolean',
              description: 'Filter by enabled status: true for active rules only, false for disabled rules (default: all)',
            },
          },
        },
      },
      {
        name: 'get_cloud_account',
        description: 'Get details and security posture summary of a specific cloud account connected to Orca',
        inputSchema: {
          type: 'object',
          properties: {
            account_id: {
              type: 'string',
              description: 'Cloud account ID (AWS account ID, Azure subscription ID, or GCP project ID)',
            },
          },
          required: ['account_id'],
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
        case 'dismiss_alert':
          return await this.dismissAlert(args);
        case 'reopen_alert':
          return await this.reopenAlert(args);
        case 'list_assets':
          return await this.listAssets(args);
        case 'get_asset':
          return await this.getAsset(args);
        case 'query_assets':
          return await this.queryAssets(args);
        case 'list_vulnerabilities':
          return await this.listVulnerabilities(args);
        case 'get_vulnerability':
          return await this.getVulnerability(args);
        case 'get_attack_path':
          return await this.getAttackPath(args);
        case 'list_attack_paths':
          return await this.listAttackPaths(args);
        case 'get_compliance_status':
          return await this.getComplianceStatus(args);
        case 'list_compliance_frameworks':
          return await this.listComplianceFrameworks();
        case 'list_alert_rules':
          return await this.listAlertRules(args);
        case 'get_cloud_account':
          return await this.getCloudAccount(args);
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

  private getHeaders(): Record<string, string> {
    return {
      'Authorization': `Bearer ${this.apiToken}`,
      'Content-Type': 'application/json',
    };
  }

  private qs(params: URLSearchParams): string {
    const s = params.toString();
    return s ? '?' + s : '';
  }

  private async listAlerts(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    params.set('limit', String(args.limit ?? 50));
    params.set('offset', String(args.offset ?? 0));
    if (args.severity) params.set('severity', String(args.severity));
    if (args.status) params.set('status', String(args.status));
    if (args.type) params.set('type', String(args.type));
    if (args.cloud_provider) params.set('cloud_provider', String(args.cloud_provider));
    if (args.asset_id) params.set('asset_id', String(args.asset_id));

    const response = await this.fetchWithRetry(`${this.baseUrl}/api/alerts${this.qs(params)}`, { headers: this.getHeaders() });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: this.truncate(await response.json()) }], isError: false };
  }

  private async getAlert(args: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/api/alerts/${encodeURIComponent(String(args.alert_id))}`,
      { headers: this.getHeaders() }
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: this.truncate(await response.json()) }], isError: false };
  }

  private async dismissAlert(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = { reason: args.reason };
    if (args.note) body.note = args.note;

    const response = await this.fetchWithRetry(
      `${this.baseUrl}/api/alerts/${encodeURIComponent(String(args.alert_id))}/dismiss`,
      { method: 'POST', headers: this.getHeaders(), body: JSON.stringify(body) }
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: this.truncate(await response.json()) }], isError: false };
  }

  private async reopenAlert(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {};
    if (args.note) body.note = args.note;

    const response = await this.fetchWithRetry(
      `${this.baseUrl}/api/alerts/${encodeURIComponent(String(args.alert_id))}/reopen`,
      { method: 'POST', headers: this.getHeaders(), body: JSON.stringify(body) }
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: this.truncate(await response.json()) }], isError: false };
  }

  private async listAssets(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    params.set('limit', String(args.limit ?? 50));
    params.set('offset', String(args.offset ?? 0));
    if (args.type) params.set('type', String(args.type));
    if (args.cloud_provider) params.set('cloud_provider', String(args.cloud_provider));
    if (args.account_id) params.set('account_id', String(args.account_id));

    const response = await this.fetchWithRetry(`${this.baseUrl}/api/assets${this.qs(params)}`, { headers: this.getHeaders() });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: this.truncate(await response.json()) }], isError: false };
  }

  private async getAsset(args: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/api/assets/${encodeURIComponent(String(args.asset_id))}`,
      { headers: this.getHeaders() }
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: this.truncate(await response.json()) }], isError: false };
  }

  private async queryAssets(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {
      limit: args.limit ?? 50,
      offset: args.offset ?? 0,
    };
    if (args.filter) body.filter = args.filter;

    const response = await this.fetchWithRetry(`${this.baseUrl}/api/query/assets`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: this.truncate(await response.json()) }], isError: false };
  }

  private async listVulnerabilities(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    params.set('limit', String(args.limit ?? 50));
    params.set('offset', String(args.offset ?? 0));
    if (args.severity) params.set('severity', String(args.severity));
    if (args.cve_id) params.set('cve_id', String(args.cve_id));
    if (args.asset_id) params.set('asset_id', String(args.asset_id));

    const response = await this.fetchWithRetry(`${this.baseUrl}/api/vulnerabilities${this.qs(params)}`, { headers: this.getHeaders() });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: this.truncate(await response.json()) }], isError: false };
  }

  private async getVulnerability(args: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/api/vulnerabilities/${encodeURIComponent(String(args.cve_id))}`,
      { headers: this.getHeaders() }
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: this.truncate(await response.json()) }], isError: false };
  }

  private async getAttackPath(args: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/api/assets/${encodeURIComponent(String(args.asset_id))}/attack-path`,
      { headers: this.getHeaders() }
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: this.truncate(await response.json()) }], isError: false };
  }

  private async listAttackPaths(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    params.set('limit', String(args.limit ?? 50));
    params.set('offset', String(args.offset ?? 0));
    if (args.severity) params.set('severity', String(args.severity));

    const response = await this.fetchWithRetry(`${this.baseUrl}/api/attack-paths${this.qs(params)}`, { headers: this.getHeaders() });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: this.truncate(await response.json()) }], isError: false };
  }

  private async getComplianceStatus(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.framework) params.set('framework', String(args.framework));
    if (args.cloud_provider) params.set('cloud_provider', String(args.cloud_provider));

    const response = await this.fetchWithRetry(`${this.baseUrl}/api/compliance${this.qs(params)}`, { headers: this.getHeaders() });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: this.truncate(await response.json()) }], isError: false };
  }

  private async listComplianceFrameworks(): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}/api/compliance/frameworks`, { headers: this.getHeaders() });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: this.truncate(await response.json()) }], isError: false };
  }

  private async listAlertRules(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    params.set('limit', String(args.limit ?? 50));
    params.set('offset', String(args.offset ?? 0));
    if (args.enabled !== undefined) params.set('enabled', String(args.enabled));

    const response = await this.fetchWithRetry(`${this.baseUrl}/api/alert-rules${this.qs(params)}`, { headers: this.getHeaders() });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: this.truncate(await response.json()) }], isError: false };
  }

  private async getCloudAccount(args: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/api/cloud-accounts/${encodeURIComponent(String(args.account_id))}`,
      { headers: this.getHeaders() }
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: this.truncate(await response.json()) }], isError: false };
  }
}

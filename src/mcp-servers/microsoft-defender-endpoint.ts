/**
 * Microsoft Defender for Endpoint MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// No official Microsoft Defender for Endpoint MCP server found on GitHub or in the
// Microsoft MCP catalog (github.com/microsoft/mcp). The microsoft/EnterpriseMCP server
// covers read-only Entra/Graph scenarios only and does not expose Defender for Endpoint APIs.
// Recommendation: Use this adapter for full Defender for Endpoint coverage.
//
// Base URL: https://api.security.microsoft.com
//   Regional variants: us.api.security.microsoft.com, eu.api.security.microsoft.com,
//   uk.api.security.microsoft.com
// Auth: OAuth2 client_credentials via
//   POST https://login.microsoftonline.com/{tenantId}/oauth2/v2.0/token
//   scope = https://api.securitycenter.microsoft.com/.default
// Docs: https://learn.microsoft.com/en-us/defender-endpoint/api/exposed-apis-list
// Rate limits: 100 calls/min, 1,500 calls/hour per application token

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface MicrosoftDefenderEndpointConfig {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  baseUrl?: string;
}

export class MicrosoftDefenderEndpointMCPServer extends MCPAdapterBase {
  private readonly tenantId: string;
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly baseUrl: string;
  private accessToken: string | null = null;
  private tokenExpiresAt: number = 0;

  constructor(config: MicrosoftDefenderEndpointConfig) {
    super();
    this.tenantId = config.tenantId;
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.baseUrl = config.baseUrl || 'https://api.security.microsoft.com';
  }

  static catalog() {
    return {
      name: 'microsoft-defender-endpoint',
      displayName: 'Microsoft Defender for Endpoint',
      version: '1.0.0',
      category: 'cybersecurity' as const,
      keywords: [
        'defender', 'endpoint', 'mde', 'microsoft', 'alerts', 'machines', 'devices',
        'isolation', 'antivirus', 'indicators', 'ioc', 'vulnerabilities', 'recommendations',
        'advanced-hunting', 'kql', 'threat', 'incident', 'investigation',
      ],
      toolNames: [
        'list_alerts', 'get_alert', 'update_alert', 'list_machines', 'get_machine',
        'get_machine_alerts', 'get_machine_software', 'get_machine_vulnerabilities',
        'get_machine_recommendations', 'isolate_machine', 'unisolate_machine',
        'restrict_machine_app_execution', 'unrestrict_machine_app_execution',
        'run_machine_antivirus_scan', 'collect_investigation_package',
        'offboard_machine', 'list_machine_actions', 'get_machine_action',
        'list_indicators', 'create_indicator', 'delete_indicator',
        'list_vulnerabilities', 'get_vulnerability', 'list_recommendations',
        'get_recommendation', 'run_advanced_query',
      ],
      description: 'Manage Microsoft Defender for Endpoint: list and triage alerts, query devices, take response actions (isolate, scan, restrict), manage threat indicators, query vulnerabilities and security recommendations, run KQL advanced hunting.',
      author: 'protectnil',
    };
  }

  private async getToken(): Promise<string> {
    const now = Date.now();
    if (this.accessToken && now < this.tokenExpiresAt - 60_000) {
      return this.accessToken;
    }

    const tokenUrl = `https://login.microsoftonline.com/${encodeURIComponent(this.tenantId)}/oauth2/v2.0/token`;
    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: this.clientId,
      client_secret: this.clientSecret,
      scope: 'https://api.securitycenter.microsoft.com/.default',
    });

    const response = await this.fetchWithRetry(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      throw new Error(`Token request failed: ${response.status} ${errText}`);
    }

    const tokenData = await response.json() as { access_token: string; expires_in: number };
    this.accessToken = tokenData.access_token;
    this.tokenExpiresAt = now + tokenData.expires_in * 1000;
    return this.accessToken;
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_alerts',
        description: 'List Defender for Endpoint alerts with optional OData filters for severity, status, category, detectionSource, and date range. Supports $top, $skip, and $expand=evidence.',
        inputSchema: {
          type: 'object',
          properties: {
            filter: {
              type: 'string',
              description: 'OData $filter expression (e.g. "severity eq \'High\' and status eq \'New\'")',
            },
            top: {
              type: 'number',
              description: 'Maximum number of results to return (max: 10000, default: 100)',
            },
            skip: {
              type: 'number',
              description: 'Number of records to skip for pagination (default: 0)',
            },
            expand: {
              type: 'string',
              description: 'OData $expand value — use "evidence" to include related evidence objects',
            },
          },
        },
      },
      {
        name: 'get_alert',
        description: 'Get a single Defender for Endpoint alert by its alert ID.',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Alert ID (e.g. da637308392288907382_-880718168)',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'update_alert',
        description: 'Update an alert status, determination, classification, or assigned investigator in Defender for Endpoint.',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Alert ID to update',
            },
            status: {
              type: 'string',
              description: 'New status: New, InProgress, or Resolved',
            },
            assignedTo: {
              type: 'string',
              description: 'Email of the analyst to assign the alert to',
            },
            classification: {
              type: 'string',
              description: 'Alert classification: Unknown, FalsePositive, TruePositive',
            },
            determination: {
              type: 'string',
              description: 'Alert determination: NotAvailable, Apt, Malware, SecurityPersonnel, SecurityTesting, UnwantedSoftware, Other',
            },
            comment: {
              type: 'string',
              description: 'Comment to add to the alert',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'list_machines',
        description: 'List onboarded devices in Defender for Endpoint with optional OData filters for healthStatus, osPlatform, riskScore, and exposureLevel.',
        inputSchema: {
          type: 'object',
          properties: {
            filter: {
              type: 'string',
              description: 'OData $filter expression (e.g. "healthStatus eq \'Active\' and riskScore eq \'High\'")',
            },
            top: {
              type: 'number',
              description: 'Maximum number of results to return (max: 10000, default: 100)',
            },
            skip: {
              type: 'number',
              description: 'Number of records to skip for pagination (default: 0)',
            },
          },
        },
      },
      {
        name: 'get_machine',
        description: 'Get a single Defender for Endpoint device by its machine ID.',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Machine ID (40-character hex string)',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'get_machine_alerts',
        description: 'Retrieve all alerts associated with a specific device in Defender for Endpoint.',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Machine ID (40-character hex string)',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'get_machine_software',
        description: 'Retrieve the software inventory installed on a specific device in Defender for Endpoint.',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Machine ID (40-character hex string)',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'get_machine_vulnerabilities',
        description: 'Retrieve discovered vulnerabilities (CVEs) on a specific device in Defender for Endpoint.',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Machine ID (40-character hex string)',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'get_machine_recommendations',
        description: 'Retrieve security recommendations for a specific device in Defender for Endpoint.',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Machine ID (40-character hex string)',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'isolate_machine',
        description: 'Isolate a device from the network in Defender for Endpoint. Requires Machine.Isolate permission. Use unisolate_machine to reverse.',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Machine ID (40-character hex string)',
            },
            comment: {
              type: 'string',
              description: 'Reason comment required by the API',
            },
            isolationType: {
              type: 'string',
              description: 'Isolation type: Full or Selective (default: Full)',
            },
          },
          required: ['id', 'comment'],
        },
      },
      {
        name: 'unisolate_machine',
        description: 'Remove a device from network isolation in Defender for Endpoint. Requires Machine.Isolate permission.',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Machine ID (40-character hex string)',
            },
            comment: {
              type: 'string',
              description: 'Reason comment required by the API',
            },
          },
          required: ['id', 'comment'],
        },
      },
      {
        name: 'restrict_machine_app_execution',
        description: 'Restrict execution of all applications on a device except Microsoft-signed files in Defender for Endpoint.',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Machine ID (40-character hex string)',
            },
            comment: {
              type: 'string',
              description: 'Reason comment required by the API',
            },
          },
          required: ['id', 'comment'],
        },
      },
      {
        name: 'unrestrict_machine_app_execution',
        description: 'Remove application execution restrictions previously applied to a device in Defender for Endpoint.',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Machine ID (40-character hex string)',
            },
            comment: {
              type: 'string',
              description: 'Reason comment required by the API',
            },
          },
          required: ['id', 'comment'],
        },
      },
      {
        name: 'run_machine_antivirus_scan',
        description: 'Trigger an antivirus scan on a device in Defender for Endpoint. Scan type: Quick or Full.',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Machine ID (40-character hex string)',
            },
            comment: {
              type: 'string',
              description: 'Reason comment required by the API',
            },
            scanType: {
              type: 'string',
              description: 'Scan type: Quick or Full (default: Quick)',
            },
          },
          required: ['id', 'comment'],
        },
      },
      {
        name: 'collect_investigation_package',
        description: 'Collect a forensic investigation package from a device in Defender for Endpoint for offline analysis.',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Machine ID (40-character hex string)',
            },
            comment: {
              type: 'string',
              description: 'Reason comment required by the API',
            },
          },
          required: ['id', 'comment'],
        },
      },
      {
        name: 'offboard_machine',
        description: 'Offboard a device from Defender for Endpoint. This removes the device from management. Irreversible.',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Machine ID (40-character hex string)',
            },
            comment: {
              type: 'string',
              description: 'Reason comment required by the API',
            },
          },
          required: ['id', 'comment'],
        },
      },
      {
        name: 'list_machine_actions',
        description: 'List machine actions (investigations, isolations, scans, etc.) with optional OData filters for status, type, and machine ID.',
        inputSchema: {
          type: 'object',
          properties: {
            filter: {
              type: 'string',
              description: 'OData $filter (e.g. "status eq \'Pending\'" or "machineId eq \'<id>\'")',
            },
            top: {
              type: 'number',
              description: 'Maximum number of results (default: 50)',
            },
            skip: {
              type: 'number',
              description: 'Number of records to skip for pagination',
            },
          },
        },
      },
      {
        name: 'get_machine_action',
        description: 'Get a single machine action by its action ID to check its status and results.',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Machine action ID (GUID)',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'list_indicators',
        description: 'List custom threat indicators (IOCs) defined in Defender for Endpoint. Supports OData $filter for indicatorType, action, and severity.',
        inputSchema: {
          type: 'object',
          properties: {
            filter: {
              type: 'string',
              description: 'OData $filter (e.g. "indicatorType eq \'FileSha256\'")',
            },
            top: {
              type: 'number',
              description: 'Maximum number of results (default: 100)',
            },
            skip: {
              type: 'number',
              description: 'Number of records to skip for pagination',
            },
          },
        },
      },
      {
        name: 'create_indicator',
        description: 'Create a custom threat indicator (IOC) in Defender for Endpoint for a file hash, IP, URL, or domain.',
        inputSchema: {
          type: 'object',
          properties: {
            indicatorValue: {
              type: 'string',
              description: 'The IOC value: SHA256 hash, IP address, domain, or URL',
            },
            indicatorType: {
              type: 'string',
              description: 'Type: FileSha1, FileMd5, CertificateThumbprint, FileSha256, IpAddress, DomainName, Url',
            },
            action: {
              type: 'string',
              description: 'Action: Alert, Warn, Block, Audit, BlockAndRemediate, AlertAndBlock, Allowed. Note: Audit requires generateAlert=true.',
            },
            title: {
              type: 'string',
              description: 'Title/name for the indicator',
            },
            description: {
              type: 'string',
              description: 'Description of the indicator',
            },
            severity: {
              type: 'string',
              description: 'Severity: Informational, Low, Medium, High (default: Medium)',
            },
            expirationTime: {
              type: 'string',
              description: 'Expiration datetime in ISO 8601 format (optional)',
            },
          },
          required: ['indicatorValue', 'indicatorType', 'action', 'title', 'description'],
        },
      },
      {
        name: 'delete_indicator',
        description: 'Delete a custom threat indicator (IOC) from Defender for Endpoint by its indicator ID.',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'number',
              description: 'Indicator ID (integer)',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'list_vulnerabilities',
        description: 'List all CVE vulnerabilities affecting the organization. Supports OData $filter for severity, cvssV3, and publicExploit fields.',
        inputSchema: {
          type: 'object',
          properties: {
            filter: {
              type: 'string',
              description: 'OData $filter expression (e.g. "severity eq \'Critical\'")',
            },
            top: {
              type: 'number',
              description: 'Maximum number of results (default: 50)',
            },
            skip: {
              type: 'number',
              description: 'Number of records to skip for pagination',
            },
          },
        },
      },
      {
        name: 'get_vulnerability',
        description: 'Get details of a specific CVE vulnerability by its CVE ID.',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'CVE ID (e.g. CVE-2021-44228)',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'list_recommendations',
        description: 'List all security recommendations for the organization from Defender for Endpoint threat and vulnerability management.',
        inputSchema: {
          type: 'object',
          properties: {
            filter: {
              type: 'string',
              description: 'OData $filter expression (e.g. "severityScore gt 8")',
            },
            top: {
              type: 'number',
              description: 'Maximum number of results (default: 50)',
            },
            skip: {
              type: 'number',
              description: 'Number of records to skip for pagination',
            },
          },
        },
      },
      {
        name: 'get_recommendation',
        description: 'Get a specific security recommendation by its recommendation ID from Defender for Endpoint.',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Recommendation ID (e.g. va-_-microsoft-_-windows_10)',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'run_advanced_query',
        description: 'Run a KQL advanced hunting query against Defender for Endpoint event data (DeviceProcessEvents, DeviceNetworkEvents, etc.). Results limited to last 30 days, max 100,000 rows.',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'KQL query string (e.g. "DeviceProcessEvents | where FileName =~ \'powershell.exe\' | limit 10")',
            },
          },
          required: ['query'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      const token = await this.getToken();
      const headers: Record<string, string> = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      };

      switch (name) {
        case 'list_alerts':
          return await this.listAlerts(args, headers);
        case 'get_alert':
          return await this.getAlert(args, headers);
        case 'update_alert':
          return await this.updateAlert(args, headers);
        case 'list_machines':
          return await this.listMachines(args, headers);
        case 'get_machine':
          return await this.getMachine(args, headers);
        case 'get_machine_alerts':
          return await this.getMachineAlerts(args, headers);
        case 'get_machine_software':
          return await this.getMachineSoftware(args, headers);
        case 'get_machine_vulnerabilities':
          return await this.getMachineVulnerabilities(args, headers);
        case 'get_machine_recommendations':
          return await this.getMachineRecommendations(args, headers);
        case 'isolate_machine':
          return await this.isolateMachine(args, headers);
        case 'unisolate_machine':
          return await this.unisolateMachine(args, headers);
        case 'restrict_machine_app_execution':
          return await this.restrictMachineAppExecution(args, headers);
        case 'unrestrict_machine_app_execution':
          return await this.unrestrictMachineAppExecution(args, headers);
        case 'run_machine_antivirus_scan':
          return await this.runMachineAntivirusScan(args, headers);
        case 'collect_investigation_package':
          return await this.collectInvestigationPackage(args, headers);
        case 'offboard_machine':
          return await this.offboardMachine(args, headers);
        case 'list_machine_actions':
          return await this.listMachineActions(args, headers);
        case 'get_machine_action':
          return await this.getMachineAction(args, headers);
        case 'list_indicators':
          return await this.listIndicators(args, headers);
        case 'create_indicator':
          return await this.createIndicator(args, headers);
        case 'delete_indicator':
          return await this.deleteIndicator(args, headers);
        case 'list_vulnerabilities':
          return await this.listVulnerabilities(args, headers);
        case 'get_vulnerability':
          return await this.getVulnerability(args, headers);
        case 'list_recommendations':
          return await this.listRecommendations(args, headers);
        case 'get_recommendation':
          return await this.getRecommendation(args, headers);
        case 'run_advanced_query':
          return await this.runAdvancedQuery(args, headers);
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

  private async apiGet(url: string, headers: Record<string, string>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(url, { method: 'GET', headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async apiPost(url: string, headers: Record<string, string>, body: unknown): Promise<ToolResult> {
    const response = await this.fetchWithRetry(url, { method: 'POST', headers, body: JSON.stringify(body) });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const text = await response.text();
    const data = text ? JSON.parse(text) : { success: true };
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private buildODataUrl(base: string, args: Record<string, unknown>, defaultTop = 100): string {
    const top = (args.top as number) || defaultTop;
    let url = `${base}?$top=${top}`;
    if (args.filter) url += `&$filter=${encodeURIComponent(args.filter as string)}`;
    if (args.skip) url += `&$skip=${encodeURIComponent(args.skip as number)}`;
    if (args.expand) url += `&$expand=${encodeURIComponent(args.expand as string)}`;
    return url;
  }

  private async listAlerts(args: Record<string, unknown>, headers: Record<string, string>): Promise<ToolResult> {
    const url = this.buildODataUrl(`${this.baseUrl}/api/alerts`, args);
    return this.apiGet(url, headers);
  }

  private async getAlert(args: Record<string, unknown>, headers: Record<string, string>): Promise<ToolResult> {
    const id = args.id as string;
    if (!id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.apiGet(`${this.baseUrl}/api/alerts/${encodeURIComponent(id)}`, headers);
  }

  private async updateAlert(args: Record<string, unknown>, headers: Record<string, string>): Promise<ToolResult> {
    const id = args.id as string;
    if (!id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.status) body.status = args.status;
    if (args.assignedTo) body.assignedTo = args.assignedTo;
    if (args.classification) body.classification = args.classification;
    if (args.determination) body.determination = args.determination;
    if (args.comment) body.comment = args.comment;
    const response = await this.fetchWithRetry(`${this.baseUrl}/api/alerts/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async listMachines(args: Record<string, unknown>, headers: Record<string, string>): Promise<ToolResult> {
    const url = this.buildODataUrl(`${this.baseUrl}/api/machines`, args);
    return this.apiGet(url, headers);
  }

  private async getMachine(args: Record<string, unknown>, headers: Record<string, string>): Promise<ToolResult> {
    const id = args.id as string;
    if (!id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.apiGet(`${this.baseUrl}/api/machines/${encodeURIComponent(id)}`, headers);
  }

  private async getMachineAlerts(args: Record<string, unknown>, headers: Record<string, string>): Promise<ToolResult> {
    const id = args.id as string;
    if (!id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.apiGet(`${this.baseUrl}/api/machines/${encodeURIComponent(id)}/alerts`, headers);
  }

  private async getMachineSoftware(args: Record<string, unknown>, headers: Record<string, string>): Promise<ToolResult> {
    const id = args.id as string;
    if (!id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.apiGet(`${this.baseUrl}/api/machines/${encodeURIComponent(id)}/software`, headers);
  }

  private async getMachineVulnerabilities(args: Record<string, unknown>, headers: Record<string, string>): Promise<ToolResult> {
    const id = args.id as string;
    if (!id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.apiGet(`${this.baseUrl}/api/machines/${encodeURIComponent(id)}/vulnerabilities`, headers);
  }

  private async getMachineRecommendations(args: Record<string, unknown>, headers: Record<string, string>): Promise<ToolResult> {
    const id = args.id as string;
    if (!id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.apiGet(`${this.baseUrl}/api/machines/${encodeURIComponent(id)}/recommendations`, headers);
  }

  private async isolateMachine(args: Record<string, unknown>, headers: Record<string, string>): Promise<ToolResult> {
    const id = args.id as string;
    const comment = args.comment as string;
    if (!id || !comment) return { content: [{ type: 'text', text: 'id and comment are required' }], isError: true };
    return this.apiPost(`${this.baseUrl}/api/machines/${encodeURIComponent(id)}/isolate`, headers, {
      Comment: comment,
      IsolationType: (args.isolationType as string) || 'Full',
    });
  }

  private async unisolateMachine(args: Record<string, unknown>, headers: Record<string, string>): Promise<ToolResult> {
    const id = args.id as string;
    const comment = args.comment as string;
    if (!id || !comment) return { content: [{ type: 'text', text: 'id and comment are required' }], isError: true };
    return this.apiPost(`${this.baseUrl}/api/machines/${encodeURIComponent(id)}/unisolate`, headers, { Comment: comment });
  }

  private async restrictMachineAppExecution(args: Record<string, unknown>, headers: Record<string, string>): Promise<ToolResult> {
    const id = args.id as string;
    const comment = args.comment as string;
    if (!id || !comment) return { content: [{ type: 'text', text: 'id and comment are required' }], isError: true };
    return this.apiPost(`${this.baseUrl}/api/machines/${encodeURIComponent(id)}/restrictCodeExecution`, headers, { Comment: comment });
  }

  private async unrestrictMachineAppExecution(args: Record<string, unknown>, headers: Record<string, string>): Promise<ToolResult> {
    const id = args.id as string;
    const comment = args.comment as string;
    if (!id || !comment) return { content: [{ type: 'text', text: 'id and comment are required' }], isError: true };
    return this.apiPost(`${this.baseUrl}/api/machines/${encodeURIComponent(id)}/unrestrictCodeExecution`, headers, { Comment: comment });
  }

  private async runMachineAntivirusScan(args: Record<string, unknown>, headers: Record<string, string>): Promise<ToolResult> {
    const id = args.id as string;
    const comment = args.comment as string;
    if (!id || !comment) return { content: [{ type: 'text', text: 'id and comment are required' }], isError: true };
    return this.apiPost(`${this.baseUrl}/api/machines/${encodeURIComponent(id)}/runAntiVirusScan`, headers, {
      Comment: comment,
      ScanType: (args.scanType as string) || 'Quick',
    });
  }

  private async collectInvestigationPackage(args: Record<string, unknown>, headers: Record<string, string>): Promise<ToolResult> {
    const id = args.id as string;
    const comment = args.comment as string;
    if (!id || !comment) return { content: [{ type: 'text', text: 'id and comment are required' }], isError: true };
    return this.apiPost(`${this.baseUrl}/api/machines/${encodeURIComponent(id)}/collectInvestigationPackage`, headers, { Comment: comment });
  }

  private async offboardMachine(args: Record<string, unknown>, headers: Record<string, string>): Promise<ToolResult> {
    const id = args.id as string;
    const comment = args.comment as string;
    if (!id || !comment) return { content: [{ type: 'text', text: 'id and comment are required' }], isError: true };
    return this.apiPost(`${this.baseUrl}/api/machines/${encodeURIComponent(id)}/offboard`, headers, { Comment: comment });
  }

  private async listMachineActions(args: Record<string, unknown>, headers: Record<string, string>): Promise<ToolResult> {
    const url = this.buildODataUrl(`${this.baseUrl}/api/machineactions`, args, 50);
    return this.apiGet(url, headers);
  }

  private async getMachineAction(args: Record<string, unknown>, headers: Record<string, string>): Promise<ToolResult> {
    const id = args.id as string;
    if (!id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.apiGet(`${this.baseUrl}/api/machineactions/${encodeURIComponent(id)}`, headers);
  }

  private async listIndicators(args: Record<string, unknown>, headers: Record<string, string>): Promise<ToolResult> {
    const url = this.buildODataUrl(`${this.baseUrl}/api/indicators`, args);
    return this.apiGet(url, headers);
  }

  private async createIndicator(args: Record<string, unknown>, headers: Record<string, string>): Promise<ToolResult> {
    const { indicatorValue, indicatorType, action, title } = args;
    if (!indicatorValue || !indicatorType || !action || !title) {
      return { content: [{ type: 'text', text: 'indicatorValue, indicatorType, action, and title are required' }], isError: true };
    }
    const body: Record<string, unknown> = { indicatorValue, indicatorType, action, title };
    if (args.description) body.description = args.description;
    if (args.severity) body.severity = args.severity;
    if (args.expirationTime) body.expirationTime = args.expirationTime;
    return this.apiPost(`${this.baseUrl}/api/indicators`, headers, body);
  }

  private async deleteIndicator(args: Record<string, unknown>, headers: Record<string, string>): Promise<ToolResult> {
    const id = args.id as number;
    if (id === undefined || id === null) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    const response = await this.fetchWithRetry(`${this.baseUrl}/api/indicators/${id}`, { method: 'DELETE', headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: JSON.stringify({ success: true, id }) }], isError: false };
  }

  private async listVulnerabilities(args: Record<string, unknown>, headers: Record<string, string>): Promise<ToolResult> {
    const url = this.buildODataUrl(`${this.baseUrl}/api/Vulnerabilities`, args, 50);
    return this.apiGet(url, headers);
  }

  private async getVulnerability(args: Record<string, unknown>, headers: Record<string, string>): Promise<ToolResult> {
    const id = args.id as string;
    if (!id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.apiGet(`${this.baseUrl}/api/Vulnerabilities/${encodeURIComponent(id)}`, headers);
  }

  private async listRecommendations(args: Record<string, unknown>, headers: Record<string, string>): Promise<ToolResult> {
    const url = this.buildODataUrl(`${this.baseUrl}/api/recommendations`, args, 50);
    return this.apiGet(url, headers);
  }

  private async getRecommendation(args: Record<string, unknown>, headers: Record<string, string>): Promise<ToolResult> {
    const id = args.id as string;
    if (!id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.apiGet(`${this.baseUrl}/api/recommendations/${encodeURIComponent(id)}`, headers);
  }

  private async runAdvancedQuery(args: Record<string, unknown>, headers: Record<string, string>): Promise<ToolResult> {
    const query = args.query as string;
    if (!query) return { content: [{ type: 'text', text: 'query is required' }], isError: true };
    return this.apiPost(`${this.baseUrl}/api/advancedqueries/run`, headers, { Query: query });
  }
}

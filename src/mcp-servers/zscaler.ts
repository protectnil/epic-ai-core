/**
 * Zscaler MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/zscaler/zscaler-mcp-server — transport: stdio/SSE/streamable-HTTP,
//   auth: OneAPI OAuth2 or Legacy ZIA/ZPA API credentials. Last release: v0.6.1 (2025-12-16).
//   281 tools across all services: ZIA (106), ZPA (88), ZDX (31), ZTW (19), Z-Insights (16),
//   ZIdentity (10), EASM (7), ZCC (4). Currently in public preview; production deployments not
//   yet recommended by Zscaler. All write operations require --enable-write-tools flag.
// Our adapter covers: 14 tools (ZIA core operations: users, groups, URL filtering, firewall,
//   DLP, sandbox, locations, URL categories, admin audit logs, activate changes).
// Recommendation: Use vendor MCP for full ZIA+ZPA+ZDX coverage when stable. Use this adapter
//   for air-gapped deployments or when only ZIA REST is available. MCP is use-rest-api for now
//   due to public preview status (criterion 2 of the MCP adoption criteria: not production-ready).
//
// Base URL: https://$zsapi.<ZscalerCloudName>/api/v1  (e.g. https://zsapi.zscaler.net/api/v1)
//   Pass the full base URL including cloud name via config.baseUrl.
// Auth: POST /api/v1/authenticatedSession with obfuscated apiKey + username + password → JSESSIONID cookie
//   Session TTL: 30 minutes (Zscaler default); adapter refreshes automatically.
//   Obfuscation algorithm documented at help.zscaler.com/zia/api-authentication.
// Docs: https://help.zscaler.com/zia/api
//       https://help.zscaler.com/zia/understanding-zia-api
// Rate limits: Not publicly documented; recommended: <100 req/min per session

import { AdapterCatalogEntry } from '../federation/AdapterCatalog.js';
import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface ZscalerConfig {
  /** Full base URL including cloud name, e.g. https://zsapi.zscaler.net/api/v1 */
  baseUrl: string;
  username: string;
  password: string;
  apiKey: string;
}

export class ZscalerMCPServer extends MCPAdapterBase {
  private readonly baseUrl: string;
  private readonly username: string;
  private readonly apiKey: string;
  private password: string | null;
  private sessionCookie: string | null = null;
  private sessionExpiry: number = 0;
  private static readonly SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes

  constructor(config: ZscalerConfig) {
    super();
    this.baseUrl = config.baseUrl;
    this.username = config.username;
    this.password = config.password;
    this.apiKey = config.apiKey;
  }

  static catalog(): AdapterCatalogEntry {
    return {
      name: 'zscaler',
      displayName: 'Zscaler',
      version: '1.0.0',
      category: 'cybersecurity',
      keywords: [
        'zscaler', 'zia', 'zero trust', 'web security', 'url filtering', 'firewall',
        'dlp', 'data loss prevention', 'sandbox', 'malware', 'cloud security',
        'sase', 'ssl inspection', 'proxy', 'threat protection', 'network security',
      ],
      toolNames: [
        'list_url_categories', 'list_url_filtering_rules', 'list_firewall_rules',
        'list_dlp_dictionaries', 'get_sandbox_report', 'list_locations',
        'list_users', 'get_user', 'list_groups', 'list_departments',
        'list_admin_users', 'get_audit_logs', 'activate_changes', 'get_policy_status',
      ],
      description: 'Zscaler Internet Access (ZIA): manage URL filtering, firewall rules, DLP, sandbox reports, users, groups, and policy activation.',
      author: 'protectnil',
    };
  }

  /**
   * Obfuscates the raw API key per Zscaler's documented algorithm.
   * ZIA POST /authenticatedSession requires the obfuscated key + timestamp in the body.
   * Algorithm (help.zscaler.com/zia/api-authentication):
   *   high = last 6 digits of timestamp string
   *   low  = (parseInt(high) >> 1).toString().padStart(6, '0')
   *   result = chars at indices high[i] from key + chars at indices (low[i]+2) from key
   */
  private obfuscateApiKey(rawKey: string, timestamp: string): string {
    const high = timestamp.slice(-6);
    const low = (parseInt(high, 10) >> 1).toString().padStart(6, '0');
    let obfuscated = '';
    for (let i = 0; i < high.length; i++) {
      obfuscated += rawKey[parseInt(high[i], 10)];
    }
    for (let i = 0; i < low.length; i++) {
      obfuscated += rawKey[parseInt(low[i], 10) + 2];
    }
    return obfuscated;
  }

  /** Authenticate via POST /authenticatedSession and store the JSESSIONID cookie. */
  private async authenticate(): Promise<void> {
    if (!this.password) {
      throw new Error('Zscaler: cannot re-authenticate — password was cleared after initial auth');
    }

    const timestamp = String(Date.now());
    const obfuscatedKey = this.obfuscateApiKey(this.apiKey, timestamp);

    const response = await this.fetchWithRetry(`${this.baseUrl}/authenticatedSession`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: this.username,
        password: this.password,
        apiKey: obfuscatedKey,
        timestamp,
      }),
    });

    if (!response.ok) {
      throw new Error(`Zscaler authentication failed: ${response.status} ${response.statusText}`);
    }

    const setCookie = response.headers.get('set-cookie');
    if (!setCookie) {
      throw new Error('Zscaler authentication succeeded but no JSESSIONID cookie was returned');
    }

    this.sessionCookie = setCookie.split(';')[0].trim();
    this.sessionExpiry = Date.now() + ZscalerMCPServer.SESSION_TTL_MS;
    this.password = null;
  }

  /** Ensure a valid session exists, refreshing if expired. */
  private async ensureSession(): Promise<void> {
    if (!this.sessionCookie || Date.now() >= this.sessionExpiry) {
      await this.authenticate();
    }
  }

  /** Build headers for authenticated ZIA API calls. */
  private sessionHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      Cookie: this.sessionCookie ?? '',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_url_categories',
        description: 'List all URL categories configured in ZIA, including custom categories and their associated URLs.',
        inputSchema: {
          type: 'object',
          properties: {
            customOnly: {
              type: 'boolean',
              description: 'When true, return only custom URL categories (default: false returns all categories).',
            },
          },
        },
      },
      {
        name: 'list_url_filtering_rules',
        description: 'List all URL filtering policy rules in ZIA with their actions, categories, user/group scope, and priority order.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'list_firewall_rules',
        description: 'List Zscaler cloud firewall filtering rules with pagination. Returns rules with actions, protocols, source/dest criteria.',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of rules to return (default: 100).',
            },
            offset: {
              type: 'number',
              description: 'Pagination offset (default: 0).',
            },
          },
        },
      },
      {
        name: 'list_dlp_dictionaries',
        description: 'List DLP (Data Loss Prevention) dictionaries. Optionally retrieve a single dictionary by ID.',
        inputSchema: {
          type: 'object',
          properties: {
            dictionaryId: {
              type: 'string',
              description: 'Specific DLP dictionary ID to retrieve. Omit to list all dictionaries.',
            },
          },
        },
      },
      {
        name: 'get_sandbox_report',
        description: 'Retrieve a Zscaler Cloud Sandbox analysis report for a file hash. Returns behavioral analysis, threat classification, and indicators of compromise.',
        inputSchema: {
          type: 'object',
          properties: {
            file_hash: {
              type: 'string',
              description: 'MD5 or SHA256 hash of the file to retrieve the report for.',
            },
            report_type: {
              type: 'string',
              description: 'Report detail level: full (default) or summary.',
            },
          },
          required: ['file_hash'],
        },
      },
      {
        name: 'list_locations',
        description: 'List all Zscaler locations (offices, branch sites, data centers) configured for traffic forwarding.',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of locations to return (default: 100).',
            },
            offset: {
              type: 'number',
              description: 'Pagination offset (default: 0).',
            },
          },
        },
      },
      {
        name: 'list_users',
        description: 'List users in ZIA with optional filters for department, group, or name. Supports pagination.',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Filter by user name (partial match supported).',
            },
            dept: {
              type: 'string',
              description: 'Filter by department name.',
            },
            group: {
              type: 'string',
              description: 'Filter by group name.',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of users to return (default: 100, max: 1000).',
            },
            offset: {
              type: 'number',
              description: 'Pagination offset (default: 0).',
            },
          },
        },
      },
      {
        name: 'get_user',
        description: 'Retrieve a specific ZIA user by their numeric user ID.',
        inputSchema: {
          type: 'object',
          properties: {
            userId: {
              type: 'number',
              description: 'Numeric ZIA user ID.',
            },
          },
          required: ['userId'],
        },
      },
      {
        name: 'list_groups',
        description: 'List all user groups configured in ZIA, used for policy scoping.',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of groups to return (default: 100).',
            },
          },
        },
      },
      {
        name: 'list_departments',
        description: 'List all departments in ZIA, used for policy scoping and user organization.',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of departments to return (default: 100).',
            },
          },
        },
      },
      {
        name: 'list_admin_users',
        description: 'List ZIA admin users including their roles, permissions, and contact details.',
        inputSchema: {
          type: 'object',
          properties: {
            includeAuditorUsers: {
              type: 'boolean',
              description: 'Include auditor role admins in results (default: false).',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of admin users to return (default: 100).',
            },
          },
        },
      },
      {
        name: 'get_audit_logs',
        description: 'Retrieve ZIA admin audit log entries for a date range. Returns actions taken by admins with timestamps and details.',
        inputSchema: {
          type: 'object',
          properties: {
            startTime: {
              type: 'number',
              description: 'Start of date range as Unix epoch timestamp (seconds).',
            },
            endTime: {
              type: 'number',
              description: 'End of date range as Unix epoch timestamp (seconds).',
            },
            actionTypes: {
              type: 'array',
              description: 'Filter by action types (e.g. ["CREATE", "UPDATE", "DELETE", "LOGIN"]).',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of log entries to return (default: 100).',
            },
          },
          required: ['startTime', 'endTime'],
        },
      },
      {
        name: 'activate_changes',
        description: 'Activate pending configuration changes in ZIA. Changes to policies, rules, and settings are staged until activated. This operation commits them to production.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_policy_status',
        description: 'Get the current activation status of ZIA policies — whether changes are pending activation or the configuration is in sync.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      await this.ensureSession();
      const headers = this.sessionHeaders();

      switch (name) {
        case 'list_url_categories':
          return await this.listUrlCategories(args, headers);
        case 'list_url_filtering_rules':
          return await this.listUrlFilteringRules(headers);
        case 'list_firewall_rules':
          return await this.listFirewallRules(args, headers);
        case 'list_dlp_dictionaries':
          return await this.listDlpDictionaries(args, headers);
        case 'get_sandbox_report':
          return await this.getSandboxReport(args, headers);
        case 'list_locations':
          return await this.listLocations(args, headers);
        case 'list_users':
          return await this.listUsers(args, headers);
        case 'get_user':
          return await this.getUser(args, headers);
        case 'list_groups':
          return await this.listGroups(args, headers);
        case 'list_departments':
          return await this.listDepartments(args, headers);
        case 'list_admin_users':
          return await this.listAdminUsers(args, headers);
        case 'get_audit_logs':
          return await this.getAuditLogs(args, headers);
        case 'activate_changes':
          return await this.activateChanges(headers);
        case 'get_policy_status':
          return await this.getPolicyStatus(headers);
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

  private async listUrlCategories(args: Record<string, unknown>, headers: Record<string, string>): Promise<ToolResult> {
    const customOnly = (args.customOnly as boolean) ?? false;
    const url = customOnly
      ? `${this.baseUrl}/urlCategories?customOnly=true`
      : `${this.baseUrl}/urlCategories`;

    const response = await this.fetchWithRetry(url, { method: 'GET', headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to list URL categories: ${response.status} ${response.statusText}` }], isError: true };
    }

    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Zscaler returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listUrlFilteringRules(headers: Record<string, string>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}/urlFilteringRules`, { method: 'GET', headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to list URL filtering rules: ${response.status} ${response.statusText}` }], isError: true };
    }

    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Zscaler returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listFirewallRules(args: Record<string, unknown>, headers: Record<string, string>): Promise<ToolResult> {
    const limit = (args.limit as number) ?? 100;
    const offset = (args.offset as number) ?? 0;
    const url = `${this.baseUrl}/firewallFilteringRules?limit=${limit}&offset=${offset}`;

    const response = await this.fetchWithRetry(url, { method: 'GET', headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to list firewall rules: ${response.status} ${response.statusText}` }], isError: true };
    }

    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Zscaler returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listDlpDictionaries(args: Record<string, unknown>, headers: Record<string, string>): Promise<ToolResult> {
    const dictionaryId = args.dictionaryId as string | undefined;
    const url = dictionaryId
      ? `${this.baseUrl}/dlpDictionaries/${encodeURIComponent(dictionaryId)}`
      : `${this.baseUrl}/dlpDictionaries`;

    const response = await this.fetchWithRetry(url, { method: 'GET', headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to list DLP dictionaries: ${response.status} ${response.statusText}` }], isError: true };
    }

    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Zscaler returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getSandboxReport(args: Record<string, unknown>, headers: Record<string, string>): Promise<ToolResult> {
    const fileHash = args.file_hash as string;
    if (!fileHash) {
      return { content: [{ type: 'text', text: 'file_hash is required' }], isError: true };
    }

    const reportType = (args.report_type as string) ?? 'full';
    const url = `${this.baseUrl}/sandbox/report/${encodeURIComponent(fileHash)}?details=${encodeURIComponent(reportType)}`;

    const response = await this.fetchWithRetry(url, { method: 'GET', headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to get sandbox report: ${response.status} ${response.statusText}` }], isError: true };
    }

    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Zscaler returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listLocations(args: Record<string, unknown>, headers: Record<string, string>): Promise<ToolResult> {
    const limit = (args.limit as number) ?? 100;
    const offset = (args.offset as number) ?? 0;
    const url = `${this.baseUrl}/locations?limit=${limit}&offset=${offset}`;

    const response = await this.fetchWithRetry(url, { method: 'GET', headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to list locations: ${response.status} ${response.statusText}` }], isError: true };
    }

    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Zscaler returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listUsers(args: Record<string, unknown>, headers: Record<string, string>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.name) params.set('name', String(args.name));
    if (args.dept) params.set('dept', String(args.dept));
    if (args.group) params.set('group', String(args.group));
    params.set('pageSize', String((args.limit as number) ?? 100));
    if (args.offset) params.set('page', String(Math.floor((args.offset as number) / 100) + 1));

    const url = `${this.baseUrl}/users?${params.toString()}`;

    const response = await this.fetchWithRetry(url, { method: 'GET', headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to list users: ${response.status} ${response.statusText}` }], isError: true };
    }

    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Zscaler returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getUser(args: Record<string, unknown>, headers: Record<string, string>): Promise<ToolResult> {
    const userId = args.userId as number;
    if (userId === undefined || userId === null) {
      return { content: [{ type: 'text', text: 'userId is required' }], isError: true };
    }

    const response = await this.fetchWithRetry(`${this.baseUrl}/users/${encodeURIComponent(String(userId))}`, { method: 'GET', headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to get user: ${response.status} ${response.statusText}` }], isError: true };
    }

    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Zscaler returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listGroups(args: Record<string, unknown>, headers: Record<string, string>): Promise<ToolResult> {
    const limit = (args.limit as number) ?? 100;
    const url = `${this.baseUrl}/groups?pageSize=${limit}`;

    const response = await this.fetchWithRetry(url, { method: 'GET', headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to list groups: ${response.status} ${response.statusText}` }], isError: true };
    }

    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Zscaler returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listDepartments(args: Record<string, unknown>, headers: Record<string, string>): Promise<ToolResult> {
    const limit = (args.limit as number) ?? 100;
    const url = `${this.baseUrl}/departments?pageSize=${limit}`;

    const response = await this.fetchWithRetry(url, { method: 'GET', headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to list departments: ${response.status} ${response.statusText}` }], isError: true };
    }

    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Zscaler returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listAdminUsers(args: Record<string, unknown>, headers: Record<string, string>): Promise<ToolResult> {
    const includeAuditorUsers = (args.includeAuditorUsers as boolean) ?? false;
    const limit = (args.limit as number) ?? 100;
    const url = `${this.baseUrl}/adminUsers?includeAuditorUsers=${includeAuditorUsers}&pageSize=${limit}`;

    const response = await this.fetchWithRetry(url, { method: 'GET', headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to list admin users: ${response.status} ${response.statusText}` }], isError: true };
    }

    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Zscaler returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getAuditLogs(args: Record<string, unknown>, headers: Record<string, string>): Promise<ToolResult> {
    const startTime = args.startTime as number;
    const endTime = args.endTime as number;

    if (!startTime || !endTime) {
      return { content: [{ type: 'text', text: 'startTime and endTime are required' }], isError: true };
    }

    const params = new URLSearchParams({
      startTime: String(startTime),
      endTime: String(endTime),
    });
    if (args.actionTypes) {
      (args.actionTypes as string[]).forEach(t => params.append('actionTypes', t));
    }
    if (args.limit) params.set('pageSize', String(args.limit));

    const response = await this.fetchWithRetry(`${this.baseUrl}/auditlogEntryReport?${params.toString()}`, { method: 'GET', headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to get audit logs: ${response.status} ${response.statusText}` }], isError: true };
    }

    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Zscaler returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async activateChanges(headers: Record<string, string>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}/status/activate`, {
      method: 'POST',
      headers,
      body: JSON.stringify({}),
    });

    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to activate changes: ${response.status} ${response.statusText}` }], isError: true };
    }

    let data: unknown;
    try { data = await response.json(); } catch { data = { status: 'activated' }; }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async getPolicyStatus(headers: Record<string, string>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}/status`, { method: 'GET', headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to get policy status: ${response.status} ${response.statusText}` }], isError: true };
    }

    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Zscaler returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }
}

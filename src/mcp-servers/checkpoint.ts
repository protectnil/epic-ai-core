/**
 * Check Point MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/CheckPointSW/mcp-servers — actively maintained (last commit Mar 24, 2026).
// Monorepo with 14+ packages across 10+ MCP servers: management (@chkp/quantum-management-mcp),
// management-logs, threat-prevention, https-inspection, harmony-sase, reputation-service,
// documentation-tool, spark-management, cpinfo-analysis, argos-erm, policy-insights, gaia,
// gw-cli, threat-emulation. Supports stdio transport. Auth: API key or username/password.
// Vendor MCP covers: 10+ tools in management server alone (policy, rules, objects, topology).
// Our adapter covers: 15 tools (REST fallback for air-gapped deployments).
// Recommendation: Use vendor MCP for full coverage. Use this adapter for air-gapped deployments
// or environments that cannot run the Node.js-based vendor MCP server.
//
// Base URL: https://{management-server-ip}/web_api  (customer-provided, no default)
// Auth: Session-based — POST /login with username+password to receive a session ID (X-Chkp-SID header).
//       Sessions expire after 600 seconds of inactivity. This adapter auto-renews on expiry.
// Docs: https://sc1.checkpoint.com/documents/latest/APIs/index.html
// Rate limits: Not publicly documented; concurrency-limited by the Management Server itself

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface CheckPointConfig {
  baseUrl: string;
  username: string;
  password: string;
}

export class CheckPointMCPServer extends MCPAdapterBase {
  private readonly baseUrl: string;
  private readonly username: string;
  private readonly password: string;
  private sessionId: string | null = null;
  private tokenExpiry: number = 0;
  private static readonly SESSION_TTL_MS = 540_000; // 9 min — renew before 10 min server timeout

  constructor(config: CheckPointConfig) {
    super();
    this.baseUrl = config.baseUrl;
    this.username = config.username;
    this.password = config.password;
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_access_rules',
        description: 'List all access control rules in a named policy package with optional pagination',
        inputSchema: {
          type: 'object',
          properties: {
            policy_name: {
              type: 'string',
              description: 'Name of the access policy package to list rules from',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of rules to return (default: 50)',
            },
            offset: {
              type: 'number',
              description: 'Offset for pagination (default: 0)',
            },
          },
          required: ['policy_name'],
        },
      },
      {
        name: 'get_access_rule',
        description: 'Retrieve details of a specific access control rule by its name or UID',
        inputSchema: {
          type: 'object',
          properties: {
            policy_name: {
              type: 'string',
              description: 'Name of the access policy package containing the rule',
            },
            rule_name: {
              type: 'string',
              description: 'Name of the access rule (mutually exclusive with rule_uid)',
            },
            rule_uid: {
              type: 'string',
              description: 'UID of the access rule (mutually exclusive with rule_name)',
            },
          },
          required: ['policy_name'],
        },
      },
      {
        name: 'add_access_rule',
        description: 'Add a new access control rule to a policy package at a specified position',
        inputSchema: {
          type: 'object',
          properties: {
            policy_name: {
              type: 'string',
              description: 'Name of the access policy package to add the rule to',
            },
            position: {
              type: 'string',
              description: 'Position for the new rule: "top", "bottom", or a number (default: "bottom")',
            },
            name: {
              type: 'string',
              description: 'Display name for the new rule',
            },
            action: {
              type: 'string',
              description: 'Rule action: Accept, Drop, Reject, Apply Layer (default: Drop)',
            },
            source: {
              type: 'array',
              items: { type: 'string' },
              description: 'List of source object names or UIDs (default: ["Any"])',
            },
            destination: {
              type: 'array',
              items: { type: 'string' },
              description: 'List of destination object names or UIDs (default: ["Any"])',
            },
            service: {
              type: 'array',
              items: { type: 'string' },
              description: 'List of service object names or UIDs (default: ["Any"])',
            },
            enabled: {
              type: 'boolean',
              description: 'Whether the rule is enabled (default: true)',
            },
          },
          required: ['policy_name'],
        },
      },
      {
        name: 'delete_access_rule',
        description: 'Delete an access control rule from a policy package by name or UID',
        inputSchema: {
          type: 'object',
          properties: {
            policy_name: {
              type: 'string',
              description: 'Name of the access policy package containing the rule',
            },
            rule_uid: {
              type: 'string',
              description: 'UID of the rule to delete (preferred)',
            },
            rule_name: {
              type: 'string',
              description: 'Name of the rule to delete (alternative to rule_uid)',
            },
          },
          required: ['policy_name'],
        },
      },
      {
        name: 'publish',
        description: 'Publish the current session changes to the management database — required before install-policy',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'install_policy',
        description: 'Install a security policy package on one or more target gateways',
        inputSchema: {
          type: 'object',
          properties: {
            policy_package: {
              type: 'string',
              description: 'Name of the policy package to install',
            },
            targets: {
              type: 'array',
              items: { type: 'string' },
              description: 'List of gateway names or UIDs to install the policy on',
            },
            access: {
              type: 'boolean',
              description: 'Install the Access Control policy (default: true)',
            },
            threat_prevention: {
              type: 'boolean',
              description: 'Install the Threat Prevention policy (default: true)',
            },
          },
          required: ['policy_package', 'targets'],
        },
      },
      {
        name: 'get_policy',
        description: 'Get details of an access control policy package by name',
        inputSchema: {
          type: 'object',
          properties: {
            policy_name: {
              type: 'string',
              description: 'Name of the policy package to retrieve',
            },
          },
          required: ['policy_name'],
        },
      },
      {
        name: 'show_gateways',
        description: 'List all configured gateways and cluster members managed by this management server',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of gateways to return (default: 50)',
            },
            offset: {
              type: 'number',
              description: 'Offset for pagination (default: 0)',
            },
          },
        },
      },
      {
        name: 'show_hosts',
        description: 'List all host network objects defined in the management database',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of hosts to return (default: 50)',
            },
            offset: {
              type: 'number',
              description: 'Offset for pagination (default: 0)',
            },
          },
        },
      },
      {
        name: 'add_host',
        description: 'Create a new host network object with a specified IP address',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Name for the new host object',
            },
            ip_address: {
              type: 'string',
              description: 'IPv4 or IPv6 address for the host object',
            },
          },
          required: ['name', 'ip_address'],
        },
      },
      {
        name: 'delete_host',
        description: 'Delete a host network object by name or UID',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Name of the host object to delete (mutually exclusive with uid)',
            },
            uid: {
              type: 'string',
              description: 'UID of the host object to delete (mutually exclusive with name)',
            },
          },
        },
      },
      {
        name: 'show_network_objects',
        description: 'List network objects (networks, hosts, groups) with optional type filter',
        inputSchema: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              description: 'Filter by object type: host, network, group, address-range (default: all)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of objects to return (default: 50)',
            },
            offset: {
              type: 'number',
              description: 'Offset for pagination (default: 0)',
            },
          },
        },
      },
      {
        name: 'list_sessions',
        description: 'List active management API sessions and their current status',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of sessions to return (default: 50)',
            },
          },
        },
      },
      {
        name: 'list_threat_logs',
        description: 'List threat prevention logs from the management server with optional filter expression',
        inputSchema: {
          type: 'object',
          properties: {
            filter: {
              type: 'string',
              description: 'Free-text filter expression for the log query',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of log entries to return (default: 100)',
            },
          },
        },
      },
      {
        name: 'logout',
        description: 'Explicitly close the current management API session and invalidate the session token',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      if (!this.sessionId || Date.now() >= this.tokenExpiry) {
        await this.login();
      }

      switch (name) {
        case 'list_access_rules':
          return await this.withReauth(() => this.listAccessRules(args));
        case 'get_access_rule':
          return await this.withReauth(() => this.getAccessRule(args));
        case 'add_access_rule':
          return await this.withReauth(() => this.addAccessRule(args));
        case 'delete_access_rule':
          return await this.withReauth(() => this.deleteAccessRule(args));
        case 'publish':
          return await this.withReauth(() => this.publish());
        case 'install_policy':
          return await this.withReauth(() => this.installPolicy(args));
        case 'get_policy':
          return await this.withReauth(() => this.getPolicy(args));
        case 'show_gateways':
          return await this.withReauth(() => this.showGateways(args));
        case 'show_hosts':
          return await this.withReauth(() => this.showHosts(args));
        case 'add_host':
          return await this.withReauth(() => this.addHost(args));
        case 'delete_host':
          return await this.withReauth(() => this.deleteHost(args));
        case 'show_network_objects':
          return await this.withReauth(() => this.showNetworkObjects(args));
        case 'list_sessions':
          return await this.withReauth(() => this.listSessions(args));
        case 'list_threat_logs':
          return await this.withReauth(() => this.listThreatLogs(args));
        case 'logout':
          return await this.logoutTool();
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

  private async withReauth<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      if (
        error instanceof Error &&
        (error.message.includes('401') || error.message.includes('403'))
      ) {
        this.sessionId = null;
        this.tokenExpiry = 0;
        await this.login();
        return await fn();
      }
      throw error;
    }
  }

  private async login(): Promise<void> {
    const response = await this.fetchWithRetry(`${this.baseUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user: this.username, password: this.password }),
    });

    if (!response.ok) {
      throw new Error(`Check Point login failed: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as { sid?: string };
    if (!data.sid) {
      throw new Error('No session ID returned from Check Point API');
    }

    this.sessionId = data.sid;
    this.tokenExpiry = Date.now() + CheckPointMCPServer.SESSION_TTL_MS;
  }

  private getHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'X-Chkp-SID': this.sessionId || '',
    };
  }

  private async checkpointPost(endpoint: string, body: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}/${endpoint}`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      throw new Error(`Check Point API error: ${response.status} ${response.statusText}`);
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Check Point returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listAccessRules(args: Record<string, unknown>): Promise<ToolResult> {
    return this.checkpointPost('show-access-rulebase', {
      policy_name: args.policy_name as string,
      limit: (args.limit as number) || 50,
      offset: (args.offset as number) || 0,
    });
  }

  private async getAccessRule(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = { policy_name: args.policy_name as string };
    if (args.rule_name) body.name = args.rule_name;
    if (args.rule_uid) body.uid = args.rule_uid;
    return this.checkpointPost('show-access-rule', body);
  }

  private async addAccessRule(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {
      policy_name: args.policy_name as string,
      position: args.position || 'bottom',
    };
    if (args.name) body.name = args.name;
    if (args.action) body.action = args.action;
    if (args.source) body.source = args.source;
    if (args.destination) body.destination = args.destination;
    if (args.service) body.service = args.service;
    if (typeof args.enabled === 'boolean') body.enabled = args.enabled;
    return this.checkpointPost('add-access-rule', body);
  }

  private async deleteAccessRule(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = { policy_name: args.policy_name as string };
    if (args.rule_uid) body.uid = args.rule_uid;
    if (args.rule_name) body.name = args.rule_name;
    return this.checkpointPost('delete-access-rule', body);
  }

  private async publish(): Promise<ToolResult> {
    return this.checkpointPost('publish', {});
  }

  private async installPolicy(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {
      'policy-package': args.policy_package as string,
      targets: args.targets as string[],
    };
    if (typeof args.access === 'boolean') body.access = args.access;
    if (typeof args.threat_prevention === 'boolean') body['threat-prevention'] = args.threat_prevention;
    return this.checkpointPost('install-policy', body);
  }

  private async getPolicy(args: Record<string, unknown>): Promise<ToolResult> {
    return this.checkpointPost('show-access-policy', { name: args.policy_name as string });
  }

  private async showGateways(args: Record<string, unknown>): Promise<ToolResult> {
    return this.checkpointPost('show-gateways-and-servers', {
      limit: (args.limit as number) || 50,
      offset: (args.offset as number) || 0,
    });
  }

  private async showHosts(args: Record<string, unknown>): Promise<ToolResult> {
    return this.checkpointPost('show-hosts', {
      limit: (args.limit as number) || 50,
      offset: (args.offset as number) || 0,
    });
  }

  private async addHost(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name || !args.ip_address) {
      return { content: [{ type: 'text', text: 'name and ip_address are required' }], isError: true };
    }
    return this.checkpointPost('add-host', {
      name: args.name as string,
      'ip-address': args.ip_address as string,
    });
  }

  private async deleteHost(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {};
    if (args.name) body.name = args.name;
    if (args.uid) body.uid = args.uid;
    if (!body.name && !body.uid) {
      return { content: [{ type: 'text', text: 'name or uid is required' }], isError: true };
    }
    return this.checkpointPost('delete-host', body);
  }

  private async showNetworkObjects(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {
      limit: (args.limit as number) || 50,
      offset: (args.offset as number) || 0,
    };
    if (args.type) body.type = args.type;
    return this.checkpointPost('show-objects', body);
  }

  private async listSessions(args: Record<string, unknown>): Promise<ToolResult> {
    return this.checkpointPost('show-sessions', { limit: (args.limit as number) || 50 });
  }

  private async listThreatLogs(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = { limit: (args.limit as number) || 100 };
    if (args.filter) body.filter = args.filter;
    return this.checkpointPost('show-logs', body);
  }

  private async logoutTool(): Promise<ToolResult> {
    const result = await this.checkpointPost('logout', {});
    this.sessionId = null;
    this.tokenExpiry = 0;
    return result;
  }

  static catalog() {
    return {
      name: 'checkpoint',
      displayName: 'Check Point',
      version: '1.0.0',
      category: 'cybersecurity' as const,
      keywords: ['checkpoint'],
      toolNames: ['list_access_rules', 'get_access_rule', 'add_access_rule', 'delete_access_rule', 'publish', 'install_policy', 'get_policy', 'show_gateways', 'show_hosts', 'add_host', 'delete_host', 'show_network_objects', 'list_sessions', 'list_threat_logs', 'logout'],
      description: 'Check Point adapter for the Epic AI Intelligence Platform',
      author: 'protectnil' as const,
    };
  }
}

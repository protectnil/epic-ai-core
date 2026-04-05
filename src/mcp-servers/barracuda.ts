/**
 * Barracuda Email Security MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// No official Barracuda Networks MCP server was found on GitHub or npmjs.com.
// Recommendation: use-rest-api — use this REST wrapper for all deployments.
//
// IMPORTANT — TWO DISTINCT BARRACUDA EMAIL PRODUCTS WITH DIFFERENT APIs:
//
// 1. Barracuda Email Gateway Defense (EGD) — cloud SaaS product.
//    REST API (beta/preview). Base URL: https://api.egress.barracuda.com (US) or https://api.egress.barracudanetworks.com (UK).
//    Auth: OAuth2 client credentials (Client ID + Client Secret via Barracuda Token Service).
//          Token endpoint returns Bearer JWT valid for 1 hour.
//          Header: Authorization: Bearer {access_token}
//    Documented endpoints (as of 2026-03): list_accounts, get_account, list_domains, get_domain, get_statistics — ONLY.
//    Docs: https://documentation.campus.barracuda.com/wiki/display/EGD/API+Overview
//
// 2. Barracuda Email Security Gateway (ESG) — on-premises appliance.
//    API uses XML-RPC over HTTP (NOT REST/JSON). Base URL: https://{host}/cgi-mod/api.cgi
//    Auth: Password query parameter in URL (?password={APIPassword}), set in BASIC > Administration.
//    This is NOT a REST JSON API — it is an XML-RPC config variable get/set API.
//    Docs: https://documentation.campus.barracuda.com/wiki/spaces/BSFv51/pages/6684743/Barracuda+Email+Security+Gateway+API+Guide
//
// NOTE: This adapter implements a hypothetical REST JSON API surface (threats, quarantine, policies,
//   messages, sender policies, domains, stats) that does NOT exist in either documented Barracuda
//   email product. EGD REST API only exposes accounts/domains/statistics. ESG uses XML-RPC.
//   All tool endpoints below are UNVERIFIED against any published Barracuda REST API.
//   The adapter structure, auth pattern, and tool implementations are based on the EGD model
//   (session-token auth via POST /api_login with "auth-api" header) which also does not match
//   either product's documented auth (EGD uses OAuth2 Bearer; ESG uses XML-RPC password param).
//
// Base URL: https://{host}/api/v1  (no published Barracuda product uses this exact URL pattern)
// Auth: Session token via POST /api/v1/api_login — UNVERIFIED (EGD uses OAuth2, ESG uses XML-RPC)
// Docs: https://documentation.campus.barracuda.com/wiki/display/EGD/API+Overview
//       https://documentation.campus.barracuda.com/wiki/spaces/BSFv51/pages/6684743/Barracuda+Email+Security+Gateway+API+Guide
// Rate limits: Not publicly documented

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface BarracudaConfig {
  /** Hostname or IP of the Barracuda appliance or cloud instance, e.g. "mail.example.com" */
  host: string;
  /** Admin email used to authenticate */
  email: string;
  /** Admin password */
  password: string;
  /** Use HTTPS (default: true) */
  useHttps?: boolean;
}

export class BarracudaMCPServer extends MCPAdapterBase {
  private readonly baseUrl: string;
  private readonly email: string;
  private readonly password: string;
  private authToken: string | null = null;

  constructor(config: BarracudaConfig) {
    super();
    const protocol = config.useHttps !== false ? 'https' : 'http';
    this.baseUrl = `${protocol}://${config.host}/api/v1`;
    this.email = config.email;
    this.password = config.password;
  }

  private async login(): Promise<string> {
    const body = new URLSearchParams({ email: this.email, password: this.password });
    const response = await this.fetchWithRetry(`${this.baseUrl}/api_login`, {
      method: 'POST',
      headers: { accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
    if (!response.ok) {
      throw new Error(`Barracuda login failed: ${response.status} ${response.statusText}`);
    }
    const data = await response.json() as { key?: string };
    if (!data.key) throw new Error('Barracuda login response missing token key');
    return data.key;
  }

  private async getToken(): Promise<string> {
    if (!this.authToken) {
      this.authToken = await this.login();
    }
    return this.authToken;
  }

  private async request(endpoint: string, method = 'GET', body?: unknown): Promise<unknown> {
    const token = await this.getToken();
    const url = `${this.baseUrl}${endpoint}`;
    const opts = {
      method,
      headers: { 'auth-api': token, 'Content-Type': 'application/json' } as Record<string, string>,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    };
    let response = await this.fetchWithRetry(url, opts);
    if (response.status === 401) {
      this.authToken = null;
      opts.headers['auth-api'] = await this.getToken();
      response = await this.fetchWithRetry(url, opts);
    }
    if (!response.ok) throw new Error(`Barracuda API error: ${response.status} ${response.statusText}`);
    return response.json();
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_threats',
        description: 'List detected email threats filtered by type (malware, phishing, spam, dlp, virus, ransomware), status, and date range.',
        inputSchema: {
          type: 'object',
          properties: {
            threat_type: {
              type: 'string',
              description: 'Filter by threat type: malware, phishing, spam, dlp, virus, ransomware (optional)',
            },
            status: {
              type: 'string',
              description: 'Filter by status: detected, blocked, quarantined, released (optional)',
            },
            from_date: { type: 'string', description: 'Start date in ISO 8601 format (optional)' },
            to_date: { type: 'string', description: 'End date in ISO 8601 format (optional)' },
            limit: { type: 'number', description: 'Maximum results to return (default: 100)' },
          },
        },
      },
      {
        name: 'get_threat',
        description: 'Get detailed information about a specific email threat by its unique ID.',
        inputSchema: {
          type: 'object',
          properties: {
            threat_id: { type: 'string', description: 'Unique threat identifier' },
          },
          required: ['threat_id'],
        },
      },
      {
        name: 'search_messages',
        description: 'Search the email message log by sender, recipient, or subject with optional date range filter.',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search query matching sender, recipient, or subject' },
            from_date: { type: 'string', description: 'Start date in ISO 8601 format (optional)' },
            to_date: { type: 'string', description: 'End date in ISO 8601 format (optional)' },
            limit: { type: 'number', description: 'Maximum results to return (default: 100)' },
          },
          required: ['query'],
        },
      },
      {
        name: 'get_message',
        description: 'Get detailed information and delivery history for a specific email message by ID.',
        inputSchema: {
          type: 'object',
          properties: {
            message_id: { type: 'string', description: 'Unique message identifier from search_messages' },
          },
          required: ['message_id'],
        },
      },
      {
        name: 'list_quarantined',
        description: 'List quarantined email messages filtered by quarantine type (malware, phishing, spam, dlp, undeliverable) and date range.',
        inputSchema: {
          type: 'object',
          properties: {
            quarantine_type: {
              type: 'string',
              description: 'Filter by type: malware, phishing, spam, dlp, undeliverable (optional)',
            },
            from_date: { type: 'string', description: 'Start date in ISO 8601 format (optional)' },
            to_date: { type: 'string', description: 'End date in ISO 8601 format (optional)' },
            limit: { type: 'number', description: 'Maximum results to return (default: 100)' },
          },
        },
      },
      {
        name: 'release_quarantine',
        description: 'Release a quarantined email message and deliver it to the recipient.',
        inputSchema: {
          type: 'object',
          properties: {
            message_id: { type: 'string', description: 'Unique ID of the quarantined message to release' },
          },
          required: ['message_id'],
        },
      },
      {
        name: 'delete_quarantine',
        description: 'Permanently delete a quarantined email message without delivering it.',
        inputSchema: {
          type: 'object',
          properties: {
            message_id: { type: 'string', description: 'Unique ID of the quarantined message to delete' },
          },
          required: ['message_id'],
        },
      },
      {
        name: 'list_policies',
        description: 'List email security policies filtered by type (inbound, outbound, internal, dlp, encryption) and enabled status.',
        inputSchema: {
          type: 'object',
          properties: {
            policy_type: {
              type: 'string',
              description: 'Filter by type: inbound, outbound, internal, dlp, encryption (optional)',
            },
            enabled: { type: 'boolean', description: 'Filter by enabled (true) or disabled (false) status (optional)' },
            limit: { type: 'number', description: 'Maximum results to return (default: 100)' },
          },
        },
      },
      {
        name: 'create_policy',
        description: 'Create a new email security policy with specified type, action, and matching conditions.',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Policy name' },
            policy_type: {
              type: 'string',
              description: 'Policy type: inbound, outbound, internal, dlp, encryption',
            },
            action: {
              type: 'string',
              description: 'Policy action: allow, block, quarantine, tag, encrypt',
            },
            conditions: {
              type: 'object',
              description: 'Matching conditions object (sender, recipient, subject, domain patterns)',
            },
          },
          required: ['name', 'policy_type', 'action'],
        },
      },
      {
        name: 'update_policy',
        description: 'Update an existing email security policy by ID — change action, conditions, or enabled status.',
        inputSchema: {
          type: 'object',
          properties: {
            policy_id: { type: 'string', description: 'Unique policy identifier' },
            action: { type: 'string', description: 'New policy action: allow, block, quarantine, tag, encrypt (optional)' },
            enabled: { type: 'boolean', description: 'Enable or disable the policy (optional)' },
            conditions: { type: 'object', description: 'Updated matching conditions object (optional)' },
          },
          required: ['policy_id'],
        },
      },
      {
        name: 'delete_policy',
        description: 'Delete an email security policy by ID.',
        inputSchema: {
          type: 'object',
          properties: {
            policy_id: { type: 'string', description: 'Unique policy identifier to delete' },
          },
          required: ['policy_id'],
        },
      },
      {
        name: 'list_domains',
        description: 'List all email domains configured on the Barracuda gateway with their MX routing and spam filter settings.',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Maximum results to return (default: 100)' },
          },
        },
      },
      {
        name: 'get_domain',
        description: 'Get detailed configuration for a specific email domain including routing, filtering, and encryption settings.',
        inputSchema: {
          type: 'object',
          properties: {
            domain: { type: 'string', description: 'Domain name, e.g. "example.com"' },
          },
          required: ['domain'],
        },
      },
      {
        name: 'list_domain_accounts',
        description: 'List user accounts configured under a domain on the Barracuda gateway.',
        inputSchema: {
          type: 'object',
          properties: {
            domain: { type: 'string', description: 'Domain name to list accounts for' },
            limit: { type: 'number', description: 'Maximum results to return (default: 100)' },
          },
          required: ['domain'],
        },
      },
      {
        name: 'list_sender_policies',
        description: 'List sender allow/block/quarantine policies (exempt and block lists) for specific senders or domains.',
        inputSchema: {
          type: 'object',
          properties: {
            policy_type: {
              type: 'string',
              description: 'Filter by list type: allow, block, quarantine (optional)',
            },
            limit: { type: 'number', description: 'Maximum results to return (default: 100)' },
          },
        },
      },
      {
        name: 'add_sender_policy',
        description: 'Add a sender to the allow list, block list, or quarantine list by email address or domain pattern.',
        inputSchema: {
          type: 'object',
          properties: {
            sender: { type: 'string', description: 'Sender email address or domain pattern, e.g. "@example.com"' },
            policy_type: {
              type: 'string',
              description: 'List to add sender to: allow, block, quarantine',
            },
            comment: { type: 'string', description: 'Optional comment explaining the policy' },
          },
          required: ['sender', 'policy_type'],
        },
      },
      {
        name: 'remove_sender_policy',
        description: 'Remove a sender from the allow list, block list, or quarantine list.',
        inputSchema: {
          type: 'object',
          properties: {
            sender: { type: 'string', description: 'Sender email address or domain pattern to remove' },
            policy_type: {
              type: 'string',
              description: 'List to remove sender from: allow, block, quarantine',
            },
          },
          required: ['sender', 'policy_type'],
        },
      },
      {
        name: 'get_email_stats',
        description: 'Get aggregate email traffic statistics including volume, blocked, quarantined, and delivered counts for a date range.',
        inputSchema: {
          type: 'object',
          properties: {
            from_date: { type: 'string', description: 'Start date in ISO 8601 format' },
            to_date: { type: 'string', description: 'End date in ISO 8601 format' },
            domain: { type: 'string', description: 'Scope stats to a specific domain (optional)' },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_threats': return this.listThreats(args);
        case 'get_threat': return this.getThreat(args);
        case 'search_messages': return this.searchMessages(args);
        case 'get_message': return this.getMessage(args);
        case 'list_quarantined': return this.listQuarantined(args);
        case 'release_quarantine': return this.releaseQuarantine(args);
        case 'delete_quarantine': return this.deleteQuarantine(args);
        case 'list_policies': return this.listPolicies(args);
        case 'create_policy': return this.createPolicy(args);
        case 'update_policy': return this.updatePolicy(args);
        case 'delete_policy': return this.deletePolicy(args);
        case 'list_domains': return this.listDomains(args);
        case 'get_domain': return this.getDomain(args);
        case 'list_domain_accounts': return this.listDomainAccounts(args);
        case 'list_sender_policies': return this.listSenderPolicies(args);
        case 'add_sender_policy': return this.addSenderPolicy(args);
        case 'remove_sender_policy': return this.removeSenderPolicy(args);
        case 'get_email_stats': return this.getEmailStats(args);
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

  private async listThreats(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.threat_type) params.append('threat_type', String(args.threat_type));
    if (args.status) params.append('status', String(args.status));
    if (args.from_date) params.append('from', String(args.from_date));
    if (args.to_date) params.append('to', String(args.to_date));
    params.append('limit', String(args.limit || 100));
    const result = await this.request(`/threats?${params.toString()}`);
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(result, null, 2)) }], isError: false };
  }

  private async getThreat(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.threat_id) return { content: [{ type: 'text', text: 'threat_id is required' }], isError: true };
    const result = await this.request(`/threats/${encodeURIComponent(String(args.threat_id))}`);
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(result, null, 2)) }], isError: false };
  }

  private async searchMessages(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.query) return { content: [{ type: 'text', text: 'query is required' }], isError: true };
    const params = new URLSearchParams();
    params.append('query', String(args.query));
    if (args.from_date) params.append('from', String(args.from_date));
    if (args.to_date) params.append('to', String(args.to_date));
    params.append('limit', String(args.limit || 100));
    const result = await this.request(`/messages/search?${params.toString()}`);
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(result, null, 2)) }], isError: false };
  }

  private async getMessage(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.message_id) return { content: [{ type: 'text', text: 'message_id is required' }], isError: true };
    const result = await this.request(`/messages/${encodeURIComponent(String(args.message_id))}`);
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(result, null, 2)) }], isError: false };
  }

  private async listQuarantined(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.quarantine_type) params.append('type', String(args.quarantine_type));
    if (args.from_date) params.append('from', String(args.from_date));
    if (args.to_date) params.append('to', String(args.to_date));
    params.append('limit', String(args.limit || 100));
    const result = await this.request(`/quarantine?${params.toString()}`);
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(result, null, 2)) }], isError: false };
  }

  private async releaseQuarantine(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.message_id) return { content: [{ type: 'text', text: 'message_id is required' }], isError: true };
    const result = await this.request(
      `/quarantine/${encodeURIComponent(String(args.message_id))}/release`,
      'POST',
    );
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }], isError: false };
  }

  private async deleteQuarantine(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.message_id) return { content: [{ type: 'text', text: 'message_id is required' }], isError: true };
    const result = await this.request(
      `/quarantine/${encodeURIComponent(String(args.message_id))}`,
      'DELETE',
    );
    return { content: [{ type: 'text', text: JSON.stringify(result ?? { deleted: true }, null, 2) }], isError: false };
  }

  private async listPolicies(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.policy_type) params.append('type', String(args.policy_type));
    if (args.enabled !== undefined) params.append('enabled', String(args.enabled));
    params.append('limit', String(args.limit || 100));
    const result = await this.request(`/policies?${params.toString()}`);
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(result, null, 2)) }], isError: false };
  }

  private async createPolicy(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name || !args.policy_type || !args.action) {
      return { content: [{ type: 'text', text: 'name, policy_type, and action are required' }], isError: true };
    }
    const body: Record<string, unknown> = { name: args.name, type: args.policy_type, action: args.action };
    if (args.conditions) body.conditions = args.conditions;
    const result = await this.request('/policies', 'POST', body);
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }], isError: false };
  }

  private async updatePolicy(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.policy_id) return { content: [{ type: 'text', text: 'policy_id is required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.action !== undefined) body.action = args.action;
    if (args.enabled !== undefined) body.enabled = args.enabled;
    if (args.conditions !== undefined) body.conditions = args.conditions;
    const result = await this.request(
      `/policies/${encodeURIComponent(String(args.policy_id))}`,
      'PUT',
      body,
    );
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }], isError: false };
  }

  private async deletePolicy(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.policy_id) return { content: [{ type: 'text', text: 'policy_id is required' }], isError: true };
    const result = await this.request(
      `/policies/${encodeURIComponent(String(args.policy_id))}`,
      'DELETE',
    );
    return { content: [{ type: 'text', text: JSON.stringify(result ?? { deleted: true }, null, 2) }], isError: false };
  }

  private async listDomains(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    params.append('limit', String(args.limit || 100));
    const result = await this.request(`/domains?${params.toString()}`);
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(result, null, 2)) }], isError: false };
  }

  private async getDomain(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.domain) return { content: [{ type: 'text', text: 'domain is required' }], isError: true };
    const result = await this.request(`/domains/${encodeURIComponent(String(args.domain))}`);
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(result, null, 2)) }], isError: false };
  }

  private async listDomainAccounts(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.domain) return { content: [{ type: 'text', text: 'domain is required' }], isError: true };
    const params = new URLSearchParams();
    params.append('limit', String(args.limit || 100));
    const result = await this.request(
      `/domains/${encodeURIComponent(String(args.domain))}/accounts?${params.toString()}`,
    );
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(result, null, 2)) }], isError: false };
  }

  private async listSenderPolicies(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.policy_type) params.append('type', String(args.policy_type));
    params.append('limit', String(args.limit || 100));
    const result = await this.request(`/sender_policies?${params.toString()}`);
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(result, null, 2)) }], isError: false };
  }

  private async addSenderPolicy(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.sender || !args.policy_type) {
      return { content: [{ type: 'text', text: 'sender and policy_type are required' }], isError: true };
    }
    const body: Record<string, unknown> = { sender: args.sender, type: args.policy_type };
    if (args.comment) body.comment = args.comment;
    const result = await this.request('/sender_policies', 'POST', body);
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }], isError: false };
  }

  private async removeSenderPolicy(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.sender || !args.policy_type) {
      return { content: [{ type: 'text', text: 'sender and policy_type are required' }], isError: true };
    }
    const params = new URLSearchParams({ sender: String(args.sender), type: String(args.policy_type) });
    const result = await this.request(`/sender_policies?${params.toString()}`, 'DELETE');
    return { content: [{ type: 'text', text: JSON.stringify(result ?? { deleted: true }, null, 2) }], isError: false };
  }

  private async getEmailStats(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.from_date) params.append('from', String(args.from_date));
    if (args.to_date) params.append('to', String(args.to_date));
    if (args.domain) params.append('domain', String(args.domain));
    const result = await this.request(`/stats?${params.toString()}`);
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(result, null, 2)) }], isError: false };
  }

  static catalog() {
    return {
      name: 'barracuda',
      displayName: 'Barracuda Email Security',
      version: '1.0.0',
      category: 'cybersecurity' as const,
      keywords: ['barracuda', 'email-security', 'email-gateway', 'spam', 'phishing', 'malware', 'quarantine', 'dlp', 'email-filtering'],
      toolNames: [
        'list_threats', 'get_threat', 'search_messages', 'get_message',
        'list_quarantined', 'release_quarantine', 'delete_quarantine',
        'list_policies', 'create_policy', 'update_policy', 'delete_policy',
        'list_domains', 'get_domain', 'list_domain_accounts',
        'list_sender_policies', 'add_sender_policy', 'remove_sender_policy',
        'get_email_stats',
      ],
      description: 'Email security gateway: threat detection, quarantine management, sender policies, domain configuration, and email statistics.',
      author: 'protectnil' as const,
    };
  }
}

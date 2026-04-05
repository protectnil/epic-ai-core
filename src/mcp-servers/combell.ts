/**
 * Combell MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// No official Combell MCP server was found on GitHub.
//
// Base URL: https://api.combell.com/v2
// Auth: HMAC-SHA256 (apiKey + HMAC signature in Authorization header)
//   Authorization: hmac {apikey}:{hmac_signature}:{nonce}:{unix_timestamp}
//   HMAC input: apikey + method(lowercase) + urlencode(path+query).lower() + timestamp + nonce + md5_body_base64
// Docs: https://api.combell.com/v2/documentation/swagger-v2.json
// Rate limits: X-RateLimit-Limit, X-RateLimit-Usage, X-RateLimit-Remaining, X-RateLimit-Reset headers

import { createHmac, createHash } from 'crypto';
import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface CombellConfig {
  /**
   * Combell API key. Obtain from your control panel.
   */
  apiKey: string;
  /**
   * Combell API secret. Keep this confidential — used to sign all requests.
   */
  apiSecret: string;
  /** Override the API base URL. Defaults to https://api.combell.com/v2 */
  baseUrl?: string;
}

export class CombellMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly apiSecret: string;
  private readonly baseUrl: string;

  constructor(config: CombellConfig) {
    super();
    this.apiKey = config.apiKey;
    this.apiSecret = config.apiSecret;
    this.baseUrl = config.baseUrl || 'https://api.combell.com/v2';
  }

  private buildAuthHeader(method: string, relativePath: string, body: string = ''): Record<string, string> {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const nonce = Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);

    // Content MD5 (base64 of MD5 hash of body) — only when body is non-empty
    let contentMd5 = '';
    if (body) {
      contentMd5 = createHash('md5').update(body).digest('base64');
    }

    // URL encode the lowercased path (spec: hexadecimal codes MUST be uppercased)
    const encodedPath = encodeURIComponent(relativePath.toLowerCase())
      .replace(/%[a-f0-9]{2}/g, (m) => m.toUpperCase());

    // Concatenate: apikey + method(lower) + encodedPath + timestamp + nonce + contentMd5
    const inputString = `${this.apiKey}${method.toLowerCase()}${encodedPath}${timestamp}${nonce}${contentMd5}`;

    const hmacSignature = createHmac('sha256', this.apiSecret)
      .update(inputString)
      .digest('base64');

    const authParam = `${this.apiKey}:${hmacSignature}:${nonce}:${timestamp}`;

    return {
      Authorization: `hmac ${authParam}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      // --- Accounts ---
      {
        name: 'list_accounts',
        description: 'List all Combell reseller accounts with optional pagination and filtering by asset type or identifier.',
        inputSchema: {
          type: 'object',
          properties: {
            skip: { type: 'number', description: 'Number of items to skip for pagination' },
            take: { type: 'number', description: 'Number of items to return (actual count may be less)' },
            asset_type: { type: 'string', description: 'Filter accounts containing this asset type' },
            identifier: { type: 'string', description: 'Filter accounts matching this identifier (domain name)' },
          },
        },
      },
      {
        name: 'get_account',
        description: 'Get details of a specific Combell account by its ID.',
        inputSchema: {
          type: 'object',
          properties: {
            accountId: { type: 'number', description: 'The numeric account ID' },
          },
          required: ['accountId'],
        },
      },
      {
        name: 'create_account',
        description: 'Create a new Combell account with a servicepack. Returns 202 Accepted; poll the provisioning job for completion.',
        inputSchema: {
          type: 'object',
          properties: {
            identifier: { type: 'string', description: 'Domain name or identifier for the account' },
            servicepack_id: { type: 'string', description: 'The servicepack ID that defines the account type and limits' },
          },
          required: ['identifier', 'servicepack_id'],
        },
      },
      // --- Domains ---
      {
        name: 'list_domains',
        description: 'List all domain names in the Combell reseller account with optional pagination.',
        inputSchema: {
          type: 'object',
          properties: {
            skip: { type: 'number', description: 'Number of items to skip' },
            take: { type: 'number', description: 'Number of items to return' },
          },
        },
      },
      {
        name: 'get_domain',
        description: 'Get details of a specific domain name including registration status and nameservers.',
        inputSchema: {
          type: 'object',
          properties: {
            domainName: { type: 'string', description: 'The domain name (e.g. example.com)' },
          },
          required: ['domainName'],
        },
      },
      {
        name: 'register_domain',
        description: 'Register a new domain name. Returns 202 Accepted; poll provisioning job for completion.',
        inputSchema: {
          type: 'object',
          properties: {
            domain_name: { type: 'string', description: 'The domain name to register (e.g. example.com)' },
            registrant: { type: 'object', description: 'Registrant contact information object' },
          },
          required: ['domain_name', 'registrant'],
        },
      },
      {
        name: 'update_nameservers',
        description: 'Update the nameservers for a domain name.',
        inputSchema: {
          type: 'object',
          properties: {
            domainName: { type: 'string', description: 'The domain name to update' },
            nameservers: {
              type: 'array',
              description: 'Array of nameserver objects with "name" and optional "ip" fields',
            },
          },
          required: ['domainName', 'nameservers'],
        },
      },
      // --- DNS Records ---
      {
        name: 'list_dns_records',
        description: 'List all DNS records for a domain name (A, CNAME, MX, SRV, ALIAS, TXT).',
        inputSchema: {
          type: 'object',
          properties: {
            domainName: { type: 'string', description: 'The domain name to list DNS records for' },
          },
          required: ['domainName'],
        },
      },
      {
        name: 'create_dns_record',
        description: 'Create a new DNS record for a domain name.',
        inputSchema: {
          type: 'object',
          properties: {
            domainName: { type: 'string', description: 'The domain name to add the record to' },
            type: { type: 'string', description: 'Record type: A, AAAA, CNAME, MX, SRV, TXT, ALIAS' },
            host: { type: 'string', description: 'Hostname or subdomain (use @ for root)' },
            content: { type: 'string', description: 'Record value (IP address, target, TXT content, etc.)' },
            ttl: { type: 'number', description: 'Time to live in seconds (default: 3600)' },
            priority: { type: 'number', description: 'Priority for MX or SRV records' },
          },
          required: ['domainName', 'type', 'host', 'content'],
        },
      },
      {
        name: 'get_dns_record',
        description: 'Get details of a specific DNS record by domain name and record ID.',
        inputSchema: {
          type: 'object',
          properties: {
            domainName: { type: 'string', description: 'The domain name' },
            recordId: { type: 'number', description: 'The numeric DNS record ID' },
          },
          required: ['domainName', 'recordId'],
        },
      },
      {
        name: 'update_dns_record',
        description: 'Update an existing DNS record for a domain.',
        inputSchema: {
          type: 'object',
          properties: {
            domainName: { type: 'string', description: 'The domain name' },
            recordId: { type: 'number', description: 'The numeric DNS record ID to update' },
            type: { type: 'string', description: 'Record type: A, AAAA, CNAME, MX, SRV, TXT, ALIAS' },
            host: { type: 'string', description: 'Hostname or subdomain' },
            content: { type: 'string', description: 'New record value' },
            ttl: { type: 'number', description: 'Time to live in seconds' },
            priority: { type: 'number', description: 'Priority for MX or SRV records' },
          },
          required: ['domainName', 'recordId'],
        },
      },
      {
        name: 'delete_dns_record',
        description: 'Delete a DNS record from a domain.',
        inputSchema: {
          type: 'object',
          properties: {
            domainName: { type: 'string', description: 'The domain name' },
            recordId: { type: 'number', description: 'The numeric DNS record ID to delete' },
          },
          required: ['domainName', 'recordId'],
        },
      },
      // --- Linux Hostings ---
      {
        name: 'list_linux_hostings',
        description: 'List all Linux hosting packages in the reseller account.',
        inputSchema: {
          type: 'object',
          properties: {
            skip: { type: 'number', description: 'Number of items to skip' },
            take: { type: 'number', description: 'Number of items to return' },
          },
        },
      },
      {
        name: 'get_linux_hosting',
        description: 'Get details of a specific Linux hosting package by its domain name.',
        inputSchema: {
          type: 'object',
          properties: {
            domainName: { type: 'string', description: 'The domain name of the hosting package' },
          },
          required: ['domainName'],
        },
      },
      // --- Mailboxes ---
      {
        name: 'list_mailboxes',
        description: 'List all mailboxes across the reseller account with optional pagination.',
        inputSchema: {
          type: 'object',
          properties: {
            skip: { type: 'number', description: 'Number of items to skip' },
            take: { type: 'number', description: 'Number of items to return' },
            account_id: { type: 'number', description: 'Filter mailboxes by account ID' },
          },
        },
      },
      {
        name: 'create_mailbox',
        description: 'Create a new mailbox for a domain.',
        inputSchema: {
          type: 'object',
          properties: {
            account_id: { type: 'number', description: 'The account ID to create the mailbox under' },
            mailbox_name: { type: 'string', description: 'The mailbox name (local-part before @)' },
            domain: { type: 'string', description: 'The domain name for the mailbox' },
            password: { type: 'string', description: 'Password for the mailbox' },
          },
          required: ['account_id', 'mailbox_name', 'domain', 'password'],
        },
      },
      // --- MySQL Databases ---
      {
        name: 'list_mysql_databases',
        description: 'List all MySQL databases in the reseller account with optional pagination.',
        inputSchema: {
          type: 'object',
          properties: {
            skip: { type: 'number', description: 'Number of items to skip' },
            take: { type: 'number', description: 'Number of items to return' },
            account_id: { type: 'number', description: 'Filter databases by account ID' },
          },
        },
      },
      // --- Provisioning Jobs ---
      {
        name: 'get_provisioning_job',
        description: 'Check the status of a provisioning job. Returns 200 while ongoing, 201 with resource links when complete.',
        inputSchema: {
          type: 'object',
          properties: {
            jobId: { type: 'string', description: 'The provisioning job ID from a create/transfer operation Location header' },
          },
          required: ['jobId'],
        },
      },
      // --- Servicepacks ---
      {
        name: 'list_servicepacks',
        description: 'List all available Combell servicepacks (hosting plans) for provisioning new accounts.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_accounts':         return await this.listAccounts(args);
        case 'get_account':           return await this.getAccount(args);
        case 'create_account':        return await this.createAccount(args);
        case 'list_domains':          return await this.listDomains(args);
        case 'get_domain':            return await this.getDomain(args);
        case 'register_domain':       return await this.registerDomain(args);
        case 'update_nameservers':    return await this.updateNameservers(args);
        case 'list_dns_records':      return await this.listDnsRecords(args);
        case 'create_dns_record':     return await this.createDnsRecord(args);
        case 'get_dns_record':        return await this.getDnsRecord(args);
        case 'update_dns_record':     return await this.updateDnsRecord(args);
        case 'delete_dns_record':     return await this.deleteDnsRecord(args);
        case 'list_linux_hostings':   return await this.listLinuxHostings(args);
        case 'get_linux_hosting':     return await this.getLinuxHosting(args);
        case 'list_mailboxes':        return await this.listMailboxes(args);
        case 'create_mailbox':        return await this.createMailbox(args);
        case 'list_mysql_databases':  return await this.listMysqlDatabases(args);
        case 'get_provisioning_job':  return await this.getProvisioningJob(args);
        case 'list_servicepacks':     return await this.listServicepacks();
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

  private async apiGet(path: string): Promise<ToolResult> {
    const headers = this.buildAuthHeader('get', `/v2${path}`);
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, { method: 'GET', headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    if (response.status === 204) {
      return { content: [{ type: 'text', text: JSON.stringify({ success: true }) }], isError: false };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apiPost(path: string, body: unknown): Promise<ToolResult> {
    const bodyStr = JSON.stringify(body);
    const headers = this.buildAuthHeader('post', `/v2${path}`, bodyStr);
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers,
      body: bodyStr,
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    // 201 Created or 202 Accepted — return location + any body
    const locationHeader = response.headers.get('Location') || '';
    if (response.status === 202 || response.status === 201) {
      let responseBody: unknown = {};
      try { responseBody = await response.json(); } catch { /* empty body */ }
      return {
        content: [{
          type: 'text',
          text: this.truncate({ status: response.status, location: locationHeader, body: responseBody }),
        }],
        isError: false,
      };
    }
    if (response.status === 204) {
      return { content: [{ type: 'text', text: JSON.stringify({ success: true }) }], isError: false };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apiPut(path: string, body: unknown): Promise<ToolResult> {
    const bodyStr = JSON.stringify(body);
    const headers = this.buildAuthHeader('put', `/v2${path}`, bodyStr);
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'PUT',
      headers,
      body: bodyStr,
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    if (response.status === 204) {
      return { content: [{ type: 'text', text: JSON.stringify({ success: true }) }], isError: false };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apiDelete(path: string): Promise<ToolResult> {
    const headers = this.buildAuthHeader('delete', `/v2${path}`);
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, { method: 'DELETE', headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: JSON.stringify({ success: true }) }], isError: false };
  }

  private buildQuery(args: Record<string, unknown>, keys: string[]): string {
    const params = new URLSearchParams();
    for (const key of keys) {
      if (args[key] !== undefined) params.set(key, String(args[key]));
    }
    return params.toString() ? `?${params.toString()}` : '';
  }

  // --- Accounts ---
  private async listAccounts(args: Record<string, unknown>): Promise<ToolResult> {
    const query = this.buildQuery(args, ['skip', 'take', 'asset_type', 'identifier']);
    return this.apiGet(`/accounts${query}`);
  }

  private async getAccount(args: Record<string, unknown>): Promise<ToolResult> {
    const accountId = args.accountId as number;
    if (accountId === undefined) return { content: [{ type: 'text', text: 'accountId is required' }], isError: true };
    return this.apiGet(`/accounts/${accountId}`);
  }

  private async createAccount(args: Record<string, unknown>): Promise<ToolResult> {
    const { identifier, servicepack_id } = args;
    if (!identifier || !servicepack_id) {
      return { content: [{ type: 'text', text: 'identifier and servicepack_id are required' }], isError: true };
    }
    return this.apiPost('/accounts', { identifier, servicepack_id });
  }

  // --- Domains ---
  private async listDomains(args: Record<string, unknown>): Promise<ToolResult> {
    const query = this.buildQuery(args, ['skip', 'take']);
    return this.apiGet(`/domains${query}`);
  }

  private async getDomain(args: Record<string, unknown>): Promise<ToolResult> {
    const domainName = args.domainName as string;
    if (!domainName) return { content: [{ type: 'text', text: 'domainName is required' }], isError: true };
    return this.apiGet(`/domains/${encodeURIComponent(domainName)}`);
  }

  private async registerDomain(args: Record<string, unknown>): Promise<ToolResult> {
    const { domain_name, registrant } = args;
    if (!domain_name || !registrant) {
      return { content: [{ type: 'text', text: 'domain_name and registrant are required' }], isError: true };
    }
    return this.apiPost('/domains/registrations', { domain_name, registrant });
  }

  private async updateNameservers(args: Record<string, unknown>): Promise<ToolResult> {
    const { domainName, nameservers } = args;
    if (!domainName || !nameservers) {
      return { content: [{ type: 'text', text: 'domainName and nameservers are required' }], isError: true };
    }
    return this.apiPut(`/domains/${encodeURIComponent(domainName as string)}/nameservers`, { nameservers });
  }

  // --- DNS Records ---
  private async listDnsRecords(args: Record<string, unknown>): Promise<ToolResult> {
    const domainName = args.domainName as string;
    if (!domainName) return { content: [{ type: 'text', text: 'domainName is required' }], isError: true };
    return this.apiGet(`/dns/${encodeURIComponent(domainName)}/records`);
  }

  private async createDnsRecord(args: Record<string, unknown>): Promise<ToolResult> {
    const { domainName, type, host, content } = args;
    if (!domainName || !type || !host || !content) {
      return { content: [{ type: 'text', text: 'domainName, type, host, and content are required' }], isError: true };
    }
    const body: Record<string, unknown> = { type, host, content };
    if (args.ttl !== undefined) body.ttl = args.ttl;
    if (args.priority !== undefined) body.priority = args.priority;
    return this.apiPost(`/dns/${encodeURIComponent(domainName as string)}/records`, body);
  }

  private async getDnsRecord(args: Record<string, unknown>): Promise<ToolResult> {
    const { domainName, recordId } = args;
    if (!domainName || recordId === undefined) {
      return { content: [{ type: 'text', text: 'domainName and recordId are required' }], isError: true };
    }
    return this.apiGet(`/dns/${encodeURIComponent(domainName as string)}/records/${recordId}`);
  }

  private async updateDnsRecord(args: Record<string, unknown>): Promise<ToolResult> {
    const { domainName, recordId } = args;
    if (!domainName || recordId === undefined) {
      return { content: [{ type: 'text', text: 'domainName and recordId are required' }], isError: true };
    }
    const body: Record<string, unknown> = {};
    if (args.type) body.type = args.type;
    if (args.host) body.host = args.host;
    if (args.content) body.content = args.content;
    if (args.ttl !== undefined) body.ttl = args.ttl;
    if (args.priority !== undefined) body.priority = args.priority;
    return this.apiPut(`/dns/${encodeURIComponent(domainName as string)}/records/${recordId}`, body);
  }

  private async deleteDnsRecord(args: Record<string, unknown>): Promise<ToolResult> {
    const { domainName, recordId } = args;
    if (!domainName || recordId === undefined) {
      return { content: [{ type: 'text', text: 'domainName and recordId are required' }], isError: true };
    }
    return this.apiDelete(`/dns/${encodeURIComponent(domainName as string)}/records/${recordId}`);
  }

  // --- Linux Hostings ---
  private async listLinuxHostings(args: Record<string, unknown>): Promise<ToolResult> {
    const query = this.buildQuery(args, ['skip', 'take']);
    return this.apiGet(`/linuxhostings${query}`);
  }

  private async getLinuxHosting(args: Record<string, unknown>): Promise<ToolResult> {
    const domainName = args.domainName as string;
    if (!domainName) return { content: [{ type: 'text', text: 'domainName is required' }], isError: true };
    return this.apiGet(`/linuxhostings/${encodeURIComponent(domainName)}`);
  }

  // --- Mailboxes ---
  private async listMailboxes(args: Record<string, unknown>): Promise<ToolResult> {
    const query = this.buildQuery(args, ['skip', 'take', 'account_id']);
    return this.apiGet(`/mailboxes${query}`);
  }

  private async createMailbox(args: Record<string, unknown>): Promise<ToolResult> {
    const { account_id, mailbox_name, domain, password } = args;
    if (!account_id || !mailbox_name || !domain || !password) {
      return { content: [{ type: 'text', text: 'account_id, mailbox_name, domain, and password are required' }], isError: true };
    }
    return this.apiPost('/mailboxes', { account_id, mailbox_name, domain, password });
  }

  // --- MySQL Databases ---
  private async listMysqlDatabases(args: Record<string, unknown>): Promise<ToolResult> {
    const query = this.buildQuery(args, ['skip', 'take', 'account_id']);
    return this.apiGet(`/mysqldatabases${query}`);
  }

  // --- Provisioning Jobs ---
  private async getProvisioningJob(args: Record<string, unknown>): Promise<ToolResult> {
    const jobId = args.jobId as string;
    if (!jobId) return { content: [{ type: 'text', text: 'jobId is required' }], isError: true };
    return this.apiGet(`/provisioningjobs/${encodeURIComponent(jobId)}`);
  }

  // --- Servicepacks ---
  private async listServicepacks(): Promise<ToolResult> {
    return this.apiGet('/servicepacks');
  }

  static catalog() {
    return {
      name: 'combell',
      displayName: 'Combell',
      version: '1.0.0',
      category: 'cloud' as const,
      keywords: ['combell', 'hosting', 'domains', 'dns', 'cloud', 'reseller', 'mailbox'],
      toolNames: [
        'list_accounts', 'get_account', 'create_account',
        'list_domains', 'get_domain', 'register_domain', 'update_nameservers',
        'list_dns_records', 'create_dns_record', 'get_dns_record', 'update_dns_record', 'delete_dns_record',
        'list_linux_hostings', 'get_linux_hosting',
        'list_mailboxes', 'create_mailbox',
        'list_mysql_databases',
        'get_provisioning_job',
        'list_servicepacks',
      ],
      description: 'Combell adapter for the Epic AI Intelligence Platform — manage domains, DNS, hosting, mailboxes, and reseller accounts',
      author: 'protectnil' as const,
    };
  }
}

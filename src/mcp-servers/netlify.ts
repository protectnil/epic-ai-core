/**
 * Netlify MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: No official Netlify vendor MCP exists as of 2026-03.
//   Community: https://github.com/netlify/netlify-mcp — transport: stdio, auth: OAuth2 token, ~10 tools (sites, deploys, env).
//   Our adapter covers: 14 tools across sites, deploys, DNS, env vars, forms, functions.
//   Community MCP is limited and unofficial. Use this adapter for broader coverage.
//
// Base URL: https://api.netlify.com/api/v1
// Auth: Bearer token (OAuth2 personal access token) in Authorization header
// Docs: https://open-api.netlify.com/
// Rate limits: Not publicly documented. Token-scoped. Contact Netlify support for enterprise limits.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface NetlifyConfig {
  accessToken: string;
  /** Optional base URL override (default: https://api.netlify.com/api/v1) */
  baseUrl?: string;
}

export class NetlifyMCPServer extends MCPAdapterBase {
  private readonly accessToken: string;
  private readonly baseUrl: string;

  constructor(config: NetlifyConfig) {
    super();
    this.accessToken = config.accessToken;
    this.baseUrl = config.baseUrl ?? 'https://api.netlify.com/api/v1';
  }

  static catalog() {
    return {
      name: 'netlify',
      displayName: 'Netlify',
      version: '1.0.0',
      category: 'cloud',
      keywords: [
        'netlify', 'deploy', 'hosting', 'site', 'cdn', 'serverless', 'functions',
        'dns', 'domain', 'build', 'continuous-deployment', 'jamstack', 'static',
        'environment', 'forms', 'webhook', 'hook', 'ssl', 'tls',
      ],
      toolNames: [
        'list_sites', 'get_site', 'create_site', 'update_site', 'delete_site',
        'list_deploys', 'get_deploy', 'create_deploy', 'cancel_deploy', 'restore_deploy',
        'list_env_vars', 'get_env_var', 'create_env_vars', 'update_env_var',
        'list_dns_zones', 'create_dns_zone', 'get_dns_zone', 'list_dns_records', 'create_dns_record',
        'list_builds', 'get_build',
        'list_forms', 'list_form_submissions',
        'list_hooks', 'create_hook',
        'get_current_user',
      ],
      description: 'Netlify hosting platform: manage sites, deploys, DNS zones and records, environment variables, build hooks, forms, and webhooks via the Netlify API.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_sites',
        description: 'List all Netlify sites accessible to the authenticated user, with optional filtering by name',
        inputSchema: {
          type: 'object',
          properties: {
            filter: { type: 'string', description: 'Filter sites by name (all, owner, guest — default: all)' },
            page: { type: 'number', description: 'Page number for pagination (default: 1)' },
            per_page: { type: 'number', description: 'Number of results per page (default: 20, max: 100)' },
          },
        },
      },
      {
        name: 'get_site',
        description: 'Get details of a specific Netlify site by site ID, including build settings, domain, and deploy status',
        inputSchema: {
          type: 'object',
          properties: {
            site_id: { type: 'string', description: 'Netlify site ID (UUID or site name)' },
          },
          required: ['site_id'],
        },
      },
      {
        name: 'create_site',
        description: 'Create a new Netlify site with optional custom domain and build settings',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Custom subdomain name (e.g. "my-app" → my-app.netlify.app)' },
            custom_domain: { type: 'string', description: 'Custom domain to assign (e.g. "www.example.com")' },
            repo_url: { type: 'string', description: 'Git repository URL to link to the site' },
          },
        },
      },
      {
        name: 'update_site',
        description: 'Update settings for an existing Netlify site (name, domain, build command, publish directory)',
        inputSchema: {
          type: 'object',
          properties: {
            site_id: { type: 'string', description: 'Netlify site ID' },
            name: { type: 'string', description: 'New subdomain name for the site' },
            custom_domain: { type: 'string', description: 'New custom domain' },
            build_command: { type: 'string', description: 'Build command (e.g. "npm run build")' },
            publish_dir: { type: 'string', description: 'Publish directory (e.g. "dist" or "public")' },
          },
          required: ['site_id'],
        },
      },
      {
        name: 'delete_site',
        description: 'Permanently delete a Netlify site and all its deploys',
        inputSchema: {
          type: 'object',
          properties: {
            site_id: { type: 'string', description: 'Netlify site ID to delete' },
          },
          required: ['site_id'],
        },
      },
      {
        name: 'list_deploys',
        description: 'List all deploys for a Netlify site, including build status and deploy times',
        inputSchema: {
          type: 'object',
          properties: {
            site_id: { type: 'string', description: 'Netlify site ID' },
            page: { type: 'number', description: 'Page number for pagination' },
            per_page: { type: 'number', description: 'Results per page (max 100)' },
          },
          required: ['site_id'],
        },
      },
      {
        name: 'get_deploy',
        description: 'Get details of a specific deploy including build log, deploy URL, and file manifest',
        inputSchema: {
          type: 'object',
          properties: {
            deploy_id: { type: 'string', description: 'Deploy ID' },
          },
          required: ['deploy_id'],
        },
      },
      {
        name: 'create_deploy',
        description: 'Create a new deploy for a Netlify site (triggers a new build from the linked repository)',
        inputSchema: {
          type: 'object',
          properties: {
            site_id: { type: 'string', description: 'Netlify site ID' },
            title: { type: 'string', description: 'Optional deploy title / commit message' },
            branch: { type: 'string', description: 'Branch to deploy (uses site default if omitted)' },
          },
          required: ['site_id'],
        },
      },
      {
        name: 'cancel_deploy',
        description: 'Cancel an in-progress deploy for a Netlify site',
        inputSchema: {
          type: 'object',
          properties: {
            deploy_id: { type: 'string', description: 'Deploy ID to cancel' },
          },
          required: ['deploy_id'],
        },
      },
      {
        name: 'restore_deploy',
        description: 'Restore (rollback) a Netlify site to a previous deploy, making it the live version',
        inputSchema: {
          type: 'object',
          properties: {
            site_id: { type: 'string', description: 'Netlify site ID' },
            deploy_id: { type: 'string', description: 'Deploy ID to restore/rollback to' },
          },
          required: ['site_id', 'deploy_id'],
        },
      },
      {
        name: 'list_env_vars',
        description: 'List all environment variables for a Netlify account or site',
        inputSchema: {
          type: 'object',
          properties: {
            account_id: { type: 'string', description: 'Account ID (slug) that owns the environment variables' },
            site_id: { type: 'string', description: 'Optional site ID to filter env vars to a specific site' },
            context_name: { type: 'string', description: 'Filter by context: all, dev, branch-deploy, deploy-preview, production, branch (default: all)' },
          },
          required: ['account_id'],
        },
      },
      {
        name: 'get_env_var',
        description: 'Get a single environment variable by key for a Netlify account or site',
        inputSchema: {
          type: 'object',
          properties: {
            account_id: { type: 'string', description: 'Account ID (slug)' },
            key: { type: 'string', description: 'Environment variable key name' },
            site_id: { type: 'string', description: 'Optional site ID to scope to a specific site' },
          },
          required: ['account_id', 'key'],
        },
      },
      {
        name: 'create_env_vars',
        description: 'Create one or more environment variables for a Netlify account or site',
        inputSchema: {
          type: 'object',
          properties: {
            account_id: { type: 'string', description: 'Account ID (slug)' },
            site_id: { type: 'string', description: 'Optional site ID to scope to a specific site' },
            env_vars: {
              type: 'array',
              description: 'Array of environment variables to create',
              items: {
                type: 'object',
                properties: {
                  key: { type: 'string', description: 'Variable key name' },
                  values: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        value: { type: 'string', description: 'Variable value' },
                        context: { type: 'string', description: 'Context: all, production, deploy-preview, branch-deploy, dev, branch' },
                      },
                    },
                  },
                },
              },
            },
          },
          required: ['account_id', 'env_vars'],
        },
      },
      {
        name: 'update_env_var',
        description: 'Update an existing environment variable key and all its values for a Netlify account or site',
        inputSchema: {
          type: 'object',
          properties: {
            account_id: { type: 'string', description: 'Account ID (slug)' },
            key: { type: 'string', description: 'Existing environment variable key to update' },
            site_id: { type: 'string', description: 'Optional site ID to scope to a specific site' },
            new_key: { type: 'string', description: 'New key name (if renaming the variable)' },
            values: {
              type: 'array',
              description: 'New values for the environment variable',
              items: {
                type: 'object',
                properties: {
                  value: { type: 'string' },
                  context: { type: 'string' },
                },
              },
            },
          },
          required: ['account_id', 'key'],
        },
      },
      {
        name: 'list_dns_zones',
        description: 'List all DNS zones managed by Netlify for the authenticated account',
        inputSchema: {
          type: 'object',
          properties: {
            account_slug: { type: 'string', description: 'Account slug to filter DNS zones (optional)' },
          },
        },
      },
      {
        name: 'create_dns_zone',
        description: 'Create a new DNS zone in Netlify for a domain',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Domain name for the DNS zone (e.g. "example.com")' },
            account_slug: { type: 'string', description: 'Account slug to create the zone in' },
          },
          required: ['name'],
        },
      },
      {
        name: 'get_dns_zone',
        description: 'Get details of a specific Netlify DNS zone including nameservers and records count',
        inputSchema: {
          type: 'object',
          properties: {
            zone_id: { type: 'string', description: 'DNS zone ID' },
          },
          required: ['zone_id'],
        },
      },
      {
        name: 'list_dns_records',
        description: 'List all DNS records in a Netlify DNS zone (A, CNAME, MX, TXT, etc.)',
        inputSchema: {
          type: 'object',
          properties: {
            zone_id: { type: 'string', description: 'DNS zone ID' },
          },
          required: ['zone_id'],
        },
      },
      {
        name: 'create_dns_record',
        description: 'Create a DNS record in a Netlify DNS zone (A, AAAA, CNAME, MX, TXT, NS, SRV)',
        inputSchema: {
          type: 'object',
          properties: {
            zone_id: { type: 'string', description: 'DNS zone ID' },
            type: { type: 'string', description: 'Record type: A, AAAA, CNAME, MX, TXT, NS, SRV, CAA, SPF, SSHFP' },
            hostname: { type: 'string', description: 'Hostname for the record (use @ for root)' },
            value: { type: 'string', description: 'Record value (IP address, hostname, or text content)' },
            ttl: { type: 'number', description: 'Time to live in seconds (default: 3600)' },
            priority: { type: 'number', description: 'Priority for MX and SRV records' },
          },
          required: ['zone_id', 'type', 'hostname', 'value'],
        },
      },
      {
        name: 'list_builds',
        description: 'List all builds for a Netlify site with build status and timing information',
        inputSchema: {
          type: 'object',
          properties: {
            site_id: { type: 'string', description: 'Netlify site ID' },
            page: { type: 'number', description: 'Page number for pagination' },
            per_page: { type: 'number', description: 'Results per page (max 100)' },
          },
          required: ['site_id'],
        },
      },
      {
        name: 'get_build',
        description: 'Get details of a specific Netlify build including build log and duration',
        inputSchema: {
          type: 'object',
          properties: {
            build_id: { type: 'string', description: 'Build ID' },
          },
          required: ['build_id'],
        },
      },
      {
        name: 'list_forms',
        description: 'List all Netlify forms for a site that capture form submissions',
        inputSchema: {
          type: 'object',
          properties: {
            site_id: { type: 'string', description: 'Netlify site ID' },
          },
          required: ['site_id'],
        },
      },
      {
        name: 'list_form_submissions',
        description: 'List form submissions for a Netlify form, with optional date range filtering',
        inputSchema: {
          type: 'object',
          properties: {
            form_id: { type: 'string', description: 'Form ID to list submissions for' },
            page: { type: 'number', description: 'Page number for pagination' },
            per_page: { type: 'number', description: 'Results per page (max 100)' },
          },
          required: ['form_id'],
        },
      },
      {
        name: 'list_hooks',
        description: 'List all notification hooks (webhooks) configured for a Netlify site',
        inputSchema: {
          type: 'object',
          properties: {
            site_id: { type: 'string', description: 'Netlify site ID to list hooks for' },
          },
          required: ['site_id'],
        },
      },
      {
        name: 'create_hook',
        description: 'Create a notification hook (webhook) for a Netlify site to trigger on deploy events',
        inputSchema: {
          type: 'object',
          properties: {
            site_id: { type: 'string', description: 'Netlify site ID to attach the hook to' },
            type: { type: 'string', description: 'Hook type (e.g. "url", "slack", "email")' },
            event: { type: 'string', description: 'Event to trigger on: deploy-created, deploy-building, deploy-ready, deploy-failed' },
            data: { type: 'object', description: 'Hook configuration data (e.g. {"url": "https://example.com/webhook"} for URL hooks)' },
          },
          required: ['site_id', 'type', 'event', 'data'],
        },
      },
      {
        name: 'get_current_user',
        description: 'Get the profile of the currently authenticated Netlify user including account details',
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
        case 'list_sites': return this.listSites(args);
        case 'get_site': return this.getSite(args);
        case 'create_site': return this.createSite(args);
        case 'update_site': return this.updateSite(args);
        case 'delete_site': return this.deleteSite(args);
        case 'list_deploys': return this.listDeploys(args);
        case 'get_deploy': return this.getDeploy(args);
        case 'create_deploy': return this.createDeploy(args);
        case 'cancel_deploy': return this.cancelDeploy(args);
        case 'restore_deploy': return this.restoreDeploy(args);
        case 'list_env_vars': return this.listEnvVars(args);
        case 'get_env_var': return this.getEnvVar(args);
        case 'create_env_vars': return this.createEnvVars(args);
        case 'update_env_var': return this.updateEnvVar(args);
        case 'list_dns_zones': return this.listDnsZones(args);
        case 'create_dns_zone': return this.createDnsZone(args);
        case 'get_dns_zone': return this.getDnsZone(args);
        case 'list_dns_records': return this.listDnsRecords(args);
        case 'create_dns_record': return this.createDnsRecord(args);
        case 'list_builds': return this.listBuilds(args);
        case 'get_build': return this.getBuild(args);
        case 'list_forms': return this.listForms(args);
        case 'list_form_submissions': return this.listFormSubmissions(args);
        case 'list_hooks': return this.listHooks(args);
        case 'create_hook': return this.createHook(args);
        case 'get_current_user': return this.getCurrentUser();
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

  private buildUrl(path: string, params: Record<string, string | number | undefined> = {}): string {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) qs.set(k, String(v));
    }
    const queryString = qs.toString();
    return `${this.baseUrl}${path}${queryString ? `?${queryString}` : ''}`;
  }

  private headers(extra: Record<string, string> = {}): Record<string, string> {
    return {
      Authorization: `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
      ...extra,
    };
  }

  private async request(
    method: string,
    path: string,
    params: Record<string, string | number | undefined> = {},
    body?: unknown,
  ): Promise<ToolResult> {
    const url = this.buildUrl(path, params);
    const init: RequestInit = {
      method,
      headers: this.headers(),
    };
    if (body !== undefined) init.body = JSON.stringify(body);
    const response = await this.fetchWithRetry(url, init);
    if (response.status === 204) return { content: [{ type: 'text', text: 'Success (no content)' }], isError: false };
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `API error: ${response.status} ${errText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Netlify returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listSites(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request('GET', '/sites', {
      filter: args.filter as string | undefined,
      page: args.page as number | undefined,
      per_page: args.per_page as number | undefined,
    });
  }

  private async getSite(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.site_id) return { content: [{ type: 'text', text: 'site_id is required' }], isError: true };
    return this.request('GET', `/sites/${encodeURIComponent(args.site_id as string)}`);
  }

  private async createSite(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {};
    if (args.name) body.name = args.name;
    if (args.custom_domain) body.custom_domain = args.custom_domain;
    if (args.repo_url) body.repo = { repo_url: args.repo_url };
    return this.request('POST', '/sites', {}, body);
  }

  private async updateSite(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.site_id) return { content: [{ type: 'text', text: 'site_id is required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.name) body.name = args.name;
    if (args.custom_domain) body.custom_domain = args.custom_domain;
    if (args.build_command || args.publish_dir) {
      body.build_settings = {};
      if (args.build_command) (body.build_settings as Record<string, unknown>).cmd = args.build_command;
      if (args.publish_dir) (body.build_settings as Record<string, unknown>).dir = args.publish_dir;
    }
    return this.request('PATCH', `/sites/${encodeURIComponent(args.site_id as string)}`, {}, body);
  }

  private async deleteSite(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.site_id) return { content: [{ type: 'text', text: 'site_id is required' }], isError: true };
    return this.request('DELETE', `/sites/${encodeURIComponent(args.site_id as string)}`);
  }

  private async listDeploys(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.site_id) return { content: [{ type: 'text', text: 'site_id is required' }], isError: true };
    return this.request('GET', `/sites/${encodeURIComponent(args.site_id as string)}/deploys`, {
      page: args.page as number | undefined,
      per_page: args.per_page as number | undefined,
    });
  }

  private async getDeploy(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.deploy_id) return { content: [{ type: 'text', text: 'deploy_id is required' }], isError: true };
    return this.request('GET', `/deploys/${encodeURIComponent(args.deploy_id as string)}`);
  }

  private async createDeploy(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.site_id) return { content: [{ type: 'text', text: 'site_id is required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.title) body.title = args.title;
    if (args.branch) body.branch = args.branch;
    return this.request('POST', `/sites/${encodeURIComponent(args.site_id as string)}/deploys`, {}, body);
  }

  private async cancelDeploy(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.deploy_id) return { content: [{ type: 'text', text: 'deploy_id is required' }], isError: true };
    return this.request('POST', `/deploys/${encodeURIComponent(args.deploy_id as string)}/cancel`);
  }

  private async restoreDeploy(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.site_id) return { content: [{ type: 'text', text: 'site_id is required' }], isError: true };
    if (!args.deploy_id) return { content: [{ type: 'text', text: 'deploy_id is required' }], isError: true };
    return this.request('POST', `/sites/${encodeURIComponent(args.site_id as string)}/deploys/${encodeURIComponent(args.deploy_id as string)}/restore`);
  }

  private async listEnvVars(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.account_id) return { content: [{ type: 'text', text: 'account_id is required' }], isError: true };
    return this.request('GET', `/accounts/${encodeURIComponent(args.account_id as string)}/env`, {
      site_id: args.site_id as string | undefined,
      context_name: args.context_name as string | undefined,
    });
  }

  private async getEnvVar(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.account_id) return { content: [{ type: 'text', text: 'account_id is required' }], isError: true };
    if (!args.key) return { content: [{ type: 'text', text: 'key is required' }], isError: true };
    return this.request('GET', `/accounts/${encodeURIComponent(args.account_id as string)}/env/${encodeURIComponent(args.key as string)}`, {
      site_id: args.site_id as string | undefined,
    });
  }

  private async createEnvVars(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.account_id) return { content: [{ type: 'text', text: 'account_id is required' }], isError: true };
    if (!args.env_vars) return { content: [{ type: 'text', text: 'env_vars array is required' }], isError: true };
    const params: Record<string, string | number | undefined> = {};
    if (args.site_id) params.site_id = args.site_id as string;
    return this.request('POST', `/accounts/${encodeURIComponent(args.account_id as string)}/env`, params, args.env_vars);
  }

  private async updateEnvVar(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.account_id) return { content: [{ type: 'text', text: 'account_id is required' }], isError: true };
    if (!args.key) return { content: [{ type: 'text', text: 'key is required' }], isError: true };
    const params: Record<string, string | number | undefined> = {};
    if (args.site_id) params.site_id = args.site_id as string;
    const body: Record<string, unknown> = {};
    if (args.new_key) body.key = args.new_key;
    if (args.values) body.values = args.values;
    return this.request('PUT', `/accounts/${encodeURIComponent(args.account_id as string)}/env/${encodeURIComponent(args.key as string)}`, params, body);
  }

  private async listDnsZones(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request('GET', '/dns_zones', {
      account_slug: args.account_slug as string | undefined,
    });
  }

  private async createDnsZone(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name) return { content: [{ type: 'text', text: 'name is required' }], isError: true };
    const body: Record<string, unknown> = { name: args.name };
    if (args.account_slug) body.account_slug = args.account_slug;
    return this.request('POST', '/dns_zones', {}, body);
  }

  private async getDnsZone(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.zone_id) return { content: [{ type: 'text', text: 'zone_id is required' }], isError: true };
    return this.request('GET', `/dns_zones/${encodeURIComponent(args.zone_id as string)}`);
  }

  private async listDnsRecords(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.zone_id) return { content: [{ type: 'text', text: 'zone_id is required' }], isError: true };
    return this.request('GET', `/dns_zones/${encodeURIComponent(args.zone_id as string)}/dns_records`);
  }

  private async createDnsRecord(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.zone_id) return { content: [{ type: 'text', text: 'zone_id is required' }], isError: true };
    if (!args.type) return { content: [{ type: 'text', text: 'type is required' }], isError: true };
    if (!args.hostname) return { content: [{ type: 'text', text: 'hostname is required' }], isError: true };
    if (!args.value) return { content: [{ type: 'text', text: 'value is required' }], isError: true };
    const body: Record<string, unknown> = {
      type: args.type,
      hostname: args.hostname,
      value: args.value,
    };
    if (args.ttl !== undefined) body.ttl = args.ttl;
    if (args.priority !== undefined) body.priority = args.priority;
    return this.request('POST', `/dns_zones/${encodeURIComponent(args.zone_id as string)}/dns_records`, {}, body);
  }

  private async listBuilds(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.site_id) return { content: [{ type: 'text', text: 'site_id is required' }], isError: true };
    return this.request('GET', `/sites/${encodeURIComponent(args.site_id as string)}/builds`, {
      page: args.page as number | undefined,
      per_page: args.per_page as number | undefined,
    });
  }

  private async getBuild(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.build_id) return { content: [{ type: 'text', text: 'build_id is required' }], isError: true };
    return this.request('GET', `/builds/${encodeURIComponent(args.build_id as string)}`);
  }

  private async listForms(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.site_id) return { content: [{ type: 'text', text: 'site_id is required' }], isError: true };
    return this.request('GET', `/sites/${encodeURIComponent(args.site_id as string)}/forms`);
  }

  private async listFormSubmissions(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.form_id) return { content: [{ type: 'text', text: 'form_id is required' }], isError: true };
    return this.request('GET', `/forms/${encodeURIComponent(args.form_id as string)}/submissions`, {
      page: args.page as number | undefined,
      per_page: args.per_page as number | undefined,
    });
  }

  private async listHooks(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.site_id) return { content: [{ type: 'text', text: 'site_id is required' }], isError: true };
    return this.request('GET', '/hooks', { site_id: args.site_id as string });
  }

  private async createHook(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.site_id) return { content: [{ type: 'text', text: 'site_id is required' }], isError: true };
    if (!args.type) return { content: [{ type: 'text', text: 'type is required' }], isError: true };
    if (!args.event) return { content: [{ type: 'text', text: 'event is required' }], isError: true };
    if (!args.data) return { content: [{ type: 'text', text: 'data is required' }], isError: true };
    return this.request('POST', '/hooks', { site_id: args.site_id as string }, {
      type: args.type,
      event: args.event,
      data: args.data,
    });
  }

  private async getCurrentUser(): Promise<ToolResult> {
    return this.request('GET', '/user');
  }
}

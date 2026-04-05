/**
 * DigitalOcean MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/digitalocean-labs/mcp-digitalocean (npm: @digitalocean/mcp)
//   Actively maintained by DigitalOcean Labs. Transport: stdio (local) + streamable-HTTP (remote).
//   Auth: DIGITALOCEAN_API_TOKEN env var (local) or Authorization: Bearer header (remote).
//   Remote MCP endpoints: apps.mcp.digitalocean.com, droplets.mcp.digitalocean.com, etc.
//   Vendor MCP covers: 60+ tools across Accounts, Apps, DBaaS, DOKS, Droplets, Insights,
//   Marketplace, Networking, Spaces (domains, firewalls, LBs, VPCs, CDN, reserved IPs).
// Our adapter covers: 26 tools (core cloud operations for orchestration use cases).
// Recommendation: Use vendor MCP for full coverage in development environments.
//   Use this adapter for air-gapped or production deployments needing controlled tool surface.
//
// Base URL: https://api.digitalocean.com/v2
// Auth: Bearer token — Authorization: Bearer {personal_access_token}
//   Generate at https://cloud.digitalocean.com/account/api/tokens
// Docs: https://docs.digitalocean.com/reference/api/api-reference/
//       https://docs.digitalocean.com/reference/api/
// Rate limits: 5,000 req/hr per token. Some endpoints have lower limits (e.g. create_droplet).

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface DigitalOceanConfig {
  /** Personal access token from cloud.digitalocean.com/account/api/tokens */
  token: string;
  /** Override base URL; defaults to https://api.digitalocean.com/v2 */
  baseUrl?: string;
}

export class DigitalOceanMCPServer extends MCPAdapterBase {
  private readonly token: string;
  private readonly baseUrl: string;

  constructor(config: DigitalOceanConfig) {
    super();
    this.token = config.token;
    this.baseUrl = (config.baseUrl || 'https://api.digitalocean.com/v2').replace(/\/$/, '');
  }

  static catalog() {
    return {
      name: 'digitalocean',
      displayName: 'DigitalOcean',
      version: '1.0.0',
      category: 'cloud' as const,
      keywords: ['digitalocean', 'do', 'droplet', 'vps', 'cloud', 'kubernetes', 'doks', 'app-platform', 'spaces', 'database', 'load-balancer', 'firewall', 'domain', 'volume', 'snapshot', 'cdn'],
      toolNames: [
        'list_droplets', 'get_droplet', 'create_droplet', 'delete_droplet', 'reboot_droplet',
        'power_off_droplet', 'power_on_droplet',
        'list_apps', 'get_app', 'create_app_deployment', 'list_app_deployments',
        'list_kubernetes_clusters', 'get_kubernetes_cluster',
        'list_databases', 'get_database_cluster',
        'list_domains', 'get_domain', 'create_domain', 'delete_domain',
        'list_domain_records', 'create_domain_record', 'delete_domain_record',
        'list_firewalls', 'list_load_balancers',
        'list_volumes', 'list_snapshots',
      ],
      description: 'Manage DigitalOcean infrastructure: Droplets, App Platform, Kubernetes, managed databases, domains, DNS records, firewalls, load balancers, volumes, and snapshots.',
      author: 'protectnil',
    };
  }

  private get headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.token}`,
      'Content-Type': 'application/json',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      // Droplets
      {
        name: 'list_droplets',
        description: 'List all Droplets (cloud VMs) in the account, with optional tag name filter and pagination.',
        inputSchema: {
          type: 'object',
          properties: {
            tag_name: {
              type: 'string',
              description: 'Filter Droplets by a tag name (optional).',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1).',
            },
            per_page: {
              type: 'number',
              description: 'Number of results per page (default: 20, max: 200).',
            },
          },
        },
      },
      {
        name: 'get_droplet',
        description: 'Retrieve full details for a specific Droplet by its numeric ID, including size, region, image, and networks.',
        inputSchema: {
          type: 'object',
          properties: {
            droplet_id: {
              type: 'number',
              description: 'Numeric ID of the Droplet.',
            },
          },
          required: ['droplet_id'],
        },
      },
      {
        name: 'create_droplet',
        description: 'Create a new DigitalOcean Droplet with specified size, region, image, and optional SSH keys, tags, and user data.',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Hostname for the Droplet.',
            },
            region: {
              type: 'string',
              description: 'Region slug (e.g. nyc3, sfo3, ams3, sgp1, lon1, fra1).',
            },
            size: {
              type: 'string',
              description: 'Droplet size slug (e.g. s-1vcpu-1gb, s-2vcpu-4gb, c-4).',
            },
            image: {
              type: 'string',
              description: 'Image slug or numeric ID (e.g. ubuntu-22-04-x64, debian-11-x64).',
            },
            ssh_keys: {
              type: 'array',
              description: 'Array of SSH key fingerprints or numeric IDs to embed.',
              items: { type: 'string' },
            },
            tags: {
              type: 'array',
              description: 'Array of tag strings to apply to the new Droplet.',
              items: { type: 'string' },
            },
            backups: {
              type: 'boolean',
              description: 'Enable automated weekly backups (default: false).',
            },
            ipv6: {
              type: 'boolean',
              description: 'Enable IPv6 networking (default: false).',
            },
            monitoring: {
              type: 'boolean',
              description: 'Enable DigitalOcean monitoring agent (default: false).',
            },
            user_data: {
              type: 'string',
              description: 'Cloud-Init user data script to run on first boot.',
            },
            vpc_uuid: {
              type: 'string',
              description: 'UUID of a VPC to place the Droplet in (optional).',
            },
          },
          required: ['name', 'region', 'size', 'image'],
        },
      },
      {
        name: 'delete_droplet',
        description: 'Permanently delete a Droplet by its numeric ID. This action cannot be undone.',
        inputSchema: {
          type: 'object',
          properties: {
            droplet_id: {
              type: 'number',
              description: 'Numeric ID of the Droplet to delete.',
            },
          },
          required: ['droplet_id'],
        },
      },
      {
        name: 'reboot_droplet',
        description: 'Reboot a Droplet gracefully by its numeric ID.',
        inputSchema: {
          type: 'object',
          properties: {
            droplet_id: {
              type: 'number',
              description: 'Numeric ID of the Droplet to reboot.',
            },
          },
          required: ['droplet_id'],
        },
      },
      {
        name: 'power_off_droplet',
        description: 'Power off a Droplet by its numeric ID (hard power-off, equivalent to pulling the plug).',
        inputSchema: {
          type: 'object',
          properties: {
            droplet_id: {
              type: 'number',
              description: 'Numeric ID of the Droplet to power off.',
            },
          },
          required: ['droplet_id'],
        },
      },
      {
        name: 'power_on_droplet',
        description: 'Power on a Droplet that is currently powered off, by its numeric ID.',
        inputSchema: {
          type: 'object',
          properties: {
            droplet_id: {
              type: 'number',
              description: 'Numeric ID of the Droplet to power on.',
            },
          },
          required: ['droplet_id'],
        },
      },
      // App Platform
      {
        name: 'list_apps',
        description: 'List all App Platform apps in the account, with optional pagination.',
        inputSchema: {
          type: 'object',
          properties: {
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1).',
            },
            per_page: {
              type: 'number',
              description: 'Number of results per page (default: 20, max: 200).',
            },
          },
        },
      },
      {
        name: 'get_app',
        description: 'Retrieve details for a specific App Platform app by its UUID, including spec, active deployment, and live URL.',
        inputSchema: {
          type: 'object',
          properties: {
            app_id: {
              type: 'string',
              description: 'UUID of the App Platform app.',
            },
          },
          required: ['app_id'],
        },
      },
      {
        name: 'create_app_deployment',
        description: 'Trigger a new deployment for an existing App Platform app.',
        inputSchema: {
          type: 'object',
          properties: {
            app_id: {
              type: 'string',
              description: 'UUID of the App Platform app to deploy.',
            },
            force_build: {
              type: 'boolean',
              description: 'Force a rebuild even if nothing has changed (default: false).',
            },
          },
          required: ['app_id'],
        },
      },
      {
        name: 'list_app_deployments',
        description: 'List all deployments for a specific App Platform app, including deployment status and timestamps.',
        inputSchema: {
          type: 'object',
          properties: {
            app_id: {
              type: 'string',
              description: 'UUID of the App Platform app.',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1).',
            },
            per_page: {
              type: 'number',
              description: 'Number of results per page (default: 20).',
            },
          },
          required: ['app_id'],
        },
      },
      // Kubernetes
      {
        name: 'list_kubernetes_clusters',
        description: 'List all Kubernetes (DOKS) clusters in the account, including status, version, and node pool info.',
        inputSchema: {
          type: 'object',
          properties: {
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1).',
            },
            per_page: {
              type: 'number',
              description: 'Number of results per page (default: 20, max: 200).',
            },
          },
        },
      },
      {
        name: 'get_kubernetes_cluster',
        description: 'Retrieve full details for a specific DOKS cluster by UUID, including node pools, endpoint, and kubeconfig status.',
        inputSchema: {
          type: 'object',
          properties: {
            cluster_id: {
              type: 'string',
              description: 'UUID of the Kubernetes cluster.',
            },
          },
          required: ['cluster_id'],
        },
      },
      // Managed Databases
      {
        name: 'list_databases',
        description: 'List all managed database clusters in the account, including engine type, status, and region.',
        inputSchema: {
          type: 'object',
          properties: {
            engine: {
              type: 'string',
              description: 'Filter by database engine: pg (PostgreSQL), mysql, redis, mongodb, kafka, opensearch (optional).',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1).',
            },
            per_page: {
              type: 'number',
              description: 'Number of results per page (default: 20, max: 200).',
            },
          },
        },
      },
      {
        name: 'get_database_cluster',
        description: 'Retrieve full details for a specific managed database cluster by UUID, including connection strings and replica info.',
        inputSchema: {
          type: 'object',
          properties: {
            database_cluster_id: {
              type: 'string',
              description: 'UUID of the managed database cluster.',
            },
          },
          required: ['database_cluster_id'],
        },
      },
      // Domains & DNS
      {
        name: 'list_domains',
        description: 'List all domains managed in the DigitalOcean account DNS, with optional pagination.',
        inputSchema: {
          type: 'object',
          properties: {
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1).',
            },
            per_page: {
              type: 'number',
              description: 'Number of results per page (default: 20, max: 200).',
            },
          },
        },
      },
      {
        name: 'get_domain',
        description: 'Retrieve details for a specific domain by its name, including TTL and zone file.',
        inputSchema: {
          type: 'object',
          properties: {
            domain_name: {
              type: 'string',
              description: 'Domain name (e.g. "example.com").',
            },
          },
          required: ['domain_name'],
        },
      },
      {
        name: 'create_domain',
        description: 'Add a domain to the DigitalOcean DNS management system, optionally pointing to a Droplet IP.',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Domain name to add (e.g. "example.com").',
            },
            ip_address: {
              type: 'string',
              description: 'IPv4 address to create an initial A record pointing to (optional).',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'delete_domain',
        description: 'Delete a domain and all its DNS records from DigitalOcean DNS management.',
        inputSchema: {
          type: 'object',
          properties: {
            domain_name: {
              type: 'string',
              description: 'Domain name to delete (e.g. "example.com").',
            },
          },
          required: ['domain_name'],
        },
      },
      {
        name: 'list_domain_records',
        description: 'List all DNS records for a domain, with optional record type filter and pagination.',
        inputSchema: {
          type: 'object',
          properties: {
            domain_name: {
              type: 'string',
              description: 'Domain name to list records for.',
            },
            type: {
              type: 'string',
              description: 'Filter by DNS record type: A, AAAA, CNAME, MX, TXT, NS, SRV, CAA (optional).',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1).',
            },
            per_page: {
              type: 'number',
              description: 'Number of results per page (default: 20).',
            },
          },
          required: ['domain_name'],
        },
      },
      {
        name: 'create_domain_record',
        description: 'Create a new DNS record for a domain (A, AAAA, CNAME, MX, TXT, NS, SRV, CAA).',
        inputSchema: {
          type: 'object',
          properties: {
            domain_name: {
              type: 'string',
              description: 'Domain name to add the record to.',
            },
            type: {
              type: 'string',
              description: 'DNS record type: A, AAAA, CNAME, MX, TXT, NS, SRV, CAA.',
            },
            name: {
              type: 'string',
              description: 'Subdomain or "@" for root (e.g. "www", "@", "mail").',
            },
            data: {
              type: 'string',
              description: 'Record data — IP for A/AAAA, hostname for CNAME/MX/NS, text for TXT.',
            },
            priority: {
              type: 'number',
              description: 'Priority for MX and SRV records (optional).',
            },
            port: {
              type: 'number',
              description: 'Port for SRV records (optional).',
            },
            ttl: {
              type: 'number',
              description: 'Time to live in seconds (default: 1800).',
            },
            weight: {
              type: 'number',
              description: 'Weight for SRV records (optional).',
            },
            flags: {
              type: 'number',
              description: 'Flags for CAA records (optional).',
            },
            tag: {
              type: 'string',
              description: 'Tag for CAA records: issue, issuewild, iodef (optional).',
            },
          },
          required: ['domain_name', 'type', 'name', 'data'],
        },
      },
      {
        name: 'delete_domain_record',
        description: 'Delete a specific DNS record from a domain by its numeric record ID.',
        inputSchema: {
          type: 'object',
          properties: {
            domain_name: {
              type: 'string',
              description: 'Domain name the record belongs to.',
            },
            record_id: {
              type: 'number',
              description: 'Numeric ID of the DNS record to delete.',
            },
          },
          required: ['domain_name', 'record_id'],
        },
      },
      // Networking
      {
        name: 'list_firewalls',
        description: 'List all cloud firewalls in the account, including inbound/outbound rules and attached Droplets.',
        inputSchema: {
          type: 'object',
          properties: {
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1).',
            },
            per_page: {
              type: 'number',
              description: 'Number of results per page (default: 20, max: 200).',
            },
          },
        },
      },
      {
        name: 'list_load_balancers',
        description: 'List all load balancers in the account, including forwarding rules, health checks, and attached Droplets.',
        inputSchema: {
          type: 'object',
          properties: {
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1).',
            },
            per_page: {
              type: 'number',
              description: 'Number of results per page (default: 20, max: 200).',
            },
          },
        },
      },
      // Storage
      {
        name: 'list_volumes',
        description: 'List all block storage volumes in the account, with optional region filter and pagination.',
        inputSchema: {
          type: 'object',
          properties: {
            region: {
              type: 'string',
              description: 'Filter volumes by region slug (e.g. nyc1, sfo3, optional).',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1).',
            },
            per_page: {
              type: 'number',
              description: 'Number of results per page (default: 20, max: 200).',
            },
          },
        },
      },
      {
        name: 'list_snapshots',
        description: 'List all snapshots in the account, with optional filter for Droplet or volume snapshots.',
        inputSchema: {
          type: 'object',
          properties: {
            resource_type: {
              type: 'string',
              description: 'Filter by snapshot type: droplet or volume (optional, returns all if omitted).',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1).',
            },
            per_page: {
              type: 'number',
              description: 'Number of results per page (default: 20, max: 200).',
            },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_droplets':
          return await this.listDroplets(args);
        case 'get_droplet':
          return await this.getDroplet(args);
        case 'create_droplet':
          return await this.createDroplet(args);
        case 'delete_droplet':
          return await this.deleteDroplet(args);
        case 'reboot_droplet':
          return await this.dropletAction(args, 'reboot');
        case 'power_off_droplet':
          return await this.dropletAction(args, 'power_off');
        case 'power_on_droplet':
          return await this.dropletAction(args, 'power_on');
        case 'list_apps':
          return await this.listApps(args);
        case 'get_app':
          return await this.getApp(args);
        case 'create_app_deployment':
          return await this.createAppDeployment(args);
        case 'list_app_deployments':
          return await this.listAppDeployments(args);
        case 'list_kubernetes_clusters':
          return await this.listKubernetesClusters(args);
        case 'get_kubernetes_cluster':
          return await this.getKubernetesCluster(args);
        case 'list_databases':
          return await this.listDatabases(args);
        case 'get_database_cluster':
          return await this.getDatabaseCluster(args);
        case 'list_domains':
          return await this.listDomains(args);
        case 'get_domain':
          return await this.getDomain(args);
        case 'create_domain':
          return await this.createDomain(args);
        case 'delete_domain':
          return await this.deleteDomain(args);
        case 'list_domain_records':
          return await this.listDomainRecords(args);
        case 'create_domain_record':
          return await this.createDomainRecord(args);
        case 'delete_domain_record':
          return await this.deleteDomainRecord(args);
        case 'list_firewalls':
          return await this.listFirewalls(args);
        case 'list_load_balancers':
          return await this.listLoadBalancers(args);
        case 'list_volumes':
          return await this.listVolumes(args);
        case 'list_snapshots':
          return await this.listSnapshots(args);
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

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------


  private async request(path: string, options: RequestInit = {}): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'GET',
      ...options,
      headers: { ...this.headers, ...(options.headers as Record<string, string> || {}) },
    });

    if (!response.ok) {
      let errBody = '';
      try { errBody = await response.text(); } catch { /* ignore */ }
      return {
        content: [{ type: 'text', text: `API error: HTTP ${response.status} ${response.statusText}${errBody ? ` — ${errBody.slice(0, 500)}` : ''}` }],
        isError: true,
      };
    }

    // 204 No Content (DELETE success)
    if (response.status === 204) {
      return { content: [{ type: 'text', text: JSON.stringify({ success: true, status: 204 }) }], isError: false };
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new Error(`DigitalOcean returned non-JSON response (HTTP ${response.status})`);
    }

    return {
      content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }],
      isError: false,
    };
  }

  private async listDroplets(args: Record<string, unknown>): Promise<ToolResult> {
    const page = (args.page as number) || 1;
    const perPage = (args.per_page as number) || 20;
    let url = `/droplets?page=${page}&per_page=${perPage}`;
    if (args.tag_name) url += `&tag_name=${encodeURIComponent(args.tag_name as string)}`;
    return this.request(url);
  }

  private async getDroplet(args: Record<string, unknown>): Promise<ToolResult> {
    const dropletId = args.droplet_id as number;
    if (!dropletId) return { content: [{ type: 'text', text: 'droplet_id is required' }], isError: true };
    return this.request(`/droplets/${dropletId}`);
  }

  private async createDroplet(args: Record<string, unknown>): Promise<ToolResult> {
    const { name, region, size, image } = args;
    if (!name) return { content: [{ type: 'text', text: 'name is required' }], isError: true };
    if (!region) return { content: [{ type: 'text', text: 'region is required' }], isError: true };
    if (!size) return { content: [{ type: 'text', text: 'size is required' }], isError: true };
    if (!image) return { content: [{ type: 'text', text: 'image is required' }], isError: true };

    const body: Record<string, unknown> = { name, region, size, image };
    if (args.ssh_keys) body.ssh_keys = args.ssh_keys;
    if (args.tags) body.tags = args.tags;
    if (typeof args.backups === 'boolean') body.backups = args.backups;
    if (typeof args.ipv6 === 'boolean') body.ipv6 = args.ipv6;
    if (typeof args.monitoring === 'boolean') body.monitoring = args.monitoring;
    if (args.user_data) body.user_data = args.user_data;
    if (args.vpc_uuid) body.vpc_uuid = args.vpc_uuid;

    return this.request('/droplets', { method: 'POST', body: JSON.stringify(body) });
  }

  private async deleteDroplet(args: Record<string, unknown>): Promise<ToolResult> {
    const dropletId = args.droplet_id as number;
    if (!dropletId) return { content: [{ type: 'text', text: 'droplet_id is required' }], isError: true };
    return this.request(`/droplets/${dropletId}`, { method: 'DELETE' });
  }

  private async dropletAction(args: Record<string, unknown>, type: string): Promise<ToolResult> {
    const dropletId = args.droplet_id as number;
    if (!dropletId) return { content: [{ type: 'text', text: 'droplet_id is required' }], isError: true };
    return this.request(`/droplets/${dropletId}/actions`, {
      method: 'POST',
      body: JSON.stringify({ type }),
    });
  }

  private async listApps(args: Record<string, unknown>): Promise<ToolResult> {
    const page = (args.page as number) || 1;
    const perPage = (args.per_page as number) || 20;
    return this.request(`/apps?page=${page}&per_page=${perPage}`);
  }

  private async getApp(args: Record<string, unknown>): Promise<ToolResult> {
    const appId = args.app_id as string;
    if (!appId) return { content: [{ type: 'text', text: 'app_id is required' }], isError: true };
    return this.request(`/apps/${encodeURIComponent(appId)}`);
  }

  private async createAppDeployment(args: Record<string, unknown>): Promise<ToolResult> {
    const appId = args.app_id as string;
    if (!appId) return { content: [{ type: 'text', text: 'app_id is required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (typeof args.force_build === 'boolean') body.force_build = args.force_build;
    return this.request(`/apps/${encodeURIComponent(appId)}/deployments`, { method: 'POST', body: JSON.stringify(body) });
  }

  private async listAppDeployments(args: Record<string, unknown>): Promise<ToolResult> {
    const appId = args.app_id as string;
    if (!appId) return { content: [{ type: 'text', text: 'app_id is required' }], isError: true };
    const page = (args.page as number) || 1;
    const perPage = (args.per_page as number) || 20;
    return this.request(`/apps/${encodeURIComponent(appId)}/deployments?page=${page}&per_page=${perPage}`);
  }

  private async listKubernetesClusters(args: Record<string, unknown>): Promise<ToolResult> {
    const page = (args.page as number) || 1;
    const perPage = (args.per_page as number) || 20;
    return this.request(`/kubernetes/clusters?page=${page}&per_page=${perPage}`);
  }

  private async getKubernetesCluster(args: Record<string, unknown>): Promise<ToolResult> {
    const clusterId = args.cluster_id as string;
    if (!clusterId) return { content: [{ type: 'text', text: 'cluster_id is required' }], isError: true };
    return this.request(`/kubernetes/clusters/${encodeURIComponent(clusterId)}`);
  }

  private async listDatabases(args: Record<string, unknown>): Promise<ToolResult> {
    const page = (args.page as number) || 1;
    const perPage = (args.per_page as number) || 20;
    let url = `/databases?page=${page}&per_page=${perPage}`;
    if (args.engine) url += `&engine=${encodeURIComponent(args.engine as string)}`;
    return this.request(url);
  }

  private async getDatabaseCluster(args: Record<string, unknown>): Promise<ToolResult> {
    const databaseClusterId = args.database_cluster_id as string;
    if (!databaseClusterId) return { content: [{ type: 'text', text: 'database_cluster_id is required' }], isError: true };
    return this.request(`/databases/${encodeURIComponent(databaseClusterId)}`);
  }

  private async listDomains(args: Record<string, unknown>): Promise<ToolResult> {
    const page = (args.page as number) || 1;
    const perPage = (args.per_page as number) || 20;
    return this.request(`/domains?page=${page}&per_page=${perPage}`);
  }

  private async getDomain(args: Record<string, unknown>): Promise<ToolResult> {
    const domainName = args.domain_name as string;
    if (!domainName) return { content: [{ type: 'text', text: 'domain_name is required' }], isError: true };
    return this.request(`/domains/${encodeURIComponent(domainName)}`);
  }

  private async createDomain(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name) return { content: [{ type: 'text', text: 'name is required' }], isError: true };
    const body: Record<string, unknown> = { name: args.name };
    if (args.ip_address) body.ip_address = args.ip_address;
    return this.request('/domains', { method: 'POST', body: JSON.stringify(body) });
  }

  private async deleteDomain(args: Record<string, unknown>): Promise<ToolResult> {
    const domainName = args.domain_name as string;
    if (!domainName) return { content: [{ type: 'text', text: 'domain_name is required' }], isError: true };
    return this.request(`/domains/${encodeURIComponent(domainName)}`, { method: 'DELETE' });
  }

  private async listDomainRecords(args: Record<string, unknown>): Promise<ToolResult> {
    const domainName = args.domain_name as string;
    if (!domainName) return { content: [{ type: 'text', text: 'domain_name is required' }], isError: true };
    const page = (args.page as number) || 1;
    const perPage = (args.per_page as number) || 20;
    let url = `/domains/${encodeURIComponent(domainName)}/records?page=${page}&per_page=${perPage}`;
    if (args.type) url += `&type=${encodeURIComponent(args.type as string)}`;
    return this.request(url);
  }

  private async createDomainRecord(args: Record<string, unknown>): Promise<ToolResult> {
    const domainName = args.domain_name as string;
    if (!domainName) return { content: [{ type: 'text', text: 'domain_name is required' }], isError: true };
    if (!args.type) return { content: [{ type: 'text', text: 'type is required' }], isError: true };
    if (!args.name) return { content: [{ type: 'text', text: 'name is required' }], isError: true };
    if (!args.data) return { content: [{ type: 'text', text: 'data is required' }], isError: true };

    const body: Record<string, unknown> = {
      type: args.type,
      name: args.name,
      data: args.data,
    };
    if (args.priority != null) body.priority = args.priority;
    if (args.port != null) body.port = args.port;
    if (args.ttl != null) body.ttl = args.ttl;
    if (args.weight != null) body.weight = args.weight;
    if (args.flags != null) body.flags = args.flags;
    if (args.tag != null) body.tag = args.tag;

    return this.request(`/domains/${encodeURIComponent(domainName)}/records`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  private async deleteDomainRecord(args: Record<string, unknown>): Promise<ToolResult> {
    const domainName = args.domain_name as string;
    const recordId = args.record_id as number;
    if (!domainName) return { content: [{ type: 'text', text: 'domain_name is required' }], isError: true };
    if (!recordId) return { content: [{ type: 'text', text: 'record_id is required' }], isError: true };
    return this.request(`/domains/${encodeURIComponent(domainName)}/records/${recordId}`, { method: 'DELETE' });
  }

  private async listFirewalls(args: Record<string, unknown>): Promise<ToolResult> {
    const page = (args.page as number) || 1;
    const perPage = (args.per_page as number) || 20;
    return this.request(`/firewalls?page=${page}&per_page=${perPage}`);
  }

  private async listLoadBalancers(args: Record<string, unknown>): Promise<ToolResult> {
    const page = (args.page as number) || 1;
    const perPage = (args.per_page as number) || 20;
    return this.request(`/load_balancers?page=${page}&per_page=${perPage}`);
  }

  private async listVolumes(args: Record<string, unknown>): Promise<ToolResult> {
    const page = (args.page as number) || 1;
    const perPage = (args.per_page as number) || 20;
    let url = `/volumes?page=${page}&per_page=${perPage}`;
    if (args.region) url += `&region=${encodeURIComponent(args.region as string)}`;
    return this.request(url);
  }

  private async listSnapshots(args: Record<string, unknown>): Promise<ToolResult> {
    const page = (args.page as number) || 1;
    const perPage = (args.per_page as number) || 20;
    let url = `/snapshots?page=${page}&per_page=${perPage}`;
    if (args.resource_type) url += `&resource_type=${encodeURIComponent(args.resource_type as string)}`;
    return this.request(url);
  }
}

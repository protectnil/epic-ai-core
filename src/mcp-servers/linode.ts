/**
 * Linode MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03 — no official Linode MCP server exists on GitHub.
// No official Linode MCP server was found on GitHub or npm as of March 2026.
//
// Base URL: https://api.linode.com/v4
// Auth: Bearer token (Personal Access Token or OAuth2 access token)
// Docs: https://www.linode.com/docs/api/
// Rate limits: 800 requests per minute per token

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface LinodeConfig {
  apiToken: string;
}

export class LinodeMCPServer extends MCPAdapterBase {
  private readonly baseUrl = 'https://api.linode.com/v4';
  private readonly authHeader: string;

  constructor(config: LinodeConfig) {
    super();
    this.authHeader = `Bearer ${config.apiToken}`;
  }

  static catalog() {
    return {
      name: 'linode',
      displayName: 'Linode',
      version: '1.0.0',
      category: 'cloud',
      keywords: [
        'linode', 'akamai', 'cloud', 'vps', 'virtual machine', 'instance', 'server',
        'volume', 'block storage', 'domain', 'dns', 'nodebalancer', 'load balancer',
        'firewall', 'networking', 'image', 'backup', 'snapshot', 'region', 'infrastructure',
      ],
      toolNames: [
        'list_instances', 'get_instance', 'create_instance', 'reboot_instance', 'shutdown_instance',
        'list_volumes', 'get_volume', 'create_volume',
        'list_domains', 'get_domain', 'list_domain_records',
        'list_nodebalancers', 'get_nodebalancer',
        'list_firewalls', 'get_firewall', 'get_firewall_rules',
        'list_images', 'get_image',
        'list_regions', 'list_types',
      ],
      description: 'Manage Linode cloud infrastructure: create and control VPS instances, block storage volumes, DNS domains, NodeBalancers, firewalls, images, and regions.',
      author: 'protectnil',
    };
  }

  private get headers(): Record<string, string> {
    return {
      Authorization: this.authHeader,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_instances',
        description: 'List all Linode instances (VPS) on the account with status, region, and plan details',
        inputSchema: {
          type: 'object',
          properties: {
            page: { type: 'number', description: 'Page number (default: 1)' },
            page_size: { type: 'number', description: 'Number of results per page (default: 100, max: 500)' },
          },
        },
      },
      {
        name: 'get_instance',
        description: 'Get full details for a specific Linode instance by ID, including IP addresses, status, and specs',
        inputSchema: {
          type: 'object',
          properties: {
            linode_id: { type: 'number', description: 'The numeric Linode instance ID' },
          },
          required: ['linode_id'],
        },
      },
      {
        name: 'create_instance',
        description: 'Create a new Linode instance with specified region, type, and image',
        inputSchema: {
          type: 'object',
          properties: {
            region: { type: 'string', description: 'Region ID (e.g. "us-east", "eu-west")' },
            type: { type: 'string', description: 'Linode type/plan slug (e.g. "g6-nanode-1", "g6-standard-2")' },
            image: { type: 'string', description: 'Image ID to boot from (e.g. "linode/ubuntu22.04")' },
            label: { type: 'string', description: 'Human-readable label for the instance' },
            root_pass: { type: 'string', description: 'Root password for the instance' },
            booted: { type: 'boolean', description: 'Whether to boot the instance after creation (default: true)' },
          },
          required: ['region', 'type', 'image', 'root_pass'],
        },
      },
      {
        name: 'reboot_instance',
        description: 'Reboot a specific Linode instance',
        inputSchema: {
          type: 'object',
          properties: {
            linode_id: { type: 'number', description: 'The numeric Linode instance ID to reboot' },
          },
          required: ['linode_id'],
        },
      },
      {
        name: 'shutdown_instance',
        description: 'Shut down a specific Linode instance (graceful power off)',
        inputSchema: {
          type: 'object',
          properties: {
            linode_id: { type: 'number', description: 'The numeric Linode instance ID to shut down' },
          },
          required: ['linode_id'],
        },
      },
      {
        name: 'list_volumes',
        description: 'List all block storage volumes on the account with size, status, and attachment info',
        inputSchema: {
          type: 'object',
          properties: {
            page: { type: 'number', description: 'Page number (default: 1)' },
            page_size: { type: 'number', description: 'Results per page (default: 100)' },
          },
        },
      },
      {
        name: 'get_volume',
        description: 'Get details for a specific block storage volume by ID',
        inputSchema: {
          type: 'object',
          properties: {
            volume_id: { type: 'number', description: 'The numeric volume ID' },
          },
          required: ['volume_id'],
        },
      },
      {
        name: 'create_volume',
        description: 'Create a new block storage volume in a specified region',
        inputSchema: {
          type: 'object',
          properties: {
            label: { type: 'string', description: 'Human-readable label for the volume' },
            size: { type: 'number', description: 'Size of the volume in GB (20-10240)' },
            region: { type: 'string', description: 'Region ID where the volume will be created' },
            linode_id: { type: 'number', description: 'Linode instance ID to immediately attach the volume to (optional)' },
          },
          required: ['label', 'size', 'region'],
        },
      },
      {
        name: 'list_domains',
        description: 'List all DNS domains managed in Linode DNS Manager',
        inputSchema: {
          type: 'object',
          properties: {
            page: { type: 'number', description: 'Page number (default: 1)' },
            page_size: { type: 'number', description: 'Results per page (default: 100)' },
          },
        },
      },
      {
        name: 'get_domain',
        description: 'Get details for a specific DNS domain by ID, including type and SOA settings',
        inputSchema: {
          type: 'object',
          properties: {
            domain_id: { type: 'number', description: 'The numeric domain ID' },
          },
          required: ['domain_id'],
        },
      },
      {
        name: 'list_domain_records',
        description: 'List all DNS records for a specific domain',
        inputSchema: {
          type: 'object',
          properties: {
            domain_id: { type: 'number', description: 'The numeric domain ID to list records for' },
            page: { type: 'number', description: 'Page number (default: 1)' },
            page_size: { type: 'number', description: 'Results per page (default: 100)' },
          },
          required: ['domain_id'],
        },
      },
      {
        name: 'list_nodebalancers',
        description: 'List all NodeBalancers (load balancers) on the account',
        inputSchema: {
          type: 'object',
          properties: {
            page: { type: 'number', description: 'Page number (default: 1)' },
            page_size: { type: 'number', description: 'Results per page (default: 100)' },
          },
        },
      },
      {
        name: 'get_nodebalancer',
        description: 'Get details for a specific NodeBalancer by ID, including region and connection stats',
        inputSchema: {
          type: 'object',
          properties: {
            nodebalancer_id: { type: 'number', description: 'The numeric NodeBalancer ID' },
          },
          required: ['nodebalancer_id'],
        },
      },
      {
        name: 'list_firewalls',
        description: 'List all Cloud Firewalls on the account with status and attached device info',
        inputSchema: {
          type: 'object',
          properties: {
            page: { type: 'number', description: 'Page number (default: 1)' },
            page_size: { type: 'number', description: 'Results per page (default: 100)' },
          },
        },
      },
      {
        name: 'get_firewall',
        description: 'Get details for a specific Cloud Firewall by ID',
        inputSchema: {
          type: 'object',
          properties: {
            firewall_id: { type: 'number', description: 'The numeric firewall ID' },
          },
          required: ['firewall_id'],
        },
      },
      {
        name: 'get_firewall_rules',
        description: 'Get the inbound and outbound rules for a specific Cloud Firewall',
        inputSchema: {
          type: 'object',
          properties: {
            firewall_id: { type: 'number', description: 'The numeric firewall ID' },
          },
          required: ['firewall_id'],
        },
      },
      {
        name: 'list_images',
        description: 'List available Linode images (official distros and custom images)',
        inputSchema: {
          type: 'object',
          properties: {
            page: { type: 'number', description: 'Page number (default: 1)' },
            page_size: { type: 'number', description: 'Results per page (default: 100)' },
          },
        },
      },
      {
        name: 'get_image',
        description: 'Get details for a specific image by ID, including size and creation date',
        inputSchema: {
          type: 'object',
          properties: {
            image_id: { type: 'string', description: 'The image ID (e.g. "linode/ubuntu22.04" or numeric custom image ID)' },
          },
          required: ['image_id'],
        },
      },
      {
        name: 'list_regions',
        description: 'List all available Linode regions with capabilities and geographic info',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'list_types',
        description: 'List all available Linode instance types/plans with CPU, RAM, storage, and pricing',
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
        case 'list_instances': return await this.listInstances(args);
        case 'get_instance': return await this.getInstance(args);
        case 'create_instance': return await this.createInstance(args);
        case 'reboot_instance': return await this.rebootInstance(args);
        case 'shutdown_instance': return await this.shutdownInstance(args);
        case 'list_volumes': return await this.listVolumes(args);
        case 'get_volume': return await this.getVolume(args);
        case 'create_volume': return await this.createVolume(args);
        case 'list_domains': return await this.listDomains(args);
        case 'get_domain': return await this.getDomain(args);
        case 'list_domain_records': return await this.listDomainRecords(args);
        case 'list_nodebalancers': return await this.listNodebalancers(args);
        case 'get_nodebalancer': return await this.getNodebalancer(args);
        case 'list_firewalls': return await this.listFirewalls(args);
        case 'get_firewall': return await this.getFirewall(args);
        case 'get_firewall_rules': return await this.getFirewallRules(args);
        case 'list_images': return await this.listImages(args);
        case 'get_image': return await this.getImage(args);
        case 'list_regions': return await this.listRegions();
        case 'list_types': return await this.listTypes();
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

  private async listInstances(args: Record<string, unknown>): Promise<ToolResult> {
    const url = new URL(`${this.baseUrl}/linode/instances`);
    if (args.page) url.searchParams.set('page', String(args.page));
    if (args.page_size) url.searchParams.set('page_size', String(args.page_size));
    const response = await this.fetchWithRetry(url.toString(), { headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to list instances: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async getInstance(args: Record<string, unknown>): Promise<ToolResult> {
    const linodeId = args.linode_id as number;
    if (!linodeId) return { content: [{ type: 'text', text: 'linode_id is required' }], isError: true };
    const response = await this.fetchWithRetry(`${this.baseUrl}/linode/instances/${linodeId}`, { headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to get instance: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async createInstance(args: Record<string, unknown>): Promise<ToolResult> {
    const required = ['region', 'type', 'image', 'root_pass'];
    for (const field of required) {
      if (!args[field]) return { content: [{ type: 'text', text: `${field} is required` }], isError: true };
    }
    const body: Record<string, unknown> = {
      region: args.region,
      type: args.type,
      image: args.image,
      root_pass: args.root_pass,
    };
    if (args.label) body.label = args.label;
    if (args.booted !== undefined) body.booted = args.booted;
    const response = await this.fetchWithRetry(`${this.baseUrl}/linode/instances`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to create instance: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async rebootInstance(args: Record<string, unknown>): Promise<ToolResult> {
    const linodeId = args.linode_id as number;
    if (!linodeId) return { content: [{ type: 'text', text: 'linode_id is required' }], isError: true };
    const response = await this.fetchWithRetry(`${this.baseUrl}/linode/instances/${linodeId}/reboot`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({}),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to reboot instance: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: `Instance ${linodeId} reboot initiated successfully` }], isError: false };
  }

  private async shutdownInstance(args: Record<string, unknown>): Promise<ToolResult> {
    const linodeId = args.linode_id as number;
    if (!linodeId) return { content: [{ type: 'text', text: 'linode_id is required' }], isError: true };
    const response = await this.fetchWithRetry(`${this.baseUrl}/linode/instances/${linodeId}/shutdown`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({}),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to shutdown instance: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: `Instance ${linodeId} shutdown initiated successfully` }], isError: false };
  }

  private async listVolumes(args: Record<string, unknown>): Promise<ToolResult> {
    const url = new URL(`${this.baseUrl}/volumes`);
    if (args.page) url.searchParams.set('page', String(args.page));
    if (args.page_size) url.searchParams.set('page_size', String(args.page_size));
    const response = await this.fetchWithRetry(url.toString(), { headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to list volumes: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async getVolume(args: Record<string, unknown>): Promise<ToolResult> {
    const volumeId = args.volume_id as number;
    if (!volumeId) return { content: [{ type: 'text', text: 'volume_id is required' }], isError: true };
    const response = await this.fetchWithRetry(`${this.baseUrl}/volumes/${volumeId}`, { headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to get volume: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async createVolume(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.label) return { content: [{ type: 'text', text: 'label is required' }], isError: true };
    if (!args.size) return { content: [{ type: 'text', text: 'size is required' }], isError: true };
    if (!args.region) return { content: [{ type: 'text', text: 'region is required' }], isError: true };
    const body: Record<string, unknown> = {
      label: args.label,
      size: args.size,
      region: args.region,
    };
    if (args.linode_id) body.linode_id = args.linode_id;
    const response = await this.fetchWithRetry(`${this.baseUrl}/volumes`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to create volume: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async listDomains(args: Record<string, unknown>): Promise<ToolResult> {
    const url = new URL(`${this.baseUrl}/domains`);
    if (args.page) url.searchParams.set('page', String(args.page));
    if (args.page_size) url.searchParams.set('page_size', String(args.page_size));
    const response = await this.fetchWithRetry(url.toString(), { headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to list domains: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async getDomain(args: Record<string, unknown>): Promise<ToolResult> {
    const domainId = args.domain_id as number;
    if (!domainId) return { content: [{ type: 'text', text: 'domain_id is required' }], isError: true };
    const response = await this.fetchWithRetry(`${this.baseUrl}/domains/${domainId}`, { headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to get domain: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async listDomainRecords(args: Record<string, unknown>): Promise<ToolResult> {
    const domainId = args.domain_id as number;
    if (!domainId) return { content: [{ type: 'text', text: 'domain_id is required' }], isError: true };
    const url = new URL(`${this.baseUrl}/domains/${domainId}/records`);
    if (args.page) url.searchParams.set('page', String(args.page));
    if (args.page_size) url.searchParams.set('page_size', String(args.page_size));
    const response = await this.fetchWithRetry(url.toString(), { headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to list domain records: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async listNodebalancers(args: Record<string, unknown>): Promise<ToolResult> {
    const url = new URL(`${this.baseUrl}/nodebalancers`);
    if (args.page) url.searchParams.set('page', String(args.page));
    if (args.page_size) url.searchParams.set('page_size', String(args.page_size));
    const response = await this.fetchWithRetry(url.toString(), { headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to list nodebalancers: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async getNodebalancer(args: Record<string, unknown>): Promise<ToolResult> {
    const nbId = args.nodebalancer_id as number;
    if (!nbId) return { content: [{ type: 'text', text: 'nodebalancer_id is required' }], isError: true };
    const response = await this.fetchWithRetry(`${this.baseUrl}/nodebalancers/${nbId}`, { headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to get nodebalancer: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async listFirewalls(args: Record<string, unknown>): Promise<ToolResult> {
    const url = new URL(`${this.baseUrl}/networking/firewalls`);
    if (args.page) url.searchParams.set('page', String(args.page));
    if (args.page_size) url.searchParams.set('page_size', String(args.page_size));
    const response = await this.fetchWithRetry(url.toString(), { headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to list firewalls: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async getFirewall(args: Record<string, unknown>): Promise<ToolResult> {
    const firewallId = args.firewall_id as number;
    if (!firewallId) return { content: [{ type: 'text', text: 'firewall_id is required' }], isError: true };
    const response = await this.fetchWithRetry(`${this.baseUrl}/networking/firewalls/${firewallId}`, { headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to get firewall: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async getFirewallRules(args: Record<string, unknown>): Promise<ToolResult> {
    const firewallId = args.firewall_id as number;
    if (!firewallId) return { content: [{ type: 'text', text: 'firewall_id is required' }], isError: true };
    const response = await this.fetchWithRetry(`${this.baseUrl}/networking/firewalls/${firewallId}/rules`, { headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to get firewall rules: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async listImages(args: Record<string, unknown>): Promise<ToolResult> {
    const url = new URL(`${this.baseUrl}/images`);
    if (args.page) url.searchParams.set('page', String(args.page));
    if (args.page_size) url.searchParams.set('page_size', String(args.page_size));
    const response = await this.fetchWithRetry(url.toString(), { headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to list images: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async getImage(args: Record<string, unknown>): Promise<ToolResult> {
    const imageId = args.image_id as string;
    if (!imageId) return { content: [{ type: 'text', text: 'image_id is required' }], isError: true };
    const response = await this.fetchWithRetry(`${this.baseUrl}/images/${encodeURIComponent(imageId)}`, { headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to get image: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async listRegions(): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}/regions`, { headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to list regions: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async listTypes(): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}/linode/types`, { headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to list types: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }
}

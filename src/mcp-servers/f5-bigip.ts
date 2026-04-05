/**
 * F5 BIG-IP MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// No official F5 MCP server published by F5 Inc. was found on GitHub, npmjs.com, or the MCP registry.
// Community MCP (NOT official): https://github.com/czirakim/F5.MCP.server — transport: stdio, auth: basic credentials
//   Community server exposes 6 generic tools (list_tool, create_tool, update_tool, delete_tool, show_stats_tool,
//   show_logs_tool) — all accept an object_type parameter rather than named per-resource tools. Fails the 10-tool
//   threshold and is not published by F5. Decision: use-rest-api.
// Our adapter covers: 18 tools (LTM virtual servers, pools, nodes, iRules, WAF, monitors).
//
// Base URL: https://{bigip-host}/mgmt  (no default — host is required per-device)
// Auth: HTTP Basic (username:password) OR token-based via X-F5-Auth-Token header
// Docs: https://clouddocs.f5.com/api/icontrol-rest/
// Rate limits: Not officially documented; practical limit ~100 concurrent REST requests per BIG-IP

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface F5BigIPConfig {
  host: string;             // BIG-IP management IP or hostname (e.g. 192.168.1.1 or bigip.example.com)
  username: string;
  password: string;
  baseUrl?: string;         // override full base, default: https://{host}/mgmt
  partition?: string;       // default partition (default: Common)
  skipTlsVerify?: boolean;  // set true for self-signed certs in dev (not for production)
}

export class F5BigIPMCPServer extends MCPAdapterBase {
  private readonly username: string;
  private readonly password: string;
  private readonly baseUrl: string;
  private readonly partition: string;

  constructor(config: F5BigIPConfig) {
    super();
    this.username = config.username;
    this.password = config.password;
    this.baseUrl = config.baseUrl || `https://${config.host}/mgmt`;
    this.partition = config.partition || 'Common';
  }

  static catalog() {
    return {
      name: 'f5-bigip',
      displayName: 'F5 BIG-IP',
      version: '1.0.0',
      category: 'cybersecurity',
      keywords: [
        'f5', 'bigip', 'big-ip', 'ltm', 'apm', 'asm', 'waf', 'load balancer',
        'virtual server', 'vip', 'pool', 'node', 'irule', 'ssl', 'tls',
        'snat', 'monitor', 'icontrol', 'traffic management', 'app delivery',
        'web application firewall', 'application security',
      ],
      toolNames: [
        'list_virtual_servers', 'get_virtual_server', 'create_virtual_server', 'update_virtual_server', 'delete_virtual_server',
        'list_pools', 'get_pool', 'create_pool', 'update_pool', 'delete_pool',
        'list_pool_members', 'add_pool_member', 'update_pool_member', 'remove_pool_member',
        'list_nodes', 'list_irules',
        'list_monitors', 'list_waf_policies',
      ],
      description: 'F5 BIG-IP app delivery and security: manage virtual servers, load balancing pools, pool members, nodes, iRules, WAF policies, and health monitors via iControl REST.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_virtual_servers',
        description: 'List all LTM virtual servers (VIPs) on the BIG-IP with optional partition filter',
        inputSchema: {
          type: 'object',
          properties: {
            partition: {
              type: 'string',
              description: 'BIG-IP partition to query (default: Common)',
            },
            expandSubcollections: {
              type: 'boolean',
              description: 'Include related sub-resources like profiles and policies (default: false)',
            },
          },
        },
      },
      {
        name: 'get_virtual_server',
        description: 'Get detailed configuration for a specific LTM virtual server by name, including pool, profiles, and rules',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Virtual server name (e.g. my_vs)',
            },
            partition: {
              type: 'string',
              description: 'BIG-IP partition (default: Common)',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'create_virtual_server',
        description: 'Create a new LTM virtual server with destination IP, port, protocol, and pool assignment',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Name for the new virtual server',
            },
            destination: {
              type: 'string',
              description: 'Destination IP and port in format ip:port (e.g. 10.0.0.10:80)',
            },
            pool: {
              type: 'string',
              description: 'Default pool name to forward traffic to (e.g. /Common/my_pool)',
            },
            ipProtocol: {
              type: 'string',
              description: 'IP protocol: tcp (default), udp, sctp',
            },
            partition: {
              type: 'string',
              description: 'Partition to create the virtual server in (default: Common)',
            },
            description: {
              type: 'string',
              description: 'Optional description for the virtual server',
            },
          },
          required: ['name', 'destination'],
        },
      },
      {
        name: 'update_virtual_server',
        description: 'Update an existing LTM virtual server — change pool, enable/disable, or modify description',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Name of the virtual server to update',
            },
            partition: {
              type: 'string',
              description: 'Partition containing the virtual server (default: Common)',
            },
            pool: {
              type: 'string',
              description: 'New default pool (e.g. /Common/my_pool)',
            },
            enabled: {
              type: 'boolean',
              description: 'Enable (true) or disable (false) the virtual server',
            },
            description: {
              type: 'string',
              description: 'Updated description',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'delete_virtual_server',
        description: 'Delete an LTM virtual server from the BIG-IP configuration',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Name of the virtual server to delete',
            },
            partition: {
              type: 'string',
              description: 'Partition containing the virtual server (default: Common)',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'list_pools',
        description: 'List all LTM load balancing pools with optional partition filter',
        inputSchema: {
          type: 'object',
          properties: {
            partition: {
              type: 'string',
              description: 'BIG-IP partition to query (default: Common)',
            },
          },
        },
      },
      {
        name: 'get_pool',
        description: 'Get configuration and member list for a specific LTM pool by name',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Pool name (e.g. my_pool)',
            },
            partition: {
              type: 'string',
              description: 'Partition containing the pool (default: Common)',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'create_pool',
        description: 'Create a new LTM load balancing pool with a load balancing method and optional monitor',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Name for the new pool',
            },
            loadBalancingMode: {
              type: 'string',
              description: 'Load balancing algorithm: round-robin (default), least-connections-member, ip-hash, ratio-member',
            },
            monitor: {
              type: 'string',
              description: 'Health monitor to assign (e.g. /Common/http)',
            },
            partition: {
              type: 'string',
              description: 'Partition to create the pool in (default: Common)',
            },
            description: {
              type: 'string',
              description: 'Optional description',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'update_pool',
        description: 'Update an LTM pool — change load balancing mode, monitor, or description',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Name of the pool to update',
            },
            partition: {
              type: 'string',
              description: 'Partition containing the pool (default: Common)',
            },
            loadBalancingMode: {
              type: 'string',
              description: 'New load balancing algorithm: round-robin, least-connections-member, ip-hash, ratio-member',
            },
            monitor: {
              type: 'string',
              description: 'New health monitor (e.g. /Common/https)',
            },
            description: {
              type: 'string',
              description: 'Updated description',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'delete_pool',
        description: 'Delete an LTM pool from the BIG-IP configuration',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Name of the pool to delete',
            },
            partition: {
              type: 'string',
              description: 'Partition containing the pool (default: Common)',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'list_pool_members',
        description: 'List all members of an LTM pool with their current state and session status',
        inputSchema: {
          type: 'object',
          properties: {
            pool: {
              type: 'string',
              description: 'Pool name to list members for',
            },
            partition: {
              type: 'string',
              description: 'Partition containing the pool (default: Common)',
            },
          },
          required: ['pool'],
        },
      },
      {
        name: 'add_pool_member',
        description: 'Add a node:port member to an existing LTM pool',
        inputSchema: {
          type: 'object',
          properties: {
            pool: {
              type: 'string',
              description: 'Pool name to add the member to',
            },
            name: {
              type: 'string',
              description: 'Member in node:port format (e.g. 10.0.0.5:8080 or /Common/mynode:80)',
            },
            partition: {
              type: 'string',
              description: 'Partition containing the pool (default: Common)',
            },
          },
          required: ['pool', 'name'],
        },
      },
      {
        name: 'update_pool_member',
        description: 'Enable, disable, or force offline a pool member by updating its session and state',
        inputSchema: {
          type: 'object',
          properties: {
            pool: {
              type: 'string',
              description: 'Pool name containing the member',
            },
            member: {
              type: 'string',
              description: 'Member in node:port format (e.g. 10.0.0.5:8080)',
            },
            session: {
              type: 'string',
              description: 'Session state: user-enabled or user-disabled (new connections allowed or drained)',
            },
            state: {
              type: 'string',
              description: 'Forced state: user-up or user-down (overrides monitor result)',
            },
            partition: {
              type: 'string',
              description: 'Partition containing the pool (default: Common)',
            },
          },
          required: ['pool', 'member'],
        },
      },
      {
        name: 'remove_pool_member',
        description: 'Remove a member from an LTM pool',
        inputSchema: {
          type: 'object',
          properties: {
            pool: {
              type: 'string',
              description: 'Pool name containing the member',
            },
            member: {
              type: 'string',
              description: 'Member in node:port format (e.g. 10.0.0.5:8080)',
            },
            partition: {
              type: 'string',
              description: 'Partition containing the pool (default: Common)',
            },
          },
          required: ['pool', 'member'],
        },
      },
      {
        name: 'list_nodes',
        description: 'List all LTM nodes (individual IP/hostname endpoints) with address, state, and monitor status',
        inputSchema: {
          type: 'object',
          properties: {
            partition: {
              type: 'string',
              description: 'Partition to query (default: Common)',
            },
          },
        },
      },
      {
        name: 'list_irules',
        description: 'List all iRules on the BIG-IP, including name and Tcl rule body',
        inputSchema: {
          type: 'object',
          properties: {
            partition: {
              type: 'string',
              description: 'Partition to query (default: Common)',
            },
          },
        },
      },
      {
        name: 'list_monitors',
        description: 'List all LTM health monitors of a given type (http, https, tcp, icmp, etc.) for a partition',
        inputSchema: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              description: 'Monitor type: http (default), https, tcp, icmp, gateway-icmp, external',
            },
            partition: {
              type: 'string',
              description: 'Partition to query (default: Common)',
            },
          },
        },
      },
      {
        name: 'list_waf_policies',
        description: 'List ASM/Advanced WAF security policies on the BIG-IP with enforcement mode and active status',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of policies to return (default: 50)',
            },
            offset: {
              type: 'number',
              description: 'Pagination offset for large policy lists (default: 0)',
            },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_virtual_servers':
          return this.listVirtualServers(args);
        case 'get_virtual_server':
          return this.getVirtualServer(args);
        case 'create_virtual_server':
          return this.createVirtualServer(args);
        case 'update_virtual_server':
          return this.updateVirtualServer(args);
        case 'delete_virtual_server':
          return this.deleteVirtualServer(args);
        case 'list_pools':
          return this.listPools(args);
        case 'get_pool':
          return this.getPool(args);
        case 'create_pool':
          return this.createPool(args);
        case 'update_pool':
          return this.updatePool(args);
        case 'delete_pool':
          return this.deletePool(args);
        case 'list_pool_members':
          return this.listPoolMembers(args);
        case 'add_pool_member':
          return this.addPoolMember(args);
        case 'update_pool_member':
          return this.updatePoolMember(args);
        case 'remove_pool_member':
          return this.removePoolMember(args);
        case 'list_nodes':
          return this.listNodes(args);
        case 'list_irules':
          return this.listIRules(args);
        case 'list_monitors':
          return this.listMonitors(args);
        case 'list_waf_policies':
          return this.listWafPolicies(args);
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

  private get authHeader(): string {
    return `Basic ${Buffer.from(`${this.username}:${this.password}`).toString('base64')}`;
  }


  private async f5Get(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      headers: {
        'Authorization': this.authHeader,
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async f5Post(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: {
        'Authorization': this.authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const text = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `API error: ${response.status} ${text}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async f5Patch(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'PATCH',
      headers: {
        'Authorization': this.authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const text = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `API error: ${response.status} ${text}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async f5Delete(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'DELETE',
      headers: {
        'Authorization': this.authHeader,
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: JSON.stringify({ deleted: true, status: response.status }) }], isError: false };
  }

  private partitionPath(partition: unknown, name: unknown): string {
    const p = (partition as string) || this.partition;
    return `~${p}~${name as string}`;
  }

  private async listVirtualServers(args: Record<string, unknown>): Promise<ToolResult> {
    const partition = (args.partition as string) || this.partition;
    const expand = args.expandSubcollections ? '&expandSubcollections=true' : '';
    return this.f5Get(`/tm/ltm/virtual?$filter=partition+eq+${encodeURIComponent(partition)}${expand}`);
  }

  private async getVirtualServer(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name) return { content: [{ type: 'text', text: 'name is required' }], isError: true };
    const path = this.partitionPath(args.partition, args.name);
    return this.f5Get(`/tm/ltm/virtual/${path}?expandSubcollections=true`);
  }

  private async createVirtualServer(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name || !args.destination) return { content: [{ type: 'text', text: 'name and destination are required' }], isError: true };
    const body: Record<string, unknown> = {
      name: args.name,
      destination: args.destination,
      ipProtocol: (args.ipProtocol as string) || 'tcp',
      partition: (args.partition as string) || this.partition,
    };
    if (args.pool) body.pool = args.pool;
    if (args.description) body.description = args.description;
    return this.f5Post('/tm/ltm/virtual', body);
  }

  private async updateVirtualServer(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name) return { content: [{ type: 'text', text: 'name is required' }], isError: true };
    const path = this.partitionPath(args.partition, args.name);
    const body: Record<string, unknown> = {};
    if (args.pool !== undefined) body.pool = args.pool;
    if (args.description !== undefined) body.description = args.description;
    if (args.enabled !== undefined) {
      body.enabled = args.enabled;
      body.disabled = !args.enabled;
    }
    return this.f5Patch(`/tm/ltm/virtual/${path}`, body);
  }

  private async deleteVirtualServer(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name) return { content: [{ type: 'text', text: 'name is required' }], isError: true };
    const path = this.partitionPath(args.partition, args.name);
    return this.f5Delete(`/tm/ltm/virtual/${path}`);
  }

  private async listPools(args: Record<string, unknown>): Promise<ToolResult> {
    const partition = (args.partition as string) || this.partition;
    return this.f5Get(`/tm/ltm/pool?$filter=partition+eq+${encodeURIComponent(partition)}`);
  }

  private async getPool(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name) return { content: [{ type: 'text', text: 'name is required' }], isError: true };
    const path = this.partitionPath(args.partition, args.name);
    return this.f5Get(`/tm/ltm/pool/${path}?expandSubcollections=true`);
  }

  private async createPool(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name) return { content: [{ type: 'text', text: 'name is required' }], isError: true };
    const body: Record<string, unknown> = {
      name: args.name,
      loadBalancingMode: (args.loadBalancingMode as string) || 'round-robin',
      partition: (args.partition as string) || this.partition,
    };
    if (args.monitor) body.monitor = args.monitor;
    if (args.description) body.description = args.description;
    return this.f5Post('/tm/ltm/pool', body);
  }

  private async updatePool(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name) return { content: [{ type: 'text', text: 'name is required' }], isError: true };
    const path = this.partitionPath(args.partition, args.name);
    const body: Record<string, unknown> = {};
    if (args.loadBalancingMode) body.loadBalancingMode = args.loadBalancingMode;
    if (args.monitor) body.monitor = args.monitor;
    if (args.description) body.description = args.description;
    return this.f5Patch(`/tm/ltm/pool/${path}`, body);
  }

  private async deletePool(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name) return { content: [{ type: 'text', text: 'name is required' }], isError: true };
    const path = this.partitionPath(args.partition, args.name);
    return this.f5Delete(`/tm/ltm/pool/${path}`);
  }

  private async listPoolMembers(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.pool) return { content: [{ type: 'text', text: 'pool is required' }], isError: true };
    const poolPath = this.partitionPath(args.partition, args.pool);
    return this.f5Get(`/tm/ltm/pool/${poolPath}/members`);
  }

  private async addPoolMember(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.pool || !args.name) return { content: [{ type: 'text', text: 'pool and name are required' }], isError: true };
    const poolPath = this.partitionPath(args.partition, args.pool);
    return this.f5Post(`/tm/ltm/pool/${poolPath}/members`, { name: args.name });
  }

  private async updatePoolMember(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.pool || !args.member) return { content: [{ type: 'text', text: 'pool and member are required' }], isError: true };
    const poolPath = this.partitionPath(args.partition, args.pool);
    const memberName = (args.member as string).replace('/', '~');
    const body: Record<string, unknown> = {};
    if (args.session) body.session = args.session;
    if (args.state) body.state = args.state;
    return this.f5Patch(`/tm/ltm/pool/${poolPath}/members/${memberName}`, body);
  }

  private async removePoolMember(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.pool || !args.member) return { content: [{ type: 'text', text: 'pool and member are required' }], isError: true };
    const poolPath = this.partitionPath(args.partition, args.pool);
    const memberName = (args.member as string).replace('/', '~');
    return this.f5Delete(`/tm/ltm/pool/${poolPath}/members/${memberName}`);
  }

  private async listNodes(args: Record<string, unknown>): Promise<ToolResult> {
    const partition = (args.partition as string) || this.partition;
    return this.f5Get(`/tm/ltm/node?$filter=partition+eq+${encodeURIComponent(partition)}`);
  }

  private async listIRules(args: Record<string, unknown>): Promise<ToolResult> {
    const partition = (args.partition as string) || this.partition;
    return this.f5Get(`/tm/ltm/rule?$filter=partition+eq+${encodeURIComponent(partition)}`);
  }

  private async listMonitors(args: Record<string, unknown>): Promise<ToolResult> {
    const type = (args.type as string) || 'http';
    const partition = (args.partition as string) || this.partition;
    return this.f5Get(`/tm/ltm/monitor/${encodeURIComponent(type)}?$filter=partition+eq+${encodeURIComponent(partition)}`);
  }

  private async listWafPolicies(args: Record<string, unknown>): Promise<ToolResult> {
    const limit = (args.limit as number) || 50;
    const offset = (args.offset as number) || 0;
    return this.f5Get(`/tm/asm/policies?$top=${limit}&$skip=${offset}`);
  }
}

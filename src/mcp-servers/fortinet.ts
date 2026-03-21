/**
 * @epicai/core — Fortinet MCP Server
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */
import { ToolDefinition, ToolResult } from './types.js';

export class FortinetMCPServer {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly headers: Record<string, string>;

  constructor(config: { baseUrl: string; apiKey: string }) {
    this.baseUrl = config.baseUrl;
    this.apiKey = config.apiKey;
    this.headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`,
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_firewall_policies',
        description: 'List all firewall policies on the FortiGate device',
        inputSchema: {
          type: 'object',
          properties: {
            vdom: {
              type: 'string',
              description: 'Virtual domain name (default: root)',
            },
            filter: {
              type: 'string',
              description: 'Filter expression for policies',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of policies to return',
            },
            start: {
              type: 'number',
              description: 'Starting index for pagination',
            },
          },
        },
      },
      {
        name: 'get_threats',
        description: 'Retrieve threat information and statistics',
        inputSchema: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              description: 'Threat type filter (e.g., "virus", "malware")',
            },
          },
        },
      },
      {
        name: 'list_vpn_tunnels',
        description: 'List all configured VPN tunnels',
        inputSchema: {
          type: 'object',
          properties: {
            vdom: {
              type: 'string',
              description: 'Virtual domain name',
            },
            status: {
              type: 'string',
              description: 'Filter by tunnel status (up/down)',
            },
          },
        },
      },
      {
        name: 'get_system_status',
        description: 'Get current system status and statistics',
        inputSchema: {
          type: 'object',
          properties: {
            vdom: {
              type: 'string',
              description: 'Virtual domain name',
            },
          },
        },
      },
      {
        name: 'list_addresses',
        description: 'List all configured address objects',
        inputSchema: {
          type: 'object',
          properties: {
            vdom: {
              type: 'string',
              description: 'Virtual domain name',
            },
            filter: {
              type: 'string',
              description: 'Filter expression for addresses',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of addresses to return',
            },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_firewall_policies':
          return await this.listFirewallPolicies(args);
        case 'get_threats':
          return await this.getThreats(args);
        case 'list_vpn_tunnels':
          return await this.listVpnTunnels(args);
        case 'get_system_status':
          return await this.getSystemStatus(args);
        case 'list_addresses':
          return await this.listAddresses(args);
        default:
          return {
            content: [{ type: 'text', text: `Unknown tool: ${name}` }],
            isError: true,
          };
      }
    } catch (error) {
      return {
        content: [{ type: 'text', text: String(error instanceof Error ? error.message : 'Unknown error') }],
        isError: true,
      };
    }
  }

  private async listFirewallPolicies(args: Record<string, unknown>): Promise<ToolResult> {
    const vdom = (args.vdom as string) || 'root';
    const filter = args.filter as string | undefined;
    const limit = (args.limit as number) || 100;
    const start = (args.start as number) || 0;

    let url = `${this.baseUrl}/cmdb/firewall/policy?vdom=${encodeURIComponent(vdom)}&limit=${limit}&start=${start}`;

    if (filter) {
      url += `&filter=${encodeURIComponent(filter)}`;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`Fortinet API error: ${response.status} ${response.statusText}`);
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new Error(`Fortinet returned non-JSON response (HTTP ${response.status})`);
    }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async getThreats(args: Record<string, unknown>): Promise<ToolResult> {
    const type = args.type as string | undefined;

    let url = `${this.baseUrl}/monitor/system/security-rating`;

    if (type) {
      url += `?filter=${encodeURIComponent(`type=${type}`)}`;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`Fortinet API error: ${response.status} ${response.statusText}`);
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new Error(`Fortinet returned non-JSON response (HTTP ${response.status})`);
    }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async listVpnTunnels(args: Record<string, unknown>): Promise<ToolResult> {
    const vdom = (args.vdom as string) || 'root';
    const status = args.status as string | undefined;

    let url = `${this.baseUrl}/cmdb/vpn/ipsec/phase1?vdom=${encodeURIComponent(vdom)}`;

    if (status) {
      url += `&filter=status%3D${encodeURIComponent(status)}`;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`Fortinet API error: ${response.status} ${response.statusText}`);
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new Error(`Fortinet returned non-JSON response (HTTP ${response.status})`);
    }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async getSystemStatus(args: Record<string, unknown>): Promise<ToolResult> {
    const vdom = (args.vdom as string) || 'root';

    const url = `${this.baseUrl}/monitor/system/status?vdom=${encodeURIComponent(vdom)}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`Fortinet API error: ${response.status} ${response.statusText}`);
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new Error(`Fortinet returned non-JSON response (HTTP ${response.status})`);
    }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async listAddresses(args: Record<string, unknown>): Promise<ToolResult> {
    const vdom = (args.vdom as string) || 'root';
    const filter = args.filter as string | undefined;
    const limit = (args.limit as number) || 100;

    let url = `${this.baseUrl}/cmdb/firewall/address?vdom=${encodeURIComponent(vdom)}&limit=${limit}`;

    if (filter) {
      url += `&filter=${encodeURIComponent(filter)}`;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`Fortinet API error: ${response.status} ${response.statusText}`);
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new Error(`Fortinet returned non-JSON response (HTTP ${response.status})`);
    }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }
}

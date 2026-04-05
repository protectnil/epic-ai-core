/**
 * Fortinet FortiGate MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03. No official Fortinet-published MCP server
//   exists on GitHub or npmjs. Community tools exist but are not Fortinet products.
//
// Base URL: https://<fortigate-host>  (customer-provided; no SaaS base URL)
// Auth: Bearer token — Authorization: Bearer <api_token>
//   FortiOS v7.4.5+ requires the token in the Authorization header.
//   Legacy (<7.4.5): token as ?access_token= query param (not supported here).
// Docs: https://docs.fortinet.com/document/fortigate/7.4.5/fortios-rest-api-reference/
// Rate limits: Not published; enforced per-device. Recommend ≤60 req/min for production.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface FortinetConfig {
  baseUrl: string;   // e.g. https://192.168.1.1 or https://fortigate.corp.example.com
  apiKey: string;    // FortiOS REST API token (Administrator > REST API Admin)
}

export class FortinetMCPServer extends MCPAdapterBase {
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(config: FortinetConfig) {
    super();
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.apiKey = config.apiKey;
  }

  static catalog() {
    return {
      name: 'fortinet',
      displayName: 'Fortinet FortiGate',
      version: '1.0.0',
      category: 'cybersecurity' as const,
      keywords: ['fortinet', 'fortigate', 'fortios', 'firewall', 'ngfw', 'vpn', 'ipsec', 'ips', 'utm', 'network security', 'nac', 'policy', 'threat'],
      toolNames: [
        'list_firewall_policies', 'get_firewall_policy', 'create_firewall_policy', 'update_firewall_policy', 'delete_firewall_policy',
        'list_addresses', 'get_address', 'create_address', 'update_address', 'delete_address',
        'list_address_groups', 'get_address_group',
        'list_services', 'get_service',
        'list_vpn_tunnels', 'get_vpn_tunnel',
        'list_vpn_ssl_settings',
        'get_system_status', 'get_system_performance',
        'list_interfaces', 'get_interface',
        'get_threats', 'list_antivirus_profiles', 'list_webfilter_profiles',
        'list_routing_static',
      ],
      description: 'Manage Fortinet FortiGate firewall: policies, addresses, services, VPN tunnels, IPS threats, system status, interfaces, and routing via the FortiOS REST API.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      // ── Firewall Policies ──────────────────────────────────────────────────
      {
        name: 'list_firewall_policies',
        description: 'List all firewall policies on the FortiGate, with optional VDOM, filter, and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            vdom: { type: 'string', description: 'Virtual domain name (default: root)' },
            filter: { type: 'string', description: 'FortiOS filter expression, e.g. name==webfilter-policy' },
            limit: { type: 'number', description: 'Maximum number of results to return (default: 100)' },
            start: { type: 'number', description: 'Starting index for pagination (default: 0)' },
          },
        },
      },
      {
        name: 'get_firewall_policy',
        description: 'Get a specific firewall policy by its policy ID number',
        inputSchema: {
          type: 'object',
          properties: {
            policy_id: { type: 'number', description: 'Firewall policy ID number' },
            vdom: { type: 'string', description: 'Virtual domain name (default: root)' },
          },
          required: ['policy_id'],
        },
      },
      {
        name: 'create_firewall_policy',
        description: 'Create a new firewall policy specifying source/destination interfaces, addresses, services, and action',
        inputSchema: {
          type: 'object',
          properties: {
            vdom: { type: 'string', description: 'Virtual domain name (default: root)' },
            name: { type: 'string', description: 'Policy name' },
            srcintf: { type: 'string', description: 'Source interface name (e.g. port1, any)' },
            dstintf: { type: 'string', description: 'Destination interface name (e.g. wan1, any)' },
            srcaddr: { type: 'string', description: 'Source address object name (e.g. all, LAN_SUBNET)' },
            dstaddr: { type: 'string', description: 'Destination address object name (e.g. all)' },
            action: { type: 'string', description: 'Policy action: accept or deny (default: accept)' },
            service: { type: 'string', description: 'Service object name (e.g. ALL, HTTP, HTTPS)' },
            logtraffic: { type: 'string', description: 'Log traffic: all, utm, or disable (default: utm)' },
            comments: { type: 'string', description: 'Optional policy comment' },
          },
          required: ['srcintf', 'dstintf', 'srcaddr', 'dstaddr', 'action'],
        },
      },
      {
        name: 'update_firewall_policy',
        description: 'Update an existing firewall policy by ID — changes action, addresses, services, or logging',
        inputSchema: {
          type: 'object',
          properties: {
            policy_id: { type: 'number', description: 'Firewall policy ID number to update' },
            vdom: { type: 'string', description: 'Virtual domain name (default: root)' },
            action: { type: 'string', description: 'New action: accept or deny' },
            service: { type: 'string', description: 'New service object name' },
            logtraffic: { type: 'string', description: 'Log traffic: all, utm, or disable' },
            comments: { type: 'string', description: 'Updated comment' },
            status: { type: 'string', description: 'Policy status: enable or disable' },
          },
          required: ['policy_id'],
        },
      },
      {
        name: 'delete_firewall_policy',
        description: 'Delete a firewall policy by ID. Removed policies cannot be recovered.',
        inputSchema: {
          type: 'object',
          properties: {
            policy_id: { type: 'number', description: 'Firewall policy ID number to delete' },
            vdom: { type: 'string', description: 'Virtual domain name (default: root)' },
          },
          required: ['policy_id'],
        },
      },
      // ── Addresses ─────────────────────────────────────────────────────────
      {
        name: 'list_addresses',
        description: 'List all configured address objects on the FortiGate, with optional filter and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            vdom: { type: 'string', description: 'Virtual domain name (default: root)' },
            filter: { type: 'string', description: 'FortiOS filter expression, e.g. type==subnet' },
            limit: { type: 'number', description: 'Maximum number of results to return (default: 100)' },
            start: { type: 'number', description: 'Pagination start index (default: 0)' },
          },
        },
      },
      {
        name: 'get_address',
        description: 'Get a specific address object by name',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Address object name' },
            vdom: { type: 'string', description: 'Virtual domain name (default: root)' },
          },
          required: ['name'],
        },
      },
      {
        name: 'create_address',
        description: 'Create a new address object (subnet, IP range, FQDN, or geography) on the FortiGate',
        inputSchema: {
          type: 'object',
          properties: {
            vdom: { type: 'string', description: 'Virtual domain name (default: root)' },
            name: { type: 'string', description: 'Name of the address object' },
            type: { type: 'string', description: 'Type: subnet, iprange, fqdn, geography (default: subnet)' },
            subnet: { type: 'string', description: 'Subnet in CIDR notation, e.g. 192.168.1.0/24 (for type=subnet)' },
            fqdn: { type: 'string', description: 'Fully qualified domain name (for type=fqdn)' },
            start_ip: { type: 'string', description: 'Start IP for range (for type=iprange)' },
            end_ip: { type: 'string', description: 'End IP for range (for type=iprange)' },
            comment: { type: 'string', description: 'Optional comment' },
          },
          required: ['name'],
        },
      },
      {
        name: 'update_address',
        description: 'Update an existing address object by name',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Address object name to update' },
            vdom: { type: 'string', description: 'Virtual domain name (default: root)' },
            subnet: { type: 'string', description: 'New subnet in CIDR notation' },
            fqdn: { type: 'string', description: 'New FQDN value' },
            comment: { type: 'string', description: 'Updated comment' },
          },
          required: ['name'],
        },
      },
      {
        name: 'delete_address',
        description: 'Delete an address object by name. Will fail if the address is referenced by a policy.',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Address object name to delete' },
            vdom: { type: 'string', description: 'Virtual domain name (default: root)' },
          },
          required: ['name'],
        },
      },
      // ── Address Groups ─────────────────────────────────────────────────────
      {
        name: 'list_address_groups',
        description: 'List all address group objects, which aggregate multiple address objects into a single reference',
        inputSchema: {
          type: 'object',
          properties: {
            vdom: { type: 'string', description: 'Virtual domain name (default: root)' },
            limit: { type: 'number', description: 'Maximum number of results (default: 100)' },
          },
        },
      },
      {
        name: 'get_address_group',
        description: 'Get a specific address group by name, showing all member addresses',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Address group name' },
            vdom: { type: 'string', description: 'Virtual domain name (default: root)' },
          },
          required: ['name'],
        },
      },
      // ── Services ──────────────────────────────────────────────────────────
      {
        name: 'list_services',
        description: 'List all custom service objects (TCP/UDP ports and protocols) defined on the FortiGate',
        inputSchema: {
          type: 'object',
          properties: {
            vdom: { type: 'string', description: 'Virtual domain name (default: root)' },
            limit: { type: 'number', description: 'Maximum number of results (default: 100)' },
          },
        },
      },
      {
        name: 'get_service',
        description: 'Get a specific service object by name, showing port ranges and protocol',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Service object name' },
            vdom: { type: 'string', description: 'Virtual domain name (default: root)' },
          },
          required: ['name'],
        },
      },
      // ── VPN ───────────────────────────────────────────────────────────────
      {
        name: 'list_vpn_tunnels',
        description: 'List all IPsec VPN phase1 tunnel configurations, with optional VDOM and status filter',
        inputSchema: {
          type: 'object',
          properties: {
            vdom: { type: 'string', description: 'Virtual domain name (default: root)' },
            filter: { type: 'string', description: 'Filter expression, e.g. status==up' },
            limit: { type: 'number', description: 'Maximum number of results (default: 100)' },
          },
        },
      },
      {
        name: 'get_vpn_tunnel',
        description: 'Get configuration details for a specific IPsec VPN phase1 tunnel by name',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'VPN tunnel name' },
            vdom: { type: 'string', description: 'Virtual domain name (default: root)' },
          },
          required: ['name'],
        },
      },
      {
        name: 'list_vpn_ssl_settings',
        description: 'Retrieve SSL VPN (web-mode and tunnel-mode) global settings and portal configuration',
        inputSchema: {
          type: 'object',
          properties: {
            vdom: { type: 'string', description: 'Virtual domain name (default: root)' },
          },
        },
      },
      // ── System ────────────────────────────────────────────────────────────
      {
        name: 'get_system_status',
        description: 'Get the FortiGate system status including version, serial number, hostname, and VDOM mode',
        inputSchema: {
          type: 'object',
          properties: {
            vdom: { type: 'string', description: 'Virtual domain name (default: root)' },
          },
        },
      },
      {
        name: 'get_system_performance',
        description: 'Get real-time CPU, memory, disk, and session usage statistics from the FortiGate',
        inputSchema: {
          type: 'object',
          properties: {
            vdom: { type: 'string', description: 'Virtual domain name (default: root)' },
          },
        },
      },
      // ── Interfaces ────────────────────────────────────────────────────────
      {
        name: 'list_interfaces',
        description: 'List all network interfaces (physical, VLAN, loopback) and their IP/mode configuration',
        inputSchema: {
          type: 'object',
          properties: {
            vdom: { type: 'string', description: 'Virtual domain name (default: root)' },
            filter: { type: 'string', description: 'Filter expression, e.g. type==physical' },
            limit: { type: 'number', description: 'Maximum number of results (default: 100)' },
          },
        },
      },
      {
        name: 'get_interface',
        description: 'Get configuration and status details for a specific network interface by name',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Interface name, e.g. port1, wan1, mgmt' },
            vdom: { type: 'string', description: 'Virtual domain name (default: root)' },
          },
          required: ['name'],
        },
      },
      // ── Threats / Security Profiles ────────────────────────────────────────
      {
        name: 'get_threats',
        description: 'Retrieve IPS/intrusion prevention threat events from the on-device disk log, filterable by severity',
        inputSchema: {
          type: 'object',
          properties: {
            vdom: { type: 'string', description: 'Virtual domain name (default: root)' },
            severity: { type: 'string', description: 'Filter by severity: emergency, alert, critical, error, warning, notice, information, debug' },
            rows: { type: 'number', description: 'Maximum number of log events to return (default: 50, max: 1000)' },
          },
        },
      },
      {
        name: 'list_antivirus_profiles',
        description: 'List all antivirus security profiles configured on the FortiGate',
        inputSchema: {
          type: 'object',
          properties: {
            vdom: { type: 'string', description: 'Virtual domain name (default: root)' },
            limit: { type: 'number', description: 'Maximum number of results (default: 100)' },
          },
        },
      },
      {
        name: 'list_webfilter_profiles',
        description: 'List all web filter security profiles configured on the FortiGate',
        inputSchema: {
          type: 'object',
          properties: {
            vdom: { type: 'string', description: 'Virtual domain name (default: root)' },
            limit: { type: 'number', description: 'Maximum number of results (default: 100)' },
          },
        },
      },
      // ── Routing ───────────────────────────────────────────────────────────
      {
        name: 'list_routing_static',
        description: 'List all static routing entries on the FortiGate, showing destination, gateway, and interface',
        inputSchema: {
          type: 'object',
          properties: {
            vdom: { type: 'string', description: 'Virtual domain name (default: root)' },
            filter: { type: 'string', description: 'Filter expression, e.g. dst==0.0.0.0/0 for default routes' },
            limit: { type: 'number', description: 'Maximum number of results (default: 100)' },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_firewall_policies':  return await this.listFirewallPolicies(args);
        case 'get_firewall_policy':     return await this.getFirewallPolicy(args);
        case 'create_firewall_policy':  return await this.createFirewallPolicy(args);
        case 'update_firewall_policy':  return await this.updateFirewallPolicy(args);
        case 'delete_firewall_policy':  return await this.deleteFirewallPolicy(args);
        case 'list_addresses':          return await this.listAddresses(args);
        case 'get_address':             return await this.getAddress(args);
        case 'create_address':          return await this.createAddress(args);
        case 'update_address':          return await this.updateAddress(args);
        case 'delete_address':          return await this.deleteAddress(args);
        case 'list_address_groups':     return await this.listAddressGroups(args);
        case 'get_address_group':       return await this.getAddressGroup(args);
        case 'list_services':           return await this.listServices(args);
        case 'get_service':             return await this.getService(args);
        case 'list_vpn_tunnels':        return await this.listVpnTunnels(args);
        case 'get_vpn_tunnel':          return await this.getVpnTunnel(args);
        case 'list_vpn_ssl_settings':   return await this.listVpnSslSettings(args);
        case 'get_system_status':       return await this.getSystemStatus(args);
        case 'get_system_performance':  return await this.getSystemPerformance(args);
        case 'list_interfaces':         return await this.listInterfaces(args);
        case 'get_interface':           return await this.getInterface(args);
        case 'get_threats':             return await this.getThreats(args);
        case 'list_antivirus_profiles': return await this.listAntivirusProfiles(args);
        case 'list_webfilter_profiles': return await this.listWebfilterProfiles(args);
        case 'list_routing_static':     return await this.listRoutingStatic(args);
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

  // ── Private helpers ────────────────────────────────────────────────────────

  private buildHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`,
    };
  }

  private async fortiRequest(path: string, options: RequestInit = {}): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      ...options,
      headers: this.buildHeaders(),
    });

    if (!response.ok) {
      let detail = '';
      try { detail = await response.text(); } catch { /* ignore */ }
      return {
        content: [{ type: 'text', text: `FortiOS API error ${response.status} ${response.statusText}${detail ? ': ' + detail.slice(0, 400) : ''}` }],
        isError: true,
      };
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      return { content: [{ type: 'text', text: `FortiGate returned non-JSON response (HTTP ${response.status})` }], isError: true };
    }

    const text = JSON.stringify(data, null, 2);
    const truncated = text.length > 10_000
      ? text.slice(0, 10_000) + `\n... [truncated, ${text.length} total chars]`
      : text;
    return { content: [{ type: 'text', text: truncated }], isError: false };
  }

  private vdomParams(args: Record<string, unknown>, extra: Record<string, string> = {}): string {
    const params = new URLSearchParams({ vdom: (args.vdom as string) || 'root', ...extra });
    if (args.filter) params.set('filter', args.filter as string);
    if (args.limit !== undefined) params.set('limit', String(args.limit));
    if (args.start !== undefined) params.set('start', String(args.start));
    return params.toString();
  }

  // ── Firewall Policies ──────────────────────────────────────────────────────

  private async listFirewallPolicies(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fortiRequest(`/api/v2/cmdb/firewall/policy?${this.vdomParams(args)}`);
  }

  private async getFirewallPolicy(args: Record<string, unknown>): Promise<ToolResult> {
    const vdom = (args.vdom as string) || 'root';
    return this.fortiRequest(`/api/v2/cmdb/firewall/policy/${encodeURIComponent(String(args.policy_id))}?vdom=${vdom}`);
  }

  private async createFirewallPolicy(args: Record<string, unknown>): Promise<ToolResult> {
    const vdom = (args.vdom as string) || 'root';
    const body: Record<string, unknown> = {
      srcintf: [{ name: args.srcintf }],
      dstintf: [{ name: args.dstintf }],
      srcaddr: [{ name: args.srcaddr }],
      dstaddr: [{ name: args.dstaddr }],
      action: args.action || 'accept',
      service: [{ name: args.service || 'ALL' }],
      logtraffic: args.logtraffic || 'utm',
      status: 'enable',
    };
    if (args.name) body.name = args.name;
    if (args.comments) body.comments = args.comments;
    return this.fortiRequest(`/api/v2/cmdb/firewall/policy?vdom=${vdom}`, { method: 'POST', body: JSON.stringify(body) });
  }

  private async updateFirewallPolicy(args: Record<string, unknown>): Promise<ToolResult> {
    const vdom = (args.vdom as string) || 'root';
    const body: Record<string, unknown> = {};
    if (args.action) body.action = args.action;
    if (args.service) body.service = [{ name: args.service }];
    if (args.logtraffic) body.logtraffic = args.logtraffic;
    if (args.comments) body.comments = args.comments;
    if (args.status) body.status = args.status;
    return this.fortiRequest(`/api/v2/cmdb/firewall/policy/${encodeURIComponent(String(args.policy_id))}?vdom=${vdom}`, { method: 'PUT', body: JSON.stringify(body) });
  }

  private async deleteFirewallPolicy(args: Record<string, unknown>): Promise<ToolResult> {
    const vdom = (args.vdom as string) || 'root';
    return this.fortiRequest(`/api/v2/cmdb/firewall/policy/${encodeURIComponent(String(args.policy_id))}?vdom=${vdom}`, { method: 'DELETE' });
  }

  // ── Addresses ────────────────────────────────────────────────────────────

  private async listAddresses(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fortiRequest(`/api/v2/cmdb/firewall/address?${this.vdomParams(args)}`);
  }

  private async getAddress(args: Record<string, unknown>): Promise<ToolResult> {
    const vdom = (args.vdom as string) || 'root';
    return this.fortiRequest(`/api/v2/cmdb/firewall/address/${encodeURIComponent(args.name as string)}?vdom=${vdom}`);
  }

  private async createAddress(args: Record<string, unknown>): Promise<ToolResult> {
    const vdom = (args.vdom as string) || 'root';
    const body: Record<string, unknown> = {
      name: args.name,
      type: args.type || 'subnet',
    };
    if (args.subnet) body.subnet = args.subnet;
    if (args.fqdn) body.fqdn = args.fqdn;
    if (args.start_ip) body['start-ip'] = args.start_ip;
    if (args.end_ip) body['end-ip'] = args.end_ip;
    if (args.comment) body.comment = args.comment;
    return this.fortiRequest(`/api/v2/cmdb/firewall/address?vdom=${vdom}`, { method: 'POST', body: JSON.stringify(body) });
  }

  private async updateAddress(args: Record<string, unknown>): Promise<ToolResult> {
    const vdom = (args.vdom as string) || 'root';
    const body: Record<string, unknown> = {};
    if (args.subnet) body.subnet = args.subnet;
    if (args.fqdn) body.fqdn = args.fqdn;
    if (args.comment) body.comment = args.comment;
    return this.fortiRequest(`/api/v2/cmdb/firewall/address/${encodeURIComponent(args.name as string)}?vdom=${vdom}`, { method: 'PUT', body: JSON.stringify(body) });
  }

  private async deleteAddress(args: Record<string, unknown>): Promise<ToolResult> {
    const vdom = (args.vdom as string) || 'root';
    return this.fortiRequest(`/api/v2/cmdb/firewall/address/${encodeURIComponent(args.name as string)}?vdom=${vdom}`, { method: 'DELETE' });
  }

  // ── Address Groups ────────────────────────────────────────────────────────

  private async listAddressGroups(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams({ vdom: (args.vdom as string) || 'root' });
    if (args.limit !== undefined) params.set('limit', String(args.limit));
    return this.fortiRequest(`/api/v2/cmdb/firewall/addrgrp?${params.toString()}`);
  }

  private async getAddressGroup(args: Record<string, unknown>): Promise<ToolResult> {
    const vdom = (args.vdom as string) || 'root';
    return this.fortiRequest(`/api/v2/cmdb/firewall/addrgrp/${encodeURIComponent(args.name as string)}?vdom=${vdom}`);
  }

  // ── Services ─────────────────────────────────────────────────────────────

  private async listServices(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams({ vdom: (args.vdom as string) || 'root' });
    if (args.limit !== undefined) params.set('limit', String(args.limit));
    return this.fortiRequest(`/api/v2/cmdb/firewall.service/custom?${params.toString()}`);
  }

  private async getService(args: Record<string, unknown>): Promise<ToolResult> {
    const vdom = (args.vdom as string) || 'root';
    return this.fortiRequest(`/api/v2/cmdb/firewall.service/custom/${encodeURIComponent(args.name as string)}?vdom=${vdom}`);
  }

  // ── VPN ──────────────────────────────────────────────────────────────────

  private async listVpnTunnels(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fortiRequest(`/api/v2/cmdb/vpn.ipsec/phase1?${this.vdomParams(args)}`);
  }

  private async getVpnTunnel(args: Record<string, unknown>): Promise<ToolResult> {
    const vdom = (args.vdom as string) || 'root';
    return this.fortiRequest(`/api/v2/cmdb/vpn.ipsec/phase1/${encodeURIComponent(args.name as string)}?vdom=${vdom}`);
  }

  private async listVpnSslSettings(args: Record<string, unknown>): Promise<ToolResult> {
    const vdom = (args.vdom as string) || 'root';
    return this.fortiRequest(`/api/v2/cmdb/vpn.ssl/settings?vdom=${vdom}`);
  }

  // ── System ────────────────────────────────────────────────────────────────

  private async getSystemStatus(args: Record<string, unknown>): Promise<ToolResult> {
    const vdom = (args.vdom as string) || 'root';
    return this.fortiRequest(`/api/v2/monitor/system/status?vdom=${vdom}`);
  }

  private async getSystemPerformance(args: Record<string, unknown>): Promise<ToolResult> {
    const vdom = (args.vdom as string) || 'root';
    return this.fortiRequest(`/api/v2/monitor/system/performance/status?vdom=${vdom}`);
  }

  // ── Interfaces ────────────────────────────────────────────────────────────

  private async listInterfaces(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fortiRequest(`/api/v2/cmdb/system/interface?${this.vdomParams(args)}`);
  }

  private async getInterface(args: Record<string, unknown>): Promise<ToolResult> {
    const vdom = (args.vdom as string) || 'root';
    return this.fortiRequest(`/api/v2/cmdb/system/interface/${encodeURIComponent(args.name as string)}?vdom=${vdom}`);
  }

  // ── Threats / Security Profiles ───────────────────────────────────────────

  private async getThreats(args: Record<string, unknown>): Promise<ToolResult> {
    const vdom = (args.vdom as string) || 'root';
    const rows = (args.rows as number) || 50;
    let url = `/api/v2/log/disk/utm?vdom=${encodeURIComponent(vdom)}&rows=${rows}&filter=subtype==ips`;
    if (args.severity) url += `&filter=level==${encodeURIComponent(args.severity as string)}`;
    return this.fortiRequest(url);
  }

  private async listAntivirusProfiles(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams({ vdom: (args.vdom as string) || 'root' });
    if (args.limit !== undefined) params.set('limit', String(args.limit));
    return this.fortiRequest(`/api/v2/cmdb/antivirus/profile?${params.toString()}`);
  }

  private async listWebfilterProfiles(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams({ vdom: (args.vdom as string) || 'root' });
    if (args.limit !== undefined) params.set('limit', String(args.limit));
    return this.fortiRequest(`/api/v2/cmdb/webfilter/profile?${params.toString()}`);
  }

  // ── Routing ───────────────────────────────────────────────────────────────

  private async listRoutingStatic(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fortiRequest(`/api/v2/cmdb/router/static?${this.vdomParams(args)}`);
  }
}

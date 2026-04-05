/**
 * IX-API MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// Base URL: https://<ix-host>/api/v2  (IX-API is deployed per-IXP, no single global host)
// Auth: Bearer token (POST /auth/token with username+password, or OAuth2)
// Docs: https://docs.ix-api.net/

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface IXAPIConfig {
  /**
   * Base URL of the IX-API instance (each IXP runs its own deployment).
   * Example: https://api.de-cix.net/api/v2
   */
  baseUrl: string;
  /**
   * Bearer access token obtained via POST /auth/token.
   * Either provide this directly or call auth_token to obtain one.
   */
  accessToken?: string;
}

export class IXAPIMCPServer extends MCPAdapterBase {
  private readonly baseUrl: string;
  private accessToken: string;

  constructor(config: IXAPIConfig) {
    super();
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.accessToken = config.accessToken || '';
  }

  private get headers(): Record<string, string> {
    const h: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
    if (this.accessToken) h.Authorization = `Bearer ${this.accessToken}`;
    return h;
  }

  get tools(): ToolDefinition[] {
    return [
      // --- Authentication ---
      {
        name: 'auth_token',
        description: 'Obtain a Bearer access token using username and password credentials.',
        inputSchema: {
          type: 'object',
          properties: {
            username: { type: 'string', description: 'IX-API username' },
            password: { type: 'string', description: 'IX-API password' },
          },
          required: ['username', 'password'],
        },
      },
      {
        name: 'auth_refresh',
        description: 'Refresh an existing access token using a refresh token.',
        inputSchema: {
          type: 'object',
          properties: {
            refresh: { type: 'string', description: 'Refresh token from a previous auth_token call' },
          },
          required: ['refresh'],
        },
      },
      // --- Infrastructure (read-only) ---
      {
        name: 'list_facilities',
        description: 'List data center facilities where IX infrastructure is present.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Filter by facility ID(s), comma-separated' },
            page_limit: { type: 'number', description: 'Maximum results per page' },
            page_offset: { type: 'number', description: 'Pagination offset' },
          },
        },
      },
      {
        name: 'get_facility',
        description: 'Get details of a specific data center facility by ID.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Facility ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'list_pops',
        description: 'List Points of Presence (PoPs) at the exchange.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Filter by PoP ID(s)' },
            facility: { type: 'string', description: 'Filter by facility ID' },
            page_limit: { type: 'number', description: 'Results per page' },
            page_offset: { type: 'number', description: 'Pagination offset' },
          },
        },
      },
      {
        name: 'get_pop',
        description: 'Get details of a specific Point of Presence by ID.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'PoP ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'list_metro_areas',
        description: 'List metropolitan areas covered by the exchange.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Filter by metro area ID(s)' },
            page_limit: { type: 'number', description: 'Results per page' },
            page_offset: { type: 'number', description: 'Pagination offset' },
          },
        },
      },
      {
        name: 'list_metro_area_networks',
        description: 'List metro area networks available at the exchange.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Filter by metro area network ID(s)' },
            name: { type: 'string', description: 'Filter by name' },
            page_limit: { type: 'number', description: 'Results per page' },
            page_offset: { type: 'number', description: 'Pagination offset' },
          },
        },
      },
      {
        name: 'list_product_offerings',
        description: 'List available product offerings (port types, speeds, service types) at the exchange.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Filter by product offering ID(s)' },
            type: { type: 'string', description: 'Filter by product type' },
            page_limit: { type: 'number', description: 'Results per page' },
            page_offset: { type: 'number', description: 'Pagination offset' },
          },
        },
      },
      {
        name: 'get_product_offering',
        description: 'Get details of a specific product offering by ID.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Product offering ID' },
          },
          required: ['id'],
        },
      },
      // --- Ports ---
      {
        name: 'list_ports',
        description: 'List physical ports provisioned for the account with optional state filter.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Filter by port ID(s)' },
            state: { type: 'string', description: 'Filter by state: requested, allocated, testing, production, decommissioned' },
            page_limit: { type: 'number', description: 'Results per page' },
            page_offset: { type: 'number', description: 'Pagination offset' },
          },
        },
      },
      {
        name: 'get_port',
        description: 'Get details of a specific port by ID.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Port ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'get_port_statistics',
        description: 'Get traffic statistics (in/out bps) for a port over a time range.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Port ID' },
            start: { type: 'string', description: 'Start timestamp (ISO 8601)' },
            end: { type: 'string', description: 'End timestamp (ISO 8601)' },
          },
          required: ['id'],
        },
      },
      // --- Port Reservations ---
      {
        name: 'list_port_reservations',
        description: 'List port reservations for the account with optional state filter.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Filter by reservation ID(s)' },
            state: { type: 'string', description: 'Filter by state' },
            page_limit: { type: 'number', description: 'Results per page' },
            page_offset: { type: 'number', description: 'Pagination offset' },
          },
        },
      },
      {
        name: 'create_port_reservation',
        description: 'Create a new port reservation (request a physical port at an IX facility).',
        inputSchema: {
          type: 'object',
          properties: {
            managing_account: { type: 'string', description: 'Managing account ID' },
            consuming_account: { type: 'string', description: 'Consuming account ID' },
            product_offering: { type: 'string', description: 'Product offering ID for the port type/speed' },
            pop: { type: 'string', description: 'Point of Presence ID where the port should be provisioned' },
            external_ref: { type: 'string', description: 'Optional external reference string' },
          },
          required: ['managing_account', 'consuming_account', 'product_offering', 'pop'],
        },
      },
      {
        name: 'get_port_reservation',
        description: 'Get details of a specific port reservation by ID.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Port reservation ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'update_port_reservation',
        description: 'Update a port reservation (PATCH — partial update).',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Port reservation ID to update' },
            external_ref: { type: 'string', description: 'New external reference' },
          },
          required: ['id'],
        },
      },
      {
        name: 'decommission_port_reservation',
        description: 'Request decommissioning of a port reservation.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Port reservation ID to decommission' },
          },
          required: ['id'],
        },
      },
      // --- Connections ---
      {
        name: 'list_connections',
        description: 'List IX connections (cross-connects to the exchange switch) with optional state filter.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Filter by connection ID(s)' },
            state: { type: 'string', description: 'Filter by state: requested, allocated, testing, production, decommissioned' },
            page_limit: { type: 'number', description: 'Results per page' },
            page_offset: { type: 'number', description: 'Pagination offset' },
          },
        },
      },
      {
        name: 'create_connection',
        description: 'Create a new IX connection (provision a cross-connect to the exchange).',
        inputSchema: {
          type: 'object',
          properties: {
            managing_account: { type: 'string', description: 'Managing account ID' },
            consuming_account: { type: 'string', description: 'Consuming account ID' },
            product_offering: { type: 'string', description: 'Product offering ID' },
            port_reservation: { type: 'string', description: 'Port reservation ID to associate with this connection' },
            external_ref: { type: 'string', description: 'Optional external reference' },
          },
          required: ['managing_account', 'consuming_account', 'product_offering'],
        },
      },
      {
        name: 'get_connection',
        description: 'Get details of a specific IX connection by ID.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Connection ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'update_connection',
        description: 'Update an IX connection (PATCH — partial update).',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Connection ID to update' },
            external_ref: { type: 'string', description: 'New external reference' },
          },
          required: ['id'],
        },
      },
      {
        name: 'decommission_connection',
        description: 'Request decommissioning of an IX connection.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Connection ID to decommission' },
          },
          required: ['id'],
        },
      },
      {
        name: 'get_connection_statistics',
        description: 'Get traffic statistics for an IX connection over a time range.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Connection ID' },
            start: { type: 'string', description: 'Start timestamp (ISO 8601)' },
            end: { type: 'string', description: 'End timestamp (ISO 8601)' },
          },
          required: ['id'],
        },
      },
      // --- Network Service Configs ---
      {
        name: 'list_network_service_configs',
        description: 'List network service configurations (peering LAN memberships, etc.) with optional state filter.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Filter by NSC ID(s)' },
            state: { type: 'string', description: 'Filter by state' },
            page_limit: { type: 'number', description: 'Results per page' },
            page_offset: { type: 'number', description: 'Pagination offset' },
          },
        },
      },
      {
        name: 'create_network_service_config',
        description: 'Create a new network service configuration (e.g. join a peering LAN).',
        inputSchema: {
          type: 'object',
          properties: {
            managing_account: { type: 'string', description: 'Managing account ID' },
            consuming_account: { type: 'string', description: 'Consuming account ID' },
            connection: { type: 'string', description: 'Connection ID to attach this service to' },
            network_service: { type: 'string', description: 'Network service ID (peering LAN, etc.)' },
            asns: { type: 'array', description: 'List of ASN objects for peering', items: { type: 'object' } },
            ips: { type: 'array', description: 'IP address assignments', items: { type: 'object' } },
            vlan_config: { type: 'object', description: 'VLAN configuration object' },
          },
          required: ['managing_account', 'consuming_account', 'connection', 'network_service'],
        },
      },
      {
        name: 'get_network_service_config',
        description: 'Get details of a specific network service configuration by ID.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Network service config ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'update_network_service_config',
        description: 'Update a network service configuration (PATCH — partial update).',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Network service config ID to update' },
            asns: { type: 'array', description: 'Updated ASN list', items: { type: 'object' } },
            ips: { type: 'array', description: 'Updated IP assignments', items: { type: 'object' } },
            external_ref: { type: 'string', description: 'New external reference' },
          },
          required: ['id'],
        },
      },
      {
        name: 'decommission_network_service_config',
        description: 'Request decommissioning of a network service configuration.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Network service config ID to decommission' },
          },
          required: ['id'],
        },
      },
      // --- Accounts & Contacts ---
      {
        name: 'get_current_account',
        description: 'Get details of the currently authenticated account.',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'list_accounts',
        description: 'List accounts accessible to the authenticated user.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Filter by account ID(s)' },
            page_limit: { type: 'number', description: 'Results per page' },
            page_offset: { type: 'number', description: 'Pagination offset' },
          },
        },
      },
      {
        name: 'list_contacts',
        description: 'List contacts associated with accounts.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Filter by contact ID(s)' },
            managing_account: { type: 'string', description: 'Filter by managing account ID' },
            page_limit: { type: 'number', description: 'Results per page' },
            page_offset: { type: 'number', description: 'Pagination offset' },
          },
        },
      },
      {
        name: 'create_contact',
        description: 'Create a new contact for an account.',
        inputSchema: {
          type: 'object',
          properties: {
            managing_account: { type: 'string', description: 'Account ID this contact belongs to' },
            name: { type: 'string', description: 'Contact full name' },
            email: { type: 'string', description: 'Contact email address' },
            phone: { type: 'string', description: 'Contact phone number' },
          },
          required: ['managing_account', 'name', 'email'],
        },
      },
      {
        name: 'get_contact',
        description: 'Get details of a specific contact by ID.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Contact ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'delete_contact',
        description: 'Delete a contact by ID.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Contact ID to delete' },
          },
          required: ['id'],
        },
      },
      // --- Roles ---
      {
        name: 'list_roles',
        description: 'List available roles for access control.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Filter by role ID(s)' },
            name: { type: 'string', description: 'Filter by role name' },
            page_limit: { type: 'number', description: 'Results per page' },
          },
        },
      },
      {
        name: 'list_role_assignments',
        description: 'List role assignments (contact-to-role mappings).',
        inputSchema: {
          type: 'object',
          properties: {
            contact: { type: 'string', description: 'Filter by contact ID' },
            page_limit: { type: 'number', description: 'Results per page' },
          },
        },
      },
      {
        name: 'create_role_assignment',
        description: 'Assign a role to a contact.',
        inputSchema: {
          type: 'object',
          properties: {
            contact: { type: 'string', description: 'Contact ID to assign the role to' },
            role: { type: 'string', description: 'Role ID to assign' },
            scope: { type: 'string', description: 'Optional scope restriction for this assignment' },
          },
          required: ['contact', 'role'],
        },
      },
      {
        name: 'delete_role_assignment',
        description: 'Remove a role assignment by its ID.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Role assignment ID to remove' },
          },
          required: ['id'],
        },
      },
      // --- Health & Meta ---
      {
        name: 'get_health',
        description: 'Check the health/status of the IX-API instance.',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'get_implementation',
        description: 'Get IX-API implementation details including version and supported features.',
        inputSchema: { type: 'object', properties: {} },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'auth_token': return await this.authToken(args);
        case 'auth_refresh': return await this.apiPost('/auth/refresh', { refresh: args.refresh });
        case 'list_facilities': return await this.apiGet(this.buildListUrl('/facilities', args, ['capability_speed']));
        case 'get_facility': return await this.apiGet(`/facilities/${encodeURIComponent(args.id as string)}`);
        case 'list_pops': return await this.apiGet(this.buildListUrl('/pops', args, ['facility']));
        case 'get_pop': return await this.apiGet(`/pops/${encodeURIComponent(args.id as string)}`);
        case 'list_metro_areas': return await this.apiGet(this.buildListUrl('/metro-areas', args, []));
        case 'list_metro_area_networks': return await this.apiGet(this.buildListUrl('/metro-area-networks', args, ['name']));
        case 'list_product_offerings': return await this.apiGet(this.buildListUrl('/product-offerings', args, ['type']));
        case 'get_product_offering': return await this.apiGet(`/product-offerings/${encodeURIComponent(args.id as string)}`);
        case 'list_ports': return await this.apiGet(this.buildListUrl('/ports', args, ['state']));
        case 'get_port': return await this.apiGet(`/ports/${encodeURIComponent(args.id as string)}`);
        case 'get_port_statistics': return await this.getPortStats(args);
        case 'list_port_reservations': return await this.apiGet(this.buildListUrl('/port-reservations', args, ['state']));
        case 'create_port_reservation': return await this.apiPost('/port-reservations', args);
        case 'get_port_reservation': return await this.apiGet(`/port-reservations/${encodeURIComponent(args.id as string)}`);
        case 'update_port_reservation': return await this.patchResource('/port-reservations', args);
        case 'decommission_port_reservation': return await this.apiDelete(`/port-reservations/${encodeURIComponent(args.id as string)}`);
        case 'list_connections': return await this.apiGet(this.buildListUrl('/connections', args, ['state']));
        case 'create_connection': return await this.apiPost('/connections', args);
        case 'get_connection': return await this.apiGet(`/connections/${encodeURIComponent(args.id as string)}`);
        case 'update_connection': return await this.patchResource('/connections', args);
        case 'decommission_connection': return await this.apiDelete(`/connections/${encodeURIComponent(args.id as string)}`);
        case 'get_connection_statistics': return await this.getConnectionStats(args);
        case 'list_network_service_configs': return await this.apiGet(this.buildListUrl('/network-service-configs', args, ['state']));
        case 'create_network_service_config': return await this.apiPost('/network-service-configs', args);
        case 'get_network_service_config': return await this.apiGet(`/network-service-configs/${encodeURIComponent(args.id as string)}`);
        case 'update_network_service_config': return await this.patchResource('/network-service-configs', args);
        case 'decommission_network_service_config': return await this.apiDelete(`/network-service-configs/${encodeURIComponent(args.id as string)}`);
        case 'get_current_account': return await this.apiGet('/account');
        case 'list_accounts': return await this.apiGet(this.buildListUrl('/accounts', args, []));
        case 'list_contacts': return await this.apiGet(this.buildListUrl('/contacts', args, ['managing_account']));
        case 'create_contact': return await this.apiPost('/contacts', args);
        case 'get_contact': return await this.apiGet(`/contacts/${encodeURIComponent(args.id as string)}`);
        case 'delete_contact': return await this.apiDelete(`/contacts/${encodeURIComponent(args.id as string)}`);
        case 'list_roles': return await this.apiGet(this.buildListUrl('/roles', args, ['name']));
        case 'list_role_assignments': return await this.apiGet(this.buildListUrl('/role-assignments', args, ['contact']));
        case 'create_role_assignment': return await this.apiPost('/role-assignments', args);
        case 'delete_role_assignment': return await this.apiDelete(`/role-assignments/${encodeURIComponent(args.id as string)}`);
        case 'get_health': return await this.apiGet('/health');
        case 'get_implementation': return await this.apiGet('/implementation');
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

  private buildListUrl(path: string, args: Record<string, unknown>, extraFilters: string[]): string {
    const params: string[] = [];
    if (args.id) params.push(`id=${encodeURIComponent(args.id as string)}`);
    if (args.page_limit) params.push(`page_limit=${args.page_limit}`);
    if (args.page_offset) params.push(`page_offset=${args.page_offset}`);
    if (args.page_token) params.push(`page_token=${encodeURIComponent(args.page_token as string)}`);
    for (const f of extraFilters) {
      if (args[f] !== undefined) params.push(`${f}=${encodeURIComponent(args[f] as string)}`);
    }
    return params.length ? `${path}?${params.join('&')}` : path;
  }

  private async apiGet(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, { method: 'GET', headers: this.headers });
    if (!response.ok) return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apiPost(path: string, body: unknown): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, { method: 'POST', headers: this.headers, body: JSON.stringify(body) });
    if (!response.ok) return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    if (response.status === 204) return { content: [{ type: 'text', text: JSON.stringify({ success: true }) }], isError: false };
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apiPatch(path: string, body: unknown): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, { method: 'PATCH', headers: this.headers, body: JSON.stringify(body) });
    if (!response.ok) return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apiDelete(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, { method: 'DELETE', headers: this.headers });
    if (!response.ok) return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    return { content: [{ type: 'text', text: JSON.stringify({ success: true }) }], isError: false };
  }

  private async authToken(args: Record<string, unknown>): Promise<ToolResult> {
    const { username, password } = args;
    if (!username || !password) return { content: [{ type: 'text', text: 'username and password are required' }], isError: true };
    const response = await this.fetchWithRetry(`${this.baseUrl}/auth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (!response.ok) return { content: [{ type: 'text', text: `Auth error: ${response.status} ${response.statusText}` }], isError: true };
    const data = await response.json() as { access?: string };
    if (data.access) this.accessToken = data.access;
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async patchResource(basePath: string, args: Record<string, unknown>): Promise<ToolResult> {
    const { id, ...rest } = args;
    if (!id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.apiPatch(`${basePath}/${encodeURIComponent(id as string)}`, rest);
  }

  private async getPortStats(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    const params: string[] = [];
    if (args.start) params.push(`start=${encodeURIComponent(args.start as string)}`);
    if (args.end) params.push(`end=${encodeURIComponent(args.end as string)}`);
    const qs = params.length ? `?${params.join('&')}` : '';
    return this.apiGet(`/ports/${encodeURIComponent(args.id as string)}/statistics${qs}`);
  }

  private async getConnectionStats(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    const params: string[] = [];
    if (args.start) params.push(`start=${encodeURIComponent(args.start as string)}`);
    if (args.end) params.push(`end=${encodeURIComponent(args.end as string)}`);
    const qs = params.length ? `?${params.join('&')}` : '';
    return this.apiGet(`/connections/${encodeURIComponent(args.id as string)}/statistics${qs}`);
  }

  static catalog() {
    return {
      name: 'ix-api',
      displayName: 'IX-API',
      version: '1.0.0',
      category: 'telecom' as const,
      keywords: ['ix-api', 'internet-exchange', 'ix', 'peering', 'bgp', 'telecom', 'network', 'cross-connect', 'de-cix', 'ams-ix'],
      toolNames: [
        'auth_token', 'auth_refresh',
        'list_facilities', 'get_facility', 'list_pops', 'get_pop', 'list_metro_areas', 'list_metro_area_networks',
        'list_product_offerings', 'get_product_offering',
        'list_ports', 'get_port', 'get_port_statistics',
        'list_port_reservations', 'create_port_reservation', 'get_port_reservation', 'update_port_reservation', 'decommission_port_reservation',
        'list_connections', 'create_connection', 'get_connection', 'update_connection', 'decommission_connection', 'get_connection_statistics',
        'list_network_service_configs', 'create_network_service_config', 'get_network_service_config', 'update_network_service_config', 'decommission_network_service_config',
        'get_current_account', 'list_accounts', 'list_contacts', 'create_contact', 'get_contact', 'delete_contact',
        'list_roles', 'list_role_assignments', 'create_role_assignment', 'delete_role_assignment',
        'get_health', 'get_implementation',
      ],
      description: 'IX-API adapter — manage Internet Exchange services: provision ports, connections, peering LAN memberships, and monitor traffic statistics.',
      author: 'protectnil' as const,
    };
  }
}

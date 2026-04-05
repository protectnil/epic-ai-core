/**
 * Turbine Labs MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03. Turbine Labs (acquired by Accenture) has not published
//   an official MCP server. The public API is documented at https://docs.turbinelabs.io/
//
// Base URL: https://api.turbinelabs.io/v1.0
// Auth: Token-based — Authorization: Token <access_token>
//   Obtain an access token via tbnctl or the admin API.
// Docs: https://docs.turbinelabs.io/advanced/tbnctl.html
// Spec: https://api.apis.guru/v2/specs/turbinelabs.io/1.0/swagger.json

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface TurbineLabsConfig {
  accessToken: string;
  baseUrl?: string;
}

export class TurbineLabsMCPServer extends MCPAdapterBase {
  private readonly accessToken: string;
  private readonly baseUrl: string;

  constructor(config: TurbineLabsConfig) {
    super();
    this.accessToken = config.accessToken;
    this.baseUrl = config.baseUrl || 'https://api.turbinelabs.io/v1.0';
  }

  static catalog() {
    return {
      name: 'turbinelabs',
      displayName: 'Turbine Labs',
      version: '1.0.0',
      category: 'devops' as const,
      keywords: ['turbinelabs', 'turbine', 'proxy', 'route', 'cluster', 'zone', 'listener', 'domain', 'traffic management', 'devops', 'deployment', 'canary', 'blue-green'],
      toolNames: [
        'list_zones', 'get_zone', 'create_zone', 'delete_zone',
        'list_clusters', 'get_cluster', 'create_cluster', 'modify_cluster', 'delete_cluster',
        'add_cluster_instance', 'remove_cluster_instance',
        'list_domains', 'get_domain', 'create_domain', 'delete_domain',
        'list_routes', 'get_route', 'create_route', 'modify_route', 'delete_route',
        'list_listeners', 'get_listener', 'create_listener', 'modify_listener', 'delete_listener',
        'list_proxies', 'get_proxy', 'create_proxy', 'delete_proxy',
        'list_shared_rules', 'get_shared_rules', 'create_shared_rules', 'modify_shared_rules', 'delete_shared_rules',
        'get_user',
        'list_access_tokens', 'create_access_token', 'delete_access_token',
        'get_changelog_zone',
      ],
      description: 'Manage Turbine Labs traffic routing: zones, clusters, instances, domains, routes, listeners, proxies, and shared rules via the Turbine Labs REST API.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      // ── Zones ─────────────────────────────────────────────────────────────
      {
        name: 'list_zones',
        description: 'List all zones in the Turbine Labs organization. Zones are top-level namespaces for routing objects.',
        inputSchema: {
          type: 'object',
          properties: {
            filters: { type: 'string', description: 'Optional filter expression for the zone list' },
          },
        },
      },
      {
        name: 'get_zone',
        description: 'Get a single zone by its zone key',
        inputSchema: {
          type: 'object',
          properties: {
            zone_key: { type: 'string', description: 'The zone key identifier' },
          },
          required: ['zone_key'],
        },
      },
      {
        name: 'create_zone',
        description: 'Create a new zone in Turbine Labs',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Zone name (required)' },
          },
          required: ['name'],
        },
      },
      {
        name: 'delete_zone',
        description: 'Delete a zone by its zone key. Requires current checksum for optimistic locking.',
        inputSchema: {
          type: 'object',
          properties: {
            zone_key: { type: 'string', description: 'The zone key to delete (required)' },
            checksum: { type: 'string', description: 'Current object checksum for optimistic locking (required)' },
          },
          required: ['zone_key', 'checksum'],
        },
      },
      // ── Clusters ──────────────────────────────────────────────────────────
      {
        name: 'list_clusters',
        description: 'List all clusters. Clusters represent groups of service instances that can receive traffic.',
        inputSchema: {
          type: 'object',
          properties: {
            filters: { type: 'string', description: 'Optional filter expression for the cluster list' },
          },
        },
      },
      {
        name: 'get_cluster',
        description: 'Get a single cluster by its cluster key',
        inputSchema: {
          type: 'object',
          properties: {
            cluster_key: { type: 'string', description: 'The cluster key identifier' },
          },
          required: ['cluster_key'],
        },
      },
      {
        name: 'create_cluster',
        description: 'Create a new cluster to group service instances for traffic routing',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Cluster name (required)' },
            zone_key: { type: 'string', description: 'Zone key to create the cluster in (required)' },
            require_tls: { type: 'boolean', description: 'Whether to require TLS for cluster connections' },
          },
          required: ['name', 'zone_key'],
        },
      },
      {
        name: 'modify_cluster',
        description: 'Modify an existing cluster configuration by cluster key',
        inputSchema: {
          type: 'object',
          properties: {
            cluster_key: { type: 'string', description: 'The cluster key to modify (required)' },
            name: { type: 'string', description: 'Updated cluster name' },
            require_tls: { type: 'boolean', description: 'Updated TLS requirement' },
          },
          required: ['cluster_key'],
        },
      },
      {
        name: 'delete_cluster',
        description: 'Delete a cluster by its cluster key. Requires current checksum.',
        inputSchema: {
          type: 'object',
          properties: {
            cluster_key: { type: 'string', description: 'The cluster key to delete (required)' },
            checksum: { type: 'string', description: 'Current object checksum for optimistic locking (required)' },
          },
          required: ['cluster_key', 'checksum'],
        },
      },
      {
        name: 'add_cluster_instance',
        description: 'Add a service instance to a cluster (host:port with optional metadata)',
        inputSchema: {
          type: 'object',
          properties: {
            cluster_key: { type: 'string', description: 'The cluster key to add the instance to (required)' },
            host: { type: 'string', description: 'Instance hostname or IP address (required)' },
            port: { type: 'number', description: 'Instance port number (required)' },
            metadata: {
              type: 'array',
              description: 'Metadata key-value pairs for instance labeling',
              items: {
                type: 'object',
                properties: {
                  key: { type: 'string' },
                  value: { type: 'string' },
                },
              },
            },
          },
          required: ['cluster_key', 'host', 'port'],
        },
      },
      {
        name: 'remove_cluster_instance',
        description: 'Remove a service instance from a cluster by identifier',
        inputSchema: {
          type: 'object',
          properties: {
            cluster_key: { type: 'string', description: 'The cluster key (required)' },
            instance_identifier: { type: 'string', description: 'The instance identifier to remove (required)' },
            checksum: { type: 'string', description: 'Current object checksum for optimistic locking (required)' },
          },
          required: ['cluster_key', 'instance_identifier', 'checksum'],
        },
      },
      // ── Domains ───────────────────────────────────────────────────────────
      {
        name: 'list_domains',
        description: 'List all domains. Domains define the hostname and port for incoming traffic.',
        inputSchema: {
          type: 'object',
          properties: {
            filters: { type: 'string', description: 'Optional filter expression for the domain list' },
          },
        },
      },
      {
        name: 'get_domain',
        description: 'Get a single domain by its domain key',
        inputSchema: {
          type: 'object',
          properties: {
            domain_key: { type: 'string', description: 'The domain key identifier' },
          },
          required: ['domain_key'],
        },
      },
      {
        name: 'create_domain',
        description: 'Create a new domain for traffic ingress',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Domain hostname (required)' },
            port: { type: 'number', description: 'Port number (required)' },
            zone_key: { type: 'string', description: 'Zone key for this domain (required)' },
            redirects: {
              type: 'array',
              description: 'HTTP redirect rules for this domain',
              items: { type: 'object' },
            },
          },
          required: ['name', 'port', 'zone_key'],
        },
      },
      {
        name: 'delete_domain',
        description: 'Delete a domain by its domain key. Requires current checksum.',
        inputSchema: {
          type: 'object',
          properties: {
            domain_key: { type: 'string', description: 'The domain key to delete (required)' },
            checksum: { type: 'string', description: 'Current object checksum for optimistic locking (required)' },
          },
          required: ['domain_key', 'checksum'],
        },
      },
      // ── Routes ────────────────────────────────────────────────────────────
      {
        name: 'list_routes',
        description: 'List all routes. Routes define how requests are matched and forwarded to clusters.',
        inputSchema: {
          type: 'object',
          properties: {
            filters: { type: 'string', description: 'Optional filter expression for the route list' },
          },
        },
      },
      {
        name: 'get_route',
        description: 'Get a single route by its route key',
        inputSchema: {
          type: 'object',
          properties: {
            route_key: { type: 'string', description: 'The route key identifier' },
          },
          required: ['route_key'],
        },
      },
      {
        name: 'create_route',
        description: 'Create a new route to direct traffic from a domain to a cluster',
        inputSchema: {
          type: 'object',
          properties: {
            domain_key: { type: 'string', description: 'Domain key this route belongs to (required)' },
            zone_key: { type: 'string', description: 'Zone key for this route (required)' },
            path: { type: 'string', description: 'URL path prefix to match (required)' },
            cluster_key: { type: 'string', description: 'Cluster key to route traffic to' },
            shared_rules_key: { type: 'string', description: 'Shared rules key to apply to this route' },
          },
          required: ['domain_key', 'zone_key', 'path'],
        },
      },
      {
        name: 'modify_route',
        description: 'Modify an existing route by route key',
        inputSchema: {
          type: 'object',
          properties: {
            route_key: { type: 'string', description: 'The route key to modify (required)' },
            path: { type: 'string', description: 'Updated URL path prefix' },
            cluster_key: { type: 'string', description: 'Updated cluster key' },
            shared_rules_key: { type: 'string', description: 'Updated shared rules key' },
          },
          required: ['route_key'],
        },
      },
      {
        name: 'delete_route',
        description: 'Delete a route by its route key. Requires current checksum.',
        inputSchema: {
          type: 'object',
          properties: {
            route_key: { type: 'string', description: 'The route key to delete (required)' },
            checksum: { type: 'string', description: 'Current object checksum for optimistic locking (required)' },
          },
          required: ['route_key', 'checksum'],
        },
      },
      // ── Listeners ─────────────────────────────────────────────────────────
      {
        name: 'list_listeners',
        description: 'List all listeners. Listeners bind to a port and direct traffic to domains.',
        inputSchema: {
          type: 'object',
          properties: {
            filters: { type: 'string', description: 'Optional filter expression for the listener list' },
          },
        },
      },
      {
        name: 'get_listener',
        description: 'Get a single listener by its listener key',
        inputSchema: {
          type: 'object',
          properties: {
            listener_key: { type: 'string', description: 'The listener key identifier' },
          },
          required: ['listener_key'],
        },
      },
      {
        name: 'create_listener',
        description: 'Create a new listener on a specified port',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Listener name (required)' },
            zone_key: { type: 'string', description: 'Zone key for this listener (required)' },
            port: { type: 'number', description: 'Port to listen on (required)' },
            protocol: { type: 'string', description: 'Protocol: http or tcp (default: http)' },
          },
          required: ['name', 'zone_key', 'port'],
        },
      },
      {
        name: 'modify_listener',
        description: 'Modify an existing listener by listener key',
        inputSchema: {
          type: 'object',
          properties: {
            listener_key: { type: 'string', description: 'The listener key to modify (required)' },
            name: { type: 'string', description: 'Updated listener name' },
            port: { type: 'number', description: 'Updated port' },
            protocol: { type: 'string', description: 'Updated protocol' },
          },
          required: ['listener_key'],
        },
      },
      {
        name: 'delete_listener',
        description: 'Delete a listener by its listener key. Requires current checksum.',
        inputSchema: {
          type: 'object',
          properties: {
            listener_key: { type: 'string', description: 'The listener key to delete (required)' },
            checksum: { type: 'string', description: 'Current object checksum for optimistic locking (required)' },
          },
          required: ['listener_key', 'checksum'],
        },
      },
      // ── Proxies ───────────────────────────────────────────────────────────
      {
        name: 'list_proxies',
        description: 'List all proxies. Proxies are the data-plane components that forward traffic.',
        inputSchema: {
          type: 'object',
          properties: {
            filters: { type: 'string', description: 'Optional filter expression for the proxy list' },
          },
        },
      },
      {
        name: 'get_proxy',
        description: 'Get a single proxy by its proxy key',
        inputSchema: {
          type: 'object',
          properties: {
            proxy_key: { type: 'string', description: 'The proxy key identifier' },
          },
          required: ['proxy_key'],
        },
      },
      {
        name: 'create_proxy',
        description: 'Create a new proxy entry in Turbine Labs',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Proxy name (required)' },
            zone_key: { type: 'string', description: 'Zone key for this proxy (required)' },
            listener_keys: {
              type: 'array',
              description: 'Listener keys to associate with this proxy',
              items: { type: 'string' },
            },
          },
          required: ['name', 'zone_key'],
        },
      },
      {
        name: 'delete_proxy',
        description: 'Delete a proxy by its proxy key. Requires current checksum.',
        inputSchema: {
          type: 'object',
          properties: {
            proxy_key: { type: 'string', description: 'The proxy key to delete (required)' },
            checksum: { type: 'string', description: 'Current object checksum for optimistic locking (required)' },
          },
          required: ['proxy_key', 'checksum'],
        },
      },
      // ── Shared Rules ──────────────────────────────────────────────────────
      {
        name: 'list_shared_rules',
        description: 'List all shared rules. Shared rules define reusable traffic routing policies.',
        inputSchema: {
          type: 'object',
          properties: {
            filters: { type: 'string', description: 'Optional filter expression for the shared rules list' },
          },
        },
      },
      {
        name: 'get_shared_rules',
        description: 'Get a single shared rules object by its key',
        inputSchema: {
          type: 'object',
          properties: {
            shared_rules_key: { type: 'string', description: 'The shared rules key identifier' },
          },
          required: ['shared_rules_key'],
        },
      },
      {
        name: 'create_shared_rules',
        description: 'Create a new shared rules object for reusable routing policy',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Shared rules name (required)' },
            zone_key: { type: 'string', description: 'Zone key for these shared rules (required)' },
            default_cluster: { type: 'string', description: 'Default cluster key to route to' },
          },
          required: ['name', 'zone_key'],
        },
      },
      {
        name: 'modify_shared_rules',
        description: 'Modify an existing shared rules object by its key',
        inputSchema: {
          type: 'object',
          properties: {
            shared_rules_key: { type: 'string', description: 'The shared rules key to modify (required)' },
            name: { type: 'string', description: 'Updated name' },
            default_cluster: { type: 'string', description: 'Updated default cluster key' },
          },
          required: ['shared_rules_key'],
        },
      },
      {
        name: 'delete_shared_rules',
        description: 'Delete a shared rules object by its key. Requires current checksum.',
        inputSchema: {
          type: 'object',
          properties: {
            shared_rules_key: { type: 'string', description: 'The shared rules key to delete (required)' },
            checksum: { type: 'string', description: 'Current object checksum for optimistic locking (required)' },
          },
          required: ['shared_rules_key', 'checksum'],
        },
      },
      // ── Admin / User ──────────────────────────────────────────────────────
      {
        name: 'get_user',
        description: 'Get the current authenticated user object and organization details',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'list_access_tokens',
        description: 'List access tokens configured for the authenticated user',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'create_access_token',
        description: 'Create a new API access token for the authenticated user',
        inputSchema: {
          type: 'object',
          properties: {
            description: { type: 'string', description: 'Human-readable description for the access token (required)' },
          },
          required: ['description'],
        },
      },
      {
        name: 'delete_access_token',
        description: 'Delete an API access token by key. Requires current checksum.',
        inputSchema: {
          type: 'object',
          properties: {
            access_token_key: { type: 'string', description: 'The access token key to delete (required)' },
            checksum: { type: 'string', description: 'Current object checksum for optimistic locking (required)' },
          },
          required: ['access_token_key', 'checksum'],
        },
      },
      // ── Changelog ─────────────────────────────────────────────────────────
      {
        name: 'get_changelog_zone',
        description: 'Get the change history for a specified zone, showing all configuration changes',
        inputSchema: {
          type: 'object',
          properties: {
            zone_key: { type: 'string', description: 'The zone key to retrieve changelog for (required)' },
            start: { type: 'string', description: 'Start time for the changelog range (ISO 8601)' },
            end: { type: 'string', description: 'End time for the changelog range (ISO 8601)' },
            max_results: { type: 'number', description: 'Maximum number of changelog entries to return' },
          },
          required: ['zone_key'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_zones':              return await this.listZones(args);
        case 'get_zone':                return await this.getZone(args);
        case 'create_zone':             return await this.createZone(args);
        case 'delete_zone':             return await this.deleteZone(args);
        case 'list_clusters':           return await this.listClusters(args);
        case 'get_cluster':             return await this.getCluster(args);
        case 'create_cluster':          return await this.createCluster(args);
        case 'modify_cluster':          return await this.modifyCluster(args);
        case 'delete_cluster':          return await this.deleteCluster(args);
        case 'add_cluster_instance':    return await this.addClusterInstance(args);
        case 'remove_cluster_instance': return await this.removeClusterInstance(args);
        case 'list_domains':            return await this.listDomains(args);
        case 'get_domain':              return await this.getDomain(args);
        case 'create_domain':           return await this.createDomain(args);
        case 'delete_domain':           return await this.deleteDomain(args);
        case 'list_routes':             return await this.listRoutes(args);
        case 'get_route':               return await this.getRoute(args);
        case 'create_route':            return await this.createRoute(args);
        case 'modify_route':            return await this.modifyRoute(args);
        case 'delete_route':            return await this.deleteRoute(args);
        case 'list_listeners':          return await this.listListeners(args);
        case 'get_listener':            return await this.getListener(args);
        case 'create_listener':         return await this.createListener(args);
        case 'modify_listener':         return await this.modifyListener(args);
        case 'delete_listener':         return await this.deleteListener(args);
        case 'list_proxies':            return await this.listProxies(args);
        case 'get_proxy':               return await this.getProxy(args);
        case 'create_proxy':            return await this.createProxy(args);
        case 'delete_proxy':            return await this.deleteProxy(args);
        case 'list_shared_rules':       return await this.listSharedRules(args);
        case 'get_shared_rules':        return await this.getSharedRules(args);
        case 'create_shared_rules':     return await this.createSharedRules(args);
        case 'modify_shared_rules':     return await this.modifySharedRules(args);
        case 'delete_shared_rules':     return await this.deleteSharedRules(args);
        case 'get_user':                return await this.getUser();
        case 'list_access_tokens':      return await this.listAccessTokens();
        case 'create_access_token':     return await this.createAccessToken(args);
        case 'delete_access_token':     return await this.deleteAccessToken(args);
        case 'get_changelog_zone':      return await this.getChangelogZone(args);
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
      Authorization: `Token ${this.accessToken}`,
      'Content-Type': 'application/json',
    };
  }

  private async tbRequest(path: string, options: RequestInit = {}): Promise<ToolResult> {
    const url = `${this.baseUrl}${path}`;
    const response = await this.fetchWithRetry(url, { ...options, headers: this.buildHeaders() });

    if (!response.ok) {
      let detail = '';
      try { detail = await response.text(); } catch { /* ignore */ }
      return {
        content: [{ type: 'text', text: `Turbine Labs API error ${response.status} ${response.statusText}${detail ? ': ' + detail.slice(0, 400) : ''}` }],
        isError: true,
      };
    }

    if (response.status === 204) {
      return { content: [{ type: 'text', text: 'Success (no content)' }], isError: false };
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      return { content: [{ type: 'text', text: `Turbine Labs returned non-JSON response (HTTP ${response.status})` }], isError: true };
    }

    const text = JSON.stringify(data, null, 2);
    const truncated = text.length > 10_000
      ? text.slice(0, 10_000) + `\n... [truncated, ${text.length} total chars]`
      : text;
    return { content: [{ type: 'text', text: truncated }], isError: false };
  }

  private filterQs(filters?: unknown): string {
    if (!filters) return '';
    return `?filters=${encodeURIComponent(filters as string)}`;
  }

  // ── Zones ─────────────────────────────────────────────────────────────────

  private async listZones(args: Record<string, unknown>): Promise<ToolResult> {
    return this.tbRequest(`/zone${this.filterQs(args.filters)}`);
  }

  private async getZone(args: Record<string, unknown>): Promise<ToolResult> {
    return this.tbRequest(`/zone/${encodeURIComponent(args.zone_key as string)}`);
  }

  private async createZone(args: Record<string, unknown>): Promise<ToolResult> {
    return this.tbRequest('/zone', { method: 'POST', body: JSON.stringify({ name: args.name }) });
  }

  private async deleteZone(args: Record<string, unknown>): Promise<ToolResult> {
    return this.tbRequest(
      `/zone/${encodeURIComponent(args.zone_key as string)}?checksum=${encodeURIComponent(args.checksum as string)}`,
      { method: 'DELETE' },
    );
  }

  // ── Clusters ──────────────────────────────────────────────────────────────

  private async listClusters(args: Record<string, unknown>): Promise<ToolResult> {
    return this.tbRequest(`/cluster${this.filterQs(args.filters)}`);
  }

  private async getCluster(args: Record<string, unknown>): Promise<ToolResult> {
    return this.tbRequest(`/cluster/${encodeURIComponent(args.cluster_key as string)}`);
  }

  private async createCluster(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = { name: args.name, zone_key: args.zone_key };
    if (args.require_tls !== undefined) body.require_tls = args.require_tls;
    return this.tbRequest('/cluster', { method: 'POST', body: JSON.stringify(body) });
  }

  private async modifyCluster(args: Record<string, unknown>): Promise<ToolResult> {
    const { cluster_key, ...rest } = args;
    const body: Record<string, unknown> = {};
    if (rest.name) body.name = rest.name;
    if (rest.require_tls !== undefined) body.require_tls = rest.require_tls;
    return this.tbRequest(
      `/cluster/${encodeURIComponent(cluster_key as string)}`,
      { method: 'PUT', body: JSON.stringify(body) },
    );
  }

  private async deleteCluster(args: Record<string, unknown>): Promise<ToolResult> {
    return this.tbRequest(
      `/cluster/${encodeURIComponent(args.cluster_key as string)}?checksum=${encodeURIComponent(args.checksum as string)}`,
      { method: 'DELETE' },
    );
  }

  private async addClusterInstance(args: Record<string, unknown>): Promise<ToolResult> {
    const instance: Record<string, unknown> = { host: args.host, port: args.port };
    if (args.metadata) instance.metadata = args.metadata;
    return this.tbRequest(
      `/cluster/${encodeURIComponent(args.cluster_key as string)}/instances`,
      { method: 'POST', body: JSON.stringify(instance) },
    );
  }

  private async removeClusterInstance(args: Record<string, unknown>): Promise<ToolResult> {
    return this.tbRequest(
      `/cluster/${encodeURIComponent(args.cluster_key as string)}/instances/${encodeURIComponent(args.instance_identifier as string)}?checksum=${encodeURIComponent(args.checksum as string)}`,
      { method: 'DELETE' },
    );
  }

  // ── Domains ───────────────────────────────────────────────────────────────

  private async listDomains(args: Record<string, unknown>): Promise<ToolResult> {
    return this.tbRequest(`/domain${this.filterQs(args.filters)}`);
  }

  private async getDomain(args: Record<string, unknown>): Promise<ToolResult> {
    return this.tbRequest(`/domain/${encodeURIComponent(args.domain_key as string)}`);
  }

  private async createDomain(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {
      name: args.name,
      port: args.port,
      zone_key: args.zone_key,
    };
    if (args.redirects) body.redirects = args.redirects;
    return this.tbRequest('/domain', { method: 'POST', body: JSON.stringify(body) });
  }

  private async deleteDomain(args: Record<string, unknown>): Promise<ToolResult> {
    return this.tbRequest(
      `/domain/${encodeURIComponent(args.domain_key as string)}?checksum=${encodeURIComponent(args.checksum as string)}`,
      { method: 'DELETE' },
    );
  }

  // ── Routes ────────────────────────────────────────────────────────────────

  private async listRoutes(args: Record<string, unknown>): Promise<ToolResult> {
    return this.tbRequest(`/route${this.filterQs(args.filters)}`);
  }

  private async getRoute(args: Record<string, unknown>): Promise<ToolResult> {
    return this.tbRequest(`/route/${encodeURIComponent(args.route_key as string)}`);
  }

  private async createRoute(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {
      domain_key: args.domain_key,
      zone_key: args.zone_key,
      path: args.path,
    };
    if (args.cluster_key) body.cluster_key = args.cluster_key;
    if (args.shared_rules_key) body.shared_rules_key = args.shared_rules_key;
    return this.tbRequest('/route', { method: 'POST', body: JSON.stringify(body) });
  }

  private async modifyRoute(args: Record<string, unknown>): Promise<ToolResult> {
    const { route_key, ...rest } = args;
    const body: Record<string, unknown> = {};
    if (rest.path) body.path = rest.path;
    if (rest.cluster_key) body.cluster_key = rest.cluster_key;
    if (rest.shared_rules_key) body.shared_rules_key = rest.shared_rules_key;
    return this.tbRequest(
      `/route/${encodeURIComponent(route_key as string)}`,
      { method: 'PUT', body: JSON.stringify(body) },
    );
  }

  private async deleteRoute(args: Record<string, unknown>): Promise<ToolResult> {
    return this.tbRequest(
      `/route/${encodeURIComponent(args.route_key as string)}?checksum=${encodeURIComponent(args.checksum as string)}`,
      { method: 'DELETE' },
    );
  }

  // ── Listeners ─────────────────────────────────────────────────────────────

  private async listListeners(args: Record<string, unknown>): Promise<ToolResult> {
    return this.tbRequest(`/listener${this.filterQs(args.filters)}`);
  }

  private async getListener(args: Record<string, unknown>): Promise<ToolResult> {
    return this.tbRequest(`/listener/${encodeURIComponent(args.listener_key as string)}`);
  }

  private async createListener(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {
      name: args.name,
      zone_key: args.zone_key,
      port: args.port,
    };
    if (args.protocol) body.protocol = args.protocol;
    return this.tbRequest('/listener', { method: 'POST', body: JSON.stringify(body) });
  }

  private async modifyListener(args: Record<string, unknown>): Promise<ToolResult> {
    const { listener_key, ...rest } = args;
    const body: Record<string, unknown> = {};
    if (rest.name) body.name = rest.name;
    if (rest.port !== undefined) body.port = rest.port;
    if (rest.protocol) body.protocol = rest.protocol;
    return this.tbRequest(
      `/listener/${encodeURIComponent(listener_key as string)}`,
      { method: 'PUT', body: JSON.stringify(body) },
    );
  }

  private async deleteListener(args: Record<string, unknown>): Promise<ToolResult> {
    return this.tbRequest(
      `/listener/${encodeURIComponent(args.listener_key as string)}?checksum=${encodeURIComponent(args.checksum as string)}`,
      { method: 'DELETE' },
    );
  }

  // ── Proxies ───────────────────────────────────────────────────────────────

  private async listProxies(args: Record<string, unknown>): Promise<ToolResult> {
    return this.tbRequest(`/proxy${this.filterQs(args.filters)}`);
  }

  private async getProxy(args: Record<string, unknown>): Promise<ToolResult> {
    return this.tbRequest(`/proxy/${encodeURIComponent(args.proxy_key as string)}`);
  }

  private async createProxy(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = { name: args.name, zone_key: args.zone_key };
    if (args.listener_keys) body.listener_keys = args.listener_keys;
    return this.tbRequest('/proxy', { method: 'POST', body: JSON.stringify(body) });
  }

  private async deleteProxy(args: Record<string, unknown>): Promise<ToolResult> {
    return this.tbRequest(
      `/proxy/${encodeURIComponent(args.proxy_key as string)}?checksum=${encodeURIComponent(args.checksum as string)}`,
      { method: 'DELETE' },
    );
  }

  // ── Shared Rules ──────────────────────────────────────────────────────────

  private async listSharedRules(args: Record<string, unknown>): Promise<ToolResult> {
    return this.tbRequest(`/shared_rules${this.filterQs(args.filters)}`);
  }

  private async getSharedRules(args: Record<string, unknown>): Promise<ToolResult> {
    return this.tbRequest(`/shared_rules/${encodeURIComponent(args.shared_rules_key as string)}`);
  }

  private async createSharedRules(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = { name: args.name, zone_key: args.zone_key };
    if (args.default_cluster) body.default_cluster = args.default_cluster;
    return this.tbRequest('/shared_rules', { method: 'POST', body: JSON.stringify(body) });
  }

  private async modifySharedRules(args: Record<string, unknown>): Promise<ToolResult> {
    const { shared_rules_key, ...rest } = args;
    const body: Record<string, unknown> = {};
    if (rest.name) body.name = rest.name;
    if (rest.default_cluster) body.default_cluster = rest.default_cluster;
    return this.tbRequest(
      `/shared_rules/${encodeURIComponent(shared_rules_key as string)}`,
      { method: 'PUT', body: JSON.stringify(body) },
    );
  }

  private async deleteSharedRules(args: Record<string, unknown>): Promise<ToolResult> {
    return this.tbRequest(
      `/shared_rules/${encodeURIComponent(args.shared_rules_key as string)}?checksum=${encodeURIComponent(args.checksum as string)}`,
      { method: 'DELETE' },
    );
  }

  // ── Admin / User ──────────────────────────────────────────────────────────

  private async getUser(): Promise<ToolResult> {
    return this.tbRequest('/admin/user/self');
  }

  private async listAccessTokens(): Promise<ToolResult> {
    return this.tbRequest('/admin/user/self/access_tokens');
  }

  private async createAccessToken(args: Record<string, unknown>): Promise<ToolResult> {
    return this.tbRequest('/admin/user/self/access_tokens', {
      method: 'POST',
      body: JSON.stringify({ description: args.description }),
    });
  }

  private async deleteAccessToken(args: Record<string, unknown>): Promise<ToolResult> {
    return this.tbRequest(
      `/admin/user/self/access_token/${encodeURIComponent(args.access_token_key as string)}?checksum=${encodeURIComponent(args.checksum as string)}`,
      { method: 'DELETE' },
    );
  }

  // ── Changelog ─────────────────────────────────────────────────────────────

  private async getChangelogZone(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.start) params.set('start', args.start as string);
    if (args.end) params.set('end', args.end as string);
    if (args.max_results !== undefined) params.set('max_results', String(args.max_results));
    const qs = params.toString();
    return this.tbRequest(`/changelog/zone/${encodeURIComponent(args.zone_key as string)}${qs ? '?' + qs : ''}`);
  }
}

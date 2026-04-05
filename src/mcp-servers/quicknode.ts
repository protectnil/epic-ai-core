/**
 * QuickNode MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/quiknode-labs/qn-mcp — transport: stdio, auth: QUICKNODE_API_KEY env var
// Published by quiknode-labs (QuickNode's official GitHub org). npm: @quicknode/mcp.
// Vendor MCP covers: endpoint CRUD, chain lookup, usage analytics (by account, chain, endpoint),
//   billing (invoices, payments), and security config (JWTs, IPs, domain masks, referrers).
// Our adapter covers: 14 tools (endpoint CRUD, chains, metrics, logs, rate limits, tags).
// Recommendation: use-both — MCP has unique tools (get-rpc-usage, get-billing-invoices,
//   get-billing-payments, security config tools) not in our REST adapter. Our REST adapter has
//   get_endpoint_logs, get_endpoint_rate_limits, update_endpoint_rate_limits, list_endpoint_tags,
//   add_endpoint_tag not exposed by the MCP. Use MCP for usage/billing/security; REST for logs/rate-limits/tags.
//
// Base URL: https://api.quicknode.com (Admin/Console API)
// Auth: x-api-key header with QuickNode API key (requires CONSOLE_REST permission)
// Docs: https://www.quicknode.com/docs/admin-api
// Rate limits: Configurable per-endpoint; 429 returned on excess

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface QuickNodeConfig {
  apiKey: string;
  baseUrl?: string;
}

export class QuickNodeMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: QuickNodeConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.quicknode.com';
  }

  static catalog() {
    return {
      name: 'quicknode',
      displayName: 'QuickNode',
      version: '1.0.0',
      category: 'cloud',
      keywords: ['quicknode', 'blockchain', 'rpc', 'ethereum', 'web3', 'node', 'endpoint', 'crypto', 'EVM', 'solana', 'infrastructure'],
      toolNames: [
        'list_endpoints', 'get_endpoint', 'create_endpoint', 'update_endpoint', 'deactivate_endpoint', 'activate_endpoint',
        'get_endpoint_stats', 'get_endpoint_logs',
        'list_chains', 'list_networks',
        'get_endpoint_rate_limits', 'update_endpoint_rate_limits',
        'list_endpoint_tags', 'add_endpoint_tag',
      ],
      description: 'QuickNode blockchain infrastructure management: create and manage RPC endpoints, monitor usage, configure rate limits, and query supported chains.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_endpoints',
        description: 'List all QuickNode RPC endpoints in the account with chain, network, and status information',
        inputSchema: {
          type: 'object',
          properties: {
            page: { type: 'number', description: 'Page number for pagination (default: 1)' },
            perPage: { type: 'number', description: 'Results per page (max: 100, default: 10)' },
            chain: { type: 'string', description: 'Filter by blockchain (e.g. ethereum, solana, polygon)' },
            network: { type: 'string', description: 'Filter by network (e.g. mainnet, testnet, goerli)' },
          },
        },
      },
      {
        name: 'get_endpoint',
        description: 'Get full details for a specific QuickNode endpoint including HTTP URL, WSS URL, and security settings',
        inputSchema: {
          type: 'object',
          properties: {
            endpointId: { type: 'string', description: 'QuickNode endpoint ID' },
          },
          required: ['endpointId'],
        },
      },
      {
        name: 'create_endpoint',
        description: 'Create a new QuickNode RPC endpoint for a specific blockchain chain and network',
        inputSchema: {
          type: 'object',
          properties: {
            chain: { type: 'string', description: 'Blockchain chain slug from /v0/chains (e.g. ethereum, solana, polygon-pos)' },
            network: { type: 'string', description: 'Network slug from /v0/chains (e.g. mainnet, testnet)' },
          },
          required: ['chain', 'network'],
        },
      },
      {
        name: 'update_endpoint',
        description: 'Update security settings or name for an existing QuickNode endpoint',
        inputSchema: {
          type: 'object',
          properties: {
            endpointId: { type: 'string', description: 'QuickNode endpoint ID to update' },
            name: { type: 'string', description: 'New name/label for the endpoint' },
          },
          required: ['endpointId'],
        },
      },
      {
        name: 'deactivate_endpoint',
        description: 'Deactivate a QuickNode endpoint to temporarily suspend RPC access without deleting it',
        inputSchema: {
          type: 'object',
          properties: {
            endpointId: { type: 'string', description: 'QuickNode endpoint ID to deactivate' },
          },
          required: ['endpointId'],
        },
      },
      {
        name: 'activate_endpoint',
        description: 'Reactivate a previously deactivated QuickNode endpoint to restore RPC access',
        inputSchema: {
          type: 'object',
          properties: {
            endpointId: { type: 'string', description: 'QuickNode endpoint ID to activate' },
          },
          required: ['endpointId'],
        },
      },
      {
        name: 'get_endpoint_stats',
        description: 'Get request volume, error rate, and latency metrics for a QuickNode endpoint',
        inputSchema: {
          type: 'object',
          properties: {
            endpointId: { type: 'string', description: 'QuickNode endpoint ID' },
            start_time: { type: 'string', description: 'Start of stats window (ISO 8601 UTC, e.g. 2026-03-01T00:00:00Z)' },
            end_time: { type: 'string', description: 'End of stats window (ISO 8601 UTC, default: now)' },
          },
          required: ['endpointId'],
        },
      },
      {
        name: 'get_endpoint_logs',
        description: 'Retrieve recent request logs for a QuickNode endpoint including method, status, and latency',
        inputSchema: {
          type: 'object',
          properties: {
            endpointId: { type: 'string', description: 'QuickNode endpoint ID' },
            limit: { type: 'number', description: 'Number of log entries to return (max: 100, default: 20)' },
            cursor: { type: 'string', description: 'Pagination cursor from a previous response' },
          },
          required: ['endpointId'],
        },
      },
      {
        name: 'list_chains',
        description: 'List all blockchain chains supported by QuickNode with their slugs and available networks',
        inputSchema: {
          type: 'object',
          properties: {
            page: { type: 'number', description: 'Page number for pagination (default: 1)' },
            perPage: { type: 'number', description: 'Results per page (max: 100, default: 50)' },
          },
        },
      },
      {
        name: 'list_networks',
        description: 'List available networks for a specific blockchain chain (mainnet, testnets, devnets)',
        inputSchema: {
          type: 'object',
          properties: {
            chain: { type: 'string', description: 'Blockchain chain slug (e.g. ethereum, solana, polygon-pos)' },
          },
          required: ['chain'],
        },
      },
      {
        name: 'get_endpoint_rate_limits',
        description: 'Get current rate limit configuration for a QuickNode endpoint including RPS and method limits',
        inputSchema: {
          type: 'object',
          properties: {
            endpointId: { type: 'string', description: 'QuickNode endpoint ID' },
          },
          required: ['endpointId'],
        },
      },
      {
        name: 'update_endpoint_rate_limits',
        description: 'Update global rate limits (requests per second) for a QuickNode endpoint',
        inputSchema: {
          type: 'object',
          properties: {
            endpointId: { type: 'string', description: 'QuickNode endpoint ID' },
            rps: { type: 'number', description: 'Requests per second limit (requires Build plan or higher)' },
          },
          required: ['endpointId', 'rps'],
        },
      },
      {
        name: 'list_endpoint_tags',
        description: 'List all tags assigned to a QuickNode endpoint for organization and filtering',
        inputSchema: {
          type: 'object',
          properties: {
            endpointId: { type: 'string', description: 'QuickNode endpoint ID' },
          },
          required: ['endpointId'],
        },
      },
      {
        name: 'add_endpoint_tag',
        description: 'Add a tag to a QuickNode endpoint for grouping and cost allocation tracking',
        inputSchema: {
          type: 'object',
          properties: {
            endpointId: { type: 'string', description: 'QuickNode endpoint ID' },
            name: { type: 'string', description: 'Tag name (key)' },
            value: { type: 'string', description: 'Tag value' },
          },
          required: ['endpointId', 'name', 'value'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_endpoints': return this.listEndpoints(args);
        case 'get_endpoint': return this.getEndpoint(args);
        case 'create_endpoint': return this.createEndpoint(args);
        case 'update_endpoint': return this.updateEndpoint(args);
        case 'deactivate_endpoint': return this.deactivateEndpoint(args);
        case 'activate_endpoint': return this.activateEndpoint(args);
        case 'get_endpoint_stats': return this.getEndpointStats(args);
        case 'get_endpoint_logs': return this.getEndpointLogs(args);
        case 'list_chains': return this.listChains(args);
        case 'list_networks': return this.listNetworks(args);
        case 'get_endpoint_rate_limits': return this.getEndpointRateLimits(args);
        case 'update_endpoint_rate_limits': return this.updateEndpointRateLimits(args);
        case 'list_endpoint_tags': return this.listEndpointTags(args);
        case 'add_endpoint_tag': return this.addEndpointTag(args);
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

  private get headers(): Record<string, string> {
    return {
      'x-api-key': this.apiKey,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  private async get(path: string, params?: Record<string, string>): Promise<ToolResult> {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}${qs}`, { headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async post(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async patch(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'PATCH',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async put(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'PUT',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listEndpoints(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (args.page) params.page = String(args.page);
    if (args.perPage) params.perPage = String(args.perPage);
    if (args.chain) params.chain = args.chain as string;
    if (args.network) params.network = args.network as string;
    return this.get('/v0/endpoints', params);
  }

  private async getEndpoint(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.endpointId) return { content: [{ type: 'text', text: 'endpointId is required' }], isError: true };
    return this.get(`/v0/endpoints/${encodeURIComponent(args.endpointId as string)}`);
  }

  private async createEndpoint(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.chain || !args.network) return { content: [{ type: 'text', text: 'chain and network are required' }], isError: true };
    return this.post('/v0/endpoints', { chain: args.chain, network: args.network });
  }

  private async updateEndpoint(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.endpointId) return { content: [{ type: 'text', text: 'endpointId is required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.name) body.label = args.name;
    return this.patch(`/v0/endpoints/${encodeURIComponent(args.endpointId as string)}`, body);
  }

  private async deactivateEndpoint(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.endpointId) return { content: [{ type: 'text', text: 'endpointId is required' }], isError: true };
    return this.patch(`/v0/endpoints/${encodeURIComponent(args.endpointId as string)}/status`, { status: 'paused' });
  }

  private async activateEndpoint(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.endpointId) return { content: [{ type: 'text', text: 'endpointId is required' }], isError: true };
    return this.patch(`/v0/endpoints/${encodeURIComponent(args.endpointId as string)}/status`, { status: 'active' });
  }

  private async getEndpointStats(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.endpointId) return { content: [{ type: 'text', text: 'endpointId is required' }], isError: true };
    const params: Record<string, string> = {};
    if (args.start_time) params.start_time = args.start_time as string;
    if (args.end_time) params.end_time = args.end_time as string;
    return this.get(`/v0/endpoints/${encodeURIComponent(args.endpointId as string)}/metrics`, params);
  }

  private async getEndpointLogs(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.endpointId) return { content: [{ type: 'text', text: 'endpointId is required' }], isError: true };
    const params: Record<string, string> = {};
    if (args.limit) params.limit = String(args.limit);
    if (args.cursor) params.cursor = args.cursor as string;
    return this.get(`/v0/endpoints/${encodeURIComponent(args.endpointId as string)}/logs`, params);
  }

  private async listChains(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (args.page) params.page = String(args.page);
    if (args.perPage) params.perPage = String(args.perPage);
    return this.get('/v0/chains', params);
  }

  private async listNetworks(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.chain) return { content: [{ type: 'text', text: 'chain is required' }], isError: true };
    return this.get(`/v0/chains/${encodeURIComponent(args.chain as string)}/networks`);
  }

  private async getEndpointRateLimits(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.endpointId) return { content: [{ type: 'text', text: 'endpointId is required' }], isError: true };
    return this.get(`/v0/endpoints/${encodeURIComponent(args.endpointId as string)}/rate-limits`);
  }

  private async updateEndpointRateLimits(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.endpointId || !args.rps) return { content: [{ type: 'text', text: 'endpointId and rps are required' }], isError: true };
    return this.put(`/v0/endpoints/${encodeURIComponent(args.endpointId as string)}/rate-limits`, { rate_limits: { rps: args.rps } });
  }

  private async listEndpointTags(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.endpointId) return { content: [{ type: 'text', text: 'endpointId is required' }], isError: true };
    return this.get(`/v0/endpoints/${encodeURIComponent(args.endpointId as string)}/tags`);
  }

  private async addEndpointTag(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.endpointId || !args.name || !args.value) return { content: [{ type: 'text', text: 'endpointId, name, and value are required' }], isError: true };
    return this.post(`/v0/endpoints/${encodeURIComponent(args.endpointId as string)}/tags`, { name: args.name, value: args.value });
  }
}

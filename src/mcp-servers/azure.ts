/**
 * Azure MCP Server
 * Adapter for Azure Resource Manager REST API using OAuth2 Bearer token
 *
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */
import { ToolDefinition, ToolResult } from './types.js';

interface AzureConfig {
  accessToken: string;
  subscriptionId?: string;
}

const BASE = 'https://management.azure.com';
const API_VERSION = '2022-09-01';

export class AzureMCPServer {
  private config: AzureConfig;

  constructor(config: AzureConfig) {
    this.config = config;
  }

  private headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.config.accessToken}`,
      'Content-Type': 'application/json',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_subscriptions',
        description: 'List all Azure subscriptions accessible with the provided token',
        inputSchema: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
      {
        name: 'list_resource_groups',
        description: 'List resource groups within a subscription',
        inputSchema: {
          type: 'object',
          properties: {
            subscriptionId: { type: 'string', description: 'Azure subscription ID (overrides config)' },
          },
          required: [],
        },
      },
      {
        name: 'list_resources',
        description: 'List all resources within a resource group',
        inputSchema: {
          type: 'object',
          properties: {
            subscriptionId: { type: 'string', description: 'Azure subscription ID' },
            resourceGroupName: { type: 'string', description: 'Resource group name' },
          },
          required: ['resourceGroupName'],
        },
      },
      {
        name: 'get_resource',
        description: 'Get details of a specific Azure resource by its full resource ID',
        inputSchema: {
          type: 'object',
          properties: {
            resourceId: { type: 'string', description: 'Full Azure resource ID path' },
            apiVersion: { type: 'string', description: 'API version for the resource provider' },
          },
          required: ['resourceId'],
        },
      },
      {
        name: 'list_deployments',
        description: 'List deployments within a resource group',
        inputSchema: {
          type: 'object',
          properties: {
            subscriptionId: { type: 'string', description: 'Azure subscription ID' },
            resourceGroupName: { type: 'string', description: 'Resource group name' },
          },
          required: ['resourceGroupName'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      const subId = (args.subscriptionId as string) || this.config.subscriptionId || '';

      switch (name) {
        case 'list_subscriptions': {
          const url = `${BASE}/subscriptions?api-version=2022-09-01`;
          const response = await fetch(url, { headers: this.headers() });
          let data: unknown;
          try { data = await response.json(); } catch { data = await response.text(); }
          return {
            content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
            isError: !response.ok,
          };
        }

        case 'list_resource_groups': {
          const url = `${BASE}/subscriptions/${subId}/resourcegroups?api-version=${API_VERSION}`;
          const response = await fetch(url, { headers: this.headers() });
          let data: unknown;
          try { data = await response.json(); } catch { data = await response.text(); }
          return {
            content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
            isError: !response.ok,
          };
        }

        case 'list_resources': {
          const rg = String(args.resourceGroupName);
          const url = `${BASE}/subscriptions/${subId}/resourceGroups/${rg}/resources?api-version=${API_VERSION}`;
          const response = await fetch(url, { headers: this.headers() });
          let data: unknown;
          try { data = await response.json(); } catch { data = await response.text(); }
          return {
            content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
            isError: !response.ok,
          };
        }

        case 'get_resource': {
          const apiVer = (args.apiVersion as string) || API_VERSION;
          const resourceId = String(args.resourceId).replace(/^\//, '');
          const url = `${BASE}/${resourceId}?api-version=${apiVer}`;
          const response = await fetch(url, { headers: this.headers() });
          let data: unknown;
          try { data = await response.json(); } catch { data = await response.text(); }
          return {
            content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
            isError: !response.ok,
          };
        }

        case 'list_deployments': {
          const rg = String(args.resourceGroupName);
          const url = `${BASE}/subscriptions/${subId}/resourceGroups/${rg}/providers/Microsoft.Resources/deployments?api-version=${API_VERSION}`;
          const response = await fetch(url, { headers: this.headers() });
          let data: unknown;
          try { data = await response.json(); } catch { data = await response.text(); }
          return {
            content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
            isError: !response.ok,
          };
        }

        default:
          return {
            content: [{ type: 'text', text: JSON.stringify({ error: `Unknown tool: ${name}` }, null, 2) }],
            isError: true,
          };
      }
    } catch (err) {
      return {
        content: [{ type: 'text', text: JSON.stringify({ error: String(err) }, null, 2) }],
        isError: true,
      };
    }
  }
}

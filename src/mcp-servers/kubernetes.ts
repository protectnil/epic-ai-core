/**
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

import { ToolDefinition, ToolResult } from './types.js';

export class KubernetesMCPServer {
  private baseUrl: string;

  constructor(private config: { api_server: string; token: string; skip_tls_verify?: boolean }) {
    this.baseUrl = `https://${config.api_server}`;
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_pods',
        description: 'List pods in a Kubernetes namespace',
        inputSchema: {
          type: 'object',
          properties: {
            namespace: { type: 'string', description: 'Namespace to list pods in', default: 'default' },
            label_selector: { type: 'string', description: 'Label selector filter' },
            field_selector: { type: 'string', description: 'Field selector filter' },
          },
          required: [],
        },
      },
      {
        name: 'get_pod',
        description: 'Get details of a specific pod',
        inputSchema: {
          type: 'object',
          properties: {
            namespace: { type: 'string', description: 'Pod namespace', default: 'default' },
            name: { type: 'string', description: 'Pod name' },
          },
          required: ['name'],
        },
      },
      {
        name: 'list_deployments',
        description: 'List deployments in a Kubernetes namespace',
        inputSchema: {
          type: 'object',
          properties: {
            namespace: { type: 'string', description: 'Namespace to list deployments in', default: 'default' },
            label_selector: { type: 'string', description: 'Label selector filter' },
          },
          required: [],
        },
      },
      {
        name: 'list_services',
        description: 'List services in a Kubernetes namespace',
        inputSchema: {
          type: 'object',
          properties: {
            namespace: { type: 'string', description: 'Namespace to list services in', default: 'default' },
            label_selector: { type: 'string', description: 'Label selector filter' },
          },
          required: [],
        },
      },
      {
        name: 'list_namespaces',
        description: 'List all Kubernetes namespaces',
        inputSchema: {
          type: 'object',
          properties: {
            label_selector: { type: 'string', description: 'Label selector filter' },
          },
          required: [],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      let url: string;

      const headers: Record<string, string> = {
        Authorization: `Bearer ${this.config.token}`,
        Accept: 'application/json',
      };

      switch (name) {
        case 'list_pods': {
          const ns = args.namespace ?? 'default';
          const params = new URLSearchParams();
          if (args.label_selector) params.set('labelSelector', String(args.label_selector));
          if (args.field_selector) params.set('fieldSelector', String(args.field_selector));
          url = `${this.baseUrl}/api/v1/namespaces/${ns}/pods?${params}`;
          break;
        }
        case 'get_pod': {
          const ns = args.namespace ?? 'default';
          url = `${this.baseUrl}/api/v1/namespaces/${ns}/pods/${args.name}`;
          break;
        }
        case 'list_deployments': {
          const ns = args.namespace ?? 'default';
          const params = new URLSearchParams();
          if (args.label_selector) params.set('labelSelector', String(args.label_selector));
          url = `${this.baseUrl}/apis/apps/v1/namespaces/${ns}/deployments?${params}`;
          break;
        }
        case 'list_services': {
          const ns = args.namespace ?? 'default';
          const params = new URLSearchParams();
          if (args.label_selector) params.set('labelSelector', String(args.label_selector));
          url = `${this.baseUrl}/api/v1/namespaces/${ns}/services?${params}`;
          break;
        }
        case 'list_namespaces': {
          const params = new URLSearchParams();
          if (args.label_selector) params.set('labelSelector', String(args.label_selector));
          url = `${this.baseUrl}/api/v1/namespaces?${params}`;
          break;
        }
        default:
          return { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true };
      }

      const response = await fetch(url, { headers });

      let data: unknown;
      try {
        data = await response.json();
      } catch {
        data = { status: response.status, statusText: response.statusText };
      }

      return {
        content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
        isError: !response.ok,
      };
    } catch (err) {
      return {
        content: [{ type: 'text', text: err instanceof Error ? err.message : String(err) }],
        isError: true,
      };
    }
  }
}

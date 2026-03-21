/**
 * Google Cloud MCP Server
 * Adapter for Google Cloud Resource Manager and Compute APIs using OAuth2 Bearer token
 *
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */
import { ToolDefinition, ToolResult } from './types.js';

interface GoogleCloudConfig {
  accessToken: string;
  projectId?: string;
}

const CRM_BASE = 'https://cloudresourcemanager.googleapis.com/v3';
const COMPUTE_BASE = 'https://compute.googleapis.com/compute/v1';
const LOGGING_BASE = 'https://logging.googleapis.com/v2';
const STORAGE_BASE = 'https://storage.googleapis.com/storage/v1';

export class GoogleCloudMCPServer {
  private config: GoogleCloudConfig;

  constructor(config: GoogleCloudConfig) {
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
        name: 'list_projects',
        description: 'List all Google Cloud projects accessible with the provided token',
        inputSchema: {
          type: 'object',
          properties: {
            pageSize: { type: 'number', description: 'Maximum number of projects to return' },
            pageToken: { type: 'string', description: 'Pagination token' },
          },
          required: [],
        },
      },
      {
        name: 'list_instances',
        description: 'List Compute Engine instances in a project and zone',
        inputSchema: {
          type: 'object',
          properties: {
            projectId: { type: 'string', description: 'Google Cloud project ID' },
            zone: { type: 'string', description: 'Compute zone (e.g. us-central1-a). Use - for all zones.' },
            maxResults: { type: 'number', description: 'Maximum number of instances to return' },
          },
          required: ['zone'],
        },
      },
      {
        name: 'list_buckets',
        description: 'List Cloud Storage buckets in a project',
        inputSchema: {
          type: 'object',
          properties: {
            projectId: { type: 'string', description: 'Google Cloud project ID' },
            maxResults: { type: 'number', description: 'Maximum number of buckets to return' },
          },
          required: [],
        },
      },
      {
        name: 'get_project',
        description: 'Get details of a specific Google Cloud project',
        inputSchema: {
          type: 'object',
          properties: {
            projectId: { type: 'string', description: 'Google Cloud project ID or number' },
          },
          required: ['projectId'],
        },
      },
      {
        name: 'list_logs',
        description: 'List log entries for a project using Cloud Logging',
        inputSchema: {
          type: 'object',
          properties: {
            projectId: { type: 'string', description: 'Google Cloud project ID' },
            filter: { type: 'string', description: 'Advanced log filter expression' },
            pageSize: { type: 'number', description: 'Maximum number of log entries to return' },
            orderBy: { type: 'string', description: 'Sort order: timestamp asc or timestamp desc' },
          },
          required: [],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      const projectId = (args.projectId as string) || this.config.projectId || '';

      switch (name) {
        case 'list_projects': {
          const params = new URLSearchParams();
          if (args.pageSize) params.set('pageSize', String(args.pageSize));
          if (args.pageToken) params.set('pageToken', String(args.pageToken));
          const url = `${CRM_BASE}/projects?${params.toString()}`;
          const response = await fetch(url, { headers: this.headers() });
          let data: unknown;
          try { data = await response.json(); } catch { data = await response.text(); }
          return {
            content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
            isError: !response.ok,
          };
        }

        case 'list_instances': {
          const zone = String(args.zone);
          const params = new URLSearchParams();
          if (args.maxResults) params.set('maxResults', String(args.maxResults));
          const isAggregated = zone === '-';
          const url = isAggregated
            ? `${COMPUTE_BASE}/projects/${projectId}/aggregated/instances?${params.toString()}`
            : `${COMPUTE_BASE}/projects/${projectId}/zones/${zone}/instances?${params.toString()}`;
          const response = await fetch(url, { headers: this.headers() });
          let data: unknown;
          try { data = await response.json(); } catch { data = await response.text(); }
          return {
            content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
            isError: !response.ok,
          };
        }

        case 'list_buckets': {
          const params = new URLSearchParams({ project: projectId });
          if (args.maxResults) params.set('maxResults', String(args.maxResults));
          const url = `${STORAGE_BASE}/b?${params.toString()}`;
          const response = await fetch(url, { headers: this.headers() });
          let data: unknown;
          try { data = await response.json(); } catch { data = await response.text(); }
          return {
            content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
            isError: !response.ok,
          };
        }

        case 'get_project': {
          const pid = String(args.projectId);
          const url = `${CRM_BASE}/projects/${pid}`;
          const response = await fetch(url, { headers: this.headers() });
          let data: unknown;
          try { data = await response.json(); } catch { data = await response.text(); }
          return {
            content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
            isError: !response.ok,
          };
        }

        case 'list_logs': {
          const body: Record<string, unknown> = {
            resourceNames: [`projects/${projectId}`],
          };
          if (args.filter) body['filter'] = String(args.filter);
          if (args.pageSize) body['pageSize'] = Number(args.pageSize);
          if (args.orderBy) body['orderBy'] = String(args.orderBy);
          const url = `${LOGGING_BASE}/entries:list`;
          const response = await fetch(url, {
            method: 'POST',
            headers: this.headers(),
            body: JSON.stringify(body),
          });
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

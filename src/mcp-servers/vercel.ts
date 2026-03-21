/**
 * Vercel MCP Server
 * Adapter for Vercel REST API v9 using Bearer token authentication
 *
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */
import { ToolDefinition, ToolResult } from './types.js';

interface VercelConfig {
  accessToken: string;
  teamId?: string;
}

const BASE = 'https://api.vercel.com';

export class VercelMCPServer {
  private config: VercelConfig;

  constructor(config: VercelConfig) {
    this.config = config;
  }

  private headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.config.accessToken}`,
      'Content-Type': 'application/json',
    };
  }


  private appendTeam(params: URLSearchParams, teamIdOverride?: string): void {
    const tid = teamIdOverride || this.config.teamId;
    if (tid) params.set('teamId', tid);
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_projects',
        description: 'List all Vercel projects for the authenticated user or team',
        inputSchema: {
          type: 'object',
          properties: {
            teamId: { type: 'string', description: 'Team ID or slug (overrides config)' },
            limit: { type: 'number', description: 'Maximum number of projects to return' },
            from: { type: 'number', description: 'Unix timestamp to paginate from' },
          },
          required: [],
        },
      },
      {
        name: 'get_project',
        description: 'Get details of a specific Vercel project by ID or name',
        inputSchema: {
          type: 'object',
          properties: {
            projectId: { type: 'string', description: 'Vercel project ID or name' },
            teamId: { type: 'string', description: 'Team ID or slug' },
          },
          required: ['projectId'],
        },
      },
      {
        name: 'list_deployments',
        description: 'List deployments for a project or team',
        inputSchema: {
          type: 'object',
          properties: {
            projectId: { type: 'string', description: 'Filter by project ID or name' },
            teamId: { type: 'string', description: 'Team ID or slug' },
            limit: { type: 'number', description: 'Maximum number of deployments to return' },
            state: { type: 'string', description: 'Filter by state: BUILDING, ERROR, INITIALIZING, QUEUED, READY, CANCELED' },
            target: { type: 'string', description: 'Filter by target: production or preview' },
          },
          required: [],
        },
      },
      {
        name: 'get_deployment',
        description: 'Get details of a specific Vercel deployment by ID or URL',
        inputSchema: {
          type: 'object',
          properties: {
            deploymentId: { type: 'string', description: 'Deployment ID or URL' },
            teamId: { type: 'string', description: 'Team ID or slug' },
          },
          required: ['deploymentId'],
        },
      },
      {
        name: 'list_domains',
        description: 'List domains configured in the Vercel account or team',
        inputSchema: {
          type: 'object',
          properties: {
            teamId: { type: 'string', description: 'Team ID or slug' },
            limit: { type: 'number', description: 'Maximum number of domains to return' },
            since: { type: 'number', description: 'Unix timestamp — return domains created after this time' },
          },
          required: [],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_projects': {
          const params = new URLSearchParams();
          this.appendTeam(params, args.teamId as string | undefined);
          if (args.limit) params.set('limit', String(args.limit));
          if (args.from) params.set('from', String(args.from));
          const url = `${BASE}/v9/projects?${params.toString()}`;
          const response = await fetch(url, { headers: this.headers() });
          let data: unknown;
          try { data = await response.json(); } catch { data = await response.text(); }
          return {
            content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
            isError: !response.ok,
          };
        }

        case 'get_project': {
          const params = new URLSearchParams();
          this.appendTeam(params, args.teamId as string | undefined);
          const url = `${BASE}/v9/projects/${encodeURIComponent(String(args.projectId))}?${params.toString()}`;
          const response = await fetch(url, { headers: this.headers() });
          let data: unknown;
          try { data = await response.json(); } catch { data = await response.text(); }
          return {
            content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
            isError: !response.ok,
          };
        }

        case 'list_deployments': {
          const params = new URLSearchParams();
          this.appendTeam(params, args.teamId as string | undefined);
          if (args.projectId) params.set('projectId', String(args.projectId));
          if (args.limit) params.set('limit', String(args.limit));
          if (args.state) params.set('state', String(args.state));
          if (args.target) params.set('target', String(args.target));
          const url = `${BASE}/v6/deployments?${params.toString()}`;
          const response = await fetch(url, { headers: this.headers() });
          let data: unknown;
          try { data = await response.json(); } catch { data = await response.text(); }
          return {
            content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
            isError: !response.ok,
          };
        }

        case 'get_deployment': {
          const params = new URLSearchParams();
          this.appendTeam(params, args.teamId as string | undefined);
          const url = `${BASE}/v13/deployments/${encodeURIComponent(String(args.deploymentId))}?${params.toString()}`;
          const response = await fetch(url, { headers: this.headers() });
          let data: unknown;
          try { data = await response.json(); } catch { data = await response.text(); }
          return {
            content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
            isError: !response.ok,
          };
        }

        case 'list_domains': {
          const params = new URLSearchParams();
          this.appendTeam(params, args.teamId as string | undefined);
          if (args.limit) params.set('limit', String(args.limit));
          if (args.since) params.set('since', String(args.since));
          const url = `${BASE}/v5/domains?${params.toString()}`;
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

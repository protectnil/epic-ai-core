/**
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

import { ToolDefinition, ToolResult } from './types.js';

export class ArgoCDMCPServer {
  private baseUrl: string;

  constructor(private config: { server: string; token: string }) {
    this.baseUrl = `https://${config.server}/api/v1`;
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_applications',
        description: 'List all ArgoCD applications',
        inputSchema: {
          type: 'object',
          properties: {
            project: { type: 'string', description: 'Filter by project name' },
            name: { type: 'string', description: 'Filter by application name' },
            namespace: { type: 'string', description: 'Filter by namespace' },
          },
          required: [],
        },
      },
      {
        name: 'get_application',
        description: 'Get details of a specific ArgoCD application',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Application name' },
          },
          required: ['name'],
        },
      },
      {
        name: 'sync_application',
        description: 'Trigger a sync for an ArgoCD application',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Application name' },
            revision: { type: 'string', description: 'Target revision to sync to' },
            prune: { type: 'boolean', description: 'Allow pruning of resources', default: false },
            dry_run: { type: 'boolean', description: 'Perform a dry run', default: false },
          },
          required: ['name'],
        },
      },
      {
        name: 'list_repositories',
        description: 'List all repositories configured in ArgoCD',
        inputSchema: {
          type: 'object',
          properties: {
            force_refresh: { type: 'boolean', description: 'Force refresh repository information' },
          },
          required: [],
        },
      },
      {
        name: 'get_application_health',
        description: 'Get health and sync status of an ArgoCD application',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Application name' },
          },
          required: ['name'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      let url: string;
      let method = 'GET';
      let body: unknown;

      const headers = {
        Authorization: `Bearer ${this.config.token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      };

      switch (name) {
        case 'list_applications': {
          const params = new URLSearchParams();
          if (args.project) params.set('projects', String(args.project));
          if (args.name) params.set('name', String(args.name));
          if (args.namespace) params.set('appNamespace', String(args.namespace));
          url = `${this.baseUrl}/applications?${params}`;
          break;
        }
        case 'get_application': {
          url = `${this.baseUrl}/applications/${args.name}`;
          break;
        }
        case 'sync_application': {
          url = `${this.baseUrl}/applications/${args.name}/sync`;
          method = 'POST';
          body = {
            ...(args.revision ? { revision: args.revision } : {}),
            ...(args.prune ? { prune: args.prune } : {}),
            ...(args.dry_run ? { dryRun: args.dry_run } : {}),
          };
          break;
        }
        case 'list_repositories': {
          const params = new URLSearchParams();
          if (args.force_refresh) params.set('forceRefresh', 'true');
          url = `${this.baseUrl}/repositories?${params}`;
          break;
        }
        case 'get_application_health': {
          url = `${this.baseUrl}/applications/${args.name}?fields=status.health,status.sync,status.operationState`;
          break;
        }
        default:
          return { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true };
      }

      const response = await fetch(url, {
        method,
        headers,
        ...(body ? { body: JSON.stringify(body) } : {}),
      });

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

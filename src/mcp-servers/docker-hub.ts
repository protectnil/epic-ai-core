/**
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

import { ToolDefinition, ToolResult } from './types.js';

export class DockerHubMCPServer {
  private baseUrl = 'https://hub.docker.com/v2';

  constructor(private config: { token: string }) {}

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_repositories',
        description: 'List repositories for a Docker Hub namespace',
        inputSchema: {
          type: 'object',
          properties: {
            namespace: { type: 'string', description: 'Docker Hub namespace (username or org)' },
            page: { type: 'number', description: 'Page number', default: 1 },
            page_size: { type: 'number', description: 'Results per page', default: 25 },
          },
          required: ['namespace'],
        },
      },
      {
        name: 'get_repository',
        description: 'Get details of a specific Docker Hub repository',
        inputSchema: {
          type: 'object',
          properties: {
            namespace: { type: 'string', description: 'Docker Hub namespace' },
            repository: { type: 'string', description: 'Repository name' },
          },
          required: ['namespace', 'repository'],
        },
      },
      {
        name: 'list_tags',
        description: 'List tags for a Docker Hub repository',
        inputSchema: {
          type: 'object',
          properties: {
            namespace: { type: 'string', description: 'Docker Hub namespace' },
            repository: { type: 'string', description: 'Repository name' },
            page: { type: 'number', description: 'Page number', default: 1 },
            page_size: { type: 'number', description: 'Results per page', default: 25 },
            name: { type: 'string', description: 'Filter tags by name' },
          },
          required: ['namespace', 'repository'],
        },
      },
      {
        name: 'get_tag',
        description: 'Get details of a specific tag in a Docker Hub repository',
        inputSchema: {
          type: 'object',
          properties: {
            namespace: { type: 'string', description: 'Docker Hub namespace' },
            repository: { type: 'string', description: 'Repository name' },
            tag: { type: 'string', description: 'Tag name' },
          },
          required: ['namespace', 'repository', 'tag'],
        },
      },
      {
        name: 'search_repositories',
        description: 'Search Docker Hub repositories',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search query' },
            page: { type: 'number', description: 'Page number', default: 1 },
            page_size: { type: 'number', description: 'Results per page', default: 25 },
            type: { type: 'string', enum: ['image', 'plugin'], description: 'Filter by type' },
          },
          required: ['query'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      let url: string;

      const headers = {
        Authorization: `Bearer ${this.config.token}`,
        Accept: 'application/json',
      };

      switch (name) {
        case 'list_repositories': {
          const params = new URLSearchParams({
            page: String(args.page ?? 1),
            page_size: String(args.page_size ?? 25),
          });
          url = `${this.baseUrl}/repositories/${args.namespace}/?${params}`;
          break;
        }
        case 'get_repository': {
          url = `${this.baseUrl}/repositories/${args.namespace}/${args.repository}/`;
          break;
        }
        case 'list_tags': {
          const params = new URLSearchParams({
            page: String(args.page ?? 1),
            page_size: String(args.page_size ?? 25),
          });
          if (args.name) params.set('name', String(args.name));
          url = `${this.baseUrl}/repositories/${args.namespace}/${args.repository}/tags?${params}`;
          break;
        }
        case 'get_tag': {
          url = `${this.baseUrl}/repositories/${args.namespace}/${args.repository}/tags/${args.tag}/`;
          break;
        }
        case 'search_repositories': {
          const params = new URLSearchParams({
            query: String(args.query),
            page: String(args.page ?? 1),
            page_size: String(args.page_size ?? 25),
          });
          if (args.type) params.set('type', String(args.type));
          url = `${this.baseUrl}/search/repositories/?${params}`;
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

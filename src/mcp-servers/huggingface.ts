/** HuggingFace MCP Server
 * HuggingFace model, dataset, and space management
 *
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

import { ToolDefinition, ToolResult } from './types.js';

interface HuggingFaceConfig {
  apiKey: string;
  baseUrl?: string;
}

export class HuggingFaceMCPServer {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: HuggingFaceConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? 'https://huggingface.co/api';
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_models',
        description: 'List models on HuggingFace Hub',
        inputSchema: {
          type: 'object',
          properties: {
            search: { type: 'string', description: 'Search query' },
            author: { type: 'string', description: 'Filter by author/organization' },
            filter: { type: 'string', description: 'Filter by tag or pipeline tag' },
            limit: { type: 'number', description: 'Number of results to return' },
          },
          required: [],
        },
      },
      {
        name: 'get_model',
        description: 'Get details for a specific model',
        inputSchema: {
          type: 'object',
          properties: {
            modelId: { type: 'string', description: 'Model ID (e.g. google/flan-t5-base)' },
          },
          required: ['modelId'],
        },
      },
      {
        name: 'list_datasets',
        description: 'List datasets on HuggingFace Hub',
        inputSchema: {
          type: 'object',
          properties: {
            search: { type: 'string', description: 'Search query' },
            author: { type: 'string', description: 'Filter by author/organization' },
            limit: { type: 'number', description: 'Number of results to return' },
          },
          required: [],
        },
      },
      {
        name: 'get_dataset',
        description: 'Get details for a specific dataset',
        inputSchema: {
          type: 'object',
          properties: {
            datasetId: { type: 'string', description: 'Dataset ID (e.g. squad)' },
          },
          required: ['datasetId'],
        },
      },
      {
        name: 'list_spaces',
        description: 'List Spaces on HuggingFace Hub',
        inputSchema: {
          type: 'object',
          properties: {
            search: { type: 'string', description: 'Search query' },
            author: { type: 'string', description: 'Filter by author/organization' },
            limit: { type: 'number', description: 'Number of results to return' },
          },
          required: [],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };

    try {
      let response: Response;

      switch (name) {
        case 'list_models': {
          const params = new URLSearchParams();
          if (args.search !== undefined) params.set('search', String(args.search));
          if (args.author !== undefined) params.set('author', String(args.author));
          if (args.filter !== undefined) params.set('filter', String(args.filter));
          if (args.limit !== undefined) params.set('limit', String(args.limit));
          response = await fetch(`${this.baseUrl}/models?${params}`, { headers });
          break;
        }
        case 'get_model': {
          response = await fetch(`${this.baseUrl}/models/${args.modelId}`, { headers });
          break;
        }
        case 'list_datasets': {
          const params = new URLSearchParams();
          if (args.search !== undefined) params.set('search', String(args.search));
          if (args.author !== undefined) params.set('author', String(args.author));
          if (args.limit !== undefined) params.set('limit', String(args.limit));
          response = await fetch(`${this.baseUrl}/datasets?${params}`, { headers });
          break;
        }
        case 'get_dataset': {
          response = await fetch(`${this.baseUrl}/datasets/${args.datasetId}`, { headers });
          break;
        }
        case 'list_spaces': {
          const params = new URLSearchParams();
          if (args.search !== undefined) params.set('search', String(args.search));
          if (args.author !== undefined) params.set('author', String(args.author));
          if (args.limit !== undefined) params.set('limit', String(args.limit));
          response = await fetch(`${this.baseUrl}/spaces?${params}`, { headers });
          break;
        }
        default:
          return {
            content: [{ type: 'text', text: JSON.stringify({ error: `Unknown tool: ${name}` }, null, 2) }],
            isError: true,
          };
      }

      let data: unknown;
      try {
        data = await response.json();
      } catch {
        throw new Error(`Non-JSON response (HTTP ${response.status})`);
      }
      return {
        content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
        isError: false,
      };
    } catch (err) {
      return {
        content: [{ type: 'text', text: JSON.stringify({ error: String(err) }, null, 2) }],
        isError: true,
      };
    }
  }
}

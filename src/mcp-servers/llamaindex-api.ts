/** LlamaIndex API MCP Server
 * LlamaIndex Cloud index and document management
 *
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

import { ToolDefinition, ToolResult } from './types.js';

interface LlamaIndexConfig {
  apiKey: string;
  baseUrl?: string;
}

export class LlamaIndexMCPServer {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: LlamaIndexConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? 'https://api.cloud.llamaindex.ai/api/v1';
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_indices',
        description: 'List all indices in LlamaIndex Cloud',
        inputSchema: {
          type: 'object',
          properties: {
            page: { type: 'number', description: 'Page number' },
            pageSize: { type: 'number', description: 'Items per page' },
          },
          required: [],
        },
      },
      {
        name: 'query_index',
        description: 'Query an index with a natural language question',
        inputSchema: {
          type: 'object',
          properties: {
            indexId: { type: 'string', description: 'Index ID to query' },
            query: { type: 'string', description: 'Query string' },
            topK: { type: 'number', description: 'Number of top results to return' },
          },
          required: ['indexId', 'query'],
        },
      },
      {
        name: 'list_documents',
        description: 'List documents in an index',
        inputSchema: {
          type: 'object',
          properties: {
            indexId: { type: 'string', description: 'Index ID' },
            page: { type: 'number', description: 'Page number' },
            pageSize: { type: 'number', description: 'Items per page' },
          },
          required: ['indexId'],
        },
      },
      {
        name: 'upload_document',
        description: 'Upload a document to an index',
        inputSchema: {
          type: 'object',
          properties: {
            indexId: { type: 'string', description: 'Index ID' },
            text: { type: 'string', description: 'Document text content' },
            metadata: { type: 'object', description: 'Document metadata' },
          },
          required: ['indexId', 'text'],
        },
      },
      {
        name: 'get_index',
        description: 'Get details for a specific index',
        inputSchema: {
          type: 'object',
          properties: {
            indexId: { type: 'string', description: 'Index ID' },
          },
          required: ['indexId'],
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
        case 'list_indices': {
          const params = new URLSearchParams();
          if (args.page !== undefined) params.set('page', String(args.page));
          if (args.pageSize !== undefined) params.set('page_size', String(args.pageSize));
          response = await fetch(`${this.baseUrl}/indices?${params}`, { headers });
          break;
        }
        case 'query_index': {
          response = await fetch(`${this.baseUrl}/indices/${args.indexId}/query`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              query: args.query,
              ...(args.topK !== undefined && { top_k: args.topK }),
            }),
          });
          break;
        }
        case 'list_documents': {
          const params = new URLSearchParams();
          if (args.page !== undefined) params.set('page', String(args.page));
          if (args.pageSize !== undefined) params.set('page_size', String(args.pageSize));
          response = await fetch(`${this.baseUrl}/indices/${args.indexId}/documents?${params}`, { headers });
          break;
        }
        case 'upload_document': {
          response = await fetch(`${this.baseUrl}/indices/${args.indexId}/documents`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              text: args.text,
              ...(args.metadata !== undefined && { metadata: args.metadata }),
            }),
          });
          break;
        }
        case 'get_index': {
          response = await fetch(`${this.baseUrl}/indices/${args.indexId}`, { headers });
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

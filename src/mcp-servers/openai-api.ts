/** OpenAI API MCP Server
 * OpenAI model and completion management
 *
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

import { ToolDefinition, ToolResult } from './types.js';

interface OpenAIConfig {
  apiKey: string;
  baseUrl?: string;
}

export class OpenAIMCPServer {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: OpenAIConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? 'https://api.openai.com/v1';
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_models',
        description: 'List available OpenAI models',
        inputSchema: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
      {
        name: 'create_completion',
        description: 'Create a chat completion',
        inputSchema: {
          type: 'object',
          properties: {
            model: { type: 'string', description: 'Model ID to use' },
            messages: { type: 'array', description: 'Array of message objects' },
            temperature: { type: 'number', description: 'Sampling temperature' },
            max_tokens: { type: 'number', description: 'Maximum tokens to generate' },
          },
          required: ['model', 'messages'],
        },
      },
      {
        name: 'list_fine_tuning_jobs',
        description: 'List fine-tuning jobs',
        inputSchema: {
          type: 'object',
          properties: {
            after: { type: 'string', description: 'Cursor for pagination' },
            limit: { type: 'number', description: 'Number of jobs to return' },
          },
          required: [],
        },
      },
      {
        name: 'get_usage',
        description: 'Get API usage statistics',
        inputSchema: {
          type: 'object',
          properties: {
            date: { type: 'string', description: 'Date in YYYY-MM-DD format' },
          },
          required: ['date'],
        },
      },
      {
        name: 'list_files',
        description: 'List uploaded files',
        inputSchema: {
          type: 'object',
          properties: {
            purpose: { type: 'string', description: 'Filter by purpose (e.g. fine-tune)' },
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
          response = await fetch(`${this.baseUrl}/models`, { headers });
          break;
        }
        case 'create_completion': {
          response = await fetch(`${this.baseUrl}/chat/completions`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              model: args.model,
              messages: args.messages,
              ...(args.temperature !== undefined && { temperature: args.temperature }),
              ...(args.max_tokens !== undefined && { max_tokens: args.max_tokens }),
            }),
          });
          break;
        }
        case 'list_fine_tuning_jobs': {
          const params = new URLSearchParams();
          if (args.after !== undefined) params.set('after', String(args.after));
          if (args.limit !== undefined) params.set('limit', String(args.limit));
          response = await fetch(`${this.baseUrl}/fine_tuning/jobs?${params}`, { headers });
          break;
        }
        case 'get_usage': {
          response = await fetch(`${this.baseUrl}/usage?date=${args.date}`, { headers });
          break;
        }
        case 'list_files': {
          const params = new URLSearchParams();
          if (args.purpose !== undefined) params.set('purpose', String(args.purpose));
          response = await fetch(`${this.baseUrl}/files?${params}`, { headers });
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

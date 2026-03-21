/** Anthropic API MCP Server
 * Anthropic Claude model and message management
 *
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

import { ToolDefinition, ToolResult } from './types.js';

interface AnthropicConfig {
  apiKey: string;
  baseUrl?: string;
}

export class AnthropicMCPServer {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: AnthropicConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? 'https://api.anthropic.com/v1';
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'create_message',
        description: 'Create a message using the Anthropic Messages API',
        inputSchema: {
          type: 'object',
          properties: {
            model: { type: 'string', description: 'Model ID (e.g. claude-opus-4-5)' },
            messages: { type: 'array', description: 'Array of message objects' },
            max_tokens: { type: 'number', description: 'Maximum tokens to generate' },
            system: { type: 'string', description: 'System prompt' },
          },
          required: ['model', 'messages', 'max_tokens'],
        },
      },
      {
        name: 'list_models',
        description: 'List available Anthropic models',
        inputSchema: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
      {
        name: 'count_tokens',
        description: 'Count tokens for a given prompt without creating a message',
        inputSchema: {
          type: 'object',
          properties: {
            model: { type: 'string', description: 'Model ID' },
            messages: { type: 'array', description: 'Array of message objects' },
            system: { type: 'string', description: 'System prompt' },
          },
          required: ['model', 'messages'],
        },
      },
      {
        name: 'get_usage',
        description: 'Get API usage for a specific date',
        inputSchema: {
          type: 'object',
          properties: {
            date: { type: 'string', description: 'Date in YYYY-MM-DD format' },
          },
          required: ['date'],
        },
      },
      {
        name: 'list_message_batches',
        description: 'List message batches',
        inputSchema: {
          type: 'object',
          properties: {
            before_id: { type: 'string', description: 'Cursor for pagination' },
            limit: { type: 'number', description: 'Number of batches to return' },
          },
          required: [],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    const headers: Record<string, string> = {
      'x-api-key': this.apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    };

    try {
      let response: Response;

      switch (name) {
        case 'create_message': {
          response = await fetch(`${this.baseUrl}/messages`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              model: args.model,
              messages: args.messages,
              max_tokens: args.max_tokens,
              ...(args.system !== undefined && { system: args.system }),
            }),
          });
          break;
        }
        case 'list_models': {
          response = await fetch(`${this.baseUrl}/models`, { headers });
          break;
        }
        case 'count_tokens': {
          response = await fetch(`${this.baseUrl}/messages/count_tokens`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              model: args.model,
              messages: args.messages,
              ...(args.system !== undefined && { system: args.system }),
            }),
          });
          break;
        }
        case 'get_usage': {
          response = await fetch(`${this.baseUrl}/usage?date=${args.date}`, { headers });
          break;
        }
        case 'list_message_batches': {
          const params = new URLSearchParams();
          if (args.before_id !== undefined) params.set('before_id', String(args.before_id));
          if (args.limit !== undefined) params.set('limit', String(args.limit));
          response = await fetch(`${this.baseUrl}/messages/batches?${params}`, { headers });
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

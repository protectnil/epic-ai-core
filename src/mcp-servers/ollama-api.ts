/** Ollama API MCP Server
 * Local Ollama model management and inference
 *
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

import { ToolDefinition, ToolResult } from './types.js';

interface OllamaConfig {
  baseUrl?: string;
}

export class OllamaMCPServer {
  private readonly baseUrl: string;

  constructor(config: OllamaConfig = {}) {
    this.baseUrl = config.baseUrl ?? 'http://localhost:11434';
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_models',
        description: 'List locally available Ollama models',
        inputSchema: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
      {
        name: 'pull_model',
        description: 'Pull a model from the Ollama registry',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Model name to pull (e.g. llama3)' },
            insecure: { type: 'boolean', description: 'Allow insecure connections' },
          },
          required: ['name'],
        },
      },
      {
        name: 'show_model',
        description: 'Show information about a specific model',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Model name' },
          },
          required: ['name'],
        },
      },
      {
        name: 'generate',
        description: 'Generate a completion for a prompt',
        inputSchema: {
          type: 'object',
          properties: {
            model: { type: 'string', description: 'Model name' },
            prompt: { type: 'string', description: 'Prompt text' },
            stream: { type: 'boolean', description: 'Stream the response' },
            options: { type: 'object', description: 'Model parameter overrides' },
          },
          required: ['model', 'prompt'],
        },
      },
      {
        name: 'chat',
        description: 'Chat with a model using a list of messages',
        inputSchema: {
          type: 'object',
          properties: {
            model: { type: 'string', description: 'Model name' },
            messages: { type: 'array', description: 'Array of message objects' },
            stream: { type: 'boolean', description: 'Stream the response' },
            options: { type: 'object', description: 'Model parameter overrides' },
          },
          required: ['model', 'messages'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    try {
      let response: Response;

      switch (name) {
        case 'list_models': {
          response = await fetch(`${this.baseUrl}/api/tags`, { headers });
          break;
        }
        case 'pull_model': {
          response = await fetch(`${this.baseUrl}/api/pull`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              name: args.name,
              stream: false,
              ...(args.insecure !== undefined && { insecure: args.insecure }),
            }),
          });
          break;
        }
        case 'show_model': {
          response = await fetch(`${this.baseUrl}/api/show`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ name: args.name }),
          });
          break;
        }
        case 'generate': {
          response = await fetch(`${this.baseUrl}/api/generate`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              model: args.model,
              prompt: args.prompt,
              stream: args.stream ?? false,
              ...(args.options !== undefined && { options: args.options }),
            }),
          });
          break;
        }
        case 'chat': {
          response = await fetch(`${this.baseUrl}/api/chat`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              model: args.model,
              messages: args.messages,
              stream: args.stream ?? false,
              ...(args.options !== undefined && { options: args.options }),
            }),
          });
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

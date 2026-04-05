/**
 * Ollama MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// No official Ollama MCP server exists. Community wrappers exist (e.g. rawveg/ollama-mcp)
// but are not published by Ollama and do not meet the official-MCP criteria.
//
// Base URL: http://localhost:11434 (configurable via baseUrl)
// Auth: None — Ollama runs locally with no auth by default
// Docs: https://github.com/ollama/ollama/blob/main/docs/api.md
// Rate limits: None — local process; throughput bound by hardware

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface OllamaConfig {
  baseUrl?: string;
}

export class OllamaMCPServer extends MCPAdapterBase {
  private readonly baseUrl: string;

  constructor(config: OllamaConfig = {}) {
    super();
    this.baseUrl = config.baseUrl ?? 'http://localhost:11434';
  }

  static catalog() {
    return {
      name: 'ollama-api',
      displayName: 'Ollama',
      version: '1.0.0',
      category: 'ai-ml',
      keywords: ['ollama', 'local', 'llm', 'model', 'generate', 'chat', 'embeddings', 'inference', 'open-source'],
      toolNames: [
        'list_models', 'get_running_models', 'show_model', 'pull_model',
        'push_model', 'copy_model', 'delete_model', 'create_model',
        'generate', 'chat', 'embed', 'get_version',
      ],
      description: 'Local LLM inference via Ollama: manage models (pull, push, copy, delete, create), generate completions, chat, and create embeddings.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_models',
        description: 'List all locally available Ollama models with their sizes and modification dates',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_running_models',
        description: 'List models currently loaded into memory and actively running on the Ollama server',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'show_model',
        description: 'Show detailed information about a specific Ollama model: parameters, template, license, and modelfile',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Model name to inspect (e.g. llama3.2, mistral:7b)',
            },
            verbose: {
              type: 'boolean',
              description: 'When true, return full verbose output including all template data (default: false)',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'pull_model',
        description: 'Download a model from the Ollama registry to the local server',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Model name to pull from the registry (e.g. llama3.2, mistral:7b)',
            },
            insecure: {
              type: 'boolean',
              description: 'Allow insecure connections to the registry (default: false)',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'push_model',
        description: 'Push a locally created or modified model to the Ollama registry',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Model name to push (must be namespaced: namespace/model)',
            },
            insecure: {
              type: 'boolean',
              description: 'Allow insecure connections to the registry (default: false)',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'copy_model',
        description: 'Copy a local Ollama model to a new name without re-downloading weights',
        inputSchema: {
          type: 'object',
          properties: {
            source: {
              type: 'string',
              description: 'Source model name to copy from',
            },
            destination: {
              type: 'string',
              description: 'Destination model name to copy to',
            },
          },
          required: ['source', 'destination'],
        },
      },
      {
        name: 'delete_model',
        description: 'Delete a local Ollama model and free its disk space',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Model name to delete from local storage',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'create_model',
        description: 'Create a new Ollama model from a Modelfile definition string',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Name to assign to the new model',
            },
            modelfile: {
              type: 'string',
              description: 'Modelfile content as a string (FROM, SYSTEM, PARAMETER directives)',
            },
          },
          required: ['name', 'modelfile'],
        },
      },
      {
        name: 'generate',
        description: 'Generate a text completion from a prompt using a specified local Ollama model',
        inputSchema: {
          type: 'object',
          properties: {
            model: {
              type: 'string',
              description: 'Model name to use for generation (e.g. llama3.2)',
            },
            prompt: {
              type: 'string',
              description: 'Prompt text to complete',
            },
            system: {
              type: 'string',
              description: 'System message to prepend (overrides Modelfile system)',
            },
            template: {
              type: 'string',
              description: 'Prompt template override (advanced use)',
            },
            context: {
              type: 'array',
              description: 'Context array from a previous response to continue conversation',
            },
            options: {
              type: 'object',
              description: 'Model parameter overrides: temperature, top_p, top_k, num_predict, seed, stop',
            },
            format: {
              type: 'string',
              description: 'Response format: "json" to request structured JSON output (default: plain text)',
            },
          },
          required: ['model', 'prompt'],
        },
      },
      {
        name: 'chat',
        description: 'Send a multi-turn chat conversation to a local Ollama model and receive the next message',
        inputSchema: {
          type: 'object',
          properties: {
            model: {
              type: 'string',
              description: 'Model name to use (e.g. llama3.2)',
            },
            messages: {
              type: 'array',
              description: 'Array of message objects with role (system|user|assistant) and content fields',
            },
            options: {
              type: 'object',
              description: 'Model parameter overrides: temperature, top_p, top_k, num_predict, seed',
            },
            format: {
              type: 'string',
              description: 'Response format: "json" to request structured JSON output (default: plain text)',
            },
          },
          required: ['model', 'messages'],
        },
      },
      {
        name: 'embed',
        description: 'Generate vector embeddings for one or more text inputs using a local Ollama model',
        inputSchema: {
          type: 'object',
          properties: {
            model: {
              type: 'string',
              description: 'Embedding model to use (e.g. nomic-embed-text, mxbai-embed-large)',
            },
            input: {
              type: 'string',
              description: 'Text string or array of strings to embed',
            },
            options: {
              type: 'object',
              description: 'Model parameter overrides: temperature, top_p, seed',
            },
          },
          required: ['model', 'input'],
        },
      },
      {
        name: 'get_version',
        description: 'Get the current version string of the running Ollama server',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_models':
          return await this.listModels();
        case 'get_running_models':
          return await this.getRunningModels();
        case 'show_model':
          return await this.showModel(args);
        case 'pull_model':
          return await this.pullModel(args);
        case 'push_model':
          return await this.pushModel(args);
        case 'copy_model':
          return await this.copyModel(args);
        case 'delete_model':
          return await this.deleteModel(args);
        case 'create_model':
          return await this.createModel(args);
        case 'generate':
          return await this.generate(args);
        case 'chat':
          return await this.chat(args);
        case 'embed':
          return await this.embed(args);
        case 'get_version':
          return await this.getVersion();
        default:
          return {
            content: [{ type: 'text', text: `Unknown tool: ${name}` }],
            isError: true,
          };
      }
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Tool execution failed: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true,
      };
    }
  }

  private async listModels(): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}/api/tags`, {});
    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }
    const data = await response.json();
    const text = JSON.stringify(data, null, 2);
    return {
      content: [{ type: 'text', text: text.length > 10_000 ? text.slice(0, 10_000) + `\n... [truncated, ${text.length} total chars]` : text }],
      isError: false,
    };
  }

  private async getRunningModels(): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}/api/ps`, {});
    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }
    const data = await response.json();
    const text = JSON.stringify(data, null, 2);
    return {
      content: [{ type: 'text', text: text.length > 10_000 ? text.slice(0, 10_000) + `\n... [truncated, ${text.length} total chars]` : text }],
      isError: false,
    };
  }

  private async showModel(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = { name: args.name };
    if (args.verbose !== undefined) body.verbose = args.verbose;
    const response = await this.fetchWithRetry(`${this.baseUrl}/api/show`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }
    const data = await response.json();
    const text = JSON.stringify(data, null, 2);
    return {
      content: [{ type: 'text', text: text.length > 10_000 ? text.slice(0, 10_000) + `\n... [truncated, ${text.length} total chars]` : text }],
      isError: false,
    };
  }

  private async pullModel(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = { name: args.name, stream: false };
    if (args.insecure !== undefined) body.insecure = args.insecure;
    const response = await this.fetchWithRetry(`${this.baseUrl}/api/pull`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }
    const data = await response.json();
    const text = JSON.stringify(data, null, 2);
    return {
      content: [{ type: 'text', text: text.length > 10_000 ? text.slice(0, 10_000) + `\n... [truncated, ${text.length} total chars]` : text }],
      isError: false,
    };
  }

  private async pushModel(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = { name: args.name, stream: false };
    if (args.insecure !== undefined) body.insecure = args.insecure;
    const response = await this.fetchWithRetry(`${this.baseUrl}/api/push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }
    const data = await response.json();
    const text = JSON.stringify(data, null, 2);
    return {
      content: [{ type: 'text', text: text.length > 10_000 ? text.slice(0, 10_000) + `\n... [truncated, ${text.length} total chars]` : text }],
      isError: false,
    };
  }

  private async copyModel(args: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}/api/copy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source: args.source, destination: args.destination }),
    });
    if (response.status === 404) {
      return {
        content: [{ type: 'text', text: `Model not found: ${encodeURIComponent(args.source as string)}` }],
        isError: true,
      };
    }
    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }
    return {
      content: [{ type: 'text', text: JSON.stringify({ success: true, source: args.source, destination: args.destination }, null, 2) }],
      isError: false,
    };
  }

  private async deleteModel(args: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}/api/delete`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: args.name }),
    });
    if (response.status === 404) {
      return {
        content: [{ type: 'text', text: `Model not found: ${encodeURIComponent(args.name as string)}` }],
        isError: true,
      };
    }
    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }
    return {
      content: [{ type: 'text', text: JSON.stringify({ success: true, deleted: args.name }, null, 2) }],
      isError: false,
    };
  }

  private async createModel(args: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}/api/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: args.name, modelfile: args.modelfile, stream: false }),
    });
    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }
    const data = await response.json();
    const text = JSON.stringify(data, null, 2);
    return {
      content: [{ type: 'text', text: text.length > 10_000 ? text.slice(0, 10_000) + `\n... [truncated, ${text.length} total chars]` : text }],
      isError: false,
    };
  }

  private async generate(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {
      model: args.model,
      prompt: args.prompt,
      stream: false,
    };
    if (args.system !== undefined) body.system = args.system;
    if (args.template !== undefined) body.template = args.template;
    if (args.context !== undefined) body.context = args.context;
    if (args.options !== undefined) body.options = args.options;
    if (args.format !== undefined) body.format = args.format;

    const response = await this.fetchWithRetry(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }
    const data = await response.json();
    const text = JSON.stringify(data, null, 2);
    return {
      content: [{ type: 'text', text: text.length > 10_000 ? text.slice(0, 10_000) + `\n... [truncated, ${text.length} total chars]` : text }],
      isError: false,
    };
  }

  private async chat(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {
      model: args.model,
      messages: args.messages,
      stream: false,
    };
    if (args.options !== undefined) body.options = args.options;
    if (args.format !== undefined) body.format = args.format;

    const response = await this.fetchWithRetry(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }
    const data = await response.json();
    const text = JSON.stringify(data, null, 2);
    return {
      content: [{ type: 'text', text: text.length > 10_000 ? text.slice(0, 10_000) + `\n... [truncated, ${text.length} total chars]` : text }],
      isError: false,
    };
  }

  private async getVersion(): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}/api/version`, {});
    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }
    const data = await response.json();
    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      isError: false,
    };
  }

  private async embed(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {
      model: args.model,
      input: args.input,
    };
    if (args.options !== undefined) body.options = args.options;

    const response = await this.fetchWithRetry(`${this.baseUrl}/api/embed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }
    const data = await response.json();
    const text = JSON.stringify(data, null, 2);
    return {
      content: [{ type: 'text', text: text.length > 10_000 ? text.slice(0, 10_000) + `\n... [truncated, ${text.length} total chars]` : text }],
      isError: false,
    };
  }
}

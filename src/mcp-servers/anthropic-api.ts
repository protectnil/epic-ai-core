/**
 * Anthropic Claude API MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28.
// No official Anthropic MCP server targeting the Claude REST API was found on GitHub.
// github.com/anthropics/claude-ai-mcp is a communication/bug-reporting hub, not a tool server.
// Community implementations exist but none have official Anthropic backing or 10+ tools.
// Our adapter covers: 14 tools. Vendor MCP covers: 0 tools.
// Recommendation: use-rest-api — no official MCP server exists.
//
// Base URL: https://api.anthropic.com/v1
// Auth: x-api-key header (API key from console.anthropic.com) + anthropic-version: 2023-06-01
// Docs: https://docs.anthropic.com/en/api/overview
// Rate limits: Varies by tier. Tier 1: 50 req/min. Tier 4: 4,000 req/min. See console for your tier.
// Beta features (Files API): requires anthropic-beta: files-api-2025-04-14 header
// Not covered (out of scope): Skills API (beta, POST/GET /v1/skills), Admin API (enterprise only),
//   Completions API (legacy), file content download (GET /v1/files/{id}/content)

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface AnthropicConfig {
  apiKey: string;
  baseUrl?: string;
}

export class AnthropicMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: AnthropicConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? 'https://api.anthropic.com/v1';
  }

  private get headers(): Record<string, string> {
    return {
      'x-api-key': this.apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    };
  }

  private get filesHeaders(): Record<string, string> {
    return {
      ...this.headers,
      'anthropic-beta': 'files-api-2025-04-14',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'create_message',
        description: 'Send a prompt to a Claude model and receive a completion. Supports system prompts, multi-turn conversations, vision, and tool use via the Messages API.',
        inputSchema: {
          type: 'object',
          properties: {
            model: {
              type: 'string',
              description: 'Claude model ID (e.g. claude-opus-4-6, claude-sonnet-4-5, claude-haiku-3-5)',
            },
            messages: {
              type: 'array',
              description: 'Array of message objects with role ("user" or "assistant") and content fields',
            },
            max_tokens: {
              type: 'number',
              description: 'Maximum number of tokens to generate in the response (required)',
            },
            system: {
              type: 'string',
              description: 'Optional system prompt to set context and instructions for the model',
            },
            temperature: {
              type: 'number',
              description: 'Sampling temperature 0–1. Higher = more creative, lower = more deterministic (default: 1)',
            },
            top_p: {
              type: 'number',
              description: 'Top-p (nucleus) sampling probability mass. Use temperature or top_p, not both.',
            },
            top_k: {
              type: 'number',
              description: 'Only sample from the top K most likely tokens',
            },
            stop_sequences: {
              type: 'array',
              description: 'Array of strings that will halt generation when encountered',
            },
            tools: {
              type: 'array',
              description: 'Array of tool definitions the model may call during response generation',
            },
            tool_choice: {
              type: 'object',
              description: 'Controls tool selection: {type: "auto"}, {type: "any"}, or {type: "tool", name: "tool_name"}',
            },
            metadata: {
              type: 'object',
              description: 'Optional metadata object. Supports user_id for abuse detection.',
            },
            stream: {
              type: 'boolean',
              description: 'Set to true to receive a streaming response (not supported via this adapter — use false)',
            },
          },
          required: ['model', 'messages', 'max_tokens'],
        },
      },
      {
        name: 'list_models',
        description: 'List all available Claude models and their metadata including context window size and capabilities.',
        inputSchema: {
          type: 'object',
          properties: {
            before_id: {
              type: 'string',
              description: 'Cursor for pagination — return models before this ID',
            },
            after_id: {
              type: 'string',
              description: 'Cursor for pagination — return models after this ID',
            },
            limit: {
              type: 'number',
              description: 'Number of models to return (1–1000, default: 20)',
            },
          },
        },
      },
      {
        name: 'get_model',
        description: 'Retrieve metadata for a specific Claude model by ID, including context window, max tokens, and display name.',
        inputSchema: {
          type: 'object',
          properties: {
            model_id: {
              type: 'string',
              description: 'The model ID to retrieve (e.g. claude-opus-4-6)',
            },
          },
          required: ['model_id'],
        },
      },
      {
        name: 'count_tokens',
        description: 'Count the number of tokens a prompt will consume without creating a message. Use before sending to manage costs and context limits.',
        inputSchema: {
          type: 'object',
          properties: {
            model: {
              type: 'string',
              description: 'Model ID to count tokens for (token counts vary by model)',
            },
            messages: {
              type: 'array',
              description: 'Array of message objects to count tokens for',
            },
            system: {
              type: 'string',
              description: 'System prompt to include in the token count',
            },
            tools: {
              type: 'array',
              description: 'Tool definitions to include in the token count',
            },
          },
          required: ['model', 'messages'],
        },
      },
      {
        name: 'create_message_batch',
        description: 'Submit multiple Claude message requests for asynchronous processing at 50% cost reduction. Returns a batch ID to poll for results.',
        inputSchema: {
          type: 'object',
          properties: {
            requests: {
              type: 'array',
              description: 'Array of batch request objects, each with custom_id (string) and params (model, messages, max_tokens, and any other message fields)',
            },
          },
          required: ['requests'],
        },
      },
      {
        name: 'list_message_batches',
        description: 'List message batches submitted to the Batches API, ordered by creation time descending.',
        inputSchema: {
          type: 'object',
          properties: {
            before_id: {
              type: 'string',
              description: 'Cursor — return batches created before this batch ID',
            },
            after_id: {
              type: 'string',
              description: 'Cursor — return batches created after this batch ID',
            },
            limit: {
              type: 'number',
              description: 'Number of batches to return (1–100, default: 20)',
            },
          },
        },
      },
      {
        name: 'get_message_batch',
        description: 'Retrieve the current status and metadata of a message batch by ID. Poll until processing_status is "ended".',
        inputSchema: {
          type: 'object',
          properties: {
            batch_id: {
              type: 'string',
              description: 'ID of the message batch to retrieve (e.g. msgbatch_...)',
            },
          },
          required: ['batch_id'],
        },
      },
      {
        name: 'cancel_message_batch',
        description: 'Cancel an in-progress message batch. Requests not yet processed will be cancelled; completed results remain accessible.',
        inputSchema: {
          type: 'object',
          properties: {
            batch_id: {
              type: 'string',
              description: 'ID of the message batch to cancel',
            },
          },
          required: ['batch_id'],
        },
      },
      {
        name: 'delete_message_batch',
        description: 'Permanently delete a message batch and its results. The batch must have ended before deletion.',
        inputSchema: {
          type: 'object',
          properties: {
            batch_id: {
              type: 'string',
              description: 'ID of the ended message batch to delete',
            },
          },
          required: ['batch_id'],
        },
      },
      {
        name: 'get_message_batch_results',
        description: 'Stream the results of an ended message batch as JSONL. Returns each request result with custom_id and outcome. Poll get_message_batch until processing_status is "ended" before calling this.',
        inputSchema: {
          type: 'object',
          properties: {
            batch_id: {
              type: 'string',
              description: 'ID of the ended message batch to retrieve results for (e.g. msgbatch_...)',
            },
          },
          required: ['batch_id'],
        },
      },
      {
        name: 'upload_file',
        description: 'Upload a file to Anthropic secure storage for reuse across API calls. Returns a file_id. Requires Files API beta. Supports PDF, plain text, and image files up to 500MB.',
        inputSchema: {
          type: 'object',
          properties: {
            file_content: {
              type: 'string',
              description: 'Base64-encoded file content to upload',
            },
            filename: {
              type: 'string',
              description: 'Name of the file including extension (e.g. document.pdf, notes.txt)',
            },
            mime_type: {
              type: 'string',
              description: 'MIME type of the file (e.g. application/pdf, text/plain, image/png)',
            },
          },
          required: ['file_content', 'filename', 'mime_type'],
        },
      },
      {
        name: 'list_files',
        description: 'List files previously uploaded to Anthropic secure storage via the Files API.',
        inputSchema: {
          type: 'object',
          properties: {
            before_id: {
              type: 'string',
              description: 'Cursor — return files created before this file ID',
            },
            after_id: {
              type: 'string',
              description: 'Cursor — return files created after this file ID',
            },
            limit: {
              type: 'number',
              description: 'Number of files to return (1–1000, default: 20)',
            },
          },
        },
      },
      {
        name: 'get_file_metadata',
        description: 'Retrieve metadata for a specific uploaded file by its file_id, including filename, size, and creation time.',
        inputSchema: {
          type: 'object',
          properties: {
            file_id: {
              type: 'string',
              description: 'ID of the file to retrieve metadata for (e.g. file_...)',
            },
          },
          required: ['file_id'],
        },
      },
      {
        name: 'delete_file',
        description: 'Permanently delete an uploaded file from Anthropic secure storage. File references in prior messages are not affected.',
        inputSchema: {
          type: 'object',
          properties: {
            file_id: {
              type: 'string',
              description: 'ID of the file to delete',
            },
          },
          required: ['file_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'create_message':
          return await this.createMessage(args);
        case 'list_models':
          return await this.listModels(args);
        case 'get_model':
          return await this.getModel(args);
        case 'count_tokens':
          return await this.countTokens(args);
        case 'create_message_batch':
          return await this.createMessageBatch(args);
        case 'list_message_batches':
          return await this.listMessageBatches(args);
        case 'get_message_batch':
          return await this.getMessageBatch(args);
        case 'cancel_message_batch':
          return await this.cancelMessageBatch(args);
        case 'delete_message_batch':
          return await this.deleteMessageBatch(args);
        case 'get_message_batch_results':
          return await this.getMessageBatchResults(args);
        case 'upload_file':
          return await this.uploadFile(args);
        case 'list_files':
          return await this.listFiles(args);
        case 'get_file_metadata':
          return await this.getFileMetadata(args);
        case 'delete_file':
          return await this.deleteFile(args);
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

  private async createMessage(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {
      model: args.model,
      messages: args.messages,
      max_tokens: args.max_tokens,
    };
    if (args.system !== undefined) body.system = args.system;
    if (args.temperature !== undefined) body.temperature = args.temperature;
    if (args.top_p !== undefined) body.top_p = args.top_p;
    if (args.top_k !== undefined) body.top_k = args.top_k;
    if (args.stop_sequences !== undefined) body.stop_sequences = args.stop_sequences;
    if (args.tools !== undefined) body.tools = args.tools;
    if (args.tool_choice !== undefined) body.tool_choice = args.tool_choice;
    if (args.metadata !== undefined) body.metadata = args.metadata;

    const response = await this.fetchWithRetry(`${this.baseUrl}/messages`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return {
        content: [{ type: 'text', text: `API error ${response.status}: ${errText}` }],
        isError: true,
      };
    }

    const data = await response.json();
    return {
      content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }],
      isError: false,
    };
  }

  private async listModels(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.before_id) params.set('before_id', String(args.before_id));
    if (args.after_id) params.set('after_id', String(args.after_id));
    if (args.limit) params.set('limit', String(args.limit));
    const qs = params.toString();

    const response = await this.fetchWithRetry(`${this.baseUrl}/models${qs ? `?${qs}` : ''}`, {
      headers: this.headers,
    });

    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `API error ${response.status}: ${response.statusText}` }],
        isError: true,
      };
    }

    const data = await response.json();
    return {
      content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }],
      isError: false,
    };
  }

  private async getModel(args: Record<string, unknown>): Promise<ToolResult> {
    const modelId = args.model_id as string;
    const response = await this.fetchWithRetry(`${this.baseUrl}/models/${encodeURIComponent(modelId)}`, {
      headers: this.headers,
    });

    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `API error ${response.status}: ${response.statusText}` }],
        isError: true,
      };
    }

    const data = await response.json();
    return {
      content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }],
      isError: false,
    };
  }

  private async countTokens(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {
      model: args.model,
      messages: args.messages,
    };
    if (args.system !== undefined) body.system = args.system;
    if (args.tools !== undefined) body.tools = args.tools;

    const response = await this.fetchWithRetry(`${this.baseUrl}/messages/count_tokens`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return {
        content: [{ type: 'text', text: `API error ${response.status}: ${errText}` }],
        isError: true,
      };
    }

    const data = await response.json();
    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      isError: false,
    };
  }

  private async createMessageBatch(args: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}/messages/batches`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({ requests: args.requests }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return {
        content: [{ type: 'text', text: `API error ${response.status}: ${errText}` }],
        isError: true,
      };
    }

    const data = await response.json();
    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      isError: false,
    };
  }

  private async listMessageBatches(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.before_id) params.set('before_id', String(args.before_id));
    if (args.after_id) params.set('after_id', String(args.after_id));
    if (args.limit) params.set('limit', String(args.limit));
    const qs = params.toString();

    const response = await this.fetchWithRetry(`${this.baseUrl}/messages/batches${qs ? `?${qs}` : ''}`, {
      headers: this.headers,
    });

    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `API error ${response.status}: ${response.statusText}` }],
        isError: true,
      };
    }

    const data = await response.json();
    return {
      content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }],
      isError: false,
    };
  }

  private async getMessageBatch(args: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}/messages/batches/${encodeURIComponent(String(args.batch_id))}`, {
      headers: this.headers,
    });

    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `API error ${response.status}: ${response.statusText}` }],
        isError: true,
      };
    }

    const data = await response.json();
    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      isError: false,
    };
  }

  private async cancelMessageBatch(args: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}/messages/batches/${encodeURIComponent(String(args.batch_id))}/cancel`, {
      method: 'POST',
      headers: this.headers,
    });

    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `API error ${response.status}: ${response.statusText}` }],
        isError: true,
      };
    }

    const data = await response.json();
    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      isError: false,
    };
  }

  private async deleteMessageBatch(args: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}/messages/batches/${encodeURIComponent(String(args.batch_id))}`, {
      method: 'DELETE',
      headers: this.headers,
    });

    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `API error ${response.status}: ${response.statusText}` }],
        isError: true,
      };
    }

    const data = await response.json().catch(() => ({ deleted: true }));
    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      isError: false,
    };
  }

  private async getMessageBatchResults(args: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}/messages/batches/${encodeURIComponent(String(args.batch_id))}/results`, {
      headers: this.headers,
    });

    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `API error ${response.status}: ${response.statusText}` }],
        isError: true,
      };
    }

    const text = await response.text();
    return {
      content: [{ type: 'text', text: this.truncate(text) }],
      isError: false,
    };
  }

  private async uploadFile(args: Record<string, unknown>): Promise<ToolResult> {
    // Files API requires multipart/form-data — build manually
    const boundary = `----EpicAIBoundary${Date.now()}`;
    const filename = args.filename as string;
    const mimeType = args.mime_type as string;
    const fileContentB64 = args.file_content as string;

    // Decode base64 to binary
    const binaryStr = atob(fileContentB64);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }

    const bodyParts: Uint8Array[] = [];
    const enc = new TextEncoder();
    bodyParts.push(enc.encode(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: ${mimeType}\r\n\r\n`));
    bodyParts.push(bytes);
    bodyParts.push(enc.encode(`\r\n--${boundary}--\r\n`));

    const totalLength = bodyParts.reduce((sum, p) => sum + p.length, 0);
    const body = new Uint8Array(totalLength);
    let offset = 0;
    for (const part of bodyParts) {
      body.set(part, offset);
      offset += part.length;
    }

    const response = await this.fetchWithRetry(`${this.baseUrl}/files`, {
      method: 'POST',
      headers: {
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'files-api-2025-04-14',
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
      },
      body,
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return {
        content: [{ type: 'text', text: `API error ${response.status}: ${errText}` }],
        isError: true,
      };
    }

    const data = await response.json();
    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      isError: false,
    };
  }

  private async listFiles(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.before_id) params.set('before_id', String(args.before_id));
    if (args.after_id) params.set('after_id', String(args.after_id));
    if (args.limit) params.set('limit', String(args.limit));
    const qs = params.toString();

    const response = await this.fetchWithRetry(`${this.baseUrl}/files${qs ? `?${qs}` : ''}`, {
      headers: this.filesHeaders,
    });

    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `API error ${response.status}: ${response.statusText}` }],
        isError: true,
      };
    }

    const data = await response.json();
    return {
      content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }],
      isError: false,
    };
  }

  private async getFileMetadata(args: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}/files/${encodeURIComponent(String(args.file_id))}`, {
      headers: this.filesHeaders,
    });

    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `API error ${response.status}: ${response.statusText}` }],
        isError: true,
      };
    }

    const data = await response.json();
    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      isError: false,
    };
  }

  private async deleteFile(args: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}/files/${encodeURIComponent(String(args.file_id))}`, {
      method: 'DELETE',
      headers: this.filesHeaders,
    });

    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `API error ${response.status}: ${response.statusText}` }],
        isError: true,
      };
    }

    const data = await response.json().catch(() => ({ deleted: true }));
    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      isError: false,
    };
  }

  static catalog() {
    return {
      name: 'anthropic-api',
      displayName: 'Anthropic Claude API',
      version: '1.0.0',
      category: 'ai-ml' as const,
      keywords: ['anthropic', 'claude', 'llm', 'ai', 'messages', 'completion', 'model', 'batch', 'files', 'tokens'],
      toolNames: [
        'create_message', 'list_models', 'get_model', 'count_tokens',
        'create_message_batch', 'list_message_batches', 'get_message_batch',
        'get_message_batch_results', 'cancel_message_batch', 'delete_message_batch',
        'upload_file', 'list_files', 'get_file_metadata', 'delete_file',
      ],
      description: 'Interact with the Anthropic Claude API: send messages, list models, count tokens, manage message batches, and manage uploaded files.',
      author: 'protectnil' as const,
    };
  }
}

/**
 * Together AI MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// No official Together AI MCP server was found on GitHub. Multiple community servers exist for image
// generation only (github.com/manascb1344/together-mcp-server, stefanskiasan/togetherai-image-mcp-server,
// zym9863/together-ai-image-server) but are not published by Together AI and cover only image generation,
// not the full API surface. None meet the official MCP criteria.
//
// Base URL: https://api.together.xyz/v1
// Auth: Bearer token — Authorization: Bearer {TOGETHER_API_KEY}
// Docs: https://docs.together.ai/docs/quickstart
// Rate limits: Dynamic per user/model, based on ~2x past-hour successful request rate.
//              Rolling out to all users after January 26, 2026. Headers in each response
//              report current limits and reset timing.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface TogetherAIConfig {
  apiKey: string;
  baseUrl?: string;
}

export class TogetherAIMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: TogetherAIConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.together.xyz/v1';
  }

  static catalog() {
    return {
      name: 'together-ai',
      displayName: 'Together AI',
      version: '1.0.0',
      category: 'ai-ml',
      keywords: [
        'together ai', 'llm', 'inference', 'open source models', 'llama', 'mistral',
        'chat completions', 'embeddings', 'image generation', 'fine-tuning',
        'serverless inference', 'ai cloud', 'foundation models',
      ],
      toolNames: [
        'list_models',
        'get_model',
        'chat_completion',
        'text_completion',
        'create_embedding',
        'generate_image',
        'list_fine_tuning_jobs',
        'get_fine_tuning_job',
        'create_fine_tuning_job',
        'cancel_fine_tuning_job',
        'list_files',
        'upload_file',
        'delete_file',
      ],
      description: 'Together AI inference platform: run chat, text, image generation, and embeddings on 200+ open-source models; manage fine-tuning jobs and training files.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_models',
        description: 'List all available models on Together AI, including chat, language, image, and embedding models with their context lengths',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_model',
        description: 'Get detailed information about a specific model by model ID, including pricing and context window size',
        inputSchema: {
          type: 'object',
          properties: {
            model_id: {
              type: 'string',
              description: 'Model ID (e.g. meta-llama/Llama-3-8b-chat-hf)',
            },
          },
          required: ['model_id'],
        },
      },
      {
        name: 'chat_completion',
        description: 'Run a chat completion against any Together AI chat model with messages, temperature, and token limit controls',
        inputSchema: {
          type: 'object',
          properties: {
            model: {
              type: 'string',
              description: 'Model ID to use (e.g. meta-llama/Llama-3-8b-chat-hf, mistralai/Mixtral-8x7B-Instruct-v0.1)',
            },
            messages: {
              type: 'string',
              description: 'JSON array string of chat messages with role and content (e.g. [{"role":"user","content":"Hello"}])',
            },
            max_tokens: {
              type: 'number',
              description: 'Maximum tokens to generate in the response (default: 512)',
            },
            temperature: {
              type: 'number',
              description: 'Sampling temperature 0.0–2.0 — lower is more deterministic (default: 0.7)',
            },
            top_p: {
              type: 'number',
              description: 'Nucleus sampling probability threshold 0.0–1.0 (default: 0.7)',
            },
            stop: {
              type: 'string',
              description: 'Stop sequence string or JSON array of strings to end generation early',
            },
            stream: {
              type: 'boolean',
              description: 'Whether to stream tokens as they are generated (default: false)',
            },
          },
          required: ['model', 'messages'],
        },
      },
      {
        name: 'text_completion',
        description: 'Run a text (non-chat) completion against a Together AI language or code model with a raw prompt',
        inputSchema: {
          type: 'object',
          properties: {
            model: {
              type: 'string',
              description: 'Model ID for text completion (e.g. togethercomputer/CodeLlama-7b)',
            },
            prompt: {
              type: 'string',
              description: 'Raw text prompt to complete',
            },
            max_tokens: {
              type: 'number',
              description: 'Maximum tokens to generate (default: 512)',
            },
            temperature: {
              type: 'number',
              description: 'Sampling temperature 0.0–2.0 (default: 0.7)',
            },
            top_p: {
              type: 'number',
              description: 'Nucleus sampling threshold (default: 0.7)',
            },
            stop: {
              type: 'string',
              description: 'Stop sequence string to end generation early',
            },
          },
          required: ['model', 'prompt'],
        },
      },
      {
        name: 'create_embedding',
        description: 'Generate vector embeddings for text input using a Together AI embedding model for RAG and semantic search',
        inputSchema: {
          type: 'object',
          properties: {
            model: {
              type: 'string',
              description: 'Embedding model ID (e.g. togethercomputer/m2-bert-80M-8k-retrieval)',
            },
            input: {
              type: 'string',
              description: 'Text string or JSON array of strings to embed',
            },
          },
          required: ['model', 'input'],
        },
      },
      {
        name: 'generate_image',
        description: 'Generate an image from a text prompt using Together AI image generation models such as Stable Diffusion or FLUX',
        inputSchema: {
          type: 'object',
          properties: {
            model: {
              type: 'string',
              description: 'Image generation model ID (e.g. stabilityai/stable-diffusion-xl-base-1.0, black-forest-labs/FLUX.1-schnell)',
            },
            prompt: {
              type: 'string',
              description: 'Text description of the image to generate',
            },
            width: {
              type: 'number',
              description: 'Image width in pixels (default: 1024)',
            },
            height: {
              type: 'number',
              description: 'Image height in pixels (default: 1024)',
            },
            steps: {
              type: 'number',
              description: 'Number of diffusion steps (default: 20, more steps = higher quality but slower)',
            },
            n: {
              type: 'number',
              description: 'Number of images to generate (default: 1)',
            },
            seed: {
              type: 'number',
              description: 'Random seed for reproducible outputs (optional)',
            },
          },
          required: ['model', 'prompt'],
        },
      },
      {
        name: 'list_fine_tuning_jobs',
        description: 'List all fine-tuning jobs for the account, including status, base model, and training progress',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of jobs to return (default: 20)',
            },
            offset: {
              type: 'number',
              description: 'Number of jobs to skip for pagination (default: 0)',
            },
          },
        },
      },
      {
        name: 'get_fine_tuning_job',
        description: 'Get status and metrics for a specific fine-tuning job by job ID',
        inputSchema: {
          type: 'object',
          properties: {
            job_id: {
              type: 'string',
              description: 'Fine-tuning job ID to retrieve',
            },
          },
          required: ['job_id'],
        },
      },
      {
        name: 'create_fine_tuning_job',
        description: 'Start a new fine-tuning job on a base model using an uploaded training file',
        inputSchema: {
          type: 'object',
          properties: {
            training_file: {
              type: 'string',
              description: 'File ID of the uploaded JSONL training dataset',
            },
            model: {
              type: 'string',
              description: 'Base model ID to fine-tune (e.g. meta-llama/Llama-3-8b-chat-hf)',
            },
            n_epochs: {
              type: 'number',
              description: 'Number of training epochs (default: 1)',
            },
            learning_rate: {
              type: 'number',
              description: 'Learning rate multiplier (default: 1e-5)',
            },
            suffix: {
              type: 'string',
              description: 'Suffix to append to the fine-tuned model name (max 18 characters)',
            },
          },
          required: ['training_file', 'model'],
        },
      },
      {
        name: 'cancel_fine_tuning_job',
        description: 'Cancel a running fine-tuning job by job ID to stop training and avoid further charges',
        inputSchema: {
          type: 'object',
          properties: {
            job_id: {
              type: 'string',
              description: 'Fine-tuning job ID to cancel',
            },
          },
          required: ['job_id'],
        },
      },
      {
        name: 'list_files',
        description: 'List all training files uploaded to the Together AI account for fine-tuning',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'upload_file',
        description: 'Upload a JSONL training dataset file for fine-tuning. Content must be base64-encoded JSONL.',
        inputSchema: {
          type: 'object',
          properties: {
            filename: {
              type: 'string',
              description: 'Name for the uploaded file (e.g. training_data.jsonl)',
            },
            content_base64: {
              type: 'string',
              description: 'Base64-encoded JSONL file content. Each line must be {"prompt": "...", "completion": "..."} or chat format.',
            },
          },
          required: ['filename', 'content_base64'],
        },
      },
      {
        name: 'delete_file',
        description: 'Delete an uploaded training file from the Together AI account by file ID',
        inputSchema: {
          type: 'object',
          properties: {
            file_id: {
              type: 'string',
              description: 'File ID to delete',
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
        case 'list_models':
          return this.listModels();
        case 'get_model':
          return this.getModel(args);
        case 'chat_completion':
          return this.chatCompletion(args);
        case 'text_completion':
          return this.textCompletion(args);
        case 'create_embedding':
          return this.createEmbedding(args);
        case 'generate_image':
          return this.generateImage(args);
        case 'list_fine_tuning_jobs':
          return this.listFineTuningJobs(args);
        case 'get_fine_tuning_job':
          return this.getFineTuningJob(args);
        case 'create_fine_tuning_job':
          return this.createFineTuningJob(args);
        case 'cancel_fine_tuning_job':
          return this.cancelFineTuningJob(args);
        case 'list_files':
          return this.listFiles();
        case 'upload_file':
          return this.uploadFile(args);
        case 'delete_file':
          return this.deleteFile(args);
        default:
          return { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true };
      }
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Tool execution failed: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true,
      };
    }
  }

  private get headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  private async togetherGet(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, { headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async togetherPost(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async togetherDelete(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'DELETE',
      headers: this.headers,
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async listModels(): Promise<ToolResult> {
    return this.togetherGet('/models');
  }

  private async getModel(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.model_id) return { content: [{ type: 'text', text: 'model_id is required' }], isError: true };
    return this.togetherGet(`/models/${encodeURIComponent(args.model_id as string)}`);
  }

  private async chatCompletion(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.model || !args.messages) return { content: [{ type: 'text', text: 'model and messages are required' }], isError: true };
    let messages: unknown;
    try { messages = JSON.parse(args.messages as string); } catch { return { content: [{ type: 'text', text: 'messages must be a valid JSON array string' }], isError: true }; }
    const body: Record<string, unknown> = {
      model: args.model,
      messages,
      max_tokens: (args.max_tokens as number) ?? 512,
      temperature: (args.temperature as number) ?? 0.7,
    };
    if (args.top_p !== undefined) body.top_p = args.top_p;
    if (args.stop) {
      try { body.stop = JSON.parse(args.stop as string); } catch { body.stop = args.stop; }
    }
    if (typeof args.stream === 'boolean') body.stream = args.stream;
    return this.togetherPost('/chat/completions', body);
  }

  private async textCompletion(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.model || !args.prompt) return { content: [{ type: 'text', text: 'model and prompt are required' }], isError: true };
    const body: Record<string, unknown> = {
      model: args.model,
      prompt: args.prompt,
      max_tokens: (args.max_tokens as number) ?? 512,
      temperature: (args.temperature as number) ?? 0.7,
    };
    if (args.top_p !== undefined) body.top_p = args.top_p;
    if (args.stop) body.stop = args.stop;
    return this.togetherPost('/completions', body);
  }

  private async createEmbedding(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.model || !args.input) return { content: [{ type: 'text', text: 'model and input are required' }], isError: true };
    let input: unknown = args.input;
    try { input = JSON.parse(args.input as string); } catch { /* use raw string */ }
    return this.togetherPost('/embeddings', { model: args.model, input });
  }

  private async generateImage(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.model || !args.prompt) return { content: [{ type: 'text', text: 'model and prompt are required' }], isError: true };
    const body: Record<string, unknown> = {
      model: args.model,
      prompt: args.prompt,
      width: (args.width as number) ?? 1024,
      height: (args.height as number) ?? 1024,
      steps: (args.steps as number) ?? 20,
      n: (args.n as number) ?? 1,
    };
    if (args.seed !== undefined) body.seed = args.seed;
    return this.togetherPost('/images/generations', body);
  }

  private async listFineTuningJobs(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams({
      limit: String((args.limit as number) ?? 20),
      offset: String((args.offset as number) ?? 0),
    });
    return this.togetherGet(`/fine-tunes?${params}`);
  }

  private async getFineTuningJob(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.job_id) return { content: [{ type: 'text', text: 'job_id is required' }], isError: true };
    return this.togetherGet(`/fine-tunes/${encodeURIComponent(args.job_id as string)}`);
  }

  private async createFineTuningJob(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.training_file || !args.model) return { content: [{ type: 'text', text: 'training_file and model are required' }], isError: true };
    const body: Record<string, unknown> = {
      training_file: args.training_file,
      model: args.model,
    };
    if (args.n_epochs !== undefined) body.n_epochs = args.n_epochs;
    if (args.learning_rate !== undefined) body.learning_rate = args.learning_rate;
    if (args.suffix) body.suffix = args.suffix;
    return this.togetherPost('/fine-tunes', body);
  }

  private async cancelFineTuningJob(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.job_id) return { content: [{ type: 'text', text: 'job_id is required' }], isError: true };
    return this.togetherPost(`/fine-tunes/${encodeURIComponent(args.job_id as string)}/cancel`, {});
  }

  private async listFiles(): Promise<ToolResult> {
    return this.togetherGet('/files');
  }

  private async uploadFile(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.filename || !args.content_base64) return { content: [{ type: 'text', text: 'filename and content_base64 are required' }], isError: true };
    // Decode base64 to send as multipart — use JSON upload endpoint instead
    return this.togetherPost('/files', {
      file: args.content_base64,
      filename: args.filename,
      purpose: 'fine-tune',
    });
  }

  private async deleteFile(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.file_id) return { content: [{ type: 'text', text: 'file_id is required' }], isError: true };
    return this.togetherDelete(`/files/${encodeURIComponent(args.file_id as string)}`);
  }
}

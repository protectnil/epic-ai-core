/**
 * Fireworks AI MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28.
// Fireworks AI supports MCP as a CLIENT (Responses API can call external MCP servers) but
// publishes no MCP server for managing the Fireworks platform.
// Our adapter covers: 15 tools. Vendor MCP covers: 0 tools (N/A).
// Recommendation: use-rest-api — no vendor MCP server exists.
//
// Base URL: https://api.fireworks.ai/inference/v1 (inference endpoints)
//           https://api.fireworks.ai (account management endpoints — deployments, models, fine-tuning, datasets)
// Auth: Bearer token (Fireworks API key from https://app.fireworks.ai/settings/users/api-keys)
// Docs: https://docs.fireworks.ai/api-reference/introduction
// Rate limits: Varies by model and account tier; not publicly documented per-endpoint

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface FireworksAIConfig {
  apiKey: string;
  baseUrl?: string;       // default: https://api.fireworks.ai/inference/v1
  accountId?: string;     // Fireworks account ID for account-specific operations
}

export class FireworksAIMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly accountId: string;

  constructor(config: FireworksAIConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.fireworks.ai/inference/v1';
    this.accountId = config.accountId || 'me';
  }

  static catalog() {
    return {
      name: 'fireworks-ai',
      displayName: 'Fireworks AI',
      version: '1.0.0',
      category: 'ai-ml',
      keywords: [
        'fireworks', 'fireworks-ai', 'llm', 'inference', 'generative ai',
        'chat completion', 'embeddings', 'fine-tuning', 'sft', 'dpo',
        'open source models', 'llama', 'mistral', 'deepseek', 'serverless',
        'dedicated deployment', 'function calling', 'structured output',
        'text generation', 'image generation', 'fast inference',
      ],
      toolNames: [
        'chat_completion', 'text_completion', 'create_embedding',
        'list_models', 'get_model',
        'list_deployments', 'get_deployment',
        'list_fine_tuning_jobs', 'create_fine_tuning_job', 'get_fine_tuning_job', 'cancel_fine_tuning_job',
        'list_datasets', 'upload_dataset',
        'create_image', 'list_accounts',
      ],
      description: 'Fireworks AI fast LLM inference: chat completions, text completions, embeddings, image generation, model listing, fine-tuning jobs, and dedicated deployment management.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'chat_completion',
        description: 'Generate a chat completion from a Fireworks AI model given a list of messages — supports streaming, function calling, and structured outputs',
        inputSchema: {
          type: 'object',
          properties: {
            model: {
              type: 'string',
              description: 'Model ID in accounts/{account}/models/{model} format (e.g. accounts/fireworks/models/llama-v3p1-70b-instruct)',
            },
            messages: {
              type: 'array',
              description: 'Array of message objects with role (system, user, assistant) and content fields',
            },
            max_tokens: {
              type: 'number',
              description: 'Maximum tokens to generate (default: 512, max varies by model)',
            },
            temperature: {
              type: 'number',
              description: 'Sampling temperature 0.0–2.0 (default: 1.0; lower = more deterministic)',
            },
            top_p: {
              type: 'number',
              description: 'Nucleus sampling threshold 0.0–1.0 (default: 1.0)',
            },
            top_k: {
              type: 'number',
              description: 'Top-k sampling — limits tokens considered per step (default: disabled)',
            },
            frequency_penalty: {
              type: 'number',
              description: 'Penalty for repeated tokens -2.0 to 2.0 (default: 0)',
            },
            presence_penalty: {
              type: 'number',
              description: 'Penalty for new topic presence -2.0 to 2.0 (default: 0)',
            },
            stream: {
              type: 'boolean',
              description: 'Enable streaming response (default: false — this adapter returns non-streaming only)',
            },
            response_format: {
              type: 'object',
              description: 'Output format: { "type": "json_object" } for structured JSON output',
            },
            tools: {
              type: 'array',
              description: 'Array of tool/function definitions for function calling (OpenAI format)',
            },
            tool_choice: {
              type: 'string',
              description: 'Tool selection: auto (default), none, or required',
            },
            n: {
              type: 'number',
              description: 'Number of completions to generate (default: 1)',
            },
          },
          required: ['model', 'messages'],
        },
      },
      {
        name: 'text_completion',
        description: 'Generate a text completion from a Fireworks AI model from a raw prompt string',
        inputSchema: {
          type: 'object',
          properties: {
            model: {
              type: 'string',
              description: 'Model ID (e.g. accounts/fireworks/models/llama-v3p1-70b)',
            },
            prompt: {
              type: 'string',
              description: 'Input text prompt for completion',
            },
            max_tokens: {
              type: 'number',
              description: 'Maximum tokens to generate (default: 256)',
            },
            temperature: {
              type: 'number',
              description: 'Sampling temperature 0.0–2.0 (default: 1.0)',
            },
            top_p: {
              type: 'number',
              description: 'Nucleus sampling threshold 0.0–1.0 (default: 1.0)',
            },
            stop: {
              type: 'array',
              description: 'Array of up to 4 stop sequences that halt generation',
            },
            echo: {
              type: 'boolean',
              description: 'Echo the prompt in the response (default: false)',
            },
          },
          required: ['model', 'prompt'],
        },
      },
      {
        name: 'create_embedding',
        description: 'Create vector embeddings for text using a Fireworks AI embedding model',
        inputSchema: {
          type: 'object',
          properties: {
            model: {
              type: 'string',
              description: 'Embedding model ID (e.g. accounts/fireworks/models/nomic-embed-text-v1-5)',
            },
            input: {
              type: 'string',
              description: 'Text to embed — string for single input or array of strings for batch',
            },
            encoding_format: {
              type: 'string',
              description: 'Output format: float (default) or base64',
            },
          },
          required: ['model', 'input'],
        },
      },
      {
        name: 'list_models',
        description: 'List models available in the Fireworks AI account including custom and public models with metadata',
        inputSchema: {
          type: 'object',
          properties: {
            filter: {
              type: 'string',
              description: 'Server-side filter expression (optional)',
            },
            page_token: {
              type: 'string',
              description: 'Pagination token from a previous response',
            },
          },
        },
      },
      {
        name: 'get_model',
        description: 'Get detailed metadata for a specific Fireworks AI model including context window and capabilities',
        inputSchema: {
          type: 'object',
          properties: {
            model_id: {
              type: 'string',
              description: 'Full model resource name (e.g. accounts/fireworks/models/llama-v3p1-70b-instruct)',
            },
          },
          required: ['model_id'],
        },
      },
      {
        name: 'list_deployments',
        description: 'List all dedicated model deployments in the Fireworks AI account with status and GPU configuration',
        inputSchema: {
          type: 'object',
          properties: {
            page_size: {
              type: 'number',
              description: 'Number of deployments per page (default: 20)',
            },
            page_token: {
              type: 'string',
              description: 'Pagination token from a previous response',
            },
          },
        },
      },
      {
        name: 'get_deployment',
        description: 'Get details for a specific Fireworks AI dedicated deployment by deployment ID',
        inputSchema: {
          type: 'object',
          properties: {
            deployment_id: {
              type: 'string',
              description: 'Deployment ID to retrieve',
            },
          },
          required: ['deployment_id'],
        },
      },
      {
        name: 'list_fine_tuning_jobs',
        description: 'List all fine-tuning jobs in the Fireworks AI account with training status and metrics',
        inputSchema: {
          type: 'object',
          properties: {
            page_size: {
              type: 'number',
              description: 'Number of jobs per page (default: 20)',
            },
            page_token: {
              type: 'string',
              description: 'Pagination token from a previous response',
            },
            status: {
              type: 'string',
              description: 'Filter by status: PENDING, RUNNING, COMPLETED, FAILED (default: all)',
            },
          },
        },
      },
      {
        name: 'create_fine_tuning_job',
        description: 'Create a Supervised Fine-Tuning (SFT) job on Fireworks AI with a training dataset and base model',
        inputSchema: {
          type: 'object',
          properties: {
            base_model: {
              type: 'string',
              description: 'Base model to fine-tune (e.g. accounts/fireworks/models/llama-v3p1-8b-instruct)',
            },
            dataset_id: {
              type: 'string',
              description: 'Dataset ID from upload_dataset to use for training',
            },
            output_model_id: {
              type: 'string',
              description: 'Name for the resulting fine-tuned model (must be unique in your account)',
            },
            epochs: {
              type: 'number',
              description: 'Number of training epochs (default: 1)',
            },
            learning_rate: {
              type: 'number',
              description: 'Learning rate for training (default: model-specific; typically 1e-5 to 5e-4)',
            },
            lora_rank: {
              type: 'number',
              description: 'LoRA rank for parameter-efficient fine-tuning (default: 8; 0 = full fine-tune)',
            },
          },
          required: ['base_model', 'dataset_id', 'output_model_id'],
        },
      },
      {
        name: 'get_fine_tuning_job',
        description: 'Get the status, progress, and metrics for a specific Fireworks AI fine-tuning job',
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
        name: 'cancel_fine_tuning_job',
        description: 'Cancel a running or pending Fireworks AI fine-tuning job',
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
        name: 'list_datasets',
        description: 'List all uploaded datasets in the Fireworks AI account for fine-tuning',
        inputSchema: {
          type: 'object',
          properties: {
            page_size: {
              type: 'number',
              description: 'Number of datasets per page (default: 20)',
            },
            page_token: {
              type: 'string',
              description: 'Pagination token from a previous response',
            },
          },
        },
      },
      {
        name: 'upload_dataset',
        description: 'Upload a JSONL fine-tuning dataset to Fireworks AI for use in SFT or DPO training jobs',
        inputSchema: {
          type: 'object',
          properties: {
            dataset_id: {
              type: 'string',
              description: 'Name/ID for the new dataset (must be unique in your account)',
            },
            jsonl_content: {
              type: 'string',
              description: 'JSONL-formatted training data as a string — each line must be a valid JSON object with messages array',
            },
          },
          required: ['dataset_id', 'jsonl_content'],
        },
      },
      {
        name: 'create_image',
        description: 'Generate an image from a text prompt using a Fireworks AI image model via the workflow API (FLUX, SDXL, etc.)',
        inputSchema: {
          type: 'object',
          properties: {
            model: {
              type: 'string',
              description: 'Full model ID (e.g. accounts/fireworks/models/flux-1-schnell-fp8 or accounts/fireworks/models/stable-diffusion-xl-1024-v1-0)',
            },
            prompt: {
              type: 'string',
              description: 'Text prompt describing the image to generate',
            },
            negative_prompt: {
              type: 'string',
              description: 'Text describing what to avoid in the generated image (optional)',
            },
            aspect_ratio: {
              type: 'string',
              description: 'Aspect ratio for FLUX models: 1:1, 16:9, 4:3, 3:2, etc. (default: 1:1)',
            },
            guidance_scale: {
              type: 'number',
              description: 'Classifier-free guidance scale (default: 3.5 for FLUX; 7.0 for SDXL)',
            },
            num_inference_steps: {
              type: 'number',
              description: 'Number of denoising steps (default: 4 for FLUX schnell; 30 for SDXL)',
            },
            seed: {
              type: 'number',
              description: 'Random seed for reproducible outputs — 0 for random (optional)',
            },
          },
          required: ['model', 'prompt'],
        },
      },
      {
        name: 'list_accounts',
        description: 'List Fireworks AI accounts accessible to the current API key',
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
        case 'chat_completion':
          return this.chatCompletion(args);
        case 'text_completion':
          return this.textCompletion(args);
        case 'create_embedding':
          return this.createEmbedding(args);
        case 'list_models':
          return this.listModels(args);
        case 'get_model':
          return this.getModel(args);
        case 'list_deployments':
          return this.listDeployments(args);
        case 'get_deployment':
          return this.getDeployment(args);
        case 'list_fine_tuning_jobs':
          return this.listFineTuningJobs(args);
        case 'create_fine_tuning_job':
          return this.createFineTuningJob(args);
        case 'get_fine_tuning_job':
          return this.getFineTuningJob(args);
        case 'cancel_fine_tuning_job':
          return this.cancelFineTuningJob(args);
        case 'list_datasets':
          return this.listDatasets(args);
        case 'upload_dataset':
          return this.uploadDataset(args);
        case 'create_image':
          return this.createImage(args);
        case 'list_accounts':
          return this.listAccounts();
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
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  private async fwPost(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: response.statusText }));
      return { content: [{ type: 'text', text: `API error: ${response.status} ${JSON.stringify(err)}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  // Account-level API uses a different base path
  private get accountBase(): string {
    // Strip /inference/v1 suffix for account management endpoints
    return this.baseUrl.replace('/inference/v1', '');
  }

  private async fwAccountGet(path: string, params?: Record<string, string>): Promise<ToolResult> {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    const response = await this.fetchWithRetry(`${this.accountBase}${path}${qs}`, { headers: this.headers });
    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: response.statusText }));
      return { content: [{ type: 'text', text: `API error: ${response.status} ${JSON.stringify(err)}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async fwAccountPost(path: string, body: unknown): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.accountBase}${path}`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: response.statusText }));
      return { content: [{ type: 'text', text: `API error: ${response.status} ${JSON.stringify(err)}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async chatCompletion(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.model || !args.messages) return { content: [{ type: 'text', text: 'model and messages are required' }], isError: true };
    const body: Record<string, unknown> = {
      model: args.model,
      messages: args.messages,
      stream: false,  // adapter always returns non-streaming
    };
    if (args.max_tokens) body.max_tokens = args.max_tokens;
    if (args.temperature !== undefined) body.temperature = args.temperature;
    if (args.top_p !== undefined) body.top_p = args.top_p;
    if (args.top_k !== undefined) body.top_k = args.top_k;
    if (args.frequency_penalty !== undefined) body.frequency_penalty = args.frequency_penalty;
    if (args.presence_penalty !== undefined) body.presence_penalty = args.presence_penalty;
    if (args.response_format) body.response_format = args.response_format;
    if (args.tools) body.tools = args.tools;
    if (args.tool_choice) body.tool_choice = args.tool_choice;
    if (args.n) body.n = args.n;
    return this.fwPost('/chat/completions', body);
  }

  private async textCompletion(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.model || !args.prompt) return { content: [{ type: 'text', text: 'model and prompt are required' }], isError: true };
    const body: Record<string, unknown> = { model: args.model, prompt: args.prompt, stream: false };
    if (args.max_tokens) body.max_tokens = args.max_tokens;
    if (args.temperature !== undefined) body.temperature = args.temperature;
    if (args.top_p !== undefined) body.top_p = args.top_p;
    if (args.stop) body.stop = args.stop;
    if (typeof args.echo === 'boolean') body.echo = args.echo;
    return this.fwPost('/completions', body);
  }

  private async createEmbedding(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.model || !args.input) return { content: [{ type: 'text', text: 'model and input are required' }], isError: true };
    const body: Record<string, unknown> = { model: args.model, input: args.input };
    if (args.encoding_format) body.encoding_format = args.encoding_format;
    return this.fwPost('/embeddings', body);
  }

  private async listModels(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = { pageSize: '100' };
    if (args.page_token) params.pageToken = args.page_token as string;
    if (args.filter) params.filter = args.filter as string;
    return this.fwAccountGet(`/v1/accounts/${this.accountId}/models`, params);
  }

  private async getModel(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.model_id) return { content: [{ type: 'text', text: 'model_id is required' }], isError: true };
    return this.fwAccountGet(`/v1/accounts/${this.accountId}/models/${encodeURIComponent(args.model_id as string)}`);
  }

  private async listDeployments(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = { pageSize: String((args.page_size as number) || 20) };
    if (args.page_token) params.pageToken = args.page_token as string;
    return this.fwAccountGet(`/v1/accounts/${this.accountId}/deployments`, params);
  }

  private async getDeployment(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.deployment_id) return { content: [{ type: 'text', text: 'deployment_id is required' }], isError: true };
    return this.fwAccountGet(`/v1/accounts/${this.accountId}/deployments/${encodeURIComponent(args.deployment_id as string)}`);
  }

  private async listFineTuningJobs(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = { pageSize: String((args.page_size as number) || 20) };
    if (args.page_token) params.pageToken = args.page_token as string;
    if (args.status) params.filter = `status=${encodeURIComponent(args.status as string)}`;
    return this.fwAccountGet(`/v1/accounts/${this.accountId}/supervisedFineTuningJobs`, params);
  }

  private async createFineTuningJob(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.base_model || !args.dataset_id || !args.output_model_id) {
      return { content: [{ type: 'text', text: 'base_model, dataset_id, and output_model_id are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      baseModel: args.base_model,
      dataset: `accounts/${this.accountId}/datasets/${encodeURIComponent(args.dataset_id as string)}`,
      outputModel: args.output_model_id,
      epochs: args.epochs || 1,
    };
    if (args.learning_rate) body.learningRate = args.learning_rate;
    if (args.lora_rank !== undefined) body.loraRank = args.lora_rank;
    return this.fwAccountPost(`/v1/accounts/${this.accountId}/supervisedFineTuningJobs`, body);
  }

  private async getFineTuningJob(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.job_id) return { content: [{ type: 'text', text: 'job_id is required' }], isError: true };
    return this.fwAccountGet(`/v1/accounts/${this.accountId}/supervisedFineTuningJobs/${encodeURIComponent(args.job_id as string)}`);
  }

  private async cancelFineTuningJob(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.job_id) return { content: [{ type: 'text', text: 'job_id is required' }], isError: true };
    return this.fwAccountPost(`/v1/accounts/${this.accountId}/supervisedFineTuningJobs/${encodeURIComponent(args.job_id as string)}:cancel`, {});
  }

  private async listDatasets(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = { pageSize: String((args.page_size as number) || 20) };
    if (args.page_token) params.pageToken = args.page_token as string;
    return this.fwAccountGet(`/v1/accounts/${this.accountId}/datasets`, params);
  }

  private async uploadDataset(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.dataset_id || !args.jsonl_content) return { content: [{ type: 'text', text: 'dataset_id and jsonl_content are required' }], isError: true };
    // Fireworks upload uses multipart form-data; we POST JSON metadata first then upload
    const body = {
      datasetId: args.dataset_id,
      kind: 'instruct-pairs',
    };
    // Step 1: Create dataset
    const createResult = await this.fwAccountPost(`/v1/accounts/${this.accountId}/datasets`, body);
    if (createResult.isError) return createResult;
    // Step 2: Upload JSONL content via multipart
    const formData = new FormData();
    formData.append('file', new Blob([args.jsonl_content as string], { type: 'application/jsonl' }), 'train.jsonl');
    const response = await this.fetchWithRetry(`${this.accountBase}/v1/accounts/${this.accountId}/datasets/${encodeURIComponent(args.dataset_id as string)}:upload`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${this.apiKey}` },
      body: formData,
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Upload error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async createImage(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.model || !args.prompt) return { content: [{ type: 'text', text: 'model and prompt are required' }], isError: true };
    // Extract short model name from full model ID (e.g. accounts/fireworks/models/flux-1-schnell-fp8 → flux-1-schnell-fp8)
    const modelShortName = (args.model as string).split('/').pop() ?? (args.model as string);
    const body: Record<string, unknown> = {
      prompt: args.prompt,
    };
    if (args.negative_prompt) body.negative_prompt = args.negative_prompt;
    if (args.aspect_ratio) body.aspect_ratio = args.aspect_ratio;
    if (args.guidance_scale !== undefined) body.guidance_scale = args.guidance_scale;
    if (args.num_inference_steps !== undefined) body.num_inference_steps = args.num_inference_steps;
    if (args.seed !== undefined) body.seed = args.seed;
    return this.fwPost(`/workflows/accounts/fireworks/models/${encodeURIComponent(modelShortName)}/text_to_image`, body);
  }

  private async listAccounts(): Promise<ToolResult> {
    return this.fwAccountGet('/v1/accounts');
  }
}

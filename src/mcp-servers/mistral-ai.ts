/**
 * Mistral AI MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// Mistral AI supports MCP as a client (Le Chat and their SDK can connect to MCP servers),
// but Mistral publishes NO official MCP server of their own for external tools to call.
// Community servers exist (everaldo/mcp-mistral-ocr, bsmi021/mcp-mistral-codestral) but
// cover single narrow features only and are unmaintained. Decision: use-rest-api.
// Our adapter covers: 22 tools. Vendor MCP covers: 0 tools.
// Recommendation: REST adapter is the only viable integration for full Mistral API coverage.
//
// Base URL: https://api.mistral.ai/v1
// Auth: Bearer token (API key from console.mistral.ai)
// Docs: https://docs.mistral.ai/api
// Rate limits: Varies by model tier and plan; see https://docs.mistral.ai/deployment/laplateforme/tier/

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface MistralConfig {
  apiKey: string;
  baseUrl?: string;
}

export class MistralAIMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: MistralConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.mistral.ai/v1';
  }

  static catalog() {
    return {
      name: 'mistral-ai',
      displayName: 'Mistral AI',
      version: '1.0.0',
      category: 'ai-ml' as const,
      keywords: [
        'mistral', 'llm', 'chat', 'completion', 'embeddings', 'codestral',
        'fim', 'fill-in-the-middle', 'fine-tuning', 'batch', 'agents',
        'moderation', 'ocr', 'audio', 'transcription', 'generative-ai',
      ],
      toolNames: [
        'chat_completions', 'embeddings', 'fim_completions', 'list_models', 'get_model',
        'delete_model', 'moderations', 'upload_file', 'list_files', 'get_file',
        'delete_file', 'create_fine_tuning_job', 'list_fine_tuning_jobs',
        'get_fine_tuning_job', 'cancel_fine_tuning_job', 'create_batch_job',
        'list_batch_jobs', 'get_batch_job', 'cancel_batch_job',
        'create_agent_completion', 'ocr', 'audio_transcription',
      ],
      description: 'Mistral AI: chat completions, embeddings, FIM code completion, fine-tuning, batch inference, agents, OCR, audio transcription, and content moderation.',
      author: 'protectnil' as const,
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'chat_completions',
        description: 'Generate a chat completion using a Mistral model. Supports multi-turn conversation, function calling, JSON mode, and streaming.',
        inputSchema: {
          type: 'object',
          properties: {
            model: {
              type: 'string',
              description: 'Mistral model ID (e.g. mistral-large-latest, mistral-small-latest, open-mistral-nemo, codestral-latest)',
            },
            messages: {
              type: 'array',
              description: 'Array of message objects with role (system|user|assistant|tool) and content fields.',
              items: { type: 'object' },
            },
            temperature: {
              type: 'number',
              description: 'Sampling temperature 0–1 (default: 0.7). Higher = more random.',
            },
            max_tokens: {
              type: 'number',
              description: 'Maximum number of tokens to generate. Prompt + max_tokens must not exceed context length.',
            },
            top_p: {
              type: 'number',
              description: 'Top-p nucleus sampling value (0–1, default: 1)',
            },
            stop: {
              type: 'array',
              description: 'Array of stop sequences that halt generation when produced.',
              items: { type: 'string' },
            },
            random_seed: {
              type: 'number',
              description: 'Integer seed for deterministic outputs.',
            },
            response_format: {
              type: 'object',
              description: 'Response format control. Use { "type": "json_object" } to enable JSON mode.',
            },
            tools: {
              type: 'array',
              description: 'Array of tool definitions for function calling.',
              items: { type: 'object' },
            },
            tool_choice: {
              type: 'string',
              description: 'Tool choice behavior: auto (default), any, none, or a specific tool name string.',
            },
            presence_penalty: {
              type: 'number',
              description: 'Penalizes tokens already present to encourage new topics (-2.0 to 2.0, default: 0)',
            },
            frequency_penalty: {
              type: 'number',
              description: 'Penalizes tokens based on frequency to reduce repetition (-2.0 to 2.0, default: 0)',
            },
            n: {
              type: 'number',
              description: 'Number of completion choices to generate (default: 1)',
            },
            safe_prompt: {
              type: 'boolean',
              description: 'Inject a safety system prompt before all conversations (default: false)',
            },
          },
          required: ['model', 'messages'],
        },
      },
      {
        name: 'embeddings',
        description: 'Generate dense vector embeddings for text using the Mistral Embed model. Supports batch inputs.',
        inputSchema: {
          type: 'object',
          properties: {
            model: {
              type: 'string',
              description: 'Embedding model ID (e.g. mistral-embed)',
            },
            inputs: {
              type: 'array',
              description: 'Array of strings to embed. Each string is embedded independently.',
              items: { type: 'string' },
            },
            encoding_format: {
              type: 'string',
              description: 'Output format: float (default) or base64',
            },
          },
          required: ['model', 'inputs'],
        },
      },
      {
        name: 'fim_completions',
        description: 'Fill-in-the-middle code completion using Codestral. Provide prefix (before cursor) and optional suffix (after cursor).',
        inputSchema: {
          type: 'object',
          properties: {
            model: {
              type: 'string',
              description: 'FIM-capable model ID (e.g. codestral-latest)',
            },
            prompt: {
              type: 'string',
              description: 'Code prefix — the content before the cursor position.',
            },
            suffix: {
              type: 'string',
              description: 'Code suffix — the content after the cursor position (optional).',
            },
            temperature: {
              type: 'number',
              description: 'Sampling temperature 0–1 (default: 0)',
            },
            max_tokens: {
              type: 'number',
              description: 'Maximum number of tokens to generate.',
            },
            stop: {
              type: 'array',
              description: 'Stop sequences to halt generation.',
              items: { type: 'string' },
            },
            min_tokens: {
              type: 'number',
              description: 'Minimum number of tokens to generate before stop sequences are applied.',
            },
          },
          required: ['model', 'prompt'],
        },
      },
      {
        name: 'list_models',
        description: 'List all Mistral AI models available to the configured API key, including base and fine-tuned models.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_model',
        description: 'Get capabilities, context length, and ownership details for a specific Mistral AI model.',
        inputSchema: {
          type: 'object',
          properties: {
            model_id: {
              type: 'string',
              description: 'Model ID (e.g. mistral-large-latest, or a fine-tuned model UUID)',
            },
          },
          required: ['model_id'],
        },
      },
      {
        name: 'delete_model',
        description: 'Delete a fine-tuned Mistral AI model. Only fine-tuned models can be deleted; base models cannot.',
        inputSchema: {
          type: 'object',
          properties: {
            model_id: {
              type: 'string',
              description: 'UUID of the fine-tuned model to delete.',
            },
          },
          required: ['model_id'],
        },
      },
      {
        name: 'moderations',
        description: 'Run content moderation on text using the Mistral moderation model. Returns category scores and a flagged boolean.',
        inputSchema: {
          type: 'object',
          properties: {
            model: {
              type: 'string',
              description: 'Moderation model ID (e.g. mistral-moderation-latest)',
            },
            inputs: {
              type: 'array',
              description: 'Array of strings to moderate. Each string is scored independently.',
              items: { type: 'string' },
            },
          },
          required: ['model', 'inputs'],
        },
      },
      {
        name: 'upload_file',
        description: 'Upload a file to Mistral for use in fine-tuning or batch inference. Returns a file object with an ID.',
        inputSchema: {
          type: 'object',
          properties: {
            filename: {
              type: 'string',
              description: 'Name of the file (e.g. training_data.jsonl)',
            },
            content: {
              type: 'string',
              description: 'File content as a string (JSONL for fine-tuning/batch, or document for OCR).',
            },
            purpose: {
              type: 'string',
              description: 'File purpose: fine-tune, batch, or ocr (default: fine-tune)',
            },
          },
          required: ['filename', 'content'],
        },
      },
      {
        name: 'list_files',
        description: 'List all files uploaded to the Mistral platform for the configured API key.',
        inputSchema: {
          type: 'object',
          properties: {
            purpose: {
              type: 'string',
              description: 'Filter by file purpose: fine-tune, batch, or ocr (optional)',
            },
          },
        },
      },
      {
        name: 'get_file',
        description: 'Get metadata for a specific uploaded file by its file ID.',
        inputSchema: {
          type: 'object',
          properties: {
            file_id: {
              type: 'string',
              description: 'File ID returned from upload_file',
            },
          },
          required: ['file_id'],
        },
      },
      {
        name: 'delete_file',
        description: 'Delete a previously uploaded file from the Mistral platform by file ID.',
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
      {
        name: 'create_fine_tuning_job',
        description: 'Create a fine-tuning job to train a custom model on your data. Requires training file IDs uploaded via upload_file.',
        inputSchema: {
          type: 'object',
          properties: {
            model: {
              type: 'string',
              description: 'Base model ID to fine-tune (e.g. open-mistral-7b)',
            },
            training_files: {
              type: 'array',
              description: 'Array of training file IDs (uploaded with purpose: fine-tune).',
              items: { type: 'string' },
            },
            validation_files: {
              type: 'array',
              description: 'Optional array of validation file IDs.',
              items: { type: 'string' },
            },
            suffix: {
              type: 'string',
              description: 'Optional suffix to append to the fine-tuned model name (max 18 chars).',
            },
            hyperparameters: {
              type: 'object',
              description: 'Optional training hyperparameters: training_steps (int), learning_rate (float), warmup_fraction (float), epochs (float), fim_ratio (float), seq_len (int).',
            },
            auto_start: {
              type: 'boolean',
              description: 'Start training immediately after job creation (default: false). If false, start manually via get_fine_tuning_job.',
            },
          },
          required: ['model', 'training_files'],
        },
      },
      {
        name: 'list_fine_tuning_jobs',
        description: 'List all fine-tuning jobs for the configured API key, with optional status and pagination filters.',
        inputSchema: {
          type: 'object',
          properties: {
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 0)',
            },
            page_size: {
              type: 'number',
              description: 'Results per page (default: 100)',
            },
            model: {
              type: 'string',
              description: 'Filter by base model ID (optional)',
            },
            status: {
              type: 'string',
              description: 'Filter by job status: QUEUED, STARTED, VALIDATING, VALIDATED, RUNNING, FAILED_VALIDATION, FAILED, SUCCESS, CANCELLED, CANCELLATION_REQUESTED (optional)',
            },
          },
        },
      },
      {
        name: 'get_fine_tuning_job',
        description: 'Get status, metrics, and output model ID for a specific fine-tuning job.',
        inputSchema: {
          type: 'object',
          properties: {
            job_id: {
              type: 'string',
              description: 'Fine-tuning job ID (UUID)',
            },
          },
          required: ['job_id'],
        },
      },
      {
        name: 'cancel_fine_tuning_job',
        description: 'Cancel a running or queued fine-tuning job. The job must be in RUNNING or QUEUED status.',
        inputSchema: {
          type: 'object',
          properties: {
            job_id: {
              type: 'string',
              description: 'Fine-tuning job ID to cancel (UUID)',
            },
          },
          required: ['job_id'],
        },
      },
      {
        name: 'create_batch_job',
        description: 'Submit a batch inference job for asynchronous processing of many requests at lower cost. Input file must be JSONL with "custom_id" and "body" fields.',
        inputSchema: {
          type: 'object',
          properties: {
            input_files: {
              type: 'array',
              description: 'Array of file IDs (uploaded with purpose: batch) containing JSONL requests.',
              items: { type: 'string' },
            },
            endpoint: {
              type: 'string',
              description: 'Target endpoint for all batch requests: /v1/chat/completions, /v1/embeddings, /v1/fim/completions, /v1/moderations, or /v1/ocr (default: /v1/chat/completions)',
            },
            model: {
              type: 'string',
              description: 'Model to use for all requests in the batch.',
            },
            metadata: {
              type: 'object',
              description: 'Optional key-value metadata to attach to the job.',
            },
            timeout_hours: {
              type: 'number',
              description: 'Job timeout in hours (default: 24, max: 168)',
            },
          },
          required: ['input_files', 'model'],
        },
      },
      {
        name: 'list_batch_jobs',
        description: 'List batch inference jobs with optional status and pagination filters.',
        inputSchema: {
          type: 'object',
          properties: {
            page: {
              type: 'number',
              description: 'Page number (default: 0)',
            },
            page_size: {
              type: 'number',
              description: 'Results per page (default: 100)',
            },
            status: {
              type: 'string',
              description: 'Filter by job status: QUEUED, RUNNING, SUCCESS, FAILED, TIMEOUT_EXCEEDED, CANCELLATION_REQUESTED, CANCELLED (optional)',
            },
            model: {
              type: 'string',
              description: 'Filter by model ID (optional)',
            },
          },
        },
      },
      {
        name: 'get_batch_job',
        description: 'Get status, progress, and output file ID for a specific batch inference job.',
        inputSchema: {
          type: 'object',
          properties: {
            job_id: {
              type: 'string',
              description: 'Batch job ID (UUID)',
            },
          },
          required: ['job_id'],
        },
      },
      {
        name: 'cancel_batch_job',
        description: 'Cancel a pending or running batch inference job.',
        inputSchema: {
          type: 'object',
          properties: {
            job_id: {
              type: 'string',
              description: 'Batch job ID to cancel (UUID)',
            },
          },
          required: ['job_id'],
        },
      },
      {
        name: 'create_agent_completion',
        description: 'Run a completion using a pre-configured Mistral Agent by agent ID. The agent defines its own system prompt, tools, and model.',
        inputSchema: {
          type: 'object',
          properties: {
            agent_id: {
              type: 'string',
              description: 'Agent ID from the Mistral console (starts with "ag:")',
            },
            messages: {
              type: 'array',
              description: 'Array of message objects with role (user|assistant|tool) and content.',
              items: { type: 'object' },
            },
            max_tokens: {
              type: 'number',
              description: 'Maximum tokens to generate (optional)',
            },
            temperature: {
              type: 'number',
              description: 'Sampling temperature override 0–1 (optional, agent default used if omitted)',
            },
            random_seed: {
              type: 'number',
              description: 'Random seed for reproducible outputs (optional)',
            },
          },
          required: ['agent_id', 'messages'],
        },
      },
      {
        name: 'ocr',
        description: 'Extract text and structured content from PDF documents or images using Mistral OCR (pixtral-ocr-2503 model).',
        inputSchema: {
          type: 'object',
          properties: {
            model: {
              type: 'string',
              description: 'OCR model ID (e.g. pixtral-ocr-2503)',
            },
            document: {
              type: 'object',
              description: 'Document to process. For URL: { "type": "document_url", "document_url": "https://..." }. For uploaded file: { "type": "document_id", "document_id": "file-uuid" }.',
            },
            pages: {
              type: 'array',
              description: 'Optional list of zero-indexed page numbers to process (omit to process all pages).',
              items: { type: 'number' },
            },
            include_image_base64: {
              type: 'boolean',
              description: 'Include base64-encoded images for each page in the response (default: false)',
            },
            image_limit: {
              type: 'number',
              description: 'Maximum number of images to extract per page (optional)',
            },
            image_min_size: {
              type: 'number',
              description: 'Minimum image dimension in pixels to include (optional)',
            },
          },
          required: ['model', 'document'],
        },
      },
      {
        name: 'audio_transcription',
        description: 'Transcribe audio files to text using Mistral audio models. Supports MP3, MP4, WAV, M4A, and other common formats.',
        inputSchema: {
          type: 'object',
          properties: {
            model: {
              type: 'string',
              description: 'Audio model ID (e.g. voxtral-mini-2507)',
            },
            file_id: {
              type: 'string',
              description: 'File ID of an audio file uploaded via upload_file with purpose: audio',
            },
            language: {
              type: 'string',
              description: 'ISO 639-1 language code hint (e.g. en, fr, de). Improves accuracy when language is known.',
            },
          },
          required: ['model', 'file_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'chat_completions':
          return await this.chatCompletions(args);
        case 'embeddings':
          return await this.embeddings(args);
        case 'fim_completions':
          return await this.fimCompletions(args);
        case 'list_models':
          return await this.listModels();
        case 'get_model':
          return await this.getModel(args);
        case 'delete_model':
          return await this.deleteModel(args);
        case 'moderations':
          return await this.moderations(args);
        case 'upload_file':
          return await this.uploadFile(args);
        case 'list_files':
          return await this.listFiles(args);
        case 'get_file':
          return await this.getFile(args);
        case 'delete_file':
          return await this.deleteFile(args);
        case 'create_fine_tuning_job':
          return await this.createFineTuningJob(args);
        case 'list_fine_tuning_jobs':
          return await this.listFineTuningJobs(args);
        case 'get_fine_tuning_job':
          return await this.getFineTuningJob(args);
        case 'cancel_fine_tuning_job':
          return await this.cancelFineTuningJob(args);
        case 'create_batch_job':
          return await this.createBatchJob(args);
        case 'list_batch_jobs':
          return await this.listBatchJobs(args);
        case 'get_batch_job':
          return await this.getBatchJob(args);
        case 'cancel_batch_job':
          return await this.cancelBatchJob(args);
        case 'create_agent_completion':
          return await this.createAgentCompletion(args);
        case 'ocr':
          return await this.ocr(args);
        case 'audio_transcription':
          return await this.audioTranscription(args);
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

  private async doGet(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, { method: 'GET', headers: this.headers });
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `API error ${response.status}: ${errText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async doPost(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `API error ${response.status}: ${errText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async doDelete(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, { method: 'DELETE', headers: this.headers });
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `API error ${response.status}: ${errText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async chatCompletions(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {
      model: args.model,
      messages: args.messages,
    };
    if (typeof args.temperature === 'number') body.temperature = args.temperature;
    if (args.max_tokens) body.max_tokens = args.max_tokens;
    if (typeof args.top_p === 'number') body.top_p = args.top_p;
    if (args.stop) body.stop = args.stop;
    if (typeof args.random_seed === 'number') body.random_seed = args.random_seed;
    if (args.response_format) body.response_format = args.response_format;
    if (args.tools) body.tools = args.tools;
    if (args.tool_choice) body.tool_choice = args.tool_choice;
    if (typeof args.presence_penalty === 'number') body.presence_penalty = args.presence_penalty;
    if (typeof args.frequency_penalty === 'number') body.frequency_penalty = args.frequency_penalty;
    if (typeof args.n === 'number') body.n = args.n;
    if (typeof args.safe_prompt === 'boolean') body.safe_prompt = args.safe_prompt;
    return this.doPost('/chat/completions', body);
  }

  private async embeddings(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = { model: args.model, inputs: args.inputs };
    if (args.encoding_format) body.encoding_format = args.encoding_format;
    return this.doPost('/embeddings', body);
  }

  private async fimCompletions(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = { model: args.model, prompt: args.prompt };
    if (args.suffix) body.suffix = args.suffix;
    if (typeof args.temperature === 'number') body.temperature = args.temperature;
    if (args.max_tokens) body.max_tokens = args.max_tokens;
    if (args.stop) body.stop = args.stop;
    if (args.min_tokens) body.min_tokens = args.min_tokens;
    return this.doPost('/fim/completions', body);
  }

  private async listModels(): Promise<ToolResult> {
    return this.doGet('/models');
  }

  private async getModel(args: Record<string, unknown>): Promise<ToolResult> {
    const modelId = args.model_id as string;
    if (!modelId) return { content: [{ type: 'text', text: 'model_id is required' }], isError: true };
    return this.doGet(`/models/${encodeURIComponent(modelId)}`);
  }

  private async deleteModel(args: Record<string, unknown>): Promise<ToolResult> {
    const modelId = args.model_id as string;
    if (!modelId) return { content: [{ type: 'text', text: 'model_id is required' }], isError: true };
    return this.doDelete(`/models/${encodeURIComponent(modelId)}`);
  }

  private async moderations(args: Record<string, unknown>): Promise<ToolResult> {
    return this.doPost('/moderations', { model: args.model, inputs: args.inputs });
  }

  private async uploadFile(args: Record<string, unknown>): Promise<ToolResult> {
    const filename = args.filename as string;
    const content = args.content as string;
    const purpose = (args.purpose as string) ?? 'fine-tune';
    if (!filename || !content) {
      return { content: [{ type: 'text', text: 'filename and content are required' }], isError: true };
    }
    // Multipart upload — build manually without npm dependencies
    const boundary = `----MistralBoundary${Date.now()}`;
    const CRLF = '\r\n';
    const body =
      `--${boundary}${CRLF}` +
      `Content-Disposition: form-data; name="purpose"${CRLF}${CRLF}` +
      `${purpose}${CRLF}` +
      `--${boundary}${CRLF}` +
      `Content-Disposition: form-data; name="file"; filename="${filename}"${CRLF}` +
      `Content-Type: application/octet-stream${CRLF}${CRLF}` +
      `${content}${CRLF}` +
      `--${boundary}--${CRLF}`;

    const response = await this.fetchWithRetry(`${this.baseUrl}/files`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
      },
      body,
    });
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `File upload error ${response.status}: ${errText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async listFiles(args: Record<string, unknown>): Promise<ToolResult> {
    const qs = args.purpose ? `?purpose=${encodeURIComponent(args.purpose as string)}` : '';
    return this.doGet(`/files${qs}`);
  }

  private async getFile(args: Record<string, unknown>): Promise<ToolResult> {
    const fileId = args.file_id as string;
    if (!fileId) return { content: [{ type: 'text', text: 'file_id is required' }], isError: true };
    return this.doGet(`/files/${encodeURIComponent(fileId)}`);
  }

  private async deleteFile(args: Record<string, unknown>): Promise<ToolResult> {
    const fileId = args.file_id as string;
    if (!fileId) return { content: [{ type: 'text', text: 'file_id is required' }], isError: true };
    return this.doDelete(`/files/${encodeURIComponent(fileId)}`);
  }

  private async createFineTuningJob(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {
      model: args.model,
      training_files: (args.training_files as string[]).map((id) => ({ file_id: id })),
    };
    if (args.validation_files) {
      body.validation_files = (args.validation_files as string[]).map((id) => ({ file_id: id }));
    }
    if (args.suffix) body.suffix = args.suffix;
    if (args.hyperparameters) body.hyperparameters = args.hyperparameters;
    if (typeof args.auto_start === 'boolean') body.auto_start = args.auto_start;
    return this.doPost('/fine_tuning/jobs', body);
  }

  private async listFineTuningJobs(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.page !== undefined) params.set('page', String(args.page));
    if (args.page_size !== undefined) params.set('page_size', String(args.page_size));
    if (args.model) params.set('model', args.model as string);
    if (args.status) params.set('status', args.status as string);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.doGet(`/fine_tuning/jobs${qs}`);
  }

  private async getFineTuningJob(args: Record<string, unknown>): Promise<ToolResult> {
    const jobId = args.job_id as string;
    if (!jobId) return { content: [{ type: 'text', text: 'job_id is required' }], isError: true };
    return this.doGet(`/fine_tuning/jobs/${encodeURIComponent(jobId)}`);
  }

  private async cancelFineTuningJob(args: Record<string, unknown>): Promise<ToolResult> {
    const jobId = args.job_id as string;
    if (!jobId) return { content: [{ type: 'text', text: 'job_id is required' }], isError: true };
    return this.doPost(`/fine_tuning/jobs/${encodeURIComponent(jobId)}/cancel`, {});
  }

  private async createBatchJob(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {
      input_files: args.input_files,
      model: args.model,
      endpoint: (args.endpoint as string) ?? '/v1/chat/completions',
    };
    if (args.metadata) body.metadata = args.metadata;
    if (args.timeout_hours) body.timeout_hours = args.timeout_hours;
    return this.doPost('/batch/jobs', body);
  }

  private async listBatchJobs(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.page !== undefined) params.set('page', String(args.page));
    if (args.page_size !== undefined) params.set('page_size', String(args.page_size));
    if (args.status) params.set('status', args.status as string);
    if (args.model) params.set('model', args.model as string);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.doGet(`/batch/jobs${qs}`);
  }

  private async getBatchJob(args: Record<string, unknown>): Promise<ToolResult> {
    const jobId = args.job_id as string;
    if (!jobId) return { content: [{ type: 'text', text: 'job_id is required' }], isError: true };
    return this.doGet(`/batch/jobs/${encodeURIComponent(jobId)}`);
  }

  private async cancelBatchJob(args: Record<string, unknown>): Promise<ToolResult> {
    const jobId = args.job_id as string;
    if (!jobId) return { content: [{ type: 'text', text: 'job_id is required' }], isError: true };
    return this.doPost(`/batch/jobs/${encodeURIComponent(jobId)}/cancel`, {});
  }

  private async createAgentCompletion(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {
      agent_id: args.agent_id,
      messages: args.messages,
    };
    if (args.max_tokens) body.max_tokens = args.max_tokens;
    if (typeof args.temperature === 'number') body.temperature = args.temperature;
    if (typeof args.random_seed === 'number') body.random_seed = args.random_seed;
    return this.doPost('/agents/completions', body);
  }

  private async ocr(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = { model: args.model, document: args.document };
    if (args.pages) body.pages = args.pages;
    if (typeof args.include_image_base64 === 'boolean') body.include_image_base64 = args.include_image_base64;
    if (args.image_limit) body.image_limit = args.image_limit;
    if (args.image_min_size) body.image_min_size = args.image_min_size;
    return this.doPost('/ocr', body);
  }

  private async audioTranscription(args: Record<string, unknown>): Promise<ToolResult> {
    const fileId = args.file_id as string;
    const model = args.model as string;
    if (!fileId || !model) {
      return { content: [{ type: 'text', text: 'model and file_id are required' }], isError: true };
    }
    // The /v1/audio/transcriptions endpoint accepts file_id (string) as a JSON-body alternative
    // to the multipart `file` field. Using file_id allows text/JSON requests without multipart.
    const body: Record<string, unknown> = { model, file_id: fileId };
    if (args.language) body.language = args.language;
    return this.doPost('/audio/transcriptions', body);
  }
}

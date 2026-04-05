/**
 * Groq MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/groq/groq-mcp-server — transport: stdio, auth: API key (GROQ_API_KEY)
// Last commit: April 15, 2025 (~11 months ago as of 2026-03-28). Fails active-maintenance criterion (>6 months).
// Our adapter covers: 9 tools. Vendor MCP covers: ~8 tools (TTS, STT, translate, vision x2, compound-beta, list_batches, list_voices, list_stt_models).
// Recommendation: use-rest-api. Vendor MCP is unmaintained since 2025-04 and partially overlaps our REST adapter.
//
// Base URL: https://api.groq.com/openai/v1
// Auth: Bearer token — Authorization: Bearer <GROQ_API_KEY>
//       Obtain your API key from console.groq.com → API Keys
// Docs: https://console.groq.com/docs/api-reference
// Rate limits: Vary by model and tier. Free tier: ~30 req/min for chat, ~20 req/min for audio.
//              On-demand tier: higher limits; Flex tier: ~10x rate limits. See console.groq.com/docs/rate-limits.
//              Batch API (async): up to 24-hour turnaround, 50% cost savings for non-realtime workloads.
//              Batch requires pre-uploaded files via POST /v1/files — input_file_id, not a URL.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface GroqConfig {
  apiKey: string;
  baseUrl?: string;
}

export class GroqMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: GroqConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.groq.com/openai/v1';
  }

  static catalog() {
    return {
      name: 'groq',
      displayName: 'Groq',
      version: '1.0.0',
      category: 'ai-ml',
      keywords: [
        'groq', 'llm', 'inference', 'fast', 'llama', 'mistral', 'whisper', 'audio',
        'transcription', 'chat', 'completions', 'models', 'groqcloud', 'batch',
      ],
      toolNames: [
        'chat_completion',
        'list_models',
        'get_model',
        'transcribe_audio',
        'translate_audio',
        'create_batch',
        'list_batches',
        'get_batch',
        'cancel_batch',
      ],
      description: 'Groq ultra-fast LLM inference: chat completions with Llama/Mistral models, Whisper audio transcription, and async batch processing.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'chat_completion',
        description: 'Generate a chat completion using a Groq-hosted model with optional temperature, streaming, and tool/function calling',
        inputSchema: {
          type: 'object',
          properties: {
            model: {
              type: 'string',
              description: 'Model ID to use (e.g. llama-3.3-70b-versatile, llama-3.1-8b-instant, mixtral-8x7b-32768, gemma2-9b-it)',
            },
            messages: {
              type: 'string',
              description: 'JSON array of message objects: [{"role":"system","content":"..."},{"role":"user","content":"..."}]',
            },
            temperature: {
              type: 'number',
              description: 'Sampling temperature between 0 and 2 (default: 1). Lower = more deterministic.',
            },
            max_tokens: {
              type: 'number',
              description: 'Maximum number of tokens to generate in the response (default: model max)',
            },
            top_p: {
              type: 'number',
              description: 'Nucleus sampling probability threshold (0 to 1, default: 1)',
            },
            stop: {
              type: 'string',
              description: 'Stop sequence(s) — comma-separated strings where generation will halt',
            },
            stream: {
              type: 'boolean',
              description: 'Whether to stream the response (default: false — streaming not supported in this adapter)',
            },
            response_format: {
              type: 'string',
              description: 'Response format type: text or json_object (use json_object to force JSON output)',
            },
            seed: {
              type: 'number',
              description: 'Seed for deterministic sampling. Same seed + prompt = same output.',
            },
            service_tier: {
              type: 'string',
              description: 'Service tier: on_demand (default), flex (higher throughput), or auto',
            },
          },
          required: ['model', 'messages'],
        },
      },
      {
        name: 'list_models',
        description: 'List all models currently available on GroqCloud including IDs, context windows, and ownership',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_model',
        description: 'Retrieve metadata for a specific Groq model by model ID including context window and capabilities',
        inputSchema: {
          type: 'object',
          properties: {
            model_id: {
              type: 'string',
              description: 'Model ID to retrieve (e.g. llama-3.3-70b-versatile)',
            },
          },
          required: ['model_id'],
        },
      },
      {
        name: 'transcribe_audio',
        description: 'Transcribe audio to text using Groq-hosted Whisper models. Accepts a public audio URL.',
        inputSchema: {
          type: 'object',
          properties: {
            audio_url: {
              type: 'string',
              description: 'Publicly accessible URL of the audio file (formats: flac, mp3, mp4, mpeg, mpga, m4a, ogg, wav, webm; max 25 MB)',
            },
            model: {
              type: 'string',
              description: 'Whisper model to use: whisper-large-v3 (best quality), whisper-large-v3-turbo (fast), distil-whisper-large-v3-en (English only, fastest)',
            },
            language: {
              type: 'string',
              description: 'ISO-639-1 language code of the audio (e.g. en, es, fr). Providing this improves accuracy and latency.',
            },
            prompt: {
              type: 'string',
              description: 'Optional text to guide the model style or provide context for the audio segment',
            },
            response_format: {
              type: 'string',
              description: 'Transcript output format: json (default), text, or verbose_json',
            },
            temperature: {
              type: 'number',
              description: 'Sampling temperature between 0 and 1 (default: 0)',
            },
          },
          required: ['audio_url'],
        },
      },
      {
        name: 'translate_audio',
        description: 'Transcribe audio and translate it to English using Groq Whisper. Input can be any supported language.',
        inputSchema: {
          type: 'object',
          properties: {
            audio_url: {
              type: 'string',
              description: 'Publicly accessible URL of the audio file (max 25 MB)',
            },
            model: {
              type: 'string',
              description: 'Whisper model to use: whisper-large-v3 (default) or whisper-large-v3-turbo',
            },
            prompt: {
              type: 'string',
              description: 'Optional context or style guidance for the transcription',
            },
            response_format: {
              type: 'string',
              description: 'Output format: json (default), text, or verbose_json',
            },
            temperature: {
              type: 'number',
              description: 'Sampling temperature between 0 and 1 (default: 0)',
            },
          },
          required: ['audio_url'],
        },
      },
      {
        name: 'create_batch',
        description: 'Submit an async batch of chat completion requests using a pre-uploaded JSONL file ID for up to 24-hour processing at 50% cost savings',
        inputSchema: {
          type: 'object',
          properties: {
            input_file_id: {
              type: 'string',
              description: 'ID of a file previously uploaded via POST /v1/files with purpose=batch (e.g. file_01jh6x76wtemjr74t1fh0faj5t)',
            },
            completion_window: {
              type: 'string',
              description: 'Maximum time window for batch processing: 24h (default and only supported value)',
            },
          },
          required: ['input_file_id'],
        },
      },
      {
        name: 'list_batches',
        description: 'List all batch jobs submitted to Groq with their status, request counts, and output file IDs',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of batches to return (default: 20)',
            },
            after: {
              type: 'string',
              description: 'Pagination cursor — batch ID to start listing after',
            },
          },
        },
      },
      {
        name: 'get_batch',
        description: 'Retrieve the status and metadata for a specific batch job by ID',
        inputSchema: {
          type: 'object',
          properties: {
            batch_id: {
              type: 'string',
              description: 'Batch job ID returned by create_batch',
            },
          },
          required: ['batch_id'],
        },
      },
      {
        name: 'cancel_batch',
        description: 'Cancel a pending or in-progress batch job by ID. Completed batches cannot be cancelled.',
        inputSchema: {
          type: 'object',
          properties: {
            batch_id: {
              type: 'string',
              description: 'Batch job ID to cancel',
            },
          },
          required: ['batch_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'chat_completion':
          return this.chatCompletion(args);
        case 'list_models':
          return this.listModels();
        case 'get_model':
          return this.getModel(args);
        case 'transcribe_audio':
          return this.transcribeAudio(args);
        case 'translate_audio':
          return this.translateAudio(args);
        case 'create_batch':
          return this.createBatch(args);
        case 'list_batches':
          return this.listBatches(args);
        case 'get_batch':
          return this.getBatch(args);
        case 'cancel_batch':
          return this.cancelBatch(args);
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

  private get authHeaders(): Record<string, string> {
    return {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  private async groqGet(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'GET',
      headers: this.authHeaders,
    });
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `API error: ${response.status} ${errText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async groqPost(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.authHeaders,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `API error: ${response.status} ${errText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async chatCompletion(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.model || !args.messages) {
      return { content: [{ type: 'text', text: 'model and messages are required' }], isError: true };
    }

    let messages: unknown;
    try {
      messages = typeof args.messages === 'string' ? JSON.parse(args.messages) : args.messages;
    } catch {
      return { content: [{ type: 'text', text: 'messages must be a valid JSON array of message objects' }], isError: true };
    }

    const body: Record<string, unknown> = {
      model: args.model,
      messages,
      stream: false, // adapter always returns full response
    };

    if (args.temperature !== undefined) body.temperature = args.temperature;
    if (args.max_tokens !== undefined) body.max_tokens = args.max_tokens;
    if (args.top_p !== undefined) body.top_p = args.top_p;
    if (args.stop) body.stop = (args.stop as string).split(',').map(s => s.trim());
    if (args.seed !== undefined) body.seed = args.seed;
    if (args.service_tier) body.service_tier = args.service_tier;
    if (args.response_format === 'json_object') body.response_format = { type: 'json_object' };

    return this.groqPost('/chat/completions', body);
  }

  private async listModels(): Promise<ToolResult> {
    return this.groqGet('/models');
  }

  private async getModel(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.model_id) return { content: [{ type: 'text', text: 'model_id is required' }], isError: true };
    return this.groqGet(`/models/${encodeURIComponent(args.model_id as string)}`);
  }

  private async transcribeAudio(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.audio_url) {
      return { content: [{ type: 'text', text: 'audio_url is required' }], isError: true };
    }

    const body: Record<string, unknown> = {
      url: args.audio_url,
      model: (args.model as string) || 'whisper-large-v3',
      response_format: (args.response_format as string) || 'json',
      temperature: (args.temperature as number) ?? 0,
    };
    if (args.language) body.language = args.language;
    if (args.prompt) body.prompt = args.prompt;

    return this.groqPost('/audio/transcriptions', body);
  }

  private async translateAudio(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.audio_url) {
      return { content: [{ type: 'text', text: 'audio_url is required' }], isError: true };
    }

    const body: Record<string, unknown> = {
      url: args.audio_url,
      model: (args.model as string) || 'whisper-large-v3',
      response_format: (args.response_format as string) || 'json',
      temperature: (args.temperature as number) ?? 0,
    };
    if (args.prompt) body.prompt = args.prompt;

    return this.groqPost('/audio/translations', body);
  }

  private async createBatch(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.input_file_id) {
      return { content: [{ type: 'text', text: 'input_file_id is required' }], isError: true };
    }

    const body: Record<string, unknown> = {
      input_file_id: args.input_file_id,
      endpoint: '/v1/chat/completions',
      completion_window: (args.completion_window as string) || '24h',
    };

    return this.groqPost('/batches', body);
  }

  private async listBatches(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    params.set('limit', String((args.limit as number) || 20));
    if (args.after) params.set('after', args.after as string);

    const response = await this.fetchWithRetry(`${this.baseUrl}/batches?${params.toString()}`, {
      method: 'GET',
      headers: this.authHeaders,
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `API error: ${response.status} ${errText}` }], isError: true };
    }

    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getBatch(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.batch_id) return { content: [{ type: 'text', text: 'batch_id is required' }], isError: true };
    return this.groqGet(`/batches/${encodeURIComponent(args.batch_id as string)}`);
  }

  private async cancelBatch(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.batch_id) return { content: [{ type: 'text', text: 'batch_id is required' }], isError: true };

    const response = await this.fetchWithRetry(`${this.baseUrl}/batches/${encodeURIComponent(args.batch_id as string)}/cancel`, {
      method: 'POST',
      headers: this.authHeaders,
      body: JSON.stringify({}),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `API error: ${response.status} ${errText}` }], isError: true };
    }

    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }
}

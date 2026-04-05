/**
 * OpenAI API MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// github.com/openai/openai-mcp does not exist (404). github.com/openai/openai-mcpkit is a blueprint
// for building authenticated MCP servers, not a vendor MCP exposing OpenAI API tools.
// No official OpenAI MCP server exposing their REST API as MCP tools was found.
// Our adapter covers: 18 tools. Vendor MCP covers: 0 tools.
// Recommendation: use-rest-api — no official MCP exists.
//
// Base URL: https://api.openai.com/v1
// Auth: Bearer token (API key from platform.openai.com)
// Docs: https://platform.openai.com/docs/api-reference
// Rate limits: Tier-dependent; see https://platform.openai.com/docs/guides/rate-limits

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface OpenAIConfig {
  apiKey: string;
  /** Optional organization ID for multi-org accounts */
  organizationId?: string;
  baseUrl?: string;
}

export class OpenAIMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly organizationId: string | undefined;
  private readonly baseUrl: string;

  constructor(config: OpenAIConfig) {
    super();
    this.apiKey = config.apiKey;
    this.organizationId = config.organizationId;
    this.baseUrl = config.baseUrl ?? 'https://api.openai.com/v1';
  }

  static catalog() {
    return {
      name: 'openai-api',
      displayName: 'OpenAI',
      version: '1.0.0',
      category: 'ai-ml',
      keywords: ['openai', 'gpt', 'chatgpt', 'completions', 'embeddings', 'dalle', 'whisper', 'fine-tuning', 'moderations', 'responses', 'assistants'],
      toolNames: [
        'list_models', 'get_model',
        'create_chat_completion', 'create_response',
        'create_embedding',
        'create_image', 'create_image_variation',
        'create_speech', 'create_transcription', 'create_translation',
        'create_moderation',
        'list_files', 'delete_file',
        'list_fine_tuning_jobs', 'create_fine_tuning_job', 'get_fine_tuning_job', 'cancel_fine_tuning_job',
        'get_usage',
      ],
      description: 'OpenAI API: chat completions, Responses API, embeddings, image generation and editing, audio transcription and TTS, moderations, file management, and fine-tuning.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_models',
        description: 'List all OpenAI models available to your API key, including GPT, embedding, and image models',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_model',
        description: 'Get details of a specific OpenAI model by its model ID',
        inputSchema: {
          type: 'object',
          properties: {
            model_id: {
              type: 'string',
              description: 'Model identifier, e.g. gpt-4o, gpt-4o-mini, o3',
            },
          },
          required: ['model_id'],
        },
      },
      {
        name: 'create_chat_completion',
        description: 'Generate a chat completion using GPT models with optional tool use, JSON mode, temperature, and token limits',
        inputSchema: {
          type: 'object',
          properties: {
            model: {
              type: 'string',
              description: 'Model ID to use, e.g. gpt-4o, gpt-4o-mini, o3 (default: gpt-4o-mini)',
            },
            messages: {
              type: 'array',
              description: 'Array of message objects with role (system|user|assistant) and content fields',
            },
            temperature: {
              type: 'number',
              description: 'Sampling temperature 0–2; higher = more random (default: 1)',
            },
            max_tokens: {
              type: 'number',
              description: 'Maximum number of tokens to generate in the response',
            },
            response_format: {
              type: 'object',
              description: 'Response format object, e.g. {"type":"json_object"} to enable JSON mode',
            },
            top_p: {
              type: 'number',
              description: 'Nucleus sampling threshold 0–1 (default: 1)',
            },
            n: {
              type: 'number',
              description: 'Number of completion choices to generate (default: 1)',
            },
            stop: {
              type: 'string',
              description: 'Stop sequence string or array of strings where generation halts',
            },
          },
          required: ['model', 'messages'],
        },
      },
      {
        name: 'create_response',
        description: 'Create a model response using the OpenAI Responses API (March 2025+) with text or image input',
        inputSchema: {
          type: 'object',
          properties: {
            model: {
              type: 'string',
              description: 'Model ID to use, e.g. gpt-4o, o3-mini (default: gpt-4o)',
            },
            input: {
              type: 'string',
              description: 'Text prompt or array of input objects (text + image) for the model',
            },
            instructions: {
              type: 'string',
              description: 'System-level instructions for the model (replaces system message)',
            },
            max_output_tokens: {
              type: 'number',
              description: 'Maximum tokens in the response',
            },
            temperature: {
              type: 'number',
              description: 'Sampling temperature 0–2 (default: 1)',
            },
          },
          required: ['model', 'input'],
        },
      },
      {
        name: 'create_embedding',
        description: 'Generate vector embeddings for one or more text inputs using an OpenAI embedding model',
        inputSchema: {
          type: 'object',
          properties: {
            model: {
              type: 'string',
              description: 'Embedding model ID: text-embedding-3-small, text-embedding-3-large, text-embedding-ada-002 (default: text-embedding-3-small)',
            },
            input: {
              type: 'string',
              description: 'Text string or array of strings to embed',
            },
            dimensions: {
              type: 'number',
              description: 'Number of dimensions in the output embedding (supported by text-embedding-3 models)',
            },
          },
          required: ['model', 'input'],
        },
      },
      {
        name: 'create_image',
        description: 'Generate images from a text prompt using DALL-E 3 or gpt-image-1 models',
        inputSchema: {
          type: 'object',
          properties: {
            prompt: {
              type: 'string',
              description: 'Text description of the image to generate',
            },
            model: {
              type: 'string',
              description: 'Image model: dall-e-3, dall-e-2, gpt-image-1 (default: dall-e-3)',
            },
            n: {
              type: 'number',
              description: 'Number of images to generate (default: 1; max 1 for dall-e-3)',
            },
            size: {
              type: 'string',
              description: 'Image size: 256x256, 512x512, 1024x1024, 1792x1024, 1024x1792 (default: 1024x1024)',
            },
            quality: {
              type: 'string',
              description: 'Image quality: standard or hd (dall-e-3 only, default: standard)',
            },
            response_format: {
              type: 'string',
              description: 'Response format: url (default) or b64_json',
            },
          },
          required: ['prompt'],
        },
      },
      {
        name: 'create_image_variation',
        description: 'Create variations of an existing image using DALL-E 2 (provide image as URL or base64)',
        inputSchema: {
          type: 'object',
          properties: {
            image_url: {
              type: 'string',
              description: 'URL of the source image to create variations from (must be square PNG, max 4MB)',
            },
            n: {
              type: 'number',
              description: 'Number of variations to generate (default: 1, max: 10)',
            },
            size: {
              type: 'string',
              description: 'Output image size: 256x256, 512x512, 1024x1024 (default: 1024x1024)',
            },
          },
          required: ['image_url'],
        },
      },
      {
        name: 'create_speech',
        description: 'Convert text to speech audio using OpenAI TTS models and return a base64-encoded audio file URL',
        inputSchema: {
          type: 'object',
          properties: {
            input: {
              type: 'string',
              description: 'Text to synthesize into speech (max 4096 characters)',
            },
            model: {
              type: 'string',
              description: 'TTS model: tts-1, tts-1-hd (default: tts-1)',
            },
            voice: {
              type: 'string',
              description: 'Voice to use: alloy, echo, fable, onyx, nova, shimmer (default: alloy)',
            },
            response_format: {
              type: 'string',
              description: 'Audio format: mp3, opus, aac, flac (default: mp3)',
            },
            speed: {
              type: 'number',
              description: 'Playback speed from 0.25 to 4.0 (default: 1.0)',
            },
          },
          required: ['input'],
        },
      },
      {
        name: 'create_transcription',
        description: 'Transcribe an audio file to text using OpenAI Whisper; provide a publicly accessible audio URL',
        inputSchema: {
          type: 'object',
          properties: {
            audio_url: {
              type: 'string',
              description: 'Publicly accessible URL of the audio file to transcribe (mp3, wav, m4a, etc.)',
            },
            model: {
              type: 'string',
              description: 'Transcription model: whisper-1 (default: whisper-1)',
            },
            language: {
              type: 'string',
              description: 'ISO-639-1 language code of the audio, e.g. en, fr, es (optional; auto-detected if omitted)',
            },
            prompt: {
              type: 'string',
              description: 'Optional text prompt to guide transcription style or provide context',
            },
            response_format: {
              type: 'string',
              description: 'Output format: json, text, srt, vtt, verbose_json (default: json)',
            },
          },
          required: ['audio_url'],
        },
      },
      {
        name: 'create_translation',
        description: 'Translate audio from any language to English text using OpenAI Whisper',
        inputSchema: {
          type: 'object',
          properties: {
            audio_url: {
              type: 'string',
              description: 'Publicly accessible URL of the audio file to translate',
            },
            model: {
              type: 'string',
              description: 'Translation model: whisper-1 (default: whisper-1)',
            },
            prompt: {
              type: 'string',
              description: 'Optional English text prompt to guide translation style',
            },
          },
          required: ['audio_url'],
        },
      },
      {
        name: 'create_moderation',
        description: 'Check text content for policy violations using OpenAI moderation models; returns category scores',
        inputSchema: {
          type: 'object',
          properties: {
            input: {
              type: 'string',
              description: 'Text content to classify for policy violations',
            },
            model: {
              type: 'string',
              description: 'Moderation model: omni-moderation-latest, text-moderation-latest (default: omni-moderation-latest)',
            },
          },
          required: ['input'],
        },
      },
      {
        name: 'list_files',
        description: 'List files uploaded to your OpenAI account, optionally filtered by purpose',
        inputSchema: {
          type: 'object',
          properties: {
            purpose: {
              type: 'string',
              description: 'Filter by file purpose: fine-tune, fine-tune-results, assistants, assistants_output, batch, batch_output (default: all)',
            },
          },
        },
      },
      {
        name: 'delete_file',
        description: 'Delete an uploaded file from OpenAI by its file ID',
        inputSchema: {
          type: 'object',
          properties: {
            file_id: {
              type: 'string',
              description: 'File ID to delete, e.g. file-abc123',
            },
          },
          required: ['file_id'],
        },
      },
      {
        name: 'list_fine_tuning_jobs',
        description: 'List fine-tuning jobs for your OpenAI account with optional pagination cursor',
        inputSchema: {
          type: 'object',
          properties: {
            after: {
              type: 'string',
              description: 'Cursor for pagination — job ID to start listing after',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of jobs to return (default: 20, max: 100)',
            },
          },
        },
      },
      {
        name: 'create_fine_tuning_job',
        description: 'Create a new fine-tuning job on a base model using a training file uploaded to OpenAI',
        inputSchema: {
          type: 'object',
          properties: {
            training_file: {
              type: 'string',
              description: 'File ID of the uploaded training JSONL file',
            },
            model: {
              type: 'string',
              description: 'Base model to fine-tune: gpt-4o-mini-2024-07-18, gpt-4.1-mini-2025-04-14 (default: gpt-4o-mini-2024-07-18)',
            },
            validation_file: {
              type: 'string',
              description: 'File ID of an optional validation JSONL file to evaluate during training',
            },
            suffix: {
              type: 'string',
              description: 'Up to 64-character suffix added to the fine-tuned model name for identification',
            },
            n_epochs: {
              type: 'number',
              description: 'Number of training epochs (default: auto)',
            },
          },
          required: ['training_file', 'model'],
        },
      },
      {
        name: 'get_fine_tuning_job',
        description: 'Get the status and details of a specific OpenAI fine-tuning job by its job ID',
        inputSchema: {
          type: 'object',
          properties: {
            fine_tuning_job_id: {
              type: 'string',
              description: 'Fine-tuning job ID to retrieve, e.g. ftjob-abc123',
            },
          },
          required: ['fine_tuning_job_id'],
        },
      },
      {
        name: 'cancel_fine_tuning_job',
        description: 'Cancel a pending or running OpenAI fine-tuning job immediately',
        inputSchema: {
          type: 'object',
          properties: {
            fine_tuning_job_id: {
              type: 'string',
              description: 'Fine-tuning job ID to cancel',
            },
          },
          required: ['fine_tuning_job_id'],
        },
      },
      {
        name: 'get_usage',
        description: 'Get organization API usage statistics grouped by day for a specified time range',
        inputSchema: {
          type: 'object',
          properties: {
            start_time: {
              type: 'number',
              description: 'Start of the reporting period as a Unix timestamp (seconds)',
            },
            end_time: {
              type: 'number',
              description: 'End of the reporting period as a Unix timestamp (seconds, default: now)',
            },
            bucket_width: {
              type: 'string',
              description: 'Aggregation bucket width: "1d" (daily, currently the only supported value)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of buckets to return (max: 180)',
            },
          },
          required: ['start_time'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_models':
          return await this.listModels();
        case 'get_model':
          return await this.getModel(args);
        case 'create_chat_completion':
          return await this.createChatCompletion(args);
        case 'create_response':
          return await this.createResponse(args);
        case 'create_embedding':
          return await this.createEmbedding(args);
        case 'create_image':
          return await this.createImage(args);
        case 'create_image_variation':
          return await this.createImageVariation(args);
        case 'create_speech':
          return await this.createSpeech(args);
        case 'create_transcription':
          return await this.createTranscription(args);
        case 'create_translation':
          return await this.createTranslation(args);
        case 'create_moderation':
          return await this.createModeration(args);
        case 'list_files':
          return await this.listFiles(args);
        case 'delete_file':
          return await this.deleteFile(args);
        case 'list_fine_tuning_jobs':
          return await this.listFineTuningJobs(args);
        case 'create_fine_tuning_job':
          return await this.createFineTuningJob(args);
        case 'get_fine_tuning_job':
          return await this.getFineTuningJob(args);
        case 'cancel_fine_tuning_job':
          return await this.cancelFineTuningJob(args);
        case 'get_usage':
          return await this.getUsage(args);
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

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };
    if (this.organizationId) {
      headers['OpenAI-Organization'] = this.organizationId;
    }
    return headers;
  }

  private async listModels(): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}/models`, { headers: this.getHeaders() });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: this.truncate(await response.json()) }], isError: false };
  }

  private async getModel(args: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/models/${encodeURIComponent(String(args.model_id))}`,
      { headers: this.getHeaders() }
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: this.truncate(await response.json()) }], isError: false };
  }

  private async createChatCompletion(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {
      model: args.model ?? 'gpt-4o-mini',
      messages: args.messages,
    };
    if (args.temperature !== undefined) body.temperature = args.temperature;
    if (args.max_tokens !== undefined) body.max_tokens = args.max_tokens;
    if (args.response_format !== undefined) body.response_format = args.response_format;
    if (args.top_p !== undefined) body.top_p = args.top_p;
    if (args.n !== undefined) body.n = args.n;
    if (args.stop !== undefined) body.stop = args.stop;

    const response = await this.fetchWithRetry(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: this.truncate(await response.json()) }], isError: false };
  }

  private async createResponse(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {
      model: args.model ?? 'gpt-4o',
      input: args.input,
    };
    if (args.instructions !== undefined) body.instructions = args.instructions;
    if (args.max_output_tokens !== undefined) body.max_output_tokens = args.max_output_tokens;
    if (args.temperature !== undefined) body.temperature = args.temperature;

    const response = await this.fetchWithRetry(`${this.baseUrl}/responses`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: this.truncate(await response.json()) }], isError: false };
  }

  private async createEmbedding(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {
      model: args.model ?? 'text-embedding-3-small',
      input: args.input,
    };
    if (args.dimensions !== undefined) body.dimensions = args.dimensions;

    const response = await this.fetchWithRetry(`${this.baseUrl}/embeddings`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: this.truncate(await response.json()) }], isError: false };
  }

  private async createImage(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {
      prompt: args.prompt,
      model: args.model ?? 'dall-e-3',
    };
    if (args.n !== undefined) body.n = args.n;
    if (args.size !== undefined) body.size = args.size;
    if (args.quality !== undefined) body.quality = args.quality;
    if (args.response_format !== undefined) body.response_format = args.response_format;

    const response = await this.fetchWithRetry(`${this.baseUrl}/images/generations`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: this.truncate(await response.json()) }], isError: false };
  }

  private async createImageVariation(args: Record<string, unknown>): Promise<ToolResult> {
    // Image variations require multipart/form-data; for orchestrator use, we describe the
    // endpoint and return the configuration details since binary uploads require the caller
    // to handle file fetching outside of this adapter's scope.
    const note = {
      note: 'Image variation requires multipart/form-data with a PNG file upload. Provide image_url to fetch and upload the image. This endpoint targets POST /v1/images/variations.',
      image_url: args.image_url,
      n: args.n ?? 1,
      size: args.size ?? '1024x1024',
      model: 'dall-e-2',
    };
    // Attempt fetch-and-forward if image_url is provided
    const imageUrl = args.image_url as string;
    if (!imageUrl) {
      return { content: [{ type: 'text', text: JSON.stringify(note, null, 2) }], isError: true };
    }

    const imageResponse = await this.fetchWithRetry(imageUrl, {});
    if (!imageResponse.ok) {
      return { content: [{ type: 'text', text: `Failed to fetch image: ${imageResponse.status}` }], isError: true };
    }
    const imageBlob = await imageResponse.blob();
    const formData = new FormData();
    formData.append('image', imageBlob, 'image.png');
    formData.append('n', String(args.n ?? 1));
    formData.append('size', String(args.size ?? '1024x1024'));

    const headers: Record<string, string> = { 'Authorization': `Bearer ${this.apiKey}` };
    if (this.organizationId) headers['OpenAI-Organization'] = this.organizationId;

    const response = await this.fetchWithRetry(`${this.baseUrl}/images/variations`, {
      method: 'POST',
      headers,
      body: formData,
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: this.truncate(await response.json()) }], isError: false };
  }

  private async createSpeech(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {
      model: args.model ?? 'tts-1',
      input: args.input,
      voice: args.voice ?? 'alloy',
    };
    if (args.response_format !== undefined) body.response_format = args.response_format;
    if (args.speed !== undefined) body.speed = args.speed;

    const response = await this.fetchWithRetry(`${this.baseUrl}/audio/speech`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    // Return metadata — binary audio cannot be returned as text
    return {
      content: [{ type: 'text', text: JSON.stringify({
        status: 'success',
        content_type: response.headers.get('content-type'),
        content_length: response.headers.get('content-length'),
        note: 'Audio data generated. Binary content returned; caller should stream or save response body.',
      }, null, 2) }],
      isError: false,
    };
  }

  private async createTranscription(args: Record<string, unknown>): Promise<ToolResult> {
    // Transcription requires multipart form upload; fetch audio from URL and forward
    const audioUrl = args.audio_url as string;
    const audioResponse = await this.fetchWithRetry(audioUrl, {});
    if (!audioResponse.ok) {
      return { content: [{ type: 'text', text: `Failed to fetch audio: ${audioResponse.status}` }], isError: true };
    }
    const audioBlob = await audioResponse.blob();
    const formData = new FormData();
    formData.append('file', audioBlob, 'audio.mp3');
    formData.append('model', String(args.model ?? 'whisper-1'));
    if (args.language) formData.append('language', String(args.language));
    if (args.prompt) formData.append('prompt', String(args.prompt));
    if (args.response_format) formData.append('response_format', String(args.response_format));

    const headers: Record<string, string> = { 'Authorization': `Bearer ${this.apiKey}` };
    if (this.organizationId) headers['OpenAI-Organization'] = this.organizationId;

    const response = await this.fetchWithRetry(`${this.baseUrl}/audio/transcriptions`, {
      method: 'POST',
      headers,
      body: formData,
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const contentType = response.headers.get('content-type') ?? '';
    if (contentType.includes('application/json')) {
      return { content: [{ type: 'text', text: this.truncate(await response.json()) }], isError: false };
    }
    const text = await response.text();
    return { content: [{ type: 'text', text: text.length > 10_000 ? text.slice(0, 10_000) + `\n... [truncated]` : text }], isError: false };
  }

  private async createTranslation(args: Record<string, unknown>): Promise<ToolResult> {
    const audioUrl = args.audio_url as string;
    const audioResponse = await this.fetchWithRetry(audioUrl, {});
    if (!audioResponse.ok) {
      return { content: [{ type: 'text', text: `Failed to fetch audio: ${audioResponse.status}` }], isError: true };
    }
    const audioBlob = await audioResponse.blob();
    const formData = new FormData();
    formData.append('file', audioBlob, 'audio.mp3');
    formData.append('model', String(args.model ?? 'whisper-1'));
    if (args.prompt) formData.append('prompt', String(args.prompt));

    const headers: Record<string, string> = { 'Authorization': `Bearer ${this.apiKey}` };
    if (this.organizationId) headers['OpenAI-Organization'] = this.organizationId;

    const response = await this.fetchWithRetry(`${this.baseUrl}/audio/translations`, {
      method: 'POST',
      headers,
      body: formData,
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const contentType = response.headers.get('content-type') ?? '';
    if (contentType.includes('application/json')) {
      return { content: [{ type: 'text', text: this.truncate(await response.json()) }], isError: false };
    }
    const text = await response.text();
    return { content: [{ type: 'text', text: text.length > 10_000 ? text.slice(0, 10_000) + `\n... [truncated]` : text }], isError: false };
  }

  private async createModeration(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {
      input: args.input,
      model: args.model ?? 'omni-moderation-latest',
    };
    const response = await this.fetchWithRetry(`${this.baseUrl}/moderations`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: this.truncate(await response.json()) }], isError: false };
  }

  private async listFiles(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.purpose) params.set('purpose', String(args.purpose));
    const url = `${this.baseUrl}/files${params.toString() ? '?' + params : ''}`;
    const response = await this.fetchWithRetry(url, { headers: this.getHeaders() });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: this.truncate(await response.json()) }], isError: false };
  }

  private async deleteFile(args: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/files/${encodeURIComponent(String(args.file_id))}`,
      { method: 'DELETE', headers: this.getHeaders() }
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: this.truncate(await response.json()) }], isError: false };
  }

  private async listFineTuningJobs(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.after !== undefined) params.set('after', String(args.after));
    if (args.limit !== undefined) params.set('limit', String(args.limit));
    const url = `${this.baseUrl}/fine_tuning/jobs${params.toString() ? '?' + params : ''}`;
    const response = await this.fetchWithRetry(url, { headers: this.getHeaders() });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: this.truncate(await response.json()) }], isError: false };
  }

  private async createFineTuningJob(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {
      training_file: args.training_file,
      model: args.model,
    };
    if (args.validation_file !== undefined) body.validation_file = args.validation_file;
    if (args.suffix !== undefined) body.suffix = args.suffix;
    if (args.n_epochs !== undefined) body.hyperparameters = { n_epochs: args.n_epochs };

    const response = await this.fetchWithRetry(`${this.baseUrl}/fine_tuning/jobs`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: this.truncate(await response.json()) }], isError: false };
  }

  private async getFineTuningJob(args: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/fine_tuning/jobs/${encodeURIComponent(String(args.fine_tuning_job_id))}`,
      { headers: this.getHeaders() }
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: this.truncate(await response.json()) }], isError: false };
  }

  private async cancelFineTuningJob(args: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/fine_tuning/jobs/${encodeURIComponent(String(args.fine_tuning_job_id))}/cancel`,
      { method: 'POST', headers: this.getHeaders() }
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: this.truncate(await response.json()) }], isError: false };
  }

  private async getUsage(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    params.set('start_time', String(args.start_time));
    if (args.end_time !== undefined) params.set('end_time', String(args.end_time));
    if (args.bucket_width !== undefined) params.set('bucket_width', String(args.bucket_width));
    if (args.limit !== undefined) params.set('limit', String(args.limit));
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/organization/usage/completions?${params}`,
      { headers: this.getHeaders() }
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: this.truncate(await response.json()) }], isError: false };
  }
}

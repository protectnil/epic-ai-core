/**
 * ElevenLabs MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// No official ElevenLabs MCP server exposing the REST API was found on GitHub as of March 2026.
//
// Base URL: https://api.elevenlabs.io
// Auth: xi-api-key header (API key from ElevenLabs profile dashboard)
// Docs: https://elevenlabs.io/docs/api-reference
// Rate limits: Varies by subscription tier; Starter plan allows 10 concurrent requests

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface ElevenLabsConfig {
  apiKey: string;
  baseUrl?: string;
}

export class ElevenLabsMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: ElevenLabsConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.elevenlabs.io';
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'synthesize_speech',
        description: 'Convert text to speech audio using a specified ElevenLabs voice ID and optional voice settings.',
        inputSchema: {
          type: 'object',
          properties: {
            voice_id: {
              type: 'string',
              description: 'ElevenLabs voice ID to use for synthesis',
            },
            text: {
              type: 'string',
              description: 'Text content to convert to speech',
            },
            model_id: {
              type: 'string',
              description: 'Model ID to use (default: eleven_monolingual_v1)',
            },
            stability: {
              type: 'number',
              description: 'Voice stability value between 0 and 1 (default: 0.5)',
            },
            similarity_boost: {
              type: 'number',
              description: 'Voice similarity boost value between 0 and 1 (default: 0.75)',
            },
          },
          required: ['voice_id', 'text'],
        },
      },
      {
        name: 'synthesize_speech_stream',
        description: 'Stream text-to-speech audio using a specified ElevenLabs voice ID, returning streaming audio data.',
        inputSchema: {
          type: 'object',
          properties: {
            voice_id: {
              type: 'string',
              description: 'ElevenLabs voice ID to use for streaming synthesis',
            },
            text: {
              type: 'string',
              description: 'Text content to convert to speech',
            },
            model_id: {
              type: 'string',
              description: 'Model ID to use (default: eleven_monolingual_v1)',
            },
            stability: {
              type: 'number',
              description: 'Voice stability value between 0 and 1 (default: 0.5)',
            },
            similarity_boost: {
              type: 'number',
              description: 'Voice similarity boost value between 0 and 1 (default: 0.75)',
            },
          },
          required: ['voice_id', 'text'],
        },
      },
      {
        name: 'list_voices',
        description: 'List all available ElevenLabs voices including premade and cloned voices for the authenticated user.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_voice',
        description: 'Get details of a specific ElevenLabs voice by ID, including name, category, and optional settings.',
        inputSchema: {
          type: 'object',
          properties: {
            voice_id: {
              type: 'string',
              description: 'ElevenLabs voice ID',
            },
            with_settings: {
              type: 'boolean',
              description: 'Whether to include voice settings in the response (default: false)',
            },
          },
          required: ['voice_id'],
        },
      },
      {
        name: 'add_voice',
        description: 'Add a new custom cloned voice by uploading audio samples with a name and optional description.',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Name for the new cloned voice',
            },
            description: {
              type: 'string',
              description: 'Optional description for the voice',
            },
            labels: {
              type: 'string',
              description: 'JSON string of key-value label pairs for the voice',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'edit_voice',
        description: 'Edit the name, description, and labels of an existing ElevenLabs voice by ID.',
        inputSchema: {
          type: 'object',
          properties: {
            voice_id: {
              type: 'string',
              description: 'ElevenLabs voice ID to edit',
            },
            name: {
              type: 'string',
              description: 'New name for the voice',
            },
            description: {
              type: 'string',
              description: 'New description for the voice',
            },
          },
          required: ['voice_id'],
        },
      },
      {
        name: 'delete_voice',
        description: 'Delete a cloned voice from the ElevenLabs account by voice ID.',
        inputSchema: {
          type: 'object',
          properties: {
            voice_id: {
              type: 'string',
              description: 'ElevenLabs voice ID to delete',
            },
          },
          required: ['voice_id'],
        },
      },
      {
        name: 'get_voice_settings',
        description: 'Get the current voice settings (stability, similarity boost) for a specific voice ID.',
        inputSchema: {
          type: 'object',
          properties: {
            voice_id: {
              type: 'string',
              description: 'ElevenLabs voice ID',
            },
          },
          required: ['voice_id'],
        },
      },
      {
        name: 'edit_voice_settings',
        description: 'Update the voice settings (stability, similarity boost) for a specific voice ID.',
        inputSchema: {
          type: 'object',
          properties: {
            voice_id: {
              type: 'string',
              description: 'ElevenLabs voice ID',
            },
            stability: {
              type: 'number',
              description: 'Voice stability value between 0 and 1',
            },
            similarity_boost: {
              type: 'number',
              description: 'Voice similarity boost value between 0 and 1',
            },
          },
          required: ['voice_id', 'stability', 'similarity_boost'],
        },
      },
      {
        name: 'get_default_voice_settings',
        description: 'Get the default voice settings applied globally when no per-voice settings are configured.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'delete_voice_sample',
        description: 'Delete a specific audio sample from a cloned voice by voice ID and sample ID.',
        inputSchema: {
          type: 'object',
          properties: {
            voice_id: {
              type: 'string',
              description: 'ElevenLabs voice ID that owns the sample',
            },
            sample_id: {
              type: 'string',
              description: 'Sample ID to delete',
            },
          },
          required: ['voice_id', 'sample_id'],
        },
      },
      {
        name: 'get_voice_sample_audio',
        description: 'Get the audio data for a specific voice sample by voice ID and sample ID.',
        inputSchema: {
          type: 'object',
          properties: {
            voice_id: {
              type: 'string',
              description: 'ElevenLabs voice ID that owns the sample',
            },
            sample_id: {
              type: 'string',
              description: 'Sample ID to retrieve audio for',
            },
          },
          required: ['voice_id', 'sample_id'],
        },
      },
      {
        name: 'list_history',
        description: 'List previously generated audio history items for the authenticated ElevenLabs account.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_history_item_audio',
        description: 'Get the audio data for a specific history item by its history item ID.',
        inputSchema: {
          type: 'object',
          properties: {
            history_item_id: {
              type: 'string',
              description: 'History item ID to retrieve audio for',
            },
          },
          required: ['history_item_id'],
        },
      },
      {
        name: 'delete_history_item',
        description: 'Delete a specific history item from the ElevenLabs account by history item ID.',
        inputSchema: {
          type: 'object',
          properties: {
            history_item_id: {
              type: 'string',
              description: 'History item ID to delete',
            },
          },
          required: ['history_item_id'],
        },
      },
      {
        name: 'delete_history_items',
        description: 'Bulk delete multiple history items from the ElevenLabs account by providing a list of IDs.',
        inputSchema: {
          type: 'object',
          properties: {
            history_item_ids: {
              type: 'array',
              description: 'Array of history item IDs to delete',
              items: { type: 'string' },
            },
          },
          required: ['history_item_ids'],
        },
      },
      {
        name: 'download_history_items',
        description: 'Download one or more history items as a ZIP archive containing the audio files.',
        inputSchema: {
          type: 'object',
          properties: {
            history_item_ids: {
              type: 'array',
              description: 'Array of history item IDs to include in the download',
              items: { type: 'string' },
            },
          },
          required: ['history_item_ids'],
        },
      },
      {
        name: 'get_user_info',
        description: 'Get account information for the authenticated ElevenLabs user including tier and usage data.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_user_subscription',
        description: 'Get subscription details for the authenticated ElevenLabs user including character quota and renewal date.',
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
        case 'synthesize_speech':
          return await this.synthesizeSpeech(args);
        case 'synthesize_speech_stream':
          return await this.synthesizeSpeechStream(args);
        case 'list_voices':
          return await this.listVoices();
        case 'get_voice':
          return await this.getVoice(args);
        case 'add_voice':
          return await this.addVoice(args);
        case 'edit_voice':
          return await this.editVoice(args);
        case 'delete_voice':
          return await this.deleteVoice(args);
        case 'get_voice_settings':
          return await this.getVoiceSettings(args);
        case 'edit_voice_settings':
          return await this.editVoiceSettings(args);
        case 'get_default_voice_settings':
          return await this.getDefaultVoiceSettings();
        case 'delete_voice_sample':
          return await this.deleteVoiceSample(args);
        case 'get_voice_sample_audio':
          return await this.getVoiceSampleAudio(args);
        case 'list_history':
          return await this.listHistory();
        case 'get_history_item_audio':
          return await this.getHistoryItemAudio(args);
        case 'delete_history_item':
          return await this.deleteHistoryItem(args);
        case 'delete_history_items':
          return await this.deleteHistoryItems(args);
        case 'download_history_items':
          return await this.downloadHistoryItems(args);
        case 'get_user_info':
          return await this.getUserInfo();
        case 'get_user_subscription':
          return await this.getUserSubscription();
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

  private get authHeaders(): Record<string, string> {
    return {
      'xi-api-key': this.apiKey,
      'Content-Type': 'application/json',
    };
  }

  private async get(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'GET',
      headers: this.authHeaders,
    });
    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `ElevenLabs API error ${response.status}: ${response.statusText}` }],
        isError: true,
      };
    }
    const data = await response.json();
    return {
      content: [{ type: 'text', text: this.truncate(data) }],
      isError: false,
    };
  }

  private async post(path: string, body: unknown): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.authHeaders,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `ElevenLabs API error ${response.status}: ${response.statusText}` }],
        isError: true,
      };
    }
    const contentType = response.headers.get('content-type') ?? '';
    if (contentType.includes('audio/') || contentType.includes('application/octet-stream') || contentType.includes('application/zip')) {
      const buffer = await response.arrayBuffer();
      return {
        content: [{ type: 'text', text: JSON.stringify({ contentType, bytes: buffer.byteLength, note: 'Binary audio/zip data returned' }) }],
        isError: false,
      };
    }
    const data = await response.json();
    return {
      content: [{ type: 'text', text: this.truncate(data) }],
      isError: false,
    };
  }

  private async del(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'DELETE',
      headers: this.authHeaders,
    });
    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `ElevenLabs API error ${response.status}: ${response.statusText}` }],
        isError: true,
      };
    }
    return {
      content: [{ type: 'text', text: JSON.stringify({ deleted: true }) }],
      isError: false,
    };
  }

  private async synthesizeSpeech(args: Record<string, unknown>): Promise<ToolResult> {
    const voiceId = args.voice_id as string;
    if (!voiceId) return { content: [{ type: 'text', text: 'voice_id is required' }], isError: true };
    const text = args.text as string;
    if (!text) return { content: [{ type: 'text', text: 'text is required' }], isError: true };
    const body: Record<string, unknown> = { text };
    if (args.model_id) body['model_id'] = args.model_id;
    const vs: Record<string, unknown> = {};
    if (args.stability !== undefined) vs['stability'] = args.stability;
    if (args.similarity_boost !== undefined) vs['similarity_boost'] = args.similarity_boost;
    if (Object.keys(vs).length > 0) body['voice_settings'] = vs;
    return this.post(`/v1/text-to-speech/${encodeURIComponent(voiceId)}`, body);
  }

  private async synthesizeSpeechStream(args: Record<string, unknown>): Promise<ToolResult> {
    const voiceId = args.voice_id as string;
    if (!voiceId) return { content: [{ type: 'text', text: 'voice_id is required' }], isError: true };
    const text = args.text as string;
    if (!text) return { content: [{ type: 'text', text: 'text is required' }], isError: true };
    const body: Record<string, unknown> = { text };
    if (args.model_id) body['model_id'] = args.model_id;
    const vs: Record<string, unknown> = {};
    if (args.stability !== undefined) vs['stability'] = args.stability;
    if (args.similarity_boost !== undefined) vs['similarity_boost'] = args.similarity_boost;
    if (Object.keys(vs).length > 0) body['voice_settings'] = vs;
    return this.post(`/v1/text-to-speech/${encodeURIComponent(voiceId)}/stream`, body);
  }

  private async listVoices(): Promise<ToolResult> {
    return this.get('/v1/voices');
  }

  private async getVoice(args: Record<string, unknown>): Promise<ToolResult> {
    const voiceId = args.voice_id as string;
    if (!voiceId) return { content: [{ type: 'text', text: 'voice_id is required' }], isError: true };
    const qs = args.with_settings ? '?with_settings=true' : '';
    return this.get(`/v1/voices/${encodeURIComponent(voiceId)}${qs}`);
  }

  private async addVoice(args: Record<string, unknown>): Promise<ToolResult> {
    const name = args.name as string;
    if (!name) return { content: [{ type: 'text', text: 'name is required' }], isError: true };
    const body: Record<string, unknown> = { name };
    if (args.description) body['description'] = args.description;
    if (args.labels) {
      try { body['labels'] = JSON.parse(args.labels as string); } catch { body['labels'] = args.labels; }
    }
    return this.post('/v1/voices/add', body);
  }

  private async editVoice(args: Record<string, unknown>): Promise<ToolResult> {
    const voiceId = args.voice_id as string;
    if (!voiceId) return { content: [{ type: 'text', text: 'voice_id is required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.name) body['name'] = args.name;
    if (args.description) body['description'] = args.description;
    return this.post(`/v1/voices/${encodeURIComponent(voiceId)}/edit`, body);
  }

  private async deleteVoice(args: Record<string, unknown>): Promise<ToolResult> {
    const voiceId = args.voice_id as string;
    if (!voiceId) return { content: [{ type: 'text', text: 'voice_id is required' }], isError: true };
    return this.del(`/v1/voices/${encodeURIComponent(voiceId)}`);
  }

  private async getVoiceSettings(args: Record<string, unknown>): Promise<ToolResult> {
    const voiceId = args.voice_id as string;
    if (!voiceId) return { content: [{ type: 'text', text: 'voice_id is required' }], isError: true };
    return this.get(`/v1/voices/${encodeURIComponent(voiceId)}/settings`);
  }

  private async editVoiceSettings(args: Record<string, unknown>): Promise<ToolResult> {
    const voiceId = args.voice_id as string;
    if (!voiceId) return { content: [{ type: 'text', text: 'voice_id is required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.stability !== undefined) body['stability'] = args.stability;
    if (args.similarity_boost !== undefined) body['similarity_boost'] = args.similarity_boost;
    return this.post(`/v1/voices/${encodeURIComponent(voiceId)}/settings/edit`, body);
  }

  private async getDefaultVoiceSettings(): Promise<ToolResult> {
    return this.get('/v1/voices/settings/default');
  }

  private async deleteVoiceSample(args: Record<string, unknown>): Promise<ToolResult> {
    const voiceId = args.voice_id as string;
    const sampleId = args.sample_id as string;
    if (!voiceId || !sampleId) return { content: [{ type: 'text', text: 'voice_id and sample_id are required' }], isError: true };
    return this.del(`/v1/voices/${encodeURIComponent(voiceId)}/samples/${encodeURIComponent(sampleId)}`);
  }

  private async getVoiceSampleAudio(args: Record<string, unknown>): Promise<ToolResult> {
    const voiceId = args.voice_id as string;
    const sampleId = args.sample_id as string;
    if (!voiceId || !sampleId) return { content: [{ type: 'text', text: 'voice_id and sample_id are required' }], isError: true };
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/v1/voices/${encodeURIComponent(voiceId)}/samples/${encodeURIComponent(sampleId)}/audio`,
      { headers: this.authHeaders },
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `ElevenLabs API error ${response.status}: ${response.statusText}` }], isError: true };
    }
    const buffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') ?? 'audio/mpeg';
    return {
      content: [{ type: 'text', text: JSON.stringify({ contentType, bytes: buffer.byteLength, note: 'Binary audio data returned' }) }],
      isError: false,
    };
  }

  private async listHistory(): Promise<ToolResult> {
    return this.get('/v1/history');
  }

  private async getHistoryItemAudio(args: Record<string, unknown>): Promise<ToolResult> {
    const historyItemId = args.history_item_id as string;
    if (!historyItemId) return { content: [{ type: 'text', text: 'history_item_id is required' }], isError: true };
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/v1/history/${encodeURIComponent(historyItemId)}/audio`,
      { headers: this.authHeaders },
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `ElevenLabs API error ${response.status}: ${response.statusText}` }], isError: true };
    }
    const buffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') ?? 'audio/mpeg';
    return {
      content: [{ type: 'text', text: JSON.stringify({ contentType, bytes: buffer.byteLength, note: 'Binary audio data returned' }) }],
      isError: false,
    };
  }

  private async deleteHistoryItem(args: Record<string, unknown>): Promise<ToolResult> {
    const historyItemId = args.history_item_id as string;
    if (!historyItemId) return { content: [{ type: 'text', text: 'history_item_id is required' }], isError: true };
    return this.del(`/v1/history/${encodeURIComponent(historyItemId)}`);
  }

  private async deleteHistoryItems(args: Record<string, unknown>): Promise<ToolResult> {
    const ids = args.history_item_ids as string[];
    if (!ids || ids.length === 0) return { content: [{ type: 'text', text: 'history_item_ids array is required' }], isError: true };
    return this.post('/v1/history/delete', { history_item_ids: ids });
  }

  private async downloadHistoryItems(args: Record<string, unknown>): Promise<ToolResult> {
    const ids = args.history_item_ids as string[];
    if (!ids || ids.length === 0) return { content: [{ type: 'text', text: 'history_item_ids array is required' }], isError: true };
    return this.post('/v1/history/download', { history_item_ids: ids });
  }

  private async getUserInfo(): Promise<ToolResult> {
    return this.get('/v1/user');
  }

  private async getUserSubscription(): Promise<ToolResult> {
    return this.get('/v1/user/subscription');
  }

  static catalog() {
    return {
      name: 'elevenlabs',
      displayName: 'ElevenLabs',
      version: '1.0.0',
      category: 'ai-ml' as const,
      keywords: [
        'elevenlabs',
        'text-to-speech',
        'tts',
        'voice',
        'voice cloning',
        'audio synthesis',
        'speech synthesis',
        'ai voice',
        'voice generation',
        'audio',
      ],
      toolNames: [
        'synthesize_speech',
        'synthesize_speech_stream',
        'list_voices',
        'get_voice',
        'add_voice',
        'edit_voice',
        'delete_voice',
        'get_voice_settings',
        'edit_voice_settings',
        'get_default_voice_settings',
        'delete_voice_sample',
        'get_voice_sample_audio',
        'list_history',
        'get_history_item_audio',
        'delete_history_item',
        'delete_history_items',
        'download_history_items',
        'get_user_info',
        'get_user_subscription',
      ],
      description: 'ElevenLabs text-to-speech and voice cloning: synthesize speech, manage custom voices, browse voice library, and access generation history.',
      author: 'protectnil' as const,
    };
  }
}

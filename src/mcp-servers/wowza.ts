/**
 * Wowza Streaming Cloud MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// No official Wowza MCP server found on GitHub or the MCP registry.
//
// Base URL: https://api.cloud.wowza.com/api/v1
// Auth: Two API key headers required:
//   wsc-api-key: 64-character alphanumeric API key (from Wowza Streaming Cloud UI > API Access)
//   wsc-access-key: 64-character alphanumeric access key (from Wowza Streaming Cloud UI > API Access)
// Docs: https://www.wowza.com/docs/wowza-streaming-cloud-rest-api
// Rate limits: See https://www.wowza.com/docs/wowza-streaming-cloud-rest-api-limits

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface WowzaConfig {
  apiKey: string;
  accessKey: string;
  baseUrl?: string;
}

export class WowzaMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly accessKey: string;
  private readonly baseUrl: string;

  constructor(config: WowzaConfig) {
    super();
    this.apiKey = config.apiKey;
    this.accessKey = config.accessKey;
    this.baseUrl = config.baseUrl || 'https://api.cloud.wowza.com/api/v1';
  }

  static catalog() {
    return {
      name: 'wowza',
      displayName: 'Wowza Streaming Cloud',
      version: '1.0.0',
      category: 'media',
      keywords: [
        'wowza', 'streaming', 'live stream', 'video', 'broadcast', 'media',
        'transcoder', 'stream target', 'player', 'recording', 'schedule',
        'RTMP', 'HLS', 'adaptive bitrate', 'CDN', 'live video', 'OTT',
      ],
      toolNames: [
        'list_live_streams',
        'get_live_stream',
        'create_live_stream',
        'start_live_stream',
        'stop_live_stream',
        'get_live_stream_state',
        'list_transcoders',
        'get_transcoder',
        'start_transcoder',
        'stop_transcoder',
        'get_transcoder_state',
        'list_recordings',
        'get_recording',
        'list_stream_targets',
        'get_stream_target',
        'list_schedules',
        'get_schedule',
        'list_stream_sources',
        'get_stream_source',
        'get_usage_network_transcoders',
      ],
      description: 'Wowza Streaming Cloud: manage live streams, transcoders, stream targets, recordings, schedules, and stream sources programmatically via REST API.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_live_streams',
        description: 'Fetch all live streams in the Wowza Streaming Cloud account',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_live_stream',
        description: 'Fetch details for a specific live stream by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Live stream ID',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'create_live_stream',
        description: 'Create a new live stream with specified configuration (name, encoder, aspect ratio, broadcast location, etc.)',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Descriptive name for the live stream',
            },
            encoder: {
              type: 'string',
              description: 'Encoder type: wowza_streaming_engine, wowza_gocoder, ipad_camera, iphone_camera, flash_media_live_encoder, wirecast, flashmedialivencoder, other_rtmp, other_rtsp, other_webrtc, or other',
            },
            broadcast_location: {
              type: 'string',
              description: 'Geographic region for broadcast (e.g. us_west_california, eu_germany, asia_pacific_australia)',
            },
            aspect_ratio_width: {
              type: 'number',
              description: 'Video width in pixels (e.g. 1920)',
            },
            aspect_ratio_height: {
              type: 'number',
              description: 'Video height in pixels (e.g. 1080)',
            },
            billing_mode: {
              type: 'string',
              description: 'Billing mode: pay_as_you_go or twentyfour_seven',
            },
            delivery_method: {
              type: 'string',
              description: 'Stream delivery method: push (encoder pushes to cloud) or pull (cloud pulls from source)',
            },
          },
          required: ['name', 'encoder', 'broadcast_location'],
        },
      },
      {
        name: 'start_live_stream',
        description: 'Start a live stream by ID — transitions stream to started state',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Live stream ID to start',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'stop_live_stream',
        description: 'Stop a live stream by ID — transitions stream to stopped state',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Live stream ID to stop',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'get_live_stream_state',
        description: 'Fetch the current state of a live stream (started, stopped, starting, stopping, etc.)',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Live stream ID',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'list_transcoders',
        description: 'Fetch all transcoders in the Wowza Streaming Cloud account',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_transcoder',
        description: 'Fetch details for a specific transcoder by ID including input/output configuration and stream targets',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Transcoder ID',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'start_transcoder',
        description: 'Start a transcoder by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Transcoder ID to start',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'stop_transcoder',
        description: 'Stop a transcoder by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Transcoder ID to stop',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'get_transcoder_state',
        description: 'Fetch the current state of a transcoder (started, stopped, starting, stopping, etc.)',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Transcoder ID',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'list_recordings',
        description: 'Fetch all recordings in the Wowza Streaming Cloud account',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_recording',
        description: 'Fetch details for a specific recording by ID including state and download information',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Recording ID',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'list_stream_targets',
        description: 'Fetch all stream targets (CDN delivery destinations) in the Wowza Streaming Cloud account',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_stream_target',
        description: 'Fetch details for a specific stream target by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Stream target ID',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'list_schedules',
        description: 'Fetch all schedules for automated stream start/stop in the Wowza Streaming Cloud account',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_schedule',
        description: 'Fetch details for a specific schedule by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Schedule ID',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'list_stream_sources',
        description: 'Fetch all stream sources (ingest points for pull-mode streams) in the Wowza Streaming Cloud account',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_stream_source',
        description: 'Fetch details for a specific stream source by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Stream source ID',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'get_usage_network_transcoders',
        description: 'Fetch network usage statistics for transcoders — includes bytes in/out and billing information',
        inputSchema: {
          type: 'object',
          properties: {
            from: {
              type: 'string',
              description: 'Start date for usage data in ISO 8601 format (e.g. "2026-01-01")',
            },
            to: {
              type: 'string',
              description: 'End date for usage data in ISO 8601 format (e.g. "2026-03-28")',
            },
            transcoder_type: {
              type: 'string',
              description: 'Filter by transcoder type: transcoded or passthrough',
            },
            billing_mode: {
              type: 'string',
              description: 'Filter by billing mode: pay_as_you_go or twentyfour_seven',
            },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_live_streams':
          return this.get('/live_streams');
        case 'get_live_stream':
          return this.requireId(args, id => this.get(`/live_streams/${id}`));
        case 'create_live_stream':
          return this.createLiveStream(args);
        case 'start_live_stream':
          return this.requireId(args, id => this.put(`/live_streams/${id}/start`));
        case 'stop_live_stream':
          return this.requireId(args, id => this.put(`/live_streams/${id}/stop`));
        case 'get_live_stream_state':
          return this.requireId(args, id => this.get(`/live_streams/${id}/state`));
        case 'list_transcoders':
          return this.get('/transcoders');
        case 'get_transcoder':
          return this.requireId(args, id => this.get(`/transcoders/${id}`));
        case 'start_transcoder':
          return this.requireId(args, id => this.put(`/transcoders/${id}/start`));
        case 'stop_transcoder':
          return this.requireId(args, id => this.put(`/transcoders/${id}/stop`));
        case 'get_transcoder_state':
          return this.requireId(args, id => this.get(`/transcoders/${id}/state`));
        case 'list_recordings':
          return this.get('/recordings');
        case 'get_recording':
          return this.requireId(args, id => this.get(`/recordings/${id}`));
        case 'list_stream_targets':
          return this.get('/stream_targets');
        case 'get_stream_target':
          return this.requireId(args, id => this.get(`/stream_targets/${id}`));
        case 'list_schedules':
          return this.get('/schedules');
        case 'get_schedule':
          return this.requireId(args, id => this.get(`/schedules/${id}`));
        case 'list_stream_sources':
          return this.get('/stream_sources');
        case 'get_stream_source':
          return this.requireId(args, id => this.get(`/stream_sources/${id}`));
        case 'get_usage_network_transcoders':
          return this.getUsageNetworkTranscoders(args);
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

  private buildHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'wsc-api-key': this.apiKey,
      'wsc-access-key': this.accessKey,
    };
  }

  private async get(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'GET',
      headers: this.buildHeaders(),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json() as unknown;
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async put(path: string, body?: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'PUT',
      headers: this.buildHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json() as unknown;
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async post(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.buildHeaders(),
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json() as unknown;
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private requireId(
    args: Record<string, unknown>,
    fn: (id: string) => Promise<ToolResult>,
  ): Promise<ToolResult> {
    if (!args.id) {
      return Promise.resolve({ content: [{ type: 'text', text: 'id is required' }], isError: true });
    }
    return fn(String(args.id));
  }

  private async createLiveStream(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name) return { content: [{ type: 'text', text: 'name is required' }], isError: true };
    if (!args.encoder) return { content: [{ type: 'text', text: 'encoder is required' }], isError: true };
    if (!args.broadcast_location) return { content: [{ type: 'text', text: 'broadcast_location is required' }], isError: true };

    const liveStream: Record<string, unknown> = {
      name: args.name,
      encoder: args.encoder,
      broadcast_location: args.broadcast_location,
    };
    if (args.aspect_ratio_width !== undefined) liveStream.aspect_ratio_width = args.aspect_ratio_width;
    if (args.aspect_ratio_height !== undefined) liveStream.aspect_ratio_height = args.aspect_ratio_height;
    if (args.billing_mode !== undefined) liveStream.billing_mode = args.billing_mode;
    if (args.delivery_method !== undefined) liveStream.delivery_method = args.delivery_method;

    return this.post('/live_streams', { live_stream: liveStream });
  }

  private async getUsageNetworkTranscoders(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.from) params.set('from', String(args.from));
    if (args.to) params.set('to', String(args.to));
    if (args.transcoder_type) params.set('transcoder_type', String(args.transcoder_type));
    if (args.billing_mode) params.set('billing_mode', String(args.billing_mode));
    const qs = params.toString();
    const path = '/usage/network/transcoders' + (qs ? `?${qs}` : '');
    return this.get(path);
  }
}

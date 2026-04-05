/**
 * SYNQ Video MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: No official SYNQ vendor MCP server found.
// Our adapter covers: 7 tools (create, details, query, stream, update, upload, uploader).
// Recommendation: Use this adapter for full SYNQ Video API coverage.
//
// Base URL: https://api.synq.fm/v1
// Auth: API key passed as form-data field `api_key` on every request
// Docs: https://docs.synq.fm
// Rate limits: Not publicly documented. Contact support@synq.fm for details.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface SynqFmConfig {
  apiKey: string;
  /** Optional base URL override (default: https://api.synq.fm/v1) */
  baseUrl?: string;
}

export class SynqFmMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: SynqFmConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? 'https://api.synq.fm/v1';
  }

  static catalog() {
    return {
      name: 'synq-fm',
      displayName: 'SYNQ Video',
      version: '1.0.0',
      category: 'media',
      keywords: [
        'synq', 'video', 'media', 'upload', 'stream', 'rtmp', 'playback',
        'live', 'broadcast', 'vod', 'encoding', 'hosting', 'metadata',
      ],
      toolNames: [
        'create_video', 'get_video_details', 'query_videos',
        'get_stream_urls', 'update_video_metadata', 'get_upload_parameters', 'get_uploader_url',
      ],
      description: 'SYNQ Video API for creating, uploading, streaming, and managing video assets with metadata and live RTMP streaming support.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'create_video',
        description: 'Create a new SYNQ video object, optionally setting initial userdata metadata fields',
        inputSchema: {
          type: 'object',
          properties: {
            userdata: {
              type: 'string',
              description: 'JSON string of additional metadata to associate with the video (only userdata fields can be set)',
            },
          },
        },
      },
      {
        name: 'get_video_details',
        description: 'Return full metadata details for a SYNQ video by its video ID',
        inputSchema: {
          type: 'object',
          properties: {
            video_id: {
              type: 'string',
              description: 'ID of the video to retrieve metadata from',
            },
          },
          required: ['video_id'],
        },
      },
      {
        name: 'query_videos',
        description: 'Find videos matching custom criteria by running a JavaScript filter function over each video object',
        inputSchema: {
          type: 'object',
          properties: {
            filter: {
              type: 'string',
              description: 'JavaScript code to evaluate against each video object — return truthy to include it (e.g. "video.userdata.title === \'My Video\'")',
            },
          },
          required: ['filter'],
        },
      },
      {
        name: 'get_stream_urls',
        description: 'Get RTMP stream URL and HLS playback URL for live streaming to a SYNQ video',
        inputSchema: {
          type: 'object',
          properties: {
            video_id: {
              type: 'string',
              description: 'ID of the video to stream to — must be previously created',
            },
          },
          required: ['video_id'],
        },
      },
      {
        name: 'update_video_metadata',
        description: 'Update a SYNQ video\'s userdata metadata fields using JavaScript code executed on the video object',
        inputSchema: {
          type: 'object',
          properties: {
            video_id: {
              type: 'string',
              description: 'ID of the video whose metadata will be updated',
            },
            source: {
              type: 'string',
              description: 'JavaScript code to execute on the video object — only userdata fields can be set (e.g. "video.userdata.title = \'New Title\'")',
            },
          },
          required: ['video_id', 'source'],
        },
      },
      {
        name: 'get_upload_parameters',
        description: 'Get AWS S3 signed upload parameters needed to upload a video file directly to SYNQ storage',
        inputSchema: {
          type: 'object',
          properties: {
            video_id: {
              type: 'string',
              description: 'ID of the video to upload into — must be previously created',
            },
          },
          required: ['video_id'],
        },
      },
      {
        name: 'get_uploader_url',
        description: 'Get an embeddable uploader widget URL that allows end users to upload video files through a browser interface',
        inputSchema: {
          type: 'object',
          properties: {
            video_id: {
              type: 'string',
              description: 'ID of the video to upload into — must be previously created',
            },
            timeout: {
              type: 'string',
              description: 'How long the uploader widget remains active — e.g. "30 minutes", "2 hours", "1 day" (default: "2 hours")',
            },
          },
          required: ['video_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'create_video':
          return this.createVideo(args);
        case 'get_video_details':
          return this.getVideoDetails(args);
        case 'query_videos':
          return this.queryVideos(args);
        case 'get_stream_urls':
          return this.getStreamUrls(args);
        case 'update_video_metadata':
          return this.updateVideoMetadata(args);
        case 'get_upload_parameters':
          return this.getUploadParameters(args);
        case 'get_uploader_url':
          return this.getUploaderUrl(args);
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

  private buildFormBody(params: Record<string, string | undefined>): string {
    const body = new URLSearchParams({ api_key: this.apiKey });
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) body.set(k, v);
    }
    return body.toString();
  }

  private async post(path: string, params: Record<string, string | undefined> = {}): Promise<ToolResult> {
    const url = `${this.baseUrl}${path}`;
    const response = await this.fetchWithRetry(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: this.buildFormBody(params),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`SYNQ returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async createVideo(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string | undefined> = {};
    if (args.userdata) params.userdata = args.userdata as string;
    return this.post('/video/create', params);
  }

  private async getVideoDetails(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.video_id) return { content: [{ type: 'text', text: 'video_id is required' }], isError: true };
    return this.post('/video/details', { video_id: args.video_id as string });
  }

  private async queryVideos(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.filter) return { content: [{ type: 'text', text: 'filter is required' }], isError: true };
    return this.post('/video/query', { filter: args.filter as string });
  }

  private async getStreamUrls(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.video_id) return { content: [{ type: 'text', text: 'video_id is required' }], isError: true };
    return this.post('/video/stream', { video_id: args.video_id as string });
  }

  private async updateVideoMetadata(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.video_id) return { content: [{ type: 'text', text: 'video_id is required' }], isError: true };
    if (!args.source) return { content: [{ type: 'text', text: 'source is required' }], isError: true };
    return this.post('/video/update', { video_id: args.video_id as string, source: args.source as string });
  }

  private async getUploadParameters(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.video_id) return { content: [{ type: 'text', text: 'video_id is required' }], isError: true };
    return this.post('/video/upload', { video_id: args.video_id as string });
  }

  private async getUploaderUrl(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.video_id) return { content: [{ type: 'text', text: 'video_id is required' }], isError: true };
    const params: Record<string, string | undefined> = { video_id: args.video_id as string };
    if (args.timeout) params.timeout = args.timeout as string;
    return this.post('/video/uploader', params);
  }
}

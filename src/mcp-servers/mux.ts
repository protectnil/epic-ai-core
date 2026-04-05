/**
 * Mux MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://www.npmjs.com/package/@mux/mcp — transport: stdio, auth: Basic (token ID + secret)
// Our adapter covers: 22 tools (assets, live streams, playback IDs, direct uploads, delivery usage, video data).
// Vendor MCP covers: full API surface (all Video + Data + System APIs, minus destructive deletes such as delete_asset and delete_live_stream). Last published: 2025-11 (v12.8.1). Maintained.
// Recommendation: Use vendor MCP for full coverage. Use this adapter for air-gapped deployments.
// NOTE: Vendor MCP (https://www.npmjs.com/package/@mux/mcp) exposes 10+ tools — superset of this REST adapter. Prefer vendor MCP.
//
// Base URL: https://api.mux.com
// Auth: HTTP Basic — username: MUX_TOKEN_ID, password: MUX_TOKEN_SECRET
// Docs: https://www.mux.com/docs/api-reference/video/assets
// Rate limits: GET: ~5 req/sec sustained; POST: ~1 req/sec sustained; Data APIs: sustained 5 req/sec with burst capacity

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface MuxConfig {
  tokenId: string;
  tokenSecret: string;
  baseUrl?: string;
}

export class MuxMCPServer extends MCPAdapterBase {
  private readonly tokenId: string;
  private readonly tokenSecret: string;
  private readonly baseUrl: string;

  constructor(config: MuxConfig) {
    super();
    this.tokenId = config.tokenId;
    this.tokenSecret = config.tokenSecret;
    this.baseUrl = config.baseUrl || 'https://api.mux.com';
  }

  static catalog() {
    return {
      name: 'mux',
      displayName: 'Mux',
      version: '1.0.0',
      category: 'misc',
      keywords: [
        'mux', 'video', 'live stream', 'streaming', 'asset', 'playback', 'upload',
        'direct upload', 'hls', 'on-demand', 'vod', 'video infrastructure',
        'transcoding', 'thumbnail', 'captions', 'subtitle', 'video analytics',
        'quality of experience', 'engagement', 'rebuffering',
      ],
      toolNames: [
        'list_assets', 'get_asset', 'create_asset', 'delete_asset', 'update_asset',
        'get_asset_input_info', 'get_asset_playback_id', 'create_asset_playback_id', 'delete_asset_playback_id',
        'list_live_streams', 'get_live_stream', 'create_live_stream', 'update_live_stream',
        'disable_live_stream', 'enable_live_stream', 'complete_live_stream',
        'list_uploads', 'get_upload', 'create_direct_upload',
        'list_playback_restrictions', 'get_monitoring_metrics', 'list_dimensions',
      ],
      description: 'Mux video infrastructure: manage video assets, live streams, direct uploads, playback IDs, and query video data analytics and quality-of-experience metrics.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_assets',
        description: 'List video assets in your Mux environment with optional status filter and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Number of assets to return (default: 25, max: 100)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            live_stream_id: {
              type: 'string',
              description: 'Filter assets created from a specific live stream ID',
            },
            upload_id: {
              type: 'string',
              description: 'Filter assets created from a specific direct upload ID',
            },
          },
        },
      },
      {
        name: 'get_asset',
        description: 'Get detailed information about a Mux video asset by its ID, including status, duration, and playback IDs',
        inputSchema: {
          type: 'object',
          properties: {
            asset_id: {
              type: 'string',
              description: 'Mux asset ID (e.g. DS00Spx1cx02znUrISeI2tsoBBR01jbTX)',
            },
          },
          required: ['asset_id'],
        },
      },
      {
        name: 'create_asset',
        description: 'Create a new Mux video asset from a publicly accessible URL for transcoding and streaming',
        inputSchema: {
          type: 'object',
          properties: {
            input_url: {
              type: 'string',
              description: 'Publicly accessible URL of the source video file to ingest',
            },
            playback_policy: {
              type: 'string',
              description: 'Playback policy: public (anyone can stream) or signed (requires JWT, default: public)',
            },
            mp4_support: {
              type: 'string',
              description: 'Enable MP4 download: none, capped-1080p, audio-only, capped-1080p,audio-only (default: none)',
            },
            normalize_audio: {
              type: 'boolean',
              description: 'Apply audio normalization to the asset (default: false)',
            },
            test: {
              type: 'boolean',
              description: 'Create as a test asset — will be deleted after 24 hours (default: false)',
            },
          },
          required: ['input_url'],
        },
      },
      {
        name: 'delete_asset',
        description: 'Permanently delete a Mux video asset and all associated playback IDs',
        inputSchema: {
          type: 'object',
          properties: {
            asset_id: {
              type: 'string',
              description: 'Mux asset ID to delete',
            },
          },
          required: ['asset_id'],
        },
      },
      {
        name: 'update_asset',
        description: 'Update metadata (passthrough field) on an existing Mux video asset',
        inputSchema: {
          type: 'object',
          properties: {
            asset_id: {
              type: 'string',
              description: 'Mux asset ID to update',
            },
            passthrough: {
              type: 'string',
              description: 'Arbitrary metadata string to attach to the asset (max 255 characters)',
            },
          },
          required: ['asset_id'],
        },
      },
      {
        name: 'get_asset_input_info',
        description: 'Get input file information for a Mux asset including source file metadata and tracks',
        inputSchema: {
          type: 'object',
          properties: {
            asset_id: {
              type: 'string',
              description: 'Mux asset ID',
            },
          },
          required: ['asset_id'],
        },
      },
      {
        name: 'get_asset_playback_id',
        description: 'Get details for a specific playback ID on a Mux asset including its policy type',
        inputSchema: {
          type: 'object',
          properties: {
            asset_id: {
              type: 'string',
              description: 'Mux asset ID',
            },
            playback_id: {
              type: 'string',
              description: 'Playback ID to retrieve',
            },
          },
          required: ['asset_id', 'playback_id'],
        },
      },
      {
        name: 'create_asset_playback_id',
        description: 'Add a new playback ID to an existing Mux asset with a specified policy (public or signed)',
        inputSchema: {
          type: 'object',
          properties: {
            asset_id: {
              type: 'string',
              description: 'Mux asset ID to add a playback ID to',
            },
            policy: {
              type: 'string',
              description: 'Playback policy: public or signed (default: public)',
            },
          },
          required: ['asset_id'],
        },
      },
      {
        name: 'delete_asset_playback_id',
        description: 'Remove a playback ID from a Mux asset to revoke streaming access',
        inputSchema: {
          type: 'object',
          properties: {
            asset_id: {
              type: 'string',
              description: 'Mux asset ID',
            },
            playback_id: {
              type: 'string',
              description: 'Playback ID to delete',
            },
          },
          required: ['asset_id', 'playback_id'],
        },
      },
      {
        name: 'list_live_streams',
        description: 'List live stream objects in your Mux environment with optional status filter and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              description: 'Filter by live stream status: active, idle, disabled (default: all)',
            },
            stream_key: {
              type: 'string',
              description: 'Filter by specific stream key',
            },
            limit: {
              type: 'number',
              description: 'Number of live streams to return (default: 25, max: 100)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
          },
        },
      },
      {
        name: 'get_live_stream',
        description: 'Get details for a specific Mux live stream by ID, including status, stream key, and playback IDs',
        inputSchema: {
          type: 'object',
          properties: {
            live_stream_id: {
              type: 'string',
              description: 'Mux live stream ID',
            },
          },
          required: ['live_stream_id'],
        },
      },
      {
        name: 'create_live_stream',
        description: 'Create a new Mux live stream — returns stream key and RTMP ingest URL for broadcasting',
        inputSchema: {
          type: 'object',
          properties: {
            playback_policy: {
              type: 'string',
              description: 'Playback policy: public or signed (default: public)',
            },
            reconnect_window: {
              type: 'number',
              description: 'Seconds to wait for reconnection before ending the stream (default: 60, max: 1800)',
            },
            latency_mode: {
              type: 'string',
              description: 'Latency mode: low (sub-5s), reduced (5-15s), standard (15-30s, default: low)',
            },
            test: {
              type: 'boolean',
              description: 'Create as a test stream — associated assets deleted after 24h (default: false)',
            },
            passthrough: {
              type: 'string',
              description: 'Arbitrary metadata string to attach to the live stream (max 255 characters)',
            },
          },
        },
      },
      {
        name: 'update_live_stream',
        description: 'Update settings on an existing Mux live stream such as reconnect window and latency mode',
        inputSchema: {
          type: 'object',
          properties: {
            live_stream_id: {
              type: 'string',
              description: 'Mux live stream ID to update',
            },
            reconnect_window: {
              type: 'number',
              description: 'Updated reconnection window in seconds (max: 1800)',
            },
            latency_mode: {
              type: 'string',
              description: 'Updated latency mode: low, reduced, standard',
            },
            passthrough: {
              type: 'string',
              description: 'Updated metadata string',
            },
          },
          required: ['live_stream_id'],
        },
      },
      {
        name: 'disable_live_stream',
        description: 'Disable a Mux live stream so it stops accepting new broadcasts until re-enabled',
        inputSchema: {
          type: 'object',
          properties: {
            live_stream_id: {
              type: 'string',
              description: 'Mux live stream ID to disable',
            },
          },
          required: ['live_stream_id'],
        },
      },
      {
        name: 'enable_live_stream',
        description: 'Re-enable a previously disabled Mux live stream so it can accept broadcasts again',
        inputSchema: {
          type: 'object',
          properties: {
            live_stream_id: {
              type: 'string',
              description: 'Mux live stream ID to re-enable',
            },
          },
          required: ['live_stream_id'],
        },
      },
      {
        name: 'complete_live_stream',
        description: 'Manually complete an active Mux live stream to end broadcasting and finalize the recording asset',
        inputSchema: {
          type: 'object',
          properties: {
            live_stream_id: {
              type: 'string',
              description: 'Mux live stream ID to mark as complete',
            },
          },
          required: ['live_stream_id'],
        },
      },
      {
        name: 'list_uploads',
        description: 'List direct upload URLs in your Mux environment with optional pagination',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Number of uploads to return (default: 25, max: 100)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
          },
        },
      },
      {
        name: 'get_upload',
        description: 'Get details and status for a specific Mux direct upload by its ID',
        inputSchema: {
          type: 'object',
          properties: {
            upload_id: {
              type: 'string',
              description: 'Mux direct upload ID',
            },
          },
          required: ['upload_id'],
        },
      },
      {
        name: 'create_direct_upload',
        description: 'Create a pre-authenticated direct upload URL that a client can use to upload a video directly to Mux without server-side proxying',
        inputSchema: {
          type: 'object',
          properties: {
            cors_origin: {
              type: 'string',
              description: 'Allowed CORS origin for browser-based uploads (e.g. https://yourapp.com)',
            },
            playback_policy: {
              type: 'string',
              description: 'Playback policy for the resulting asset: public or signed (default: public)',
            },
            mp4_support: {
              type: 'string',
              description: 'MP4 download support: none, capped-1080p (default: none)',
            },
            timeout: {
              type: 'number',
              description: 'Seconds until the upload URL expires (default: 3600, max: 86400)',
            },
            test: {
              type: 'boolean',
              description: 'Create the resulting asset as a test asset (deleted after 24h, default: false)',
            },
          },
          required: ['cors_origin'],
        },
      },
      {
        name: 'list_playback_restrictions',
        description: 'List playback restriction policies that control who can access signed playback IDs',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Number of restrictions to return (default: 25, max: 100)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
          },
        },
      },
      {
        name: 'get_monitoring_metrics',
        description: 'Get real-time video quality and performance monitoring metrics such as current viewers and rebuffering events',
        inputSchema: {
          type: 'object',
          properties: {
            metric_id: {
              type: 'string',
              description: 'Metric to query: current-concurrent-viewers, current-rebuffering-percentage, current-requests-for-first-preroll (default: current-concurrent-viewers)',
            },
          },
        },
      },
      {
        name: 'list_dimensions',
        description: 'List available Mux Data dimension keys for filtering video analytics (e.g. browser, operating system, country, cdn)',
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
        case 'list_assets':
          return this.listAssets(args);
        case 'get_asset':
          return this.getAsset(args);
        case 'create_asset':
          return this.createAsset(args);
        case 'delete_asset':
          return this.deleteAsset(args);
        case 'update_asset':
          return this.updateAsset(args);
        case 'get_asset_input_info':
          return this.getAssetInputInfo(args);
        case 'get_asset_playback_id':
          return this.getAssetPlaybackId(args);
        case 'create_asset_playback_id':
          return this.createAssetPlaybackId(args);
        case 'delete_asset_playback_id':
          return this.deleteAssetPlaybackId(args);
        case 'list_live_streams':
          return this.listLiveStreams(args);
        case 'get_live_stream':
          return this.getLiveStream(args);
        case 'create_live_stream':
          return this.createLiveStream(args);
        case 'update_live_stream':
          return this.updateLiveStream(args);
        case 'disable_live_stream':
          return this.disableLiveStream(args);
        case 'enable_live_stream':
          return this.enableLiveStream(args);
        case 'complete_live_stream':
          return this.completeLiveStream(args);
        case 'list_uploads':
          return this.listUploads(args);
        case 'get_upload':
          return this.getUpload(args);
        case 'create_direct_upload':
          return this.createDirectUpload(args);
        case 'list_playback_restrictions':
          return this.listPlaybackRestrictions(args);
        case 'get_monitoring_metrics':
          return this.getMonitoringMetrics(args);
        case 'list_dimensions':
          return this.listDimensions();
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

  private get authHeader(): string {
    return `Basic ${btoa(`${this.tokenId}:${this.tokenSecret}`)}`;
  }

  private get headers(): Record<string, string> {
    return {
      Authorization: this.authHeader,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  private async muxGet(path: string, params?: Record<string, string>): Promise<ToolResult> {
    const qs = params && Object.keys(params).length > 0 ? '?' + new URLSearchParams(params).toString() : '';
    const response = await this.fetchWithRetry(`${this.baseUrl}/${path}${qs}`, { method: 'GET', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Mux returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async muxPost(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}/${path}`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Mux returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async muxPatch(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}/${path}`, {
      method: 'PATCH',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Mux returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async muxDelete(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}/${path}`, { method: 'DELETE', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: JSON.stringify({ deleted: true }) }], isError: false };
  }

  private async muxPut(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}/${path}`, {
      method: 'PUT',
      headers: this.headers,
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Mux returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listAssets(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      limit: String((args.limit as number) || 25),
      page: String((args.page as number) || 1),
    };
    if (args.live_stream_id) params.live_stream_id = args.live_stream_id as string;
    if (args.upload_id) params.upload_id = args.upload_id as string;
    return this.muxGet('video/v1/assets', params);
  }

  private async getAsset(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.asset_id) return { content: [{ type: 'text', text: 'asset_id is required' }], isError: true };
    return this.muxGet(`video/v1/assets/${encodeURIComponent(args.asset_id as string)}`);
  }

  private async createAsset(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.input_url) return { content: [{ type: 'text', text: 'input_url is required' }], isError: true };
    const body: Record<string, unknown> = {
      inputs: [{ url: args.input_url }],
      playback_policies: [(args.playback_policy as string) || 'public'],
    };
    if (args.mp4_support) body.mp4_support = args.mp4_support;
    if (typeof args.normalize_audio === 'boolean') body.normalize_audio = args.normalize_audio;
    if (typeof args.test === 'boolean') body.test = args.test;
    return this.muxPost('video/v1/assets', body);
  }

  private async deleteAsset(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.asset_id) return { content: [{ type: 'text', text: 'asset_id is required' }], isError: true };
    return this.muxDelete(`video/v1/assets/${encodeURIComponent(args.asset_id as string)}`);
  }

  private async updateAsset(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.asset_id) return { content: [{ type: 'text', text: 'asset_id is required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.passthrough) body.passthrough = args.passthrough;
    return this.muxPatch(`video/v1/assets/${encodeURIComponent(args.asset_id as string)}`, body);
  }

  private async getAssetInputInfo(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.asset_id) return { content: [{ type: 'text', text: 'asset_id is required' }], isError: true };
    return this.muxGet(`video/v1/assets/${encodeURIComponent(args.asset_id as string)}/input-info`);
  }

  private async getAssetPlaybackId(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.asset_id || !args.playback_id) return { content: [{ type: 'text', text: 'asset_id and playback_id are required' }], isError: true };
    return this.muxGet(`video/v1/assets/${encodeURIComponent(args.asset_id as string)}/playback-ids/${encodeURIComponent(args.playback_id as string)}`);
  }

  private async createAssetPlaybackId(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.asset_id) return { content: [{ type: 'text', text: 'asset_id is required' }], isError: true };
    const body: Record<string, unknown> = {
      policy: (args.policy as string) || 'public',
    };
    return this.muxPost(`video/v1/assets/${encodeURIComponent(args.asset_id as string)}/playback-ids`, body);
  }

  private async deleteAssetPlaybackId(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.asset_id || !args.playback_id) return { content: [{ type: 'text', text: 'asset_id and playback_id are required' }], isError: true };
    return this.muxDelete(`video/v1/assets/${encodeURIComponent(args.asset_id as string)}/playback-ids/${encodeURIComponent(args.playback_id as string)}`);
  }

  private async listLiveStreams(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      limit: String((args.limit as number) || 25),
      page: String((args.page as number) || 1),
    };
    if (args.status) params.status = args.status as string;
    if (args.stream_key) params.stream_key = args.stream_key as string;
    return this.muxGet('video/v1/live-streams', params);
  }

  private async getLiveStream(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.live_stream_id) return { content: [{ type: 'text', text: 'live_stream_id is required' }], isError: true };
    return this.muxGet(`video/v1/live-streams/${encodeURIComponent(args.live_stream_id as string)}`);
  }

  private async createLiveStream(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {
      playback_policies: [(args.playback_policy as string) || 'public'],
      latency_mode: (args.latency_mode as string) || 'low',
    };
    if (args.reconnect_window) body.reconnect_window = args.reconnect_window;
    if (typeof args.test === 'boolean') body.test = args.test;
    if (args.passthrough) body.passthrough = args.passthrough;
    return this.muxPost('video/v1/live-streams', body);
  }

  private async updateLiveStream(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.live_stream_id) return { content: [{ type: 'text', text: 'live_stream_id is required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.reconnect_window) body.reconnect_window = args.reconnect_window;
    if (args.latency_mode) body.latency_mode = args.latency_mode;
    if (args.passthrough) body.passthrough = args.passthrough;
    return this.muxPatch(`video/v1/live-streams/${encodeURIComponent(args.live_stream_id as string)}`, body);
  }

  private async disableLiveStream(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.live_stream_id) return { content: [{ type: 'text', text: 'live_stream_id is required' }], isError: true };
    return this.muxPut(`video/v1/live-streams/${encodeURIComponent(args.live_stream_id as string)}/disable`);
  }

  private async enableLiveStream(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.live_stream_id) return { content: [{ type: 'text', text: 'live_stream_id is required' }], isError: true };
    return this.muxPut(`video/v1/live-streams/${encodeURIComponent(args.live_stream_id as string)}/enable`);
  }

  private async completeLiveStream(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.live_stream_id) return { content: [{ type: 'text', text: 'live_stream_id is required' }], isError: true };
    return this.muxPut(`video/v1/live-streams/${encodeURIComponent(args.live_stream_id as string)}/complete`);
  }

  private async listUploads(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      limit: String((args.limit as number) || 25),
      page: String((args.page as number) || 1),
    };
    return this.muxGet('video/v1/uploads', params);
  }

  private async getUpload(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.upload_id) return { content: [{ type: 'text', text: 'upload_id is required' }], isError: true };
    return this.muxGet(`video/v1/uploads/${encodeURIComponent(args.upload_id as string)}`);
  }

  private async createDirectUpload(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.cors_origin) return { content: [{ type: 'text', text: 'cors_origin is required' }], isError: true };
    const body: Record<string, unknown> = {
      cors_origin: args.cors_origin,
      new_asset_settings: {
        playback_policy: [(args.playback_policy as string) || 'public'],
      },
    };
    if (args.mp4_support) (body.new_asset_settings as Record<string, unknown>).mp4_support = args.mp4_support;
    if (typeof args.test === 'boolean') (body.new_asset_settings as Record<string, unknown>).test = args.test;
    if (args.timeout) body.timeout = args.timeout;
    return this.muxPost('video/v1/uploads', body);
  }

  private async listPlaybackRestrictions(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      limit: String((args.limit as number) || 25),
      page: String((args.page as number) || 1),
    };
    return this.muxGet('video/v1/playback-restrictions', params);
  }

  private async getMonitoringMetrics(args: Record<string, unknown>): Promise<ToolResult> {
    const metricId = (args.metric_id as string) || 'current-concurrent-viewers';
    return this.muxGet(`data/v1/monitoring/metrics/${encodeURIComponent(metricId)}/breakdown`);
  }

  private async listDimensions(): Promise<ToolResult> {
    return this.muxGet('data/v1/dimensions');
  }
}

/**
 * Shotstack MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: No official Shotstack MCP server exists as of March 2026.
// Our adapter covers: 5 tools for video/image/audio rendering, render status polling,
//   and asset management (retrieve and delete rendered assets).
//   Community servers: none found covering Shotstack v1 API.
// Recommendation: Use this adapter for programmatic video editing and rendering pipelines.
//
// Base URL: https://api.shotstack.io/{version}  (version: v1 for production, stage for sandbox)
// Auth: x-api-key header (DeveloperKey)
// Docs: https://shotstack.io/docs/api/
// Rate limits: Free tier limited. Production plans from $49/mo. Enterprise: contact Shotstack.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface ShotstackConfig {
  /** Shotstack API key */
  apiKey: string;
  /** API environment: 'v1' (production) or 'stage' (sandbox — default) */
  environment?: 'v1' | 'stage';
  /** Optional base URL override (default: https://api.shotstack.io) */
  baseUrl?: string;
}

export class ShotstackMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly environment: string;
  private readonly baseUrl: string;

  constructor(config: ShotstackConfig) {
    super();
    this.apiKey = config.apiKey;
    this.environment = config.environment ?? 'stage';
    this.baseUrl = config.baseUrl ?? 'https://api.shotstack.io';
  }

  static catalog() {
    return {
      name: 'shotstack',
      displayName: 'Shotstack',
      version: '1.0.0',
      category: 'media',
      keywords: [
        'shotstack', 'video', 'render', 'edit', 'timeline', 'media', 'mp4',
        'gif', 'image', 'audio', 'clip', 'transition', 'effect', 'template',
        'automated', 'programmatic', 'production', 'asset', 'thumbnail', 'poster',
      ],
      toolNames: [
        'render_video', 'get_render_status',
        'get_asset', 'get_asset_by_render_id', 'delete_asset',
      ],
      description: 'Shotstack cloud video editing API: render videos programmatically from timelines of clips, images, titles, and audio. Poll render status and manage rendered assets.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'render_video',
        description: 'Submit a Shotstack render job — define a timeline of video/image/title/audio clips with transitions and effects to produce an mp4, gif, jpg, or png output',
        inputSchema: {
          type: 'object',
          properties: {
            timeline: {
              type: 'object',
              description: 'Timeline object defining tracks and clips. Each track is an array of clips with asset (video/image/title/html), start time, length, effects, and transitions.',
              properties: {
                soundtrack: {
                  type: 'object',
                  description: 'Background audio soundtrack: { src: string (mp3 URL), effect: "fadeIn"|"fadeOut"|"fadeInFadeOut", volume: number 0-1 }',
                },
                background: {
                  type: 'string',
                  description: 'Background color hex (default: "#000000")',
                },
                tracks: {
                  type: 'array',
                  description: 'Array of track objects, each with a clips array. Higher index tracks render on top.',
                  items: {
                    type: 'object',
                    properties: {
                      clips: {
                        type: 'array',
                        description: 'Array of clip objects with asset, start, length, effect, filter, fit, position, opacity, and transition.',
                        items: { type: 'object' },
                      },
                    },
                  },
                },
              },
            },
            output: {
              type: 'object',
              description: 'Output settings for the render.',
              properties: {
                format: {
                  type: 'string',
                  description: 'Output format: mp4, gif, jpg, png, bmp, or mp3 (default: mp4)',
                },
                resolution: {
                  type: 'string',
                  description: 'Output resolution: preview (512x288), sd (1024x576), hd (1280x720), 1080 (1920x1080), or 4k (3840x2160) (default: hd)',
                },
                aspectRatio: {
                  type: 'string',
                  description: 'Output aspect ratio: 16:9, 9:16, 1:1, 4:5, or 2.39:1 (default: 16:9)',
                },
                fps: {
                  type: 'number',
                  description: 'Frames per second override (e.g. 24, 25, 30)',
                },
                quality: {
                  type: 'string',
                  description: 'Output quality: low, medium, or high (default: medium)',
                },
                scaleTo: {
                  type: 'string',
                  description: 'Scale output to a specific resolution preset instead of using resolution field',
                },
              },
            },
            callback: {
              type: 'string',
              description: 'Webhook URL to POST render status notifications to when the render completes',
            },
            disk: {
              type: 'string',
              description: 'Disk storage type for processing: local or mount (default: local)',
            },
          },
          required: ['timeline', 'output'],
        },
      },
      {
        name: 'get_render_status',
        description: 'Get the current status of a Shotstack render job — returns queued, fetching, rendering, saving, done, or failed status with output URL when complete',
        inputSchema: {
          type: 'object',
          properties: {
            render_id: {
              type: 'string',
              description: 'Render job ID returned by render_video (e.g. "2abd5c11-0f3d-4c6d-ba20-235fc9b8e8d7")',
            },
            data: {
              type: 'boolean',
              description: 'Include the full render data in the response (default: false)',
            },
          },
          required: ['render_id'],
        },
      },
      {
        name: 'get_asset',
        description: 'Get metadata for a specific Shotstack rendered asset by its asset ID — includes status, URL, and file details',
        inputSchema: {
          type: 'object',
          properties: {
            asset_id: {
              type: 'string',
              description: 'Shotstack asset ID',
            },
          },
          required: ['asset_id'],
        },
      },
      {
        name: 'get_asset_by_render_id',
        description: 'Get the rendered asset associated with a specific render job ID — useful to retrieve the output URL after a render completes',
        inputSchema: {
          type: 'object',
          properties: {
            render_id: {
              type: 'string',
              description: 'Render job ID from a render_video response',
            },
          },
          required: ['render_id'],
        },
      },
      {
        name: 'delete_asset',
        description: 'Delete a Shotstack rendered asset from storage by its asset ID — frees storage quota',
        inputSchema: {
          type: 'object',
          properties: {
            asset_id: {
              type: 'string',
              description: 'Shotstack asset ID to delete',
            },
          },
          required: ['asset_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'render_video':            return this.renderVideo(args);
        case 'get_render_status':       return this.getRenderStatus(args);
        case 'get_asset':               return this.getAsset(args);
        case 'get_asset_by_render_id':  return this.getAssetByRenderId(args);
        case 'delete_asset':            return this.deleteAsset(args);
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

  private apiUrl(path: string): string {
    return `${this.baseUrl}/${this.environment}${path}`;
  }

  private authHeaders(): Record<string, string> {
    return { 'x-api-key': this.apiKey };
  }

  private async get(path: string, params: Record<string, string | boolean | undefined> = {}): Promise<ToolResult> {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) qs.set(k, String(v));
    }
    const qsStr = qs.toString();
    const url = this.apiUrl(path) + (qsStr ? `?${qsStr}` : '');
    const response = await this.fetchWithRetry(url, {
      method: 'GET',
      headers: { ...this.authHeaders(), Accept: 'application/json' },
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Shotstack returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async post(path: string, body: unknown): Promise<ToolResult> {
    const url = this.apiUrl(path);
    const response = await this.fetchWithRetry(url, {
      method: 'POST',
      headers: { ...this.authHeaders(), 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Shotstack returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async del(path: string): Promise<ToolResult> {
    const url = this.apiUrl(path);
    const response = await this.fetchWithRetry(url, {
      method: 'DELETE',
      headers: { ...this.authHeaders(), Accept: 'application/json' },
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    // DELETE may return 204 No Content
    if (response.status === 204) {
      return { content: [{ type: 'text', text: JSON.stringify({ success: true, message: 'Asset deleted' }) }], isError: false };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Shotstack returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async renderVideo(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.timeline) return { content: [{ type: 'text', text: 'timeline is required' }], isError: true };
    if (!args.output) return { content: [{ type: 'text', text: 'output is required' }], isError: true };
    const body: Record<string, unknown> = {
      timeline: args.timeline,
      output: args.output,
    };
    if (args.callback) body.callback = args.callback;
    if (args.disk) body.disk = args.disk;
    return this.post('/render', body);
  }

  private async getRenderStatus(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.render_id) return { content: [{ type: 'text', text: 'render_id is required' }], isError: true };
    return this.get(`/render/${encodeURIComponent(args.render_id as string)}`, {
      data: args.data ? 'true' : undefined,
    });
  }

  private async getAsset(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.asset_id) return { content: [{ type: 'text', text: 'asset_id is required' }], isError: true };
    return this.get(`/assets/${encodeURIComponent(args.asset_id as string)}`);
  }

  private async getAssetByRenderId(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.render_id) return { content: [{ type: 'text', text: 'render_id is required' }], isError: true };
    return this.get(`/assets/render/${encodeURIComponent(args.render_id as string)}`);
  }

  private async deleteAsset(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.asset_id) return { content: [{ type: 'text', text: 'asset_id is required' }], isError: true };
    return this.del(`/assets/${encodeURIComponent(args.asset_id as string)}`);
  }
}

/**
 * Clarify MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// No official Clarify (clarify.io) MCP server was found on GitHub as of 2026-03-28.
// Our adapter covers: 21 tools (bundles, tracks, metadata, insights, search, reports).
// Vendor MCP covers: 0 tools (none exists).
// Recommendation: use-rest-api — no official MCP server exists.
//
// Base URL: https://api.clarify.io
// Auth: HTTP Basic Auth — API key as username, empty string as password.
//   Authorization: Basic base64(apiKey + ":")
//   API key obtained from Clarify developer dashboard at https://developer.clarify.io
// Docs: https://developer.clarify.io/docs/
// Rate limits: Not publicly documented; contact support@clarify.io for enterprise limits.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface ClarifyConfig {
  apiKey: string;
  /** Optional base URL override (default: https://api.clarify.io) */
  baseUrl?: string;
}

export class ClarifyMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: ClarifyConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? 'https://api.clarify.io';
  }

  static catalog() {
    return {
      name: 'clarify',
      displayName: 'Clarify',
      version: '1.0.0',
      category: 'ai',
      keywords: [
        'clarify', 'audio', 'video', 'speech', 'transcription', 'search',
        'media', 'bundles', 'tracks', 'insights', 'metadata', 'content',
        'ai', 'machine-learning', 'nlp', 'natural-language', 'analysis',
        'trends', 'reports', 'scores', 'language-detection',
      ],
      toolNames: [
        'list_bundles', 'create_bundle', 'get_bundle', 'update_bundle', 'delete_bundle',
        'get_bundle_metadata', 'update_bundle_metadata', 'delete_bundle_metadata',
        'get_bundle_tracks', 'add_bundle_track', 'update_bundle_tracks',
        'get_bundle_track', 'update_track_media', 'delete_bundle_track', 'delete_bundle_tracks',
        'get_bundle_insights', 'request_bundle_insight', 'get_bundle_insight',
        'search_bundles', 'get_scores_report', 'get_trends_report',
      ],
      description: 'Clarify audio and video intelligence API: upload media bundles, manage tracks and metadata, run AI insights (transcription, sentiment, entity extraction), and search/analyze media content at scale.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_bundles',
        description: 'List all media bundles in the Clarify account with optional pagination',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of bundles to return per page (default: 10)',
            },
            iterator: {
              type: 'string',
              description: 'Pagination iterator token returned from a previous list response',
            },
            embed: {
              type: 'string',
              description: 'Comma-separated list of related resources to embed (e.g. "items")',
            },
          },
        },
      },
      {
        name: 'create_bundle',
        description: 'Create a new media bundle with an optional name, media URL, language, and metadata',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Display name for the bundle',
            },
            media_url: {
              type: 'string',
              description: 'Publicly accessible URL to the audio or video file to process',
            },
            audio_channel: {
              type: 'string',
              description: 'Audio channel to use: left, right, or split (default: split)',
            },
            audio_language: {
              type: 'string',
              description: 'BCP-47 language code for audio (e.g. en-US, es-ES)',
            },
            label: {
              type: 'string',
              description: 'Label or tag to categorize the bundle',
            },
            metadata: {
              type: 'string',
              description: 'JSON string of user-defined key-value metadata for search and filtering',
            },
            notify_url: {
              type: 'string',
              description: 'Webhook URL to call when processing is complete',
            },
            external_id: {
              type: 'string',
              description: 'Your own external ID to associate with this bundle',
            },
          },
        },
      },
      {
        name: 'get_bundle',
        description: 'Get a media bundle by ID, including status, tracks, and optional embedded data',
        inputSchema: {
          type: 'object',
          properties: {
            bundle_id: {
              type: 'string',
              description: 'Unique ID of the bundle',
            },
            embed: {
              type: 'string',
              description: 'Comma-separated related resources to embed (e.g. "tracks,metadata")',
            },
          },
          required: ['bundle_id'],
        },
      },
      {
        name: 'update_bundle',
        description: 'Update the name, notify URL, or external ID of an existing bundle',
        inputSchema: {
          type: 'object',
          properties: {
            bundle_id: {
              type: 'string',
              description: 'Unique ID of the bundle to update',
            },
            name: {
              type: 'string',
              description: 'New display name for the bundle',
            },
            notify_url: {
              type: 'string',
              description: 'New webhook URL for processing completion notifications',
            },
            external_id: {
              type: 'string',
              description: 'New external ID to associate with the bundle',
            },
            version: {
              type: 'number',
              description: 'Version of the bundle for optimistic concurrency control',
            },
          },
          required: ['bundle_id'],
        },
      },
      {
        name: 'delete_bundle',
        description: 'Delete a bundle and all its associated tracks and metadata from Clarify',
        inputSchema: {
          type: 'object',
          properties: {
            bundle_id: {
              type: 'string',
              description: 'Unique ID of the bundle to delete',
            },
          },
          required: ['bundle_id'],
        },
      },
      {
        name: 'get_bundle_metadata',
        description: 'Get the user-defined JSON metadata for a bundle',
        inputSchema: {
          type: 'object',
          properties: {
            bundle_id: {
              type: 'string',
              description: 'Unique ID of the bundle',
            },
          },
          required: ['bundle_id'],
        },
      },
      {
        name: 'update_bundle_metadata',
        description: 'Update (replace) the user-defined metadata for a bundle — useful for tagging and filtering',
        inputSchema: {
          type: 'object',
          properties: {
            bundle_id: {
              type: 'string',
              description: 'Unique ID of the bundle',
            },
            data: {
              type: 'string',
              description: 'JSON string of key-value metadata to set (replaces existing metadata)',
            },
            version: {
              type: 'number',
              description: 'Version of the metadata for optimistic concurrency control',
            },
          },
          required: ['bundle_id', 'data'],
        },
      },
      {
        name: 'delete_bundle_metadata',
        description: 'Delete all metadata from a bundle (sets metadata to empty object {})',
        inputSchema: {
          type: 'object',
          properties: {
            bundle_id: {
              type: 'string',
              description: 'Unique ID of the bundle',
            },
          },
          required: ['bundle_id'],
        },
      },
      {
        name: 'get_bundle_tracks',
        description: 'Get all media tracks for a bundle, including processing status and media URLs',
        inputSchema: {
          type: 'object',
          properties: {
            bundle_id: {
              type: 'string',
              description: 'Unique ID of the bundle',
            },
          },
          required: ['bundle_id'],
        },
      },
      {
        name: 'add_bundle_track',
        description: 'Add a new media track to an existing bundle (bundles support up to 12 tracks)',
        inputSchema: {
          type: 'object',
          properties: {
            bundle_id: {
              type: 'string',
              description: 'Unique ID of the bundle',
            },
            media_url: {
              type: 'string',
              description: 'Publicly accessible URL to the audio or video file for this track',
            },
            label: {
              type: 'string',
              description: 'Label to identify this track (e.g. "speaker_1", "phone_channel")',
            },
            audio_channel: {
              type: 'string',
              description: 'Audio channel: left, right, or split',
            },
            audio_language: {
              type: 'string',
              description: 'BCP-47 language code for this track (e.g. en-US)',
            },
            start_time: {
              type: 'number',
              description: 'Start time offset in seconds (for multi-part media)',
            },
            parts_pending: {
              type: 'boolean',
              description: 'Set to true if more media parts will be added to this track',
            },
            track: {
              type: 'number',
              description: 'Explicit track index (0-based); omit to auto-append',
            },
          },
          required: ['bundle_id', 'media_url'],
        },
      },
      {
        name: 'update_bundle_tracks',
        description: 'Mark all tracks in a bundle as complete (parts_complete=true) to trigger processing',
        inputSchema: {
          type: 'object',
          properties: {
            bundle_id: {
              type: 'string',
              description: 'Unique ID of the bundle',
            },
            parts_complete: {
              type: 'boolean',
              description: 'Set to true to finalize all tracks and queue them for processing',
            },
            version: {
              type: 'number',
              description: 'Version of the tracks for optimistic concurrency control',
            },
          },
          required: ['bundle_id', 'parts_complete'],
        },
      },
      {
        name: 'get_bundle_track',
        description: 'Get a single media track within a bundle by track ID',
        inputSchema: {
          type: 'object',
          properties: {
            bundle_id: {
              type: 'string',
              description: 'Unique ID of the bundle',
            },
            track_id: {
              type: 'string',
              description: 'Unique ID of the track within the bundle',
            },
          },
          required: ['bundle_id', 'track_id'],
        },
      },
      {
        name: 'update_track_media',
        description: 'Add media (next part) to an existing track that has parts_pending=true',
        inputSchema: {
          type: 'object',
          properties: {
            bundle_id: {
              type: 'string',
              description: 'Unique ID of the bundle',
            },
            track_id: {
              type: 'string',
              description: 'Unique ID of the track to add media to',
            },
            media_url: {
              type: 'string',
              description: 'Publicly accessible URL to the next media part',
            },
            audio_channel: {
              type: 'string',
              description: 'Audio channel: left, right, or split',
            },
            audio_language: {
              type: 'string',
              description: 'BCP-47 language code for the media',
            },
            start_time: {
              type: 'number',
              description: 'Start time offset in seconds for this part',
            },
            parts_pending: {
              type: 'boolean',
              description: 'Set to false to indicate this is the final part',
            },
          },
          required: ['bundle_id', 'track_id', 'media_url'],
        },
      },
      {
        name: 'delete_bundle_track',
        description: 'Delete a single track from a bundle by track ID',
        inputSchema: {
          type: 'object',
          properties: {
            bundle_id: {
              type: 'string',
              description: 'Unique ID of the bundle',
            },
            track_id: {
              type: 'string',
              description: 'Unique ID of the track to delete',
            },
          },
          required: ['bundle_id', 'track_id'],
        },
      },
      {
        name: 'delete_bundle_tracks',
        description: 'Delete all tracks from a bundle',
        inputSchema: {
          type: 'object',
          properties: {
            bundle_id: {
              type: 'string',
              description: 'Unique ID of the bundle whose tracks should all be deleted',
            },
          },
          required: ['bundle_id'],
        },
      },
      {
        name: 'get_bundle_insights',
        description: 'Get available AI insights for a bundle (transcription status, sentiment, entities, etc.)',
        inputSchema: {
          type: 'object',
          properties: {
            bundle_id: {
              type: 'string',
              description: 'Unique ID of the bundle',
            },
          },
          required: ['bundle_id'],
        },
      },
      {
        name: 'request_bundle_insight',
        description: 'Request a specific AI insight to be run on a bundle (e.g. transcript, sentiment)',
        inputSchema: {
          type: 'object',
          properties: {
            bundle_id: {
              type: 'string',
              description: 'Unique ID of the bundle',
            },
            insight: {
              type: 'string',
              description: 'Name of the insight to request (e.g. "transcript", "sentiment", "entities")',
            },
          },
          required: ['bundle_id', 'insight'],
        },
      },
      {
        name: 'get_bundle_insight',
        description: 'Get the result of a specific AI insight for a bundle by insight ID',
        inputSchema: {
          type: 'object',
          properties: {
            bundle_id: {
              type: 'string',
              description: 'Unique ID of the bundle',
            },
            insight_id: {
              type: 'string',
              description: 'Insight ID (e.g. "transcript", returned from get_bundle_insights)',
            },
          },
          required: ['bundle_id', 'insight_id'],
        },
      },
      {
        name: 'search_bundles',
        description: 'Full-text search across audio and video content in bundles — returns matching bundles with hit highlights',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Text to search for in transcribed audio/video and metadata',
            },
            query_fields: {
              type: 'string',
              description: 'Comma-separated fields to search: audio, metadata (default: both)',
            },
            filter: {
              type: 'string',
              description: 'Filter expression to narrow results (e.g. by metadata fields)',
            },
            language: {
              type: 'string',
              description: 'BCP-47 language code to restrict search to a specific language',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results per page',
            },
            iterator: {
              type: 'string',
              description: 'Pagination iterator token from a previous search response',
            },
            embed: {
              type: 'string',
              description: 'Comma-separated related resources to embed in results',
            },
          },
        },
      },
      {
        name: 'get_scores_report',
        description: '(Beta) Generate a group scores report analyzing bundle content over time periods, grouped by a metadata field',
        inputSchema: {
          type: 'object',
          properties: {
            interval: {
              type: 'string',
              description: 'Time interval for grouping (e.g. "day", "week", "month")',
            },
            score_field: {
              type: 'string',
              description: 'Metadata field containing numeric scores to aggregate',
            },
            group_field: {
              type: 'string',
              description: 'Metadata field to group results by',
            },
            filter: {
              type: 'string',
              description: 'Filter expression to narrow which bundles are included',
            },
            language: {
              type: 'string',
              description: 'BCP-47 language code for language-specific analysis',
            },
          },
          required: ['interval', 'score_field', 'group_field'],
        },
      },
      {
        name: 'get_trends_report',
        description: '(Beta) Generate a trends report analyzing how content topics or keywords change over time periods',
        inputSchema: {
          type: 'object',
          properties: {
            interval: {
              type: 'string',
              description: 'Time interval for each period (e.g. "day", "week", "month")',
            },
            content: {
              type: 'string',
              description: 'Text or keyword to track trends for over time',
            },
            filter: {
              type: 'string',
              description: 'Filter expression to narrow which bundles are included',
            },
            language: {
              type: 'string',
              description: 'BCP-47 language code for language-specific analysis',
            },
          },
          required: ['interval'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_bundles': return this.listBundles(args);
        case 'create_bundle': return this.createBundle(args);
        case 'get_bundle': return this.getBundle(args);
        case 'update_bundle': return this.updateBundle(args);
        case 'delete_bundle': return this.deleteBundle(args);
        case 'get_bundle_metadata': return this.getBundleMetadata(args);
        case 'update_bundle_metadata': return this.updateBundleMetadata(args);
        case 'delete_bundle_metadata': return this.deleteBundleMetadata(args);
        case 'get_bundle_tracks': return this.getBundleTracks(args);
        case 'add_bundle_track': return this.addBundleTrack(args);
        case 'update_bundle_tracks': return this.updateBundleTracks(args);
        case 'get_bundle_track': return this.getBundleTrack(args);
        case 'update_track_media': return this.updateTrackMedia(args);
        case 'delete_bundle_track': return this.deleteBundleTrack(args);
        case 'delete_bundle_tracks': return this.deleteBundleTracks(args);
        case 'get_bundle_insights': return this.getBundleInsights(args);
        case 'request_bundle_insight': return this.requestBundleInsight(args);
        case 'get_bundle_insight': return this.getBundleInsight(args);
        case 'search_bundles': return this.searchBundles(args);
        case 'get_scores_report': return this.getScoresReport(args);
        case 'get_trends_report': return this.getTrendsReport(args);
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

  private authHeader(): string {
    return 'Basic ' + Buffer.from(`${this.apiKey}:`).toString('base64');
  }

  private async request(
    method: string,
    path: string,
    body?: Record<string, unknown>,
    queryParams?: Record<string, string>,
  ): Promise<ToolResult> {
    let url = `${this.baseUrl}${path}`;
    if (queryParams && Object.keys(queryParams).length > 0) {
      const qs = new URLSearchParams(queryParams);
      url += `?${qs.toString()}`;
    }

    const isFormData = method !== 'GET' && method !== 'DELETE' && body !== undefined;
    const headers: Record<string, string> = {
      Authorization: this.authHeader(),
    };

    let fetchBody: string | undefined;
    if (isFormData) {
      headers['Content-Type'] = 'application/x-www-form-urlencoded';
      const form = new URLSearchParams();
      for (const [k, v] of Object.entries(body ?? {})) {
        if (v !== undefined && v !== null) form.append(k, String(v));
      }
      fetchBody = form.toString();
    }

    const response = await this.fetchWithRetry(url, {
      method,
      headers,
      body: fetchBody,
    });

    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }
    if (response.status === 204) {
      return { content: [{ type: 'text', text: 'Success (no content)' }], isError: false };
    }
    let data: unknown;
    try {
      data = await response.json();
    } catch {
      return { content: [{ type: 'text', text: `Clarify returned non-JSON (HTTP ${response.status})` }], isError: true };
    }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listBundles(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (args.limit !== undefined) params.limit = String(args.limit);
    if (args.iterator) params.iterator = args.iterator as string;
    if (args.embed) params.embed = args.embed as string;
    return this.request('GET', '/v1/bundles', undefined, params);
  }

  private async createBundle(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {};
    if (args.name) body.name = args.name;
    if (args.media_url) body.media_url = args.media_url;
    if (args.audio_channel) body.audio_channel = args.audio_channel;
    if (args.audio_language) body.audio_language = args.audio_language;
    if (args.label) body.label = args.label;
    if (args.metadata) body.metadata = args.metadata;
    if (args.notify_url) body.notify_url = args.notify_url;
    if (args.external_id) body.external_id = args.external_id;
    return this.request('POST', '/v1/bundles', body);
  }

  private async getBundle(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.bundle_id) return { content: [{ type: 'text', text: 'bundle_id is required' }], isError: true };
    const params: Record<string, string> = {};
    if (args.embed) params.embed = args.embed as string;
    return this.request('GET', `/v1/bundles/${encodeURIComponent(args.bundle_id as string)}`, undefined, params);
  }

  private async updateBundle(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.bundle_id) return { content: [{ type: 'text', text: 'bundle_id is required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.name) body.name = args.name;
    if (args.notify_url) body.notify_url = args.notify_url;
    if (args.external_id) body.external_id = args.external_id;
    if (args.version !== undefined) body.version = args.version;
    return this.request('PUT', `/v1/bundles/${encodeURIComponent(args.bundle_id as string)}`, body);
  }

  private async deleteBundle(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.bundle_id) return { content: [{ type: 'text', text: 'bundle_id is required' }], isError: true };
    return this.request('DELETE', `/v1/bundles/${encodeURIComponent(args.bundle_id as string)}`);
  }

  private async getBundleMetadata(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.bundle_id) return { content: [{ type: 'text', text: 'bundle_id is required' }], isError: true };
    return this.request('GET', `/v1/bundles/${encodeURIComponent(args.bundle_id as string)}/metadata`);
  }

  private async updateBundleMetadata(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.bundle_id) return { content: [{ type: 'text', text: 'bundle_id is required' }], isError: true };
    if (!args.data) return { content: [{ type: 'text', text: 'data is required' }], isError: true };
    const body: Record<string, unknown> = { data: args.data };
    if (args.version !== undefined) body.version = args.version;
    return this.request('PUT', `/v1/bundles/${encodeURIComponent(args.bundle_id as string)}/metadata`, body);
  }

  private async deleteBundleMetadata(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.bundle_id) return { content: [{ type: 'text', text: 'bundle_id is required' }], isError: true };
    return this.request('DELETE', `/v1/bundles/${encodeURIComponent(args.bundle_id as string)}/metadata`);
  }

  private async getBundleTracks(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.bundle_id) return { content: [{ type: 'text', text: 'bundle_id is required' }], isError: true };
    return this.request('GET', `/v1/bundles/${encodeURIComponent(args.bundle_id as string)}/tracks`);
  }

  private async addBundleTrack(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.bundle_id) return { content: [{ type: 'text', text: 'bundle_id is required' }], isError: true };
    if (!args.media_url) return { content: [{ type: 'text', text: 'media_url is required' }], isError: true };
    const body: Record<string, unknown> = { media_url: args.media_url };
    if (args.label) body.label = args.label;
    if (args.audio_channel) body.audio_channel = args.audio_channel;
    if (args.audio_language) body.audio_language = args.audio_language;
    if (args.start_time !== undefined) body.start_time = args.start_time;
    if (args.parts_pending !== undefined) body.parts_pending = args.parts_pending;
    if (args.track !== undefined) body.track = args.track;
    if (args.version !== undefined) body.version = args.version;
    return this.request('POST', `/v1/bundles/${encodeURIComponent(args.bundle_id as string)}/tracks`, body);
  }

  private async updateBundleTracks(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.bundle_id) return { content: [{ type: 'text', text: 'bundle_id is required' }], isError: true };
    if (args.parts_complete === undefined) return { content: [{ type: 'text', text: 'parts_complete is required' }], isError: true };
    const body: Record<string, unknown> = { parts_complete: args.parts_complete };
    if (args.version !== undefined) body.version = args.version;
    return this.request('PUT', `/v1/bundles/${encodeURIComponent(args.bundle_id as string)}/tracks`, body);
  }

  private async getBundleTrack(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.bundle_id) return { content: [{ type: 'text', text: 'bundle_id is required' }], isError: true };
    if (!args.track_id) return { content: [{ type: 'text', text: 'track_id is required' }], isError: true };
    return this.request('GET', `/v1/bundles/${encodeURIComponent(args.bundle_id as string)}/tracks/${encodeURIComponent(args.track_id as string)}`);
  }

  private async updateTrackMedia(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.bundle_id) return { content: [{ type: 'text', text: 'bundle_id is required' }], isError: true };
    if (!args.track_id) return { content: [{ type: 'text', text: 'track_id is required' }], isError: true };
    if (!args.media_url) return { content: [{ type: 'text', text: 'media_url is required' }], isError: true };
    const body: Record<string, unknown> = { media_url: args.media_url };
    if (args.audio_channel) body.audio_channel = args.audio_channel;
    if (args.audio_language) body.audio_language = args.audio_language;
    if (args.start_time !== undefined) body.start_time = args.start_time;
    if (args.parts_pending !== undefined) body.parts_pending = args.parts_pending;
    return this.request('PUT', `/v1/bundles/${encodeURIComponent(args.bundle_id as string)}/tracks/${encodeURIComponent(args.track_id as string)}`, body);
  }

  private async deleteBundleTrack(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.bundle_id) return { content: [{ type: 'text', text: 'bundle_id is required' }], isError: true };
    if (!args.track_id) return { content: [{ type: 'text', text: 'track_id is required' }], isError: true };
    return this.request('DELETE', `/v1/bundles/${encodeURIComponent(args.bundle_id as string)}/tracks/${encodeURIComponent(args.track_id as string)}`);
  }

  private async deleteBundleTracks(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.bundle_id) return { content: [{ type: 'text', text: 'bundle_id is required' }], isError: true };
    return this.request('DELETE', `/v1/bundles/${encodeURIComponent(args.bundle_id as string)}/tracks`);
  }

  private async getBundleInsights(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.bundle_id) return { content: [{ type: 'text', text: 'bundle_id is required' }], isError: true };
    return this.request('GET', `/v1/bundles/${encodeURIComponent(args.bundle_id as string)}/insights`);
  }

  private async requestBundleInsight(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.bundle_id) return { content: [{ type: 'text', text: 'bundle_id is required' }], isError: true };
    if (!args.insight) return { content: [{ type: 'text', text: 'insight is required' }], isError: true };
    const body: Record<string, unknown> = { insight: args.insight };
    return this.request('POST', `/v1/bundles/${encodeURIComponent(args.bundle_id as string)}/insights`, body);
  }

  private async getBundleInsight(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.bundle_id) return { content: [{ type: 'text', text: 'bundle_id is required' }], isError: true };
    if (!args.insight_id) return { content: [{ type: 'text', text: 'insight_id is required' }], isError: true };
    return this.request('GET', `/v1/bundles/${encodeURIComponent(args.bundle_id as string)}/insights/${encodeURIComponent(args.insight_id as string)}`);
  }

  private async searchBundles(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (args.query) params.query = args.query as string;
    if (args.query_fields) params.query_fields = args.query_fields as string;
    if (args.filter) params.filter = args.filter as string;
    if (args.language) params.language = args.language as string;
    if (args.limit !== undefined) params.limit = String(args.limit);
    if (args.iterator) params.iterator = args.iterator as string;
    if (args.embed) params.embed = args.embed as string;
    return this.request('GET', '/v1/search', undefined, params);
  }

  private async getScoresReport(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.interval) return { content: [{ type: 'text', text: 'interval is required' }], isError: true };
    if (!args.score_field) return { content: [{ type: 'text', text: 'score_field is required' }], isError: true };
    if (!args.group_field) return { content: [{ type: 'text', text: 'group_field is required' }], isError: true };
    const params: Record<string, string> = {
      interval: args.interval as string,
      score_field: args.score_field as string,
      group_field: args.group_field as string,
    };
    if (args.filter) params.filter = args.filter as string;
    if (args.language) params.language = args.language as string;
    return this.request('GET', '/v1/reports/scores', undefined, params);
  }

  private async getTrendsReport(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.interval) return { content: [{ type: 'text', text: 'interval is required' }], isError: true };
    const params: Record<string, string> = { interval: args.interval as string };
    if (args.content) params.content = args.content as string;
    if (args.filter) params.filter = args.filter as string;
    if (args.language) params.language = args.language as string;
    return this.request('GET', '/v1/reports/trends', undefined, params);
  }
}

/**
 * Loom MCP Server
 * Loom Public API adapter for accessing videos, transcripts, and folders
 *
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */
import { ToolDefinition, ToolResult } from './types.js';

interface LoomConfig {
  accessToken: string;
}

export class LoomMCPServer {
  private readonly baseUrl = 'https://developer.loom.com/v1';
  private readonly headers: Record<string, string>;

  constructor(config: LoomConfig) {
    this.headers = {
      Authorization: `Bearer ${config.accessToken}`,
      'Content-Type': 'application/json',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_videos',
        description: 'List videos accessible to the authenticated Loom user',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of videos to return (default: 20)',
            },
            nextToken: {
              type: 'string',
              description: 'Pagination cursor token',
            },
            folderId: {
              type: 'string',
              description: 'Filter videos by folder ID',
            },
          },
        },
      },
      {
        name: 'get_video',
        description: 'Get metadata and details for a specific Loom video',
        inputSchema: {
          type: 'object',
          properties: {
            videoId: {
              type: 'string',
              description: 'The Loom video ID',
            },
          },
          required: ['videoId'],
        },
      },
      {
        name: 'get_video_transcript',
        description: 'Retrieve the transcript for a Loom video',
        inputSchema: {
          type: 'object',
          properties: {
            videoId: {
              type: 'string',
              description: 'The Loom video ID',
            },
          },
          required: ['videoId'],
        },
      },
      {
        name: 'list_folders',
        description: 'List folders in the authenticated user\'s Loom workspace',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of folders to return (default: 20)',
            },
            nextToken: {
              type: 'string',
              description: 'Pagination cursor token',
            },
          },
        },
      },
      {
        name: 'get_recording_link',
        description: 'Get a shareable recording link for a Loom video',
        inputSchema: {
          type: 'object',
          properties: {
            videoId: {
              type: 'string',
              description: 'The Loom video ID',
            },
          },
          required: ['videoId'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_videos':
          return await this.listVideos(
            args.limit as number | undefined,
            args.nextToken as string | undefined,
            args.folderId as string | undefined
          );
        case 'get_video':
          return await this.getVideo(args.videoId as string);
        case 'get_video_transcript':
          return await this.getVideoTranscript(args.videoId as string);
        case 'list_folders':
          return await this.listFolders(
            args.limit as number | undefined,
            args.nextToken as string | undefined
          );
        case 'get_recording_link':
          return await this.getRecordingLink(args.videoId as string);
        default:
          return { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true };
      }
    } catch (error) {
      return {
        content: [{ type: 'text', text: error instanceof Error ? error.message : String(error) }],
        isError: true,
      };
    }
  }

  private async listVideos(
    limit?: number,
    nextToken?: string,
    folderId?: string
  ): Promise<ToolResult> {
    const params = new URLSearchParams();
    params.append('limit', String(limit ?? 20));
    if (nextToken) params.append('next_token', nextToken);
    if (folderId) params.append('folder_id', folderId);

    const response = await fetch(
      `${this.baseUrl}/videos?${params}`,
      { method: 'GET', headers: this.headers }
    );
    if (!response.ok) throw new Error(`Loom API error: ${response.status} ${response.statusText}`);
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Loom returned non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async getVideo(videoId: string): Promise<ToolResult> {
    const response = await fetch(
      `${this.baseUrl}/videos/${videoId}`,
      { method: 'GET', headers: this.headers }
    );
    if (!response.ok) throw new Error(`Loom API error: ${response.status} ${response.statusText}`);
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Loom returned non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async getVideoTranscript(videoId: string): Promise<ToolResult> {
    const response = await fetch(
      `${this.baseUrl}/videos/${videoId}/transcript`,
      { method: 'GET', headers: this.headers }
    );
    if (!response.ok) throw new Error(`Loom API error: ${response.status} ${response.statusText}`);
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Loom returned non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async listFolders(limit?: number, nextToken?: string): Promise<ToolResult> {
    const params = new URLSearchParams();
    params.append('limit', String(limit ?? 20));
    if (nextToken) params.append('next_token', nextToken);

    const response = await fetch(
      `${this.baseUrl}/folders?${params}`,
      { method: 'GET', headers: this.headers }
    );
    if (!response.ok) throw new Error(`Loom API error: ${response.status} ${response.statusText}`);
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Loom returned non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async getRecordingLink(videoId: string): Promise<ToolResult> {
    const response = await fetch(
      `${this.baseUrl}/videos/${videoId}/sharing-link`,
      { method: 'GET', headers: this.headers }
    );
    if (!response.ok) throw new Error(`Loom API error: ${response.status} ${response.statusText}`);
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Loom returned non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }
}

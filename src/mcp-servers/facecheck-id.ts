/**
 * FaceCheck.ID MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// No official FaceCheck.ID MCP server was found on GitHub as of 2026-03-28.
// Our adapter covers: 4 tools (upload image, search by face, get status, delete image, get account info).
// Vendor MCP covers: 0 tools (none exists).
// Recommendation: use-rest-api — no official MCP server exists.
//
// Base URL: https://facecheck.id
// Auth: Authorization header with API token (Bearer token format per security scheme)
// Docs: https://facecheck.id/Face-Search/API
// Rate limits: Credit-based. Each search consumes credits. Check remaining_credits via get_account_info.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface FaceCheckIdConfig {
  /** API token — passed as Authorization header value */
  apiToken: string;
  /** Optional base URL override (default: https://facecheck.id) */
  baseUrl?: string;
}

export class FaceCheckIdMCPServer extends MCPAdapterBase {
  private readonly apiToken: string;
  private readonly baseUrl: string;

  constructor(config: FaceCheckIdConfig) {
    super();
    this.apiToken = config.apiToken;
    this.baseUrl = config.baseUrl ?? 'https://facecheck.id';
  }

  static catalog() {
    return {
      name: 'facecheck-id',
      displayName: 'FaceCheck.ID',
      version: '1.0.0',
      category: 'identity',
      keywords: [
        'facecheck', 'facial', 'recognition', 'face', 'search', 'reverse', 'image',
        'biometric', 'identity', 'person', 'lookup', 'photo', 'internet', 'osint',
        'verification', 'portrait', 'matching',
      ],
      toolNames: [
        'get_account_info',
        'upload_face_image',
        'search_by_face',
        'delete_face_image',
      ],
      description: 'FaceCheck.ID facial recognition reverse image search: upload a face photo and find matching faces across the Internet, check search credits and engine status.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'get_account_info',
        description: 'Get FaceCheck.ID account status including remaining search credits, search engine online status, and total number of indexed faces in the database',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'upload_face_image',
        description: 'Upload 1 to 3 face images as base64-encoded data to initiate a reverse face search — returns a search request ID and preview thumbnails for use with search_by_face',
        inputSchema: {
          type: 'object',
          properties: {
            images_base64: {
              type: 'array',
              description: 'Array of 1 to 3 face images encoded as base64 strings. Each image should contain a clear face.',
            },
            id_search: {
              type: 'string',
              description: 'Optional existing search request ID to add images to an existing search session',
            },
          },
          required: ['images_base64'],
        },
      },
      {
        name: 'search_by_face',
        description: 'Submit a face search request and retrieve matching URLs and face images from the Internet — optionally poll for progress or run in demo mode on first 100k faces',
        inputSchema: {
          type: 'object',
          properties: {
            id_search: {
              type: 'string',
              description: 'Search request ID returned by upload_face_image. Required to run the search.',
            },
            with_progress: {
              type: 'boolean',
              description: 'Return immediately with a progress percentage (true) or wait until search is fully complete (false, default)',
            },
            status_only: {
              type: 'boolean',
              description: 'Check status without submitting a new search — useful for polling an in-progress search (default: false)',
            },
            demo: {
              type: 'boolean',
              description: 'Run in demo mode — searches only the first 100,000 faces, useful for testing without consuming full credits (default: false)',
            },
          },
          required: ['id_search'],
        },
      },
      {
        name: 'delete_face_image',
        description: 'Remove a specific uploaded face image from a search request by image ID, reducing the images associated with a given search session',
        inputSchema: {
          type: 'object',
          properties: {
            id_search: {
              type: 'string',
              description: 'Search request ID that contains the image to delete',
            },
            id_pic: {
              type: 'string',
              description: 'Image ID to remove from the search request (returned in upload_face_image response)',
            },
          },
          required: ['id_search', 'id_pic'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'get_account_info':
          return this.getAccountInfo();
        case 'upload_face_image':
          return this.uploadFaceImage(args);
        case 'search_by_face':
          return this.searchByFace(args);
        case 'delete_face_image':
          return this.deleteFaceImage(args);
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

  private authHeaders(): Record<string, string> {
    return {
      'Authorization': this.apiToken,
    };
  }

  private async getAccountInfo(): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}/api/info`, {
      method: 'POST',
      headers: this.authHeaders(),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`FaceCheck.ID returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async uploadFaceImage(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.images_base64 || !Array.isArray(args.images_base64) || args.images_base64.length === 0) {
      return { content: [{ type: 'text', text: 'images_base64 is required and must be a non-empty array' }], isError: true };
    }
    if (args.images_base64.length > 3) {
      return { content: [{ type: 'text', text: 'Maximum 3 images allowed per upload' }], isError: true };
    }

    const formData = new FormData();
    for (const b64 of args.images_base64 as string[]) {
      // Convert base64 to Blob for multipart upload
      const binary = atob(b64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: 'image/jpeg' });
      formData.append('images', blob, 'face.jpg');
    }
    if (args.id_search) {
      formData.append('id_search', args.id_search as string);
    }

    const response = await this.fetchWithRetry(`${this.baseUrl}/api/upload_pic`, {
      method: 'POST',
      headers: this.authHeaders(),
      body: formData,
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`FaceCheck.ID returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async searchByFace(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id_search) {
      return { content: [{ type: 'text', text: 'id_search is required' }], isError: true };
    }

    const body: Record<string, unknown> = {
      id_search: args.id_search as string,
    };
    if (args.with_progress !== undefined) body.with_progress = args.with_progress as boolean;
    if (args.status_only !== undefined) body.status_only = args.status_only as boolean;
    if (args.demo !== undefined) body.demo = args.demo as boolean;

    const response = await this.fetchWithRetry(`${this.baseUrl}/api/search`, {
      method: 'POST',
      headers: { ...this.authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`FaceCheck.ID returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async deleteFaceImage(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id_search) {
      return { content: [{ type: 'text', text: 'id_search is required' }], isError: true };
    }
    if (!args.id_pic) {
      return { content: [{ type: 'text', text: 'id_pic is required' }], isError: true };
    }

    const qs = new URLSearchParams({
      id_search: args.id_search as string,
      id_pic: args.id_pic as string,
    });
    const response = await this.fetchWithRetry(`${this.baseUrl}/api/delete_pic?${qs.toString()}`, {
      method: 'POST',
      headers: this.authHeaders(),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`FaceCheck.ID returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }
}

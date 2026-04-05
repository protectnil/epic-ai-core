/**
 * ContentGroove MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// No official ContentGroove MCP server was found on GitHub.
//
// Base URL: https://api.contentgroove.com
// Auth: API Key — Authorization: Bearer <key> or X-API-KEY: <key> or ?api_key=<key>
// Docs: https://developers.contentgroove.com/api_reference
// Rate limits: 429 returned when exceeded; retry with exponential backoff

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface ContentGrooveConfig {
  apiKey: string;
  baseUrl?: string;
}

export class ContentGrooveMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: ContentGrooveConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? 'https://api.contentgroove.com';
  }

  static catalog() {
    return {
      name: 'contentgroove',
      displayName: 'ContentGroove',
      version: '1.0.0',
      category: 'media',
      keywords: [
        'contentgroove',
        'video',
        'clip',
        'media',
        'ai',
        'transcription',
        'highlight',
        'content',
        'webhook',
        'upload',
        'processing',
      ],
      toolNames: [
        'list_clips',
        'get_clip',
        'create_clip',
        'update_clip',
        'delete_clip',
        'list_medias',
        'get_media',
        'create_media',
        'update_media',
        'delete_media',
        'get_upload_url',
        'list_webhook_subscriptions',
        'get_webhook_subscription',
        'create_webhook_subscription',
        'delete_webhook_subscription',
      ],
      description:
        'ContentGroove video AI: manage media files and AI-generated clips, get transcriptions and suggested highlights, configure webhooks for async processing events.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_clips',
        description:
          'List video clips with optional filters, pagination, and sorting by name or creation date.',
        inputSchema: {
          type: 'object',
          properties: {
            filter: {
              type: 'string',
              description:
                'Filter expression e.g. filter[name_eq]=my+clip. Uses Ransack matcher syntax.',
            },
            page_number: {
              type: 'number',
              description: 'Page number for pagination (default: 1).',
            },
            page_size: {
              type: 'number',
              description: 'Number of results per page (default: 20).',
            },
            sort: {
              type: 'string',
              description:
                'Sort field: created_at, -created_at, original_created_at, -original_created_at, name, -name.',
            },
          },
        },
      },
      {
        name: 'get_clip',
        description: 'Get details of a single video clip by its ID, including timestamps, text, and media file info.',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'The clip UUID.',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'create_clip',
        description:
          'Create a new video clip from a media item by specifying start and end times in seconds.',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Name for the new clip.',
            },
            media_id: {
              type: 'string',
              description: 'UUID of the parent media item.',
            },
            start_time: {
              type: 'number',
              description: 'Start time of the clip in seconds (e.g. 10.5).',
            },
            end_time: {
              type: 'number',
              description: 'End time of the clip in seconds (e.g. 45.0).',
            },
          },
          required: ['name', 'media_id', 'start_time', 'end_time'],
        },
      },
      {
        name: 'update_clip',
        description: 'Update the name, start time, or end time of an existing video clip.',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'The clip UUID to update.',
            },
            name: {
              type: 'string',
              description: 'New name for the clip.',
            },
            start_time: {
              type: 'number',
              description: 'New start time in seconds.',
            },
            end_time: {
              type: 'number',
              description: 'New end time in seconds.',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'delete_clip',
        description: 'Permanently delete a video clip by its ID.',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'The clip UUID to delete.',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'list_medias',
        description:
          'List media items (video or audio) with optional filters, pagination, and sorting. Returns processing status, transcriptions, and clip info.',
        inputSchema: {
          type: 'object',
          properties: {
            filter: {
              type: 'string',
              description: 'Filter expression using Ransack matcher syntax (e.g. filter[name_eq]=demo).',
            },
            page_number: {
              type: 'number',
              description: 'Page number for pagination (default: 1).',
            },
            page_size: {
              type: 'number',
              description: 'Number of results per page (default: 20).',
            },
            sort: {
              type: 'string',
              description:
                'Sort field: created_at, -created_at, original_created_at, -original_created_at, name, -name.',
            },
          },
        },
      },
      {
        name: 'get_media',
        description:
          'Get a single media item by ID, including transcription, AI-suggested clips, topics, and processing status.',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'The media UUID.',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'create_media',
        description:
          'Create a new media item from a URL or upload ID. ContentGroove will fetch and process the video or audio file asynchronously.',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Name for the media item.',
            },
            source_url: {
              type: 'string',
              description: 'Publicly accessible URL of the video or audio file to import.',
            },
            upload_id: {
              type: 'string',
              description: 'Upload ID from get_upload_url flow for direct file upload.',
            },
            description: {
              type: 'string',
              description: 'Optional description for the media item.',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'update_media',
        description: 'Update the name or description of an existing media item.',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'The media UUID to update.',
            },
            name: {
              type: 'string',
              description: 'New name for the media item.',
            },
            description: {
              type: 'string',
              description: 'New description for the media item.',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'delete_media',
        description: 'Permanently delete a media item and all its associated clips.',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'The media UUID to delete.',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'get_upload_url',
        description:
          'Get a presigned S3 upload URL and upload ID for direct file upload. Step 1 of the 3-step direct upload flow.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'list_webhook_subscriptions',
        description:
          'List all webhook subscriptions configured for this account, with optional filters and sorting.',
        inputSchema: {
          type: 'object',
          properties: {
            filter: {
              type: 'string',
              description: 'Filter expression using Ransack matcher syntax.',
            },
            sort: {
              type: 'string',
              description: 'Sort field: created_at, -created_at, name, -name.',
            },
          },
        },
      },
      {
        name: 'get_webhook_subscription',
        description: 'Get details of a single webhook subscription by ID.',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'The webhook subscription UUID.',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'create_webhook_subscription',
        description:
          'Create a webhook subscription to receive POST callbacks when media processing completes or other events occur.',
        inputSchema: {
          type: 'object',
          properties: {
            url: {
              type: 'string',
              description: 'HTTPS endpoint URL to receive webhook POST requests.',
            },
            event_types: {
              type: 'string',
              description: 'Comma-separated list of event types to subscribe to (e.g. media.processed).',
            },
          },
          required: ['url'],
        },
      },
      {
        name: 'delete_webhook_subscription',
        description: 'Delete a webhook subscription by ID, stopping future event deliveries.',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'The webhook subscription UUID to delete.',
            },
          },
          required: ['id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_clips':
          return await this.listClips(args);
        case 'get_clip':
          return await this.getClip(args);
        case 'create_clip':
          return await this.createClip(args);
        case 'update_clip':
          return await this.updateClip(args);
        case 'delete_clip':
          return await this.deleteClip(args);
        case 'list_medias':
          return await this.listMedias(args);
        case 'get_media':
          return await this.getMedia(args);
        case 'create_media':
          return await this.createMedia(args);
        case 'update_media':
          return await this.updateMedia(args);
        case 'delete_media':
          return await this.deleteMedia(args);
        case 'get_upload_url':
          return await this.getUploadUrl();
        case 'list_webhook_subscriptions':
          return await this.listWebhookSubscriptions(args);
        case 'get_webhook_subscription':
          return await this.getWebhookSubscription(args);
        case 'create_webhook_subscription':
          return await this.createWebhookSubscription(args);
        case 'delete_webhook_subscription':
          return await this.deleteWebhookSubscription(args);
        default:
          return {
            content: [{ type: 'text', text: `Unknown tool: ${name}` }],
            isError: true,
          };
      }
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Tool execution failed: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }

  private authHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  private async listClips(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.filter) params.set('filter', String(args.filter));
    if (args.page_number) params.set('page[number]', String(args.page_number));
    if (args.page_size) params.set('page[size]', String(args.page_size));
    if (args.sort) params.set('sort', String(args.sort));

    const url = `${this.baseUrl}/api/v1/clips${params.toString() ? '?' + params.toString() : ''}`;
    const response = await this.fetchWithRetry(url, { headers: this.authHeaders() });

    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }

    const data = await response.json();
    return {
      content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }],
      isError: false,
    };
  }

  private async getClip(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.id as string;
    const response = await this.fetchWithRetry(`${this.baseUrl}/api/v1/clips/${id}`, {
      headers: this.authHeaders(),
    });

    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }

    const data = await response.json();
    return {
      content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }],
      isError: false,
    };
  }

  private async createClip(args: Record<string, unknown>): Promise<ToolResult> {
    const body = {
      data: {
        attributes: {
          name: args.name as string,
          media_id: args.media_id as string,
          start_time: args.start_time as number,
          end_time: args.end_time as number,
        },
      },
    };

    const response = await this.fetchWithRetry(`${this.baseUrl}/api/v1/clips`, {
      method: 'POST',
      headers: this.authHeaders(),
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }

    const data = await response.json();
    return {
      content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }],
      isError: false,
    };
  }

  private async updateClip(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.id as string;
    const attributes: Record<string, unknown> = {};
    if (args.name !== undefined) attributes.name = args.name;
    if (args.start_time !== undefined) attributes.start_time = args.start_time;
    if (args.end_time !== undefined) attributes.end_time = args.end_time;

    const response = await this.fetchWithRetry(`${this.baseUrl}/api/v1/clips/${id}`, {
      method: 'PUT',
      headers: this.authHeaders(),
      body: JSON.stringify({ data: { attributes } }),
    });

    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }

    const data = await response.json();
    return {
      content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }],
      isError: false,
    };
  }

  private async deleteClip(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.id as string;
    const response = await this.fetchWithRetry(`${this.baseUrl}/api/v1/clips/${id}`, {
      method: 'DELETE',
      headers: this.authHeaders(),
    });

    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }

    return {
      content: [{ type: 'text', text: JSON.stringify({ deleted: true, id }) }],
      isError: false,
    };
  }

  private async listMedias(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.filter) params.set('filter', String(args.filter));
    if (args.page_number) params.set('page[number]', String(args.page_number));
    if (args.page_size) params.set('page[size]', String(args.page_size));
    if (args.sort) params.set('sort', String(args.sort));

    const url = `${this.baseUrl}/api/v1/medias${params.toString() ? '?' + params.toString() : ''}`;
    const response = await this.fetchWithRetry(url, { headers: this.authHeaders() });

    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }

    const data = await response.json();
    return {
      content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }],
      isError: false,
    };
  }

  private async getMedia(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.id as string;
    const response = await this.fetchWithRetry(`${this.baseUrl}/api/v1/medias/${id}`, {
      headers: this.authHeaders(),
    });

    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }

    const data = await response.json();
    return {
      content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }],
      isError: false,
    };
  }

  private async createMedia(args: Record<string, unknown>): Promise<ToolResult> {
    const attributes: Record<string, unknown> = { name: args.name as string };
    if (args.source_url) attributes.source_url = args.source_url;
    if (args.upload_id) attributes.upload_id = args.upload_id;
    if (args.description) attributes.description = args.description;

    const response = await this.fetchWithRetry(`${this.baseUrl}/api/v1/medias`, {
      method: 'POST',
      headers: this.authHeaders(),
      body: JSON.stringify({ data: { attributes } }),
    });

    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }

    const data = await response.json();
    return {
      content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }],
      isError: false,
    };
  }

  private async updateMedia(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.id as string;
    const attributes: Record<string, unknown> = {};
    if (args.name !== undefined) attributes.name = args.name;
    if (args.description !== undefined) attributes.description = args.description;

    const response = await this.fetchWithRetry(`${this.baseUrl}/api/v1/medias/${id}`, {
      method: 'PUT',
      headers: this.authHeaders(),
      body: JSON.stringify({ data: { attributes } }),
    });

    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }

    const data = await response.json();
    return {
      content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }],
      isError: false,
    };
  }

  private async deleteMedia(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.id as string;
    const response = await this.fetchWithRetry(`${this.baseUrl}/api/v1/medias/${id}`, {
      method: 'DELETE',
      headers: this.authHeaders(),
    });

    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }

    return {
      content: [{ type: 'text', text: JSON.stringify({ deleted: true, id }) }],
      isError: false,
    };
  }

  private async getUploadUrl(): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}/api/v1/direct_uploads`, {
      headers: this.authHeaders(),
    });

    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }

    const data = await response.json();
    return {
      content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }],
      isError: false,
    };
  }

  private async listWebhookSubscriptions(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.filter) params.set('filter', String(args.filter));
    if (args.sort) params.set('sort', String(args.sort));

    const url = `${this.baseUrl}/api/v1/webhook_subscriptions${params.toString() ? '?' + params.toString() : ''}`;
    const response = await this.fetchWithRetry(url, { headers: this.authHeaders() });

    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }

    const data = await response.json();
    return {
      content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }],
      isError: false,
    };
  }

  private async getWebhookSubscription(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.id as string;
    const response = await this.fetchWithRetry(`${this.baseUrl}/api/v1/webhook_subscriptions/${id}`, {
      headers: this.authHeaders(),
    });

    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }

    const data = await response.json();
    return {
      content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }],
      isError: false,
    };
  }

  private async createWebhookSubscription(args: Record<string, unknown>): Promise<ToolResult> {
    const attributes: Record<string, unknown> = { url: args.url as string };
    if (args.event_types) attributes.event_types = args.event_types;

    const response = await this.fetchWithRetry(`${this.baseUrl}/api/v1/webhook_subscriptions`, {
      method: 'POST',
      headers: this.authHeaders(),
      body: JSON.stringify({ data: { attributes } }),
    });

    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }

    const data = await response.json();
    return {
      content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }],
      isError: false,
    };
  }

  private async deleteWebhookSubscription(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.id as string;
    const response = await this.fetchWithRetry(`${this.baseUrl}/api/v1/webhook_subscriptions/${id}`, {
      method: 'DELETE',
      headers: this.authHeaders(),
    });

    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }

    return {
      content: [{ type: 'text', text: JSON.stringify({ deleted: true, id }) }],
      isError: false,
    };
  }
}

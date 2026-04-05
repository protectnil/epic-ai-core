/**
 * WhatsApp Business API MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Spec: https://api.apis.guru/v2/specs/whatsapp.local/1.0/openapi.json
// Source: https://github.com/unblu/WhatsApp-Business-API-OpenAPI
// Base URL: https://<your-host>:<port>/v1  (self-hosted WhatsApp Business API container)
// Auth: Bearer token via Authorization header (obtained from POST /users/login)
// Rate limits: Not publicly documented; standard practice is 80 msg/s per phone number.
// Docs: https://developers.facebook.com/docs/whatsapp

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface WhatsAppConfig {
  /** Base URL of the WhatsApp Business API container, e.g. https://wa.example.com/v1 */
  baseUrl: string;
  /** Bearer token obtained from POST /users/login */
  token: string;
}

export class WhatsAppMCPServer extends MCPAdapterBase {
  private readonly baseUrl: string;
  private readonly token: string;

  constructor(config: WhatsAppConfig) {
    super();
    this.baseUrl = config.baseUrl.replace(/\/+$/, '');
    this.token = config.token;
  }

  static catalog() {
    return {
      name: 'whatsapp',
      displayName: 'WhatsApp Business API',
      version: '1.0.0',
      category: 'communication',
      keywords: [
        'whatsapp', 'messaging', 'sms', 'chat', 'business', 'facebook', 'meta',
        'send message', 'group', 'media', 'contact', 'notification',
      ],
      toolNames: [
        'send_message',
        'check_contact',
        'get_groups',
        'create_group',
        'get_group_info',
        'upload_media',
        'get_application_settings',
        'get_business_profile',
        'get_metrics',
        'check_health',
      ],
      description: 'WhatsApp Business API: send messages, manage groups, check contacts, upload media, and configure the WhatsApp Business client via the self-hosted v1 REST API.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'send_message',
        description: 'Send a text, template, image, document, audio, or video message to a WhatsApp number or group',
        inputSchema: {
          type: 'object',
          properties: {
            to: {
              type: 'string',
              description: 'Recipient phone number in E.164 format (e.g. +14155552671) or group ID',
            },
            type: {
              type: 'string',
              description: 'Message type: text, image, document, audio, video, template (default: text)',
            },
            text_body: {
              type: 'string',
              description: 'Plain text body (used when type=text)',
            },
            template_name: {
              type: 'string',
              description: 'Approved template name (used when type=template)',
            },
            template_language: {
              type: 'string',
              description: 'Template language/locale code, e.g. en_US (used when type=template)',
            },
            media_id: {
              type: 'string',
              description: 'ID of a previously uploaded media asset (used for image/document/audio/video types)',
            },
            media_link: {
              type: 'string',
              description: 'Public URL of media to send instead of a pre-uploaded media_id',
            },
            caption: {
              type: 'string',
              description: 'Optional caption for media messages',
            },
          },
          required: ['to', 'type'],
        },
      },
      {
        name: 'check_contact',
        description: 'Check whether one or more phone numbers are registered WhatsApp users and get their WA IDs',
        inputSchema: {
          type: 'object',
          properties: {
            contacts: {
              type: 'array',
              description: 'Array of phone numbers in E.164 format to check (e.g. ["+14155552671"])',
            },
            blocking: {
              type: 'string',
              description: 'Lookup mode: wait (synchronous) or no_wait (asynchronous, default: wait)',
            },
          },
          required: ['contacts'],
        },
      },
      {
        name: 'get_groups',
        description: 'List all WhatsApp groups this business number is a member of',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'create_group',
        description: 'Create a new WhatsApp group with a subject and initial participant list',
        inputSchema: {
          type: 'object',
          properties: {
            subject: {
              type: 'string',
              description: 'Group name/subject',
            },
            participants: {
              type: 'array',
              description: 'Array of WA IDs (phone numbers) to add as initial participants',
            },
          },
          required: ['subject', 'participants'],
        },
      },
      {
        name: 'get_group_info',
        description: 'Get metadata for a specific WhatsApp group including participants and admins',
        inputSchema: {
          type: 'object',
          properties: {
            group_id: {
              type: 'string',
              description: 'WhatsApp group ID',
            },
          },
          required: ['group_id'],
        },
      },
      {
        name: 'upload_media',
        description: 'Upload a media file (image, document, audio, video) to the WhatsApp server for later use in messages',
        inputSchema: {
          type: 'object',
          properties: {
            file_url: {
              type: 'string',
              description: 'Publicly accessible URL of the file to upload',
            },
            content_type: {
              type: 'string',
              description: 'MIME type of the file, e.g. image/jpeg, application/pdf, audio/ogg',
            },
          },
          required: ['file_url', 'content_type'],
        },
      },
      {
        name: 'get_application_settings',
        description: 'Retrieve current WhatsApp Business API application configuration including webhook, media, and callback settings',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_business_profile',
        description: 'Get the WhatsApp Business profile including address, description, email, vertical, and website',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_metrics',
        description: 'Retrieve application metrics such as message throughput and delivery stats',
        inputSchema: {
          type: 'object',
          properties: {
            format: {
              type: 'string',
              description: 'Response format: prometheus or json (default: json)',
            },
          },
        },
      },
      {
        name: 'check_health',
        description: 'Check the health and status of the WhatsApp Business API container',
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
        case 'send_message':
          return this.sendMessage(args);
        case 'check_contact':
          return this.checkContact(args);
        case 'get_groups':
          return this.getGroups();
        case 'create_group':
          return this.createGroup(args);
        case 'get_group_info':
          return this.getGroupInfo(args);
        case 'upload_media':
          return this.uploadMedia(args);
        case 'get_application_settings':
          return this.getApplicationSettings();
        case 'get_business_profile':
          return this.getBusinessProfile();
        case 'get_metrics':
          return this.getMetrics(args);
        case 'check_health':
          return this.checkHealth();
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

  private get headers(): Record<string, string> {
    return {
      'Authorization': `Bearer ${this.token}`,
      'Content-Type': 'application/json',
    };
  }

  private async get(path: string, params: Record<string, string | undefined> = {}): Promise<ToolResult> {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) qs.set(k, v);
    }
    const query = qs.toString();
    const url = `${this.baseUrl}${path}${query ? '?' + query : ''}`;
    const response = await this.fetchWithRetry(url, { method: 'GET', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`WhatsApp API returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async post(path: string, body: unknown): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `API error: ${response.status} ${errText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`WhatsApp API returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async sendMessage(args: Record<string, unknown>): Promise<ToolResult> {
    const { to, type = 'text', text_body, template_name, template_language, media_id, media_link, caption } = args as Record<string, string>;
    const body: Record<string, unknown> = { to, type };

    if (type === 'text') {
      body['text'] = { body: text_body };
    } else if (type === 'template') {
      body['template'] = {
        namespace: '',
        name: template_name,
        language: { policy: 'deterministic', code: template_language ?? 'en_US' },
      };
    } else {
      // image, document, audio, video
      const mediaObj: Record<string, string> = {};
      if (media_id) mediaObj['id'] = media_id;
      else if (media_link) mediaObj['link'] = media_link;
      if (caption) mediaObj['caption'] = caption;
      body[type] = mediaObj;
    }

    return this.post('/messages', body);
  }

  private async checkContact(args: Record<string, unknown>): Promise<ToolResult> {
    const { contacts, blocking = 'wait' } = args as { contacts: string[]; blocking?: string };
    return this.post('/contacts', { blocking, contacts });
  }

  private async getGroups(): Promise<ToolResult> {
    return this.get('/groups');
  }

  private async createGroup(args: Record<string, unknown>): Promise<ToolResult> {
    const { subject, participants } = args as { subject: string; participants: string[] };
    return this.post('/groups', { subject, participants });
  }

  private async getGroupInfo(args: Record<string, unknown>): Promise<ToolResult> {
    const { group_id } = args as { group_id: string };
    return this.get(`/groups/${encodeURIComponent(group_id)}`);
  }

  private async uploadMedia(args: Record<string, unknown>): Promise<ToolResult> {
    const { file_url, content_type } = args as { file_url: string; content_type: string };
    // WhatsApp /media expects multipart/form-data; since we only have fetch, we post JSON with the link form
    // The API accepts a URL-based upload via form-data. We send it as JSON body (link field).
    const response = await this.fetchWithRetry(`${this.baseUrl}/media`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${this.token}`, 'Content-Type': content_type },
      body: JSON.stringify({ url: file_url }),
    });
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `API error: ${response.status} ${errText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`WhatsApp API returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getApplicationSettings(): Promise<ToolResult> {
    return this.get('/settings/application');
  }

  private async getBusinessProfile(): Promise<ToolResult> {
    return this.get('/settings/business/profile');
  }

  private async getMetrics(args: Record<string, unknown>): Promise<ToolResult> {
    const { format } = args as { format?: string };
    return this.get('/metrics', { format });
  }

  private async checkHealth(): Promise<ToolResult> {
    return this.get('/health');
  }
}

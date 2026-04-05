/**
 * WhatsApp Business MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// No official WhatsApp Business MCP server is published by Meta. A community entry appears in the
//   modelcontextprotocol/servers registry ("WhatsApp Business - WhatsApp Business MCP connector")
//   but it is not published by Meta — not eligible for use-vendor-mcp per protocol criteria.
//
// Base URL: https://graph.facebook.com/v21.0
// Auth: Bearer token (System User access token from Meta Business Manager)
// Docs: https://developers.facebook.com/docs/whatsapp/cloud-api/
// Rate limits: 80 messages/second per phone number; 1 message/6 seconds per recipient; 1,000 business accounts/hour for WABA management

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface WhatsAppBusinessConfig {
  accessToken: string;
  baseUrl?: string;
}

export class WhatsAppBusinessMCPServer extends MCPAdapterBase {
  private readonly accessToken: string;
  private readonly baseUrl: string;

  constructor(config: WhatsAppBusinessConfig) {
    super();
    this.accessToken = config.accessToken;
    this.baseUrl = config.baseUrl || 'https://graph.facebook.com/v21.0';
  }

  static catalog() {
    return {
      name: 'whatsapp-business',
      displayName: 'WhatsApp Business',
      version: '1.0.0',
      category: 'communication',
      keywords: ['whatsapp', 'whatsapp-business', 'messaging', 'sms', 'meta', 'facebook', 'chat', 'template', 'phone', 'waba', 'cloud-api'],
      toolNames: [
        'send_text_message', 'send_template_message', 'send_media_message', 'send_interactive_message',
        'get_message_status',
        'list_phone_numbers', 'get_phone_number', 'register_phone_number',
        'list_templates', 'get_template', 'create_template', 'delete_template',
        'get_business_profile', 'update_business_profile',
        'list_media', 'upload_media', 'delete_media',
        'get_waba_info', 'list_subscribed_apps',
      ],
      description: 'WhatsApp Business Cloud API: send text, template, media, and interactive messages; manage phone numbers, message templates, business profiles, and media.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'send_text_message',
        description: 'Send a plain text WhatsApp message to a recipient phone number from a business phone number',
        inputSchema: {
          type: 'object',
          properties: {
            phone_number_id: { type: 'string', description: 'The business phone number ID sending the message' },
            to: { type: 'string', description: 'Recipient phone number in E.164 format (e.g. 15551234567, no + prefix)' },
            body: { type: 'string', description: 'Text body of the message (max 4096 characters)' },
            preview_url: { type: 'boolean', description: 'Enable link preview in message (default: false)' },
          },
          required: ['phone_number_id', 'to', 'body'],
        },
      },
      {
        name: 'send_template_message',
        description: 'Send an approved WhatsApp message template to a recipient, with optional variable substitutions',
        inputSchema: {
          type: 'object',
          properties: {
            phone_number_id: { type: 'string', description: 'The business phone number ID sending the message' },
            to: { type: 'string', description: 'Recipient phone number in E.164 format' },
            template_name: { type: 'string', description: 'Name of the approved message template' },
            language_code: { type: 'string', description: 'BCP-47 language code for the template (e.g. en_US, es_MX)' },
            components: { type: 'array', description: 'Array of template component objects with parameters for variable substitution' },
          },
          required: ['phone_number_id', 'to', 'template_name', 'language_code'],
        },
      },
      {
        name: 'send_media_message',
        description: 'Send a WhatsApp message containing image, audio, document, video, or sticker media',
        inputSchema: {
          type: 'object',
          properties: {
            phone_number_id: { type: 'string', description: 'The business phone number ID sending the message' },
            to: { type: 'string', description: 'Recipient phone number in E.164 format' },
            media_type: { type: 'string', description: 'Media type: image, audio, document, video, sticker' },
            media_id: { type: 'string', description: 'Media ID returned from a previous upload (use media_id OR link)' },
            link: { type: 'string', description: 'Public URL of the media to send (use link OR media_id)' },
            caption: { type: 'string', description: 'Optional caption for image, document, or video' },
            filename: { type: 'string', description: 'Optional filename for document type' },
          },
          required: ['phone_number_id', 'to', 'media_type'],
        },
      },
      {
        name: 'send_interactive_message',
        description: 'Send an interactive WhatsApp message with buttons, lists, or product catalogs',
        inputSchema: {
          type: 'object',
          properties: {
            phone_number_id: { type: 'string', description: 'The business phone number ID sending the message' },
            to: { type: 'string', description: 'Recipient phone number in E.164 format' },
            interactive_type: { type: 'string', description: 'Interactive type: button, list, product, product_list, catalog_message, flow' },
            interactive_body: { type: 'object', description: 'Full interactive message body object per Meta spec (header, body, footer, action)' },
          },
          required: ['phone_number_id', 'to', 'interactive_type', 'interactive_body'],
        },
      },
      {
        name: 'get_message_status',
        description: 'Get delivery and read status for a WhatsApp message by its message ID',
        inputSchema: {
          type: 'object',
          properties: {
            message_id: { type: 'string', description: 'WhatsApp message ID returned when the message was sent' },
          },
          required: ['message_id'],
        },
      },
      {
        name: 'list_phone_numbers',
        description: 'List all WhatsApp Business phone numbers for a given WhatsApp Business Account (WABA)',
        inputSchema: {
          type: 'object',
          properties: {
            waba_id: { type: 'string', description: 'WhatsApp Business Account ID' },
            fields: { type: 'string', description: 'Comma-separated list of fields to return (e.g. id,display_phone_number,status,quality_rating)' },
          },
          required: ['waba_id'],
        },
      },
      {
        name: 'get_phone_number',
        description: 'Get details for a specific WhatsApp Business phone number by phone number ID',
        inputSchema: {
          type: 'object',
          properties: {
            phone_number_id: { type: 'string', description: 'WhatsApp Business phone number ID' },
            fields: { type: 'string', description: 'Comma-separated list of fields to return' },
          },
          required: ['phone_number_id'],
        },
      },
      {
        name: 'register_phone_number',
        description: 'Register a WhatsApp phone number for use with the Cloud API using a two-step verification PIN',
        inputSchema: {
          type: 'object',
          properties: {
            phone_number_id: { type: 'string', description: 'Phone number ID to register' },
            pin: { type: 'string', description: 'Two-step verification PIN (6 digits)' },
          },
          required: ['phone_number_id', 'pin'],
        },
      },
      {
        name: 'list_templates',
        description: 'List all WhatsApp message templates for a Business Account with optional status filter',
        inputSchema: {
          type: 'object',
          properties: {
            waba_id: { type: 'string', description: 'WhatsApp Business Account ID' },
            status: { type: 'string', description: 'Filter by status: APPROVED, PENDING, REJECTED, PAUSED, DISABLED (default: all)' },
            limit: { type: 'number', description: 'Maximum templates to return (default: 20)' },
          },
          required: ['waba_id'],
        },
      },
      {
        name: 'get_template',
        description: 'Get details for a specific WhatsApp message template by template ID',
        inputSchema: {
          type: 'object',
          properties: {
            template_id: { type: 'string', description: 'WhatsApp message template ID' },
          },
          required: ['template_id'],
        },
      },
      {
        name: 'create_template',
        description: 'Create a new WhatsApp message template for review and approval',
        inputSchema: {
          type: 'object',
          properties: {
            waba_id: { type: 'string', description: 'WhatsApp Business Account ID' },
            name: { type: 'string', description: 'Template name (lowercase, underscores, max 512 chars)' },
            category: { type: 'string', description: 'Template category: AUTHENTICATION, MARKETING, UTILITY' },
            language: { type: 'string', description: 'BCP-47 language code (e.g. en_US)' },
            components: { type: 'array', description: 'Array of component objects (HEADER, BODY, FOOTER, BUTTONS)' },
          },
          required: ['waba_id', 'name', 'category', 'language', 'components'],
        },
      },
      {
        name: 'delete_template',
        description: 'Delete a WhatsApp message template from a Business Account by name',
        inputSchema: {
          type: 'object',
          properties: {
            waba_id: { type: 'string', description: 'WhatsApp Business Account ID' },
            template_name: { type: 'string', description: 'Name of the template to delete' },
          },
          required: ['waba_id', 'template_name'],
        },
      },
      {
        name: 'get_business_profile',
        description: 'Get the public WhatsApp business profile for a phone number (name, description, website, category)',
        inputSchema: {
          type: 'object',
          properties: {
            phone_number_id: { type: 'string', description: 'WhatsApp Business phone number ID' },
          },
          required: ['phone_number_id'],
        },
      },
      {
        name: 'update_business_profile',
        description: 'Update the WhatsApp business profile fields for a phone number',
        inputSchema: {
          type: 'object',
          properties: {
            phone_number_id: { type: 'string', description: 'WhatsApp Business phone number ID' },
            address: { type: 'string', description: 'Business address' },
            description: { type: 'string', description: 'Business description (max 512 chars)' },
            email: { type: 'string', description: 'Business contact email' },
            websites: { type: 'array', description: 'Array of up to 2 website URLs' },
            vertical: { type: 'string', description: 'Business category: AUTOMOTIVE, BEAUTY, CLOTHING, EDUCATION, ENTERTAINMENT, FINANCE, GROCERY, HEALTH, HOTEL, NONPROFIT, OTHER, PROFESSIONAL_SERVICES, RETAIL, TRAVEL, RESTAURANT, NOT_A_BIZ' },
          },
          required: ['phone_number_id'],
        },
      },
      {
        name: 'list_media',
        description: 'Retrieve metadata for uploaded WhatsApp media by media ID',
        inputSchema: {
          type: 'object',
          properties: {
            media_id: { type: 'string', description: 'Media ID to look up' },
          },
          required: ['media_id'],
        },
      },
      {
        name: 'upload_media',
        description: 'Upload media (image, document, audio, video) to WhatsApp servers for use in messages',
        inputSchema: {
          type: 'object',
          properties: {
            phone_number_id: { type: 'string', description: 'Phone number ID to associate with the media' },
            type: { type: 'string', description: 'MIME type of the media (e.g. image/jpeg, application/pdf, audio/ogg)' },
            url: { type: 'string', description: 'Publicly accessible URL of the media to upload' },
          },
          required: ['phone_number_id', 'type', 'url'],
        },
      },
      {
        name: 'delete_media',
        description: 'Delete a previously uploaded WhatsApp media object by media ID',
        inputSchema: {
          type: 'object',
          properties: {
            media_id: { type: 'string', description: 'Media ID to delete' },
          },
          required: ['media_id'],
        },
      },
      {
        name: 'get_waba_info',
        description: 'Get details for a WhatsApp Business Account (WABA) including name, currency, timezone, and status',
        inputSchema: {
          type: 'object',
          properties: {
            waba_id: { type: 'string', description: 'WhatsApp Business Account ID' },
            fields: { type: 'string', description: 'Comma-separated list of fields to return (e.g. id,name,currency,timezone_id,status)' },
          },
          required: ['waba_id'],
        },
      },
      {
        name: 'list_subscribed_apps',
        description: 'List apps subscribed to webhooks for a WhatsApp Business Account',
        inputSchema: {
          type: 'object',
          properties: {
            waba_id: { type: 'string', description: 'WhatsApp Business Account ID' },
          },
          required: ['waba_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'send_text_message': return this.sendTextMessage(args);
        case 'send_template_message': return this.sendTemplateMessage(args);
        case 'send_media_message': return this.sendMediaMessage(args);
        case 'send_interactive_message': return this.sendInteractiveMessage(args);
        case 'get_message_status': return this.getMessageStatus(args);
        case 'list_phone_numbers': return this.listPhoneNumbers(args);
        case 'get_phone_number': return this.getPhoneNumber(args);
        case 'register_phone_number': return this.registerPhoneNumber(args);
        case 'list_templates': return this.listTemplates(args);
        case 'get_template': return this.getTemplate(args);
        case 'create_template': return this.createTemplate(args);
        case 'delete_template': return this.deleteTemplate(args);
        case 'get_business_profile': return this.getBusinessProfile(args);
        case 'update_business_profile': return this.updateBusinessProfile(args);
        case 'list_media': return this.listMedia(args);
        case 'upload_media': return this.uploadMedia(args);
        case 'delete_media': return this.deleteMedia(args);
        case 'get_waba_info': return this.getWabaInfo(args);
        case 'list_subscribed_apps': return this.listSubscribedApps(args);
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
      Authorization: `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
    };
  }


  private async get(path: string, params?: Record<string, string>): Promise<ToolResult> {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}${qs}`, { headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async post(path: string, body: unknown): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async del(path: string, params?: Record<string, string>): Promise<ToolResult> {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}${qs}`, { method: 'DELETE', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json().catch(() => ({ deleted: true }));
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async sendTextMessage(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.phone_number_id || !args.to || !args.body) {
      return { content: [{ type: 'text', text: 'phone_number_id, to, and body are required' }], isError: true };
    }
    const payload: Record<string, unknown> = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: args.to,
      type: 'text',
      text: { body: args.body, preview_url: args.preview_url ?? false },
    };
    return this.post(`/${encodeURIComponent(args.phone_number_id as string)}/messages`, payload);
  }

  private async sendTemplateMessage(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.phone_number_id || !args.to || !args.template_name || !args.language_code) {
      return { content: [{ type: 'text', text: 'phone_number_id, to, template_name, and language_code are required' }], isError: true };
    }
    const template: Record<string, unknown> = {
      name: args.template_name,
      language: { code: args.language_code },
    };
    if (args.components) template.components = args.components;
    return this.post(`/${encodeURIComponent(args.phone_number_id as string)}/messages`, {
      messaging_product: 'whatsapp',
      to: args.to,
      type: 'template',
      template,
    });
  }

  private async sendMediaMessage(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.phone_number_id || !args.to || !args.media_type) {
      return { content: [{ type: 'text', text: 'phone_number_id, to, and media_type are required' }], isError: true };
    }
    const media: Record<string, unknown> = {};
    if (args.media_id) media.id = args.media_id;
    else if (args.link) media.link = args.link;
    if (args.caption) media.caption = args.caption;
    if (args.filename) media.filename = args.filename;
    return this.post(`/${encodeURIComponent(args.phone_number_id as string)}/messages`, {
      messaging_product: 'whatsapp',
      to: args.to,
      type: args.media_type,
      [args.media_type as string]: media,
    });
  }

  private async sendInteractiveMessage(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.phone_number_id || !args.to || !args.interactive_type || !args.interactive_body) {
      return { content: [{ type: 'text', text: 'phone_number_id, to, interactive_type, and interactive_body are required' }], isError: true };
    }
    return this.post(`/${encodeURIComponent(args.phone_number_id as string)}/messages`, {
      messaging_product: 'whatsapp',
      to: args.to,
      type: 'interactive',
      interactive: { type: args.interactive_type, ...(args.interactive_body as object) },
    });
  }

  private async getMessageStatus(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.message_id) return { content: [{ type: 'text', text: 'message_id is required' }], isError: true };
    return this.get(`/${encodeURIComponent(args.message_id as string)}`);
  }

  private async listPhoneNumbers(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.waba_id) return { content: [{ type: 'text', text: 'waba_id is required' }], isError: true };
    const params: Record<string, string> = {};
    if (args.fields) params.fields = args.fields as string;
    return this.get(`/${encodeURIComponent(args.waba_id as string)}/phone_numbers`, params);
  }

  private async getPhoneNumber(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.phone_number_id) return { content: [{ type: 'text', text: 'phone_number_id is required' }], isError: true };
    const params: Record<string, string> = {};
    if (args.fields) params.fields = args.fields as string;
    return this.get(`/${encodeURIComponent(args.phone_number_id as string)}`, params);
  }

  private async registerPhoneNumber(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.phone_number_id || !args.pin) {
      return { content: [{ type: 'text', text: 'phone_number_id and pin are required' }], isError: true };
    }
    return this.post(`/${encodeURIComponent(args.phone_number_id as string)}/register`, { messaging_product: 'whatsapp', pin: args.pin });
  }

  private async listTemplates(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.waba_id) return { content: [{ type: 'text', text: 'waba_id is required' }], isError: true };
    const params: Record<string, string> = {};
    if (args.status) params.status = args.status as string;
    if (args.limit) params.limit = String(args.limit);
    return this.get(`/${encodeURIComponent(args.waba_id as string)}/message_templates`, params);
  }

  private async getTemplate(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.template_id) return { content: [{ type: 'text', text: 'template_id is required' }], isError: true };
    return this.get(`/${encodeURIComponent(args.template_id as string)}`);
  }

  private async createTemplate(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.waba_id || !args.name || !args.category || !args.language || !args.components) {
      return { content: [{ type: 'text', text: 'waba_id, name, category, language, and components are required' }], isError: true };
    }
    return this.post(`/${encodeURIComponent(args.waba_id as string)}/message_templates`, {
      name: args.name,
      category: args.category,
      language: args.language,
      components: args.components,
    });
  }

  private async deleteTemplate(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.waba_id || !args.template_name) {
      return { content: [{ type: 'text', text: 'waba_id and template_name are required' }], isError: true };
    }
    return this.del(`/${encodeURIComponent(args.waba_id as string)}/message_templates`, { name: args.template_name as string });
  }

  private async getBusinessProfile(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.phone_number_id) return { content: [{ type: 'text', text: 'phone_number_id is required' }], isError: true };
    return this.get(`/${encodeURIComponent(args.phone_number_id as string)}/whatsapp_business_profile`, {
      fields: 'about,address,description,email,profile_picture_url,websites,vertical',
    });
  }

  private async updateBusinessProfile(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.phone_number_id) return { content: [{ type: 'text', text: 'phone_number_id is required' }], isError: true };
    const body: Record<string, unknown> = { messaging_product: 'whatsapp' };
    if (args.address) body.address = args.address;
    if (args.description) body.description = args.description;
    if (args.email) body.email = args.email;
    if (args.websites) body.websites = args.websites;
    if (args.vertical) body.vertical = args.vertical;
    return this.post(`/${encodeURIComponent(args.phone_number_id as string)}/whatsapp_business_profile`, body);
  }

  private async listMedia(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.media_id) return { content: [{ type: 'text', text: 'media_id is required' }], isError: true };
    return this.get(`/${encodeURIComponent(args.media_id as string)}`);
  }

  private async uploadMedia(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.phone_number_id || !args.type || !args.url) {
      return { content: [{ type: 'text', text: 'phone_number_id, type, and url are required' }], isError: true };
    }
    return this.post(`/${encodeURIComponent(args.phone_number_id as string)}/media`, {
      messaging_product: 'whatsapp',
      type: args.type,
      url: args.url,
    });
  }

  private async deleteMedia(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.media_id) return { content: [{ type: 'text', text: 'media_id is required' }], isError: true };
    return this.del(`/${encodeURIComponent(args.media_id as string)}`);
  }

  private async getWabaInfo(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.waba_id) return { content: [{ type: 'text', text: 'waba_id is required' }], isError: true };
    const params: Record<string, string> = {};
    if (args.fields) params.fields = args.fields as string;
    return this.get(`/${encodeURIComponent(args.waba_id as string)}`, params);
  }

  private async listSubscribedApps(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.waba_id) return { content: [{ type: 'text', text: 'waba_id is required' }], isError: true };
    return this.get(`/${encodeURIComponent(args.waba_id as string)}/subscribed_apps`);
  }
}

/**
 * Infobip MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/infobip/mcp — transport: streamable-HTTP (remote, Infobip-hosted), auth: API key
//   Infobip hosts remote MCP servers per channel: SMS, WhatsApp, Viber, RCS.
//   Maintained: actively maintained (52+ commits, 2026). Official Infobip publication.
//   MCP tool count: covers SMS send/preview/schedule/delivery/logs, WA send/templates/delivery/logs,
//     Viber send/delivery/logs, RCS send/delivery/logs — does NOT cover email, voice/TTS, 2FA, or People CRM.
//
// Integration: use-both
//   MCP-sourced tools (SMS/WhatsApp/Viber/RCS channels): send_sms, get_sms_delivery_reports, get_sent_sms_logs,
//     send_whatsapp_text, send_whatsapp_template, get_whatsapp_templates
//   REST-sourced tools (no MCP equivalent): send_email, get_email_delivery_reports, get_email_logs,
//     send_voice_message, get_voice_logs, send_2fa_pin, verify_2fa_pin, resend_2fa_pin,
//     get_account_balance, list_sent_message_logs, create_contact, get_contact
//   Combined coverage: 18 tools (MCP: 6 overlapping + REST: 12 unique)
//
// Base URL: https://{baseUrl}.api.infobip.com  (personal base URL assigned per account — required)
// Auth: Authorization: App {apiKey} header (API key assigned on account creation)
// Docs: https://www.infobip.com/docs/api
// Rate limits: Not publicly documented; varies by plan. Contact Infobip for enterprise limits.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface InfobipConfig {
  apiKey: string;
  baseUrl: string;  // Personal base URL prefix (e.g. "xyz123" for xyz123.api.infobip.com)
}

export class InfobipMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: InfobipConfig) {
    super();
    this.apiKey = config.apiKey;
    // Accept full URL or just the subdomain prefix
    this.baseUrl = config.baseUrl.startsWith('https://')
      ? config.baseUrl.replace(/\/$/, '')
      : `https://${config.baseUrl}.api.infobip.com`;
  }

  static catalog() {
    return {
      name: 'infobip',
      displayName: 'Infobip',
      version: '1.0.0',
      category: 'communication',
      keywords: [
        'infobip', 'sms', 'whatsapp', 'email', 'voice', 'viber', 'rcs', 'messaging',
        'omnichannel', 'cpaas', '2fa', 'otp', 'verification', 'send message', 'bulk sms',
        'notification', 'transactional', 'contact', 'phone',
      ],
      toolNames: [
        'send_sms', 'get_sms_delivery_reports', 'get_sent_sms_logs',
        'send_whatsapp_text', 'send_whatsapp_template', 'get_whatsapp_templates',
        'send_email', 'get_email_delivery_reports', 'get_email_logs',
        'send_voice_message', 'get_voice_logs',
        'send_2fa_pin', 'verify_2fa_pin', 'resend_2fa_pin',
        'get_account_balance', 'list_sent_message_logs',
        'create_contact', 'get_contact',
      ],
      description: 'Infobip omnichannel CPaaS: send SMS, WhatsApp, email, and voice messages; run 2FA/OTP flows; query delivery reports and account data.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'send_sms',
        description: 'Send an SMS message to one or more recipients with optional scheduling and sender ID',
        inputSchema: {
          type: 'object',
          properties: {
            to: {
              type: 'string',
              description: 'Recipient phone number in E.164 format (e.g. +14155552671). For multiple, comma-separate.',
            },
            text: {
              type: 'string',
              description: 'SMS message body text (max 160 characters for single SMS; longer messages are split)',
            },
            from: {
              type: 'string',
              description: 'Sender ID or phone number displayed to recipient (optional)',
            },
            notify_url: {
              type: 'string',
              description: 'Webhook URL to receive delivery report callbacks (optional)',
            },
          },
          required: ['to', 'text'],
        },
      },
      {
        name: 'get_sms_delivery_reports',
        description: 'Get SMS delivery reports for sent messages filtered by bulk ID or message ID',
        inputSchema: {
          type: 'object',
          properties: {
            bulk_id: {
              type: 'string',
              description: 'Bulk ID returned when the SMS was sent — filters reports to that batch',
            },
            message_id: {
              type: 'string',
              description: 'Specific message ID to retrieve the delivery report for',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of reports to return (default: 50, max: 1000)',
            },
          },
        },
      },
      {
        name: 'get_sent_sms_logs',
        description: 'Get logs of sent SMS messages with optional date range, status, and destination filters',
        inputSchema: {
          type: 'object',
          properties: {
            from: {
              type: 'string',
              description: 'Filter by sender ID',
            },
            to: {
              type: 'string',
              description: 'Filter by recipient phone number',
            },
            sent_since: {
              type: 'string',
              description: 'Start of date range in ISO 8601 format (e.g. 2026-01-01T00:00:00.000+0000)',
            },
            sent_until: {
              type: 'string',
              description: 'End of date range in ISO 8601 format',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of log entries to return (default: 50, max: 1000)',
            },
          },
        },
      },
      {
        name: 'send_whatsapp_text',
        description: 'Send a plain text WhatsApp message to a recipient phone number via Infobip',
        inputSchema: {
          type: 'object',
          properties: {
            from: {
              type: 'string',
              description: 'Your registered WhatsApp sender number in E.164 format',
            },
            to: {
              type: 'string',
              description: 'Recipient WhatsApp phone number in E.164 format',
            },
            text: {
              type: 'string',
              description: 'Message text to send (max 4096 characters)',
            },
          },
          required: ['from', 'to', 'text'],
        },
      },
      {
        name: 'send_whatsapp_template',
        description: 'Send a pre-approved WhatsApp message template to a recipient for business-initiated conversations',
        inputSchema: {
          type: 'object',
          properties: {
            from: {
              type: 'string',
              description: 'Your registered WhatsApp sender number in E.164 format',
            },
            to: {
              type: 'string',
              description: 'Recipient phone number in E.164 format',
            },
            template_name: {
              type: 'string',
              description: 'Approved template name as registered in WhatsApp Business Manager',
            },
            template_language: {
              type: 'string',
              description: 'Template language code (e.g. en, en_US, es)',
            },
            template_data: {
              type: 'string',
              description: 'JSON string of template body parameters array (e.g. ["param1","param2"])',
            },
          },
          required: ['from', 'to', 'template_name', 'template_language'],
        },
      },
      {
        name: 'get_whatsapp_templates',
        description: 'List all approved WhatsApp message templates registered for a sender number',
        inputSchema: {
          type: 'object',
          properties: {
            sender: {
              type: 'string',
              description: 'WhatsApp sender phone number to list templates for',
            },
          },
          required: ['sender'],
        },
      },
      {
        name: 'send_email',
        description: 'Send a transactional or marketing email to one or more recipients via Infobip',
        inputSchema: {
          type: 'object',
          properties: {
            from: {
              type: 'string',
              description: 'Sender email address (must be verified in your Infobip account)',
            },
            to: {
              type: 'string',
              description: 'Recipient email address(es) comma-separated',
            },
            subject: {
              type: 'string',
              description: 'Email subject line',
            },
            text: {
              type: 'string',
              description: 'Plain-text email body (use either text or html)',
            },
            html: {
              type: 'string',
              description: 'HTML email body (use either html or text)',
            },
            reply_to: {
              type: 'string',
              description: 'Reply-to email address (optional)',
            },
          },
          required: ['from', 'to', 'subject'],
        },
      },
      {
        name: 'get_email_delivery_reports',
        description: 'Get email delivery reports for sent messages filtered by bulk ID or message ID',
        inputSchema: {
          type: 'object',
          properties: {
            bulk_id: {
              type: 'string',
              description: 'Bulk ID from the send email response',
            },
            message_id: {
              type: 'string',
              description: 'Specific message ID to retrieve the delivery report for',
            },
            limit: {
              type: 'number',
              description: 'Maximum reports to return (default: 50)',
            },
          },
        },
      },
      {
        name: 'get_email_logs',
        description: 'Get logs of sent emails with optional filters for sender, recipient, status, and date range',
        inputSchema: {
          type: 'object',
          properties: {
            message_id: {
              type: 'string',
              description: 'Filter by specific message ID',
            },
            from: {
              type: 'string',
              description: 'Filter by sender email address',
            },
            to: {
              type: 'string',
              description: 'Filter by recipient email address',
            },
            sent_since: {
              type: 'string',
              description: 'Start of date range in ISO 8601 format',
            },
            sent_until: {
              type: 'string',
              description: 'End of date range in ISO 8601 format',
            },
            limit: {
              type: 'number',
              description: 'Maximum log entries to return (default: 50)',
            },
          },
        },
      },
      {
        name: 'send_voice_message',
        description: 'Send a text-to-speech voice call message to a phone number via Infobip',
        inputSchema: {
          type: 'object',
          properties: {
            to: {
              type: 'string',
              description: 'Recipient phone number in E.164 format',
            },
            text: {
              type: 'string',
              description: 'Message text to be converted to speech and played to the recipient',
            },
            from: {
              type: 'string',
              description: 'Caller ID displayed to the recipient (optional)',
            },
            language: {
              type: 'string',
              description: 'Language code for text-to-speech (e.g. en-US, es-ES, fr-FR — default: en-US)',
            },
          },
          required: ['to', 'text'],
        },
      },
      {
        name: 'get_voice_logs',
        description: 'Get logs of voice calls sent via Infobip with optional date and status filters',
        inputSchema: {
          type: 'object',
          properties: {
            from: {
              type: 'string',
              description: 'Filter by caller ID',
            },
            to: {
              type: 'string',
              description: 'Filter by recipient phone number',
            },
            sent_since: {
              type: 'string',
              description: 'Start of date range in ISO 8601 format',
            },
            sent_until: {
              type: 'string',
              description: 'End of date range in ISO 8601 format',
            },
            limit: {
              type: 'number',
              description: 'Maximum log entries to return (default: 50)',
            },
          },
        },
      },
      {
        name: 'send_2fa_pin',
        description: 'Send a 2FA PIN code to a phone number via SMS using an Infobip 2FA application',
        inputSchema: {
          type: 'object',
          properties: {
            app_id: {
              type: 'string',
              description: 'Infobip 2FA application ID configured in your account',
            },
            message_id: {
              type: 'string',
              description: 'Message template ID within the 2FA application',
            },
            to: {
              type: 'string',
              description: 'Recipient phone number in E.164 format',
            },
            from: {
              type: 'string',
              description: 'Sender ID for the PIN SMS (optional)',
            },
          },
          required: ['app_id', 'message_id', 'to'],
        },
      },
      {
        name: 'verify_2fa_pin',
        description: 'Verify a 2FA PIN code entered by the user against the PIN sent by Infobip',
        inputSchema: {
          type: 'object',
          properties: {
            pin_id: {
              type: 'string',
              description: 'PIN ID returned from the send_2fa_pin response',
            },
            pin: {
              type: 'string',
              description: 'The PIN code entered by the user to verify',
            },
          },
          required: ['pin_id', 'pin'],
        },
      },
      {
        name: 'resend_2fa_pin',
        description: 'Resend a 2FA PIN to the same phone number using the original PIN ID',
        inputSchema: {
          type: 'object',
          properties: {
            pin_id: {
              type: 'string',
              description: 'PIN ID from the original send_2fa_pin response',
            },
          },
          required: ['pin_id'],
        },
      },
      {
        name: 'get_account_balance',
        description: 'Get the current account balance and currency for the Infobip account',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'list_sent_message_logs',
        description: 'Get a unified log of all sent messages across SMS, email, and voice channels',
        inputSchema: {
          type: 'object',
          properties: {
            sent_since: {
              type: 'string',
              description: 'Start of date range in ISO 8601 format',
            },
            sent_until: {
              type: 'string',
              description: 'End of date range in ISO 8601 format',
            },
            channel: {
              type: 'string',
              description: 'Filter by channel: SMS, EMAIL, VOICE, WHATSAPP (optional)',
            },
            limit: {
              type: 'number',
              description: 'Maximum log entries to return (default: 50)',
            },
          },
        },
      },
      {
        name: 'create_contact',
        description: 'Create a new contact in the Infobip People CRM with phone, email, and custom attributes',
        inputSchema: {
          type: 'object',
          properties: {
            first_name: {
              type: 'string',
              description: 'Contact first name',
            },
            last_name: {
              type: 'string',
              description: 'Contact last name',
            },
            phone: {
              type: 'string',
              description: 'Contact phone number in E.164 format',
            },
            email: {
              type: 'string',
              description: 'Contact email address',
            },
          },
        },
      },
      {
        name: 'get_contact',
        description: 'Retrieve a contact from Infobip People CRM by phone number or email address',
        inputSchema: {
          type: 'object',
          properties: {
            phone: {
              type: 'string',
              description: 'Phone number to look up (E.164 format)',
            },
            email: {
              type: 'string',
              description: 'Email address to look up',
            },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'send_sms':
          return this.sendSms(args);
        case 'get_sms_delivery_reports':
          return this.getSmsDeliveryReports(args);
        case 'get_sent_sms_logs':
          return this.getSentSmsLogs(args);
        case 'send_whatsapp_text':
          return this.sendWhatsappText(args);
        case 'send_whatsapp_template':
          return this.sendWhatsappTemplate(args);
        case 'get_whatsapp_templates':
          return this.getWhatsappTemplates(args);
        case 'send_email':
          return this.sendEmail(args);
        case 'get_email_delivery_reports':
          return this.getEmailDeliveryReports(args);
        case 'get_email_logs':
          return this.getEmailLogs(args);
        case 'send_voice_message':
          return this.sendVoiceMessage(args);
        case 'get_voice_logs':
          return this.getVoiceLogs(args);
        case 'send_2fa_pin':
          return this.send2faPin(args);
        case 'verify_2fa_pin':
          return this.verify2faPin(args);
        case 'resend_2fa_pin':
          return this.resend2faPin(args);
        case 'get_account_balance':
          return this.getAccountBalance();
        case 'list_sent_message_logs':
          return this.listSentMessageLogs(args);
        case 'create_contact':
          return this.createContact(args);
        case 'get_contact':
          return this.getContact(args);
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
      Authorization: `App ${this.apiKey}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  private async ibGet(path: string, params: Record<string, string> = {}): Promise<ToolResult> {
    const qs = new URLSearchParams(params).toString();
    const url = `${this.baseUrl}${path}${qs ? '?' + qs : ''}`;
    const response = await this.fetchWithRetry(url, { method: 'GET', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async ibPost(path: string, body: unknown): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `API error: ${response.status} ${errText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async sendSms(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.to || !args.text) return { content: [{ type: 'text', text: 'to and text are required' }], isError: true };
    const destinations = String(args.to).split(',').map(n => ({ to: n.trim() }));
    const msg: Record<string, unknown> = { destinations, text: args.text };
    if (args.from) msg.from = args.from;
    if (args.notify_url) msg.notifyUrl = args.notify_url;
    return this.ibPost('/sms/2/text/advanced', { messages: [msg] });
  }

  private async getSmsDeliveryReports(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = { limit: String((args.limit as number) || 50) };
    if (args.bulk_id) params.bulkId = args.bulk_id as string;
    if (args.message_id) params.messageId = args.message_id as string;
    return this.ibGet('/sms/1/reports', params);
  }

  private async getSentSmsLogs(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = { limit: String((args.limit as number) || 50) };
    if (args.from) params.from = args.from as string;
    if (args.to) params.to = args.to as string;
    if (args.sent_since) params.sentSince = args.sent_since as string;
    if (args.sent_until) params.sentUntil = args.sent_until as string;
    return this.ibGet('/sms/1/logs', params);
  }

  private async sendWhatsappText(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.from || !args.to || !args.text) {
      return { content: [{ type: 'text', text: 'from, to, and text are required' }], isError: true };
    }
    return this.ibPost('/whatsapp/1/message/text', {
      from: args.from,
      to: args.to,
      content: { text: args.text },
    });
  }

  private async sendWhatsappTemplate(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.from || !args.to || !args.template_name || !args.template_language) {
      return { content: [{ type: 'text', text: 'from, to, template_name, and template_language are required' }], isError: true };
    }
    let bodyParams: string[] = [];
    if (args.template_data) {
      try {
        bodyParams = JSON.parse(args.template_data as string) as string[];
      } catch {
        return { content: [{ type: 'text', text: 'template_data must be a valid JSON array string' }], isError: true };
      }
    }
    return this.ibPost('/whatsapp/1/message/template', {
      from: args.from,
      to: args.to,
      content: {
        templateName: args.template_name,
        templateData: {
          body: { placeholders: bodyParams },
        },
        language: args.template_language,
      },
    });
  }

  private async getWhatsappTemplates(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.sender) return { content: [{ type: 'text', text: 'sender is required' }], isError: true };
    return this.ibGet(`/whatsapp/2/senders/${encodeURIComponent(args.sender as string)}/templates`);
  }

  private async sendEmail(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.from || !args.to || !args.subject) {
      return { content: [{ type: 'text', text: 'from, to, and subject are required' }], isError: true };
    }
    if (!args.text && !args.html) {
      return { content: [{ type: 'text', text: 'either text or html body is required' }], isError: true };
    }
    // Email API requires multipart/form-data — use native FormData (Node 20+, no npm deps)
    const form = new FormData();
    form.append('from', args.from as string);
    form.append('to', args.to as string);
    form.append('subject', args.subject as string);
    if (args.text) form.append('text', args.text as string);
    if (args.html) form.append('html', args.html as string);
    if (args.reply_to) form.append('replyto', args.reply_to as string);

    const response = await this.fetchWithRetry(`${this.baseUrl}/email/3/send`, {
      method: 'POST',
      headers: {
        Authorization: `App ${this.apiKey}`,
        // Content-Type with multipart boundary is set automatically by fetch when body is FormData
      },
      body: form,
    });
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `API error: ${response.status} ${errText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getEmailDeliveryReports(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = { limit: String((args.limit as number) || 50) };
    if (args.bulk_id) params.bulkId = args.bulk_id as string;
    if (args.message_id) params.messageId = args.message_id as string;
    return this.ibGet('/email/1/reports', params);
  }

  private async getEmailLogs(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = { limit: String((args.limit as number) || 50) };
    if (args.message_id) params.messageId = args.message_id as string;
    if (args.from) params.from = args.from as string;
    if (args.to) params.to = args.to as string;
    if (args.sent_since) params.sentSince = args.sent_since as string;
    if (args.sent_until) params.sentUntil = args.sent_until as string;
    return this.ibGet('/email/1/logs', params);
  }

  private async sendVoiceMessage(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.to || !args.text) return { content: [{ type: 'text', text: 'to and text are required' }], isError: true };
    const body: Record<string, unknown> = {
      messages: [{
        destinations: [{ to: args.to }],
        text: args.text,
        language: (args.language as string) || 'en-US',
      }],
    };
    if (args.from) (body.messages as Record<string, unknown>[])[0].from = args.from;
    return this.ibPost('/tts/3/single', body);
  }

  private async getVoiceLogs(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = { limit: String((args.limit as number) || 50) };
    if (args.from) params.from = args.from as string;
    if (args.to) params.to = args.to as string;
    if (args.sent_since) params.sentSince = args.sent_since as string;
    if (args.sent_until) params.sentUntil = args.sent_until as string;
    return this.ibGet('/tts/3/logs', params);
  }

  private async send2faPin(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.app_id || !args.message_id || !args.to) {
      return { content: [{ type: 'text', text: 'app_id, message_id, and to are required' }], isError: true };
    }
    const body: Record<string, unknown> = { to: args.to };
    if (args.from) body.from = args.from;
    return this.ibPost(`/2fa/2/applications/${encodeURIComponent(args.app_id as string)}/messages/${encodeURIComponent(args.message_id as string)}/pin`, body);
  }

  private async verify2faPin(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.pin_id || !args.pin) return { content: [{ type: 'text', text: 'pin_id and pin are required' }], isError: true };
    return this.ibPost(`/2fa/2/pin/${encodeURIComponent(args.pin_id as string)}/verify`, { pin: args.pin });
  }

  private async resend2faPin(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.pin_id) return { content: [{ type: 'text', text: 'pin_id is required' }], isError: true };
    return this.ibPost(`/2fa/2/pin/${encodeURIComponent(args.pin_id as string)}/resend`, {});
  }

  private async getAccountBalance(): Promise<ToolResult> {
    return this.ibGet('/account/1/balance');
  }

  private async listSentMessageLogs(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = { limit: String((args.limit as number) || 50) };
    if (args.sent_since) params.sentSince = args.sent_since as string;
    if (args.sent_until) params.sentUntil = args.sent_until as string;
    if (args.channel) params.channel = args.channel as string;
    return this.ibGet('/messaging/1/logs', params);
  }

  private async createContact(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {};
    if (args.first_name) body.firstName = args.first_name;
    if (args.last_name) body.lastName = args.last_name;
    if (args.phone) body.phone = args.phone;
    if (args.email) body.email = args.email;
    return this.ibPost('/people/2/persons', body);
  }

  private async getContact(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.phone && !args.email) {
      return { content: [{ type: 'text', text: 'phone or email is required' }], isError: true };
    }
    const params: Record<string, string> = {};
    if (args.phone) params.phoneNumber = args.phone as string;
    if (args.email) params.email = args.email as string;
    return this.ibGet('/people/2/persons', params);
  }
}

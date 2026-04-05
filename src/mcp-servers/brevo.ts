/**
 * Brevo MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://mcp.brevo.com/v1/brevo/mcp — transport: streamable-HTTP, auth: Bearer MCP token
//   Documented at: https://developers.brevo.com/docs/mcp-protocol (sendinblue.readme.io/docs/mcp-protocol)
//   Also: https://help.brevo.com/hc/en-us/articles/27978590646802
//   Maintained: active as of 2026-03-28. Vendor-official (published by Brevo directly).
//   Covers: 27 service modules including contacts, lists, email campaigns, transactional email,
//     templates, SMS campaigns, senders, campaign analytics — PLUS CRM (deals, companies, tasks,
//     pipelines, notes), WhatsApp campaigns/management, segments, folders, groups, domains,
//     attributes, contact import/export, account management. MCP meets all 4 criteria.
// Our adapter covers: 24 tools. Vendor MCP covers: 27 modules (full API surface + CRM/WhatsApp).
// Recommendation: use-both — MCP adds CRM (deals, companies, tasks, pipelines, notes),
//   WhatsApp campaigns, segments, folders, groups, domains, attributes, contact-import/export,
//   and account management that this adapter does not implement. Our adapter implements SMS
//   campaigns and detailed transactional email tooling that are confirmed present in the MCP
//   but with equivalent coverage; REST adapter retained for air-gapped deployments.
//
// Integration: use-both
// MCP-sourced tools (unique to MCP): deals, companies, tasks, pipelines, notes, whatsapp_campaigns,
//   whatsapp_management, segments, folders, groups, domains, attributes, contact_import_export,
//   account_management (14 modules not covered by this REST adapter)
// REST-sourced tools (24): list_contacts, get_contact, create_contact, update_contact,
//   delete_contact, list_contact_lists, get_contact_list, create_contact_list,
//   add_contacts_to_list, list_email_campaigns, get_email_campaign, create_email_campaign,
//   send_email_campaign, list_transactional_templates, get_template, create_template,
//   send_transactional_email, list_sms_campaigns, create_sms_campaign, get_account,
//   list_senders, create_sender, get_email_statistics, get_contact_statistics
// Combined coverage: 24 REST tools + 14 MCP-unique modules = 38 total operations
// Note: houtini-ai/brevo-mcp (https://github.com/houtini-ai/brevo-mcp) is a community server
//   (not official). The official MCP server is vendor-hosted at mcp.brevo.com.
//
// Base URL: https://api.brevo.com/v3
// Auth: API key passed in the api-key request header (not Authorization: Bearer)
// Docs: https://developers.brevo.com/reference/getting-started-1
// Rate limits: Not publicly documented; Brevo enforces per-plan limits; treat as ~100 req/min

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface BrevoConfig {
  apiKey: string;
  baseUrl?: string;
}

export class BrevoMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: BrevoConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? 'https://api.brevo.com/v3';
  }

  static catalog() {
    return {
      name: 'brevo',
      displayName: 'Brevo',
      version: '1.0.0',
      category: 'communication',
      keywords: [
        'brevo', 'sendinblue', 'email marketing', 'email campaign', 'transactional email',
        'sms', 'contact', 'list', 'template', 'newsletter', 'automation', 'sender',
        'campaign analytics', 'smtp', 'marketing',
      ],
      toolNames: [
        'list_contacts', 'get_contact', 'create_contact', 'update_contact', 'delete_contact',
        'list_contact_lists', 'get_contact_list', 'create_contact_list', 'add_contacts_to_list',
        'list_email_campaigns', 'get_email_campaign', 'create_email_campaign', 'send_email_campaign',
        'list_transactional_templates', 'get_template', 'create_template',
        'send_transactional_email',
        'list_sms_campaigns', 'create_sms_campaign',
        'get_account',
        'list_senders', 'create_sender',
        'get_email_statistics', 'get_contact_statistics',
      ],
      description: 'Brevo (formerly Sendinblue) email marketing and communication platform: manage contacts, lists, email and SMS campaigns, transactional emails, templates, and senders.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      // ── Contacts ──────────────────────────────────────────────────────────
      {
        name: 'list_contacts',
        description: 'List all contacts with optional limit, offset, and date filter for new contacts',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Max contacts to return (default: 50, max: 500)' },
            offset: { type: 'number', description: 'Pagination offset (default: 0)' },
            sort: { type: 'string', description: 'Sort order: asc or desc by creation date (default: desc)' },
            modifiedSince: {
              type: 'string',
              description: 'Filter contacts modified since this ISO 8601 datetime',
            },
            createdSince: {
              type: 'string',
              description: 'Filter contacts created since this ISO 8601 datetime',
            },
          },
        },
      },
      {
        name: 'get_contact',
        description: 'Get full details for a single contact by email address or numeric contact ID',
        inputSchema: {
          type: 'object',
          properties: {
            identifier: {
              type: 'string',
              description: 'Contact email address or numeric contact ID',
            },
          },
          required: ['identifier'],
        },
      },
      {
        name: 'create_contact',
        description: 'Create a new contact with email, optional attributes, and list subscriptions',
        inputSchema: {
          type: 'object',
          properties: {
            email: { type: 'string', description: 'Contact email address (must be unique)' },
            firstName: { type: 'string', description: 'Contact first name' },
            lastName: { type: 'string', description: 'Contact last name' },
            listIds: {
              type: 'string',
              description: 'Comma-separated list IDs to subscribe the contact to (e.g. "1,5,9")',
            },
            updateEnabled: {
              type: 'boolean',
              description: 'If true, update existing contact instead of returning error (default: false)',
            },
          },
          required: ['email'],
        },
      },
      {
        name: 'update_contact',
        description: 'Update attributes, list subscriptions, or unsubscribe status for an existing contact',
        inputSchema: {
          type: 'object',
          properties: {
            identifier: { type: 'string', description: 'Contact email address or numeric ID' },
            firstName: { type: 'string', description: 'Updated first name' },
            lastName: { type: 'string', description: 'Updated last name' },
            listIds: { type: 'string', description: 'Comma-separated list IDs to subscribe to' },
            unlinkListIds: { type: 'string', description: 'Comma-separated list IDs to unsubscribe from' },
          },
          required: ['identifier'],
        },
      },
      {
        name: 'delete_contact',
        description: 'Permanently delete a contact from Brevo by email address or contact ID',
        inputSchema: {
          type: 'object',
          properties: {
            identifier: { type: 'string', description: 'Contact email address or numeric contact ID' },
          },
          required: ['identifier'],
        },
      },
      // ── Contact Lists ─────────────────────────────────────────────────────
      {
        name: 'list_contact_lists',
        description: 'List all contact lists in the Brevo account with name, subscriber count, and ID',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Max lists to return (default: 50, max: 50)' },
            offset: { type: 'number', description: 'Pagination offset (default: 0)' },
            sort: { type: 'string', description: 'Sort order: asc or desc (default: desc)' },
          },
        },
      },
      {
        name: 'get_contact_list',
        description: 'Get details and subscriber count for a single contact list by its list ID',
        inputSchema: {
          type: 'object',
          properties: {
            list_id: { type: 'number', description: 'Contact list ID' },
          },
          required: ['list_id'],
        },
      },
      {
        name: 'create_contact_list',
        description: 'Create a new contact list with a name and optional folder assignment',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Name for the new list' },
            folderId: { type: 'number', description: 'Optional folder ID to group this list under' },
          },
          required: ['name'],
        },
      },
      {
        name: 'add_contacts_to_list',
        description: 'Add one or more contacts to a specific list by email addresses',
        inputSchema: {
          type: 'object',
          properties: {
            list_id: { type: 'number', description: 'List ID to add contacts to' },
            emails: {
              type: 'string',
              description: 'Comma-separated email addresses to add (max 150 per request)',
            },
          },
          required: ['list_id', 'emails'],
        },
      },
      // ── Email Campaigns ───────────────────────────────────────────────────
      {
        name: 'list_email_campaigns',
        description: 'List email campaigns with optional status filter and date range',
        inputSchema: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              description: 'Filter by status: draft, sent, archive, queued, suspended, in_process',
            },
            limit: { type: 'number', description: 'Max campaigns to return (default: 50, max: 500)' },
            offset: { type: 'number', description: 'Pagination offset (default: 0)' },
            sort: { type: 'string', description: 'Sort order: asc or desc by creation date (default: desc)' },
          },
        },
      },
      {
        name: 'get_email_campaign',
        description: 'Get full details and statistics for a specific email campaign by campaign ID',
        inputSchema: {
          type: 'object',
          properties: {
            campaign_id: { type: 'number', description: 'Email campaign ID' },
          },
          required: ['campaign_id'],
        },
      },
      {
        name: 'create_email_campaign',
        description: 'Create a new email campaign with subject, sender, recipient lists, and HTML content or template',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Internal campaign name' },
            subject: { type: 'string', description: 'Email subject line' },
            senderEmail: { type: 'string', description: 'Sender email address (must be verified)' },
            senderName: { type: 'string', description: 'Sender display name' },
            listIds: {
              type: 'string',
              description: 'Comma-separated contact list IDs to send to',
            },
            templateId: {
              type: 'number',
              description: 'Template ID to use for the email body (alternative to htmlContent)',
            },
            htmlContent: {
              type: 'string',
              description: 'HTML body of the email (alternative to templateId)',
            },
            scheduledAt: {
              type: 'string',
              description: 'ISO 8601 scheduled send time (leave empty to save as draft)',
            },
          },
          required: ['name', 'subject', 'senderEmail'],
        },
      },
      {
        name: 'send_email_campaign',
        description: 'Send a drafted email campaign immediately by its campaign ID',
        inputSchema: {
          type: 'object',
          properties: {
            campaign_id: { type: 'number', description: 'Campaign ID to send immediately' },
          },
          required: ['campaign_id'],
        },
      },
      // ── Transactional Templates ────────────────────────────────────────────
      {
        name: 'list_transactional_templates',
        description: 'List all transactional email templates in the account with name, status, and ID',
        inputSchema: {
          type: 'object',
          properties: {
            templateStatus: {
              type: 'boolean',
              description: 'Filter by active status: true (active only) or false (inactive only)',
            },
            limit: { type: 'number', description: 'Max templates to return (default: 50, max: 1000)' },
            offset: { type: 'number', description: 'Pagination offset (default: 0)' },
          },
        },
      },
      {
        name: 'get_template',
        description: 'Get the HTML content and metadata for a specific transactional email template',
        inputSchema: {
          type: 'object',
          properties: {
            template_id: { type: 'number', description: 'Template ID to retrieve' },
          },
          required: ['template_id'],
        },
      },
      {
        name: 'create_template',
        description: 'Create a new transactional email template with HTML content, subject, and sender details',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Template name' },
            subject: { type: 'string', description: 'Email subject line (supports Handlebars: {{ params.VARNAME }})' },
            htmlContent: { type: 'string', description: 'HTML body (supports Handlebars variable substitution)' },
            senderEmail: { type: 'string', description: 'Sender email address' },
            senderName: { type: 'string', description: 'Sender display name' },
            isActive: { type: 'boolean', description: 'Activate template immediately (default: true)' },
          },
          required: ['name', 'subject', 'htmlContent'],
        },
      },
      // ── Transactional Email ────────────────────────────────────────────────
      {
        name: 'send_transactional_email',
        description: 'Send a transactional email to one or more recipients using a template or inline content',
        inputSchema: {
          type: 'object',
          properties: {
            toEmail: { type: 'string', description: 'Recipient email address' },
            toName: { type: 'string', description: 'Recipient display name' },
            subject: { type: 'string', description: 'Email subject (required if not using a template)' },
            senderEmail: { type: 'string', description: 'Sender email address (required if not using a template)' },
            senderName: { type: 'string', description: 'Sender display name' },
            templateId: { type: 'number', description: 'Template ID to use (alternative to htmlContent)' },
            htmlContent: { type: 'string', description: 'HTML body (alternative to templateId)' },
            params: {
              type: 'string',
              description: 'JSON string of template parameters for variable substitution (e.g. {"name":"Alice"})',
            },
            tags: {
              type: 'string',
              description: 'Comma-separated tags for categorizing this send (max 10)',
            },
          },
          required: ['toEmail'],
        },
      },
      // ── SMS Campaigns ─────────────────────────────────────────────────────
      {
        name: 'list_sms_campaigns',
        description: 'List SMS campaigns with optional status filter',
        inputSchema: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              description: 'Filter by status: draft, sent, archive, queued, suspended, in_process',
            },
            limit: { type: 'number', description: 'Max campaigns to return (default: 50)' },
            offset: { type: 'number', description: 'Pagination offset (default: 0)' },
          },
        },
      },
      {
        name: 'create_sms_campaign',
        description: 'Create an SMS campaign with message content, recipient lists, and optional schedule',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Internal campaign name' },
            sender: { type: 'string', description: 'SMS sender name (max 11 alphanumeric characters)' },
            content: { type: 'string', description: 'SMS message content (max 160 chars for single SMS)' },
            listIds: { type: 'string', description: 'Comma-separated contact list IDs to send to' },
            scheduledAt: { type: 'string', description: 'ISO 8601 scheduled send time' },
          },
          required: ['name', 'sender', 'content'],
        },
      },
      // ── Account ───────────────────────────────────────────────────────────
      {
        name: 'get_account',
        description: 'Get Brevo account details including plan type, email and SMS credits, and company info',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      // ── Senders ───────────────────────────────────────────────────────────
      {
        name: 'list_senders',
        description: 'List all verified sender email addresses and domains configured in the Brevo account',
        inputSchema: {
          type: 'object',
          properties: {
            ip: { type: 'string', description: 'Filter senders by dedicated IP (optional)' },
          },
        },
      },
      {
        name: 'create_sender',
        description: 'Add a new sender email address to the Brevo account (triggers verification email)',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Sender display name' },
            email: { type: 'string', description: 'Sender email address to add and verify' },
          },
          required: ['name', 'email'],
        },
      },
      // ── Statistics ────────────────────────────────────────────────────────
      {
        name: 'get_email_statistics',
        description: 'Get aggregated email sending statistics for a date range — opens, clicks, bounces, unsubscribes',
        inputSchema: {
          type: 'object',
          properties: {
            startDate: { type: 'string', description: 'Start date in YYYY-MM-DD format' },
            endDate: { type: 'string', description: 'End date in YYYY-MM-DD format' },
            limit: { type: 'number', description: 'Max data points to return (default: 10)' },
            offset: { type: 'number', description: 'Pagination offset (default: 0)' },
          },
        },
      },
      {
        name: 'get_contact_statistics',
        description: 'Get sending and engagement statistics for a specific contact by email or ID',
        inputSchema: {
          type: 'object',
          properties: {
            identifier: { type: 'string', description: 'Contact email address or numeric contact ID' },
            startDate: { type: 'string', description: 'Start date in YYYY-MM-DD format' },
            endDate: { type: 'string', description: 'End date in YYYY-MM-DD format' },
          },
          required: ['identifier'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_contacts':                 return this.listContacts(args);
        case 'get_contact':                   return this.getContact(args);
        case 'create_contact':                return this.createContact(args);
        case 'update_contact':                return this.updateContact(args);
        case 'delete_contact':                return this.deleteContact(args);
        case 'list_contact_lists':            return this.listContactLists(args);
        case 'get_contact_list':              return this.getContactList(args);
        case 'create_contact_list':           return this.createContactList(args);
        case 'add_contacts_to_list':          return this.addContactsToList(args);
        case 'list_email_campaigns':          return this.listEmailCampaigns(args);
        case 'get_email_campaign':            return this.getEmailCampaign(args);
        case 'create_email_campaign':         return this.createEmailCampaign(args);
        case 'send_email_campaign':           return this.sendEmailCampaign(args);
        case 'list_transactional_templates':  return this.listTransactionalTemplates(args);
        case 'get_template':                  return this.getTemplate(args);
        case 'create_template':               return this.createTemplate(args);
        case 'send_transactional_email':      return this.sendTransactionalEmail(args);
        case 'list_sms_campaigns':            return this.listSmsCampaigns(args);
        case 'create_sms_campaign':           return this.createSmsCampaign(args);
        case 'get_account':                   return this.getAccount();
        case 'list_senders':                  return this.listSenders(args);
        case 'create_sender':                 return this.createSender(args);
        case 'get_email_statistics':          return this.getEmailStatistics(args);
        case 'get_contact_statistics':        return this.getContactStatistics(args);
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

  // ── Private helpers ────────────────────────────────────────────────────────

  private get authHeaders(): Record<string, string> {
    return {
      'api-key': this.apiKey,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  private async apiGet(path: string, params: Record<string, string> = {}): Promise<ToolResult> {
    const qs = Object.keys(params).length ? '?' + new URLSearchParams(params).toString() : '';
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}${qs}`, {
      headers: this.authHeaders,
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apiPost(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.authHeaders,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json().catch(() => ({ success: true }));
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apiPut(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'PUT',
      headers: this.authHeaders,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json().catch(() => ({ success: true }));
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apiDelete(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'DELETE',
      headers: this.authHeaders,
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: JSON.stringify({ deleted: true }) }], isError: false };
  }

  // ── Tool implementations ──────────────────────────────────────────────────

  private async listContacts(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      limit: String((args.limit as number) ?? 50),
      offset: String((args.offset as number) ?? 0),
      sort: (args.sort as string) ?? 'desc',
    };
    if (args.modifiedSince) params.modifiedSince = args.modifiedSince as string;
    if (args.createdSince) params.createdSince = args.createdSince as string;
    return this.apiGet('/contacts', params);
  }

  private async getContact(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.identifier) return { content: [{ type: 'text', text: 'identifier is required' }], isError: true };
    return this.apiGet(`/contacts/${encodeURIComponent(args.identifier as string)}`);
  }

  private async createContact(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.email) return { content: [{ type: 'text', text: 'email is required' }], isError: true };
    const body: Record<string, unknown> = { email: args.email };
    const attributes: Record<string, unknown> = {};
    if (args.firstName) attributes.FIRSTNAME = args.firstName;
    if (args.lastName) attributes.LASTNAME = args.lastName;
    if (Object.keys(attributes).length) body.attributes = attributes;
    if (args.listIds) body.listIds = (args.listIds as string).split(',').map(Number);
    if (typeof args.updateEnabled === 'boolean') body.updateEnabled = args.updateEnabled;
    return this.apiPost('/contacts', body);
  }

  private async updateContact(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.identifier) return { content: [{ type: 'text', text: 'identifier is required' }], isError: true };
    const body: Record<string, unknown> = {};
    const attributes: Record<string, unknown> = {};
    if (args.firstName) attributes.FIRSTNAME = args.firstName;
    if (args.lastName) attributes.LASTNAME = args.lastName;
    if (Object.keys(attributes).length) body.attributes = attributes;
    if (args.listIds) body.listIds = (args.listIds as string).split(',').map(Number);
    if (args.unlinkListIds) body.unlinkListIds = (args.unlinkListIds as string).split(',').map(Number);
    return this.apiPut(`/contacts/${encodeURIComponent(args.identifier as string)}`, body);
  }

  private async deleteContact(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.identifier) return { content: [{ type: 'text', text: 'identifier is required' }], isError: true };
    return this.apiDelete(`/contacts/${encodeURIComponent(args.identifier as string)}`);
  }

  private async listContactLists(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      limit: String((args.limit as number) ?? 50),
      offset: String((args.offset as number) ?? 0),
      sort: (args.sort as string) ?? 'desc',
    };
    return this.apiGet('/contacts/lists', params);
  }

  private async getContactList(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.list_id) return { content: [{ type: 'text', text: 'list_id is required' }], isError: true };
    return this.apiGet(`/contacts/lists/${encodeURIComponent(args.list_id as string)}`);
  }

  private async createContactList(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name) return { content: [{ type: 'text', text: 'name is required' }], isError: true };
    const body: Record<string, unknown> = { name: args.name };
    if (args.folderId) body.folderId = args.folderId;
    return this.apiPost('/contacts/lists', body);
  }

  private async addContactsToList(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.list_id || !args.emails) {
      return { content: [{ type: 'text', text: 'list_id and emails are required' }], isError: true };
    }
    const emails = (args.emails as string).split(',').map(e => e.trim());
    return this.apiPost(`/contacts/lists/${encodeURIComponent(args.list_id as string)}/contacts/add`, { emails });
  }

  private async listEmailCampaigns(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      limit: String((args.limit as number) ?? 50),
      offset: String((args.offset as number) ?? 0),
      sort: (args.sort as string) ?? 'desc',
    };
    if (args.status) params.status = args.status as string;
    return this.apiGet('/emailCampaigns', params);
  }

  private async getEmailCampaign(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.campaign_id) return { content: [{ type: 'text', text: 'campaign_id is required' }], isError: true };
    return this.apiGet(`/emailCampaigns/${encodeURIComponent(args.campaign_id as string)}`);
  }

  private async createEmailCampaign(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name || !args.subject || !args.senderEmail) {
      return { content: [{ type: 'text', text: 'name, subject, and senderEmail are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      name: args.name,
      subject: args.subject,
      sender: { email: args.senderEmail, name: args.senderName ?? args.senderEmail },
    };
    if (args.listIds) body.recipients = { listIds: (args.listIds as string).split(',').map(Number) };
    if (args.templateId) body.templateId = args.templateId;
    if (args.htmlContent) body.htmlContent = args.htmlContent;
    if (args.scheduledAt) body.scheduledAt = args.scheduledAt;
    return this.apiPost('/emailCampaigns', body);
  }

  private async sendEmailCampaign(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.campaign_id) return { content: [{ type: 'text', text: 'campaign_id is required' }], isError: true };
    return this.apiPost(`/emailCampaigns/${encodeURIComponent(args.campaign_id as string)}/sendNow`, {});
  }

  private async listTransactionalTemplates(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      limit: String((args.limit as number) ?? 50),
      offset: String((args.offset as number) ?? 0),
    };
    if (typeof args.templateStatus === 'boolean') params.templateStatus = String(args.templateStatus);
    return this.apiGet('/smtp/templates', params);
  }

  private async getTemplate(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.template_id) return { content: [{ type: 'text', text: 'template_id is required' }], isError: true };
    return this.apiGet(`/smtp/templates/${encodeURIComponent(args.template_id as string)}`);
  }

  private async createTemplate(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name || !args.subject || !args.htmlContent) {
      return { content: [{ type: 'text', text: 'name, subject, and htmlContent are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      templateName: args.name,
      subject: args.subject,
      htmlContent: args.htmlContent,
      isActive: typeof args.isActive === 'boolean' ? args.isActive : true,
    };
    if (args.senderEmail) body.sender = { email: args.senderEmail, name: args.senderName ?? args.senderEmail };
    return this.apiPost('/smtp/templates', body);
  }

  private async sendTransactionalEmail(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.toEmail) return { content: [{ type: 'text', text: 'toEmail is required' }], isError: true };
    const body: Record<string, unknown> = {
      to: [{ email: args.toEmail, name: args.toName ?? args.toEmail }],
    };
    if (args.templateId) body.templateId = args.templateId;
    if (args.subject) body.subject = args.subject;
    if (args.htmlContent) body.htmlContent = args.htmlContent;
    if (args.senderEmail) body.sender = { email: args.senderEmail, name: args.senderName ?? args.senderEmail };
    if (args.params) {
      try { body.params = JSON.parse(args.params as string); } catch { /* ignore invalid JSON */ }
    }
    if (args.tags) body.tags = (args.tags as string).split(',').map(t => t.trim());
    return this.apiPost('/smtp/email', body);
  }

  private async listSmsCampaigns(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      limit: String((args.limit as number) ?? 50),
      offset: String((args.offset as number) ?? 0),
    };
    if (args.status) params.status = args.status as string;
    return this.apiGet('/smsCampaigns', params);
  }

  private async createSmsCampaign(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name || !args.sender || !args.content) {
      return { content: [{ type: 'text', text: 'name, sender, and content are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      name: args.name,
      sender: args.sender,
      content: args.content,
    };
    if (args.listIds) body.recipients = { listIds: (args.listIds as string).split(',').map(Number) };
    if (args.scheduledAt) body.scheduledAt = args.scheduledAt;
    return this.apiPost('/smsCampaigns', body);
  }

  private async getAccount(): Promise<ToolResult> {
    return this.apiGet('/account');
  }

  private async listSenders(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (args.ip) params.ip = args.ip as string;
    return this.apiGet('/senders', params);
  }

  private async createSender(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name || !args.email) {
      return { content: [{ type: 'text', text: 'name and email are required' }], isError: true };
    }
    return this.apiPost('/senders', { name: args.name, email: args.email });
  }

  private async getEmailStatistics(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      limit: String((args.limit as number) ?? 10),
      offset: String((args.offset as number) ?? 0),
    };
    if (args.startDate) params.startDate = args.startDate as string;
    if (args.endDate) params.endDate = args.endDate as string;
    return this.apiGet('/smtp/statistics/aggregatedReport', params);
  }

  private async getContactStatistics(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.identifier) return { content: [{ type: 'text', text: 'identifier is required' }], isError: true };
    const params: Record<string, string> = {};
    if (args.startDate) params.startDate = args.startDate as string;
    if (args.endDate) params.endDate = args.endDate as string;
    return this.apiGet(`/contacts/${encodeURIComponent(args.identifier as string)}/campaignStats`, params);
  }
}

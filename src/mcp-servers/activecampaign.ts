/**
 * ActiveCampaign MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://developers.activecampaign.com/page/mcp — Remote MCP (streamable-HTTP), auth: API key
//   ActiveCampaign published an official remote MCP server with 27+ tools covering contacts, field values,
//   campaigns, automations (including contact_automation operations), and deals with notes.
//   Vendor MCP tools (27): list_contacts, get_contact, create_or_update_contact, list_tags, get_tag,
//   create_contact_tag, add_tag_to_contact, list_lists, get_list, list_contact_field_values,
//   get_contact_field_value, create_contact_field_value, update_contact_field_value, list_campaigns,
//   get_campaign, get_campaign_links, list_automations, list_contact_automations, get_contact_automation,
//   add_contact_to_automation, remove_contact_from_automation, list_deals, get_deal, create_deal,
//   update_deal, create_deal_note, update_deal_note
//   Our adapter covers 22 tools (contacts, lists, tags, deals, automations, campaigns, custom fields, webhooks).
//   MCP-only (not in our adapter): list_contact_field_values, get_contact_field_value,
//   create_contact_field_value, update_contact_field_value, get_campaign_links, list_contact_automations,
//   get_contact_automation, remove_contact_from_automation, create_deal_note, update_deal_note
//   Our adapter-only (not in MCP): search_contacts, list_custom_fields, list_webhooks, create_webhook,
//   delete_webhook, delete_contact, create_list, remove_tag_from_contact
// Integration: use-both — vendor MCP has 10 unique tools not in our adapter; our adapter has 8 unique tools
//   not in the MCP (webhooks, search, contact deletion, list creation). Full coverage requires union.
// MCP-sourced tools (10): list_contact_field_values, get_contact_field_value, create_contact_field_value,
//   update_contact_field_value, get_campaign_links, list_contact_automations, get_contact_automation,
//   remove_contact_from_automation, create_deal_note, update_deal_note
// REST-sourced tools (22): [all tools in this adapter]
//
// Base URL: https://<your-account>.api-us1.com/api/3  (account-specific — required in config)
// Auth: Api-Token header with your API key (found in Settings → Developer)
// Docs: https://developers.activecampaign.com/reference/overview
// Rate limits: 5 requests/second per account. 429 Too Many Requests on breach.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface ActiveCampaignConfig {
  /** Your ActiveCampaign API key (from Settings → Developer) */
  apiKey: string;
  /** Your account-specific API URL, e.g. https://myaccount.api-us1.com */
  accountUrl: string;
}

export class ActiveCampaignMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: ActiveCampaignConfig) {
    super();
    this.apiKey = config.apiKey;
    // Normalize: strip trailing slash, append /api/3
    const base = config.accountUrl.replace(/\/+$/, '');
    this.baseUrl = base.endsWith('/api/3') ? base : `${base}/api/3`;
  }

  static catalog() {
    return {
      name: 'activecampaign',
      displayName: 'ActiveCampaign',
      version: '1.0.0',
      category: 'crm',
      keywords: [
        'activecampaign', 'marketing', 'automation', 'email', 'campaign', 'contact',
        'crm', 'list', 'tag', 'deal', 'pipeline', 'lead', 'segmentation',
        'drip', 'sequence', 'webhook', 'custom field',
      ],
      toolNames: [
        'list_contacts', 'get_contact', 'create_contact', 'update_contact', 'delete_contact',
        'search_contacts',
        'list_lists', 'get_list', 'create_list',
        'list_tags', 'create_tag', 'add_tag_to_contact', 'remove_tag_from_contact',
        'list_automations', 'add_contact_to_automation',
        'list_campaigns', 'get_campaign',
        'list_deals', 'get_deal', 'create_deal', 'update_deal',
        'list_custom_fields',
      ],
      description: 'ActiveCampaign marketing automation and CRM: manage contacts, lists, tags, campaigns, automations, and deals via the v3 API.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_contacts',
        description: 'List contacts with optional filters for email, status, tag, list, and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            email: {
              type: 'string',
              description: 'Filter contacts by exact email address',
            },
            status: {
              type: 'number',
              description: 'Filter by subscription status: -1=any, 0=unconfirmed, 1=active, 2=unsubscribed, 3=bounced (default: -1)',
            },
            tag_id: {
              type: 'number',
              description: 'Filter contacts who have a specific tag ID',
            },
            list_id: {
              type: 'number',
              description: 'Filter contacts subscribed to a specific list ID',
            },
            limit: {
              type: 'number',
              description: 'Maximum contacts to return (default: 20, max: 100)',
            },
            offset: {
              type: 'number',
              description: 'Pagination offset (default: 0)',
            },
          },
        },
      },
      {
        name: 'get_contact',
        description: 'Get full profile for a single contact by their ActiveCampaign contact ID',
        inputSchema: {
          type: 'object',
          properties: {
            contact_id: {
              type: 'string',
              description: 'ActiveCampaign numeric contact ID',
            },
          },
          required: ['contact_id'],
        },
      },
      {
        name: 'create_contact',
        description: 'Create a new contact in ActiveCampaign with email, name, phone, and optional field values',
        inputSchema: {
          type: 'object',
          properties: {
            email: {
              type: 'string',
              description: 'Contact email address (must be unique)',
            },
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
              description: 'Contact phone number',
            },
            organization: {
              type: 'string',
              description: 'Company or organization name',
            },
            field_values: {
              type: 'array',
              description: 'Array of custom field value objects: [{field: "1", value: "text"}, ...]',
            },
          },
          required: ['email'],
        },
      },
      {
        name: 'update_contact',
        description: 'Update an existing contact\'s profile fields by contact ID',
        inputSchema: {
          type: 'object',
          properties: {
            contact_id: {
              type: 'string',
              description: 'ActiveCampaign contact ID to update',
            },
            email: {
              type: 'string',
              description: 'Updated email address',
            },
            first_name: {
              type: 'string',
              description: 'Updated first name',
            },
            last_name: {
              type: 'string',
              description: 'Updated last name',
            },
            phone: {
              type: 'string',
              description: 'Updated phone number',
            },
            organization: {
              type: 'string',
              description: 'Updated organization name',
            },
            field_values: {
              type: 'array',
              description: 'Array of custom field value updates: [{field: "1", value: "new text"}, ...]',
            },
          },
          required: ['contact_id'],
        },
      },
      {
        name: 'delete_contact',
        description: 'Permanently delete a contact from ActiveCampaign by contact ID',
        inputSchema: {
          type: 'object',
          properties: {
            contact_id: {
              type: 'string',
              description: 'ActiveCampaign contact ID to delete',
            },
          },
          required: ['contact_id'],
        },
      },
      {
        name: 'search_contacts',
        description: 'Search contacts by name, email, or phone number with full-text search',
        inputSchema: {
          type: 'object',
          properties: {
            search: {
              type: 'string',
              description: 'Search term to match against contact name, email, or phone',
            },
            limit: {
              type: 'number',
              description: 'Maximum results to return (default: 20, max: 100)',
            },
            offset: {
              type: 'number',
              description: 'Pagination offset (default: 0)',
            },
          },
          required: ['search'],
        },
      },
      {
        name: 'list_lists',
        description: 'List all email lists in the ActiveCampaign account with subscriber counts',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum lists to return (default: 20, max: 100)',
            },
            offset: {
              type: 'number',
              description: 'Pagination offset (default: 0)',
            },
          },
        },
      },
      {
        name: 'get_list',
        description: 'Get details for a specific email list by list ID',
        inputSchema: {
          type: 'object',
          properties: {
            list_id: {
              type: 'string',
              description: 'ActiveCampaign list ID',
            },
          },
          required: ['list_id'],
        },
      },
      {
        name: 'create_list',
        description: 'Create a new email list in ActiveCampaign',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Name for the new email list',
            },
            stringid: {
              type: 'string',
              description: 'URL-friendly identifier for the list (lowercase, hyphens — auto-generated if omitted)',
            },
            sender_name: {
              type: 'string',
              description: 'Default sender name for emails sent to this list',
            },
            sender_addr1: {
              type: 'string',
              description: 'Sender physical address line 1 (required by CAN-SPAM)',
            },
            sender_city: {
              type: 'string',
              description: 'Sender city',
            },
            sender_state: {
              type: 'string',
              description: 'Sender state/province',
            },
            sender_zip: {
              type: 'string',
              description: 'Sender ZIP/postal code',
            },
            sender_country: {
              type: 'string',
              description: 'Sender country (default: US)',
            },
            sender_url: {
              type: 'string',
              description: 'Sender website URL',
            },
            sender_reminder: {
              type: 'string',
              description: 'Subscription reminder shown to recipients in email footer',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'list_tags',
        description: 'List all tags in the ActiveCampaign account with usage counts',
        inputSchema: {
          type: 'object',
          properties: {
            search: {
              type: 'string',
              description: 'Filter tags by name substring',
            },
            limit: {
              type: 'number',
              description: 'Maximum tags to return (default: 20, max: 100)',
            },
            offset: {
              type: 'number',
              description: 'Pagination offset (default: 0)',
            },
          },
        },
      },
      {
        name: 'create_tag',
        description: 'Create a new tag in ActiveCampaign for contact segmentation',
        inputSchema: {
          type: 'object',
          properties: {
            tag: {
              type: 'string',
              description: 'Tag name to create',
            },
            tag_type: {
              type: 'string',
              description: 'Tag type: contact (default) or template',
            },
            description: {
              type: 'string',
              description: 'Optional description for the tag',
            },
          },
          required: ['tag'],
        },
      },
      {
        name: 'add_tag_to_contact',
        description: 'Add a tag to a contact by contact ID and tag ID',
        inputSchema: {
          type: 'object',
          properties: {
            contact_id: {
              type: 'string',
              description: 'ActiveCampaign contact ID',
            },
            tag_id: {
              type: 'string',
              description: 'Tag ID to add to the contact',
            },
          },
          required: ['contact_id', 'tag_id'],
        },
      },
      {
        name: 'remove_tag_from_contact',
        description: 'Remove a tag from a contact by the contact-tag relationship ID',
        inputSchema: {
          type: 'object',
          properties: {
            contact_tag_id: {
              type: 'string',
              description: 'The contactTag relationship ID (returned by add_tag_to_contact)',
            },
          },
          required: ['contact_tag_id'],
        },
      },
      {
        name: 'list_automations',
        description: 'List all automation workflows in the account with status and contact counts',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum automations to return (default: 20, max: 100)',
            },
            offset: {
              type: 'number',
              description: 'Pagination offset (default: 0)',
            },
          },
        },
      },
      {
        name: 'add_contact_to_automation',
        description: 'Add a contact to an automation workflow to trigger the sequence',
        inputSchema: {
          type: 'object',
          properties: {
            contact_id: {
              type: 'string',
              description: 'ActiveCampaign contact ID to enroll in the automation',
            },
            automation_id: {
              type: 'string',
              description: 'Automation ID to add the contact to',
            },
          },
          required: ['contact_id', 'automation_id'],
        },
      },
      {
        name: 'list_campaigns',
        description: 'List email campaigns with optional filters for type and status',
        inputSchema: {
          type: 'object',
          properties: {
            status: {
              type: 'number',
              description: 'Filter by status: 0=draft, 1=scheduled, 2=sending, 3=sent, 5=waiting (default: all)',
            },
            type: {
              type: 'string',
              description: 'Filter by campaign type: single, recurring, split, responder, reminder, activerss, text',
            },
            limit: {
              type: 'number',
              description: 'Maximum campaigns to return (default: 20, max: 100)',
            },
            offset: {
              type: 'number',
              description: 'Pagination offset (default: 0)',
            },
          },
        },
      },
      {
        name: 'get_campaign',
        description: 'Get full details for a specific email campaign by campaign ID',
        inputSchema: {
          type: 'object',
          properties: {
            campaign_id: {
              type: 'string',
              description: 'ActiveCampaign campaign ID',
            },
          },
          required: ['campaign_id'],
        },
      },
      {
        name: 'list_deals',
        description: 'List deals in the CRM pipeline with optional filters for stage, owner, status, and title',
        inputSchema: {
          type: 'object',
          properties: {
            title: {
              type: 'string',
              description: 'Filter deals by title substring',
            },
            stage: {
              type: 'string',
              description: 'Filter by pipeline stage ID',
            },
            owner: {
              type: 'string',
              description: 'Filter by owner user ID',
            },
            status: {
              type: 'number',
              description: 'Filter by deal status: 0=open, 1=won, 2=lost (default: 0)',
            },
            limit: {
              type: 'number',
              description: 'Maximum deals to return (default: 20, max: 100)',
            },
            offset: {
              type: 'number',
              description: 'Pagination offset (default: 0)',
            },
          },
        },
      },
      {
        name: 'get_deal',
        description: 'Get full details for a specific CRM deal by deal ID',
        inputSchema: {
          type: 'object',
          properties: {
            deal_id: {
              type: 'string',
              description: 'ActiveCampaign deal ID',
            },
          },
          required: ['deal_id'],
        },
      },
      {
        name: 'create_deal',
        description: 'Create a new deal in the ActiveCampaign CRM pipeline',
        inputSchema: {
          type: 'object',
          properties: {
            title: {
              type: 'string',
              description: 'Deal title or name',
            },
            contact: {
              type: 'string',
              description: 'Associated contact ID',
            },
            value: {
              type: 'number',
              description: 'Deal value in cents (e.g. 5000 = $50.00)',
            },
            currency: {
              type: 'string',
              description: 'ISO 4217 currency code (default: USD)',
            },
            stage: {
              type: 'string',
              description: 'Pipeline stage ID to place the deal in',
            },
            owner: {
              type: 'string',
              description: 'User ID to assign as deal owner',
            },
            percent: {
              type: 'number',
              description: 'Deal probability percentage (0-100)',
            },
            description: {
              type: 'string',
              description: 'Deal notes or description',
            },
          },
          required: ['title', 'contact', 'value', 'currency'],
        },
      },
      {
        name: 'update_deal',
        description: 'Update deal title, value, stage, status, or other fields by deal ID',
        inputSchema: {
          type: 'object',
          properties: {
            deal_id: {
              type: 'string',
              description: 'ActiveCampaign deal ID to update',
            },
            title: {
              type: 'string',
              description: 'Updated deal title',
            },
            value: {
              type: 'number',
              description: 'Updated deal value in cents',
            },
            stage: {
              type: 'string',
              description: 'Updated pipeline stage ID',
            },
            status: {
              type: 'number',
              description: 'Updated status: 0=open, 1=won, 2=lost',
            },
            percent: {
              type: 'number',
              description: 'Updated probability percentage (0-100)',
            },
          },
          required: ['deal_id'],
        },
      },
      {
        name: 'list_custom_fields',
        description: 'List all custom contact fields defined in the ActiveCampaign account with field IDs and types',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum custom fields to return (default: 20, max: 100)',
            },
            offset: {
              type: 'number',
              description: 'Pagination offset (default: 0)',
            },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_contacts':
          return this.listContacts(args);
        case 'get_contact':
          return this.getContact(args);
        case 'create_contact':
          return this.createContact(args);
        case 'update_contact':
          return this.updateContact(args);
        case 'delete_contact':
          return this.deleteContact(args);
        case 'search_contacts':
          return this.searchContacts(args);
        case 'list_lists':
          return this.listLists(args);
        case 'get_list':
          return this.getList(args);
        case 'create_list':
          return this.createList(args);
        case 'list_tags':
          return this.listTags(args);
        case 'create_tag':
          return this.createTag(args);
        case 'add_tag_to_contact':
          return this.addTagToContact(args);
        case 'remove_tag_from_contact':
          return this.removeTagFromContact(args);
        case 'list_automations':
          return this.listAutomations(args);
        case 'add_contact_to_automation':
          return this.addContactToAutomation(args);
        case 'list_campaigns':
          return this.listCampaigns(args);
        case 'get_campaign':
          return this.getCampaign(args);
        case 'list_deals':
          return this.listDeals(args);
        case 'get_deal':
          return this.getDeal(args);
        case 'create_deal':
          return this.createDeal(args);
        case 'update_deal':
          return this.updateDeal(args);
        case 'list_custom_fields':
          return this.listCustomFields(args);
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
      'Api-Token': this.apiKey,
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
    try { data = await response.json(); } catch { throw new Error(`ActiveCampaign returned non-JSON (HTTP ${response.status})`); }
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
    try { data = await response.json(); } catch { throw new Error(`ActiveCampaign returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async put(path: string, body: unknown): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'PUT',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`ActiveCampaign returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async delete(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'DELETE',
      headers: this.headers,
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: JSON.stringify({ deleted: true, id: path.split('/').pop() }) }], isError: false };
  }

  private async listContacts(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string | undefined> = {
      'email': args.email as string | undefined,
      'status': args.status !== undefined ? String(args.status) : undefined,
      'tagid': args.tag_id !== undefined ? String(args.tag_id) : undefined,
      'listid': args.list_id !== undefined ? String(args.list_id) : undefined,
      'limit': String((args.limit as number) ?? 20),
      'offset': String((args.offset as number) ?? 0),
    };
    return this.get('/contacts', params);
  }

  private async getContact(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.contact_id) return { content: [{ type: 'text', text: 'contact_id is required' }], isError: true };
    return this.get(`/contacts/${encodeURIComponent(args.contact_id as string)}`);
  }

  private async createContact(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.email) return { content: [{ type: 'text', text: 'email is required' }], isError: true };
    const contact: Record<string, unknown> = { email: args.email };
    if (args.first_name) contact.firstName = args.first_name;
    if (args.last_name) contact.lastName = args.last_name;
    if (args.phone) contact.phone = args.phone;
    if (args.organization) contact.orgname = args.organization;
    if (args.field_values) contact.fieldValues = args.field_values;
    return this.post('/contacts', { contact });
  }

  private async updateContact(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.contact_id) return { content: [{ type: 'text', text: 'contact_id is required' }], isError: true };
    const contact: Record<string, unknown> = {};
    if (args.email) contact.email = args.email;
    if (args.first_name) contact.firstName = args.first_name;
    if (args.last_name) contact.lastName = args.last_name;
    if (args.phone) contact.phone = args.phone;
    if (args.organization) contact.orgname = args.organization;
    if (args.field_values) contact.fieldValues = args.field_values;
    return this.put(`/contacts/${encodeURIComponent(args.contact_id as string)}`, { contact });
  }

  private async deleteContact(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.contact_id) return { content: [{ type: 'text', text: 'contact_id is required' }], isError: true };
    return this.delete(`/contacts/${encodeURIComponent(args.contact_id as string)}`);
  }

  private async searchContacts(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.search) return { content: [{ type: 'text', text: 'search is required' }], isError: true };
    const params: Record<string, string | undefined> = {
      search: args.search as string,
      limit: String((args.limit as number) ?? 20),
      offset: String((args.offset as number) ?? 0),
    };
    return this.get('/contacts', params);
  }

  private async listLists(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string | undefined> = {
      limit: String((args.limit as number) ?? 20),
      offset: String((args.offset as number) ?? 0),
    };
    return this.get('/lists', params);
  }

  private async getList(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.list_id) return { content: [{ type: 'text', text: 'list_id is required' }], isError: true };
    return this.get(`/lists/${encodeURIComponent(args.list_id as string)}`);
  }

  private async createList(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name) return { content: [{ type: 'text', text: 'name is required' }], isError: true };
    const list: Record<string, unknown> = { name: args.name };
    if (args.stringid) list.stringid = args.stringid;
    if (args.sender_name) list.sender_name = args.sender_name;
    if (args.sender_addr1) list.sender_addr1 = args.sender_addr1;
    if (args.sender_city) list.sender_city = args.sender_city;
    if (args.sender_state) list.sender_state = args.sender_state;
    if (args.sender_zip) list.sender_zip = args.sender_zip;
    if (args.sender_country) list.sender_country = args.sender_country;
    if (args.sender_url) list.sender_url = args.sender_url;
    if (args.sender_reminder) list.sender_reminder = args.sender_reminder;
    return this.post('/lists', { list });
  }

  private async listTags(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string | undefined> = {
      search: args.search as string | undefined,
      limit: String((args.limit as number) ?? 20),
      offset: String((args.offset as number) ?? 0),
    };
    return this.get('/tags', params);
  }

  private async createTag(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.tag) return { content: [{ type: 'text', text: 'tag is required' }], isError: true };
    const tag: Record<string, unknown> = {
      tag: args.tag,
      tagType: (args.tag_type as string) ?? 'contact',
    };
    if (args.description) tag.description = args.description;
    return this.post('/tags', { tag });
  }

  private async addTagToContact(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.contact_id || !args.tag_id) return { content: [{ type: 'text', text: 'contact_id and tag_id are required' }], isError: true };
    return this.post('/contactTags', {
      contactTag: { contact: String(args.contact_id), tag: String(args.tag_id) },
    });
  }

  private async removeTagFromContact(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.contact_tag_id) return { content: [{ type: 'text', text: 'contact_tag_id is required' }], isError: true };
    return this.delete(`/contactTags/${encodeURIComponent(args.contact_tag_id as string)}`);
  }

  private async listAutomations(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string | undefined> = {
      limit: String((args.limit as number) ?? 20),
      offset: String((args.offset as number) ?? 0),
    };
    return this.get('/automations', params);
  }

  private async addContactToAutomation(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.contact_id || !args.automation_id) {
      return { content: [{ type: 'text', text: 'contact_id and automation_id are required' }], isError: true };
    }
    return this.post('/contactAutomations', {
      contactAutomation: {
        contact: String(args.contact_id),
        automation: String(args.automation_id),
      },
    });
  }

  private async listCampaigns(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string | undefined> = {
      status: args.status !== undefined ? String(args.status) : undefined,
      type: args.type as string | undefined,
      limit: String((args.limit as number) ?? 20),
      offset: String((args.offset as number) ?? 0),
    };
    return this.get('/campaigns', params);
  }

  private async getCampaign(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.campaign_id) return { content: [{ type: 'text', text: 'campaign_id is required' }], isError: true };
    return this.get(`/campaigns/${encodeURIComponent(args.campaign_id as string)}`);
  }

  private async listDeals(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string | undefined> = {
      'filters[title]': args.title as string | undefined,
      'filters[stage]': args.stage as string | undefined,
      'filters[owner]': args.owner as string | undefined,
      'filters[status]': args.status !== undefined ? String(args.status) : undefined,
      limit: String((args.limit as number) ?? 20),
      offset: String((args.offset as number) ?? 0),
    };
    return this.get('/deals', params);
  }

  private async getDeal(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.deal_id) return { content: [{ type: 'text', text: 'deal_id is required' }], isError: true };
    return this.get(`/deals/${encodeURIComponent(args.deal_id as string)}`);
  }

  private async createDeal(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.title || !args.contact || args.value === undefined || !args.currency) {
      return { content: [{ type: 'text', text: 'title, contact, value, and currency are required' }], isError: true };
    }
    const deal: Record<string, unknown> = {
      title: args.title,
      contact: String(args.contact),
      value: String(args.value),
      currency: args.currency,
    };
    if (args.stage) deal.stage = String(args.stage);
    if (args.owner) deal.owner = String(args.owner);
    if (args.percent !== undefined) deal.percent = String(args.percent);
    if (args.description) deal.description = args.description;
    return this.post('/deals', { deal });
  }

  private async updateDeal(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.deal_id) return { content: [{ type: 'text', text: 'deal_id is required' }], isError: true };
    const deal: Record<string, unknown> = {};
    if (args.title) deal.title = args.title;
    if (args.value !== undefined) deal.value = String(args.value);
    if (args.stage) deal.stage = String(args.stage);
    if (args.status !== undefined) deal.status = String(args.status);
    if (args.percent !== undefined) deal.percent = String(args.percent);
    return this.put(`/deals/${encodeURIComponent(args.deal_id as string)}`, { deal });
  }

  private async listCustomFields(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string | undefined> = {
      limit: String((args.limit as number) ?? 20),
      offset: String((args.offset as number) ?? 0),
    };
    return this.get('/fields', params);
  }
}

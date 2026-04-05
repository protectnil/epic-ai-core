/**
 * HubSpot MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://mcp.hubspot.com (remote, streamable-HTTP, OAuth2/PKCE auth) — in public beta as of 2026-03
//   Also: npm @hubspot/mcp-server (local stdio, Private App token auth) — 21 tools
// Our adapter covers: 18 tools (CRM contacts, companies, deals, tickets, owners, pipelines, search).
// Vendor MCP covers: 21 tools (read-only CRM objects + associations + engagements + workflows + UI links).
// Recommendation: use-both — MCP adds engagements (create task/note), workflow read, and UI link generation
//   not covered by our REST adapter. Our REST adapter adds create/update/delete write operations not yet in MCP.
//
// Base URL: https://api.hubapi.com
// Auth: Bearer token (Private App access token — passed as Authorization: Bearer {token})
// Docs: https://developers.hubspot.com/docs/api/crm/contacts
// Rate limits: 100 req/10 sec (Free/Starter private app); 190 req/10 sec (Pro/Enterprise private app)

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface HubSpotConfig {
  privateAppToken: string;
  baseUrl?: string;
}

export class HubSpotMCPServer extends MCPAdapterBase {
  private readonly privateAppToken: string;
  private readonly baseUrl: string;

  constructor(config: HubSpotConfig) {
    super();
    this.privateAppToken = config.privateAppToken;
    this.baseUrl = config.baseUrl ?? 'https://api.hubapi.com';
  }

  static catalog() {
    return {
      name: 'hubspot',
      displayName: 'HubSpot',
      version: '1.0.0',
      category: 'crm' as const,
      keywords: ['hubspot', 'crm', 'contact', 'deal', 'company', 'ticket', 'pipeline', 'sales', 'marketing', 'owner'],
      toolNames: [
        'list_contacts', 'get_contact', 'create_contact', 'update_contact', 'search_contacts',
        'list_companies', 'get_company', 'create_company', 'update_company',
        'list_deals', 'get_deal', 'create_deal', 'update_deal',
        'list_tickets', 'get_ticket',
        'list_owners',
        'list_pipelines',
        'search_crm',
      ],
      description: 'HubSpot CRM: manage contacts, companies, deals, tickets, pipelines, and owners. Full CRUD and search across CRM objects.',
      author: 'protectnil' as const,
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_contacts',
        description: 'List CRM contacts with optional property selection and cursor-based pagination',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Number of contacts to return (max 100, default: 10)' },
            after: { type: 'string', description: 'Pagination cursor token from a previous response' },
            properties: { type: 'string', description: 'Comma-separated contact property names to include (e.g. email,firstname,lastname)' },
          },
        },
      },
      {
        name: 'get_contact',
        description: 'Retrieve a single HubSpot contact by contact ID with optional property selection',
        inputSchema: {
          type: 'object',
          properties: {
            contact_id: { type: 'string', description: 'HubSpot contact ID (numeric string)' },
            properties: { type: 'string', description: 'Comma-separated contact property names to include' },
          },
          required: ['contact_id'],
        },
      },
      {
        name: 'create_contact',
        description: 'Create a new HubSpot contact with the specified CRM properties',
        inputSchema: {
          type: 'object',
          properties: {
            properties: {
              type: 'object',
              description: 'Contact property names and values (e.g. email, firstname, lastname, phone, company)',
              additionalProperties: { type: 'string' },
            },
          },
          required: ['properties'],
        },
      },
      {
        name: 'update_contact',
        description: 'Update an existing HubSpot contact by contact ID with new property values',
        inputSchema: {
          type: 'object',
          properties: {
            contact_id: { type: 'string', description: 'HubSpot contact ID to update' },
            properties: {
              type: 'object',
              description: 'Property names and new values to set on the contact',
              additionalProperties: { type: 'string' },
            },
          },
          required: ['contact_id', 'properties'],
        },
      },
      {
        name: 'search_contacts',
        description: 'Search HubSpot contacts by email, name, phone, or any property using full-text or filter queries',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Full-text search query string to match against contact properties' },
            limit: { type: 'number', description: 'Maximum number of results to return (default: 10, max: 100)' },
            after: { type: 'string', description: 'Pagination cursor from a previous response' },
          },
        },
      },
      {
        name: 'list_companies',
        description: 'List CRM companies with optional property selection and cursor-based pagination',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Number of companies to return (max 100, default: 10)' },
            after: { type: 'string', description: 'Pagination cursor token from a previous response' },
            properties: { type: 'string', description: 'Comma-separated company property names to include (e.g. name,domain,industry)' },
          },
        },
      },
      {
        name: 'get_company',
        description: 'Retrieve a single HubSpot company by company ID with optional property selection',
        inputSchema: {
          type: 'object',
          properties: {
            company_id: { type: 'string', description: 'HubSpot company ID (numeric string)' },
            properties: { type: 'string', description: 'Comma-separated company property names to include' },
          },
          required: ['company_id'],
        },
      },
      {
        name: 'create_company',
        description: 'Create a new HubSpot company with the specified CRM properties',
        inputSchema: {
          type: 'object',
          properties: {
            properties: {
              type: 'object',
              description: 'Company property names and values (e.g. name, domain, industry, city, country)',
              additionalProperties: { type: 'string' },
            },
          },
          required: ['properties'],
        },
      },
      {
        name: 'update_company',
        description: 'Update an existing HubSpot company by company ID with new property values',
        inputSchema: {
          type: 'object',
          properties: {
            company_id: { type: 'string', description: 'HubSpot company ID to update' },
            properties: {
              type: 'object',
              description: 'Property names and new values to set on the company',
              additionalProperties: { type: 'string' },
            },
          },
          required: ['company_id', 'properties'],
        },
      },
      {
        name: 'list_deals',
        description: 'List CRM deals with optional property selection and cursor-based pagination',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Number of deals to return (max 100, default: 10)' },
            after: { type: 'string', description: 'Pagination cursor token from a previous response' },
            properties: { type: 'string', description: 'Comma-separated deal property names to include (e.g. dealname,amount,closedate,dealstage)' },
          },
        },
      },
      {
        name: 'get_deal',
        description: 'Retrieve a single HubSpot deal by deal ID with optional property selection',
        inputSchema: {
          type: 'object',
          properties: {
            deal_id: { type: 'string', description: 'HubSpot deal ID (numeric string)' },
            properties: { type: 'string', description: 'Comma-separated deal property names to include' },
          },
          required: ['deal_id'],
        },
      },
      {
        name: 'create_deal',
        description: 'Create a new HubSpot deal with the specified CRM properties including pipeline and stage',
        inputSchema: {
          type: 'object',
          properties: {
            properties: {
              type: 'object',
              description: 'Deal property names and values (e.g. dealname, amount, closedate, pipeline, dealstage, hubspot_owner_id)',
              additionalProperties: { type: 'string' },
            },
          },
          required: ['properties'],
        },
      },
      {
        name: 'update_deal',
        description: 'Update an existing HubSpot deal by deal ID with new property values',
        inputSchema: {
          type: 'object',
          properties: {
            deal_id: { type: 'string', description: 'HubSpot deal ID to update' },
            properties: {
              type: 'object',
              description: 'Property names and new values to set on the deal (e.g. dealstage, amount, closedate)',
              additionalProperties: { type: 'string' },
            },
          },
          required: ['deal_id', 'properties'],
        },
      },
      {
        name: 'list_tickets',
        description: 'List CRM support tickets with optional property selection and cursor-based pagination',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Number of tickets to return (max 100, default: 10)' },
            after: { type: 'string', description: 'Pagination cursor token from a previous response' },
            properties: { type: 'string', description: 'Comma-separated ticket property names to include (e.g. subject,hs_pipeline_stage,hs_ticket_priority)' },
          },
        },
      },
      {
        name: 'get_ticket',
        description: 'Retrieve a single HubSpot support ticket by ticket ID with optional property selection',
        inputSchema: {
          type: 'object',
          properties: {
            ticket_id: { type: 'string', description: 'HubSpot ticket ID (numeric string)' },
            properties: { type: 'string', description: 'Comma-separated ticket property names to include' },
          },
          required: ['ticket_id'],
        },
      },
      {
        name: 'list_owners',
        description: 'List HubSpot CRM owners (users who can be assigned to contacts, deals, and companies)',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Number of owners to return (default: 100)' },
            after: { type: 'string', description: 'Pagination cursor from a previous response' },
            email: { type: 'string', description: 'Filter owners by email address (exact match)' },
          },
        },
      },
      {
        name: 'list_pipelines',
        description: 'List HubSpot CRM pipelines and their stages for a given object type (deals or tickets)',
        inputSchema: {
          type: 'object',
          properties: {
            object_type: { type: 'string', description: 'CRM object type to list pipelines for: deals or tickets (default: deals)' },
          },
        },
      },
      {
        name: 'search_crm',
        description: 'Search across HubSpot CRM object types using full-text query with optional filters and sorting',
        inputSchema: {
          type: 'object',
          properties: {
            object_type: { type: 'string', description: 'CRM object type to search: contacts, deals, companies, tickets' },
            query: { type: 'string', description: 'Full-text search query string to match against object properties' },
            limit: { type: 'number', description: 'Maximum number of results to return (default: 10, max: 100)' },
            after: { type: 'string', description: 'Pagination cursor token from a previous response' },
          },
          required: ['object_type', 'query'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_contacts':
          return await this.listContacts(args);
        case 'get_contact':
          return await this.getContact(args);
        case 'create_contact':
          return await this.createContact(args);
        case 'update_contact':
          return await this.updateContact(args);
        case 'search_contacts':
          return await this.searchContacts(args);
        case 'list_companies':
          return await this.listCompanies(args);
        case 'get_company':
          return await this.getCompany(args);
        case 'create_company':
          return await this.createCompany(args);
        case 'update_company':
          return await this.updateCompany(args);
        case 'list_deals':
          return await this.listDeals(args);
        case 'get_deal':
          return await this.getDeal(args);
        case 'create_deal':
          return await this.createDeal(args);
        case 'update_deal':
          return await this.updateDeal(args);
        case 'list_tickets':
          return await this.listTickets(args);
        case 'get_ticket':
          return await this.getTicket(args);
        case 'list_owners':
          return await this.listOwners(args);
        case 'list_pipelines':
          return await this.listPipelines(args);
        case 'search_crm':
          return await this.searchCrm(args);
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

  // ── Private helpers ──────────────────────────────────────────────────────────

  private get authHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.privateAppToken}`,
      'Content-Type': 'application/json',
    };
  }

  private async fetchCrmList(objectType: string, args: Record<string, unknown>): Promise<ToolResult> {
    const limit = (args.limit as number) ?? 10;
    const params = new URLSearchParams({ limit: String(limit) });
    if (args.after) params.set('after', args.after as string);
    if (args.properties) params.set('properties', args.properties as string);
    const response = await this.fetchWithRetry(`${this.baseUrl}/crm/v3/objects/${objectType}?${params}`, { headers: this.authHeaders });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error ${response.status}: ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async fetchCrmObject(objectType: string, id: string, properties?: string): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (properties) params.set('properties', properties);
    const qs = params.toString();
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/crm/v3/objects/${objectType}/${encodeURIComponent(id)}${qs ? `?${qs}` : ''}`,
      { headers: this.authHeaders },
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error ${response.status}: ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async createCrmObject(objectType: string, properties: Record<string, string>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}/crm/v3/objects/${objectType}`, {
      method: 'POST',
      headers: this.authHeaders,
      body: JSON.stringify({ properties }),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error ${response.status}: ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async patchCrmObject(objectType: string, id: string, properties: Record<string, string>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}/crm/v3/objects/${objectType}/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: this.authHeaders,
      body: JSON.stringify({ properties }),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error ${response.status}: ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listContacts(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fetchCrmList('contacts', args);
  }

  private async getContact(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.contact_id as string;
    if (!id) return { content: [{ type: 'text', text: 'contact_id is required' }], isError: true };
    return this.fetchCrmObject('contacts', id, args.properties as string | undefined);
  }

  private async createContact(args: Record<string, unknown>): Promise<ToolResult> {
    const props = args.properties as Record<string, string> | undefined;
    if (!props) return { content: [{ type: 'text', text: 'properties is required' }], isError: true };
    return this.createCrmObject('contacts', props);
  }

  private async updateContact(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.contact_id as string;
    const props = args.properties as Record<string, string> | undefined;
    if (!id || !props) return { content: [{ type: 'text', text: 'contact_id and properties are required' }], isError: true };
    return this.patchCrmObject('contacts', id, props);
  }

  private async searchContacts(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {
      query: (args.query as string) ?? '',
      limit: (args.limit as number) ?? 10,
    };
    if (args.after) body.after = args.after;
    const response = await this.fetchWithRetry(`${this.baseUrl}/crm/v3/objects/contacts/search`, {
      method: 'POST',
      headers: this.authHeaders,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error ${response.status}: ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listCompanies(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fetchCrmList('companies', args);
  }

  private async getCompany(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.company_id as string;
    if (!id) return { content: [{ type: 'text', text: 'company_id is required' }], isError: true };
    return this.fetchCrmObject('companies', id, args.properties as string | undefined);
  }

  private async createCompany(args: Record<string, unknown>): Promise<ToolResult> {
    const props = args.properties as Record<string, string> | undefined;
    if (!props) return { content: [{ type: 'text', text: 'properties is required' }], isError: true };
    return this.createCrmObject('companies', props);
  }

  private async updateCompany(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.company_id as string;
    const props = args.properties as Record<string, string> | undefined;
    if (!id || !props) return { content: [{ type: 'text', text: 'company_id and properties are required' }], isError: true };
    return this.patchCrmObject('companies', id, props);
  }

  private async listDeals(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fetchCrmList('deals', args);
  }

  private async getDeal(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.deal_id as string;
    if (!id) return { content: [{ type: 'text', text: 'deal_id is required' }], isError: true };
    return this.fetchCrmObject('deals', id, args.properties as string | undefined);
  }

  private async createDeal(args: Record<string, unknown>): Promise<ToolResult> {
    const props = args.properties as Record<string, string> | undefined;
    if (!props) return { content: [{ type: 'text', text: 'properties is required' }], isError: true };
    return this.createCrmObject('deals', props);
  }

  private async updateDeal(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.deal_id as string;
    const props = args.properties as Record<string, string> | undefined;
    if (!id || !props) return { content: [{ type: 'text', text: 'deal_id and properties are required' }], isError: true };
    return this.patchCrmObject('deals', id, props);
  }

  private async listTickets(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fetchCrmList('tickets', args);
  }

  private async getTicket(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.ticket_id as string;
    if (!id) return { content: [{ type: 'text', text: 'ticket_id is required' }], isError: true };
    return this.fetchCrmObject('tickets', id, args.properties as string | undefined);
  }

  private async listOwners(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams({ limit: String((args.limit as number) ?? 100) });
    if (args.after) params.set('after', args.after as string);
    if (args.email) params.set('email', args.email as string);
    const response = await this.fetchWithRetry(`${this.baseUrl}/crm/v3/owners?${params}`, { headers: this.authHeaders });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error ${response.status}: ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listPipelines(args: Record<string, unknown>): Promise<ToolResult> {
    const objectType = (args.object_type as string) ?? 'deals';
    const response = await this.fetchWithRetry(`${this.baseUrl}/crm/v3/pipelines/${encodeURIComponent(objectType)}`, { headers: this.authHeaders });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error ${response.status}: ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async searchCrm(args: Record<string, unknown>): Promise<ToolResult> {
    const objectType = args.object_type as string;
    const query = args.query as string;
    if (!objectType || !query) {
      return { content: [{ type: 'text', text: 'object_type and query are required' }], isError: true };
    }
    const body: Record<string, unknown> = { query, limit: (args.limit as number) ?? 10 };
    if (args.after) body.after = args.after;
    const response = await this.fetchWithRetry(`${this.baseUrl}/crm/v3/objects/${encodeURIComponent(objectType)}/search`, {
      method: 'POST',
      headers: this.authHeaders,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error ${response.status}: ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }
}

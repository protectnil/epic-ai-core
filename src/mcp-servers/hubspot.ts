/** HubSpot MCP Server
 * Provides access to HubSpot CRM contacts, deals, and search via the HubSpot API
 *
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

import { ToolDefinition, ToolResult } from './types.js';

interface HubSpotConfig {
  privateAppToken: string;
  baseUrl?: string;
}

export class HubSpotMCPServer {
  private readonly privateAppToken: string;
  private readonly baseUrl: string;

  constructor(config: HubSpotConfig) {
    this.privateAppToken = config.privateAppToken;
    this.baseUrl = config.baseUrl || 'https://api.hubapi.com';
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_contacts',
        description: 'List CRM contacts with optional property selection and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Number of contacts to return (max 100, default: 10)',
            },
            after: {
              type: 'string',
              description: 'Pagination cursor token from a previous response',
            },
            properties: {
              type: 'string',
              description: 'Comma-separated list of contact properties to include',
            },
          },
        },
      },
      {
        name: 'get_contact',
        description: 'Retrieve a single HubSpot contact by contact ID',
        inputSchema: {
          type: 'object',
          properties: {
            contact_id: {
              type: 'string',
              description: 'The HubSpot contact ID',
            },
            properties: {
              type: 'string',
              description: 'Comma-separated list of contact properties to include',
            },
          },
          required: ['contact_id'],
        },
      },
      {
        name: 'create_contact',
        description: 'Create a new HubSpot contact with the specified properties',
        inputSchema: {
          type: 'object',
          properties: {
            properties: {
              type: 'object',
              description: 'Contact property names and values (e.g. email, firstname, lastname, phone)',
              additionalProperties: { type: 'string' },
            },
          },
          required: ['properties'],
        },
      },
      {
        name: 'list_deals',
        description: 'List CRM deals with optional property selection and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Number of deals to return (max 100, default: 10)',
            },
            after: {
              type: 'string',
              description: 'Pagination cursor token from a previous response',
            },
            properties: {
              type: 'string',
              description: 'Comma-separated list of deal properties to include',
            },
          },
        },
      },
      {
        name: 'search_crm',
        description: 'Search across HubSpot CRM objects using filters and sorting',
        inputSchema: {
          type: 'object',
          properties: {
            object_type: {
              type: 'string',
              description: 'CRM object type to search: contacts, deals, companies, tickets',
            },
            query: {
              type: 'string',
              description: 'Full-text search query string',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results to return (default: 10)',
            },
            after: {
              type: 'string',
              description: 'Pagination cursor token from a previous response',
            },
          },
          required: ['object_type', 'query'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      const headers: Record<string, string> = {
        Authorization: `Bearer ${this.privateAppToken}`,
        'Content-Type': 'application/json',
      };

      switch (name) {
        case 'list_contacts': {
          const limit = (args.limit as number) || 10;
          const params = new URLSearchParams({ limit: String(limit) });
          if (args.after) params.set('after', args.after as string);
          if (args.properties) params.set('properties', args.properties as string);
          const response = await fetch(`${this.baseUrl}/crm/v3/objects/contacts?${params.toString()}`, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list contacts: ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`HubSpot returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_contact': {
          const contactId = args.contact_id as string;
          if (!contactId) {
            return { content: [{ type: 'text', text: 'contact_id is required' }], isError: true };
          }
          const params = new URLSearchParams();
          if (args.properties) params.set('properties', args.properties as string);
          const qs = params.toString();
          const response = await fetch(
            `${this.baseUrl}/crm/v3/objects/contacts/${encodeURIComponent(contactId)}${qs ? `?${qs}` : ''}`,
            { method: 'GET', headers }
          );
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to get contact: ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`HubSpot returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'create_contact': {
          const properties = args.properties as Record<string, string>;
          if (!properties) {
            return { content: [{ type: 'text', text: 'properties is required' }], isError: true };
          }
          const response = await fetch(
            `${this.baseUrl}/crm/v3/objects/contacts`,
            { method: 'POST', headers, body: JSON.stringify({ properties }) }
          );
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to create contact: ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`HubSpot returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_deals': {
          const limit = (args.limit as number) || 10;
          const params = new URLSearchParams({ limit: String(limit) });
          if (args.after) params.set('after', args.after as string);
          if (args.properties) params.set('properties', args.properties as string);
          const response = await fetch(`${this.baseUrl}/crm/v3/objects/deals?${params.toString()}`, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list deals: ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`HubSpot returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'search_crm': {
          const objectType = args.object_type as string;
          const query = args.query as string;
          if (!objectType || !query) {
            return { content: [{ type: 'text', text: 'object_type and query are required' }], isError: true };
          }
          const body: Record<string, unknown> = {
            query,
            limit: (args.limit as number) || 10,
          };
          if (args.after) body.after = args.after;
          const response = await fetch(
            `${this.baseUrl}/crm/v3/objects/${encodeURIComponent(objectType)}/search`,
            { method: 'POST', headers, body: JSON.stringify(body) }
          );
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to search CRM: ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`HubSpot returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

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
}

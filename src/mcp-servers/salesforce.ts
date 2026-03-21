/** Salesforce MCP Server
 * Provides access to Salesforce CRM data via the Salesforce REST API v59.0
 *
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

import { ToolDefinition, ToolResult } from './types.js';

interface SalesforceConfig {
  accessToken: string;
  instance: string;
  baseUrl?: string;
}

export class SalesforceMCPServer {
  private readonly accessToken: string;
  private readonly baseUrl: string;

  constructor(config: SalesforceConfig) {
    this.accessToken = config.accessToken;
    this.baseUrl = config.baseUrl || `https://${config.instance}.salesforce.com/services/data/v59.0`;
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'query_soql',
        description: 'Execute a SOQL query against Salesforce and return matching records',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'A valid SOQL query string (e.g. SELECT Id, Name FROM Account LIMIT 10)',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'get_record',
        description: 'Retrieve a single Salesforce record by sObject type and record ID',
        inputSchema: {
          type: 'object',
          properties: {
            sobject: {
              type: 'string',
              description: 'The Salesforce sObject type (e.g. Account, Contact, Opportunity)',
            },
            record_id: {
              type: 'string',
              description: 'The 15 or 18-character Salesforce record ID',
            },
            fields: {
              type: 'string',
              description: 'Comma-separated list of fields to return (default: all fields)',
            },
          },
          required: ['sobject', 'record_id'],
        },
      },
      {
        name: 'create_record',
        description: 'Create a new Salesforce record for the specified sObject type',
        inputSchema: {
          type: 'object',
          properties: {
            sobject: {
              type: 'string',
              description: 'The Salesforce sObject type (e.g. Account, Contact, Lead)',
            },
            fields: {
              type: 'object',
              description: 'Field names and values for the new record',
              additionalProperties: true,
            },
          },
          required: ['sobject', 'fields'],
        },
      },
      {
        name: 'update_record',
        description: 'Update an existing Salesforce record by sObject type and record ID',
        inputSchema: {
          type: 'object',
          properties: {
            sobject: {
              type: 'string',
              description: 'The Salesforce sObject type',
            },
            record_id: {
              type: 'string',
              description: 'The Salesforce record ID to update',
            },
            fields: {
              type: 'object',
              description: 'Field names and updated values',
              additionalProperties: true,
            },
          },
          required: ['sobject', 'record_id', 'fields'],
        },
      },
      {
        name: 'describe_sobject',
        description: 'Retrieve metadata and field definitions for a Salesforce sObject type',
        inputSchema: {
          type: 'object',
          properties: {
            sobject: {
              type: 'string',
              description: 'The Salesforce sObject type to describe (e.g. Account, Opportunity)',
            },
          },
          required: ['sobject'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      const headers: Record<string, string> = {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      };

      switch (name) {
        case 'query_soql': {
          const query = args.query as string;
          if (!query) {
            return { content: [{ type: 'text', text: 'query is required' }], isError: true };
          }
          const url = `${this.baseUrl}/query?q=${encodeURIComponent(query)}`;
          const response = await fetch(url, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `SOQL query failed: ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Salesforce returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_record': {
          const sobject = args.sobject as string;
          const recordId = args.record_id as string;
          if (!sobject || !recordId) {
            return { content: [{ type: 'text', text: 'sobject and record_id are required' }], isError: true };
          }
          let url = `${this.baseUrl}/sobjects/${encodeURIComponent(sobject)}/${encodeURIComponent(recordId)}`;
          if (args.fields) url += `?fields=${encodeURIComponent(args.fields as string)}`;
          const response = await fetch(url, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to get record: ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Salesforce returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'create_record': {
          const sobject = args.sobject as string;
          const fields = args.fields as Record<string, unknown>;
          if (!sobject || !fields) {
            return { content: [{ type: 'text', text: 'sobject and fields are required' }], isError: true };
          }
          const response = await fetch(
            `${this.baseUrl}/sobjects/${encodeURIComponent(sobject)}`,
            { method: 'POST', headers, body: JSON.stringify(fields) }
          );
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to create record: ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Salesforce returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'update_record': {
          const sobject = args.sobject as string;
          const recordId = args.record_id as string;
          const fields = args.fields as Record<string, unknown>;
          if (!sobject || !recordId || !fields) {
            return { content: [{ type: 'text', text: 'sobject, record_id, and fields are required' }], isError: true };
          }
          const response = await fetch(
            `${this.baseUrl}/sobjects/${encodeURIComponent(sobject)}/${encodeURIComponent(recordId)}`,
            { method: 'PATCH', headers, body: JSON.stringify(fields) }
          );
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to update record: ${response.statusText}` }], isError: true };
          }
          return { content: [{ type: 'text', text: JSON.stringify({ success: true, record_id: recordId }, null, 2) }], isError: false };
        }

        case 'describe_sobject': {
          const sobject = args.sobject as string;
          if (!sobject) {
            return { content: [{ type: 'text', text: 'sobject is required' }], isError: true };
          }
          const response = await fetch(
            `${this.baseUrl}/sobjects/${encodeURIComponent(sobject)}/describe`,
            { method: 'GET', headers }
          );
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to describe sObject: ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Salesforce returned non-JSON response (HTTP ${response.status})`); }
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

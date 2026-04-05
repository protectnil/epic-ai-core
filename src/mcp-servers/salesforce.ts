/**
 * Salesforce MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/salesforcecli/mcp — transport: stdio, auth: Salesforce CLI auth
// Official Salesforce DX MCP Server (@salesforce/mcp), Beta as of May 2025. Exposes only 7 tools
// (sf-list-all-orgs, sf-get-username, sf-retrieve-metadata, sf-deploy-metadata,
//  sf-assign-permission-set, sf-query-org, sf-test-apex). Fails criterion: <10 tools.
// Our adapter covers: 18 tools (runtime data operations). Vendor MCP covers DX/deploy tooling only.
// Recommendation: use-rest-api — vendor MCP has only 7 tools (< 10 required) and covers DX/deploy
// workflows only, not runtime data CRUD. Our REST adapter is the correct integration for data access.
//
// Base URL: https://{instance}.salesforce.com/services/data/v66.0
// Auth: OAuth2 Bearer token — use Connected App + OAuth2 flow to obtain access_token
// Docs: https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/
// Rate limits: 15,000 API requests per 24 hours per org (default); configurable per edition

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface SalesforceConfig {
  accessToken: string;
  /** Salesforce instance hostname (e.g. myorg.my.salesforce.com) */
  instance: string;
  /** Override the full base URL including API version */
  baseUrl?: string;
}

export class SalesforceMCPServer extends MCPAdapterBase {
  private readonly accessToken: string;
  private readonly baseUrl: string;

  constructor(config: SalesforceConfig) {
    super();
    this.accessToken = config.accessToken;
    this.baseUrl = config.baseUrl || `https://${config.instance}/services/data/v66.0`;
  }

  static catalog() {
    return {
      name: 'salesforce',
      displayName: 'Salesforce',
      version: '1.0.0',
      category: 'crm' as const,
      keywords: ['salesforce', 'crm', 'soql', 'sobject', 'opportunity', 'account', 'contact', 'lead', 'case', 'campaign', 'apex', 'salescloud'],
      toolNames: [
        'query_soql', 'query_soql_next_page',
        'get_record', 'create_record', 'update_record', 'delete_record',
        'upsert_record',
        'describe_sobject', 'list_sobjects',
        'search_sosl',
        'get_limits',
        'list_recent',
        'composite_batch',
        'get_user_info',
        'list_metadata_types',
        'execute_anonymous_apex',
        'list_process_rules',
        'get_org_metadata',
      ],
      description: 'Salesforce CRM: SOQL queries, sObject CRUD, SOSL search, org limits, composite batch, Apex execution, and metadata access via REST API v66.',
      author: 'protectnil' as const,
    };
  }

  get tools(): ToolDefinition[] {
    return [
      // ── SOQL ─────────────────────────────────────────────────────────────────
      {
        name: 'query_soql',
        description: 'Execute a SOQL query against Salesforce and return matching records; supports pagination via nextRecordsUrl',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'A valid SOQL query string (e.g. SELECT Id, Name, Amount FROM Opportunity WHERE StageName = \'Closed Won\' LIMIT 50)',
            },
            all_rows: {
              type: 'boolean',
              description: 'If true, include deleted and archived records (uses queryAll endpoint). Default: false.',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'query_soql_next_page',
        description: 'Fetch the next page of a paginated Salesforce SOQL query result using the nextRecordsUrl from a previous query response',
        inputSchema: {
          type: 'object',
          properties: {
            next_records_url: {
              type: 'string',
              description: 'The nextRecordsUrl value from a previous query_soql response (e.g. /services/data/v66.0/query/01g...)',
            },
          },
          required: ['next_records_url'],
        },
      },
      // ── sObject CRUD ─────────────────────────────────────────────────────────
      {
        name: 'get_record',
        description: 'Retrieve a single Salesforce record by sObject type and record ID, with optional field selection',
        inputSchema: {
          type: 'object',
          properties: {
            sobject: {
              type: 'string',
              description: 'Salesforce sObject type (e.g. Account, Contact, Opportunity, Lead, Case)',
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
        description: 'Create a new Salesforce record for the specified sObject type with the provided field values',
        inputSchema: {
          type: 'object',
          properties: {
            sobject: {
              type: 'string',
              description: 'Salesforce sObject type (e.g. Account, Contact, Lead, Case, Opportunity)',
            },
            fields: {
              type: 'object',
              description: 'Field names and values for the new record (e.g. {"Name": "Acme Corp", "Industry": "Technology"})',
              additionalProperties: true,
            },
          },
          required: ['sobject', 'fields'],
        },
      },
      {
        name: 'update_record',
        description: 'Update an existing Salesforce record by sObject type and record ID with the provided field values',
        inputSchema: {
          type: 'object',
          properties: {
            sobject: {
              type: 'string',
              description: 'Salesforce sObject type',
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
        name: 'upsert_record',
        description: 'Upsert (create or update) a Salesforce record using an external ID field — creates if not found, updates if found',
        inputSchema: {
          type: 'object',
          properties: {
            sobject: {
              type: 'string',
              description: 'Salesforce sObject type',
            },
            external_id_field: {
              type: 'string',
              description: 'Name of the external ID field used to match the record (e.g. External_Id__c)',
            },
            external_id_value: {
              type: 'string',
              description: 'Value of the external ID to match against',
            },
            fields: {
              type: 'object',
              description: 'Field names and values to set on the record',
              additionalProperties: true,
            },
          },
          required: ['sobject', 'external_id_field', 'external_id_value', 'fields'],
        },
      },
      {
        name: 'delete_record',
        description: 'Delete a Salesforce record by sObject type and record ID',
        inputSchema: {
          type: 'object',
          properties: {
            sobject: {
              type: 'string',
              description: 'Salesforce sObject type (e.g. Account, Contact, Opportunity)',
            },
            record_id: {
              type: 'string',
              description: 'The 15 or 18-character Salesforce record ID to delete',
            },
          },
          required: ['sobject', 'record_id'],
        },
      },
      // ── Metadata ─────────────────────────────────────────────────────────────
      {
        name: 'describe_sobject',
        description: 'Retrieve full field schema and metadata for a Salesforce sObject type including field types, picklist values, and relationships',
        inputSchema: {
          type: 'object',
          properties: {
            sobject: {
              type: 'string',
              description: 'Salesforce sObject type to describe (e.g. Account, Opportunity, Contact)',
            },
          },
          required: ['sobject'],
        },
      },
      {
        name: 'list_sobjects',
        description: 'List all sObject types available in the Salesforce org including custom objects',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'list_metadata_types',
        description: 'List all metadata types available in the Salesforce org (Apex classes, triggers, flows, etc.)',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_org_metadata',
        description: 'Retrieve basic Salesforce org metadata: organization name, ID, edition, and instance details',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      // ── Search ───────────────────────────────────────────────────────────────
      {
        name: 'search_sosl',
        description: 'Execute a SOSL (Salesforce Object Search Language) full-text search across multiple sObject types',
        inputSchema: {
          type: 'object',
          properties: {
            search: {
              type: 'string',
              description: 'A valid SOSL search string (e.g. FIND {Acme} IN ALL FIELDS RETURNING Account(Id, Name), Contact(Id, Name))',
            },
          },
          required: ['search'],
        },
      },
      // ── Org info ─────────────────────────────────────────────────────────────
      {
        name: 'get_limits',
        description: 'Retrieve current API and org limits including daily API call usage, concurrent query limits, and storage limits',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'list_recent',
        description: 'List the most recently accessed records across all sObject types for the current user',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of recent records to return (default: 25, max: 200)',
            },
          },
        },
      },
      {
        name: 'get_user_info',
        description: 'Retrieve information about the currently authenticated Salesforce user including user ID, name, email, and org ID',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      // ── Batch / Apex ─────────────────────────────────────────────────────────
      {
        name: 'composite_batch',
        description: 'Execute up to 25 Salesforce REST API subrequests in a single HTTP call via the Composite Batch endpoint',
        inputSchema: {
          type: 'object',
          properties: {
            batch_requests: {
              type: 'array',
              description: 'Array of subrequest objects, each with method (GET/POST/PATCH/DELETE), url, and optional richInput body',
              items: { type: 'object' },
            },
            halt_on_error: {
              type: 'boolean',
              description: 'If true, stop processing remaining subrequests after the first error. Default: false.',
            },
          },
          required: ['batch_requests'],
        },
      },
      {
        name: 'execute_anonymous_apex',
        description: 'Execute anonymous Apex code in the Salesforce org and return the result or compilation errors',
        inputSchema: {
          type: 'object',
          properties: {
            apex_code: {
              type: 'string',
              description: 'Anonymous Apex code to execute (e.g. System.debug(\'Hello\'); or a DML statement)',
            },
          },
          required: ['apex_code'],
        },
      },
      {
        name: 'list_process_rules',
        description: 'List all active Process Builder rules and workflow rules in the Salesforce org',
        inputSchema: {
          type: 'object',
          properties: {
            sobject: {
              type: 'string',
              description: 'Filter process rules by sObject type (optional)',
            },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'query_soql':              return this.querySoql(args);
        case 'query_soql_next_page':    return this.querySoqlNextPage(args);
        case 'get_record':              return this.getRecord(args);
        case 'create_record':           return this.createRecord(args);
        case 'update_record':           return this.updateRecord(args);
        case 'upsert_record':           return this.upsertRecord(args);
        case 'delete_record':           return this.deleteRecord(args);
        case 'describe_sobject':        return this.describeSobject(args);
        case 'list_sobjects':           return this.listSobjects();
        case 'list_metadata_types':     return this.listMetadataTypes();
        case 'get_org_metadata':        return this.getOrgMetadata();
        case 'search_sosl':             return this.searchSosl(args);
        case 'get_limits':              return this.getLimits();
        case 'list_recent':             return this.listRecent(args);
        case 'get_user_info':           return this.getUserInfo();
        case 'composite_batch':         return this.compositeBatch(args);
        case 'execute_anonymous_apex':  return this.executeAnonymousApex(args);
        case 'list_process_rules':      return this.listProcessRules(args);
        default:
          return {
            content: [{ type: 'text', text: `Unknown tool: ${name}` }],
            isError: true,
          };
      }
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Tool execution failed: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true,
      };
    }
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private get headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
    };
  }

  private async fetchJson(url: string, init?: RequestInit): Promise<ToolResult> {
    const response = await this.fetchWithRetry(url, { headers: this.headers, ...init });
    if (!response.ok) {
      let detail: unknown;
      try { detail = await response.json(); } catch { detail = await response.text(); }
      return {
        content: [{ type: 'text', text: `Salesforce API error ${response.status} ${response.statusText}: ${JSON.stringify(detail)}` }],
        isError: true,
      };
    }
    // 204 No Content (update/delete success)
    if (response.status === 204) {
      return { content: [{ type: 'text', text: JSON.stringify({ success: true }) }], isError: false };
    }
    const data = await response.json();
    return {
      content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }],
      isError: false,
    };
  }

  private async querySoql(args: Record<string, unknown>): Promise<ToolResult> {
    const query = args.query as string;
    if (!query) return { content: [{ type: 'text', text: 'query is required' }], isError: true };
    const endpoint = args.all_rows ? 'queryAll' : 'query';
    return this.fetchJson(`${this.baseUrl}/${endpoint}?q=${encodeURIComponent(query)}`);
  }

  private async querySoqlNextPage(args: Record<string, unknown>): Promise<ToolResult> {
    const nextUrl = args.next_records_url as string;
    if (!nextUrl) return { content: [{ type: 'text', text: 'next_records_url is required' }], isError: true };
    // nextRecordsUrl is a path like /services/data/v66.0/query/01g...
    // Extract the base (scheme + host) from baseUrl to reconstruct absolute URL
    const base = new URL(this.baseUrl);
    const absolute = `${base.protocol}//${base.host}${nextUrl}`;
    return this.fetchJson(absolute);
  }

  private async getRecord(args: Record<string, unknown>): Promise<ToolResult> {
    const sobject = args.sobject as string;
    const recordId = args.record_id as string;
    if (!sobject || !recordId) return { content: [{ type: 'text', text: 'sobject and record_id are required' }], isError: true };
    let url = `${this.baseUrl}/sobjects/${encodeURIComponent(sobject)}/${encodeURIComponent(recordId)}`;
    if (args.fields) url += `?fields=${encodeURIComponent(args.fields as string)}`;
    return this.fetchJson(url);
  }

  private async createRecord(args: Record<string, unknown>): Promise<ToolResult> {
    const sobject = args.sobject as string;
    const fields = args.fields as Record<string, unknown>;
    if (!sobject || !fields) return { content: [{ type: 'text', text: 'sobject and fields are required' }], isError: true };
    return this.fetchJson(`${this.baseUrl}/sobjects/${encodeURIComponent(sobject)}`, {
      method: 'POST',
      body: JSON.stringify(fields),
    });
  }

  private async updateRecord(args: Record<string, unknown>): Promise<ToolResult> {
    const sobject = args.sobject as string;
    const recordId = args.record_id as string;
    const fields = args.fields as Record<string, unknown>;
    if (!sobject || !recordId || !fields) return { content: [{ type: 'text', text: 'sobject, record_id, and fields are required' }], isError: true };
    return this.fetchJson(
      `${this.baseUrl}/sobjects/${encodeURIComponent(sobject)}/${encodeURIComponent(recordId)}`,
      { method: 'PATCH', body: JSON.stringify(fields) },
    );
  }

  private async upsertRecord(args: Record<string, unknown>): Promise<ToolResult> {
    const sobject = args.sobject as string;
    const extField = args.external_id_field as string;
    const extValue = args.external_id_value as string;
    const fields = args.fields as Record<string, unknown>;
    if (!sobject || !extField || !extValue || !fields) {
      return { content: [{ type: 'text', text: 'sobject, external_id_field, external_id_value, and fields are required' }], isError: true };
    }
    return this.fetchJson(
      `${this.baseUrl}/sobjects/${encodeURIComponent(sobject)}/${encodeURIComponent(extField)}/${encodeURIComponent(extValue)}`,
      { method: 'PATCH', body: JSON.stringify(fields) },
    );
  }

  private async deleteRecord(args: Record<string, unknown>): Promise<ToolResult> {
    const sobject = args.sobject as string;
    const recordId = args.record_id as string;
    if (!sobject || !recordId) return { content: [{ type: 'text', text: 'sobject and record_id are required' }], isError: true };
    return this.fetchJson(
      `${this.baseUrl}/sobjects/${encodeURIComponent(sobject)}/${encodeURIComponent(recordId)}`,
      { method: 'DELETE' },
    );
  }

  private async describeSobject(args: Record<string, unknown>): Promise<ToolResult> {
    const sobject = args.sobject as string;
    if (!sobject) return { content: [{ type: 'text', text: 'sobject is required' }], isError: true };
    return this.fetchJson(`${this.baseUrl}/sobjects/${encodeURIComponent(sobject)}/describe`);
  }

  private async listSobjects(): Promise<ToolResult> {
    return this.fetchJson(`${this.baseUrl}/sobjects`);
  }

  private async listMetadataTypes(): Promise<ToolResult> {
    return this.fetchJson(`${this.baseUrl}/metadata`);
  }

  private async getOrgMetadata(): Promise<ToolResult> {
    return this.fetchJson(`${this.baseUrl}/sobjects/Organization?fields=Id,Name,OrganizationType,InstanceName,IsSandbox`);
  }

  private async searchSosl(args: Record<string, unknown>): Promise<ToolResult> {
    const search = args.search as string;
    if (!search) return { content: [{ type: 'text', text: 'search is required' }], isError: true };
    return this.fetchJson(`${this.baseUrl}/search?q=${encodeURIComponent(search)}`);
  }

  private async getLimits(): Promise<ToolResult> {
    return this.fetchJson(`${this.baseUrl}/limits`);
  }

  private async listRecent(args: Record<string, unknown>): Promise<ToolResult> {
    const limit = (args.limit as number) ?? 25;
    return this.fetchJson(`${this.baseUrl}/recent?limit=${limit}`);
  }

  private async getUserInfo(): Promise<ToolResult> {
    // Derive identity URL from base URL
    const base = new URL(this.baseUrl);
    return this.fetchJson(`${base.protocol}//${base.host}/services/oauth2/userinfo`);
  }

  private async compositeBatch(args: Record<string, unknown>): Promise<ToolResult> {
    const batchRequests = args.batch_requests as unknown[];
    if (!batchRequests || batchRequests.length === 0) {
      return { content: [{ type: 'text', text: 'batch_requests is required and must be non-empty' }], isError: true };
    }
    if (batchRequests.length > 25) {
      return { content: [{ type: 'text', text: 'composite_batch supports at most 25 subrequests per call' }], isError: true };
    }
    const body = {
      batchRequests,
      haltOnError: (args.halt_on_error as boolean) ?? false,
    };
    return this.fetchJson(`${this.baseUrl}/composite/batch`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  private async executeAnonymousApex(args: Record<string, unknown>): Promise<ToolResult> {
    const apexCode = args.apex_code as string;
    if (!apexCode) return { content: [{ type: 'text', text: 'apex_code is required' }], isError: true };
    return this.fetchJson(
      `${this.baseUrl}/tooling/executeAnonymous?anonymousBody=${encodeURIComponent(apexCode)}`,
    );
  }

  private async listProcessRules(args: Record<string, unknown>): Promise<ToolResult> {
    const sobject = args.sobject as string;
    const query = sobject
      ? `SELECT Id, Name, SobjectType, IsActive FROM ProcessRule WHERE SobjectType = '${sobject.replace(/'/g, "\\'")}'`
      : `SELECT Id, Name, SobjectType, IsActive FROM ProcessRule WHERE IsActive = true LIMIT 100`;
    return this.fetchJson(`${this.baseUrl}/query?q=${encodeURIComponent(query)}`);
  }
}

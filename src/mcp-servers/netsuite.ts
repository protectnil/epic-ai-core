/**
 * Oracle NetSuite MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/article_3200541651.html
//   Oracle NetSuite AI Connector Service — hosted MCP endpoint (not an open-source repo).
//   Accessed via the MCP Standard Tools SuiteApp (installed from the SuiteApp Marketplace).
//   Transport: streamable-HTTP (hosted by Oracle NetSuite, account-specific URL). Auth: OAuth 2.0.
//   MCP Standard Tools SuiteApp exposes 10 tools (as of 2026-03):
//     ns_createRecord, ns_getRecord, ns_getRecordTypeMetadata, ns_updateRecord,
//     ns_getSubsidiaries, ns_listAllReports, ns_runReport,
//     ns_listSavedSearches, ns_runSavedSearch,
//     ns_runCustomSuiteQL, ns_getSuiteQLMetadata
//   NOTE: MCP does NOT expose delete_record, list_records, or upsert_record.
//   Our adapter covers those gaps plus run_suiteql_paginated (bulk pagination helper).
// Our adapter covers: 9 tools. Vendor MCP covers: 11 tools.
// Recommendation: use-both — MCP covers reports and saved searches (ns_getSubsidiaries,
//   ns_listAllReports, ns_runReport, ns_listSavedSearches, ns_runSavedSearch) that our REST adapter
//   does not implement. Our adapter covers delete_record, list_records, upsert_record, and
//   run_suiteql_paginated not available in MCP. Use union for full coverage.
// Integration: use-both
// MCP-sourced tools (5): ns_getSubsidiaries, ns_listAllReports, ns_runReport, ns_listSavedSearches, ns_runSavedSearch
// REST-sourced tools (9): run_suiteql, run_suiteql_paginated, get_record, list_records, create_record,
//   update_record, delete_record, upsert_record, get_metadata
// Combined coverage: 14 tools (MCP: 11 + REST: 9 - shared: 6)
//
// Base URL: https://{accountId}.suitetalk.api.netsuite.com
// Auth: OAuth 1.0a TBA — HMAC-SHA256 signature per RFC 5849 (consumerKey, consumerSecret, tokenId, tokenSecret)
// Note: OAuth 2.0 will be mandatory starting with NetSuite 2027.1 release; TBA remains valid until then.
// Record API:  /services/rest/record/v1/{recordType}/{id}
// SuiteQL API: POST /services/rest/query/v1/suiteql
// Metadata API: GET /services/rest/record/v1/metadata-catalog
// Docs: https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/book_1559132836.html
// Rate limits: Governed by NetSuite concurrency limits per account (typically 10–50 concurrent requests)

import { createHmac } from 'node:crypto';
import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface NetSuiteConfig {
  accountId: string;       // e.g. "1234567" or "1234567_SB1" for sandbox
  consumerKey: string;
  consumerSecret: string;
  tokenId: string;
  tokenSecret: string;
}

export class NetSuiteMCPServer extends MCPAdapterBase {
  private readonly accountId: string;
  private readonly consumerKey: string;
  private readonly consumerSecret: string;
  private readonly tokenId: string;
  private readonly tokenSecret: string;
  private readonly baseUrl: string;

  constructor(config: NetSuiteConfig) {
    super();
    this.accountId = config.accountId;
    this.consumerKey = config.consumerKey;
    this.consumerSecret = config.consumerSecret;
    this.tokenId = config.tokenId;
    this.tokenSecret = config.tokenSecret;
    // Account IDs with underscores use dashes in the subdomain (e.g. 1234567_SB1 → 1234567-sb1)
    const subdomain = this.accountId.toLowerCase().replace(/_/g, '-');
    this.baseUrl = `https://${subdomain}.suitetalk.api.netsuite.com`;
  }

  static catalog() {
    return {
      name: 'netsuite',
      displayName: 'Oracle NetSuite',
      version: '1.0.0',
      category: 'finance' as const,
      keywords: ['netsuite', 'oracle', 'erp', 'suiteql', 'suitetalk', 'record', 'customer', 'vendor', 'invoice', 'salesorder', 'finance', 'accounting'],
      toolNames: [
        'run_suiteql',
        'get_record',
        'list_records',
        'create_record',
        'update_record',
        'delete_record',
        'upsert_record',
        'get_metadata',
        'run_suiteql_paginated',
      ],
      description: 'Oracle NetSuite ERP: run SuiteQL queries, CRUD operations on records (customers, invoices, sales orders, vendors), metadata discovery.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'run_suiteql',
        description: 'Execute a SuiteQL query (SQL-92 style) against NetSuite data; returns up to 1000 rows with pagination support',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: "SuiteQL SELECT statement to execute (e.g. SELECT id, companyName FROM customer WHERE isInactive = 'F')",
            },
            limit: {
              type: 'number',
              description: 'Maximum rows to return (max 1000, default: 100)',
            },
            offset: {
              type: 'number',
              description: 'Row offset for pagination (default: 0)',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'run_suiteql_paginated',
        description: 'Execute a SuiteQL query and automatically fetch all pages, returning combined results up to 5000 rows',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'SuiteQL SELECT statement to execute (no LIMIT/OFFSET needed; adapter handles pagination)',
            },
            max_rows: {
              type: 'number',
              description: 'Maximum total rows to return across all pages (default: 1000, max: 5000)',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'get_record',
        description: 'Retrieve a single NetSuite record by type and internal ID, with optional field expansion',
        inputSchema: {
          type: 'object',
          properties: {
            record_type: {
              type: 'string',
              description: 'NetSuite record type in lowercase (e.g. customer, vendor, invoice, salesorder, employee, inventoryitem)',
            },
            record_id: {
              type: 'string',
              description: 'The NetSuite internal ID of the record',
            },
            expand_sub_resources: {
              type: 'boolean',
              description: 'Expand sublists and subrecords inline (default: false; can increase response size significantly)',
            },
          },
          required: ['record_type', 'record_id'],
        },
      },
      {
        name: 'list_records',
        description: 'List NetSuite records of a given type with pagination; use run_suiteql for filtered searches',
        inputSchema: {
          type: 'object',
          properties: {
            record_type: {
              type: 'string',
              description: 'NetSuite record type in lowercase (e.g. customer, vendor, invoice, salesorder, employee)',
            },
            limit: {
              type: 'number',
              description: 'Number of records to return (max 1000, default: 25)',
            },
            offset: {
              type: 'number',
              description: 'Record offset for pagination (default: 0)',
            },
          },
          required: ['record_type'],
        },
      },
      {
        name: 'create_record',
        description: 'Create a new NetSuite record of the specified type with provided field values',
        inputSchema: {
          type: 'object',
          properties: {
            record_type: {
              type: 'string',
              description: 'NetSuite record type in lowercase (e.g. customer, vendor, salesorder, invoice)',
            },
            fields: {
              type: 'object',
              description: 'Key-value pairs of field names and values for the new record (use metadata tool to discover valid field names)',
            },
          },
          required: ['record_type', 'fields'],
        },
      },
      {
        name: 'update_record',
        description: 'Partially update an existing NetSuite record using PATCH — only provided fields are changed',
        inputSchema: {
          type: 'object',
          properties: {
            record_type: {
              type: 'string',
              description: 'NetSuite record type in lowercase (e.g. customer, vendor, salesorder)',
            },
            record_id: {
              type: 'string',
              description: 'The NetSuite internal ID of the record to update',
            },
            fields: {
              type: 'object',
              description: 'Key-value pairs of field names and updated values',
            },
          },
          required: ['record_type', 'record_id', 'fields'],
        },
      },
      {
        name: 'delete_record',
        description: 'Delete a NetSuite record by type and internal ID',
        inputSchema: {
          type: 'object',
          properties: {
            record_type: {
              type: 'string',
              description: 'NetSuite record type in lowercase (e.g. customer, vendor, salesorder)',
            },
            record_id: {
              type: 'string',
              description: 'The NetSuite internal ID of the record to delete',
            },
          },
          required: ['record_type', 'record_id'],
        },
      },
      {
        name: 'upsert_record',
        description: 'Create or update a NetSuite record using an external ID (idempotent PUT — creates if not found, updates if found)',
        inputSchema: {
          type: 'object',
          properties: {
            record_type: {
              type: 'string',
              description: 'NetSuite record type in lowercase (e.g. customer, vendor, inventoryitem)',
            },
            external_id: {
              type: 'string',
              description: 'External ID value used to identify the record across systems',
            },
            fields: {
              type: 'object',
              description: 'Key-value pairs of field names and values to set on the record',
            },
          },
          required: ['record_type', 'external_id', 'fields'],
        },
      },
      {
        name: 'get_metadata',
        description: 'Retrieve the metadata schema for a NetSuite record type, including field names, types, and enum values',
        inputSchema: {
          type: 'object',
          properties: {
            record_type: {
              type: 'string',
              description: 'NetSuite record type in lowercase to retrieve schema for (e.g. customer, invoice, salesorder)',
            },
          },
          required: ['record_type'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'run_suiteql':
          return await this.runSuiteql(args);
        case 'run_suiteql_paginated':
          return await this.runSuiteqlPaginated(args);
        case 'get_record':
          return await this.getRecord(args);
        case 'list_records':
          return await this.listRecords(args);
        case 'create_record':
          return await this.createRecord(args);
        case 'update_record':
          return await this.updateRecord(args);
        case 'delete_record':
          return await this.deleteRecord(args);
        case 'upsert_record':
          return await this.upsertRecord(args);
        case 'get_metadata':
          return await this.getMetadata(args);
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

  /**
   * Build an OAuth 1.0a TBA Authorization header for NetSuite.
   * Signature method: HMAC-SHA256 per RFC 5849.
   * Signing key: pct(consumerSecret) & pct(tokenSecret).
   */
  private buildAuthHeader(method: string, url: string): string {
    const timestamp = String(Math.floor(Date.now() / 1000));
    const nonce = Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);

    const pct = (s: string): string =>
      encodeURIComponent(s).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);

    const oauthParams: Record<string, string> = {
      oauth_consumer_key: this.consumerKey,
      oauth_nonce: nonce,
      oauth_signature_method: 'HMAC-SHA256',
      oauth_timestamp: timestamp,
      oauth_token: this.tokenId,
      oauth_version: '1.0',
    };

    const sortedParams = Object.entries(oauthParams)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${pct(k)}=${pct(v)}`)
      .join('&');

    const baseString = `${method.toUpperCase()}&${pct(url)}&${pct(sortedParams)}`;
    const signingKey = `${pct(this.consumerSecret)}&${pct(this.tokenSecret)}`;

    const signature = createHmac('sha256', signingKey)
      .update(baseString)
      .digest('base64');

    const realm = this.accountId.toUpperCase();

    return [
      `OAuth realm="${realm}"`,
      `oauth_consumer_key="${this.consumerKey}"`,
      `oauth_token="${this.tokenId}"`,
      `oauth_signature_method="HMAC-SHA256"`,
      `oauth_timestamp="${timestamp}"`,
      `oauth_nonce="${nonce}"`,
      `oauth_version="1.0"`,
      `oauth_signature="${encodeURIComponent(signature)}"`,
    ].join(', ');
  }

  private async runSuiteql(args: Record<string, unknown>): Promise<ToolResult> {
    const query = args.query as string;
    const limit = (args.limit as number) ?? 100;
    const offset = (args.offset as number) ?? 0;
    const url = `${this.baseUrl}/services/rest/query/v1/suiteql?limit=${limit}&offset=${offset}`;

    const response = await this.fetchWithRetry(url, {
      method: 'POST',
      headers: {
        Authorization: this.buildAuthHeader('POST', url),
        'Content-Type': 'application/json',
        Prefer: 'transient',
      },
      body: JSON.stringify({ q: query }),
    });

    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `SuiteQL query failed: HTTP ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }

    let data: unknown;
    try { data = await response.json(); } catch {
      throw new Error(`NetSuite returned non-JSON response (HTTP ${response.status})`);
    }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async runSuiteqlPaginated(args: Record<string, unknown>): Promise<ToolResult> {
    const query = args.query as string;
    const maxRows = Math.min((args.max_rows as number) ?? 1000, 5000);
    const pageSize = 1000;
    const allItems: unknown[] = [];
    let offset = 0;

    while (allItems.length < maxRows) {
      const remaining = maxRows - allItems.length;
      const limit = Math.min(pageSize, remaining);
      const url = `${this.baseUrl}/services/rest/query/v1/suiteql?limit=${limit}&offset=${offset}`;

      const response = await this.fetchWithRetry(url, {
        method: 'POST',
        headers: {
          Authorization: this.buildAuthHeader('POST', url),
          'Content-Type': 'application/json',
          Prefer: 'transient',
        },
        body: JSON.stringify({ q: query }),
      });

      if (!response.ok) {
        return {
          content: [{ type: 'text', text: `SuiteQL paginated query failed at offset ${offset}: HTTP ${response.status} ${response.statusText}` }],
          isError: true,
        };
      }

      const page = await response.json() as { items?: unknown[]; hasMore?: boolean };
      const items = page.items ?? [];
      allItems.push(...items);

      if (!page.hasMore || items.length === 0) break;
      offset += items.length;
    }

    return { content: [{ type: 'text', text: this.truncate({ total: allItems.length, items: allItems }) }], isError: false };
  }

  private async getRecord(args: Record<string, unknown>): Promise<ToolResult> {
    const recordType = encodeURIComponent(args.record_type as string);
    const recordId = encodeURIComponent(args.record_id as string);
    const params = new URLSearchParams();
    if (args.expand_sub_resources) params.set('expandSubResources', 'true');
    const qs = params.toString();
    const url = `${this.baseUrl}/services/rest/record/v1/${recordType}/${recordId}${qs ? '?' + qs : ''}`;

    const response = await this.fetchWithRetry(url, {
      method: 'GET',
      headers: {
        Authorization: this.buildAuthHeader('GET', url),
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `Failed to get record: HTTP ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }

    let data: unknown;
    try { data = await response.json(); } catch {
      throw new Error(`NetSuite returned non-JSON response (HTTP ${response.status})`);
    }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listRecords(args: Record<string, unknown>): Promise<ToolResult> {
    const recordType = encodeURIComponent(args.record_type as string);
    const limit = (args.limit as number) ?? 25;
    const offset = (args.offset as number) ?? 0;
    const url = `${this.baseUrl}/services/rest/record/v1/${recordType}?limit=${limit}&offset=${offset}`;

    const response = await this.fetchWithRetry(url, {
      method: 'GET',
      headers: {
        Authorization: this.buildAuthHeader('GET', url),
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `Failed to list records: HTTP ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }

    let data: unknown;
    try { data = await response.json(); } catch {
      throw new Error(`NetSuite returned non-JSON response (HTTP ${response.status})`);
    }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async createRecord(args: Record<string, unknown>): Promise<ToolResult> {
    const recordType = encodeURIComponent(args.record_type as string);
    const url = `${this.baseUrl}/services/rest/record/v1/${recordType}`;

    const response = await this.fetchWithRetry(url, {
      method: 'POST',
      headers: {
        Authorization: this.buildAuthHeader('POST', url),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(args.fields),
    });

    if (!response.ok) {
      let errBody: unknown;
      try { errBody = await response.json(); } catch { errBody = response.statusText; }
      return {
        content: [{ type: 'text', text: `Failed to create record: HTTP ${response.status} — ${JSON.stringify(errBody)}` }],
        isError: true,
      };
    }

    const location = response.headers.get('Location') ?? '';
    return {
      content: [{ type: 'text', text: JSON.stringify({ success: true, location }, null, 2) }],
      isError: false,
    };
  }

  private async updateRecord(args: Record<string, unknown>): Promise<ToolResult> {
    const recordType = encodeURIComponent(args.record_type as string);
    const recordId = encodeURIComponent(args.record_id as string);
    const url = `${this.baseUrl}/services/rest/record/v1/${recordType}/${recordId}`;

    const response = await this.fetchWithRetry(url, {
      method: 'PATCH',
      headers: {
        Authorization: this.buildAuthHeader('PATCH', url),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(args.fields),
    });

    if (!response.ok) {
      let errBody: unknown;
      try { errBody = await response.json(); } catch { errBody = response.statusText; }
      return {
        content: [{ type: 'text', text: `Failed to update record: HTTP ${response.status} — ${JSON.stringify(errBody)}` }],
        isError: true,
      };
    }

    return {
      content: [{ type: 'text', text: JSON.stringify({ success: true, record_type: args.record_type, record_id: args.record_id }, null, 2) }],
      isError: false,
    };
  }

  private async deleteRecord(args: Record<string, unknown>): Promise<ToolResult> {
    const recordType = encodeURIComponent(args.record_type as string);
    const recordId = encodeURIComponent(args.record_id as string);
    const url = `${this.baseUrl}/services/rest/record/v1/${recordType}/${recordId}`;

    const response = await this.fetchWithRetry(url, {
      method: 'DELETE',
      headers: {
        Authorization: this.buildAuthHeader('DELETE', url),
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `Failed to delete record: HTTP ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }

    return {
      content: [{ type: 'text', text: JSON.stringify({ success: true, record_type: args.record_type, record_id: args.record_id }, null, 2) }],
      isError: false,
    };
  }

  private async upsertRecord(args: Record<string, unknown>): Promise<ToolResult> {
    const recordType = encodeURIComponent(args.record_type as string);
    const externalId = encodeURIComponent(args.external_id as string);
    const url = `${this.baseUrl}/services/rest/record/v1/${recordType}/eid:${externalId}`;

    const response = await this.fetchWithRetry(url, {
      method: 'PUT',
      headers: {
        Authorization: this.buildAuthHeader('PUT', url),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(args.fields),
    });

    if (!response.ok) {
      let errBody: unknown;
      try { errBody = await response.json(); } catch { errBody = response.statusText; }
      return {
        content: [{ type: 'text', text: `Failed to upsert record: HTTP ${response.status} — ${JSON.stringify(errBody)}` }],
        isError: true,
      };
    }

    const location = response.headers.get('Location') ?? '';
    return {
      content: [{ type: 'text', text: JSON.stringify({ success: true, external_id: args.external_id, location }, null, 2) }],
      isError: false,
    };
  }

  private async getMetadata(args: Record<string, unknown>): Promise<ToolResult> {
    const recordType = encodeURIComponent(args.record_type as string);
    const url = `${this.baseUrl}/services/rest/record/v1/metadata-catalog/${recordType}`;

    const response = await this.fetchWithRetry(url, {
      method: 'GET',
      headers: {
        Authorization: this.buildAuthHeader('GET', url),
        'Content-Type': 'application/json',
        Accept: 'application/schema+json',
      },
    });

    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `Failed to get metadata: HTTP ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }

    let data: unknown;
    try { data = await response.json(); } catch {
      throw new Error(`NetSuite returned non-JSON metadata response (HTTP ${response.status})`);
    }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }
}

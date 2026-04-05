/**
 * Veeva Vault MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// No official Veeva Vault MCP server was found on GitHub or npm.
//
// Base URL: https://{domain}.veevavault.com/api/v25.1 (domain is tenant-specific)
// Auth: Session-based — POST /api/{version}/auth with username+password returns sessionId for Authorization header.
//       Alternative: OAuth 2.0 for SSO tenants.
// Docs: https://developer.veevavault.com/docs/
// Rate limits: 2,000 API calls per 5 minutes and 100,000 calls per 24 hours per session.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface VeevaConfig {
  username: string;
  password: string;
  vaultDomain: string;
  apiVersion?: string;
}

export class VeevaMCPServer extends MCPAdapterBase {
  private readonly username: string;
  private readonly password: string;
  private readonly baseUrl: string;

  private sessionId: string | null = null;
  private sessionExpiry: number = 0;

  constructor(config: VeevaConfig) {
    super();
    const version = config.apiVersion || 'v25.1';
    this.username = config.username;
    this.password = config.password;
    this.baseUrl = `https://${config.vaultDomain}.veevavault.com/api/${version}`;
  }

  static catalog() {
    return {
      name: 'veeva',
      displayName: 'Veeva Vault',
      version: '1.0.0',
      category: 'misc' as const,
      keywords: ['veeva', 'vault', 'life sciences', 'pharma', 'clinical', 'regulatory', 'document', 'content', 'submission', 'validation', 'quality', 'ctms'],
      toolNames: [
        'list_documents', 'get_document', 'search_documents', 'download_document',
        'create_document', 'update_document', 'delete_document',
        'list_objects', 'get_object_record', 'create_object_record',
        'update_object_record', 'delete_object_record', 'query_vault',
        'list_picklists', 'get_vault_info',
      ],
      description: 'Veeva Vault life sciences content platform: manage regulatory documents, search and download vault content, create and update object records, and run VQL queries for clinical and quality workflows.',
      author: 'protectnil' as const,
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_documents',
        description: 'List documents in Veeva Vault with optional filters for document type, lifecycle state, and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum documents to return (default: 20, max: 1000)',
            },
            offset: {
              type: 'number',
              description: 'Pagination offset (default: 0)',
            },
            scope: {
              type: 'string',
              description: 'Scope filter: all, contents, documents (default: all)',
            },
          },
        },
      },
      {
        name: 'get_document',
        description: 'Get metadata and version information for a specific Veeva Vault document by document ID',
        inputSchema: {
          type: 'object',
          properties: {
            doc_id: {
              type: 'number',
              description: 'Numeric Vault document ID',
            },
          },
          required: ['doc_id'],
        },
      },
      {
        name: 'search_documents',
        description: 'Full-text search across Veeva Vault documents by keyword with optional document type and status filters',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search keyword or phrase',
            },
            doc_type: {
              type: 'string',
              description: 'Filter by document type name (e.g. Protocol, SOP, Report)',
            },
            status: {
              type: 'string',
              description: 'Filter by lifecycle status (e.g. Approved, Draft, Superseded)',
            },
            limit: {
              type: 'number',
              description: 'Maximum results (default: 20)',
            },
            offset: {
              type: 'number',
              description: 'Pagination offset (default: 0)',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'download_document',
        description: 'Download the source file for a Veeva Vault document version and return metadata including download URL',
        inputSchema: {
          type: 'object',
          properties: {
            doc_id: {
              type: 'number',
              description: 'Vault document ID',
            },
            major_version: {
              type: 'number',
              description: 'Major version number (default: latest)',
            },
            minor_version: {
              type: 'number',
              description: 'Minor version number (default: latest)',
            },
          },
          required: ['doc_id'],
        },
      },
      {
        name: 'create_document',
        description: 'Create a new document record in Veeva Vault with metadata fields including type, subtype, and classification',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Document name',
            },
            type: {
              type: 'string',
              description: 'Document type (must match a configured Vault document type)',
            },
            subtype: {
              type: 'string',
              description: 'Document subtype (if applicable)',
            },
            classification: {
              type: 'string',
              description: 'Document classification (if applicable)',
            },
            lifecycle: {
              type: 'string',
              description: 'Document lifecycle name',
            },
            title: {
              type: 'string',
              description: 'Document title',
            },
          },
          required: ['name', 'type', 'lifecycle'],
        },
      },
      {
        name: 'update_document',
        description: 'Update metadata fields on an existing Veeva Vault document by document ID',
        inputSchema: {
          type: 'object',
          properties: {
            doc_id: {
              type: 'number',
              description: 'Vault document ID to update',
            },
            fields: {
              type: 'object',
              description: 'Key-value map of document fields to update (field_name: new_value)',
            },
          },
          required: ['doc_id', 'fields'],
        },
      },
      {
        name: 'delete_document',
        description: 'Delete a document from Veeva Vault by document ID — this action is permanent',
        inputSchema: {
          type: 'object',
          properties: {
            doc_id: {
              type: 'number',
              description: 'Vault document ID to delete',
            },
          },
          required: ['doc_id'],
        },
      },
      {
        name: 'list_objects',
        description: 'List available Vault object types (custom and standard objects configured in this Vault instance)',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_object_record',
        description: 'Get a specific Vault object record by object name and record ID including all field values',
        inputSchema: {
          type: 'object',
          properties: {
            object_name: {
              type: 'string',
              description: 'Vault object API name (e.g. study__v, site__v, product__v)',
            },
            record_id: {
              type: 'string',
              description: 'Object record ID',
            },
          },
          required: ['object_name', 'record_id'],
        },
      },
      {
        name: 'create_object_record',
        description: 'Create a new Vault object record with specified field values for a given object type',
        inputSchema: {
          type: 'object',
          properties: {
            object_name: {
              type: 'string',
              description: 'Vault object API name (e.g. study__v, site__v)',
            },
            fields: {
              type: 'object',
              description: 'Key-value map of field names and values for the new record',
            },
          },
          required: ['object_name', 'fields'],
        },
      },
      {
        name: 'update_object_record',
        description: 'Update fields on an existing Vault object record by object name and record ID',
        inputSchema: {
          type: 'object',
          properties: {
            object_name: {
              type: 'string',
              description: 'Vault object API name',
            },
            record_id: {
              type: 'string',
              description: 'Object record ID to update',
            },
            fields: {
              type: 'object',
              description: 'Key-value map of fields to update',
            },
          },
          required: ['object_name', 'record_id', 'fields'],
        },
      },
      {
        name: 'delete_object_record',
        description: 'Delete a Vault object record by object name and record ID',
        inputSchema: {
          type: 'object',
          properties: {
            object_name: {
              type: 'string',
              description: 'Vault object API name',
            },
            record_id: {
              type: 'string',
              description: 'Object record ID to delete',
            },
          },
          required: ['object_name', 'record_id'],
        },
      },
      {
        name: 'query_vault',
        description: 'Execute a VQL (Vault Query Language) query to retrieve documents or object records using SQL-like syntax',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'VQL query string (e.g. "SELECT id, name__v, status__v FROM documents WHERE type__v = \'Protocol\'")',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'list_picklists',
        description: 'List all picklist (dropdown) field values defined in the Vault for a specific picklist name',
        inputSchema: {
          type: 'object',
          properties: {
            picklist_name: {
              type: 'string',
              description: 'API name of the picklist to retrieve values for',
            },
          },
          required: ['picklist_name'],
        },
      },
      {
        name: 'get_vault_info',
        description: 'Get metadata about the connected Vault instance including vault ID, name, DNS, and API version details',
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
        case 'list_documents':
          return this.listDocuments(args);
        case 'get_document':
          return this.getDocument(args);
        case 'search_documents':
          return this.searchDocuments(args);
        case 'download_document':
          return this.downloadDocument(args);
        case 'create_document':
          return this.createDocument(args);
        case 'update_document':
          return this.updateDocument(args);
        case 'delete_document':
          return this.deleteDocument(args);
        case 'list_objects':
          return this.listObjects();
        case 'get_object_record':
          return this.getObjectRecord(args);
        case 'create_object_record':
          return this.createObjectRecord(args);
        case 'update_object_record':
          return this.updateObjectRecord(args);
        case 'delete_object_record':
          return this.deleteObjectRecord(args);
        case 'query_vault':
          return this.queryVault(args);
        case 'list_picklists':
          return this.listPicklists(args);
        case 'get_vault_info':
          return this.getVaultInfo();
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

  private async getOrRefreshSession(): Promise<string> {
    const now = Date.now();
    if (this.sessionId && this.sessionExpiry > now) {
      return this.sessionId;
    }
    const response = await this.fetchWithRetry(`${this.baseUrl}/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'application/json' },
      body: new URLSearchParams({ username: this.username, password: this.password }).toString(),
    });
    if (!response.ok) {
      throw new Error(`Vault authentication failed: ${response.status} ${response.statusText}`);
    }
    const data = await response.json() as { sessionId: string; responseStatus: string };
    if (data.responseStatus !== 'SUCCESS') {
      throw new Error(`Vault authentication error: ${JSON.stringify(data)}`);
    }
    this.sessionId = data.sessionId;
    // Session tokens are valid for a few hours; refresh after 20 minutes to be safe
    this.sessionExpiry = now + 20 * 60 * 1000;
    return this.sessionId;
  }


  private async apiGet(path: string, params?: Record<string, string>): Promise<ToolResult> {
    const sessionId = await this.getOrRefreshSession();
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}${qs}`, {
      headers: { 'Authorization': sessionId, 'Accept': 'application/json' },
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apiPost(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const sessionId = await this.getOrRefreshSession();
    const formBody = Object.entries(body).map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`).join('&');
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: { 'Authorization': sessionId, 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'application/json' },
      body: formBody,
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apiPut(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const sessionId = await this.getOrRefreshSession();
    const formBody = Object.entries(body).map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`).join('&');
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'PUT',
      headers: { 'Authorization': sessionId, 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'application/json' },
      body: formBody,
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apiDelete(path: string): Promise<ToolResult> {
    const sessionId = await this.getOrRefreshSession();
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'DELETE',
      headers: { 'Authorization': sessionId, 'Accept': 'application/json' },
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listDocuments(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (args.limit) params.limit = String(args.limit);
    if (args.offset) params.offset = String(args.offset);
    if (args.scope) params.scope = args.scope as string;
    return this.apiGet('/objects/documents', params);
  }

  private async getDocument(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.doc_id) return { content: [{ type: 'text', text: 'doc_id is required' }], isError: true };
    return this.apiGet(`/objects/documents/${encodeURIComponent(args.doc_id as string)}`);
  }

  private async searchDocuments(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.query) return { content: [{ type: 'text', text: 'query is required' }], isError: true };
    const params: Record<string, string> = { q: args.query as string };
    if (args.limit) params.limit = String(args.limit);
    if (args.offset) params.offset = String(args.offset);
    return this.apiGet('/objects/documents/search', params);
  }

  private async downloadDocument(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.doc_id) return { content: [{ type: 'text', text: 'doc_id is required' }], isError: true };
    let path = `/objects/documents/${encodeURIComponent(args.doc_id as string)}/file`;
    if (args.major_version !== undefined && args.minor_version !== undefined) {
      path = `/objects/documents/${encodeURIComponent(args.doc_id as string)}/versions/${encodeURIComponent(args.major_version as string)}/${encodeURIComponent(args.minor_version as string)}/file`;
    }
    return this.apiGet(path);
  }

  private async createDocument(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name || !args.type || !args.lifecycle) {
      return { content: [{ type: 'text', text: 'name, type, and lifecycle are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      name__v: args.name,
      type__v: args.type,
      lifecycle__v: args.lifecycle,
    };
    if (args.subtype) body.subtype__v = args.subtype;
    if (args.classification) body.classification__v = args.classification;
    if (args.title) body.title = args.title;
    return this.apiPost('/objects/documents', body as Record<string, unknown>);
  }

  private async updateDocument(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.doc_id || !args.fields) return { content: [{ type: 'text', text: 'doc_id and fields are required' }], isError: true };
    return this.apiPut(`/objects/documents/${encodeURIComponent(args.doc_id as string)}`, args.fields as Record<string, unknown>);
  }

  private async deleteDocument(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.doc_id) return { content: [{ type: 'text', text: 'doc_id is required' }], isError: true };
    return this.apiDelete(`/objects/documents/${encodeURIComponent(args.doc_id as string)}`);
  }

  private async listObjects(): Promise<ToolResult> {
    return this.apiGet('/objects');
  }

  private async getObjectRecord(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.object_name || !args.record_id) return { content: [{ type: 'text', text: 'object_name and record_id are required' }], isError: true };
    return this.apiGet(`/objects/${encodeURIComponent(args.object_name as string)}/${encodeURIComponent(args.record_id as string)}`);
  }

  private async createObjectRecord(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.object_name || !args.fields) return { content: [{ type: 'text', text: 'object_name and fields are required' }], isError: true };
    return this.apiPost(`/objects/${encodeURIComponent(args.object_name as string)}`, args.fields as Record<string, unknown>);
  }

  private async updateObjectRecord(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.object_name || !args.record_id || !args.fields) return { content: [{ type: 'text', text: 'object_name, record_id, and fields are required' }], isError: true };
    return this.apiPut(`/objects/${encodeURIComponent(args.object_name as string)}/${encodeURIComponent(args.record_id as string)}`, args.fields as Record<string, unknown>);
  }

  private async deleteObjectRecord(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.object_name || !args.record_id) return { content: [{ type: 'text', text: 'object_name and record_id are required' }], isError: true };
    return this.apiDelete(`/objects/${encodeURIComponent(args.object_name as string)}/${encodeURIComponent(args.record_id as string)}`);
  }

  private async queryVault(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.query) return { content: [{ type: 'text', text: 'query is required' }], isError: true };
    return this.apiGet('/query', { q: args.query as string });
  }

  private async listPicklists(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.picklist_name) return { content: [{ type: 'text', text: 'picklist_name is required' }], isError: true };
    return this.apiGet(`/objects/picklists/${encodeURIComponent(args.picklist_name as string)}`);
  }

  private async getVaultInfo(): Promise<ToolResult> {
    return this.apiGet('/');
  }
}

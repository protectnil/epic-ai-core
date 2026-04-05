/**
 * OPTIMADE (Open Databases Integration for Materials Design) MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03.
//
// Base URL: http://optimade.local  (configurable; each OPTIMADE provider has its own URL)
//   Known providers: https://providers.optimade.org/
//   Examples: https://optimade.materialsproject.org, https://nomad-lab.eu/prod/v1/optimade
// Auth: No authentication defined in the spec. Some providers may require tokens.
// Docs: https://www.optimade.org/ | https://github.com/Materials-Consortia/OPTIMADE
// Rate limits: Not published. Provider-dependent. Recommend ≤30 req/min.
// Spec: https://api.apis.guru/v2/specs/optimade.local/1.1.0~develop/openapi.json

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface OptimadeConfig {
  baseUrl?: string;  // OPTIMADE provider base URL (default: http://optimade.local)
  apiKey?: string;   // Optional bearer token for providers that require auth
}

export class OptimadeMCPServer extends MCPAdapterBase {
  private readonly baseUrl: string;
  private readonly apiKey?: string;

  constructor(config: OptimadeConfig = {}) {
    super();
    this.baseUrl = (config.baseUrl ?? 'http://optimade.local').replace(/\/$/, '');
    this.apiKey = config.apiKey;
  }

  static catalog() {
    return {
      name: 'optimade',
      displayName: 'OPTIMADE Materials Database',
      version: '1.0.0',
      category: 'science' as const,
      keywords: ['optimade', 'materials', 'science', 'chemistry', 'crystal', 'structures', 'references', 'research', 'database', 'open-data'],
      toolNames: [
        'get_info',
        'get_entry_info',
        'get_versions',
        'list_structures',
        'get_structure',
        'list_references',
        'get_reference',
        'list_links',
      ],
      description: 'Query OPTIMADE materials science databases: retrieve crystal structures, references, and server info via the OPTIMADE REST API standard.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      // ── Info ─────────────────────────────────────────────────────────────
      {
        name: 'get_info',
        description: 'Get OPTIMADE server information including API version, available endpoints, and provider metadata.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_entry_info',
        description: 'Get metadata about a specific OPTIMADE entry type (e.g. structures, references) including sortable fields.',
        inputSchema: {
          type: 'object',
          properties: {
            entry: { type: 'string', description: 'Entry type name, e.g. structures, references, links' },
          },
          required: ['entry'],
        },
      },
      {
        name: 'get_versions',
        description: 'Get the list of OPTIMADE API versions supported by this provider endpoint.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      // ── Structures ───────────────────────────────────────────────────────
      {
        name: 'list_structures',
        description: 'Search and list crystal structures from the OPTIMADE database with optional OPTIMADE filter query.',
        inputSchema: {
          type: 'object',
          properties: {
            filter: { type: 'string', description: 'OPTIMADE filter expression, e.g. elements HAS "Fe" AND nelements=2' },
            response_fields: { type: 'string', description: 'Comma-separated list of fields to include in the response' },
            sort: { type: 'string', description: 'Field to sort by, prefix with - for descending, e.g. -nelements' },
            page_limit: { type: 'integer', description: 'Maximum number of results per page (default: provider-defined)' },
            page_offset: { type: 'integer', description: 'Number of results to skip for offset-based pagination' },
            page_number: { type: 'integer', description: 'Page number for page-number-based pagination' },
            page_cursor: { type: 'integer', description: 'Cursor value for cursor-based pagination' },
            page_above: { type: 'integer', description: 'Return results above this cursor value' },
            page_below: { type: 'integer', description: 'Return results below this cursor value' },
            include: { type: 'string', description: 'Comma-separated list of related resources to include' },
            api_hint: { type: 'string', description: 'OPTIMADE version hint, e.g. v1.1' },
            response_format: { type: 'string', description: 'Response format: json (default)' },
            email_address: { type: 'string', description: 'Requester email address (optional, used by some providers for tracking)' },
          },
        },
      },
      {
        name: 'get_structure',
        description: 'Get a single crystal structure entry by its OPTIMADE entry ID.',
        inputSchema: {
          type: 'object',
          properties: {
            entry_id: { type: 'string', description: 'Unique OPTIMADE entry ID for the structure' },
            response_fields: { type: 'string', description: 'Comma-separated list of fields to include in the response' },
            include: { type: 'string', description: 'Comma-separated list of related resources to include' },
            api_hint: { type: 'string', description: 'OPTIMADE version hint, e.g. v1.1' },
            response_format: { type: 'string', description: 'Response format: json (default)' },
            email_address: { type: 'string', description: 'Requester email address (optional)' },
          },
          required: ['entry_id'],
        },
      },
      // ── References ───────────────────────────────────────────────────────
      {
        name: 'list_references',
        description: 'Search and list literature references from the OPTIMADE database with optional filter query.',
        inputSchema: {
          type: 'object',
          properties: {
            filter: { type: 'string', description: 'OPTIMADE filter expression for references' },
            response_fields: { type: 'string', description: 'Comma-separated list of fields to include in the response' },
            sort: { type: 'string', description: 'Field to sort by, prefix with - for descending' },
            page_limit: { type: 'integer', description: 'Maximum number of results per page' },
            page_offset: { type: 'integer', description: 'Number of results to skip for offset-based pagination' },
            page_number: { type: 'integer', description: 'Page number for page-number-based pagination' },
            page_cursor: { type: 'integer', description: 'Cursor value for cursor-based pagination' },
            page_above: { type: 'integer', description: 'Return results above this cursor value' },
            page_below: { type: 'integer', description: 'Return results below this cursor value' },
            include: { type: 'string', description: 'Comma-separated list of related resources to include' },
            api_hint: { type: 'string', description: 'OPTIMADE version hint, e.g. v1.1' },
            response_format: { type: 'string', description: 'Response format: json (default)' },
            email_address: { type: 'string', description: 'Requester email address (optional)' },
          },
        },
      },
      {
        name: 'get_reference',
        description: 'Get a single literature reference entry by its OPTIMADE entry ID.',
        inputSchema: {
          type: 'object',
          properties: {
            entry_id: { type: 'string', description: 'Unique OPTIMADE entry ID for the reference' },
            response_fields: { type: 'string', description: 'Comma-separated list of fields to include in the response' },
            include: { type: 'string', description: 'Comma-separated list of related resources to include' },
            api_hint: { type: 'string', description: 'OPTIMADE version hint, e.g. v1.1' },
            response_format: { type: 'string', description: 'Response format: json (default)' },
            email_address: { type: 'string', description: 'Requester email address (optional)' },
          },
          required: ['entry_id'],
        },
      },
      // ── Links ─────────────────────────────────────────────────────────────
      {
        name: 'list_links',
        description: 'List child endpoints and related OPTIMADE providers linked from this server.',
        inputSchema: {
          type: 'object',
          properties: {
            filter: { type: 'string', description: 'OPTIMADE filter expression for links' },
            response_fields: { type: 'string', description: 'Comma-separated list of fields to include in the response' },
            sort: { type: 'string', description: 'Field to sort by, prefix with - for descending' },
            page_limit: { type: 'integer', description: 'Maximum number of results per page' },
            page_offset: { type: 'integer', description: 'Number of results to skip for offset-based pagination' },
            page_number: { type: 'integer', description: 'Page number for page-number-based pagination' },
            page_cursor: { type: 'integer', description: 'Cursor value for cursor-based pagination' },
            page_above: { type: 'integer', description: 'Return results above this cursor value' },
            page_below: { type: 'integer', description: 'Return results below this cursor value' },
            include: { type: 'string', description: 'Comma-separated list of related resources to include' },
            api_hint: { type: 'string', description: 'OPTIMADE version hint, e.g. v1.1' },
            response_format: { type: 'string', description: 'Response format: json (default)' },
            email_address: { type: 'string', description: 'Requester email address (optional)' },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'get_info':         return await this.getInfo();
        case 'get_entry_info':   return await this.getEntryInfo(args);
        case 'get_versions':     return await this.getVersions();
        case 'list_structures':  return await this.listStructures(args);
        case 'get_structure':    return await this.getStructure(args);
        case 'list_references':  return await this.listReferences(args);
        case 'get_reference':    return await this.getReference(args);
        case 'list_links':       return await this.listLinks(args);
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

  // ── Private helpers ──────────────────────────────────────────────────────

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Accept': 'application/json',
    };
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }
    return headers;
  }

  private buildQueryParams(args: Record<string, unknown>): string {
    const params = new URLSearchParams();
    const queryFields = [
      'filter', 'response_format', 'email_address', 'response_fields',
      'sort', 'page_limit', 'page_offset', 'page_number', 'page_cursor',
      'page_above', 'page_below', 'include', 'api_hint',
    ];
    for (const field of queryFields) {
      if (args[field] !== undefined && args[field] !== null) {
        params.set(field, String(args[field]));
      }
    }
    return params.toString();
  }

  private async optimadeRequest(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      headers: this.buildHeaders(),
    });

    if (!response.ok) {
      let detail = '';
      try { detail = await response.text(); } catch { /* ignore */ }
      return {
        content: [{ type: 'text', text: `OPTIMADE API error ${response.status} ${response.statusText}${detail ? ': ' + detail.slice(0, 400) : ''}` }],
        isError: true,
      };
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      return { content: [{ type: 'text', text: `OPTIMADE returned non-JSON response (HTTP ${response.status})` }], isError: true };
    }

    const text = JSON.stringify(data, null, 2);
    const truncated = text.length > 10_000
      ? text.slice(0, 10_000) + `\n... [truncated, ${text.length} total chars]`
      : text;
    return { content: [{ type: 'text', text: truncated }], isError: false };
  }

  // ── Info ─────────────────────────────────────────────────────────────────

  private async getInfo(): Promise<ToolResult> {
    return this.optimadeRequest('/info');
  }

  private async getEntryInfo(args: Record<string, unknown>): Promise<ToolResult> {
    const entry = encodeURIComponent(String(args.entry));
    return this.optimadeRequest(`/info/${entry}`);
  }

  private async getVersions(): Promise<ToolResult> {
    return this.optimadeRequest('/versions');
  }

  // ── Structures ───────────────────────────────────────────────────────────

  private async listStructures(args: Record<string, unknown>): Promise<ToolResult> {
    const qs = this.buildQueryParams(args);
    return this.optimadeRequest(`/structures${qs ? '?' + qs : ''}`);
  }

  private async getStructure(args: Record<string, unknown>): Promise<ToolResult> {
    const id = encodeURIComponent(String(args.entry_id));
    const subArgs = { ...args };
    delete subArgs['entry_id'];
    const qs = this.buildQueryParams(subArgs);
    return this.optimadeRequest(`/structures/${id}${qs ? '?' + qs : ''}`);
  }

  // ── References ───────────────────────────────────────────────────────────

  private async listReferences(args: Record<string, unknown>): Promise<ToolResult> {
    const qs = this.buildQueryParams(args);
    return this.optimadeRequest(`/references${qs ? '?' + qs : ''}`);
  }

  private async getReference(args: Record<string, unknown>): Promise<ToolResult> {
    const id = encodeURIComponent(String(args.entry_id));
    const subArgs = { ...args };
    delete subArgs['entry_id'];
    const qs = this.buildQueryParams(subArgs);
    return this.optimadeRequest(`/references/${id}${qs ? '?' + qs : ''}`);
  }

  // ── Links ─────────────────────────────────────────────────────────────────

  private async listLinks(args: Record<string, unknown>): Promise<ToolResult> {
    const qs = this.buildQueryParams(args);
    return this.optimadeRequest(`/links${qs ? '?' + qs : ''}`);
  }
}

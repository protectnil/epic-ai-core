/**
 * PDF Generator API MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03. No official MCP server published by PDF Generator API.
//
// Base URL: https://us1.pdfgeneratorapi.com/api/v3
// Auth: JWT Bearer token — Authorization: Bearer <jwt>
//   JWT payload must include: iss (API key), sub (workspace identifier), exp (unix expiry)
//   JWT is signed with the API Secret using HS256
// Docs: https://docs.pdfgeneratorapi.com/
// Rate limits: Not publicly documented; enforced per account tier.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface PDFGeneratorAPIConfig {
  jwtToken: string;
  baseUrl?: string;
}

export class PDFGeneratorAPIMCPServer extends MCPAdapterBase {
  private readonly jwtToken: string;
  private readonly baseUrl: string;

  constructor(config: PDFGeneratorAPIConfig) {
    super();
    this.jwtToken = config.jwtToken;
    this.baseUrl = config.baseUrl || 'https://us1.pdfgeneratorapi.com/api/v3';
  }

  static catalog() {
    return {
      name: 'pdfgeneratorapi',
      displayName: 'PDF Generator API',
      version: '1.0.0',
      category: 'productivity' as const,
      keywords: [
        'pdf', 'document', 'template', 'generate', 'report', 'invoice',
        'merge', 'workspace', 'pdf generator', 'transactional pdf',
      ],
      toolNames: [
        'list_templates',
        'get_template',
        'create_template',
        'update_template',
        'delete_template',
        'copy_template',
        'generate_document',
        'generate_documents_batch',
        'get_editor_url',
        'get_workspace',
        'delete_workspace',
      ],
      description: 'Generate transactional PDFs from drag-and-drop templates using the PDF Generator API. Manage templates, workspaces, and merge data into documents.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      // ── Templates ─────────────────────────────────────────────────────────
      {
        name: 'list_templates',
        description: 'List all PDF templates available in the workspace, with optional name filter and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Filter templates by name (partial match)' },
            tags: { type: 'string', description: 'Filter templates by comma-separated tags' },
            access: { type: 'string', description: 'Filter by access level: private or organization' },
            page: { type: 'number', description: 'Page number for pagination (default: 1)' },
            per_page: { type: 'number', description: 'Results per page (max 50, default: 15)' },
          },
        },
      },
      {
        name: 'get_template',
        description: 'Retrieve a single PDF template by its numeric template ID, including full definition',
        inputSchema: {
          type: 'object',
          properties: {
            template_id: { type: 'number', description: 'Numeric template ID' },
          },
          required: ['template_id'],
        },
      },
      {
        name: 'create_template',
        description: 'Create a new blank PDF template with a given name and optional layout settings',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Template name (required)' },
            tags: {
              type: 'array',
              description: 'Tags for categorizing the template',
              items: { type: 'string' },
            },
            is_global: { type: 'boolean', description: 'If true, template is available organization-wide (default: false)' },
          },
          required: ['name'],
        },
      },
      {
        name: 'update_template',
        description: 'Update an existing PDF template name, tags, or access settings by template ID',
        inputSchema: {
          type: 'object',
          properties: {
            template_id: { type: 'number', description: 'Numeric template ID to update' },
            name: { type: 'string', description: 'New template name' },
            tags: {
              type: 'array',
              description: 'Updated tags array',
              items: { type: 'string' },
            },
          },
          required: ['template_id'],
        },
      },
      {
        name: 'delete_template',
        description: 'Permanently delete a PDF template by its numeric ID',
        inputSchema: {
          type: 'object',
          properties: {
            template_id: { type: 'number', description: 'Numeric template ID to delete' },
          },
          required: ['template_id'],
        },
      },
      {
        name: 'copy_template',
        description: 'Create a copy of an existing template with an optional new name',
        inputSchema: {
          type: 'object',
          properties: {
            template_id: { type: 'number', description: 'Numeric ID of the template to copy' },
            name: { type: 'string', description: 'Name for the new copied template (default: copy of original name)' },
          },
          required: ['template_id'],
        },
      },
      // ── Document Generation ────────────────────────────────────────────────
      {
        name: 'generate_document',
        description: 'Merge JSON data into a single PDF template and return the generated document URL or base64',
        inputSchema: {
          type: 'object',
          properties: {
            template_id: { type: 'number', description: 'Numeric template ID to generate from' },
            data: {
              type: 'object',
              description: 'JSON data object to merge into the template fields',
            },
            name: { type: 'string', description: 'Output file name without extension (default: template name)' },
            format: { type: 'string', description: 'Output format: pdf, html, xlsx, docx (default: pdf)' },
            output: { type: 'string', description: 'Return type: base64 (encoded PDF string) or url (hosted link, default: url)' },
          },
          required: ['template_id', 'data'],
        },
      },
      {
        name: 'generate_documents_batch',
        description: 'Merge data into multiple templates in one request and combine them into a single PDF output',
        inputSchema: {
          type: 'object',
          properties: {
            templates: {
              type: 'array',
              description: 'Array of {id, data} objects specifying templates and their merge data',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'number', description: 'Template ID' },
                  data: { type: 'object', description: 'Data to merge into this template' },
                },
              },
            },
            name: { type: 'string', description: 'Output file name without extension' },
            format: { type: 'string', description: 'Output format: pdf, html, xlsx, docx (default: pdf)' },
            output: { type: 'string', description: 'Return type: base64 or url (default: url)' },
          },
          required: ['templates'],
        },
      },
      // ── Editor ────────────────────────────────────────────────────────────
      {
        name: 'get_editor_url',
        description: 'Get a one-time URL to open the drag-and-drop PDF template editor for a specific template',
        inputSchema: {
          type: 'object',
          properties: {
            template_id: { type: 'number', description: 'Numeric template ID to open in the editor' },
            language: { type: 'string', description: 'Editor UI language code (e.g. en, de, fr — default: en)' },
          },
          required: ['template_id'],
        },
      },
      // ── Workspaces ────────────────────────────────────────────────────────
      {
        name: 'get_workspace',
        description: 'Retrieve details of a workspace by its identifier (email address)',
        inputSchema: {
          type: 'object',
          properties: {
            workspace_id: { type: 'string', description: 'Workspace identifier (email address of the workspace)' },
          },
          required: ['workspace_id'],
        },
      },
      {
        name: 'delete_workspace',
        description: 'Delete a non-master workspace by its identifier. The master workspace cannot be deleted via API.',
        inputSchema: {
          type: 'object',
          properties: {
            workspace_id: { type: 'string', description: 'Workspace identifier (email) to delete — must not be the master workspace' },
          },
          required: ['workspace_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_templates':           return await this.listTemplates(args);
        case 'get_template':             return await this.getTemplate(args);
        case 'create_template':          return await this.createTemplate(args);
        case 'update_template':          return await this.updateTemplate(args);
        case 'delete_template':          return await this.deleteTemplate(args);
        case 'copy_template':            return await this.copyTemplate(args);
        case 'generate_document':        return await this.generateDocument(args);
        case 'generate_documents_batch': return await this.generateDocumentsBatch(args);
        case 'get_editor_url':           return await this.getEditorUrl(args);
        case 'get_workspace':            return await this.getWorkspace(args);
        case 'delete_workspace':         return await this.deleteWorkspace(args);
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

  private buildHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.jwtToken}`,
      'Content-Type': 'application/json',
    };
  }

  private async apiRequest(
    path: string,
    options: RequestInit = {},
  ): Promise<ToolResult> {
    const url = `${this.baseUrl}${path}`;
    const response = await this.fetchWithRetry(url, { ...options, headers: this.buildHeaders() });

    if (!response.ok) {
      let detail = '';
      try { detail = await response.text(); } catch { /* ignore */ }
      return {
        content: [{ type: 'text', text: `PDF Generator API error ${response.status} ${response.statusText}${detail ? ': ' + detail.slice(0, 400) : ''}` }],
        isError: true,
      };
    }

    // DELETE 204 — no body
    if (response.status === 204) {
      return { content: [{ type: 'text', text: 'Success (204 No Content)' }], isError: false };
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      return { content: [{ type: 'text', text: `PDF Generator API returned non-JSON response (HTTP ${response.status})` }], isError: true };
    }

    const text = JSON.stringify(data, null, 2);
    const truncated = text.length > 10_000
      ? text.slice(0, 10_000) + `\n... [truncated, ${text.length} total chars]`
      : text;
    return { content: [{ type: 'text', text: truncated }], isError: false };
  }

  // ── Templates ─────────────────────────────────────────────────────────────

  private async listTemplates(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.name) params.set('name', args.name as string);
    if (args.tags) params.set('tags', args.tags as string);
    if (args.access) params.set('access', args.access as string);
    if (args.page) params.set('page', String(args.page));
    if (args.per_page) params.set('per_page', String(args.per_page));
    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.apiRequest(`/templates${qs}`);
  }

  private async getTemplate(args: Record<string, unknown>): Promise<ToolResult> {
    return this.apiRequest(`/templates/${encodeURIComponent(String(args.template_id))}`);
  }

  private async createTemplate(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = { name: args.name };
    if (args.tags !== undefined) body.tags = args.tags;
    if (args.is_global !== undefined) body.isDraft = !(args.is_global as boolean);
    return this.apiRequest('/templates', { method: 'POST', body: JSON.stringify(body) });
  }

  private async updateTemplate(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {};
    if (args.name !== undefined) body.name = args.name;
    if (args.tags !== undefined) body.tags = args.tags;
    return this.apiRequest(
      `/templates/${encodeURIComponent(String(args.template_id))}`,
      { method: 'PUT', body: JSON.stringify(body) },
    );
  }

  private async deleteTemplate(args: Record<string, unknown>): Promise<ToolResult> {
    return this.apiRequest(
      `/templates/${encodeURIComponent(String(args.template_id))}`,
      { method: 'DELETE' },
    );
  }

  private async copyTemplate(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {};
    if (args.name !== undefined) body.name = args.name;
    return this.apiRequest(
      `/templates/${encodeURIComponent(String(args.template_id))}/copy`,
      { method: 'POST', body: JSON.stringify(body) },
    );
  }

  private async generateDocument(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    params.set('templateId', String(args.template_id));
    if (args.name) params.set('name', args.name as string);
    if (args.format) params.set('format', args.format as string);
    if (args.output) params.set('output', args.output as string);
    return this.apiRequest(
      `/templates/${encodeURIComponent(String(args.template_id))}/output?${params.toString()}`,
      { method: 'POST', body: JSON.stringify(args.data ?? {}) },
    );
  }

  private async generateDocumentsBatch(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.name) params.set('name', args.name as string);
    if (args.format) params.set('format', args.format as string);
    if (args.output) params.set('output', args.output as string);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.apiRequest(
      `/templates/output${qs}`,
      { method: 'POST', body: JSON.stringify({ templates: args.templates }) },
    );
  }

  private async getEditorUrl(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {};
    if (args.language !== undefined) body.language = args.language;
    return this.apiRequest(
      `/templates/${encodeURIComponent(String(args.template_id))}/editor`,
      { method: 'POST', body: JSON.stringify(body) },
    );
  }

  // ── Workspaces ────────────────────────────────────────────────────────────

  private async getWorkspace(args: Record<string, unknown>): Promise<ToolResult> {
    return this.apiRequest(`/workspaces/${encodeURIComponent(args.workspace_id as string)}`);
  }

  private async deleteWorkspace(args: Record<string, unknown>): Promise<ToolResult> {
    return this.apiRequest(
      `/workspaces/${encodeURIComponent(args.workspace_id as string)}`,
      { method: 'DELETE' },
    );
  }
}

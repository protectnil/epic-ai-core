/**
 * MotaWord MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// No official MotaWord MCP server was found on GitHub, npm, or MotaWord developer docs.
// Our adapter covers: 20 tools. Vendor MCP: None.
// Recommendation: use-rest-api — no official MCP exists; REST adapter is the primary integration.
//
// Base URL: https://api.motaword.com
// Auth: OAuth2 Client Credentials flow. POST /token with client_id + client_secret (Basic auth)
//       to obtain a Bearer access token. Token is cached until expiry.
// Docs: https://docs.motaword.com/
// Rate limits: Varies by plan. Contact MotaWord for commercial rate limits.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface MotaWordConfig {
  /** OAuth2 client ID from MotaWord developer dashboard */
  clientId: string;
  /** OAuth2 client secret from MotaWord developer dashboard */
  clientSecret: string;
  /** Base URL override. Defaults to https://api.motaword.com */
  baseUrl?: string;
}

interface TokenCache {
  accessToken: string;
  expiresAt: number;
}

export class MotaWordMCPServer extends MCPAdapterBase {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly baseUrl: string;
  private tokenCache: TokenCache | null = null;

  constructor(config: MotaWordConfig) {
    super();
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.baseUrl = (config.baseUrl ?? 'https://api.motaword.com').replace(/\/$/, '');
  }

  static catalog() {
    return {
      name: 'motaword',
      displayName: 'MotaWord',
      version: '1.0.0',
      category: 'productivity',
      keywords: [
        'motaword', 'translation', 'localization', 'l10n', 'i18n', 'project',
        'document', 'glossary', 'style guide', 'language', 'languages',
        'continuous translation', 'strings', 'translation memory', 'TM',
        'proofreading', 'vendor', 'quote', 'invoice', 'webhook',
      ],
      toolNames: [
        'get_languages', 'get_formats',
        'list_projects', 'get_project', 'create_project', 'update_project', 'delete_project',
        'launch_project', 'cancel_project', 'get_project_progress', 'download_project',
        'list_project_documents', 'create_project_document', 'delete_project_document',
        'get_glossaries', 'create_glossary', 'delete_glossary',
        'get_style_guides', 'create_style_guide', 'delete_style_guide',
      ],
      description: 'MotaWord professional translation platform: manage translation projects, documents, glossaries, style guides, and language pairs.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      // ── Reference Data ─────────────────────────────────────────────────────
      {
        name: 'get_languages',
        description: 'Get the full list of language codes and names supported by MotaWord for source and target translation',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_formats',
        description: 'Get the list of document file formats supported by MotaWord (e.g. DOCX, XLIFF, PO, HTML)',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      // ── Projects ───────────────────────────────────────────────────────────
      {
        name: 'list_projects',
        description: 'List all translation projects in your MotaWord account with optional pagination',
        inputSchema: {
          type: 'object',
          properties: {
            page: { type: 'number', description: 'Page number (0-based, default: 0)' },
            per_page: { type: 'number', description: 'Number of projects per page (default: 10)' },
          },
        },
      },
      {
        name: 'get_project',
        description: 'Get full details of a specific MotaWord translation project by project ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'MotaWord numeric project ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'create_project',
        description: 'Create a new translation project in MotaWord with source language, target languages, and callback settings',
        inputSchema: {
          type: 'object',
          properties: {
            source_language: { type: 'string', description: 'Source language code (e.g. en-US, de-DE)' },
            target_languages: {
              type: 'array',
              items: { type: 'string' },
              description: 'Array of target language codes (e.g. ["es-ES","fr-FR"])',
            },
            callback_url: { type: 'string', description: 'Webhook URL to notify on project events' },
            custom: { type: 'string', description: 'Custom data string to attach to the project (max 255 chars)' },
          },
          required: ['source_language', 'target_languages'],
        },
      },
      {
        name: 'update_project',
        description: 'Update settings or callback URL for an existing MotaWord translation project',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'MotaWord numeric project ID' },
            callback_url: { type: 'string', description: 'New webhook callback URL' },
            custom: { type: 'string', description: 'Updated custom data string (max 255 chars)' },
          },
          required: ['id'],
        },
      },
      {
        name: 'delete_project',
        description: 'Permanently delete a MotaWord translation project and all associated documents',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'MotaWord numeric project ID to delete' },
          },
          required: ['id'],
        },
      },
      {
        name: 'launch_project',
        description: 'Launch a MotaWord project to start the translation process (requires documents to be uploaded first)',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'MotaWord numeric project ID to launch' },
            payment_code: { type: 'string', description: 'Payment code if required by account billing settings' },
          },
          required: ['id'],
        },
      },
      {
        name: 'cancel_project',
        description: 'Cancel an active or pending MotaWord translation project',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'MotaWord numeric project ID to cancel' },
          },
          required: ['id'],
        },
      },
      {
        name: 'get_project_progress',
        description: 'Get the current translation progress percentage and status for a MotaWord project',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'MotaWord numeric project ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'download_project',
        description: 'Get the download URL for all translated files in a completed MotaWord project',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'MotaWord numeric project ID' },
          },
          required: ['id'],
        },
      },
      // ── Project Documents ──────────────────────────────────────────────────
      {
        name: 'list_project_documents',
        description: 'List all source documents uploaded to a MotaWord translation project',
        inputSchema: {
          type: 'object',
          properties: {
            projectId: { type: 'number', description: 'MotaWord numeric project ID' },
          },
          required: ['projectId'],
        },
      },
      {
        name: 'create_project_document',
        description: 'Upload a new source document to a MotaWord project by providing the document URL and name',
        inputSchema: {
          type: 'object',
          properties: {
            projectId: { type: 'number', description: 'MotaWord numeric project ID' },
            url: { type: 'string', description: 'Publicly accessible URL to the document file to upload' },
            name: { type: 'string', description: 'Filename for the document (e.g. content.docx)' },
          },
          required: ['projectId', 'url', 'name'],
        },
      },
      {
        name: 'delete_project_document',
        description: 'Delete a source document from a MotaWord project by document ID',
        inputSchema: {
          type: 'object',
          properties: {
            projectId: { type: 'number', description: 'MotaWord numeric project ID' },
            documentId: { type: 'number', description: 'MotaWord numeric document ID to delete' },
          },
          required: ['projectId', 'documentId'],
        },
      },
      // ── Glossaries ─────────────────────────────────────────────────────────
      {
        name: 'get_glossaries',
        description: 'List all glossaries attached to a MotaWord translation project',
        inputSchema: {
          type: 'object',
          properties: {
            projectId: { type: 'number', description: 'MotaWord numeric project ID' },
          },
          required: ['projectId'],
        },
      },
      {
        name: 'create_glossary',
        description: 'Upload a glossary file to a MotaWord project by providing the glossary file URL and name',
        inputSchema: {
          type: 'object',
          properties: {
            projectId: { type: 'number', description: 'MotaWord numeric project ID' },
            url: { type: 'string', description: 'Publicly accessible URL to the glossary file (TBX, XLSX, or CSV)' },
            name: { type: 'string', description: 'Filename for the glossary (e.g. terms.tbx)' },
          },
          required: ['projectId', 'url', 'name'],
        },
      },
      {
        name: 'delete_glossary',
        description: 'Delete a glossary from a MotaWord project by glossary ID',
        inputSchema: {
          type: 'object',
          properties: {
            projectId: { type: 'number', description: 'MotaWord numeric project ID' },
            glossaryId: { type: 'number', description: 'MotaWord numeric glossary ID to delete' },
          },
          required: ['projectId', 'glossaryId'],
        },
      },
      // ── Style Guides ───────────────────────────────────────────────────────
      {
        name: 'get_style_guides',
        description: 'List all style guides attached to a MotaWord translation project',
        inputSchema: {
          type: 'object',
          properties: {
            projectId: { type: 'number', description: 'MotaWord numeric project ID' },
          },
          required: ['projectId'],
        },
      },
      {
        name: 'create_style_guide',
        description: 'Upload a style guide file to a MotaWord project by providing the style guide file URL and name',
        inputSchema: {
          type: 'object',
          properties: {
            projectId: { type: 'number', description: 'MotaWord numeric project ID' },
            url: { type: 'string', description: 'Publicly accessible URL to the style guide file (PDF or DOCX)' },
            name: { type: 'string', description: 'Filename for the style guide (e.g. brand-guide.pdf)' },
          },
          required: ['projectId', 'url', 'name'],
        },
      },
      {
        name: 'delete_style_guide',
        description: 'Delete a style guide from a MotaWord project by style guide ID',
        inputSchema: {
          type: 'object',
          properties: {
            projectId: { type: 'number', description: 'MotaWord numeric project ID' },
            styleGuideId: { type: 'number', description: 'MotaWord numeric style guide ID to delete' },
          },
          required: ['projectId', 'styleGuideId'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'get_languages':            return await this.getLanguages();
        case 'get_formats':              return await this.getFormats();
        case 'list_projects':            return await this.listProjects(args);
        case 'get_project':              return await this.getProject(args);
        case 'create_project':           return await this.createProject(args);
        case 'update_project':           return await this.updateProject(args);
        case 'delete_project':           return await this.deleteProject(args);
        case 'launch_project':           return await this.launchProject(args);
        case 'cancel_project':           return await this.cancelProject(args);
        case 'get_project_progress':     return await this.getProjectProgress(args);
        case 'download_project':         return await this.downloadProject(args);
        case 'list_project_documents':   return await this.listProjectDocuments(args);
        case 'create_project_document':  return await this.createProjectDocument(args);
        case 'delete_project_document':  return await this.deleteProjectDocument(args);
        case 'get_glossaries':           return await this.getGlossaries(args);
        case 'create_glossary':          return await this.createGlossary(args);
        case 'delete_glossary':          return await this.deleteGlossary(args);
        case 'get_style_guides':         return await this.getStyleGuides(args);
        case 'create_style_guide':       return await this.createStyleGuide(args);
        case 'delete_style_guide':       return await this.deleteStyleGuide(args);
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

  // ── Auth / token management ────────────────────────────────────────────────

  private async getAccessToken(): Promise<string> {
    const now = Date.now();
    if (this.tokenCache && this.tokenCache.expiresAt > now + 30_000) {
      return this.tokenCache.accessToken;
    }
    const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
    const response = await this.fetchWithRetry(`${this.baseUrl}/token`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: 'grant_type=client_credentials',
    });
    if (!response.ok) {
      throw new Error(`MotaWord token request failed: ${response.status} ${response.statusText}`);
    }
    const data = await response.json() as { access_token: string; expires_in?: number };
    const expiresIn = (data.expires_in ?? 3600) * 1000;
    this.tokenCache = { accessToken: data.access_token, expiresAt: now + expiresIn };
    return data.access_token;
  }

  private async request(
    method: string,
    path: string,
    body?: Record<string, unknown>,
  ): Promise<ToolResult> {
    const token = await this.getAccessToken();
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
    };
    const init: RequestInit = { method, headers };
    if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
      init.body = JSON.stringify(body);
    }
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, init);
    if (response.status === 204) {
      return { content: [{ type: 'text', text: '{"success":true}' }], isError: false };
    }
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `API error: ${response.status} ${errText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  // ── Reference ──────────────────────────────────────────────────────────────

  private async getLanguages(): Promise<ToolResult> {
    return this.request('GET', '/languages');
  }

  private async getFormats(): Promise<ToolResult> {
    return this.request('GET', '/formats');
  }

  // ── Projects ───────────────────────────────────────────────────────────────

  private async listProjects(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.page !== undefined) params.set('page', String(args.page));
    if (args.per_page !== undefined) params.set('per_page', String(args.per_page));
    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.request('GET', `/projects${qs}`);
  }

  private async getProject(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.request('GET', `/projects/${encodeURIComponent(String(args.id))}`);
  }

  private async createProject(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.source_language || !args.target_languages) {
      return { content: [{ type: 'text', text: 'source_language and target_languages are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      source_language: args.source_language,
      target_languages: args.target_languages,
    };
    if (args.callback_url) body.callback_url = args.callback_url;
    if (args.custom) body.custom = args.custom;
    return this.request('POST', '/projects', body);
  }

  private async updateProject(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.callback_url !== undefined) body.callback_url = args.callback_url;
    if (args.custom !== undefined) body.custom = args.custom;
    return this.request('PUT', `/projects/${encodeURIComponent(String(args.id))}`, body);
  }

  private async deleteProject(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.request('DELETE', `/projects/${encodeURIComponent(String(args.id))}`);
  }

  private async launchProject(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.payment_code) body.payment_code = args.payment_code;
    return this.request('POST', `/projects/${encodeURIComponent(String(args.id))}/launch`, body);
  }

  private async cancelProject(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.request('POST', `/projects/${encodeURIComponent(String(args.id))}/cancel`);
  }

  private async getProjectProgress(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.request('GET', `/projects/${encodeURIComponent(String(args.id))}/progress`);
  }

  private async downloadProject(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.request('GET', `/projects/${encodeURIComponent(String(args.id))}/download`);
  }

  // ── Documents ──────────────────────────────────────────────────────────────

  private async listProjectDocuments(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.projectId) return { content: [{ type: 'text', text: 'projectId is required' }], isError: true };
    return this.request('GET', `/projects/${encodeURIComponent(String(args.projectId))}/documents`);
  }

  private async createProjectDocument(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.projectId || !args.url || !args.name) {
      return { content: [{ type: 'text', text: 'projectId, url, and name are required' }], isError: true };
    }
    return this.request('POST', `/projects/${encodeURIComponent(String(args.projectId))}/documents`, {
      url: args.url,
      name: args.name,
    });
  }

  private async deleteProjectDocument(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.projectId || !args.documentId) {
      return { content: [{ type: 'text', text: 'projectId and documentId are required' }], isError: true };
    }
    return this.request('DELETE', `/projects/${encodeURIComponent(String(args.projectId))}/documents/${encodeURIComponent(String(args.documentId))}`);
  }

  // ── Glossaries ─────────────────────────────────────────────────────────────

  private async getGlossaries(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.projectId) return { content: [{ type: 'text', text: 'projectId is required' }], isError: true };
    return this.request('GET', `/projects/${encodeURIComponent(String(args.projectId))}/glossaries`);
  }

  private async createGlossary(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.projectId || !args.url || !args.name) {
      return { content: [{ type: 'text', text: 'projectId, url, and name are required' }], isError: true };
    }
    return this.request('POST', `/projects/${encodeURIComponent(String(args.projectId))}/glossaries`, {
      url: args.url,
      name: args.name,
    });
  }

  private async deleteGlossary(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.projectId || !args.glossaryId) {
      return { content: [{ type: 'text', text: 'projectId and glossaryId are required' }], isError: true };
    }
    return this.request('DELETE', `/projects/${encodeURIComponent(String(args.projectId))}/glossaries/${encodeURIComponent(String(args.glossaryId))}`);
  }

  // ── Style Guides ───────────────────────────────────────────────────────────

  private async getStyleGuides(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.projectId) return { content: [{ type: 'text', text: 'projectId is required' }], isError: true };
    return this.request('GET', `/projects/${encodeURIComponent(String(args.projectId))}/styleguides`);
  }

  private async createStyleGuide(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.projectId || !args.url || !args.name) {
      return { content: [{ type: 'text', text: 'projectId, url, and name are required' }], isError: true };
    }
    return this.request('POST', `/projects/${encodeURIComponent(String(args.projectId))}/styleguides`, {
      url: args.url,
      name: args.name,
    });
  }

  private async deleteStyleGuide(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.projectId || !args.styleGuideId) {
      return { content: [{ type: 'text', text: 'projectId and styleGuideId are required' }], isError: true };
    }
    return this.request('DELETE', `/projects/${encodeURIComponent(String(args.projectId))}/styleguides/${encodeURIComponent(String(args.styleGuideId))}`);
  }
}

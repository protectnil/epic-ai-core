/**
 * Crowdin MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://store.crowdin.com/crowdin-mcp-server — transport: streamable-HTTP (hosted service), auth: Bearer Personal Access Token
//   Vendor-official (Crowdin); 200+ tools across role-based tool sets (project-manager, developer, translator, asset-manager, admin).
//   Actively maintained (hosted SaaS, no stale commits concern). Meets all 4 MCP criteria.
//   MCP covers all operations our REST adapter covers, plus many more (branches, labels, TM, reports, webhooks, builds, users, approvals).
// Our adapter covers: 20 tools (projects, files, strings, translations, languages, members, glossaries).
// Integration: use-both — MCP has 200+ tools including many not in our REST adapter; REST adapter provides fallback for air-gapped deployments.
// MCP-sourced tools (200+): branches, labels, translation memory, reports, webhooks, builds, approvals, screenshots, and all REST adapter tools.
// REST-sourced tools (20): list_projects, get_project, create_project, update_project, delete_project, list_project_files, get_file,
//   add_file, update_file, delete_file, list_strings, get_string, add_string, update_string, list_translations, get_translation,
//   list_languages, list_project_members, list_glossaries, get_glossary.
//
// Base URL: https://api.crowdin.com/api/v2  (Crowdin Cloud)
//           https://{organization}.api.crowdin.com/api/v2  (Crowdin Enterprise)
// Auth: Bearer token using a Personal Access Token from Crowdin Account Settings → API & SSO
// Docs: https://support.crowdin.com/developer/api/
// Rate limits: Not publicly documented; apply exponential backoff on 429 responses

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface CrowdinConfig {
  personalToken: string;
  baseUrl?: string;             // override for Crowdin Enterprise: https://{org}.api.crowdin.com/api/v2
}

export class CrowdinMCPServer extends MCPAdapterBase {
  private readonly personalToken: string;
  private readonly baseUrl: string;

  constructor(config: CrowdinConfig) {
    super();
    this.personalToken = config.personalToken;
    this.baseUrl = config.baseUrl || 'https://api.crowdin.com/api/v2';
  }

  static catalog() {
    return {
      name: 'crowdin',
      displayName: 'Crowdin',
      version: '1.0.0',
      category: 'misc',
      keywords: [
        'crowdin', 'localization', 'l10n', 'i18n', 'translation', 'internationalization',
        'language', 'project', 'file', 'string', 'glossary', 'translation memory',
        'branch', 'source file', 'target language', 'contributor', 'proofreading',
      ],
      toolNames: [
        'list_projects', 'get_project', 'create_project', 'update_project', 'delete_project',
        'list_project_files', 'get_file', 'add_file', 'update_file', 'delete_file',
        'list_strings', 'get_string', 'add_string', 'update_string',
        'list_translations', 'get_translation',
        'list_languages', 'list_project_members',
        'list_glossaries', 'get_glossary',
      ],
      description: 'Crowdin localization: manage translation projects, source files, strings, translations, glossaries, and project members.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_projects',
        description: 'List Crowdin translation projects accessible to the authenticated user with pagination',
        inputSchema: {
          type: 'object',
          properties: {
            has_manager_access: {
              type: 'boolean',
              description: 'Filter to only projects where the token owner has manager access (default: false)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of projects to return (max 500, default: 25)',
            },
            offset: {
              type: 'number',
              description: 'Pagination offset (default: 0)',
            },
          },
        },
      },
      {
        name: 'get_project',
        description: 'Retrieve full details for a Crowdin project by project ID, including languages and statistics',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: {
              type: 'number',
              description: 'Crowdin project ID',
            },
          },
          required: ['project_id'],
        },
      },
      {
        name: 'create_project',
        description: 'Create a new Crowdin localization project with source and target language configuration',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Project name',
            },
            source_language_id: {
              type: 'string',
              description: 'Source language code (e.g. en, fr, de)',
            },
            target_languages: {
              type: 'array',
              description: 'Array of target language codes (e.g. ["es", "de", "ja"])',
            },
            identifier: {
              type: 'string',
              description: 'Unique URL-friendly project identifier (default: derived from name)',
            },
            description: {
              type: 'string',
              description: 'Project description shown to translators',
            },
          },
          required: ['name', 'source_language_id'],
        },
      },
      {
        name: 'update_project',
        description: 'Update a Crowdin project name, description, or target language list by project ID',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: {
              type: 'number',
              description: 'Crowdin project ID to update',
            },
            name: {
              type: 'string',
              description: 'New project name',
            },
            description: {
              type: 'string',
              description: 'Updated project description',
            },
            target_languages: {
              type: 'array',
              description: 'Updated array of target language codes',
            },
          },
          required: ['project_id'],
        },
      },
      {
        name: 'delete_project',
        description: 'Permanently delete a Crowdin project and all its files, strings, and translations by project ID',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: {
              type: 'number',
              description: 'Crowdin project ID to delete (irreversible)',
            },
          },
          required: ['project_id'],
        },
      },
      {
        name: 'list_project_files',
        description: 'List source files in a Crowdin project with optional branch and directory filters',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: {
              type: 'number',
              description: 'Crowdin project ID',
            },
            branch_id: {
              type: 'number',
              description: 'Filter files by branch ID (optional)',
            },
            directory_id: {
              type: 'number',
              description: 'Filter files by parent directory ID (optional)',
            },
            limit: {
              type: 'number',
              description: 'Maximum results (max 500, default: 25)',
            },
            offset: {
              type: 'number',
              description: 'Pagination offset (default: 0)',
            },
          },
          required: ['project_id'],
        },
      },
      {
        name: 'get_file',
        description: 'Retrieve details for a specific source file by project and file ID, including string count and import status',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: {
              type: 'number',
              description: 'Crowdin project ID',
            },
            file_id: {
              type: 'number',
              description: 'Crowdin file ID',
            },
          },
          required: ['project_id', 'file_id'],
        },
      },
      {
        name: 'add_file',
        description: 'Add a new source file to a Crowdin project by referencing a pre-uploaded storage file',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: {
              type: 'number',
              description: 'Crowdin project ID to add the file to',
            },
            storage_id: {
              type: 'number',
              description: 'Storage ID of the uploaded file (obtain via Crowdin Storage API)',
            },
            name: {
              type: 'string',
              description: 'File name including extension (e.g. strings.json)',
            },
            branch_id: {
              type: 'number',
              description: 'Branch ID to add the file to (optional)',
            },
            directory_id: {
              type: 'number',
              description: 'Directory ID to place the file in (optional)',
            },
          },
          required: ['project_id', 'storage_id', 'name'],
        },
      },
      {
        name: 'update_file',
        description: 'Update the content of an existing source file in Crowdin using a new storage upload',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: {
              type: 'number',
              description: 'Crowdin project ID',
            },
            file_id: {
              type: 'number',
              description: 'File ID to update',
            },
            storage_id: {
              type: 'number',
              description: 'Storage ID of the new file content',
            },
          },
          required: ['project_id', 'file_id', 'storage_id'],
        },
      },
      {
        name: 'delete_file',
        description: 'Delete a source file from a Crowdin project by file ID, removing all associated translations',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: {
              type: 'number',
              description: 'Crowdin project ID',
            },
            file_id: {
              type: 'number',
              description: 'File ID to delete',
            },
          },
          required: ['project_id', 'file_id'],
        },
      },
      {
        name: 'list_strings',
        description: 'List source strings in a Crowdin project with optional file, language, and search filters',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: {
              type: 'number',
              description: 'Crowdin project ID',
            },
            file_id: {
              type: 'number',
              description: 'Filter strings by source file ID',
            },
            search: {
              type: 'string',
              description: 'Search term to filter strings by text or identifier',
            },
            limit: {
              type: 'number',
              description: 'Maximum results (max 500, default: 25)',
            },
            offset: {
              type: 'number',
              description: 'Pagination offset (default: 0)',
            },
          },
          required: ['project_id'],
        },
      },
      {
        name: 'get_string',
        description: 'Retrieve a specific source string by project and string ID with context and plural forms',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: {
              type: 'number',
              description: 'Crowdin project ID',
            },
            string_id: {
              type: 'number',
              description: 'Crowdin string ID',
            },
          },
          required: ['project_id', 'string_id'],
        },
      },
      {
        name: 'add_string',
        description: 'Add a new source string to a Crowdin project file with an identifier and optional context',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: {
              type: 'number',
              description: 'Crowdin project ID',
            },
            file_id: {
              type: 'number',
              description: 'File ID to add the string to',
            },
            identifier: {
              type: 'string',
              description: 'String key or identifier (unique within the file)',
            },
            text: {
              type: 'string',
              description: 'Source text content of the string',
            },
            context: {
              type: 'string',
              description: 'Translator context or description explaining where/how the string is used',
            },
            is_hidden: {
              type: 'boolean',
              description: 'Hide the string from translators (default: false)',
            },
          },
          required: ['project_id', 'file_id', 'identifier', 'text'],
        },
      },
      {
        name: 'update_string',
        description: 'Update source string text, context, or visibility by project and string ID',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: {
              type: 'number',
              description: 'Crowdin project ID',
            },
            string_id: {
              type: 'number',
              description: 'String ID to update',
            },
            text: {
              type: 'string',
              description: 'New source text for the string',
            },
            context: {
              type: 'string',
              description: 'Updated translator context',
            },
            is_hidden: {
              type: 'boolean',
              description: 'Show or hide the string from translators',
            },
          },
          required: ['project_id', 'string_id'],
        },
      },
      {
        name: 'list_translations',
        description: 'List approved and pending translations for a project language with optional string and file filters',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: {
              type: 'number',
              description: 'Crowdin project ID',
            },
            language_id: {
              type: 'string',
              description: 'Target language code to list translations for (e.g. es, de, ja)',
            },
            string_id: {
              type: 'number',
              description: 'Filter translations for a specific string ID',
            },
            limit: {
              type: 'number',
              description: 'Maximum results (max 500, default: 25)',
            },
            offset: {
              type: 'number',
              description: 'Pagination offset (default: 0)',
            },
          },
          required: ['project_id', 'language_id'],
        },
      },
      {
        name: 'get_translation',
        description: 'Retrieve a specific translation by project and translation ID with approval status and contributor',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: {
              type: 'number',
              description: 'Crowdin project ID',
            },
            translation_id: {
              type: 'number',
              description: 'Crowdin translation ID',
            },
          },
          required: ['project_id', 'translation_id'],
        },
      },
      {
        name: 'list_languages',
        description: 'List all languages supported by Crowdin with their language codes and display names',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum results (max 500, default: 100)',
            },
            offset: {
              type: 'number',
              description: 'Pagination offset (default: 0)',
            },
          },
        },
      },
      {
        name: 'list_project_members',
        description: 'List members and their roles in a Crowdin project including translators and managers',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: {
              type: 'number',
              description: 'Crowdin project ID',
            },
            role: {
              type: 'string',
              description: 'Filter by role: all, manager, developer, translator, proofreader, blocked (default: all)',
            },
            limit: {
              type: 'number',
              description: 'Maximum results (max 500, default: 25)',
            },
            offset: {
              type: 'number',
              description: 'Pagination offset (default: 0)',
            },
          },
          required: ['project_id'],
        },
      },
      {
        name: 'list_glossaries',
        description: 'List glossaries available in the Crowdin account for terminology management',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum results (max 500, default: 25)',
            },
            offset: {
              type: 'number',
              description: 'Pagination offset (default: 0)',
            },
          },
        },
      },
      {
        name: 'get_glossary',
        description: 'Retrieve a specific glossary by ID with term count and language coverage details',
        inputSchema: {
          type: 'object',
          properties: {
            glossary_id: {
              type: 'number',
              description: 'Crowdin glossary ID',
            },
          },
          required: ['glossary_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_projects':
          return this.listProjects(args);
        case 'get_project':
          return this.getProject(args);
        case 'create_project':
          return this.createProject(args);
        case 'update_project':
          return this.updateProject(args);
        case 'delete_project':
          return this.deleteProject(args);
        case 'list_project_files':
          return this.listProjectFiles(args);
        case 'get_file':
          return this.getFile(args);
        case 'add_file':
          return this.addFile(args);
        case 'update_file':
          return this.updateFile(args);
        case 'delete_file':
          return this.deleteFile(args);
        case 'list_strings':
          return this.listStrings(args);
        case 'get_string':
          return this.getString(args);
        case 'add_string':
          return this.addString(args);
        case 'update_string':
          return this.updateString(args);
        case 'list_translations':
          return this.listTranslations(args);
        case 'get_translation':
          return this.getTranslation(args);
        case 'list_languages':
          return this.listLanguages(args);
        case 'list_project_members':
          return this.listProjectMembers(args);
        case 'list_glossaries':
          return this.listGlossaries(args);
        case 'get_glossary':
          return this.getGlossary(args);
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

  // --- Helpers ---

  private get authHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.personalToken}`,
      'Content-Type': 'application/json',
    };
  }

  private async crowdinGet(path: string, params: Record<string, string> = {}): Promise<ToolResult> {
    const qs = new URLSearchParams(params).toString();
    const url = `${this.baseUrl}${path}${qs ? '?' + qs : ''}`;
    const response = await this.fetchWithRetry(url, { method: 'GET', headers: this.authHeaders });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async crowdinPost(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.authHeaders,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async crowdinPatch(path: string, ops: Array<{ op: string; path: string; value: unknown }>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'PATCH',
      headers: this.authHeaders,
      body: JSON.stringify(ops),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async crowdinDelete(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'DELETE',
      headers: this.authHeaders,
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: JSON.stringify({ deleted: true }) }], isError: false };
  }

  // --- Tool implementations ---

  private async listProjects(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      limit: String((args.limit as number) ?? 25),
      offset: String((args.offset as number) ?? 0),
    };
    if (typeof args.has_manager_access === 'boolean') params.hasManagerAccess = String(args.has_manager_access ? 1 : 0);
    return this.crowdinGet('/projects', params);
  }

  private async getProject(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.project_id) return { content: [{ type: 'text', text: 'project_id is required' }], isError: true };
    return this.crowdinGet(`/projects/${encodeURIComponent(args.project_id as number)}`);
  }

  private async createProject(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name || !args.source_language_id) return { content: [{ type: 'text', text: 'name and source_language_id are required' }], isError: true };
    const body: Record<string, unknown> = {
      name: args.name,
      sourceLanguageId: args.source_language_id,
    };
    if (args.target_languages) body.targetLanguageIds = args.target_languages;
    if (args.identifier) body.identifier = args.identifier;
    if (args.description) body.description = args.description;
    return this.crowdinPost('/projects', body);
  }

  private async updateProject(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.project_id) return { content: [{ type: 'text', text: 'project_id is required' }], isError: true };
    const ops: Array<{ op: string; path: string; value: unknown }> = [];
    if (args.name) ops.push({ op: 'replace', path: '/name', value: args.name });
    if (args.description) ops.push({ op: 'replace', path: '/description', value: args.description });
    if (args.target_languages) ops.push({ op: 'replace', path: '/targetLanguageIds', value: args.target_languages });
    if (ops.length === 0) return { content: [{ type: 'text', text: 'At least one field to update is required' }], isError: true };
    return this.crowdinPatch(`/projects/${encodeURIComponent(args.project_id as number)}`, ops);
  }

  private async deleteProject(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.project_id) return { content: [{ type: 'text', text: 'project_id is required' }], isError: true };
    return this.crowdinDelete(`/projects/${encodeURIComponent(args.project_id as number)}`);
  }

  private async listProjectFiles(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.project_id) return { content: [{ type: 'text', text: 'project_id is required' }], isError: true };
    const params: Record<string, string> = {
      limit: String((args.limit as number) ?? 25),
      offset: String((args.offset as number) ?? 0),
    };
    if (args.branch_id) params.branchId = String(args.branch_id);
    if (args.directory_id) params.directoryId = String(args.directory_id);
    return this.crowdinGet(`/projects/${encodeURIComponent(args.project_id as number)}/files`, params);
  }

  private async getFile(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.project_id || !args.file_id) return { content: [{ type: 'text', text: 'project_id and file_id are required' }], isError: true };
    return this.crowdinGet(`/projects/${encodeURIComponent(args.project_id as number)}/files/${encodeURIComponent(args.file_id as number)}`);
  }

  private async addFile(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.project_id || !args.storage_id || !args.name) {
      return { content: [{ type: 'text', text: 'project_id, storage_id, and name are required' }], isError: true };
    }
    const body: Record<string, unknown> = { storageId: args.storage_id, name: args.name };
    if (args.branch_id) body.branchId = args.branch_id;
    if (args.directory_id) body.directoryId = args.directory_id;
    return this.crowdinPost(`/projects/${encodeURIComponent(args.project_id as number)}/files`, body);
  }

  private async updateFile(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.project_id || !args.file_id || !args.storage_id) {
      return { content: [{ type: 'text', text: 'project_id, file_id, and storage_id are required' }], isError: true };
    }
    return this.crowdinPatch(`/projects/${encodeURIComponent(args.project_id as number)}/files/${encodeURIComponent(args.file_id as number)}`, [
      { op: 'replace', path: '/storageId', value: args.storage_id },
    ]);
  }

  private async deleteFile(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.project_id || !args.file_id) return { content: [{ type: 'text', text: 'project_id and file_id are required' }], isError: true };
    return this.crowdinDelete(`/projects/${encodeURIComponent(args.project_id as number)}/files/${encodeURIComponent(args.file_id as number)}`);
  }

  private async listStrings(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.project_id) return { content: [{ type: 'text', text: 'project_id is required' }], isError: true };
    const params: Record<string, string> = {
      limit: String((args.limit as number) ?? 25),
      offset: String((args.offset as number) ?? 0),
    };
    if (args.file_id) params.fileId = String(args.file_id);
    if (args.search) params.filter = args.search as string;
    return this.crowdinGet(`/projects/${encodeURIComponent(args.project_id as number)}/strings`, params);
  }

  private async getString(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.project_id || !args.string_id) return { content: [{ type: 'text', text: 'project_id and string_id are required' }], isError: true };
    return this.crowdinGet(`/projects/${encodeURIComponent(args.project_id as number)}/strings/${encodeURIComponent(args.string_id as number)}`);
  }

  private async addString(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.project_id || !args.file_id || !args.identifier || !args.text) {
      return { content: [{ type: 'text', text: 'project_id, file_id, identifier, and text are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      fileId: args.file_id,
      identifier: args.identifier,
      text: args.text,
    };
    if (args.context) body.context = args.context;
    if (typeof args.is_hidden === 'boolean') body.isHidden = args.is_hidden;
    return this.crowdinPost(`/projects/${encodeURIComponent(args.project_id as number)}/strings`, body);
  }

  private async updateString(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.project_id || !args.string_id) return { content: [{ type: 'text', text: 'project_id and string_id are required' }], isError: true };
    const ops: Array<{ op: string; path: string; value: unknown }> = [];
    if (args.text) ops.push({ op: 'replace', path: '/text', value: args.text });
    if (args.context) ops.push({ op: 'replace', path: '/context', value: args.context });
    if (typeof args.is_hidden === 'boolean') ops.push({ op: 'replace', path: '/isHidden', value: args.is_hidden });
    if (ops.length === 0) return { content: [{ type: 'text', text: 'At least one field to update is required' }], isError: true };
    return this.crowdinPatch(`/projects/${encodeURIComponent(args.project_id as number)}/strings/${encodeURIComponent(args.string_id as number)}`, ops);
  }

  private async listTranslations(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.project_id || !args.language_id) return { content: [{ type: 'text', text: 'project_id and language_id are required' }], isError: true };
    const params: Record<string, string> = {
      limit: String((args.limit as number) ?? 25),
      offset: String((args.offset as number) ?? 0),
    };
    if (args.string_id) params.stringId = String(args.string_id);
    return this.crowdinGet(`/projects/${encodeURIComponent(args.project_id as number)}/languages/${encodeURIComponent(args.language_id as string)}/translations`, params);
  }

  private async getTranslation(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.project_id || !args.translation_id) return { content: [{ type: 'text', text: 'project_id and translation_id are required' }], isError: true };
    return this.crowdinGet(`/projects/${encodeURIComponent(args.project_id as number)}/translations/${encodeURIComponent(args.translation_id as number)}`);
  }

  private async listLanguages(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      limit: String((args.limit as number) ?? 100),
      offset: String((args.offset as number) ?? 0),
    };
    return this.crowdinGet('/languages', params);
  }

  private async listProjectMembers(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.project_id) return { content: [{ type: 'text', text: 'project_id is required' }], isError: true };
    const params: Record<string, string> = {
      limit: String((args.limit as number) ?? 25),
      offset: String((args.offset as number) ?? 0),
    };
    if (args.role && args.role !== 'all') params.role = args.role as string;
    return this.crowdinGet(`/projects/${encodeURIComponent(args.project_id as number)}/members`, params);
  }

  private async listGlossaries(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      limit: String((args.limit as number) ?? 25),
      offset: String((args.offset as number) ?? 0),
    };
    return this.crowdinGet('/glossaries', params);
  }

  private async getGlossary(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.glossary_id) return { content: [{ type: 'text', text: 'glossary_id is required' }], isError: true };
    return this.crowdinGet(`/glossaries/${encodeURIComponent(args.glossary_id as number)}`);
  }
}

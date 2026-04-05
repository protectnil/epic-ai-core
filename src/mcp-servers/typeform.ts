/**
 * Typeform MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// No official Typeform MCP server was found on GitHub. A community server exists at
// github.com/dscovr/typeform-mcp but is not maintained by Typeform and covers limited
// operations. Typeform uses MCP internally for their design system only.
//
// Base URL: https://api.typeform.com
// Auth: Bearer token — Authorization: Bearer {personal_access_token}
//       Tokens created at: https://admin.typeform.com/account#/section/tokens
// Docs: https://www.typeform.com/developers/get-started/
// Rate limits: Not publicly documented; implement exponential backoff on 429 responses.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface TypeformConfig {
  accessToken: string;
  baseUrl?: string;
}

export class TypeformMCPServer extends MCPAdapterBase {
  private readonly accessToken: string;
  private readonly baseUrl: string;

  constructor(config: TypeformConfig) {
    super();
    this.accessToken = config.accessToken;
    this.baseUrl = config.baseUrl || 'https://api.typeform.com';
  }

  static catalog() {
    return {
      name: 'typeform',
      displayName: 'Typeform',
      version: '1.0.0',
      category: 'misc',
      keywords: [
        'typeform', 'forms', 'surveys', 'questionnaires', 'responses',
        'form builder', 'data collection', 'lead generation', 'quizzes',
        'webhooks', 'workspaces', 'insights', 'NPS',
      ],
      toolNames: [
        'list_forms',
        'get_form',
        'create_form',
        'update_form',
        'delete_form',
        'get_responses',
        'delete_responses',
        'get_form_insights',
        'list_workspaces',
        'get_workspace',
        'create_workspace',
        'update_workspace',
        'delete_workspace',
        'list_webhooks',
        'get_webhook',
        'create_webhook',
        'update_webhook',
        'delete_webhook',
        'list_themes',
        'get_theme',
      ],
      description: 'Typeform form and survey platform: create and manage forms, retrieve responses, configure webhooks, manage workspaces, and access form analytics and insights.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_forms',
        description: 'List all forms in the account or a specific workspace with optional search and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            workspace_id: {
              type: 'string',
              description: 'Filter forms by workspace ID (optional — returns all forms if omitted)',
            },
            search: {
              type: 'string',
              description: 'Search term to filter forms by title',
            },
            page: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
            page_size: {
              type: 'number',
              description: 'Results per page (default: 10, max: 200)',
            },
          },
        },
      },
      {
        name: 'get_form',
        description: 'Get the full structure of a specific form including fields, logic, settings, and theme by form ID',
        inputSchema: {
          type: 'object',
          properties: {
            form_id: {
              type: 'string',
              description: 'Typeform form ID (e.g. abc123XY)',
            },
          },
          required: ['form_id'],
        },
      },
      {
        name: 'create_form',
        description: 'Create a new Typeform with a title and optional fields, settings, and theme',
        inputSchema: {
          type: 'object',
          properties: {
            title: {
              type: 'string',
              description: 'Display title for the new form',
            },
            workspace_id: {
              type: 'string',
              description: 'Workspace ID to create the form in (defaults to personal workspace)',
            },
            fields: {
              type: 'string',
              description: 'JSON array string of field objects defining form questions (optional)',
            },
            settings: {
              type: 'string',
              description: 'JSON object string of form settings (language, progress_bar, etc.) — optional',
            },
          },
          required: ['title'],
        },
      },
      {
        name: 'update_form',
        description: 'Update an existing form title, fields, settings, or theme. Uses PATCH — only provided fields are updated.',
        inputSchema: {
          type: 'object',
          properties: {
            form_id: {
              type: 'string',
              description: 'Form ID to update',
            },
            title: {
              type: 'string',
              description: 'Updated form title',
            },
            fields: {
              type: 'string',
              description: 'Updated JSON array string of field objects',
            },
            settings: {
              type: 'string',
              description: 'Updated JSON object string of form settings',
            },
          },
          required: ['form_id'],
        },
      },
      {
        name: 'delete_form',
        description: 'Delete a form and all its responses permanently. This action is irreversible.',
        inputSchema: {
          type: 'object',
          properties: {
            form_id: {
              type: 'string',
              description: 'Form ID to delete',
            },
          },
          required: ['form_id'],
        },
      },
      {
        name: 'get_responses',
        description: 'Retrieve form responses with optional date range, completion status, and pagination filters',
        inputSchema: {
          type: 'object',
          properties: {
            form_id: {
              type: 'string',
              description: 'Form ID to retrieve responses for',
            },
            page_size: {
              type: 'number',
              description: 'Number of responses per page (default: 25, max: 1000)',
            },
            since: {
              type: 'string',
              description: 'Return responses submitted after this datetime in ISO 8601 format (e.g. 2026-01-01T00:00:00)',
            },
            until: {
              type: 'string',
              description: 'Return responses submitted before this datetime in ISO 8601 format',
            },
            after: {
              type: 'string',
              description: 'Pagination cursor — return responses after this response token',
            },
            completed: {
              type: 'boolean',
              description: 'Filter by completion: true (completed only), false (partial only) — default: all',
            },
            sort: {
              type: 'string',
              description: 'Sort order: submitted_at,desc or submitted_at,asc (default: submitted_at,desc)',
            },
            query: {
              type: 'string',
              description: 'Full-text search string to filter responses by answer content',
            },
            fields: {
              type: 'string',
              description: 'Comma-separated field IDs to include in responses (optional)',
            },
          },
          required: ['form_id'],
        },
      },
      {
        name: 'delete_responses',
        description: 'Delete specific response records from a form by response token IDs. Irreversible.',
        inputSchema: {
          type: 'object',
          properties: {
            form_id: {
              type: 'string',
              description: 'Form ID to delete responses from',
            },
            included_tokens: {
              type: 'string',
              description: 'Comma-separated response token IDs to delete',
            },
          },
          required: ['form_id', 'included_tokens'],
        },
      },
      {
        name: 'get_form_insights',
        description: 'Get aggregated analytics for a form including completion rate, drop-off rate, and average completion time',
        inputSchema: {
          type: 'object',
          properties: {
            form_id: {
              type: 'string',
              description: 'Form ID to retrieve insights for',
            },
          },
          required: ['form_id'],
        },
      },
      {
        name: 'list_workspaces',
        description: 'List all workspaces in the account with member counts and form counts',
        inputSchema: {
          type: 'object',
          properties: {
            page: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
            page_size: {
              type: 'number',
              description: 'Results per page (default: 10)',
            },
            search: {
              type: 'string',
              description: 'Search term to filter workspaces by name',
            },
          },
        },
      },
      {
        name: 'get_workspace',
        description: 'Get details for a specific workspace by workspace ID, including members and shared forms',
        inputSchema: {
          type: 'object',
          properties: {
            workspace_id: {
              type: 'string',
              description: 'Workspace ID to retrieve',
            },
          },
          required: ['workspace_id'],
        },
      },
      {
        name: 'create_workspace',
        description: 'Create a new workspace to organize forms and team collaboration',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Display name for the new workspace',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'update_workspace',
        description: 'Update a workspace name using Typeform\'s JSON Patch format. Only name updates are supported via this tool.',
        inputSchema: {
          type: 'object',
          properties: {
            workspace_id: {
              type: 'string',
              description: 'Workspace ID to update',
            },
            name: {
              type: 'string',
              description: 'New workspace display name to replace the current name',
            },
          },
          required: ['workspace_id', 'name'],
        },
      },
      {
        name: 'delete_workspace',
        description: 'Delete a workspace permanently. Forms in the workspace will be moved to the personal workspace.',
        inputSchema: {
          type: 'object',
          properties: {
            workspace_id: {
              type: 'string',
              description: 'Workspace ID to delete',
            },
          },
          required: ['workspace_id'],
        },
      },
      {
        name: 'list_webhooks',
        description: 'List all webhooks configured for a specific form',
        inputSchema: {
          type: 'object',
          properties: {
            form_id: {
              type: 'string',
              description: 'Form ID to list webhooks for',
            },
          },
          required: ['form_id'],
        },
      },
      {
        name: 'get_webhook',
        description: 'Get configuration details for a specific webhook by form ID and webhook tag',
        inputSchema: {
          type: 'object',
          properties: {
            form_id: {
              type: 'string',
              description: 'Form ID that owns the webhook',
            },
            tag: {
              type: 'string',
              description: 'Webhook tag (unique identifier within the form)',
            },
          },
          required: ['form_id', 'tag'],
        },
      },
      {
        name: 'create_webhook',
        description: 'Create a webhook on a form to receive real-time POST notifications on new response submissions',
        inputSchema: {
          type: 'object',
          properties: {
            form_id: {
              type: 'string',
              description: 'Form ID to attach the webhook to',
            },
            tag: {
              type: 'string',
              description: 'Unique tag identifier for this webhook within the form',
            },
            url: {
              type: 'string',
              description: 'Destination URL that will receive POST notifications',
            },
            enabled: {
              type: 'boolean',
              description: 'Whether the webhook is active (default: true)',
            },
            secret: {
              type: 'string',
              description: 'HMAC secret for verifying webhook payloads (optional but recommended)',
            },
          },
          required: ['form_id', 'tag', 'url'],
        },
      },
      {
        name: 'update_webhook',
        description: 'Update a webhook URL, enabled status, or secret key',
        inputSchema: {
          type: 'object',
          properties: {
            form_id: {
              type: 'string',
              description: 'Form ID that owns the webhook',
            },
            tag: {
              type: 'string',
              description: 'Webhook tag to update',
            },
            url: {
              type: 'string',
              description: 'Updated destination URL',
            },
            enabled: {
              type: 'boolean',
              description: 'Enable or disable the webhook',
            },
            secret: {
              type: 'string',
              description: 'Updated HMAC secret',
            },
          },
          required: ['form_id', 'tag'],
        },
      },
      {
        name: 'delete_webhook',
        description: 'Delete a webhook from a form permanently',
        inputSchema: {
          type: 'object',
          properties: {
            form_id: {
              type: 'string',
              description: 'Form ID that owns the webhook',
            },
            tag: {
              type: 'string',
              description: 'Webhook tag to delete',
            },
          },
          required: ['form_id', 'tag'],
        },
      },
      {
        name: 'list_themes',
        description: 'List all themes available in the Typeform account for styling forms',
        inputSchema: {
          type: 'object',
          properties: {
            page: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
            page_size: {
              type: 'number',
              description: 'Results per page (default: 10)',
            },
          },
        },
      },
      {
        name: 'get_theme',
        description: 'Get color, font, and background configuration for a specific theme by theme ID',
        inputSchema: {
          type: 'object',
          properties: {
            theme_id: {
              type: 'string',
              description: 'Theme ID to retrieve',
            },
          },
          required: ['theme_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_forms':
          return this.listForms(args);
        case 'get_form':
          return this.getForm(args);
        case 'create_form':
          return this.createForm(args);
        case 'update_form':
          return this.updateForm(args);
        case 'delete_form':
          return this.deleteForm(args);
        case 'get_responses':
          return this.getResponses(args);
        case 'delete_responses':
          return this.deleteResponses(args);
        case 'get_form_insights':
          return this.getFormInsights(args);
        case 'list_workspaces':
          return this.listWorkspaces(args);
        case 'get_workspace':
          return this.getWorkspace(args);
        case 'create_workspace':
          return this.createWorkspace(args);
        case 'update_workspace':
          return this.updateWorkspace(args);
        case 'delete_workspace':
          return this.deleteWorkspace(args);
        case 'list_webhooks':
          return this.listWebhooks(args);
        case 'get_webhook':
          return this.getWebhook(args);
        case 'create_webhook':
          return this.createWebhook(args);
        case 'update_webhook':
          return this.updateWebhook(args);
        case 'delete_webhook':
          return this.deleteWebhook(args);
        case 'list_themes':
          return this.listThemes(args);
        case 'get_theme':
          return this.getTheme(args);
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

  private get headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
    };
  }

  private async tfGet(path: string, params: Record<string, string> = {}): Promise<ToolResult> {
    const qs = new URLSearchParams(params).toString();
    const url = `${this.baseUrl}${path}${qs ? '?' + qs : ''}`;
    const response = await this.fetchWithRetry(url, { headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async tfPost(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async tfPatch(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'PATCH',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async tfPut(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'PUT',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async tfDelete(path: string, params: Record<string, string> = {}): Promise<ToolResult> {
    const qs = new URLSearchParams(params).toString();
    const url = `${this.baseUrl}${path}${qs ? '?' + qs : ''}`;
    const response = await this.fetchWithRetry(url, { method: 'DELETE', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: JSON.stringify({ deleted: true }) }], isError: false };
  }


  private async listForms(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      page: String((args.page as number) ?? 1),
      page_size: String((args.page_size as number) ?? 10),
    };
    if (args.workspace_id) params.workspace_id = args.workspace_id as string;
    if (args.search) params.search = args.search as string;
    return this.tfGet('/forms', params);
  }

  private async getForm(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.form_id) return { content: [{ type: 'text', text: 'form_id is required' }], isError: true };
    return this.tfGet(`/forms/${encodeURIComponent(args.form_id as string)}`);
  }

  private async createForm(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.title) return { content: [{ type: 'text', text: 'title is required' }], isError: true };
    const body: Record<string, unknown> = { title: args.title };
    if (args.workspace_id) body.workspace = { href: `${this.baseUrl}/workspaces/${encodeURIComponent(args.workspace_id as string)}` };
    if (args.fields) {
      try { body.fields = JSON.parse(args.fields as string); } catch { return { content: [{ type: 'text', text: 'fields must be a valid JSON array string' }], isError: true }; }
    }
    if (args.settings) {
      try { body.settings = JSON.parse(args.settings as string); } catch { return { content: [{ type: 'text', text: 'settings must be a valid JSON object string' }], isError: true }; }
    }
    return this.tfPost('/forms', body);
  }

  private async updateForm(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.form_id) return { content: [{ type: 'text', text: 'form_id is required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.title) body.title = args.title;
    if (args.fields) {
      try { body.fields = JSON.parse(args.fields as string); } catch { return { content: [{ type: 'text', text: 'fields must be a valid JSON array string' }], isError: true }; }
    }
    if (args.settings) {
      try { body.settings = JSON.parse(args.settings as string); } catch { return { content: [{ type: 'text', text: 'settings must be a valid JSON object string' }], isError: true }; }
    }
    return this.tfPatch(`/forms/${encodeURIComponent(args.form_id as string)}`, body);
  }

  private async deleteForm(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.form_id) return { content: [{ type: 'text', text: 'form_id is required' }], isError: true };
    return this.tfDelete(`/forms/${encodeURIComponent(args.form_id as string)}`);
  }

  private async getResponses(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.form_id) return { content: [{ type: 'text', text: 'form_id is required' }], isError: true };
    const params: Record<string, string> = {
      page_size: String((args.page_size as number) ?? 25),
    };
    if (args.since) params.since = args.since as string;
    if (args.until) params.until = args.until as string;
    if (args.after) params.after = args.after as string;
    if (typeof args.completed === 'boolean') params.completed = String(args.completed);
    if (args.sort) params.sort = args.sort as string;
    if (args.query) params.query = args.query as string;
    if (args.fields) params.fields = args.fields as string;
    return this.tfGet(`/forms/${encodeURIComponent(args.form_id as string)}/responses`, params);
  }

  private async deleteResponses(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.form_id || !args.included_tokens) return { content: [{ type: 'text', text: 'form_id and included_tokens are required' }], isError: true };
    return this.tfDelete(`/forms/${encodeURIComponent(args.form_id as string)}/responses`, { included_tokens: args.included_tokens as string });
  }

  private async getFormInsights(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.form_id) return { content: [{ type: 'text', text: 'form_id is required' }], isError: true };
    return this.tfGet(`/insights/${encodeURIComponent(args.form_id as string)}/summary`);
  }

  private async listWorkspaces(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      page: String((args.page as number) ?? 1),
      page_size: String((args.page_size as number) ?? 10),
    };
    if (args.search) params.search = args.search as string;
    return this.tfGet('/workspaces', params);
  }

  private async getWorkspace(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.workspace_id) return { content: [{ type: 'text', text: 'workspace_id is required' }], isError: true };
    return this.tfGet(`/workspaces/${encodeURIComponent(args.workspace_id as string)}`);
  }

  private async createWorkspace(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name) return { content: [{ type: 'text', text: 'name is required' }], isError: true };
    return this.tfPost('/workspaces', { name: args.name });
  }

  private async updateWorkspace(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.workspace_id) return { content: [{ type: 'text', text: 'workspace_id is required' }], isError: true };
    // Typeform workspace PATCH uses JSON Patch format: array of {op, path, value} operations
    const ops: Array<Record<string, unknown>> = [];
    if (args.name) ops.push({ op: 'replace', path: '/name', value: args.name });
    if (ops.length === 0) return { content: [{ type: 'text', text: 'At least one field to update is required (name)' }], isError: true };
    const url = `${this.baseUrl}/workspaces/${encodeURIComponent(args.workspace_id as string)}`;
    const response = await this.fetchWithRetry(url, { method: 'PATCH', headers: this.headers, body: JSON.stringify(ops) });
    if (!response.ok) return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async deleteWorkspace(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.workspace_id) return { content: [{ type: 'text', text: 'workspace_id is required' }], isError: true };
    return this.tfDelete(`/workspaces/${encodeURIComponent(args.workspace_id as string)}`);
  }

  private async listWebhooks(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.form_id) return { content: [{ type: 'text', text: 'form_id is required' }], isError: true };
    return this.tfGet(`/forms/${encodeURIComponent(args.form_id as string)}/webhooks`);
  }

  private async getWebhook(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.form_id || !args.tag) return { content: [{ type: 'text', text: 'form_id and tag are required' }], isError: true };
    return this.tfGet(`/forms/${encodeURIComponent(args.form_id as string)}/webhooks/${encodeURIComponent(args.tag as string)}`);
  }

  private async createWebhook(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.form_id || !args.tag || !args.url) return { content: [{ type: 'text', text: 'form_id, tag, and url are required' }], isError: true };
    const body: Record<string, unknown> = {
      url: args.url,
      enabled: (args.enabled as boolean) ?? true,
    };
    if (args.secret) body.secret = args.secret;
    return this.tfPut(`/forms/${encodeURIComponent(args.form_id as string)}/webhooks/${encodeURIComponent(args.tag as string)}`, body);
  }

  private async updateWebhook(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.form_id || !args.tag) return { content: [{ type: 'text', text: 'form_id and tag are required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.url) body.url = args.url;
    if (typeof args.enabled === 'boolean') body.enabled = args.enabled;
    if (args.secret) body.secret = args.secret;
    return this.tfPut(`/forms/${encodeURIComponent(args.form_id as string)}/webhooks/${encodeURIComponent(args.tag as string)}`, body);
  }

  private async deleteWebhook(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.form_id || !args.tag) return { content: [{ type: 'text', text: 'form_id and tag are required' }], isError: true };
    return this.tfDelete(`/forms/${encodeURIComponent(args.form_id as string)}/webhooks/${encodeURIComponent(args.tag as string)}`);
  }

  private async listThemes(args: Record<string, unknown>): Promise<ToolResult> {
    return this.tfGet('/themes', {
      page: String((args.page as number) ?? 1),
      page_size: String((args.page_size as number) ?? 10),
    });
  }

  private async getTheme(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.theme_id) return { content: [{ type: 'text', text: 'theme_id is required' }], isError: true };
    return this.tfGet(`/themes/${encodeURIComponent(args.theme_id as string)}`);
  }
}

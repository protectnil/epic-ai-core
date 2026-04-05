/**
 * Wrike MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://developers.wrike.com/wrike-mcp/ — Wrike ships a hosted OAuth MCP server
//   (no self-hosting option). Transport: streamable-HTTP. Auth: OAuth2 (PKCE).
//   Tool count: not publicly disclosed. Requires Wrike Enterprise account.
// Our adapter covers 15 tools (full API surface). Use this adapter for personal API token auth,
//   air-gapped deployments, or when OAuth PKCE flow is not available.
//
// Base URL (US): https://www.wrike.com/api/v4
// Base URL (EU): https://app-eu.wrike.com/api/v4
// Auth: Bearer token — Authorization: bearer <token> (lowercase "bearer" per Wrike spec)
//   Permanent token: Wrike Profile > Apps & Integrations > API
//   OAuth token: the correct base URL is returned as the "host" field in the token response.
// Docs: https://developers.wrike.com/api/v4/
// Rate limits: 100 req/min per access token (Enterprise: higher limits by plan)

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface WrikeConfig {
  /**
   * Wrike permanent API token or OAuth2 access token.
   * Obtain a permanent token: Wrike Profile > Apps & Integrations > API.
   */
  apiToken: string;
  /**
   * Base URL for the Wrike API.
   * US (default): https://www.wrike.com/api/v4
   * EU data residency: https://app-eu.wrike.com/api/v4
   * For OAuth, use the "host" field from the token response.
   */
  baseUrl?: string;
}

export class WrikeMCPServer extends MCPAdapterBase {
  private readonly apiToken: string;
  private readonly baseUrl: string;

  constructor(config: WrikeConfig) {
    super();
    this.apiToken = config.apiToken;
    this.baseUrl = (config.baseUrl ?? 'https://www.wrike.com/api/v4').replace(/\/$/, '');
  }

  static catalog() {
    return {
      name: 'wrike',
      displayName: 'Wrike',
      version: '1.0.0',
      category: 'misc' as const,
      keywords: ['wrike', 'project-management', 'task', 'folder', 'project', 'space', 'timelog', 'comment', 'workflow', 'attachment'],
      toolNames: [
        'get_contacts', 'list_spaces', 'get_folders', 'get_tasks', 'get_task',
        'create_task', 'update_task', 'delete_task',
        'get_comments', 'create_comment', 'update_comment',
        'list_timelogs', 'create_timelog',
        'list_workflows', 'get_attachments',
      ],
      description: 'Project and task management: create, update, and list tasks, folders, spaces, comments, timelogs, workflows, and attachments.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'get_contacts',
        description: 'Retrieve all contacts (users and groups) in the Wrike account, or just the current user if me=true',
        inputSchema: {
          type: 'object',
          properties: {
            me: { type: 'boolean', description: 'If true, return only the current user\'s contact (default: false)' },
          },
        },
      },
      {
        name: 'list_spaces',
        description: 'List all spaces in the Wrike account with title, description, and member count',
        inputSchema: {
          type: 'object',
          properties: {
            withArchived: { type: 'boolean', description: 'Include archived spaces (default: false)' },
          },
        },
      },
      {
        name: 'get_folders',
        description: 'Retrieve the folder tree for a Wrike account or a specific space',
        inputSchema: {
          type: 'object',
          properties: {
            spaceId: { type: 'string', description: 'Space ID to list folders within (optional — omit for root tree)' },
          },
        },
      },
      {
        name: 'get_tasks',
        description: 'Retrieve tasks from a Wrike folder or project with optional filters for status, importance, and date range',
        inputSchema: {
          type: 'object',
          properties: {
            folderId: { type: 'string', description: 'Folder or project ID to list tasks from' },
            status: { type: 'string', description: 'Filter by status: Active, Completed, Deferred, or Cancelled (optional)' },
            importance: { type: 'string', description: 'Filter by importance: High, Normal, or Low (optional)' },
            startDate: { type: 'string', description: 'Filter tasks starting on or after this date (YYYY-MM-DD) (optional)' },
            dueDate: { type: 'string', description: 'Filter tasks due on or before this date (YYYY-MM-DD) (optional)' },
            subTasks: { type: 'boolean', description: 'Include subtasks in results (default: false)' },
            limit: { type: 'number', description: 'Maximum tasks to return (max: 1000, default: 100)' },
            nextPageToken: { type: 'string', description: 'Pagination token from a previous response (optional)' },
          },
          required: ['folderId'],
        },
      },
      {
        name: 'get_task',
        description: 'Retrieve full details for a single Wrike task by task ID including description, assignees, and dates',
        inputSchema: {
          type: 'object',
          properties: {
            taskId: { type: 'string', description: 'Wrike task ID' },
          },
          required: ['taskId'],
        },
      },
      {
        name: 'create_task',
        description: 'Create a new task in a Wrike folder or project with optional description, assignees, status, and dates',
        inputSchema: {
          type: 'object',
          properties: {
            folderId: { type: 'string', description: 'Folder or project ID to create the task in' },
            title: { type: 'string', description: 'Task title' },
            description: { type: 'string', description: 'Task description (HTML supported) (optional)' },
            status: { type: 'string', description: 'Task status: Active, Completed, Deferred, or Cancelled (optional)' },
            importance: { type: 'string', description: 'Task importance: High, Normal, or Low (optional)' },
            dates: { type: 'object', description: 'Date object with optional start and due fields in YYYY-MM-DD format (optional)' },
            responsibles: { type: 'array', description: 'Array of contact IDs to assign as responsibles (optional)', items: { type: 'string' } },
          },
          required: ['folderId', 'title'],
        },
      },
      {
        name: 'update_task',
        description: 'Update fields on an existing Wrike task — title, description, status, importance, or dates',
        inputSchema: {
          type: 'object',
          properties: {
            taskId: { type: 'string', description: 'Wrike task ID to update' },
            title: { type: 'string', description: 'New task title (optional)' },
            description: { type: 'string', description: 'New task description (optional)' },
            status: { type: 'string', description: 'New status: Active, Completed, Deferred, or Cancelled (optional)' },
            importance: { type: 'string', description: 'New importance: High, Normal, or Low (optional)' },
            dates: { type: 'object', description: 'Date object with optional start and due fields in YYYY-MM-DD format (optional)' },
            addResponsibles: { type: 'array', description: 'Contact IDs to add as responsibles (optional)', items: { type: 'string' } },
            removeResponsibles: { type: 'array', description: 'Contact IDs to remove from responsibles (optional)', items: { type: 'string' } },
          },
          required: ['taskId'],
        },
      },
      {
        name: 'delete_task',
        description: 'Delete a Wrike task by task ID — moves task to Recycle Bin (recoverable)',
        inputSchema: {
          type: 'object',
          properties: {
            taskId: { type: 'string', description: 'Wrike task ID to delete' },
          },
          required: ['taskId'],
        },
      },
      {
        name: 'get_comments',
        description: 'Retrieve comments for a specific Wrike task or folder',
        inputSchema: {
          type: 'object',
          properties: {
            taskId: { type: 'string', description: 'Task ID to get comments for (optional if folderId provided)' },
            folderId: { type: 'string', description: 'Folder ID to get comments for (optional if taskId provided)' },
          },
        },
      },
      {
        name: 'create_comment',
        description: 'Post a new comment on a Wrike task',
        inputSchema: {
          type: 'object',
          properties: {
            taskId: { type: 'string', description: 'Wrike task ID' },
            text: { type: 'string', description: 'Comment text (plain text or HTML)' },
          },
          required: ['taskId', 'text'],
        },
      },
      {
        name: 'update_comment',
        description: 'Update the text of an existing comment on a Wrike task',
        inputSchema: {
          type: 'object',
          properties: {
            commentId: { type: 'string', description: 'Comment ID to update' },
            text: { type: 'string', description: 'New comment text' },
          },
          required: ['commentId', 'text'],
        },
      },
      {
        name: 'list_timelogs',
        description: 'List timelog entries for a task, folder, or contact with optional date range filter',
        inputSchema: {
          type: 'object',
          properties: {
            taskId: { type: 'string', description: 'Task ID to list timelogs for (optional)' },
            folderId: { type: 'string', description: 'Folder ID to list timelogs for (optional)' },
            contactId: { type: 'string', description: 'Contact (user) ID to list timelogs for (optional)' },
            startDate: { type: 'string', description: 'Filter timelogs starting on or after this date (YYYY-MM-DD) (optional)' },
            endDate: { type: 'string', description: 'Filter timelogs ending on or before this date (YYYY-MM-DD) (optional)' },
          },
        },
      },
      {
        name: 'create_timelog',
        description: 'Log time spent on a Wrike task — creates a timelog entry with hours and optional comment',
        inputSchema: {
          type: 'object',
          properties: {
            taskId: { type: 'string', description: 'Task ID to log time against' },
            hours: { type: 'number', description: 'Number of hours to log' },
            trackedDate: { type: 'string', description: 'Date when time was tracked (YYYY-MM-DD, default: today)' },
            comment: { type: 'string', description: 'Optional comment describing the work done' },
          },
          required: ['taskId', 'hours'],
        },
      },
      {
        name: 'list_workflows',
        description: 'List all workflows in the Wrike account including custom statuses',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_attachments',
        description: 'Get attachments for a Wrike task or folder, including file name, size, and download URL',
        inputSchema: {
          type: 'object',
          properties: {
            taskId: { type: 'string', description: 'Task ID to get attachments for (optional if folderId provided)' },
            folderId: { type: 'string', description: 'Folder ID to get attachments for (optional if taskId provided)' },
            withUrls: { type: 'boolean', description: 'Include download URLs in response (default: true)' },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'get_contacts':
          return await this.getContacts(args);
        case 'list_spaces':
          return await this.listSpaces(args);
        case 'get_folders':
          return await this.getFolders(args);
        case 'get_tasks':
          return await this.getTasks(args);
        case 'get_task':
          return await this.getTask(args);
        case 'create_task':
          return await this.createTask(args);
        case 'update_task':
          return await this.updateTask(args);
        case 'delete_task':
          return await this.deleteTask(args);
        case 'get_comments':
          return await this.getComments(args);
        case 'create_comment':
          return await this.createComment(args);
        case 'update_comment':
          return await this.updateComment(args);
        case 'list_timelogs':
          return await this.listTimelogs(args);
        case 'create_timelog':
          return await this.createTimelog(args);
        case 'list_workflows':
          return await this.listWorkflows();
        case 'get_attachments':
          return await this.getAttachments(args);
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

  private authHeaders(): Record<string, string> {
    return {
      // Wrike API spec requires lowercase "bearer" — not "Bearer"
      Authorization: `bearer ${this.apiToken}`,
      'Content-Type': 'application/json',
    };
  }

  private async fetchJson(url: string, options?: RequestInit): Promise<ToolResult> {
    const response = await this.fetchWithRetry(url, { headers: this.authHeaders(), ...options });
    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `Wrike API error: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }
    const data = await response.json().catch(() => { throw new Error(`Wrike returned non-JSON (HTTP ${response.status})`); });
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getContacts(args: Record<string, unknown>): Promise<ToolResult> {
    const url = args.me === true
      ? `${this.baseUrl}/contacts?me=true`
      : `${this.baseUrl}/contacts`;
    return this.fetchJson(url);
  }

  private async listSpaces(args: Record<string, unknown>): Promise<ToolResult> {
    let url = `${this.baseUrl}/spaces`;
    if (args.withArchived === true) url += '?withArchived=true';
    return this.fetchJson(url);
  }

  private async getFolders(args: Record<string, unknown>): Promise<ToolResult> {
    const url = args.spaceId
      ? `${this.baseUrl}/spaces/${encodeURIComponent(args.spaceId as string)}/folders`
      : `${this.baseUrl}/folders`;
    return this.fetchJson(url);
  }

  private async getTasks(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.status) params.set('status', args.status as string);
    if (args.importance) params.set('importance', args.importance as string);
    if (args.startDate) params.set('startDate', JSON.stringify({ start: args.startDate }));
    if (args.dueDate) params.set('dueDate', JSON.stringify({ end: args.dueDate }));
    if (args.subTasks === true) params.set('subTasks', 'true');
    if (args.limit) params.set('limit', String(args.limit));
    if (args.nextPageToken) params.set('nextPageToken', args.nextPageToken as string);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.fetchJson(`${this.baseUrl}/folders/${encodeURIComponent(args.folderId as string)}/tasks${qs}`);
  }

  private async getTask(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fetchJson(`${this.baseUrl}/tasks/${encodeURIComponent(args.taskId as string)}`);
  }

  private async createTask(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = { title: args.title };
    if (args.description) body.description = args.description;
    if (args.status) body.status = args.status;
    if (args.importance) body.importance = args.importance;
    if (args.dates) body.dates = args.dates;
    if (args.responsibles) body.responsibles = args.responsibles;
    return this.fetchJson(
      `${this.baseUrl}/folders/${encodeURIComponent(args.folderId as string)}/tasks`,
      { method: 'POST', body: JSON.stringify(body) },
    );
  }

  private async updateTask(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {};
    if (args.title) body.title = args.title;
    if (args.description !== undefined) body.description = args.description;
    if (args.status) body.status = args.status;
    if (args.importance) body.importance = args.importance;
    if (args.dates) body.dates = args.dates;
    if (args.addResponsibles) body.addResponsibles = args.addResponsibles;
    if (args.removeResponsibles) body.removeResponsibles = args.removeResponsibles;
    return this.fetchJson(
      `${this.baseUrl}/tasks/${encodeURIComponent(args.taskId as string)}`,
      { method: 'PUT', body: JSON.stringify(body) },
    );
  }

  private async deleteTask(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fetchJson(
      `${this.baseUrl}/tasks/${encodeURIComponent(args.taskId as string)}`,
      { method: 'DELETE' },
    );
  }

  private async getComments(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.taskId) {
      return this.fetchJson(`${this.baseUrl}/tasks/${encodeURIComponent(args.taskId as string)}/comments`);
    }
    if (args.folderId) {
      return this.fetchJson(`${this.baseUrl}/folders/${encodeURIComponent(args.folderId as string)}/comments`);
    }
    return {
      content: [{ type: 'text', text: 'Either taskId or folderId is required' }],
      isError: true,
    };
  }

  private async createComment(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fetchJson(
      `${this.baseUrl}/tasks/${encodeURIComponent(args.taskId as string)}/comments`,
      { method: 'POST', body: JSON.stringify({ text: args.text }) },
    );
  }

  private async updateComment(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fetchJson(
      `${this.baseUrl}/comments/${encodeURIComponent(args.commentId as string)}`,
      { method: 'PUT', body: JSON.stringify({ text: args.text }) },
    );
  }

  private async listTimelogs(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.startDate) params.set('startDate', args.startDate as string);
    if (args.endDate) params.set('endDate', args.endDate as string);
    const qs = params.toString() ? `?${params.toString()}` : '';

    if (args.taskId) {
      return this.fetchJson(`${this.baseUrl}/tasks/${encodeURIComponent(args.taskId as string)}/timelogs${qs}`);
    }
    if (args.folderId) {
      return this.fetchJson(`${this.baseUrl}/folders/${encodeURIComponent(args.folderId as string)}/timelogs${qs}`);
    }
    if (args.contactId) {
      return this.fetchJson(`${this.baseUrl}/contacts/${encodeURIComponent(args.contactId as string)}/timelogs${qs}`);
    }
    return this.fetchJson(`${this.baseUrl}/timelogs${qs}`);
  }

  private async createTimelog(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = { hours: args.hours };
    if (args.trackedDate) body.trackedDate = args.trackedDate;
    if (args.comment) body.comment = args.comment;
    return this.fetchJson(
      `${this.baseUrl}/tasks/${encodeURIComponent(args.taskId as string)}/timelogs`,
      { method: 'POST', body: JSON.stringify(body) },
    );
  }

  private async listWorkflows(): Promise<ToolResult> {
    return this.fetchJson(`${this.baseUrl}/workflows`);
  }

  private async getAttachments(args: Record<string, unknown>): Promise<ToolResult> {
    const withUrls = args.withUrls !== false;
    const qs = withUrls ? '?withUrls=true' : '';

    if (args.taskId) {
      return this.fetchJson(`${this.baseUrl}/tasks/${encodeURIComponent(args.taskId as string)}/attachments${qs}`);
    }
    if (args.folderId) {
      return this.fetchJson(`${this.baseUrl}/folders/${encodeURIComponent(args.folderId as string)}/attachments${qs}`);
    }
    return {
      content: [{ type: 'text', text: 'Either taskId or folderId is required' }],
      isError: true,
    };
  }
}

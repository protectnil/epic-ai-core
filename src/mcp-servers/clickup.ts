/**
 * ClickUp MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://app.clickup.com/mcp — transport: streamable-HTTP, auth: OAuth 2.1 PKCE
//   Published by ClickUp Inc. (vendor-official). Public beta as of 2026-03. Actively maintained.
//   Confirmed tools (from developer.clickup.com/docs/mcp-tools):
//     Search: Search Workspace, Search tasks by task type, Search tasks by tag
//     Task management: Create Task, Get Task, Update Task, Delete Task, Set Custom Fields
//     Time tracking: Start Time Tracking, Stop Time Tracking, Add Time Entry, Get Current Time Entry
//     Workspace hierarchy: Get Workspace Hierarchy
//     Lists: Create List, Create List in Folder, Get List, Update List
//     Folders: Get Folder, Create Folder, Update Folder
//   MCP tool count: ~20 tools (public beta, count growing)
//
// Our adapter covers: 19 tools (REST API operations).
// Vendor MCP covers: ~20 tools focused on search, hierarchy, and core task/time operations.
//
// Integration: use-both
//   MCP-sourced tools: Search Workspace, Search tasks by task type, Search tasks by tag,
//     Get Workspace Hierarchy — these expose cross-workspace search and full hierarchy traversal
//     not available through our per-list/per-folder REST tool set.
//   REST-sourced tools (our adapter): get_authorized_user, get_workspaces, get_spaces,
//     get_folders, get_folder, get_lists, get_folder_lists, get_tasks, get_task, create_task,
//     update_task, delete_task, create_task_comment, get_task_comments, get_list_members,
//     get_task_members, get_time_entries (workspace-level date-range — NOT in MCP per user
//     feedback at feedback.clickup.com), start_timer, stop_timer.
//   Shared (exist in both MCP and REST API, MCP takes priority per FederationManager):
//     Create Task, Get Task, Update Task, Delete Task, Start Time Tracking, Stop Time Tracking.
//   Combined coverage: MCP search/hierarchy tools + REST workspace-level time entries and member
//     endpoints fill the gaps on each side.
//
// Base URL: https://api.clickup.com/api/v2
// Auth: Authorization: {token} header (no "Bearer" prefix) — works for both personal API tokens
//   (pk_…) and OAuth2 access tokens per ClickUp v2 docs.
// Docs: https://developer.clickup.com/docs
// Rate limits: Plan-dependent per-token limits. Returns HTTP 429 with X-RateLimit-* headers.
//   See https://developer.clickup.com/docs/rate-limits for per-plan details.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface ClickUpConfig {
  /**
   * Personal API token (begins with "pk_") or OAuth2 access token.
   * Header format: Authorization: {token} — no "Bearer" prefix for personal tokens.
   */
  apiToken: string;
  baseUrl?: string;
}

const CLICKUP_BASE_URL = 'https://api.clickup.com/api/v2';

export class ClickUpMCPServer extends MCPAdapterBase {
  private readonly apiToken: string;
  private readonly baseUrl: string;

  constructor(config: ClickUpConfig) {
    super();
    this.apiToken = config.apiToken;
    this.baseUrl = (config.baseUrl || CLICKUP_BASE_URL).replace(/\/$/, '');
  }

  static catalog() {
    return {
      name: 'clickup',
      displayName: 'ClickUp',
      version: '1.0.0',
      category: 'devops' as const,
      keywords: ['clickup', 'task', 'project', 'sprint', 'list', 'space', 'folder', 'workspace', 'time-tracking', 'checklist'],
      toolNames: [
        'get_authorized_user', 'get_workspaces', 'get_spaces', 'get_folders',
        'get_folder', 'get_lists', 'get_folder_lists', 'get_tasks', 'get_task',
        'create_task', 'update_task', 'delete_task', 'create_task_comment',
        'get_task_comments', 'get_list_members', 'get_task_members',
        'get_time_entries', 'start_timer', 'stop_timer',
      ],
      description: 'Manage ClickUp workspaces, spaces, folders, lists, tasks, comments, members, and time tracking via the v2 REST API.',
      author: 'protectnil' as const,
    };
  }

  private get headers(): Record<string, string> {
    return {
      Authorization: this.apiToken,
      'Content-Type': 'application/json',
    };
  }

  private async fetchJSON(url: string, options: RequestInit = {}): Promise<ToolResult> {
    const response = await this.fetchWithRetry(url, { headers: this.headers, ...options });
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `API error ${response.status}: ${errText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`ClickUp returned non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'get_authorized_user',
        description: 'Retrieve the authenticated user profile and their authorized workspaces.',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'get_workspaces',
        description: 'List all workspaces (teams) authorized for the current API token.',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'get_spaces',
        description: 'List all Spaces in a ClickUp workspace with optional archived filter.',
        inputSchema: {
          type: 'object',
          properties: {
            teamId: { type: 'string', description: 'Workspace (team) ID.' },
            archived: { type: 'boolean', description: 'Include archived Spaces (default: false).' },
          },
          required: ['teamId'],
        },
      },
      {
        name: 'get_folders',
        description: 'List all Folders in a ClickUp Space with optional archived filter.',
        inputSchema: {
          type: 'object',
          properties: {
            spaceId: { type: 'string', description: 'Space ID to list folders from.' },
            archived: { type: 'boolean', description: 'Include archived Folders (default: false).' },
          },
          required: ['spaceId'],
        },
      },
      {
        name: 'get_folder',
        description: 'Retrieve a single Folder by its ID including its Lists.',
        inputSchema: {
          type: 'object',
          properties: {
            folderId: { type: 'string', description: 'Folder ID.' },
          },
          required: ['folderId'],
        },
      },
      {
        name: 'get_lists',
        description: 'List all folderless Lists in a ClickUp Space (Lists not inside a Folder).',
        inputSchema: {
          type: 'object',
          properties: {
            spaceId: { type: 'string', description: 'Space ID.' },
            archived: { type: 'boolean', description: 'Include archived Lists (default: false).' },
          },
          required: ['spaceId'],
        },
      },
      {
        name: 'get_folder_lists',
        description: 'List all Lists inside a specific Folder.',
        inputSchema: {
          type: 'object',
          properties: {
            folderId: { type: 'string', description: 'Folder ID to list Lists from.' },
            archived: { type: 'boolean', description: 'Include archived Lists (default: false).' },
          },
          required: ['folderId'],
        },
      },
      {
        name: 'get_tasks',
        description: 'Retrieve tasks from a ClickUp List with optional filters for status, assignee, due date, and pagination.',
        inputSchema: {
          type: 'object',
          properties: {
            listId: { type: 'string', description: 'List ID to retrieve tasks from.' },
            archived: { type: 'boolean', description: 'Include archived tasks (default: false).' },
            page: { type: 'number', description: 'Page number for pagination (default: 0).' },
            orderBy: { type: 'string', description: 'Sort field: id, created, updated, or due_date (default: created).' },
            reverse: { type: 'boolean', description: 'Reverse the sort order (default: false).' },
            subtasks: { type: 'boolean', description: 'Include subtasks (default: false).' },
            statuses: { type: 'string', description: 'Comma-separated status names to filter by (optional).' },
            assignees: { type: 'string', description: 'Comma-separated assignee user IDs to filter by (optional).' },
            dueDateGt: { type: 'number', description: 'Filter tasks with due date after this Unix timestamp in ms (optional).' },
            dueDateLt: { type: 'number', description: 'Filter tasks with due date before this Unix timestamp in ms (optional).' },
          },
          required: ['listId'],
        },
      },
      {
        name: 'get_task',
        description: 'Retrieve a single ClickUp task by its task ID with all fields.',
        inputSchema: {
          type: 'object',
          properties: {
            taskId: { type: 'string', description: 'ClickUp task ID.' },
            customTaskIds: { type: 'boolean', description: 'If true, treat taskId as a custom task ID (requires teamId).' },
            teamId: { type: 'string', description: 'Workspace (team) ID — required when customTaskIds is true.' },
          },
          required: ['taskId'],
        },
      },
      {
        name: 'create_task',
        description: 'Create a new task in a ClickUp List with optional assignees, tags, status, priority, due date, and parent.',
        inputSchema: {
          type: 'object',
          properties: {
            listId: { type: 'string', description: 'List ID to create the task in.' },
            name: { type: 'string', description: 'Task name.' },
            description: { type: 'string', description: 'Task description (plain text, optional).' },
            assignees: { type: 'array', description: 'Array of user IDs to assign (optional).', items: { type: 'number' } },
            tags: { type: 'array', description: 'Array of tag names to apply (optional).', items: { type: 'string' } },
            status: { type: 'string', description: 'Status name (optional, defaults to the first status in the List).' },
            priority: { type: 'number', description: 'Priority: 1 (urgent), 2 (high), 3 (normal), 4 (low) (optional).' },
            dueDate: { type: 'number', description: 'Due date as Unix timestamp in milliseconds (optional).' },
            parentId: { type: 'string', description: 'Parent task ID to create this as a subtask (optional).' },
          },
          required: ['listId', 'name'],
        },
      },
      {
        name: 'update_task',
        description: 'Update fields on an existing ClickUp task — name, description, status, priority, due date.',
        inputSchema: {
          type: 'object',
          properties: {
            taskId: { type: 'string', description: 'ClickUp task ID.' },
            name: { type: 'string', description: 'New task name (optional).' },
            description: { type: 'string', description: 'New task description (optional).' },
            status: { type: 'string', description: 'New status name (optional).' },
            priority: { type: 'number', description: 'Priority: 1 (urgent), 2 (high), 3 (normal), 4 (low) (optional).' },
            dueDate: { type: 'number', description: 'New due date as Unix timestamp in milliseconds (optional).' },
          },
          required: ['taskId'],
        },
      },
      {
        name: 'delete_task',
        description: 'Permanently delete a ClickUp task by its task ID. This action cannot be undone.',
        inputSchema: {
          type: 'object',
          properties: {
            taskId: { type: 'string', description: 'ClickUp task ID to delete.' },
          },
          required: ['taskId'],
        },
      },
      {
        name: 'create_task_comment',
        description: 'Post a comment on a ClickUp task with optional assignee and notify-all flag.',
        inputSchema: {
          type: 'object',
          properties: {
            taskId: { type: 'string', description: 'ClickUp task ID.' },
            commentText: { type: 'string', description: 'Text content of the comment.' },
            assignee: { type: 'number', description: 'User ID to assign the comment to (optional).' },
            notifyAll: { type: 'boolean', description: 'Notify all task assignees (default: false).' },
          },
          required: ['taskId', 'commentText'],
        },
      },
      {
        name: 'get_task_comments',
        description: 'List all comments on a ClickUp task in chronological order.',
        inputSchema: {
          type: 'object',
          properties: {
            taskId: { type: 'string', description: 'ClickUp task ID.' },
          },
          required: ['taskId'],
        },
      },
      {
        name: 'get_list_members',
        description: 'List members (users) who have access to a specific ClickUp List.',
        inputSchema: {
          type: 'object',
          properties: {
            listId: { type: 'string', description: 'List ID.' },
          },
          required: ['listId'],
        },
      },
      {
        name: 'get_task_members',
        description: 'List members (users) who are assigned to or have access to a specific ClickUp task.',
        inputSchema: {
          type: 'object',
          properties: {
            taskId: { type: 'string', description: 'ClickUp task ID.' },
          },
          required: ['taskId'],
        },
      },
      {
        name: 'get_time_entries',
        description: 'Retrieve time tracking entries for a workspace within a date range, optionally filtered by task or assignee.',
        inputSchema: {
          type: 'object',
          properties: {
            teamId: { type: 'string', description: 'Workspace (team) ID.' },
            startDate: { type: 'number', description: 'Start of date range as Unix timestamp in ms (optional, defaults to 30 days ago).' },
            endDate: { type: 'number', description: 'End of date range as Unix timestamp in ms (optional, defaults to now).' },
            assignee: { type: 'number', description: 'Filter by user ID (optional).' },
            taskId: { type: 'string', description: 'Filter by task ID (optional).' },
          },
          required: ['teamId'],
        },
      },
      {
        name: 'start_timer',
        description: 'Start a time tracking timer for a task in a workspace.',
        inputSchema: {
          type: 'object',
          properties: {
            teamId: { type: 'string', description: 'Workspace (team) ID.' },
            taskId: { type: 'string', description: 'Task ID to track time against.' },
            description: { type: 'string', description: 'Optional description for this time entry.' },
          },
          required: ['teamId', 'taskId'],
        },
      },
      {
        name: 'stop_timer',
        description: 'Stop the currently running time tracking timer for a workspace.',
        inputSchema: {
          type: 'object',
          properties: {
            teamId: { type: 'string', description: 'Workspace (team) ID.' },
          },
          required: ['teamId'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'get_authorized_user':
          return this.getAuthorizedUser();
        case 'get_workspaces':
          return this.getWorkspaces();
        case 'get_spaces':
          return this.getSpaces(args);
        case 'get_folders':
          return this.getFolders(args);
        case 'get_folder':
          return this.getFolder(args);
        case 'get_lists':
          return this.getLists(args);
        case 'get_folder_lists':
          return this.getFolderLists(args);
        case 'get_tasks':
          return this.getTasks(args);
        case 'get_task':
          return this.getTask(args);
        case 'create_task':
          return this.createTask(args);
        case 'update_task':
          return this.updateTask(args);
        case 'delete_task':
          return this.deleteTask(args);
        case 'create_task_comment':
          return this.createTaskComment(args);
        case 'get_task_comments':
          return this.getTaskComments(args);
        case 'get_list_members':
          return this.getListMembers(args);
        case 'get_task_members':
          return this.getTaskMembers(args);
        case 'get_time_entries':
          return this.getTimeEntries(args);
        case 'start_timer':
          return this.startTimer(args);
        case 'stop_timer':
          return this.stopTimer(args);
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

  private async getAuthorizedUser(): Promise<ToolResult> {
    return this.fetchJSON(`${this.baseUrl}/user`);
  }

  private async getWorkspaces(): Promise<ToolResult> {
    return this.fetchJSON(`${this.baseUrl}/team`);
  }

  private async getSpaces(args: Record<string, unknown>): Promise<ToolResult> {
    const teamId = args.teamId as string;
    if (!teamId) return { content: [{ type: 'text', text: 'teamId is required' }], isError: true };
    const archived = args.archived === true ? 'true' : 'false';
    return this.fetchJSON(`${this.baseUrl}/team/${encodeURIComponent(teamId)}/space?archived=${archived}`);
  }

  private async getFolders(args: Record<string, unknown>): Promise<ToolResult> {
    const spaceId = args.spaceId as string;
    if (!spaceId) return { content: [{ type: 'text', text: 'spaceId is required' }], isError: true };
    const archived = args.archived === true ? 'true' : 'false';
    return this.fetchJSON(`${this.baseUrl}/space/${encodeURIComponent(spaceId)}/folder?archived=${archived}`);
  }

  private async getFolder(args: Record<string, unknown>): Promise<ToolResult> {
    const folderId = args.folderId as string;
    if (!folderId) return { content: [{ type: 'text', text: 'folderId is required' }], isError: true };
    return this.fetchJSON(`${this.baseUrl}/folder/${encodeURIComponent(folderId)}`);
  }

  private async getLists(args: Record<string, unknown>): Promise<ToolResult> {
    const spaceId = args.spaceId as string;
    if (!spaceId) return { content: [{ type: 'text', text: 'spaceId is required' }], isError: true };
    const archived = args.archived === true ? 'true' : 'false';
    return this.fetchJSON(`${this.baseUrl}/space/${encodeURIComponent(spaceId)}/list?archived=${archived}`);
  }

  private async getFolderLists(args: Record<string, unknown>): Promise<ToolResult> {
    const folderId = args.folderId as string;
    if (!folderId) return { content: [{ type: 'text', text: 'folderId is required' }], isError: true };
    const archived = args.archived === true ? 'true' : 'false';
    return this.fetchJSON(`${this.baseUrl}/folder/${encodeURIComponent(folderId)}/list?archived=${archived}`);
  }

  private async getTasks(args: Record<string, unknown>): Promise<ToolResult> {
    const listId = args.listId as string;
    if (!listId) return { content: [{ type: 'text', text: 'listId is required' }], isError: true };

    const params = new URLSearchParams();
    params.set('archived', args.archived === true ? 'true' : 'false');
    params.set('page', String((args.page as number) || 0));
    if (args.orderBy) params.set('order_by', args.orderBy as string);
    if (args.reverse === true) params.set('reverse', 'true');
    if (args.subtasks === true) params.set('subtasks', 'true');
    if (args.statuses) {
      for (const s of (args.statuses as string).split(',')) params.append('statuses[]', s.trim());
    }
    if (args.assignees) {
      for (const a of (args.assignees as string).split(',')) params.append('assignees[]', a.trim());
    }
    if (args.dueDateGt) params.set('due_date_gt', String(args.dueDateGt));
    if (args.dueDateLt) params.set('due_date_lt', String(args.dueDateLt));

    return this.fetchJSON(`${this.baseUrl}/list/${encodeURIComponent(listId)}/task?${params.toString()}`);
  }

  private async getTask(args: Record<string, unknown>): Promise<ToolResult> {
    const taskId = args.taskId as string;
    if (!taskId) return { content: [{ type: 'text', text: 'taskId is required' }], isError: true };

    const params = new URLSearchParams();
    if (args.customTaskIds === true) {
      params.set('custom_task_ids', 'true');
      if (args.teamId) params.set('team_id', args.teamId as string);
    }
    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.fetchJSON(`${this.baseUrl}/task/${encodeURIComponent(taskId)}${qs}`);
  }

  private async createTask(args: Record<string, unknown>): Promise<ToolResult> {
    const listId = args.listId as string;
    const taskName = args.name as string;
    if (!listId || !taskName) return { content: [{ type: 'text', text: 'listId and name are required' }], isError: true };

    const body: Record<string, unknown> = { name: taskName };
    if (args.description) body.description = args.description;
    if (args.assignees) body.assignees = args.assignees;
    if (args.tags) body.tags = args.tags;
    if (args.status) body.status = args.status;
    if (args.priority !== undefined) body.priority = args.priority;
    if (args.dueDate !== undefined) body.due_date = args.dueDate;
    if (args.parentId) body.parent = args.parentId;

    return this.fetchJSON(`${this.baseUrl}/list/${encodeURIComponent(listId)}/task`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  private async updateTask(args: Record<string, unknown>): Promise<ToolResult> {
    const taskId = args.taskId as string;
    if (!taskId) return { content: [{ type: 'text', text: 'taskId is required' }], isError: true };

    const body: Record<string, unknown> = {};
    if (args.name) body.name = args.name;
    if (args.description !== undefined) body.description = args.description;
    if (args.status) body.status = args.status;
    if (args.priority !== undefined) body.priority = args.priority;
    if (args.dueDate !== undefined) body.due_date = args.dueDate;

    return this.fetchJSON(`${this.baseUrl}/task/${encodeURIComponent(taskId)}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  private async deleteTask(args: Record<string, unknown>): Promise<ToolResult> {
    const taskId = args.taskId as string;
    if (!taskId) return { content: [{ type: 'text', text: 'taskId is required' }], isError: true };

    return this.fetchJSON(`${this.baseUrl}/task/${encodeURIComponent(taskId)}`, { method: 'DELETE' });
  }

  private async createTaskComment(args: Record<string, unknown>): Promise<ToolResult> {
    const taskId = args.taskId as string;
    const commentText = args.commentText as string;
    if (!taskId || !commentText) return { content: [{ type: 'text', text: 'taskId and commentText are required' }], isError: true };

    const body: Record<string, unknown> = {
      comment_text: commentText,
      notify_all: args.notifyAll === true,
    };
    if (args.assignee !== undefined) body.assignee = args.assignee;

    return this.fetchJSON(`${this.baseUrl}/task/${encodeURIComponent(taskId)}/comment`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  private async getTaskComments(args: Record<string, unknown>): Promise<ToolResult> {
    const taskId = args.taskId as string;
    if (!taskId) return { content: [{ type: 'text', text: 'taskId is required' }], isError: true };
    return this.fetchJSON(`${this.baseUrl}/task/${encodeURIComponent(taskId)}/comment`);
  }

  private async getListMembers(args: Record<string, unknown>): Promise<ToolResult> {
    const listId = args.listId as string;
    if (!listId) return { content: [{ type: 'text', text: 'listId is required' }], isError: true };
    return this.fetchJSON(`${this.baseUrl}/list/${encodeURIComponent(listId)}/member`);
  }

  private async getTaskMembers(args: Record<string, unknown>): Promise<ToolResult> {
    const taskId = args.taskId as string;
    if (!taskId) return { content: [{ type: 'text', text: 'taskId is required' }], isError: true };
    return this.fetchJSON(`${this.baseUrl}/task/${encodeURIComponent(taskId)}/member`);
  }

  private async getTimeEntries(args: Record<string, unknown>): Promise<ToolResult> {
    const teamId = args.teamId as string;
    if (!teamId) return { content: [{ type: 'text', text: 'teamId is required' }], isError: true };

    const params = new URLSearchParams();
    if (args.startDate) params.set('start_date', String(args.startDate));
    if (args.endDate) params.set('end_date', String(args.endDate));
    if (args.assignee) params.set('assignee', String(args.assignee));
    if (args.taskId) params.set('task_id', args.taskId as string);

    return this.fetchJSON(`${this.baseUrl}/team/${encodeURIComponent(teamId)}/time_entries?${params.toString()}`);
  }

  private async startTimer(args: Record<string, unknown>): Promise<ToolResult> {
    const teamId = args.teamId as string;
    const taskId = args.taskId as string;
    if (!teamId || !taskId) return { content: [{ type: 'text', text: 'teamId and taskId are required' }], isError: true };

    const body: Record<string, unknown> = { tid: taskId };
    if (args.description) body.description = args.description;

    return this.fetchJSON(`${this.baseUrl}/team/${encodeURIComponent(teamId)}/time_entries/start`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  private async stopTimer(args: Record<string, unknown>): Promise<ToolResult> {
    const teamId = args.teamId as string;
    if (!teamId) return { content: [{ type: 'text', text: 'teamId is required' }], isError: true };

    return this.fetchJSON(`${this.baseUrl}/team/${encodeURIComponent(teamId)}/time_entries/stop`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
  }
}

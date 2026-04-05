/**
 * Asana MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://developers.asana.com/docs/mcp-server (vendor-hosted V2) — transport: streamable-HTTP, auth: OAuth2
// Asana publishes an official MCP V2 server (generally available as of 2026-02, V1 deprecated 2026-05-11).
// It is actively maintained. Exposes 15 tools (as of 2026-03-28). Does NOT expose stories/comments.
// Our adapter covers: 28 tools (full REST surface including delete, subtasks, sections, stories).
// Vendor MCP V2 tools (15): search_objects, search_tasks, get_status_overview, get_task, get_tasks,
//   create_task, update_task, create_project, get_project, get_projects, get_portfolio, get_portfolios,
//   get_items_for_portfolio, get_user, get_workspace_users
// Integration: use-both
// MCP-sourced tools (5 unique to MCP, not in our REST adapter):
//   search_objects, get_status_overview, get_tasks, get_projects, get_portfolios
// REST-sourced tools (18 unique to REST, not in vendor MCP):
//   list_workspaces, delete_task, add_task_to_project, list_task_subtasks, create_subtask,
//   list_projects, delete_project, update_project, list_sections, create_section,
//   move_task_to_section, list_teams, list_team_members, list_portfolios, list_portfolio_items,
//   list_tags, list_task_stories, create_task_story
// Shared (in both MCP and REST): search_tasks/search_tasks, get_task/get_task, create_task/create_task,
//   update_task/update_task, create_project/create_project, get_project/get_project,
//   get_portfolio/get_portfolio, get_items_for_portfolio/list_portfolio_items, get_user/get_user,
//   get_workspace_users/list_workspace_users
// NOTE: Stories/comments are NOT in MCP V2. Our list_task_stories and create_task_story are REST-only.
//
// Base URL: https://app.asana.com/api/1.0
// Auth: Bearer token — Personal Access Token (PAT) from Asana My Profile Settings
// Docs: https://developers.asana.com/reference/rest-api-reference
// Rate limits: 1,500 requests/minute per OAuth token; 150 requests/minute per PAT

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface AsanaConfig {
  accessToken: string; // Personal Access Token or OAuth2 access token
  baseUrl?: string;
}

export class AsanaMCPServer extends MCPAdapterBase {
  private readonly accessToken: string;
  private readonly baseUrl: string;

  constructor(config: AsanaConfig) {
    super();
    this.accessToken = config.accessToken;
    this.baseUrl = config.baseUrl ?? 'https://app.asana.com/api/1.0';
  }

  get tools(): ToolDefinition[] {
    return [
      // ── Workspaces ────────────────────────────────────────────────────────
      {
        name: 'list_workspaces',
        description: 'List all Asana workspaces and organizations the authenticated user belongs to',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Maximum results to return (default: 20, max: 100)' },
            offset: { type: 'string', description: 'Pagination offset token from a previous response' },
          },
        },
      },
      // ── Tasks ─────────────────────────────────────────────────────────────
      {
        name: 'list_tasks',
        description: 'List tasks in an Asana project with optional completion and pagination filters',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: { type: 'string', description: 'Project GID to list tasks from' },
            section_id: { type: 'string', description: 'Section GID to list tasks from (alternative to project_id)' },
            assignee: { type: 'string', description: 'Filter by assignee GID or "me"' },
            completed_since: { type: 'string', description: 'ISO 8601 date — return tasks completed after this date' },
            limit: { type: 'number', description: 'Maximum results to return (default: 20, max: 100)' },
            offset: { type: 'string', description: 'Pagination offset token from a previous response' },
          },
        },
      },
      {
        name: 'get_task',
        description: 'Get full details of a specific Asana task including notes, assignee, due date, and custom fields',
        inputSchema: {
          type: 'object',
          properties: {
            task_id: { type: 'string', description: 'Task GID' },
          },
          required: ['task_id'],
        },
      },
      {
        name: 'create_task',
        description: 'Create a new Asana task in a workspace, optionally adding it to a project and section',
        inputSchema: {
          type: 'object',
          properties: {
            workspace_id: { type: 'string', description: 'Workspace GID (required if no project_id)' },
            project_id: { type: 'string', description: 'Project GID to add the task to' },
            section_id: { type: 'string', description: 'Section GID to place the task in' },
            name: { type: 'string', description: 'Task name' },
            notes: { type: 'string', description: 'Task description (plain text)' },
            html_notes: { type: 'string', description: 'Task description (HTML format)' },
            assignee: { type: 'string', description: 'Assignee GID or email address' },
            due_on: { type: 'string', description: 'Due date in YYYY-MM-DD format' },
            due_at: { type: 'string', description: 'Due date and time in ISO 8601 format' },
            start_on: { type: 'string', description: 'Start date in YYYY-MM-DD format' },
            followers: {
              type: 'array',
              description: 'Array of user GIDs to follow this task',
              items: { type: 'string' },
            },
            tags: {
              type: 'array',
              description: 'Array of tag GIDs to apply to the task',
              items: { type: 'string' },
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'update_task',
        description: 'Update an existing Asana task — change name, notes, assignee, due date, or completion status',
        inputSchema: {
          type: 'object',
          properties: {
            task_id: { type: 'string', description: 'Task GID to update' },
            name: { type: 'string', description: 'New task name' },
            notes: { type: 'string', description: 'New task description (plain text)' },
            assignee: { type: 'string', description: 'New assignee GID, email, or null to unassign' },
            due_on: { type: 'string', description: 'New due date in YYYY-MM-DD format' },
            due_at: { type: 'string', description: 'New due date and time in ISO 8601 format' },
            start_on: { type: 'string', description: 'New start date in YYYY-MM-DD format' },
            completed: { type: 'boolean', description: 'Mark task as completed (true) or incomplete (false)' },
          },
          required: ['task_id'],
        },
      },
      {
        name: 'delete_task',
        description: 'Delete an Asana task permanently by GID',
        inputSchema: {
          type: 'object',
          properties: {
            task_id: { type: 'string', description: 'Task GID to delete' },
          },
          required: ['task_id'],
        },
      },
      {
        name: 'search_tasks',
        description: 'Search for Asana tasks in a workspace with full-text, assignee, project, and completion filters',
        inputSchema: {
          type: 'object',
          properties: {
            workspace_id: { type: 'string', description: 'Workspace GID to search within' },
            text: { type: 'string', description: 'Free-text search query matching task name and notes' },
            assignee: { type: 'string', description: 'Filter by assignee GID' },
            projects: {
              type: 'array',
              description: 'Filter by project GIDs (any match)',
              items: { type: 'string' },
            },
            sections: {
              type: 'array',
              description: 'Filter by section GIDs (any match)',
              items: { type: 'string' },
            },
            completed: { type: 'boolean', description: 'Filter by completion status (omit for both)' },
            due_on_before: { type: 'string', description: 'Filter tasks due on or before this date (YYYY-MM-DD)' },
            due_on_after: { type: 'string', description: 'Filter tasks due on or after this date (YYYY-MM-DD)' },
            limit: { type: 'number', description: 'Maximum results to return (default: 20, max: 100)' },
          },
          required: ['workspace_id'],
        },
      },
      {
        name: 'add_task_to_project',
        description: 'Add an existing Asana task to a project, optionally placing it in a specific section',
        inputSchema: {
          type: 'object',
          properties: {
            task_id: { type: 'string', description: 'Task GID to add' },
            project_id: { type: 'string', description: 'Project GID to add the task to' },
            section_id: { type: 'string', description: 'Section GID to place the task in (optional)' },
          },
          required: ['task_id', 'project_id'],
        },
      },
      {
        name: 'list_task_subtasks',
        description: 'List all subtasks of an Asana task',
        inputSchema: {
          type: 'object',
          properties: {
            task_id: { type: 'string', description: 'Parent task GID' },
            limit: { type: 'number', description: 'Maximum results to return (default: 20, max: 100)' },
            offset: { type: 'string', description: 'Pagination offset token from a previous response' },
          },
          required: ['task_id'],
        },
      },
      {
        name: 'create_subtask',
        description: 'Create a subtask under an existing Asana task',
        inputSchema: {
          type: 'object',
          properties: {
            parent_task_id: { type: 'string', description: 'Parent task GID' },
            name: { type: 'string', description: 'Subtask name' },
            notes: { type: 'string', description: 'Subtask description' },
            assignee: { type: 'string', description: 'Assignee GID or email' },
            due_on: { type: 'string', description: 'Due date in YYYY-MM-DD format' },
          },
          required: ['parent_task_id', 'name'],
        },
      },
      // ── Projects ──────────────────────────────────────────────────────────
      {
        name: 'list_projects',
        description: 'List Asana projects in a workspace or team with optional archive filter',
        inputSchema: {
          type: 'object',
          properties: {
            workspace_id: { type: 'string', description: 'Workspace GID to list projects from' },
            team_id: { type: 'string', description: 'Team GID to list projects from (alternative to workspace_id)' },
            archived: { type: 'boolean', description: 'Include only archived (true) or active (false) projects; omit for all' },
            limit: { type: 'number', description: 'Maximum results to return (default: 20, max: 100)' },
            offset: { type: 'string', description: 'Pagination offset token from a previous response' },
          },
        },
      },
      {
        name: 'get_project',
        description: 'Get full details of a specific Asana project including custom fields and members',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: { type: 'string', description: 'Project GID' },
          },
          required: ['project_id'],
        },
      },
      {
        name: 'create_project',
        description: 'Create a new Asana project in a workspace or team with optional layout and color',
        inputSchema: {
          type: 'object',
          properties: {
            workspace_id: { type: 'string', description: 'Workspace GID (required if no team_id)' },
            team_id: { type: 'string', description: 'Team GID to associate the project with' },
            name: { type: 'string', description: 'Project name' },
            notes: { type: 'string', description: 'Project description' },
            color: { type: 'string', description: 'Project color: dark-pink, dark-green, dark-blue, dark-red, dark-teal, dark-brown, dark-orange, dark-purple, dark-warm-gray, light-pink, light-orange, light-yellow, light-green, light-teal, light-blue, light-purple, light-warm-gray' },
            default_view: { type: 'string', description: 'Default layout: list, board, calendar, timeline (default: list)' },
            public: { type: 'boolean', description: 'Make project visible to all workspace members (default: false)' },
          },
          required: ['name'],
        },
      },
      {
        name: 'update_project',
        description: 'Update an existing Asana project name, description, color, or archived status',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: { type: 'string', description: 'Project GID to update' },
            name: { type: 'string', description: 'New project name' },
            notes: { type: 'string', description: 'New project description' },
            color: { type: 'string', description: 'New project color' },
            archived: { type: 'boolean', description: 'Archive (true) or unarchive (false) the project' },
          },
          required: ['project_id'],
        },
      },
      {
        name: 'delete_project',
        description: 'Delete an Asana project and all its tasks permanently',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: { type: 'string', description: 'Project GID to delete' },
          },
          required: ['project_id'],
        },
      },
      // ── Sections ──────────────────────────────────────────────────────────
      {
        name: 'list_sections',
        description: 'List all sections in an Asana project in their current order',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: { type: 'string', description: 'Project GID to list sections from' },
            limit: { type: 'number', description: 'Maximum results to return (default: 20, max: 100)' },
            offset: { type: 'string', description: 'Pagination offset token from a previous response' },
          },
          required: ['project_id'],
        },
      },
      {
        name: 'create_section',
        description: 'Create a new section in an Asana project',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: { type: 'string', description: 'Project GID to add the section to' },
            name: { type: 'string', description: 'Section name' },
          },
          required: ['project_id', 'name'],
        },
      },
      {
        name: 'move_task_to_section',
        description: 'Move an Asana task to a specific section within a project',
        inputSchema: {
          type: 'object',
          properties: {
            section_id: { type: 'string', description: 'Target section GID' },
            task_id: { type: 'string', description: 'Task GID to move' },
          },
          required: ['section_id', 'task_id'],
        },
      },
      // ── Teams ─────────────────────────────────────────────────────────────
      {
        name: 'list_teams',
        description: 'List all teams in an Asana organization/workspace',
        inputSchema: {
          type: 'object',
          properties: {
            workspace_id: { type: 'string', description: 'Workspace GID to list teams from' },
            limit: { type: 'number', description: 'Maximum results to return (default: 20, max: 100)' },
            offset: { type: 'string', description: 'Pagination offset token from a previous response' },
          },
          required: ['workspace_id'],
        },
      },
      {
        name: 'list_team_members',
        description: 'List all members of an Asana team',
        inputSchema: {
          type: 'object',
          properties: {
            team_id: { type: 'string', description: 'Team GID' },
            limit: { type: 'number', description: 'Maximum results to return (default: 20, max: 100)' },
            offset: { type: 'string', description: 'Pagination offset token from a previous response' },
          },
          required: ['team_id'],
        },
      },
      // ── Portfolios ────────────────────────────────────────────────────────
      {
        name: 'list_portfolios',
        description: 'List all portfolios in a workspace that the authenticated user can access',
        inputSchema: {
          type: 'object',
          properties: {
            workspace_id: { type: 'string', description: 'Workspace GID to list portfolios from' },
            owner: { type: 'string', description: 'Filter by owner GID or "me"' },
            limit: { type: 'number', description: 'Maximum results to return (default: 20, max: 100)' },
            offset: { type: 'string', description: 'Pagination offset token from a previous response' },
          },
          required: ['workspace_id'],
        },
      },
      {
        name: 'get_portfolio',
        description: 'Get details of an Asana portfolio including its items and custom field settings',
        inputSchema: {
          type: 'object',
          properties: {
            portfolio_id: { type: 'string', description: 'Portfolio GID' },
          },
          required: ['portfolio_id'],
        },
      },
      {
        name: 'list_portfolio_items',
        description: 'List all projects (and sub-portfolios) contained in an Asana portfolio',
        inputSchema: {
          type: 'object',
          properties: {
            portfolio_id: { type: 'string', description: 'Portfolio GID' },
            limit: { type: 'number', description: 'Maximum results to return (default: 20, max: 100)' },
            offset: { type: 'string', description: 'Pagination offset token from a previous response' },
          },
          required: ['portfolio_id'],
        },
      },
      // ── Users ─────────────────────────────────────────────────────────────
      {
        name: 'get_user',
        description: 'Get details of a specific Asana user by GID, or use "me" for the authenticated user',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: { type: 'string', description: 'User GID, email, or "me" for the authenticated user' },
          },
          required: ['user_id'],
        },
      },
      {
        name: 'list_workspace_users',
        description: 'List all users in an Asana workspace or organization',
        inputSchema: {
          type: 'object',
          properties: {
            workspace_id: { type: 'string', description: 'Workspace GID to list users from' },
            limit: { type: 'number', description: 'Maximum results to return (default: 20, max: 100)' },
            offset: { type: 'string', description: 'Pagination offset token from a previous response' },
          },
          required: ['workspace_id'],
        },
      },
      // ── Tags ──────────────────────────────────────────────────────────────
      {
        name: 'list_tags',
        description: 'List all tags in an Asana workspace',
        inputSchema: {
          type: 'object',
          properties: {
            workspace_id: { type: 'string', description: 'Workspace GID to list tags from' },
            limit: { type: 'number', description: 'Maximum results to return (default: 20, max: 100)' },
            offset: { type: 'string', description: 'Pagination offset token from a previous response' },
          },
          required: ['workspace_id'],
        },
      },
      // ── Stories (Comments) ────────────────────────────────────────────────
      {
        name: 'list_task_stories',
        description: 'List all stories (comments and activity) on an Asana task',
        inputSchema: {
          type: 'object',
          properties: {
            task_id: { type: 'string', description: 'Task GID' },
            limit: { type: 'number', description: 'Maximum results to return (default: 20, max: 100)' },
            offset: { type: 'string', description: 'Pagination offset token from a previous response' },
          },
          required: ['task_id'],
        },
      },
      {
        name: 'create_task_story',
        description: 'Add a comment to an Asana task',
        inputSchema: {
          type: 'object',
          properties: {
            task_id: { type: 'string', description: 'Task GID to comment on' },
            text: { type: 'string', description: 'Comment text' },
          },
          required: ['task_id', 'text'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_workspaces':
          return await this.listWorkspaces(args);
        case 'list_tasks':
          return await this.listTasks(args);
        case 'get_task':
          return await this.getTask(args);
        case 'create_task':
          return await this.createTask(args);
        case 'update_task':
          return await this.updateTask(args);
        case 'delete_task':
          return await this.deleteTask(args);
        case 'search_tasks':
          return await this.searchTasks(args);
        case 'add_task_to_project':
          return await this.addTaskToProject(args);
        case 'list_task_subtasks':
          return await this.listTaskSubtasks(args);
        case 'create_subtask':
          return await this.createSubtask(args);
        case 'list_projects':
          return await this.listProjects(args);
        case 'get_project':
          return await this.getProject(args);
        case 'create_project':
          return await this.createProject(args);
        case 'update_project':
          return await this.updateProject(args);
        case 'delete_project':
          return await this.deleteProject(args);
        case 'list_sections':
          return await this.listSections(args);
        case 'create_section':
          return await this.createSection(args);
        case 'move_task_to_section':
          return await this.moveTaskToSection(args);
        case 'list_teams':
          return await this.listTeams(args);
        case 'list_team_members':
          return await this.listTeamMembers(args);
        case 'list_portfolios':
          return await this.listPortfolios(args);
        case 'get_portfolio':
          return await this.getPortfolio(args);
        case 'list_portfolio_items':
          return await this.listPortfolioItems(args);
        case 'get_user':
          return await this.getUser(args);
        case 'list_workspace_users':
          return await this.listWorkspaceUsers(args);
        case 'list_tags':
          return await this.listTags(args);
        case 'list_task_stories':
          return await this.listTaskStories(args);
        case 'create_task_story':
          return await this.createTaskStory(args);
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

  private get headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  private async fetchJSON(url: string, init?: RequestInit): Promise<ToolResult> {
    const response = await this.fetchWithRetry(url, { headers: this.headers, ...init });
    let data: unknown;
    try {
      data = await response.json();
    } catch {
      data = { status: response.status, statusText: response.statusText };
    }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: !response.ok };
  }

  private buildParams(pairs: Array<[string, string | number | boolean | undefined]>): URLSearchParams {
    const p = new URLSearchParams();
    for (const [k, v] of pairs) {
      if (v !== undefined && v !== null) p.set(k, String(v));
    }
    return p;
  }

  private async listWorkspaces(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.buildParams([['limit', args.limit as number], ['offset', args.offset as string]]);
    const qs = params.toString();
    return this.fetchJSON(`${this.baseUrl}/workspaces${qs ? `?${qs}` : ''}`);
  }

  private async listTasks(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.project_id) params.set('project', String(args.project_id));
    if (args.section_id) params.set('section', String(args.section_id));
    if (args.assignee) params.set('assignee', String(args.assignee));
    if (args.completed_since) params.set('completed_since', String(args.completed_since));
    params.set('limit', String((args.limit as number) ?? 20));
    if (args.offset) params.set('offset', String(args.offset));
    return this.fetchJSON(`${this.baseUrl}/tasks?${params}`);
  }

  private async getTask(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fetchJSON(`${this.baseUrl}/tasks/${encodeURIComponent(String(args.task_id))}`);
  }

  private async createTask(args: Record<string, unknown>): Promise<ToolResult> {
    const data: Record<string, unknown> = { name: args.name };
    if (args.workspace_id) data.workspace = args.workspace_id;
    if (args.project_id) data.projects = [args.project_id];
    if (args.section_id) data.memberships = [{ project: args.project_id, section: args.section_id }];
    if (args.notes) data.notes = args.notes;
    if (args.html_notes) data.html_notes = args.html_notes;
    if (args.assignee) data.assignee = args.assignee;
    if (args.due_on) data.due_on = args.due_on;
    if (args.due_at) data.due_at = args.due_at;
    if (args.start_on) data.start_on = args.start_on;
    if (args.followers) data.followers = args.followers;
    if (args.tags) data.tags = args.tags;
    return this.fetchJSON(`${this.baseUrl}/tasks`, {
      method: 'POST',
      body: JSON.stringify({ data }),
    });
  }

  private async updateTask(args: Record<string, unknown>): Promise<ToolResult> {
    const data: Record<string, unknown> = {};
    if (args.name !== undefined) data.name = args.name;
    if (args.notes !== undefined) data.notes = args.notes;
    if (args.assignee !== undefined) data.assignee = args.assignee;
    if (args.due_on !== undefined) data.due_on = args.due_on;
    if (args.due_at !== undefined) data.due_at = args.due_at;
    if (args.start_on !== undefined) data.start_on = args.start_on;
    if (args.completed !== undefined) data.completed = args.completed;
    return this.fetchJSON(`${this.baseUrl}/tasks/${encodeURIComponent(String(args.task_id))}`, {
      method: 'PUT',
      body: JSON.stringify({ data }),
    });
  }

  private async deleteTask(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fetchJSON(
      `${this.baseUrl}/tasks/${encodeURIComponent(String(args.task_id))}`,
      { method: 'DELETE' },
    );
  }

  private async searchTasks(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    params.set('workspace', String(args.workspace_id));
    params.set('limit', String((args.limit as number) ?? 20));
    if (args.text) params.set('text', String(args.text));
    if (args.assignee) params.set('assignee.any', String(args.assignee));
    if (args.completed !== undefined) params.set('completed', String(args.completed));
    if (args.due_on_before) params.set('due_on.before', String(args.due_on_before));
    if (args.due_on_after) params.set('due_on.after', String(args.due_on_after));
    if (args.projects && Array.isArray(args.projects)) {
      params.set('projects.any', (args.projects as string[]).join(','));
    }
    if (args.sections && Array.isArray(args.sections)) {
      params.set('sections.any', (args.sections as string[]).join(','));
    }
    return this.fetchJSON(`${this.baseUrl}/workspaces/${encodeURIComponent(String(args.workspace_id))}/tasks/search?${params}`);
  }

  private async addTaskToProject(args: Record<string, unknown>): Promise<ToolResult> {
    const data: Record<string, unknown> = { project: args.project_id };
    if (args.section_id) data.section = args.section_id;
    return this.fetchJSON(`${this.baseUrl}/tasks/${encodeURIComponent(String(args.task_id))}/addProject`, {
      method: 'POST',
      body: JSON.stringify({ data }),
    });
  }

  private async listTaskSubtasks(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.buildParams([['limit', args.limit as number], ['offset', args.offset as string]]);
    const qs = params.toString();
    return this.fetchJSON(`${this.baseUrl}/tasks/${encodeURIComponent(String(args.task_id))}/subtasks${qs ? `?${qs}` : ''}`);
  }

  private async createSubtask(args: Record<string, unknown>): Promise<ToolResult> {
    const data: Record<string, unknown> = { name: args.name };
    if (args.notes) data.notes = args.notes;
    if (args.assignee) data.assignee = args.assignee;
    if (args.due_on) data.due_on = args.due_on;
    return this.fetchJSON(`${this.baseUrl}/tasks/${encodeURIComponent(String(args.parent_task_id))}/subtasks`, {
      method: 'POST',
      body: JSON.stringify({ data }),
    });
  }

  private async listProjects(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.workspace_id) params.set('workspace', String(args.workspace_id));
    if (args.team_id) params.set('team', String(args.team_id));
    if (args.archived !== undefined) params.set('archived', String(args.archived));
    params.set('limit', String((args.limit as number) ?? 20));
    if (args.offset) params.set('offset', String(args.offset));
    return this.fetchJSON(`${this.baseUrl}/projects?${params}`);
  }

  private async getProject(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fetchJSON(`${this.baseUrl}/projects/${encodeURIComponent(String(args.project_id))}`);
  }

  private async createProject(args: Record<string, unknown>): Promise<ToolResult> {
    const data: Record<string, unknown> = { name: args.name };
    if (args.workspace_id) data.workspace = args.workspace_id;
    if (args.team_id) data.team = args.team_id;
    if (args.notes) data.notes = args.notes;
    if (args.color) data.color = args.color;
    if (args.default_view) data.default_view = args.default_view;
    if (args.public !== undefined) data.public = args.public;
    return this.fetchJSON(`${this.baseUrl}/projects`, {
      method: 'POST',
      body: JSON.stringify({ data }),
    });
  }

  private async updateProject(args: Record<string, unknown>): Promise<ToolResult> {
    const data: Record<string, unknown> = {};
    if (args.name !== undefined) data.name = args.name;
    if (args.notes !== undefined) data.notes = args.notes;
    if (args.color !== undefined) data.color = args.color;
    if (args.archived !== undefined) data.archived = args.archived;
    return this.fetchJSON(`${this.baseUrl}/projects/${encodeURIComponent(String(args.project_id))}`, {
      method: 'PUT',
      body: JSON.stringify({ data }),
    });
  }

  private async deleteProject(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fetchJSON(
      `${this.baseUrl}/projects/${encodeURIComponent(String(args.project_id))}`,
      { method: 'DELETE' },
    );
  }

  private async listSections(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.buildParams([['limit', args.limit as number], ['offset', args.offset as string]]);
    const qs = params.toString();
    return this.fetchJSON(`${this.baseUrl}/projects/${encodeURIComponent(String(args.project_id))}/sections${qs ? `?${qs}` : ''}`);
  }

  private async createSection(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fetchJSON(`${this.baseUrl}/projects/${encodeURIComponent(String(args.project_id))}/sections`, {
      method: 'POST',
      body: JSON.stringify({ data: { name: args.name } }),
    });
  }

  private async moveTaskToSection(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fetchJSON(`${this.baseUrl}/sections/${encodeURIComponent(String(args.section_id))}/addTask`, {
      method: 'POST',
      body: JSON.stringify({ data: { task: args.task_id } }),
    });
  }

  private async listTeams(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.buildParams([['limit', args.limit as number], ['offset', args.offset as string]]);
    const qs = params.toString();
    return this.fetchJSON(`${this.baseUrl}/organizations/${encodeURIComponent(String(args.workspace_id))}/teams${qs ? `?${qs}` : ''}`);
  }

  private async listTeamMembers(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.buildParams([['limit', args.limit as number], ['offset', args.offset as string]]);
    const qs = params.toString();
    return this.fetchJSON(`${this.baseUrl}/teams/${encodeURIComponent(String(args.team_id))}/users${qs ? `?${qs}` : ''}`);
  }

  private async listPortfolios(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams({ workspace: String(args.workspace_id) });
    if (args.owner) params.set('owner', String(args.owner));
    params.set('limit', String((args.limit as number) ?? 20));
    if (args.offset) params.set('offset', String(args.offset));
    return this.fetchJSON(`${this.baseUrl}/portfolios?${params}`);
  }

  private async getPortfolio(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fetchJSON(`${this.baseUrl}/portfolios/${encodeURIComponent(String(args.portfolio_id))}`);
  }

  private async listPortfolioItems(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.buildParams([['limit', args.limit as number], ['offset', args.offset as string]]);
    const qs = params.toString();
    return this.fetchJSON(`${this.baseUrl}/portfolios/${encodeURIComponent(String(args.portfolio_id))}/items${qs ? `?${qs}` : ''}`);
  }

  private async getUser(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fetchJSON(`${this.baseUrl}/users/${encodeURIComponent(String(args.user_id))}`);
  }

  private async listWorkspaceUsers(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.buildParams([['limit', args.limit as number], ['offset', args.offset as string]]);
    const qs = params.toString();
    return this.fetchJSON(`${this.baseUrl}/workspaces/${encodeURIComponent(String(args.workspace_id))}/users${qs ? `?${qs}` : ''}`);
  }

  private async listTags(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams({ workspace: String(args.workspace_id) });
    params.set('limit', String((args.limit as number) ?? 20));
    if (args.offset) params.set('offset', String(args.offset));
    return this.fetchJSON(`${this.baseUrl}/tags?${params}`);
  }

  private async listTaskStories(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.buildParams([['limit', args.limit as number], ['offset', args.offset as string]]);
    const qs = params.toString();
    return this.fetchJSON(`${this.baseUrl}/tasks/${encodeURIComponent(String(args.task_id))}/stories${qs ? `?${qs}` : ''}`);
  }

  private async createTaskStory(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fetchJSON(`${this.baseUrl}/tasks/${encodeURIComponent(String(args.task_id))}/stories`, {
      method: 'POST',
      body: JSON.stringify({ data: { text: args.text } }),
    });
  }

  static catalog() {
    return {
      name: 'asana',
      displayName: 'Asana',
      version: '1.0.0',
      category: 'collaboration' as const,
      keywords: ['asana', 'task', 'project management', 'workspace', 'team', 'portfolio', 'section', 'subtask', 'comment', 'productivity'],
      toolNames: [
        'list_workspaces',
        'list_tasks', 'get_task', 'create_task', 'update_task', 'delete_task',
        'search_tasks', 'add_task_to_project', 'list_task_subtasks', 'create_subtask',
        'list_projects', 'get_project', 'create_project', 'update_project', 'delete_project',
        'list_sections', 'create_section', 'move_task_to_section',
        'list_teams', 'list_team_members',
        'list_portfolios', 'get_portfolio', 'list_portfolio_items',
        'get_user', 'list_workspace_users',
        'list_tags',
        'list_task_stories', 'create_task_story',
      ],
      description: 'Project and task management: create and manage tasks, projects, sections, teams, portfolios, and comments across Asana workspaces.',
      author: 'protectnil' as const,
    };
  }
}

/**
 * Shortcut MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/useshortcut/mcp-server-shortcut — transport: streamable-HTTP (hosted) + stdio (local), auth: OAuth or API token
// Our adapter covers: 20 tools (core CRUD operations). Vendor MCP covers: 40+ tools (stories, epics, iterations,
//   labels, custom-fields, objectives, teams, projects, workflows, documents — full API surface).
// Recommendation: use-both — vendor MCP exposes 40+ tools with full coverage including documents, teams,
//   custom-fields, and file-upload tools our REST adapter does not cover. Our adapter provides air-gapped
//   fallback and API-token deployments without OAuth. REST-sourced tools (20): get_current_member, list_members,
//   search_stories, get_story, create_story, update_story, delete_story, create_story_comment, list_epics,
//   get_epic, create_epic, update_epic, list_epic_stories, list_workflows, list_iterations, get_iteration,
//   list_labels, create_label, list_objectives, search_epics.
//
// Base URL: https://api.app.shortcut.com/api/v3
// Auth: Header "Shortcut-Token: {token}" — generate at https://app.shortcut.com/settings/account/api-tokens
// Docs: https://developer.shortcut.com/api/rest/v3
// Rate limits: 200 requests/minute. Returns HTTP 429 when exceeded.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface ShortcutConfig {
  apiToken: string;
  baseUrl?: string;
}

export class ShortcutMCPServer extends MCPAdapterBase {
  private readonly apiToken: string;
  private readonly baseUrl: string;

  constructor(config: ShortcutConfig) {
    super();
    this.apiToken = config.apiToken;
    this.baseUrl = config.baseUrl || 'https://api.app.shortcut.com/api/v3';
  }

  static catalog() {
    return {
      name: 'shortcut',
      displayName: 'Shortcut',
      version: '1.0.0',
      category: 'devops',
      keywords: ['shortcut', 'clubhouse', 'story', 'epic', 'iteration', 'sprint', 'agile', 'project management', 'workflow', 'label', 'milestone'],
      toolNames: [
        'get_current_member', 'list_members', 'search_stories', 'get_story', 'create_story',
        'update_story', 'delete_story', 'create_story_comment', 'list_epics', 'get_epic',
        'create_epic', 'update_epic', 'list_epic_stories', 'list_workflows', 'list_iterations',
        'get_iteration', 'list_labels', 'create_label', 'list_objectives', 'search_epics',
      ],
      description: 'Agile project management: create and manage stories, epics, iterations, labels, and workflows in Shortcut (formerly Clubhouse).',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'get_current_member',
        description: 'Get the profile of the currently authenticated Shortcut member',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'list_members',
        description: 'List all members in the Shortcut workspace with their roles and profile info',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'search_stories',
        description: 'Search for stories using Shortcut query syntax with filters for owner, state, epic, label, type, and more',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query string. Supports: owner:username, state:name, epic:name, label:name, type:feature|bug|chore, is:unestimated, has:attachment',
            },
            pageSize: {
              type: 'number',
              description: 'Number of results per page (max 25, default: 25)',
            },
            next: {
              type: 'string',
              description: 'Pagination cursor from a previous search response',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'get_story',
        description: 'Get full details of a story by its numeric public ID including tasks, comments, and history',
        inputSchema: {
          type: 'object',
          properties: {
            storyPublicId: {
              type: 'number',
              description: 'The numeric public ID of the story (e.g., 1234)',
            },
          },
          required: ['storyPublicId'],
        },
      },
      {
        name: 'create_story',
        description: 'Create a new story in Shortcut with type, description, epic, iteration, owners, labels, and estimate',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Name of the story',
            },
            description: {
              type: 'string',
              description: 'Story description (Markdown supported)',
            },
            storyType: {
              type: 'string',
              description: 'Story type: feature, bug, or chore (default: feature)',
            },
            workflowStateId: {
              type: 'number',
              description: 'ID of the workflow state to place the story in',
            },
            epicId: {
              type: 'number',
              description: 'ID of the epic to add this story to',
            },
            iterationId: {
              type: 'number',
              description: 'ID of the iteration (sprint) to add this story to',
            },
            ownerIds: {
              type: 'array',
              description: 'Array of member UUIDs to assign as owners',
              items: { type: 'string' },
            },
            labels: {
              type: 'array',
              description: 'Array of label objects with a name field, e.g. [{"name":"bug"}]',
              items: { type: 'object' },
            },
            estimate: {
              type: 'number',
              description: 'Story point estimate',
            },
            deadline: {
              type: 'string',
              description: 'Story deadline as ISO 8601 date string (e.g. 2026-06-30T00:00:00Z)',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'update_story',
        description: 'Update an existing story: name, description, workflow state, epic, owners, estimate, labels, or deadline',
        inputSchema: {
          type: 'object',
          properties: {
            storyPublicId: {
              type: 'number',
              description: 'The numeric public ID of the story to update',
            },
            name: {
              type: 'string',
              description: 'New name for the story',
            },
            description: {
              type: 'string',
              description: 'New description for the story',
            },
            workflowStateId: {
              type: 'number',
              description: 'New workflow state ID',
            },
            epicId: {
              type: 'number',
              description: 'New epic ID (pass null to remove from epic)',
            },
            iterationId: {
              type: 'number',
              description: 'New iteration ID (pass null to remove from iteration)',
            },
            ownerIds: {
              type: 'array',
              description: 'New array of owner member UUIDs (replaces existing owners)',
              items: { type: 'string' },
            },
            estimate: {
              type: 'number',
              description: 'New story point estimate',
            },
            archived: {
              type: 'boolean',
              description: 'Set to true to archive the story',
            },
          },
          required: ['storyPublicId'],
        },
      },
      {
        name: 'delete_story',
        description: 'Permanently delete a story by its public ID. This action cannot be undone.',
        inputSchema: {
          type: 'object',
          properties: {
            storyPublicId: {
              type: 'number',
              description: 'The numeric public ID of the story to delete',
            },
          },
          required: ['storyPublicId'],
        },
      },
      {
        name: 'create_story_comment',
        description: 'Add a comment to an existing story',
        inputSchema: {
          type: 'object',
          properties: {
            storyPublicId: {
              type: 'number',
              description: 'The numeric public ID of the story to comment on',
            },
            text: {
              type: 'string',
              description: 'Comment text (Markdown supported)',
            },
          },
          required: ['storyPublicId', 'text'],
        },
      },
      {
        name: 'list_epics',
        description: 'List all epics in the workspace with optional archived filter',
        inputSchema: {
          type: 'object',
          properties: {
            includeArchived: {
              type: 'boolean',
              description: 'Whether to include archived epics (default: false)',
            },
          },
        },
      },
      {
        name: 'get_epic',
        description: 'Get full details of an epic by its ID including stats, stories, and state',
        inputSchema: {
          type: 'object',
          properties: {
            epicPublicId: {
              type: 'number',
              description: 'The numeric public ID of the epic',
            },
          },
          required: ['epicPublicId'],
        },
      },
      {
        name: 'create_epic',
        description: 'Create a new epic with name, description, state, milestone, labels, and deadline',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Name of the epic',
            },
            description: {
              type: 'string',
              description: 'Epic description (Markdown supported)',
            },
            epicStateId: {
              type: 'number',
              description: 'ID of the epic workflow state (use list_workflows to find state IDs)',
            },
            labels: {
              type: 'array',
              description: 'Array of label objects, e.g. [{"name":"Q2"}]',
              items: { type: 'object' },
            },
            deadline: {
              type: 'string',
              description: 'Epic deadline as ISO 8601 date string',
            },
            ownerIds: {
              type: 'array',
              description: 'Array of member UUIDs to assign as owners',
              items: { type: 'string' },
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'update_epic',
        description: 'Update an existing epic: name, description, state, labels, deadline, or archived status',
        inputSchema: {
          type: 'object',
          properties: {
            epicPublicId: {
              type: 'number',
              description: 'The numeric public ID of the epic to update',
            },
            name: {
              type: 'string',
              description: 'New name for the epic',
            },
            description: {
              type: 'string',
              description: 'New description for the epic',
            },
            epicStateId: {
              type: 'number',
              description: 'New epic workflow state ID',
            },
            archived: {
              type: 'boolean',
              description: 'Set to true to archive the epic',
            },
            deadline: {
              type: 'string',
              description: 'New deadline as ISO 8601 date string',
            },
          },
          required: ['epicPublicId'],
        },
      },
      {
        name: 'list_epic_stories',
        description: 'List all stories belonging to a specific epic',
        inputSchema: {
          type: 'object',
          properties: {
            epicPublicId: {
              type: 'number',
              description: 'The numeric public ID of the epic',
            },
            includeArchived: {
              type: 'boolean',
              description: 'Whether to include archived stories (default: false)',
            },
          },
          required: ['epicPublicId'],
        },
      },
      {
        name: 'list_workflows',
        description: 'List all workflows and their states in the workspace, including state IDs and types',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'list_iterations',
        description: 'List all iterations (sprints) in the workspace with dates and status',
        inputSchema: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              description: 'Filter by status: unstarted, started, done (default: returns all)',
            },
          },
        },
      },
      {
        name: 'get_iteration',
        description: 'Get details of a specific iteration including stories and velocity stats',
        inputSchema: {
          type: 'object',
          properties: {
            iterationPublicId: {
              type: 'number',
              description: 'The numeric public ID of the iteration',
            },
          },
          required: ['iterationPublicId'],
        },
      },
      {
        name: 'list_labels',
        description: 'List all labels in the workspace with usage counts',
        inputSchema: {
          type: 'object',
          properties: {
            slim: {
              type: 'boolean',
              description: 'If true, returns a slimmer label response without stats (default: false)',
            },
          },
        },
      },
      {
        name: 'create_label',
        description: 'Create a new label with optional color for organizing stories and epics',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Name of the label (must be unique within the workspace)',
            },
            color: {
              type: 'string',
              description: 'Hex color for the label (e.g. #ff0000)',
            },
            description: {
              type: 'string',
              description: 'Optional description of the label',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'list_objectives',
        description: 'List all objectives (formerly milestones) in the workspace',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'search_epics',
        description: 'Search for epics using Shortcut query syntax with filters for owner, state, label, and objective',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query string. Supports: owner:username, state:name, label:name, is:archived',
            },
            pageSize: {
              type: 'number',
              description: 'Number of results per page (max 25, default: 25)',
            },
            next: {
              type: 'string',
              description: 'Pagination cursor from a previous search response',
            },
          },
          required: ['query'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'get_current_member':
          return this.getCurrentMember();
        case 'list_members':
          return this.listMembers();
        case 'search_stories':
          return this.searchStories(args);
        case 'get_story':
          return this.getStory(args);
        case 'create_story':
          return this.createStory(args);
        case 'update_story':
          return this.updateStory(args);
        case 'delete_story':
          return this.deleteStory(args);
        case 'create_story_comment':
          return this.createStoryComment(args);
        case 'list_epics':
          return this.listEpics(args);
        case 'get_epic':
          return this.getEpic(args);
        case 'create_epic':
          return this.createEpic(args);
        case 'update_epic':
          return this.updateEpic(args);
        case 'list_epic_stories':
          return this.listEpicStories(args);
        case 'list_workflows':
          return this.listWorkflows();
        case 'list_iterations':
          return this.listIterations(args);
        case 'get_iteration':
          return this.getIteration(args);
        case 'list_labels':
          return this.listLabels(args);
        case 'create_label':
          return this.createLabel(args);
        case 'list_objectives':
          return this.listObjectives();
        case 'search_epics':
          return this.searchEpics(args);
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
      'Shortcut-Token': this.apiToken,
      'Content-Type': 'application/json',
    };
  }

  private async shortcutGet(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, { method: 'GET', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Shortcut returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async shortcutPost(path: string, body: unknown): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Shortcut returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async shortcutPut(path: string, body: unknown): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'PUT',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Shortcut returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async shortcutDelete(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, { method: 'DELETE', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: JSON.stringify({ success: true, status: response.status }) }], isError: false };
  }

  private async getCurrentMember(): Promise<ToolResult> {
    return this.shortcutGet('/member');
  }

  private async listMembers(): Promise<ToolResult> {
    return this.shortcutGet('/members');
  }

  private async searchStories(args: Record<string, unknown>): Promise<ToolResult> {
    const query = args.query as string;
    if (!query) return { content: [{ type: 'text', text: 'query is required' }], isError: true };
    let url = `/search/stories?query=${encodeURIComponent(query)}`;
    if (args.pageSize) url += `&page_size=${encodeURIComponent(args.pageSize as string)}`;
    if (args.next) url += `&next=${encodeURIComponent(args.next as string)}`;
    return this.shortcutGet(url);
  }

  private async getStory(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.storyPublicId as number;
    if (id === undefined || id === null) return { content: [{ type: 'text', text: 'storyPublicId is required' }], isError: true };
    return this.shortcutGet(`/stories/${id}`);
  }

  private async createStory(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name) return { content: [{ type: 'text', text: 'name is required' }], isError: true };
    const body: Record<string, unknown> = {
      name: args.name,
      story_type: (args.storyType as string) || 'feature',
    };
    if (args.description) body.description = args.description;
    if (args.workflowStateId) body.workflow_state_id = args.workflowStateId;
    if (args.epicId) body.epic_id = args.epicId;
    if (args.iterationId) body.iteration_id = args.iterationId;
    if (args.ownerIds) body.owner_ids = args.ownerIds;
    if (args.labels) body.labels = args.labels;
    if (args.estimate !== undefined) body.estimate = args.estimate;
    if (args.deadline) body.deadline = args.deadline;
    return this.shortcutPost('/stories', body);
  }

  private async updateStory(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.storyPublicId as number;
    if (id === undefined || id === null) return { content: [{ type: 'text', text: 'storyPublicId is required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.name) body.name = args.name;
    if (args.description !== undefined) body.description = args.description;
    if (args.workflowStateId) body.workflow_state_id = args.workflowStateId;
    if (args.epicId !== undefined) body.epic_id = args.epicId;
    if (args.iterationId !== undefined) body.iteration_id = args.iterationId;
    if (args.ownerIds) body.owner_ids = args.ownerIds;
    if (args.estimate !== undefined) body.estimate = args.estimate;
    if (typeof args.archived === 'boolean') body.archived = args.archived;
    return this.shortcutPut(`/stories/${id}`, body);
  }

  private async deleteStory(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.storyPublicId as number;
    if (id === undefined || id === null) return { content: [{ type: 'text', text: 'storyPublicId is required' }], isError: true };
    return this.shortcutDelete(`/stories/${id}`);
  }

  private async createStoryComment(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.storyPublicId as number;
    if (id === undefined || id === null) return { content: [{ type: 'text', text: 'storyPublicId is required' }], isError: true };
    if (!args.text) return { content: [{ type: 'text', text: 'text is required' }], isError: true };
    return this.shortcutPost(`/stories/${id}/comments`, { text: args.text });
  }

  private async listEpics(_args: Record<string, unknown>): Promise<ToolResult> {
    return this.shortcutGet('/epics');
  }

  private async getEpic(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.epicPublicId as number;
    if (id === undefined || id === null) return { content: [{ type: 'text', text: 'epicPublicId is required' }], isError: true };
    return this.shortcutGet(`/epics/${id}`);
  }

  private async createEpic(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name) return { content: [{ type: 'text', text: 'name is required' }], isError: true };
    const body: Record<string, unknown> = { name: args.name };
    if (args.description) body.description = args.description;
    if (args.epicStateId) body.epic_state_id = args.epicStateId;
    if (args.labels) body.labels = args.labels;
    if (args.deadline) body.deadline = args.deadline;
    if (args.ownerIds) body.owner_ids = args.ownerIds;
    return this.shortcutPost('/epics', body);
  }

  private async updateEpic(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.epicPublicId as number;
    if (id === undefined || id === null) return { content: [{ type: 'text', text: 'epicPublicId is required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.name) body.name = args.name;
    if (args.description !== undefined) body.description = args.description;
    if (args.epicStateId) body.epic_state_id = args.epicStateId;
    if (typeof args.archived === 'boolean') body.archived = args.archived;
    if (args.deadline !== undefined) body.deadline = args.deadline;
    return this.shortcutPut(`/epics/${id}`, body);
  }

  private async listEpicStories(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.epicPublicId as number;
    if (id === undefined || id === null) return { content: [{ type: 'text', text: 'epicPublicId is required' }], isError: true };
    const params = args.includeArchived === true ? '?includes_description=true' : '';
    return this.shortcutGet(`/epics/${id}/stories${params}`);
  }

  private async listWorkflows(): Promise<ToolResult> {
    return this.shortcutGet('/workflows');
  }

  private async listIterations(_args: Record<string, unknown>): Promise<ToolResult> {
    return this.shortcutGet('/iterations');
  }

  private async getIteration(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.iterationPublicId as number;
    if (id === undefined || id === null) return { content: [{ type: 'text', text: 'iterationPublicId is required' }], isError: true };
    return this.shortcutGet(`/iterations/${id}`);
  }

  private async listLabels(args: Record<string, unknown>): Promise<ToolResult> {
    const slim = args.slim === true ? '?slim=true' : '';
    return this.shortcutGet(`/labels${slim}`);
  }

  private async createLabel(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name) return { content: [{ type: 'text', text: 'name is required' }], isError: true };
    const body: Record<string, unknown> = { name: args.name };
    if (args.color) body.color = args.color;
    if (args.description) body.description = args.description;
    return this.shortcutPost('/labels', body);
  }

  private async listObjectives(): Promise<ToolResult> {
    return this.shortcutGet('/objectives');
  }

  private async searchEpics(args: Record<string, unknown>): Promise<ToolResult> {
    const query = args.query as string;
    if (!query) return { content: [{ type: 'text', text: 'query is required' }], isError: true };
    let url = `/search/epics?query=${encodeURIComponent(query)}`;
    if (args.pageSize) url += `&page_size=${encodeURIComponent(args.pageSize as string)}`;
    if (args.next) url += `&next=${encodeURIComponent(args.next as string)}`;
    return this.shortcutGet(url);
  }
}

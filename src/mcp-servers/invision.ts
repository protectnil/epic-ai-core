/**
 * InVision MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// No official InVision MCP server was found on GitHub.
//
// ⚠️  IMPORTANT: InVision design collaboration services were permanently shut down
// on December 31, 2024. The InVision REST API is no longer active. This adapter
// documents the last-known API surface for archival purposes and to support
// teams migrating historical data or maintaining integrations that referenced
// the InVision platform. All tool calls against the live service will fail.
//
// Base URL: https://api.invisionapp.com (decommissioned 2024-12-31)
// Auth: Bearer token via X-Auth-Token header (deprecated)
// Docs: https://developer.invisionapp.com/docs (archived)
// Rate limits: Undocumented at decommission time
//
// Migration: InVision sold Freehand to Miro. Teams migrating from InVision
// should evaluate the Figma or Miro adapters for ongoing design collaboration.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface InVisionConfig {
  apiToken: string;
  baseUrl?: string;
}

export class InVisionMCPServer extends MCPAdapterBase {
  private readonly apiToken: string;
  private readonly baseUrl: string;

  constructor(config: InVisionConfig) {
    super();
    this.apiToken = config.apiToken;
    this.baseUrl = config.baseUrl || 'https://api.invisionapp.com';
  }

  static catalog() {
    return {
      name: 'invision',
      displayName: 'InVision',
      version: '1.0.0',
      category: 'misc' as const,
      keywords: [
        'invision', 'design', 'prototype', 'screen', 'comment', 'collaboration',
        'ux', 'ui', 'freehand', 'handoff', 'design-system', 'project', 'archived',
      ],
      toolNames: [
        'list_projects', 'get_project', 'list_screens', 'get_screen',
        'list_comments', 'add_comment', 'resolve_comment',
        'list_prototypes', 'get_prototype',
        'list_team_members', 'get_team_member',
        'list_assets', 'get_asset',
      ],
      description: 'InVision design collaboration: projects, screens, prototypes, comments, and team members. NOTE: InVision shut down December 31, 2024 — API is decommissioned.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_projects',
        description: 'List InVision projects accessible to the authenticated user with optional filter by type or archived status',
        inputSchema: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              description: 'Filter by project type: prototype, board, freehand (default: all)',
            },
            archived: {
              type: 'boolean',
              description: 'Include archived projects (default: false)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of projects to return (default: 25, max: 100)',
            },
            offset: {
              type: 'number',
              description: 'Offset for pagination (default: 0)',
            },
          },
        },
      },
      {
        name: 'get_project',
        description: 'Get detailed information about a specific InVision project by its ID including collaborators and settings',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: {
              type: 'string',
              description: 'The unique identifier of the InVision project',
            },
          },
          required: ['project_id'],
        },
      },
      {
        name: 'list_screens',
        description: 'List all screens in an InVision project with their status, order, and thumbnail URLs',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: {
              type: 'string',
              description: 'Project ID to list screens for',
            },
            archived: {
              type: 'boolean',
              description: 'Include archived screens (default: false)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of screens to return (default: 50)',
            },
            offset: {
              type: 'number',
              description: 'Offset for pagination (default: 0)',
            },
          },
          required: ['project_id'],
        },
      },
      {
        name: 'get_screen',
        description: 'Get detailed information about a specific InVision screen including hotspots, links, and dimensions',
        inputSchema: {
          type: 'object',
          properties: {
            screen_id: {
              type: 'string',
              description: 'The unique identifier of the InVision screen',
            },
          },
          required: ['screen_id'],
        },
      },
      {
        name: 'list_comments',
        description: 'List comments on an InVision screen with commenter info, position, and resolution status',
        inputSchema: {
          type: 'object',
          properties: {
            screen_id: {
              type: 'string',
              description: 'Screen ID to retrieve comments for',
            },
            resolved: {
              type: 'boolean',
              description: 'Filter by resolution status: true (resolved), false (unresolved), omit for all',
            },
          },
          required: ['screen_id'],
        },
      },
      {
        name: 'add_comment',
        description: 'Add a comment to an InVision screen at a specific x,y coordinate position',
        inputSchema: {
          type: 'object',
          properties: {
            screen_id: {
              type: 'string',
              description: 'Screen ID to comment on',
            },
            comment: {
              type: 'string',
              description: 'Text content of the comment',
            },
            x: {
              type: 'number',
              description: 'Horizontal position of the comment pin (pixels from left edge)',
            },
            y: {
              type: 'number',
              description: 'Vertical position of the comment pin (pixels from top edge)',
            },
          },
          required: ['screen_id', 'comment'],
        },
      },
      {
        name: 'resolve_comment',
        description: 'Mark an InVision comment as resolved or re-open a previously resolved comment',
        inputSchema: {
          type: 'object',
          properties: {
            comment_id: {
              type: 'string',
              description: 'Comment ID to update',
            },
            resolved: {
              type: 'boolean',
              description: 'Set to true to resolve, false to re-open (default: true)',
            },
          },
          required: ['comment_id'],
        },
      },
      {
        name: 'list_prototypes',
        description: 'List prototypes (linked screen flows) within an InVision project',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: {
              type: 'string',
              description: 'Project ID to list prototypes for',
            },
          },
          required: ['project_id'],
        },
      },
      {
        name: 'get_prototype',
        description: 'Get prototype details including screen flow, hotspots, transitions, and share URL',
        inputSchema: {
          type: 'object',
          properties: {
            prototype_id: {
              type: 'string',
              description: 'The unique identifier of the prototype',
            },
          },
          required: ['prototype_id'],
        },
      },
      {
        name: 'list_team_members',
        description: 'List team members in the InVision workspace with their roles and invitation status',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of team members to return (default: 50)',
            },
            offset: {
              type: 'number',
              description: 'Offset for pagination (default: 0)',
            },
          },
        },
      },
      {
        name: 'get_team_member',
        description: 'Get profile and role information for a specific InVision team member by user ID',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: {
              type: 'string',
              description: 'The unique identifier of the team member',
            },
          },
          required: ['user_id'],
        },
      },
      {
        name: 'list_assets',
        description: 'List design assets and files uploaded to an InVision project or design system library',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: {
              type: 'string',
              description: 'Project ID to list assets for (omit to list workspace-level assets)',
            },
            type: {
              type: 'string',
              description: 'Filter by asset type: image, font, icon (default: all)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of assets to return (default: 50)',
            },
          },
        },
      },
      {
        name: 'get_asset',
        description: 'Get metadata and download URL for a specific InVision design asset',
        inputSchema: {
          type: 'object',
          properties: {
            asset_id: {
              type: 'string',
              description: 'The unique identifier of the asset',
            },
          },
          required: ['asset_id'],
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
        case 'list_screens':
          return this.listScreens(args);
        case 'get_screen':
          return this.getScreen(args);
        case 'list_comments':
          return this.listComments(args);
        case 'add_comment':
          return this.addComment(args);
        case 'resolve_comment':
          return this.resolveComment(args);
        case 'list_prototypes':
          return this.listPrototypes(args);
        case 'get_prototype':
          return this.getPrototype(args);
        case 'list_team_members':
          return this.listTeamMembers(args);
        case 'get_team_member':
          return this.getTeamMember(args);
        case 'list_assets':
          return this.listAssets(args);
        case 'get_asset':
          return this.getAsset(args);
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
      'X-Auth-Token': this.apiToken,
      'Content-Type': 'application/json',
    };
  }

  private async apiGet(path: string, params: Record<string, string> = {}): Promise<ToolResult> {
    const qs = new URLSearchParams(params).toString();
    const url = `${this.baseUrl}${path}${qs ? '?' + qs : ''}`;
    const response = await this.fetchWithRetry(url, { method: 'GET', headers: this.headers });
    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apiPost(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apiPut(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'PUT',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listProjects(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      limit: String((args.limit as number) ?? 25),
      offset: String((args.offset as number) ?? 0),
    };
    if (args.type) params.type = args.type as string;
    if (typeof args.archived === 'boolean') params.archived = String(args.archived);
    return this.apiGet('/d/api/v1/projects', params);
  }

  private async getProject(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.project_id) return { content: [{ type: 'text', text: 'project_id is required' }], isError: true };
    return this.apiGet(`/d/api/v1/projects/${encodeURIComponent(args.project_id as string)}`);
  }

  private async listScreens(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.project_id) return { content: [{ type: 'text', text: 'project_id is required' }], isError: true };
    const params: Record<string, string> = {
      limit: String((args.limit as number) ?? 50),
      offset: String((args.offset as number) ?? 0),
    };
    if (typeof args.archived === 'boolean') params.archived = String(args.archived);
    return this.apiGet(`/d/api/v1/projects/${encodeURIComponent(args.project_id as string)}/screens`, params);
  }

  private async getScreen(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.screen_id) return { content: [{ type: 'text', text: 'screen_id is required' }], isError: true };
    return this.apiGet(`/d/api/v1/screens/${encodeURIComponent(args.screen_id as string)}`);
  }

  private async listComments(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.screen_id) return { content: [{ type: 'text', text: 'screen_id is required' }], isError: true };
    const params: Record<string, string> = {};
    if (typeof args.resolved === 'boolean') params.resolved = String(args.resolved);
    return this.apiGet(`/d/api/v1/screens/${encodeURIComponent(args.screen_id as string)}/comments`, params);
  }

  private async addComment(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.screen_id || !args.comment) return { content: [{ type: 'text', text: 'screen_id and comment are required' }], isError: true };
    const body: Record<string, unknown> = { comment: args.comment };
    if (typeof args.x === 'number') body.x = args.x;
    if (typeof args.y === 'number') body.y = args.y;
    return this.apiPost(`/d/api/v1/screens/${encodeURIComponent(args.screen_id as string)}/comments`, body);
  }

  private async resolveComment(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.comment_id) return { content: [{ type: 'text', text: 'comment_id is required' }], isError: true };
    const resolved = typeof args.resolved === 'boolean' ? args.resolved : true;
    return this.apiPut(`/d/api/v1/comments/${encodeURIComponent(args.comment_id as string)}`, { resolved });
  }

  private async listPrototypes(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.project_id) return { content: [{ type: 'text', text: 'project_id is required' }], isError: true };
    return this.apiGet(`/d/api/v1/projects/${encodeURIComponent(args.project_id as string)}/prototypes`);
  }

  private async getPrototype(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.prototype_id) return { content: [{ type: 'text', text: 'prototype_id is required' }], isError: true };
    return this.apiGet(`/d/api/v1/prototypes/${encodeURIComponent(args.prototype_id as string)}`);
  }

  private async listTeamMembers(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      limit: String((args.limit as number) ?? 50),
      offset: String((args.offset as number) ?? 0),
    };
    return this.apiGet('/d/api/v1/teams/members', params);
  }

  private async getTeamMember(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.user_id) return { content: [{ type: 'text', text: 'user_id is required' }], isError: true };
    return this.apiGet(`/d/api/v1/users/${encodeURIComponent(args.user_id as string)}`);
  }

  private async listAssets(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      limit: String((args.limit as number) ?? 50),
    };
    if (args.type) params.type = args.type as string;
    const basePath = args.project_id
      ? `/d/api/v1/projects/${encodeURIComponent(args.project_id as string)}/assets`
      : '/d/api/v1/assets';
    return this.apiGet(basePath, params);
  }

  private async getAsset(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.asset_id) return { content: [{ type: 'text', text: 'asset_id is required' }], isError: true };
    return this.apiGet(`/d/api/v1/assets/${encodeURIComponent(args.asset_id as string)}`);
  }
}

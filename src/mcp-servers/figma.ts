/**
 * Figma MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://developers.figma.com/docs/figma-mcp-server/ — official Figma MCP server,
// generally available as of 2025. Remote server (streamable-HTTP) at https://mcp.figma.com/mcp.
// Auth: Figma OAuth2. Actively maintained by Figma. Exposes 16 tools (get_design_context,
// get_variable_defs, get_code_connect_map, add_code_connect_map, get_screenshot,
// create_design_system_rules, generate_figma_design, use_figma, generate_diagram,
// create_new_file, search_design_system, get_metadata, get_figjam, get_code_connect_suggestions,
// send_code_connect_mappings, whoami). Focused on design-context extraction and canvas write-back
// for agentic coding workflows — does NOT cover REST API operations (webhooks, team components,
// team styles, projects, file versions, image fills, image exports).
// Our adapter covers: 16 tools (REST API surface). Vendor MCP covers: 16 tools (design context).
// Integration: use-both — MCP has unique canvas/code-generation tools not in REST; REST adapter
// covers webhooks, team browsing, image export, file history not in MCP.
//
// Base URL: https://api.figma.com/v1
// Auth: Personal Access Token (PAT) via X-Figma-Token header, or OAuth2 Bearer token
// Docs: https://developers.figma.com/docs/rest-api/
// Rate limits: 60 req/min (read), 30 req/min (write) per token — updated Nov 2025

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface FigmaConfig {
  /** Personal Access Token or OAuth2 access token */
  pat: string;
  /** Override base URL (default: https://api.figma.com/v1) */
  baseUrl?: string;
}

export class FigmaMCPServer extends MCPAdapterBase {
  private readonly pat: string;
  private readonly baseUrl: string;

  constructor(config: FigmaConfig) {
    super();
    this.pat = config.pat;
    this.baseUrl = (config.baseUrl ?? 'https://api.figma.com/v1').replace(/\/$/, '');
  }

  static catalog() {
    return {
      name: 'figma',
      displayName: 'Figma',
      version: '1.0.0',
      category: 'misc' as const,
      keywords: [
        'figma', 'design', 'ui', 'ux', 'prototype', 'wireframe', 'component', 'style',
        'variable', 'design system', 'frame', 'layer', 'node', 'comment', 'webhook',
        'team', 'project', 'file', 'version', 'image', 'export',
      ],
      toolNames: [
        'get_file', 'get_file_nodes', 'list_projects', 'get_project_files',
        'get_file_versions', 'get_images', 'get_image_fills', 'get_comments',
        'post_comment', 'delete_comment', 'get_team_components', 'get_file_components',
        'get_team_styles', 'get_local_variables', 'list_webhooks', 'create_webhook',
      ],
      description: 'Figma design platform: read files and nodes, export images, manage comments, browse team components and styles, inspect design variables, and configure webhooks.',
      author: 'protectnil' as const,
    };
  }

  private get authHeaders(): Record<string, string> {
    return {
      'X-Figma-Token': this.pat,
      'Content-Type': 'application/json',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'get_file',
        description: 'Retrieve a Figma file by key including its full document tree, components, and styles with optional depth limit',
        inputSchema: {
          type: 'object',
          properties: {
            file_key: {
              type: 'string',
              description: 'The unique key of the Figma file (from the file URL)',
            },
            depth: {
              type: 'number',
              description: 'Depth of the document tree to return (default: full depth; use 1-3 for large files)',
            },
            version: {
              type: 'string',
              description: 'Specific version ID to retrieve (default: latest)',
            },
          },
          required: ['file_key'],
        },
      },
      {
        name: 'get_file_nodes',
        description: 'Retrieve specific nodes from a Figma file by their node IDs, more efficient than fetching the whole file',
        inputSchema: {
          type: 'object',
          properties: {
            file_key: {
              type: 'string',
              description: 'The unique key of the Figma file',
            },
            ids: {
              type: 'string',
              description: 'Comma-separated list of node IDs to retrieve (e.g. "1:2,3:4,5:6")',
            },
            depth: {
              type: 'number',
              description: 'Depth of the subtree returned for each node (default: full)',
            },
          },
          required: ['file_key', 'ids'],
        },
      },
      {
        name: 'list_projects',
        description: 'List all projects in a Figma team',
        inputSchema: {
          type: 'object',
          properties: {
            team_id: {
              type: 'string',
              description: 'The Figma team ID (visible in team URL)',
            },
          },
          required: ['team_id'],
        },
      },
      {
        name: 'get_project_files',
        description: 'List all files in a Figma project with optional branch metadata',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: {
              type: 'string',
              description: 'The Figma project ID',
            },
            branch_data: {
              type: 'boolean',
              description: 'If true, return branch metadata for each file that has branches (default: false)',
            },
          },
          required: ['project_id'],
        },
      },
      {
        name: 'get_file_versions',
        description: 'Get the full version history for a Figma file including author and description of each version',
        inputSchema: {
          type: 'object',
          properties: {
            file_key: {
              type: 'string',
              description: 'The unique key of the Figma file',
            },
          },
          required: ['file_key'],
        },
      },
      {
        name: 'get_images',
        description: 'Render and retrieve export URLs for specific nodes in a Figma file as PNG, SVG, JPG, or PDF',
        inputSchema: {
          type: 'object',
          properties: {
            file_key: {
              type: 'string',
              description: 'The unique key of the Figma file',
            },
            ids: {
              type: 'string',
              description: 'Comma-separated list of node IDs to render',
            },
            scale: {
              type: 'number',
              description: 'Image export scale factor (default: 1, range: 0.01–4)',
            },
            format: {
              type: 'string',
              description: 'Export format: jpg, png, svg, pdf (default: png)',
            },
            svg_include_id: {
              type: 'boolean',
              description: 'For SVG exports, include node IDs as element IDs (default: false)',
            },
          },
          required: ['file_key', 'ids'],
        },
      },
      {
        name: 'get_image_fills',
        description: 'Get download URLs for all images used as fills in a Figma file',
        inputSchema: {
          type: 'object',
          properties: {
            file_key: {
              type: 'string',
              description: 'The unique key of the Figma file',
            },
          },
          required: ['file_key'],
        },
      },
      {
        name: 'get_comments',
        description: 'Get all comments on a Figma file including replies and resolved state',
        inputSchema: {
          type: 'object',
          properties: {
            file_key: {
              type: 'string',
              description: 'The unique key of the Figma file',
            },
            as_md: {
              type: 'boolean',
              description: 'If true, return comment body as Markdown (default: false)',
            },
          },
          required: ['file_key'],
        },
      },
      {
        name: 'post_comment',
        description: 'Post a new comment on a Figma file, optionally anchored to a specific node or position',
        inputSchema: {
          type: 'object',
          properties: {
            file_key: {
              type: 'string',
              description: 'The unique key of the Figma file',
            },
            message: {
              type: 'string',
              description: 'The comment text to post',
            },
            node_id: {
              type: 'string',
              description: 'Optional node ID to anchor the comment to a specific element',
            },
            client_meta: {
              type: 'object',
              description: 'Optional position metadata: { x, y } for canvas coordinates or { node_id, node_offset: { x, y } } for node-relative',
              properties: {},
            },
          },
          required: ['file_key', 'message'],
        },
      },
      {
        name: 'delete_comment',
        description: 'Delete a comment from a Figma file by comment ID',
        inputSchema: {
          type: 'object',
          properties: {
            file_key: {
              type: 'string',
              description: 'The unique key of the Figma file',
            },
            comment_id: {
              type: 'string',
              description: 'The ID of the comment to delete',
            },
          },
          required: ['file_key', 'comment_id'],
        },
      },
      {
        name: 'get_team_components',
        description: 'Get all published components in a Figma team library with metadata and file keys',
        inputSchema: {
          type: 'object',
          properties: {
            team_id: {
              type: 'string',
              description: 'The Figma team ID',
            },
            page_size: {
              type: 'number',
              description: 'Number of components per page (default: 30, max: 100)',
            },
            after: {
              type: 'number',
              description: 'Cursor for pagination — use the cursor value from the previous response',
            },
          },
          required: ['team_id'],
        },
      },
      {
        name: 'get_file_components',
        description: 'Get all local components defined in a specific Figma file',
        inputSchema: {
          type: 'object',
          properties: {
            file_key: {
              type: 'string',
              description: 'The unique key of the Figma file',
            },
          },
          required: ['file_key'],
        },
      },
      {
        name: 'get_team_styles',
        description: 'Get all published styles (colors, typography, effects, grids) in a Figma team library',
        inputSchema: {
          type: 'object',
          properties: {
            team_id: {
              type: 'string',
              description: 'The Figma team ID',
            },
            page_size: {
              type: 'number',
              description: 'Number of styles per page (default: 30, max: 100)',
            },
            after: {
              type: 'number',
              description: 'Cursor for pagination — use the cursor value from the previous response',
            },
          },
          required: ['team_id'],
        },
      },
      {
        name: 'get_local_variables',
        description: 'Get all local variables and variable collections defined in a Figma file',
        inputSchema: {
          type: 'object',
          properties: {
            file_key: {
              type: 'string',
              description: 'The unique key of the Figma file',
            },
          },
          required: ['file_key'],
        },
      },
      {
        name: 'list_webhooks',
        description: 'List all webhooks configured for a Figma team',
        inputSchema: {
          type: 'object',
          properties: {
            team_id: {
              type: 'string',
              description: 'The Figma team ID to list webhooks for',
            },
          },
          required: ['team_id'],
        },
      },
      {
        name: 'create_webhook',
        description: 'Create a new webhook subscription for Figma events on a team (file_update, publish, delete, etc.)',
        inputSchema: {
          type: 'object',
          properties: {
            team_id: {
              type: 'string',
              description: 'The Figma team ID to create the webhook for',
            },
            event_type: {
              type: 'string',
              description: 'Event type to subscribe to: FILE_UPDATE, FILE_DELETE, FILE_VERSION_UPDATE, LIBRARY_PUBLISH, FILE_COMMENT',
            },
            endpoint: {
              type: 'string',
              description: 'HTTPS URL that Figma will POST event payloads to',
            },
            passcode: {
              type: 'string',
              description: 'Passcode included in webhook payloads for verification',
            },
            description: {
              type: 'string',
              description: 'Optional human-readable description for the webhook',
            },
          },
          required: ['team_id', 'event_type', 'endpoint', 'passcode'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'get_file':
          return this.getFile(args);
        case 'get_file_nodes':
          return this.getFileNodes(args);
        case 'list_projects':
          return this.listProjects(args);
        case 'get_project_files':
          return this.getProjectFiles(args);
        case 'get_file_versions':
          return this.getFileVersions(args);
        case 'get_images':
          return this.getImages(args);
        case 'get_image_fills':
          return this.getImageFills(args);
        case 'get_comments':
          return this.getComments(args);
        case 'post_comment':
          return this.postComment(args);
        case 'delete_comment':
          return this.deleteComment(args);
        case 'get_team_components':
          return this.getTeamComponents(args);
        case 'get_file_components':
          return this.getFileComponents(args);
        case 'get_team_styles':
          return this.getTeamStyles(args);
        case 'get_local_variables':
          return this.getLocalVariables(args);
        case 'list_webhooks':
          return this.listWebhooks(args);
        case 'create_webhook':
          return this.createWebhook(args);
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

  private async getFile(args: Record<string, unknown>): Promise<ToolResult> {
    const fileKey = args.file_key as string;
    if (!fileKey) {
      return { content: [{ type: 'text', text: 'file_key is required' }], isError: true };
    }

    const params = new URLSearchParams();
    if (args.depth !== undefined) params.set('depth', String(args.depth));
    if (args.version) params.set('version', args.version as string);
    const qs = params.toString() ? `?${params.toString()}` : '';

    const response = await this.fetchWithRetry(`${this.baseUrl}/files/${encodeURIComponent(fileKey)}${qs}`, {
      method: 'GET',
      headers: this.authHeaders,
    });

    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to get file: ${response.status} ${response.statusText}` }], isError: true };
    }

    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async getFileNodes(args: Record<string, unknown>): Promise<ToolResult> {
    const fileKey = args.file_key as string;
    const ids = args.ids as string;
    if (!fileKey || !ids) {
      return { content: [{ type: 'text', text: 'file_key and ids are required' }], isError: true };
    }

    const params = new URLSearchParams({ ids });
    if (args.depth !== undefined) params.set('depth', String(args.depth));

    const response = await this.fetchWithRetry(`${this.baseUrl}/files/${encodeURIComponent(fileKey)}/nodes?${params.toString()}`, {
      method: 'GET',
      headers: this.authHeaders,
    });

    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to get file nodes: ${response.status} ${response.statusText}` }], isError: true };
    }

    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async listProjects(args: Record<string, unknown>): Promise<ToolResult> {
    const teamId = args.team_id as string;
    if (!teamId) {
      return { content: [{ type: 'text', text: 'team_id is required' }], isError: true };
    }

    const response = await this.fetchWithRetry(`${this.baseUrl}/teams/${encodeURIComponent(teamId)}/projects`, {
      method: 'GET',
      headers: this.authHeaders,
    });

    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to list projects: ${response.status} ${response.statusText}` }], isError: true };
    }

    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async getProjectFiles(args: Record<string, unknown>): Promise<ToolResult> {
    const projectId = args.project_id as string;
    if (!projectId) {
      return { content: [{ type: 'text', text: 'project_id is required' }], isError: true };
    }

    const params = new URLSearchParams();
    if (args.branch_data) params.set('branch_data', 'true');
    const qs = params.toString() ? `?${params.toString()}` : '';

    const response = await this.fetchWithRetry(`${this.baseUrl}/projects/${encodeURIComponent(projectId)}/files${qs}`, {
      method: 'GET',
      headers: this.authHeaders,
    });

    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to get project files: ${response.status} ${response.statusText}` }], isError: true };
    }

    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async getFileVersions(args: Record<string, unknown>): Promise<ToolResult> {
    const fileKey = args.file_key as string;
    if (!fileKey) {
      return { content: [{ type: 'text', text: 'file_key is required' }], isError: true };
    }

    const response = await this.fetchWithRetry(`${this.baseUrl}/files/${encodeURIComponent(fileKey)}/versions`, {
      method: 'GET',
      headers: this.authHeaders,
    });

    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to get file versions: ${response.status} ${response.statusText}` }], isError: true };
    }

    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async getImages(args: Record<string, unknown>): Promise<ToolResult> {
    const fileKey = args.file_key as string;
    const ids = args.ids as string;
    if (!fileKey || !ids) {
      return { content: [{ type: 'text', text: 'file_key and ids are required' }], isError: true };
    }

    const params = new URLSearchParams({ ids });
    if (args.scale !== undefined) params.set('scale', String(args.scale));
    if (args.format) params.set('format', args.format as string);
    if (args.svg_include_id) params.set('svg_include_id', 'true');

    const response = await this.fetchWithRetry(`${this.baseUrl}/images/${encodeURIComponent(fileKey)}?${params.toString()}`, {
      method: 'GET',
      headers: this.authHeaders,
    });

    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to get images: ${response.status} ${response.statusText}` }], isError: true };
    }

    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async getImageFills(args: Record<string, unknown>): Promise<ToolResult> {
    const fileKey = args.file_key as string;
    if (!fileKey) {
      return { content: [{ type: 'text', text: 'file_key is required' }], isError: true };
    }

    const response = await this.fetchWithRetry(`${this.baseUrl}/files/${encodeURIComponent(fileKey)}/images`, {
      method: 'GET',
      headers: this.authHeaders,
    });

    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to get image fills: ${response.status} ${response.statusText}` }], isError: true };
    }

    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async getComments(args: Record<string, unknown>): Promise<ToolResult> {
    const fileKey = args.file_key as string;
    if (!fileKey) {
      return { content: [{ type: 'text', text: 'file_key is required' }], isError: true };
    }

    const params = new URLSearchParams();
    if (args.as_md) params.set('as_md', 'true');
    const qs = params.toString() ? `?${params.toString()}` : '';

    const response = await this.fetchWithRetry(`${this.baseUrl}/files/${encodeURIComponent(fileKey)}/comments${qs}`, {
      method: 'GET',
      headers: this.authHeaders,
    });

    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to get comments: ${response.status} ${response.statusText}` }], isError: true };
    }

    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async postComment(args: Record<string, unknown>): Promise<ToolResult> {
    const fileKey = args.file_key as string;
    const message = args.message as string;
    if (!fileKey || !message) {
      return { content: [{ type: 'text', text: 'file_key and message are required' }], isError: true };
    }

    const body: Record<string, unknown> = { message };
    if (args.node_id) body.node_id = args.node_id;
    if (args.client_meta) body.client_meta = args.client_meta;

    const response = await this.fetchWithRetry(`${this.baseUrl}/files/${encodeURIComponent(fileKey)}/comments`, {
      method: 'POST',
      headers: this.authHeaders,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to post comment: ${response.status} ${response.statusText}` }], isError: true };
    }

    const data = await response.json();
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async deleteComment(args: Record<string, unknown>): Promise<ToolResult> {
    const fileKey = args.file_key as string;
    const commentId = args.comment_id as string;
    if (!fileKey || !commentId) {
      return { content: [{ type: 'text', text: 'file_key and comment_id are required' }], isError: true };
    }

    const response = await this.fetchWithRetry(
      `${this.baseUrl}/files/${encodeURIComponent(fileKey)}/comments/${encodeURIComponent(commentId)}`,
      { method: 'DELETE', headers: this.authHeaders },
    );

    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to delete comment: ${response.status} ${response.statusText}` }], isError: true };
    }

    return { content: [{ type: 'text', text: JSON.stringify({ deleted: true, comment_id: commentId }) }], isError: false };
  }

  private async getTeamComponents(args: Record<string, unknown>): Promise<ToolResult> {
    const teamId = args.team_id as string;
    if (!teamId) {
      return { content: [{ type: 'text', text: 'team_id is required' }], isError: true };
    }

    const params = new URLSearchParams();
    if (args.page_size !== undefined) params.set('page_size', String(args.page_size));
    if (args.after !== undefined) params.set('after', String(args.after));
    const qs = params.toString() ? `?${params.toString()}` : '';

    const response = await this.fetchWithRetry(`${this.baseUrl}/teams/${encodeURIComponent(teamId)}/components${qs}`, {
      method: 'GET',
      headers: this.authHeaders,
    });

    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to get team components: ${response.status} ${response.statusText}` }], isError: true };
    }

    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async getFileComponents(args: Record<string, unknown>): Promise<ToolResult> {
    const fileKey = args.file_key as string;
    if (!fileKey) {
      return { content: [{ type: 'text', text: 'file_key is required' }], isError: true };
    }

    const response = await this.fetchWithRetry(`${this.baseUrl}/files/${encodeURIComponent(fileKey)}/components`, {
      method: 'GET',
      headers: this.authHeaders,
    });

    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to get file components: ${response.status} ${response.statusText}` }], isError: true };
    }

    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async getTeamStyles(args: Record<string, unknown>): Promise<ToolResult> {
    const teamId = args.team_id as string;
    if (!teamId) {
      return { content: [{ type: 'text', text: 'team_id is required' }], isError: true };
    }

    const params = new URLSearchParams();
    if (args.page_size !== undefined) params.set('page_size', String(args.page_size));
    if (args.after !== undefined) params.set('after', String(args.after));
    const qs = params.toString() ? `?${params.toString()}` : '';

    const response = await this.fetchWithRetry(`${this.baseUrl}/teams/${encodeURIComponent(teamId)}/styles${qs}`, {
      method: 'GET',
      headers: this.authHeaders,
    });

    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to get team styles: ${response.status} ${response.statusText}` }], isError: true };
    }

    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async getLocalVariables(args: Record<string, unknown>): Promise<ToolResult> {
    const fileKey = args.file_key as string;
    if (!fileKey) {
      return { content: [{ type: 'text', text: 'file_key is required' }], isError: true };
    }

    const response = await this.fetchWithRetry(`${this.baseUrl}/files/${encodeURIComponent(fileKey)}/variables/local`, {
      method: 'GET',
      headers: this.authHeaders,
    });

    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to get local variables: ${response.status} ${response.statusText}` }], isError: true };
    }

    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async listWebhooks(args: Record<string, unknown>): Promise<ToolResult> {
    const teamId = args.team_id as string;
    if (!teamId) {
      return { content: [{ type: 'text', text: 'team_id is required' }], isError: true };
    }

    const response = await this.fetchWithRetry(`https://api.figma.com/v2/teams/${encodeURIComponent(teamId)}/webhooks`, {
      method: 'GET',
      headers: this.authHeaders,
    });

    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to list webhooks: ${response.status} ${response.statusText}` }], isError: true };
    }

    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async createWebhook(args: Record<string, unknown>): Promise<ToolResult> {
    const teamId = args.team_id as string;
    const eventType = args.event_type as string;
    const endpoint = args.endpoint as string;
    const passcode = args.passcode as string;

    if (!teamId || !eventType || !endpoint || !passcode) {
      return { content: [{ type: 'text', text: 'team_id, event_type, endpoint, and passcode are required' }], isError: true };
    }

    const body: Record<string, unknown> = {
      event_type: eventType,
      context: 'team',
      context_id: teamId,
      endpoint,
      passcode,
    };
    if (args.description) body.description = args.description;

    const response = await this.fetchWithRetry(`https://api.figma.com/v2/webhooks`, {
      method: 'POST',
      headers: this.authHeaders,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to create webhook: ${response.status} ${response.statusText}` }], isError: true };
    }

    const data = await response.json();
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }
}

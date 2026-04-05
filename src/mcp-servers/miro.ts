/**
 * Miro MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/miroapp/miro-ai — transport: streamable-HTTP (https://mcp.miro.com/), auth: OAuth2
// MCP maintained: YES — launched 2026-02-02, actively developed by Miro. Last checked: 2026-03-28.
// MCP official: YES — published by Miro (miroapp GitHub org).
// MCP tool count: 13 tools — AI-workflow-centric (context extraction, diagram generation, doc/table ops).
//
// Integration: use-both
// MCP-sourced tools (13): board_list_items, context_explore, context_get, diagram_create, diagram_get_dsl,
//   doc_create, doc_get, doc_update, image_get_url, image_get_data, table_create, table_list_rows, table_sync_rows
// REST-sourced tools (22): list_boards, get_board, create_board, update_board, delete_board,
//   get_board_members, share_board, get_board_items, get_item, delete_item,
//   create_sticky_note, get_sticky_note, update_sticky_note, create_shape, get_shape, update_shape,
//   create_connector, get_connectors, update_connector, delete_connector, create_tag, get_tags
// Overlap: NONE — MCP tools focus on AI context/diagram/doc workflows; REST tools handle CRUD operations.
// Combined coverage: 35 tools (MCP: 13 + REST: 22 - shared: 0).
// The FederationManager should route all MCP tool names through the vendor MCP connection.
//
// Our adapter covers: 22 tools. Vendor MCP covers: 13 tools.
// Recommendation: use-both — MCP has 13 unique AI-workflow tools not in REST; REST has 22 unique CRUD
//   endpoints not in MCP. Full coverage requires union. Air-gapped deployments use REST adapter only.
//
// Base URL: https://api.miro.com/v2
// Auth: OAuth2 Bearer token in Authorization header
// Docs: https://developers.miro.com/reference/overview
// Rate limits: 100,000 credits per minute per user per app. Level 1: 2000 req/min (50 credits),
//              Level 2: 1000 req/min (100 credits), Level 3: 200 req/min (500 credits), Level 4: 50 req/min (2000 credits)

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface MiroConfig {
  accessToken: string;
  baseUrl?: string;
}

export class MiroMCPServer extends MCPAdapterBase {
  private readonly accessToken: string;
  private readonly baseUrl: string;

  constructor(config: MiroConfig) {
    super();
    this.accessToken = config.accessToken;
    this.baseUrl = config.baseUrl || 'https://api.miro.com/v2';
  }

  static catalog() {
    return {
      name: 'miro',
      displayName: 'Miro',
      version: '1.0.0',
      category: 'collaboration',
      keywords: [
        'miro', 'whiteboard', 'board', 'sticky note', 'shape', 'connector',
        'frame', 'card', 'tag', 'diagram', 'canvas', 'visual collaboration',
        'mind map', 'brainstorm', 'wireframe', 'prototype',
      ],
      toolNames: [
        'list_boards', 'get_board', 'create_board', 'update_board', 'delete_board',
        'get_board_members', 'share_board',
        'get_board_items', 'get_item', 'delete_item',
        'create_sticky_note', 'get_sticky_note', 'update_sticky_note',
        'create_shape', 'get_shape', 'update_shape',
        'create_connector', 'get_connectors', 'update_connector', 'delete_connector',
        'create_tag', 'get_tags',
      ],
      description: 'Miro collaborative whiteboard: manage boards, create sticky notes, shapes, connectors, tags, and board members for visual collaboration.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_boards',
        description: 'List Miro boards accessible to the authenticated user with optional query filter and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Filter boards by name keyword',
            },
            team_id: {
              type: 'string',
              description: 'Filter boards by team ID',
            },
            limit: {
              type: 'number',
              description: 'Number of boards to return (default: 10, max: 50)',
            },
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
          },
        },
      },
      {
        name: 'get_board',
        description: 'Get detailed information about a specific Miro board by its ID',
        inputSchema: {
          type: 'object',
          properties: {
            board_id: {
              type: 'string',
              description: 'Miro board ID (e.g. uXjVMxxxxxx)',
            },
          },
          required: ['board_id'],
        },
      },
      {
        name: 'create_board',
        description: 'Create a new Miro board with optional name, description, and sharing policy',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Name of the new board',
            },
            description: {
              type: 'string',
              description: 'Optional description of the board',
            },
            team_id: {
              type: 'string',
              description: 'Team ID to create the board in (uses default team if omitted)',
            },
            policy_access: {
              type: 'string',
              description: 'Board access policy: private, view, comment, edit (default: private)',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'update_board',
        description: 'Update the name, description, or sharing policy of an existing Miro board',
        inputSchema: {
          type: 'object',
          properties: {
            board_id: {
              type: 'string',
              description: 'Miro board ID to update',
            },
            name: {
              type: 'string',
              description: 'New name for the board',
            },
            description: {
              type: 'string',
              description: 'New description for the board',
            },
            policy_access: {
              type: 'string',
              description: 'Updated access policy: private, view, comment, edit',
            },
          },
          required: ['board_id'],
        },
      },
      {
        name: 'delete_board',
        description: 'Permanently delete a Miro board and all its content by board ID',
        inputSchema: {
          type: 'object',
          properties: {
            board_id: {
              type: 'string',
              description: 'Miro board ID to delete',
            },
          },
          required: ['board_id'],
        },
      },
      {
        name: 'get_board_members',
        description: 'List all members of a Miro board with their roles and access levels',
        inputSchema: {
          type: 'object',
          properties: {
            board_id: {
              type: 'string',
              description: 'Miro board ID',
            },
            limit: {
              type: 'number',
              description: 'Number of members to return (default: 10, max: 100)',
            },
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
          },
          required: ['board_id'],
        },
      },
      {
        name: 'share_board',
        description: 'Share a Miro board with a user by email address and assign a role',
        inputSchema: {
          type: 'object',
          properties: {
            board_id: {
              type: 'string',
              description: 'Miro board ID to share',
            },
            emails: {
              type: 'string',
              description: 'Comma-separated email addresses to invite',
            },
            role: {
              type: 'string',
              description: 'Role for invited members: viewer, commenter, editor (default: viewer)',
            },
            message: {
              type: 'string',
              description: 'Optional message to include in the invitation email',
            },
          },
          required: ['board_id', 'emails'],
        },
      },
      {
        name: 'get_board_items',
        description: 'List all items on a Miro board with optional type filter and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            board_id: {
              type: 'string',
              description: 'Miro board ID',
            },
            type: {
              type: 'string',
              description: 'Filter by item type: sticky_note, shape, connector, card, frame, image, text (omit for all)',
            },
            limit: {
              type: 'number',
              description: 'Number of items to return (default: 10, max: 50)',
            },
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
          },
          required: ['board_id'],
        },
      },
      {
        name: 'get_item',
        description: 'Get details for a specific item on a Miro board by board ID and item ID',
        inputSchema: {
          type: 'object',
          properties: {
            board_id: {
              type: 'string',
              description: 'Miro board ID',
            },
            item_id: {
              type: 'string',
              description: 'Item ID on the board',
            },
          },
          required: ['board_id', 'item_id'],
        },
      },
      {
        name: 'delete_item',
        description: 'Delete a specific item from a Miro board by board ID and item ID',
        inputSchema: {
          type: 'object',
          properties: {
            board_id: {
              type: 'string',
              description: 'Miro board ID',
            },
            item_id: {
              type: 'string',
              description: 'Item ID to delete',
            },
          },
          required: ['board_id', 'item_id'],
        },
      },
      {
        name: 'create_sticky_note',
        description: 'Create a sticky note on a Miro board with content, color, and position',
        inputSchema: {
          type: 'object',
          properties: {
            board_id: {
              type: 'string',
              description: 'Miro board ID to add the sticky note to',
            },
            content: {
              type: 'string',
              description: 'Text content of the sticky note (HTML supported)',
            },
            color: {
              type: 'string',
              description: 'Sticky note color: gray, light_yellow, yellow, orange, light_green, green, dark_green, cyan, light_pink, pink, violet, red, light_blue, blue (default: light_yellow)',
            },
            x: {
              type: 'number',
              description: 'X coordinate position on the board canvas (default: 0)',
            },
            y: {
              type: 'number',
              description: 'Y coordinate position on the board canvas (default: 0)',
            },
            width: {
              type: 'number',
              description: 'Width of the sticky note in pixels (default: 200)',
            },
          },
          required: ['board_id', 'content'],
        },
      },
      {
        name: 'get_sticky_note',
        description: 'Get details for a specific sticky note item on a Miro board',
        inputSchema: {
          type: 'object',
          properties: {
            board_id: {
              type: 'string',
              description: 'Miro board ID',
            },
            item_id: {
              type: 'string',
              description: 'Sticky note item ID',
            },
          },
          required: ['board_id', 'item_id'],
        },
      },
      {
        name: 'update_sticky_note',
        description: 'Update the content, color, or position of a sticky note on a Miro board',
        inputSchema: {
          type: 'object',
          properties: {
            board_id: {
              type: 'string',
              description: 'Miro board ID',
            },
            item_id: {
              type: 'string',
              description: 'Sticky note item ID to update',
            },
            content: {
              type: 'string',
              description: 'Updated text content',
            },
            color: {
              type: 'string',
              description: 'Updated color: gray, light_yellow, yellow, orange, light_green, green, dark_green, cyan, light_pink, pink, violet, red, light_blue, blue',
            },
            x: {
              type: 'number',
              description: 'Updated X coordinate',
            },
            y: {
              type: 'number',
              description: 'Updated Y coordinate',
            },
          },
          required: ['board_id', 'item_id'],
        },
      },
      {
        name: 'create_shape',
        description: 'Create a shape item on a Miro board with optional text content and styling',
        inputSchema: {
          type: 'object',
          properties: {
            board_id: {
              type: 'string',
              description: 'Miro board ID to add the shape to',
            },
            shape: {
              type: 'string',
              description: 'Shape type: rectangle, round_rectangle, circle, triangle, rhombus, parallelogram, trapezoid, pentagon, hexagon, octagon, star, cross, arrow, callout, cloud (default: rectangle)',
            },
            content: {
              type: 'string',
              description: 'Optional text content inside the shape',
            },
            x: {
              type: 'number',
              description: 'X coordinate on the board canvas (default: 0)',
            },
            y: {
              type: 'number',
              description: 'Y coordinate on the board canvas (default: 0)',
            },
            width: {
              type: 'number',
              description: 'Width of the shape in pixels (default: 200)',
            },
            height: {
              type: 'number',
              description: 'Height of the shape in pixels (default: 200)',
            },
            fill_color: {
              type: 'string',
              description: 'Fill color as hex string (e.g. #ffffff)',
            },
          },
          required: ['board_id'],
        },
      },
      {
        name: 'get_shape',
        description: 'Get details for a specific shape item on a Miro board',
        inputSchema: {
          type: 'object',
          properties: {
            board_id: {
              type: 'string',
              description: 'Miro board ID',
            },
            item_id: {
              type: 'string',
              description: 'Shape item ID',
            },
          },
          required: ['board_id', 'item_id'],
        },
      },
      {
        name: 'update_shape',
        description: 'Update the content, shape type, or position of a shape item on a Miro board',
        inputSchema: {
          type: 'object',
          properties: {
            board_id: {
              type: 'string',
              description: 'Miro board ID',
            },
            item_id: {
              type: 'string',
              description: 'Shape item ID to update',
            },
            content: {
              type: 'string',
              description: 'Updated text content',
            },
            x: {
              type: 'number',
              description: 'Updated X coordinate',
            },
            y: {
              type: 'number',
              description: 'Updated Y coordinate',
            },
            fill_color: {
              type: 'string',
              description: 'Updated fill color as hex string',
            },
          },
          required: ['board_id', 'item_id'],
        },
      },
      {
        name: 'create_connector',
        description: 'Create a connector (line/arrow) between two items on a Miro board',
        inputSchema: {
          type: 'object',
          properties: {
            board_id: {
              type: 'string',
              description: 'Miro board ID',
            },
            start_item_id: {
              type: 'string',
              description: 'Item ID where the connector starts',
            },
            end_item_id: {
              type: 'string',
              description: 'Item ID where the connector ends',
            },
            caption: {
              type: 'string',
              description: 'Optional label text on the connector',
            },
            style_color: {
              type: 'string',
              description: 'Connector line color as hex string (default: #000000)',
            },
          },
          required: ['board_id', 'start_item_id', 'end_item_id'],
        },
      },
      {
        name: 'get_connectors',
        description: 'List all connectors on a Miro board with optional pagination',
        inputSchema: {
          type: 'object',
          properties: {
            board_id: {
              type: 'string',
              description: 'Miro board ID',
            },
            limit: {
              type: 'number',
              description: 'Number of connectors to return (default: 10, max: 50)',
            },
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
          },
          required: ['board_id'],
        },
      },
      {
        name: 'update_connector',
        description: 'Update the caption or style of a connector on a Miro board',
        inputSchema: {
          type: 'object',
          properties: {
            board_id: {
              type: 'string',
              description: 'Miro board ID',
            },
            connector_id: {
              type: 'string',
              description: 'Connector ID to update',
            },
            caption: {
              type: 'string',
              description: 'Updated label text for the connector',
            },
            style_color: {
              type: 'string',
              description: 'Updated line color as hex string',
            },
          },
          required: ['board_id', 'connector_id'],
        },
      },
      {
        name: 'delete_connector',
        description: 'Delete a connector from a Miro board by connector ID',
        inputSchema: {
          type: 'object',
          properties: {
            board_id: {
              type: 'string',
              description: 'Miro board ID',
            },
            connector_id: {
              type: 'string',
              description: 'Connector ID to delete',
            },
          },
          required: ['board_id', 'connector_id'],
        },
      },
      {
        name: 'create_tag',
        description: 'Create a tag on a Miro board that can be applied to board items for categorization',
        inputSchema: {
          type: 'object',
          properties: {
            board_id: {
              type: 'string',
              description: 'Miro board ID',
            },
            title: {
              type: 'string',
              description: 'Tag title/label text',
            },
            fill_color: {
              type: 'string',
              description: 'Tag background color: red, magenta, violet, light_orange, orange, warm_yellow, yellow, light_green, green, dark_green, cyan, light_blue, blue, dark_blue, gray, dark_gray (default: red)',
            },
          },
          required: ['board_id', 'title'],
        },
      },
      {
        name: 'get_tags',
        description: 'List all tags on a Miro board with optional pagination',
        inputSchema: {
          type: 'object',
          properties: {
            board_id: {
              type: 'string',
              description: 'Miro board ID',
            },
            limit: {
              type: 'number',
              description: 'Number of tags to return (default: 20, max: 50)',
            },
            offset: {
              type: 'number',
              description: 'Number of tags to skip for pagination (default: 0)',
            },
          },
          required: ['board_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_boards':
          return this.listBoards(args);
        case 'get_board':
          return this.getBoard(args);
        case 'create_board':
          return this.createBoard(args);
        case 'update_board':
          return this.updateBoard(args);
        case 'delete_board':
          return this.deleteBoard(args);
        case 'get_board_members':
          return this.getBoardMembers(args);
        case 'share_board':
          return this.shareBoard(args);
        case 'get_board_items':
          return this.getBoardItems(args);
        case 'get_item':
          return this.getItem(args);
        case 'delete_item':
          return this.deleteItem(args);
        case 'create_sticky_note':
          return this.createStickyNote(args);
        case 'get_sticky_note':
          return this.getStickyNote(args);
        case 'update_sticky_note':
          return this.updateStickyNote(args);
        case 'create_shape':
          return this.createShape(args);
        case 'get_shape':
          return this.getShape(args);
        case 'update_shape':
          return this.updateShape(args);
        case 'create_connector':
          return this.createConnector(args);
        case 'get_connectors':
          return this.getConnectors(args);
        case 'update_connector':
          return this.updateConnector(args);
        case 'delete_connector':
          return this.deleteConnector(args);
        case 'create_tag':
          return this.createTag(args);
        case 'get_tags':
          return this.getTags(args);
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
      Accept: 'application/json',
    };
  }

  private async miroGet(path: string, params?: Record<string, string>): Promise<ToolResult> {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    const response = await this.fetchWithRetry(`${this.baseUrl}/${path}${qs}`, { method: 'GET', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Miro returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async miroPost(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}/${path}`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Miro returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async miroPatch(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}/${path}`, {
      method: 'PATCH',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Miro returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async miroDelete(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}/${path}`, { method: 'DELETE', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: JSON.stringify({ deleted: true }) }], isError: false };
  }

  private async listBoards(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      limit: String((args.limit as number) || 10),
    };
    if (args.query) params.query = args.query as string;
    if (args.team_id) params.team_id = args.team_id as string;
    if (args.cursor) params.cursor = args.cursor as string;
    return this.miroGet('boards', params);
  }

  private async getBoard(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.board_id) return { content: [{ type: 'text', text: 'board_id is required' }], isError: true };
    return this.miroGet(`boards/${encodeURIComponent(args.board_id as string)}`);
  }

  private async createBoard(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name) return { content: [{ type: 'text', text: 'name is required' }], isError: true };
    const body: Record<string, unknown> = { name: args.name };
    if (args.description) body.description = args.description;
    if (args.team_id) body.teamId = args.team_id;
    if (args.policy_access) {
      body.policy = { collaborationToolsStartAccess: args.policy_access };
    }
    return this.miroPost('boards', body);
  }

  private async updateBoard(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.board_id) return { content: [{ type: 'text', text: 'board_id is required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.name) body.name = args.name;
    if (args.description) body.description = args.description;
    if (args.policy_access) body.policy = { collaborationToolsStartAccess: args.policy_access };
    return this.miroPatch(`boards/${encodeURIComponent(args.board_id as string)}`, body);
  }

  private async deleteBoard(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.board_id) return { content: [{ type: 'text', text: 'board_id is required' }], isError: true };
    return this.miroDelete(`boards/${encodeURIComponent(args.board_id as string)}`);
  }

  private async getBoardMembers(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.board_id) return { content: [{ type: 'text', text: 'board_id is required' }], isError: true };
    const params: Record<string, string> = { limit: String((args.limit as number) || 10) };
    if (args.cursor) params.cursor = args.cursor as string;
    return this.miroGet(`boards/${encodeURIComponent(args.board_id as string)}/members`, params);
  }

  private async shareBoard(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.board_id || !args.emails) return { content: [{ type: 'text', text: 'board_id and emails are required' }], isError: true };
    const emails = (args.emails as string).split(',').map(e => e.trim());
    const body: Record<string, unknown> = {
      emails,
      role: (args.role as string) || 'viewer',
    };
    if (args.message) body.message = args.message;
    return this.miroPost(`boards/${encodeURIComponent(args.board_id as string)}/members`, body);
  }

  private async getBoardItems(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.board_id) return { content: [{ type: 'text', text: 'board_id is required' }], isError: true };
    const params: Record<string, string> = { limit: String((args.limit as number) || 10) };
    if (args.type) params.type = args.type as string;
    if (args.cursor) params.cursor = args.cursor as string;
    return this.miroGet(`boards/${encodeURIComponent(args.board_id as string)}/items`, params);
  }

  private async getItem(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.board_id || !args.item_id) return { content: [{ type: 'text', text: 'board_id and item_id are required' }], isError: true };
    return this.miroGet(`boards/${encodeURIComponent(args.board_id as string)}/items/${encodeURIComponent(args.item_id as string)}`);
  }

  private async deleteItem(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.board_id || !args.item_id) return { content: [{ type: 'text', text: 'board_id and item_id are required' }], isError: true };
    return this.miroDelete(`boards/${encodeURIComponent(args.board_id as string)}/items/${encodeURIComponent(args.item_id as string)}`);
  }

  private async createStickyNote(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.board_id || !args.content) return { content: [{ type: 'text', text: 'board_id and content are required' }], isError: true };
    const body: Record<string, unknown> = {
      data: {
        content: args.content,
        shape: 'square',
      },
      style: {
        fillColor: (args.color as string) || 'light_yellow',
      },
      position: {
        x: (args.x as number) ?? 0,
        y: (args.y as number) ?? 0,
      },
      geometry: {
        width: (args.width as number) || 200,
      },
    };
    return this.miroPost(`boards/${encodeURIComponent(args.board_id as string)}/sticky_notes`, body);
  }

  private async getStickyNote(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.board_id || !args.item_id) return { content: [{ type: 'text', text: 'board_id and item_id are required' }], isError: true };
    return this.miroGet(`boards/${encodeURIComponent(args.board_id as string)}/sticky_notes/${encodeURIComponent(args.item_id as string)}`);
  }

  private async updateStickyNote(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.board_id || !args.item_id) return { content: [{ type: 'text', text: 'board_id and item_id are required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.content) body.data = { content: args.content };
    if (args.color) body.style = { fillColor: args.color };
    if (args.x !== undefined || args.y !== undefined) {
      body.position = { x: (args.x as number) ?? 0, y: (args.y as number) ?? 0 };
    }
    return this.miroPatch(`boards/${encodeURIComponent(args.board_id as string)}/sticky_notes/${encodeURIComponent(args.item_id as string)}`, body);
  }

  private async createShape(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.board_id) return { content: [{ type: 'text', text: 'board_id is required' }], isError: true };
    const body: Record<string, unknown> = {
      data: {
        shape: (args.shape as string) || 'rectangle',
        content: args.content || '',
      },
      position: {
        x: (args.x as number) ?? 0,
        y: (args.y as number) ?? 0,
      },
      geometry: {
        width: (args.width as number) || 200,
        height: (args.height as number) || 200,
      },
    };
    if (args.fill_color) body.style = { fillColor: args.fill_color };
    return this.miroPost(`boards/${encodeURIComponent(args.board_id as string)}/shapes`, body);
  }

  private async getShape(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.board_id || !args.item_id) return { content: [{ type: 'text', text: 'board_id and item_id are required' }], isError: true };
    return this.miroGet(`boards/${encodeURIComponent(args.board_id as string)}/shapes/${encodeURIComponent(args.item_id as string)}`);
  }

  private async updateShape(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.board_id || !args.item_id) return { content: [{ type: 'text', text: 'board_id and item_id are required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.content) body.data = { content: args.content };
    if (args.fill_color) body.style = { fillColor: args.fill_color };
    if (args.x !== undefined || args.y !== undefined) {
      body.position = { x: (args.x as number) ?? 0, y: (args.y as number) ?? 0 };
    }
    return this.miroPatch(`boards/${encodeURIComponent(args.board_id as string)}/shapes/${encodeURIComponent(args.item_id as string)}`, body);
  }

  private async createConnector(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.board_id || !args.start_item_id || !args.end_item_id) {
      return { content: [{ type: 'text', text: 'board_id, start_item_id, and end_item_id are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      startItem: { id: args.start_item_id },
      endItem: { id: args.end_item_id },
    };
    if (args.caption) body.captions = [{ content: args.caption }];
    if (args.style_color) body.style = { color: args.style_color };
    return this.miroPost(`boards/${encodeURIComponent(args.board_id as string)}/connectors`, body);
  }

  private async getConnectors(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.board_id) return { content: [{ type: 'text', text: 'board_id is required' }], isError: true };
    const params: Record<string, string> = { limit: String((args.limit as number) || 10) };
    if (args.cursor) params.cursor = args.cursor as string;
    return this.miroGet(`boards/${encodeURIComponent(args.board_id as string)}/connectors`, params);
  }

  private async updateConnector(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.board_id || !args.connector_id) return { content: [{ type: 'text', text: 'board_id and connector_id are required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.caption) body.captions = [{ content: args.caption }];
    if (args.style_color) body.style = { color: args.style_color };
    return this.miroPatch(`boards/${encodeURIComponent(args.board_id as string)}/connectors/${encodeURIComponent(args.connector_id as string)}`, body);
  }

  private async deleteConnector(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.board_id || !args.connector_id) return { content: [{ type: 'text', text: 'board_id and connector_id are required' }], isError: true };
    return this.miroDelete(`boards/${encodeURIComponent(args.board_id as string)}/connectors/${encodeURIComponent(args.connector_id as string)}`);
  }

  private async createTag(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.board_id || !args.title) return { content: [{ type: 'text', text: 'board_id and title are required' }], isError: true };
    const body: Record<string, unknown> = {
      title: args.title,
      fillColor: (args.fill_color as string) || 'red',
    };
    return this.miroPost(`boards/${encodeURIComponent(args.board_id as string)}/tags`, body);
  }

  private async getTags(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.board_id) return { content: [{ type: 'text', text: 'board_id is required' }], isError: true };
    const params: Record<string, string> = {
      limit: String((args.limit as number) || 20),
      offset: String((args.offset as number) || 0),
    };
    return this.miroGet(`boards/${encodeURIComponent(args.board_id as string)}/tags`, params);
  }
}

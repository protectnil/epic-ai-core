/**
 * Monday.com MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/mondaycom/mcp — transport: stdio (npm) and streamable-HTTP (hosted), auth: API token or OAuth2
// The monday.com MCP server (@mondaydotcomorg/monday-api-mcp) is actively maintained by the monday.com AI team.
// npm package version 2.0.8 published 2025. Supports both local stdio (API token) and hosted HTTPS (OAuth2).
// The MCP exposes ~36 tools covering boards, items, groups, columns, users, workspaces, documents, dashboards, forms, search.
// This adapter uses personal API tokens and supports air-gapped deployments.
// Our adapter covers: 22 tools. Vendor MCP covers: 36+ tools.
// Recommendation: use-both — vendor MCP has unique tools (board_insights, get_board_activity, list_workspaces, create_dashboard,
//   create_widget, create_form, update_form, get_form, form_questions_editor, search, get_user_context, dev sprint tools).
//   Our REST adapter covers: archive_board, archive_item, duplicate_item, delete_group, get_column_values, get_updates,
//   list_workspaces, create_webhook, delete_webhook, get_me — which MCP either omits or covers differently.
// MCP-sourced tools (unique): board_insights, get_board_activity, create_dashboard, create_widget, all_widgets_schema,
//   create_form, update_form, get_form, form_questions_editor, search, get_user_context, get_monday_dev_sprints_boards,
//   get_sprints_metadata, get_sprint_summary, all_monday_api, get_graphql_schema, get_type_details
// REST-sourced tools (our adapter): archive_board, archive_item, duplicate_item, delete_group, get_column_values,
//   create_webhook, delete_webhook — not covered by vendor MCP
//
// Base URL: https://api.monday.com/v2
// Auth: API token in Authorization header (no "Bearer" prefix) — personal V2 token or app token.
//       Obtain at: https://monday.com → Profile → Admin > Connections > Personal API token
// Docs: https://developer.monday.com/api-reference/
// Rate limits: 10,000 complexity per minute (default). Complexity varies by query depth.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface MondayConfig {
  /**
   * Personal V2 API token or app token.
   * Header format: Authorization: {token} — no "Bearer" prefix.
   */
  apiToken: string;
  /** API version header (default: 2025-07). Monday.com uses date-based versioning. */
  apiVersion?: string;
}

const MONDAY_BASE_URL = 'https://api.monday.com/v2';

export class MondayMCPServer extends MCPAdapterBase {
  private readonly apiToken: string;
  private readonly apiVersion: string;

  constructor(config: MondayConfig) {
    super();
    this.apiToken = config.apiToken;
    this.apiVersion = config.apiVersion || '2025-07';
  }

  static catalog() {
    return {
      name: 'monday',
      displayName: 'Monday.com',
      version: '1.0.0',
      category: 'collaboration' as const,
      keywords: [
        'monday', 'monday.com', 'project-management', 'task-management', 'work-os',
        'boards', 'items', 'columns', 'groups', 'users', 'workspaces',
        'notifications', 'webhooks', 'automations', 'workflows',
      ],
      toolNames: [
        'list_boards', 'get_board', 'create_board', 'archive_board',
        'get_items', 'create_item', 'update_item', 'delete_item', 'archive_item',
        'duplicate_item', 'move_item_to_group', 'search_items',
        'create_update', 'get_updates',
        'create_group', 'delete_group',
        'create_column', 'get_column_values',
        'get_users', 'get_me',
        'list_workspaces',
        'create_webhook', 'delete_webhook',
      ],
      description: 'Monday.com work management: boards, items, groups, columns, users, workspaces, updates, and webhooks.',
      author: 'protectnil' as const,
    };
  }

  private async runQuery(query: string, variables?: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = { query };
    if (variables) body.variables = variables;

    const response = await this.fetchWithRetry(MONDAY_BASE_URL, {
      method: 'POST',
      headers: {
        Authorization: this.apiToken,
        'Content-Type': 'application/json',
        'API-Version': this.apiVersion,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `Monday.com API error: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }

    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_boards',
        description: 'List boards accessible to the authenticated user, with optional filtering by board kind and pagination.',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Number of boards to return (default: 25, max: 100)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            boardKind: {
              type: 'string',
              description: 'Filter by board kind: public, private, or share (optional)',
            },
          },
        },
      },
      {
        name: 'get_board',
        description: 'Retrieve full details for a specific board including columns, groups, and metadata.',
        inputSchema: {
          type: 'object',
          properties: {
            boardId: {
              type: 'string',
              description: 'Numeric ID of the board',
            },
          },
          required: ['boardId'],
        },
      },
      {
        name: 'create_board',
        description: 'Create a new monday.com board with the specified name, kind, and optional workspace assignment.',
        inputSchema: {
          type: 'object',
          properties: {
            boardName: {
              type: 'string',
              description: 'Name of the new board',
            },
            boardKind: {
              type: 'string',
              description: 'Board visibility: public (default), private, or share',
            },
            workspaceId: {
              type: 'string',
              description: 'ID of the workspace to create the board in (optional)',
            },
            templateId: {
              type: 'string',
              description: 'ID of a board template to use (optional)',
            },
          },
          required: ['boardName'],
        },
      },
      {
        name: 'archive_board',
        description: 'Archive a monday.com board. Archived boards are hidden from the workspace but retain their data.',
        inputSchema: {
          type: 'object',
          properties: {
            boardId: {
              type: 'string',
              description: 'Numeric ID of the board to archive',
            },
          },
          required: ['boardId'],
        },
      },
      {
        name: 'get_items',
        description: 'Retrieve items (rows) from a board with their column values. Supports cursor-based pagination.',
        inputSchema: {
          type: 'object',
          properties: {
            boardId: {
              type: 'string',
              description: 'Numeric ID of the board',
            },
            limit: {
              type: 'number',
              description: 'Number of items to return (default: 25, max: 500)',
            },
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response (optional)',
            },
          },
          required: ['boardId'],
        },
      },
      {
        name: 'create_item',
        description: 'Create a new item (row) on a board, optionally placing it in a specific group and setting column values.',
        inputSchema: {
          type: 'object',
          properties: {
            boardId: {
              type: 'string',
              description: 'Numeric ID of the board to add the item to',
            },
            itemName: {
              type: 'string',
              description: 'Name of the new item',
            },
            groupId: {
              type: 'string',
              description: 'ID of the group to add the item to (optional, defaults to top group)',
            },
            columnValues: {
              type: 'string',
              description: 'JSON string of column values keyed by column ID, e.g. {"status":"Done","text":"notes"} (optional)',
            },
          },
          required: ['boardId', 'itemName'],
        },
      },
      {
        name: 'update_item',
        description: 'Update one or more column values on an existing board item.',
        inputSchema: {
          type: 'object',
          properties: {
            boardId: {
              type: 'string',
              description: 'Numeric ID of the board containing the item',
            },
            itemId: {
              type: 'string',
              description: 'Numeric ID of the item to update',
            },
            columnValues: {
              type: 'string',
              description: 'JSON string of column values to update, keyed by column ID',
            },
          },
          required: ['boardId', 'itemId', 'columnValues'],
        },
      },
      {
        name: 'delete_item',
        description: 'Permanently delete an item from a monday.com board. This action cannot be undone.',
        inputSchema: {
          type: 'object',
          properties: {
            itemId: {
              type: 'string',
              description: 'Numeric ID of the item to delete',
            },
          },
          required: ['itemId'],
        },
      },
      {
        name: 'archive_item',
        description: 'Archive an item on a monday.com board. Archived items are hidden but can be restored.',
        inputSchema: {
          type: 'object',
          properties: {
            itemId: {
              type: 'string',
              description: 'Numeric ID of the item to archive',
            },
          },
          required: ['itemId'],
        },
      },
      {
        name: 'duplicate_item',
        description: 'Duplicate an existing item, copying its column values into a new item on the same board.',
        inputSchema: {
          type: 'object',
          properties: {
            boardId: {
              type: 'string',
              description: 'Numeric ID of the board containing the item',
            },
            itemId: {
              type: 'string',
              description: 'Numeric ID of the item to duplicate',
            },
            withUpdates: {
              type: 'boolean',
              description: 'Also copy updates (comments) to the duplicate item (default: false)',
            },
          },
          required: ['boardId', 'itemId'],
        },
      },
      {
        name: 'move_item_to_group',
        description: 'Move an item to a different group on the same board.',
        inputSchema: {
          type: 'object',
          properties: {
            itemId: {
              type: 'string',
              description: 'Numeric ID of the item to move',
            },
            groupId: {
              type: 'string',
              description: 'ID of the destination group',
            },
          },
          required: ['itemId', 'groupId'],
        },
      },
      {
        name: 'search_items',
        description: 'Search for items across all boards by name using full-text search.',
        inputSchema: {
          type: 'object',
          properties: {
            term: {
              type: 'string',
              description: 'Search term to match against item names',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results to return (default: 25)',
            },
          },
          required: ['term'],
        },
      },
      {
        name: 'create_update',
        description: 'Post an update (comment) on a monday.com item.',
        inputSchema: {
          type: 'object',
          properties: {
            itemId: {
              type: 'string',
              description: 'Numeric ID of the item to post the update on',
            },
            body: {
              type: 'string',
              description: 'Text content of the update',
            },
          },
          required: ['itemId', 'body'],
        },
      },
      {
        name: 'get_updates',
        description: 'Retrieve updates (comments) posted on a specific monday.com item.',
        inputSchema: {
          type: 'object',
          properties: {
            itemId: {
              type: 'string',
              description: 'Numeric ID of the item to fetch updates for',
            },
            limit: {
              type: 'number',
              description: 'Number of updates to return (default: 25)',
            },
          },
          required: ['itemId'],
        },
      },
      {
        name: 'create_group',
        description: 'Create a new group (section) on a monday.com board.',
        inputSchema: {
          type: 'object',
          properties: {
            boardId: {
              type: 'string',
              description: 'Numeric ID of the board',
            },
            groupName: {
              type: 'string',
              description: 'Name of the new group',
            },
          },
          required: ['boardId', 'groupName'],
        },
      },
      {
        name: 'delete_group',
        description: 'Delete a group from a monday.com board. All items in the group will also be deleted.',
        inputSchema: {
          type: 'object',
          properties: {
            boardId: {
              type: 'string',
              description: 'Numeric ID of the board',
            },
            groupId: {
              type: 'string',
              description: 'ID of the group to delete',
            },
          },
          required: ['boardId', 'groupId'],
        },
      },
      {
        name: 'create_column',
        description: 'Add a new column to a monday.com board with the specified title and type.',
        inputSchema: {
          type: 'object',
          properties: {
            boardId: {
              type: 'string',
              description: 'Numeric ID of the board',
            },
            title: {
              type: 'string',
              description: 'Title of the new column',
            },
            columnType: {
              type: 'string',
              description: 'Column type: text, numbers, status, dropdown, date, person, timeline, formula, checkbox, file, link, rating, email, phone, country, week, world_clock, auto_number, dependency, vote, mirror, integration, button, tags, color_picker, doc, time_tracking (default: text)',
            },
            defaults: {
              type: 'string',
              description: 'JSON string of default settings for the column (optional, type-specific)',
            },
          },
          required: ['boardId', 'title'],
        },
      },
      {
        name: 'get_column_values',
        description: 'Retrieve the column value for a specific item and column ID.',
        inputSchema: {
          type: 'object',
          properties: {
            itemId: {
              type: 'string',
              description: 'Numeric ID of the item',
            },
            columnId: {
              type: 'string',
              description: 'ID of the column to retrieve the value for',
            },
          },
          required: ['itemId', 'columnId'],
        },
      },
      {
        name: 'get_users',
        description: 'Retrieve users on the monday.com account, with optional filters by name, email, or kind.',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Number of users to return (default: 25)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            kind: {
              type: 'string',
              description: 'Filter by user kind: all (default), non_guests, guests, non_pending',
            },
            name: {
              type: 'string',
              description: 'Filter by partial name match (optional)',
            },
            emails: {
              type: 'array',
              description: 'Filter by list of email addresses (optional)',
              items: { type: 'string' },
            },
          },
        },
      },
      {
        name: 'get_me',
        description: 'Retrieve the profile of the currently authenticated monday.com user.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'list_workspaces',
        description: 'List workspaces accessible to the authenticated user, with optional pagination.',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Number of workspaces to return (default: 25)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
          },
        },
      },
      {
        name: 'create_webhook',
        description: 'Create a webhook to receive real-time event notifications for a board (e.g. item created, column changed, status updated).',
        inputSchema: {
          type: 'object',
          properties: {
            boardId: {
              type: 'string',
              description: 'Numeric ID of the board to attach the webhook to',
            },
            url: {
              type: 'string',
              description: 'HTTPS URL that monday.com will POST notifications to',
            },
            event: {
              type: 'string',
              description: 'Event to subscribe to: change_column_value, change_status_column_value, change_subitem_column_value, create_item, create_update, edit_update, delete_update, create_subitem, create_subitem_update, move_item_to_group, item_archived, item_deleted, item_restored, column_title_changed',
            },
            config: {
              type: 'object',
              description: 'Optional event-specific configuration (e.g. { "columnId": "status" } to filter by column)',
            },
          },
          required: ['boardId', 'url', 'event'],
        },
      },
      {
        name: 'delete_webhook',
        description: 'Delete an existing monday.com webhook by its ID.',
        inputSchema: {
          type: 'object',
          properties: {
            webhookId: {
              type: 'string',
              description: 'Numeric ID of the webhook to delete',
            },
          },
          required: ['webhookId'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_boards':
          return await this.listBoards(args);
        case 'get_board':
          return await this.getBoard(args);
        case 'create_board':
          return await this.createBoard(args);
        case 'archive_board':
          return await this.archiveBoard(args);
        case 'get_items':
          return await this.getItems(args);
        case 'create_item':
          return await this.createItem(args);
        case 'update_item':
          return await this.updateItem(args);
        case 'delete_item':
          return await this.deleteItem(args);
        case 'archive_item':
          return await this.archiveItem(args);
        case 'duplicate_item':
          return await this.duplicateItem(args);
        case 'move_item_to_group':
          return await this.moveItemToGroup(args);
        case 'search_items':
          return await this.searchItems(args);
        case 'create_update':
          return await this.createUpdate(args);
        case 'get_updates':
          return await this.getUpdates(args);
        case 'create_group':
          return await this.createGroup(args);
        case 'delete_group':
          return await this.deleteGroup(args);
        case 'create_column':
          return await this.createColumn(args);
        case 'get_column_values':
          return await this.getColumnValues(args);
        case 'get_users':
          return await this.getUsers(args);
        case 'get_me':
          return await this.getMe();
        case 'list_workspaces':
          return await this.listWorkspaces(args);
        case 'create_webhook':
          return await this.createWebhook(args);
        case 'delete_webhook':
          return await this.deleteWebhook(args);
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

  private async listBoards(args: Record<string, unknown>): Promise<ToolResult> {
    const limit = (args.limit as number) || 25;
    const page = (args.page as number) || 1;
    const boardKindFilter = args.boardKind ? `, board_kind: ${(args.boardKind as string)}` : '';
    const query = `query {
      boards(limit: ${limit}, page: ${page}${boardKindFilter}) {
        id name description board_kind state updated_at
      }
    }`;
    return this.runQuery(query);
  }

  private async getBoard(args: Record<string, unknown>): Promise<ToolResult> {
    const boardId = args.boardId as string;
    if (!boardId) return { content: [{ type: 'text', text: 'boardId is required' }], isError: true };
    const query = `query {
      boards(ids: [${boardId}]) {
        id name description board_kind state updated_at
        columns { id title type settings_str }
        groups { id title color position }
      }
    }`;
    return this.runQuery(query);
  }

  private async createBoard(args: Record<string, unknown>): Promise<ToolResult> {
    const boardName = args.boardName as string;
    if (!boardName) return { content: [{ type: 'text', text: 'boardName is required' }], isError: true };
    const kind = (args.boardKind as string) || 'public';
    const workspaceArg = args.workspaceId ? `, workspace_id: ${args.workspaceId as string}` : '';
    const templateArg = args.templateId ? `, template_id: ${args.templateId as string}` : '';
    const query = `mutation {
      create_board(board_name: "${(boardName as string).replace(/"/g, '\\"')}", board_kind: ${kind}${workspaceArg}${templateArg}) {
        id name board_kind
      }
    }`;
    return this.runQuery(query);
  }

  private async archiveBoard(args: Record<string, unknown>): Promise<ToolResult> {
    const boardId = args.boardId as string;
    if (!boardId) return { content: [{ type: 'text', text: 'boardId is required' }], isError: true };
    const query = `mutation { archive_board(board_id: ${boardId}) { id state } }`;
    return this.runQuery(query);
  }

  private async getItems(args: Record<string, unknown>): Promise<ToolResult> {
    const boardId = args.boardId as string;
    if (!boardId) return { content: [{ type: 'text', text: 'boardId is required' }], isError: true };
    const limit = (args.limit as number) || 25;
    const cursorArg = args.cursor ? `, cursor: "${(args.cursor as string).replace(/"/g, '\\"')}"` : '';
    const query = `query {
      boards(ids: [${boardId}]) {
        items_page(limit: ${limit}${cursorArg}) {
          cursor
          items {
            id name state updated_at
            group { id title }
            column_values { id text value }
          }
        }
      }
    }`;
    return this.runQuery(query);
  }

  private async createItem(args: Record<string, unknown>): Promise<ToolResult> {
    const boardId = args.boardId as string;
    const itemName = args.itemName as string;
    if (!boardId || !itemName) return { content: [{ type: 'text', text: 'boardId and itemName are required' }], isError: true };
    const groupArg = args.groupId ? `, group_id: "${(args.groupId as string).replace(/"/g, '\\"')}"` : '';
    const colArg = args.columnValues ? `, column_values: ${JSON.stringify(args.columnValues as string)}` : '';
    const query = `mutation {
      create_item(board_id: ${boardId}, item_name: "${itemName.replace(/"/g, '\\"')}"${groupArg}${colArg}) {
        id name
      }
    }`;
    return this.runQuery(query);
  }

  private async updateItem(args: Record<string, unknown>): Promise<ToolResult> {
    const boardId = args.boardId as string;
    const itemId = args.itemId as string;
    const columnValues = args.columnValues as string;
    if (!boardId || !itemId || !columnValues) {
      return { content: [{ type: 'text', text: 'boardId, itemId, and columnValues are required' }], isError: true };
    }
    const query = `mutation {
      change_multiple_column_values(board_id: ${boardId}, item_id: ${itemId}, column_values: ${JSON.stringify(columnValues)}) {
        id name
      }
    }`;
    return this.runQuery(query);
  }

  private async deleteItem(args: Record<string, unknown>): Promise<ToolResult> {
    const itemId = args.itemId as string;
    if (!itemId) return { content: [{ type: 'text', text: 'itemId is required' }], isError: true };
    const query = `mutation { delete_item(item_id: ${itemId}) { id } }`;
    return this.runQuery(query);
  }

  private async archiveItem(args: Record<string, unknown>): Promise<ToolResult> {
    const itemId = args.itemId as string;
    if (!itemId) return { content: [{ type: 'text', text: 'itemId is required' }], isError: true };
    const query = `mutation { archive_item(item_id: ${itemId}) { id state } }`;
    return this.runQuery(query);
  }

  private async duplicateItem(args: Record<string, unknown>): Promise<ToolResult> {
    const boardId = args.boardId as string;
    const itemId = args.itemId as string;
    if (!boardId || !itemId) return { content: [{ type: 'text', text: 'boardId and itemId are required' }], isError: true };
    const withUpdates = (args.withUpdates as boolean) ?? false;
    const query = `mutation {
      duplicate_item(board_id: ${boardId}, item_id: ${itemId}, with_updates: ${withUpdates}) {
        id name
      }
    }`;
    return this.runQuery(query);
  }

  private async moveItemToGroup(args: Record<string, unknown>): Promise<ToolResult> {
    const itemId = args.itemId as string;
    const groupId = args.groupId as string;
    if (!itemId || !groupId) return { content: [{ type: 'text', text: 'itemId and groupId are required' }], isError: true };
    const query = `mutation {
      move_item_to_group(item_id: ${itemId}, group_id: "${groupId}") {
        id name
      }
    }`;
    return this.runQuery(query);
  }

  private async searchItems(args: Record<string, unknown>): Promise<ToolResult> {
    const term = args.term as string;
    if (!term) return { content: [{ type: 'text', text: 'term is required' }], isError: true };
    const limit = (args.limit as number) || 25;
    // items_by_multiple_column_values was removed in API version 2023-10.
    // Use items_page_by_column_values (the replacement per monday.com changelog).
    const query = `query {
      items_page_by_column_values(limit: ${limit}, column_id: "name", column_values: ["${term.replace(/"/g, '\\"')}"]) {
        cursor
        items {
          id name updated_at
          board { id name }
          group { id title }
        }
      }
    }`;
    return this.runQuery(query);
  }

  private async createUpdate(args: Record<string, unknown>): Promise<ToolResult> {
    const itemId = args.itemId as string;
    const body = args.body as string;
    if (!itemId || !body) return { content: [{ type: 'text', text: 'itemId and body are required' }], isError: true };
    const query = `mutation {
      create_update(item_id: ${itemId}, body: ${JSON.stringify(body)}) {
        id body created_at
      }
    }`;
    return this.runQuery(query);
  }

  private async getUpdates(args: Record<string, unknown>): Promise<ToolResult> {
    const itemId = args.itemId as string;
    if (!itemId) return { content: [{ type: 'text', text: 'itemId is required' }], isError: true };
    const limit = (args.limit as number) || 25;
    const query = `query {
      items(ids: [${itemId}]) {
        updates(limit: ${limit}) {
          id body created_at
          creator { id name email }
        }
      }
    }`;
    return this.runQuery(query);
  }

  private async createGroup(args: Record<string, unknown>): Promise<ToolResult> {
    const boardId = args.boardId as string;
    const groupName = args.groupName as string;
    if (!boardId || !groupName) return { content: [{ type: 'text', text: 'boardId and groupName are required' }], isError: true };
    const query = `mutation {
      create_group(board_id: ${boardId}, group_name: "${groupName.replace(/"/g, '\\"')}") {
        id title
      }
    }`;
    return this.runQuery(query);
  }

  private async deleteGroup(args: Record<string, unknown>): Promise<ToolResult> {
    const boardId = args.boardId as string;
    const groupId = args.groupId as string;
    if (!boardId || !groupId) return { content: [{ type: 'text', text: 'boardId and groupId are required' }], isError: true };
    const query = `mutation {
      delete_group(board_id: ${boardId}, group_id: "${groupId}") {
        id deleted
      }
    }`;
    return this.runQuery(query);
  }

  private async createColumn(args: Record<string, unknown>): Promise<ToolResult> {
    const boardId = args.boardId as string;
    const title = args.title as string;
    if (!boardId || !title) return { content: [{ type: 'text', text: 'boardId and title are required' }], isError: true };
    const columnType = (args.columnType as string) || 'text';
    const defaultsArg = args.defaults ? `, defaults: ${JSON.stringify(args.defaults as string)}` : '';
    const query = `mutation {
      create_column(board_id: ${boardId}, title: "${title.replace(/"/g, '\\"')}", column_type: ${columnType}${defaultsArg}) {
        id title type
      }
    }`;
    return this.runQuery(query);
  }

  private async getColumnValues(args: Record<string, unknown>): Promise<ToolResult> {
    const itemId = args.itemId as string;
    const columnId = args.columnId as string;
    if (!itemId || !columnId) return { content: [{ type: 'text', text: 'itemId and columnId are required' }], isError: true };
    const query = `query {
      items(ids: [${itemId}]) {
        column_values(ids: ["${columnId}"]) {
          id text value column { id title type }
        }
      }
    }`;
    return this.runQuery(query);
  }

  private async getUsers(args: Record<string, unknown>): Promise<ToolResult> {
    const limit = (args.limit as number) || 25;
    const page = (args.page as number) || 1;
    const kindArg = args.kind ? `, kind: ${args.kind as string}` : '';
    const nameArg = args.name ? `, name: "${(args.name as string).replace(/"/g, '\\"')}"` : '';
    const query = `query {
      users(limit: ${limit}, page: ${page}${kindArg}${nameArg}) {
        id name email title is_admin is_guest created_at
      }
    }`;
    return this.runQuery(query);
  }

  private async getMe(): Promise<ToolResult> {
    const query = `query { me { id name email title is_admin is_guest created_at account { id name } } }`;
    return this.runQuery(query);
  }

  private async listWorkspaces(args: Record<string, unknown>): Promise<ToolResult> {
    const limit = (args.limit as number) || 25;
    const page = (args.page as number) || 1;
    const query = `query {
      workspaces(limit: ${limit}, page: ${page}) {
        id name kind description
      }
    }`;
    return this.runQuery(query);
  }

  private async createWebhook(args: Record<string, unknown>): Promise<ToolResult> {
    const boardId = args.boardId as string;
    const url = args.url as string;
    const event = args.event as string;
    if (!boardId || !url || !event) {
      return { content: [{ type: 'text', text: 'boardId, url, and event are required' }], isError: true };
    }
    const configArg = args.config ? `, config: ${JSON.stringify(JSON.stringify(args.config))}` : '';
    const query = `mutation {
      create_webhook(board_id: ${boardId}, url: "${url}", event: ${event}${configArg}) {
        id board_id event
      }
    }`;
    return this.runQuery(query);
  }

  private async deleteWebhook(args: Record<string, unknown>): Promise<ToolResult> {
    const webhookId = args.webhookId as string;
    if (!webhookId) return { content: [{ type: 'text', text: 'webhookId is required' }], isError: true };
    const query = `mutation { delete_webhook(id: ${webhookId}) { id board_id } }`;
    return this.runQuery(query);
  }
}

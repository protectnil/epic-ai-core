/**
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

import { ToolDefinition, ToolResult } from './types.js';

export class MondayMCPServer {
  private graphqlUrl = 'https://api.monday.com/v2';

  constructor(private config: { api_token: string }) {}

  private async query(gql: string, variables: Record<string, unknown> = {}): Promise<{ data: unknown; ok: boolean }> {
    const response = await fetch(this.graphqlUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.config.api_token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ query: gql, variables }),
    });

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      data = { status: response.status, statusText: response.statusText };
    }
    return { data, ok: response.ok };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_boards',
        description: 'List monday.com boards',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Number of boards to return', default: 10 },
            page: { type: 'number', description: 'Page number', default: 1 },
            board_kind: { type: 'string', enum: ['public', 'private', 'share'], description: 'Board kind filter' },
          },
          required: [],
        },
      },
      {
        name: 'get_board_items',
        description: 'Get items from a monday.com board',
        inputSchema: {
          type: 'object',
          properties: {
            board_id: { type: 'string', description: 'The board ID' },
            limit: { type: 'number', description: 'Number of items to return', default: 25 },
            cursor: { type: 'string', description: 'Pagination cursor' },
          },
          required: ['board_id'],
        },
      },
      {
        name: 'create_item',
        description: 'Create a new item on a monday.com board',
        inputSchema: {
          type: 'object',
          properties: {
            board_id: { type: 'string', description: 'The board ID' },
            item_name: { type: 'string', description: 'Item name' },
            group_id: { type: 'string', description: 'Group ID within the board' },
            column_values: { type: 'string', description: 'JSON string of column values' },
          },
          required: ['board_id', 'item_name'],
        },
      },
      {
        name: 'update_item',
        description: 'Update column values on a monday.com item',
        inputSchema: {
          type: 'object',
          properties: {
            board_id: { type: 'string', description: 'The board ID' },
            item_id: { type: 'string', description: 'The item ID' },
            column_values: { type: 'string', description: 'JSON string of column values to update' },
          },
          required: ['board_id', 'item_id', 'column_values'],
        },
      },
      {
        name: 'list_workspaces',
        description: 'List monday.com workspaces',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Number of workspaces to return', default: 10 },
            page: { type: 'number', description: 'Page number', default: 1 },
          },
          required: [],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      let result: { data: unknown; ok: boolean };

      switch (name) {
        case 'list_boards': {
          result = await this.query(
            `query ListBoards($limit: Int, $page: Int) {
              boards(limit: $limit, page: $page) { id name description board_kind state }
            }`,
            { limit: args.limit ?? 10, page: args.page ?? 1 }
          );
          break;
        }
        case 'get_board_items': {
          result = await this.query(
            `query GetBoardItems($boardId: [ID!]!, $limit: Int, $cursor: String) {
              boards(ids: $boardId) {
                items_page(limit: $limit, cursor: $cursor) {
                  cursor
                  items { id name state column_values { id text value } }
                }
              }
            }`,
            { boardId: [args.board_id], limit: args.limit ?? 25, cursor: args.cursor ?? null }
          );
          break;
        }
        case 'create_item': {
          result = await this.query(
            `mutation CreateItem($boardId: ID!, $itemName: String!, $groupId: String, $columnValues: JSON) {
              create_item(board_id: $boardId, item_name: $itemName, group_id: $groupId, column_values: $columnValues) {
                id name
              }
            }`,
            {
              boardId: args.board_id,
              itemName: args.item_name,
              groupId: args.group_id ?? null,
              columnValues: args.column_values ?? null,
            }
          );
          break;
        }
        case 'update_item': {
          result = await this.query(
            `mutation UpdateItem($boardId: ID!, $itemId: ID!, $columnValues: JSON!) {
              change_multiple_column_values(board_id: $boardId, item_id: $itemId, column_values: $columnValues) {
                id name
              }
            }`,
            { boardId: args.board_id, itemId: args.item_id, columnValues: args.column_values }
          );
          break;
        }
        case 'list_workspaces': {
          result = await this.query(
            `query ListWorkspaces($limit: Int, $page: Int) {
              workspaces(limit: $limit, page: $page) { id name kind description }
            }`,
            { limit: args.limit ?? 10, page: args.page ?? 1 }
          );
          break;
        }
        default:
          return { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true };
      }

      return {
        content: [{ type: 'text', text: JSON.stringify(result.data, null, 2) }],
        isError: !result.ok,
      };
    } catch (err) {
      return {
        content: [{ type: 'text', text: err instanceof Error ? err.message : String(err) }],
        isError: true,
      };
    }
  }
}

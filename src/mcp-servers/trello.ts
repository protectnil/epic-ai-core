/**
 * Trello MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Trello REST API — Project management boards, lists, and cards.
// Base URL: https://api.trello.com/1
// Auth: API key + token passed as query parameters (key=, token=)
// Docs: https://developer.atlassian.com/cloud/trello/rest/
// Rate limits: 300 requests per 10 seconds per token; 100 requests per 10 seconds per key

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface TrelloConfig {
  apiKey: string;
  token: string;
  baseUrl?: string;
}

export class TrelloMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly token: string;
  private readonly baseUrl: string;

  constructor(config: TrelloConfig) {
    super();
    this.apiKey = config.apiKey;
    this.token = config.token;
    this.baseUrl = config.baseUrl || 'https://api.trello.com/1';
  }

  static catalog() {
    return {
      name: 'trello',
      displayName: 'Trello',
      version: '1.0.0',
      category: 'collaboration',
      keywords: ['trello', 'kanban', 'project management', 'boards', 'cards', 'lists', 'tasks', 'teams', 'agile', 'checklist', 'labels', 'comments'],
      toolNames: [
        'list_boards', 'get_board',
        'list_lists', 'create_list',
        'list_cards', 'get_card', 'create_card', 'update_card', 'move_card',
        'add_comment', 'list_members', 'add_label',
        'list_checklists', 'create_checklist', 'list_actions',
      ],
      description: 'Trello project management: manage boards, lists, cards, checklists, labels, comments, and team members.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_boards',
        description: 'List all Trello boards accessible to the authenticated user, optionally filtered by organization or starred status',
        inputSchema: {
          type: 'object',
          properties: {
            filter: {
              type: 'string',
              description: 'Filter boards: all, open, closed, starred, pinned, unpinned, members (default: open)',
            },
            organization_id: {
              type: 'string',
              description: 'Filter boards belonging to a specific Trello organization ID',
            },
            fields: {
              type: 'string',
              description: 'Comma-separated list of board fields to return (default: name,desc,url,prefs,closed)',
            },
          },
        },
      },
      {
        name: 'get_board',
        description: 'Get detailed information about a specific Trello board including its lists, members, and settings',
        inputSchema: {
          type: 'object',
          properties: {
            board_id: {
              type: 'string',
              description: 'Trello board ID or short link',
            },
            lists: {
              type: 'string',
              description: 'Include lists: none, open, closed, all (default: open)',
            },
            members: {
              type: 'string',
              description: 'Include members: none, normal, admins, owners, all (default: none)',
            },
          },
          required: ['board_id'],
        },
      },
      {
        name: 'list_lists',
        description: 'List all lists on a specific Trello board, optionally filtering by open or archived status',
        inputSchema: {
          type: 'object',
          properties: {
            board_id: {
              type: 'string',
              description: 'Trello board ID',
            },
            filter: {
              type: 'string',
              description: 'Filter lists: all, open, closed (default: open)',
            },
          },
          required: ['board_id'],
        },
      },
      {
        name: 'create_list',
        description: 'Create a new list on a Trello board at a specified position',
        inputSchema: {
          type: 'object',
          properties: {
            board_id: {
              type: 'string',
              description: 'Trello board ID to create the list on',
            },
            name: {
              type: 'string',
              description: 'Name of the new list',
            },
            pos: {
              type: 'string',
              description: 'Position of the list: top, bottom, or a positive number (default: bottom)',
            },
          },
          required: ['board_id', 'name'],
        },
      },
      {
        name: 'list_cards',
        description: 'List all cards on a Trello board or within a specific list, optionally filtering by status',
        inputSchema: {
          type: 'object',
          properties: {
            board_id: {
              type: 'string',
              description: 'Trello board ID to list cards from (use this OR list_id)',
            },
            list_id: {
              type: 'string',
              description: 'Trello list ID to list cards from (use this OR board_id)',
            },
            filter: {
              type: 'string',
              description: 'Filter cards: all, open, closed, visible (default: open)',
            },
            fields: {
              type: 'string',
              description: 'Comma-separated card fields to return (default: name,desc,due,dueComplete,labels,idList,url)',
            },
          },
        },
      },
      {
        name: 'get_card',
        description: 'Get detailed information about a specific Trello card including its description, due date, labels, members, and attachments',
        inputSchema: {
          type: 'object',
          properties: {
            card_id: {
              type: 'string',
              description: 'Trello card ID or short link',
            },
            members: {
              type: 'boolean',
              description: 'Include card members in response (default: false)',
            },
            checklists: {
              type: 'string',
              description: 'Include checklists: none, all (default: none)',
            },
            attachments: {
              type: 'boolean',
              description: 'Include attachments in response (default: false)',
            },
          },
          required: ['card_id'],
        },
      },
      {
        name: 'create_card',
        description: 'Create a new card on a Trello list with optional description, due date, labels, and member assignments',
        inputSchema: {
          type: 'object',
          properties: {
            list_id: {
              type: 'string',
              description: 'Trello list ID to create the card in',
            },
            name: {
              type: 'string',
              description: 'Name/title of the new card',
            },
            desc: {
              type: 'string',
              description: 'Card description (supports Markdown)',
            },
            due: {
              type: 'string',
              description: 'Due date in ISO 8601 format (e.g. 2026-04-15T17:00:00.000Z)',
            },
            id_labels: {
              type: 'string',
              description: 'Comma-separated label IDs to apply to the card',
            },
            id_members: {
              type: 'string',
              description: 'Comma-separated member IDs to assign to the card',
            },
            pos: {
              type: 'string',
              description: 'Position of the card in the list: top, bottom, or a positive number (default: bottom)',
            },
          },
          required: ['list_id', 'name'],
        },
      },
      {
        name: 'update_card',
        description: 'Update an existing Trello card — change name, description, due date, labels, members, or close/archive the card',
        inputSchema: {
          type: 'object',
          properties: {
            card_id: {
              type: 'string',
              description: 'Trello card ID to update',
            },
            name: {
              type: 'string',
              description: 'New name for the card',
            },
            desc: {
              type: 'string',
              description: 'New description for the card (supports Markdown)',
            },
            due: {
              type: 'string',
              description: 'New due date in ISO 8601 format (pass empty string to clear)',
            },
            due_complete: {
              type: 'boolean',
              description: 'Mark the due date as complete or incomplete',
            },
            closed: {
              type: 'boolean',
              description: 'Archive (true) or unarchive (false) the card',
            },
            id_labels: {
              type: 'string',
              description: 'Comma-separated label IDs to set on the card (replaces existing)',
            },
            id_members: {
              type: 'string',
              description: 'Comma-separated member IDs to assign (replaces existing)',
            },
          },
          required: ['card_id'],
        },
      },
      {
        name: 'move_card',
        description: 'Move a Trello card to a different list or board, optionally specifying position within the target list',
        inputSchema: {
          type: 'object',
          properties: {
            card_id: {
              type: 'string',
              description: 'Trello card ID to move',
            },
            list_id: {
              type: 'string',
              description: 'Target list ID to move the card to',
            },
            board_id: {
              type: 'string',
              description: 'Target board ID if moving to a different board',
            },
            pos: {
              type: 'string',
              description: 'Position in the target list: top, bottom, or a positive number (default: bottom)',
            },
          },
          required: ['card_id', 'list_id'],
        },
      },
      {
        name: 'add_comment',
        description: 'Add a comment to a Trello card on behalf of the authenticated user',
        inputSchema: {
          type: 'object',
          properties: {
            card_id: {
              type: 'string',
              description: 'Trello card ID to comment on',
            },
            text: {
              type: 'string',
              description: 'Comment text (supports Markdown and @mentions)',
            },
          },
          required: ['card_id', 'text'],
        },
      },
      {
        name: 'list_members',
        description: 'List members of a Trello board or organization, including their usernames and avatars',
        inputSchema: {
          type: 'object',
          properties: {
            board_id: {
              type: 'string',
              description: 'Trello board ID to list members from (use this OR organization_id)',
            },
            organization_id: {
              type: 'string',
              description: 'Trello organization ID to list members from (use this OR board_id)',
            },
            filter: {
              type: 'string',
              description: 'Member filter for board: all, admins, normal, owners (default: all)',
            },
          },
        },
      },
      {
        name: 'add_label',
        description: 'Add an existing label to a Trello card, or create a new label on a board and apply it',
        inputSchema: {
          type: 'object',
          properties: {
            card_id: {
              type: 'string',
              description: 'Trello card ID to add the label to',
            },
            label_id: {
              type: 'string',
              description: 'Existing label ID to add to the card (use this OR create a new label with name+color+board_id)',
            },
            name: {
              type: 'string',
              description: 'Name for a new label to create (requires board_id and color)',
            },
            color: {
              type: 'string',
              description: 'Color for a new label: red, orange, yellow, green, blue, purple, pink, lime, sky, black',
            },
            board_id: {
              type: 'string',
              description: 'Board ID to create the new label on (required when creating a new label)',
            },
          },
          required: ['card_id'],
        },
      },
      {
        name: 'list_checklists',
        description: 'List all checklists on a specific Trello card including their items and completion status',
        inputSchema: {
          type: 'object',
          properties: {
            card_id: {
              type: 'string',
              description: 'Trello card ID to list checklists from',
            },
            check_items: {
              type: 'string',
              description: 'Include check items: none, all (default: all)',
            },
          },
          required: ['card_id'],
        },
      },
      {
        name: 'create_checklist',
        description: 'Create a new checklist on a Trello card with optional initial items',
        inputSchema: {
          type: 'object',
          properties: {
            card_id: {
              type: 'string',
              description: 'Trello card ID to add the checklist to',
            },
            name: {
              type: 'string',
              description: 'Name of the checklist',
            },
            items: {
              type: 'array',
              description: 'Array of item name strings to add to the checklist',
              items: {
                type: 'string',
              },
            },
            pos: {
              type: 'string',
              description: 'Position of the checklist on the card: top, bottom, or a positive number (default: bottom)',
            },
          },
          required: ['card_id', 'name'],
        },
      },
      {
        name: 'list_actions',
        description: 'List activity actions on a Trello board or card, such as card moves, comments, and member changes',
        inputSchema: {
          type: 'object',
          properties: {
            board_id: {
              type: 'string',
              description: 'Trello board ID to list actions from (use this OR card_id)',
            },
            card_id: {
              type: 'string',
              description: 'Trello card ID to list actions from (use this OR board_id)',
            },
            filter: {
              type: 'string',
              description: 'Comma-separated action types to filter (e.g. commentCard,updateCard,moveCardToBoard)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of actions to return (default: 50, max: 1000)',
            },
            before: {
              type: 'string',
              description: 'Return actions before this action ID or date (for pagination)',
            },
          },
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
        case 'list_lists':
          return this.listLists(args);
        case 'create_list':
          return this.createList(args);
        case 'list_cards':
          return this.listCards(args);
        case 'get_card':
          return this.getCard(args);
        case 'create_card':
          return this.createCard(args);
        case 'update_card':
          return this.updateCard(args);
        case 'move_card':
          return this.moveCard(args);
        case 'add_comment':
          return this.addComment(args);
        case 'list_members':
          return this.listMembers(args);
        case 'add_label':
          return this.addLabel(args);
        case 'list_checklists':
          return this.listChecklists(args);
        case 'create_checklist':
          return this.createChecklist(args);
        case 'list_actions':
          return this.listActions(args);
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

  private authParams(): URLSearchParams {
    return new URLSearchParams({ key: this.apiKey, token: this.token });
  }

  private async apiGet(path: string, extra?: URLSearchParams): Promise<ToolResult> {
    const params = this.authParams();
    if (extra) {
      extra.forEach((v, k) => params.set(k, v));
    }
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}?${params.toString()}`, {
      headers: { 'Accept': 'application/json' },
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apiPost(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const params = this.authParams();
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}?${params.toString()}`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apiPut(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const params = this.authParams();
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}?${params.toString()}`, {
      method: 'PUT',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listBoards(args: Record<string, unknown>): Promise<ToolResult> {
    const extra = new URLSearchParams();
    extra.set('filter', (args.filter as string) || 'open');
    extra.set('fields', (args.fields as string) || 'name,desc,url,prefs,closed');
    if (args.organization_id) extra.set('idOrganization', args.organization_id as string);
    return this.apiGet('/members/me/boards', extra);
  }

  private async getBoard(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.board_id) {
      return { content: [{ type: 'text', text: 'board_id is required' }], isError: true };
    }
    const extra = new URLSearchParams();
    extra.set('lists', (args.lists as string) || 'open');
    extra.set('members', (args.members as string) || 'none');
    return this.apiGet(`/boards/${encodeURIComponent(args.board_id as string)}`, extra);
  }

  private async listLists(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.board_id) {
      return { content: [{ type: 'text', text: 'board_id is required' }], isError: true };
    }
    const extra = new URLSearchParams();
    extra.set('filter', (args.filter as string) || 'open');
    return this.apiGet(`/boards/${encodeURIComponent(args.board_id as string)}/lists`, extra);
  }

  private async createList(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.board_id || !args.name) {
      return { content: [{ type: 'text', text: 'board_id and name are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      idBoard: args.board_id,
      name: args.name,
      pos: (args.pos as string) || 'bottom',
    };
    return this.apiPost('/lists', body);
  }

  private async listCards(args: Record<string, unknown>): Promise<ToolResult> {
    const extra = new URLSearchParams();
    extra.set('filter', (args.filter as string) || 'open');
    extra.set('fields', (args.fields as string) || 'name,desc,due,dueComplete,labels,idList,url');
    if (args.list_id) {
      return this.apiGet(`/lists/${encodeURIComponent(args.list_id as string)}/cards`, extra);
    }
    if (args.board_id) {
      return this.apiGet(`/boards/${encodeURIComponent(args.board_id as string)}/cards`, extra);
    }
    return { content: [{ type: 'text', text: 'board_id or list_id is required' }], isError: true };
  }

  private async getCard(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.card_id) {
      return { content: [{ type: 'text', text: 'card_id is required' }], isError: true };
    }
    const extra = new URLSearchParams();
    if (args.members) extra.set('members', 'true');
    if (args.checklists) extra.set('checklists', args.checklists as string);
    if (args.attachments) extra.set('attachments', 'true');
    return this.apiGet(`/cards/${encodeURIComponent(args.card_id as string)}`, extra);
  }

  private async createCard(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.list_id || !args.name) {
      return { content: [{ type: 'text', text: 'list_id and name are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      idList: args.list_id,
      name: args.name,
      pos: (args.pos as string) || 'bottom',
    };
    if (args.desc) body.desc = args.desc;
    if (args.due) body.due = args.due;
    if (args.id_labels) body.idLabels = args.id_labels;
    if (args.id_members) body.idMembers = args.id_members;
    return this.apiPost('/cards', body);
  }

  private async updateCard(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.card_id) {
      return { content: [{ type: 'text', text: 'card_id is required' }], isError: true };
    }
    const body: Record<string, unknown> = {};
    if (args.name !== undefined) body.name = args.name;
    if (args.desc !== undefined) body.desc = args.desc;
    if (args.due !== undefined) body.due = args.due;
    if (args.due_complete !== undefined) body.dueComplete = args.due_complete;
    if (args.closed !== undefined) body.closed = args.closed;
    if (args.id_labels !== undefined) body.idLabels = args.id_labels;
    if (args.id_members !== undefined) body.idMembers = args.id_members;
    return this.apiPut(`/cards/${encodeURIComponent(args.card_id as string)}`, body);
  }

  private async moveCard(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.card_id || !args.list_id) {
      return { content: [{ type: 'text', text: 'card_id and list_id are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      idList: args.list_id,
      pos: (args.pos as string) || 'bottom',
    };
    if (args.board_id) body.idBoard = args.board_id;
    return this.apiPut(`/cards/${encodeURIComponent(args.card_id as string)}`, body);
  }

  private async addComment(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.card_id || !args.text) {
      return { content: [{ type: 'text', text: 'card_id and text are required' }], isError: true };
    }
    return this.apiPost(`/cards/${encodeURIComponent(args.card_id as string)}/actions/comments`, {
      text: args.text,
    });
  }

  private async listMembers(args: Record<string, unknown>): Promise<ToolResult> {
    const extra = new URLSearchParams();
    if (args.filter) extra.set('filter', args.filter as string);
    if (args.organization_id) {
      return this.apiGet(`/organizations/${encodeURIComponent(args.organization_id as string)}/members`, extra);
    }
    if (args.board_id) {
      extra.set('filter', (args.filter as string) || 'all');
      return this.apiGet(`/boards/${encodeURIComponent(args.board_id as string)}/members`, extra);
    }
    return { content: [{ type: 'text', text: 'board_id or organization_id is required' }], isError: true };
  }

  private async addLabel(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.card_id) {
      return { content: [{ type: 'text', text: 'card_id is required' }], isError: true };
    }
    // If an existing label_id is provided, add it directly to the card
    if (args.label_id) {
      return this.apiPost(`/cards/${encodeURIComponent(args.card_id as string)}/idLabels`, {
        value: args.label_id,
      });
    }
    // Otherwise create a new label on the board then add to the card
    if (!args.board_id || !args.color) {
      return { content: [{ type: 'text', text: 'board_id and color are required when creating a new label' }], isError: true };
    }
    const createResult = await this.apiPost('/labels', {
      idBoard: args.board_id,
      name: (args.name as string) || '',
      color: args.color,
    });
    if (createResult.isError) return createResult;
    let labelId: string;
    try {
      const parsed = JSON.parse(createResult.content[0].text) as { id: string };
      labelId = parsed.id;
    } catch {
      return { content: [{ type: 'text', text: 'Failed to parse label creation response' }], isError: true };
    }
    return this.apiPost(`/cards/${encodeURIComponent(args.card_id as string)}/idLabels`, {
      value: labelId,
    });
  }

  private async listChecklists(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.card_id) {
      return { content: [{ type: 'text', text: 'card_id is required' }], isError: true };
    }
    const extra = new URLSearchParams();
    extra.set('checkItems', (args.check_items as string) || 'all');
    return this.apiGet(`/cards/${encodeURIComponent(args.card_id as string)}/checklists`, extra);
  }

  private async createChecklist(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.card_id || !args.name) {
      return { content: [{ type: 'text', text: 'card_id and name are required' }], isError: true };
    }
    const createResult = await this.apiPost('/checklists', {
      idCard: args.card_id,
      name: args.name,
      pos: (args.pos as string) || 'bottom',
    });
    if (createResult.isError || !Array.isArray(args.items) || args.items.length === 0) {
      return createResult;
    }
    // Parse the checklist ID to add items
    let checklistId: string;
    try {
      const parsed = JSON.parse(createResult.content[0].text) as { id: string };
      checklistId = parsed.id;
    } catch {
      return createResult; // Return the checklist without items if parsing fails
    }
    const itemNames = args.items as string[];
    for (const itemName of itemNames) {
      const itemResult = await this.apiPost(`/checklists/${encodeURIComponent(checklistId)}/checkItems`, {
        name: itemName,
        checked: false,
      });
      if (itemResult.isError) return itemResult;
    }
    return this.apiGet(`/checklists/${encodeURIComponent(checklistId)}`);
  }

  private async listActions(args: Record<string, unknown>): Promise<ToolResult> {
    const extra = new URLSearchParams();
    extra.set('limit', String(Math.min((args.limit as number) || 50, 1000)));
    if (args.filter) extra.set('filter', args.filter as string);
    if (args.before) extra.set('before', args.before as string);
    if (args.card_id) {
      return this.apiGet(`/cards/${encodeURIComponent(args.card_id as string)}/actions`, extra);
    }
    if (args.board_id) {
      return this.apiGet(`/boards/${encodeURIComponent(args.board_id as string)}/actions`, extra);
    }
    return { content: [{ type: 'text', text: 'board_id or card_id is required' }], isError: true };
  }
}

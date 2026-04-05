/**
 * Ada MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// The adasupport/ada-skills GitHub repo is agent skills for the Ada platform, not a REST API MCP server.
// No official ada.cx MCP server exposing the REST API was found on GitHub as of March 2026.
//
// Base URL: https://{handle}.ada.support/api/v2 (handle is your Ada bot subdomain)
// Auth: Authorization: Bearer {apiKey}
//   API key generated in Ada dashboard: Settings > Integrations > API
// Docs: https://docs.ada.cx/reference/introduction/overview
// Rate limits: Not publicly documented; use cursor-based pagination

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface AdaConfig {
  handle: string;
  apiKey: string;
  baseUrl?: string;
}

export class AdaMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: AdaConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || `https://${config.handle}.ada.support/api/v2`;
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_conversations',
        description: 'List conversations (chat sessions) in Ada with optional date range and cursor pagination.',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of conversations to return (default: 25)',
            },
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
            start_date: {
              type: 'string',
              description: 'ISO 8601 start date filter (e.g. 2026-01-01T00:00:00Z)',
            },
            end_date: {
              type: 'string',
              description: 'ISO 8601 end date filter (e.g. 2026-03-24T23:59:59Z)',
            },
          },
        },
      },
      {
        name: 'get_conversation',
        description: 'Get full details of a specific Ada conversation by ID, including metadata and status.',
        inputSchema: {
          type: 'object',
          properties: {
            conversation_id: {
              type: 'string',
              description: 'Ada conversation ID',
            },
          },
          required: ['conversation_id'],
        },
      },
      {
        name: 'get_conversation_messages',
        description: 'Get the full message transcript for a conversation, including all bot and user turns.',
        inputSchema: {
          type: 'object',
          properties: {
            conversation_id: {
              type: 'string',
              description: 'Ada conversation ID',
            },
          },
          required: ['conversation_id'],
        },
      },
      {
        name: 'list_articles',
        description: 'List knowledge base articles in Ada with optional language filter and cursor pagination.',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of articles to return (default: 25)',
            },
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
            language: {
              type: 'string',
              description: 'Language code to filter articles (e.g. en, fr)',
            },
          },
        },
      },
      {
        name: 'get_article',
        description: 'Get a specific knowledge base article by ID, including title, body, and metadata.',
        inputSchema: {
          type: 'object',
          properties: {
            article_id: {
              type: 'string',
              description: 'Ada article ID',
            },
          },
          required: ['article_id'],
        },
      },
      {
        name: 'create_article',
        description: 'Create a new knowledge base article in Ada with title, body, and optional language.',
        inputSchema: {
          type: 'object',
          properties: {
            title: {
              type: 'string',
              description: 'Title of the knowledge base article',
            },
            body: {
              type: 'string',
              description: 'Body content of the article (HTML or plain text)',
            },
            language: {
              type: 'string',
              description: 'Language code for the article (default: en)',
            },
          },
          required: ['title', 'body'],
        },
      },
      {
        name: 'update_article',
        description: 'Update an existing knowledge base article in Ada by ID.',
        inputSchema: {
          type: 'object',
          properties: {
            article_id: {
              type: 'string',
              description: 'Ada article ID to update',
            },
            title: {
              type: 'string',
              description: 'Updated title of the article',
            },
            body: {
              type: 'string',
              description: 'Updated body content of the article',
            },
          },
          required: ['article_id'],
        },
      },
      {
        name: 'delete_article',
        description: 'Delete a knowledge base article from Ada by ID.',
        inputSchema: {
          type: 'object',
          properties: {
            article_id: {
              type: 'string',
              description: 'Ada article ID to delete',
            },
          },
          required: ['article_id'],
        },
      },
      {
        name: 'list_chatter',
        description: 'List chatter (bot response blocks) in the Ada bot with cursor pagination.',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of chatters to return (default: 25)',
            },
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
          },
        },
      },
      {
        name: 'list_variables',
        description: 'List all bot variables defined in the Ada bot configuration with cursor pagination.',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of variables to return (default: 25)',
            },
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
          },
        },
      },
      {
        name: 'list_end_users',
        description: 'List end users (chatter profiles) in Ada with cursor pagination.',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of end users to return (default: 25)',
            },
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
          },
        },
      },
      {
        name: 'get_end_user',
        description: 'Get the profile and metadata for a specific Ada end user by ID.',
        inputSchema: {
          type: 'object',
          properties: {
            end_user_id: {
              type: 'string',
              description: 'Ada end user ID',
            },
          },
          required: ['end_user_id'],
        },
      },
      {
        name: 'delete_end_user',
        description: 'Delete personal data for an Ada end user (Data Compliance API — GDPR/CCPA deletion).',
        inputSchema: {
          type: 'object',
          properties: {
            email: {
              type: 'string',
              description: 'Email address of the end user whose data should be deleted',
            },
          },
          required: ['email'],
        },
      },
      {
        name: 'list_integrations',
        description: 'List integrations connected to the Ada bot, including external app connections and their status.',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of integrations to return (default: 25)',
            },
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_conversations':
          return await this.listConversations(args);
        case 'get_conversation':
          return await this.getConversation(args);
        case 'get_conversation_messages':
          return await this.getConversationMessages(args);
        case 'list_articles':
          return await this.listArticles(args);
        case 'get_article':
          return await this.getArticle(args);
        case 'create_article':
          return await this.createArticle(args);
        case 'update_article':
          return await this.updateArticle(args);
        case 'delete_article':
          return await this.deleteArticle(args);
        case 'list_chatter':
          return await this.listChatter(args);
        case 'list_variables':
          return await this.listVariables(args);
        case 'list_end_users':
          return await this.listEndUsers(args);
        case 'get_end_user':
          return await this.getEndUser(args);
        case 'delete_end_user':
          return await this.deleteEndUser(args);
        case 'list_integrations':
          return await this.listIntegrations(args);
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
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  private async get(path: string, params: Record<string, string> = {}): Promise<ToolResult> {
    const qs = new URLSearchParams(params).toString();
    const url = `${this.baseUrl}${path}${qs ? '?' + qs : ''}`;
    const response = await this.fetchWithRetry(url, { method: 'GET', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Ada API error ${response.status}: ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Ada returned non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async post(path: string, body: unknown): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Ada API error ${response.status}: ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Ada returned non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async patch(path: string, body: unknown): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'PATCH',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Ada API error ${response.status}: ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Ada returned non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async del(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, { method: 'DELETE', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Ada API error ${response.status}: ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: JSON.stringify({ deleted: true }) }], isError: false };
  }

  private async listConversations(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (args.limit) params['limit'] = String(args.limit);
    if (args.cursor) params['cursor'] = args.cursor as string;
    if (args.start_date) params['start_date'] = args.start_date as string;
    if (args.end_date) params['end_date'] = args.end_date as string;
    return this.get('/conversations', params);
  }

  private async getConversation(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.conversation_id as string;
    if (!id) return { content: [{ type: 'text', text: 'conversation_id is required' }], isError: true };
    return this.get(`/conversations/${encodeURIComponent(id)}`);
  }

  private async getConversationMessages(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.conversation_id as string;
    if (!id) return { content: [{ type: 'text', text: 'conversation_id is required' }], isError: true };
    return this.get(`/conversations/${encodeURIComponent(id)}/messages`);
  }

  private async listArticles(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (args.limit) params['limit'] = String(args.limit);
    if (args.cursor) params['cursor'] = args.cursor as string;
    if (args.language) params['language'] = args.language as string;
    return this.get('/articles', params);
  }

  private async getArticle(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.article_id as string;
    if (!id) return { content: [{ type: 'text', text: 'article_id is required' }], isError: true };
    return this.get(`/articles/${encodeURIComponent(id)}`);
  }

  private async createArticle(args: Record<string, unknown>): Promise<ToolResult> {
    const title = args.title as string;
    const body = args.body as string;
    if (!title || !body) return { content: [{ type: 'text', text: 'title and body are required' }], isError: true };
    const payload: Record<string, unknown> = { title, body };
    if (args.language) payload['language'] = args.language;
    return this.post('/articles', payload);
  }

  private async updateArticle(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.article_id as string;
    if (!id) return { content: [{ type: 'text', text: 'article_id is required' }], isError: true };
    const payload: Record<string, unknown> = {};
    if (args.title) payload['title'] = args.title;
    if (args.body) payload['body'] = args.body;
    return this.patch(`/articles/${encodeURIComponent(id)}`, payload);
  }

  private async deleteArticle(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.article_id as string;
    if (!id) return { content: [{ type: 'text', text: 'article_id is required' }], isError: true };
    return this.del(`/articles/${encodeURIComponent(id)}`);
  }

  private async listChatter(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (args.limit) params['limit'] = String(args.limit);
    if (args.cursor) params['cursor'] = args.cursor as string;
    return this.get('/chatter', params);
  }

  private async listVariables(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (args.limit) params['limit'] = String(args.limit);
    if (args.cursor) params['cursor'] = args.cursor as string;
    return this.get('/variables', params);
  }

  private async listEndUsers(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (args.limit) params['limit'] = String(args.limit);
    if (args.cursor) params['cursor'] = args.cursor as string;
    return this.get('/end-users', params);
  }

  private async getEndUser(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.end_user_id as string;
    if (!id) return { content: [{ type: 'text', text: 'end_user_id is required' }], isError: true };
    return this.get(`/end-users/${encodeURIComponent(id)}`);
  }

  private async deleteEndUser(args: Record<string, unknown>): Promise<ToolResult> {
    const email = args.email as string;
    if (!email) return { content: [{ type: 'text', text: 'email is required' }], isError: true };
    return this.post('/data-compliance/delete', { email });
  }

  private async listIntegrations(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (args.limit) params['limit'] = String(args.limit);
    if (args.cursor) params['cursor'] = args.cursor as string;
    return this.get('/integrations', params);
  }

  static catalog() {
    return {
      name: 'ada',
      displayName: 'Ada',
      version: '1.0.0',
      category: 'crm' as const,
      keywords: ['ada'],
      toolNames: ['list_conversations', 'get_conversation', 'get_conversation_messages', 'list_articles', 'get_article', 'create_article', 'update_article', 'delete_article', 'list_chatter', 'list_variables', 'list_end_users', 'get_end_user', 'delete_end_user', 'list_integrations'],
      description: 'Ada adapter for the Epic AI Intelligence Platform',
      author: 'protectnil' as const,
    };
  }
}

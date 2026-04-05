/**
 * Flat MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03.
// No official Flat.io MCP server was found on GitHub.
//
// Base URL: https://api.flat.io/v2
// Auth: Bearer token (OAuth2 or Personal Access Token) — Authorization: Bearer {ACCESS_TOKEN}
// Docs: https://flat.io/developers/docs/api/
// Rate limits: See https://flat.io/developers/docs/api/rate-limits.html

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface FlatConfig {
  accessToken: string;
  baseUrl?: string;
}

export class FlatMCPServer extends MCPAdapterBase {
  private readonly accessToken: string;
  private readonly baseUrl: string;

  constructor(config: FlatConfig) {
    super();
    this.accessToken = config.accessToken;
    this.baseUrl = config.baseUrl ?? 'https://api.flat.io/v2';
  }

  private get authHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
    };
  }

  static catalog() {
    return {
      name: 'flat',
      displayName: 'Flat',
      version: '1.0.0',
      category: 'music' as const,
      keywords: [
        'flat', 'flat.io', 'music', 'score', 'sheet music', 'musicxml', 'midi',
        'notation', 'composition', 'revision', 'collection', 'collaborator',
        'comment', 'class', 'education', 'assignment', 'submission',
      ],
      toolNames: [
        'get_me',
        'create_score',
        'get_score',
        'list_scores',
        'edit_score',
        'delete_score',
        'list_score_revisions',
        'list_collections',
        'get_collection',
        'create_collection',
        'list_collection_scores',
        'add_score_to_collection',
        'list_score_collaborators',
        'add_score_collaborator',
        'list_score_comments',
        'post_score_comment',
      ],
      description:
        'Manage sheet music on Flat.io: create, import, edit, and export music scores (MusicXML, MIDI). ' +
        'Organize scores into collections, manage collaborators and comments, and administer educational classes and assignments.',
      author: 'protectnil' as const,
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'get_me',
        description:
          'Get the profile of the currently authenticated Flat user: name, email, plan, and account details.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'create_score',
        description:
          'Create a new music score on Flat, or import an existing document (MusicXML, MIDI, Guitar Pro, etc.) as a base64-encoded data string.',
        inputSchema: {
          type: 'object',
          properties: {
            title: {
              type: 'string',
              description: 'Title of the new score',
            },
            privacy: {
              type: 'string',
              description: 'Privacy setting: public, private, or privateLink (default: private)',
            },
            data: {
              type: 'string',
              description: 'Base64-encoded file data to import (MusicXML, MIDI, GP3/4/5/GPX, etc.)',
            },
            dataEncoding: {
              type: 'string',
              description: 'Encoding of the data field: base64 (default when data is provided)',
            },
            source: {
              type: 'object',
              description: 'Source document reference (e.g. Google Drive file ID)',
            },
          },
          required: ['title'],
        },
      },
      {
        name: 'get_score',
        description:
          'Retrieve metadata for a single Flat score: title, privacy, creator, collaborators, and revision info.',
        inputSchema: {
          type: 'object',
          properties: {
            score: {
              type: 'string',
              description: 'Unique score ID',
            },
            sharingKey: {
              type: 'string',
              description: 'Sharing key for private-link scores',
            },
          },
          required: ['score'],
        },
      },
      {
        name: 'list_scores',
        description:
          'List music scores accessible to the authenticated user. Optionally filter by collection or sharing state.',
        inputSchema: {
          type: 'object',
          properties: {
            parent: {
              type: 'string',
              description: 'Filter by parent collection ID. Use "root" for top-level scores.',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of scores to return (default: 25)',
            },
            next: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
          },
        },
      },
      {
        name: 'edit_score',
        description:
          'Update the metadata of an existing Flat score: title, privacy, subtitle, description, or tags.',
        inputSchema: {
          type: 'object',
          properties: {
            score: {
              type: 'string',
              description: 'Unique score ID to update',
            },
            title: {
              type: 'string',
              description: 'New title for the score',
            },
            privacy: {
              type: 'string',
              description: 'Privacy setting: public, private, or privateLink',
            },
            subtitle: {
              type: 'string',
              description: 'Subtitle displayed on the score',
            },
            description: {
              type: 'string',
              description: 'Description or notes for the score',
            },
          },
          required: ['score'],
        },
      },
      {
        name: 'delete_score',
        description:
          'Permanently delete a Flat score and all its revisions. This action cannot be undone.',
        inputSchema: {
          type: 'object',
          properties: {
            score: {
              type: 'string',
              description: 'Unique score ID to delete',
            },
          },
          required: ['score'],
        },
      },
      {
        name: 'list_score_revisions',
        description:
          'List all revisions for a Flat score, showing version history with timestamps and creator info.',
        inputSchema: {
          type: 'object',
          properties: {
            score: {
              type: 'string',
              description: 'Unique score ID',
            },
            sharingKey: {
              type: 'string',
              description: 'Sharing key for private-link scores',
            },
          },
          required: ['score'],
        },
      },
      {
        name: 'list_collections',
        description:
          'List all collections (folders) in the authenticated user\'s Flat account.',
        inputSchema: {
          type: 'object',
          properties: {
            parent: {
              type: 'string',
              description: 'Filter by parent collection ID',
            },
            sort: {
              type: 'string',
              description: 'Sort field: creationDate, title (default: creationDate)',
            },
            direction: {
              type: 'string',
              description: 'Sort direction: asc or desc (default: desc)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of collections to return (default: 25)',
            },
            next: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
          },
        },
      },
      {
        name: 'get_collection',
        description:
          'Retrieve metadata for a single Flat collection (folder): title, privacy, score count, and permissions.',
        inputSchema: {
          type: 'object',
          properties: {
            collection: {
              type: 'string',
              description: 'Unique collection ID',
            },
            sharingKey: {
              type: 'string',
              description: 'Sharing key for private-link collections',
            },
          },
          required: ['collection'],
        },
      },
      {
        name: 'create_collection',
        description:
          'Create a new collection (folder) in the authenticated user\'s Flat account.',
        inputSchema: {
          type: 'object',
          properties: {
            title: {
              type: 'string',
              description: 'Title of the new collection',
            },
            privacy: {
              type: 'string',
              description: 'Privacy setting: private (default). Other values: public, privateLink.',
            },
          },
          required: ['title'],
        },
      },
      {
        name: 'list_collection_scores',
        description:
          'List all scores contained within a specific Flat collection.',
        inputSchema: {
          type: 'object',
          properties: {
            collection: {
              type: 'string',
              description: 'Unique collection ID',
            },
            sharingKey: {
              type: 'string',
              description: 'Sharing key for private-link collections',
            },
            sort: {
              type: 'string',
              description: 'Sort field: creationDate, title',
            },
            direction: {
              type: 'string',
              description: 'Sort direction: asc or desc',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of scores to return',
            },
            next: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
          },
          required: ['collection'],
        },
      },
      {
        name: 'add_score_to_collection',
        description:
          'Add an existing Flat score to a collection (folder).',
        inputSchema: {
          type: 'object',
          properties: {
            collection: {
              type: 'string',
              description: 'Unique collection ID to add the score to',
            },
            score: {
              type: 'string',
              description: 'Unique score ID to add',
            },
          },
          required: ['collection', 'score'],
        },
      },
      {
        name: 'list_score_collaborators',
        description:
          'List all collaborators on a Flat score with their roles and access rights.',
        inputSchema: {
          type: 'object',
          properties: {
            score: {
              type: 'string',
              description: 'Unique score ID',
            },
            sharingKey: {
              type: 'string',
              description: 'Sharing key for private-link scores',
            },
          },
          required: ['score'],
        },
      },
      {
        name: 'add_score_collaborator',
        description:
          'Add a collaborator to a Flat score with a specified access right (read or write).',
        inputSchema: {
          type: 'object',
          properties: {
            score: {
              type: 'string',
              description: 'Unique score ID',
            },
            user: {
              type: 'string',
              description: 'Flat user ID or email address to add as collaborator',
            },
            group: {
              type: 'string',
              description: 'Flat group ID to add as collaborator',
            },
            aclRead: {
              type: 'boolean',
              description: 'Grant read access (default: true)',
            },
            aclWrite: {
              type: 'boolean',
              description: 'Grant write (edit) access (default: false)',
            },
            aclAdmin: {
              type: 'boolean',
              description: 'Grant admin access — can manage collaborators (default: false)',
            },
          },
          required: ['score'],
        },
      },
      {
        name: 'list_score_comments',
        description:
          'List all comments on a Flat score, including inline (measure-level) and general comments.',
        inputSchema: {
          type: 'object',
          properties: {
            score: {
              type: 'string',
              description: 'Unique score ID',
            },
            sharingKey: {
              type: 'string',
              description: 'Sharing key for private-link scores',
            },
            type: {
              type: 'string',
              description: 'Filter by comment type: document (general) or inline',
            },
          },
          required: ['score'],
        },
      },
      {
        name: 'post_score_comment',
        description:
          'Post a new comment on a Flat score. Supports general comments and inline comments anchored to a specific measure.',
        inputSchema: {
          type: 'object',
          properties: {
            score: {
              type: 'string',
              description: 'Unique score ID to comment on',
            },
            sharingKey: {
              type: 'string',
              description: 'Sharing key for private-link scores',
            },
            comment: {
              type: 'string',
              description: 'Comment text content',
            },
            revision: {
              type: 'string',
              description: 'Score revision ID to anchor the comment to',
            },
            mentions: {
              type: 'array',
              description: 'Array of user IDs to mention in the comment',
              items: { type: 'string' },
            },
          },
          required: ['score', 'comment'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'get_me':
          return await this.getMe();
        case 'create_score':
          return await this.createScore(args);
        case 'get_score':
          return await this.getScore(args);
        case 'list_scores':
          return await this.listScores(args);
        case 'edit_score':
          return await this.editScore(args);
        case 'delete_score':
          return await this.deleteScore(args);
        case 'list_score_revisions':
          return await this.listScoreRevisions(args);
        case 'list_collections':
          return await this.listCollections(args);
        case 'get_collection':
          return await this.getCollection(args);
        case 'create_collection':
          return await this.createCollection(args);
        case 'list_collection_scores':
          return await this.listCollectionScores(args);
        case 'add_score_to_collection':
          return await this.addScoreToCollection(args);
        case 'list_score_collaborators':
          return await this.listScoreCollaborators(args);
        case 'add_score_collaborator':
          return await this.addScoreCollaborator(args);
        case 'list_score_comments':
          return await this.listScoreComments(args);
        case 'post_score_comment':
          return await this.postScoreComment(args);
        default:
          return {
            content: [{ type: 'text', text: `Unknown tool: ${name}` }],
            isError: true,
          };
      }
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Tool execution failed: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }

  private async request(
    method: string,
    path: string,
    body?: Record<string, unknown>,
    params?: URLSearchParams,
  ): Promise<ToolResult> {
    const qs = params && params.toString() ? `?${params.toString()}` : '';
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}${qs}`, {
      method,
      headers: this.authHeaders,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (response.status === 204) {
      return {
        content: [{ type: 'text', text: JSON.stringify({ status: 204, message: 'Success (no content)' }) }],
        isError: false,
      };
    }

    if (!response.ok) {
      let errText = '';
      try { errText = await response.text(); } catch { /* ignore */ }
      return {
        content: [
          {
            type: 'text',
            text: `Flat API error ${response.status} ${response.statusText}: ${errText}`,
          },
        ],
        isError: true,
      };
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      const txt = await response.text().catch(() => '');
      return {
        content: [{ type: 'text', text: this.truncate(txt || JSON.stringify({ status: response.status })) }],
        isError: false,
      };
    }

    return {
      content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }],
      isError: false,
    };
  }

  private async getMe(): Promise<ToolResult> {
    return this.request('GET', '/me');
  }

  private async createScore(args: Record<string, unknown>): Promise<ToolResult> {
    const title = args.title as string;
    if (!title) {
      return { content: [{ type: 'text', text: 'title is required' }], isError: true };
    }
    const body: Record<string, unknown> = { title };
    if (args.privacy) body.privacy = args.privacy;
    if (args.data) {
      body.data = args.data;
      body.dataEncoding = (args.dataEncoding as string) ?? 'base64';
    }
    if (args.source) body.source = args.source;
    return this.request('POST', '/scores', body);
  }

  private async getScore(args: Record<string, unknown>): Promise<ToolResult> {
    const scoreId = args.score as string;
    if (!scoreId) {
      return { content: [{ type: 'text', text: 'score is required' }], isError: true };
    }
    const params = new URLSearchParams();
    if (args.sharingKey) params.set('sharingKey', args.sharingKey as string);
    return this.request('GET', `/scores/${encodeURIComponent(scoreId)}`, undefined,
      params.toString() ? params : undefined);
  }

  private async listScores(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.parent) params.set('parent', args.parent as string);
    if (args.limit) params.set('limit', String(args.limit as number));
    if (args.next) params.set('next', args.next as string);
    return this.request('GET', '/scores', undefined, params.toString() ? params : undefined);
  }

  private async editScore(args: Record<string, unknown>): Promise<ToolResult> {
    const scoreId = args.score as string;
    if (!scoreId) {
      return { content: [{ type: 'text', text: 'score is required' }], isError: true };
    }
    const body: Record<string, unknown> = {};
    if (args.title) body.title = args.title;
    if (args.privacy) body.privacy = args.privacy;
    if (args.subtitle) body.subtitle = args.subtitle;
    if (args.description) body.description = args.description;
    return this.request('PUT', `/scores/${encodeURIComponent(scoreId)}`, body);
  }

  private async deleteScore(args: Record<string, unknown>): Promise<ToolResult> {
    const scoreId = args.score as string;
    if (!scoreId) {
      return { content: [{ type: 'text', text: 'score is required' }], isError: true };
    }
    return this.request('DELETE', `/scores/${encodeURIComponent(scoreId)}`);
  }

  private async listScoreRevisions(args: Record<string, unknown>): Promise<ToolResult> {
    const scoreId = args.score as string;
    if (!scoreId) {
      return { content: [{ type: 'text', text: 'score is required' }], isError: true };
    }
    const params = new URLSearchParams();
    if (args.sharingKey) params.set('sharingKey', args.sharingKey as string);
    return this.request('GET', `/scores/${encodeURIComponent(scoreId)}/revisions`, undefined,
      params.toString() ? params : undefined);
  }

  private async listCollections(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.parent) params.set('parent', args.parent as string);
    if (args.sort) params.set('sort', args.sort as string);
    if (args.direction) params.set('direction', args.direction as string);
    if (args.limit) params.set('limit', String(args.limit as number));
    if (args.next) params.set('next', args.next as string);
    return this.request('GET', '/collections', undefined, params.toString() ? params : undefined);
  }

  private async getCollection(args: Record<string, unknown>): Promise<ToolResult> {
    const collectionId = args.collection as string;
    if (!collectionId) {
      return { content: [{ type: 'text', text: 'collection is required' }], isError: true };
    }
    const params = new URLSearchParams();
    if (args.sharingKey) params.set('sharingKey', args.sharingKey as string);
    return this.request('GET', `/collections/${encodeURIComponent(collectionId)}`, undefined,
      params.toString() ? params : undefined);
  }

  private async createCollection(args: Record<string, unknown>): Promise<ToolResult> {
    const title = args.title as string;
    if (!title) {
      return { content: [{ type: 'text', text: 'title is required' }], isError: true };
    }
    const body: Record<string, unknown> = { title };
    if (args.privacy) body.privacy = args.privacy;
    return this.request('POST', '/collections', body);
  }

  private async listCollectionScores(args: Record<string, unknown>): Promise<ToolResult> {
    const collectionId = args.collection as string;
    if (!collectionId) {
      return { content: [{ type: 'text', text: 'collection is required' }], isError: true };
    }
    const params = new URLSearchParams();
    if (args.sharingKey) params.set('sharingKey', args.sharingKey as string);
    if (args.sort) params.set('sort', args.sort as string);
    if (args.direction) params.set('direction', args.direction as string);
    if (args.limit) params.set('limit', String(args.limit as number));
    if (args.next) params.set('next', args.next as string);
    return this.request('GET', `/collections/${encodeURIComponent(collectionId)}/scores`, undefined,
      params.toString() ? params : undefined);
  }

  private async addScoreToCollection(args: Record<string, unknown>): Promise<ToolResult> {
    const collectionId = args.collection as string;
    const scoreId = args.score as string;
    if (!collectionId || !scoreId) {
      return { content: [{ type: 'text', text: 'collection and score are required' }], isError: true };
    }
    return this.request('PUT',
      `/collections/${encodeURIComponent(collectionId)}/scores/${encodeURIComponent(scoreId)}`);
  }

  private async listScoreCollaborators(args: Record<string, unknown>): Promise<ToolResult> {
    const scoreId = args.score as string;
    if (!scoreId) {
      return { content: [{ type: 'text', text: 'score is required' }], isError: true };
    }
    const params = new URLSearchParams();
    if (args.sharingKey) params.set('sharingKey', args.sharingKey as string);
    return this.request('GET', `/scores/${encodeURIComponent(scoreId)}/collaborators`, undefined,
      params.toString() ? params : undefined);
  }

  private async addScoreCollaborator(args: Record<string, unknown>): Promise<ToolResult> {
    const scoreId = args.score as string;
    if (!scoreId) {
      return { content: [{ type: 'text', text: 'score is required' }], isError: true };
    }
    const body: Record<string, unknown> = {};
    if (args.user) body.user = args.user;
    if (args.group) body.group = args.group;
    if (typeof args.aclRead === 'boolean') body.aclRead = args.aclRead;
    if (typeof args.aclWrite === 'boolean') body.aclWrite = args.aclWrite;
    if (typeof args.aclAdmin === 'boolean') body.aclAdmin = args.aclAdmin;
    return this.request('POST', `/scores/${encodeURIComponent(scoreId)}/collaborators`, body);
  }

  private async listScoreComments(args: Record<string, unknown>): Promise<ToolResult> {
    const scoreId = args.score as string;
    if (!scoreId) {
      return { content: [{ type: 'text', text: 'score is required' }], isError: true };
    }
    const params = new URLSearchParams();
    if (args.sharingKey) params.set('sharingKey', args.sharingKey as string);
    if (args.type) params.set('type', args.type as string);
    return this.request('GET', `/scores/${encodeURIComponent(scoreId)}/comments`, undefined,
      params.toString() ? params : undefined);
  }

  private async postScoreComment(args: Record<string, unknown>): Promise<ToolResult> {
    const scoreId = args.score as string;
    const comment = args.comment as string;
    if (!scoreId || !comment) {
      return { content: [{ type: 'text', text: 'score and comment are required' }], isError: true };
    }
    const params = new URLSearchParams();
    if (args.sharingKey) params.set('sharingKey', args.sharingKey as string);
    const body: Record<string, unknown> = { comment };
    if (args.revision) body.revision = args.revision;
    if (args.mentions) body.mentions = args.mentions;
    return this.request('POST', `/scores/${encodeURIComponent(scoreId)}/comments`, body,
      params.toString() ? params : undefined);
  }
}

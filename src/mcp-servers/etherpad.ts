/**
 * Etherpad MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None known.
// Our adapter covers: 20 tools (pads, text, HTML, groups, authors, sessions, chat, admin).
// Spec: Etherpad HTTP API v1.2.15
//
// Base URL: http://etherpad.local (configure per deployment)
// Auth: API key passed as query parameter `apikey` on every request
// Docs: https://etherpad.org/doc/v1.8.14/#index_http_api

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface EtherpadConfig {
  /** API key for authentication (required) */
  apiKey: string;
  /** Base URL of the Etherpad instance (default: http://etherpad.local) */
  baseUrl?: string;
}

export class EtherpadMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: EtherpadConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? 'http://etherpad.local';
  }

  static catalog() {
    return {
      name: 'etherpad',
      displayName: 'Etherpad',
      version: '1.2.15',
      category: 'collaboration',
      keywords: [
        'etherpad', 'collaboration', 'realtime', 'editor', 'pad', 'document',
        'text', 'html', 'group', 'author', 'session', 'chat', 'revision',
        'co-editing', 'open-source', 'notes', 'writing',
      ],
      toolNames: [
        'create_pad', 'delete_pad', 'get_text', 'set_text',
        'get_html', 'set_html', 'get_revisions_count', 'get_read_only_id',
        'list_all_pads', 'get_stats',
        'create_group', 'delete_group', 'list_all_groups', 'create_group_pad', 'list_pads',
        'create_author', 'create_author_if_not_exists_for', 'get_author_name',
        'create_session', 'delete_session',
      ],
      description: 'Etherpad real-time collaborative editor API: create and manage pads, read/write text and HTML content, manage revision history, groups, authors, sessions, and chat — for self-hosted Etherpad instances.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'create_pad',
        description: 'Create a new Etherpad pad with an optional initial text body',
        inputSchema: {
          type: 'object',
          properties: {
            padID: {
              type: 'string',
              description: 'Unique identifier for the new pad',
            },
            text: {
              type: 'string',
              description: 'Optional initial text content for the pad',
            },
          },
          required: ['padID'],
        },
      },
      {
        name: 'delete_pad',
        description: 'Permanently delete an Etherpad pad and all its revisions',
        inputSchema: {
          type: 'object',
          properties: {
            padID: {
              type: 'string',
              description: 'Identifier of the pad to delete',
            },
          },
          required: ['padID'],
        },
      },
      {
        name: 'get_text',
        description: 'Retrieve the plain text content of a pad at a specific revision (or latest)',
        inputSchema: {
          type: 'object',
          properties: {
            padID: {
              type: 'string',
              description: 'Identifier of the pad',
            },
            rev: {
              type: 'number',
              description: 'Revision number to retrieve (omit for latest)',
            },
          },
          required: ['padID'],
        },
      },
      {
        name: 'set_text',
        description: 'Replace the entire text content of a pad',
        inputSchema: {
          type: 'object',
          properties: {
            padID: {
              type: 'string',
              description: 'Identifier of the pad',
            },
            text: {
              type: 'string',
              description: 'New text content to set on the pad',
            },
          },
          required: ['padID', 'text'],
        },
      },
      {
        name: 'get_html',
        description: 'Retrieve the HTML content of a pad at a specific revision (or latest)',
        inputSchema: {
          type: 'object',
          properties: {
            padID: {
              type: 'string',
              description: 'Identifier of the pad',
            },
            rev: {
              type: 'number',
              description: 'Revision number to retrieve (omit for latest)',
            },
          },
          required: ['padID'],
        },
      },
      {
        name: 'set_html',
        description: 'Replace the entire HTML content of a pad',
        inputSchema: {
          type: 'object',
          properties: {
            padID: {
              type: 'string',
              description: 'Identifier of the pad',
            },
            html: {
              type: 'string',
              description: 'New HTML content to set on the pad',
            },
          },
          required: ['padID', 'html'],
        },
      },
      {
        name: 'get_revisions_count',
        description: 'Get the total number of saved revisions for a pad',
        inputSchema: {
          type: 'object',
          properties: {
            padID: {
              type: 'string',
              description: 'Identifier of the pad',
            },
          },
          required: ['padID'],
        },
      },
      {
        name: 'get_read_only_id',
        description: 'Get the read-only share link ID for a pad (allows viewing without editing)',
        inputSchema: {
          type: 'object',
          properties: {
            padID: {
              type: 'string',
              description: 'Identifier of the pad',
            },
          },
          required: ['padID'],
        },
      },
      {
        name: 'list_all_pads',
        description: 'List all pad identifiers on this Etherpad instance',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_stats',
        description: 'Retrieve server-wide statistics: total pads, users online, active pads',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'create_group',
        description: 'Create a new group in Etherpad to organize pads and manage access',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'delete_group',
        description: 'Delete a group and all its associated pads',
        inputSchema: {
          type: 'object',
          properties: {
            groupID: {
              type: 'string',
              description: 'Identifier of the group to delete',
            },
          },
          required: ['groupID'],
        },
      },
      {
        name: 'list_all_groups',
        description: 'List all group identifiers on this Etherpad instance',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'create_group_pad',
        description: 'Create a new pad inside a specific group',
        inputSchema: {
          type: 'object',
          properties: {
            groupID: {
              type: 'string',
              description: 'Identifier of the group to create the pad in',
            },
            padName: {
              type: 'string',
              description: 'Name for the new pad within the group',
            },
            text: {
              type: 'string',
              description: 'Optional initial text content for the group pad',
            },
          },
          required: ['groupID', 'padName'],
        },
      },
      {
        name: 'list_pads',
        description: 'List all pad identifiers within a specific group',
        inputSchema: {
          type: 'object',
          properties: {
            groupID: {
              type: 'string',
              description: 'Identifier of the group to list pads for',
            },
          },
          required: ['groupID'],
        },
      },
      {
        name: 'create_author',
        description: 'Create a new author identity, optionally setting a display name',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Display name for the author',
            },
          },
        },
      },
      {
        name: 'create_author_if_not_exists_for',
        description: 'Create an author or retrieve an existing one by external mapping ID (for SSO integration)',
        inputSchema: {
          type: 'object',
          properties: {
            authorMapper: {
              type: 'string',
              description: 'Your internal user ID to map to an Etherpad author',
            },
            name: {
              type: 'string',
              description: 'Display name for the author',
            },
          },
          required: ['authorMapper'],
        },
      },
      {
        name: 'get_author_name',
        description: 'Retrieve the display name of an Etherpad author by their author ID',
        inputSchema: {
          type: 'object',
          properties: {
            authorID: {
              type: 'string',
              description: 'Etherpad author identifier',
            },
          },
          required: ['authorID'],
        },
      },
      {
        name: 'create_session',
        description: 'Create an authenticated session for an author in a group (required for group pad access)',
        inputSchema: {
          type: 'object',
          properties: {
            groupID: {
              type: 'string',
              description: 'Group the session grants access to',
            },
            authorID: {
              type: 'string',
              description: 'Author identifier for the session',
            },
            validUntil: {
              type: 'number',
              description: 'Unix timestamp when the session expires',
            },
          },
          required: ['groupID', 'authorID', 'validUntil'],
        },
      },
      {
        name: 'delete_session',
        description: 'Delete an active session, revoking the author access to the group',
        inputSchema: {
          type: 'object',
          properties: {
            sessionID: {
              type: 'string',
              description: 'Identifier of the session to delete',
            },
          },
          required: ['sessionID'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'create_pad':                      return this.apiCall('createPad', { padID: args.padID, text: args.text });
        case 'delete_pad':                      return this.apiCall('deletePad', { padID: args.padID });
        case 'get_text':                        return this.apiCall('getText', { padID: args.padID, rev: args.rev });
        case 'set_text':                        return this.apiCall('setText', { padID: args.padID, text: args.text });
        case 'get_html':                        return this.apiCall('getHTML', { padID: args.padID, rev: args.rev });
        case 'set_html':                        return this.apiCall('setHTML', { padID: args.padID, html: args.html });
        case 'get_revisions_count':             return this.apiCall('getRevisionsCount', { padID: args.padID });
        case 'get_read_only_id':                return this.apiCall('getReadOnlyID', { padID: args.padID });
        case 'list_all_pads':                   return this.apiCall('listAllPads', {});
        case 'get_stats':                       return this.apiCall('getStats', {});
        case 'create_group':                    return this.apiCall('createGroup', {});
        case 'delete_group':                    return this.apiCall('deleteGroup', { groupID: args.groupID });
        case 'list_all_groups':                 return this.apiCall('listAllGroups', {});
        case 'create_group_pad':                return this.apiCall('createGroupPad', { groupID: args.groupID, padName: args.padName, text: args.text });
        case 'list_pads':                       return this.apiCall('listPads', { groupID: args.groupID });
        case 'create_author':                   return this.apiCall('createAuthor', { name: args.name });
        case 'create_author_if_not_exists_for': return this.apiCall('createAuthorIfNotExistsFor', { authorMapper: args.authorMapper, name: args.name });
        case 'get_author_name':                 return this.apiCall('getAuthorName', { authorID: args.authorID });
        case 'create_session':                  return this.apiCall('createSession', { groupID: args.groupID, authorID: args.authorID, validUntil: args.validUntil });
        case 'delete_session':                  return this.apiCall('deleteSession', { sessionID: args.sessionID });
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

  private async apiCall(endpoint: string, params: Record<string, unknown>): Promise<ToolResult> {
    const qs = new URLSearchParams({ apikey: this.apiKey });
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null) qs.set(k, String(v));
    }
    const url = `${this.baseUrl}/${endpoint}?${qs.toString()}`;
    const response = await this.fetchWithRetry(url, { method: 'GET' });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Etherpad returned non-JSON (HTTP ${response.status})`); }
    const d = data as { code?: number; message?: string; data?: unknown };
    if (d.code !== undefined && d.code !== 0) {
      return { content: [{ type: 'text', text: `Etherpad error (code ${d.code}): ${d.message ?? 'unknown error'}` }], isError: true };
    }
    return { content: [{ type: 'text', text: this.truncate(d.data ?? data) }], isError: false };
  }
}

/**
 * Box MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://developer.box.com/guides/box-mcp — remote (Box-hosted, streamable-HTTP)
//   and self-hosted (open-source, stdio) variants. Both actively maintained (2025, Box official).
//   Remote MCP covers 28 tools (file/folder read+write, search, Box AI, Hubs, Doc Gen).
//   Self-hosted MCP covers additional tools (shared links, users by email/name, DocGen templates).
// Our adapter covers: 23 tools (CRUD for files, folders, search, shared links, comments,
//   tasks, collaborations, users, trash). Broader CRUD coverage than vendor MCP.
//
// Integration: use-both
// MCP-sourced tools (6 unique to MCP): [ai_qa_single_file, ai_qa_multi_file, ai_qa_hub,
//   ai_extract_freeform, ai_extract_structured, ai_extract_structured_from_fields_enhanced]
// REST-sourced tools (23, this adapter): [get_file, upload_file, copy_file, delete_file,
//   get_file_versions, get_folder, list_folder_items, create_folder, copy_folder, delete_folder,
//   search_content, get_shared_link, create_shared_link, list_file_comments, create_comment,
//   list_file_tasks, create_task, list_collaborations, add_collaboration, get_user, list_users,
//   list_trash_items, restore_trashed_item]
// Combined coverage: 29 tools (REST: 23 + MCP AI: 6 unique)
//
// Base URL: https://api.box.com/2.0
// Auth: OAuth2 client credentials — POST https://api.box.com/oauth2/token
//       (grant_type=client_credentials, box_subject_type=enterprise)
// Docs: https://developer.box.com/reference
// Rate limits: ~1,000 API calls/min per OAuth2 token; burst limits vary by endpoint tier

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface BoxConfig {
  clientId: string;
  clientSecret: string;
  baseUrl?: string;
}

export class BoxMCPServer extends MCPAdapterBase {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly baseUrl: string;

  private bearerToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(config: BoxConfig) {
    super();
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.baseUrl = config.baseUrl ?? 'https://api.box.com/2.0';
  }

  static catalog() {
    return {
      name: 'box',
      displayName: 'Box',
      version: '1.0.0',
      category: 'misc',
      keywords: [
        'box', 'enterprise content', 'file storage', 'document management', 'compliance',
        'ecm', 'folder', 'file', 'share', 'collaboration', 'metadata', 'upload', 'download',
        'search', 'user', 'group', 'task', 'comment', 'webhook', 'trash',
      ],
      toolNames: [
        'get_file', 'upload_file', 'copy_file', 'delete_file', 'get_file_versions',
        'get_folder', 'list_folder_items', 'create_folder', 'copy_folder', 'delete_folder',
        'search_content',
        'get_shared_link', 'create_shared_link',
        'list_file_comments', 'create_comment',
        'list_file_tasks', 'create_task',
        'list_collaborations', 'add_collaboration',
        'get_user', 'list_users',
        'list_trash_items', 'restore_trashed_item',
      ],
      description: 'Box enterprise content management: upload and manage files and folders, search content, manage collaborations, shared links, tasks, comments, users, and trash.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      // ── Files ─────────────────────────────────────────────────────────────
      {
        name: 'get_file',
        description: 'Get metadata and details for a specific Box file by its file ID',
        inputSchema: {
          type: 'object',
          properties: {
            file_id: { type: 'string', description: 'Box file ID (numeric string, e.g. "123456789")' },
            fields: {
              type: 'string',
              description: 'Comma-separated list of fields to return (default: id, name, size, created_at, modified_at)',
            },
          },
          required: ['file_id'],
        },
      },
      {
        name: 'upload_file',
        description: 'Upload a new file to Box — NOTE: Box upload requires multipart/form-data; prefer the vendor MCP upload_file tool for actual file uploads. This REST path is limited.',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'File name including extension' },
            parent_id: { type: 'string', description: 'ID of the destination folder (use "0" for root)' },
            content_url: { type: 'string', description: 'Publicly accessible URL of the file content to ingest' },
          },
          required: ['name', 'parent_id', 'content_url'],
        },
      },
      {
        name: 'copy_file',
        description: 'Copy a Box file to another folder, optionally renaming it',
        inputSchema: {
          type: 'object',
          properties: {
            file_id: { type: 'string', description: 'ID of the file to copy' },
            parent_id: { type: 'string', description: 'ID of the destination folder' },
            name: { type: 'string', description: 'Optional new name for the copy' },
          },
          required: ['file_id', 'parent_id'],
        },
      },
      {
        name: 'delete_file',
        description: 'Delete a Box file by ID — moves it to trash (not permanent unless trash is empty)',
        inputSchema: {
          type: 'object',
          properties: {
            file_id: { type: 'string', description: 'Box file ID to delete' },
          },
          required: ['file_id'],
        },
      },
      {
        name: 'get_file_versions',
        description: 'List all versions of a Box file with timestamps, uploader, and size per version',
        inputSchema: {
          type: 'object',
          properties: {
            file_id: { type: 'string', description: 'Box file ID to retrieve versions for' },
            limit: { type: 'number', description: 'Max versions to return (default: 20, max: 1000)' },
            offset: { type: 'number', description: 'Pagination offset (default: 0)' },
          },
          required: ['file_id'],
        },
      },
      // ── Folders ───────────────────────────────────────────────────────────
      {
        name: 'get_folder',
        description: 'Get metadata and details for a Box folder by folder ID',
        inputSchema: {
          type: 'object',
          properties: {
            folder_id: { type: 'string', description: 'Box folder ID (use "0" for root folder)' },
            fields: { type: 'string', description: 'Comma-separated list of fields to return' },
          },
          required: ['folder_id'],
        },
      },
      {
        name: 'list_folder_items',
        description: 'List files and subfolders inside a Box folder with optional type filter and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            folder_id: { type: 'string', description: 'Box folder ID to list (use "0" for root)' },
            limit: { type: 'number', description: 'Max items to return (default: 100, max: 1000)' },
            offset: { type: 'number', description: 'Pagination offset (default: 0)' },
            sort: { type: 'string', description: 'Sort field: id, name, date, size (default: id)' },
            direction: { type: 'string', description: 'Sort direction: ASC or DESC (default: ASC)' },
            fields: { type: 'string', description: 'Comma-separated fields to return per item' },
          },
          required: ['folder_id'],
        },
      },
      {
        name: 'create_folder',
        description: 'Create a new folder inside a Box parent folder',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Name for the new folder' },
            parent_id: { type: 'string', description: 'ID of the parent folder (use "0" for root)' },
          },
          required: ['name', 'parent_id'],
        },
      },
      {
        name: 'copy_folder',
        description: 'Copy a Box folder and all its contents to another parent folder',
        inputSchema: {
          type: 'object',
          properties: {
            folder_id: { type: 'string', description: 'ID of the folder to copy' },
            parent_id: { type: 'string', description: 'Destination parent folder ID' },
            name: { type: 'string', description: 'Optional new name for the copied folder' },
          },
          required: ['folder_id', 'parent_id'],
        },
      },
      {
        name: 'delete_folder',
        description: 'Delete a Box folder by ID — moves to trash; set recursive=true to delete non-empty folders',
        inputSchema: {
          type: 'object',
          properties: {
            folder_id: { type: 'string', description: 'Box folder ID to delete' },
            recursive: { type: 'boolean', description: 'Delete folder even if it contains items (default: false)' },
          },
          required: ['folder_id'],
        },
      },
      // ── Search ────────────────────────────────────────────────────────────
      {
        name: 'search_content',
        description: 'Search Box content by keyword with optional filters for type, owner, date range, and metadata',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search query (keyword or phrase)' },
            type: { type: 'string', description: 'Filter by type: file, folder, web_link (default: all)' },
            limit: { type: 'number', description: 'Max results to return (default: 30, max: 200)' },
            offset: { type: 'number', description: 'Pagination offset (default: 0)' },
            owner_user_ids: { type: 'string', description: 'Comma-separated user IDs to filter by owner' },
            created_at_range: {
              type: 'string',
              description: 'Date range for creation: "2024-01-01T00:00:00Z,2024-12-31T23:59:59Z"',
            },
            file_extensions: { type: 'string', description: 'Comma-separated extensions to filter: pdf,docx,xlsx' },
            content_types: {
              type: 'string',
              description: 'Fields to search: name, description, file_content, comments, tags',
            },
          },
          required: ['query'],
        },
      },
      // ── Shared Links ──────────────────────────────────────────────────────
      {
        name: 'get_shared_link',
        description: 'Get the shared link details for a Box file, including URL, access level, and permissions',
        inputSchema: {
          type: 'object',
          properties: {
            file_id: { type: 'string', description: 'Box file ID to retrieve shared link for' },
          },
          required: ['file_id'],
        },
      },
      {
        name: 'create_shared_link',
        description: 'Create or update a shared link for a Box file with access level and optional password',
        inputSchema: {
          type: 'object',
          properties: {
            file_id: { type: 'string', description: 'Box file ID to create shared link for' },
            access: {
              type: 'string',
              description: 'Access level: open (public), company, collaborators (default: company)',
            },
            password: { type: 'string', description: 'Optional password to protect the shared link' },
            unshared_at: { type: 'string', description: 'ISO 8601 expiry date for the shared link' },
            can_download: { type: 'boolean', description: 'Allow viewers to download the file (default: true)' },
          },
          required: ['file_id'],
        },
      },
      // ── Comments ──────────────────────────────────────────────────────────
      {
        name: 'list_file_comments',
        description: 'List all comments on a Box file with commenter info and timestamps',
        inputSchema: {
          type: 'object',
          properties: {
            file_id: { type: 'string', description: 'Box file ID to retrieve comments for' },
          },
          required: ['file_id'],
        },
      },
      {
        name: 'create_comment',
        description: 'Post a comment on a Box file or reply to an existing comment',
        inputSchema: {
          type: 'object',
          properties: {
            item_id: { type: 'string', description: 'ID of the file to comment on' },
            message: { type: 'string', description: 'Comment text (supports @mentions)' },
            tagged_message: {
              type: 'string',
              description: 'Message with @mentions using format @[userid:user name]',
            },
          },
          required: ['item_id', 'message'],
        },
      },
      // ── Tasks ─────────────────────────────────────────────────────────────
      {
        name: 'list_file_tasks',
        description: 'List all tasks assigned on a Box file, including due dates and assignees',
        inputSchema: {
          type: 'object',
          properties: {
            file_id: { type: 'string', description: 'Box file ID to list tasks for' },
          },
          required: ['file_id'],
        },
      },
      {
        name: 'create_task',
        description: 'Create a review or completion task on a Box file with optional due date and message',
        inputSchema: {
          type: 'object',
          properties: {
            file_id: { type: 'string', description: 'File ID to attach the task to' },
            message: { type: 'string', description: 'Task description or instructions' },
            due_at: { type: 'string', description: 'Due date in ISO 8601 format (e.g. 2026-06-01T12:00:00Z)' },
            action: {
              type: 'string',
              description: 'Task action type: review (approve/reject) or complete (checkbox) — default: review',
            },
            completion_rule: {
              type: 'string',
              description: 'Who must complete: all_assignees or any_assignee (default: all_assignees)',
            },
          },
          required: ['file_id'],
        },
      },
      // ── Collaborations ────────────────────────────────────────────────────
      {
        name: 'list_collaborations',
        description: 'List collaborators on a Box file or folder with roles and access levels',
        inputSchema: {
          type: 'object',
          properties: {
            item_id: { type: 'string', description: 'File or folder ID to list collaborators for' },
            item_type: { type: 'string', description: 'Item type: file or folder' },
          },
          required: ['item_id', 'item_type'],
        },
      },
      {
        name: 'add_collaboration',
        description: 'Add a collaborator (user or group) to a Box file or folder with a specific role',
        inputSchema: {
          type: 'object',
          properties: {
            item_id: { type: 'string', description: 'File or folder ID to collaborate on' },
            item_type: { type: 'string', description: 'Item type: file or folder' },
            user_id: { type: 'string', description: 'Box user ID to add as collaborator' },
            role: {
              type: 'string',
              description: 'Collaboration role: editor, viewer, previewer, uploader, previewer_uploader, viewer_uploader, co-owner',
            },
            can_view_path: { type: 'boolean', description: 'Allow collaborator to see the folder path (default: false)' },
          },
          required: ['item_id', 'item_type', 'user_id', 'role'],
        },
      },
      // ── Users ─────────────────────────────────────────────────────────────
      {
        name: 'get_user',
        description: 'Get profile information for a Box user by user ID — name, email, role, and storage quota',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: { type: 'string', description: 'Box user ID (use "me" for the authenticated user)' },
            fields: { type: 'string', description: 'Comma-separated fields to return' },
          },
          required: ['user_id'],
        },
      },
      {
        name: 'list_users',
        description: 'List all managed users in the Box enterprise account with optional filter by name or login',
        inputSchema: {
          type: 'object',
          properties: {
            filter_term: { type: 'string', description: 'Filter by name or email address prefix' },
            user_type: {
              type: 'string',
              description: 'Filter by type: all, managed, external (default: managed)',
            },
            limit: { type: 'number', description: 'Max users to return (default: 100, max: 1000)' },
            offset: { type: 'number', description: 'Pagination offset (default: 0)' },
          },
        },
      },
      // ── Trash ─────────────────────────────────────────────────────────────
      {
        name: 'list_trash_items',
        description: 'List files and folders currently in the Box trash with optional sort and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Max items to return (default: 100, max: 1000)' },
            offset: { type: 'number', description: 'Pagination offset (default: 0)' },
            fields: { type: 'string', description: 'Comma-separated fields to return per item' },
          },
        },
      },
      {
        name: 'restore_trashed_item',
        description: 'Restore a trashed file or folder to its original or a specified parent location',
        inputSchema: {
          type: 'object',
          properties: {
            item_id: { type: 'string', description: 'ID of the trashed item to restore' },
            item_type: { type: 'string', description: 'Type of the item: file or folder' },
            name: { type: 'string', description: 'Optional new name if the original name conflicts' },
            parent_id: { type: 'string', description: 'Optional parent folder ID to restore into (defaults to original location)' },
          },
          required: ['item_id', 'item_type'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'get_file':              return this.getFile(args);
        case 'upload_file':           return this.uploadFile(args);
        case 'copy_file':             return this.copyFile(args);
        case 'delete_file':           return this.deleteFile(args);
        case 'get_file_versions':     return this.getFileVersions(args);
        case 'get_folder':            return this.getFolder(args);
        case 'list_folder_items':     return this.listFolderItems(args);
        case 'create_folder':         return this.createFolder(args);
        case 'copy_folder':           return this.copyFolder(args);
        case 'delete_folder':         return this.deleteFolder(args);
        case 'search_content':        return this.searchContent(args);
        case 'get_shared_link':       return this.getSharedLink(args);
        case 'create_shared_link':    return this.createSharedLink(args);
        case 'list_file_comments':    return this.listFileComments(args);
        case 'create_comment':        return this.createComment(args);
        case 'list_file_tasks':       return this.listFileTasks(args);
        case 'create_task':           return this.createTask(args);
        case 'list_collaborations':   return this.listCollaborations(args);
        case 'add_collaboration':     return this.addCollaboration(args);
        case 'get_user':              return this.getUser(args);
        case 'list_users':            return this.listUsers(args);
        case 'list_trash_items':      return this.listTrashItems(args);
        case 'restore_trashed_item':  return this.restoreTrashedItem(args);
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

  // ── Private helpers ────────────────────────────────────────────────────────

  private async getOrRefreshToken(): Promise<string> {
    const now = Date.now();
    if (this.bearerToken && this.tokenExpiry > now) return this.bearerToken;

    const response = await this.fetchWithRetry('https://api.box.com/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: this.clientId,
        client_secret: this.clientSecret,
        box_subject_type: 'enterprise',
      }).toString(),
    });
    if (!response.ok) throw new Error(`Box OAuth token request failed: ${response.statusText}`);
    const data = await response.json() as { access_token: string; expires_in: number };
    this.bearerToken = data.access_token;
    this.tokenExpiry = now + (data.expires_in - 60) * 1000;
    return this.bearerToken;
  }

  private async apiGet(path: string, params: Record<string, string> = {}): Promise<ToolResult> {
    const token = await this.getOrRefreshToken();
    const qs = Object.keys(params).length ? '?' + new URLSearchParams(params).toString() : '';
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}${qs}`, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apiPost(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const token = await this.getOrRefreshToken();
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apiDelete(path: string, params: Record<string, string> = {}): Promise<ToolResult> {
    const token = await this.getOrRefreshToken();
    const qs = Object.keys(params).length ? '?' + new URLSearchParams(params).toString() : '';
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}${qs}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: JSON.stringify({ deleted: true }) }], isError: false };
  }

  // ── Tool implementations ──────────────────────────────────────────────────

  private async getFile(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.file_id) return { content: [{ type: 'text', text: 'file_id is required' }], isError: true };
    const params: Record<string, string> = {};
    if (args.fields) params.fields = args.fields as string;
    return this.apiGet(`/files/${encodeURIComponent(args.file_id as string)}`, params);
  }

  private async uploadFile(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name || !args.parent_id || !args.content_url) {
      return { content: [{ type: 'text', text: 'name, parent_id, and content_url are required' }], isError: true };
    }
    // Box upload API requires multipart; this wraps the metadata portion via the uploads endpoint
    return this.apiPost('/files/content', {
      attributes: JSON.stringify({ name: args.name, parent: { id: args.parent_id } }),
      content_url: args.content_url,
    });
  }

  private async copyFile(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.file_id || !args.parent_id) {
      return { content: [{ type: 'text', text: 'file_id and parent_id are required' }], isError: true };
    }
    const body: Record<string, unknown> = { parent: { id: args.parent_id } };
    if (args.name) body.name = args.name;
    return this.apiPost(`/files/${encodeURIComponent(args.file_id as string)}/copy`, body);
  }

  private async deleteFile(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.file_id) return { content: [{ type: 'text', text: 'file_id is required' }], isError: true };
    return this.apiDelete(`/files/${encodeURIComponent(args.file_id as string)}`);
  }

  private async getFileVersions(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.file_id) return { content: [{ type: 'text', text: 'file_id is required' }], isError: true };
    const params: Record<string, string> = {
      limit: String((args.limit as number) ?? 20),
      offset: String((args.offset as number) ?? 0),
    };
    return this.apiGet(`/files/${encodeURIComponent(args.file_id as string)}/versions`, params);
  }

  private async getFolder(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.folder_id) return { content: [{ type: 'text', text: 'folder_id is required' }], isError: true };
    const params: Record<string, string> = {};
    if (args.fields) params.fields = args.fields as string;
    return this.apiGet(`/folders/${encodeURIComponent(args.folder_id as string)}`, params);
  }

  private async listFolderItems(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.folder_id) return { content: [{ type: 'text', text: 'folder_id is required' }], isError: true };
    const params: Record<string, string> = {
      limit: String((args.limit as number) ?? 100),
      offset: String((args.offset as number) ?? 0),
      sort: (args.sort as string) ?? 'id',
      direction: (args.direction as string) ?? 'ASC',
    };
    if (args.fields) params.fields = args.fields as string;
    return this.apiGet(`/folders/${encodeURIComponent(args.folder_id as string)}/items`, params);
  }

  private async createFolder(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name || !args.parent_id) {
      return { content: [{ type: 'text', text: 'name and parent_id are required' }], isError: true };
    }
    return this.apiPost('/folders', { name: args.name, parent: { id: args.parent_id } });
  }

  private async copyFolder(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.folder_id || !args.parent_id) {
      return { content: [{ type: 'text', text: 'folder_id and parent_id are required' }], isError: true };
    }
    const body: Record<string, unknown> = { parent: { id: args.parent_id } };
    if (args.name) body.name = args.name;
    return this.apiPost(`/folders/${encodeURIComponent(args.folder_id as string)}/copy`, body);
  }

  private async deleteFolder(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.folder_id) return { content: [{ type: 'text', text: 'folder_id is required' }], isError: true };
    const params: Record<string, string> = {};
    if (args.recursive) params.recursive = String(args.recursive);
    return this.apiDelete(`/folders/${encodeURIComponent(args.folder_id as string)}`, params);
  }

  private async searchContent(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.query) return { content: [{ type: 'text', text: 'query is required' }], isError: true };
    const params: Record<string, string> = {
      query: args.query as string,
      limit: String((args.limit as number) ?? 30),
      offset: String((args.offset as number) ?? 0),
    };
    if (args.type) params.type = args.type as string;
    if (args.owner_user_ids) params.owner_user_ids = args.owner_user_ids as string;
    if (args.created_at_range) params.created_at_range = args.created_at_range as string;
    if (args.file_extensions) params.file_extensions = args.file_extensions as string;
    if (args.content_types) params.content_types = args.content_types as string;
    return this.apiGet('/search', params);
  }

  private async getSharedLink(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.file_id) return { content: [{ type: 'text', text: 'file_id is required' }], isError: true };
    return this.apiGet(`/files/${encodeURIComponent(args.file_id as string)}`, { fields: 'shared_link' });
  }

  private async createSharedLink(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.file_id) return { content: [{ type: 'text', text: 'file_id is required' }], isError: true };
    const sharedLink: Record<string, unknown> = {
      access: (args.access as string) ?? 'company',
    };
    if (args.password) sharedLink.password = args.password;
    if (args.unshared_at) sharedLink.unshared_at = args.unshared_at;
    if (typeof args.can_download === 'boolean') {
      sharedLink.permissions = { can_download: args.can_download };
    }
    const token = await this.getOrRefreshToken();
    const response = await this.fetchWithRetry(`${this.baseUrl}/files/${encodeURIComponent(args.file_id as string)}?fields=shared_link`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ shared_link: sharedLink }),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listFileComments(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.file_id) return { content: [{ type: 'text', text: 'file_id is required' }], isError: true };
    return this.apiGet(`/files/${encodeURIComponent(args.file_id as string)}/comments`);
  }

  private async createComment(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.item_id || !args.message) {
      return { content: [{ type: 'text', text: 'item_id and message are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      item: { type: 'file', id: args.item_id },
      message: args.message,
    };
    if (args.tagged_message) body.tagged_message = args.tagged_message;
    return this.apiPost('/comments', body);
  }

  private async listFileTasks(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.file_id) return { content: [{ type: 'text', text: 'file_id is required' }], isError: true };
    return this.apiGet(`/files/${encodeURIComponent(args.file_id as string)}/tasks`);
  }

  private async createTask(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.file_id) return { content: [{ type: 'text', text: 'file_id is required' }], isError: true };
    const body: Record<string, unknown> = {
      item: { type: 'file', id: args.file_id },
      action: (args.action as string) ?? 'review',
      completion_rule: (args.completion_rule as string) ?? 'all_assignees',
    };
    if (args.message) body.message = args.message;
    if (args.due_at) body.due_at = args.due_at;
    return this.apiPost('/tasks', body);
  }

  private async listCollaborations(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.item_id || !args.item_type) {
      return { content: [{ type: 'text', text: 'item_id and item_type are required' }], isError: true };
    }
    const type = args.item_type as string;
    return this.apiGet(`/${type}s/${encodeURIComponent(args.item_id as string)}/collaborations`);
  }

  private async addCollaboration(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.item_id || !args.item_type || !args.user_id || !args.role) {
      return { content: [{ type: 'text', text: 'item_id, item_type, user_id, and role are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      item: { type: args.item_type, id: args.item_id },
      accessible_by: { type: 'user', id: args.user_id },
      role: args.role,
    };
    if (typeof args.can_view_path === 'boolean') body.can_view_path = args.can_view_path;
    return this.apiPost('/collaborations', body);
  }

  private async getUser(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.user_id) return { content: [{ type: 'text', text: 'user_id is required' }], isError: true };
    const params: Record<string, string> = {};
    if (args.fields) params.fields = args.fields as string;
    return this.apiGet(`/users/${encodeURIComponent(args.user_id as string)}`, params);
  }

  private async listUsers(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      limit: String((args.limit as number) ?? 100),
      offset: String((args.offset as number) ?? 0),
      user_type: (args.user_type as string) ?? 'managed',
    };
    if (args.filter_term) params.filter_term = args.filter_term as string;
    return this.apiGet('/users', params);
  }

  private async listTrashItems(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      limit: String((args.limit as number) ?? 100),
      offset: String((args.offset as number) ?? 0),
    };
    if (args.fields) params.fields = args.fields as string;
    return this.apiGet('/folders/trash/items', params);
  }

  private async restoreTrashedItem(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.item_id || !args.item_type) {
      return { content: [{ type: 'text', text: 'item_id and item_type are required' }], isError: true };
    }
    const body: Record<string, unknown> = {};
    if (args.name) body.name = args.name;
    if (args.parent_id) body.parent = { id: args.parent_id };
    const type = args.item_type as string;
    return this.apiPost(`/${type}s/${encodeURIComponent(args.item_id as string)}`, body);
  }
}

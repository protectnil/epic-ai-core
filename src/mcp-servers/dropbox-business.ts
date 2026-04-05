/**
 * Dropbox Business MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP (1): https://github.com/dropbox/mcp-server-dash — transport: stdio, auth: OAuth2 (PKCE)
//   Published by Dropbox Inc. (dropbox/mcp-server-dash). Last commit: Nov 3, 2025. Actively maintained.
//   Tools (4): dash_get_auth_url, dash_authenticate, dash_company_search, dash_get_file_details
//   Scope: Dropbox Dash AI search only — file content/metadata search across company content.
//   This MCP does NOT cover team member management, folder operations, sharing, groups, or audit events.
//
// Official MCP (2): https://help.dropbox.com/integrations/connect-dropbox-mcp-server — transport: streamable-HTTP, auth: Bearer token
//   Dropbox remote MCP server (beta as of 2026-03). Published by Dropbox.
//   Tools (5): ListFolder, GetFileMetadata, GetFileContent, GetUsageAndQuota, Search
//   Scope: Individual user file operations only — no team admin, members, groups, sharing management.
//
// Decision: use-both — Our REST adapter covers team admin operations (members, groups, sharing allowlists,
//   team folders, events) that neither MCP exposes. Use Dash MCP for AI-powered content search.
//   Use this adapter for all team administration workflows (team info, members CRUD, groups, audit log).
//
// Integration: use-both
// MCP-sourced tools (Dash, 4): dash_get_auth_url, dash_authenticate, dash_company_search, dash_get_file_details
// MCP-sourced tools (Remote, 5): ListFolder, GetFileMetadata, GetFileContent, GetUsageAndQuota, Search
// REST-sourced tools (18): get_team_info, list_team_members, get_team_member, add_team_member,
//   remove_team_member, list_files, get_file_metadata, search_files, create_folder, delete_file,
//   move_file, copy_file, share_file, list_shared_links, create_shared_link, list_groups, get_group,
//   list_team_events
// Combined coverage: use REST adapter for team admin; MCP for AI search and user file access
//
// Base URL: https://api.dropboxapi.com/2 (RPC) / https://content.dropboxapi.com/2 (uploads/downloads)
// Auth: Bearer access token (team access token with team_data.member and team_data.team scopes)
//       Use Select-User header to act on behalf of a team member.
// Docs: https://www.dropbox.com/developers/documentation/http/teams
// Rate limits: Not published per-endpoint; honor 429 responses with backoff

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface DropboxBusinessConfig {
  accessToken: string;
  baseUrl?: string;
}

export class DropboxBusinessMCPServer extends MCPAdapterBase {
  private readonly accessToken: string;
  private readonly baseUrl: string;

  constructor(config: DropboxBusinessConfig) {
    super();
    this.accessToken = config.accessToken;
    this.baseUrl = config.baseUrl || 'https://api.dropboxapi.com/2';
  }

  static catalog() {
    return {
      name: 'dropbox-business',
      displayName: 'Dropbox Business',
      version: '1.0.0',
      category: 'cloud',
      keywords: [
        'dropbox', 'dropbox business', 'cloud storage', 'file sharing', 'team files',
        'shared folders', 'team members', 'groups', 'file management', 'collaboration',
        'storage', 'sync', 'enterprise file sync',
      ],
      toolNames: [
        'get_team_info', 'list_team_members', 'get_team_member', 'add_team_member', 'remove_team_member',
        'list_files', 'get_file_metadata', 'search_files', 'create_folder', 'delete_file',
        'move_file', 'copy_file', 'share_file', 'list_shared_links', 'create_shared_link',
        'list_groups', 'get_group', 'list_team_events',
      ],
      description: 'Dropbox Business: manage team members, files, folders, shared links, groups, and audit team events.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'get_team_info',
        description: 'Get information about the Dropbox Business team including name, member count, storage quota, and policies',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'list_team_members',
        description: 'List all members of the Dropbox Business team with profile and role information',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of members to return per page (default: 100, max: 1000)',
            },
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response cursor field',
            },
          },
        },
      },
      {
        name: 'get_team_member',
        description: 'Get detailed profile for a specific Dropbox Business team member by email or team member ID',
        inputSchema: {
          type: 'object',
          properties: {
            email: {
              type: 'string',
              description: 'Team member email address (use email or team_member_id)',
            },
            team_member_id: {
              type: 'string',
              description: 'Dropbox team member ID (use email or team_member_id)',
            },
          },
        },
      },
      {
        name: 'add_team_member',
        description: 'Invite a new member to the Dropbox Business team by email with optional role assignment',
        inputSchema: {
          type: 'object',
          properties: {
            email: {
              type: 'string',
              description: 'Email address of the new team member to invite',
            },
            given_name: {
              type: 'string',
              description: 'First name of the new team member',
            },
            surname: {
              type: 'string',
              description: 'Last name of the new team member',
            },
            role: {
              type: 'string',
              description: 'Member role: member_only (default), support_admin, user_management_admin, team_admin',
            },
            send_welcome_email: {
              type: 'boolean',
              description: 'Send welcome email to the new member (default: true)',
            },
          },
          required: ['email', 'given_name', 'surname'],
        },
      },
      {
        name: 'remove_team_member',
        description: 'Remove a member from the Dropbox Business team and optionally transfer their files',
        inputSchema: {
          type: 'object',
          properties: {
            email: {
              type: 'string',
              description: 'Email address of the team member to remove',
            },
            team_member_id: {
              type: 'string',
              description: 'Team member ID of the member to remove',
            },
            wipe_data: {
              type: 'boolean',
              description: 'Wipe member data on linked devices after removal (default: true)',
            },
            transfer_dest_id: {
              type: 'string',
              description: 'Team member ID to transfer the removed member\'s files to',
            },
          },
        },
      },
      {
        name: 'list_files',
        description: 'List files and folders in a Dropbox path for a team member',
        inputSchema: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'Dropbox path to list (e.g. /Documents). Use empty string "" for root.',
            },
            member_email: {
              type: 'string',
              description: 'Team member email to list files on behalf of',
            },
            recursive: {
              type: 'boolean',
              description: 'Recursively list all files in subdirectories (default: false)',
            },
            include_deleted: {
              type: 'boolean',
              description: 'Include deleted files in results (default: false)',
            },
            limit: {
              type: 'number',
              description: 'Maximum entries to return per page (default: 100, max: 2000)',
            },
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
          },
          required: ['member_email'],
        },
      },
      {
        name: 'get_file_metadata',
        description: 'Get metadata for a file or folder in Dropbox including size, modification date, and sharing info',
        inputSchema: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'Dropbox path or file ID (e.g. /Reports/Q1.pdf or id:abc123)',
            },
            member_email: {
              type: 'string',
              description: 'Team member email to access the file on behalf of',
            },
          },
          required: ['path', 'member_email'],
        },
      },
      {
        name: 'search_files',
        description: 'Search for files and folders in Dropbox by filename or content keywords',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query string — matches filename and file content',
            },
            member_email: {
              type: 'string',
              description: 'Team member email to search files on behalf of',
            },
            path: {
              type: 'string',
              description: 'Restrict search to this path (optional, defaults to entire Dropbox)',
            },
            max_results: {
              type: 'number',
              description: 'Maximum number of search results to return (default: 20, max: 100)',
            },
            file_extensions: {
              type: 'string',
              description: 'Comma-separated list of file extensions to filter results (e.g. pdf,docx)',
            },
          },
          required: ['query', 'member_email'],
        },
      },
      {
        name: 'create_folder',
        description: 'Create a new folder at a specified Dropbox path for a team member',
        inputSchema: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'Full Dropbox path for the new folder (e.g. /Projects/2026)',
            },
            member_email: {
              type: 'string',
              description: 'Team member email to create the folder on behalf of',
            },
            autorename: {
              type: 'boolean',
              description: 'Automatically rename if a folder with the same name exists (default: false)',
            },
          },
          required: ['path', 'member_email'],
        },
      },
      {
        name: 'delete_file',
        description: 'Delete a file or folder at a Dropbox path for a team member (moves to trash)',
        inputSchema: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'Dropbox path of the file or folder to delete',
            },
            member_email: {
              type: 'string',
              description: 'Team member email whose file to delete',
            },
          },
          required: ['path', 'member_email'],
        },
      },
      {
        name: 'move_file',
        description: 'Move a file or folder from one Dropbox path to another for a team member',
        inputSchema: {
          type: 'object',
          properties: {
            from_path: {
              type: 'string',
              description: 'Current Dropbox path of the file or folder',
            },
            to_path: {
              type: 'string',
              description: 'Destination Dropbox path for the file or folder',
            },
            member_email: {
              type: 'string',
              description: 'Team member email whose file to move',
            },
            autorename: {
              type: 'boolean',
              description: 'Automatically rename destination if path already exists (default: false)',
            },
          },
          required: ['from_path', 'to_path', 'member_email'],
        },
      },
      {
        name: 'copy_file',
        description: 'Copy a file or folder from one Dropbox path to another for a team member',
        inputSchema: {
          type: 'object',
          properties: {
            from_path: {
              type: 'string',
              description: 'Source Dropbox path of the file or folder',
            },
            to_path: {
              type: 'string',
              description: 'Destination Dropbox path for the copy',
            },
            member_email: {
              type: 'string',
              description: 'Team member email whose file to copy',
            },
            autorename: {
              type: 'boolean',
              description: 'Automatically rename destination if path already exists (default: false)',
            },
          },
          required: ['from_path', 'to_path', 'member_email'],
        },
      },
      {
        name: 'share_file',
        description: 'Share a file or folder with specific users via Dropbox sharing with configurable permissions',
        inputSchema: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'Dropbox path of the file or folder to share',
            },
            member_email: {
              type: 'string',
              description: 'Team member email who owns the file to share',
            },
            emails: {
              type: 'string',
              description: 'Comma-separated list of email addresses to share with',
            },
            access_level: {
              type: 'string',
              description: 'Permission level: viewer, editor, owner (default: viewer)',
            },
            message: {
              type: 'string',
              description: 'Optional message to include in the sharing notification',
            },
          },
          required: ['path', 'member_email', 'emails'],
        },
      },
      {
        name: 'list_shared_links',
        description: 'List shared links created by a team member, optionally filtered to a specific path',
        inputSchema: {
          type: 'object',
          properties: {
            member_email: {
              type: 'string',
              description: 'Team member email whose shared links to list',
            },
            path: {
              type: 'string',
              description: 'Filter links for a specific Dropbox path',
            },
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
          },
          required: ['member_email'],
        },
      },
      {
        name: 'create_shared_link',
        description: 'Create a public shared link for a file or folder with optional expiry and password',
        inputSchema: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'Dropbox path of the file or folder to create a link for',
            },
            member_email: {
              type: 'string',
              description: 'Team member email who owns the file',
            },
            requested_visibility: {
              type: 'string',
              description: 'Link visibility: public (default), team_only, password',
            },
            link_password: {
              type: 'string',
              description: 'Password for the link (required when visibility is password)',
            },
            expires: {
              type: 'string',
              description: 'Link expiry date in ISO 8601 format (e.g. 2026-12-31T23:59:59Z)',
            },
          },
          required: ['path', 'member_email'],
        },
      },
      {
        name: 'list_groups',
        description: 'List all groups in the Dropbox Business team with member counts and sharing policies',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of groups to return (default: 100, max: 1000)',
            },
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
          },
        },
      },
      {
        name: 'get_group',
        description: 'Get detailed information about a Dropbox Business group including members and external sharing settings',
        inputSchema: {
          type: 'object',
          properties: {
            group_id: {
              type: 'string',
              description: 'Dropbox group ID',
            },
          },
          required: ['group_id'],
        },
      },
      {
        name: 'list_team_events',
        description: 'Retrieve audit log events for the Dropbox Business team with optional filters for event type and date range',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of events to return (default: 50, max: 1000)',
            },
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
            start_time: {
              type: 'string',
              description: 'Filter events after this ISO 8601 datetime (e.g. 2026-01-01T00:00:00Z)',
            },
            end_time: {
              type: 'string',
              description: 'Filter events before this ISO 8601 datetime',
            },
            event_type: {
              type: 'string',
              description: 'Filter by event category (e.g. file_operations, sharing, account, devices)',
            },
            account_id: {
              type: 'string',
              description: 'Filter events for a specific team member account ID',
            },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'get_team_info':
          return this.getTeamInfo();
        case 'list_team_members':
          return this.listTeamMembers(args);
        case 'get_team_member':
          return this.getTeamMember(args);
        case 'add_team_member':
          return this.addTeamMember(args);
        case 'remove_team_member':
          return this.removeTeamMember(args);
        case 'list_files':
          return this.listFiles(args);
        case 'get_file_metadata':
          return this.getFileMetadata(args);
        case 'search_files':
          return this.searchFiles(args);
        case 'create_folder':
          return this.createFolder(args);
        case 'delete_file':
          return this.deleteFile(args);
        case 'move_file':
          return this.moveFile(args);
        case 'copy_file':
          return this.copyFile(args);
        case 'share_file':
          return this.shareFile(args);
        case 'list_shared_links':
          return this.listSharedLinks(args);
        case 'create_shared_link':
          return this.createSharedLink(args);
        case 'list_groups':
          return this.listGroups(args);
        case 'get_group':
          return this.getGroup(args);
        case 'list_team_events':
          return this.listTeamEvents(args);
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

  private get baseHeaders(): Record<string, string> {
    return {
      'Authorization': `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
    };
  }

  private memberHeaders(memberEmail: string): Record<string, string> {
    return { ...this.baseHeaders, 'Dropbox-API-Select-User': memberEmail };
  }


  private async rpcPost(endpoint: string, body: unknown, headers?: Record<string, string>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: headers || this.baseHeaders,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    // 200 with empty body for some endpoints
    const text = await response.text();
    if (!text) return { content: [{ type: 'text', text: 'Success (no content returned)' }], isError: false };
    try {
      const data = JSON.parse(text);
      return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
    } catch {
      return { content: [{ type: 'text', text: text.slice(0, 10_000) }], isError: false };
    }
  }

  private async getTeamInfo(): Promise<ToolResult> {
    return this.rpcPost('/team/get_info', null);
  }

  private async listTeamMembers(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.cursor) {
      return this.rpcPost('/team/members/list/continue_v2', { cursor: args.cursor });
    }
    return this.rpcPost('/team/members/list_v2', { limit: (args.limit as number) || 100 });
  }

  private async getTeamMember(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.email && !args.team_member_id) {
      return { content: [{ type: 'text', text: 'email or team_member_id is required' }], isError: true };
    }
    const member = args.email
      ? { '.tag': 'email', email: args.email }
      : { '.tag': 'team_member_id', team_member_id: args.team_member_id };
    return this.rpcPost('/team/members/get_info_v2', { members: [member] });
  }

  private async addTeamMember(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.email || !args.given_name || !args.surname) {
      return { content: [{ type: 'text', text: 'email, given_name, and surname are required' }], isError: true };
    }
    const memberEntry: Record<string, unknown> = {
      member_email: args.email,
      member_given_name: args.given_name,
      member_surname: args.surname,
      send_welcome_email: typeof args.send_welcome_email === 'boolean' ? args.send_welcome_email : true,
    };
    if (args.role) memberEntry.role = { '.tag': args.role };
    return this.rpcPost('/team/members/add_v2', { new_members: [memberEntry], force_async: false });
  }

  private async removeTeamMember(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.email && !args.team_member_id) {
      return { content: [{ type: 'text', text: 'email or team_member_id is required' }], isError: true };
    }
    const user = args.email
      ? { '.tag': 'email', email: args.email }
      : { '.tag': 'team_member_id', team_member_id: args.team_member_id };
    const body: Record<string, unknown> = {
      user,
      wipe_data: typeof args.wipe_data === 'boolean' ? args.wipe_data : true,
    };
    if (args.transfer_dest_id) {
      body.transfer_dest_id = { '.tag': 'team_member_id', team_member_id: args.transfer_dest_id };
    }
    return this.rpcPost('/team/members/remove', body);
  }

  private async listFiles(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.member_email) return { content: [{ type: 'text', text: 'member_email is required' }], isError: true };
    const headers = this.memberHeaders(args.member_email as string);
    if (args.cursor) {
      return this.rpcPost('/files/list_folder/continue', { cursor: args.cursor }, headers);
    }
    const body: Record<string, unknown> = {
      path: (args.path as string) || '',
      recursive: (args.recursive as boolean) || false,
      include_deleted: (args.include_deleted as boolean) || false,
      limit: (args.limit as number) || 100,
    };
    return this.rpcPost('/files/list_folder', body, headers);
  }

  private async getFileMetadata(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.path || !args.member_email) return { content: [{ type: 'text', text: 'path and member_email are required' }], isError: true };
    const headers = this.memberHeaders(args.member_email as string);
    return this.rpcPost('/files/get_metadata', { path: args.path, include_media_info: true }, headers);
  }

  private async searchFiles(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.query || !args.member_email) return { content: [{ type: 'text', text: 'query and member_email are required' }], isError: true };
    const headers = this.memberHeaders(args.member_email as string);
    const options: Record<string, unknown> = {
      max_results: (args.max_results as number) || 20,
    };
    if (args.path) options.path = args.path;
    if (args.file_extensions) {
      options.file_extensions = (args.file_extensions as string).split(',').map(e => e.trim());
    }
    return this.rpcPost('/files/search_v2', { query: args.query, options }, headers);
  }

  private async createFolder(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.path || !args.member_email) return { content: [{ type: 'text', text: 'path and member_email are required' }], isError: true };
    const headers = this.memberHeaders(args.member_email as string);
    return this.rpcPost('/files/create_folder_v2', {
      path: args.path,
      autorename: (args.autorename as boolean) || false,
    }, headers);
  }

  private async deleteFile(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.path || !args.member_email) return { content: [{ type: 'text', text: 'path and member_email are required' }], isError: true };
    const headers = this.memberHeaders(args.member_email as string);
    return this.rpcPost('/files/delete_v2', { path: args.path }, headers);
  }

  private async moveFile(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.from_path || !args.to_path || !args.member_email) {
      return { content: [{ type: 'text', text: 'from_path, to_path, and member_email are required' }], isError: true };
    }
    const headers = this.memberHeaders(args.member_email as string);
    return this.rpcPost('/files/move_v2', {
      from_path: args.from_path,
      to_path: args.to_path,
      autorename: (args.autorename as boolean) || false,
    }, headers);
  }

  private async copyFile(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.from_path || !args.to_path || !args.member_email) {
      return { content: [{ type: 'text', text: 'from_path, to_path, and member_email are required' }], isError: true };
    }
    const headers = this.memberHeaders(args.member_email as string);
    return this.rpcPost('/files/copy_v2', {
      from_path: args.from_path,
      to_path: args.to_path,
      autorename: (args.autorename as boolean) || false,
    }, headers);
  }

  private async shareFile(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.path || !args.member_email || !args.emails) {
      return { content: [{ type: 'text', text: 'path, member_email, and emails are required' }], isError: true };
    }
    const headers = this.memberHeaders(args.member_email as string);
    const members = (args.emails as string).split(',').map(email => ({
      member: { '.tag': 'email', email: email.trim() },
      access_level: { '.tag': (args.access_level as string) || 'viewer' },
    }));
    const body: Record<string, unknown> = { path: args.path, members };
    if (args.message) body.message = args.message;
    return this.rpcPost('/sharing/add_file_member', body, headers);
  }

  private async listSharedLinks(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.member_email) return { content: [{ type: 'text', text: 'member_email is required' }], isError: true };
    const headers = this.memberHeaders(args.member_email as string);
    const body: Record<string, unknown> = {};
    if (args.path) body.path = args.path;
    if (args.cursor) body.cursor = args.cursor;
    return this.rpcPost('/sharing/list_shared_links', body, headers);
  }

  private async createSharedLink(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.path || !args.member_email) return { content: [{ type: 'text', text: 'path and member_email are required' }], isError: true };
    const headers = this.memberHeaders(args.member_email as string);
    const settings: Record<string, unknown> = {};
    if (args.requested_visibility) settings.requested_visibility = { '.tag': args.requested_visibility };
    if (args.link_password) settings.link_password = args.link_password;
    if (args.expires) settings.expires = args.expires;
    return this.rpcPost('/sharing/create_shared_link_with_settings', {
      path: args.path,
      settings,
    }, headers);
  }

  private async listGroups(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.cursor) {
      return this.rpcPost('/team/groups/list/continue', { cursor: args.cursor });
    }
    return this.rpcPost('/team/groups/list', { limit: (args.limit as number) || 100 });
  }

  private async getGroup(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.group_id) return { content: [{ type: 'text', text: 'group_id is required' }], isError: true };
    return this.rpcPost('/team/groups/get_info', {
      groups: [{ '.tag': 'group_id', group_id: args.group_id }],
    });
  }

  private async listTeamEvents(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.cursor) {
      return this.rpcPost('/team_log/get_events/continue', { cursor: args.cursor });
    }
    const body: Record<string, unknown> = {
      limit: (args.limit as number) || 50,
    };
    if (args.start_time) body.time = { start_time: args.start_time, ...(args.end_time ? { end_time: args.end_time } : {}) };
    if (args.event_type) body.event_type = { '.tag': args.event_type };
    if (args.account_id) body.account_id = args.account_id;
    return this.rpcPost('/team_log/get_events', body);
  }
}

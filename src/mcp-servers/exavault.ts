/**
 * ExaVault MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03. ExaVault has not published an official MCP server.
//
// Base URL: https://{accountname}.exavault.com/api/v2
//   Replace {accountname} with the ExaVault account name (subdomain).
// Auth: Two required headers per request:
//   ev-api-key:      API key for the account
//   ev-access-token: Access token (session token) for the request
// Docs: https://www.exavault.com/developer/api-docs/
// Rate limits: Not publicly documented.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface ExaVaultConfig {
  accountName: string;
  apiKey: string;
  accessToken: string;
  baseUrl?: string;
}

export class ExaVaultMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly accessToken: string;
  private readonly baseUrl: string;

  constructor(config: ExaVaultConfig) {
    super();
    this.apiKey = config.apiKey;
    this.accessToken = config.accessToken;
    this.baseUrl = config.baseUrl || `https://${config.accountName}.exavault.com/api/v2`;
  }

  static catalog() {
    return {
      name: 'exavault',
      displayName: 'ExaVault',
      version: '1.0.0',
      category: 'cloud' as const,
      keywords: ['exavault', 'file storage', 'ftp', 'sftp', 'cloud storage', 'file transfer', 'file management', 'share', 'upload', 'download'],
      toolNames: [
        'get_account', 'update_account',
        'list_resources', 'get_resource', 'add_folder', 'upload_file',
        'download_file', 'copy_resources', 'move_resources', 'delete_resources',
        'compress_files', 'extract_files', 'get_preview_image',
        'list_shares', 'get_share', 'add_share', 'delete_share',
        'list_users', 'get_user', 'add_user', 'update_user', 'delete_user',
        'list_notifications', 'add_notification', 'delete_notification',
        'get_session_logs', 'get_webhook_logs',
        'list_webhooks', 'add_webhook', 'delete_webhook',
        'list_ssh_keys', 'add_ssh_key', 'delete_ssh_key',
      ],
      description: 'Manage ExaVault cloud file storage: files, folders, shares, users, notifications, webhooks, and SSH keys via the ExaVault REST API v2.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      // -- Account --
      {
        name: 'get_account',
        description: 'Get details for the ExaVault account including storage usage, plan, and settings',
        inputSchema: {
          type: 'object',
          properties: {
            include: { type: 'string', description: 'Optional comma-separated related data to include (e.g. masterUser)' },
          },
        },
      },
      {
        name: 'update_account',
        description: 'Update account settings such as quota notification threshold or welcome email content',
        inputSchema: {
          type: 'object',
          properties: {
            quota_notify_on: { type: 'number', description: 'Percent full at which to send quota notification (0-100)' },
            quota_notify_email: { type: 'string', description: 'Email address to receive quota notifications' },
            welcome_email_content: { type: 'string', description: 'Custom HTML content for the welcome email' },
            welcome_email_subject: { type: 'string', description: 'Subject line for the welcome email' },
          },
        },
      },
      // -- Resources (Files & Folders) --
      {
        name: 'list_resources',
        description: 'List files and folders at a given path with optional search and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            resource: { type: 'string', description: 'Path or resource ID to list (default: root)' },
            sort: { type: 'string', description: 'Sort field: name, size, date, or type' },
            offset: { type: 'number', description: 'Number of items to skip for pagination' },
            limit: { type: 'number', description: 'Max items to return (max 100)' },
            type: { type: 'string', description: 'Filter by type: file or dir' },
            name: { type: 'string', description: 'Filter by filename (partial match)' },
          },
        },
      },
      {
        name: 'get_resource',
        description: 'Get metadata for a specific file or folder by path or resource ID',
        inputSchema: {
          type: 'object',
          properties: {
            resource: { type: 'string', description: 'Path or resource ID of the file or folder' },
          },
          required: ['resource'],
        },
      },
      {
        name: 'add_folder',
        description: 'Create a new folder at the specified path',
        inputSchema: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'Full path for the new folder (e.g. /uploads/reports)' },
          },
          required: ['path'],
        },
      },
      {
        name: 'upload_file',
        description: 'Initiate a file upload to ExaVault at the specified destination path',
        inputSchema: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'Destination path including filename (e.g. /uploads/report.pdf)' },
            file_size: { type: 'number', description: 'Size of the file in bytes' },
            offset: { type: 'number', description: 'Byte offset for resumable uploads (default: 0)' },
          },
          required: ['path', 'file_size'],
        },
      },
      {
        name: 'download_file',
        description: 'Get a download URL for one or more files or folders in ExaVault',
        inputSchema: {
          type: 'object',
          properties: {
            resources: { type: 'array', items: { type: 'string' }, description: 'Array of file/folder paths or resource IDs to download' },
          },
          required: ['resources'],
        },
      },
      {
        name: 'copy_resources',
        description: 'Copy one or more files or folders to a destination parent folder',
        inputSchema: {
          type: 'object',
          properties: {
            resources: { type: 'array', items: { type: 'string' }, description: 'Array of source paths or resource IDs' },
            parent_resource: { type: 'string', description: 'Destination parent folder path or ID' },
          },
          required: ['resources', 'parent_resource'],
        },
      },
      {
        name: 'move_resources',
        description: 'Move one or more files or folders to a destination parent folder',
        inputSchema: {
          type: 'object',
          properties: {
            resources: { type: 'array', items: { type: 'string' }, description: 'Array of source paths or resource IDs' },
            parent_resource: { type: 'string', description: 'Destination parent folder path or ID' },
          },
          required: ['resources', 'parent_resource'],
        },
      },
      {
        name: 'delete_resources',
        description: 'Delete one or more files or folders from ExaVault permanently',
        inputSchema: {
          type: 'object',
          properties: {
            resources: { type: 'array', items: { type: 'string' }, description: 'Array of file/folder paths or resource IDs to delete' },
          },
          required: ['resources'],
        },
      },
      {
        name: 'compress_files',
        description: 'Compress files or folders into a ZIP archive at the specified destination folder',
        inputSchema: {
          type: 'object',
          properties: {
            resources: { type: 'array', items: { type: 'string' }, description: 'Array of paths or resource IDs to compress' },
            parent_resource: { type: 'string', description: 'Destination folder path for the ZIP file' },
            archive_file_name: { type: 'string', description: 'Name for the resulting archive file (e.g. archive.zip)' },
          },
          required: ['resources', 'parent_resource'],
        },
      },
      {
        name: 'extract_files',
        description: 'Extract a ZIP or other archive file to a destination folder in ExaVault',
        inputSchema: {
          type: 'object',
          properties: {
            resource: { type: 'string', description: 'Path or resource ID of the archive to extract' },
            parent_resource: { type: 'string', description: 'Destination folder path for extracted contents' },
          },
          required: ['resource', 'parent_resource'],
        },
      },
      {
        name: 'get_preview_image',
        description: 'Get a preview thumbnail URL for a file in ExaVault (images and documents)',
        inputSchema: {
          type: 'object',
          properties: {
            resource: { type: 'string', description: 'Path or resource ID of the file to preview' },
            size: { type: 'string', description: 'Thumbnail size: small, medium, or large' },
            width: { type: 'number', description: 'Desired width of the preview in pixels' },
            height: { type: 'number', description: 'Desired height of the preview in pixels' },
            page: { type: 'number', description: 'Page number for multi-page documents (default: 1)' },
          },
          required: ['resource'],
        },
      },
      // -- Shares --
      {
        name: 'list_shares',
        description: 'List all file/folder shares for the account with optional type and name filters',
        inputSchema: {
          type: 'object',
          properties: {
            offset: { type: 'number', description: 'Number of items to skip for pagination' },
            limit: { type: 'number', description: 'Max items to return (max 100)' },
            scope: { type: 'string', description: 'Filter by scope: personal or public' },
            type: { type: 'string', description: 'Filter by share type: shared_folder, receive, or send' },
            name: { type: 'string', description: 'Filter shares by name (partial match)' },
          },
        },
      },
      {
        name: 'get_share',
        description: 'Get details for a specific share by its numeric ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'The share ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'add_share',
        description: 'Create a new share for a file or folder with optional password and expiration',
        inputSchema: {
          type: 'object',
          properties: {
            type: { type: 'string', description: 'Share type: shared_folder, receive, or send' },
            name: { type: 'string', description: 'Name for the share' },
            resources: { type: 'array', items: { type: 'string' }, description: 'Array of paths or resource IDs to share' },
            access_mode: { type: 'object', description: 'Permissions object (upload, download, delete, modify, list)' },
            password: { type: 'string', description: 'Optional password to protect the share' },
            expiration: { type: 'string', description: 'Optional expiration datetime in ISO 8601 format' },
            recipients: { type: 'array', items: { type: 'object' }, description: 'Array of recipient objects with email and name' },
            message: { type: 'string', description: 'Message to include in the share invitation email' },
          },
          required: ['type', 'name', 'resources'],
        },
      },
      {
        name: 'delete_share',
        description: 'Delete a share by its numeric ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'The share ID to delete' },
          },
          required: ['id'],
        },
      },
      // -- Users --
      {
        name: 'list_users',
        description: 'List users in the ExaVault account with optional username search and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            offset: { type: 'number', description: 'Number of items to skip for pagination' },
            limit: { type: 'number', description: 'Max users to return (max 100)' },
            username: { type: 'string', description: 'Filter users by username (partial match)' },
            home_resource: { type: 'string', description: 'Filter users by home folder path' },
          },
        },
      },
      {
        name: 'get_user',
        description: 'Get details for a specific user by their numeric user ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'The user ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'add_user',
        description: 'Create a new user in the ExaVault account with login credentials and permissions',
        inputSchema: {
          type: 'object',
          properties: {
            username: { type: 'string', description: 'Unique username for the new user' },
            password: { type: 'string', description: 'Password for the new user' },
            email: { type: 'string', description: 'Email address of the new user' },
            role: { type: 'string', description: 'User role: admin or user' },
            home_resource: { type: 'string', description: 'Home folder path for the user' },
            permissions: { type: 'object', description: 'Permissions object (upload, download, delete, modify, list, changePassword, share, notification)' },
            time_zone: { type: 'string', description: 'IANA timezone for the user (e.g. America/New_York)' },
          },
          required: ['username', 'password', 'email', 'role'],
        },
      },
      {
        name: 'update_user',
        description: 'Update an existing user by ID — change email, password, role, or permissions',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'The user ID to update' },
            email: { type: 'string', description: 'Updated email address' },
            password: { type: 'string', description: 'Updated password' },
            role: { type: 'string', description: 'Updated role: admin or user' },
            permissions: { type: 'object', description: 'Updated permissions object' },
            time_zone: { type: 'string', description: 'Updated IANA timezone' },
          },
          required: ['id'],
        },
      },
      {
        name: 'delete_user',
        description: 'Delete a user from the ExaVault account by their numeric user ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'The user ID to delete' },
          },
          required: ['id'],
        },
      },
      // -- Notifications --
      {
        name: 'list_notifications',
        description: 'List all file/folder activity notifications configured for the account',
        inputSchema: {
          type: 'object',
          properties: {
            offset: { type: 'number', description: 'Number of items to skip for pagination' },
            limit: { type: 'number', description: 'Max notifications to return (max 100)' },
            type: { type: 'string', description: 'Filter by notification type: file or folder' },
          },
        },
      },
      {
        name: 'add_notification',
        description: 'Create a notification to alert users or emails of file/folder upload, download, or delete activity',
        inputSchema: {
          type: 'object',
          properties: {
            resource: { type: 'string', description: 'Path or resource ID to watch for activity' },
            type: { type: 'string', description: 'Notification trigger: upload, download, delete, or all' },
            action: { type: 'string', description: 'Action type: notice or notice_user_leadin' },
            user_names: { type: 'array', items: { type: 'string' }, description: 'Usernames to notify' },
            recipients: { type: 'array', items: { type: 'object' }, description: 'Additional email recipients' },
            send_email: { type: 'boolean', description: 'Whether to send email notifications (default: true)' },
          },
          required: ['resource', 'type', 'action'],
        },
      },
      {
        name: 'delete_notification',
        description: 'Delete a notification by its numeric ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'The notification ID to delete' },
          },
          required: ['id'],
        },
      },
      // -- Activity Logs --
      {
        name: 'get_session_logs',
        description: 'Retrieve session activity logs (FTP, SFTP, Web) with optional date range and username filters',
        inputSchema: {
          type: 'object',
          properties: {
            offset: { type: 'number', description: 'Number of items to skip for pagination' },
            limit: { type: 'number', description: 'Max log entries to return (max 150)' },
            start_date: { type: 'string', description: 'Start date filter (ISO 8601 format)' },
            end_date: { type: 'string', description: 'End date filter (ISO 8601 format)' },
            username: { type: 'string', description: 'Filter log entries by username' },
            ip_address: { type: 'string', description: 'Filter by client IP address' },
            type: { type: 'string', description: 'Filter by session protocol type (FTP, SFTP, Web, etc.)' },
          },
        },
      },
      {
        name: 'get_webhook_logs',
        description: 'Retrieve webhook delivery logs with optional date range and endpoint URL filters',
        inputSchema: {
          type: 'object',
          properties: {
            offset: { type: 'number', description: 'Number of items to skip for pagination' },
            limit: { type: 'number', description: 'Max log entries to return (max 150)' },
            start_date: { type: 'string', description: 'Start date filter (ISO 8601 format)' },
            end_date: { type: 'string', description: 'End date filter (ISO 8601 format)' },
            endpoint_url: { type: 'string', description: 'Filter by webhook endpoint URL (partial match)' },
            event: { type: 'string', description: 'Filter by event type (e.g. resources.upload)' },
          },
        },
      },
      // -- Webhooks --
      {
        name: 'list_webhooks',
        description: 'List all webhooks configured for the account',
        inputSchema: {
          type: 'object',
          properties: {
            offset: { type: 'number', description: 'Number of items to skip for pagination' },
            limit: { type: 'number', description: 'Max webhooks to return (max 100)' },
          },
        },
      },
      {
        name: 'add_webhook',
        description: 'Create a new webhook to receive HTTP POST notifications for account events',
        inputSchema: {
          type: 'object',
          properties: {
            endpoint_url: { type: 'string', description: 'HTTPS endpoint URL to receive webhook POST requests' },
            triggers: { type: 'array', items: { type: 'string' }, description: 'Array of event triggers (e.g. resources.upload, resources.delete, share.created)' },
          },
          required: ['endpoint_url', 'triggers'],
        },
      },
      {
        name: 'delete_webhook',
        description: 'Delete a webhook by its numeric ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'The webhook ID to delete' },
          },
          required: ['id'],
        },
      },
      // -- SSH Keys --
      {
        name: 'list_ssh_keys',
        description: 'List all SSH public keys registered for SFTP access to the account',
        inputSchema: {
          type: 'object',
          properties: {
            offset: { type: 'number', description: 'Number of items to skip for pagination' },
            limit: { type: 'number', description: 'Max SSH keys to return (max 100)' },
            user_id: { type: 'number', description: 'Filter SSH keys by user ID' },
          },
        },
      },
      {
        name: 'add_ssh_key',
        description: 'Register a new SSH public key for SFTP access',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: { type: 'number', description: 'User ID to associate the SSH key with' },
            public_key: { type: 'string', description: 'The SSH public key string in OpenSSH format' },
          },
          required: ['user_id', 'public_key'],
        },
      },
      {
        name: 'delete_ssh_key',
        description: 'Remove a registered SSH public key by its numeric ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'The SSH key ID to delete' },
          },
          required: ['id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'get_account':          return await this.getAccount(args);
        case 'update_account':       return await this.updateAccount(args);
        case 'list_resources':       return await this.listResources(args);
        case 'get_resource':         return await this.getResource(args);
        case 'add_folder':           return await this.addFolder(args);
        case 'upload_file':          return await this.uploadFile(args);
        case 'download_file':        return await this.downloadFile(args);
        case 'copy_resources':       return await this.copyResources(args);
        case 'move_resources':       return await this.moveResources(args);
        case 'delete_resources':     return await this.deleteResources(args);
        case 'compress_files':       return await this.compressFiles(args);
        case 'extract_files':        return await this.extractFiles(args);
        case 'get_preview_image':    return await this.getPreviewImage(args);
        case 'list_shares':          return await this.listShares(args);
        case 'get_share':            return await this.getShare(args);
        case 'add_share':            return await this.addShare(args);
        case 'delete_share':         return await this.deleteShare(args);
        case 'list_users':           return await this.listUsers(args);
        case 'get_user':             return await this.getUser(args);
        case 'add_user':             return await this.addUser(args);
        case 'update_user':          return await this.updateUser(args);
        case 'delete_user':          return await this.deleteUser(args);
        case 'list_notifications':   return await this.listNotifications(args);
        case 'add_notification':     return await this.addNotification(args);
        case 'delete_notification':  return await this.deleteNotification(args);
        case 'get_session_logs':     return await this.getSessionLogs(args);
        case 'get_webhook_logs':     return await this.getWebhookLogs(args);
        case 'list_webhooks':        return await this.listWebhooks(args);
        case 'add_webhook':          return await this.addWebhook(args);
        case 'delete_webhook':       return await this.deleteWebhook(args);
        case 'list_ssh_keys':        return await this.listSshKeys(args);
        case 'add_ssh_key':          return await this.addSshKey(args);
        case 'delete_ssh_key':       return await this.deleteSshKey(args);
        default:
          return { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true };
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { content: [{ type: 'text', text: `ExaVault API error: ${message}` }], isError: true };
    }
  }

  // -- Private helpers --

  private authHeaders(): Record<string, string> {
    return {
      'ev-api-key': this.apiKey,
      'ev-access-token': this.accessToken,
      'Content-Type': 'application/json',
    };
  }

  private async request(
    method: string,
    path: string,
    params?: Record<string, unknown>,
    body?: unknown,
  ): Promise<ToolResult> {
    let url = `${this.baseUrl}${path}`;
    if (params && Object.keys(params).length > 0) {
      const qs = new URLSearchParams(
        Object.entries(params)
          .filter(([, v]) => v !== undefined && v !== null)
          .map(([k, v]) => [k, String(v)]) as [string, string][],
      ).toString();
      if (qs) url += `?${qs}`;
    }

    const res = await this.fetchWithRetry(url, {
      method,
      headers: this.authHeaders(),
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    const text = await res.text();
    const truncated = text.length > 10240 ? text.slice(0, 10240) + '\n[truncated]' : text;

    if (!res.ok) {
      return { content: [{ type: 'text', text: `HTTP ${res.status}: ${truncated}` }], isError: true };
    }
    return { content: [{ type: 'text', text: truncated }], isError: false };
  }

  private async getAccount(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, unknown> = {};
    if (args.include) params.include = args.include;
    return this.request('GET', '/account', params);
  }

  private async updateAccount(args: Record<string, unknown>): Promise<ToolResult> {
    const attrs: Record<string, unknown> = {};
    if (args.quota_notify_on !== undefined)       attrs.quotaNotifyOn      = args.quota_notify_on;
    if (args.quota_notify_email !== undefined)    attrs.quotaNotifyEmail   = args.quota_notify_email;
    if (args.welcome_email_content !== undefined) attrs.welcomeEmailContent = args.welcome_email_content;
    if (args.welcome_email_subject !== undefined) attrs.welcomeEmailSubject = args.welcome_email_subject;
    return this.request('PATCH', '/account', undefined, { data: { type: 'account', attributes: attrs } });
  }

  private async listResources(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, unknown> = {};
    if (args.resource !== undefined) params.resource = args.resource;
    if (args.sort)                   params.sort     = args.sort;
    if (args.offset !== undefined)   params.offset   = args.offset;
    if (args.limit !== undefined)    params.limit    = args.limit;
    if (args.type)                   params.type     = args.type;
    if (args.name)                   params.name     = args.name;
    return this.request('GET', '/resources/list', params);
  }

  private async getResource(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request('GET', '/resources', { resource: args.resource });
  }

  private async addFolder(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request('POST', '/resources', undefined, {
      data: { type: 'resource', attributes: { path: args.path } },
    });
  }

  private async uploadFile(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, unknown> = { path: args.path, 'file-size': args.file_size };
    if (args.offset !== undefined) params.offset = args.offset;
    return this.request('POST', '/resources/upload', params);
  }

  private async downloadFile(args: Record<string, unknown>): Promise<ToolResult> {
    const resources = args.resources as string[];
    const params: Record<string, unknown> = {};
    resources.forEach((r, i) => { params[`resources[${i}]`] = r; });
    return this.request('GET', '/resources/download', params);
  }

  private async copyResources(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request('POST', '/resources/copy', undefined, {
      data: { type: 'resources', attributes: { resources: args.resources, parentResource: args.parent_resource } },
    });
  }

  private async moveResources(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request('POST', '/resources/move', undefined, {
      data: { type: 'resources', attributes: { resources: args.resources, parentResource: args.parent_resource } },
    });
  }

  private async deleteResources(args: Record<string, unknown>): Promise<ToolResult> {
    const resources = args.resources as string[];
    const params: Record<string, unknown> = {};
    resources.forEach((r, i) => { params[`id[${i}]`] = r; });
    return this.request('DELETE', '/resources', params);
  }

  private async compressFiles(args: Record<string, unknown>): Promise<ToolResult> {
    const attrs: Record<string, unknown> = { resources: args.resources, parentResource: args.parent_resource };
    if (args.archive_file_name) attrs.archiveFileName = args.archive_file_name;
    return this.request('POST', '/resources/compress', undefined, {
      data: { type: 'resources', attributes: attrs },
    });
  }

  private async extractFiles(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request('POST', '/resources/extract', undefined, {
      data: { type: 'resources', attributes: { resource: args.resource, parentResource: args.parent_resource } },
    });
  }

  private async getPreviewImage(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, unknown> = { resource: args.resource };
    if (args.size)             params.size   = args.size;
    if (args.width !== undefined)  params.width  = args.width;
    if (args.height !== undefined) params.height = args.height;
    if (args.page !== undefined)   params.page   = args.page;
    return this.request('GET', '/resources/preview', params);
  }

  private async listShares(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, unknown> = {};
    if (args.offset !== undefined) params.offset = args.offset;
    if (args.limit !== undefined)  params.limit  = args.limit;
    if (args.scope) params.scope = args.scope;
    if (args.type)  params.type  = args.type;
    if (args.name)  params.name  = args.name;
    return this.request('GET', '/shares', params);
  }

  private async getShare(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request('GET', `/shares/${args.id}`);
  }

  private async addShare(args: Record<string, unknown>): Promise<ToolResult> {
    const attrs: Record<string, unknown> = { type: args.type, name: args.name, resources: args.resources };
    if (args.access_mode) attrs.accessMode = args.access_mode;
    if (args.password)    attrs.password   = args.password;
    if (args.expiration)  attrs.expiration = args.expiration;
    if (args.recipients)  attrs.recipients = args.recipients;
    if (args.message)     attrs.message    = args.message;
    return this.request('POST', '/shares', undefined, { data: { type: 'share', attributes: attrs } });
  }

  private async deleteShare(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request('DELETE', `/shares/${args.id}`);
  }

  private async listUsers(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, unknown> = {};
    if (args.offset !== undefined) params.offset       = args.offset;
    if (args.limit !== undefined)  params.limit        = args.limit;
    if (args.username)             params.username     = args.username;
    if (args.home_resource)        params.homeResource = args.home_resource;
    return this.request('GET', '/users', params);
  }

  private async getUser(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request('GET', `/users/${args.id}`);
  }

  private async addUser(args: Record<string, unknown>): Promise<ToolResult> {
    const attrs: Record<string, unknown> = {
      username: args.username,
      password: args.password,
      email: args.email,
      role: args.role,
    };
    if (args.home_resource) attrs.homeResource = args.home_resource;
    if (args.permissions)   attrs.permissions  = args.permissions;
    if (args.time_zone)     attrs.timeZone     = args.time_zone;
    return this.request('POST', '/users', undefined, { data: { type: 'user', attributes: attrs } });
  }

  private async updateUser(args: Record<string, unknown>): Promise<ToolResult> {
    const attrs: Record<string, unknown> = {};
    if (args.email)       attrs.email       = args.email;
    if (args.password)    attrs.password    = args.password;
    if (args.role)        attrs.role        = args.role;
    if (args.permissions) attrs.permissions = args.permissions;
    if (args.time_zone)   attrs.timeZone    = args.time_zone;
    return this.request('PATCH', `/users/${args.id}`, undefined, { data: { type: 'user', attributes: attrs } });
  }

  private async deleteUser(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request('DELETE', `/users/${args.id}`);
  }

  private async listNotifications(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, unknown> = {};
    if (args.offset !== undefined) params.offset = args.offset;
    if (args.limit !== undefined)  params.limit  = args.limit;
    if (args.type) params.type = args.type;
    return this.request('GET', '/notifications', params);
  }

  private async addNotification(args: Record<string, unknown>): Promise<ToolResult> {
    const attrs: Record<string, unknown> = { resource: args.resource, type: args.type, action: args.action };
    if (args.user_names !== undefined)  attrs.userNames  = args.user_names;
    if (args.recipients !== undefined)  attrs.recipients = args.recipients;
    if (args.send_email !== undefined)  attrs.sendEmail  = args.send_email;
    return this.request('POST', '/notifications', undefined, { data: { type: 'notification', attributes: attrs } });
  }

  private async deleteNotification(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request('DELETE', `/notifications/${args.id}`);
  }

  private async getSessionLogs(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, unknown> = {};
    if (args.offset !== undefined) params.offset    = args.offset;
    if (args.limit !== undefined)  params.limit     = args.limit;
    if (args.start_date)           params.startDate = args.start_date;
    if (args.end_date)             params.endDate   = args.end_date;
    if (args.username)             params.username  = args.username;
    if (args.ip_address)           params.ipAddress = args.ip_address;
    if (args.type)                 params.type      = args.type;
    return this.request('GET', '/activity/session', params);
  }

  private async getWebhookLogs(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, unknown> = {};
    if (args.offset !== undefined) params.offset      = args.offset;
    if (args.limit !== undefined)  params.limit       = args.limit;
    if (args.start_date)           params.startDate   = args.start_date;
    if (args.end_date)             params.endDate     = args.end_date;
    if (args.endpoint_url)         params.endpointUrl = args.endpoint_url;
    if (args.event)                params.event       = args.event;
    return this.request('GET', '/activity/webhooks', params);
  }

  private async listWebhooks(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, unknown> = {};
    if (args.offset !== undefined) params.offset = args.offset;
    if (args.limit !== undefined)  params.limit  = args.limit;
    return this.request('GET', '/webhooks', params);
  }

  private async addWebhook(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request('POST', '/webhooks', undefined, {
      data: { type: 'webhook', attributes: { endpointUrl: args.endpoint_url, triggers: args.triggers } },
    });
  }

  private async deleteWebhook(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request('DELETE', `/webhooks/${args.id}`);
  }

  private async listSshKeys(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, unknown> = {};
    if (args.offset !== undefined)  params.offset = args.offset;
    if (args.limit !== undefined)   params.limit  = args.limit;
    if (args.user_id !== undefined) params.userId = args.user_id;
    return this.request('GET', '/ssh-keys', params);
  }

  private async addSshKey(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request('POST', '/ssh-keys', undefined, {
      data: { type: 'sshKey', attributes: { userId: args.user_id, publicKey: args.public_key } },
    });
  }

  private async deleteSshKey(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request('DELETE', `/ssh-keys/${args.id}`);
  }
}

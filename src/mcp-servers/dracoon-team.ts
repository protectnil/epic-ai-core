/**
 * DRACOON MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// No official DRACOON MCP server was found on GitHub. We build a full REST wrapper.
//
// Base URL: https://{server-domain}/api
// Auth: OAuth2 Bearer token (access token from DRACOON OAuth2 flow)
// Docs: https://dracoon.team/api/
// Spec: https://api.apis.guru/v2/specs/dracoon.team/4.42.2/openapi.json
// Category: cloud
// Rate limits: See DRACOON docs — enterprise file management platform

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface DracoonTeamConfig {
  accessToken: string;
  serverDomain?: string;
  baseUrl?: string;
}

export class DracoonTeamMCPServer extends MCPAdapterBase {
  private readonly accessToken: string;
  private readonly baseUrl: string;

  constructor(config: DracoonTeamConfig) {
    super();
    this.accessToken = config.accessToken;
    this.baseUrl = config.baseUrl
      ?? (config.serverDomain ? `https://${config.serverDomain}/api` : 'https://your-server.dracoon.team/api');
  }

  static catalog() {
    return {
      name: 'dracoon-team',
      displayName: 'DRACOON',
      version: '1.0.0',
      category: 'cloud',
      keywords: [
        'dracoon', 'file management', 'cloud storage', 'enterprise', 'secure file sharing',
        'rooms', 'folders', 'nodes', 'upload', 'download', 'share', 'encryption',
        'users', 'groups', 'permissions', 'webhooks', 'audit', 'compliance',
        'download share', 'upload share', 'recycle bin', 'favorites',
      ],
      toolNames: [
        'list_nodes', 'get_node', 'delete_node', 'search_nodes',
        'copy_nodes', 'move_nodes',
        'create_room', 'update_room', 'configure_room',
        'get_room_users', 'update_room_users', 'revoke_room_users',
        'get_room_groups', 'update_room_groups', 'revoke_room_groups',
        'create_folder', 'update_folder',
        'update_file', 'generate_download_url',
        'create_upload_channel', 'complete_file_upload',
        'list_download_shares', 'get_download_share', 'create_download_share', 'delete_download_share',
        'list_upload_shares', 'get_upload_share', 'create_upload_share', 'delete_upload_share',
        'list_users', 'get_user', 'create_user', 'update_user', 'delete_user',
        'list_groups', 'get_group', 'create_group', 'update_group', 'delete_group',
        'get_group_members', 'add_group_members', 'remove_group_members',
        'list_deleted_nodes', 'restore_nodes', 'empty_recycle_bin',
        'add_favorite', 'remove_favorite',
        'get_audit_node_info', 'get_room_events',
        'get_user_info', 'update_user_account',
        'list_webhooks', 'create_webhook', 'get_webhook', 'update_webhook', 'delete_webhook',
        'get_system_info', 'get_general_settings_info',
      ],
      description: 'DRACOON enterprise cloud storage: manage rooms, folders, files, users, groups, sharing, encryption, audit logs, and webhooks on a DRACOON instance.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      // ── Nodes ──────────────────────────────────────────────────────────────
      {
        name: 'list_nodes',
        description: 'List nodes (rooms, folders, files) within a parent node or at the root level',
        inputSchema: {
          type: 'object',
          properties: {
            parent_id: { type: 'number', description: 'ID of the parent node to list children for (omit for root level)' },
            type: { type: 'string', description: 'Filter by node type: room, folder, or file' },
            filter: { type: 'string', description: 'Filter expression (e.g. name:cn:myfile)' },
            limit: { type: 'number', description: 'Maximum number of nodes to return (default: 500)' },
            offset: { type: 'number', description: 'Offset for pagination' },
          },
        },
      },
      {
        name: 'get_node',
        description: 'Get detailed metadata for a specific node (room, folder, or file) by its ID',
        inputSchema: {
          type: 'object',
          properties: {
            node_id: { type: 'number', description: 'Node ID to retrieve' },
          },
          required: ['node_id'],
        },
      },
      {
        name: 'delete_node',
        description: 'Delete a node (room, folder, or file) by ID — moves to recycle bin if configured',
        inputSchema: {
          type: 'object',
          properties: {
            node_id: { type: 'number', description: 'Node ID to delete' },
          },
          required: ['node_id'],
        },
      },
      {
        name: 'search_nodes',
        description: 'Search for nodes (rooms, folders, files) by name within the DRACOON instance',
        inputSchema: {
          type: 'object',
          properties: {
            search_string: { type: 'string', description: 'Search term to match against node names' },
            parent_id: { type: 'number', description: 'Restrict search to children of this node ID' },
            depth_level: { type: 'number', description: 'Search depth from parent node (-1 = unlimited)' },
            filter: { type: 'string', description: 'Additional filter expression' },
            limit: { type: 'number', description: 'Maximum results to return' },
            offset: { type: 'number', description: 'Offset for pagination' },
          },
          required: ['search_string'],
        },
      },
      {
        name: 'copy_nodes',
        description: 'Copy one or more nodes (files/folders) to a target parent node',
        inputSchema: {
          type: 'object',
          properties: {
            target_parent_id: { type: 'number', description: 'ID of the destination parent node' },
            items: {
              type: 'array',
              description: 'Array of objects with id (source node ID) and optional name (rename on copy)',
              items: { type: 'object' },
            },
          },
          required: ['target_parent_id', 'items'],
        },
      },
      {
        name: 'move_nodes',
        description: 'Move one or more nodes (files/folders) to a target parent node',
        inputSchema: {
          type: 'object',
          properties: {
            target_parent_id: { type: 'number', description: 'ID of the destination parent node' },
            items: {
              type: 'array',
              description: 'Array of objects with id (source node ID) and optional name (rename on move)',
              items: { type: 'object' },
            },
          },
          required: ['target_parent_id', 'items'],
        },
      },
      // ── Rooms ──────────────────────────────────────────────────────────────
      {
        name: 'create_room',
        description: 'Create a new top-level data room or a sub-room under a parent room',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Room name' },
            parent_id: { type: 'number', description: 'Parent room ID (omit for top-level room)' },
            quota: { type: 'number', description: 'Storage quota in bytes (0 = unlimited)' },
            recycle_bin_retention_period: { type: 'number', description: 'Days to keep deleted files in recycle bin (0 = disabled)' },
            admin_ids: { type: 'array', description: 'User IDs to assign as room admins', items: { type: 'number' } },
            admin_group_ids: { type: 'array', description: 'Group IDs to assign as room admin groups', items: { type: 'number' } },
            notes: { type: 'string', description: 'Optional notes about the room' },
          },
          required: ['name'],
        },
      },
      {
        name: 'update_room',
        description: "Update a room's metadata — name, quota, notes, or recycle bin retention",
        inputSchema: {
          type: 'object',
          properties: {
            room_id: { type: 'number', description: 'Room ID to update' },
            name: { type: 'string', description: 'New room name' },
            quota: { type: 'number', description: 'New storage quota in bytes' },
            notes: { type: 'string', description: 'Updated notes' },
            recycle_bin_retention_period: { type: 'number', description: 'Updated recycle bin retention in days' },
          },
          required: ['room_id'],
        },
      },
      {
        name: 'configure_room',
        description: 'Configure advanced room settings: file versioning, inherit permissions, virus scan',
        inputSchema: {
          type: 'object',
          properties: {
            room_id: { type: 'number', description: 'Room ID to configure' },
            inherit_permissions: { type: 'boolean', description: 'If true, sub-rooms inherit permissions from this room' },
            take_over_permissions: { type: 'boolean', description: 'If true, users must be explicitly granted access' },
            enable_virus_protection: { type: 'boolean', description: 'Enable virus scan for uploaded files in this room' },
            virus_protection_type: { type: 'string', description: 'Virus protection type (e.g. AUTOMATIC)' },
          },
          required: ['room_id'],
        },
      },
      {
        name: 'get_room_users',
        description: 'List users that have been granted access to a room',
        inputSchema: {
          type: 'object',
          properties: {
            room_id: { type: 'number', description: 'Room ID' },
            filter: { type: 'string', description: 'Filter expression (e.g. permissionsManage:eq:true)' },
            limit: { type: 'number', description: 'Maximum results' },
            offset: { type: 'number', description: 'Pagination offset' },
          },
          required: ['room_id'],
        },
      },
      {
        name: 'update_room_users',
        description: 'Grant or update user permissions for a room',
        inputSchema: {
          type: 'object',
          properties: {
            room_id: { type: 'number', description: 'Room ID' },
            items: {
              type: 'array',
              description: 'Array of {id: userId, permissions: {manage, read, create, change, delete, ...}}',
              items: { type: 'object' },
            },
          },
          required: ['room_id', 'items'],
        },
      },
      {
        name: 'revoke_room_users',
        description: 'Revoke access to a room from one or more users',
        inputSchema: {
          type: 'object',
          properties: {
            room_id: { type: 'number', description: 'Room ID' },
            ids: { type: 'array', description: 'User IDs to revoke', items: { type: 'number' } },
          },
          required: ['room_id', 'ids'],
        },
      },
      {
        name: 'get_room_groups',
        description: 'List groups that have been granted access to a room',
        inputSchema: {
          type: 'object',
          properties: {
            room_id: { type: 'number', description: 'Room ID' },
            filter: { type: 'string', description: 'Filter expression' },
            limit: { type: 'number', description: 'Maximum results' },
            offset: { type: 'number', description: 'Pagination offset' },
          },
          required: ['room_id'],
        },
      },
      {
        name: 'update_room_groups',
        description: 'Grant or update group permissions for a room',
        inputSchema: {
          type: 'object',
          properties: {
            room_id: { type: 'number', description: 'Room ID' },
            items: {
              type: 'array',
              description: 'Array of {id: groupId, permissions: {manage, read, create, change, delete, ...}}',
              items: { type: 'object' },
            },
          },
          required: ['room_id', 'items'],
        },
      },
      {
        name: 'revoke_room_groups',
        description: 'Revoke room access from one or more groups',
        inputSchema: {
          type: 'object',
          properties: {
            room_id: { type: 'number', description: 'Room ID' },
            ids: { type: 'array', description: 'Group IDs to revoke', items: { type: 'number' } },
          },
          required: ['room_id', 'ids'],
        },
      },
      // ── Folders ────────────────────────────────────────────────────────────
      {
        name: 'create_folder',
        description: 'Create a new folder inside a room or another folder',
        inputSchema: {
          type: 'object',
          properties: {
            parent_id: { type: 'number', description: 'Parent node ID (room or folder) to create the folder in' },
            name: { type: 'string', description: 'Folder name' },
            notes: { type: 'string', description: 'Optional notes about the folder' },
          },
          required: ['parent_id', 'name'],
        },
      },
      {
        name: 'update_folder',
        description: "Update a folder's name or notes",
        inputSchema: {
          type: 'object',
          properties: {
            folder_id: { type: 'number', description: 'Folder ID to update' },
            name: { type: 'string', description: 'New folder name' },
            notes: { type: 'string', description: 'Updated notes' },
          },
          required: ['folder_id'],
        },
      },
      // ── Files ──────────────────────────────────────────────────────────────
      {
        name: 'update_file',
        description: "Update a file's metadata — name, notes, or classification",
        inputSchema: {
          type: 'object',
          properties: {
            file_id: { type: 'number', description: 'File ID to update' },
            name: { type: 'string', description: 'New file name' },
            notes: { type: 'string', description: 'Updated notes' },
            classification: { type: 'number', description: 'Classification level (1=public, 2=internal, 3=confidential, 4=strictly confidential)' },
          },
          required: ['file_id'],
        },
      },
      {
        name: 'generate_download_url',
        description: 'Generate a one-time download URL for a file by file ID',
        inputSchema: {
          type: 'object',
          properties: {
            file_id: { type: 'number', description: 'File ID to generate a download URL for' },
          },
          required: ['file_id'],
        },
      },
      {
        name: 'create_upload_channel',
        description: 'Create a file upload channel to obtain an upload token for uploading a file to a node',
        inputSchema: {
          type: 'object',
          properties: {
            parent_id: { type: 'number', description: 'Target parent node ID (room or folder)' },
            name: { type: 'string', description: 'Name for the uploaded file' },
            size: { type: 'number', description: 'File size in bytes (if known)' },
            classification: { type: 'number', description: 'Classification level (1-4)' },
            notes: { type: 'string', description: 'Optional notes for the file' },
          },
          required: ['parent_id', 'name'],
        },
      },
      {
        name: 'complete_file_upload',
        description: 'Finalize a multipart file upload by upload ID after all parts have been uploaded',
        inputSchema: {
          type: 'object',
          properties: {
            upload_id: { type: 'string', description: 'Upload ID returned from create_upload_channel' },
            file_name: { type: 'string', description: 'Final file name' },
            resolution_strategy: { type: 'string', description: 'Conflict resolution: autorename, overwrite, or fail (default: autorename)' },
          },
          required: ['upload_id'],
        },
      },
      // ── Download Shares ────────────────────────────────────────────────────
      {
        name: 'list_download_shares',
        description: 'List all Download Shares the current user has created — external links to download files',
        inputSchema: {
          type: 'object',
          properties: {
            filter: { type: 'string', description: 'Filter expression (e.g. name:cn:report)' },
            limit: { type: 'number', description: 'Maximum results' },
            offset: { type: 'number', description: 'Pagination offset' },
          },
        },
      },
      {
        name: 'get_download_share',
        description: 'Get details for a specific Download Share by share ID',
        inputSchema: {
          type: 'object',
          properties: {
            share_id: { type: 'number', description: 'Download Share ID' },
          },
          required: ['share_id'],
        },
      },
      {
        name: 'create_download_share',
        description: 'Create a new Download Share (external download link) for a file or folder',
        inputSchema: {
          type: 'object',
          properties: {
            node_id: { type: 'number', description: 'Node ID (file or folder) to share' },
            name: { type: 'string', description: 'Name for the share (visible to recipients)' },
            notes: { type: 'string', description: 'Internal notes about the share' },
            expiration: { type: 'object', description: 'Expiration: {enableExpiration: bool, expireAt: ISO8601}' },
            password: { type: 'string', description: 'Optional password to protect the share' },
            max_downloads: { type: 'number', description: 'Maximum number of times the share can be downloaded' },
            send_mail: { type: 'boolean', description: 'Send share link via email to recipients' },
            mail_recipients: { type: 'string', description: 'Comma-separated email addresses for the share link' },
          },
          required: ['node_id'],
        },
      },
      {
        name: 'delete_download_share',
        description: 'Delete a Download Share by share ID — the external link is immediately invalidated',
        inputSchema: {
          type: 'object',
          properties: {
            share_id: { type: 'number', description: 'Download Share ID to delete' },
          },
          required: ['share_id'],
        },
      },
      // ── Upload Shares ──────────────────────────────────────────────────────
      {
        name: 'list_upload_shares',
        description: 'List all Upload Shares (file request links) the current user has created',
        inputSchema: {
          type: 'object',
          properties: {
            filter: { type: 'string', description: 'Filter expression' },
            limit: { type: 'number', description: 'Maximum results' },
            offset: { type: 'number', description: 'Pagination offset' },
          },
        },
      },
      {
        name: 'get_upload_share',
        description: 'Get details for a specific Upload Share (file request) by share ID',
        inputSchema: {
          type: 'object',
          properties: {
            share_id: { type: 'number', description: 'Upload Share ID' },
          },
          required: ['share_id'],
        },
      },
      {
        name: 'create_upload_share',
        description: 'Create a new Upload Share (file request link) allowing external users to upload files to a target folder',
        inputSchema: {
          type: 'object',
          properties: {
            target_id: { type: 'number', description: 'Target node ID (room or folder) where uploads will land' },
            name: { type: 'string', description: 'Share name (visible to recipients)' },
            notes: { type: 'string', description: 'Internal notes' },
            expiration: { type: 'object', description: 'Expiration: {enableExpiration: bool, expireAt: ISO8601}' },
            password: { type: 'string', description: 'Optional password for the upload link' },
            max_slots: { type: 'number', description: 'Maximum number of files that can be uploaded' },
            send_mail: { type: 'boolean', description: 'Send share link via email' },
            mail_recipients: { type: 'string', description: 'Comma-separated recipient email addresses' },
          },
          required: ['target_id', 'name'],
        },
      },
      {
        name: 'delete_upload_share',
        description: 'Delete an Upload Share by share ID — the file request link is immediately invalidated',
        inputSchema: {
          type: 'object',
          properties: {
            share_id: { type: 'number', description: 'Upload Share ID to delete' },
          },
          required: ['share_id'],
        },
      },
      // ── Users ──────────────────────────────────────────────────────────────
      {
        name: 'list_users',
        description: 'List all users in the DRACOON instance with optional filtering',
        inputSchema: {
          type: 'object',
          properties: {
            filter: { type: 'string', description: 'Filter expression (e.g. userName:cn:john)' },
            limit: { type: 'number', description: 'Maximum results' },
            offset: { type: 'number', description: 'Pagination offset' },
          },
        },
      },
      {
        name: 'get_user',
        description: 'Get detailed information for a specific user by user ID',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: { type: 'number', description: 'User ID to retrieve' },
          },
          required: ['user_id'],
        },
      },
      {
        name: 'create_user',
        description: 'Create a new local user account in the DRACOON instance',
        inputSchema: {
          type: 'object',
          properties: {
            first_name: { type: 'string', description: 'User first name' },
            last_name: { type: 'string', description: 'User last name' },
            user_name: { type: 'string', description: 'Login username (must be unique)' },
            email: { type: 'string', description: 'User email address' },
            password: { type: 'string', description: 'Initial password (omit to send a password reset email)' },
            notify_user: { type: 'boolean', description: 'Send welcome email to the user' },
            expire_at: { type: 'string', description: 'Account expiration date (ISO 8601)' },
          },
          required: ['first_name', 'last_name', 'user_name'],
        },
      },
      {
        name: 'update_user',
        description: "Update a user's profile — name, email, expiration, or lock status",
        inputSchema: {
          type: 'object',
          properties: {
            user_id: { type: 'number', description: 'User ID to update' },
            first_name: { type: 'string', description: 'Updated first name' },
            last_name: { type: 'string', description: 'Updated last name' },
            email: { type: 'string', description: 'Updated email address' },
            is_locked: { type: 'boolean', description: 'If true, the user account is locked' },
            expire_at: { type: 'string', description: 'Updated account expiration date (ISO 8601)' },
          },
          required: ['user_id'],
        },
      },
      {
        name: 'delete_user',
        description: 'Delete a user account from the DRACOON instance by user ID',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: { type: 'number', description: 'User ID to delete' },
          },
          required: ['user_id'],
        },
      },
      // ── Groups ─────────────────────────────────────────────────────────────
      {
        name: 'list_groups',
        description: 'List all user groups in the DRACOON instance',
        inputSchema: {
          type: 'object',
          properties: {
            filter: { type: 'string', description: 'Filter expression (e.g. name:cn:admins)' },
            limit: { type: 'number', description: 'Maximum results' },
            offset: { type: 'number', description: 'Pagination offset' },
          },
        },
      },
      {
        name: 'get_group',
        description: 'Get detailed information for a specific group by group ID',
        inputSchema: {
          type: 'object',
          properties: {
            group_id: { type: 'number', description: 'Group ID to retrieve' },
          },
          required: ['group_id'],
        },
      },
      {
        name: 'create_group',
        description: 'Create a new user group in the DRACOON instance',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Group name (must be unique)' },
            expire_at: { type: 'string', description: 'Group expiration date (ISO 8601)' },
          },
          required: ['name'],
        },
      },
      {
        name: 'update_group',
        description: "Update a group's name or expiration date",
        inputSchema: {
          type: 'object',
          properties: {
            group_id: { type: 'number', description: 'Group ID to update' },
            name: { type: 'string', description: 'New group name' },
            expire_at: { type: 'string', description: 'Updated expiration date (ISO 8601)' },
          },
          required: ['group_id'],
        },
      },
      {
        name: 'delete_group',
        description: 'Delete a user group from the DRACOON instance by group ID',
        inputSchema: {
          type: 'object',
          properties: {
            group_id: { type: 'number', description: 'Group ID to delete' },
          },
          required: ['group_id'],
        },
      },
      {
        name: 'get_group_members',
        description: 'List users who are members of a specific group',
        inputSchema: {
          type: 'object',
          properties: {
            group_id: { type: 'number', description: 'Group ID' },
            filter: { type: 'string', description: 'Filter expression' },
            limit: { type: 'number', description: 'Maximum results' },
            offset: { type: 'number', description: 'Pagination offset' },
          },
          required: ['group_id'],
        },
      },
      {
        name: 'add_group_members',
        description: 'Add users to a group by user IDs',
        inputSchema: {
          type: 'object',
          properties: {
            group_id: { type: 'number', description: 'Group ID to add members to' },
            ids: { type: 'array', description: 'User IDs to add to the group', items: { type: 'number' } },
          },
          required: ['group_id', 'ids'],
        },
      },
      {
        name: 'remove_group_members',
        description: 'Remove users from a group by user IDs',
        inputSchema: {
          type: 'object',
          properties: {
            group_id: { type: 'number', description: 'Group ID to remove members from' },
            ids: { type: 'array', description: 'User IDs to remove from the group', items: { type: 'number' } },
          },
          required: ['group_id', 'ids'],
        },
      },
      // ── Recycle Bin ────────────────────────────────────────────────────────
      {
        name: 'list_deleted_nodes',
        description: 'List deleted nodes in the recycle bin of a parent node',
        inputSchema: {
          type: 'object',
          properties: {
            node_id: { type: 'number', description: 'Parent node ID whose recycle bin to list' },
            filter: { type: 'string', description: 'Filter expression' },
            limit: { type: 'number', description: 'Maximum results' },
            offset: { type: 'number', description: 'Pagination offset' },
          },
          required: ['node_id'],
        },
      },
      {
        name: 'restore_nodes',
        description: 'Restore deleted nodes from the recycle bin to their original or a new parent location',
        inputSchema: {
          type: 'object',
          properties: {
            deleted_node_ids: { type: 'array', description: 'IDs of deleted nodes to restore', items: { type: 'number' } },
            parent_id: { type: 'number', description: 'Optional target parent node ID (defaults to original location)' },
            resolution_strategy: { type: 'string', description: 'Conflict resolution: autorename, overwrite, or fail' },
          },
          required: ['deleted_node_ids'],
        },
      },
      {
        name: 'empty_recycle_bin',
        description: 'Permanently delete all items in the recycle bin of a node — irreversible',
        inputSchema: {
          type: 'object',
          properties: {
            node_id: { type: 'number', description: 'Node ID whose recycle bin to empty' },
          },
          required: ['node_id'],
        },
      },
      // ── Favorites ──────────────────────────────────────────────────────────
      {
        name: 'add_favorite',
        description: 'Mark a node (room, folder, or file) as a favorite for the current user',
        inputSchema: {
          type: 'object',
          properties: {
            node_id: { type: 'number', description: 'Node ID to add to favorites' },
          },
          required: ['node_id'],
        },
      },
      {
        name: 'remove_favorite',
        description: "Remove a node from the current user's favorites",
        inputSchema: {
          type: 'object',
          properties: {
            node_id: { type: 'number', description: 'Node ID to remove from favorites' },
          },
          required: ['node_id'],
        },
      },
      // ── Audit / Events ─────────────────────────────────────────────────────
      {
        name: 'get_audit_node_info',
        description: 'Request node audit information — lists rooms with their assigned users for compliance reporting',
        inputSchema: {
          type: 'object',
          properties: {
            filter: { type: 'string', description: 'Filter expression (e.g. nodeName:cn:projects)' },
            limit: { type: 'number', description: 'Maximum results' },
            offset: { type: 'number', description: 'Pagination offset' },
          },
        },
      },
      {
        name: 'get_room_events',
        description: 'Get the activity log (events) for a specific room — uploads, downloads, permission changes, etc.',
        inputSchema: {
          type: 'object',
          properties: {
            room_id: { type: 'number', description: 'Room ID to get events for' },
            date_start: { type: 'string', description: 'Start date filter (ISO 8601)' },
            date_end: { type: 'string', description: 'End date filter (ISO 8601)' },
            type: { type: 'number', description: 'Event type filter (operation ID)' },
            user_id: { type: 'number', description: 'Filter events by user ID' },
            limit: { type: 'number', description: 'Maximum results' },
            offset: { type: 'number', description: 'Pagination offset' },
          },
          required: ['room_id'],
        },
      },
      // ── User Account ───────────────────────────────────────────────────────
      {
        name: 'get_user_info',
        description: "Get the current authenticated user's account information, roles, and customer details",
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'update_user_account',
        description: "Update the current authenticated user's profile — name, email, or language",
        inputSchema: {
          type: 'object',
          properties: {
            first_name: { type: 'string', description: 'Updated first name' },
            last_name: { type: 'string', description: 'Updated last name' },
            email: { type: 'string', description: 'Updated email address' },
            language: { type: 'string', description: 'Preferred language code (e.g. en-US, de-DE)' },
          },
        },
      },
      // ── Webhooks ───────────────────────────────────────────────────────────
      {
        name: 'list_webhooks',
        description: 'List all webhooks configured for the DRACOON instance (config manager scope)',
        inputSchema: {
          type: 'object',
          properties: {
            filter: { type: 'string', description: 'Filter expression' },
            limit: { type: 'number', description: 'Maximum results' },
            offset: { type: 'number', description: 'Pagination offset' },
          },
        },
      },
      {
        name: 'create_webhook',
        description: 'Create a new webhook to receive DRACOON events at an external URL',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Webhook name' },
            url: { type: 'string', description: 'Target URL to receive webhook payloads' },
            event_type_names: {
              type: 'array',
              description: 'Array of event type names to subscribe to (e.g. ["node.created", "node.deleted"])',
              items: { type: 'string' },
            },
            secret: { type: 'string', description: 'Optional secret for HMAC signature verification' },
            is_enabled: { type: 'boolean', description: 'Whether the webhook is active (default: true)' },
          },
          required: ['name', 'url', 'event_type_names'],
        },
      },
      {
        name: 'get_webhook',
        description: 'Get configuration details for a specific webhook by webhook ID',
        inputSchema: {
          type: 'object',
          properties: {
            webhook_id: { type: 'number', description: 'Webhook ID to retrieve' },
          },
          required: ['webhook_id'],
        },
      },
      {
        name: 'update_webhook',
        description: 'Update an existing webhook — change URL, event types, secret, or enabled status',
        inputSchema: {
          type: 'object',
          properties: {
            webhook_id: { type: 'number', description: 'Webhook ID to update' },
            name: { type: 'string', description: 'Updated webhook name' },
            url: { type: 'string', description: 'Updated target URL' },
            event_type_names: { type: 'array', description: 'Updated list of event type names', items: { type: 'string' } },
            secret: { type: 'string', description: 'Updated HMAC secret' },
            is_enabled: { type: 'boolean', description: 'Enable or disable the webhook' },
          },
          required: ['webhook_id'],
        },
      },
      {
        name: 'delete_webhook',
        description: 'Delete a webhook by ID — it will stop receiving events immediately',
        inputSchema: {
          type: 'object',
          properties: {
            webhook_id: { type: 'number', description: 'Webhook ID to delete' },
          },
          required: ['webhook_id'],
        },
      },
      // ── System / Config ────────────────────────────────────────────────────
      {
        name: 'get_system_info',
        description: 'Get public system information about the DRACOON instance — version, features, authentication methods',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'get_general_settings_info',
        description: 'Get general configuration settings for the DRACOON instance (public info endpoint)',
        inputSchema: { type: 'object', properties: {} },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_nodes':               return this.listNodes(args);
        case 'get_node':                 return this.getNode(args);
        case 'delete_node':              return this.deleteNode(args);
        case 'search_nodes':             return this.searchNodes(args);
        case 'copy_nodes':               return this.copyNodes(args);
        case 'move_nodes':               return this.moveNodes(args);
        case 'create_room':              return this.createRoom(args);
        case 'update_room':              return this.updateRoom(args);
        case 'configure_room':           return this.configureRoom(args);
        case 'get_room_users':           return this.getRoomUsers(args);
        case 'update_room_users':        return this.updateRoomUsers(args);
        case 'revoke_room_users':        return this.revokeRoomUsers(args);
        case 'get_room_groups':          return this.getRoomGroups(args);
        case 'update_room_groups':       return this.updateRoomGroups(args);
        case 'revoke_room_groups':       return this.revokeRoomGroups(args);
        case 'create_folder':            return this.createFolder(args);
        case 'update_folder':            return this.updateFolder(args);
        case 'update_file':              return this.updateFile(args);
        case 'generate_download_url':    return this.generateDownloadUrl(args);
        case 'create_upload_channel':    return this.createUploadChannel(args);
        case 'complete_file_upload':     return this.completeFileUpload(args);
        case 'list_download_shares':     return this.listDownloadShares(args);
        case 'get_download_share':       return this.getDownloadShare(args);
        case 'create_download_share':    return this.createDownloadShare(args);
        case 'delete_download_share':    return this.deleteDownloadShare(args);
        case 'list_upload_shares':       return this.listUploadShares(args);
        case 'get_upload_share':         return this.getUploadShare(args);
        case 'create_upload_share':      return this.createUploadShare(args);
        case 'delete_upload_share':      return this.deleteUploadShare(args);
        case 'list_users':               return this.listUsers(args);
        case 'get_user':                 return this.getUser(args);
        case 'create_user':              return this.createUser(args);
        case 'update_user':              return this.updateUser(args);
        case 'delete_user':              return this.deleteUser(args);
        case 'list_groups':              return this.listGroups(args);
        case 'get_group':                return this.getGroup(args);
        case 'create_group':             return this.createGroup(args);
        case 'update_group':             return this.updateGroup(args);
        case 'delete_group':             return this.deleteGroup(args);
        case 'get_group_members':        return this.getGroupMembers(args);
        case 'add_group_members':        return this.addGroupMembers(args);
        case 'remove_group_members':     return this.removeGroupMembers(args);
        case 'list_deleted_nodes':       return this.listDeletedNodes(args);
        case 'restore_nodes':            return this.restoreNodes(args);
        case 'empty_recycle_bin':        return this.emptyRecycleBin(args);
        case 'add_favorite':             return this.addFavorite(args);
        case 'remove_favorite':          return this.removeFavorite(args);
        case 'get_audit_node_info':      return this.getAuditNodeInfo(args);
        case 'get_room_events':          return this.getRoomEvents(args);
        case 'get_user_info':            return this.getUserInfo();
        case 'update_user_account':      return this.updateUserAccount(args);
        case 'list_webhooks':            return this.listWebhooks(args);
        case 'create_webhook':           return this.createWebhook(args);
        case 'get_webhook':              return this.getWebhook(args);
        case 'update_webhook':           return this.updateWebhook(args);
        case 'delete_webhook':           return this.deleteWebhook(args);
        case 'get_system_info':          return this.getSystemInfo();
        case 'get_general_settings_info': return this.getGeneralSettingsInfo();
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

  private get authHeader(): string {
    return `Bearer ${this.accessToken}`;
  }


  private buildQuery(params: Record<string, unknown>): string {
    const q = Object.entries(params)
      .filter(([, v]) => v !== undefined && v !== null)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
      .join('&');
    return q ? `?${q}` : '';
  }

  private async request(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    path: string,
    body?: Record<string, unknown>,
  ): Promise<ToolResult> {
    const url = `${this.baseUrl}${path}`;
    const init: RequestInit = {
      method,
      headers: {
        Authorization: this.authHeader,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-Sds-Auth-Token': this.accessToken,
      },
    };
    if (body && Object.keys(body).length > 0) init.body = JSON.stringify(body);
    const response = await this.fetchWithRetry(url, init);
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${errText}` }],
        isError: true,
      };
    }
    if (response.status === 204) {
      return { content: [{ type: 'text', text: '{"success":true}' }], isError: false };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  // ── Nodes ──────────────────────────────────────────────────────────────────

  private async listNodes(args: Record<string, unknown>): Promise<ToolResult> {
    const q = this.buildQuery({
      ...(args.parent_id !== undefined ? { parent_id: args.parent_id } : {}),
      ...(args.type ? { type: args.type } : {}),
      ...(args.filter ? { filter: args.filter } : {}),
      ...(args.limit !== undefined ? { limit: args.limit } : {}),
      ...(args.offset !== undefined ? { offset: args.offset } : {}),
    });
    return this.request('GET', `/v4/nodes${q}`);
  }

  private async getNode(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.node_id) return { content: [{ type: 'text', text: 'node_id is required' }], isError: true };
    return this.request('GET', `/v4/nodes/${args.node_id}`);
  }

  private async deleteNode(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.node_id) return { content: [{ type: 'text', text: 'node_id is required' }], isError: true };
    return this.request('DELETE', `/v4/nodes/${args.node_id}`);
  }

  private async searchNodes(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.search_string) return { content: [{ type: 'text', text: 'search_string is required' }], isError: true };
    const q = this.buildQuery({
      search_string: args.search_string,
      ...(args.parent_id !== undefined ? { parent_id: args.parent_id } : {}),
      ...(args.depth_level !== undefined ? { depth_level: args.depth_level } : {}),
      ...(args.filter ? { filter: args.filter } : {}),
      ...(args.limit !== undefined ? { limit: args.limit } : {}),
      ...(args.offset !== undefined ? { offset: args.offset } : {}),
    });
    return this.request('GET', `/v4/nodes/search${q}`);
  }

  private async copyNodes(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.target_parent_id || !args.items) {
      return { content: [{ type: 'text', text: 'target_parent_id and items are required' }], isError: true };
    }
    return this.request('POST', `/v4/nodes/${args.target_parent_id}/copy_to`, { items: args.items } as Record<string, unknown>);
  }

  private async moveNodes(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.target_parent_id || !args.items) {
      return { content: [{ type: 'text', text: 'target_parent_id and items are required' }], isError: true };
    }
    return this.request('POST', `/v4/nodes/${args.target_parent_id}/move_to`, { items: args.items } as Record<string, unknown>);
  }

  // ── Rooms ──────────────────────────────────────────────────────────────────

  private async createRoom(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name) return { content: [{ type: 'text', text: 'name is required' }], isError: true };
    const body: Record<string, unknown> = { name: args.name };
    if (args.parent_id !== undefined) body.parentId = args.parent_id;
    if (args.quota !== undefined) body.quota = args.quota;
    if (args.recycle_bin_retention_period !== undefined) body.recycleBinRetentionPeriod = args.recycle_bin_retention_period;
    if (args.admin_ids) body.adminIds = args.admin_ids;
    if (args.admin_group_ids) body.adminGroupIds = args.admin_group_ids;
    if (args.notes) body.notes = args.notes;
    return this.request('POST', '/v4/nodes/rooms', body);
  }

  private async updateRoom(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.room_id) return { content: [{ type: 'text', text: 'room_id is required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.name) body.name = args.name;
    if (args.quota !== undefined) body.quota = args.quota;
    if (args.notes) body.notes = args.notes;
    if (args.recycle_bin_retention_period !== undefined) body.recycleBinRetentionPeriod = args.recycle_bin_retention_period;
    return this.request('PUT', `/v4/nodes/rooms/${args.room_id}`, body);
  }

  private async configureRoom(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.room_id) return { content: [{ type: 'text', text: 'room_id is required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.inherit_permissions !== undefined) body.inheritPermissions = args.inherit_permissions;
    if (args.take_over_permissions !== undefined) body.takeOverPermissions = args.take_over_permissions;
    if (args.enable_virus_protection !== undefined) body.virusProtectionIsEnabled = args.enable_virus_protection;
    if (args.virus_protection_type) body.virusProtectionType = args.virus_protection_type;
    return this.request('PUT', `/v4/nodes/rooms/${args.room_id}/config`, body);
  }

  private async getRoomUsers(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.room_id) return { content: [{ type: 'text', text: 'room_id is required' }], isError: true };
    const q = this.buildQuery({
      ...(args.filter ? { filter: args.filter } : {}),
      ...(args.limit !== undefined ? { limit: args.limit } : {}),
      ...(args.offset !== undefined ? { offset: args.offset } : {}),
    });
    return this.request('GET', `/v4/nodes/rooms/${args.room_id}/users${q}`);
  }

  private async updateRoomUsers(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.room_id || !args.items) {
      return { content: [{ type: 'text', text: 'room_id and items are required' }], isError: true };
    }
    return this.request('PUT', `/v4/nodes/rooms/${args.room_id}/users`, { items: args.items } as Record<string, unknown>);
  }

  private async revokeRoomUsers(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.room_id || !args.ids) {
      return { content: [{ type: 'text', text: 'room_id and ids are required' }], isError: true };
    }
    return this.request('DELETE', `/v4/nodes/rooms/${args.room_id}/users`);
  }

  private async getRoomGroups(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.room_id) return { content: [{ type: 'text', text: 'room_id is required' }], isError: true };
    const q = this.buildQuery({
      ...(args.filter ? { filter: args.filter } : {}),
      ...(args.limit !== undefined ? { limit: args.limit } : {}),
      ...(args.offset !== undefined ? { offset: args.offset } : {}),
    });
    return this.request('GET', `/v4/nodes/rooms/${args.room_id}/groups${q}`);
  }

  private async updateRoomGroups(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.room_id || !args.items) {
      return { content: [{ type: 'text', text: 'room_id and items are required' }], isError: true };
    }
    return this.request('PUT', `/v4/nodes/rooms/${args.room_id}/groups`, { items: args.items } as Record<string, unknown>);
  }

  private async revokeRoomGroups(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.room_id || !args.ids) {
      return { content: [{ type: 'text', text: 'room_id and ids are required' }], isError: true };
    }
    return this.request('DELETE', `/v4/nodes/rooms/${args.room_id}/groups`);
  }

  // ── Folders ────────────────────────────────────────────────────────────────

  private async createFolder(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.parent_id || !args.name) {
      return { content: [{ type: 'text', text: 'parent_id and name are required' }], isError: true };
    }
    const body: Record<string, unknown> = { parentId: args.parent_id, name: args.name };
    if (args.notes) body.notes = args.notes;
    return this.request('POST', '/v4/nodes/folders', body);
  }

  private async updateFolder(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.folder_id) return { content: [{ type: 'text', text: 'folder_id is required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.name) body.name = args.name;
    if (args.notes) body.notes = args.notes;
    return this.request('PUT', `/v4/nodes/folders/${args.folder_id}`, body);
  }

  // ── Files ──────────────────────────────────────────────────────────────────

  private async updateFile(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.file_id) return { content: [{ type: 'text', text: 'file_id is required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.name) body.name = args.name;
    if (args.notes) body.notes = args.notes;
    if (args.classification !== undefined) body.classification = args.classification;
    return this.request('PUT', `/v4/nodes/files/${args.file_id}`, body);
  }

  private async generateDownloadUrl(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.file_id) return { content: [{ type: 'text', text: 'file_id is required' }], isError: true };
    return this.request('POST', `/v4/nodes/files/${args.file_id}/downloads`);
  }

  private async createUploadChannel(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.parent_id || !args.name) {
      return { content: [{ type: 'text', text: 'parent_id and name are required' }], isError: true };
    }
    const body: Record<string, unknown> = { parentId: args.parent_id, name: args.name };
    if (args.size !== undefined) body.size = args.size;
    if (args.classification !== undefined) body.classification = args.classification;
    if (args.notes) body.notes = args.notes;
    return this.request('POST', '/v4/nodes/files/uploads', body);
  }

  private async completeFileUpload(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.upload_id) return { content: [{ type: 'text', text: 'upload_id is required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.file_name) body.fileName = args.file_name;
    if (args.resolution_strategy) body.resolutionStrategy = args.resolution_strategy;
    return this.request('PUT', `/v4/nodes/files/uploads/${encodeURIComponent(args.upload_id as string)}`, body);
  }

  // ── Download Shares ────────────────────────────────────────────────────────

  private async listDownloadShares(args: Record<string, unknown>): Promise<ToolResult> {
    const q = this.buildQuery({
      ...(args.filter ? { filter: args.filter } : {}),
      ...(args.limit !== undefined ? { limit: args.limit } : {}),
      ...(args.offset !== undefined ? { offset: args.offset } : {}),
    });
    return this.request('GET', `/v4/shares/downloads${q}`);
  }

  private async getDownloadShare(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.share_id) return { content: [{ type: 'text', text: 'share_id is required' }], isError: true };
    return this.request('GET', `/v4/shares/downloads/${args.share_id}`);
  }

  private async createDownloadShare(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.node_id) return { content: [{ type: 'text', text: 'node_id is required' }], isError: true };
    const body: Record<string, unknown> = { nodeId: args.node_id };
    if (args.name) body.name = args.name;
    if (args.notes) body.notes = args.notes;
    if (args.expiration) body.expiration = args.expiration;
    if (args.password) body.password = args.password;
    if (args.max_downloads !== undefined) body.maxDownloads = args.max_downloads;
    if (args.send_mail !== undefined) body.sendMail = args.send_mail;
    if (args.mail_recipients) body.mailRecipients = args.mail_recipients;
    return this.request('POST', '/v4/shares/downloads', body);
  }

  private async deleteDownloadShare(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.share_id) return { content: [{ type: 'text', text: 'share_id is required' }], isError: true };
    return this.request('DELETE', `/v4/shares/downloads/${args.share_id}`);
  }

  // ── Upload Shares ──────────────────────────────────────────────────────────

  private async listUploadShares(args: Record<string, unknown>): Promise<ToolResult> {
    const q = this.buildQuery({
      ...(args.filter ? { filter: args.filter } : {}),
      ...(args.limit !== undefined ? { limit: args.limit } : {}),
      ...(args.offset !== undefined ? { offset: args.offset } : {}),
    });
    return this.request('GET', `/v4/shares/uploads${q}`);
  }

  private async getUploadShare(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.share_id) return { content: [{ type: 'text', text: 'share_id is required' }], isError: true };
    return this.request('GET', `/v4/shares/uploads/${args.share_id}`);
  }

  private async createUploadShare(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.target_id || !args.name) {
      return { content: [{ type: 'text', text: 'target_id and name are required' }], isError: true };
    }
    const body: Record<string, unknown> = { targetId: args.target_id, name: args.name };
    if (args.notes) body.notes = args.notes;
    if (args.expiration) body.expiration = args.expiration;
    if (args.password) body.password = args.password;
    if (args.max_slots !== undefined) body.maxSlots = args.max_slots;
    if (args.send_mail !== undefined) body.sendMail = args.send_mail;
    if (args.mail_recipients) body.mailRecipients = args.mail_recipients;
    return this.request('POST', '/v4/shares/uploads', body);
  }

  private async deleteUploadShare(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.share_id) return { content: [{ type: 'text', text: 'share_id is required' }], isError: true };
    return this.request('DELETE', `/v4/shares/uploads/${args.share_id}`);
  }

  // ── Users ──────────────────────────────────────────────────────────────────

  private async listUsers(args: Record<string, unknown>): Promise<ToolResult> {
    const q = this.buildQuery({
      ...(args.filter ? { filter: args.filter } : {}),
      ...(args.limit !== undefined ? { limit: args.limit } : {}),
      ...(args.offset !== undefined ? { offset: args.offset } : {}),
    });
    return this.request('GET', `/v4/users${q}`);
  }

  private async getUser(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.user_id) return { content: [{ type: 'text', text: 'user_id is required' }], isError: true };
    return this.request('GET', `/v4/users/${args.user_id}`);
  }

  private async createUser(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.first_name || !args.last_name || !args.user_name) {
      return { content: [{ type: 'text', text: 'first_name, last_name, and user_name are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      firstName: args.first_name,
      lastName: args.last_name,
      userName: args.user_name,
    };
    if (args.email) body.email = args.email;
    if (args.password) body.password = args.password;
    if (args.notify_user !== undefined) body.notifyUser = args.notify_user;
    if (args.expire_at) body.expireAt = args.expire_at;
    return this.request('POST', '/v4/users', body);
  }

  private async updateUser(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.user_id) return { content: [{ type: 'text', text: 'user_id is required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.first_name) body.firstName = args.first_name;
    if (args.last_name) body.lastName = args.last_name;
    if (args.email) body.email = args.email;
    if (args.is_locked !== undefined) body.isLocked = args.is_locked;
    if (args.expire_at) body.expireAt = args.expire_at;
    return this.request('PUT', `/v4/users/${args.user_id}`, body);
  }

  private async deleteUser(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.user_id) return { content: [{ type: 'text', text: 'user_id is required' }], isError: true };
    return this.request('DELETE', `/v4/users/${args.user_id}`);
  }

  // ── Groups ─────────────────────────────────────────────────────────────────

  private async listGroups(args: Record<string, unknown>): Promise<ToolResult> {
    const q = this.buildQuery({
      ...(args.filter ? { filter: args.filter } : {}),
      ...(args.limit !== undefined ? { limit: args.limit } : {}),
      ...(args.offset !== undefined ? { offset: args.offset } : {}),
    });
    return this.request('GET', `/v4/groups${q}`);
  }

  private async getGroup(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.group_id) return { content: [{ type: 'text', text: 'group_id is required' }], isError: true };
    return this.request('GET', `/v4/groups/${args.group_id}`);
  }

  private async createGroup(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name) return { content: [{ type: 'text', text: 'name is required' }], isError: true };
    const body: Record<string, unknown> = { name: args.name };
    if (args.expire_at) body.expireAt = args.expire_at;
    return this.request('POST', '/v4/groups', body);
  }

  private async updateGroup(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.group_id) return { content: [{ type: 'text', text: 'group_id is required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.name) body.name = args.name;
    if (args.expire_at) body.expireAt = args.expire_at;
    return this.request('PUT', `/v4/groups/${args.group_id}`, body);
  }

  private async deleteGroup(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.group_id) return { content: [{ type: 'text', text: 'group_id is required' }], isError: true };
    return this.request('DELETE', `/v4/groups/${args.group_id}`);
  }

  private async getGroupMembers(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.group_id) return { content: [{ type: 'text', text: 'group_id is required' }], isError: true };
    const q = this.buildQuery({
      ...(args.filter ? { filter: args.filter } : {}),
      ...(args.limit !== undefined ? { limit: args.limit } : {}),
      ...(args.offset !== undefined ? { offset: args.offset } : {}),
    });
    return this.request('GET', `/v4/groups/${args.group_id}/users${q}`);
  }

  private async addGroupMembers(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.group_id || !args.ids) {
      return { content: [{ type: 'text', text: 'group_id and ids are required' }], isError: true };
    }
    return this.request('POST', `/v4/groups/${args.group_id}/users`, { ids: args.ids } as Record<string, unknown>);
  }

  private async removeGroupMembers(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.group_id || !args.ids) {
      return { content: [{ type: 'text', text: 'group_id and ids are required' }], isError: true };
    }
    return this.request('DELETE', `/v4/groups/${args.group_id}/users`);
  }

  // ── Recycle Bin ────────────────────────────────────────────────────────────

  private async listDeletedNodes(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.node_id) return { content: [{ type: 'text', text: 'node_id is required' }], isError: true };
    const q = this.buildQuery({
      ...(args.filter ? { filter: args.filter } : {}),
      ...(args.limit !== undefined ? { limit: args.limit } : {}),
      ...(args.offset !== undefined ? { offset: args.offset } : {}),
    });
    return this.request('GET', `/v4/nodes/${args.node_id}/deleted_nodes${q}`);
  }

  private async restoreNodes(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.deleted_node_ids) {
      return { content: [{ type: 'text', text: 'deleted_node_ids is required' }], isError: true };
    }
    const body: Record<string, unknown> = { deletedNodeIds: args.deleted_node_ids };
    if (args.parent_id !== undefined) body.parentId = args.parent_id;
    if (args.resolution_strategy) body.resolutionStrategy = args.resolution_strategy;
    return this.request('POST', '/v4/nodes/deleted_nodes/actions/restore', body);
  }

  private async emptyRecycleBin(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.node_id) return { content: [{ type: 'text', text: 'node_id is required' }], isError: true };
    return this.request('DELETE', `/v4/nodes/${args.node_id}/deleted_nodes`);
  }

  // ── Favorites ──────────────────────────────────────────────────────────────

  private async addFavorite(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.node_id) return { content: [{ type: 'text', text: 'node_id is required' }], isError: true };
    return this.request('POST', `/v4/nodes/${args.node_id}/favorite`);
  }

  private async removeFavorite(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.node_id) return { content: [{ type: 'text', text: 'node_id is required' }], isError: true };
    return this.request('DELETE', `/v4/nodes/${args.node_id}/favorite`);
  }

  // ── Audit / Events ─────────────────────────────────────────────────────────

  private async getAuditNodeInfo(args: Record<string, unknown>): Promise<ToolResult> {
    const q = this.buildQuery({
      ...(args.filter ? { filter: args.filter } : {}),
      ...(args.limit !== undefined ? { limit: args.limit } : {}),
      ...(args.offset !== undefined ? { offset: args.offset } : {}),
    });
    return this.request('GET', `/v4/eventlog/audits/node_info${q}`);
  }

  private async getRoomEvents(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.room_id) return { content: [{ type: 'text', text: 'room_id is required' }], isError: true };
    const q = this.buildQuery({
      ...(args.date_start ? { date_start: args.date_start } : {}),
      ...(args.date_end ? { date_end: args.date_end } : {}),
      ...(args.type !== undefined ? { type: args.type } : {}),
      ...(args.user_id !== undefined ? { user_id: args.user_id } : {}),
      ...(args.limit !== undefined ? { limit: args.limit } : {}),
      ...(args.offset !== undefined ? { offset: args.offset } : {}),
    });
    return this.request('GET', `/v4/nodes/rooms/${args.room_id}/events${q}`);
  }

  // ── User Account ───────────────────────────────────────────────────────────

  private async getUserInfo(): Promise<ToolResult> {
    return this.request('GET', '/v4/user/account');
  }

  private async updateUserAccount(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {};
    if (args.first_name) body.firstName = args.first_name;
    if (args.last_name) body.lastName = args.last_name;
    if (args.email) body.email = args.email;
    if (args.language) body.language = args.language;
    return this.request('PUT', '/v4/user/account', body);
  }

  // ── Webhooks ───────────────────────────────────────────────────────────────

  private async listWebhooks(args: Record<string, unknown>): Promise<ToolResult> {
    const q = this.buildQuery({
      ...(args.filter ? { filter: args.filter } : {}),
      ...(args.limit !== undefined ? { limit: args.limit } : {}),
      ...(args.offset !== undefined ? { offset: args.offset } : {}),
    });
    return this.request('GET', `/v4/settings/webhooks${q}`);
  }

  private async createWebhook(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name || !args.url || !args.event_type_names) {
      return { content: [{ type: 'text', text: 'name, url, and event_type_names are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      name: args.name,
      url: args.url,
      eventTypeNames: args.event_type_names,
    };
    if (args.secret) body.secret = args.secret;
    if (args.is_enabled !== undefined) body.isEnabled = args.is_enabled;
    return this.request('POST', '/v4/settings/webhooks', body);
  }

  private async getWebhook(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.webhook_id) return { content: [{ type: 'text', text: 'webhook_id is required' }], isError: true };
    return this.request('GET', `/v4/settings/webhooks/${args.webhook_id}`);
  }

  private async updateWebhook(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.webhook_id) return { content: [{ type: 'text', text: 'webhook_id is required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.name) body.name = args.name;
    if (args.url) body.url = args.url;
    if (args.event_type_names) body.eventTypeNames = args.event_type_names;
    if (args.secret) body.secret = args.secret;
    if (args.is_enabled !== undefined) body.isEnabled = args.is_enabled;
    return this.request('PUT', `/v4/settings/webhooks/${args.webhook_id}`, body);
  }

  private async deleteWebhook(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.webhook_id) return { content: [{ type: 'text', text: 'webhook_id is required' }], isError: true };
    return this.request('DELETE', `/v4/settings/webhooks/${args.webhook_id}`);
  }

  // ── System / Config ────────────────────────────────────────────────────────

  private async getSystemInfo(): Promise<ToolResult> {
    return this.request('GET', '/v4/public/system/info');
  }

  private async getGeneralSettingsInfo(): Promise<ToolResult> {
    return this.request('GET', '/v4/config/info/general');
  }
}

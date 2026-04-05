/**
 * OneDrive & SharePoint MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: Microsoft publishes separate OneDrive and SharePoint MCP servers via the Agent 365
//   gateway (https://github.com/microsoft/mcp / bap-microsoft/MCP-Platform). Transport: Remote/HTTPS.
//   Auth: Delegated (user) only. The combined ODSPRemoteServer was deprecated 2026-03-13.
//   MCP TOOL COUNT: Not publicly enumerated; tools include createFolder, getFolderChildren,
//   readSmallBinaryFile, createSmallTextFile, shareFileOrFolder, findSite, listSubsites,
//   listDocumentLibrariesInSite, getDefaultDocumentLibraryInSite, and others.
//   Criterion FAILED: Requires Agent 365 gateway (not stdio/streamable-HTTP), delegated auth only
//   (no client_credentials / application permissions).
// Our adapter covers: 20 tools. Built on Microsoft Graph API v1.0 with OAuth2 client credentials.
// Recommendation: use-rest-api — the official MCP servers require delegated (user) auth via Agent 365
//   gateway and cannot be used for service-principal / daemon access. This adapter covers that gap.
//
// Base URL: https://graph.microsoft.com/v1.0
// Auth: OAuth2 client credentials — POST https://login.microsoftonline.com/{tenantId}/oauth2/v2.0/token
//   Scopes required: Files.ReadWrite.All, Sites.ReadWrite.All (application permissions in Azure AD)
// Docs: https://learn.microsoft.com/en-us/onedrive/developer/rest-api/
//       https://learn.microsoft.com/en-us/graph/api/resources/onedrive
// Rate limits: Microsoft Graph — 10,000 requests per 10 minutes per app per tenant (Files scope)

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface OneDriveSharePointConfig {
  clientId: string;
  clientSecret: string;
  tenantId: string;
  baseUrl?: string;
}

export class OneDriveSharePointMCPServer extends MCPAdapterBase {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly tenantId: string;
  private readonly baseUrl: string;
  private bearerToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(config: OneDriveSharePointConfig) {
    super();
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.tenantId = config.tenantId;
    this.baseUrl = config.baseUrl || 'https://graph.microsoft.com/v1.0';
  }

  static catalog() {
    return {
      name: 'onedrive-sharepoint',
      displayName: 'OneDrive & SharePoint',
      version: '1.0.0',
      category: 'collaboration',
      keywords: [
        'onedrive', 'sharepoint', 'microsoft', 'graph', 'office365', 'o365',
        'file', 'folder', 'document', 'drive', 'site', 'library',
        'share', 'permission', 'upload', 'download', 'list', 'search',
      ],
      toolNames: [
        'get_my_drive', 'list_drives', 'get_drive',
        'list_drive_items', 'get_drive_item', 'search_drive',
        'create_folder', 'upload_file', 'delete_drive_item', 'move_drive_item', 'copy_drive_item',
        'get_item_permissions', 'create_sharing_link', 'invite_item_access',
        'list_sites', 'get_site', 'search_sites',
        'list_site_lists', 'get_site_list', 'list_site_list_items',
      ],
      description: 'OneDrive and SharePoint via Microsoft Graph: browse drives and files, manage folders, upload/download, search content, manage sharing permissions, and query SharePoint sites and lists.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'get_my_drive',
        description: "Get the signed-in user's OneDrive default drive metadata including quota and owner information",
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'list_drives',
        description: 'List all drives accessible to a specific user or the current application service principal',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: {
              type: 'string',
              description: 'User ID or UPN (e.g. user@tenant.com) to list drives for; omit for the app-level service principal drives',
            },
          },
        },
      },
      {
        name: 'get_drive',
        description: 'Get metadata for a specific drive by its ID, including quota, owner, and drive type',
        inputSchema: {
          type: 'object',
          properties: {
            drive_id: {
              type: 'string',
              description: 'Drive ID from a previous list_drives or list_sites response',
            },
          },
          required: ['drive_id'],
        },
      },
      {
        name: 'list_drive_items',
        description: 'List children (files and folders) of a drive root or specific folder by item ID',
        inputSchema: {
          type: 'object',
          properties: {
            drive_id: {
              type: 'string',
              description: 'Drive ID to list items in',
            },
            item_id: {
              type: 'string',
              description: 'Folder item ID to list children of; omit to list root (default: root)',
            },
            top: {
              type: 'number',
              description: 'Maximum items to return (default: 50, max: 999)',
            },
          },
          required: ['drive_id'],
        },
      },
      {
        name: 'get_drive_item',
        description: 'Get metadata for a specific file or folder by drive ID and item ID or path',
        inputSchema: {
          type: 'object',
          properties: {
            drive_id: {
              type: 'string',
              description: 'Drive ID that contains the item',
            },
            item_id: {
              type: 'string',
              description: 'Item ID (e.g. 01BYE5RZ...) — use instead of path',
            },
            item_path: {
              type: 'string',
              description: 'Item path relative to root (e.g. /Documents/report.docx) — use instead of item_id',
            },
          },
          required: ['drive_id'],
        },
      },
      {
        name: 'search_drive',
        description: 'Search for files and folders within a drive by filename or content keywords',
        inputSchema: {
          type: 'object',
          properties: {
            drive_id: {
              type: 'string',
              description: 'Drive ID to search within',
            },
            query: {
              type: 'string',
              description: 'Search query string — searches file names and content',
            },
            top: {
              type: 'number',
              description: 'Maximum results to return (default: 25)',
            },
          },
          required: ['drive_id', 'query'],
        },
      },
      {
        name: 'create_folder',
        description: 'Create a new folder in a drive under a specified parent folder or the root',
        inputSchema: {
          type: 'object',
          properties: {
            drive_id: {
              type: 'string',
              description: 'Drive ID to create the folder in',
            },
            parent_item_id: {
              type: 'string',
              description: 'Parent folder item ID; omit to create at root (default: root)',
            },
            folder_name: {
              type: 'string',
              description: 'Name for the new folder',
            },
          },
          required: ['drive_id', 'folder_name'],
        },
      },
      {
        name: 'upload_file',
        description: 'Upload a small file (under 4 MB) to a drive as plain text or JSON content by providing content inline',
        inputSchema: {
          type: 'object',
          properties: {
            drive_id: {
              type: 'string',
              description: 'Drive ID to upload to',
            },
            parent_item_id: {
              type: 'string',
              description: 'Parent folder item ID; omit for root',
            },
            file_name: {
              type: 'string',
              description: 'Target filename including extension (e.g. notes.txt)',
            },
            content: {
              type: 'string',
              description: 'File content as a string (UTF-8 text)',
            },
          },
          required: ['drive_id', 'file_name', 'content'],
        },
      },
      {
        name: 'delete_drive_item',
        description: 'Delete a file or folder from a drive by item ID — this action is permanent',
        inputSchema: {
          type: 'object',
          properties: {
            drive_id: {
              type: 'string',
              description: 'Drive ID containing the item',
            },
            item_id: {
              type: 'string',
              description: 'Item ID of the file or folder to delete',
            },
          },
          required: ['drive_id', 'item_id'],
        },
      },
      {
        name: 'move_drive_item',
        description: 'Move a file or folder to a new parent folder within the same or different drive',
        inputSchema: {
          type: 'object',
          properties: {
            drive_id: {
              type: 'string',
              description: 'Drive ID containing the item to move',
            },
            item_id: {
              type: 'string',
              description: 'Item ID of the file or folder to move',
            },
            new_parent_id: {
              type: 'string',
              description: 'Item ID of the destination parent folder',
            },
            new_name: {
              type: 'string',
              description: 'Optional new name for the item at the destination',
            },
          },
          required: ['drive_id', 'item_id', 'new_parent_id'],
        },
      },
      {
        name: 'copy_drive_item',
        description: 'Copy a file or folder to a new location — returns an async operation URL to track progress',
        inputSchema: {
          type: 'object',
          properties: {
            drive_id: {
              type: 'string',
              description: 'Drive ID containing the source item',
            },
            item_id: {
              type: 'string',
              description: 'Source item ID to copy',
            },
            destination_drive_id: {
              type: 'string',
              description: 'Destination drive ID (can differ from source)',
            },
            destination_parent_id: {
              type: 'string',
              description: 'Destination parent folder item ID',
            },
            new_name: {
              type: 'string',
              description: 'Name for the copied item (defaults to original name)',
            },
          },
          required: ['drive_id', 'item_id', 'destination_drive_id', 'destination_parent_id'],
        },
      },
      {
        name: 'get_item_permissions',
        description: 'List all permissions (shared links and direct grants) on a specific file or folder',
        inputSchema: {
          type: 'object',
          properties: {
            drive_id: {
              type: 'string',
              description: 'Drive ID containing the item',
            },
            item_id: {
              type: 'string',
              description: 'Item ID to retrieve permissions for',
            },
          },
          required: ['drive_id', 'item_id'],
        },
      },
      {
        name: 'create_sharing_link',
        description: 'Create a shareable link for a file or folder with view or edit access scope',
        inputSchema: {
          type: 'object',
          properties: {
            drive_id: {
              type: 'string',
              description: 'Drive ID containing the item',
            },
            item_id: {
              type: 'string',
              description: 'Item ID to create a sharing link for',
            },
            link_type: {
              type: 'string',
              description: 'Link type: view (read-only) or edit (read-write) (default: view)',
            },
            scope: {
              type: 'string',
              description: 'Scope: anonymous (anyone with link) or organization (tenant users only) (default: organization)',
            },
          },
          required: ['drive_id', 'item_id'],
        },
      },
      {
        name: 'invite_item_access',
        description: 'Grant specific users access to a file or folder by sending an invitation with a permission role',
        inputSchema: {
          type: 'object',
          properties: {
            drive_id: {
              type: 'string',
              description: 'Drive ID containing the item',
            },
            item_id: {
              type: 'string',
              description: 'Item ID to grant access to',
            },
            emails: {
              type: 'string',
              description: 'Comma-separated email addresses of users to invite',
            },
            roles: {
              type: 'string',
              description: 'Permission role: read or write (default: read)',
            },
            message: {
              type: 'string',
              description: 'Optional invitation message sent to recipients',
            },
          },
          required: ['drive_id', 'item_id', 'emails'],
        },
      },
      {
        name: 'list_sites',
        description: "List SharePoint sites in the organization's tenant with optional keyword filter",
        inputSchema: {
          type: 'object',
          properties: {
            search: {
              type: 'string',
              description: 'Search keyword to filter sites by display name or URL',
            },
            top: {
              type: 'number',
              description: 'Maximum sites to return (default: 25)',
            },
          },
        },
      },
      {
        name: 'get_site',
        description: 'Get metadata for a specific SharePoint site by site ID or hostname:path format',
        inputSchema: {
          type: 'object',
          properties: {
            site_id: {
              type: 'string',
              description: 'Site ID (e.g. contoso.sharepoint.com,abc123,def456) or hostname:path (e.g. contoso.sharepoint.com:/sites/mysite)',
            },
          },
          required: ['site_id'],
        },
      },
      {
        name: 'search_sites',
        description: 'Search across all SharePoint sites in the tenant by display name or URL keyword',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search keyword to find SharePoint sites',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'list_site_lists',
        description: 'List SharePoint lists (document libraries, custom lists) within a site',
        inputSchema: {
          type: 'object',
          properties: {
            site_id: {
              type: 'string',
              description: 'SharePoint site ID',
            },
          },
          required: ['site_id'],
        },
      },
      {
        name: 'get_site_list',
        description: 'Get details of a specific SharePoint list within a site including column schema',
        inputSchema: {
          type: 'object',
          properties: {
            site_id: {
              type: 'string',
              description: 'SharePoint site ID',
            },
            list_id: {
              type: 'string',
              description: 'List ID or list title (URL-encoded)',
            },
          },
          required: ['site_id', 'list_id'],
        },
      },
      {
        name: 'list_site_list_items',
        description: 'List items in a SharePoint list with optional OData filter and field selection',
        inputSchema: {
          type: 'object',
          properties: {
            site_id: {
              type: 'string',
              description: 'SharePoint site ID',
            },
            list_id: {
              type: 'string',
              description: 'List ID or title',
            },
            filter: {
              type: 'string',
              description: "OData filter expression (e.g. \"fields/Status eq 'Active'\")",
            },
            top: {
              type: 'number',
              description: 'Maximum items to return (default: 50)',
            },
          },
          required: ['site_id', 'list_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'get_my_drive':
          return this.getMyDrive();
        case 'list_drives':
          return this.listDrives(args);
        case 'get_drive':
          return this.getDrive(args);
        case 'list_drive_items':
          return this.listDriveItems(args);
        case 'get_drive_item':
          return this.getDriveItem(args);
        case 'search_drive':
          return this.searchDrive(args);
        case 'create_folder':
          return this.createFolder(args);
        case 'upload_file':
          return this.uploadFile(args);
        case 'delete_drive_item':
          return this.deleteDriveItem(args);
        case 'move_drive_item':
          return this.moveDriveItem(args);
        case 'copy_drive_item':
          return this.copyDriveItem(args);
        case 'get_item_permissions':
          return this.getItemPermissions(args);
        case 'create_sharing_link':
          return this.createSharingLink(args);
        case 'invite_item_access':
          return this.inviteItemAccess(args);
        case 'list_sites':
          return this.listSites(args);
        case 'get_site':
          return this.getSite(args);
        case 'search_sites':
          return this.searchSites(args);
        case 'list_site_lists':
          return this.listSiteLists(args);
        case 'get_site_list':
          return this.getSiteList(args);
        case 'list_site_list_items':
          return this.listSiteListItems(args);
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

  private async getOrRefreshToken(): Promise<string> {
    const now = Date.now();
    if (this.bearerToken && this.tokenExpiry > now) {
      return this.bearerToken;
    }
    const response = await this.fetchWithRetry(
      `https://login.microsoftonline.com/${this.tenantId}/oauth2/v2.0/token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: this.clientId,
          client_secret: this.clientSecret,
          scope: 'https://graph.microsoft.com/.default',
        }).toString(),
      },
    );
    if (!response.ok) {
      throw new Error(`OAuth2 token request failed: ${response.status} ${response.statusText}`);
    }
    const data = await response.json() as { access_token: string; expires_in: number };
    this.bearerToken = data.access_token;
    this.tokenExpiry = now + (data.expires_in - 60) * 1000;
    return this.bearerToken;
  }

  private async graphGet(path: string, params?: Record<string, string>): Promise<ToolResult> {
    const token = await this.getOrRefreshToken();
    const qs = params && Object.keys(params).length > 0 ? '?' + new URLSearchParams(params).toString() : '';
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}${qs}`, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async graphPost(path: string, body: Record<string, unknown>, contentType = 'application/json'): Promise<ToolResult> {
    const token = await this.getOrRefreshToken();
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': contentType },
      body: contentType === 'application/json' ? JSON.stringify(body) : (body.content as string),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const responseText = await response.text();
    let data: unknown;
    try { data = JSON.parse(responseText); } catch { data = { result: responseText }; }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async graphPatch(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const token = await this.getOrRefreshToken();
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async graphDelete(path: string): Promise<ToolResult> {
    const token = await this.getOrRefreshToken();
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: JSON.stringify({ deleted: true }) }], isError: false };
  }

  private async getMyDrive(): Promise<ToolResult> {
    return this.graphGet('/me/drive');
  }

  private async listDrives(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.user_id) return this.graphGet(`/users/${encodeURIComponent(args.user_id as string)}/drives`);
    return this.graphGet('/drives');
  }

  private async getDrive(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.drive_id) return { content: [{ type: 'text', text: 'drive_id is required' }], isError: true };
    return this.graphGet(`/drives/${encodeURIComponent(args.drive_id as string)}`);
  }

  private async listDriveItems(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.drive_id) return { content: [{ type: 'text', text: 'drive_id is required' }], isError: true };
    const itemRef = args.item_id ? `/items/${encodeURIComponent(args.item_id as string)}` : '/root';
    const params: Record<string, string> = { $top: String((args.top as number) ?? 50) };
    return this.graphGet(`/drives/${encodeURIComponent(args.drive_id as string)}${itemRef}/children`, params);
  }

  private async getDriveItem(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.drive_id) return { content: [{ type: 'text', text: 'drive_id is required' }], isError: true };
    if (!args.item_id && !args.item_path) return { content: [{ type: 'text', text: 'item_id or item_path is required' }], isError: true };
    const ref = args.item_id ? `/items/${encodeURIComponent(args.item_id as string)}` : `/root:${encodeURIComponent(args.item_path as string)}`;
    return this.graphGet(`/drives/${encodeURIComponent(args.drive_id as string)}${ref}`);
  }

  private async searchDrive(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.drive_id || !args.query) return { content: [{ type: 'text', text: 'drive_id and query are required' }], isError: true };
    const params: Record<string, string> = { $top: String((args.top as number) ?? 25) };
    return this.graphGet(`/drives/${encodeURIComponent(args.drive_id as string)}/root/search(q='${encodeURIComponent(args.query as string)}')`, params);
  }

  private async createFolder(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.drive_id || !args.folder_name) return { content: [{ type: 'text', text: 'drive_id and folder_name are required' }], isError: true };
    const parentRef = args.parent_item_id ? `/items/${encodeURIComponent(args.parent_item_id as string)}` : '/root';
    return this.graphPost(`/drives/${encodeURIComponent(args.drive_id as string)}${parentRef}/children`, {
      name: args.folder_name,
      folder: {},
      '@microsoft.graph.conflictBehavior': 'rename',
    });
  }

  private async uploadFile(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.drive_id || !args.file_name || args.content === undefined) return { content: [{ type: 'text', text: 'drive_id, file_name, and content are required' }], isError: true };
    const token = await this.getOrRefreshToken();
    const parentRef = args.parent_item_id ? `/items/${encodeURIComponent(args.parent_item_id as string)}` : '/root';
    const path = `/drives/${encodeURIComponent(args.drive_id as string)}${parentRef}:/${encodeURIComponent(args.file_name as string)}:/content`;
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'text/plain' },
      body: args.content as string,
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async deleteDriveItem(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.drive_id || !args.item_id) return { content: [{ type: 'text', text: 'drive_id and item_id are required' }], isError: true };
    return this.graphDelete(`/drives/${encodeURIComponent(args.drive_id as string)}/items/${encodeURIComponent(args.item_id as string)}`);
  }

  private async moveDriveItem(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.drive_id || !args.item_id || !args.new_parent_id) return { content: [{ type: 'text', text: 'drive_id, item_id, and new_parent_id are required' }], isError: true };
    const body: Record<string, unknown> = {
      parentReference: { id: args.new_parent_id },
    };
    if (args.new_name) body.name = args.new_name;
    return this.graphPatch(`/drives/${encodeURIComponent(args.drive_id as string)}/items/${encodeURIComponent(args.item_id as string)}`, body);
  }

  private async copyDriveItem(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.drive_id || !args.item_id || !args.destination_drive_id || !args.destination_parent_id) {
      return { content: [{ type: 'text', text: 'drive_id, item_id, destination_drive_id, and destination_parent_id are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      parentReference: {
        driveId: args.destination_drive_id,
        id: args.destination_parent_id,
      },
    };
    if (args.new_name) body.name = args.new_name;
    return this.graphPost(`/drives/${encodeURIComponent(args.drive_id as string)}/items/${encodeURIComponent(args.item_id as string)}/copy`, body);
  }

  private async getItemPermissions(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.drive_id || !args.item_id) return { content: [{ type: 'text', text: 'drive_id and item_id are required' }], isError: true };
    return this.graphGet(`/drives/${encodeURIComponent(args.drive_id as string)}/items/${encodeURIComponent(args.item_id as string)}/permissions`);
  }

  private async createSharingLink(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.drive_id || !args.item_id) return { content: [{ type: 'text', text: 'drive_id and item_id are required' }], isError: true };
    return this.graphPost(`/drives/${encodeURIComponent(args.drive_id as string)}/items/${encodeURIComponent(args.item_id as string)}/createLink`, {
      type: (args.link_type as string) || 'view',
      scope: (args.scope as string) || 'organization',
    });
  }

  private async inviteItemAccess(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.drive_id || !args.item_id || !args.emails) return { content: [{ type: 'text', text: 'drive_id, item_id, and emails are required' }], isError: true };
    const recipients = (args.emails as string).split(',').map((e: string) => ({ email: e.trim() }));
    const body: Record<string, unknown> = {
      requireSignIn: true,
      sendInvitation: true,
      roles: [(args.roles as string) || 'read'],
      recipients,
    };
    if (args.message) body.message = args.message;
    return this.graphPost(`/drives/${encodeURIComponent(args.drive_id as string)}/items/${encodeURIComponent(args.item_id as string)}/invite`, body);
  }

  private async listSites(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = { $top: String((args.top as number) ?? 25) };
    if (args.search) params.search = args.search as string;
    return this.graphGet('/sites', params);
  }

  private async getSite(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.site_id) return { content: [{ type: 'text', text: 'site_id is required' }], isError: true };
    return this.graphGet(`/sites/${encodeURIComponent(args.site_id as string)}`);
  }

  private async searchSites(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.query) return { content: [{ type: 'text', text: 'query is required' }], isError: true };
    return this.graphGet(`/sites?search=${encodeURIComponent(args.query as string)}`);
  }

  private async listSiteLists(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.site_id) return { content: [{ type: 'text', text: 'site_id is required' }], isError: true };
    return this.graphGet(`/sites/${encodeURIComponent(args.site_id as string)}/lists`);
  }

  private async getSiteList(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.site_id || !args.list_id) return { content: [{ type: 'text', text: 'site_id and list_id are required' }], isError: true };
    return this.graphGet(`/sites/${encodeURIComponent(args.site_id as string)}/lists/${encodeURIComponent(args.list_id as string)}`, { expand: 'columns' });
  }

  private async listSiteListItems(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.site_id || !args.list_id) return { content: [{ type: 'text', text: 'site_id and list_id are required' }], isError: true };
    const params: Record<string, string> = {
      expand: 'fields',
      $top: String((args.top as number) ?? 50),
    };
    if (args.filter) params['$filter'] = args.filter as string;
    return this.graphGet(`/sites/${encodeURIComponent(args.site_id as string)}/lists/${encodeURIComponent(args.list_id as string)}/items`, params);
  }
}

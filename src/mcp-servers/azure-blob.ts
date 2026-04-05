/**
 * Azure Blob Storage MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/microsoft/mcp (Azure MCP Server — formerly github.com/Azure/azure-mcp)
// Transport: stdio, auth: Entra ID (DefaultAzureCredential). Actively maintained as of 2026-03.
// Azure MCP covers ~8 storage tools: azmcp_storage_account_list, azmcp_storage_account_get,
//   azmcp_storage_blob_container_list, azmcp_storage_blob_container_get,
//   azmcp_storage_blob_container_create, azmcp_storage_blob_list, azmcp_storage_blob_get,
//   azmcp_storage_blob_upload — read/get/list/create/upload only. No delete, no metadata write,
//   no copy, no snapshot, no blob tags operations.
// Our adapter covers: 14 tools (container and blob CRUD + metadata + copy + snapshot + tags).
// Recommendation: use-both — Azure MCP covers 8 read/create tools; our REST adapter adds
//   delete_container, set_container_metadata, delete_blob, set_blob_metadata, copy_blob,
//   snapshot_blob, list_blob_tags which the MCP does not expose. Use Azure MCP for reads;
//   use this adapter for write/delete/metadata/copy/snapshot operations.
//
// Integration: use-both
// MCP-sourced tools (8): azmcp_storage_account_list, azmcp_storage_account_get,
//   azmcp_storage_blob_container_list, azmcp_storage_blob_container_get,
//   azmcp_storage_blob_container_create, azmcp_storage_blob_list, azmcp_storage_blob_get,
//   azmcp_storage_blob_upload
// REST-sourced tools (14): list_containers, create_container, delete_container,
//   get_container_properties, set_container_metadata, list_blobs, put_blob, get_blob,
//   delete_blob, get_blob_properties, set_blob_metadata, copy_blob, snapshot_blob, list_blob_tags
// Combined coverage: Azure MCP read/create + REST delete/metadata/copy/snapshot/tags
//
// Base URL: https://{accountName}.blob.core.windows.net
// Auth: OAuth 2.0 Bearer token (Microsoft Entra ID / Azure AD). Requires tenantId, clientId,
//       clientSecret. Token endpoint: https://login.microsoftonline.com/{tenantId}/oauth2/v2.0/token
//       Required headers: Authorization: Bearer {token}, x-ms-version: 2020-10-02, x-ms-date (UTC)
// Docs: https://learn.microsoft.com/en-us/rest/api/storageservices/blob-service-rest-api
// Rate limits: Ingress/egress bandwidth and IOPS quotas vary by storage account tier.
//              General Purpose v2: up to 20,000 IOPS, 20 Gbps ingress, 30 Gbps egress (LRS).
//              HTTP 503 (Server Busy) or 429 returned when throttled — exponential backoff recommended.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface AzureBlobConfig {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  accountName: string;
  baseUrl?: string;
}

export class AzureBlobMCPServer extends MCPAdapterBase {
  private readonly tenantId: string;
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly baseUrl: string;

  private bearerToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(config: AzureBlobConfig) {
    super();
    this.tenantId = config.tenantId;
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.baseUrl = config.baseUrl || `https://${config.accountName}.blob.core.windows.net`;
  }

  static catalog() {
    return {
      name: 'azure-blob',
      displayName: 'Azure Blob Storage',
      version: '1.0.0',
      category: 'cloud',
      keywords: [
        'azure', 'blob', 'storage', 'microsoft', 'container', 'object storage',
        'cloud storage', 'file', 'upload', 'download', 'bucket', 'enterprise',
        'saas', 'azure storage account', 'entra', 'arm',
      ],
      toolNames: [
        'list_containers',
        'create_container',
        'delete_container',
        'get_container_properties',
        'set_container_metadata',
        'list_blobs',
        'put_blob',
        'get_blob',
        'delete_blob',
        'get_blob_properties',
        'set_blob_metadata',
        'copy_blob',
        'snapshot_blob',
        'list_blob_tags',
      ],
      description: 'Azure Blob Storage management: create and manage containers, upload and download blobs, set metadata and tags, copy and snapshot blobs in enterprise Azure storage accounts.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_containers',
        description: 'List blob containers in the Azure storage account with optional prefix filter and pagination cursor.',
        inputSchema: {
          type: 'object',
          properties: {
            prefix: {
              type: 'string',
              description: 'Filter containers whose names begin with this string.',
            },
            max_results: {
              type: 'number',
              description: 'Maximum number of containers to return per call (default: 100, max: 5000).',
            },
            marker: {
              type: 'string',
              description: 'Pagination marker from a previous response NextMarker element.',
            },
            include_metadata: {
              type: 'boolean',
              description: 'Include container metadata in the response (default: false).',
            },
          },
        },
      },
      {
        name: 'create_container',
        description: 'Create a new blob container in the storage account with optional public access level and metadata.',
        inputSchema: {
          type: 'object',
          properties: {
            container_name: {
              type: 'string',
              description: 'Name for the new container (lowercase, 3-63 chars, letters/numbers/hyphens only).',
            },
            public_access: {
              type: 'string',
              description: 'Public access level: blob (public blob read), container (full public read), or omit for private.',
            },
            metadata: {
              type: 'string',
              description: 'JSON object of key-value metadata to attach to the container (e.g. \'{"project":"invoices","owner":"finance"}\').',
            },
          },
          required: ['container_name'],
        },
      },
      {
        name: 'delete_container',
        description: 'Delete a blob container and all blobs within it. This operation is permanent and cannot be undone unless soft delete is enabled.',
        inputSchema: {
          type: 'object',
          properties: {
            container_name: {
              type: 'string',
              description: 'Name of the container to delete.',
            },
          },
          required: ['container_name'],
        },
      },
      {
        name: 'get_container_properties',
        description: 'Get properties and metadata for a specific blob container including ETag, last modified, public access level, and lease status.',
        inputSchema: {
          type: 'object',
          properties: {
            container_name: {
              type: 'string',
              description: 'Name of the container to inspect.',
            },
          },
          required: ['container_name'],
        },
      },
      {
        name: 'set_container_metadata',
        description: 'Set or replace all metadata on a blob container. Existing metadata is overwritten. Pass an empty object to clear all metadata.',
        inputSchema: {
          type: 'object',
          properties: {
            container_name: {
              type: 'string',
              description: 'Name of the container to update metadata on.',
            },
            metadata: {
              type: 'string',
              description: 'JSON object of key-value metadata pairs to set (e.g. \'{"env":"prod","team":"data"}\').',
            },
          },
          required: ['container_name', 'metadata'],
        },
      },
      {
        name: 'list_blobs',
        description: 'List blobs in a container with optional prefix filter, delimiter for virtual directories, and pagination.',
        inputSchema: {
          type: 'object',
          properties: {
            container_name: {
              type: 'string',
              description: 'Name of the container to list blobs from.',
            },
            prefix: {
              type: 'string',
              description: 'List only blobs whose names begin with this prefix (use "/" delimiter for virtual directories).',
            },
            delimiter: {
              type: 'string',
              description: 'Virtual directory delimiter, typically "/" — causes result to include BlobPrefix elements.',
            },
            max_results: {
              type: 'number',
              description: 'Maximum blobs to return per call (default: 100, max: 5000).',
            },
            marker: {
              type: 'string',
              description: 'Pagination marker from a previous response NextMarker element.',
            },
            include_metadata: {
              type: 'boolean',
              description: 'Include blob metadata in each listed item (default: false).',
            },
            include_snapshots: {
              type: 'boolean',
              description: 'Include blob snapshots in the listing (default: false).',
            },
          },
          required: ['container_name'],
        },
      },
      {
        name: 'put_blob',
        description: 'Upload a blob (file) to a container. For text content send as UTF-8 string. Content-Type defaults to application/octet-stream.',
        inputSchema: {
          type: 'object',
          properties: {
            container_name: {
              type: 'string',
              description: 'Target container name.',
            },
            blob_name: {
              type: 'string',
              description: 'Name (path) for the blob within the container (e.g. "reports/2026/q1.json").',
            },
            content: {
              type: 'string',
              description: 'Content to store as the blob body (text or base64-encoded binary).',
            },
            content_type: {
              type: 'string',
              description: 'MIME type of the blob (default: application/octet-stream, e.g. text/plain, application/json).',
            },
            blob_type: {
              type: 'string',
              description: 'Blob type: BlockBlob (default), AppendBlob, or PageBlob.',
            },
            metadata: {
              type: 'string',
              description: 'JSON object of key-value metadata for the blob (e.g. \'{"source":"api","version":"1"}\').',
            },
          },
          required: ['container_name', 'blob_name', 'content'],
        },
      },
      {
        name: 'get_blob',
        description: 'Download the content and metadata of a blob from a container. Returns the blob content as a text string.',
        inputSchema: {
          type: 'object',
          properties: {
            container_name: {
              type: 'string',
              description: 'Container name containing the blob.',
            },
            blob_name: {
              type: 'string',
              description: 'Name (path) of the blob to download.',
            },
            snapshot: {
              type: 'string',
              description: 'Snapshot DateTime string to retrieve a specific snapshot of the blob.',
            },
          },
          required: ['container_name', 'blob_name'],
        },
      },
      {
        name: 'delete_blob',
        description: 'Delete a blob from a container. Optionally delete all snapshots, only snapshots, or the blob and snapshots together.',
        inputSchema: {
          type: 'object',
          properties: {
            container_name: {
              type: 'string',
              description: 'Container name containing the blob.',
            },
            blob_name: {
              type: 'string',
              description: 'Name of the blob to delete.',
            },
            delete_snapshots: {
              type: 'string',
              description: 'Snapshot deletion policy: include (delete blob + all snapshots), only (delete only snapshots, keep blob).',
            },
          },
          required: ['container_name', 'blob_name'],
        },
      },
      {
        name: 'get_blob_properties',
        description: 'Get blob properties including content type, size, ETag, last modified, metadata, and lease status without downloading the blob content.',
        inputSchema: {
          type: 'object',
          properties: {
            container_name: {
              type: 'string',
              description: 'Container name containing the blob.',
            },
            blob_name: {
              type: 'string',
              description: 'Name of the blob to inspect.',
            },
          },
          required: ['container_name', 'blob_name'],
        },
      },
      {
        name: 'set_blob_metadata',
        description: 'Set or replace all metadata on a blob. Existing metadata is completely overwritten. Pass an empty JSON object to clear all metadata.',
        inputSchema: {
          type: 'object',
          properties: {
            container_name: {
              type: 'string',
              description: 'Container name containing the blob.',
            },
            blob_name: {
              type: 'string',
              description: 'Name of the blob to update metadata on.',
            },
            metadata: {
              type: 'string',
              description: 'JSON object of key-value metadata pairs to set (e.g. \'{"processed":"true","owner":"etl"}\').',
            },
          },
          required: ['container_name', 'blob_name', 'metadata'],
        },
      },
      {
        name: 'copy_blob',
        description: 'Copy a blob from a source URL to a destination name within the storage account. Can copy across containers.',
        inputSchema: {
          type: 'object',
          properties: {
            destination_container: {
              type: 'string',
              description: 'Container name for the destination blob.',
            },
            destination_blob: {
              type: 'string',
              description: 'Name for the destination blob.',
            },
            source_url: {
              type: 'string',
              description: 'Full URL of the source blob (e.g. https://account.blob.core.windows.net/container/blob).',
            },
          },
          required: ['destination_container', 'destination_blob', 'source_url'],
        },
      },
      {
        name: 'snapshot_blob',
        description: 'Create a read-only snapshot of a blob at the current point in time. Returns the snapshot DateTime identifier.',
        inputSchema: {
          type: 'object',
          properties: {
            container_name: {
              type: 'string',
              description: 'Container name containing the blob to snapshot.',
            },
            blob_name: {
              type: 'string',
              description: 'Name of the blob to snapshot.',
            },
            metadata: {
              type: 'string',
              description: 'Optional JSON metadata to attach to the snapshot (e.g. \'{"reason":"pre-migration"}\').',
            },
          },
          required: ['container_name', 'blob_name'],
        },
      },
      {
        name: 'list_blob_tags',
        description: 'Retrieve the index tags set on a specific blob. Tags are key-value pairs used for blob index search and filtering.',
        inputSchema: {
          type: 'object',
          properties: {
            container_name: {
              type: 'string',
              description: 'Container name containing the blob.',
            },
            blob_name: {
              type: 'string',
              description: 'Name of the blob to retrieve tags for.',
            },
          },
          required: ['container_name', 'blob_name'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_containers':
          return this.listContainers(args);
        case 'create_container':
          return this.createContainer(args);
        case 'delete_container':
          return this.deleteContainer(args);
        case 'get_container_properties':
          return this.getContainerProperties(args);
        case 'set_container_metadata':
          return this.setContainerMetadata(args);
        case 'list_blobs':
          return this.listBlobs(args);
        case 'put_blob':
          return this.putBlob(args);
        case 'get_blob':
          return this.getBlob(args);
        case 'delete_blob':
          return this.deleteBlob(args);
        case 'get_blob_properties':
          return this.getBlobProperties(args);
        case 'set_blob_metadata':
          return this.setBlobMetadata(args);
        case 'copy_blob':
          return this.copyBlob(args);
        case 'snapshot_blob':
          return this.snapshotBlob(args);
        case 'list_blob_tags':
          return this.listBlobTags(args);
        default:
          return {
            content: [{ type: 'text', text: `Unknown tool: ${name}` }],
            isError: true,
          };
      }
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Tool execution failed: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true,
      };
    }
  }

  // ── OAuth2 token management ───────────────────────────────────────────────

  private async getOrRefreshToken(): Promise<string> {
    const now = Date.now();
    if (this.bearerToken && this.tokenExpiry > now) {
      return this.bearerToken;
    }

    const tokenUrl = `https://login.microsoftonline.com/${this.tenantId}/oauth2/v2.0/token`;
    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: this.clientId,
      client_secret: this.clientSecret,
      scope: 'https://storage.azure.com/.default',
    });

    const response = await this.fetchWithRetry(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!response.ok) {
      throw new Error(`Azure OAuth2 token request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as { access_token: string; expires_in: number };
    this.bearerToken = data.access_token;
    this.tokenExpiry = now + (data.expires_in - 60) * 1000;
    return this.bearerToken;
  }

  private async getHeaders(extraHeaders?: Record<string, string>): Promise<Record<string, string>> {
    const token = await this.getOrRefreshToken();
    return {
      Authorization: `Bearer ${token}`,
      'x-ms-version': '2020-10-02',
      'x-ms-date': new Date().toUTCString(),
      ...extraHeaders,
    };
  }

  // ── HTTP helpers ──────────────────────────────────────────────────────────

  private async blobRequest(
    method: string,
    path: string,
    queryParams?: Record<string, string>,
    headers?: Record<string, string>,
    body?: string,
  ): Promise<ToolResult> {
    const qs = queryParams && Object.keys(queryParams).length > 0
      ? '?' + new URLSearchParams(queryParams).toString()
      : '';
    const url = `${this.baseUrl}/${path}${qs}`;
    const authHeaders = await this.getHeaders(headers);
    if (body !== undefined) {
      authHeaders['Content-Length'] = String(Buffer.byteLength(body, 'utf8'));
    }

    const response = await this.fetchWithRetry(url, {
      method,
      headers: authHeaders,
      body: body !== undefined ? body : undefined,
    });

    // 204 No Content — success with no body
    if (response.status === 204 || response.status === 201) {
      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => { responseHeaders[key] = value; });
      return {
        content: [{ type: 'text', text: JSON.stringify({ success: true, status: response.status, headers: responseHeaders }, null, 2) }],
        isError: false,
      };
    }

    if (!response.ok) {
      let errText = '';
      try { errText = await response.text(); } catch { /* ignore */ }
      return {
        content: [{ type: 'text', text: `API error ${response.status} ${response.statusText}: ${errText}` }],
        isError: true,
      };
    }

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('xml') || contentType.includes('text/')) {
      const text = await response.text();
      return { content: [{ type: 'text', text: this.truncate(text) }], isError: false };
    }

    let data: unknown;
    try { data = await response.json(); } catch { data = await response.text(); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  // ── Container operations ──────────────────────────────────────────────────

  private async listContainers(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = { comp: 'list' };
    if (args.prefix) params['prefix'] = args.prefix as string;
    if (args.max_results) params['maxresults'] = String(args.max_results);
    if (args.marker) params['marker'] = args.marker as string;
    if (args.include_metadata) params['include'] = 'metadata';
    return this.blobRequest('GET', '', params);
  }

  private async createContainer(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.container_name) {
      return { content: [{ type: 'text', text: 'container_name is required' }], isError: true };
    }
    const extraHeaders: Record<string, string> = {};
    if (args.public_access) extraHeaders['x-ms-blob-public-access'] = args.public_access as string;
    if (args.metadata) {
      try {
        const meta = JSON.parse(args.metadata as string) as Record<string, string>;
        for (const [k, v] of Object.entries(meta)) {
          extraHeaders[`x-ms-meta-${k}`] = v;
        }
      } catch {
        return { content: [{ type: 'text', text: 'metadata must be valid JSON object' }], isError: true };
      }
    }
    return this.blobRequest('PUT', `${encodeURIComponent(args.container_name as string)}`, { restype: 'container' }, extraHeaders);
  }

  private async deleteContainer(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.container_name) {
      return { content: [{ type: 'text', text: 'container_name is required' }], isError: true };
    }
    return this.blobRequest('DELETE', `${encodeURIComponent(args.container_name as string)}`, { restype: 'container' });
  }

  private async getContainerProperties(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.container_name) {
      return { content: [{ type: 'text', text: 'container_name is required' }], isError: true };
    }
    return this.blobRequest('HEAD', `${encodeURIComponent(args.container_name as string)}`, { restype: 'container' });
  }

  private async setContainerMetadata(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.container_name || !args.metadata) {
      return { content: [{ type: 'text', text: 'container_name and metadata are required' }], isError: true };
    }
    const extraHeaders: Record<string, string> = {};
    try {
      const meta = JSON.parse(args.metadata as string) as Record<string, string>;
      for (const [k, v] of Object.entries(meta)) {
        extraHeaders[`x-ms-meta-${k}`] = v;
      }
    } catch {
      return { content: [{ type: 'text', text: 'metadata must be valid JSON object' }], isError: true };
    }
    return this.blobRequest('PUT', `${encodeURIComponent(args.container_name as string)}`, { restype: 'container', comp: 'metadata' }, extraHeaders);
  }

  // ── Blob operations ───────────────────────────────────────────────────────

  private async listBlobs(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.container_name) {
      return { content: [{ type: 'text', text: 'container_name is required' }], isError: true };
    }
    const params: Record<string, string> = { restype: 'container', comp: 'list' };
    if (args.prefix) params['prefix'] = args.prefix as string;
    if (args.delimiter) params['delimiter'] = args.delimiter as string;
    if (args.max_results) params['maxresults'] = String(args.max_results);
    if (args.marker) params['marker'] = args.marker as string;
    const includes: string[] = [];
    if (args.include_metadata) includes.push('metadata');
    if (args.include_snapshots) includes.push('snapshots');
    if (includes.length > 0) params['include'] = includes.join(',');
    return this.blobRequest('GET', `${encodeURIComponent(args.container_name as string)}`, params);
  }

  private async putBlob(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.container_name || !args.blob_name || args.content === undefined) {
      return { content: [{ type: 'text', text: 'container_name, blob_name, and content are required' }], isError: true };
    }
    const extraHeaders: Record<string, string> = {
      'x-ms-blob-type': (args.blob_type as string) || 'BlockBlob',
      'Content-Type': (args.content_type as string) || 'application/octet-stream',
    };
    if (args.metadata) {
      try {
        const meta = JSON.parse(args.metadata as string) as Record<string, string>;
        for (const [k, v] of Object.entries(meta)) {
          extraHeaders[`x-ms-meta-${k}`] = v;
        }
      } catch {
        return { content: [{ type: 'text', text: 'metadata must be valid JSON object' }], isError: true };
      }
    }
    return this.blobRequest(
      'PUT',
      `${encodeURIComponent(args.container_name as string)}/${encodeURIComponent(args.blob_name as string)}`,
      {},
      extraHeaders,
      args.content as string,
    );
  }

  private async getBlob(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.container_name || !args.blob_name) {
      return { content: [{ type: 'text', text: 'container_name and blob_name are required' }], isError: true };
    }
    const params: Record<string, string> = {};
    if (args.snapshot) params['snapshot'] = args.snapshot as string;
    return this.blobRequest('GET', `${encodeURIComponent(args.container_name as string)}/${encodeURIComponent(args.blob_name as string)}`, params);
  }

  private async deleteBlob(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.container_name || !args.blob_name) {
      return { content: [{ type: 'text', text: 'container_name and blob_name are required' }], isError: true };
    }
    const extraHeaders: Record<string, string> = {};
    if (args.delete_snapshots) extraHeaders['x-ms-delete-snapshots'] = args.delete_snapshots as string;
    return this.blobRequest('DELETE', `${encodeURIComponent(args.container_name as string)}/${encodeURIComponent(args.blob_name as string)}`, {}, extraHeaders);
  }

  private async getBlobProperties(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.container_name || !args.blob_name) {
      return { content: [{ type: 'text', text: 'container_name and blob_name are required' }], isError: true };
    }
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/${encodeURIComponent(args.container_name as string)}/${encodeURIComponent(args.blob_name as string)}`,
      { method: 'HEAD', headers: await this.getHeaders() },
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error ${response.status} ${response.statusText}` }], isError: true };
    }
    const props: Record<string, string> = {};
    response.headers.forEach((value, key) => { props[key] = value; });
    return {
      content: [{ type: 'text', text: JSON.stringify(props, null, 2) }],
      isError: false,
    };
  }

  private async setBlobMetadata(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.container_name || !args.blob_name || !args.metadata) {
      return { content: [{ type: 'text', text: 'container_name, blob_name, and metadata are required' }], isError: true };
    }
    const extraHeaders: Record<string, string> = {};
    try {
      const meta = JSON.parse(args.metadata as string) as Record<string, string>;
      for (const [k, v] of Object.entries(meta)) {
        extraHeaders[`x-ms-meta-${k}`] = v;
      }
    } catch {
      return { content: [{ type: 'text', text: 'metadata must be valid JSON object' }], isError: true };
    }
    return this.blobRequest(
      'PUT',
      `${encodeURIComponent(args.container_name as string)}/${encodeURIComponent(args.blob_name as string)}`,
      { comp: 'metadata' },
      extraHeaders,
    );
  }

  private async copyBlob(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.destination_container || !args.destination_blob || !args.source_url) {
      return { content: [{ type: 'text', text: 'destination_container, destination_blob, and source_url are required' }], isError: true };
    }
    const extraHeaders: Record<string, string> = {
      'x-ms-copy-source': args.source_url as string,
    };
    return this.blobRequest(
      'PUT',
      `${encodeURIComponent(args.destination_container as string)}/${encodeURIComponent(args.destination_blob as string)}`,
      {},
      extraHeaders,
    );
  }

  private async snapshotBlob(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.container_name || !args.blob_name) {
      return { content: [{ type: 'text', text: 'container_name and blob_name are required' }], isError: true };
    }
    const extraHeaders: Record<string, string> = {};
    if (args.metadata) {
      try {
        const meta = JSON.parse(args.metadata as string) as Record<string, string>;
        for (const [k, v] of Object.entries(meta)) {
          extraHeaders[`x-ms-meta-${k}`] = v;
        }
      } catch {
        return { content: [{ type: 'text', text: 'metadata must be valid JSON object' }], isError: true };
      }
    }
    return this.blobRequest(
      'PUT',
      `${encodeURIComponent(args.container_name as string)}/${encodeURIComponent(args.blob_name as string)}`,
      { comp: 'snapshot' },
      extraHeaders,
    );
  }

  private async listBlobTags(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.container_name || !args.blob_name) {
      return { content: [{ type: 'text', text: 'container_name and blob_name are required' }], isError: true };
    }
    return this.blobRequest(
      'GET',
      `${encodeURIComponent(args.container_name as string)}/${encodeURIComponent(args.blob_name as string)}`,
      { comp: 'tags' },
    );
  }
}

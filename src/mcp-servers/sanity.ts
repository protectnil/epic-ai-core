/**
 * Sanity MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://mcp.sanity.io — transport: streamable-HTTP, auth: OAuth2 or API token
// Vendor MCP covers: 40+ tools (documents, schema, releases, media, project management).
// Our adapter covers: 14 tools (GROQ queries, document CRUD, asset management, schema inspection).
// Recommendation: Use vendor MCP at mcp.sanity.io for full coverage (40+ tools, always up-to-date).
//                 Use this adapter for air-gapped or token-only deployments.
//
// Base URL: https://{projectId}.api.sanity.io/v2021-06-07
// Auth: Bearer token (project token or global user token) in Authorization header
// Docs: https://www.sanity.io/docs/http-reference
// Rate limits: Not publicly documented; 429 responses on exceeded limits

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface SanityConfig {
  projectId: string;
  dataset: string;
  apiToken: string;
  apiVersion?: string;
  useCdn?: boolean;
}

export class SanityMCPServer extends MCPAdapterBase {
  private readonly projectId: string;
  private readonly dataset: string;
  private readonly apiToken: string;
  private readonly apiVersion: string;
  private readonly useCdn: boolean;

  constructor(config: SanityConfig) {
    super();
    this.projectId = config.projectId;
    this.dataset = config.dataset;
    this.apiToken = config.apiToken;
    this.apiVersion = config.apiVersion || 'v2021-06-07';
    this.useCdn = config.useCdn ?? false;
  }

  static catalog() {
    return {
      name: 'sanity',
      displayName: 'Sanity',
      version: '1.0.0',
      category: 'misc',
      keywords: ['sanity', 'cms', 'content', 'headless', 'groq', 'document', 'schema', 'studio', 'structured content', 'content management'],
      toolNames: [
        'query_documents', 'get_document', 'create_document', 'update_document', 'delete_document',
        'patch_document', 'create_or_replace_document',
        'list_document_types', 'get_schema',
        'upload_asset', 'list_assets', 'delete_asset',
        'list_datasets', 'get_project_info',
      ],
      description: 'Sanity CMS: run GROQ queries, manage documents, inspect schemas, handle assets, and administer datasets.',
      author: 'protectnil',
    };
  }

  private get baseUrl(): string {
    const host = this.useCdn
      ? `${this.projectId}.apicdn.sanity.io`
      : `${this.projectId}.api.sanity.io`;
    return `https://${host}/${this.apiVersion}`;
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'query_documents',
        description: 'Run a GROQ query against the Sanity dataset to retrieve documents with optional parameters',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'GROQ query string (e.g. *[_type == "post"] | order(publishedAt desc)[0..9])',
            },
            params: {
              type: 'object',
              description: 'Query parameters object for parameterized GROQ queries (e.g. {"slug": "my-post"})',
            },
            dataset: {
              type: 'string',
              description: 'Dataset to query (default: configured dataset)',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'get_document',
        description: 'Get a specific Sanity document by its document ID (_id field)',
        inputSchema: {
          type: 'object',
          properties: {
            document_id: {
              type: 'string',
              description: 'Sanity document ID (e.g. drafts.abc123 or abc123)',
            },
            dataset: {
              type: 'string',
              description: 'Dataset to query (default: configured dataset)',
            },
          },
          required: ['document_id'],
        },
      },
      {
        name: 'create_document',
        description: 'Create a new document in the Sanity dataset with the given type and fields',
        inputSchema: {
          type: 'object',
          properties: {
            document: {
              type: 'object',
              description: 'Document object with at least _type field (e.g. {"_type": "post", "title": "Hello"})',
            },
            dataset: {
              type: 'string',
              description: 'Dataset to create the document in (default: configured dataset)',
            },
          },
          required: ['document'],
        },
      },
      {
        name: 'update_document',
        description: 'Replace an existing Sanity document with a new version by document ID',
        inputSchema: {
          type: 'object',
          properties: {
            document_id: {
              type: 'string',
              description: 'ID of the document to replace',
            },
            document: {
              type: 'object',
              description: 'Complete replacement document including _type and all fields',
            },
            dataset: {
              type: 'string',
              description: 'Dataset containing the document (default: configured dataset)',
            },
          },
          required: ['document_id', 'document'],
        },
      },
      {
        name: 'delete_document',
        description: 'Delete a Sanity document by its document ID from the dataset',
        inputSchema: {
          type: 'object',
          properties: {
            document_id: {
              type: 'string',
              description: 'ID of the document to delete',
            },
            dataset: {
              type: 'string',
              description: 'Dataset containing the document (default: configured dataset)',
            },
          },
          required: ['document_id'],
        },
      },
      {
        name: 'patch_document',
        description: 'Partially update a Sanity document by setting specific fields without replacing the whole document',
        inputSchema: {
          type: 'object',
          properties: {
            document_id: {
              type: 'string',
              description: 'ID of the document to patch',
            },
            set: {
              type: 'object',
              description: 'Fields to set/update (e.g. {"title": "New Title", "status": "published"})',
            },
            unset: {
              type: 'array',
              description: 'Array of field paths to remove from the document',
            },
            dataset: {
              type: 'string',
              description: 'Dataset containing the document (default: configured dataset)',
            },
          },
          required: ['document_id'],
        },
      },
      {
        name: 'create_or_replace_document',
        description: 'Create a document or fully replace it if a document with the same ID already exists',
        inputSchema: {
          type: 'object',
          properties: {
            document: {
              type: 'object',
              description: 'Document with _id and _type to create or replace (must include _id for upsert behavior)',
            },
            dataset: {
              type: 'string',
              description: 'Dataset to target (default: configured dataset)',
            },
          },
          required: ['document'],
        },
      },
      {
        name: 'list_document_types',
        description: 'List all document types (_type values) used in the Sanity dataset via GROQ introspection',
        inputSchema: {
          type: 'object',
          properties: {
            dataset: {
              type: 'string',
              description: 'Dataset to inspect (default: configured dataset)',
            },
          },
        },
      },
      {
        name: 'get_schema',
        description: 'Retrieve the schema definition for the Sanity project to understand document types and field structures',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'upload_asset',
        description: 'Upload an image or file asset to the Sanity media library by URL or base64 content',
        inputSchema: {
          type: 'object',
          properties: {
            asset_type: {
              type: 'string',
              description: 'Asset type: image or file (default: image)',
            },
            url: {
              type: 'string',
              description: 'Public URL to fetch and upload as asset',
            },
            filename: {
              type: 'string',
              description: 'Original filename for the asset (e.g. photo.jpg)',
            },
            dataset: {
              type: 'string',
              description: 'Dataset to upload to (default: configured dataset)',
            },
          },
          required: ['url'],
        },
      },
      {
        name: 'list_assets',
        description: 'List image and file assets in the Sanity dataset with optional type and pagination filters',
        inputSchema: {
          type: 'object',
          properties: {
            asset_type: {
              type: 'string',
              description: 'Asset type to list: sanity.imageAsset or sanity.fileAsset (default: sanity.imageAsset)',
            },
            limit: {
              type: 'number',
              description: 'Maximum results to return (default: 50)',
            },
            offset: {
              type: 'number',
              description: 'Offset for pagination (default: 0)',
            },
            dataset: {
              type: 'string',
              description: 'Dataset to query (default: configured dataset)',
            },
          },
        },
      },
      {
        name: 'delete_asset',
        description: 'Delete an image or file asset from the Sanity media library by asset ID',
        inputSchema: {
          type: 'object',
          properties: {
            asset_id: {
              type: 'string',
              description: 'Asset document ID (e.g. image-abc123-jpg)',
            },
            dataset: {
              type: 'string',
              description: 'Dataset containing the asset (default: configured dataset)',
            },
          },
          required: ['asset_id'],
        },
      },
      {
        name: 'list_datasets',
        description: 'List all datasets in the Sanity project with their names and modes (public/private)',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_project_info',
        description: 'Get project metadata including name, plan, members count, and studioHost for the Sanity project',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'query_documents':
          return this.queryDocuments(args);
        case 'get_document':
          return this.getDocument(args);
        case 'create_document':
          return this.createDocument(args);
        case 'update_document':
          return this.updateDocument(args);
        case 'delete_document':
          return this.deleteDocument(args);
        case 'patch_document':
          return this.patchDocument(args);
        case 'create_or_replace_document':
          return this.createOrReplaceDocument(args);
        case 'list_document_types':
          return this.listDocumentTypes(args);
        case 'get_schema':
          return this.getSchema();
        case 'upload_asset':
          return this.uploadAsset(args);
        case 'list_assets':
          return this.listAssets(args);
        case 'delete_asset':
          return this.deleteAsset(args);
        case 'list_datasets':
          return this.listDatasets();
        case 'get_project_info':
          return this.getProjectInfo();
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
      'Authorization': `Bearer ${this.apiToken}`,
      'Content-Type': 'application/json',
    };
  }

  private resolveDataset(args: Record<string, unknown>): string {
    return (args.dataset as string) || this.dataset;
  }

  private async queryDocuments(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.query) return { content: [{ type: 'text', text: 'query is required' }], isError: true };
    const ds = this.resolveDataset(args);
    const params = new URLSearchParams({ query: args.query as string });
    if (args.params && typeof args.params === 'object') {
      for (const [k, v] of Object.entries(args.params as Record<string, unknown>)) {
        params.set(`$${k}`, JSON.stringify(v));
      }
    }
    const response = await this.fetchWithRetry(`${this.baseUrl}/data/query/${ds}?${params.toString()}`, { headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getDocument(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.document_id) return { content: [{ type: 'text', text: 'document_id is required' }], isError: true };
    const ds = this.resolveDataset(args);
    const response = await this.fetchWithRetry(`${this.baseUrl}/data/doc/${ds}/${encodeURIComponent(args.document_id as string)}`, { headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async mutate(ds: string, mutations: unknown[]): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}/data/mutate/${ds}`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({ mutations }),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async createDocument(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.document) return { content: [{ type: 'text', text: 'document is required' }], isError: true };
    const ds = this.resolveDataset(args);
    return this.mutate(ds, [{ create: args.document }]);
  }

  private async updateDocument(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.document_id || !args.document) return { content: [{ type: 'text', text: 'document_id and document are required' }], isError: true };
    const ds = this.resolveDataset(args);
    const doc = { ...(args.document as Record<string, unknown>), _id: args.document_id };
    return this.mutate(ds, [{ createOrReplace: doc }]);
  }

  private async deleteDocument(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.document_id) return { content: [{ type: 'text', text: 'document_id is required' }], isError: true };
    const ds = this.resolveDataset(args);
    return this.mutate(ds, [{ delete: { id: args.document_id } }]);
  }

  private async patchDocument(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.document_id) return { content: [{ type: 'text', text: 'document_id is required' }], isError: true };
    const ds = this.resolveDataset(args);
    const patch: Record<string, unknown> = { id: args.document_id };
    if (args.set) patch.set = args.set;
    if (args.unset) patch.unset = args.unset;
    return this.mutate(ds, [{ patch }]);
  }

  private async createOrReplaceDocument(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.document) return { content: [{ type: 'text', text: 'document is required' }], isError: true };
    const ds = this.resolveDataset(args);
    return this.mutate(ds, [{ createOrReplace: args.document }]);
  }

  private async listDocumentTypes(args: Record<string, unknown>): Promise<ToolResult> {
    const ds = this.resolveDataset(args);
    const params = new URLSearchParams({ query: 'array::unique(*[]._type)' });
    const response = await this.fetchWithRetry(`${this.baseUrl}/data/query/${ds}?${params.toString()}`, { headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getSchema(): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`https://api.sanity.io/${this.apiVersion}/projects/${this.projectId}/schema`, { headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async uploadAsset(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.url) return { content: [{ type: 'text', text: 'url is required' }], isError: true };
    const ds = this.resolveDataset(args);
    const assetType = (args.asset_type as string) || 'image';
    const params = new URLSearchParams();
    if (args.filename) params.set('filename', args.filename as string);
    const fetchRes = await this.fetchWithRetry(args.url as string, {});
    if (!fetchRes.ok) {
      return { content: [{ type: 'text', text: `Failed to fetch asset from URL: ${fetchRes.status}` }], isError: true };
    }
    const contentType = fetchRes.headers.get('content-type') || 'application/octet-stream';
    const assetBuffer = await fetchRes.arrayBuffer();
    const uploadUrl = `${this.baseUrl}/assets/${assetType}s/${ds}${params.toString() ? '?' + params.toString() : ''}`;
    const response = await this.fetchWithRetry(uploadUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiToken}`,
        'Content-Type': contentType,
      },
      body: assetBuffer,
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listAssets(args: Record<string, unknown>): Promise<ToolResult> {
    const ds = this.resolveDataset(args);
    const assetType = (args.asset_type as string) || 'sanity.imageAsset';
    const limit = (args.limit as number) || 50;
    const offset = (args.offset as number) || 0;
    const query = `*[_type == "${assetType}"] | order(_createdAt desc) [${offset}..${offset + limit - 1}]`;
    const params = new URLSearchParams({ query });
    const response = await this.fetchWithRetry(`${this.baseUrl}/data/query/${ds}?${params.toString()}`, { headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async deleteAsset(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.asset_id) return { content: [{ type: 'text', text: 'asset_id is required' }], isError: true };
    const ds = this.resolveDataset(args);
    return this.mutate(ds, [{ delete: { id: args.asset_id } }]);
  }

  private async listDatasets(): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`https://api.sanity.io/${this.apiVersion}/projects/${this.projectId}/datasets`, { headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getProjectInfo(): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`https://api.sanity.io/${this.apiVersion}/projects/${this.projectId}`, { headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }
}

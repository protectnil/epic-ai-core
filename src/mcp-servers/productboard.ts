/**
 * Productboard MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03.
//   No official Productboard-vendor MCP server exists on GitHub or developer.productboard.com.
//   Community/third-party servers (e.g., Enreign/productboard-mcp) are not officially maintained.
//
// Base URL: https://api.productboard.com
// Auth: Bearer token via Authorization header — generate a Personal API Access Token from
//   Workspace Settings → Integrations → Public API.
//   API v1 requires X-Version: 1 header on all requests.
// Docs: https://developer.productboard.com/reference/introduction
// Rate limits: Not formally documented; implement backoff on 429 responses

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface ProductboardConfig {
  apiToken: string;
  baseUrl?: string;
}

export class ProductboardMCPServer extends MCPAdapterBase {
  private readonly apiToken: string;
  private readonly baseUrl: string;

  constructor(config: ProductboardConfig) {
    super();
    this.apiToken = config.apiToken;
    this.baseUrl = (config.baseUrl ?? 'https://api.productboard.com').replace(/\/$/, '');
  }

  static catalog() {
    return {
      name: 'productboard',
      displayName: 'Productboard',
      version: '1.0.0',
      category: 'misc' as const,
      keywords: ['productboard', 'product-management', 'roadmap', 'feature', 'feedback', 'note', 'initiative', 'objective', 'release', 'component', 'product'],
      toolNames: [
        'list_features', 'get_feature', 'create_feature', 'update_feature',
        'list_notes', 'create_note',
        'list_products', 'list_components',
        'list_releases', 'get_release', 'create_release', 'update_release',
        'list_objectives', 'get_objective',
        'list_initiatives', 'get_initiative',
        'list_feature_objectives', 'link_feature_to_initiative',
      ],
      description: 'Product management: manage features, customer feedback notes, releases, initiatives, objectives, and the product hierarchy in Productboard.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_features',
        description: 'List features from the product hierarchy with optional filters for status, product, or component. Returns paginated results.',
        inputSchema: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              description: 'Filter by feature status name (e.g. "In progress", "Candidate", "Done")',
            },
            productId: {
              type: 'string',
              description: 'Filter features belonging to a specific product by its ID',
            },
            componentId: {
              type: 'string',
              description: 'Filter features belonging to a specific component by its ID',
            },
            pageLimit: {
              type: 'number',
              description: 'Maximum features per page (default: 100)',
            },
          },
        },
      },
      {
        name: 'get_feature',
        description: 'Get full details for a single Productboard feature including status, description, and hierarchy',
        inputSchema: {
          type: 'object',
          properties: {
            featureId: {
              type: 'string',
              description: 'The Productboard feature ID',
            },
          },
          required: ['featureId'],
        },
      },
      {
        name: 'create_feature',
        description: 'Create a new feature in Productboard with name, optional description, status, and parent component or product',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Name of the feature',
            },
            description: {
              type: 'string',
              description: 'HTML or plain-text description of the feature (optional)',
            },
            status: {
              type: 'object',
              description: 'Status object with a name field, e.g. {"name": "Candidate"}',
            },
            parent: {
              type: 'object',
              description: 'Parent hierarchy entity with id and type fields, e.g. {"id": "...", "type": "component"}',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'update_feature',
        description: 'Update an existing Productboard feature — change its name, description, or status',
        inputSchema: {
          type: 'object',
          properties: {
            featureId: {
              type: 'string',
              description: 'The Productboard feature ID to update',
            },
            name: {
              type: 'string',
              description: 'New name for the feature (optional)',
            },
            description: {
              type: 'string',
              description: 'New description for the feature (optional)',
            },
            status: {
              type: 'object',
              description: 'New status object with a name field, e.g. {"name": "In progress"} (optional)',
            },
          },
          required: ['featureId'],
        },
      },
      {
        name: 'list_notes',
        description: 'List customer feedback notes in Productboard, optionally filtered by linked feature',
        inputSchema: {
          type: 'object',
          properties: {
            featureId: {
              type: 'string',
              description: 'Filter notes linked to a specific feature ID (optional)',
            },
            pageLimit: {
              type: 'number',
              description: 'Maximum notes per page (default: 100)',
            },
          },
        },
      },
      {
        name: 'create_note',
        description: 'Create a customer feedback note in Productboard and optionally link it to features or a company',
        inputSchema: {
          type: 'object',
          properties: {
            title: {
              type: 'string',
              description: 'Title of the feedback note',
            },
            content: {
              type: 'string',
              description: 'Content body of the note (plain text or HTML)',
            },
            customerEmail: {
              type: 'string',
              description: 'Email of the customer who provided the feedback (optional)',
            },
            companyName: {
              type: 'string',
              description: 'Company name associated with the feedback (optional)',
            },
            featureIds: {
              type: 'array',
              description: 'Array of feature IDs to link this note to (optional)',
              items: { type: 'string' },
            },
            tags: {
              type: 'array',
              description: 'Array of tag strings to apply to the note (optional)',
              items: { type: 'string' },
            },
          },
          required: ['title', 'content'],
        },
      },
      {
        name: 'list_products',
        description: 'List all products in the Productboard workspace hierarchy',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'list_components',
        description: 'List components in Productboard, optionally filtered by parent product ID',
        inputSchema: {
          type: 'object',
          properties: {
            productId: {
              type: 'string',
              description: 'Filter components belonging to a specific product (optional)',
            },
          },
        },
      },
      {
        name: 'list_releases',
        description: 'List all releases defined in Productboard with their dates and associated features',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_release',
        description: 'Get full details for a specific Productboard release',
        inputSchema: {
          type: 'object',
          properties: {
            releaseId: {
              type: 'string',
              description: 'The Productboard release ID',
            },
          },
          required: ['releaseId'],
        },
      },
      {
        name: 'create_release',
        description: 'Create a new release in Productboard with a name and optional release date',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Name of the release',
            },
            releaseDate: {
              type: 'string',
              description: 'Planned release date in ISO 8601 format (e.g. 2026-06-30) — optional',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'update_release',
        description: 'Update an existing Productboard release name or release date',
        inputSchema: {
          type: 'object',
          properties: {
            releaseId: {
              type: 'string',
              description: 'The Productboard release ID to update',
            },
            name: {
              type: 'string',
              description: 'New name for the release (optional)',
            },
            releaseDate: {
              type: 'string',
              description: 'New release date in ISO 8601 format (optional)',
            },
          },
          required: ['releaseId'],
        },
      },
      {
        name: 'list_objectives',
        description: 'List all objectives in Productboard with pagination (100 per page by default)',
        inputSchema: {
          type: 'object',
          properties: {
            pageOffset: {
              type: 'number',
              description: 'Pagination offset for fetching subsequent pages (optional)',
            },
          },
        },
      },
      {
        name: 'get_objective',
        description: 'Get full details for a specific Productboard objective',
        inputSchema: {
          type: 'object',
          properties: {
            objectiveId: {
              type: 'string',
              description: 'The Productboard objective ID',
            },
          },
          required: ['objectiveId'],
        },
      },
      {
        name: 'list_initiatives',
        description: 'List all initiatives in Productboard with pagination (100 per page by default)',
        inputSchema: {
          type: 'object',
          properties: {
            pageOffset: {
              type: 'number',
              description: 'Pagination offset for fetching subsequent pages (optional)',
            },
          },
        },
      },
      {
        name: 'get_initiative',
        description: 'Get full details for a specific Productboard initiative',
        inputSchema: {
          type: 'object',
          properties: {
            initiativeId: {
              type: 'string',
              description: 'The Productboard initiative ID',
            },
          },
          required: ['initiativeId'],
        },
      },
      {
        name: 'list_feature_objectives',
        description: 'List all objectives linked to a specific feature in Productboard',
        inputSchema: {
          type: 'object',
          properties: {
            featureId: {
              type: 'string',
              description: 'The Productboard feature ID to list linked objectives for',
            },
          },
          required: ['featureId'],
        },
      },
      {
        name: 'link_feature_to_initiative',
        description: 'Create a link between a Productboard feature and an initiative',
        inputSchema: {
          type: 'object',
          properties: {
            featureId: {
              type: 'string',
              description: 'The Productboard feature ID',
            },
            initiativeId: {
              type: 'string',
              description: 'The Productboard initiative ID to link the feature to',
            },
          },
          required: ['featureId', 'initiativeId'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_features':
          return await this.listFeatures(args);
        case 'get_feature':
          return await this.getFeature(args);
        case 'create_feature':
          return await this.createFeature(args);
        case 'update_feature':
          return await this.updateFeature(args);
        case 'list_notes':
          return await this.listNotes(args);
        case 'create_note':
          return await this.createNote(args);
        case 'list_products':
          return await this.listProducts();
        case 'list_components':
          return await this.listComponents(args);
        case 'list_releases':
          return await this.listReleases();
        case 'get_release':
          return await this.getRelease(args);
        case 'create_release':
          return await this.createRelease(args);
        case 'update_release':
          return await this.updateRelease(args);
        case 'list_objectives':
          return await this.listObjectives(args);
        case 'get_objective':
          return await this.getObjective(args);
        case 'list_initiatives':
          return await this.listInitiatives(args);
        case 'get_initiative':
          return await this.getInitiative(args);
        case 'list_feature_objectives':
          return await this.listFeatureObjectives(args);
        case 'link_feature_to_initiative':
          return await this.linkFeatureToInitiative(args);
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

  private get reqHeaders(): Record<string, string> {
    return {
      'Authorization': `Bearer ${this.apiToken}`,
      'Content-Type': 'application/json',
      'X-Version': '1',
    };
  }

  private async doFetch(url: string, options?: RequestInit): Promise<ToolResult> {
    const response = await this.fetchWithRetry(url, { headers: this.reqHeaders, ...options });
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      return {
        content: [{ type: 'text', text: `Productboard API error: ${response.status} ${response.statusText}${body ? ` — ${body.slice(0, 500)}` : ''}` }],
        isError: true,
      };
    }
    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new Error(`Productboard returned non-JSON response (HTTP ${response.status})`);
    }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listFeatures(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.status) params.append('status.name', args.status as string);
    if (args.productId) params.append('productId', args.productId as string);
    if (args.componentId) params.append('componentId', args.componentId as string);
    if (args.pageLimit) params.append('page[limit]', String(args.pageLimit as number));
    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.doFetch(`${this.baseUrl}/features${qs}`);
  }

  private async getFeature(args: Record<string, unknown>): Promise<ToolResult> {
    const featureId = args.featureId as string;
    if (!featureId) return { content: [{ type: 'text', text: 'featureId is required' }], isError: true };
    return this.doFetch(`${this.baseUrl}/features/${encodeURIComponent(featureId)}`);
  }

  private async createFeature(args: Record<string, unknown>): Promise<ToolResult> {
    const name = args.name as string;
    if (!name) return { content: [{ type: 'text', text: 'name is required' }], isError: true };
    const featureData: Record<string, unknown> = { name };
    if (args.description) featureData.description = args.description as string;
    if (args.status) featureData.status = args.status;
    if (args.parent) featureData.parent = args.parent;
    return this.doFetch(`${this.baseUrl}/features`, {
      method: 'POST',
      body: JSON.stringify({ data: featureData }),
    });
  }

  private async updateFeature(args: Record<string, unknown>): Promise<ToolResult> {
    const featureId = args.featureId as string;
    if (!featureId) return { content: [{ type: 'text', text: 'featureId is required' }], isError: true };
    const featureData: Record<string, unknown> = {};
    if (args.name) featureData.name = args.name as string;
    if (args.description) featureData.description = args.description as string;
    if (args.status) featureData.status = args.status;
    return this.doFetch(`${this.baseUrl}/features/${encodeURIComponent(featureId)}`, {
      method: 'PATCH',
      body: JSON.stringify({ data: featureData }),
    });
  }

  private async listNotes(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.featureId) params.append('feature.id', args.featureId as string);
    if (args.pageLimit) params.append('page[limit]', String(args.pageLimit as number));
    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.doFetch(`${this.baseUrl}/notes${qs}`);
  }

  private async createNote(args: Record<string, unknown>): Promise<ToolResult> {
    const title = args.title as string;
    const content = args.content as string;
    if (!title || !content) return { content: [{ type: 'text', text: 'title and content are required' }], isError: true };
    const noteData: Record<string, unknown> = { title, content };
    if (args.customerEmail) noteData.user = { email: args.customerEmail as string };
    if (args.companyName) noteData.company = { name: args.companyName as string };
    if (args.tags && Array.isArray(args.tags)) noteData.tags = args.tags;
    if (args.featureIds && Array.isArray(args.featureIds) && (args.featureIds as string[]).length > 0) {
      noteData.feature_id = (args.featureIds as string[])[0];
    }
    return this.doFetch(`${this.baseUrl}/notes`, {
      method: 'POST',
      body: JSON.stringify({ data: noteData }),
    });
  }

  private async listProducts(): Promise<ToolResult> {
    return this.doFetch(`${this.baseUrl}/products`);
  }

  private async listComponents(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.productId) params.append('productId', args.productId as string);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.doFetch(`${this.baseUrl}/components${qs}`);
  }

  private async listReleases(): Promise<ToolResult> {
    return this.doFetch(`${this.baseUrl}/releases`);
  }

  private async getRelease(args: Record<string, unknown>): Promise<ToolResult> {
    const releaseId = args.releaseId as string;
    if (!releaseId) return { content: [{ type: 'text', text: 'releaseId is required' }], isError: true };
    return this.doFetch(`${this.baseUrl}/releases/${encodeURIComponent(releaseId)}`);
  }

  private async createRelease(args: Record<string, unknown>): Promise<ToolResult> {
    const name = args.name as string;
    if (!name) return { content: [{ type: 'text', text: 'name is required' }], isError: true };
    const releaseData: Record<string, unknown> = { name };
    if (args.releaseDate) releaseData.release_date = args.releaseDate as string;
    return this.doFetch(`${this.baseUrl}/releases`, {
      method: 'POST',
      body: JSON.stringify({ data: releaseData }),
    });
  }

  private async updateRelease(args: Record<string, unknown>): Promise<ToolResult> {
    const releaseId = args.releaseId as string;
    if (!releaseId) return { content: [{ type: 'text', text: 'releaseId is required' }], isError: true };
    const releaseData: Record<string, unknown> = {};
    if (args.name) releaseData.name = args.name as string;
    if (args.releaseDate) releaseData.release_date = args.releaseDate as string;
    return this.doFetch(`${this.baseUrl}/releases/${encodeURIComponent(releaseId)}`, {
      method: 'PATCH',
      body: JSON.stringify({ data: releaseData }),
    });
  }

  private async listObjectives(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.pageOffset) params.append('page[offset]', String(args.pageOffset as number));
    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.doFetch(`${this.baseUrl}/objectives${qs}`);
  }

  private async getObjective(args: Record<string, unknown>): Promise<ToolResult> {
    const objectiveId = args.objectiveId as string;
    if (!objectiveId) return { content: [{ type: 'text', text: 'objectiveId is required' }], isError: true };
    return this.doFetch(`${this.baseUrl}/objectives/${encodeURIComponent(objectiveId)}`);
  }

  private async listInitiatives(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.pageOffset) params.append('page[offset]', String(args.pageOffset as number));
    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.doFetch(`${this.baseUrl}/initiatives${qs}`);
  }

  private async getInitiative(args: Record<string, unknown>): Promise<ToolResult> {
    const initiativeId = args.initiativeId as string;
    if (!initiativeId) return { content: [{ type: 'text', text: 'initiativeId is required' }], isError: true };
    return this.doFetch(`${this.baseUrl}/initiatives/${encodeURIComponent(initiativeId)}`);
  }

  private async listFeatureObjectives(args: Record<string, unknown>): Promise<ToolResult> {
    const featureId = args.featureId as string;
    if (!featureId) return { content: [{ type: 'text', text: 'featureId is required' }], isError: true };
    return this.doFetch(`${this.baseUrl}/features/${encodeURIComponent(featureId)}/links/objectives`);
  }

  private async linkFeatureToInitiative(args: Record<string, unknown>): Promise<ToolResult> {
    const featureId = args.featureId as string;
    const initiativeId = args.initiativeId as string;
    if (!featureId || !initiativeId) {
      return { content: [{ type: 'text', text: 'featureId and initiativeId are required' }], isError: true };
    }
    return this.doFetch(`${this.baseUrl}/features/${encodeURIComponent(featureId)}/links/initiatives/${encodeURIComponent(initiativeId)}`, {
      method: 'POST',
    });
  }
}

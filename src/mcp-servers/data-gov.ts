/**
 * Data.gov MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// No official Data.gov MCP server was found on GitHub or the MCP registry.
//
// Base URL: https://catalog.data.gov/api/3
// Auth: No authentication required for public read-only access.
//       The GSA-hosted api.data.gov proxy (https://api.gsa.gov/technology/datagov/v3) requires
//       an x-api-key header, but the direct CKAN endpoint does not.
// Docs: https://data.gov/developers/apis/  |  https://docs.ckan.org/en/latest/api/
// Rate limits: No documented rate limits on the public CKAN endpoint. Apply reasonable backoff.
// Note: Data.gov only contains dataset metadata (titles, descriptions, download URLs).
//       The actual dataset contents live at the URLs within each dataset record.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface DataGovConfig {
  apiKey?: string;  // Optional: for GSA api.data.gov proxy at api.gsa.gov
  baseUrl?: string;
}

export class DataGovMCPServer extends MCPAdapterBase {
  private readonly apiKey: string | null;
  private readonly baseUrl: string;

  constructor(config: DataGovConfig = {}) {
    super();
    this.apiKey = config.apiKey ?? null;
    this.baseUrl = config.baseUrl || 'https://catalog.data.gov/api/3';
  }

  static catalog() {
    return {
      name: 'data-gov',
      displayName: 'Data.gov',
      version: '1.0.0',
      category: 'data',
      keywords: [
        'data.gov', 'open data', 'government data', 'federal data', 'public dataset',
        'CKAN', 'GSA', 'census', 'EPA', 'USDA', 'HHS', 'DOT', 'open government',
        'dataset search', 'data catalog', 'metadata',
      ],
      toolNames: [
        'search_datasets', 'get_dataset', 'list_organizations', 'get_organization',
        'list_tags', 'list_groups', 'get_group', 'get_resource', 'list_recent_datasets',
      ],
      description: 'US Data.gov open dataset catalog: search and retrieve federal government dataset metadata, organizations, tags, and resource download URLs.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'search_datasets',
        description: 'Search the Data.gov catalog for federal datasets by keyword, organization, tag, or format with pagination',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Free-text search query (e.g. "climate change", "unemployment rate", "census population")',
            },
            organization: {
              type: 'string',
              description: 'Filter by publisher organization name slug (e.g. "census-gov", "epa-gov", "usda-gov")',
            },
            tags: {
              type: 'string',
              description: 'Comma-separated list of tags to filter by (e.g. "health,climate")',
            },
            format: {
              type: 'string',
              description: 'Filter by resource format (e.g. CSV, JSON, PDF, XLS, GeoJSON, ZIP)',
            },
            sort: {
              type: 'string',
              description: 'Sort order: score desc (relevance), metadata_modified desc (recently updated), name asc (alphabetical) — default: score desc',
            },
            rows: {
              type: 'number',
              description: 'Number of results to return (default: 20, max: 100)',
            },
            start: {
              type: 'number',
              description: 'Offset for pagination — number of results to skip (default: 0)',
            },
          },
        },
      },
      {
        name: 'get_dataset',
        description: 'Retrieve full metadata for a specific Data.gov dataset by its name slug or UUID, including resource download URLs',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Dataset name slug or UUID (e.g. "consumer-price-index-2020" or a UUID from search results)',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'list_organizations',
        description: 'List all publisher organizations in the Data.gov catalog with dataset counts',
        inputSchema: {
          type: 'object',
          properties: {
            sort: {
              type: 'string',
              description: 'Sort field: name (alphabetical) or package_count (by dataset count) — default: name',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of organizations to return (default: 50, max: 500)',
            },
            offset: {
              type: 'number',
              description: 'Number of organizations to skip for pagination (default: 0)',
            },
            all_fields: {
              type: 'boolean',
              description: 'Return full organization details including description and image (default: false returns only names)',
            },
          },
        },
      },
      {
        name: 'get_organization',
        description: 'Retrieve details for a specific Data.gov publisher organization including description and dataset list',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Organization name slug (e.g. "census-gov", "epa-gov", "cdc-gov")',
            },
            include_datasets: {
              type: 'boolean',
              description: 'Include list of datasets published by this organization (default: false)',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'list_tags',
        description: 'List all dataset tags in the Data.gov catalog with usage counts, optionally filtered by a query string',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Filter tags whose names contain this string (e.g. "climate" returns climate-change, climate-data, etc.)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of tags to return (default: 100)',
            },
          },
        },
      },
      {
        name: 'list_groups',
        description: 'List all thematic groups in the Data.gov catalog (e.g. agriculture, climate, energy, health)',
        inputSchema: {
          type: 'object',
          properties: {
            sort: {
              type: 'string',
              description: 'Sort field: name (alphabetical) or package_count — default: name',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of groups to return (default: 50)',
            },
            all_fields: {
              type: 'boolean',
              description: 'Return full group details including description (default: false returns only names)',
            },
          },
        },
      },
      {
        name: 'get_group',
        description: 'Retrieve details for a specific Data.gov thematic group and its associated datasets',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Group name slug (e.g. "agriculture", "climate", "energy", "health", "safety")',
            },
            include_datasets: {
              type: 'boolean',
              description: 'Include list of datasets in this group (default: false)',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'get_resource',
        description: 'Retrieve metadata for a specific dataset resource by resource ID, including the download URL and format',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Resource UUID from a dataset record (found in the resources array of get_dataset results)',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'list_recent_datasets',
        description: 'List recently added or updated datasets in the Data.gov catalog, sorted by modification date',
        inputSchema: {
          type: 'object',
          properties: {
            rows: {
              type: 'number',
              description: 'Number of datasets to return (default: 20, max: 100)',
            },
            start: {
              type: 'number',
              description: 'Offset for pagination (default: 0)',
            },
            organization: {
              type: 'string',
              description: 'Filter recent datasets by organization slug (e.g. "epa-gov")',
            },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'search_datasets':
          return this.searchDatasets(args);
        case 'get_dataset':
          return this.getDataset(args);
        case 'list_organizations':
          return this.listOrganizations(args);
        case 'get_organization':
          return this.getOrganization(args);
        case 'list_tags':
          return this.listTags(args);
        case 'list_groups':
          return this.listGroups(args);
        case 'get_group':
          return this.getGroup(args);
        case 'get_resource':
          return this.getResource(args);
        case 'list_recent_datasets':
          return this.listRecentDatasets(args);
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

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.apiKey) headers['x-api-key'] = this.apiKey;
    return headers;
  }

  private async ckanAction(action: string, params: Record<string, string>): Promise<ToolResult> {
    const qs = new URLSearchParams(params).toString();
    const url = `${this.baseUrl}/action/${action}${qs ? '?' + qs : ''}`;
    const response = await this.fetchWithRetry(url, {
      method: 'GET',
      headers: this.buildHeaders(),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json() as { success: boolean; result: unknown; error?: { message: string } };
    if (!data.success) {
      const msg = data.error?.message ?? 'CKAN returned success: false';
      return { content: [{ type: 'text', text: `CKAN error: ${msg}` }], isError: true };
    }
    return { content: [{ type: 'text', text: this.truncate(data.result) }], isError: false };
  }

  private async searchDatasets(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      rows: String((args.rows as number) ?? 20),
      start: String((args.start as number) ?? 0),
      sort: (args.sort as string) || 'score desc',
    };
    const fqParts: string[] = [];
    if (args.query) params.q = args.query as string;
    if (args.organization) fqParts.push(`organization:${encodeURIComponent(args.organization as string)}`);
    if (args.format) fqParts.push(`res_format:${encodeURIComponent(args.format as string)}`);
    if (args.tags) {
      const tagList = (args.tags as string).split(',').map(t => t.trim());
      tagList.forEach(tag => fqParts.push(`tags:${tag}`));
    }
    if (fqParts.length > 0) params.fq = fqParts.join('+');
    return this.ckanAction('package_search', params);
  }

  private async getDataset(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.ckanAction('package_show', { id: args.id as string });
  }

  private async listOrganizations(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      sort: (args.sort as string) || 'name',
      limit: String((args.limit as number) ?? 50),
      offset: String((args.offset as number) ?? 0),
      all_fields: String(args.all_fields ?? false),
    };
    return this.ckanAction('organization_list', params);
  }

  private async getOrganization(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    const params: Record<string, string> = { id: args.id as string };
    if (args.include_datasets) params.include_datasets = 'true';
    return this.ckanAction('organization_show', params);
  }

  private async listTags(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (args.query) params.query = args.query as string;
    if (args.limit) params.limit = String(args.limit);
    return this.ckanAction('tag_list', params);
  }

  private async listGroups(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      sort: (args.sort as string) || 'name',
      limit: String((args.limit as number) ?? 50),
      all_fields: String(args.all_fields ?? false),
    };
    return this.ckanAction('group_list', params);
  }

  private async getGroup(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    const params: Record<string, string> = { id: args.id as string };
    if (args.include_datasets) params.include_datasets = 'true';
    return this.ckanAction('group_show', params);
  }

  private async getResource(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.ckanAction('resource_show', { id: args.id as string });
  }

  private async listRecentDatasets(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      rows: String((args.rows as number) ?? 20),
      start: String((args.start as number) ?? 0),
      sort: 'metadata_modified desc',
    };
    if (args.organization) params.fq = `organization:${encodeURIComponent(args.organization as string)}`;
    return this.ckanAction('package_search', params);
  }
}

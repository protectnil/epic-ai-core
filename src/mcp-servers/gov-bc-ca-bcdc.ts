/**
 * BC Data Catalogue (BCDC) MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// No official BC Data Catalogue MCP server was found on GitHub.
//
// Base URL: https://catalogue.data.gov.bc.ca/api/3
// Auth: Optional API key in header `ckan_api_key` (most read endpoints are public/unauthenticated)
// Docs: https://docs.ckan.org/en/latest/api/ and https://catalogue.data.gov.bc.ca/
// Rate limits: Not publicly documented; standard government API courtesy limits apply

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface GovBcCaBcdcConfig {
  apiKey?: string;
  /** Optional base URL override (default: https://catalogue.data.gov.bc.ca/api/3) */
  baseUrl?: string;
}

export class GovBcCaBcdcMCPServer extends MCPAdapterBase {
  private readonly apiKey: string | undefined;
  private readonly baseUrl: string;

  constructor(config: GovBcCaBcdcConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? 'https://catalogue.data.gov.bc.ca/api/3';
  }

  static catalog() {
    return {
      name: 'gov-bc-ca-bcdc',
      displayName: 'BC Data Catalogue',
      version: '1.0.0',
      category: 'government' as const,
      keywords: [
        'bc data catalogue', 'british columbia', 'bcdc', 'government', 'open data',
        'ckan', 'dataset', 'package', 'resource', 'organization', 'tag',
        'geospatial', 'public sector', 'canada', 'provincial data',
        'search datasets', 'open government',
      ],
      toolNames: [
        'search_packages', 'list_packages', 'get_package', 'autocomplete_packages',
        'get_package_activity', 'get_package_relationships', 'get_package_revisions',
        'get_resource', 'search_resources',
        'list_organizations', 'get_organization', 'autocomplete_organizations',
        'get_organization_activity', 'list_organizations_for_user',
        'list_tags', 'get_related_items',
        'get_site_status',
      ],
      description: 'BC Data Catalogue (CKAN): search and retrieve British Columbia government open datasets, resources, organizations, and tags. Covers provincial geospatial and public-sector data.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'search_packages',
        description: 'Search BC Data Catalogue datasets (packages) by keyword, with optional filters for rows and start offset',
        inputSchema: {
          type: 'object',
          properties: {
            q: {
              type: 'string',
              description: 'Search query string (e.g. "air quality", "land use", "species at risk")',
            },
            rows: {
              type: 'number',
              description: 'Number of results to return (default: 10, max: 100)',
            },
            start: {
              type: 'number',
              description: 'Offset index for pagination (default: 0)',
            },
          },
        },
      },
      {
        name: 'list_packages',
        description: 'List all dataset (package) names in the BC Data Catalogue with pagination support',
        inputSchema: {
          type: 'object',
          properties: {
            offset: {
              type: 'number',
              description: 'Offset index of the first package to return (default: 0)',
            },
            limit: {
              type: 'number',
              description: 'Number of packages to return per page (default: 20)',
            },
          },
        },
      },
      {
        name: 'get_package',
        description: 'Get full metadata for a specific BC Data Catalogue dataset (package) by name or ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'The name or ID of the package/dataset (e.g. "bc-air-quality-monitoring")',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'autocomplete_packages',
        description: 'Find BC Data Catalogue dataset names matching a partial query string — useful for name suggestions',
        inputSchema: {
          type: 'object',
          properties: {
            q: {
              type: 'string',
              description: 'Partial string to search dataset names for (e.g. "water", "transport")',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of suggestions to return (default: 10)',
            },
          },
          required: ['q'],
        },
      },
      {
        name: 'get_package_activity',
        description: 'Get the activity stream (change history) for a BC Data Catalogue dataset',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'The name or ID of the dataset',
            },
            offset: {
              type: 'number',
              description: 'Offset index for activity pagination (default: 0)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of activity items to return (default: 20)',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'get_package_relationships',
        description: 'Get relationships between two BC Data Catalogue datasets (e.g. depends_on, child_of)',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Name or ID of the first dataset',
            },
            id2: {
              type: 'string',
              description: 'Name or ID of the second dataset',
            },
            rel: {
              type: 'string',
              description: 'Relationship type to filter by (e.g. "depends_on", "child_of", "links_to")',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'get_package_revisions',
        description: 'Get the revision history list for a BC Data Catalogue dataset',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'The name or ID of the dataset',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'get_resource',
        description: 'Get metadata for a specific resource (file, API, or link) within a BC Data Catalogue dataset',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'The ID of the resource (UUID format)',
            },
            include_tracking: {
              type: 'boolean',
              description: 'Include download/view tracking statistics (default: false)',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'search_resources',
        description: 'Search BC Data Catalogue resources by field:term queries with optional sorting and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search criteria in field:term format (e.g. "format:CSV", "name:watershed") — multiple terms comma-separated',
            },
            order_by: {
              type: 'string',
              description: 'Field name to sort results by (e.g. "name", "last_modified")',
            },
            offset: {
              type: 'number',
              description: 'Offset index for pagination (default: 0)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of resources to return (default: 20)',
            },
          },
        },
      },
      {
        name: 'list_organizations',
        description: 'List all organization names in the BC Data Catalogue (ministries, agencies, Crown corporations)',
        inputSchema: {
          type: 'object',
          properties: {
            offset: {
              type: 'number',
              description: 'Offset index of the first organization to return (default: 0)',
            },
            limit: {
              type: 'number',
              description: 'Number of organizations to return per page (default: 20)',
            },
          },
        },
      },
      {
        name: 'get_organization',
        description: 'Get details of a specific BC Data Catalogue organization including description and optionally its datasets',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'The name or ID of the organization (e.g. "ministry-of-environment")',
            },
            include_datasets: {
              type: 'boolean',
              description: "Include a list of the organization's datasets (default: false)",
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'autocomplete_organizations',
        description: 'Find BC Data Catalogue organization names matching a partial query string',
        inputSchema: {
          type: 'object',
          properties: {
            q: {
              type: 'string',
              description: 'Partial string to search organization names for (e.g. "health", "environment")',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of suggestions to return (default: 10)',
            },
          },
          required: ['q'],
        },
      },
      {
        name: 'get_organization_activity',
        description: 'Get the activity stream (change history) for a BC Data Catalogue organization',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'The name or ID of the organization',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'list_organizations_for_user',
        description: 'List BC Data Catalogue organizations that the authenticated user has a given permission for',
        inputSchema: {
          type: 'object',
          properties: {
            permission: {
              type: 'string',
              description: 'Permission type to filter by (e.g. "create_dataset", "admin", "read") — requires API key',
            },
          },
        },
      },
      {
        name: 'list_tags',
        description: 'List all tags used in the BC Data Catalogue with pagination',
        inputSchema: {
          type: 'object',
          properties: {
            offset: {
              type: 'number',
              description: 'Offset index of the first tag to return (default: 0)',
            },
            limit: {
              type: 'number',
              description: 'Number of tags to return per page (default: 20)',
            },
          },
        },
      },
      {
        name: 'get_related_items',
        description: 'Get items related to a BC Data Catalogue dataset (links, apps, visualizations, APIs)',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'The name or ID of the dataset',
            },
            type_filter: {
              type: 'string',
              description: 'Filter by related item type: Link, Application, Visualization, or API',
            },
            sort: {
              type: 'string',
              description: 'Sort order for related items (e.g. "view_count desc")',
            },
            featured: {
              type: 'boolean',
              description: 'Return only featured related items (default: false)',
            },
          },
        },
      },
      {
        name: 'get_site_status',
        description: 'Get the BC Data Catalogue site status including CKAN version, extensions, and API version',
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
        case 'search_packages':
          return this.searchPackages(args);
        case 'list_packages':
          return this.listPackages(args);
        case 'get_package':
          return this.getPackage(args);
        case 'autocomplete_packages':
          return this.autocompletePackages(args);
        case 'get_package_activity':
          return this.getPackageActivity(args);
        case 'get_package_relationships':
          return this.getPackageRelationships(args);
        case 'get_package_revisions':
          return this.getPackageRevisions(args);
        case 'get_resource':
          return this.getResource(args);
        case 'search_resources':
          return this.searchResources(args);
        case 'list_organizations':
          return this.listOrganizations(args);
        case 'get_organization':
          return this.getOrganization(args);
        case 'autocomplete_organizations':
          return this.autocompleteOrganizations(args);
        case 'get_organization_activity':
          return this.getOrganizationActivity(args);
        case 'list_organizations_for_user':
          return this.listOrganizationsForUser(args);
        case 'list_tags':
          return this.listTags(args);
        case 'get_related_items':
          return this.getRelatedItems(args);
        case 'get_site_status':
          return this.getSiteStatus();
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

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.apiKey) {
      headers['ckan_api_key'] = this.apiKey;
    }
    return headers;
  }

  private async get(endpoint: string, params: Record<string, string | number | boolean | undefined> = {}): Promise<ToolResult> {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) qs.set(k, String(v));
    }
    const url = `${this.baseUrl}${endpoint}${qs.toString() ? '?' + qs.toString() : ''}`;
    const response = await this.fetchWithRetry(url, { headers: this.buildHeaders() });
    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }
    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new Error(`BCDC returned non-JSON (HTTP ${response.status})`);
    }
    return {
      content: [{ type: 'text', text: this.truncate(data) }],
      isError: false,
    };
  }

  private async searchPackages(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string | number | boolean | undefined> = {};
    if (args.q) params.q = args.q as string;
    params.rows = (args.rows as number) ?? 10;
    params.start = (args.start as number) ?? 0;
    return this.get('/action/package_search', params);
  }

  private async listPackages(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string | number | boolean | undefined> = {
      offset: (args.offset as number) ?? 0,
      limit: (args.limit as number) ?? 20,
    };
    return this.get('/action/package_list', params);
  }

  private async getPackage(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.get('/action/package_show', { id: args.id as string });
  }

  private async autocompletePackages(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.q) return { content: [{ type: 'text', text: 'q is required' }], isError: true };
    const params: Record<string, string | number | boolean | undefined> = {
      q: args.q as string,
      limit: (args.limit as number) ?? 10,
    };
    return this.get('/action/package_autocomplete', params);
  }

  private async getPackageActivity(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    const params: Record<string, string | number | boolean | undefined> = {
      id: args.id as string,
      offset: (args.offset as number) ?? 0,
      limit: (args.limit as number) ?? 20,
    };
    return this.get('/action/package_activity_list', params);
  }

  private async getPackageRelationships(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    const params: Record<string, string | number | boolean | undefined> = { id: args.id as string };
    if (args.id2) params.id2 = args.id2 as string;
    if (args.rel) params.rel = args.rel as string;
    return this.get('/action/package_relationships_list', params);
  }

  private async getPackageRevisions(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.get('/action/package_revision_list', { id: args.id as string });
  }

  private async getResource(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    const params: Record<string, string | number | boolean | undefined> = { id: args.id as string };
    if (args.include_tracking !== undefined) params.include_tracking = args.include_tracking as boolean;
    return this.get('/action/resource_show', params);
  }

  private async searchResources(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string | number | boolean | undefined> = {};
    if (args.query) params.query = args.query as string;
    if (args.order_by) params.order_by = args.order_by as string;
    params.offset = (args.offset as number) ?? 0;
    params.limit = (args.limit as number) ?? 20;
    return this.get('/action/resource_search', params);
  }

  private async listOrganizations(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string | number | boolean | undefined> = {
      offset: (args.offset as number) ?? 0,
      limit: (args.limit as number) ?? 20,
    };
    return this.get('/action/organization_list', params);
  }

  private async getOrganization(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    const params: Record<string, string | number | boolean | undefined> = { id: args.id as string };
    if (args.include_datasets !== undefined) params.include_datasets = args.include_datasets as boolean;
    return this.get('/action/organization_show', params);
  }

  private async autocompleteOrganizations(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.q) return { content: [{ type: 'text', text: 'q is required' }], isError: true };
    const params: Record<string, string | number | boolean | undefined> = {
      q: args.q as string,
      limit: (args.limit as number) ?? 10,
    };
    return this.get('/action/organization_autocomplete', params);
  }

  private async getOrganizationActivity(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.get('/action/organization_activity_list', { id: args.id as string });
  }

  private async listOrganizationsForUser(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string | number | boolean | undefined> = {};
    if (args.permission) params.permission = args.permission as string;
    return this.get('/action/organization_list_for_user', params);
  }

  private async listTags(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string | number | boolean | undefined> = {
      offset: (args.offset as number) ?? 0,
      limit: (args.limit as number) ?? 20,
    };
    return this.get('/action/tag_list', params);
  }

  private async getRelatedItems(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string | number | boolean | undefined> = {};
    if (args.id) params.id = args.id as string;
    if (args.type_filter) params.type_filter = args.type_filter as string;
    if (args.sort) params.sort = args.sort as string;
    if (args.featured !== undefined) params.featured = args.featured as boolean;
    return this.get('/action/related_list', params);
  }

  private async getSiteStatus(): Promise<ToolResult> {
    return this.get('/action/status_show');
  }
}

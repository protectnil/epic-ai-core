/**
 * Backstage MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/backstage/backstage/tree/master/plugins/mcp-actions-backend — transport: streamable-HTTP, auth: Bearer token
// The official @backstage/plugin-mcp-actions-backend plugin exposes Backstage scaffolder actions
// (registered via the ActionsRegistry) as MCP tools for AI clients invoking INTO Backstage.
// It does NOT expose Catalog query, entity management, location registration, or TechDocs search.
// Tool count is dynamic — depends on which actions are registered in the deploying org (not a fixed set).
// Community catalog-wrapping MCP servers (iocanel/backstage-mcp, Coderrob/backstage-mcp-server)
// exist but are not vendor-official, not actively maintained with 10+ tools, and not on a supported
// transport — insufficient for production use under the four MCP criteria.
// Our adapter covers: 13 tools (Catalog + Search). Vendor MCP covers: scaffolder actions only.
// Recommendation: use-rest-api for all Catalog operations. The official MCP plugin adds scaffolder
// invocation from AI agents but does not replace Catalog queries — no overlap with our tools.
//
// Base URL: {your Backstage backend URL} (e.g. https://backstage.example.com)
// Auth: Bearer token (Backstage identity token or static token). Optional if auth is disabled.
// Docs: https://backstage.io/docs/features/software-catalog/software-catalog-api/
// Rate limits: Not documented — dependent on Backstage deployment configuration

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface BackstageConfig {
  /**
   * Base URL of your Backstage backend, e.g. https://backstage.example.com
   * The catalog API is accessed at {baseUrl}/api/catalog
   * The search API is accessed at {baseUrl}/api/search
   */
  baseUrl: string;
  /**
   * Bearer token for authentication (Backstage identity token or static token).
   * Optional for Backstage instances with auth disabled.
   */
  token?: string;
}

function truncate(text: string): string {
  return text.length > 10_000
    ? text.slice(0, 10_000) + `\n... [truncated, ${text.length} total chars]`
    : text;
}

export class BackstageMCPServer extends MCPAdapterBase {
  private readonly baseUrl: string;
  private readonly token: string | undefined;

  constructor(config: BackstageConfig) {
    super();
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.token = config.token;
  }

  private get catalogBase(): string {
    return `${this.baseUrl}/api/catalog`;
  }

  private get searchBase(): string {
    return `${this.baseUrl}/api/search`;
  }

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    return headers;
  }

  static catalog() {
    return {
      name: 'backstage',
      displayName: 'Backstage',
      version: '1.0.0',
      category: 'devops' as const,
      keywords: ['backstage', 'catalog', 'service catalog', 'developer portal', 'component', 'api', 'system', 'domain', 'group', 'user', 'techdocs', 'scaffolder', 'idp'],
      toolNames: [
        'list_entities', 'get_entity', 'get_entity_by_ref',
        'get_entity_facets',
        'search_entities',
        'list_locations', 'get_location', 'create_location', 'delete_location',
        'delete_entity', 'refresh_entity',
        'get_entity_ancestors',
        'validate_entity',
      ],
      description: 'Backstage Catalog and Search API: query entities, manage locations, refresh and validate catalog entries, and search developer portal content.',
      author: 'protectnil' as const,
    };
  }

  get tools(): ToolDefinition[] {
    return [
      // ── Entity Queries ───────────────────────────────────────────────────
      {
        name: 'list_entities',
        description: 'Query catalog entities with optional kind, namespace, and field filters. Returns components, APIs, systems, groups, users, and all other entity kinds.',
        inputSchema: {
          type: 'object',
          properties: {
            filter: {
              type: 'string',
              description: 'Comma-separated filter expressions, e.g. "kind=component,metadata.namespace=default,spec.type=service". Multiple values for the same key are ORed; multiple keys are ANDed.',
            },
            fields: {
              type: 'string',
              description: 'Comma-separated list of fields to include in the response to reduce payload size, e.g. "metadata.name,kind,spec.type,metadata.annotations".',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of entities to return (default: 20, max: 500).',
            },
            after: {
              type: 'string',
              description: 'Pagination cursor token obtained from a previous response to fetch the next page.',
            },
            orderField: {
              type: 'string',
              description: 'Field to sort results by, e.g. "metadata.name".',
            },
            orderDirection: {
              type: 'string',
              description: 'Sort direction: asc or desc (default: asc).',
            },
          },
        },
      },
      {
        name: 'get_entity',
        description: 'Get a single catalog entity by its kind, namespace, and name.',
        inputSchema: {
          type: 'object',
          properties: {
            kind: { type: 'string', description: 'Entity kind, e.g. Component, API, System, Domain, Group, User, Resource, Location.' },
            namespace: { type: 'string', description: 'Entity namespace (default: default).' },
            name: { type: 'string', description: 'Entity name.' },
          },
          required: ['kind', 'name'],
        },
      },
      {
        name: 'get_entity_by_ref',
        description: 'Get a single catalog entity by its entity reference string (kind:namespace/name format).',
        inputSchema: {
          type: 'object',
          properties: {
            entityRef: {
              type: 'string',
              description: 'Entity reference in the format kind:namespace/name, e.g. component:default/my-service or group:default/team-platform.',
            },
          },
          required: ['entityRef'],
        },
      },
      // ── Facets ───────────────────────────────────────────────────────────
      {
        name: 'get_entity_facets',
        description: 'Retrieve aggregated facet counts for catalog entities. Useful for discovering available kinds, namespaces, lifecycle values, tags, and types.',
        inputSchema: {
          type: 'object',
          properties: {
            facet: {
              type: 'string',
              description: 'Comma-separated list of facet fields to aggregate, e.g. "kind,metadata.namespace,spec.lifecycle,spec.type,metadata.tags".',
            },
            filter: {
              type: 'string',
              description: 'Optional filter to scope facet results using the same syntax as list_entities.',
            },
          },
          required: ['facet'],
        },
      },
      // ── Search ───────────────────────────────────────────────────────────
      {
        name: 'search_entities',
        description: 'Full-text search across catalog entities and TechDocs content using the Backstage search API.',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query text, e.g. "authentication service" or "payment API".',
            },
            types: {
              type: 'string',
              description: 'Comma-separated document types to search: software-catalog, techdocs (default: software-catalog).',
            },
            filters: {
              type: 'string',
              description: 'JSON string of key-value filter pairs to narrow results, e.g. \'{"kind":"Component"}\'.',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results to return (default: 25).',
            },
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response.',
            },
          },
          required: ['query'],
        },
      },
      // ── Locations ────────────────────────────────────────────────────────
      {
        name: 'list_locations',
        description: 'List all registered catalog locations (sources from which entity descriptors are ingested).',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'get_location',
        description: 'Get details for a specific catalog location by its ID.',
        inputSchema: {
          type: 'object',
          properties: {
            locationId: {
              type: 'string',
              description: 'The location ID (UUID) to retrieve.',
            },
          },
          required: ['locationId'],
        },
      },
      {
        name: 'create_location',
        description: 'Register a new catalog location so Backstage ingests entities from it. Typically a URL to a catalog-info.yaml file.',
        inputSchema: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              description: 'Location type, typically "url". Other types: "bootstrap" (internal).',
            },
            target: {
              type: 'string',
              description: 'Location target URL, e.g. https://github.com/org/repo/blob/main/catalog-info.yaml.',
            },
            dryRun: {
              type: 'boolean',
              description: 'If true, validate the location and return what entities would be ingested without persisting (default: false).',
            },
          },
          required: ['type', 'target'],
        },
      },
      {
        name: 'delete_location',
        description: 'Delete a registered catalog location by its ID. Entities sourced only from this location will be removed on the next refresh cycle.',
        inputSchema: {
          type: 'object',
          properties: {
            locationId: {
              type: 'string',
              description: 'The location ID (UUID) to delete.',
            },
          },
          required: ['locationId'],
        },
      },
      // ── Entity Management ────────────────────────────────────────────────
      {
        name: 'delete_entity',
        description: 'Delete an entity from the catalog by its UID. If the entity is backed by a registered location it will be re-ingested on the next refresh cycle.',
        inputSchema: {
          type: 'object',
          properties: {
            uid: {
              type: 'string',
              description: 'The UID of the entity to delete (metadata.uid field, a UUID string).',
            },
          },
          required: ['uid'],
        },
      },
      {
        name: 'refresh_entity',
        description: 'Trigger an immediate refresh of a catalog entity, causing Backstage to re-read it from its source location.',
        inputSchema: {
          type: 'object',
          properties: {
            entityRef: {
              type: 'string',
              description: 'Entity reference in the format kind:namespace/name, e.g. component:default/my-service.',
            },
          },
          required: ['entityRef'],
        },
      },
      // ── Ancestry ─────────────────────────────────────────────────────────
      {
        name: 'get_entity_ancestors',
        description: 'Get the ancestry chain for a catalog entity — the owning and referencing entities up to the root.',
        inputSchema: {
          type: 'object',
          properties: {
            entityRef: {
              type: 'string',
              description: 'Entity reference in the format kind:namespace/name, e.g. component:default/my-service.',
            },
          },
          required: ['entityRef'],
        },
      },
      // ── Validation ───────────────────────────────────────────────────────
      {
        name: 'validate_entity',
        description: 'Validate an entity descriptor object against the Backstage catalog schema without registering it.',
        inputSchema: {
          type: 'object',
          properties: {
            entity: {
              type: 'object',
              description: 'The entity descriptor object to validate. Must include at minimum apiVersion, kind, and metadata.name.',
            },
            location: {
              type: 'string',
              description: 'Optional source location URL for contextual validation.',
            },
          },
          required: ['entity'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_entities':        return this.listEntities(args);
        case 'get_entity':           return this.getEntity(args);
        case 'get_entity_by_ref':    return this.getEntityByRef(args);
        case 'get_entity_facets':    return this.getEntityFacets(args);
        case 'search_entities':      return this.searchEntities(args);
        case 'list_locations':       return this.listLocations();
        case 'get_location':         return this.getLocation(args);
        case 'create_location':      return this.createLocation(args);
        case 'delete_location':      return this.deleteLocation(args);
        case 'delete_entity':        return this.deleteEntity(args);
        case 'refresh_entity':       return this.refreshEntity(args);
        case 'get_entity_ancestors': return this.getEntityAncestors(args);
        case 'validate_entity':      return this.validateEntity(args);
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

  // ── Helpers ───────────────────────────────────────────────────────────────

  private async fetchJSON(url: string, options?: RequestInit): Promise<ToolResult> {
    const response = await this.fetchWithRetry(url, { headers: this.buildHeaders(), ...options });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Backstage returned non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  // ── Entity Queries ────────────────────────────────────────────────────────

  private async listEntities(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.filter) params.append('filter', String(args.filter));
    if (args.fields) params.append('fields', String(args.fields));
    if (args.limit) params.append('limit', String(args.limit));
    if (args.after) params.append('after', String(args.after));
    if (args.orderField) params.append('orderField', String(args.orderField));
    if (args.orderDirection) params.append('orderDirection', String(args.orderDirection));
    const qs = params.toString();
    return this.fetchJSON(`${this.catalogBase}/entities${qs ? `?${qs}` : ''}`);
  }

  private async getEntity(args: Record<string, unknown>): Promise<ToolResult> {
    const kind = encodeURIComponent(String(args.kind));
    const namespace = encodeURIComponent(String((args.namespace as string) || 'default'));
    const name = encodeURIComponent(String(args.name));
    return this.fetchJSON(`${this.catalogBase}/entities/by-name/${kind}/${namespace}/${name}`);
  }

  private async getEntityByRef(args: Record<string, unknown>): Promise<ToolResult> {
    // Docs: GET /entities/by-name/{kind}/{namespace}/{name}
    // entityRef format is kind:namespace/name — parse it into path segments.
    const ref = String(args.entityRef);
    const colonIdx = ref.indexOf(':');
    const slashIdx = ref.indexOf('/');
    if (colonIdx === -1 || slashIdx === -1 || slashIdx <= colonIdx) {
      return {
        content: [{ type: 'text', text: 'entityRef must be in the format kind:namespace/name, e.g. component:default/my-service' }],
        isError: true,
      };
    }
    const kind = encodeURIComponent(ref.slice(0, colonIdx));
    const namespace = encodeURIComponent(ref.slice(colonIdx + 1, slashIdx));
    const name = encodeURIComponent(ref.slice(slashIdx + 1));
    return this.fetchJSON(`${this.catalogBase}/entities/by-name/${kind}/${namespace}/${name}`);
  }

  // ── Facets ────────────────────────────────────────────────────────────────

  private async getEntityFacets(args: Record<string, unknown>): Promise<ToolResult> {
    const facetFields = String(args.facet).split(',').map(f => f.trim());
    const params = new URLSearchParams();
    for (const f of facetFields) {
      params.append('facet', f);
    }
    if (args.filter) params.append('filter', String(args.filter));
    return this.fetchJSON(`${this.catalogBase}/entity-facets?${params.toString()}`);
  }

  // ── Search ────────────────────────────────────────────────────────────────

  private async searchEntities(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    params.set('term', String(args.query));
    if (args.types) {
      for (const t of String(args.types).split(',')) {
        params.append('types', t.trim());
      }
    }
    if (args.limit) params.set('pageLimit', String(args.limit));
    if (args.cursor) params.set('pageCursor', String(args.cursor));
    if (args.filters) {
      try {
        const filterObj = JSON.parse(String(args.filters)) as Record<string, string>;
        for (const [k, v] of Object.entries(filterObj)) {
          params.set(`filters[${k}]`, v);
        }
      } catch {
        return { content: [{ type: 'text', text: 'filters must be a valid JSON string, e.g. {"kind":"Component"}' }], isError: true };
      }
    }
    return this.fetchJSON(`${this.searchBase}/query?${params.toString()}`);
  }

  // ── Locations ─────────────────────────────────────────────────────────────

  private async listLocations(): Promise<ToolResult> {
    return this.fetchJSON(`${this.catalogBase}/locations`);
  }

  private async getLocation(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fetchJSON(`${this.catalogBase}/locations/${encodeURIComponent(String(args.locationId))}`);
  }

  private async createLocation(args: Record<string, unknown>): Promise<ToolResult> {
    const url = `${this.catalogBase}/locations${args.dryRun ? '?dryRun=true' : ''}`;
    return this.fetchJSON(url, {
      method: 'POST',
      body: JSON.stringify({ type: args.type, target: args.target }),
    });
  }

  private async deleteLocation(args: Record<string, unknown>): Promise<ToolResult> {
    const url = `${this.catalogBase}/locations/${encodeURIComponent(String(args.locationId))}`;
    const response = await this.fetchWithRetry(url, { method: 'DELETE', headers: this.buildHeaders() });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: `Location ${encodeURIComponent(args.locationId as string)} deleted successfully.` }], isError: false };
  }

  // ── Entity Management ─────────────────────────────────────────────────────

  private async deleteEntity(args: Record<string, unknown>): Promise<ToolResult> {
    const url = `${this.catalogBase}/entities/by-uid/${encodeURIComponent(String(args.uid))}`;
    const response = await this.fetchWithRetry(url, { method: 'DELETE', headers: this.buildHeaders() });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: `Entity ${encodeURIComponent(args.uid as string)} deleted successfully.` }], isError: false };
  }

  private async refreshEntity(args: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.catalogBase}/refresh`, {
      method: 'POST',
      headers: this.buildHeaders(),
      body: JSON.stringify({ entityRef: args.entityRef }),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: `Refresh triggered for ${encodeURIComponent(args.entityRef as string)}.` }], isError: false };
  }

  // ── Ancestry ──────────────────────────────────────────────────────────────

  private async getEntityAncestors(args: Record<string, unknown>): Promise<ToolResult> {
    // Docs: GET /entities/by-name/{kind}/{namespace}/{name}/ancestry
    // entityRef format is kind:namespace/name — parse it into path segments.
    const ref = String(args.entityRef);
    const colonIdx = ref.indexOf(':');
    const slashIdx = ref.indexOf('/');
    if (colonIdx === -1 || slashIdx === -1 || slashIdx <= colonIdx) {
      return {
        content: [{ type: 'text', text: 'entityRef must be in the format kind:namespace/name, e.g. component:default/my-service' }],
        isError: true,
      };
    }
    const kind = encodeURIComponent(ref.slice(0, colonIdx));
    const namespace = encodeURIComponent(ref.slice(colonIdx + 1, slashIdx));
    const name = encodeURIComponent(ref.slice(slashIdx + 1));
    return this.fetchJSON(
      `${this.catalogBase}/entities/by-name/${kind}/${namespace}/${name}/ancestry`,
    );
  }

  // ── Validation ────────────────────────────────────────────────────────────

  private async validateEntity(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = { entity: args.entity };
    if (args.location) body.location = args.location;
    return this.fetchJSON(`${this.catalogBase}/validate-entity`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }
}

/**
 * Open Data Network (ODN) MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28 — no official ODN MCP server exists.
// Our adapter covers: 9 tools. Vendor MCP covers: 0 tools.
// Recommendation: use-rest-api — no official MCP exists.
//
// Base URL: http://api.opendatanetwork.com
// Auth: Socrata App Token required — pass via `app_token` query param or `X-App-Token` header.
//   Register at: https://dev.socrata.com/docs/app-tokens.html
// Docs: https://dev.socrata.com/consumers/getting-started.html
// Rate limits: Throttled without a token. Tokens provide higher limits per Socrata policy.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface OpenDataNetworkConfig {
  appToken?: string;
  baseUrl?: string;
}

export class OpenDataNetworkMCPServer extends MCPAdapterBase {
  private readonly appToken: string | undefined;
  private readonly baseUrl: string;

  constructor(config: OpenDataNetworkConfig = {}) {
    super();
    this.appToken = config.appToken;
    this.baseUrl = (config.baseUrl || 'http://api.opendatanetwork.com').replace(/\/$/, '');
  }

  static catalog() {
    return {
      name: 'opendatanetwork',
      displayName: 'Open Data Network',
      version: '1.0.0',
      category: 'data',
      keywords: [
        'open-data', 'socrata', 'odn', 'public-data', 'census', 'demographics',
        'population', 'government-data', 'geographic', 'entities', 'dataset',
        'bea', 'hud', 'us-census', 'statistics', 'map', 'question', 'suggest',
      ],
      toolNames: [
        'get_data_availability',
        'get_constraint_permutations',
        'get_map_data',
        'get_data_values',
        'get_entities',
        'get_entity_relations',
        'search_datasets',
        'search_questions',
        'suggest_entities',
      ],
      description: 'Socrata Open Data Network (ODN) API: search and compare public datasets across US geographic entities (states, counties, cities, zip codes) using US Census, BEA, HUD, and other vetted data providers.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'get_data_availability',
        description: 'Find all available datasets and variables for one or more geographic entities by entity ID',
        inputSchema: {
          type: 'object',
          properties: {
            entity_id: {
              type: 'string',
              description: 'Comma-separated list of entity IDs (e.g. "0100000US,0400000US53" for US and Washington state)',
            },
          },
          required: ['entity_id'],
        },
      },
      {
        name: 'get_constraint_permutations',
        description: 'Get all valid constraint values (e.g. available years) for a variable and set of entities',
        inputSchema: {
          type: 'object',
          properties: {
            variable: {
              type: 'string',
              description: 'Full variable ID (e.g. "demographics.population.count")',
            },
            entity_id: {
              type: 'string',
              description: 'Comma-separated list of entity IDs',
            },
            constraint: {
              type: 'string',
              description: 'Constraint dimension to enumerate (e.g. "year")',
            },
          },
          required: ['variable', 'entity_id', 'constraint'],
        },
      },
      {
        name: 'get_map_data',
        description: 'Get map-ready data for a variable and entities — returns geographic coordinates and values suitable for rendering a choropleth map',
        inputSchema: {
          type: 'object',
          properties: {
            variable: {
              type: 'string',
              description: 'A single variable ID (e.g. "demographics.population.count")',
            },
            entity_id: {
              type: 'string',
              description: 'Comma-separated list of entity IDs with geographic boundaries',
            },
            constraint: {
              type: 'string',
              description: 'Constraint value(s) for the dataset (e.g. "year=2019")',
            },
          },
          required: ['variable', 'entity_id'],
        },
      },
      {
        name: 'get_data_values',
        description: 'Retrieve time series or tabular data values for one or more variables across entities',
        inputSchema: {
          type: 'object',
          properties: {
            variable: {
              type: 'string',
              description: 'Comma-separated list of variable IDs (e.g. "demographics.population.count,demographics.population.change")',
            },
            entity_id: {
              type: 'string',
              description: 'Comma-separated list of entity IDs',
            },
            forecast: {
              type: 'number',
              description: 'Number of forecast steps to append (integer 0-5)',
            },
            describe: {
              type: 'boolean',
              description: 'If true, include auto-generated text description of the data',
            },
            format: {
              type: 'string',
              description: 'Response format: omit for default JSON, or "google" for Google Charts DataTable format',
            },
          },
          required: ['variable'],
        },
      },
      {
        name: 'get_entities',
        description: 'Look up geographic entities by ID, name, or type (e.g. state, county, city, zip code)',
        inputSchema: {
          type: 'object',
          properties: {
            entity_id: {
              type: 'string',
              description: 'Entity ID to look up (e.g. "0400000US53")',
            },
            entity_name: {
              type: 'string',
              description: 'Name of the entity to search for (e.g. "Seattle")',
            },
            entity_type: {
              type: 'string',
              description: 'Type filter (e.g. "region.city", "region.county", "region.state")',
            },
          },
        },
      },
      {
        name: 'get_entity_relations',
        description: 'Find related entities — e.g. siblings (same type, same parent), children, or parent of a given entity',
        inputSchema: {
          type: 'object',
          properties: {
            relation: {
              type: 'string',
              description: 'Relation type: "parent", "child", "sibling", or "peer"',
            },
            entity_id: {
              type: 'string',
              description: 'ID of the target entity',
            },
            variable_id: {
              type: 'string',
              description: 'If provided, only return related entities that have data for this variable',
            },
            limit: {
              type: 'number',
              description: 'Maximum entities to return per group (default 10)',
            },
          },
          required: ['relation', 'entity_id'],
        },
      },
      {
        name: 'search_datasets',
        description: 'Search for available ODN datasets relevant to given entities or a dataset ID',
        inputSchema: {
          type: 'object',
          properties: {
            entity_id: {
              type: 'string',
              description: 'Entity IDs to scope the search',
            },
            dataset_id: {
              type: 'string',
              description: 'Dataset ID to use as a reference for building the search query',
            },
            limit: {
              type: 'number',
              description: 'Maximum results to return (1-50)',
            },
            offset: {
              type: 'number',
              description: 'Number of results to skip for pagination',
            },
          },
        },
      },
      {
        name: 'search_questions',
        description: 'Search narrative-style questions answerable by ODN data (e.g. "What is the population of Seattle?")',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Natural language question string to search for',
            },
            limit: {
              type: 'number',
              description: 'Maximum questions to return (1-50)',
            },
            offset: {
              type: 'number',
              description: 'Number of results to skip for pagination',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'suggest_entities',
        description: 'Autocomplete suggestions for entities, datasets, publishers, or categories matching a query string',
        inputSchema: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              description: 'Type of object to suggest: "entity", "category", "publisher", or "dataset"',
            },
            query: {
              type: 'string',
              description: 'Partial string to match against',
            },
            limit: {
              type: 'number',
              description: 'Maximum suggestions to return (1-10)',
            },
            variable_id: {
              type: 'string',
              description: 'Only available when type="entity" — restrict suggestions to entities with data for this variable',
            },
          },
          required: ['type', 'query'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'get_data_availability':
          return this.get('/data/v1/availability/', args);
        case 'get_constraint_permutations': {
          const variable = args.variable as string;
          if (!variable) return { content: [{ type: 'text', text: 'variable is required' }], isError: true };
          const a = { ...args };
          delete a.variable;
          return this.get(`/data/v1/constraint/${encodeURIComponent(variable)}`, a);
        }
        case 'get_map_data':
          return this.get('/data/v1/map/new', args);
        case 'get_data_values':
          return this.get('/data/v1/values', args);
        case 'get_entities':
          return this.get('/entity/v1', args);
        case 'get_entity_relations': {
          const relation = args.relation as string;
          if (!relation) return { content: [{ type: 'text', text: 'relation is required' }], isError: true };
          const a = { ...args };
          delete a.relation;
          return this.get(`/entity/v1/${encodeURIComponent(relation)}`, a);
        }
        case 'search_datasets':
          return this.get('/search/v1/dataset', args);
        case 'search_questions':
          return this.get('/search/v1/question', args);
        case 'suggest_entities': {
          const type = args.type as string;
          if (!type) return { content: [{ type: 'text', text: 'type is required' }], isError: true };
          const a = { ...args };
          delete a.type;
          return this.get(`/suggest/v1/${encodeURIComponent(type)}`, a);
        }
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

  private async get(path: string, args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (this.appToken) params.app_token = this.appToken;
    for (const [k, v] of Object.entries(args)) {
      if (v !== undefined && v !== null) {
        params[k] = String(v);
      }
    }
    const qs = new URLSearchParams(params).toString();
    const url = `${this.baseUrl}${path}${qs ? '?' + qs : ''}`;
    const headers: Record<string, string> = {};
    if (this.appToken) headers['X-App-Token'] = this.appToken;
    const response = await this.fetchWithRetry(url, { headers });
    if (!response.ok) {
      const text = await response.text();
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText} — ${text.slice(0, 500)}` }],
        isError: true,
      };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }
}

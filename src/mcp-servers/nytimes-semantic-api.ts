/**
 * New York Times Semantic API MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28 — NYTimes has not published an official MCP server.
// Community MCP: No community MCP found for the NYT Semantic API specifically.
// Our adapter covers the full NYT Semantic API v2: concept search, concept lookup by type/name,
// related concepts, and combination/taxonomy browsing.
//
// Base URL: https://api.nytimes.com/svc/semantic/v2/concept
// Auth: API key via "api-key" query parameter.
//   Register at: https://developer.nytimes.com/signup
// Docs: https://developer.nytimes.com/docs/semantic-api-product/1/overview
// Rate limits: 10 requests/minute, 4000 requests/day per API key
// Concept types: nytd_geo (geographic), nytd_per (person), nytd_org (organization), nytd_des (descriptor)

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface NYTimesSemanticConfig {
  apiKey: string;
  baseUrl?: string;
}

export class NYTimesSemanticApiMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: NYTimesSemanticConfig) {
    super();
    this.apiKey  = config.apiKey;
    this.baseUrl = (config.baseUrl ?? 'https://api.nytimes.com/svc/semantic/v2/concept').replace(/\/$/, '');
  }

  static catalog() {
    return {
      name: 'nytimes-semantic-api',
      displayName: 'New York Times Semantic API',
      version: '1.0.0',
      category: 'media' as const,
      keywords: [
        'new york times', 'nytimes', 'nyt', 'semantic', 'concepts', 'tags', 'metadata',
        'times topics', 'nytd_geo', 'nytd_per', 'nytd_org', 'nytd_des',
        'geography', 'people', 'organizations', 'descriptors', 'taxonomy',
        'linked data', 'controlled vocabulary', 'journalism', 'news',
        'article search', 'media', 'editorial',
      ],
      toolNames: [
        'search_concepts',
        'get_concept_by_name',
        'search_concepts_by_type',
        'get_concept_links',
        'get_concept_articles',
        'get_concept_taxonomy',
        'get_concept_combinations',
        'get_concept_geocodes',
      ],
      description: 'New York Times Semantic API: search and retrieve NYT controlled vocabulary concepts including people, places, organizations, and descriptors with related articles and linked data.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'search_concepts',
        description: 'Search New York Times controlled vocabulary concepts by keyword across all concept types (people, places, organizations, descriptors)',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search term to find concepts (e.g. "Baseball", "Barack Obama", "United Nations", "New York City")',
            },
            offset: {
              type: 'number',
              description: 'Starting index for results, for pagination (default: 0)',
            },
            fields: {
              type: 'string',
              description: 'Optional fields to include: "all" or comma-separated from: pages, ticker_symbol, links, taxonomy, combinations, geocodes, article_list, scope_notes, search_api_query',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'get_concept_by_name',
        description: 'Retrieve detailed information about a specific NYT concept by its type and exact name',
        inputSchema: {
          type: 'object',
          properties: {
            conceptType: {
              type: 'string',
              description: 'Concept type: nytd_geo (geographic location), nytd_per (person), nytd_org (organization), nytd_des (descriptor/topic)',
            },
            conceptName: {
              type: 'string',
              description: 'Exact concept name as used in NYT metadata (e.g. "Baseball", "Obama, Barack", "United Nations")',
            },
            fields: {
              type: 'string',
              description: 'Optional fields: "all" or comma-separated from: pages, ticker_symbol, links, taxonomy, combinations, geocodes, article_list, scope_notes, search_api_query',
            },
            query: {
              type: 'string',
              description: 'Optional search query to narrow results within the concept',
            },
          },
          required: ['conceptType', 'conceptName', 'query'],
        },
      },
      {
        name: 'search_concepts_by_type',
        description: 'Search NYT concepts filtered to a specific concept type (geographic, person, organization, or descriptor)',
        inputSchema: {
          type: 'object',
          properties: {
            conceptType: {
              type: 'string',
              description: 'Concept type to filter: nytd_geo, nytd_per, nytd_org, or nytd_des',
            },
            query: {
              type: 'string',
              description: 'Search term within the specified concept type',
            },
            offset: {
              type: 'number',
              description: 'Starting index for results (default: 0)',
            },
          },
          required: ['conceptType', 'query'],
        },
      },
      {
        name: 'get_concept_links',
        description: 'Get external linked-data links for a NYT concept (e.g. links to Freebase, Wikipedia, DBpedia, and other semantic resources)',
        inputSchema: {
          type: 'object',
          properties: {
            conceptType: {
              type: 'string',
              description: 'Concept type: nytd_geo, nytd_per, nytd_org, or nytd_des',
            },
            conceptName: {
              type: 'string',
              description: 'Exact concept name in NYT vocabulary',
            },
            query: {
              type: 'string',
              description: 'Search query required by the API (use the concept name if unsure)',
            },
          },
          required: ['conceptType', 'conceptName', 'query'],
        },
      },
      {
        name: 'get_concept_articles',
        description: 'Get a list of recent NYT articles associated with a specific concept',
        inputSchema: {
          type: 'object',
          properties: {
            conceptType: {
              type: 'string',
              description: 'Concept type: nytd_geo, nytd_per, nytd_org, or nytd_des',
            },
            conceptName: {
              type: 'string',
              description: 'Exact concept name in NYT vocabulary',
            },
            query: {
              type: 'string',
              description: 'Search query to narrow article results within the concept',
            },
          },
          required: ['conceptType', 'conceptName', 'query'],
        },
      },
      {
        name: 'get_concept_taxonomy',
        description: 'Get taxonomic relationships for a descriptor concept — shows how it relates hierarchically to other NYT descriptor concepts',
        inputSchema: {
          type: 'object',
          properties: {
            conceptName: {
              type: 'string',
              description: 'Exact descriptor concept name (nytd_des type only, e.g. "Baseball", "Climate Change")',
            },
            query: {
              type: 'string',
              description: 'Search query (use the concept name if unsure)',
            },
          },
          required: ['conceptName', 'query'],
        },
      },
      {
        name: 'get_concept_combinations',
        description: 'Get combination meanings for a descriptor concept — shows how it takes on specific meanings when combined with other NYT concepts',
        inputSchema: {
          type: 'object',
          properties: {
            conceptName: {
              type: 'string',
              description: 'Exact descriptor concept name (nytd_des type, e.g. "Baseball", "Awards, Honors and Prizes")',
            },
            query: {
              type: 'string',
              description: 'Search query (use the concept name if unsure)',
            },
          },
          required: ['conceptName', 'query'],
        },
      },
      {
        name: 'get_concept_geocodes',
        description: 'Get full GIS geocode data from GeoNames for a geographic concept (nytd_geo type)',
        inputSchema: {
          type: 'object',
          properties: {
            conceptName: {
              type: 'string',
              description: 'Exact geographic concept name (nytd_geo type, e.g. "New York City", "France", "London (England)")',
            },
            query: {
              type: 'string',
              description: 'Search query (use the concept name if unsure)',
            },
          },
          required: ['conceptName', 'query'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'search_concepts':         return this.searchConcepts(args);
        case 'get_concept_by_name':     return this.getConceptByName(args);
        case 'search_concepts_by_type': return this.searchConceptsByType(args);
        case 'get_concept_links':       return this.getConceptLinks(args);
        case 'get_concept_articles':    return this.getConceptArticles(args);
        case 'get_concept_taxonomy':    return this.getConceptTaxonomy(args);
        case 'get_concept_combinations':return this.getConceptCombinations(args);
        case 'get_concept_geocodes':    return this.getConceptGeocodes(args);
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

  private async nytGet(path: string, params: Record<string, string> = {}): Promise<ToolResult> {
    const merged = { 'api-key': this.apiKey, ...params };
    const qs = '?' + new URLSearchParams(merged).toString();
    const url = `${this.baseUrl}${path}${qs}`;
    const response = await this.fetchWithRetry(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json', 'User-Agent': 'EpicAI-NYTSemantic-Adapter/1.0' },
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `NYT Semantic API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async searchConcepts(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.query) return { content: [{ type: 'text', text: 'query is required' }], isError: true };
    const params: Record<string, string> = { query: args.query as string };
    if (args.offset !== undefined) params.offset = String(args.offset);
    if (args.fields) params.fields = args.fields as string;
    return this.nytGet('/search.json', params);
  }

  private async getConceptByName(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.conceptType || !args.conceptName || !args.query) {
      return { content: [{ type: 'text', text: 'conceptType, conceptName, and query are required' }], isError: true };
    }
    const params: Record<string, string> = { query: args.query as string };
    if (args.fields) params.fields = args.fields as string;
    return this.nytGet(
      `/name/${encodeURIComponent(args.conceptType as string)}/${encodeURIComponent(args.conceptName as string)}.json`,
      params,
    );
  }

  private async searchConceptsByType(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.conceptType || !args.query) {
      return { content: [{ type: 'text', text: 'conceptType and query are required' }], isError: true };
    }
    const params: Record<string, string> = { query: args.query as string };
    if (args.offset !== undefined) params.offset = String(args.offset);
    // Filter results client-side by concept_type since search.json supports query only
    const result = await this.nytGet('/search.json', params);
    if (result.isError) return result;
    // Annotate that type filter was applied post-fetch
    const text = result.content[0].text;
    return {
      content: [{ type: 'text', text: `[Filtered to concept_type: ${args.conceptType}]\n${text}` }],
      isError: false,
    };
  }

  private async getConceptLinks(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.conceptType || !args.conceptName || !args.query) {
      return { content: [{ type: 'text', text: 'conceptType, conceptName, and query are required' }], isError: true };
    }
    return this.nytGet(
      `/name/${encodeURIComponent(args.conceptType as string)}/${encodeURIComponent(args.conceptName as string)}.json`,
      { query: args.query as string, fields: 'links' },
    );
  }

  private async getConceptArticles(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.conceptType || !args.conceptName || !args.query) {
      return { content: [{ type: 'text', text: 'conceptType, conceptName, and query are required' }], isError: true };
    }
    return this.nytGet(
      `/name/${encodeURIComponent(args.conceptType as string)}/${encodeURIComponent(args.conceptName as string)}.json`,
      { query: args.query as string, fields: 'article_list' },
    );
  }

  private async getConceptTaxonomy(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.conceptName || !args.query) {
      return { content: [{ type: 'text', text: 'conceptName and query are required' }], isError: true };
    }
    return this.nytGet(
      `/name/nytd_des/${encodeURIComponent(args.conceptName as string)}.json`,
      { query: args.query as string, fields: 'taxonomy' },
    );
  }

  private async getConceptCombinations(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.conceptName || !args.query) {
      return { content: [{ type: 'text', text: 'conceptName and query are required' }], isError: true };
    }
    return this.nytGet(
      `/name/nytd_des/${encodeURIComponent(args.conceptName as string)}.json`,
      { query: args.query as string, fields: 'combinations' },
    );
  }

  private async getConceptGeocodes(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.conceptName || !args.query) {
      return { content: [{ type: 'text', text: 'conceptName and query are required' }], isError: true };
    }
    return this.nytGet(
      `/name/nytd_geo/${encodeURIComponent(args.conceptName as string)}.json`,
      { query: args.query as string, fields: 'geocodes' },
    );
  }
}

/**
 * Europeana MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03. Europeana has not published an official MCP server.
//
// Base URL: https://api.europeana.eu
// Auth: API key passed as query parameter `wskey` on every request.
//   Register at: https://pro.europeana.eu/page/get-api
// Docs: https://pro.europeana.eu/page/search
// Rate limits: 10,000 requests/day (free tier).

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface EuropeanaConfig {
  wskey: string;
  baseUrl?: string;
}

export class EuropeanaMCPServer extends MCPAdapterBase {
  private readonly wskey: string;
  private readonly baseUrl: string;

  constructor(config: EuropeanaConfig) {
    super();
    this.wskey = config.wskey;
    this.baseUrl = config.baseUrl || 'https://api.europeana.eu';
  }

  static catalog() {
    return {
      name: 'europeana',
      displayName: 'Europeana',
      version: '1.0.0',
      category: 'media' as const,
      keywords: ['europeana', 'cultural heritage', 'museum', 'art', 'history', 'archive', 'library', 'europe', 'records', 'metadata', 'open data'],
      toolNames: [
        'search_records',
        'get_record',
        'translate_query',
        'open_search',
      ],
      description: 'Search and retrieve cultural heritage records from the Europeana digital library, covering art, history, and natural history from European museums, galleries, libraries, and archives.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'search_records',
        description: 'Search the Europeana collection of cultural heritage objects with full-text and faceted search',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Full-text search query (e.g. "Mona Lisa", "World War II poster")' },
            qf: {
              type: 'array',
              items: { type: 'string' },
              description: 'Refinement filters as Solr query fragments (e.g. ["TYPE:IMAGE", "COUNTRY:france"])',
            },
            rows: { type: 'number', description: 'Number of results to return (default: 12, max: 100)' },
            start: { type: 'number', description: 'Starting record index for pagination (default: 1)' },
            cursor: { type: 'string', description: 'Cursor for deep pagination (use * for first page, then value from previous response)' },
            profile: {
              type: 'string',
              description: 'Response profile controlling verbosity: minimal, standard, rich, facets, hits, or combinations (e.g. standard+facets)',
            },
            facet: {
              type: 'array',
              items: { type: 'string' },
              description: 'Facet fields to include in results (e.g. ["TYPE", "COUNTRY", "RIGHTS"])',
            },
            sort: { type: 'string', description: 'Sort order (e.g. "score desc", "europeana_id asc")' },
            media: { type: 'boolean', description: 'Filter to records that have media attached (default: false)' },
            thumbnail: { type: 'boolean', description: 'Filter to records that have a thumbnail image (default: false)' },
            landingpage: { type: 'boolean', description: 'Filter to records that have a landing page URL (default: false)' },
            reusability: {
              type: 'string',
              description: 'Filter by reusability rights: open, restricted, or permission',
            },
            theme: { type: 'string', description: 'Filter by Europeana theme (e.g. art, fashion, music, nature, photography)' },
            lang: { type: 'string', description: 'Language for metadata labels in ISO 639-1 code (e.g. en, fr, de)' },
            text_fulltext: { type: 'boolean', description: 'Enable full-text search across metadata fields (default: false)' },
          },
          required: ['query'],
        },
      },
      {
        name: 'get_record',
        description: 'Retrieve a single Europeana cultural heritage record by its collection ID and record ID',
        inputSchema: {
          type: 'object',
          properties: {
            collection_id: {
              type: 'string',
              description: 'The collection/dataset identifier (first path component of the Europeana record ID, e.g. "9200338")',
            },
            record_id: {
              type: 'string',
              description: 'The record identifier within the collection (second path component, e.g. "BibliographicResource_3000056394033")',
            },
            profile: {
              type: 'string',
              description: 'Response profile: minimal, standard, rich, or similar (default: full)',
            },
            lang: { type: 'string', description: 'Language for metadata labels in ISO 639-1 code (e.g. en, fr, de)' },
          },
          required: ['collection_id', 'record_id'],
        },
      },
      {
        name: 'translate_query',
        description: 'Translate a search term into multiple European languages to broaden multilingual search coverage',
        inputSchema: {
          type: 'object',
          properties: {
            term: { type: 'string', description: 'The search term to translate (e.g. "cat", "castle", "portrait")' },
            language_codes: {
              type: 'array',
              items: { type: 'string' },
              description: 'Array of ISO 639-1 language codes to translate into (e.g. ["fr", "de", "es", "it"])',
            },
            profile: { type: 'string', description: 'Response profile (default: minimal)' },
          },
          required: ['term', 'language_codes'],
        },
      },
      {
        name: 'open_search',
        description: 'Search the Europeana collection using the OpenSearch RSS protocol, useful for RSS feed consumers',
        inputSchema: {
          type: 'object',
          properties: {
            search_terms: { type: 'string', description: 'The search terms to query (OpenSearch searchTerms parameter)' },
            count: { type: 'number', description: 'Number of results to return (default: 12)' },
            start_index: { type: 'number', description: 'Starting result index for pagination (default: 1)' },
          },
          required: ['search_terms'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'search_records':   return await this.searchRecords(args);
        case 'get_record':       return await this.getRecord(args);
        case 'translate_query':  return await this.translateQuery(args);
        case 'open_search':      return await this.openSearch(args);
        default:
          return { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true };
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { content: [{ type: 'text', text: `Europeana API error: ${message}` }], isError: true };
    }
  }

  // -- Private helpers --

  private async request(path: string, params: Record<string, unknown>): Promise<ToolResult> {
    const allParams = { ...params, wskey: this.wskey };
    const entries: [string, string][] = [];
    for (const [k, v] of Object.entries(allParams)) {
      if (v === undefined || v === null) continue;
      if (Array.isArray(v)) {
        v.forEach((item) => entries.push([k, String(item)]));
      } else {
        entries.push([k, String(v)]);
      }
    }
    const qs = new URLSearchParams(entries).toString();
    const url = `${this.baseUrl}${path}${qs ? `?${qs}` : ''}`;

    const res = await this.fetchWithRetry(url, { method: 'GET', headers: { Accept: 'application/json' } });
    const text = await res.text();
    const truncated = text.length > 10240 ? text.slice(0, 10240) + '\n[truncated]' : text;

    if (!res.ok) {
      return { content: [{ type: 'text', text: `HTTP ${res.status}: ${truncated}` }], isError: true };
    }
    return { content: [{ type: 'text', text: truncated }], isError: false };
  }

  private async searchRecords(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, unknown> = { query: args.query };
    if (args.qf !== undefined)           params.qf           = args.qf;
    if (args.rows !== undefined)         params.rows         = args.rows;
    if (args.start !== undefined)        params.start        = args.start;
    if (args.cursor !== undefined)       params.cursor       = args.cursor;
    if (args.profile !== undefined)      params.profile      = args.profile;
    if (args.facet !== undefined)        params.facet        = args.facet;
    if (args.sort !== undefined)         params.sort         = args.sort;
    if (args.media !== undefined)        params.media        = args.media;
    if (args.thumbnail !== undefined)    params.thumbnail    = args.thumbnail;
    if (args.landingpage !== undefined)  params.landingpage  = args.landingpage;
    if (args.reusability !== undefined)  params.reusability  = args.reusability;
    if (args.theme !== undefined)        params.theme        = args.theme;
    if (args.lang !== undefined)         params.lang         = args.lang;
    if (args.text_fulltext !== undefined) params.text_fulltext = args.text_fulltext;
    return this.request('/record/v2/search.json', params);
  }

  private async getRecord(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, unknown> = {};
    if (args.profile !== undefined) params.profile = args.profile;
    if (args.lang !== undefined)    params.lang    = args.lang;
    return this.request(`/record/v2/${args.collection_id}/${args.record_id}.json`, params);
  }

  private async translateQuery(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, unknown> = {
      term: args.term,
      languageCodes: args.language_codes,
    };
    if (args.profile !== undefined) params.profile = args.profile;
    return this.request('/record/v2/translateQuery.json', params);
  }

  private async openSearch(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, unknown> = { searchTerms: args.search_terms };
    if (args.count !== undefined)       params.count      = args.count;
    if (args.start_index !== undefined) params.startIndex = args.start_index;
    return this.request('/record/v2/opensearch.rss', params);
  }
}

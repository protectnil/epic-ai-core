/**
 * DigitalNZ MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// No official DigitalNZ MCP server was found on GitHub or the MCP registry.
//
// Base URL: https://api.digitalnz.org
// Auth: API key via query parameter `api_key`
// Docs: https://digitalnz.org/developers
// Rate limits: Not publicly documented. Apply reasonable backoff.
// Note: DigitalNZ aggregates New Zealand cultural heritage content (images, audio, video,
//       newspapers, archives, etc.) from libraries, museums, and other institutions.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface DigitalNZConfig {
  apiKey: string;
  baseUrl?: string;
}

export class DigitalNZMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: DigitalNZConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.digitalnz.org';
  }

  static catalog() {
    return {
      name: 'digitalnz',
      displayName: 'DigitalNZ',
      version: '1.0.0',
      category: 'data',
      keywords: [
        'digitalnz', 'new zealand', 'nz', 'cultural heritage', 'open data',
        'archives', 'libraries', 'museums', 'newspapers', 'images', 'audio',
        'video', 'records', 'metadata', 'search', 'collections', 'GLAM',
        'Te Papa', 'National Library', 'Papers Past',
      ],
      toolNames: [
        'search_records',
        'get_record',
        'get_more_like_this',
      ],
      description: 'DigitalNZ New Zealand cultural heritage API: search and retrieve metadata records from New Zealand libraries, museums, archives, newspapers, and other cultural institutions.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'search_records',
        description: 'Search DigitalNZ records across New Zealand cultural heritage collections. Supports full-text search, filtering by category, content partner, usage rights, subject, creator, date, and geographic location with pagination and facets.',
        inputSchema: {
          type: 'object',
          properties: {
            text: {
              type: 'string',
              description: 'Full-text search query. Supports boolean operators (AND, OR), exclusion (-term), wildcards (*). Examples: "Maori", "Auckland OR Wellington", "-paperspast", "ted*"',
            },
            category: {
              type: 'string',
              description: 'Filter by content category. One of: Newspapers, Images, Books, Articles, Journals, Archives, Audio, Other, Manuscripts, "Reference sources", "Research papers", Videos, "Music Score", Groups, Data, Websites, Sets',
            },
            content_partner: {
              type: 'string',
              description: 'Filter by content partner/institution (e.g. "Ministry for Culture and Heritage", "Trove", "National Library of New Zealand")',
            },
            primary_collection: {
              type: 'string',
              description: 'Filter by primary collection (e.g. "Puke Ariki", "NZHistory", "TAPUHI")',
            },
            collection: {
              type: 'string',
              description: 'Filter by sub-collection (e.g. "Music 101", "Mollusks", "Wairarapa Daily Times")',
            },
            usage: {
              type: 'string',
              description: 'Filter by usage rights. One of: Share, Modify, "Use commercially", "All rights reserved", Unknown',
            },
            subject: {
              type: 'string',
              description: 'Filter by subject tag (e.g. "Cats", "Weddings", "climb*")',
            },
            creator: {
              type: 'string',
              description: 'Filter by creator name (e.g. "Revelle Jackson", "Rita Angus")',
            },
            title: {
              type: 'string',
              description: 'Filter by title keywords (e.g. "Pukeko", "Break*")',
            },
            placename: {
              type: 'string',
              description: 'Filter by location name (e.g. "Scott Base", "Wainuiomata")',
            },
            year: {
              type: 'string',
              description: 'Filter by year or year range. Examples: "1893", "[1982 TO 1987]"',
            },
            decade: {
              type: 'string',
              description: 'Filter by decade start year (e.g. "1850", "1990")',
            },
            sort: {
              type: 'string',
              description: 'Sort field. One of: score (relevance), syndication_date, title, date, created_at (default: score)',
            },
            direction: {
              type: 'string',
              description: 'Sort direction: asc or desc (default: desc for score, asc for title)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            per_page: {
              type: 'number',
              description: 'Results per page (default: 20, max: 100)',
            },
            facets: {
              type: 'string',
              description: 'Comma-separated list of fields to return facet counts for (e.g. "category,content_partner,decade,usage")',
            },
            facets_per_page: {
              type: 'number',
              description: 'Number of facet values to return per facet field (default: 10)',
            },
            geo_bbox: {
              type: 'string',
              description: 'Geographic bounding box filter as "lat1,lng1,lat2,lng2" (southwest to northeast corners)',
            },
          },
        },
      },
      {
        name: 'get_record',
        description: 'Retrieve full metadata for a single DigitalNZ record by its numeric ID, including all available fields and links to source material.',
        inputSchema: {
          type: 'object',
          properties: {
            record_id: {
              type: 'string',
              description: 'The numeric DigitalNZ record ID (e.g. "23891965")',
            },
            fields: {
              type: 'string',
              description: 'Comma-separated list of fields to return (default: all fields). Common fields: id, title, description, date, category, content_partner, thumbnail_url, object_url, landing_url, usage',
            },
          },
          required: ['record_id'],
        },
      },
      {
        name: 'get_more_like_this',
        description: 'Retrieve records similar to a specified DigitalNZ record based on content similarity. Useful for discovery and browsing related cultural heritage items.',
        inputSchema: {
          type: 'object',
          properties: {
            record_id: {
              type: 'string',
              description: 'The numeric DigitalNZ record ID to find similar records for',
            },
            mlt_fields: {
              type: 'string',
              description: 'Comma-separated list of fields to base similarity on (e.g. "title,description,subject")',
            },
            per_page: {
              type: 'number',
              description: 'Number of similar records to return (default: 5)',
            },
          },
          required: ['record_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'search_records':
          return this.searchRecords(args);
        case 'get_record':
          return this.getRecord(args);
        case 'get_more_like_this':
          return this.getMoreLikeThis(args);
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

  private buildUrl(path: string, params: Record<string, string>): string {
    params['api_key'] = this.apiKey;
    const qs = new URLSearchParams(params).toString();
    return `${this.baseUrl}${path}${qs ? '?' + qs : ''}`;
  }

  private async get(path: string, params: Record<string, string>): Promise<ToolResult> {
    const url = this.buildUrl(path, params);
    const response = await this.fetchWithRetry(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async searchRecords(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};

    if (args.text) params['text'] = args.text as string;
    if (args.category) params['and[category][]'] = args.category as string;
    if (args.content_partner) params['and[content_partner][]'] = args.content_partner as string;
    if (args.primary_collection) params['and[primary_collection][]'] = args.primary_collection as string;
    if (args.collection) params['and[collection][]'] = args.collection as string;
    if (args.usage) params['and[usage][]'] = args.usage as string;
    if (args.subject) params['and[subject][]'] = args.subject as string;
    if (args.creator) params['and[creator][]'] = args.creator as string;
    if (args.title) params['and[title][]'] = args.title as string;
    if (args.placename) params['and[placename][]'] = args.placename as string;
    if (args.year) params['and[year]'] = args.year as string;
    if (args.decade) params['and[decade]'] = args.decade as string;
    if (args.sort) params['sort'] = args.sort as string;
    if (args.direction) params['direction'] = args.direction as string;
    if (args.page) params['page'] = String(args.page);
    if (args.per_page) params['per_page'] = String(args.per_page);
    if (args.facets) params['facets'] = args.facets as string;
    if (args.facets_per_page) params['facets_per_page'] = String(args.facets_per_page);
    if (args.geo_bbox) params['geo_bbox'] = args.geo_bbox as string;

    return this.get('/records.json', params);
  }

  private async getRecord(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.record_id) {
      return { content: [{ type: 'text', text: 'record_id is required' }], isError: true };
    }
    const params: Record<string, string> = {};
    if (args.fields) params['fields'] = args.fields as string;
    return this.get(`/records/${args.record_id as string}.json`, params);
  }

  private async getMoreLikeThis(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.record_id) {
      return { content: [{ type: 'text', text: 'record_id is required' }], isError: true };
    }
    const params: Record<string, string> = {};
    if (args.mlt_fields) params['mlt_fields'] = args.mlt_fields as string;
    if (args.per_page) params['per_page'] = String(args.per_page);
    return this.get(`/records/${args.record_id as string}/more_like_this.json`, params);
  }
}

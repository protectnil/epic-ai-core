/**
 * CORE (core.ac.uk) MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None — no official CORE MCP server.
//
// Base URL: https://core.ac.uk/api-v2
// Auth: API key required via `apiKey` query parameter (or header).
//       Register for a free key at https://core.ac.uk/services#api
// Docs: https://core.ac.uk/docs/api-v2
// Rate limits: Not explicitly documented; reasonable usage expected.
// Coverage: 200M+ open-access research articles harvested from 10,000+ repositories.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface CoreAcUkConfig {
  apiKey?: string;
  baseUrl?: string;
}

export class CoreAcUkMCPServer extends MCPAdapterBase {
  private readonly apiKey: string | undefined;
  private readonly baseUrl: string;

  constructor(config: CoreAcUkConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://core.ac.uk/api-v2';
  }

  static catalog() {
    return {
      name: 'core-ac-uk',
      displayName: 'CORE (core.ac.uk)',
      version: '1.0.0',
      category: 'science',
      keywords: [
        'core', 'core.ac.uk', 'open access', 'research', 'academic', 'science',
        'articles', 'papers', 'journals', 'repositories', 'preprints',
        'fulltext', 'citations', 'DOI', 'OAI', 'CORE ID', 'harvesting',
        'institutional repository', 'open science', 'scholarly', 'publication',
        'similar articles', 'deduplication', 'PDF download', 'metadata',
      ],
      toolNames: [
        'search_articles',
        'get_article',
        'get_article_history',
        'search_articles_batch',
        'find_similar_articles',
        'deduplicate_articles',
        'search_journals',
        'get_journal',
        'search_journals_batch',
        'search_repositories',
        'get_repository',
        'search_repositories_batch',
        'search_all',
      ],
      description: 'CORE open-access research aggregator: search and retrieve 200M+ academic articles, journals, and repositories harvested from institutional repositories worldwide. Supports full-text search, similarity detection, deduplication, batch retrieval, and PDF download.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'search_articles',
        description: 'Search open-access research articles using Elasticsearch query syntax. Supports field-specific queries (title:, fullText:, authors:, doi:, year:, language.name:) and date range filters.',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query string. Supports Elasticsearch syntax: title:"machine learning", doi:"10.1186/...", year:2023, language.name:English, repositories.id:86',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            pageSize: {
              type: 'number',
              description: 'Number of results per page (default: 10)',
            },
            metadata: {
              type: 'boolean',
              description: 'Include full article metadata in results (default: true)',
            },
            fulltext: {
              type: 'boolean',
              description: 'Include full text of articles in results (default: false)',
            },
            citations: {
              type: 'boolean',
              description: 'Include citation list in results (default: false)',
            },
            similar: {
              type: 'boolean',
              description: 'Include similar articles in results (default: false)',
            },
            urls: {
              type: 'boolean',
              description: 'Include article URLs in results (default: false)',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'get_article',
        description: 'Retrieve full metadata and optionally full text for a specific article by CORE ID',
        inputSchema: {
          type: 'object',
          properties: {
            coreId: {
              type: 'number',
              description: 'CORE article ID (numeric)',
            },
            metadata: {
              type: 'boolean',
              description: 'Include full article metadata (default: true)',
            },
            fulltext: {
              type: 'boolean',
              description: 'Include full text of the article (default: false)',
            },
            citations: {
              type: 'boolean',
              description: 'Include citation list (default: false)',
            },
            similar: {
              type: 'boolean',
              description: 'Include similar articles (default: false)',
            },
            urls: {
              type: 'boolean',
              description: 'Include article URLs (default: false)',
            },
          },
          required: ['coreId'],
        },
      },
      {
        name: 'get_article_history',
        description: 'Get the version history of a CORE article — shows metadata changes and harvesting events over time',
        inputSchema: {
          type: 'object',
          properties: {
            coreId: {
              type: 'number',
              description: 'CORE article ID (numeric)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            pageSize: {
              type: 'number',
              description: 'Number of history entries per page (default: 10)',
            },
          },
          required: ['coreId'],
        },
      },
      {
        name: 'search_articles_batch',
        description: 'Execute multiple article searches in a single API call — submit an array of search queries and retrieve results for each in one request',
        inputSchema: {
          type: 'object',
          properties: {
            queries: {
              type: 'array',
              description: 'Array of search query objects, each with a "query" string and optional pagination/filter fields',
              items: {
                type: 'object',
              },
            },
            metadata: {
              type: 'boolean',
              description: 'Include metadata in all results (default: true)',
            },
            fulltext: {
              type: 'boolean',
              description: 'Include full text in all results (default: false)',
            },
            citations: {
              type: 'boolean',
              description: 'Include citations in all results (default: false)',
            },
          },
          required: ['queries'],
        },
      },
      {
        name: 'find_similar_articles',
        description: 'Find articles similar to a given article description or text — uses CORE\'s similarity engine to discover related open-access research',
        inputSchema: {
          type: 'object',
          properties: {
            doi: {
              type: 'string',
              description: 'DOI of a reference article to find similar articles for',
            },
            title: {
              type: 'string',
              description: 'Title text to find similar articles to',
            },
            description: {
              type: 'string',
              description: 'Abstract or description text to find similar articles to',
            },
            fulltext: {
              type: 'string',
              description: 'Full text to find similar articles to',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of similar articles to return (default: 10)',
            },
            metadata: {
              type: 'boolean',
              description: 'Include metadata in results (default: true)',
            },
          },
          required: [],
        },
      },
      {
        name: 'deduplicate_articles',
        description: 'Find near-duplicate articles in CORE for a given article — checks whether the same paper appears under multiple identifiers or repositories',
        inputSchema: {
          type: 'object',
          properties: {
            doi: {
              type: 'string',
              description: 'DOI of the article to deduplicate',
            },
            title: {
              type: 'string',
              description: 'Title of the article to check for duplicates',
            },
            year: {
              type: 'string',
              description: 'Publication year of the article',
            },
            description: {
              type: 'string',
              description: 'Abstract or description text',
            },
            identifier: {
              type: 'string',
              description: 'OAI or other identifier of the article',
            },
            repositoryId: {
              type: 'string',
              description: 'CORE repository ID the article belongs to',
            },
          },
          required: [],
        },
      },
      {
        name: 'search_journals',
        description: 'Search academic journals indexed in CORE by title, publisher, or ISSN',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query for journals (e.g. journal title, publisher name)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            pageSize: {
              type: 'number',
              description: 'Number of results per page (default: 10)',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'get_journal',
        description: 'Retrieve metadata for a specific journal by ISSN',
        inputSchema: {
          type: 'object',
          properties: {
            issn: {
              type: 'string',
              description: 'ISSN of the journal (e.g. "1471-2458")',
            },
          },
          required: ['issn'],
        },
      },
      {
        name: 'search_journals_batch',
        description: 'Execute multiple journal searches in a single API call — submit an array of ISSN lookups or search queries at once',
        inputSchema: {
          type: 'object',
          properties: {
            issns: {
              type: 'array',
              description: 'Array of ISSN strings to look up in batch',
              items: {
                type: 'string',
              },
            },
          },
          required: ['issns'],
        },
      },
      {
        name: 'search_repositories',
        description: 'Search repositories (institutional, subject, or preprint repositories) indexed in CORE',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query for repositories (e.g. institution name, subject area)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            pageSize: {
              type: 'number',
              description: 'Number of results per page (default: 10)',
            },
            stats: {
              type: 'boolean',
              description: 'Include repository statistics (article counts) in results (default: false)',
            },
            depositHistory: {
              type: 'boolean',
              description: 'Include deposit history in results (default: false)',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'get_repository',
        description: 'Retrieve metadata for a specific CORE repository by its CORE repository ID',
        inputSchema: {
          type: 'object',
          properties: {
            repositoryId: {
              type: 'number',
              description: 'CORE repository ID (numeric)',
            },
            stats: {
              type: 'boolean',
              description: 'Include repository statistics (article counts) (default: false)',
            },
            depositHistory: {
              type: 'boolean',
              description: 'Include deposit history (default: false)',
            },
            depositHistoryCumulative: {
              type: 'boolean',
              description: 'Include cumulative deposit history (default: false)',
            },
          },
          required: ['repositoryId'],
        },
      },
      {
        name: 'search_repositories_batch',
        description: 'Execute multiple repository searches or ID lookups in a single API call',
        inputSchema: {
          type: 'object',
          properties: {
            repositoryIds: {
              type: 'array',
              description: 'Array of CORE repository IDs (numeric) to retrieve in batch',
              items: {
                type: 'number',
              },
            },
            stats: {
              type: 'boolean',
              description: 'Include statistics for all repositories (default: false)',
            },
          },
          required: ['repositoryIds'],
        },
      },
      {
        name: 'search_all',
        description: 'Search across all CORE resource types (articles, journals, and repositories) simultaneously with a single query — returns combined results from all collections',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query string (supports Elasticsearch syntax)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            pageSize: {
              type: 'number',
              description: 'Number of results per page (default: 10)',
            },
          },
          required: ['query'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'search_articles':
          return this.searchArticles(args);
        case 'get_article':
          return this.getArticle(args);
        case 'get_article_history':
          return this.getArticleHistory(args);
        case 'search_articles_batch':
          return this.searchArticlesBatch(args);
        case 'find_similar_articles':
          return this.findSimilarArticles(args);
        case 'deduplicate_articles':
          return this.deduplicateArticles(args);
        case 'search_journals':
          return this.searchJournals(args);
        case 'get_journal':
          return this.getJournal(args);
        case 'search_journals_batch':
          return this.searchJournalsBatch(args);
        case 'search_repositories':
          return this.searchRepositories(args);
        case 'get_repository':
          return this.getRepository(args);
        case 'search_repositories_batch':
          return this.searchRepositoriesBatch(args);
        case 'search_all':
          return this.searchAll(args);
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

  private get authParam(): Record<string, string> {
    return this.apiKey ? { apiKey: this.apiKey } : {};
  }

  private get baseHeaders(): Record<string, string> {
    return { 'Content-Type': 'application/json' };
  }


  private async apiGet(path: string, params: Record<string, string> = {}): Promise<ToolResult> {
    const allParams = { ...this.authParam, ...params };
    const qs = new URLSearchParams(allParams).toString();
    const url = `${this.baseUrl}${path}${qs ? '?' + qs : ''}`;
    const response = await this.fetchWithRetry(url, { headers: this.baseHeaders });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apiPost(path: string, body: unknown, params: Record<string, string> = {}): Promise<ToolResult> {
    const allParams = { ...this.authParam, ...params };
    const qs = new URLSearchParams(allParams).toString();
    const url = `${this.baseUrl}${path}${qs ? '?' + qs : ''}`;
    const response = await this.fetchWithRetry(url, {
      method: 'POST',
      headers: this.baseHeaders,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private boolParam(params: Record<string, string>, key: string, val: unknown): void {
    if (val != null) params[key] = String(val);
  }

  private async searchArticles(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.query) return { content: [{ type: 'text', text: 'query is required' }], isError: true };
    const params: Record<string, string> = {};
    if (args.page != null) params.page = String(args.page);
    if (args.pageSize != null) params.pageSize = String(args.pageSize);
    this.boolParam(params, 'metadata', args.metadata);
    this.boolParam(params, 'fulltext', args.fulltext);
    this.boolParam(params, 'citations', args.citations);
    this.boolParam(params, 'similar', args.similar);
    this.boolParam(params, 'urls', args.urls);
    return this.apiGet(`/articles/search/${encodeURIComponent(args.query as string)}`, params);
  }

  private async getArticle(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.coreId == null) return { content: [{ type: 'text', text: 'coreId is required' }], isError: true };
    const params: Record<string, string> = {};
    this.boolParam(params, 'metadata', args.metadata);
    this.boolParam(params, 'fulltext', args.fulltext);
    this.boolParam(params, 'citations', args.citations);
    this.boolParam(params, 'similar', args.similar);
    this.boolParam(params, 'urls', args.urls);
    return this.apiGet(`/articles/get/${encodeURIComponent(String(args.coreId))}`, params);
  }

  private async getArticleHistory(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.coreId == null) return { content: [{ type: 'text', text: 'coreId is required' }], isError: true };
    const params: Record<string, string> = {};
    if (args.page != null) params.page = String(args.page);
    if (args.pageSize != null) params.pageSize = String(args.pageSize);
    return this.apiGet(`/articles/get/${encodeURIComponent(String(args.coreId))}/history`, params);
  }

  private async searchArticlesBatch(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.queries || !Array.isArray(args.queries)) {
      return { content: [{ type: 'text', text: 'queries (array) is required' }], isError: true };
    }
    const params: Record<string, string> = {};
    this.boolParam(params, 'metadata', args.metadata);
    this.boolParam(params, 'fulltext', args.fulltext);
    this.boolParam(params, 'citations', args.citations);
    return this.apiPost('/articles/search', args.queries, params);
  }

  private async findSimilarArticles(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (args.limit != null) params.limit = String(args.limit);
    this.boolParam(params, 'metadata', args.metadata);
    this.boolParam(params, 'fulltext', args.fulltext);
    this.boolParam(params, 'citations', args.citations);
    const body: Record<string, unknown> = {};
    if (args.doi) body.doi = args.doi;
    if (args.title) body.title = args.title;
    if (args.description) body.description = args.description;
    if (args.fulltext) body.fulltext = args.fulltext;
    return this.apiPost('/articles/similar', body, params);
  }

  private async deduplicateArticles(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (args.doi) params.doi = args.doi as string;
    if (args.title) params.title = args.title as string;
    if (args.year) params.year = args.year as string;
    if (args.description) params.description = args.description as string;
    if (args.identifier) params.identifier = args.identifier as string;
    if (args.repositoryId) params.repositoryId = args.repositoryId as string;
    return this.apiPost('/articles/dedup', undefined, params);
  }

  private async searchJournals(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.query) return { content: [{ type: 'text', text: 'query is required' }], isError: true };
    const params: Record<string, string> = {};
    if (args.page != null) params.page = String(args.page);
    if (args.pageSize != null) params.pageSize = String(args.pageSize);
    return this.apiGet(`/journals/search/${encodeURIComponent(args.query as string)}`, params);
  }

  private async getJournal(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.issn) return { content: [{ type: 'text', text: 'issn is required' }], isError: true };
    return this.apiGet(`/journals/get/${encodeURIComponent(args.issn as string)}`);
  }

  private async searchJournalsBatch(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.issns || !Array.isArray(args.issns)) {
      return { content: [{ type: 'text', text: 'issns (array) is required' }], isError: true };
    }
    return this.apiPost('/journals/get', args.issns);
  }

  private async searchRepositories(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.query) return { content: [{ type: 'text', text: 'query is required' }], isError: true };
    const params: Record<string, string> = {};
    if (args.page != null) params.page = String(args.page);
    if (args.pageSize != null) params.pageSize = String(args.pageSize);
    this.boolParam(params, 'stats', args.stats);
    this.boolParam(params, 'depositHistory', args.depositHistory);
    return this.apiGet(`/repositories/search/${encodeURIComponent(args.query as string)}`, params);
  }

  private async getRepository(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.repositoryId == null) return { content: [{ type: 'text', text: 'repositoryId is required' }], isError: true };
    const params: Record<string, string> = {};
    this.boolParam(params, 'stats', args.stats);
    this.boolParam(params, 'depositHistory', args.depositHistory);
    this.boolParam(params, 'depositHistoryCumulative', args.depositHistoryCumulative);
    return this.apiGet(`/repositories/get/${encodeURIComponent(String(args.repositoryId))}`, params);
  }

  private async searchRepositoriesBatch(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.repositoryIds || !Array.isArray(args.repositoryIds)) {
      return { content: [{ type: 'text', text: 'repositoryIds (array) is required' }], isError: true };
    }
    const params: Record<string, string> = {};
    this.boolParam(params, 'stats', args.stats);
    return this.apiPost('/repositories/get', args.repositoryIds, params);
  }

  private async searchAll(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.query) return { content: [{ type: 'text', text: 'query is required' }], isError: true };
    const params: Record<string, string> = {};
    if (args.page != null) params.page = String(args.page);
    if (args.pageSize != null) params.pageSize = String(args.pageSize);
    return this.apiGet(`/search/${encodeURIComponent(args.query as string)}`, params);
  }
}

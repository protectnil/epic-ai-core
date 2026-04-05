/**
 * New York Times Books API MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28 — NYT has not published an official MCP server for the Books API.
// Community MCP: None found.
// Our adapter covers: 6 tools (get bestseller list, bestseller history, list names, lists overview, list by date, book reviews).
// Recommendation: use-rest-api — no official or community MCP exists.
//
// Base URL: https://api.nytimes.com/svc/books/v3
// Auth: API key passed as query param `api-key`. Obtain at https://developer.nytimes.com/signup
// Spec: https://api.apis.guru/v2/specs/nytimes.com/books_api/3.0.0/openapi.json
// Docs: https://developer.nytimes.com/docs/books-product/1/overview
// Rate limits: 10 req/min, 4000 req/day per NYT developer plan defaults.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface NYTimesBooksApiConfig {
  apiKey: string;
  baseUrl?: string;
}

export class NYTimesBooksApiMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: NYTimesBooksApiConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = (config.baseUrl ?? 'https://api.nytimes.com/svc/books/v3').replace(/\/$/, '');
  }

  static catalog() {
    return {
      name: 'nytimes-books-api',
      displayName: 'New York Times Books API',
      version: '1.0.0',
      category: 'media' as const,
      keywords: [
        'new york times', 'nytimes', 'nyt', 'books', 'bestseller', 'bestsellers',
        'reading list', 'book reviews', 'fiction', 'nonfiction', 'hardcover',
        'e-book', 'publishing', 'literature', 'isbn', 'media',
      ],
      toolNames: [
        'get_bestseller_list',
        'get_bestseller_history',
        'get_list_names',
        'get_lists_overview',
        'get_list_by_date',
        'get_book_reviews',
      ],
      description: 'Access NYT Books API: retrieve bestseller lists and history, browse all list names, get overview of all lists, query a list for a specific date, and look up book reviews.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'get_bestseller_list',
        description: 'Get books on an NYT bestseller list, optionally filtered by list name, date, ISBN, rank, or weeks on list',
        inputSchema: {
          type: 'object',
          properties: {
            list: {
              type: 'string',
              description: 'Name of the bestseller list (e.g. "hardcover-fiction", "e-book-fiction"). Use get_list_names to discover valid values.',
            },
            date: {
              type: 'string',
              description: 'Publication date of the list (YYYY-MM-DD). Omit for current list.',
            },
            isbn: {
              type: 'string',
              description: 'Filter by ISBN-10 or ISBN-13',
            },
            bestsellers_date: {
              type: 'string',
              description: 'Week-ending sales date (YYYY-MM-DD) the list reflects',
            },
            published_date: {
              type: 'string',
              description: 'Date the list was published on NYTimes.com (YYYY-MM-DD)',
            },
            rank: {
              type: 'number',
              description: 'Filter by rank on the list',
            },
            rank_last_week: {
              type: 'number',
              description: 'Filter by rank from the prior week',
            },
            weeks_on_list: {
              type: 'number',
              description: 'Filter by number of weeks the book has been on the list',
            },
            offset: {
              type: 'number',
              description: 'Pagination offset (must be a multiple of 20)',
            },
            sort_order: {
              type: 'string',
              description: 'Sort order: "ASC" or "DESC"',
              enum: ['ASC', 'DESC'],
            },
          },
        },
      },
      {
        name: 'get_bestseller_history',
        description: 'Search the complete history of NYT bestsellers by author, title, ISBN, publisher, contributor, age group, or price',
        inputSchema: {
          type: 'object',
          properties: {
            title: {
              type: 'string',
              description: 'Book title to search for in bestseller history',
            },
            author: {
              type: 'string',
              description: 'Author name to filter bestseller history',
            },
            isbn: {
              type: 'string',
              description: 'ISBN-10 or ISBN-13 to look up bestseller history for a specific book',
            },
            publisher: {
              type: 'string',
              description: 'Publisher name filter',
            },
            contributor: {
              type: 'string',
              description: 'Contributor (e.g. "by John Smith") filter',
            },
            age_group: {
              type: 'string',
              description: 'Age group filter (e.g. "Young Adult")',
            },
            price: {
              type: 'number',
              description: 'Price filter',
            },
          },
        },
      },
      {
        name: 'get_list_names',
        description: 'Retrieve all available NYT bestseller list names, frequencies, and date ranges',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_lists_overview',
        description: 'Get an overview of all NYT bestseller lists for a given publication date, returning the top book on each list',
        inputSchema: {
          type: 'object',
          properties: {
            published_date: {
              type: 'string',
              description: 'Publication date (YYYY-MM-DD) to retrieve the overview for. Omit for the most recent overview.',
            },
          },
        },
      },
      {
        name: 'get_list_by_date',
        description: 'Get a specific NYT bestseller list for a given date, returning the full ranked list of books',
        inputSchema: {
          type: 'object',
          properties: {
            date: {
              type: 'string',
              description: 'Publication date of the list (YYYY-MM-DD) or "current" for the most recent',
            },
            list: {
              type: 'string',
              description: 'Bestseller list name (e.g. "hardcover-fiction"). Use get_list_names to discover valid values.',
            },
            isbn: {
              type: 'string',
              description: 'Filter by ISBN',
            },
            published_date: {
              type: 'string',
              description: 'Date the list was published (YYYY-MM-DD)',
            },
            bestsellers_date: {
              type: 'string',
              description: 'Week-ending sales date (YYYY-MM-DD)',
            },
            weeks_on_list: {
              type: 'number',
              description: 'Filter by weeks on list',
            },
            rank: {
              type: 'number',
              description: 'Filter by rank',
            },
            rank_last_week: {
              type: 'number',
              description: 'Filter by prior-week rank',
            },
            offset: {
              type: 'number',
              description: 'Pagination offset (multiple of 20)',
            },
            sort_order: {
              type: 'string',
              description: 'Sort order: "ASC" or "DESC"',
              enum: ['ASC', 'DESC'],
            },
          },
          required: ['date', 'list'],
        },
      },
      {
        name: 'get_book_reviews',
        description: 'Retrieve NYT book reviews by ISBN, book title, or author name',
        inputSchema: {
          type: 'object',
          properties: {
            isbn: {
              type: 'string',
              description: 'ISBN-10 or ISBN-13 of the book to look up reviews for',
            },
            title: {
              type: 'string',
              description: 'Book title to search reviews for',
            },
            author: {
              type: 'string',
              description: 'Author name to search reviews for',
            },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'get_bestseller_list':
          return this.getBestsellerList(args);
        case 'get_bestseller_history':
          return this.getBestsellerHistory(args);
        case 'get_list_names':
          return this.getListNames();
        case 'get_lists_overview':
          return this.getListsOverview(args);
        case 'get_list_by_date':
          return this.getListByDate(args);
        case 'get_book_reviews':
          return this.getBookReviews(args);
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

  private async nytGet(path: string, params?: Record<string, string>): Promise<ToolResult> {
    const allParams: Record<string, string> = { 'api-key': this.apiKey, ...params };
    const qs = new URLSearchParams(allParams).toString();
    const url = `${this.baseUrl}${path}?${qs}`;
    const response = await this.fetchWithRetry(url, {
      method: 'GET',
      headers: { 'User-Agent': 'EpicAI-NYTimesBooks-Adapter/1.0' },
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `NYT Books API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getBestsellerList(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (args.list) params.list = args.list as string;
    if (args.date) params.date = args.date as string;
    if (args.isbn) params.isbn = args.isbn as string;
    if (args.bestsellers_date) params['bestsellers-date'] = args.bestsellers_date as string;
    if (args.published_date) params['published-date'] = args.published_date as string;
    if (args.rank !== undefined) params.rank = String(args.rank);
    if (args.rank_last_week !== undefined) params['rank-last-week'] = String(args.rank_last_week);
    if (args.weeks_on_list !== undefined) params['weeks-on-list'] = String(args.weeks_on_list);
    if (args.offset !== undefined) params.offset = String(args.offset);
    if (args.sort_order) params['sort-order'] = args.sort_order as string;
    return this.nytGet('/lists.json', params);
  }

  private async getBestsellerHistory(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (args.title) params.title = args.title as string;
    if (args.author) params.author = args.author as string;
    if (args.isbn) params.isbn = args.isbn as string;
    if (args.publisher) params.publisher = args.publisher as string;
    if (args.contributor) params.contributor = args.contributor as string;
    if (args.age_group) params['age-group'] = args.age_group as string;
    if (args.price !== undefined) params.price = String(args.price);
    return this.nytGet('/lists/best-sellers/history.json', params);
  }

  private async getListNames(): Promise<ToolResult> {
    return this.nytGet('/lists/names.json');
  }

  private async getListsOverview(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (args.published_date) params.published_date = args.published_date as string;
    return this.nytGet('/lists/overview.json', params);
  }

  private async getListByDate(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.date || !args.list) {
      return { content: [{ type: 'text', text: 'date and list are required' }], isError: true };
    }
    const date = args.date as string;
    const list = args.list as string;
    const params: Record<string, string> = {};
    if (args.isbn) params.isbn = args.isbn as string;
    if (args.published_date) params['published-date'] = args.published_date as string;
    if (args.bestsellers_date) params['bestsellers-date'] = args.bestsellers_date as string;
    if (args.weeks_on_list !== undefined) params['weeks-on-list'] = String(args.weeks_on_list);
    if (args.rank !== undefined) params.rank = String(args.rank);
    if (args.rank_last_week !== undefined) params['rank-last-week'] = String(args.rank_last_week);
    if (args.offset !== undefined) params.offset = String(args.offset);
    if (args.sort_order) params['sort-order'] = args.sort_order as string;
    return this.nytGet(`/lists/${encodeURIComponent(date)}/${encodeURIComponent(list)}.json`, params);
  }

  private async getBookReviews(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (args.isbn) params.isbn = args.isbn as string;
    if (args.title) params.title = args.title as string;
    if (args.author) params.author = args.author as string;
    return this.nytGet('/reviews.json', params);
  }
}

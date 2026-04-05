/**
 * Figshare MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Base URL: https://api.figshare.com/v2
// Auth: OAuth2 Bearer token
// Docs: https://docs.figshare.com/
// Rate limits: Standard API rate limits per token

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface FigshareConfig {
  /** OAuth2 access token */
  accessToken: string;
  /** Base URL — defaults to https://api.figshare.com/v2 */
  baseUrl?: string;
}

export class FigshareMCPServer extends MCPAdapterBase {
  private readonly accessToken: string;
  private readonly baseUrl: string;

  constructor(config: FigshareConfig) {
    super();
    this.accessToken = config.accessToken;
    this.baseUrl = config.baseUrl ?? 'https://api.figshare.com/v2';
  }

  static catalog() {
    return {
      name: 'figshare',
      displayName: 'Figshare',
      version: '1.0.0',
      category: 'science' as const,
      keywords: ['figshare', 'research', 'data', 'articles', 'datasets', 'collections', 'projects', 'doi', 'publish', 'science', 'academic'],
      toolNames: [
        'get_account',
        'list_articles',
        'create_article',
        'get_article',
        'update_article',
        'delete_article',
        'publish_article',
        'reserve_article_doi',
        'list_article_files',
        'search_articles',
        'list_collections',
        'create_collection',
        'get_collection',
        'update_collection',
        'delete_collection',
        'publish_collection',
        'list_projects',
        'create_project',
        'get_project',
        'update_project',
        'delete_project',
        'list_project_articles',
        'create_project_article',
      ],
      description: 'Figshare research data repository: manage articles, datasets, collections, and projects. Supports DOI reservation, file uploads, and publishing.',
      author: 'protectnil' as const,
    };
  }

  get tools(): ToolDefinition[] {
    return [
      // Account
      {
        name: 'get_account',
        description: 'Retrieve private account information for the authenticated Figshare user.',
        inputSchema: { type: 'object', properties: {} },
      },
      // Articles
      {
        name: 'list_articles',
        description: 'List private articles owned by the authenticated user. Supports pagination.',
        inputSchema: {
          type: 'object',
          properties: {
            page: { type: 'number', description: 'Page number for pagination (optional, default 1)' },
            page_size: { type: 'number', description: 'Number of results per page (optional, max 100)' },
          },
        },
      },
      {
        name: 'create_article',
        description: 'Create a new private article (dataset, figure, media, etc.) on Figshare.',
        inputSchema: {
          type: 'object',
          properties: {
            title: { type: 'string', description: 'Title of the article' },
            description: { type: 'string', description: 'Description / abstract for the article (optional)' },
            tags: { type: 'array', items: { type: 'string' }, description: 'List of tags for the article (optional)' },
            categories: { type: 'array', items: { type: 'number' }, description: 'List of category IDs (optional)' },
            authors: { type: 'array', items: { type: 'object' }, description: 'List of author objects { name: string } (optional)' },
            defined_type: { type: 'string', description: 'Article type: figure, media, dataset, poster, paper, presentation, thesis, code, metadata, preprint (optional)' },
            license: { type: 'number', description: 'License ID (optional)' },
          },
          required: ['title'],
        },
      },
      {
        name: 'get_article',
        description: 'Retrieve details of a private article by article ID.',
        inputSchema: {
          type: 'object',
          properties: {
            article_id: { type: 'number', description: 'Article ID' },
          },
          required: ['article_id'],
        },
      },
      {
        name: 'update_article',
        description: 'Update metadata of an existing private article.',
        inputSchema: {
          type: 'object',
          properties: {
            article_id: { type: 'number', description: 'Article ID to update' },
            title: { type: 'string', description: 'New title (optional)' },
            description: { type: 'string', description: 'New description (optional)' },
            tags: { type: 'array', items: { type: 'string' }, description: 'New list of tags (optional)' },
            categories: { type: 'array', items: { type: 'number' }, description: 'New list of category IDs (optional)' },
            authors: { type: 'array', items: { type: 'object' }, description: 'New list of author objects (optional)' },
            defined_type: { type: 'string', description: 'Article type (optional)' },
            license: { type: 'number', description: 'License ID (optional)' },
          },
          required: ['article_id'],
        },
      },
      {
        name: 'delete_article',
        description: 'Delete a private article by article ID. This cannot be undone.',
        inputSchema: {
          type: 'object',
          properties: {
            article_id: { type: 'number', description: 'Article ID to delete' },
          },
          required: ['article_id'],
        },
      },
      {
        name: 'publish_article',
        description: 'Publish a private article, making it publicly visible on Figshare.',
        inputSchema: {
          type: 'object',
          properties: {
            article_id: { type: 'number', description: 'Article ID to publish' },
          },
          required: ['article_id'],
        },
      },
      {
        name: 'reserve_article_doi',
        description: 'Reserve a DOI for a private article before publishing.',
        inputSchema: {
          type: 'object',
          properties: {
            article_id: { type: 'number', description: 'Article ID to reserve a DOI for' },
          },
          required: ['article_id'],
        },
      },
      {
        name: 'list_article_files',
        description: 'List all files attached to a private article.',
        inputSchema: {
          type: 'object',
          properties: {
            article_id: { type: 'number', description: 'Article ID' },
          },
          required: ['article_id'],
        },
      },
      {
        name: 'search_articles',
        description: 'Search private articles by keyword, with optional filters.',
        inputSchema: {
          type: 'object',
          properties: {
            search_for: { type: 'string', description: 'Search query string' },
            page: { type: 'number', description: 'Page number for pagination (optional)' },
            page_size: { type: 'number', description: 'Results per page (optional, max 100)' },
            order: { type: 'string', description: 'Sort order field: published_date, modified_date, views, shares, downloads, cites (optional)' },
            order_direction: { type: 'string', description: 'Sort direction: asc or desc (optional)' },
          },
          required: ['search_for'],
        },
      },
      // Collections
      {
        name: 'list_collections',
        description: 'List private collections owned by the authenticated user.',
        inputSchema: {
          type: 'object',
          properties: {
            page: { type: 'number', description: 'Page number (optional)' },
            page_size: { type: 'number', description: 'Results per page (optional, max 100)' },
          },
        },
      },
      {
        name: 'create_collection',
        description: 'Create a new private collection grouping multiple articles.',
        inputSchema: {
          type: 'object',
          properties: {
            title: { type: 'string', description: 'Collection title' },
            description: { type: 'string', description: 'Collection description (optional)' },
            articles: { type: 'array', items: { type: 'number' }, description: 'List of article IDs to include (optional)' },
            tags: { type: 'array', items: { type: 'string' }, description: 'List of tags (optional)' },
          },
          required: ['title'],
        },
      },
      {
        name: 'get_collection',
        description: 'Retrieve details of a private collection by collection ID.',
        inputSchema: {
          type: 'object',
          properties: {
            collection_id: { type: 'number', description: 'Collection ID' },
          },
          required: ['collection_id'],
        },
      },
      {
        name: 'update_collection',
        description: 'Update metadata of an existing private collection.',
        inputSchema: {
          type: 'object',
          properties: {
            collection_id: { type: 'number', description: 'Collection ID to update' },
            title: { type: 'string', description: 'New title (optional)' },
            description: { type: 'string', description: 'New description (optional)' },
            tags: { type: 'array', items: { type: 'string' }, description: 'New tags (optional)' },
          },
          required: ['collection_id'],
        },
      },
      {
        name: 'delete_collection',
        description: 'Delete a private collection by collection ID.',
        inputSchema: {
          type: 'object',
          properties: {
            collection_id: { type: 'number', description: 'Collection ID to delete' },
          },
          required: ['collection_id'],
        },
      },
      {
        name: 'publish_collection',
        description: 'Publish a private collection, making it publicly visible on Figshare.',
        inputSchema: {
          type: 'object',
          properties: {
            collection_id: { type: 'number', description: 'Collection ID to publish' },
          },
          required: ['collection_id'],
        },
      },
      // Projects
      {
        name: 'list_projects',
        description: 'List private projects owned by the authenticated user.',
        inputSchema: {
          type: 'object',
          properties: {
            page: { type: 'number', description: 'Page number (optional)' },
            page_size: { type: 'number', description: 'Results per page (optional, max 100)' },
          },
        },
      },
      {
        name: 'create_project',
        description: 'Create a new private research project on Figshare.',
        inputSchema: {
          type: 'object',
          properties: {
            title: { type: 'string', description: 'Project title' },
            description: { type: 'string', description: 'Project description (optional)' },
            funding: { type: 'string', description: 'Funding information (optional)' },
          },
          required: ['title'],
        },
      },
      {
        name: 'get_project',
        description: 'Retrieve details of a private project by project ID.',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: { type: 'number', description: 'Project ID' },
          },
          required: ['project_id'],
        },
      },
      {
        name: 'update_project',
        description: 'Update metadata of an existing private project.',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: { type: 'number', description: 'Project ID to update' },
            title: { type: 'string', description: 'New title (optional)' },
            description: { type: 'string', description: 'New description (optional)' },
            funding: { type: 'string', description: 'Updated funding information (optional)' },
          },
          required: ['project_id'],
        },
      },
      {
        name: 'delete_project',
        description: 'Delete a private project by project ID.',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: { type: 'number', description: 'Project ID to delete' },
          },
          required: ['project_id'],
        },
      },
      {
        name: 'list_project_articles',
        description: 'List all articles belonging to a private project.',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: { type: 'number', description: 'Project ID' },
          },
          required: ['project_id'],
        },
      },
      {
        name: 'create_project_article',
        description: 'Add an existing article to a private project, or create a new article within the project.',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: { type: 'number', description: 'Project ID' },
            title: { type: 'string', description: 'Article title' },
            description: { type: 'string', description: 'Article description (optional)' },
            defined_type: { type: 'string', description: 'Article type (optional)' },
            tags: { type: 'array', items: { type: 'string' }, description: 'Tags (optional)' },
          },
          required: ['project_id', 'title'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'get_account':
          return await this.request('GET', '/account');
        case 'list_articles': {
          const params = new URLSearchParams();
          if (args.page != null) params.set('page', String(args.page));
          if (args.page_size != null) params.set('page_size', String(args.page_size));
          const qs = params.toString() ? `?${params.toString()}` : '';
          return await this.request('GET', `/account/articles${qs}`);
        }
        case 'create_article': {
          const body: Record<string, unknown> = { title: args.title };
          if (args.description) body['description'] = args.description;
          if (args.tags) body['tags'] = args.tags;
          if (args.categories) body['categories'] = args.categories;
          if (args.authors) body['authors'] = args.authors;
          if (args.defined_type) body['defined_type'] = args.defined_type;
          if (args.license != null) body['license'] = args.license;
          return await this.request('POST', '/account/articles', body);
        }
        case 'get_article':
          return await this.request('GET', `/account/articles/${args.article_id as number}`);
        case 'update_article': {
          const articleId = args.article_id as number;
          const body: Record<string, unknown> = {};
          if (args.title) body['title'] = args.title;
          if (args.description) body['description'] = args.description;
          if (args.tags) body['tags'] = args.tags;
          if (args.categories) body['categories'] = args.categories;
          if (args.authors) body['authors'] = args.authors;
          if (args.defined_type) body['defined_type'] = args.defined_type;
          if (args.license != null) body['license'] = args.license;
          return await this.request('PUT', `/account/articles/${articleId}`, body);
        }
        case 'delete_article':
          return await this.request('DELETE', `/account/articles/${args.article_id as number}`);
        case 'publish_article':
          return await this.request('POST', `/account/articles/${args.article_id as number}/publish`);
        case 'reserve_article_doi':
          return await this.request('POST', `/account/articles/${args.article_id as number}/reserve_doi`);
        case 'list_article_files':
          return await this.request('GET', `/account/articles/${args.article_id as number}/files`);
        case 'search_articles': {
          const body: Record<string, unknown> = { search_for: args.search_for };
          if (args.page != null) body['page'] = args.page;
          if (args.page_size != null) body['page_size'] = args.page_size;
          if (args.order) body['order'] = args.order;
          if (args.order_direction) body['order_direction'] = args.order_direction;
          return await this.request('POST', '/account/articles/search', body);
        }
        case 'list_collections': {
          const params = new URLSearchParams();
          if (args.page != null) params.set('page', String(args.page));
          if (args.page_size != null) params.set('page_size', String(args.page_size));
          const qs = params.toString() ? `?${params.toString()}` : '';
          return await this.request('GET', `/account/collections${qs}`);
        }
        case 'create_collection': {
          const body: Record<string, unknown> = { title: args.title };
          if (args.description) body['description'] = args.description;
          if (args.articles) body['articles'] = args.articles;
          if (args.tags) body['tags'] = args.tags;
          return await this.request('POST', '/account/collections', body);
        }
        case 'get_collection':
          return await this.request('GET', `/account/collections/${args.collection_id as number}`);
        case 'update_collection': {
          const collectionId = args.collection_id as number;
          const body: Record<string, unknown> = {};
          if (args.title) body['title'] = args.title;
          if (args.description) body['description'] = args.description;
          if (args.tags) body['tags'] = args.tags;
          return await this.request('PUT', `/account/collections/${collectionId}`, body);
        }
        case 'delete_collection':
          return await this.request('DELETE', `/account/collections/${args.collection_id as number}`);
        case 'publish_collection':
          return await this.request('POST', `/account/collections/${args.collection_id as number}/publish`);
        case 'list_projects': {
          const params = new URLSearchParams();
          if (args.page != null) params.set('page', String(args.page));
          if (args.page_size != null) params.set('page_size', String(args.page_size));
          const qs = params.toString() ? `?${params.toString()}` : '';
          return await this.request('GET', `/account/projects${qs}`);
        }
        case 'create_project': {
          const body: Record<string, unknown> = { title: args.title };
          if (args.description) body['description'] = args.description;
          if (args.funding) body['funding'] = args.funding;
          return await this.request('POST', '/account/projects', body);
        }
        case 'get_project':
          return await this.request('GET', `/account/projects/${args.project_id as number}`);
        case 'update_project': {
          const projectId = args.project_id as number;
          const body: Record<string, unknown> = {};
          if (args.title) body['title'] = args.title;
          if (args.description) body['description'] = args.description;
          if (args.funding) body['funding'] = args.funding;
          return await this.request('PUT', `/account/projects/${projectId}`, body);
        }
        case 'delete_project':
          return await this.request('DELETE', `/account/projects/${args.project_id as number}`);
        case 'list_project_articles':
          return await this.request('GET', `/account/projects/${args.project_id as number}/articles`);
        case 'create_project_article': {
          const projectId = args.project_id as number;
          const body: Record<string, unknown> = { title: args.title };
          if (args.description) body['description'] = args.description;
          if (args.defined_type) body['defined_type'] = args.defined_type;
          if (args.tags) body['tags'] = args.tags;
          return await this.request('POST', `/account/projects/${projectId}/articles`, body);
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

  private async request(method: string, path: string, body?: unknown): Promise<ToolResult> {
    const init: RequestInit = {
      method,
      headers: {
        'Authorization': `token ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
    };
    if (body !== undefined) {
      init.body = JSON.stringify(body);
    }
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, init);
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `Figshare API error ${response.status}: ${errText}` }], isError: true };
    }
    // Some DELETE endpoints return 204 with no body
    if (response.status === 204) {
      return { content: [{ type: 'text', text: '{}' }], isError: false };
    }
    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new Error(`Figshare API returned non-JSON response (HTTP ${response.status})`);
    }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };

  }
}

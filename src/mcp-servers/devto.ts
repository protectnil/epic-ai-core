/**
 * Dev.to (Forem) MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28.
// No official Dev.to or Forem MCP server found. One community repo (Siddhant-K-code/mcp-devto-server)
// was archived June 2025, 2 stars — not official and unmaintained.
// Our adapter covers: 13 tools (articles, users, comments, tags, organizations, reading-list).
//
// Note: search_articles (GET /articles/search), follow_tags (PUT /follows/tags), and
// list_organizations were removed — none of these endpoints exist in the Forem v1 API.
// Only GET /followed_tags exists; tag follow/unfollow is not exposed via the v1 API.
//
// Base URL: https://dev.to/api  (Forem self-hosted: https://your-instance.com/api)
// Auth: API key header — api-key: {your_key}
//   Generate at https://dev.to/settings/extensions → DEV Community API Keys.
//   Read-only operations work without a key on public data.
// Docs: https://developers.forem.com/api/v1
// Rate limits: 10 req/s per API key for write operations. Read operations are more permissive.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface DevToConfig {
  /** API key from dev.to/settings/extensions */
  apiKey: string;
  /** Override base URL for Forem self-hosted instances; defaults to https://dev.to/api */
  baseUrl?: string;
}

export class DevToMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: DevToConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = (config.baseUrl || 'https://dev.to/api').replace(/\/$/, '');
  }

  static catalog() {
    return {
      name: 'devto',
      displayName: 'Dev.to',
      version: '1.0.0',
      category: 'social' as const,
      keywords: ['devto', 'dev.to', 'forem', 'developer', 'blog', 'article', 'post', 'community', 'tech-blog', 'programming', 'content', 'publication'],
      toolNames: [
        'list_articles', 'get_article', 'create_article', 'update_article',
        'get_my_articles',
        'list_comments', 'get_comment',
        'get_user', 'get_my_profile',
        'list_tags',
        'get_organization', 'list_organization_articles',
        'list_reading_list',
      ],
      description: 'Manage Dev.to content: read and publish articles, search posts, manage comments, user profiles, tags, organizations, and reading lists.',
      author: 'protectnil',
    };
  }

  private get headers(): Record<string, string> {
    return {
      'api-key': this.apiKey,
      Accept: 'application/vnd.forem.api-v1+json',
      'Content-Type': 'application/json',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_articles',
        description: 'List published Dev.to articles with optional filters for tag, username, state, and pagination.',
        inputSchema: {
          type: 'object',
          properties: {
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1).',
            },
            per_page: {
              type: 'number',
              description: 'Number of articles per page (default: 30, max: 1000).',
            },
            tag: {
              type: 'string',
              description: 'Filter articles by tag slug (e.g. "javascript", "python").',
            },
            username: {
              type: 'string',
              description: 'Filter articles by author username.',
            },
            state: {
              type: 'string',
              description: 'Article listing state: fresh (recent), rising (trending), all (default: all).',
            },
            top: {
              type: 'number',
              description: 'Number of days to filter top-trending articles by (e.g. 7 for top articles in 7 days).',
            },
            collection_id: {
              type: 'number',
              description: 'Filter articles by series/collection ID.',
            },
          },
        },
      },
      {
        name: 'get_article',
        description: 'Retrieve full details for a single Dev.to article by its numeric ID, including body, tags, and reactions.',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'number',
              description: 'Dev.to article ID.',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'create_article',
        description: 'Publish a new article on Dev.to with title, markdown body, tags, and optional canonical URL.',
        inputSchema: {
          type: 'object',
          properties: {
            title: {
              type: 'string',
              description: 'Article title.',
            },
            body_markdown: {
              type: 'string',
              description: 'Article body in Markdown format.',
            },
            published: {
              type: 'boolean',
              description: 'Whether to publish immediately (default: false — saves as draft).',
            },
            tags: {
              type: 'array',
              description: 'Array of tag strings to apply (max 4 tags, e.g. ["javascript", "webdev"]).',
              items: { type: 'string' },
            },
            canonical_url: {
              type: 'string',
              description: 'Original URL if cross-posting from another site.',
            },
            description: {
              type: 'string',
              description: 'Short description/excerpt shown in article previews.',
            },
            series: {
              type: 'string',
              description: 'Name of a series/collection to add this article to.',
            },
          },
          required: ['title', 'body_markdown'],
        },
      },
      {
        name: 'update_article',
        description: 'Update an existing Dev.to article by ID, modifying title, body, tags, publish status, or canonical URL.',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'number',
              description: 'Dev.to article ID to update.',
            },
            title: {
              type: 'string',
              description: 'New article title (optional).',
            },
            body_markdown: {
              type: 'string',
              description: 'New article body in Markdown format (optional).',
            },
            published: {
              type: 'boolean',
              description: 'Change publish status: true to publish, false to unpublish (optional).',
            },
            tags: {
              type: 'array',
              description: 'New array of tag strings (max 4 tags, optional).',
              items: { type: 'string' },
            },
            canonical_url: {
              type: 'string',
              description: 'Updated canonical URL (optional).',
            },
            description: {
              type: 'string',
              description: 'Updated short description/excerpt (optional).',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'get_my_articles',
        description: 'List articles published by the authenticated user, with optional status filter (published, unpublished, all).',
        inputSchema: {
          type: 'object',
          properties: {
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1).',
            },
            per_page: {
              type: 'number',
              description: 'Number of articles per page (default: 30, max: 1000).',
            },
            status: {
              type: 'string',
              description: 'Filter by publication status: published, unpublished, all (default: published).',
            },
          },
        },
      },
      {
        name: 'list_comments',
        description: 'List comments for a Dev.to article or podcast episode, with optional pagination.',
        inputSchema: {
          type: 'object',
          properties: {
            a_id: {
              type: 'number',
              description: 'Article ID to retrieve comments for.',
            },
            p_id: {
              type: 'number',
              description: 'Podcast episode ID to retrieve comments for.',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1).',
            },
          },
        },
      },
      {
        name: 'get_comment',
        description: 'Retrieve a single Dev.to comment by its ID, including nested child comments.',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Dev.to comment ID (alphanumeric string).',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'get_user',
        description: 'Retrieve public profile details for a Dev.to user by username, including bio, article count, and join date.',
        inputSchema: {
          type: 'object',
          properties: {
            username: {
              type: 'string',
              description: 'Dev.to username (e.g. "ben").',
            },
          },
          required: ['username'],
        },
      },
      {
        name: 'get_my_profile',
        description: 'Retrieve the authenticated user\'s full Dev.to profile, including email and private fields.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'list_tags',
        description: 'List popular Dev.to tags with follower counts and tag descriptions, with optional pagination.',
        inputSchema: {
          type: 'object',
          properties: {
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1).',
            },
            per_page: {
              type: 'number',
              description: 'Number of tags per page (default: 10, max: 1000).',
            },
          },
        },
      },
      {
        name: 'get_organization',
        description: 'Retrieve public details for a Dev.to organization by its username slug.',
        inputSchema: {
          type: 'object',
          properties: {
            username: {
              type: 'string',
              description: 'Organization username slug.',
            },
          },
          required: ['username'],
        },
      },
      {
        name: 'list_organization_articles',
        description: 'List articles published by a Dev.to organization, with pagination support.',
        inputSchema: {
          type: 'object',
          properties: {
            username: {
              type: 'string',
              description: 'Organization username slug.',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1).',
            },
            per_page: {
              type: 'number',
              description: 'Number of articles per page (default: 30).',
            },
          },
          required: ['username'],
        },
      },
      {
        name: 'list_reading_list',
        description: 'List articles saved to the authenticated user\'s Dev.to reading list, with optional pagination.',
        inputSchema: {
          type: 'object',
          properties: {
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1).',
            },
            per_page: {
              type: 'number',
              description: 'Number of items per page (default: 30, max: 1000).',
            },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_articles':
          return await this.listArticles(args);
        case 'get_article':
          return await this.getArticle(args);
        case 'create_article':
          return await this.createArticle(args);
        case 'update_article':
          return await this.updateArticle(args);
        case 'get_my_articles':
          return await this.getMyArticles(args);
        case 'list_comments':
          return await this.listComments(args);
        case 'get_comment':
          return await this.getComment(args);
        case 'get_user':
          return await this.getUser(args);
        case 'get_my_profile':
          return await this.getMyProfile();
        case 'list_tags':
          return await this.listTags(args);
        case 'get_organization':
          return await this.getOrganization(args);
        case 'list_organization_articles':
          return await this.listOrganizationArticles(args);
        case 'list_reading_list':
          return await this.listReadingList(args);
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

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------


  private async request(path: string, options: RequestInit = {}): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'GET',
      ...options,
      headers: { ...this.headers, ...(options.headers as Record<string, string> || {}) },
    });

    if (!response.ok) {
      let errBody = '';
      try { errBody = await response.text(); } catch { /* ignore */ }
      return {
        content: [{ type: 'text', text: `API error: HTTP ${response.status} ${response.statusText}${errBody ? ` — ${errBody.slice(0, 500)}` : ''}` }],
        isError: true,
      };
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new Error(`Dev.to returned non-JSON response (HTTP ${response.status})`);
    }

    return {
      content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }],
      isError: false,
    };
  }

  private async listArticles(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.page != null) params.set('page', String(args.page as number));
    if (args.per_page != null) params.set('per_page', String(args.per_page as number));
    if (args.tag) params.set('tag', args.tag as string);
    if (args.username) params.set('username', args.username as string);
    if (args.state) params.set('state', args.state as string);
    if (args.top != null) params.set('top', String(args.top as number));
    if (args.collection_id != null) params.set('collection_id', String(args.collection_id as number));
    const qs = params.toString() ? `?${params}` : '';
    return this.request(`/articles${qs}`);
  }

  private async getArticle(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.id as number;
    if (!id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.request(`/articles/${id}`);
  }

  private async createArticle(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.title) return { content: [{ type: 'text', text: 'title is required' }], isError: true };
    if (!args.body_markdown) return { content: [{ type: 'text', text: 'body_markdown is required' }], isError: true };

    const article: Record<string, unknown> = {
      title: args.title,
      body_markdown: args.body_markdown,
      published: args.published ?? false,
    };
    if (args.tags) article.tags = args.tags;
    if (args.canonical_url) article.canonical_url = args.canonical_url;
    if (args.description) article.description = args.description;
    if (args.series) article.series = args.series;

    return this.request('/articles', {
      method: 'POST',
      body: JSON.stringify({ article }),
    });
  }

  private async updateArticle(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.id as number;
    if (!id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };

    const article: Record<string, unknown> = {};
    if (args.title != null) article.title = args.title;
    if (args.body_markdown != null) article.body_markdown = args.body_markdown;
    if (typeof args.published === 'boolean') article.published = args.published;
    if (args.tags != null) article.tags = args.tags;
    if (args.canonical_url != null) article.canonical_url = args.canonical_url;
    if (args.description != null) article.description = args.description;

    return this.request(`/articles/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ article }),
    });
  }

  private async getMyArticles(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.page != null) params.set('page', String(args.page as number));
    if (args.per_page != null) params.set('per_page', String(args.per_page as number));
    if (args.status) params.set('status', args.status as string);
    const qs = params.toString() ? `?${params}` : '';
    return this.request(`/articles/me${qs}`);
  }

  private async listComments(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.a_id != null) params.set('a_id', String(args.a_id as number));
    if (args.p_id != null) params.set('p_id', String(args.p_id as number));
    if (args.page != null) params.set('page', String(args.page as number));
    const qs = params.toString() ? `?${params}` : '';
    return this.request(`/comments${qs}`);
  }

  private async getComment(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.id as string;
    if (!id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.request(`/comments/${encodeURIComponent(id)}`);
  }

  private async getUser(args: Record<string, unknown>): Promise<ToolResult> {
    const username = args.username as string;
    if (!username) return { content: [{ type: 'text', text: 'username is required' }], isError: true };
    return this.request(`/users/by_username?url=${encodeURIComponent(username)}`);
  }

  private async getMyProfile(): Promise<ToolResult> {
    return this.request('/users/me');
  }

  private async listTags(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.page != null) params.set('page', String(args.page as number));
    if (args.per_page != null) params.set('per_page', String(args.per_page as number));
    const qs = params.toString() ? `?${params}` : '';
    return this.request(`/tags${qs}`);
  }

  private async getOrganization(args: Record<string, unknown>): Promise<ToolResult> {
    const username = args.username as string;
    if (!username) return { content: [{ type: 'text', text: 'username is required' }], isError: true };
    return this.request(`/organizations/${encodeURIComponent(username)}`);
  }

  private async listOrganizationArticles(args: Record<string, unknown>): Promise<ToolResult> {
    const username = args.username as string;
    if (!username) return { content: [{ type: 'text', text: 'username is required' }], isError: true };
    const params = new URLSearchParams();
    if (args.page != null) params.set('page', String(args.page as number));
    if (args.per_page != null) params.set('per_page', String(args.per_page as number));
    const qs = params.toString() ? `?${params}` : '';
    return this.request(`/organizations/${encodeURIComponent(username)}/articles${qs}`);
  }

  private async listReadingList(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.page != null) params.set('page', String(args.page as number));
    if (args.per_page != null) params.set('per_page', String(args.per_page as number));
    const qs = params.toString() ? `?${params}` : '';
    return this.request(`/readinglist${qs}`);
  }
}

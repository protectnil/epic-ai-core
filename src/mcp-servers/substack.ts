/**
 * Substack MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// Substack has no official public API or official MCP server. No entries found on GitHub or npmjs.com.
// All endpoints below are the private API reverse-engineered from browser network traffic.
// They are undocumented, unversioned by Substack, and subject to change without notice.
// Reference implementations: github.com/jakub-k-slys/substack-api (TypeScript, entity-based client),
//   github.com/NHagar/substack_api (Python), substack-api.readthedocs.io (community docs).
//
// Base URL (global): https://substack.com/api/v1
// Base URL (per-publication): https://{subdomain}.substack.com/api/v1
// Auth: Cookie-based — Substack uses connect.sid session cookie. No Bearer token or API key scheme.
//   Obtain connect.sid by logging in at substack.com and copying from DevTools → Application → Cookies.
//   Some read endpoints (public archives, publication metadata) work without authentication.
// Docs: None (private API). See community reverse engineering at substack-api.readthedocs.io
// Rate limits: Undocumented. Practical limit approximately 60 requests/min before throttling.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface SubstackConfig {
  /**
   * Value of the connect.sid session cookie from a logged-in Substack session.
   * Required for subscriber management. Optional for public post/publication reads.
   */
  sessionCookie?: string;
}

export class SubstackMCPServer extends MCPAdapterBase {
  private readonly globalApiBase = 'https://substack.com/api/v1';
  private readonly cookieHeader: string;

  constructor(config: SubstackConfig) {
    super();
    this.cookieHeader = config.sessionCookie ? `connect.sid=${config.sessionCookie}` : '';
  }

  static catalog() {
    return {
      name: 'substack',
      displayName: 'Substack',
      version: '1.0.0',
      category: 'social' as const,
      keywords: ['substack', 'newsletter', 'publication', 'post', 'subscriber', 'note', 'comment', 'writer', 'content', 'media'],
      toolNames: [
        'list_posts', 'get_post', 'get_publication',
        'search_publications', 'list_comments', 'get_comment_thread',
        'list_subscribers', 'list_notes', 'get_writer_profile',
      ],
      description: 'Read Substack publications, posts, comments, notes, and subscriber data via the unofficial private Substack API.',
      author: 'protectnil' as const,
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_posts',
        description: 'List posts from a Substack publication archive, sorted by newest or most popular.',
        inputSchema: {
          type: 'object',
          properties: {
            subdomain: {
              type: 'string',
              description: 'Publication subdomain (e.g. "mynewsletter" for mynewsletter.substack.com)',
            },
            limit: {
              type: 'number',
              description: 'Number of posts to return (default 12)',
            },
            offset: {
              type: 'number',
              description: 'Pagination offset for fetching subsequent pages (default 0)',
            },
            sort: {
              type: 'string',
              description: 'Sort order: new (default) or top',
            },
          },
          required: ['subdomain'],
        },
      },
      {
        name: 'get_post',
        description: 'Get a single Substack post by URL slug, including body content, title, and subtitle.',
        inputSchema: {
          type: 'object',
          properties: {
            subdomain: {
              type: 'string',
              description: 'Publication subdomain (e.g. "mynewsletter")',
            },
            slug: {
              type: 'string',
              description: 'Post slug as it appears in the URL (e.g. "my-post-title")',
            },
          },
          required: ['subdomain', 'slug'],
        },
      },
      {
        name: 'get_publication',
        description: 'Get metadata for a Substack publication including name, description, subscriber count, and author info.',
        inputSchema: {
          type: 'object',
          properties: {
            subdomain: {
              type: 'string',
              description: 'Publication subdomain (e.g. "mynewsletter")',
            },
          },
          required: ['subdomain'],
        },
      },
      {
        name: 'search_publications',
        description: 'Search for Substack publications by keyword using the global Substack search API.',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query string for finding publications',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (0-based, default 0)',
            },
            limit: {
              type: 'number',
              description: 'Number of results per page (max 100, default 25)',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'list_comments',
        description: 'List top-level comments for a Substack post by post ID or slug, ordered by newest or most liked.',
        inputSchema: {
          type: 'object',
          properties: {
            subdomain: {
              type: 'string',
              description: 'Publication subdomain (e.g. "mynewsletter")',
            },
            postId: {
              type: 'number',
              description: 'Numeric post ID. Use get_post to retrieve the ID.',
            },
            limit: {
              type: 'number',
              description: 'Number of comments to return (default 25)',
            },
          },
          required: ['subdomain', 'postId'],
        },
      },
      {
        name: 'get_comment_thread',
        description: 'Get a specific comment and its replies by comment ID for a Substack post.',
        inputSchema: {
          type: 'object',
          properties: {
            subdomain: {
              type: 'string',
              description: 'Publication subdomain (e.g. "mynewsletter")',
            },
            postId: {
              type: 'number',
              description: 'Numeric post ID',
            },
            commentId: {
              type: 'number',
              description: 'Numeric comment ID to retrieve with its replies',
            },
          },
          required: ['subdomain', 'postId', 'commentId'],
        },
      },
      {
        name: 'list_subscribers',
        description: 'List subscribers for a Substack publication. Requires session cookie belonging to the publication owner.',
        inputSchema: {
          type: 'object',
          properties: {
            subdomain: {
              type: 'string',
              description: 'Publication subdomain (e.g. "mynewsletter")',
            },
            limit: {
              type: 'number',
              description: 'Number of subscribers to return (default 25)',
            },
            offset: {
              type: 'number',
              description: 'Pagination offset (default 0)',
            },
            type: {
              type: 'string',
              description: 'Filter by subscriber type: active, free, paid, or comp',
            },
          },
          required: ['subdomain'],
        },
      },
      {
        name: 'list_notes',
        description: 'List notes (short posts) from a Substack writer profile using cursor-based pagination.',
        inputSchema: {
          type: 'object',
          properties: {
            subdomain: {
              type: 'string',
              description: 'Publication or writer subdomain (e.g. "mynewsletter")',
            },
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response for fetching older notes',
            },
            limit: {
              type: 'number',
              description: 'Number of notes to return (default 25)',
            },
          },
          required: ['subdomain'],
        },
      },
      {
        name: 'get_writer_profile',
        description: 'Get a Substack writer profile including bio, publications, follower count, and social links.',
        inputSchema: {
          type: 'object',
          properties: {
            handle: {
              type: 'string',
              description: 'Writer handle (username without @, e.g. "username" for @username)',
            },
          },
          required: ['handle'],
        },
      },
    ];
  }

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      'User-Agent': 'Mozilla/5.0 (compatible; EpicAI-MCP/1.0)',
    };
    if (this.cookieHeader) {
      headers['Cookie'] = this.cookieHeader;
    }
    return headers;
  }

  private pubApiBase(subdomain: string): string {
    return `https://${subdomain}.substack.com/api/v1`;
  }

  private async get(url: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(url, { method: 'GET', headers: this.buildHeaders() });

    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return {
        content: [{ type: 'text', text: `Substack API error (HTTP ${response.status}): ${errText}` }],
        isError: true,
      };
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      return {
        content: [{ type: 'text', text: `Substack returned non-JSON response (HTTP ${response.status})` }],
        isError: true,
      };
    }

    return {
      content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }],
      isError: false,
    };
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_posts':
          return this.listPosts(args);
        case 'get_post':
          return this.getPost(args);
        case 'get_publication':
          return this.getPublication(args);
        case 'search_publications':
          return this.searchPublications(args);
        case 'list_comments':
          return this.listComments(args);
        case 'get_comment_thread':
          return this.getCommentThread(args);
        case 'list_subscribers':
          return this.listSubscribers(args);
        case 'list_notes':
          return this.listNotes(args);
        case 'get_writer_profile':
          return this.getWriterProfile(args);
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

  private async listPosts(args: Record<string, unknown>): Promise<ToolResult> {
    const subdomain = args.subdomain as string;
    if (!subdomain) {
      return { content: [{ type: 'text', text: 'subdomain is required' }], isError: true };
    }
    const params = new URLSearchParams();
    params.set('sort', (args.sort as string) ?? 'new');
    if (args.limit !== undefined) params.set('limit', String(args.limit));
    if (args.offset !== undefined) params.set('offset', String(args.offset));
    return this.get(`${this.pubApiBase(subdomain)}/archive?${params}`);
  }

  private async getPost(args: Record<string, unknown>): Promise<ToolResult> {
    const subdomain = args.subdomain as string;
    const slug = args.slug as string;
    if (!subdomain || !slug) {
      return { content: [{ type: 'text', text: 'subdomain and slug are required' }], isError: true };
    }
    return this.get(`${this.pubApiBase(subdomain)}/posts/${encodeURIComponent(slug)}`);
  }

  private async getPublication(args: Record<string, unknown>): Promise<ToolResult> {
    const subdomain = args.subdomain as string;
    if (!subdomain) {
      return { content: [{ type: 'text', text: 'subdomain is required' }], isError: true };
    }
    return this.get(`${this.pubApiBase(subdomain)}/publication`);
  }

  private async searchPublications(args: Record<string, unknown>): Promise<ToolResult> {
    const query = args.query as string;
    if (!query) {
      return { content: [{ type: 'text', text: 'query is required' }], isError: true };
    }
    const params = new URLSearchParams({
      query,
      skipExplanation: 'false',
      sort: 'relevance',
    });
    if (args.page !== undefined) params.set('page', String(args.page));
    if (args.limit !== undefined) params.set('limit', String(args.limit));
    return this.get(`${this.globalApiBase}/publication/search?${params}`);
  }

  private async listComments(args: Record<string, unknown>): Promise<ToolResult> {
    const subdomain = args.subdomain as string;
    const postId = args.postId as number;
    if (!subdomain || postId === undefined) {
      return { content: [{ type: 'text', text: 'subdomain and postId are required' }], isError: true };
    }
    const params = new URLSearchParams();
    if (args.limit !== undefined) params.set('limit', String(args.limit));
    const qs = params.toString();
    return this.get(`${this.pubApiBase(subdomain)}/post/${postId}/comments${qs ? `?${qs}` : ''}`);
  }

  private async getCommentThread(args: Record<string, unknown>): Promise<ToolResult> {
    const subdomain = args.subdomain as string;
    const postId = args.postId as number;
    const commentId = args.commentId as number;
    if (!subdomain || postId === undefined || commentId === undefined) {
      return { content: [{ type: 'text', text: 'subdomain, postId, and commentId are required' }], isError: true };
    }
    return this.get(`${this.pubApiBase(subdomain)}/post/${postId}/comments/${commentId}/replies`);
  }

  private async listSubscribers(args: Record<string, unknown>): Promise<ToolResult> {
    const subdomain = args.subdomain as string;
    if (!subdomain) {
      return { content: [{ type: 'text', text: 'subdomain is required' }], isError: true };
    }
    const params = new URLSearchParams();
    if (args.limit !== undefined) params.set('limit', String(args.limit));
    if (args.offset !== undefined) params.set('offset', String(args.offset));
    if (args.type) params.set('type', args.type as string);
    return this.get(`${this.pubApiBase(subdomain)}/subscribers?${params}`);
  }

  private async listNotes(args: Record<string, unknown>): Promise<ToolResult> {
    const subdomain = args.subdomain as string;
    if (!subdomain) {
      return { content: [{ type: 'text', text: 'subdomain is required' }], isError: true };
    }
    const params = new URLSearchParams();
    if (args.cursor) params.set('cursor', args.cursor as string);
    if (args.limit !== undefined) params.set('limit', String(args.limit));
    const qs = params.toString();
    return this.get(`${this.pubApiBase(subdomain)}/notes${qs ? `?${qs}` : ''}`);
  }

  private async getWriterProfile(args: Record<string, unknown>): Promise<ToolResult> {
    const handle = args.handle as string;
    if (!handle) {
      return { content: [{ type: 'text', text: 'handle is required' }], isError: true };
    }
    return this.get(`${this.globalApiBase}/user/profile/get?handle=${encodeURIComponent(handle)}`);
  }
}

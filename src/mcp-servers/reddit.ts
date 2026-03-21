/**
 * Reddit MCP Server
 * Reddit OAuth API adapter for search, subreddits, posts, comments, and users
 *
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */
import { ToolDefinition, ToolResult } from './types.js';

interface RedditConfig {
  accessToken: string;
  userAgent: string;
}

export class RedditMCPServer {
  private readonly baseUrl = 'https://oauth.reddit.com';
  private readonly headers: Record<string, string>;

  constructor(config: RedditConfig) {
    this.headers = {
      Authorization: `Bearer ${config.accessToken}`,
      'User-Agent': config.userAgent,
      'Content-Type': 'application/json',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'search',
        description: 'Search Reddit posts across all subreddits or within a specific subreddit',
        inputSchema: {
          type: 'object',
          properties: {
            q: { type: 'string', description: 'Search query' },
            subreddit: { type: 'string', description: 'Limit search to this subreddit' },
            sort: { type: 'string', description: 'Sort order: relevance, hot, top, new, comments' },
            time: { type: 'string', description: 'Time filter: hour, day, week, month, year, all' },
            limit: { type: 'number', description: 'Number of results (max: 100)' },
            after: { type: 'string', description: 'Fullname of item for pagination' },
            type: { type: 'string', description: 'Result type: link, sr, user' },
          },
          required: ['q'],
        },
      },
      {
        name: 'get_subreddit',
        description: 'Get information and hot posts for a subreddit',
        inputSchema: {
          type: 'object',
          properties: {
            subreddit: { type: 'string', description: 'Subreddit name (without r/)' },
            sort: { type: 'string', description: 'Post sort: hot, new, top, rising' },
            limit: { type: 'number', description: 'Number of posts to return (max: 100)' },
            after: { type: 'string', description: 'Fullname of item for pagination' },
            t: { type: 'string', description: 'Time filter for top: hour, day, week, month, year, all' },
          },
          required: ['subreddit'],
        },
      },
      {
        name: 'get_post',
        description: 'Get a Reddit post by its ID or URL path',
        inputSchema: {
          type: 'object',
          properties: {
            post_id: { type: 'string', description: 'Reddit post ID (t3_ prefix optional)' },
            subreddit: { type: 'string', description: 'Subreddit the post belongs to' },
          },
          required: ['post_id'],
        },
      },
      {
        name: 'get_comments',
        description: 'Get comments for a Reddit post',
        inputSchema: {
          type: 'object',
          properties: {
            post_id: { type: 'string', description: 'Reddit post ID' },
            subreddit: { type: 'string', description: 'Subreddit the post belongs to' },
            sort: { type: 'string', description: 'Comment sort: confidence, top, new, controversial, old' },
            limit: { type: 'number', description: 'Number of comments to return (max: 500)' },
            depth: { type: 'number', description: 'Max depth of comment tree to retrieve' },
          },
          required: ['post_id', 'subreddit'],
        },
      },
      {
        name: 'get_user',
        description: 'Get Reddit user profile and recent posts/comments',
        inputSchema: {
          type: 'object',
          properties: {
            username: { type: 'string', description: 'Reddit username (without u/)' },
            include_posts: { type: 'boolean', description: 'Include recent submitted posts' },
            include_comments: { type: 'boolean', description: 'Include recent comments' },
            limit: { type: 'number', description: 'Number of posts/comments (max: 100)' },
          },
          required: ['username'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'search':
          return await this.search(args);
        case 'get_subreddit':
          return await this.getSubreddit(args);
        case 'get_post':
          return await this.getPost(args);
        case 'get_comments':
          return await this.getComments(args);
        case 'get_user':
          return await this.getUser(args);
        default:
          return { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true };
      }
    } catch (error) {
      return {
        content: [{ type: 'text', text: error instanceof Error ? error.message : String(error) }],
        isError: true,
      };
    }
  }

  private async search(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams({ q: args.q as string });
    if (args.sort) params.append('sort', args.sort as string);
    if (args.time) params.append('t', args.time as string);
    if (args.limit) params.append('limit', String(args.limit));
    if (args.after) params.append('after', args.after as string);
    if (args.type) params.append('type', args.type as string);
    const path = args.subreddit ? `/r/${args.subreddit}/search` : '/search';
    if (args.subreddit) params.append('restrict_sr', 'true');
    const response = await fetch(`${this.baseUrl}${path}?${params}`, { method: 'GET', headers: this.headers });
    if (!response.ok) throw new Error(`Reddit API error: ${response.status} ${response.statusText}`);
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async getSubreddit(args: Record<string, unknown>): Promise<ToolResult> {
    const sort = (args.sort as string | undefined) ?? 'hot';
    const params = new URLSearchParams();
    if (args.limit) params.append('limit', String(args.limit));
    if (args.after) params.append('after', args.after as string);
    if (args.t) params.append('t', args.t as string);
    const response = await fetch(`${this.baseUrl}/r/${args.subreddit}/${sort}?${params}`, { method: 'GET', headers: this.headers });
    if (!response.ok) throw new Error(`Reddit API error: ${response.status} ${response.statusText}`);
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async getPost(args: Record<string, unknown>): Promise<ToolResult> {
    const postId = (args.post_id as string).replace(/^t3_/, '');
    const path = args.subreddit
      ? `/r/${args.subreddit}/comments/${postId}`
      : `/comments/${postId}`;
    const params = new URLSearchParams({ limit: '1', depth: '0' });
    const response = await fetch(`${this.baseUrl}${path}?${params}`, { method: 'GET', headers: this.headers });
    if (!response.ok) throw new Error(`Reddit API error: ${response.status} ${response.statusText}`);
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async getComments(args: Record<string, unknown>): Promise<ToolResult> {
    const postId = (args.post_id as string).replace(/^t3_/, '');
    const params = new URLSearchParams();
    if (args.sort) params.append('sort', args.sort as string);
    if (args.limit) params.append('limit', String(args.limit));
    if (args.depth) params.append('depth', String(args.depth));
    const response = await fetch(`${this.baseUrl}/r/${args.subreddit}/comments/${postId}?${params}`, { method: 'GET', headers: this.headers });
    if (!response.ok) throw new Error(`Reddit API error: ${response.status} ${response.statusText}`);
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async getUser(args: Record<string, unknown>): Promise<ToolResult> {
    const aboutResponse = await fetch(`${this.baseUrl}/user/${args.username}/about`, { method: 'GET', headers: this.headers });
    if (!aboutResponse.ok) throw new Error(`Reddit API error: ${aboutResponse.status} ${aboutResponse.statusText}`);
    let about: unknown;
    try { about = await aboutResponse.json(); } catch { throw new Error(`Non-JSON response (HTTP ${aboutResponse.status})`); }

    const result: Record<string, unknown> = { about };

    if (args.include_posts) {
      const params = new URLSearchParams({ limit: String(args.limit ?? 25) });
      const postsResponse = await fetch(`${this.baseUrl}/user/${args.username}/submitted?${params}`, { method: 'GET', headers: this.headers });
      if (postsResponse.ok) {
        let posts: unknown;
        try { posts = await postsResponse.json(); } catch { throw new Error(`Non-JSON response (HTTP ${postsResponse.status})`); }
        result.posts = posts;
      }
    }

    if (args.include_comments) {
      const params = new URLSearchParams({ limit: String(args.limit ?? 25) });
      const commentsResponse = await fetch(`${this.baseUrl}/user/${args.username}/comments?${params}`, { method: 'GET', headers: this.headers });
      if (commentsResponse.ok) {
        let comments: unknown;
        try { comments = await commentsResponse.json(); } catch { throw new Error(`Non-JSON response (HTTP ${commentsResponse.status})`); }
        result.comments = comments;
      }
    }

    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }], isError: false };
  }
}

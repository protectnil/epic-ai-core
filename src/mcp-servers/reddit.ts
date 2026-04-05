/**
 * Reddit MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28 — no official Reddit MCP server exists on GitHub or npm.
// Community forks exist (Arindam200/reddit-mcp, GeLi2001/reddit-mcp) but are NOT published by Reddit Inc.
// Our adapter covers: 18 tools. Vendor MCP covers: 0 tools.
// Recommendation: use-rest-api — no official MCP server found.
//
// Base URL: https://oauth.reddit.com
// Auth: OAuth2 Bearer token (obtained via client_credentials or authorization_code flow)
// Docs: https://www.reddit.com/dev/api/oauth
// Rate limits: 100 requests/min per OAuth client ID (averaged over 10-minute window)

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface RedditConfig {
  /** OAuth2 Bearer access token from https://www.reddit.com/api/v1/access_token */
  accessToken: string;
  /** Required by Reddit API: e.g. "MyApp/1.0 by u/myuser" */
  userAgent: string;
  baseUrl?: string;
}

export class RedditMCPServer extends MCPAdapterBase {
  private readonly token: string;
  private readonly userAgent: string;
  private readonly baseUrl: string;

  constructor(config: RedditConfig) {
    super();
    this.token = config.accessToken;
    this.userAgent = config.userAgent;
    this.baseUrl = config.baseUrl ?? 'https://oauth.reddit.com';
  }

  static catalog() {
    return {
      name: 'reddit',
      displayName: 'Reddit',
      version: '1.0.0',
      category: 'social' as const,
      keywords: ['reddit', 'subreddit', 'post', 'comment', 'vote', 'flair', 'search', 'community', 'social', 'upvote'],
      toolNames: [
        'search_posts', 'get_subreddit_posts', 'get_subreddit_info', 'get_post',
        'get_comments', 'get_user_profile', 'get_user_posts', 'get_user_comments',
        'submit_post', 'submit_comment', 'vote', 'save_post', 'unsave_post',
        'subscribe_subreddit', 'get_my_profile', 'get_my_subreddits',
        'get_subreddit_rules', 'search_subreddits',
      ],
      description: 'Reddit social platform: search posts, browse subreddits, read and submit posts and comments, vote, subscribe, and manage user profile.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'search_posts',
        description: 'Search Reddit posts across all subreddits or within a specific subreddit by keyword with sort and time filters',
        inputSchema: {
          type: 'object',
          properties: {
            q: { type: 'string', description: 'Search query string' },
            subreddit: { type: 'string', description: 'Restrict search to this subreddit name (without r/)' },
            sort: { type: 'string', description: 'Sort order: relevance, hot, top, new, comments (default: relevance)' },
            time: { type: 'string', description: 'Time filter: hour, day, week, month, year, all (default: all)' },
            type: { type: 'string', description: 'Result type: link, sr, user (default: link)' },
            limit: { type: 'number', description: 'Max results to return (1–100, default: 25)' },
            after: { type: 'string', description: 'Fullname of last item for forward pagination (e.g. t3_abc123)' },
            before: { type: 'string', description: 'Fullname of first item for backward pagination' },
          },
          required: ['q'],
        },
      },
      {
        name: 'get_subreddit_posts',
        description: 'List posts from a subreddit sorted by hot, new, top, rising, or controversial',
        inputSchema: {
          type: 'object',
          properties: {
            subreddit: { type: 'string', description: 'Subreddit name (without r/)' },
            sort: { type: 'string', description: 'Post sort: hot, new, top, rising, controversial (default: hot)' },
            t: { type: 'string', description: 'Time filter for top/controversial: hour, day, week, month, year, all' },
            limit: { type: 'number', description: 'Max posts to return (1–100, default: 25)' },
            after: { type: 'string', description: 'Fullname for forward pagination' },
            before: { type: 'string', description: 'Fullname for backward pagination' },
          },
          required: ['subreddit'],
        },
      },
      {
        name: 'get_subreddit_info',
        description: 'Retrieve metadata about a subreddit: description, subscriber count, rules, and moderators',
        inputSchema: {
          type: 'object',
          properties: {
            subreddit: { type: 'string', description: 'Subreddit name (without r/)' },
          },
          required: ['subreddit'],
        },
      },
      {
        name: 'get_post',
        description: 'Retrieve a single Reddit post by its ID, including title, body, score, and metadata',
        inputSchema: {
          type: 'object',
          properties: {
            post_id: { type: 'string', description: 'Reddit post ID (t3_ prefix optional, e.g. abc123 or t3_abc123)' },
            subreddit: { type: 'string', description: 'Subreddit the post belongs to (improves routing)' },
          },
          required: ['post_id'],
        },
      },
      {
        name: 'get_comments',
        description: 'Retrieve the comment tree for a Reddit post with optional sort and depth controls',
        inputSchema: {
          type: 'object',
          properties: {
            post_id: { type: 'string', description: 'Reddit post ID (t3_ prefix optional)' },
            subreddit: { type: 'string', description: 'Subreddit the post belongs to' },
            sort: { type: 'string', description: 'Comment sort: confidence, top, new, controversial, old, qa (default: confidence)' },
            limit: { type: 'number', description: 'Max top-level comments to return (default: 100, max: 500)' },
            depth: { type: 'number', description: 'Max depth of comment tree (default: 5)' },
          },
          required: ['post_id'],
        },
      },
      {
        name: 'get_user_profile',
        description: 'Retrieve a Reddit user public profile: karma, account age, trophies, and biography',
        inputSchema: {
          type: 'object',
          properties: {
            username: { type: 'string', description: 'Reddit username (without u/)' },
          },
          required: ['username'],
        },
      },
      {
        name: 'get_user_posts',
        description: 'List posts submitted by a Reddit user with optional sort and time filters',
        inputSchema: {
          type: 'object',
          properties: {
            username: { type: 'string', description: 'Reddit username (without u/)' },
            sort: { type: 'string', description: 'Sort: hot, new, top, controversial (default: new)' },
            t: { type: 'string', description: 'Time filter for top/controversial: hour, day, week, month, year, all' },
            limit: { type: 'number', description: 'Max posts to return (1–100, default: 25)' },
            after: { type: 'string', description: 'Fullname for forward pagination' },
          },
        },
      },
      {
        name: 'get_user_comments',
        description: 'List comments posted by a Reddit user with optional sort and time filters',
        inputSchema: {
          type: 'object',
          properties: {
            username: { type: 'string', description: 'Reddit username (without u/)' },
            sort: { type: 'string', description: 'Sort: hot, new, top, controversial (default: new)' },
            t: { type: 'string', description: 'Time filter for top/controversial: hour, day, week, month, year, all' },
            limit: { type: 'number', description: 'Max comments to return (1–100, default: 25)' },
            after: { type: 'string', description: 'Fullname for forward pagination' },
          },
        },
      },
      {
        name: 'submit_post',
        description: 'Submit a new text (self) or link post to a subreddit. Requires submit OAuth2 scope.',
        inputSchema: {
          type: 'object',
          properties: {
            subreddit: { type: 'string', description: 'Subreddit name to post to (without r/)' },
            title: { type: 'string', description: 'Post title (required)' },
            kind: { type: 'string', description: 'Post type: self (text post) or link (URL post) (default: self)' },
            text: { type: 'string', description: 'Post body in Markdown (for kind=self)' },
            url: { type: 'string', description: 'URL to submit (for kind=link)' },
            nsfw: { type: 'boolean', description: 'Mark post as NSFW (default: false)' },
            spoiler: { type: 'boolean', description: 'Mark post as spoiler (default: false)' },
            flair_id: { type: 'string', description: 'Flair template ID to apply to the post' },
            flair_text: { type: 'string', description: 'Custom flair text (if subreddit allows)' },
          },
          required: ['subreddit', 'title'],
        },
      },
      {
        name: 'submit_comment',
        description: 'Post a reply comment to a post or another comment. Requires submit OAuth2 scope.',
        inputSchema: {
          type: 'object',
          properties: {
            parent_id: { type: 'string', description: 'Fullname of parent: post (t3_xxx) or comment (t1_xxx) to reply to' },
            text: { type: 'string', description: 'Comment body in Markdown' },
          },
          required: ['parent_id', 'text'],
        },
      },
      {
        name: 'vote',
        description: 'Cast an upvote, downvote, or remove vote on a post or comment. Requires vote OAuth2 scope.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Fullname of post (t3_xxx) or comment (t1_xxx) to vote on' },
            dir: { type: 'number', description: 'Vote direction: 1 (upvote), -1 (downvote), 0 (remove vote)' },
          },
          required: ['id', 'dir'],
        },
      },
      {
        name: 'save_post',
        description: 'Save a post or comment to the authenticated user saved list. Requires save OAuth2 scope.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Fullname of post (t3_xxx) or comment (t1_xxx) to save' },
            category: { type: 'string', description: 'Optional category label for the saved item' },
          },
          required: ['id'],
        },
      },
      {
        name: 'unsave_post',
        description: 'Remove a post or comment from the authenticated user saved list. Requires save OAuth2 scope.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Fullname of post (t3_xxx) or comment (t1_xxx) to unsave' },
          },
          required: ['id'],
        },
      },
      {
        name: 'subscribe_subreddit',
        description: 'Subscribe to or unsubscribe from a subreddit. Requires subscribe OAuth2 scope.',
        inputSchema: {
          type: 'object',
          properties: {
            subreddit: { type: 'string', description: 'Subreddit name (without r/)' },
            action: { type: 'string', description: 'Action: sub (subscribe) or unsub (unsubscribe) (default: sub)' },
          },
          required: ['subreddit'],
        },
      },
      {
        name: 'get_my_profile',
        description: 'Get the authenticated user profile, karma breakdown, and account settings. Requires identity OAuth2 scope.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_my_subreddits',
        description: 'List subreddits the authenticated user is subscribed to, a moderator of, or a contributor in',
        inputSchema: {
          type: 'object',
          properties: {
            where: { type: 'string', description: 'Filter: subscriber, contributor, moderator, streams (default: subscriber)' },
            limit: { type: 'number', description: 'Max results to return (1–100, default: 25)' },
            after: { type: 'string', description: 'Fullname for forward pagination' },
          },
        },
      },
      {
        name: 'get_subreddit_rules',
        description: 'Retrieve the rules and posting guidelines for a subreddit',
        inputSchema: {
          type: 'object',
          properties: {
            subreddit: { type: 'string', description: 'Subreddit name (without r/)' },
          },
          required: ['subreddit'],
        },
      },
      {
        name: 'search_subreddits',
        description: 'Search for subreddits by keyword, returning community names, descriptions, and subscriber counts',
        inputSchema: {
          type: 'object',
          properties: {
            q: { type: 'string', description: 'Search query for subreddit name or topic' },
            sort: { type: 'string', description: 'Sort: relevance or activity (default: relevance)' },
            limit: { type: 'number', description: 'Max results to return (1–100, default: 25)' },
            after: { type: 'string', description: 'Fullname for forward pagination' },
          },
          required: ['q'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'search_posts':
          return await this.searchPosts(args);
        case 'get_subreddit_posts':
          return await this.getSubredditPosts(args);
        case 'get_subreddit_info':
          return await this.getSubredditInfo(args);
        case 'get_post':
          return await this.getPost(args);
        case 'get_comments':
          return await this.getComments(args);
        case 'get_user_profile':
          return await this.getUserProfile(args);
        case 'get_user_posts':
          return await this.getUserContent(args, 'submitted');
        case 'get_user_comments':
          return await this.getUserContent(args, 'comments');
        case 'submit_post':
          return await this.submitPost(args);
        case 'submit_comment':
          return await this.submitComment(args);
        case 'vote':
          return await this.vote(args);
        case 'save_post':
          return await this.saveItem(args, 'save');
        case 'unsave_post':
          return await this.saveItem(args, 'unsave');
        case 'subscribe_subreddit':
          return await this.subscribeSubreddit(args);
        case 'get_my_profile':
          return await this.getMyProfile();
        case 'get_my_subreddits':
          return await this.getMySubreddits(args);
        case 'get_subreddit_rules':
          return await this.getSubredditRules(args);
        case 'search_subreddits':
          return await this.searchSubreddits(args);
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

  private get headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.token}`,
      'User-Agent': this.userAgent,
      'Content-Type': 'application/json',
    };
  }

  private async get(path: string, params?: URLSearchParams): Promise<ToolResult> {
    const url = params
      ? `${this.baseUrl}${path}?${params.toString()}`
      : `${this.baseUrl}${path}`;
    const response = await this.fetchWithRetry(url, { method: 'GET', headers: this.headers });
    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `Reddit API error: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async post(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const form = new URLSearchParams();
    for (const [k, v] of Object.entries(body)) {
      if (v !== undefined && v !== null) form.append(k, String(v));
    }
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: { ...this.headers, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
    });
    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `Reddit API error: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async searchPosts(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams({ q: args.q as string });
    if (args.sort) params.append('sort', args.sort as string);
    if (args.time) params.append('t', args.time as string);
    if (args.type) params.append('type', args.type as string);
    if (args.limit) params.append('limit', String(args.limit));
    if (args.after) params.append('after', args.after as string);
    if (args.before) params.append('before', args.before as string);
    const path = args.subreddit ? `/r/${encodeURIComponent(args.subreddit as string)}/search` : '/search';
    if (args.subreddit) params.append('restrict_sr', 'true');
    return this.get(path, params);
  }

  private async getSubredditPosts(args: Record<string, unknown>): Promise<ToolResult> {
    const sort = (args.sort as string) ?? 'hot';
    const params = new URLSearchParams();
    if (args.limit) params.append('limit', String(args.limit));
    if (args.after) params.append('after', args.after as string);
    if (args.before) params.append('before', args.before as string);
    if (args.t) params.append('t', args.t as string);
    return this.get(`/r/${encodeURIComponent(args.subreddit as string)}/${sort}`, params);
  }

  private async getSubredditInfo(args: Record<string, unknown>): Promise<ToolResult> {
    return this.get(`/r/${encodeURIComponent(args.subreddit as string)}/about`);
  }

  private async getPost(args: Record<string, unknown>): Promise<ToolResult> {
    const postId = (args.post_id as string).replace(/^t3_/, '');
    const path = args.subreddit
      ? `/r/${encodeURIComponent(args.subreddit as string)}/comments/${postId}`
      : `/comments/${postId}`;
    const params = new URLSearchParams({ limit: '1', depth: '0' });
    return this.get(path, params);
  }

  private async getComments(args: Record<string, unknown>): Promise<ToolResult> {
    const postId = (args.post_id as string).replace(/^t3_/, '');
    const subreddit = (args.subreddit as string | undefined) ?? 'all';
    const params = new URLSearchParams();
    if (args.sort) params.append('sort', args.sort as string);
    if (args.limit) params.append('limit', String(args.limit));
    if (args.depth) params.append('depth', String(args.depth));
    return this.get(`/r/${subreddit}/comments/${postId}`, params);
  }

  private async getUserProfile(args: Record<string, unknown>): Promise<ToolResult> {
    return this.get(`/user/${encodeURIComponent(args.username as string)}/about`);
  }

  private async getUserContent(args: Record<string, unknown>, section: 'submitted' | 'comments'): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.sort) params.append('sort', args.sort as string);
    if (args.t) params.append('t', args.t as string);
    if (args.limit) params.append('limit', String(args.limit));
    if (args.after) params.append('after', args.after as string);
    return this.get(`/user/${encodeURIComponent(args.username as string)}/${section}`, params);
  }

  private async submitPost(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {
      sr: args.subreddit,
      title: args.title,
      kind: (args.kind as string) ?? 'self',
      api_type: 'json',
    };
    if (args.text) body.text = args.text;
    if (args.url) body.url = args.url;
    if (args.nsfw) body.nsfw = 'true';
    if (args.spoiler) body.spoiler = 'true';
    if (args.flair_id) body.flair_id = args.flair_id;
    if (args.flair_text) body.flair_text = args.flair_text;
    return this.post('/api/submit', body);
  }

  private async submitComment(args: Record<string, unknown>): Promise<ToolResult> {
    return this.post('/api/comment', {
      parent: args.parent_id,
      text: args.text,
      api_type: 'json',
    });
  }

  private async vote(args: Record<string, unknown>): Promise<ToolResult> {
    return this.post('/api/vote', {
      id: args.id,
      dir: args.dir,
    });
  }

  private async saveItem(args: Record<string, unknown>, action: 'save' | 'unsave'): Promise<ToolResult> {
    const body: Record<string, unknown> = { id: args.id };
    if (action === 'save' && args.category) body.category = args.category;
    return this.post(`/api/${action}`, body);
  }

  private async subscribeSubreddit(args: Record<string, unknown>): Promise<ToolResult> {
    const action = (args.action as string) ?? 'sub';
    return this.post('/api/subscribe', {
      sr_name: args.subreddit,
      action,
    });
  }

  private async getMyProfile(): Promise<ToolResult> {
    return this.get('/api/v1/me');
  }

  private async getMySubreddits(args: Record<string, unknown>): Promise<ToolResult> {
    const where = (args.where as string) ?? 'subscriber';
    const params = new URLSearchParams();
    if (args.limit) params.append('limit', String(args.limit));
    if (args.after) params.append('after', args.after as string);
    return this.get(`/subreddits/mine/${where}`, params);
  }

  private async getSubredditRules(args: Record<string, unknown>): Promise<ToolResult> {
    return this.get(`/r/${encodeURIComponent(args.subreddit as string)}/about/rules`);
  }

  private async searchSubreddits(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams({ q: args.q as string });
    if (args.sort) params.append('sort', args.sort as string);
    if (args.limit) params.append('limit', String(args.limit));
    if (args.after) params.append('after', args.after as string);
    return this.get('/subreddits/search', params);
  }
}

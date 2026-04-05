/**
 * Twitter / X MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03. No official X/Twitter MCP server exists.
// Multiple community servers exist (github.com/EnesCinr/twitter-mcp,
// github.com/lord-dubious/x-mcp, github.com/BioInfo/x-mcp-server) but none are
// published or maintained by X Corp. All require OAuth 1.0a or OAuth 2.0 PKCE
// for write operations; Bearer token (app-only) is sufficient for read-only access.
//
// Base URL: https://api.x.com/2
// Auth: Bearer token (app-only) for read operations.
//       OAuth 2.0 PKCE user context required for write operations (post_tweet, delete_tweet,
//       like_tweet, unlike_tweet, retweet, create_bookmark, delete_bookmark).
// Docs: https://developer.x.com/en/docs/x-api
// Rate limits vary by access tier:
//   Free tier:    500k read tweets/month, 500 post/month
//   Basic tier:   10k read/month write, 100 read/month
//   Pro tier:     1M read tweets/month, up to 300 writes/15min
// Verified endpoints (developer.x.com/en/docs/x-api/tweets/lookup/api-reference):
//   GET  /2/tweets/:id
//   GET  /2/tweets
//   POST /2/tweets
//   DELETE /2/tweets/:id
//   GET  /2/tweets/search/recent
//   GET  /2/tweets/search/all  (Academic/Pro tier)
//   GET  /2/users/:id
//   GET  /2/users/by/username/:username
//   GET  /2/users/:id/tweets
//   GET  /2/users/:id/mentions
//   GET  /2/users/:id/timelines/reverse_chronological
//   GET  /2/users/:id/followers
//   GET  /2/users/:id/following
//   POST /2/users/:id/likes
//   DELETE /2/users/:id/likes/:tweet_id
//   POST /2/users/:id/retweets
//   DELETE /2/users/:id/retweets/:source_tweet_id
//   GET  /2/users/:id/bookmarks
//   POST /2/users/:id/bookmarks
//   DELETE /2/users/:id/bookmarks/:tweet_id
//   GET  /2/lists/:id
//   GET  /2/users/:id/owned_lists
//   GET  /2/lists/:id/members
//   GET  /2/lists/:id/tweets

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface TwitterConfig {
  /** App-only Bearer token for read operations. OAuth 2.0 user access token for write operations. */
  bearerToken: string;
  baseUrl?: string;
}

export class TwitterMCPServer extends MCPAdapterBase {
  private readonly bearerToken: string;
  private readonly baseUrl: string;

  constructor(config: TwitterConfig) {
    super();
    this.bearerToken = config.bearerToken;
    this.baseUrl = config.baseUrl ?? 'https://api.x.com/2';
  }

  static catalog() {
    return {
      name: 'twitter',
      displayName: 'Twitter / X',
      version: '1.0.0',
      category: 'social' as const,
      keywords: ['twitter', 'x', 'tweet', 'post', 'social', 'timeline', 'mention', 'retweet', 'like', 'bookmark', 'list', 'search', 'followers', 'following'],
      toolNames: [
        'search_recent_tweets', 'get_tweet', 'get_tweets', 'post_tweet', 'delete_tweet',
        'get_user_by_username', 'get_user_by_id', 'get_users_by_usernames',
        'get_user_tweets', 'get_user_mentions', 'get_home_timeline',
        'get_user_followers', 'get_user_following',
        'like_tweet', 'unlike_tweet', 'retweet', 'undo_retweet',
        'get_bookmarks', 'add_bookmark', 'remove_bookmark',
        'get_list', 'get_user_lists', 'get_list_members', 'get_list_tweets',
      ],
      description: 'X (Twitter) API v2: search tweets, manage posts, users, timelines, likes, retweets, bookmarks, and lists.',
      author: 'protectnil' as const,
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'search_recent_tweets',
        description: 'Search tweets from the last 7 days using X query syntax. Supports operators like from:, to:, #hashtag, lang:, is:retweet, has:media.',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'X search query (e.g. "AI from:openai -is:retweet lang:en")' },
            max_results: { type: 'number', description: 'Results per page (10–100, default: 10)' },
            next_token: { type: 'string', description: 'Pagination token from previous response' },
            tweet_fields: { type: 'string', description: 'Comma-separated tweet fields: id, text, author_id, created_at, public_metrics, entities, lang, source, conversation_id' },
            expansions: { type: 'string', description: 'Comma-separated expansions: author_id, attachments.media_keys, referenced_tweets.id' },
            user_fields: { type: 'string', description: 'Comma-separated user fields when author_id expansion is used: name, username, verified, public_metrics' },
            start_time: { type: 'string', description: 'Oldest tweet to return (ISO 8601, e.g. 2025-01-01T00:00:00Z)' },
            end_time: { type: 'string', description: 'Newest tweet to return (ISO 8601)' },
            sort_order: { type: 'string', description: 'Sort order: recency or relevancy (default: recency)' },
          },
          required: ['query'],
        },
      },
      {
        name: 'get_tweet',
        description: 'Get a single tweet by its ID with optional field expansions for author info, media, and referenced tweets.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Tweet ID' },
            tweet_fields: { type: 'string', description: 'Comma-separated tweet fields: text, author_id, created_at, public_metrics, entities, lang, conversation_id' },
            expansions: { type: 'string', description: 'Comma-separated expansions: author_id, attachments.media_keys, referenced_tweets.id' },
            user_fields: { type: 'string', description: 'Comma-separated user fields (requires author_id expansion)' },
          },
          required: ['id'],
        },
      },
      {
        name: 'get_tweets',
        description: 'Get up to 100 tweets by their IDs in a single request. Efficient batch lookup for multiple tweet IDs.',
        inputSchema: {
          type: 'object',
          properties: {
            ids: { type: 'string', description: 'Comma-separated tweet IDs (max 100)' },
            tweet_fields: { type: 'string', description: 'Comma-separated tweet fields: text, author_id, created_at, public_metrics, entities, lang' },
            expansions: { type: 'string', description: 'Comma-separated expansions: author_id, attachments.media_keys, referenced_tweets.id' },
            user_fields: { type: 'string', description: 'Comma-separated user fields (requires author_id expansion)' },
          },
          required: ['ids'],
        },
      },
      {
        name: 'post_tweet',
        description: 'Post a new tweet. Optionally reply to an existing tweet, quote a tweet, or restrict who can reply. Requires user OAuth 2.0 context.',
        inputSchema: {
          type: 'object',
          properties: {
            text: { type: 'string', description: 'Tweet text (up to 280 characters)' },
            in_reply_to_tweet_id: { type: 'string', description: 'Tweet ID to reply to' },
            quote_tweet_id: { type: 'string', description: 'Tweet ID to quote' },
            reply_settings: { type: 'string', description: 'Who can reply: mentionedUsers, subscribers, or everyone (default: everyone)' },
          },
          required: ['text'],
        },
      },
      {
        name: 'delete_tweet',
        description: 'Delete a tweet by its ID. Requires user OAuth 2.0 context and the tweet must belong to the authenticated user.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Tweet ID to delete' },
          },
          required: ['id'],
        },
      },
      {
        name: 'get_user_by_username',
        description: 'Look up a Twitter/X user profile by their @username. Returns user ID, name, bio, and public metrics.',
        inputSchema: {
          type: 'object',
          properties: {
            username: { type: 'string', description: 'Username without the @ symbol (e.g. "openai")' },
            user_fields: { type: 'string', description: 'Comma-separated user fields: name, username, created_at, description, public_metrics, verified, profile_image_url, url' },
            expansions: { type: 'string', description: 'Comma-separated expansions: pinned_tweet_id' },
            tweet_fields: { type: 'string', description: 'Comma-separated tweet fields for pinned tweet expansion' },
          },
          required: ['username'],
        },
      },
      {
        name: 'get_user_by_id',
        description: 'Look up a Twitter/X user profile by their numeric user ID.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Numeric user ID' },
            user_fields: { type: 'string', description: 'Comma-separated user fields: name, username, created_at, description, public_metrics, verified, profile_image_url' },
            expansions: { type: 'string', description: 'Comma-separated expansions: pinned_tweet_id' },
          },
          required: ['id'],
        },
      },
      {
        name: 'get_users_by_usernames',
        description: 'Look up multiple Twitter/X user profiles by usernames in a single request (batch lookup, max 100 users).',
        inputSchema: {
          type: 'object',
          properties: {
            usernames: { type: 'string', description: 'Comma-separated usernames without @ (max 100)' },
            user_fields: { type: 'string', description: 'Comma-separated user fields: name, username, public_metrics, verified, description' },
          },
          required: ['usernames'],
        },
      },
      {
        name: 'get_user_tweets',
        description: 'Get tweets posted by a specific user. Optionally exclude retweets and replies. Returns up to 3,200 most recent tweets.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'User ID of the account whose tweets to retrieve' },
            max_results: { type: 'number', description: 'Results per page (5–100, default: 10)' },
            pagination_token: { type: 'string', description: 'Pagination token from previous response' },
            tweet_fields: { type: 'string', description: 'Comma-separated tweet fields: text, created_at, public_metrics, entities, source' },
            exclude: { type: 'string', description: 'Types to exclude (comma-separated): retweets, replies' },
            start_time: { type: 'string', description: 'Oldest tweet to return (ISO 8601)' },
            end_time: { type: 'string', description: 'Newest tweet to return (ISO 8601)' },
          },
          required: ['id'],
        },
      },
      {
        name: 'get_user_mentions',
        description: 'Get tweets where a specific user has been @mentioned in the last 7 days.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'User ID to get mentions for' },
            max_results: { type: 'number', description: 'Results per page (5–100, default: 10)' },
            pagination_token: { type: 'string', description: 'Pagination token from previous response' },
            tweet_fields: { type: 'string', description: 'Comma-separated tweet fields: text, created_at, author_id, public_metrics' },
            start_time: { type: 'string', description: 'Oldest mention to return (ISO 8601)' },
            end_time: { type: 'string', description: 'Newest mention to return (ISO 8601)' },
          },
          required: ['id'],
        },
      },
      {
        name: 'get_home_timeline',
        description: 'Get the reverse-chronological home timeline for a user (tweets from accounts they follow). Requires user OAuth 2.0 context.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'User ID (must match the authenticated user)' },
            max_results: { type: 'number', description: 'Results per page (1–100, default: 100)' },
            pagination_token: { type: 'string', description: 'Pagination token from previous response' },
            tweet_fields: { type: 'string', description: 'Comma-separated tweet fields: text, created_at, author_id, public_metrics, entities' },
            expansions: { type: 'string', description: 'Comma-separated expansions: author_id' },
            exclude: { type: 'string', description: 'Types to exclude (comma-separated): retweets, replies' },
          },
          required: ['id'],
        },
      },
      {
        name: 'get_user_followers',
        description: 'Get the list of accounts following a specific user. Paginated with up to 1,000 results per request.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'User ID to get followers for' },
            max_results: { type: 'number', description: 'Results per page (1–1000, default: 100)' },
            pagination_token: { type: 'string', description: 'Pagination token from previous response' },
            user_fields: { type: 'string', description: 'Comma-separated user fields: name, username, public_metrics, verified, description' },
          },
          required: ['id'],
        },
      },
      {
        name: 'get_user_following',
        description: 'Get the list of accounts a specific user follows. Paginated with up to 1,000 results per request.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'User ID to get following list for' },
            max_results: { type: 'number', description: 'Results per page (1–1000, default: 100)' },
            pagination_token: { type: 'string', description: 'Pagination token from previous response' },
            user_fields: { type: 'string', description: 'Comma-separated user fields: name, username, public_metrics, verified, description' },
          },
          required: ['id'],
        },
      },
      {
        name: 'like_tweet',
        description: 'Like a tweet on behalf of an authenticated user. Requires user OAuth 2.0 context with tweet.write scope.',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: { type: 'string', description: 'User ID of the authenticated user liking the tweet' },
            tweet_id: { type: 'string', description: 'Tweet ID to like' },
          },
          required: ['user_id', 'tweet_id'],
        },
      },
      {
        name: 'unlike_tweet',
        description: 'Remove a like from a tweet. Requires user OAuth 2.0 context with tweet.write scope.',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: { type: 'string', description: 'User ID of the authenticated user' },
            tweet_id: { type: 'string', description: 'Tweet ID to unlike' },
          },
          required: ['user_id', 'tweet_id'],
        },
      },
      {
        name: 'retweet',
        description: 'Retweet a tweet on behalf of an authenticated user. Requires user OAuth 2.0 context with tweet.write scope.',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: { type: 'string', description: 'User ID of the authenticated user retweeting' },
            tweet_id: { type: 'string', description: 'Tweet ID to retweet' },
          },
          required: ['user_id', 'tweet_id'],
        },
      },
      {
        name: 'undo_retweet',
        description: 'Remove a retweet. Requires user OAuth 2.0 context with tweet.write scope.',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: { type: 'string', description: 'User ID of the authenticated user' },
            source_tweet_id: { type: 'string', description: 'Original tweet ID to un-retweet' },
          },
          required: ['user_id', 'source_tweet_id'],
        },
      },
      {
        name: 'get_bookmarks',
        description: 'Get tweets bookmarked by an authenticated user. Requires user OAuth 2.0 context with bookmark.read scope.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'User ID of the authenticated user' },
            max_results: { type: 'number', description: 'Results per page (1–100, default: 100)' },
            pagination_token: { type: 'string', description: 'Pagination token from previous response' },
            tweet_fields: { type: 'string', description: 'Comma-separated tweet fields: text, created_at, author_id, public_metrics' },
          },
          required: ['id'],
        },
      },
      {
        name: 'add_bookmark',
        description: 'Bookmark a tweet for an authenticated user. Requires user OAuth 2.0 context with bookmark.write scope.',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: { type: 'string', description: 'User ID of the authenticated user' },
            tweet_id: { type: 'string', description: 'Tweet ID to bookmark' },
          },
          required: ['user_id', 'tweet_id'],
        },
      },
      {
        name: 'remove_bookmark',
        description: 'Remove a bookmark from a tweet. Requires user OAuth 2.0 context with bookmark.write scope.',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: { type: 'string', description: 'User ID of the authenticated user' },
            tweet_id: { type: 'string', description: 'Tweet ID to remove from bookmarks' },
          },
          required: ['user_id', 'tweet_id'],
        },
      },
      {
        name: 'get_list',
        description: 'Get metadata for a specific X list including name, description, owner, member count, and privacy setting.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'List ID' },
            list_fields: { type: 'string', description: 'Comma-separated list fields: name, description, owner_id, member_count, follower_count, private, created_at' },
          },
          required: ['id'],
        },
      },
      {
        name: 'get_user_lists',
        description: 'Get all lists owned by a specific user.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'User ID whose owned lists to retrieve' },
            max_results: { type: 'number', description: 'Results per page (1–100, default: 100)' },
            pagination_token: { type: 'string', description: 'Pagination token from previous response' },
            list_fields: { type: 'string', description: 'Comma-separated list fields: name, member_count, follower_count, private, created_at' },
          },
          required: ['id'],
        },
      },
      {
        name: 'get_list_members',
        description: 'Get all members (accounts) in a specific X list.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'List ID' },
            max_results: { type: 'number', description: 'Results per page (1–100, default: 100)' },
            pagination_token: { type: 'string', description: 'Pagination token from previous response' },
            user_fields: { type: 'string', description: 'Comma-separated user fields: name, username, public_metrics, verified, description' },
          },
          required: ['id'],
        },
      },
      {
        name: 'get_list_tweets',
        description: 'Get recent tweets from all members of a specific X list.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'List ID' },
            max_results: { type: 'number', description: 'Results per page (1–100, default: 100)' },
            pagination_token: { type: 'string', description: 'Pagination token from previous response' },
            tweet_fields: { type: 'string', description: 'Comma-separated tweet fields: text, created_at, author_id, public_metrics, entities' },
            expansions: { type: 'string', description: 'Comma-separated expansions: author_id' },
          },
          required: ['id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'search_recent_tweets':
          return await this.searchRecentTweets(args);
        case 'get_tweet':
          return await this.getTweet(args);
        case 'get_tweets':
          return await this.getTweets(args);
        case 'post_tweet':
          return await this.postTweet(args);
        case 'delete_tweet':
          return await this.deleteTweet(args);
        case 'get_user_by_username':
          return await this.getUserByUsername(args);
        case 'get_user_by_id':
          return await this.getUserById(args);
        case 'get_users_by_usernames':
          return await this.getUsersByUsernames(args);
        case 'get_user_tweets':
          return await this.getUserTweets(args);
        case 'get_user_mentions':
          return await this.getUserMentions(args);
        case 'get_home_timeline':
          return await this.getHomeTimeline(args);
        case 'get_user_followers':
          return await this.getUserFollowers(args);
        case 'get_user_following':
          return await this.getUserFollowing(args);
        case 'like_tweet':
          return await this.likeTweet(args);
        case 'unlike_tweet':
          return await this.unlikeTweet(args);
        case 'retweet':
          return await this.retweetPost(args);
        case 'undo_retweet':
          return await this.undoRetweet(args);
        case 'get_bookmarks':
          return await this.getBookmarks(args);
        case 'add_bookmark':
          return await this.addBookmark(args);
        case 'remove_bookmark':
          return await this.removeBookmark(args);
        case 'get_list':
          return await this.getList(args);
        case 'get_user_lists':
          return await this.getUserLists(args);
        case 'get_list_members':
          return await this.getListMembers(args);
        case 'get_list_tweets':
          return await this.getListTweets(args);
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

  private get authHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.bearerToken}`,
      'Content-Type': 'application/json',
    };
  }

  private formatResult(data: unknown): ToolResult {
    const text = JSON.stringify(data, null, 2);
    const truncated = text.length > 10_000
      ? text.slice(0, 10_000) + `\n... [truncated, ${text.length} total chars]`
      : text;
    return { content: [{ type: 'text', text: truncated }], isError: false };
  }

  private async xGet(path: string, params: URLSearchParams): Promise<ToolResult> {
    const qs = params.toString();
    const url = `${this.baseUrl}${path}${qs ? '?' + qs : ''}`;
    const response = await this.fetchWithRetry(url, { method: 'GET', headers: this.authHeaders });

    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `X API error ${response.status}: ${errText}` }], isError: true };
    }

    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`X returned non-JSON response (HTTP ${response.status})`); }
    return this.formatResult(data);
  }

  private async xPost(path: string, body: unknown): Promise<ToolResult> {
    const url = `${this.baseUrl}${path}`;
    const response = await this.fetchWithRetry(url, { method: 'POST', headers: this.authHeaders, body: JSON.stringify(body) });

    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `X API error ${response.status}: ${errText}` }], isError: true };
    }

    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`X returned non-JSON response (HTTP ${response.status})`); }
    return this.formatResult(data);
  }

  private async xDelete(path: string): Promise<ToolResult> {
    const url = `${this.baseUrl}${path}`;
    const response = await this.fetchWithRetry(url, { method: 'DELETE', headers: this.authHeaders });

    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `X API error ${response.status}: ${errText}` }], isError: true };
    }

    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`X returned non-JSON response (HTTP ${response.status})`); }
    return this.formatResult(data);
  }

  private buildTweetParams(args: Record<string, unknown>): URLSearchParams {
    const params = new URLSearchParams();
    if (args.tweet_fields) params.append('tweet.fields', args.tweet_fields as string);
    if (args.expansions) params.append('expansions', args.expansions as string);
    if (args.user_fields) params.append('user.fields', args.user_fields as string);
    return params;
  }

  private async searchRecentTweets(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams({ query: args.query as string });
    if (args.max_results) params.append('max_results', String(args.max_results));
    if (args.next_token) params.append('next_token', args.next_token as string);
    if (args.tweet_fields) params.append('tweet.fields', args.tweet_fields as string);
    if (args.expansions) params.append('expansions', args.expansions as string);
    if (args.user_fields) params.append('user.fields', args.user_fields as string);
    if (args.start_time) params.append('start_time', args.start_time as string);
    if (args.end_time) params.append('end_time', args.end_time as string);
    if (args.sort_order) params.append('sort_order', args.sort_order as string);
    return this.xGet('/tweets/search/recent', params);
  }

  private async getTweet(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.buildTweetParams(args);
    return this.xGet(`/tweets/${encodeURIComponent(args.id as string)}`, params);
  }

  private async getTweets(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams({ ids: args.ids as string });
    if (args.tweet_fields) params.append('tweet.fields', args.tweet_fields as string);
    if (args.expansions) params.append('expansions', args.expansions as string);
    if (args.user_fields) params.append('user.fields', args.user_fields as string);
    return this.xGet('/tweets', params);
  }

  private async postTweet(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = { text: args.text };
    if (args.in_reply_to_tweet_id) body.reply = { in_reply_to_tweet_id: args.in_reply_to_tweet_id };
    if (args.quote_tweet_id) body.quote_tweet_id = args.quote_tweet_id;
    if (args.reply_settings) body.reply_settings = args.reply_settings;
    return this.xPost('/tweets', body);
  }

  private async deleteTweet(args: Record<string, unknown>): Promise<ToolResult> {
    return this.xDelete(`/tweets/${encodeURIComponent(args.id as string)}`);
  }

  private async getUserByUsername(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.user_fields) params.append('user.fields', args.user_fields as string);
    if (args.expansions) params.append('expansions', args.expansions as string);
    if (args.tweet_fields) params.append('tweet.fields', args.tweet_fields as string);
    return this.xGet(`/users/by/username/${encodeURIComponent(args.username as string)}`, params);
  }

  private async getUserById(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.user_fields) params.append('user.fields', args.user_fields as string);
    if (args.expansions) params.append('expansions', args.expansions as string);
    return this.xGet(`/users/${encodeURIComponent(args.id as string)}`, params);
  }

  private async getUsersByUsernames(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams({ usernames: args.usernames as string });
    if (args.user_fields) params.append('user.fields', args.user_fields as string);
    return this.xGet('/users/by', params);
  }

  private async getUserTweets(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.max_results) params.append('max_results', String(args.max_results));
    if (args.pagination_token) params.append('pagination_token', args.pagination_token as string);
    if (args.tweet_fields) params.append('tweet.fields', args.tweet_fields as string);
    if (args.exclude) params.append('exclude', args.exclude as string);
    if (args.start_time) params.append('start_time', args.start_time as string);
    if (args.end_time) params.append('end_time', args.end_time as string);
    return this.xGet(`/users/${encodeURIComponent(args.id as string)}/tweets`, params);
  }

  private async getUserMentions(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.max_results) params.append('max_results', String(args.max_results));
    if (args.pagination_token) params.append('pagination_token', args.pagination_token as string);
    if (args.tweet_fields) params.append('tweet.fields', args.tweet_fields as string);
    if (args.start_time) params.append('start_time', args.start_time as string);
    if (args.end_time) params.append('end_time', args.end_time as string);
    return this.xGet(`/users/${encodeURIComponent(args.id as string)}/mentions`, params);
  }

  private async getHomeTimeline(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.max_results) params.append('max_results', String(args.max_results));
    if (args.pagination_token) params.append('pagination_token', args.pagination_token as string);
    if (args.tweet_fields) params.append('tweet.fields', args.tweet_fields as string);
    if (args.expansions) params.append('expansions', args.expansions as string);
    if (args.exclude) params.append('exclude', args.exclude as string);
    return this.xGet(`/users/${encodeURIComponent(args.id as string)}/timelines/reverse_chronological`, params);
  }

  private async getUserFollowers(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.max_results) params.append('max_results', String(args.max_results));
    if (args.pagination_token) params.append('pagination_token', args.pagination_token as string);
    if (args.user_fields) params.append('user.fields', args.user_fields as string);
    return this.xGet(`/users/${encodeURIComponent(args.id as string)}/followers`, params);
  }

  private async getUserFollowing(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.max_results) params.append('max_results', String(args.max_results));
    if (args.pagination_token) params.append('pagination_token', args.pagination_token as string);
    if (args.user_fields) params.append('user.fields', args.user_fields as string);
    return this.xGet(`/users/${encodeURIComponent(args.id as string)}/following`, params);
  }

  private async likeTweet(args: Record<string, unknown>): Promise<ToolResult> {
    return this.xPost(`/users/${encodeURIComponent(args.user_id as string)}/likes`, { tweet_id: args.tweet_id });
  }

  private async unlikeTweet(args: Record<string, unknown>): Promise<ToolResult> {
    return this.xDelete(`/users/${encodeURIComponent(args.user_id as string)}/likes/${encodeURIComponent(args.tweet_id as string)}`);
  }

  private async retweetPost(args: Record<string, unknown>): Promise<ToolResult> {
    return this.xPost(`/users/${encodeURIComponent(args.user_id as string)}/retweets`, { tweet_id: args.tweet_id });
  }

  private async undoRetweet(args: Record<string, unknown>): Promise<ToolResult> {
    return this.xDelete(`/users/${encodeURIComponent(args.user_id as string)}/retweets/${encodeURIComponent(args.source_tweet_id as string)}`);
  }

  private async getBookmarks(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.max_results) params.append('max_results', String(args.max_results));
    if (args.pagination_token) params.append('pagination_token', args.pagination_token as string);
    if (args.tweet_fields) params.append('tweet.fields', args.tweet_fields as string);
    return this.xGet(`/users/${encodeURIComponent(args.id as string)}/bookmarks`, params);
  }

  private async addBookmark(args: Record<string, unknown>): Promise<ToolResult> {
    return this.xPost(`/users/${encodeURIComponent(args.user_id as string)}/bookmarks`, { tweet_id: args.tweet_id });
  }

  private async removeBookmark(args: Record<string, unknown>): Promise<ToolResult> {
    return this.xDelete(`/users/${encodeURIComponent(args.user_id as string)}/bookmarks/${encodeURIComponent(args.tweet_id as string)}`);
  }

  private async getList(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.list_fields) params.append('list.fields', args.list_fields as string);
    return this.xGet(`/lists/${encodeURIComponent(args.id as string)}`, params);
  }

  private async getUserLists(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.max_results) params.append('max_results', String(args.max_results));
    if (args.pagination_token) params.append('pagination_token', args.pagination_token as string);
    if (args.list_fields) params.append('list.fields', args.list_fields as string);
    return this.xGet(`/users/${encodeURIComponent(args.id as string)}/owned_lists`, params);
  }

  private async getListMembers(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.max_results) params.append('max_results', String(args.max_results));
    if (args.pagination_token) params.append('pagination_token', args.pagination_token as string);
    if (args.user_fields) params.append('user.fields', args.user_fields as string);
    return this.xGet(`/lists/${encodeURIComponent(args.id as string)}/members`, params);
  }

  private async getListTweets(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.max_results) params.append('max_results', String(args.max_results));
    if (args.pagination_token) params.append('pagination_token', args.pagination_token as string);
    if (args.tweet_fields) params.append('tweet.fields', args.tweet_fields as string);
    if (args.expansions) params.append('expansions', args.expansions as string);
    return this.xGet(`/lists/${encodeURIComponent(args.id as string)}/tweets`, params);
  }
}

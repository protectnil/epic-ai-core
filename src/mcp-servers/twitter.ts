/**
 * Twitter MCP Server
 * X/Twitter API v2 adapter for tweets, users, and followers
 *
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */
import { ToolDefinition, ToolResult } from './types.js';

interface TwitterConfig {
  bearerToken: string;
}

export class TwitterMCPServer {
  private readonly baseUrl = 'https://api.x.com/2';
  private readonly headers: Record<string, string>;

  constructor(config: TwitterConfig) {
    this.headers = {
      Authorization: `Bearer ${config.bearerToken}`,
      'Content-Type': 'application/json',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'search_tweets',
        description: 'Search recent tweets using query string (last 7 days)',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Twitter search query' },
            max_results: { type: 'number', description: 'Number of results (10-100)' },
            next_token: { type: 'string', description: 'Pagination token' },
            tweet_fields: { type: 'string', description: 'Comma-separated tweet fields to include' },
          },
          required: ['query'],
        },
      },
      {
        name: 'get_user',
        description: 'Get a Twitter user by username or ID',
        inputSchema: {
          type: 'object',
          properties: {
            username: { type: 'string', description: 'Twitter username (without @)' },
            id: { type: 'string', description: 'Twitter user ID' },
            user_fields: { type: 'string', description: 'Comma-separated user fields to include' },
          },
        },
      },
      {
        name: 'get_user_tweets',
        description: 'Get recent tweets from a specific user',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Twitter user ID' },
            max_results: { type: 'number', description: 'Number of results (5-100)' },
            pagination_token: { type: 'string', description: 'Pagination token' },
            tweet_fields: { type: 'string', description: 'Comma-separated tweet fields to include' },
            exclude: { type: 'string', description: 'Types to exclude (retweets,replies)' },
          },
          required: ['id'],
        },
      },
      {
        name: 'get_tweet',
        description: 'Get a single tweet by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Tweet ID' },
            tweet_fields: { type: 'string', description: 'Comma-separated tweet fields to include' },
            expansions: { type: 'string', description: 'Comma-separated expansion fields' },
          },
          required: ['id'],
        },
      },
      {
        name: 'get_user_followers',
        description: 'Get followers of a Twitter user',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Twitter user ID' },
            max_results: { type: 'number', description: 'Number of results (1-1000)' },
            pagination_token: { type: 'string', description: 'Pagination token' },
            user_fields: { type: 'string', description: 'Comma-separated user fields to include' },
          },
          required: ['id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'search_tweets':
          return await this.searchTweets(args);
        case 'get_user':
          return await this.getUser(args);
        case 'get_user_tweets':
          return await this.getUserTweets(args);
        case 'get_tweet':
          return await this.getTweet(args);
        case 'get_user_followers':
          return await this.getUserFollowers(args);
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

  private async searchTweets(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams({ query: args.query as string });
    if (args.max_results) params.append('max_results', String(args.max_results));
    if (args.next_token) params.append('next_token', args.next_token as string);
    if (args.tweet_fields) params.append('tweet.fields', args.tweet_fields as string);
    const response = await fetch(`${this.baseUrl}/tweets/search/recent?${params}`, { method: 'GET', headers: this.headers });
    if (!response.ok) throw new Error(`Twitter API error: ${response.status} ${response.statusText}`);
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async getUser(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.user_fields) params.append('user.fields', args.user_fields as string);
    let url: string;
    if (args.username) {
      url = `${this.baseUrl}/users/by/username/${args.username}?${params}`;
    } else if (args.id) {
      url = `${this.baseUrl}/users/${args.id}?${params}`;
    } else {
      throw new Error('Either username or id is required');
    }
    const response = await fetch(url, { method: 'GET', headers: this.headers });
    if (!response.ok) throw new Error(`Twitter API error: ${response.status} ${response.statusText}`);
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async getUserTweets(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.max_results) params.append('max_results', String(args.max_results));
    if (args.pagination_token) params.append('pagination_token', args.pagination_token as string);
    if (args.tweet_fields) params.append('tweet.fields', args.tweet_fields as string);
    if (args.exclude) params.append('exclude', args.exclude as string);
    const response = await fetch(`${this.baseUrl}/users/${args.id}/tweets?${params}`, { method: 'GET', headers: this.headers });
    if (!response.ok) throw new Error(`Twitter API error: ${response.status} ${response.statusText}`);
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async getTweet(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.tweet_fields) params.append('tweet.fields', args.tweet_fields as string);
    if (args.expansions) params.append('expansions', args.expansions as string);
    const response = await fetch(`${this.baseUrl}/tweets/${args.id}?${params}`, { method: 'GET', headers: this.headers });
    if (!response.ok) throw new Error(`Twitter API error: ${response.status} ${response.statusText}`);
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async getUserFollowers(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.max_results) params.append('max_results', String(args.max_results));
    if (args.pagination_token) params.append('pagination_token', args.pagination_token as string);
    if (args.user_fields) params.append('user.fields', args.user_fields as string);
    const response = await fetch(`${this.baseUrl}/users/${args.id}/followers?${params}`, { method: 'GET', headers: this.headers });
    if (!response.ok) throw new Error(`Twitter API error: ${response.status} ${response.statusText}`);
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }
}

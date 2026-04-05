/**
 * BritBox UK MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03. BritBox (britbox.co.uk) has not published an official MCP server.
//
// Base URL: https://isl.britbox.co.uk/api  (spec base path: /api — prepend host)
// Auth: OAuth2 password flow for account/profile tokens (JWT Bearer).
//   Account token endpoint: POST /api/account/authorization
//   Profile token endpoint: POST /api/account/profile/authorization
//   Refresh endpoint: POST /api/authorization/refresh
//   Most catalog/browse endpoints are unauthenticated; account endpoints require Bearer token.
// API: BritBox "Rocket Services" orchestration layer v3.730.300 — wraps ISL backend services.
// Docs: https://isl.britbox.co.uk/api/spec (live OpenAPI spec)
// Rate limits: Not publicly documented.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface BritBoxUKConfig {
  /** Optional Bearer token for authenticated account/profile operations */
  accessToken?: string;
  /** Base URL — defaults to https://isl.britbox.co.uk/api */
  baseUrl?: string;
}

export class BritBoxUKMCPServer extends MCPAdapterBase {
  private readonly accessToken: string | undefined;
  private readonly baseUrl: string;

  constructor(config: BritBoxUKConfig = {}) {
    super();
    this.accessToken = config.accessToken;
    this.baseUrl = (config.baseUrl ?? 'https://isl.britbox.co.uk/api').replace(/\/+$/, '');
  }

  static catalog() {
    return {
      name: 'britbox-uk',
      displayName: 'BritBox UK',
      version: '1.0.0',
      category: 'media' as const,
      keywords: [
        'britbox', 'britbox-uk', 'streaming', 'video', 'media', 'entertainment',
        'british tv', 'uk television', 'bbc', 'itv', 'subscription', 'vod',
        'on-demand', 'series', 'episode', 'search', 'catalog', 'watchlist',
        'bookmark', 'continue watching', 'profile', 'account', 'plan', 'billing',
        'device', 'authentication', 'token', 'schedule', 'channel', 'content',
      ],
      toolNames: [
        'get_page',
        'get_list',
        'get_lists',
        'search',
        'get_schedules',
        'get_account_token',
        'refresh_token',
        'sign_out',
        'get_account',
        'get_profile',
        'get_bookmarks',
        'bookmark_item',
        'delete_bookmark',
        'get_watched',
        'set_watched_status',
        'get_continue_watching',
        'get_item_media_files',
        'get_next_playback_item',
        'get_entitlements',
        'get_devices',
        'register',
        'forgot_password',
      ],
      description: 'BritBox UK Rocket Services: browse catalog pages and lists, search content, manage bookmarks and watch history, handle authentication, and access account/device/subscription data.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'get_page',
        description: 'Get a BritBox page by path — returns the full page layout including lists, schedules, and item details. Use for homepage, genre pages, show pages, etc.',
        inputSchema: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'Page path, e.g. "/" for homepage, "/drama" for drama genre, "/show/peaky-blinders"',
            },
            list_page_size: {
              type: 'number',
              description: 'Number of items per list on the page (default: 12)',
            },
            max_rating: {
              type: 'string',
              description: 'Maximum content rating to include, e.g. "BBFC-15"',
            },
          },
          required: ['path'],
        },
      },
      {
        name: 'get_list',
        description: 'Get a specific content list by ID with paginated items — used for carousels, collections, or curated lists on BritBox',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'List ID (found in page responses)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            page_size: {
              type: 'number',
              description: 'Items per page (default: 12, max: 48)',
            },
            max_rating: {
              type: 'string',
              description: 'Maximum content rating to include',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'get_lists',
        description: 'Get multiple content lists by their IDs in a single request — efficient for loading several carousels at once',
        inputSchema: {
          type: 'object',
          properties: {
            ids: {
              type: 'string',
              description: 'Comma-separated list IDs, e.g. "list1,list2,list3"',
            },
            page_size: {
              type: 'number',
              description: 'Items per list (default: 12)',
            },
            max_rating: {
              type: 'string',
              description: 'Maximum content rating filter',
            },
          },
          required: ['ids'],
        },
      },
      {
        name: 'search',
        description: 'Search BritBox catalog for shows, episodes, and collections by keyword',
        inputSchema: {
          type: 'object',
          properties: {
            term: {
              type: 'string',
              description: 'Search term or keyword',
            },
            include: {
              type: 'string',
              description: 'Comma-separated item types to include: movie, show, season, episode, program, link, trailer',
            },
            group: {
              type: 'string',
              description: 'Group results by type: true groups into type buckets; false returns flat results',
            },
            max_results: {
              type: 'number',
              description: 'Maximum number of results to return per type (default: 10)',
            },
          },
          required: ['term'],
        },
      },
      {
        name: 'get_schedules',
        description: 'Get broadcast schedules for BritBox linear channels by date and time',
        inputSchema: {
          type: 'object',
          properties: {
            channels: {
              type: 'string',
              description: 'Comma-separated channel IDs to fetch schedules for',
            },
            date: {
              type: 'string',
              description: 'Schedule date in YYYY-MM-DD format',
            },
            hour: {
              type: 'number',
              description: 'Starting hour (0–23)',
            },
            duration: {
              type: 'number',
              description: 'Duration in hours to fetch (e.g. 4 = 4 hours from start hour)',
            },
          },
          required: ['channels', 'date', 'hour', 'duration'],
        },
      },
      {
        name: 'get_account_token',
        description: 'Authenticate with BritBox and obtain an account JWT token using email and password',
        inputSchema: {
          type: 'object',
          properties: {
            email: {
              type: 'string',
              description: 'BritBox account email address',
            },
            password: {
              type: 'string',
              description: 'BritBox account password',
            },
          },
          required: ['email', 'password'],
        },
      },
      {
        name: 'refresh_token',
        description: 'Refresh an expired BritBox JWT access token using a valid refresh token',
        inputSchema: {
          type: 'object',
          properties: {
            refresh_token: {
              type: 'string',
              description: 'The refresh token obtained during authentication',
            },
          },
          required: ['refresh_token'],
        },
      },
      {
        name: 'sign_out',
        description: 'Sign out of BritBox — invalidates the current account token',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_account',
        description: 'Get the authenticated BritBox account details including email, subscription status, and profile list',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_profile',
        description: 'Get the current active profile details including name, avatar, parental controls, and preferences',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_bookmarks',
        description: 'Get all items bookmarked (saved to watchlist) on the current profile',
        inputSchema: {
          type: 'object',
          properties: {
            page: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
            page_size: {
              type: 'number',
              description: 'Items per page (default: 20)',
            },
          },
        },
      },
      {
        name: 'bookmark_item',
        description: 'Add an item to the current profile watchlist/bookmarks by item ID',
        inputSchema: {
          type: 'object',
          properties: {
            item_id: {
              type: 'string',
              description: 'BritBox item ID (show, movie, or episode) to bookmark',
            },
          },
          required: ['item_id'],
        },
      },
      {
        name: 'delete_bookmark',
        description: 'Remove an item from the current profile watchlist/bookmarks by item ID',
        inputSchema: {
          type: 'object',
          properties: {
            item_id: {
              type: 'string',
              description: 'BritBox item ID to remove from bookmarks',
            },
          },
          required: ['item_id'],
        },
      },
      {
        name: 'get_watched',
        description: 'Get the full list of items the current profile has watched, with completion and position data',
        inputSchema: {
          type: 'object',
          properties: {
            page: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
            page_size: {
              type: 'number',
              description: 'Items per page (default: 20)',
            },
            completed: {
              type: 'boolean',
              description: 'Filter: true = only completed, false = only in-progress, omit = all',
            },
          },
        },
      },
      {
        name: 'set_watched_status',
        description: 'Set or update the watch position for an item — used to record progress or mark as watched',
        inputSchema: {
          type: 'object',
          properties: {
            item_id: {
              type: 'string',
              description: 'BritBox item ID (episode or movie) to update watch position for',
            },
            position: {
              type: 'number',
              description: 'Playback position in seconds',
            },
          },
          required: ['item_id', 'position'],
        },
      },
      {
        name: 'get_continue_watching',
        description: 'Get the Continue Watching list for the current profile — in-progress shows and movies',
        inputSchema: {
          type: 'object',
          properties: {
            page: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
            page_size: {
              type: 'number',
              description: 'Items per page (default: 20)',
            },
            max_rating: {
              type: 'string',
              description: 'Maximum content rating filter',
            },
          },
        },
      },
      {
        name: 'get_item_media_files',
        description: 'Get playback media file URLs for a specific item — returns stream URLs, DRM info, and quality options',
        inputSchema: {
          type: 'object',
          properties: {
            item_id: {
              type: 'string',
              description: 'BritBox item ID (episode or movie) to get media files for',
            },
          },
          required: ['item_id'],
        },
      },
      {
        name: 'get_next_playback_item',
        description: 'Get the next episode or item to play after the specified item — used for autoplay/up-next functionality',
        inputSchema: {
          type: 'object',
          properties: {
            item_id: {
              type: 'string',
              description: 'Current item ID — returns the next item after this one',
            },
            max_rating: {
              type: 'string',
              description: 'Maximum content rating for the next item',
            },
          },
          required: ['item_id'],
        },
      },
      {
        name: 'get_entitlements',
        description: 'Get the list of content entitlements for the authenticated account — shows what content the user can access',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_devices',
        description: 'Get all devices registered to the authenticated BritBox account',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'register',
        description: 'Register a new BritBox account with email, password, and optional marketing preferences',
        inputSchema: {
          type: 'object',
          properties: {
            email: {
              type: 'string',
              description: 'Email address for the new account',
            },
            password: {
              type: 'string',
              description: 'Password for the new account',
            },
            first_name: {
              type: 'string',
              description: 'Account holder first name',
            },
            last_name: {
              type: 'string',
              description: 'Account holder last name',
            },
          },
          required: ['email', 'password'],
        },
      },
      {
        name: 'forgot_password',
        description: 'Request a password reset email for a BritBox account',
        inputSchema: {
          type: 'object',
          properties: {
            email: {
              type: 'string',
              description: 'Email address of the account to reset password for',
            },
          },
          required: ['email'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'get_page':
          return this.getPage(args);
        case 'get_list':
          return this.getList(args);
        case 'get_lists':
          return this.getLists(args);
        case 'search':
          return this.search(args);
        case 'get_schedules':
          return this.getSchedules(args);
        case 'get_account_token':
          return this.getAccountToken(args);
        case 'refresh_token':
          return this.refreshToken(args);
        case 'sign_out':
          return this.signOut();
        case 'get_account':
          return this.getAccount();
        case 'get_profile':
          return this.getProfile();
        case 'get_bookmarks':
          return this.getBookmarks(args);
        case 'bookmark_item':
          return this.bookmarkItem(args);
        case 'delete_bookmark':
          return this.deleteBookmark(args);
        case 'get_watched':
          return this.getWatched(args);
        case 'set_watched_status':
          return this.setWatchedStatus(args);
        case 'get_continue_watching':
          return this.getContinueWatching(args);
        case 'get_item_media_files':
          return this.getItemMediaFiles(args);
        case 'get_next_playback_item':
          return this.getNextPlaybackItem(args);
        case 'get_entitlements':
          return this.getEntitlements();
        case 'get_devices':
          return this.getDevices();
        case 'register':
          return this.register(args);
        case 'forgot_password':
          return this.forgotPassword(args);
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
    const h: Record<string, string> = { 'Content-Type': 'application/json', 'Accept': 'application/json' };
    if (this.accessToken) h['Authorization'] = `Bearer ${this.accessToken}`;
    return h;
  }

  private async httpGet(path: string, params: Record<string, string | undefined> = {}): Promise<ToolResult> {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) qs.set(k, v);
    }
    const query = qs.toString();
    const url = `${this.baseUrl}${path}${query ? '?' + query : ''}`;
    const response = await this.fetchWithRetry(url, { method: 'GET', headers: this.authHeaders });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`BritBox returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async httpPost(path: string, body: unknown): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.authHeaders,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `API error: ${response.status} ${errText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`BritBox returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async httpPut(path: string, params: Record<string, string | undefined> = {}, body?: unknown): Promise<ToolResult> {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) qs.set(k, v);
    }
    const query = qs.toString();
    const url = `${this.baseUrl}${path}${query ? '?' + query : ''}`;
    const response = await this.fetchWithRetry(url, {
      method: 'PUT',
      headers: this.authHeaders,
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { return { content: [{ type: 'text', text: JSON.stringify({ success: true }) }], isError: false }; }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async httpDelete(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, { method: 'DELETE', headers: this.authHeaders });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: JSON.stringify({ deleted: true }) }], isError: false };
  }

  // ── Tool implementations ──

  private async getPage(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.path) return { content: [{ type: 'text', text: 'path is required' }], isError: true };
    const params: Record<string, string | undefined> = {
      path: args.path as string,
      list_page_size: args.list_page_size !== undefined ? String(args.list_page_size) : undefined,
      max_rating: args.max_rating as string | undefined,
    };
    return this.httpGet('/page', params);
  }

  private async getList(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    const params: Record<string, string | undefined> = {
      page: args.page !== undefined ? String(args.page) : undefined,
      page_size: args.page_size !== undefined ? String(args.page_size) : undefined,
      max_rating: args.max_rating as string | undefined,
    };
    return this.httpGet(`/lists/${encodeURIComponent(args.id as string)}`, params);
  }

  private async getLists(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.ids) return { content: [{ type: 'text', text: 'ids is required' }], isError: true };
    const params: Record<string, string | undefined> = {
      ids: args.ids as string,
      page_size: args.page_size !== undefined ? String(args.page_size) : undefined,
      max_rating: args.max_rating as string | undefined,
    };
    return this.httpGet('/lists', params);
  }

  private async search(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.term) return { content: [{ type: 'text', text: 'term is required' }], isError: true };
    const params: Record<string, string | undefined> = {
      term: args.term as string,
      include: args.include as string | undefined,
      group: args.group !== undefined ? String(args.group) : undefined,
      max_results: args.max_results !== undefined ? String(args.max_results) : undefined,
    };
    return this.httpGet('/search', params);
  }

  private async getSchedules(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.channels || !args.date || args.hour === undefined || args.duration === undefined) {
      return { content: [{ type: 'text', text: 'channels, date, hour, and duration are required' }], isError: true };
    }
    const params: Record<string, string | undefined> = {
      channels: args.channels as string,
      date: args.date as string,
      hour: String(args.hour),
      duration: String(args.duration),
    };
    return this.httpGet('/schedules', params);
  }

  private async getAccountToken(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.email || !args.password) {
      return { content: [{ type: 'text', text: 'email and password are required' }], isError: true };
    }
    return this.httpPost('/authorization', { email: args.email, password: args.password });
  }

  private async refreshToken(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.refresh_token) return { content: [{ type: 'text', text: 'refresh_token is required' }], isError: true };
    return this.httpPost('/authorization/refresh', { token: args.refresh_token });
  }

  private async signOut(): Promise<ToolResult> {
    return this.httpDelete('/authorization');
  }

  private async getAccount(): Promise<ToolResult> {
    return this.httpGet('/account');
  }

  private async getProfile(): Promise<ToolResult> {
    return this.httpGet('/account/profile');
  }

  private async getBookmarks(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string | undefined> = {
      page: args.page !== undefined ? String(args.page) : undefined,
      page_size: args.page_size !== undefined ? String(args.page_size) : undefined,
    };
    return this.httpGet('/account/profile/bookmarks/list', params);
  }

  private async bookmarkItem(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.item_id) return { content: [{ type: 'text', text: 'item_id is required' }], isError: true };
    return this.httpPut(`/account/profile/bookmarks/${encodeURIComponent(args.item_id as string)}`);
  }

  private async deleteBookmark(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.item_id) return { content: [{ type: 'text', text: 'item_id is required' }], isError: true };
    return this.httpDelete(`/account/profile/bookmarks/${encodeURIComponent(args.item_id as string)}`);
  }

  private async getWatched(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string | undefined> = {
      page: args.page !== undefined ? String(args.page) : undefined,
      page_size: args.page_size !== undefined ? String(args.page_size) : undefined,
      completed: args.completed !== undefined ? String(args.completed) : undefined,
    };
    return this.httpGet('/account/profile/watched/list', params);
  }

  private async setWatchedStatus(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.item_id || args.position === undefined) {
      return { content: [{ type: 'text', text: 'item_id and position are required' }], isError: true };
    }
    const params: Record<string, string | undefined> = {
      position: String(args.position),
    };
    return this.httpPut(`/account/profile/watched/${encodeURIComponent(args.item_id as string)}`, params);
  }

  private async getContinueWatching(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string | undefined> = {
      page: args.page !== undefined ? String(args.page) : undefined,
      page_size: args.page_size !== undefined ? String(args.page_size) : undefined,
      max_rating: args.max_rating as string | undefined,
    };
    return this.httpGet('/account/profile/continue-watching/list', params);
  }

  private async getItemMediaFiles(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.item_id) return { content: [{ type: 'text', text: 'item_id is required' }], isError: true };
    return this.httpGet(`/account/items/${encodeURIComponent(args.item_id as string)}/videos`);
  }

  private async getNextPlaybackItem(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.item_id) return { content: [{ type: 'text', text: 'item_id is required' }], isError: true };
    const params: Record<string, string | undefined> = {
      max_rating: args.max_rating as string | undefined,
    };
    return this.httpGet(`/account/profile/items/${encodeURIComponent(args.item_id as string)}/next`, params);
  }

  private async getEntitlements(): Promise<ToolResult> {
    return this.httpGet('/account/entitlements');
  }

  private async getDevices(): Promise<ToolResult> {
    return this.httpGet('/account/devices');
  }

  private async register(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.email || !args.password) {
      return { content: [{ type: 'text', text: 'email and password are required' }], isError: true };
    }
    const body: Record<string, unknown> = { email: args.email, password: args.password };
    if (args.first_name) body.firstName = args.first_name;
    if (args.last_name) body.lastName = args.last_name;
    return this.httpPost('/register', body);
  }

  private async forgotPassword(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.email) return { content: [{ type: 'text', text: 'email is required' }], isError: true };
    return this.httpPost('/request-password-reset', { email: args.email });
  }
}

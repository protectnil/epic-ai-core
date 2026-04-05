/**
 * NPR Listening MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: No official vendor MCP server found.
// Our adapter covers: 9 tools (recommendations, channels, history, ratings, search, organizations, promo, aggregation).
// Community MCP servers: None found for this service.
// Recommendation: Use this adapter for full NPR listening coverage.
//
// Base URL: https://listening.api.npr.org
// Auth: OAuth2 Bearer token (passed as Authorization header)
// Docs: https://dev.npr.org/guide/services/listening
// Note: Audio recommendations tailored to a user's preferences via NPR One.
// Rate limits: Contact NPROneEnterprise@npr.org for rate limit details.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface NprListeningConfig {
  accessToken: string;
  /** Optional base URL override (default: https://listening.api.npr.org) */
  baseUrl?: string;
}

export class NprListeningMCPServer extends MCPAdapterBase {
  private readonly accessToken: string;
  private readonly baseUrl: string;

  constructor(config: NprListeningConfig) {
    super();
    this.accessToken = config.accessToken;
    this.baseUrl = config.baseUrl ?? 'https://listening.api.npr.org';
  }

  static catalog() {
    return {
      name: 'npr-listening',
      displayName: 'NPR Listening',
      version: '1.0.0',
      category: 'media',
      keywords: [
        'npr', 'listening', 'audio', 'recommendations', 'radio', 'podcast',
        'public radio', 'media', 'news', 'channels', 'history', 'ratings', 'search',
      ],
      toolNames: [
        'get_recommendations',
        'get_aggregation_recommendations',
        'get_channels',
        'get_history',
        'get_organization_recommendations',
        'get_organization_category_recommendations',
        'get_promo_recommendations',
        'post_ratings',
        'search_recommendations',
      ],
      description: 'NPR Listening Service — personalized audio recommendations, channels, listening history, ratings, search, and organization content for NPR One.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'get_recommendations',
        description: 'Get a personalized list of media recommendations for the logged-in user from NPR\'s recommendation engine — use for initial recommendation lists',
        inputSchema: {
          type: 'object',
          properties: {
            channel: {
              type: 'string',
              description: 'The channel to get recommendations from (e.g. "npr", "news", "podcast")',
            },
            shared_media_id: {
              type: 'string',
              description: 'Media ID shared directly with the user — adds this recommendation to the top of the returned list',
            },
            notified_media_id: {
              type: 'string',
              description: 'Media ID from a push notification — adds this recommendation to the top of the returned list',
            },
            advertising_id: {
              type: 'string',
              description: 'Advertising identifier for the device (X-Advertising-ID header)',
            },
          },
        },
      },
      {
        name: 'get_aggregation_recommendations',
        description: 'Get a list of recent audio items for a specific aggregation (program or podcast) independent of the user\'s listening history',
        inputSchema: {
          type: 'object',
          properties: {
            agg_id: {
              type: 'integer',
              description: 'ID of an aggregation such as a program or podcast',
            },
            start_num: {
              type: 'integer',
              description: 'The result to start with — allows paging through episodes; defaults to 0',
            },
          },
          required: ['agg_id'],
        },
      },
      {
        name: 'get_channels',
        description: 'Get the list of available NPR One channels that the user can specify to focus content in recommendations',
        inputSchema: {
          type: 'object',
          properties: {
            explore_only: {
              type: 'boolean',
              description: 'If true, returns only channels that should be shown in the Explore section of the client',
            },
          },
        },
      },
      {
        name: 'get_history',
        description: 'Get recent ratings the logged-in user has submitted — returns recently-rated audio recommendations the user has consumed',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_organization_recommendations',
        description: 'Get a variety of details about an NPR organization including lists of recent audio items across categories',
        inputSchema: {
          type: 'object',
          properties: {
            org_id: {
              type: 'integer',
              description: 'ID of an organization such as an NPR One station',
            },
          },
          required: ['org_id'],
        },
      },
      {
        name: 'get_organization_category_recommendations',
        description: 'Get a list of recommendations from a specific category of content from an NPR organization',
        inputSchema: {
          type: 'object',
          properties: {
            org_id: {
              type: 'integer',
              description: 'ID of an organization such as an NPR One station',
            },
            category: {
              type: 'string',
              description: 'One of the three categories of content: newscast, story, or podcast',
              enum: ['newscast', 'story', 'podcast'],
            },
          },
          required: ['org_id', 'category'],
        },
      },
      {
        name: 'get_promo_recommendations',
        description: 'Retrieve the most recent promo audio for the logged-in user — returns promos the user has neither tapped through nor listened to the target story',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'post_ratings',
        description: 'Submit ratings for media previously recommended to the logged-in user — the primary feedback mechanism from user to NPR for improving recommendations',
        inputSchema: {
          type: 'object',
          properties: {
            ratings: {
              type: 'array',
              description: 'Array of RatingData objects — each should include media ID, rating value, channel, cohort, and any affiliations returned by the server',
              items: {
                type: 'object',
              },
            },
            channel: {
              type: 'string',
              description: 'The channel the rated media was pulled from',
            },
            recommend: {
              type: 'boolean',
              description: 'If true (default), returns a new recommendation; if false, returns a blank document',
            },
            advertising_id: {
              type: 'string',
              description: 'Advertising identifier for the device (X-Advertising-ID header)',
            },
          },
          required: ['ratings'],
        },
      },
      {
        name: 'search_recommendations',
        description: 'Search NPR for recent audio items and aggregations matching the given search terms — returns AggregationAudioItemListDocument or AudioItemDocument results',
        inputSchema: {
          type: 'object',
          properties: {
            search_terms: {
              type: 'string',
              description: 'Search terms to query; can include URL-encoded punctuation (e.g. "Morning Edition", "planet money")',
            },
          },
          required: ['search_terms'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'get_recommendations':
          return this.getRecommendations(args);
        case 'get_aggregation_recommendations':
          return this.getAggregationRecommendations(args);
        case 'get_channels':
          return this.getChannels(args);
        case 'get_history':
          return this.getHistory();
        case 'get_organization_recommendations':
          return this.getOrganizationRecommendations(args);
        case 'get_organization_category_recommendations':
          return this.getOrganizationCategoryRecommendations(args);
        case 'get_promo_recommendations':
          return this.getPromoRecommendations();
        case 'post_ratings':
          return this.postRatings(args);
        case 'search_recommendations':
          return this.searchRecommendations(args);
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

  private authHeaders(advertisingId?: string, channel?: string): Record<string, string> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
    };
    if (advertisingId) headers['X-Advertising-ID'] = advertisingId;
    if (channel) headers['X-NPR-Channel'] = channel;
    return headers;
  }

  private async doGet(path: string, params: Record<string, string | undefined> = {}, extraHeaders: Record<string, string> = {}): Promise<ToolResult> {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) qs.set(k, v);
    }
    const qstr = qs.toString();
    const url = `${this.baseUrl}${path}${qstr ? `?${qstr}` : ''}`;

    const response = await this.fetchWithRetry(url, {
      method: 'GET',
      headers: { ...this.authHeaders(), ...extraHeaders },
    });

    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }

    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`NPR Listening returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getRecommendations(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string | undefined> = {};
    if (args.shared_media_id) params.sharedMediaId = args.shared_media_id as string;
    if (args.notified_media_id) params.notifiedMediaId = args.notified_media_id as string;
    const extraHeaders: Record<string, string> = {};
    if (args.advertising_id) extraHeaders['X-Advertising-ID'] = args.advertising_id as string;
    if (args.channel) extraHeaders['X-NPR-Channel'] = args.channel as string;
    return this.doGet('/v2/recommendations', params, extraHeaders);
  }

  private async getAggregationRecommendations(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.agg_id === undefined) {
      return { content: [{ type: 'text', text: 'agg_id is required' }], isError: true };
    }
    const params: Record<string, string | undefined> = {};
    if (args.start_num !== undefined) params.startNum = String(args.start_num);
    return this.doGet(`/v2/aggregation/${encodeURIComponent(String(args.agg_id))}/recommendations`, params);
  }

  private async getChannels(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string | undefined> = {};
    if (args.explore_only !== undefined) params.exploreOnly = String(args.explore_only);
    return this.doGet('/v2/channels', params);
  }

  private async getHistory(): Promise<ToolResult> {
    return this.doGet('/v2/history');
  }

  private async getOrganizationRecommendations(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.org_id === undefined) {
      return { content: [{ type: 'text', text: 'org_id is required' }], isError: true };
    }
    return this.doGet(`/v2/organizations/${encodeURIComponent(String(args.org_id))}/recommendations`);
  }

  private async getOrganizationCategoryRecommendations(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.org_id === undefined) {
      return { content: [{ type: 'text', text: 'org_id is required' }], isError: true };
    }
    if (!args.category) {
      return { content: [{ type: 'text', text: 'category is required — one of: newscast, story, podcast' }], isError: true };
    }
    const validCategories = ['newscast', 'story', 'podcast'];
    if (!validCategories.includes(args.category as string)) {
      return { content: [{ type: 'text', text: `category must be one of: ${validCategories.join(', ')}` }], isError: true };
    }
    return this.doGet(
      `/v2/organizations/${encodeURIComponent(String(args.org_id))}/categories/${encodeURIComponent(args.category as string)}/recommendations`,
    );
  }

  private async getPromoRecommendations(): Promise<ToolResult> {
    return this.doGet('/v2/promo/recommendations');
  }

  private async postRatings(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.ratings || !Array.isArray(args.ratings)) {
      return { content: [{ type: 'text', text: 'ratings is required and must be an array' }], isError: true };
    }
    const params: Record<string, string | undefined> = {};
    if (args.recommend !== undefined) params.recommend = String(args.recommend);
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) qs.set(k, v);
    }
    const qstr = qs.toString();
    const url = `${this.baseUrl}/v2/ratings${qstr ? `?${qstr}` : ''}`;

    const extraHeaders: Record<string, string> = {};
    if (args.advertising_id) extraHeaders['X-Advertising-ID'] = args.advertising_id as string;
    if (args.channel) extraHeaders['X-NPR-Channel'] = args.channel as string;

    const response = await this.fetchWithRetry(url, {
      method: 'POST',
      headers: { ...this.authHeaders(), ...extraHeaders },
      body: JSON.stringify(args.ratings),
    });

    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }

    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`NPR Listening returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async searchRecommendations(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.search_terms) {
      return { content: [{ type: 'text', text: 'search_terms is required' }], isError: true };
    }
    return this.doGet('/v2/search/recommendations', { searchTerms: args.search_terms as string });
  }
}

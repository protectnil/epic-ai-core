/**
 * Instagram MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// No official Instagram MCP server was found on GitHub or any MCP registry.
// Instagram deprecated its public API for third-party apps in 2018 (v1 is legacy/sandbox-only).
// The current public-facing API is the Instagram Graph API (facebook.com/graph-api/v18.0).
// This adapter targets the legacy Instagram API v1 as documented in the apis.guru spec.
//
// Base URL: https://api.instagram.com/v1
// Auth: OAuth 2.0 implicit flow — access_token passed as query param or Bearer header
// Docs: https://instagram.com/developer
// Rate limits: 200 requests/hour per access_token (sandbox: 500 requests/hour)

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface InstagramConfig {
  accessToken: string;
  baseUrl?: string;
}

export class InstagramMCPServer extends MCPAdapterBase {
  private readonly accessToken: string;
  private readonly baseUrl: string;

  constructor(config: InstagramConfig) {
    super();
    this.accessToken = config.accessToken;
    this.baseUrl = config.baseUrl || 'https://api.instagram.com/v1';
  }

  static catalog() {
    return {
      name: 'instagram',
      displayName: 'Instagram',
      version: '1.0.0',
      category: 'social',
      keywords: [
        'instagram', 'social', 'media', 'photo', 'video', 'post', 'story',
        'feed', 'like', 'comment', 'tag', 'hashtag', 'user', 'follower',
        'follow', 'location', 'geography', 'shortcode',
      ],
      toolNames: [
        'get_user', 'get_self_feed', 'get_user_media', 'get_self_liked_media',
        'search_users', 'get_media', 'get_media_by_shortcode', 'search_media',
        'get_popular_media', 'get_media_comments', 'post_media_comment',
        'delete_media_comment', 'get_media_likes', 'like_media', 'unlike_media',
        'get_tag', 'search_tags', 'get_tag_media', 'get_location',
        'search_locations', 'get_location_media', 'get_user_relationship',
        'modify_user_relationship', 'get_follow_requests',
        'get_user_follows', 'get_user_followers',
      ],
      description: 'Instagram social platform: browse user profiles, media feed, photos, likes, comments, tags, locations, and follower relationships.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'get_user',
        description: 'Get basic profile information about a user by user ID, including username, bio, follower count, and media count',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: {
              type: 'string',
              description: 'Instagram user ID. Use "self" to get the authenticated user\'s profile',
            },
          },
          required: ['user_id'],
        },
      },
      {
        name: 'get_self_feed',
        description: 'Get the authenticated user\'s home feed with recent media from followed accounts, with pagination support',
        inputSchema: {
          type: 'object',
          properties: {
            count: {
              type: 'number',
              description: 'Number of media items to return (default: 20)',
            },
            min_id: {
              type: 'string',
              description: 'Return media newer than this media ID (pagination cursor)',
            },
            max_id: {
              type: 'string',
              description: 'Return media older than this media ID (pagination cursor)',
            },
          },
        },
      },
      {
        name: 'get_user_media',
        description: 'Get the most recent media published by a specific user, filterable by timestamp or media ID range',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: {
              type: 'string',
              description: 'Instagram user ID. Use "self" for the authenticated user',
            },
            count: {
              type: 'number',
              description: 'Number of media items to return (default: 20)',
            },
            max_timestamp: {
              type: 'number',
              description: 'Return media before this Unix timestamp',
            },
            min_timestamp: {
              type: 'number',
              description: 'Return media after this Unix timestamp',
            },
            min_id: {
              type: 'string',
              description: 'Return media newer than this media ID',
            },
            max_id: {
              type: 'string',
              description: 'Return media older than this media ID',
            },
          },
          required: ['user_id'],
        },
      },
      {
        name: 'get_self_liked_media',
        description: 'Get the list of media objects the authenticated user has liked, with pagination support',
        inputSchema: {
          type: 'object',
          properties: {
            count: {
              type: 'number',
              description: 'Number of liked media items to return (default: 20)',
            },
            max_like_id: {
              type: 'string',
              description: 'Return liked media older than this like ID (pagination cursor)',
            },
          },
        },
      },
      {
        name: 'search_users',
        description: 'Search for Instagram users by name or username with optional result count limit',
        inputSchema: {
          type: 'object',
          properties: {
            q: {
              type: 'string',
              description: 'Search query — name or username to search for',
            },
            count: {
              type: 'number',
              description: 'Maximum number of results to return (default: 10)',
            },
          },
          required: ['q'],
        },
      },
      {
        name: 'get_media',
        description: 'Get detailed information about a media object (photo or video) by its media ID, including caption, likes, and comments count',
        inputSchema: {
          type: 'object',
          properties: {
            media_id: {
              type: 'string',
              description: 'Instagram media ID',
            },
          },
          required: ['media_id'],
        },
      },
      {
        name: 'get_media_by_shortcode',
        description: 'Get media object information using the shortcode from the Instagram URL (instagram.com/p/{shortcode})',
        inputSchema: {
          type: 'object',
          properties: {
            shortcode: {
              type: 'string',
              description: 'Media shortcode from the Instagram post URL (e.g., "BVEMKfyDqLv")',
            },
          },
          required: ['shortcode'],
        },
      },
      {
        name: 'search_media',
        description: 'Search for media objects by geographic location (latitude/longitude) within a distance radius, optionally filtered by timestamp',
        inputSchema: {
          type: 'object',
          properties: {
            lat: {
              type: 'number',
              description: 'Latitude of the search center point',
            },
            lng: {
              type: 'number',
              description: 'Longitude of the search center point',
            },
            distance: {
              type: 'number',
              description: 'Search radius in meters (default: 1000, max: 5000)',
            },
            min_timestamp: {
              type: 'number',
              description: 'Return media after this Unix timestamp',
            },
            max_timestamp: {
              type: 'number',
              description: 'Return media before this Unix timestamp',
            },
          },
          required: ['lat', 'lng'],
        },
      },
      {
        name: 'get_popular_media',
        description: 'Get a list of currently popular and trending media on Instagram',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_media_comments',
        description: 'Get all comments on a media object, including comment text, author, and timestamp',
        inputSchema: {
          type: 'object',
          properties: {
            media_id: {
              type: 'string',
              description: 'Instagram media ID to retrieve comments for',
            },
          },
          required: ['media_id'],
        },
      },
      {
        name: 'post_media_comment',
        description: 'Post a text comment on a media object on behalf of the authenticated user (requires comments scope)',
        inputSchema: {
          type: 'object',
          properties: {
            media_id: {
              type: 'string',
              description: 'Instagram media ID to comment on',
            },
            text: {
              type: 'string',
              description: 'Comment text to post',
            },
          },
          required: ['media_id', 'text'],
        },
      },
      {
        name: 'delete_media_comment',
        description: 'Delete a specific comment from a media object (requires comments scope, must be own comment or own media)',
        inputSchema: {
          type: 'object',
          properties: {
            media_id: {
              type: 'string',
              description: 'Instagram media ID containing the comment',
            },
            comment_id: {
              type: 'string',
              description: 'Comment ID to delete',
            },
          },
          required: ['media_id', 'comment_id'],
        },
      },
      {
        name: 'get_media_likes',
        description: 'Get the list of users who have liked a specific media object',
        inputSchema: {
          type: 'object',
          properties: {
            media_id: {
              type: 'string',
              description: 'Instagram media ID to get likes for',
            },
          },
          required: ['media_id'],
        },
      },
      {
        name: 'like_media',
        description: 'Set a like on a media object on behalf of the authenticated user (requires likes scope)',
        inputSchema: {
          type: 'object',
          properties: {
            media_id: {
              type: 'string',
              description: 'Instagram media ID to like',
            },
          },
          required: ['media_id'],
        },
      },
      {
        name: 'unlike_media',
        description: 'Remove a like from a media object on behalf of the authenticated user (requires likes scope)',
        inputSchema: {
          type: 'object',
          properties: {
            media_id: {
              type: 'string',
              description: 'Instagram media ID to unlike',
            },
          },
          required: ['media_id'],
        },
      },
      {
        name: 'get_tag',
        description: 'Get information about a hashtag including media count and tag name',
        inputSchema: {
          type: 'object',
          properties: {
            tag_name: {
              type: 'string',
              description: 'Hashtag name without the # symbol (e.g., "photography")',
            },
          },
          required: ['tag_name'],
        },
      },
      {
        name: 'search_tags',
        description: 'Search for hashtags by name, returns matching tags with media counts',
        inputSchema: {
          type: 'object',
          properties: {
            q: {
              type: 'string',
              description: 'Tag search query without the # symbol',
            },
          },
          required: ['q'],
        },
      },
      {
        name: 'get_tag_media',
        description: 'Get recently tagged media for a specific hashtag with optional count and pagination by tag ID',
        inputSchema: {
          type: 'object',
          properties: {
            tag_name: {
              type: 'string',
              description: 'Hashtag name without the # symbol',
            },
            count: {
              type: 'number',
              description: 'Number of media items to return (default: 20)',
            },
            min_tag_id: {
              type: 'string',
              description: 'Return media newer than this tag ID (pagination cursor)',
            },
            max_tag_id: {
              type: 'string',
              description: 'Return media older than this tag ID (pagination cursor)',
            },
          },
          required: ['tag_name'],
        },
      },
      {
        name: 'get_location',
        description: 'Get information about a specific location including name, coordinates, and Foursquare/Facebook IDs',
        inputSchema: {
          type: 'object',
          properties: {
            location_id: {
              type: 'string',
              description: 'Instagram location ID',
            },
          },
          required: ['location_id'],
        },
      },
      {
        name: 'search_locations',
        description: 'Search for Instagram locations by geographic coordinates, optionally cross-referenced with Foursquare or Facebook Places',
        inputSchema: {
          type: 'object',
          properties: {
            lat: {
              type: 'number',
              description: 'Latitude coordinate for location search',
            },
            lng: {
              type: 'number',
              description: 'Longitude coordinate for location search',
            },
            distance: {
              type: 'number',
              description: 'Search radius in meters (default: 1000)',
            },
            facebook_places_id: {
              type: 'string',
              description: 'Facebook Places ID to cross-reference',
            },
            foursquare_id: {
              type: 'string',
              description: 'Foursquare venue ID to cross-reference',
            },
            foursquare_v2_id: {
              type: 'string',
              description: 'Foursquare v2 venue ID to cross-reference',
            },
          },
        },
      },
      {
        name: 'get_location_media',
        description: 'Get recent media posted at a specific location, filterable by timestamp or media ID range',
        inputSchema: {
          type: 'object',
          properties: {
            location_id: {
              type: 'string',
              description: 'Instagram location ID',
            },
            min_timestamp: {
              type: 'number',
              description: 'Return media after this Unix timestamp',
            },
            max_timestamp: {
              type: 'number',
              description: 'Return media before this Unix timestamp',
            },
            min_id: {
              type: 'string',
              description: 'Return media newer than this media ID',
            },
            max_id: {
              type: 'string',
              description: 'Return media older than this media ID',
            },
          },
          required: ['location_id'],
        },
      },
      {
        name: 'get_user_relationship',
        description: 'Get the relationship status between the authenticated user and a target user (following, followed_by, blocked, etc.)',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: {
              type: 'string',
              description: 'Target user ID to check relationship with',
            },
          },
          required: ['user_id'],
        },
      },
      {
        name: 'modify_user_relationship',
        description: 'Follow, unfollow, block, unblock, or approve/ignore a follow request for a user (requires relationships scope)',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: {
              type: 'string',
              description: 'Target user ID to modify relationship with',
            },
            action: {
              type: 'string',
              description: 'Relationship action: follow, unfollow, block, unblock, approve, ignore',
            },
          },
          required: ['user_id', 'action'],
        },
      },
      {
        name: 'get_follow_requests',
        description: 'List users who have requested to follow the authenticated user and are pending approval',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_user_follows',
        description: 'Get the list of users that a specific user follows (following list)',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: {
              type: 'string',
              description: 'User ID to get follows list for. Use "self" for the authenticated user',
            },
          },
          required: ['user_id'],
        },
      },
      {
        name: 'get_user_followers',
        description: 'Get the list of users who follow a specific user (followers list)',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: {
              type: 'string',
              description: 'User ID to get followers list for. Use "self" for the authenticated user',
            },
          },
          required: ['user_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'get_user':
          return this.getUser(args);
        case 'get_self_feed':
          return this.getSelfFeed(args);
        case 'get_user_media':
          return this.getUserMedia(args);
        case 'get_self_liked_media':
          return this.getSelfLikedMedia(args);
        case 'search_users':
          return this.searchUsers(args);
        case 'get_media':
          return this.getMedia(args);
        case 'get_media_by_shortcode':
          return this.getMediaByShortcode(args);
        case 'search_media':
          return this.searchMedia(args);
        case 'get_popular_media':
          return this.getPopularMedia();
        case 'get_media_comments':
          return this.getMediaComments(args);
        case 'post_media_comment':
          return this.postMediaComment(args);
        case 'delete_media_comment':
          return this.deleteMediaComment(args);
        case 'get_media_likes':
          return this.getMediaLikes(args);
        case 'like_media':
          return this.likeMedia(args);
        case 'unlike_media':
          return this.unlikeMedia(args);
        case 'get_tag':
          return this.getTag(args);
        case 'search_tags':
          return this.searchTags(args);
        case 'get_tag_media':
          return this.getTagMedia(args);
        case 'get_location':
          return this.getLocation(args);
        case 'search_locations':
          return this.searchLocations(args);
        case 'get_location_media':
          return this.getLocationMedia(args);
        case 'get_user_relationship':
          return this.getUserRelationship(args);
        case 'modify_user_relationship':
          return this.modifyUserRelationship(args);
        case 'get_follow_requests':
          return this.getFollowRequests();
        case 'get_user_follows':
          return this.getUserFollows(args);
        case 'get_user_followers':
          return this.getUserFollowers(args);
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

  private async request(path: string, method = 'GET', body?: Record<string, unknown>): Promise<ToolResult> {
    const separator = path.includes('?') ? '&' : '?';
    const url = method === 'GET'
      ? `${this.baseUrl}${path}${separator}access_token=${this.accessToken}`
      : `${this.baseUrl}${path}`;

    const options: RequestInit = {
      method,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    };

    if (body && method !== 'GET') {
      options.body = new URLSearchParams(
        Object.fromEntries(Object.entries(body).map(([k, v]) => [k, String(v)]))
      ).toString();
    }

    const response = await this.fetchWithRetry(url, options);

    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }

    const data = await response.json();
    const text = JSON.stringify(data, null, 2);
    const truncated = text.length > 10_000
      ? text.slice(0, 10_000) + `\n... [truncated, ${text.length} total chars]`
      : text;

    return {
      content: [{ type: 'text', text: truncated }],
      isError: false,
    };
  }

  private async getUser(args: Record<string, unknown>): Promise<ToolResult> {
    const userId = (args.user_id as string) ?? 'self';
    return this.request(`/users/${userId}`);
  }

  private async getSelfFeed(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.count) params.append('count', String(args.count));
    if (args.min_id) params.append('min_id', String(args.min_id));
    if (args.max_id) params.append('max_id', String(args.max_id));
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request(`/users/self/feed${query}`);
  }

  private async getUserMedia(args: Record<string, unknown>): Promise<ToolResult> {
    const userId = (args.user_id as string);
    const params = new URLSearchParams();
    if (args.count) params.append('count', String(args.count));
    if (args.max_timestamp) params.append('max_timestamp', String(args.max_timestamp));
    if (args.min_timestamp) params.append('min_timestamp', String(args.min_timestamp));
    if (args.min_id) params.append('min_id', String(args.min_id));
    if (args.max_id) params.append('max_id', String(args.max_id));
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request(`/users/${userId}/media/recent${query}`);
  }

  private async getSelfLikedMedia(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.count) params.append('count', String(args.count));
    if (args.max_like_id) params.append('max_like_id', String(args.max_like_id));
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request(`/users/self/media/liked${query}`);
  }

  private async searchUsers(args: Record<string, unknown>): Promise<ToolResult> {
    const q = encodeURIComponent(args.q as string);
    const count = args.count ? `&count=${args.count}` : '';
    return this.request(`/users/search?q=${q}${count}`);
  }

  private async getMedia(args: Record<string, unknown>): Promise<ToolResult> {
    const mediaId = args.media_id as string;
    return this.request(`/media/${mediaId}`);
  }

  private async getMediaByShortcode(args: Record<string, unknown>): Promise<ToolResult> {
    const shortcode = args.shortcode as string;
    return this.request(`/media/shortcode/${shortcode}`);
  }

  private async searchMedia(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    params.append('lat', String(args.lat));
    params.append('lng', String(args.lng));
    if (args.distance) params.append('distance', String(args.distance));
    if (args.min_timestamp) params.append('min_timestamp', String(args.min_timestamp));
    if (args.max_timestamp) params.append('max_timestamp', String(args.max_timestamp));
    return this.request(`/media/search?${params.toString()}`);
  }

  private async getPopularMedia(): Promise<ToolResult> {
    return this.request('/media/popular');
  }

  private async getMediaComments(args: Record<string, unknown>): Promise<ToolResult> {
    const mediaId = args.media_id as string;
    return this.request(`/media/${mediaId}/comments`);
  }

  private async postMediaComment(args: Record<string, unknown>): Promise<ToolResult> {
    const mediaId = args.media_id as string;
    return this.request(`/media/${mediaId}/comments`, 'POST', { text: args.text as string });
  }

  private async deleteMediaComment(args: Record<string, unknown>): Promise<ToolResult> {
    const mediaId = args.media_id as string;
    const commentId = args.comment_id as string;
    return this.request(`/media/${mediaId}/comments/${commentId}`, 'DELETE');
  }

  private async getMediaLikes(args: Record<string, unknown>): Promise<ToolResult> {
    const mediaId = args.media_id as string;
    return this.request(`/media/${mediaId}/likes`);
  }

  private async likeMedia(args: Record<string, unknown>): Promise<ToolResult> {
    const mediaId = args.media_id as string;
    return this.request(`/media/${mediaId}/likes`, 'POST');
  }

  private async unlikeMedia(args: Record<string, unknown>): Promise<ToolResult> {
    const mediaId = args.media_id as string;
    return this.request(`/media/${mediaId}/likes`, 'DELETE');
  }

  private async getTag(args: Record<string, unknown>): Promise<ToolResult> {
    const tagName = args.tag_name as string;
    return this.request(`/tags/${tagName}`);
  }

  private async searchTags(args: Record<string, unknown>): Promise<ToolResult> {
    const q = encodeURIComponent(args.q as string);
    return this.request(`/tags/search?q=${q}`);
  }

  private async getTagMedia(args: Record<string, unknown>): Promise<ToolResult> {
    const tagName = args.tag_name as string;
    const params = new URLSearchParams();
    if (args.count) params.append('count', String(args.count));
    if (args.min_tag_id) params.append('min_tag_id', String(args.min_tag_id));
    if (args.max_tag_id) params.append('max_tag_id', String(args.max_tag_id));
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request(`/tags/${tagName}/media/recent${query}`);
  }

  private async getLocation(args: Record<string, unknown>): Promise<ToolResult> {
    const locationId = args.location_id as string;
    return this.request(`/locations/${locationId}`);
  }

  private async searchLocations(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.lat) params.append('lat', String(args.lat));
    if (args.lng) params.append('lng', String(args.lng));
    if (args.distance) params.append('distance', String(args.distance));
    if (args.facebook_places_id) params.append('facebook_places_id', String(args.facebook_places_id));
    if (args.foursquare_id) params.append('foursquare_id', String(args.foursquare_id));
    if (args.foursquare_v2_id) params.append('foursquare_v2_id', String(args.foursquare_v2_id));
    return this.request(`/locations/search?${params.toString()}`);
  }

  private async getLocationMedia(args: Record<string, unknown>): Promise<ToolResult> {
    const locationId = args.location_id as string;
    const params = new URLSearchParams();
    if (args.min_timestamp) params.append('min_timestamp', String(args.min_timestamp));
    if (args.max_timestamp) params.append('max_timestamp', String(args.max_timestamp));
    if (args.min_id) params.append('min_id', String(args.min_id));
    if (args.max_id) params.append('max_id', String(args.max_id));
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request(`/locations/${locationId}/media/recent${query}`);
  }

  private async getUserRelationship(args: Record<string, unknown>): Promise<ToolResult> {
    const userId = args.user_id as string;
    return this.request(`/users/${userId}/relationship`);
  }

  private async modifyUserRelationship(args: Record<string, unknown>): Promise<ToolResult> {
    const userId = args.user_id as string;
    return this.request(`/users/${userId}/relationship`, 'POST', { action: args.action as string });
  }

  private async getFollowRequests(): Promise<ToolResult> {
    return this.request('/users/self/requested-by');
  }

  private async getUserFollows(args: Record<string, unknown>): Promise<ToolResult> {
    const userId = (args.user_id as string) ?? 'self';
    return this.request(`/users/${userId}/follows`);
  }

  private async getUserFollowers(args: Record<string, unknown>): Promise<ToolResult> {
    const userId = (args.user_id as string) ?? 'self';
    return this.request(`/users/${userId}/followed-by`);
  }
}

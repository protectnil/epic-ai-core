/**
 * Sprout Social MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/jmeserve/sprout-mcp — community-built (NOT official Sprout Social),
//   transport: stdio, auth: API token. Last commit: Feb 19, 2026. ~12 tools (list_customers,
//   list_profiles, list_tags, list_groups, list_users, list_teams, get_profile_analytics,
//   get_post_analytics, list_listening_topics, get_listening_messages, get_messages,
//   list_publishing_posts). NOT published by Sprout Social — fails official MCP criterion.
// Our adapter covers: 15 tools (profiles, tags, analytics, publishing, messages).
// Recommendation: use-rest-api — no official vendor MCP exists. Community MCP not authoritative.
//
// Integration: use-rest-api
// REST-sourced tools (15): list_profiles, get_profile, list_profile_groups, list_posts, get_post,
//   create_post, schedule_post, delete_post, get_profile_analytics, get_post_analytics,
//   list_tags, create_tag, tag_post, list_pending_posts, list_sent_messages
//
// CRITICAL NOTE: All Sprout Social API paths (except /v1/metadata/client) require the customer ID
// as a path segment: /v1/{customerId}/{resource}. Callers MUST supply customerId in the config.
// The customerId is obtained from GET /v1/metadata/client.
//
// Base URL: https://api.sproutsocial.com/v1
// Auth: Bearer token in Authorization header (API token from Settings > Global Features > API)
// Docs: https://api.sproutsocial.com/docs/
// Rate limits: 100 req/min per access token; analytics endpoints have separate quota

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface SproutSocialConfig {
  apiToken: string;
  /**
   * Your Sprout Social customer ID. Required for all API calls except list_profiles.
   * Obtain by calling GET /v1/metadata/client — returns the customerId for your account.
   */
  customerId?: string;
  baseUrl?: string;
}

export class SproutSocialMCPServer extends MCPAdapterBase {
  private readonly apiToken: string;
  private readonly baseUrl: string;
  private readonly customerId: string;

  constructor(config: SproutSocialConfig) {
    super();
    this.apiToken = config.apiToken;
    this.baseUrl = config.baseUrl || 'https://api.sproutsocial.com/v1';
    this.customerId = config.customerId || '';
  }

  static catalog() {
    return {
      name: 'sprout-social',
      displayName: 'Sprout Social',
      version: '1.0.0',
      category: 'social',
      keywords: [
        'sproutsocial', 'social media', 'analytics', 'publishing', 'instagram',
        'twitter', 'facebook', 'linkedin', 'tiktok', 'youtube', 'profiles',
        'posts', 'engagement', 'reporting', 'scheduling',
      ],
      toolNames: [
        'list_profiles', 'get_profile', 'list_profile_groups',
        'list_posts', 'get_post', 'create_post', 'schedule_post', 'delete_post',
        'get_profile_analytics', 'get_post_analytics', 'list_tags',
        'create_tag', 'tag_post', 'list_pending_posts', 'list_sent_messages',
      ],
      description: 'Sprout Social social media management: list and analyze profiles, publish and schedule posts, retrieve engagement analytics, and manage tags across networks.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_profiles',
        description: 'List all social profiles (customer metadata) connected to the Sprout Social account, including network type and profile IDs',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_profile',
        description: 'Get detailed information about all social profiles for a given Sprout customer account — returns profile metadata for the customerId',
        inputSchema: {
          type: 'object',
          properties: {
            customer_id: {
              type: 'string',
              description: 'Sprout Social customer ID (from list_profiles). Overrides config customerId if provided.',
            },
          },
        },
      },
      {
        name: 'list_profile_groups',
        description: 'List profile groups (collections of profiles) in the Sprout Social account for the configured customer',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'list_posts',
        description: 'List published or scheduled posts for one or more profiles with optional date range filter',
        inputSchema: {
          type: 'object',
          properties: {
            profile_ids: {
              type: 'string',
              description: 'Comma-separated list of profile IDs to query',
            },
            status: {
              type: 'string',
              description: 'Post status filter: sent, scheduled, draft (default: sent)',
            },
            start_date: {
              type: 'string',
              description: 'Start date for filter in YYYY-MM-DD format',
            },
            end_date: {
              type: 'string',
              description: 'End date for filter in YYYY-MM-DD format',
            },
            count: {
              type: 'number',
              description: 'Number of posts to return (default: 50, max: 100)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
          },
        },
      },
      {
        name: 'get_post',
        description: 'Get details of a specific post by its Sprout post ID including text, media, and engagement data',
        inputSchema: {
          type: 'object',
          properties: {
            post_id: {
              type: 'string',
              description: 'Sprout Social post ID',
            },
          },
          required: ['post_id'],
        },
      },
      {
        name: 'create_post',
        description: 'Create and immediately publish a post to one or more social profiles',
        inputSchema: {
          type: 'object',
          properties: {
            profile_ids: {
              type: 'array',
              description: 'Array of numeric profile IDs to publish to',
            },
            text: {
              type: 'string',
              description: 'Post text content',
            },
            media_urls: {
              type: 'array',
              description: 'Array of publicly accessible media URLs to attach',
            },
          },
          required: ['profile_ids', 'text'],
        },
      },
      {
        name: 'schedule_post',
        description: 'Schedule a post for future publication to one or more social profiles at a specified time',
        inputSchema: {
          type: 'object',
          properties: {
            profile_ids: {
              type: 'array',
              description: 'Array of numeric profile IDs to schedule for',
            },
            text: {
              type: 'string',
              description: 'Post text content',
            },
            scheduled_send_time: {
              type: 'string',
              description: 'ISO 8601 datetime for scheduled publication (e.g. 2026-04-01T14:00:00Z)',
            },
            media_urls: {
              type: 'array',
              description: 'Array of publicly accessible media URLs to attach',
            },
          },
          required: ['profile_ids', 'text', 'scheduled_send_time'],
        },
      },
      {
        name: 'delete_post',
        description: 'Delete a scheduled or draft post from Sprout Social by its post ID',
        inputSchema: {
          type: 'object',
          properties: {
            post_id: {
              type: 'string',
              description: 'Sprout Social post ID to delete',
            },
          },
          required: ['post_id'],
        },
      },
      {
        name: 'get_profile_analytics',
        description: 'Retrieve owned profile analytics (impressions, engagements, follower growth) for one or more profiles over a date range — POST to analytics/profiles',
        inputSchema: {
          type: 'object',
          properties: {
            profile_ids: {
              type: 'array',
              description: 'Array of numeric profile IDs to query analytics for',
            },
            start_date: {
              type: 'string',
              description: 'Start date in YYYY-MM-DD format (required)',
            },
            end_date: {
              type: 'string',
              description: 'End date in YYYY-MM-DD format (required)',
            },
            fields: {
              type: 'array',
              description: 'Array of metric field names to include (default: all available metrics)',
            },
          },
          required: ['profile_ids', 'start_date', 'end_date'],
        },
      },
      {
        name: 'get_post_analytics',
        description: 'Retrieve per-post performance metrics for published posts in a date range across selected profiles — POST to analytics/posts',
        inputSchema: {
          type: 'object',
          properties: {
            profile_ids: {
              type: 'array',
              description: 'Array of numeric profile IDs to query post metrics for',
            },
            start_date: {
              type: 'string',
              description: 'Start date in YYYY-MM-DD format',
            },
            end_date: {
              type: 'string',
              description: 'End date in YYYY-MM-DD format',
            },
          },
          required: ['profile_ids', 'start_date', 'end_date'],
        },
      },
      {
        name: 'list_tags',
        description: 'List all message tags available for the customer account — returns tag IDs and names for use in tagging messages',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'create_tag',
        description: 'Create a new tag in Sprout Social for organizing posts and incoming messages',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Tag name (must be unique within the account)',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'tag_post',
        description: 'Apply one or more tags to a Sprout Social post for categorization and reporting',
        inputSchema: {
          type: 'object',
          properties: {
            post_id: {
              type: 'string',
              description: 'Sprout Social post ID to tag',
            },
            tag_ids: {
              type: 'array',
              description: 'Array of tag IDs to apply to the post',
            },
          },
          required: ['post_id', 'tag_ids'],
        },
      },
      {
        name: 'list_pending_posts',
        description: 'List publishing posts in the Sprout Social account — returns posts in draft, scheduled, or sent status by querying the publishing/posts endpoint',
        inputSchema: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              description: 'Filter by post status: draft, scheduled, sent (default: draft for pending approval)',
            },
          },
        },
      },
      {
        name: 'list_sent_messages',
        description: 'Retrieve inbox messages (inbound mentions, DMs, comments) received by profiles — POST to the messages endpoint with profile and date filters',
        inputSchema: {
          type: 'object',
          properties: {
            profile_ids: {
              type: 'array',
              description: 'Array of numeric profile IDs to filter',
            },
            start_date: {
              type: 'string',
              description: 'Start date in YYYY-MM-DD format',
            },
            end_date: {
              type: 'string',
              description: 'End date in YYYY-MM-DD format',
            },
            count: {
              type: 'number',
              description: 'Number of messages to return (default: 50, max: 100)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_profiles': return this.listProfiles(args);
        case 'get_profile': return this.getProfile(args);
        case 'list_profile_groups': return this.listProfileGroups();
        case 'list_posts': return this.listPosts(args);
        case 'get_post': return this.getPost(args);
        case 'create_post': return this.createPost(args);
        case 'schedule_post': return this.schedulePost(args);
        case 'delete_post': return this.deletePost(args);
        case 'get_profile_analytics': return this.getProfileAnalytics(args);
        case 'get_post_analytics': return this.getPostAnalytics(args);
        case 'list_tags': return this.listTags(args);
        case 'create_tag': return this.createTag(args);
        case 'tag_post': return this.tagPost(args);
        case 'list_pending_posts': return this.listPendingPosts(args);
        case 'list_sent_messages': return this.listSentMessages(args);
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
      Authorization: `Bearer ${this.apiToken}`,
      'Content-Type': 'application/json',
    };
  }

  private async apiGet(path: string, params: Record<string, string> = {}): Promise<ToolResult> {
    const qs = new URLSearchParams(params).toString();
    const url = `${this.baseUrl}${path}${qs ? '?' + qs : ''}`;
    const response = await this.fetchWithRetry(url, { headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apiPost(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apiDelete(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'DELETE',
      headers: this.headers,
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: JSON.stringify({ success: true, status: response.status }) }], isError: false };
  }

  private customerPath(path: string, customerIdOverride?: string): string {
    const cid = customerIdOverride || this.customerId;
    if (!cid) return `/metadata/client`;  // fallback for list_profiles
    return `/${encodeURIComponent(cid)}${path}`;
  }

  private async listProfiles(_args: Record<string, unknown>): Promise<ToolResult> {
    // GET /v1/metadata/client — returns customer IDs and names (no customerId required)
    return this.apiGet('/metadata/client');
  }

  private async getProfile(args: Record<string, unknown>): Promise<ToolResult> {
    const cid = (args.customer_id as string) || this.customerId;
    if (!cid) return { content: [{ type: 'text', text: 'customer_id is required (provide in config or as argument)' }], isError: true };
    // GET /v1/{customerId}/metadata/customer — returns social profiles for a customer
    return this.apiGet(`/${encodeURIComponent(cid)}/metadata/customer`);
  }

  private async listProfileGroups(): Promise<ToolResult> {
    if (!this.customerId) return { content: [{ type: 'text', text: 'customerId is required in config for list_profile_groups' }], isError: true };
    // GET /v1/{customerId}/metadata/customer/groups
    return this.apiGet(this.customerPath('/metadata/customer/groups'));
  }

  private async listPosts(args: Record<string, unknown>): Promise<ToolResult> {
    if (!this.customerId) return { content: [{ type: 'text', text: 'customerId is required in config for list_posts' }], isError: true };
    const params: Record<string, string> = {
      count: String((args.count as number) || 50),
      page: String((args.page as number) || 1),
    };
    if (args.status) params.status = args.status as string;
    if (args.start_date) params.start_date = args.start_date as string;
    if (args.end_date) params.end_date = args.end_date as string;
    if (args.profile_ids) params.profile_ids = args.profile_ids as string;
    // GET /v1/{customerId}/publishing/posts — list publishing posts
    return this.apiGet(this.customerPath('/publishing/posts'), params);
  }

  private async getPost(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.post_id) return { content: [{ type: 'text', text: 'post_id is required' }], isError: true };
    if (!this.customerId) return { content: [{ type: 'text', text: 'customerId is required in config for get_post' }], isError: true };
    // GET /v1/{customerId}/publishing/posts/{postId}
    return this.apiGet(this.customerPath(`/publishing/posts/${encodeURIComponent(args.post_id as string)}`));
  }

  private async createPost(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.profile_ids || !args.text) return { content: [{ type: 'text', text: 'profile_ids and text are required' }], isError: true };
    if (!this.customerId) return { content: [{ type: 'text', text: 'customerId is required in config for create_post' }], isError: true };
    const body: Record<string, unknown> = {
      profile_ids: args.profile_ids,
      status: { text: args.text },
    };
    if (args.media_urls) body.media_urls = args.media_urls;
    // POST /v1/{customerId}/publishing/posts
    return this.apiPost(this.customerPath('/publishing/posts'), body);
  }

  private async schedulePost(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.profile_ids || !args.text || !args.scheduled_send_time) {
      return { content: [{ type: 'text', text: 'profile_ids, text, and scheduled_send_time are required' }], isError: true };
    }
    if (!this.customerId) return { content: [{ type: 'text', text: 'customerId is required in config for schedule_post' }], isError: true };
    const body: Record<string, unknown> = {
      profile_ids: args.profile_ids,
      status: { text: args.text },
      scheduling: { scheduled_send_time: args.scheduled_send_time },
    };
    if (args.media_urls) body.media_urls = args.media_urls;
    // POST /v1/{customerId}/publishing/posts (with scheduling)
    return this.apiPost(this.customerPath('/publishing/posts'), body);
  }

  private async deletePost(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.post_id) return { content: [{ type: 'text', text: 'post_id is required' }], isError: true };
    if (!this.customerId) return { content: [{ type: 'text', text: 'customerId is required in config for delete_post' }], isError: true };
    // DELETE /v1/{customerId}/publishing/posts/{postId}
    return this.apiDelete(this.customerPath(`/publishing/posts/${encodeURIComponent(args.post_id as string)}`));
  }

  private async getProfileAnalytics(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.profile_ids || !args.start_date || !args.end_date) {
      return { content: [{ type: 'text', text: 'profile_ids, start_date, and end_date are required' }], isError: true };
    }
    if (!this.customerId) return { content: [{ type: 'text', text: 'customerId is required in config for get_profile_analytics' }], isError: true };
    // POST /v1/{customerId}/analytics/profiles — analytics endpoints use POST with JSON body
    const body: Record<string, unknown> = {
      profile_ids: args.profile_ids,
      start_date: args.start_date,
      end_date: args.end_date,
    };
    if (args.fields) body.fields = args.fields;
    return this.apiPost(this.customerPath('/analytics/profiles'), body);
  }

  private async getPostAnalytics(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.profile_ids || !args.start_date || !args.end_date) {
      return { content: [{ type: 'text', text: 'profile_ids, start_date, and end_date are required' }], isError: true };
    }
    if (!this.customerId) return { content: [{ type: 'text', text: 'customerId is required in config for get_post_analytics' }], isError: true };
    // POST /v1/{customerId}/analytics/posts — analytics endpoints use POST with JSON body
    const body: Record<string, unknown> = {
      profile_ids: args.profile_ids,
      start_date: args.start_date,
      end_date: args.end_date,
    };
    return this.apiPost(this.customerPath('/analytics/posts'), body);
  }

  private async listTags(_args: Record<string, unknown>): Promise<ToolResult> {
    if (!this.customerId) return { content: [{ type: 'text', text: 'customerId is required in config for list_tags' }], isError: true };
    // GET /v1/{customerId}/metadata/customer/tags
    return this.apiGet(this.customerPath('/metadata/customer/tags'));
  }

  private async createTag(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name) return { content: [{ type: 'text', text: 'name is required' }], isError: true };
    if (!this.customerId) return { content: [{ type: 'text', text: 'customerId is required in config for create_tag' }], isError: true };
    // POST /v1/{customerId}/metadata/customer/tags — tag creation uses customer tags endpoint
    return this.apiPost(this.customerPath('/metadata/customer/tags'), { name: args.name });
  }

  private async tagPost(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.post_id || !args.tag_ids) return { content: [{ type: 'text', text: 'post_id and tag_ids are required' }], isError: true };
    if (!this.customerId) return { content: [{ type: 'text', text: 'customerId is required in config for tag_post' }], isError: true };
    // POST /v1/{customerId}/publishing/posts/{postId}/tags
    return this.apiPost(this.customerPath(`/publishing/posts/${encodeURIComponent(args.post_id as string)}/tags`), { tag_ids: args.tag_ids });
  }

  private async listPendingPosts(args: Record<string, unknown>): Promise<ToolResult> {
    if (!this.customerId) return { content: [{ type: 'text', text: 'customerId is required in config for list_pending_posts' }], isError: true };
    const params: Record<string, string> = {};
    if (args.status) params.status = args.status as string;
    // GET /v1/{customerId}/publishing/posts — query publishing posts
    return this.apiGet(this.customerPath('/publishing/posts'), params);
  }

  private async listSentMessages(args: Record<string, unknown>): Promise<ToolResult> {
    if (!this.customerId) return { content: [{ type: 'text', text: 'customerId is required in config for list_sent_messages' }], isError: true };
    const body: Record<string, unknown> = {
      count: (args.count as number) || 50,
      page: (args.page as number) || 1,
    };
    if (args.profile_ids) body.profile_ids = args.profile_ids;
    if (args.start_date) body.start_date = args.start_date;
    if (args.end_date) body.end_date = args.end_date;
    // POST /v1/{customerId}/messages — inbox messages endpoint (inbound messages)
    return this.apiPost(this.customerPath('/messages'), body);
  }
}

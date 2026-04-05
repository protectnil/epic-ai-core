/**
 * Discourse MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// No official Discourse MCP server was found on GitHub or the Discourse developer portal.
//
// Base URL: https://{your-discourse-instance} (e.g. https://forum.example.com)
// Auth: Api-Key header + Api-Username header.
//   Create an API key in Admin → API → Keys. Use "system" or an admin username.
// Docs: https://docs.discourse.org/
// Rate limits: Default 60 req/min global, 10 req/min per user. Configurable in admin settings.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface DiscourseConfig {
  /** Your Discourse instance base URL, e.g. https://forum.example.com */
  baseUrl: string;
  /** API key created in Admin → API → Keys */
  apiKey: string;
  /** Username to act as (typically "system" for admin operations) */
  apiUsername: string;
}

export class DiscourseMCPServer extends MCPAdapterBase {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly apiUsername: string;

  constructor(config: DiscourseConfig) {
    super();
    this.baseUrl = config.baseUrl.replace(/\/+$/, '');
    this.apiKey = config.apiKey;
    this.apiUsername = config.apiUsername;
  }

  static catalog() {
    return {
      name: 'discourse-latest',
      displayName: 'Discourse',
      version: '1.0.0',
      category: 'collaboration',
      keywords: [
        'discourse', 'forum', 'community', 'discussion', 'topic', 'post',
        'category', 'tag', 'user', 'group', 'notification', 'badge',
        'private message', 'moderation', 'admin', 'search', 'upload',
      ],
      toolNames: [
        'list_latest_topics',
        'list_top_topics',
        'get_topic',
        'get_topic_by_external_id',
        'list_category_topics',
        'create_topic_or_post',
        'update_topic',
        'remove_topic',
        'update_topic_status',
        'get_post',
        'list_posts',
        'update_post',
        'delete_post',
        'list_post_replies',
        'perform_post_action',
        'list_categories',
        'get_category',
        'create_category',
        'update_category',
        'search',
        'get_user',
        'list_users',
        'update_user',
        'get_user_emails',
        'list_user_private_messages',
        'list_groups',
        'get_group',
        'create_group',
        'update_group',
        'list_group_members',
        'add_group_members',
        'remove_group_members',
        'list_tags',
        'get_tag',
        'list_notifications',
        'mark_notifications_read',
        'get_site_info',
        'list_badges',
        'list_user_badges',
        'create_upload',
        'admin_list_users',
        'suspend_user',
        'silence_user',
      ],
      description: 'Discourse community forum: manage topics, posts, categories, tags, users, groups, notifications, badges, and moderation via the REST API.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_latest_topics',
        description: 'Get the latest topics across all categories with optional ordering and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            order: {
              type: 'string',
              description: 'Sort order: default, created, activity, views, posts, category, likes, op_likes, posters',
            },
            ascending: {
              type: 'string',
              description: 'Sort direction: true for ascending, false for descending (default: false)',
            },
          },
        },
      },
      {
        name: 'list_top_topics',
        description: 'Get top topics filtered by time period: daily, weekly, monthly, quarterly, yearly, all',
        inputSchema: {
          type: 'object',
          properties: {
            period: {
              type: 'string',
              description: 'Time period filter: daily, weekly, monthly, quarterly, yearly, all (default: all)',
            },
          },
        },
      },
      {
        name: 'get_topic',
        description: 'Get a single topic by numeric ID including its posts, category, and metadata',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'number',
              description: 'Numeric topic ID',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'get_topic_by_external_id',
        description: 'Get a topic by its external_id field, useful when integrating with external systems',
        inputSchema: {
          type: 'object',
          properties: {
            external_id: {
              type: 'string',
              description: 'The external_id value assigned to the topic',
            },
          },
          required: ['external_id'],
        },
      },
      {
        name: 'list_category_topics',
        description: 'List topics within a specific category by category slug and ID',
        inputSchema: {
          type: 'object',
          properties: {
            slug: {
              type: 'string',
              description: 'URL slug of the category, e.g. general',
            },
            id: {
              type: 'number',
              description: 'Numeric category ID',
            },
          },
          required: ['slug', 'id'],
        },
      },
      {
        name: 'create_topic_or_post',
        description: 'Create a new topic, reply to an existing topic, or send a private message',
        inputSchema: {
          type: 'object',
          properties: {
            title: {
              type: 'string',
              description: 'Topic title — required when creating a new topic, omit for replies',
            },
            raw: {
              type: 'string',
              description: 'Post body in Markdown format',
            },
            topic_id: {
              type: 'number',
              description: 'Topic ID to reply to — omit to create a new topic',
            },
            category: {
              type: 'number',
              description: 'Category ID for new topics',
            },
            target_recipients: {
              type: 'string',
              description: 'Comma-separated usernames for private messages',
            },
            archetype: {
              type: 'string',
              description: 'Post type: regular (default) or private_message',
            },
          },
          required: ['raw'],
        },
      },
      {
        name: 'update_topic',
        description: 'Update a topic title, category, or tags by topic ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'number',
              description: 'Numeric topic ID to update',
            },
            title: {
              type: 'string',
              description: 'New topic title',
            },
            category_id: {
              type: 'number',
              description: 'New category ID to move the topic to',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'remove_topic',
        description: 'Delete a topic by ID (admin or topic owner only)',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'number',
              description: 'Numeric topic ID to delete',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'update_topic_status',
        description: 'Update topic status: close, open, archive, unarchive, pin, unpin, or make invisible/visible',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'number',
              description: 'Numeric topic ID',
            },
            status: {
              type: 'string',
              description: 'Status to set: closed, open, archived, pinned, pinned_globally, visible, autoclosed',
            },
            enabled: {
              type: 'string',
              description: 'true to enable the status, false to disable it',
            },
          },
          required: ['id', 'status', 'enabled'],
        },
      },
      {
        name: 'get_post',
        description: 'Retrieve a single post by numeric post ID including raw content and metadata',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'number',
              description: 'Numeric post ID',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'list_posts',
        description: 'List the latest posts across all topics with optional pagination by before post ID',
        inputSchema: {
          type: 'object',
          properties: {
            before: {
              type: 'number',
              description: 'Return posts with ID lower than this value for pagination',
            },
          },
        },
      },
      {
        name: 'update_post',
        description: 'Edit the content of an existing post by post ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'number',
              description: 'Numeric post ID to update',
            },
            raw: {
              type: 'string',
              description: 'New post body in Markdown format',
            },
            edit_reason: {
              type: 'string',
              description: 'Optional reason for the edit shown in revision history',
            },
          },
          required: ['id', 'raw'],
        },
      },
      {
        name: 'delete_post',
        description: 'Delete a single post by post ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'number',
              description: 'Numeric post ID to delete',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'list_post_replies',
        description: 'List all replies to a specific post by post ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'number',
              description: 'Numeric post ID to list replies for',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'perform_post_action',
        description: 'Like or perform other actions on a post: like, off_topic, spam, inappropriate, vote, bookmark',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'number',
              description: 'Numeric post ID to act on',
            },
            post_action_type_id: {
              type: 'number',
              description: 'Action type: 1=bookmark, 2=like, 3=off_topic, 4=inappropriate, 6=notify_user, 7=notify_moderators, 8=spam',
            },
            flag_topic: {
              type: 'boolean',
              description: 'Whether to flag the whole topic instead of just the post (default: false)',
            },
          },
          required: ['id', 'post_action_type_id'],
        },
      },
      {
        name: 'list_categories',
        description: 'List all top-level categories with optional subcategory inclusion',
        inputSchema: {
          type: 'object',
          properties: {
            include_subcategories: {
              type: 'boolean',
              description: 'Include subcategory data in response (default: false)',
            },
          },
        },
      },
      {
        name: 'get_category',
        description: 'Get a category by numeric ID including description, color, and topic count',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'number',
              description: 'Numeric category ID',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'create_category',
        description: 'Create a new category with name, color, text color, and optional permissions',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Category name',
            },
            color: {
              type: 'string',
              description: 'Background color as hex without #, e.g. 49d9e9',
            },
            text_color: {
              type: 'string',
              description: 'Text color as hex without #, e.g. f0fcfd',
            },
            parent_category_id: {
              type: 'number',
              description: 'Parent category ID to create a subcategory',
            },
          },
          required: ['name', 'color', 'text_color'],
        },
      },
      {
        name: 'update_category',
        description: 'Update an existing category name, color, description, or permissions',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'number',
              description: 'Numeric category ID to update',
            },
            name: {
              type: 'string',
              description: 'New category name',
            },
            color: {
              type: 'string',
              description: 'New background color as hex without #',
            },
            text_color: {
              type: 'string',
              description: 'New text color as hex without #',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'search',
        description: 'Search topics, posts, users, and categories by keyword with optional pagination',
        inputSchema: {
          type: 'object',
          properties: {
            q: {
              type: 'string',
              description: 'Search query. Supports filters: @username, #category, tags:tagname, in:title, order:latest',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
          },
          required: ['q'],
        },
      },
      {
        name: 'get_user',
        description: 'Get a user profile by username including trust level, bio, and activity stats',
        inputSchema: {
          type: 'object',
          properties: {
            username: {
              type: 'string',
              description: 'Discourse username (case-insensitive)',
            },
          },
          required: ['username'],
        },
      },
      {
        name: 'list_users',
        description: 'List users by flag (active, new, staff, suspended, blocked, suspect) with sorting and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            flag: {
              type: 'string',
              description: 'User list type: active, new, staff, suspended, blocked, suspect',
            },
            order: {
              type: 'string',
              description: 'Sort field: created, last_emailed, seen, username, email, trust_level, days_visited, posts_read_count, topics_viewed, post_count',
            },
            asc: {
              type: 'boolean',
              description: 'Sort ascending (default: false)',
            },
            page: {
              type: 'number',
              description: 'Page number (default: 0)',
            },
          },
          required: ['flag'],
        },
      },
      {
        name: 'update_user',
        description: 'Update a user profile fields including name, bio, location, and preferences',
        inputSchema: {
          type: 'object',
          properties: {
            username: {
              type: 'string',
              description: 'Username of the user to update',
            },
            name: {
              type: 'string',
              description: 'Display name',
            },
            bio_raw: {
              type: 'string',
              description: 'User bio in Markdown format',
            },
            location: {
              type: 'string',
              description: 'User location',
            },
            website: {
              type: 'string',
              description: 'User website URL',
            },
          },
          required: ['username'],
        },
      },
      {
        name: 'get_user_emails',
        description: 'Get email addresses associated with a user account (admin only)',
        inputSchema: {
          type: 'object',
          properties: {
            username: {
              type: 'string',
              description: 'Username to look up emails for',
            },
          },
          required: ['username'],
        },
      },
      {
        name: 'list_user_private_messages',
        description: 'Get private messages (inbox) for a user',
        inputSchema: {
          type: 'object',
          properties: {
            username: {
              type: 'string',
              description: 'Username to retrieve private messages for',
            },
          },
          required: ['username'],
        },
      },
      {
        name: 'list_groups',
        description: 'List all groups including automatic and custom groups with member counts',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_group',
        description: 'Get a group by numeric ID including description, visibility, and membership count',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'number',
              description: 'Numeric group ID',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'create_group',
        description: 'Create a new user group with name, visibility, and membership settings',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Group name (lowercase, no spaces)',
            },
            visibility_level: {
              type: 'number',
              description: 'Who can see the group: 0=public, 1=logged-in, 2=members, 3=staff, 4=owners',
            },
            full_name: {
              type: 'string',
              description: 'Human-readable display name for the group',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'update_group',
        description: 'Update an existing group name, description, visibility, or membership settings',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'number',
              description: 'Numeric group ID to update',
            },
            name: {
              type: 'string',
              description: 'New group name',
            },
            full_name: {
              type: 'string',
              description: 'New display name',
            },
            bio_raw: {
              type: 'string',
              description: 'Group bio/description in Markdown',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'list_group_members',
        description: 'List members of a group with their usernames and join dates',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'number',
              description: 'Numeric group ID',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'add_group_members',
        description: 'Add users to a group by comma-separated usernames or user IDs',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'number',
              description: 'Numeric group ID to add members to',
            },
            usernames: {
              type: 'string',
              description: 'Comma-separated usernames to add, e.g. "alice,bob,carol"',
            },
          },
          required: ['id', 'usernames'],
        },
      },
      {
        name: 'remove_group_members',
        description: 'Remove users from a group by comma-separated usernames',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'number',
              description: 'Numeric group ID to remove members from',
            },
            usernames: {
              type: 'string',
              description: 'Comma-separated usernames to remove, e.g. "alice,bob"',
            },
          },
          required: ['id', 'usernames'],
        },
      },
      {
        name: 'list_tags',
        description: 'List all tags in the forum with topic counts',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_tag',
        description: 'Get topics associated with a specific tag',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Tag name to look up',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'list_notifications',
        description: 'Get notifications for the authenticated API user',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'mark_notifications_read',
        description: 'Mark all or specific notifications as read for the current user',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'number',
              description: 'Specific notification ID to mark read. Omit to mark all notifications read.',
            },
          },
        },
      },
      {
        name: 'get_site_info',
        description: 'Get site configuration including categories, groups, trust levels, and enabled features',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'list_badges',
        description: 'List all badges configured for the forum including badge types and groupings',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'list_user_badges',
        description: 'List badges earned by a specific user',
        inputSchema: {
          type: 'object',
          properties: {
            username: {
              type: 'string',
              description: 'Username to retrieve badges for',
            },
          },
          required: ['username'],
        },
      },
      {
        name: 'create_upload',
        description: 'Upload a file (image, attachment) to the Discourse CDN and get a URL for embedding in posts',
        inputSchema: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              description: 'Upload type: avatar, profile_background, card_background, composer, custom_emoji, or attachment',
            },
            file: {
              type: 'string',
              description: 'File content as base64-encoded string',
            },
            filename: {
              type: 'string',
              description: 'Original filename including extension, e.g. image.png',
            },
          },
          required: ['type', 'file', 'filename'],
        },
      },
      {
        name: 'admin_list_users',
        description: 'Admin: list users with extended details by flag with optional ordering and email visibility',
        inputSchema: {
          type: 'object',
          properties: {
            flag: {
              type: 'string',
              description: 'User list type: active, new, staff, suspended, blocked, suspect',
            },
            order: {
              type: 'string',
              description: 'Sort field: created, last_emailed, seen, username, email, trust_level',
            },
            asc: {
              type: 'boolean',
              description: 'Sort ascending (default: false)',
            },
            page: {
              type: 'number',
              description: 'Page number (default: 0)',
            },
            show_emails: {
              type: 'boolean',
              description: 'Include email addresses in response (default: false)',
            },
          },
          required: ['flag'],
        },
      },
      {
        name: 'suspend_user',
        description: 'Suspend a user account with a reason and expiry date (admin only)',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'number',
              description: 'Numeric user ID to suspend',
            },
            suspend_until: {
              type: 'string',
              description: 'Suspension expiry in ISO8601 format, e.g. 2026-12-31T00:00:00.000Z',
            },
            reason: {
              type: 'string',
              description: 'Reason for the suspension shown to the user',
            },
          },
          required: ['id', 'suspend_until', 'reason'],
        },
      },
      {
        name: 'silence_user',
        description: 'Silence a user (prevent posting) with a reason and expiry date (admin only)',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'number',
              description: 'Numeric user ID to silence',
            },
            silenced_till: {
              type: 'string',
              description: 'Silence expiry in ISO8601 format, e.g. 2026-12-31T00:00:00.000Z',
            },
            reason: {
              type: 'string',
              description: 'Reason for silencing the user',
            },
          },
          required: ['id', 'silenced_till', 'reason'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_latest_topics':          return this.listLatestTopics(args);
        case 'list_top_topics':             return this.listTopTopics(args);
        case 'get_topic':                   return this.getTopic(args);
        case 'get_topic_by_external_id':    return this.getTopicByExternalId(args);
        case 'list_category_topics':        return this.listCategoryTopics(args);
        case 'create_topic_or_post':        return this.createTopicOrPost(args);
        case 'update_topic':                return this.updateTopic(args);
        case 'remove_topic':                return this.removeTopic(args);
        case 'update_topic_status':         return this.updateTopicStatus(args);
        case 'get_post':                    return this.getPost(args);
        case 'list_posts':                  return this.listPosts(args);
        case 'update_post':                 return this.updatePost(args);
        case 'delete_post':                 return this.deletePost(args);
        case 'list_post_replies':           return this.listPostReplies(args);
        case 'perform_post_action':         return this.performPostAction(args);
        case 'list_categories':             return this.listCategories(args);
        case 'get_category':                return this.getCategory(args);
        case 'create_category':             return this.createCategory(args);
        case 'update_category':             return this.updateCategory(args);
        case 'search':                      return this.search(args);
        case 'get_user':                    return this.getUser(args);
        case 'list_users':                  return this.listUsers(args);
        case 'update_user':                 return this.updateUser(args);
        case 'get_user_emails':             return this.getUserEmails(args);
        case 'list_user_private_messages':  return this.listUserPrivateMessages(args);
        case 'list_groups':                 return this.listGroups();
        case 'get_group':                   return this.getGroup(args);
        case 'create_group':                return this.createGroup(args);
        case 'update_group':                return this.updateGroup(args);
        case 'list_group_members':          return this.listGroupMembers(args);
        case 'add_group_members':           return this.addGroupMembers(args);
        case 'remove_group_members':        return this.removeGroupMembers(args);
        case 'list_tags':                   return this.listTags();
        case 'get_tag':                     return this.getTag(args);
        case 'list_notifications':          return this.listNotifications();
        case 'mark_notifications_read':     return this.markNotificationsRead(args);
        case 'get_site_info':               return this.getSiteInfo();
        case 'list_badges':                 return this.listBadges();
        case 'list_user_badges':            return this.listUserBadges(args);
        case 'create_upload':               return this.createUpload(args);
        case 'admin_list_users':            return this.adminListUsers(args);
        case 'suspend_user':                return this.suspendUser(args);
        case 'silence_user':                return this.silenceUser(args);
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

  // ── HTTP helpers ────────────────────────────────────────────────────────────

  private headers(): Record<string, string> {
    return {
      'Api-Key': this.apiKey,
      'Api-Username': this.apiUsername,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  private async get(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, { headers: this.headers() });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async post(path: string, body: unknown): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const ct = response.headers.get('content-type') ?? '';
    const data = ct.includes('application/json') ? await response.json() : { status: response.status };
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async put(path: string, body: unknown): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'PUT',
      headers: this.headers(),
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const ct = response.headers.get('content-type') ?? '';
    const data = ct.includes('application/json') ? await response.json() : { success: true, status: response.status };
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async del(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'DELETE',
      headers: this.headers(),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: JSON.stringify({ success: true, status: response.status }) }], isError: false };
  }

  // ── Topic tools ─────────────────────────────────────────────────────────────

  private async listLatestTopics(args: Record<string, unknown>): Promise<ToolResult> {
    const order = args.order as string | undefined;
    const ascending = args.ascending as string | undefined;
    const params = new URLSearchParams();
    if (order) params.set('order', order);
    if (ascending !== undefined) params.set('ascending', ascending);
    const qs = params.toString() ? '?' + params.toString() : '';
    return this.get(`/latest.json${qs}`);
  }

  private async listTopTopics(args: Record<string, unknown>): Promise<ToolResult> {
    const period = (args.period as string | undefined) ?? '';
    const qs = period ? `?period=${encodeURIComponent(period)}` : '';
    return this.get(`/top.json${qs}`);
  }

  private async getTopic(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.id as number;
    return this.get(`/t/${id}.json`);
  }

  private async getTopicByExternalId(args: Record<string, unknown>): Promise<ToolResult> {
    const external_id = args.external_id as string;
    return this.get(`/t/external_id/${encodeURIComponent(external_id)}.json`);
  }

  private async listCategoryTopics(args: Record<string, unknown>): Promise<ToolResult> {
    const slug = args.slug as string;
    const id = args.id as number;
    return this.get(`/c/${encodeURIComponent(slug)}/${id}.json`);
  }

  private async createTopicOrPost(args: Record<string, unknown>): Promise<ToolResult> {
    return this.post('/posts.json', args);
  }

  private async updateTopic(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.id as number;
    const { id: _id, ...body } = args;
    return this.put(`/t/-/${id}.json`, body);
  }

  private async removeTopic(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.id as number;
    return this.del(`/t/${id}.json`);
  }

  private async updateTopicStatus(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.id as number;
    const { id: _id, ...body } = args;
    return this.put(`/t/${id}/status.json`, body);
  }

  // ── Post tools ──────────────────────────────────────────────────────────────

  private async getPost(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.id as number;
    return this.get(`/posts/${id}.json`);
  }

  private async listPosts(args: Record<string, unknown>): Promise<ToolResult> {
    const before = args.before as number | undefined;
    const qs = before !== undefined ? `?before=${before}` : '';
    return this.get(`/posts.json${qs}`);
  }

  private async updatePost(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.id as number;
    const { id: _id, ...body } = args;
    return this.put(`/posts/${id}.json`, { post: body });
  }

  private async deletePost(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.id as number;
    return this.del(`/posts/${id}.json`);
  }

  private async listPostReplies(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.id as number;
    return this.get(`/posts/${id}/replies.json`);
  }

  private async performPostAction(args: Record<string, unknown>): Promise<ToolResult> {
    return this.post('/post_actions.json', args);
  }

  // ── Category tools ───────────────────────────────────────────────────────────

  private async listCategories(args: Record<string, unknown>): Promise<ToolResult> {
    const include = args.include_subcategories as boolean | undefined;
    const qs = include !== undefined ? `?include_subcategories=${include}` : '';
    return this.get(`/categories.json${qs}`);
  }

  private async getCategory(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.id as number;
    return this.get(`/c/${id}/show.json`);
  }

  private async createCategory(args: Record<string, unknown>): Promise<ToolResult> {
    return this.post('/categories.json', args);
  }

  private async updateCategory(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.id as number;
    const { id: _id, ...body } = args;
    return this.put(`/categories/${id}.json`, body);
  }

  // ── Search ───────────────────────────────────────────────────────────────────

  private async search(args: Record<string, unknown>): Promise<ToolResult> {
    const q = args.q as string;
    const page = args.page as number | undefined;
    const params = new URLSearchParams({ q });
    if (page !== undefined) params.set('page', String(page));
    return this.get(`/search.json?${params.toString()}`);
  }

  // ── User tools ───────────────────────────────────────────────────────────────

  private async getUser(args: Record<string, unknown>): Promise<ToolResult> {
    const username = args.username as string;
    return this.get(`/u/${encodeURIComponent(username)}.json`);
  }

  private async listUsers(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams({ period: 'all' });
    if (args.order) params.set('order', args.order as string);
    if (args.asc !== undefined) params.set('asc', String(args.asc));
    if (args.page !== undefined) params.set('page', String(args.page));
    return this.get(`/directory_items.json?${params.toString()}`);
  }

  private async updateUser(args: Record<string, unknown>): Promise<ToolResult> {
    const username = args.username as string;
    const { username: _u, ...body } = args;
    return this.put(`/u/${encodeURIComponent(username)}.json`, body);
  }

  private async getUserEmails(args: Record<string, unknown>): Promise<ToolResult> {
    const username = args.username as string;
    return this.get(`/u/${encodeURIComponent(username)}/emails.json`);
  }

  private async listUserPrivateMessages(args: Record<string, unknown>): Promise<ToolResult> {
    const username = args.username as string;
    return this.get(`/topics/private-messages/${encodeURIComponent(username)}.json`);
  }

  // ── Group tools ───────────────────────────────────────────────────────────────

  private async listGroups(): Promise<ToolResult> {
    return this.get('/groups.json');
  }

  private async getGroup(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.id as number;
    return this.get(`/groups/${id}.json`);
  }

  private async createGroup(args: Record<string, unknown>): Promise<ToolResult> {
    return this.post('/admin/groups.json', { group: args });
  }

  private async updateGroup(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.id as number;
    const { id: _id, ...body } = args;
    return this.put(`/groups/${id}.json`, { group: body });
  }

  private async listGroupMembers(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.id as number;
    return this.get(`/groups/${id}/members.json`);
  }

  private async addGroupMembers(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.id as number;
    const { id: _id, ...body } = args;
    return this.put(`/groups/${id}/members.json`, body);
  }

  private async removeGroupMembers(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.id as number;
    const usernames = args.usernames as string;
    const response = await this.fetchWithRetry(`${this.baseUrl}/groups/${id}/members.json`, {
      method: 'DELETE',
      headers: this.headers(),
      body: JSON.stringify({ usernames }),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const ct = response.headers.get('content-type') ?? '';
    const data = ct.includes('application/json') ? await response.json() : { success: true };
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  // ── Tag tools ─────────────────────────────────────────────────────────────────

  private async listTags(): Promise<ToolResult> {
    return this.get('/tags.json');
  }

  private async getTag(args: Record<string, unknown>): Promise<ToolResult> {
    const name = args.name as string;
    return this.get(`/tag/${encodeURIComponent(name)}.json`);
  }

  // ── Notification tools ─────────────────────────────────────────────────────────

  private async listNotifications(): Promise<ToolResult> {
    return this.get('/notifications.json');
  }

  private async markNotificationsRead(args: Record<string, unknown>): Promise<ToolResult> {
    const body = args.id !== undefined ? { id: args.id } : {};
    return this.put('/notifications/mark-read.json', body);
  }

  // ── Site / Admin ─────────────────────────────────────────────────────────────

  private async getSiteInfo(): Promise<ToolResult> {
    return this.get('/site.json');
  }

  private async listBadges(): Promise<ToolResult> {
    return this.get('/admin/badges.json');
  }

  private async listUserBadges(args: Record<string, unknown>): Promise<ToolResult> {
    const username = args.username as string;
    return this.get(`/user-badges/${encodeURIComponent(username)}.json`);
  }

  private async createUpload(args: Record<string, unknown>): Promise<ToolResult> {
    const fileBase64 = args.file as string;
    const filename = args.filename as string;
    const uploadType = args.type as string;

    if (!fileBase64 || !filename || !uploadType) {
      return { content: [{ type: 'text', text: 'type, file (base64), and filename are required' }], isError: true };
    }

    // Discourse /uploads.json requires multipart/form-data
    const fileBuffer = Buffer.from(fileBase64, 'base64');
    const blob = new Blob([fileBuffer]);
    const formData = new FormData();
    formData.append('type', uploadType);
    formData.append('files[]', blob, filename);

    // Don't set Content-Type — fetch sets it with boundary for FormData
    const headers: Record<string, string> = { 'Api-Key': this.apiKey, 'Api-Username': this.apiUsername };
    const response = await this.fetchWithRetry(`${this.baseUrl}/uploads.json`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }

    const ct = response.headers.get('content-type') ?? '';
    const data = ct.includes('application/json') ? await response.json() : { status: response.status };
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async adminListUsers(args: Record<string, unknown>): Promise<ToolResult> {
    const flag = args.flag as string;
    const params = new URLSearchParams();
    if (args.order) params.set('order', args.order as string);
    if (args.asc !== undefined) params.set('asc', String(args.asc));
    if (args.page !== undefined) params.set('page', String(args.page));
    if (args.show_emails !== undefined) params.set('show_emails', String(args.show_emails));
    const qs = params.toString() ? '?' + params.toString() : '';
    return this.get(`/admin/users/list/${encodeURIComponent(flag)}.json${qs}`);
  }

  private async suspendUser(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.id as number;
    const { id: _id, ...body } = args;
    return this.put(`/admin/users/${id}/suspend.json`, body);
  }

  private async silenceUser(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.id as number;
    const { id: _id, ...body } = args;
    return this.put(`/admin/users/${id}/silence.json`, body);
  }
}

/**
 * Circuit (circuitsandbox.net) MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// No official Circuit MCP server was found on GitHub. We build a full REST wrapper.
//
// Base URL: https://circuitsandbox.net/rest/v2
// Auth: OAuth2 Bearer token (implicit flow — obtain via https://circuitsandbox.net/oauth/authorize)
// Docs: https://www.circuit.com/web/developers/home
// Spec: https://api.apis.guru/v2/specs/circuitsandbox.net/2.9.235/openapi.json
// Category: logistics
// Rate limits: See Circuit developer docs

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface CircuitSandboxConfig {
  accessToken: string;
  baseUrl?: string;
}

export class CircuitSandboxMCPServer extends MCPAdapterBase {
  private readonly accessToken: string;
  private readonly baseUrl: string;

  constructor(config: CircuitSandboxConfig) {
    super();
    this.accessToken = config.accessToken;
    this.baseUrl = config.baseUrl || 'https://circuitsandbox.net/rest/v2';
  }

  static catalog() {
    return {
      name: 'circuitsandbox',
      displayName: 'Circuit',
      version: '1.0.0',
      category: 'logistics',
      keywords: [
        'circuit', 'conversations', 'messaging', 'collaboration', 'group',
        'community', 'direct-message', 'spaces', 'webhooks', 'presence',
        'users', 'labels', 'moderation', 'telephony', 'real-time',
      ],
      toolNames: [
        'get_conversations',
        'get_conversations_by_ids',
        'create_direct_conversation',
        'create_group_conversation',
        'update_group_conversation',
        'get_conversation',
        'search_conversations',
        'get_conversation_items',
        'send_message',
        'update_message',
        'delete_message',
        'flag_message',
        'unflag_message',
        'like_message',
        'unlike_message',
        'get_flagged_messages',
        'add_conversation_participants',
        'remove_conversation_participants',
        'get_conversation_participants',
        'archive_conversation',
        'unarchive_conversation',
        'add_conversation_to_favorites',
        'remove_conversation_from_favorites',
        'get_favorite_conversations',
        'add_conversation_label',
        'remove_conversation_label',
        'pin_topic',
        'unpin_topic',
        'get_pinned_topics',
        'get_community_conversations',
        'create_community_conversation',
        'join_community',
        'get_user_profile',
        'update_user_profile',
        'search_users',
        'get_user_by_email',
        'get_user_presence',
        'update_user_presence',
        'get_spaces',
        'create_space',
        'update_space',
        'delete_space',
        'join_space',
        'get_webhooks',
        'register_webhook',
        'update_webhook',
        'delete_webhook',
        'get_active_rtc_sessions',
      ],
      description: 'Circuit REST API: manage conversations (direct, group, community), send and moderate messages, manage participants, handle spaces and labels, track user presence, and register webhooks for real-time notifications.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      // ── Conversations ──────────────────────────────────────────────────────
      {
        name: 'get_conversations',
        description: 'Get a list of conversations for the authenticated user, optionally filtered by parameters',
        inputSchema: {
          type: 'object',
          properties: {
            direction: {
              type: 'string',
              description: 'Pagination direction: BEFORE or AFTER',
            },
            results: {
              type: 'number',
              description: 'Number of results to return (default: 25)',
            },
            timestamp: {
              type: 'number',
              description: 'Timestamp for pagination anchor point (milliseconds since epoch)',
            },
          },
        },
      },
      {
        name: 'get_conversations_by_ids',
        description: 'Get multiple conversations by their IDs in a single request',
        inputSchema: {
          type: 'object',
          properties: {
            convId: {
              type: 'array',
              description: 'Array of conversation IDs to retrieve',
              items: { type: 'string' },
            },
          },
          required: ['convId'],
        },
      },
      {
        name: 'create_direct_conversation',
        description: 'Create a new 1-to-1 direct message conversation with another user',
        inputSchema: {
          type: 'object',
          properties: {
            participant: {
              type: 'string',
              description: 'User ID or email of the other participant',
            },
          },
          required: ['participant'],
        },
      },
      {
        name: 'create_group_conversation',
        description: 'Create a new group conversation with multiple participants',
        inputSchema: {
          type: 'object',
          properties: {
            topic: {
              type: 'string',
              description: 'Topic or title for the group conversation',
            },
            participants: {
              type: 'array',
              description: 'Array of user IDs or emails to add as participants',
              items: { type: 'string' },
            },
          },
          required: ['participants'],
        },
      },
      {
        name: 'update_group_conversation',
        description: 'Update a group conversation topic or description',
        inputSchema: {
          type: 'object',
          properties: {
            convId: {
              type: 'string',
              description: 'Group conversation ID to update',
            },
            topic: {
              type: 'string',
              description: 'New topic for the group conversation',
            },
            description: {
              type: 'string',
              description: 'New description for the group conversation',
            },
          },
          required: ['convId'],
        },
      },
      {
        name: 'get_conversation',
        description: 'Get the details of a specific conversation by ID',
        inputSchema: {
          type: 'object',
          properties: {
            convId: {
              type: 'string',
              description: 'Conversation ID to retrieve',
            },
          },
          required: ['convId'],
        },
      },
      {
        name: 'search_conversations',
        description: 'Search conversations by keyword or query string',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query string',
            },
            results: {
              type: 'number',
              description: 'Maximum number of results to return',
            },
          },
          required: ['query'],
        },
      },
      // ── Messages ───────────────────────────────────────────────────────────
      {
        name: 'get_conversation_items',
        description: 'Get the message history (items) for a conversation, paginated',
        inputSchema: {
          type: 'object',
          properties: {
            convId: {
              type: 'string',
              description: 'Conversation ID to retrieve messages from',
            },
            direction: {
              type: 'string',
              description: 'Pagination direction: BEFORE or AFTER',
            },
            results: {
              type: 'number',
              description: 'Number of messages to return (default: 25)',
            },
            timestamp: {
              type: 'number',
              description: 'Timestamp anchor for pagination (milliseconds since epoch)',
            },
          },
          required: ['convId'],
        },
      },
      {
        name: 'send_message',
        description: 'Send a text message to a conversation',
        inputSchema: {
          type: 'object',
          properties: {
            convId: {
              type: 'string',
              description: 'Conversation ID to send the message to',
            },
            content: {
              type: 'string',
              description: 'Message text content (supports rich text / HTML)',
            },
            subject: {
              type: 'string',
              description: 'Optional subject line for the message',
            },
          },
          required: ['convId', 'content'],
        },
      },
      {
        name: 'update_message',
        description: 'Update (edit) an existing message in a conversation',
        inputSchema: {
          type: 'object',
          properties: {
            convId: {
              type: 'string',
              description: 'Conversation ID containing the message',
            },
            itemId: {
              type: 'string',
              description: 'Message item ID to update',
            },
            content: {
              type: 'string',
              description: 'New message content',
            },
          },
          required: ['convId', 'itemId', 'content'],
        },
      },
      {
        name: 'delete_message',
        description: 'Delete a message from a conversation by item ID',
        inputSchema: {
          type: 'object',
          properties: {
            convId: {
              type: 'string',
              description: 'Conversation ID containing the message',
            },
            itemId: {
              type: 'string',
              description: 'Message item ID to delete',
            },
          },
          required: ['convId', 'itemId'],
        },
      },
      {
        name: 'flag_message',
        description: 'Flag a message for moderation review',
        inputSchema: {
          type: 'object',
          properties: {
            convId: {
              type: 'string',
              description: 'Conversation ID containing the message',
            },
            itemId: {
              type: 'string',
              description: 'Message item ID to flag',
            },
          },
          required: ['convId', 'itemId'],
        },
      },
      {
        name: 'unflag_message',
        description: 'Remove the flag from a previously flagged message',
        inputSchema: {
          type: 'object',
          properties: {
            convId: {
              type: 'string',
              description: 'Conversation ID containing the message',
            },
            itemId: {
              type: 'string',
              description: 'Message item ID to unflag',
            },
          },
          required: ['convId', 'itemId'],
        },
      },
      {
        name: 'like_message',
        description: 'Add a "like" reaction to a message',
        inputSchema: {
          type: 'object',
          properties: {
            convId: {
              type: 'string',
              description: 'Conversation ID containing the message',
            },
            itemId: {
              type: 'string',
              description: 'Message item ID to like',
            },
          },
          required: ['convId', 'itemId'],
        },
      },
      {
        name: 'unlike_message',
        description: 'Remove a "like" reaction from a message',
        inputSchema: {
          type: 'object',
          properties: {
            convId: {
              type: 'string',
              description: 'Conversation ID containing the message',
            },
            itemId: {
              type: 'string',
              description: 'Message item ID to unlike',
            },
          },
          required: ['convId', 'itemId'],
        },
      },
      {
        name: 'get_flagged_messages',
        description: 'Get a list of all flagged messages, optionally scoped to a specific conversation',
        inputSchema: {
          type: 'object',
          properties: {
            convId: {
              type: 'string',
              description: 'Optional conversation ID to scope flagged messages to',
            },
          },
        },
      },
      // ── Participants ───────────────────────────────────────────────────────
      {
        name: 'add_conversation_participants',
        description: 'Add one or more participants to a group conversation',
        inputSchema: {
          type: 'object',
          properties: {
            convId: {
              type: 'string',
              description: 'Conversation ID to add participants to',
            },
            participants: {
              type: 'array',
              description: 'Array of user IDs or emails to add',
              items: { type: 'string' },
            },
          },
          required: ['convId', 'participants'],
        },
      },
      {
        name: 'remove_conversation_participants',
        description: 'Remove one or more participants from a group conversation',
        inputSchema: {
          type: 'object',
          properties: {
            convId: {
              type: 'string',
              description: 'Conversation ID to remove participants from',
            },
            participants: {
              type: 'array',
              description: 'Array of user IDs to remove',
              items: { type: 'string' },
            },
          },
          required: ['convId', 'participants'],
        },
      },
      {
        name: 'get_conversation_participants',
        description: 'Get the list of participants in a conversation',
        inputSchema: {
          type: 'object',
          properties: {
            convId: {
              type: 'string',
              description: 'Conversation ID to retrieve participants for',
            },
          },
          required: ['convId'],
        },
      },
      // ── Conversation Management ────────────────────────────────────────────
      {
        name: 'archive_conversation',
        description: 'Archive (mute) a conversation so it no longer appears in the active list',
        inputSchema: {
          type: 'object',
          properties: {
            convId: {
              type: 'string',
              description: 'Conversation ID to archive',
            },
          },
          required: ['convId'],
        },
      },
      {
        name: 'unarchive_conversation',
        description: 'Unarchive (unmute) a previously archived conversation',
        inputSchema: {
          type: 'object',
          properties: {
            convId: {
              type: 'string',
              description: 'Conversation ID to unarchive',
            },
          },
          required: ['convId'],
        },
      },
      {
        name: 'add_conversation_to_favorites',
        description: 'Mark a conversation as a favorite for quick access',
        inputSchema: {
          type: 'object',
          properties: {
            convId: {
              type: 'string',
              description: 'Conversation ID to add to favorites',
            },
          },
          required: ['convId'],
        },
      },
      {
        name: 'remove_conversation_from_favorites',
        description: 'Remove a conversation from favorites',
        inputSchema: {
          type: 'object',
          properties: {
            convId: {
              type: 'string',
              description: 'Conversation ID to remove from favorites',
            },
          },
          required: ['convId'],
        },
      },
      {
        name: 'get_favorite_conversations',
        description: 'Get all conversations marked as favorites by the authenticated user',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'add_conversation_label',
        description: 'Add a label to a conversation for organization',
        inputSchema: {
          type: 'object',
          properties: {
            convId: {
              type: 'string',
              description: 'Conversation ID to label',
            },
            labelId: {
              type: 'string',
              description: 'Label ID to apply to the conversation',
            },
          },
          required: ['convId', 'labelId'],
        },
      },
      {
        name: 'remove_conversation_label',
        description: 'Remove a label from a conversation',
        inputSchema: {
          type: 'object',
          properties: {
            convId: {
              type: 'string',
              description: 'Conversation ID to remove label from',
            },
            labelId: {
              type: 'string',
              description: 'Label ID to remove',
            },
          },
          required: ['convId', 'labelId'],
        },
      },
      {
        name: 'pin_topic',
        description: 'Pin a message as a topic in a conversation for visibility',
        inputSchema: {
          type: 'object',
          properties: {
            convId: {
              type: 'string',
              description: 'Conversation ID',
            },
            itemId: {
              type: 'string',
              description: 'Message item ID to pin as a topic',
            },
          },
          required: ['convId', 'itemId'],
        },
      },
      {
        name: 'unpin_topic',
        description: 'Unpin a previously pinned topic from a conversation',
        inputSchema: {
          type: 'object',
          properties: {
            convId: {
              type: 'string',
              description: 'Conversation ID',
            },
            itemId: {
              type: 'string',
              description: 'Pinned topic item ID to unpin',
            },
          },
          required: ['convId', 'itemId'],
        },
      },
      {
        name: 'get_pinned_topics',
        description: 'Get all pinned topics for a conversation',
        inputSchema: {
          type: 'object',
          properties: {
            convId: {
              type: 'string',
              description: 'Conversation ID to retrieve pinned topics for',
            },
          },
          required: ['convId'],
        },
      },
      // ── Community ──────────────────────────────────────────────────────────
      {
        name: 'get_community_conversations',
        description: 'Get a list of community (open/broadcast) conversations the user has access to',
        inputSchema: {
          type: 'object',
          properties: {
            results: {
              type: 'number',
              description: 'Number of communities to return',
            },
          },
        },
      },
      {
        name: 'create_community_conversation',
        description: 'Create a new community conversation (open channel) that users can join',
        inputSchema: {
          type: 'object',
          properties: {
            topic: {
              type: 'string',
              description: 'Topic or name for the community conversation',
            },
            description: {
              type: 'string',
              description: 'Description of the community conversation',
            },
          },
          required: ['topic'],
        },
      },
      {
        name: 'join_community',
        description: 'Join a community conversation as the authenticated user',
        inputSchema: {
          type: 'object',
          properties: {
            convId: {
              type: 'string',
              description: 'Community conversation ID to join',
            },
          },
          required: ['convId'],
        },
      },
      // ── Users ──────────────────────────────────────────────────────────────
      {
        name: 'get_user_profile',
        description: 'Get the profile information of the authenticated user',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'update_user_profile',
        description: 'Update the profile information (display name, avatar, etc.) of the authenticated user',
        inputSchema: {
          type: 'object',
          properties: {
            firstName: {
              type: 'string',
              description: 'Updated first name',
            },
            lastName: {
              type: 'string',
              description: 'Updated last name',
            },
            jobTitle: {
              type: 'string',
              description: 'Updated job title',
            },
            phoneNumber: {
              type: 'string',
              description: 'Updated phone number',
            },
          },
        },
      },
      {
        name: 'search_users',
        description: 'Search for users within the tenant by name or email',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Name or partial name to search for',
            },
            email: {
              type: 'string',
              description: 'Email or partial email to search for',
            },
            results: {
              type: 'number',
              description: 'Maximum number of results to return',
            },
          },
        },
      },
      {
        name: 'get_user_by_email',
        description: 'Look up a user by their exact email address',
        inputSchema: {
          type: 'object',
          properties: {
            emailAddress: {
              type: 'string',
              description: 'Exact email address of the user to look up',
            },
          },
          required: ['emailAddress'],
        },
      },
      {
        name: 'get_user_presence',
        description: 'Get the presence status (online, away, busy, offline) of the authenticated user or a specific user',
        inputSchema: {
          type: 'object',
          properties: {
            userId: {
              type: 'string',
              description: 'User ID to get presence for (omit for authenticated user)',
            },
          },
        },
      },
      {
        name: 'update_user_presence',
        description: 'Update the presence status of the authenticated user',
        inputSchema: {
          type: 'object',
          properties: {
            state: {
              type: 'string',
              description: 'Presence state: AVAILABLE, AWAY, BUSY, or DO_NOT_DISTURB',
            },
          },
          required: ['state'],
        },
      },
      // ── Spaces ─────────────────────────────────────────────────────────────
      {
        name: 'get_spaces',
        description: 'Get the list of spaces (shared content areas) the authenticated user belongs to',
        inputSchema: {
          type: 'object',
          properties: {
            results: {
              type: 'number',
              description: 'Number of spaces to return',
            },
          },
        },
      },
      {
        name: 'create_space',
        description: 'Create a new space for sharing content and collaborating',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Name for the new space',
            },
            description: {
              type: 'string',
              description: 'Description of the space',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'update_space',
        description: 'Update the name or description of an existing space',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Space ID to update',
            },
            name: {
              type: 'string',
              description: 'New name for the space',
            },
            description: {
              type: 'string',
              description: 'New description for the space',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'delete_space',
        description: 'Delete a space and all its content (irreversible)',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Space ID to delete',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'join_space',
        description: 'Join an existing space as the authenticated user',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Space ID to join',
            },
          },
          required: ['id'],
        },
      },
      // ── Webhooks ───────────────────────────────────────────────────────────
      {
        name: 'get_webhooks',
        description: 'Get all registered webhooks for the authenticated user',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'register_webhook',
        description: 'Register a new webhook to receive real-time event notifications',
        inputSchema: {
          type: 'object',
          properties: {
            url: {
              type: 'string',
              description: 'HTTPS URL to deliver webhook events to',
            },
            filter: {
              type: 'string',
              description: 'Event filter expression to select which events trigger the webhook',
            },
            secret: {
              type: 'string',
              description: 'Optional shared secret for HMAC signature verification',
            },
          },
          required: ['url'],
        },
      },
      {
        name: 'update_webhook',
        description: 'Update the URL, filter, or secret for an existing webhook registration',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Webhook ID to update',
            },
            url: {
              type: 'string',
              description: 'New HTTPS URL to deliver events to',
            },
            filter: {
              type: 'string',
              description: 'Updated event filter expression',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'delete_webhook',
        description: 'Delete a registered webhook by ID — the webhook will stop receiving events immediately',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Webhook ID to delete',
            },
          },
          required: ['id'],
        },
      },
      // ── RTC Sessions ───────────────────────────────────────────────────────
      {
        name: 'get_active_rtc_sessions',
        description: 'Get a list of currently active real-time communication (voice/video) sessions',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'get_conversations':               return this.getConversations(args);
        case 'get_conversations_by_ids':        return this.getConversationsByIds(args);
        case 'create_direct_conversation':      return this.createDirectConversation(args);
        case 'create_group_conversation':       return this.createGroupConversation(args);
        case 'update_group_conversation':       return this.updateGroupConversation(args);
        case 'get_conversation':                return this.getConversation(args);
        case 'search_conversations':            return this.searchConversations(args);
        case 'get_conversation_items':          return this.getConversationItems(args);
        case 'send_message':                    return this.sendMessage(args);
        case 'update_message':                  return this.updateMessage(args);
        case 'delete_message':                  return this.deleteMessage(args);
        case 'flag_message':                    return this.flagMessage(args);
        case 'unflag_message':                  return this.unflagMessage(args);
        case 'like_message':                    return this.likeMessage(args);
        case 'unlike_message':                  return this.unlikeMessage(args);
        case 'get_flagged_messages':            return this.getFlaggedMessages(args);
        case 'add_conversation_participants':   return this.addConversationParticipants(args);
        case 'remove_conversation_participants':return this.removeConversationParticipants(args);
        case 'get_conversation_participants':   return this.getConversationParticipants(args);
        case 'archive_conversation':            return this.archiveConversation(args);
        case 'unarchive_conversation':          return this.unarchiveConversation(args);
        case 'add_conversation_to_favorites':   return this.addToFavorites(args);
        case 'remove_conversation_from_favorites': return this.removeFromFavorites(args);
        case 'get_favorite_conversations':      return this.getFavoriteConversations();
        case 'add_conversation_label':          return this.addConversationLabel(args);
        case 'remove_conversation_label':       return this.removeConversationLabel(args);
        case 'pin_topic':                       return this.pinTopic(args);
        case 'unpin_topic':                     return this.unpinTopic(args);
        case 'get_pinned_topics':               return this.getPinnedTopics(args);
        case 'get_community_conversations':     return this.getCommunityConversations(args);
        case 'create_community_conversation':   return this.createCommunityConversation(args);
        case 'join_community':                  return this.joinCommunity(args);
        case 'get_user_profile':                return this.getUserProfile();
        case 'update_user_profile':             return this.updateUserProfile(args);
        case 'search_users':                    return this.searchUsers(args);
        case 'get_user_by_email':               return this.getUserByEmail(args);
        case 'get_user_presence':               return this.getUserPresence(args);
        case 'update_user_presence':            return this.updateUserPresence(args);
        case 'get_spaces':                      return this.getSpaces(args);
        case 'create_space':                    return this.createSpace(args);
        case 'update_space':                    return this.updateSpace(args);
        case 'delete_space':                    return this.deleteSpace(args);
        case 'join_space':                      return this.joinSpace(args);
        case 'get_webhooks':                    return this.getWebhooks();
        case 'register_webhook':                return this.registerWebhook(args);
        case 'update_webhook':                  return this.updateWebhook(args);
        case 'delete_webhook':                  return this.deleteWebhook(args);
        case 'get_active_rtc_sessions':         return this.getActiveRtcSessions();
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

  // ── Private helpers ────────────────────────────────────────────────────────

  private get authHeader(): string {
    return `Bearer ${this.accessToken}`;
  }

  private buildQuery(params: Record<string, unknown>): string {
    const q = Object.entries(params)
      .filter(([, v]) => v !== undefined && v !== null && v !== '')
      .map(([k, v]) => {
        if (Array.isArray(v)) {
          return v.map(item => `${encodeURIComponent(k)}=${encodeURIComponent(String(item))}`).join('&');
        }
        return `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`;
      })
      .join('&');
    return q ? `?${q}` : '';
  }

  private async request(
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    path: string,
    body?: Record<string, unknown>,
  ): Promise<ToolResult> {
    const url = `${this.baseUrl}${path}`;
    const init: RequestInit = {
      method,
      headers: {
        Authorization: this.authHeader,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    };
    if (body && Object.keys(body).length > 0) init.body = JSON.stringify(body);
    const response = await this.fetchWithRetry(url, init);
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${errText}` }],
        isError: true,
      };
    }
    if (response.status === 204) {
      return { content: [{ type: 'text', text: '{"success":true}' }], isError: false };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  // ── Conversations ──────────────────────────────────────────────────────────

  private async getConversations(args: Record<string, unknown>): Promise<ToolResult> {
    const q = this.buildQuery(args);
    return this.request('GET', `/conversations${q}`);
  }

  private async getConversationsByIds(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.convId) return { content: [{ type: 'text', text: 'convId is required' }], isError: true };
    const q = this.buildQuery({ convId: args.convId });
    return this.request('GET', `/conversations/byIds${q}`);
  }

  private async createDirectConversation(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.participant) return { content: [{ type: 'text', text: 'participant is required' }], isError: true };
    return this.request('POST', '/conversations/direct', args as Record<string, unknown>);
  }

  private async createGroupConversation(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.participants) return { content: [{ type: 'text', text: 'participants is required' }], isError: true };
    return this.request('POST', '/conversations/group', args as Record<string, unknown>);
  }

  private async updateGroupConversation(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.convId) return { content: [{ type: 'text', text: 'convId is required' }], isError: true };
    const { convId, ...body } = args;
    return this.request('PUT', `/conversations/group/${encodeURIComponent(convId as string)}`, body as Record<string, unknown>);
  }

  private async getConversation(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.convId) return { content: [{ type: 'text', text: 'convId is required' }], isError: true };
    return this.request('GET', `/conversations/${encodeURIComponent(args.convId as string)}`);
  }

  private async searchConversations(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.query) return { content: [{ type: 'text', text: 'query is required' }], isError: true };
    const q = this.buildQuery(args);
    return this.request('GET', `/conversations/search${q}`);
  }

  // ── Messages ───────────────────────────────────────────────────────────────

  private async getConversationItems(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.convId) return { content: [{ type: 'text', text: 'convId is required' }], isError: true };
    const { convId, ...params } = args;
    const q = this.buildQuery(params as Record<string, unknown>);
    return this.request('GET', `/conversations/${encodeURIComponent(convId as string)}/items${q}`);
  }

  private async sendMessage(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.convId || !args.content) {
      return { content: [{ type: 'text', text: 'convId and content are required' }], isError: true };
    }
    const { convId, ...body } = args;
    return this.request('POST', `/conversations/${encodeURIComponent(convId as string)}/messages`, body as Record<string, unknown>);
  }

  private async updateMessage(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.convId || !args.itemId || !args.content) {
      return { content: [{ type: 'text', text: 'convId, itemId, and content are required' }], isError: true };
    }
    const { convId, itemId, ...body } = args;
    return this.request('PUT', `/conversations/${encodeURIComponent(convId as string)}/messages/${encodeURIComponent(itemId as string)}`, body as Record<string, unknown>);
  }

  private async deleteMessage(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.convId || !args.itemId) {
      return { content: [{ type: 'text', text: 'convId and itemId are required' }], isError: true };
    }
    return this.request('DELETE', `/conversations/${encodeURIComponent(args.convId as string)}/messages/${encodeURIComponent(args.itemId as string)}`);
  }

  private async flagMessage(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.convId || !args.itemId) {
      return { content: [{ type: 'text', text: 'convId and itemId are required' }], isError: true };
    }
    return this.request('POST', `/conversations/${encodeURIComponent(args.convId as string)}/messages/${encodeURIComponent(args.itemId as string)}/flag`);
  }

  private async unflagMessage(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.convId || !args.itemId) {
      return { content: [{ type: 'text', text: 'convId and itemId are required' }], isError: true };
    }
    return this.request('DELETE', `/conversations/${encodeURIComponent(args.convId as string)}/messages/${encodeURIComponent(args.itemId as string)}/flag`);
  }

  private async likeMessage(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.convId || !args.itemId) {
      return { content: [{ type: 'text', text: 'convId and itemId are required' }], isError: true };
    }
    return this.request('POST', `/conversations/${encodeURIComponent(args.convId as string)}/messages/${encodeURIComponent(args.itemId as string)}/like`);
  }

  private async unlikeMessage(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.convId || !args.itemId) {
      return { content: [{ type: 'text', text: 'convId and itemId are required' }], isError: true };
    }
    return this.request('DELETE', `/conversations/${encodeURIComponent(args.convId as string)}/messages/${encodeURIComponent(args.itemId as string)}/like`);
  }

  private async getFlaggedMessages(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.convId) {
      return this.request('GET', `/conversations/${encodeURIComponent(args.convId as string)}/messages/flag`);
    }
    return this.request('GET', '/conversations/messages/flag');
  }

  // ── Participants ───────────────────────────────────────────────────────────

  private async addConversationParticipants(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.convId || !args.participants) {
      return { content: [{ type: 'text', text: 'convId and participants are required' }], isError: true };
    }
    const { convId, ...body } = args;
    return this.request('POST', `/conversations/group/${encodeURIComponent(convId as string)}/participants`, body as Record<string, unknown>);
  }

  private async removeConversationParticipants(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.convId || !args.participants) {
      return { content: [{ type: 'text', text: 'convId and participants are required' }], isError: true };
    }
    const { convId } = args;
    return this.request('DELETE', `/conversations/group/${encodeURIComponent(convId as string)}/participants`);
  }

  private async getConversationParticipants(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.convId) return { content: [{ type: 'text', text: 'convId is required' }], isError: true };
    return this.request('GET', `/conversations/${encodeURIComponent(args.convId as string)}/participants`);
  }

  // ── Conversation Management ────────────────────────────────────────────────

  private async archiveConversation(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.convId) return { content: [{ type: 'text', text: 'convId is required' }], isError: true };
    return this.request('POST', `/conversations/${encodeURIComponent(args.convId as string)}/archive`);
  }

  private async unarchiveConversation(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.convId) return { content: [{ type: 'text', text: 'convId is required' }], isError: true };
    return this.request('DELETE', `/conversations/${encodeURIComponent(args.convId as string)}/archive`);
  }

  private async addToFavorites(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.convId) return { content: [{ type: 'text', text: 'convId is required' }], isError: true };
    return this.request('POST', `/conversations/${encodeURIComponent(args.convId as string)}/favorite`);
  }

  private async removeFromFavorites(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.convId) return { content: [{ type: 'text', text: 'convId is required' }], isError: true };
    return this.request('DELETE', `/conversations/${encodeURIComponent(args.convId as string)}/favorite`);
  }

  private async getFavoriteConversations(): Promise<ToolResult> {
    return this.request('GET', '/conversations/favorite');
  }

  private async addConversationLabel(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.convId || !args.labelId) {
      return { content: [{ type: 'text', text: 'convId and labelId are required' }], isError: true };
    }
    return this.request('POST', `/conversations/${encodeURIComponent(args.convId as string)}/label`, { labelId: args.labelId });
  }

  private async removeConversationLabel(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.convId || !args.labelId) {
      return { content: [{ type: 'text', text: 'convId and labelId are required' }], isError: true };
    }
    return this.request('DELETE', `/conversations/${encodeURIComponent(args.convId as string)}/label/${encodeURIComponent(args.labelId as string)}`);
  }

  private async pinTopic(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.convId || !args.itemId) {
      return { content: [{ type: 'text', text: 'convId and itemId are required' }], isError: true };
    }
    return this.request('POST', `/conversations/${encodeURIComponent(args.convId as string)}/pins/${encodeURIComponent(args.itemId as string)}`);
  }

  private async unpinTopic(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.convId || !args.itemId) {
      return { content: [{ type: 'text', text: 'convId and itemId are required' }], isError: true };
    }
    return this.request('DELETE', `/conversations/${encodeURIComponent(args.convId as string)}/pins/${encodeURIComponent(args.itemId as string)}`);
  }

  private async getPinnedTopics(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.convId) return { content: [{ type: 'text', text: 'convId is required' }], isError: true };
    return this.request('GET', `/conversations/${encodeURIComponent(args.convId as string)}/pins`);
  }

  // ── Community ──────────────────────────────────────────────────────────────

  private async getCommunityConversations(args: Record<string, unknown>): Promise<ToolResult> {
    const q = this.buildQuery(args);
    return this.request('GET', `/conversations/community${q}`);
  }

  private async createCommunityConversation(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.topic) return { content: [{ type: 'text', text: 'topic is required' }], isError: true };
    return this.request('POST', '/conversations/community', args as Record<string, unknown>);
  }

  private async joinCommunity(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.convId) return { content: [{ type: 'text', text: 'convId is required' }], isError: true };
    return this.request('POST', `/conversations/community/${encodeURIComponent(args.convId as string)}/join`);
  }

  // ── Users ──────────────────────────────────────────────────────────────────

  private async getUserProfile(): Promise<ToolResult> {
    return this.request('GET', '/users/profile');
  }

  private async updateUserProfile(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request('PUT', '/users/profile', args as Record<string, unknown>);
  }

  private async searchUsers(args: Record<string, unknown>): Promise<ToolResult> {
    const q = this.buildQuery(args);
    return this.request('GET', `/users${q}`);
  }

  private async getUserByEmail(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.emailAddress) return { content: [{ type: 'text', text: 'emailAddress is required' }], isError: true };
    return this.request('GET', `/users/${encodeURIComponent(args.emailAddress as string)}/getUserByEmail`);
  }

  private async getUserPresence(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.userId) {
      return this.request('GET', `/users/${encodeURIComponent(args.userId as string)}/presence`);
    }
    return this.request('GET', '/users/presence');
  }

  private async updateUserPresence(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.state) return { content: [{ type: 'text', text: 'state is required' }], isError: true };
    return this.request('PUT', '/users/presence', args as Record<string, unknown>);
  }

  // ── Spaces ─────────────────────────────────────────────────────────────────

  private async getSpaces(args: Record<string, unknown>): Promise<ToolResult> {
    const q = this.buildQuery(args);
    return this.request('GET', `/spaces${q}`);
  }

  private async createSpace(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name) return { content: [{ type: 'text', text: 'name is required' }], isError: true };
    return this.request('POST', '/spaces/create', args as Record<string, unknown>);
  }

  private async updateSpace(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    const { id, ...body } = args;
    return this.request('PUT', `/spaces/${encodeURIComponent(id as string)}`, body as Record<string, unknown>);
  }

  private async deleteSpace(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.request('DELETE', `/spaces/${encodeURIComponent(args.id as string)}`);
  }

  private async joinSpace(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.request('POST', `/spaces/${encodeURIComponent(args.id as string)}/join`);
  }

  // ── Webhooks ───────────────────────────────────────────────────────────────

  private async getWebhooks(): Promise<ToolResult> {
    return this.request('GET', '/webhooks');
  }

  private async registerWebhook(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.url) return { content: [{ type: 'text', text: 'url is required' }], isError: true };
    return this.request('POST', '/webhooks', args as Record<string, unknown>);
  }

  private async updateWebhook(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    const { id, ...body } = args;
    return this.request('PUT', `/webhooks/${encodeURIComponent(id as string)}`, body as Record<string, unknown>);
  }

  private async deleteWebhook(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.request('DELETE', `/webhooks/${encodeURIComponent(args.id as string)}`);
  }

  // ── RTC Sessions ───────────────────────────────────────────────────────────

  private async getActiveRtcSessions(): Promise<ToolResult> {
    return this.request('GET', '/rtc/sessions');
  }
}

/**
 * Telegram MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28 (no Telegram Inc. official MCP server)
// Several community MCP servers exist (guangxiangdebizi/telegram-mcp, chigwell/telegram-mcp, etc.)
// but none are published by Telegram Inc. Decision: use-rest-api
// Note: Tool get_chat_members_count calls Bot API method getChatMemberCount (current name).
//   getChatMembersCount was renamed to getChatMemberCount in Bot API 7.3+ — implementation is correct.
//
// Base URL: https://api.telegram.org/bot{token}
// Auth: Bot token embedded in URL path — obtained from @BotFather
// Docs: https://core.telegram.org/bots/api
// Rate limits: 30 messages/second to different chats; 20 messages/minute to the same chat
// Note: getUpdates (polling) and setWebhook are mutually exclusive — only use one at a time

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface TelegramConfig {
  botToken: string;
  baseUrl?: string;
}

export class TelegramMCPServer extends MCPAdapterBase {
  private readonly botToken: string;
  private readonly baseUrl: string;

  constructor(config: TelegramConfig) {
    super();
    this.botToken = config.botToken;
    this.baseUrl = config.baseUrl || 'https://api.telegram.org';
  }

  static catalog() {
    return {
      name: 'telegram',
      displayName: 'Telegram',
      version: '1.0.0',
      category: 'communication',
      keywords: [
        'telegram', 'bot', 'messaging', 'chat', 'channel', 'group', 'notifications',
        'webhook', 'inline', 'poll', 'media', 'send message', 'bot api',
      ],
      toolNames: [
        'get_me', 'send_message', 'edit_message', 'delete_message', 'forward_message',
        'copy_message', 'send_photo', 'send_document', 'pin_message', 'unpin_message',
        'get_chat', 'get_chat_member', 'get_chat_members_count',
        'get_updates', 'set_webhook', 'delete_webhook', 'get_webhook_info',
        'send_poll', 'stop_poll', 'answer_callback_query',
        'ban_chat_member', 'unban_chat_member', 'restrict_chat_member',
      ],
      description: 'Telegram Bot API: send messages and media, manage chats and members, configure webhooks, create polls, and moderate groups.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'get_me',
        description: 'Get basic information about the bot — returns username, ID, and capabilities',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'send_message',
        description: 'Send a text message to a chat, group, channel, or user with optional formatting and reply options',
        inputSchema: {
          type: 'object',
          properties: {
            chat_id: {
              type: 'string',
              description: 'Unique identifier for the target chat — numeric ID or @username for channels',
            },
            text: {
              type: 'string',
              description: 'Message text (up to 4096 characters)',
            },
            parse_mode: {
              type: 'string',
              description: 'Text formatting: HTML, Markdown, or MarkdownV2 (default: plain text)',
            },
            reply_to_message_id: {
              type: 'number',
              description: 'Message ID to reply to in the same chat',
            },
            disable_notification: {
              type: 'boolean',
              description: 'Send silently without notification (default: false)',
            },
            protect_content: {
              type: 'boolean',
              description: 'Protect the message from forwarding and saving (default: false)',
            },
          },
          required: ['chat_id', 'text'],
        },
      },
      {
        name: 'edit_message',
        description: 'Edit the text of a previously sent message in a chat by message ID',
        inputSchema: {
          type: 'object',
          properties: {
            chat_id: {
              type: 'string',
              description: 'Chat ID where the message was sent',
            },
            message_id: {
              type: 'number',
              description: 'ID of the message to edit',
            },
            text: {
              type: 'string',
              description: 'New message text',
            },
            parse_mode: {
              type: 'string',
              description: 'Text formatting: HTML, Markdown, or MarkdownV2',
            },
          },
          required: ['chat_id', 'message_id', 'text'],
        },
      },
      {
        name: 'delete_message',
        description: 'Delete a message from a chat by chat ID and message ID — bots can only delete messages within 48 hours',
        inputSchema: {
          type: 'object',
          properties: {
            chat_id: {
              type: 'string',
              description: 'Chat ID where the message is located',
            },
            message_id: {
              type: 'number',
              description: 'ID of the message to delete',
            },
          },
          required: ['chat_id', 'message_id'],
        },
      },
      {
        name: 'forward_message',
        description: 'Forward a message from one chat to another — the original sender is shown',
        inputSchema: {
          type: 'object',
          properties: {
            chat_id: {
              type: 'string',
              description: 'Target chat ID to forward the message to',
            },
            from_chat_id: {
              type: 'string',
              description: 'Source chat ID where the original message is located',
            },
            message_id: {
              type: 'number',
              description: 'Message ID in the source chat to forward',
            },
            disable_notification: {
              type: 'boolean',
              description: 'Forward silently without sound notification (default: false)',
            },
          },
          required: ['chat_id', 'from_chat_id', 'message_id'],
        },
      },
      {
        name: 'copy_message',
        description: 'Copy a message to another chat without the forwarding header — the original sender is not attributed',
        inputSchema: {
          type: 'object',
          properties: {
            chat_id: {
              type: 'string',
              description: 'Target chat ID to copy the message to',
            },
            from_chat_id: {
              type: 'string',
              description: 'Source chat ID containing the message',
            },
            message_id: {
              type: 'number',
              description: 'Message ID to copy',
            },
            caption: {
              type: 'string',
              description: 'Optional new caption to add when copying the message',
            },
          },
          required: ['chat_id', 'from_chat_id', 'message_id'],
        },
      },
      {
        name: 'send_photo',
        description: 'Send a photo to a chat from a file_id or publicly accessible HTTPS URL',
        inputSchema: {
          type: 'object',
          properties: {
            chat_id: {
              type: 'string',
              description: 'Target chat ID or @username',
            },
            photo: {
              type: 'string',
              description: 'File ID of a previously uploaded photo, or HTTPS URL of a photo',
            },
            caption: {
              type: 'string',
              description: 'Optional caption for the photo (up to 1024 characters)',
            },
            parse_mode: {
              type: 'string',
              description: 'Caption formatting: HTML, Markdown, or MarkdownV2',
            },
          },
          required: ['chat_id', 'photo'],
        },
      },
      {
        name: 'send_document',
        description: 'Send a document or file to a chat from a file_id or publicly accessible HTTPS URL',
        inputSchema: {
          type: 'object',
          properties: {
            chat_id: {
              type: 'string',
              description: 'Target chat ID or @username',
            },
            document: {
              type: 'string',
              description: 'File ID of a previously uploaded document, or HTTPS URL of a file',
            },
            caption: {
              type: 'string',
              description: 'Optional document caption (up to 1024 characters)',
            },
            parse_mode: {
              type: 'string',
              description: 'Caption formatting: HTML, Markdown, or MarkdownV2',
            },
          },
          required: ['chat_id', 'document'],
        },
      },
      {
        name: 'pin_message',
        description: 'Pin a message in a group, supergroup, or channel so it appears in the pinned messages list',
        inputSchema: {
          type: 'object',
          properties: {
            chat_id: {
              type: 'string',
              description: 'Chat ID where the message to pin is located',
            },
            message_id: {
              type: 'number',
              description: 'Message ID to pin',
            },
            disable_notification: {
              type: 'boolean',
              description: 'Pin without notifying members (default: false)',
            },
          },
          required: ['chat_id', 'message_id'],
        },
      },
      {
        name: 'unpin_message',
        description: 'Unpin a specific pinned message or all pinned messages in a chat',
        inputSchema: {
          type: 'object',
          properties: {
            chat_id: {
              type: 'string',
              description: 'Chat ID to unpin message from',
            },
            message_id: {
              type: 'number',
              description: 'Specific message ID to unpin (omit to unpin all pinned messages)',
            },
          },
          required: ['chat_id'],
        },
      },
      {
        name: 'get_chat',
        description: 'Get information about a chat including type, title, member count, and description',
        inputSchema: {
          type: 'object',
          properties: {
            chat_id: {
              type: 'string',
              description: 'Chat ID or @username of the channel/group',
            },
          },
          required: ['chat_id'],
        },
      },
      {
        name: 'get_chat_member',
        description: 'Get information about a specific member of a chat including their role and permissions',
        inputSchema: {
          type: 'object',
          properties: {
            chat_id: {
              type: 'string',
              description: 'Chat ID or @username',
            },
            user_id: {
              type: 'number',
              description: 'Numeric user ID of the member to look up',
            },
          },
          required: ['chat_id', 'user_id'],
        },
      },
      {
        name: 'get_chat_members_count',
        description: 'Get the total number of members in a chat, group, or channel',
        inputSchema: {
          type: 'object',
          properties: {
            chat_id: {
              type: 'string',
              description: 'Chat ID or @username',
            },
          },
          required: ['chat_id'],
        },
      },
      {
        name: 'get_updates',
        description: 'Poll for incoming updates (messages, callbacks, etc.) using long polling — cannot be used while a webhook is set',
        inputSchema: {
          type: 'object',
          properties: {
            offset: {
              type: 'number',
              description: 'Identifier of the first update to return — use last_update_id + 1 to acknowledge previous updates',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of updates to return (1-100, default: 100)',
            },
            timeout: {
              type: 'number',
              description: 'Timeout in seconds for long polling (0 for short polling, default: 0)',
            },
            allowed_updates: {
              type: 'array',
              description: 'List of update types to receive: message, edited_message, channel_post, callback_query, etc.',
            },
          },
        },
      },
      {
        name: 'set_webhook',
        description: 'Set a webhook URL to receive incoming updates via HTTPS POST — replaces getUpdates polling',
        inputSchema: {
          type: 'object',
          properties: {
            url: {
              type: 'string',
              description: 'HTTPS URL to send updates to (must use port 443, 80, 88, or 8443)',
            },
            max_connections: {
              type: 'number',
              description: 'Maximum simultaneous HTTPS connections (1-100, default: 40)',
            },
            allowed_updates: {
              type: 'array',
              description: 'List of update types to receive (default: all)',
            },
            secret_token: {
              type: 'string',
              description: 'Secret token sent in X-Telegram-Bot-Api-Secret-Token header for webhook verification',
            },
          },
          required: ['url'],
        },
      },
      {
        name: 'delete_webhook',
        description: 'Remove the webhook configuration and revert to getUpdates polling mode',
        inputSchema: {
          type: 'object',
          properties: {
            drop_pending_updates: {
              type: 'boolean',
              description: 'Drop all pending updates that arrived while the webhook was set (default: false)',
            },
          },
        },
      },
      {
        name: 'get_webhook_info',
        description: 'Get current webhook configuration including URL, last error, and pending update count',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'send_poll',
        description: 'Send a regular or quiz poll to a chat with a question and list of answer options',
        inputSchema: {
          type: 'object',
          properties: {
            chat_id: {
              type: 'string',
              description: 'Target chat ID or @username',
            },
            question: {
              type: 'string',
              description: 'Poll question text (up to 300 characters)',
            },
            options: {
              type: 'array',
              description: 'Array of answer option strings (2-10 options, each up to 100 characters)',
            },
            is_anonymous: {
              type: 'boolean',
              description: 'Whether votes are anonymous (default: true)',
            },
            type: {
              type: 'string',
              description: 'Poll type: regular or quiz (default: regular)',
            },
            allows_multiple_answers: {
              type: 'boolean',
              description: 'Allow multiple answer selections for regular polls (default: false)',
            },
          },
          required: ['chat_id', 'question', 'options'],
        },
      },
      {
        name: 'stop_poll',
        description: 'Stop a poll that was previously sent by the bot, finalizing the vote count',
        inputSchema: {
          type: 'object',
          properties: {
            chat_id: {
              type: 'string',
              description: 'Chat ID where the poll was sent',
            },
            message_id: {
              type: 'number',
              description: 'Message ID of the poll to stop',
            },
          },
          required: ['chat_id', 'message_id'],
        },
      },
      {
        name: 'answer_callback_query',
        description: 'Answer a callback query from an inline keyboard button press — required to stop the loading indicator',
        inputSchema: {
          type: 'object',
          properties: {
            callback_query_id: {
              type: 'string',
              description: 'Unique callback query ID from the update',
            },
            text: {
              type: 'string',
              description: 'Optional notification text to show to the user (up to 200 characters)',
            },
            show_alert: {
              type: 'boolean',
              description: 'Show as an alert dialog instead of a notification (default: false)',
            },
          },
          required: ['callback_query_id'],
        },
      },
      {
        name: 'ban_chat_member',
        description: 'Ban a user from a group or supergroup — they cannot rejoin unless unbanned',
        inputSchema: {
          type: 'object',
          properties: {
            chat_id: {
              type: 'string',
              description: 'Chat ID of the group or supergroup',
            },
            user_id: {
              type: 'number',
              description: 'Numeric user ID to ban',
            },
            until_date: {
              type: 'number',
              description: 'Unix timestamp when the ban expires (0 = permanent ban)',
            },
            revoke_messages: {
              type: 'boolean',
              description: 'Delete all messages from the user in the chat (default: false)',
            },
          },
          required: ['chat_id', 'user_id'],
        },
      },
      {
        name: 'unban_chat_member',
        description: 'Unban a previously banned user from a supergroup or channel so they can rejoin',
        inputSchema: {
          type: 'object',
          properties: {
            chat_id: {
              type: 'string',
              description: 'Chat ID of the supergroup or channel',
            },
            user_id: {
              type: 'number',
              description: 'Numeric user ID to unban',
            },
          },
          required: ['chat_id', 'user_id'],
        },
      },
      {
        name: 'restrict_chat_member',
        description: 'Restrict a user in a supergroup by limiting their permissions (e.g. read-only, no media)',
        inputSchema: {
          type: 'object',
          properties: {
            chat_id: {
              type: 'string',
              description: 'Chat ID of the supergroup',
            },
            user_id: {
              type: 'number',
              description: 'Numeric user ID to restrict',
            },
            permissions: {
              type: 'object',
              description: 'ChatPermissions object with boolean fields: can_send_messages, can_send_media_messages, can_send_polls, can_add_web_page_previews, can_change_info, can_invite_users, can_pin_messages',
            },
            until_date: {
              type: 'number',
              description: 'Unix timestamp when restrictions expire (0 = permanent)',
            },
          },
          required: ['chat_id', 'user_id', 'permissions'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'get_me': return this.callBotApi('getMe', {});
        case 'send_message': return this.sendMessage(args);
        case 'edit_message': return this.editMessage(args);
        case 'delete_message': return this.deleteMessage(args);
        case 'forward_message': return this.forwardMessage(args);
        case 'copy_message': return this.copyMessage(args);
        case 'send_photo': return this.sendPhoto(args);
        case 'send_document': return this.sendDocument(args);
        case 'pin_message': return this.pinMessage(args);
        case 'unpin_message': return this.unpinMessage(args);
        case 'get_chat': return this.getChat(args);
        case 'get_chat_member': return this.getChatMember(args);
        case 'get_chat_members_count': return this.getChatMembersCount(args);
        case 'get_updates': return this.getUpdates(args);
        case 'set_webhook': return this.setWebhook(args);
        case 'delete_webhook': return this.deleteWebhook(args);
        case 'get_webhook_info': return this.callBotApi('getWebhookInfo', {});
        case 'send_poll': return this.sendPoll(args);
        case 'stop_poll': return this.stopPoll(args);
        case 'answer_callback_query': return this.answerCallbackQuery(args);
        case 'ban_chat_member': return this.banChatMember(args);
        case 'unban_chat_member': return this.unbanChatMember(args);
        case 'restrict_chat_member': return this.restrictChatMember(args);
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

  private get apiBase(): string {
    return `${this.baseUrl}/bot${this.botToken}`;
  }

  private async callBotApi(method: string, body: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.apiBase}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await response.json() as { ok: boolean; result?: unknown; description?: string };
    if (!data.ok) {
      return { content: [{ type: 'text', text: `Telegram API error: ${data.description || 'Unknown error'}` }], isError: true };
    }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async sendMessage(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.chat_id || !args.text) return { content: [{ type: 'text', text: 'chat_id and text are required' }], isError: true };
    const body: Record<string, unknown> = { chat_id: args.chat_id, text: args.text };
    if (args.parse_mode) body.parse_mode = args.parse_mode;
    if (args.reply_to_message_id) body.reply_to_message_id = args.reply_to_message_id;
    if (typeof args.disable_notification === 'boolean') body.disable_notification = args.disable_notification;
    if (typeof args.protect_content === 'boolean') body.protect_content = args.protect_content;
    return this.callBotApi('sendMessage', body);
  }

  private async editMessage(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.chat_id || !args.message_id || !args.text) return { content: [{ type: 'text', text: 'chat_id, message_id, and text are required' }], isError: true };
    const body: Record<string, unknown> = { chat_id: args.chat_id, message_id: args.message_id, text: args.text };
    if (args.parse_mode) body.parse_mode = args.parse_mode;
    return this.callBotApi('editMessageText', body);
  }

  private async deleteMessage(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.chat_id || args.message_id === undefined) return { content: [{ type: 'text', text: 'chat_id and message_id are required' }], isError: true };
    return this.callBotApi('deleteMessage', { chat_id: args.chat_id, message_id: args.message_id });
  }

  private async forwardMessage(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.chat_id || !args.from_chat_id || args.message_id === undefined) return { content: [{ type: 'text', text: 'chat_id, from_chat_id, and message_id are required' }], isError: true };
    const body: Record<string, unknown> = { chat_id: args.chat_id, from_chat_id: args.from_chat_id, message_id: args.message_id };
    if (typeof args.disable_notification === 'boolean') body.disable_notification = args.disable_notification;
    return this.callBotApi('forwardMessage', body);
  }

  private async copyMessage(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.chat_id || !args.from_chat_id || args.message_id === undefined) return { content: [{ type: 'text', text: 'chat_id, from_chat_id, and message_id are required' }], isError: true };
    const body: Record<string, unknown> = { chat_id: args.chat_id, from_chat_id: args.from_chat_id, message_id: args.message_id };
    if (args.caption) body.caption = args.caption;
    return this.callBotApi('copyMessage', body);
  }

  private async sendPhoto(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.chat_id || !args.photo) return { content: [{ type: 'text', text: 'chat_id and photo are required' }], isError: true };
    const body: Record<string, unknown> = { chat_id: args.chat_id, photo: args.photo };
    if (args.caption) body.caption = args.caption;
    if (args.parse_mode) body.parse_mode = args.parse_mode;
    return this.callBotApi('sendPhoto', body);
  }

  private async sendDocument(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.chat_id || !args.document) return { content: [{ type: 'text', text: 'chat_id and document are required' }], isError: true };
    const body: Record<string, unknown> = { chat_id: args.chat_id, document: args.document };
    if (args.caption) body.caption = args.caption;
    if (args.parse_mode) body.parse_mode = args.parse_mode;
    return this.callBotApi('sendDocument', body);
  }

  private async pinMessage(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.chat_id || args.message_id === undefined) return { content: [{ type: 'text', text: 'chat_id and message_id are required' }], isError: true };
    const body: Record<string, unknown> = { chat_id: args.chat_id, message_id: args.message_id };
    if (typeof args.disable_notification === 'boolean') body.disable_notification = args.disable_notification;
    return this.callBotApi('pinChatMessage', body);
  }

  private async unpinMessage(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.chat_id) return { content: [{ type: 'text', text: 'chat_id is required' }], isError: true };
    if (args.message_id !== undefined) {
      return this.callBotApi('unpinChatMessage', { chat_id: args.chat_id, message_id: args.message_id });
    }
    return this.callBotApi('unpinAllChatMessages', { chat_id: args.chat_id });
  }

  private async getChat(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.chat_id) return { content: [{ type: 'text', text: 'chat_id is required' }], isError: true };
    return this.callBotApi('getChat', { chat_id: args.chat_id });
  }

  private async getChatMember(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.chat_id || !args.user_id) return { content: [{ type: 'text', text: 'chat_id and user_id are required' }], isError: true };
    return this.callBotApi('getChatMember', { chat_id: args.chat_id, user_id: args.user_id });
  }

  private async getChatMembersCount(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.chat_id) return { content: [{ type: 'text', text: 'chat_id is required' }], isError: true };
    return this.callBotApi('getChatMemberCount', { chat_id: args.chat_id });
  }

  private async getUpdates(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {
      limit: (args.limit as number) || 100,
      timeout: (args.timeout as number) || 0,
    };
    if (args.offset !== undefined) body.offset = args.offset;
    if (args.allowed_updates) body.allowed_updates = args.allowed_updates;
    return this.callBotApi('getUpdates', body);
  }

  private async setWebhook(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.url) return { content: [{ type: 'text', text: 'url is required' }], isError: true };
    const body: Record<string, unknown> = { url: args.url };
    if (args.max_connections) body.max_connections = args.max_connections;
    if (args.allowed_updates) body.allowed_updates = args.allowed_updates;
    if (args.secret_token) body.secret_token = args.secret_token;
    return this.callBotApi('setWebhook', body);
  }

  private async deleteWebhook(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {};
    if (typeof args.drop_pending_updates === 'boolean') body.drop_pending_updates = args.drop_pending_updates;
    return this.callBotApi('deleteWebhook', body);
  }

  private async sendPoll(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.chat_id || !args.question || !args.options) return { content: [{ type: 'text', text: 'chat_id, question, and options are required' }], isError: true };
    const body: Record<string, unknown> = {
      chat_id: args.chat_id,
      question: args.question,
      options: args.options,
    };
    if (typeof args.is_anonymous === 'boolean') body.is_anonymous = args.is_anonymous;
    if (args.type) body.type = args.type;
    if (typeof args.allows_multiple_answers === 'boolean') body.allows_multiple_answers = args.allows_multiple_answers;
    return this.callBotApi('sendPoll', body);
  }

  private async stopPoll(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.chat_id || args.message_id === undefined) return { content: [{ type: 'text', text: 'chat_id and message_id are required' }], isError: true };
    return this.callBotApi('stopPoll', { chat_id: args.chat_id, message_id: args.message_id });
  }

  private async answerCallbackQuery(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.callback_query_id) return { content: [{ type: 'text', text: 'callback_query_id is required' }], isError: true };
    const body: Record<string, unknown> = { callback_query_id: args.callback_query_id };
    if (args.text) body.text = args.text;
    if (typeof args.show_alert === 'boolean') body.show_alert = args.show_alert;
    return this.callBotApi('answerCallbackQuery', body);
  }

  private async banChatMember(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.chat_id || !args.user_id) return { content: [{ type: 'text', text: 'chat_id and user_id are required' }], isError: true };
    const body: Record<string, unknown> = { chat_id: args.chat_id, user_id: args.user_id };
    if (args.until_date !== undefined) body.until_date = args.until_date;
    if (typeof args.revoke_messages === 'boolean') body.revoke_messages = args.revoke_messages;
    return this.callBotApi('banChatMember', body);
  }

  private async unbanChatMember(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.chat_id || !args.user_id) return { content: [{ type: 'text', text: 'chat_id and user_id are required' }], isError: true };
    return this.callBotApi('unbanChatMember', { chat_id: args.chat_id, user_id: args.user_id, only_if_banned: true });
  }

  private async restrictChatMember(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.chat_id || !args.user_id || !args.permissions) return { content: [{ type: 'text', text: 'chat_id, user_id, and permissions are required' }], isError: true };
    const body: Record<string, unknown> = { chat_id: args.chat_id, user_id: args.user_id, permissions: args.permissions };
    if (args.until_date !== undefined) body.until_date = args.until_date;
    return this.callBotApi('restrictChatMember', body);
  }
}

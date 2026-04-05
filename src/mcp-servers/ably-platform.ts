/**
 * Ably Platform API MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// No official Ably Platform (REST) API MCP server was found on GitHub. We build a full REST
// wrapper for complete platform API coverage.
//
// Base URL: https://rest.ably.io
// Auth: HTTP Basic Auth (API key as username, no password) OR HTTP Bearer token (JWT/token auth)
// Docs: https://ably.com/documentation/rest-api
// Spec: https://api.apis.guru/v2/specs/ably.io/platform/1.1.0/openapi.json
// Category: communication
// Rate limits: See Ably plan limits — varies by account tier

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface AblyPlatformConfig {
  /** Ably API key in format "appId.keyId:keySecret" — used for Basic auth */
  apiKey?: string;
  /** Ably token or JWT string — used for Bearer auth (preferred for client-side) */
  token?: string;
  baseUrl?: string;
}

export class AblyPlatformMCPServer extends MCPAdapterBase {
  private readonly apiKey?: string;
  private readonly token?: string;
  private readonly baseUrl: string;

  constructor(config: AblyPlatformConfig) {
    super();
    if (!config.apiKey && !config.token) {
      throw new Error('AblyPlatformMCPServer requires either apiKey or token');
    }
    this.apiKey  = config.apiKey;
    this.token   = config.token;
    this.baseUrl = config.baseUrl || 'https://rest.ably.io';
  }

  static catalog() {
    return {
      name: 'ably-platform',
      displayName: 'Ably Platform API',
      version: '1.0.0',
      category: 'communication',
      keywords: [
        'ably', 'realtime', 'pubsub', 'messaging', 'channel', 'presence',
        'message history', 'push notifications', 'device registration',
        'publish', 'subscribe', 'token', 'stats', 'time', 'rest api',
      ],
      toolNames: [
        'get_time',
        'get_stats',
        'get_channels',
        'get_channel',
        'get_channel_messages',
        'publish_message',
        'get_channel_presence',
        'get_channel_presence_history',
        'request_access_token',
        'get_push_device_registrations',
        'register_push_device',
        'get_push_device',
        'update_push_device',
        'patch_push_device',
        'unregister_push_device',
        'unregister_all_push_devices',
        'reset_push_device_update_token',
        'publish_push_notification',
        'get_push_channel_subscriptions',
        'subscribe_push_device_to_channel',
        'delete_push_device_subscription',
        'get_push_channels_with_subscribers',
      ],
      description: 'Ably Platform REST API: publish messages, query channel history and presence, manage push device registrations and subscriptions, request tokens, and retrieve account stats.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      // ── Service ────────────────────────────────────────────────────────────
      {
        name: 'get_time',
        description: 'Get the current Ably service time as a Unix timestamp in milliseconds — useful for clock synchronization',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_stats',
        description: 'Retrieve usage statistics for the Ably application — message counts, connection counts, and data transfer by time period',
        inputSchema: {
          type: 'object',
          properties: {
            start: {
              type: 'number',
              description: 'Start of query interval as Unix timestamp in milliseconds',
            },
            end: {
              type: 'number',
              description: 'End of query interval as Unix timestamp in milliseconds (default: now)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of records to return (default: 100, max: 1000)',
            },
            direction: {
              type: 'string',
              description: 'Direction to page through records: forwards or backwards (default: backwards)',
            },
            unit: {
              type: 'string',
              description: 'Time unit for stats aggregation: minute, hour, day, or month (default: minute)',
            },
          },
        },
      },
      // ── Channels ───────────────────────────────────────────────────────────
      {
        name: 'get_channels',
        description: 'Enumerate all active channels in the application with optional prefix filter and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of channels to return (default: 100)',
            },
            prefix: {
              type: 'string',
              description: 'Filter channels by name prefix (e.g. "chat:" returns only chat:* channels)',
            },
            by: {
              type: 'string',
              description: 'Return channel metadata: id (names only) or value (full metadata). Default: id',
            },
          },
        },
      },
      {
        name: 'get_channel',
        description: 'Get metadata for a specific Ably channel by channel ID, including occupancy and status',
        inputSchema: {
          type: 'object',
          properties: {
            channel_id: {
              type: 'string',
              description: 'Ably channel name/ID to retrieve metadata for',
            },
          },
          required: ['channel_id'],
        },
      },
      // ── Messages ───────────────────────────────────────────────────────────
      {
        name: 'get_channel_messages',
        description: 'Retrieve message history for a channel, with optional time range, limit, and direction filters',
        inputSchema: {
          type: 'object',
          properties: {
            channel_id: {
              type: 'string',
              description: 'Ably channel name to retrieve message history from',
            },
            start: {
              type: 'number',
              description: 'Start of time range as Unix timestamp in milliseconds',
            },
            end: {
              type: 'number',
              description: 'End of time range as Unix timestamp in milliseconds (default: now)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of messages to return (default: 100, max: 1000)',
            },
            direction: {
              type: 'string',
              description: 'Page direction: forwards or backwards through history (default: backwards)',
            },
          },
          required: ['channel_id'],
        },
      },
      {
        name: 'publish_message',
        description: 'Publish one or more messages to an Ably channel — supports single message object or array for batch publish',
        inputSchema: {
          type: 'object',
          properties: {
            channel_id: {
              type: 'string',
              description: 'Ably channel name to publish the message(s) to',
            },
            name: {
              type: 'string',
              description: 'Event name for the message (e.g. "update", "chat", "alert")',
            },
            data: {
              description: 'Message payload — can be a string, number, object, or array',
            },
            messages: {
              type: 'array',
              description: 'Array of message objects for batch publish. Each item should have name and data fields. If provided, name/data are ignored.',
              items: { type: 'object' },
            },
          },
          required: ['channel_id'],
        },
      },
      // ── Presence ───────────────────────────────────────────────────────────
      {
        name: 'get_channel_presence',
        description: 'Get the current presence set for a channel — the list of clients currently present with their client IDs and data',
        inputSchema: {
          type: 'object',
          properties: {
            channel_id: {
              type: 'string',
              description: 'Ably channel name to get presence for',
            },
            clientId: {
              type: 'string',
              description: 'Filter presence results to a specific client ID',
            },
            connectionId: {
              type: 'string',
              description: 'Filter presence results to a specific connection ID',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of presence members to return (default: 100)',
            },
          },
          required: ['channel_id'],
        },
      },
      {
        name: 'get_channel_presence_history',
        description: 'Retrieve presence event history for a channel — enter, leave, and update events with optional time range and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            channel_id: {
              type: 'string',
              description: 'Ably channel name to retrieve presence history from',
            },
            start: {
              type: 'number',
              description: 'Start of time range as Unix timestamp in milliseconds',
            },
            end: {
              type: 'number',
              description: 'End of time range as Unix timestamp in milliseconds (default: now)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of presence events to return (default: 100, max: 1000)',
            },
            direction: {
              type: 'string',
              description: 'Page direction: forwards or backwards (default: backwards)',
            },
          },
          required: ['channel_id'],
        },
      },
      // ── Token Auth ─────────────────────────────────────────────────────────
      {
        name: 'request_access_token',
        description: 'Request a short-lived Ably access token for a named API key — use to issue tokens to client-side applications without exposing the API key secret',
        inputSchema: {
          type: 'object',
          properties: {
            key_name: {
              type: 'string',
              description: 'Ably API key name in format "appId.keyId" (without the secret)',
            },
            ttl: {
              type: 'number',
              description: 'Token time-to-live in milliseconds (default: 3600000 = 1 hour)',
            },
            capability: {
              type: 'object',
              description: 'Capability object restricting what the token can do (e.g. {"chat:*": ["subscribe","publish"]})',
            },
            clientId: {
              type: 'string',
              description: 'Client ID to embed in the token — restricts the token to a single client',
            },
          },
          required: ['key_name'],
        },
      },
      // ── Push: Device Registrations ─────────────────────────────────────────
      {
        name: 'get_push_device_registrations',
        description: 'List devices registered for receiving push notifications, with optional filters by device ID or client ID',
        inputSchema: {
          type: 'object',
          properties: {
            deviceId: {
              type: 'string',
              description: 'Filter results to a specific device ID',
            },
            clientId: {
              type: 'string',
              description: 'Filter results to devices registered for a specific client ID',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of device registrations to return (default: 100)',
            },
          },
        },
      },
      {
        name: 'register_push_device',
        description: 'Register a new device for push notifications — supports APNs (iOS), FCM (Android), and web push',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Unique device ID (generated by the device, e.g. UUID)',
            },
            clientId: {
              type: 'string',
              description: 'Client ID to associate with this device registration',
            },
            platform: {
              type: 'string',
              description: 'Device platform: ios, android, or browser',
            },
            formFactor: {
              type: 'string',
              description: 'Device form factor: phone, tablet, desktop, tv, watch, car, or embedded',
            },
            push: {
              type: 'object',
              description: 'Push transport configuration — contains recipient object with transportType and device token/registration ID',
            },
          },
          required: ['id', 'platform', 'formFactor', 'push'],
        },
      },
      {
        name: 'get_push_device',
        description: 'Get the push notification registration details for a specific device by device ID',
        inputSchema: {
          type: 'object',
          properties: {
            device_id: {
              type: 'string',
              description: 'Device ID to retrieve registration details for',
            },
          },
          required: ['device_id'],
        },
      },
      {
        name: 'update_push_device',
        description: 'Replace (PUT) the full registration record for a push-enabled device by device ID',
        inputSchema: {
          type: 'object',
          properties: {
            device_id: {
              type: 'string',
              description: 'Device ID to update',
            },
            clientId: {
              type: 'string',
              description: 'Updated client ID associated with this device',
            },
            platform: {
              type: 'string',
              description: 'Device platform: ios, android, or browser',
            },
            formFactor: {
              type: 'string',
              description: 'Device form factor: phone, tablet, desktop, tv, watch, car, or embedded',
            },
            push: {
              type: 'object',
              description: 'Updated push transport configuration',
            },
          },
          required: ['device_id', 'platform', 'formFactor', 'push'],
        },
      },
      {
        name: 'patch_push_device',
        description: 'Partially update (PATCH) specific fields of a push-enabled device registration by device ID',
        inputSchema: {
          type: 'object',
          properties: {
            device_id: {
              type: 'string',
              description: 'Device ID to partially update',
            },
            clientId: {
              type: 'string',
              description: 'Updated client ID',
            },
            push: {
              type: 'object',
              description: 'Updated push transport configuration (only fields provided are changed)',
            },
          },
          required: ['device_id'],
        },
      },
      {
        name: 'unregister_push_device',
        description: 'Unregister a single device from push notifications — the device will no longer receive push alerts',
        inputSchema: {
          type: 'object',
          properties: {
            device_id: {
              type: 'string',
              description: 'Device ID to unregister',
            },
          },
          required: ['device_id'],
        },
      },
      {
        name: 'unregister_all_push_devices',
        description: 'Unregister all devices matching the given device ID or client ID filter from push notifications',
        inputSchema: {
          type: 'object',
          properties: {
            deviceId: {
              type: 'string',
              description: 'Unregister all devices with this device ID',
            },
            clientId: {
              type: 'string',
              description: 'Unregister all devices associated with this client ID',
            },
          },
        },
      },
      {
        name: 'reset_push_device_update_token',
        description: "Reset the update token for a registered push device — use when a device's update token has been lost or compromised",
        inputSchema: {
          type: 'object',
          properties: {
            device_id: {
              type: 'string',
              description: 'Device ID whose update token should be reset',
            },
          },
          required: ['device_id'],
        },
      },
      // ── Push: Publish ──────────────────────────────────────────────────────
      {
        name: 'publish_push_notification',
        description: 'Publish a push notification directly to one or more devices or client IDs via APNs, FCM, or web push',
        inputSchema: {
          type: 'object',
          properties: {
            recipient: {
              type: 'object',
              description: 'Push recipient — deviceId, clientId, or direct transport details (apnsDeviceToken, fcmRegistrationToken, etc.)',
            },
            notification: {
              type: 'object',
              description: 'Push notification payload — title, body, icon, sound, badge count, etc.',
            },
            data: {
              type: 'object',
              description: 'Custom data payload to include with the push notification',
            },
          },
          required: ['recipient'],
        },
      },
      // ── Push: Channel Subscriptions ────────────────────────────────────────
      {
        name: 'get_push_channel_subscriptions',
        description: 'List channel subscriptions for push-enabled devices — shows which devices or clients are subscribed to receive push notifications for each channel',
        inputSchema: {
          type: 'object',
          properties: {
            channel: {
              type: 'string',
              description: 'Filter results to subscriptions for a specific channel name',
            },
            deviceId: {
              type: 'string',
              description: 'Filter results to subscriptions for a specific device ID',
            },
            clientId: {
              type: 'string',
              description: 'Filter results to subscriptions for a specific client ID',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of subscriptions to return (default: 100)',
            },
          },
        },
      },
      {
        name: 'subscribe_push_device_to_channel',
        description: 'Subscribe a push-enabled device or client to receive push notifications when messages are published to a channel',
        inputSchema: {
          type: 'object',
          properties: {
            channel: {
              type: 'string',
              description: 'Channel name to subscribe the device to',
            },
            deviceId: {
              type: 'string',
              description: 'Device ID to subscribe (provide either deviceId or clientId, not both)',
            },
            clientId: {
              type: 'string',
              description: 'Client ID to subscribe — subscribes all devices associated with this client',
            },
          },
          required: ['channel'],
        },
      },
      {
        name: 'delete_push_device_subscription',
        description: "Delete a device's or client's push channel subscription — the device will stop receiving push notifications for the specified channel",
        inputSchema: {
          type: 'object',
          properties: {
            channel: {
              type: 'string',
              description: 'Channel name to remove the subscription from',
            },
            deviceId: {
              type: 'string',
              description: 'Device ID whose subscription to remove',
            },
            clientId: {
              type: 'string',
              description: 'Client ID whose subscription to remove',
            },
          },
          required: ['channel'],
        },
      },
      {
        name: 'get_push_channels_with_subscribers',
        description: 'List all channels that have at least one push-subscribed device or client',
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
        case 'get_time':                         return this.getTime();
        case 'get_stats':                        return this.getStats(args);
        case 'get_channels':                     return this.getChannels(args);
        case 'get_channel':                      return this.getChannel(args);
        case 'get_channel_messages':             return this.getChannelMessages(args);
        case 'publish_message':                  return this.publishMessage(args);
        case 'get_channel_presence':             return this.getChannelPresence(args);
        case 'get_channel_presence_history':     return this.getChannelPresenceHistory(args);
        case 'request_access_token':             return this.requestAccessToken(args);
        case 'get_push_device_registrations':    return this.getPushDeviceRegistrations(args);
        case 'register_push_device':             return this.registerPushDevice(args);
        case 'get_push_device':                  return this.getPushDevice(args);
        case 'update_push_device':               return this.updatePushDevice(args);
        case 'patch_push_device':                return this.patchPushDevice(args);
        case 'unregister_push_device':           return this.unregisterPushDevice(args);
        case 'unregister_all_push_devices':      return this.unregisterAllPushDevices(args);
        case 'reset_push_device_update_token':   return this.resetPushDeviceUpdateToken(args);
        case 'publish_push_notification':        return this.publishPushNotification(args);
        case 'get_push_channel_subscriptions':   return this.getPushChannelSubscriptions(args);
        case 'subscribe_push_device_to_channel': return this.subscribePushDeviceToChannel(args);
        case 'delete_push_device_subscription':  return this.deletePushDeviceSubscription(args);
        case 'get_push_channels_with_subscribers': return this.getPushChannelsWithSubscribers();
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
    if (this.token) {
      return `Bearer ${this.token}`;
    }
    // Basic auth: base64(apiKey) where apiKey = "appId.keyId:keySecret"
    const encoded = Buffer.from(this.apiKey as string).toString('base64');
    return `Basic ${encoded}`;
  }

  private async request(
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    path: string,
    params?: Record<string, string>,
    body?: unknown,
  ): Promise<ToolResult> {
    let url = `${this.baseUrl}${path}`;
    if (params && Object.keys(params).length > 0) {
      url += '?' + new URLSearchParams(params).toString();
    }
    const init: RequestInit = {
      method,
      headers: {
        Authorization: this.authHeader,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    };
    if (body !== undefined) init.body = JSON.stringify(body);
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

  // ── Service ────────────────────────────────────────────────────────────────

  private async getTime(): Promise<ToolResult> {
    return this.request('GET', '/time');
  }

  private async getStats(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (args.start)     params.start     = String(args.start);
    if (args.end)       params.end       = String(args.end);
    if (args.limit)     params.limit     = String(args.limit);
    if (args.direction) params.direction = args.direction as string;
    if (args.unit)      params.unit      = args.unit as string;
    return this.request('GET', '/stats', params);
  }

  // ── Channels ───────────────────────────────────────────────────────────────

  private async getChannels(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (args.limit)  params.limit  = String(args.limit);
    if (args.prefix) params.prefix = args.prefix as string;
    if (args.by)     params.by     = args.by as string;
    return this.request('GET', '/channels', params);
  }

  private async getChannel(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.channel_id) return { content: [{ type: 'text', text: 'channel_id is required' }], isError: true };
    return this.request('GET', `/channels/${encodeURIComponent(args.channel_id as string)}`);
  }

  // ── Messages ───────────────────────────────────────────────────────────────

  private async getChannelMessages(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.channel_id) return { content: [{ type: 'text', text: 'channel_id is required' }], isError: true };
    const params: Record<string, string> = {};
    if (args.start)     params.start     = String(args.start);
    if (args.end)       params.end       = String(args.end);
    if (args.limit)     params.limit     = String(args.limit);
    if (args.direction) params.direction = args.direction as string;
    return this.request('GET', `/channels/${encodeURIComponent(args.channel_id as string)}/messages`, params);
  }

  private async publishMessage(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.channel_id) return { content: [{ type: 'text', text: 'channel_id is required' }], isError: true };
    let body: unknown;
    if (args.messages) {
      body = args.messages;
    } else {
      const msg: Record<string, unknown> = {};
      if (args.name !== undefined) msg.name = args.name;
      if (args.data !== undefined) msg.data = args.data;
      body = msg;
    }
    return this.request('POST', `/channels/${encodeURIComponent(args.channel_id as string)}/messages`, undefined, body);
  }

  // ── Presence ───────────────────────────────────────────────────────────────

  private async getChannelPresence(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.channel_id) return { content: [{ type: 'text', text: 'channel_id is required' }], isError: true };
    const params: Record<string, string> = {};
    if (args.clientId)     params.clientId     = args.clientId as string;
    if (args.connectionId) params.connectionId = args.connectionId as string;
    if (args.limit)        params.limit        = String(args.limit);
    return this.request('GET', `/channels/${encodeURIComponent(args.channel_id as string)}/presence`, params);
  }

  private async getChannelPresenceHistory(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.channel_id) return { content: [{ type: 'text', text: 'channel_id is required' }], isError: true };
    const params: Record<string, string> = {};
    if (args.start)     params.start     = String(args.start);
    if (args.end)       params.end       = String(args.end);
    if (args.limit)     params.limit     = String(args.limit);
    if (args.direction) params.direction = args.direction as string;
    return this.request('GET', `/channels/${encodeURIComponent(args.channel_id as string)}/presence/history`, params);
  }

  // ── Token Auth ─────────────────────────────────────────────────────────────

  private async requestAccessToken(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.key_name) return { content: [{ type: 'text', text: 'key_name is required' }], isError: true };
    const { key_name, ...body } = args;
    return this.request('POST', `/keys/${encodeURIComponent(key_name as string)}/requestToken`, undefined, body);
  }

  // ── Push: Device Registrations ─────────────────────────────────────────────

  private async getPushDeviceRegistrations(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (args.deviceId) params.deviceId = args.deviceId as string;
    if (args.clientId) params.clientId = args.clientId as string;
    if (args.limit)    params.limit    = String(args.limit);
    return this.request('GET', '/push/deviceRegistrations', params);
  }

  private async registerPushDevice(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id || !args.platform || !args.formFactor || !args.push) {
      return { content: [{ type: 'text', text: 'id, platform, formFactor, and push are required' }], isError: true };
    }
    return this.request('POST', '/push/deviceRegistrations', undefined, args);
  }

  private async getPushDevice(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.device_id) return { content: [{ type: 'text', text: 'device_id is required' }], isError: true };
    return this.request('GET', `/push/deviceRegistrations/${encodeURIComponent(args.device_id as string)}`);
  }

  private async updatePushDevice(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.device_id) return { content: [{ type: 'text', text: 'device_id is required' }], isError: true };
    const { device_id, ...body } = args;
    return this.request('PUT', `/push/deviceRegistrations/${encodeURIComponent(device_id as string)}`, undefined, body);
  }

  private async patchPushDevice(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.device_id) return { content: [{ type: 'text', text: 'device_id is required' }], isError: true };
    const { device_id, ...body } = args;
    return this.request('PATCH', `/push/deviceRegistrations/${encodeURIComponent(device_id as string)}`, undefined, body);
  }

  private async unregisterPushDevice(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.device_id) return { content: [{ type: 'text', text: 'device_id is required' }], isError: true };
    return this.request('DELETE', `/push/deviceRegistrations/${encodeURIComponent(args.device_id as string)}`);
  }

  private async unregisterAllPushDevices(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (args.deviceId) params.deviceId = args.deviceId as string;
    if (args.clientId) params.clientId = args.clientId as string;
    return this.request('DELETE', '/push/deviceRegistrations', params);
  }

  private async resetPushDeviceUpdateToken(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.device_id) return { content: [{ type: 'text', text: 'device_id is required' }], isError: true };
    return this.request('GET', `/push/deviceRegistrations/${encodeURIComponent(args.device_id as string)}/resetUpdateToken`);
  }

  // ── Push: Publish ──────────────────────────────────────────────────────────

  private async publishPushNotification(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.recipient) return { content: [{ type: 'text', text: 'recipient is required' }], isError: true };
    return this.request('POST', '/push/publish', undefined, args);
  }

  // ── Push: Channel Subscriptions ────────────────────────────────────────────

  private async getPushChannelSubscriptions(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (args.channel)  params.channel  = args.channel as string;
    if (args.deviceId) params.deviceId = args.deviceId as string;
    if (args.clientId) params.clientId = args.clientId as string;
    if (args.limit)    params.limit    = String(args.limit);
    return this.request('GET', '/push/channelSubscriptions', params);
  }

  private async subscribePushDeviceToChannel(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.channel) return { content: [{ type: 'text', text: 'channel is required' }], isError: true };
    return this.request('POST', '/push/channelSubscriptions', undefined, args);
  }

  private async deletePushDeviceSubscription(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.channel) return { content: [{ type: 'text', text: 'channel is required' }], isError: true };
    const params: Record<string, string> = { channel: args.channel as string };
    if (args.deviceId) params.deviceId = args.deviceId as string;
    if (args.clientId) params.clientId = args.clientId as string;
    return this.request('DELETE', '/push/channelSubscriptions', params);
  }

  private async getPushChannelsWithSubscribers(): Promise<ToolResult> {
    return this.request('GET', '/push/channels');
  }
}

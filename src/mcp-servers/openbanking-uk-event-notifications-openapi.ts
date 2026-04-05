/**
 * Open Banking UK Event Notification API MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Base URL: https://openbanking.org.uk/open-banking/v3.1
// Auth: Bearer token (OAuth2) via Authorization header; x-fapi-financial-id required for most endpoints
// Spec: https://api.apis.guru/v2/specs/openbanking.org.uk/event-notifications-openapi/3.1.7/openapi.json
// Docs: https://openbankinguk.github.io/read-write-api-site3/v3.1.7/profiles/event-notification-api-profile.html
// Standard: Open Banking UK Read/Write API Specification v3.1.7 — TPP Endpoints
// Rate limits: Determined by individual ASPSP (bank) implementations
//
// The Event Notification API supports two flows:
//   1. Push notifications: ASPSP POSTs JWT events to TPP callback URI
//   2. Aggregated polling: TPP polls ASPSP for events (OB_3_0 EventSubscription pattern)
// This adapter covers both: the inbound notification endpoint (TPP side)
// and the full EventSubscription management API.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface OpenBankingUKEventNotificationsConfig {
  bearerToken: string;
  baseUrl?: string;
  financialId?: string;
}

export class OpenBankingUkEventNotificationsOpenapiMCPServer extends MCPAdapterBase {
  private readonly bearerToken: string;
  private readonly baseUrl: string;
  private readonly financialId: string;

  constructor(config: OpenBankingUKEventNotificationsConfig) {
    super();
    this.bearerToken = config.bearerToken;
    this.baseUrl = config.baseUrl || 'https://openbanking.org.uk/open-banking/v3.1';
    this.financialId = config.financialId || '';
  }

  static catalog() {
    return {
      name: 'openbanking-uk-event-notifications-openapi',
      displayName: 'Open Banking UK Event Notification API',
      version: '1.0.0',
      category: 'finance',
      keywords: [
        'open banking', 'uk', 'united kingdom', 'event notification', 'webhook',
        'callback', 'push notification', 'aggregated polling', 'event subscription',
        'resource update', 'aspsp', 'tpp', 'psd2', 'fca',
        'jwt', 'security event token', 'set', 'real time notification',
        'payment notification', 'account notification', 'ob read write api',
      ],
      toolNames: [
        'send_event_notification',
        'create_callback_url',
        'get_callback_urls',
        'update_callback_url',
        'delete_callback_url',
        'create_event_subscription',
        'get_event_subscriptions',
        'update_event_subscription',
        'delete_event_subscription',
        'poll_events',
        'acknowledge_events',
      ],
      description: 'Open Banking UK Event Notification API v3.1.7: manage TPP callback URLs, event subscriptions, send event notifications (JWT), and poll/acknowledge aggregated events from ASPSPs.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      // ── Push Notifications ─────────────────────────────────────────────────
      {
        name: 'send_event_notification',
        description: 'Send an event notification JWT to the TPP endpoint. Used by ASPSPs to push resource-update events (e.g. payment status change) to the TPP callback URI. The body must be a base64-encoded JWT (Security Event Token).',
        inputSchema: {
          type: 'object',
          properties: {
            jwtToken: {
              type: 'string',
              description: 'Base64-encoded JWT Security Event Token (SET) containing the event notification payload',
            },
            financialId: {
              type: 'string',
              description: 'Override the x-fapi-financial-id header for this request (optional)',
            },
          },
          required: ['jwtToken'],
        },
      },
      // ── Callback URL Management ────────────────────────────────────────────
      {
        name: 'create_callback_url',
        description: 'Register a callback URL with the ASPSP so that push event notifications are delivered to the TPP. Each TPP may register one callback URL per ASPSP.',
        inputSchema: {
          type: 'object',
          properties: {
            url: {
              type: 'string',
              description: 'The HTTPS callback URL where the ASPSP will POST event notifications (e.g. "https://tpp.example.com/open-banking/v3.1/event-notifications")',
            },
            version: {
              type: 'string',
              description: 'The Open Banking specification version for callbacks (e.g. "3.1")',
            },
          },
          required: ['url', 'version'],
        },
      },
      {
        name: 'get_callback_urls',
        description: 'Retrieve all callback URLs registered by the TPP with this ASPSP.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'update_callback_url',
        description: 'Update a previously registered callback URL. Replaces the URL and/or version for the specified CallbackUrlId.',
        inputSchema: {
          type: 'object',
          properties: {
            callbackUrlId: {
              type: 'string',
              description: 'The CallbackUrlId of the registered callback URL to update',
            },
            url: {
              type: 'string',
              description: 'The new HTTPS callback URL',
            },
            version: {
              type: 'string',
              description: 'The Open Banking specification version (e.g. "3.1")',
            },
          },
          required: ['callbackUrlId', 'url', 'version'],
        },
      },
      {
        name: 'delete_callback_url',
        description: 'Delete a registered callback URL by CallbackUrlId. The ASPSP will no longer push notifications to the deleted URL.',
        inputSchema: {
          type: 'object',
          properties: {
            callbackUrlId: {
              type: 'string',
              description: 'The CallbackUrlId of the callback URL to delete',
            },
          },
          required: ['callbackUrlId'],
        },
      },
      // ── Event Subscriptions ────────────────────────────────────────────────
      {
        name: 'create_event_subscription',
        description: 'Create an event subscription to specify which event types the TPP wants to receive. Supports both aggregated polling and push notification subscriptions.',
        inputSchema: {
          type: 'object',
          properties: {
            version: {
              type: 'string',
              description: 'The Open Banking specification version (e.g. "3.1")',
            },
            callbackUrl: {
              type: 'string',
              description: 'Callback URL for push notifications (optional — omit to use aggregated polling only)',
            },
            eventTypes: {
              type: 'array',
              description: 'Array of event type URNs to subscribe to (e.g. ["urn:uk:org:openbanking:events:resource-update", "urn:uk:org:openbanking:events:consent-authorization-revoked"]). Omit to subscribe to all event types.',
            },
          },
          required: ['version'],
        },
      },
      {
        name: 'get_event_subscriptions',
        description: 'Retrieve all event subscriptions registered by the TPP with this ASPSP.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'update_event_subscription',
        description: 'Update an existing event subscription — change the callback URL, version, or subscribed event types.',
        inputSchema: {
          type: 'object',
          properties: {
            eventSubscriptionId: {
              type: 'string',
              description: 'The EventSubscriptionId to update',
            },
            version: {
              type: 'string',
              description: 'The Open Banking specification version',
            },
            callbackUrl: {
              type: 'string',
              description: 'New callback URL (optional)',
            },
            eventTypes: {
              type: 'array',
              description: 'Updated array of event type URNs (optional — omit to keep existing)',
            },
          },
          required: ['eventSubscriptionId', 'version'],
        },
      },
      {
        name: 'delete_event_subscription',
        description: 'Delete an event subscription by EventSubscriptionId. The TPP will no longer receive events of the subscribed types.',
        inputSchema: {
          type: 'object',
          properties: {
            eventSubscriptionId: {
              type: 'string',
              description: 'The EventSubscriptionId to delete',
            },
          },
          required: ['eventSubscriptionId'],
        },
      },
      // ── Aggregated Polling ─────────────────────────────────────────────────
      {
        name: 'poll_events',
        description: 'Poll the ASPSP for pending event notifications using the aggregated polling model. Returns Security Event Tokens (JWTs) for each pending event.',
        inputSchema: {
          type: 'object',
          properties: {
            returnImmediately: {
              type: 'boolean',
              description: 'If true, return immediately even if no events are available (default: true). If false, long-poll until events arrive or timeout.',
            },
            maxEvents: {
              type: 'number',
              description: 'Maximum number of event notifications to return per poll (default: 10, max typically 100)',
            },
            acknowledgeIds: {
              type: 'array',
              description: 'Array of jti (JWT ID) values to acknowledge as successfully processed before retrieving new events',
            },
          },
          required: [],
        },
      },
      {
        name: 'acknowledge_events',
        description: 'Acknowledge that event notifications have been successfully received and processed. Acknowledged events are removed from the ASPSP queue.',
        inputSchema: {
          type: 'object',
          properties: {
            acknowledgeIds: {
              type: 'array',
              description: 'Array of jti (JWT ID) values of events to acknowledge',
            },
            setErrors: {
              type: 'object',
              description: 'Optional map of jti to error object for events that could not be processed (allows ASPSP to retry or flag failed deliveries)',
            },
          },
          required: ['acknowledgeIds'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'send_event_notification':   return this.sendEventNotification(args);
        case 'create_callback_url':       return this.createCallbackUrl(args);
        case 'get_callback_urls':         return this.getCallbackUrls();
        case 'update_callback_url':       return this.updateCallbackUrl(args);
        case 'delete_callback_url':       return this.deleteCallbackUrl(args);
        case 'create_event_subscription': return this.createEventSubscription(args);
        case 'get_event_subscriptions':   return this.getEventSubscriptions();
        case 'update_event_subscription': return this.updateEventSubscription(args);
        case 'delete_event_subscription': return this.deleteEventSubscription(args);
        case 'poll_events':               return this.pollEvents(args);
        case 'acknowledge_events':        return this.acknowledgeEvents(args);
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

  private async request(
    method: string,
    path: string,
    body?: unknown,
    contentType?: string,
  ): Promise<ToolResult> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.bearerToken}`,
      'Accept': 'application/json',
      'x-fapi-interaction-id': crypto.randomUUID(),
    };
    if (this.financialId) headers['x-fapi-financial-id'] = this.financialId;
    if (body !== undefined) {
      headers['Content-Type'] = contentType ?? 'application/json';
    }

    const response = await this.fetchWithRetry(url, {
      method,
      headers,
      body: body !== undefined
        ? (contentType === 'application/jwt' ? String(body) : JSON.stringify(body))
        : undefined,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      return {
        content: [{ type: 'text', text: `API error ${response.status} ${response.statusText}: ${text.slice(0, 500)}` }],
        isError: true,
      };
    }

    if (response.status === 202 || response.status === 204) {
      return { content: [{ type: 'text', text: 'Success (accepted)' }], isError: false };
    }

    const data = await response.json() as unknown;
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  // ── Push Notification methods ──────────────────────────────────────────────

  private async sendEventNotification(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.jwtToken) return { content: [{ type: 'text', text: 'jwtToken is required' }], isError: true };
    const fid = (args.financialId as string) || this.financialId;
    const url = `${this.baseUrl}/event-notifications`;
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.bearerToken}`,
      'Content-Type': 'application/jwt',
      'x-fapi-interaction-id': crypto.randomUUID(),
    };
    if (fid) headers['x-fapi-financial-id'] = fid;

    const response = await this.fetchWithRetry(url, {
      method: 'POST',
      headers,
      body: String(args.jwtToken),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      return {
        content: [{ type: 'text', text: `API error ${response.status} ${response.statusText}: ${text.slice(0, 500)}` }],
        isError: true,
      };
    }
    return { content: [{ type: 'text', text: 'Event notification accepted (202)' }], isError: false };
  }

  // ── Callback URL methods ───────────────────────────────────────────────────

  private async createCallbackUrl(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.url)     return { content: [{ type: 'text', text: 'url is required' }], isError: true };
    if (!args.version) return { content: [{ type: 'text', text: 'version is required' }], isError: true };
    return this.request('POST', '/callback-urls', {
      Data: { Url: args.url, Version: args.version },
    });
  }

  private async getCallbackUrls(): Promise<ToolResult> {
    return this.request('GET', '/callback-urls');
  }

  private async updateCallbackUrl(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.callbackUrlId) return { content: [{ type: 'text', text: 'callbackUrlId is required' }], isError: true };
    if (!args.url)           return { content: [{ type: 'text', text: 'url is required' }], isError: true };
    if (!args.version)       return { content: [{ type: 'text', text: 'version is required' }], isError: true };
    return this.request('PUT', `/callback-urls/${args.callbackUrlId}`, {
      Data: { Url: args.url, Version: args.version },
    });
  }

  private async deleteCallbackUrl(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.callbackUrlId) return { content: [{ type: 'text', text: 'callbackUrlId is required' }], isError: true };
    return this.request('DELETE', `/callback-urls/${args.callbackUrlId}`);
  }

  // ── Event Subscription methods ─────────────────────────────────────────────

  private async createEventSubscription(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.version) return { content: [{ type: 'text', text: 'version is required' }], isError: true };
    const data: Record<string, unknown> = { Version: args.version };
    if (args.callbackUrl) data['CallbackUrl'] = args.callbackUrl;
    if (Array.isArray(args.eventTypes) && args.eventTypes.length > 0) {
      data['EventTypes'] = args.eventTypes;
    }
    return this.request('POST', '/event-subscriptions', { Data: data });
  }

  private async getEventSubscriptions(): Promise<ToolResult> {
    return this.request('GET', '/event-subscriptions');
  }

  private async updateEventSubscription(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.eventSubscriptionId) return { content: [{ type: 'text', text: 'eventSubscriptionId is required' }], isError: true };
    if (!args.version)             return { content: [{ type: 'text', text: 'version is required' }], isError: true };
    const data: Record<string, unknown> = { Version: args.version };
    if (args.callbackUrl) data['CallbackUrl'] = args.callbackUrl;
    if (Array.isArray(args.eventTypes)) data['EventTypes'] = args.eventTypes;
    return this.request('PUT', `/event-subscriptions/${args.eventSubscriptionId}`, { Data: data });
  }

  private async deleteEventSubscription(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.eventSubscriptionId) return { content: [{ type: 'text', text: 'eventSubscriptionId is required' }], isError: true };
    return this.request('DELETE', `/event-subscriptions/${args.eventSubscriptionId}`);
  }

  // ── Aggregated Polling methods ─────────────────────────────────────────────

  private async pollEvents(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {
      returnImmediately: (args.returnImmediately as boolean) ?? true,
    };
    if (args.maxEvents)     body['maxEvents']    = args.maxEvents;
    if (Array.isArray(args.acknowledgeIds) && args.acknowledgeIds.length > 0) {
      body['ack'] = args.acknowledgeIds;
    }
    return this.request('POST', '/events', body);
  }

  private async acknowledgeEvents(args: Record<string, unknown>): Promise<ToolResult> {
    if (!Array.isArray(args.acknowledgeIds) || args.acknowledgeIds.length === 0) {
      return { content: [{ type: 'text', text: 'acknowledgeIds array is required and must not be empty' }], isError: true };
    }
    const body: Record<string, unknown> = {
      ack: args.acknowledgeIds,
    };
    if (args.setErrors) body['setErrors'] = args.setErrors;
    return this.request('POST', '/events', body);
  }
}

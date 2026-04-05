/**
 * Segment MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28.
// No official Segment/Twilio MCP server for the Segment CDP product was found on GitHub.
//
// Base URLs:
//   Tracking API: https://api.segment.io/v1  (write key auth — Basic base64(writeKey:))
//   Public API:   https://api.segmentapis.com (Bearer token auth — workspace management)
// Auth:
//   Tracking calls use HTTP Basic with writeKey as username, empty password.
//   Public API calls use Bearer token (generate in Segment App → Settings → Access Management → Tokens).
// Docs:
//   Tracking API: https://segment.com/docs/connections/sources/catalog/libraries/server/http-api/
//   Public API:   https://docs.segmentapis.com/
// Rate limits:
//   Tracking API: No hard published limit; scale-based throttling applies.
//   Public API: 600 requests/min per workspace token.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface SegmentConfig {
  /** Write Key for the Segment source — required for all tracking calls (track, identify, group, page, screen, alias, batch). */
  writeKey: string;
  /** Public API Bearer token — required for workspace management tools (sources, destinations, tracking plans, warehouses, etc.).
   *  Generate in: Segment App → Settings → Access Management → Tokens. */
  publicApiToken?: string;
  /** Override ingestion base URL. Defaults to https://api.segment.io/v1 */
  ingestionBaseUrl?: string;
  /** Override Public API base URL. Defaults to https://api.segmentapis.com */
  publicApiBaseUrl?: string;
}

export class SegmentMCPServer extends MCPAdapterBase {
  private readonly writeKey: string;
  private readonly publicApiToken: string | undefined;
  private readonly ingestionBaseUrl: string;
  private readonly publicApiBaseUrl: string;

  constructor(config: SegmentConfig) {
    super();
    this.writeKey = config.writeKey;
    this.publicApiToken = config.publicApiToken;
    this.ingestionBaseUrl = config.ingestionBaseUrl ?? 'https://api.segment.io/v1';
    this.publicApiBaseUrl = config.publicApiBaseUrl ?? 'https://api.segmentapis.com';
  }

  private get writeKeyAuthHeader(): string {
    const encoded = Buffer.from(`${this.writeKey}:`).toString('base64');
    return `Basic ${encoded}`;
  }

  static catalog() {
    return {
      name: 'segment',
      displayName: 'Segment',
      version: '1.0.0',
      category: 'data' as const,
      keywords: [
        'segment', 'twilio', 'CDP', 'customer data platform', 'tracking', 'analytics',
        'identify', 'track', 'events', 'source', 'destination', 'warehouse', 'tracking plan',
        'profile', 'audience', 'pipeline',
      ],
      toolNames: [
        'track', 'identify', 'group', 'page', 'screen', 'alias', 'batch',
        'list_sources', 'get_source', 'create_source', 'update_source', 'delete_source',
        'list_destinations', 'get_destination', 'update_destination',
        'list_warehouses', 'get_warehouse',
        'list_tracking_plans', 'get_tracking_plan',
      ],
      description:
        'Send Segment tracking events (track, identify, group, page, screen, alias) and manage ' +
        'workspace resources including sources, destinations, warehouses, and tracking plans via the Public API.',
      author: 'protectnil' as const,
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'track',
        description:
          'Record a user action (custom event) via the Segment HTTP Tracking API. Requires event name and either userId or anonymousId.',
        inputSchema: {
          type: 'object',
          properties: {
            userId: {
              type: 'string',
              description: 'Unique identifier for the authenticated user',
            },
            anonymousId: {
              type: 'string',
              description: 'Unique identifier for an anonymous or pre-authentication user',
            },
            event: {
              type: 'string',
              description: 'Name of the action the user performed (e.g. "Order Completed")',
            },
            properties: {
              type: 'object',
              description:
                'Free-form dictionary of event properties (e.g. revenue, product name, category)',
            },
            timestamp: {
              type: 'string',
              description:
                'ISO 8601 timestamp for when the event occurred. Defaults to server time if omitted.',
            },
            context: {
              type: 'object',
              description:
                'Optional context object (e.g. { "ip": "...", "locale": "en-US", "page": { "url": "..." } })',
            },
            integrations: {
              type: 'object',
              description:
                'Selectively enable or disable specific downstream destinations for this call',
            },
          },
          required: ['event'],
        },
      },
      {
        name: 'identify',
        description:
          'Associate a user with their actions and record user traits (email, name, plan, etc.) via the Segment Tracking API.',
        inputSchema: {
          type: 'object',
          properties: {
            userId: {
              type: 'string',
              description: 'Unique identifier for the authenticated user',
            },
            anonymousId: {
              type: 'string',
              description: 'Unique identifier for an anonymous user',
            },
            traits: {
              type: 'object',
              description:
                'Dictionary of user traits (e.g. email, name, plan, createdAt, company)',
            },
            timestamp: {
              type: 'string',
              description: 'ISO 8601 timestamp. Defaults to server time if omitted.',
            },
            context: {
              type: 'object',
              description: 'Optional context object',
            },
          },
        },
      },
      {
        name: 'group',
        description:
          'Associate a user with a group (e.g. company or organization) and record group traits.',
        inputSchema: {
          type: 'object',
          properties: {
            userId: {
              type: 'string',
              description: 'Unique identifier for the user',
            },
            anonymousId: {
              type: 'string',
              description: 'Anonymous identifier if the user is not authenticated',
            },
            groupId: {
              type: 'string',
              description: 'Unique identifier for the group (e.g. company ID)',
            },
            traits: {
              type: 'object',
              description:
                'Dictionary of group traits (e.g. name, industry, employees, plan)',
            },
            timestamp: {
              type: 'string',
              description: 'ISO 8601 timestamp. Defaults to server time if omitted.',
            },
            context: {
              type: 'object',
              description: 'Optional context object',
            },
          },
          required: ['groupId'],
        },
      },
      {
        name: 'page',
        description:
          'Record a page view in a web application with optional page name and URL properties.',
        inputSchema: {
          type: 'object',
          properties: {
            userId: {
              type: 'string',
              description: 'Unique identifier for the authenticated user',
            },
            anonymousId: {
              type: 'string',
              description: 'Anonymous identifier',
            },
            name: {
              type: 'string',
              description: 'Name of the page (e.g. "Home", "Pricing", "Checkout")',
            },
            properties: {
              type: 'object',
              description: 'Properties of the page (e.g. url, title, referrer, path)',
            },
            timestamp: {
              type: 'string',
              description: 'ISO 8601 timestamp. Defaults to server time if omitted.',
            },
            context: {
              type: 'object',
              description: 'Optional context object',
            },
          },
        },
      },
      {
        name: 'screen',
        description:
          'Record a mobile screen view (equivalent of page for iOS/Android apps) with optional screen name and properties.',
        inputSchema: {
          type: 'object',
          properties: {
            userId: {
              type: 'string',
              description: 'Unique identifier for the authenticated user',
            },
            anonymousId: {
              type: 'string',
              description: 'Anonymous identifier',
            },
            name: {
              type: 'string',
              description: 'Name of the screen (e.g. "Home Feed", "Settings")',
            },
            properties: {
              type: 'object',
              description: 'Properties of the screen view',
            },
            timestamp: {
              type: 'string',
              description: 'ISO 8601 timestamp. Defaults to server time if omitted.',
            },
            context: {
              type: 'object',
              description: 'Optional context object',
            },
          },
        },
      },
      {
        name: 'alias',
        description:
          'Merge two user identities — link an anonymous ID to a known userId for cross-session identity resolution.',
        inputSchema: {
          type: 'object',
          properties: {
            userId: {
              type: 'string',
              description: 'The new canonical user ID (the identity to merge into)',
            },
            previousId: {
              type: 'string',
              description: 'The previous identity to merge from (anonymous ID or old userId)',
            },
            timestamp: {
              type: 'string',
              description: 'ISO 8601 timestamp. Defaults to server time if omitted.',
            },
            context: {
              type: 'object',
              description: 'Optional context object',
            },
          },
          required: ['userId', 'previousId'],
        },
      },
      {
        name: 'batch',
        description:
          'Send multiple Segment tracking calls in a single request (up to 500 KB total, max 2,500 events per batch, each event < 32 KB).',
        inputSchema: {
          type: 'object',
          properties: {
            batch: {
              type: 'array',
              description:
                'Array of Segment call objects. Each must have a "type" field (track, identify, group, page, screen, or alias) and the corresponding required fields.',
              items: { type: 'object' },
            },
            context: {
              type: 'object',
              description:
                'Optional top-level context applied to all events in the batch',
            },
          },
          required: ['batch'],
        },
      },
      {
        name: 'list_sources',
        description:
          'List all sources in the Segment workspace via the Public API. Requires publicApiToken.',
        inputSchema: {
          type: 'object',
          properties: {
            pagination_cursor: {
              type: 'string',
              description: 'Cursor from a previous response to fetch the next page',
            },
            pagination_count: {
              type: 'number',
              description: 'Number of sources per page (default: 10)',
            },
          },
        },
      },
      {
        name: 'get_source',
        description:
          'Get details and settings for a specific Segment source by source ID. Requires publicApiToken.',
        inputSchema: {
          type: 'object',
          properties: {
            source_id: {
              type: 'string',
              description: 'The Segment source ID',
            },
          },
          required: ['source_id'],
        },
      },
      {
        name: 'create_source',
        description:
          'Create a new Segment source in the workspace by slug and display name. Requires publicApiToken.',
        inputSchema: {
          type: 'object',
          properties: {
            slug: {
              type: 'string',
              description: 'URL-friendly slug for the new source (e.g. "my-web-app")',
            },
            metadata_id: {
              type: 'string',
              description:
                'Catalog metadata ID that defines the source type (e.g. "javascript" for a JS source)',
            },
            enabled: {
              type: 'boolean',
              description: 'Whether the source should be enabled immediately (default: true)',
            },
          },
          required: ['slug', 'metadata_id'],
        },
      },
      {
        name: 'update_source',
        description:
          'Update a Segment source — enable/disable it or update settings. Requires publicApiToken.',
        inputSchema: {
          type: 'object',
          properties: {
            source_id: {
              type: 'string',
              description: 'The Segment source ID to update',
            },
            enabled: {
              type: 'boolean',
              description: 'Enable or disable the source',
            },
            settings: {
              type: 'object',
              description: 'Source-specific settings to update',
            },
          },
          required: ['source_id'],
        },
      },
      {
        name: 'delete_source',
        description:
          'Delete a Segment source from the workspace by source ID. Requires publicApiToken.',
        inputSchema: {
          type: 'object',
          properties: {
            source_id: {
              type: 'string',
              description: 'The Segment source ID to delete',
            },
          },
          required: ['source_id'],
        },
      },
      {
        name: 'list_destinations',
        description:
          'List all destinations in the Segment workspace with pagination. Requires publicApiToken.',
        inputSchema: {
          type: 'object',
          properties: {
            pagination_cursor: {
              type: 'string',
              description: 'Cursor from a previous response to fetch the next page',
            },
            pagination_count: {
              type: 'number',
              description: 'Number of destinations per page (default: 10)',
            },
          },
        },
      },
      {
        name: 'get_destination',
        description:
          'Get details and connection settings for a specific Segment destination by destination ID. Requires publicApiToken.',
        inputSchema: {
          type: 'object',
          properties: {
            destination_id: {
              type: 'string',
              description: 'The Segment destination ID',
            },
          },
          required: ['destination_id'],
        },
      },
      {
        name: 'update_destination',
        description:
          'Enable, disable, or update settings for a Segment destination. Requires publicApiToken.',
        inputSchema: {
          type: 'object',
          properties: {
            destination_id: {
              type: 'string',
              description: 'The Segment destination ID to update',
            },
            enabled: {
              type: 'boolean',
              description: 'Enable or disable the destination',
            },
            settings: {
              type: 'object',
              description: 'Destination-specific connection settings to update',
            },
          },
          required: ['destination_id'],
        },
      },
      {
        name: 'list_warehouses',
        description:
          'List all warehouses connected to the Segment workspace. Requires publicApiToken.',
        inputSchema: {
          type: 'object',
          properties: {
            pagination_cursor: {
              type: 'string',
              description: 'Cursor from a previous response to fetch the next page',
            },
            pagination_count: {
              type: 'number',
              description: 'Number of warehouses per page (default: 10)',
            },
          },
        },
      },
      {
        name: 'get_warehouse',
        description:
          'Get connection details and sync status for a specific Segment warehouse. Requires publicApiToken.',
        inputSchema: {
          type: 'object',
          properties: {
            warehouse_id: {
              type: 'string',
              description: 'The Segment warehouse ID',
            },
          },
          required: ['warehouse_id'],
        },
      },
      {
        name: 'list_tracking_plans',
        description:
          'List all tracking plans in the Segment workspace. Requires publicApiToken.',
        inputSchema: {
          type: 'object',
          properties: {
            pagination_cursor: {
              type: 'string',
              description: 'Cursor from a previous response to fetch the next page',
            },
            pagination_count: {
              type: 'number',
              description: 'Number of tracking plans per page (default: 10)',
            },
          },
        },
      },
      {
        name: 'get_tracking_plan',
        description:
          'Get the full event schema and rules for a specific Segment tracking plan. Requires publicApiToken.',
        inputSchema: {
          type: 'object',
          properties: {
            tracking_plan_id: {
              type: 'string',
              description: 'The Segment tracking plan ID',
            },
          },
          required: ['tracking_plan_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'track':
          return await this.track(args);
        case 'identify':
          return await this.identify(args);
        case 'group':
          return await this.group(args);
        case 'page':
          return await this.page(args);
        case 'screen':
          return await this.screen(args);
        case 'alias':
          return await this.alias(args);
        case 'batch':
          return await this.batch(args);
        case 'list_sources':
          return await this.listSources(args);
        case 'get_source':
          return await this.getSource(args);
        case 'create_source':
          return await this.createSource(args);
        case 'update_source':
          return await this.updateSource(args);
        case 'delete_source':
          return await this.deleteSource(args);
        case 'list_destinations':
          return await this.listDestinations(args);
        case 'get_destination':
          return await this.getDestination(args);
        case 'update_destination':
          return await this.updateDestination(args);
        case 'list_warehouses':
          return await this.listWarehouses(args);
        case 'get_warehouse':
          return await this.getWarehouse(args);
        case 'list_tracking_plans':
          return await this.listTrackingPlans(args);
        case 'get_tracking_plan':
          return await this.getTrackingPlan(args);
        default:
          return {
            content: [{ type: 'text', text: `Unknown tool: ${name}` }],
            isError: true,
          };
      }
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Tool execution failed: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }

  private async postIngestion(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.ingestionBaseUrl}${path}`, {
      method: 'POST',
      headers: {
        Authorization: this.writeKeyAuthHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      let errText = '';
      try { errText = await response.text(); } catch { /* ignore */ }
      return {
        content: [
          {
            type: 'text',
            text: `Segment tracking API error ${response.status} ${response.statusText}: ${errText}`,
          },
        ],
        isError: true,
      };
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      return {
        content: [{ type: 'text', text: JSON.stringify({ status: response.status, message: 'OK' }) }],
        isError: false,
      };
    }

    return {
      content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }],
      isError: false,
    };
  }

  private requirePublicApiToken(): ToolResult | null {
    if (!this.publicApiToken) {
      return {
        content: [
          {
            type: 'text',
            text: 'publicApiToken is required for workspace management tools. Configure it in SegmentConfig.',
          },
        ],
        isError: true,
      };
    }
    return null;
  }

  private async publicApiGet(path: string, params?: URLSearchParams): Promise<ToolResult> {
    const guard = this.requirePublicApiToken();
    if (guard) return guard;

    const qs = params && params.toString() ? `?${params.toString()}` : '';
    const response = await this.fetchWithRetry(`${this.publicApiBaseUrl}${path}${qs}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${this.publicApiToken!}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      let errText = '';
      try { errText = await response.text(); } catch { /* ignore */ }
      return {
        content: [
          {
            type: 'text',
            text: `Segment Public API error ${response.status} ${response.statusText}: ${errText}`,
          },
        ],
        isError: true,
      };
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new Error(`Segment Public API returned non-JSON response (HTTP ${response.status})`);
    }

    return {
      content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }],
      isError: false,
    };
  }

  private async publicApiPost(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const guard = this.requirePublicApiToken();
    if (guard) return guard;

    const response = await this.fetchWithRetry(`${this.publicApiBaseUrl}${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.publicApiToken!}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      let errText = '';
      try { errText = await response.text(); } catch { /* ignore */ }
      return {
        content: [
          {
            type: 'text',
            text: `Segment Public API error ${response.status} ${response.statusText}: ${errText}`,
          },
        ],
        isError: true,
      };
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new Error(`Segment Public API returned non-JSON response (HTTP ${response.status})`);
    }

    return {
      content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }],
      isError: false,
    };
  }

  private async publicApiPatch(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const guard = this.requirePublicApiToken();
    if (guard) return guard;

    const response = await this.fetchWithRetry(`${this.publicApiBaseUrl}${path}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${this.publicApiToken!}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      let errText = '';
      try { errText = await response.text(); } catch { /* ignore */ }
      return {
        content: [
          {
            type: 'text',
            text: `Segment Public API error ${response.status} ${response.statusText}: ${errText}`,
          },
        ],
        isError: true,
      };
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new Error(`Segment Public API returned non-JSON response (HTTP ${response.status})`);
    }

    return {
      content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }],
      isError: false,
    };
  }

  private async publicApiDelete(path: string): Promise<ToolResult> {
    const guard = this.requirePublicApiToken();
    if (guard) return guard;

    const response = await this.fetchWithRetry(`${this.publicApiBaseUrl}${path}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${this.publicApiToken!}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      let errText = '';
      try { errText = await response.text(); } catch { /* ignore */ }
      return {
        content: [
          {
            type: 'text',
            text: `Segment Public API error ${response.status} ${response.statusText}: ${errText}`,
          },
        ],
        isError: true,
      };
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      return {
        content: [{ type: 'text', text: JSON.stringify({ status: response.status, message: 'Deleted' }) }],
        isError: false,
      };
    }

    return {
      content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }],
      isError: false,
    };
  }

  private paginationParams(args: Record<string, unknown>): URLSearchParams {
    const params = new URLSearchParams();
    if (args.pagination_cursor) {
      params.set('pagination[cursor]', args.pagination_cursor as string);
    }
    if (args.pagination_count) {
      params.set('pagination[count]', String(args.pagination_count as number));
    }
    return params;
  }

  // --- Tracking API ---

  private async track(args: Record<string, unknown>): Promise<ToolResult> {
    const event = args.event as string;
    if (!event) {
      return { content: [{ type: 'text', text: 'event is required' }], isError: true };
    }
    if (!args.userId && !args.anonymousId) {
      return {
        content: [{ type: 'text', text: 'Either userId or anonymousId is required' }],
        isError: true,
      };
    }
    const body: Record<string, unknown> = { type: 'track', event };
    if (args.userId) body.userId = args.userId;
    if (args.anonymousId) body.anonymousId = args.anonymousId;
    if (args.properties) body.properties = args.properties;
    if (args.timestamp) body.timestamp = args.timestamp;
    if (args.context) body.context = args.context;
    if (args.integrations) body.integrations = args.integrations;
    return this.postIngestion('/track', body);
  }

  private async identify(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.userId && !args.anonymousId) {
      return {
        content: [{ type: 'text', text: 'Either userId or anonymousId is required' }],
        isError: true,
      };
    }
    const body: Record<string, unknown> = { type: 'identify' };
    if (args.userId) body.userId = args.userId;
    if (args.anonymousId) body.anonymousId = args.anonymousId;
    if (args.traits) body.traits = args.traits;
    if (args.timestamp) body.timestamp = args.timestamp;
    if (args.context) body.context = args.context;
    return this.postIngestion('/identify', body);
  }

  private async group(args: Record<string, unknown>): Promise<ToolResult> {
    const groupId = args.groupId as string;
    if (!groupId) {
      return { content: [{ type: 'text', text: 'groupId is required' }], isError: true };
    }
    if (!args.userId && !args.anonymousId) {
      return {
        content: [{ type: 'text', text: 'Either userId or anonymousId is required' }],
        isError: true,
      };
    }
    const body: Record<string, unknown> = { type: 'group', groupId };
    if (args.userId) body.userId = args.userId;
    if (args.anonymousId) body.anonymousId = args.anonymousId;
    if (args.traits) body.traits = args.traits;
    if (args.timestamp) body.timestamp = args.timestamp;
    if (args.context) body.context = args.context;
    return this.postIngestion('/group', body);
  }

  private async page(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.userId && !args.anonymousId) {
      return {
        content: [{ type: 'text', text: 'Either userId or anonymousId is required' }],
        isError: true,
      };
    }
    const body: Record<string, unknown> = { type: 'page' };
    if (args.userId) body.userId = args.userId;
    if (args.anonymousId) body.anonymousId = args.anonymousId;
    if (args.name) body.name = args.name;
    if (args.properties) body.properties = args.properties;
    if (args.timestamp) body.timestamp = args.timestamp;
    if (args.context) body.context = args.context;
    return this.postIngestion('/page', body);
  }

  private async screen(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.userId && !args.anonymousId) {
      return {
        content: [{ type: 'text', text: 'Either userId or anonymousId is required' }],
        isError: true,
      };
    }
    const body: Record<string, unknown> = { type: 'screen' };
    if (args.userId) body.userId = args.userId;
    if (args.anonymousId) body.anonymousId = args.anonymousId;
    if (args.name) body.name = args.name;
    if (args.properties) body.properties = args.properties;
    if (args.timestamp) body.timestamp = args.timestamp;
    if (args.context) body.context = args.context;
    return this.postIngestion('/screen', body);
  }

  private async alias(args: Record<string, unknown>): Promise<ToolResult> {
    const userId = args.userId as string;
    const previousId = args.previousId as string;
    if (!userId || !previousId) {
      return {
        content: [{ type: 'text', text: 'userId and previousId are required' }],
        isError: true,
      };
    }
    const body: Record<string, unknown> = { type: 'alias', userId, previousId };
    if (args.timestamp) body.timestamp = args.timestamp;
    if (args.context) body.context = args.context;
    return this.postIngestion('/alias', body);
  }

  private async batch(args: Record<string, unknown>): Promise<ToolResult> {
    const batchItems = args.batch as unknown[];
    if (!batchItems || !Array.isArray(batchItems) || batchItems.length === 0) {
      return {
        content: [{ type: 'text', text: 'batch array is required and must be non-empty' }],
        isError: true,
      };
    }
    const body: Record<string, unknown> = { batch: batchItems };
    if (args.context) body.context = args.context;
    return this.postIngestion('/batch', body);
  }

  // --- Public API ---

  private async listSources(args: Record<string, unknown>): Promise<ToolResult> {
    return this.publicApiGet('/sources', this.paginationParams(args));
  }

  private async getSource(args: Record<string, unknown>): Promise<ToolResult> {
    const sourceId = args.source_id as string;
    if (!sourceId) {
      return { content: [{ type: 'text', text: 'source_id is required' }], isError: true };
    }
    return this.publicApiGet(`/sources/${encodeURIComponent(sourceId)}`);
  }

  private async createSource(args: Record<string, unknown>): Promise<ToolResult> {
    const slug = args.slug as string;
    const metadata_id = args.metadata_id as string;
    if (!slug || !metadata_id) {
      return {
        content: [{ type: 'text', text: 'slug and metadata_id are required' }],
        isError: true,
      };
    }
    const body: Record<string, unknown> = {
      slug,
      enabled: typeof args.enabled === 'boolean' ? args.enabled : true,
      metadataId: metadata_id,
    };
    return this.publicApiPost('/sources', body);
  }

  private async updateSource(args: Record<string, unknown>): Promise<ToolResult> {
    const sourceId = args.source_id as string;
    if (!sourceId) {
      return { content: [{ type: 'text', text: 'source_id is required' }], isError: true };
    }
    const body: Record<string, unknown> = {};
    if (typeof args.enabled === 'boolean') body.enabled = args.enabled;
    if (args.settings) body.settings = args.settings;
    return this.publicApiPatch(`/sources/${encodeURIComponent(sourceId)}`, body);
  }

  private async deleteSource(args: Record<string, unknown>): Promise<ToolResult> {
    const sourceId = args.source_id as string;
    if (!sourceId) {
      return { content: [{ type: 'text', text: 'source_id is required' }], isError: true };
    }
    return this.publicApiDelete(`/sources/${encodeURIComponent(sourceId)}`);
  }

  private async listDestinations(args: Record<string, unknown>): Promise<ToolResult> {
    return this.publicApiGet('/destinations', this.paginationParams(args));
  }

  private async getDestination(args: Record<string, unknown>): Promise<ToolResult> {
    const destinationId = args.destination_id as string;
    if (!destinationId) {
      return { content: [{ type: 'text', text: 'destination_id is required' }], isError: true };
    }
    return this.publicApiGet(`/destinations/${encodeURIComponent(destinationId)}`);
  }

  private async updateDestination(args: Record<string, unknown>): Promise<ToolResult> {
    const destinationId = args.destination_id as string;
    if (!destinationId) {
      return { content: [{ type: 'text', text: 'destination_id is required' }], isError: true };
    }
    const body: Record<string, unknown> = {};
    if (typeof args.enabled === 'boolean') body.enabled = args.enabled;
    if (args.settings) body.settings = args.settings;
    return this.publicApiPatch(`/destinations/${encodeURIComponent(destinationId)}`, body);
  }

  private async listWarehouses(args: Record<string, unknown>): Promise<ToolResult> {
    return this.publicApiGet('/warehouses', this.paginationParams(args));
  }

  private async getWarehouse(args: Record<string, unknown>): Promise<ToolResult> {
    const warehouseId = args.warehouse_id as string;
    if (!warehouseId) {
      return { content: [{ type: 'text', text: 'warehouse_id is required' }], isError: true };
    }
    return this.publicApiGet(`/warehouses/${encodeURIComponent(warehouseId)}`);
  }

  private async listTrackingPlans(args: Record<string, unknown>): Promise<ToolResult> {
    return this.publicApiGet('/tracking-plans', this.paginationParams(args));
  }

  private async getTrackingPlan(args: Record<string, unknown>): Promise<ToolResult> {
    const trackingPlanId = args.tracking_plan_id as string;
    if (!trackingPlanId) {
      return { content: [{ type: 'text', text: 'tracking_plan_id is required' }], isError: true };
    }
    return this.publicApiGet(`/tracking-plans/${encodeURIComponent(trackingPlanId)}`);
  }
}

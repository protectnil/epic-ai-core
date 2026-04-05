/**
 * Ticketmaster Commerce MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: No official Ticketmaster MCP server exists.
// Our adapter covers: 1 tool (event offers) matching the Commerce API v2 spec.
// The Commerce API v2 exposes only a single endpoint for event offers.
// For cart/purchase APIs, Ticketmaster requires a formal partnership agreement.
//
// Base URL: https://www.ticketmaster.com/commerce/v2
// Auth: API key passed as query param `api-key` or header `X-SSL-CERT-UID`; access token via `access_token` query param or `X-TM-ACCESS-TOKEN` header
// Docs: https://developer.ticketmaster.com/products-and-docs/apis/commerce/
// Rate limits: Varies by tier. Default public tier: 5,000 calls/day.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface TicketmasterCommerceConfig {
  apiKey: string;
  accessToken?: string;
  /** Optional base URL override (default: https://www.ticketmaster.com/commerce/v2) */
  baseUrl?: string;
}

export class TicketmasterCommerceMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly accessToken: string | undefined;
  private readonly baseUrl: string;

  constructor(config: TicketmasterCommerceConfig) {
    super();
    this.apiKey = config.apiKey;
    this.accessToken = config.accessToken;
    this.baseUrl = config.baseUrl ?? 'https://www.ticketmaster.com/commerce/v2';
  }

  static catalog() {
    return {
      name: 'ticketmaster-commerce',
      displayName: 'Ticketmaster Commerce',
      version: '1.0.0',
      category: 'ecommerce',
      keywords: [
        'ticketmaster', 'commerce', 'tickets', 'events', 'offers', 'concert',
        'sports', 'theater', 'venue', 'seating', 'pricing', 'purchase',
        'ticket-sales', 'live-events', 'entertainment',
      ],
      toolNames: [
        'get_event_offers',
      ],
      description: 'Ticketmaster Commerce API — retrieve available ticket offers and pricing for events by event ID. Covers North America markets.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'get_event_offers',
        description: 'Get available ticket offers and pricing for a Ticketmaster event — returns offer types, price zones, areas, seats, and purchase limits',
        inputSchema: {
          type: 'object',
          properties: {
            event_id: {
              type: 'string',
              description: 'Ticketmaster event identifier (e.g. "G5diZfkn0B-bB")',
            },
            display_id: {
              type: 'string',
              description: 'Optional displayId to un-hide protected offers (e.g. presale offers)',
            },
          },
          required: ['event_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'get_event_offers':
          return this.getEventOffers(args);
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

  private async getEventOffers(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.event_id) {
      return { content: [{ type: 'text', text: 'event_id is required' }], isError: true };
    }

    const eventId = encodeURIComponent(args.event_id as string);
    const qs = new URLSearchParams({ 'api-key': this.apiKey });
    if (this.accessToken) qs.set('access_token', this.accessToken);

    const url = `${this.baseUrl}/events/${eventId}/offers?${qs.toString()}`;

    const headers: Record<string, string> = {
      'Accept': 'application/json',
    };
    if (this.accessToken) headers['X-TM-ACCESS-TOKEN'] = this.accessToken;

    const init: RequestInit = { method: 'GET', headers };

    // displayId goes in request body per spec
    if (args.display_id) {
      (init as RequestInit & { body: string }).body = args.display_id as string;
      headers['Content-Type'] = 'text/plain';
    }

    const response = await this.fetchWithRetry(url, init);
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Ticketmaster returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }
}

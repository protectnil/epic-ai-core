/**
 * Lyft MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03.
//
// Base URL: https://api.lyft.com/v1
// Auth: OAuth2 Bearer token — Authorization: Bearer <access_token>
//   Client Authentication: client_credentials grant for public data (ride types, ETAs, costs)
//   User Authentication: authorization_code grant for user-scoped endpoints (rides, profile)
// Docs: https://developer.lyft.com/docs
// Swagger spec: https://api.apis.guru/v2/specs/lyft.com/1.0.0/swagger.json
// Rate limits: Not publicly documented; throttling enforced per token.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface LyftConfig {
  accessToken: string; // OAuth2 Bearer access token
}

export class LyftMCPServer extends MCPAdapterBase {
  private readonly accessToken: string;
  private readonly baseUrl = 'https://api.lyft.com/v1';

  constructor(config: LyftConfig) {
    super();
    this.accessToken = config.accessToken;
  }

  static catalog() {
    return {
      name: 'lyft',
      displayName: 'Lyft',
      version: '1.0.0',
      category: 'travel' as const,
      keywords: ['lyft', 'rideshare', 'rides', 'transportation', 'mobility', 'eta', 'cost', 'drivers', 'profile', 'ridetypes'],
      toolNames: [
        'get_ride_types',
        'get_cost_estimates',
        'get_eta',
        'get_nearby_drivers',
        'request_ride',
        'get_ride',
        'cancel_ride',
        'update_ride_destination',
        'rate_ride',
        'get_ride_receipt',
        'list_rides',
        'get_profile',
      ],
      description: 'Interact with the Lyft platform: browse ride types and pricing, get ETAs, request and manage rides, rate completed rides, view receipts, and access rider profile via the Lyft REST API.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      // ── Ride Types ────────────────────────────────────────────────────────
      {
        name: 'get_ride_types',
        description: 'Get available Lyft ride types (Lyft, Lyft XL, Lyft Lux, etc.) for a given pickup location',
        inputSchema: {
          type: 'object',
          properties: {
            lat:       { type: 'number', description: 'Pickup latitude' },
            lng:       { type: 'number', description: 'Pickup longitude' },
            ride_type: { type: 'string', description: 'Filter to a specific ride type (e.g. lyft, lyft_line, lyft_plus)' },
          },
          required: ['lat', 'lng'],
        },
      },
      // ── Cost Estimates ────────────────────────────────────────────────────
      {
        name: 'get_cost_estimates',
        description: 'Get cost estimates for available ride types between an origin and destination',
        inputSchema: {
          type: 'object',
          properties: {
            start_lat:   { type: 'number', description: 'Pickup latitude' },
            start_lng:   { type: 'number', description: 'Pickup longitude' },
            end_lat:     { type: 'number', description: 'Dropoff latitude' },
            end_lng:     { type: 'number', description: 'Dropoff longitude' },
            ride_type:   { type: 'string', description: 'Filter to a specific ride type' },
          },
          required: ['start_lat', 'start_lng', 'end_lat', 'end_lng'],
        },
      },
      // ── ETA ───────────────────────────────────────────────────────────────
      {
        name: 'get_eta',
        description: 'Get estimated pickup times for available ride types at a given location',
        inputSchema: {
          type: 'object',
          properties: {
            lat:          { type: 'number', description: 'Pickup latitude' },
            lng:          { type: 'number', description: 'Pickup longitude' },
            destination_lat: { type: 'number', description: 'Optional destination latitude for ride-type-specific ETAs' },
            destination_lng: { type: 'number', description: 'Optional destination longitude' },
            ride_type:    { type: 'string', description: 'Filter to a specific ride type' },
          },
          required: ['lat', 'lng'],
        },
      },
      // ── Nearby Drivers ────────────────────────────────────────────────────
      {
        name: 'get_nearby_drivers',
        description: 'Get the locations of available Lyft drivers near a pickup point',
        inputSchema: {
          type: 'object',
          properties: {
            lat: { type: 'number', description: 'Latitude for driver search' },
            lng: { type: 'number', description: 'Longitude for driver search' },
          },
          required: ['lat', 'lng'],
        },
      },
      // ── Request Ride ──────────────────────────────────────────────────────
      {
        name: 'request_ride',
        description: 'Request a Lyft ride from an origin to a destination',
        inputSchema: {
          type: 'object',
          properties: {
            ride_type:    { type: 'string', description: 'Lyft ride type to request (e.g. lyft, lyft_line, lyft_plus)' },
            origin_lat:   { type: 'number', description: 'Pickup latitude' },
            origin_lng:   { type: 'number', description: 'Pickup longitude' },
            origin_address: { type: 'string', description: 'Human-readable pickup address (optional)' },
            destination_lat: { type: 'number', description: 'Dropoff latitude' },
            destination_lng: { type: 'number', description: 'Dropoff longitude' },
            destination_address: { type: 'string', description: 'Human-readable dropoff address (optional)' },
            cost_token:   { type: 'string', description: 'Opaque token from a prior cost estimate to confirm pricing' },
          },
          required: ['ride_type', 'origin_lat', 'origin_lng', 'destination_lat', 'destination_lng'],
        },
      },
      // ── Get Ride ──────────────────────────────────────────────────────────
      {
        name: 'get_ride',
        description: 'Get the current status and details of a specific Lyft ride by ride ID',
        inputSchema: {
          type: 'object',
          properties: {
            ride_id: { type: 'string', description: 'The Lyft ride ID' },
          },
          required: ['ride_id'],
        },
      },
      // ── Cancel Ride ───────────────────────────────────────────────────────
      {
        name: 'cancel_ride',
        description: 'Cancel an active Lyft ride request. May incur a cancellation fee.',
        inputSchema: {
          type: 'object',
          properties: {
            ride_id:      { type: 'string', description: 'The Lyft ride ID to cancel' },
            cancel_confirmation_token: { type: 'string', description: 'Confirmation token if a cancellation fee applies' },
          },
          required: ['ride_id'],
        },
      },
      // ── Update Destination ────────────────────────────────────────────────
      {
        name: 'update_ride_destination',
        description: 'Update the dropoff destination for an active ride that is in progress',
        inputSchema: {
          type: 'object',
          properties: {
            ride_id: { type: 'string', description: 'The Lyft ride ID' },
            lat:     { type: 'number', description: 'New destination latitude' },
            lng:     { type: 'number', description: 'New destination longitude' },
            address: { type: 'string', description: 'New destination address (optional)' },
          },
          required: ['ride_id', 'lat', 'lng'],
        },
      },
      // ── Rate Ride ─────────────────────────────────────────────────────────
      {
        name: 'rate_ride',
        description: 'Submit a rating, optional feedback, and optional tip for a completed Lyft ride',
        inputSchema: {
          type: 'object',
          properties: {
            ride_id:  { type: 'string', description: 'The Lyft ride ID to rate' },
            rating:   { type: 'number', description: 'Star rating from 1 to 5' },
            feedback: { type: 'string', description: 'Optional written feedback for the driver' },
            tip_amount:   { type: 'number', description: 'Tip amount in minor currency units (e.g. cents)' },
            tip_currency: { type: 'string', description: 'ISO 4217 currency code for the tip (e.g. USD)' },
          },
          required: ['ride_id', 'rating'],
        },
      },
      // ── Receipt ───────────────────────────────────────────────────────────
      {
        name: 'get_ride_receipt',
        description: 'Get the receipt for a completed Lyft ride including charges, discounts, and line items',
        inputSchema: {
          type: 'object',
          properties: {
            ride_id: { type: 'string', description: 'The Lyft ride ID' },
          },
          required: ['ride_id'],
        },
      },
      // ── List Rides ────────────────────────────────────────────────────────
      {
        name: 'list_rides',
        description: 'List the authenticated user\'s past and active Lyft rides with optional pagination',
        inputSchema: {
          type: 'object',
          properties: {
            start_time: { type: 'string', description: 'ISO 8601 start time filter (e.g. 2024-01-01T00:00:00Z)' },
            end_time:   { type: 'string', description: 'ISO 8601 end time filter' },
            limit:      { type: 'number', description: 'Max number of rides to return (default: 10)' },
          },
        },
      },
      // ── Profile ───────────────────────────────────────────────────────────
      {
        name: 'get_profile',
        description: 'Get the authenticated Lyft user\'s profile including name, email, and rider ID',
        inputSchema: { type: 'object', properties: {} },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'get_ride_types':          return await this.getRideTypes(args);
        case 'get_cost_estimates':      return await this.getCostEstimates(args);
        case 'get_eta':                 return await this.getEta(args);
        case 'get_nearby_drivers':      return await this.getNearbyDrivers(args);
        case 'request_ride':            return await this.requestRide(args);
        case 'get_ride':                return await this.getRide(args);
        case 'cancel_ride':             return await this.cancelRide(args);
        case 'update_ride_destination': return await this.updateRideDestination(args);
        case 'rate_ride':               return await this.rateRide(args);
        case 'get_ride_receipt':        return await this.getRideReceipt(args);
        case 'list_rides':              return await this.listRides(args);
        case 'get_profile':             return await this.getProfile();
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

  private buildHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${this.accessToken}`,
    };
  }

  private async lyftRequest(path: string, options: RequestInit = {}): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      ...options,
      headers: this.buildHeaders(),
    });

    if (!response.ok) {
      let detail = '';
      try { detail = await response.text(); } catch { /* ignore */ }
      return {
        content: [{ type: 'text', text: `Lyft API error ${response.status} ${response.statusText}${detail ? ': ' + detail.slice(0, 400) : ''}` }],
        isError: true,
      };
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      return { content: [{ type: 'text', text: `Lyft returned non-JSON response (HTTP ${response.status})` }], isError: true };
    }

    const text = JSON.stringify(data, null, 2);
    const truncated = text.length > 10_000
      ? text.slice(0, 10_000) + `\n... [truncated, ${text.length} total chars]`
      : text;
    return { content: [{ type: 'text', text: truncated }], isError: false };
  }

  // ── Ride Types ────────────────────────────────────────────────────────────

  private async getRideTypes(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams({
      lat: String(args.lat),
      lng: String(args.lng),
    });
    if (args.ride_type) params.set('ride_type', args.ride_type as string);
    return this.lyftRequest(`/ridetypes?${params.toString()}`);
  }

  // ── Cost Estimates ────────────────────────────────────────────────────────

  private async getCostEstimates(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams({
      start_lat: String(args.start_lat),
      start_lng: String(args.start_lng),
      end_lat:   String(args.end_lat),
      end_lng:   String(args.end_lng),
    });
    if (args.ride_type) params.set('ride_type', args.ride_type as string);
    return this.lyftRequest(`/cost?${params.toString()}`);
  }

  // ── ETA ───────────────────────────────────────────────────────────────────

  private async getEta(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams({
      lat: String(args.lat),
      lng: String(args.lng),
    });
    if (args.destination_lat) params.set('destination_lat', String(args.destination_lat));
    if (args.destination_lng) params.set('destination_lng', String(args.destination_lng));
    if (args.ride_type) params.set('ride_type', args.ride_type as string);
    return this.lyftRequest(`/eta?${params.toString()}`);
  }

  // ── Nearby Drivers ────────────────────────────────────────────────────────

  private async getNearbyDrivers(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams({
      lat: String(args.lat),
      lng: String(args.lng),
    });
    return this.lyftRequest(`/drivers?${params.toString()}`);
  }

  // ── Rides ─────────────────────────────────────────────────────────────────

  private async requestRide(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {
      ride_type: args.ride_type,
      origin: { lat: args.origin_lat, lng: args.origin_lng },
      destination: { lat: args.destination_lat, lng: args.destination_lng },
    };
    if (args.origin_address) (body.origin as Record<string, unknown>).address = args.origin_address;
    if (args.destination_address) (body.destination as Record<string, unknown>).address = args.destination_address;
    if (args.cost_token) body.cost_token = args.cost_token;
    return this.lyftRequest('/rides', { method: 'POST', body: JSON.stringify(body) });
  }

  private async getRide(args: Record<string, unknown>): Promise<ToolResult> {
    return this.lyftRequest(`/rides/${encodeURIComponent(args.ride_id as string)}`);
  }

  private async cancelRide(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {};
    if (args.cancel_confirmation_token) body.cancel_confirmation_token = args.cancel_confirmation_token;
    return this.lyftRequest(`/rides/${encodeURIComponent(args.ride_id as string)}/cancel`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  private async updateRideDestination(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {
      lat: args.lat,
      lng: args.lng,
    };
    if (args.address) body.address = args.address;
    return this.lyftRequest(`/rides/${encodeURIComponent(args.ride_id as string)}/destination`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  private async rateRide(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = { rating: args.rating };
    if (args.feedback) body.feedback = args.feedback;
    if (args.tip_amount !== undefined) {
      body.tip = {
        amount: args.tip_amount,
        currency: args.tip_currency || 'USD',
      };
    }
    return this.lyftRequest(`/rides/${encodeURIComponent(args.ride_id as string)}/rating`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  private async getRideReceipt(args: Record<string, unknown>): Promise<ToolResult> {
    return this.lyftRequest(`/rides/${encodeURIComponent(args.ride_id as string)}/receipt`);
  }

  private async listRides(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.start_time) params.set('start_time', args.start_time as string);
    if (args.end_time) params.set('end_time', args.end_time as string);
    if (args.limit !== undefined) params.set('limit', String(args.limit));
    const qs = params.toString();
    return this.lyftRequest(`/rides${qs ? '?' + qs : ''}`);
  }

  // ── Profile ───────────────────────────────────────────────────────────────

  private async getProfile(): Promise<ToolResult> {
    return this.lyftRequest('/profile');
  }
}

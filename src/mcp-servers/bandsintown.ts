/**
 * Bandsintown MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// No official Bandsintown MCP server exists on GitHub.
// We build a REST wrapper covering artist info and event discovery.
//
// Base URL: https://rest.bandsintown.com
// Auth: app_id query parameter — pass your Bandsintown app ID with every request
// Docs: https://app.swaggerhub.com/apis/Bandsintown/PublicAPI/3.0.0
// Rate limits: Not publicly documented; use responsibly

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface BandsintownConfig {
  appId: string;
  baseUrl?: string; // default: https://rest.bandsintown.com
}

export class BandsintownMCPServer extends MCPAdapterBase {
  private readonly appId: string;
  private readonly baseUrl: string;

  constructor(config: BandsintownConfig) {
    super();
    this.appId   = config.appId;
    this.baseUrl = config.baseUrl || 'https://rest.bandsintown.com';
  }

  static catalog() {
    return {
      name: 'bandsintown',
      displayName: 'Bandsintown',
      version: '1.0.0',
      category: 'music',
      keywords: [
        'bandsintown', 'music', 'concerts', 'events', 'artist', 'live music',
        'tour', 'shows', 'tickets', 'venues', 'gigs', 'performances',
        'upcoming events', 'past events', 'festival', 'band', 'musician',
      ],
      toolNames: [
        'get_artist',
        'get_artist_events',
      ],
      description: 'Bandsintown API: look up artist profiles and discover upcoming, past, or date-ranged concert events.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'get_artist',
        description: 'Get artist information including name, image, tracker count, upcoming event count, and social links by artist name',
        inputSchema: {
          type: 'object',
          properties: {
            artistname: {
              type: 'string',
              description: 'The artist name (e.g. "Maroon 5", "Phish", "Radiohead"). URL-encode special characters.',
            },
          },
          required: ['artistname'],
        },
      },
      {
        name: 'get_artist_events',
        description: 'Get upcoming, past, cancelled, or date-ranged events for an artist. Returns event details including venue, date, lineup, offers, and status.',
        inputSchema: {
          type: 'object',
          properties: {
            artistname: {
              type: 'string',
              description: 'The artist name (e.g. "Maroon 5", "Phish", "Radiohead")',
            },
            date: {
              type: 'string',
              description: 'Filter events by date or range. Values: "upcoming" (default), "past", "cancelled", or a date range "YYYY-MM-DD,YYYY-MM-DD" (e.g. "2026-01-01,2026-06-30")',
            },
          },
          required: ['artistname'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'get_artist':        return this.getArtist(args);
        case 'get_artist_events': return this.getArtistEvents(args);
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

  private async get(path: string, params: Record<string, string> = {}): Promise<ToolResult> {
    const query = new URLSearchParams({ app_id: this.appId, ...params });
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}?${query.toString()}`, {
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  // ── Tool implementations ───────────────────────────────────────────────────

  private async getArtist(args: Record<string, unknown>): Promise<ToolResult> {
    const artistname = args['artistname'] as string | undefined;
    if (!artistname) {
      return { content: [{ type: 'text', text: 'artistname is required' }], isError: true };
    }
    return this.get(`/artists/${encodeURIComponent(artistname)}`);
  }

  private async getArtistEvents(args: Record<string, unknown>): Promise<ToolResult> {
    const artistname = args['artistname'] as string | undefined;
    if (!artistname) {
      return { content: [{ type: 'text', text: 'artistname is required' }], isError: true };
    }
    const params: Record<string, string> = {};
    if (args['date']) params['date'] = String(args['date']);
    return this.get(`/artists/${encodeURIComponent(artistname)}/events`, params);
  }
}

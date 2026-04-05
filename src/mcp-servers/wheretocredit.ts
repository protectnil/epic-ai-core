/**
 * WhereToCredit MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03.
// No official WhereToCredit MCP server exists on GitHub.
// We build a REST wrapper covering the WhereToCredit API v1.
//
// Base URL: https://api.wheretocredit.com
// Auth: API key passed via "api-key" header on every request
// Docs: https://www.wheretocredit.com/api/2.0/
// Rate limits: Subject to plan. Returns HTTP 429 on limit breach.
// Note: The calculate endpoint accepts an array of itineraries, each with flight segments.
//       The programs endpoint returns all supported frequent flyer programs (no auth required).

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface WhereToCreditConfig {
  /** API key for authenticated endpoints */
  apiKey: string;
  /** Optional base URL override (default: https://api.wheretocredit.com) */
  baseUrl?: string;
}

export class WhereToCreditMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: WhereToCreditConfig) {
    super();
    this.apiKey  = config.apiKey;
    this.baseUrl = config.baseUrl ?? 'https://api.wheretocredit.com';
  }

  static catalog() {
    return {
      name: 'wheretocredit',
      displayName: 'WhereToCredit',
      version: '1.0.0',
      category: 'travel',
      keywords: [
        'wheretocredit', 'frequent flyer', 'miles', 'points', 'airline', 'loyalty',
        'travel', 'reward', 'credit', 'itinerary', 'segment', 'mileage', 'earn',
        'booking class', 'iata', 'partner', 'revenue', 'tier', 'program',
      ],
      toolNames: [
        'list_programs',
        'calculate_miles',
      ],
      description: 'WhereToCredit API: list all supported frequent flyer programs and calculate miles or points earned for flight itineraries across every major loyalty program.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_programs',
        description: 'List all frequent flyer programs supported by WhereToCredit — returns program IDs, names, associated airlines, tier levels, and the denomination of miles/points used by each program',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'calculate_miles',
        description: 'Calculate the number of miles or points earned for one or more flight itineraries across every supported frequent flyer program — provide flight segments with carrier, origin, destination, booking class, and optional base fare for revenue-based programs',
        inputSchema: {
          type: 'object',
          properties: {
            itineraries: {
              type: 'array',
              description: 'Array of flight itineraries to evaluate. Each itinerary contains one or more flight segments.',
              items: {
                type: 'object',
                properties: {
                  id: {
                    type: 'string',
                    description: 'Unique identifier for this itinerary (returned in the response for matching)',
                  },
                  ticketingCarrier: {
                    type: 'string',
                    description: 'Two-letter IATA carrier code of the ticketing/plating airline (e.g. "AA", "UA")',
                  },
                  baseFareUSD: {
                    type: 'number',
                    description: 'Base fare amount in USD — required for revenue-based mileage programs (e.g. Delta SkyMiles, JetBlue TrueBlue)',
                  },
                  segments: {
                    type: 'array',
                    description: 'Flight segments in this itinerary. Each connection or stopover is a separate segment.',
                    items: {
                      type: 'object',
                      properties: {
                        carrier: {
                          type: 'string',
                          description: 'Two-letter IATA carrier code for the marketing airline (e.g. "AA")',
                        },
                        operatingCarrier: {
                          type: 'string',
                          description: 'Two-letter IATA carrier code for the operating airline (if different from marketing carrier)',
                        },
                        origin: {
                          type: 'string',
                          description: 'Three-letter IATA airport code of the departure airport (e.g. "JFK")',
                        },
                        destination: {
                          type: 'string',
                          description: 'Three-letter IATA airport code of the arrival airport (e.g. "LHR")',
                        },
                        bookingClass: {
                          type: 'string',
                          description: 'Single-letter booking/fare class (e.g. "Y" for economy, "J" for business)',
                        },
                        flightNumber: {
                          type: 'number',
                          description: 'Flight number (numeric portion only, e.g. 100 for AA100)',
                        },
                        departure: {
                          type: 'string',
                          description: 'Departure date in YYYY-MM-DD format (e.g. "2026-06-15")',
                        },
                        distance: {
                          type: 'number',
                          description: 'Flight distance in miles — if omitted, the API computes the great-circle distance from origin/destination',
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          required: ['itineraries'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_programs':   return this.listPrograms();
        case 'calculate_miles': return this.calculateMiles(args);
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

  // ── Private helpers ──────────────────────────────────────────────────────────


  private get authHeaders(): Record<string, string> {
    return {
      'api-key': this.apiKey,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
  }

  // ── Tool implementations ─────────────────────────────────────────────────────

  private async listPrograms(): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}/api/1.0/programs`, {
      headers: this.authHeaders,
    });
    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }
    const data: unknown = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async calculateMiles(args: Record<string, unknown>): Promise<ToolResult> {
    const itineraries = args['itineraries'];
    if (!itineraries || !Array.isArray(itineraries) || itineraries.length === 0) {
      return {
        content: [{ type: 'text', text: 'itineraries is required and must be a non-empty array' }],
        isError: true,
      };
    }
    const response = await this.fetchWithRetry(`${this.baseUrl}/api/1.0/calculate`, {
      method: 'POST',
      headers: this.authHeaders,
      body: JSON.stringify(itineraries),
    });
    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }
    const data: unknown = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }
}

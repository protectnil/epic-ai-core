/**
 * Ideal Postcodes UK MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// No official Ideal Postcodes MCP server was found on GitHub.
// We build a full REST wrapper covering postcode lookup, address search, autocomplete,
// UDPRN/UMPRN resolution, email validation, phone validation, and key management.
//
// Base URL: https://api.ideal-postcodes.co.uk/v1
// Auth: API key passed as `api_key` query param or in Authorization header
// Docs: https://ideal-postcodes.co.uk/docs/api
// Rate limits: Per-key lookup quota; check account dashboard

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface IdealPostcodesConfig {
  apiKey: string;
  baseUrl?: string;
}

export class IdealPostcodesUKMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: IdealPostcodesConfig) {
    super();
    this.apiKey  = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.ideal-postcodes.co.uk/v1';
  }

  static catalog() {
    return {
      name: 'ideal-postcodes-uk',
      displayName: 'Ideal Postcodes UK',
      version: '1.0.0',
      category: 'data',
      keywords: [
        'ideal-postcodes', 'postcode', 'postcode lookup', 'uk address', 'address lookup',
        'address autocomplete', 'address validation', 'address cleanse', 'udprn', 'umprn',
        'royal mail', 'uk', 'great britain', 'ons', 'place', 'email validation',
        'phone validation', 'geocoding', 'coordinates', 'latitude', 'longitude',
        'address search', 'find address', 'resolve address', 'uk data',
      ],
      toolNames: [
        'lookup_postcode',
        'find_address',
        'autocomplete_address',
        'resolve_address_gbr',
        'resolve_address_usa',
        'cleanse_address',
        'resolve_by_udprn',
        'resolve_by_umprn',
        'find_place',
        'resolve_place',
        'validate_email',
        'validate_phone_number',
        'check_key_availability',
        'get_key_details',
        'get_key_usage',
      ],
      description: 'Ideal Postcodes UK API: look up UK postcodes, search and autocomplete addresses, validate emails and phone numbers, resolve UDPRN/UMPRN identifiers, and find places.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      // ── Postcode Lookup ───────────────────────────────────────────────────────
      {
        name: 'lookup_postcode',
        description: 'Look up all addresses for a UK postcode — returns a list of Royal Mail PAF addresses at that postcode',
        inputSchema: {
          type: 'object',
          properties: {
            postcode: {
              type: 'string',
              description: 'UK postcode to look up (e.g. SW1A 2AA or SW1A2AA — spaces optional)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination when many addresses exist (default: 0)',
            },
            limit: {
              type: 'number',
              description: 'Number of addresses to return per page (default: 10, max: 100)',
            },
          },
          required: ['postcode'],
        },
      },
      // ── Address Search ────────────────────────────────────────────────────────
      {
        name: 'find_address',
        description: 'Search for UK addresses by query string — returns matching addresses from the Royal Mail PAF database',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Address search query — can be a partial address, street name, town, or postcode',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results to return (default: 10)',
            },
          },
          required: ['query'],
        },
      },
      // ── Autocomplete ──────────────────────────────────────────────────────────
      {
        name: 'autocomplete_address',
        description: 'Autocomplete a UK address as the user types — returns suggestions for address completion',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Partial address string to autocomplete',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of autocomplete suggestions (default: 10)',
            },
            postcode_outward: {
              type: 'string',
              description: 'Restrict results to a specific postcode outward code (e.g. SW1A)',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'resolve_address_gbr',
        description: 'Resolve an autocomplete suggestion to a full UK address — call after autocomplete_address to get the complete address record',
        inputSchema: {
          type: 'object',
          properties: {
            address_id: {
              type: 'string',
              description: 'The address suggestion ID returned by autocomplete_address',
            },
          },
          required: ['address_id'],
        },
      },
      {
        name: 'resolve_address_usa',
        description: 'Resolve an autocomplete suggestion to a full US address using the Ideal Postcodes US address database',
        inputSchema: {
          type: 'object',
          properties: {
            address_id: {
              type: 'string',
              description: 'The address suggestion ID returned by autocomplete_address for US addresses',
            },
          },
          required: ['address_id'],
        },
      },
      // ── Address Cleanse ───────────────────────────────────────────────────────
      {
        name: 'cleanse_address',
        description: 'Cleanse and standardise a UK address — normalises formatting, corrects errors, and adds missing fields like postcode',
        inputSchema: {
          type: 'object',
          properties: {
            line_1: {
              type: 'string',
              description: 'First line of the address to cleanse',
            },
            line_2: {
              type: 'string',
              description: 'Second line of the address (optional)',
            },
            line_3: {
              type: 'string',
              description: 'Third line of the address (optional)',
            },
            post_town: {
              type: 'string',
              description: 'Town or city (optional)',
            },
            postcode: {
              type: 'string',
              description: 'Postcode to include in cleansing (optional)',
            },
          },
          required: ['line_1'],
        },
      },
      // ── UDPRN / UMPRN ─────────────────────────────────────────────────────────
      {
        name: 'resolve_by_udprn',
        description: 'Retrieve the full address for a UK property using its Unique Delivery Point Reference Number (UDPRN)',
        inputSchema: {
          type: 'object',
          properties: {
            udprn: {
              type: 'string',
              description: 'The 8-digit UDPRN identifier for the delivery point',
            },
          },
          required: ['udprn'],
        },
      },
      {
        name: 'resolve_by_umprn',
        description: 'Retrieve the full address for a UK property using its Unique Multiple Residence Premise Number (UMPRN)',
        inputSchema: {
          type: 'object',
          properties: {
            umprn: {
              type: 'string',
              description: 'The UMPRN identifier for the multiple-residence unit',
            },
          },
          required: ['umprn'],
        },
      },
      // ── Places ────────────────────────────────────────────────────────────────
      {
        name: 'find_place',
        description: 'Find a UK place (town, village, or locality) by name — returns place IDs and details',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Place name to search for (e.g. London, Manchester, Bath)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results to return (default: 10)',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'resolve_place',
        description: 'Resolve a place ID to its full details — returns name, coordinates, county, and administrative area data',
        inputSchema: {
          type: 'object',
          properties: {
            place_id: {
              type: 'string',
              description: 'The place ID returned by find_place',
            },
          },
          required: ['place_id'],
        },
      },
      // ── Validation ────────────────────────────────────────────────────────────
      {
        name: 'validate_email',
        description: 'Validate an email address — checks format, domain existence, and mailbox availability',
        inputSchema: {
          type: 'object',
          properties: {
            email: {
              type: 'string',
              description: 'Email address to validate',
            },
          },
          required: ['email'],
        },
      },
      {
        name: 'validate_phone_number',
        description: 'Validate a phone number — checks format, carrier, and line type (mobile, landline, VoIP)',
        inputSchema: {
          type: 'object',
          properties: {
            phone_number: {
              type: 'string',
              description: 'Phone number to validate (include country code e.g. +447911123456)',
            },
          },
          required: ['phone_number'],
        },
      },
      // ── Key Management ────────────────────────────────────────────────────────
      {
        name: 'check_key_availability',
        description: 'Check whether an Ideal Postcodes API key is valid and available for use',
        inputSchema: {
          type: 'object',
          properties: {
            key: {
              type: 'string',
              description: 'API key to check (defaults to the configured key if not provided)',
            },
          },
        },
      },
      {
        name: 'get_key_details',
        description: 'Retrieve details for an API key — includes balance, expiry date, and allowed services',
        inputSchema: {
          type: 'object',
          properties: {
            key: {
              type: 'string',
              description: 'API key to retrieve details for (defaults to the configured key)',
            },
          },
        },
      },
      {
        name: 'get_key_usage',
        description: 'Get usage statistics for an API key — returns lookup counts by service and date',
        inputSchema: {
          type: 'object',
          properties: {
            key: {
              type: 'string',
              description: 'API key to retrieve usage stats for (defaults to the configured key)',
            },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'lookup_postcode':       return this.lookupPostcode(args);
        case 'find_address':          return this.findAddress(args);
        case 'autocomplete_address':  return this.autocompleteAddress(args);
        case 'resolve_address_gbr':   return this.resolveAddressGbr(args);
        case 'resolve_address_usa':   return this.resolveAddressUsa(args);
        case 'cleanse_address':       return this.cleanseAddress(args);
        case 'resolve_by_udprn':      return this.resolveByUdprn(args);
        case 'resolve_by_umprn':      return this.resolveByUmprn(args);
        case 'find_place':            return this.findPlace(args);
        case 'resolve_place':         return this.resolvePlace(args);
        case 'validate_email':        return this.validateEmail(args);
        case 'validate_phone_number': return this.validatePhoneNumber(args);
        case 'check_key_availability': return this.checkKeyAvailability(args);
        case 'get_key_details':       return this.getKeyDetails(args);
        case 'get_key_usage':         return this.getKeyUsage(args);
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

  private async get(path: string, params: Record<string, string> = {}): Promise<ToolResult> {
    params.api_key = this.apiKey;
    const qs = '?' + new URLSearchParams(params).toString();
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}${qs}`, {
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

  private async post(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}?api_key=${encodeURIComponent(this.apiKey)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
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

  // ── Method implementations ────────────────────────────────────────────────

  private lookupPostcode(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (args.page)  params.page  = String(args.page);
    if (args.limit) params.limit = String(args.limit);
    const postcode = encodeURIComponent(String(args.postcode));
    return this.get(`/postcodes/${postcode}`, params);
  }

  private findAddress(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = { query: String(args.query) };
    if (args.limit) params.limit = String(args.limit);
    return this.get('/addresses', params);
  }

  private autocompleteAddress(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = { query: String(args.query) };
    if (args.limit)            params.limit            = String(args.limit);
    if (args.postcode_outward) params.postcode_outward = String(args.postcode_outward);
    return this.get('/autocomplete/addresses', params);
  }

  private resolveAddressGbr(args: Record<string, unknown>): Promise<ToolResult> {
    return this.get(`/autocomplete/addresses/${encodeURIComponent(String(args.address_id))}/gbr`);
  }

  private resolveAddressUsa(args: Record<string, unknown>): Promise<ToolResult> {
    return this.get(`/autocomplete/addresses/${encodeURIComponent(String(args.address_id))}/usa`);
  }

  private cleanseAddress(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = { line_1: args.line_1 };
    if (args.line_2)    body.line_2    = args.line_2;
    if (args.line_3)    body.line_3    = args.line_3;
    if (args.post_town) body.post_town = args.post_town;
    if (args.postcode)  body.postcode  = args.postcode;
    return this.post('/cleanse/addresses', body);
  }

  private resolveByUdprn(args: Record<string, unknown>): Promise<ToolResult> {
    return this.get(`/udprn/${encodeURIComponent(String(args.udprn))}`);
  }

  private resolveByUmprn(args: Record<string, unknown>): Promise<ToolResult> {
    return this.get(`/umprn/${encodeURIComponent(String(args.umprn))}`);
  }

  private findPlace(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = { query: String(args.query) };
    if (args.limit) params.limit = String(args.limit);
    return this.get('/places', params);
  }

  private resolvePlace(args: Record<string, unknown>): Promise<ToolResult> {
    return this.get(`/places/${encodeURIComponent(String(args.place_id))}`);
  }

  private validateEmail(args: Record<string, unknown>): Promise<ToolResult> {
    return this.get('/emails', { email: String(args.email) });
  }

  private validatePhoneNumber(args: Record<string, unknown>): Promise<ToolResult> {
    return this.get('/phone_numbers', { phone_number: String(args.phone_number) });
  }

  private checkKeyAvailability(args: Record<string, unknown>): Promise<ToolResult> {
    const key = args.key ? String(args.key) : this.apiKey;
    return this.get(`/keys/${encodeURIComponent(key)}`);
  }

  private getKeyDetails(args: Record<string, unknown>): Promise<ToolResult> {
    const key = args.key ? String(args.key) : this.apiKey;
    return this.get(`/keys/${encodeURIComponent(key)}/details`);
  }

  private getKeyUsage(args: Record<string, unknown>): Promise<ToolResult> {
    const key = args.key ? String(args.key) : this.apiKey;
    return this.get(`/keys/${encodeURIComponent(key)}/usage`);
  }
}

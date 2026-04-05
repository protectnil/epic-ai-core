/**
 * Open States API MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found.
// Our adapter covers: 12 tools (bills, people, jurisdictions, committees, events, metrics).
// Recommendation: Use this adapter. No official or community MCP server exists.
//
// Base URL: https://v3.openstates.org
// Auth: API key passed as query parameter `apikey` or x-api-key header
// Docs: https://docs.openstates.org/en/latest/api/v3/index.html
// Rate limits: Register at https://openstates.org/accounts/signup/ for an API key.
//   Free tier available. Rate limits not published; be conservative with pagination.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface OpenStatesConfig {
  apiKey: string;
  /** Optional base URL override (default: https://v3.openstates.org) */
  baseUrl?: string;
}

export class OpenStatesMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: OpenStatesConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? 'https://v3.openstates.org';
  }

  static catalog() {
    return {
      name: 'openstates',
      displayName: 'Open States',
      version: '1.0.0',
      category: 'government',
      keywords: [
        'openstates', 'legislation', 'bills', 'government', 'state', 'legislature',
        'politicians', 'representatives', 'senators', 'committees', 'voting',
        'policy', 'civic', 'laws', 'statutes', 'jurisdictions', 'democracy',
      ],
      toolNames: [
        'search_bills', 'get_bill_by_id', 'get_bill',
        'search_people', 'get_people_by_location',
        'list_jurisdictions', 'get_jurisdiction',
        'list_committees', 'get_committee',
        'list_events', 'get_event',
        'get_metrics',
      ],
      description: 'Search and retrieve US state legislative data — bills, legislators, committees, events, and jurisdictions across all 50 states.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'search_bills',
        description: 'Search for US state legislative bills by jurisdiction, session, sponsor, subject, or full-text query',
        inputSchema: {
          type: 'object',
          properties: {
            jurisdiction: {
              type: 'string',
              description: 'Filter by jurisdiction name or ID (e.g. "California", "ocd-jurisdiction/country:us/state:ca/government")',
            },
            session: {
              type: 'string',
              description: 'Filter by legislative session identifier (e.g. "2021")',
            },
            chamber: {
              type: 'string',
              description: 'Filter by chamber of origination (e.g. "upper", "lower")',
            },
            identifier: {
              type: 'string',
              description: 'Filter to only bills with this identifier (e.g. "HB 1", "SB 100")',
            },
            classification: {
              type: 'string',
              description: 'Filter by classification, e.g. "bill" or "resolution"',
            },
            subject: {
              type: 'string',
              description: 'Filter by subject tag (e.g. "Education", "Health")',
            },
            updated_since: {
              type: 'string',
              description: 'Return only bills updated since this date (ISO 8601, e.g. "2021-01-01")',
            },
            created_since: {
              type: 'string',
              description: 'Return only bills created since this date (ISO 8601)',
            },
            action_since: {
              type: 'string',
              description: 'Return only bills with an action since this date (ISO 8601)',
            },
            sort: {
              type: 'string',
              description: 'Sort order: "updated_desc", "updated_asc", "first_action_desc", "first_action_asc" (default: "updated_desc")',
            },
            sponsor: {
              type: 'string',
              description: 'Filter to bills sponsored by a given name or person ID',
            },
            sponsor_classification: {
              type: 'string',
              description: 'Filter sponsors by classification type (e.g. "primary", "cosponsor")',
            },
            q: {
              type: 'string',
              description: 'Full-text search query across bill text and titles',
            },
            include: {
              type: 'string',
              description: 'Comma-separated extra data to include: "sponsorships", "abstracts", "other_titles", "other_identifiers", "actions", "sources", "documents", "versions", "votes", "related_bills"',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            per_page: {
              type: 'number',
              description: 'Results per page, max 20 (default: 20)',
            },
          },
        },
      },
      {
        name: 'get_bill_by_id',
        description: 'Get full details of a specific bill by its Open States OCD bill ID',
        inputSchema: {
          type: 'object',
          properties: {
            openstates_bill_id: {
              type: 'string',
              description: 'Open States bill ID in OCD format (e.g. "ocd-bill/12345678-...")',
            },
            include: {
              type: 'string',
              description: 'Comma-separated extra data to include: "sponsorships", "abstracts", "actions", "sources", "documents", "versions", "votes", "related_bills"',
            },
          },
          required: ['openstates_bill_id'],
        },
      },
      {
        name: 'get_bill',
        description: 'Get full details of a bill by jurisdiction, legislative session, and bill identifier',
        inputSchema: {
          type: 'object',
          properties: {
            jurisdiction: {
              type: 'string',
              description: 'Jurisdiction name or ID (e.g. "California" or OCD jurisdiction ID)',
            },
            session: {
              type: 'string',
              description: 'Legislative session identifier (e.g. "2021")',
            },
            bill_id: {
              type: 'string',
              description: 'Bill identifier (e.g. "HB 1", "SB 100")',
            },
            include: {
              type: 'string',
              description: 'Comma-separated extra data to include: "sponsorships", "abstracts", "actions", "sources", "documents", "versions", "votes", "related_bills"',
            },
          },
          required: ['jurisdiction', 'session', 'bill_id'],
        },
      },
      {
        name: 'search_people',
        description: 'Search for state legislators and elected officials by name, jurisdiction, district, or chamber',
        inputSchema: {
          type: 'object',
          properties: {
            jurisdiction: {
              type: 'string',
              description: 'Filter by jurisdiction name or ID (e.g. "Texas")',
            },
            name: {
              type: 'string',
              description: 'Filter by legislator name (partial match supported)',
            },
            id: {
              type: 'string',
              description: 'Filter by Open States person ID (OCD format)',
            },
            org_classification: {
              type: 'string',
              description: 'Filter by organization type: "legislature", "executive", "council"',
            },
            district: {
              type: 'string',
              description: 'Filter by district name or number',
            },
            include: {
              type: 'string',
              description: 'Comma-separated extra data to include: "other_names", "other_identifiers", "links", "sources", "offices", "votes"',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            per_page: {
              type: 'number',
              description: 'Results per page, max 20 (default: 20)',
            },
          },
        },
      },
      {
        name: 'get_people_by_location',
        description: 'Find state legislators representing a geographic point by latitude and longitude',
        inputSchema: {
          type: 'object',
          properties: {
            lat: {
              type: 'number',
              description: 'Latitude of the location (e.g. 37.7749)',
            },
            lng: {
              type: 'number',
              description: 'Longitude of the location (e.g. -122.4194)',
            },
            include: {
              type: 'string',
              description: 'Comma-separated extra data to include: "other_names", "other_identifiers", "links", "sources", "offices", "votes"',
            },
          },
          required: ['lat', 'lng'],
        },
      },
      {
        name: 'list_jurisdictions',
        description: 'List all available state and local jurisdictions with their IDs and metadata',
        inputSchema: {
          type: 'object',
          properties: {
            classification: {
              type: 'string',
              description: 'Filter by jurisdiction classification: "government" or "legislature"',
            },
            include: {
              type: 'string',
              description: 'Extra data to include: "legislative_sessions"',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            per_page: {
              type: 'number',
              description: 'Results per page, max 20 (default: 20)',
            },
          },
        },
      },
      {
        name: 'get_jurisdiction',
        description: 'Get detailed information about a specific jurisdiction including legislative sessions',
        inputSchema: {
          type: 'object',
          properties: {
            jurisdiction_id: {
              type: 'string',
              description: 'Jurisdiction ID in OCD format (e.g. "ocd-jurisdiction/country:us/state:ca/government")',
            },
            include: {
              type: 'string',
              description: 'Extra data to include: "legislative_sessions"',
            },
          },
          required: ['jurisdiction_id'],
        },
      },
      {
        name: 'list_committees',
        description: 'List legislative committees filtered by jurisdiction, chamber, or classification',
        inputSchema: {
          type: 'object',
          properties: {
            jurisdiction: {
              type: 'string',
              description: 'Filter by jurisdiction name or ID',
            },
            classification: {
              type: 'string',
              description: 'Filter by committee classification (e.g. "committee", "subcommittee")',
            },
            parent: {
              type: 'string',
              description: 'Filter by parent committee ID (for subcommittees)',
            },
            chamber: {
              type: 'string',
              description: 'Filter by chamber: "upper" or "lower"',
            },
            include: {
              type: 'string',
              description: 'Extra data to include: "memberships", "links", "sources"',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            per_page: {
              type: 'number',
              description: 'Results per page, max 20 (default: 20)',
            },
          },
        },
      },
      {
        name: 'get_committee',
        description: 'Get details of a specific legislative committee including members and subcommittees',
        inputSchema: {
          type: 'object',
          properties: {
            committee_id: {
              type: 'string',
              description: 'Committee ID in OCD format',
            },
            include: {
              type: 'string',
              description: 'Extra data to include: "memberships", "links", "sources"',
            },
          },
          required: ['committee_id'],
        },
      },
      {
        name: 'list_events',
        description: 'List upcoming or past legislative events (hearings, floor sessions) filtered by jurisdiction or date',
        inputSchema: {
          type: 'object',
          properties: {
            jurisdiction: {
              type: 'string',
              description: 'Filter by jurisdiction name or ID',
            },
            deleted: {
              type: 'boolean',
              description: 'Include deleted events (default: false)',
            },
            before: {
              type: 'string',
              description: 'Return events before this date (ISO 8601)',
            },
            after: {
              type: 'string',
              description: 'Return events after this date (ISO 8601)',
            },
            require_bills: {
              type: 'boolean',
              description: 'Only return events that have associated bills (default: false)',
            },
            include: {
              type: 'string',
              description: 'Extra data to include: "agenda", "links", "sources", "media"',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            per_page: {
              type: 'number',
              description: 'Results per page, max 20 (default: 20)',
            },
          },
        },
      },
      {
        name: 'get_event',
        description: 'Get full details of a specific legislative event by its ID',
        inputSchema: {
          type: 'object',
          properties: {
            event_id: {
              type: 'string',
              description: 'Event ID in OCD format',
            },
            include: {
              type: 'string',
              description: 'Extra data to include: "agenda", "links", "sources", "media"',
            },
          },
          required: ['event_id'],
        },
      },
      {
        name: 'get_metrics',
        description: 'Get Open States platform metrics including total bill, person, and jurisdiction counts',
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
        case 'search_bills':
          return this.searchBills(args);
        case 'get_bill_by_id':
          return this.getBillById(args);
        case 'get_bill':
          return this.getBill(args);
        case 'search_people':
          return this.searchPeople(args);
        case 'get_people_by_location':
          return this.getPeopleByLocation(args);
        case 'list_jurisdictions':
          return this.listJurisdictions(args);
        case 'get_jurisdiction':
          return this.getJurisdiction(args);
        case 'list_committees':
          return this.listCommittees(args);
        case 'get_committee':
          return this.getCommittee(args);
        case 'list_events':
          return this.listEvents(args);
        case 'get_event':
          return this.getEvent(args);
        case 'get_metrics':
          return this.getMetrics();
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

  private buildUrl(path: string, params: Record<string, string | undefined> = {}): string {
    const qs = new URLSearchParams({ apikey: this.apiKey });
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) qs.set(k, v);
    }
    return `${this.baseUrl}${path}?${qs.toString()}`;
  }

  private async fetchGet(path: string, params: Record<string, string | undefined> = {}): Promise<ToolResult> {
    const url = this.buildUrl(path, params);
    const response = await this.fetchWithRetry(url, {
      method: 'GET',
      headers: { 'x-api-key': this.apiKey },
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Open States returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private parseInclude(include: string | undefined): string[] {
    if (!include) return [];
    return include.split(',').map(s => s.trim()).filter(Boolean);
  }

  private async searchBills(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string | undefined> = {};
    if (args.jurisdiction) params.jurisdiction = args.jurisdiction as string;
    if (args.session) params.session = args.session as string;
    if (args.chamber) params.chamber = args.chamber as string;
    if (args.identifier) params.identifier = args.identifier as string;
    if (args.classification) params.classification = args.classification as string;
    if (args.subject) params.subject = args.subject as string;
    if (args.updated_since) params.updated_since = args.updated_since as string;
    if (args.created_since) params.created_since = args.created_since as string;
    if (args.action_since) params.action_since = args.action_since as string;
    if (args.sort) params.sort = args.sort as string;
    if (args.sponsor) params.sponsor = args.sponsor as string;
    if (args.sponsor_classification) params.sponsor_classification = args.sponsor_classification as string;
    if (args.q) params.q = args.q as string;
    if (args.page) params.page = String(args.page);
    if (args.per_page) params.per_page = String(args.per_page);
    const includes = this.parseInclude(args.include as string | undefined);
    for (const inc of includes) params[`include`] = inc; // last wins; append style not supported in URLSearchParams simply
    // Use array style for include
    const url = this.buildUrl('/bills', params);
    const finalUrl = includes.length > 0
      ? url + '&' + includes.map(i => `include=${encodeURIComponent(i)}`).join('&')
      : url;
    const response = await this.fetchWithRetry(finalUrl, { method: 'GET', headers: { 'x-api-key': this.apiKey } });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Open States returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getBillById(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.openstates_bill_id) return { content: [{ type: 'text', text: 'openstates_bill_id is required' }], isError: true };
    const params: Record<string, string | undefined> = {};
    const includes = this.parseInclude(args.include as string | undefined);
    const url = this.buildUrl(`/bills/ocd-bill/${encodeURIComponent(args.openstates_bill_id as string)}`, params);
    const finalUrl = includes.length > 0
      ? url + '&' + includes.map(i => `include=${encodeURIComponent(i)}`).join('&')
      : url;
    const response = await this.fetchWithRetry(finalUrl, { method: 'GET', headers: { 'x-api-key': this.apiKey } });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Open States returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getBill(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.jurisdiction) return { content: [{ type: 'text', text: 'jurisdiction is required' }], isError: true };
    if (!args.session) return { content: [{ type: 'text', text: 'session is required' }], isError: true };
    if (!args.bill_id) return { content: [{ type: 'text', text: 'bill_id is required' }], isError: true };
    const includes = this.parseInclude(args.include as string | undefined);
    const url = this.buildUrl(
      `/bills/${encodeURIComponent(args.jurisdiction as string)}/${encodeURIComponent(args.session as string)}/${encodeURIComponent(args.bill_id as string)}`,
      {}
    );
    const finalUrl = includes.length > 0
      ? url + '&' + includes.map(i => `include=${encodeURIComponent(i)}`).join('&')
      : url;
    const response = await this.fetchWithRetry(finalUrl, { method: 'GET', headers: { 'x-api-key': this.apiKey } });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Open States returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async searchPeople(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string | undefined> = {};
    if (args.jurisdiction) params.jurisdiction = args.jurisdiction as string;
    if (args.name) params.name = args.name as string;
    if (args.id) params.id = args.id as string;
    if (args.org_classification) params.org_classification = args.org_classification as string;
    if (args.district) params.district = args.district as string;
    if (args.page) params.page = String(args.page);
    if (args.per_page) params.per_page = String(args.per_page);
    const includes = this.parseInclude(args.include as string | undefined);
    const url = this.buildUrl('/people', params);
    const finalUrl = includes.length > 0
      ? url + '&' + includes.map(i => `include=${encodeURIComponent(i)}`).join('&')
      : url;
    const response = await this.fetchWithRetry(finalUrl, { method: 'GET', headers: { 'x-api-key': this.apiKey } });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Open States returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getPeopleByLocation(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.lat === undefined) return { content: [{ type: 'text', text: 'lat is required' }], isError: true };
    if (args.lng === undefined) return { content: [{ type: 'text', text: 'lng is required' }], isError: true };
    const params: Record<string, string | undefined> = {
      lat: String(args.lat),
      lng: String(args.lng),
    };
    const includes = this.parseInclude(args.include as string | undefined);
    const url = this.buildUrl('/people.geo', params);
    const finalUrl = includes.length > 0
      ? url + '&' + includes.map(i => `include=${encodeURIComponent(i)}`).join('&')
      : url;
    const response = await this.fetchWithRetry(finalUrl, { method: 'GET', headers: { 'x-api-key': this.apiKey } });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Open States returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listJurisdictions(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string | undefined> = {};
    if (args.classification) params.classification = args.classification as string;
    if (args.page) params.page = String(args.page);
    if (args.per_page) params.per_page = String(args.per_page);
    const includes = this.parseInclude(args.include as string | undefined);
    const url = this.buildUrl('/jurisdictions', params);
    const finalUrl = includes.length > 0
      ? url + '&' + includes.map(i => `include=${encodeURIComponent(i)}`).join('&')
      : url;
    const response = await this.fetchWithRetry(finalUrl, { method: 'GET', headers: { 'x-api-key': this.apiKey } });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Open States returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getJurisdiction(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.jurisdiction_id) return { content: [{ type: 'text', text: 'jurisdiction_id is required' }], isError: true };
    const includes = this.parseInclude(args.include as string | undefined);
    const url = this.buildUrl(`/jurisdictions/${encodeURIComponent(args.jurisdiction_id as string)}`, {});
    const finalUrl = includes.length > 0
      ? url + '&' + includes.map(i => `include=${encodeURIComponent(i)}`).join('&')
      : url;
    const response = await this.fetchWithRetry(finalUrl, { method: 'GET', headers: { 'x-api-key': this.apiKey } });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Open States returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listCommittees(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string | undefined> = {};
    if (args.jurisdiction) params.jurisdiction = args.jurisdiction as string;
    if (args.classification) params.classification = args.classification as string;
    if (args.parent) params.parent = args.parent as string;
    if (args.chamber) params.chamber = args.chamber as string;
    if (args.page) params.page = String(args.page);
    if (args.per_page) params.per_page = String(args.per_page);
    const includes = this.parseInclude(args.include as string | undefined);
    const url = this.buildUrl('/committees', params);
    const finalUrl = includes.length > 0
      ? url + '&' + includes.map(i => `include=${encodeURIComponent(i)}`).join('&')
      : url;
    const response = await this.fetchWithRetry(finalUrl, { method: 'GET', headers: { 'x-api-key': this.apiKey } });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Open States returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getCommittee(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.committee_id) return { content: [{ type: 'text', text: 'committee_id is required' }], isError: true };
    const includes = this.parseInclude(args.include as string | undefined);
    const url = this.buildUrl(`/committees/${encodeURIComponent(args.committee_id as string)}`, {});
    const finalUrl = includes.length > 0
      ? url + '&' + includes.map(i => `include=${encodeURIComponent(i)}`).join('&')
      : url;
    const response = await this.fetchWithRetry(finalUrl, { method: 'GET', headers: { 'x-api-key': this.apiKey } });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Open States returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listEvents(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string | undefined> = {};
    if (args.jurisdiction) params.jurisdiction = args.jurisdiction as string;
    if (args.deleted !== undefined) params.deleted = String(args.deleted);
    if (args.before) params.before = args.before as string;
    if (args.after) params.after = args.after as string;
    if (args.require_bills !== undefined) params.require_bills = String(args.require_bills);
    if (args.page) params.page = String(args.page);
    if (args.per_page) params.per_page = String(args.per_page);
    const includes = this.parseInclude(args.include as string | undefined);
    const url = this.buildUrl('/events', params);
    const finalUrl = includes.length > 0
      ? url + '&' + includes.map(i => `include=${encodeURIComponent(i)}`).join('&')
      : url;
    const response = await this.fetchWithRetry(finalUrl, { method: 'GET', headers: { 'x-api-key': this.apiKey } });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Open States returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getEvent(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.event_id) return { content: [{ type: 'text', text: 'event_id is required' }], isError: true };
    const includes = this.parseInclude(args.include as string | undefined);
    const url = this.buildUrl(`/events/${encodeURIComponent(args.event_id as string)}`, {});
    const finalUrl = includes.length > 0
      ? url + '&' + includes.map(i => `include=${encodeURIComponent(i)}`).join('&')
      : url;
    const response = await this.fetchWithRetry(finalUrl, { method: 'GET', headers: { 'x-api-key': this.apiKey } });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Open States returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getMetrics(): Promise<ToolResult> {
    return this.fetchGet('/metrics');
  }
}

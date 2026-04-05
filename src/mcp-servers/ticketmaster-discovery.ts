/**
 * Ticketmaster Discovery MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28. Ticketmaster has not published an official MCP server.
// Recommendation: use-rest-api
//
// Base URL: https://www.ticketmaster.com/discovery/v2
// Auth: API key via query param 'apikey' appended to every request
//       Generate at: https://developer.ticketmaster.com/products-and-docs/apis/getting-started/
// Docs: https://developer.ticketmaster.com/products-and-docs/apis/discovery-api/v2/
// Rate limits: 5,000 API calls per day (default), 200 requests per second

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface TicketmasterDiscoveryConfig {
  apiKey: string;
  baseUrl?: string;
}

export class TicketmasterDiscoveryMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: TicketmasterDiscoveryConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://www.ticketmaster.com/discovery/v2';
  }

  static catalog() {
    return {
      name: 'ticketmaster-discovery',
      displayName: 'Ticketmaster Discovery',
      version: '1.0.0',
      category: 'media',
      keywords: [
        'ticketmaster', 'events', 'concerts', 'tickets', 'venues', 'attractions',
        'sports', 'music', 'entertainment', 'live events', 'classifications', 'discovery',
      ],
      toolNames: [
        'search_events', 'get_event', 'get_event_images',
        'search_venues', 'get_venue',
        'search_attractions', 'get_attraction',
        'search_classifications', 'get_classification', 'get_genre', 'get_segment', 'get_subgenre',
        'suggest',
      ],
      description: 'Ticketmaster Discovery API: search events, venues, attractions, and classifications across the Ticketmaster ecosystem.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'search_events',
        description: 'Search for live events on Ticketmaster with filters for city, date, venue, classification, and location',
        inputSchema: {
          type: 'object',
          properties: {
            keyword: { type: 'string', description: 'Keyword to search on' },
            city: { type: 'string', description: 'Filter events by city' },
            stateCode: { type: 'string', description: 'Filter events by state code (e.g. CA)' },
            countryCode: { type: 'string', description: 'Filter events by country code (e.g. US)' },
            postalCode: { type: 'string', description: 'Filter events by postal code / zipcode' },
            startDateTime: { type: 'string', description: 'Filter events starting after this date (ISO 8601, e.g. 2026-01-01T00:00:00Z)' },
            endDateTime: { type: 'string', description: 'Filter events starting before this date (ISO 8601)' },
            venueId: { type: 'string', description: 'Filter events by venue id' },
            attractionId: { type: 'string', description: 'Filter events by attraction id' },
            segmentId: { type: 'string', description: 'Filter events by segment id' },
            segmentName: { type: 'string', description: 'Filter events by segment name (e.g. Sports, Music)' },
            classificationName: { type: 'string', description: 'Filter events by classification name (segment, genre, or sub-genre name)' },
            classificationId: { type: 'string', description: 'Filter events by classification id' },
            marketId: { type: 'string', description: 'Filter events by market id' },
            promoterId: { type: 'string', description: 'Filter events by promoter id' },
            geoPoint: { type: 'string', description: 'Filter events by geoHash' },
            radius: { type: 'string', description: 'Radius of the area to search for events' },
            unit: { type: 'string', description: 'Unit of the radius: miles or km' },
            sort: { type: 'string', description: "Sort order (e.g. 'name,asc', 'date,asc', 'relevance,desc')" },
            page: { type: 'number', description: 'Page number (default: 0)' },
            size: { type: 'number', description: 'Page size (default: 20, max: 200)' },
            locale: { type: 'string', description: 'Locale in ISO code format (e.g. en-us)' },
          },
        },
      },
      {
        name: 'get_event',
        description: 'Get detailed information for a specific Ticketmaster event by its event ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Ticketmaster event ID' },
            locale: { type: 'string', description: 'Locale in ISO code format' },
          },
          required: ['id'],
        },
      },
      {
        name: 'get_event_images',
        description: 'Get all images (photos, banners) for a specific Ticketmaster event',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Ticketmaster event ID' },
            locale: { type: 'string', description: 'Locale in ISO code format' },
          },
          required: ['id'],
        },
      },
      {
        name: 'search_venues',
        description: 'Search for venues on Ticketmaster by keyword, location, state, or country',
        inputSchema: {
          type: 'object',
          properties: {
            keyword: { type: 'string', description: 'Keyword to search on' },
            stateCode: { type: 'string', description: 'Filter venues by state / province code' },
            countryCode: { type: 'string', description: 'Filter venues by country code' },
            geoPoint: { type: 'string', description: 'Filter venues by geoHash' },
            radius: { type: 'string', description: 'Radius of the area to search' },
            unit: { type: 'string', description: 'Unit of the radius: miles or km' },
            sort: { type: 'string', description: "Sort order (e.g. 'name,asc', 'relevance,desc')" },
            page: { type: 'number', description: 'Page number (default: 0)' },
            size: { type: 'number', description: 'Page size (default: 20, max: 200)' },
            locale: { type: 'string', description: 'Locale in ISO code format' },
          },
        },
      },
      {
        name: 'get_venue',
        description: 'Get detailed information for a specific Ticketmaster venue by its venue ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Ticketmaster venue ID' },
            locale: { type: 'string', description: 'Locale in ISO code format' },
          },
          required: ['id'],
        },
      },
      {
        name: 'search_attractions',
        description: 'Search for attractions (artists, teams, performers) on Ticketmaster by keyword or classification',
        inputSchema: {
          type: 'object',
          properties: {
            keyword: { type: 'string', description: 'Keyword to search on' },
            classificationName: { type: 'string', description: 'Filter by classification name (segment, genre, or sub-genre)' },
            classificationId: { type: 'string', description: 'Filter by classification id' },
            sort: { type: 'string', description: "Sort order (e.g. 'name,asc', 'relevance,desc')" },
            page: { type: 'number', description: 'Page number (default: 0)' },
            size: { type: 'number', description: 'Page size (default: 20, max: 200)' },
            locale: { type: 'string', description: 'Locale in ISO code format' },
          },
        },
      },
      {
        name: 'get_attraction',
        description: 'Get detailed information for a specific Ticketmaster attraction (artist, team, performer) by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Ticketmaster attraction ID' },
            locale: { type: 'string', description: 'Locale in ISO code format' },
          },
          required: ['id'],
        },
      },
      {
        name: 'search_classifications',
        description: 'Search Ticketmaster event classifications (segments, genres, sub-genres, types) by keyword',
        inputSchema: {
          type: 'object',
          properties: {
            keyword: { type: 'string', description: 'Keyword to search on' },
            sort: { type: 'string', description: "Sort order (e.g. 'name,asc')" },
            page: { type: 'number', description: 'Page number (default: 0)' },
            size: { type: 'number', description: 'Page size (default: 20, max: 200)' },
            locale: { type: 'string', description: 'Locale in ISO code format' },
          },
        },
      },
      {
        name: 'get_classification',
        description: 'Get details for a specific Ticketmaster classification by its ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Classification ID' },
            locale: { type: 'string', description: 'Locale in ISO code format' },
          },
          required: ['id'],
        },
      },
      {
        name: 'get_genre',
        description: 'Get details for a specific Ticketmaster genre by its ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Genre ID' },
            locale: { type: 'string', description: 'Locale in ISO code format' },
          },
          required: ['id'],
        },
      },
      {
        name: 'get_segment',
        description: 'Get details for a specific Ticketmaster segment (top-level category) by its ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Segment ID' },
            locale: { type: 'string', description: 'Locale in ISO code format' },
          },
          required: ['id'],
        },
      },
      {
        name: 'get_subgenre',
        description: 'Get details for a specific Ticketmaster sub-genre by its ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Sub-genre ID' },
            locale: { type: 'string', description: 'Locale in ISO code format' },
          },
          required: ['id'],
        },
      },
      {
        name: 'suggest',
        description: 'Get autocomplete suggestions for events, venues, and attractions by keyword on Ticketmaster',
        inputSchema: {
          type: 'object',
          properties: {
            keyword: { type: 'string', description: 'Keyword to search on' },
            source: { type: 'string', description: 'Filter suggestions by source name' },
            countryCode: { type: 'string', description: 'Filter suggestions by country code' },
            segmentId: { type: 'string', description: 'Filter suggestions by segment id' },
            geoPoint: { type: 'string', description: 'Filter by geoHash' },
            radius: { type: 'string', description: 'Radius of the area to search' },
            unit: { type: 'string', description: 'Unit of the radius: miles or km' },
            size: { type: 'string', description: 'Size of every entity returned (default: 5)' },
            locale: { type: 'string', description: 'Locale in ISO code format' },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'search_events':      return this.searchEvents(args);
        case 'get_event':          return this.getEvent(args);
        case 'get_event_images':   return this.getEventImages(args);
        case 'search_venues':      return this.searchVenues(args);
        case 'get_venue':          return this.getVenue(args);
        case 'search_attractions': return this.searchAttractions(args);
        case 'get_attraction':     return this.getAttraction(args);
        case 'search_classifications': return this.searchClassifications(args);
        case 'get_classification': return this.getClassification(args);
        case 'get_genre':          return this.getGenre(args);
        case 'get_segment':        return this.getSegment(args);
        case 'get_subgenre':       return this.getSubgenre(args);
        case 'suggest':            return this.suggest(args);
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

  private buildQs(params: Record<string, string | number | boolean | undefined>): string {
    const p = new URLSearchParams({ apikey: this.apiKey });
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) p.set(k, String(v));
    }
    return '?' + p.toString();
  }

  private async apiGet(path: string, params: Record<string, string | number | boolean | undefined> = {}): Promise<ToolResult> {
    const url = `${this.baseUrl}${path}${this.buildQs(params)}`;
    const response = await this.fetchWithRetry(url, {
      headers: { 'Accept': 'application/json' },
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async searchEvents(args: Record<string, unknown>): Promise<ToolResult> {
    return this.apiGet('/events', {
      keyword:            args.keyword as string,
      city:               args.city as string,
      stateCode:          args.stateCode as string,
      countryCode:        args.countryCode as string,
      postalCode:         args.postalCode as string,
      startDateTime:      args.startDateTime as string,
      endDateTime:        args.endDateTime as string,
      venueId:            args.venueId as string,
      attractionId:       args.attractionId as string,
      segmentId:          args.segmentId as string,
      segmentName:        args.segmentName as string,
      classificationName: args.classificationName as string,
      classificationId:   args.classificationId as string,
      marketId:           args.marketId as string,
      promoterId:         args.promoterId as string,
      geoPoint:           args.geoPoint as string,
      radius:             args.radius as string,
      unit:               args.unit as string,
      sort:               args.sort as string,
      page:               args.page as number,
      size:               args.size as number,
      locale:             args.locale as string,
    });
  }

  private async getEvent(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.apiGet(`/events/${encodeURIComponent(args.id as string)}`, {
      locale: args.locale as string,
    });
  }

  private async getEventImages(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.apiGet(`/events/${encodeURIComponent(args.id as string)}/images`, {
      locale: args.locale as string,
    });
  }

  private async searchVenues(args: Record<string, unknown>): Promise<ToolResult> {
    return this.apiGet('/venues', {
      keyword:     args.keyword as string,
      stateCode:   args.stateCode as string,
      countryCode: args.countryCode as string,
      geoPoint:    args.geoPoint as string,
      radius:      args.radius as string,
      unit:        args.unit as string,
      sort:        args.sort as string,
      page:        args.page as number,
      size:        args.size as number,
      locale:      args.locale as string,
    });
  }

  private async getVenue(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.apiGet(`/venues/${encodeURIComponent(args.id as string)}`, {
      locale: args.locale as string,
    });
  }

  private async searchAttractions(args: Record<string, unknown>): Promise<ToolResult> {
    return this.apiGet('/attractions', {
      keyword:            args.keyword as string,
      classificationName: args.classificationName as string,
      classificationId:   args.classificationId as string,
      sort:               args.sort as string,
      page:               args.page as number,
      size:               args.size as number,
      locale:             args.locale as string,
    });
  }

  private async getAttraction(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.apiGet(`/attractions/${encodeURIComponent(args.id as string)}`, {
      locale: args.locale as string,
    });
  }

  private async searchClassifications(args: Record<string, unknown>): Promise<ToolResult> {
    return this.apiGet('/classifications', {
      keyword: args.keyword as string,
      sort:    args.sort as string,
      page:    args.page as number,
      size:    args.size as number,
      locale:  args.locale as string,
    });
  }

  private async getClassification(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.apiGet(`/classifications/${encodeURIComponent(args.id as string)}`, {
      locale: args.locale as string,
    });
  }

  private async getGenre(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.apiGet(`/classifications/genres/${encodeURIComponent(args.id as string)}`, {
      locale: args.locale as string,
    });
  }

  private async getSegment(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.apiGet(`/classifications/segments/${encodeURIComponent(args.id as string)}`, {
      locale: args.locale as string,
    });
  }

  private async getSubgenre(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.apiGet(`/classifications/subgenres/${encodeURIComponent(args.id as string)}`, {
      locale: args.locale as string,
    });
  }

  private async suggest(args: Record<string, unknown>): Promise<ToolResult> {
    return this.apiGet('/suggest', {
      keyword:     args.keyword as string,
      source:      args.source as string,
      countryCode: args.countryCode as string,
      segmentId:   args.segmentId as string,
      geoPoint:    args.geoPoint as string,
      radius:      args.radius as string,
      unit:        args.unit as string,
      size:        args.size as string,
      locale:      args.locale as string,
    });
  }
}

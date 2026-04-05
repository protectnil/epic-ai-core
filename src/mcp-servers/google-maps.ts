/**
 * Google Maps MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://developers.google.com/maps/ai/grounding-lite/reference/mcp (Maps Grounding Lite)
//   — transport: streamable-HTTP (Google-hosted), auth: API key (x-goog-api-key)
//   — Announced 2025-12-10. Exposes only 3 tools: search_places, lookup_weather, compute_routes.
//   — Fails criterion 3 (fewer than 10 tools). REST adapter is richer and required.
//   — A second official MCP exists for documentation only (googlemaps/platform-ai — Code Assist toolkit);
//     it grounds LLMs on Maps Platform docs and code samples, not on live Maps API calls.
// Our adapter covers: 10 tools. Vendor MCP covers: 3 tools.
// Recommendation: use-rest-api — vendor MCP exposes only 3 tools vs our 10; REST adapter is the richer integration.
//
// Base URL: https://maps.googleapis.com/maps/api  (Geocoding, Directions, Distance Matrix, Elevation, Time Zone)
//           https://places.googleapis.com/v1       (Places API New — get_place_details, validate_address)
//           https://addressvalidation.googleapis.com/v1  (Address Validation API)
// Auth: API key passed as key query parameter (legacy APIs) or x-goog-api-key header (Places API New)
// Docs: https://developers.google.com/maps/documentation
// Rate limits: Geocoding: 50 req/s; Places: 600 req/min; Directions: 50 req/s (per project)

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface GoogleMapsConfig {
  apiKey: string;
  baseUrl?: string;
  placesBaseUrl?: string;
}

export class GoogleMapsMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly placesBaseUrl: string;

  constructor(config: GoogleMapsConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://maps.googleapis.com/maps/api';
    this.placesBaseUrl = config.placesBaseUrl || 'https://places.googleapis.com/v1';
  }

  static catalog() {
    return {
      name: 'google-maps',
      displayName: 'Google Maps',
      version: '1.0.0',
      category: 'misc',
      keywords: [
        'google', 'maps', 'geocoding', 'geolocation', 'places', 'directions', 'routing',
        'distance', 'navigation', 'address', 'coordinates', 'latitude', 'longitude',
        'nearby', 'search', 'elevation', 'timezone', 'reverse geocode', 'waypoints',
      ],
      toolNames: [
        'geocode', 'reverse_geocode',
        'get_directions', 'get_distance_matrix',
        'search_places_nearby', 'search_places_text', 'get_place_details',
        'get_elevation', 'get_timezone',
        'validate_address',
      ],
      description: 'Google Maps Platform: geocode addresses, reverse geocode coordinates, get directions, calculate distances, search and retrieve place details, get elevation and timezone data.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'geocode',
        description: 'Convert a street address or place name to geographic coordinates (latitude and longitude)',
        inputSchema: {
          type: 'object',
          properties: {
            address: {
              type: 'string',
              description: 'Street address or place name to geocode (e.g. "1600 Amphitheatre Pkwy, Mountain View, CA")',
            },
            components: {
              type: 'string',
              description: 'Optional component filter: country:US|postal_code:94043 to narrow results',
            },
            language: {
              type: 'string',
              description: 'Language code for results (e.g. en, fr, de — default: en)',
            },
            region: {
              type: 'string',
              description: 'Region bias as a ccTLD two-character value (e.g. us, uk, de)',
            },
          },
          required: ['address'],
        },
      },
      {
        name: 'reverse_geocode',
        description: 'Convert geographic coordinates (latitude, longitude) to a human-readable street address',
        inputSchema: {
          type: 'object',
          properties: {
            lat: {
              type: 'number',
              description: 'Latitude of the location (e.g. 37.4224764)',
            },
            lng: {
              type: 'number',
              description: 'Longitude of the location (e.g. -122.0842499)',
            },
            result_type: {
              type: 'string',
              description: 'Filter results by address type (e.g. street_address|postal_code)',
            },
            location_type: {
              type: 'string',
              description: 'Filter by location type: ROOFTOP, RANGE_INTERPOLATED, GEOMETRIC_CENTER, APPROXIMATE',
            },
            language: {
              type: 'string',
              description: 'Language code for results (default: en)',
            },
          },
          required: ['lat', 'lng'],
        },
      },
      {
        name: 'get_directions',
        description: 'Get turn-by-turn directions between an origin and destination with optional waypoints and travel mode',
        inputSchema: {
          type: 'object',
          properties: {
            origin: {
              type: 'string',
              description: 'Starting location as address or "lat,lng" (e.g. "New York, NY" or "40.7128,-74.0060")',
            },
            destination: {
              type: 'string',
              description: 'Ending location as address or "lat,lng"',
            },
            mode: {
              type: 'string',
              description: 'Travel mode: driving, walking, bicycling, or transit (default: driving)',
            },
            waypoints: {
              type: 'string',
              description: 'Pipe-separated intermediate stops (e.g. "Chicago, IL|St. Louis, MO")',
            },
            avoid: {
              type: 'string',
              description: 'Features to avoid, pipe-separated: tolls|highways|ferries|indoor',
            },
            departure_time: {
              type: 'string',
              description: 'Departure time for traffic-aware routing: "now" or Unix timestamp string',
            },
            alternatives: {
              type: 'boolean',
              description: 'Return alternative routes (default: false)',
            },
            units: {
              type: 'string',
              description: 'Distance units: metric or imperial (default: metric)',
            },
            language: {
              type: 'string',
              description: 'Language code for step-by-step instructions (default: en)',
            },
          },
          required: ['origin', 'destination'],
        },
      },
      {
        name: 'get_distance_matrix',
        description: 'Calculate travel distances and times between multiple origins and destinations in a matrix',
        inputSchema: {
          type: 'object',
          properties: {
            origins: {
              type: 'string',
              description: 'Pipe-separated origin locations as addresses or "lat,lng" (e.g. "New York, NY|Boston, MA")',
            },
            destinations: {
              type: 'string',
              description: 'Pipe-separated destination locations as addresses or "lat,lng"',
            },
            mode: {
              type: 'string',
              description: 'Travel mode: driving, walking, bicycling, or transit (default: driving)',
            },
            avoid: {
              type: 'string',
              description: 'Features to avoid: tolls|highways|ferries',
            },
            departure_time: {
              type: 'string',
              description: 'Departure time for traffic-aware results: "now" or Unix timestamp string',
            },
            units: {
              type: 'string',
              description: 'Distance units: metric or imperial (default: metric)',
            },
            language: {
              type: 'string',
              description: 'Language code for results (default: en)',
            },
          },
          required: ['origins', 'destinations'],
        },
      },
      {
        name: 'search_places_nearby',
        description: 'Search for places near a location by type or keyword, returning name, address, rating, and location',
        inputSchema: {
          type: 'object',
          properties: {
            location: {
              type: 'string',
              description: 'Center point as "lat,lng" (e.g. "37.4219999,-122.0840575")',
            },
            radius: {
              type: 'number',
              description: 'Search radius in meters (max 50000, default: 1000)',
            },
            type: {
              type: 'string',
              description: 'Place type to filter by (e.g. restaurant, hospital, gas_station, hotel, pharmacy)',
            },
            keyword: {
              type: 'string',
              description: 'Keyword to search for within place names, types, and reviews',
            },
            min_rating: {
              type: 'number',
              description: 'Minimum Google rating (0.0 to 5.0)',
            },
            open_now: {
              type: 'boolean',
              description: 'Return only places currently open (default: false)',
            },
            max_results: {
              type: 'number',
              description: 'Maximum number of results to return (max 20, default: 20)',
            },
            language: {
              type: 'string',
              description: 'Language code for results (default: en)',
            },
          },
          required: ['location'],
        },
      },
      {
        name: 'search_places_text',
        description: 'Search for places using a free-form text query, returning matching businesses and locations',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Text search query (e.g. "pizza near Times Square" or "coffee shops in Brooklyn")',
            },
            location: {
              type: 'string',
              description: 'Optional center point bias as "lat,lng"',
            },
            radius: {
              type: 'number',
              description: 'Optional search radius in meters to bias results (max 50000)',
            },
            type: {
              type: 'string',
              description: 'Optional place type filter (e.g. restaurant, hospital)',
            },
            open_now: {
              type: 'boolean',
              description: 'Return only places currently open (default: false)',
            },
            language: {
              type: 'string',
              description: 'Language code for results (default: en)',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'get_place_details',
        description: 'Get detailed information about a place by Place ID, including address, hours, phone, website, and reviews',
        inputSchema: {
          type: 'object',
          properties: {
            place_id: {
              type: 'string',
              description: 'Google Place ID (e.g. ChIJN1t_tDeuEmsRUsoyG83frY4)',
            },
            fields: {
              type: 'string',
              description: 'Comma-separated fields to return (e.g. displayName,formattedAddress,regularOpeningHours,rating,phoneNumber,websiteUri). Default: all basic fields.',
            },
            language: {
              type: 'string',
              description: 'Language code for results (default: en)',
            },
          },
          required: ['place_id'],
        },
      },
      {
        name: 'get_elevation',
        description: 'Get the elevation in meters above sea level for one or more geographic coordinates',
        inputSchema: {
          type: 'object',
          properties: {
            locations: {
              type: 'string',
              description: 'Pipe-separated "lat,lng" coordinate pairs (e.g. "36.455556,-116.866667|36.455,-116.866")',
            },
            samples: {
              type: 'number',
              description: 'For path elevation: number of sample points along the path (use with path parameter)',
            },
            path: {
              type: 'string',
              description: 'Path for sampled elevation: pipe-separated "lat,lng" points (use with samples parameter)',
            },
          },
        },
      },
      {
        name: 'get_timezone',
        description: 'Get the time zone name, UTC offset, and DST offset for a geographic location at a specific time',
        inputSchema: {
          type: 'object',
          properties: {
            location: {
              type: 'string',
              description: 'Location as "lat,lng" (e.g. "39.603481,-119.682251")',
            },
            timestamp: {
              type: 'number',
              description: 'Unix timestamp (seconds since epoch) to check DST at a specific time (default: current time)',
            },
            language: {
              type: 'string',
              description: 'Language code for the time zone name (default: en)',
            },
          },
          required: ['location'],
        },
      },
      {
        name: 'validate_address',
        description: 'Validate and standardize a postal address using the Google Address Validation API, returning verdict and corrected address components',
        inputSchema: {
          type: 'object',
          properties: {
            address_lines: {
              type: 'array',
              description: 'Address lines as an array of strings (e.g. ["1600 Amphitheatre Pkwy", "Mountain View, CA 94043"])',
            },
            region_code: {
              type: 'string',
              description: 'CLDR region/country code (e.g. US, GB, DE)',
            },
            locality: {
              type: 'string',
              description: 'City or locality name',
            },
            enable_usps_cass: {
              type: 'boolean',
              description: 'Enable USPS CASS validation for US addresses (default: false)',
            },
          },
          required: ['address_lines'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'geocode':
          return this.geocode(args);
        case 'reverse_geocode':
          return this.reverseGeocode(args);
        case 'get_directions':
          return this.getDirections(args);
        case 'get_distance_matrix':
          return this.getDistanceMatrix(args);
        case 'search_places_nearby':
          return this.searchPlacesNearby(args);
        case 'search_places_text':
          return this.searchPlacesText(args);
        case 'get_place_details':
          return this.getPlaceDetails(args);
        case 'get_elevation':
          return this.getElevation(args);
        case 'get_timezone':
          return this.getTimezone(args);
        case 'validate_address':
          return this.validateAddress(args);
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

  private async mapsGet(endpoint: string, params: Record<string, string>): Promise<ToolResult> {
    params.key = this.apiKey;
    const qs = new URLSearchParams(params).toString();
    const url = `${this.baseUrl}/${endpoint}/json?${qs}`;
    const response = await this.fetchWithRetry(url, { method: 'GET' });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json() as { status?: string; error_message?: string };
    if (data.status && data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      return {
        content: [{ type: 'text', text: `Maps API error: ${data.status}${data.error_message ? ' — ' + data.error_message : ''}` }],
        isError: true,
      };
    }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async placesGet(path: string, params: Record<string, string>): Promise<ToolResult> {
    params.key = this.apiKey;
    const qs = new URLSearchParams(params).toString();
    const url = `${this.baseUrl}/place/${path}/json?${qs}`;
    const response = await this.fetchWithRetry(url, { method: 'GET' });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json() as { status?: string; error_message?: string };
    if (data.status && data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      return {
        content: [{ type: 'text', text: `Places API error: ${data.status}${data.error_message ? ' — ' + data.error_message : ''}` }],
        isError: true,
      };
    }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async geocode(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.address) return { content: [{ type: 'text', text: 'address is required' }], isError: true };
    const params: Record<string, string> = { address: args.address as string };
    if (args.components) params.components = args.components as string;
    if (args.language) params.language = args.language as string;
    if (args.region) params.region = args.region as string;
    return this.mapsGet('geocode', params);
  }

  private async reverseGeocode(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.lat === undefined || args.lng === undefined) return { content: [{ type: 'text', text: 'lat and lng are required' }], isError: true };
    const params: Record<string, string> = { latlng: `${args.lat as number},${args.lng as number}` };
    if (args.result_type) params.result_type = args.result_type as string;
    if (args.location_type) params.location_type = args.location_type as string;
    if (args.language) params.language = args.language as string;
    return this.mapsGet('geocode', params);
  }

  private async getDirections(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.origin || !args.destination) return { content: [{ type: 'text', text: 'origin and destination are required' }], isError: true };
    const params: Record<string, string> = {
      origin: args.origin as string,
      destination: args.destination as string,
      mode: (args.mode as string) || 'driving',
    };
    if (args.waypoints) params.waypoints = args.waypoints as string;
    if (args.avoid) params.avoid = args.avoid as string;
    if (args.departure_time) params.departure_time = args.departure_time as string;
    if (typeof args.alternatives === 'boolean') params.alternatives = String(args.alternatives);
    if (args.units) params.units = args.units as string;
    if (args.language) params.language = args.language as string;
    return this.mapsGet('directions', params);
  }

  private async getDistanceMatrix(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.origins || !args.destinations) return { content: [{ type: 'text', text: 'origins and destinations are required' }], isError: true };
    const params: Record<string, string> = {
      origins: args.origins as string,
      destinations: args.destinations as string,
      mode: (args.mode as string) || 'driving',
    };
    if (args.avoid) params.avoid = args.avoid as string;
    if (args.departure_time) params.departure_time = args.departure_time as string;
    if (args.units) params.units = args.units as string;
    if (args.language) params.language = args.language as string;
    return this.mapsGet('distancematrix', params);
  }

  private async searchPlacesNearby(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.location) return { content: [{ type: 'text', text: 'location is required' }], isError: true };
    const params: Record<string, string> = {
      location: args.location as string,
      radius: String((args.radius as number) || 1000),
    };
    if (args.type) params.type = args.type as string;
    if (args.keyword) params.keyword = args.keyword as string;
    // min_rating has no equivalent parameter in the legacy Nearby Search API (minprice is price level 0-4, not rating)
    if (typeof args.open_now === 'boolean') params.opennow = String(args.open_now);
    if (args.language) params.language = args.language as string;
    return this.placesGet('nearbysearch', params);
  }

  private async searchPlacesText(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.query) return { content: [{ type: 'text', text: 'query is required' }], isError: true };
    const params: Record<string, string> = { query: args.query as string };
    if (args.location) params.location = args.location as string;
    if (args.radius) params.radius = String(args.radius);
    if (args.type) params.type = args.type as string;
    if (typeof args.open_now === 'boolean') params.opennow = String(args.open_now);
    if (args.language) params.language = args.language as string;
    return this.placesGet('textsearch', params);
  }

  private async getPlaceDetails(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.place_id) return { content: [{ type: 'text', text: 'place_id is required' }], isError: true };
    // Use Places API (New) GET /places/{place_id} for richer place details
    const defaultFields = 'id,displayName,formattedAddress,location,rating,userRatingCount,regularOpeningHours,internationalPhoneNumber,websiteUri,types,priceLevel';
    const fieldMask = (args.fields as string) || defaultFields;
    const headers: Record<string, string> = {
      'x-goog-api-key': this.apiKey,
      'Content-Type': 'application/json',
      'X-Goog-FieldMask': fieldMask,
    };
    if (args.language) headers['Accept-Language'] = args.language as string;
    const response = await this.fetchWithRetry(
      `${this.placesBaseUrl}/places/${encodeURIComponent(args.place_id as string)}`,
      { method: 'GET', headers },
    );
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `API error: ${response.status} ${errText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getElevation(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (args.locations) {
      params.locations = args.locations as string;
    } else if (args.path && args.samples) {
      params.path = args.path as string;
      params.samples = String(args.samples);
    } else {
      return { content: [{ type: 'text', text: 'Either locations or path+samples are required' }], isError: true };
    }
    return this.mapsGet('elevation', params);
  }

  private async getTimezone(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.location) return { content: [{ type: 'text', text: 'location is required' }], isError: true };
    const timestamp = (args.timestamp as number) || Math.floor(Date.now() / 1000);
    const params: Record<string, string> = {
      location: args.location as string,
      timestamp: String(timestamp),
    };
    if (args.language) params.language = args.language as string;
    return this.mapsGet('timezone', params);
  }

  private async validateAddress(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.address_lines) return { content: [{ type: 'text', text: 'address_lines is required' }], isError: true };
    const address: Record<string, unknown> = {
      addressLines: args.address_lines,
    };
    if (args.region_code) address.regionCode = args.region_code;
    if (args.locality) address.locality = args.locality;

    const body: Record<string, unknown> = { address };
    if (typeof args.enable_usps_cass === 'boolean') body.enableUspsCass = args.enable_usps_cass;

    const headers: Record<string, string> = {
      'x-goog-api-key': this.apiKey,
      'Content-Type': 'application/json',
    };
    const response = await this.fetchWithRetry('https://addressvalidation.googleapis.com/v1:validateAddress', {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `API error: ${response.status} ${errText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }
}

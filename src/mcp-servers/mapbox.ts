/**
 * Mapbox MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/mapbox/mcp-server — transport: stdio/streamable-HTTP, auth: access token
// Our adapter covers: 12 tools. Vendor MCP covers: 13 tools (forward_geocode_tool, reverse_geocode_tool,
//   directions_tool, matrix_tool, isochrone_tool, optimization_tool, map_matching_tool,
//   search_and_geocode_tool, category_search_tool, poi_search_tool, static_map_image_tool,
//   resource_reader_tool, version_tool).
// Note: A second official Mapbox DevKit MCP server also exists at https://github.com/mapbox/mcp-devkit-server
//   covering style management, token creation, and validation (developer tooling, not location intelligence).
// Integration: use-both
// MCP-sourced tools (2): optimization_tool, map_matching_tool (not covered by our REST adapter)
// REST-sourced tools (10): geocode_forward, geocode_reverse, geocode_batch, get_isochrone,
//   get_travel_matrix, get_directions, search_places, get_static_map, list_styles, get_style,
//   list_datasets, list_tokens (styles/datasets/tokens not in vendor MCP)
// Combined coverage: both transports needed for full surface. MCP handles optimization and map-matching;
//   REST adapter handles styles API, Datasets API, Tokens API, and batch geocoding not in MCP.
// Recommendation: route optimization_tool and map_matching_tool through vendor MCP; all others via this adapter.
//
// Base URL: https://api.mapbox.com
// Auth: Access token appended as ?access_token={token} query parameter on every request
// Docs: https://docs.mapbox.com/api/overview/
// Rate limits: Directions API: 300 req/min. Geocoding API (v5): 600 req/min. Geocoding API (v6): 1000 req/min.
//              Matrix API (driving/walking/cycling): 60 req/min. Matrix API (driving-traffic): 30 req/min.
//              Isochrone: 300 req/min. Static Images: 600 req/min. Tokens API: 100 req/min.
//              Datasets API (Read): 480 req/min. Datasets API (Write): 40 req/min.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface MapboxConfig {
  accessToken: string;
  baseUrl?: string;
}

export class MapboxMCPServer extends MCPAdapterBase {
  private readonly token: string;
  private readonly baseUrl: string;

  constructor(config: MapboxConfig) {
    super();
    this.token = config.accessToken;
    this.baseUrl = (config.baseUrl ?? 'https://api.mapbox.com').replace(/\/$/, '');
  }

  static catalog() {
    return {
      name: 'mapbox',
      displayName: 'Mapbox',
      version: '1.0.0',
      category: 'misc',
      keywords: [
        'mapbox', 'geocoding', 'reverse geocoding', 'directions', 'routing', 'maps', 'location',
        'address', 'coordinates', 'latitude', 'longitude', 'navigation', 'isochrone', 'matrix',
        'travel time', 'poi', 'places', 'static map', 'geospatial', 'gis',
      ],
      toolNames: [
        'geocode_forward', 'geocode_reverse', 'geocode_batch',
        'get_directions', 'get_travel_matrix', 'get_isochrone',
        'search_places', 'get_static_map',
        'list_styles', 'get_style',
        'list_datasets', 'list_tokens',
      ],
      description: 'Mapbox location platform: forward and reverse geocoding, multi-modal turn-by-turn directions, travel time matrices, isochrones, place search, and static map image generation.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'geocode_forward',
        description: 'Convert a place name or address string to geographic coordinates (latitude/longitude) with optional country and proximity biasing',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Address, place name, or landmark to geocode (e.g. "1600 Pennsylvania Ave NW, Washington DC")',
            },
            country: {
              type: 'string',
              description: 'Comma-separated ISO 3166-1 country codes to restrict results (e.g. "us,ca")',
            },
            proximity: {
              type: 'string',
              description: 'Longitude,latitude to bias results toward (e.g. "-77.0366,38.8971")',
            },
            types: {
              type: 'string',
              description: 'Comma-separated feature types to filter: country, region, postcode, district, place, locality, neighborhood, address, poi',
            },
            language: {
              type: 'string',
              description: 'BCP 47 language code for response text (e.g. en, fr, de — default: en)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results to return (default: 5, max: 10)',
            },
            autocomplete: {
              type: 'boolean',
              description: 'Return partial-match results for typeahead (default: true)',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'geocode_reverse',
        description: 'Convert latitude/longitude coordinates to a human-readable address or place name',
        inputSchema: {
          type: 'object',
          properties: {
            longitude: {
              type: 'number',
              description: 'Longitude in decimal degrees (e.g. -77.0366)',
            },
            latitude: {
              type: 'number',
              description: 'Latitude in decimal degrees (e.g. 38.8971)',
            },
            types: {
              type: 'string',
              description: 'Comma-separated feature types to return: country, region, postcode, district, place, locality, neighborhood, address, poi',
            },
            language: {
              type: 'string',
              description: 'BCP 47 language code for response text (default: en)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results to return (default: 1, max: 5)',
            },
          },
          required: ['longitude', 'latitude'],
        },
      },
      {
        name: 'geocode_batch',
        description: 'Geocode up to 1000 addresses or place names in a single POST request using Mapbox Geocoding v6 Batch',
        inputSchema: {
          type: 'object',
          properties: {
            queries: {
              type: 'string',
              description: 'JSON array of address strings to geocode (max 1000), e.g. ["Times Square, NY", "Golden Gate Bridge, CA"]',
            },
            country: {
              type: 'string',
              description: 'ISO 3166-1 country codes to restrict results (comma-separated)',
            },
            language: {
              type: 'string',
              description: 'BCP 47 language code for response text (default: en)',
            },
          },
          required: ['queries'],
        },
      },
      {
        name: 'get_directions',
        description: 'Get turn-by-turn directions between two or more waypoints for driving, walking, or cycling with distance and duration',
        inputSchema: {
          type: 'object',
          properties: {
            coordinates: {
              type: 'string',
              description: 'Semicolon-separated longitude,latitude waypoints (e.g. "-77.0366,38.8971;-77.0076,38.8897"). Min 2, max 25.',
            },
            profile: {
              type: 'string',
              description: 'Routing profile: driving-traffic (real-time), driving, walking, or cycling (default: driving-traffic)',
            },
            alternatives: {
              type: 'boolean',
              description: 'Return alternative routes when available (default: false)',
            },
            geometries: {
              type: 'string',
              description: 'Route geometry format: geojson, polyline, or polyline6 (default: geojson)',
            },
            steps: {
              type: 'boolean',
              description: 'Include turn-by-turn step instructions (default: false)',
            },
            banner_instructions: {
              type: 'boolean',
              description: 'Include visual banner instructions for navigation display (default: false)',
            },
            language: {
              type: 'string',
              description: 'Language for turn-by-turn instructions (default: en)',
            },
          },
          required: ['coordinates'],
        },
      },
      {
        name: 'get_travel_matrix',
        description: 'Compute a travel time and distance matrix between multiple origins and destinations in a single request',
        inputSchema: {
          type: 'object',
          properties: {
            coordinates: {
              type: 'string',
              description: 'Semicolon-separated longitude,latitude points. All points serve as both origins and destinations unless sources/destinations are specified. Max 25 total.',
            },
            profile: {
              type: 'string',
              description: 'Routing profile: driving-traffic, driving, walking, or cycling (default: driving)',
            },
            sources: {
              type: 'string',
              description: 'Semicolon-separated indices of origin points from coordinates (e.g. "0;1" — default: all)',
            },
            destinations: {
              type: 'string',
              description: 'Semicolon-separated indices of destination points from coordinates (default: all)',
            },
            annotations: {
              type: 'string',
              description: 'Comma-separated data to return: duration, distance (default: duration)',
            },
          },
          required: ['coordinates'],
        },
      },
      {
        name: 'get_isochrone',
        description: 'Calculate a polygon showing the area reachable from a point within a given travel time or distance',
        inputSchema: {
          type: 'object',
          properties: {
            longitude: {
              type: 'number',
              description: 'Longitude of the starting point in decimal degrees',
            },
            latitude: {
              type: 'number',
              description: 'Latitude of the starting point in decimal degrees',
            },
            profile: {
              type: 'string',
              description: 'Routing profile: driving-traffic, driving, walking, or cycling (default: driving)',
            },
            contours_minutes: {
              type: 'string',
              description: 'Comma-separated travel time contours in minutes (max 4 values, max 60 min each — e.g. "5,15,30")',
            },
            contours_meters: {
              type: 'string',
              description: 'Comma-separated distance contours in meters instead of time (max 4 values — e.g. "1000,5000")',
            },
            polygons: {
              type: 'boolean',
              description: 'Return polygons (true) instead of lines (default: false)',
            },
            denoise: {
              type: 'number',
              description: 'Smoothing factor 0-1 to remove small islands from the isochrone (default: 1)',
            },
          },
          required: ['longitude', 'latitude'],
        },
      },
      {
        name: 'search_places',
        description: 'Search for POIs, businesses, and landmarks near a location using the Mapbox Search Box forward endpoint; returns results with coordinates',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search text for POI or business name (e.g. "coffee shop", "urgent care")',
            },
            proximity: {
              type: 'string',
              description: 'Longitude,latitude to search near (e.g. "-77.0366,38.8971")',
            },
            bbox: {
              type: 'string',
              description: 'Bounding box to restrict results: minLng,minLat,maxLng,maxLat',
            },
            country: {
              type: 'string',
              description: 'ISO 3166-1 country codes to restrict results (comma-separated)',
            },
            language: {
              type: 'string',
              description: 'BCP 47 language code for results (default: en)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results (default: 10, max: 10)',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'get_static_map',
        description: 'Generate a URL for a static map image with optional markers, paths, and custom style at a given center and zoom',
        inputSchema: {
          type: 'object',
          properties: {
            longitude: {
              type: 'number',
              description: 'Longitude of map center in decimal degrees',
            },
            latitude: {
              type: 'number',
              description: 'Latitude of map center in decimal degrees',
            },
            zoom: {
              type: 'number',
              description: 'Zoom level 0-22 (0=world, 15=street level, 22=building)',
            },
            width: {
              type: 'number',
              description: 'Image width in pixels (max 1280, default: 600)',
            },
            height: {
              type: 'number',
              description: 'Image height in pixels (max 1280, default: 400)',
            },
            style_id: {
              type: 'string',
              description: 'Mapbox style ID (default: streets-v12). Options: streets-v12, satellite-v9, satellite-streets-v12, outdoors-v12, light-v11, dark-v11',
            },
            marker: {
              type: 'string',
              description: 'Pin marker spec: pin-s+ff0000(lng,lat) — color in hex, coordinates of pin location',
            },
            retina: {
              type: 'boolean',
              description: 'Return @2x high-DPI image (default: false)',
            },
          },
          required: ['longitude', 'latitude', 'zoom'],
        },
      },
      {
        name: 'list_styles',
        description: 'List all custom map styles in a Mapbox account by username',
        inputSchema: {
          type: 'object',
          properties: {
            username: {
              type: 'string',
              description: 'Mapbox account username to list styles for',
            },
            draft: {
              type: 'boolean',
              description: 'Include draft (unpublished) styles (default: false)',
            },
          },
          required: ['username'],
        },
      },
      {
        name: 'get_style',
        description: 'Retrieve the full JSON specification of a Mapbox style by username and style ID',
        inputSchema: {
          type: 'object',
          properties: {
            username: {
              type: 'string',
              description: 'Mapbox account username',
            },
            style_id: {
              type: 'string',
              description: 'Style ID (e.g. streets-v12 or a custom style ID from your account)',
            },
            draft: {
              type: 'boolean',
              description: 'Retrieve the draft version of the style (default: false)',
            },
          },
          required: ['username', 'style_id'],
        },
      },
      {
        name: 'list_datasets',
        description: 'List all GeoJSON datasets in a Mapbox account with feature count and bounds',
        inputSchema: {
          type: 'object',
          properties: {
            username: {
              type: 'string',
              description: 'Mapbox account username to list datasets for',
            },
          },
          required: ['username'],
        },
      },
      {
        name: 'list_tokens',
        description: 'List all API access tokens for a Mapbox account with scopes and allowed URLs',
        inputSchema: {
          type: 'object',
          properties: {
            username: {
              type: 'string',
              description: 'Mapbox account username to list tokens for',
            },
          },
          required: ['username'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'geocode_forward':
          return this.geocodeForward(args);
        case 'geocode_reverse':
          return this.geocodeReverse(args);
        case 'geocode_batch':
          return this.geocodeBatch(args);
        case 'get_directions':
          return this.getDirections(args);
        case 'get_travel_matrix':
          return this.getTravelMatrix(args);
        case 'get_isochrone':
          return this.getIsochrone(args);
        case 'search_places':
          return this.searchPlaces(args);
        case 'get_static_map':
          return this.getStaticMap(args);
        case 'list_styles':
          return this.listStyles(args);
        case 'get_style':
          return this.getStyle(args);
        case 'list_datasets':
          return this.listDatasets(args);
        case 'list_tokens':
          return this.listTokens(args);
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

  private async apiGet(path: string, extraParams?: Record<string, string>): Promise<ToolResult> {
    const url = new URL(`${this.baseUrl}${path}`);
    url.searchParams.set('access_token', this.token);
    if (extraParams) {
      for (const [k, v] of Object.entries(extraParams)) {
        url.searchParams.set(k, v);
      }
    }
    const response = await this.fetchWithRetry(url.toString(), {});
    if (!response.ok) {
      const err = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `API error: ${response.status} ${err}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apiPost(path: string, body: unknown): Promise<ToolResult> {
    const url = new URL(`${this.baseUrl}${path}`);
    url.searchParams.set('access_token', this.token);
    const response = await this.fetchWithRetry(url.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const err = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `API error: ${response.status} ${err}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async geocodeForward(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.query) return { content: [{ type: 'text', text: 'query is required' }], isError: true };
    const params: Record<string, string> = {};
    if (args.country) params.country = args.country as string;
    if (args.proximity) params.proximity = args.proximity as string;
    if (args.types) params.types = args.types as string;
    if (args.language) params.language = args.language as string;
    if (args.limit) params.limit = String(args.limit);
    if (typeof args.autocomplete === 'boolean') params.autocomplete = String(args.autocomplete);
    return this.apiGet(`/geocoding/v5/mapbox.places/${encodeURIComponent(args.query as string)}.json`, params);
  }

  private async geocodeReverse(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.longitude === undefined || args.latitude === undefined) {
      return { content: [{ type: 'text', text: 'longitude and latitude are required' }], isError: true };
    }
    const params: Record<string, string> = {};
    if (args.types) params.types = args.types as string;
    if (args.language) params.language = args.language as string;
    if (args.limit) params.limit = String(args.limit);
    return this.apiGet(`/geocoding/v5/mapbox.places/${encodeURIComponent(args.longitude as string)},${encodeURIComponent(args.latitude as string)}.json`, params);
  }

  private async geocodeBatch(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.queries) return { content: [{ type: 'text', text: 'queries is required' }], isError: true };
    let queries: string[];
    try {
      queries = JSON.parse(args.queries as string) as string[];
    } catch {
      return { content: [{ type: 'text', text: 'queries must be a valid JSON array of strings' }], isError: true };
    }
    if (!Array.isArray(queries) || queries.length === 0 || queries.length > 1000) {
      return { content: [{ type: 'text', text: 'queries must be a JSON array of 1-1000 strings' }], isError: true };
    }
    // Geocoding v6 batch body is a raw JSON array of query objects (not wrapped in a key).
    // Each forward geocoding query uses the { "q": "..." } shape; optional country/language
    // fields are per-query parameters per the v6 batch spec.
    const queryObjects = queries.map(q => {
      const obj: Record<string, unknown> = { q };
      if (args.country) obj.country = args.country;
      if (args.language) obj.language = args.language;
      return obj;
    });
    return this.apiPost('/search/geocode/v6/batch', queryObjects);
  }

  private async getDirections(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.coordinates) return { content: [{ type: 'text', text: 'coordinates is required' }], isError: true };
    const profile = (args.profile as string) ?? 'driving-traffic';
    const params: Record<string, string> = {};
    if (typeof args.alternatives === 'boolean') params.alternatives = String(args.alternatives);
    params.geometries = (args.geometries as string) ?? 'geojson';
    if (typeof args.steps === 'boolean') params.steps = String(args.steps);
    if (typeof args.banner_instructions === 'boolean') params.banner_instructions = String(args.banner_instructions);
    if (args.language) params.language = args.language as string;
    const coords = encodeURIComponent(args.coordinates as string);
    return this.apiGet(`/directions/v5/mapbox/${profile}/${coords}`, params);
  }

  private async getTravelMatrix(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.coordinates) return { content: [{ type: 'text', text: 'coordinates is required' }], isError: true };
    const profile = (args.profile as string) ?? 'driving';
    const params: Record<string, string> = {};
    if (args.sources) params.sources = args.sources as string;
    if (args.destinations) params.destinations = args.destinations as string;
    params.annotations = (args.annotations as string) ?? 'duration';
    const coords = encodeURIComponent(args.coordinates as string);
    return this.apiGet(`/directions-matrix/v1/mapbox/${profile}/${coords}`, params);
  }

  private async getIsochrone(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.longitude === undefined || args.latitude === undefined) {
      return { content: [{ type: 'text', text: 'longitude and latitude are required' }], isError: true };
    }
    if (!args.contours_minutes && !args.contours_meters) {
      return { content: [{ type: 'text', text: 'contours_minutes or contours_meters is required' }], isError: true };
    }
    const profile = (args.profile as string) ?? 'driving';
    const params: Record<string, string> = {};
    if (args.contours_minutes) params.contours_minutes = args.contours_minutes as string;
    if (args.contours_meters) params.contours_meters = args.contours_meters as string;
    if (typeof args.polygons === 'boolean') params.polygons = String(args.polygons);
    if (args.denoise !== undefined) params.denoise = String(args.denoise);
    return this.apiGet(`/isochrone/v1/mapbox/${profile}/${encodeURIComponent(args.longitude as string)},${encodeURIComponent(args.latitude as string)}`, params);
  }

  private async searchPlaces(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.query) return { content: [{ type: 'text', text: 'query is required' }], isError: true };
    // Use the /forward endpoint (Text Search) instead of /suggest to avoid the mandatory
    // session_token billing parameter required by the interactive /suggest endpoint.
    const params: Record<string, string> = { q: args.query as string };
    if (args.proximity) params.proximity = args.proximity as string;
    if (args.bbox) params.bbox = args.bbox as string;
    if (args.country) params.country = args.country as string;
    if (args.language) params.language = args.language as string;
    if (args.limit) params.limit = String(args.limit);
    return this.apiGet('/search/searchbox/v1/forward', params);
  }

  private async getStaticMap(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.longitude === undefined || args.latitude === undefined || args.zoom === undefined) {
      return { content: [{ type: 'text', text: 'longitude, latitude, and zoom are required' }], isError: true };
    }
    const styleId = (args.style_id as string) ?? 'streets-v12';
    const width = (args.width as number) ?? 600;
    const height = (args.height as number) ?? 400;
    const retina = args.retina ? '@2x' : '';
    const marker = args.marker ? `${encodeURIComponent(args.marker as string)}/` : '';
    const url = new URL(
      `${this.baseUrl}/styles/v1/mapbox/${styleId}/static/${marker}${encodeURIComponent(args.longitude as string)},${encodeURIComponent(args.latitude as string)},${encodeURIComponent(args.zoom as string)}/${width}x${height}${retina}`
    );
    url.searchParams.set('access_token', this.token);
    // Return the URL rather than fetching binary image data
    return {
      content: [{ type: 'text', text: JSON.stringify({ static_map_url: url.toString() }, null, 2) }],
      isError: false,
    };
  }

  private async listStyles(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.username) return { content: [{ type: 'text', text: 'username is required' }], isError: true };
    const params: Record<string, string> = {};
    if (typeof args.draft === 'boolean') params.draft = String(args.draft);
    return this.apiGet(`/styles/v1/${encodeURIComponent(args.username as string)}`, params);
  }

  private async getStyle(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.username || !args.style_id) {
      return { content: [{ type: 'text', text: 'username and style_id are required' }], isError: true };
    }
    const draft = args.draft ? '/draft' : '';
    return this.apiGet(`/styles/v1/${encodeURIComponent(args.username as string)}/${encodeURIComponent(args.style_id as string)}${draft}`);
  }

  private async listDatasets(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.username) return { content: [{ type: 'text', text: 'username is required' }], isError: true };
    return this.apiGet(`/datasets/v1/${encodeURIComponent(args.username as string)}`);
  }

  private async listTokens(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.username) return { content: [{ type: 'text', text: 'username is required' }], isError: true };
    return this.apiGet(`/tokens/v2/${encodeURIComponent(args.username as string)}`);
  }
}

/**
 * Apple Business Connect MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28.
//   No Apple-published MCP server for Business Connect was found on GitHub or Apple's
//   developer documentation. Apple's Business Connect API is a partner-access service
//   (approved agency partners only — Reputation, Rio SEO, SOCi, Uberall, Yext listed).
//   Direct API access requires working with an Apple representative.
// Our adapter covers: 14 tools. Vendor MCP: N/A.
// Recommendation: use-rest-api — no official MCP server exists.
//
// Base URL: https://businessconnect.apple.com/api/v1 (UNVERIFIED — partner-gated, not publicly documented)
// Auth: OAuth2 client credentials — POST https://account.apple.com/auth/oauth2/token
//   Token request uses: grant_type=client_credentials, client_id, client_secret, scope=business.api
//   NOTE: Apple Business Manager API uses JWT client_assertion (urn:ietf:params:oauth:client-assertion-type:jwt-bearer)
//   but Apple Business Connect Service Accounts issue a Client Secret directly. Auth mechanism is UNVERIFIED
//   against the gated ABC API docs. If JWT assertion is required, this adapter's token request must be updated
//   to build and sign a JWT instead of sending client_secret as a form field.
//   60-second early token refresh is implemented.
// Docs: https://businessconnect.apple.com/docs/api/v1.0/ (requires partner authentication)
//   Public FAQ: https://businessconnect.apple.com/docs/api/v1.0/faq
// Rate limits: Not publicly documented. Partner-tier access required.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface AppleBusinessConnectConfig {
  clientId: string;
  clientSecret: string;
  baseUrl?: string;
  tokenUrl?: string;
}

export class AppleBusinessConnectMCPServer extends MCPAdapterBase {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly baseUrl: string;
  private readonly tokenUrl: string;
  private bearerToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(config: AppleBusinessConnectConfig) {
    super();
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.baseUrl = config.baseUrl ?? 'https://businessconnect.apple.com/api/v1';
    this.tokenUrl = config.tokenUrl ?? 'https://account.apple.com/auth/oauth2/token';
  }

  static catalog() {
    return {
      name: 'apple-business-connect',
      displayName: 'Apple Business Connect',
      version: '1.0.0',
      category: 'misc',
      keywords: [
        'apple', 'apple maps', 'business connect', 'apple business connect', 'maps listing',
        'local seo', 'business hours', 'location data', 'place card', 'business profile',
        'siri', 'wallet', 'apple messages', 'local business', 'multi-location',
      ],
      toolNames: [
        'list_locations', 'get_location', 'create_location', 'update_location', 'delete_location',
        'update_location_hours', 'update_location_special_hours',
        'list_location_photos', 'upload_location_photo', 'delete_location_photo',
        'get_location_status', 'list_location_duplicates',
        'list_brands', 'get_brand',
      ],
      description: 'Apple Business Connect: manage business location listings on Apple Maps — create, update, and query locations, hours, photos, and brand data across Apple platforms.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_locations',
        description: 'List all business locations in Apple Business Connect with optional brand and status filters',
        inputSchema: {
          type: 'object',
          properties: {
            brand_id: {
              type: 'string',
              description: 'Filter by brand ID (optional)',
            },
            status: {
              type: 'string',
              description: 'Filter by location status: ACTIVE, PENDING, REJECTED, CLOSED (optional)',
            },
            page_size: {
              type: 'number',
              description: 'Results per page (default: 50, max: 200)',
            },
            page_token: {
              type: 'string',
              description: 'Pagination token from a previous response',
            },
          },
        },
      },
      {
        name: 'get_location',
        description: 'Get detailed business location data including address, hours, categories, and status from Apple Business Connect',
        inputSchema: {
          type: 'object',
          properties: {
            location_id: {
              type: 'string',
              description: 'Business Connect location ID',
            },
          },
          required: ['location_id'],
        },
      },
      {
        name: 'create_location',
        description: 'Create a new business location listing in Apple Business Connect with address, hours, and contact info',
        inputSchema: {
          type: 'object',
          properties: {
            brand_id: {
              type: 'string',
              description: 'Brand ID to associate the location with (required for multi-location businesses)',
            },
            name: {
              type: 'string',
              description: 'Business display name',
            },
            address_lines: {
              type: 'string',
              description: 'Street address lines as JSON array (e.g. ["123 Main St", "Suite 100"])',
            },
            city: {
              type: 'string',
              description: 'City name',
            },
            state: {
              type: 'string',
              description: 'State or province code (e.g. CA)',
            },
            postal_code: {
              type: 'string',
              description: 'Postal / ZIP code',
            },
            country_code: {
              type: 'string',
              description: 'ISO 3166-1 alpha-2 country code (e.g. US)',
            },
            phone: {
              type: 'string',
              description: 'Primary phone number in E.164 format (e.g. +14155551234)',
            },
            website_url: {
              type: 'string',
              description: 'Business website URL',
            },
            category_ids: {
              type: 'string',
              description: 'Comma-separated Apple Business Connect category IDs',
            },
          },
          required: ['name', 'city', 'state', 'country_code'],
        },
      },
      {
        name: 'update_location',
        description: 'Update business location details including name, address, phone number, website, or categories',
        inputSchema: {
          type: 'object',
          properties: {
            location_id: {
              type: 'string',
              description: 'Location ID to update',
            },
            name: {
              type: 'string',
              description: 'Updated business display name',
            },
            phone: {
              type: 'string',
              description: 'Updated phone number in E.164 format',
            },
            website_url: {
              type: 'string',
              description: 'Updated website URL',
            },
            address_lines: {
              type: 'string',
              description: 'Updated street address lines as JSON array',
            },
            city: {
              type: 'string',
              description: 'Updated city',
            },
            state: {
              type: 'string',
              description: 'Updated state/province code',
            },
            postal_code: {
              type: 'string',
              description: 'Updated postal code',
            },
          },
          required: ['location_id'],
        },
      },
      {
        name: 'delete_location',
        description: 'Mark a business location as permanently closed in Apple Business Connect',
        inputSchema: {
          type: 'object',
          properties: {
            location_id: {
              type: 'string',
              description: 'Location ID to mark as closed',
            },
          },
          required: ['location_id'],
        },
      },
      {
        name: 'update_location_hours',
        description: 'Update the regular weekly business hours for a location',
        inputSchema: {
          type: 'object',
          properties: {
            location_id: {
              type: 'string',
              description: 'Location ID to update hours for',
            },
            hours: {
              type: 'string',
              description: 'JSON array of day-hour objects with fields: day (MONDAY-SUNDAY), open_time (HH:MM), close_time (HH:MM), closed (bool). Example: [{"day":"MONDAY","open_time":"09:00","close_time":"17:00"}]',
            },
          },
          required: ['location_id', 'hours'],
        },
      },
      {
        name: 'update_location_special_hours',
        description: 'Set special/holiday hours for a location, overriding regular hours on specific dates',
        inputSchema: {
          type: 'object',
          properties: {
            location_id: {
              type: 'string',
              description: 'Location ID to update special hours for',
            },
            special_hours: {
              type: 'string',
              description: 'JSON array of special hour objects with fields: date (YYYY-MM-DD), open_time (HH:MM), close_time (HH:MM), closed (bool)',
            },
          },
          required: ['location_id', 'special_hours'],
        },
      },
      {
        name: 'list_location_photos',
        description: 'List photos associated with a business location in Apple Business Connect',
        inputSchema: {
          type: 'object',
          properties: {
            location_id: {
              type: 'string',
              description: 'Location ID to list photos for',
            },
          },
          required: ['location_id'],
        },
      },
      {
        name: 'upload_location_photo',
        description: 'Upload a photo for a business location by providing a public URL to the image',
        inputSchema: {
          type: 'object',
          properties: {
            location_id: {
              type: 'string',
              description: 'Location ID to add photo to',
            },
            photo_url: {
              type: 'string',
              description: 'Publicly accessible URL to the photo (JPEG or PNG, min 720px on shortest side)',
            },
            category: {
              type: 'string',
              description: 'Photo category: EXTERIOR, INTERIOR, PRODUCT, TEAM, LOGO (default: EXTERIOR)',
            },
          },
          required: ['location_id', 'photo_url'],
        },
      },
      {
        name: 'delete_location_photo',
        description: 'Remove a photo from a business location listing',
        inputSchema: {
          type: 'object',
          properties: {
            location_id: {
              type: 'string',
              description: 'Location ID the photo belongs to',
            },
            photo_id: {
              type: 'string',
              description: 'Photo resource ID to delete',
            },
          },
          required: ['location_id', 'photo_id'],
        },
      },
      {
        name: 'get_location_status',
        description: 'Get the current Apple Maps publication status and any pending review notes for a location',
        inputSchema: {
          type: 'object',
          properties: {
            location_id: {
              type: 'string',
              description: 'Location ID to check status for',
            },
          },
          required: ['location_id'],
        },
      },
      {
        name: 'list_location_duplicates',
        description: 'List potential duplicate listings detected for a location on Apple Maps',
        inputSchema: {
          type: 'object',
          properties: {
            location_id: {
              type: 'string',
              description: 'Location ID to check for duplicates',
            },
          },
          required: ['location_id'],
        },
      },
      {
        name: 'list_brands',
        description: 'List all brands in the Apple Business Connect account',
        inputSchema: {
          type: 'object',
          properties: {
            page_size: {
              type: 'number',
              description: 'Results per page (default: 50)',
            },
            page_token: {
              type: 'string',
              description: 'Pagination token from a previous response',
            },
          },
        },
      },
      {
        name: 'get_brand',
        description: 'Get details about a specific brand in Apple Business Connect',
        inputSchema: {
          type: 'object',
          properties: {
            brand_id: {
              type: 'string',
              description: 'Brand ID to retrieve',
            },
          },
          required: ['brand_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_locations':
          return this.listLocations(args);
        case 'get_location':
          return this.getLocation(args);
        case 'create_location':
          return this.createLocation(args);
        case 'update_location':
          return this.updateLocation(args);
        case 'delete_location':
          return this.deleteLocation(args);
        case 'update_location_hours':
          return this.updateLocationHours(args);
        case 'update_location_special_hours':
          return this.updateLocationSpecialHours(args);
        case 'list_location_photos':
          return this.listLocationPhotos(args);
        case 'upload_location_photo':
          return this.uploadLocationPhoto(args);
        case 'delete_location_photo':
          return this.deleteLocationPhoto(args);
        case 'get_location_status':
          return this.getLocationStatus(args);
        case 'list_location_duplicates':
          return this.listLocationDuplicates(args);
        case 'list_brands':
          return this.listBrands(args);
        case 'get_brand':
          return this.getBrand(args);
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

  // ---- Auth ----

  private async getOrRefreshToken(): Promise<string> {
    const now = Date.now();
    if (this.bearerToken && this.tokenExpiry > now) {
      return this.bearerToken;
    }

    const response = await this.fetchWithRetry(this.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: this.clientId,
        client_secret: this.clientSecret,
        scope: 'business.api',
      }).toString(),
    });

    if (!response.ok) {
      throw new Error(`OAuth2 token request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as { access_token: string; expires_in: number };
    this.bearerToken = data.access_token;
    this.tokenExpiry = now + (data.expires_in - 60) * 1000;
    return this.bearerToken;
  }

  private async authHeaders(): Promise<Record<string, string>> {
    const token = await this.getOrRefreshToken();
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  // ---- HTTP helpers ----

  private async abcGet(path: string, params?: Record<string, string>): Promise<ToolResult> {
    const hdrs = await this.authHeaders();
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}${qs}`, { headers: hdrs });
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `API error: ${response.status} ${errText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async abcPost(path: string, body: unknown): Promise<ToolResult> {
    const hdrs = await this.authHeaders();
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: hdrs,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `API error: ${response.status} ${errText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async abcPut(path: string, body: unknown): Promise<ToolResult> {
    const hdrs = await this.authHeaders();
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'PUT',
      headers: hdrs,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `API error: ${response.status} ${errText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async abcPatch(path: string, body: unknown): Promise<ToolResult> {
    const hdrs = await this.authHeaders();
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'PATCH',
      headers: hdrs,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `API error: ${response.status} ${errText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async abcDelete(path: string, body?: unknown): Promise<ToolResult> {
    const hdrs = await this.authHeaders();
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'DELETE',
      headers: hdrs,
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `API error: ${response.status} ${errText}` }], isError: true };
    }
    // DELETE may return 204 No Content
    let data: unknown;
    try { data = await response.json(); } catch { data = { status: 'deleted' }; }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  // ---- Tool implementations ----

  private async listLocations(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      pageSize: String((args.page_size as number) ?? 50),
    };
    if (args.brand_id) params.brandId = args.brand_id as string;
    if (args.status) params.status = args.status as string;
    if (args.page_token) params.pageToken = args.page_token as string;
    return this.abcGet('/locations', params);
  }

  private async getLocation(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.location_id) return { content: [{ type: 'text', text: 'location_id is required' }], isError: true };
    return this.abcGet(`/locations/${encodeURIComponent(args.location_id as string)}`);
  }

  private async createLocation(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name || !args.city || !args.state || !args.country_code) {
      return { content: [{ type: 'text', text: 'name, city, state, and country_code are required' }], isError: true };
    }

    const address: Record<string, unknown> = {
      city: args.city,
      stateProvince: args.state,
      countryCode: args.country_code,
    };
    if (args.address_lines) {
      try {
        address.addressLines = JSON.parse(args.address_lines as string);
      } catch {
        address.addressLines = [args.address_lines];
      }
    }
    if (args.postal_code) address.postalCode = args.postal_code;

    const location: Record<string, unknown> = {
      name: args.name,
      address,
    };
    if (args.phone) location.phone = args.phone;
    if (args.website_url) location.websiteUrl = args.website_url;
    if (args.brand_id) location.brandId = args.brand_id;
    if (args.category_ids) {
      location.categoryIds = (args.category_ids as string).split(',').map(s => s.trim());
    }

    return this.abcPost('/locations', location);
  }

  private async updateLocation(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.location_id) return { content: [{ type: 'text', text: 'location_id is required' }], isError: true };

    const updates: Record<string, unknown> = {};
    if (args.name) updates.name = args.name;
    if (args.phone) updates.phone = args.phone;
    if (args.website_url) updates.websiteUrl = args.website_url;

    if (args.address_lines || args.city || args.state || args.postal_code) {
      const address: Record<string, unknown> = {};
      if (args.address_lines) {
        try { address.addressLines = JSON.parse(args.address_lines as string); } catch { address.addressLines = [args.address_lines]; }
      }
      if (args.city) address.city = args.city;
      if (args.state) address.stateProvince = args.state;
      if (args.postal_code) address.postalCode = args.postal_code;
      updates.address = address;
    }

    return this.abcPatch(`/locations/${encodeURIComponent(args.location_id as string)}`, updates);
  }

  private async deleteLocation(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.location_id) return { content: [{ type: 'text', text: 'location_id is required' }], isError: true };
    return this.abcPatch(`/locations/${encodeURIComponent(args.location_id as string)}`, { status: 'CLOSED' });
  }

  private async updateLocationHours(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.location_id || !args.hours) {
      return { content: [{ type: 'text', text: 'location_id and hours are required' }], isError: true };
    }
    let parsedHours: unknown;
    try {
      parsedHours = JSON.parse(args.hours as string);
    } catch {
      return { content: [{ type: 'text', text: 'hours must be a valid JSON array' }], isError: true };
    }
    return this.abcPut(`/locations/${encodeURIComponent(args.location_id as string)}/hours`, { regularHours: parsedHours });
  }

  private async updateLocationSpecialHours(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.location_id || !args.special_hours) {
      return { content: [{ type: 'text', text: 'location_id and special_hours are required' }], isError: true };
    }
    let parsedHours: unknown;
    try {
      parsedHours = JSON.parse(args.special_hours as string);
    } catch {
      return { content: [{ type: 'text', text: 'special_hours must be a valid JSON array' }], isError: true };
    }
    return this.abcPut(`/locations/${encodeURIComponent(args.location_id as string)}/special-hours`, { specialHours: parsedHours });
  }

  private async listLocationPhotos(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.location_id) return { content: [{ type: 'text', text: 'location_id is required' }], isError: true };
    return this.abcGet(`/locations/${encodeURIComponent(args.location_id as string)}/photos`);
  }

  private async uploadLocationPhoto(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.location_id || !args.photo_url) {
      return { content: [{ type: 'text', text: 'location_id and photo_url are required' }], isError: true };
    }
    return this.abcPost(`/locations/${encodeURIComponent(args.location_id as string)}/photos`, {
      url: args.photo_url,
      category: (args.category as string) ?? 'EXTERIOR',
    });
  }

  private async deleteLocationPhoto(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.location_id || !args.photo_id) {
      return { content: [{ type: 'text', text: 'location_id and photo_id are required' }], isError: true };
    }
    return this.abcDelete(`/locations/${encodeURIComponent(args.location_id as string)}/photos/${encodeURIComponent(args.photo_id as string)}`);
  }

  private async getLocationStatus(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.location_id) return { content: [{ type: 'text', text: 'location_id is required' }], isError: true };
    return this.abcGet(`/locations/${encodeURIComponent(args.location_id as string)}/status`);
  }

  private async listLocationDuplicates(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.location_id) return { content: [{ type: 'text', text: 'location_id is required' }], isError: true };
    return this.abcGet(`/locations/${encodeURIComponent(args.location_id as string)}/duplicates`);
  }

  private async listBrands(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      pageSize: String((args.page_size as number) ?? 50),
    };
    if (args.page_token) params.pageToken = args.page_token as string;
    return this.abcGet('/brands', params);
  }

  private async getBrand(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.brand_id) return { content: [{ type: 'text', text: 'brand_id is required' }], isError: true };
    return this.abcGet(`/brands/${encodeURIComponent(args.brand_id as string)}`);
  }
}

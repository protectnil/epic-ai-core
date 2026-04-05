/**
 * Press Association TV API MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// No official Press Association MCP server was found on GitHub as of 2026-03-28.
// Our adapter covers: 14 tools. Vendor MCP covers: 0 tools (none exists).
// Recommendation: use-rest-api — no official MCP server exists.
//
// Base URL: https://tv.api.pressassociation.io/v2
// Auth: apikey header (value passed as 'apikey' request header)
//   API key obtained via Press Association developer portal account.
//   Verified from: https://api.apis.guru/v2/specs/pressassociation.io/2.0/openapi.json
// Docs: https://raw.githubusercontent.com/PressAssociation/tv-api-v2-development-kit/master/swagger.yaml
// Rate limits: Not publicly documented; governed by contract tier

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface PressAssociationConfig {
  apiKey: string;
  baseUrl?: string;
}

export class PressAssociationMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: PressAssociationConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://tv.api.pressassociation.io/v2';
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_assets',
        description: 'List TV assets (programmes, films, episodes) from the Press Association TV API. Supports pagination and filtering by update time.',
        inputSchema: {
          type: 'object',
          properties: {
            updatedAfter: { type: 'string', description: 'Return only items updated after this ISO 8601 datetime' },
            limit: { type: 'number', description: 'Max number of items per page (e.g. 5)' },
            aliases: { type: 'boolean', description: 'If true, include legacy and provider IDs in response' },
          },
        },
      },
      {
        name: 'get_asset',
        description: 'Get full details for a specific TV asset by ID, including metadata, cast, and descriptions.',
        inputSchema: {
          type: 'object',
          properties: {
            assetId: { type: 'string', description: 'The asset ID (can be a PA ID or provider reference)' },
            aliases: { type: 'boolean', description: 'If true, include legacy and provider IDs in response' },
          },
          required: ['assetId'],
        },
      },
      {
        name: 'get_asset_contributors',
        description: 'Get the contributors (cast and crew) for a specific TV asset by asset ID.',
        inputSchema: {
          type: 'object',
          properties: {
            assetId: { type: 'string', description: 'The asset ID to retrieve contributors for' },
            aliases: { type: 'boolean', description: 'If true, include legacy and provider IDs in response' },
          },
          required: ['assetId'],
        },
      },
      {
        name: 'list_catalogues',
        description: 'List all available TV content catalogues in the Press Association TV API.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_catalogue',
        description: 'Get details for a specific content catalogue by ID.',
        inputSchema: {
          type: 'object',
          properties: {
            catalogueId: { type: 'string', description: 'The catalogue identifier' },
          },
          required: ['catalogueId'],
        },
      },
      {
        name: 'list_catalogue_assets',
        description: 'List assets within a specific content catalogue. Supports title search and date range filtering.',
        inputSchema: {
          type: 'object',
          properties: {
            catalogueId: { type: 'string', description: 'The catalogue identifier' },
            title: { type: 'string', description: 'Search query for title matching' },
            start: { type: 'string', description: 'Start date for catalogue date range (ISO 8601)' },
            end: { type: 'string', description: 'End date for catalogue date range (ISO 8601)' },
            updatedAfter: { type: 'string', description: 'Return only items updated after this ISO 8601 datetime' },
          },
          required: ['catalogueId'],
        },
      },
      {
        name: 'get_catalogue_asset',
        description: 'Get a specific asset within a specific catalogue by both catalogue ID and asset ID.',
        inputSchema: {
          type: 'object',
          properties: {
            catalogueId: { type: 'string', description: 'The catalogue identifier' },
            assetId: { type: 'string', description: 'The asset identifier within the catalogue' },
          },
          required: ['catalogueId', 'assetId'],
        },
      },
      {
        name: 'list_channels',
        description: 'List TV channels, optionally filtered by platform, region, and date. Returns channel names, attributes, and schedule window.',
        inputSchema: {
          type: 'object',
          properties: {
            platformId: { type: 'string', description: 'Filter by platform ID (can pass multiple comma-separated)' },
            regionId: { type: 'string', description: 'Filter by platform region ID' },
            aliases: { type: 'boolean', description: 'If true, include legacy and provider IDs' },
            date: { type: 'string', description: 'Date for channel state (ISO 8601 date, e.g. 2026-04-01)' },
            scheduleStart: { type: 'string', description: 'Start date for schedule window (ISO 8601)' },
          },
        },
      },
      {
        name: 'get_channel',
        description: 'Get full details for a specific TV channel by ID including metadata and current attributes.',
        inputSchema: {
          type: 'object',
          properties: {
            channelId: { type: 'string', description: 'The channel identifier' },
            aliases: { type: 'boolean', description: 'If true, include legacy and provider IDs' },
          },
          required: ['channelId'],
        },
      },
      {
        name: 'list_contributors',
        description: 'List TV contributors (actors, directors, presenters). Supports pagination and filtering by update time.',
        inputSchema: {
          type: 'object',
          properties: {
            updatedAfter: { type: 'string', description: 'Return only contributors updated after this ISO 8601 datetime' },
            limit: { type: 'number', description: 'Max number of items per page' },
            aliases: { type: 'boolean', description: 'If true, include legacy and provider IDs' },
          },
        },
      },
      {
        name: 'get_contributor',
        description: 'Get details for a specific TV contributor (actor, director, presenter) by ID.',
        inputSchema: {
          type: 'object',
          properties: {
            contributorId: { type: 'string', description: 'The contributor identifier' },
            aliases: { type: 'boolean', description: 'If true, include legacy and provider IDs' },
          },
          required: ['contributorId'],
        },
      },
      {
        name: 'list_features',
        description: 'List TV features (editorial highlights, collections, curated content). Supports type, date, and date-range filtering.',
        inputSchema: {
          type: 'object',
          properties: {
            type: { type: 'string', description: 'Filter by feature type namespace' },
            date: { type: 'string', description: 'Date for feature collection (ISO 8601)' },
            start: { type: 'string', description: 'Start date for a range of features (ISO 8601)' },
            end: { type: 'string', description: 'End date for a range of features (ISO 8601)' },
          },
        },
      },
      {
        name: 'get_feature',
        description: 'Get full details for a specific TV feature (editorial highlight or curated collection) by ID.',
        inputSchema: {
          type: 'object',
          properties: {
            featureId: { type: 'string', description: 'The feature identifier' },
          },
          required: ['featureId'],
        },
      },
      {
        name: 'get_schedule',
        description: 'Get the TV broadcast schedule for a specific channel and date range. channel ID and start date are required.',
        inputSchema: {
          type: 'object',
          properties: {
            channelId: { type: 'string', description: 'The channel ID to retrieve schedule for' },
            start: { type: 'string', description: 'Start datetime for the schedule window (ISO 8601)' },
            end: { type: 'string', description: 'End datetime for the schedule window (ISO 8601, optional)' },
            aliases: { type: 'boolean', description: 'If true, include legacy and provider IDs' },
          },
          required: ['channelId', 'start'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_assets':
          return await this.listAssets(args);
        case 'get_asset':
          return await this.getAsset(args);
        case 'get_asset_contributors':
          return await this.getAssetContributors(args);
        case 'list_catalogues':
          return await this.listCatalogues();
        case 'get_catalogue':
          return await this.getCatalogue(args);
        case 'list_catalogue_assets':
          return await this.listCatalogueAssets(args);
        case 'get_catalogue_asset':
          return await this.getCatalogueAsset(args);
        case 'list_channels':
          return await this.listChannels(args);
        case 'get_channel':
          return await this.getChannel(args);
        case 'list_contributors':
          return await this.listContributors(args);
        case 'get_contributor':
          return await this.getContributor(args);
        case 'list_features':
          return await this.listFeatures(args);
        case 'get_feature':
          return await this.getFeature(args);
        case 'get_schedule':
          return await this.getSchedule(args);
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

  private async request(path: string): Promise<ToolResult> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      apikey: this.apiKey,
      'Content-Type': 'application/json',
    };

    const response = await this.fetchWithRetry(url, { method: 'GET', headers });

    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return {
        content: [{ type: 'text', text: `Press Association API error ${response.status}: ${errText}` }],
        isError: true,
      };
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new Error(`Press Association returned non-JSON response (HTTP ${response.status})`);
    }

    const text = JSON.stringify(data, null, 2);
    const truncated = text.length > 10_000
      ? text.slice(0, 10_000) + '\n... [truncated, ' + text.length + ' total chars]'
      : text;

    return { content: [{ type: 'text', text: truncated }], isError: false };
  }

  private buildQuery(params: Record<string, unknown>): string {
    const parts: string[] = [];
    for (const [key, val] of Object.entries(params)) {
      if (val !== undefined && val !== null) {
        parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(val))}`);
      }
    }
    return parts.length > 0 ? '?' + parts.join('&') : '';
  }

  private async listAssets(args: Record<string, unknown>): Promise<ToolResult> {
    const query = this.buildQuery({
      updatedAfter: args.updatedAfter,
      limit: args.limit,
      aliases: args.aliases,
    });
    return this.request(`/asset${query}`);
  }

  private async getAsset(args: Record<string, unknown>): Promise<ToolResult> {
    const assetId = args.assetId as string;
    if (!assetId) {
      return { content: [{ type: 'text', text: 'assetId is required' }], isError: true };
    }
    const query = this.buildQuery({ aliases: args.aliases });
    return this.request(`/asset/${encodeURIComponent(assetId)}${query}`);
  }

  private async getAssetContributors(args: Record<string, unknown>): Promise<ToolResult> {
    const assetId = args.assetId as string;
    if (!assetId) {
      return { content: [{ type: 'text', text: 'assetId is required' }], isError: true };
    }
    const query = this.buildQuery({ aliases: args.aliases });
    return this.request(`/asset/${encodeURIComponent(assetId)}/contributor${query}`);
  }

  private async listCatalogues(): Promise<ToolResult> {
    return this.request('/catalogue');
  }

  private async getCatalogue(args: Record<string, unknown>): Promise<ToolResult> {
    const catalogueId = args.catalogueId as string;
    if (!catalogueId) {
      return { content: [{ type: 'text', text: 'catalogueId is required' }], isError: true };
    }
    return this.request(`/catalogue/${encodeURIComponent(catalogueId)}`);
  }

  private async listCatalogueAssets(args: Record<string, unknown>): Promise<ToolResult> {
    const catalogueId = args.catalogueId as string;
    if (!catalogueId) {
      return { content: [{ type: 'text', text: 'catalogueId is required' }], isError: true };
    }
    const query = this.buildQuery({
      title: args.title,
      start: args.start,
      end: args.end,
      updatedAfter: args.updatedAfter,
    });
    return this.request(`/catalogue/${encodeURIComponent(catalogueId)}/asset${query}`);
  }

  private async getCatalogueAsset(args: Record<string, unknown>): Promise<ToolResult> {
    const catalogueId = args.catalogueId as string;
    const assetId = args.assetId as string;
    if (!catalogueId || !assetId) {
      return { content: [{ type: 'text', text: 'catalogueId and assetId are required' }], isError: true };
    }
    return this.request(`/catalogue/${encodeURIComponent(catalogueId)}/asset/${encodeURIComponent(assetId)}`);
  }

  private async listChannels(args: Record<string, unknown>): Promise<ToolResult> {
    const query = this.buildQuery({
      platformId: args.platformId,
      regionId: args.regionId,
      aliases: args.aliases,
      date: args.date,
      scheduleStart: args.scheduleStart,
    });
    return this.request(`/channel${query}`);
  }

  private async getChannel(args: Record<string, unknown>): Promise<ToolResult> {
    const channelId = args.channelId as string;
    if (!channelId) {
      return { content: [{ type: 'text', text: 'channelId is required' }], isError: true };
    }
    const query = this.buildQuery({ aliases: args.aliases });
    return this.request(`/channel/${encodeURIComponent(channelId)}${query}`);
  }

  private async listContributors(args: Record<string, unknown>): Promise<ToolResult> {
    const query = this.buildQuery({
      updatedAfter: args.updatedAfter,
      limit: args.limit,
      aliases: args.aliases,
    });
    return this.request(`/contributor${query}`);
  }

  private async getContributor(args: Record<string, unknown>): Promise<ToolResult> {
    const contributorId = args.contributorId as string;
    if (!contributorId) {
      return { content: [{ type: 'text', text: 'contributorId is required' }], isError: true };
    }
    const query = this.buildQuery({ aliases: args.aliases });
    return this.request(`/contributor/${encodeURIComponent(contributorId)}${query}`);
  }

  private async listFeatures(args: Record<string, unknown>): Promise<ToolResult> {
    const query = this.buildQuery({
      type: args.type,
      date: args.date,
      start: args.start,
      end: args.end,
    });
    return this.request(`/feature${query}`);
  }

  private async getFeature(args: Record<string, unknown>): Promise<ToolResult> {
    const featureId = args.featureId as string;
    if (!featureId) {
      return { content: [{ type: 'text', text: 'featureId is required' }], isError: true };
    }
    return this.request(`/feature/${encodeURIComponent(featureId)}`);
  }

  private async getSchedule(args: Record<string, unknown>): Promise<ToolResult> {
    const channelId = args.channelId as string;
    const start = args.start as string;
    if (!channelId || !start) {
      return { content: [{ type: 'text', text: 'channelId and start are required' }], isError: true };
    }
    const query = this.buildQuery({
      channelId,
      start,
      end: args.end,
      aliases: args.aliases,
    });
    return this.request(`/schedule${query}`);
  }

  static catalog() {
    return {
      name: 'pressassociation',
      displayName: 'Press Association TV API',
      version: '1.0.0',
      category: 'media' as const,
      keywords: ['pressassociation', 'press-association', 'tv', 'television', 'schedule', 'epg', 'broadcast'],
      toolNames: [
        'list_assets', 'get_asset', 'get_asset_contributors',
        'list_catalogues', 'get_catalogue', 'list_catalogue_assets', 'get_catalogue_asset',
        'list_channels', 'get_channel',
        'list_contributors', 'get_contributor',
        'list_features', 'get_feature',
        'get_schedule',
      ],
      description: 'Press Association TV API adapter for programme data, channels, schedules, and contributors',
      author: 'protectnil' as const,
    };
  }
}

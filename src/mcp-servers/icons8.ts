/**
 * Icons8 MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// No official Icons8 MCP server was found on GitHub.
// We build a REST wrapper covering icon search, category browsing, totals, and web font generation.
//
// Base URL: https://api.icons8.com
// Auth: API token passed as `token` query param (obtain from Icons8 dashboard)
// Docs: https://icons8.github.io/icons8-docs/
// Rate limits: $100/month minimum; rate limits vary by plan
// Note: The v1.0.0 OpenAPI spec covers v3/v4 iconset endpoints. See new docs for current v2 API.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface Icons8Config {
  token: string;
  baseUrl?: string;
}

export class Icons8MCPServer extends MCPAdapterBase {
  private readonly token: string;
  private readonly baseUrl: string;

  constructor(config: Icons8Config) {
    super();
    this.token   = config.token;
    this.baseUrl = config.baseUrl || 'https://api.icons8.com';
  }

  static catalog() {
    return {
      name: 'icons8',
      displayName: 'Icons8',
      version: '1.0.0',
      category: 'design',
      keywords: [
        'icons8', 'icon', 'icons', 'svg', 'vector', 'design', 'ui', 'graphic',
        'illustration', 'clipart', 'symbol', 'glyph', 'font', 'web font',
        'ios', 'android', 'windows', 'material', 'flat', 'color icons',
        'search icons', 'icon library', 'icon pack', 'icon set',
        'canva', 'figma', 'design assets', 'category', 'subcategory',
      ],
      toolNames: [
        'list_categories',
        'get_icons_by_category',
        'search_icons_v3',
        'search_icons_v4',
        'get_latest_icons',
        'get_total_icons',
        'generate_web_font_from_collection',
        'generate_web_font_from_icons',
      ],
      description: 'Icons8 API: search and browse 1M+ icons across iOS, Android, Windows, and Material styles. Generate web fonts from icon collections or individual icons.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      // ── Browse ────────────────────────────────────────────────────────────────
      {
        name: 'list_categories',
        description: 'List all icon categories for a given platform and language — returns category codes, names, and subcategories with icon previews',
        inputSchema: {
          type: 'object',
          properties: {
            platform: {
              type: 'string',
              description: 'Icon style/platform: ios7, win8, win10, android, androidL (Material), color, or office',
              enum: ['ios7', 'win8', 'win10', 'android', 'androidL', 'color', 'office'],
            },
            language: {
              type: 'string',
              description: 'Language code for localized category names: en-US, fr-FR, de-DE, it-IT, pt-BR, pl-PL, ru-RU, es-ES, zh-CN, ja-JP (default: en-US)',
              enum: ['en-US', 'fr-FR', 'de-DE', 'it-IT', 'pt-BR', 'pl-PL', 'ru-RU', 'es-ES', 'zh-CN', 'ja-JP'],
            },
          },
          required: ['platform', 'language'],
        },
      },
      {
        name: 'get_icons_by_category',
        description: 'Retrieve icons within a specific category and subcategory — paginated list with SVG data and metadata',
        inputSchema: {
          type: 'object',
          properties: {
            category: {
              type: 'string',
              description: 'Category code (e.g. Very_Basic, Photo_Video, Alphabet) — use list_categories to get valid codes',
            },
            subcategory: {
              type: 'string',
              description: 'Subcategory code within the category',
            },
            amount: {
              type: 'number',
              description: 'Maximum number of icons to return (e.g. 25)',
            },
            offset: {
              type: 'number',
              description: 'Number of icons to skip for pagination (default: 0)',
            },
            platform: {
              type: 'string',
              description: 'Icon style: ios7, win8, win10, android, androidL, color, or office',
              enum: ['ios7', 'win8', 'win10', 'android', 'androidL', 'color', 'office'],
            },
            language: {
              type: 'string',
              description: 'Language code for localized icon names (default: en-US)',
              enum: ['en-US', 'fr-FR', 'de-DE', 'it-IT', 'pt-BR', 'pl-PL', 'ru-RU', 'es-ES'],
            },
          },
          required: ['category', 'subcategory', 'amount', 'offset', 'platform', 'language'],
        },
      },
      // ── Search ────────────────────────────────────────────────────────────────
      {
        name: 'search_icons_v3',
        description: 'Search icons by keyword using the v3 API — returns matching icons with SVG data, IDs, and download URLs',
        inputSchema: {
          type: 'object',
          properties: {
            term: {
              type: 'string',
              description: 'Search term — icon name, tag, or phrase (e.g. "home", "arrow", "@notification")',
            },
            amount: {
              type: 'number',
              description: 'Maximum number of icons to return (default: 25)',
            },
            offset: {
              type: 'number',
              description: 'Offset for pagination (default: 0)',
            },
            platform: {
              type: 'string',
              description: 'Icon style: ios7, win8, win10, android, androidL, color, or office',
              enum: ['ios7', 'win8', 'win10', 'android', 'androidL', 'color', 'office'],
            },
            language: {
              type: 'string',
              description: 'Language code for localized results (default: en-US)',
              enum: ['en-US', 'fr-FR', 'de-DE', 'it-IT', 'pt-BR', 'pl-PL', 'ru-RU', 'es-ES'],
            },
            exact_amount: {
              type: 'boolean',
              description: 'If true, returns exactly the requested amount of icons (default: false)',
            },
          },
          required: ['term', 'amount', 'offset', 'platform', 'language', 'exact_amount'],
        },
      },
      {
        name: 'search_icons_v4',
        description: 'Search icons by keyword using the v4 API — enhanced relevance and more icon styles than v3',
        inputSchema: {
          type: 'object',
          properties: {
            term: {
              type: 'string',
              description: 'Search term — icon name, tag, or phrase',
            },
            amount: {
              type: 'number',
              description: 'Maximum number of icons to return (default: 25)',
            },
            offset: {
              type: 'number',
              description: 'Offset for pagination (default: 0)',
            },
            platform: {
              type: 'string',
              description: 'Icon style: ios7, win8, win10, android, androidL, color, or office',
              enum: ['ios7', 'win8', 'win10', 'android', 'androidL', 'color', 'office'],
            },
            language: {
              type: 'string',
              description: 'Language code for localized results (default: en-US)',
              enum: ['en-US', 'fr-FR', 'de-DE', 'it-IT', 'pt-BR', 'pl-PL', 'ru-RU', 'es-ES'],
            },
          },
          required: ['term', 'amount', 'offset', 'platform', 'language'],
        },
      },
      // ── Discovery ─────────────────────────────────────────────────────────────
      {
        name: 'get_latest_icons',
        description: 'Get the most recently added icons — useful for discovering new icons added to the Icons8 library',
        inputSchema: {
          type: 'object',
          properties: {
            amount: {
              type: 'number',
              description: 'Maximum number of icons to return (default: 25)',
            },
            offset: {
              type: 'number',
              description: 'Offset for pagination (default: 0)',
            },
            platform: {
              type: 'string',
              description: 'Icon style: ios7, win8, win10, android, androidL, color, or office',
              enum: ['ios7', 'win8', 'win10', 'android', 'androidL', 'color', 'office'],
            },
            language: {
              type: 'string',
              description: 'Language code for localized results (default: en-US)',
              enum: ['en-US', 'fr-FR', 'de-DE', 'it-IT', 'pt-BR', 'pl-PL', 'ru-RU', 'es-ES'],
            },
            term: {
              type: 'string',
              description: 'Optional filter term to narrow latest icons to a topic',
            },
          },
          required: ['amount', 'offset', 'platform', 'language'],
        },
      },
      {
        name: 'get_total_icons',
        description: 'Get the total count of icons in the Icons8 library — optionally filter by date to count recently added icons',
        inputSchema: {
          type: 'object',
          properties: {
            since: {
              type: 'string',
              description: 'Optional date in YYYY-MM-DD format — count only icons added since this date',
            },
          },
        },
      },
      // ── Web Font Generation ───────────────────────────────────────────────────
      {
        name: 'generate_web_font_from_collection',
        description: 'Generate a web font from an Icons8 collection — returns a download URL for the font files (TTF, WOFF, etc.)',
        inputSchema: {
          type: 'object',
          properties: {
            collection: {
              type: 'object',
              description: 'Collection object specifying icons to include in the font — refer to Icons8 API docs for collection format',
            },
          },
          required: ['collection'],
        },
      },
      {
        name: 'generate_web_font_from_icons',
        description: 'Generate a web font from a list of individual icons specified by platform and icon name',
        inputSchema: {
          type: 'object',
          properties: {
            icons: {
              type: 'array',
              description: 'Array of icon objects specifying platform, name, and optional size for each icon to include',
              items: {
                type: 'object',
                properties: {
                  platform: { type: 'string', description: 'Icon platform/style (e.g. ios7, androidL)' },
                  name:     { type: 'string', description: 'Icon name (e.g. home, search, settings)' },
                  size:     { type: 'number', description: 'Icon size in pixels (optional, default: 100)' },
                },
              },
            },
          },
          required: ['icons'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_categories':                  return this.listCategories(args);
        case 'get_icons_by_category':            return this.getIconsByCategory(args);
        case 'search_icons_v3':                  return this.searchIconsV3(args);
        case 'search_icons_v4':                  return this.searchIconsV4(args);
        case 'get_latest_icons':                 return this.getLatestIcons(args);
        case 'get_total_icons':                  return this.getTotalIcons(args);
        case 'generate_web_font_from_collection': return this.generateWebFontFromCollection(args);
        case 'generate_web_font_from_icons':     return this.generateWebFontFromIcons(args);
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

  private async get(path: string): Promise<ToolResult> {
    // Icons8 v3/v4 API encodes params directly in path segments
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
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
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ ...body, token: this.token }),
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

  private listCategories(args: Record<string, unknown>): Promise<ToolResult> {
    const platform = encodeURIComponent(String(args.platform));
    const language = encodeURIComponent(String(args.language));
    return this.get(`/api/iconsets/v3/categories?platform=${platform}&language=${language}&token=${encodeURIComponent(this.token)}`);
  }

  private getIconsByCategory(args: Record<string, unknown>): Promise<ToolResult> {
    const category    = encodeURIComponent(String(args.category));
    const subcategory = encodeURIComponent(String(args.subcategory));
    const amount      = encodeURIComponent(String(args.amount));
    const offset      = encodeURIComponent(String(args.offset));
    const platform    = encodeURIComponent(String(args.platform));
    const language    = encodeURIComponent(String(args.language));
    return this.get(`/api/iconsets/v3/category?category=${category}&subcategory=${subcategory}&amount=${amount}&offset=${offset}&platform=${platform}&language=${language}&token=${encodeURIComponent(this.token)}`);
  }

  private searchIconsV3(args: Record<string, unknown>): Promise<ToolResult> {
    const term         = encodeURIComponent(String(args.term));
    const amount       = encodeURIComponent(String(args.amount));
    const offset       = encodeURIComponent(String(args.offset));
    const platform     = encodeURIComponent(String(args.platform));
    const language     = encodeURIComponent(String(args.language));
    const exact_amount = encodeURIComponent(String(args.exact_amount));
    return this.get(`/api/iconsets/v3/search?term=${term}&amount=${amount}&offset=${offset}&platform=${platform}&language=${language}&exact_amount=${exact_amount}&token=${encodeURIComponent(this.token)}`);
  }

  private searchIconsV4(args: Record<string, unknown>): Promise<ToolResult> {
    const term     = encodeURIComponent(String(args.term));
    const amount   = encodeURIComponent(String(args.amount));
    const offset   = encodeURIComponent(String(args.offset));
    const platform = encodeURIComponent(String(args.platform));
    const language = encodeURIComponent(String(args.language));
    return this.get(`/api/iconsets/v4/search?term=${term}&amount=${amount}&offset=${offset}&platform=${platform}&language=${language}&token=${encodeURIComponent(this.token)}`);
  }

  private getLatestIcons(args: Record<string, unknown>): Promise<ToolResult> {
    const amount   = encodeURIComponent(String(args.amount));
    const offset   = encodeURIComponent(String(args.offset));
    const platform = encodeURIComponent(String(args.platform));
    const language = encodeURIComponent(String(args.language));
    const termPart = args.term ? `&term=${encodeURIComponent(String(args.term))}` : '';
    return this.get(`/api/iconsets/v3/latest?term=${args.term ? encodeURIComponent(String(args.term)) : ''}&amount=${amount}&offset=${offset}&platform=${platform}&language=${language}${termPart}&token=${encodeURIComponent(this.token)}`);
  }

  private getTotalIcons(args: Record<string, unknown>): Promise<ToolResult> {
    const sincePart = args.since ? `&since=${encodeURIComponent(String(args.since))}` : '';
    return this.get(`/api/iconsets/v3/total?since=${args.since ? encodeURIComponent(String(args.since)) : ''}${sincePart}&token=${encodeURIComponent(this.token)}`);
  }

  private generateWebFontFromCollection(args: Record<string, unknown>): Promise<ToolResult> {
    return this.post('/api/task/web-font/collection', { collection: args.collection });
  }

  private generateWebFontFromIcons(args: Record<string, unknown>): Promise<ToolResult> {
    return this.post('/api/task/web-font/icons', { icons: args.icons });
  }
}

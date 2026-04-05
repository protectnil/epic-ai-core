/**
 * Mercedes-Benz Configurator MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: No official Mercedes-Benz vendor MCP server exists as of March 2026.
// Our adapter covers: 13 tools across markets, classes, bodies, models, configurations, images, and online codes.
// Community MCP servers: None found for Mercedes-Benz Configurator API.
// Recommendation: Use this adapter. No community alternatives exist.
//
// Base URL: https://api.mercedes-benz.com/configurator_tryout/v1
// Auth: API key passed as query parameter `apikey` on every request
// Docs: https://developer.mercedes-benz.com/apis/configurator_tryout
// Rate limits: Tryout tier is subject to fair-use limits. Production tier: contact Mercedes-Benz developer support.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface MercedesBenzConfiguratorConfig {
  apiKey: string;
  /** Optional base URL override (default: https://api.mercedes-benz.com/configurator_tryout/v1) */
  baseUrl?: string;
}

export class MercedesBenzConfiguratorMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: MercedesBenzConfiguratorConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? 'https://api.mercedes-benz.com/configurator_tryout/v1';
  }

  static catalog() {
    return {
      name: 'mercedes-benz-configurator',
      displayName: 'Mercedes-Benz Configurator',
      version: '1.0.0',
      category: 'automotive',
      keywords: [
        'mercedes-benz', 'mercedes', 'benz', 'car', 'vehicle', 'configurator',
        'automotive', 'model', 'class', 'body', 'configuration', 'equipment',
        'paint', 'upholstery', 'rim', 'trim', 'image', 'market', 'online-code',
      ],
      toolNames: [
        'list_markets', 'get_market',
        'list_classes', 'list_bodies',
        'list_models', 'get_model',
        'get_initial_configuration', 'get_configuration',
        'get_configuration_selectables', 'get_configuration_alternatives',
        'get_vehicle_image', 'save_online_code', 'get_online_code',
      ],
      description: 'Mercedes-Benz vehicle configurator — browse markets, classes, bodies, and models; build and customize vehicle configurations; retrieve component images and save shareable online codes.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_markets',
        description: 'List all available Mercedes-Benz markets (country/language combinations) where vehicle configuration is supported',
        inputSchema: {
          type: 'object',
          properties: {
            language: {
              type: 'string',
              description: "ISO language code to filter markets (e.g. 'de', 'en')",
            },
            country: {
              type: 'string',
              description: "ISO country code to filter markets (e.g. 'DE', 'US', 'GB')",
            },
          },
        },
      },
      {
        name: 'get_market',
        description: 'Get details for a specific Mercedes-Benz market by its market ID',
        inputSchema: {
          type: 'object',
          properties: {
            market_id: {
              type: 'string',
              description: "ISO 3166 language-country market ID (e.g. 'de_DE', 'en_GB', 'en_US')",
            },
          },
          required: ['market_id'],
        },
      },
      {
        name: 'list_classes',
        description: 'List all available Mercedes-Benz vehicle classes for a given market (e.g. A-Class, C-Class, E-Class, S-Class)',
        inputSchema: {
          type: 'object',
          properties: {
            market_id: {
              type: 'string',
              description: "Market ID (e.g. 'de_DE', 'en_GB')",
            },
            class_id: {
              type: 'string',
              description: "Filter by specific class ID (e.g. '176' for A-Class in Germany)",
            },
            body_id: {
              type: 'string',
              description: "Filter by body style ID (e.g. '1' for Limousine)",
            },
          },
          required: ['market_id'],
        },
      },
      {
        name: 'list_bodies',
        description: 'List all available body styles for a Mercedes-Benz market (e.g. Limousine, Estate, Coupe, Cabriolet, SUV)',
        inputSchema: {
          type: 'object',
          properties: {
            market_id: {
              type: 'string',
              description: "Market ID (e.g. 'de_DE', 'en_GB')",
            },
            class_id: {
              type: 'string',
              description: "Filter by class ID to see only bodies available for that class",
            },
            body_id: {
              type: 'string',
              description: "Filter by specific body ID",
            },
          },
          required: ['market_id'],
        },
      },
      {
        name: 'list_models',
        description: 'List all available Mercedes-Benz models for a market, optionally filtered by class, body, or baumuster',
        inputSchema: {
          type: 'object',
          properties: {
            market_id: {
              type: 'string',
              description: "Market ID (e.g. 'de_DE', 'en_GB')",
            },
            class_id: {
              type: 'string',
              description: "Filter by class ID (e.g. '176' for A-Class)",
            },
            body_id: {
              type: 'string',
              description: "Filter by body style ID (e.g. '1' for Limousine)",
            },
            baumuster: {
              type: 'string',
              description: "Filter by baumuster internal model code (e.g. '176042' for A 180 Limousine)",
            },
          },
          required: ['market_id'],
        },
      },
      {
        name: 'get_model',
        description: 'Get details for a specific Mercedes-Benz model by market and model ID',
        inputSchema: {
          type: 'object',
          properties: {
            market_id: {
              type: 'string',
              description: "Market ID (e.g. 'de_DE', 'en_GB')",
            },
            model_id: {
              type: 'string',
              description: "Model identifier (e.g. '176042_002')",
            },
          },
          required: ['market_id', 'model_id'],
        },
      },
      {
        name: 'get_initial_configuration',
        description: 'Get the default/initial vehicle configuration for a given model — the starting point for customization',
        inputSchema: {
          type: 'object',
          properties: {
            market_id: {
              type: 'string',
              description: "Market ID (e.g. 'de_DE', 'en_GB')",
            },
            model_id: {
              type: 'string',
              description: "Model identifier (e.g. '176042_002')",
            },
          },
          required: ['market_id', 'model_id'],
        },
      },
      {
        name: 'get_configuration',
        description: 'Get full details of a specific vehicle configuration including selected components and pricing',
        inputSchema: {
          type: 'object',
          properties: {
            market_id: {
              type: 'string',
              description: "Market ID (e.g. 'de_DE', 'en_GB')",
            },
            model_id: {
              type: 'string',
              description: "Model identifier (e.g. '176042_002')",
            },
            configuration_id: {
              type: 'string',
              description: "Configuration identifier string (e.g. 'E-D15-D18-D41-D46-D49-D52-D53-D54-D58-D60-I61_I61001-P10-U18')",
            },
          },
          required: ['market_id', 'model_id', 'configuration_id'],
        },
      },
      {
        name: 'get_configuration_selectables',
        description: 'Get selectable components (equipment, paint, upholstery, rims) that can be added or changed for a configuration',
        inputSchema: {
          type: 'object',
          properties: {
            market_id: {
              type: 'string',
              description: "Market ID (e.g. 'de_DE', 'en_GB')",
            },
            model_id: {
              type: 'string',
              description: "Model identifier",
            },
            configuration_id: {
              type: 'string',
              description: "Configuration identifier string",
            },
            component_types: {
              type: 'string',
              description: "Comma-separated component types to filter (e.g. 'PAINT,UPHOLSTERY,RIMS,EQUIPMENT')",
            },
          },
          required: ['market_id', 'model_id', 'configuration_id'],
        },
      },
      {
        name: 'get_configuration_alternatives',
        description: 'Get alternative configurations after applying a list of component changes to an existing configuration',
        inputSchema: {
          type: 'object',
          properties: {
            market_id: {
              type: 'string',
              description: "Market ID (e.g. 'de_DE', 'en_GB')",
            },
            model_id: {
              type: 'string',
              description: "Model identifier",
            },
            configuration_id: {
              type: 'string',
              description: "Current configuration identifier string",
            },
            component_list: {
              type: 'string',
              description: "Comma-separated list of component changes to apply (e.g. 'P71,U18')",
            },
          },
          required: ['market_id', 'model_id', 'configuration_id', 'component_list'],
        },
      },
      {
        name: 'get_vehicle_image',
        description: 'Get vehicle rendering image URLs for a configuration — supports multiple perspectives and day/night variants',
        inputSchema: {
          type: 'object',
          properties: {
            market_id: {
              type: 'string',
              description: "Market ID (e.g. 'de_DE', 'en_GB')",
            },
            model_id: {
              type: 'string',
              description: "Model identifier",
            },
            configuration_id: {
              type: 'string',
              description: "Configuration identifier string",
            },
            perspectives: {
              type: 'string',
              description: "Comma-separated perspective codes (e.g. 'EXT000,EXT010,INT001') — exterior and interior views",
            },
            roof_open: {
              type: 'boolean',
              description: "Request images with open roof, only for convertibles (default: false)",
            },
            night: {
              type: 'boolean',
              description: "Request night-mode images with darker background and vehicle lights on (default: false)",
            },
          },
          required: ['market_id', 'model_id', 'configuration_id'],
        },
      },
      {
        name: 'save_online_code',
        description: 'Save a vehicle configuration and get a shareable online code that can be used to retrieve it later',
        inputSchema: {
          type: 'object',
          properties: {
            market_id: {
              type: 'string',
              description: "Market ID (e.g. 'de_DE', 'en_GB')",
            },
            model_id: {
              type: 'string',
              description: "Model identifier to save",
            },
            configuration_id: {
              type: 'string',
              description: "Configuration identifier string to save",
            },
          },
          required: ['market_id', 'model_id', 'configuration_id'],
        },
      },
      {
        name: 'get_online_code',
        description: 'Retrieve a previously saved vehicle configuration using its shareable online code',
        inputSchema: {
          type: 'object',
          properties: {
            market_id: {
              type: 'string',
              description: "Market ID where the configuration was saved (e.g. 'de_DE')",
            },
            online_code: {
              type: 'string',
              description: "Online code string (e.g. 'M6882554')",
            },
          },
          required: ['market_id', 'online_code'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_markets':
          return this.listMarkets(args);
        case 'get_market':
          return this.getMarket(args);
        case 'list_classes':
          return this.listClasses(args);
        case 'list_bodies':
          return this.listBodies(args);
        case 'list_models':
          return this.listModels(args);
        case 'get_model':
          return this.getModel(args);
        case 'get_initial_configuration':
          return this.getInitialConfiguration(args);
        case 'get_configuration':
          return this.getConfiguration(args);
        case 'get_configuration_selectables':
          return this.getConfigurationSelectables(args);
        case 'get_configuration_alternatives':
          return this.getConfigurationAlternatives(args);
        case 'get_vehicle_image':
          return this.getVehicleImage(args);
        case 'save_online_code':
          return this.saveOnlineCode(args);
        case 'get_online_code':
          return this.getOnlineCode(args);
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

  private async get(path: string, params: Record<string, string | undefined> = {}): Promise<ToolResult> {
    const url = this.buildUrl(path, params);
    const response = await this.fetchWithRetry(url, { method: 'GET', headers: { Accept: 'application/json' } });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Mercedes-Benz API returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async post(path: string, body: unknown, params: Record<string, string | undefined> = {}): Promise<ToolResult> {
    const url = this.buildUrl(path, params);
    const response = await this.fetchWithRetry(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Mercedes-Benz API returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listMarkets(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string | undefined> = {};
    if (args.language) params.language = args.language as string;
    if (args.country) params.country = args.country as string;
    return this.get('/markets', params);
  }

  private async getMarket(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.market_id) return { content: [{ type: 'text', text: 'market_id is required' }], isError: true };
    return this.get(`/markets/${encodeURIComponent(args.market_id as string)}`);
  }

  private async listClasses(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.market_id) return { content: [{ type: 'text', text: 'market_id is required' }], isError: true };
    const params: Record<string, string | undefined> = {};
    if (args.class_id) params.classId = args.class_id as string;
    if (args.body_id) params.bodyId = args.body_id as string;
    return this.get(`/markets/${encodeURIComponent(args.market_id as string)}/classes`, params);
  }

  private async listBodies(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.market_id) return { content: [{ type: 'text', text: 'market_id is required' }], isError: true };
    const params: Record<string, string | undefined> = {};
    if (args.class_id) params.classId = args.class_id as string;
    if (args.body_id) params.bodyId = args.body_id as string;
    return this.get(`/markets/${encodeURIComponent(args.market_id as string)}/bodies`, params);
  }

  private async listModels(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.market_id) return { content: [{ type: 'text', text: 'market_id is required' }], isError: true };
    const params: Record<string, string | undefined> = {};
    if (args.class_id) params.classId = args.class_id as string;
    if (args.body_id) params.bodyId = args.body_id as string;
    if (args.baumuster) params.baumuster = args.baumuster as string;
    return this.get(`/markets/${encodeURIComponent(args.market_id as string)}/models`, params);
  }

  private async getModel(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.market_id) return { content: [{ type: 'text', text: 'market_id is required' }], isError: true };
    if (!args.model_id) return { content: [{ type: 'text', text: 'model_id is required' }], isError: true };
    return this.get(`/markets/${encodeURIComponent(args.market_id as string)}/models/${encodeURIComponent(args.model_id as string)}`);
  }

  private async getInitialConfiguration(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.market_id) return { content: [{ type: 'text', text: 'market_id is required' }], isError: true };
    if (!args.model_id) return { content: [{ type: 'text', text: 'model_id is required' }], isError: true };
    return this.get(`/markets/${encodeURIComponent(args.market_id as string)}/models/${encodeURIComponent(args.model_id as string)}/configurations/initial`);
  }

  private async getConfiguration(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.market_id) return { content: [{ type: 'text', text: 'market_id is required' }], isError: true };
    if (!args.model_id) return { content: [{ type: 'text', text: 'model_id is required' }], isError: true };
    if (!args.configuration_id) return { content: [{ type: 'text', text: 'configuration_id is required' }], isError: true };
    return this.get(
      `/markets/${encodeURIComponent(args.market_id as string)}/models/${encodeURIComponent(args.model_id as string)}/configurations/${encodeURIComponent(args.configuration_id as string)}`
    );
  }

  private async getConfigurationSelectables(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.market_id) return { content: [{ type: 'text', text: 'market_id is required' }], isError: true };
    if (!args.model_id) return { content: [{ type: 'text', text: 'model_id is required' }], isError: true };
    if (!args.configuration_id) return { content: [{ type: 'text', text: 'configuration_id is required' }], isError: true };
    const params: Record<string, string | undefined> = {};
    if (args.component_types) params.componentTypes = args.component_types as string;
    return this.get(
      `/markets/${encodeURIComponent(args.market_id as string)}/models/${encodeURIComponent(args.model_id as string)}/configurations/${encodeURIComponent(args.configuration_id as string)}/selectables`,
      params
    );
  }

  private async getConfigurationAlternatives(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.market_id) return { content: [{ type: 'text', text: 'market_id is required' }], isError: true };
    if (!args.model_id) return { content: [{ type: 'text', text: 'model_id is required' }], isError: true };
    if (!args.configuration_id) return { content: [{ type: 'text', text: 'configuration_id is required' }], isError: true };
    if (!args.component_list) return { content: [{ type: 'text', text: 'component_list is required' }], isError: true };
    return this.get(
      `/markets/${encodeURIComponent(args.market_id as string)}/models/${encodeURIComponent(args.model_id as string)}/configurations/${encodeURIComponent(args.configuration_id as string)}/alternatives/${encodeURIComponent(args.component_list as string)}`
    );
  }

  private async getVehicleImage(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.market_id) return { content: [{ type: 'text', text: 'market_id is required' }], isError: true };
    if (!args.model_id) return { content: [{ type: 'text', text: 'model_id is required' }], isError: true };
    if (!args.configuration_id) return { content: [{ type: 'text', text: 'configuration_id is required' }], isError: true };
    const params: Record<string, string | undefined> = {};
    if (args.perspectives) params.perspectives = args.perspectives as string;
    if (args.roof_open !== undefined) params.roofOpen = String(args.roof_open);
    if (args.night !== undefined) params.night = String(args.night);
    return this.get(
      `/markets/${encodeURIComponent(args.market_id as string)}/models/${encodeURIComponent(args.model_id as string)}/configurations/${encodeURIComponent(args.configuration_id as string)}/images/vehicle`,
      params
    );
  }

  private async saveOnlineCode(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.market_id) return { content: [{ type: 'text', text: 'market_id is required' }], isError: true };
    if (!args.model_id) return { content: [{ type: 'text', text: 'model_id is required' }], isError: true };
    if (!args.configuration_id) return { content: [{ type: 'text', text: 'configuration_id is required' }], isError: true };
    return this.post(
      `/markets/${encodeURIComponent(args.market_id as string)}/onlinecode`,
      { modelId: args.model_id, configurationId: args.configuration_id }
    );
  }

  private async getOnlineCode(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.market_id) return { content: [{ type: 'text', text: 'market_id is required' }], isError: true };
    if (!args.online_code) return { content: [{ type: 'text', text: 'online_code is required' }], isError: true };
    return this.get(
      `/markets/${encodeURIComponent(args.market_id as string)}/onlinecode/${encodeURIComponent(args.online_code as string)}`
    );
  }
}

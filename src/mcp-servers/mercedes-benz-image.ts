/**
 * Mercedes-Benz Vehicle Image MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// No official Mercedes-Benz Image API MCP server was found on GitHub.
//
// Base URL: https://api.mercedes-benz.com/image_tryout/v1/vehicles
// Auth: API key passed as query parameter `apikey`
// Docs: https://developer.mercedes-benz.com/products/vehicle_images/docs
// Rate limits: Not publicly documented; subject to developer plan tier

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface MercedesBenzImageConfig {
  apiKey: string;
  /** Optional base URL override (default: https://api.mercedes-benz.com/image_tryout/v1/vehicles) */
  baseUrl?: string;
}

export class MercedesBenzImageMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: MercedesBenzImageConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? 'https://api.mercedes-benz.com/image_tryout/v1/vehicles';
  }

  static catalog() {
    return {
      name: 'mercedes-benz-image',
      displayName: 'Mercedes-Benz Vehicle Image',
      version: '1.0.0',
      category: 'automotive',
      keywords: [
        'mercedes-benz', 'mercedes', 'vehicle', 'image', 'car', 'exterior', 'interior',
        'photo', 'perspective', 'paint', 'rim', 'trim', 'upholstery', 'engine',
        'fin', 'vin', 'automotive', 'component',
      ],
      toolNames: [
        'get_vehicle_images', 'get_vehicle_components',
        'get_engine_image', 'get_paint_image', 'get_rim_image',
        'get_trim_image', 'get_upholstery_image', 'get_equipment_images',
      ],
      description: 'Mercedes-Benz vehicle imagery: retrieve exterior and interior PNG images by FIN/VIN, including components like paint, rims, trim, and upholstery with perspective and lighting options.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'get_vehicle_images',
        description: 'Get exterior and interior PNG image URLs for a Mercedes-Benz vehicle by FIN/VIN with perspective and lighting options',
        inputSchema: {
          type: 'object',
          properties: {
            finorvin: {
              type: 'string',
              description: 'Vehicle FIN or VIN identifier (e.g. WDD2130331A123456)',
            },
            perspectives: {
              type: 'string',
              description: 'Comma-separated perspective codes: EXT000–EXT350 (exterior rotation in 10° steps), INT1–INT4 (interior). Default: EXT020,INT1',
            },
            roof_open: {
              type: 'boolean',
              description: 'Show vehicle with roof open — valid for convertibles only (default: false)',
            },
            night: {
              type: 'boolean',
              description: 'Show vehicle at night with headlights on (default: false)',
            },
          },
          required: ['finorvin'],
        },
      },
      {
        name: 'get_vehicle_components',
        description: 'Get all available component image URLs (engine, paint, rim, trim, upholstery, equipment) for a Mercedes-Benz vehicle',
        inputSchema: {
          type: 'object',
          properties: {
            finorvin: {
              type: 'string',
              description: 'Vehicle FIN or VIN identifier',
            },
          },
          required: ['finorvin'],
        },
      },
      {
        name: 'get_engine_image',
        description: 'Get engine component image URL for a specific Mercedes-Benz vehicle by FIN/VIN',
        inputSchema: {
          type: 'object',
          properties: {
            finorvin: {
              type: 'string',
              description: 'Vehicle FIN or VIN identifier',
            },
          },
          required: ['finorvin'],
        },
      },
      {
        name: 'get_paint_image',
        description: 'Get paint/color component image URL for a specific Mercedes-Benz vehicle by FIN/VIN',
        inputSchema: {
          type: 'object',
          properties: {
            finorvin: {
              type: 'string',
              description: 'Vehicle FIN or VIN identifier',
            },
          },
          required: ['finorvin'],
        },
      },
      {
        name: 'get_rim_image',
        description: 'Get rim/wheel component image URL for a specific Mercedes-Benz vehicle by FIN/VIN',
        inputSchema: {
          type: 'object',
          properties: {
            finorvin: {
              type: 'string',
              description: 'Vehicle FIN or VIN identifier',
            },
          },
          required: ['finorvin'],
        },
      },
      {
        name: 'get_trim_image',
        description: 'Get trim component image URL for a specific Mercedes-Benz vehicle by FIN/VIN',
        inputSchema: {
          type: 'object',
          properties: {
            finorvin: {
              type: 'string',
              description: 'Vehicle FIN or VIN identifier',
            },
          },
          required: ['finorvin'],
        },
      },
      {
        name: 'get_upholstery_image',
        description: 'Get upholstery/interior fabric component image URL for a specific Mercedes-Benz vehicle by FIN/VIN',
        inputSchema: {
          type: 'object',
          properties: {
            finorvin: {
              type: 'string',
              description: 'Vehicle FIN or VIN identifier',
            },
          },
          required: ['finorvin'],
        },
      },
      {
        name: 'get_equipment_images',
        description: 'Get optional equipment component image URLs for a specific Mercedes-Benz vehicle by FIN/VIN',
        inputSchema: {
          type: 'object',
          properties: {
            finorvin: {
              type: 'string',
              description: 'Vehicle FIN or VIN identifier',
            },
          },
          required: ['finorvin'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'get_vehicle_images': return this.getVehicleImages(args);
        case 'get_vehicle_components': return this.getVehicleComponents(args);
        case 'get_engine_image': return this.getComponentImage(args, 'engine');
        case 'get_paint_image': return this.getComponentImage(args, 'paint');
        case 'get_rim_image': return this.getComponentImage(args, 'rim');
        case 'get_trim_image': return this.getComponentImage(args, 'trim');
        case 'get_upholstery_image': return this.getComponentImage(args, 'upholstery');
        case 'get_equipment_images': return this.getComponentImage(args, 'equipments');
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

  private async fetch(path: string, params: Record<string, string | undefined> = {}): Promise<ToolResult> {
    const response = await this.fetchWithRetry(this.buildUrl(path, params), {});
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getVehicleImages(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.finorvin) return { content: [{ type: 'text', text: 'finorvin is required' }], isError: true };
    const params: Record<string, string | undefined> = {};
    if (args.perspectives) params['perspectives'] = args.perspectives as string;
    if (args.roof_open !== undefined) params['roofOpen'] = String(args.roof_open);
    if (args.night !== undefined) params['night'] = String(args.night);
    return this.fetch(`/${encodeURIComponent(args.finorvin as string)}/vehicle`, params);
  }

  private async getVehicleComponents(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.finorvin) return { content: [{ type: 'text', text: 'finorvin is required' }], isError: true };
    return this.fetch(`/${encodeURIComponent(args.finorvin as string)}/components`);
  }

  private async getComponentImage(args: Record<string, unknown>, component: string): Promise<ToolResult> {
    if (!args.finorvin) return { content: [{ type: 'text', text: 'finorvin is required' }], isError: true };
    return this.fetch(`/${encodeURIComponent(args.finorvin as string)}/components/${component}`);
  }
}

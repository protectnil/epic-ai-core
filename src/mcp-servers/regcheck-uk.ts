/**
 * RegCheck UK (Car Registration API) MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found — no official vendor MCP server exists.
// Our adapter covers: 6 tools spanning UK, US, European, Australian, Indian car registration lookups.
// Recommendation: Use this adapter. No community MCP servers available.
//
// Base URL: https://www.regcheck.org.uk/api/json.aspx
// Auth: username + password passed as query parameters on every request
// Docs: https://www.carregistrationapi.com
// Registration API: Returns vehicle make, model, year, color, fuel type, engine size, MOT status.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface RegCheckUKConfig {
  username: string;
  password: string;
  /** Optional base URL override (default: https://www.regcheck.org.uk/api/json.aspx) */
  baseUrl?: string;
}

export class RegCheckUKMCPServer extends MCPAdapterBase {
  private readonly username: string;
  private readonly password: string;
  private readonly baseUrl: string;

  constructor(config: RegCheckUKConfig) {
    super();
    this.username = config.username;
    this.password = config.password;
    this.baseUrl = config.baseUrl ?? 'https://www.regcheck.org.uk/api/json.aspx';
  }

  static catalog() {
    return {
      name: 'regcheck-uk',
      displayName: 'RegCheck UK — Car Registration API',
      version: '1.0.0',
      category: 'automotive',
      keywords: [
        'car', 'vehicle', 'registration', 'numberplate', 'vrm', 'dvla', 'mot',
        'uk', 'usa', 'europe', 'australia', 'india', 'make', 'model', 'fuel',
        'engine', 'vin', 'automotive', 'regcheck', 'carregistrationapi',
      ],
      toolNames: [
        'check_uk_vehicle',
        'check_us_vehicle',
        'check_eu_vehicle',
        'check_au_vehicle',
        'check_in_vehicle',
        'check_vehicle_generic',
      ],
      description: 'Look up vehicle details (make, model, year, color, fuel type, engine size, MOT) from a car registration plate across the UK, USA, Europe, Australia, India, and more.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'check_uk_vehicle',
        description: 'Look up UK vehicle details from a number plate — returns make, model, year, color, fuel type, engine size, MOT expiry, and DVLA data',
        inputSchema: {
          type: 'object',
          properties: {
            registration: {
              type: 'string',
              description: 'UK vehicle registration number / number plate (e.g. "AB12CDE")',
            },
          },
          required: ['registration'],
        },
      },
      {
        name: 'check_us_vehicle',
        description: 'Look up US vehicle details from a license plate number and state — returns make, model, year, color, VIN, and registration data',
        inputSchema: {
          type: 'object',
          properties: {
            registration: {
              type: 'string',
              description: 'US license plate number (e.g. "7ABC123")',
            },
            state: {
              type: 'string',
              description: 'US state abbreviation (e.g. "CA", "TX", "NY")',
            },
          },
          required: ['registration', 'state'],
        },
      },
      {
        name: 'check_eu_vehicle',
        description: 'Look up European vehicle details from a registration plate and country code — supports most EU countries',
        inputSchema: {
          type: 'object',
          properties: {
            registration: {
              type: 'string',
              description: 'European vehicle registration plate (e.g. "AB-123-CD")',
            },
            country: {
              type: 'string',
              description: 'ISO 3166-1 alpha-2 country code (e.g. "DE", "FR", "ES", "IT", "NL", "BE", "PL")',
            },
          },
          required: ['registration', 'country'],
        },
      },
      {
        name: 'check_au_vehicle',
        description: 'Look up Australian vehicle details from a registration plate and state/territory code',
        inputSchema: {
          type: 'object',
          properties: {
            registration: {
              type: 'string',
              description: 'Australian vehicle registration plate',
            },
            state: {
              type: 'string',
              description: 'Australian state/territory code (e.g. "NSW", "VIC", "QLD", "WA", "SA", "TAS", "ACT", "NT")',
            },
          },
          required: ['registration', 'state'],
        },
      },
      {
        name: 'check_in_vehicle',
        description: 'Look up Indian vehicle details from a registration plate — returns make, model, owner, RTO region, and registration data',
        inputSchema: {
          type: 'object',
          properties: {
            registration: {
              type: 'string',
              description: 'Indian vehicle registration plate (e.g. "MH12AB1234")',
            },
          },
          required: ['registration'],
        },
      },
      {
        name: 'check_vehicle_generic',
        description: 'Look up vehicle details from a registration plate for any supported country by specifying a country code — fallback for countries not covered by dedicated tools',
        inputSchema: {
          type: 'object',
          properties: {
            registration: {
              type: 'string',
              description: 'Vehicle registration plate number',
            },
            country: {
              type: 'string',
              description: 'Country code as used by the RegCheck API (e.g. "UK", "US", "AU", "IN", "DE", "FR", "ZA", "NZ")',
            },
          },
          required: ['registration', 'country'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'check_uk_vehicle':
          return this.checkUkVehicle(args);
        case 'check_us_vehicle':
          return this.checkUsVehicle(args);
        case 'check_eu_vehicle':
          return this.checkEuVehicle(args);
        case 'check_au_vehicle':
          return this.checkAuVehicle(args);
        case 'check_in_vehicle':
          return this.checkInVehicle(args);
        case 'check_vehicle_generic':
          return this.checkVehicleGeneric(args);
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

  private buildUrl(searchString: string, extraParams: Record<string, string> = {}): string {
    const qs = new URLSearchParams({
      RegistrationNumber: searchString,
      username: this.username,
      password: this.password,
      ...extraParams,
    });
    return `${this.baseUrl}/Check?${qs.toString()}`;
  }

  private async fetchVehicle(searchString: string, extraParams: Record<string, string> = {}): Promise<ToolResult> {
    const url = this.buildUrl(searchString, extraParams);
    const response = await this.fetchWithRetry(url, { method: 'GET' });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`RegCheck returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async checkUkVehicle(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.registration) return { content: [{ type: 'text', text: 'registration is required' }], isError: true };
    return this.fetchVehicle(args.registration as string);
  }

  private async checkUsVehicle(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.registration) return { content: [{ type: 'text', text: 'registration is required' }], isError: true };
    if (!args.state) return { content: [{ type: 'text', text: 'state is required' }], isError: true };
    return this.fetchVehicle(`${args.registration as string} ${args.state as string}`, { country: 'US' });
  }

  private async checkEuVehicle(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.registration) return { content: [{ type: 'text', text: 'registration is required' }], isError: true };
    if (!args.country) return { content: [{ type: 'text', text: 'country is required' }], isError: true };
    return this.fetchVehicle(args.registration as string, { country: (args.country as string).toUpperCase() });
  }

  private async checkAuVehicle(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.registration) return { content: [{ type: 'text', text: 'registration is required' }], isError: true };
    if (!args.state) return { content: [{ type: 'text', text: 'state is required' }], isError: true };
    return this.fetchVehicle(`${args.registration as string} ${args.state as string}`, { country: 'AU' });
  }

  private async checkInVehicle(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.registration) return { content: [{ type: 'text', text: 'registration is required' }], isError: true };
    return this.fetchVehicle(args.registration as string, { country: 'IN' });
  }

  private async checkVehicleGeneric(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.registration) return { content: [{ type: 'text', text: 'registration is required' }], isError: true };
    if (!args.country) return { content: [{ type: 'text', text: 'country is required' }], isError: true };
    return this.fetchVehicle(args.registration as string, { country: (args.country as string).toUpperCase() });
  }
}

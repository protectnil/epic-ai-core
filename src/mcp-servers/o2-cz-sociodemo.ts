/**
 * O2 Czech Republic Socio-demo API MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// No official O2 Czech Republic Socio-demo MCP server was found on GitHub as of 2026-03-28.
// Our adapter covers: 3 tools. Vendor MCP covers: 0 tools (none exists).
// Recommendation: use-rest-api — no official MCP server exists.
//
// Base URL: https://developer.o2.cz/sociodemo/sandbox/api
// Auth: None documented (sandbox API, open access)
// Docs: https://developer.o2.cz/portal/vop
// Spec: https://api.apis.guru/v2/specs/o2.cz/sociodemo/1.2.0/swagger.json
// Rate limits: Not publicly documented
// NOTE: Socio-demo API provides time-aggregated data on groups of people at a given location
// in the Czech Republic, based on mobile station presence in the O2 network.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface O2CzSociodemoConfig {
  baseUrl?: string;
}

export class O2CzSociodemoMCPServer extends MCPAdapterBase {
  private readonly baseUrl: string;

  constructor(config: O2CzSociodemoConfig = {}) {
    super();
    this.baseUrl = config.baseUrl || 'https://developer.o2.cz/sociodemo/sandbox/api';
  }

  static catalog() {
    return {
      name: 'o2-cz-sociodemo',
      displayName: 'O2 CZ Socio-demo API',
      version: '1.0.0',
      category: 'analytics',
      keywords: [
        'o2', 'o2-cz', 'czech', 'czech republic', 'sociodemo', 'socio-demo',
        'demographics', 'age', 'gender', 'location', 'presence',
        'mobile', 'telecom', 'population', 'analytics', 'residential',
        'aggregated', 'hourly', 'transit', 'visit',
      ],
      toolNames: ['get_age_presence', 'get_gender_presence', 'get_info'],
      description: 'O2 Czech Republic Socio-demo API: query time-aggregated demographic data (age groups, gender) for people present at basic residential units in the Czech Republic, based on O2 mobile network data.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'get_age_presence',
        description: 'Get count of people present at a given location and hour, aggregated by age group. Age groups: 1=8-18, 2=19-25, 3=26-35, 4=36-55, 5=56+. Occurrence types: 1=transit, 2=visit.',
        inputSchema: {
          type: 'object',
          properties: {
            location: {
              type: 'string',
              description: 'Basic residential unit ID (e.g. "127752")',
            },
            ageGroup: {
              type: 'string',
              description: 'Age group: 1=8-18, 2=19-25, 3=26-35, 4=36-55, 5=56+',
            },
            occurenceType: {
              type: 'string',
              description: 'Occurrence type in the basic residential unit: 1=transit, 2=visit',
            },
            hour: {
              type: 'string',
              description: 'Time interval for count aggregation, 0 to 23 (e.g. "10")',
            },
          },
          required: ['location', 'ageGroup', 'occurenceType', 'hour'],
        },
      },
      {
        name: 'get_gender_presence',
        description: 'Get count of people present at a given location and hour, aggregated by gender. Gender: 1=male, 2=female. Occurrence types: 1=transit, 2=visit.',
        inputSchema: {
          type: 'object',
          properties: {
            location: {
              type: 'string',
              description: 'Basic residential unit ID (e.g. "127752")',
            },
            g: {
              type: 'string',
              description: 'Gender: 1=male, 2=female',
            },
            occurenceType: {
              type: 'string',
              description: 'Occurrence type in the basic residential unit: 1=transit, 2=visit',
            },
            hour: {
              type: 'string',
              description: 'Time interval for count aggregation, 0 to 23 (e.g. "10")',
            },
          },
          required: ['location', 'g', 'occurenceType', 'hour'],
        },
      },
      {
        name: 'get_info',
        description: 'Get version and data freshness information about the Socio-demo API application and backend.',
        inputSchema: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'get_age_presence':
          return this.getAgePresence(args);
        case 'get_gender_presence':
          return this.getGenderPresence(args);
        case 'get_info':
          return this.getInfo();
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

  private async apiGet(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    if (response.status === 204) {
      return { content: [{ type: 'text', text: 'No data available (204): the platform could not serve data for this request (differential privacy restriction or no data found).' }], isError: false };
    }
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `API error: ${response.status} ${errText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getAgePresence(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.location || !args.ageGroup || !args.occurenceType || !args.hour) {
      return { content: [{ type: 'text', text: 'location, ageGroup, occurenceType, and hour are required' }], isError: true };
    }
    const params = new URLSearchParams({
      ageGroup: String(args.ageGroup),
      occurenceType: String(args.occurenceType),
      hour: String(args.hour),
    });
    return this.apiGet(`/age/${encodeURIComponent(String(args.location))}?${params}`);
  }

  private async getGenderPresence(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.location || !args.g || !args.occurenceType || !args.hour) {
      return { content: [{ type: 'text', text: 'location, g, occurenceType, and hour are required' }], isError: true };
    }
    const params = new URLSearchParams({
      g: String(args.g),
      occurenceType: String(args.occurenceType),
      hour: String(args.hour),
    });
    return this.apiGet(`/gender/${encodeURIComponent(String(args.location))}?${params}`);
  }

  private async getInfo(): Promise<ToolResult> {
    return this.apiGet('/info');
  }
}

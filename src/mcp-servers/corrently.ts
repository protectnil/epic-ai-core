/**
 * Corrently MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None — no official Corrently/STROMDAO MCP server.
//
// Base URL: https://api.corrently.io/v2.0
// Auth: Optional API key via `key` query parameter on protected endpoints.
//       Public endpoints (GrünstromIndex, tariff, WiM) work without a key.
// Docs: https://corrently.io/
// Rate limits: Not explicitly documented; reasonable usage expected.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface CorrentlyConfig {
  apiKey?: string;
  baseUrl?: string;
}

export class CorrentlyMCPServer extends MCPAdapterBase {
  private readonly apiKey: string | undefined;
  private readonly baseUrl: string;

  constructor(config: CorrentlyConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.corrently.io/v2.0';
  }

  static catalog() {
    return {
      name: 'corrently',
      displayName: 'Corrently',
      version: '1.0.0',
      category: 'energy',
      keywords: [
        'corrently', 'energy', 'green energy', 'electricity', 'grid',
        'GrünstromIndex', 'green power index', 'dispatch', 'metering',
        'tariff', 'stromkonto', 'ledger', 'blockchain', 'Germany',
        'renewable', 'solar', 'wind', 'CO2', 'smart meter', 'OCPP', 'EV charging',
        'wim', 'wechselprozesse', 'openmeter', 'easee', 'wallbox',
      ],
      toolNames: [
        'get_green_power_index',
        'get_dispatch',
        'get_prediction',
        'get_best_hour',
        'get_tariff',
        'get_tariff_components',
        'get_wim_status',
        'get_stromkonto_balances',
        'get_stromkonto_choices',
        'get_meter_reading',
        'get_openmeter_meters',
        'get_openmeter_readings',
        'get_easee_sessions',
        'get_ocpp_sessions',
      ],
      description: 'Corrently green energy ecosystem by STROMDAO: real-time GrünstromIndex (regional green power forecast), energy dispatch scheduling, tariff information, smart meter readings, and energy ledger (Stromkonto) for the German market.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'get_green_power_index',
        description: 'Get the current GrünstromIndex (Green Power Index) market data for a location in Germany — indicates how much regional renewable energy (solar, wind) is available right now on a 0–100 scale',
        inputSchema: {
          type: 'object',
          properties: {
            zip: {
              type: 'string',
              description: 'German postal code (PLZ) to query green power index for (e.g. "69168")',
            },
          },
          required: [],
        },
      },
      {
        name: 'get_dispatch',
        description: 'Get the green energy dispatch schedule for a location in Germany — shows the energy source mix (renewables vs conventional) over time for grid balancing and scheduling (Fahrplanmanagement)',
        inputSchema: {
          type: 'object',
          properties: {
            zip: {
              type: 'string',
              description: 'German postal code (PLZ) for the dispatch query (e.g. "69168")',
            },
          },
          required: [],
        },
      },
      {
        name: 'get_prediction',
        description: 'Get AI-based prediction of the GrünstromIndex for a location in Germany — forecast of upcoming renewable energy availability for smart home automation and load shifting',
        inputSchema: {
          type: 'object',
          properties: {
            zip: {
              type: 'string',
              description: 'German postal code (PLZ) for the forecast query (e.g. "69168")',
            },
          },
          required: [],
        },
      },
      {
        name: 'get_best_hour',
        description: 'Find the best upcoming hour with maximum regional green energy for a given location — useful for scheduling high-consumption devices (EV charging, dishwasher, etc.) at the greenest time',
        inputSchema: {
          type: 'object',
          properties: {
            zip: {
              type: 'string',
              description: 'German postal code (PLZ) (e.g. "69168")',
            },
            timeframe: {
              type: 'number',
              description: 'Hours ahead to search within (default: 24)',
            },
            hours: {
              type: 'number',
              description: 'Duration in hours of the time slot needed (default: 1)',
            },
          },
          required: [],
        },
      },
      {
        name: 'get_tariff',
        description: 'Get the current Corrently energy tariff (Standardlastprofil H0) for a German postal code — returns base price and energy price for private households',
        inputSchema: {
          type: 'object',
          properties: {
            zipcode: {
              type: 'string',
              description: 'German postal code (PLZ) for tariff lookup (e.g. "69168")',
            },
          },
          required: [],
        },
      },
      {
        name: 'get_tariff_components',
        description: 'Get detailed energy tariff price components for a location — breaks down base price, energy price, grid fees, taxes, and levies for a specific consumption profile',
        inputSchema: {
          type: 'object',
          properties: {
            zipcode: {
              type: 'string',
              description: 'German postal code (PLZ) (e.g. "69168")',
            },
            email: {
              type: 'string',
              description: 'Customer email address for personalised tariff components',
            },
            kwha: {
              type: 'number',
              description: 'Annual consumption in kWh (default: 3500)',
            },
            milliseconds: {
              type: 'number',
              description: 'Timestamp in milliseconds to price as of a specific point in time',
            },
            wh: {
              type: 'number',
              description: 'Energy in Wh to calculate cost for',
            },
          },
          required: [],
        },
      },
      {
        name: 'get_wim_status',
        description: 'Get status information for a WiM (Wechselprozesse im Messwesen Strom) process — tracks metering change and allocation process status in the German energy market',
        inputSchema: {
          type: 'object',
          properties: {
            vid: {
              type: 'string',
              description: 'WiM process / transaction ID to look up',
            },
          },
          required: [],
        },
      },
      {
        name: 'get_stromkonto_balances',
        description: 'Get the Stromkonto (energy ledger) balances for an account — shows green energy credits earned from renewable generation and consumed, stored on the distributed ledger',
        inputSchema: {
          type: 'object',
          properties: {
            account: {
              type: 'string',
              description: 'Ethereum-style account address (0x...) of the Stromkonto',
            },
          },
          required: [],
        },
      },
      {
        name: 'get_stromkonto_choices',
        description: 'Get selectable green energy choices available for a Stromkonto account — lists the green energy products the customer can apply to their account',
        inputSchema: {
          type: 'object',
          properties: {
            account: {
              type: 'string',
              description: 'Ethereum-style account address (0x...) of the Stromkonto',
            },
          },
          required: [],
        },
      },
      {
        name: 'get_meter_reading',
        description: 'Get the latest smart meter reading decorated with GrünstromIndex values for a Stromkonto account — returns OBIS code values (1.8.0, 1.8.1, 1.8.2) with green/grey energy split and CO2 footprint',
        inputSchema: {
          type: 'object',
          properties: {
            account: {
              type: 'string',
              description: 'Ethereum-style account address (0x...) of the Stromkonto linked to the meter',
            },
          },
          required: [],
        },
      },
      {
        name: 'get_openmeter_meters',
        description: 'List public shared smart meters registered in the OpenMETER project in Germany — available for analytics and data exploration',
        inputSchema: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
      {
        name: 'get_openmeter_readings',
        description: 'Get activity readings from public OpenMETER smart meters in Germany — returns energy consumption and generation data from community-shared meters',
        inputSchema: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
      {
        name: 'get_easee_sessions',
        description: 'Get last session info for all Easee EV wallbox chargers accessible by a given easee.cloud user — returns charging session data including energy delivered and timestamps',
        inputSchema: {
          type: 'object',
          properties: {
            username: {
              type: 'string',
              description: 'Username as registered on easee.cloud',
            },
            password: {
              type: 'string',
              description: 'Password as registered on easee.cloud',
            },
          },
          required: [],
        },
      },
      {
        name: 'get_ocpp_sessions',
        description: 'Get last session info for OCPP-connected EV charging stations in the Corrently ecosystem — returns session data for managed EV chargers via the Corrently OCPP cloud backend',
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
        case 'get_green_power_index':
          return this.getGreenPowerIndex(args);
        case 'get_dispatch':
          return this.getDispatch(args);
        case 'get_prediction':
          return this.getPrediction(args);
        case 'get_best_hour':
          return this.getBestHour(args);
        case 'get_tariff':
          return this.getTariff(args);
        case 'get_tariff_components':
          return this.getTariffComponents(args);
        case 'get_wim_status':
          return this.getWimStatus(args);
        case 'get_stromkonto_balances':
          return this.getStromkontoBalances(args);
        case 'get_stromkonto_choices':
          return this.getStromkontoChoices(args);
        case 'get_meter_reading':
          return this.getMeterReading(args);
        case 'get_openmeter_meters':
          return this.getOpenMeterMeters();
        case 'get_openmeter_readings':
          return this.getOpenMeterReadings();
        case 'get_easee_sessions':
          return this.getEaseeSessions(args);
        case 'get_ocpp_sessions':
          return this.getOcppSessions();
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

  private get baseHeaders(): Record<string, string> {
    return { 'Content-Type': 'application/json' };
  }


  private async apiGet(path: string, params: Record<string, string> = {}): Promise<ToolResult> {
    if (this.apiKey) params['key'] = this.apiKey;
    const qs = new URLSearchParams(params).toString();
    const url = `${this.baseUrl}${path}${qs ? '?' + qs : ''}`;
    const response = await this.fetchWithRetry(url, { headers: this.baseHeaders });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getGreenPowerIndex(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (args.zip) params.zip = args.zip as string;
    return this.apiGet('/gsi/marketdata', params);
  }

  private async getDispatch(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (args.zip) params.zip = args.zip as string;
    return this.apiGet('/gsi/dispatch', params);
  }

  private async getPrediction(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (args.zip) params.zip = args.zip as string;
    return this.apiGet('/gsi/prediction', params);
  }

  private async getBestHour(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (args.zip) params.zip = args.zip as string;
    if (args.timeframe != null) params.timeframe = String(args.timeframe);
    if (args.hours != null) params.hours = String(args.hours);
    return this.apiGet('/gsi/bestHour', params);
  }

  private async getTariff(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (args.zipcode) params.zipcode = args.zipcode as string;
    return this.apiGet('/tariff/slph0', params);
  }

  private async getTariffComponents(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (args.zipcode) params.zipcode = args.zipcode as string;
    if (args.email) params.email = args.email as string;
    if (args.kwha != null) params.kwha = String(args.kwha);
    if (args.milliseconds != null) params.milliseconds = String(args.milliseconds);
    if (args.wh != null) params.wh = String(args.wh);
    return this.apiGet('/tariff/components', params);
  }

  private async getWimStatus(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (args.vid) params.vid = args.vid as string;
    return this.apiGet('/wim/status', params);
  }

  private async getStromkontoBalances(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (args.account) params.account = args.account as string;
    return this.apiGet('/stromkonto/balances', params);
  }

  private async getStromkontoChoices(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (args.account) params.account = args.account as string;
    return this.apiGet('/stromkonto/choices', params);
  }

  private async getMeterReading(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (args.account) params.account = args.account as string;
    return this.apiGet('/metering/reading', params);
  }

  private async getOpenMeterMeters(): Promise<ToolResult> {
    return this.apiGet('/alternative/openmeter/meters');
  }

  private async getOpenMeterReadings(): Promise<ToolResult> {
    return this.apiGet('/alternative/openmeter/readings');
  }

  private async getEaseeSessions(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (args.username) params.username = args.username as string;
    if (args.password) params.password = args.password as string;
    return this.apiGet('/alternative/easee/lastSessions', params);
  }

  private async getOcppSessions(): Promise<ToolResult> {
    return this.apiGet('/alternative/ocpp/lastSessions');
  }
}

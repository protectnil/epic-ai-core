/**
 * Mercedes-Benz Remote Diagnostic Support MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// No official Mercedes-Benz MCP server was found on GitHub.
// We build a REST wrapper for the Remote Diagnostic Support API.
//
// Base URL: https://api.mercedes-benz.com/remotediagnostic_tryout/v1
// Auth: OAuth2 Bearer token (passed in config)
// Docs: https://developer.mercedes-benz.com/apis/remote_diagnostic_support_tryout
// Rate limits: Not publicly specified; standard API throttling applies.
// Spec: https://api.apis.guru/v2/specs/mercedes-benz.com/diagnostics/1.0/swagger.json

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface MercedesBenzDiagnosticsConfig {
  apiKey: string;
  baseUrl?: string;
}

export class MercedesBenzDiagnosticsMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: MercedesBenzDiagnosticsConfig) {
    super();
    this.apiKey  = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.mercedes-benz.com/remotediagnostic_tryout/v1';
  }

  static catalog() {
    return {
      name: 'mercedes-benz-diagnostics',
      displayName: 'Mercedes-Benz Remote Diagnostics',
      version: '1.0.0',
      category: 'automotive',
      keywords: [
        'mercedes-benz', 'mercedes', 'benz', 'automotive', 'vehicle', 'diagnostics',
        'remote diagnostic', 'dtc', 'fault code', 'ecu', 'obdii', 'obd2',
        'onboard diagnostics', 'trouble code', 'snapshot', 'vehicle health',
        'daimler', 'car diagnostics', 'vehicle readout',
      ],
      toolNames: [
        'read_dtcs',
        'read_dtc_snapshot',
        'read_ecus',
        'read_resources',
      ],
      description: 'Mercedes-Benz Remote Diagnostic Support API: read vehicle DTCs (fault codes), ECU data, DTC snapshots, and diagnostic resources for a specific vehicle on behalf of the owner.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'read_dtcs',
        description: 'Read the list of DTCs (Diagnostic Trouble Codes / fault codes) for a specific vehicle. Optionally filter by ECU ID or DTC status.',
        inputSchema: {
          type: 'object',
          properties: {
            vehicleId: {
              type: 'string',
              description: 'The vehicle identifier (VIN or Mercedes-Benz vehicle ID)',
            },
            ecuId: {
              type: 'string',
              description: 'Optional ECU ID to filter results to a specific electronic control unit',
            },
            dtcStatus: {
              type: 'string',
              description: 'Optional DTC status filter (e.g. PRESENT, STORED, PENDING)',
            },
          },
          required: ['vehicleId'],
        },
      },
      {
        name: 'read_dtc_snapshot',
        description: 'Read the DTC snapshot data for a specific DTC on a specific ECU of a vehicle. Returns freeze frame / snapshot data captured when the fault was set.',
        inputSchema: {
          type: 'object',
          properties: {
            vehicleId: {
              type: 'string',
              description: 'The vehicle identifier (VIN or Mercedes-Benz vehicle ID)',
            },
            ecuId: {
              type: 'string',
              description: 'The ECU ID where the DTC was recorded',
            },
            dtcId: {
              type: 'string',
              description: 'The DTC identifier (fault code, e.g. P0300)',
            },
          },
          required: ['vehicleId', 'ecuId', 'dtcId'],
        },
      },
      {
        name: 'read_ecus',
        description: 'Read the list of ECUs (Electronic Control Units) present in a specific vehicle. Optionally filter by ECU ID.',
        inputSchema: {
          type: 'object',
          properties: {
            vehicleId: {
              type: 'string',
              description: 'The vehicle identifier (VIN or Mercedes-Benz vehicle ID)',
            },
            ecuId: {
              type: 'string',
              description: 'Optional ECU ID to retrieve data for a specific control unit only',
            },
          },
          required: ['vehicleId'],
        },
      },
      {
        name: 'read_resources',
        description: 'Read the list of available diagnostic resources for a specific vehicle.',
        inputSchema: {
          type: 'object',
          properties: {
            vehicleId: {
              type: 'string',
              description: 'The vehicle identifier (VIN or Mercedes-Benz vehicle ID)',
            },
          },
          required: ['vehicleId'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'read_dtcs':         return this.readDtcs(args);
        case 'read_dtc_snapshot': return this.readDtcSnapshot(args);
        case 'read_ecus':         return this.readEcus(args);
        case 'read_resources':    return this.readResources(args);
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

  // ── Private helpers ────────────────────────────────────────────────────────

  private async post(path: string, params: Record<string, string> = {}): Promise<ToolResult> {
    const qs = Object.keys(params).length > 0 ? '?' + new URLSearchParams(params).toString() : '';
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}${qs}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) {
      const errText = await response.text();
      return {
        content: [{ type: 'text', text: `API error ${response.status}: ${errText.slice(0, 500)}` }],
        isError: true,
      };
    }
    const data: unknown = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  // ── Tool implementations ───────────────────────────────────────────────────

  private async readDtcs(args: Record<string, unknown>): Promise<ToolResult> {
    const vehicleId = String(args['vehicleId'] ?? '');
    if (!vehicleId) return { content: [{ type: 'text', text: 'vehicleId is required' }], isError: true };
    const params: Record<string, string> = {};
    if (args['ecuId'])     params['ecuId']     = String(args['ecuId']);
    if (args['dtcStatus']) params['dtcStatus'] = String(args['dtcStatus']);
    return this.post(`/vehicles/${encodeURIComponent(vehicleId)}/dtcReadouts`, params);
  }

  private async readDtcSnapshot(args: Record<string, unknown>): Promise<ToolResult> {
    const vehicleId = String(args['vehicleId'] ?? '');
    const ecuId     = String(args['ecuId']     ?? '');
    const dtcId     = String(args['dtcId']     ?? '');
    if (!vehicleId || !ecuId || !dtcId) {
      return { content: [{ type: 'text', text: 'vehicleId, ecuId, and dtcId are required' }], isError: true };
    }
    return this.post(
      `/vehicles/${encodeURIComponent(vehicleId)}/ecuId/${encodeURIComponent(ecuId)}/dtcId/${encodeURIComponent(dtcId)}/dtcSnapshotReadouts`,
    );
  }

  private async readEcus(args: Record<string, unknown>): Promise<ToolResult> {
    const vehicleId = String(args['vehicleId'] ?? '');
    if (!vehicleId) return { content: [{ type: 'text', text: 'vehicleId is required' }], isError: true };
    const params: Record<string, string> = {};
    if (args['ecuId']) params['ecuId'] = String(args['ecuId']);
    return this.post(`/vehicles/${encodeURIComponent(vehicleId)}/ecuReadouts`, params);
  }

  private async readResources(args: Record<string, unknown>): Promise<ToolResult> {
    const vehicleId = String(args['vehicleId'] ?? '');
    if (!vehicleId) return { content: [{ type: 'text', text: 'vehicleId is required' }], isError: true };
    return this.post(`/vehicles/${encodeURIComponent(vehicleId)}/resourceReadouts`);
  }
}

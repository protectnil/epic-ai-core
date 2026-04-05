/**
 * TelematicsSDK MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03. No official MCP server published by Datamotion/TelematicsSDK.
//
// Base URL: https://api.telematicssdk.com (statistics/scorings)
//           https://mobilesdk.telematicssdk.com (trip details)
// Auth: JWT DeviceToken passed as query parameter `DeviceToken` for user-level endpoints.
//       Admin endpoints require admin JWT obtained via Datahub credentials.
//       Create a user/get credentials at: https://userdatahub.com
// Docs: https://docs.telematicssdk.com
// Rate limits: Not publicly documented. Contact Datamotion for enterprise limits.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface TelematicsSDKConfig {
  /** JWT DeviceToken for user-level API calls */
  deviceToken: string;
  /** Optional instance ID for consolidated/admin endpoints */
  instanceId?: string;
  /** Optional app ID for consolidated/admin endpoints */
  appId?: string;
  /** Optional company ID for consolidated/admin endpoints */
  companyId?: string;
  /** Optional base URL override (default: https://api.telematicssdk.com) */
  baseUrl?: string;
  /** Optional mobile SDK base URL override (default: https://mobilesdk.telematicssdk.com) */
  mobileSdkBaseUrl?: string;
}

export class TelematicsSDKMCPServer extends MCPAdapterBase {
  private readonly deviceToken: string;
  private readonly instanceId: string;
  private readonly appId: string;
  private readonly companyId: string;
  private readonly baseUrl: string;
  private readonly mobileSdkBaseUrl: string;

  constructor(config: TelematicsSDKConfig) {
    super();
    this.deviceToken = config.deviceToken;
    this.instanceId = config.instanceId ?? '';
    this.appId = config.appId ?? '';
    this.companyId = config.companyId ?? '';
    this.baseUrl = config.baseUrl ?? 'https://api.telematicssdk.com';
    this.mobileSdkBaseUrl = config.mobileSdkBaseUrl ?? 'https://mobilesdk.telematicssdk.com';
  }

  static catalog() {
    return {
      name: 'telematicssdk',
      displayName: 'TelematicsSDK',
      version: '1.0.0',
      category: 'automotive' as const,
      keywords: [
        'telematics', 'driving', 'automotive', 'iot', 'insurance', 'trip', 'scoring',
        'eco', 'safe driving', 'ubi', 'usage-based insurance', 'driver behavior',
        'gps', 'tracking', 'fleet', 'mobile sdk', 'datamotion',
      ],
      toolNames: [
        'get_trip_details',
        'get_consolidated_scorings',
        'get_consolidated_scorings_daily',
        'get_individual_scorings',
        'get_individual_scorings_daily',
        'get_consolidated_statistics',
        'get_consolidated_statistics_daily',
        'get_individual_statistics',
        'get_individual_statistics_daily',
      ],
      description: 'TelematicsSDK (Datamotion) API: retrieve driving trip details, safe-driving scores, eco scores, and statistics for individual users and consolidated fleets. Powers usage-based insurance, driver coaching, and fleet management.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'get_trip_details',
        description: 'Retrieve full details for a single driving trip including route points, speed, acceleration events, eco score, and safe driving score by track token',
        inputSchema: {
          type: 'object',
          properties: {
            track_token: {
              type: 'string',
              description: 'The unique track token identifying the trip',
            },
          },
          required: ['track_token'],
        },
      },
      {
        name: 'get_consolidated_scorings',
        description: 'Get aggregated safe-driving and eco scores across all users for a date range — used for fleet-level reporting and back-end analytics',
        inputSchema: {
          type: 'object',
          properties: {
            start_date: {
              type: 'string',
              description: 'Start of the reporting period (ISO 8601 date, e.g. 2024-01-01)',
            },
            end_date: {
              type: 'string',
              description: 'End of the reporting period (ISO 8601 date, e.g. 2024-01-31)',
            },
            tag: {
              type: 'string',
              description: 'Optional tag to filter users/devices',
            },
          },
          required: ['start_date', 'end_date'],
        },
      },
      {
        name: 'get_consolidated_scorings_daily',
        description: 'Get day-by-day breakdown of consolidated safe-driving and eco scores across all users for a date range',
        inputSchema: {
          type: 'object',
          properties: {
            start_date: {
              type: 'string',
              description: 'Start of the reporting period (ISO 8601 date)',
            },
            end_date: {
              type: 'string',
              description: 'End of the reporting period (ISO 8601 date)',
            },
            tag: {
              type: 'string',
              description: 'Optional tag to filter users/devices',
            },
          },
          required: ['start_date', 'end_date'],
        },
      },
      {
        name: 'get_individual_scorings',
        description: 'Get accumulated safe-driving and eco scoring for the authenticated user over a date range',
        inputSchema: {
          type: 'object',
          properties: {
            start_date: {
              type: 'string',
              description: 'Start of the scoring period (ISO 8601 date)',
            },
            end_date: {
              type: 'string',
              description: 'End of the scoring period (ISO 8601 date)',
            },
          },
          required: ['start_date', 'end_date'],
        },
      },
      {
        name: 'get_individual_scorings_daily',
        description: 'Get day-by-day safe-driving and eco scoring for the authenticated user',
        inputSchema: {
          type: 'object',
          properties: {
            start_date: {
              type: 'string',
              description: 'Start of the scoring period (ISO 8601 date)',
            },
            end_date: {
              type: 'string',
              description: 'End of the scoring period (ISO 8601 date)',
            },
            tag: {
              type: 'string',
              description: 'Optional tag to filter results',
            },
          },
          required: ['start_date', 'end_date'],
        },
      },
      {
        name: 'get_consolidated_statistics',
        description: 'Get aggregated driving statistics (distance, duration, trip count) across all users for a date range — for fleet and back-end analytics',
        inputSchema: {
          type: 'object',
          properties: {
            start_date: {
              type: 'string',
              description: 'Start of the reporting period (ISO 8601 date)',
            },
            end_date: {
              type: 'string',
              description: 'End of the reporting period (ISO 8601 date)',
            },
            tag: {
              type: 'string',
              description: 'Optional tag to filter users/devices',
            },
          },
          required: ['start_date', 'end_date'],
        },
      },
      {
        name: 'get_consolidated_statistics_daily',
        description: 'Get day-by-day driving statistics across all users for a date range',
        inputSchema: {
          type: 'object',
          properties: {
            start_date: {
              type: 'string',
              description: 'Start of the reporting period (ISO 8601 date)',
            },
            end_date: {
              type: 'string',
              description: 'End of the reporting period (ISO 8601 date)',
            },
            tag: {
              type: 'string',
              description: 'Optional tag to filter users/devices',
            },
          },
          required: ['start_date', 'end_date'],
        },
      },
      {
        name: 'get_individual_statistics',
        description: 'Get accumulated driving statistics (distance, duration, trips) for the authenticated user over a date range',
        inputSchema: {
          type: 'object',
          properties: {
            start_date: {
              type: 'string',
              description: 'Start of the statistics period (ISO 8601 date)',
            },
            end_date: {
              type: 'string',
              description: 'End of the statistics period (ISO 8601 date)',
            },
          },
          required: ['start_date', 'end_date'],
        },
      },
      {
        name: 'get_individual_statistics_daily',
        description: 'Get day-by-day driving statistics for the authenticated user',
        inputSchema: {
          type: 'object',
          properties: {
            start_date: {
              type: 'string',
              description: 'Start of the statistics period (ISO 8601 date)',
            },
            end_date: {
              type: 'string',
              description: 'End of the statistics period (ISO 8601 date)',
            },
          },
          required: ['start_date', 'end_date'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'get_trip_details':
          return await this.getTripDetails(args);
        case 'get_consolidated_scorings':
          return await this.getConsolidatedScorings(args);
        case 'get_consolidated_scorings_daily':
          return await this.getConsolidatedScoringsDaily(args);
        case 'get_individual_scorings':
          return await this.getIndividualScorings(args);
        case 'get_individual_scorings_daily':
          return await this.getIndividualScoringsDaily(args);
        case 'get_consolidated_statistics':
          return await this.getConsolidatedStatistics(args);
        case 'get_consolidated_statistics_daily':
          return await this.getConsolidatedStatisticsDaily(args);
        case 'get_individual_statistics':
          return await this.getIndividualStatistics(args);
        case 'get_individual_statistics_daily':
          return await this.getIndividualStatisticsDaily(args);
        default:
          return {
            content: [{ type: 'text', text: `Unknown tool: ${name}` }],
            isError: true,
          };
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        content: [{ type: 'text', text: `TelematicsSDK error: ${message}` }],
        isError: true,
      };
    }
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  private async getTripDetails(args: Record<string, unknown>): Promise<ToolResult> {
    const url = new URL(`${this.mobileSdkBaseUrl}/mobilesdk/stage/track/get_track/v1`);
    url.searchParams.set('trackToken', String(args['track_token'] ?? ''));
    url.searchParams.set('DeviceToken', this.deviceToken);
    return this.get(url.toString());
  }

  private async getConsolidatedScorings(args: Record<string, unknown>): Promise<ToolResult> {
    const url = new URL(`${this.baseUrl}/statistics/v1/Scorings/consolidated`);
    url.searchParams.set('DeviceToken', this.deviceToken);
    url.searchParams.set('StartDate', String(args['start_date'] ?? ''));
    url.searchParams.set('EndDate', String(args['end_date'] ?? ''));
    if (args['tag']) url.searchParams.set('Tag', String(args['tag']));
    if (this.instanceId) url.searchParams.set('InstanceId', this.instanceId);
    if (this.appId) url.searchParams.set('AppId', this.appId);
    if (this.companyId) url.searchParams.set('CompanyId', this.companyId);
    return this.get(url.toString());
  }

  private async getConsolidatedScoringsDaily(args: Record<string, unknown>): Promise<ToolResult> {
    const url = new URL(`${this.baseUrl}/statistics/v1/Scorings/consolidated/daily`);
    url.searchParams.set('DeviceToken', this.deviceToken);
    url.searchParams.set('StartDate', String(args['start_date'] ?? ''));
    url.searchParams.set('EndDate', String(args['end_date'] ?? ''));
    if (args['tag']) url.searchParams.set('Tag', String(args['tag']));
    if (this.instanceId) url.searchParams.set('InstanceId', this.instanceId);
    if (this.appId) url.searchParams.set('AppId', this.appId);
    if (this.companyId) url.searchParams.set('CompanyId', this.companyId);
    return this.get(url.toString());
  }

  private async getIndividualScorings(args: Record<string, unknown>): Promise<ToolResult> {
    const url = new URL(`${this.baseUrl}/statistics/v1/Scorings/individual/`);
    url.searchParams.set('DeviceToken', this.deviceToken);
    url.searchParams.set('startDate', String(args['start_date'] ?? ''));
    url.searchParams.set('endDate', String(args['end_date'] ?? ''));
    return this.get(url.toString());
  }

  private async getIndividualScoringsDaily(args: Record<string, unknown>): Promise<ToolResult> {
    const url = new URL(`${this.baseUrl}/statistics/v1/Scorings/individual/daily`);
    url.searchParams.set('DeviceToken', this.deviceToken);
    url.searchParams.set('StartDate', String(args['start_date'] ?? ''));
    url.searchParams.set('EndDate', String(args['end_date'] ?? ''));
    if (args['tag']) url.searchParams.set('Tag', String(args['tag']));
    return this.get(url.toString());
  }

  private async getConsolidatedStatistics(args: Record<string, unknown>): Promise<ToolResult> {
    const url = new URL(`${this.baseUrl}/statistics/v1/Statistics/consolidated`);
    url.searchParams.set('DeviceToken', this.deviceToken);
    url.searchParams.set('StartDate', String(args['start_date'] ?? ''));
    url.searchParams.set('EndDate', String(args['end_date'] ?? ''));
    if (args['tag']) url.searchParams.set('Tag', String(args['tag']));
    if (this.instanceId) url.searchParams.set('InstanceId', this.instanceId);
    if (this.appId) url.searchParams.set('AppId', this.appId);
    if (this.companyId) url.searchParams.set('CompanyId', this.companyId);
    return this.get(url.toString());
  }

  private async getConsolidatedStatisticsDaily(args: Record<string, unknown>): Promise<ToolResult> {
    const url = new URL(`${this.baseUrl}/statistics/v1/Statistics/consolidated/daily`);
    url.searchParams.set('DeviceToken', this.deviceToken);
    url.searchParams.set('StartDate', String(args['start_date'] ?? ''));
    url.searchParams.set('EndDate', String(args['end_date'] ?? ''));
    if (args['tag']) url.searchParams.set('Tag', String(args['tag']));
    if (this.instanceId) url.searchParams.set('InstanceId', this.instanceId);
    if (this.appId) url.searchParams.set('AppId', this.appId);
    if (this.companyId) url.searchParams.set('CompanyId', this.companyId);
    return this.get(url.toString());
  }

  private async getIndividualStatistics(args: Record<string, unknown>): Promise<ToolResult> {
    const url = new URL(`${this.baseUrl}/statistics/v1/Statistics/individual/`);
    url.searchParams.set('DeviceToken', this.deviceToken);
    url.searchParams.set('startDate', String(args['start_date'] ?? ''));
    url.searchParams.set('endDate', String(args['end_date'] ?? ''));
    return this.get(url.toString());
  }

  private async getIndividualStatisticsDaily(args: Record<string, unknown>): Promise<ToolResult> {
    const url = new URL(`${this.baseUrl}/statistics/v1/Statistics/individual/daily/`);
    url.searchParams.set('DeviceToken', this.deviceToken);
    url.searchParams.set('startDate', String(args['start_date'] ?? ''));
    url.searchParams.set('endDate', String(args['end_date'] ?? ''));
    return this.get(url.toString());
  }

  private async get(url: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    const text = await response.text();
    const truncated = text.length > 10240 ? text.slice(0, 10240) + '\n[truncated]' : text;
    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `HTTP ${response.status}: ${truncated}` }],
        isError: true,
      };
    }
    return {
      content: [{ type: 'text', text: truncated }],
      isError: false,
    };
  }
}

/**
 * GameSparks Game Details MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03. GameSparks (AWS) has not published an official MCP server.
//
// Base URL: https://config2.gamesparks.net
// Auth: JWT Bearer token — Authorization: <jwt> (accessToken scheme)
//   Also supports Basic auth and accessToken query param.
// Docs: https://docs.gamesparks.com/api-reference/
// Rate limits: Not publicly documented.
// Note: GameSparks was acquired by AWS. The game management API manages game configuration,
//   snapshots, scripts, analytics, experiments, and push notifications.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface GameSparksConfig {
  /** JWT access token */
  accessToken: string;
  /** Game API key */
  apiKey?: string;
  /** Optional base URL override */
  baseUrl?: string;
}

export class GameSparksGameDetailsMCPServer extends MCPAdapterBase {
  private readonly accessToken: string;
  private readonly baseUrl: string;

  constructor(config: GameSparksConfig) {
    super();
    this.accessToken = config.accessToken;
    this.baseUrl = config.baseUrl || 'https://config2.gamesparks.net';
    // apiKey stored via accessToken/JWT; individual tool calls pass apiKey per request
    void config.apiKey;
  }

  static catalog() {
    return {
      name: 'gamesparks-game-details',
      displayName: 'GameSparks Game Details',
      version: '1.0.0',
      category: 'gaming' as const,
      keywords: [
        'gamesparks', 'gaming', 'game', 'aws', 'backend', 'snapshot', 'analytics',
        'experiment', 'push notification', 'script', 'segment', 'query', 'screen',
        'snippet', 'test harness', 'region', 'billing', 'configuration',
      ],
      toolNames: [
        'list_games', 'list_deleted_games', 'restore_deleted_game',
        'get_game_endpoints', 'get_game_regions', 'set_game_region',
        'get_billing_details', 'update_billing_details',
        'get_analytics_data', 'get_analytics_count', 'get_rolling_retention',
        'get_game_summary',
        'list_snapshots', 'create_snapshot', 'get_snapshot', 'delete_snapshot',
        'publish_snapshot', 'unpublish_snapshot', 'revert_snapshot',
        'copy_snapshot_to_game', 'get_live_snapshot_id',
        'get_script_versions', 'export_scripts', 'import_scripts_preview', 'import_scripts_accept', 'get_script_differences',
        'list_experiments', 'create_experiment', 'get_experiment', 'update_experiment', 'delete_experiment', 'do_experiment_action',
        'list_queries', 'create_query', 'get_query', 'update_query', 'delete_query',
        'list_screens', 'create_screen', 'get_screen', 'update_screen', 'delete_screen',
        'list_snippets', 'create_snippet', 'get_snippet', 'update_snippet', 'delete_snippet',
        'get_segment_query_filters', 'get_segment_query_filters_config', 'update_segment_query_filters_config', 'get_segment_standard_filters',
        'list_test_scenarios', 'create_test_scenario', 'get_test_scenario', 'update_test_scenario', 'delete_test_scenario',
        'test_push_amazon', 'test_push_apple_dev', 'test_push_apple_prod', 'test_push_google',
        'reset_credential_secret',
      ],
      description: 'Manage GameSparks (AWS) game configuration: snapshots, scripts, analytics, A/B experiments, queries, screens, snippets, push notification testing, and segment filters via the GameSparks Game Details REST API.',
      author: 'protectnil',
    };
  }

  private get authHeader(): string {
    return this.accessToken;
  }

  private async request(method: string, path: string, body?: unknown): Promise<ToolResult> {
    const url = `${this.baseUrl}${path}`;
    try {
      const resp = await this.fetchWithRetry(url, {
        method,
        headers: {
          'Authorization': this.authHeader,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
      const text = await resp.text();
      let data: unknown;
      try { data = JSON.parse(text); } catch { data = text; }
      if (!resp.ok) {
        return { content: [{ type: 'text', text: `HTTP ${resp.status}: ${text}` }], isError: true };
      }
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
    } catch (err) {
      return { content: [{ type: 'text', text: String(err) }], isError: true };
    }
  }

  private qs(params: Record<string, string | number | boolean | undefined>): string {
    const parts = Object.entries(params)
      .filter(([, v]) => v !== undefined && v !== '')
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
    return parts.length ? '?' + parts.join('&') : '';
  }

  get tools(): ToolDefinition[] {
    return [
      // ── Games ──────────────────────────────────────────────────────────────
      {
        name: 'list_games',
        description: 'List all GameSparks games accessible to the authenticated user',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'list_deleted_games',
        description: 'List all deleted GameSparks games',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'restore_deleted_game',
        description: 'Restore a previously deleted GameSparks game by its API key',
        inputSchema: {
          type: 'object',
          properties: {
            apiKey: { type: 'string', description: 'The API key of the deleted game to restore' },
          },
          required: ['apiKey'],
        },
      },
      {
        name: 'get_game_endpoints',
        description: 'Get the service endpoints for a GameSparks game',
        inputSchema: {
          type: 'object',
          properties: {
            apiKey: { type: 'string', description: 'The game API key' },
          },
          required: ['apiKey'],
        },
      },
      // ── Regions ────────────────────────────────────────────────────────────
      {
        name: 'get_game_regions',
        description: 'Get available region options for a specific game',
        inputSchema: {
          type: 'object',
          properties: {
            gameApiKey: { type: 'string', description: 'The game API key' },
          },
          required: ['gameApiKey'],
        },
      },
      {
        name: 'set_game_region',
        description: 'Set the deployment region for a GameSparks game',
        inputSchema: {
          type: 'object',
          properties: {
            gameApiKey: { type: 'string', description: 'The game API key' },
            regionCode: { type: 'string', description: 'The region code to set (e.g. us-east-1)' },
          },
          required: ['gameApiKey', 'regionCode'],
        },
      },
      // ── Billing ────────────────────────────────────────────────────────────
      {
        name: 'get_billing_details',
        description: 'Retrieve the billing details for a GameSparks game',
        inputSchema: {
          type: 'object',
          properties: {
            apiKey: { type: 'string', description: 'The game API key' },
          },
          required: ['apiKey'],
        },
      },
      {
        name: 'update_billing_details',
        description: 'Update the billing details for a GameSparks game',
        inputSchema: {
          type: 'object',
          properties: {
            apiKey: { type: 'string', description: 'The game API key' },
            billingDetails: { type: 'object', description: 'Billing details object to update' },
          },
          required: ['apiKey', 'billingDetails'],
        },
      },
      // ── Analytics ──────────────────────────────────────────────────────────
      {
        name: 'get_analytics_data',
        description: 'Get analytics data for a game by stage, data type, and date range',
        inputSchema: {
          type: 'object',
          properties: {
            apiKey: { type: 'string', description: 'The game API key' },
            stage: { type: 'string', description: 'The game stage (e.g. live, preview)' },
            dataType: { type: 'string', description: 'The analytics data type' },
            precision: { type: 'string', description: 'Data precision (e.g. day, hour)' },
            startDate: { type: 'string', description: 'Start date in yyyy-MM-dd format' },
            endDate: { type: 'string', description: 'End date in yyyy-MM-dd format' },
            keys: { type: 'string', description: 'Comma-separated keys to select (e.g. ReturningUsers,NewUsers)' },
          },
          required: ['apiKey', 'stage', 'dataType', 'precision', 'startDate', 'endDate'],
        },
      },
      {
        name: 'get_analytics_count',
        description: 'Get the count for an analytics query by name and stage',
        inputSchema: {
          type: 'object',
          properties: {
            apiKey: { type: 'string', description: 'The game API key' },
            stage: { type: 'string', description: 'The game stage' },
            queryName: { type: 'string', description: 'The name of the analytics query' },
          },
          required: ['apiKey', 'stage', 'queryName'],
        },
      },
      {
        name: 'get_rolling_retention',
        description: 'Get the rolling 30-day user retention percentage for a game stage',
        inputSchema: {
          type: 'object',
          properties: {
            apiKey: { type: 'string', description: 'The game API key' },
            stage: { type: 'string', description: 'The game stage (e.g. live, preview)' },
          },
          required: ['apiKey', 'stage'],
        },
      },
      {
        name: 'get_game_summary',
        description: 'Get a game notification summary for a date range and stage',
        inputSchema: {
          type: 'object',
          properties: {
            apiKey: { type: 'string', description: 'The game API key' },
            stage: { type: 'string', description: 'The game stage' },
            startDate: { type: 'string', description: 'Start date in yyyy-MM-dd format' },
            endDate: { type: 'string', description: 'End date in yyyy-MM-dd format' },
          },
          required: ['apiKey', 'stage', 'startDate', 'endDate'],
        },
      },
      // ── Snapshots (admin) ──────────────────────────────────────────────────
      {
        name: 'list_snapshots',
        description: 'List all snapshots for a game (admin API)',
        inputSchema: {
          type: 'object',
          properties: {
            apiKey: { type: 'string', description: 'The game API key' },
            pageSize: { type: 'number', description: 'Number of snapshots per page' },
          },
          required: ['apiKey'],
        },
      },
      {
        name: 'create_snapshot',
        description: 'Create a new snapshot for a game (admin API)',
        inputSchema: {
          type: 'object',
          properties: {
            apiKey: { type: 'string', description: 'The game API key' },
          },
          required: ['apiKey'],
        },
      },
      {
        name: 'get_snapshot',
        description: 'Get a specific snapshot by ID',
        inputSchema: {
          type: 'object',
          properties: {
            apiKey: { type: 'string', description: 'The game API key' },
            snapshotId: { type: 'string', description: 'The snapshot ID' },
          },
          required: ['apiKey', 'snapshotId'],
        },
      },
      {
        name: 'delete_snapshot',
        description: 'Delete a specific snapshot by ID',
        inputSchema: {
          type: 'object',
          properties: {
            apiKey: { type: 'string', description: 'The game API key' },
            snapshotId: { type: 'string', description: 'The snapshot ID to delete' },
          },
          required: ['apiKey', 'snapshotId'],
        },
      },
      {
        name: 'publish_snapshot',
        description: 'Publish a snapshot to make it live',
        inputSchema: {
          type: 'object',
          properties: {
            apiKey: { type: 'string', description: 'The game API key' },
            snapshotId: { type: 'string', description: 'The snapshot ID to publish' },
          },
          required: ['apiKey', 'snapshotId'],
        },
      },
      {
        name: 'unpublish_snapshot',
        description: 'Unpublish a live snapshot',
        inputSchema: {
          type: 'object',
          properties: {
            apiKey: { type: 'string', description: 'The game API key' },
            snapshotId: { type: 'string', description: 'The snapshot ID to unpublish' },
          },
          required: ['apiKey', 'snapshotId'],
        },
      },
      {
        name: 'revert_snapshot',
        description: 'Revert the game to a previous snapshot',
        inputSchema: {
          type: 'object',
          properties: {
            apiKey: { type: 'string', description: 'The game API key' },
            snapshotId: { type: 'string', description: 'The snapshot ID to revert to' },
          },
          required: ['apiKey', 'snapshotId'],
        },
      },
      {
        name: 'copy_snapshot_to_game',
        description: 'Copy a snapshot to another existing game',
        inputSchema: {
          type: 'object',
          properties: {
            apiKey: { type: 'string', description: 'Source game API key' },
            snapshotId: { type: 'string', description: 'The snapshot ID to copy' },
            targetApiKey: { type: 'string', description: 'Target game API key' },
            includeGameConfig: { type: 'boolean', description: 'Include game configuration' },
            includeMetadata: { type: 'boolean', description: 'Include metadata' },
            includeBinaries: { type: 'boolean', description: 'Include binary assets' },
            includeCollaborators: { type: 'boolean', description: 'Include collaborator settings' },
          },
          required: ['apiKey', 'snapshotId', 'targetApiKey'],
        },
      },
      {
        name: 'get_live_snapshot_id',
        description: 'Get the ID of the currently live snapshot for a game',
        inputSchema: {
          type: 'object',
          properties: {
            apiKey: { type: 'string', description: 'The game API key' },
          },
          required: ['apiKey'],
        },
      },
      // ── Scripts ────────────────────────────────────────────────────────────
      {
        name: 'get_script_versions',
        description: 'Get script version history for a game, paginated',
        inputSchema: {
          type: 'object',
          properties: {
            apiKey: { type: 'string', description: 'The game API key' },
            page: { type: 'number', description: 'Page number (optional)' },
            pageSize: { type: 'number', description: 'Results per page' },
          },
          required: ['apiKey'],
        },
      },
      {
        name: 'export_scripts',
        description: 'Export game scripts as a zip file (returns binary content)',
        inputSchema: {
          type: 'object',
          properties: {
            apiKey: { type: 'string', description: 'The game API key' },
          },
          required: ['apiKey'],
        },
      },
      {
        name: 'import_scripts_preview',
        description: 'Preview a script import from a zip file before accepting',
        inputSchema: {
          type: 'object',
          properties: {
            apiKey: { type: 'string', description: 'The game API key' },
          },
          required: ['apiKey'],
        },
      },
      {
        name: 'import_scripts_accept',
        description: 'Accept a previewed script import',
        inputSchema: {
          type: 'object',
          properties: {
            apiKey: { type: 'string', description: 'The game API key' },
            body: { type: 'object', description: 'Import acceptance body' },
          },
          required: ['apiKey'],
        },
      },
      {
        name: 'get_script_differences',
        description: 'Get script differences between two snapshots',
        inputSchema: {
          type: 'object',
          properties: {
            apiKey: { type: 'string', description: 'The game API key' },
            snapshotId1: { type: 'string', description: 'First snapshot ID' },
            snapshotId2: { type: 'string', description: 'Second snapshot ID' },
          },
          required: ['apiKey', 'snapshotId1', 'snapshotId2'],
        },
      },
      // ── Experiments ────────────────────────────────────────────────────────
      {
        name: 'list_experiments',
        description: 'List all A/B experiments for a game',
        inputSchema: {
          type: 'object',
          properties: {
            apiKey: { type: 'string', description: 'The game API key' },
          },
          required: ['apiKey'],
        },
      },
      {
        name: 'create_experiment',
        description: 'Create a new A/B experiment for a game',
        inputSchema: {
          type: 'object',
          properties: {
            apiKey: { type: 'string', description: 'The game API key' },
            experiment: { type: 'object', description: 'Experiment configuration object' },
          },
          required: ['apiKey', 'experiment'],
        },
      },
      {
        name: 'get_experiment',
        description: 'Get an experiment by its ID',
        inputSchema: {
          type: 'object',
          properties: {
            apiKey: { type: 'string', description: 'The game API key' },
            id: { type: 'string', description: 'The experiment ID' },
          },
          required: ['apiKey', 'id'],
        },
      },
      {
        name: 'update_experiment',
        description: 'Update an existing experiment',
        inputSchema: {
          type: 'object',
          properties: {
            apiKey: { type: 'string', description: 'The game API key' },
            id: { type: 'string', description: 'The experiment ID' },
            experiment: { type: 'object', description: 'Updated experiment configuration' },
          },
          required: ['apiKey', 'id', 'experiment'],
        },
      },
      {
        name: 'delete_experiment',
        description: 'Delete an experiment by its ID',
        inputSchema: {
          type: 'object',
          properties: {
            apiKey: { type: 'string', description: 'The game API key' },
            id: { type: 'string', description: 'The experiment ID to delete' },
          },
          required: ['apiKey', 'id'],
        },
      },
      {
        name: 'do_experiment_action',
        description: 'Perform a lifecycle action on an experiment (e.g. start, stop, archive)',
        inputSchema: {
          type: 'object',
          properties: {
            apiKey: { type: 'string', description: 'The game API key' },
            id: { type: 'string', description: 'The experiment ID' },
            action: { type: 'string', description: 'Action to perform (e.g. start, stop, archive)' },
          },
          required: ['apiKey', 'id', 'action'],
        },
      },
      // ── Queries ────────────────────────────────────────────────────────────
      {
        name: 'list_queries',
        description: 'List all saved queries for a game',
        inputSchema: {
          type: 'object',
          properties: {
            apiKey: { type: 'string', description: 'The game API key' },
          },
          required: ['apiKey'],
        },
      },
      {
        name: 'create_query',
        description: 'Create a new saved query for a game',
        inputSchema: {
          type: 'object',
          properties: {
            apiKey: { type: 'string', description: 'The game API key' },
            query: { type: 'object', description: 'Query definition object' },
          },
          required: ['apiKey', 'query'],
        },
      },
      {
        name: 'get_query',
        description: 'Get a saved query by its short code',
        inputSchema: {
          type: 'object',
          properties: {
            apiKey: { type: 'string', description: 'The game API key' },
            shortCode: { type: 'string', description: 'The query short code' },
          },
          required: ['apiKey', 'shortCode'],
        },
      },
      {
        name: 'update_query',
        description: 'Update an existing saved query',
        inputSchema: {
          type: 'object',
          properties: {
            apiKey: { type: 'string', description: 'The game API key' },
            shortCode: { type: 'string', description: 'The query short code' },
            query: { type: 'object', description: 'Updated query definition' },
          },
          required: ['apiKey', 'shortCode', 'query'],
        },
      },
      {
        name: 'delete_query',
        description: 'Delete a saved query by its short code',
        inputSchema: {
          type: 'object',
          properties: {
            apiKey: { type: 'string', description: 'The game API key' },
            shortCode: { type: 'string', description: 'The query short code to delete' },
          },
          required: ['apiKey', 'shortCode'],
        },
      },
      // ── Screens ────────────────────────────────────────────────────────────
      {
        name: 'list_screens',
        description: 'List all screens configured for a game',
        inputSchema: {
          type: 'object',
          properties: {
            apiKey: { type: 'string', description: 'The game API key' },
          },
          required: ['apiKey'],
        },
      },
      {
        name: 'create_screen',
        description: 'Create a new screen configuration for a game',
        inputSchema: {
          type: 'object',
          properties: {
            apiKey: { type: 'string', description: 'The game API key' },
            screen: { type: 'object', description: 'Screen definition object' },
          },
          required: ['apiKey', 'screen'],
        },
      },
      {
        name: 'get_screen',
        description: 'Get a screen by its short code',
        inputSchema: {
          type: 'object',
          properties: {
            apiKey: { type: 'string', description: 'The game API key' },
            shortCode: { type: 'string', description: 'The screen short code' },
          },
          required: ['apiKey', 'shortCode'],
        },
      },
      {
        name: 'update_screen',
        description: 'Update an existing screen configuration',
        inputSchema: {
          type: 'object',
          properties: {
            apiKey: { type: 'string', description: 'The game API key' },
            shortCode: { type: 'string', description: 'The screen short code' },
            screen: { type: 'object', description: 'Updated screen definition' },
          },
          required: ['apiKey', 'shortCode', 'screen'],
        },
      },
      {
        name: 'delete_screen',
        description: 'Delete a screen by its short code',
        inputSchema: {
          type: 'object',
          properties: {
            apiKey: { type: 'string', description: 'The game API key' },
            shortCode: { type: 'string', description: 'The screen short code to delete' },
          },
          required: ['apiKey', 'shortCode'],
        },
      },
      // ── Snippets ───────────────────────────────────────────────────────────
      {
        name: 'list_snippets',
        description: 'List all script snippets for a game',
        inputSchema: {
          type: 'object',
          properties: {
            apiKey: { type: 'string', description: 'The game API key' },
          },
          required: ['apiKey'],
        },
      },
      {
        name: 'create_snippet',
        description: 'Create a new script snippet for a game',
        inputSchema: {
          type: 'object',
          properties: {
            apiKey: { type: 'string', description: 'The game API key' },
            snippet: { type: 'object', description: 'Snippet definition object' },
          },
          required: ['apiKey', 'snippet'],
        },
      },
      {
        name: 'get_snippet',
        description: 'Get a script snippet by its short code',
        inputSchema: {
          type: 'object',
          properties: {
            apiKey: { type: 'string', description: 'The game API key' },
            shortCode: { type: 'string', description: 'The snippet short code' },
          },
          required: ['apiKey', 'shortCode'],
        },
      },
      {
        name: 'update_snippet',
        description: 'Update an existing script snippet',
        inputSchema: {
          type: 'object',
          properties: {
            apiKey: { type: 'string', description: 'The game API key' },
            shortCode: { type: 'string', description: 'The snippet short code' },
            snippet: { type: 'object', description: 'Updated snippet definition' },
          },
          required: ['apiKey', 'shortCode', 'snippet'],
        },
      },
      {
        name: 'delete_snippet',
        description: 'Delete a script snippet by its short code',
        inputSchema: {
          type: 'object',
          properties: {
            apiKey: { type: 'string', description: 'The game API key' },
            shortCode: { type: 'string', description: 'The snippet short code to delete' },
          },
          required: ['apiKey', 'shortCode'],
        },
      },
      // ── Segment Query Filters ──────────────────────────────────────────────
      {
        name: 'get_segment_query_filters',
        description: 'Get segment query filters for a game',
        inputSchema: {
          type: 'object',
          properties: {
            apiKey: { type: 'string', description: 'The game API key' },
          },
          required: ['apiKey'],
        },
      },
      {
        name: 'get_segment_query_filters_config',
        description: 'Get the segment query filter configuration',
        inputSchema: {
          type: 'object',
          properties: {
            apiKey: { type: 'string', description: 'The game API key' },
          },
          required: ['apiKey'],
        },
      },
      {
        name: 'update_segment_query_filters_config',
        description: 'Update the segment query filter configuration',
        inputSchema: {
          type: 'object',
          properties: {
            apiKey: { type: 'string', description: 'The game API key' },
            config: { type: 'object', description: 'Segment filter configuration object' },
          },
          required: ['apiKey', 'config'],
        },
      },
      {
        name: 'get_segment_standard_filters',
        description: 'Get the standard segment query filters for a game',
        inputSchema: {
          type: 'object',
          properties: {
            apiKey: { type: 'string', description: 'The game API key' },
          },
          required: ['apiKey'],
        },
      },
      // ── Test Harness ───────────────────────────────────────────────────────
      {
        name: 'list_test_scenarios',
        description: 'List all test harness scenarios for a game',
        inputSchema: {
          type: 'object',
          properties: {
            apiKey: { type: 'string', description: 'The game API key' },
          },
          required: ['apiKey'],
        },
      },
      {
        name: 'create_test_scenario',
        description: 'Create a new test harness scenario',
        inputSchema: {
          type: 'object',
          properties: {
            apiKey: { type: 'string', description: 'The game API key' },
            scenario: { type: 'object', description: 'Test scenario definition object' },
          },
          required: ['apiKey', 'scenario'],
        },
      },
      {
        name: 'get_test_scenario',
        description: 'Get a specific test harness scenario by name',
        inputSchema: {
          type: 'object',
          properties: {
            apiKey: { type: 'string', description: 'The game API key' },
            scenarioName: { type: 'string', description: 'The scenario name' },
          },
          required: ['apiKey', 'scenarioName'],
        },
      },
      {
        name: 'update_test_scenario',
        description: 'Update an existing test harness scenario',
        inputSchema: {
          type: 'object',
          properties: {
            apiKey: { type: 'string', description: 'The game API key' },
            scenarioName: { type: 'string', description: 'The scenario name' },
            scenario: { type: 'object', description: 'Updated scenario definition' },
          },
          required: ['apiKey', 'scenarioName', 'scenario'],
        },
      },
      {
        name: 'delete_test_scenario',
        description: 'Delete a test harness scenario by name',
        inputSchema: {
          type: 'object',
          properties: {
            apiKey: { type: 'string', description: 'The game API key' },
            scenarioName: { type: 'string', description: 'The scenario name to delete' },
          },
          required: ['apiKey', 'scenarioName'],
        },
      },
      // ── Push Notifications ─────────────────────────────────────────────────
      {
        name: 'test_push_amazon',
        description: 'Send a test push notification via Amazon (ADM)',
        inputSchema: {
          type: 'object',
          properties: {
            apiKey: { type: 'string', description: 'The game API key' },
            payload: { type: 'object', description: 'Push notification test payload' },
          },
          required: ['apiKey'],
        },
      },
      {
        name: 'test_push_apple_dev',
        description: 'Send a test push notification via Apple APNs (development)',
        inputSchema: {
          type: 'object',
          properties: {
            apiKey: { type: 'string', description: 'The game API key' },
            payload: { type: 'object', description: 'Push notification test payload' },
          },
          required: ['apiKey'],
        },
      },
      {
        name: 'test_push_apple_prod',
        description: 'Send a test push notification via Apple APNs (production)',
        inputSchema: {
          type: 'object',
          properties: {
            apiKey: { type: 'string', description: 'The game API key' },
            payload: { type: 'object', description: 'Push notification test payload' },
          },
          required: ['apiKey'],
        },
      },
      {
        name: 'test_push_google',
        description: 'Send a test push notification via Google FCM',
        inputSchema: {
          type: 'object',
          properties: {
            apiKey: { type: 'string', description: 'The game API key' },
            payload: { type: 'object', description: 'Push notification test payload' },
          },
          required: ['apiKey'],
        },
      },
      // ── Credentials ────────────────────────────────────────────────────────
      {
        name: 'reset_credential_secret',
        description: 'Reset the secret for a named game credential',
        inputSchema: {
          type: 'object',
          properties: {
            apiKey: { type: 'string', description: 'The game API key' },
            credentialName: { type: 'string', description: 'The credential name to reset' },
          },
          required: ['apiKey', 'credentialName'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    const a = args as Record<string, string & boolean & number & Record<string, unknown>>;
    switch (name) {
      case 'list_games':
        return this.request('GET', '/restv2/games');
      case 'list_deleted_games':
        return this.request('GET', '/restv2/games/deleted');
      case 'restore_deleted_game':
        return this.request('POST', `/restv2/game/${a.apiKey}/restore`);
      case 'get_game_endpoints':
        return this.request('GET', `/restv2/game/${a.apiKey}/endpoints`);
      case 'get_game_regions':
        return this.request('GET', `/restv2/game/${a.gameApiKey}/regions`);
      case 'set_game_region':
        return this.request('POST', `/restv2/game/${a.gameApiKey}/region/${a.regionCode}`);
      case 'get_billing_details':
        return this.request('GET', `/restv2/game/${a.apiKey}/admin/billingDetails`);
      case 'update_billing_details':
        return this.request('PUT', `/restv2/game/${a.apiKey}/admin/billingDetails`, a.billingDetails);
      case 'get_analytics_data': {
        const qs = this.qs({ stage: a.stage, dataType: a.dataType, precision: a.precision, startDate: a.startDate, endDate: a.endDate, keys: a.keys });
        return this.request('GET', `/restv2/game/${a.apiKey}/admin/analytics${qs}`);
      }
      case 'get_analytics_count': {
        const qs = this.qs({ stage: a.stage, queryName: a.queryName });
        return this.request('GET', `/restv2/game/${a.apiKey}/admin/analytics/count${qs}`);
      }
      case 'get_rolling_retention': {
        const qs = this.qs({ stage: a.stage });
        return this.request('GET', `/restv2/game/${a.apiKey}/admin/analytics/rollingRetention${qs}`);
      }
      case 'get_game_summary': {
        const qs = this.qs({ stage: a.stage, startDate: a.startDate, endDate: a.endDate });
        return this.request('GET', `/restv2/game/${a.apiKey}/admin/notifications/summary${qs}`);
      }
      case 'list_snapshots': {
        const qs = this.qs({ pageSize: a.pageSize });
        return this.request('GET', `/restv2/game/${a.apiKey}/admin/snapshots${qs}`);
      }
      case 'create_snapshot':
        return this.request('POST', `/restv2/game/${a.apiKey}/admin/snapshots`);
      case 'get_snapshot':
        return this.request('GET', `/restv2/game/${a.apiKey}/admin/snapshots/${a.snapshotId}`);
      case 'delete_snapshot':
        return this.request('DELETE', `/restv2/game/${a.apiKey}/admin/snapshots/${a.snapshotId}`);
      case 'publish_snapshot':
        return this.request('POST', `/restv2/game/${a.apiKey}/admin/snapshots/${a.snapshotId}/publish`);
      case 'unpublish_snapshot':
        return this.request('POST', `/restv2/game/${a.apiKey}/admin/snapshots/${a.snapshotId}/unpublish`);
      case 'revert_snapshot':
        return this.request('POST', `/restv2/game/${a.apiKey}/admin/snapshots/${a.snapshotId}/revert`);
      case 'copy_snapshot_to_game': {
        const qs = this.qs({ includeGameConfig: a.includeGameConfig, includeMetadata: a.includeMetadata, includeBinaries: a.includeBinaries, includeCollaborators: a.includeCollaborators });
        return this.request('POST', `/restv2/game/${a.apiKey}/admin/snapshots/${a.snapshotId}/copy/to/${a.targetApiKey}${qs}`);
      }
      case 'get_live_snapshot_id':
        return this.request('GET', `/restv2/game/${a.apiKey}/admin/snapshots/liveSnapshotId`);
      case 'get_script_versions': {
        const qs = this.qs({ pageSize: a.pageSize });
        if (a.page) return this.request('GET', `/restv2/game/${a.apiKey}/admin/scripts/versions/${a.page}${qs}`);
        return this.request('GET', `/restv2/game/${a.apiKey}/admin/scripts/versions${qs}`);
      }
      case 'export_scripts':
        return this.request('GET', `/restv2/game/${a.apiKey}/admin/scripts/export`);
      case 'import_scripts_preview':
        return this.request('POST', `/restv2/game/${a.apiKey}/admin/scripts/import/preview`);
      case 'import_scripts_accept':
        return this.request('POST', `/restv2/game/${a.apiKey}/admin/scripts/import/accept`, a.body);
      case 'get_script_differences':
        return this.request('GET', `/restv2/game/${a.apiKey}/admin/scripts/differences/${a.snapshotId1}/${a.snapshotId2}`);
      case 'list_experiments':
        return this.request('GET', `/restv2/game/${a.apiKey}/manage/experiments`);
      case 'create_experiment':
        return this.request('POST', `/restv2/game/${a.apiKey}/manage/experiments`, a.experiment);
      case 'get_experiment':
        return this.request('GET', `/restv2/game/${a.apiKey}/manage/experiments/${a.id}`);
      case 'update_experiment':
        return this.request('PUT', `/restv2/game/${a.apiKey}/manage/experiments/${a.id}`, a.experiment);
      case 'delete_experiment':
        return this.request('DELETE', `/restv2/game/${a.apiKey}/manage/experiments/${a.id}`);
      case 'do_experiment_action':
        return this.request('POST', `/restv2/game/${a.apiKey}/manage/experiments/${a.id}/${a.action}`);
      case 'list_queries':
        return this.request('GET', `/restv2/game/${a.apiKey}/manage/queries`);
      case 'create_query':
        return this.request('POST', `/restv2/game/${a.apiKey}/manage/queries`, a.query);
      case 'get_query':
        return this.request('GET', `/restv2/game/${a.apiKey}/manage/queries/${a.shortCode}`);
      case 'update_query':
        return this.request('PUT', `/restv2/game/${a.apiKey}/manage/queries/${a.shortCode}`, a.query);
      case 'delete_query':
        return this.request('DELETE', `/restv2/game/${a.apiKey}/manage/queries/${a.shortCode}`);
      case 'list_screens':
        return this.request('GET', `/restv2/game/${a.apiKey}/manage/screens`);
      case 'create_screen':
        return this.request('POST', `/restv2/game/${a.apiKey}/manage/screens`, a.screen);
      case 'get_screen':
        return this.request('GET', `/restv2/game/${a.apiKey}/manage/screens/${a.shortCode}`);
      case 'update_screen':
        return this.request('PUT', `/restv2/game/${a.apiKey}/manage/screens/${a.shortCode}`, a.screen);
      case 'delete_screen':
        return this.request('DELETE', `/restv2/game/${a.apiKey}/manage/screens/${a.shortCode}`);
      case 'list_snippets':
        return this.request('GET', `/restv2/game/${a.apiKey}/manage/snippets`);
      case 'create_snippet':
        return this.request('POST', `/restv2/game/${a.apiKey}/manage/snippets`, a.snippet);
      case 'get_snippet':
        return this.request('GET', `/restv2/game/${a.apiKey}/manage/snippets/${a.shortCode}`);
      case 'update_snippet':
        return this.request('PUT', `/restv2/game/${a.apiKey}/manage/snippets/${a.shortCode}`, a.snippet);
      case 'delete_snippet':
        return this.request('DELETE', `/restv2/game/${a.apiKey}/manage/snippets/${a.shortCode}`);
      case 'get_segment_query_filters':
        return this.request('GET', `/restv2/game/${a.apiKey}/admin/segmentQueryFilters`);
      case 'get_segment_query_filters_config':
        return this.request('GET', `/restv2/game/${a.apiKey}/admin/segmentQueryFilters/config`);
      case 'update_segment_query_filters_config':
        return this.request('PUT', `/restv2/game/${a.apiKey}/admin/segmentQueryFilters/config`, a.config);
      case 'get_segment_standard_filters':
        return this.request('GET', `/restv2/game/${a.apiKey}/admin/segmentQueryFilters/standardFilters`);
      case 'list_test_scenarios':
        return this.request('GET', `/restv2/game/${a.apiKey}/admin/testHarness/scenarios`);
      case 'create_test_scenario':
        return this.request('POST', `/restv2/game/${a.apiKey}/admin/testHarness/scenarios`, a.scenario);
      case 'get_test_scenario':
        return this.request('GET', `/restv2/game/${a.apiKey}/admin/testHarness/scenarios/${a.scenarioName}`);
      case 'update_test_scenario':
        return this.request('PUT', `/restv2/game/${a.apiKey}/admin/testHarness/scenarios/${a.scenarioName}`, a.scenario);
      case 'delete_test_scenario':
        return this.request('DELETE', `/restv2/game/${a.apiKey}/admin/testHarness/scenarios/${a.scenarioName}`);
      case 'test_push_amazon':
        return this.request('POST', `/restv2/game/${a.apiKey}/admin/pushNotifications/test/amazon`, a.payload);
      case 'test_push_apple_dev':
        return this.request('POST', `/restv2/game/${a.apiKey}/admin/pushNotifications/test/apple/development`, a.payload);
      case 'test_push_apple_prod':
        return this.request('POST', `/restv2/game/${a.apiKey}/admin/pushNotifications/test/apple/production`, a.payload);
      case 'test_push_google':
        return this.request('POST', `/restv2/game/${a.apiKey}/admin/pushNotifications/test/google`, a.payload);
      case 'reset_credential_secret':
        return this.request('POST', `/restv2/game/${a.apiKey}/config/~credentials/${a.credentialName}/resetSecret`);
      default:
        return { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true };
    }
  }
}

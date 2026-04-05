/**
 * Checkly MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28.
// No official Checkly MCP server was found on GitHub or the Checkly documentation site.
// A community-maintained server (github.com/mayankeq/checkly-mcp, 5 tools) exists but is
// not official and covers only a subset (list_checks, get_check, update_check, run_check,
// get_check_results). It does not qualify under the MCP criteria (not vendor-published).
// This adapter provides REST API coverage for monitoring-as-code workflows.
//
// Base URL: https://api.checklyhq.com/v1
// Auth: Bearer token (API key from app.checklyhq.com → Account Settings → API Keys)
//       + x-checkly-account header (Account ID from Account Settings → General)
// Docs: https://www.checklyhq.com/docs/api-reference/overview/
// Rate limits: 600 requests per 60 seconds for most routes; some routes have custom limits.
//   check-results endpoint: 5 requests / 10 seconds (custom limit).
//   Note: GET /v1/check-results/{checkId} is deprecated; replacement is GET /v2/check-results/{checkId}.
//   This adapter retains the v1 path until v2 is fully stable per vendor guidance.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface ChecklyConfig {
  /**
   * Checkly API key. Passed as: Authorization: Bearer {apiKey}.
   * Generate at app.checklyhq.com → Account Settings → API Keys.
   */
  apiKey: string;
  /**
   * Checkly Account ID. Required as the x-checkly-account header on every request.
   * Found at app.checklyhq.com → Account Settings → General.
   */
  accountId: string;
  /** Override the base URL (default: https://api.checklyhq.com/v1). */
  baseUrl?: string;
}

export class ChecklyMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly accountId: string;
  private readonly baseUrl: string;

  constructor(config: ChecklyConfig) {
    super();
    this.apiKey = config.apiKey;
    this.accountId = config.accountId;
    this.baseUrl = config.baseUrl || 'https://api.checklyhq.com/v1';
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_checks',
        description: 'List all API and browser checks in the Checkly account with optional pagination',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of checks to return (max 100, default: 100)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
          },
        },
      },
      {
        name: 'get_check',
        description: 'Retrieve the full configuration and details for a specific check by its UUID',
        inputSchema: {
          type: 'object',
          properties: {
            check_id: {
              type: 'string',
              description: 'UUID of the check to retrieve',
            },
          },
          required: ['check_id'],
        },
      },
      {
        name: 'create_api_check',
        description: 'Create a new API check to monitor an HTTP endpoint for availability and correctness',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Display name for the check',
            },
            url: {
              type: 'string',
              description: 'URL to monitor (e.g. https://api.example.com/health)',
            },
            frequency: {
              type: 'number',
              description: 'Check run frequency in minutes (default: 10)',
            },
            method: {
              type: 'string',
              description: 'HTTP method: GET | POST | PUT | PATCH | DELETE | HEAD (default: GET)',
            },
            activated: {
              type: 'boolean',
              description: 'Whether the check is active immediately (default: true)',
            },
            locations: {
              type: 'array',
              items: { type: 'string' },
              description: 'List of location slugs to run from (e.g. ["us-east-1", "eu-west-1"])',
            },
            tags: {
              type: 'array',
              items: { type: 'string' },
              description: 'Tags to attach to the check for grouping and filtering',
            },
          },
          required: ['name', 'url'],
        },
      },
      {
        name: 'update_check',
        description: 'Update an existing check — change name, frequency, URL, locations, or activation status',
        inputSchema: {
          type: 'object',
          properties: {
            check_id: {
              type: 'string',
              description: 'UUID of the check to update',
            },
            name: {
              type: 'string',
              description: 'New display name for the check',
            },
            activated: {
              type: 'boolean',
              description: 'Activate or deactivate the check',
            },
            frequency: {
              type: 'number',
              description: 'New check frequency in minutes',
            },
            locations: {
              type: 'array',
              items: { type: 'string' },
              description: 'New list of location slugs',
            },
          },
          required: ['check_id'],
        },
      },
      {
        name: 'delete_check',
        description: 'Permanently delete a check from the Checkly account by its UUID',
        inputSchema: {
          type: 'object',
          properties: {
            check_id: {
              type: 'string',
              description: 'UUID of the check to delete',
            },
          },
          required: ['check_id'],
        },
      },
      {
        name: 'list_check_results',
        description: 'List recent execution results for a check, with optional filter for failures only',
        inputSchema: {
          type: 'object',
          properties: {
            check_id: {
              type: 'string',
              description: 'UUID of the check to retrieve results for',
            },
            limit: {
              type: 'number',
              description: 'Number of results to return (max 100, default: 10)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            has_failures: {
              type: 'boolean',
              description: 'Filter to only return failed results when true',
            },
          },
          required: ['check_id'],
        },
      },
      {
        name: 'get_check_result',
        description: 'Retrieve a single check result by check UUID and result ID',
        inputSchema: {
          type: 'object',
          properties: {
            check_id: {
              type: 'string',
              description: 'UUID of the check',
            },
            result_id: {
              type: 'string',
              description: 'UUID of the specific result to retrieve',
            },
          },
          required: ['check_id', 'result_id'],
        },
      },
      {
        name: 'list_check_statuses',
        description: 'List the current pass/fail status for all checks in the account',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'list_check_groups',
        description: 'List all check groups in the account with optional pagination',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of groups to return (max 100, default: 100)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
          },
        },
      },
      {
        name: 'get_check_group',
        description: 'Retrieve the full configuration of a specific check group by its ID',
        inputSchema: {
          type: 'object',
          properties: {
            group_id: {
              type: 'number',
              description: 'Numeric ID of the check group to retrieve',
            },
          },
          required: ['group_id'],
        },
      },
      {
        name: 'create_check_group',
        description: 'Create a new check group to organize checks with shared settings, locations, and alert channels',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Display name for the check group',
            },
            activated: {
              type: 'boolean',
              description: 'Whether the group is active (default: true)',
            },
            locations: {
              type: 'array',
              items: { type: 'string' },
              description: 'List of location slugs for all checks in this group',
            },
            tags: {
              type: 'array',
              items: { type: 'string' },
              description: 'Tags to attach to the group',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'delete_check_group',
        description: 'Permanently delete a check group by its numeric ID',
        inputSchema: {
          type: 'object',
          properties: {
            group_id: {
              type: 'number',
              description: 'Numeric ID of the check group to delete',
            },
          },
          required: ['group_id'],
        },
      },
      {
        name: 'list_alert_channels',
        description: 'List all alert channels configured in the account (Slack, PagerDuty, email, webhook, etc.)',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of alert channels to return (max 100, default: 100)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
          },
        },
      },
      {
        name: 'get_alert_channel',
        description: 'Retrieve configuration details for a specific alert channel by its ID',
        inputSchema: {
          type: 'object',
          properties: {
            channel_id: {
              type: 'number',
              description: 'Numeric ID of the alert channel to retrieve',
            },
          },
          required: ['channel_id'],
        },
      },
      {
        name: 'list_snippets',
        description: 'List all JavaScript code snippets available for reuse in browser checks and setup/teardown scripts',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of snippets to return (max 100, default: 100)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
          },
        },
      },
      {
        name: 'list_environment_variables',
        description: 'List all global environment variables defined in the account for use in checks',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of environment variables to return (max 100, default: 100)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
          },
        },
      },
      {
        name: 'list_maintenance_windows',
        description: 'List all maintenance windows that suppress alerting during scheduled downtime',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of maintenance windows to return (max 100, default: 100)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
          },
        },
      },
      {
        name: 'list_locations',
        description: 'List all available Checkly monitoring locations (data centers) where checks can be run',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_checks':
          return await this.listChecks(args);
        case 'get_check':
          return await this.getCheck(args);
        case 'create_api_check':
          return await this.createApiCheck(args);
        case 'update_check':
          return await this.updateCheck(args);
        case 'delete_check':
          return await this.deleteCheck(args);
        case 'list_check_results':
          return await this.listCheckResults(args);
        case 'get_check_result':
          return await this.getCheckResult(args);
        case 'list_check_statuses':
          return await this.listCheckStatuses();
        case 'list_check_groups':
          return await this.listCheckGroups(args);
        case 'get_check_group':
          return await this.getCheckGroup(args);
        case 'create_check_group':
          return await this.createCheckGroup(args);
        case 'delete_check_group':
          return await this.deleteCheckGroup(args);
        case 'list_alert_channels':
          return await this.listAlertChannels(args);
        case 'get_alert_channel':
          return await this.getAlertChannel(args);
        case 'list_snippets':
          return await this.listSnippets(args);
        case 'list_environment_variables':
          return await this.listEnvironmentVariables(args);
        case 'list_maintenance_windows':
          return await this.listMaintenanceWindows(args);
        case 'list_locations':
          return await this.listLocations();
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

  private get reqHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      'x-checkly-account': this.accountId,
      'Content-Type': 'application/json',
    };
  }

  private async checklyGet(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, { method: 'GET', headers: this.reqHeaders });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Checkly API error (HTTP ${response.status}): ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Checkly returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async checklyPost(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.reqHeaders,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Checkly API error (HTTP ${response.status}): ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Checkly returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async checklyPatch(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'PATCH',
      headers: this.reqHeaders,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Checkly API error (HTTP ${response.status}): ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Checkly returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async checklyDelete(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, { method: 'DELETE', headers: this.reqHeaders });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Checkly API error (HTTP ${response.status}): ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: 'Deleted successfully' }], isError: false };
  }

  private async listChecks(args: Record<string, unknown>): Promise<ToolResult> {
    const limit = (args.limit as number) || 100;
    const page = (args.page as number) || 1;
    return this.checklyGet(`/checks?limit=${limit}&page=${page}`);
  }

  private async getCheck(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.check_id as string;
    if (!id) return { content: [{ type: 'text', text: 'check_id is required' }], isError: true };
    return this.checklyGet(`/checks/${encodeURIComponent(id)}`);
  }

  private async createApiCheck(args: Record<string, unknown>): Promise<ToolResult> {
    const name = args.name as string;
    const url = args.url as string;
    if (!name || !url) return { content: [{ type: 'text', text: 'name and url are required' }], isError: true };
    const body: Record<string, unknown> = {
      name,
      activated: typeof args.activated === 'boolean' ? args.activated : true,
      frequency: (args.frequency as number) || 10,
      type: 'API',
      request: { method: (args.method as string) || 'GET', url },
    };
    if (args.locations) body.locations = args.locations;
    if (args.tags) body.tags = args.tags;
    return this.checklyPost('/checks/api', body);
  }

  private async updateCheck(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.check_id as string;
    if (!id) return { content: [{ type: 'text', text: 'check_id is required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.name) body.name = args.name;
    if (typeof args.activated === 'boolean') body.activated = args.activated;
    if (args.frequency) body.frequency = args.frequency;
    if (args.locations) body.locations = args.locations;
    return this.checklyPatch(`/checks/${encodeURIComponent(id)}`, body);
  }

  private async deleteCheck(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.check_id as string;
    if (!id) return { content: [{ type: 'text', text: 'check_id is required' }], isError: true };
    return this.checklyDelete(`/checks/${encodeURIComponent(id)}`);
  }

  private async listCheckResults(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.check_id as string;
    if (!id) return { content: [{ type: 'text', text: 'check_id is required' }], isError: true };
    const limit = (args.limit as number) || 10;
    const page = (args.page as number) || 1;
    let path = `/check-results/${encodeURIComponent(id)}?limit=${limit}&page=${page}`;
    if (typeof args.has_failures === 'boolean') path += `&hasFailures=${encodeURIComponent(String(args.has_failures))}`;
    return this.checklyGet(path);
  }

  private async getCheckResult(args: Record<string, unknown>): Promise<ToolResult> {
    const checkId = args.check_id as string;
    const resultId = args.result_id as string;
    if (!checkId || !resultId) return { content: [{ type: 'text', text: 'check_id and result_id are required' }], isError: true };
    return this.checklyGet(`/check-results/${encodeURIComponent(checkId)}/${encodeURIComponent(resultId)}`);
  }

  private async listCheckStatuses(): Promise<ToolResult> {
    return this.checklyGet('/check-statuses');
  }

  private async listCheckGroups(args: Record<string, unknown>): Promise<ToolResult> {
    const limit = (args.limit as number) || 100;
    const page = (args.page as number) || 1;
    return this.checklyGet(`/check-groups?limit=${limit}&page=${page}`);
  }

  private async getCheckGroup(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.group_id as number;
    if (!id) return { content: [{ type: 'text', text: 'group_id is required' }], isError: true };
    return this.checklyGet(`/check-groups/${id}`);
  }

  private async createCheckGroup(args: Record<string, unknown>): Promise<ToolResult> {
    const name = args.name as string;
    if (!name) return { content: [{ type: 'text', text: 'name is required' }], isError: true };
    const body: Record<string, unknown> = {
      name,
      activated: typeof args.activated === 'boolean' ? args.activated : true,
    };
    if (args.locations) body.locations = args.locations;
    if (args.tags) body.tags = args.tags;
    return this.checklyPost('/check-groups', body);
  }

  private async deleteCheckGroup(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.group_id as number;
    if (!id) return { content: [{ type: 'text', text: 'group_id is required' }], isError: true };
    return this.checklyDelete(`/check-groups/${id}`);
  }

  private async listAlertChannels(args: Record<string, unknown>): Promise<ToolResult> {
    const limit = (args.limit as number) || 100;
    const page = (args.page as number) || 1;
    return this.checklyGet(`/alert-channels?limit=${limit}&page=${page}`);
  }

  private async getAlertChannel(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.channel_id as number;
    if (!id) return { content: [{ type: 'text', text: 'channel_id is required' }], isError: true };
    return this.checklyGet(`/alert-channels/${id}`);
  }

  private async listSnippets(args: Record<string, unknown>): Promise<ToolResult> {
    const limit = (args.limit as number) || 100;
    const page = (args.page as number) || 1;
    return this.checklyGet(`/snippets?limit=${limit}&page=${page}`);
  }

  private async listEnvironmentVariables(args: Record<string, unknown>): Promise<ToolResult> {
    const limit = (args.limit as number) || 100;
    const page = (args.page as number) || 1;
    return this.checklyGet(`/variables?limit=${limit}&page=${page}`);
  }

  private async listMaintenanceWindows(args: Record<string, unknown>): Promise<ToolResult> {
    const limit = (args.limit as number) || 100;
    const page = (args.page as number) || 1;
    return this.checklyGet(`/maintenance-windows?limit=${limit}&page=${page}`);
  }

  private async listLocations(): Promise<ToolResult> {
    return this.checklyGet('/locations');
  }

  static catalog() {
    return {
      name: 'checkly',
      displayName: 'Checkly',
      version: '1.0.0',
      category: 'observability' as const,
      keywords: ['checkly'],
      toolNames: ['list_checks', 'get_check', 'create_api_check', 'update_check', 'delete_check', 'list_check_results', 'get_check_result', 'list_check_statuses', 'list_check_groups', 'get_check_group', 'create_check_group', 'delete_check_group', 'list_alert_channels', 'get_alert_channel', 'list_snippets', 'list_environment_variables', 'list_maintenance_windows', 'list_locations'],
      description: 'Checkly adapter for the Epic AI Intelligence Platform',
      author: 'protectnil' as const,
    };
  }
}

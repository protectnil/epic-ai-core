/**
 * Zapier MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/zapier/zapier-mcp — transport: streamable-HTTP (https://mcp.zapier.com), auth: API key
// The Zapier MCP server exposes 8,000+ app actions as dynamic tools via mcp.zapier.com. Actively maintained (2025-2026).
// Our adapter covers: 14 tools — 4 NLA AI Actions tools (verified) + 10 Zap management tools (UNVERIFIED — see below).
// Recommendation: use-both — MCP covers all 8,000+ app integrations dynamically. Our adapter covers
//   Zap/AI-Action management operations not available in the MCP. See overlap analysis in audit record.
//
// ⚠️  AUTH NOTE: Two separate APIs with DIFFERENT auth schemes:
//   NLA AI Actions API (nla.zapier.com/api/v1): x-api-key header (API key from nla.zapier.com)
//   Zap Management API (api.zapier.com/v1): Authorization: Bearer <oauth_token> (OAuth2 — requires zapier OAuth)
//   This adapter currently uses x-api-key for BOTH, which is WRONG for the Zap management tools.
//   Fix: ZapierConfig must accept separate apiKey (NLA) and zapOAuthToken (Zap management).
//
// ⚠️  ZAP MANAGEMENT TOOLS: Only GET /v1/zaps is documented in Zapier's Partner API.
//   enable_zap, disable_zap, list_zap_runs, get_zap_run, replay_zap_run, list_folders,
//   get_app_info, list_apps — these endpoints are NOT verified from official Zapier docs.
//   Marked UNVERIFIED pending Zapier confirming these endpoints exist.
//
// Base URL: https://nla.zapier.com/api/v1 (AI Actions / NLA), https://api.zapier.com/v1 (Zap management)
// Auth: x-api-key (NLA API) | Authorization: Bearer <token> (Zap management Partner API — OAuth2 required)
// Docs: https://docs.zapier.com/mcp/home | https://nla.zapier.com/docs/using-the-api | https://docs.zapier.com/powered-by-zapier/api-reference
// Rate limits: Not publicly documented; governed by Zapier plan limits

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface ZapierConfig {
  /** API key for the NLA AI Actions API (from nla.zapier.com). Uses x-api-key header. */
  apiKey: string;
  /**
   * OAuth2 Bearer token for the Zap management Partner API (api.zapier.com/v1).
   * Requires OAuth2 with 'zap' scope via Zapier's Partner OAuth flow.
   * If not provided, Zap management tools will return an auth error.
   */
  zapOAuthToken?: string;
  nlaBaseUrl?: string;
  zapBaseUrl?: string;
}

export class ZapierMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly zapOAuthToken: string | undefined;
  private readonly nlaBaseUrl: string;
  private readonly zapBaseUrl: string;

  constructor(config: ZapierConfig) {
    super();
    this.apiKey = config.apiKey;
    this.zapOAuthToken = config.zapOAuthToken;
    this.nlaBaseUrl = config.nlaBaseUrl || 'https://nla.zapier.com/api/v1';
    this.zapBaseUrl = config.zapBaseUrl || 'https://api.zapier.com/v1';
  }

  static catalog() {
    return {
      name: 'zapier',
      displayName: 'Zapier',
      version: '1.0.0',
      category: 'misc',
      keywords: ['zapier', 'automation', 'workflow', 'zap', 'actions', 'triggers', 'nla', 'ai-actions', 'integration', 'no-code', 'webhooks'],
      toolNames: [
        'list_ai_actions', 'get_ai_action', 'execute_ai_action', 'check_ai_action_execution',
        'list_zaps', 'get_zap', 'enable_zap', 'disable_zap',
        'list_zap_runs', 'get_zap_run', 'replay_zap_run',
        'list_folders', 'get_app_info', 'list_apps',
      ],
      description: 'Zapier automation platform: execute AI Actions against 8,000+ apps, manage Zaps (workflows), monitor Zap run history, and browse the app catalog.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_ai_actions',
        description: 'List all AI Actions configured in your Zapier account that can be triggered via the NLA API',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Maximum AI Actions to return (default: 20)' },
            offset: { type: 'number', description: 'Number of AI Actions to skip for pagination (default: 0)' },
          },
        },
      },
      {
        name: 'get_ai_action',
        description: 'Get details and parameter schema for a specific Zapier AI Action by action ID',
        inputSchema: {
          type: 'object',
          properties: {
            action_id: { type: 'string', description: 'Zapier AI Action ID (from list_ai_actions)' },
          },
          required: ['action_id'],
        },
      },
      {
        name: 'execute_ai_action',
        description: 'Execute a Zapier AI Action with a natural language instruction or structured parameters',
        inputSchema: {
          type: 'object',
          properties: {
            action_id: { type: 'string', description: 'Zapier AI Action ID to execute' },
            instructions: { type: 'string', description: 'Natural language instruction describing what to do (e.g. "Send a Slack message to #general saying hello")' },
            params: { type: 'object', description: 'Optional explicit parameter key-value pairs to pass to the action (overrides NLA inference)' },
            preview_only: { type: 'boolean', description: 'Simulate execution without actually triggering the action (default: false)' },
          },
          required: ['action_id', 'instructions'],
        },
      },
      {
        name: 'check_ai_action_execution',
        description: 'Check the status and result of a previously executed Zapier AI Action by execution ID',
        inputSchema: {
          type: 'object',
          properties: {
            execution_log_id: { type: 'string', description: 'Execution log ID returned from execute_ai_action' },
          },
          required: ['execution_log_id'],
        },
      },
      {
        name: 'list_zaps',
        description: 'List Zaps in your Zapier account with optional status and search filters',
        inputSchema: {
          type: 'object',
          properties: {
            status: { type: 'string', description: 'Filter by status: on, off, draft, paused (default: all)' },
            search: { type: 'string', description: 'Search Zaps by name keyword' },
            limit: { type: 'number', description: 'Maximum Zaps to return (default: 20)' },
            offset: { type: 'number', description: 'Number of Zaps to skip for pagination (default: 0)' },
          },
        },
      },
      {
        name: 'get_zap',
        description: 'Get details for a specific Zapier Zap by Zap ID including steps and configuration',
        inputSchema: {
          type: 'object',
          properties: {
            zap_id: { type: 'string', description: 'Zapier Zap ID' },
          },
          required: ['zap_id'],
        },
      },
      {
        name: 'enable_zap',
        description: 'Enable (turn on) a Zapier Zap so it begins processing triggers',
        inputSchema: {
          type: 'object',
          properties: {
            zap_id: { type: 'string', description: 'Zapier Zap ID to enable' },
          },
          required: ['zap_id'],
        },
      },
      {
        name: 'disable_zap',
        description: 'Disable (turn off) a Zapier Zap so it stops processing triggers',
        inputSchema: {
          type: 'object',
          properties: {
            zap_id: { type: 'string', description: 'Zapier Zap ID to disable' },
          },
          required: ['zap_id'],
        },
      },
      {
        name: 'list_zap_runs',
        description: 'List run history for a specific Zap with optional status filter and date range',
        inputSchema: {
          type: 'object',
          properties: {
            zap_id: { type: 'string', description: 'Zapier Zap ID to list run history for' },
            status: { type: 'string', description: 'Filter by run status: success, error, halted (default: all)' },
            start_datetime: { type: 'string', description: 'Filter runs after this ISO 8601 datetime' },
            stop_datetime: { type: 'string', description: 'Filter runs before this ISO 8601 datetime' },
            limit: { type: 'number', description: 'Maximum runs to return (default: 20)' },
            offset: { type: 'number', description: 'Number of runs to skip for pagination (default: 0)' },
          },
          required: ['zap_id'],
        },
      },
      {
        name: 'get_zap_run',
        description: 'Get details for a specific Zap run including step results and error messages',
        inputSchema: {
          type: 'object',
          properties: {
            zap_id: { type: 'string', description: 'Zapier Zap ID' },
            run_id: { type: 'string', description: 'Zap run ID' },
          },
          required: ['zap_id', 'run_id'],
        },
      },
      {
        name: 'replay_zap_run',
        description: 'Replay a failed or errored Zap run to retry the steps that failed',
        inputSchema: {
          type: 'object',
          properties: {
            zap_id: { type: 'string', description: 'Zapier Zap ID' },
            run_id: { type: 'string', description: 'Zap run ID to replay' },
          },
          required: ['zap_id', 'run_id'],
        },
      },
      {
        name: 'list_folders',
        description: 'List Zap folders in the Zapier account for organizational browsing',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Maximum folders to return (default: 20)' },
            offset: { type: 'number', description: 'Number of folders to skip (default: 0)' },
          },
        },
      },
      {
        name: 'get_app_info',
        description: 'Get details and available triggers/actions for a specific Zapier app by app ID',
        inputSchema: {
          type: 'object',
          properties: {
            app_id: { type: 'string', description: 'Zapier app ID (e.g. "slack", "gmail", "google-sheets")' },
          },
          required: ['app_id'],
        },
      },
      {
        name: 'list_apps',
        description: 'Search the Zapier app catalog for available integrations by search term',
        inputSchema: {
          type: 'object',
          properties: {
            search: { type: 'string', description: 'Search term to find apps (e.g. "slack", "crm", "email")' },
            limit: { type: 'number', description: 'Maximum apps to return (default: 20)' },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_ai_actions': return this.listAiActions(args);
        case 'get_ai_action': return this.getAiAction(args);
        case 'execute_ai_action': return this.executeAiAction(args);
        case 'check_ai_action_execution': return this.checkAiActionExecution(args);
        case 'list_zaps': return this.listZaps(args);
        case 'get_zap': return this.getZap(args);
        case 'enable_zap': return this.enableZap(args);
        case 'disable_zap': return this.disableZap(args);
        case 'list_zap_runs': return this.listZapRuns(args);
        case 'get_zap_run': return this.getZapRun(args);
        case 'replay_zap_run': return this.replayZapRun(args);
        case 'list_folders': return this.listFolders(args);
        case 'get_app_info': return this.getAppInfo(args);
        case 'list_apps': return this.listApps(args);
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

  private get nlaHeaders(): Record<string, string> {
    return {
      'x-api-key': this.apiKey,
      'Content-Type': 'application/json',
    };
  }

  private get zapHeaders(): Record<string, string> {
    return {
      'Authorization': `Bearer ${this.zapOAuthToken ?? ''}`,
      'Content-Type': 'application/json',
    };
  }


  private async nlaGet(path: string, params?: Record<string, string>): Promise<ToolResult> {
    const qs = params && Object.keys(params).length > 0 ? '?' + new URLSearchParams(params).toString() : '';
    const response = await this.fetchWithRetry(`${this.nlaBaseUrl}${path}${qs}`, { headers: this.nlaHeaders });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async nlaPost(path: string, body: unknown): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.nlaBaseUrl}${path}`, {
      method: 'POST',
      headers: this.nlaHeaders,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async zapGet(path: string, params?: Record<string, string>): Promise<ToolResult> {
    if (!this.zapOAuthToken) {
      return { content: [{ type: 'text', text: 'Zap management tools require zapOAuthToken (OAuth2 Bearer). Provide zapOAuthToken in config.' }], isError: true };
    }
    const qs = params && Object.keys(params).length > 0 ? '?' + new URLSearchParams(params).toString() : '';
    const response = await this.fetchWithRetry(`${this.zapBaseUrl}${path}${qs}`, { headers: this.zapHeaders });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async zapPost(path: string, body?: unknown): Promise<ToolResult> {
    if (!this.zapOAuthToken) {
      return { content: [{ type: 'text', text: 'Zap management tools require zapOAuthToken (OAuth2 Bearer). Provide zapOAuthToken in config.' }], isError: true };
    }
    const response = await this.fetchWithRetry(`${this.zapBaseUrl}${path}`, {
      method: 'POST',
      headers: this.zapHeaders,
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listAiActions(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (args.limit) params.limit = String(args.limit);
    if (args.offset) params.offset = String(args.offset);
    return this.nlaGet('/exposed', params);
  }

  private async getAiAction(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.action_id) return { content: [{ type: 'text', text: 'action_id is required' }], isError: true };
    return this.nlaGet(`/exposed/${encodeURIComponent(args.action_id as string)}`);
  }

  private async executeAiAction(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.action_id || !args.instructions) {
      return { content: [{ type: 'text', text: 'action_id and instructions are required' }], isError: true };
    }
    const body: Record<string, unknown> = { instructions: args.instructions };
    if (args.params) body.params = args.params;
    if (typeof args.preview_only === 'boolean') body.preview_only = args.preview_only;
    return this.nlaPost(`/exposed/${encodeURIComponent(args.action_id as string)}/execute`, body);
  }

  private async checkAiActionExecution(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.execution_log_id) return { content: [{ type: 'text', text: 'execution_log_id is required' }], isError: true };
    return this.nlaGet(`/execution-log/${encodeURIComponent(args.execution_log_id as string)}`);
  }

  private async listZaps(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      limit: String((args.limit as number) ?? 20),
      offset: String((args.offset as number) ?? 0),
    };
    if (args.status) params.status = args.status as string;
    if (args.search) params.search = args.search as string;
    return this.zapGet('/zaps', params);
  }

  private async getZap(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.zap_id) return { content: [{ type: 'text', text: 'zap_id is required' }], isError: true };
    return this.zapGet(`/zaps/${encodeURIComponent(args.zap_id as string)}`);
  }

  private async enableZap(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.zap_id) return { content: [{ type: 'text', text: 'zap_id is required' }], isError: true };
    return this.zapPost(`/zaps/${encodeURIComponent(args.zap_id as string)}/enable`);
  }

  private async disableZap(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.zap_id) return { content: [{ type: 'text', text: 'zap_id is required' }], isError: true };
    return this.zapPost(`/zaps/${encodeURIComponent(args.zap_id as string)}/disable`);
  }

  private async listZapRuns(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.zap_id) return { content: [{ type: 'text', text: 'zap_id is required' }], isError: true };
    const params: Record<string, string> = {
      limit: String((args.limit as number) ?? 20),
      offset: String((args.offset as number) ?? 0),
    };
    if (args.status) params.status = args.status as string;
    if (args.start_datetime) params.start_datetime = args.start_datetime as string;
    if (args.stop_datetime) params.stop_datetime = args.stop_datetime as string;
    return this.zapGet(`/zaps/${encodeURIComponent(args.zap_id as string)}/runs`, params);
  }

  private async getZapRun(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.zap_id || !args.run_id) {
      return { content: [{ type: 'text', text: 'zap_id and run_id are required' }], isError: true };
    }
    return this.zapGet(`/zaps/${encodeURIComponent(args.zap_id as string)}/runs/${encodeURIComponent(args.run_id as string)}`);
  }

  private async replayZapRun(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.zap_id || !args.run_id) {
      return { content: [{ type: 'text', text: 'zap_id and run_id are required' }], isError: true };
    }
    return this.zapPost(`/zaps/${encodeURIComponent(args.zap_id as string)}/runs/${encodeURIComponent(args.run_id as string)}/replay`);
  }

  private async listFolders(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      limit: String((args.limit as number) ?? 20),
      offset: String((args.offset as number) ?? 0),
    };
    return this.zapGet('/folders', params);
  }

  private async getAppInfo(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.app_id) return { content: [{ type: 'text', text: 'app_id is required' }], isError: true };
    return this.zapGet(`/apps/${encodeURIComponent(args.app_id as string)}`);
  }

  private async listApps(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      limit: String((args.limit as number) ?? 20),
    };
    if (args.search) params.search = args.search as string;
    return this.zapGet('/apps', params);
  }
}

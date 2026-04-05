/**
 * Truora MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// No official Truora MCP server was found on GitHub or the Truora Developer Portal.
//
// Base URL: https://api.truora.com
// Auth: API key — pass as `Truora-API-Key` header.
// Docs: https://docs.truora.com/
// Spec: https://api.apis.guru/v2/specs/truora.com/1.0.0/openapi.json
// Rate limits: Not publicly documented.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface TruoraConfig {
  /** Truora API key (Truora-API-Key header) */
  apiKey: string;
  /** Optional base URL override (default: https://api.truora.com) */
  baseUrl?: string;
}

export class TruoraMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: TruoraConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? 'https://api.truora.com';
  }

  static catalog() {
    return {
      name: 'truora',
      displayName: 'Truora',
      version: '1.0.0',
      category: 'identity',
      keywords: [
        'truora', 'background check', 'identity verification', 'criminal record',
        'kyc', 'compliance', 'latam', 'person check', 'vehicle check', 'company check',
        'continuous monitoring', 'behavior', 'report', 'hook', 'webhook',
      ],
      toolNames: [
        'create_check', 'list_checks', 'get_check', 'list_check_details', 'get_health_dashboard',
        'create_pdf', 'get_pdf',
        'report_behavior',
        'list_reports', 'create_report', 'get_report', 'batch_upload_report',
        'list_score_configs', 'create_score_config', 'update_score_config', 'delete_score_config',
        'list_continuous_checks', 'create_continuous_check', 'get_continuous_check',
        'update_continuous_check', 'list_continuous_check_history',
        'list_hooks', 'create_hook', 'update_hook', 'delete_hook',
      ],
      description: 'LATAM background checks for people, vehicles, and companies via Truora. Supports criminal records, identity verification, continuous monitoring, behavior reporting, and webhook hooks.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'create_check',
        description: 'Create a background check for a person, vehicle, or company. Returns check_id, score, status, and datasets.',
        inputSchema: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              description: 'Type of check: person, vehicle, or company',
            },
            national_id: {
              type: 'string',
              description: 'National ID of the person or company tax ID',
            },
            country: {
              type: 'string',
              description: 'Two-letter ISO country code (e.g. CO, BR, MX, PE)',
            },
            vehicle_plate: {
              type: 'string',
              description: 'Vehicle license plate number (for vehicle checks)',
            },
            report_id: {
              type: 'string',
              description: 'Optional report ID to group this check into',
            },
            user_authorized: {
              type: 'boolean',
              description: 'Whether the subject authorized this background check (required for person checks with API key v1)',
            },
          },
          required: ['type', 'country'],
        },
      },
      {
        name: 'list_checks',
        description: 'List all background checks in the account, optionally filtered by report',
        inputSchema: {
          type: 'object',
          properties: {
            report_id: {
              type: 'string',
              description: 'Filter checks belonging to a specific report ID',
            },
            start_key: {
              type: 'string',
              description: 'Pagination cursor from a previous list response',
            },
          },
        },
      },
      {
        name: 'get_check',
        description: 'Get full results of a background check by check_id, including score, status, and all datasets',
        inputSchema: {
          type: 'object',
          properties: {
            check_id: {
              type: 'string',
              description: 'The check ID returned when the check was created',
            },
          },
          required: ['check_id'],
        },
      },
      {
        name: 'list_check_details',
        description: 'List detailed dataset results (criminal records, identity, legal, etc.) for a specific check',
        inputSchema: {
          type: 'object',
          properties: {
            check_id: {
              type: 'string',
              description: 'Check ID to retrieve details for',
            },
          },
          required: ['check_id'],
        },
      },
      {
        name: 'get_health_dashboard',
        description: 'Get the health dashboard showing API and database availability status for all countries',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'create_pdf',
        description: 'Request generation of a PDF report for a completed background check',
        inputSchema: {
          type: 'object',
          properties: {
            check_id: {
              type: 'string',
              description: 'Check ID to generate a PDF for',
            },
          },
          required: ['check_id'],
        },
      },
      {
        name: 'get_pdf',
        description: 'Download or get the URL for an existing PDF report of a background check',
        inputSchema: {
          type: 'object',
          properties: {
            check_id: {
              type: 'string',
              description: 'Check ID whose PDF to retrieve',
            },
          },
          required: ['check_id'],
        },
      },
      {
        name: 'report_behavior',
        description: 'Anonymously report a person\'s positive or negative behavior (e.g. Good Reputation, Theft, Tardiness) to feed reputational scoring',
        inputSchema: {
          type: 'object',
          properties: {
            document_id: {
              type: 'string',
              description: 'National ID of the person being reported',
            },
            document_type: {
              type: 'string',
              description: 'Type of ID document (e.g. national-id, passport)',
            },
            country: {
              type: 'string',
              description: 'Two-letter ISO country code',
            },
            reason: {
              type: 'string',
              description: 'Behavior reason (e.g. Good Reputation, Theft, Rape, Tardiness, Drug Possession)',
            },
            first_name: {
              type: 'string',
              description: 'Subject first name',
            },
            last_name: {
              type: 'string',
              description: 'Subject last name',
            },
            email: {
              type: 'string',
              description: 'Subject email address',
            },
            feedback_date: {
              type: 'string',
              description: 'Date the behavior occurred (ISO 8601)',
            },
          },
          required: ['document_id', 'document_type', 'country', 'reason'],
        },
      },
      {
        name: 'list_reports',
        description: 'List all background check reports in the account',
        inputSchema: {
          type: 'object',
          properties: {
            start_key: {
              type: 'string',
              description: 'Pagination cursor from a previous list response',
            },
          },
        },
      },
      {
        name: 'create_report',
        description: 'Create a new report to group multiple background checks together',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Display name for the report',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'get_report',
        description: 'Get details and status of a specific report including all grouped checks',
        inputSchema: {
          type: 'object',
          properties: {
            report_id: {
              type: 'string',
              description: 'Report ID to retrieve',
            },
          },
          required: ['report_id'],
        },
      },
      {
        name: 'batch_upload_report',
        description: 'Upload a CSV or Excel file for batch background checks under a specific report',
        inputSchema: {
          type: 'object',
          properties: {
            report_id: {
              type: 'string',
              description: 'Report ID to upload batch checks into',
            },
            file_url: {
              type: 'string',
              description: 'URL of the CSV or Excel file containing batch check data',
            },
          },
          required: ['report_id', 'file_url'],
        },
      },
      {
        name: 'list_score_configs',
        description: 'List all custom score configurations (custom check types with weighted dataset rules)',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'create_score_config',
        description: 'Create a new custom score configuration to define which datasets are included and their weights',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Name of the custom score configuration',
            },
            country: {
              type: 'string',
              description: 'Country code this configuration applies to (e.g. CO)',
            },
            type: {
              type: 'string',
              description: 'Check type this config applies to: person, vehicle, or company',
            },
          },
          required: ['name', 'country', 'type'],
        },
      },
      {
        name: 'update_score_config',
        description: 'Update an existing custom score configuration rules and weights',
        inputSchema: {
          type: 'object',
          properties: {
            config_id: {
              type: 'string',
              description: 'Configuration ID to update',
            },
            name: {
              type: 'string',
              description: 'Updated name for the configuration',
            },
          },
          required: ['config_id'],
        },
      },
      {
        name: 'delete_score_config',
        description: 'Delete a custom score configuration by ID',
        inputSchema: {
          type: 'object',
          properties: {
            config_id: {
              type: 'string',
              description: 'Configuration ID to delete',
            },
          },
          required: ['config_id'],
        },
      },
      {
        name: 'list_continuous_checks',
        description: 'List all recurring background checks configured for continuous monitoring',
        inputSchema: {
          type: 'object',
          properties: {
            start_key: {
              type: 'string',
              description: 'Pagination cursor from a previous list response',
            },
          },
        },
      },
      {
        name: 'create_continuous_check',
        description: 'Create a recurring background check that runs on a schedule and alerts on score changes',
        inputSchema: {
          type: 'object',
          properties: {
            check_id: {
              type: 'string',
              description: 'Existing check ID to monitor continuously',
            },
            frequency: {
              type: 'string',
              description: 'Recurrence frequency (e.g. weekly, monthly)',
            },
            enabled: {
              type: 'boolean',
              description: 'Whether the continuous check is active (default: true)',
            },
          },
          required: ['check_id'],
        },
      },
      {
        name: 'get_continuous_check',
        description: 'Get details of a specific continuous check including its current status and last run',
        inputSchema: {
          type: 'object',
          properties: {
            continuous_check_id: {
              type: 'string',
              description: 'Continuous check ID to retrieve',
            },
          },
          required: ['continuous_check_id'],
        },
      },
      {
        name: 'update_continuous_check',
        description: 'Update the frequency or enabled status of a continuous check',
        inputSchema: {
          type: 'object',
          properties: {
            continuous_check_id: {
              type: 'string',
              description: 'Continuous check ID to update',
            },
            frequency: {
              type: 'string',
              description: 'New frequency (e.g. weekly, monthly)',
            },
            enabled: {
              type: 'boolean',
              description: 'Whether to enable or disable this continuous check',
            },
          },
          required: ['continuous_check_id'],
        },
      },
      {
        name: 'list_continuous_check_history',
        description: 'List the history of background check runs for a continuous check',
        inputSchema: {
          type: 'object',
          properties: {
            continuous_check_id: {
              type: 'string',
              description: 'Continuous check ID whose history to retrieve',
            },
            start_key: {
              type: 'string',
              description: 'Pagination cursor from a previous list response',
            },
          },
          required: ['continuous_check_id'],
        },
      },
      {
        name: 'list_hooks',
        description: 'List all webhook subscriptions configured for Truora event notifications',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'create_hook',
        description: 'Create a webhook subscription to receive notifications when check scores change or checks complete',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Descriptive name for this webhook',
            },
            url: {
              type: 'string',
              description: 'HTTPS URL to receive webhook POST requests',
            },
            event: {
              type: 'string',
              description: 'Event type to subscribe to (e.g. check_completed, score_changed)',
            },
          },
          required: ['name', 'url', 'event'],
        },
      },
      {
        name: 'update_hook',
        description: 'Update the URL or configuration of an existing webhook',
        inputSchema: {
          type: 'object',
          properties: {
            hook_id: {
              type: 'string',
              description: 'Hook ID to update',
            },
            url: {
              type: 'string',
              description: 'New HTTPS URL for the webhook',
            },
            name: {
              type: 'string',
              description: 'Updated webhook name',
            },
          },
          required: ['hook_id'],
        },
      },
      {
        name: 'delete_hook',
        description: 'Delete a webhook subscription by hook ID',
        inputSchema: {
          type: 'object',
          properties: {
            hook_id: {
              type: 'string',
              description: 'Hook ID to delete',
            },
          },
          required: ['hook_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'create_check': return this.createCheck(args);
        case 'list_checks': return this.listChecks(args);
        case 'get_check': return this.getCheck(args);
        case 'list_check_details': return this.listCheckDetails(args);
        case 'get_health_dashboard': return this.getHealthDashboard();
        case 'create_pdf': return this.createPdf(args);
        case 'get_pdf': return this.getPdf(args);
        case 'report_behavior': return this.reportBehavior(args);
        case 'list_reports': return this.listReports(args);
        case 'create_report': return this.createReport(args);
        case 'get_report': return this.getReport(args);
        case 'batch_upload_report': return this.batchUploadReport(args);
        case 'list_score_configs': return this.listScoreConfigs();
        case 'create_score_config': return this.createScoreConfig(args);
        case 'update_score_config': return this.updateScoreConfig(args);
        case 'delete_score_config': return this.deleteScoreConfig(args);
        case 'list_continuous_checks': return this.listContinuousChecks(args);
        case 'create_continuous_check': return this.createContinuousCheck(args);
        case 'get_continuous_check': return this.getContinuousCheck(args);
        case 'update_continuous_check': return this.updateContinuousCheck(args);
        case 'list_continuous_check_history': return this.listContinuousCheckHistory(args);
        case 'list_hooks': return this.listHooks();
        case 'create_hook': return this.createHook(args);
        case 'update_hook': return this.updateHook(args);
        case 'delete_hook': return this.deleteHook(args);
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

  private get headers(): Record<string, string> {
    return {
      'Truora-API-Key': this.apiKey,
      'Content-Type': 'application/x-www-form-urlencoded',
    };
  }

  private get jsonHeaders(): Record<string, string> {
    return {
      'Truora-API-Key': this.apiKey,
      'Content-Type': 'application/json',
    };
  }

  private buildFormBody(params: Record<string, unknown>): string {
    const form = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null) form.set(k, String(v));
    }
    return form.toString();
  }

  private buildQuery(params: Record<string, string | undefined>): string {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) qs.set(k, v);
    }
    const str = qs.toString();
    return str ? `?${str}` : '';
  }

  private async get(path: string, params: Record<string, string | undefined> = {}): Promise<ToolResult> {
    const url = `${this.baseUrl}${path}${this.buildQuery(params)}`;
    const response = await this.fetchWithRetry(url, { method: 'GET', headers: this.jsonHeaders });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Truora returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async postForm(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.headers,
      body: this.buildFormBody(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Truora returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async putForm(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'PUT',
      headers: this.headers,
      body: this.buildFormBody(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Truora returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async del(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'DELETE',
      headers: this.jsonHeaders,
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { data = { deleted: true }; }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async createCheck(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.type || !args.country) {
      return { content: [{ type: 'text', text: 'type and country are required' }], isError: true };
    }
    return this.postForm('/v1/checks', args);
  }

  private async listChecks(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string | undefined> = {
      start_key: args.start_key as string | undefined,
      report_id: args.report_id as string | undefined,
    };
    return this.get('/v1/checks', params);
  }

  private async getCheck(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.check_id) return { content: [{ type: 'text', text: 'check_id is required' }], isError: true };
    return this.get(`/v1/checks/${encodeURIComponent(args.check_id as string)}`);
  }

  private async listCheckDetails(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.check_id) return { content: [{ type: 'text', text: 'check_id is required' }], isError: true };
    return this.get(`/v1/checks/${encodeURIComponent(args.check_id as string)}/details`);
  }

  private async getHealthDashboard(): Promise<ToolResult> {
    return this.get('/v1/checks/health');
  }

  private async createPdf(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.check_id) return { content: [{ type: 'text', text: 'check_id is required' }], isError: true };
    return this.postForm(`/v1/checks/${encodeURIComponent(args.check_id as string)}/pdf`, {});
  }

  private async getPdf(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.check_id) return { content: [{ type: 'text', text: 'check_id is required' }], isError: true };
    return this.get(`/v1/checks/${encodeURIComponent(args.check_id as string)}/pdf`);
  }

  private async reportBehavior(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.document_id || !args.document_type || !args.country || !args.reason) {
      return { content: [{ type: 'text', text: 'document_id, document_type, country, and reason are required' }], isError: true };
    }
    return this.postForm('/v1/behavior', args);
  }

  private async listReports(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string | undefined> = {
      start_key: args.start_key as string | undefined,
    };
    return this.get('/v1/reports', params);
  }

  private async createReport(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name) return { content: [{ type: 'text', text: 'name is required' }], isError: true };
    return this.postForm('/v1/reports', { name: args.name });
  }

  private async getReport(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.report_id) return { content: [{ type: 'text', text: 'report_id is required' }], isError: true };
    return this.get(`/v1/reports/${encodeURIComponent(args.report_id as string)}`);
  }

  private async batchUploadReport(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.report_id || !args.file_url) {
      return { content: [{ type: 'text', text: 'report_id and file_url are required' }], isError: true };
    }
    return this.postForm(`/v1/reports/${encodeURIComponent(args.report_id as string)}/upload`, { file_url: args.file_url });
  }

  private async listScoreConfigs(): Promise<ToolResult> {
    return this.get('/v1/config');
  }

  private async createScoreConfig(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name || !args.country || !args.type) {
      return { content: [{ type: 'text', text: 'name, country, and type are required' }], isError: true };
    }
    return this.postForm('/v1/config', args);
  }

  private async updateScoreConfig(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.config_id) return { content: [{ type: 'text', text: 'config_id is required' }], isError: true };
    const { config_id, ...rest } = args;
    return this.putForm(`/v1/config?config_id=${encodeURIComponent(config_id as string)}`, rest);
  }

  private async deleteScoreConfig(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.config_id) return { content: [{ type: 'text', text: 'config_id is required' }], isError: true };
    return this.del(`/v1/config?config_id=${encodeURIComponent(args.config_id as string)}`);
  }

  private async listContinuousChecks(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string | undefined> = {
      start_key: args.start_key as string | undefined,
    };
    return this.get('/v1/continuous-checks', params);
  }

  private async createContinuousCheck(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.check_id) return { content: [{ type: 'text', text: 'check_id is required' }], isError: true };
    return this.postForm('/v1/continuous-checks', args);
  }

  private async getContinuousCheck(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.continuous_check_id) {
      return { content: [{ type: 'text', text: 'continuous_check_id is required' }], isError: true };
    }
    return this.get(`/v1/continuous-checks/${encodeURIComponent(args.continuous_check_id as string)}`);
  }

  private async updateContinuousCheck(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.continuous_check_id) {
      return { content: [{ type: 'text', text: 'continuous_check_id is required' }], isError: true };
    }
    const { continuous_check_id, ...rest } = args;
    return this.putForm(`/v1/continuous-checks/${encodeURIComponent(continuous_check_id as string)}`, rest);
  }

  private async listContinuousCheckHistory(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.continuous_check_id) {
      return { content: [{ type: 'text', text: 'continuous_check_id is required' }], isError: true };
    }
    const params: Record<string, string | undefined> = {
      start_key: args.start_key as string | undefined,
    };
    return this.get(`/v1/continuous-checks/${encodeURIComponent(args.continuous_check_id as string)}/history`, params);
  }

  private async listHooks(): Promise<ToolResult> {
    return this.get('/v1/hooks');
  }

  private async createHook(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name || !args.url || !args.event) {
      return { content: [{ type: 'text', text: 'name, url, and event are required' }], isError: true };
    }
    return this.postForm('/v1/hooks', args);
  }

  private async updateHook(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.hook_id) return { content: [{ type: 'text', text: 'hook_id is required' }], isError: true };
    const { hook_id, ...rest } = args;
    return this.putForm(`/v1/hooks/${encodeURIComponent(hook_id as string)}`, rest);
  }

  private async deleteHook(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.hook_id) return { content: [{ type: 'text', text: 'hook_id is required' }], isError: true };
    return this.del(`/v1/hooks/${encodeURIComponent(args.hook_id as string)}`);
  }
}

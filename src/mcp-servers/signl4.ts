/**
 * SIGNL4 MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// Base URL: https://connect.signl4.com/api
// Auth: API key in X-S4-Api-Key header (generated in SIGNL4 portal under Developers)
// Docs: https://connect.signl4.com/api/docs
// Rate limits: Not specified in OpenAPI spec
// Note: Security also supports OAuth2 (authorizationCode flow), but API key header is simpler for integrations

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface Signl4Config {
  apiKey: string;
  baseUrl?: string;
}

export class Signl4MCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: Signl4Config) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://connect.signl4.com/api';
  }

  static catalog() {
    return {
      name: 'signl4',
      displayName: 'SIGNL4',
      version: '1.0.0',
      category: 'communication',
      keywords: [
        'signl4', 'alerting', 'notifications', 'on-call', 'incident-management',
        'mobile-alerting', 'communication', 'derdack', 'escalation',
      ],
      toolNames: [
        'trigger_alert',
        'get_alert',
        'list_alerts',
        'acknowledge_alert',
        'close_alert',
        'annotate_alert',
        'list_categories',
        'get_alert_report',
      ],
      description: 'SIGNL4 mobile alerting and incident management: trigger alerts, manage on-call duties, acknowledge and close incidents, and retrieve alert reports.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'trigger_alert',
        description: 'Trigger a new SIGNL4 alert to notify on-call team members via mobile push, SMS, or voice call',
        inputSchema: {
          type: 'object',
          properties: {
            title: { type: 'string', description: 'Alert title / headline shown in the notification' },
            text: { type: 'string', description: 'Alert body text with detailed information about the incident' },
            severity: { type: 'string', description: 'Alert severity level: None, Low, Normal, High, Critical (default: Normal)' },
            category: { type: 'string', description: 'Category name or ID to route the alert to a specific team or workflow' },
            externalId: { type: 'string', description: 'External ID for deduplication — alerts with the same externalId will update the existing alert instead of creating a new one' },
          },
          required: ['title'],
        },
      },
      {
        name: 'get_alert',
        description: 'Get full details for a specific SIGNL4 alert by its alert ID',
        inputSchema: {
          type: 'object',
          properties: {
            alertId: { type: 'string', description: 'The unique SIGNL4 alert ID to retrieve' },
          },
          required: ['alertId'],
        },
      },
      {
        name: 'list_alerts',
        description: 'List SIGNL4 alerts with optional pagination, returning alert summaries',
        inputSchema: {
          type: 'object',
          properties: {
            pageSize: { type: 'number', description: 'Number of alerts per page (default: 20)' },
            pageNumber: { type: 'number', description: 'Page number for pagination (default: 1)' },
            status: { type: 'string', description: 'Filter by alert status: New, Acknowledged, Handled, Closed' },
          },
        },
      },
      {
        name: 'acknowledge_alert',
        description: 'Acknowledge a SIGNL4 alert by alert ID to indicate a team member has taken ownership',
        inputSchema: {
          type: 'object',
          properties: {
            alertId: { type: 'string', description: 'The alert ID to acknowledge' },
          },
          required: ['alertId'],
        },
      },
      {
        name: 'close_alert',
        description: 'Close a SIGNL4 alert by alert ID to mark it as resolved',
        inputSchema: {
          type: 'object',
          properties: {
            alertId: { type: 'string', description: 'The alert ID to close' },
          },
          required: ['alertId'],
        },
      },
      {
        name: 'annotate_alert',
        description: 'Add an annotation (note) to an existing SIGNL4 alert',
        inputSchema: {
          type: 'object',
          properties: {
            alertId: { type: 'string', description: 'The alert ID to annotate' },
            text: { type: 'string', description: 'Annotation text to add to the alert' },
          },
          required: ['alertId', 'text'],
        },
      },
      {
        name: 'list_categories',
        description: 'List all alert categories for a SIGNL4 team',
        inputSchema: {
          type: 'object',
          properties: {
            teamId: { type: 'string', description: 'The SIGNL4 team ID to list categories for' },
          },
          required: ['teamId'],
        },
      },
      {
        name: 'get_alert_report',
        description: 'Get an alert report with metrics on alert volume, response times, and team performance',
        inputSchema: {
          type: 'object',
          properties: {
            from: { type: 'string', description: 'Start date for the report period (ISO 8601 format, e.g. 2026-01-01T00:00:00Z)' },
            to: { type: 'string', description: 'End date for the report period (ISO 8601 format)' },
            teamId: { type: 'string', description: 'Filter report by a specific team ID' },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'trigger_alert': return this.triggerAlert(args);
        case 'get_alert': return this.getAlert(args);
        case 'list_alerts': return this.listAlerts(args);
        case 'acknowledge_alert': return this.acknowledgeAlert(args);
        case 'close_alert': return this.closeAlert(args);
        case 'annotate_alert': return this.annotateAlert(args);
        case 'list_categories': return this.listCategories(args);
        case 'get_alert_report': return this.getAlertReport(args);
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
      'X-S4-Api-Key': this.apiKey,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  private async request(
    method: string,
    path: string,
    body?: Record<string, unknown>,
    params?: Record<string, string>,
  ): Promise<ToolResult> {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    const url = `${this.baseUrl}${path}${qs}`;
    const response = await this.fetchWithRetry(url, {
      method,
      headers: this.headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }
    // Some endpoints return 204 No Content on success
    if (response.status === 204) {
      return { content: [{ type: 'text', text: JSON.stringify({ success: true, status: 204 }) }], isError: false };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async triggerAlert(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.title) {
      return { content: [{ type: 'text', text: 'title is required' }], isError: true };
    }
    const body: Record<string, unknown> = { title: args.title };
    if (args.text) body.text = args.text;
    if (args.severity) body.severity = args.severity;
    if (args.category) body.category = args.category;
    if (args.externalId) body.externalId = args.externalId;
    return this.request('POST', '/alerts', body);
  }

  private async getAlert(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.alertId) {
      return { content: [{ type: 'text', text: 'alertId is required' }], isError: true };
    }
    return this.request('GET', `/alerts/${encodeURIComponent(args.alertId as string)}`);
  }

  private async listAlerts(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {
      pageSize: (args.pageSize as number) ?? 20,
      pageNumber: (args.pageNumber as number) ?? 1,
    };
    if (args.status) body.status = args.status;
    return this.request('POST', '/alerts/paged', body);
  }

  private async acknowledgeAlert(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.alertId) {
      return { content: [{ type: 'text', text: 'alertId is required' }], isError: true };
    }
    return this.request('POST', `/alerts/${encodeURIComponent(args.alertId as string)}/acknowledge`);
  }

  private async closeAlert(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.alertId) {
      return { content: [{ type: 'text', text: 'alertId is required' }], isError: true };
    }
    return this.request('POST', `/alerts/${encodeURIComponent(args.alertId as string)}/close`);
  }

  private async annotateAlert(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.alertId || !args.text) {
      return { content: [{ type: 'text', text: 'alertId and text are required' }], isError: true };
    }
    return this.request(
      'POST',
      `/alerts/${encodeURIComponent(args.alertId as string)}/annotate`,
      { text: args.text },
    );
  }

  private async listCategories(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.teamId) {
      return { content: [{ type: 'text', text: 'teamId is required' }], isError: true };
    }
    return this.request('GET', `/categories/${encodeURIComponent(args.teamId as string)}`);
  }

  private async getAlertReport(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (args.from) params.from = args.from as string;
    if (args.to) params.to = args.to as string;
    if (args.teamId) params.teamId = args.teamId as string;
    return this.request('GET', '/alerts/report', undefined, Object.keys(params).length > 0 ? params : undefined);
  }
}

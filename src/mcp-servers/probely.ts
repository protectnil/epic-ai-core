/**
 * Probely MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// No official Probely MCP server was found on GitHub as of 2026-03-28.
// Our adapter covers: 20 tools. Vendor MCP covers: 0 tools (none exists).
// Recommendation: use-rest-api — no official MCP server exists.
//
// Base URL: https://api.probely.com
// Auth: Authorization: JWT {token}
//   Token obtained via POST /auth/obtain/ with username+password, or created in the Probely portal
//   under Settings > Integrations > API Keys for each target.
//   Verified from: https://developers.probely.com/openapi.yaml (v1.2.0)
// Docs: https://developers.probely.com/
// Rate limits: Not publicly documented; paginate results and avoid tight polling

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface ProbelyConfig {
  authToken: string;
  baseUrl?: string;
}

export class ProbelyMCPServer extends MCPAdapterBase {
  private readonly authToken: string;
  private readonly baseUrl: string;

  constructor(config: ProbelyConfig) {
    super();
    this.authToken = config.authToken;
    this.baseUrl = config.baseUrl || 'https://api.probely.com';
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_targets',
        description: 'List all scan targets in the Probely account. Returns target IDs, names, URLs, verification status, and stack info.',
        inputSchema: {
          type: 'object',
          properties: {
            page: { type: 'number', description: 'Page number (1-based, default: 1)' },
            length: { type: 'number', description: 'Results per page (default: 10)' },
          },
        },
      },
      {
        name: 'get_target',
        description: 'Retrieve full details for a specific Probely scan target by ID.',
        inputSchema: {
          type: 'object',
          properties: {
            target_id: { type: 'string', description: 'The unique target ID' },
          },
          required: ['target_id'],
        },
      },
      {
        name: 'create_target',
        description: 'Create a new scan target in Probely with a name and site URL.',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Display name for the target' },
            url: { type: 'string', description: 'The URL of the site to scan (e.g. https://example.com)' },
            desc: { type: 'string', description: 'Optional description' },
          },
          required: ['name', 'url'],
        },
      },
      {
        name: 'delete_target',
        description: 'Delete a scan target and all its associated data from Probely.',
        inputSchema: {
          type: 'object',
          properties: {
            target_id: { type: 'string', description: 'The unique target ID to delete' },
          },
          required: ['target_id'],
        },
      },
      {
        name: 'start_scan',
        description: 'Start an immediate scan on a Probely target. Returns the scan ID and initial status (queued).',
        inputSchema: {
          type: 'object',
          properties: {
            target_id: { type: 'string', description: 'The unique target ID to scan' },
          },
          required: ['target_id'],
        },
      },
      {
        name: 'list_scans',
        description: 'List all scans for a specific target. Returns scan IDs, statuses, start/end times, and vulnerability counts.',
        inputSchema: {
          type: 'object',
          properties: {
            target_id: { type: 'string', description: 'The unique target ID' },
            page: { type: 'number', description: 'Page number (1-based, default: 1)' },
            length: { type: 'number', description: 'Results per page (default: 10)' },
          },
          required: ['target_id'],
        },
      },
      {
        name: 'get_scan',
        description: 'Get details for a specific scan including status, vulnerability counts (lows/mediums/highs), and timestamps.',
        inputSchema: {
          type: 'object',
          properties: {
            target_id: { type: 'string', description: 'The unique target ID' },
            scan_id: { type: 'string', description: 'The unique scan ID' },
          },
          required: ['target_id', 'scan_id'],
        },
      },
      {
        name: 'cancel_scan',
        description: 'Cancel a running scan on a Probely target.',
        inputSchema: {
          type: 'object',
          properties: {
            target_id: { type: 'string', description: 'The unique target ID' },
            scan_id: { type: 'string', description: 'The unique scan ID to cancel' },
          },
          required: ['target_id', 'scan_id'],
        },
      },
      {
        name: 'list_findings',
        description: 'List vulnerability findings for a target. Optionally filter by scan ID. Returns severity, URL, method, parameter, and state.',
        inputSchema: {
          type: 'object',
          properties: {
            target_id: { type: 'string', description: 'The unique target ID' },
            scan: { type: 'string', description: 'Optional scan ID to filter findings by a specific scan' },
            page: { type: 'number', description: 'Page number (1-based, default: 1)' },
            length: { type: 'number', description: 'Results per page (default: 10)' },
            severity: { type: 'number', description: 'Filter by severity: 10=low, 20=medium, 30=high' },
            state: { type: 'string', description: 'Filter by state: notfixed, fixed, accepted, notapplicable' },
          },
          required: ['target_id'],
        },
      },
      {
        name: 'get_finding',
        description: 'Get full details for a specific vulnerability finding including fix advice, evidence, requests/responses, and CVSS score.',
        inputSchema: {
          type: 'object',
          properties: {
            target_id: { type: 'string', description: 'The unique target ID' },
            finding_id: { type: 'number', description: 'The numeric finding ID' },
          },
          required: ['target_id', 'finding_id'],
        },
      },
      {
        name: 'update_finding',
        description: 'Update a finding state (e.g. mark as fixed, accepted, or notapplicable) and optionally assign it or add a comment.',
        inputSchema: {
          type: 'object',
          properties: {
            target_id: { type: 'string', description: 'The unique target ID' },
            finding_id: { type: 'number', description: 'The numeric finding ID' },
            state: { type: 'string', description: 'New state: notfixed, fixed, accepted, notapplicable' },
            severity: { type: 'number', description: 'Override severity: 10=low, 20=medium, 30=high' },
            comment: { type: 'string', description: 'Comment to add to the finding' },
          },
          required: ['target_id', 'finding_id'],
        },
      },
      {
        name: 'retest_finding',
        description: 'Request a retest for a specific finding to verify if it has been remediated.',
        inputSchema: {
          type: 'object',
          properties: {
            target_id: { type: 'string', description: 'The unique target ID' },
            finding_id: { type: 'number', description: 'The numeric finding ID to retest' },
          },
          required: ['target_id', 'finding_id'],
        },
      },
      {
        name: 'list_scheduled_scans',
        description: 'List all scheduled scans for a target (one-time or recurring).',
        inputSchema: {
          type: 'object',
          properties: {
            target_id: { type: 'string', description: 'The unique target ID' },
          },
          required: ['target_id'],
        },
      },
      {
        name: 'create_scheduled_scan',
        description: 'Create a new scheduled scan for a target. Supports one-time and recurring schedules.',
        inputSchema: {
          type: 'object',
          properties: {
            target_id: { type: 'string', description: 'The unique target ID' },
            date_time: { type: 'string', description: 'ISO 8601 datetime for the scan (e.g. 2026-04-01T10:00:00Z)' },
            recurrence: { type: 'string', description: 'Recurrence rule (iCal RRULE format, e.g. FREQ=WEEKLY;BYDAY=MO) — omit for one-time' },
          },
          required: ['target_id', 'date_time'],
        },
      },
      {
        name: 'list_labels',
        description: 'List all labels defined in the Probely account, usable for tagging findings.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'create_label',
        description: 'Create a new label in Probely for tagging and organizing findings.',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Label name' },
            color: { type: 'string', description: 'Label color as hex code (e.g. #FF5733)' },
          },
          required: ['name'],
        },
      },
      {
        name: 'list_vulnerability_definitions',
        description: 'List all vulnerability definitions known to Probely, including names and descriptions.',
        inputSchema: {
          type: 'object',
          properties: {
            page: { type: 'number', description: 'Page number (1-based, default: 1)' },
            length: { type: 'number', description: 'Results per page (default: 10)' },
          },
        },
      },
      {
        name: 'list_target_events',
        description: 'List events for a target (e.g. scan started, scan completed, finding created) for audit and monitoring.',
        inputSchema: {
          type: 'object',
          properties: {
            target_id: { type: 'string', description: 'The unique target ID' },
            page: { type: 'number', description: 'Page number (1-based, default: 1)' },
            length: { type: 'number', description: 'Results per page (default: 10)' },
          },
          required: ['target_id'],
        },
      },
      {
        name: 'get_account',
        description: 'Retrieve Probely account information including plan details and account-level settings.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'list_users',
        description: 'List users in the Probely account with their roles and email addresses.',
        inputSchema: {
          type: 'object',
          properties: {
            page: { type: 'number', description: 'Page number (1-based, default: 1)' },
            length: { type: 'number', description: 'Results per page (default: 10)' },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_targets':
          return await this.listTargets(args);
        case 'get_target':
          return await this.getTarget(args);
        case 'create_target':
          return await this.createTarget(args);
        case 'delete_target':
          return await this.deleteTarget(args);
        case 'start_scan':
          return await this.startScan(args);
        case 'list_scans':
          return await this.listScans(args);
        case 'get_scan':
          return await this.getScan(args);
        case 'cancel_scan':
          return await this.cancelScan(args);
        case 'list_findings':
          return await this.listFindings(args);
        case 'get_finding':
          return await this.getFinding(args);
        case 'update_finding':
          return await this.updateFinding(args);
        case 'retest_finding':
          return await this.retestFinding(args);
        case 'list_scheduled_scans':
          return await this.listScheduledScans(args);
        case 'create_scheduled_scan':
          return await this.createScheduledScan(args);
        case 'list_labels':
          return await this.listLabels(args);
        case 'create_label':
          return await this.createLabel(args);
        case 'list_vulnerability_definitions':
          return await this.listVulnerabilityDefinitions(args);
        case 'list_target_events':
          return await this.listTargetEvents(args);
        case 'get_account':
          return await this.getAccount();
        case 'list_users':
          return await this.listUsers(args);
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

  private async request(path: string, method: string, body?: unknown): Promise<ToolResult> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      Authorization: `JWT ${this.authToken}`,
      'Content-Type': 'application/json',
    };

    const response = await this.fetchWithRetry(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return {
        content: [{ type: 'text', text: `Probely API error ${response.status}: ${errText}` }],
        isError: true,
      };
    }

    if (response.status === 204) {
      return { content: [{ type: 'text', text: 'Success (no content)' }], isError: false };
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new Error(`Probely returned non-JSON response (HTTP ${response.status})`);
    }

    const text = JSON.stringify(data, null, 2);
    const truncated = text.length > 10_000
      ? text.slice(0, 10_000) + '\n... [truncated, ' + text.length + ' total chars]'
      : text;

    return { content: [{ type: 'text', text: truncated }], isError: false };
  }

  private async listTargets(args: Record<string, unknown>): Promise<ToolResult> {
    const page = (args.page as number) ?? 1;
    const length = (args.length as number) ?? 10;
    return this.request(`/targets/?page=${page}&length=${length}`, 'GET');
  }

  private async getTarget(args: Record<string, unknown>): Promise<ToolResult> {
    const targetId = args.target_id as string;
    if (!targetId) {
      return { content: [{ type: 'text', text: 'target_id is required' }], isError: true };
    }
    return this.request(`/targets/${encodeURIComponent(targetId)}/`, 'GET');
  }

  private async createTarget(args: Record<string, unknown>): Promise<ToolResult> {
    const name = args.name as string;
    const url = args.url as string;
    if (!name || !url) {
      return { content: [{ type: 'text', text: 'name and url are required' }], isError: true };
    }
    const body: Record<string, unknown> = { name, site: { url } };
    if (args.desc) body.desc = args.desc;
    return this.request('/targets/', 'POST', body);
  }

  private async deleteTarget(args: Record<string, unknown>): Promise<ToolResult> {
    const targetId = args.target_id as string;
    if (!targetId) {
      return { content: [{ type: 'text', text: 'target_id is required' }], isError: true };
    }
    return this.request(`/targets/${encodeURIComponent(targetId)}/`, 'DELETE');
  }

  private async startScan(args: Record<string, unknown>): Promise<ToolResult> {
    const targetId = args.target_id as string;
    if (!targetId) {
      return { content: [{ type: 'text', text: 'target_id is required' }], isError: true };
    }
    return this.request(`/targets/${encodeURIComponent(targetId)}/scan_now/`, 'POST');
  }

  private async listScans(args: Record<string, unknown>): Promise<ToolResult> {
    const targetId = args.target_id as string;
    if (!targetId) {
      return { content: [{ type: 'text', text: 'target_id is required' }], isError: true };
    }
    const page = (args.page as number) ?? 1;
    const length = (args.length as number) ?? 10;
    return this.request(`/targets/${encodeURIComponent(targetId)}/scans/?page=${page}&length=${length}`, 'GET');
  }

  private async getScan(args: Record<string, unknown>): Promise<ToolResult> {
    const targetId = args.target_id as string;
    const scanId = args.scan_id as string;
    if (!targetId || !scanId) {
      return { content: [{ type: 'text', text: 'target_id and scan_id are required' }], isError: true };
    }
    return this.request(`/targets/${encodeURIComponent(targetId)}/scans/${encodeURIComponent(scanId)}/`, 'GET');
  }

  private async cancelScan(args: Record<string, unknown>): Promise<ToolResult> {
    const targetId = args.target_id as string;
    const scanId = args.scan_id as string;
    if (!targetId || !scanId) {
      return { content: [{ type: 'text', text: 'target_id and scan_id are required' }], isError: true };
    }
    return this.request(`/targets/${encodeURIComponent(targetId)}/scans/${encodeURIComponent(scanId)}/cancel/`, 'POST');
  }

  private async listFindings(args: Record<string, unknown>): Promise<ToolResult> {
    const targetId = args.target_id as string;
    if (!targetId) {
      return { content: [{ type: 'text', text: 'target_id is required' }], isError: true };
    }
    const page = (args.page as number) ?? 1;
    const length = (args.length as number) ?? 10;
    let path = `/targets/${encodeURIComponent(targetId)}/findings/?page=${page}&length=${length}`;
    if (args.scan) path += `&scan=${encodeURIComponent(args.scan as string)}`;
    if (args.severity) path += `&severity=${args.severity}`;
    if (args.state) path += `&state=${encodeURIComponent(args.state as string)}`;
    return this.request(path, 'GET');
  }

  private async getFinding(args: Record<string, unknown>): Promise<ToolResult> {
    const targetId = args.target_id as string;
    const findingId = args.finding_id as number;
    if (!targetId || findingId === undefined || findingId === null) {
      return { content: [{ type: 'text', text: 'target_id and finding_id are required' }], isError: true };
    }
    return this.request(`/targets/${encodeURIComponent(targetId)}/findings/${findingId}/`, 'GET');
  }

  private async updateFinding(args: Record<string, unknown>): Promise<ToolResult> {
    const targetId = args.target_id as string;
    const findingId = args.finding_id as number;
    if (!targetId || findingId === undefined || findingId === null) {
      return { content: [{ type: 'text', text: 'target_id and finding_id are required' }], isError: true };
    }
    const body: Record<string, unknown> = {};
    if (args.state) body.state = args.state;
    if (args.severity) body.severity = args.severity;
    if (args.comment) body.comment = args.comment;
    return this.request(`/targets/${encodeURIComponent(targetId)}/findings/${findingId}/`, 'PATCH', body);
  }

  private async retestFinding(args: Record<string, unknown>): Promise<ToolResult> {
    const targetId = args.target_id as string;
    const findingId = args.finding_id as number;
    if (!targetId || findingId === undefined || findingId === null) {
      return { content: [{ type: 'text', text: 'target_id and finding_id are required' }], isError: true };
    }
    return this.request(`/targets/${encodeURIComponent(targetId)}/findings/${findingId}/retest/`, 'POST');
  }

  private async listScheduledScans(args: Record<string, unknown>): Promise<ToolResult> {
    const targetId = args.target_id as string;
    if (!targetId) {
      return { content: [{ type: 'text', text: 'target_id is required' }], isError: true };
    }
    return this.request(`/targets/${encodeURIComponent(targetId)}/scheduledscans/`, 'GET');
  }

  private async createScheduledScan(args: Record<string, unknown>): Promise<ToolResult> {
    const targetId = args.target_id as string;
    const dateTime = args.date_time as string;
    if (!targetId || !dateTime) {
      return { content: [{ type: 'text', text: 'target_id and date_time are required' }], isError: true };
    }
    const body: Record<string, unknown> = { date_time: dateTime };
    if (args.recurrence) body.recurrence = args.recurrence;
    return this.request(`/targets/${encodeURIComponent(targetId)}/scheduledscans/`, 'POST', body);
  }

  private async listLabels(_args: Record<string, unknown>): Promise<ToolResult> {
    return this.request('/labels/', 'GET');
  }

  private async createLabel(args: Record<string, unknown>): Promise<ToolResult> {
    const name = args.name as string;
    if (!name) {
      return { content: [{ type: 'text', text: 'name is required' }], isError: true };
    }
    const body: Record<string, unknown> = { name };
    if (args.color) body.color = args.color;
    return this.request('/labels/', 'POST', body);
  }

  private async listVulnerabilityDefinitions(args: Record<string, unknown>): Promise<ToolResult> {
    const page = (args.page as number) ?? 1;
    const length = (args.length as number) ?? 10;
    return this.request(`/vulnerability_definitions/?page=${page}&length=${length}`, 'GET');
  }

  private async listTargetEvents(args: Record<string, unknown>): Promise<ToolResult> {
    const targetId = args.target_id as string;
    if (!targetId) {
      return { content: [{ type: 'text', text: 'target_id is required' }], isError: true };
    }
    const page = (args.page as number) ?? 1;
    const length = (args.length as number) ?? 10;
    return this.request(`/targets/${encodeURIComponent(targetId)}/events/?page=${page}&length=${length}`, 'GET');
  }

  private async getAccount(): Promise<ToolResult> {
    return this.request('/account/', 'GET');
  }

  private async listUsers(args: Record<string, unknown>): Promise<ToolResult> {
    const page = (args.page as number) ?? 1;
    const length = (args.length as number) ?? 10;
    return this.request(`/users/?page=${page}&length=${length}`, 'GET');
  }

  static catalog() {
    return {
      name: 'probely',
      displayName: 'Probely',
      version: '1.0.0',
      category: 'cybersecurity' as const,
      keywords: ['probely', 'vulnerability-scanning', 'web-security', 'dast', 'penetration-testing'],
      toolNames: [
        'list_targets', 'get_target', 'create_target', 'delete_target',
        'start_scan', 'list_scans', 'get_scan', 'cancel_scan',
        'list_findings', 'get_finding', 'update_finding', 'retest_finding',
        'list_scheduled_scans', 'create_scheduled_scan',
        'list_labels', 'create_label',
        'list_vulnerability_definitions', 'list_target_events',
        'get_account', 'list_users',
      ],
      description: 'Probely web vulnerability scanner adapter for the Epic AI Intelligence Platform',
      author: 'protectnil' as const,
    };
  }
}

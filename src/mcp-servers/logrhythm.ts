/**
 * LogRhythm MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// No official LogRhythm MCP server was found on GitHub, npm, or any vendor channel.
// LogRhythm documentation has migrated to Exabeam at https://developers.exabeam.com/logrhythm-siem/.
// Our adapter covers: 15 tools. Vendor MCP covers: 0 tools.
// Recommendation: use-rest-api — no official MCP server exists.
//
// Base URL: https://{host}:8501  (Client Console port — hosts lr-alarm-api, lr-admin-api)
//           https://{host}:8501  (Case API also served on 8501 at /lr-case-api/)
//           https://{host}:8501  (Search API at /lr-search-api/)
//           https://{host}:8501  (Drilldown API at /lr-drilldown-cache-api/)
// Auth: Bearer token (JWT API key generated in the LogRhythm Client Console under API Accounts)
// Docs: https://developers.exabeam.com/logrhythm-siem/reference (authoritative, replaces docs.logrhythm.com)
//       https://docs.logrhythm.com/lrapi/docs/rest-api (deprecated, redirects to above)
// Rate limits: Not publicly documented; governed by the on-premises deployment configuration
//
// NOTE: The Search API (search_events tool) uses an async two-step pattern in the actual API
// (POST to create task → GET to poll results by taskId). The current implementation uses a
// single POST to /lr-search-api/actions/search — this path is UNVERIFIED against the official
// Exabeam API reference (the reference page requires login). Tool is marked UNVERIFIED.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface LogRhythmConfig {
  /** LogRhythm host (hostname or IP). Do not include the scheme or port. */
  host: string;
  /** API key generated in the LogRhythm Client Console under API Accounts. */
  apiKey: string;
  /** Port for the Client Console APIs (Alarm, Admin, Case, Search). Default: 8501 */
  port?: number;
}

export class LogRhythmMCPServer extends MCPAdapterBase {
  private readonly baseUrl: string;
  private readonly headers: Record<string, string>;

  constructor(config: LogRhythmConfig) {
    super();
    const port = config.port ?? 8501;
    this.baseUrl = `https://${config.host}:${port}`;
    this.headers = {
      'Authorization': `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
  }

  static catalog() {
    return {
      name: 'logrhythm',
      displayName: 'LogRhythm',
      version: '1.0.0',
      category: 'cybersecurity',
      keywords: ['logrhythm', 'siem', 'alarm', 'case', 'incident', 'event', 'log', 'threat', 'security', 'alert', 'investigation'],
      toolNames: [
        'list_alarms', 'get_alarm', 'update_alarm_status', 'get_alarm_events',
        'list_cases', 'get_case', 'create_case', 'update_case',
        'add_case_note', 'add_case_alarm', 'list_case_evidence',
        'search_events', 'get_drilldown_logs',
        'list_entities', 'list_users',
      ],
      description: 'LogRhythm SIEM: manage alarms, security investigation cases, search events, and perform administrative queries against on-premises LogRhythm deployments.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      // ── Alarm API ──────────────────────────────────────────────────────────
      {
        name: 'list_alarms',
        description: 'List alarms from LogRhythm with optional filters for status, severity, and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Maximum number of alarms to return (default: 50, max: 500)' },
            offset: { type: 'number', description: 'Number of alarms to skip for pagination (default: 0)' },
            status: { type: 'string', description: 'Filter by alarm status: New, Working, Escalated, AutoClosed, FalsePositive, Resolved, Reported (default: all)' },
            priority: { type: 'string', description: 'Filter by alarm priority: Low, Medium, High, Critical' },
            alarmRuleName: { type: 'string', description: 'Filter alarms by rule name (partial match)' },
          },
        },
      },
      {
        name: 'get_alarm',
        description: 'Get full details of a specific LogRhythm alarm by its alarm ID',
        inputSchema: {
          type: 'object',
          properties: {
            alarmId: { type: 'number', description: 'Numeric LogRhythm alarm ID' },
          },
          required: ['alarmId'],
        },
      },
      {
        name: 'update_alarm_status',
        description: 'Update the status and optional RBP comments of a LogRhythm alarm',
        inputSchema: {
          type: 'object',
          properties: {
            alarmId: { type: 'number', description: 'Numeric LogRhythm alarm ID' },
            alarmStatus: { type: 'string', description: 'New status: New, Working, Escalated, AutoClosed, FalsePositive, Resolved, Reported' },
            rbpMax: { type: 'number', description: 'Risk-based priority max override (0–100)' },
            rbpMin: { type: 'number', description: 'Risk-based priority min override (0–100)' },
          },
          required: ['alarmId', 'alarmStatus'],
        },
      },
      {
        name: 'get_alarm_events',
        description: 'Retrieve the raw log events associated with a specific LogRhythm alarm',
        inputSchema: {
          type: 'object',
          properties: {
            alarmId: { type: 'number', description: 'Numeric LogRhythm alarm ID' },
          },
          required: ['alarmId'],
        },
      },
      // ── Case API ───────────────────────────────────────────────────────────
      {
        name: 'list_cases',
        description: 'List security investigation cases in LogRhythm with optional status and owner filters',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Maximum number of cases to return (default: 50)' },
            offset: { type: 'number', description: 'Number of cases to skip for pagination (default: 0)' },
            status: { type: 'string', description: 'Filter by status code: 1 (Created), 2 (Completed), 3 (Incident), 4 (Mitigated), 5 (Resolved)' },
            priority: { type: 'number', description: 'Filter by case priority (1–5, where 1 is Critical)' },
          },
        },
      },
      {
        name: 'get_case',
        description: 'Get full details of a specific LogRhythm investigation case by ID',
        inputSchema: {
          type: 'object',
          properties: {
            caseId: { type: 'string', description: 'Case ID (alphanumeric GUID or short ID)' },
          },
          required: ['caseId'],
        },
      },
      {
        name: 'create_case',
        description: 'Create a new security investigation case in LogRhythm',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Case name (required)' },
            priority: { type: 'number', description: 'Case priority: 1 (Critical), 2 (High), 3 (Medium), 4 (Low), 5 (Info)' },
            summary: { type: 'string', description: 'Case summary description' },
            dueDate: { type: 'string', description: 'Due date in ISO 8601 format (e.g. 2026-04-01T00:00:00Z)' },
          },
          required: ['name', 'priority'],
        },
      },
      {
        name: 'update_case',
        description: 'Update an existing LogRhythm investigation case — status, priority, assignee, or summary',
        inputSchema: {
          type: 'object',
          properties: {
            caseId: { type: 'string', description: 'Case ID to update' },
            name: { type: 'string', description: 'Updated case name' },
            status: { type: 'number', description: 'Updated status code: 1 (Created), 2 (Completed), 3 (Incident), 4 (Mitigated), 5 (Resolved)' },
            priority: { type: 'number', description: 'Updated priority: 1 (Critical) to 5 (Info)' },
            summary: { type: 'string', description: 'Updated case summary' },
            assignee: { type: 'string', description: 'User ID to assign the case to' },
          },
          required: ['caseId'],
        },
      },
      {
        name: 'add_case_note',
        description: 'Add a text note as evidence to an existing LogRhythm case',
        inputSchema: {
          type: 'object',
          properties: {
            caseId: { type: 'string', description: 'Case ID to attach the note to' },
            text: { type: 'string', description: 'Note text content' },
          },
          required: ['caseId', 'text'],
        },
      },
      {
        name: 'add_case_alarm',
        description: 'Add one or more alarm IDs as evidence to an existing LogRhythm case',
        inputSchema: {
          type: 'object',
          properties: {
            caseId: { type: 'string', description: 'Case ID to attach alarms to' },
            alarmIds: { type: 'array', items: { type: 'number' }, description: 'Array of numeric alarm IDs to attach as case evidence' },
          },
          required: ['caseId', 'alarmIds'],
        },
      },
      {
        name: 'list_case_evidence',
        description: 'List all evidence items attached to a LogRhythm case (notes, alarms, files)',
        inputSchema: {
          type: 'object',
          properties: {
            caseId: { type: 'string', description: 'Case ID to retrieve evidence for' },
          },
          required: ['caseId'],
        },
      },
      // ── Search API ─────────────────────────────────────────────────────────
      {
        name: 'search_events',
        description: 'Search log events in LogRhythm using a query string and optional time range',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'LogRhythm search query string' },
            startTime: { type: 'string', description: 'Start of search window in ISO 8601 (e.g. 2026-03-01T00:00:00Z)' },
            endTime: { type: 'string', description: 'End of search window in ISO 8601 (e.g. 2026-03-24T23:59:59Z)' },
            limit: { type: 'number', description: 'Maximum number of log events to return (default: 50, max: 500)' },
          },
          required: ['query'],
        },
      },
      {
        name: 'get_drilldown_logs',
        description: 'Get AIE drill-down log details for a specific alarm, including per-rule-block event breakdown',
        inputSchema: {
          type: 'object',
          properties: {
            alarmId: { type: 'number', description: 'Numeric LogRhythm alarm ID to retrieve drill-down logs for' },
          },
          required: ['alarmId'],
        },
      },
      // ── Administration API ─────────────────────────────────────────────────
      {
        name: 'list_entities',
        description: 'List LogRhythm entities (network segments, hosts, and organizational units) with optional name filter',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Filter entities by name (partial match)' },
            limit: { type: 'number', description: 'Maximum number of entities to return (default: 50)' },
            offset: { type: 'number', description: 'Pagination offset (default: 0)' },
          },
        },
      },
      {
        name: 'list_users',
        description: 'List LogRhythm user accounts with optional filter by login or entity',
        inputSchema: {
          type: 'object',
          properties: {
            login: { type: 'string', description: 'Filter users by login name (partial match)' },
            entityId: { type: 'number', description: 'Filter users belonging to a specific entity ID' },
            limit: { type: 'number', description: 'Maximum number of users to return (default: 50)' },
            offset: { type: 'number', description: 'Pagination offset (default: 0)' },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_alarms':         return await this.listAlarms(args);
        case 'get_alarm':           return await this.getAlarm(args);
        case 'update_alarm_status': return await this.updateAlarmStatus(args);
        case 'get_alarm_events':    return await this.getAlarmEvents(args);
        case 'list_cases':          return await this.listCases(args);
        case 'get_case':            return await this.getCase(args);
        case 'create_case':         return await this.createCase(args);
        case 'update_case':         return await this.updateCase(args);
        case 'add_case_note':       return await this.addCaseNote(args);
        case 'add_case_alarm':      return await this.addCaseAlarm(args);
        case 'list_case_evidence':  return await this.listCaseEvidence(args);
        case 'search_events':       return await this.searchEvents(args);
        case 'get_drilldown_logs':  return await this.getDrilldownLogs(args);
        case 'list_entities':       return await this.listEntities(args);
        case 'list_users':          return await this.listUsers(args);
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

  private async request(
    path: string,
    method: string = 'GET',
    body?: unknown,
  ): Promise<unknown> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method,
      headers: this.headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText} — ${path}`);
    }
    if (response.status === 204) {
      return { success: true };
    }
    return response.json();
  }

  private async listAlarms(args: Record<string, unknown>): Promise<ToolResult> {
    const limit = (args.limit as number) ?? 50;
    const offset = (args.offset as number) ?? 0;
    const url = new URL(`${this.baseUrl}/lr-alarm-api/alarms`);
    url.searchParams.set('count', limit.toString());
    url.searchParams.set('offset', offset.toString());
    if (args.status) url.searchParams.set('status', args.status as string);
    if (args.priority) url.searchParams.set('priority', args.priority as string);
    if (args.alarmRuleName) url.searchParams.set('alarmRuleName', args.alarmRuleName as string);

    const response = await this.fetchWithRetry(url.toString(), { headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getAlarm(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.alarmId) {
      return { content: [{ type: 'text', text: 'alarmId is required' }], isError: true };
    }
    const data = await this.request(`/lr-alarm-api/alarms/${encodeURIComponent(String(args.alarmId))}`);
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async updateAlarmStatus(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.alarmId || !args.alarmStatus) {
      return { content: [{ type: 'text', text: 'alarmId and alarmStatus are required' }], isError: true };
    }
    const body: Record<string, unknown> = { alarmStatus: args.alarmStatus };
    if (args.rbpMax !== undefined) body.rbpMax = args.rbpMax;
    if (args.rbpMin !== undefined) body.rbpMin = args.rbpMin;
    const data = await this.request(
      `/lr-alarm-api/alarms/${encodeURIComponent(String(args.alarmId))}/status`,
      'PATCH',
      body,
    );
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getAlarmEvents(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.alarmId) {
      return { content: [{ type: 'text', text: 'alarmId is required' }], isError: true };
    }
    const data = await this.request(`/lr-alarm-api/alarms/${encodeURIComponent(String(args.alarmId))}/events`);
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listCases(args: Record<string, unknown>): Promise<ToolResult> {
    const limit = (args.limit as number) ?? 50;
    const offset = (args.offset as number) ?? 0;
    const url = new URL(`${this.baseUrl}/lr-case-api/cases`);
    url.searchParams.set('count', limit.toString());
    url.searchParams.set('offset', offset.toString());
    if (args.status !== undefined) url.searchParams.set('status', String(args.status));
    if (args.priority !== undefined) url.searchParams.set('priority', String(args.priority));

    const response = await this.fetchWithRetry(url.toString(), { headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getCase(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.caseId) {
      return { content: [{ type: 'text', text: 'caseId is required' }], isError: true };
    }
    const data = await this.request(`/lr-case-api/cases/${encodeURIComponent(args.caseId as string)}`);
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async createCase(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name || args.priority === undefined) {
      return { content: [{ type: 'text', text: 'name and priority are required' }], isError: true };
    }
    const body: Record<string, unknown> = { name: args.name, priority: args.priority };
    if (args.summary) body.summary = args.summary;
    if (args.dueDate) body.dueDate = args.dueDate;
    const data = await this.request('/lr-case-api/cases', 'POST', body);
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async updateCase(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.caseId) {
      return { content: [{ type: 'text', text: 'caseId is required' }], isError: true };
    }
    const body: Record<string, unknown> = {};
    if (args.name !== undefined) body.name = args.name;
    if (args.status !== undefined) body.status = args.status;
    if (args.priority !== undefined) body.priority = args.priority;
    if (args.summary !== undefined) body.summary = args.summary;
    if (args.assignee !== undefined) body.owner = { number: args.assignee };
    if (Object.keys(body).length === 0) {
      return { content: [{ type: 'text', text: 'At least one field is required for update' }], isError: true };
    }
    const data = await this.request(
      `/lr-case-api/cases/${encodeURIComponent(args.caseId as string)}`,
      'PUT',
      body,
    );
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async addCaseNote(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.caseId || !args.text) {
      return { content: [{ type: 'text', text: 'caseId and text are required' }], isError: true };
    }
    const data = await this.request(
      `/lr-case-api/cases/${encodeURIComponent(args.caseId as string)}/evidence/note`,
      'POST',
      { text: args.text },
    );
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async addCaseAlarm(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.caseId || !Array.isArray(args.alarmIds) || args.alarmIds.length === 0) {
      return { content: [{ type: 'text', text: 'caseId and alarmIds array are required' }], isError: true };
    }
    const data = await this.request(
      `/lr-case-api/cases/${encodeURIComponent(args.caseId as string)}/evidence/alarms`,
      'POST',
      { alarmIds: args.alarmIds },
    );
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listCaseEvidence(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.caseId) {
      return { content: [{ type: 'text', text: 'caseId is required' }], isError: true };
    }
    const data = await this.request(
      `/lr-case-api/cases/${encodeURIComponent(args.caseId as string)}/evidence`,
    );
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async searchEvents(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.query) {
      return { content: [{ type: 'text', text: 'query is required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      query: args.query,
      maxMsgCount: (args.limit as number) ?? 50,
    };
    if (args.startTime) body.dateRange = { startDate: args.startTime, endDate: args.endTime };
    const data = await this.request('/lr-search-api/actions/search', 'POST', body);
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getDrilldownLogs(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.alarmId) {
      return { content: [{ type: 'text', text: 'alarmId is required' }], isError: true };
    }
    const data = await this.request(
      `/lr-drilldown-cache-api/drilldown/${encodeURIComponent(String(args.alarmId))}`,
    );
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listEntities(args: Record<string, unknown>): Promise<ToolResult> {
    const url = new URL(`${this.baseUrl}/lr-admin-api/entities`);
    if (args.name) url.searchParams.set('name', args.name as string);
    if (args.limit) url.searchParams.set('count', String(args.limit));
    if (args.offset) url.searchParams.set('offset', String(args.offset));

    const response = await this.fetchWithRetry(url.toString(), { headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listUsers(args: Record<string, unknown>): Promise<ToolResult> {
    const url = new URL(`${this.baseUrl}/lr-admin-api/users`);
    if (args.login) url.searchParams.set('login', args.login as string);
    if (args.entityId) url.searchParams.set('entityId', String(args.entityId));
    if (args.limit) url.searchParams.set('count', String(args.limit));
    if (args.offset) url.searchParams.set('offset', String(args.offset));

    const response = await this.fetchWithRetry(url.toString(), { headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }
}

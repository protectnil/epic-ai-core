/**
 * ThreatConnect MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// No official ThreatConnect MCP server was found on GitHub or npm as of March 2026.
// Our adapter covers: 22 tools.
// Recommendation: use-rest-api — no official MCP server exists.
//
// Base URL: https://api.threatconnect.com/v3
// Auth: HMAC-SHA256 — Two required headers per request:
//   Timestamp: {unix_epoch_seconds}
//   Authorization: TC {accessId}:{signature}
//   Signature = HMAC-SHA256( "{path}:{httpMethod}:{timestamp}", secretKey ) → Base64
//   Example signing string: "/v3/indicators:GET:1513703787"
// Docs: https://docs.threatconnect.com/en/latest/rest_api/v3/available_endpoints.html
// Rate limits: Not publicly documented; recommended max 100 req/min per access ID

import { createHmac } from 'node:crypto';
import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface ThreatConnectConfig {
  accessId: string;
  secretKey: string;
  baseUrl?: string;
}

export class ThreatConnectMCPServer extends MCPAdapterBase {
  private readonly accessId: string;
  private readonly secretKey: string;
  private readonly baseUrl: string;

  constructor(config: ThreatConnectConfig) {
    super();
    this.accessId = config.accessId;
    this.secretKey = config.secretKey;
    this.baseUrl = (config.baseUrl ?? 'https://api.threatconnect.com').replace(/\/$/, '') + '/v3';
  }

  static catalog() {
    return {
      name: 'threatconnect',
      displayName: 'ThreatConnect',
      version: '2.0.0',
      category: 'cybersecurity' as const,
      keywords: [
        'threatconnect', 'threat intelligence', 'TIP', 'indicator', 'IOC',
        'group', 'adversary', 'campaign', 'incident', 'case', 'task',
        'victim', 'playbook', 'tag', 'security label', 'enrichment',
      ],
      toolNames: [
        'list_indicators', 'get_indicator', 'create_indicator', 'update_indicator', 'delete_indicator',
        'list_groups', 'get_group', 'create_group',
        'list_cases', 'get_case', 'create_case', 'update_case',
        'list_tasks', 'get_task', 'create_task',
        'list_victims', 'get_victim',
        'list_tags', 'list_security_labels',
        'search_intelligence',
        'list_playbooks', 'execute_playbook',
      ],
      description: 'Threat intelligence platform: manage indicators, groups, cases, tasks, victims, tags, and playbooks across ThreatConnect v3 API.',
      author: 'protectnil' as const,
    };
  }

  // ──────────────────────────────────────────────
  // HMAC signing helper
  // Per ThreatConnect docs: two required headers —
  //   Timestamp: {unix_epoch_seconds}
  //   Authorization: TC {accessId}:{signature}
  // Signing string: "{path}:{httpMethod}:{timestamp}"
  // ──────────────────────────────────────────────
  private buildAuthHeader(path: string, method = 'GET'): Record<string, string> {
    const timestamp = Math.floor(Date.now() / 1000);
    const signingString = `${path}:${method.toUpperCase()}:${timestamp}`;
    const signature = createHmac('sha256', this.secretKey)
      .update(signingString)
      .digest('base64');
    return {
      Authorization: `TC ${this.accessId}:${signature}`,
      Timestamp: String(timestamp),
      'Content-Type': 'application/json',
    };
  }

  // ──────────────────────────────────────────────
  // HTTP helper — throws on non-OK
  // ──────────────────────────────────────────────
  private async req(path: string, method = 'GET', body?: unknown): Promise<unknown> {
    const url = `${this.baseUrl}${path}`;
    // Signing path must be the full URL path + query string per ThreatConnect docs.
    // baseUrl ends with "/v3", so signing path = "/v3" + path (e.g. "/v3/indicators?tql=...").
    const parsed = new URL(url);
    const signingPath = parsed.pathname + (parsed.search ? parsed.search : '');
    const headers = this.buildAuthHeader(signingPath, method);
    const response = await this.fetchWithRetry(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      throw new Error(`ThreatConnect API error ${response.status}: ${errText}`);
    }
    return response.json();
  }

  // ──────────────────────────────────────────────
  // Truncation helper
  // ──────────────────────────────────────────────
  get tools(): ToolDefinition[] {
    return [
      // ── Indicators ──────────────────────────────
      {
        name: 'list_indicators',
        description: 'List threat indicators (IPs, domains, URLs, hashes) with optional TQL filter and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            filter: { type: 'string', description: 'TQL filter expression (e.g., "typeName EQ Address" or "rating GE 3")' },
            fields: { type: 'string', description: 'Comma-separated additional fields to include (e.g., "tags,attributes,securityLabels")' },
            limit: { type: 'number', description: 'Maximum results per page (default: 100, max: 10000)' },
            offset: { type: 'number', description: 'Pagination offset (default: 0)' },
          },
        },
      },
      {
        name: 'get_indicator',
        description: 'Retrieve full details for a specific indicator by its ID',
        inputSchema: {
          type: 'object',
          properties: {
            indicator_id: { type: 'string', description: 'ThreatConnect numeric indicator ID' },
            fields: { type: 'string', description: 'Comma-separated additional fields to include (e.g., "tags,attributes")' },
          },
          required: ['indicator_id'],
        },
      },
      {
        name: 'create_indicator',
        description: 'Create a new threat indicator of any supported type (Address, EmailAddress, Host, URL, File)',
        inputSchema: {
          type: 'object',
          properties: {
            type: { type: 'string', description: 'Indicator type: Address, EmailAddress, Host, URL, File' },
            summary: { type: 'string', description: 'Indicator value (e.g., "192.168.1.1", "malware.example.com", MD5 hash)' },
            owner_name: { type: 'string', description: 'ThreatConnect owner name (organization or community)' },
            rating: { type: 'number', description: 'Threat rating 0-5 (default: 0)' },
            confidence: { type: 'number', description: 'Confidence score 0-100 (default: 0)' },
            description: { type: 'string', description: 'Free-text description of the indicator' },
          },
          required: ['type', 'summary'],
        },
      },
      {
        name: 'update_indicator',
        description: 'Update rating, confidence, or description of an existing indicator by ID',
        inputSchema: {
          type: 'object',
          properties: {
            indicator_id: { type: 'string', description: 'ThreatConnect numeric indicator ID' },
            rating: { type: 'number', description: 'New threat rating 0-5' },
            confidence: { type: 'number', description: 'New confidence score 0-100' },
            description: { type: 'string', description: 'Updated description' },
          },
          required: ['indicator_id'],
        },
      },
      {
        name: 'delete_indicator',
        description: 'Delete an indicator by its ThreatConnect ID',
        inputSchema: {
          type: 'object',
          properties: {
            indicator_id: { type: 'string', description: 'ThreatConnect numeric indicator ID to delete' },
          },
          required: ['indicator_id'],
        },
      },
      // ── Groups ───────────────────────────────────
      {
        name: 'list_groups',
        description: 'List threat groups (adversaries, campaigns, incidents, intrusion sets, malware) with optional TQL filter',
        inputSchema: {
          type: 'object',
          properties: {
            filter: { type: 'string', description: 'TQL filter (e.g., "typeName EQ Campaign" or "status EQ Active")' },
            fields: { type: 'string', description: 'Additional fields to return (e.g., "tags,indicators")' },
            limit: { type: 'number', description: 'Maximum results per page (default: 100)' },
            offset: { type: 'number', description: 'Pagination offset (default: 0)' },
          },
        },
      },
      {
        name: 'get_group',
        description: 'Retrieve full details for a threat group (campaign, adversary, incident) by ID',
        inputSchema: {
          type: 'object',
          properties: {
            group_id: { type: 'string', description: 'ThreatConnect numeric group ID' },
            fields: { type: 'string', description: 'Additional fields to return (e.g., "indicators,victimAssets")' },
          },
          required: ['group_id'],
        },
      },
      {
        name: 'create_group',
        description: 'Create a new threat group (adversary, campaign, incident, malware, signature, or document)',
        inputSchema: {
          type: 'object',
          properties: {
            type: { type: 'string', description: 'Group type: Adversary, Campaign, Document, Email, Incident, Malware, Signature, Task' },
            name: { type: 'string', description: 'Group name' },
            owner_name: { type: 'string', description: 'ThreatConnect owner name' },
            description: { type: 'string', description: 'Group description' },
            status: { type: 'string', description: 'Incident status: New, Open, Stale, Closed (for Incident type)' },
          },
          required: ['type', 'name'],
        },
      },
      // ── Cases ────────────────────────────────────
      {
        name: 'list_cases',
        description: 'List workflow cases (SOC investigations) with optional TQL filter, severity, and status filters',
        inputSchema: {
          type: 'object',
          properties: {
            filter: { type: 'string', description: 'TQL filter (e.g., "severity EQ High AND status EQ Open")' },
            fields: { type: 'string', description: 'Additional fields (e.g., "tasks,notes,artifacts")' },
            limit: { type: 'number', description: 'Maximum results (default: 100)' },
            offset: { type: 'number', description: 'Pagination offset (default: 0)' },
          },
        },
      },
      {
        name: 'get_case',
        description: 'Retrieve full details for a specific workflow case by ID',
        inputSchema: {
          type: 'object',
          properties: {
            case_id: { type: 'string', description: 'ThreatConnect case ID' },
            fields: { type: 'string', description: 'Additional fields (e.g., "tasks,notes,artifacts")' },
          },
          required: ['case_id'],
        },
      },
      {
        name: 'create_case',
        description: 'Create a new workflow case for SOC investigations or incident tracking',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Case name' },
            severity: { type: 'string', description: 'Severity: Critical, High, Medium, Low, None (default: None)' },
            status: { type: 'string', description: 'Status: Open, Closed (default: Open)' },
            description: { type: 'string', description: 'Case description' },
          },
          required: ['name', 'severity', 'status'],
        },
      },
      {
        name: 'update_case',
        description: 'Update the status, severity, or description of an existing workflow case',
        inputSchema: {
          type: 'object',
          properties: {
            case_id: { type: 'string', description: 'ThreatConnect case ID' },
            status: { type: 'string', description: 'New status: Open, Closed' },
            severity: { type: 'string', description: 'New severity: Critical, High, Medium, Low, None' },
            description: { type: 'string', description: 'Updated description' },
          },
          required: ['case_id'],
        },
      },
      // ── Tasks ────────────────────────────────────
      {
        name: 'list_tasks',
        description: 'List case management tasks with optional TQL filter and assignment filters',
        inputSchema: {
          type: 'object',
          properties: {
            filter: { type: 'string', description: 'TQL filter (e.g., "status EQ Open" or "assignee.username EQ jdoe")' },
            limit: { type: 'number', description: 'Maximum results (default: 100)' },
            offset: { type: 'number', description: 'Pagination offset (default: 0)' },
          },
        },
      },
      {
        name: 'get_task',
        description: 'Retrieve details for a specific case management task by ID',
        inputSchema: {
          type: 'object',
          properties: {
            task_id: { type: 'string', description: 'ThreatConnect task ID' },
          },
          required: ['task_id'],
        },
      },
      {
        name: 'create_task',
        description: 'Create a new case management task with optional assignment and due date',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Task name' },
            case_id: { type: 'string', description: 'Parent case ID to associate this task with' },
            status: { type: 'string', description: 'Status: Open, Closed (default: Open)' },
            description: { type: 'string', description: 'Task description' },
            due_date: { type: 'string', description: 'Due date in ISO 8601 format (e.g., "2026-04-01T00:00:00Z")' },
            assigned_to: { type: 'string', description: 'Username to assign the task to' },
          },
          required: ['name'],
        },
      },
      // ── Victims ──────────────────────────────────
      {
        name: 'list_victims',
        description: 'List victims (organizations or individuals targeted by threat actors) with optional TQL filter',
        inputSchema: {
          type: 'object',
          properties: {
            filter: { type: 'string', description: 'TQL filter (e.g., "name CONTAINS AcmeCorp")' },
            limit: { type: 'number', description: 'Maximum results (default: 100)' },
            offset: { type: 'number', description: 'Pagination offset (default: 0)' },
          },
        },
      },
      {
        name: 'get_victim',
        description: 'Retrieve full details for a specific victim record by ID, including assets and associated groups',
        inputSchema: {
          type: 'object',
          properties: {
            victim_id: { type: 'string', description: 'ThreatConnect victim ID' },
            fields: { type: 'string', description: 'Additional fields to include (e.g., "victimAssets")' },
          },
          required: ['victim_id'],
        },
      },
      // ── Tags & Labels ────────────────────────────
      {
        name: 'list_tags',
        description: 'List all available tags in ThreatConnect, including ATT&CK technique tags',
        inputSchema: {
          type: 'object',
          properties: {
            filter: { type: 'string', description: 'TQL filter (e.g., "name CONTAINS T1059")' },
            limit: { type: 'number', description: 'Maximum results (default: 500)' },
            offset: { type: 'number', description: 'Pagination offset (default: 0)' },
          },
        },
      },
      {
        name: 'list_security_labels',
        description: 'List all available TLP and custom security labels used to classify sensitive intelligence',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Maximum results (default: 200)' },
            offset: { type: 'number', description: 'Pagination offset (default: 0)' },
          },
        },
      },
      // ── Search ───────────────────────────────────
      {
        name: 'search_intelligence',
        description: 'Full-text search across indicators and groups using TQL summary CONTAINS query; scope to a specific data type',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search term (IP, domain, hash, group name, etc.)' },
            data_type: { type: 'string', description: 'Limit scope: indicator, group (default: both)' },
            limit: { type: 'number', description: 'Maximum results (default: 50)' },
          },
          required: ['query'],
        },
      },
      // ── Playbooks ────────────────────────────────
      {
        name: 'list_playbooks',
        description: 'List automation playbooks with optional enabled/disabled filter',
        inputSchema: {
          type: 'object',
          properties: {
            enabled: { type: 'boolean', description: 'Filter by enabled status (true = enabled only, false = disabled only)' },
            limit: { type: 'number', description: 'Maximum results (default: 100)' },
            offset: { type: 'number', description: 'Pagination offset (default: 0)' },
          },
        },
      },
      {
        name: 'execute_playbook',
        description: 'Trigger execution of a ThreatConnect automation playbook by its ID',
        inputSchema: {
          type: 'object',
          properties: {
            playbook_id: { type: 'string', description: 'ThreatConnect playbook ID to execute' },
            context: { type: 'object', description: 'Optional JSON context object to pass to the playbook on execution' },
          },
          required: ['playbook_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_indicators':    return await this.listIndicators(args);
        case 'get_indicator':      return await this.getIndicator(args);
        case 'create_indicator':   return await this.createIndicator(args);
        case 'update_indicator':   return await this.updateIndicator(args);
        case 'delete_indicator':   return await this.deleteIndicator(args);
        case 'list_groups':        return await this.listGroups(args);
        case 'get_group':          return await this.getGroup(args);
        case 'create_group':       return await this.createGroup(args);
        case 'list_cases':         return await this.listCases(args);
        case 'get_case':           return await this.getCase(args);
        case 'create_case':        return await this.createCase(args);
        case 'update_case':        return await this.updateCase(args);
        case 'list_tasks':         return await this.listTasks(args);
        case 'get_task':           return await this.getTask(args);
        case 'create_task':        return await this.createTask(args);
        case 'list_victims':       return await this.listVictims(args);
        case 'get_victim':         return await this.getVictim(args);
        case 'list_tags':          return await this.listTags(args);
        case 'list_security_labels': return await this.listSecurityLabels(args);
        case 'search_intelligence':  return await this.searchIntelligence(args);
        case 'list_playbooks':     return await this.listPlaybooks(args);
        case 'execute_playbook':   return await this.executePlaybook(args);
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

  // ── Private tool methods ──────────────────────

  private async listIndicators(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.filter) params.set('tql', args.filter as string);
    if (args.fields) params.set('fields', args.fields as string);
    params.set('resultLimit', String((args.limit as number) ?? 100));
    params.set('resultStart', String((args.offset as number) ?? 0));
    const data = await this.req(`/indicators?${params}`);
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getIndicator(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.indicator_id as string;
    const params = new URLSearchParams();
    if (args.fields) params.set('fields', args.fields as string);
    const qs = params.toString() ? `?${params}` : '';
    const data = await this.req(`/indicators/${encodeURIComponent(id)}${qs}`);
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async createIndicator(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {
      type: args.type,
      summary: args.summary,
    };
    if (args.owner_name) body.ownerName = args.owner_name;
    if (args.rating !== undefined) body.rating = args.rating;
    if (args.confidence !== undefined) body.confidence = args.confidence;
    if (args.description) body.description = args.description;
    const data = await this.req('/indicators', 'POST', body);
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async updateIndicator(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.indicator_id as string;
    const body: Record<string, unknown> = {};
    if (args.rating !== undefined) body.rating = args.rating;
    if (args.confidence !== undefined) body.confidence = args.confidence;
    if (args.description) body.description = args.description;
    const data = await this.req(`/indicators/${encodeURIComponent(id)}`, 'PUT', body);
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async deleteIndicator(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.indicator_id as string;
    await this.req(`/indicators/${encodeURIComponent(id)}`, 'DELETE');
    return { content: [{ type: 'text', text: JSON.stringify({ deleted: true, id }) }], isError: false };
  }

  private async listGroups(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.filter) params.set('tql', args.filter as string);
    if (args.fields) params.set('fields', args.fields as string);
    params.set('resultLimit', String((args.limit as number) ?? 100));
    params.set('resultStart', String((args.offset as number) ?? 0));
    const data = await this.req(`/groups?${params}`);
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getGroup(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.group_id as string;
    const params = new URLSearchParams();
    if (args.fields) params.set('fields', args.fields as string);
    const qs = params.toString() ? `?${params}` : '';
    const data = await this.req(`/groups/${encodeURIComponent(id)}${qs}`);
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async createGroup(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = { type: args.type, name: args.name };
    if (args.owner_name) body.ownerName = args.owner_name;
    if (args.description) body.description = args.description;
    if (args.status) body.status = args.status;
    const data = await this.req('/groups', 'POST', body);
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listCases(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.filter) params.set('tql', args.filter as string);
    if (args.fields) params.set('fields', args.fields as string);
    params.set('resultLimit', String((args.limit as number) ?? 100));
    params.set('resultStart', String((args.offset as number) ?? 0));
    const data = await this.req(`/cases?${params}`);
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getCase(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.case_id as string;
    const params = new URLSearchParams();
    if (args.fields) params.set('fields', args.fields as string);
    const qs = params.toString() ? `?${params}` : '';
    const data = await this.req(`/cases/${encodeURIComponent(id)}${qs}`);
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async createCase(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {
      name: args.name,
      severity: args.severity ?? 'None',
      status: args.status ?? 'Open',
    };
    if (args.description) body.description = args.description;
    const data = await this.req('/cases', 'POST', body);
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async updateCase(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.case_id as string;
    const body: Record<string, unknown> = {};
    if (args.status) body.status = args.status;
    if (args.severity) body.severity = args.severity;
    if (args.description) body.description = args.description;
    const data = await this.req(`/cases/${encodeURIComponent(id)}`, 'PUT', body);
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listTasks(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.filter) params.set('tql', args.filter as string);
    params.set('resultLimit', String((args.limit as number) ?? 100));
    params.set('resultStart', String((args.offset as number) ?? 0));
    const data = await this.req(`/tasks?${params}`);
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getTask(args: Record<string, unknown>): Promise<ToolResult> {
    const data = await this.req(`/tasks/${encodeURIComponent(args.task_id as string)}`);
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async createTask(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = { name: args.name, status: args.status ?? 'Open' };
    if (args.case_id) body.caseId = args.case_id;
    if (args.description) body.description = args.description;
    if (args.due_date) body.dueDate = args.due_date;
    if (args.assigned_to) body.assignee = { type: 'User', data: { userName: args.assigned_to } };
    const data = await this.req('/tasks', 'POST', body);
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listVictims(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.filter) params.set('tql', args.filter as string);
    params.set('resultLimit', String((args.limit as number) ?? 100));
    params.set('resultStart', String((args.offset as number) ?? 0));
    const data = await this.req(`/victims?${params}`);
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getVictim(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.victim_id as string;
    const params = new URLSearchParams();
    if (args.fields) params.set('fields', args.fields as string);
    const qs = params.toString() ? `?${params}` : '';
    const data = await this.req(`/victims/${encodeURIComponent(id)}${qs}`);
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listTags(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.filter) params.set('tql', args.filter as string);
    params.set('resultLimit', String((args.limit as number) ?? 500));
    params.set('resultStart', String((args.offset as number) ?? 0));
    const data = await this.req(`/tags?${params}`);
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listSecurityLabels(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    params.set('resultLimit', String((args.limit as number) ?? 200));
    params.set('resultStart', String((args.offset as number) ?? 0));
    const data = await this.req(`/securityLabels?${params}`);
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async searchIntelligence(args: Record<string, unknown>): Promise<ToolResult> {
    const query = (args.query as string).replace(/"/g, '\\"');
    const tql = `summary CONTAINS "${query}"`;
    const limit = (args.limit as number) ?? 50;
    const dataType = (args.data_type as string) ?? '';
    const collection = dataType === 'group' ? '/groups' : '/indicators';
    const data = await this.req(`${collection}?tql=${encodeURIComponent(tql)}&resultLimit=${limit}`);
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listPlaybooks(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.enabled !== undefined) params.set('enabled', String(args.enabled));
    params.set('resultLimit', String((args.limit as number) ?? 100));
    params.set('resultStart', String((args.offset as number) ?? 0));
    const data = await this.req(`/playbooks?${params}`);
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async executePlaybook(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.playbook_id as string;
    const body = args.context ?? {};
    const data = await this.req(`/playbook/executions`, 'POST', { playbookId: id, context: body });
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }
}

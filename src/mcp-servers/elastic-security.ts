/**
 * Elastic Security MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/elastic/mcp-server-elasticsearch — official Elastic MCP server
//   (transport: stdio/SSE/streamable-HTTP, auth: API key or Basic). Last release: v0.4.6 Oct 2025.
//   Tools: list_indices, get_mappings, search, esql, get_shards (5 tools — Elasticsearch only,
//   no Security detection rules, alerts, cases, or exception list coverage).
//   Community: https://github.com/ggilligan12/kibana-mcp — Kibana SecOps community MCP
//   (not vendor-published; maintenance status unknown as of 2026-03-28).
//   No official Elastic Security MCP server from Elastic as of 2026-03-28.
// Our adapter: 16 tools covering Kibana Detection Engine, alerts, cases, and exception lists.
// Recommendation: use-rest-api — no official Security MCP server. The Elasticsearch MCP has
//   5 generic tools with zero Security API coverage. Our REST adapter is the authoritative source.
//
// Base URL: https://{kibana-host}:{port}  (self-hosted) or Elastic Cloud Kibana URL
// Auth: API key — "ApiKey {base64(id:api_key)}" or Basic — "Basic {base64(user:pass)}"
// Docs: https://www.elastic.co/docs/api/doc/kibana/group/endpoint-security-detections-api
//   https://www.elastic.co/docs/api/doc/kibana/group/endpoint-cases
// Rate limits: Not publicly documented; governed by cluster capacity
// Note: All mutating requests require kbn-xsrf: true header
// Note: Space-aware endpoints prefix paths with /s/{spaceId}; default space uses /api/... directly

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface ElasticSecurityConfig {
  kibanaUrl: string;
  apiKey?: string;
  username?: string;
  password?: string;
  /** Non-default Kibana space ID. Omit for the default space. */
  spaceId?: string;
}

export class ElasticSecurityMCPServer extends MCPAdapterBase {
  private readonly kibanaUrl: string;
  private readonly authHeader: string;
  private readonly pathPrefix: string;

  constructor(config: ElasticSecurityConfig) {
    super();
    this.kibanaUrl = config.kibanaUrl.replace(/\/$/, '');
    if (config.apiKey) {
      this.authHeader = `ApiKey ${config.apiKey}`;
    } else if (config.username && config.password) {
      this.authHeader = `Basic ${Buffer.from(`${config.username}:${config.password}`).toString('base64')}`;
    } else {
      throw new Error('ElasticSecurityMCPServer requires either apiKey or username+password');
    }
    this.pathPrefix = config.spaceId ? `/s/${config.spaceId}` : '';
  }

  static catalog() {
    return {
      name: 'elastic-security',
      displayName: 'Elastic Security',
      version: '1.0.0',
      category: 'cybersecurity' as const,
      keywords: [
        'elastic', 'security', 'kibana', 'siem', 'detection', 'rules', 'alerts',
        'signals', 'cases', 'exceptions', 'eql', 'kql', 'threat', 'malware',
        'endpoint', 'hunt', 'incident-response', 'soc',
      ],
      toolNames: [
        'find_detection_rules', 'get_detection_rule', 'create_detection_rule',
        'update_detection_rule', 'delete_detection_rule', 'enable_detection_rules',
        'disable_detection_rules', 'search_alerts', 'update_alert_status',
        'list_cases', 'get_case', 'create_case', 'update_case',
        'list_exception_lists', 'create_exception_list', 'create_exception_item',
      ],
      description: 'Elastic Security SIEM: manage detection rules, search and triage alerts, create and manage cases, and manage exception lists for false-positive suppression.',
      author: 'protectnil' as const,
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'find_detection_rules',
        description: 'List Elastic Security detection rules with optional KQL filter, pagination, and sort order',
        inputSchema: {
          type: 'object',
          properties: {
            page: {
              type: 'number',
              description: 'Page number (1-based, default: 1)',
            },
            per_page: {
              type: 'number',
              description: 'Results per page (default: 20, max: 10000)',
            },
            sort_field: {
              type: 'string',
              description: 'Field to sort by (e.g. created_at, name, updated_at, enabled)',
            },
            sort_order: {
              type: 'string',
              description: 'Sort direction: asc or desc (default: desc)',
            },
            filter: {
              type: 'string',
              description: 'KQL filter string (e.g. alert.attributes.name: phishing)',
            },
            tags: {
              type: 'array',
              description: 'Filter rules by tag array (e.g. ["T1059","lateral-movement"])',
            },
          },
        },
      },
      {
        name: 'get_detection_rule',
        description: 'Get a specific Elastic Security detection rule by its rule_id (human-readable) or saved object id (UUID)',
        inputSchema: {
          type: 'object',
          properties: {
            rule_id: {
              type: 'string',
              description: 'Human-readable rule_id set at creation (e.g. suspicious-powershell-execution)',
            },
            id: {
              type: 'string',
              description: 'Kibana saved object UUID (alternative to rule_id)',
            },
          },
        },
      },
      {
        name: 'create_detection_rule',
        description: 'Create a new Elastic Security detection rule of type query, eql, threshold, machine_learning, saved_query, or threat_match',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Human-readable rule name',
            },
            description: {
              type: 'string',
              description: 'Rule description explaining what it detects',
            },
            type: {
              type: 'string',
              description: 'Rule type: query, eql, threshold, machine_learning, saved_query, threat_match',
            },
            query: {
              type: 'string',
              description: 'KQL or EQL query string for the rule condition',
            },
            language: {
              type: 'string',
              description: 'Query language: kuery or eql (required for query and eql rule types)',
            },
            index: {
              type: 'array',
              description: 'Index patterns to search (e.g. ["logs-endpoint.events.*","logs-*"])',
            },
            severity: {
              type: 'string',
              description: 'Alert severity: low, medium, high, or critical',
            },
            risk_score: {
              type: 'number',
              description: 'Numeric risk score from 0 to 100',
            },
            enabled: {
              type: 'boolean',
              description: 'Enable the rule immediately after creation (default: true)',
            },
            tags: {
              type: 'array',
              description: 'Tags for categorizing the rule (e.g. ["T1059","defense-evasion"])',
            },
            interval: {
              type: 'string',
              description: 'Rule run interval (e.g. 5m, 1h). Default: 5m',
            },
            from: {
              type: 'string',
              description: 'Rule lookback window (e.g. now-6m). Default: now-6m',
            },
          },
          required: ['name', 'description', 'type', 'severity', 'risk_score'],
        },
      },
      {
        name: 'update_detection_rule',
        description: 'Update an existing Elastic Security detection rule fields including query, severity, enabled state, and tags',
        inputSchema: {
          type: 'object',
          properties: {
            rule_id: {
              type: 'string',
              description: 'Human-readable rule_id to update',
            },
            id: {
              type: 'string',
              description: 'Kibana saved object UUID (alternative to rule_id)',
            },
            name: { type: 'string', description: 'Updated rule name (optional)' },
            description: { type: 'string', description: 'Updated rule description (optional)' },
            severity: {
              type: 'string',
              description: 'Updated severity: low, medium, high, critical (optional)',
            },
            risk_score: {
              type: 'number',
              description: 'Updated risk score 0-100 (optional)',
            },
            enabled: {
              type: 'boolean',
              description: 'Enable or disable the rule (optional)',
            },
            query: { type: 'string', description: 'Updated KQL/EQL query (optional)' },
            tags: {
              type: 'array',
              description: 'Replacement tag array (replaces all existing tags)',
            },
          },
        },
      },
      {
        name: 'delete_detection_rule',
        description: 'Delete an Elastic Security detection rule by rule_id or saved object id',
        inputSchema: {
          type: 'object',
          properties: {
            rule_id: {
              type: 'string',
              description: 'Human-readable rule_id to delete',
            },
            id: {
              type: 'string',
              description: 'Kibana saved object UUID (alternative to rule_id)',
            },
          },
        },
      },
      {
        name: 'enable_detection_rules',
        description: 'Bulk-enable one or more Elastic Security detection rules by their rule IDs or saved object IDs',
        inputSchema: {
          type: 'object',
          properties: {
            ids: {
              type: 'array',
              description: 'Array of Kibana saved object UUIDs to enable',
            },
            rule_ids: {
              type: 'array',
              description: 'Array of human-readable rule_ids to enable (alternative to ids)',
            },
          },
        },
      },
      {
        name: 'disable_detection_rules',
        description: 'Bulk-disable one or more Elastic Security detection rules by their rule IDs or saved object IDs',
        inputSchema: {
          type: 'object',
          properties: {
            ids: {
              type: 'array',
              description: 'Array of Kibana saved object UUIDs to disable',
            },
            rule_ids: {
              type: 'array',
              description: 'Array of human-readable rule_ids to disable (alternative to ids)',
            },
          },
        },
      },
      {
        name: 'search_alerts',
        description: 'Search Elastic Security detection alerts using Elasticsearch Query DSL with optional pagination and sort',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'object',
              description: 'Elasticsearch query DSL (e.g. {"bool":{"filter":[{"term":{"kibana.alert.workflow_status":"open"}}]}})',
            },
            size: {
              type: 'number',
              description: 'Maximum alerts to return (default: 10, max: 10000)',
            },
            from: {
              type: 'number',
              description: 'Pagination offset (default: 0)',
            },
            sort: {
              type: 'array',
              description: 'Elasticsearch sort clauses (e.g. [{"@timestamp":{"order":"desc"}}])',
            },
            _source: {
              type: 'array',
              description: 'Fields to include in each alert (optional; returns all fields by default)',
            },
          },
        },
      },
      {
        name: 'update_alert_status',
        description: 'Update the workflow status of one or more Elastic Security detection alerts to open, closed, or acknowledged',
        inputSchema: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              description: 'New alert status: open, closed, or acknowledged',
            },
            signal_ids: {
              type: 'array',
              description: 'Array of alert/signal document IDs to update (use this or query)',
            },
            query: {
              type: 'object',
              description: 'Elasticsearch query DSL to select alerts by criteria (alternative to signal_ids)',
            },
          },
          required: ['status'],
        },
      },
      {
        name: 'list_cases',
        description: 'List Elastic Security cases with optional filter by status, owner, assignee, and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              description: 'Filter by case status: open, closed, or in-progress',
            },
            page: {
              type: 'number',
              description: 'Page number (1-based, default: 1)',
            },
            perPage: {
              type: 'number',
              description: 'Results per page (default: 20, max: 100)',
            },
            sortField: {
              type: 'string',
              description: 'Field to sort by (e.g. createdAt, updatedAt, closedAt)',
            },
            sortOrder: {
              type: 'string',
              description: 'Sort direction: asc or desc (default: desc)',
            },
            tags: {
              type: 'array',
              description: 'Filter cases by tags (e.g. ["phishing","malware"])',
            },
          },
        },
      },
      {
        name: 'get_case',
        description: 'Get full details for a single Elastic Security case by its case ID, including comments and alert attachments',
        inputSchema: {
          type: 'object',
          properties: {
            case_id: {
              type: 'string',
              description: 'The case UUID',
            },
            includeComments: {
              type: 'boolean',
              description: 'Include case comments in the response (default: true)',
            },
          },
          required: ['case_id'],
        },
      },
      {
        name: 'create_case',
        description: 'Create a new Elastic Security case for incident tracking with title, description, severity, and tags',
        inputSchema: {
          type: 'object',
          properties: {
            title: {
              type: 'string',
              description: 'Case title',
            },
            description: {
              type: 'string',
              description: 'Detailed case description',
            },
            severity: {
              type: 'string',
              description: 'Case severity: low, medium, high, or critical (default: low)',
            },
            tags: {
              type: 'array',
              description: 'Array of tag strings for categorization (e.g. ["phishing","T1566"])',
            },
            assignees: {
              type: 'array',
              description: 'Array of assignee objects with uid field (e.g. [{"uid":"user-profile-id"}])',
            },
          },
          required: ['title', 'description'],
        },
      },
      {
        name: 'update_case',
        description: 'Update an existing Elastic Security case status, title, severity, description, or tags',
        inputSchema: {
          type: 'object',
          properties: {
            case_id: {
              type: 'string',
              description: 'The case UUID to update',
            },
            version: {
              type: 'string',
              description: 'Current case version (required for optimistic concurrency control)',
            },
            status: {
              type: 'string',
              description: 'New case status: open, in-progress, or closed',
            },
            title: { type: 'string', description: 'Updated case title (optional)' },
            severity: {
              type: 'string',
              description: 'Updated severity: low, medium, high, critical (optional)',
            },
            description: { type: 'string', description: 'Updated description (optional)' },
            tags: { type: 'array', description: 'Replacement tags array (optional)' },
          },
          required: ['case_id', 'version'],
        },
      },
      {
        name: 'list_exception_lists',
        description: 'List Elastic Security exception lists used to suppress false-positive alerts from detection rules',
        inputSchema: {
          type: 'object',
          properties: {
            page: {
              type: 'number',
              description: 'Page number (1-based, default: 1)',
            },
            per_page: {
              type: 'number',
              description: 'Results per page (default: 20)',
            },
            filter: {
              type: 'string',
              description: 'KQL filter (e.g. exception-list.attributes.name: trusted-processes)',
            },
            namespace_type: {
              type: 'string',
              description: 'Namespace type: single (space-specific) or agnostic (global). Default: single',
            },
          },
        },
      },
      {
        name: 'create_exception_list',
        description: 'Create a new Elastic Security exception list container for grouping exception items',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Exception list name',
            },
            description: {
              type: 'string',
              description: 'Exception list description',
            },
            list_id: {
              type: 'string',
              description: 'Human-readable list ID (e.g. trusted-internal-hosts)',
            },
            type: {
              type: 'string',
              description: 'List type: detection (rule-specific exceptions) or endpoint (endpoint policy exceptions)',
            },
            namespace_type: {
              type: 'string',
              description: 'Namespace: single (space-specific) or agnostic (global). Default: single',
            },
            tags: {
              type: 'array',
              description: 'Tags for the exception list',
            },
          },
          required: ['name', 'description', 'list_id', 'type'],
        },
      },
      {
        name: 'create_exception_item',
        description: 'Create an exception item inside an existing exception list to prevent a specific pattern from triggering alerts',
        inputSchema: {
          type: 'object',
          properties: {
            list_id: {
              type: 'string',
              description: 'The exception list ID to add this item to',
            },
            name: {
              type: 'string',
              description: 'Exception item name',
            },
            description: {
              type: 'string',
              description: 'Explanation of why this exception is safe',
            },
            type: {
              type: 'string',
              description: 'Item type: simple (field-based) or endpoint (endpoint-specific)',
            },
            entries: {
              type: 'array',
              description: 'Array of entry objects defining the match conditions (e.g. [{"field":"process.name","type":"match","value":"svchost.exe","operator":"included"}])',
            },
            namespace_type: {
              type: 'string',
              description: 'Namespace: single or agnostic (must match parent list)',
            },
            tags: {
              type: 'array',
              description: 'Tags for this exception item',
            },
          },
          required: ['list_id', 'name', 'description', 'type', 'entries'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'find_detection_rules':
          return await this.findDetectionRules(args);
        case 'get_detection_rule':
          return await this.getDetectionRule(args);
        case 'create_detection_rule':
          return await this.createDetectionRule(args);
        case 'update_detection_rule':
          return await this.updateDetectionRule(args);
        case 'delete_detection_rule':
          return await this.deleteDetectionRule(args);
        case 'enable_detection_rules':
          return await this.bulkActionRules(args, 'enable');
        case 'disable_detection_rules':
          return await this.bulkActionRules(args, 'disable');
        case 'search_alerts':
          return await this.searchAlerts(args);
        case 'update_alert_status':
          return await this.updateAlertStatus(args);
        case 'list_cases':
          return await this.listCases(args);
        case 'get_case':
          return await this.getCase(args);
        case 'create_case':
          return await this.createCase(args);
        case 'update_case':
          return await this.updateCase(args);
        case 'list_exception_lists':
          return await this.listExceptionLists(args);
        case 'create_exception_list':
          return await this.createExceptionList(args);
        case 'create_exception_item':
          return await this.createExceptionItem(args);
        default:
          return {
            content: [{ type: 'text', text: `Unknown tool: ${name}` }],
            isError: true,
          };
      }
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Tool execution failed: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true,
      };
    }
  }

  private getHeaders(mutating = false): Record<string, string> {
    const h: Record<string, string> = {
      Authorization: this.authHeader,
      'Content-Type': 'application/json',
    };
    if (mutating) h['kbn-xsrf'] = 'true';
    return h;
  }


  private prefix(path: string): string {
    return `${this.kibanaUrl}${this.pathPrefix}${path}`;
  }

  private async kfetch(url: string, init?: RequestInit): Promise<ToolResult> {
    const response = await this.fetchWithRetry(url, init ?? {});
    if (!response.ok) {
      let errBody = '';
      try { errBody = await response.text(); } catch { /* ignore */ }
      return {
        content: [{ type: 'text', text: `Kibana API error ${response.status} ${response.statusText}${errBody ? ': ' + errBody.slice(0, 500) : ''}` }],
        isError: true,
      };
    }
    if (response.status === 204) {
      return { content: [{ type: 'text', text: JSON.stringify({ success: true }) }], isError: false };
    }
    let data: unknown;
    try { data = await response.json(); } catch {
      throw new Error(`Kibana returned non-JSON response (HTTP ${response.status})`);
    }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async findDetectionRules(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    params.set('page', String((args.page as number) ?? 1));
    params.set('per_page', String((args.per_page as number) ?? 20));
    if (args.sort_field) params.set('sort_field', String(args.sort_field));
    if (args.sort_order) params.set('sort_order', String(args.sort_order));
    if (args.filter) params.set('filter', String(args.filter));
    if (args.tags) params.set('tags', (args.tags as string[]).join(','));
    return this.kfetch(
      this.prefix(`/api/detection_engine/rules/_find?${params}`),
      { headers: this.getHeaders() },
    );
  }

  private async getDetectionRule(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.rule_id && !args.id) {
      return { content: [{ type: 'text', text: 'Either rule_id or id is required' }], isError: true };
    }
    const params = new URLSearchParams();
    if (args.rule_id) params.set('rule_id', String(args.rule_id));
    else params.set('id', String(args.id));
    return this.kfetch(
      this.prefix(`/api/detection_engine/rules?${params}`),
      { headers: this.getHeaders() },
    );
  }

  private async createDetectionRule(args: Record<string, unknown>): Promise<ToolResult> {
    const required = ['name', 'description', 'type', 'severity', 'risk_score'];
    for (const f of required) {
      if (args[f] === undefined) {
        return { content: [{ type: 'text', text: `${f} is required` }], isError: true };
      }
    }
    const body: Record<string, unknown> = {
      name: args.name,
      description: args.description,
      type: args.type,
      severity: args.severity,
      risk_score: args.risk_score,
      enabled: args.enabled !== undefined ? args.enabled : true,
    };
    if (args.query) body.query = args.query;
    if (args.language) body.language = args.language;
    if (args.index) body.index = args.index;
    if (args.tags) body.tags = args.tags;
    if (args.interval) body.interval = args.interval;
    if (args.from) body.from = args.from;
    return this.kfetch(
      this.prefix('/api/detection_engine/rules'),
      { method: 'POST', headers: this.getHeaders(true), body: JSON.stringify(body) },
    );
  }

  private async updateDetectionRule(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.rule_id && !args.id) {
      return { content: [{ type: 'text', text: 'Either rule_id or id is required' }], isError: true };
    }
    const body: Record<string, unknown> = {};
    if (args.rule_id) body.rule_id = args.rule_id;
    if (args.id) body.id = args.id;
    const updatable = ['name', 'description', 'severity', 'risk_score', 'enabled', 'query', 'tags', 'language', 'index', 'interval', 'from'];
    for (const f of updatable) {
      if (args[f] !== undefined) body[f] = args[f];
    }
    return this.kfetch(
      this.prefix('/api/detection_engine/rules'),
      { method: 'PATCH', headers: this.getHeaders(true), body: JSON.stringify(body) },
    );
  }

  private async deleteDetectionRule(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.rule_id && !args.id) {
      return { content: [{ type: 'text', text: 'Either rule_id or id is required' }], isError: true };
    }
    const params = new URLSearchParams();
    if (args.rule_id) params.set('rule_id', String(args.rule_id));
    else params.set('id', String(args.id));
    return this.kfetch(
      this.prefix(`/api/detection_engine/rules?${params}`),
      { method: 'DELETE', headers: this.getHeaders(true) },
    );
  }

  private async bulkActionRules(args: Record<string, unknown>, action: 'enable' | 'disable'): Promise<ToolResult> {
    const body: Record<string, unknown> = { action };
    if (args.ids) body.ids = args.ids;
    if (args.rule_ids) {
      body.query = '';
      body.rule_ids = args.rule_ids;
    }
    return this.kfetch(
      this.prefix('/api/detection_engine/rules/_bulk_action'),
      { method: 'POST', headers: this.getHeaders(true), body: JSON.stringify(body) },
    );
  }

  private async searchAlerts(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {};
    if (args.query) body.query = args.query;
    if (args.size !== undefined) body.size = args.size;
    if (args.from !== undefined) body.from = args.from;
    if (args.sort) body.sort = args.sort;
    if (args._source) body._source = args._source;
    return this.kfetch(
      this.prefix('/api/detection_engine/signals/search'),
      { method: 'POST', headers: this.getHeaders(true), body: JSON.stringify(body) },
    );
  }

  private async updateAlertStatus(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.status) {
      return { content: [{ type: 'text', text: 'status is required' }], isError: true };
    }
    if (!args.signal_ids && !args.query) {
      return { content: [{ type: 'text', text: 'Either signal_ids or query is required to select alerts' }], isError: true };
    }
    const body: Record<string, unknown> = { status: args.status };
    if (args.signal_ids) body.signal_ids = args.signal_ids;
    if (args.query) body.query = args.query;
    return this.kfetch(
      this.prefix('/api/detection_engine/signals/status'),
      { method: 'POST', headers: this.getHeaders(true), body: JSON.stringify(body) },
    );
  }

  private async listCases(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.status) params.set('status', String(args.status));
    if (args.page) params.set('page', String(args.page));
    if (args.perPage) params.set('perPage', String(args.perPage));
    if (args.sortField) params.set('sortField', String(args.sortField));
    if (args.sortOrder) params.set('sortOrder', String(args.sortOrder));
    if (args.tags) params.set('tags', (args.tags as string[]).join(','));
    return this.kfetch(
      this.prefix(`/api/cases?${params}`),
      { headers: this.getHeaders() },
    );
  }

  private async getCase(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.case_id) {
      return { content: [{ type: 'text', text: 'case_id is required' }], isError: true };
    }
    const params = new URLSearchParams();
    if (args.includeComments !== false) params.set('includeComments', 'true');
    return this.kfetch(
      this.prefix(`/api/cases/${encodeURIComponent(String(args.case_id))}?${params}`),
      { headers: this.getHeaders() },
    );
  }

  private async createCase(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.title || !args.description) {
      return { content: [{ type: 'text', text: 'title and description are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      title: args.title,
      description: args.description,
      severity: (args.severity as string) ?? 'low',
      tags: (args.tags as string[]) ?? [],
      connector: { id: 'none', name: 'none', type: '.none', fields: null },
      settings: { syncAlerts: false },
    };
    if (args.assignees) body.assignees = args.assignees;
    return this.kfetch(
      this.prefix('/api/cases'),
      { method: 'POST', headers: this.getHeaders(true), body: JSON.stringify(body) },
    );
  }

  private async updateCase(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.case_id || !args.version) {
      return { content: [{ type: 'text', text: 'case_id and version are required' }], isError: true };
    }
    const updatePayload: Record<string, unknown> = {
      id: args.case_id,
      version: args.version,
    };
    const updatable = ['status', 'title', 'severity', 'description', 'tags'];
    for (const f of updatable) {
      if (args[f] !== undefined) updatePayload[f] = args[f];
    }
    return this.kfetch(
      this.prefix('/api/cases'),
      { method: 'PATCH', headers: this.getHeaders(true), body: JSON.stringify({ cases: [updatePayload] }) },
    );
  }

  private async listExceptionLists(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.page) params.set('page', String(args.page));
    if (args.per_page) params.set('per_page', String(args.per_page));
    if (args.filter) params.set('filter', String(args.filter));
    if (args.namespace_type) params.set('namespace_type', String(args.namespace_type));
    return this.kfetch(
      this.prefix(`/api/exception_lists/_find?${params}`),
      { headers: this.getHeaders() },
    );
  }

  private async createExceptionList(args: Record<string, unknown>): Promise<ToolResult> {
    const required = ['name', 'description', 'list_id', 'type'];
    for (const f of required) {
      if (!args[f]) return { content: [{ type: 'text', text: `${f} is required` }], isError: true };
    }
    const body: Record<string, unknown> = {
      name: args.name,
      description: args.description,
      list_id: args.list_id,
      type: args.type,
      namespace_type: (args.namespace_type as string) ?? 'single',
    };
    if (args.tags) body.tags = args.tags;
    return this.kfetch(
      this.prefix('/api/exception_lists'),
      { method: 'POST', headers: this.getHeaders(true), body: JSON.stringify(body) },
    );
  }

  private async createExceptionItem(args: Record<string, unknown>): Promise<ToolResult> {
    const required = ['list_id', 'name', 'description', 'type', 'entries'];
    for (const f of required) {
      if (!args[f]) return { content: [{ type: 'text', text: `${f} is required` }], isError: true };
    }
    const body: Record<string, unknown> = {
      list_id: args.list_id,
      name: args.name,
      description: args.description,
      type: args.type,
      entries: args.entries,
      namespace_type: (args.namespace_type as string) ?? 'single',
    };
    if (args.tags) body.tags = args.tags;
    return this.kfetch(
      this.prefix('/api/exception_lists/items'),
      { method: 'POST', headers: this.getHeaders(true), body: JSON.stringify(body) },
    );
  }
}

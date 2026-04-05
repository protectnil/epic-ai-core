/**
 * Datadog Security MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/datadog-labs/mcp-server — transport: streamable-HTTP, auth: DD-API-KEY + DD-APPLICATION-KEY
// Vendor MCP is Datadog's hosted managed server (datadog-labs org). Actively maintained (last commit Mar 2026).
// Vendor MCP exposes a 'security' toolset with tools: search_datadog_security_signals, security_findings_schema,
// analyze_security_findings. Our adapter covers 14 tools targeting the Security Monitoring REST API surface.
// Integration: use-both — MCP provides 3 hosted search/schema tools; REST adapter covers full CRUD
// (detection rules, suppression rules, triage, findings, vulnerabilities, monitors) not in hosted MCP.
// MCP-sourced tools (3): search_datadog_security_signals, security_findings_schema, analyze_security_findings
// REST-sourced tools (14): list_security_signals, get_signal, triage_signal, list_detection_rules,
//   get_detection_rule, create_detection_rule, update_detection_rule, delete_detection_rule,
//   list_suppression_rules, create_suppression_rule, delete_suppression_rule,
//   get_cloud_security_findings, list_vulnerabilities, list_monitors
// Combined coverage: 17 tools (MCP: 3 + REST: 14 — shared: 0)
//
// Base URL: https://api.{site}  (site examples: datadoghq.com, datadoghq.eu, us3.datadoghq.com)
// Auth: DD-API-KEY + DD-APPLICATION-KEY headers
// Docs: https://docs.datadoghq.com/api/latest/security-monitoring/
// Rate limits: Not publicly documented; use pagination to avoid large single-page responses

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface DatadogSecurityConfig {
  apiKey: string;
  applicationKey: string;
  /** Datadog site (default: datadoghq.com). Examples: datadoghq.eu, us3.datadoghq.com, us5.datadoghq.com */
  site?: string;
}

export class DatadogSecurityMCPServer extends MCPAdapterBase {
  private readonly baseUrl: string;
  private readonly headers: Record<string, string>;

  constructor(config: DatadogSecurityConfig) {
    super();
    this.baseUrl = `https://api.${config.site ?? 'datadoghq.com'}`;
    this.headers = {
      'DD-API-KEY': config.apiKey,
      'DD-APPLICATION-KEY': config.applicationKey,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
  }

  static catalog() {
    return {
      name: 'datadog-security',
      displayName: 'Datadog Security',
      version: '1.0.0',
      category: 'cybersecurity',
      keywords: [
        'datadog', 'security', 'siem', 'signal', 'detection rule', 'cspm', 'misconfiguration',
        'cloud security', 'posture', 'finding', 'suppression', 'vulnerability', 'threat',
        'waf', 'appsec', 'monitor',
      ],
      toolNames: [
        'list_security_signals', 'get_signal', 'triage_signal',
        'list_detection_rules', 'get_detection_rule', 'create_detection_rule', 'update_detection_rule', 'delete_detection_rule',
        'list_suppression_rules', 'create_suppression_rule', 'delete_suppression_rule',
        'get_cloud_security_findings',
        'list_vulnerabilities',
        'list_monitors',
      ],
      description: 'Datadog Security: query signals, manage detection rules, suppression rules, CSPM findings, and vulnerabilities.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_security_signals',
        description: 'List security signals from Datadog SIEM with filters for query, time range, sort, and pagination cursor',
        inputSchema: {
          type: 'object',
          properties: {
            filter_query: {
              type: 'string',
              description: 'Search query filter for signals (e.g. "status:high @source:aws")',
            },
            filter_from: {
              type: 'number',
              description: 'Start of time window in Unix milliseconds (default: 24 hours ago)',
            },
            filter_to: {
              type: 'number',
              description: 'End of time window in Unix milliseconds (default: now)',
            },
            page_limit: {
              type: 'number',
              description: 'Number of signals per page (default: 50, max: 1000)',
            },
            page_cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
            sort: {
              type: 'string',
              description: 'Sort order: "timestamp" (ascending) or "-timestamp" (descending, default)',
            },
          },
        },
      },
      {
        name: 'get_signal',
        description: 'Get the full details, attributes, and context for a specific security signal by signal ID',
        inputSchema: {
          type: 'object',
          properties: {
            signal_id: {
              type: 'string',
              description: 'Security signal ID string',
            },
          },
          required: ['signal_id'],
        },
      },
      {
        name: 'triage_signal',
        description: 'Update the triage state of a security signal to archived, under_review, or open for workflow management',
        inputSchema: {
          type: 'object',
          properties: {
            signal_id: {
              type: 'string',
              description: 'Security signal ID to triage',
            },
            state: {
              type: 'string',
              description: 'New triage state: open, under_review, archived',
            },
            archive_reason: {
              type: 'string',
              description: 'Reason for archiving (required when state is "archived"): none, false_positive, testing_or_maintenance, investigated_case_opened, other',
            },
          },
          required: ['signal_id', 'state'],
        },
      },
      {
        name: 'list_detection_rules',
        description: 'List all security detection rules with optional filters for rule type and enabled state',
        inputSchema: {
          type: 'object',
          properties: {
            page_size: {
              type: 'number',
              description: 'Number of rules per page (default: 25, max: 100)',
            },
            page_number: {
              type: 'number',
              description: 'Page number for pagination (default: 0)',
            },
            is_enabled: {
              type: 'boolean',
              description: 'Filter by enabled state: true=only enabled, false=only disabled',
            },
            type: {
              type: 'string',
              description: 'Filter by rule type: log_detection, workload_security, application_security, signal_correlation',
            },
          },
        },
      },
      {
        name: 'get_detection_rule',
        description: 'Get the full configuration and query logic for a specific detection rule by its rule ID',
        inputSchema: {
          type: 'object',
          properties: {
            rule_id: {
              type: 'string',
              description: 'Detection rule ID string',
            },
          },
          required: ['rule_id'],
        },
      },
      {
        name: 'create_detection_rule',
        description: 'Create a new custom security detection rule with queries, conditions, and alert grouping',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Human-readable rule name',
            },
            type: {
              type: 'string',
              description: 'Rule type: log_detection, workload_security, application_security, signal_correlation',
            },
            message: {
              type: 'string',
              description: 'Notification message body for alerts generated by this rule',
            },
            queries: {
              type: 'array',
              description: 'Array of query objects (each with "query" and "name" fields at minimum)',
              items: { type: 'object' },
            },
            is_enabled: {
              type: 'boolean',
              description: 'Whether to enable the rule immediately (default: true)',
            },
            tags: {
              type: 'array',
              description: 'Tags to attach to the rule (e.g. ["team:security", "env:prod"])',
              items: { type: 'string' },
            },
          },
          required: ['name', 'type', 'queries'],
        },
      },
      {
        name: 'update_detection_rule',
        description: 'Update an existing detection rule to change its name, queries, enabled state, or tags',
        inputSchema: {
          type: 'object',
          properties: {
            rule_id: {
              type: 'string',
              description: 'Detection rule ID to update',
            },
            is_enabled: {
              type: 'boolean',
              description: 'Enable or disable the rule',
            },
            name: {
              type: 'string',
              description: 'Updated rule name',
            },
            message: {
              type: 'string',
              description: 'Updated notification message',
            },
            tags: {
              type: 'array',
              description: 'Replacement tag list for the rule',
              items: { type: 'string' },
            },
          },
          required: ['rule_id'],
        },
      },
      {
        name: 'delete_detection_rule',
        description: 'Permanently delete a custom detection rule by rule ID (default rules cannot be deleted)',
        inputSchema: {
          type: 'object',
          properties: {
            rule_id: {
              type: 'string',
              description: 'Detection rule ID to delete',
            },
          },
          required: ['rule_id'],
        },
      },
      {
        name: 'list_suppression_rules',
        description: 'List all signal suppression rules that reduce noise from expected or benign activity',
        inputSchema: {
          type: 'object',
          properties: {
            page_size: {
              type: 'number',
              description: 'Number of suppression rules per page (default: 25)',
            },
            page_number: {
              type: 'number',
              description: 'Page number for pagination (default: 0)',
            },
          },
        },
      },
      {
        name: 'create_suppression_rule',
        description: 'Create a suppression rule to silence signals matching a query, reducing noise from known-good activity',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Human-readable suppression rule name',
            },
            suppression_query: {
              type: 'string',
              description: 'Signal query that this rule will suppress (e.g. "@source:github @actor:deploy-bot")',
            },
            rule_query: {
              type: 'string',
              description: 'Optional filter to limit suppression to specific detection rules',
            },
            expiration_date: {
              type: 'string',
              description: 'ISO 8601 date when the suppression expires (e.g. "2026-06-01T00:00:00Z"). Omit for permanent.',
            },
            description: {
              type: 'string',
              description: 'Description explaining why this suppression rule exists',
            },
            is_enabled: {
              type: 'boolean',
              description: 'Whether to enable the suppression rule immediately (default: true)',
            },
          },
          required: ['name', 'suppression_query'],
        },
      },
      {
        name: 'delete_suppression_rule',
        description: 'Permanently delete a signal suppression rule by its suppression rule ID',
        inputSchema: {
          type: 'object',
          properties: {
            suppression_id: {
              type: 'string',
              description: 'Suppression rule ID to delete',
            },
          },
          required: ['suppression_id'],
        },
      },
      {
        name: 'get_cloud_security_findings',
        description: 'Retrieve CSPM findings for misconfigurations, identity risks, and attack paths with status and resource filters',
        inputSchema: {
          type: 'object',
          properties: {
            filter_tags: {
              type: 'string',
              description: 'Filter findings by tag (e.g. "cloud_provider:aws")',
            },
            filter_status: {
              type: 'string',
              description: 'Filter by severity: critical, high, medium, low, info',
            },
            filter_evaluation: {
              type: 'string',
              description: 'Filter by evaluation result: pass or fail',
            },
            filter_resource_type: {
              type: 'string',
              description: 'Filter by resource type (e.g. "aws_s3_bucket")',
            },
            filter_vulnerability_type: {
              type: 'string',
              description: 'Filter by type: misconfiguration, attack_path, identity_risk, api_security',
            },
            page_limit: {
              type: 'number',
              description: 'Maximum findings to return (default: 100, max: 1000)',
            },
            page_cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
          },
        },
      },
      {
        name: 'list_vulnerabilities',
        description: 'List application and infrastructure vulnerabilities detected by Datadog with severity and remediation status',
        inputSchema: {
          type: 'object',
          properties: {
            filter_cvss_severity: {
              type: 'string',
              description: 'Filter by CVSS severity: critical, high, medium, low, none, unknown',
            },
            filter_status: {
              type: 'string',
              description: 'Filter by remediation status: open, in_progress, auto_remediated, not_affected, ignored',
            },
            filter_type: {
              type: 'string',
              description: 'Filter by vulnerability type: code, library, container_image, host',
            },
            page_size: {
              type: 'number',
              description: 'Number of vulnerabilities per page (default: 25)',
            },
            page_number: {
              type: 'number',
              description: 'Page number for pagination (default: 0)',
            },
          },
        },
      },
      {
        name: 'list_monitors',
        description: 'List Datadog monitors filtered by security-relevant tags or name, with pagination support',
        inputSchema: {
          type: 'object',
          properties: {
            monitor_tags: {
              type: 'string',
              description: 'Comma-separated monitor tags to filter by (e.g. "team:security,env:prod")',
            },
            name: {
              type: 'string',
              description: 'Filter monitors whose name contains this string (case-insensitive)',
            },
            page: {
              type: 'number',
              description: 'Page index for pagination (0-indexed, default: 0)',
            },
            page_size: {
              type: 'number',
              description: 'Number of monitors per page (default: 100)',
            },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_security_signals':
          return await this.listSecuritySignals(args);
        case 'get_signal':
          return await this.getSignal(args);
        case 'triage_signal':
          return await this.triageSignal(args);
        case 'list_detection_rules':
          return await this.listDetectionRules(args);
        case 'get_detection_rule':
          return await this.getDetectionRule(args);
        case 'create_detection_rule':
          return await this.createDetectionRule(args);
        case 'update_detection_rule':
          return await this.updateDetectionRule(args);
        case 'delete_detection_rule':
          return await this.deleteDetectionRule(args);
        case 'list_suppression_rules':
          return await this.listSuppressionRules(args);
        case 'create_suppression_rule':
          return await this.createSuppressionRule(args);
        case 'delete_suppression_rule':
          return await this.deleteSuppressionRule(args);
        case 'get_cloud_security_findings':
          return await this.getCloudSecurityFindings(args);
        case 'list_vulnerabilities':
          return await this.listVulnerabilities(args);
        case 'list_monitors':
          return await this.listMonitors(args);
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

  // ── Response helper ───────────────────────────────────────────────────────────


  private async jsonOrError(res: Response, context: string): Promise<unknown> {
    if (!res.ok) throw new Error(`Datadog API error (${context}): ${res.status} ${res.statusText}`);
    try {
      return await res.json();
    } catch {
      throw new Error(`Datadog returned non-JSON response for ${context} (HTTP ${res.status})`);
    }
  }

  // ── Tool implementations ──────────────────────────────────────────────────────

  private async listSecuritySignals(args: Record<string, unknown>): Promise<ToolResult> {
    const now = Date.now();
    const params = new URLSearchParams();
    if (args.filter_query) params.set('filter[query]', args.filter_query as string);
    params.set('filter[from]', String((args.filter_from as number) ?? now - 86_400_000));
    params.set('filter[to]', String((args.filter_to as number) ?? now));
    params.set('page[limit]', String((args.page_limit as number) ?? 50));
    if (args.page_cursor) params.set('page[cursor]', args.page_cursor as string);
    params.set('sort', (args.sort as string) ?? '-timestamp');

    const res = await this.fetchWithRetry(
      `${this.baseUrl}/api/v2/security_monitoring/signals?${params}`,
      { headers: this.headers },
    );
    return { content: [{ type: 'text', text: this.truncate(await this.jsonOrError(res, 'list_security_signals')) }], isError: false };
  }

  private async getSignal(args: Record<string, unknown>): Promise<ToolResult> {
    const signal_id = args.signal_id as string;
    if (!signal_id) throw new Error('signal_id is required');
    const res = await this.fetchWithRetry(
      `${this.baseUrl}/api/v2/security_monitoring/signals/${encodeURIComponent(signal_id)}`,
      { headers: this.headers },
    );
    return { content: [{ type: 'text', text: this.truncate(await this.jsonOrError(res, 'get_signal')) }], isError: false };
  }

  private async triageSignal(args: Record<string, unknown>): Promise<ToolResult> {
    const signal_id = args.signal_id as string;
    const state = args.state as string;
    if (!signal_id) throw new Error('signal_id is required');
    if (!state) throw new Error('state is required');

    const attributes: Record<string, unknown> = { state };
    if (args.archive_reason) attributes.archive_reason = args.archive_reason;

    const res = await this.fetchWithRetry(
      `${this.baseUrl}/api/v2/security_monitoring/signals/${encodeURIComponent(signal_id)}/state`,
      {
        method: 'PATCH',
        headers: this.headers,
        body: JSON.stringify({ data: { attributes, type: 'signal_triage_state' } }),
      },
    );
    return { content: [{ type: 'text', text: this.truncate(await this.jsonOrError(res, 'triage_signal')) }], isError: false };
  }

  private async listDetectionRules(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    params.set('page[size]', String((args.page_size as number) ?? 25));
    params.set('page[number]', String((args.page_number as number) ?? 0));
    if (args.is_enabled !== undefined) params.set('filter[is_enabled]', String(args.is_enabled));
    if (args.type) params.set('filter[type]', args.type as string);

    const res = await this.fetchWithRetry(
      `${this.baseUrl}/api/v2/security_monitoring/rules?${params}`,
      { headers: this.headers },
    );
    return { content: [{ type: 'text', text: this.truncate(await this.jsonOrError(res, 'list_detection_rules')) }], isError: false };
  }

  private async getDetectionRule(args: Record<string, unknown>): Promise<ToolResult> {
    const rule_id = args.rule_id as string;
    if (!rule_id) throw new Error('rule_id is required');
    const res = await this.fetchWithRetry(
      `${this.baseUrl}/api/v2/security_monitoring/rules/${encodeURIComponent(rule_id)}`,
      { headers: this.headers },
    );
    return { content: [{ type: 'text', text: this.truncate(await this.jsonOrError(res, 'get_detection_rule')) }], isError: false };
  }

  private async createDetectionRule(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name) throw new Error('name is required');
    if (!args.type) throw new Error('type is required');
    if (!args.queries) throw new Error('queries is required');

    const body: Record<string, unknown> = {
      name: args.name,
      type: args.type,
      queries: args.queries,
      isEnabled: (args.is_enabled as boolean) ?? true,
    };
    if (args.message) body.message = args.message;
    if (args.tags) body.tags = args.tags;

    const res = await this.fetchWithRetry(`${this.baseUrl}/api/v2/security_monitoring/rules`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    return { content: [{ type: 'text', text: this.truncate(await this.jsonOrError(res, 'create_detection_rule')) }], isError: false };
  }

  private async updateDetectionRule(args: Record<string, unknown>): Promise<ToolResult> {
    const rule_id = args.rule_id as string;
    if (!rule_id) throw new Error('rule_id is required');

    const body: Record<string, unknown> = {};
    if (args.is_enabled !== undefined) body.isEnabled = args.is_enabled;
    if (args.name) body.name = args.name;
    if (args.message) body.message = args.message;
    if (args.tags) body.tags = args.tags;

    const res = await this.fetchWithRetry(
      `${this.baseUrl}/api/v2/security_monitoring/rules/${encodeURIComponent(rule_id)}`,
      {
        method: 'PUT',
        headers: this.headers,
        body: JSON.stringify(body),
      },
    );
    return { content: [{ type: 'text', text: this.truncate(await this.jsonOrError(res, 'update_detection_rule')) }], isError: false };
  }

  private async deleteDetectionRule(args: Record<string, unknown>): Promise<ToolResult> {
    const rule_id = args.rule_id as string;
    if (!rule_id) throw new Error('rule_id is required');
    const res = await this.fetchWithRetry(
      `${this.baseUrl}/api/v2/security_monitoring/rules/${encodeURIComponent(rule_id)}`,
      { method: 'DELETE', headers: this.headers },
    );
    if (!res.ok) throw new Error(`Datadog API error (delete_detection_rule): ${res.status} ${res.statusText}`);
    return { content: [{ type: 'text', text: JSON.stringify({ deleted: true, rule_id }) }], isError: false };
  }

  private async listSuppressionRules(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    params.set('page[size]', String((args.page_size as number) ?? 25));
    params.set('page[number]', String((args.page_number as number) ?? 0));
    const res = await this.fetchWithRetry(
      `${this.baseUrl}/api/v2/security_monitoring/configuration/suppressions?${params}`,
      { headers: this.headers },
    );
    return { content: [{ type: 'text', text: this.truncate(await this.jsonOrError(res, 'list_suppression_rules')) }], isError: false };
  }

  private async createSuppressionRule(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name) throw new Error('name is required');
    if (!args.suppression_query) throw new Error('suppression_query is required');

    const attributes: Record<string, unknown> = {
      name: args.name,
      suppression_query: args.suppression_query,
      is_enabled: (args.is_enabled as boolean) ?? true,
    };
    if (args.rule_query) attributes.rule_query = args.rule_query;
    if (args.expiration_date) attributes.expiration_date = args.expiration_date;
    if (args.description) attributes.description = args.description;

    const res = await this.fetchWithRetry(
      `${this.baseUrl}/api/v2/security_monitoring/configuration/suppressions`,
      {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({ data: { attributes, type: 'suppressions' } }),
      },
    );
    return { content: [{ type: 'text', text: this.truncate(await this.jsonOrError(res, 'create_suppression_rule')) }], isError: false };
  }

  private async deleteSuppressionRule(args: Record<string, unknown>): Promise<ToolResult> {
    const suppression_id = args.suppression_id as string;
    if (!suppression_id) throw new Error('suppression_id is required');
    const res = await this.fetchWithRetry(
      `${this.baseUrl}/api/v2/security_monitoring/configuration/suppressions/${encodeURIComponent(suppression_id)}`,
      { method: 'DELETE', headers: this.headers },
    );
    if (!res.ok) throw new Error(`Datadog API error (delete_suppression_rule): ${res.status} ${res.statusText}`);
    return { content: [{ type: 'text', text: JSON.stringify({ deleted: true, suppression_id }) }], isError: false };
  }

  private async getCloudSecurityFindings(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.filter_tags) params.set('filter[tags]', args.filter_tags as string);
    if (args.filter_status) params.set('filter[status]', args.filter_status as string);
    if (args.filter_evaluation) params.set('filter[evaluation]', args.filter_evaluation as string);
    if (args.filter_resource_type) params.set('filter[resource_type]', args.filter_resource_type as string);
    if (args.filter_vulnerability_type) params.set('filter[vulnerability_type]', args.filter_vulnerability_type as string);
    params.set('page[limit]', String((args.page_limit as number) ?? 100));
    if (args.page_cursor) params.set('page[cursor]', args.page_cursor as string);

    const res = await this.fetchWithRetry(
      `${this.baseUrl}/api/v2/security_monitoring/findings?${params}`,
      { headers: this.headers },
    );
    return { content: [{ type: 'text', text: this.truncate(await this.jsonOrError(res, 'get_cloud_security_findings')) }], isError: false };
  }

  private async listVulnerabilities(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.filter_cvss_severity) params.set('filter[cvss_severity]', args.filter_cvss_severity as string);
    if (args.filter_status) params.set('filter[status]', args.filter_status as string);
    if (args.filter_type) params.set('filter[type]', args.filter_type as string);
    params.set('page[size]', String((args.page_size as number) ?? 25));
    params.set('page[number]', String((args.page_number as number) ?? 0));

    const res = await this.fetchWithRetry(
      `${this.baseUrl}/api/v2/security/vulnerabilities?${params}`,
      { headers: this.headers },
    );
    return { content: [{ type: 'text', text: this.truncate(await this.jsonOrError(res, 'list_vulnerabilities')) }], isError: false };
  }

  private async listMonitors(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.monitor_tags) params.set('monitor_tags', args.monitor_tags as string);
    if (args.name) params.set('name', args.name as string);
    params.set('page', String((args.page as number) ?? 0));
    params.set('page_size', String((args.page_size as number) ?? 100));

    const res = await this.fetchWithRetry(`${this.baseUrl}/api/v1/monitor?${params}`, { headers: this.headers });
    return { content: [{ type: 'text', text: this.truncate(await this.jsonOrError(res, 'list_monitors')) }], isError: false };
  }
}

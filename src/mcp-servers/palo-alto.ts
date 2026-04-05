/**
 * Palo Alto Networks Cortex XDR MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// Palo Alto Networks announced a "Cortex MCP Server" (open beta, Dec 2025) for XSIAM/XDR/Cloud
// operations but no confirmed public GitHub URL or npm package was found as of 2026-03-28.
// The blog post (paloaltonetworks.com/blog/security-operations/introducing-the-cortex-mcp-server/)
// describes prebuilt tools for querying issues, cases, assets, endpoints, and compliance results,
// but the server is not yet publicly distributed. Re-evaluate once a public repo or package ships.
//
// Base URL: https://{fqdn}.xdr.{region}.paloaltonetworks.com — customer-specific, no default
// Auth: Standard API key — Authorization: {api_key}, x-xdr-auth-id: {api_key_id}
//       Advanced API key — HMAC-SHA256 signed nonce (not implemented here; use standard key)
// Docs: https://docs-cortex.paloaltonetworks.com/r/Cortex-XDR-REST-API
// Rate limits: Not publicly documented; Cortex XDR enforces per-tenant limits

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';
import type { AdapterCatalogEntry } from '../federation/AdapterCatalog.js';

interface PaloAltoConfig {
  apiKey: string;
  apiKeyId: string;
  baseUrl: string;  // Required — customer FQDN; no universal default
}

export class PaloAltoMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly apiKeyId: string;
  private readonly baseUrl: string;

  constructor(config: PaloAltoConfig) {
    super();
    this.apiKey = config.apiKey;
    this.apiKeyId = config.apiKeyId;
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
  }

  static catalog(): AdapterCatalogEntry {
    return {
      name: 'palo-alto',
      displayName: 'Palo Alto Networks Cortex XDR',
      version: '1.0.0',
      category: 'cybersecurity',
      keywords: [
        'palo-alto', 'paloalto', 'cortex', 'xdr', 'edr', 'endpoint',
        'incident', 'alert', 'isolate', 'quarantine', 'ioc', 'indicator',
        'script', 'threat', 'detection', 'response', 'soc', 'ngfw',
      ],
      toolNames: [
        'get_incidents', 'get_incident_extra_data', 'update_incident',
        'get_alerts',
        'get_endpoints', 'isolate_endpoint', 'unisolate_endpoint',
        'scan_endpoint', 'get_endpoint_violations',
        'get_iocs', 'insert_iocs',
        'run_script', 'get_script_execution_status', 'get_script_execution_results',
        'get_all_endpoints',
      ],
      description: 'Cortex XDR endpoint detection and response: manage incidents, alerts, endpoints, IOCs, and run scripts for investigation and remediation.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'get_incidents',
        description: 'Get Cortex XDR incidents with optional filters by ID, creation time, or modification time. Returns full incident objects.',
        inputSchema: {
          type: 'object',
          properties: {
            incident_id_list: {
              type: 'array',
              description: 'Array of incident IDs to retrieve (optional — omit for all)',
            },
            lte_creation_time: {
              type: 'number',
              description: 'Filter incidents created at or before this Unix timestamp (ms)',
            },
            gte_creation_time: {
              type: 'number',
              description: 'Filter incidents created at or after this Unix timestamp (ms)',
            },
            lte_modification_time: {
              type: 'number',
              description: 'Filter incidents modified at or before this Unix timestamp (ms)',
            },
            gte_modification_time: {
              type: 'number',
              description: 'Filter incidents modified at or after this Unix timestamp (ms)',
            },
            status: {
              type: 'string',
              description: 'Filter by status: new, under_investigation, resolved_threat_handled, resolved_known_issue, resolved_duplicate, resolved_false_positive, resolved_other',
            },
            search_from: {
              type: 'number',
              description: 'Pagination start offset (default: 0)',
            },
            search_to: {
              type: 'number',
              description: 'Pagination end offset (default: 100)',
            },
          },
        },
      },
      {
        name: 'get_incident_extra_data',
        description: 'Get extra data for a specific Cortex XDR incident including all associated alerts, file artifacts, and network artifacts.',
        inputSchema: {
          type: 'object',
          properties: {
            incident_id: {
              type: 'string',
              description: 'Cortex XDR incident ID',
            },
            alerts_limit: {
              type: 'number',
              description: 'Maximum number of associated alerts to return (default: 1000)',
            },
          },
          required: ['incident_id'],
        },
      },
      {
        name: 'update_incident',
        description: 'Update a Cortex XDR incident status, severity, assigned user, or add a comment.',
        inputSchema: {
          type: 'object',
          properties: {
            incident_id: {
              type: 'string',
              description: 'Cortex XDR incident ID to update',
            },
            status: {
              type: 'string',
              description: 'New status: new, under_investigation, resolved_threat_handled, resolved_known_issue, resolved_duplicate, resolved_false_positive, resolved_other',
            },
            assigned_user_mail: {
              type: 'string',
              description: 'Email of the user to assign the incident to',
            },
            assigned_user_pretty_name: {
              type: 'string',
              description: 'Display name of the assigned user',
            },
            severity: {
              type: 'string',
              description: 'New severity: low, medium, high, critical',
            },
            resolve_comment: {
              type: 'string',
              description: 'Comment to add when resolving (required for resolved_* statuses)',
            },
          },
          required: ['incident_id'],
        },
      },
      {
        name: 'get_alerts',
        description: 'Get Cortex XDR alerts with optional filters by ID, severity, or creation time.',
        inputSchema: {
          type: 'object',
          properties: {
            alert_id_list: {
              type: 'array',
              description: 'Array of alert IDs to retrieve',
            },
            severity: {
              type: 'array',
              description: 'Filter by severity array: low, medium, high, critical, informational',
            },
            source: {
              type: 'array',
              description: 'Filter by alert source (e.g. XDR Agent, Cortex XDR Analytics)',
            },
            alert_source: {
              type: 'string',
              description: 'Filter by alert source name',
            },
            search_from: {
              type: 'number',
              description: 'Pagination start offset (default: 0)',
            },
            search_to: {
              type: 'number',
              description: 'Pagination end offset (default: 100)',
            },
          },
        },
      },
      {
        name: 'get_endpoints',
        description: 'Get Cortex XDR endpoints with optional filters by endpoint ID, hostname, IP address, or platform.',
        inputSchema: {
          type: 'object',
          properties: {
            endpoint_id_list: {
              type: 'array',
              description: 'Array of endpoint IDs to retrieve',
            },
            hostname: {
              type: 'array',
              description: 'Filter endpoints by hostname array',
            },
            ip_list: {
              type: 'array',
              description: 'Filter endpoints by IP address array',
            },
            platform: {
              type: 'string',
              description: 'Filter by OS platform: windows, linux, macos',
            },
            alias: {
              type: 'array',
              description: 'Filter by endpoint alias name array',
            },
            isolate: {
              type: 'string',
              description: 'Filter by isolation status: isolated, unisolated',
            },
            search_from: {
              type: 'number',
              description: 'Pagination start offset (default: 0)',
            },
            search_to: {
              type: 'number',
              description: 'Pagination end offset (default: 100)',
            },
          },
        },
      },
      {
        name: 'get_all_endpoints',
        description: 'Get all Cortex XDR endpoints without filters. Returns summary list of all registered endpoints.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'isolate_endpoint',
        description: 'Isolate one or more Cortex XDR endpoints from the network. Optionally link to an incident. Max 1000 endpoints per request.',
        inputSchema: {
          type: 'object',
          properties: {
            endpoint_id_list: {
              type: 'array',
              description: 'Array of endpoint IDs to isolate (max 1000)',
            },
            incident_id: {
              type: 'string',
              description: 'Optional incident ID to link this isolation action to',
            },
          },
          required: ['endpoint_id_list'],
        },
      },
      {
        name: 'unisolate_endpoint',
        description: 'Reverse the network isolation of one or more Cortex XDR endpoints. Optionally link to an incident.',
        inputSchema: {
          type: 'object',
          properties: {
            endpoint_id_list: {
              type: 'array',
              description: 'Array of endpoint IDs to unisolate',
            },
            incident_id: {
              type: 'string',
              description: 'Optional incident ID to link this unisolation action to',
            },
          },
          required: ['endpoint_id_list'],
        },
      },
      {
        name: 'scan_endpoint',
        description: 'Initiate a malware scan on one or more Cortex XDR endpoints.',
        inputSchema: {
          type: 'object',
          properties: {
            endpoint_id_list: {
              type: 'array',
              description: 'Array of endpoint IDs to scan',
            },
            incident_id: {
              type: 'string',
              description: 'Optional incident ID to associate the scan with',
            },
          },
          required: ['endpoint_id_list'],
        },
      },
      {
        name: 'get_endpoint_violations',
        description: 'Get policy violation events from Cortex XDR endpoints with optional filters.',
        inputSchema: {
          type: 'object',
          properties: {
            endpoint_id_list: {
              type: 'array',
              description: 'Filter violations by endpoint ID array',
            },
            type: {
              type: 'array',
              description: 'Filter by violation type array: DLP, Firewall, Device_Control, Disk_Encryption',
            },
            timestamp_gte: {
              type: 'number',
              description: 'Return violations at or after this Unix timestamp (ms)',
            },
            timestamp_lte: {
              type: 'number',
              description: 'Return violations at or before this Unix timestamp (ms)',
            },
            search_from: {
              type: 'number',
              description: 'Pagination start offset (default: 0)',
            },
            search_to: {
              type: 'number',
              description: 'Pagination end offset (default: 100)',
            },
          },
        },
      },
      {
        name: 'get_iocs',
        description: 'Retrieve Cortex XDR IOCs (indicators of compromise) with optional filters by type, value, or severity.',
        inputSchema: {
          type: 'object',
          properties: {
            indicator_type_list: {
              type: 'array',
              description: 'Filter by IOC type array: HASH, IP, DOMAIN_NAME, FILENAME, REGISTRY',
            },
            indicator_value_list: {
              type: 'array',
              description: 'Filter by specific IOC values (hashes, IPs, domains)',
            },
            severity: {
              type: 'array',
              description: 'Filter by severity: INFORMATIONAL, LOW, MEDIUM, HIGH, CRITICAL',
            },
            search_from: {
              type: 'number',
              description: 'Pagination start offset (default: 0)',
            },
            search_to: {
              type: 'number',
              description: 'Pagination end offset (default: 100)',
            },
          },
        },
      },
      {
        name: 'insert_iocs',
        description: 'Insert new IOCs (indicators of compromise) into Cortex XDR for blocking and detection.',
        inputSchema: {
          type: 'object',
          properties: {
            indicators: {
              type: 'array',
              description: 'Array of IOC objects. Each must have: indicator, type (HASH/IP/DOMAIN_NAME), severity, and optionally vendors, expiration_date, comment',
            },
          },
          required: ['indicators'],
        },
      },
      {
        name: 'run_script',
        description: 'Run a Cortex XDR script on one or more endpoints for investigation or remediation.',
        inputSchema: {
          type: 'object',
          properties: {
            script_uid: {
              type: 'string',
              description: 'UID of the script to run (from the Script Library)',
            },
            endpoint_ids: {
              type: 'array',
              description: 'Array of endpoint IDs to run the script on',
            },
            timeout: {
              type: 'number',
              description: 'Script execution timeout in seconds (default: 600)',
            },
            parameters_values: {
              type: 'object',
              description: 'Key-value object of script parameters',
            },
            incident_id: {
              type: 'string',
              description: 'Optional incident ID to associate the script run with',
            },
          },
          required: ['script_uid', 'endpoint_ids'],
        },
      },
      {
        name: 'get_script_execution_status',
        description: 'Get the status of a script execution job across all targeted endpoints.',
        inputSchema: {
          type: 'object',
          properties: {
            action_id: {
              type: 'string',
              description: 'Action ID returned by run_script',
            },
          },
          required: ['action_id'],
        },
      },
      {
        name: 'get_script_execution_results',
        description: 'Get the output results of a completed script execution from Cortex XDR endpoints.',
        inputSchema: {
          type: 'object',
          properties: {
            action_id: {
              type: 'string',
              description: 'Action ID returned by run_script',
            },
          },
          required: ['action_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'get_incidents':
          return await this.getIncidents(args);
        case 'get_incident_extra_data':
          return await this.getIncidentExtraData(args);
        case 'update_incident':
          return await this.updateIncident(args);
        case 'get_alerts':
          return await this.getAlerts(args);
        case 'get_endpoints':
          return await this.getEndpoints(args);
        case 'get_all_endpoints':
          return await this.getAllEndpoints();
        case 'isolate_endpoint':
          return await this.isolateEndpoint(args);
        case 'unisolate_endpoint':
          return await this.unisolateEndpoint(args);
        case 'scan_endpoint':
          return await this.scanEndpoint(args);
        case 'get_endpoint_violations':
          return await this.getEndpointViolations(args);
        case 'get_iocs':
          return await this.getIocs(args);
        case 'insert_iocs':
          return await this.insertIocs(args);
        case 'run_script':
          return await this.runScript(args);
        case 'get_script_execution_status':
          return await this.getScriptExecutionStatus(args);
        case 'get_script_execution_results':
          return await this.getScriptExecutionResults(args);
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

  // ─── Private helpers ──────────────────────────────────────────────────────

  private get reqHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: this.apiKey,
      'x-xdr-auth-id': this.apiKeyId,
    };
  }

  private async postJson(path: string, requestData: Record<string, unknown>): Promise<ToolResult> {
    const url = `${this.baseUrl}/public_api/v1/${path}`;
    const response = await this.fetchWithRetry(url, {
      method: 'POST',
      headers: this.reqHeaders,
      body: JSON.stringify({ request_data: requestData }),
    });
    if (!response.ok) {
      let errBody = '';
      try { errBody = await response.text(); } catch { /* ignore */ }
      return {
        content: [{ type: 'text', text: `Cortex XDR API error: ${response.status} ${response.statusText}${errBody ? ' — ' + errBody : ''}` }],
        isError: true,
      };
    }
    const data = await response.json();
    const text = JSON.stringify(data, null, 2);
    const truncated = text.length > 10_000
      ? text.slice(0, 10_000) + `\n... [truncated, ${text.length} total chars]`
      : text;
    return { content: [{ type: 'text', text: truncated }], isError: false };
  }

  private buildFilters(
    args: Record<string, unknown>,
    fieldMap: Record<string, { field: string; operator: string }>,
  ): Record<string, unknown>[] {
    const filters: Record<string, unknown>[] = [];
    for (const [argKey, { field, operator }] of Object.entries(fieldMap)) {
      const val = args[argKey];
      if (val === undefined || val === null) continue;
      if (Array.isArray(val) && val.length === 0) continue;
      filters.push({ field, operator, value: val });
    }
    return filters;
  }

  // ─── Tool implementations ─────────────────────────────────────────────────

  private async getIncidents(args: Record<string, unknown>): Promise<ToolResult> {
    const filters = this.buildFilters(args, {
      incident_id_list: { field: 'incident_id_list', operator: 'in' },
      status: { field: 'status', operator: 'eq' },
    });
    if (args.lte_creation_time) {
      filters.push({ field: 'creation_time', operator: 'lte', value: args.lte_creation_time });
    }
    if (args.gte_creation_time) {
      filters.push({ field: 'creation_time', operator: 'gte', value: args.gte_creation_time });
    }
    if (args.lte_modification_time) {
      filters.push({ field: 'modification_time', operator: 'lte', value: args.lte_modification_time });
    }
    if (args.gte_modification_time) {
      filters.push({ field: 'modification_time', operator: 'gte', value: args.gte_modification_time });
    }
    return this.postJson('incidents/get_incidents/', {
      filters,
      search_from: (args.search_from as number) ?? 0,
      search_to: (args.search_to as number) ?? 100,
    });
  }

  private async getIncidentExtraData(args: Record<string, unknown>): Promise<ToolResult> {
    return this.postJson('incidents/get_incident_extra_data/', {
      incident_id: args.incident_id,
      alerts_limit: (args.alerts_limit as number) ?? 1000,
    });
  }

  private async updateIncident(args: Record<string, unknown>): Promise<ToolResult> {
    const updateData: Record<string, unknown> = {};
    if (args.status) updateData.status = args.status;
    if (args.assigned_user_mail) updateData.assigned_user_mail = args.assigned_user_mail;
    if (args.assigned_user_pretty_name) updateData.assigned_user_pretty_name = args.assigned_user_pretty_name;
    if (args.severity) updateData.severity = args.severity;
    if (args.resolve_comment) updateData.resolve_comment = args.resolve_comment;
    return this.postJson('incidents/update_incident/', {
      incident_id: args.incident_id,
      update_data: updateData,
    });
  }

  private async getAlerts(args: Record<string, unknown>): Promise<ToolResult> {
    const filters = this.buildFilters(args, {
      alert_id_list: { field: 'alert_id_list', operator: 'in' },
      severity: { field: 'severity', operator: 'in' },
      source: { field: 'source', operator: 'in' },
    });
    if (args.alert_source) {
      filters.push({ field: 'alert_source', operator: 'eq', value: args.alert_source });
    }
    return this.postJson('alerts/get_alerts/', {
      filters,
      search_from: (args.search_from as number) ?? 0,
      search_to: (args.search_to as number) ?? 100,
    });
  }

  private async getEndpoints(args: Record<string, unknown>): Promise<ToolResult> {
    const filters = this.buildFilters(args, {
      endpoint_id_list: { field: 'endpoint_id_list', operator: 'in' },
      hostname: { field: 'hostname', operator: 'in' },
      ip_list: { field: 'ip_list', operator: 'in' },
      alias: { field: 'alias', operator: 'in' },
    });
    if (args.platform) filters.push({ field: 'platform', operator: 'eq', value: args.platform });
    if (args.isolate) filters.push({ field: 'isolate', operator: 'eq', value: args.isolate });
    return this.postJson('endpoints/get_endpoint/', {
      filters,
      search_from: (args.search_from as number) ?? 0,
      search_to: (args.search_to as number) ?? 100,
    });
  }

  private async getAllEndpoints(): Promise<ToolResult> {
    return this.postJson('endpoints/get_endpoint/', {});
  }

  private async isolateEndpoint(args: Record<string, unknown>): Promise<ToolResult> {
    const requestData: Record<string, unknown> = {
      filters: [{ field: 'endpoint_id_list', operator: 'in', value: args.endpoint_id_list }],
    };
    if (args.incident_id) requestData.incident_id = args.incident_id;
    return this.postJson('endpoints/isolate/', requestData);
  }

  private async unisolateEndpoint(args: Record<string, unknown>): Promise<ToolResult> {
    const requestData: Record<string, unknown> = {
      filters: [{ field: 'endpoint_id_list', operator: 'in', value: args.endpoint_id_list }],
    };
    if (args.incident_id) requestData.incident_id = args.incident_id;
    return this.postJson('endpoints/unisolate/', requestData);
  }

  private async scanEndpoint(args: Record<string, unknown>): Promise<ToolResult> {
    const requestData: Record<string, unknown> = {
      filters: [{ field: 'endpoint_id_list', operator: 'in', value: args.endpoint_id_list }],
    };
    if (args.incident_id) requestData.incident_id = args.incident_id;
    return this.postJson('endpoints/scan/', requestData);
  }

  private async getEndpointViolations(args: Record<string, unknown>): Promise<ToolResult> {
    const filters = this.buildFilters(args, {
      endpoint_id_list: { field: 'endpoint_id_list', operator: 'in' },
      type: { field: 'type', operator: 'in' },
    });
    if (args.timestamp_gte) filters.push({ field: 'timestamp', operator: 'gte', value: args.timestamp_gte });
    if (args.timestamp_lte) filters.push({ field: 'timestamp', operator: 'lte', value: args.timestamp_lte });
    return this.postJson('device_control/get_violations/', {
      filters,
      search_from: (args.search_from as number) ?? 0,
      search_to: (args.search_to as number) ?? 100,
    });
  }

  private async getIocs(args: Record<string, unknown>): Promise<ToolResult> {
    const filters = this.buildFilters(args, {
      indicator_type_list: { field: 'indicator_type', operator: 'in' },
      indicator_value_list: { field: 'indicator_value', operator: 'in' },
      severity: { field: 'severity', operator: 'in' },
    });
    return this.postJson('indicators/get_iocs/', {
      filters,
      search_from: (args.search_from as number) ?? 0,
      search_to: (args.search_to as number) ?? 100,
    });
  }

  private async insertIocs(args: Record<string, unknown>): Promise<ToolResult> {
    return this.postJson('indicators/insert_jsons/', {
      json_objects: args.indicators,
    });
  }

  private async runScript(args: Record<string, unknown>): Promise<ToolResult> {
    const requestData: Record<string, unknown> = {
      script_uid: args.script_uid,
      filters: [{ field: 'endpoint_id_list', operator: 'in', value: args.endpoint_ids }],
      timeout: (args.timeout as number) ?? 600,
    };
    if (args.parameters_values) requestData.parameters_values = args.parameters_values;
    if (args.incident_id) requestData.incident_id = args.incident_id;
    return this.postJson('scripts/run_script/', requestData);
  }

  private async getScriptExecutionStatus(args: Record<string, unknown>): Promise<ToolResult> {
    return this.postJson('scripts/get_script_execution_status/', {
      action_id: args.action_id,
    });
  }

  private async getScriptExecutionResults(args: Record<string, unknown>): Promise<ToolResult> {
    return this.postJson('scripts/get_script_execution_results/', {
      action_id: args.action_id,
    });
  }
}

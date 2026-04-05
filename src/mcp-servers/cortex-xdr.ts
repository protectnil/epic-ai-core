/**
 * Palo Alto Cortex XDR MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://docs-cortex.paloaltonetworks.com/r/Cortex-XSIAM/Cortex-XSIAM-3.x-Documentation/Install-the-Cortex-MCP-server
//   Palo Alto Networks published an official Cortex MCP server (open beta, Dec 2025). It covers
//   Cortex XSIAM, XDR, and Cloud — issues, cases, assets, endpoints, compliance, tenant metadata.
//   Transport: stdio (local install). Auth: Cortex API token. Tool count: not fully enumerable
//   without authenticated access; blog lists issues/cases/assets/endpoints/compliance as prebuilt tools.
//   Recommendation: use-rest-api — the official Cortex MCP targets XSIAM broadly and requires
//   tenant authentication to enumerate tools; tool count unverifiable as <10 confirmed prebuilt tools
//   for XDR-specific operations. Our REST adapter covers 23 verified XDR-specific operations.
//   Re-evaluate use-both if Palo Alto publishes a full XDR tool manifest.
//
// Base URL: https://api-{fqdn}/public_api/v1
//   The FQDN is tenant-specific, assigned when the API key is created in the Cortex XDR console.
//   Example: api-example.xdr.us.paloaltonetworks.com
// Auth: Two modes selected at key-generation time:
//   Standard: Authorization = {raw API key} (no hashing)
//             Headers: x-xdr-auth-id, Authorization
//   Advanced: nonce = 64-char alphanumeric random string, Authorization = SHA256(apiKey + nonce + timestampMs)
//             Headers: x-xdr-auth-id, x-xdr-timestamp, x-xdr-nonce, Authorization
// Docs: https://cortex-panw.stoplight.io/docs/cortex-xdr/3u3j0e7hcx8t1-get-started-with-cortex-xdr-ap-is
// Rate limits: Not officially published; recommended 10 req/s per API key

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';
import { createHash, randomBytes } from 'node:crypto';

interface CortexXDRConfig {
  apiKey: string;
  apiKeyId: string;
  fqdn: string;
  advancedAuth?: boolean;
}

export class CortexXDRMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly apiKeyId: string;
  private readonly baseUrl: string;
  private readonly advancedAuth: boolean;

  constructor(config: CortexXDRConfig) {
    super();
    this.apiKey = config.apiKey;
    this.apiKeyId = config.apiKeyId;
    const fqdn = config.fqdn.replace(/^https?:\/\//, '').replace(/\/$/, '');
    this.baseUrl = `https://${fqdn}/public_api/v1`;
    this.advancedAuth = config.advancedAuth ?? true;
  }

  static catalog() {
    return {
      name: 'cortex-xdr',
      displayName: 'Palo Alto Cortex XDR',
      version: '1.0.0',
      category: 'cybersecurity' as const,
      keywords: [
        'cortex', 'xdr', 'palo alto', 'paloaltonetworks', 'xdr', 'edr', 'endpoint',
        'incident', 'alert', 'detection', 'threat', 'isolate', 'quarantine', 'xql',
        'script', 'response', 'audit', 'indicator', 'blocklist', 'file', 'scan',
      ],
      toolNames: [
        'get_incidents', 'get_incident_extra_data', 'update_incident',
        'get_alerts', 'update_alert',
        'get_endpoints', 'isolate_endpoint', 'unisolate_endpoint', 'scan_endpoint',
        'get_all_endpoints', 'delete_endpoints',
        'run_xql_query', 'get_xql_results',
        'list_scripts', 'run_script', 'get_script_execution_status', 'get_script_execution_results',
        'get_audit_management_logs', 'get_audit_agent_reports',
        'insert_simple_indicators', 'get_indicators',
        'quarantine_files', 'get_quarantine_status',
      ],
      description: 'Palo Alto Cortex XDR endpoint detection and response: manage incidents, alerts, endpoints, run XQL queries, execute scripts, retrieve audit logs, manage indicators, and perform file quarantine.',
      author: 'protectnil' as const,
    };
  }

  private buildHeaders(): Record<string, string> {
    const timestamp = String(Date.now());

    if (this.advancedAuth) {
      // Advanced: Authorization = SHA256(apiKey + nonce + timestampMs)
      // nonce is a 64-char alphanumeric random string per Cortex XDR docs
      const nonce = randomBytes(32).toString('hex'); // 64 hex chars
      const authValue = createHash('sha256')
        .update(this.apiKey + nonce + timestamp)
        .digest('hex');
      return {
        'x-xdr-auth-id': this.apiKeyId,
        'x-xdr-timestamp': timestamp,
        'x-xdr-nonce': nonce,
        Authorization: authValue,
        'Content-Type': 'application/json',
      };
    } else {
      // Standard: Authorization = raw API key (no hashing)
      return {
        'x-xdr-auth-id': this.apiKeyId,
        Authorization: this.apiKey,
        'Content-Type': 'application/json',
      };
    }
  }

  private async post(path: string, body: unknown): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.buildHeaders(),
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `API error ${response.status}: ${response.statusText}` }],
        isError: true,
      };
    }
    let data: unknown;
    try { data = await response.json(); } catch {
      throw new Error(`Cortex XDR returned non-JSON response (HTTP ${response.status})`);
    }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'get_incidents',
        description: 'List Cortex XDR incidents with optional FQL filters, pagination, and sort order',
        inputSchema: {
          type: 'object',
          properties: {
            filters: {
              type: 'array',
              description: 'Filter objects with field, operator, value (e.g. [{"field":"status","operator":"eq","value":"new"}])',
            },
            search_from: { type: 'number', description: 'Pagination offset (default: 0)' },
            search_to: { type: 'number', description: 'Pagination upper bound (default: 100)' },
            sort: {
              type: 'object',
              description: 'Sort with field and keyword: asc or desc (e.g. {"field":"creation_time","keyword":"desc"})',
            },
          },
        },
      },
      {
        name: 'get_incident_extra_data',
        description: 'Get full incident details including related alerts, key artifacts, and network activity for a specific incident ID',
        inputSchema: {
          type: 'object',
          properties: {
            incident_id: { type: 'string', description: 'Cortex XDR incident ID' },
            alerts_limit: { type: 'number', description: 'Max related alerts to include (default: 1000)' },
          },
          required: ['incident_id'],
        },
      },
      {
        name: 'update_incident',
        description: 'Update incident status, assigned user, severity, or add a resolve comment for a given incident ID',
        inputSchema: {
          type: 'object',
          properties: {
            incident_id: { type: 'string', description: 'Cortex XDR incident ID to update' },
            assigned_user_mail: { type: 'string', description: 'Email of user to assign the incident to' },
            status: {
              type: 'string',
              description: 'New status: new, under_investigation, resolved_threat_handled, resolved_known_issue, resolved_duplicate, resolved_false_positive, resolved_auto',
            },
            severity: { type: 'string', description: 'New severity: low, medium, high, critical' },
            resolve_comment: { type: 'string', description: 'Comment to include when resolving the incident' },
          },
          required: ['incident_id'],
        },
      },
      {
        name: 'get_alerts',
        description: 'List Cortex XDR alerts with optional filters for severity, source, type, and date range',
        inputSchema: {
          type: 'object',
          properties: {
            filters: {
              type: 'array',
              description: 'Filter objects (e.g. [{"field":"severity","operator":"eq","value":"high"}])',
            },
            search_from: { type: 'number', description: 'Pagination offset (default: 0)' },
            search_to: { type: 'number', description: 'Pagination upper bound (default: 100)' },
            sort: {
              type: 'object',
              description: 'Sort object (e.g. {"field":"source_insert_ts","keyword":"desc"})',
            },
          },
        },
      },
      {
        name: 'update_alert',
        description: 'Update the status or assigned user on one or more Cortex XDR alerts by alert ID list',
        inputSchema: {
          type: 'object',
          properties: {
            alert_id_list: {
              type: 'array',
              description: 'List of alert IDs to update',
            },
            assigned_user_mail: { type: 'string', description: 'Email of user to assign alerts to' },
            status: {
              type: 'string',
              description: 'New status: new, under_investigation, resolved_threat_handled, resolved_known_issue, resolved_duplicate, resolved_false_positive, resolved_auto',
            },
          },
          required: ['alert_id_list'],
        },
      },
      {
        name: 'get_endpoints',
        description: 'List Cortex XDR endpoints with optional filters for status, platform, hostname, or IP',
        inputSchema: {
          type: 'object',
          properties: {
            filters: {
              type: 'array',
              description: 'Filter objects (e.g. [{"field":"endpoint_status","operator":"eq","value":"connected"}])',
            },
            search_from: { type: 'number', description: 'Pagination offset (default: 0)' },
            search_to: { type: 'number', description: 'Pagination upper bound (default: 100)' },
            sort: {
              type: 'object',
              description: 'Sort object (e.g. {"field":"last_seen","keyword":"desc"})',
            },
          },
        },
      },
      {
        name: 'get_all_endpoints',
        description: 'Retrieve all endpoints registered in Cortex XDR without pagination filters',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'delete_endpoints',
        description: 'Delete one or more endpoints from Cortex XDR by endpoint ID list',
        inputSchema: {
          type: 'object',
          properties: {
            endpoint_id_list: {
              type: 'array',
              description: 'List of endpoint IDs to delete from Cortex XDR',
            },
          },
          required: ['endpoint_id_list'],
        },
      },
      {
        name: 'isolate_endpoint',
        description: 'Isolate one or more endpoints from the network to contain a threat — requires RBAC isolation permission',
        inputSchema: {
          type: 'object',
          properties: {
            endpoint_id_list: {
              type: 'array',
              description: 'List of endpoint IDs to isolate from the network',
            },
          },
          required: ['endpoint_id_list'],
        },
      },
      {
        name: 'unisolate_endpoint',
        description: 'Remove network isolation from one or more endpoints to restore normal connectivity',
        inputSchema: {
          type: 'object',
          properties: {
            endpoint_id_list: {
              type: 'array',
              description: 'List of endpoint IDs to unisolate',
            },
          },
          required: ['endpoint_id_list'],
        },
      },
      {
        name: 'scan_endpoint',
        description: 'Trigger an antivirus scan on one or more endpoints to detect malware or threats',
        inputSchema: {
          type: 'object',
          properties: {
            endpoint_id_list: {
              type: 'array',
              description: 'List of endpoint IDs to scan',
            },
          },
          required: ['endpoint_id_list'],
        },
      },
      {
        name: 'run_xql_query',
        description: 'Start an XQL query against Cortex XDR data sources and return a query execution handle',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'XQL query string to execute (e.g. "dataset=xdr_data | filter event_type = PROCESS | limit 100")',
            },
            timeframe: {
              type: 'object',
              description: 'Timeframe object with from and to epoch ms fields (e.g. {"from":1700000000000,"to":1700086400000})',
            },
            limit: { type: 'number', description: 'Max rows to return (default: 100, max: 1000)' },
          },
          required: ['query'],
        },
      },
      {
        name: 'get_xql_results',
        description: 'Retrieve results for a previously started XQL query using its execution ID handle',
        inputSchema: {
          type: 'object',
          properties: {
            query_id: { type: 'string', description: 'XQL query execution ID returned by run_xql_query' },
            format: {
              type: 'string',
              description: 'Result format: json or text (default: json)',
            },
          },
          required: ['query_id'],
        },
      },
      {
        name: 'list_scripts',
        description: 'List available scripts in the Cortex XDR scripts library with metadata and supported platforms',
        inputSchema: {
          type: 'object',
          properties: {
            filters: {
              type: 'array',
              description: 'Filter objects to narrow scripts (e.g. [{"field":"platform","operator":"eq","value":"windows"}])',
            },
          },
        },
      },
      {
        name: 'run_script',
        description: 'Execute a Cortex XDR script on one or more endpoints by script UID and endpoint IDs',
        inputSchema: {
          type: 'object',
          properties: {
            script_uid: { type: 'string', description: 'Unique identifier of the script to run' },
            endpoint_id_list: {
              type: 'array',
              description: 'List of endpoint IDs to run the script on',
            },
            parameters_values: {
              type: 'object',
              description: 'Key-value pairs of script parameter names and values',
            },
            timeout: { type: 'number', description: 'Script execution timeout in seconds (default: 600)' },
          },
          required: ['script_uid', 'endpoint_id_list'],
        },
      },
      {
        name: 'get_script_execution_status',
        description: 'Check the execution status of a previously initiated script run by action ID',
        inputSchema: {
          type: 'object',
          properties: {
            action_id: { type: 'string', description: 'Script action ID returned by run_script' },
          },
          required: ['action_id'],
        },
      },
      {
        name: 'get_script_execution_results',
        description: 'Retrieve the output and results of a completed script execution by action ID',
        inputSchema: {
          type: 'object',
          properties: {
            action_id: { type: 'string', description: 'Script action ID returned by run_script' },
          },
          required: ['action_id'],
        },
      },
      {
        name: 'get_audit_management_logs',
        description: 'Retrieve audit management logs for admin activity in the Cortex XDR console with optional date filters',
        inputSchema: {
          type: 'object',
          properties: {
            search_from: { type: 'number', description: 'Pagination offset (default: 0)' },
            search_to: { type: 'number', description: 'Pagination upper bound (default: 100)' },
            timestamp_gte: { type: 'number', description: 'Filter logs at or after this epoch millisecond timestamp' },
            timestamp_lte: { type: 'number', description: 'Filter logs at or before this epoch millisecond timestamp' },
          },
        },
      },
      {
        name: 'get_audit_agent_reports',
        description: 'Retrieve audit agent reports showing Cortex XDR agent status changes, upgrades, and policy updates',
        inputSchema: {
          type: 'object',
          properties: {
            search_from: { type: 'number', description: 'Pagination offset (default: 0)' },
            search_to: { type: 'number', description: 'Pagination upper bound (default: 100)' },
            timestamp_gte: { type: 'number', description: 'Filter reports at or after this epoch millisecond timestamp' },
            timestamp_lte: { type: 'number', description: 'Filter reports at or before this epoch millisecond timestamp' },
          },
        },
      },
      {
        name: 'insert_simple_indicators',
        description: 'Insert IOC indicators (hash, IP, domain, URL) into the Cortex XDR blocklist for real-time enforcement',
        inputSchema: {
          type: 'object',
          properties: {
            indicators: {
              type: 'array',
              description: 'Array of indicator objects with type (HASH, IP, DOMAIN_NAME, DOMAIN, CIDR), value, severity (INFO, LOW, MEDIUM, HIGH, CRITICAL), and optional comment',
            },
          },
          required: ['indicators'],
        },
      },
      {
        name: 'get_indicators',
        description: 'Retrieve IOC indicators from the Cortex XDR blocklist with optional type and value filters',
        inputSchema: {
          type: 'object',
          properties: {
            filters: {
              type: 'array',
              description: 'Filter objects (e.g. [{"field":"type","operator":"eq","value":"HASH"}])',
            },
            search_from: { type: 'number', description: 'Pagination offset (default: 0)' },
            search_to: { type: 'number', description: 'Pagination upper bound (default: 100)' },
          },
        },
      },
      {
        name: 'quarantine_files',
        description: 'Quarantine files on endpoints by file path and endpoint ID to stop execution of malicious files',
        inputSchema: {
          type: 'object',
          properties: {
            endpoint_id_list: {
              type: 'array',
              description: 'List of endpoint IDs to quarantine files on',
            },
            file_path: { type: 'string', description: 'Full file path to quarantine on the target endpoints' },
            file_hash: { type: 'string', description: 'SHA256 hash of the file to quarantine' },
          },
          required: ['endpoint_id_list', 'file_path', 'file_hash'],
        },
      },
      {
        name: 'get_quarantine_status',
        description: 'Check quarantine status for a specific file on a given endpoint',
        inputSchema: {
          type: 'object',
          properties: {
            files: {
              type: 'array',
              description: 'Array of objects with endpoint_id and file_path to check quarantine status for',
            },
          },
          required: ['files'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'get_incidents':
          return this.getIncidents(args);
        case 'get_incident_extra_data':
          return this.getIncidentExtraData(args);
        case 'update_incident':
          return this.updateIncident(args);
        case 'get_alerts':
          return this.getAlerts(args);
        case 'update_alert':
          return this.updateAlert(args);
        case 'get_endpoints':
          return this.getEndpoints(args);
        case 'get_all_endpoints':
          return this.getAllEndpoints();
        case 'delete_endpoints':
          return this.deleteEndpoints(args);
        case 'isolate_endpoint':
          return this.isolateEndpoint(args);
        case 'unisolate_endpoint':
          return this.unisolateEndpoint(args);
        case 'scan_endpoint':
          return this.scanEndpoint(args);
        case 'run_xql_query':
          return this.runXqlQuery(args);
        case 'get_xql_results':
          return this.getXqlResults(args);
        case 'list_scripts':
          return this.listScripts(args);
        case 'run_script':
          return this.runScript(args);
        case 'get_script_execution_status':
          return this.getScriptExecutionStatus(args);
        case 'get_script_execution_results':
          return this.getScriptExecutionResults(args);
        case 'get_audit_management_logs':
          return this.getAuditManagementLogs(args);
        case 'get_audit_agent_reports':
          return this.getAuditAgentReports(args);
        case 'insert_simple_indicators':
          return this.insertSimpleIndicators(args);
        case 'get_indicators':
          return this.getIndicators(args);
        case 'quarantine_files':
          return this.quarantineFiles(args);
        case 'get_quarantine_status':
          return this.getQuarantineStatus(args);
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

  private async getIncidents(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {
      request_data: {
        filters: (args.filters as unknown[]) ?? [],
        search_from: (args.search_from as number) ?? 0,
        search_to: (args.search_to as number) ?? 100,
      },
    };
    if (args.sort) (body.request_data as Record<string, unknown>).sort = args.sort;
    return this.post('/incidents/get_incidents/', body);
  }

  private async getIncidentExtraData(args: Record<string, unknown>): Promise<ToolResult> {
    const incidentId = args.incident_id as string;
    if (!incidentId) return { content: [{ type: 'text', text: 'incident_id is required' }], isError: true };
    return this.post('/incidents/get_incident_extra_data/', {
      request_data: {
        incident_id: incidentId,
        alerts_limit: (args.alerts_limit as number) ?? 1000,
      },
    });
  }

  private async updateIncident(args: Record<string, unknown>): Promise<ToolResult> {
    const incidentId = args.incident_id as string;
    if (!incidentId) return { content: [{ type: 'text', text: 'incident_id is required' }], isError: true };
    const updateFields: Record<string, unknown> = { incident_id: incidentId };
    if (args.assigned_user_mail) updateFields.assigned_user_mail = args.assigned_user_mail;
    if (args.status) updateFields.status = args.status;
    if (args.severity) updateFields.severity = args.severity;
    if (args.resolve_comment) updateFields.resolve_comment = args.resolve_comment;
    return this.post('/incidents/update_incident/', { request_data: updateFields });
  }

  private async getAlerts(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {
      request_data: {
        filters: (args.filters as unknown[]) ?? [],
        search_from: (args.search_from as number) ?? 0,
        search_to: (args.search_to as number) ?? 100,
      },
    };
    if (args.sort) (body.request_data as Record<string, unknown>).sort = args.sort;
    return this.post('/alerts/get_alerts/', body);
  }

  private async updateAlert(args: Record<string, unknown>): Promise<ToolResult> {
    const alertIdList = args.alert_id_list as unknown[];
    if (!alertIdList || alertIdList.length === 0) {
      return { content: [{ type: 'text', text: 'alert_id_list is required and must not be empty' }], isError: true };
    }
    const updateFields: Record<string, unknown> = { alert_id_list: alertIdList };
    if (args.assigned_user_mail) updateFields.assigned_user_mail = args.assigned_user_mail;
    if (args.status) updateFields.status = args.status;
    return this.post('/alerts/update_alerts/', { request_data: updateFields });
  }

  private async getEndpoints(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {
      request_data: {
        filters: (args.filters as unknown[]) ?? [],
        search_from: (args.search_from as number) ?? 0,
        search_to: (args.search_to as number) ?? 100,
      },
    };
    if (args.sort) (body.request_data as Record<string, unknown>).sort = args.sort;
    return this.post('/endpoints/get_endpoint/', body);
  }

  private async getAllEndpoints(): Promise<ToolResult> {
    return this.post('/endpoints/get_endpoints/', { request_data: {} });
  }

  private async deleteEndpoints(args: Record<string, unknown>): Promise<ToolResult> {
    const endpointIdList = args.endpoint_id_list as string[];
    if (!endpointIdList || endpointIdList.length === 0) {
      return { content: [{ type: 'text', text: 'endpoint_id_list is required and must not be empty' }], isError: true };
    }
    return this.post('/endpoints/delete/', { request_data: { endpoint_id_list: endpointIdList } });
  }

  private async isolateEndpoint(args: Record<string, unknown>): Promise<ToolResult> {
    const endpointIdList = args.endpoint_id_list as string[];
    if (!endpointIdList || endpointIdList.length === 0) {
      return { content: [{ type: 'text', text: 'endpoint_id_list is required and must not be empty' }], isError: true };
    }
    return this.post('/endpoints/isolate/', { request_data: { endpoint_id_list: endpointIdList } });
  }

  private async unisolateEndpoint(args: Record<string, unknown>): Promise<ToolResult> {
    const endpointIdList = args.endpoint_id_list as string[];
    if (!endpointIdList || endpointIdList.length === 0) {
      return { content: [{ type: 'text', text: 'endpoint_id_list is required and must not be empty' }], isError: true };
    }
    return this.post('/endpoints/unisolate/', { request_data: { endpoint_id_list: endpointIdList } });
  }

  private async scanEndpoint(args: Record<string, unknown>): Promise<ToolResult> {
    const endpointIdList = args.endpoint_id_list as string[];
    if (!endpointIdList || endpointIdList.length === 0) {
      return { content: [{ type: 'text', text: 'endpoint_id_list is required and must not be empty' }], isError: true };
    }
    return this.post('/endpoints/scan/', { request_data: { endpoint_id_list: endpointIdList } });
  }

  private async runXqlQuery(args: Record<string, unknown>): Promise<ToolResult> {
    const query = args.query as string;
    if (!query) return { content: [{ type: 'text', text: 'query is required' }], isError: true };
    const requestData: Record<string, unknown> = { query };
    if (args.timeframe) requestData.timeframe = args.timeframe;
    if (args.limit) requestData.limit = args.limit;
    return this.post('/xql/start_xql_query/', { request_data: requestData });
  }

  private async getXqlResults(args: Record<string, unknown>): Promise<ToolResult> {
    const queryId = args.query_id as string;
    if (!queryId) return { content: [{ type: 'text', text: 'query_id is required' }], isError: true };
    return this.post('/xql/get_query_results/', {
      request_data: {
        query_id: queryId,
        format: (args.format as string) ?? 'json',
      },
    });
  }

  private async listScripts(args: Record<string, unknown>): Promise<ToolResult> {
    return this.post('/scripts/get_scripts/', {
      request_data: {
        filters: (args.filters as unknown[]) ?? [],
      },
    });
  }

  private async runScript(args: Record<string, unknown>): Promise<ToolResult> {
    const scriptUid = args.script_uid as string;
    const endpointIdList = args.endpoint_id_list as unknown[];
    if (!scriptUid) return { content: [{ type: 'text', text: 'script_uid is required' }], isError: true };
    if (!endpointIdList || endpointIdList.length === 0) {
      return { content: [{ type: 'text', text: 'endpoint_id_list is required and must not be empty' }], isError: true };
    }
    const requestData: Record<string, unknown> = {
      script_uid: scriptUid,
      endpoint_ids: endpointIdList,
      timeout: (args.timeout as number) ?? 600,
    };
    if (args.parameters_values) requestData.parameters_values = args.parameters_values;
    return this.post('/scripts/run_script/', { request_data: requestData });
  }

  private async getScriptExecutionStatus(args: Record<string, unknown>): Promise<ToolResult> {
    const actionId = args.action_id as string;
    if (!actionId) return { content: [{ type: 'text', text: 'action_id is required' }], isError: true };
    return this.post('/scripts/get_script_execution_status/', { request_data: { action_id: actionId } });
  }

  private async getScriptExecutionResults(args: Record<string, unknown>): Promise<ToolResult> {
    const actionId = args.action_id as string;
    if (!actionId) return { content: [{ type: 'text', text: 'action_id is required' }], isError: true };
    return this.post('/scripts/get_script_execution_results/', { request_data: { action_id: actionId } });
  }

  private async getAuditManagementLogs(args: Record<string, unknown>): Promise<ToolResult> {
    const requestData: Record<string, unknown> = {
      search_from: (args.search_from as number) ?? 0,
      search_to: (args.search_to as number) ?? 100,
    };
    if (args.timestamp_gte) requestData.timestamp_gte = args.timestamp_gte;
    if (args.timestamp_lte) requestData.timestamp_lte = args.timestamp_lte;
    return this.post('/audits/management_logs/', { request_data: requestData });
  }

  private async getAuditAgentReports(args: Record<string, unknown>): Promise<ToolResult> {
    const requestData: Record<string, unknown> = {
      search_from: (args.search_from as number) ?? 0,
      search_to: (args.search_to as number) ?? 100,
    };
    if (args.timestamp_gte) requestData.timestamp_gte = args.timestamp_gte;
    if (args.timestamp_lte) requestData.timestamp_lte = args.timestamp_lte;
    return this.post('/audits/agents_reports/', { request_data: requestData });
  }

  private async insertSimpleIndicators(args: Record<string, unknown>): Promise<ToolResult> {
    const indicators = args.indicators as unknown[];
    if (!indicators || indicators.length === 0) {
      return { content: [{ type: 'text', text: 'indicators is required and must not be empty' }], isError: true };
    }
    return this.post('/indicators/insert_simple_indicators/', { request_data: { indicators } });
  }

  private async getIndicators(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {
      request_data: {
        filters: (args.filters as unknown[]) ?? [],
        search_from: (args.search_from as number) ?? 0,
        search_to: (args.search_to as number) ?? 100,
      },
    };
    return this.post('/indicators/get_indicators/', body);
  }

  private async quarantineFiles(args: Record<string, unknown>): Promise<ToolResult> {
    const endpointIdList = args.endpoint_id_list as unknown[];
    const filePath = args.file_path as string;
    const fileHash = args.file_hash as string;
    if (!endpointIdList || endpointIdList.length === 0) {
      return { content: [{ type: 'text', text: 'endpoint_id_list is required' }], isError: true };
    }
    if (!filePath) return { content: [{ type: 'text', text: 'file_path is required' }], isError: true };
    if (!fileHash) return { content: [{ type: 'text', text: 'file_hash is required' }], isError: true };
    return this.post('/endpoints/quarantine/', {
      request_data: {
        endpoint_id_list: endpointIdList,
        file_path: filePath,
        file_hash: fileHash,
      },
    });
  }

  private async getQuarantineStatus(args: Record<string, unknown>): Promise<ToolResult> {
    const files = args.files as unknown[];
    if (!files || files.length === 0) {
      return { content: [{ type: 'text', text: 'files is required and must not be empty' }], isError: true };
    }
    return this.post('/quarantine/status/', { request_data: { files } });
  }
}

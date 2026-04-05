/**
 * Trend Micro Vision One MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// No official Trend Micro Vision One MCP server was found on GitHub or npm as of March 2026.
//
// Base URL: https://api.xdr.trendmicro.com  (regional variants available for EU/AU/JP/SG/IN)
// Auth: Bearer token (API key) — generate in Trend Vision One console under Administration > API Keys
//   Header: Authorization: Bearer {apiKey}
// Docs: https://automation.trendmicro.com/xdr/api-v3/
//       https://automation.trendmicro.com/xdr/Guides/API-documentation/
// Rate limits: Measured per 60-second window; limits vary by endpoint (documented per-endpoint in Automation Center)

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface TrendMicroConfig {
  apiKey: string;
  baseUrl?: string;
}

export class TrendMicroMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: TrendMicroConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = (config.baseUrl ?? 'https://api.xdr.trendmicro.com').replace(/\/$/, '');
  }

  static catalog() {
    return {
      name: 'trend-micro',
      displayName: 'Trend Micro Vision One',
      version: '2.0.0',
      category: 'cybersecurity' as const,
      keywords: [
        'trend micro', 'vision one', 'XDR', 'workbench', 'alert',
        'detection', 'endpoint', 'sandbox', 'suspicious object', 'IOC',
        'response', 'isolate', 'threat intelligence', 'observed attack',
        'workload', 'container', 'email', 'network',
      ],
      toolNames: [
        'list_workbench_alerts', 'get_workbench_alert', 'update_workbench_alert',
        'list_endpoint_activity', 'search_endpoint_activity',
        'list_endpoints', 'get_endpoint',
        'isolate_endpoint', 'restore_endpoint',
        'list_suspicious_objects', 'add_suspicious_object', 'delete_suspicious_object',
        'submit_file_for_analysis', 'get_analysis_result',
        'list_observed_attack_techniques',
        'run_custom_script',
      ],
      description: 'XDR threat detection and response: manage workbench alerts, endpoints, suspicious objects, sandbox analysis, and response actions via Trend Vision One v3 API.',
      author: 'protectnil' as const,
    };
  }

  // ──────────────────────────────────────────────
  // HTTP helper — throws on non-OK
  // ──────────────────────────────────────────────
  private async req(path: string, method = 'GET', body?: unknown): Promise<unknown> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      throw new Error(`Trend Vision One API error ${response.status}: ${errText}`);
    }
    const text = await response.text();
    return text ? JSON.parse(text) : { ok: true };
  }

  get tools(): ToolDefinition[] {
    return [
      // ── Workbench Alerts ─────────────────────────
      {
        name: 'list_workbench_alerts',
        description: 'List Workbench alerts from Trend Vision One with optional severity, status, and date range filters',
        inputSchema: {
          type: 'object',
          properties: {
            severity: { type: 'string', description: 'Filter by severity: critical, high, medium, low, info' },
            status: { type: 'string', description: 'Filter by alert status: new, in_progress, closed' },
            start_time: { type: 'string', description: 'Filter alerts created after this ISO 8601 timestamp (e.g., "2026-03-01T00:00:00Z")' },
            end_time: { type: 'string', description: 'Filter alerts created before this ISO 8601 timestamp' },
            limit: { type: 'number', description: 'Maximum alerts to return (default: 50)' },
            offset: { type: 'number', description: 'Pagination offset (default: 0)' },
          },
        },
      },
      {
        name: 'get_workbench_alert',
        description: 'Retrieve full details for a specific Workbench alert by its alert ID, including indicators and matched detections',
        inputSchema: {
          type: 'object',
          properties: {
            alert_id: { type: 'string', description: 'Trend Vision One Workbench alert ID' },
          },
          required: ['alert_id'],
        },
      },
      {
        name: 'update_workbench_alert',
        description: 'Update the status or assignee of a Workbench alert (e.g., close an alert after investigation)',
        inputSchema: {
          type: 'object',
          properties: {
            alert_id: { type: 'string', description: 'Workbench alert ID to update' },
            status: { type: 'string', description: 'New status: new, in_progress, closed' },
            assignee: { type: 'string', description: 'Username to assign the alert to for investigation' },
            note: { type: 'string', description: 'Optional note to add when changing status (max 1024 characters)' },
          },
          required: ['alert_id'],
        },
      },
      // ── Endpoint Activity ─────────────────────────
      {
        name: 'list_endpoint_activity',
        description: 'Retrieve endpoint activity data (process, file, network events) for threat hunting and investigation',
        inputSchema: {
          type: 'object',
          properties: {
            endpoint_name: { type: 'string', description: 'Filter by endpoint hostname' },
            start_time: { type: 'string', description: 'Activity start time in ISO 8601 format' },
            end_time: { type: 'string', description: 'Activity end time in ISO 8601 format' },
            top: { type: 'number', description: 'Maximum activity records to return (default: 50, max: 1000)' },
          },
        },
      },
      {
        name: 'search_endpoint_activity',
        description: 'Run a custom ASRQ query to search endpoint process, file, and network activity data for threat hunting',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'ASRQ search expression (e.g., "processFilePath:cmd.exe AND srcIP:192.168.1.0/24")' },
            start_time: { type: 'string', description: 'Search time range start in ISO 8601 format' },
            end_time: { type: 'string', description: 'Search time range end in ISO 8601 format' },
            top: { type: 'number', description: 'Maximum records to return (default: 50)' },
          },
          required: ['query'],
        },
      },
      // ── Endpoints ────────────────────────────────
      {
        name: 'list_endpoints',
        description: 'List managed endpoints registered with Trend Vision One with optional OS and status filters',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Filter by hostname, IP address, or agent GUID' },
            os_type: { type: 'string', description: 'Filter by OS type: windows, macos, linux' },
            limit: { type: 'number', description: 'Maximum endpoints to return (default: 50)' },
            offset: { type: 'number', description: 'Pagination offset (default: 0)' },
          },
        },
      },
      {
        name: 'get_endpoint',
        description: 'Retrieve full profile details for a specific endpoint by its agent GUID',
        inputSchema: {
          type: 'object',
          properties: {
            agent_guid: { type: 'string', description: 'Trend Vision One endpoint agent GUID (UUID format)' },
          },
          required: ['agent_guid'],
        },
      },
      // ── Response Actions ─────────────────────────
      {
        name: 'isolate_endpoint',
        description: 'Network-isolate one or more endpoints to contain a threat, blocking network traffic while preserving Trend Micro agent communication',
        inputSchema: {
          type: 'object',
          properties: {
            agent_guid: { type: 'string', description: 'Agent GUID of the endpoint to isolate (provide agent_guid or endpoint_name)' },
            endpoint_name: { type: 'string', description: 'Hostname of the endpoint to isolate (provide endpoint_name or agent_guid)' },
            description: { type: 'string', description: 'Reason for isolation (max 2048 characters, logged in response tasks)' },
          },
        },
      },
      {
        name: 'restore_endpoint',
        description: 'Remove network isolation from a previously isolated endpoint to restore normal connectivity',
        inputSchema: {
          type: 'object',
          properties: {
            agent_guid: { type: 'string', description: 'Agent GUID of the endpoint to restore (provide agent_guid or endpoint_name)' },
            endpoint_name: { type: 'string', description: 'Hostname of the endpoint to restore (provide endpoint_name or agent_guid)' },
            description: { type: 'string', description: 'Reason for restoring connectivity (logged in response tasks)' },
          },
        },
      },
      // ── Suspicious Objects ───────────────────────
      {
        name: 'list_suspicious_objects',
        description: 'List suspicious objects (IPs, domains, file hashes, URLs) in the Trend Vision One block list',
        inputSchema: {
          type: 'object',
          properties: {
            type: { type: 'string', description: 'Filter by object type: ip, domain, file_sha256, url' },
            limit: { type: 'number', description: 'Maximum suspicious objects to return (default: 50)' },
            offset: { type: 'number', description: 'Pagination offset (default: 0)' },
          },
        },
      },
      {
        name: 'add_suspicious_object',
        description: 'Add an IP, domain, file hash, or URL to the Trend Vision One suspicious object block list',
        inputSchema: {
          type: 'object',
          properties: {
            type: { type: 'string', description: 'Object type: ip, domain, file_sha256, url' },
            value: { type: 'string', description: 'Value to add (e.g., "192.168.1.100", "malware.example.com", SHA-256 hash)' },
            scan_action: { type: 'string', description: 'Scan action: block, log (default: block)' },
            risk_level: { type: 'string', description: 'Risk level: high, medium, low (default: high)' },
            description: { type: 'string', description: 'Description of why this object is suspicious' },
          },
          required: ['type', 'value'],
        },
      },
      {
        name: 'delete_suspicious_object',
        description: 'Remove an object from the Trend Vision One suspicious object block list by type and value',
        inputSchema: {
          type: 'object',
          properties: {
            type: { type: 'string', description: 'Object type: ip, domain, file_sha256, url' },
            value: { type: 'string', description: 'Object value to remove from the block list' },
          },
          required: ['type', 'value'],
        },
      },
      // ── Sandbox Analysis ─────────────────────────
      {
        name: 'submit_file_for_analysis',
        description: 'Submit a file URL or hash to the Trend Vision One sandbox for malware analysis',
        inputSchema: {
          type: 'object',
          properties: {
            object_type: { type: 'string', description: 'Submission type: url, file (default: url)' },
            object_url: { type: 'string', description: 'URL of the file to download and analyze (for object_type: url)' },
            object_sha256: { type: 'string', description: 'SHA-256 hash of a previously seen file to re-analyze' },
            archive_password: { type: 'string', description: 'Password to unpack an encrypted archive (if applicable)' },
            document_password: { type: 'string', description: 'Password to open an encrypted document (if applicable)' },
          },
          required: ['object_type'],
        },
      },
      {
        name: 'get_analysis_result',
        description: 'Retrieve the sandbox analysis result for a previously submitted file or URL by submission ID',
        inputSchema: {
          type: 'object',
          properties: {
            submission_id: { type: 'string', description: 'Sandbox submission ID returned from submit_file_for_analysis' },
          },
          required: ['submission_id'],
        },
      },
      // ── Observed Attack Techniques ───────────────
      {
        name: 'list_observed_attack_techniques',
        description: 'List observed MITRE ATT&CK technique detections from endpoint, network, email, and cloud activity data',
        inputSchema: {
          type: 'object',
          properties: {
            start_time: { type: 'string', description: 'Filter detections after this ISO 8601 timestamp' },
            end_time: { type: 'string', description: 'Filter detections before this ISO 8601 timestamp' },
            technique_id: { type: 'string', description: 'Filter by MITRE ATT&CK technique ID (e.g., "T1059")' },
            data_source: { type: 'string', description: 'Filter by data source: endpoint, network, email, cloud, identity' },
            top: { type: 'number', description: 'Maximum records to return (default: 50)' },
          },
        },
      },
      // ── Response Tasks ───────────────────────────
      {
        name: 'run_custom_script',
        description: 'Execute a custom response script on one or more managed endpoints via Trend Vision One response management',
        inputSchema: {
          type: 'object',
          properties: {
            agent_guid: { type: 'string', description: 'Agent GUID of the target endpoint' },
            script_id: { type: 'string', description: 'Trend Vision One custom script ID to execute' },
            parameters: { type: 'string', description: 'Optional command-line parameters to pass to the script' },
            description: { type: 'string', description: 'Description of the task (logged in response task history)' },
          },
          required: ['agent_guid', 'script_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_workbench_alerts':        return await this.listWorkbenchAlerts(args);
        case 'get_workbench_alert':          return await this.getWorkbenchAlert(args);
        case 'update_workbench_alert':       return await this.updateWorkbenchAlert(args);
        case 'list_endpoint_activity':       return await this.listEndpointActivity(args);
        case 'search_endpoint_activity':     return await this.searchEndpointActivity(args);
        case 'list_endpoints':               return await this.listEndpoints(args);
        case 'get_endpoint':                 return await this.getEndpoint(args);
        case 'isolate_endpoint':             return await this.isolateEndpoint(args);
        case 'restore_endpoint':             return await this.restoreEndpoint(args);
        case 'list_suspicious_objects':      return await this.listSuspiciousObjects(args);
        case 'add_suspicious_object':        return await this.addSuspiciousObject(args);
        case 'delete_suspicious_object':     return await this.deleteSuspiciousObject(args);
        case 'submit_file_for_analysis':     return await this.submitFileForAnalysis(args);
        case 'get_analysis_result':          return await this.getAnalysisResult(args);
        case 'list_observed_attack_techniques': return await this.listObservedAttackTechniques(args);
        case 'run_custom_script':            return await this.runCustomScript(args);
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

  private async listWorkbenchAlerts(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.severity) params.set('severity', args.severity as string);
    if (args.status) params.set('status', args.status as string);
    if (args.start_time) params.set('startDateTime', args.start_time as string);
    if (args.end_time) params.set('endDateTime', args.end_time as string);
    params.set('offset', String((args.offset as number) ?? 0));
    params.set('limit', String((args.limit as number) ?? 50));
    const data = await this.req(`/v3.0/workbench/alerts?${params}`);
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getWorkbenchAlert(args: Record<string, unknown>): Promise<ToolResult> {
    const data = await this.req(`/v3.0/workbench/alerts/${encodeURIComponent(args.alert_id as string)}`);
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async updateWorkbenchAlert(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.alert_id as string;
    const body: Record<string, unknown> = {};
    if (args.status) body.status = args.status;
    if (args.assignee) body.assignee = args.assignee;
    if (args.note) body.note = args.note;
    const data = await this.req(`/v3.0/workbench/alerts/${encodeURIComponent(id)}`, 'PATCH', body);
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listEndpointActivity(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.endpoint_name) params.set('endpointName', args.endpoint_name as string);
    if (args.start_time) params.set('startDateTime', args.start_time as string);
    if (args.end_time) params.set('endDateTime', args.end_time as string);
    params.set('top', String((args.top as number) ?? 50));
    const data = await this.req(`/v3.0/search/endpointActivities?${params}`);
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async searchEndpointActivity(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    params.set('query', args.query as string);
    if (args.start_time) params.set('startDateTime', args.start_time as string);
    if (args.end_time) params.set('endDateTime', args.end_time as string);
    params.set('top', String((args.top as number) ?? 50));
    const data = await this.req(`/v3.0/search/endpointActivities?${params}`);
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listEndpoints(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.query) params.set('query', args.query as string);
    if (args.os_type) params.set('osType', args.os_type as string);
    params.set('top', String((args.limit as number) ?? 50));
    params.set('skip', String((args.offset as number) ?? 0));
    const data = await this.req(`/v3.0/endpointSecurity/endpoints?${params}`);
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getEndpoint(args: Record<string, unknown>): Promise<ToolResult> {
    const data = await this.req(`/v3.0/endpointSecurity/endpoints/${encodeURIComponent(args.agent_guid as string)}`);
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async isolateEndpoint(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.agent_guid && !args.endpoint_name) {
      return { content: [{ type: 'text', text: 'Either agent_guid or endpoint_name is required' }], isError: true };
    }
    const entry: Record<string, string> = {};
    if (args.agent_guid) entry.agentGuid = args.agent_guid as string;
    if (args.endpoint_name) entry.endpointName = args.endpoint_name as string;
    if (args.description) entry.description = args.description as string;
    const data = await this.req('/v3.0/response/endpoints/isolate', 'POST', [entry]);
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async restoreEndpoint(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.agent_guid && !args.endpoint_name) {
      return { content: [{ type: 'text', text: 'Either agent_guid or endpoint_name is required' }], isError: true };
    }
    const entry: Record<string, string> = {};
    if (args.agent_guid) entry.agentGuid = args.agent_guid as string;
    if (args.endpoint_name) entry.endpointName = args.endpoint_name as string;
    if (args.description) entry.description = args.description as string;
    const data = await this.req('/v3.0/response/endpoints/restore', 'POST', [entry]);
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listSuspiciousObjects(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.type) params.set('type', args.type as string);
    params.set('limit', String((args.limit as number) ?? 50));
    params.set('offset', String((args.offset as number) ?? 0));
    const data = await this.req(`/v3.0/threatintel/suspiciousObjects?${params}`);
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async addSuspiciousObject(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {
      type: args.type,
      value: args.value,
      scanAction: args.scan_action ?? 'block',
      riskLevel: args.risk_level ?? 'high',
    };
    if (args.description) body.description = args.description;
    const data = await this.req('/v3.0/threatintel/suspiciousObjects', 'POST', [body]);
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async deleteSuspiciousObject(args: Record<string, unknown>): Promise<ToolResult> {
    const body = [{ type: args.type, value: args.value }];
    const data = await this.req('/v3.0/threatintel/suspiciousObjects/delete', 'POST', body);
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async submitFileForAnalysis(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {
      objectType: args.object_type ?? 'url',
    };
    if (args.object_url) body.objectUrl = args.object_url;
    if (args.object_sha256) body.objectSha256 = args.object_sha256;
    if (args.archive_password) body.archivePassword = args.archive_password;
    if (args.document_password) body.documentPassword = args.document_password;
    const data = await this.req('/v3.0/sandbox/analysisResults/files', 'POST', body);
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getAnalysisResult(args: Record<string, unknown>): Promise<ToolResult> {
    const data = await this.req(`/v3.0/sandbox/analysisResults/${encodeURIComponent(args.submission_id as string)}`);
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listObservedAttackTechniques(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.start_time) params.set('startDateTime', args.start_time as string);
    if (args.end_time) params.set('endDateTime', args.end_time as string);
    if (args.technique_id) params.set('techniqueId', args.technique_id as string);
    if (args.data_source) params.set('detectionSource', args.data_source as string);
    params.set('top', String((args.top as number) ?? 50));
    const data = await this.req(`/v3.0/detections/observedAttackTechniques?${params}`);
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async runCustomScript(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {
      agentGuid: args.agent_guid,
      scriptId: args.script_id,
    };
    if (args.parameters) body.parameters = args.parameters;
    if (args.description) body.description = args.description;
    const data = await this.req('/v3.0/response/endpoints/runScript', 'POST', [body]);
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }
}

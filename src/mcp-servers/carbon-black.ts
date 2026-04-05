/**
 * VMware Carbon Black Cloud MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28.
// No official Carbon Black Cloud MCP server published by VMware/Broadcom on GitHub or npm.
// The carbonblack GitHub org contains only SDKs (Python cbapi) and archived CLI tools, not MCP servers.
// Recommendation: use-rest-api — this adapter is the only integration path.
//
// Base URL: https://defense.conferdeploy.net (varies by region — configurable via baseUrl)
// Auth: X-Auth-Token header using "API_KEY/CONNECTOR_ID" format (apiKey/connectorId concatenated).
//       API Key and Connector ID are generated in the Carbon Black Cloud console under
//       Settings > API Access > Add API Key. Different Access Level types required per API.
// Docs: https://developer.carbonblack.com/reference/carbon-black-cloud/
//       https://developer.carbonblack.com/reference/carbon-black-cloud/authentication/
// Rate limits: Not formally documented. Async search jobs (processes, enriched events) use submit/poll pattern.
// API service paths (verified):
//   Alerts v7:              /api/alerts/v7/orgs/{org_key}/
//   Devices v6:             /appservices/v6/orgs/{org_key}/devices/
//   Live Response v6:       /appservices/v6/orgs/{org_key}/liveresponse/
//   Policy v1:              /policyservice/v1/orgs/{org_key}/policies/
//   Process Search v2:      /api/investigate/v2/orgs/{org_key}/processes/search_jobs
//   Enriched Events v2:     /api/investigate/v2/orgs/{org_key}/enriched_events/search_jobs
//   Reputation Overrides v6:/appservices/v6/orgs/{org_key}/reputations/overrides
//   Watchlist v3:           /threathunter/watchlistmgr/v3/orgs/{org_key}/watchlists
//   Vulnerability v1:       /vulnerability/assessment/api/v1/orgs/{org_key}/

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface CarbonBlackConfig {
  apiKey: string;
  connectorId: string;
  orgKey: string;
  baseUrl?: string;
}

export class CarbonBlackMCPServer extends MCPAdapterBase {
  private readonly authToken: string;
  private readonly baseUrl: string;
  private readonly orgKey: string;

  constructor(config: CarbonBlackConfig) {
    super();
    this.authToken = `${config.apiKey}/${config.connectorId}`;
    this.baseUrl = config.baseUrl || 'https://defense.conferdeploy.net';
    this.orgKey = config.orgKey;
  }

  get tools(): ToolDefinition[] {
    return [
      // Alerts
      {
        name: 'list_alerts',
        description: 'Search and list security alerts with optional filters for severity, status, type, and date range',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Maximum number of alerts to return (default: 50, max: 10000)' },
            offset: { type: 'number', description: 'Row offset for pagination (default: 0)' },
            severity: { type: 'string', description: 'Filter by severity (CRITICAL, HIGH, MEDIUM, LOW)' },
            status: { type: 'string', description: 'Filter by workflow status (OPEN, DISMISSED, IN_PROGRESS, CLOSED)' },
            alert_type: { type: 'string', description: 'Filter by alert type (CB_ANALYTICS, WATCHLIST, DEVICE_CONTROL, CONTAINER_RUNTIME)' },
            device_name: { type: 'string', description: 'Filter by device/endpoint hostname' },
            start_time: { type: 'string', description: 'ISO 8601 start datetime for alert creation time filter' },
            end_time: { type: 'string', description: 'ISO 8601 end datetime for alert creation time filter' },
          },
        },
      },
      {
        name: 'get_alert',
        description: 'Get detailed information about a specific alert by its ID',
        inputSchema: {
          type: 'object',
          properties: {
            alert_id: { type: 'string', description: 'Unique alert identifier (UUID)' },
          },
          required: ['alert_id'],
        },
      },
      {
        name: 'dismiss_alert',
        description: 'Dismiss one or more alerts matching a filter, setting their workflow status to DISMISSED',
        inputSchema: {
          type: 'object',
          properties: {
            alert_id: { type: 'string', description: 'Single alert ID to dismiss' },
            remediation: { type: 'string', description: 'Remediation note explaining why the alert is dismissed' },
            comment: { type: 'string', description: 'Additional comment for the dismissal' },
          },
          required: ['alert_id'],
        },
      },
      {
        name: 'undismiss_alert',
        description: 'Reopen a dismissed alert, resetting its workflow status to OPEN',
        inputSchema: {
          type: 'object',
          properties: {
            alert_id: { type: 'string', description: 'Alert ID to reopen' },
            comment: { type: 'string', description: 'Comment explaining why the alert is being reopened' },
          },
          required: ['alert_id'],
        },
      },
      // Devices
      {
        name: 'search_devices',
        description: 'Search for managed endpoints by hostname, OS, status, policy, or sensor version',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Free-text search query (hostname, username, IP address)' },
            status: { type: 'string', description: 'Filter by sensor status: REGISTERED, BYPASS, ACTIVE, INACTIVE, ERROR, ALL' },
            os: { type: 'string', description: 'Filter by OS: WINDOWS, MAC, LINUX, OTHER' },
            policy_id: { type: 'number', description: 'Filter by assigned policy ID' },
            rows: { type: 'number', description: 'Number of results to return (default: 50, max: 10000)' },
            start: { type: 'number', description: 'Starting row for pagination (default: 0)' },
          },
        },
      },
      {
        name: 'get_device',
        description: 'Get details of a specific managed device/endpoint by its ID',
        inputSchema: {
          type: 'object',
          properties: {
            device_id: { type: 'number', description: 'Numeric device/endpoint ID' },
          },
          required: ['device_id'],
        },
      },
      {
        name: 'quarantine_device',
        description: 'Quarantine a device to isolate it from the network while keeping the CB sensor connected',
        inputSchema: {
          type: 'object',
          properties: {
            device_id: { type: 'number', description: 'Numeric device ID to quarantine' },
          },
          required: ['device_id'],
        },
      },
      {
        name: 'unquarantine_device',
        description: 'Remove quarantine status from a device and restore normal network connectivity',
        inputSchema: {
          type: 'object',
          properties: {
            device_id: { type: 'number', description: 'Numeric device ID to unquarantine' },
          },
          required: ['device_id'],
        },
      },
      {
        name: 'update_device_policy',
        description: 'Reassign one or more devices to a different security policy',
        inputSchema: {
          type: 'object',
          properties: {
            device_ids: { type: 'string', description: 'Comma-separated list of numeric device IDs to reassign' },
            policy_id: { type: 'number', description: 'Target policy ID to assign the devices to' },
          },
          required: ['device_ids', 'policy_id'],
        },
      },
      {
        name: 'bypass_device',
        description: 'Enable sensor bypass on a device to temporarily disable enforcement (use with caution)',
        inputSchema: {
          type: 'object',
          properties: {
            device_ids: { type: 'string', description: 'Comma-separated list of numeric device IDs' },
            bypass: { type: 'boolean', description: 'True to enable bypass, false to disable bypass' },
          },
          required: ['device_ids', 'bypass'],
        },
      },
      // Policies
      {
        name: 'list_policies',
        description: 'List all security policies configured in the organization',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_policy',
        description: 'Get full details of a specific policy including all rules and settings',
        inputSchema: {
          type: 'object',
          properties: {
            policy_id: { type: 'number', description: 'Numeric policy ID' },
          },
          required: ['policy_id'],
        },
      },
      // Process Search (async)
      {
        name: 'search_processes',
        description: 'Search for process executions across managed endpoints — submits an async job and polls for results',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Process search query (process name, path, hash, username)' },
            rows: { type: 'number', description: 'Number of results to return (default: 50, max: 100)' },
            start: { type: 'number', description: 'Starting row for pagination (default: 0)' },
            start_time: { type: 'string', description: 'ISO 8601 start timestamp for process execution time' },
            end_time: { type: 'string', description: 'ISO 8601 end timestamp for process execution time' },
          },
          required: ['query'],
        },
      },
      // Event Search (async)
      {
        name: 'search_events',
        description: 'Search for enriched endpoint events (file, network, registry, process) — submits async job and polls',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Event search query (process name, event type, IP, file path)' },
            rows: { type: 'number', description: 'Number of results to return (default: 50, max: 100)' },
            start: { type: 'number', description: 'Starting row for pagination (default: 0)' },
            start_time: { type: 'string', description: 'ISO 8601 start timestamp for event time filter' },
            end_time: { type: 'string', description: 'ISO 8601 end timestamp for event time filter' },
          },
          required: ['query'],
        },
      },
      // Reputation / Allow-Deny lists
      {
        name: 'list_reputation_overrides',
        description: 'List reputation overrides (custom allow/block rules for hashes, certificates, or IT tools)',
        inputSchema: {
          type: 'object',
          properties: {
            rows: { type: 'number', description: 'Number of results (default: 50, max: 200)' },
            start: { type: 'number', description: 'Starting row for pagination (default: 0)' },
          },
        },
      },
      {
        name: 'create_reputation_override',
        description: 'Create a reputation override to allow or block a specific hash, certificate, or IT tool by path',
        inputSchema: {
          type: 'object',
          properties: {
            override_type: { type: 'string', description: 'Type: SHA256, CERT, or IT_TOOL' },
            override_list: { type: 'string', description: 'List: WHITE_LIST (allow) or BLACK_LIST (block)' },
            sha256_hash: { type: 'string', description: 'SHA-256 hash to override (required for SHA256 type)' },
            filename: { type: 'string', description: 'Filename associated with the hash (optional)' },
            description: { type: 'string', description: 'Human-readable description of why this override exists' },
          },
          required: ['override_type', 'override_list'],
        },
      },
      {
        name: 'delete_reputation_override',
        description: 'Delete a reputation override by its ID',
        inputSchema: {
          type: 'object',
          properties: {
            override_id: { type: 'string', description: 'ID of the reputation override to delete' },
          },
          required: ['override_id'],
        },
      },
      // Watchlists
      {
        name: 'list_watchlists',
        description: 'List all configured watchlists (threat intelligence feeds) for threat detection',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_watchlist',
        description: 'Get details of a specific watchlist including its IOC reports',
        inputSchema: {
          type: 'object',
          properties: {
            watchlist_id: { type: 'string', description: 'Watchlist ID' },
          },
          required: ['watchlist_id'],
        },
      },
      // Vulnerabilities
      {
        name: 'list_device_vulnerabilities',
        description: 'Search vulnerabilities detected on a specific device with optional severity filter and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            device_id: { type: 'number', description: 'Device ID to search vulnerabilities for' },
            rows: { type: 'number', description: 'Number of results (default: 20)' },
            start: { type: 'number', description: 'Starting row for pagination (default: 0)' },
            severity: { type: 'string', description: 'Filter by CVSS severity value: CRITICAL, HIGH, MEDIUM, LOW' },
          },
          required: ['device_id'],
        },
      },
      {
        name: 'list_org_vulnerabilities',
        description: 'Search vulnerabilities across all devices in the organization with optional severity filter and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            rows: { type: 'number', description: 'Number of results (default: 20)' },
            start: { type: 'number', description: 'Starting row for pagination (default: 0)' },
            severity: { type: 'string', description: 'Filter by CVSS severity value: CRITICAL, HIGH, MEDIUM, LOW' },
          },
        },
      },
      // Live Response
      {
        name: 'start_live_response',
        description: 'Initiate a live response session on an endpoint for real-time investigation and remediation',
        inputSchema: {
          type: 'object',
          properties: {
            device_id: { type: 'number', description: 'Numeric device ID to start live response on' },
            session_timeout: { type: 'number', description: 'Session timeout in seconds (default: 300, max: 3600)' },
          },
          required: ['device_id'],
        },
      },
      {
        name: 'get_live_response_session',
        description: 'Get the status of an active live response session',
        inputSchema: {
          type: 'object',
          properties: {
            session_id: { type: 'string', description: 'Live response session ID' },
          },
          required: ['session_id'],
        },
      },
      {
        name: 'close_live_response_session',
        description: 'Close an active live response session',
        inputSchema: {
          type: 'object',
          properties: {
            session_id: { type: 'string', description: 'Live response session ID to close' },
          },
          required: ['session_id'],
        },
      },
      {
        name: 'execute_live_response_command',
        description: 'Execute a command in a live response session (process list, file get, file put, memdump)',
        inputSchema: {
          type: 'object',
          properties: {
            session_id: { type: 'string', description: 'Active live response session ID' },
            command_type: { type: 'string', description: 'Command type: process list, file get, file put, kill, memdump, reg get, reg enum_key' },
            path: { type: 'string', description: 'File path or registry key path (required for file/registry commands)' },
            object_name: { type: 'string', description: 'Process name or object identifier for the command' },
          },
          required: ['session_id', 'command_type'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_alerts': return this.listAlerts(args);
        case 'get_alert': return this.getAlert(args);
        case 'dismiss_alert': return this.dismissAlert(args);
        case 'undismiss_alert': return this.undismissAlert(args);
        case 'search_devices': return this.searchDevices(args);
        case 'get_device': return this.getDevice(args);
        case 'quarantine_device': return this.quarantineDevice(args);
        case 'unquarantine_device': return this.unquarantineDevice(args);
        case 'update_device_policy': return this.updateDevicePolicy(args);
        case 'bypass_device': return this.bypassDevice(args);
        case 'list_policies': return this.listPolicies();
        case 'get_policy': return this.getPolicy(args);
        case 'search_processes': return this.searchProcesses(args);
        case 'search_events': return this.searchEvents(args);
        case 'list_reputation_overrides': return this.listReputationOverrides(args);
        case 'create_reputation_override': return this.createReputationOverride(args);
        case 'delete_reputation_override': return this.deleteReputationOverride(args);
        case 'list_watchlists': return this.listWatchlists();
        case 'get_watchlist': return this.getWatchlist(args);
        case 'list_device_vulnerabilities': return this.listDeviceVulnerabilities(args);
        case 'list_org_vulnerabilities': return this.listOrgVulnerabilities(args);
        case 'start_live_response': return this.startLiveResponse(args);
        case 'get_live_response_session': return this.getLiveResponseSession(args);
        case 'close_live_response_session': return this.closeLiveResponseSession(args);
        case 'execute_live_response_command': return this.executeLiveResponseCommand(args);
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

  private headers(): Record<string, string> {
    return { 'X-Auth-Token': this.authToken, 'Content-Type': 'application/json' };
  }

  private org(): string {
    return encodeURIComponent(this.orgKey);
  }

  private async get(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, { method: 'GET', headers: this.headers() });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async post(path: string, body: unknown): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, { method: 'POST', headers: this.headers(), body: JSON.stringify(body) });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { data = { status: response.status, statusText: response.statusText }; }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async delete(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, { method: 'DELETE', headers: this.headers() });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: 'Deleted successfully' }], isError: false };
  }

  private async searchJob(submitPath: string, resultsPath: string, body: unknown): Promise<ToolResult> {
    // Step 1: Submit async search job
    const submitResponse = await this.fetchWithRetry(`${this.baseUrl}${submitPath}`, {
      method: 'POST', headers: this.headers(), body: JSON.stringify(body),
    });
    if (!submitResponse.ok) {
      return { content: [{ type: 'text', text: `Failed to submit search job: ${submitResponse.status} ${submitResponse.statusText}` }], isError: true };
    }
    const submitData = await submitResponse.json() as { job_id?: string };
    const jobId = submitData.job_id;
    if (!jobId) {
      return { content: [{ type: 'text', text: 'Search job did not return a job_id' }], isError: true };
    }

    // Step 2: Poll for results (contacted == completed signals done)
    const deadline = Date.now() + 180_000;
    const pollUrl = `${this.baseUrl}${resultsPath}/${encodeURIComponent(jobId)}/results`;

    while (Date.now() < deadline) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      const res = await this.fetchWithRetry(pollUrl, { method: 'GET', headers: this.headers() });
      if (!res.ok) {
        return { content: [{ type: 'text', text: `Failed to retrieve search results: ${res.status} ${res.statusText}` }], isError: true };
      }
      const resultsData = await res.json() as { contacted?: number; completed?: number };
      const contacted = resultsData.contacted ?? 0;
      const completed = resultsData.completed ?? 0;
      if (contacted > 0 && Math.abs(contacted - completed) <= 1) {
        return { content: [{ type: 'text', text: this.truncate(resultsData) }], isError: false };
      }
    }
    return { content: [{ type: 'text', text: `Search job ${jobId} timed out after 3 minutes` }], isError: true };
  }

  private async listAlerts(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {
      rows: (args.limit as number) ?? 50,
      start: (args.offset as number) ?? 0,
    };
    const criteria: Record<string, unknown> = {};
    if (args.severity) criteria['minimum_severity'] = (args.severity as string).toUpperCase();
    if (args.status) criteria['workflow_status'] = [(args.status as string).toUpperCase()];
    if (args.alert_type) criteria['type'] = [(args.alert_type as string).toUpperCase()];
    if (args.device_name) criteria['device_name'] = [args.device_name];
    if (Object.keys(criteria).length > 0) body['criteria'] = criteria;
    if (args.start_time || args.end_time) {
      const tr: Record<string, string> = {};
      if (args.start_time) tr['start'] = args.start_time as string;
      if (args.end_time) tr['end'] = args.end_time as string;
      body['time_range'] = tr;
    }
    return this.post(`/api/alerts/v7/orgs/${this.org()}/alerts/_search`, body);
  }

  private async getAlert(args: Record<string, unknown>): Promise<ToolResult> {
    return this.get(`/api/alerts/v7/orgs/${this.org()}/alerts/${encodeURIComponent(args.alert_id as string)}`);
  }

  private async dismissAlert(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {
      criteria: { id: [args.alert_id] },
      determination: { status: 'DISMISSED' },
    };
    if (args.remediation) body['remediation_state'] = args.remediation;
    if (args.comment) body['comment'] = args.comment;
    return this.post(`/api/alerts/v7/orgs/${this.org()}/alerts/workflow`, body);
  }

  private async undismissAlert(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {
      criteria: { id: [args.alert_id] },
      determination: { status: 'OPEN' },
    };
    if (args.comment) body['comment'] = args.comment;
    return this.post(`/api/alerts/v7/orgs/${this.org()}/alerts/workflow`, body);
  }

  private async searchDevices(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {
      rows: (args.rows as number) ?? 50,
      start: (args.start as number) ?? 0,
    };
    const criteria: Record<string, unknown> = {};
    if (args.status) criteria['status'] = [(args.status as string).toUpperCase()];
    if (args.os) criteria['os'] = [(args.os as string).toUpperCase()];
    if (args.policy_id) criteria['policy_id'] = [args.policy_id];
    if (Object.keys(criteria).length > 0) body['criteria'] = criteria;
    if (args.query) body['query'] = args.query;
    return this.post(`/appservices/v6/orgs/${this.org()}/devices/_search`, body);
  }

  private async getDevice(args: Record<string, unknown>): Promise<ToolResult> {
    return this.get(`/appservices/v6/orgs/${this.org()}/devices/${encodeURIComponent(args.device_id as string)}`);
  }

  private async quarantineDevice(args: Record<string, unknown>): Promise<ToolResult> {
    return this.post(`/appservices/v6/orgs/${this.org()}/device_actions`, {
      action_type: 'QUARANTINE',
      device_id: [args.device_id],
      options: { toggle: 'ON' },
    });
  }

  private async unquarantineDevice(args: Record<string, unknown>): Promise<ToolResult> {
    return this.post(`/appservices/v6/orgs/${this.org()}/device_actions`, {
      action_type: 'QUARANTINE',
      device_id: [args.device_id],
      options: { toggle: 'OFF' },
    });
  }

  private async updateDevicePolicy(args: Record<string, unknown>): Promise<ToolResult> {
    const deviceIds = (args.device_ids as string).split(',').map(s => Number(s.trim()));
    return this.post(`/appservices/v6/orgs/${this.org()}/device_actions`, {
      action_type: 'UPDATE_POLICY',
      device_id: deviceIds,
      options: { policy_id: args.policy_id },
    });
  }

  private async bypassDevice(args: Record<string, unknown>): Promise<ToolResult> {
    const deviceIds = (args.device_ids as string).split(',').map(s => Number(s.trim()));
    return this.post(`/appservices/v6/orgs/${this.org()}/device_actions`, {
      action_type: 'BYPASS',
      device_id: deviceIds,
      options: { toggle: args.bypass ? 'ON' : 'OFF' },
    });
  }

  private async listPolicies(): Promise<ToolResult> {
    return this.get(`/policyservice/v1/orgs/${this.org()}/policies/summary`);
  }

  private async getPolicy(args: Record<string, unknown>): Promise<ToolResult> {
    return this.get(`/policyservice/v1/orgs/${this.org()}/policies/${encodeURIComponent(args.policy_id as string)}`);
  }

  private async searchProcesses(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {
      query: args.query,
      rows: (args.rows as number) ?? 50,
      start: (args.start as number) ?? 0,
    };
    if (args.start_time || args.end_time) {
      const tr: Record<string, string> = {};
      if (args.start_time) tr['start'] = args.start_time as string;
      if (args.end_time) tr['end'] = args.end_time as string;
      body['time_range'] = tr;
    }
    return this.searchJob(
      `/api/investigate/v2/orgs/${this.org()}/processes/search_jobs`,
      `/api/investigate/v2/orgs/${this.org()}/processes/search_jobs`,
      body,
    );
  }

  private async searchEvents(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {
      query: args.query,
      rows: (args.rows as number) ?? 50,
      start: (args.start as number) ?? 0,
    };
    if (args.start_time || args.end_time) {
      const tr: Record<string, string> = {};
      if (args.start_time) tr['start'] = args.start_time as string;
      if (args.end_time) tr['end'] = args.end_time as string;
      body['time_range'] = tr;
    }
    return this.searchJob(
      `/api/investigate/v2/orgs/${this.org()}/enriched_events/search_jobs`,
      `/api/investigate/v2/orgs/${this.org()}/enriched_events/search_jobs`,
      body,
    );
  }

  private async listReputationOverrides(args: Record<string, unknown>): Promise<ToolResult> {
    const rows = (args.rows as number) ?? 50;
    const start = (args.start as number) ?? 0;
    return this.get(`/appservices/v6/orgs/${this.org()}/reputations/overrides?rows=${rows}&start=${start}`);
  }

  private async createReputationOverride(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {
      override_type: args.override_type,
      override_list: args.override_list,
    };
    if (args.sha256_hash) body['sha256_hash'] = args.sha256_hash;
    if (args.filename) body['filename'] = args.filename;
    if (args.description) body['description'] = args.description;
    return this.post(`/appservices/v6/orgs/${this.org()}/reputations/overrides`, body);
  }

  private async deleteReputationOverride(args: Record<string, unknown>): Promise<ToolResult> {
    return this.delete(`/appservices/v6/orgs/${this.org()}/reputations/overrides/${encodeURIComponent(args.override_id as string)}`);
  }

  private async listWatchlists(): Promise<ToolResult> {
    return this.get(`/threathunter/watchlistmgr/v3/orgs/${this.org()}/watchlists`);
  }

  private async getWatchlist(args: Record<string, unknown>): Promise<ToolResult> {
    return this.get(`/threathunter/watchlistmgr/v3/orgs/${this.org()}/watchlists/${encodeURIComponent(args.watchlist_id as string)}`);
  }

  private async listDeviceVulnerabilities(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {
      rows: (args.rows as number) ?? 20,
      start: (args.start as number) ?? 0,
    };
    if (args.severity) body['criteria'] = { property: { value: args.severity, operator: 'EQUALS' } };
    return this.post(`/vulnerability/assessment/api/v1/orgs/${this.org()}/devices/${encodeURIComponent(args.device_id as string)}/vulnerabilities/_search`, body);
  }

  private async listOrgVulnerabilities(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {
      rows: (args.rows as number) ?? 20,
      start: (args.start as number) ?? 0,
    };
    if (args.severity) body['criteria'] = { property: { value: args.severity, operator: 'EQUALS' } };
    return this.post(`/vulnerability/assessment/api/v1/orgs/${this.org()}/devices/vulnerabilities/_search`, body);
  }

  private async startLiveResponse(args: Record<string, unknown>): Promise<ToolResult> {
    return this.post(`/appservices/v6/orgs/${this.org()}/liveresponse/sessions`, {
      device_id: args.device_id,
      session_timeout: (args.session_timeout as number) ?? 300,
    });
  }

  private async getLiveResponseSession(args: Record<string, unknown>): Promise<ToolResult> {
    return this.get(`/appservices/v6/orgs/${this.org()}/liveresponse/sessions/${encodeURIComponent(args.session_id as string)}`);
  }

  private async closeLiveResponseSession(args: Record<string, unknown>): Promise<ToolResult> {
    return this.delete(`/appservices/v6/orgs/${this.org()}/liveresponse/sessions/${encodeURIComponent(args.session_id as string)}`);
  }

  private async executeLiveResponseCommand(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = { name: args.command_type };
    if (args.path) body['path'] = args.path;
    if (args.object_name) body['object_name'] = args.object_name;
    return this.post(`/appservices/v6/orgs/${this.org()}/liveresponse/sessions/${encodeURIComponent(args.session_id as string)}/commands`, body);
  }

  static catalog() {
    return {
      name: 'carbon-black',
      displayName: 'Carbon Black Cloud',
      version: '1.0.0',
      category: 'cybersecurity' as const,
      keywords: ['carbon black', 'vmware', 'broadcom', 'edr', 'endpoint detection', 'alert', 'quarantine', 'device', 'policy', 'threat hunting', 'live response', 'watchlist', 'vulnerability', 'reputation', 'process search', 'xdr'],
      toolNames: ['list_alerts', 'get_alert', 'dismiss_alert', 'undismiss_alert', 'search_devices', 'get_device', 'quarantine_device', 'unquarantine_device', 'update_device_policy', 'bypass_device', 'list_policies', 'get_policy', 'search_processes', 'search_events', 'list_reputation_overrides', 'create_reputation_override', 'delete_reputation_override', 'list_watchlists', 'get_watchlist', 'list_device_vulnerabilities', 'list_org_vulnerabilities', 'start_live_response', 'get_live_response_session', 'close_live_response_session', 'execute_live_response_command'],
      description: 'VMware Carbon Black Cloud EDR: alerts, endpoint quarantine, device policy, process/event search, reputation overrides, watchlists, vulnerability assessment, and live response.',
      author: 'protectnil' as const,
    };
  }
}

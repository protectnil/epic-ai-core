/**
 * CrowdStrike Falcon MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/CrowdStrike/falcon-mcp — transport: stdio, auth: OAuth2 client credentials
//   Vendor-official (CrowdStrike/falcon-mcp), actively maintained (latest release v0.8.0 on 2026-03-09).
//   Exposes 33 tools across detections, hosts, incidents, cloud security, identity protection, IOC,
//   Intel, NGSIEM, Spotlight, and more. Highly recommended for full coverage.
// Our adapter covers: 18 tools (core SOC operations — detections, hosts, incidents, host groups,
//   prevention policies, IOC, vulnerabilities). Vendor MCP covers: 33 tools (full platform).
// Recommendation: use-both — vendor MCP has unique tools our adapter does not cover (cloud security,
//   Intel, NGSIEM, Firewall Management, Scheduled Reports, Sensor Usage, Serverless, Discover).
//   Our adapter has unique tools the vendor MCP does not expose individually (list_host_groups,
//   get_host_group, list_host_group_members, list_prevention_policies, get_prevention_policy,
//   quarantine_host, lift_quarantine, create_ioc, delete_ioc, list_vulnerabilities via combined endpoint).
// Integration: use-both
//   MCP-sourced tools (15): falcon_check_connectivity, falcon_list_enabled_modules, falcon_list_modules,
//     falcon_search_kubernetes_containers, falcon_count_kubernetes_containers, falcon_search_images_vulnerabilities,
//     falcon_search_detections, falcon_get_detection_details, falcon_search_applications,
//     falcon_search_unmanaged_assets, falcon_show_crowd_score, falcon_search_incidents,
//     falcon_get_incident_details, falcon_search_behaviors, falcon_get_behavior_details,
//     search_ngsiem, falcon_search_actors, falcon_search_indicators, falcon_search_reports,
//     falcon_get_mitre_report, falcon_search_iocs, falcon_search_sensor_usage,
//     falcon_search_scheduled_reports, falcon_search_report_executions, falcon_download_report_execution,
//     falcon_search_serverless_vulnerabilities, falcon_search_vulnerabilities, idp_investigate_entity,
//     falcon_add_ioc, falcon_remove_iocs, falcon_launch_scheduled_report
//   REST-sourced tools (18): list_detections, get_detection, update_detection, search_hosts,
//     get_host_detail, quarantine_host, lift_quarantine, search_incidents, get_incident,
//     list_host_groups, get_host_group, list_host_group_members, list_prevention_policies,
//     get_prevention_policy, search_iocs, create_ioc, delete_ioc, list_vulnerabilities
//   Combined coverage: union of both (FederationManager routes MCP-shared tools through vendor MCP)
//
// Base URL: https://api.crowdstrike.com (US-1), https://api.us-2.crowdstrike.com (US-2),
//           https://api.eu-1.crowdstrike.com (EU-1), https://api.laggar.gcw.crowdstrike.com (Gov)
// Auth: OAuth2 client credentials — POST /oauth2/token with client_id + client_secret in form body
// Docs: https://www.falconpy.io/Operations/All-Operations.html
// Rate limits: Varies by endpoint; default 6000 req/min per token

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface CrowdStrikeConfig {
  clientId: string;
  clientSecret: string;
  baseUrl?: string;
}

export class CrowdStrikeMCPServer extends MCPAdapterBase {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly baseUrl: string;
  private bearerToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(config: CrowdStrikeConfig) {
    super();
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.baseUrl = config.baseUrl ?? 'https://api.crowdstrike.com';
  }

  static catalog() {
    return {
      name: 'crowdstrike',
      displayName: 'CrowdStrike Falcon',
      version: '1.0.0',
      category: 'cybersecurity' as const,
      keywords: [
        'crowdstrike', 'falcon', 'edr', 'endpoint', 'detection', 'threat', 'incident',
        'host', 'quarantine', 'contain', 'ioc', 'indicator', 'prevention', 'policy',
        'sensor', 'host group', 'real time response', 'rtr', 'intel', 'adversary',
        'vulnerability', 'spotlight', 'alert', 'siem',
      ],
      toolNames: [
        'list_detections', 'get_detection', 'update_detection',
        'search_hosts', 'get_host_detail', 'quarantine_host', 'lift_quarantine',
        'search_incidents', 'get_incident',
        'list_host_groups', 'get_host_group', 'list_host_group_members',
        'list_prevention_policies', 'get_prevention_policy',
        'search_iocs', 'create_ioc', 'delete_ioc',
        'list_vulnerabilities',
      ],
      description: 'CrowdStrike Falcon endpoint detection and response: search detections, manage hosts, quarantine endpoints, query incidents and alerts, manage IOCs, prevention policies, and vulnerability spotlight.',
      author: 'protectnil' as const,
    };
  }

  private async getOrRefreshToken(): Promise<string> {
    const now = Date.now();
    if (this.bearerToken && this.tokenExpiry > now) return this.bearerToken;

    const response = await this.fetchWithRetry(`${this.baseUrl}/oauth2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        grant_type: 'client_credentials',
      }).toString(),
    });

    if (!response.ok) {
      throw new Error(`CrowdStrike OAuth2 token request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as { access_token: string; expires_in: number };
    this.bearerToken = data.access_token;
    this.tokenExpiry = now + (data.expires_in - 60) * 1000;
    return this.bearerToken;
  }

  private async get(path: string): Promise<ToolResult> {
    const token = await this.getOrRefreshToken();
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error ${response.status}: ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch {
      throw new Error(`CrowdStrike returned non-JSON response (HTTP ${response.status})`);
    }
    return this.ok(data);
  }

  private async post(path: string, body: unknown): Promise<ToolResult> {
    const token = await this.getOrRefreshToken();
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error ${response.status}: ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch {
      throw new Error(`CrowdStrike returned non-JSON response (HTTP ${response.status})`);
    }
    return this.ok(data);
  }

  private async patch(path: string, body: unknown): Promise<ToolResult> {
    const token = await this.getOrRefreshToken();
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error ${response.status}: ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch {
      throw new Error(`CrowdStrike returned non-JSON response (HTTP ${response.status})`);
    }
    return this.ok(data);
  }

  private async del(path: string): Promise<ToolResult> {
    const token = await this.getOrRefreshToken();
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error ${response.status}: ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch {
      throw new Error(`CrowdStrike returned non-JSON response (HTTP ${response.status})`);
    }
    return this.ok(data);
  }

  private ok(data: unknown): ToolResult {
    const text = JSON.stringify(data, null, 2);
    const truncated = text.length > 10_000
      ? text.slice(0, 10_000) + `\n... [truncated, ${text.length} total chars]`
      : text;
    return { content: [{ type: 'text', text: truncated }], isError: false };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_detections',
        description: 'List Falcon detections with optional FQL filter, pagination, and sort — returns detection IDs and summaries',
        inputSchema: {
          type: 'object',
          properties: {
            filter: {
              type: 'string',
              description: 'FQL filter expression (e.g. "status:\'new\'+severity_name:\'High\'")',
            },
            limit: { type: 'number', description: 'Max detections to return (default: 50, max: 9999)' },
            offset: { type: 'number', description: 'Pagination offset (default: 0)' },
            sort: {
              type: 'string',
              description: 'Sort field and direction (e.g. "first_behavior.asc", "last_behavior.desc")',
            },
          },
        },
      },
      {
        name: 'get_detection',
        description: 'Get full summary details for one or more detections by detection ID array',
        inputSchema: {
          type: 'object',
          properties: {
            ids: {
              type: 'array',
              items: { type: 'string' },
              description: 'Array of detection IDs to retrieve (max 1000)',
            },
          },
          required: ['ids'],
        },
      },
      {
        name: 'update_detection',
        description: 'Update the status or assigned-to user on one or more detections by detection ID array',
        inputSchema: {
          type: 'object',
          properties: {
            ids: {
              type: 'array',
              items: { type: 'string' },
              description: 'Array of detection IDs to update',
            },
            status: {
              type: 'string',
              description: 'New status: new, in_progress, true_positive, false_positive, ignored, closed, reopened',
            },
            assigned_to_uuid: {
              type: 'string',
              description: 'UUID of the user to assign the detections to',
            },
            comment: { type: 'string', description: 'Comment to add to the detection update' },
          },
          required: ['ids'],
        },
      },
      {
        name: 'search_hosts',
        description: 'Search for hosts in Falcon with optional FQL filter for hostname, IP, OS, tags, and sensor version',
        inputSchema: {
          type: 'object',
          properties: {
            filter: {
              type: 'string',
              description: 'FQL filter (e.g. "hostname:\'myhost\'+platform_name:\'Windows\'")',
            },
            limit: { type: 'number', description: 'Max hosts to return (default: 50, max: 5000)' },
            offset: { type: 'number', description: 'Pagination offset (default: 0)' },
            sort: { type: 'string', description: 'Sort expression (e.g. "hostname.asc")' },
          },
        },
      },
      {
        name: 'get_host_detail',
        description: 'Get detailed information for one or more hosts by agent ID (device_id) array',
        inputSchema: {
          type: 'object',
          properties: {
            ids: {
              type: 'array',
              items: { type: 'string' },
              description: 'Array of host agent IDs (device_id) to retrieve details for',
            },
          },
          required: ['ids'],
        },
      },
      {
        name: 'quarantine_host',
        description: 'Contain (network-isolate) one or more hosts to stop lateral movement during an active incident',
        inputSchema: {
          type: 'object',
          properties: {
            ids: {
              type: 'array',
              items: { type: 'string' },
              description: 'Array of host agent IDs (device_id) to contain',
            },
          },
          required: ['ids'],
        },
      },
      {
        name: 'lift_quarantine',
        description: 'Lift network containment from one or more hosts to restore normal network connectivity',
        inputSchema: {
          type: 'object',
          properties: {
            ids: {
              type: 'array',
              items: { type: 'string' },
              description: 'Array of host agent IDs (device_id) to lift containment from',
            },
          },
          required: ['ids'],
        },
      },
      {
        name: 'search_incidents',
        description: 'Search Falcon incidents (Automated Leads) using Alerts API v2 with FQL filter and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            filter: {
              type: 'string',
              description: 'FQL filter expression (e.g. "severity:>=\'High\'+status:\'new\'")',
            },
            limit: { type: 'number', description: 'Max alert IDs to return (default: 50)' },
            sort: { type: 'string', description: 'Sort expression (e.g. "created_timestamp|desc")' },
            after: { type: 'string', description: 'Pagination cursor token from a previous response' },
          },
        },
      },
      {
        name: 'get_incident',
        description: 'Get full details for one or more incidents by composite alert ID using Alerts API v2',
        inputSchema: {
          type: 'object',
          properties: {
            composite_ids: {
              type: 'array',
              items: { type: 'string' },
              description: 'Array of composite alert IDs returned by search_incidents',
            },
          },
          required: ['composite_ids'],
        },
      },
      {
        name: 'list_host_groups',
        description: 'List Falcon host groups with optional FQL filter for name and type',
        inputSchema: {
          type: 'object',
          properties: {
            filter: {
              type: 'string',
              description: 'FQL filter (e.g. "group_type:\'static\'")',
            },
            limit: { type: 'number', description: 'Max groups to return (default: 50)' },
            offset: { type: 'number', description: 'Pagination offset (default: 0)' },
          },
        },
      },
      {
        name: 'get_host_group',
        description: 'Get host group details and policy assignments by group ID array',
        inputSchema: {
          type: 'object',
          properties: {
            ids: {
              type: 'array',
              items: { type: 'string' },
              description: 'Array of host group IDs to retrieve',
            },
          },
          required: ['ids'],
        },
      },
      {
        name: 'list_host_group_members',
        description: 'List hosts that are members of a specific host group by group ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Host group ID to list members for' },
            filter: { type: 'string', description: 'Optional FQL filter to narrow members' },
            limit: { type: 'number', description: 'Max members to return (default: 50)' },
            offset: { type: 'number', description: 'Pagination offset (default: 0)' },
          },
          required: ['id'],
        },
      },
      {
        name: 'list_prevention_policies',
        description: 'List Falcon prevention policies with optional FQL filter for platform and name',
        inputSchema: {
          type: 'object',
          properties: {
            filter: {
              type: 'string',
              description: 'FQL filter (e.g. "platform_name:\'Windows\'")',
            },
            limit: { type: 'number', description: 'Max policies to return (default: 50)' },
            offset: { type: 'number', description: 'Pagination offset (default: 0)' },
          },
        },
      },
      {
        name: 'get_prevention_policy',
        description: 'Get prevention policy details including enabled/disabled prevention behaviors by policy ID array',
        inputSchema: {
          type: 'object',
          properties: {
            ids: {
              type: 'array',
              items: { type: 'string' },
              description: 'Array of prevention policy IDs to retrieve',
            },
          },
          required: ['ids'],
        },
      },
      {
        name: 'search_iocs',
        description: 'Search custom IOC indicators with FQL filter for type, value, severity, and action',
        inputSchema: {
          type: 'object',
          properties: {
            filter: {
              type: 'string',
              description: 'FQL filter (e.g. "type:\'domain\'+action:\'block\'")',
            },
            limit: { type: 'number', description: 'Max IOCs to return (default: 50, max: 2000)' },
            offset: { type: 'number', description: 'Pagination offset (default: 0)' },
            sort: { type: 'string', description: 'Sort expression (e.g. "created_on.desc")' },
          },
        },
      },
      {
        name: 'create_ioc',
        description: 'Create one or more custom IOC indicators for detection or blocking in Falcon',
        inputSchema: {
          type: 'object',
          properties: {
            indicators: {
              type: 'array',
              description: 'Array of IOC objects with type (md5, sha256, domain, ipv4, ipv6), value, action (detect, prevent, no_action), severity, and optional comment and expiration',
            },
          },
          required: ['indicators'],
        },
      },
      {
        name: 'delete_ioc',
        description: 'Delete custom IOC indicators by IOC ID array',
        inputSchema: {
          type: 'object',
          properties: {
            ids: {
              type: 'array',
              items: { type: 'string' },
              description: 'Array of IOC IDs to delete',
            },
          },
          required: ['ids'],
        },
      },
      {
        name: 'list_vulnerabilities',
        description: 'List Falcon Spotlight vulnerabilities with optional FQL filter for severity, CVE, and host',
        inputSchema: {
          type: 'object',
          properties: {
            filter: {
              type: 'string',
              description: 'FQL filter (e.g. "cve.severity:\'CRITICAL\'+status:\'open\'")',
            },
            limit: { type: 'number', description: 'Max vulnerabilities to return (default: 100, max: 400)' },
            after: { type: 'string', description: 'Pagination cursor from a previous response' },
            sort: { type: 'string', description: 'Sort expression (e.g. "created_timestamp.desc")' },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_detections':
          return this.listDetections(args);
        case 'get_detection':
          return this.getDetection(args);
        case 'update_detection':
          return this.updateDetection(args);
        case 'search_hosts':
          return this.searchHosts(args);
        case 'get_host_detail':
          return this.getHostDetail(args);
        case 'quarantine_host':
          return this.quarantineHost(args);
        case 'lift_quarantine':
          return this.liftQuarantine(args);
        case 'search_incidents':
          return this.searchIncidents(args);
        case 'get_incident':
          return this.getIncident(args);
        case 'list_host_groups':
          return this.listHostGroups(args);
        case 'get_host_group':
          return this.getHostGroup(args);
        case 'list_host_group_members':
          return this.listHostGroupMembers(args);
        case 'list_prevention_policies':
          return this.listPreventionPolicies(args);
        case 'get_prevention_policy':
          return this.getPreventionPolicy(args);
        case 'search_iocs':
          return this.searchIocs(args);
        case 'create_ioc':
          return this.createIoc(args);
        case 'delete_ioc':
          return this.deleteIoc(args);
        case 'list_vulnerabilities':
          return this.listVulnerabilities(args);
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

  private async listDetections(args: Record<string, unknown>): Promise<ToolResult> {
    const limit = (args.limit as number) ?? 50;
    const offset = (args.offset as number) ?? 0;
    const filter = args.filter as string | undefined;
    const sort = args.sort as string | undefined;
    let url = `/detects/queries/detects/v1?limit=${limit}&offset=${offset}`;
    if (filter) url += `&filter=${encodeURIComponent(filter)}`;
    if (sort) url += `&sort=${encodeURIComponent(sort)}`;
    return this.get(url);
  }

  private async getDetection(args: Record<string, unknown>): Promise<ToolResult> {
    const ids = args.ids as string[];
    if (!ids || ids.length === 0) return { content: [{ type: 'text', text: 'ids is required and must not be empty' }], isError: true };
    return this.post('/detects/entities/summaries/GET/v1', { ids });
  }

  private async updateDetection(args: Record<string, unknown>): Promise<ToolResult> {
    const ids = args.ids as string[];
    if (!ids || ids.length === 0) return { content: [{ type: 'text', text: 'ids is required and must not be empty' }], isError: true };
    const body: Record<string, unknown> = { ids };
    if (args.status) body.status = args.status;
    if (args.assigned_to_uuid) body.assigned_to_uuid = args.assigned_to_uuid;
    if (args.comment) body.comment = args.comment;
    return this.patch('/detects/entities/detects/v2', body);
  }

  private async searchHosts(args: Record<string, unknown>): Promise<ToolResult> {
    const limit = (args.limit as number) ?? 50;
    const offset = (args.offset as number) ?? 0;
    const filter = args.filter as string | undefined;
    const sort = args.sort as string | undefined;
    let url = `/hosts/queries/devices/v1?limit=${limit}&offset=${offset}`;
    if (filter) url += `&filter=${encodeURIComponent(filter)}`;
    if (sort) url += `&sort=${encodeURIComponent(sort)}`;
    return this.get(url);
  }

  private async getHostDetail(args: Record<string, unknown>): Promise<ToolResult> {
    const ids = args.ids as string[];
    if (!ids || ids.length === 0) return { content: [{ type: 'text', text: 'ids is required and must not be empty' }], isError: true };
    return this.post('/hosts/entities/devices/GET/v2', { ids });
  }

  private async quarantineHost(args: Record<string, unknown>): Promise<ToolResult> {
    const ids = args.ids as string[];
    if (!ids || ids.length === 0) return { content: [{ type: 'text', text: 'ids is required and must not be empty' }], isError: true };
    return this.post('/devices/entities/devices-actions/v2?action_name=contain', { ids });
  }

  private async liftQuarantine(args: Record<string, unknown>): Promise<ToolResult> {
    const ids = args.ids as string[];
    if (!ids || ids.length === 0) return { content: [{ type: 'text', text: 'ids is required and must not be empty' }], isError: true };
    return this.post('/devices/entities/devices-actions/v2?action_name=lift_containment', { ids });
  }

  private async searchIncidents(args: Record<string, unknown>): Promise<ToolResult> {
    const limit = (args.limit as number) ?? 50;
    const filter = args.filter as string | undefined;
    const sort = args.sort as string | undefined;
    const after = args.after as string | undefined;
    let url = `/alerts/queries/alerts/v2?limit=${limit}`;
    if (filter) url += `&filter=${encodeURIComponent(filter)}`;
    if (sort) url += `&sort=${encodeURIComponent(sort)}`;
    if (after) url += `&after=${encodeURIComponent(after)}`;
    return this.get(url);
  }

  private async getIncident(args: Record<string, unknown>): Promise<ToolResult> {
    const compositeIds = args.composite_ids as string[];
    if (!compositeIds || compositeIds.length === 0) {
      return { content: [{ type: 'text', text: 'composite_ids is required and must not be empty' }], isError: true };
    }
    return this.post('/alerts/entities/alerts/v2', { composite_ids: compositeIds });
  }

  private async listHostGroups(args: Record<string, unknown>): Promise<ToolResult> {
    const limit = (args.limit as number) ?? 50;
    const offset = (args.offset as number) ?? 0;
    const filter = args.filter as string | undefined;
    let url = `/devices/queries/host-groups/v1?limit=${limit}&offset=${offset}`;
    if (filter) url += `&filter=${encodeURIComponent(filter)}`;
    return this.get(url);
  }

  private async getHostGroup(args: Record<string, unknown>): Promise<ToolResult> {
    const ids = args.ids as string[];
    if (!ids || ids.length === 0) return { content: [{ type: 'text', text: 'ids is required and must not be empty' }], isError: true };
    const idsParam = ids.map(id => `ids=${encodeURIComponent(id)}`).join('&');
    return this.get(`/devices/entities/host-groups/v1?${idsParam}`);
  }

  private async listHostGroupMembers(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.id as string;
    if (!id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    const limit = (args.limit as number) ?? 50;
    const offset = (args.offset as number) ?? 0;
    const filter = args.filter as string | undefined;
    let url = `/devices/queries/host-group-members/v1?id=${encodeURIComponent(id)}&limit=${limit}&offset=${offset}`;
    if (filter) url += `&filter=${encodeURIComponent(filter)}`;
    return this.get(url);
  }

  private async listPreventionPolicies(args: Record<string, unknown>): Promise<ToolResult> {
    const limit = (args.limit as number) ?? 50;
    const offset = (args.offset as number) ?? 0;
    const filter = args.filter as string | undefined;
    let url = `/policy/queries/prevention/v1?limit=${limit}&offset=${offset}`;
    if (filter) url += `&filter=${encodeURIComponent(filter)}`;
    return this.get(url);
  }

  private async getPreventionPolicy(args: Record<string, unknown>): Promise<ToolResult> {
    const ids = args.ids as string[];
    if (!ids || ids.length === 0) return { content: [{ type: 'text', text: 'ids is required and must not be empty' }], isError: true };
    const idsParam = ids.map(id => `ids=${encodeURIComponent(id)}`).join('&');
    return this.get(`/policy/entities/prevention/v1?${idsParam}`);
  }

  private async searchIocs(args: Record<string, unknown>): Promise<ToolResult> {
    const limit = (args.limit as number) ?? 50;
    const offset = (args.offset as number) ?? 0;
    const filter = args.filter as string | undefined;
    const sort = args.sort as string | undefined;
    let url = `/iocs/queries/indicators/v1?limit=${limit}&offset=${offset}`;
    if (filter) url += `&filter=${encodeURIComponent(filter)}`;
    if (sort) url += `&sort=${encodeURIComponent(sort)}`;
    return this.get(url);
  }

  private async createIoc(args: Record<string, unknown>): Promise<ToolResult> {
    const indicators = args.indicators as unknown[];
    if (!indicators || indicators.length === 0) {
      return { content: [{ type: 'text', text: 'indicators is required and must not be empty' }], isError: true };
    }
    return this.post('/iocs/entities/indicators/v1', { indicators });
  }

  private async deleteIoc(args: Record<string, unknown>): Promise<ToolResult> {
    const ids = args.ids as string[];
    if (!ids || ids.length === 0) return { content: [{ type: 'text', text: 'ids is required and must not be empty' }], isError: true };
    const idsParam = ids.map(id => `ids=${encodeURIComponent(id)}`).join('&');
    return this.del(`/iocs/entities/indicators/v1?${idsParam}`);
  }

  private async listVulnerabilities(args: Record<string, unknown>): Promise<ToolResult> {
    const limit = (args.limit as number) ?? 100;
    const filter = args.filter as string | undefined;
    const after = args.after as string | undefined;
    const sort = args.sort as string | undefined;
    let url = `/spotlight/queries/vulnerabilities/v1?limit=${limit}`;
    if (filter) url += `&filter=${encodeURIComponent(filter)}`;
    if (after) url += `&after=${encodeURIComponent(after)}`;
    if (sort) url += `&sort=${encodeURIComponent(sort)}`;
    return this.get(url);
  }
}

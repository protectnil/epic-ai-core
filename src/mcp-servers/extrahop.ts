/**
 * ExtraHop MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// No official ExtraHop MCP server was found on GitHub or the MCP registry.
//
// Base URL: https://<hostname>/api/v1  (customer-specific hostname required via baseUrl config)
//   RevealX 360 (cloud): https://<tenant>.cloud.extrahop.com/api/v1
//   On-premises: https://<appliance-ip-or-hostname>/api/v1
// Auth: API key in Authorization header — format: "ExtraHop apikey=<key>"
//   RevealX 360 uses Bearer token (generate via POST /oauth2/token)
//   On-premises uses: Authorization: ExtraHop apikey=<your-api-key>
// Docs: https://docs.extrahop.com/current/rest-api-guide/
// Rate limits: Not publicly documented; standard REST backoff on 429 responses recommended

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface ExtraHopConfig {
  apiKey: string;
  /** Full base URL including hostname, e.g. https://myappliance.example.com/api/v1 */
  baseUrl: string;
  /** Auth mode: 'apikey' (on-premises default) or 'bearer' (RevealX 360) */
  authMode?: 'apikey' | 'bearer';
}

export class ExtraHopMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly authMode: 'apikey' | 'bearer';

  constructor(config: ExtraHopConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.authMode = config.authMode || 'apikey';
  }

  static catalog() {
    return {
      name: 'extrahop',
      displayName: 'ExtraHop',
      version: '1.0.0',
      category: 'cybersecurity',
      keywords: [
        'extrahop', 'ndr', 'network detection', 'network response', 'revealx', 'reveal(x)',
        'network traffic', 'device', 'detection', 'alert', 'threat', 'intrusion', 'anomaly',
        'protocol', 'network forensics', 'east-west traffic', 'packet', 'appliance',
        'network security', 'lateral movement', 'network monitoring',
      ],
      toolNames: [
        'search_devices',
        'get_device',
        'list_device_protocols',
        'list_detections',
        'get_detection',
        'update_detection',
        'list_alerts',
        'get_alert',
        'create_alert',
        'list_networks',
        'get_network',
        'list_appliances',
        'get_appliance',
        'query_metrics',
        'search_records',
        'list_device_groups',
        'get_extrahop_system_info',
      ],
      description: 'ExtraHop NDR: search devices, retrieve detections and alerts, query network metrics, search records, manage appliances, and monitor network activity for threats.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'search_devices',
        description: 'Search for network devices by name, IP address, MAC address, role, or activity with optional pagination',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Device display name or hostname to search for',
            },
            ip: {
              type: 'string',
              description: 'IP address (IPv4 or IPv6) to search for',
            },
            mac: {
              type: 'string',
              description: 'MAC address to search for (e.g. AA:BB:CC:DD:EE:FF)',
            },
            role: {
              type: 'string',
              description: 'Device role filter: http_server, dns_server, database, gateway, printer, voip, workstation, other',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results to return (default: 100, max: 1000)',
            },
            offset: {
              type: 'number',
              description: 'Offset for pagination (default: 0)',
            },
          },
        },
      },
      {
        name: 'get_device',
        description: 'Retrieve full details for a specific network device by device ID including IP, MAC, vendor, and activity',
        inputSchema: {
          type: 'object',
          properties: {
            device_id: {
              type: 'number',
              description: 'ExtraHop device ID (numeric)',
            },
          },
          required: ['device_id'],
        },
      },
      {
        name: 'list_device_protocols',
        description: 'List active network protocols for a specific device over a given time window',
        inputSchema: {
          type: 'object',
          properties: {
            device_id: {
              type: 'number',
              description: 'ExtraHop device ID (numeric)',
            },
            from: {
              type: 'number',
              description: 'Start of time window in milliseconds since epoch (default: 30 minutes ago)',
            },
            until: {
              type: 'number',
              description: 'End of time window in milliseconds since epoch (default: now)',
            },
          },
          required: ['device_id'],
        },
      },
      {
        name: 'list_detections',
        description: 'List NDR detections with optional filters for status, risk score, category, and time window',
        inputSchema: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              description: 'Filter by status: open (null/unassigned), new, in_progress, closed, acknowledged (default: open)',
            },
            risk_score_min: {
              type: 'number',
              description: 'Minimum risk score to include (0-100)',
            },
            categories: {
              type: 'string',
              description: 'Comma-separated detection categories: lateral_movement, command_and_control, exfiltration, exploitation, reconnaissance, suspicious',
            },
            from: {
              type: 'number',
              description: 'Start of time window in milliseconds since epoch (default: 24 hours ago)',
            },
            until: {
              type: 'number',
              description: 'End of time window in milliseconds since epoch (default: now)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of detections to return (default: 50, max: 200)',
            },
            offset: {
              type: 'number',
              description: 'Offset for pagination (default: 0)',
            },
          },
        },
      },
      {
        name: 'get_detection',
        description: 'Retrieve full details for a specific detection by ID including participants, risk score, and MITRE ATT&CK mapping',
        inputSchema: {
          type: 'object',
          properties: {
            detection_id: {
              type: 'number',
              description: 'ExtraHop detection ID (numeric)',
            },
          },
          required: ['detection_id'],
        },
      },
      {
        name: 'update_detection',
        description: 'Update the status, assignee, or notes on an ExtraHop detection (acknowledge, close, reopen, or reassign)',
        inputSchema: {
          type: 'object',
          properties: {
            detection_id: {
              type: 'number',
              description: 'ExtraHop detection ID to update',
            },
            status: {
              type: 'string',
              description: 'New status: acknowledged, in_progress, closed, new (open detections have null status)',
            },
            assignee: {
              type: 'string',
              description: 'Username to assign the detection to',
            },
            resolution: {
              type: 'string',
              description: 'Resolution reason when closing: action_taken, no_action_taken, duplicate (required if status is closed)',
            },
            note: {
              type: 'string',
              description: 'Note to add to the detection',
            },
          },
          required: ['detection_id'],
        },
      },
      {
        name: 'list_alerts',
        description: 'List configured alert rules with optional type and severity filters',
        inputSchema: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              description: 'Filter by alert type: threshold, detection (default: all)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of alert rules to return (default: 100)',
            },
            offset: {
              type: 'number',
              description: 'Offset for pagination (default: 0)',
            },
          },
        },
      },
      {
        name: 'get_alert',
        description: 'Retrieve the configuration of a specific alert rule by alert ID',
        inputSchema: {
          type: 'object',
          properties: {
            alert_id: {
              type: 'number',
              description: 'ExtraHop alert ID (numeric)',
            },
          },
          required: ['alert_id'],
        },
      },
      {
        name: 'create_alert',
        description: 'Create a threshold-based alert rule for a metric on a device or device group',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Alert rule name',
            },
            type: {
              type: 'string',
              description: 'Alert type: threshold or detection (default: threshold)',
            },
            object_type: {
              type: 'string',
              description: 'Object type to alert on: device, device_group, application, network (default: device)',
            },
            notify_snmp: {
              type: 'boolean',
              description: 'Whether to send SNMP notification (default: false)',
            },
            refire_interval: {
              type: 'number',
              description: 'Minimum time in seconds between repeat alerts (default: 300)',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'list_networks',
        description: 'List all network capture interfaces and VLAN configurations on the ExtraHop appliance',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of networks to return (default: 100)',
            },
            offset: {
              type: 'number',
              description: 'Offset for pagination (default: 0)',
            },
          },
        },
      },
      {
        name: 'get_network',
        description: 'Retrieve details for a specific network by network ID including VLAN, capture port, and traffic statistics',
        inputSchema: {
          type: 'object',
          properties: {
            network_id: {
              type: 'number',
              description: 'ExtraHop network ID (numeric)',
            },
          },
          required: ['network_id'],
        },
      },
      {
        name: 'list_appliances',
        description: 'List all ExtraHop appliances connected to the cluster including Sensors, ETAs, and ECA',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of appliances to return (default: 50)',
            },
            offset: {
              type: 'number',
              description: 'Offset for pagination (default: 0)',
            },
          },
        },
      },
      {
        name: 'get_appliance',
        description: 'Retrieve details for a specific ExtraHop appliance by ID including hostname, firmware version, and status',
        inputSchema: {
          type: 'object',
          properties: {
            appliance_id: {
              type: 'number',
              description: 'ExtraHop appliance ID (numeric)',
            },
          },
          required: ['appliance_id'],
        },
      },
      {
        name: 'query_metrics',
        description: 'Query network metrics for devices, applications, or networks over a time window using ExtraHop metric cycles',
        inputSchema: {
          type: 'object',
          properties: {
            object_type: {
              type: 'string',
              description: 'Object type to query: device, application, network, vlan (default: device)',
            },
            object_ids: {
              type: 'string',
              description: 'Comma-separated list of object IDs to query metrics for',
            },
            metric_category: {
              type: 'string',
              description: 'Metric category (e.g. http, dns, ssl, tcp, rx, tx)',
            },
            metric_specs: {
              type: 'string',
              description: 'Comma-separated metric names (e.g. req, rsp, error, bytes_in, bytes_out)',
            },
            from: {
              type: 'number',
              description: 'Start of time window in milliseconds since epoch (default: 30 minutes ago)',
            },
            until: {
              type: 'number',
              description: 'End of time window in milliseconds since epoch (default: now)',
            },
            cycle: {
              type: 'string',
              description: 'Metric resolution: auto, 30sec, 5min, 1hr (default: auto)',
            },
          },
          required: ['object_type', 'metric_category'],
        },
      },
      {
        name: 'search_records',
        description: 'Search ExtraHop transaction records (L7 flows, DNS, HTTP, SSL, etc.) with filter expressions and time window',
        inputSchema: {
          type: 'object',
          properties: {
            types: {
              type: 'string',
              description: 'Comma-separated record types: flow, dns, http, ssl, smb, dhcp, ldap (default: flow)',
            },
            filter: {
              type: 'string',
              description: 'Filter expression (e.g. {"field":"senderAddr","operator":"=","value":"10.0.0.1"})',
            },
            from: {
              type: 'number',
              description: 'Start of time window in milliseconds since epoch (default: 60 minutes ago)',
            },
            until: {
              type: 'number',
              description: 'End of time window in milliseconds since epoch (default: now)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of records to return (default: 100, max: 1000)',
            },
            offset: {
              type: 'number',
              description: 'Offset for pagination (default: 0)',
            },
          },
        },
      },
      {
        name: 'list_device_groups',
        description: 'List all device groups (static and dynamic) configured on the ExtraHop system',
        inputSchema: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              description: 'Filter by group type: static, dynamic, all (default: all)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of device groups to return (default: 100)',
            },
            offset: {
              type: 'number',
              description: 'Offset for pagination (default: 0)',
            },
          },
        },
      },
      {
        name: 'get_extrahop_system_info',
        description: 'Retrieve ExtraHop system information including hostname, firmware version, license status, and uptime',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'search_devices':
          return this.searchDevices(args);
        case 'get_device':
          return this.getDevice(args);
        case 'list_device_protocols':
          return this.listDeviceProtocols(args);
        case 'list_detections':
          return this.listDetections(args);
        case 'get_detection':
          return this.getDetection(args);
        case 'update_detection':
          return this.updateDetection(args);
        case 'list_alerts':
          return this.listAlerts(args);
        case 'get_alert':
          return this.getAlert(args);
        case 'create_alert':
          return this.createAlert(args);
        case 'list_networks':
          return this.listNetworks(args);
        case 'get_network':
          return this.getNetwork(args);
        case 'list_appliances':
          return this.listAppliances(args);
        case 'get_appliance':
          return this.getAppliance(args);
        case 'query_metrics':
          return this.queryMetrics(args);
        case 'search_records':
          return this.searchRecords(args);
        case 'list_device_groups':
          return this.listDeviceGroups(args);
        case 'get_extrahop_system_info':
          return this.getExtraHopSystemInfo();
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

  private get authHeader(): string {
    if (this.authMode === 'bearer') {
      return `Bearer ${this.apiKey}`;
    }
    return `ExtraHop apikey=${this.apiKey}`;
  }

  private get headers(): Record<string, string> {
    return {
      'Authorization': this.authHeader,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
  }

  private async ehGet(path: string, params: Record<string, string> = {}): Promise<ToolResult> {
    const qs = new URLSearchParams(params).toString();
    const url = `${this.baseUrl}${path}${qs ? '?' + qs : ''}`;
    const response = await this.fetchWithRetry(url, { headers: this.headers });

    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `ExtraHop API error: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }

    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async ehPost(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `ExtraHop API error: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }

    let data: unknown;
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = { status: response.status, message: 'Success (no JSON body returned)' };
    }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async ehPatch(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'PATCH',
      headers: this.headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `ExtraHop API error: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }

    let data: unknown;
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = { status: response.status, message: 'Detection updated successfully' };
    }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async searchDevices(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {
      limit: (args.limit as number) || 100,
      offset: (args.offset as number) || 0,
    };
    const filter: Record<string, unknown>[] = [];
    if (args.name) filter.push({ field: 'name', operator: '~', value: args.name });
    if (args.ip) filter.push({ field: 'ipaddr', operator: '=', value: args.ip });
    if (args.mac) filter.push({ field: 'macaddr', operator: '=', value: args.mac });
    if (args.role) filter.push({ field: 'role', operator: '=', value: args.role });
    if (filter.length > 0) {
      body.filter = filter.length === 1 ? filter[0] : { operator: 'and', rules: filter };
    }
    return this.ehPost('/devices/search', body);
  }

  private async getDevice(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.device_id === undefined) return { content: [{ type: 'text', text: 'device_id is required' }], isError: true };
    return this.ehGet(`/devices/${encodeURIComponent(args.device_id as number)}`);
  }

  private async listDeviceProtocols(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.device_id === undefined) return { content: [{ type: 'text', text: 'device_id is required' }], isError: true };
    const params: Record<string, string> = {};
    if (args.from) params.from = String(args.from as number);
    if (args.until) params.until = String(args.until as number);
    return this.ehGet(`/devices/${encodeURIComponent(args.device_id as number)}/protocols`, params);
  }

  private async listDetections(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {
      limit: (args.limit as number) || 50,
      offset: (args.offset as number) || 0,
      sort: [{ direction: 'desc', field: 'start_time' }],
    };
    // Build filter rules — multiple criteria combined with 'and'
    const rules: Record<string, unknown>[] = [];
    if (args.status) {
      // ExtraHop uses ".none" to match null (Open) status; other valid values: new, in_progress, closed, acknowledged
      const statusValue = args.status === 'open' ? '.none' : args.status as string;
      rules.push({ field: 'status', operator: '=', value: statusValue });
    }
    if (args.risk_score_min) {
      rules.push({ field: 'risk_score', operator: '>=', value: args.risk_score_min });
    }
    if (rules.length === 1) {
      body.filter = rules[0];
    } else if (rules.length > 1) {
      body.filter = { operator: 'and', rules };
    }
    if (args.from) body.from = args.from;
    if (args.until) body.until = args.until;
    return this.ehPost('/detections/search', body);
  }

  private async getDetection(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.detection_id === undefined) return { content: [{ type: 'text', text: 'detection_id is required' }], isError: true };
    return this.ehGet(`/detections/${encodeURIComponent(args.detection_id as number)}`);
  }

  private async updateDetection(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.detection_id === undefined) return { content: [{ type: 'text', text: 'detection_id is required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.status) body.status = args.status;
    if (args.assignee) body.assignee = args.assignee;
    if (args.resolution) body.resolution = args.resolution;
    if (args.note) body.note = args.note;
    return this.ehPatch(`/detections/${encodeURIComponent(args.detection_id as number)}`, body);
  }

  private async listAlerts(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      limit: String((args.limit as number) || 100),
      offset: String((args.offset as number) || 0),
    };
    if (args.type) params.type = args.type as string;
    return this.ehGet('/alerts', params);
  }

  private async getAlert(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.alert_id === undefined) return { content: [{ type: 'text', text: 'alert_id is required' }], isError: true };
    return this.ehGet(`/alerts/${encodeURIComponent(args.alert_id as number)}`);
  }

  private async createAlert(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name) return { content: [{ type: 'text', text: 'name is required' }], isError: true };
    const body: Record<string, unknown> = {
      name: args.name,
      type: (args.type as string) || 'threshold',
      object_type: (args.object_type as string) || 'device',
      notify_snmp: (args.notify_snmp as boolean) || false,
      refire_interval: (args.refire_interval as number) || 300,
    };
    return this.ehPost('/alerts', body);
  }

  private async listNetworks(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      limit: String((args.limit as number) || 100),
      offset: String((args.offset as number) || 0),
    };
    return this.ehGet('/networks', params);
  }

  private async getNetwork(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.network_id === undefined) return { content: [{ type: 'text', text: 'network_id is required' }], isError: true };
    return this.ehGet(`/networks/${encodeURIComponent(args.network_id as number)}`);
  }

  private async listAppliances(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      limit: String((args.limit as number) || 50),
      offset: String((args.offset as number) || 0),
    };
    return this.ehGet('/appliances', params);
  }

  private async getAppliance(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.appliance_id === undefined) return { content: [{ type: 'text', text: 'appliance_id is required' }], isError: true };
    return this.ehGet(`/appliances/${encodeURIComponent(args.appliance_id as number)}`);
  }

  private async queryMetrics(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.object_type || !args.metric_category) {
      return { content: [{ type: 'text', text: 'object_type and metric_category are required' }], isError: true };
    }
    const now = Date.now();
    const body: Record<string, unknown> = {
      cycle: (args.cycle as string) || 'auto',
      from: (args.from as number) || now - 30 * 60 * 1000,
      until: (args.until as number) || now,
      metric_category: args.metric_category,
      object_type: args.object_type,
      metric_specs: args.metric_specs
        ? (args.metric_specs as string).split(',').map((s) => ({ name: s.trim() }))
        : [{ name: 'bytes_in' }, { name: 'bytes_out' }],
    };
    if (args.object_ids) {
      body.object_ids = (args.object_ids as string).split(',').map((id) => parseInt(id.trim(), 10));
    }
    return this.ehPost('/metrics', body);
  }

  private async searchRecords(args: Record<string, unknown>): Promise<ToolResult> {
    const now = Date.now();
    const body: Record<string, unknown> = {
      from: (args.from as number) || now - 60 * 60 * 1000,
      until: (args.until as number) || now,
      limit: (args.limit as number) || 100,
      offset: (args.offset as number) || 0,
      types: args.types
        ? (args.types as string).split(',').map((t) => t.trim())
        : ['flow'],
    };
    if (args.filter) {
      try {
        body.filter = JSON.parse(args.filter as string);
      } catch {
        return { content: [{ type: 'text', text: 'filter must be valid JSON (e.g. {"field":"senderAddr","operator":"=","value":"10.0.0.1"})' }], isError: true };
      }
    }
    return this.ehPost('/records/search', body);
  }

  private async listDeviceGroups(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      limit: String((args.limit as number) || 100),
      offset: String((args.offset as number) || 0),
    };
    if (args.type && args.type !== 'all') params.type = args.type as string;
    return this.ehGet('/devicegroups', params);
  }

  private async getExtraHopSystemInfo(): Promise<ToolResult> {
    return this.ehGet('/extrahop');
  }
}

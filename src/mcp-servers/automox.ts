/**
 * Automox MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28.
//   Community MCP exists: https://github.com/AutomoxCommunity/automox-mcp — published by AutomoxCommunity
//   (NOT the official Automox vendor). Transport: stdio + streamable-HTTP + SSE (FastMCP). Auth: API key.
//   Last commit: February 23, 2026. v0.1.0 only (2 commits total). Pre-1.0 stability warning — not suitable for production.
//   Fails MCP criterion 1 (not published by vendor) and criterion 3 (pre-1.0 with stability caution).
//   Community MCP covers: 18 workflow-oriented tools (list_devices, device_detail, devices_needing_attention,
//   search_devices, device_health_metrics, execute_device_command, policy_health_overview, policy_execution_timeline,
//   policy_run_results, policy_catalog, policy_detail, apply_policy_changes, patch_approvals_summary,
//   decide_patch_approval, execute_policy_now, invite_user_to_account, remove_user_from_account,
//   audit_trail_user_activity). Our adapter covers: 20 tools (full REST surface).
// Recommendation: use-rest-api — community MCP is not official and pre-1.0. Use this REST adapter for
//   direct API coverage. Revisit if Automox publishes an official vendor MCP server.
//
// Base URL: https://console.automox.com/api
// Auth: Bearer API key in Authorization header. Obtain from Automox Console → Settings → Keys.
//   Also requires org_id query parameter on most endpoints (found in Console URL as ?o=<org_id>).
// Docs: https://developer.automox.com/  |  https://docs.automox.com/api/
// Rate limits: 100 req/sec (authenticated), 30 req/min on device endpoints. 429 = back off 60s.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface AutomoxConfig {
  apiKey: string;
  orgId: string | number;
  baseUrl?: string;
}

export class AutomoxMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly orgId: string;
  private readonly baseUrl: string;

  constructor(config: AutomoxConfig) {
    super();
    this.apiKey = config.apiKey;
    this.orgId = String(config.orgId);
    this.baseUrl = (config.baseUrl ?? 'https://console.automox.com/api').replace(/\/$/, '');
  }

  static catalog() {
    return {
      name: 'automox',
      displayName: 'Automox',
      version: '1.0.0',
      category: 'cybersecurity' as const,
      keywords: [
        'automox', 'endpoint', 'patch management', 'patching', 'vulnerability',
        'device', 'policy', 'worklet', 'compliance', 'remediation',
        'software', 'packages', 'update', 'security', 'IT management',
      ],
      toolNames: [
        'list_organizations', 'get_organization',
        'list_devices', 'get_device', 'update_device', 'delete_device',
        'run_device_command', 'list_device_packages', 'list_device_queues',
        'list_policies', 'get_policy', 'create_policy', 'update_policy', 'delete_policy',
        'execute_policy',
        'list_packages', 'approve_package', 'reject_package',
        'list_groups', 'get_group',
      ],
      description: 'Automox endpoint patch management: manage devices, policies, software packages, patch approvals, and remote command execution.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_organizations',
        description: 'List all organizations accessible to the authenticated API key',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_organization',
        description: 'Get details for a specific Automox organization by its ID',
        inputSchema: {
          type: 'object',
          properties: {
            org_id: {
              type: 'string',
              description: 'Organization ID (defaults to the configured org_id)',
            },
          },
        },
      },
      {
        name: 'list_devices',
        description: 'List all devices (endpoints) in the organization with health, patch status, and OS information',
        inputSchema: {
          type: 'object',
          properties: {
            group_id: {
              type: 'number',
              description: 'Filter devices by group ID',
            },
            limit: {
              type: 'number',
              description: 'Number of devices per page (1-500, default: 500)',
            },
            page: {
              type: 'number',
              description: 'Page number starting at 0 (default: 0)',
            },
          },
        },
      },
      {
        name: 'get_device',
        description: 'Get detailed information for a specific device including OS, last check-in, patch status, and agent version',
        inputSchema: {
          type: 'object',
          properties: {
            device_id: {
              type: 'number',
              description: 'Automox device (server) ID',
            },
          },
          required: ['device_id'],
        },
      },
      {
        name: 'update_device',
        description: 'Update device properties such as display name, IP override, tags, or assigned server group',
        inputSchema: {
          type: 'object',
          properties: {
            device_id: {
              type: 'number',
              description: 'Automox device ID to update',
            },
            server_group_id: {
              type: 'number',
              description: 'New server group ID to assign the device to',
            },
            display_name: {
              type: 'string',
              description: 'New display name for the device',
            },
            tags: {
              type: 'string',
              description: 'Comma-separated tags to assign to the device',
            },
            ip_addrs: {
              type: 'string',
              description: 'Override IP address for the device',
            },
          },
          required: ['device_id'],
        },
      },
      {
        name: 'delete_device',
        description: 'Remove a device from the Automox organization (does not uninstall the agent)',
        inputSchema: {
          type: 'object',
          properties: {
            device_id: {
              type: 'number',
              description: 'Automox device ID to delete from the organization',
            },
          },
          required: ['device_id'],
        },
      },
      {
        name: 'run_device_command',
        description: 'Issue an immediate command to a device: GetOS (scan), InstallUpdate (patch), or Reboot',
        inputSchema: {
          type: 'object',
          properties: {
            device_id: {
              type: 'number',
              description: 'Automox device ID to issue the command to',
            },
            command: {
              type: 'string',
              description: 'Command to execute: GetOS (inventory scan), InstallUpdate (patch all pending), or Reboot',
            },
          },
          required: ['device_id', 'command'],
        },
      },
      {
        name: 'list_device_packages',
        description: 'List all software packages on a specific device including pending updates and installed applications',
        inputSchema: {
          type: 'object',
          properties: {
            device_id: {
              type: 'number',
              description: 'Automox device ID to list packages for',
            },
            limit: {
              type: 'number',
              description: 'Number of packages per page (1-500, default: 500)',
            },
            page: {
              type: 'number',
              description: 'Page number starting at 0 (default: 0)',
            },
          },
          required: ['device_id'],
        },
      },
      {
        name: 'list_device_queues',
        description: 'List commands currently queued for execution on a specific device',
        inputSchema: {
          type: 'object',
          properties: {
            device_id: {
              type: 'number',
              description: 'Automox device ID to check the command queue for',
            },
          },
          required: ['device_id'],
        },
      },
      {
        name: 'list_policies',
        description: 'List all patch and worklet policies in the organization with schedule, type, and configuration',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Number of policies per page (1-500, default: 500)',
            },
            page: {
              type: 'number',
              description: 'Page number starting at 0 (default: 0)',
            },
          },
        },
      },
      {
        name: 'get_policy',
        description: 'Get detailed configuration for a specific Automox policy by its ID',
        inputSchema: {
          type: 'object',
          properties: {
            policy_id: {
              type: 'number',
              description: 'Automox policy ID',
            },
          },
          required: ['policy_id'],
        },
      },
      {
        name: 'create_policy',
        description: 'Create a new patch or worklet policy with schedule, device group assignment, and configuration',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Display name for the new policy',
            },
            policy_type_name: {
              type: 'string',
              description: 'Policy type: patch (automated patching) or custom (worklet script)',
            },
            server_groups: {
              type: 'string',
              description: 'Comma-separated list of server group IDs to assign this policy to',
            },
            schedule_days: {
              type: 'number',
              description: 'Bitmask of days to run (Sunday=1, Monday=2, Tuesday=4, Wednesday=8, Thursday=16, Friday=32, Saturday=64)',
            },
            schedule_time: {
              type: 'string',
              description: 'Time of day to run the policy in HH:MM format (24-hour)',
            },
            schedule_weeks_of_month: {
              type: 'string',
              description: 'Comma-separated week numbers (1-5) or ALL',
            },
          },
          required: ['name', 'policy_type_name'],
        },
      },
      {
        name: 'update_policy',
        description: 'Update the configuration, schedule, or device group assignment of an existing policy',
        inputSchema: {
          type: 'object',
          properties: {
            policy_id: {
              type: 'number',
              description: 'Automox policy ID to update',
            },
            name: {
              type: 'string',
              description: 'Updated policy display name',
            },
            server_groups: {
              type: 'string',
              description: 'Updated comma-separated list of server group IDs',
            },
            schedule_days: {
              type: 'number',
              description: 'Updated schedule bitmask',
            },
            schedule_time: {
              type: 'string',
              description: 'Updated schedule time in HH:MM format',
            },
          },
          required: ['policy_id'],
        },
      },
      {
        name: 'delete_policy',
        description: 'Delete an Automox policy by its ID. This cannot be undone.',
        inputSchema: {
          type: 'object',
          properties: {
            policy_id: {
              type: 'number',
              description: 'Automox policy ID to permanently delete',
            },
          },
          required: ['policy_id'],
        },
      },
      {
        name: 'execute_policy',
        description: 'Trigger immediate execution of a policy outside the normal schedule; action must be remediateAll (all devices) or remediateServer (specific device)',
        inputSchema: {
          type: 'object',
          properties: {
            policy_id: {
              type: 'number',
              description: 'Automox policy ID to execute immediately',
            },
            action: {
              type: 'string',
              description: 'Action to perform: remediateAll (run policy on all assigned devices) or remediateServer (run on a specific device)',
            },
          },
          required: ['policy_id'],
        },
      },
      {
        name: 'list_packages',
        description: 'List all software packages across all devices in the organization including pending updates',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Number of packages per page (1-500, default: 500)',
            },
            page: {
              type: 'number',
              description: 'Page number starting at 0 (default: 0)',
            },
          },
        },
      },
      {
        name: 'approve_package',
        description: 'Approve a specific software package update for deployment across the organization',
        inputSchema: {
          type: 'object',
          properties: {
            package_id: {
              type: 'number',
              description: 'Automox package ID to approve',
            },
          },
          required: ['package_id'],
        },
      },
      {
        name: 'reject_package',
        description: 'Reject a software package update to prevent it from being deployed by patch policies',
        inputSchema: {
          type: 'object',
          properties: {
            package_id: {
              type: 'number',
              description: 'Automox package ID to reject',
            },
          },
          required: ['package_id'],
        },
      },
      {
        name: 'list_groups',
        description: 'List all device groups (server groups) in the organization with assigned policies and device count',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_group',
        description: 'Get details for a specific Automox device group including member devices and assigned policies',
        inputSchema: {
          type: 'object',
          properties: {
            group_id: {
              type: 'number',
              description: 'Automox server group ID',
            },
          },
          required: ['group_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_organizations':
          return this.listOrganizations();
        case 'get_organization':
          return this.getOrganization(args);
        case 'list_devices':
          return this.listDevices(args);
        case 'get_device':
          return this.getDevice(args);
        case 'update_device':
          return this.updateDevice(args);
        case 'delete_device':
          return this.deleteDevice(args);
        case 'run_device_command':
          return this.runDeviceCommand(args);
        case 'list_device_packages':
          return this.listDevicePackages(args);
        case 'list_device_queues':
          return this.listDeviceQueues(args);
        case 'list_policies':
          return this.listPolicies(args);
        case 'get_policy':
          return this.getPolicy(args);
        case 'create_policy':
          return this.createPolicy(args);
        case 'update_policy':
          return this.updatePolicy(args);
        case 'delete_policy':
          return this.deletePolicy(args);
        case 'execute_policy':
          return this.executePolicy(args);
        case 'list_packages':
          return this.listPackages(args);
        case 'approve_package':
          return this.approvePackage(args);
        case 'reject_package':
          return this.rejectPackage(args);
        case 'list_groups':
          return this.listGroups();
        case 'get_group':
          return this.getGroup(args);
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

  private get headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  private async apiGet(path: string, extraParams?: Record<string, string>): Promise<ToolResult> {
    const params: Record<string, string> = { o: this.orgId, ...extraParams };
    const qs = new URLSearchParams(params).toString();
    const url = `${this.baseUrl}${path}?${qs}`;
    const response = await this.fetchWithRetry(url, { method: 'GET', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Automox API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apiPost(path: string, body: Record<string, unknown>, queryParams?: Record<string, string>): Promise<ToolResult> {
    const params: Record<string, string> = { o: this.orgId, ...queryParams };
    const qs = new URLSearchParams(params).toString();
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}?${qs}`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Automox API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const text = await response.text();
    const data = text ? JSON.parse(text) : { success: true };
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apiPut(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const qs = new URLSearchParams({ o: this.orgId }).toString();
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}?${qs}`, {
      method: 'PUT',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Automox API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const text = await response.text();
    const data = text ? JSON.parse(text) : { success: true };
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apiDelete(path: string): Promise<ToolResult> {
    const qs = new URLSearchParams({ o: this.orgId }).toString();
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}?${qs}`, {
      method: 'DELETE',
      headers: this.headers,
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Automox API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: JSON.stringify({ success: true, deleted: true }) }], isError: false };
  }

  private async listOrganizations(): Promise<ToolResult> {
    return this.apiGet('/orgs');
  }

  private async getOrganization(args: Record<string, unknown>): Promise<ToolResult> {
    const orgId = (args.org_id as string) ?? this.orgId;
    return this.apiGet(`/orgs/${orgId}`);
  }

  private async listDevices(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      limit: String((args.limit as number) ?? 500),
      page: String((args.page as number) ?? 0),
    };
    if (args.group_id !== undefined) params.groupId = String(args.group_id);
    return this.apiGet('/servers', params);
  }

  private async getDevice(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.device_id === undefined) return { content: [{ type: 'text', text: 'device_id is required' }], isError: true };
    return this.apiGet(`/servers/${encodeURIComponent(args.device_id as number)}`);
  }

  private async updateDevice(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.device_id === undefined) return { content: [{ type: 'text', text: 'device_id is required' }], isError: true };
    const { device_id, ...fields } = args;
    const body: Record<string, unknown> = {};
    if (fields.server_group_id !== undefined) body.server_group_id = fields.server_group_id;
    if (fields.display_name) body.display_name = fields.display_name;
    if (fields.tags) body.tags = (fields.tags as string).split(',').map(t => t.trim());
    if (fields.ip_addrs) body.ip_addrs = fields.ip_addrs;
    return this.apiPut(`/servers/${device_id as number}`, body);
  }

  private async deleteDevice(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.device_id === undefined) return { content: [{ type: 'text', text: 'device_id is required' }], isError: true };
    return this.apiDelete(`/servers/${encodeURIComponent(args.device_id as number)}`);
  }

  private async runDeviceCommand(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.device_id === undefined || !args.command) {
      return { content: [{ type: 'text', text: 'device_id and command are required' }], isError: true };
    }
    const validCommands = ['GetOS', 'InstallUpdate', 'Reboot'];
    if (!validCommands.includes(args.command as string)) {
      return { content: [{ type: 'text', text: `command must be one of: ${validCommands.join(', ')}` }], isError: true };
    }
    return this.apiPost(`/servers/${encodeURIComponent(args.device_id as number)}/queues`, { command_type_name: args.command });
  }

  private async listDevicePackages(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.device_id === undefined) return { content: [{ type: 'text', text: 'device_id is required' }], isError: true };
    const params: Record<string, string> = {
      limit: String((args.limit as number) ?? 500),
      page: String((args.page as number) ?? 0),
    };
    return this.apiGet(`/servers/${encodeURIComponent(args.device_id as number)}/packages`, params);
  }

  private async listDeviceQueues(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.device_id === undefined) return { content: [{ type: 'text', text: 'device_id is required' }], isError: true };
    return this.apiGet(`/servers/${encodeURIComponent(args.device_id as number)}/queues`);
  }

  private async listPolicies(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      limit: String((args.limit as number) ?? 500),
      page: String((args.page as number) ?? 0),
    };
    return this.apiGet('/policies', params);
  }

  private async getPolicy(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.policy_id === undefined) return { content: [{ type: 'text', text: 'policy_id is required' }], isError: true };
    return this.apiGet(`/policies/${encodeURIComponent(args.policy_id as number)}`);
  }

  private async createPolicy(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name || !args.policy_type_name) {
      return { content: [{ type: 'text', text: 'name and policy_type_name are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      name: args.name,
      policy_type_name: args.policy_type_name,
      organization_id: Number(this.orgId),
    };
    if (args.server_groups) {
      body.server_groups = (args.server_groups as string).split(',').map(id => Number(id.trim()));
    }
    if (args.schedule_days !== undefined) body.schedule_days = args.schedule_days;
    if (args.schedule_time) body.schedule_time = args.schedule_time;
    if (args.schedule_weeks_of_month) body.schedule_weeks_of_month = args.schedule_weeks_of_month;
    return this.apiPost('/policies', body);
  }

  private async updatePolicy(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.policy_id === undefined) return { content: [{ type: 'text', text: 'policy_id is required' }], isError: true };
    const { policy_id, ...fields } = args;
    const body: Record<string, unknown> = {};
    if (fields.name) body.name = fields.name;
    if (fields.server_groups) {
      body.server_groups = (fields.server_groups as string).split(',').map(id => Number(id.trim()));
    }
    if (fields.schedule_days !== undefined) body.schedule_days = fields.schedule_days;
    if (fields.schedule_time) body.schedule_time = fields.schedule_time;
    return this.apiPut(`/policies/${policy_id as number}`, body);
  }

  private async deletePolicy(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.policy_id === undefined) return { content: [{ type: 'text', text: 'policy_id is required' }], isError: true };
    return this.apiDelete(`/policies/${encodeURIComponent(args.policy_id as number)}`);
  }

  private async executePolicy(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.policy_id === undefined) return { content: [{ type: 'text', text: 'policy_id is required' }], isError: true };
    const action = (args.action as string) ?? 'remediateAll';
    return this.apiPost(`/policies/${encodeURIComponent(args.policy_id as number)}/action`, { action });
  }

  private async listPackages(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      limit: String((args.limit as number) ?? 500),
      page: String((args.page as number) ?? 0),
    };
    return this.apiGet('/packages', params);
  }

  private async approvePackage(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.package_id === undefined) return { content: [{ type: 'text', text: 'package_id is required' }], isError: true };
    return this.apiPut(`/packages/${encodeURIComponent(args.package_id as number)}`, { requires_approval: false, ignored: false });
  }

  private async rejectPackage(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.package_id === undefined) return { content: [{ type: 'text', text: 'package_id is required' }], isError: true };
    return this.apiPut(`/packages/${encodeURIComponent(args.package_id as number)}`, { ignored: true });
  }

  private async listGroups(): Promise<ToolResult> {
    return this.apiGet('/servergroups');
  }

  private async getGroup(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.group_id === undefined) return { content: [{ type: 'text', text: 'group_id is required' }], isError: true };
    return this.apiGet(`/servergroups/${encodeURIComponent(args.group_id as number)}`);
  }
}

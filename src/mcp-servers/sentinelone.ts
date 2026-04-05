/**
 * SentinelOne MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/Sentinel-One/purple-mcp — transport: stdio/SSE/streamable-HTTP, auth: API token
// Last updated: 2026-03-10 (actively maintained). Published by Sentinel-One (verified GitHub org).
// The Purple AI MCP exposes read-only query tools via Purple AI + PowerQueries (10+ tools):
//   list_alerts, search_alerts, get_alert_notes, get_alert_history,
//   list_vulnerabilities, search_vulnerabilities, get_vulnerability_notes, get_vulnerability_history,
//   misconfiguration query tools, asset inventory tools, and Purple AI conversational tools.
// It does NOT expose write operations (mitigate, quarantine, blocklist, exclusions, groups, sites, agents, threats).
// Our adapter covers: 16 tools (full read/write operations via REST API v2.1).
// Integration: use-both — MCP has conversational Purple AI + PowerQuery tools our REST adapter lacks;
//   our adapter has all write/action operations (mitigate, quarantine, exclusions, blocklist, agent moves) the MCP lacks.
// MCP-sourced tools: alerts (list/search/notes/history), vulnerabilities (list/search/notes/history),
//   misconfigurations, asset inventory queries, Purple AI conversational interface.
// REST-sourced tools: list_threats, get_threat, mitigate_threat, list_agents, get_agent,
//   quarantine_agent, unquarantine_agent, list_sites, get_site, list_groups, move_agents_to_group,
//   list_activities, list_exclusions, create_exclusion, list_blocklist, add_to_blocklist.
//
// Base URL: https://{instance}.sentinelone.net/web/api/v2.1
// Auth: ApiToken header — Authorization: ApiToken {token}
// Docs: https://usea1-partners.sentinelone.net/api-doc/overview
// Rate limits: Varies by endpoint; generally 1,000 req/min per token on Enterprise plans

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface SentinelOneConfig {
  apiToken: string;
  instance: string;
  baseUrl?: string;
}

export class SentinelOneMCPServer extends MCPAdapterBase {
  private readonly apiToken: string;
  private readonly baseUrl: string;

  constructor(config: SentinelOneConfig) {
    super();
    this.apiToken = config.apiToken;
    this.baseUrl = config.baseUrl || `https://${config.instance}.sentinelone.net/web/api/v2.1`;
  }

  static catalog() {
    return {
      name: 'sentinelone',
      displayName: 'SentinelOne',
      version: '1.0.0',
      category: 'cybersecurity',
      keywords: [
        'sentinelone', 'edr', 'endpoint', 'threat', 'malware', 'agent', 'quarantine',
        'mitigation', 'exclusion', 'blocklist', 'site', 'group', 'activity', 'detection',
        'singularity', 'xdr', 'incident', 'remediation', 'rollback',
      ],
      toolNames: [
        'list_threats', 'get_threat', 'mitigate_threat', 'list_agents', 'get_agent',
        'quarantine_agent', 'unquarantine_agent', 'list_sites', 'get_site',
        'list_groups', 'move_agents_to_group', 'list_activities',
        'list_exclusions', 'create_exclusion', 'list_blocklist', 'add_to_blocklist',
      ],
      description: 'Endpoint detection and response: list and mitigate threats, manage agents, quarantine endpoints, manage sites/groups, configure exclusions and blocklists.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_threats',
        description: 'List threats with optional filters for status, classification, OS type, site, and date range; supports pagination',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of threats to return (default: 50, max: 1000)',
            },
            skip: {
              type: 'number',
              description: 'Number of records to skip for pagination (default: 0)',
            },
            resolved: {
              type: 'boolean',
              description: 'Filter by resolved status: true for resolved, false for unresolved (default: false)',
            },
            classification: {
              type: 'string',
              description: 'Filter by classification: Malware, PUP, Ransomware, Trojan, etc.',
            },
            os_type: {
              type: 'string',
              description: 'Filter by OS: windows, linux, macos',
            },
            site_ids: {
              type: 'string',
              description: 'Comma-separated list of site IDs to filter by',
            },
            created_at_gte: {
              type: 'string',
              description: 'Return threats created at or after this ISO 8601 timestamp',
            },
            created_at_lte: {
              type: 'string',
              description: 'Return threats created at or before this ISO 8601 timestamp',
            },
          },
        },
      },
      {
        name: 'get_threat',
        description: 'Get full details for a specific threat by its unique ID, including file info, indicators, and mitigation status',
        inputSchema: {
          type: 'object',
          properties: {
            threat_id: {
              type: 'string',
              description: 'The unique SentinelOne threat ID',
            },
          },
          required: ['threat_id'],
        },
      },
      {
        name: 'mitigate_threat',
        description: 'Execute a mitigation action on a threat: kill, quarantine, un-quarantine, remediate, or rollback-remediation',
        inputSchema: {
          type: 'object',
          properties: {
            threat_id: {
              type: 'string',
              description: 'The unique SentinelOne threat ID to mitigate',
            },
            action: {
              type: 'string',
              description: 'Mitigation action: kill, quarantine, un-quarantine, remediate, rollback-remediation',
            },
          },
          required: ['threat_id', 'action'],
        },
      },
      {
        name: 'list_agents',
        description: 'List endpoint agents with optional filters for health status, OS type, online status, and site; supports pagination',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of agents to return (default: 50, max: 1000)',
            },
            skip: {
              type: 'number',
              description: 'Number of records to skip for pagination (default: 0)',
            },
            health_status: {
              type: 'string',
              description: 'Filter by health status: healthy, unhealthy, suspicious, na',
            },
            os_type: {
              type: 'string',
              description: 'Filter by OS type: windows, linux, macos',
            },
            is_online: {
              type: 'boolean',
              description: 'Filter by online status: true for online agents only',
            },
            is_active: {
              type: 'boolean',
              description: 'Filter by active status: true for active agents only',
            },
            site_ids: {
              type: 'string',
              description: 'Comma-separated list of site IDs to filter by',
            },
          },
        },
      },
      {
        name: 'get_agent',
        description: 'Get detailed information about a specific endpoint agent by its unique ID',
        inputSchema: {
          type: 'object',
          properties: {
            agent_id: {
              type: 'string',
              description: 'The unique SentinelOne agent ID',
            },
          },
          required: ['agent_id'],
        },
      },
      {
        name: 'quarantine_agent',
        description: 'Disconnect an endpoint agent from the network by placing it in quarantine (network isolation)',
        inputSchema: {
          type: 'object',
          properties: {
            agent_id: {
              type: 'string',
              description: 'The unique SentinelOne agent ID to quarantine',
            },
          },
          required: ['agent_id'],
        },
      },
      {
        name: 'unquarantine_agent',
        description: 'Reconnect a quarantined endpoint agent to the network by removing network isolation',
        inputSchema: {
          type: 'object',
          properties: {
            agent_id: {
              type: 'string',
              description: 'The unique SentinelOne agent ID to remove from quarantine',
            },
          },
          required: ['agent_id'],
        },
      },
      {
        name: 'list_sites',
        description: 'List all sites in the SentinelOne account with optional state and name filters',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of sites to return (default: 50)',
            },
            skip: {
              type: 'number',
              description: 'Number of records to skip for pagination (default: 0)',
            },
            state: {
              type: 'string',
              description: 'Filter by site state: active, expired',
            },
            name: {
              type: 'string',
              description: 'Filter by site name (partial match supported)',
            },
          },
        },
      },
      {
        name: 'get_site',
        description: 'Get detailed information about a specific site by its unique ID',
        inputSchema: {
          type: 'object',
          properties: {
            site_id: {
              type: 'string',
              description: 'The unique SentinelOne site ID',
            },
          },
          required: ['site_id'],
        },
      },
      {
        name: 'list_groups',
        description: 'List agent groups within a site with optional type and name filters',
        inputSchema: {
          type: 'object',
          properties: {
            site_ids: {
              type: 'string',
              description: 'Comma-separated list of site IDs to list groups for',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of groups to return (default: 50)',
            },
            skip: {
              type: 'number',
              description: 'Number of records to skip for pagination (default: 0)',
            },
            type: {
              type: 'string',
              description: 'Filter by group type: static, dynamic, pinned, manual',
            },
            name: {
              type: 'string',
              description: 'Filter by group name (partial match supported)',
            },
          },
        },
      },
      {
        name: 'move_agents_to_group',
        description: 'Move one or more endpoint agents to a different group by agent IDs and target group ID',
        inputSchema: {
          type: 'object',
          properties: {
            group_id: {
              type: 'string',
              description: 'The target group ID to move agents into',
            },
            agent_ids: {
              type: 'array',
              description: 'Array of agent IDs to move to the target group',
            },
          },
          required: ['group_id', 'agent_ids'],
        },
      },
      {
        name: 'list_activities',
        description: 'List account activity log entries with optional filters for activity type, agent, site, and date range',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of activities to return (default: 50, max: 1000)',
            },
            skip: {
              type: 'number',
              description: 'Number of records to skip for pagination (default: 0)',
            },
            activity_types: {
              type: 'string',
              description: 'Comma-separated list of activity type IDs to filter by',
            },
            agent_ids: {
              type: 'string',
              description: 'Comma-separated list of agent IDs to filter activities by',
            },
            site_ids: {
              type: 'string',
              description: 'Comma-separated list of site IDs to filter by',
            },
            created_at_gte: {
              type: 'string',
              description: 'Return activities created at or after this ISO 8601 timestamp',
            },
            created_at_lte: {
              type: 'string',
              description: 'Return activities created at or before this ISO 8601 timestamp',
            },
          },
        },
      },
      {
        name: 'list_exclusions',
        description: 'List path, certificate, browser, or file-type exclusions with optional scope and type filters',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of exclusions to return (default: 50)',
            },
            skip: {
              type: 'number',
              description: 'Number of records to skip for pagination (default: 0)',
            },
            type: {
              type: 'string',
              description: 'Filter by exclusion type: white_hash, path, certificate, browser, file_type',
            },
            os_type: {
              type: 'string',
              description: 'Filter by OS type: windows, linux, macos',
            },
            site_ids: {
              type: 'string',
              description: 'Comma-separated list of site IDs to filter by',
            },
          },
        },
      },
      {
        name: 'create_exclusion',
        description: 'Create a new exclusion rule for a path, hash, certificate, or file type to prevent false positives',
        inputSchema: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              description: 'Exclusion type: white_hash, path, certificate, browser, file_type',
            },
            value: {
              type: 'string',
              description: 'The exclusion value: file path, SHA1 hash, certificate thumbprint, etc.',
            },
            os_type: {
              type: 'string',
              description: 'Target OS type: windows, linux, macos',
            },
            description: {
              type: 'string',
              description: 'Human-readable description of why this exclusion exists',
            },
            site_ids: {
              type: 'array',
              description: 'Array of site IDs to scope this exclusion to (omit for global)',
            },
          },
          required: ['type', 'value', 'os_type'],
        },
      },
      {
        name: 'list_blocklist',
        description: 'List blocked file hashes (SHA1/SHA256) in the account or site-scoped blocklist',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of blocklist entries to return (default: 50)',
            },
            skip: {
              type: 'number',
              description: 'Number of records to skip for pagination (default: 0)',
            },
            hash_value: {
              type: 'string',
              description: 'Filter by specific SHA1 or SHA256 hash value',
            },
            site_ids: {
              type: 'string',
              description: 'Comma-separated list of site IDs to filter by',
            },
          },
        },
      },
      {
        name: 'add_to_blocklist',
        description: 'Add a file hash to the blocklist to block execution across agents in specified scope',
        inputSchema: {
          type: 'object',
          properties: {
            hash: {
              type: 'string',
              description: 'The SHA1 or SHA256 hash to block',
            },
            description: {
              type: 'string',
              description: 'Human-readable description of why this hash is blocked',
            },
            os_type: {
              type: 'string',
              description: 'Target OS type: windows, linux, macos',
            },
            site_ids: {
              type: 'array',
              description: 'Array of site IDs to scope the block to (omit for global)',
            },
          },
          required: ['hash', 'os_type'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_threats':
          return await this.listThreats(args);
        case 'get_threat':
          return await this.getThreat(args);
        case 'mitigate_threat':
          return await this.mitigateThreat(args);
        case 'list_agents':
          return await this.listAgents(args);
        case 'get_agent':
          return await this.getAgent(args);
        case 'quarantine_agent':
          return await this.quarantineAgent(args);
        case 'unquarantine_agent':
          return await this.unquarantineAgent(args);
        case 'list_sites':
          return await this.listSites(args);
        case 'get_site':
          return await this.getSite(args);
        case 'list_groups':
          return await this.listGroups(args);
        case 'move_agents_to_group':
          return await this.moveAgentsToGroup(args);
        case 'list_activities':
          return await this.listActivities(args);
        case 'list_exclusions':
          return await this.listExclusions(args);
        case 'create_exclusion':
          return await this.createExclusion(args);
        case 'list_blocklist':
          return await this.listBlocklist(args);
        case 'add_to_blocklist':
          return await this.addToBlocklist(args);
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

  private headers(): Record<string, string> {
    return {
      Authorization: `ApiToken ${this.apiToken}`,
      'Content-Type': 'application/json',
    };
  }

  private async fetchJson(url: string, options: RequestInit = {}): Promise<unknown> {
    const response = await this.fetchWithRetry(url, { ...options, headers: this.headers() });
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`SentinelOne API error: ${response.status} ${response.statusText}${body ? ` — ${body.slice(0, 200)}` : ''}`);
    }
    return response.json();
  }

  private async listThreats(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    params.set('limit', String((args.limit as number) ?? 50));
    params.set('skip', String((args.skip as number) ?? 0));
    if (args.resolved !== undefined) params.set('resolved', String(args.resolved));
    if (args.classification) params.set('classification', args.classification as string);
    if (args.os_type) params.set('osType', args.os_type as string);
    if (args.site_ids) params.set('siteIds', args.site_ids as string);
    if (args.created_at_gte) params.set('createdAt__gte', args.created_at_gte as string);
    if (args.created_at_lte) params.set('createdAt__lte', args.created_at_lte as string);

    const data = await this.fetchJson(`${this.baseUrl}/threats?${params}`);
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getThreat(args: Record<string, unknown>): Promise<ToolResult> {
    const threatId = args.threat_id as string;
    if (!threatId) {
      return { content: [{ type: 'text', text: 'threat_id is required' }], isError: true };
    }
    const data = await this.fetchJson(`${this.baseUrl}/threats?ids=${encodeURIComponent(threatId)}&limit=1`);
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async mitigateThreat(args: Record<string, unknown>): Promise<ToolResult> {
    const threatId = args.threat_id as string;
    const action = args.action as string;
    if (!threatId || !action) {
      return { content: [{ type: 'text', text: 'threat_id and action are required' }], isError: true };
    }
    const data = await this.fetchJson(
      `${this.baseUrl}/threats/mitigate/${encodeURIComponent(action)}`,
      { method: 'POST', body: JSON.stringify({ filter: { ids: [threatId] } }) },
    );
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listAgents(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    params.set('limit', String((args.limit as number) ?? 50));
    params.set('skip', String((args.skip as number) ?? 0));
    if (args.health_status) params.set('healthStatus', args.health_status as string);
    if (args.os_type) params.set('osType', args.os_type as string);
    if (args.is_online !== undefined) params.set('isOnline', String(args.is_online));
    if (args.is_active !== undefined) params.set('isActive', String(args.is_active));
    if (args.site_ids) params.set('siteIds', args.site_ids as string);

    const data = await this.fetchJson(`${this.baseUrl}/agents?${params}`);
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getAgent(args: Record<string, unknown>): Promise<ToolResult> {
    const agentId = args.agent_id as string;
    if (!agentId) {
      return { content: [{ type: 'text', text: 'agent_id is required' }], isError: true };
    }
    const data = await this.fetchJson(`${this.baseUrl}/agents?ids=${encodeURIComponent(agentId)}&limit=1`);
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async quarantineAgent(args: Record<string, unknown>): Promise<ToolResult> {
    const agentId = args.agent_id as string;
    if (!agentId) {
      return { content: [{ type: 'text', text: 'agent_id is required' }], isError: true };
    }
    const data = await this.fetchJson(
      `${this.baseUrl}/agents/actions/disconnect`,
      { method: 'POST', body: JSON.stringify({ filter: { ids: [agentId] } }) },
    );
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async unquarantineAgent(args: Record<string, unknown>): Promise<ToolResult> {
    const agentId = args.agent_id as string;
    if (!agentId) {
      return { content: [{ type: 'text', text: 'agent_id is required' }], isError: true };
    }
    const data = await this.fetchJson(
      `${this.baseUrl}/agents/actions/connect`,
      { method: 'POST', body: JSON.stringify({ filter: { ids: [agentId] } }) },
    );
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listSites(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    params.set('limit', String((args.limit as number) ?? 50));
    params.set('skip', String((args.skip as number) ?? 0));
    if (args.state) params.set('state', args.state as string);
    if (args.name) params.set('name', args.name as string);

    const data = await this.fetchJson(`${this.baseUrl}/sites?${params}`);
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getSite(args: Record<string, unknown>): Promise<ToolResult> {
    const siteId = args.site_id as string;
    if (!siteId) {
      return { content: [{ type: 'text', text: 'site_id is required' }], isError: true };
    }
    const data = await this.fetchJson(`${this.baseUrl}/sites?siteIds=${encodeURIComponent(siteId)}&limit=1`);
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listGroups(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    params.set('limit', String((args.limit as number) ?? 50));
    params.set('skip', String((args.skip as number) ?? 0));
    if (args.site_ids) params.set('siteIds', args.site_ids as string);
    if (args.type) params.set('type', args.type as string);
    if (args.name) params.set('name', args.name as string);

    const data = await this.fetchJson(`${this.baseUrl}/groups?${params}`);
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async moveAgentsToGroup(args: Record<string, unknown>): Promise<ToolResult> {
    const groupId = args.group_id as string;
    const agentIds = args.agent_ids as unknown[];
    if (!groupId || !agentIds || !Array.isArray(agentIds) || agentIds.length === 0) {
      return { content: [{ type: 'text', text: 'group_id and agent_ids (non-empty array) are required' }], isError: true };
    }
    const data = await this.fetchJson(
      `${this.baseUrl}/groups/${encodeURIComponent(groupId)}/move-agents`,
      { method: 'PUT', body: JSON.stringify({ filter: { ids: agentIds } }) },
    );
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listActivities(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    params.set('limit', String((args.limit as number) ?? 50));
    params.set('skip', String((args.skip as number) ?? 0));
    if (args.activity_types) params.set('activityTypes', args.activity_types as string);
    if (args.agent_ids) params.set('agentIds', args.agent_ids as string);
    if (args.site_ids) params.set('siteIds', args.site_ids as string);
    if (args.created_at_gte) params.set('createdAt__gte', args.created_at_gte as string);
    if (args.created_at_lte) params.set('createdAt__lte', args.created_at_lte as string);

    const data = await this.fetchJson(`${this.baseUrl}/activities?${params}`);
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listExclusions(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    params.set('limit', String((args.limit as number) ?? 50));
    params.set('skip', String((args.skip as number) ?? 0));
    if (args.type) params.set('type', args.type as string);
    if (args.os_type) params.set('osType', args.os_type as string);
    if (args.site_ids) params.set('siteIds', args.site_ids as string);

    const data = await this.fetchJson(`${this.baseUrl}/exclusions?${params}`);
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async createExclusion(args: Record<string, unknown>): Promise<ToolResult> {
    const type = args.type as string;
    const value = args.value as string;
    const osType = args.os_type as string;
    if (!type || !value || !osType) {
      return { content: [{ type: 'text', text: 'type, value, and os_type are required' }], isError: true };
    }
    const body: Record<string, unknown> = { data: { type, value, osType } };
    if (args.description) (body.data as Record<string, unknown>)['description'] = args.description;
    if (args.site_ids) (body.data as Record<string, unknown>)['siteIds'] = args.site_ids;

    const data = await this.fetchJson(
      `${this.baseUrl}/exclusions`,
      { method: 'POST', body: JSON.stringify(body) },
    );
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listBlocklist(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    params.set('limit', String((args.limit as number) ?? 50));
    params.set('skip', String((args.skip as number) ?? 0));
    if (args.hash_value) params.set('value', args.hash_value as string);
    if (args.site_ids) params.set('siteIds', args.site_ids as string);

    const data = await this.fetchJson(`${this.baseUrl}/restrictions?${params}`);
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async addToBlocklist(args: Record<string, unknown>): Promise<ToolResult> {
    const hash = args.hash as string;
    const osType = args.os_type as string;
    if (!hash || !osType) {
      return { content: [{ type: 'text', text: 'hash and os_type are required' }], isError: true };
    }
    const entry: Record<string, unknown> = { type: 'black_hash', value: hash, osType };
    if (args.description) entry['description'] = args.description;
    if (args.site_ids) entry['siteIds'] = args.site_ids;

    const data = await this.fetchJson(
      `${this.baseUrl}/restrictions`,
      { method: 'POST', body: JSON.stringify({ data: entry }) },
    );
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }
}

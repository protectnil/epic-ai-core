/**
 * Vectra AI MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/vectra-ai-research/vectra-ai-mcp-server-qux — transport: stdio/SSE/streamable-HTTP, auth: OAuth2 client credentials
// Published by Vectra AI's own research team. Announced August 6, 2025 as early access for all customers.
// MCP tool count: UNVERIFIED (repo is new, README does not enumerate all tool names; tool/ directory present).
// Last commit: within 6 months of 2026-03-28 (repo created August 2025, maintained).
// Recommendation: use-rest-api — MCP tool count could not be confirmed ≥10 from public docs; our adapter
//   provides verified CRUD coverage. Reassess when Vectra publishes full tool list in their README.
//   If MCP tool count confirmed ≥10, evaluate use-both for any unique MCP-only tools.
//
// Base URL: https://{tenant}.portal.vectra.ai (tenant-specific — configured via constructor)
// Auth: OAuth2 client credentials — POST {baseUrl}/oauth2/token using client_id and client_secret
// Docs: https://apidocs.vectra.ai/
// API version: v3.4 (current as of 2026-03-28; adapter uses v3.3 — upgrade when v3.4 breaks verified)
// Rate limits: Not publicly documented; enterprise tier-based limits apply per tenant.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface VectraAIConfig {
  clientId: string;
  clientSecret: string;
  baseUrl: string;
}

export class VectraAIMCPServer extends MCPAdapterBase {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly baseUrl: string;

  private bearerToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(config: VectraAIConfig) {
    super();
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
  }

  static catalog() {
    return {
      name: 'vectra-ai',
      displayName: 'Vectra AI',
      version: '1.0.0',
      category: 'cybersecurity' as const,
      keywords: ['vectra', 'ndr', 'network detection', 'response', 'threat', 'detection', 'host', 'account', 'lateral movement', 'command and control', 'exfiltration', 'ai security'],
      toolNames: [
        'list_detections', 'get_detection', 'update_detection',
        'list_hosts', 'get_host', 'search_hosts',
        'list_accounts', 'get_account', 'search_accounts',
        'list_assignments', 'get_assignment', 'create_assignment',
        'list_tags', 'add_tags', 'remove_tags',
      ],
      description: 'Vectra AI network detection and response: query and triage detections, hosts, and accounts, manage assignments, add contextual tags, and track attacker progression across the kill chain.',
      author: 'protectnil' as const,
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_detections',
        description: 'List Vectra AI detections with filters for state, category, threat score, and certainty score',
        inputSchema: {
          type: 'object',
          properties: {
            state: {
              type: 'string',
              description: 'Detection state filter: active, inactive (default: active)',
            },
            category: {
              type: 'string',
              description: 'Detection category: command_and_control, botnet, lateral_movement, reconnaissance, exfiltration, info',
            },
            threat_gte: {
              type: 'number',
              description: 'Minimum threat score (0-100)',
            },
            certainty_gte: {
              type: 'number',
              description: 'Minimum certainty score (0-100)',
            },
            host_id: {
              type: 'number',
              description: 'Filter detections for a specific host ID',
            },
            detection_type: {
              type: 'string',
              description: 'Filter by specific detection type (e.g. hidden_https_tunnel)',
            },
            page_size: {
              type: 'number',
              description: 'Number of results per page (default: 50, max: 5000)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
          },
        },
      },
      {
        name: 'get_detection',
        description: 'Get full details for a specific Vectra AI detection by detection ID including evidence and source information',
        inputSchema: {
          type: 'object',
          properties: {
            detection_id: {
              type: 'number',
              description: 'Numeric ID of the Vectra detection',
            },
          },
          required: ['detection_id'],
        },
      },
      {
        name: 'update_detection',
        description: 'Update the triage state of a Vectra detection — mark as fixed, add notes, or change triage status',
        inputSchema: {
          type: 'object',
          properties: {
            detection_ids: {
              type: 'array',
              description: 'Array of detection IDs to update',
              items: { type: 'number' },
            },
            mark_as_fixed: {
              type: 'string',
              description: 'Mark detections as fixed: true or false',
            },
            triage_as: {
              type: 'string',
              description: 'Apply a triage rule name to suppress these detections',
            },
          },
          required: ['detection_ids'],
        },
      },
      {
        name: 'list_hosts',
        description: 'List Vectra AI hosts with optional filters for threat score, certainty score, privilege level, and active status',
        inputSchema: {
          type: 'object',
          properties: {
            state: {
              type: 'string',
              description: 'Host state: active, inactive (default: active)',
            },
            threat_gte: {
              type: 'number',
              description: 'Minimum host threat score (0-100)',
            },
            certainty_gte: {
              type: 'number',
              description: 'Minimum host certainty score (0-100)',
            },
            privilege_level_gte: {
              type: 'number',
              description: 'Minimum privilege level (0-10)',
            },
            is_key_asset: {
              type: 'boolean',
              description: 'Filter to key asset hosts only',
            },
            page_size: {
              type: 'number',
              description: 'Results per page (default: 50, max: 5000)',
            },
            page: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
          },
        },
      },
      {
        name: 'get_host',
        description: 'Get detailed information about a specific Vectra AI host by host ID including IP, detections, and scores',
        inputSchema: {
          type: 'object',
          properties: {
            host_id: {
              type: 'number',
              description: 'Numeric ID of the Vectra host',
            },
          },
          required: ['host_id'],
        },
      },
      {
        name: 'search_hosts',
        description: 'Search Vectra AI hosts using query expressions for IP address, hostname, MAC address, or tags',
        inputSchema: {
          type: 'object',
          properties: {
            query_string: {
              type: 'string',
              description: 'Lucene-style query string (e.g. "ip:10.0.0.1" or "host.name:webserver*" or "tags:critical")',
            },
            page_size: {
              type: 'number',
              description: 'Results per page (default: 50)',
            },
            page: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
          },
          required: ['query_string'],
        },
      },
      {
        name: 'list_accounts',
        description: 'List Vectra AI accounts (user accounts observed on the network) with threat and certainty score filters',
        inputSchema: {
          type: 'object',
          properties: {
            state: {
              type: 'string',
              description: 'Account state: active, inactive (default: active)',
            },
            threat_gte: {
              type: 'number',
              description: 'Minimum threat score (0-100)',
            },
            certainty_gte: {
              type: 'number',
              description: 'Minimum certainty score (0-100)',
            },
            privilege_level_gte: {
              type: 'number',
              description: 'Minimum privilege level (0-10)',
            },
            page_size: {
              type: 'number',
              description: 'Results per page (default: 50, max: 5000)',
            },
            page: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
          },
        },
      },
      {
        name: 'get_account',
        description: 'Get detailed information about a specific Vectra AI account by account ID including privilege, detections, and risk scores',
        inputSchema: {
          type: 'object',
          properties: {
            account_id: {
              type: 'number',
              description: 'Numeric ID of the Vectra account',
            },
          },
          required: ['account_id'],
        },
      },
      {
        name: 'search_accounts',
        description: 'Search Vectra AI accounts by username, UPN, SAN, or tags using query expressions',
        inputSchema: {
          type: 'object',
          properties: {
            query_string: {
              type: 'string',
              description: 'Lucene-style query string (e.g. "name:john.doe" or "tags:admin")',
            },
            page_size: {
              type: 'number',
              description: 'Results per page (default: 50)',
            },
            page: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
          },
          required: ['query_string'],
        },
      },
      {
        name: 'list_assignments',
        description: 'List Vectra AI analyst assignments for hosts and accounts with optional filters by resolution status and user',
        inputSchema: {
          type: 'object',
          properties: {
            resolved: {
              type: 'boolean',
              description: 'Filter by resolution status (default: returns all)',
            },
            page_size: {
              type: 'number',
              description: 'Results per page (default: 50)',
            },
            page: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
          },
        },
      },
      {
        name: 'get_assignment',
        description: 'Get details for a specific Vectra AI analyst assignment by assignment ID',
        inputSchema: {
          type: 'object',
          properties: {
            assignment_id: {
              type: 'number',
              description: 'Numeric ID of the Vectra assignment',
            },
          },
          required: ['assignment_id'],
        },
      },
      {
        name: 'create_assignment',
        description: 'Create a Vectra AI analyst assignment for a host or account to assign it to a specific analyst for investigation',
        inputSchema: {
          type: 'object',
          properties: {
            assign_to_user_id: {
              type: 'number',
              description: 'Vectra user ID of the analyst to assign to',
            },
            host_id: {
              type: 'number',
              description: 'Host ID to assign (either host_id or account_id is required)',
            },
            account_id: {
              type: 'number',
              description: 'Account ID to assign (either host_id or account_id is required)',
            },
          },
          required: ['assign_to_user_id'],
        },
      },
      {
        name: 'list_tags',
        description: 'List all tags used in the Vectra AI platform for hosts, accounts, and detections',
        inputSchema: {
          type: 'object',
          properties: {
            page_size: {
              type: 'number',
              description: 'Results per page (default: 50)',
            },
          },
        },
      },
      {
        name: 'add_tags',
        description: 'Add contextual tags to a Vectra AI host or account for classification and filtering',
        inputSchema: {
          type: 'object',
          properties: {
            entity_type: {
              type: 'string',
              description: 'Entity type to tag: host or account',
            },
            entity_id: {
              type: 'number',
              description: 'Numeric ID of the host or account',
            },
            tags: {
              type: 'array',
              description: 'Array of tag strings to add',
              items: { type: 'string' },
            },
          },
          required: ['entity_type', 'entity_id', 'tags'],
        },
      },
      {
        name: 'remove_tags',
        description: 'Remove specific tags from a Vectra AI host or account',
        inputSchema: {
          type: 'object',
          properties: {
            entity_type: {
              type: 'string',
              description: 'Entity type: host or account',
            },
            entity_id: {
              type: 'number',
              description: 'Numeric ID of the host or account',
            },
            tags: {
              type: 'array',
              description: 'Array of tag strings to remove',
              items: { type: 'string' },
            },
          },
          required: ['entity_type', 'entity_id', 'tags'],
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
        case 'list_hosts':
          return this.listHosts(args);
        case 'get_host':
          return this.getHost(args);
        case 'search_hosts':
          return this.searchHosts(args);
        case 'list_accounts':
          return this.listAccounts(args);
        case 'get_account':
          return this.getAccount(args);
        case 'search_accounts':
          return this.searchAccounts(args);
        case 'list_assignments':
          return this.listAssignments(args);
        case 'get_assignment':
          return this.getAssignment(args);
        case 'create_assignment':
          return this.createAssignment(args);
        case 'list_tags':
          return this.listTags(args);
        case 'add_tags':
          return this.addTags(args);
        case 'remove_tags':
          return this.removeTags(args);
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

  private async getOrRefreshToken(): Promise<string> {
    const now = Date.now();
    if (this.bearerToken && this.tokenExpiry > now) {
      return this.bearerToken;
    }
    const response = await this.fetchWithRetry(`${this.baseUrl}/oauth2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: this.clientId,
        client_secret: this.clientSecret,
      }).toString(),
    });
    if (!response.ok) {
      throw new Error(`OAuth2 token request failed: ${response.status} ${response.statusText}`);
    }
    const data = await response.json() as { access_token: string; expires_in: number };
    this.bearerToken = data.access_token;
    this.tokenExpiry = now + (data.expires_in - 60) * 1000;
    return this.bearerToken;
  }


  private async apiGet(path: string, params?: Record<string, string>): Promise<ToolResult> {
    const token = await this.getOrRefreshToken();
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    const response = await this.fetchWithRetry(`${this.baseUrl}/api/v3.3${path}${qs}`, {
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apiPatch(path: string, body: unknown): Promise<ToolResult> {
    const token = await this.getOrRefreshToken();
    const response = await this.fetchWithRetry(`${this.baseUrl}/api/v3.3${path}`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apiPost(path: string, body: unknown): Promise<ToolResult> {
    const token = await this.getOrRefreshToken();
    const response = await this.fetchWithRetry(`${this.baseUrl}/api/v3.3${path}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listDetections(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      state: (args.state as string) || 'active',
      page_size: String((args.page_size as number) || 50),
      page: String((args.page as number) || 1),
    };
    if (args.category) params.category = args.category as string;
    if (args.threat_gte !== undefined) params.threat_gte = String(args.threat_gte);
    if (args.certainty_gte !== undefined) params.certainty_gte = String(args.certainty_gte);
    if (args.host_id) params.host_id = String(args.host_id);
    if (args.detection_type) params.detection_type = args.detection_type as string;
    return this.apiGet('/detections', params);
  }

  private async getDetection(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.detection_id) return { content: [{ type: 'text', text: 'detection_id is required' }], isError: true };
    return this.apiGet(`/detections/${encodeURIComponent(args.detection_id as string)}`);
  }

  private async updateDetection(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.detection_ids) return { content: [{ type: 'text', text: 'detection_ids is required' }], isError: true };
    const body: Record<string, unknown> = { detectionIdList: args.detection_ids };
    if (args.mark_as_fixed !== undefined) body.mark_as_fixed = args.mark_as_fixed;
    if (args.triage_as) body.triage_as = args.triage_as;
    return this.apiPatch('/detections', body);
  }

  private async listHosts(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      state: (args.state as string) || 'active',
      page_size: String((args.page_size as number) || 50),
      page: String((args.page as number) || 1),
    };
    if (args.threat_gte !== undefined) params.threat_gte = String(args.threat_gte);
    if (args.certainty_gte !== undefined) params.certainty_gte = String(args.certainty_gte);
    if (args.privilege_level_gte !== undefined) params.privilege_level_gte = String(args.privilege_level_gte);
    if (args.is_key_asset !== undefined) params.is_key_asset = String(args.is_key_asset);
    return this.apiGet('/hosts', params);
  }

  private async getHost(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.host_id) return { content: [{ type: 'text', text: 'host_id is required' }], isError: true };
    return this.apiGet(`/hosts/${encodeURIComponent(args.host_id as string)}`);
  }

  private async searchHosts(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.query_string) return { content: [{ type: 'text', text: 'query_string is required' }], isError: true };
    return this.apiGet('/search/hosts', {
      query_string: args.query_string as string,
      page_size: String((args.page_size as number) || 50),
      page: String((args.page as number) || 1),
    });
  }

  private async listAccounts(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      state: (args.state as string) || 'active',
      page_size: String((args.page_size as number) || 50),
      page: String((args.page as number) || 1),
    };
    if (args.threat_gte !== undefined) params.threat_gte = String(args.threat_gte);
    if (args.certainty_gte !== undefined) params.certainty_gte = String(args.certainty_gte);
    if (args.privilege_level_gte !== undefined) params.privilege_level_gte = String(args.privilege_level_gte);
    return this.apiGet('/accounts', params);
  }

  private async getAccount(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.account_id) return { content: [{ type: 'text', text: 'account_id is required' }], isError: true };
    return this.apiGet(`/accounts/${encodeURIComponent(args.account_id as string)}`);
  }

  private async searchAccounts(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.query_string) return { content: [{ type: 'text', text: 'query_string is required' }], isError: true };
    return this.apiGet('/search/accounts', {
      query_string: args.query_string as string,
      page_size: String((args.page_size as number) || 50),
      page: String((args.page as number) || 1),
    });
  }

  private async listAssignments(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      page_size: String((args.page_size as number) || 50),
      page: String((args.page as number) || 1),
    };
    if (args.resolved !== undefined) params.resolved = String(args.resolved);
    return this.apiGet('/assignments', params);
  }

  private async getAssignment(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.assignment_id) return { content: [{ type: 'text', text: 'assignment_id is required' }], isError: true };
    return this.apiGet(`/assignments/${encodeURIComponent(args.assignment_id as string)}`);
  }

  private async createAssignment(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.assign_to_user_id) return { content: [{ type: 'text', text: 'assign_to_user_id is required' }], isError: true };
    if (!args.host_id && !args.account_id) return { content: [{ type: 'text', text: 'Either host_id or account_id is required' }], isError: true };
    const body: Record<string, unknown> = { assign_to_user_id: args.assign_to_user_id };
    if (args.host_id) body.host_id = args.host_id;
    if (args.account_id) body.account_id = args.account_id;
    return this.apiPost('/assignments', body);
  }

  private async listTags(args: Record<string, unknown>): Promise<ToolResult> {
    return this.apiGet('/tagging', { page_size: String((args.page_size as number) || 50) });
  }

  private async addTags(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.entity_type || !args.entity_id || !args.tags) {
      return { content: [{ type: 'text', text: 'entity_type, entity_id, and tags are required' }], isError: true };
    }
    const path = args.entity_type === 'account'
      ? `/tagging/account/${encodeURIComponent(args.entity_id as string)}`
      : `/tagging/host/${encodeURIComponent(args.entity_id as string)}`;
    return this.apiPatch(path, { tags: args.tags });
  }

  private async removeTags(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.entity_type || !args.entity_id || !args.tags) {
      return { content: [{ type: 'text', text: 'entity_type, entity_id, and tags are required' }], isError: true };
    }
    const existingResult = await this.apiGet(
      args.entity_type === 'account' ? `/tagging/account/${encodeURIComponent(args.entity_id as string)}` : `/tagging/host/${encodeURIComponent(args.entity_id as string)}`
    );
    if (existingResult.isError) return existingResult;
    let currentTags: string[] = [];
    try {
      const parsed = JSON.parse(existingResult.content[0].text) as { tags?: string[] };
      currentTags = parsed.tags || [];
    } catch { /* use empty */ }
    const tagsToRemove = args.tags as string[];
    const updatedTags = currentTags.filter(t => !tagsToRemove.includes(t));
    const path = args.entity_type === 'account'
      ? `/tagging/account/${encodeURIComponent(args.entity_id as string)}`
      : `/tagging/host/${encodeURIComponent(args.entity_id as string)}`;
    return this.apiPatch(path, { tags: updatedTags });
  }
}

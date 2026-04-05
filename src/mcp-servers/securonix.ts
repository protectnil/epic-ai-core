/**
 * Securonix MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28.
// No official Securonix MCP server was found on GitHub or the Securonix documentation portal.
// Recommendation: use-rest-api — no official vendor MCP exists.
//
// Base URL: https://{tenant}.securonix.net (cloud) — must be supplied by the user; no default.
// Auth: Token-based. GET /ws/token/generate with username/password/validity headers returns a plain-text token.
//       The token is passed as a 'token' request header on all subsequent requests.
// Docs: https://documentation.securonix.com/bundle/securonix-cloud-user-guide/page/content/rest-api-categories.htm
// Rate limits: Not publicly documented. Tenant-specific limits apply.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface SecuronixConfig {
  /** Full base URL including tenant, e.g. https://acme.securonix.net */
  baseUrl: string;
  /** Pre-generated auth token. If omitted, username + password are used to obtain one. */
  token?: string;
  username?: string;
  password?: string;
}

export class SecuronixMCPServer extends MCPAdapterBase {
  private readonly baseUrl: string;
  private token: string;
  private readonly username: string;
  private readonly password: string;

  constructor(config: SecuronixConfig) {
    super();
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.token = config.token ?? '';
    this.username = config.username ?? '';
    this.password = config.password ?? '';
  }

  /** Ensure a valid token is available, auto-generating from username/password if needed. */
  private async ensureToken(): Promise<string> {
    if (this.token) return this.token;
    if (!this.username || !this.password) {
      throw new Error(
        'Securonix authentication required: provide a token or username + password in config',
      );
    }
    const response = await this.fetchWithRetry(`${this.baseUrl}/ws/token/generate`, {
      method: 'GET',
      headers: {
        username: this.username,
        password: this.password,
        validity: '1',
      },
    });
    if (!response.ok) {
      throw new Error(
        `Securonix token generation failed: HTTP ${response.status} ${response.statusText}`,
      );
    }
    this.token = (await response.text()).trim();
    return this.token;
  }

  static catalog() {
    return {
      name: 'securonix',
      displayName: 'Securonix',
      version: '1.0.0',
      category: 'cybersecurity' as const,
      keywords: [
        'securonix', 'SNYPR', 'UEBA', 'SIEM', 'insider threat', 'incident',
        'violation', 'spotter', 'watchlist', 'risk score', 'threat', 'entity',
        'policy', 'behavior analytics',
      ],
      toolNames: [
        'generate_token',
        'list_incidents', 'get_incident', 'update_incident', 'add_comment_to_incident',
        'spotter_search',
        'list_violations', 'get_violation_details',
        'get_threats',
        'get_user_risk_score', 'get_entity_risk_history',
        'list_watchlists', 'add_to_watchlist', 'remove_from_watchlist',
      ],
      description:
        'Manage Securonix SNYPR/SIEM incidents, violations, and threats. Execute Spotter queries, ' +
        'retrieve user risk scores, and manage watchlists for UEBA and insider-threat programs.',
      author: 'protectnil' as const,
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'generate_token',
        description:
          'Generate a Securonix authentication token from username and password. Stores the token for subsequent calls.',
        inputSchema: {
          type: 'object',
          properties: {
            username: { type: 'string', description: 'Securonix username' },
            password: { type: 'string', description: 'Securonix password' },
            validity: {
              type: 'number',
              description: 'Token validity in days (default: 1)',
            },
          },
          required: ['username', 'password'],
        },
      },
      {
        name: 'list_incidents',
        description:
          'List Securonix incidents within a time range. Filter by rangeType (updated or opened), with pagination support.',
        inputSchema: {
          type: 'object',
          properties: {
            from: {
              type: 'string',
              description: 'Start time in epoch milliseconds',
            },
            to: {
              type: 'string',
              description: 'End time in epoch milliseconds',
            },
            rangeType: {
              type: 'string',
              description: 'Time range type: updated or opened (default: updated)',
            },
            status: {
              type: 'string',
              description: 'Filter by incident status: Open, Closed, Completed',
            },
            max: {
              type: 'number',
              description: 'Maximum number of incidents to return (default: 10)',
            },
            offset: {
              type: 'number',
              description: 'Pagination offset (default: 0)',
            },
          },
          required: ['from', 'to'],
        },
      },
      {
        name: 'get_incident',
        description:
          'Retrieve full metadata and workflow history for a specific Securonix incident by ID.',
        inputSchema: {
          type: 'object',
          properties: {
            incident_id: {
              type: 'string',
              description: 'The Securonix incident ID',
            },
          },
          required: ['incident_id'],
        },
      },
      {
        name: 'update_incident',
        description:
          'Update the workflow status of a Securonix incident (e.g., Accept, Reject, Complete, Claim).',
        inputSchema: {
          type: 'object',
          properties: {
            incident_id: {
              type: 'string',
              description: 'The Securonix incident ID to update',
            },
            action: {
              type: 'string',
              description:
                'Workflow action: Accept, Reject, Complete, Claim, InvestigateAndClose, etc.',
            },
            status: {
              type: 'string',
              description: 'New status value for the incident',
            },
            comment: {
              type: 'string',
              description: 'Comment to attach to the workflow action',
            },
          },
          required: ['incident_id', 'action'],
        },
      },
      {
        name: 'add_comment_to_incident',
        description:
          'Add a textual comment or analyst note to an existing Securonix incident.',
        inputSchema: {
          type: 'object',
          properties: {
            incident_id: {
              type: 'string',
              description: 'The Securonix incident ID',
            },
            comment: {
              type: 'string',
              description: 'Comment text to add to the incident',
            },
          },
          required: ['incident_id', 'comment'],
        },
      },
      {
        name: 'spotter_search',
        description:
          'Execute a Securonix Spotter query against activity, violation, or risk indexes. Returns matching records.',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description:
                'Spotter query string, e.g. index=activity | where username="jdoe"',
            },
            from: {
              type: 'string',
              description: 'Start time in epoch milliseconds',
            },
            to: {
              type: 'string',
              description: 'End time in epoch milliseconds',
            },
            max: {
              type: 'number',
              description: 'Maximum number of results to return (default: 100)',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'list_violations',
        description:
          'List Securonix policy violations (threats) within a time range with pagination support.',
        inputSchema: {
          type: 'object',
          properties: {
            from: {
              type: 'string',
              description: 'Start time in epoch milliseconds',
            },
            to: {
              type: 'string',
              description: 'End time in epoch milliseconds',
            },
            max: {
              type: 'number',
              description: 'Maximum number of violations to return (default: 25)',
            },
            offset: {
              type: 'number',
              description: 'Pagination offset (default: 0)',
            },
          },
          required: ['from', 'to'],
        },
      },
      {
        name: 'get_violation_details',
        description:
          'Retrieve the full details and evidence for a specific Securonix policy violation.',
        inputSchema: {
          type: 'object',
          properties: {
            violation_id: {
              type: 'string',
              description: 'The unique violation or threat ID',
            },
          },
          required: ['violation_id'],
        },
      },
      {
        name: 'get_threats',
        description:
          'List threats from the Securonix Security Command Center for a time range, optionally filtered by type.',
        inputSchema: {
          type: 'object',
          properties: {
            from: {
              type: 'string',
              description: 'Start time in epoch milliseconds',
            },
            to: {
              type: 'string',
              description: 'End time in epoch milliseconds',
            },
            type: {
              type: 'string',
              description: 'Threat type filter (optional)',
            },
            max: {
              type: 'number',
              description: 'Maximum number of threats to return (default: 25)',
            },
          },
          required: ['from', 'to'],
        },
      },
      {
        name: 'get_user_risk_score',
        description:
          'Retrieve the current risk score and active violations for a Securonix user by username.',
        inputSchema: {
          type: 'object',
          properties: {
            username: {
              type: 'string',
              description: 'The username or employee ID to look up',
            },
          },
          required: ['username'],
        },
      },
      {
        name: 'get_entity_risk_history',
        description:
          'Retrieve risk score history over time for a Securonix user or entity.',
        inputSchema: {
          type: 'object',
          properties: {
            username: {
              type: 'string',
              description: 'The username or entity ID',
            },
            from: {
              type: 'string',
              description: 'Start time in epoch milliseconds (optional)',
            },
            to: {
              type: 'string',
              description: 'End time in epoch milliseconds (optional)',
            },
          },
          required: ['username'],
        },
      },
      {
        name: 'list_watchlists',
        description:
          'List all watchlists configured in the Securonix tenant.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'add_to_watchlist',
        description:
          'Add a user or entity to a Securonix watchlist for elevated monitoring.',
        inputSchema: {
          type: 'object',
          properties: {
            watchlist_name: {
              type: 'string',
              description: 'Name of the watchlist to add the entity to',
            },
            entity_type: {
              type: 'string',
              description: 'Type of entity: Users, Activityip, Resources',
            },
            entity_name: {
              type: 'string',
              description: 'The entity identifier (username, IP address, or resource name)',
            },
          },
          required: ['watchlist_name', 'entity_type', 'entity_name'],
        },
      },
      {
        name: 'remove_from_watchlist',
        description:
          'Remove a user or entity from a Securonix watchlist.',
        inputSchema: {
          type: 'object',
          properties: {
            watchlist_name: {
              type: 'string',
              description: 'Name of the watchlist',
            },
            entity_name: {
              type: 'string',
              description: 'The entity identifier to remove',
            },
          },
          required: ['watchlist_name', 'entity_name'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'generate_token':
          return await this.generateToken(args);
        case 'list_incidents':
          return await this.listIncidents(args);
        case 'get_incident':
          return await this.getIncident(args);
        case 'update_incident':
          return await this.updateIncident(args);
        case 'add_comment_to_incident':
          return await this.addCommentToIncident(args);
        case 'spotter_search':
          return await this.spotterSearch(args);
        case 'list_violations':
          return await this.listViolations(args);
        case 'get_violation_details':
          return await this.getViolationDetails(args);
        case 'get_threats':
          return await this.getThreats(args);
        case 'get_user_risk_score':
          return await this.getUserRiskScore(args);
        case 'get_entity_risk_history':
          return await this.getEntityRiskHistory(args);
        case 'list_watchlists':
          return await this.listWatchlists();
        case 'add_to_watchlist':
          return await this.addToWatchlist(args);
        case 'remove_from_watchlist':
          return await this.removeFromWatchlist(args);
        default:
          return {
            content: [{ type: 'text', text: `Unknown tool: ${name}` }],
            isError: true,
          };
      }
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Tool execution failed: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }

  private async fetchWs(
    path: string,
    method: 'GET' | 'POST',
    extraParams?: Record<string, string>,
    body?: Record<string, unknown>,
  ): Promise<ToolResult> {
    const token = await this.ensureToken();
    const params = new URLSearchParams();
    if (extraParams) {
      for (const [k, v] of Object.entries(extraParams)) {
        params.set(k, v);
      }
    }

    const qs = params.toString();
    const url = `${this.baseUrl}/ws${path}${qs ? '?' + qs : ''}`;
    const headers: Record<string, string> = {
      'token': token,
    };
    if (body) {
      headers['Content-Type'] = 'application/json';
    }
    const response = await this.fetchWithRetry(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      let errText = '';
      try { errText = await response.text(); } catch { /* ignore */ }
      return {
        content: [
          {
            type: 'text',
            text: `Securonix API error ${response.status} ${response.statusText}: ${errText}`,
          },
        ],
        isError: true,
      };
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      const text = await response.text().catch(() => '');
      return {
        content: [{ type: 'text', text: this.truncate(text) }],
        isError: false,
      };
    }

    return {
      content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }],
      isError: false,
    };
  }

  private async generateToken(args: Record<string, unknown>): Promise<ToolResult> {
    const username = args.username as string;
    const password = args.password as string;
    if (!username || !password) {
      return {
        content: [{ type: 'text', text: 'username and password are required' }],
        isError: true,
      };
    }
    const validity = String(args.validity ?? 1);
    const response = await this.fetchWithRetry(`${this.baseUrl}/ws/token/generate`, {
      method: 'GET',
      headers: { username, password, validity },
    });
    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      return {
        content: [
          {
            type: 'text',
            text: `Token generation failed (HTTP ${response.status}): ${errText}`,
          },
        ],
        isError: true,
      };
    }
    const token = (await response.text()).trim();
    this.token = token;
    return {
      content: [{ type: 'text', text: JSON.stringify({ token }) }],
      isError: false,
    };
  }

  private async listIncidents(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      from: args.from as string,
      to: args.to as string,
    };
    if (args.rangeType) params.rangeType = args.rangeType as string;
    if (args.status) params.status = args.status as string;
    if (args.max) params.max = String(args.max);
    if (args.offset !== undefined) params.offset = String(args.offset);
    return this.fetchWs('/incident/listIncidents', 'GET', params);
  }

  private async getIncident(args: Record<string, unknown>): Promise<ToolResult> {
    const incidentId = args.incident_id as string;
    if (!incidentId) {
      return { content: [{ type: 'text', text: 'incident_id is required' }], isError: true };
    }
    return this.fetchWs('/incident/get', 'GET', { type: 'metaInfo', incidentId });
  }

  private async updateIncident(args: Record<string, unknown>): Promise<ToolResult> {
    const incidentId = args.incident_id as string;
    const action = args.action as string;
    if (!incidentId || !action) {
      return {
        content: [{ type: 'text', text: 'incident_id and action are required' }],
        isError: true,
      };
    }
    const params: Record<string, string> = { incidentId, actionName: action };
    if (args.status) params.status = args.status as string;
    if (args.comment) params.comment = args.comment as string;
    return this.fetchWs('/incident/actions', 'POST', params);
  }

  private async addCommentToIncident(args: Record<string, unknown>): Promise<ToolResult> {
    const incidentId = args.incident_id as string;
    const comment = args.comment as string;
    if (!incidentId || !comment) {
      return {
        content: [{ type: 'text', text: 'incident_id and comment are required' }],
        isError: true,
      };
    }
    return this.fetchWs('/incident/addComment', 'POST', { incidentId, comment });
  }

  private async spotterSearch(args: Record<string, unknown>): Promise<ToolResult> {
    const query = args.query as string;
    if (!query) {
      return { content: [{ type: 'text', text: 'query is required' }], isError: true };
    }
    const params: Record<string, string> = { query };
    if (args.from) params.startTime = args.from as string;
    if (args.to) params.endTime = args.to as string;
    if (args.max) params.max = String(args.max);
    return this.fetchWs('/spotter/index/search', 'GET', params);
  }

  private async listViolations(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      from: args.from as string,
      to: args.to as string,
    };
    if (args.max) params.max = String(args.max);
    if (args.offset !== undefined) params.offset = String(args.offset);
    return this.fetchWs('/violation/listviolations', 'GET', params);
  }

  private async getViolationDetails(args: Record<string, unknown>): Promise<ToolResult> {
    const violationId = args.violation_id as string;
    if (!violationId) {
      return { content: [{ type: 'text', text: 'violation_id is required' }], isError: true };
    }
    return this.fetchWs('/violation/getDetails', 'GET', { violationId });
  }

  private async getThreats(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      from: args.from as string,
      to: args.to as string,
    };
    if (args.type) params.type = args.type as string;
    if (args.max) params.max = String(args.max);
    return this.fetchWs('/sccWidget/getThreats', 'GET', params);
  }

  private async getUserRiskScore(args: Record<string, unknown>): Promise<ToolResult> {
    const username = args.username as string;
    if (!username) {
      return { content: [{ type: 'text', text: 'username is required' }], isError: true };
    }
    return this.fetchWs('/user/getUserRisk', 'GET', { username });
  }

  private async getEntityRiskHistory(args: Record<string, unknown>): Promise<ToolResult> {
    const username = args.username as string;
    if (!username) {
      return { content: [{ type: 'text', text: 'username is required' }], isError: true };
    }
    const params: Record<string, string> = { username };
    if (args.from) params.from = args.from as string;
    if (args.to) params.to = args.to as string;
    return this.fetchWs('/user/getEntityRiskHistory', 'GET', params);
  }

  private async listWatchlists(): Promise<ToolResult> {
    return this.fetchWs('/watchlist/getwatchlists', 'GET');
  }

  private async addToWatchlist(args: Record<string, unknown>): Promise<ToolResult> {
    const watchlist_name = args.watchlist_name as string;
    const entity_type = args.entity_type as string;
    const entity_name = args.entity_name as string;
    if (!watchlist_name || !entity_type || !entity_name) {
      return {
        content: [
          { type: 'text', text: 'watchlist_name, entity_type, and entity_name are required' },
        ],
        isError: true,
      };
    }
    return this.fetchWs('/watchlist/addToWatchlist', 'POST', {
      watchlistname: watchlist_name,
      type: entity_type,
      entityId: entity_name,
    });
  }

  private async removeFromWatchlist(args: Record<string, unknown>): Promise<ToolResult> {
    const watchlist_name = args.watchlist_name as string;
    const entity_name = args.entity_name as string;
    if (!watchlist_name || !entity_name) {
      return {
        content: [{ type: 'text', text: 'watchlist_name and entity_name are required' }],
        isError: true,
      };
    }
    return this.fetchWs('/watchlist/removeFromWatchlist', 'POST', {
      watchlistname: watchlist_name,
      entityId: entity_name,
    });
  }
}

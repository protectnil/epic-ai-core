/**
 * CrowdStrike Falcon Identity Protection MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/CrowdStrike/falcon-mcp — transport: stdio, auth: OAuth2 client credentials
//   Vendor-official (CrowdStrike/falcon-mcp), actively maintained (latest release v0.8.0 on 2026-03-09).
//   The falcon-mcp Identity Protection module exposes 1 tool: idp_investigate_entity (entity investigation).
//   This adapter provides 12 tools with broader REST coverage of Identity Threat Detection endpoints
//   and Zero Trust Assessment — operations the vendor MCP does not expose individually.
// Our adapter covers: 12 tools (identity detections, entities, entity timeline, compromised credentials,
//   lateral movement, ZTA scores/assessments, GraphQL, identity incidents).
// Vendor MCP identity tools: 1 (idp_investigate_entity — broad entity investigation via GraphQL).
// Recommendation: use-both — vendor MCP idp_investigate_entity provides richer entity investigation
//   via GraphQL internally; our adapter covers ZTA and discrete REST operations not in vendor MCP.
// Integration: use-both
//   MCP-sourced tools (1): idp_investigate_entity
//   REST-sourced tools (12): list_identity_detections, get_identity_detection, update_identity_detection,
//     list_identity_entities, get_identity_entity, get_entity_timeline, search_compromised_credentials,
//     get_lateral_movement, get_zta_score, list_zta_assessments, query_identity_graphql, list_identity_incidents
//
// Base URL: https://api.crowdstrike.com (US-1), https://api.us-2.crowdstrike.com (US-2)
// Auth: OAuth2 client credentials — POST /oauth2/token with client_id + client_secret form body
//   Required scopes: Identity Protection Entities (READ), Identity Protection Detections (READ),
//   Identity Protection Timeline (READ), Identity Protection Assessment (READ),
//   Identity Protection GraphQL (WRITE), Zero Trust Assessment (READ)
// Docs: https://www.falconpy.io/Service-Collections/Identity-Protection.html
//       https://www.falconpy.io/Service-Collections/Zero-Trust-Assessment.html
// Rate limits: Shared with Falcon platform; typically 6000 req/min per token
// NOTE: Several identity-protection/* REST endpoints (queries/detections, entities/detections/GET,
//   queries/entities, entities/entities/GET, queries/incidents, combined/timeline, combined/graphql,
//   queries/compromised-credentials, combined/lateral-movement) are confirmed in usage by third-party
//   integrations (D3 SOAR, Query.ai) but are not fully documented in public FalconPy reference.
//   ZTA endpoints (/zero-trust-assessment/entities/assessments/v1 and /queries/assessments/v1) are
//   confirmed in FalconPy Zero Trust Assessment docs.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface CrowdStrikeIdentityConfig {
  clientId: string;
  clientSecret: string;
  baseUrl?: string;
}

function escapeFql(value: string): string {
  return value.replace(/'/g, "\\'");
}

export class CrowdStrikeIdentityMCPServer extends MCPAdapterBase {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly baseUrl: string;
  private bearerToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(config: CrowdStrikeIdentityConfig) {
    super();
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.baseUrl = config.baseUrl ?? 'https://api.crowdstrike.com';
  }

  static catalog() {
    return {
      name: 'crowdstrike-identity',
      displayName: 'CrowdStrike Falcon Identity Protection',
      version: '1.0.0',
      category: 'identity' as const,
      keywords: [
        'crowdstrike', 'falcon', 'identity', 'identity protection', 'itd',
        'identity threat detection', 'lateral movement', 'compromised credentials',
        'zero trust', 'zta', 'risk score', 'entity', 'service account', 'privileged account',
        'credential exposure', 'password spray', 'kerberoasting', 'pass-the-hash',
        'user risk', 'identity security',
      ],
      toolNames: [
        'list_identity_detections', 'get_identity_detection', 'update_identity_detection',
        'list_identity_entities', 'get_identity_entity', 'get_entity_timeline',
        'search_compromised_credentials',
        'get_lateral_movement',
        'get_zta_score', 'list_zta_assessments',
        'query_identity_graphql',
        'list_identity_incidents',
      ],
      description: 'CrowdStrike Falcon Identity Protection: detect identity-based threats, analyze lateral movement, query compromised credentials, assess Zero Trust scores, and investigate entity timelines via REST and GraphQL.',
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
      throw new Error(`CrowdStrike Identity OAuth2 token request failed: ${response.status} ${response.statusText}`);
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
      throw new Error(`CrowdStrike Identity returned non-JSON response (HTTP ${response.status})`);
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
      throw new Error(`CrowdStrike Identity returned non-JSON response (HTTP ${response.status})`);
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
      throw new Error(`CrowdStrike Identity returned non-JSON response (HTTP ${response.status})`);
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
        name: 'list_identity_detections',
        description: 'List Falcon Identity Threat Detection events with FQL filter for severity, type, and status',
        inputSchema: {
          type: 'object',
          properties: {
            filter: {
              type: 'string',
              description: 'FQL filter (e.g. "severity:\'high\'+status:\'new\'")',
            },
            limit: { type: 'number', description: 'Max detections to return (default: 50)' },
            offset: { type: 'number', description: 'Pagination offset (default: 0)' },
            sort: {
              type: 'string',
              description: 'Sort expression (e.g. "created_timestamp|desc")',
            },
          },
        },
      },
      {
        name: 'get_identity_detection',
        description: 'Get full details for one or more identity detections by detection ID array',
        inputSchema: {
          type: 'object',
          properties: {
            ids: {
              type: 'array',
              items: { type: 'string' },
              description: 'Array of identity detection IDs to retrieve',
            },
          },
          required: ['ids'],
        },
      },
      {
        name: 'update_identity_detection',
        description: 'Update the status or assigned user on one or more identity detections',
        inputSchema: {
          type: 'object',
          properties: {
            ids: {
              type: 'array',
              items: { type: 'string' },
              description: 'Array of identity detection IDs to update',
            },
            status: {
              type: 'string',
              description: 'New status: new, in_progress, closed, ignored',
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
        name: 'list_identity_entities',
        description: 'List identity entities (users, service accounts, privileged accounts) with FQL filter for type and risk level',
        inputSchema: {
          type: 'object',
          properties: {
            filter: {
              type: 'string',
              description: 'FQL filter (e.g. "entity_type:\'user\'+risk_score_severity:\'high\'")',
            },
            limit: { type: 'number', description: 'Max entities to return (default: 50)' },
            offset: { type: 'number', description: 'Pagination offset (default: 0)' },
            sort: {
              type: 'string',
              description: 'Sort expression (e.g. "risk_score.desc")',
            },
          },
        },
      },
      {
        name: 'get_identity_entity',
        description: 'Get detailed risk profile and activity summary for one or more identity entities by entity ID',
        inputSchema: {
          type: 'object',
          properties: {
            ids: {
              type: 'array',
              items: { type: 'string' },
              description: 'Array of identity entity IDs to retrieve',
            },
          },
          required: ['ids'],
        },
      },
      {
        name: 'get_entity_timeline',
        description: 'Get chronological activity timeline for an identity entity showing authentication events, access patterns, and anomalies',
        inputSchema: {
          type: 'object',
          properties: {
            entity_id: {
              type: 'string',
              description: 'Identity entity ID to retrieve the timeline for',
            },
            start_time: {
              type: 'string',
              description: 'ISO 8601 start time for the timeline window (e.g. 2026-03-01T00:00:00Z)',
            },
            end_time: {
              type: 'string',
              description: 'ISO 8601 end time for the timeline window (default: now)',
            },
            limit: { type: 'number', description: 'Max timeline events to return (default: 100)' },
          },
          required: ['entity_id'],
        },
      },
      {
        name: 'search_compromised_credentials',
        description: 'Search for compromised credential exposures by username or domain in CrowdStrike Intelligence',
        inputSchema: {
          type: 'object',
          properties: {
            username: {
              type: 'string',
              description: 'Username or email address to search for credential exposures',
            },
            domain: {
              type: 'string',
              description: 'Domain filter to scope credential exposure search',
            },
            limit: { type: 'number', description: 'Max results to return (default: 50)' },
            offset: { type: 'number', description: 'Pagination offset (default: 0)' },
          },
        },
      },
      {
        name: 'get_lateral_movement',
        description: 'Get lateral movement analysis for an identity entity showing paths, accessed systems, and risk assessment',
        inputSchema: {
          type: 'object',
          properties: {
            entity_id: {
              type: 'string',
              description: 'Identity entity ID to analyze for lateral movement',
            },
            entity_type: {
              type: 'string',
              description: 'Entity type: user, service_account, computer (default: user)',
            },
            time_window: {
              type: 'string',
              description: 'Lookback window: 1h, 6h, 24h, 7d, 30d (default: 24h)',
            },
          },
          required: ['entity_id'],
        },
      },
      {
        name: 'get_zta_score',
        description: 'Get Zero Trust Assessment score and posture for one or more hosts by agent ID',
        inputSchema: {
          type: 'object',
          properties: {
            ids: {
              type: 'array',
              items: { type: 'string' },
              description: 'Array of host agent IDs (device_id) to retrieve ZTA scores for',
            },
          },
          required: ['ids'],
        },
      },
      {
        name: 'list_zta_assessments',
        description: 'List Zero Trust Assessment records with optional FQL filter for score range and compliance status',
        inputSchema: {
          type: 'object',
          properties: {
            filter: {
              type: 'string',
              description: 'FQL filter (e.g. "score:<50+product:\'falcon\'")',
            },
            limit: { type: 'number', description: 'Max assessments to return (default: 100)' },
            after: { type: 'string', description: 'Pagination cursor from a previous response' },
          },
        },
      },
      {
        name: 'query_identity_graphql',
        description: 'Execute a GraphQL query against the Falcon Identity Protection GraphQL API for advanced entity and incident queries',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'GraphQL query string targeting entities, timeline, incidents, or security assessment',
            },
            variables: {
              type: 'object',
              description: 'GraphQL variables object to pass with the query',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'list_identity_incidents',
        description: 'List identity-based security incidents (e.g. password spray, kerberoasting, pass-the-hash) with FQL filter',
        inputSchema: {
          type: 'object',
          properties: {
            filter: {
              type: 'string',
              description: 'FQL filter (e.g. "tactic:\'Credential Access\'+status:\'new\'")',
            },
            limit: { type: 'number', description: 'Max incidents to return (default: 50)' },
            offset: { type: 'number', description: 'Pagination offset (default: 0)' },
            sort: {
              type: 'string',
              description: 'Sort expression (e.g. "start_time.desc")',
            },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_identity_detections':
          return this.listIdentityDetections(args);
        case 'get_identity_detection':
          return this.getIdentityDetection(args);
        case 'update_identity_detection':
          return this.updateIdentityDetection(args);
        case 'list_identity_entities':
          return this.listIdentityEntities(args);
        case 'get_identity_entity':
          return this.getIdentityEntity(args);
        case 'get_entity_timeline':
          return this.getEntityTimeline(args);
        case 'search_compromised_credentials':
          return this.searchCompromisedCredentials(args);
        case 'get_lateral_movement':
          return this.getLateralMovement(args);
        case 'get_zta_score':
          return this.getZtaScore(args);
        case 'list_zta_assessments':
          return this.listZtaAssessments(args);
        case 'query_identity_graphql':
          return this.queryIdentityGraphql(args);
        case 'list_identity_incidents':
          return this.listIdentityIncidents(args);
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

  private async listIdentityDetections(args: Record<string, unknown>): Promise<ToolResult> {
    const limit = (args.limit as number) ?? 50;
    const offset = (args.offset as number) ?? 0;
    const filter = args.filter as string | undefined;
    const sort = args.sort as string | undefined;
    let url = `/identity-protection/queries/detections/v1?limit=${limit}&offset=${offset}`;
    if (filter) url += `&filter=${encodeURIComponent(filter)}`;
    if (sort) url += `&sort=${encodeURIComponent(sort)}`;
    return this.get(url);
  }

  private async getIdentityDetection(args: Record<string, unknown>): Promise<ToolResult> {
    const ids = args.ids as string[];
    if (!ids || ids.length === 0) return { content: [{ type: 'text', text: 'ids is required and must not be empty' }], isError: true };
    const idsParam = ids.map(id => `ids=${encodeURIComponent(id)}`).join('&');
    return this.get(`/identity-protection/entities/detections/GET/v1?${idsParam}`);
  }

  private async updateIdentityDetection(args: Record<string, unknown>): Promise<ToolResult> {
    const ids = args.ids as string[];
    if (!ids || ids.length === 0) return { content: [{ type: 'text', text: 'ids is required and must not be empty' }], isError: true };
    const body: Record<string, unknown> = { ids };
    if (args.status) body.status = args.status;
    if (args.assigned_to_uuid) body.assigned_to_uuid = args.assigned_to_uuid;
    if (args.comment) body.comment = args.comment;
    return this.patch('/identity-protection/entities/detections/v1', body);
  }

  private async listIdentityEntities(args: Record<string, unknown>): Promise<ToolResult> {
    const limit = (args.limit as number) ?? 50;
    const offset = (args.offset as number) ?? 0;
    const filter = args.filter as string | undefined;
    const sort = args.sort as string | undefined;
    let url = `/identity-protection/queries/entities/v1?limit=${limit}&offset=${offset}`;
    if (filter) url += `&filter=${encodeURIComponent(filter)}`;
    if (sort) url += `&sort=${encodeURIComponent(sort)}`;
    return this.get(url);
  }

  private async getIdentityEntity(args: Record<string, unknown>): Promise<ToolResult> {
    const ids = args.ids as string[];
    if (!ids || ids.length === 0) return { content: [{ type: 'text', text: 'ids is required and must not be empty' }], isError: true };
    const idsParam = ids.map(id => `ids=${encodeURIComponent(id)}`).join('&');
    return this.get(`/identity-protection/entities/entities/GET/v1?${idsParam}`);
  }

  private async getEntityTimeline(args: Record<string, unknown>): Promise<ToolResult> {
    const entityId = args.entity_id as string;
    if (!entityId) return { content: [{ type: 'text', text: 'entity_id is required' }], isError: true };
    const body: Record<string, unknown> = { entity_id: entityId };
    if (args.start_time) body.start_time = args.start_time;
    if (args.end_time) body.end_time = args.end_time;
    if (args.limit) body.limit = args.limit;
    return this.post('/identity-protection/combined/timeline/v1', body);
  }

  private async searchCompromisedCredentials(args: Record<string, unknown>): Promise<ToolResult> {
    const username = args.username as string | undefined;
    const domain = args.domain as string | undefined;
    const limit = (args.limit as number) ?? 50;
    const offset = (args.offset as number) ?? 0;
    const parts: string[] = [];
    if (username) parts.push(`username:'${escapeFql(username)}'`);
    if (domain) parts.push(`domain:'${escapeFql(domain)}'`);
    const filter = parts.join('+');
    let url = `/identity-protection/queries/compromised-credentials/v1?limit=${limit}&offset=${offset}`;
    if (filter) url += `&filter=${encodeURIComponent(filter)}`;
    return this.get(url);
  }

  private async getLateralMovement(args: Record<string, unknown>): Promise<ToolResult> {
    const entityId = args.entity_id as string;
    if (!entityId) return { content: [{ type: 'text', text: 'entity_id is required' }], isError: true };
    const entityType = (args.entity_type as string) ?? 'user';
    const timeWindow = (args.time_window as string) ?? '24h';
    return this.get(
      `/identity-protection/combined/lateral-movement/v1?entity_id=${encodeURIComponent(entityId)}&entity_type=${encodeURIComponent(entityType)}&time_window=${encodeURIComponent(timeWindow)}`
    );
  }

  private async getZtaScore(args: Record<string, unknown>): Promise<ToolResult> {
    const ids = args.ids as string[];
    if (!ids || ids.length === 0) return { content: [{ type: 'text', text: 'ids is required and must not be empty' }], isError: true };
    const idsParam = ids.map(id => `ids=${encodeURIComponent(id)}`).join('&');
    return this.get(`/zero-trust-assessment/entities/assessments/v1?${idsParam}`);
  }

  private async listZtaAssessments(args: Record<string, unknown>): Promise<ToolResult> {
    const limit = (args.limit as number) ?? 100;
    const filter = args.filter as string | undefined;
    const after = args.after as string | undefined;
    let url = `/zero-trust-assessment/queries/assessments/v1?limit=${limit}`;
    if (filter) url += `&filter=${encodeURIComponent(filter)}`;
    if (after) url += `&after=${encodeURIComponent(after)}`;
    return this.get(url);
  }

  private async queryIdentityGraphql(args: Record<string, unknown>): Promise<ToolResult> {
    const query = args.query as string;
    if (!query) return { content: [{ type: 'text', text: 'query is required' }], isError: true };
    const body: Record<string, unknown> = { query };
    if (args.variables) body.variables = args.variables;
    return this.post('/identity-protection/combined/graphql/v1', body);
  }

  private async listIdentityIncidents(args: Record<string, unknown>): Promise<ToolResult> {
    const limit = (args.limit as number) ?? 50;
    const offset = (args.offset as number) ?? 0;
    const filter = args.filter as string | undefined;
    const sort = args.sort as string | undefined;
    let url = `/identity-protection/queries/incidents/v1?limit=${limit}&offset=${offset}`;
    if (filter) url += `&filter=${encodeURIComponent(filter)}`;
    if (sort) url += `&sort=${encodeURIComponent(sort)}`;
    return this.get(url);
  }
}

/**
 * GitGuardian MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/GitGuardian/ggmcp — transport: stdio + HTTP/SSE, auth: OAuth/PAT.
//   Vendor-published (GitGuardian Inc.). Last commit Mar 25, 2026 (actively maintained).
//   Exposes 12 tools: scan_secrets, list_incidents, get_incident, list_repo_occurrences,
//   remediate_incidents, find_current_source, list_sources, list_detectors,
//   generate_honeytoken, list_honeytokens, list_users, get_member.
//   Meets all 4 criteria (official, maintained, 10+ tools, stdio+HTTP transport).
// Our adapter covers: 13 tools. Vendor MCP covers: 12 tools.
// Integration: use-both
//   MCP-only tools (not in our REST adapter): list_repo_occurrences, remediate_incidents,
//     find_current_source, list_detectors.
//   REST-only tools (not in vendor MCP): health_check, update_incident_status,
//     scan_content (multiscan endpoint), list_audit_logs, list_custom_tags, create_custom_tag.
//   Shared (both cover): list_secret_incidents, get_secret_incident, list_sources,
//     list_honeytokens, get_honeytoken, create_honeytoken, list_members.
// MCP-sourced tools (4): list_repo_occurrences, remediate_incidents, find_current_source, list_detectors
// REST-sourced tools (9): health_check, list_secret_incidents, get_secret_incident,
//   update_incident_status, scan_content, list_sources, list_honeytokens, get_honeytoken,
//   create_honeytoken, list_members, list_audit_logs, list_custom_tags, create_custom_tag
// Combined coverage: 17 tools (MCP: 12 + REST: 13 - shared: 8)
//
// Base URL (SaaS): https://api.gitguardian.com
// Base URL (self-hosted): https://{your-instance}/api  (pass via baseUrl config)
// Auth: Authorization header using "Token {api_key}" prefix (NOT Bearer)
// Docs: https://docs.gitguardian.com/api-docs/api-reference
// Rate limits: Not officially published; recommended < 300 req/min for SaaS

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface GitGuardianConfig {
  apiKey: string;
  baseUrl?: string;
}

export class GitGuardianMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: GitGuardianConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = (config.baseUrl ?? 'https://api.gitguardian.com').replace(/\/$/, '');
  }

  static catalog() {
    return {
      name: 'gitguardian',
      displayName: 'GitGuardian',
      version: '1.0.0',
      category: 'cybersecurity',
      keywords: [
        'gitguardian', 'secret scanning', 'secrets', 'credentials', 'api keys',
        'hardcoded secrets', 'incident', 'honeytoken', 'canary token',
        'security', 'devsecops', 'source code', 'leak detection', 'remediation',
        'audit log', 'member', 'custom tag',
      ],
      toolNames: [
        'health_check',
        'list_secret_incidents', 'get_secret_incident', 'update_incident_status',
        'scan_content',
        'list_sources',
        'list_honeytokens', 'get_honeytoken', 'create_honeytoken',
        'list_members',
        'list_audit_logs',
        'list_custom_tags', 'create_custom_tag',
      ],
      description: 'Secret scanning and security: detect hardcoded secrets in code, manage incidents, create honeytokens, audit members and log events.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'health_check',
        description: 'Verify the API key is valid and confirm connectivity to the GitGuardian API',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'list_secret_incidents',
        description: 'List secret detection incidents in the workspace — hardcoded API keys, credentials, and tokens detected in commits or files',
        inputSchema: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              description: 'Filter by status: IGNORED, TRIGGERED, ASSIGNED, RESOLVED (default: all statuses)',
            },
            severity: {
              type: 'string',
              description: 'Filter by severity: critical, high, medium, low, info, unknown',
            },
            date_before: {
              type: 'string',
              description: 'ISO 8601 datetime — return incidents detected before this time',
            },
            date_after: {
              type: 'string',
              description: 'ISO 8601 datetime — return incidents detected after this time',
            },
            assignee_email: {
              type: 'string',
              description: 'Filter by assigned team member email address',
            },
            per_page: {
              type: 'number',
              description: 'Results per page (max 100, default: 20)',
            },
            cursor: {
              type: 'string',
              description: 'Cursor-based pagination token from a previous response Link header',
            },
          },
        },
      },
      {
        name: 'get_secret_incident',
        description: 'Get full details of a specific secret incident by numeric ID, including secret type, affected sources, and remediation history',
        inputSchema: {
          type: 'object',
          properties: {
            incident_id: {
              type: 'number',
              description: 'Numeric ID of the secret incident to retrieve',
            },
          },
          required: ['incident_id'],
        },
      },
      {
        name: 'update_incident_status',
        description: 'Change a secret incident status via action endpoint — resolve, ignore (with reason), assign (to email), or reopen',
        inputSchema: {
          type: 'object',
          properties: {
            incident_id: {
              type: 'number',
              description: 'Numeric ID of the incident to update',
            },
            action: {
              type: 'string',
              description: 'Action to perform: resolve, ignore, assign, reopen',
            },
            assignee_email: {
              type: 'string',
              description: 'Email of team member to assign the incident to (required when action is assign)',
            },
            ignore_reason: {
              type: 'string',
              description: 'Required when action is ignore: test_credential, false_positive, low_risk, invalid',
            },
          },
          required: ['incident_id', 'action'],
        },
      },
      {
        name: 'scan_content',
        description: 'Scan one or more documents for hardcoded secrets using GitGuardian detectors — supports 500+ secret types including AWS, GCP, GitHub, Stripe, and more',
        inputSchema: {
          type: 'object',
          properties: {
            documents: {
              type: 'array',
              description: 'Array of document objects to scan. Each object must have "filename" (string) and "document" (string content to scan).',
              items: { type: 'object' },
            },
          },
          required: ['documents'],
        },
      },
      {
        name: 'list_sources',
        description: 'List monitored sources (repositories, CI/CD integrations, cloud storage) registered in the GitGuardian workspace',
        inputSchema: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              description: 'Filter by source type: github, gitlab, bitbucket, azure_devops, jira, confluence, etc.',
            },
            per_page: {
              type: 'number',
              description: 'Results per page (max 100, default: 20)',
            },
            cursor: {
              type: 'string',
              description: 'Cursor-based pagination token from a previous response',
            },
          },
        },
      },
      {
        name: 'list_honeytokens',
        description: 'List honeytokens in the workspace — fake credentials deployed to detect unauthorized access attempts',
        inputSchema: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              description: 'Filter by status: triggered, active (default: all)',
            },
            type: {
              type: 'string',
              description: 'Filter by token type: AWS, GCP, Azure, GitHub, GitLab, SendGrid, etc.',
            },
            per_page: {
              type: 'number',
              description: 'Results per page (max 100, default: 20)',
            },
            cursor: {
              type: 'string',
              description: 'Cursor-based pagination token from a previous response',
            },
          },
        },
      },
      {
        name: 'get_honeytoken',
        description: 'Get full details of a specific honeytoken by ID, including trigger history and placement context',
        inputSchema: {
          type: 'object',
          properties: {
            honeytoken_id: {
              type: 'string',
              description: 'UUID of the honeytoken to retrieve',
            },
          },
          required: ['honeytoken_id'],
        },
      },
      {
        name: 'create_honeytoken',
        description: 'Create a new honeytoken of a specified type — when accessed, it triggers an alert in GitGuardian',
        inputSchema: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              description: 'Honeytoken type: AWS, GCP, Azure, GitHub, GitLab, SendGrid, etc.',
            },
            name: {
              type: 'string',
              description: 'Human-readable name for this honeytoken',
            },
            description: {
              type: 'string',
              description: 'Optional context for where this honeytoken will be placed (e.g. "deployed in prod .env")',
            },
          },
          required: ['type', 'name'],
        },
      },
      {
        name: 'list_members',
        description: 'List members of the GitGuardian workspace with their roles and invitation status',
        inputSchema: {
          type: 'object',
          properties: {
            per_page: {
              type: 'number',
              description: 'Results per page (max 100, default: 20)',
            },
            cursor: {
              type: 'string',
              description: 'Cursor-based pagination token from a previous response',
            },
          },
        },
      },
      {
        name: 'list_audit_logs',
        description: 'List workspace audit log events — tracks member actions, configuration changes, and API key usage',
        inputSchema: {
          type: 'object',
          properties: {
            date_before: {
              type: 'string',
              description: 'ISO 8601 datetime — return events before this time',
            },
            date_after: {
              type: 'string',
              description: 'ISO 8601 datetime — return events after this time',
            },
            per_page: {
              type: 'number',
              description: 'Results per page (max 100, default: 20)',
            },
            cursor: {
              type: 'string',
              description: 'Cursor-based pagination token from a previous response',
            },
          },
        },
      },
      {
        name: 'list_custom_tags',
        description: 'List custom tags defined in the workspace — used to categorize and triage secret incidents',
        inputSchema: {
          type: 'object',
          properties: {
            per_page: {
              type: 'number',
              description: 'Results per page (max 100, default: 20)',
            },
            cursor: {
              type: 'string',
              description: 'Cursor-based pagination token from a previous response',
            },
          },
        },
      },
      {
        name: 'create_custom_tag',
        description: 'Create a new custom tag (key/value pair) for categorizing and filtering secret incidents in the workspace',
        inputSchema: {
          type: 'object',
          properties: {
            key: {
              type: 'string',
              description: 'Tag key — identifies the category (e.g. "env", "team", "severity")',
            },
            value: {
              type: 'string',
              description: 'Optional tag value — qualifier for the key (e.g. "prod", "security", "critical")',
            },
          },
          required: ['key'],
        },
      },
    ];
  }

  private get authHeaders(): Record<string, string> {
    return {
      Authorization: `Token ${this.apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  private async request(path: string, method: string, body?: unknown): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method,
      headers: this.authHeaders,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return {
        content: [{ type: 'text', text: `GitGuardian API error ${response.status}: ${errText}` }],
        isError: true,
      };
    }
    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new Error(`GitGuardian returned non-JSON response (HTTP ${response.status})`);
    }
    return {
      content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }],
      isError: false,
    };
  }

  private buildPath(base: string, params: Record<string, string | number | undefined>): string {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) p.set(k, String(v));
    }
    const qs = p.toString();
    return qs ? `${base}?${qs}` : base;
  }

  private async healthCheck(): Promise<ToolResult> {
    return this.request('/v1/health', 'GET');
  }

  private async listSecretIncidents(args: Record<string, unknown>): Promise<ToolResult> {
    const path = this.buildPath('/v1/incidents/secrets', {
      per_page: (args.per_page as number) ?? 20,
      status: args.status as string | undefined,
      severity: args.severity as string | undefined,
      date_before: args.date_before as string | undefined,
      date_after: args.date_after as string | undefined,
      assignee_email: args.assignee_email as string | undefined,
      cursor: args.cursor as string | undefined,
    });
    return this.request(path, 'GET');
  }

  private async getSecretIncident(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.incident_id as number;
    if (!id) return { content: [{ type: 'text', text: 'incident_id is required' }], isError: true };
    return this.request(`/v1/incidents/secrets/${id}`, 'GET');
  }

  private async updateIncidentStatus(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.incident_id as number;
    if (!id) return { content: [{ type: 'text', text: 'incident_id is required' }], isError: true };
    const action = (args.action as string | undefined)?.toLowerCase();
    if (!action) return { content: [{ type: 'text', text: 'action is required: resolve, ignore, assign, or reopen' }], isError: true };
    switch (action) {
      case 'resolve':
        return this.request(`/v1/incidents/secrets/${id}/resolve`, 'POST');
      case 'ignore': {
        const ignore_reason = args.ignore_reason as string | undefined;
        if (!ignore_reason) return { content: [{ type: 'text', text: 'ignore_reason is required when action is ignore' }], isError: true };
        return this.request(`/v1/incidents/secrets/${id}/ignore`, 'POST', { ignore_reason });
      }
      case 'assign': {
        const assignee_email = args.assignee_email as string | undefined;
        if (!assignee_email) return { content: [{ type: 'text', text: 'assignee_email is required when action is assign' }], isError: true };
        return this.request(`/v1/incidents/secrets/${id}/assign`, 'POST', { assignee_email });
      }
      case 'reopen':
        return this.request(`/v1/incidents/secrets/${id}/reopen`, 'POST');
      default:
        return { content: [{ type: 'text', text: `Unknown action: ${action}. Valid actions: resolve, ignore, assign, reopen` }], isError: true };
    }
  }

  private async scanContent(args: Record<string, unknown>): Promise<ToolResult> {
    const documents = args.documents as Array<{ filename: string; document: string }>;
    if (!documents || !Array.isArray(documents) || documents.length === 0) {
      return { content: [{ type: 'text', text: 'documents array is required and must not be empty' }], isError: true };
    }
    return this.request('/v1/multiscan', 'POST', documents);
  }

  private async listSources(args: Record<string, unknown>): Promise<ToolResult> {
    const path = this.buildPath('/v1/sources', {
      per_page: (args.per_page as number) ?? 20,
      type: args.type as string | undefined,
      cursor: args.cursor as string | undefined,
    });
    return this.request(path, 'GET');
  }

  private async listHoneytokens(args: Record<string, unknown>): Promise<ToolResult> {
    const path = this.buildPath('/v1/honeytokens', {
      per_page: (args.per_page as number) ?? 20,
      status: args.status as string | undefined,
      type: args.type as string | undefined,
      cursor: args.cursor as string | undefined,
    });
    return this.request(path, 'GET');
  }

  private async getHoneytoken(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.honeytoken_id as string;
    if (!id) return { content: [{ type: 'text', text: 'honeytoken_id is required' }], isError: true };
    return this.request(`/v1/honeytokens/${encodeURIComponent(id)}`, 'GET');
  }

  private async createHoneytoken(args: Record<string, unknown>): Promise<ToolResult> {
    const type = args.type as string;
    const name = args.name as string;
    if (!type || !name) return { content: [{ type: 'text', text: 'type and name are required' }], isError: true };
    const body: Record<string, unknown> = { type, name };
    if (args.description) body.description = args.description;
    return this.request('/v1/honeytokens', 'POST', body);
  }

  private async listMembers(args: Record<string, unknown>): Promise<ToolResult> {
    const path = this.buildPath('/v1/members', {
      per_page: (args.per_page as number) ?? 20,
      cursor: args.cursor as string | undefined,
    });
    return this.request(path, 'GET');
  }

  private async listAuditLogs(args: Record<string, unknown>): Promise<ToolResult> {
    const path = this.buildPath('/v1/audit_logs', {
      per_page: (args.per_page as number) ?? 20,
      date_before: args.date_before as string | undefined,
      date_after: args.date_after as string | undefined,
      cursor: args.cursor as string | undefined,
    });
    return this.request(path, 'GET');
  }

  private async listCustomTags(args: Record<string, unknown>): Promise<ToolResult> {
    const path = this.buildPath('/v1/tags', {
      per_page: (args.per_page as number) ?? 20,
      cursor: args.cursor as string | undefined,
    });
    return this.request(path, 'GET');
  }

  private async createCustomTag(args: Record<string, unknown>): Promise<ToolResult> {
    const key = args.key as string;
    if (!key) return { content: [{ type: 'text', text: 'key is required' }], isError: true };
    const body: Record<string, unknown> = { key };
    if (args.value !== undefined) body.value = args.value;
    return this.request('/v1/tags', 'POST', body);
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'health_check':          return await this.healthCheck();
        case 'list_secret_incidents': return await this.listSecretIncidents(args);
        case 'get_secret_incident':   return await this.getSecretIncident(args);
        case 'update_incident_status':return await this.updateIncidentStatus(args);
        case 'scan_content':          return await this.scanContent(args);
        case 'list_sources':          return await this.listSources(args);
        case 'list_honeytokens':      return await this.listHoneytokens(args);
        case 'get_honeytoken':        return await this.getHoneytoken(args);
        case 'create_honeytoken':     return await this.createHoneytoken(args);
        case 'list_members':          return await this.listMembers(args);
        case 'list_audit_logs':       return await this.listAuditLogs(args);
        case 'list_custom_tags':      return await this.listCustomTags(args);
        case 'create_custom_tag':     return await this.createCustomTag(args);
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
}

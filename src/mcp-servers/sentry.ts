/**
 * Sentry MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/getsentry/sentry-mcp — transport: streamable-HTTP with SSE fallback, auth: OAuth
// Sentry hosts a managed remote MCP server at https://mcp.sentry.dev with OAuth authentication.
// Vendor MCP covers 16+ tools: whoami, find_organizations, find_projects, find_issues, get_issue_details,
//   find_releases, search_issues, search_events, create_project, update_issue, and others.
// Our adapter covers: 15 tools including write operations (resolve, update, ignore, assign, create comments, manage releases).
// Recommendation: use-both — MCP has semantic search tools (search_issues, search_events with AI translation) not
//   exposed through the REST API. Our adapter covers write-heavy operations and release/deploy management not fully
//   covered by the MCP. Use vendor MCP for IDE/coding-assistant workflows; use this adapter for operational automation.
//
// Integration: use-both
// MCP-sourced tools (unique): search_issues (AI-powered semantic), search_events (AI-powered semantic), whoami, get_issue_details
// REST-sourced tools: list_organizations, list_projects, list_teams, list_issues, get_issue, update_issue,
//   list_events, get_event, list_releases, get_release, list_release_deploys, search_issues (basic query),
//   list_project_alerts, list_team_members, create_project_note
// Combined coverage: REST adapter provides 15 tools; vendor MCP provides 16+ with AI-assisted search
//
// Base URL: https://sentry.io/api/0
// Auth: Bearer token — Authorization: Bearer {auth_token}
// Docs: https://docs.sentry.io/api/
// Rate limits: Per-endpoint, per-caller fixed-window limits (not a single global rate). Polling discouraged; use webhooks.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';
import type { AdapterCatalogEntry } from '../federation/AdapterCatalog.js';

interface SentryConfig {
  authToken: string;
  baseUrl?: string;
}

export class SentryMCPServer extends MCPAdapterBase {
  private readonly authToken: string;
  private readonly baseUrl: string;

  constructor(config: SentryConfig) {
    super();
    this.authToken = config.authToken;
    this.baseUrl = config.baseUrl
      ? config.baseUrl.replace(/\/$/, '')
      : 'https://sentry.io/api/0';
  }

  static catalog(): AdapterCatalogEntry {
    return {
      name: 'sentry',
      displayName: 'Sentry',
      version: '1.0.0',
      category: 'observability',
      keywords: [
        'sentry', 'error', 'exception', 'issue', 'event', 'stacktrace', 'debug',
        'release', 'deploy', 'performance', 'transaction', 'project', 'organization',
        'team', 'alert', 'monitoring', 'apm', 'crash', 'bug',
      ],
      toolNames: [
        'list_organizations', 'list_projects', 'list_teams',
        'list_issues', 'get_issue', 'update_issue', 'list_events',
        'get_event', 'list_releases', 'get_release', 'list_release_deploys',
        'search_issues', 'list_project_alerts', 'list_team_members', 'create_project_note',
      ],
      description: 'Error monitoring and performance: list and triage issues, inspect events and stacktraces, manage releases and deploys, resolve and assign issues, configure alerts.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_organizations',
        description: 'List all Sentry organizations accessible to the authenticated token',
        inputSchema: {
          type: 'object',
          properties: {
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response Link header',
            },
          },
        },
      },
      {
        name: 'list_projects',
        description: 'List all projects in a Sentry organization with optional pagination',
        inputSchema: {
          type: 'object',
          properties: {
            organization_slug: {
              type: 'string',
              description: 'The organization slug (short identifier)',
            },
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
          },
          required: ['organization_slug'],
        },
      },
      {
        name: 'list_teams',
        description: "List all teams in a Sentry organization with member counts and project associations",
        inputSchema: {
          type: 'object',
          properties: {
            organization_slug: {
              type: 'string',
              description: 'The organization slug',
            },
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
          },
          required: ['organization_slug'],
        },
      },
      {
        name: 'list_issues',
        description: 'List issues for a Sentry project with optional query filter, status, sort, and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            organization_slug: {
              type: 'string',
              description: 'The organization slug',
            },
            project_slug: {
              type: 'string',
              description: 'The project slug',
            },
            query: {
              type: 'string',
              description: 'Sentry search query (e.g., "is:unresolved assigned:me", "level:error")',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of issues to return (default: 25, max: 100)',
            },
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
          },
          required: ['organization_slug', 'project_slug'],
        },
      },
      {
        name: 'get_issue',
        description: 'Get full details for a specific Sentry issue including tags, activity, and first/last seen timestamps',
        inputSchema: {
          type: 'object',
          properties: {
            organization_slug: {
              type: 'string',
              description: 'The organization slug (required by the Sentry API)',
            },
            issue_id: {
              type: 'string',
              description: 'The Sentry issue ID (numeric) or short ID (e.g., PROJECT-123)',
            },
          },
          required: ['organization_slug', 'issue_id'],
        },
      },
      {
        name: 'update_issue',
        description: 'Update an issue status or attributes: resolve, unresolve, ignore, assign, or set priority',
        inputSchema: {
          type: 'object',
          properties: {
            organization_slug: {
              type: 'string',
              description: 'The organization slug (required by the Sentry API)',
            },
            issue_id: {
              type: 'string',
              description: 'The Sentry issue ID to update',
            },
            status: {
              type: 'string',
              description: 'New status: resolved, resolvedInNextRelease, unresolved, ignored',
            },
            assigned_to: {
              type: 'string',
              description: 'Assign to a username, user ID, or team slug prefixed with "team:" (e.g., "team:backend")',
            },
            ignore_duration: {
              type: 'number',
              description: 'Ignore for this many minutes (used when status is ignored)',
            },
          },
          required: ['organization_slug', 'issue_id'],
        },
      },
      {
        name: 'list_events',
        description: 'List individual error events (occurrences) for a specific Sentry issue with pagination',
        inputSchema: {
          type: 'object',
          properties: {
            organization_slug: {
              type: 'string',
              description: 'The organization slug (required by the Sentry API)',
            },
            issue_id: {
              type: 'string',
              description: 'The Sentry issue ID',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of events to return (default: 25, max: 100)',
            },
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
          },
          required: ['organization_slug', 'issue_id'],
        },
      },
      {
        name: 'get_event',
        description: 'Get a single Sentry event by event ID including full stacktrace, breadcrumbs, and request context',
        inputSchema: {
          type: 'object',
          properties: {
            organization_slug: {
              type: 'string',
              description: 'The organization slug',
            },
            project_slug: {
              type: 'string',
              description: 'The project slug',
            },
            event_id: {
              type: 'string',
              description: 'The event ID (UUID format)',
            },
          },
          required: ['organization_slug', 'project_slug', 'event_id'],
        },
      },
      {
        name: 'list_releases',
        description: 'List releases for a Sentry organization with optional project filter, query, and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            organization_slug: {
              type: 'string',
              description: 'The organization slug',
            },
            project_slug: {
              type: 'string',
              description: 'Filter releases by project slug',
            },
            query: {
              type: 'string',
              description: 'Filter releases by version string (partial match)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of releases to return (default: 25)',
            },
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
          },
          required: ['organization_slug'],
        },
      },
      {
        name: 'get_release',
        description: 'Get detailed information about a specific release version including commit count and adoption stats',
        inputSchema: {
          type: 'object',
          properties: {
            organization_slug: {
              type: 'string',
              description: 'The organization slug',
            },
            version: {
              type: 'string',
              description: 'The release version string',
            },
          },
          required: ['organization_slug', 'version'],
        },
      },
      {
        name: 'list_release_deploys',
        description: 'List all deploys for a specific release version across environments',
        inputSchema: {
          type: 'object',
          properties: {
            organization_slug: {
              type: 'string',
              description: 'The organization slug',
            },
            version: {
              type: 'string',
              description: 'The release version string',
            },
          },
          required: ['organization_slug', 'version'],
        },
      },
      {
        name: 'search_issues',
        description: 'Search for issues across an entire organization using Sentry query syntax with date range and environment filters',
        inputSchema: {
          type: 'object',
          properties: {
            organization_slug: {
              type: 'string',
              description: 'The organization slug',
            },
            query: {
              type: 'string',
              description: 'Sentry search query (e.g., "TypeError is:unresolved", "level:fatal")',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of issues to return (default: 25, max: 100)',
            },
            environment: {
              type: 'string',
              description: 'Filter by environment name (e.g., production, staging)',
            },
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
          },
          required: ['organization_slug'],
        },
      },
      {
        name: 'list_project_alerts',
        description: 'List alert rules configured for a Sentry project including thresholds and notification channels',
        inputSchema: {
          type: 'object',
          properties: {
            organization_slug: {
              type: 'string',
              description: 'The organization slug',
            },
            project_slug: {
              type: 'string',
              description: 'The project slug',
            },
          },
          required: ['organization_slug', 'project_slug'],
        },
      },
      {
        name: 'list_team_members',
        description: 'List all members of a Sentry team with their roles and last-seen information',
        inputSchema: {
          type: 'object',
          properties: {
            organization_slug: {
              type: 'string',
              description: 'The organization slug',
            },
            team_slug: {
              type: 'string',
              description: 'The team slug',
            },
          },
          required: ['organization_slug', 'team_slug'],
        },
      },
      {
        name: 'create_project_note',
        description: 'Add a note (comment) to a Sentry issue for team communication and investigation tracking',
        inputSchema: {
          type: 'object',
          properties: {
            issue_id: {
              type: 'string',
              description: 'The Sentry issue ID to add a note to',
            },
            text: {
              type: 'string',
              description: 'The note text to add (supports Markdown)',
            },
          },
          required: ['issue_id', 'text'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_organizations':
          return await this.listOrganizations(args);
        case 'list_projects':
          return await this.listProjects(args);
        case 'list_teams':
          return await this.listTeams(args);
        case 'list_issues':
          return await this.listIssues(args);
        case 'get_issue':
          return await this.getIssue(args);
        case 'update_issue':
          return await this.updateIssue(args);
        case 'list_events':
          return await this.listEvents(args);
        case 'get_event':
          return await this.getEvent(args);
        case 'list_releases':
          return await this.listReleases(args);
        case 'get_release':
          return await this.getRelease(args);
        case 'list_release_deploys':
          return await this.listReleaseDeploys(args);
        case 'search_issues':
          return await this.searchIssues(args);
        case 'list_project_alerts':
          return await this.listProjectAlerts(args);
        case 'list_team_members':
          return await this.listTeamMembers(args);
        case 'create_project_note':
          return await this.createProjectNote(args);
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

  private authHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.authToken}`,
      'Content-Type': 'application/json',
    };
  }

  private async fetchJson(url: string, options: RequestInit = {}): Promise<unknown> {
    const response = await this.fetchWithRetry(url, { ...options, headers: this.authHeaders() });
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`Sentry API error: ${response.status} ${response.statusText}${body ? ` — ${body.slice(0, 200)}` : ''}`);
    }
    return response.json();
  }

  private async listOrganizations(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.cursor) params.set('cursor', args.cursor as string);
    const data = await this.fetchJson(`${this.baseUrl}/organizations/?${params}`);
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listProjects(args: Record<string, unknown>): Promise<ToolResult> {
    const orgSlug = args.organization_slug as string;
    if (!orgSlug) {
      return { content: [{ type: 'text', text: 'organization_slug is required' }], isError: true };
    }
    const params = new URLSearchParams();
    if (args.cursor) params.set('cursor', args.cursor as string);
    const data = await this.fetchJson(`${this.baseUrl}/organizations/${encodeURIComponent(orgSlug)}/projects/?${params}`);
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listTeams(args: Record<string, unknown>): Promise<ToolResult> {
    const orgSlug = args.organization_slug as string;
    if (!orgSlug) {
      return { content: [{ type: 'text', text: 'organization_slug is required' }], isError: true };
    }
    const params = new URLSearchParams();
    if (args.cursor) params.set('cursor', args.cursor as string);
    const data = await this.fetchJson(`${this.baseUrl}/organizations/${encodeURIComponent(orgSlug)}/teams/?${params}`);
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listIssues(args: Record<string, unknown>): Promise<ToolResult> {
    const orgSlug = args.organization_slug as string;
    const projectSlug = args.project_slug as string;
    if (!orgSlug || !projectSlug) {
      return { content: [{ type: 'text', text: 'organization_slug and project_slug are required' }], isError: true };
    }
    const params = new URLSearchParams();
    if (args.query) params.set('query', args.query as string);
    params.set('limit', String((args.limit as number) ?? 25));
    if (args.cursor) params.set('cursor', args.cursor as string);
    const data = await this.fetchJson(
      `${this.baseUrl}/projects/${encodeURIComponent(orgSlug)}/${encodeURIComponent(projectSlug)}/issues/?${params}`,
    );
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getIssue(args: Record<string, unknown>): Promise<ToolResult> {
    const orgSlug = args.organization_slug as string;
    const issueId = args.issue_id as string;
    if (!orgSlug || !issueId) {
      return { content: [{ type: 'text', text: 'organization_slug and issue_id are required' }], isError: true };
    }
    const data = await this.fetchJson(
      `${this.baseUrl}/organizations/${encodeURIComponent(orgSlug)}/issues/${encodeURIComponent(issueId)}/`,
    );
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async updateIssue(args: Record<string, unknown>): Promise<ToolResult> {
    const orgSlug = args.organization_slug as string;
    const issueId = args.issue_id as string;
    if (!orgSlug || !issueId) {
      return { content: [{ type: 'text', text: 'organization_slug and issue_id are required' }], isError: true };
    }
    const body: Record<string, unknown> = {};
    if (args.status) body['status'] = args.status;
    if (args.assigned_to) body['assignedTo'] = args.assigned_to;
    if (args.ignore_duration !== undefined) {
      body['statusDetails'] = { ignoreDuration: args.ignore_duration };
    }
    const data = await this.fetchJson(
      `${this.baseUrl}/organizations/${encodeURIComponent(orgSlug)}/issues/${encodeURIComponent(issueId)}/`,
      { method: 'PUT', body: JSON.stringify(body) },
    );
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listEvents(args: Record<string, unknown>): Promise<ToolResult> {
    const orgSlug = args.organization_slug as string;
    const issueId = args.issue_id as string;
    if (!orgSlug || !issueId) {
      return { content: [{ type: 'text', text: 'organization_slug and issue_id are required' }], isError: true };
    }
    const params = new URLSearchParams();
    params.set('limit', String((args.limit as number) ?? 25));
    if (args.cursor) params.set('cursor', args.cursor as string);
    const data = await this.fetchJson(
      `${this.baseUrl}/organizations/${encodeURIComponent(orgSlug)}/issues/${encodeURIComponent(issueId)}/events/?${params}`,
    );
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getEvent(args: Record<string, unknown>): Promise<ToolResult> {
    const orgSlug = args.organization_slug as string;
    const projectSlug = args.project_slug as string;
    const eventId = args.event_id as string;
    if (!orgSlug || !projectSlug || !eventId) {
      return { content: [{ type: 'text', text: 'organization_slug, project_slug, and event_id are required' }], isError: true };
    }
    const data = await this.fetchJson(
      `${this.baseUrl}/projects/${encodeURIComponent(orgSlug)}/${encodeURIComponent(projectSlug)}/events/${encodeURIComponent(eventId)}/`,
    );
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listReleases(args: Record<string, unknown>): Promise<ToolResult> {
    const orgSlug = args.organization_slug as string;
    if (!orgSlug) {
      return { content: [{ type: 'text', text: 'organization_slug is required' }], isError: true };
    }
    const params = new URLSearchParams();
    if (args.project_slug) params.set('project', args.project_slug as string);
    if (args.query) params.set('query', args.query as string);
    params.set('limit', String((args.limit as number) ?? 25));
    if (args.cursor) params.set('cursor', args.cursor as string);
    const data = await this.fetchJson(`${this.baseUrl}/organizations/${encodeURIComponent(orgSlug)}/releases/?${params}`);
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getRelease(args: Record<string, unknown>): Promise<ToolResult> {
    const orgSlug = args.organization_slug as string;
    const version = args.version as string;
    if (!orgSlug || !version) {
      return { content: [{ type: 'text', text: 'organization_slug and version are required' }], isError: true };
    }
    const data = await this.fetchJson(
      `${this.baseUrl}/organizations/${encodeURIComponent(orgSlug)}/releases/${encodeURIComponent(version)}/`,
    );
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listReleaseDeploys(args: Record<string, unknown>): Promise<ToolResult> {
    const orgSlug = args.organization_slug as string;
    const version = args.version as string;
    if (!orgSlug || !version) {
      return { content: [{ type: 'text', text: 'organization_slug and version are required' }], isError: true };
    }
    const data = await this.fetchJson(
      `${this.baseUrl}/organizations/${encodeURIComponent(orgSlug)}/releases/${encodeURIComponent(version)}/deploys/`,
    );
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async searchIssues(args: Record<string, unknown>): Promise<ToolResult> {
    const orgSlug = args.organization_slug as string;
    if (!orgSlug) {
      return { content: [{ type: 'text', text: 'organization_slug is required' }], isError: true };
    }
    const params = new URLSearchParams();
    if (args.query) params.set('query', args.query as string);
    params.set('limit', String((args.limit as number) ?? 25));
    if (args.environment) params.set('environment', args.environment as string);
    if (args.cursor) params.set('cursor', args.cursor as string);
    const data = await this.fetchJson(`${this.baseUrl}/organizations/${encodeURIComponent(orgSlug)}/issues/?${params}`);
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listProjectAlerts(args: Record<string, unknown>): Promise<ToolResult> {
    const orgSlug = args.organization_slug as string;
    const projectSlug = args.project_slug as string;
    if (!orgSlug || !projectSlug) {
      return { content: [{ type: 'text', text: 'organization_slug and project_slug are required' }], isError: true };
    }
    const data = await this.fetchJson(
      `${this.baseUrl}/projects/${encodeURIComponent(orgSlug)}/${encodeURIComponent(projectSlug)}/rules/`,
    );
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listTeamMembers(args: Record<string, unknown>): Promise<ToolResult> {
    const orgSlug = args.organization_slug as string;
    const teamSlug = args.team_slug as string;
    if (!orgSlug || !teamSlug) {
      return { content: [{ type: 'text', text: 'organization_slug and team_slug are required' }], isError: true };
    }
    const data = await this.fetchJson(
      `${this.baseUrl}/teams/${encodeURIComponent(orgSlug)}/${encodeURIComponent(teamSlug)}/members/`,
    );
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async createProjectNote(args: Record<string, unknown>): Promise<ToolResult> {
    const issueId = args.issue_id as string;
    const text = args.text as string;
    if (!issueId || !text) {
      return { content: [{ type: 'text', text: 'issue_id and text are required' }], isError: true };
    }
    const data = await this.fetchJson(
      `${this.baseUrl}/issues/${encodeURIComponent(issueId)}/comments/`,
      { method: 'POST', body: JSON.stringify({ text }) },
    );
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }
}

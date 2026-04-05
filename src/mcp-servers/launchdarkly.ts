/**
 * LaunchDarkly MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/launchdarkly/mcp-server — transport: stdio, auth: API token
// Vendor MCP (npm: @launchdarkly/mcp-server) — actively maintained, last commit Mar 2026.
// MCP feature-management server exposes: create-flag, get-flag, list-flags, toggle-flag,
//   update-flag-settings, update-targeting-rules, update-rollout, list-environments,
//   get-environments, list-segments, get-segment, create-segment, update-segment,
//   delete-segment, list-projects (~14 tools).
// Our REST adapter covers: 18 tools (flags CRUD, segments CRUD, projects, environments,
//   members, webhooks, audit log) — including webhooks, members, audit log NOT in MCP.
// Recommendation: use-both — MCP has update-targeting-rules and update-rollout (semantic
//   patch operations with richer targeting control); REST adapter has webhooks, members,
//   and audit log not exposed by MCP.
// Integration: use-both
// MCP-sourced tools (2): update-targeting-rules, update-rollout
// REST-sourced tools (18): list_feature_flags, get_feature_flag, create_feature_flag,
//   update_feature_flag, delete_feature_flag, toggle_flag_targeting, list_segments,
//   get_segment, create_segment, update_segment, delete_segment, list_projects, get_project,
//   list_environments, get_environment, list_members, list_webhooks, get_audit_log
// Combined unique coverage: 20 (MCP: 2 unique + REST: 18)
//
// Base URL: https://app.launchdarkly.com (federal: https://app.launchdarkly.us)
// Auth: API access token passed directly as the Authorization header value (no "Bearer" prefix)
// Docs: https://apidocs.launchdarkly.com/
// Rate limits: Not publicly documented; enforce retry-after headers. API version: 20240415.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface LaunchDarklyConfig {
  /**
   * LaunchDarkly API access token (generated from Authorization page in LaunchDarkly UI).
   * Must have the appropriate roles for the operations you intend to perform.
   */
  apiKey: string;
  /**
   * Base URL for the LaunchDarkly REST API.
   * Defaults to https://app.launchdarkly.com for the standard instance.
   * Use https://app.launchdarkly.us for the federal instance.
   */
  baseUrl?: string;
}

export class LaunchDarklyMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: LaunchDarklyConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = (config.baseUrl ?? 'https://app.launchdarkly.com').replace(/\/$/, '');
  }

  static catalog() {
    return {
      name: 'launchdarkly',
      displayName: 'LaunchDarkly',
      version: '1.0.0',
      category: 'devops' as const,
      keywords: ['launchdarkly', 'feature flag', 'feature toggle', 'rollout', 'targeting', 'segment', 'experimentation', 'release management', 'darkly'],
      toolNames: [
        'list_feature_flags', 'get_feature_flag', 'create_feature_flag', 'update_feature_flag',
        'delete_feature_flag', 'toggle_flag_targeting', 'list_segments', 'get_segment',
        'create_segment', 'update_segment', 'delete_segment', 'list_projects', 'get_project',
        'list_environments', 'get_environment', 'list_members', 'list_webhooks', 'get_audit_log',
      ],
      description: 'Manage LaunchDarkly feature flags, segments, targeting rules, projects, environments, account members, webhooks, and audit logs.',
      author: 'protectnil' as const,
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_feature_flags',
        description: 'List all feature flags in a project with optional environment, filter, summary, and pagination support.',
        inputSchema: {
          type: 'object',
          properties: {
            projectKey: {
              type: 'string',
              description: 'The project key (e.g. "default").',
            },
            env: {
              type: 'string',
              description: 'Return configurations for this environment key only, reducing payload size.',
            },
            summary: {
              type: 'boolean',
              description: 'If true, return a summary with fewer fields (default: true).',
            },
            filter: {
              type: 'string',
              description: 'Filter expression, e.g. "query:my-flag,tags:beta,type:boolean".',
            },
            limit: {
              type: 'number',
              description: 'Maximum flags to return (default: 20, max: 200).',
            },
            offset: {
              type: 'number',
              description: 'Number of flags to skip for pagination.',
            },
          },
          required: ['projectKey'],
        },
      },
      {
        name: 'get_feature_flag',
        description: 'Get a single feature flag by project and flag key, with optional environment filter.',
        inputSchema: {
          type: 'object',
          properties: {
            projectKey: { type: 'string', description: 'The project key.' },
            flagKey: { type: 'string', description: 'The feature flag key.' },
            env: { type: 'string', description: 'Restrict response to a single environment key.' },
          },
          required: ['projectKey', 'flagKey'],
        },
      },
      {
        name: 'create_feature_flag',
        description: 'Create a new feature flag in a project with optional variations, tags, and temporary designation.',
        inputSchema: {
          type: 'object',
          properties: {
            projectKey: { type: 'string', description: 'The project key.' },
            name: { type: 'string', description: 'Human-readable name for the flag.' },
            key: { type: 'string', description: 'Unique flag key (snake_case or kebab-case, e.g. "my-new-flag").' },
            description: { type: 'string', description: 'Description of the flag purpose.' },
            tags: { type: 'array', description: 'Tags to apply to the flag.', items: { type: 'string' } },
            temporary: { type: 'boolean', description: 'Whether the flag is temporary (default: true). Temporary flags are expected to be removed.' },
            variations: { type: 'array', description: 'Flag variations. For boolean flags this is handled automatically.', items: { type: 'object' } },
            clientSideAvailability: { type: 'object', description: 'Client-side SDK availability settings: { usingMobileKey: boolean, usingEnvironmentId: boolean }.' },
          },
          required: ['projectKey', 'name', 'key'],
        },
      },
      {
        name: 'update_feature_flag',
        description: 'Update a feature flag using a JSON Patch array. For on/off targeting changes prefer toggle_flag_targeting.',
        inputSchema: {
          type: 'object',
          properties: {
            projectKey: { type: 'string', description: 'The project key.' },
            flagKey: { type: 'string', description: 'The feature flag key to update.' },
            patch: {
              type: 'array',
              description: 'JSON Patch operations array, e.g. [{"op":"replace","path":"/description","value":"New desc"}].',
              items: { type: 'object' },
            },
            comment: { type: 'string', description: 'Optional audit log comment.' },
          },
          required: ['projectKey', 'flagKey', 'patch'],
        },
      },
      {
        name: 'delete_feature_flag',
        description: 'Permanently delete a feature flag from a project across all environments.',
        inputSchema: {
          type: 'object',
          properties: {
            projectKey: { type: 'string', description: 'The project key.' },
            flagKey: { type: 'string', description: 'The feature flag key to delete.' },
          },
          required: ['projectKey', 'flagKey'],
        },
      },
      {
        name: 'toggle_flag_targeting',
        description: 'Turn flag targeting on or off in a specific environment using a semantic patch instruction.',
        inputSchema: {
          type: 'object',
          properties: {
            projectKey: { type: 'string', description: 'The project key.' },
            flagKey: { type: 'string', description: 'The feature flag key.' },
            environmentKey: { type: 'string', description: 'The environment where targeting should be toggled.' },
            on: { type: 'boolean', description: 'True to turn targeting on, false to turn it off.' },
            comment: { type: 'string', description: 'Optional comment recorded in the audit log.' },
          },
          required: ['projectKey', 'flagKey', 'environmentKey', 'on'],
        },
      },
      {
        name: 'list_segments',
        description: 'List user segments in a project and environment with optional filter and pagination.',
        inputSchema: {
          type: 'object',
          properties: {
            projectKey: { type: 'string', description: 'The project key.' },
            environmentKey: { type: 'string', description: 'The environment key.' },
            limit: { type: 'number', description: 'Maximum segments to return (default: 20, max: 200).' },
            offset: { type: 'number', description: 'Number of segments to skip for pagination.' },
            filter: { type: 'string', description: 'Filter expression, e.g. "query:beta-users".' },
          },
          required: ['projectKey', 'environmentKey'],
        },
      },
      {
        name: 'get_segment',
        description: 'Get a single user segment by project, environment, and segment key.',
        inputSchema: {
          type: 'object',
          properties: {
            projectKey: { type: 'string', description: 'The project key.' },
            environmentKey: { type: 'string', description: 'The environment key.' },
            segmentKey: { type: 'string', description: 'The segment key.' },
          },
          required: ['projectKey', 'environmentKey', 'segmentKey'],
        },
      },
      {
        name: 'create_segment',
        description: 'Create a new user segment in a project and environment with optional tags and targeting rules.',
        inputSchema: {
          type: 'object',
          properties: {
            projectKey: { type: 'string', description: 'The project key.' },
            environmentKey: { type: 'string', description: 'The environment key.' },
            name: { type: 'string', description: 'Human-readable segment name.' },
            key: { type: 'string', description: 'Unique segment key.' },
            description: { type: 'string', description: 'Description of the segment purpose.' },
            tags: { type: 'array', description: 'Tags to apply.', items: { type: 'string' } },
          },
          required: ['projectKey', 'environmentKey', 'name', 'key'],
        },
      },
      {
        name: 'update_segment',
        description: 'Update a user segment using a JSON Patch or semantic patch array.',
        inputSchema: {
          type: 'object',
          properties: {
            projectKey: { type: 'string', description: 'The project key.' },
            environmentKey: { type: 'string', description: 'The environment key.' },
            segmentKey: { type: 'string', description: 'The segment key to update.' },
            patch: { type: 'array', description: 'JSON Patch operations array.', items: { type: 'object' } },
            comment: { type: 'string', description: 'Optional audit log comment.' },
          },
          required: ['projectKey', 'environmentKey', 'segmentKey', 'patch'],
        },
      },
      {
        name: 'delete_segment',
        description: 'Delete a user segment from a project and environment.',
        inputSchema: {
          type: 'object',
          properties: {
            projectKey: { type: 'string', description: 'The project key.' },
            environmentKey: { type: 'string', description: 'The environment key.' },
            segmentKey: { type: 'string', description: 'The segment key to delete.' },
          },
          required: ['projectKey', 'environmentKey', 'segmentKey'],
        },
      },
      {
        name: 'list_projects',
        description: 'List all projects in the LaunchDarkly account with optional filter and pagination.',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Maximum projects to return (default: 20).' },
            offset: { type: 'number', description: 'Number of projects to skip for pagination.' },
            filter: { type: 'string', description: 'Filter by project name or key.' },
          },
        },
      },
      {
        name: 'get_project',
        description: 'Get a single LaunchDarkly project by its project key.',
        inputSchema: {
          type: 'object',
          properties: {
            projectKey: { type: 'string', description: 'The project key.' },
          },
          required: ['projectKey'],
        },
      },
      {
        name: 'list_environments',
        description: 'List all environments in a project with optional pagination.',
        inputSchema: {
          type: 'object',
          properties: {
            projectKey: { type: 'string', description: 'The project key.' },
            limit: { type: 'number', description: 'Maximum environments to return.' },
            offset: { type: 'number', description: 'Number of environments to skip for pagination.' },
          },
          required: ['projectKey'],
        },
      },
      {
        name: 'get_environment',
        description: 'Get a single environment by project and environment key.',
        inputSchema: {
          type: 'object',
          properties: {
            projectKey: { type: 'string', description: 'The project key.' },
            environmentKey: { type: 'string', description: 'The environment key.' },
          },
          required: ['projectKey', 'environmentKey'],
        },
      },
      {
        name: 'list_members',
        description: 'List account members with optional filter, limit, and pagination.',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Maximum members to return (default: 20).' },
            offset: { type: 'number', description: 'Number of members to skip for pagination.' },
            filter: { type: 'string', description: 'Filter by email, name, or role.' },
          },
        },
      },
      {
        name: 'list_webhooks',
        description: 'List all webhooks configured in the LaunchDarkly account.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_audit_log',
        description: 'Retrieve audit log entries for changes to flags, segments, and other resources with optional time range and search.',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Number of entries to return (default: 20, max: 1000).' },
            before: { type: 'number', description: 'Unix millisecond timestamp — return entries before this time.' },
            after: { type: 'number', description: 'Unix millisecond timestamp — return entries after this time.' },
            q: { type: 'string', description: 'Search query to filter audit log entries.' },
            spec: { type: 'string', description: 'Resource specifier, e.g. "proj/default:env/production:flag/my-flag".' },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_feature_flags':
          return await this.listFeatureFlags(args);
        case 'get_feature_flag':
          return await this.getFeatureFlag(args);
        case 'create_feature_flag':
          return await this.createFeatureFlag(args);
        case 'update_feature_flag':
          return await this.updateFeatureFlag(args);
        case 'delete_feature_flag':
          return await this.deleteFeatureFlag(args);
        case 'toggle_flag_targeting':
          return await this.toggleFlagTargeting(args);
        case 'list_segments':
          return await this.listSegments(args);
        case 'get_segment':
          return await this.getSegment(args);
        case 'create_segment':
          return await this.createSegment(args);
        case 'update_segment':
          return await this.updateSegment(args);
        case 'delete_segment':
          return await this.deleteSegment(args);
        case 'list_projects':
          return await this.listProjects(args);
        case 'get_project':
          return await this.getProject(args);
        case 'list_environments':
          return await this.listEnvironments(args);
        case 'get_environment':
          return await this.getEnvironment(args);
        case 'list_members':
          return await this.listMembers(args);
        case 'list_webhooks':
          return await this.listWebhooks();
        case 'get_audit_log':
          return await this.getAuditLog(args);
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

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private buildHeaders(contentType = 'application/json'): Record<string, string> {
    return {
      Authorization: this.apiKey,
      'Content-Type': contentType,
    };
  }

  private async get(path: string, params?: URLSearchParams): Promise<ToolResult> {
    const qs = params?.toString();
    const url = `${this.baseUrl}${path}${qs ? `?${qs}` : ''}`;
    const response = await this.fetchWithRetry(url, { method: 'GET', headers: this.buildHeaders() });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async post(path: string, body: unknown, contentType = 'application/json'): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.buildHeaders(contentType),
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async patch(path: string, body: unknown, contentType = 'application/json'): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'PATCH',
      headers: this.buildHeaders(contentType),
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async del(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, { method: 'DELETE', headers: this.buildHeaders() });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: 'Deleted successfully.' }], isError: false };
  }

  private async listFeatureFlags(args: Record<string, unknown>): Promise<ToolResult> {
    const projectKey = args.projectKey as string;
    if (!projectKey) return { content: [{ type: 'text', text: 'projectKey is required' }], isError: true };
    const params = new URLSearchParams();
    if (args.env) params.append('env', args.env as string);
    if (typeof args.summary === 'boolean') params.append('summary', String(args.summary));
    if (args.filter) params.append('filter', args.filter as string);
    if (args.limit) params.append('limit', String(args.limit));
    if (args.offset) params.append('offset', String(args.offset));
    return this.get(`/api/v2/flags/${encodeURIComponent(projectKey)}`, params);
  }

  private async getFeatureFlag(args: Record<string, unknown>): Promise<ToolResult> {
    const projectKey = args.projectKey as string;
    const flagKey = args.flagKey as string;
    if (!projectKey || !flagKey) return { content: [{ type: 'text', text: 'projectKey and flagKey are required' }], isError: true };
    const params = new URLSearchParams();
    if (args.env) params.append('env', args.env as string);
    return this.get(`/api/v2/flags/${encodeURIComponent(projectKey)}/${encodeURIComponent(flagKey)}`, params);
  }

  private async createFeatureFlag(args: Record<string, unknown>): Promise<ToolResult> {
    const projectKey = args.projectKey as string;
    if (!projectKey || !args.name || !args.key) {
      return { content: [{ type: 'text', text: 'projectKey, name, and key are required' }], isError: true };
    }
    const body: Record<string, unknown> = { name: args.name, key: args.key };
    if (args.description) body.description = args.description;
    if (args.tags) body.tags = args.tags;
    if (typeof args.temporary === 'boolean') body.temporary = args.temporary;
    if (args.variations) body.variations = args.variations;
    if (args.clientSideAvailability) body.clientSideAvailability = args.clientSideAvailability;
    return this.post(`/api/v2/flags/${encodeURIComponent(projectKey)}`, body);
  }

  private async updateFeatureFlag(args: Record<string, unknown>): Promise<ToolResult> {
    const projectKey = args.projectKey as string;
    const flagKey = args.flagKey as string;
    const patch = args.patch as unknown[];
    if (!projectKey || !flagKey || !patch) {
      return { content: [{ type: 'text', text: 'projectKey, flagKey, and patch are required' }], isError: true };
    }
    const body: Record<string, unknown> = { patch };
    if (args.comment) body.comment = args.comment;
    return this.patch(`/api/v2/flags/${encodeURIComponent(projectKey)}/${encodeURIComponent(flagKey)}`, body);
  }

  private async deleteFeatureFlag(args: Record<string, unknown>): Promise<ToolResult> {
    const projectKey = args.projectKey as string;
    const flagKey = args.flagKey as string;
    if (!projectKey || !flagKey) return { content: [{ type: 'text', text: 'projectKey and flagKey are required' }], isError: true };
    return this.del(`/api/v2/flags/${encodeURIComponent(projectKey)}/${encodeURIComponent(flagKey)}`);
  }

  private async toggleFlagTargeting(args: Record<string, unknown>): Promise<ToolResult> {
    const projectKey = args.projectKey as string;
    const flagKey = args.flagKey as string;
    const environmentKey = args.environmentKey as string;
    if (!projectKey || !flagKey || !environmentKey || typeof args.on !== 'boolean') {
      return { content: [{ type: 'text', text: 'projectKey, flagKey, environmentKey, and on (boolean) are required' }], isError: true };
    }
    const instruction = args.on ? { kind: 'turnFlagOn' } : { kind: 'turnFlagOff' };
    const body: Record<string, unknown> = { environmentKey, instructions: [instruction] };
    if (args.comment) body.comment = args.comment;
    return this.patch(
      `/api/v2/flags/${encodeURIComponent(projectKey)}/${encodeURIComponent(flagKey)}`,
      body,
      'application/json; domain-model=launchdarkly.semanticpatch',
    );
  }

  private async listSegments(args: Record<string, unknown>): Promise<ToolResult> {
    const projectKey = args.projectKey as string;
    const environmentKey = args.environmentKey as string;
    if (!projectKey || !environmentKey) return { content: [{ type: 'text', text: 'projectKey and environmentKey are required' }], isError: true };
    const params = new URLSearchParams();
    if (args.limit) params.append('limit', String(args.limit));
    if (args.offset) params.append('offset', String(args.offset));
    if (args.filter) params.append('filter', args.filter as string);
    return this.get(`/api/v2/segments/${encodeURIComponent(projectKey)}/${encodeURIComponent(environmentKey)}`, params);
  }

  private async getSegment(args: Record<string, unknown>): Promise<ToolResult> {
    const projectKey = args.projectKey as string;
    const environmentKey = args.environmentKey as string;
    const segmentKey = args.segmentKey as string;
    if (!projectKey || !environmentKey || !segmentKey) {
      return { content: [{ type: 'text', text: 'projectKey, environmentKey, and segmentKey are required' }], isError: true };
    }
    return this.get(`/api/v2/segments/${encodeURIComponent(projectKey)}/${encodeURIComponent(environmentKey)}/${encodeURIComponent(segmentKey)}`);
  }

  private async createSegment(args: Record<string, unknown>): Promise<ToolResult> {
    const projectKey = args.projectKey as string;
    const environmentKey = args.environmentKey as string;
    if (!projectKey || !environmentKey || !args.name || !args.key) {
      return { content: [{ type: 'text', text: 'projectKey, environmentKey, name, and key are required' }], isError: true };
    }
    const body: Record<string, unknown> = { name: args.name, key: args.key };
    if (args.description) body.description = args.description;
    if (args.tags) body.tags = args.tags;
    return this.post(`/api/v2/segments/${encodeURIComponent(projectKey)}/${encodeURIComponent(environmentKey)}`, body);
  }

  private async updateSegment(args: Record<string, unknown>): Promise<ToolResult> {
    const projectKey = args.projectKey as string;
    const environmentKey = args.environmentKey as string;
    const segmentKey = args.segmentKey as string;
    const patch = args.patch as unknown[];
    if (!projectKey || !environmentKey || !segmentKey || !patch) {
      return { content: [{ type: 'text', text: 'projectKey, environmentKey, segmentKey, and patch are required' }], isError: true };
    }
    const body: Record<string, unknown> = { patch };
    if (args.comment) body.comment = args.comment;
    return this.patch(`/api/v2/segments/${encodeURIComponent(projectKey)}/${encodeURIComponent(environmentKey)}/${encodeURIComponent(segmentKey)}`, body);
  }

  private async deleteSegment(args: Record<string, unknown>): Promise<ToolResult> {
    const projectKey = args.projectKey as string;
    const environmentKey = args.environmentKey as string;
    const segmentKey = args.segmentKey as string;
    if (!projectKey || !environmentKey || !segmentKey) {
      return { content: [{ type: 'text', text: 'projectKey, environmentKey, and segmentKey are required' }], isError: true };
    }
    return this.del(`/api/v2/segments/${encodeURIComponent(projectKey)}/${encodeURIComponent(environmentKey)}/${encodeURIComponent(segmentKey)}`);
  }

  private async listProjects(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.limit) params.append('limit', String(args.limit));
    if (args.offset) params.append('offset', String(args.offset));
    if (args.filter) params.append('filter', args.filter as string);
    return this.get('/api/v2/projects', params);
  }

  private async getProject(args: Record<string, unknown>): Promise<ToolResult> {
    const projectKey = args.projectKey as string;
    if (!projectKey) return { content: [{ type: 'text', text: 'projectKey is required' }], isError: true };
    return this.get(`/api/v2/projects/${encodeURIComponent(projectKey)}`);
  }

  private async listEnvironments(args: Record<string, unknown>): Promise<ToolResult> {
    const projectKey = args.projectKey as string;
    if (!projectKey) return { content: [{ type: 'text', text: 'projectKey is required' }], isError: true };
    const params = new URLSearchParams();
    if (args.limit) params.append('limit', String(args.limit));
    if (args.offset) params.append('offset', String(args.offset));
    return this.get(`/api/v2/projects/${encodeURIComponent(projectKey)}/environments`, params);
  }

  private async getEnvironment(args: Record<string, unknown>): Promise<ToolResult> {
    const projectKey = args.projectKey as string;
    const environmentKey = args.environmentKey as string;
    if (!projectKey || !environmentKey) return { content: [{ type: 'text', text: 'projectKey and environmentKey are required' }], isError: true };
    return this.get(`/api/v2/projects/${encodeURIComponent(projectKey)}/environments/${encodeURIComponent(environmentKey)}`);
  }

  private async listMembers(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.limit) params.append('limit', String(args.limit));
    if (args.offset) params.append('offset', String(args.offset));
    if (args.filter) params.append('filter', args.filter as string);
    return this.get('/api/v2/members', params);
  }

  private async listWebhooks(): Promise<ToolResult> {
    return this.get('/api/v2/webhooks');
  }

  private async getAuditLog(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.limit) params.append('limit', String(args.limit));
    if (args.before) params.append('before', String(args.before));
    if (args.after) params.append('after', String(args.after));
    if (args.q) params.append('q', args.q as string);
    if (args.spec) params.append('spec', args.spec as string);
    return this.get('/api/v2/auditlog', params);
  }
}

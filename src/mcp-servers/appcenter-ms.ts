/**
 * App Center (Microsoft) MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// Base URL: https://api.appcenter.ms/v0.1
// Auth: X-API-Token header (user or app-scoped API token from App Center account settings)
// Docs: https://openapi.appcenter.ms/

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface AppCenterConfig {
  /**
   * App Center API token.
   * Obtain from https://appcenter.ms/settings/apitokens
   */
  apiToken: string;
  /**
   * Override base URL.
   * Defaults to https://api.appcenter.ms/v0.1
   */
  baseUrl?: string;
}

export class AppCenterMSMCPServer extends MCPAdapterBase {
  private readonly apiToken: string;
  private readonly baseUrl: string;

  constructor(config: AppCenterConfig) {
    super();
    this.apiToken = config.apiToken;
    this.baseUrl = config.baseUrl || 'https://api.appcenter.ms/v0.1';
  }

  private get headers(): Record<string, string> {
    return {
      'X-API-Token': this.apiToken,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      // --- Apps ---
      {
        name: 'list_apps',
        description: 'List all apps accessible to the authenticated user or organization.',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'create_app',
        description: 'Create a new app in App Center.',
        inputSchema: {
          type: 'object',
          properties: {
            display_name: { type: 'string', description: 'Display name for the app' },
            name: { type: 'string', description: 'App name (URL-friendly, no spaces)' },
            os: { type: 'string', description: 'Operating system: Android, iOS, macOS, Tizen, tvOS, Windows, Linux, Custom' },
            platform: { type: 'string', description: 'Development platform: Java, Objective-C-Swift, UWP, Cordova, React-Native, Flutter, Unity, Xamarin, Unknown' },
            description: { type: 'string', description: 'Optional description' },
          },
          required: ['display_name', 'os', 'platform'],
        },
      },
      {
        name: 'get_app',
        description: 'Get details of a specific app by owner and app name.',
        inputSchema: {
          type: 'object',
          properties: {
            owner_name: { type: 'string', description: 'Owner username or org name' },
            app_name: { type: 'string', description: 'App name (URL slug)' },
          },
          required: ['owner_name', 'app_name'],
        },
      },
      {
        name: 'delete_app',
        description: 'Delete an app from App Center. Irreversible.',
        inputSchema: {
          type: 'object',
          properties: {
            owner_name: { type: 'string', description: 'Owner username or org name' },
            app_name: { type: 'string', description: 'App name (URL slug)' },
          },
          required: ['owner_name', 'app_name'],
        },
      },
      {
        name: 'list_apps_for_org',
        description: 'List all apps belonging to an organization.',
        inputSchema: {
          type: 'object',
          properties: {
            org_name: { type: 'string', description: 'Organization name' },
          },
          required: ['org_name'],
        },
      },
      // --- Builds ---
      {
        name: 'list_branches',
        description: 'List branches with their most recent build status for an app.',
        inputSchema: {
          type: 'object',
          properties: {
            owner_name: { type: 'string', description: 'Owner username or org name' },
            app_name: { type: 'string', description: 'App name' },
          },
          required: ['owner_name', 'app_name'],
        },
      },
      {
        name: 'list_builds_for_branch',
        description: 'List all builds for a specific branch.',
        inputSchema: {
          type: 'object',
          properties: {
            owner_name: { type: 'string', description: 'Owner username or org name' },
            app_name: { type: 'string', description: 'App name' },
            branch: { type: 'string', description: 'Branch name' },
          },
          required: ['owner_name', 'app_name', 'branch'],
        },
      },
      {
        name: 'trigger_build',
        description: 'Trigger a new build for a branch.',
        inputSchema: {
          type: 'object',
          properties: {
            owner_name: { type: 'string', description: 'Owner username or org name' },
            app_name: { type: 'string', description: 'App name' },
            branch: { type: 'string', description: 'Branch to build' },
            sourceVersion: { type: 'string', description: 'Specific commit hash or tag to build (optional)' },
            debug: { type: 'boolean', description: 'Enable debug build' },
          },
          required: ['owner_name', 'app_name', 'branch'],
        },
      },
      {
        name: 'get_build',
        description: 'Get details and current status of a specific build.',
        inputSchema: {
          type: 'object',
          properties: {
            owner_name: { type: 'string', description: 'Owner username or org name' },
            app_name: { type: 'string', description: 'App name' },
            build_id: { type: 'number', description: 'Build ID' },
          },
          required: ['owner_name', 'app_name', 'build_id'],
        },
      },
      {
        name: 'cancel_build',
        description: 'Cancel a running build.',
        inputSchema: {
          type: 'object',
          properties: {
            owner_name: { type: 'string', description: 'Owner username or org name' },
            app_name: { type: 'string', description: 'App name' },
            build_id: { type: 'number', description: 'Build ID to cancel' },
          },
          required: ['owner_name', 'app_name', 'build_id'],
        },
      },
      {
        name: 'get_build_logs',
        description: 'Download the build log for a specific build.',
        inputSchema: {
          type: 'object',
          properties: {
            owner_name: { type: 'string', description: 'Owner username or org name' },
            app_name: { type: 'string', description: 'App name' },
            build_id: { type: 'number', description: 'Build ID' },
          },
          required: ['owner_name', 'app_name', 'build_id'],
        },
      },
      {
        name: 'distribute_build',
        description: 'Distribute a completed build to distribution groups or testers.',
        inputSchema: {
          type: 'object',
          properties: {
            owner_name: { type: 'string', description: 'Owner username or org name' },
            app_name: { type: 'string', description: 'App name' },
            build_id: { type: 'number', description: 'Build ID to distribute' },
            destinations: { type: 'array', description: 'Distribution destinations: [{name, type}] where type is group, store, or tester', items: { type: 'object' } },
            release_notes: { type: 'string', description: 'Release notes for testers' },
            notify_testers: { type: 'boolean', description: 'Send email notifications to testers (default true)' },
          },
          required: ['owner_name', 'app_name', 'build_id', 'destinations'],
        },
      },
      // --- Releases ---
      {
        name: 'list_releases',
        description: 'List all releases for an app.',
        inputSchema: {
          type: 'object',
          properties: {
            owner_name: { type: 'string', description: 'Owner username or org name' },
            app_name: { type: 'string', description: 'App name' },
          },
          required: ['owner_name', 'app_name'],
        },
      },
      {
        name: 'get_release',
        description: 'Get details of a specific release by release ID.',
        inputSchema: {
          type: 'object',
          properties: {
            owner_name: { type: 'string', description: 'Owner username or org name' },
            app_name: { type: 'string', description: 'App name' },
            release_id: { type: 'string', description: 'Release ID (or "latest")' },
          },
          required: ['owner_name', 'app_name', 'release_id'],
        },
      },
      {
        name: 'delete_release',
        description: 'Delete a release from App Center.',
        inputSchema: {
          type: 'object',
          properties: {
            owner_name: { type: 'string', description: 'Owner username or org name' },
            app_name: { type: 'string', description: 'App name' },
            release_id: { type: 'number', description: 'Release ID to delete' },
          },
          required: ['owner_name', 'app_name', 'release_id'],
        },
      },
      {
        name: 'list_recent_releases',
        description: 'List the most recent releases per distribution group for an app.',
        inputSchema: {
          type: 'object',
          properties: {
            owner_name: { type: 'string', description: 'Owner username or org name' },
            app_name: { type: 'string', description: 'App name' },
          },
          required: ['owner_name', 'app_name'],
        },
      },
      // --- Distribution Groups ---
      {
        name: 'list_distribution_groups',
        description: 'List all distribution groups for an app.',
        inputSchema: {
          type: 'object',
          properties: {
            owner_name: { type: 'string', description: 'Owner username or org name' },
            app_name: { type: 'string', description: 'App name' },
          },
          required: ['owner_name', 'app_name'],
        },
      },
      {
        name: 'create_distribution_group',
        description: 'Create a new distribution group for an app.',
        inputSchema: {
          type: 'object',
          properties: {
            owner_name: { type: 'string', description: 'Owner username or org name' },
            app_name: { type: 'string', description: 'App name' },
            name: { type: 'string', description: 'Distribution group name' },
            is_public: { type: 'boolean', description: 'Make group publicly accessible (default false)' },
          },
          required: ['owner_name', 'app_name', 'name'],
        },
      },
      {
        name: 'get_distribution_group',
        description: 'Get details of a specific distribution group.',
        inputSchema: {
          type: 'object',
          properties: {
            owner_name: { type: 'string', description: 'Owner username or org name' },
            app_name: { type: 'string', description: 'App name' },
            distribution_group_name: { type: 'string', description: 'Distribution group name' },
          },
          required: ['owner_name', 'app_name', 'distribution_group_name'],
        },
      },
      {
        name: 'delete_distribution_group',
        description: 'Delete a distribution group.',
        inputSchema: {
          type: 'object',
          properties: {
            owner_name: { type: 'string', description: 'Owner username or org name' },
            app_name: { type: 'string', description: 'App name' },
            distribution_group_name: { type: 'string', description: 'Distribution group name to delete' },
          },
          required: ['owner_name', 'app_name', 'distribution_group_name'],
        },
      },
      {
        name: 'list_distribution_group_members',
        description: 'List members (testers) in a distribution group.',
        inputSchema: {
          type: 'object',
          properties: {
            owner_name: { type: 'string', description: 'Owner username or org name' },
            app_name: { type: 'string', description: 'App name' },
            distribution_group_name: { type: 'string', description: 'Distribution group name' },
          },
          required: ['owner_name', 'app_name', 'distribution_group_name'],
        },
      },
      {
        name: 'add_distribution_group_members',
        description: 'Add users to a distribution group by email address.',
        inputSchema: {
          type: 'object',
          properties: {
            owner_name: { type: 'string', description: 'Owner username or org name' },
            app_name: { type: 'string', description: 'App name' },
            distribution_group_name: { type: 'string', description: 'Distribution group name' },
            user_emails: { type: 'array', description: 'Array of email addresses to add', items: { type: 'string' } },
          },
          required: ['owner_name', 'app_name', 'distribution_group_name', 'user_emails'],
        },
      },
      // --- Crashes ---
      {
        name: 'get_app_crashes_info',
        description: 'Get crash reporting summary and configuration for an app.',
        inputSchema: {
          type: 'object',
          properties: {
            owner_name: { type: 'string', description: 'Owner username or org name' },
            app_name: { type: 'string', description: 'App name' },
          },
          required: ['owner_name', 'app_name'],
        },
      },
      {
        name: 'list_crashes',
        description: 'List individual crash reports within a crash group.',
        inputSchema: {
          type: 'object',
          properties: {
            owner_name: { type: 'string', description: 'Owner username or org name' },
            app_name: { type: 'string', description: 'App name' },
            crash_group_id: { type: 'string', description: 'Crash group ID' },
          },
          required: ['owner_name', 'app_name', 'crash_group_id'],
        },
      },
      {
        name: 'get_crash',
        description: 'Get details of a specific crash report.',
        inputSchema: {
          type: 'object',
          properties: {
            owner_name: { type: 'string', description: 'Owner username or org name' },
            app_name: { type: 'string', description: 'App name' },
            crash_group_id: { type: 'string', description: 'Crash group ID' },
            crash_id: { type: 'string', description: 'Crash ID' },
          },
          required: ['owner_name', 'app_name', 'crash_group_id', 'crash_id'],
        },
      },
      {
        name: 'get_crash_stacktrace',
        description: 'Get the full stacktrace for a specific crash.',
        inputSchema: {
          type: 'object',
          properties: {
            owner_name: { type: 'string', description: 'Owner username or org name' },
            app_name: { type: 'string', description: 'App name' },
            crash_group_id: { type: 'string', description: 'Crash group ID' },
            crash_id: { type: 'string', description: 'Crash ID' },
          },
          required: ['owner_name', 'app_name', 'crash_group_id', 'crash_id'],
        },
      },
      // --- Analytics ---
      {
        name: 'get_analytics_events',
        description: 'Get event analytics data for an app within a date range.',
        inputSchema: {
          type: 'object',
          properties: {
            owner_name: { type: 'string', description: 'Owner username or org name' },
            app_name: { type: 'string', description: 'App name' },
            start: { type: 'string', description: 'Start date (ISO 8601)' },
            end: { type: 'string', description: 'End date (ISO 8601, optional)' },
            versions: { type: 'array', description: 'Filter by app versions', items: { type: 'string' } },
            event_name: { type: 'array', description: 'Filter by event names', items: { type: 'string' } },
          },
          required: ['owner_name', 'app_name', 'start'],
        },
      },
      {
        name: 'get_active_device_counts',
        description: 'Get daily active device counts for an app.',
        inputSchema: {
          type: 'object',
          properties: {
            owner_name: { type: 'string', description: 'Owner username or org name' },
            app_name: { type: 'string', description: 'App name' },
            start: { type: 'string', description: 'Start date (ISO 8601)' },
            end: { type: 'string', description: 'End date (ISO 8601, optional)' },
          },
          required: ['owner_name', 'app_name', 'start'],
        },
      },
      {
        name: 'get_analytics_versions',
        description: 'Get distribution of users by app version.',
        inputSchema: {
          type: 'object',
          properties: {
            owner_name: { type: 'string', description: 'Owner username or org name' },
            app_name: { type: 'string', description: 'App name' },
            start: { type: 'string', description: 'Start date (ISO 8601)' },
            end: { type: 'string', description: 'End date (ISO 8601, optional)' },
          },
          required: ['owner_name', 'app_name', 'start'],
        },
      },
      // --- Organizations ---
      {
        name: 'list_organizations',
        description: 'List all organizations the authenticated user belongs to.',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'create_organization',
        description: 'Create a new organization in App Center.',
        inputSchema: {
          type: 'object',
          properties: {
            display_name: { type: 'string', description: 'Organization display name' },
            name: { type: 'string', description: 'Organization URL name (no spaces)' },
          },
          required: ['display_name'],
        },
      },
      {
        name: 'get_organization',
        description: 'Get details of a specific organization.',
        inputSchema: {
          type: 'object',
          properties: {
            org_name: { type: 'string', description: 'Organization name' },
          },
          required: ['org_name'],
        },
      },
      {
        name: 'delete_organization',
        description: 'Delete an organization. Irreversible.',
        inputSchema: {
          type: 'object',
          properties: {
            org_name: { type: 'string', description: 'Organization name to delete' },
          },
          required: ['org_name'],
        },
      },
      // --- API Tokens ---
      {
        name: 'list_user_api_tokens',
        description: 'List API tokens for the authenticated user.',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'create_user_api_token',
        description: 'Create a new API token for the authenticated user.',
        inputSchema: {
          type: 'object',
          properties: {
            description: { type: 'string', description: 'Description for the token' },
            scope: { type: 'array', description: 'Token scope: [all] or [viewer]', items: { type: 'string' } },
          },
        },
      },
      {
        name: 'delete_user_api_token',
        description: 'Delete a user API token by its ID.',
        inputSchema: {
          type: 'object',
          properties: {
            api_token_id: { type: 'string', description: 'API token ID to delete' },
          },
          required: ['api_token_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_apps': return await this.apiGet('/apps');
        case 'create_app': return await this.apiPost('/apps', args);
        case 'get_app': return await this.apiGet(`/apps/${args.owner_name}/${args.app_name}`);
        case 'delete_app': return await this.apiDelete(`/apps/${args.owner_name}/${args.app_name}`);
        case 'list_apps_for_org': return await this.apiGet(`/orgs/${args.org_name}/apps`);
        case 'list_branches': return await this.apiGet(`/apps/${args.owner_name}/${args.app_name}/branches`);
        case 'list_builds_for_branch': return await this.apiGet(`/apps/${args.owner_name}/${args.app_name}/branches/${encodeURIComponent(args.branch as string)}/builds`);
        case 'trigger_build': return await this.triggerBuild(args);
        case 'get_build': return await this.apiGet(`/apps/${args.owner_name}/${args.app_name}/builds/${args.build_id}`);
        case 'cancel_build': return await this.apiPatch(`/apps/${args.owner_name}/${args.app_name}/builds/${args.build_id}`, { status: 'cancelling' });
        case 'get_build_logs': return await this.apiGet(`/apps/${args.owner_name}/${args.app_name}/builds/${args.build_id}/logs`);
        case 'distribute_build': return await this.distributeBuild(args);
        case 'list_releases': return await this.apiGet(`/apps/${args.owner_name}/${args.app_name}/releases`);
        case 'get_release': return await this.apiGet(`/apps/${args.owner_name}/${args.app_name}/releases/${args.release_id}`);
        case 'delete_release': return await this.apiDelete(`/apps/${args.owner_name}/${args.app_name}/releases/${args.release_id}`);
        case 'list_recent_releases': return await this.apiGet(`/apps/${args.owner_name}/${args.app_name}/recent_releases`);
        case 'list_distribution_groups': return await this.apiGet(`/apps/${args.owner_name}/${args.app_name}/distribution_groups`);
        case 'create_distribution_group': return await this.createDistributionGroup(args);
        case 'get_distribution_group': return await this.apiGet(`/apps/${args.owner_name}/${args.app_name}/distribution_groups/${encodeURIComponent(args.distribution_group_name as string)}`);
        case 'delete_distribution_group': return await this.apiDelete(`/apps/${args.owner_name}/${args.app_name}/distribution_groups/${encodeURIComponent(args.distribution_group_name as string)}`);
        case 'list_distribution_group_members': return await this.apiGet(`/apps/${args.owner_name}/${args.app_name}/distribution_groups/${encodeURIComponent(args.distribution_group_name as string)}/members`);
        case 'add_distribution_group_members': return await this.addGroupMembers(args);
        case 'get_app_crashes_info': return await this.apiGet(`/apps/${args.owner_name}/${args.app_name}/crashes_info`);
        case 'list_crashes': return await this.apiGet(`/apps/${args.owner_name}/${args.app_name}/crash_groups/${encodeURIComponent(args.crash_group_id as string)}/crashes`);
        case 'get_crash': return await this.apiGet(`/apps/${args.owner_name}/${args.app_name}/crash_groups/${encodeURIComponent(args.crash_group_id as string)}/crashes/${encodeURIComponent(args.crash_id as string)}`);
        case 'get_crash_stacktrace': return await this.apiGet(`/apps/${args.owner_name}/${args.app_name}/crash_groups/${encodeURIComponent(args.crash_group_id as string)}/crashes/${encodeURIComponent(args.crash_id as string)}/stacktrace`);
        case 'get_analytics_events': return await this.getAnalyticsEvents(args);
        case 'get_active_device_counts': return await this.getAnalyticsWithDate('/analytics/active_device_counts', args);
        case 'get_analytics_versions': return await this.getAnalyticsWithDate('/analytics/versions', args);
        case 'list_organizations': return await this.apiGet('/orgs');
        case 'create_organization': return await this.apiPost('/orgs', args);
        case 'get_organization': return await this.apiGet(`/orgs/${args.org_name}`);
        case 'delete_organization': return await this.apiDelete(`/orgs/${args.org_name}`);
        case 'list_user_api_tokens': return await this.apiGet('/api_tokens');
        case 'create_user_api_token': return await this.apiPost('/api_tokens', args);
        case 'delete_user_api_token': return await this.apiDelete(`/api_tokens/${args.api_token_id}`);
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

  private async apiGet(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, { method: 'GET', headers: this.headers });
    if (!response.ok) return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apiPost(path: string, body: unknown): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, { method: 'POST', headers: this.headers, body: JSON.stringify(body) });
    if (!response.ok) return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    if (response.status === 204) return { content: [{ type: 'text', text: JSON.stringify({ success: true }) }], isError: false };
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apiPatch(path: string, body: unknown): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, { method: 'PATCH', headers: this.headers, body: JSON.stringify(body) });
    if (!response.ok) return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    if (response.status === 204) return { content: [{ type: 'text', text: JSON.stringify({ success: true }) }], isError: false };
    try { const data = await response.json(); return { content: [{ type: 'text', text: this.truncate(data) }], isError: false }; }
    catch { return { content: [{ type: 'text', text: JSON.stringify({ success: true }) }], isError: false }; }
  }

  private async apiDelete(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, { method: 'DELETE', headers: this.headers });
    if (!response.ok) return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    return { content: [{ type: 'text', text: JSON.stringify({ success: true }) }], isError: false };
  }

  private async triggerBuild(args: Record<string, unknown>): Promise<ToolResult> {
    const { owner_name, app_name, branch, ...rest } = args;
    if (!owner_name || !app_name || !branch) return { content: [{ type: 'text', text: 'owner_name, app_name, and branch are required' }], isError: true };
    return this.apiPost(`/apps/${owner_name}/${app_name}/branches/${encodeURIComponent(branch as string)}/builds`, rest);
  }

  private async distributeBuild(args: Record<string, unknown>): Promise<ToolResult> {
    const { owner_name, app_name, build_id, destinations, release_notes, notify_testers } = args;
    if (!owner_name || !app_name || !build_id || !destinations) return { content: [{ type: 'text', text: 'owner_name, app_name, build_id, and destinations are required' }], isError: true };
    const body: Record<string, unknown> = { destinations };
    if (release_notes) body.release_notes = release_notes;
    if (notify_testers !== undefined) body.notify_testers = notify_testers;
    return this.apiPost(`/apps/${owner_name}/${app_name}/builds/${build_id}/distribute`, body);
  }

  private async createDistributionGroup(args: Record<string, unknown>): Promise<ToolResult> {
    const { owner_name, app_name, name, is_public } = args;
    if (!owner_name || !app_name || !name) return { content: [{ type: 'text', text: 'owner_name, app_name, and name are required' }], isError: true };
    const body: Record<string, unknown> = { name };
    if (is_public !== undefined) body.is_public = is_public;
    return this.apiPost(`/apps/${owner_name}/${app_name}/distribution_groups`, body);
  }

  private async addGroupMembers(args: Record<string, unknown>): Promise<ToolResult> {
    const { owner_name, app_name, distribution_group_name, user_emails } = args;
    if (!owner_name || !app_name || !distribution_group_name || !Array.isArray(user_emails)) {
      return { content: [{ type: 'text', text: 'owner_name, app_name, distribution_group_name, and user_emails array are required' }], isError: true };
    }
    return this.apiPost(`/apps/${owner_name}/${app_name}/distribution_groups/${encodeURIComponent(distribution_group_name as string)}/members`, {
      user_emails,
    });
  }

  private async getAnalyticsEvents(args: Record<string, unknown>): Promise<ToolResult> {
    const { owner_name, app_name, start, end, versions, event_name } = args;
    if (!owner_name || !app_name || !start) return { content: [{ type: 'text', text: 'owner_name, app_name, and start are required' }], isError: true };
    const params: string[] = [`start=${encodeURIComponent(start as string)}`];
    if (end) params.push(`end=${encodeURIComponent(end as string)}`);
    if (Array.isArray(versions)) versions.forEach(v => params.push(`versions=${encodeURIComponent(v)}`));
    if (Array.isArray(event_name)) event_name.forEach(e => params.push(`event_name=${encodeURIComponent(e)}`));
    return this.apiGet(`/apps/${owner_name}/${app_name}/analytics/events?${params.join('&')}`);
  }

  private async getAnalyticsWithDate(subpath: string, args: Record<string, unknown>): Promise<ToolResult> {
    const { owner_name, app_name, start, end } = args;
    if (!owner_name || !app_name || !start) return { content: [{ type: 'text', text: 'owner_name, app_name, and start are required' }], isError: true };
    const params: string[] = [`start=${encodeURIComponent(start as string)}`];
    if (end) params.push(`end=${encodeURIComponent(end as string)}`);
    return this.apiGet(`/apps/${owner_name}/${app_name}${subpath}?${params.join('&')}`);
  }

  static catalog() {
    return {
      name: 'appcenter-ms',
      displayName: 'App Center (Microsoft)',
      version: '1.0.0',
      category: 'devops' as const,
      keywords: ['appcenter', 'app-center', 'microsoft', 'mobile', 'ci', 'cd', 'build', 'distribute', 'crashes', 'analytics', 'devops'],
      toolNames: [
        'list_apps', 'create_app', 'get_app', 'delete_app', 'list_apps_for_org',
        'list_branches', 'list_builds_for_branch', 'trigger_build', 'get_build', 'cancel_build', 'get_build_logs', 'distribute_build',
        'list_releases', 'get_release', 'delete_release', 'list_recent_releases',
        'list_distribution_groups', 'create_distribution_group', 'get_distribution_group', 'delete_distribution_group',
        'list_distribution_group_members', 'add_distribution_group_members',
        'get_app_crashes_info', 'list_crashes', 'get_crash', 'get_crash_stacktrace',
        'get_analytics_events', 'get_active_device_counts', 'get_analytics_versions',
        'list_organizations', 'create_organization', 'get_organization', 'delete_organization',
        'list_user_api_tokens', 'create_user_api_token', 'delete_user_api_token',
      ],
      description: 'Microsoft App Center adapter — manage mobile app builds, distributions, crash reports, analytics, and distribution groups for iOS/Android/Windows apps.',
      author: 'protectnil' as const,
    };
  }
}

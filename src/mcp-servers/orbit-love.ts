/**
 * Orbit Love MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03. Orbit Love has not published an official MCP server.
//
// Base URL: https://app.orbit.love/api/v1
// Auth: API key — Authorization: Bearer <api_key>  OR  ?api_key=<api_key> query param
// Docs: https://api.orbit.love/reference
// Rate limits: Not publicly documented.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface OrbitLoveConfig {
  apiKey: string;
  workspaceSlug: string;
  baseUrl?: string;
}

export class OrbitLoveMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly workspaceSlug: string;
  private readonly baseUrl: string;

  constructor(config: OrbitLoveConfig) {
    super();
    this.apiKey = config.apiKey;
    this.workspaceSlug = config.workspaceSlug;
    this.baseUrl = config.baseUrl || 'https://app.orbit.love/api/v1';
  }

  static catalog() {
    return {
      name: 'orbit-love',
      displayName: 'Orbit Love',
      version: '1.0.0',
      category: 'sales' as const,
      keywords: ['orbit', 'community', 'members', 'activities', 'engagement', 'organizations', 'crm', 'developer-relations', 'devrel'],
      toolNames: [
        'get_current_user',
        'list_workspaces', 'get_workspace', 'get_workspace_stats',
        'list_members', 'get_member', 'find_member', 'create_or_update_member', 'update_member', 'delete_member',
        'list_member_activities', 'create_member_activity',
        'list_member_notes', 'create_member_note', 'update_member_note',
        'add_member_identity', 'remove_member_identity',
        'list_activities', 'get_activity', 'create_activity', 'update_activity', 'delete_activity',
        'list_activity_types',
        'list_organizations', 'get_organization', 'update_organization',
        'list_organization_members', 'list_organization_activities',
        'list_webhooks', 'get_webhook', 'create_webhook', 'update_webhook', 'delete_webhook',
      ],
      description: 'Manage Orbit community workspace: members, activities, organizations, notes, identities, and webhooks via the Orbit Love REST API.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      // User
      {
        name: 'get_current_user',
        description: 'Get info about the current authenticated Orbit user',
        inputSchema: { type: 'object', properties: {} },
      },
      // Workspaces
      {
        name: 'list_workspaces',
        description: 'List all Orbit workspaces accessible to the current user',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'get_workspace',
        description: 'Get details for a specific Orbit workspace by its slug',
        inputSchema: {
          type: 'object',
          properties: {
            workspace_slug: { type: 'string', description: 'Workspace slug (defaults to configured workspace)' },
          },
        },
      },
      {
        name: 'get_workspace_stats',
        description: 'Get aggregate statistics and reports for a workspace',
        inputSchema: {
          type: 'object',
          properties: {
            workspace_slug: { type: 'string', description: 'Workspace slug (defaults to configured workspace)' },
          },
        },
      },
      // Members
      {
        name: 'list_members',
        description: 'List members in the workspace with optional filtering and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            workspace_slug: { type: 'string', description: 'Workspace slug (defaults to configured workspace)' },
            page: { type: 'number', description: 'Page number for pagination' },
            items: { type: 'number', description: 'Items per page (max 100)' },
            sort: { type: 'string', description: 'Sort field (e.g. orbit_level, created_at, last_activity_occurred_at)' },
            direction: { type: 'string', enum: ['ASC', 'DESC'], description: 'Sort direction' },
            query: { type: 'string', description: 'Search query string' },
          },
        },
      },
      {
        name: 'get_member',
        description: 'Get a single member by their member slug',
        inputSchema: {
          type: 'object',
          properties: {
            workspace_slug: { type: 'string', description: 'Workspace slug (defaults to configured workspace)' },
            member_slug: { type: 'string', description: 'Member slug identifier' },
          },
          required: ['member_slug'],
        },
      },
      {
        name: 'find_member',
        description: 'Find a member by an identity such as email, GitHub username, or Twitter handle',
        inputSchema: {
          type: 'object',
          properties: {
            workspace_slug: { type: 'string', description: 'Workspace slug (defaults to configured workspace)' },
            source: { type: 'string', description: 'Identity source (e.g. email, github, twitter)' },
            username: { type: 'string', description: 'Username or handle for the given source' },
            email: { type: 'string', description: 'Email address to find member by' },
          },
        },
      },
      {
        name: 'create_or_update_member',
        description: 'Create a new member or update an existing member in the workspace',
        inputSchema: {
          type: 'object',
          properties: {
            workspace_slug: { type: 'string', description: 'Workspace slug (defaults to configured workspace)' },
            name: { type: 'string', description: 'Member display name' },
            email: { type: 'string', description: 'Member email address' },
            bio: { type: 'string', description: 'Member biography' },
            location: { type: 'string', description: 'Member location' },
            title: { type: 'string', description: 'Member job title' },
            organization: { type: 'string', description: 'Member organization name' },
            tags: { type: 'array', items: { type: 'string' }, description: 'Tags to assign to the member' },
          },
        },
      },
      {
        name: 'update_member',
        description: 'Update an existing member by their member slug',
        inputSchema: {
          type: 'object',
          properties: {
            workspace_slug: { type: 'string', description: 'Workspace slug (defaults to configured workspace)' },
            member_slug: { type: 'string', description: 'Member slug identifier' },
            name: { type: 'string', description: 'Updated display name' },
            email: { type: 'string', description: 'Updated email address' },
            bio: { type: 'string', description: 'Updated biography' },
            location: { type: 'string', description: 'Updated location' },
            title: { type: 'string', description: 'Updated job title' },
            organization: { type: 'string', description: 'Updated organization name' },
            tags: { type: 'array', items: { type: 'string' }, description: 'Updated tags' },
          },
          required: ['member_slug'],
        },
      },
      {
        name: 'delete_member',
        description: 'Permanently delete a member from the workspace',
        inputSchema: {
          type: 'object',
          properties: {
            workspace_slug: { type: 'string', description: 'Workspace slug (defaults to configured workspace)' },
            member_slug: { type: 'string', description: 'Member slug identifier to delete' },
          },
          required: ['member_slug'],
        },
      },
      // Member Activities
      {
        name: 'list_member_activities',
        description: 'List all activities for a specific member',
        inputSchema: {
          type: 'object',
          properties: {
            workspace_slug: { type: 'string', description: 'Workspace slug (defaults to configured workspace)' },
            member_slug: { type: 'string', description: 'Member slug identifier' },
            page: { type: 'number', description: 'Page number' },
            items: { type: 'number', description: 'Items per page' },
          },
          required: ['member_slug'],
        },
      },
      {
        name: 'create_member_activity',
        description: 'Create a custom or content activity for a specific member',
        inputSchema: {
          type: 'object',
          properties: {
            workspace_slug: { type: 'string', description: 'Workspace slug (defaults to configured workspace)' },
            member_slug: { type: 'string', description: 'Member slug identifier' },
            activity_type_key: { type: 'string', description: 'Activity type key (e.g. custom:attended_event)' },
            title: { type: 'string', description: 'Activity title' },
            description: { type: 'string', description: 'Activity description' },
            link: { type: 'string', description: 'URL associated with the activity' },
            occurred_at: { type: 'string', description: 'ISO 8601 timestamp when activity occurred' },
            weight: { type: 'string', description: 'Numeric weight for the activity' },
          },
          required: ['member_slug', 'activity_type_key'],
        },
      },
      // Member Notes
      {
        name: 'list_member_notes',
        description: 'Get all notes for a specific member',
        inputSchema: {
          type: 'object',
          properties: {
            workspace_slug: { type: 'string', description: 'Workspace slug (defaults to configured workspace)' },
            member_slug: { type: 'string', description: 'Member slug identifier' },
          },
          required: ['member_slug'],
        },
      },
      {
        name: 'create_member_note',
        description: 'Create a new note on a member record',
        inputSchema: {
          type: 'object',
          properties: {
            workspace_slug: { type: 'string', description: 'Workspace slug (defaults to configured workspace)' },
            member_slug: { type: 'string', description: 'Member slug identifier' },
            body: { type: 'string', description: 'Note body text' },
          },
          required: ['member_slug', 'body'],
        },
      },
      {
        name: 'update_member_note',
        description: 'Update an existing note on a member record',
        inputSchema: {
          type: 'object',
          properties: {
            workspace_slug: { type: 'string', description: 'Workspace slug (defaults to configured workspace)' },
            member_slug: { type: 'string', description: 'Member slug identifier' },
            note_id: { type: 'string', description: 'Note ID to update' },
            body: { type: 'string', description: 'Updated note body text' },
          },
          required: ['member_slug', 'note_id', 'body'],
        },
      },
      // Member Identities
      {
        name: 'add_member_identity',
        description: 'Add a new identity (e.g. GitHub, Twitter, email) to a member',
        inputSchema: {
          type: 'object',
          properties: {
            workspace_slug: { type: 'string', description: 'Workspace slug (defaults to configured workspace)' },
            member_slug: { type: 'string', description: 'Member slug identifier' },
            source: { type: 'string', description: 'Identity source (e.g. github, twitter, email)' },
            username: { type: 'string', description: 'Username or handle for this identity' },
            email: { type: 'string', description: 'Email address (when source is email)' },
          },
          required: ['member_slug', 'source'],
        },
      },
      {
        name: 'remove_member_identity',
        description: 'Remove an identity from a member record',
        inputSchema: {
          type: 'object',
          properties: {
            workspace_slug: { type: 'string', description: 'Workspace slug (defaults to configured workspace)' },
            member_slug: { type: 'string', description: 'Member slug identifier' },
            source: { type: 'string', description: 'Identity source to remove (e.g. github, twitter)' },
            username: { type: 'string', description: 'Username for the identity to remove' },
          },
          required: ['member_slug', 'source'],
        },
      },
      // Workspace Activities
      {
        name: 'list_activities',
        description: 'List all activities in a workspace with optional filtering and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            workspace_slug: { type: 'string', description: 'Workspace slug (defaults to configured workspace)' },
            page: { type: 'number', description: 'Page number' },
            items: { type: 'number', description: 'Items per page' },
            activity_type: { type: 'string', description: 'Filter by activity type key' },
            member: { type: 'string', description: 'Filter by member slug' },
          },
        },
      },
      {
        name: 'get_activity',
        description: 'Get a single activity by its ID',
        inputSchema: {
          type: 'object',
          properties: {
            workspace_slug: { type: 'string', description: 'Workspace slug (defaults to configured workspace)' },
            activity_id: { type: 'string', description: 'Activity ID' },
          },
          required: ['activity_id'],
        },
      },
      {
        name: 'create_activity',
        description: 'Create a custom or content activity for a new or existing member in the workspace',
        inputSchema: {
          type: 'object',
          properties: {
            workspace_slug: { type: 'string', description: 'Workspace slug (defaults to configured workspace)' },
            activity_type_key: { type: 'string', description: 'Activity type key (e.g. custom:attended_event)' },
            title: { type: 'string', description: 'Activity title' },
            description: { type: 'string', description: 'Activity description' },
            link: { type: 'string', description: 'URL associated with the activity' },
            occurred_at: { type: 'string', description: 'ISO 8601 timestamp when activity occurred' },
            member_email: { type: 'string', description: 'Email to identify/create the member' },
            member_name: { type: 'string', description: 'Name of the member' },
          },
          required: ['activity_type_key'],
        },
      },
      {
        name: 'update_activity',
        description: 'Update a custom activity for a member',
        inputSchema: {
          type: 'object',
          properties: {
            workspace_slug: { type: 'string', description: 'Workspace slug (defaults to configured workspace)' },
            member_slug: { type: 'string', description: 'Member slug identifier' },
            activity_id: { type: 'string', description: 'Activity ID to update' },
            title: { type: 'string', description: 'Updated activity title' },
            description: { type: 'string', description: 'Updated activity description' },
            link: { type: 'string', description: 'Updated URL' },
            occurred_at: { type: 'string', description: 'Updated ISO 8601 occurrence timestamp' },
          },
          required: ['member_slug', 'activity_id'],
        },
      },
      {
        name: 'delete_activity',
        description: 'Delete a post/content activity for a member',
        inputSchema: {
          type: 'object',
          properties: {
            workspace_slug: { type: 'string', description: 'Workspace slug (defaults to configured workspace)' },
            member_slug: { type: 'string', description: 'Member slug identifier' },
            activity_id: { type: 'string', description: 'Activity ID to delete' },
          },
          required: ['member_slug', 'activity_id'],
        },
      },
      // Activity Types
      {
        name: 'list_activity_types',
        description: 'List all activity types configured in a workspace',
        inputSchema: {
          type: 'object',
          properties: {
            workspace_slug: { type: 'string', description: 'Workspace slug (defaults to configured workspace)' },
          },
        },
      },
      // Organizations
      {
        name: 'list_organizations',
        description: 'List organizations in the workspace',
        inputSchema: {
          type: 'object',
          properties: {
            workspace_slug: { type: 'string', description: 'Workspace slug (defaults to configured workspace)' },
            page: { type: 'number', description: 'Page number' },
            items: { type: 'number', description: 'Items per page' },
          },
        },
      },
      {
        name: 'get_organization',
        description: 'Get a single organization by its ID',
        inputSchema: {
          type: 'object',
          properties: {
            workspace_slug: { type: 'string', description: 'Workspace slug (defaults to configured workspace)' },
            organization_id: { type: 'string', description: 'Organization ID' },
          },
          required: ['organization_id'],
        },
      },
      {
        name: 'update_organization',
        description: 'Update an organization record in the workspace',
        inputSchema: {
          type: 'object',
          properties: {
            workspace_slug: { type: 'string', description: 'Workspace slug (defaults to configured workspace)' },
            organization_id: { type: 'string', description: 'Organization ID to update' },
            name: { type: 'string', description: 'Updated organization name' },
            website: { type: 'string', description: 'Updated organization website URL' },
          },
          required: ['organization_id'],
        },
      },
      {
        name: 'list_organization_members',
        description: 'List all members belonging to a specific organization',
        inputSchema: {
          type: 'object',
          properties: {
            workspace_slug: { type: 'string', description: 'Workspace slug (defaults to configured workspace)' },
            organization_id: { type: 'string', description: 'Organization ID' },
            page: { type: 'number', description: 'Page number' },
            items: { type: 'number', description: 'Items per page' },
          },
          required: ['organization_id'],
        },
      },
      {
        name: 'list_organization_activities',
        description: 'List member activities within a specific organization',
        inputSchema: {
          type: 'object',
          properties: {
            workspace_slug: { type: 'string', description: 'Workspace slug (defaults to configured workspace)' },
            organization_id: { type: 'string', description: 'Organization ID' },
            page: { type: 'number', description: 'Page number' },
            items: { type: 'number', description: 'Items per page' },
          },
          required: ['organization_id'],
        },
      },
      // Webhooks
      {
        name: 'list_webhooks',
        description: 'List all webhooks configured in a workspace',
        inputSchema: {
          type: 'object',
          properties: {
            workspace_slug: { type: 'string', description: 'Workspace slug (defaults to configured workspace)' },
          },
        },
      },
      {
        name: 'get_webhook',
        description: 'Get a single webhook by its ID',
        inputSchema: {
          type: 'object',
          properties: {
            workspace_slug: { type: 'string', description: 'Workspace slug (defaults to configured workspace)' },
            webhook_id: { type: 'string', description: 'Webhook ID' },
          },
          required: ['webhook_id'],
        },
      },
      {
        name: 'create_webhook',
        description: 'Create a new webhook to receive Orbit event notifications',
        inputSchema: {
          type: 'object',
          properties: {
            workspace_slug: { type: 'string', description: 'Workspace slug (defaults to configured workspace)' },
            url: { type: 'string', description: 'HTTPS URL to send webhook events to' },
            event_types: { type: 'array', items: { type: 'string' }, description: 'Event types to subscribe to' },
          },
          required: ['url'],
        },
      },
      {
        name: 'update_webhook',
        description: 'Update an existing webhook configuration',
        inputSchema: {
          type: 'object',
          properties: {
            workspace_slug: { type: 'string', description: 'Workspace slug (defaults to configured workspace)' },
            webhook_id: { type: 'string', description: 'Webhook ID to update' },
            url: { type: 'string', description: 'Updated HTTPS URL' },
            event_types: { type: 'array', items: { type: 'string' }, description: 'Updated event types' },
          },
          required: ['webhook_id'],
        },
      },
      {
        name: 'delete_webhook',
        description: 'Delete a webhook from the workspace',
        inputSchema: {
          type: 'object',
          properties: {
            workspace_slug: { type: 'string', description: 'Workspace slug (defaults to configured workspace)' },
            webhook_id: { type: 'string', description: 'Webhook ID to delete' },
          },
          required: ['webhook_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      const ws = (args.workspace_slug as string) || this.workspaceSlug;

      switch (name) {
        case 'get_current_user':
          return await this.get('/user');

        case 'list_workspaces':
          return await this.get('/workspaces');

        case 'get_workspace':
          return await this.get(`/workspaces/${ws}`);

        case 'get_workspace_stats':
          return await this.get(`/${ws}/reports`);

        case 'list_members': {
          const params = new URLSearchParams();
          if (args.page) params.set('page', String(args.page));
          if (args.items) params.set('items', String(args.items));
          if (args.sort) params.set('sort', args.sort as string);
          if (args.direction) params.set('direction', args.direction as string);
          if (args.query) params.set('query', args.query as string);
          const qs = params.toString() ? `?${params}` : '';
          return await this.get(`/${ws}/members${qs}`);
        }

        case 'get_member':
          return await this.get(`/${ws}/members/${args.member_slug}`);

        case 'find_member': {
          const params = new URLSearchParams();
          if (args.source) params.set('source', args.source as string);
          if (args.username) params.set('username', args.username as string);
          if (args.email) params.set('email', args.email as string);
          return await this.get(`/${ws}/members/find?${params}`);
        }

        case 'create_or_update_member':
          return await this.post(`/${ws}/members`, this.buildMemberBody(args));

        case 'update_member':
          return await this.put(`/${ws}/members/${args.member_slug}`, this.buildMemberBody(args));

        case 'delete_member':
          return await this.del(`/${ws}/members/${args.member_slug}`);

        case 'list_member_activities': {
          const params = new URLSearchParams();
          if (args.page) params.set('page', String(args.page));
          if (args.items) params.set('items', String(args.items));
          const qs = params.toString() ? `?${params}` : '';
          return await this.get(`/${ws}/members/${args.member_slug}/activities${qs}`);
        }

        case 'create_member_activity':
          return await this.post(`/${ws}/members/${args.member_slug}/activities`, this.buildActivityBody(args));

        case 'list_member_notes':
          return await this.get(`/${ws}/members/${args.member_slug}/notes`);

        case 'create_member_note':
          return await this.post(`/${ws}/members/${args.member_slug}/notes`, { body: args.body });

        case 'update_member_note':
          return await this.put(`/${ws}/members/${args.member_slug}/notes/${args.note_id}`, { body: args.body });

        case 'add_member_identity': {
          const body: Record<string, unknown> = { source: args.source };
          if (args.username) body.username = args.username;
          if (args.email) body.email = args.email;
          return await this.post(`/${ws}/members/${args.member_slug}/identities`, body);
        }

        case 'remove_member_identity': {
          const body: Record<string, unknown> = { source: args.source };
          if (args.username) body.username = args.username;
          return await this.del(`/${ws}/members/${args.member_slug}/identities`, body);
        }

        case 'list_activities': {
          const params = new URLSearchParams();
          if (args.page) params.set('page', String(args.page));
          if (args.items) params.set('items', String(args.items));
          if (args.activity_type) params.set('activity_type', args.activity_type as string);
          if (args.member) params.set('member', args.member as string);
          const qs = params.toString() ? `?${params}` : '';
          return await this.get(`/${ws}/activities${qs}`);
        }

        case 'get_activity':
          return await this.get(`/${ws}/activities/${args.activity_id}`);

        case 'create_activity':
          return await this.post(`/${ws}/activities`, this.buildActivityBody(args));

        case 'update_activity':
          return await this.put(
            `/${ws}/members/${args.member_slug}/activities/${args.activity_id}`,
            this.buildActivityBody(args),
          );

        case 'delete_activity':
          return await this.del(`/${ws}/members/${args.member_slug}/activities/${args.activity_id}`);

        case 'list_activity_types':
          return await this.get(`/${ws}/activity_types`);

        case 'list_organizations': {
          const params = new URLSearchParams();
          if (args.page) params.set('page', String(args.page));
          if (args.items) params.set('items', String(args.items));
          const qs = params.toString() ? `?${params}` : '';
          return await this.get(`/${ws}/organizations${qs}`);
        }

        case 'get_organization':
          return await this.get(`/${ws}/organizations/${args.organization_id}`);

        case 'update_organization': {
          const body: Record<string, unknown> = {};
          if (args.name) body.name = args.name;
          if (args.website) body.website = args.website;
          return await this.put(`/${ws}/organizations/${args.organization_id}`, body);
        }

        case 'list_organization_members': {
          const params = new URLSearchParams();
          if (args.page) params.set('page', String(args.page));
          if (args.items) params.set('items', String(args.items));
          const qs = params.toString() ? `?${params}` : '';
          return await this.get(`/${ws}/organizations/${args.organization_id}/members${qs}`);
        }

        case 'list_organization_activities': {
          const params = new URLSearchParams();
          if (args.page) params.set('page', String(args.page));
          if (args.items) params.set('items', String(args.items));
          const qs = params.toString() ? `?${params}` : '';
          return await this.get(`/${ws}/organizations/${args.organization_id}/activities${qs}`);
        }

        case 'list_webhooks':
          return await this.get(`/${ws}/webhooks`);

        case 'get_webhook':
          return await this.get(`/${ws}/webhooks/${args.webhook_id}`);

        case 'create_webhook': {
          const body: Record<string, unknown> = { url: args.url };
          if (args.event_types) body.event_types = args.event_types;
          return await this.post(`/${ws}/webhooks`, body);
        }

        case 'update_webhook': {
          const body: Record<string, unknown> = {};
          if (args.url) body.url = args.url;
          if (args.event_types) body.event_types = args.event_types;
          return await this.put(`/${ws}/webhooks/${args.webhook_id}`, body);
        }

        case 'delete_webhook':
          return await this.del(`/${ws}/webhooks/${args.webhook_id}`);

        default:
          return {
            content: [{ type: 'text', text: `Unknown tool: ${name}` }],
            isError: true,
          };
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        content: [{ type: 'text', text: `Error calling ${name}: ${msg}` }],
        isError: true,
      };
    }
  }

  // Private helpers

  private buildMemberBody(args: Record<string, unknown>): Record<string, unknown> {
    const member: Record<string, unknown> = {};
    if (args.name) member.name = args.name;
    if (args.email) member.email = args.email;
    if (args.bio) member.bio = args.bio;
    if (args.location) member.location = args.location;
    if (args.title) member.title = args.title;
    if (args.organization) member.organization = args.organization;
    if (args.tags) member.tags = args.tags;
    return { member };
  }

  private buildActivityBody(args: Record<string, unknown>): Record<string, unknown> {
    const activity: Record<string, unknown> = {};
    if (args.activity_type_key) activity.activity_type_key = args.activity_type_key;
    if (args.title) activity.title = args.title;
    if (args.description) activity.description = args.description;
    if (args.link) activity.link = args.link;
    if (args.occurred_at) activity.occurred_at = args.occurred_at;
    if (args.weight) activity.weight = args.weight;

    const body: Record<string, unknown> = { activity };
    if (args.member_email || args.member_name) {
      const member: Record<string, unknown> = {};
      if (args.member_email) member.email = args.member_email;
      if (args.member_name) member.name = args.member_name;
      body.member = member;
    }
    return body;
  }

  private async request(method: string, path: string, body?: Record<string, unknown>): Promise<ToolResult> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    const res = await this.fetchWithRetry(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    const raw = await res.text();
    const text = raw.length > 10240 ? raw.slice(0, 10240) + '\n…[truncated]' : raw;

    if (!res.ok) {
      return {
        content: [{ type: 'text', text: `HTTP ${res.status} ${res.statusText}: ${text}` }],
        isError: true,
      };
    }

    return {
      content: [{ type: 'text', text }],
      isError: false,
    };
  }

  private get(path: string): Promise<ToolResult> {
    return this.request('GET', path);
  }

  private post(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    return this.request('POST', path, body);
  }

  private put(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    return this.request('PUT', path, body);
  }

  private del(path: string, body?: Record<string, unknown>): Promise<ToolResult> {
    return this.request('DELETE', path, body);
  }
}

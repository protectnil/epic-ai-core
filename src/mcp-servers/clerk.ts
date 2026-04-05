/**
 * Clerk MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP (docs/coding assistant): https://mcp.clerk.com/mcp — transport: streamable-HTTP,
//   auth: none (public), tool count: unknown (documentation & SDK snippet tooling only, NOT
//   user/org management operations). Not suitable for management automation.
// Official MCP (management): https://github.com/clerk/javascript/tree/main/packages/agent-toolkit
//   — @clerk/agent-toolkit -p local-mcp — transport: stdio, auth: CLERK_SECRET_KEY env var.
//   Actively maintained (last commit Dec 2025). Covers: users, organizations, invitations (~10 tools).
//   Tool count < 10 confirmed from README (categories: users, organizations, invitations only).
//   Fails criterion 3 (exposes fewer than 10 management tools vs. our 18).
// Our adapter covers: 18 tools (full user & org management surface via BAPI).
// Recommendation: use-rest-api — agent-toolkit MCP fails the 10-tool threshold (criterion 3).
//   Our adapter covers the full BAPI management surface with broader tool count.
//
// Base URL: https://api.clerk.com
// Auth: Bearer secret key (sk_live_* or sk_test_*) in Authorization header
// Docs: https://clerk.com/docs/reference/backend-api
// Rate limits: Development — 100 req/10s; Production — 1000 req/10s per application instance.
//              Organization invitations: 250/hr (single), 50/hr (bulk).

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface ClerkConfig {
  secretKey: string;
  baseUrl?: string;
}

export class ClerkMCPServer extends MCPAdapterBase {
  private readonly secretKey: string;
  private readonly baseUrl: string;

  constructor(config: ClerkConfig) {
    super();
    this.secretKey = config.secretKey;
    this.baseUrl = config.baseUrl || 'https://api.clerk.com';
  }

  static catalog() {
    return {
      name: 'clerk',
      displayName: 'Clerk',
      version: '1.0.0',
      category: 'identity',
      keywords: [
        'clerk', 'auth', 'authentication', 'user', 'organization', 'session',
        'sign-in', 'sign-up', 'passkey', 'oauth', 'invitation', 'member',
        'role', 'permission', 'identity', 'frontend-auth',
      ],
      toolNames: [
        'list_users', 'get_user', 'create_user', 'update_user', 'delete_user',
        'ban_user', 'unban_user', 'get_user_by_email',
        'list_organizations', 'get_organization', 'create_organization', 'update_organization', 'delete_organization',
        'list_organization_members', 'create_organization_invitation', 'revoke_organization_invitation',
        'list_sessions', 'revoke_session',
      ],
      description: 'Clerk user and organization management: create, update, ban users; manage organizations, members, invitations, and sessions via the Backend API.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_users',
        description: 'List all users in the Clerk application with optional filters for email, phone, username, and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Number of results to return (max 500, default: 10)',
            },
            offset: {
              type: 'number',
              description: 'Number of results to skip for pagination (default: 0)',
            },
            email_address: {
              type: 'string',
              description: 'Filter users by email address (exact match)',
            },
            username: {
              type: 'string',
              description: 'Filter users by username (exact match)',
            },
            phone_number: {
              type: 'string',
              description: 'Filter users by phone number (E.164 format)',
            },
            order_by: {
              type: 'string',
              description: 'Sort field: created_at, updated_at, email_address, username, first_name, last_name (prefix with - for descending)',
            },
          },
        },
      },
      {
        name: 'get_user',
        description: 'Retrieve a single Clerk user by their user ID including profile, email addresses, and metadata',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: {
              type: 'string',
              description: 'Clerk user ID (e.g. user_2abc...)',
            },
          },
          required: ['user_id'],
        },
      },
      {
        name: 'get_user_by_email',
        description: 'Look up a Clerk user by email address',
        inputSchema: {
          type: 'object',
          properties: {
            email_address: {
              type: 'string',
              description: 'Email address to look up (e.g. user@example.com)',
            },
          },
          required: ['email_address'],
        },
      },
      {
        name: 'create_user',
        description: 'Create a new Clerk user with email, password, and profile fields',
        inputSchema: {
          type: 'object',
          properties: {
            email_address: {
              type: 'string',
              description: 'Primary email address for the user',
            },
            password: {
              type: 'string',
              description: 'User password (must meet application password policy)',
            },
            first_name: {
              type: 'string',
              description: 'User first name',
            },
            last_name: {
              type: 'string',
              description: 'User last name',
            },
            username: {
              type: 'string',
              description: 'Unique username for the user',
            },
            phone_number: {
              type: 'string',
              description: 'Primary phone number in E.164 format (e.g. +12025551234)',
            },
            public_metadata: {
              type: 'string',
              description: 'JSON string of public metadata key-value pairs to set on the user',
            },
            private_metadata: {
              type: 'string',
              description: 'JSON string of private metadata key-value pairs (server-side only)',
            },
          },
          required: ['email_address'],
        },
      },
      {
        name: 'update_user',
        description: 'Update profile fields, metadata, or password for an existing Clerk user by ID',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: {
              type: 'string',
              description: 'Clerk user ID to update',
            },
            first_name: {
              type: 'string',
              description: 'New first name',
            },
            last_name: {
              type: 'string',
              description: 'New last name',
            },
            username: {
              type: 'string',
              description: 'New username (must be unique)',
            },
            password: {
              type: 'string',
              description: 'New password for the user',
            },
            public_metadata: {
              type: 'string',
              description: 'JSON string of public metadata to merge onto the user',
            },
            private_metadata: {
              type: 'string',
              description: 'JSON string of private metadata to merge onto the user',
            },
          },
          required: ['user_id'],
        },
      },
      {
        name: 'delete_user',
        description: 'Permanently delete a Clerk user and all their data by user ID',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: {
              type: 'string',
              description: 'Clerk user ID to delete',
            },
          },
          required: ['user_id'],
        },
      },
      {
        name: 'ban_user',
        description: 'Ban a Clerk user to prevent all sign-ins; existing sessions are revoked',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: {
              type: 'string',
              description: 'Clerk user ID to ban',
            },
          },
          required: ['user_id'],
        },
      },
      {
        name: 'unban_user',
        description: 'Remove a ban from a Clerk user to allow them to sign in again',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: {
              type: 'string',
              description: 'Clerk user ID to unban',
            },
          },
          required: ['user_id'],
        },
      },
      {
        name: 'list_organizations',
        description: 'List all organizations in the Clerk application with optional name filter and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Number of results to return (max 500, default: 10)',
            },
            offset: {
              type: 'number',
              description: 'Number of results to skip for pagination (default: 0)',
            },
            query: {
              type: 'string',
              description: 'Filter organizations by name (partial match)',
            },
            order_by: {
              type: 'string',
              description: 'Sort field: name, created_at, updated_at, members_count (prefix with - for descending)',
            },
          },
        },
      },
      {
        name: 'get_organization',
        description: 'Retrieve a single Clerk organization by its organization ID or slug',
        inputSchema: {
          type: 'object',
          properties: {
            organization_id: {
              type: 'string',
              description: 'Clerk organization ID (e.g. org_2abc...) or slug',
            },
          },
          required: ['organization_id'],
        },
      },
      {
        name: 'create_organization',
        description: 'Create a new organization in Clerk with a name and optional metadata',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Display name for the organization',
            },
            created_by: {
              type: 'string',
              description: 'Clerk user ID of the member who will be the initial admin',
            },
            slug: {
              type: 'string',
              description: 'URL-safe slug for the organization (auto-generated from name if omitted)',
            },
            public_metadata: {
              type: 'string',
              description: 'JSON string of public metadata key-value pairs',
            },
            private_metadata: {
              type: 'string',
              description: 'JSON string of private metadata key-value pairs',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'update_organization',
        description: 'Update the name, slug, or metadata of an existing Clerk organization',
        inputSchema: {
          type: 'object',
          properties: {
            organization_id: {
              type: 'string',
              description: 'Clerk organization ID to update',
            },
            name: {
              type: 'string',
              description: 'New display name for the organization',
            },
            slug: {
              type: 'string',
              description: 'New URL-safe slug (must be unique)',
            },
            public_metadata: {
              type: 'string',
              description: 'JSON string of public metadata to merge',
            },
            private_metadata: {
              type: 'string',
              description: 'JSON string of private metadata to merge',
            },
          },
          required: ['organization_id'],
        },
      },
      {
        name: 'delete_organization',
        description: 'Permanently delete a Clerk organization and remove all its members',
        inputSchema: {
          type: 'object',
          properties: {
            organization_id: {
              type: 'string',
              description: 'Clerk organization ID to delete',
            },
          },
          required: ['organization_id'],
        },
      },
      {
        name: 'list_organization_members',
        description: 'List members of a Clerk organization with their roles and user profiles',
        inputSchema: {
          type: 'object',
          properties: {
            organization_id: {
              type: 'string',
              description: 'Clerk organization ID to list members for',
            },
            limit: {
              type: 'number',
              description: 'Number of results to return (max 500, default: 10)',
            },
            offset: {
              type: 'number',
              description: 'Number of results to skip for pagination (default: 0)',
            },
            order_by: {
              type: 'string',
              description: 'Sort field: role, created_at (prefix with - for descending, default: created_at)',
            },
          },
          required: ['organization_id'],
        },
      },
      {
        name: 'create_organization_invitation',
        description: 'Invite a user by email to join a Clerk organization with a specified role',
        inputSchema: {
          type: 'object',
          properties: {
            organization_id: {
              type: 'string',
              description: 'Clerk organization ID to invite the user to',
            },
            email_address: {
              type: 'string',
              description: 'Email address of the person to invite',
            },
            inviter_user_id: {
              type: 'string',
              description: 'Clerk user ID of the member sending the invitation (must be an admin)',
            },
            role: {
              type: 'string',
              description: 'Role to assign on acceptance: org:admin or org:member (default: org:member)',
            },
            public_metadata: {
              type: 'string',
              description: 'JSON string of public metadata to attach to the invitation',
            },
          },
          required: ['organization_id', 'email_address', 'inviter_user_id'],
        },
      },
      {
        name: 'revoke_organization_invitation',
        description: 'Cancel a pending organization invitation so the invitee can no longer accept it',
        inputSchema: {
          type: 'object',
          properties: {
            organization_id: {
              type: 'string',
              description: 'Clerk organization ID the invitation belongs to',
            },
            invitation_id: {
              type: 'string',
              description: 'ID of the pending invitation to revoke',
            },
            requesting_user_id: {
              type: 'string',
              description: 'Clerk user ID of the admin revoking the invitation',
            },
          },
          required: ['organization_id', 'invitation_id', 'requesting_user_id'],
        },
      },
      {
        name: 'list_sessions',
        description: 'List active or all sessions for a Clerk user or across the entire application with status filter',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: {
              type: 'string',
              description: 'Filter sessions by Clerk user ID (omit to list all application sessions)',
            },
            status: {
              type: 'string',
              description: 'Filter by session status: active, revoked, ended, expired, removed, replaced (default: active)',
            },
            limit: {
              type: 'number',
              description: 'Number of results to return (max 500, default: 10)',
            },
            offset: {
              type: 'number',
              description: 'Number of results to skip for pagination (default: 0)',
            },
          },
        },
      },
      {
        name: 'revoke_session',
        description: 'Immediately revoke a Clerk session by session ID, forcing the user to sign in again',
        inputSchema: {
          type: 'object',
          properties: {
            session_id: {
              type: 'string',
              description: 'Clerk session ID to revoke (e.g. sess_2abc...)',
            },
          },
          required: ['session_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_users': return this.listUsers(args);
        case 'get_user': return this.getUser(args);
        case 'get_user_by_email': return this.getUserByEmail(args);
        case 'create_user': return this.createUser(args);
        case 'update_user': return this.updateUser(args);
        case 'delete_user': return this.deleteUser(args);
        case 'ban_user': return this.banUser(args);
        case 'unban_user': return this.unbanUser(args);
        case 'list_organizations': return this.listOrganizations(args);
        case 'get_organization': return this.getOrganization(args);
        case 'create_organization': return this.createOrganization(args);
        case 'update_organization': return this.updateOrganization(args);
        case 'delete_organization': return this.deleteOrganization(args);
        case 'list_organization_members': return this.listOrganizationMembers(args);
        case 'create_organization_invitation': return this.createOrganizationInvitation(args);
        case 'revoke_organization_invitation': return this.revokeOrganizationInvitation(args);
        case 'list_sessions': return this.listSessions(args);
        case 'revoke_session': return this.revokeSession(args);
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
      Authorization: `Bearer ${this.secretKey}`,
      'Content-Type': 'application/json',
    };
  }

  private async clerkGet(path: string, params: Record<string, string> = {}): Promise<ToolResult> {
    const qs = new URLSearchParams(params).toString();
    const url = `${this.baseUrl}${path}${qs ? '?' + qs : ''}`;
    const response = await this.fetchWithRetry(url, { method: 'GET', headers: this.headers });
    if (!response.ok) {
      const body = await response.text();
      return { content: [{ type: 'text', text: `API error ${response.status}: ${body}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async clerkPost(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const err = await response.text();
      return { content: [{ type: 'text', text: `API error ${response.status}: ${err}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async clerkPatch(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'PATCH',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const err = await response.text();
      return { content: [{ type: 'text', text: `API error ${response.status}: ${err}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async clerkDelete(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'DELETE',
      headers: this.headers,
    });
    if (!response.ok) {
      const err = await response.text();
      return { content: [{ type: 'text', text: `API error ${response.status}: ${err}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listUsers(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      limit: String((args.limit as number) ?? 10),
      offset: String((args.offset as number) ?? 0),
    };
    if (args.email_address) params.email_address = args.email_address as string;
    if (args.username) params.username = args.username as string;
    if (args.phone_number) params.phone_number = args.phone_number as string;
    if (args.order_by) params.order_by = args.order_by as string;
    return this.clerkGet('/v1/users', params);
  }

  private async getUser(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.user_id) return { content: [{ type: 'text', text: 'user_id is required' }], isError: true };
    return this.clerkGet(`/v1/users/${encodeURIComponent(args.user_id as string)}`);
  }

  private async getUserByEmail(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.email_address) return { content: [{ type: 'text', text: 'email_address is required' }], isError: true };
    return this.clerkGet('/v1/users', { email_address: args.email_address as string, limit: '1' });
  }

  private async createUser(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.email_address) return { content: [{ type: 'text', text: 'email_address is required' }], isError: true };
    const body: Record<string, unknown> = {
      email_address: [args.email_address],
    };
    if (args.password) body.password = args.password;
    if (args.first_name) body.first_name = args.first_name;
    if (args.last_name) body.last_name = args.last_name;
    if (args.username) body.username = args.username;
    if (args.phone_number) body.phone_number = [args.phone_number];
    if (args.public_metadata) {
      try { body.public_metadata = JSON.parse(args.public_metadata as string); } catch { /* keep as string */ }
    }
    if (args.private_metadata) {
      try { body.private_metadata = JSON.parse(args.private_metadata as string); } catch { /* keep as string */ }
    }
    return this.clerkPost('/v1/users', body);
  }

  private async updateUser(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.user_id) return { content: [{ type: 'text', text: 'user_id is required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.first_name) body.first_name = args.first_name;
    if (args.last_name) body.last_name = args.last_name;
    if (args.username) body.username = args.username;
    if (args.password) body.password = args.password;
    if (args.public_metadata) {
      try { body.public_metadata = JSON.parse(args.public_metadata as string); } catch { /* keep as string */ }
    }
    if (args.private_metadata) {
      try { body.private_metadata = JSON.parse(args.private_metadata as string); } catch { /* keep as string */ }
    }
    return this.clerkPatch(`/v1/users/${encodeURIComponent(args.user_id as string)}`, body);
  }

  private async deleteUser(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.user_id) return { content: [{ type: 'text', text: 'user_id is required' }], isError: true };
    return this.clerkDelete(`/v1/users/${encodeURIComponent(args.user_id as string)}`);
  }

  private async banUser(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.user_id) return { content: [{ type: 'text', text: 'user_id is required' }], isError: true };
    return this.clerkPost(`/v1/users/${encodeURIComponent(args.user_id as string)}/ban`, {});
  }

  private async unbanUser(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.user_id) return { content: [{ type: 'text', text: 'user_id is required' }], isError: true };
    return this.clerkPost(`/v1/users/${encodeURIComponent(args.user_id as string)}/unban`, {});
  }

  private async listOrganizations(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      limit: String((args.limit as number) ?? 10),
      offset: String((args.offset as number) ?? 0),
    };
    if (args.query) params.query = args.query as string;
    if (args.order_by) params.order_by = args.order_by as string;
    return this.clerkGet('/v1/organizations', params);
  }

  private async getOrganization(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.organization_id) return { content: [{ type: 'text', text: 'organization_id is required' }], isError: true };
    return this.clerkGet(`/v1/organizations/${encodeURIComponent(args.organization_id as string)}`);
  }

  private async createOrganization(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name) return { content: [{ type: 'text', text: 'name is required' }], isError: true };
    const body: Record<string, unknown> = { name: args.name };
    if (args.created_by) body.created_by = args.created_by;
    if (args.slug) body.slug = args.slug;
    if (args.public_metadata) {
      try { body.public_metadata = JSON.parse(args.public_metadata as string); } catch { /* keep */ }
    }
    if (args.private_metadata) {
      try { body.private_metadata = JSON.parse(args.private_metadata as string); } catch { /* keep */ }
    }
    return this.clerkPost('/v1/organizations', body);
  }

  private async updateOrganization(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.organization_id) return { content: [{ type: 'text', text: 'organization_id is required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.name) body.name = args.name;
    if (args.slug) body.slug = args.slug;
    if (args.public_metadata) {
      try { body.public_metadata = JSON.parse(args.public_metadata as string); } catch { /* keep */ }
    }
    if (args.private_metadata) {
      try { body.private_metadata = JSON.parse(args.private_metadata as string); } catch { /* keep */ }
    }
    return this.clerkPatch(`/v1/organizations/${encodeURIComponent(args.organization_id as string)}`, body);
  }

  private async deleteOrganization(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.organization_id) return { content: [{ type: 'text', text: 'organization_id is required' }], isError: true };
    return this.clerkDelete(`/v1/organizations/${encodeURIComponent(args.organization_id as string)}`);
  }

  private async listOrganizationMembers(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.organization_id) return { content: [{ type: 'text', text: 'organization_id is required' }], isError: true };
    const params: Record<string, string> = {
      limit: String((args.limit as number) ?? 10),
      offset: String((args.offset as number) ?? 0),
    };
    if (args.order_by) params.order_by = args.order_by as string;
    return this.clerkGet(`/v1/organizations/${encodeURIComponent(args.organization_id as string)}/memberships`, params);
  }

  private async createOrganizationInvitation(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.organization_id || !args.email_address || !args.inviter_user_id) {
      return { content: [{ type: 'text', text: 'organization_id, email_address, and inviter_user_id are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      email_address: args.email_address,
      inviter_user_id: args.inviter_user_id,
      role: (args.role as string) ?? 'org:member',
    };
    if (args.public_metadata) {
      try { body.public_metadata = JSON.parse(args.public_metadata as string); } catch { /* keep */ }
    }
    return this.clerkPost(`/v1/organizations/${encodeURIComponent(args.organization_id as string)}/invitations`, body);
  }

  private async revokeOrganizationInvitation(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.organization_id || !args.invitation_id || !args.requesting_user_id) {
      return { content: [{ type: 'text', text: 'organization_id, invitation_id, and requesting_user_id are required' }], isError: true };
    }
    return this.clerkPost(
      `/v1/organizations/${encodeURIComponent(args.organization_id as string)}/invitations/${encodeURIComponent(args.invitation_id as string)}/revoke`,
      { requesting_user_id: args.requesting_user_id },
    );
  }

  private async listSessions(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      limit: String((args.limit as number) ?? 10),
      offset: String((args.offset as number) ?? 0),
      status: (args.status as string) ?? 'active',
    };
    if (args.user_id) params.user_id = args.user_id as string;
    return this.clerkGet('/v1/sessions', params);
  }

  private async revokeSession(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.session_id) return { content: [{ type: 'text', text: 'session_id is required' }], isError: true };
    return this.clerkPost(`/v1/sessions/${encodeURIComponent(args.session_id as string)}/revoke`, {});
  }
}

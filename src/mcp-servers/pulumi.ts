/**
 * Pulumi MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://www.npmjs.com/package/@pulumi/mcp-server (npm: @pulumi/mcp-server v0.2.0)
//   Also hosted at mcp.ai.pulumi.com. Transport: stdio (local) + streamable-HTTP (hosted).
//   Auth: OAuth2 (hosted) or PULUMI_ACCESS_TOKEN env var (local).
//   Vendor MCP exposes 8 tools: get-stacks, resource-search, get-policy-violations, get-users,
//   neo-bridge, neo-get-tasks, neo-continue-task, neo-reset-conversation.
//   Fails criteria: only 8 tools (threshold is 10+). Decision: use-rest-api.
// Our adapter covers: 16 tools (Pulumi Cloud REST API — stacks, deployments, webhooks,
//   audit logs, org management). Vendor MCP covers: 8 tools (IaC execution + simple queries).
// Recommendation: use-rest-api. Vendor MCP has fewer tools than our adapter and focuses on
//   Neo IaC execution (not REST stack/deployment management). Use this adapter for direct API
//   token access, programmatic stack management, self-hosted Pulumi Cloud, or air-gapped environments.
//
// Base URL: https://api.pulumi.com
// Auth: Authorization: token {accessToken}  (NOT "Bearer")
// Docs: https://www.pulumi.com/docs/reference/cloud-rest-api/
// Rate limits: Not publicly documented; standard API throttling applies

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface PulumiConfig {
  /**
   * Pulumi Cloud access token. Generate at app.pulumi.com > Settings > Access Tokens.
   * Header format is "token {value}" — NOT "Bearer {value}".
   */
  accessToken: string;
  /**
   * Base URL for the Pulumi Cloud REST API.
   * Defaults to https://api.pulumi.com for managed Pulumi Cloud.
   * For self-hosted Pulumi Cloud, provide your configured API endpoint.
   */
  baseUrl?: string;
}

export class PulumiMCPServer extends MCPAdapterBase {
  private readonly accessToken: string;
  private readonly baseUrl: string;

  constructor(config: PulumiConfig) {
    super();
    this.accessToken = config.accessToken;
    this.baseUrl = (config.baseUrl ?? 'https://api.pulumi.com').replace(/\/$/, '');
  }

  static catalog() {
    return {
      name: 'pulumi',
      displayName: 'Pulumi',
      version: '1.0.0',
      category: 'devops' as const,
      keywords: [
        'pulumi', 'iac', 'infrastructure', 'stack', 'deploy', 'cloud',
        'preview', 'update', 'destroy', 'refresh', 'webhook', 'audit',
        'organization', 'team', 'environment', 'esc', 'deployment',
      ],
      toolNames: [
        'list_stacks',
        'get_stack',
        'create_stack',
        'delete_stack',
        'list_stack_updates',
        'get_stack_state',
        'get_stack_config',
        'list_deployments',
        'get_deployment',
        'list_org_webhooks',
        'create_org_webhook',
        'list_stack_webhooks',
        'create_stack_webhook',
        'list_audit_logs',
        'get_current_user',
        'list_organization_members',
      ],
      description:
        'Pulumi Cloud: manage stacks, inspect deployment history and state, configure webhooks, retrieve audit logs, and query organization membership. Direct API token access — no OAuth required.',
      author: 'protectnil' as const,
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_stacks',
        description:
          'List Pulumi Cloud stacks accessible to the authenticated token, with optional filters by organization, project, or tag.',
        inputSchema: {
          type: 'object',
          properties: {
            organization: {
              type: 'string',
              description: 'Filter stacks by organization name.',
            },
            project: {
              type: 'string',
              description: 'Filter stacks by project name.',
            },
            tagName: {
              type: 'string',
              description: 'Filter by a stack tag name.',
            },
            tagValue: {
              type: 'string',
              description: 'Filter by a stack tag value (requires tagName).',
            },
            continuationToken: {
              type: 'string',
              description: 'Pagination continuation token from a previous response.',
            },
          },
        },
      },
      {
        name: 'get_stack',
        description: 'Get metadata and details for a specific Pulumi stack.',
        inputSchema: {
          type: 'object',
          properties: {
            organization: { type: 'string', description: 'Organization name that owns the stack.' },
            project: { type: 'string', description: 'Project name.' },
            stack: { type: 'string', description: 'Stack name.' },
          },
          required: ['organization', 'project', 'stack'],
        },
      },
      {
        name: 'create_stack',
        description: 'Create a new Pulumi Cloud stack in an existing project.',
        inputSchema: {
          type: 'object',
          properties: {
            organization: { type: 'string', description: 'Organization name.' },
            project: { type: 'string', description: 'Project name.' },
            stackName: { type: 'string', description: 'New stack name (e.g. dev, staging, prod).' },
          },
          required: ['organization', 'project', 'stackName'],
        },
      },
      {
        name: 'delete_stack',
        description:
          'Delete a Pulumi Cloud stack. The stack must have no resources unless force is true.',
        inputSchema: {
          type: 'object',
          properties: {
            organization: { type: 'string', description: 'Organization name.' },
            project: { type: 'string', description: 'Project name.' },
            stack: { type: 'string', description: 'Stack name to delete.' },
            force: {
              type: 'boolean',
              description: 'If true, delete even if the stack has existing resources (default: false).',
            },
          },
          required: ['organization', 'project', 'stack'],
        },
      },
      {
        name: 'list_stack_updates',
        description:
          'List update history for a Pulumi stack including deployments, previews, destroys, and refreshes with timestamps and outcomes.',
        inputSchema: {
          type: 'object',
          properties: {
            organization: { type: 'string', description: 'Organization name.' },
            project: { type: 'string', description: 'Project name.' },
            stack: { type: 'string', description: 'Stack name.' },
            page: { type: 'number', description: 'Page number (default: 1).' },
            pageSize: { type: 'number', description: 'Updates per page (default: 10).' },
          },
          required: ['organization', 'project', 'stack'],
        },
      },
      {
        name: 'get_stack_state',
        description:
          'Export the full current state checkpoint for a Pulumi stack, including all resource URNs, properties, inputs, outputs, and dependencies.',
        inputSchema: {
          type: 'object',
          properties: {
            organization: { type: 'string', description: 'Organization name.' },
            project: { type: 'string', description: 'Project name.' },
            stack: { type: 'string', description: 'Stack name.' },
          },
          required: ['organization', 'project', 'stack'],
        },
      },
      {
        name: 'get_stack_config',
        description:
          'Retrieve the non-secret configuration key-value pairs for a Pulumi stack.',
        inputSchema: {
          type: 'object',
          properties: {
            organization: { type: 'string', description: 'Organization name.' },
            project: { type: 'string', description: 'Project name.' },
            stack: { type: 'string', description: 'Stack name.' },
          },
          required: ['organization', 'project', 'stack'],
        },
      },
      {
        name: 'list_deployments',
        description:
          'List Pulumi Deployments (managed remote execution) for an organization, with optional pagination.',
        inputSchema: {
          type: 'object',
          properties: {
            organization: { type: 'string', description: 'Organization name.' },
            continuationToken: {
              type: 'string',
              description: 'Pagination continuation token from a previous response.',
            },
          },
          required: ['organization'],
        },
      },
      {
        name: 'get_deployment',
        description:
          'Get details and status of a specific Pulumi Deployment by its ID.',
        inputSchema: {
          type: 'object',
          properties: {
            organization: { type: 'string', description: 'Organization name.' },
            project: { type: 'string', description: 'Project name.' },
            stack: { type: 'string', description: 'Stack name.' },
            deploymentID: { type: 'string', description: 'Deployment UUID.' },
          },
          required: ['organization', 'project', 'stack', 'deploymentID'],
        },
      },
      {
        name: 'list_org_webhooks',
        description:
          'List all webhooks configured for a Pulumi Cloud organization.',
        inputSchema: {
          type: 'object',
          properties: {
            organization: { type: 'string', description: 'Organization name.' },
          },
          required: ['organization'],
        },
      },
      {
        name: 'create_org_webhook',
        description:
          'Create a new webhook for a Pulumi Cloud organization to receive event notifications (stack updates, deployments, policy violations).',
        inputSchema: {
          type: 'object',
          properties: {
            organization: { type: 'string', description: 'Organization name.' },
            displayName: { type: 'string', description: 'Human-readable webhook name.' },
            payloadUrl: { type: 'string', description: 'HTTPS URL to receive webhook POST requests.' },
            secret: { type: 'string', description: 'Optional HMAC secret for verifying webhook payloads.' },
            active: { type: 'boolean', description: 'Whether the webhook is active (default: true).' },
            filters: {
              type: 'array',
              items: { type: 'string' },
              description:
                'Event filter list (e.g. ["stack_update", "deployment_status_changed"]). Omit for all events.',
            },
          },
          required: ['organization', 'displayName', 'payloadUrl'],
        },
      },
      {
        name: 'list_stack_webhooks',
        description:
          'List all webhooks configured for a specific Pulumi stack.',
        inputSchema: {
          type: 'object',
          properties: {
            organization: { type: 'string', description: 'Organization name.' },
            project: { type: 'string', description: 'Project name.' },
            stack: { type: 'string', description: 'Stack name.' },
          },
          required: ['organization', 'project', 'stack'],
        },
      },
      {
        name: 'create_stack_webhook',
        description:
          'Create a new webhook for a specific Pulumi stack to receive stack-level event notifications.',
        inputSchema: {
          type: 'object',
          properties: {
            organization: { type: 'string', description: 'Organization name.' },
            project: { type: 'string', description: 'Project name.' },
            stack: { type: 'string', description: 'Stack name.' },
            displayName: { type: 'string', description: 'Human-readable webhook name.' },
            payloadUrl: { type: 'string', description: 'HTTPS URL to receive webhook POST requests.' },
            secret: { type: 'string', description: 'Optional HMAC secret for verifying webhook payloads.' },
            active: { type: 'boolean', description: 'Whether the webhook is active (default: true).' },
            filters: {
              type: 'array',
              items: { type: 'string' },
              description: 'Event filter list. Omit to receive all stack events.',
            },
          },
          required: ['organization', 'project', 'stack', 'displayName', 'payloadUrl'],
        },
      },
      {
        name: 'list_audit_logs',
        description:
          'Retrieve audit log events for a Pulumi Cloud organization, showing who performed what actions and when.',
        inputSchema: {
          type: 'object',
          properties: {
            organization: { type: 'string', description: 'Organization name.' },
            startTime: {
              type: 'number',
              description:
                'Unix epoch timestamp (seconds). Returns events before this time for backward pagination.',
            },
            userFilter: {
              type: 'string',
              description: 'Filter events by a specific username.',
            },
          },
          required: ['organization'],
        },
      },
      {
        name: 'get_current_user',
        description:
          'Get information about the currently authenticated user, including their username and associated organizations.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'list_organization_members',
        description:
          'List members of a Pulumi Cloud organization with their roles and join dates.',
        inputSchema: {
          type: 'object',
          properties: {
            organization: { type: 'string', description: 'Organization name.' },
          },
          required: ['organization'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_stacks':
          return await this.listStacks(args);
        case 'get_stack':
          return await this.getStack(args);
        case 'create_stack':
          return await this.createStack(args);
        case 'delete_stack':
          return await this.deleteStack(args);
        case 'list_stack_updates':
          return await this.listStackUpdates(args);
        case 'get_stack_state':
          return await this.getStackState(args);
        case 'get_stack_config':
          return await this.getStackConfig(args);
        case 'list_deployments':
          return await this.listDeployments(args);
        case 'get_deployment':
          return await this.getDeployment(args);
        case 'list_org_webhooks':
          return await this.listOrgWebhooks(args);
        case 'create_org_webhook':
          return await this.createOrgWebhook(args);
        case 'list_stack_webhooks':
          return await this.listStackWebhooks(args);
        case 'create_stack_webhook':
          return await this.createStackWebhook(args);
        case 'list_audit_logs':
          return await this.listAuditLogs(args);
        case 'get_current_user':
          return await this.getCurrentUser();
        case 'list_organization_members':
          return await this.listOrganizationMembers(args);
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

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private buildHeaders(): Record<string, string> {
    return {
      // Pulumi requires "token {value}", not "Bearer {value}"
      'Authorization': `token ${this.accessToken}`,
      'Content-Type': 'application/json',
      'Accept': 'application/vnd.pulumi+8',
    };
  }

  private async apiFetch(path: string, init?: RequestInit): Promise<Response> {
    return fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: { ...this.buildHeaders(), ...(init?.headers as Record<string, string> | undefined) },
    });
  }

  private async jsonResult(response: Response, label: string): Promise<ToolResult> {
    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `${label}: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }
    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new Error(`${label}: non-JSON response (HTTP ${response.status})`);
    }
    return this.truncatedResult(data);
  }

  private truncatedResult(data: unknown): ToolResult {
    const text = JSON.stringify(data, null, 2);
    const truncated = text.length > 10_000
      ? text.slice(0, 10_000) + `\n... [truncated, ${text.length} total chars]`
      : text;
    return { content: [{ type: 'text', text: truncated }], isError: false };
  }

  private stackPath(org: string, proj: string, stack: string): string {
    return `/api/stacks/${encodeURIComponent(org)}/${encodeURIComponent(proj)}/${encodeURIComponent(stack)}`;
  }

  private async listStacks(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.organization) params.set('organization', args.organization as string);
    if (args.project) params.set('project', args.project as string);
    if (args.tagName) params.set('tagName', args.tagName as string);
    if (args.tagValue) params.set('tagValue', args.tagValue as string);
    if (args.continuationToken) params.set('continuationToken', args.continuationToken as string);
    const qs = params.toString();
    const response = await this.apiFetch(`/api/user/stacks${qs ? `?${qs}` : ''}`);
    return this.jsonResult(response, 'list_stacks');
  }

  private async getStack(args: Record<string, unknown>): Promise<ToolResult> {
    const org = args.organization as string;
    const proj = args.project as string;
    const stack = args.stack as string;
    const response = await this.apiFetch(this.stackPath(org, proj, stack));
    return this.jsonResult(response, 'get_stack');
  }

  private async createStack(args: Record<string, unknown>): Promise<ToolResult> {
    const org = args.organization as string;
    const proj = args.project as string;
    const stackName = args.stackName as string;
    const response = await this.apiFetch(
      `/api/stacks/${encodeURIComponent(org)}/${encodeURIComponent(proj)}`,
      { method: 'POST', body: JSON.stringify({ stackName }) },
    );
    return this.jsonResult(response, 'create_stack');
  }

  private async deleteStack(args: Record<string, unknown>): Promise<ToolResult> {
    const org = args.organization as string;
    const proj = args.project as string;
    const stack = args.stack as string;
    const params = new URLSearchParams();
    if (args.force) params.set('force', 'true');
    const qs = params.toString();
    const response = await this.apiFetch(
      `${this.stackPath(org, proj, stack)}${qs ? `?${qs}` : ''}`,
      { method: 'DELETE' },
    );
    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `delete_stack: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }
    return { content: [{ type: 'text', text: `Stack ${org}/${proj}/${stack} deleted.` }], isError: false };
  }

  private async listStackUpdates(args: Record<string, unknown>): Promise<ToolResult> {
    const org = args.organization as string;
    const proj = args.project as string;
    const stack = args.stack as string;
    const params = new URLSearchParams();
    if (args.page !== undefined) params.set('page', String(args.page));
    if (args.pageSize !== undefined) params.set('pageSize', String(args.pageSize));
    const qs = params.toString();
    const response = await this.apiFetch(
      `${this.stackPath(org, proj, stack)}/updates${qs ? `?${qs}` : ''}`,
    );
    return this.jsonResult(response, 'list_stack_updates');
  }

  private async getStackState(args: Record<string, unknown>): Promise<ToolResult> {
    const org = args.organization as string;
    const proj = args.project as string;
    const stack = args.stack as string;
    const response = await this.apiFetch(`${this.stackPath(org, proj, stack)}/export`);
    return this.jsonResult(response, 'get_stack_state');
  }

  private async getStackConfig(args: Record<string, unknown>): Promise<ToolResult> {
    const org = args.organization as string;
    const proj = args.project as string;
    const stack = args.stack as string;
    const response = await this.apiFetch(`${this.stackPath(org, proj, stack)}/config`);
    return this.jsonResult(response, 'get_stack_config');
  }

  private async listDeployments(args: Record<string, unknown>): Promise<ToolResult> {
    const org = args.organization as string;
    const params = new URLSearchParams();
    if (args.continuationToken) params.set('continuationToken', args.continuationToken as string);
    const qs = params.toString();
    const response = await this.apiFetch(
      `/api/orgs/${encodeURIComponent(org)}/deployments${qs ? `?${qs}` : ''}`,
    );
    return this.jsonResult(response, 'list_deployments');
  }

  private async getDeployment(args: Record<string, unknown>): Promise<ToolResult> {
    const org = args.organization as string;
    const proj = args.project as string;
    const stack = args.stack as string;
    const id = args.deploymentID as string;
    const response = await this.apiFetch(
      `${this.stackPath(org, proj, stack)}/deployments/${encodeURIComponent(id)}`,
    );
    return this.jsonResult(response, 'get_deployment');
  }

  private async listOrgWebhooks(args: Record<string, unknown>): Promise<ToolResult> {
    const org = args.organization as string;
    const response = await this.apiFetch(`/api/orgs/${encodeURIComponent(org)}/hooks`);
    return this.jsonResult(response, 'list_org_webhooks');
  }

  private async createOrgWebhook(args: Record<string, unknown>): Promise<ToolResult> {
    const org = args.organization as string;
    const body: Record<string, unknown> = {
      displayName: args.displayName,
      payloadUrl: args.payloadUrl,
      active: args.active ?? true,
    };
    if (args.secret) body.secret = args.secret;
    if (args.filters) body.filters = args.filters;
    const response = await this.apiFetch(
      `/api/orgs/${encodeURIComponent(org)}/hooks`,
      { method: 'POST', body: JSON.stringify(body) },
    );
    return this.jsonResult(response, 'create_org_webhook');
  }

  private async listStackWebhooks(args: Record<string, unknown>): Promise<ToolResult> {
    const org = args.organization as string;
    const proj = args.project as string;
    const stack = args.stack as string;
    const response = await this.apiFetch(`${this.stackPath(org, proj, stack)}/hooks`);
    return this.jsonResult(response, 'list_stack_webhooks');
  }

  private async createStackWebhook(args: Record<string, unknown>): Promise<ToolResult> {
    const org = args.organization as string;
    const proj = args.project as string;
    const stack = args.stack as string;
    const body: Record<string, unknown> = {
      displayName: args.displayName,
      payloadUrl: args.payloadUrl,
      active: args.active ?? true,
    };
    if (args.secret) body.secret = args.secret;
    if (args.filters) body.filters = args.filters;
    const response = await this.apiFetch(
      `${this.stackPath(org, proj, stack)}/hooks`,
      { method: 'POST', body: JSON.stringify(body) },
    );
    return this.jsonResult(response, 'create_stack_webhook');
  }

  private async listAuditLogs(args: Record<string, unknown>): Promise<ToolResult> {
    const org = args.organization as string;
    const params = new URLSearchParams();
    if (args.startTime !== undefined) params.set('startTime', String(args.startTime));
    if (args.userFilter) params.set('userFilter', args.userFilter as string);
    const qs = params.toString();
    const response = await this.apiFetch(
      `/api/orgs/${encodeURIComponent(org)}/auditlogs${qs ? `?${qs}` : ''}`,
    );
    return this.jsonResult(response, 'list_audit_logs');
  }

  private async getCurrentUser(): Promise<ToolResult> {
    const response = await this.apiFetch('/api/user');
    return this.jsonResult(response, 'get_current_user');
  }

  private async listOrganizationMembers(args: Record<string, unknown>): Promise<ToolResult> {
    const org = args.organization as string;
    const response = await this.apiFetch(`/api/orgs/${encodeURIComponent(org)}/members`);
    return this.jsonResult(response, 'list_organization_members');
  }
}

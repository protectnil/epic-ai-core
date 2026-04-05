/**
 * BlazeMeter MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// BlazeMeter REST API v4 for managing load tests, test masters, projects,
// sessions, and user/account resources.
//
// Base URL: https://a.blazemeter.com/api/v4
// Auth: API key via query param `api_key` (obtain from BlazeMeter account settings)
// Docs: https://guide.blazemeter.com/hc/en-us/articles/206732689
// Spec: https://api.apis.guru/v2/specs/blazemeter.com/4/swagger.json

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface BlazeMeterConfig {
  /**
   * BlazeMeter API key. Obtain from Account > API Keys in the BlazeMeter UI.
   */
  apiKey: string;
  /**
   * Override the API base URL. Defaults to https://a.blazemeter.com/api/v4
   */
  baseUrl?: string;
}

export class BlazeMeterMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: BlazeMeterConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://a.blazemeter.com/api/v4';
  }

  private buildUrl(path: string, extraParams: Record<string, string> = {}): string {
    const params = new URLSearchParams({ api_key: this.apiKey, ...extraParams });
    return `${this.baseUrl}${path}?${params.toString()}`;
  }

  private get jsonHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      // --- Tests ---
      {
        name: 'list_tests',
        description: 'List all private load tests accessible to the authenticated user.',
        inputSchema: {
          type: 'object',
          properties: {
            projectId: { type: 'number', description: 'Filter tests by project ID' },
            limit: { type: 'number', description: 'Maximum number of tests to return' },
            skip: { type: 'number', description: 'Number of tests to skip for pagination' },
          },
        },
      },
      // --- Masters ---
      {
        name: 'list_masters',
        description: 'List user private master test runs (parent-level test execution records).',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Maximum number of masters to return' },
            skip: { type: 'number', description: 'Number of masters to skip for pagination' },
          },
        },
      },
      // --- Collections (multi-tests) ---
      {
        name: 'list_collections',
        description: 'List all organization multi-test collections accessible to the user.',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Maximum number of collections to return' },
            skip: { type: 'number', description: 'Number of collections to skip for pagination' },
          },
        },
      },
      // --- Projects ---
      {
        name: 'list_projects',
        description: 'List all projects accessible to the authenticated BlazeMeter user.',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Maximum number of projects to return' },
            skip: { type: 'number', description: 'Number of projects to skip for pagination' },
          },
        },
      },
      // --- Locations ---
      {
        name: 'list_locations',
        description: 'Get the list of available load generator locations for the authenticated user.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      // --- Sessions ---
      {
        name: 'list_active_sessions',
        description: 'List currently active (running) test sessions for the authenticated user.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'terminate_active_sessions',
        description: 'Terminate all currently active test sessions for the authenticated user.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      // --- Invites ---
      {
        name: 'list_invites',
        description: 'List pending invites for the authenticated BlazeMeter user.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      // --- Top ---
      {
        name: 'get_top',
        description: 'Get top-level summary statistics and leaderboard data for the authenticated user.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      // --- User / Account ---
      {
        name: 'register_user',
        description: 'Register a new BlazeMeter user account.',
        inputSchema: {
          type: 'object',
          properties: {
            firstName: { type: 'string', description: 'First name of the new user' },
            lastName: { type: 'string', description: 'Last name of the new user' },
            email: { type: 'string', description: 'Email address for the new account' },
            password: { type: 'string', description: 'Password for the new account' },
          },
          required: ['firstName', 'lastName', 'email', 'password'],
        },
      },
      {
        name: 'update_password',
        description: 'Update the current user name or password on the BlazeMeter account.',
        inputSchema: {
          type: 'object',
          properties: {
            currentPassword: { type: 'string', description: 'Current account password for verification' },
            newPassword: { type: 'string', description: 'New password to set' },
            firstName: { type: 'string', description: 'Updated first name' },
            lastName: { type: 'string', description: 'Updated last name' },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_tests': return await this.listTests(args);
        case 'list_masters': return await this.listMasters(args);
        case 'list_collections': return await this.listCollections(args);
        case 'list_projects': return await this.listProjects(args);
        case 'list_locations': return await this.listLocations();
        case 'list_active_sessions': return await this.listActiveSessions();
        case 'terminate_active_sessions': return await this.terminateActiveSessions();
        case 'list_invites': return await this.listInvites();
        case 'get_top': return await this.getTop();
        case 'register_user': return await this.registerUser(args);
        case 'update_password': return await this.updatePassword(args);
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

  private async apiGet(path: string, params: Record<string, string> = {}): Promise<ToolResult> {
    const response = await this.fetchWithRetry(this.buildUrl(path, params), {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apiPost(path: string, body?: unknown): Promise<ToolResult> {
    const response = await this.fetchWithRetry(this.buildUrl(path), {
      method: 'POST',
      headers: this.jsonHeaders,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    if (response.status === 204) {
      return { content: [{ type: 'text', text: JSON.stringify({ success: true }) }], isError: false };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apiPatch(path: string, body: unknown): Promise<ToolResult> {
    const response = await this.fetchWithRetry(this.buildUrl(path), {
      method: 'PATCH',
      headers: this.jsonHeaders,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  // --- Tool implementations ---

  private async listTests(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (args.projectId !== undefined) params['projectId'] = String(args.projectId);
    if (args.limit !== undefined) params['limit'] = String(args.limit);
    if (args.skip !== undefined) params['skip'] = String(args.skip);
    return this.apiGet('/user/tests', params);
  }

  private async listMasters(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (args.limit !== undefined) params['limit'] = String(args.limit);
    if (args.skip !== undefined) params['skip'] = String(args.skip);
    return this.apiGet('/user/masters', params);
  }

  private async listCollections(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (args.limit !== undefined) params['limit'] = String(args.limit);
    if (args.skip !== undefined) params['skip'] = String(args.skip);
    return this.apiGet('/user/collections', params);
  }

  private async listProjects(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (args.limit !== undefined) params['limit'] = String(args.limit);
    if (args.skip !== undefined) params['skip'] = String(args.skip);
    return this.apiGet('/user/projects', params);
  }

  private async listLocations(): Promise<ToolResult> {
    return this.apiGet('/user/locations');
  }

  private async listActiveSessions(): Promise<ToolResult> {
    return this.apiGet('/user/active/sessions');
  }

  private async terminateActiveSessions(): Promise<ToolResult> {
    return this.apiPost('/user/active/terminate');
  }

  private async listInvites(): Promise<ToolResult> {
    return this.apiGet('/user/invites');
  }

  private async getTop(): Promise<ToolResult> {
    return this.apiGet('/user/top');
  }

  private async registerUser(args: Record<string, unknown>): Promise<ToolResult> {
    const { firstName, lastName, email, password } = args;
    if (!firstName || !lastName || !email || !password) {
      return { content: [{ type: 'text', text: 'firstName, lastName, email, and password are required' }], isError: true };
    }
    return this.apiPost('/user/register', { firstName, lastName, email, password });
  }

  private async updatePassword(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {};
    if (args.currentPassword) body.currentPassword = args.currentPassword;
    if (args.newPassword) body.newPassword = args.newPassword;
    if (args.firstName) body.firstName = args.firstName;
    if (args.lastName) body.lastName = args.lastName;
    return this.apiPatch('/user/password', body);
  }

  static catalog() {
    return {
      name: 'blazemeter',
      displayName: 'BlazeMeter',
      version: '1.0.0',
      category: 'devops' as const,
      keywords: ['blazemeter', 'load-testing', 'performance', 'devops'],
      toolNames: [
        'list_tests', 'list_masters', 'list_collections', 'list_projects',
        'list_locations', 'list_active_sessions', 'terminate_active_sessions',
        'list_invites', 'get_top', 'register_user', 'update_password',
      ],
      description: 'BlazeMeter adapter for the Epic AI Intelligence Platform',
      author: 'protectnil' as const,
    };
  }
}

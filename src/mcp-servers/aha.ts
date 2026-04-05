/**
 * Aha! MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/aha-develop/aha-mcp — transport: stdio, auth: API key
//   Actively maintained. Exposes ~4 tools (get feature, get page, search documents, create feature).
//   Our adapter covers 20+ tools (full Aha! REST API v1 surface).
//   Recommendation: Use vendor MCP for basic feature lookups in coding agents. Use this adapter for
//   full product management operations (releases, ideas, goals, epics, requirements, users).
//
// Base URL: https://{subdomain}.aha.io/api/v1 (subdomain is your Aha! account name)
// Auth: Authorization: Bearer {apiKey}
//   API key: Settings → Personal → Developer → API keys
// Docs: https://www.aha.io/api
// Rate limits: ~10 req/s; pagination is 1-indexed (page 1 = first page)

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface AhaConfig {
  apiKey: string;
  subdomain: string;
  baseUrl?: string;
}

export class AhaMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: AhaConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || `https://${config.subdomain}.aha.io/api/v1`;
  }

  get tools(): ToolDefinition[] {
    return [
      // Products
      {
        name: 'list_products',
        description: 'List all products (workspaces) in the Aha! account with pagination.',
        inputSchema: {
          type: 'object',
          properties: {
            page: { type: 'number', description: 'Page number for pagination (default: 1)' },
            per_page: { type: 'number', description: 'Results per page (default: 30, max: 200)' },
          },
        },
      },
      {
        name: 'get_product',
        description: 'Get details for a specific Aha! product by ID or reference prefix.',
        inputSchema: {
          type: 'object',
          properties: {
            product_id: { type: 'string', description: 'Product ID or reference prefix (e.g., "PRJ1")' },
          },
          required: ['product_id'],
        },
      },
      // Features
      {
        name: 'list_features',
        description: 'List features for a product or release with optional pagination. Returns name, status, assignee, and score.',
        inputSchema: {
          type: 'object',
          properties: {
            product_id: { type: 'string', description: 'Product ID or reference prefix to list features for' },
            release_id: { type: 'string', description: 'Release reference (e.g., "PRJ1-R-1") to filter features by release' },
            page: { type: 'number', description: 'Page number for pagination (default: 1)' },
            per_page: { type: 'number', description: 'Results per page (default: 30, max: 200)' },
          },
          required: ['product_id'],
        },
      },
      {
        name: 'get_feature',
        description: 'Get a single Aha! feature by reference number (e.g., "PRJ1-1"), including description, status, and requirements.',
        inputSchema: {
          type: 'object',
          properties: {
            feature_id: { type: 'string', description: 'Feature reference number (e.g., "PRJ1-1") or numeric ID' },
          },
          required: ['feature_id'],
        },
      },
      {
        name: 'create_feature',
        description: 'Create a new feature in an Aha! release with name, description, and optional workflow status.',
        inputSchema: {
          type: 'object',
          properties: {
            release_id: { type: 'string', description: 'Release reference (e.g., "PRJ1-R-1") to create the feature in' },
            name: { type: 'string', description: 'Name of the feature' },
            description: { type: 'string', description: 'Description of the feature (plain text or HTML)' },
            workflow_status: { type: 'string', description: 'Workflow status name (e.g., "Under consideration")' },
            assigned_to_user: { type: 'string', description: 'Email address of the user to assign the feature to' },
          },
          required: ['release_id', 'name'],
        },
      },
      {
        name: 'update_feature',
        description: 'Update an existing Aha! feature by reference number, changing name, description, status, or assignee.',
        inputSchema: {
          type: 'object',
          properties: {
            feature_id: { type: 'string', description: 'Feature reference number (e.g., "PRJ1-1") or numeric ID' },
            name: { type: 'string', description: 'Updated name of the feature' },
            description: { type: 'string', description: 'Updated description' },
            workflow_status: { type: 'string', description: 'Updated workflow status name' },
            assigned_to_user: { type: 'string', description: 'Email address of user to assign the feature to' },
          },
          required: ['feature_id'],
        },
      },
      // Epics (master_features)
      {
        name: 'list_epics',
        description: 'List epics (master features) for a product with pagination.',
        inputSchema: {
          type: 'object',
          properties: {
            product_id: { type: 'string', description: 'Product ID or reference prefix to list epics for' },
            page: { type: 'number', description: 'Page number for pagination (default: 1)' },
            per_page: { type: 'number', description: 'Results per page (default: 30, max: 200)' },
          },
          required: ['product_id'],
        },
      },
      {
        name: 'get_epic',
        description: 'Get a single Aha! epic by reference number, including all child features.',
        inputSchema: {
          type: 'object',
          properties: {
            epic_id: { type: 'string', description: 'Epic reference number (e.g., "PRJ1-E-1") or numeric ID' },
          },
          required: ['epic_id'],
        },
      },
      // Releases
      {
        name: 'list_releases',
        description: 'List releases for an Aha! product with pagination.',
        inputSchema: {
          type: 'object',
          properties: {
            product_id: { type: 'string', description: 'Product ID or reference prefix to list releases for' },
            page: { type: 'number', description: 'Page number for pagination (default: 1)' },
            per_page: { type: 'number', description: 'Results per page (default: 30, max: 200)' },
          },
          required: ['product_id'],
        },
      },
      {
        name: 'get_release',
        description: 'Get details for a specific Aha! release by reference, including name, dates, and feature count.',
        inputSchema: {
          type: 'object',
          properties: {
            release_id: { type: 'string', description: 'Release reference (e.g., "PRJ1-R-1") or numeric ID' },
          },
          required: ['release_id'],
        },
      },
      // Ideas
      {
        name: 'list_ideas',
        description: 'List ideas collected from customers and stakeholders for a product with pagination.',
        inputSchema: {
          type: 'object',
          properties: {
            product_id: { type: 'string', description: 'Product ID or reference prefix to list ideas for' },
            page: { type: 'number', description: 'Page number for pagination (default: 1)' },
            per_page: { type: 'number', description: 'Results per page (default: 30, max: 200)' },
          },
          required: ['product_id'],
        },
      },
      {
        name: 'get_idea',
        description: 'Get a single Aha! idea by reference number, including vote count, status, and linked features.',
        inputSchema: {
          type: 'object',
          properties: {
            idea_id: { type: 'string', description: 'Idea reference number (e.g., "PRJ1-I-1") or numeric ID' },
          },
          required: ['idea_id'],
        },
      },
      {
        name: 'create_idea',
        description: 'Create a new idea in an Aha! product ideas portal.',
        inputSchema: {
          type: 'object',
          properties: {
            product_id: { type: 'string', description: 'Product ID or reference prefix to create the idea in' },
            name: { type: 'string', description: 'Name/title of the idea' },
            description: { type: 'string', description: 'Description of the idea' },
            email: { type: 'string', description: 'Email address of the idea submitter' },
          },
          required: ['product_id', 'name'],
        },
      },
      // Goals
      {
        name: 'list_goals',
        description: 'List strategic goals for an Aha! product with pagination.',
        inputSchema: {
          type: 'object',
          properties: {
            product_id: { type: 'string', description: 'Product ID or reference prefix to list goals for' },
            page: { type: 'number', description: 'Page number for pagination (default: 1)' },
            per_page: { type: 'number', description: 'Results per page (default: 30, max: 200)' },
          },
          required: ['product_id'],
        },
      },
      {
        name: 'get_goal',
        description: 'Get a specific Aha! goal by reference number, including description, progress, and linked features.',
        inputSchema: {
          type: 'object',
          properties: {
            goal_id: { type: 'string', description: 'Goal reference number or numeric ID' },
          },
          required: ['goal_id'],
        },
      },
      // Requirements
      {
        name: 'list_requirements',
        description: 'List requirements for a specific Aha! feature.',
        inputSchema: {
          type: 'object',
          properties: {
            feature_id: { type: 'string', description: 'Feature reference number (e.g., "PRJ1-1") to list requirements for' },
            page: { type: 'number', description: 'Page number for pagination (default: 1)' },
            per_page: { type: 'number', description: 'Results per page (default: 30, max: 200)' },
          },
          required: ['feature_id'],
        },
      },
      {
        name: 'create_requirement',
        description: 'Create a new requirement under an existing Aha! feature.',
        inputSchema: {
          type: 'object',
          properties: {
            feature_id: { type: 'string', description: 'Feature reference number to add the requirement to' },
            name: { type: 'string', description: 'Name of the requirement' },
            description: { type: 'string', description: 'Description of the requirement' },
          },
          required: ['feature_id', 'name'],
        },
      },
      // Users
      {
        name: 'list_users',
        description: 'List users in the Aha! account with pagination.',
        inputSchema: {
          type: 'object',
          properties: {
            product_id: { type: 'string', description: 'Product ID to scope users to (optional; omit for all account users)' },
            page: { type: 'number', description: 'Page number for pagination (default: 1)' },
            per_page: { type: 'number', description: 'Results per page (default: 30, max: 200)' },
          },
        },
      },
      // Search
      {
        name: 'search_records',
        description: 'Full-text search across all Aha! records: features, ideas, releases, epics, and pages.',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search query string' },
            page: { type: 'number', description: 'Page number for pagination (default: 1)' },
            per_page: { type: 'number', description: 'Results per page (default: 30, max: 200)' },
          },
          required: ['query'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_products':
          return await this.listProducts(args);
        case 'get_product':
          return await this.getProduct(args);
        case 'list_features':
          return await this.listFeatures(args);
        case 'get_feature':
          return await this.getFeature(args);
        case 'create_feature':
          return await this.createFeature(args);
        case 'update_feature':
          return await this.updateFeature(args);
        case 'list_epics':
          return await this.listEpics(args);
        case 'get_epic':
          return await this.getEpic(args);
        case 'list_releases':
          return await this.listReleases(args);
        case 'get_release':
          return await this.getRelease(args);
        case 'list_ideas':
          return await this.listIdeas(args);
        case 'get_idea':
          return await this.getIdea(args);
        case 'create_idea':
          return await this.createIdea(args);
        case 'list_goals':
          return await this.listGoals(args);
        case 'get_goal':
          return await this.getGoal(args);
        case 'list_requirements':
          return await this.listRequirements(args);
        case 'create_requirement':
          return await this.createRequirement(args);
        case 'list_users':
          return await this.listUsers(args);
        case 'search_records':
          return await this.searchRecords(args);
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
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  private buildPaginationParams(args: Record<string, unknown>): string {
    const params: string[] = [];
    if (args.page) params.push(`page=${encodeURIComponent(args.page as string)}`);
    if (args.per_page) params.push(`per_page=${encodeURIComponent(args.per_page as string)}`);
    return params.length ? '?' + params.join('&') : '';
  }

  private async get(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, { method: 'GET', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Aha! API error ${response.status}: ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Aha! returned non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async post(path: string, body: unknown): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Aha! API error ${response.status}: ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Aha! returned non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async put(path: string, body: unknown): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'PUT',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Aha! API error ${response.status}: ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Aha! returned non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listProducts(args: Record<string, unknown>): Promise<ToolResult> {
    return this.get(`/products${this.buildPaginationParams(args)}`);
  }

  private async getProduct(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.product_id as string;
    if (!id) return { content: [{ type: 'text', text: 'product_id is required' }], isError: true };
    return this.get(`/products/${encodeURIComponent(id)}`);
  }

  private async listFeatures(args: Record<string, unknown>): Promise<ToolResult> {
    const productId = args.product_id as string;
    if (!productId) return { content: [{ type: 'text', text: 'product_id is required' }], isError: true };
    const pagination = this.buildPaginationParams(args);
    if (args.release_id) {
      return this.get(`/releases/${encodeURIComponent(args.release_id as string)}/features${pagination}`);
    }
    return this.get(`/products/${encodeURIComponent(productId)}/features${pagination}`);
  }

  private async getFeature(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.feature_id as string;
    if (!id) return { content: [{ type: 'text', text: 'feature_id is required' }], isError: true };
    return this.get(`/features/${encodeURIComponent(id)}`);
  }

  private async createFeature(args: Record<string, unknown>): Promise<ToolResult> {
    const releaseId = args.release_id as string;
    const name = args.name as string;
    if (!releaseId || !name) return { content: [{ type: 'text', text: 'release_id and name are required' }], isError: true };
    const featureBody: Record<string, unknown> = { name };
    if (args.description) featureBody['description'] = args.description;
    if (args.workflow_status) featureBody['workflow_status'] = { name: args.workflow_status };
    if (args.assigned_to_user) featureBody['assigned_to_user'] = { email: args.assigned_to_user };
    return this.post(`/releases/${encodeURIComponent(releaseId)}/features`, { feature: featureBody });
  }

  private async updateFeature(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.feature_id as string;
    if (!id) return { content: [{ type: 'text', text: 'feature_id is required' }], isError: true };
    const featureBody: Record<string, unknown> = {};
    if (args.name) featureBody['name'] = args.name;
    if (args.description) featureBody['description'] = args.description;
    if (args.workflow_status) featureBody['workflow_status'] = { name: args.workflow_status };
    if (args.assigned_to_user) featureBody['assigned_to_user'] = { email: args.assigned_to_user };
    return this.put(`/features/${encodeURIComponent(id)}`, { feature: featureBody });
  }

  private async listEpics(args: Record<string, unknown>): Promise<ToolResult> {
    const productId = args.product_id as string;
    if (!productId) return { content: [{ type: 'text', text: 'product_id is required' }], isError: true };
    return this.get(`/products/${encodeURIComponent(productId)}/master_features${this.buildPaginationParams(args)}`);
  }

  private async getEpic(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.epic_id as string;
    if (!id) return { content: [{ type: 'text', text: 'epic_id is required' }], isError: true };
    return this.get(`/master_features/${encodeURIComponent(id)}`);
  }

  private async listReleases(args: Record<string, unknown>): Promise<ToolResult> {
    const productId = args.product_id as string;
    if (!productId) return { content: [{ type: 'text', text: 'product_id is required' }], isError: true };
    return this.get(`/products/${encodeURIComponent(productId)}/releases${this.buildPaginationParams(args)}`);
  }

  private async getRelease(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.release_id as string;
    if (!id) return { content: [{ type: 'text', text: 'release_id is required' }], isError: true };
    return this.get(`/releases/${encodeURIComponent(id)}`);
  }

  private async listIdeas(args: Record<string, unknown>): Promise<ToolResult> {
    const productId = args.product_id as string;
    if (!productId) return { content: [{ type: 'text', text: 'product_id is required' }], isError: true };
    return this.get(`/products/${encodeURIComponent(productId)}/ideas${this.buildPaginationParams(args)}`);
  }

  private async getIdea(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.idea_id as string;
    if (!id) return { content: [{ type: 'text', text: 'idea_id is required' }], isError: true };
    return this.get(`/ideas/${encodeURIComponent(id)}`);
  }

  private async createIdea(args: Record<string, unknown>): Promise<ToolResult> {
    const productId = args.product_id as string;
    const name = args.name as string;
    if (!productId || !name) return { content: [{ type: 'text', text: 'product_id and name are required' }], isError: true };
    const ideaBody: Record<string, unknown> = { name };
    if (args.description) ideaBody['description'] = args.description;
    if (args.email) ideaBody['submitted_idea_portal_user'] = { email: args.email };
    return this.post(`/products/${encodeURIComponent(productId)}/ideas`, { idea: ideaBody });
  }

  private async listGoals(args: Record<string, unknown>): Promise<ToolResult> {
    const productId = args.product_id as string;
    if (!productId) return { content: [{ type: 'text', text: 'product_id is required' }], isError: true };
    return this.get(`/products/${encodeURIComponent(productId)}/goals${this.buildPaginationParams(args)}`);
  }

  private async getGoal(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.goal_id as string;
    if (!id) return { content: [{ type: 'text', text: 'goal_id is required' }], isError: true };
    return this.get(`/goals/${encodeURIComponent(id)}`);
  }

  private async listRequirements(args: Record<string, unknown>): Promise<ToolResult> {
    const featureId = args.feature_id as string;
    if (!featureId) return { content: [{ type: 'text', text: 'feature_id is required' }], isError: true };
    return this.get(`/features/${encodeURIComponent(featureId)}/requirements${this.buildPaginationParams(args)}`);
  }

  private async createRequirement(args: Record<string, unknown>): Promise<ToolResult> {
    const featureId = args.feature_id as string;
    const name = args.name as string;
    if (!featureId || !name) return { content: [{ type: 'text', text: 'feature_id and name are required' }], isError: true };
    const reqBody: Record<string, unknown> = { name };
    if (args.description) reqBody['description'] = args.description;
    return this.post(`/features/${encodeURIComponent(featureId)}/requirements`, { requirement: reqBody });
  }

  private async listUsers(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.product_id) {
      return this.get(`/products/${encodeURIComponent(args.product_id as string)}/users${this.buildPaginationParams(args)}`);
    }
    return this.get(`/users${this.buildPaginationParams(args)}`);
  }

  private async searchRecords(args: Record<string, unknown>): Promise<ToolResult> {
    const query = args.query as string;
    if (!query) return { content: [{ type: 'text', text: 'query is required' }], isError: true };
    const params: string[] = [`q=${encodeURIComponent(query)}`];
    if (args.page) params.push(`page=${encodeURIComponent(args.page as string)}`);
    if (args.per_page) params.push(`per_page=${encodeURIComponent(args.per_page as string)}`);
    return this.get(`/search?${params.join('&')}`);
  }

  static catalog() {
    return {
      name: 'aha',
      displayName: 'Aha',
      version: '1.0.0',
      category: 'collaboration' as const,
      keywords: ['aha'],
      toolNames: ['list_products', 'get_product', 'list_features', 'get_feature', 'create_feature', 'update_feature', 'list_epics', 'get_epic', 'list_releases', 'get_release', 'list_ideas', 'get_idea', 'create_idea', 'list_goals', 'get_goal', 'list_requirements', 'create_requirement', 'list_users', 'search_records'],
      description: 'Aha adapter for the Epic AI Intelligence Platform',
      author: 'protectnil' as const,
    };
  }
}

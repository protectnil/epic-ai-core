/**
 * Railway MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/railwayapp/railway-mcp-server — transport: stdio, auth: Railway CLI token
// Published by railwayapp (Railway's official GitHub org). npm: @railway/mcp-server. Actively maintained (47+ commits, March 2026).
// Integration: use-both
// MCP-sourced tools (11): check-railway-status, list-projects, create-project-and-link, list-services,
//   link-service, deploy, deploy-template, create-environment, link-environment, list-variables, set-variables
// REST-sourced tools (15): list_projects, get_project, create_project, delete_project, list_environments,
//   create_environment, delete_environment, list_services, create_service, delete_service, list_deployments,
//   redeploy_service, restart_service, upsert_variables, list_variables
// Combined coverage: 26 unique tools (MCP has deploy-template, link-service, link-environment, create-project-and-link
//   not in our REST adapter; REST adapter has get_project, delete_project, delete_environment, delete_service,
//   list_deployments, redeploy_service, restart_service not in the MCP).
//
// Base URL: https://backboard.railway.com/graphql/v2  (all calls are POST to this single endpoint)
// Auth: Bearer token — personal API token from Railway dashboard Settings → Tokens
// Docs: https://docs.railway.com/integrations/api
// Rate limits: 10 RPS / 100 RPH (Free), 10 RPS / 1,000 RPH (Hobby), 50 RPS / 10,000 RPH (Pro), custom (Enterprise)

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface RailwayConfig {
  token: string;
  baseUrl?: string;
}

export class RailwayMCPServer extends MCPAdapterBase {
  private readonly token: string;
  private readonly baseUrl: string;

  constructor(config: RailwayConfig) {
    super();
    this.token = config.token;
    this.baseUrl = config.baseUrl || 'https://backboard.railway.com/graphql/v2';
  }

  static catalog() {
    return {
      name: 'railway',
      displayName: 'Railway',
      version: '1.0.0',
      category: 'devops',
      keywords: ['railway', 'deploy', 'deployment', 'service', 'environment', 'infrastructure', 'paas', 'container', 'volume', 'variable'],
      toolNames: [
        'list_projects', 'get_project', 'create_project', 'delete_project',
        'list_environments', 'create_environment', 'delete_environment',
        'list_services', 'create_service', 'delete_service',
        'list_deployments', 'redeploy_service', 'restart_service',
        'upsert_variables', 'list_variables',
      ],
      description: 'Manage Railway projects, services, environments, deployments, and variables via the Railway GraphQL API.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_projects',
        description: 'List all Railway projects accessible to the authenticated token, including names, IDs, and timestamps',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_project',
        description: 'Get full details for a specific Railway project by ID, including environments and services',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: {
              type: 'string',
              description: 'UUID of the Railway project',
            },
          },
          required: ['project_id'],
        },
      },
      {
        name: 'create_project',
        description: 'Create a new Railway project with optional description and default environment name',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Name for the new project',
            },
            description: {
              type: 'string',
              description: 'Optional description for the project',
            },
            default_environment_name: {
              type: 'string',
              description: 'Name for the default environment (default: production)',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'delete_project',
        description: 'Permanently delete a Railway project and all its services, environments, and deployments',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: {
              type: 'string',
              description: 'UUID of the Railway project to delete',
            },
          },
          required: ['project_id'],
        },
      },
      {
        name: 'list_environments',
        description: 'List all environments in a Railway project (e.g. production, staging, preview)',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: {
              type: 'string',
              description: 'UUID of the Railway project',
            },
          },
          required: ['project_id'],
        },
      },
      {
        name: 'create_environment',
        description: 'Create a new environment in a Railway project, optionally cloning variables from an existing environment',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: {
              type: 'string',
              description: 'UUID of the Railway project',
            },
            name: {
              type: 'string',
              description: 'Name for the new environment (e.g. staging, preview)',
            },
            ephemeral: {
              type: 'boolean',
              description: 'Whether the environment is ephemeral (auto-deleted when idle, default: false)',
            },
          },
          required: ['project_id', 'name'],
        },
      },
      {
        name: 'delete_environment',
        description: 'Delete a Railway environment and all deployments within it',
        inputSchema: {
          type: 'object',
          properties: {
            environment_id: {
              type: 'string',
              description: 'UUID of the environment to delete',
            },
          },
          required: ['environment_id'],
        },
      },
      {
        name: 'list_services',
        description: 'List all services in a Railway project with IDs, names, and creation timestamps',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: {
              type: 'string',
              description: 'UUID of the Railway project',
            },
          },
          required: ['project_id'],
        },
      },
      {
        name: 'create_service',
        description: 'Create a new Railway service from a Docker image or as an empty service (source optional)',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: {
              type: 'string',
              description: 'UUID of the Railway project to create the service in',
            },
            name: {
              type: 'string',
              description: 'Display name for the service',
            },
            image: {
              type: 'string',
              description: 'Docker image to deploy (e.g. nginx:latest). Omit to create an empty service.',
            },
          },
          required: ['project_id', 'name'],
        },
      },
      {
        name: 'delete_service',
        description: 'Permanently delete a Railway service and all its deployments',
        inputSchema: {
          type: 'object',
          properties: {
            service_id: {
              type: 'string',
              description: 'UUID of the Railway service to delete',
            },
          },
          required: ['service_id'],
        },
      },
      {
        name: 'list_deployments',
        description: 'List recent deployments for a Railway service in a specific environment, including status and URLs',
        inputSchema: {
          type: 'object',
          properties: {
            service_id: {
              type: 'string',
              description: 'UUID of the Railway service',
            },
            environment_id: {
              type: 'string',
              description: 'UUID of the environment',
            },
          },
          required: ['service_id', 'environment_id'],
        },
      },
      {
        name: 'redeploy_service',
        description: 'Trigger a fresh redeploy of a Railway service instance in a specific environment',
        inputSchema: {
          type: 'object',
          properties: {
            service_id: {
              type: 'string',
              description: 'UUID of the Railway service to redeploy',
            },
            environment_id: {
              type: 'string',
              description: 'UUID of the environment in which to redeploy the service',
            },
          },
          required: ['service_id', 'environment_id'],
        },
      },
      {
        name: 'restart_service',
        description: 'Restart (without a new deploy) a running Railway service instance in a specific environment',
        inputSchema: {
          type: 'object',
          properties: {
            service_id: {
              type: 'string',
              description: 'UUID of the Railway service to restart',
            },
            environment_id: {
              type: 'string',
              description: 'UUID of the environment in which to restart the service',
            },
          },
          required: ['service_id', 'environment_id'],
        },
      },
      {
        name: 'upsert_variables',
        description: 'Create or update environment variables for a Railway service in a specific environment',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: {
              type: 'string',
              description: 'UUID of the Railway project',
            },
            environment_id: {
              type: 'string',
              description: 'UUID of the environment to set variables in',
            },
            service_id: {
              type: 'string',
              description: 'UUID of the service these variables apply to',
            },
            variables: {
              type: 'object',
              description: 'Key-value pairs of variables to upsert (e.g. {"PORT": "3000", "NODE_ENV": "production"})',
            },
          },
          required: ['project_id', 'environment_id', 'service_id', 'variables'],
        },
      },
      {
        name: 'list_variables',
        description: 'List all environment variables for a Railway service in a specific environment',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: {
              type: 'string',
              description: 'UUID of the Railway project',
            },
            environment_id: {
              type: 'string',
              description: 'UUID of the environment',
            },
            service_id: {
              type: 'string',
              description: 'UUID of the service',
            },
          },
          required: ['project_id', 'environment_id', 'service_id'],
        },
      },
    ];
  }

  private async gql(query: string, variables: Record<string, unknown>): Promise<Response> {
    return fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, variables }),
    });
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_projects':
          return await this.listProjects();
        case 'get_project':
          return await this.getProject(args);
        case 'create_project':
          return await this.createProject(args);
        case 'delete_project':
          return await this.deleteProject(args);
        case 'list_environments':
          return await this.listEnvironments(args);
        case 'create_environment':
          return await this.createEnvironment(args);
        case 'delete_environment':
          return await this.deleteEnvironment(args);
        case 'list_services':
          return await this.listServices(args);
        case 'create_service':
          return await this.createService(args);
        case 'delete_service':
          return await this.deleteService(args);
        case 'list_deployments':
          return await this.listDeployments(args);
        case 'redeploy_service':
          return await this.redeployService(args);
        case 'restart_service':
          return await this.restartService(args);
        case 'upsert_variables':
          return await this.upsertVariables(args);
        case 'list_variables':
          return await this.listVariables(args);
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

  private async listProjects(): Promise<ToolResult> {
    const response = await this.gql(
      `query { projects { edges { node { id name description createdAt updatedAt } } } }`,
      {}
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to list projects: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Railway returned non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async getProject(args: Record<string, unknown>): Promise<ToolResult> {
    const projectId = args.project_id as string;
    if (!projectId) return { content: [{ type: 'text', text: 'project_id is required' }], isError: true };
    const response = await this.gql(
      `query project($id: String!) {
        project(id: $id) {
          id name description createdAt updatedAt
          environments { edges { node { id name createdAt } } }
          services { edges { node { id name createdAt } } }
        }
      }`,
      { id: projectId }
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to get project: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Railway returned non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async createProject(args: Record<string, unknown>): Promise<ToolResult> {
    const projectName = args.name as string;
    if (!projectName) return { content: [{ type: 'text', text: 'name is required' }], isError: true };
    const input: Record<string, unknown> = { name: projectName };
    if (args.description) input.description = args.description;
    if (args.default_environment_name) input.defaultEnvironmentName = args.default_environment_name;
    const response = await this.gql(
      `mutation projectCreate($input: ProjectCreateInput!) {
        projectCreate(input: $input) { id name description createdAt }
      }`,
      { input }
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to create project: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Railway returned non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async deleteProject(args: Record<string, unknown>): Promise<ToolResult> {
    const projectId = args.project_id as string;
    if (!projectId) return { content: [{ type: 'text', text: 'project_id is required' }], isError: true };
    const response = await this.gql(
      `mutation projectDelete($id: String!) { projectDelete(id: $id) }`,
      { id: projectId }
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to delete project: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Railway returned non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async listEnvironments(args: Record<string, unknown>): Promise<ToolResult> {
    const projectId = args.project_id as string;
    if (!projectId) return { content: [{ type: 'text', text: 'project_id is required' }], isError: true };
    const response = await this.gql(
      `query environments($projectId: String!) {
        environments(projectId: $projectId) {
          edges { node { id name isEphemeral createdAt updatedAt } }
        }
      }`,
      { projectId }
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to list environments: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Railway returned non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async createEnvironment(args: Record<string, unknown>): Promise<ToolResult> {
    const projectId = args.project_id as string;
    const name = args.name as string;
    if (!projectId || !name) return { content: [{ type: 'text', text: 'project_id and name are required' }], isError: true };
    const input: Record<string, unknown> = { projectId, name };
    if (args.ephemeral !== undefined) input.isEphemeral = args.ephemeral;
    const response = await this.gql(
      `mutation environmentCreate($input: EnvironmentCreateInput!) {
        environmentCreate(input: $input) { id name isEphemeral createdAt }
      }`,
      { input }
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to create environment: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Railway returned non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async deleteEnvironment(args: Record<string, unknown>): Promise<ToolResult> {
    const environmentId = args.environment_id as string;
    if (!environmentId) return { content: [{ type: 'text', text: 'environment_id is required' }], isError: true };
    const response = await this.gql(
      `mutation environmentDelete($id: String!) { environmentDelete(id: $id) }`,
      { id: environmentId }
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to delete environment: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Railway returned non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async listServices(args: Record<string, unknown>): Promise<ToolResult> {
    const projectId = args.project_id as string;
    if (!projectId) return { content: [{ type: 'text', text: 'project_id is required' }], isError: true };
    const response = await this.gql(
      `query services($projectId: String!) {
        project(id: $projectId) {
          services { edges { node { id name createdAt updatedAt } } }
        }
      }`,
      { projectId }
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to list services: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Railway returned non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async createService(args: Record<string, unknown>): Promise<ToolResult> {
    const projectId = args.project_id as string;
    const name = args.name as string;
    if (!projectId || !name) return { content: [{ type: 'text', text: 'project_id and name are required' }], isError: true };
    const input: Record<string, unknown> = { projectId, name };
    if (args.image) input.source = { image: args.image };
    const response = await this.gql(
      `mutation serviceCreate($input: ServiceCreateInput!) {
        serviceCreate(input: $input) { id name createdAt }
      }`,
      { input }
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to create service: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Railway returned non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async deleteService(args: Record<string, unknown>): Promise<ToolResult> {
    const serviceId = args.service_id as string;
    if (!serviceId) return { content: [{ type: 'text', text: 'service_id is required' }], isError: true };
    const response = await this.gql(
      `mutation serviceDelete($id: String!) { serviceDelete(id: $id) }`,
      { id: serviceId }
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to delete service: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Railway returned non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async listDeployments(args: Record<string, unknown>): Promise<ToolResult> {
    const serviceId = args.service_id as string;
    const environmentId = args.environment_id as string;
    if (!serviceId || !environmentId) return { content: [{ type: 'text', text: 'service_id and environment_id are required' }], isError: true };
    const response = await this.gql(
      `query deployments($serviceId: String!, $environmentId: String!) {
        deployments(input: { serviceId: $serviceId, environmentId: $environmentId }) {
          edges { node { id status createdAt updatedAt url } }
        }
      }`,
      { serviceId, environmentId }
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to list deployments: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Railway returned non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async redeployService(args: Record<string, unknown>): Promise<ToolResult> {
    const serviceId = args.service_id as string;
    const environmentId = args.environment_id as string;
    if (!serviceId || !environmentId) return { content: [{ type: 'text', text: 'service_id and environment_id are required' }], isError: true };
    const response = await this.gql(
      `mutation serviceInstanceRedeploy($serviceId: String!, $environmentId: String!) {
        serviceInstanceRedeploy(serviceId: $serviceId, environmentId: $environmentId)
      }`,
      { serviceId, environmentId }
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to redeploy service: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Railway returned non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async restartService(args: Record<string, unknown>): Promise<ToolResult> {
    const serviceId = args.service_id as string;
    const environmentId = args.environment_id as string;
    if (!serviceId || !environmentId) return { content: [{ type: 'text', text: 'service_id and environment_id are required' }], isError: true };
    const response = await this.gql(
      `mutation serviceInstanceRestart($serviceId: String!, $environmentId: String!) {
        serviceInstanceRestart(serviceId: $serviceId, environmentId: $environmentId)
      }`,
      { serviceId, environmentId }
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to restart service: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Railway returned non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async upsertVariables(args: Record<string, unknown>): Promise<ToolResult> {
    const projectId = args.project_id as string;
    const environmentId = args.environment_id as string;
    const serviceId = args.service_id as string;
    const variables = args.variables as Record<string, string>;
    if (!projectId || !environmentId || !serviceId || !variables) {
      return { content: [{ type: 'text', text: 'project_id, environment_id, service_id, and variables are required' }], isError: true };
    }
    const response = await this.gql(
      `mutation variableCollectionUpsert($input: VariableCollectionUpsertInput!) {
        variableCollectionUpsert(input: $input)
      }`,
      { input: { projectId, environmentId, serviceId, variables } }
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to upsert variables: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Railway returned non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async listVariables(args: Record<string, unknown>): Promise<ToolResult> {
    const projectId = args.project_id as string;
    const environmentId = args.environment_id as string;
    const serviceId = args.service_id as string;
    if (!projectId || !environmentId || !serviceId) {
      return { content: [{ type: 'text', text: 'project_id, environment_id, and service_id are required' }], isError: true };
    }
    const response = await this.gql(
      `query variables($projectId: String!, $environmentId: String!, $serviceId: String!) {
        variables(projectId: $projectId, environmentId: $environmentId, serviceId: $serviceId)
      }`,
      { projectId, environmentId, serviceId }
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to list variables: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Railway returned non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }
}

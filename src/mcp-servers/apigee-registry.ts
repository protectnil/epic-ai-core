/**
 * Apigee Registry MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// No official Apigee Registry MCP server was found on GitHub as of 2026-03-28.
// Our adapter covers: 23 tools (full REST API surface).
// Recommendation: use-rest-api — no official MCP server exists.
//
// Base URL: https://apigeeregistry.googleapis.com
// Auth: Bearer OAuth2 token (Google Cloud service account or user credentials)
//   Obtain via: gcloud auth print-access-token OR service account key + OAuth2
//   Scopes required: https://www.googleapis.com/auth/cloud-platform
// Docs: https://cloud.google.com/apigee/docs/api-hub/what-is-api-hub
// Rate limits: Google Cloud default quotas; subject to project quota limits
// Source spec: https://api.apis.guru/v2/specs/apigee.local/registry/0.0.1/openapi.json

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface ApigeeRegistryConfig {
  /**
   * Bearer OAuth2 access token for Google Cloud APIs.
   * Obtain via: gcloud auth print-access-token
   * Scopes: https://www.googleapis.com/auth/cloud-platform
   */
  accessToken: string;
  /**
   * Override the API base URL.
   * Defaults to https://apigeeregistry.googleapis.com
   */
  baseUrl?: string;
}

export class ApigeeRegistryMCPServer extends MCPAdapterBase {
  private readonly accessToken: string;
  private readonly baseUrl: string;

  constructor(config: ApigeeRegistryConfig) {
    super();
    this.accessToken = config.accessToken;
    this.baseUrl = config.baseUrl || 'https://apigeeregistry.googleapis.com';
  }

  private get headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      // --- APIs ---
      {
        name: 'list_apis',
        description: 'List all APIs in an Apigee Registry project and location with optional filter and pagination.',
        inputSchema: {
          type: 'object',
          properties: {
            project: { type: 'string', description: 'Google Cloud project ID' },
            location: { type: 'string', description: 'Google Cloud location (e.g. us-central1 or global)' },
            filter: { type: 'string', description: 'Optional filter expression to narrow results' },
            pageSize: { type: 'number', description: 'Maximum number of APIs to return per page' },
            pageToken: { type: 'string', description: 'Pagination token from a previous response' },
          },
          required: ['project', 'location'],
        },
      },
      {
        name: 'get_api',
        description: 'Get details of a specific API in the Apigee Registry by project, location, and API ID.',
        inputSchema: {
          type: 'object',
          properties: {
            project: { type: 'string', description: 'Google Cloud project ID' },
            location: { type: 'string', description: 'Google Cloud location' },
            api: { type: 'string', description: 'The API ID' },
          },
          required: ['project', 'location', 'api'],
        },
      },
      {
        name: 'create_api',
        description: 'Create a new API entry in the Apigee Registry under a project and location.',
        inputSchema: {
          type: 'object',
          properties: {
            project: { type: 'string', description: 'Google Cloud project ID' },
            location: { type: 'string', description: 'Google Cloud location' },
            apiId: { type: 'string', description: 'ID to assign to the new API' },
            displayName: { type: 'string', description: 'Human-readable display name for the API' },
            description: { type: 'string', description: 'Description of the API' },
            labels: { type: 'object', description: 'Key-value labels to attach to the API' },
            annotations: { type: 'object', description: 'Key-value annotations to attach to the API' },
          },
          required: ['project', 'location', 'apiId'],
        },
      },
      {
        name: 'update_api',
        description: 'Update an existing API entry in the Apigee Registry (display name, description, labels, annotations).',
        inputSchema: {
          type: 'object',
          properties: {
            project: { type: 'string', description: 'Google Cloud project ID' },
            location: { type: 'string', description: 'Google Cloud location' },
            api: { type: 'string', description: 'The API ID to update' },
            displayName: { type: 'string', description: 'Updated display name' },
            description: { type: 'string', description: 'Updated description' },
            labels: { type: 'object', description: 'Updated key-value labels' },
            annotations: { type: 'object', description: 'Updated key-value annotations' },
          },
          required: ['project', 'location', 'api'],
        },
      },
      {
        name: 'delete_api',
        description: 'Delete an API from the Apigee Registry and all its child resources (versions, specs, deployments, artifacts).',
        inputSchema: {
          type: 'object',
          properties: {
            project: { type: 'string', description: 'Google Cloud project ID' },
            location: { type: 'string', description: 'Google Cloud location' },
            api: { type: 'string', description: 'The API ID to delete' },
          },
          required: ['project', 'location', 'api'],
        },
      },
      // --- API Versions ---
      {
        name: 'list_api_versions',
        description: 'List all versions of a specific API in the Apigee Registry.',
        inputSchema: {
          type: 'object',
          properties: {
            project: { type: 'string', description: 'Google Cloud project ID' },
            location: { type: 'string', description: 'Google Cloud location' },
            api: { type: 'string', description: 'The API ID' },
            filter: { type: 'string', description: 'Optional filter expression' },
            pageSize: { type: 'number', description: 'Maximum number of versions to return per page' },
            pageToken: { type: 'string', description: 'Pagination token from a previous response' },
          },
          required: ['project', 'location', 'api'],
        },
      },
      {
        name: 'get_api_version',
        description: 'Get details of a specific API version in the Apigee Registry.',
        inputSchema: {
          type: 'object',
          properties: {
            project: { type: 'string', description: 'Google Cloud project ID' },
            location: { type: 'string', description: 'Google Cloud location' },
            api: { type: 'string', description: 'The API ID' },
            version: { type: 'string', description: 'The version ID' },
          },
          required: ['project', 'location', 'api', 'version'],
        },
      },
      {
        name: 'create_api_version',
        description: 'Create a new version for an API in the Apigee Registry.',
        inputSchema: {
          type: 'object',
          properties: {
            project: { type: 'string', description: 'Google Cloud project ID' },
            location: { type: 'string', description: 'Google Cloud location' },
            api: { type: 'string', description: 'The API ID' },
            versionId: { type: 'string', description: 'ID to assign to the new version' },
            displayName: { type: 'string', description: 'Human-readable display name for the version' },
            description: { type: 'string', description: 'Description of this version' },
            state: { type: 'string', description: 'Lifecycle state (e.g. DRAFT, ACTIVE, DEPRECATED, RETIRED)' },
            labels: { type: 'object', description: 'Key-value labels' },
          },
          required: ['project', 'location', 'api', 'versionId'],
        },
      },
      {
        name: 'update_api_version',
        description: 'Update an existing API version in the Apigee Registry.',
        inputSchema: {
          type: 'object',
          properties: {
            project: { type: 'string', description: 'Google Cloud project ID' },
            location: { type: 'string', description: 'Google Cloud location' },
            api: { type: 'string', description: 'The API ID' },
            version: { type: 'string', description: 'The version ID to update' },
            displayName: { type: 'string', description: 'Updated display name' },
            description: { type: 'string', description: 'Updated description' },
            state: { type: 'string', description: 'Updated lifecycle state' },
          },
          required: ['project', 'location', 'api', 'version'],
        },
      },
      {
        name: 'delete_api_version',
        description: 'Delete an API version and all its child resources (specs, artifacts) from the Apigee Registry.',
        inputSchema: {
          type: 'object',
          properties: {
            project: { type: 'string', description: 'Google Cloud project ID' },
            location: { type: 'string', description: 'Google Cloud location' },
            api: { type: 'string', description: 'The API ID' },
            version: { type: 'string', description: 'The version ID to delete' },
          },
          required: ['project', 'location', 'api', 'version'],
        },
      },
      // --- API Specs ---
      {
        name: 'list_api_specs',
        description: 'List all specs for a specific API version in the Apigee Registry.',
        inputSchema: {
          type: 'object',
          properties: {
            project: { type: 'string', description: 'Google Cloud project ID' },
            location: { type: 'string', description: 'Google Cloud location' },
            api: { type: 'string', description: 'The API ID' },
            version: { type: 'string', description: 'The version ID' },
            filter: { type: 'string', description: 'Optional filter expression' },
            pageSize: { type: 'number', description: 'Maximum number of specs to return per page' },
            pageToken: { type: 'string', description: 'Pagination token' },
          },
          required: ['project', 'location', 'api', 'version'],
        },
      },
      {
        name: 'get_api_spec',
        description: 'Get metadata of a specific API spec in the Apigee Registry (without raw contents).',
        inputSchema: {
          type: 'object',
          properties: {
            project: { type: 'string', description: 'Google Cloud project ID' },
            location: { type: 'string', description: 'Google Cloud location' },
            api: { type: 'string', description: 'The API ID' },
            version: { type: 'string', description: 'The version ID' },
            spec: { type: 'string', description: 'The spec ID' },
          },
          required: ['project', 'location', 'api', 'version', 'spec'],
        },
      },
      {
        name: 'get_api_spec_contents',
        description: 'Get the raw contents of a specific API spec from the Apigee Registry (OpenAPI, proto, etc.).',
        inputSchema: {
          type: 'object',
          properties: {
            project: { type: 'string', description: 'Google Cloud project ID' },
            location: { type: 'string', description: 'Google Cloud location' },
            api: { type: 'string', description: 'The API ID' },
            version: { type: 'string', description: 'The version ID' },
            spec: { type: 'string', description: 'The spec ID' },
          },
          required: ['project', 'location', 'api', 'version', 'spec'],
        },
      },
      {
        name: 'create_api_spec',
        description: 'Create a new API spec for a version in the Apigee Registry.',
        inputSchema: {
          type: 'object',
          properties: {
            project: { type: 'string', description: 'Google Cloud project ID' },
            location: { type: 'string', description: 'Google Cloud location' },
            api: { type: 'string', description: 'The API ID' },
            version: { type: 'string', description: 'The version ID' },
            specId: { type: 'string', description: 'ID to assign to the new spec' },
            mimeType: { type: 'string', description: 'MIME type (e.g. application/x.openapi+gzip;version=3.0)' },
            contents: { type: 'string', description: 'Base64-encoded spec contents' },
            description: { type: 'string', description: 'Description of this spec' },
          },
          required: ['project', 'location', 'api', 'version', 'specId'],
        },
      },
      {
        name: 'delete_api_spec',
        description: 'Delete an API spec and all its revisions from the Apigee Registry.',
        inputSchema: {
          type: 'object',
          properties: {
            project: { type: 'string', description: 'Google Cloud project ID' },
            location: { type: 'string', description: 'Google Cloud location' },
            api: { type: 'string', description: 'The API ID' },
            version: { type: 'string', description: 'The version ID' },
            spec: { type: 'string', description: 'The spec ID to delete' },
          },
          required: ['project', 'location', 'api', 'version', 'spec'],
        },
      },
      {
        name: 'list_api_spec_revisions',
        description: 'List all revisions of an API spec in the Apigee Registry (newest first).',
        inputSchema: {
          type: 'object',
          properties: {
            project: { type: 'string', description: 'Google Cloud project ID' },
            location: { type: 'string', description: 'Google Cloud location' },
            api: { type: 'string', description: 'The API ID' },
            version: { type: 'string', description: 'The version ID' },
            spec: { type: 'string', description: 'The spec ID' },
            pageToken: { type: 'string', description: 'Pagination token' },
          },
          required: ['project', 'location', 'api', 'version', 'spec'],
        },
      },
      {
        name: 'rollback_api_spec',
        description: 'Roll back an API spec to a specified prior revision in the Apigee Registry.',
        inputSchema: {
          type: 'object',
          properties: {
            project: { type: 'string', description: 'Google Cloud project ID' },
            location: { type: 'string', description: 'Google Cloud location' },
            api: { type: 'string', description: 'The API ID' },
            version: { type: 'string', description: 'The version ID' },
            spec: { type: 'string', description: 'The spec ID' },
            revisionId: { type: 'string', description: 'The revision ID to roll back to' },
          },
          required: ['project', 'location', 'api', 'version', 'spec', 'revisionId'],
        },
      },
      // --- Deployments ---
      {
        name: 'list_api_deployments',
        description: 'List all deployments for a specific API in the Apigee Registry.',
        inputSchema: {
          type: 'object',
          properties: {
            project: { type: 'string', description: 'Google Cloud project ID' },
            location: { type: 'string', description: 'Google Cloud location' },
            api: { type: 'string', description: 'The API ID' },
            filter: { type: 'string', description: 'Optional filter expression' },
            pageSize: { type: 'number', description: 'Maximum number of deployments to return per page' },
            pageToken: { type: 'string', description: 'Pagination token' },
          },
          required: ['project', 'location', 'api'],
        },
      },
      {
        name: 'get_api_deployment',
        description: 'Get details of a specific API deployment in the Apigee Registry.',
        inputSchema: {
          type: 'object',
          properties: {
            project: { type: 'string', description: 'Google Cloud project ID' },
            location: { type: 'string', description: 'Google Cloud location' },
            api: { type: 'string', description: 'The API ID' },
            deployment: { type: 'string', description: 'The deployment ID' },
          },
          required: ['project', 'location', 'api', 'deployment'],
        },
      },
      {
        name: 'rollback_api_deployment',
        description: 'Roll back an API deployment to a specified prior revision in the Apigee Registry.',
        inputSchema: {
          type: 'object',
          properties: {
            project: { type: 'string', description: 'Google Cloud project ID' },
            location: { type: 'string', description: 'Google Cloud location' },
            api: { type: 'string', description: 'The API ID' },
            deployment: { type: 'string', description: 'The deployment ID' },
            revisionId: { type: 'string', description: 'The revision ID to roll back to' },
          },
          required: ['project', 'location', 'api', 'deployment', 'revisionId'],
        },
      },
      // --- Artifacts ---
      {
        name: 'list_artifacts',
        description: 'List all artifacts in a project/location in the Apigee Registry. Artifacts hold arbitrary metadata attached to registry resources.',
        inputSchema: {
          type: 'object',
          properties: {
            project: { type: 'string', description: 'Google Cloud project ID' },
            location: { type: 'string', description: 'Google Cloud location' },
            filter: { type: 'string', description: 'Optional filter expression' },
            pageSize: { type: 'number', description: 'Maximum number of artifacts to return per page' },
            pageToken: { type: 'string', description: 'Pagination token' },
          },
          required: ['project', 'location'],
        },
      },
      {
        name: 'get_artifact',
        description: 'Get metadata of a specific artifact in the Apigee Registry.',
        inputSchema: {
          type: 'object',
          properties: {
            project: { type: 'string', description: 'Google Cloud project ID' },
            location: { type: 'string', description: 'Google Cloud location' },
            artifact: { type: 'string', description: 'The artifact ID' },
          },
          required: ['project', 'location', 'artifact'],
        },
      },
      {
        name: 'get_artifact_contents',
        description: 'Get the raw contents of a specific artifact from the Apigee Registry.',
        inputSchema: {
          type: 'object',
          properties: {
            project: { type: 'string', description: 'Google Cloud project ID' },
            location: { type: 'string', description: 'Google Cloud location' },
            artifact: { type: 'string', description: 'The artifact ID' },
          },
          required: ['project', 'location', 'artifact'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_apis': return await this.listApis(args);
        case 'get_api': return await this.getApi(args);
        case 'create_api': return await this.createApi(args);
        case 'update_api': return await this.updateApi(args);
        case 'delete_api': return await this.deleteApi(args);
        case 'list_api_versions': return await this.listApiVersions(args);
        case 'get_api_version': return await this.getApiVersion(args);
        case 'create_api_version': return await this.createApiVersion(args);
        case 'update_api_version': return await this.updateApiVersion(args);
        case 'delete_api_version': return await this.deleteApiVersion(args);
        case 'list_api_specs': return await this.listApiSpecs(args);
        case 'get_api_spec': return await this.getApiSpec(args);
        case 'get_api_spec_contents': return await this.getApiSpecContents(args);
        case 'create_api_spec': return await this.createApiSpec(args);
        case 'delete_api_spec': return await this.deleteApiSpec(args);
        case 'list_api_spec_revisions': return await this.listApiSpecRevisions(args);
        case 'rollback_api_spec': return await this.rollbackApiSpec(args);
        case 'list_api_deployments': return await this.listApiDeployments(args);
        case 'get_api_deployment': return await this.getApiDeployment(args);
        case 'rollback_api_deployment': return await this.rollbackApiDeployment(args);
        case 'list_artifacts': return await this.listArtifacts(args);
        case 'get_artifact': return await this.getArtifact(args);
        case 'get_artifact_contents': return await this.getArtifactContents(args);
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
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `Apigee Registry API error ${response.status}: ${errText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apiPost(path: string, body: unknown): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `Apigee Registry API error ${response.status}: ${errText}` }], isError: true };
    }
    if (response.status === 204) return { content: [{ type: 'text', text: JSON.stringify({ success: true }) }], isError: false };
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apiPatch(path: string, body: unknown): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'PATCH',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `Apigee Registry API error ${response.status}: ${errText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apiDelete(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, { method: 'DELETE', headers: this.headers });
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `Apigee Registry API error ${response.status}: ${errText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: JSON.stringify({ success: true }) }], isError: false };
  }

  private apiBase(project: string, location: string): string {
    return `/v1/projects/${encodeURIComponent(project)}/locations/${encodeURIComponent(location)}`;
  }

  private async listApis(args: Record<string, unknown>): Promise<ToolResult> {
    const { project, location, filter, pageSize, pageToken } = args as Record<string, string>;
    if (!project || !location) return { content: [{ type: 'text', text: 'project and location are required' }], isError: true };
    const params = new URLSearchParams();
    if (filter) params.set('filter', filter);
    if (pageSize) params.set('pageSize', String(pageSize));
    if (pageToken) params.set('pageToken', pageToken);
    const qs = params.toString() ? `?${params}` : '';
    return this.apiGet(`${this.apiBase(project, location)}/apis${qs}`);
  }

  private async getApi(args: Record<string, unknown>): Promise<ToolResult> {
    const { project, location, api } = args as Record<string, string>;
    if (!project || !location || !api) return { content: [{ type: 'text', text: 'project, location, and api are required' }], isError: true };
    return this.apiGet(`${this.apiBase(project, location)}/apis/${encodeURIComponent(api)}`);
  }

  private async createApi(args: Record<string, unknown>): Promise<ToolResult> {
    const { project, location, apiId, displayName, description, labels, annotations } = args;
    if (!project || !location || !apiId) return { content: [{ type: 'text', text: 'project, location, and apiId are required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (displayName) body.displayName = displayName;
    if (description) body.description = description;
    if (labels) body.labels = labels;
    if (annotations) body.annotations = annotations;
    return this.apiPost(`${this.apiBase(project as string, location as string)}/apis?apiId=${encodeURIComponent(apiId as string)}`, body);
  }

  private async updateApi(args: Record<string, unknown>): Promise<ToolResult> {
    const { project, location, api, displayName, description, labels, annotations } = args;
    if (!project || !location || !api) return { content: [{ type: 'text', text: 'project, location, and api are required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (displayName) body.displayName = displayName;
    if (description) body.description = description;
    if (labels) body.labels = labels;
    if (annotations) body.annotations = annotations;
    return this.apiPatch(`${this.apiBase(project as string, location as string)}/apis/${encodeURIComponent(api as string)}`, body);
  }

  private async deleteApi(args: Record<string, unknown>): Promise<ToolResult> {
    const { project, location, api } = args as Record<string, string>;
    if (!project || !location || !api) return { content: [{ type: 'text', text: 'project, location, and api are required' }], isError: true };
    return this.apiDelete(`${this.apiBase(project, location)}/apis/${encodeURIComponent(api)}`);
  }

  private async listApiVersions(args: Record<string, unknown>): Promise<ToolResult> {
    const { project, location, api, filter, pageSize, pageToken } = args as Record<string, string>;
    if (!project || !location || !api) return { content: [{ type: 'text', text: 'project, location, and api are required' }], isError: true };
    const params = new URLSearchParams();
    if (filter) params.set('filter', filter);
    if (pageSize) params.set('pageSize', String(pageSize));
    if (pageToken) params.set('pageToken', pageToken);
    const qs = params.toString() ? `?${params}` : '';
    return this.apiGet(`${this.apiBase(project, location)}/apis/${encodeURIComponent(api)}/versions${qs}`);
  }

  private async getApiVersion(args: Record<string, unknown>): Promise<ToolResult> {
    const { project, location, api, version } = args as Record<string, string>;
    if (!project || !location || !api || !version) return { content: [{ type: 'text', text: 'project, location, api, and version are required' }], isError: true };
    return this.apiGet(`${this.apiBase(project, location)}/apis/${encodeURIComponent(api)}/versions/${encodeURIComponent(version)}`);
  }

  private async createApiVersion(args: Record<string, unknown>): Promise<ToolResult> {
    const { project, location, api, versionId, displayName, description, state, labels } = args;
    if (!project || !location || !api || !versionId) return { content: [{ type: 'text', text: 'project, location, api, and versionId are required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (displayName) body.displayName = displayName;
    if (description) body.description = description;
    if (state) body.state = state;
    if (labels) body.labels = labels;
    return this.apiPost(`${this.apiBase(project as string, location as string)}/apis/${encodeURIComponent(api as string)}/versions?versionId=${encodeURIComponent(versionId as string)}`, body);
  }

  private async updateApiVersion(args: Record<string, unknown>): Promise<ToolResult> {
    const { project, location, api, version, displayName, description, state } = args;
    if (!project || !location || !api || !version) return { content: [{ type: 'text', text: 'project, location, api, and version are required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (displayName) body.displayName = displayName;
    if (description) body.description = description;
    if (state) body.state = state;
    return this.apiPatch(`${this.apiBase(project as string, location as string)}/apis/${encodeURIComponent(api as string)}/versions/${encodeURIComponent(version as string)}`, body);
  }

  private async deleteApiVersion(args: Record<string, unknown>): Promise<ToolResult> {
    const { project, location, api, version } = args as Record<string, string>;
    if (!project || !location || !api || !version) return { content: [{ type: 'text', text: 'project, location, api, and version are required' }], isError: true };
    return this.apiDelete(`${this.apiBase(project, location)}/apis/${encodeURIComponent(api)}/versions/${encodeURIComponent(version)}`);
  }

  private async listApiSpecs(args: Record<string, unknown>): Promise<ToolResult> {
    const { project, location, api, version, filter, pageSize, pageToken } = args as Record<string, string>;
    if (!project || !location || !api || !version) return { content: [{ type: 'text', text: 'project, location, api, and version are required' }], isError: true };
    const params = new URLSearchParams();
    if (filter) params.set('filter', filter);
    if (pageSize) params.set('pageSize', String(pageSize));
    if (pageToken) params.set('pageToken', pageToken);
    const qs = params.toString() ? `?${params}` : '';
    return this.apiGet(`${this.apiBase(project, location)}/apis/${encodeURIComponent(api)}/versions/${encodeURIComponent(version)}/specs${qs}`);
  }

  private async getApiSpec(args: Record<string, unknown>): Promise<ToolResult> {
    const { project, location, api, version, spec } = args as Record<string, string>;
    if (!project || !location || !api || !version || !spec) return { content: [{ type: 'text', text: 'project, location, api, version, and spec are required' }], isError: true };
    return this.apiGet(`${this.apiBase(project, location)}/apis/${encodeURIComponent(api)}/versions/${encodeURIComponent(version)}/specs/${encodeURIComponent(spec)}`);
  }

  private async getApiSpecContents(args: Record<string, unknown>): Promise<ToolResult> {
    const { project, location, api, version, spec } = args as Record<string, string>;
    if (!project || !location || !api || !version || !spec) return { content: [{ type: 'text', text: 'project, location, api, version, and spec are required' }], isError: true };
    return this.apiGet(`${this.apiBase(project, location)}/apis/${encodeURIComponent(api)}/versions/${encodeURIComponent(version)}/specs/${encodeURIComponent(spec)}:getContents`);
  }

  private async createApiSpec(args: Record<string, unknown>): Promise<ToolResult> {
    const { project, location, api, version, specId, mimeType, contents, description } = args;
    if (!project || !location || !api || !version || !specId) return { content: [{ type: 'text', text: 'project, location, api, version, and specId are required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (mimeType) body.mimeType = mimeType;
    if (contents) body.contents = contents;
    if (description) body.description = description;
    return this.apiPost(`${this.apiBase(project as string, location as string)}/apis/${encodeURIComponent(api as string)}/versions/${encodeURIComponent(version as string)}/specs?specId=${encodeURIComponent(specId as string)}`, body);
  }

  private async deleteApiSpec(args: Record<string, unknown>): Promise<ToolResult> {
    const { project, location, api, version, spec } = args as Record<string, string>;
    if (!project || !location || !api || !version || !spec) return { content: [{ type: 'text', text: 'project, location, api, version, and spec are required' }], isError: true };
    return this.apiDelete(`${this.apiBase(project, location)}/apis/${encodeURIComponent(api)}/versions/${encodeURIComponent(version)}/specs/${encodeURIComponent(spec)}`);
  }

  private async listApiSpecRevisions(args: Record<string, unknown>): Promise<ToolResult> {
    const { project, location, api, version, spec, pageToken } = args as Record<string, string>;
    if (!project || !location || !api || !version || !spec) return { content: [{ type: 'text', text: 'project, location, api, version, and spec are required' }], isError: true };
    const params = new URLSearchParams();
    if (pageToken) params.set('pageToken', pageToken);
    const qs = params.toString() ? `?${params}` : '';
    return this.apiGet(`${this.apiBase(project, location)}/apis/${encodeURIComponent(api)}/versions/${encodeURIComponent(version)}/specs/${encodeURIComponent(spec)}:listRevisions${qs}`);
  }

  private async rollbackApiSpec(args: Record<string, unknown>): Promise<ToolResult> {
    const { project, location, api, version, spec, revisionId } = args as Record<string, string>;
    if (!project || !location || !api || !version || !spec || !revisionId) return { content: [{ type: 'text', text: 'project, location, api, version, spec, and revisionId are required' }], isError: true };
    return this.apiPost(`${this.apiBase(project, location)}/apis/${encodeURIComponent(api)}/versions/${encodeURIComponent(version)}/specs/${encodeURIComponent(spec)}:rollback`, { revisionId });
  }

  private async listApiDeployments(args: Record<string, unknown>): Promise<ToolResult> {
    const { project, location, api, filter, pageSize, pageToken } = args as Record<string, string>;
    if (!project || !location || !api) return { content: [{ type: 'text', text: 'project, location, and api are required' }], isError: true };
    const params = new URLSearchParams();
    if (filter) params.set('filter', filter);
    if (pageSize) params.set('pageSize', String(pageSize));
    if (pageToken) params.set('pageToken', pageToken);
    const qs = params.toString() ? `?${params}` : '';
    return this.apiGet(`${this.apiBase(project, location)}/apis/${encodeURIComponent(api)}/deployments${qs}`);
  }

  private async getApiDeployment(args: Record<string, unknown>): Promise<ToolResult> {
    const { project, location, api, deployment } = args as Record<string, string>;
    if (!project || !location || !api || !deployment) return { content: [{ type: 'text', text: 'project, location, api, and deployment are required' }], isError: true };
    return this.apiGet(`${this.apiBase(project, location)}/apis/${encodeURIComponent(api)}/deployments/${encodeURIComponent(deployment)}`);
  }

  private async rollbackApiDeployment(args: Record<string, unknown>): Promise<ToolResult> {
    const { project, location, api, deployment, revisionId } = args as Record<string, string>;
    if (!project || !location || !api || !deployment || !revisionId) return { content: [{ type: 'text', text: 'project, location, api, deployment, and revisionId are required' }], isError: true };
    return this.apiPost(`${this.apiBase(project, location)}/apis/${encodeURIComponent(api)}/deployments/${encodeURIComponent(deployment)}:rollback`, { revisionId });
  }

  private async listArtifacts(args: Record<string, unknown>): Promise<ToolResult> {
    const { project, location, filter, pageSize, pageToken } = args as Record<string, string>;
    if (!project || !location) return { content: [{ type: 'text', text: 'project and location are required' }], isError: true };
    const params = new URLSearchParams();
    if (filter) params.set('filter', filter);
    if (pageSize) params.set('pageSize', String(pageSize));
    if (pageToken) params.set('pageToken', pageToken);
    const qs = params.toString() ? `?${params}` : '';
    return this.apiGet(`${this.apiBase(project, location)}/artifacts${qs}`);
  }

  private async getArtifact(args: Record<string, unknown>): Promise<ToolResult> {
    const { project, location, artifact } = args as Record<string, string>;
    if (!project || !location || !artifact) return { content: [{ type: 'text', text: 'project, location, and artifact are required' }], isError: true };
    return this.apiGet(`${this.apiBase(project, location)}/artifacts/${encodeURIComponent(artifact)}`);
  }

  private async getArtifactContents(args: Record<string, unknown>): Promise<ToolResult> {
    const { project, location, artifact } = args as Record<string, string>;
    if (!project || !location || !artifact) return { content: [{ type: 'text', text: 'project, location, and artifact are required' }], isError: true };
    return this.apiGet(`${this.apiBase(project, location)}/artifacts/${encodeURIComponent(artifact)}:getContents`);
  }

  static catalog() {
    return {
      name: 'apigee-registry',
      displayName: 'Apigee Registry',
      version: '1.0.0',
      category: 'devops' as const,
      keywords: ['apigee', 'registry', 'api-management', 'google-cloud', 'api-hub', 'openapi', 'specs', 'versioning', 'devops', 'deployments', 'artifacts'],
      toolNames: [
        'list_apis', 'get_api', 'create_api', 'update_api', 'delete_api',
        'list_api_versions', 'get_api_version', 'create_api_version', 'update_api_version', 'delete_api_version',
        'list_api_specs', 'get_api_spec', 'get_api_spec_contents', 'create_api_spec', 'delete_api_spec',
        'list_api_spec_revisions', 'rollback_api_spec',
        'list_api_deployments', 'get_api_deployment', 'rollback_api_deployment',
        'list_artifacts', 'get_artifact', 'get_artifact_contents',
      ],
      description: 'Apigee Registry adapter for managing APIs, versions, specs, deployments, and artifacts in Google Cloud API Hub.',
      author: 'protectnil' as const,
    };
  }
}

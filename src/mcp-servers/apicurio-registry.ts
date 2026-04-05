/**
 * Apicurio Registry MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// No official Apicurio Registry MCP server was found on GitHub.
//
// Base URL: http://{registry-host} (self-hosted; no SaaS base URL)
// Auth: None by default; can be configured with OIDC/Keycloak via HTTP Basic or Bearer
// Docs: https://www.apicur.io/registry/docs/apicurio-registry/2.4.x/index.html
// Rate limits: Self-hosted; no published limits

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface ApicurioRegistryConfig {
  baseUrl: string;  // e.g. http://registry.example.com
  token?: string;   // Optional Bearer token if auth is enabled
  username?: string;
  password?: string;
}

export class ApicurioRegistryMCPServer extends MCPAdapterBase {
  private readonly baseUrl: string;
  private readonly token?: string;
  private readonly username?: string;
  private readonly password?: string;

  constructor(config: ApicurioRegistryConfig) {
    super();
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.token = config.token;
    this.username = config.username;
    this.password = config.password;
  }

  get tools(): ToolDefinition[] {
    return [
      // ── Artifacts ───────────────────────────────────────────────────────────
      {
        name: 'list_artifacts',
        description: 'List artifacts in a group with optional filters for name, description, and labels',
        inputSchema: {
          type: 'object',
          properties: {
            groupId: { type: 'string', description: 'Group ID (use "default" for the default group)' },
            name: { type: 'string', description: 'Filter by artifact name' },
            description: { type: 'string', description: 'Filter by artifact description' },
            labels: { type: 'string', description: 'Filter by label (comma-separated key=value pairs)' },
            limit: { type: 'number', description: 'Max number of results (default: 20)' },
            offset: { type: 'number', description: 'Offset for pagination (default: 0)' },
          },
          required: ['groupId'],
        },
      },
      {
        name: 'create_artifact',
        description: 'Create a new artifact (schema/API definition) in the registry',
        inputSchema: {
          type: 'object',
          properties: {
            groupId: { type: 'string', description: 'Group ID for the artifact' },
            artifactId: { type: 'string', description: 'Artifact ID (optional; auto-generated if omitted)' },
            artifactType: { type: 'string', description: 'Artifact type: AVRO, PROTOBUF, JSON, OPENAPI, ASYNCAPI, GRAPHQL, KCONNECT, WSDL, XSD, XML' },
            content: { type: 'string', description: 'Artifact content (schema or API definition as a string)' },
            ifExists: { type: 'string', description: 'Conflict strategy: FAIL, UPDATE, RETURN, RETURN_OR_UPDATE' },
          },
          required: ['groupId', 'artifactType', 'content'],
        },
      },
      {
        name: 'get_artifact',
        description: 'Get the latest content of a specific artifact',
        inputSchema: {
          type: 'object',
          properties: {
            groupId: { type: 'string', description: 'Group ID' },
            artifactId: { type: 'string', description: 'Artifact ID' },
          },
          required: ['groupId', 'artifactId'],
        },
      },
      {
        name: 'update_artifact',
        description: 'Update the content of an artifact (creates a new version)',
        inputSchema: {
          type: 'object',
          properties: {
            groupId: { type: 'string', description: 'Group ID' },
            artifactId: { type: 'string', description: 'Artifact ID' },
            content: { type: 'string', description: 'New artifact content' },
          },
          required: ['groupId', 'artifactId', 'content'],
        },
      },
      {
        name: 'delete_artifact',
        description: 'Delete an artifact and all its versions from the registry',
        inputSchema: {
          type: 'object',
          properties: {
            groupId: { type: 'string', description: 'Group ID' },
            artifactId: { type: 'string', description: 'Artifact ID' },
          },
          required: ['groupId', 'artifactId'],
        },
      },
      {
        name: 'get_artifact_metadata',
        description: 'Get metadata for an artifact including name, description, labels, and state',
        inputSchema: {
          type: 'object',
          properties: {
            groupId: { type: 'string', description: 'Group ID' },
            artifactId: { type: 'string', description: 'Artifact ID' },
          },
          required: ['groupId', 'artifactId'],
        },
      },
      {
        name: 'update_artifact_metadata',
        description: 'Update metadata (name, description, labels) for an artifact',
        inputSchema: {
          type: 'object',
          properties: {
            groupId: { type: 'string', description: 'Group ID' },
            artifactId: { type: 'string', description: 'Artifact ID' },
            name: { type: 'string', description: 'New artifact name' },
            description: { type: 'string', description: 'New artifact description' },
            labels: { type: 'array', description: 'Labels to associate', items: { type: 'string' } },
          },
          required: ['groupId', 'artifactId'],
        },
      },
      // ── Artifact Versions ───────────────────────────────────────────────────
      {
        name: 'list_artifact_versions',
        description: 'List all versions of an artifact',
        inputSchema: {
          type: 'object',
          properties: {
            groupId: { type: 'string', description: 'Group ID' },
            artifactId: { type: 'string', description: 'Artifact ID' },
            limit: { type: 'number', description: 'Max results (default: 20)' },
            offset: { type: 'number', description: 'Pagination offset' },
          },
          required: ['groupId', 'artifactId'],
        },
      },
      {
        name: 'get_artifact_version',
        description: 'Get the content of a specific artifact version',
        inputSchema: {
          type: 'object',
          properties: {
            groupId: { type: 'string', description: 'Group ID' },
            artifactId: { type: 'string', description: 'Artifact ID' },
            version: { type: 'string', description: 'Version string (e.g. "1", "2")' },
          },
          required: ['groupId', 'artifactId', 'version'],
        },
      },
      // ── Artifact Rules ──────────────────────────────────────────────────────
      {
        name: 'list_artifact_rules',
        description: 'List rules configured for a specific artifact (VALIDITY, COMPATIBILITY)',
        inputSchema: {
          type: 'object',
          properties: {
            groupId: { type: 'string', description: 'Group ID' },
            artifactId: { type: 'string', description: 'Artifact ID' },
          },
          required: ['groupId', 'artifactId'],
        },
      },
      {
        name: 'create_artifact_rule',
        description: 'Add a validation or compatibility rule to an artifact',
        inputSchema: {
          type: 'object',
          properties: {
            groupId: { type: 'string', description: 'Group ID' },
            artifactId: { type: 'string', description: 'Artifact ID' },
            ruleType: { type: 'string', description: 'Rule type: VALIDITY or COMPATIBILITY' },
            config: { type: 'string', description: 'Rule config: FULL, SYNTAX_ONLY (VALIDITY) or BACKWARD, FORWARD, FULL, NONE (COMPATIBILITY)' },
          },
          required: ['groupId', 'artifactId', 'ruleType', 'config'],
        },
      },
      // ── Groups ──────────────────────────────────────────────────────────────
      {
        name: 'list_groups',
        description: 'List all groups in the registry',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Max results (default: 20)' },
            offset: { type: 'number', description: 'Pagination offset' },
          },
        },
      },
      {
        name: 'create_group',
        description: 'Create a new artifact group in the registry',
        inputSchema: {
          type: 'object',
          properties: {
            groupId: { type: 'string', description: 'Unique group ID' },
            description: { type: 'string', description: 'Group description' },
            labels: { type: 'object', description: 'Key-value label pairs' },
          },
          required: ['groupId'],
        },
      },
      {
        name: 'delete_group',
        description: 'Delete a group and all artifacts within it',
        inputSchema: {
          type: 'object',
          properties: {
            groupId: { type: 'string', description: 'Group ID to delete' },
          },
          required: ['groupId'],
        },
      },
      // ── Global Rules ────────────────────────────────────────────────────────
      {
        name: 'list_global_rules',
        description: 'List all global rules configured for the registry (apply to all artifacts)',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'create_global_rule',
        description: 'Create a global registry rule (VALIDITY or COMPATIBILITY) that applies to all artifacts',
        inputSchema: {
          type: 'object',
          properties: {
            ruleType: { type: 'string', description: 'Rule type: VALIDITY or COMPATIBILITY' },
            config: { type: 'string', description: 'Rule configuration value' },
          },
          required: ['ruleType', 'config'],
        },
      },
      {
        name: 'delete_all_global_rules',
        description: 'Delete all global rules from the registry',
        inputSchema: { type: 'object', properties: {} },
      },
      // ── Admin ───────────────────────────────────────────────────────────────
      {
        name: 'list_artifact_types',
        description: 'List all supported artifact types in the registry',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'export_registry_data',
        description: 'Export all registry data as a ZIP archive (useful for backup/migration)',
        inputSchema: { type: 'object', properties: {} },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_artifacts': return await this.listArtifacts(args);
        case 'create_artifact': return await this.createArtifact(args);
        case 'get_artifact': return await this.getArtifact(args);
        case 'update_artifact': return await this.updateArtifact(args);
        case 'delete_artifact': return await this.deleteArtifact(args);
        case 'get_artifact_metadata': return await this.getArtifactMetadata(args);
        case 'update_artifact_metadata': return await this.updateArtifactMetadata(args);
        case 'list_artifact_versions': return await this.listArtifactVersions(args);
        case 'get_artifact_version': return await this.getArtifactVersion(args);
        case 'list_artifact_rules': return await this.listArtifactRules(args);
        case 'create_artifact_rule': return await this.createArtifactRule(args);
        case 'list_groups': return await this.listGroups(args);
        case 'create_group': return await this.createGroup(args);
        case 'delete_group': return await this.deleteGroup(args);
        case 'list_global_rules': return await this.listGlobalRules();
        case 'create_global_rule': return await this.createGlobalRule(args);
        case 'delete_all_global_rules': return await this.deleteAllGlobalRules();
        case 'list_artifact_types': return await this.listArtifactTypes();
        case 'export_registry_data': return await this.exportRegistryData();
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
    const h: Record<string, string> = { 'Content-Type': 'application/json', Accept: 'application/json' };
    if (this.token) {
      h['Authorization'] = `Bearer ${this.token}`;
    } else if (this.username && this.password) {
      h['Authorization'] = `Basic ${Buffer.from(`${this.username}:${this.password}`).toString('base64')}`;
    }
    return h;
  }

  private async fetchJSON(url: string, init?: RequestInit): Promise<ToolResult> {
    const response = await this.fetchWithRetry(url, { headers: this.headers, ...init });
    let data: unknown;
    try { data = await response.json(); } catch { data = { status: response.status, statusText: response.statusText }; }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: !response.ok };
  }

  private artifactBase(groupId: string, artifactId: string): string {
    return `${this.baseUrl}/apis/registry/v2/groups/${encodeURIComponent(groupId)}/artifacts/${encodeURIComponent(artifactId)}`;
  }

  private async listArtifacts(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.name) params.set('name', String(args.name));
    if (args.description) params.set('description', String(args.description));
    if (args.labels) params.set('labels', String(args.labels));
    params.set('limit', String((args.limit as number) ?? 20));
    params.set('offset', String((args.offset as number) ?? 0));
    return this.fetchJSON(`${this.baseUrl}/apis/registry/v2/groups/${encodeURIComponent(String(args.groupId))}/artifacts?${params}`);
  }

  private async createArtifact(args: Record<string, unknown>): Promise<ToolResult> {
    const headers: Record<string, string> = { ...this.headers, 'X-Registry-ArtifactType': String(args.artifactType), 'Content-Type': 'application/json' };
    if (args.artifactId) headers['X-Registry-ArtifactId'] = String(args.artifactId);
    const params = new URLSearchParams();
    if (args.ifExists) params.set('ifExists', String(args.ifExists));
    const qs = params.toString();
    return this.fetchJSON(
      `${this.baseUrl}/apis/registry/v2/groups/${encodeURIComponent(String(args.groupId))}/artifacts${qs ? `?${qs}` : ''}`,
      { method: 'POST', headers, body: String(args.content) },
    );
  }

  private async getArtifact(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fetchJSON(this.artifactBase(String(args.groupId), String(args.artifactId)));
  }

  private async updateArtifact(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fetchJSON(this.artifactBase(String(args.groupId), String(args.artifactId)), {
      method: 'PUT',
      body: String(args.content),
    });
  }

  private async deleteArtifact(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fetchJSON(this.artifactBase(String(args.groupId), String(args.artifactId)), { method: 'DELETE' });
  }

  private async getArtifactMetadata(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fetchJSON(`${this.artifactBase(String(args.groupId), String(args.artifactId))}/meta`);
  }

  private async updateArtifactMetadata(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {};
    if (args.name) body.name = args.name;
    if (args.description) body.description = args.description;
    if (args.labels) body.labels = args.labels;
    return this.fetchJSON(`${this.artifactBase(String(args.groupId), String(args.artifactId))}/meta`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  private async listArtifactVersions(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    params.set('limit', String((args.limit as number) ?? 20));
    params.set('offset', String((args.offset as number) ?? 0));
    return this.fetchJSON(`${this.artifactBase(String(args.groupId), String(args.artifactId))}/versions?${params}`);
  }

  private async getArtifactVersion(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fetchJSON(`${this.artifactBase(String(args.groupId), String(args.artifactId))}/versions/${encodeURIComponent(String(args.version))}`);
  }

  private async listArtifactRules(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fetchJSON(`${this.artifactBase(String(args.groupId), String(args.artifactId))}/rules`);
  }

  private async createArtifactRule(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fetchJSON(`${this.artifactBase(String(args.groupId), String(args.artifactId))}/rules`, {
      method: 'POST',
      body: JSON.stringify({ ruleType: args.ruleType, config: args.config }),
    });
  }

  private async listGroups(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    params.set('limit', String((args.limit as number) ?? 20));
    params.set('offset', String((args.offset as number) ?? 0));
    return this.fetchJSON(`${this.baseUrl}/apis/registry/v2/groups?${params}`);
  }

  private async createGroup(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = { id: args.groupId };
    if (args.description) body.description = args.description;
    if (args.labels) body.labels = args.labels;
    return this.fetchJSON(`${this.baseUrl}/apis/registry/v2/groups`, { method: 'POST', body: JSON.stringify(body) });
  }

  private async deleteGroup(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fetchJSON(`${this.baseUrl}/apis/registry/v2/groups/${encodeURIComponent(String(args.groupId))}`, { method: 'DELETE' });
  }

  private async listGlobalRules(): Promise<ToolResult> {
    return this.fetchJSON(`${this.baseUrl}/apis/registry/v2/admin/rules`);
  }

  private async createGlobalRule(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fetchJSON(`${this.baseUrl}/apis/registry/v2/admin/rules`, {
      method: 'POST',
      body: JSON.stringify({ ruleType: args.ruleType, config: args.config }),
    });
  }

  private async deleteAllGlobalRules(): Promise<ToolResult> {
    return this.fetchJSON(`${this.baseUrl}/apis/registry/v2/admin/rules`, { method: 'DELETE' });
  }

  private async listArtifactTypes(): Promise<ToolResult> {
    return this.fetchJSON(`${this.baseUrl}/apis/registry/v2/admin/artifactTypes`);
  }

  private async exportRegistryData(): Promise<ToolResult> {
    return this.fetchJSON(`${this.baseUrl}/apis/registry/v2/admin/export`);
  }

  static catalog() {
    return {
      name: 'apicurio-registry',
      displayName: 'Apicurio Registry',
      version: '1.0.0',
      category: 'devops' as const,
      keywords: ['apicurio', 'registry', 'schema', 'avro', 'protobuf', 'openapi', 'asyncapi', 'kafka', 'schema-registry'],
      toolNames: [
        'list_artifacts', 'create_artifact', 'get_artifact', 'update_artifact', 'delete_artifact',
        'get_artifact_metadata', 'update_artifact_metadata', 'list_artifact_versions', 'get_artifact_version',
        'list_artifact_rules', 'create_artifact_rule', 'list_groups', 'create_group', 'delete_group',
        'list_global_rules', 'create_global_rule', 'delete_all_global_rules', 'list_artifact_types', 'export_registry_data',
      ],
      description: 'Manage schemas and API definitions in Apicurio Registry: create/update/delete artifacts, enforce compatibility rules, and manage groups.',
      author: 'protectnil' as const,
    };
  }
}

/**
 * JFrog Artifactory MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/jfrog/mcp-jfrog — experimental open-source JFrog MCP server;
//   transport: stdio (default) or SSE, auth: JFrog Access Token. Actively maintained (last
//   README update Mar 2026). JFrog also hosts an official managed remote MCP server at
//   https://github.com/jfrog/jfrog-mcp-server (Cloud SaaS only, OAuth, no install required).
//   Vendor MCP (mcp-jfrog) tools: jfrog_get_package_info, jfrog_get_package_versions,
//     jfrog_get_package_version_vulnerabilities, create_local_repository, create_remote_repository,
//     create_virtual_repository, list_repositories, set_folder_property, execute_aql,
//     list_jfrog_builds, get_specific_build, list_jfrog_runtime_clusters, create_project (~13 tools).
//   Our adapter covers: 14 tools (core artifact and repository operations).
// Recommendation: use-both — vendor MCP has unique tools (create_local_repository,
//   create_remote_repository, create_virtual_repository, jfrog_get_package_info,
//   jfrog_get_package_versions, jfrog_get_package_version_vulnerabilities, set_folder_property,
//   create_project, list_jfrog_runtime_clusters) not in our adapter; our adapter has
//   get_artifact_info, get_artifact_properties, set_artifact_properties, search_artifacts_quick,
//   copy_artifact, move_artifact, delete_artifact, get_storage_summary, get_system_info not
//   in vendor MCP. Air-gapped/self-hosted deployments use REST adapter only.
//
// Integration: use-both
// MCP-sourced tools (9 unique): create_local_repository, create_remote_repository,
//   create_virtual_repository, jfrog_get_package_info, jfrog_get_package_versions,
//   jfrog_get_package_version_vulnerabilities, set_folder_property, create_project,
//   list_jfrog_runtime_clusters
// REST-sourced tools (9 unique): get_artifact_info, get_artifact_properties,
//   set_artifact_properties, search_artifacts_quick, copy_artifact, move_artifact,
//   delete_artifact, get_storage_summary, get_system_info
// Shared tools (5 overlap): list_repositories, search_artifacts_aql→execute_aql,
//   list_builds→list_jfrog_builds, get_build_info→get_specific_build, get_repository
// Combined coverage: 23 tools (MCP: 13 + REST: 14 - shared: 4)
//
// Base URL: https://mycompany.jfrog.io (customer-hosted; required in config, no default)
// Auth: Bearer token (JFrog Platform Access Token — preferred over Basic auth)
// Docs: https://jfrog.com/help/r/jfrog-rest-apis/artifactory-rest-apis
// Rate limits: Not publicly documented; governed by Artifactory server configuration

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface JFrogArtifactoryConfig {
  /** JFrog Platform base URL, e.g. https://mycompany.jfrog.io (no trailing slash) */
  baseUrl: string;
  /** JFrog Platform Access Token (recommended) or API key */
  accessToken: string;
}

export class JFrogArtifactoryMCPServer extends MCPAdapterBase {
  private readonly baseUrl: string;
  private readonly accessToken: string;

  constructor(config: JFrogArtifactoryConfig) {
    super();
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.accessToken = config.accessToken;
  }

  static catalog() {
    return {
      name: 'jfrog-artifactory',
      displayName: 'JFrog Artifactory',
      version: '1.0.0',
      category: 'devops' as const,
      keywords: ['jfrog', 'artifactory', 'artifact', 'repository', 'binary', 'package', 'docker', 'maven', 'npm', 'helm', 'pypi', 'build', 'xray', 'scan'],
      toolNames: [
        'list_repositories',
        'get_repository',
        'get_artifact_info',
        'get_artifact_properties',
        'set_artifact_properties',
        'search_artifacts_aql',
        'search_artifacts_quick',
        'copy_artifact',
        'move_artifact',
        'delete_artifact',
        'get_storage_summary',
        'list_builds',
        'get_build_info',
        'get_system_info',
      ],
      description: 'Binary artifact management: search, retrieve, copy, move, and delete artifacts; manage repositories; query build info; and inspect storage usage in JFrog Artifactory.',
      author: 'protectnil' as const,
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_repositories',
        description: 'List all repositories in Artifactory filtered by type (local, remote, virtual, federated) or package type',
        inputSchema: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              description: 'Filter by repository type: local, remote, virtual, federated (omit for all)',
            },
            packageType: {
              type: 'string',
              description: 'Filter by package type, e.g. maven, npm, docker, pypi, helm, gradle, nuget, rpm',
            },
          },
        },
      },
      {
        name: 'get_repository',
        description: 'Get full configuration details for a specific Artifactory repository by key',
        inputSchema: {
          type: 'object',
          properties: {
            repoKey: {
              type: 'string',
              description: 'Repository key (name), e.g. libs-release-local',
            },
          },
          required: ['repoKey'],
        },
      },
      {
        name: 'get_artifact_info',
        description: 'Get metadata, checksums, and storage details for an artifact by its repository path',
        inputSchema: {
          type: 'object',
          properties: {
            repoKey: {
              type: 'string',
              description: 'Repository key',
            },
            artifactPath: {
              type: 'string',
              description: 'Path to the artifact within the repository, e.g. com/example/app/1.0/app-1.0.jar',
            },
          },
          required: ['repoKey', 'artifactPath'],
        },
      },
      {
        name: 'get_artifact_properties',
        description: 'Retrieve custom properties attached to an artifact or folder in Artifactory',
        inputSchema: {
          type: 'object',
          properties: {
            repoKey: {
              type: 'string',
              description: 'Repository key',
            },
            artifactPath: {
              type: 'string',
              description: 'Path to the artifact or folder within the repository',
            },
            properties: {
              type: 'string',
              description: 'Comma-separated list of property names to retrieve (omit to return all properties)',
            },
          },
          required: ['repoKey', 'artifactPath'],
        },
      },
      {
        name: 'set_artifact_properties',
        description: 'Attach or update custom key-value properties on an artifact or folder in Artifactory',
        inputSchema: {
          type: 'object',
          properties: {
            repoKey: {
              type: 'string',
              description: 'Repository key',
            },
            artifactPath: {
              type: 'string',
              description: 'Path to the artifact or folder within the repository',
            },
            properties: {
              type: 'object',
              description: 'Key-value map of properties to set, e.g. {"status": "approved", "version": "1.0.0"}',
            },
            recursive: {
              type: 'boolean',
              description: 'Apply properties recursively to folder contents (default: false)',
            },
          },
          required: ['repoKey', 'artifactPath', 'properties'],
        },
      },
      {
        name: 'search_artifacts_aql',
        description: 'Search for artifacts using Artifactory Query Language (AQL) for complex cross-repo queries by name, property, date, or build',
        inputSchema: {
          type: 'object',
          properties: {
            aqlQuery: {
              type: 'string',
              description: 'AQL query string, e.g. items.find({"repo": "libs-release-local", "name": {"$match": "*.jar"}}).include("name","path","size")',
            },
          },
          required: ['aqlQuery'],
        },
      },
      {
        name: 'search_artifacts_quick',
        description: 'Quick search for artifacts by name pattern across all or specific repositories using the Artifactory quick search API',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Artifact name or pattern to search for, e.g. app-1.0.jar or *.jar',
            },
            repos: {
              type: 'array',
              items: { type: 'string' },
              description: 'List of repository keys to search in (omit to search all repositories)',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'copy_artifact',
        description: 'Copy an artifact or folder to a different repository or path within Artifactory',
        inputSchema: {
          type: 'object',
          properties: {
            sourceRepoKey: {
              type: 'string',
              description: 'Source repository key',
            },
            sourcePath: {
              type: 'string',
              description: 'Path to the source artifact or folder',
            },
            targetRepoKey: {
              type: 'string',
              description: 'Target repository key to copy into',
            },
            targetPath: {
              type: 'string',
              description: 'Target path within the destination repository',
            },
          },
          required: ['sourceRepoKey', 'sourcePath', 'targetRepoKey', 'targetPath'],
        },
      },
      {
        name: 'move_artifact',
        description: 'Move an artifact or folder to a different repository or path within Artifactory',
        inputSchema: {
          type: 'object',
          properties: {
            sourceRepoKey: {
              type: 'string',
              description: 'Source repository key',
            },
            sourcePath: {
              type: 'string',
              description: 'Path to the source artifact or folder',
            },
            targetRepoKey: {
              type: 'string',
              description: 'Target repository key to move into',
            },
            targetPath: {
              type: 'string',
              description: 'Target path within the destination repository',
            },
          },
          required: ['sourceRepoKey', 'sourcePath', 'targetRepoKey', 'targetPath'],
        },
      },
      {
        name: 'delete_artifact',
        description: 'Delete an artifact or folder from an Artifactory repository (irreversible)',
        inputSchema: {
          type: 'object',
          properties: {
            repoKey: {
              type: 'string',
              description: 'Repository key',
            },
            artifactPath: {
              type: 'string',
              description: 'Path to the artifact or folder to delete',
            },
          },
          required: ['repoKey', 'artifactPath'],
        },
      },
      {
        name: 'get_storage_summary',
        description: 'Get a summary of storage consumption across all Artifactory repositories including artifact count and size',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'list_builds',
        description: 'List all build names tracked in Artifactory across all CI/CD pipelines',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_build_info',
        description: 'Get detailed build information for a specific build name and number, including modules and artifacts',
        inputSchema: {
          type: 'object',
          properties: {
            buildName: {
              type: 'string',
              description: 'Name of the build as registered in Artifactory',
            },
            buildNumber: {
              type: 'string',
              description: 'Build number (string, as some CI systems use non-integer build numbers)',
            },
          },
          required: ['buildName', 'buildNumber'],
        },
      },
      {
        name: 'get_system_info',
        description: 'Get Artifactory system information including version, license, and server details',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_repositories':
          return await this.listRepositories(args);
        case 'get_repository':
          return await this.getRepository(args);
        case 'get_artifact_info':
          return await this.getArtifactInfo(args);
        case 'get_artifact_properties':
          return await this.getArtifactProperties(args);
        case 'set_artifact_properties':
          return await this.setArtifactProperties(args);
        case 'search_artifacts_aql':
          return await this.searchArtifactsAql(args);
        case 'search_artifacts_quick':
          return await this.searchArtifactsQuick(args);
        case 'copy_artifact':
          return await this.copyArtifact(args);
        case 'move_artifact':
          return await this.moveArtifact(args);
        case 'delete_artifact':
          return await this.deleteArtifact(args);
        case 'get_storage_summary':
          return await this.getStorageSummary();
        case 'list_builds':
          return await this.listBuilds();
        case 'get_build_info':
          return await this.getBuildInfo(args);
        case 'get_system_info':
          return await this.getSystemInfo();
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

  private headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
    };
  }

  private async fetchJson(url: string, options: RequestInit = {}): Promise<ToolResult> {
    const response = await this.fetchWithRetry(url, { headers: this.headers(), ...options });
    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `Artifactory API error: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }
    const text = await response.text();
    if (!text) {
      return { content: [{ type: 'text', text: 'OK' }], isError: false };
    }
    let data: unknown;
    try { data = JSON.parse(text); } catch { throw new Error(`Artifactory returned non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async listRepositories(args: Record<string, unknown>): Promise<ToolResult> {
    let url = `${this.baseUrl}/artifactory/api/repositories`;
    const params: string[] = [];
    if (args.type) params.push(`type=${encodeURIComponent(args.type as string)}`);
    if (args.packageType) params.push(`packageType=${encodeURIComponent(args.packageType as string)}`);
    if (params.length > 0) url += `?${params.join('&')}`;
    return this.fetchJson(url);
  }

  private async getRepository(args: Record<string, unknown>): Promise<ToolResult> {
    const repoKey = args.repoKey as string;
    if (!repoKey) {
      return { content: [{ type: 'text', text: 'repoKey is required' }], isError: true };
    }
    return this.fetchJson(`${this.baseUrl}/artifactory/api/repositories/${encodeURIComponent(repoKey)}`);
  }

  private async getArtifactInfo(args: Record<string, unknown>): Promise<ToolResult> {
    const repoKey = args.repoKey as string;
    const artifactPath = args.artifactPath as string;
    if (!repoKey || !artifactPath) {
      return { content: [{ type: 'text', text: 'repoKey and artifactPath are required' }], isError: true };
    }
    return this.fetchJson(`${this.baseUrl}/artifactory/api/storage/${encodeURIComponent(repoKey)}/${artifactPath}`);
  }

  private async getArtifactProperties(args: Record<string, unknown>): Promise<ToolResult> {
    const repoKey = args.repoKey as string;
    const artifactPath = args.artifactPath as string;
    if (!repoKey || !artifactPath) {
      return { content: [{ type: 'text', text: 'repoKey and artifactPath are required' }], isError: true };
    }
    let url = `${this.baseUrl}/artifactory/api/storage/${encodeURIComponent(repoKey)}/${artifactPath}?properties`;
    if (args.properties) {
      url += `=${encodeURIComponent(args.properties as string)}`;
    }
    return this.fetchJson(url);
  }

  private async setArtifactProperties(args: Record<string, unknown>): Promise<ToolResult> {
    const repoKey = args.repoKey as string;
    const artifactPath = args.artifactPath as string;
    const properties = args.properties as Record<string, string>;
    if (!repoKey || !artifactPath || !properties) {
      return { content: [{ type: 'text', text: 'repoKey, artifactPath, and properties are required' }], isError: true };
    }
    // Build matrix parameter string: key=val1,val2;key2=val3
    const propString = Object.entries(properties)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join(';');
    const recursive = args.recursive === true ? '&recursive=1' : '';
    const url = `${this.baseUrl}/artifactory/api/storage/${encodeURIComponent(repoKey)}/${artifactPath}?properties=${propString}${recursive}`;
    const response = await this.fetchWithRetry(url, { method: 'PUT', headers: this.headers() });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Artifactory API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: `Properties set on ${repoKey}/${artifactPath}` }], isError: false };
  }

  private async searchArtifactsAql(args: Record<string, unknown>): Promise<ToolResult> {
    const aqlQuery = args.aqlQuery as string;
    if (!aqlQuery) {
      return { content: [{ type: 'text', text: 'aqlQuery is required' }], isError: true };
    }
    const headers = { ...this.headers(), 'Content-Type': 'text/plain' };
    const response = await this.fetchWithRetry(`${this.baseUrl}/artifactory/api/search/aql`, {
      method: 'POST',
      headers,
      body: aqlQuery,
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Artifactory AQL error: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Artifactory returned non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async searchArtifactsQuick(args: Record<string, unknown>): Promise<ToolResult> {
    const name = args.name as string;
    if (!name) {
      return { content: [{ type: 'text', text: 'name is required' }], isError: true };
    }
    let url = `${this.baseUrl}/artifactory/api/search/artifact?name=${encodeURIComponent(name)}`;
    if (args.repos && Array.isArray(args.repos)) {
      url += `&repos=${(args.repos as string[]).join(',')}`;
    }
    return this.fetchJson(url);
  }

  private async copyArtifact(args: Record<string, unknown>): Promise<ToolResult> {
    const sourceRepoKey = args.sourceRepoKey as string;
    const sourcePath = args.sourcePath as string;
    const targetRepoKey = args.targetRepoKey as string;
    const targetPath = args.targetPath as string;
    if (!sourceRepoKey || !sourcePath || !targetRepoKey || !targetPath) {
      return { content: [{ type: 'text', text: 'sourceRepoKey, sourcePath, targetRepoKey, and targetPath are required' }], isError: true };
    }
    const url = `${this.baseUrl}/artifactory/api/copy/${encodeURIComponent(sourceRepoKey)}/${sourcePath}?to=/${encodeURIComponent(targetRepoKey)}/${targetPath}`;
    const response = await this.fetchWithRetry(url, { method: 'POST', headers: this.headers() });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Artifactory copy error: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Artifactory returned non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async moveArtifact(args: Record<string, unknown>): Promise<ToolResult> {
    const sourceRepoKey = args.sourceRepoKey as string;
    const sourcePath = args.sourcePath as string;
    const targetRepoKey = args.targetRepoKey as string;
    const targetPath = args.targetPath as string;
    if (!sourceRepoKey || !sourcePath || !targetRepoKey || !targetPath) {
      return { content: [{ type: 'text', text: 'sourceRepoKey, sourcePath, targetRepoKey, and targetPath are required' }], isError: true };
    }
    const url = `${this.baseUrl}/artifactory/api/move/${encodeURIComponent(sourceRepoKey)}/${sourcePath}?to=/${encodeURIComponent(targetRepoKey)}/${targetPath}`;
    const response = await this.fetchWithRetry(url, { method: 'POST', headers: this.headers() });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Artifactory move error: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Artifactory returned non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async deleteArtifact(args: Record<string, unknown>): Promise<ToolResult> {
    const repoKey = args.repoKey as string;
    const artifactPath = args.artifactPath as string;
    if (!repoKey || !artifactPath) {
      return { content: [{ type: 'text', text: 'repoKey and artifactPath are required' }], isError: true };
    }
    const url = `${this.baseUrl}/artifactory/${encodeURIComponent(repoKey)}/${artifactPath}`;
    const response = await this.fetchWithRetry(url, { method: 'DELETE', headers: this.headers() });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Artifactory delete error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: `Artifact deleted: ${repoKey}/${artifactPath}` }], isError: false };
  }

  private async getStorageSummary(): Promise<ToolResult> {
    return this.fetchJson(`${this.baseUrl}/artifactory/api/storageinfo`);
  }

  private async listBuilds(): Promise<ToolResult> {
    return this.fetchJson(`${this.baseUrl}/artifactory/api/build`);
  }

  private async getBuildInfo(args: Record<string, unknown>): Promise<ToolResult> {
    const buildName = args.buildName as string;
    const buildNumber = args.buildNumber as string;
    if (!buildName || !buildNumber) {
      return { content: [{ type: 'text', text: 'buildName and buildNumber are required' }], isError: true };
    }
    return this.fetchJson(`${this.baseUrl}/artifactory/api/build/${encodeURIComponent(buildName)}/${encodeURIComponent(buildNumber)}`);
  }

  private async getSystemInfo(): Promise<ToolResult> {
    return this.fetchJson(`${this.baseUrl}/artifactory/api/system/info`);
  }
}

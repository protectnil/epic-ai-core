/**
 * TeamCity MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// No official JetBrains/TeamCity MCP server found. Community MCP exists (github.com/Daghis/teamcity-mcp,
// 87 tools, actively maintained) but is NOT published by JetBrains — fails criterion 1 (vendor official).
// Decision: use-rest-api
//
// Base URL: {your-teamcity-host}/app/rest  (self-hosted; no fixed domain)
// Auth: Bearer token (personal access token) in Authorization header — generated in My Settings & Tools > Access Tokens
//       Also supports Basic auth: Authorization: Basic base64(username:password)
// Docs: https://www.jetbrains.com/help/teamcity/rest/teamcity-rest-api-documentation.html
// Rate limits: No documented rate limits; determined by TeamCity server capacity

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface TeamCityConfig {
  token: string;
  baseUrl: string;
  authType?: 'token' | 'basic';
  username?: string;
}

export class TeamCityMCPServer extends MCPAdapterBase {
  private readonly token: string;
  private readonly baseUrl: string;
  private readonly authType: string;
  private readonly username: string;

  constructor(config: TeamCityConfig) {
    super();
    this.token = config.token;
    // baseUrl should include /app/rest, e.g. https://teamcity.example.com/app/rest
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.authType = config.authType || 'token';
    this.username = config.username || '';
  }

  static catalog() {
    return {
      name: 'teamcity',
      displayName: 'TeamCity',
      version: '1.0.0',
      category: 'devops',
      keywords: [
        'teamcity', 'ci', 'cd', 'continuous integration', 'continuous delivery',
        'builds', 'pipelines', 'projects', 'build configuration', 'agents', 'jetbrains',
        'test results', 'artifacts', 'deployment', 'build queue',
      ],
      toolNames: [
        'list_projects', 'get_project', 'create_project',
        'list_build_configs', 'get_build_config', 'pause_build_config', 'resume_build_config',
        'list_builds', 'get_build', 'trigger_build', 'cancel_build', 'pin_build',
        'list_build_queue', 'get_build_log', 'list_artifacts',
        'list_agents', 'get_agent', 'enable_agent', 'disable_agent',
        'list_changes', 'get_change',
      ],
      description: 'TeamCity CI/CD platform: manage projects, build configurations, trigger and monitor builds, inspect agents, and retrieve test results and artifacts.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_projects',
        description: 'List all projects in the TeamCity server with names, IDs, and parent project information',
        inputSchema: {
          type: 'object',
          properties: {
            locator: {
              type: 'string',
              description: 'TeamCity project locator for filtering (e.g. archived:false)',
            },
          },
        },
      },
      {
        name: 'get_project',
        description: 'Get full details of a TeamCity project by project ID including build configurations and parameters',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: {
              type: 'string',
              description: 'TeamCity project ID (e.g. MyProject)',
            },
          },
          required: ['project_id'],
        },
      },
      {
        name: 'create_project',
        description: 'Create a new TeamCity project under a specified parent project',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Display name of the new project',
            },
            id: {
              type: 'string',
              description: 'Unique project ID (alphanumeric, no spaces)',
            },
            parent_project_id: {
              type: 'string',
              description: 'Parent project ID (use _Root for top-level projects)',
            },
          },
          required: ['name', 'id'],
        },
      },
      {
        name: 'list_build_configs',
        description: 'List all build configurations in a project with their IDs, names, and pause status',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: {
              type: 'string',
              description: 'Project ID to list build configurations for (omit for all projects)',
            },
          },
        },
      },
      {
        name: 'get_build_config',
        description: 'Get full configuration details of a build type including steps, triggers, and parameters',
        inputSchema: {
          type: 'object',
          properties: {
            build_config_id: {
              type: 'string',
              description: 'Build configuration ID (e.g. MyProject_Build)',
            },
          },
          required: ['build_config_id'],
        },
      },
      {
        name: 'pause_build_config',
        description: 'Pause a build configuration to prevent it from being triggered automatically or manually',
        inputSchema: {
          type: 'object',
          properties: {
            build_config_id: {
              type: 'string',
              description: 'Build configuration ID to pause',
            },
          },
          required: ['build_config_id'],
        },
      },
      {
        name: 'resume_build_config',
        description: 'Resume a paused build configuration so it can be triggered again',
        inputSchema: {
          type: 'object',
          properties: {
            build_config_id: {
              type: 'string',
              description: 'Build configuration ID to resume',
            },
          },
          required: ['build_config_id'],
        },
      },
      {
        name: 'list_builds',
        description: 'List builds with optional filters for build configuration, status, branch, date range, and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            build_config_id: {
              type: 'string',
              description: 'Filter by build configuration ID',
            },
            status: {
              type: 'string',
              description: 'Filter by build status: SUCCESS, FAILURE, ERROR, UNKNOWN (default: all)',
            },
            branch: {
              type: 'string',
              description: 'Filter by branch name (e.g. main, feature/my-branch)',
            },
            count: {
              type: 'number',
              description: 'Maximum number of builds to return (default: 50, max: 1000)',
            },
            start: {
              type: 'number',
              description: 'Pagination offset (default: 0)',
            },
            running: {
              type: 'boolean',
              description: 'Filter for currently running builds (default: all)',
            },
          },
        },
      },
      {
        name: 'get_build',
        description: 'Get full details of a specific build by build ID including status, duration, parameters, and test results',
        inputSchema: {
          type: 'object',
          properties: {
            build_id: {
              type: 'string',
              description: 'Numeric build ID or build locator string',
            },
          },
          required: ['build_id'],
        },
      },
      {
        name: 'trigger_build',
        description: 'Trigger a new build for a build configuration with optional branch and custom parameters',
        inputSchema: {
          type: 'object',
          properties: {
            build_config_id: {
              type: 'string',
              description: 'Build configuration ID to trigger (e.g. MyProject_Build)',
            },
            branch: {
              type: 'string',
              description: 'Branch name to build (e.g. main, refs/heads/feature)',
            },
            parameters: {
              type: 'object',
              description: 'Custom build parameters as key-value pairs (e.g. {"env.MY_VAR": "value"})',
            },
            comment: {
              type: 'string',
              description: 'Comment to attach to the triggered build',
            },
          },
          required: ['build_config_id'],
        },
      },
      {
        name: 'cancel_build',
        description: 'Cancel a running or queued build by build ID with an optional comment',
        inputSchema: {
          type: 'object',
          properties: {
            build_id: {
              type: 'string',
              description: 'Numeric build ID to cancel',
            },
            comment: {
              type: 'string',
              description: 'Reason for cancelling the build',
            },
            readdToQueue: {
              type: 'boolean',
              description: 'Re-add the build to the queue after cancelling (default: false)',
            },
          },
          required: ['build_id'],
        },
      },
      {
        name: 'pin_build',
        description: 'Pin a build to prevent it from being automatically cleaned up by TeamCity cleanup policies',
        inputSchema: {
          type: 'object',
          properties: {
            build_id: {
              type: 'string',
              description: 'Numeric build ID to pin',
            },
            comment: {
              type: 'string',
              description: 'Reason for pinning the build',
            },
          },
          required: ['build_id'],
        },
      },
      {
        name: 'list_build_queue',
        description: 'List builds currently in the TeamCity build queue waiting to be processed by agents',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: {
              type: 'string',
              description: 'Filter queue by project ID (default: all projects)',
            },
            agent_id: {
              type: 'string',
              description: 'Filter by compatible agent ID',
            },
          },
        },
      },
      {
        name: 'get_build_log',
        description: 'Retrieve the build log text for a completed or running build by build ID',
        inputSchema: {
          type: 'object',
          properties: {
            build_id: {
              type: 'string',
              description: 'Numeric build ID to retrieve the log for',
            },
          },
          required: ['build_id'],
        },
      },
      {
        name: 'list_artifacts',
        description: 'List build artifacts produced by a build — returns file names and sizes',
        inputSchema: {
          type: 'object',
          properties: {
            build_id: {
              type: 'string',
              description: 'Numeric build ID to list artifacts for',
            },
            path: {
              type: 'string',
              description: 'Artifact directory path within the build (default: root)',
            },
          },
          required: ['build_id'],
        },
      },
      {
        name: 'list_agents',
        description: 'List all build agents registered in TeamCity with their status, compatibility, and current assignment',
        inputSchema: {
          type: 'object',
          properties: {
            authorized: {
              type: 'boolean',
              description: 'Filter by authorization status: true for authorized agents only (default: all)',
            },
            enabled: {
              type: 'boolean',
              description: 'Filter by enabled status (default: all)',
            },
            connected: {
              type: 'boolean',
              description: 'Filter by connection status (default: all)',
            },
          },
        },
      },
      {
        name: 'get_agent',
        description: 'Get detailed information about a specific build agent by agent ID including pool and compatibility',
        inputSchema: {
          type: 'object',
          properties: {
            agent_id: {
              type: 'string',
              description: 'Numeric agent ID',
            },
          },
          required: ['agent_id'],
        },
      },
      {
        name: 'enable_agent',
        description: 'Enable a disabled build agent so it can accept new build assignments',
        inputSchema: {
          type: 'object',
          properties: {
            agent_id: {
              type: 'string',
              description: 'Numeric agent ID to enable',
            },
          },
          required: ['agent_id'],
        },
      },
      {
        name: 'disable_agent',
        description: 'Disable a build agent to prevent it from accepting new builds — useful for maintenance',
        inputSchema: {
          type: 'object',
          properties: {
            agent_id: {
              type: 'string',
              description: 'Numeric agent ID to disable',
            },
            comment: {
              type: 'string',
              description: 'Reason for disabling the agent',
            },
          },
          required: ['agent_id'],
        },
      },
      {
        name: 'list_changes',
        description: 'List VCS changes (commits) detected by TeamCity across builds with optional filters',
        inputSchema: {
          type: 'object',
          properties: {
            build_config_id: {
              type: 'string',
              description: 'Filter changes by build configuration ID',
            },
            build_id: {
              type: 'string',
              description: 'Filter changes included in a specific build',
            },
            count: {
              type: 'number',
              description: 'Maximum number of changes to return (default: 50)',
            },
          },
        },
      },
      {
        name: 'get_change',
        description: 'Get full details of a VCS change by change ID including files modified and commit message',
        inputSchema: {
          type: 'object',
          properties: {
            change_id: {
              type: 'string',
              description: 'Numeric TeamCity change ID',
            },
          },
          required: ['change_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_projects': return this.listProjects(args);
        case 'get_project': return this.getProject(args);
        case 'create_project': return this.createProject(args);
        case 'list_build_configs': return this.listBuildConfigs(args);
        case 'get_build_config': return this.getBuildConfig(args);
        case 'pause_build_config': return this.pauseBuildConfig(args);
        case 'resume_build_config': return this.resumeBuildConfig(args);
        case 'list_builds': return this.listBuilds(args);
        case 'get_build': return this.getBuild(args);
        case 'trigger_build': return this.triggerBuild(args);
        case 'cancel_build': return this.cancelBuild(args);
        case 'pin_build': return this.pinBuild(args);
        case 'list_build_queue': return this.listBuildQueue(args);
        case 'get_build_log': return this.getBuildLog(args);
        case 'list_artifacts': return this.listArtifacts(args);
        case 'list_agents': return this.listAgents(args);
        case 'get_agent': return this.getAgent(args);
        case 'enable_agent': return this.enableAgent(args);
        case 'disable_agent': return this.disableAgent(args);
        case 'list_changes': return this.listChanges(args);
        case 'get_change': return this.getChange(args);
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
    const authHeader = this.authType === 'basic'
      ? `Basic ${btoa(`${this.username}:${this.token}`)}`
      : `Bearer ${this.token}`;
    return {
      Authorization: authHeader,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    };
  }

  private async apiGet(path: string, params: Record<string, string> = {}): Promise<ToolResult> {
    const qs = new URLSearchParams(params).toString();
    const url = `${this.baseUrl}${path}${qs ? '?' + qs : ''}`;
    const response = await this.fetchWithRetry(url, { headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apiPost(path: string, body: unknown): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apiPut(path: string, body: string, contentType: string = 'text/plain'): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'PUT',
      headers: { ...this.headers, 'Content-Type': contentType },
      body,
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: JSON.stringify({ success: true }) }], isError: false };
  }

  private async listProjects(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (args.locator) params.locator = args.locator as string;
    return this.apiGet('/projects', params);
  }

  private async getProject(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.project_id) return { content: [{ type: 'text', text: 'project_id is required' }], isError: true };
    return this.apiGet(`/projects/id:${encodeURIComponent(args.project_id as string)}`);
  }

  private async createProject(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name || !args.id) return { content: [{ type: 'text', text: 'name and id are required' }], isError: true };
    const body: Record<string, unknown> = {
      name: args.name,
      id: args.id,
      parentProject: { id: (args.parent_project_id as string) || '_Root' },
    };
    return this.apiPost('/projects', body);
  }

  private async listBuildConfigs(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.project_id) {
      return this.apiGet(`/projects/id:${encodeURIComponent(args.project_id as string)}/buildTypes`);
    }
    return this.apiGet('/buildTypes');
  }

  private async getBuildConfig(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.build_config_id) return { content: [{ type: 'text', text: 'build_config_id is required' }], isError: true };
    return this.apiGet(`/buildTypes/id:${encodeURIComponent(args.build_config_id as string)}`);
  }

  private async pauseBuildConfig(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.build_config_id) return { content: [{ type: 'text', text: 'build_config_id is required' }], isError: true };
    return this.apiPut(`/buildTypes/id:${encodeURIComponent(args.build_config_id as string)}/paused`, 'true', 'text/plain');
  }

  private async resumeBuildConfig(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.build_config_id) return { content: [{ type: 'text', text: 'build_config_id is required' }], isError: true };
    return this.apiPut(`/buildTypes/id:${encodeURIComponent(args.build_config_id as string)}/paused`, 'false', 'text/plain');
  }

  private async listBuilds(args: Record<string, unknown>): Promise<ToolResult> {
    const locatorParts: string[] = [];
    if (args.build_config_id) locatorParts.push(`buildType:${encodeURIComponent(args.build_config_id as string)}`);
    if (args.status) locatorParts.push(`status:${encodeURIComponent(args.status as string)}`);
    if (args.branch) locatorParts.push(`branch:${encodeURIComponent(args.branch as string)}`);
    if (typeof args.running === 'boolean') locatorParts.push(`running:${encodeURIComponent(String(args.running))}`);
    locatorParts.push(`count:${(args.count as number) || 50}`);
    if (args.start) locatorParts.push(`start:${encodeURIComponent(args.start as string)}`);
    const params: Record<string, string> = { locator: locatorParts.join(',') };
    return this.apiGet('/builds', params);
  }

  private async getBuild(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.build_id) return { content: [{ type: 'text', text: 'build_id is required' }], isError: true };
    return this.apiGet(`/builds/id:${encodeURIComponent(args.build_id as string)}`);
  }

  private async triggerBuild(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.build_config_id) return { content: [{ type: 'text', text: 'build_config_id is required' }], isError: true };
    const body: Record<string, unknown> = {
      buildType: { id: args.build_config_id },
    };
    if (args.branch) body.branchName = args.branch;
    if (args.comment) body.comment = { text: args.comment };
    if (args.parameters) {
      const params = Object.entries(args.parameters as Record<string, string>).map(([name, value]) => ({ name, value }));
      body.properties = { property: params };
    }
    return this.apiPost('/buildQueue', body);
  }

  private async cancelBuild(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.build_id) return { content: [{ type: 'text', text: 'build_id is required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.comment) body.comment = args.comment;
    if (typeof args.readdToQueue === 'boolean') body.readdIntoQueue = args.readdToQueue;
    return this.apiPost(`/builds/id:${encodeURIComponent(args.build_id as string)}`, body);
  }

  private async pinBuild(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.build_id) return { content: [{ type: 'text', text: 'build_id is required' }], isError: true };
    // TeamCity REST API: PUT /app/rest/builds/{buildLocator}/pinInfo with PinInfo body (application/json)
    const body = JSON.stringify({ comment: { text: (args.comment as string) || '' }, status: 'pinned' });
    return this.apiPut(`/builds/id:${encodeURIComponent(args.build_id as string)}/pinInfo`, body, 'application/json');
  }

  private async listBuildQueue(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    const locatorParts: string[] = [];
    if (args.project_id) locatorParts.push(`project:${encodeURIComponent(args.project_id as string)}`);
    if (args.agent_id) locatorParts.push(`agent:id:${encodeURIComponent(args.agent_id as string)}`);
    if (locatorParts.length > 0) params.locator = locatorParts.join(',');
    return this.apiGet('/buildQueue', params);
  }

  private async getBuildLog(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.build_id) return { content: [{ type: 'text', text: 'build_id is required' }], isError: true };
    // TeamCity REST API has no GET /app/rest/builds/{id}/log endpoint (that path is POST-only for adding messages).
    // Build log download uses: {serverRoot}/downloadBuildLog.html?buildId={numericId}&plain=true
    // Strip /app/rest suffix to get the server root URL.
    const serverRoot = this.baseUrl.replace(/\/app\/rest\/?$/, '');
    const url = `${serverRoot}/downloadBuildLog.html?buildId=${encodeURIComponent(args.build_id as string)}&plain=true`;
    const response = await this.fetchWithRetry(url, { headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const text = await response.text();
    return { content: [{ type: 'text', text: this.truncate(text) }], isError: false };
  }

  private async listArtifacts(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.build_id) return { content: [{ type: 'text', text: 'build_id is required' }], isError: true };
    const path = (args.path as string) || '';
    return this.apiGet(`/builds/id:${encodeURIComponent(args.build_id as string)}/artifacts/children/${path}`);
  }

  private async listAgents(args: Record<string, unknown>): Promise<ToolResult> {
    const locatorParts: string[] = [];
    if (typeof args.authorized === 'boolean') locatorParts.push(`authorized:${encodeURIComponent(String(args.authorized))}`);
    if (typeof args.enabled === 'boolean') locatorParts.push(`enabled:${encodeURIComponent(String(args.enabled))}`);
    if (typeof args.connected === 'boolean') locatorParts.push(`connected:${encodeURIComponent(String(args.connected))}`);
    const params: Record<string, string> = {};
    if (locatorParts.length > 0) params.locator = locatorParts.join(',');
    return this.apiGet('/agents', params);
  }

  private async getAgent(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.agent_id) return { content: [{ type: 'text', text: 'agent_id is required' }], isError: true };
    return this.apiGet(`/agents/id:${encodeURIComponent(args.agent_id as string)}`);
  }

  private async enableAgent(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.agent_id) return { content: [{ type: 'text', text: 'agent_id is required' }], isError: true };
    return this.apiPut(`/agents/id:${encodeURIComponent(args.agent_id as string)}/enabled`, 'true', 'text/plain');
  }

  private async disableAgent(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.agent_id) return { content: [{ type: 'text', text: 'agent_id is required' }], isError: true };
    return this.apiPut(`/agents/id:${encodeURIComponent(args.agent_id as string)}/enabled`, 'false', 'text/plain');
  }

  private async listChanges(args: Record<string, unknown>): Promise<ToolResult> {
    const locatorParts: string[] = [];
    if (args.build_config_id) locatorParts.push(`buildType:${encodeURIComponent(args.build_config_id as string)}`);
    if (args.build_id) locatorParts.push(`build:id:${encodeURIComponent(args.build_id as string)}`);
    locatorParts.push(`count:${(args.count as number) || 50}`);
    return this.apiGet('/changes', { locator: locatorParts.join(',') });
  }

  private async getChange(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.change_id) return { content: [{ type: 'text', text: 'change_id is required' }], isError: true };
    return this.apiGet(`/changes/id:${encodeURIComponent(args.change_id as string)}`);
  }
}

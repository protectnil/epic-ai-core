/**
 * OpenSUSE Open Build Service (OBS) MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// No official OpenSUSE OBS MCP server was found on GitHub as of 2026-03-28.
// Our adapter covers: 41 tools (full API surface). Vendor MCP covers: 0 tools (none exists).
// Recommendation: use-rest-api — no official MCP server exists.
//
// Base URL: https://api.opensuse.org (default OBS instance; self-hosted instances vary)
// Auth: HTTP Basic Authentication (username + password) via Authorization: Basic header
// Docs: https://openbuildservice.org/help/ | https://api.opensuse.org
// Rate limits: Not publicly documented; avoid aggressive polling of build endpoints

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface OpenSuseObsConfig {
  username: string;
  password: string;
  baseUrl?: string;
}

export class OpenSuseObsMCPServer extends MCPAdapterBase {
  private readonly username: string;
  private readonly password: string;
  private readonly baseUrl: string;

  constructor(config: OpenSuseObsConfig) {
    super();
    this.username = config.username;
    this.password = config.password;
    this.baseUrl = config.baseUrl || 'https://api.opensuse.org';
  }

  static catalog() {
    return {
      name: 'opensuse-obs',
      displayName: 'OpenSUSE Open Build Service',
      version: '1.0.0',
      category: 'devops',
      keywords: [
        'opensuse', 'obs', 'open build service', 'build', 'package', 'rpm', 'deb',
        'linux', 'distribution', 'repository', 'architecture', 'project', 'request',
        'submit request', 'review', 'worker', 'binary', 'published', 'group', 'person',
        'token', 'attribute', 'configuration', 'distribution', 'issue tracker',
      ],
      toolNames: [
        'get_about',
        'list_architectures',
        'get_architecture',
        'list_attributes',
        'get_attribute',
        'list_builds',
        'get_project_build',
        'get_build_results',
        'get_repository_build',
        'get_build_config',
        'get_build_dep_info',
        'get_package_build_files',
        'get_package_buildinfo',
        'get_package_build_history',
        'get_package_jobstatus',
        'get_package_build_log',
        'get_package_build_reason',
        'get_package_build_status',
        'get_configuration',
        'list_distributions',
        'get_distribution',
        'list_groups',
        'get_group',
        'list_issue_trackers',
        'get_issue_tracker',
        'get_issue',
        'list_persons',
        'get_person',
        'get_person_groups',
        'list_person_tokens',
        'list_published',
        'get_published_project',
        'get_published_repository',
        'get_published_binaries',
        'list_requests',
        'create_request',
        'get_request',
        'update_request',
        'get_request_diff',
        'get_worker_status',
        'get_worker',
      ],
      description: 'OpenSUSE Open Build Service: manage build projects, packages, repositories, submit requests, workers, distributions, persons, and published binaries.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      // ── General Information ────────────────────────────────────────────────
      {
        name: 'get_about',
        description: 'Get generic information about the Open Build Service API — version, revision, description',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      // ── Architectures ─────────────────────────────────────────────────────
      {
        name: 'list_architectures',
        description: 'List all architectures known to Open Build Service (e.g. x86_64, aarch64, s390x)',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_architecture',
        description: 'Get detailed information about a specific build architecture by its name',
        inputSchema: {
          type: 'object',
          properties: {
            architecture_name: {
              type: 'string',
              description: 'Architecture name (e.g. x86_64, aarch64)',
            },
          },
          required: ['architecture_name'],
        },
      },
      // ── Attributes ────────────────────────────────────────────────────────
      {
        name: 'list_attributes',
        description: 'List all attribute namespaces defined in the Open Build Service instance',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_attribute',
        description: 'Get all attributes defined under a specific namespace in Open Build Service',
        inputSchema: {
          type: 'object',
          properties: {
            namespace: {
              type: 'string',
              description: 'The attribute namespace (e.g. OBS, Maintained)',
            },
          },
          required: ['namespace'],
        },
      },
      // ── Build ─────────────────────────────────────────────────────────────
      {
        name: 'list_builds',
        description: 'List all projects with build configurations in Open Build Service',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_project_build',
        description: 'Get build configuration and all repositories for a specific OBS project',
        inputSchema: {
          type: 'object',
          properties: {
            project_name: {
              type: 'string',
              description: 'Project name (e.g. openSUSE:Factory)',
            },
          },
          required: ['project_name'],
        },
      },
      {
        name: 'get_build_results',
        description: 'Get build results for a project, optionally filtered by package, architecture, or repository',
        inputSchema: {
          type: 'object',
          properties: {
            project_name: {
              type: 'string',
              description: 'Project name',
            },
            package: {
              type: 'string',
              description: 'Package name to limit results',
            },
            arch: {
              type: 'string',
              description: 'Architecture name to limit results',
            },
            repository: {
              type: 'string',
              description: 'Repository name to limit results',
            },
            lastbuild: {
              type: 'boolean',
              description: 'Show the last build result excluding current building jobs',
            },
            multibuild: {
              type: 'boolean',
              description: 'Include build results from _multibuild definitions',
            },
          },
          required: ['project_name'],
        },
      },
      {
        name: 'get_repository_build',
        description: 'Get build details for a specific repository within a project',
        inputSchema: {
          type: 'object',
          properties: {
            project_name: {
              type: 'string',
              description: 'Project name',
            },
            repository_name: {
              type: 'string',
              description: 'Repository name',
            },
          },
          required: ['project_name', 'repository_name'],
        },
      },
      {
        name: 'get_build_config',
        description: 'Get the build configuration file for a specific project repository',
        inputSchema: {
          type: 'object',
          properties: {
            project_name: {
              type: 'string',
              description: 'Project name',
            },
            repository_name: {
              type: 'string',
              description: 'Repository name',
            },
          },
          required: ['project_name', 'repository_name'],
        },
      },
      {
        name: 'get_build_dep_info',
        description: 'Get build dependency information for a specific project repository architecture',
        inputSchema: {
          type: 'object',
          properties: {
            project_name: {
              type: 'string',
              description: 'Project name',
            },
            repository_name: {
              type: 'string',
              description: 'Repository name',
            },
            architecture_name: {
              type: 'string',
              description: 'Architecture name (e.g. x86_64)',
            },
            package: {
              type: 'string',
              description: 'Package name to limit results',
            },
          },
          required: ['project_name', 'repository_name', 'architecture_name'],
        },
      },
      {
        name: 'get_package_build_files',
        description: 'List build result files for a specific package in a project/repository/architecture',
        inputSchema: {
          type: 'object',
          properties: {
            project_name: {
              type: 'string',
              description: 'Project name',
            },
            repository_name: {
              type: 'string',
              description: 'Repository name',
            },
            architecture_name: {
              type: 'string',
              description: 'Architecture name',
            },
            package_name: {
              type: 'string',
              description: 'Package name',
            },
          },
          required: ['project_name', 'repository_name', 'architecture_name', 'package_name'],
        },
      },
      {
        name: 'get_package_buildinfo',
        description: 'Get build information for a specific package including build dependencies',
        inputSchema: {
          type: 'object',
          properties: {
            project_name: {
              type: 'string',
              description: 'Project name',
            },
            repository_name: {
              type: 'string',
              description: 'Repository name',
            },
            architecture_name: {
              type: 'string',
              description: 'Architecture name',
            },
            package_name: {
              type: 'string',
              description: 'Package name',
            },
          },
          required: ['project_name', 'repository_name', 'architecture_name', 'package_name'],
        },
      },
      {
        name: 'get_package_build_history',
        description: 'Get build history for a specific package in a project/repository/architecture',
        inputSchema: {
          type: 'object',
          properties: {
            project_name: {
              type: 'string',
              description: 'Project name',
            },
            repository_name: {
              type: 'string',
              description: 'Repository name',
            },
            architecture_name: {
              type: 'string',
              description: 'Architecture name',
            },
            package_name: {
              type: 'string',
              description: 'Package name',
            },
          },
          required: ['project_name', 'repository_name', 'architecture_name', 'package_name'],
        },
      },
      {
        name: 'get_package_jobstatus',
        description: 'Get the current build job status for a specific package',
        inputSchema: {
          type: 'object',
          properties: {
            project_name: {
              type: 'string',
              description: 'Project name',
            },
            repository_name: {
              type: 'string',
              description: 'Repository name',
            },
            architecture_name: {
              type: 'string',
              description: 'Architecture name',
            },
            package_name: {
              type: 'string',
              description: 'Package name',
            },
          },
          required: ['project_name', 'repository_name', 'architecture_name', 'package_name'],
        },
      },
      {
        name: 'get_package_build_log',
        description: 'Get the full build log output for a specific package build',
        inputSchema: {
          type: 'object',
          properties: {
            project_name: {
              type: 'string',
              description: 'Project name',
            },
            repository_name: {
              type: 'string',
              description: 'Repository name',
            },
            architecture_name: {
              type: 'string',
              description: 'Architecture name',
            },
            package_name: {
              type: 'string',
              description: 'Package name',
            },
          },
          required: ['project_name', 'repository_name', 'architecture_name', 'package_name'],
        },
      },
      {
        name: 'get_package_build_reason',
        description: 'Get the reason why a package was scheduled for rebuild',
        inputSchema: {
          type: 'object',
          properties: {
            project_name: {
              type: 'string',
              description: 'Project name',
            },
            repository_name: {
              type: 'string',
              description: 'Repository name',
            },
            architecture_name: {
              type: 'string',
              description: 'Architecture name',
            },
            package_name: {
              type: 'string',
              description: 'Package name',
            },
          },
          required: ['project_name', 'repository_name', 'architecture_name', 'package_name'],
        },
      },
      {
        name: 'get_package_build_status',
        description: 'Get the current build status result for a specific package',
        inputSchema: {
          type: 'object',
          properties: {
            project_name: {
              type: 'string',
              description: 'Project name',
            },
            repository_name: {
              type: 'string',
              description: 'Repository name',
            },
            architecture_name: {
              type: 'string',
              description: 'Architecture name',
            },
            package_name: {
              type: 'string',
              description: 'Package name',
            },
          },
          required: ['project_name', 'repository_name', 'architecture_name', 'package_name'],
        },
      },
      // ── Configuration ──────────────────────────────────────────────────────
      {
        name: 'get_configuration',
        description: 'Get the global configuration of this Open Build Service instance',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      // ── Distributions ─────────────────────────────────────────────────────
      {
        name: 'list_distributions',
        description: 'List all distributions available in the Open Build Service instance',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_distribution',
        description: 'Get details about a specific Linux distribution by its numeric ID',
        inputSchema: {
          type: 'object',
          properties: {
            distribution_id: {
              type: 'number',
              description: 'The numeric ID of the distribution',
            },
          },
          required: ['distribution_id'],
        },
      },
      // ── Groups ─────────────────────────────────────────────────────────────
      {
        name: 'list_groups',
        description: 'List all groups defined in the Open Build Service instance',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_group',
        description: 'Get details about a specific OBS group including its member list',
        inputSchema: {
          type: 'object',
          properties: {
            group_title: {
              type: 'string',
              description: 'Group title (name)',
            },
          },
          required: ['group_title'],
        },
      },
      // ── Issue Trackers ─────────────────────────────────────────────────────
      {
        name: 'list_issue_trackers',
        description: 'List all issue trackers configured in the Open Build Service instance',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_issue_tracker',
        description: 'Get configuration details about a specific issue tracker by its name',
        inputSchema: {
          type: 'object',
          properties: {
            issue_tracker_name: {
              type: 'string',
              description: 'Issue tracker name (e.g. bnc, github)',
            },
          },
          required: ['issue_tracker_name'],
        },
      },
      {
        name: 'get_issue',
        description: 'Get details about a specific issue from an issue tracker',
        inputSchema: {
          type: 'object',
          properties: {
            issue_tracker_name: {
              type: 'string',
              description: 'Issue tracker name',
            },
            issue_name: {
              type: 'string',
              description: 'Issue name or identifier',
            },
          },
          required: ['issue_tracker_name', 'issue_name'],
        },
      },
      // ── Person ─────────────────────────────────────────────────────────────
      {
        name: 'list_persons',
        description: 'List persons (user accounts) in Open Build Service, optionally filtered by prefix',
        inputSchema: {
          type: 'object',
          properties: {
            prefix: {
              type: 'string',
              description: 'A prefix to filter persons by login name',
            },
          },
          required: [],
        },
      },
      {
        name: 'get_person',
        description: 'Get details about a specific person (user) by their login name',
        inputSchema: {
          type: 'object',
          properties: {
            login: {
              type: 'string',
              description: 'Person login name',
            },
          },
          required: ['login'],
        },
      },
      {
        name: 'get_person_groups',
        description: 'Get a list of all groups that a specific person belongs to',
        inputSchema: {
          type: 'object',
          properties: {
            login: {
              type: 'string',
              description: 'Person login name',
            },
          },
          required: ['login'],
        },
      },
      {
        name: 'list_person_tokens',
        description: 'List API tokens for a person in Open Build Service',
        inputSchema: {
          type: 'object',
          properties: {
            login: {
              type: 'string',
              description: 'Person login name',
            },
          },
          required: ['login'],
        },
      },
      // ── Published Binaries ─────────────────────────────────────────────────
      {
        name: 'list_published',
        description: 'List all published projects available in this Open Build Service instance',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_published_project',
        description: 'List all published repositories available under a specific OBS project',
        inputSchema: {
          type: 'object',
          properties: {
            project_name: {
              type: 'string',
              description: 'Project name',
            },
          },
          required: ['project_name'],
        },
      },
      {
        name: 'get_published_repository',
        description: 'List all published architectures available for a specific project repository',
        inputSchema: {
          type: 'object',
          properties: {
            project_name: {
              type: 'string',
              description: 'Project name',
            },
            repository_name: {
              type: 'string',
              description: 'Repository name',
            },
          },
          required: ['project_name', 'repository_name'],
        },
      },
      {
        name: 'get_published_binaries',
        description: 'List published binary files available for a given project repository and architecture',
        inputSchema: {
          type: 'object',
          properties: {
            project_name: {
              type: 'string',
              description: 'Project name',
            },
            repository_name: {
              type: 'string',
              description: 'Repository name',
            },
            architecture_name: {
              type: 'string',
              description: 'Architecture name (e.g. x86_64)',
            },
          },
          required: ['project_name', 'repository_name', 'architecture_name'],
        },
      },
      // ── Requests ──────────────────────────────────────────────────────────
      {
        name: 'list_requests',
        description: 'List or filter submit requests, optionally by user, project, package, state, or type',
        inputSchema: {
          type: 'object',
          properties: {
            user: {
              type: 'string',
              description: 'Filter requests and open reviews for this user',
            },
            project: {
              type: 'string',
              description: 'Limit results to this project',
            },
            package: {
              type: 'string',
              description: 'Limit results to this package',
            },
            states: {
              type: 'string',
              description: 'Limit results to given request states (comma-separated: new, review, accepted, declined)',
            },
            types: {
              type: 'string',
              description: 'Limit results to certain action types (comma-separated)',
            },
            roles: {
              type: 'string',
              description: 'Limit results to a given role (comma-separated)',
            },
            limit: {
              type: 'number',
              description: 'Limit the results to this number of requests',
            },
            ids: {
              type: 'string',
              description: 'Limit results to specific request IDs (comma-separated)',
            },
          },
          required: [],
        },
      },
      {
        name: 'create_request',
        description: 'Create a new submit request (e.g. submit package from source to target project)',
        inputSchema: {
          type: 'object',
          properties: {
            body: {
              type: 'string',
              description: 'XML request body defining the request actions, state, and description',
            },
            addrevision: {
              type: 'string',
              description: 'Ask the server to add revisions of current sources to the request',
            },
            ignore_build_state: {
              type: 'string',
              description: 'Skip the build state check when creating the request',
            },
          },
          required: ['body'],
        },
      },
      {
        name: 'get_request',
        description: 'Get details of a specific submit request by its numeric ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'number',
              description: 'Numeric ID of the request',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'update_request',
        description: 'Update the state of a request — addreview, changereviewstate, approve, or accept',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'number',
              description: 'Numeric ID of the request',
            },
            cmd: {
              type: 'string',
              description: 'Command: addreview, changereviewstate, setincident, approve, cancelapproval, setpriority, setacceptat, supersede',
            },
            newstate: {
              type: 'string',
              description: 'New state for changereviewstate (accepted, declined, new)',
            },
            by_user: {
              type: 'string',
              description: 'User login for addreview or changereviewstate',
            },
            by_group: {
              type: 'string',
              description: 'Group title for addreview',
            },
            comment: {
              type: 'string',
              description: 'Comment to add to the action',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'get_request_diff',
        description: 'Get the diff for a submit request showing source vs target differences',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'number',
              description: 'Numeric ID of the request',
            },
            view: {
              type: 'string',
              description: 'Set to xml to receive a structured XML response',
            },
            withissues: {
              type: 'string',
              description: 'Include parsed issues in the diff',
            },
          },
          required: ['id'],
        },
      },
      // ── Workers ───────────────────────────────────────────────────────────
      {
        name: 'get_worker_status',
        description: 'Get the overall status of all build workers in Open Build Service',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_worker',
        description: 'Get details about a specific build worker by architecture and worker ID',
        inputSchema: {
          type: 'object',
          properties: {
            architecture_name: {
              type: 'string',
              description: 'Architecture name of the worker (e.g. x86_64)',
            },
            worker_id: {
              type: 'string',
              description: 'Worker ID string',
            },
          },
          required: ['architecture_name', 'worker_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'get_about':                  return this.getAbout();
        case 'list_architectures':         return this.listArchitectures();
        case 'get_architecture':           return this.getArchitecture(args);
        case 'list_attributes':            return this.listAttributes();
        case 'get_attribute':              return this.getAttribute(args);
        case 'list_builds':                return this.listBuilds();
        case 'get_project_build':          return this.getProjectBuild(args);
        case 'get_build_results':          return this.getBuildResults(args);
        case 'get_repository_build':       return this.getRepositoryBuild(args);
        case 'get_build_config':           return this.getBuildConfig(args);
        case 'get_build_dep_info':         return this.getBuildDepInfo(args);
        case 'get_package_build_files':    return this.getPackageBuildFiles(args);
        case 'get_package_buildinfo':      return this.getPackageBuildinfo(args);
        case 'get_package_build_history':  return this.getPackageBuildHistory(args);
        case 'get_package_jobstatus':      return this.getPackageJobstatus(args);
        case 'get_package_build_log':      return this.getPackageBuildLog(args);
        case 'get_package_build_reason':   return this.getPackageBuildReason(args);
        case 'get_package_build_status':   return this.getPackageBuildStatus(args);
        case 'get_configuration':          return this.getConfiguration();
        case 'list_distributions':         return this.listDistributions();
        case 'get_distribution':           return this.getDistribution(args);
        case 'list_groups':                return this.listGroups();
        case 'get_group':                  return this.getGroup(args);
        case 'list_issue_trackers':        return this.listIssueTrackers();
        case 'get_issue_tracker':          return this.getIssueTracker(args);
        case 'get_issue':                  return this.getIssue(args);
        case 'list_persons':               return this.listPersons(args);
        case 'get_person':                 return this.getPerson(args);
        case 'get_person_groups':          return this.getPersonGroups(args);
        case 'list_person_tokens':         return this.listPersonTokens(args);
        case 'list_published':             return this.listPublished();
        case 'get_published_project':      return this.getPublishedProject(args);
        case 'get_published_repository':   return this.getPublishedRepository(args);
        case 'get_published_binaries':     return this.getPublishedBinaries(args);
        case 'list_requests':              return this.listRequests(args);
        case 'create_request':             return this.createRequest(args);
        case 'get_request':                return this.getRequest(args);
        case 'update_request':             return this.updateRequest(args);
        case 'get_request_diff':           return this.getRequestDiff(args);
        case 'get_worker_status':          return this.getWorkerStatus();
        case 'get_worker':                 return this.getWorker(args);
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

  // ── Private helpers ────────────────────────────────────────────────────────

  private get authHeader(): string {
    return 'Basic ' + Buffer.from(`${this.username}:${this.password}`).toString('base64');
  }

  private async get(path: string, params: Record<string, string | number | boolean> = {}): Promise<ToolResult> {
    const url = new URL(`${this.baseUrl}${path}`);
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value));
      }
    }
    const response = await this.fetchWithRetry(url.toString(), {
      headers: {
        Authorization: this.authHeader,
        Accept: 'application/xml',
      },
    });
    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }
    const text = await response.text();
    return { content: [{ type: 'text', text: this.truncate(text) }], isError: false };
  }

  private async post(path: string, body: string, params: Record<string, string | number | boolean> = {}): Promise<ToolResult> {
    const url = new URL(`${this.baseUrl}${path}`);
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value));
      }
    }
    const response = await this.fetchWithRetry(url.toString(), {
      method: 'POST',
      headers: {
        Authorization: this.authHeader,
        'Content-Type': 'application/xml',
        Accept: 'application/xml',
      },
      body,
    });
    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }
    const text = await response.text();
    return { content: [{ type: 'text', text: this.truncate(text) }], isError: false };
  }

  // ── General Information ────────────────────────────────────────────────────

  private async getAbout(): Promise<ToolResult> {
    return this.get('/about');
  }

  // ── Architectures ─────────────────────────────────────────────────────────

  private async listArchitectures(): Promise<ToolResult> {
    return this.get('/architectures');
  }

  private async getArchitecture(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.architecture_name) return { content: [{ type: 'text', text: 'architecture_name is required' }], isError: true };
    return this.get(`/architectures/${encodeURIComponent(args.architecture_name as string)}`);
  }

  // ── Attributes ────────────────────────────────────────────────────────────

  private async listAttributes(): Promise<ToolResult> {
    return this.get('/attribute');
  }

  private async getAttribute(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.namespace) return { content: [{ type: 'text', text: 'namespace is required' }], isError: true };
    return this.get(`/attribute/${encodeURIComponent(args.namespace as string)}`);
  }

  // ── Build ─────────────────────────────────────────────────────────────────

  private async listBuilds(): Promise<ToolResult> {
    return this.get('/build');
  }

  private async getProjectBuild(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.project_name) return { content: [{ type: 'text', text: 'project_name is required' }], isError: true };
    return this.get(`/build/${encodeURIComponent(args.project_name as string)}`);
  }

  private async getBuildResults(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.project_name) return { content: [{ type: 'text', text: 'project_name is required' }], isError: true };
    const params: Record<string, string | number | boolean> = {};
    if (args.package)    params.package    = args.package as string;
    if (args.arch)       params.arch       = args.arch as string;
    if (args.repository) params.repository = args.repository as string;
    if (args.lastbuild !== undefined)  params.lastbuild  = args.lastbuild as boolean;
    if (args.multibuild !== undefined) params.multibuild = args.multibuild as boolean;
    return this.get(`/build/${encodeURIComponent(args.project_name as string)}/_result`, params);
  }

  private async getRepositoryBuild(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.project_name || !args.repository_name) {
      return { content: [{ type: 'text', text: 'project_name and repository_name are required' }], isError: true };
    }
    return this.get(`/build/${encodeURIComponent(args.project_name as string)}/${encodeURIComponent(args.repository_name as string)}`);
  }

  private async getBuildConfig(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.project_name || !args.repository_name) {
      return { content: [{ type: 'text', text: 'project_name and repository_name are required' }], isError: true };
    }
    return this.get(`/build/${encodeURIComponent(args.project_name as string)}/${encodeURIComponent(args.repository_name as string)}/_buildconfig`);
  }

  private async getBuildDepInfo(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.project_name || !args.repository_name || !args.architecture_name) {
      return { content: [{ type: 'text', text: 'project_name, repository_name, and architecture_name are required' }], isError: true };
    }
    const params: Record<string, string | number | boolean> = {};
    if (args.package) params.package = args.package as string;
    return this.get(`/build/${encodeURIComponent(args.project_name as string)}/${encodeURIComponent(args.repository_name as string)}/${encodeURIComponent(args.architecture_name as string)}/_builddepinfo`, params);
  }

  private async getPackageBuildFiles(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.project_name || !args.repository_name || !args.architecture_name || !args.package_name) {
      return { content: [{ type: 'text', text: 'project_name, repository_name, architecture_name, and package_name are required' }], isError: true };
    }
    return this.get(`/build/${encodeURIComponent(args.project_name as string)}/${encodeURIComponent(args.repository_name as string)}/${encodeURIComponent(args.architecture_name as string)}/${encodeURIComponent(args.package_name as string)}`);
  }

  private async getPackageBuildinfo(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.project_name || !args.repository_name || !args.architecture_name || !args.package_name) {
      return { content: [{ type: 'text', text: 'project_name, repository_name, architecture_name, and package_name are required' }], isError: true };
    }
    return this.get(`/build/${encodeURIComponent(args.project_name as string)}/${encodeURIComponent(args.repository_name as string)}/${encodeURIComponent(args.architecture_name as string)}/${encodeURIComponent(args.package_name as string)}/_buildinfo`);
  }

  private async getPackageBuildHistory(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.project_name || !args.repository_name || !args.architecture_name || !args.package_name) {
      return { content: [{ type: 'text', text: 'project_name, repository_name, architecture_name, and package_name are required' }], isError: true };
    }
    return this.get(`/build/${encodeURIComponent(args.project_name as string)}/${encodeURIComponent(args.repository_name as string)}/${encodeURIComponent(args.architecture_name as string)}/${encodeURIComponent(args.package_name as string)}/_history`);
  }

  private async getPackageJobstatus(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.project_name || !args.repository_name || !args.architecture_name || !args.package_name) {
      return { content: [{ type: 'text', text: 'project_name, repository_name, architecture_name, and package_name are required' }], isError: true };
    }
    return this.get(`/build/${encodeURIComponent(args.project_name as string)}/${encodeURIComponent(args.repository_name as string)}/${encodeURIComponent(args.architecture_name as string)}/${encodeURIComponent(args.package_name as string)}/_jobstatus`);
  }

  private async getPackageBuildLog(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.project_name || !args.repository_name || !args.architecture_name || !args.package_name) {
      return { content: [{ type: 'text', text: 'project_name, repository_name, architecture_name, and package_name are required' }], isError: true };
    }
    return this.get(`/build/${encodeURIComponent(args.project_name as string)}/${encodeURIComponent(args.repository_name as string)}/${encodeURIComponent(args.architecture_name as string)}/${encodeURIComponent(args.package_name as string)}/_log`);
  }

  private async getPackageBuildReason(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.project_name || !args.repository_name || !args.architecture_name || !args.package_name) {
      return { content: [{ type: 'text', text: 'project_name, repository_name, architecture_name, and package_name are required' }], isError: true };
    }
    return this.get(`/build/${encodeURIComponent(args.project_name as string)}/${encodeURIComponent(args.repository_name as string)}/${encodeURIComponent(args.architecture_name as string)}/${encodeURIComponent(args.package_name as string)}/_reason`);
  }

  private async getPackageBuildStatus(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.project_name || !args.repository_name || !args.architecture_name || !args.package_name) {
      return { content: [{ type: 'text', text: 'project_name, repository_name, architecture_name, and package_name are required' }], isError: true };
    }
    return this.get(`/build/${encodeURIComponent(args.project_name as string)}/${encodeURIComponent(args.repository_name as string)}/${encodeURIComponent(args.architecture_name as string)}/${encodeURIComponent(args.package_name as string)}/_status`);
  }

  // ── Configuration ──────────────────────────────────────────────────────────

  private async getConfiguration(): Promise<ToolResult> {
    return this.get('/configuration');
  }

  // ── Distributions ─────────────────────────────────────────────────────────

  private async listDistributions(): Promise<ToolResult> {
    return this.get('/distributions');
  }

  private async getDistribution(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.distribution_id === undefined) return { content: [{ type: 'text', text: 'distribution_id is required' }], isError: true };
    return this.get(`/distributions/${encodeURIComponent(String(args.distribution_id))}`);
  }

  // ── Groups ────────────────────────────────────────────────────────────────

  private async listGroups(): Promise<ToolResult> {
    return this.get('/group');
  }

  private async getGroup(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.group_title) return { content: [{ type: 'text', text: 'group_title is required' }], isError: true };
    return this.get(`/group/${encodeURIComponent(args.group_title as string)}`);
  }

  // ── Issue Trackers ────────────────────────────────────────────────────────

  private async listIssueTrackers(): Promise<ToolResult> {
    return this.get('/issue_trackers');
  }

  private async getIssueTracker(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.issue_tracker_name) return { content: [{ type: 'text', text: 'issue_tracker_name is required' }], isError: true };
    return this.get(`/issue_trackers/${encodeURIComponent(args.issue_tracker_name as string)}`);
  }

  private async getIssue(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.issue_tracker_name || !args.issue_name) {
      return { content: [{ type: 'text', text: 'issue_tracker_name and issue_name are required' }], isError: true };
    }
    return this.get(`/issue_trackers/${encodeURIComponent(args.issue_tracker_name as string)}/issues/${encodeURIComponent(args.issue_name as string)}`);
  }

  // ── Person ────────────────────────────────────────────────────────────────

  private async listPersons(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string | number | boolean> = {};
    if (args.prefix) params.prefix = args.prefix as string;
    return this.get('/person', params);
  }

  private async getPerson(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.login) return { content: [{ type: 'text', text: 'login is required' }], isError: true };
    return this.get(`/person/${encodeURIComponent(args.login as string)}`);
  }

  private async getPersonGroups(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.login) return { content: [{ type: 'text', text: 'login is required' }], isError: true };
    return this.get(`/person/${encodeURIComponent(args.login as string)}/group`);
  }

  private async listPersonTokens(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.login) return { content: [{ type: 'text', text: 'login is required' }], isError: true };
    return this.get(`/person/${encodeURIComponent(args.login as string)}/token`);
  }

  // ── Published Binaries ────────────────────────────────────────────────────

  private async listPublished(): Promise<ToolResult> {
    return this.get('/published');
  }

  private async getPublishedProject(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.project_name) return { content: [{ type: 'text', text: 'project_name is required' }], isError: true };
    return this.get(`/published/${encodeURIComponent(args.project_name as string)}`);
  }

  private async getPublishedRepository(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.project_name || !args.repository_name) {
      return { content: [{ type: 'text', text: 'project_name and repository_name are required' }], isError: true };
    }
    return this.get(`/published/${encodeURIComponent(args.project_name as string)}/${encodeURIComponent(args.repository_name as string)}`);
  }

  private async getPublishedBinaries(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.project_name || !args.repository_name || !args.architecture_name) {
      return { content: [{ type: 'text', text: 'project_name, repository_name, and architecture_name are required' }], isError: true };
    }
    return this.get(`/published/${encodeURIComponent(args.project_name as string)}/${encodeURIComponent(args.repository_name as string)}/${encodeURIComponent(args.architecture_name as string)}`);
  }

  // ── Requests ──────────────────────────────────────────────────────────────

  private async listRequests(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string | number | boolean> = { view: 'collection' };
    if (args.user)            params.user            = args.user as string;
    if (args.project)         params.project         = args.project as string;
    if (args.package)         params.package         = args.package as string;
    if (args.states)          params.states          = args.states as string;
    if (args.types)           params.types           = args.types as string;
    if (args.roles)           params.roles           = args.roles as string;
    if (args.limit !== undefined) params.limit       = args.limit as number;
    if (args.ids)             params.ids             = args.ids as string;
    return this.get('/request', params);
  }

  private async createRequest(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.body) return { content: [{ type: 'text', text: 'body is required' }], isError: true };
    const params: Record<string, string | number | boolean> = { cmd: 'create' };
    if (args.addrevision)        params.addrevision        = args.addrevision as string;
    if (args.ignore_build_state) params.ignore_build_state = args.ignore_build_state as string;
    return this.post('/request', args.body as string, params);
  }

  private async getRequest(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.id === undefined) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.get(`/request/${encodeURIComponent(String(args.id))}`);
  }

  private async updateRequest(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.id === undefined) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    const params: Record<string, string | number | boolean> = {};
    if (args.cmd)       params.cmd       = args.cmd as string;
    if (args.newstate)  params.newstate  = args.newstate as string;
    if (args.by_user)   params.by_user   = args.by_user as string;
    if (args.by_group)  params.by_group  = args.by_group as string;
    if (args.comment)   params.comment   = args.comment as string;
    return this.post(`/request/${encodeURIComponent(String(args.id))}`, '', params);
  }

  private async getRequestDiff(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.id === undefined) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    const params: Record<string, string | number | boolean> = {};
    if (args.view)       params.view       = args.view as string;
    if (args.withissues) params.withissues = args.withissues as string;
    return this.post(`/request/${encodeURIComponent(String(args.id))}`, '', { ...params, cmd: 'diff' });
  }

  // ── Workers ───────────────────────────────────────────────────────────────

  private async getWorkerStatus(): Promise<ToolResult> {
    return this.get('/worker/status');
  }

  private async getWorker(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.architecture_name || !args.worker_id) {
      return { content: [{ type: 'text', text: 'architecture_name and worker_id are required' }], isError: true };
    }
    return this.get(`/worker/${encodeURIComponent(args.architecture_name as string)}:${encodeURIComponent(args.worker_id as string)}`);
  }
}

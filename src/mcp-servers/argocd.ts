/**
 * Argo CD MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/argoproj-labs/mcp-for-argocd (originally by Akuity) — transport: stdio + streamable-HTTP, auth: Bearer token
// Our adapter covers: 23 tools. Vendor MCP covers: 13 tools (list_clusters, list_applications,
//   get_application, create_application, update_application, delete_application, sync_application,
//   get_application_resource_tree, get_application_managed_resources, get_application_workload_logs,
//   get_resource_events, get_resource_actions, run_resource_action).
// MCP actively maintained — last commit 2026-03-25. Meets all 4 protocol criteria.
// Our adapter adds: list_repositories, get_repository, list_repository_apps, list_projects,
//   get_project, create_project, delete_project, get_cluster, get_server_version, get_settings.
// Recommendation: use-both — MCP and REST have non-overlapping tools. MCP handles app management;
//   REST adapter adds repository, project, cluster detail, and server settings operations.
//
// Base URL: https://{argocd-server}/api/v1  (self-hosted; no SaaS base URL)
// Auth: Bearer token — generate via `argocd account generate-token` or via the session API
// Docs: https://argo-cd.readthedocs.io/en/latest/developer-guide/api-docs/
// Rate limits: Not published; ArgoCD is self-hosted — limits depend on deployment resources

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface ArgoCDConfig {
  server: string;   // hostname only, e.g. argocd.example.com (no https://, no trailing slash)
  token: string;    // Bearer token from `argocd account generate-token`
  baseUrl?: string; // optional full base URL override
}

export class ArgoCDMCPServer extends MCPAdapterBase {
  private readonly token: string;
  private readonly baseUrl: string;

  constructor(config: ArgoCDConfig) {
    super();
    this.token = config.token;
    this.baseUrl = config.baseUrl ?? `https://${config.server.replace(/^https?:\/\//, '').replace(/\/$/, '')}/api/v1`;
  }

  get tools(): ToolDefinition[] {
    return [
      // ── Applications ──────────────────────────────────────────────────────
      {
        name: 'list_applications',
        description: 'List all ArgoCD applications with optional filters for project, name, and namespace',
        inputSchema: {
          type: 'object',
          properties: {
            project: { type: 'string', description: 'Filter by AppProject name' },
            name: { type: 'string', description: 'Filter by exact application name' },
            namespace: { type: 'string', description: 'Filter by application namespace' },
            repo: { type: 'string', description: 'Filter by source repository URL' },
          },
        },
      },
      {
        name: 'get_application',
        description: 'Get full details of a specific ArgoCD application including sync status, health, and source',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Application name' },
            refresh: { type: 'string', description: 'Force a refresh before returning: normal or hard' },
          },
          required: ['name'],
        },
      },
      {
        name: 'create_application',
        description: 'Create a new ArgoCD application from a Git repo, Helm chart, or Kustomize source',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Application name' },
            project: { type: 'string', description: 'AppProject name (default: default)' },
            repo_url: { type: 'string', description: 'Git repository URL' },
            path: { type: 'string', description: 'Path within the repository' },
            target_revision: { type: 'string', description: 'Target branch, tag, or commit SHA (default: HEAD)' },
            dest_server: { type: 'string', description: 'Destination cluster server URL (default: https://kubernetes.default.svc)' },
            dest_namespace: { type: 'string', description: 'Destination namespace' },
            sync_policy_automated: { type: 'boolean', description: 'Enable automated sync (default: false)' },
            sync_policy_prune: { type: 'boolean', description: 'Enable automated pruning (default: false)' },
            sync_policy_self_heal: { type: 'boolean', description: 'Enable self-healing (default: false)' },
          },
          required: ['name', 'repo_url', 'path', 'dest_namespace'],
        },
      },
      {
        name: 'update_application',
        description: 'Update an existing ArgoCD application spec (source, destination, sync policy)',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Application name to update' },
            repo_url: { type: 'string', description: 'New Git repository URL' },
            path: { type: 'string', description: 'New path within the repository' },
            target_revision: { type: 'string', description: 'New target branch, tag, or commit SHA' },
            dest_server: { type: 'string', description: 'New destination cluster server URL' },
            dest_namespace: { type: 'string', description: 'New destination namespace' },
          },
          required: ['name'],
        },
      },
      {
        name: 'delete_application',
        description: 'Delete an ArgoCD application, optionally cascading deletion to managed Kubernetes resources',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Application name to delete' },
            cascade: { type: 'boolean', description: 'Delete managed Kubernetes resources too (default: true)' },
          },
          required: ['name'],
        },
      },
      {
        name: 'sync_application',
        description: 'Trigger a sync for an ArgoCD application, with optional revision, prune, and dry-run controls',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Application name to sync' },
            revision: { type: 'string', description: 'Target revision to sync to (default: HEAD)' },
            prune: { type: 'boolean', description: 'Allow pruning of resources no longer in source (default: false)' },
            dry_run: { type: 'boolean', description: 'Simulate the sync without applying changes (default: false)' },
            force: { type: 'boolean', description: 'Force sync even if already synced (default: false)' },
            resources: {
              type: 'array',
              description: 'Limit sync to specific resources: [{ group, kind, name }]',
              items: { type: 'object' },
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'rollback_application',
        description: 'Roll back an ArgoCD application to a previous deployed revision by history ID',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Application name to roll back' },
            history_id: { type: 'number', description: 'History deployment ID to roll back to (omit for previous version)' },
            prune: { type: 'boolean', description: 'Allow pruning of resources after rollback (default: false)' },
          },
          required: ['name'],
        },
      },
      {
        name: 'get_application_resources',
        description: 'List all managed Kubernetes resources for an ArgoCD application with health and sync status',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Application name' },
            namespace: { type: 'string', description: 'Filter by resource namespace' },
            version: { type: 'string', description: 'Filter by resource API version' },
            group: { type: 'string', description: 'Filter by resource API group' },
            kind: { type: 'string', description: 'Filter by resource kind (e.g. Deployment, Service)' },
          },
          required: ['name'],
        },
      },
      {
        name: 'get_application_logs',
        description: 'Fetch container logs for a pod managed by an ArgoCD application',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Application name' },
            namespace: { type: 'string', description: 'Namespace of the pod' },
            pod_name: { type: 'string', description: 'Name of the pod' },
            container: { type: 'string', description: 'Container name within the pod' },
            tail_lines: { type: 'number', description: 'Number of tail lines to return (default: 100)' },
            since_seconds: { type: 'number', description: 'Return logs from the last N seconds' },
          },
          required: ['name'],
        },
      },
      {
        name: 'get_application_events',
        description: 'Retrieve Kubernetes events for an ArgoCD application or a specific managed resource',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Application name' },
            resource_namespace: { type: 'string', description: 'Namespace of the target resource' },
            resource_name: { type: 'string', description: 'Name of the target resource' },
            resource_uid: { type: 'string', description: 'UID of the target resource' },
          },
          required: ['name'],
        },
      },
      {
        name: 'get_resource_actions',
        description: 'List available resource actions (e.g. restart, scale) for a managed resource in an application',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Application name' },
            namespace: { type: 'string', description: 'Resource namespace' },
            resource_name: { type: 'string', description: 'Resource name' },
            version: { type: 'string', description: 'Resource API version' },
            group: { type: 'string', description: 'Resource API group' },
            kind: { type: 'string', description: 'Resource kind (e.g. Deployment)' },
          },
          required: ['name', 'namespace', 'resource_name', 'kind'],
        },
      },
      {
        name: 'run_resource_action',
        description: 'Execute a resource action (e.g. restart deployment) on a managed resource in an application',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Application name' },
            namespace: { type: 'string', description: 'Resource namespace' },
            resource_name: { type: 'string', description: 'Resource name' },
            version: { type: 'string', description: 'Resource API version' },
            group: { type: 'string', description: 'Resource API group' },
            kind: { type: 'string', description: 'Resource kind (e.g. Deployment)' },
            action: { type: 'string', description: 'Action name to run (e.g. restart)' },
          },
          required: ['name', 'namespace', 'resource_name', 'kind', 'action'],
        },
      },
      // ── Repositories ──────────────────────────────────────────────────────
      {
        name: 'list_repositories',
        description: 'List all Git repositories configured in ArgoCD with their connection status',
        inputSchema: {
          type: 'object',
          properties: {
            force_refresh: { type: 'boolean', description: 'Force refresh of repository connection information (default: false)' },
          },
        },
      },
      {
        name: 'get_repository',
        description: 'Get details of a specific repository configured in ArgoCD by its URL',
        inputSchema: {
          type: 'object',
          properties: {
            repo: { type: 'string', description: 'Repository URL' },
          },
          required: ['repo'],
        },
      },
      {
        name: 'list_repository_apps',
        description: 'List apps (Helm charts, Kustomize directories) available in a repository at a given revision',
        inputSchema: {
          type: 'object',
          properties: {
            repo: { type: 'string', description: 'Repository URL' },
            revision: { type: 'string', description: 'Git revision to inspect (default: HEAD)' },
            app_name: { type: 'string', description: 'Optional application name filter' },
            app_project: { type: 'string', description: 'Optional project filter' },
          },
          required: ['repo'],
        },
      },
      // ── Projects ──────────────────────────────────────────────────────────
      {
        name: 'list_projects',
        description: 'List all ArgoCD AppProjects with their source and destination restrictions',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Filter by project name' },
          },
        },
      },
      {
        name: 'get_project',
        description: 'Get full details of a specific ArgoCD AppProject including RBAC and resource allowlists',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Project name' },
          },
          required: ['name'],
        },
      },
      {
        name: 'create_project',
        description: 'Create a new ArgoCD AppProject with source repo and destination cluster restrictions',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Project name' },
            description: { type: 'string', description: 'Project description' },
            source_repos: {
              type: 'array',
              description: 'Allowed source repository URLs (use ["*"] for any)',
              items: { type: 'string' },
            },
            destinations: {
              type: 'array',
              description: 'Allowed destinations: [{ server, namespace }]',
              items: { type: 'object' },
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'delete_project',
        description: 'Delete an ArgoCD AppProject (fails if any applications reference it)',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Project name to delete' },
          },
          required: ['name'],
        },
      },
      // ── Clusters ──────────────────────────────────────────────────────────
      {
        name: 'list_clusters',
        description: 'List all Kubernetes clusters registered in ArgoCD with connection status',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Filter by cluster name' },
          },
        },
      },
      {
        name: 'get_cluster',
        description: 'Get details of a specific cluster registered in ArgoCD by server URL',
        inputSchema: {
          type: 'object',
          properties: {
            server: { type: 'string', description: 'Cluster server URL' },
          },
          required: ['server'],
        },
      },
      // ── Settings & Version ─────────────────────────────────────────────────
      {
        name: 'get_server_version',
        description: 'Get the ArgoCD server version, build information, and API version',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_settings',
        description: 'Get ArgoCD server settings including OIDC configuration, resource customizations, and status badge',
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
        case 'list_applications':
          return await this.listApplications(args);
        case 'get_application':
          return await this.getApplication(args);
        case 'create_application':
          return await this.createApplication(args);
        case 'update_application':
          return await this.updateApplication(args);
        case 'delete_application':
          return await this.deleteApplication(args);
        case 'sync_application':
          return await this.syncApplication(args);
        case 'rollback_application':
          return await this.rollbackApplication(args);
        case 'get_application_resources':
          return await this.getApplicationResources(args);
        case 'get_application_logs':
          return await this.getApplicationLogs(args);
        case 'get_application_events':
          return await this.getApplicationEvents(args);
        case 'get_resource_actions':
          return await this.getResourceActions(args);
        case 'run_resource_action':
          return await this.runResourceAction(args);
        case 'list_repositories':
          return await this.listRepositories(args);
        case 'get_repository':
          return await this.getRepository(args);
        case 'list_repository_apps':
          return await this.listRepositoryApps(args);
        case 'list_projects':
          return await this.listProjects(args);
        case 'get_project':
          return await this.getProject(args);
        case 'create_project':
          return await this.createProject(args);
        case 'delete_project':
          return await this.deleteProject(args);
        case 'list_clusters':
          return await this.listClusters(args);
        case 'get_cluster':
          return await this.getCluster(args);
        case 'get_server_version':
          return await this.getServerVersion();
        case 'get_settings':
          return await this.getServerSettings();
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

  private get headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  private async fetchJSON(url: string, init?: RequestInit): Promise<ToolResult> {
    const response = await this.fetchWithRetry(url, { headers: this.headers, ...init });
    let data: unknown;
    try {
      data = await response.json();
    } catch {
      data = { status: response.status, statusText: response.statusText };
    }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: !response.ok };
  }

  private async listApplications(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.project) params.set('projects', String(args.project));
    if (args.name) params.set('name', String(args.name));
    if (args.namespace) params.set('appNamespace', String(args.namespace));
    if (args.repo) params.set('repo', String(args.repo));
    return this.fetchJSON(`${this.baseUrl}/applications?${params}`);
  }

  private async getApplication(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.refresh) params.set('refresh', String(args.refresh));
    const qs = params.toString();
    return this.fetchJSON(`${this.baseUrl}/applications/${encodeURIComponent(String(args.name))}${qs ? `?${qs}` : ''}`);
  }

  private async createApplication(args: Record<string, unknown>): Promise<ToolResult> {
    const body = {
      metadata: { name: args.name },
      spec: {
        project: (args.project as string) ?? 'default',
        source: {
          repoURL: args.repo_url,
          path: args.path,
          targetRevision: (args.target_revision as string) ?? 'HEAD',
        },
        destination: {
          server: (args.dest_server as string) ?? 'https://kubernetes.default.svc',
          namespace: args.dest_namespace,
        },
        ...(args.sync_policy_automated ? {
          syncPolicy: {
            automated: {
              prune: (args.sync_policy_prune as boolean) ?? false,
              selfHeal: (args.sync_policy_self_heal as boolean) ?? false,
            },
          },
        } : {}),
      },
    };
    return this.fetchJSON(`${this.baseUrl}/applications`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  private async updateApplication(args: Record<string, unknown>): Promise<ToolResult> {
    // Fetch current spec first, then patch
    const getResult = await this.fetchJSON(`${this.baseUrl}/applications/${encodeURIComponent(String(args.name))}`);
    if (getResult.isError) return getResult;
    let current: Record<string, unknown>;
    try {
      current = JSON.parse(getResult.content[0].text) as Record<string, unknown>;
    } catch {
      return { content: [{ type: 'text', text: 'Failed to parse current application spec' }], isError: true };
    }
    const spec = (current.spec ?? {}) as Record<string, unknown>;
    const source = (spec.source ?? {}) as Record<string, unknown>;
    if (args.repo_url) source.repoURL = args.repo_url;
    if (args.path) source.path = args.path;
    if (args.target_revision) source.targetRevision = args.target_revision;
    if (args.dest_server || args.dest_namespace) {
      const dest = (spec.destination ?? {}) as Record<string, unknown>;
      if (args.dest_server) dest.server = args.dest_server;
      if (args.dest_namespace) dest.namespace = args.dest_namespace;
      spec.destination = dest;
    }
    spec.source = source;
    current.spec = spec;
    return this.fetchJSON(`${this.baseUrl}/applications/${encodeURIComponent(String(args.name))}`, {
      method: 'PUT',
      body: JSON.stringify(current),
    });
  }

  private async deleteApplication(args: Record<string, unknown>): Promise<ToolResult> {
    const cascade = (args.cascade as boolean) ?? true;
    return this.fetchJSON(
      `${this.baseUrl}/applications/${encodeURIComponent(String(args.name))}?cascade=${cascade}`,
      { method: 'DELETE' },
    );
  }

  private async syncApplication(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {};
    if (args.revision) body.revision = args.revision;
    if (args.prune) body.prune = args.prune;
    if (args.dry_run) body.dryRun = args.dry_run;
    if (args.force) body.force = args.force;
    if (args.resources) body.resources = args.resources;
    return this.fetchJSON(`${this.baseUrl}/applications/${encodeURIComponent(String(args.name))}/sync`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  private async rollbackApplication(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {};
    if (args.history_id !== undefined) body.id = args.history_id;
    if (args.prune) body.prune = args.prune;
    return this.fetchJSON(`${this.baseUrl}/applications/${encodeURIComponent(String(args.name))}/rollback`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  private async getApplicationResources(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.namespace) params.set('namespace', String(args.namespace));
    if (args.version) params.set('version', String(args.version));
    if (args.group) params.set('group', String(args.group));
    if (args.kind) params.set('kind', String(args.kind));
    const qs = params.toString();
    return this.fetchJSON(
      `${this.baseUrl}/applications/${encodeURIComponent(String(args.name))}/managed-resources${qs ? `?${qs}` : ''}`,
    );
  }

  private async getApplicationLogs(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.namespace) params.set('namespace', String(args.namespace));
    if (args.pod_name) params.set('podName', String(args.pod_name));
    if (args.container) params.set('container', String(args.container));
    params.set('tailLines', String((args.tail_lines as number) ?? 100));
    if (args.since_seconds) params.set('sinceSeconds', String(args.since_seconds));
    return this.fetchJSON(
      `${this.baseUrl}/applications/${encodeURIComponent(String(args.name))}/logs?${params}`,
    );
  }

  private async getApplicationEvents(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.resource_namespace) params.set('resourceNamespace', String(args.resource_namespace));
    if (args.resource_name) params.set('resourceName', String(args.resource_name));
    if (args.resource_uid) params.set('resourceUID', String(args.resource_uid));
    const qs = params.toString();
    return this.fetchJSON(
      `${this.baseUrl}/applications/${encodeURIComponent(String(args.name))}/events${qs ? `?${qs}` : ''}`,
    );
  }

  private async getResourceActions(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams({
      namespace: String(args.namespace),
      resourceName: String(args.resource_name),
      kind: String(args.kind),
    });
    if (args.version) params.set('version', String(args.version));
    if (args.group) params.set('group', String(args.group));
    return this.fetchJSON(
      `${this.baseUrl}/applications/${encodeURIComponent(String(args.name))}/resource/actions?${params}`,
    );
  }

  private async runResourceAction(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams({
      namespace: String(args.namespace),
      resourceName: String(args.resource_name),
      kind: String(args.kind),
    });
    if (args.version) params.set('version', String(args.version));
    if (args.group) params.set('group', String(args.group));
    return this.fetchJSON(
      `${this.baseUrl}/applications/${encodeURIComponent(String(args.name))}/resource/actions?${params}`,
      { method: 'POST', body: JSON.stringify({ action: args.action }) },
    );
  }

  private async listRepositories(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.force_refresh) params.set('forceRefresh', 'true');
    const qs = params.toString();
    return this.fetchJSON(`${this.baseUrl}/repositories${qs ? `?${qs}` : ''}`);
  }

  private async getRepository(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fetchJSON(`${this.baseUrl}/repositories/${encodeURIComponent(String(args.repo))}`);
  }

  private async listRepositoryApps(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.revision) params.set('revision', String(args.revision));
    if (args.app_name) params.set('appName', String(args.app_name));
    if (args.app_project) params.set('appProject', String(args.app_project));
    const qs = params.toString();
    return this.fetchJSON(
      `${this.baseUrl}/repositories/${encodeURIComponent(String(args.repo))}/apps${qs ? `?${qs}` : ''}`,
    );
  }

  private async listProjects(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.name) params.set('name', String(args.name));
    const qs = params.toString();
    return this.fetchJSON(`${this.baseUrl}/projects${qs ? `?${qs}` : ''}`);
  }

  private async getProject(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fetchJSON(`${this.baseUrl}/projects/${encodeURIComponent(String(args.name))}`);
  }

  private async createProject(args: Record<string, unknown>): Promise<ToolResult> {
    const body = {
      project: {
        metadata: { name: args.name },
        spec: {
          description: args.description ?? '',
          sourceRepos: (args.source_repos as string[]) ?? ['*'],
          destinations: (args.destinations as unknown[]) ?? [{ server: '*', namespace: '*' }],
        },
      },
    };
    return this.fetchJSON(`${this.baseUrl}/projects`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  private async deleteProject(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fetchJSON(
      `${this.baseUrl}/projects/${encodeURIComponent(String(args.name))}`,
      { method: 'DELETE' },
    );
  }

  private async listClusters(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.name) params.set('name', String(args.name));
    const qs = params.toString();
    return this.fetchJSON(`${this.baseUrl}/clusters${qs ? `?${qs}` : ''}`);
  }

  private async getCluster(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fetchJSON(`${this.baseUrl}/clusters/${encodeURIComponent(String(args.server))}`);
  }

  private async getServerVersion(): Promise<ToolResult> {
    // ArgoCD version endpoint is at /api/version (not /api/v1/version)
    const versionUrl = this.baseUrl.replace(/\/api\/v1$/, '/api') + '/version';
    return this.fetchJSON(versionUrl);
  }

  private async getServerSettings(): Promise<ToolResult> {
    return this.fetchJSON(`${this.baseUrl}/settings`);
  }

  static catalog() {
    return {
      name: 'argocd',
      displayName: 'Argo CD',
      version: '1.0.0',
      category: 'devops' as const,
      keywords: ['argocd', 'argo', 'gitops', 'kubernetes', 'deploy', 'sync', 'cd', 'continuous delivery', 'k8s', 'helm', 'kustomize'],
      toolNames: [
        'list_applications', 'get_application', 'create_application', 'update_application',
        'delete_application', 'sync_application', 'rollback_application',
        'get_application_resources', 'get_application_logs', 'get_application_events',
        'get_resource_actions', 'run_resource_action',
        'list_repositories', 'get_repository', 'list_repository_apps',
        'list_projects', 'get_project', 'create_project', 'delete_project',
        'list_clusters', 'get_cluster', 'get_server_version', 'get_settings',
      ],
      description: 'GitOps continuous delivery for Kubernetes: manage applications, sync deployments, rollback, query resources and logs, manage projects and clusters.',
      author: 'protectnil' as const,
    };
  }
}

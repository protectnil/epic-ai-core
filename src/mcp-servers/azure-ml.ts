/**
 * Microsoft Azure Machine Learning MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/microsoft/mcp (Azure.Mcp.Server) — transport: stdio/streamable-HTTP, auth: Entra ID
// The Azure MCP Server 1.0 (GA) covers 40+ Azure services (Storage, Cosmos DB, App Service, Monitor,
// Key Vault, etc.) but does NOT cover Azure Machine Learning workspace-level operations:
// job management, model registry, online/batch endpoints, computes, datastores, or environments.
// This adapter fills that gap with dedicated AML workspace operations.
// Our adapter covers: 20 tools (jobs, models, environments, computes, datastores,
// online endpoints, batch endpoints). Vendor MCP covers: broad Azure services excluding AML workspace ops.
// Recommendation: Use microsoft/mcp for general Azure management. Use this adapter for AML MLOps workflows.
//
// Base URL: https://management.azure.com
// Auth: Azure AD Bearer token — scope https://management.azure.com/.default
//       Obtain via: az account get-access-token --resource https://management.azure.com
// Docs: https://learn.microsoft.com/en-us/rest/api/azureml/
// Rate limits: ~120 req/min per workspace for management plane operations

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface AzureMLConfig {
  subscriptionId: string;
  resourceGroupName: string;
  workspaceName: string;
  accessToken: string;
  baseUrl?: string;
  apiVersion?: string;
}

function truncate(text: string): string {
  return text.length > 10_000
    ? text.slice(0, 10_000) + `\n... [truncated, ${text.length} total chars]`
    : text;
}

export class AzureMLMCPServer extends MCPAdapterBase {
  private readonly subscriptionId: string;
  private readonly resourceGroupName: string;
  private readonly workspaceName: string;
  private readonly accessToken: string;
  private readonly baseUrl: string;
  private readonly apiVersion: string;

  constructor(config: AzureMLConfig) {
    super();
    this.subscriptionId = config.subscriptionId;
    this.resourceGroupName = config.resourceGroupName;
    this.workspaceName = config.workspaceName;
    this.accessToken = config.accessToken;
    this.baseUrl = config.baseUrl || 'https://management.azure.com';
    this.apiVersion = config.apiVersion || '2024-10-01';
  }

  private workspacePath(): string {
    return `/subscriptions/${this.subscriptionId}/resourceGroups/${this.resourceGroupName}/providers/Microsoft.MachineLearningServices/workspaces/${this.workspaceName}`;
  }

  private get headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
    };
  }

  static catalog() {
    return {
      name: 'azure-ml',
      displayName: 'Azure Machine Learning',
      version: '1.0.0',
      category: 'ai-ml' as const,
      keywords: ['azure ml', 'azure machine learning', 'aml', 'mlops', 'training', 'model registry', 'endpoint', 'inference', 'compute', 'datastore', 'environment', 'pipeline', 'experiment'],
      toolNames: [
        'get_workspace',
        'list_jobs', 'get_job', 'create_job', 'cancel_job',
        'list_models', 'get_model', 'list_model_versions',
        'list_environments', 'get_environment',
        'list_online_endpoints', 'get_online_endpoint', 'list_online_deployments',
        'list_batch_endpoints', 'get_batch_endpoint',
        'list_computes', 'get_compute',
        'list_datastores', 'get_datastore',
        'list_components',
      ],
      description: 'Azure Machine Learning MLOps: training jobs, model registry, online and batch endpoints, computes, datastores, environments, and components.',
      author: 'protectnil' as const,
    };
  }

  get tools(): ToolDefinition[] {
    return [
      // ── Workspace ────────────────────────────────────────────────────────
      {
        name: 'get_workspace',
        description: 'Get details of the configured Azure Machine Learning workspace including SKU, location, and provisioning state.',
        inputSchema: { type: 'object', properties: {} },
      },
      // ── Jobs ─────────────────────────────────────────────────────────────
      {
        name: 'list_jobs',
        description: 'List training jobs in the Azure ML workspace with optional type and status filters.',
        inputSchema: {
          type: 'object',
          properties: {
            job_type: { type: 'string', description: 'Filter by job type: Command, Sweep, Pipeline, AutoML (default: all types)' },
            status: { type: 'string', description: 'Filter by status: Running, Completed, Failed, Canceled, NotStarted, Queued (default: all statuses)' },
            tag: { type: 'string', description: 'Filter by tag in format key=value, e.g. experiment=my-exp' },
            skip: { type: 'string', description: 'Continuation token for pagination' },
            list_view_type: { type: 'string', description: 'View filter: ActiveOnly, ArchivedOnly, All (default: ActiveOnly)' },
          },
        },
      },
      {
        name: 'get_job',
        description: 'Get details and current status for a specific Azure ML training job.',
        inputSchema: {
          type: 'object',
          properties: {
            job_name: { type: 'string', description: 'Job name' },
          },
          required: ['job_name'],
        },
      },
      {
        name: 'create_job',
        description: 'Create or update an Azure ML training job (Command, Sweep, Pipeline, or AutoML type).',
        inputSchema: {
          type: 'object',
          properties: {
            job_name: { type: 'string', description: 'Unique name for the job (alphanumeric and hyphens)' },
            job_spec: {
              type: 'object',
              description: 'Job specification object. Must include jobType (Command, Sweep, Pipeline, AutoML) plus relevant configuration: command, environmentId, computeId, resources, etc.',
            },
          },
          required: ['job_name', 'job_spec'],
        },
      },
      {
        name: 'cancel_job',
        description: 'Cancel a running or queued Azure ML training job.',
        inputSchema: {
          type: 'object',
          properties: {
            job_name: { type: 'string', description: 'Name of the job to cancel' },
          },
          required: ['job_name'],
        },
      },
      // ── Models ───────────────────────────────────────────────────────────
      {
        name: 'list_models',
        description: 'List registered model containers in the Azure ML model registry.',
        inputSchema: {
          type: 'object',
          properties: {
            list_view_type: { type: 'string', description: 'View filter: ActiveOnly, ArchivedOnly, All (default: ActiveOnly)' },
            skip: { type: 'string', description: 'Continuation token for pagination' },
            name: { type: 'string', description: 'Filter by model name prefix' },
          },
        },
      },
      {
        name: 'get_model',
        description: 'Get details for a specific registered model version in the Azure ML model registry.',
        inputSchema: {
          type: 'object',
          properties: {
            model_name: { type: 'string', description: 'Registered model name' },
            version: { type: 'string', description: 'Model version string, e.g. 1 or 3' },
          },
          required: ['model_name', 'version'],
        },
      },
      {
        name: 'list_model_versions',
        description: 'List all versions of a specific registered model in the Azure ML model registry.',
        inputSchema: {
          type: 'object',
          properties: {
            model_name: { type: 'string', description: 'Registered model name' },
            list_view_type: { type: 'string', description: 'View filter: ActiveOnly, ArchivedOnly, All (default: ActiveOnly)' },
            skip: { type: 'string', description: 'Continuation token for pagination' },
          },
          required: ['model_name'],
        },
      },
      // ── Environments ─────────────────────────────────────────────────────
      {
        name: 'list_environments',
        description: 'List registered environment containers in the Azure ML workspace.',
        inputSchema: {
          type: 'object',
          properties: {
            list_view_type: { type: 'string', description: 'View filter: ActiveOnly, ArchivedOnly, All (default: ActiveOnly)' },
            skip: { type: 'string', description: 'Continuation token for pagination' },
          },
        },
      },
      {
        name: 'get_environment',
        description: 'Get details for a specific Azure ML environment version including Docker image and conda dependencies.',
        inputSchema: {
          type: 'object',
          properties: {
            environment_name: { type: 'string', description: 'Environment name' },
            version: { type: 'string', description: 'Environment version string, e.g. 1' },
          },
          required: ['environment_name', 'version'],
        },
      },
      // ── Online Endpoints ──────────────────────────────────────────────────
      {
        name: 'list_online_endpoints',
        description: 'List managed online (real-time inference) endpoints in the Azure ML workspace.',
        inputSchema: {
          type: 'object',
          properties: {
            skip: { type: 'string', description: 'Continuation token for pagination' },
            compute_type: { type: 'string', description: 'Filter by compute type: Managed, Kubernetes' },
          },
        },
      },
      {
        name: 'get_online_endpoint',
        description: 'Get details and scoring URI for a specific Azure ML managed online endpoint.',
        inputSchema: {
          type: 'object',
          properties: {
            endpoint_name: { type: 'string', description: 'Name of the online endpoint' },
          },
          required: ['endpoint_name'],
        },
      },
      {
        name: 'list_online_deployments',
        description: 'List deployments under a specific online endpoint, including traffic allocation and instance count.',
        inputSchema: {
          type: 'object',
          properties: {
            endpoint_name: { type: 'string', description: 'Name of the online endpoint' },
            skip: { type: 'string', description: 'Continuation token for pagination' },
          },
          required: ['endpoint_name'],
        },
      },
      // ── Batch Endpoints ───────────────────────────────────────────────────
      {
        name: 'list_batch_endpoints',
        description: 'List batch inference endpoints in the Azure ML workspace.',
        inputSchema: {
          type: 'object',
          properties: {
            skip: { type: 'string', description: 'Continuation token for pagination' },
          },
        },
      },
      {
        name: 'get_batch_endpoint',
        description: 'Get details for a specific Azure ML batch inference endpoint.',
        inputSchema: {
          type: 'object',
          properties: {
            endpoint_name: { type: 'string', description: 'Name of the batch endpoint' },
          },
          required: ['endpoint_name'],
        },
      },
      // ── Computes ──────────────────────────────────────────────────────────
      {
        name: 'list_computes',
        description: 'List compute targets in the Azure ML workspace (clusters, instances, AKS, etc.).',
        inputSchema: {
          type: 'object',
          properties: {
            skip: { type: 'string', description: 'Continuation token for pagination' },
          },
        },
      },
      {
        name: 'get_compute',
        description: 'Get details for a specific compute target in the Azure ML workspace.',
        inputSchema: {
          type: 'object',
          properties: {
            compute_name: { type: 'string', description: 'Name of the compute target' },
          },
          required: ['compute_name'],
        },
      },
      // ── Datastores ────────────────────────────────────────────────────────
      {
        name: 'list_datastores',
        description: 'List registered datastores in the Azure ML workspace (Azure Blob, ADLS, Azure Files, etc.).',
        inputSchema: {
          type: 'object',
          properties: {
            skip: { type: 'string', description: 'Continuation token for pagination' },
            is_default: { type: 'boolean', description: 'Filter to only return the default datastore (default: false)' },
          },
        },
      },
      {
        name: 'get_datastore',
        description: 'Get connection details for a specific registered datastore in the Azure ML workspace.',
        inputSchema: {
          type: 'object',
          properties: {
            datastore_name: { type: 'string', description: 'Name of the datastore' },
          },
          required: ['datastore_name'],
        },
      },
      // ── Components ────────────────────────────────────────────────────────
      {
        name: 'list_components',
        description: 'List reusable pipeline components registered in the Azure ML workspace.',
        inputSchema: {
          type: 'object',
          properties: {
            list_view_type: { type: 'string', description: 'View filter: ActiveOnly, ArchivedOnly, All (default: ActiveOnly)' },
            skip: { type: 'string', description: 'Continuation token for pagination' },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'get_workspace':             return this.getWorkspace();
        case 'list_jobs':                 return this.listJobs(args);
        case 'get_job':                   return this.getJob(args);
        case 'create_job':                return this.createJob(args);
        case 'cancel_job':                return this.cancelJob(args);
        case 'list_models':               return this.listModels(args);
        case 'get_model':                 return this.getModel(args);
        case 'list_model_versions':       return this.listModelVersions(args);
        case 'list_environments':         return this.listEnvironments(args);
        case 'get_environment':           return this.getEnvironment(args);
        case 'list_online_endpoints':     return this.listOnlineEndpoints(args);
        case 'get_online_endpoint':       return this.getOnlineEndpoint(args);
        case 'list_online_deployments':   return this.listOnlineDeployments(args);
        case 'list_batch_endpoints':      return this.listBatchEndpoints(args);
        case 'get_batch_endpoint':        return this.getBatchEndpoint(args);
        case 'list_computes':             return this.listComputes(args);
        case 'get_compute':               return this.getCompute(args);
        case 'list_datastores':           return this.listDatastores(args);
        case 'get_datastore':             return this.getDatastore(args);
        case 'list_components':           return this.listComponents(args);
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

  // ── Helpers ───────────────────────────────────────────────────────────────

  private av(): string {
    return `api-version=${this.apiVersion}`;
  }

  private wp(): string {
    return this.workspacePath();
  }

  private async fetchJSON(url: string, options?: RequestInit): Promise<ToolResult> {
    const response = await this.fetchWithRetry(url, { headers: this.headers, ...options });
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `API error: ${response.status} ${errText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Azure ML returned non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  // ── Workspace ─────────────────────────────────────────────────────────────

  private async getWorkspace(): Promise<ToolResult> {
    return this.fetchJSON(`${this.baseUrl}${this.wp()}?${this.av()}`);
  }

  // ── Jobs ──────────────────────────────────────────────────────────────────

  private async listJobs(args: Record<string, unknown>): Promise<ToolResult> {
    let url = `${this.baseUrl}${this.wp()}/jobs?${this.av()}`;
    if (args.job_type) url += `&jobType=${encodeURIComponent(String(args.job_type))}`;
    if (args.status) url += `&status=${encodeURIComponent(String(args.status))}`;
    if (args.tag) url += `&tag=${encodeURIComponent(String(args.tag))}`;
    if (args.list_view_type) url += `&listViewType=${encodeURIComponent(String(args.list_view_type))}`;
    if (args.skip) url += `&$skip=${encodeURIComponent(String(args.skip))}`;
    return this.fetchJSON(url);
  }

  private async getJob(args: Record<string, unknown>): Promise<ToolResult> {
    const jobName = encodeURIComponent(String(args.job_name));
    return this.fetchJSON(`${this.baseUrl}${this.wp()}/jobs/${jobName}?${this.av()}`);
  }

  private async createJob(args: Record<string, unknown>): Promise<ToolResult> {
    const jobName = encodeURIComponent(String(args.job_name));
    const url = `${this.baseUrl}${this.wp()}/jobs/${jobName}?${this.av()}`;
    const jobSpec = args.job_spec as Record<string, unknown>;
    return this.fetchJSON(url, { method: 'PUT', body: JSON.stringify({ properties: jobSpec }) });
  }

  private async cancelJob(args: Record<string, unknown>): Promise<ToolResult> {
    const jobName = encodeURIComponent(String(args.job_name));
    const url = `${this.baseUrl}${this.wp()}/jobs/${jobName}/cancel?${this.av()}`;
    const response = await this.fetchWithRetry(url, { method: 'POST', headers: this.headers, body: '{}' });
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `Failed to cancel job: ${response.status} ${errText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: `Job ${encodeURIComponent(args.job_name as string)} cancel accepted (HTTP ${response.status}).` }], isError: false };
  }

  // ── Models ────────────────────────────────────────────────────────────────

  private async listModels(args: Record<string, unknown>): Promise<ToolResult> {
    let url = `${this.baseUrl}${this.wp()}/models?${this.av()}`;
    if (args.list_view_type) url += `&listViewType=${encodeURIComponent(String(args.list_view_type))}`;
    if (args.name) url += `&name=${encodeURIComponent(String(args.name))}`;
    if (args.skip) url += `&$skip=${encodeURIComponent(String(args.skip))}`;
    return this.fetchJSON(url);
  }

  private async getModel(args: Record<string, unknown>): Promise<ToolResult> {
    const modelName = encodeURIComponent(String(args.model_name));
    const version = encodeURIComponent(String(args.version));
    return this.fetchJSON(`${this.baseUrl}${this.wp()}/models/${modelName}/versions/${version}?${this.av()}`);
  }

  private async listModelVersions(args: Record<string, unknown>): Promise<ToolResult> {
    const modelName = encodeURIComponent(String(args.model_name));
    let url = `${this.baseUrl}${this.wp()}/models/${modelName}/versions?${this.av()}`;
    if (args.list_view_type) url += `&listViewType=${encodeURIComponent(String(args.list_view_type))}`;
    if (args.skip) url += `&$skip=${encodeURIComponent(String(args.skip))}`;
    return this.fetchJSON(url);
  }

  // ── Environments ──────────────────────────────────────────────────────────

  private async listEnvironments(args: Record<string, unknown>): Promise<ToolResult> {
    let url = `${this.baseUrl}${this.wp()}/environments?${this.av()}`;
    if (args.list_view_type) url += `&listViewType=${encodeURIComponent(String(args.list_view_type))}`;
    if (args.skip) url += `&$skip=${encodeURIComponent(String(args.skip))}`;
    return this.fetchJSON(url);
  }

  private async getEnvironment(args: Record<string, unknown>): Promise<ToolResult> {
    const envName = encodeURIComponent(String(args.environment_name));
    const version = encodeURIComponent(String(args.version));
    return this.fetchJSON(`${this.baseUrl}${this.wp()}/environments/${envName}/versions/${version}?${this.av()}`);
  }

  // ── Online Endpoints ──────────────────────────────────────────────────────

  private async listOnlineEndpoints(args: Record<string, unknown>): Promise<ToolResult> {
    let url = `${this.baseUrl}${this.wp()}/onlineEndpoints?${this.av()}`;
    if (args.skip) url += `&$skip=${encodeURIComponent(String(args.skip))}`;
    if (args.compute_type) url += `&computeType=${encodeURIComponent(String(args.compute_type))}`;
    return this.fetchJSON(url);
  }

  private async getOnlineEndpoint(args: Record<string, unknown>): Promise<ToolResult> {
    const ep = encodeURIComponent(String(args.endpoint_name));
    return this.fetchJSON(`${this.baseUrl}${this.wp()}/onlineEndpoints/${ep}?${this.av()}`);
  }

  private async listOnlineDeployments(args: Record<string, unknown>): Promise<ToolResult> {
    const ep = encodeURIComponent(String(args.endpoint_name));
    let url = `${this.baseUrl}${this.wp()}/onlineEndpoints/${ep}/deployments?${this.av()}`;
    if (args.skip) url += `&$skip=${encodeURIComponent(String(args.skip))}`;
    return this.fetchJSON(url);
  }

  // ── Batch Endpoints ───────────────────────────────────────────────────────

  private async listBatchEndpoints(args: Record<string, unknown>): Promise<ToolResult> {
    let url = `${this.baseUrl}${this.wp()}/batchEndpoints?${this.av()}`;
    if (args.skip) url += `&$skip=${encodeURIComponent(String(args.skip))}`;
    return this.fetchJSON(url);
  }

  private async getBatchEndpoint(args: Record<string, unknown>): Promise<ToolResult> {
    const ep = encodeURIComponent(String(args.endpoint_name));
    return this.fetchJSON(`${this.baseUrl}${this.wp()}/batchEndpoints/${ep}?${this.av()}`);
  }

  // ── Computes ──────────────────────────────────────────────────────────────

  private async listComputes(args: Record<string, unknown>): Promise<ToolResult> {
    let url = `${this.baseUrl}${this.wp()}/computes?${this.av()}`;
    if (args.skip) url += `&$skip=${encodeURIComponent(String(args.skip))}`;
    return this.fetchJSON(url);
  }

  private async getCompute(args: Record<string, unknown>): Promise<ToolResult> {
    const computeName = encodeURIComponent(String(args.compute_name));
    return this.fetchJSON(`${this.baseUrl}${this.wp()}/computes/${computeName}?${this.av()}`);
  }

  // ── Datastores ────────────────────────────────────────────────────────────

  private async listDatastores(args: Record<string, unknown>): Promise<ToolResult> {
    let url = `${this.baseUrl}${this.wp()}/datastores?${this.av()}`;
    if (args.skip) url += `&$skip=${encodeURIComponent(String(args.skip))}`;
    if (args.is_default) url += `&isDefault=true`;
    return this.fetchJSON(url);
  }

  private async getDatastore(args: Record<string, unknown>): Promise<ToolResult> {
    const dsName = encodeURIComponent(String(args.datastore_name));
    return this.fetchJSON(`${this.baseUrl}${this.wp()}/datastores/${dsName}?${this.av()}`);
  }

  // ── Components ────────────────────────────────────────────────────────────

  private async listComponents(args: Record<string, unknown>): Promise<ToolResult> {
    let url = `${this.baseUrl}${this.wp()}/components?${this.av()}`;
    if (args.list_view_type) url += `&listViewType=${encodeURIComponent(String(args.list_view_type))}`;
    if (args.skip) url += `&$skip=${encodeURIComponent(String(args.skip))}`;
    return this.fetchJSON(url);
  }
}

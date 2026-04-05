/**
 * Google Cloud MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: Multiple official remote MCP servers announced Dec 2025 (transport: streamable-HTTP, auth: OAuth2/ADC)
// Google now publishes per-service remote MCP servers at https://docs.cloud.google.com/mcp/supported-products
// Relevant per-service remote MCPs:
//   cloudresourcemanager.googleapis.com/mcp — 1 tool: search_projects
//   compute.googleapis.com/mcp             — tools: list_instances, get_instance, stop_instance, reset_instance,
//                                            list_machine_types, list_images, list_reservations, list_snapshots, etc.
//   logging.googleapis.com/mcp             — tools: list_log_entries, list_log_names
//   bigquery.googleapis.com/mcp            — BigQuery-specific tools (run_query, list_datasets, list_tables, etc.)
//   run.googleapis.com/mcp                 — 3 tools: get_service, list_services, deploy_service_from_image
//   container.googleapis.com/mcp           — tools: kube_api_resources, kube_get, list_clusters, get_cluster,
//                                            list_operations, get_operation
// No official remote MCP for: Cloud Storage, Cloud Functions, IAM (as of 2026-03-28)
// Also: https://github.com/googleapis/gcloud-mcp (Apache-2.0, active 2026) — stdio, wraps gcloud CLI,
//   requires gcloud installation at runtime; covers Logging, Monitoring, Storage, Backup/DR.
//
// Recommendation: use-both — the per-service remote MCPs (Compute, Logging, Cloud Run, GKE, BigQuery,
// Resource Manager) expose operations our REST adapter also covers, but also expose unique tools
// (stop_instance, reset_instance, deploy_service_from_image, kube_api_resources, kube_get).
// Our REST adapter covers Cloud Storage, Cloud Functions, and IAM that have no remote MCP.
// For air-gapped/serverless deployments without ADC setup, use this adapter for all services.
//
// Integration: use-both
// MCP-sourced unique tools: stop_instance, reset_instance, list_machine_types, list_images,
//   list_reservations, list_snapshots, deploy_service_from_image, kube_api_resources, kube_get,
//   get_zone_operation, search_projects (replaces list_projects/get_project)
// REST-sourced unique tools: list_buckets, list_bucket_objects, list_cloud_functions, get_cloud_function,
//   list_service_accounts, list_iam_policies
// REST-sourced shared (also in MCP): list_instances, get_instance, list_logs, list_cloud_run_services,
//   get_cloud_run_service, list_gke_clusters, get_gke_cluster, list_bigquery_datasets, list_bigquery_tables,
//   list_projects, get_project
//
// Multiple API base URLs (GCP has no single base):
//   Cloud Resource Manager: https://cloudresourcemanager.googleapis.com/v3
//   Compute Engine:         https://compute.googleapis.com/compute/v1
//   Cloud Logging:          https://logging.googleapis.com/v2
//   Cloud Storage:          https://storage.googleapis.com/storage/v1
//   Cloud Run:              https://run.googleapis.com/v2  (upgraded from v1; v2 uses location in path)
//   Cloud Functions:        https://cloudfunctions.googleapis.com/v2
//   BigQuery:               https://bigquery.googleapis.com/bigquery/v2
//   IAM:                    https://iam.googleapis.com/v1
//   GKE:                    https://container.googleapis.com/v1
// Auth: OAuth2 Bearer token or service account access token
// Docs: https://cloud.google.com/apis/docs/overview
// Rate limits: Per-API; most have 1,000-10,000 req/100s per user quota.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface GoogleCloudConfig {
  accessToken: string;
  projectId?: string;
}

const CRM_BASE = 'https://cloudresourcemanager.googleapis.com/v3';
const COMPUTE_BASE = 'https://compute.googleapis.com/compute/v1';
const LOGGING_BASE = 'https://logging.googleapis.com/v2';
const STORAGE_BASE = 'https://storage.googleapis.com/storage/v1';
const RUN_BASE = 'https://run.googleapis.com/v2';
const FUNCTIONS_BASE = 'https://cloudfunctions.googleapis.com/v2';
const BIGQUERY_BASE = 'https://bigquery.googleapis.com/bigquery/v2';
const IAM_BASE = 'https://iam.googleapis.com/v1';
const GKE_BASE = 'https://container.googleapis.com/v1';

export class GoogleCloudMCPServer extends MCPAdapterBase {
  private readonly token: string;
  private readonly defaultProjectId: string;

  constructor(config: GoogleCloudConfig) {
    super();
    this.token = config.accessToken;
    this.defaultProjectId = config.projectId ?? '';
  }

  static catalog() {
    return {
      name: 'google-cloud',
      displayName: 'Google Cloud',
      version: '1.0.0',
      category: 'cloud' as const,
      keywords: [
        'google cloud', 'gcp', 'compute', 'gce', 'gke', 'cloud run', 'cloud functions',
        'bigquery', 'cloud storage', 'gcs', 'iam', 'logging', 'project', 'kubernetes',
        'serverless', 'instance', 'bucket', 'dataset', 'service account',
      ],
      toolNames: [
        'list_projects',
        'get_project',
        'list_instances',
        'get_instance',
        'list_buckets',
        'list_bucket_objects',
        'list_logs',
        'list_cloud_run_services',
        'get_cloud_run_service',
        'list_cloud_functions',
        'get_cloud_function',
        'list_gke_clusters',
        'get_gke_cluster',
        'list_bigquery_datasets',
        'list_bigquery_tables',
        'list_service_accounts',
        'list_iam_policies',
      ],
      description: 'Google Cloud Platform management: projects, Compute Engine, Cloud Storage, Cloud Run, Cloud Functions, GKE, BigQuery, IAM, and Cloud Logging.',
      author: 'protectnil' as const,
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_projects',
        description: 'List all Google Cloud projects accessible with the provided credentials, with optional pagination.',
        inputSchema: {
          type: 'object',
          properties: {
            pageSize: {
              type: 'number',
              description: 'Maximum number of projects to return (default: 50)',
            },
            pageToken: {
              type: 'string',
              description: 'Pagination token from a previous response',
            },
            filter: {
              type: 'string',
              description: 'Filter expression (e.g., "labels.env:prod" or "name:my-project")',
            },
          },
        },
      },
      {
        name: 'get_project',
        description: 'Get details for a specific Google Cloud project by project ID or number.',
        inputSchema: {
          type: 'object',
          properties: {
            projectId: {
              type: 'string',
              description: 'Google Cloud project ID or number (e.g., "my-project" or "123456789")',
            },
          },
          required: ['projectId'],
        },
      },
      {
        name: 'list_instances',
        description: 'List Compute Engine VM instances in a project. Use zone="-" to list across all zones (aggregated).',
        inputSchema: {
          type: 'object',
          properties: {
            projectId: {
              type: 'string',
              description: 'Google Cloud project ID (defaults to config projectId)',
            },
            zone: {
              type: 'string',
              description: 'Compute zone (e.g., "us-central1-a"). Use "-" to list instances across all zones.',
            },
            maxResults: {
              type: 'number',
              description: 'Maximum number of instances to return (default: 50)',
            },
            pageToken: {
              type: 'string',
              description: 'Pagination token from a previous response',
            },
            filter: {
              type: 'string',
              description: 'Filter expression (e.g., "status=RUNNING" or "labels.env=prod")',
            },
          },
          required: ['zone'],
        },
      },
      {
        name: 'get_instance',
        description: 'Get detailed information for a specific Compute Engine VM instance.',
        inputSchema: {
          type: 'object',
          properties: {
            projectId: {
              type: 'string',
              description: 'Google Cloud project ID',
            },
            zone: {
              type: 'string',
              description: 'Compute zone (e.g., "us-central1-a")',
            },
            instance: {
              type: 'string',
              description: 'Instance name',
            },
          },
          required: ['zone', 'instance'],
        },
      },
      {
        name: 'list_buckets',
        description: 'List Cloud Storage buckets in a Google Cloud project.',
        inputSchema: {
          type: 'object',
          properties: {
            projectId: {
              type: 'string',
              description: 'Google Cloud project ID (defaults to config projectId)',
            },
            maxResults: {
              type: 'number',
              description: 'Maximum number of buckets to return (default: 50)',
            },
            pageToken: {
              type: 'string',
              description: 'Pagination token from a previous response',
            },
            prefix: {
              type: 'string',
              description: 'Filter buckets by name prefix',
            },
          },
        },
      },
      {
        name: 'list_bucket_objects',
        description: 'List objects (files) in a Cloud Storage bucket with optional prefix filter and pagination.',
        inputSchema: {
          type: 'object',
          properties: {
            bucket: {
              type: 'string',
              description: 'Cloud Storage bucket name (required)',
            },
            prefix: {
              type: 'string',
              description: 'Filter objects by key prefix (e.g., "logs/2026/")',
            },
            maxResults: {
              type: 'number',
              description: 'Maximum number of objects to return (default: 50)',
            },
            pageToken: {
              type: 'string',
              description: 'Pagination token from a previous response',
            },
          },
          required: ['bucket'],
        },
      },
      {
        name: 'list_logs',
        description: 'Query Cloud Logging log entries for a project using an optional filter expression and sort order.',
        inputSchema: {
          type: 'object',
          properties: {
            projectId: {
              type: 'string',
              description: 'Google Cloud project ID (defaults to config projectId)',
            },
            filter: {
              type: 'string',
              description: 'Advanced log filter expression (e.g., \'resource.type="gce_instance" severity>=ERROR\')',
            },
            pageSize: {
              type: 'number',
              description: 'Maximum number of log entries to return (default: 50)',
            },
            orderBy: {
              type: 'string',
              description: 'Sort order: "timestamp asc" or "timestamp desc" (default: "timestamp desc")',
            },
            pageToken: {
              type: 'string',
              description: 'Pagination token from a previous response',
            },
          },
        },
      },
      {
        name: 'list_cloud_run_services',
        description: 'List Cloud Run services deployed in a specific project and region.',
        inputSchema: {
          type: 'object',
          properties: {
            projectId: {
              type: 'string',
              description: 'Google Cloud project ID (defaults to config projectId)',
            },
            location: {
              type: 'string',
              description: 'Cloud Run region (e.g., "us-central1"). Use "-" to list across all regions.',
            },
          },
          required: ['location'],
        },
      },
      {
        name: 'get_cloud_run_service',
        description: 'Get configuration and status details for a specific Cloud Run service.',
        inputSchema: {
          type: 'object',
          properties: {
            projectId: {
              type: 'string',
              description: 'Google Cloud project ID',
            },
            location: {
              type: 'string',
              description: 'Cloud Run region (e.g., "us-central1")',
            },
            serviceName: {
              type: 'string',
              description: 'Cloud Run service name',
            },
          },
          required: ['location', 'serviceName'],
        },
      },
      {
        name: 'list_cloud_functions',
        description: 'List Cloud Functions (gen 2) deployed in a project and location.',
        inputSchema: {
          type: 'object',
          properties: {
            projectId: {
              type: 'string',
              description: 'Google Cloud project ID (defaults to config projectId)',
            },
            location: {
              type: 'string',
              description: 'Cloud Functions location (e.g., "us-central1"). Use "-" for all locations.',
            },
          },
          required: ['location'],
        },
      },
      {
        name: 'get_cloud_function',
        description: 'Get configuration and status details for a specific Cloud Function.',
        inputSchema: {
          type: 'object',
          properties: {
            projectId: {
              type: 'string',
              description: 'Google Cloud project ID',
            },
            location: {
              type: 'string',
              description: 'Cloud Functions location (e.g., "us-central1")',
            },
            functionName: {
              type: 'string',
              description: 'Cloud Function name',
            },
          },
          required: ['location', 'functionName'],
        },
      },
      {
        name: 'list_gke_clusters',
        description: 'List Google Kubernetes Engine (GKE) clusters in a project and zone/region.',
        inputSchema: {
          type: 'object',
          properties: {
            projectId: {
              type: 'string',
              description: 'Google Cloud project ID (defaults to config projectId)',
            },
            zone: {
              type: 'string',
              description: 'Zone or region (e.g., "us-central1-a" or "us-central1"). Use "-" for all zones.',
            },
          },
          required: ['zone'],
        },
      },
      {
        name: 'get_gke_cluster',
        description: 'Get details for a specific GKE cluster including node pools, version, and network configuration.',
        inputSchema: {
          type: 'object',
          properties: {
            projectId: {
              type: 'string',
              description: 'Google Cloud project ID',
            },
            zone: {
              type: 'string',
              description: 'Zone or region of the cluster',
            },
            clusterId: {
              type: 'string',
              description: 'GKE cluster name',
            },
          },
          required: ['zone', 'clusterId'],
        },
      },
      {
        name: 'list_bigquery_datasets',
        description: 'List BigQuery datasets in a Google Cloud project.',
        inputSchema: {
          type: 'object',
          properties: {
            projectId: {
              type: 'string',
              description: 'Google Cloud project ID (defaults to config projectId)',
            },
            maxResults: {
              type: 'number',
              description: 'Maximum number of datasets to return (default: 50)',
            },
            pageToken: {
              type: 'string',
              description: 'Pagination token from a previous response',
            },
            filter: {
              type: 'string',
              description: 'Filter expression for datasets (e.g., "labels.env:prod")',
            },
          },
        },
      },
      {
        name: 'list_bigquery_tables',
        description: 'List tables in a BigQuery dataset.',
        inputSchema: {
          type: 'object',
          properties: {
            projectId: {
              type: 'string',
              description: 'Google Cloud project ID (defaults to config projectId)',
            },
            datasetId: {
              type: 'string',
              description: 'BigQuery dataset ID (required)',
            },
            maxResults: {
              type: 'number',
              description: 'Maximum number of tables to return (default: 50)',
            },
            pageToken: {
              type: 'string',
              description: 'Pagination token from a previous response',
            },
          },
          required: ['datasetId'],
        },
      },
      {
        name: 'list_service_accounts',
        description: 'List IAM service accounts in a Google Cloud project.',
        inputSchema: {
          type: 'object',
          properties: {
            projectId: {
              type: 'string',
              description: 'Google Cloud project ID (defaults to config projectId)',
            },
            pageSize: {
              type: 'number',
              description: 'Maximum number of service accounts to return (default: 50)',
            },
            pageToken: {
              type: 'string',
              description: 'Pagination token from a previous response',
            },
          },
        },
      },
      {
        name: 'list_iam_policies',
        description: 'Get the IAM policy (role bindings) for a Google Cloud project.',
        inputSchema: {
          type: 'object',
          properties: {
            projectId: {
              type: 'string',
              description: 'Google Cloud project ID to retrieve IAM policy for (defaults to config projectId)',
            },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_projects':
          return await this.listProjects(args);
        case 'get_project':
          return await this.getProject(args);
        case 'list_instances':
          return await this.listInstances(args);
        case 'get_instance':
          return await this.getInstance(args);
        case 'list_buckets':
          return await this.listBuckets(args);
        case 'list_bucket_objects':
          return await this.listBucketObjects(args);
        case 'list_logs':
          return await this.listLogs(args);
        case 'list_cloud_run_services':
          return await this.listCloudRunServices(args);
        case 'get_cloud_run_service':
          return await this.getCloudRunService(args);
        case 'list_cloud_functions':
          return await this.listCloudFunctions(args);
        case 'get_cloud_function':
          return await this.getCloudFunction(args);
        case 'list_gke_clusters':
          return await this.listGkeClusters(args);
        case 'get_gke_cluster':
          return await this.getGkeCluster(args);
        case 'list_bigquery_datasets':
          return await this.listBigqueryDatasets(args);
        case 'list_bigquery_tables':
          return await this.listBigqueryTables(args);
        case 'list_service_accounts':
          return await this.listServiceAccounts(args);
        case 'list_iam_policies':
          return await this.listIamPolicies(args);
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
      Authorization: `Bearer ${this.token}`,
      'Content-Type': 'application/json',
    };
  }

  private projectId(args: Record<string, unknown>): string {
    return (args.projectId as string) || this.defaultProjectId;
  }


  private async listProjects(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.pageSize) params.set('pageSize', String(args.pageSize));
    if (args.pageToken) params.set('pageToken', String(args.pageToken));
    if (args.filter) params.set('filter', args.filter as string);
    const response = await this.fetchWithRetry(
      `${CRM_BASE}/projects${params.toString() ? '?' + params.toString() : ''}`,
      { headers: this.headers },
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `GCP API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getProject(args: Record<string, unknown>): Promise<ToolResult> {
    const projectId = args.projectId as string;
    if (!projectId) {
      return { content: [{ type: 'text', text: 'projectId is required' }], isError: true };
    }
    const response = await this.fetchWithRetry(
      `${CRM_BASE}/projects/${encodeURIComponent(projectId)}`,
      { headers: this.headers },
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `GCP API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listInstances(args: Record<string, unknown>): Promise<ToolResult> {
    const projectId = this.projectId(args);
    const zone = args.zone as string;
    if (!zone) {
      return { content: [{ type: 'text', text: 'zone is required (use "-" for all zones)' }], isError: true };
    }
    const params = new URLSearchParams();
    if (args.maxResults) params.set('maxResults', String(args.maxResults));
    if (args.pageToken) params.set('pageToken', args.pageToken as string);
    if (args.filter) params.set('filter', args.filter as string);
    const isAggregated = zone === '-';
    const url = isAggregated
      ? `${COMPUTE_BASE}/projects/${projectId}/aggregated/instances${params.toString() ? '?' + params.toString() : ''}`
      : `${COMPUTE_BASE}/projects/${projectId}/zones/${zone}/instances${params.toString() ? '?' + params.toString() : ''}`;
    const response = await this.fetchWithRetry(url, { headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `GCP API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getInstance(args: Record<string, unknown>): Promise<ToolResult> {
    const projectId = this.projectId(args);
    const zone = args.zone as string;
    const instance = args.instance as string;
    if (!zone || !instance) {
      return { content: [{ type: 'text', text: 'zone and instance are required' }], isError: true };
    }
    const response = await this.fetchWithRetry(
      `${COMPUTE_BASE}/projects/${projectId}/zones/${zone}/instances/${encodeURIComponent(instance)}`,
      { headers: this.headers },
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `GCP API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listBuckets(args: Record<string, unknown>): Promise<ToolResult> {
    const projectId = this.projectId(args);
    const params = new URLSearchParams({ project: projectId });
    if (args.maxResults) params.set('maxResults', String(args.maxResults));
    if (args.pageToken) params.set('pageToken', args.pageToken as string);
    if (args.prefix) params.set('prefix', args.prefix as string);
    const response = await this.fetchWithRetry(
      `${STORAGE_BASE}/b?${params.toString()}`,
      { headers: this.headers },
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `GCP API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listBucketObjects(args: Record<string, unknown>): Promise<ToolResult> {
    const bucket = args.bucket as string;
    if (!bucket) {
      return { content: [{ type: 'text', text: 'bucket is required' }], isError: true };
    }
    const params = new URLSearchParams();
    if (args.prefix) params.set('prefix', args.prefix as string);
    if (args.maxResults) params.set('maxResults', String(args.maxResults));
    if (args.pageToken) params.set('pageToken', args.pageToken as string);
    const response = await this.fetchWithRetry(
      `${STORAGE_BASE}/b/${encodeURIComponent(bucket)}/o${params.toString() ? '?' + params.toString() : ''}`,
      { headers: this.headers },
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `GCP API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listLogs(args: Record<string, unknown>): Promise<ToolResult> {
    const projectId = this.projectId(args);
    const body: Record<string, unknown> = {
      resourceNames: [`projects/${projectId}`],
      orderBy: (args.orderBy as string) ?? 'timestamp desc',
    };
    if (args.filter) body.filter = String(args.filter);
    if (args.pageSize) body.pageSize = Number(args.pageSize);
    if (args.pageToken) body.pageToken = String(args.pageToken);
    const response = await this.fetchWithRetry(`${LOGGING_BASE}/entries:list`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `GCP API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listCloudRunServices(args: Record<string, unknown>): Promise<ToolResult> {
    const projectId = this.projectId(args);
    const location = args.location as string;
    if (!location) {
      return { content: [{ type: 'text', text: 'location is required (e.g., "us-central1" or "-" for all)' }], isError: true };
    }
    // Cloud Run v2: GET /v2/projects/{project}/locations/{location}/services
    const response = await this.fetchWithRetry(
      `${RUN_BASE}/projects/${encodeURIComponent(projectId)}/locations/${encodeURIComponent(location)}/services`,
      { headers: this.headers },
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `GCP API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getCloudRunService(args: Record<string, unknown>): Promise<ToolResult> {
    const projectId = this.projectId(args);
    const location = args.location as string;
    const serviceName = args.serviceName as string;
    if (!location || !serviceName) {
      return { content: [{ type: 'text', text: 'location and serviceName are required' }], isError: true };
    }
    // Cloud Run v2: GET /v2/projects/{project}/locations/{location}/services/{service}
    const response = await this.fetchWithRetry(
      `${RUN_BASE}/projects/${encodeURIComponent(projectId)}/locations/${encodeURIComponent(location)}/services/${encodeURIComponent(serviceName)}`,
      { headers: this.headers },
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `GCP API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listCloudFunctions(args: Record<string, unknown>): Promise<ToolResult> {
    const projectId = this.projectId(args);
    const location = args.location as string;
    if (!location) {
      return { content: [{ type: 'text', text: 'location is required (e.g., "us-central1" or "-" for all)' }], isError: true };
    }
    const parent = `projects/${projectId}/locations/${location}`;
    const response = await this.fetchWithRetry(
      `${FUNCTIONS_BASE}/${parent}/functions`,
      { headers: this.headers },
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `GCP API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getCloudFunction(args: Record<string, unknown>): Promise<ToolResult> {
    const projectId = this.projectId(args);
    const location = args.location as string;
    const functionName = args.functionName as string;
    if (!location || !functionName) {
      return { content: [{ type: 'text', text: 'location and functionName are required' }], isError: true };
    }
    const name = `projects/${projectId}/locations/${location}/functions/${functionName}`;
    const response = await this.fetchWithRetry(
      `${FUNCTIONS_BASE}/${name}`,
      { headers: this.headers },
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `GCP API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listGkeClusters(args: Record<string, unknown>): Promise<ToolResult> {
    const projectId = this.projectId(args);
    const zone = args.zone as string;
    if (!zone) {
      return { content: [{ type: 'text', text: 'zone is required (use "-" for all zones)' }], isError: true };
    }
    const response = await this.fetchWithRetry(
      `${GKE_BASE}/projects/${projectId}/locations/${zone}/clusters`,
      { headers: this.headers },
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `GCP API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getGkeCluster(args: Record<string, unknown>): Promise<ToolResult> {
    const projectId = this.projectId(args);
    const zone = args.zone as string;
    const clusterId = args.clusterId as string;
    if (!zone || !clusterId) {
      return { content: [{ type: 'text', text: 'zone and clusterId are required' }], isError: true };
    }
    const response = await this.fetchWithRetry(
      `${GKE_BASE}/projects/${projectId}/locations/${zone}/clusters/${encodeURIComponent(clusterId)}`,
      { headers: this.headers },
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `GCP API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listBigqueryDatasets(args: Record<string, unknown>): Promise<ToolResult> {
    const projectId = this.projectId(args);
    const params = new URLSearchParams();
    if (args.maxResults) params.set('maxResults', String(args.maxResults));
    if (args.pageToken) params.set('pageToken', args.pageToken as string);
    if (args.filter) params.set('filter', args.filter as string);
    const response = await this.fetchWithRetry(
      `${BIGQUERY_BASE}/projects/${projectId}/datasets${params.toString() ? '?' + params.toString() : ''}`,
      { headers: this.headers },
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `GCP API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listBigqueryTables(args: Record<string, unknown>): Promise<ToolResult> {
    const projectId = this.projectId(args);
    const datasetId = args.datasetId as string;
    if (!datasetId) {
      return { content: [{ type: 'text', text: 'datasetId is required' }], isError: true };
    }
    const params = new URLSearchParams();
    if (args.maxResults) params.set('maxResults', String(args.maxResults));
    if (args.pageToken) params.set('pageToken', args.pageToken as string);
    const response = await this.fetchWithRetry(
      `${BIGQUERY_BASE}/projects/${projectId}/datasets/${encodeURIComponent(datasetId)}/tables${params.toString() ? '?' + params.toString() : ''}`,
      { headers: this.headers },
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `GCP API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listServiceAccounts(args: Record<string, unknown>): Promise<ToolResult> {
    const projectId = this.projectId(args);
    const params = new URLSearchParams();
    if (args.pageSize) params.set('pageSize', String(args.pageSize));
    if (args.pageToken) params.set('pageToken', args.pageToken as string);
    const response = await this.fetchWithRetry(
      `${IAM_BASE}/projects/${projectId}/serviceAccounts${params.toString() ? '?' + params.toString() : ''}`,
      { headers: this.headers },
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `GCP API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listIamPolicies(args: Record<string, unknown>): Promise<ToolResult> {
    const projectId = this.projectId(args);
    if (!projectId) {
      return { content: [{ type: 'text', text: 'projectId is required (or set in config)' }], isError: true };
    }
    const response = await this.fetchWithRetry(
      `${CRM_BASE}/projects/${encodeURIComponent(projectId)}:getIamPolicy`,
      { method: 'POST', headers: this.headers, body: JSON.stringify({}) },
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `GCP API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }
}

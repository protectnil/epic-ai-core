/**
 * Kubernetes MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/containers/kubernetes-mcp-server — transport: stdio/streamable-HTTP/SSE, auth: kubeconfig or in-cluster service account
// Maintained by Red Hat (containers org); last commit Mar 2026. Actively maintained.
// Our adapter covers: 20 tools (type-specific REST operations). Vendor MCP covers: ~15 core tools (generic resource CRUD: configuration_get, resources_list, resources_get, resources_create_or_update, resources_delete, pods_list, pods_get, pods_delete, pods_log, pods_top, pods_exec, pods_run, namespaces_list, events_list, + helm/kubevirt optional toolsets).
// Recommendation: use-both — MCP has unique tools not in our adapter (pods_exec, pods_top, pods_run, resources_create_or_update, resources_delete, generic CRD/RBAC access via resources_list/get).
//   Our adapter has resource-type-specific tools the MCP generic approach doesn't directly expose (get_node, list_replicasets, list_statefulsets, list_daemonsets, list_jobs, list_cronjobs, list_ingresses, list_persistent_volumes, list_configmaps, list_secrets, scale_deployment).
// Integration: use-both
// MCP-sourced tools (6): [pods_exec, pods_top, pods_run, resources_create_or_update, resources_delete, generic_resource_access_via_resources_list_get]
// REST-sourced tools (20): [list_namespaces, list_nodes, get_node, list_pods, get_pod, get_pod_logs, list_deployments, get_deployment, scale_deployment, list_services, list_configmaps, list_secrets, list_statefulsets, list_daemonsets, list_jobs, list_cronjobs, list_ingresses, list_replicasets, list_events, list_persistent_volumes]
// Combined coverage: 26 logical operations (MCP: 6 unique + REST: 20, shared list/get functionality routed through MCP by default)
//
// Base URL: https://{api_server} (Kubernetes API server address — no trailing slash)
// Auth: Bearer token (service account token or kubeconfig token)
// Docs: https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.30/
// Rate limits: Determined by kube-apiserver configuration (default: 400 req/s burst, 400 req/s steady state)

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface KubernetesConfig {
  api_server: string;
  token: string;
  skip_tls_verify?: boolean;
}

export class KubernetesMCPServer extends MCPAdapterBase {
  private readonly baseUrl: string;
  private readonly token: string;

  constructor(config: KubernetesConfig) {
    super();
    this.token = config.token;
    // Accept api_server with or without scheme
    this.baseUrl = config.api_server.startsWith('http')
      ? config.api_server
      : `https://${config.api_server}`;
  }

  static catalog() {
    return {
      name: 'kubernetes',
      displayName: 'Kubernetes',
      version: '1.0.0',
      category: 'devops',
      keywords: ['kubernetes', 'k8s', 'pods', 'deployments', 'services', 'namespaces', 'containers', 'cluster', 'kubectl', 'orchestration'],
      toolNames: [
        'list_namespaces', 'list_nodes', 'list_pods', 'get_pod', 'get_pod_logs',
        'list_deployments', 'get_deployment', 'scale_deployment',
        'list_services', 'list_configmaps', 'list_secrets',
        'list_statefulsets', 'list_daemonsets', 'list_jobs', 'list_cronjobs',
        'list_ingresses', 'list_events', 'get_node', 'list_replicasets',
        'list_persistent_volumes',
      ],
      description: 'Kubernetes cluster management: inspect pods, deployments, services, nodes, and workloads. View logs, scale deployments, and monitor cluster events.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_namespaces',
        description: 'List all Kubernetes namespaces in the cluster with their status',
        inputSchema: {
          type: 'object',
          properties: {
            label_selector: {
              type: 'string',
              description: 'Label selector to filter namespaces (e.g. "env=production")',
            },
          },
        },
      },
      {
        name: 'list_nodes',
        description: 'List all cluster nodes with status, capacity, and allocatable resources',
        inputSchema: {
          type: 'object',
          properties: {
            label_selector: {
              type: 'string',
              description: 'Label selector to filter nodes (e.g. "kubernetes.io/role=worker")',
            },
            field_selector: {
              type: 'string',
              description: 'Field selector to filter nodes (e.g. "status.phase=Running")',
            },
          },
        },
      },
      {
        name: 'get_node',
        description: 'Get full details of a specific Kubernetes node including conditions, capacity, and allocations',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Node name',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'list_pods',
        description: 'List pods in a Kubernetes namespace with optional label and field selectors',
        inputSchema: {
          type: 'object',
          properties: {
            namespace: {
              type: 'string',
              description: 'Namespace to list pods in (default: default)',
            },
            label_selector: {
              type: 'string',
              description: 'Label selector filter (e.g. "app=nginx,env=production")',
            },
            field_selector: {
              type: 'string',
              description: 'Field selector filter (e.g. "status.phase=Running")',
            },
          },
        },
      },
      {
        name: 'get_pod',
        description: 'Get full spec and status of a specific Kubernetes pod by name and namespace',
        inputSchema: {
          type: 'object',
          properties: {
            namespace: {
              type: 'string',
              description: 'Pod namespace (default: default)',
            },
            name: {
              type: 'string',
              description: 'Pod name',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'get_pod_logs',
        description: 'Retrieve logs from a pod container; supports tail, previous container, and time-based filtering',
        inputSchema: {
          type: 'object',
          properties: {
            namespace: {
              type: 'string',
              description: 'Pod namespace (default: default)',
            },
            name: {
              type: 'string',
              description: 'Pod name',
            },
            container: {
              type: 'string',
              description: 'Container name (required for multi-container pods)',
            },
            tail_lines: {
              type: 'number',
              description: 'Number of lines from the end of the log to return (e.g. 100)',
            },
            previous: {
              type: 'boolean',
              description: 'Return logs from the previously terminated container instance (default: false)',
            },
            since_seconds: {
              type: 'number',
              description: 'Return only logs newer than this many seconds ago',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'list_deployments',
        description: 'List Kubernetes Deployments in a namespace with optional label selector',
        inputSchema: {
          type: 'object',
          properties: {
            namespace: {
              type: 'string',
              description: 'Namespace to list deployments in (default: default)',
            },
            label_selector: {
              type: 'string',
              description: 'Label selector filter (e.g. "app=nginx")',
            },
          },
        },
      },
      {
        name: 'get_deployment',
        description: 'Get full spec and rollout status of a specific Kubernetes Deployment',
        inputSchema: {
          type: 'object',
          properties: {
            namespace: {
              type: 'string',
              description: 'Deployment namespace (default: default)',
            },
            name: {
              type: 'string',
              description: 'Deployment name',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'scale_deployment',
        description: 'Scale a Kubernetes Deployment by setting the desired replica count',
        inputSchema: {
          type: 'object',
          properties: {
            namespace: {
              type: 'string',
              description: 'Deployment namespace (default: default)',
            },
            name: {
              type: 'string',
              description: 'Deployment name',
            },
            replicas: {
              type: 'number',
              description: 'Desired number of replicas (0 to scale down completely)',
            },
          },
          required: ['name', 'replicas'],
        },
      },
      {
        name: 'list_services',
        description: 'List Kubernetes Services in a namespace with type, cluster IP, and port information',
        inputSchema: {
          type: 'object',
          properties: {
            namespace: {
              type: 'string',
              description: 'Namespace to list services in (default: default)',
            },
            label_selector: {
              type: 'string',
              description: 'Label selector filter',
            },
          },
        },
      },
      {
        name: 'list_configmaps',
        description: 'List Kubernetes ConfigMaps in a namespace with optional label selector',
        inputSchema: {
          type: 'object',
          properties: {
            namespace: {
              type: 'string',
              description: 'Namespace to list configmaps in (default: default)',
            },
            label_selector: {
              type: 'string',
              description: 'Label selector filter',
            },
          },
        },
      },
      {
        name: 'list_secrets',
        description: 'List Kubernetes Secret names and types in a namespace (values are not returned for security)',
        inputSchema: {
          type: 'object',
          properties: {
            namespace: {
              type: 'string',
              description: 'Namespace to list secrets in (default: default)',
            },
            label_selector: {
              type: 'string',
              description: 'Label selector filter',
            },
          },
        },
      },
      {
        name: 'list_statefulsets',
        description: 'List Kubernetes StatefulSets in a namespace with replica status',
        inputSchema: {
          type: 'object',
          properties: {
            namespace: {
              type: 'string',
              description: 'Namespace to list statefulsets in (default: default)',
            },
            label_selector: {
              type: 'string',
              description: 'Label selector filter',
            },
          },
        },
      },
      {
        name: 'list_daemonsets',
        description: 'List Kubernetes DaemonSets in a namespace with desired/scheduled/available counts',
        inputSchema: {
          type: 'object',
          properties: {
            namespace: {
              type: 'string',
              description: 'Namespace to list daemonsets in (default: default)',
            },
            label_selector: {
              type: 'string',
              description: 'Label selector filter',
            },
          },
        },
      },
      {
        name: 'list_jobs',
        description: 'List Kubernetes Jobs in a namespace with completion status and start/completion times',
        inputSchema: {
          type: 'object',
          properties: {
            namespace: {
              type: 'string',
              description: 'Namespace to list jobs in (default: default)',
            },
            label_selector: {
              type: 'string',
              description: 'Label selector filter',
            },
          },
        },
      },
      {
        name: 'list_cronjobs',
        description: 'List Kubernetes CronJobs in a namespace with schedule, last run, and active job count',
        inputSchema: {
          type: 'object',
          properties: {
            namespace: {
              type: 'string',
              description: 'Namespace to list cronjobs in (default: default)',
            },
            label_selector: {
              type: 'string',
              description: 'Label selector filter',
            },
          },
        },
      },
      {
        name: 'list_ingresses',
        description: 'List Kubernetes Ingresses in a namespace with host rules and TLS configuration',
        inputSchema: {
          type: 'object',
          properties: {
            namespace: {
              type: 'string',
              description: 'Namespace to list ingresses in (default: default)',
            },
            label_selector: {
              type: 'string',
              description: 'Label selector filter',
            },
          },
        },
      },
      {
        name: 'list_replicasets',
        description: 'List Kubernetes ReplicaSets in a namespace with desired/ready/available replica counts',
        inputSchema: {
          type: 'object',
          properties: {
            namespace: {
              type: 'string',
              description: 'Namespace to list replicasets in (default: default)',
            },
            label_selector: {
              type: 'string',
              description: 'Label selector filter',
            },
          },
        },
      },
      {
        name: 'list_events',
        description: 'List Kubernetes events for incident response; scope to a namespace or cluster-wide to find warnings',
        inputSchema: {
          type: 'object',
          properties: {
            namespace: {
              type: 'string',
              description: 'Namespace to list events in; omit for cluster-wide events',
            },
            field_selector: {
              type: 'string',
              description: 'Field selector to filter events (e.g. "involvedObject.name=my-pod,type=Warning")',
            },
          },
        },
      },
      {
        name: 'list_persistent_volumes',
        description: 'List cluster-scoped Kubernetes PersistentVolumes with capacity, access modes, and binding status',
        inputSchema: {
          type: 'object',
          properties: {
            label_selector: {
              type: 'string',
              description: 'Label selector filter',
            },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_namespaces':
          return await this.listNamespaces(args);
        case 'list_nodes':
          return await this.listNodes(args);
        case 'get_node':
          return await this.getNode(args);
        case 'list_pods':
          return await this.listPods(args);
        case 'get_pod':
          return await this.getPod(args);
        case 'get_pod_logs':
          return await this.getPodLogs(args);
        case 'list_deployments':
          return await this.listDeployments(args);
        case 'get_deployment':
          return await this.getDeployment(args);
        case 'scale_deployment':
          return await this.scaleDeployment(args);
        case 'list_services':
          return await this.listServices(args);
        case 'list_configmaps':
          return await this.listConfigMaps(args);
        case 'list_secrets':
          return await this.listSecrets(args);
        case 'list_statefulsets':
          return await this.listStatefulSets(args);
        case 'list_daemonsets':
          return await this.listDaemonSets(args);
        case 'list_jobs':
          return await this.listJobs(args);
        case 'list_cronjobs':
          return await this.listCronJobs(args);
        case 'list_ingresses':
          return await this.listIngresses(args);
        case 'list_replicasets':
          return await this.listReplicaSets(args);
        case 'list_events':
          return await this.listEvents(args);
        case 'list_persistent_volumes':
          return await this.listPersistentVolumes(args);
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

  private get headers(): Record<string, string> {
    return {
      'Authorization': `Bearer ${this.token}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    };
  }

  private async fetchResource(url: string, options: RequestInit = {}): Promise<ToolResult> {
    const response = await this.fetchWithRetry(url, { headers: this.headers, ...options });

    let text: string;
    const contentType = response.headers.get('content-type') ?? '';
    if (contentType.includes('text/plain')) {
      text = await response.text();
    } else {
      let data: unknown;
      try {
        data = await response.json();
      } catch {
        data = { status: response.status, statusText: response.statusText };
      }
      text = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
    }

    return {
      content: [{ type: 'text', text: this.truncate(text) }],
      isError: !response.ok,
    };
  }

  private buildParams(args: Record<string, unknown>): URLSearchParams {
    const params = new URLSearchParams();
    if (args.label_selector) params.set('labelSelector', String(args.label_selector));
    if (args.field_selector) params.set('fieldSelector', String(args.field_selector));
    return params;
  }

  private ns(args: Record<string, unknown>): string {
    return (args.namespace as string) ?? 'default';
  }

  private async listNamespaces(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.buildParams(args);
    return this.fetchResource(`${this.baseUrl}/api/v1/namespaces?${params}`);
  }

  private async listNodes(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.buildParams(args);
    return this.fetchResource(`${this.baseUrl}/api/v1/nodes?${params}`);
  }

  private async getNode(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fetchResource(`${this.baseUrl}/api/v1/nodes/${encodeURIComponent(args.name as string)}`);
  }

  private async listPods(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.buildParams(args);
    return this.fetchResource(`${this.baseUrl}/api/v1/namespaces/${this.ns(args)}/pods?${params}`);
  }

  private async getPod(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fetchResource(
      `${this.baseUrl}/api/v1/namespaces/${this.ns(args)}/pods/${encodeURIComponent(args.name as string)}`
    );
  }

  private async getPodLogs(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.container) params.set('container', String(args.container));
    if (args.tail_lines != null) params.set('tailLines', String(args.tail_lines));
    if (args.previous) params.set('previous', 'true');
    if (args.since_seconds != null) params.set('sinceSeconds', String(args.since_seconds));

    const headers = { ...this.headers, 'Accept': 'text/plain, application/json' };
    const url = `${this.baseUrl}/api/v1/namespaces/${this.ns(args)}/pods/${encodeURIComponent(args.name as string)}/log?${params}`;
    const response = await this.fetchWithRetry(url, { headers });
    const text = await response.text();
    return {
      content: [{ type: 'text', text: this.truncate(text) }],
      isError: !response.ok,
    };
  }

  private async listDeployments(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.buildParams(args);
    return this.fetchResource(`${this.baseUrl}/apis/apps/v1/namespaces/${this.ns(args)}/deployments?${params}`);
  }

  private async getDeployment(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fetchResource(
      `${this.baseUrl}/apis/apps/v1/namespaces/${this.ns(args)}/deployments/${encodeURIComponent(args.name as string)}`
    );
  }

  private async scaleDeployment(args: Record<string, unknown>): Promise<ToolResult> {
    const patch = { spec: { replicas: args.replicas as number } };
    const headers = { ...this.headers, 'Content-Type': 'application/merge-patch+json' };
    const url = `${this.baseUrl}/apis/apps/v1/namespaces/${this.ns(args)}/deployments/${encodeURIComponent(args.name as string)}`;
    const response = await this.fetchWithRetry(url, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(patch),
    });
    let data: unknown;
    try { data = await response.json(); } catch { data = { status: response.status }; }
    return {
      content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }],
      isError: !response.ok,
    };
  }

  private async listServices(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.buildParams(args);
    return this.fetchResource(`${this.baseUrl}/api/v1/namespaces/${this.ns(args)}/services?${params}`);
  }

  private async listConfigMaps(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.buildParams(args);
    return this.fetchResource(`${this.baseUrl}/api/v1/namespaces/${this.ns(args)}/configmaps?${params}`);
  }

  private async listSecrets(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.buildParams(args);
    // Request only metadata to avoid returning secret values
    params.set('fieldManager', 'epic-ai');
    const url = `${this.baseUrl}/api/v1/namespaces/${this.ns(args)}/secrets?${params}`;
    const response = await this.fetchWithRetry(url, { headers: this.headers });
    let data: unknown;
    try {
      const raw = await response.json() as { items?: Array<Record<string, unknown>> };
      // Strip secret data values for safety
      if (raw.items) {
        raw.items = raw.items.map((s) => {
          const { data: _data, stringData: _sd, ...safe } = s as Record<string, unknown>;
          return { ...safe, data: '[redacted]' };
        });
      }
      data = raw;
    } catch {
      data = { status: response.status, statusText: response.statusText };
    }
    return {
      content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }],
      isError: !response.ok,
    };
  }

  private async listStatefulSets(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.buildParams(args);
    return this.fetchResource(`${this.baseUrl}/apis/apps/v1/namespaces/${this.ns(args)}/statefulsets?${params}`);
  }

  private async listDaemonSets(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.buildParams(args);
    return this.fetchResource(`${this.baseUrl}/apis/apps/v1/namespaces/${this.ns(args)}/daemonsets?${params}`);
  }

  private async listJobs(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.buildParams(args);
    return this.fetchResource(`${this.baseUrl}/apis/batch/v1/namespaces/${this.ns(args)}/jobs?${params}`);
  }

  private async listCronJobs(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.buildParams(args);
    return this.fetchResource(`${this.baseUrl}/apis/batch/v1/namespaces/${this.ns(args)}/cronjobs?${params}`);
  }

  private async listIngresses(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.buildParams(args);
    return this.fetchResource(`${this.baseUrl}/apis/networking.k8s.io/v1/namespaces/${this.ns(args)}/ingresses?${params}`);
  }

  private async listReplicaSets(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.buildParams(args);
    return this.fetchResource(`${this.baseUrl}/apis/apps/v1/namespaces/${this.ns(args)}/replicasets?${params}`);
  }

  private async listEvents(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.field_selector) params.set('fieldSelector', String(args.field_selector));
    const url = args.namespace
      ? `${this.baseUrl}/api/v1/namespaces/${encodeURIComponent(args.namespace as string)}/events?${params}`
      : `${this.baseUrl}/api/v1/events?${params}`;
    return this.fetchResource(url);
  }

  private async listPersistentVolumes(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.buildParams(args);
    return this.fetchResource(`${this.baseUrl}/api/v1/persistentvolumes?${params}`);
  }
}

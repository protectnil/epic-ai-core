/**
 * Argo Workflows MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28.
// No official Argo Workflows MCP server from the argoproj organization.
//   github.com/jakkaj/mcp-argo-server — community, Go, 3 tools only, last commit 2024. Fails criteria.
//   github.com/kushthedude/argo-workflows-mcp — community, TypeScript, last commit 2025-08-07.
//     Auto-generates tools from OpenAPI but is NOT an official argoproj/argoproj-labs release.
//   github.com/argoproj-labs/mcp-for-argocd — Argo CD only (GitOps), not Argo Workflows.
// Our adapter covers: 19 tools. No qualifying official MCP server exists.
// Recommendation: use-rest-api — no official Argo Workflows MCP server qualifies.
//
// Base URL: User-configurable. Argo Server default port: 2746 (e.g. https://argo.example.com or https://localhost:2746).
// Auth: Bearer token. Obtain via: `argo auth token` CLI or a Kubernetes ServiceAccount token.
//   RBAC must grant workflow list/get/create/update/delete in target namespaces.
// Docs: https://argoproj.github.io/argo-workflows/rest-api/
//   Full OpenAPI spec: GET /api/v1/openapi-spec/swagger.json on your Argo Server.
// Rate limits: None documented. Governed by Kubernetes API server limits.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface ArgoWorkflowsConfig {
  baseUrl?: string;
  token: string;
  defaultNamespace?: string;
}

export class ArgoWorkflowsMCPServer extends MCPAdapterBase {
  private readonly baseUrl: string;
  private readonly token: string;
  private readonly defaultNamespace: string;

  constructor(config: ArgoWorkflowsConfig) {
    super();
    this.baseUrl = (config.baseUrl || 'https://localhost:2746').replace(/\/$/, '');
    this.token = config.token;
    this.defaultNamespace = config.defaultNamespace || 'argo';
  }

  private get headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.token}`,
      'Content-Type': 'application/json',
    };
  }

  private ns(args: Record<string, unknown>): string {
    return (args.namespace as string) || this.defaultNamespace;
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_workflows',
        description: 'List workflows in a Kubernetes namespace with optional field selector, label selector, and pagination.',
        inputSchema: {
          type: 'object',
          properties: {
            namespace: {
              type: 'string',
              description: 'Kubernetes namespace (uses defaultNamespace if omitted)',
            },
            fieldSelector: {
              type: 'string',
              description: 'Kubernetes field selector (e.g. "status.phase=Running")',
            },
            labelSelector: {
              type: 'string',
              description: 'Kubernetes label selector (e.g. "app=my-app,env=prod")',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of workflows to return',
            },
            continueToken: {
              type: 'string',
              description: 'Pagination continue token from a previous response',
            },
          },
        },
      },
      {
        name: 'get_workflow',
        description: 'Get the full spec, status, and node graph of a specific workflow by name.',
        inputSchema: {
          type: 'object',
          properties: {
            namespace: {
              type: 'string',
              description: 'Kubernetes namespace of the workflow',
            },
            name: {
              type: 'string',
              description: 'Name of the workflow to retrieve',
            },
            getTemplates: {
              type: 'boolean',
              description: 'Whether to include template details in the response (default: false)',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'create_workflow',
        description: 'Create and immediately run an ad-hoc workflow from a raw Workflow manifest object. For template-based submission use submit_workflow.',
        inputSchema: {
          type: 'object',
          properties: {
            namespace: {
              type: 'string',
              description: 'Kubernetes namespace to create the workflow in',
            },
            workflow: {
              type: 'object',
              description: 'Full Argo Workflow manifest object (apiVersion: argoproj.io/v1alpha1, kind: Workflow)',
            },
          },
          required: ['workflow'],
        },
      },
      {
        name: 'submit_workflow',
        description: 'Submit a new workflow from a WorkflowTemplate, ClusterWorkflowTemplate, or CronWorkflow by reference name.',
        inputSchema: {
          type: 'object',
          properties: {
            namespace: {
              type: 'string',
              description: 'Kubernetes namespace to submit the workflow in',
            },
            resourceKind: {
              type: 'string',
              description: 'Kind of the source resource: WorkflowTemplate, ClusterWorkflowTemplate, or CronWorkflow',
            },
            resourceName: {
              type: 'string',
              description: 'Name of the WorkflowTemplate, ClusterWorkflowTemplate, or CronWorkflow',
            },
            entrypoint: {
              type: 'string',
              description: 'Override the entrypoint template name',
            },
            parameters: {
              type: 'array',
              items: { type: 'string' },
              description: 'Parameter overrides in "name=value" format',
            },
            labels: {
              type: 'string',
              description: 'Comma-separated labels to add to the workflow (e.g. "env=prod,team=platform")',
            },
          },
          required: ['resourceKind', 'resourceName'],
        },
      },
      {
        name: 'terminate_workflow',
        description: 'Terminate a running workflow immediately. All running pods are killed and no further steps execute.',
        inputSchema: {
          type: 'object',
          properties: {
            namespace: {
              type: 'string',
              description: 'Kubernetes namespace of the workflow',
            },
            name: {
              type: 'string',
              description: 'Name of the workflow to terminate',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'stop_workflow',
        description: 'Stop a running workflow gracefully. Current step completes, then the workflow stops. Use terminate_workflow for immediate kill.',
        inputSchema: {
          type: 'object',
          properties: {
            namespace: {
              type: 'string',
              description: 'Kubernetes namespace of the workflow',
            },
            name: {
              type: 'string',
              description: 'Name of the workflow to stop',
            },
            message: {
              type: 'string',
              description: 'Optional message to record as the reason for stopping',
            },
            nodeFieldSelector: {
              type: 'string',
              description: 'Field selector to target specific nodes within the workflow',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'retry_workflow',
        description: 'Retry a failed or errored workflow from the point of failure, re-running only failed nodes.',
        inputSchema: {
          type: 'object',
          properties: {
            namespace: {
              type: 'string',
              description: 'Kubernetes namespace of the workflow',
            },
            name: {
              type: 'string',
              description: 'Name of the failed workflow to retry',
            },
            restartSuccessful: {
              type: 'boolean',
              description: 'Whether to restart successful nodes as well (default: false)',
            },
            nodeFieldSelector: {
              type: 'string',
              description: 'Field selector to retry only specific failed nodes',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'resubmit_workflow',
        description: 'Resubmit a workflow as a new run, copying the spec of an existing workflow. Unlike retry, this creates a brand-new workflow object.',
        inputSchema: {
          type: 'object',
          properties: {
            namespace: {
              type: 'string',
              description: 'Kubernetes namespace of the workflow',
            },
            name: {
              type: 'string',
              description: 'Name of the workflow to resubmit',
            },
            memoized: {
              type: 'boolean',
              description: 'Whether to reuse memoized step results from the original run (default: false)',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'delete_workflow',
        description: 'Delete a workflow and its associated pods from the cluster.',
        inputSchema: {
          type: 'object',
          properties: {
            namespace: {
              type: 'string',
              description: 'Kubernetes namespace of the workflow',
            },
            name: {
              type: 'string',
              description: 'Name of the workflow to delete',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'get_workflow_logs',
        description: 'Retrieve logs from a workflow or specific pod/container within it, with optional tail and grep filtering.',
        inputSchema: {
          type: 'object',
          properties: {
            namespace: {
              type: 'string',
              description: 'Kubernetes namespace of the workflow',
            },
            name: {
              type: 'string',
              description: 'Name of the workflow',
            },
            podName: {
              type: 'string',
              description: 'Filter logs to a specific pod name',
            },
            container: {
              type: 'string',
              description: 'Container name within the pod (default: main)',
            },
            tailLines: {
              type: 'number',
              description: 'Number of log lines to return from the end of the log',
            },
            grep: {
              type: 'string',
              description: 'Filter log lines matching this string',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'list_workflow_templates',
        description: 'List WorkflowTemplates in a namespace — reusable workflow definitions that can be submitted or referenced by other workflows.',
        inputSchema: {
          type: 'object',
          properties: {
            namespace: {
              type: 'string',
              description: 'Kubernetes namespace',
            },
            labelSelector: {
              type: 'string',
              description: 'Kubernetes label selector to filter templates',
            },
          },
        },
      },
      {
        name: 'get_workflow_template',
        description: 'Get the full spec of a specific WorkflowTemplate by name.',
        inputSchema: {
          type: 'object',
          properties: {
            namespace: {
              type: 'string',
              description: 'Kubernetes namespace',
            },
            name: {
              type: 'string',
              description: 'Name of the WorkflowTemplate',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'list_cluster_workflow_templates',
        description: 'List ClusterWorkflowTemplates — cluster-scoped workflow templates available across all namespaces.',
        inputSchema: {
          type: 'object',
          properties: {
            labelSelector: {
              type: 'string',
              description: 'Kubernetes label selector to filter templates',
            },
          },
        },
      },
      {
        name: 'list_cron_workflows',
        description: 'List CronWorkflows in a namespace — scheduled workflow triggers using standard cron expressions.',
        inputSchema: {
          type: 'object',
          properties: {
            namespace: {
              type: 'string',
              description: 'Kubernetes namespace',
            },
            labelSelector: {
              type: 'string',
              description: 'Kubernetes label selector to filter CronWorkflows',
            },
          },
        },
      },
      {
        name: 'get_cron_workflow',
        description: 'Get the full spec and status of a specific CronWorkflow by name, including schedule, suspend status, and last run time.',
        inputSchema: {
          type: 'object',
          properties: {
            namespace: {
              type: 'string',
              description: 'Kubernetes namespace',
            },
            name: {
              type: 'string',
              description: 'Name of the CronWorkflow',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'suspend_cron_workflow',
        description: 'Suspend a CronWorkflow to prevent future scheduled runs. Existing running workflows are not affected.',
        inputSchema: {
          type: 'object',
          properties: {
            namespace: {
              type: 'string',
              description: 'Kubernetes namespace',
            },
            name: {
              type: 'string',
              description: 'Name of the CronWorkflow to suspend',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'resume_cron_workflow',
        description: 'Resume a suspended CronWorkflow to re-enable scheduled runs.',
        inputSchema: {
          type: 'object',
          properties: {
            namespace: {
              type: 'string',
              description: 'Kubernetes namespace',
            },
            name: {
              type: 'string',
              description: 'Name of the CronWorkflow to resume',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'list_archived_workflows',
        description: 'List archived workflows from the Argo Workflow archive (requires workflow archiving enabled in Argo Server config).',
        inputSchema: {
          type: 'object',
          properties: {
            namespace: {
              type: 'string',
              description: 'Filter by Kubernetes namespace',
            },
            labelSelector: {
              type: 'string',
              description: 'Kubernetes label selector to filter archived workflows',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of archived workflows to return',
            },
          },
        },
      },
      {
        name: 'get_server_info',
        description: 'Get Argo Server version, build info, and feature flags.',
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
        case 'list_workflows':
          return await this.listWorkflows(args);
        case 'get_workflow':
          return await this.getWorkflow(args);
        case 'create_workflow':
          return await this.createWorkflow(args);
        case 'submit_workflow':
          return await this.submitWorkflow(args);
        case 'terminate_workflow':
          return await this.terminateWorkflow(args);
        case 'stop_workflow':
          return await this.stopWorkflow(args);
        case 'retry_workflow':
          return await this.retryWorkflow(args);
        case 'resubmit_workflow':
          return await this.resubmitWorkflow(args);
        case 'delete_workflow':
          return await this.deleteWorkflow(args);
        case 'get_workflow_logs':
          return await this.getWorkflowLogs(args);
        case 'list_workflow_templates':
          return await this.listWorkflowTemplates(args);
        case 'get_workflow_template':
          return await this.getWorkflowTemplate(args);
        case 'list_cluster_workflow_templates':
          return await this.listClusterWorkflowTemplates(args);
        case 'list_cron_workflows':
          return await this.listCronWorkflows(args);
        case 'get_cron_workflow':
          return await this.getCronWorkflow(args);
        case 'suspend_cron_workflow':
          return await this.suspendCronWorkflow(args);
        case 'resume_cron_workflow':
          return await this.resumeCronWorkflow(args);
        case 'list_archived_workflows':
          return await this.listArchivedWorkflows(args);
        case 'get_server_info':
          return await this.getServerInfo();
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

  private async listWorkflows(args: Record<string, unknown>): Promise<ToolResult> {
    const ns = this.ns(args);
    const params = new URLSearchParams();
    if (args.fieldSelector) params.append('listOptions.fieldSelector', args.fieldSelector as string);
    if (args.labelSelector) params.append('listOptions.labelSelector', args.labelSelector as string);
    if (args.limit) params.append('listOptions.limit', String(args.limit));
    if (args.continueToken) params.append('listOptions.continue', args.continueToken as string);
    const qs = params.toString();

    const response = await this.fetchWithRetry(
      `${this.baseUrl}/api/v1/workflows/${encodeURIComponent(ns)}${qs ? `?${qs}` : ''}`,
      { method: 'GET', headers: this.headers },
    );

    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `Failed to list workflows: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }

    const data = await response.json();
    return {
      content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }],
      isError: false,
    };
  }

  private async getWorkflow(args: Record<string, unknown>): Promise<ToolResult> {
    const ns = this.ns(args);
    const workflowName = args.name as string;
    const params = new URLSearchParams();
    if (args.getTemplates) params.append('getTemplates', 'true');
    const qs = params.toString();

    const response = await this.fetchWithRetry(
      `${this.baseUrl}/api/v1/workflows/${encodeURIComponent(ns)}/${encodeURIComponent(workflowName)}${qs ? `?${qs}` : ''}`,
      { method: 'GET', headers: this.headers },
    );

    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `Failed to get workflow: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }

    const data = await response.json();
    return {
      content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }],
      isError: false,
    };
  }

  private async createWorkflow(args: Record<string, unknown>): Promise<ToolResult> {
    const ns = this.ns(args);

    const response = await this.fetchWithRetry(
      `${this.baseUrl}/api/v1/workflows/${encodeURIComponent(ns)}`,
      {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({ workflow: args.workflow }),
      },
    );

    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `Failed to create workflow: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }

    const data = await response.json();
    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      isError: false,
    };
  }

  private async submitWorkflow(args: Record<string, unknown>): Promise<ToolResult> {
    const ns = this.ns(args);
    const body: Record<string, unknown> = {
      namespace: ns,
      resourceKind: args.resourceKind,
      resourceName: args.resourceName,
    };
    if (args.entrypoint) body.entrypoint = args.entrypoint;
    if (args.parameters) body.parameters = args.parameters;
    if (args.labels) body.labels = args.labels;

    const response = await this.fetchWithRetry(
      `${this.baseUrl}/api/v1/workflows/${encodeURIComponent(ns)}/submit`,
      { method: 'POST', headers: this.headers, body: JSON.stringify(body) },
    );

    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `Failed to submit workflow: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }

    const data = await response.json();
    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      isError: false,
    };
  }

  private async terminateWorkflow(args: Record<string, unknown>): Promise<ToolResult> {
    const ns = this.ns(args);
    const workflowName = args.name as string;

    const response = await this.fetchWithRetry(
      `${this.baseUrl}/api/v1/workflows/${encodeURIComponent(ns)}/${encodeURIComponent(workflowName)}/terminate`,
      { method: 'PUT', headers: this.headers, body: JSON.stringify({}) },
    );

    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `Failed to terminate workflow: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }

    const data = await response.json();
    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      isError: false,
    };
  }

  private async stopWorkflow(args: Record<string, unknown>): Promise<ToolResult> {
    const ns = this.ns(args);
    const workflowName = args.name as string;
    const body: Record<string, unknown> = { namespace: ns };
    if (args.message) body.message = args.message;
    if (args.nodeFieldSelector) body.nodeFieldSelector = args.nodeFieldSelector;

    const response = await this.fetchWithRetry(
      `${this.baseUrl}/api/v1/workflows/${encodeURIComponent(ns)}/${encodeURIComponent(workflowName)}/stop`,
      { method: 'PUT', headers: this.headers, body: JSON.stringify(body) },
    );

    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `Failed to stop workflow: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }

    const data = await response.json();
    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      isError: false,
    };
  }

  private async retryWorkflow(args: Record<string, unknown>): Promise<ToolResult> {
    const ns = this.ns(args);
    const workflowName = args.name as string;
    const body: Record<string, unknown> = { namespace: ns };
    if (typeof args.restartSuccessful === 'boolean') body.restartSuccessful = args.restartSuccessful;
    if (args.nodeFieldSelector) body.nodeFieldSelector = args.nodeFieldSelector;

    const response = await this.fetchWithRetry(
      `${this.baseUrl}/api/v1/workflows/${encodeURIComponent(ns)}/${encodeURIComponent(workflowName)}/retry`,
      { method: 'PUT', headers: this.headers, body: JSON.stringify(body) },
    );

    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `Failed to retry workflow: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }

    const data = await response.json();
    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      isError: false,
    };
  }

  private async resubmitWorkflow(args: Record<string, unknown>): Promise<ToolResult> {
    const ns = this.ns(args);
    const workflowName = args.name as string;
    const body: Record<string, unknown> = { namespace: ns };
    if (typeof args.memoized === 'boolean') body.memoized = args.memoized;

    const response = await this.fetchWithRetry(
      `${this.baseUrl}/api/v1/workflows/${encodeURIComponent(ns)}/${encodeURIComponent(workflowName)}/resubmit`,
      { method: 'PUT', headers: this.headers, body: JSON.stringify(body) },
    );

    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `Failed to resubmit workflow: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }

    const data = await response.json();
    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      isError: false,
    };
  }

  private async deleteWorkflow(args: Record<string, unknown>): Promise<ToolResult> {
    const ns = this.ns(args);
    const workflowName = args.name as string;

    const response = await this.fetchWithRetry(
      `${this.baseUrl}/api/v1/workflows/${encodeURIComponent(ns)}/${encodeURIComponent(workflowName)}`,
      { method: 'DELETE', headers: this.headers },
    );

    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `Failed to delete workflow: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }

    return {
      content: [{ type: 'text', text: JSON.stringify({ deleted: true, name: workflowName }, null, 2) }],
      isError: false,
    };
  }

  private async getWorkflowLogs(args: Record<string, unknown>): Promise<ToolResult> {
    const ns = this.ns(args);
    const workflowName = args.name as string;
    const params = new URLSearchParams();
    if (args.podName) params.append('podName', args.podName as string);
    if (args.container) params.append('logOptions.container', args.container as string);
    if (args.tailLines) params.append('logOptions.tailLines', String(args.tailLines));
    if (args.grep) params.append('grep', args.grep as string);
    const qs = params.toString();

    const response = await this.fetchWithRetry(
      `${this.baseUrl}/api/v1/workflows/${encodeURIComponent(ns)}/${encodeURIComponent(workflowName)}/log${qs ? `?${qs}` : ''}`,
      { method: 'GET', headers: this.headers },
    );

    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `Failed to get workflow logs: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }

    const text = await response.text();
    return {
      content: [{ type: 'text', text: this.truncate(text) }],
      isError: false,
    };
  }

  private async listWorkflowTemplates(args: Record<string, unknown>): Promise<ToolResult> {
    const ns = this.ns(args);
    const params = new URLSearchParams();
    if (args.labelSelector) params.append('listOptions.labelSelector', args.labelSelector as string);
    const qs = params.toString();

    const response = await this.fetchWithRetry(
      `${this.baseUrl}/api/v1/workflow-templates/${encodeURIComponent(ns)}${qs ? `?${qs}` : ''}`,
      { method: 'GET', headers: this.headers },
    );

    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `Failed to list workflow templates: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }

    const data = await response.json();
    return {
      content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }],
      isError: false,
    };
  }

  private async getWorkflowTemplate(args: Record<string, unknown>): Promise<ToolResult> {
    const ns = this.ns(args);
    const name = args.name as string;

    const response = await this.fetchWithRetry(
      `${this.baseUrl}/api/v1/workflow-templates/${encodeURIComponent(ns)}/${encodeURIComponent(name)}`,
      { method: 'GET', headers: this.headers },
    );

    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `Failed to get workflow template: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }

    const data = await response.json();
    return {
      content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }],
      isError: false,
    };
  }

  private async listClusterWorkflowTemplates(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.labelSelector) params.append('listOptions.labelSelector', args.labelSelector as string);
    const qs = params.toString();

    const response = await this.fetchWithRetry(
      `${this.baseUrl}/api/v1/cluster-workflow-templates${qs ? `?${qs}` : ''}`,
      { method: 'GET', headers: this.headers },
    );

    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `Failed to list cluster workflow templates: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }

    const data = await response.json();
    return {
      content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }],
      isError: false,
    };
  }

  private async listCronWorkflows(args: Record<string, unknown>): Promise<ToolResult> {
    const ns = this.ns(args);
    const params = new URLSearchParams();
    if (args.labelSelector) params.append('listOptions.labelSelector', args.labelSelector as string);
    const qs = params.toString();

    const response = await this.fetchWithRetry(
      `${this.baseUrl}/api/v1/cron-workflows/${encodeURIComponent(ns)}${qs ? `?${qs}` : ''}`,
      { method: 'GET', headers: this.headers },
    );

    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `Failed to list cron workflows: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }

    const data = await response.json();
    return {
      content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }],
      isError: false,
    };
  }

  private async getCronWorkflow(args: Record<string, unknown>): Promise<ToolResult> {
    const ns = this.ns(args);
    const name = args.name as string;

    const response = await this.fetchWithRetry(
      `${this.baseUrl}/api/v1/cron-workflows/${encodeURIComponent(ns)}/${encodeURIComponent(name)}`,
      { method: 'GET', headers: this.headers },
    );

    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `Failed to get cron workflow: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }

    const data = await response.json();
    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      isError: false,
    };
  }

  private async suspendCronWorkflow(args: Record<string, unknown>): Promise<ToolResult> {
    const ns = this.ns(args);
    const name = args.name as string;

    const response = await this.fetchWithRetry(
      `${this.baseUrl}/api/v1/cron-workflows/${encodeURIComponent(ns)}/${encodeURIComponent(name)}/suspend`,
      { method: 'PUT', headers: this.headers, body: JSON.stringify({}) },
    );

    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `Failed to suspend cron workflow: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }

    const data = await response.json();
    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      isError: false,
    };
  }

  private async resumeCronWorkflow(args: Record<string, unknown>): Promise<ToolResult> {
    const ns = this.ns(args);
    const name = args.name as string;

    const response = await this.fetchWithRetry(
      `${this.baseUrl}/api/v1/cron-workflows/${encodeURIComponent(ns)}/${encodeURIComponent(name)}/resume`,
      { method: 'PUT', headers: this.headers, body: JSON.stringify({}) },
    );

    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `Failed to resume cron workflow: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }

    const data = await response.json();
    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      isError: false,
    };
  }

  private async listArchivedWorkflows(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.namespace) params.append('listOptions.fieldSelector', `metadata.namespace=${encodeURIComponent(args.namespace as string)}`);
    if (args.labelSelector) params.append('listOptions.labelSelector', args.labelSelector as string);
    if (args.limit) params.append('listOptions.limit', String(args.limit));
    const qs = params.toString();

    const response = await this.fetchWithRetry(
      `${this.baseUrl}/api/v1/archived-workflows${qs ? `?${qs}` : ''}`,
      { method: 'GET', headers: this.headers },
    );

    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `Failed to list archived workflows: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }

    const data = await response.json();
    return {
      content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }],
      isError: false,
    };
  }

  private async getServerInfo(): Promise<ToolResult> {
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/api/v1/version`,
      { method: 'GET', headers: this.headers },
    );

    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `Failed to get server info: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }

    const data = await response.json();
    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      isError: false,
    };
  }

  static catalog() {
    return {
      name: 'argo-workflows',
      displayName: 'Argo Workflows',
      version: '1.0.0',
      category: 'devops' as const,
      keywords: ['argo', 'workflows', 'kubernetes', 'pipeline', 'batch', 'dag', 'cron', 'ci', 'orchestration', 'k8s'],
      toolNames: [
        'list_workflows', 'get_workflow', 'create_workflow', 'submit_workflow',
        'terminate_workflow', 'stop_workflow', 'retry_workflow', 'resubmit_workflow',
        'delete_workflow', 'get_workflow_logs',
        'list_workflow_templates', 'get_workflow_template',
        'list_cluster_workflow_templates',
        'list_cron_workflows', 'get_cron_workflow', 'suspend_cron_workflow', 'resume_cron_workflow',
        'list_archived_workflows', 'get_server_info',
      ],
      description: 'Argo Workflows: manage Kubernetes-native workflow execution — submit, retry, terminate, view logs, manage templates, cron schedules, and archived runs.',
      author: 'protectnil' as const,
    };
  }
}

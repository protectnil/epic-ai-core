/**
 * Windows Azure Batch Service MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// Azure Batch Service REST API — large-scale parallel and high-performance computing workloads.
//
// Base URL: https://{accountName}.{region}.batch.azure.com (per-account endpoint)
// Auth: OAuth2 Bearer token or Shared Key authentication.
//   Bearer token scope: https://batch.core.windows.net/.default
//   Token endpoint: https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token
// API Version: 2018-08-01.7.0 (required as query param: api-version=2018-08-01.7.0)
// Docs: https://docs.microsoft.com/en-us/rest/api/batchservice/

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface WindowsBatchConfig {
  /** OAuth2 Bearer access token for Azure Batch service */
  accessToken: string;
  /** Batch account endpoint (e.g. "myaccount.eastus.batch.azure.com") */
  accountEndpoint: string;
  /** Optional base URL override (default: https://{accountEndpoint}) */
  baseUrl?: string;
}

export class WindowsBatchBatchserviceMCPServer extends MCPAdapterBase {
  private readonly accessToken: string;
  private readonly baseUrl: string;
  private static readonly API_VERSION = '2018-08-01.7.0';

  constructor(config: WindowsBatchConfig) {
    super();
    this.accessToken = config.accessToken;
    this.baseUrl = config.baseUrl ?? `https://${config.accountEndpoint}`;
  }

  static catalog() {
    return {
      name: 'windows-batch-batchservice',
      displayName: 'Windows Azure Batch Service',
      version: '1.0.0',
      category: 'cloud',
      keywords: [
        'azure', 'batch', 'hpc', 'parallel computing', 'job', 'task', 'pool',
        'node', 'compute', 'workload', 'scheduling', 'cloud computing',
        'high performance computing', 'job scheduling', 'certificate',
      ],
      toolNames: [
        'list_pools', 'get_pool', 'create_pool', 'delete_pool',
        'list_jobs', 'get_job', 'create_job', 'update_job', 'delete_job',
        'disable_job', 'enable_job', 'terminate_job',
        'list_job_tasks', 'get_task', 'create_task', 'delete_task', 'terminate_task', 'reactivate_task',
        'list_job_schedules', 'get_job_schedule', 'create_job_schedule', 'delete_job_schedule',
        'disable_job_schedule', 'enable_job_schedule', 'terminate_job_schedule',
        'list_pool_nodes', 'get_node',
        'list_certificates', 'get_certificate',
        'list_applications', 'get_application',
        'get_lifetime_job_stats', 'get_lifetime_pool_stats',
      ],
      description: 'Azure Batch Service for large-scale parallel and HPC workloads. Manage pools, jobs, tasks, job schedules, compute nodes, certificates, and applications.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_pools',
        description: 'List all Batch pools in the account with optional OData filter',
        inputSchema: {
          type: 'object',
          properties: {
            filter: { type: 'string', description: 'OData filter expression (e.g. "state eq \'active\'")' },
            max_results: { type: 'number', description: 'Maximum number of pools to return (default: 1000)' },
          },
        },
      },
      {
        name: 'get_pool',
        description: 'Get details of a specific Batch pool by pool ID',
        inputSchema: {
          type: 'object',
          properties: {
            pool_id: { type: 'string', description: 'Batch pool ID' },
          },
          required: ['pool_id'],
        },
      },
      {
        name: 'create_pool',
        description: 'Create a new Batch pool of compute nodes for running tasks',
        inputSchema: {
          type: 'object',
          properties: {
            pool_id: { type: 'string', description: 'Unique identifier for the new pool' },
            vm_size: { type: 'string', description: 'VM size for pool nodes (e.g. "Standard_D2_v3")' },
            target_dedicated_nodes: { type: 'number', description: 'Target number of dedicated compute nodes' },
            target_low_priority_nodes: { type: 'number', description: 'Target number of low-priority (spot) compute nodes' },
            display_name: { type: 'string', description: 'Human-readable display name for the pool' },
            os_type: { type: 'string', description: 'OS family for node agent SKU: "linux" or "windows"' },
          },
          required: ['pool_id', 'vm_size'],
        },
      },
      {
        name: 'delete_pool',
        description: 'Delete a Batch pool and all its compute nodes',
        inputSchema: {
          type: 'object',
          properties: {
            pool_id: { type: 'string', description: 'Pool ID to delete' },
          },
          required: ['pool_id'],
        },
      },
      {
        name: 'list_jobs',
        description: 'List all Batch jobs in the account with optional OData filter',
        inputSchema: {
          type: 'object',
          properties: {
            filter: { type: 'string', description: 'OData filter expression (e.g. "state eq \'active\'")' },
            max_results: { type: 'number', description: 'Maximum number of jobs to return (default: 1000)' },
          },
        },
      },
      {
        name: 'get_job',
        description: 'Get details of a specific Batch job by job ID',
        inputSchema: {
          type: 'object',
          properties: {
            job_id: { type: 'string', description: 'Batch job ID' },
          },
          required: ['job_id'],
        },
      },
      {
        name: 'create_job',
        description: 'Create a new Batch job to run tasks on a pool',
        inputSchema: {
          type: 'object',
          properties: {
            job_id: { type: 'string', description: 'Unique identifier for the new job' },
            pool_id: { type: 'string', description: 'ID of the pool to run the job on' },
            display_name: { type: 'string', description: 'Human-readable display name for the job' },
            priority: { type: 'number', description: 'Job priority (-1000 to 1000, default: 0)' },
          },
          required: ['job_id', 'pool_id'],
        },
      },
      {
        name: 'update_job',
        description: 'Update properties of an existing Batch job (priority, constraints, pool)',
        inputSchema: {
          type: 'object',
          properties: {
            job_id: { type: 'string', description: 'Job ID to update' },
            priority: { type: 'number', description: 'New job priority (-1000 to 1000)' },
            pool_id: { type: 'string', description: 'Reassign the job to a different pool' },
          },
          required: ['job_id'],
        },
      },
      {
        name: 'delete_job',
        description: 'Delete a Batch job and all its tasks',
        inputSchema: {
          type: 'object',
          properties: {
            job_id: { type: 'string', description: 'Job ID to delete' },
          },
          required: ['job_id'],
        },
      },
      {
        name: 'disable_job',
        description: 'Disable a Batch job to prevent new tasks from running',
        inputSchema: {
          type: 'object',
          properties: {
            job_id: { type: 'string', description: 'Job ID to disable' },
            disable_tasks: {
              type: 'string',
              description: 'What to do with running tasks: "requeue", "terminate", or "wait"',
            },
          },
          required: ['job_id'],
        },
      },
      {
        name: 'enable_job',
        description: 'Re-enable a disabled Batch job so its tasks can run again',
        inputSchema: {
          type: 'object',
          properties: {
            job_id: { type: 'string', description: 'Job ID to enable' },
          },
          required: ['job_id'],
        },
      },
      {
        name: 'terminate_job',
        description: 'Terminate a Batch job, stopping all running tasks and marking the job as completed',
        inputSchema: {
          type: 'object',
          properties: {
            job_id: { type: 'string', description: 'Job ID to terminate' },
            terminate_reason: { type: 'string', description: 'Optional reason string for termination' },
          },
          required: ['job_id'],
        },
      },
      {
        name: 'list_job_tasks',
        description: 'List all tasks in a Batch job with optional OData filter',
        inputSchema: {
          type: 'object',
          properties: {
            job_id: { type: 'string', description: 'Job ID to list tasks for' },
            filter: { type: 'string', description: 'OData filter expression (e.g. "state eq \'running\'")' },
            max_results: { type: 'number', description: 'Maximum number of tasks to return (default: 1000)' },
          },
          required: ['job_id'],
        },
      },
      {
        name: 'get_task',
        description: 'Get details of a specific task within a Batch job',
        inputSchema: {
          type: 'object',
          properties: {
            job_id: { type: 'string', description: 'Parent job ID' },
            task_id: { type: 'string', description: 'Task ID to retrieve' },
          },
          required: ['job_id', 'task_id'],
        },
      },
      {
        name: 'create_task',
        description: 'Add a new task to a Batch job for execution on a compute node',
        inputSchema: {
          type: 'object',
          properties: {
            job_id: { type: 'string', description: 'Job ID to add the task to' },
            task_id: { type: 'string', description: 'Unique task ID within the job' },
            command_line: { type: 'string', description: 'Command line to execute on the compute node' },
            display_name: { type: 'string', description: 'Human-readable display name for the task' },
          },
          required: ['job_id', 'task_id', 'command_line'],
        },
      },
      {
        name: 'delete_task',
        description: 'Delete a task from a Batch job',
        inputSchema: {
          type: 'object',
          properties: {
            job_id: { type: 'string', description: 'Parent job ID' },
            task_id: { type: 'string', description: 'Task ID to delete' },
          },
          required: ['job_id', 'task_id'],
        },
      },
      {
        name: 'terminate_task',
        description: 'Terminate a running Batch task before it completes naturally',
        inputSchema: {
          type: 'object',
          properties: {
            job_id: { type: 'string', description: 'Parent job ID' },
            task_id: { type: 'string', description: 'Task ID to terminate' },
          },
          required: ['job_id', 'task_id'],
        },
      },
      {
        name: 'reactivate_task',
        description: 'Reactivate a failed or completed Batch task so it can run again',
        inputSchema: {
          type: 'object',
          properties: {
            job_id: { type: 'string', description: 'Parent job ID' },
            task_id: { type: 'string', description: 'Task ID to reactivate' },
          },
          required: ['job_id', 'task_id'],
        },
      },
      {
        name: 'list_job_schedules',
        description: 'List all Batch job schedules in the account',
        inputSchema: {
          type: 'object',
          properties: {
            filter: { type: 'string', description: 'OData filter expression' },
            max_results: { type: 'number', description: 'Maximum number of schedules to return' },
          },
        },
      },
      {
        name: 'get_job_schedule',
        description: 'Get details of a specific Batch job schedule',
        inputSchema: {
          type: 'object',
          properties: {
            job_schedule_id: { type: 'string', description: 'Job schedule ID' },
          },
          required: ['job_schedule_id'],
        },
      },
      {
        name: 'create_job_schedule',
        description: 'Create a recurring Batch job schedule to automatically create jobs on a time-based pattern',
        inputSchema: {
          type: 'object',
          properties: {
            job_schedule_id: { type: 'string', description: 'Unique identifier for the job schedule' },
            pool_id: { type: 'string', description: 'Pool ID where scheduled jobs will run' },
            recurrence_interval: {
              type: 'string',
              description: 'ISO 8601 duration for recurrence interval (e.g. "PT1H" for every hour)',
            },
            display_name: { type: 'string', description: 'Human-readable display name' },
          },
          required: ['job_schedule_id', 'pool_id'],
        },
      },
      {
        name: 'delete_job_schedule',
        description: 'Delete a Batch job schedule',
        inputSchema: {
          type: 'object',
          properties: {
            job_schedule_id: { type: 'string', description: 'Job schedule ID to delete' },
          },
          required: ['job_schedule_id'],
        },
      },
      {
        name: 'disable_job_schedule',
        description: 'Disable a Batch job schedule to stop it from creating new jobs',
        inputSchema: {
          type: 'object',
          properties: {
            job_schedule_id: { type: 'string', description: 'Job schedule ID to disable' },
          },
          required: ['job_schedule_id'],
        },
      },
      {
        name: 'enable_job_schedule',
        description: 'Re-enable a disabled Batch job schedule',
        inputSchema: {
          type: 'object',
          properties: {
            job_schedule_id: { type: 'string', description: 'Job schedule ID to enable' },
          },
          required: ['job_schedule_id'],
        },
      },
      {
        name: 'terminate_job_schedule',
        description: 'Terminate a Batch job schedule and any active jobs it has created',
        inputSchema: {
          type: 'object',
          properties: {
            job_schedule_id: { type: 'string', description: 'Job schedule ID to terminate' },
          },
          required: ['job_schedule_id'],
        },
      },
      {
        name: 'list_pool_nodes',
        description: 'List compute nodes in a Batch pool',
        inputSchema: {
          type: 'object',
          properties: {
            pool_id: { type: 'string', description: 'Pool ID to list nodes for' },
            filter: { type: 'string', description: 'OData filter expression (e.g. "state eq \'idle\'")' },
            max_results: { type: 'number', description: 'Maximum number of nodes to return' },
          },
          required: ['pool_id'],
        },
      },
      {
        name: 'get_node',
        description: 'Get details of a specific compute node in a Batch pool',
        inputSchema: {
          type: 'object',
          properties: {
            pool_id: { type: 'string', description: 'Pool ID containing the node' },
            node_id: { type: 'string', description: 'Compute node ID' },
          },
          required: ['pool_id', 'node_id'],
        },
      },
      {
        name: 'list_certificates',
        description: 'List certificates installed in the Batch account',
        inputSchema: {
          type: 'object',
          properties: {
            filter: { type: 'string', description: 'OData filter expression' },
            max_results: { type: 'number', description: 'Maximum number of certificates to return' },
          },
        },
      },
      {
        name: 'get_certificate',
        description: 'Get details of a specific certificate in the Batch account',
        inputSchema: {
          type: 'object',
          properties: {
            thumbprint_algorithm: { type: 'string', description: 'Hash algorithm used for thumbprint (e.g. "sha1")' },
            thumbprint: { type: 'string', description: 'Certificate thumbprint hex string' },
          },
          required: ['thumbprint_algorithm', 'thumbprint'],
        },
      },
      {
        name: 'list_applications',
        description: 'List application packages available in the Batch account',
        inputSchema: {
          type: 'object',
          properties: {
            max_results: { type: 'number', description: 'Maximum number of applications to return' },
          },
        },
      },
      {
        name: 'get_application',
        description: 'Get details of a specific application package in the Batch account',
        inputSchema: {
          type: 'object',
          properties: {
            application_id: { type: 'string', description: 'Application package ID' },
          },
          required: ['application_id'],
        },
      },
      {
        name: 'get_lifetime_job_stats',
        description: 'Get lifetime statistics for all jobs in the Batch account',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_lifetime_pool_stats',
        description: 'Get lifetime statistics for all pools in the Batch account',
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
        case 'list_pools': return this.listPools(args);
        case 'get_pool': return this.getPool(args);
        case 'create_pool': return this.createPool(args);
        case 'delete_pool': return this.deletePool(args);
        case 'list_jobs': return this.listJobs(args);
        case 'get_job': return this.getJob(args);
        case 'create_job': return this.createJob(args);
        case 'update_job': return this.updateJob(args);
        case 'delete_job': return this.deleteJob(args);
        case 'disable_job': return this.disableJob(args);
        case 'enable_job': return this.enableJob(args);
        case 'terminate_job': return this.terminateJob(args);
        case 'list_job_tasks': return this.listJobTasks(args);
        case 'get_task': return this.getTask(args);
        case 'create_task': return this.createTask(args);
        case 'delete_task': return this.deleteTask(args);
        case 'terminate_task': return this.terminateTask(args);
        case 'reactivate_task': return this.reactivateTask(args);
        case 'list_job_schedules': return this.listJobSchedules(args);
        case 'get_job_schedule': return this.getJobSchedule(args);
        case 'create_job_schedule': return this.createJobSchedule(args);
        case 'delete_job_schedule': return this.deleteJobSchedule(args);
        case 'disable_job_schedule': return this.disableJobSchedule(args);
        case 'enable_job_schedule': return this.enableJobSchedule(args);
        case 'terminate_job_schedule': return this.terminateJobSchedule(args);
        case 'list_pool_nodes': return this.listPoolNodes(args);
        case 'get_node': return this.getNode(args);
        case 'list_certificates': return this.listCertificates(args);
        case 'get_certificate': return this.getCertificate(args);
        case 'list_applications': return this.listApplications(args);
        case 'get_application': return this.getApplication(args);
        case 'get_lifetime_job_stats': return this.getLifetimeJobStats();
        case 'get_lifetime_pool_stats': return this.getLifetimePoolStats();
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
      Authorization: `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
    };
  }

  private buildUrl(path: string, params: Record<string, string | undefined> = {}): string {
    const qs = new URLSearchParams({ 'api-version': WindowsBatchBatchserviceMCPServer.API_VERSION });
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) qs.set(k, v);
    }
    return `${this.baseUrl}${path}?${qs.toString()}`;
  }


  private async get(path: string, params: Record<string, string | undefined> = {}): Promise<ToolResult> {
    const url = this.buildUrl(path, params);
    const response = await this.fetchWithRetry(url, { method: 'GET', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Batch service returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async post(path: string, body: unknown = {}): Promise<ToolResult> {
    const url = this.buildUrl(path);
    const response = await this.fetchWithRetry(url, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    if (response.status === 201 || response.status === 204) {
      return { content: [{ type: 'text', text: 'Success' }], isError: false };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Batch service returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async patch(path: string, body: unknown): Promise<ToolResult> {
    const url = this.buildUrl(path);
    const response = await this.fetchWithRetry(url, {
      method: 'PATCH',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: 'Updated successfully' }], isError: false };
  }

  private async delete(path: string): Promise<ToolResult> {
    const url = this.buildUrl(path);
    const response = await this.fetchWithRetry(url, { method: 'DELETE', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: 'Deleted successfully' }], isError: false };
  }

  // --- Pools ---
  private async listPools(args: Record<string, unknown>): Promise<ToolResult> {
    return this.get('/pools', {
      $filter: args.filter as string | undefined,
      maxresults: args.max_results !== undefined ? String(args.max_results) : undefined,
    });
  }

  private async getPool(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.pool_id) return { content: [{ type: 'text', text: 'pool_id is required' }], isError: true };
    return this.get(`/pools/${encodeURIComponent(args.pool_id as string)}`);
  }

  private async createPool(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.pool_id || !args.vm_size) return { content: [{ type: 'text', text: 'pool_id and vm_size are required' }], isError: true };
    const body: Record<string, unknown> = {
      id: args.pool_id,
      vmSize: args.vm_size,
    };
    if (args.target_dedicated_nodes !== undefined) body.targetDedicatedNodes = args.target_dedicated_nodes;
    if (args.target_low_priority_nodes !== undefined) body.targetLowPriorityNodes = args.target_low_priority_nodes;
    if (args.display_name) body.displayName = args.display_name;
    if (args.os_type) {
      body.virtualMachineConfiguration = {
        imageReference: {
          publisher: (args.os_type as string).toLowerCase() === 'windows' ? 'MicrosoftWindowsServer' : 'Canonical',
          offer: (args.os_type as string).toLowerCase() === 'windows' ? 'WindowsServer' : 'UbuntuServer',
          sku: (args.os_type as string).toLowerCase() === 'windows' ? '2019-Datacenter' : '18.04-LTS',
        },
        nodeAgentSKUId: (args.os_type as string).toLowerCase() === 'windows'
          ? 'batch.node.windows amd64'
          : 'batch.node.ubuntu 18.04',
      };
    }
    return this.post('/pools', body);
  }

  private async deletePool(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.pool_id) return { content: [{ type: 'text', text: 'pool_id is required' }], isError: true };
    return this.delete(`/pools/${encodeURIComponent(args.pool_id as string)}`);
  }

  // --- Jobs ---
  private async listJobs(args: Record<string, unknown>): Promise<ToolResult> {
    return this.get('/jobs', {
      $filter: args.filter as string | undefined,
      maxresults: args.max_results !== undefined ? String(args.max_results) : undefined,
    });
  }

  private async getJob(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.job_id) return { content: [{ type: 'text', text: 'job_id is required' }], isError: true };
    return this.get(`/jobs/${encodeURIComponent(args.job_id as string)}`);
  }

  private async createJob(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.job_id || !args.pool_id) return { content: [{ type: 'text', text: 'job_id and pool_id are required' }], isError: true };
    const body: Record<string, unknown> = {
      id: args.job_id,
      poolInfo: { poolId: args.pool_id },
    };
    if (args.display_name) body.displayName = args.display_name;
    if (args.priority !== undefined) body.priority = args.priority;
    return this.post('/jobs', body);
  }

  private async updateJob(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.job_id) return { content: [{ type: 'text', text: 'job_id is required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.priority !== undefined) body.priority = args.priority;
    if (args.pool_id) body.poolInfo = { poolId: args.pool_id };
    return this.patch(`/jobs/${encodeURIComponent(args.job_id as string)}`, body);
  }

  private async deleteJob(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.job_id) return { content: [{ type: 'text', text: 'job_id is required' }], isError: true };
    return this.delete(`/jobs/${encodeURIComponent(args.job_id as string)}`);
  }

  private async disableJob(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.job_id) return { content: [{ type: 'text', text: 'job_id is required' }], isError: true };
    return this.post(`/jobs/${encodeURIComponent(args.job_id as string)}/disable`, {
      disableTasks: args.disable_tasks ?? 'requeue',
    });
  }

  private async enableJob(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.job_id) return { content: [{ type: 'text', text: 'job_id is required' }], isError: true };
    return this.post(`/jobs/${encodeURIComponent(args.job_id as string)}/enable`);
  }

  private async terminateJob(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.job_id) return { content: [{ type: 'text', text: 'job_id is required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.terminate_reason) body.terminateReason = args.terminate_reason;
    return this.post(`/jobs/${encodeURIComponent(args.job_id as string)}/terminate`, body);
  }

  // --- Tasks ---
  private async listJobTasks(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.job_id) return { content: [{ type: 'text', text: 'job_id is required' }], isError: true };
    return this.get(`/jobs/${encodeURIComponent(args.job_id as string)}/tasks`, {
      $filter: args.filter as string | undefined,
      maxresults: args.max_results !== undefined ? String(args.max_results) : undefined,
    });
  }

  private async getTask(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.job_id || !args.task_id) return { content: [{ type: 'text', text: 'job_id and task_id are required' }], isError: true };
    return this.get(`/jobs/${encodeURIComponent(args.job_id as string)}/tasks/${encodeURIComponent(args.task_id as string)}`);
  }

  private async createTask(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.job_id || !args.task_id || !args.command_line) {
      return { content: [{ type: 'text', text: 'job_id, task_id, and command_line are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      id: args.task_id,
      commandLine: args.command_line,
    };
    if (args.display_name) body.displayName = args.display_name;
    return this.post(`/jobs/${encodeURIComponent(args.job_id as string)}/tasks`, body);
  }

  private async deleteTask(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.job_id || !args.task_id) return { content: [{ type: 'text', text: 'job_id and task_id are required' }], isError: true };
    return this.delete(`/jobs/${encodeURIComponent(args.job_id as string)}/tasks/${encodeURIComponent(args.task_id as string)}`);
  }

  private async terminateTask(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.job_id || !args.task_id) return { content: [{ type: 'text', text: 'job_id and task_id are required' }], isError: true };
    return this.post(`/jobs/${encodeURIComponent(args.job_id as string)}/tasks/${encodeURIComponent(args.task_id as string)}/terminate`);
  }

  private async reactivateTask(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.job_id || !args.task_id) return { content: [{ type: 'text', text: 'job_id and task_id are required' }], isError: true };
    return this.post(`/jobs/${encodeURIComponent(args.job_id as string)}/tasks/${encodeURIComponent(args.task_id as string)}/reactivate`);
  }

  // --- Job Schedules ---
  private async listJobSchedules(args: Record<string, unknown>): Promise<ToolResult> {
    return this.get('/jobschedules', {
      $filter: args.filter as string | undefined,
      maxresults: args.max_results !== undefined ? String(args.max_results) : undefined,
    });
  }

  private async getJobSchedule(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.job_schedule_id) return { content: [{ type: 'text', text: 'job_schedule_id is required' }], isError: true };
    return this.get(`/jobschedules/${encodeURIComponent(args.job_schedule_id as string)}`);
  }

  private async createJobSchedule(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.job_schedule_id || !args.pool_id) {
      return { content: [{ type: 'text', text: 'job_schedule_id and pool_id are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      id: args.job_schedule_id,
      jobSpecification: {
        poolInfo: { poolId: args.pool_id },
      },
    };
    if (args.recurrence_interval) body.schedule = { recurrenceInterval: args.recurrence_interval };
    if (args.display_name) body.displayName = args.display_name;
    return this.post('/jobschedules', body);
  }

  private async deleteJobSchedule(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.job_schedule_id) return { content: [{ type: 'text', text: 'job_schedule_id is required' }], isError: true };
    return this.delete(`/jobschedules/${encodeURIComponent(args.job_schedule_id as string)}`);
  }

  private async disableJobSchedule(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.job_schedule_id) return { content: [{ type: 'text', text: 'job_schedule_id is required' }], isError: true };
    return this.post(`/jobschedules/${encodeURIComponent(args.job_schedule_id as string)}/disable`);
  }

  private async enableJobSchedule(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.job_schedule_id) return { content: [{ type: 'text', text: 'job_schedule_id is required' }], isError: true };
    return this.post(`/jobschedules/${encodeURIComponent(args.job_schedule_id as string)}/enable`);
  }

  private async terminateJobSchedule(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.job_schedule_id) return { content: [{ type: 'text', text: 'job_schedule_id is required' }], isError: true };
    return this.post(`/jobschedules/${encodeURIComponent(args.job_schedule_id as string)}/terminate`);
  }

  // --- Nodes ---
  private async listPoolNodes(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.pool_id) return { content: [{ type: 'text', text: 'pool_id is required' }], isError: true };
    return this.get(`/pools/${encodeURIComponent(args.pool_id as string)}/nodes`, {
      $filter: args.filter as string | undefined,
      maxresults: args.max_results !== undefined ? String(args.max_results) : undefined,
    });
  }

  private async getNode(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.pool_id || !args.node_id) return { content: [{ type: 'text', text: 'pool_id and node_id are required' }], isError: true };
    return this.get(`/pools/${encodeURIComponent(args.pool_id as string)}/nodes/${encodeURIComponent(args.node_id as string)}`);
  }

  // --- Certificates ---
  private async listCertificates(args: Record<string, unknown>): Promise<ToolResult> {
    return this.get('/certificates', {
      $filter: args.filter as string | undefined,
      maxresults: args.max_results !== undefined ? String(args.max_results) : undefined,
    });
  }

  private async getCertificate(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.thumbprint_algorithm || !args.thumbprint) {
      return { content: [{ type: 'text', text: 'thumbprint_algorithm and thumbprint are required' }], isError: true };
    }
    const alg = encodeURIComponent(args.thumbprint_algorithm as string);
    const tp = encodeURIComponent(args.thumbprint as string);
    return this.get(`/certificates(thumbprintAlgorithm=${alg},thumbprint=${tp})`);
  }

  // --- Applications ---
  private async listApplications(args: Record<string, unknown>): Promise<ToolResult> {
    return this.get('/applications', {
      maxresults: args.max_results !== undefined ? String(args.max_results) : undefined,
    });
  }

  private async getApplication(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.application_id) return { content: [{ type: 'text', text: 'application_id is required' }], isError: true };
    return this.get(`/applications/${encodeURIComponent(args.application_id as string)}`);
  }

  // --- Stats ---
  private async getLifetimeJobStats(): Promise<ToolResult> {
    return this.get('/lifetimejobstats');
  }

  private async getLifetimePoolStats(): Promise<ToolResult> {
    return this.get('/lifetimepoolstats');
  }
}

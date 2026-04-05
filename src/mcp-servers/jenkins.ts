/**
 * Jenkins MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/jenkinsci/mcp-server-plugin — official Jenkins MCP plugin,
//   requires installation on the Jenkins controller; transport: SSE + Streamable HTTP (server-side plugin).
//   Actively maintained (158+ commits, last release within 4 weeks as of 2026-03-28).
//   Vendor MCP tools: getJob, getJobs, triggerBuild, getQueueItem, getBuild, getBuildLog,
//     getJobScm, getBuildScm, getBuildChangeSets, findJobsWithScmUrl, whoAmI, getStatus (~12+ tools).
//   Our adapter covers: 13 tools (core CI operations).
// Recommendation: use-both — vendor MCP has SCM tools (getJobScm, getBuildScm, getBuildChangeSets,
//   findJobsWithScmUrl, whoAmI, getStatus) not in our adapter; our adapter has node management,
//   enable/disable job, cancel queue item, and last-build-status tools not in vendor MCP.
//   Combined coverage requires both integrations.
//
// Integration: use-both
// MCP-sourced tools (6 unique): getJobScm, getBuildScm, getBuildChangeSets, findJobsWithScmUrl, whoAmI, getStatus
// REST-sourced tools (7 unique): list_nodes, get_node_info, enable_job, disable_job, cancel_queue_item,
//   get_last_build_status, get_queue (no equivalent in vendor MCP)
// Shared tools (6 overlap): list_jobs→getJobs, get_job_info→getJob, get_build_info→getBuild,
//   get_build_log→getBuildLog, trigger_build→triggerBuild, cancel_queue_item→getQueueItem
// Combined coverage: 19 tools (MCP: 12 + REST: 13 - shared: 6)
//
// Base URL: https://jenkins.example.com (customer-hosted; no default — required in config)
// Auth: HTTP Basic — username + API token. CSRF crumb NOT required when using API tokens (Jenkins 2.107+ LTS).
// Docs: https://www.jenkins.io/doc/book/using/remote-access-api/
// Rate limits: None documented; governed by Jenkins thread pool and executor concurrency settings

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface JenkinsConfig {
  /** Jenkins root URL, e.g. https://jenkins.example.com (no trailing slash) */
  baseUrl: string;
  username: string;
  apiToken: string;
}

export class JenkinsMCPServer extends MCPAdapterBase {
  private readonly baseUrl: string;
  private readonly authHeader: string;

  constructor(config: JenkinsConfig) {
    super();
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.authHeader = `Basic ${Buffer.from(`${config.username}:${config.apiToken}`).toString('base64')}`;
  }

  static catalog() {
    return {
      name: 'jenkins',
      displayName: 'Jenkins',
      version: '1.0.0',
      category: 'devops' as const,
      keywords: ['jenkins', 'ci', 'cd', 'pipeline', 'build', 'job', 'deployment', 'automation', 'continuous integration'],
      toolNames: [
        'list_jobs',
        'get_job_info',
        'get_build_info',
        'get_build_log',
        'trigger_build',
        'stop_build',
        'cancel_queue_item',
        'get_queue',
        'list_nodes',
        'get_node_info',
        'enable_job',
        'disable_job',
        'get_last_build_status',
      ],
      description: 'CI/CD pipeline management: list jobs, trigger and monitor builds, view logs, manage the build queue, and control Jenkins nodes.',
      author: 'protectnil' as const,
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_jobs',
        description: 'List all jobs (pipelines) on the Jenkins controller, or jobs within a specific folder',
        inputSchema: {
          type: 'object',
          properties: {
            folderPath: {
              type: 'string',
              description: 'Optional folder path to list jobs within, e.g. MyFolder or MyFolder/SubFolder. Omit for root-level jobs.',
            },
          },
        },
      },
      {
        name: 'get_job_info',
        description: 'Get configuration details and recent build history for a specific Jenkins job',
        inputSchema: {
          type: 'object',
          properties: {
            jobName: {
              type: 'string',
              description: 'Job name. For jobs inside folders use slash-separated path, e.g. MyFolder/MyJob',
            },
          },
          required: ['jobName'],
        },
      },
      {
        name: 'get_build_info',
        description: 'Get status, result, duration, and parameters for a specific build number of a job',
        inputSchema: {
          type: 'object',
          properties: {
            jobName: {
              type: 'string',
              description: 'Job name (slash-separated path for folder jobs)',
            },
            buildNumber: {
              type: 'number',
              description: 'Build number to retrieve. Use lastBuild to get the most recent build.',
            },
          },
          required: ['jobName', 'buildNumber'],
        },
      },
      {
        name: 'get_build_log',
        description: 'Retrieve the console log text output for a specific build, truncated to 10KB if large',
        inputSchema: {
          type: 'object',
          properties: {
            jobName: {
              type: 'string',
              description: 'Job name (slash-separated path for folder jobs)',
            },
            buildNumber: {
              type: 'number',
              description: 'Build number to retrieve the console log for',
            },
          },
          required: ['jobName', 'buildNumber'],
        },
      },
      {
        name: 'trigger_build',
        description: 'Trigger a new build for a job, optionally passing build parameters for parameterized jobs',
        inputSchema: {
          type: 'object',
          properties: {
            jobName: {
              type: 'string',
              description: 'Job name (slash-separated path for folder jobs)',
            },
            parameters: {
              type: 'object',
              description: 'Key-value pairs of build parameters for parameterized builds (omit for non-parameterized jobs)',
            },
          },
          required: ['jobName'],
        },
      },
      {
        name: 'stop_build',
        description: 'Stop (abort) a currently running build by sending an HTTP POST to the stop endpoint',
        inputSchema: {
          type: 'object',
          properties: {
            jobName: {
              type: 'string',
              description: 'Job name (slash-separated path for folder jobs)',
            },
            buildNumber: {
              type: 'number',
              description: 'Build number of the running build to stop',
            },
          },
          required: ['jobName', 'buildNumber'],
        },
      },
      {
        name: 'cancel_queue_item',
        description: 'Cancel a queued build item that has not yet started executing, by queue item ID',
        inputSchema: {
          type: 'object',
          properties: {
            queueItemId: {
              type: 'number',
              description: 'The queue item ID to cancel (visible in the queue listing or the Location header returned by trigger_build)',
            },
          },
          required: ['queueItemId'],
        },
      },
      {
        name: 'get_queue',
        description: 'Get the current Jenkins build queue, including queued items, their causes, and wait reasons',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'list_nodes',
        description: 'List all Jenkins nodes (agents/computers) with their online status and executor information',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_node_info',
        description: 'Get detailed information about a specific Jenkins node including executor status and labels',
        inputSchema: {
          type: 'object',
          properties: {
            nodeName: {
              type: 'string',
              description: 'Node name. Use "(master)" or "built-in" for the built-in controller node.',
            },
          },
          required: ['nodeName'],
        },
      },
      {
        name: 'enable_job',
        description: 'Enable a disabled Jenkins job so it can be triggered and scheduled again',
        inputSchema: {
          type: 'object',
          properties: {
            jobName: {
              type: 'string',
              description: 'Job name (slash-separated path for folder jobs)',
            },
          },
          required: ['jobName'],
        },
      },
      {
        name: 'disable_job',
        description: 'Disable a Jenkins job to prevent it from being triggered or scheduled',
        inputSchema: {
          type: 'object',
          properties: {
            jobName: {
              type: 'string',
              description: 'Job name (slash-separated path for folder jobs)',
            },
          },
          required: ['jobName'],
        },
      },
      {
        name: 'get_last_build_status',
        description: 'Get the result, number, and timestamp of the most recent build for a job',
        inputSchema: {
          type: 'object',
          properties: {
            jobName: {
              type: 'string',
              description: 'Job name (slash-separated path for folder jobs)',
            },
          },
          required: ['jobName'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_jobs':
          return await this.listJobs(args);
        case 'get_job_info':
          return await this.getJobInfo(args);
        case 'get_build_info':
          return await this.getBuildInfo(args);
        case 'get_build_log':
          return await this.getBuildLog(args);
        case 'trigger_build':
          return await this.triggerBuild(args);
        case 'stop_build':
          return await this.stopBuild(args);
        case 'cancel_queue_item':
          return await this.cancelQueueItem(args);
        case 'get_queue':
          return await this.getQueue();
        case 'list_nodes':
          return await this.listNodes();
        case 'get_node_info':
          return await this.getNodeInfo(args);
        case 'enable_job':
          return await this.enableJob(args);
        case 'disable_job':
          return await this.disableJob(args);
        case 'get_last_build_status':
          return await this.getLastBuildStatus(args);
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

  /** Convert slash-separated folder/job path to /job/A/job/B/job/C URL format */
  private jobPath(jobName: string): string {
    return jobName
      .split('/')
      .map((segment) => `job/${encodeURIComponent(segment)}`)
      .join('/');
  }

  private jsonHeaders(): Record<string, string> {
    return {
      Authorization: this.authHeader,
      'Content-Type': 'application/json',
    };
  }

  private async fetchJson(url: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(url, { method: 'GET', headers: this.jsonHeaders() });
    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `Jenkins API error: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Jenkins returned non-JSON response (HTTP ${response.status})`); }
    const out = JSON.stringify(data, null, 2);
    return { content: [{ type: 'text', text: this.truncate(out) }], isError: false };
  }

  private async listJobs(args: Record<string, unknown>): Promise<ToolResult> {
    const url = args.folderPath
      ? `${this.baseUrl}/${this.jobPath(args.folderPath as string)}/api/json`
      : `${this.baseUrl}/api/json`;
    return this.fetchJson(url);
  }

  private async getJobInfo(args: Record<string, unknown>): Promise<ToolResult> {
    const jobName = args.jobName as string;
    if (!jobName) {
      return { content: [{ type: 'text', text: 'jobName is required' }], isError: true };
    }
    return this.fetchJson(`${this.baseUrl}/${this.jobPath(jobName)}/api/json`);
  }

  private async getBuildInfo(args: Record<string, unknown>): Promise<ToolResult> {
    const jobName = args.jobName as string;
    const buildNumber = args.buildNumber as number;
    if (!jobName || buildNumber === undefined) {
      return { content: [{ type: 'text', text: 'jobName and buildNumber are required' }], isError: true };
    }
    return this.fetchJson(`${this.baseUrl}/${this.jobPath(jobName)}/${buildNumber}/api/json`);
  }

  private async getBuildLog(args: Record<string, unknown>): Promise<ToolResult> {
    const jobName = args.jobName as string;
    const buildNumber = args.buildNumber as number;
    if (!jobName || buildNumber === undefined) {
      return { content: [{ type: 'text', text: 'jobName and buildNumber are required' }], isError: true };
    }
    const url = `${this.baseUrl}/${this.jobPath(jobName)}/${buildNumber}/consoleText`;
    const response = await this.fetchWithRetry(url, { method: 'GET', headers: { Authorization: this.authHeader } });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to get build log: ${response.status} ${response.statusText}` }], isError: true };
    }
    const text = await response.text();
    return { content: [{ type: 'text', text: this.truncate(text) }], isError: false };
  }

  private async triggerBuild(args: Record<string, unknown>): Promise<ToolResult> {
    const jobName = args.jobName as string;
    if (!jobName) {
      return { content: [{ type: 'text', text: 'jobName is required' }], isError: true };
    }
    const parameters = args.parameters as Record<string, string> | undefined;
    let url: string;
    let body: string | undefined;
    const headers = { ...this.jsonHeaders() };

    if (parameters && Object.keys(parameters).length > 0) {
      url = `${this.baseUrl}/${this.jobPath(jobName)}/buildWithParameters`;
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(parameters)) {
        params.append(key, String(value));
      }
      body = params.toString();
      headers['Content-Type'] = 'application/x-www-form-urlencoded';
    } else {
      url = `${this.baseUrl}/${this.jobPath(jobName)}/build`;
    }

    const response = await this.fetchWithRetry(url, { method: 'POST', headers, body });
    if (response.status !== 201 && !response.ok) {
      return { content: [{ type: 'text', text: `Failed to trigger build: ${response.status} ${response.statusText}` }], isError: true };
    }
    const location = response.headers.get('Location');
    return {
      content: [{ type: 'text', text: `Build queued successfully${location ? `. Queue item: ${location}` : ''}` }],
      isError: false,
    };
  }

  private async stopBuild(args: Record<string, unknown>): Promise<ToolResult> {
    const jobName = args.jobName as string;
    const buildNumber = args.buildNumber as number;
    if (!jobName || buildNumber === undefined) {
      return { content: [{ type: 'text', text: 'jobName and buildNumber are required' }], isError: true };
    }
    const url = `${this.baseUrl}/${this.jobPath(jobName)}/${buildNumber}/stop`;
    const response = await this.fetchWithRetry(url, { method: 'POST', headers: this.jsonHeaders() });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to stop build: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: `Build ${jobName}#${buildNumber} stop signal sent successfully` }], isError: false };
  }

  private async cancelQueueItem(args: Record<string, unknown>): Promise<ToolResult> {
    const queueItemId = args.queueItemId as number;
    if (queueItemId === undefined) {
      return { content: [{ type: 'text', text: 'queueItemId is required' }], isError: true };
    }
    const url = `${this.baseUrl}/queue/cancelItem?id=${queueItemId}`;
    const response = await this.fetchWithRetry(url, { method: 'POST', headers: this.jsonHeaders() });
    // Jenkins returns 302 or 204 on success for this endpoint
    if (!response.ok && response.status !== 302) {
      return { content: [{ type: 'text', text: `Failed to cancel queue item: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: `Queue item ${queueItemId} cancelled successfully` }], isError: false };
  }

  private async getQueue(): Promise<ToolResult> {
    return this.fetchJson(`${this.baseUrl}/queue/api/json`);
  }

  private async listNodes(): Promise<ToolResult> {
    return this.fetchJson(`${this.baseUrl}/computer/api/json`);
  }

  private async getNodeInfo(args: Record<string, unknown>): Promise<ToolResult> {
    const nodeName = args.nodeName as string;
    if (!nodeName) {
      return { content: [{ type: 'text', text: 'nodeName is required' }], isError: true };
    }
    return this.fetchJson(`${this.baseUrl}/computer/${encodeURIComponent(nodeName)}/api/json`);
  }

  private async enableJob(args: Record<string, unknown>): Promise<ToolResult> {
    const jobName = args.jobName as string;
    if (!jobName) {
      return { content: [{ type: 'text', text: 'jobName is required' }], isError: true };
    }
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/${this.jobPath(jobName)}/enable`,
      { method: 'POST', headers: this.jsonHeaders() },
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to enable job: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: `Job ${jobName} enabled successfully` }], isError: false };
  }

  private async disableJob(args: Record<string, unknown>): Promise<ToolResult> {
    const jobName = args.jobName as string;
    if (!jobName) {
      return { content: [{ type: 'text', text: 'jobName is required' }], isError: true };
    }
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/${this.jobPath(jobName)}/disable`,
      { method: 'POST', headers: this.jsonHeaders() },
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to disable job: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: `Job ${jobName} disabled successfully` }], isError: false };
  }

  private async getLastBuildStatus(args: Record<string, unknown>): Promise<ToolResult> {
    const jobName = args.jobName as string;
    if (!jobName) {
      return { content: [{ type: 'text', text: 'jobName is required' }], isError: true };
    }
    return this.fetchJson(`${this.baseUrl}/${this.jobPath(jobName)}/lastBuild/api/json`);
  }
}

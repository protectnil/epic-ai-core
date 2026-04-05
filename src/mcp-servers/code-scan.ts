/**
 * CodeScan MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// No official CodeScan MCP server was found on GitHub as of 2026-03-28.
// Our adapter covers: 2 tools. Vendor MCP covers: 0 tools (none exists).
// Recommendation: use-rest-api — no official MCP server exists.
//
// Integration: use-rest-api
// REST-sourced tools (2): get_job, queue_job
//
// Base URL: https://app.code-scan.com/api
// Auth: Basic Authentication (username = Subscription Id, password = api_key from subscription page)
// Docs: https://app.code-scan.com/site/terms
// Rate limits: Not publicly documented; respect 429 responses.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface CodeScanConfig {
  subscriptionId: string;
  apiKey: string;
  baseUrl?: string;
}

export class CodeScanMCPServer extends MCPAdapterBase {
  private readonly subscriptionId: string;
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: CodeScanConfig) {
    super();
    this.subscriptionId = config.subscriptionId;
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://app.code-scan.com/api';
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'get_job',
        description: 'Fetch the status and results of a CodeScan analysis job. Returns job status, quality gate alert, alertDescription, projectKey, projectBranch, commit, started/finished timestamps, and report URL.',
        inputSchema: {
          type: 'object',
          properties: {
            jobId: {
              type: 'string',
              description: 'The ID of the job to retrieve status for',
            },
          },
          required: ['jobId'],
        },
      },
      {
        name: 'queue_job',
        description: 'Queue a new CodeScan analysis job for a project. Returns the created job with its jobId, status, and any warnings.',
        inputSchema: {
          type: 'object',
          properties: {
            projectKey: {
              type: 'string',
              description: 'The key of the project to analyze (required)',
            },
            projectBranch: {
              type: 'string',
              description: 'The project branch to evaluate. Leave blank for the project default.',
            },
            commitOverride: {
              type: 'string',
              description: 'For git-based projects: the git commit SHA to analyze. Leave blank to use the project default.',
            },
            version: {
              type: 'string',
              description: 'Version label for the analysis. On success the project default version is set to this value.',
            },
            analysisMode: {
              type: 'string',
              description: 'Set to "preview" to run analysis without persisting results to the database.',
            },
            emailReportTo: {
              type: 'string',
              description: 'Comma-separated list of usernames to email the analysis report to.',
            },
          },
          required: ['projectKey'],
        },
      },
    ];
  }

  static catalog() {
    return {
      name: 'code-scan',
      displayName: 'CodeScan',
      version: '1.0.0',
      category: 'devops' as const,
      keywords: ['code-scan', 'codescan', 'static analysis', 'code quality', 'security scan'],
      toolNames: ['get_job', 'queue_job'],
      description: '2 tools for managing CodeScan hosted code analysis jobs (queue and status).',
      author: 'protectnil' as const,
    };
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'get_job':
          return await this.getJob(args);
        case 'queue_job':
          return await this.queueJob(args);
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
    const credentials = Buffer.from(`${this.subscriptionId}:${this.apiKey}`).toString('base64');
    return {
      Authorization: `Basic ${credentials}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    };
  }

  private async getJob(args: Record<string, unknown>): Promise<ToolResult> {
    const jobId = args.jobId as string;
    if (!jobId) {
      return { content: [{ type: 'text', text: 'jobId is required' }], isError: true };
    }
    const params = new URLSearchParams({ jobId });
    const response = await this.fetchWithRetry(`${this.baseUrl}/job?${params.toString()}`, {
      headers: this.headers,
    });
    const data = await response.json().catch(() => ({ status: response.status, statusText: response.statusText }));
    return {
      content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }],
      isError: !response.ok,
    };
  }

  private async queueJob(args: Record<string, unknown>): Promise<ToolResult> {
    const projectKey = args.projectKey as string;
    if (!projectKey) {
      return { content: [{ type: 'text', text: 'projectKey is required' }], isError: true };
    }
    const body: Record<string, unknown> = { projectKey };
    if (args.projectBranch) body.projectBranch = args.projectBranch;
    if (args.commitOverride) body.commitOverride = args.commitOverride;
    if (args.version) body.version = args.version;
    if (args.analysisMode) body.analysisMode = args.analysisMode;
    if (args.emailReportTo) body.emailReportTo = args.emailReportTo;

    const response = await this.fetchWithRetry(`${this.baseUrl}/job`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    const data = await response.json().catch(() => ({ status: response.status, statusText: response.statusText }));
    return {
      content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }],
      isError: !response.ok,
    };
  }
}

/**
 * LGTM MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03 — no official LGTM MCP server exists on GitHub.
// Note: LGTM.com was deprecated by GitHub in 2022 and replaced by GitHub Advanced Security (CodeQL).
// This adapter targets LGTM Enterprise self-hosted deployments still in use.
//
// Base URL: https://lgtm.com/api/v1.0  (or your LGTM Enterprise host)
// Auth: Bearer access token — created in LGTM account settings
// Docs: https://lgtm.com/help/lgtm/api/api-v1
// Rate limits: Not publicly documented; varies by deployment

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface LGTMConfig {
  accessToken: string;
  baseUrl?: string;
}

export class LGTMMCPServer extends MCPAdapterBase {
  private readonly baseUrl: string;
  private readonly authHeader: string;

  constructor(config: LGTMConfig) {
    super();
    this.baseUrl = (config.baseUrl ?? 'https://lgtm.com/api/v1.0').replace(/\/$/, '');
    this.authHeader = `Bearer ${config.accessToken}`;
  }

  static catalog() {
    return {
      name: 'lgtm',
      displayName: 'LGTM',
      version: '1.0.0',
      category: 'devops',
      keywords: [
        'lgtm', 'codeql', 'static analysis', 'sast', 'code quality', 'security', 'alerts',
        'vulnerabilities', 'code scanning', 'devops', 'ci', 'query', 'project', 'analysis',
      ],
      toolNames: [
        'list_projects', 'get_project', 'get_project_by_url',
        'get_analysis', 'get_analysis_alerts', 'run_analysis',
        'get_issues',
        'create_query_job', 'get_query_job', 'get_query_job_results', 'get_query_job_project_results',
        'get_operation',
        'get_system_health',
      ],
      description: 'Interact with LGTM (CodeQL static analysis): list projects, fetch analysis results and security alerts, run CodeQL query jobs, and monitor system health.',
      author: 'protectnil',
    };
  }

  private get headers(): Record<string, string> {
    return {
      Authorization: this.authHeader,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_projects',
        description: 'List all projects registered with LGTM for static analysis, with language and alert counts',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Maximum number of projects to return' },
            start: { type: 'string', description: 'Cursor for pagination (from previous response nextPageUrl)' },
          },
        },
      },
      {
        name: 'get_project',
        description: 'Get details for a specific LGTM project by its numeric project ID',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: { type: 'number', description: 'The numeric LGTM project ID' },
          },
          required: ['project_id'],
        },
      },
      {
        name: 'get_project_by_url',
        description: 'Get details for a specific LGTM project by its URL identifier (provider/org/name)',
        inputSchema: {
          type: 'object',
          properties: {
            provider: { type: 'string', description: 'Code hosting provider (e.g. "github", "bitbucket", "gitlab")' },
            org: { type: 'string', description: 'Organization or user name' },
            name: { type: 'string', description: 'Repository name' },
          },
          required: ['provider', 'org', 'name'],
        },
      },
      {
        name: 'get_analysis',
        description: 'Get the summary of a specific LGTM analysis by its analysis ID',
        inputSchema: {
          type: 'object',
          properties: {
            analysis_id: { type: 'string', description: 'The LGTM analysis ID' },
          },
          required: ['analysis_id'],
        },
      },
      {
        name: 'get_analysis_alerts',
        description: 'Get detailed alert information for a specific LGTM analysis, including code locations and severity',
        inputSchema: {
          type: 'object',
          properties: {
            analysis_id: { type: 'string', description: 'The LGTM analysis ID to fetch alerts for' },
            start: { type: 'string', description: 'Pagination cursor for fetching the next page of alerts' },
          },
          required: ['analysis_id'],
        },
      },
      {
        name: 'run_analysis',
        description: 'Trigger a new LGTM analysis on a specific commit for a given project',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: { type: 'number', description: 'The numeric LGTM project ID' },
            commit_id: { type: 'string', description: 'The commit hash to analyze' },
            language: { type: 'string', description: 'Programming language to analyze (optional, analyzes all if omitted)' },
          },
          required: ['project_id', 'commit_id'],
        },
      },
      {
        name: 'get_issues',
        description: 'Get detailed information for a specific LGTM issue (persistent alert) by alert key',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: { type: 'number', description: 'The numeric LGTM project ID' },
            alert_key: { type: 'string', description: 'The alert key identifying the specific issue type' },
          },
          required: ['project_id', 'alert_key'],
        },
      },
      {
        name: 'create_query_job',
        description: 'Submit a CodeQL query to run against one or more LGTM projects',
        inputSchema: {
          type: 'object',
          properties: {
            language: { type: 'string', description: 'Programming language for the query (e.g. "javascript", "python", "java", "cpp")' },
            query: { type: 'string', description: 'The CodeQL query source code to execute' },
            project_filter: {
              type: 'object',
              description: 'Filter for which projects to run the query on (e.g. {"id": [1234, 5678]} or {"all": true})',
            },
          },
          required: ['language', 'query'],
        },
      },
      {
        name: 'get_query_job',
        description: 'Get the current status of a CodeQL query job by its job ID',
        inputSchema: {
          type: 'object',
          properties: {
            queryjob_id: { type: 'string', description: 'The query job ID returned by create_query_job' },
          },
          required: ['queryjob_id'],
        },
      },
      {
        name: 'get_query_job_results',
        description: 'Get a summary of results across all projects for a completed CodeQL query job',
        inputSchema: {
          type: 'object',
          properties: {
            queryjob_id: { type: 'string', description: 'The query job ID' },
            start: { type: 'string', description: 'Pagination cursor for the next page of results' },
          },
          required: ['queryjob_id'],
        },
      },
      {
        name: 'get_query_job_project_results',
        description: 'Fetch the detailed CodeQL query results for a specific project within a query job',
        inputSchema: {
          type: 'object',
          properties: {
            queryjob_id: { type: 'string', description: 'The query job ID' },
            project_id: { type: 'number', description: 'The numeric project ID to fetch results for' },
          },
          required: ['queryjob_id', 'project_id'],
        },
      },
      {
        name: 'get_operation',
        description: 'Check the status of a long-running LGTM operation by its operation ID',
        inputSchema: {
          type: 'object',
          properties: {
            operation_id: { type: 'string', description: 'The operation ID to check' },
          },
          required: ['operation_id'],
        },
      },
      {
        name: 'get_system_health',
        description: 'Get a summary of the LGTM application health status',
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
        case 'list_projects': return await this.listProjects(args);
        case 'get_project': return await this.getProject(args);
        case 'get_project_by_url': return await this.getProjectByUrl(args);
        case 'get_analysis': return await this.getAnalysis(args);
        case 'get_analysis_alerts': return await this.getAnalysisAlerts(args);
        case 'run_analysis': return await this.runAnalysis(args);
        case 'get_issues': return await this.getIssues(args);
        case 'create_query_job': return await this.createQueryJob(args);
        case 'get_query_job': return await this.getQueryJob(args);
        case 'get_query_job_results': return await this.getQueryJobResults(args);
        case 'get_query_job_project_results': return await this.getQueryJobProjectResults(args);
        case 'get_operation': return await this.getOperation(args);
        case 'get_system_health': return await this.getSystemHealth();
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

  private async listProjects(args: Record<string, unknown>): Promise<ToolResult> {
    const url = new URL(`${this.baseUrl}/projects`);
    if (args.limit) url.searchParams.set('limit', String(args.limit));
    if (args.start) url.searchParams.set('start', args.start as string);
    const response = await this.fetchWithRetry(url.toString(), { headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to list projects: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async getProject(args: Record<string, unknown>): Promise<ToolResult> {
    const projectId = args.project_id as number;
    if (!projectId) return { content: [{ type: 'text', text: 'project_id is required' }], isError: true };
    const response = await this.fetchWithRetry(`${this.baseUrl}/projects/${projectId}`, { headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to get project: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async getProjectByUrl(args: Record<string, unknown>): Promise<ToolResult> {
    const provider = args.provider as string;
    const org = args.org as string;
    const name = args.name as string;
    if (!provider || !org || !name) return { content: [{ type: 'text', text: 'provider, org, and name are required' }], isError: true };
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/projects/${encodeURIComponent(provider)}/${encodeURIComponent(org)}/${encodeURIComponent(name)}`,
      { headers: this.headers }
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to get project by URL: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async getAnalysis(args: Record<string, unknown>): Promise<ToolResult> {
    const analysisId = args.analysis_id as string;
    if (!analysisId) return { content: [{ type: 'text', text: 'analysis_id is required' }], isError: true };
    const response = await this.fetchWithRetry(`${this.baseUrl}/analyses/${encodeURIComponent(analysisId)}`, { headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to get analysis: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async getAnalysisAlerts(args: Record<string, unknown>): Promise<ToolResult> {
    const analysisId = args.analysis_id as string;
    if (!analysisId) return { content: [{ type: 'text', text: 'analysis_id is required' }], isError: true };
    const url = new URL(`${this.baseUrl}/analyses/${encodeURIComponent(analysisId)}/alerts`);
    if (args.start) url.searchParams.set('start', args.start as string);
    const response = await this.fetchWithRetry(url.toString(), { headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to get analysis alerts: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async runAnalysis(args: Record<string, unknown>): Promise<ToolResult> {
    const projectId = args.project_id as number;
    const commitId = args.commit_id as string;
    if (!projectId) return { content: [{ type: 'text', text: 'project_id is required' }], isError: true };
    if (!commitId) return { content: [{ type: 'text', text: 'commit_id is required' }], isError: true };
    const url = new URL(`${this.baseUrl}/analyses/${projectId}/commits/${encodeURIComponent(commitId)}`);
    const body: Record<string, unknown> = {};
    if (args.language) body.language = args.language;
    const response = await this.fetchWithRetry(url.toString(), {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to run analysis: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async getIssues(args: Record<string, unknown>): Promise<ToolResult> {
    const projectId = args.project_id as number;
    const alertKey = args.alert_key as string;
    if (!projectId) return { content: [{ type: 'text', text: 'project_id is required' }], isError: true };
    if (!alertKey) return { content: [{ type: 'text', text: 'alert_key is required' }], isError: true };
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/issues/${projectId}/${encodeURIComponent(alertKey)}`,
      { headers: this.headers }
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to get issues: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async createQueryJob(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.language) return { content: [{ type: 'text', text: 'language is required' }], isError: true };
    if (!args.query) return { content: [{ type: 'text', text: 'query is required' }], isError: true };
    const body: Record<string, unknown> = {
      language: args.language,
      query: args.query,
    };
    if (args.project_filter) body.projectFilter = args.project_filter;
    const response = await this.fetchWithRetry(`${this.baseUrl}/queryjobs`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to create query job: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async getQueryJob(args: Record<string, unknown>): Promise<ToolResult> {
    const queryjobId = args.queryjob_id as string;
    if (!queryjobId) return { content: [{ type: 'text', text: 'queryjob_id is required' }], isError: true };
    const response = await this.fetchWithRetry(`${this.baseUrl}/queryjobs/${encodeURIComponent(queryjobId)}`, { headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to get query job: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async getQueryJobResults(args: Record<string, unknown>): Promise<ToolResult> {
    const queryjobId = args.queryjob_id as string;
    if (!queryjobId) return { content: [{ type: 'text', text: 'queryjob_id is required' }], isError: true };
    const url = new URL(`${this.baseUrl}/queryjobs/${encodeURIComponent(queryjobId)}/results`);
    if (args.start) url.searchParams.set('start', args.start as string);
    const response = await this.fetchWithRetry(url.toString(), { headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to get query job results: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async getQueryJobProjectResults(args: Record<string, unknown>): Promise<ToolResult> {
    const queryjobId = args.queryjob_id as string;
    const projectId = args.project_id as number;
    if (!queryjobId) return { content: [{ type: 'text', text: 'queryjob_id is required' }], isError: true };
    if (!projectId) return { content: [{ type: 'text', text: 'project_id is required' }], isError: true };
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/queryjobs/${encodeURIComponent(queryjobId)}/results/${projectId}`,
      { headers: this.headers }
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to get query job project results: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async getOperation(args: Record<string, unknown>): Promise<ToolResult> {
    const operationId = args.operation_id as string;
    if (!operationId) return { content: [{ type: 'text', text: 'operation_id is required' }], isError: true };
    const response = await this.fetchWithRetry(`${this.baseUrl}/operations/${encodeURIComponent(operationId)}`, { headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to get operation: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async getSystemHealth(): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}/system/health`, { headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to get system health: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }
}

/**
 * Snyk MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/snyk/snyk (Snyk CLI, `snyk mcp` subcommand) — transport: stdio, auth: Snyk CLI token
// The Snyk MCP server is part of the Snyk CLI (not a standalone repo). It backs scans via the CLI itself.
// Vendor MCP tools (~10): snyk_auth, snyk_auth_status, snyk_logout, snyk_version, snyk_code_scan,
//   snyk_sca_scan (open source SCA), snyk_container_scan, snyk_iac_scan, snyk_sbom_scan, snyk_aibom
// MCP maintained: yes — part of Snyk CLI, actively maintained as of 2026-03.
// Our adapter covers: 16 tools (orgs, projects, issues, targets, ignores, SBOM, audit logs).
// Recommendation: use-both — vendor MCP provides scan-execution tools (snyk_code_scan, snyk_sca_scan,
//   snyk_iac_scan, snyk_container_scan) that are CLI-backed and not available in the REST API;
//   this REST adapter covers org/project/issue management, ignores, SBOM retrieval, and audit logs
//   not available through the CLI-based MCP. Full coverage requires union of both.
//
// Integration: use-both
// MCP-sourced tools (~10): snyk_auth, snyk_auth_status, snyk_logout, snyk_version, snyk_code_scan,
//   snyk_sca_scan, snyk_container_scan, snyk_iac_scan, snyk_sbom_scan, snyk_aibom
// REST-sourced tools (16): list_orgs, list_projects, get_project, update_project, delete_project,
//   list_issues, get_issue, list_targets, list_package_issues, list_ignores, create_ignore, delete_ignore,
//   get_project_sbom, create_sbom_test, get_sbom_test_result, list_audit_logs
//
// Base URL: https://api.snyk.io (SNYK-US-01); EU: https://api.eu.snyk.io; AU: https://api.au.snyk.io
// Auth: Header "Authorization: token {API_TOKEN}" — generate at app.snyk.io/account
// Docs: https://docs.snyk.io/snyk-api/reference
// Rate limits: 1620 req/min per organization for REST API (varies by endpoint tier)
// API version: REST API requires ?version= param on all requests. Recommended stable: 2024-10-15

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface SnykConfig {
  apiToken: string;
  baseUrl?: string;
  apiVersion?: string;
}

export class SnykMCPServer extends MCPAdapterBase {
  private readonly apiToken: string;
  private readonly baseUrl: string;
  private readonly apiVersion: string;

  constructor(config: SnykConfig) {
    super();
    this.apiToken = config.apiToken;
    this.baseUrl = config.baseUrl || 'https://api.snyk.io';
    this.apiVersion = config.apiVersion || '2024-10-15';
  }

  static catalog() {
    return {
      name: 'snyk',
      displayName: 'Snyk',
      version: '1.0.0',
      category: 'cybersecurity',
      keywords: ['snyk', 'vulnerability', 'security', 'dependency', 'cve', 'sca', 'container security', 'sbom', 'devsecops', 'open source', 'license compliance'],
      toolNames: [
        'list_orgs', 'list_projects', 'get_project', 'update_project', 'delete_project',
        'list_issues', 'get_issue', 'list_targets', 'list_package_issues',
        'list_ignores', 'create_ignore', 'delete_ignore',
        'get_project_sbom', 'create_sbom_test', 'get_sbom_test_result',
        'list_audit_logs',
      ],
      description: 'Snyk application security: list and triage vulnerabilities, manage projects, ignores, SBOMs, and audit logs across organizations.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_orgs',
        description: 'List all Snyk organizations accessible with the current API token with pagination support',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of organizations to return (default: 100)',
            },
            starting_after: {
              type: 'string',
              description: 'Cursor for forward pagination (from previous response next link)',
            },
          },
        },
      },
      {
        name: 'list_projects',
        description: 'List all projects within a Snyk organization with optional filters for type and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            org_id: {
              type: 'string',
              description: 'The Snyk organization ID',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of projects to return (default: 100)',
            },
            starting_after: {
              type: 'string',
              description: 'Cursor for forward pagination (from previous response)',
            },
            type: {
              type: 'string',
              description: 'Filter by project type: npm, maven, gradle, dockerfile, apk, cocoapods, etc.',
            },
          },
          required: ['org_id'],
        },
      },
      {
        name: 'get_project',
        description: 'Retrieve full details for a specific Snyk project including settings and last scan info',
        inputSchema: {
          type: 'object',
          properties: {
            org_id: {
              type: 'string',
              description: 'The Snyk organization ID',
            },
            project_id: {
              type: 'string',
              description: 'The Snyk project ID',
            },
          },
          required: ['org_id', 'project_id'],
        },
      },
      {
        name: 'update_project',
        description: 'Update a Snyk project name, test frequency, or other settings',
        inputSchema: {
          type: 'object',
          properties: {
            org_id: {
              type: 'string',
              description: 'The Snyk organization ID',
            },
            project_id: {
              type: 'string',
              description: 'The Snyk project ID',
            },
            name: {
              type: 'string',
              description: 'New name for the project',
            },
            test_frequency: {
              type: 'string',
              description: 'Automated test frequency: daily, weekly, never',
            },
          },
          required: ['org_id', 'project_id'],
        },
      },
      {
        name: 'delete_project',
        description: 'Delete a Snyk project and all its associated data. This action cannot be undone.',
        inputSchema: {
          type: 'object',
          properties: {
            org_id: {
              type: 'string',
              description: 'The Snyk organization ID',
            },
            project_id: {
              type: 'string',
              description: 'The Snyk project ID to delete',
            },
          },
          required: ['org_id', 'project_id'],
        },
      },
      {
        name: 'list_issues',
        description: 'List security issues (vulnerabilities and license issues) for a Snyk organization with severity and type filters',
        inputSchema: {
          type: 'object',
          properties: {
            org_id: {
              type: 'string',
              description: 'The Snyk organization ID',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of issues to return (default: 100)',
            },
            starting_after: {
              type: 'string',
              description: 'Cursor for forward pagination',
            },
            severity: {
              type: 'string',
              description: 'Filter by severity (comma-separated): critical, high, medium, low',
            },
            type: {
              type: 'string',
              description: 'Filter by issue type: package_vulnerability, license',
            },
          },
          required: ['org_id'],
        },
      },
      {
        name: 'get_issue',
        description: 'Retrieve full details for a specific Snyk issue including CVE info, CVSS score, and fix guidance',
        inputSchema: {
          type: 'object',
          properties: {
            org_id: {
              type: 'string',
              description: 'The Snyk organization ID',
            },
            issue_id: {
              type: 'string',
              description: 'The Snyk issue ID',
            },
          },
          required: ['org_id', 'issue_id'],
        },
      },
      {
        name: 'list_targets',
        description: 'List import targets (repositories, containers, or other sources) in a Snyk organization',
        inputSchema: {
          type: 'object',
          properties: {
            org_id: {
              type: 'string',
              description: 'The Snyk organization ID',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of targets to return (default: 100)',
            },
            starting_after: {
              type: 'string',
              description: 'Cursor for forward pagination',
            },
          },
          required: ['org_id'],
        },
      },
      {
        name: 'list_package_issues',
        description: 'List known vulnerabilities for a specific package version using its PURL (Package URL)',
        inputSchema: {
          type: 'object',
          properties: {
            org_id: {
              type: 'string',
              description: 'The Snyk organization ID',
            },
            purl: {
              type: 'string',
              description: 'Package URL (PURL) identifying the package — e.g. pkg:npm/lodash@4.17.20 or pkg:maven/org.apache.struts/struts2-core@2.5.10',
            },
          },
          required: ['org_id', 'purl'],
        },
      },
      {
        name: 'list_ignores',
        description: 'List all ignored issues for a Snyk project (issues suppressed from failing tests)',
        inputSchema: {
          type: 'object',
          properties: {
            org_id: {
              type: 'string',
              description: 'The Snyk organization ID',
            },
            project_id: {
              type: 'string',
              description: 'The Snyk project ID',
            },
          },
          required: ['org_id', 'project_id'],
        },
      },
      {
        name: 'create_ignore',
        description: 'Ignore a specific vulnerability or license issue for a project with a reason and optional expiration',
        inputSchema: {
          type: 'object',
          properties: {
            org_id: {
              type: 'string',
              description: 'The Snyk organization ID',
            },
            project_id: {
              type: 'string',
              description: 'The Snyk project ID',
            },
            issue_id: {
              type: 'string',
              description: 'The vulnerability or license issue ID to ignore',
            },
            reason: {
              type: 'string',
              description: 'Reason for ignoring this issue (required by most org policies)',
            },
            reason_type: {
              type: 'string',
              description: 'Reason type: not-vulnerable, wont-fix, temporary-ignore (default: wont-fix)',
            },
            ignore_path: {
              type: 'string',
              description: 'Dependency path to ignore — use * to ignore all paths (default: *)',
            },
            disregard_if_fixable: {
              type: 'boolean',
              description: 'If true, the ignore is disregarded if a fix becomes available (default: false)',
            },
            expires: {
              type: 'string',
              description: 'Expiration date as ISO 8601 string after which the ignore is removed (e.g. 2026-12-31T00:00:00Z)',
            },
          },
          required: ['org_id', 'project_id', 'issue_id'],
        },
      },
      {
        name: 'delete_ignore',
        description: 'Remove an ignore rule for a specific issue in a Snyk project',
        inputSchema: {
          type: 'object',
          properties: {
            org_id: {
              type: 'string',
              description: 'The Snyk organization ID',
            },
            project_id: {
              type: 'string',
              description: 'The Snyk project ID',
            },
            issue_id: {
              type: 'string',
              description: 'The issue ID to stop ignoring',
            },
          },
          required: ['org_id', 'project_id', 'issue_id'],
        },
      },
      {
        name: 'get_project_sbom',
        description: 'Get the Software Bill of Materials (SBOM) for a Snyk project in CycloneDX or SPDX format',
        inputSchema: {
          type: 'object',
          properties: {
            org_id: {
              type: 'string',
              description: 'The Snyk organization ID',
            },
            project_id: {
              type: 'string',
              description: 'The Snyk project ID',
            },
            format: {
              type: 'string',
              description: 'SBOM format: cyclonedx1.4+json, cyclonedx1.5+json, cyclonedx1.6+json, spdx2.3+json (default: cyclonedx1.4+json)',
            },
          },
          required: ['org_id', 'project_id'],
        },
      },
      {
        name: 'create_sbom_test',
        description: 'Submit an SBOM document to Snyk for vulnerability testing and receive an async job ID',
        inputSchema: {
          type: 'object',
          properties: {
            org_id: {
              type: 'string',
              description: 'The Snyk organization ID',
            },
            sbom: {
              type: 'object',
              description: 'SBOM document as a JSON object (CycloneDX 1.4/1.5/1.6 JSON or SPDX 2.3 JSON)',
            },
          },
          required: ['org_id', 'sbom'],
        },
      },
      {
        name: 'get_sbom_test_result',
        description: 'Retrieve the results of an SBOM vulnerability test by its job ID',
        inputSchema: {
          type: 'object',
          properties: {
            org_id: {
              type: 'string',
              description: 'The Snyk organization ID',
            },
            job_id: {
              type: 'string',
              description: 'Job ID returned by create_sbom_test',
            },
          },
          required: ['org_id', 'job_id'],
        },
      },
      {
        name: 'list_audit_logs',
        description: 'Search and retrieve audit logs of user-initiated activity in a Snyk organization (last 90 days)',
        inputSchema: {
          type: 'object',
          properties: {
            org_id: {
              type: 'string',
              description: 'The Snyk organization ID',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of log entries to return (default: 100)',
            },
            starting_after: {
              type: 'string',
              description: 'Cursor for forward pagination',
            },
            user_id: {
              type: 'string',
              description: 'Filter logs by a specific user ID',
            },
            project_id: {
              type: 'string',
              description: 'Filter logs related to a specific project',
            },
            from: {
              type: 'string',
              description: 'Start of date range as ISO 8601 string (e.g. 2026-01-01T00:00:00Z)',
            },
            to: {
              type: 'string',
              description: 'End of date range as ISO 8601 string',
            },
          },
          required: ['org_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_orgs':
          return this.listOrgs(args);
        case 'list_projects':
          return this.listProjects(args);
        case 'get_project':
          return this.getProject(args);
        case 'update_project':
          return this.updateProject(args);
        case 'delete_project':
          return this.deleteProject(args);
        case 'list_issues':
          return this.listIssues(args);
        case 'get_issue':
          return this.getIssue(args);
        case 'list_targets':
          return this.listTargets(args);
        case 'list_package_issues':
          return this.listPackageIssues(args);
        case 'list_ignores':
          return this.listIgnores(args);
        case 'create_ignore':
          return this.createIgnore(args);
        case 'delete_ignore':
          return this.deleteIgnore(args);
        case 'get_project_sbom':
          return this.getProjectSbom(args);
        case 'create_sbom_test':
          return this.createSbomTest(args);
        case 'get_sbom_test_result':
          return this.getSbomTestResult(args);
        case 'list_audit_logs':
          return this.listAuditLogs(args);
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
      Authorization: `token ${this.apiToken}`,
      'Content-Type': 'application/vnd.api+json',
    };
  }

  private versionParams(extra?: Record<string, string>): URLSearchParams {
    const p = new URLSearchParams({ version: this.apiVersion });
    if (extra) {
      for (const [k, v] of Object.entries(extra)) p.set(k, v);
    }
    return p;
  }

  private async snykGet(path: string, params?: URLSearchParams): Promise<ToolResult> {
    const url = `${this.baseUrl}${path}${params ? '?' + params.toString() : ''}`;
    const response = await this.fetchWithRetry(url, { method: 'GET', headers: this.headers });
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `API error (HTTP ${response.status}): ${errText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Snyk returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async snykPost(path: string, body: unknown, params?: URLSearchParams): Promise<ToolResult> {
    const url = `${this.baseUrl}${path}${params ? '?' + params.toString() : ''}`;
    const response = await this.fetchWithRetry(url, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `API error (HTTP ${response.status}): ${errText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Snyk returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async snykPatch(path: string, body: unknown, params?: URLSearchParams): Promise<ToolResult> {
    const url = `${this.baseUrl}${path}${params ? '?' + params.toString() : ''}`;
    const response = await this.fetchWithRetry(url, {
      method: 'PATCH',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `API error (HTTP ${response.status}): ${errText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Snyk returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async snykDelete(path: string, params?: URLSearchParams): Promise<ToolResult> {
    const url = `${this.baseUrl}${path}${params ? '?' + params.toString() : ''}`;
    const response = await this.fetchWithRetry(url, { method: 'DELETE', headers: this.headers });
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `API error (HTTP ${response.status}): ${errText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: JSON.stringify({ success: true, status: response.status }) }], isError: false };
  }

  private async listOrgs(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.versionParams();
    if (args.limit) params.set('limit', String(args.limit));
    if (args.starting_after) params.set('starting_after', args.starting_after as string);
    return this.snykGet('/rest/orgs', params);
  }

  private async listProjects(args: Record<string, unknown>): Promise<ToolResult> {
    const orgId = args.org_id as string;
    if (!orgId) return { content: [{ type: 'text', text: 'org_id is required' }], isError: true };
    const params = this.versionParams();
    if (args.limit) params.set('limit', String(args.limit));
    if (args.starting_after) params.set('starting_after', args.starting_after as string);
    if (args.type) params.set('type', args.type as string);
    return this.snykGet(`/rest/orgs/${encodeURIComponent(orgId)}/projects`, params);
  }

  private async getProject(args: Record<string, unknown>): Promise<ToolResult> {
    const orgId = args.org_id as string;
    const projectId = args.project_id as string;
    if (!orgId || !projectId) return { content: [{ type: 'text', text: 'org_id and project_id are required' }], isError: true };
    return this.snykGet(`/rest/orgs/${encodeURIComponent(orgId)}/projects/${encodeURIComponent(projectId)}`, this.versionParams());
  }

  private async updateProject(args: Record<string, unknown>): Promise<ToolResult> {
    const orgId = args.org_id as string;
    const projectId = args.project_id as string;
    if (!orgId || !projectId) return { content: [{ type: 'text', text: 'org_id and project_id are required' }], isError: true };
    const attributes: Record<string, unknown> = {};
    if (args.name) attributes.name = args.name;
    if (args.test_frequency) attributes.test_frequency = args.test_frequency;
    const body = { data: { type: 'project', attributes } };
    return this.snykPatch(
      `/rest/orgs/${encodeURIComponent(orgId)}/projects/${encodeURIComponent(projectId)}`,
      body,
      this.versionParams(),
    );
  }

  private async deleteProject(args: Record<string, unknown>): Promise<ToolResult> {
    const orgId = args.org_id as string;
    const projectId = args.project_id as string;
    if (!orgId || !projectId) return { content: [{ type: 'text', text: 'org_id and project_id are required' }], isError: true };
    return this.snykDelete(
      `/rest/orgs/${encodeURIComponent(orgId)}/projects/${encodeURIComponent(projectId)}`,
      this.versionParams(),
    );
  }

  private async listIssues(args: Record<string, unknown>): Promise<ToolResult> {
    const orgId = args.org_id as string;
    if (!orgId) return { content: [{ type: 'text', text: 'org_id is required' }], isError: true };
    const params = this.versionParams();
    if (args.limit) params.set('limit', String(args.limit));
    if (args.starting_after) params.set('starting_after', args.starting_after as string);
    if (args.severity) params.set('severity', args.severity as string);
    if (args.type) params.set('type', args.type as string);
    return this.snykGet(`/rest/orgs/${encodeURIComponent(orgId)}/issues`, params);
  }

  private async getIssue(args: Record<string, unknown>): Promise<ToolResult> {
    const orgId = args.org_id as string;
    const issueId = args.issue_id as string;
    if (!orgId || !issueId) return { content: [{ type: 'text', text: 'org_id and issue_id are required' }], isError: true };
    return this.snykGet(
      `/rest/orgs/${encodeURIComponent(orgId)}/issues/${encodeURIComponent(issueId)}`,
      this.versionParams(),
    );
  }

  private async listTargets(args: Record<string, unknown>): Promise<ToolResult> {
    const orgId = args.org_id as string;
    if (!orgId) return { content: [{ type: 'text', text: 'org_id is required' }], isError: true };
    const params = this.versionParams();
    if (args.limit) params.set('limit', String(args.limit));
    if (args.starting_after) params.set('starting_after', args.starting_after as string);
    return this.snykGet(`/rest/orgs/${encodeURIComponent(orgId)}/targets`, params);
  }

  private async listPackageIssues(args: Record<string, unknown>): Promise<ToolResult> {
    const orgId = args.org_id as string;
    const purl = args.purl as string;
    if (!orgId || !purl) return { content: [{ type: 'text', text: 'org_id and purl are required' }], isError: true };
    return this.snykGet(
      `/rest/orgs/${encodeURIComponent(orgId)}/packages/${encodeURIComponent(purl)}/issues`,
      this.versionParams(),
    );
  }

  private async listIgnores(args: Record<string, unknown>): Promise<ToolResult> {
    const orgId = args.org_id as string;
    const projectId = args.project_id as string;
    if (!orgId || !projectId) return { content: [{ type: 'text', text: 'org_id and project_id are required' }], isError: true };
    // v1 ignores endpoint — REST equivalent is not GA as of 2024-10-15
    const url = `${this.baseUrl}/v1/org/${encodeURIComponent(orgId)}/project/${encodeURIComponent(projectId)}/ignores`;
    const headers = { Authorization: `token ${this.apiToken}`, 'Content-Type': 'application/json' };
    const response = await this.fetchWithRetry(url, { method: 'GET', headers });
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `API error (HTTP ${response.status}): ${errText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Snyk returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async createIgnore(args: Record<string, unknown>): Promise<ToolResult> {
    const orgId = args.org_id as string;
    const projectId = args.project_id as string;
    const issueId = args.issue_id as string;
    if (!orgId || !projectId || !issueId) {
      return { content: [{ type: 'text', text: 'org_id, project_id, and issue_id are required' }], isError: true };
    }
    const ignoreEntry: Record<string, unknown> = {
      ignorePath: (args.ignore_path as string) || '*',
      reason: (args.reason as string) || '',
      reasonType: (args.reason_type as string) || 'wont-fix',
      disregardIfFixable: (args.disregard_if_fixable as boolean) ?? false,
    };
    if (args.expires) ignoreEntry.expires = args.expires;
    const url = `${this.baseUrl}/v1/org/${encodeURIComponent(orgId)}/project/${encodeURIComponent(projectId)}/ignore/${encodeURIComponent(issueId)}`;
    const headers = { Authorization: `token ${this.apiToken}`, 'Content-Type': 'application/json' };
    const response = await this.fetchWithRetry(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(ignoreEntry),
    });
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `API error (HTTP ${response.status}): ${errText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Snyk returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async deleteIgnore(args: Record<string, unknown>): Promise<ToolResult> {
    const orgId = args.org_id as string;
    const projectId = args.project_id as string;
    const issueId = args.issue_id as string;
    if (!orgId || !projectId || !issueId) {
      return { content: [{ type: 'text', text: 'org_id, project_id, and issue_id are required' }], isError: true };
    }
    const url = `${this.baseUrl}/v1/org/${encodeURIComponent(orgId)}/project/${encodeURIComponent(projectId)}/ignore/${encodeURIComponent(issueId)}`;
    const headers = { Authorization: `token ${this.apiToken}`, 'Content-Type': 'application/json' };
    const response = await this.fetchWithRetry(url, { method: 'DELETE', headers });
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `API error (HTTP ${response.status}): ${errText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: JSON.stringify({ success: true, status: response.status }) }], isError: false };
  }

  private async getProjectSbom(args: Record<string, unknown>): Promise<ToolResult> {
    const orgId = args.org_id as string;
    const projectId = args.project_id as string;
    if (!orgId || !projectId) return { content: [{ type: 'text', text: 'org_id and project_id are required' }], isError: true };
    const params = this.versionParams({ format: (args.format as string) || 'cyclonedx1.4+json' });
    return this.snykGet(
      `/rest/orgs/${encodeURIComponent(orgId)}/projects/${encodeURIComponent(projectId)}/sbom`,
      params,
    );
  }

  private async createSbomTest(args: Record<string, unknown>): Promise<ToolResult> {
    const orgId = args.org_id as string;
    if (!orgId || !args.sbom) return { content: [{ type: 'text', text: 'org_id and sbom are required' }], isError: true };
    const body = { data: { type: 'sbom_test', attributes: { sbom: args.sbom } } };
    return this.snykPost(
      `/rest/orgs/${encodeURIComponent(orgId)}/sbom_tests`,
      body,
      this.versionParams(),
    );
  }

  private async getSbomTestResult(args: Record<string, unknown>): Promise<ToolResult> {
    const orgId = args.org_id as string;
    const jobId = args.job_id as string;
    if (!orgId || !jobId) return { content: [{ type: 'text', text: 'org_id and job_id are required' }], isError: true };
    return this.snykGet(
      `/rest/orgs/${encodeURIComponent(orgId)}/sbom_tests/${encodeURIComponent(jobId)}`,
      this.versionParams(),
    );
  }

  private async listAuditLogs(args: Record<string, unknown>): Promise<ToolResult> {
    const orgId = args.org_id as string;
    if (!orgId) return { content: [{ type: 'text', text: 'org_id is required' }], isError: true };
    const params = this.versionParams();
    if (args.limit) params.set('limit', String(args.limit));
    if (args.starting_after) params.set('starting_after', args.starting_after as string);
    if (args.user_id) params.set('user_id', args.user_id as string);
    if (args.project_id) params.set('project_id', args.project_id as string);
    if (args.from) params.set('from', args.from as string);
    if (args.to) params.set('to', args.to as string);
    return this.snykGet(`/rest/orgs/${encodeURIComponent(orgId)}/audit_logs/search`, params);
  }
}

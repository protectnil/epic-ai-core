/**
 * SonarQube MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/SonarSource/sonarqube-mcp-server — transport: stdio/HTTP, auth: API token
// MCP maintained: yes — latest release 1.13.0 on 2026-03-16, published by SonarSource (official).
// Vendor MCP covers: 25 tools. Criteria: official=yes, maintained=yes, 25 tools >= 10, stdio transport.
// Vendor MCP tool names (25): analyze_code_snippet, analyze_file_list, toggle_automatic_analysis,
//   search_sonar_issues_in_projects, change_sonar_issue_status, search_my_sonarqube_projects,
//   list_quality_gates, get_project_quality_gate_status, show_rule, list_rule_repositories,
//   list_languages, get_component_measures, search_metrics, get_raw_source, get_scm_info,
//   get_system_health, get_system_status, get_system_logs, ping_system, get_system_info,
//   create_webhook, list_webhooks, list_portfolios, list_enterprises, search_dependency_risks
// Our adapter covers: 14 tools. Shared with MCP: list_projects (≈search_my_sonarqube_projects),
//   list_issues (≈search_sonar_issues_in_projects), list_quality_gates, get_quality_gate_status
//   (≈get_project_quality_gate_status), list_rules (≈show_rule/list_rule_repositories), get_rule
//   (≈show_rule), search_hotspots, get_hotspot, list_metrics (≈search_metrics), get_system_health,
//   get_system_info. API-only (no MCP equivalent): get_project_measures, get_issue, list_branches.
//   MCP-only (not in our adapter): analyze_code_snippet, analyze_file_list, toggle_automatic_analysis,
//   change_sonar_issue_status, list_languages, get_raw_source, get_scm_info, get_system_status,
//   get_system_logs, ping_system, create_webhook, list_webhooks, list_portfolios, list_enterprises,
//   search_dependency_risks.
// Recommendation: use-both — MCP has 15 unique tools not in our REST adapter (IDE analysis, webhooks,
//   portfolios, enterprises, dependency risks, SCM info, system status/logs, raw source);
//   our REST adapter has 3 unique tools not in MCP (get_project_measures with branch, get_issue by key,
//   list_branches). Full coverage requires union.
//
// Integration: use-both
// MCP-sourced tools (15 unique): analyze_code_snippet, analyze_file_list, toggle_automatic_analysis,
//   change_sonar_issue_status, list_languages, get_raw_source, get_scm_info, get_system_status,
//   get_system_logs, ping_system, create_webhook, list_webhooks, list_portfolios, list_enterprises,
//   search_dependency_risks
// REST-sourced tools (3 unique): get_project_measures, get_issue, list_branches
// Shared (11): list_projects, list_issues, list_quality_gates, get_quality_gate_status, list_rules,
//   get_rule, search_hotspots, get_hotspot, list_metrics, get_system_health, get_system_info
// Combined coverage: 29 tools (MCP: 25 + REST: 14 - shared: 11 ≈ but overlap is approximate)
//
// Base URL: https://sonarqube.example.com (self-hosted, no trailing slash)
// Auth: Bearer token (user token or project analysis token) — Authorization: Bearer {token}
// Docs: https://docs.sonarsource.com/sonarqube-server/latest/extension-guide/web-api/
// Rate limits: Not publicly documented; governed by instance configuration

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface SonarQubeConfig {
  baseUrl: string;
  token: string;
}

export class SonarQubeMCPServer extends MCPAdapterBase {
  private readonly baseUrl: string;
  private readonly token: string;

  constructor(config: SonarQubeConfig) {
    super();
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.token = config.token;
  }

  static catalog() {
    return {
      name: 'sonarqube',
      displayName: 'SonarQube',
      version: '1.0.0',
      category: 'devops' as const,
      keywords: ['sonarqube', 'sonar', 'code quality', 'static analysis', 'security', 'bugs', 'vulnerabilities', 'code smells', 'coverage', 'technical debt', 'quality gate', 'hotspot', 'sast'],
      toolNames: [
        'list_projects', 'get_project_measures', 'list_issues', 'get_issue',
        'list_rules', 'get_rule', 'list_quality_gates', 'get_quality_gate_status',
        'search_hotspots', 'get_hotspot', 'list_branches', 'list_metrics',
        'get_system_health', 'get_system_info',
      ],
      description: 'Code quality and security analysis: inspect projects, issues, vulnerabilities, hotspots, quality gates, rules, and metrics for on-prem SonarQube Server.',
      author: 'protectnil' as const,
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_projects',
        description: 'Search and list projects in SonarQube with optional name/key filter and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query to filter projects by name or key (substring match)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            pageSize: {
              type: 'number',
              description: 'Number of results per page (max 500, default: 100)',
            },
          },
        },
      },
      {
        name: 'get_project_measures',
        description: 'Get code quality metrics for a project: bugs, vulnerabilities, code smells, coverage, duplications, lines of code, ratings',
        inputSchema: {
          type: 'object',
          properties: {
            component: {
              type: 'string',
              description: 'Project key (e.g. my_project)',
            },
            metricKeys: {
              type: 'string',
              description: 'Comma-separated metric keys (e.g. bugs,vulnerabilities,code_smells,coverage,duplicated_lines_density,ncloc,sqale_rating,reliability_rating,security_rating)',
            },
            branch: {
              type: 'string',
              description: 'Branch name to scope measures to (default: main branch)',
            },
          },
          required: ['component', 'metricKeys'],
        },
      },
      {
        name: 'list_issues',
        description: 'Search for code issues (bugs, vulnerabilities, code smells) with filters for type, severity, status, and project',
        inputSchema: {
          type: 'object',
          properties: {
            componentKeys: {
              type: 'string',
              description: 'Comma-separated project or component keys to filter by',
            },
            types: {
              type: 'string',
              description: 'Comma-separated issue types: BUG, VULNERABILITY, CODE_SMELL, SECURITY_HOTSPOT',
            },
            severities: {
              type: 'string',
              description: 'Comma-separated severities: BLOCKER, CRITICAL, MAJOR, MINOR, INFO',
            },
            statuses: {
              type: 'string',
              description: 'Comma-separated statuses: OPEN, CONFIRMED, REOPENED, RESOLVED, CLOSED',
            },
            resolved: {
              type: 'boolean',
              description: 'Filter to resolved (true) or unresolved (false) issues',
            },
            assignees: {
              type: 'string',
              description: 'Comma-separated assignee login names to filter by',
            },
            branch: {
              type: 'string',
              description: 'Branch name to scope issues to',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            pageSize: {
              type: 'number',
              description: 'Number of issues per page (max 500, default: 100)',
            },
          },
        },
      },
      {
        name: 'get_issue',
        description: 'Get full details for a specific SonarQube issue by its key, including changelog and comments',
        inputSchema: {
          type: 'object',
          properties: {
            issueKey: {
              type: 'string',
              description: 'Issue key (e.g. AXoW5LRJHbB3BKBZ0001)',
            },
          },
          required: ['issueKey'],
        },
      },
      {
        name: 'list_rules',
        description: 'Search quality rules by language, type, or keyword — covers bug detection, vulnerability, and code smell rules',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query for rule name or description (substring match)',
            },
            languages: {
              type: 'string',
              description: 'Comma-separated language keys (e.g. java,js,py,cs,ts)',
            },
            types: {
              type: 'string',
              description: 'Comma-separated rule types: BUG, VULNERABILITY, CODE_SMELL, SECURITY_HOTSPOT',
            },
            severities: {
              type: 'string',
              description: 'Comma-separated severities: BLOCKER, CRITICAL, MAJOR, MINOR, INFO',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            pageSize: {
              type: 'number',
              description: 'Number of rules per page (max 500, default: 100)',
            },
          },
        },
      },
      {
        name: 'get_rule',
        description: 'Get full details for a specific quality rule including description, parameters, and remediation guidance',
        inputSchema: {
          type: 'object',
          properties: {
            ruleKey: {
              type: 'string',
              description: 'Rule key (e.g. java:S1234)',
            },
          },
          required: ['ruleKey'],
        },
      },
      {
        name: 'list_quality_gates',
        description: 'List all quality gates defined in the SonarQube instance with their conditions',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_quality_gate_status',
        description: 'Get the pass/fail quality gate status for a project, including individual condition results',
        inputSchema: {
          type: 'object',
          properties: {
            projectKey: {
              type: 'string',
              description: 'Project key to check the quality gate status for',
            },
            branch: {
              type: 'string',
              description: 'Branch name to check (default: main branch)',
            },
          },
          required: ['projectKey'],
        },
      },
      {
        name: 'search_hotspots',
        description: 'Search for security hotspots in a project — hotspots are code patterns requiring security review',
        inputSchema: {
          type: 'object',
          properties: {
            projectKey: {
              type: 'string',
              description: 'Project key to search hotspots in',
            },
            status: {
              type: 'string',
              description: 'Filter by hotspot status: TO_REVIEW, REVIEWED',
            },
            resolution: {
              type: 'string',
              description: 'Filter by resolution when status is REVIEWED: FIXED, SAFE, ACKNOWLEDGED',
            },
            branch: {
              type: 'string',
              description: 'Branch name to scope the search to',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            pageSize: {
              type: 'number',
              description: 'Number of hotspots per page (max 500, default: 100)',
            },
          },
          required: ['projectKey'],
        },
      },
      {
        name: 'get_hotspot',
        description: 'Get full details for a specific security hotspot including risk description and fix guidance',
        inputSchema: {
          type: 'object',
          properties: {
            hotspotKey: {
              type: 'string',
              description: 'Hotspot key (obtained from search_hotspots results)',
            },
          },
          required: ['hotspotKey'],
        },
      },
      {
        name: 'list_branches',
        description: 'List all branches for a project including their analysis status and quality gate result',
        inputSchema: {
          type: 'object',
          properties: {
            project: {
              type: 'string',
              description: 'Project key to list branches for',
            },
          },
          required: ['project'],
        },
      },
      {
        name: 'list_metrics',
        description: 'List all available metric definitions (keys, names, types, domains) supported by this SonarQube instance',
        inputSchema: {
          type: 'object',
          properties: {
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            pageSize: {
              type: 'number',
              description: 'Number of metrics per page (max 500, default: 100)',
            },
          },
        },
      },
      {
        name: 'get_system_health',
        description: 'Get the overall health status of the SonarQube server (GREEN, YELLOW, RED) and node health details',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_system_info',
        description: 'Get detailed system information including version, edition, database, plugins, and JVM statistics',
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
        case 'list_projects':
          return await this.listProjects(args);
        case 'get_project_measures':
          return await this.getProjectMeasures(args);
        case 'list_issues':
          return await this.listIssues(args);
        case 'get_issue':
          return await this.getIssue(args);
        case 'list_rules':
          return await this.listRules(args);
        case 'get_rule':
          return await this.getRule(args);
        case 'list_quality_gates':
          return await this.listQualityGates();
        case 'get_quality_gate_status':
          return await this.getQualityGateStatus(args);
        case 'search_hotspots':
          return await this.searchHotspots(args);
        case 'get_hotspot':
          return await this.getHotspot(args);
        case 'list_branches':
          return await this.listBranches(args);
        case 'list_metrics':
          return await this.listMetrics(args);
        case 'get_system_health':
          return await this.getSystemHealth();
        case 'get_system_info':
          return await this.getSystemInfo();
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

  private async listProjects(args: Record<string, unknown>): Promise<ToolResult> {
    const page = (args.page as number) ?? 1;
    const pageSize = (args.pageSize as number) ?? 100;
    let url = `${this.baseUrl}/api/projects/search?p=${page}&ps=${pageSize}`;
    if (args.query) url += `&q=${encodeURIComponent(args.query as string)}`;

    const response = await this.fetchWithRetry(url, { method: 'GET', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to list projects: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getProjectMeasures(args: Record<string, unknown>): Promise<ToolResult> {
    const component = args.component as string;
    const metricKeys = args.metricKeys as string;
    if (!component || !metricKeys) {
      return { content: [{ type: 'text', text: 'component and metricKeys are required' }], isError: true };
    }
    let url = `${this.baseUrl}/api/measures/component?component=${encodeURIComponent(component)}&metricKeys=${encodeURIComponent(metricKeys)}`;
    if (args.branch) url += `&branch=${encodeURIComponent(args.branch as string)}`;

    const response = await this.fetchWithRetry(url, { method: 'GET', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to get project measures: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listIssues(args: Record<string, unknown>): Promise<ToolResult> {
    const page = (args.page as number) ?? 1;
    const pageSize = (args.pageSize as number) ?? 100;
    let url = `${this.baseUrl}/api/issues/search?p=${page}&ps=${pageSize}`;
    if (args.componentKeys) url += `&componentKeys=${encodeURIComponent(args.componentKeys as string)}`;
    if (args.types) url += `&types=${encodeURIComponent(args.types as string)}`;
    if (args.severities) url += `&severities=${encodeURIComponent(args.severities as string)}`;
    if (args.statuses) url += `&statuses=${encodeURIComponent(args.statuses as string)}`;
    if (typeof args.resolved === 'boolean') url += `&resolved=${encodeURIComponent(String(args.resolved))}`;
    if (args.assignees) url += `&assignees=${encodeURIComponent(args.assignees as string)}`;
    if (args.branch) url += `&branch=${encodeURIComponent(args.branch as string)}`;

    const response = await this.fetchWithRetry(url, { method: 'GET', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to list issues: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getIssue(args: Record<string, unknown>): Promise<ToolResult> {
    const issueKey = args.issueKey as string;
    if (!issueKey) {
      return { content: [{ type: 'text', text: 'issueKey is required' }], isError: true };
    }
    // SonarQube returns issue details via issues/search with the issues parameter
    const url = `${this.baseUrl}/api/issues/search?issues=${encodeURIComponent(issueKey)}&additionalFields=_all`;
    const response = await this.fetchWithRetry(url, { method: 'GET', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to get issue: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listRules(args: Record<string, unknown>): Promise<ToolResult> {
    const page = (args.page as number) ?? 1;
    const pageSize = (args.pageSize as number) ?? 100;
    let url = `${this.baseUrl}/api/rules/search?p=${page}&ps=${pageSize}`;
    if (args.query) url += `&q=${encodeURIComponent(args.query as string)}`;
    if (args.languages) url += `&languages=${encodeURIComponent(args.languages as string)}`;
    if (args.types) url += `&types=${encodeURIComponent(args.types as string)}`;
    if (args.severities) url += `&severities=${encodeURIComponent(args.severities as string)}`;

    const response = await this.fetchWithRetry(url, { method: 'GET', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to list rules: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getRule(args: Record<string, unknown>): Promise<ToolResult> {
    const ruleKey = args.ruleKey as string;
    if (!ruleKey) {
      return { content: [{ type: 'text', text: 'ruleKey is required' }], isError: true };
    }
    const url = `${this.baseUrl}/api/rules/show?key=${encodeURIComponent(ruleKey)}`;
    const response = await this.fetchWithRetry(url, { method: 'GET', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to get rule: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listQualityGates(): Promise<ToolResult> {
    const url = `${this.baseUrl}/api/qualitygates/list`;
    const response = await this.fetchWithRetry(url, { method: 'GET', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to list quality gates: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getQualityGateStatus(args: Record<string, unknown>): Promise<ToolResult> {
    const projectKey = args.projectKey as string;
    if (!projectKey) {
      return { content: [{ type: 'text', text: 'projectKey is required' }], isError: true };
    }
    let url = `${this.baseUrl}/api/qualitygates/project_status?projectKey=${encodeURIComponent(projectKey)}`;
    if (args.branch) url += `&branch=${encodeURIComponent(args.branch as string)}`;

    const response = await this.fetchWithRetry(url, { method: 'GET', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to get quality gate status: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async searchHotspots(args: Record<string, unknown>): Promise<ToolResult> {
    const projectKey = args.projectKey as string;
    if (!projectKey) {
      return { content: [{ type: 'text', text: 'projectKey is required' }], isError: true };
    }
    const page = (args.page as number) ?? 1;
    const pageSize = (args.pageSize as number) ?? 100;
    let url = `${this.baseUrl}/api/hotspots/search?projectKey=${encodeURIComponent(projectKey)}&p=${page}&ps=${pageSize}`;
    if (args.status) url += `&status=${encodeURIComponent(args.status as string)}`;
    if (args.resolution) url += `&resolution=${encodeURIComponent(args.resolution as string)}`;
    if (args.branch) url += `&branch=${encodeURIComponent(args.branch as string)}`;

    const response = await this.fetchWithRetry(url, { method: 'GET', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to search hotspots: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getHotspot(args: Record<string, unknown>): Promise<ToolResult> {
    const hotspotKey = args.hotspotKey as string;
    if (!hotspotKey) {
      return { content: [{ type: 'text', text: 'hotspotKey is required' }], isError: true };
    }
    const url = `${this.baseUrl}/api/hotspots/show?hotspot=${encodeURIComponent(hotspotKey)}`;
    const response = await this.fetchWithRetry(url, { method: 'GET', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to get hotspot: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listBranches(args: Record<string, unknown>): Promise<ToolResult> {
    const project = args.project as string;
    if (!project) {
      return { content: [{ type: 'text', text: 'project is required' }], isError: true };
    }
    const url = `${this.baseUrl}/api/project_branches/list?project=${encodeURIComponent(project)}`;
    const response = await this.fetchWithRetry(url, { method: 'GET', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to list branches: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listMetrics(args: Record<string, unknown>): Promise<ToolResult> {
    const page = (args.page as number) ?? 1;
    const pageSize = (args.pageSize as number) ?? 100;
    const url = `${this.baseUrl}/api/metrics/search?p=${page}&ps=${pageSize}`;
    const response = await this.fetchWithRetry(url, { method: 'GET', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to list metrics: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getSystemHealth(): Promise<ToolResult> {
    const url = `${this.baseUrl}/api/system/health`;
    const response = await this.fetchWithRetry(url, { method: 'GET', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to get system health: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getSystemInfo(): Promise<ToolResult> {
    const url = `${this.baseUrl}/api/system/info`;
    const response = await this.fetchWithRetry(url, { method: 'GET', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to get system info: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }
}

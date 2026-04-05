/**
 * mabl MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://help.mabl.com/hc/en-us/articles/47299375773844-mabl-MCP-overview
//   Published by mablhq via @mablhq/mabl-cli npm package (run: npx @mablhq/mabl-cli@latest mcp start).
//   Transport: stdio. Auth: OAuth login via mabl CLI (mabl auth login).
//   Actively maintained as of 2026-03 (cloud + local server options; released July 2025, expanded since).
//   Cloud MCP tools (8): analyze_failure, assign_xray_to_mabl_test, get_applications, get_credentials,
//     get_latest_test_runs, get_mabl_deployment, get_mabl_test_details, get_mabl_tests
//   Local MCP tools (+6 more, 14 total): create_mabl_test_cloud, create_mabl_test_from_plan,
//     get_plan_run_result, get_plans, run_mabl_test_local, switch_workspace
// Our adapter covers: 13 tools (plans, deployments, results, executions, environments, applications, labels).
// Vendor MCP covers: 14 tools (test creation, local execution, failure analysis — not available via REST).
//
// Integration: use-both
//   MCP-sourced tools (6 unique): analyze_failure, assign_xray_to_mabl_test, get_credentials,
//     get_mabl_test_details, get_mabl_tests, create_mabl_test_cloud, create_mabl_test_from_plan,
//     run_mabl_test_local
//   REST-sourced tools (13, our adapter): list_plans, get_plan, list_environments, get_environment,
//     create_environment, list_applications, get_application, trigger_deployment, get_deployment_result,
//     list_executions, get_execution, list_labels, get_workspace
//   Shared (partial overlap): get_applications/list_applications, get_plans/list_plans,
//     get_mabl_deployment/get_deployment_result — REST adapter is authoritative for CRUD/write ops.
//   The vendor MCP has unique tools (test creation, local execution, AI failure analysis) not available
//   via REST. The REST adapter has unique tools (create_environment, trigger_deployment, list_executions,
//   get_execution, list_labels, get_workspace) not covered by the MCP. Full coverage requires both.
//
// Base URL: https://api.mabl.com
// Auth: Basic auth with literal string "key" as username and API key as password
// Docs: https://help.mabl.com/hc/en-us/articles/32148379464340-mabl-API-overview
// Rate limits: Not publicly documented; workspace-scoped per API key tier.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface MablConfig {
  apiKey: string;
  baseUrl?: string;
}

export class MablMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: MablConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.mabl.com';
  }

  static catalog() {
    return {
      name: 'mabl',
      displayName: 'mabl',
      version: '1.0.0',
      category: 'devops',
      keywords: [
        'mabl', 'test automation', 'ai testing', 'end to end testing', 'e2e',
        'ci cd', 'deployment', 'test plan', 'test execution', 'test result',
        'environment', 'application', 'regression', 'browser testing', 'quality',
      ],
      toolNames: [
        'list_plans', 'get_plan',
        'list_environments', 'get_environment', 'create_environment',
        'list_applications', 'get_application',
        'trigger_deployment', 'get_deployment_result',
        'list_executions', 'get_execution',
        'list_labels', 'get_workspace',
      ],
      description: 'mabl AI test automation: trigger deployments, retrieve test execution results, manage plans, environments, and applications via the mabl REST API.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_plans',
        description: 'List mabl test plans in the workspace with optional filters for environment and application',
        inputSchema: {
          type: 'object',
          properties: {
            environment_id: {
              type: 'string',
              description: 'Filter plans associated with a specific environment ID',
            },
            application_id: {
              type: 'string',
              description: 'Filter plans associated with a specific application ID',
            },
          },
        },
      },
      {
        name: 'get_plan',
        description: 'Get details of a single mabl test plan by plan ID including test configuration and schedule',
        inputSchema: {
          type: 'object',
          properties: {
            plan_id: {
              type: 'string',
              description: 'mabl plan ID',
            },
          },
          required: ['plan_id'],
        },
      },
      {
        name: 'list_environments',
        description: 'List all test environments defined in the mabl workspace with URL and configuration details',
        inputSchema: {
          type: 'object',
          properties: {
            application_id: {
              type: 'string',
              description: 'Filter environments linked to a specific application ID',
            },
          },
        },
      },
      {
        name: 'get_environment',
        description: 'Get details of a single mabl test environment by environment ID including base URL',
        inputSchema: {
          type: 'object',
          properties: {
            environment_id: {
              type: 'string',
              description: 'mabl environment ID',
            },
          },
          required: ['environment_id'],
        },
      },
      {
        name: 'create_environment',
        description: 'Create a new test environment in mabl with a name and base URL',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Display name for the new environment (e.g. "Staging", "QA")',
            },
            url: {
              type: 'string',
              description: 'Base URL of the environment under test (e.g. "https://staging.example.com")',
            },
            application_id: {
              type: 'string',
              description: 'Application ID to associate this environment with',
            },
          },
          required: ['name', 'url'],
        },
      },
      {
        name: 'list_applications',
        description: 'List mabl applications (the products/services being tested) in the workspace',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_application',
        description: 'Get details of a single mabl application by application ID',
        inputSchema: {
          type: 'object',
          properties: {
            application_id: {
              type: 'string',
              description: 'mabl application ID',
            },
          },
          required: ['application_id'],
        },
      },
      {
        name: 'trigger_deployment',
        description: 'Trigger a mabl deployment event to run test plans matching the given application or environment criteria',
        inputSchema: {
          type: 'object',
          properties: {
            application_id: {
              type: 'string',
              description: 'Run tests for this application ID (at least one of application_id or environment_id is required)',
            },
            environment_id: {
              type: 'string',
              description: 'Run tests for this environment ID (at least one of application_id or environment_id is required)',
            },
            plan_labels: {
              type: 'array',
              description: 'Array of label strings to filter which plans execute (e.g. ["smoke", "regression"])',
            },
            revision: {
              type: 'string',
              description: 'Git revision or deploy version being tested (for traceability)',
            },
            preview: {
              type: 'boolean',
              description: 'If true, preview which plans would run without actually executing (default: false)',
            },
          },
        },
      },
      {
        name: 'get_deployment_result',
        description: 'Get the test result summary for a deployment event — shows pass/fail counts and status for all triggered plans',
        inputSchema: {
          type: 'object',
          properties: {
            event_id: {
              type: 'string',
              description: 'Deployment event ID returned by trigger_deployment',
            },
          },
          required: ['event_id'],
        },
      },
      {
        name: 'list_executions',
        description: 'List recent test plan executions with optional filters for plan, environment, and result status',
        inputSchema: {
          type: 'object',
          properties: {
            plan_id: {
              type: 'string',
              description: 'Filter executions for a specific plan ID',
            },
            environment_id: {
              type: 'string',
              description: 'Filter executions for a specific environment ID',
            },
            status: {
              type: 'string',
              description: 'Filter by result status: passed, failed, skipped (default: all)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of executions to return (default: 25)',
            },
          },
        },
      },
      {
        name: 'get_execution',
        description: 'Get detailed results for a single test plan execution including individual test outcomes',
        inputSchema: {
          type: 'object',
          properties: {
            plan_run_id: {
              type: 'string',
              description: 'mabl plan run ID to retrieve execution details for',
            },
          },
          required: ['plan_run_id'],
        },
      },
      {
        name: 'list_labels',
        description: 'List all labels defined in the mabl workspace used for organizing and filtering test plans',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_workspace',
        description: 'Get current workspace information including organization name, plan tier, and usage statistics',
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
        case 'list_plans':
          return this.listPlans(args);
        case 'get_plan':
          return this.getPlan(args);
        case 'list_environments':
          return this.listEnvironments(args);
        case 'get_environment':
          return this.getEnvironment(args);
        case 'create_environment':
          return this.createEnvironment(args);
        case 'list_applications':
          return this.listApplications();
        case 'get_application':
          return this.getApplication(args);
        case 'trigger_deployment':
          return this.triggerDeployment(args);
        case 'get_deployment_result':
          return this.getDeploymentResult(args);
        case 'list_executions':
          return this.listExecutions(args);
        case 'get_execution':
          return this.getExecution(args);
        case 'list_labels':
          return this.listLabels();
        case 'get_workspace':
          return this.getWorkspace();
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
    // mabl uses Basic auth with "key" as username and the API key as password
    const encoded = btoa(`key:${this.apiKey}`);
    return {
      Authorization: `Basic ${encoded}`,
      'Content-Type': 'application/json',
    };
  }

  private async apiGet(path: string, params: Record<string, string> = {}): Promise<ToolResult> {
    const qs = new URLSearchParams(params).toString();
    const url = `${this.baseUrl}/${path}${qs ? '?' + qs : ''}`;
    const response = await this.fetchWithRetry(url, { method: 'GET', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apiPost(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const url = `${this.baseUrl}/${path}`;
    const response = await this.fetchWithRetry(url, { method: 'POST', headers: this.headers, body: JSON.stringify(body) });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listPlans(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (args.environment_id) params['environment_id'] = args.environment_id as string;
    if (args.application_id) params['application_id'] = args.application_id as string;
    return this.apiGet('schedule/runpolicies/v1', params);
  }

  private async getPlan(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.plan_id) return { content: [{ type: 'text', text: 'plan_id is required' }], isError: true };
    return this.apiGet(`schedule/runpolicies/v1/${encodeURIComponent(args.plan_id as string)}`);
  }

  private async listEnvironments(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (args.application_id) params['application_id'] = args.application_id as string;
    return this.apiGet('environments/v1', params);
  }

  private async getEnvironment(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.environment_id) return { content: [{ type: 'text', text: 'environment_id is required' }], isError: true };
    return this.apiGet(`environments/v1/${encodeURIComponent(args.environment_id as string)}`);
  }

  private async createEnvironment(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name || !args.url) return { content: [{ type: 'text', text: 'name and url are required' }], isError: true };
    const body: Record<string, unknown> = {
      name: args.name,
      url: args.url,
    };
    if (args.application_id) body['application_id'] = args.application_id;
    return this.apiPost('environments/v1', body);
  }

  private async listApplications(): Promise<ToolResult> {
    return this.apiGet('applications/v1');
  }

  private async getApplication(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.application_id) return { content: [{ type: 'text', text: 'application_id is required' }], isError: true };
    return this.apiGet(`applications/v1/${encodeURIComponent(args.application_id as string)}`);
  }

  private async triggerDeployment(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.application_id && !args.environment_id) {
      return { content: [{ type: 'text', text: 'At least one of application_id or environment_id is required' }], isError: true };
    }
    const body: Record<string, unknown> = {};
    if (args.application_id) body['application_id'] = args.application_id;
    if (args.environment_id) body['environment_id'] = args.environment_id;
    if (args.plan_labels) body['plan_labels'] = args.plan_labels;
    if (args.revision) body['revision'] = args.revision;

    const preview = args.preview === true;
    const path = preview ? 'events/deployment?preview=true' : 'events/deployment';
    return this.apiPost(path, body);
  }

  private async getDeploymentResult(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.event_id) return { content: [{ type: 'text', text: 'event_id is required' }], isError: true };
    return this.apiGet(`execution/result/event/${encodeURIComponent(args.event_id as string)}`);
  }

  private async listExecutions(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      limit: String((args.limit as number) ?? 25),
    };
    if (args.plan_id) params['plan_id'] = args.plan_id as string;
    if (args.environment_id) params['environment_id'] = args.environment_id as string;
    if (args.status) params['status'] = args.status as string;
    return this.apiGet('execution/plan/result/v7', params);
  }

  private async getExecution(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.plan_run_id) return { content: [{ type: 'text', text: 'plan_run_id is required' }], isError: true };
    return this.apiGet(`execution/plan/result/v7/${encodeURIComponent(args.plan_run_id as string)}`);
  }

  private async listLabels(): Promise<ToolResult> {
    return this.apiGet('labels/v1');
  }

  private async getWorkspace(): Promise<ToolResult> {
    return this.apiGet('workspace/v1');
  }

}

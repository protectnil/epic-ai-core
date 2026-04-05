/**
 * Microcks MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// No official Microcks MCP server was found on GitHub.
// Our adapter covers: 12 tools (services, tests, jobs, secrets, metrics, artifacts).
//
// Base URL: https://microcks.example.com/api (configurable — self-hosted)
// Auth: JWT Bearer token (Keycloak-issued). Pass as "Authorization: Bearer <token>".
// Docs: https://microcks.io/documentation/ — https://github.com/microcks/microcks
// Rate limits: None specified — self-hosted, resource-bounded per deployment.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface MicrocksConfig {
  baseUrl: string;
  bearerToken: string;
}

export class MicrocksMCPServer extends MCPAdapterBase {
  private readonly baseUrl: string;
  private readonly bearerToken: string;

  constructor(config: MicrocksConfig) {
    super();
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.bearerToken = config.bearerToken;
  }

  static catalog() {
    return {
      name: 'microcks',
      displayName: 'Microcks',
      version: '1.0.0',
      category: 'devops',
      keywords: [
        'microcks', 'mock', 'api-testing', 'contract-testing', 'service-virtualization',
        'openapi', 'swagger', 'kubernetes', 'devops', 'microservices', 'test',
        'conformance', 'grpc', 'graphql', 'async', 'artifact',
      ],
      toolNames: [
        'list_services', 'get_service', 'search_services',
        'list_tests', 'get_test', 'create_test',
        'list_import_jobs', 'create_import_job',
        'list_secrets', 'get_secret',
        'get_invocation_stats', 'get_conformance_metrics',
      ],
      description: 'Microcks API mocking and contract testing platform — manage service mocks, run conformance tests, configure import jobs, and retrieve invocation and conformance metrics.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_services',
        description: 'List all mocked APIs and services registered in Microcks — returns service names, versions, and types',
        inputSchema: {
          type: 'object',
          properties: {
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 0)',
            },
            size: {
              type: 'number',
              description: 'Number of results per page (default: 20)',
            },
          },
        },
      },
      {
        name: 'get_service',
        description: 'Get full details of a specific mocked service by its ID — returns operations, mock URLs, and metadata',
        inputSchema: {
          type: 'object',
          properties: {
            service_id: {
              type: 'string',
              description: 'Service ID (UUID or name:version string, e.g. "Petstore API:1.0")',
            },
          },
          required: ['service_id'],
        },
      },
      {
        name: 'search_services',
        description: 'Search for mocked services and APIs by name or label — returns matching service IDs and versions',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search term to match against service names and labels',
            },
            page: {
              type: 'number',
              description: 'Page number (default: 0)',
            },
            size: {
              type: 'number',
              description: 'Results per page (default: 20)',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'list_tests',
        description: 'List test results for a specific service — returns test IDs, status (SUCCESS/FAILURE), and run timestamps',
        inputSchema: {
          type: 'object',
          properties: {
            service_id: {
              type: 'string',
              description: 'Service ID to retrieve test results for',
            },
            page: {
              type: 'number',
              description: 'Page number (default: 0)',
            },
            size: {
              type: 'number',
              description: 'Results per page (default: 20)',
            },
          },
          required: ['service_id'],
        },
      },
      {
        name: 'get_test',
        description: 'Get full details of a specific test result by ID — includes per-operation results and request/response messages',
        inputSchema: {
          type: 'object',
          properties: {
            test_id: {
              type: 'string',
              description: 'Test result ID to retrieve',
            },
          },
          required: ['test_id'],
        },
      },
      {
        name: 'create_test',
        description: 'Trigger a new conformance test against a service endpoint — validates the endpoint response against Microcks mock expectations',
        inputSchema: {
          type: 'object',
          properties: {
            service_id: {
              type: 'string',
              description: 'Service ID to test (e.g. "Petstore API:1.0")',
            },
            test_endpoint: {
              type: 'string',
              description: 'URL of the actual API endpoint to test (e.g. https://api.example.com/v1)',
            },
            runner_type: {
              type: 'string',
              description: 'Test runner: HTTP, SOAP_HTTP, OPEN_API_SCHEMA, GRPC_PROTOBUF, GRAPHQL, ASYNC_API_SCHEMA (default: HTTP)',
            },
            timeout: {
              type: 'number',
              description: 'Timeout in milliseconds before test is marked failed (default: 10000)',
            },
          },
          required: ['service_id', 'test_endpoint'],
        },
      },
      {
        name: 'list_import_jobs',
        description: 'List all import jobs configured in Microcks — shows job names, repository URLs, status, and schedule',
        inputSchema: {
          type: 'object',
          properties: {
            page: {
              type: 'number',
              description: 'Page number (default: 0)',
            },
            size: {
              type: 'number',
              description: 'Results per page (default: 20)',
            },
          },
        },
      },
      {
        name: 'create_import_job',
        description: 'Create a new import job to periodically fetch and import API artifacts (OpenAPI, AsyncAPI, Postman) from a repository URL',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Display name for this import job',
            },
            repository_url: {
              type: 'string',
              description: 'URL of the artifact to import (GitHub raw URL, HTTP endpoint, etc.)',
            },
            main_artifact: {
              type: 'boolean',
              description: 'Whether this artifact is the primary/main artifact (true) or secondary (false, default: true)',
            },
          },
          required: ['name', 'repository_url'],
        },
      },
      {
        name: 'list_secrets',
        description: 'List all configured secrets in Microcks — returns secret names and IDs (values are not exposed)',
        inputSchema: {
          type: 'object',
          properties: {
            page: {
              type: 'number',
              description: 'Page number (default: 0)',
            },
            size: {
              type: 'number',
              description: 'Results per page (default: 20)',
            },
          },
        },
      },
      {
        name: 'get_secret',
        description: 'Get metadata for a specific secret by ID — returns name and description (not the secret value)',
        inputSchema: {
          type: 'object',
          properties: {
            secret_id: {
              type: 'string',
              description: 'Secret ID to retrieve',
            },
          },
          required: ['secret_id'],
        },
      },
      {
        name: 'get_invocation_stats',
        description: 'Get invocation statistics for a specific service — returns daily call counts, top operations, and usage trends',
        inputSchema: {
          type: 'object',
          properties: {
            service_name: {
              type: 'string',
              description: 'Service name (e.g. "Petstore API")',
            },
            service_version: {
              type: 'string',
              description: 'Service version (e.g. "1.0")',
            },
            day: {
              type: 'string',
              description: 'Date in yyyyMMdd format for daily stats (e.g. "20260328"). Omit for latest.',
            },
          },
          required: ['service_name', 'service_version'],
        },
      },
      {
        name: 'get_conformance_metrics',
        description: 'Get conformance test metrics for a service — returns pass/fail rates, coverage score, and trend over time',
        inputSchema: {
          type: 'object',
          properties: {
            service_id: {
              type: 'string',
              description: 'Service ID to retrieve conformance metrics for',
            },
          },
          required: ['service_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_services':
          return this.listServices(args);
        case 'get_service':
          return this.getService(args);
        case 'search_services':
          return this.searchServices(args);
        case 'list_tests':
          return this.listTests(args);
        case 'get_test':
          return this.getTest(args);
        case 'create_test':
          return this.createTest(args);
        case 'list_import_jobs':
          return this.listImportJobs(args);
        case 'create_import_job':
          return this.createImportJob(args);
        case 'list_secrets':
          return this.listSecrets(args);
        case 'get_secret':
          return this.getSecret(args);
        case 'get_invocation_stats':
          return this.getInvocationStats(args);
        case 'get_conformance_metrics':
          return this.getConformanceMetrics(args);
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

  private async apiFetch(path: string, method = 'GET', body?: unknown): Promise<ToolResult> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.bearerToken}`,
      'Content-Type': 'application/json',
    };
    const options: RequestInit = { method, headers };
    if (body !== undefined) options.body = JSON.stringify(body);
    const response = await this.fetchWithRetry(url, options);
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Microcks returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private buildQs(params: Record<string, unknown>): string {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null) qs.set(k, String(v));
    }
    const s = qs.toString();
    return s ? `?${s}` : '';
  }

  private async listServices(args: Record<string, unknown>): Promise<ToolResult> {
    const qs = this.buildQs({ page: args.page, size: args.size });
    return this.apiFetch(`/services${qs}`);
  }

  private async getService(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.service_id) return { content: [{ type: 'text', text: 'service_id is required' }], isError: true };
    return this.apiFetch(`/services/${encodeURIComponent(args.service_id as string)}`);
  }

  private async searchServices(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.query) return { content: [{ type: 'text', text: 'query is required' }], isError: true };
    const qs = this.buildQs({ q: args.query, page: args.page, size: args.size });
    return this.apiFetch(`/services/search${qs}`);
  }

  private async listTests(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.service_id) return { content: [{ type: 'text', text: 'service_id is required' }], isError: true };
    const qs = this.buildQs({ page: args.page, size: args.size });
    return this.apiFetch(`/tests/service/${encodeURIComponent(args.service_id as string)}${qs}`);
  }

  private async getTest(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.test_id) return { content: [{ type: 'text', text: 'test_id is required' }], isError: true };
    return this.apiFetch(`/tests/${encodeURIComponent(args.test_id as string)}`);
  }

  private async createTest(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.service_id) return { content: [{ type: 'text', text: 'service_id is required' }], isError: true };
    if (!args.test_endpoint) return { content: [{ type: 'text', text: 'test_endpoint is required' }], isError: true };
    const body: Record<string, unknown> = {
      serviceId: args.service_id,
      testEndpoint: args.test_endpoint,
      runnerType: (args.runner_type as string) ?? 'HTTP',
      timeout: (args.timeout as number) ?? 10000,
    };
    return this.apiFetch('/tests', 'POST', body);
  }

  private async listImportJobs(args: Record<string, unknown>): Promise<ToolResult> {
    const qs = this.buildQs({ page: args.page, size: args.size });
    return this.apiFetch(`/jobs${qs}`);
  }

  private async createImportJob(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name) return { content: [{ type: 'text', text: 'name is required' }], isError: true };
    if (!args.repository_url) return { content: [{ type: 'text', text: 'repository_url is required' }], isError: true };
    const body: Record<string, unknown> = {
      name: args.name,
      repositoryUrl: args.repository_url,
      mainArtifact: (args.main_artifact as boolean) ?? true,
    };
    return this.apiFetch('/jobs', 'POST', body);
  }

  private async listSecrets(args: Record<string, unknown>): Promise<ToolResult> {
    const qs = this.buildQs({ page: args.page, size: args.size });
    return this.apiFetch(`/secrets${qs}`);
  }

  private async getSecret(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.secret_id) return { content: [{ type: 'text', text: 'secret_id is required' }], isError: true };
    return this.apiFetch(`/secrets/${encodeURIComponent(args.secret_id as string)}`);
  }

  private async getInvocationStats(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.service_name) return { content: [{ type: 'text', text: 'service_name is required' }], isError: true };
    if (!args.service_version) return { content: [{ type: 'text', text: 'service_version is required' }], isError: true };
    const qs = args.day ? this.buildQs({ day: args.day }) : '';
    return this.apiFetch(`/metrics/invocations/${encodeURIComponent(args.service_name as string)}/${encodeURIComponent(args.service_version as string)}${qs}`);
  }

  private async getConformanceMetrics(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.service_id) return { content: [{ type: 'text', text: 'service_id is required' }], isError: true };
    return this.apiFetch(`/metrics/conformance/service/${encodeURIComponent(args.service_id as string)}`);
  }
}

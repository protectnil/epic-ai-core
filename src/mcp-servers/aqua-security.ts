/**
 * Aqua Security MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/aquasecurity/trivy-mcp — transport: stdio + streamable-HTTP, auth: none (wraps local CLI)
// The official trivy-mcp wraps the Trivy open-source CLI scanner. It is actively maintained (last commit Dec 17, 2025).
// trivy-mcp exposes 6 tools for LOCAL/CI scanning only: scan_filesystem, scan_image, scan_repository,
// findings_list, findings_get, trivy_version. It has NO tools for SaaS platform management.
// This REST adapter covers 13 SaaS platform tools (images, containers, policies, registries, functions, risk).
// Zero overlap between trivy-mcp tools and this adapter's tools — each side is entirely non-overlapping.
//
// Integration: use-both
// MCP-sourced tools (6): scan_filesystem, scan_image, scan_repository, findings_list, findings_get, trivy_version
// REST-sourced tools (13): list_images, get_image, get_image_vulnerabilities, get_image_sensitive_data,
//   search_vulnerabilities, list_running_containers, list_image_assurance_policies,
//   get_image_assurance_policy, list_runtime_policies, get_risk_explorer,
//   list_registries, get_registry, list_functions
// Combined coverage: 19 tools (MCP: 6 + REST: 13 — shared: 0)
//
// Base URL: https://api.cloudsploit.com (US default)
//   EU-1: https://eu-1.api.cloudsploit.com
//   Asia-1: https://asia-1.api.cloudsploit.com
//   Pass regional URL via baseUrl config.
// Auth: Two-step token exchange. POST /v2/tokens with API key ID + secret → short-lived Bearer token (240 min).
//   Generate API keys: Aqua Console > Account Management > Settings > API Keys.
//   Docs: docs.aqua-cloud.io/documentation/automation/rest-api
// Rate limits: Not publicly documented. Token is valid 240 minutes; adapter refreshes 10 min before expiry.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface AquaSecurityConfig {
  aquaKey: string;
  aquaSecret: string;
  baseUrl?: string;
}

export class AquaSecurityMCPServer extends MCPAdapterBase {
  private readonly aquaKey: string;
  private readonly aquaSecret: string;
  private readonly baseUrl: string;
  private cachedToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(config: AquaSecurityConfig) {
    super();
    this.aquaKey = config.aquaKey;
    this.aquaSecret = config.aquaSecret;
    this.baseUrl = config.baseUrl || 'https://api.cloudsploit.com';
  }

  private async getToken(): Promise<string> {
    if (this.cachedToken && Date.now() < this.tokenExpiry) {
      return this.cachedToken;
    }

    const response = await this.fetchWithRetry(`${this.baseUrl}/v2/tokens`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: this.aquaKey,
        password: this.aquaSecret,
        validity: 240,
        allowed_endpoints: ['ANY'],
        csp_roles: [],
      }),
    });

    if (!response.ok) {
      throw new Error(`Aqua token request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as { data?: { token?: string } };
    const token = data?.data?.token;
    if (!token) {
      throw new Error('Aqua Security token response did not contain a token');
    }

    this.cachedToken = token;
    // Refresh 10 minutes before expiry (token valid 240 min)
    this.tokenExpiry = Date.now() + (240 - 10) * 60 * 1000;
    return token;
  }

  private async request(path: string, method: string = 'GET', body?: unknown): Promise<ToolResult> {
    const token = await this.getToken();

    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return {
        content: [{ type: 'text', text: `Aqua Security API error ${response.status}: ${errText}` }],
        isError: true,
      };
    }

    const data = await response.json();
    const text = JSON.stringify(data, null, 2);
    const truncated = text.length > 10_000
      ? text.slice(0, 10_000) + `\n... [truncated, ${text.length} total chars]`
      : text;

    return {
      content: [{ type: 'text', text: truncated }],
      isError: false,
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_images',
        description: 'List container images scanned by Aqua Security with vulnerability counts, compliance status, and registry details.',
        inputSchema: {
          type: 'object',
          properties: {
            registry: {
              type: 'string',
              description: 'Filter by registry name (e.g. docker.io, gcr.io)',
            },
            repository: {
              type: 'string',
              description: 'Filter by repository name',
            },
            scan_status: {
              type: 'string',
              description: 'Filter by scan status: scanned, failed, pending',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            pagesize: {
              type: 'number',
              description: 'Number of images per page (default: 50)',
            },
          },
        },
      },
      {
        name: 'get_image',
        description: 'Get detailed scan results and metadata for a specific container image by registry and image name.',
        inputSchema: {
          type: 'object',
          properties: {
            registry: {
              type: 'string',
              description: 'Registry name containing the image (e.g. docker.io)',
            },
            image_name: {
              type: 'string',
              description: 'Full image name including tag (e.g. nginx:latest)',
            },
          },
          required: ['registry', 'image_name'],
        },
      },
      {
        name: 'get_image_vulnerabilities',
        description: 'Get detailed CVE vulnerability findings for a specific container image, including severity, CVSS score, affected package, and fix version.',
        inputSchema: {
          type: 'object',
          properties: {
            registry: {
              type: 'string',
              description: 'Registry name containing the image (e.g. docker.io)',
            },
            image_name: {
              type: 'string',
              description: 'Full image name including tag (e.g. nginx:latest)',
            },
          },
          required: ['registry', 'image_name'],
        },
      },
      {
        name: 'get_image_sensitive_data',
        description: 'Get sensitive data findings (secrets, credentials, PII) detected in a container image during scanning.',
        inputSchema: {
          type: 'object',
          properties: {
            registry: {
              type: 'string',
              description: 'Registry name',
            },
            image_name: {
              type: 'string',
              description: 'Full image name including tag',
            },
          },
          required: ['registry', 'image_name'],
        },
      },
      {
        name: 'search_vulnerabilities',
        description: 'Search across all scanned resources for vulnerabilities by CVE ID, severity, or fix availability.',
        inputSchema: {
          type: 'object',
          properties: {
            cve_id: {
              type: 'string',
              description: 'Filter by CVE identifier (e.g. CVE-2021-44228)',
            },
            severity: {
              type: 'string',
              description: 'Filter by severity: critical, high, medium, low, negligible',
            },
            fix_available: {
              type: 'boolean',
              description: 'If true, return only vulnerabilities with a known fix',
            },
            resource_type: {
              type: 'string',
              description: 'Filter by resource type: image, function, container',
            },
            page: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
            pagesize: {
              type: 'number',
              description: 'Results per page (default: 50)',
            },
          },
        },
      },
      {
        name: 'list_running_containers',
        description: 'List containers currently running in the environment and monitored by Aqua runtime protection, with risk scores.',
        inputSchema: {
          type: 'object',
          properties: {
            page: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
            pagesize: {
              type: 'number',
              description: 'Results per page (default: 50)',
            },
            status: {
              type: 'string',
              description: 'Filter by container status: running, stopped',
            },
            image_name: {
              type: 'string',
              description: 'Filter by image name',
            },
          },
        },
      },
      {
        name: 'list_image_assurance_policies',
        description: 'List image assurance policies that define pass/fail scan criteria for container images, including their controls and scope.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_image_assurance_policy',
        description: 'Get the full definition of a specific image assurance policy by name, including all configured controls and thresholds.',
        inputSchema: {
          type: 'object',
          properties: {
            policy_name: {
              type: 'string',
              description: 'Name of the image assurance policy to retrieve',
            },
          },
          required: ['policy_name'],
        },
      },
      {
        name: 'list_runtime_policies',
        description: 'List runtime security policies that govern container behavior, including enforcement mode (audit/enforce) and blocked activities.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_risk_explorer',
        description: 'Retrieve an aggregated risk summary for the Aqua-monitored environment covering vulnerability, misconfiguration, and runtime risk scores.',
        inputSchema: {
          type: 'object',
          properties: {
            scope: {
              type: 'string',
              description: 'Scope: all, images, containers, functions (default: all)',
            },
          },
        },
      },
      {
        name: 'list_registries',
        description: 'List container registries integrated with Aqua Security for automated scanning, including registry type and connection status.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_registry',
        description: 'Get details for a specific container registry integration by name, including URL, auth type, and scan schedule.',
        inputSchema: {
          type: 'object',
          properties: {
            registry_name: {
              type: 'string',
              description: 'Name of the registry to retrieve',
            },
          },
          required: ['registry_name'],
        },
      },
      {
        name: 'list_functions',
        description: 'List serverless functions scanned by Aqua Security with vulnerability counts and compliance status.',
        inputSchema: {
          type: 'object',
          properties: {
            provider: {
              type: 'string',
              description: 'Cloud provider filter: aws, azure, gcp',
            },
            page: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
            pagesize: {
              type: 'number',
              description: 'Results per page (default: 50)',
            },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_images':
          return await this.listImages(args);
        case 'get_image':
          return await this.getImage(args);
        case 'get_image_vulnerabilities':
          return await this.getImageVulnerabilities(args);
        case 'get_image_sensitive_data':
          return await this.getImageSensitiveData(args);
        case 'search_vulnerabilities':
          return await this.searchVulnerabilities(args);
        case 'list_running_containers':
          return await this.listRunningContainers(args);
        case 'list_image_assurance_policies':
          return await this.request('/v2/policies/assurance/image');
        case 'get_image_assurance_policy':
          return await this.getImageAssurancePolicy(args);
        case 'list_runtime_policies':
          return await this.request('/v2/policies/runtime/containers');
        case 'get_risk_explorer':
          return await this.getRiskExplorer(args);
        case 'list_registries':
          return await this.request('/v2/registries');
        case 'get_registry':
          return await this.getRegistry(args);
        case 'list_functions':
          return await this.listFunctions(args);
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

  private async listImages(args: Record<string, unknown>): Promise<ToolResult> {
    const page = (args.page as number) ?? 1;
    const pagesize = (args.pagesize as number) ?? 50;
    let path = `/v2/images?page=${page}&pagesize=${pagesize}`;
    if (args.registry) path += `&registry=${encodeURIComponent(args.registry as string)}`;
    if (args.repository) path += `&repository=${encodeURIComponent(args.repository as string)}`;
    if (args.scan_status) path += `&scan_status=${encodeURIComponent(args.scan_status as string)}`;
    return this.request(path);
  }

  private async getImage(args: Record<string, unknown>): Promise<ToolResult> {
    const registry = args.registry as string;
    const imageName = args.image_name as string;
    return this.request(`/v2/images/${encodeURIComponent(registry)}/${encodeURIComponent(imageName)}`);
  }

  private async getImageVulnerabilities(args: Record<string, unknown>): Promise<ToolResult> {
    const registry = args.registry as string;
    const imageName = args.image_name as string;
    return this.request(
      `/v2/images/${encodeURIComponent(registry)}/${encodeURIComponent(imageName)}/vulnerabilities`,
    );
  }

  private async getImageSensitiveData(args: Record<string, unknown>): Promise<ToolResult> {
    const registry = args.registry as string;
    const imageName = args.image_name as string;
    return this.request(
      `/v2/images/${encodeURIComponent(registry)}/${encodeURIComponent(imageName)}/sensitive`,
    );
  }

  private async searchVulnerabilities(args: Record<string, unknown>): Promise<ToolResult> {
    const page = (args.page as number) ?? 1;
    const pagesize = (args.pagesize as number) ?? 50;
    let path = `/v2/vulnerabilities?page=${page}&pagesize=${pagesize}`;
    if (args.cve_id) path += `&cve_id=${encodeURIComponent(args.cve_id as string)}`;
    if (args.severity) path += `&severity=${encodeURIComponent(args.severity as string)}`;
    if (typeof args.fix_available === 'boolean') path += `&fix_available=${encodeURIComponent(String(args.fix_available))}`;
    if (args.resource_type) path += `&resource_type=${encodeURIComponent(args.resource_type as string)}`;
    return this.request(path);
  }

  private async listRunningContainers(args: Record<string, unknown>): Promise<ToolResult> {
    const page = (args.page as number) ?? 1;
    const pagesize = (args.pagesize as number) ?? 50;
    let path = `/v2/containers?page=${page}&pagesize=${pagesize}`;
    if (args.status) path += `&status=${encodeURIComponent(args.status as string)}`;
    if (args.image_name) path += `&image_name=${encodeURIComponent(args.image_name as string)}`;
    return this.request(path);
  }

  private async getImageAssurancePolicy(args: Record<string, unknown>): Promise<ToolResult> {
    const policyName = args.policy_name as string;
    return this.request(`/v2/policies/assurance/image/${encodeURIComponent(policyName)}`);
  }

  private async getRiskExplorer(args: Record<string, unknown>): Promise<ToolResult> {
    const scope = (args.scope as string) || 'all';
    return this.request(`/v2/risks/explorer?scope=${encodeURIComponent(scope)}`);
  }

  private async getRegistry(args: Record<string, unknown>): Promise<ToolResult> {
    const registryName = args.registry_name as string;
    return this.request(`/v2/registries/${encodeURIComponent(registryName)}`);
  }

  private async listFunctions(args: Record<string, unknown>): Promise<ToolResult> {
    const page = (args.page as number) ?? 1;
    const pagesize = (args.pagesize as number) ?? 50;
    let path = `/v2/functions?page=${page}&pagesize=${pagesize}`;
    if (args.provider) path += `&provider=${encodeURIComponent(args.provider as string)}`;
    return this.request(path);
  }

  static catalog() {
    return {
      name: 'aqua-security',
      displayName: 'Aqua Security',
      version: '1.0.0',
      category: 'cybersecurity' as const,
      keywords: ['aqua', 'container', 'security', 'vulnerability', 'cve', 'scan', 'image', 'runtime', 'compliance', 'policy', 'registry', 'serverless', 'cspm'],
      toolNames: [
        'list_images', 'get_image', 'get_image_vulnerabilities', 'get_image_sensitive_data',
        'search_vulnerabilities', 'list_running_containers',
        'list_image_assurance_policies', 'get_image_assurance_policy',
        'list_runtime_policies', 'get_risk_explorer',
        'list_registries', 'get_registry', 'list_functions',
      ],
      description: 'Aqua Security platform: manage container image scans, vulnerability findings, runtime protection, assurance policies, and registries.',
      author: 'protectnil' as const,
    };
  }
}

/**
 * Anchore MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// No official Anchore MCP server was found on GitHub. The Anchore project (anchore-engine) is
// open-source container image analysis. The closest adjacent tool is syft-mcp / grype-mcp for
// local CLI scanning — those cover local filesystem/image analysis only and have no overlap
// with this adapter's enterprise API management surface.
//
// Base URL: http://anchore.local (self-hosted default; override via baseUrl config)
//   Anchore Engine is deployed on-premises or in Kubernetes. The API listens on port 8228 by default.
//   Example: http://your-anchore-engine-host:8228
// Auth: HTTP Basic (username + password). POST /oauth/token exchanges credentials for a JWT Bearer token.
//   Default admin credentials on fresh install: admin / foobar (must be changed on first deploy).
//   Docs: https://docs.anchore.com/current/docs/using/api_usage/
// Rate limits: Not publicly documented; determined by deployment capacity.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface AnchorConfig {
  username: string;
  password: string;
  baseUrl?: string;
}

export class AnchoreMCPServer extends MCPAdapterBase {
  private readonly username: string;
  private readonly password: string;
  private readonly baseUrl: string;
  private cachedToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(config: AnchorConfig) {
    super();
    this.username = config.username;
    this.password = config.password;
    this.baseUrl = (config.baseUrl || 'http://anchore.local').replace(/\/$/, '');
  }

  private get basicAuth(): string {
    return 'Basic ' + Buffer.from(`${this.username}:${this.password}`).toString('base64');
  }

  private async getToken(): Promise<string> {
    if (this.cachedToken && Date.now() < this.tokenExpiry) {
      return this.cachedToken;
    }

    const body = new URLSearchParams({
      grant_type: 'password',
      client_id: 'anonymous',
      username: this.username,
      password: this.password,
    });

    const response = await this.fetchWithRetry(`${this.baseUrl}/oauth/token`, {
      method: 'POST',
      headers: {
        Authorization: this.basicAuth,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    if (!response.ok) {
      // Fall back to basic auth — older Anchore deployments may not have OAuth enabled
      return '';
    }

    const data = await response.json() as { access_token?: string; expires_in?: number };
    const token = data?.access_token;
    if (!token) return '';

    this.cachedToken = token;
    // expires_in is in seconds; cache with 60s safety margin
    const ttl = ((data.expires_in ?? 3600) - 60) * 1000;
    this.tokenExpiry = Date.now() + ttl;
    return token;
  }

  private async authHeaders(): Promise<Record<string, string>> {
    const token = await this.getToken();
    return {
      Authorization: token ? `Bearer ${token}` : this.basicAuth,
      'Content-Type': 'application/json',
    };
  }

  private async request(path: string, method: string = 'GET', body?: unknown): Promise<ToolResult> {
    const headers = await this.authHeaders();
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return {
        content: [{ type: 'text', text: `Anchore API error ${response.status}: ${errText}` }],
        isError: true,
      };
    }

    const data = await response.json();
    return {
      content: [{ type: 'text', text: this.truncate(data) }],
      isError: false,
    };
  }

  get tools(): ToolDefinition[] {
    return [
      // --- Images ---
      {
        name: 'list_images',
        description: 'List all container images submitted to Anchore Engine for analysis, with digest, tags, and analysis status.',
        inputSchema: {
          type: 'object',
          properties: {
            tag: {
              type: 'string',
              description: 'Filter images by full tag (e.g. docker.io/library/nginx:latest)',
            },
            image_status: {
              type: 'string',
              description: 'Filter by image status: active, inactive',
            },
            analysis_status: {
              type: 'string',
              description: 'Filter by analysis status: not_analyzed, analyzing, analyzed, analysis_failed',
            },
          },
        },
      },
      {
        name: 'add_image',
        description: 'Submit a container image for analysis by Anchore Engine. Provide a full image reference (tag or digest).',
        inputSchema: {
          type: 'object',
          properties: {
            tag: {
              type: 'string',
              description: 'Full image reference including registry, repository, and tag (e.g. docker.io/library/nginx:latest)',
            },
            digest: {
              type: 'string',
              description: 'Image digest (sha256:...) — use instead of tag for immutable references',
            },
            force: {
              type: 'boolean',
              description: 'If true, re-analyze an already-analyzed image (default: false)',
            },
          },
        },
      },
      {
        name: 'get_image',
        description: 'Get metadata and analysis status for a specific image by its SHA256 digest.',
        inputSchema: {
          type: 'object',
          properties: {
            imageDigest: {
              type: 'string',
              description: 'SHA256 image digest (e.g. sha256:abc123...)',
            },
          },
          required: ['imageDigest'],
        },
      },
      {
        name: 'get_image_policy_check',
        description: 'Evaluate a container image against the active policy bundle and return a pass/fail result with gate details.',
        inputSchema: {
          type: 'object',
          properties: {
            imageDigest: {
              type: 'string',
              description: 'SHA256 image digest to evaluate',
            },
            tag: {
              type: 'string',
              description: 'Tag context to use for policy evaluation (required for tag-mapped policy bundles)',
            },
            policyId: {
              type: 'string',
              description: 'Specific policy bundle ID to evaluate against (defaults to active bundle)',
            },
          },
          required: ['imageDigest'],
        },
      },
      {
        name: 'get_image_vulnerabilities',
        description: 'Get vulnerability findings for an image by type. Returns CVE IDs, severity, affected package, and fix versions.',
        inputSchema: {
          type: 'object',
          properties: {
            imageDigest: {
              type: 'string',
              description: 'SHA256 image digest',
            },
            vtype: {
              type: 'string',
              description: 'Vulnerability type filter: all, os, non-os (default: all)',
            },
          },
          required: ['imageDigest'],
        },
      },
      {
        name: 'get_image_content',
        description: 'Get the content of an image by type: os, npm, gem, python, java, files, nuget, malware.',
        inputSchema: {
          type: 'object',
          properties: {
            imageDigest: {
              type: 'string',
              description: 'SHA256 image digest',
            },
            ctype: {
              type: 'string',
              description: 'Content type: os, npm, gem, python, java, files, nuget, malware',
            },
          },
          required: ['imageDigest', 'ctype'],
        },
      },
      {
        name: 'list_image_metadata',
        description: 'List available metadata types for an image (e.g. manifest, dockerfile).',
        inputSchema: {
          type: 'object',
          properties: {
            imageDigest: {
              type: 'string',
              description: 'SHA256 image digest',
            },
          },
          required: ['imageDigest'],
        },
      },
      {
        name: 'get_image_sbom_native',
        description: "Get the Software Bill of Materials (SBOM) for an image in Anchore's native format.",
        inputSchema: {
          type: 'object',
          properties: {
            imageDigest: {
              type: 'string',
              description: 'SHA256 image digest',
            },
          },
          required: ['imageDigest'],
        },
      },
      {
        name: 'list_image_secret_search_results',
        description: 'List secret/credential findings detected in an image by the analyzer (e.g. API keys, passwords in files).',
        inputSchema: {
          type: 'object',
          properties: {
            imageDigest: {
              type: 'string',
              description: 'SHA256 image digest',
            },
          },
          required: ['imageDigest'],
        },
      },
      // --- Policies ---
      {
        name: 'list_policies',
        description: 'List all policy bundles configured in Anchore Engine, including which is currently active.',
        inputSchema: {
          type: 'object',
          properties: {
            detail: {
              type: 'boolean',
              description: 'If true, include full policy bundle details (default: false)',
            },
          },
        },
      },
      {
        name: 'get_policy',
        description: 'Get the full details of a specific policy bundle by its ID.',
        inputSchema: {
          type: 'object',
          properties: {
            policyId: {
              type: 'string',
              description: 'Policy bundle ID',
            },
          },
          required: ['policyId'],
        },
      },
      // --- Registries ---
      {
        name: 'list_registries',
        description: 'List all container registries configured in Anchore Engine for image pulling.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_registry',
        description: 'Get configuration details for a specific registry by registry hostname.',
        inputSchema: {
          type: 'object',
          properties: {
            registry: {
              type: 'string',
              description: 'Registry hostname (e.g. docker.io, registry.example.com:5000)',
            },
          },
          required: ['registry'],
        },
      },
      // --- Subscriptions ---
      {
        name: 'list_subscriptions',
        description: 'List all subscriptions for Anchore event notifications (policy_eval, vuln_update, tag_update, etc.).',
        inputSchema: {
          type: 'object',
          properties: {
            subscription_type: {
              type: 'string',
              description: 'Filter by subscription type: policy_eval, tag_update, vuln_update, analysis_update, repo_update',
            },
          },
        },
      },
      // --- Query ---
      {
        name: 'query_images_by_vulnerability',
        description: 'Find all images in Anchore that are affected by a specific CVE vulnerability ID.',
        inputSchema: {
          type: 'object',
          properties: {
            vulnerability_id: {
              type: 'string',
              description: 'CVE or vulnerability ID (e.g. CVE-2021-44228)',
            },
            namespace: {
              type: 'string',
              description: 'Vulnerability namespace filter (e.g. debian:11, rhel:8)',
            },
            affected_package: {
              type: 'string',
              description: 'Filter results to a specific package name',
            },
            severity: {
              type: 'string',
              description: 'Filter by severity: Critical, High, Medium, Low, Negligible, Unknown',
            },
          },
          required: ['vulnerability_id'],
        },
      },
      {
        name: 'query_images_by_package',
        description: 'Find all images in Anchore that contain a specific package by name and optional version.',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Package name to search for (e.g. openssl, log4j)',
            },
            package_type: {
              type: 'string',
              description: 'Package type: os, npm, gem, python, java, nuget, go, binary',
            },
            version: {
              type: 'string',
              description: 'Exact package version to match (optional)',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'query_vulnerabilities',
        description: 'Query the Anchore vulnerability database directly for information about a CVE across all namespaces.',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'CVE or vulnerability ID (e.g. CVE-2021-44228)',
            },
            namespace: {
              type: 'string',
              description: 'Namespace to search within (e.g. nvdv2, debian:11)',
            },
            affected_package: {
              type: 'string',
              description: 'Filter by affected package name',
            },
          },
          required: ['id'],
        },
      },
      // --- System ---
      {
        name: 'get_system_feeds',
        description: 'List vulnerability feed status and sync metadata for all Anchore data feeds (NVD, OS distros, etc.).',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_service_status',
        description: 'Get the overall Anchore Engine service status, including component health and version information.',
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
        case 'list_images':
          return await this.listImages(args);
        case 'add_image':
          return await this.addImage(args);
        case 'get_image':
          return await this.request(`/images/${encodeURIComponent(args.imageDigest as string)}`);
        case 'get_image_policy_check':
          return await this.getImagePolicyCheck(args);
        case 'get_image_vulnerabilities':
          return await this.getImageVulnerabilities(args);
        case 'get_image_content':
          return await this.request(
            `/images/${encodeURIComponent(args.imageDigest as string)}/content/${encodeURIComponent(args.ctype as string)}`,
          );
        case 'list_image_metadata':
          return await this.request(`/images/${encodeURIComponent(args.imageDigest as string)}/metadata`);
        case 'get_image_sbom_native':
          return await this.request(`/images/${encodeURIComponent(args.imageDigest as string)}/sboms/native`);
        case 'list_image_secret_search_results':
          return await this.request(`/images/${encodeURIComponent(args.imageDigest as string)}/artifacts/secret_search`);
        case 'list_policies': {
          const detail = args.detail ? '?detail=true' : '';
          return await this.request(`/policies${detail}`);
        }
        case 'get_policy':
          return await this.request(`/policies/${encodeURIComponent(args.policyId as string)}`);
        case 'list_registries':
          return await this.request('/registries');
        case 'get_registry':
          return await this.request(`/registries/${encodeURIComponent(args.registry as string)}`);
        case 'list_subscriptions':
          return await this.listSubscriptions(args);
        case 'query_images_by_vulnerability':
          return await this.queryImagesByVulnerability(args);
        case 'query_images_by_package':
          return await this.queryImagesByPackage(args);
        case 'query_vulnerabilities':
          return await this.queryVulnerabilities(args);
        case 'get_system_feeds':
          return await this.request('/system/feeds');
        case 'get_service_status':
          return await this.request('/system');
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
    const params = new URLSearchParams();
    if (args.tag) params.set('fulltag', args.tag as string);
    if (args.image_status) params.set('image_status', args.image_status as string);
    if (args.analysis_status) params.set('analysis_status', args.analysis_status as string);
    const qs = params.toString();
    return this.request(`/images${qs ? '?' + qs : ''}`);
  }

  private async addImage(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.tag && !args.digest) {
      return {
        content: [{ type: 'text', text: 'Either tag or digest is required to add an image' }],
        isError: true,
      };
    }
    const body: Record<string, unknown> = {};
    if (args.tag) body['tag'] = args.tag;
    if (args.digest) body['digest'] = args.digest;
    const qs = args.force ? '?force=true' : '';
    return this.request(`/images${qs}`, 'POST', body);
  }

  private async getImagePolicyCheck(args: Record<string, unknown>): Promise<ToolResult> {
    const digest = args.imageDigest as string;
    const params = new URLSearchParams();
    if (args.tag) params.set('tag', args.tag as string);
    if (args.policyId) params.set('policyId', args.policyId as string);
    const qs = params.toString();
    return this.request(`/images/${encodeURIComponent(digest)}/check${qs ? '?' + qs : ''}`);
  }

  private async getImageVulnerabilities(args: Record<string, unknown>): Promise<ToolResult> {
    const digest = args.imageDigest as string;
    const vtype = (args.vtype as string) || 'all';
    return this.request(`/images/${encodeURIComponent(digest)}/vuln/${encodeURIComponent(vtype)}`);
  }

  private async listSubscriptions(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.subscription_type) params.set('subscription_type', args.subscription_type as string);
    const qs = params.toString();
    return this.request(`/subscriptions${qs ? '?' + qs : ''}`);
  }

  private async queryImagesByVulnerability(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams({ vulnerability_id: args.vulnerability_id as string });
    if (args.namespace) params.set('namespace', args.namespace as string);
    if (args.affected_package) params.set('affected_package', args.affected_package as string);
    if (args.severity) params.set('severity', args.severity as string);
    return this.request(`/query/images/by_vulnerability?${params.toString()}`);
  }

  private async queryImagesByPackage(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams({ name: args.name as string });
    if (args.package_type) params.set('package_type', args.package_type as string);
    if (args.version) params.set('version', args.version as string);
    return this.request(`/query/images/by_package?${params.toString()}`);
  }

  private async queryVulnerabilities(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams({ id: args.id as string });
    if (args.namespace) params.set('namespace', args.namespace as string);
    if (args.affected_package) params.set('affected_package', args.affected_package as string);
    return this.request(`/query/vulnerabilities?${params.toString()}`);
  }

  static catalog() {
    return {
      name: 'anchore',
      displayName: 'Anchore Engine',
      version: '1.0.0',
      category: 'cybersecurity' as const,
      keywords: [
        'anchore', 'container', 'image', 'vulnerability', 'cve', 'sbom', 'policy',
        'compliance', 'scan', 'registry', 'docker', 'oci', 'supply-chain', 'software-composition',
      ],
      toolNames: [
        'list_images', 'add_image', 'get_image', 'get_image_policy_check',
        'get_image_vulnerabilities', 'get_image_content', 'list_image_metadata',
        'get_image_sbom_native', 'list_image_secret_search_results',
        'list_policies', 'get_policy',
        'list_registries', 'get_registry',
        'list_subscriptions',
        'query_images_by_vulnerability', 'query_images_by_package', 'query_vulnerabilities',
        'get_system_feeds', 'get_service_status',
      ],
      description: 'Anchore Engine: submit container images for analysis, query CVE vulnerabilities, evaluate policy compliance, inspect SBOMs, and manage registries for on-premises container security.',
      author: 'protectnil' as const,
    };
  }
}

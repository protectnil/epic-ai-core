/**
 * Wiz Security MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://www.wiz.io/blog/introducing-mcp-server-for-wiz
//   Now available on AWS Marketplace (v0.1.1, container image) — no longer preview-only.
//   URL: https://aws.amazon.com/marketplace/pp/prodview-nlyysa5n2s7h6
//   Transport: streamable-HTTP (hosted, Wiz-managed). Auth: service account client credentials.
//   Tool count: not publicly disclosed in docs. Last updated: available on AWS Marketplace as of 2026-03.
//   Status: Official (published by Wiz Inc.), actively maintained.
//   Fails criterion 3 (tool count not publicly confirmed as 10+); keep REST adapter as primary.
// Recommendation: Use this adapter for programmatic GraphQL access. Evaluate vendor MCP once
//   tool surface is publicly documented and confirmed ≥10 tools.
//
// Base URL: https://api.<TENANT_DATA_CENTER>.app.wiz.io/graphql (tenant-specific)
//   Example: https://api.us1.app.wiz.io/graphql
//   Data centers: us1, us2, eu1, eu2
// Auth: OAuth2 client credentials — POST https://auth.app.wiz.io/oauth/token
//   Audience: beyond-api or wiz-api (tenant-specific — check Wiz settings > Service Accounts)
// Docs: https://docs.wiz.io/docs/using-the-wiz-api
// Rate limits: Not publicly documented; Wiz recommends staying under 10 req/s per service account.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface WizConfig {
  clientId: string;
  clientSecret: string;
  /** Full GraphQL endpoint, e.g. https://api.us1.app.wiz.io/graphql */
  baseUrl?: string;
  /** Token endpoint audience — check your Wiz tenant settings (default: wiz-api) */
  audience?: string;
}

export class WizMCPServer extends MCPAdapterBase {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly baseUrl: string;
  private readonly audience: string;
  private bearerToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(config: WizConfig) {
    super();
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.baseUrl = (config.baseUrl ?? 'https://api.us1.app.wiz.io/graphql').replace(/\/$/, '');
    this.audience = config.audience ?? 'wiz-api';
  }

  static catalog() {
    return {
      name: 'wiz',
      displayName: 'Wiz',
      version: '1.0.0',
      category: 'cybersecurity' as const,
      keywords: ['wiz', 'cloud-security', 'cspm', 'issue', 'vulnerability', 'compliance', 'resource', 'risk', 'misconfiguration', 'control', 'connector'],
      toolNames: [
        'list_issues', 'get_issue', 'update_issue',
        'list_vulnerabilities', 'get_vulnerability',
        'list_resources', 'get_resource',
        'list_controls', 'get_control',
        'list_compliance_frameworks', 'get_compliance_report',
        'list_cloud_connectors',
      ],
      description: 'Cloud security posture: list and manage issues, vulnerabilities, cloud resources, security controls, compliance frameworks, and cloud connectors.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_issues',
        description: 'List Wiz security issues with optional filters for severity, status, and resource type',
        inputSchema: {
          type: 'object',
          properties: {
            first: { type: 'number', description: 'Number of issues to return (default: 50, max: 500)' },
            after: { type: 'string', description: 'Pagination cursor from a previous response (optional)' },
            severity: { type: 'string', description: 'Filter by severity: CRITICAL, HIGH, MEDIUM, LOW, INFO (optional)' },
            status: { type: 'string', description: 'Filter by status: OPEN, IN_PROGRESS, RESOLVED, REJECTED (optional)' },
            type: { type: 'string', description: 'Filter by issue type: THREAT_DETECTION, CLOUD_CONFIGURATION, TOXIC_COMBINATION (optional)' },
          },
        },
      },
      {
        name: 'get_issue',
        description: 'Get full details for a single Wiz issue by ID, including affected resources and remediation',
        inputSchema: {
          type: 'object',
          properties: {
            issueId: { type: 'string', description: 'Wiz issue ID (UUID)' },
          },
          required: ['issueId'],
        },
      },
      {
        name: 'update_issue',
        description: 'Update the status or note on a Wiz issue — resolve, reject, or reopen an issue',
        inputSchema: {
          type: 'object',
          properties: {
            issueId: { type: 'string', description: 'Wiz issue ID (UUID)' },
            status: { type: 'string', description: 'New status: OPEN, IN_PROGRESS, RESOLVED, REJECTED' },
            note: { type: 'string', description: 'Optional comment or resolution note' },
          },
          required: ['issueId', 'status'],
        },
      },
      {
        name: 'list_vulnerabilities',
        description: 'List container and OS vulnerabilities detected by Wiz with filters for severity and CVE ID',
        inputSchema: {
          type: 'object',
          properties: {
            first: { type: 'number', description: 'Number of results to return (default: 50, max: 500)' },
            after: { type: 'string', description: 'Pagination cursor (optional)' },
            severity: { type: 'string', description: 'Filter by severity: CRITICAL, HIGH, MEDIUM, LOW, INFORMATIONAL (optional)' },
            cveId: { type: 'string', description: 'Filter by CVE identifier, e.g. CVE-2021-44228 (optional)' },
          },
        },
      },
      {
        name: 'get_vulnerability',
        description: 'Get details for a specific Wiz vulnerability finding by ID including affected packages',
        inputSchema: {
          type: 'object',
          properties: {
            vulnerabilityId: { type: 'string', description: 'Wiz vulnerability finding ID (UUID)' },
          },
          required: ['vulnerabilityId'],
        },
      },
      {
        name: 'list_resources',
        description: 'List cloud resources inventoried by Wiz with optional filters for type, cloud provider, and subscription',
        inputSchema: {
          type: 'object',
          properties: {
            first: { type: 'number', description: 'Number of resources to return (default: 50, max: 500)' },
            after: { type: 'string', description: 'Pagination cursor (optional)' },
            type: { type: 'string', description: 'Resource type, e.g. VIRTUAL_MACHINE, STORAGE_BUCKET, CONTAINER, SERVERLESS (optional)' },
            cloudProvider: { type: 'string', description: 'Cloud provider: AWS, Azure, GCP, OCI, Alibaba, vSphere (optional)' },
            subscriptionId: { type: 'string', description: 'Filter by cloud subscription/account ID (optional)' },
          },
        },
      },
      {
        name: 'get_resource',
        description: 'Get full details for a single Wiz cloud resource by ID including open issues and configurations',
        inputSchema: {
          type: 'object',
          properties: {
            resourceId: { type: 'string', description: 'Wiz resource ID (UUID or cloud-native ID)' },
          },
          required: ['resourceId'],
        },
      },
      {
        name: 'list_controls',
        description: 'List Wiz security controls (policy rules) with filters for framework and severity',
        inputSchema: {
          type: 'object',
          properties: {
            first: { type: 'number', description: 'Number of controls to return (default: 50)' },
            after: { type: 'string', description: 'Pagination cursor (optional)' },
            severity: { type: 'string', description: 'Filter by severity: CRITICAL, HIGH, MEDIUM, LOW, INFORMATIONAL (optional)' },
            enabled: { type: 'boolean', description: 'Filter to only enabled (true) or disabled (false) controls (optional)' },
          },
        },
      },
      {
        name: 'get_control',
        description: 'Get details for a specific Wiz security control including description and associated framework mappings',
        inputSchema: {
          type: 'object',
          properties: {
            controlId: { type: 'string', description: 'Wiz control ID (UUID)' },
          },
          required: ['controlId'],
        },
      },
      {
        name: 'list_compliance_frameworks',
        description: 'List compliance frameworks configured in Wiz (e.g. CIS, SOC2, PCI-DSS, ISO27001)',
        inputSchema: {
          type: 'object',
          properties: {
            first: { type: 'number', description: 'Number of frameworks to return (default: 50)' },
            after: { type: 'string', description: 'Pagination cursor (optional)' },
          },
        },
      },
      {
        name: 'get_compliance_report',
        description: 'Get a compliance report summary for a specific framework, including pass/fail counts per control',
        inputSchema: {
          type: 'object',
          properties: {
            frameworkId: { type: 'string', description: 'Compliance framework ID (UUID)' },
          },
          required: ['frameworkId'],
        },
      },
      {
        name: 'list_cloud_connectors',
        description: 'List cloud connectors (subscriptions/accounts) configured in Wiz with connection status and provider',
        inputSchema: {
          type: 'object',
          properties: {
            first: { type: 'number', description: 'Number of connectors to return (default: 50)' },
            after: { type: 'string', description: 'Pagination cursor (optional)' },
            cloudProvider: { type: 'string', description: 'Filter by cloud provider: AWS, Azure, GCP, OCI (optional)' },
            status: { type: 'string', description: 'Filter by connection status: CONNECTED, ERROR, PENDING (optional)' },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      const token = await this.getOrRefreshToken();
      const headers: Record<string, string> = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      };

      switch (name) {
        case 'list_issues':
          return await this.listIssues(headers, args);
        case 'get_issue':
          return await this.getIssue(headers, args);
        case 'update_issue':
          return await this.updateIssue(headers, args);
        case 'list_vulnerabilities':
          return await this.listVulnerabilities(headers, args);
        case 'get_vulnerability':
          return await this.getVulnerability(headers, args);
        case 'list_resources':
          return await this.listResources(headers, args);
        case 'get_resource':
          return await this.getResource(headers, args);
        case 'list_controls':
          return await this.listControls(headers, args);
        case 'get_control':
          return await this.getControl(headers, args);
        case 'list_compliance_frameworks':
          return await this.listComplianceFrameworks(headers, args);
        case 'get_compliance_report':
          return await this.getComplianceReport(headers, args);
        case 'list_cloud_connectors':
          return await this.listCloudConnectors(headers, args);
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

  private async getOrRefreshToken(): Promise<string> {
    const now = Date.now();
    if (this.bearerToken && this.tokenExpiry > now) {
      return this.bearerToken;
    }

    const response = await this.fetchWithRetry('https://auth.app.wiz.io/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: this.clientId,
        client_secret: this.clientSecret,
        audience: this.audience,
      }).toString(),
    });

    if (!response.ok) {
      throw new Error(`Wiz OAuth2 token request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as { access_token: string; expires_in: number };
    this.bearerToken = data.access_token;
    this.tokenExpiry = now + (data.expires_in - 60) * 1000;
    return this.bearerToken;
  }

  private async gql(headers: Record<string, string>, query: string, variables: Record<string, unknown>): Promise<unknown> {
    const response = await this.fetchWithRetry(this.baseUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({ query, variables }),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => response.statusText);
      throw new Error(`Wiz API error: ${response.status} ${text}`);
    }

    const data = await response.json() as { errors?: Array<{ message: string }>; data: unknown };
    if (data.errors && data.errors.length > 0) {
      throw new Error(`Wiz GraphQL error: ${data.errors.map((e) => e.message).join(', ')}`);
    }
    return data.data;
  }


  private async listIssues(headers: Record<string, string>, args: Record<string, unknown>): Promise<ToolResult> {
    const variables: Record<string, unknown> = {
      first: (args.first as number) ?? 50,
    };
    if (args.after) variables.after = args.after;

    const filterBy: Record<string, unknown> = {};
    if (args.severity) filterBy.severity = [args.severity];
    if (args.status) filterBy.status = [args.status];
    if (args.type) filterBy.type = [args.type];
    if (Object.keys(filterBy).length > 0) variables.filterBy = filterBy;

    const data = await this.gql(headers, `
      query ListIssues($first: Int, $after: String, $filterBy: IssueFilters) {
        issues(first: $first, after: $after, filterBy: $filterBy) {
          pageInfo { hasNextPage endCursor }
          totalCount
          edges {
            node {
              id type severity status
              createdAt updatedAt
              projects { id name }
              entitySnapshot { id name type subscriptionId cloudProvider }
              control { id name }
            }
          }
        }
      }
    `, variables);

    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getIssue(headers: Record<string, string>, args: Record<string, unknown>): Promise<ToolResult> {
    const data = await this.gql(headers, `
      query GetIssue($id: ID!) {
        issue(id: $id) {
          id type severity status
          createdAt updatedAt
          projects { id name }
          entitySnapshot {
            id name type subscriptionId cloudProvider region
            nativeType tags cloudPlatform
          }
          control { id name description severity }
          serviceTickets { url externalId name }
          notes { createdAt text user { name } }
          remediation
        }
      }
    `, { id: args.issueId as string });

    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async updateIssue(headers: Record<string, string>, args: Record<string, unknown>): Promise<ToolResult> {
    const input: Record<string, unknown> = { status: args.status };
    if (args.note) input.note = args.note;

    const data = await this.gql(headers, `
      mutation UpdateIssue($id: ID!, $patch: UpdateIssueInput!) {
        updateIssue(id: $id, patch: $patch) {
          issue {
            id status updatedAt
          }
        }
      }
    `, { id: args.issueId as string, patch: input });

    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listVulnerabilities(headers: Record<string, string>, args: Record<string, unknown>): Promise<ToolResult> {
    const variables: Record<string, unknown> = {
      first: (args.first as number) ?? 50,
    };
    if (args.after) variables.after = args.after;

    const filterBy: Record<string, unknown> = {};
    if (args.severity) filterBy.severity = [args.severity];
    if (args.cveId) filterBy.cveId = [args.cveId];
    if (Object.keys(filterBy).length > 0) variables.filterBy = filterBy;

    const data = await this.gql(headers, `
      query ListVulnerabilities($first: Int, $after: String, $filterBy: VulnerabilityFindingFilters) {
        vulnerabilityFindings(first: $first, after: $after, filterBy: $filterBy) {
          pageInfo { hasNextPage endCursor }
          totalCount
          edges {
            node {
              id name severity score status
              cveId
              packageName packageVersion fixedVersion
              detectedAt
              affectedAsset { id name type }
            }
          }
        }
      }
    `, variables);

    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getVulnerability(headers: Record<string, string>, args: Record<string, unknown>): Promise<ToolResult> {
    const data = await this.gql(headers, `
      query GetVulnerability($id: ID!) {
        vulnerabilityFinding(id: $id) {
          id name severity score status
          cveId description
          packageName packageVersion fixedVersion
          detectedAt
          affectedAsset { id name type subscriptionId cloudProvider }
          remediation
        }
      }
    `, { id: args.vulnerabilityId as string });

    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listResources(headers: Record<string, string>, args: Record<string, unknown>): Promise<ToolResult> {
    const variables: Record<string, unknown> = {
      first: (args.first as number) ?? 50,
    };
    if (args.after) variables.after = args.after;

    const filterBy: Record<string, unknown> = {};
    if (args.type) filterBy.type = [args.type];
    if (args.cloudProvider) filterBy.cloudProvider = [args.cloudProvider];
    if (args.subscriptionId) filterBy.subscriptionId = [args.subscriptionId];
    if (Object.keys(filterBy).length > 0) variables.filterBy = filterBy;

    const data = await this.gql(headers, `
      query ListResources($first: Int, $after: String, $filterBy: GraphEntityFilters) {
        graphEntities(first: $first, after: $after, filterBy: $filterBy) {
          pageInfo { hasNextPage endCursor }
          totalCount
          edges {
            node {
              id name type nativeType status
              cloudProvider region subscriptionId
              tags { key value }
              openIssuesCount
            }
          }
        }
      }
    `, variables);

    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getResource(headers: Record<string, string>, args: Record<string, unknown>): Promise<ToolResult> {
    const data = await this.gql(headers, `
      query GetResource($id: ID!) {
        graphEntity(id: $id) {
          id name type nativeType status
          cloudProvider region subscriptionId
          tags { key value }
          openIssuesCount
          properties
          issues(first: 10) {
            edges {
              node { id type severity status createdAt control { name } }
            }
          }
        }
      }
    `, { id: args.resourceId as string });

    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listControls(headers: Record<string, string>, args: Record<string, unknown>): Promise<ToolResult> {
    const variables: Record<string, unknown> = {
      first: (args.first as number) ?? 50,
    };
    if (args.after) variables.after = args.after;

    const filterBy: Record<string, unknown> = {};
    if (args.severity) filterBy.severity = [args.severity];
    if (args.enabled !== undefined) filterBy.enabled = args.enabled;
    if (Object.keys(filterBy).length > 0) variables.filterBy = filterBy;

    const data = await this.gql(headers, `
      query ListControls($first: Int, $after: String, $filterBy: ControlFilters) {
        controls(first: $first, after: $after, filterBy: $filterBy) {
          pageInfo { hasNextPage endCursor }
          totalCount
          edges {
            node {
              id name severity enabled
              description
              createdAt
              issuesCount
            }
          }
        }
      }
    `, variables);

    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getControl(headers: Record<string, string>, args: Record<string, unknown>): Promise<ToolResult> {
    const data = await this.gql(headers, `
      query GetControl($id: ID!) {
        control(id: $id) {
          id name severity enabled
          description remediation
          createdAt updatedAt
          issuesCount
          frameworks {
            name section
          }
        }
      }
    `, { id: args.controlId as string });

    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listComplianceFrameworks(headers: Record<string, string>, args: Record<string, unknown>): Promise<ToolResult> {
    const data = await this.gql(headers, `
      query ListComplianceFrameworks($first: Int, $after: String) {
        complianceFrameworks(first: $first, after: $after) {
          pageInfo { hasNextPage endCursor }
          edges {
            node {
              id name description
              builtIn enabled
              createdAt
            }
          }
        }
      }
    `, {
      first: (args.first as number) ?? 50,
      after: args.after ?? null,
    });

    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getComplianceReport(headers: Record<string, string>, args: Record<string, unknown>): Promise<ToolResult> {
    const data = await this.gql(headers, `
      query GetComplianceReport($id: ID!) {
        complianceFramework(id: $id) {
          id name description enabled
          summary {
            passedCount failedCount errorCount infoCount totalCount
          }
          controls(first: 100) {
            edges {
              node {
                id name severity
                passedCount failedCount
              }
            }
          }
        }
      }
    `, { id: args.frameworkId as string });

    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listCloudConnectors(headers: Record<string, string>, args: Record<string, unknown>): Promise<ToolResult> {
    const variables: Record<string, unknown> = {
      first: (args.first as number) ?? 50,
    };
    if (args.after) variables.after = args.after;

    const filterBy: Record<string, unknown> = {};
    if (args.cloudProvider) filterBy.cloudProvider = [args.cloudProvider];
    if (args.status) filterBy.status = [args.status];
    if (Object.keys(filterBy).length > 0) variables.filterBy = filterBy;

    const data = await this.gql(headers, `
      query ListCloudConnectors($first: Int, $after: String, $filterBy: CloudAccountFilters) {
        cloudAccounts(first: $first, after: $after, filterBy: $filterBy) {
          pageInfo { hasNextPage endCursor }
          totalCount
          edges {
            node {
              id name status
              cloudProvider externalId
              lastScanDate
              resourceCount issueCount
            }
          }
        }
      }
    `, variables);

    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }
}

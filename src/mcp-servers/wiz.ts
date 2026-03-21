/**
 * Wiz Security REST API MCP Server Wrapper
 * Provides tools for vulnerability and compliance management via Wiz
 
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

import { ToolDefinition, ToolResult } from './types.js';

interface WizConfig {
  clientId: string;
  clientSecret: string;
  baseUrl?: string;
}

export class WizMCPServer {
  private readonly baseUrl: string;
  private readonly clientId: string;
  private readonly clientSecret: string;
  private accessToken: string | null = null;
  private tokenExpiry: number | null = null;

  constructor(config: WizConfig) {
    this.baseUrl = config.baseUrl || 'https://api.us1.app.wiz.io';
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
  }

  private async getAccessToken(): Promise<string> {
    if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    const response = await fetch(`${this.baseUrl}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: this.clientId,
        client_secret: this.clientSecret,
      }).toString(),
    });

    if (!response.ok) {
      throw new Error(`Wiz OAuth failed: ${response.statusText}`);
    }

    const data = await response.json() as { access_token: string; expires_in: number };
    this.accessToken = data.access_token;
    this.tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000; // Refresh 1min before expiry
    return this.accessToken;
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_issues',
        description: 'List security issues from Wiz with optional filtering',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of issues to return (default: 50)',
            },
            offset: {
              type: 'number',
              description: 'Pagination offset (default: 0)',
            },
            severity: {
              type: 'string',
              description: 'Filter by severity (CRITICAL, HIGH, MEDIUM, LOW, INFO)',
            },
            status: {
              type: 'string',
              description: 'Filter by status (OPEN, IN_PROGRESS, RESOLVED)',
            },
          },
        },
      },
      {
        name: 'get_issue',
        description: 'Get details of a specific Wiz issue',
        inputSchema: {
          type: 'object',
          properties: {
            issueId: {
              type: 'string',
              description: 'The ID of the issue to retrieve',
            },
          },
          required: ['issueId'],
        },
      },
      {
        name: 'list_resources',
        description: 'List cloud resources managed by Wiz',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of resources to return (default: 50)',
            },
            resourceType: {
              type: 'string',
              description: 'Filter by resource type (e.g., EC2, S3, RDS)',
            },
            cloudProvider: {
              type: 'string',
              description: 'Filter by cloud provider (AWS, Azure, GCP)',
            },
          },
        },
      },
      {
        name: 'get_compliance_frameworks',
        description: 'Get available compliance frameworks in Wiz',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of frameworks to return (default: 50)',
            },
          },
        },
      },
      {
        name: 'query_graph',
        description: 'Query the Wiz cloud graph for resources and relationships by type',
        inputSchema: {
          type: 'object',
          properties: {
            resourceType: {
              type: 'string',
              description: 'Resource type to query (e.g., VIRTUAL_MACHINE, STORAGE_BUCKET, CONTAINER)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results to return (default: 50)',
            },
          },
          required: ['resourceType'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      const token = await this.getAccessToken();
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      };

      switch (name) {
        case 'list_issues':
          return await this.listIssues(headers, args);
        case 'get_issue':
          return await this.getIssue(headers, args);
        case 'list_resources':
          return await this.listResources(headers, args);
        case 'get_compliance_frameworks':
          return await this.getComplianceFrameworks(headers, args);
        case 'query_graph':
          return await this.queryGraph(headers, args);
        default:
          return {
            content: [{ type: 'text', text: `Unknown tool: ${name}` }],
            isError: true,
          };
      }
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Wiz API error: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }

  private async listIssues(
    headers: Record<string, string>,
    args: Record<string, unknown>
  ): Promise<ToolResult> {
    const limit = (args.limit as number) || 50;
    const offset = (args.offset as number) || 0;

    // Use GraphQL variables to prevent injection — never interpolate user input into query strings
    const variables: Record<string, unknown> = {
      first: limit,
      skip: offset,
    };

    if (args.severity) variables.severity = args.severity;
    if (args.status) variables.status = args.status;

    const response = await fetch(`${this.baseUrl}/graphql`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        query: `
          query ListIssues($first: Int, $skip: Int, $severity: IssueSeverity, $status: IssueStatus) {
            issues(first: $first, skip: $skip, severity: $severity, status: $status) {
              edges {
                node {
                  id
                  title
                  severity
                  status
                  createdAt
                }
              }
            }
          }
        `,
        variables,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Wiz API error: ${response.status} ${text}`);
    }

    let data: Record<string, unknown>;
    try {
      data = await response.json() as Record<string, unknown>;
    } catch {
      throw new Error('Wiz API returned invalid JSON');
    }
    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      isError: false,
    };
  }

  private async getIssue(
    headers: Record<string, string>,
    args: Record<string, unknown>
  ): Promise<ToolResult> {
    // Use GraphQL variables ($id: ID!) to prevent injection
    const response = await fetch(`${this.baseUrl}/graphql`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        query: `
          query GetIssue($id: ID!) {
            issue(id: $id) {
              id
              title
              description
              severity
              status
              createdAt
              updatedAt
              resources {
                id
                name
                type
              }
            }
          }
        `,
        variables: { id: args.issueId },
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Wiz API error: ${response.status} ${text}`);
    }

    let data: Record<string, unknown>;
    try {
      data = await response.json() as Record<string, unknown>;
    } catch {
      throw new Error('Wiz API returned invalid JSON');
    }
    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      isError: false,
    };
  }

  private async listResources(
    headers: Record<string, string>,
    args: Record<string, unknown>
  ): Promise<ToolResult> {
    // Use GraphQL variables to prevent injection
    const variables: Record<string, unknown> = {
      first: (args.limit as number) || 50,
    };

    if (args.resourceType) variables.resourceType = args.resourceType;
    if (args.cloudProvider) variables.cloudProvider = args.cloudProvider;

    const response = await fetch(`${this.baseUrl}/graphql`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        query: `
          query ListResources($first: Int, $resourceType: String, $cloudProvider: CloudProvider) {
            resources(first: $first, resourceType: $resourceType, cloudProvider: $cloudProvider) {
              edges {
                node {
                  id
                  name
                  type
                  cloudProvider
                  status
                }
              }
            }
          }
        `,
        variables,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Wiz API error: ${response.status} ${text}`);
    }

    let data: Record<string, unknown>;
    try {
      data = await response.json() as Record<string, unknown>;
    } catch {
      throw new Error('Wiz API returned invalid JSON');
    }
    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      isError: false,
    };
  }

  private async getComplianceFrameworks(
    headers: Record<string, string>,
    args: Record<string, unknown>
  ): Promise<ToolResult> {
    const response = await fetch(`${this.baseUrl}/graphql`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        query: `
          query GetComplianceFrameworks($first: Int) {
            complianceFrameworks(first: $first) {
              edges {
                node {
                  id
                  name
                  description
                  controls {
                    id
                    name
                  }
                }
              }
            }
          }
        `,
        variables: { first: (args.limit as number) || 50 },
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Wiz API error: ${response.status} ${text}`);
    }

    let data: Record<string, unknown>;
    try {
      data = await response.json() as Record<string, unknown>;
    } catch {
      throw new Error('Wiz API returned invalid JSON');
    }
    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      isError: false,
    };
  }

  /** Parameterized graph query — accepts a resourceType enum value. */
  private async queryGraph(
    headers: Record<string, string>,
    args: Record<string, unknown>
  ): Promise<ToolResult> {
    const variables: Record<string, unknown> = {
      resourceType: args.resourceType,
      first: (args.limit as number) || 50,
    };

    const response = await fetch(`${this.baseUrl}/graphql`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        query: `
          query QueryGraph($resourceType: String!, $first: Int) {
            graphSearch(resourceType: $resourceType, first: $first) {
              edges {
                node {
                  id
                  name
                  type
                  properties
                }
              }
            }
          }
        `,
        variables,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Wiz API error: ${response.status} ${text}`);
    }

    let data: Record<string, unknown>;
    try {
      data = await response.json() as Record<string, unknown>;
    } catch {
      throw new Error('Wiz API returned invalid JSON');
    }
    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      isError: false,
    };
  }
}

/**
 * New Relic MCP Server
 * New Relic API v2 and NerdGraph — applications, NRQL queries, alerts, and synthetics.
 *
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */
import { ToolDefinition, ToolResult } from './types.js';

export class NewRelicMCPServer {
  private readonly baseUrl: string;
  private readonly graphqlUrl: string;
  private readonly headers: Record<string, string>;

  constructor(config: {
    apiKey: string;
  }) {
    this.baseUrl = 'https://api.newrelic.com/v2';
    this.graphqlUrl = 'https://api.newrelic.com/graphql';
    this.headers = {
      'Api-Key': config.apiKey,
      'Content-Type': 'application/json',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_applications',
        description: 'List APM applications in New Relic',
        inputSchema: {
          type: 'object',
          properties: {
            filter_name: {
              type: 'string',
              description: 'Filter applications by name substring',
            },
            filter_language: {
              type: 'string',
              description: 'Filter by language (e.g., "java", "ruby", "python")',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
          },
        },
      },
      {
        name: 'get_application',
        description: 'Get details for a specific New Relic APM application',
        inputSchema: {
          type: 'object',
          properties: {
            application_id: {
              type: 'number',
              description: 'The numeric application ID',
            },
          },
          required: ['application_id'],
        },
      },
      {
        name: 'query_nrql',
        description: 'Run a NRQL query against New Relic via NerdGraph',
        inputSchema: {
          type: 'object',
          properties: {
            account_id: {
              type: 'number',
              description: 'New Relic account ID to run the query against',
            },
            nrql: {
              type: 'string',
              description: 'NRQL query string (e.g., "SELECT count(*) FROM Transaction SINCE 1 hour ago")',
            },
          },
          required: ['account_id', 'nrql'],
        },
      },
      {
        name: 'list_alert_policies',
        description: 'List alert policies configured in New Relic',
        inputSchema: {
          type: 'object',
          properties: {
            filter_name: {
              type: 'string',
              description: 'Filter policies by name substring',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
          },
        },
      },
      {
        name: 'list_synthetics_monitors',
        description: 'List Synthetic monitors in New Relic',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of monitors to return (default: 100)',
            },
            offset: {
              type: 'number',
              description: 'Pagination offset (default: 0)',
            },
          },
        },
      },
    ];
  }

  async callTool(
    name: string,
    args: Record<string, unknown>
  ): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_applications':
          return await this.listApplications(
            args.filter_name as string | undefined,
            args.filter_language as string | undefined,
            args.page as number | undefined
          );
        case 'get_application':
          return await this.getApplication(args.application_id as number);
        case 'query_nrql':
          return await this.queryNrql(
            args.account_id as number,
            args.nrql as string
          );
        case 'list_alert_policies':
          return await this.listAlertPolicies(
            args.filter_name as string | undefined,
            args.page as number | undefined
          );
        case 'list_synthetics_monitors':
          return await this.listSyntheticsMonitors(
            args.limit as number | undefined,
            args.offset as number | undefined
          );
        default:
          return {
            content: [{ type: 'text', text: `Unknown tool: ${name}` }],
            isError: true,
          };
      }
    } catch (error) {
      return {
        content: [{ type: 'text', text: error instanceof Error ? error.message : String(error) }],
        isError: true,
      };
    }
  }

  private async listApplications(
    filterName?: string,
    filterLanguage?: string,
    page?: number
  ): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (filterName) params.append('filter[name]', filterName);
    if (filterLanguage) params.append('filter[language]', filterLanguage);
    params.append('page', String(page || 1));

    const response = await fetch(
      `${this.baseUrl}/applications.json?${params}`,
      { method: 'GET', headers: this.headers }
    );

    if (!response.ok) {
      throw new Error(`New Relic API error: ${response.status} ${response.statusText}`);
    }

    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`New Relic returned non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async getApplication(applicationId: number): Promise<ToolResult> {
    const response = await fetch(
      `${this.baseUrl}/applications/${applicationId}.json`,
      { method: 'GET', headers: this.headers }
    );

    if (!response.ok) {
      throw new Error(`New Relic API error: ${response.status} ${response.statusText}`);
    }

    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`New Relic returned non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async queryNrql(accountId: number, nrql: string): Promise<ToolResult> {
    const body = {
      query: `{
        actor {
          account(id: ${accountId}) {
            nrql(query: "${nrql.replace(/"/g, '\\"')}") {
              results
            }
          }
        }
      }`,
    };

    const response = await fetch(
      this.graphqlUrl,
      { method: 'POST', headers: this.headers, body: JSON.stringify(body) }
    );

    if (!response.ok) {
      throw new Error(`New Relic NerdGraph error: ${response.status} ${response.statusText}`);
    }

    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`New Relic returned non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async listAlertPolicies(
    filterName?: string,
    page?: number
  ): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (filterName) params.append('filter[name]', filterName);
    params.append('page', String(page || 1));

    const response = await fetch(
      `${this.baseUrl}/alerts_policies.json?${params}`,
      { method: 'GET', headers: this.headers }
    );

    if (!response.ok) {
      throw new Error(`New Relic API error: ${response.status} ${response.statusText}`);
    }

    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`New Relic returned non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async listSyntheticsMonitors(
    limit?: number,
    offset?: number
  ): Promise<ToolResult> {
    const params = new URLSearchParams();
    params.append('limit', String(limit || 100));
    params.append('offset', String(offset || 0));

    const response = await fetch(
      `${this.baseUrl}/synthetics/monitors?${params}`,
      { method: 'GET', headers: this.headers }
    );

    if (!response.ok) {
      throw new Error(`New Relic API error: ${response.status} ${response.statusText}`);
    }

    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`New Relic returned non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }
}

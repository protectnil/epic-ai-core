/**
 * New Relic MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/newrelic/mcp-server — transport: streamable-HTTP, auth: API key or OAuth
//   Published by New Relic (official vendor repo). In Public Preview as of 2025-11-05. Maintained.
//   Vendor MCP tools (26): convert_time_period_to_epoch_ms, get_dashboard, get_entity,
//     list_related_entities, list_available_new_relic_accounts, list_dashboards, list_entity_types,
//     search_entity_with_tag, execute_nrql_query, natural_language_to_nrql_query,
//     list_alert_conditions, search_incident, list_alert_policies, list_recent_issues,
//     list_synthetic_monitors, analyze_deployment_impact, generate_alert_insights_report,
//     generate_user_impact_report, list_entity_error_groups, list_change_events,
//     analyze_entity_logs, analyze_golden_metrics, analyze_kafka_metrics, analyze_threads,
//     analyze_transactions, list_garbage_collection_metrics, list_recent_logs
// Our adapter covers: 14 tools (REST API v2 + NerdGraph surface for programmatic workflows).
// Recommendation: use-both — Vendor MCP has unique tools not in REST API (analyze_deployment_impact,
//   generate_alert_insights_report, generate_user_impact_report, analyze_entity_logs,
//   analyze_golden_metrics, analyze_kafka_metrics, analyze_threads, analyze_transactions,
//   list_garbage_collection_metrics, list_recent_logs, natural_language_to_nrql_query,
//   list_change_events, list_entity_error_groups, convert_time_period_to_epoch_ms,
//   list_related_entities, list_available_new_relic_accounts, list_dashboards, list_entity_types,
//   search_entity_with_tag). Our adapter has REST-only tools (list_applications, get_application,
//   create_alert_policy, create_nrql_condition, list_open_incidents, list_key_transactions,
//   create_deployment_marker) with direct programmatic control.
// Integration: use-both
// MCP-sourced tools (19): convert_time_period_to_epoch_ms, get_dashboard, list_related_entities,
//   list_available_new_relic_accounts, list_dashboards, list_entity_types, search_entity_with_tag,
//   natural_language_to_nrql_query, list_recent_issues, analyze_deployment_impact,
//   generate_alert_insights_report, generate_user_impact_report, list_entity_error_groups,
//   list_change_events, analyze_entity_logs, analyze_golden_metrics, analyze_kafka_metrics,
//   analyze_threads, analyze_transactions, list_garbage_collection_metrics, list_recent_logs
// REST-sourced tools (14): query_nrql, search_entities, get_entity, list_applications,
//   get_application, list_alert_policies, create_alert_policy, list_nrql_conditions,
//   create_nrql_condition, list_open_incidents, list_synthetic_monitors, get_synthetic_monitor,
//   create_deployment_marker, list_key_transactions
//
// Base URL: https://api.newrelic.com/v2 (REST API v2 — APM, alerts, key transactions)
// GraphQL URL: https://api.newrelic.com/graphql (NerdGraph — NRQL, entities, workloads, synthetics)
// Auth: Api-Key header (User API key — same key works for both REST v2 and NerdGraph)
// Docs: https://docs.newrelic.com/docs/apis/intro-apis/introduction-new-relic-apis/
// Rate limits: 1000 requests/min per API key for REST API v2

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface NewRelicConfig {
  apiKey: string;
  baseUrl?: string;
  graphqlUrl?: string;
}

export class NewRelicMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly graphqlUrl: string;

  constructor(config: NewRelicConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? 'https://api.newrelic.com/v2';
    this.graphqlUrl = config.graphqlUrl ?? 'https://api.newrelic.com/graphql';
  }

  static catalog() {
    return {
      name: 'new-relic',
      displayName: 'New Relic',
      version: '1.0.0',
      category: 'observability' as const,
      keywords: ['newrelic', 'new-relic', 'apm', 'nrql', 'nerdgraph', 'observability', 'monitoring', 'alert', 'incident', 'synthetic', 'entity', 'workload', 'deployment', 'infrastructure'],
      toolNames: [
        'query_nrql',
        'search_entities',
        'get_entity',
        'list_applications',
        'get_application',
        'list_alert_policies',
        'create_alert_policy',
        'list_nrql_conditions',
        'create_nrql_condition',
        'list_open_incidents',
        'list_synthetic_monitors',
        'get_synthetic_monitor',
        'create_deployment_marker',
        'list_key_transactions',
      ],
      description: 'New Relic observability: run NRQL queries, manage APM applications, alert policies and conditions, incidents, synthetic monitors, entities, and deployment markers.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'query_nrql',
        description: 'Run a NRQL query against a New Relic account via NerdGraph and return results',
        inputSchema: {
          type: 'object',
          properties: {
            account_id: {
              type: 'number',
              description: 'New Relic account ID to query against',
            },
            nrql: {
              type: 'string',
              description: 'NRQL query string (e.g. "SELECT count(*) FROM Transaction SINCE 1 hour ago FACET appName")',
            },
          },
          required: ['account_id', 'nrql'],
        },
      },
      {
        name: 'search_entities',
        description: 'Search New Relic entities (applications, hosts, services, monitors) by name or entity type using NerdGraph entitySearch',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: "NerdGraph entity search query (e.g. \"name LIKE 'payment%' AND type = 'APPLICATION'\" or \"domain = 'INFRA' AND type = 'HOST'\")",
            },
            types: {
              type: 'array',
              description: 'Filter to specific entity types: APPLICATION, HOST, MONITOR, WORKLOAD, SERVICE (optional)',
            },
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response to retrieve the next page',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'get_entity',
        description: 'Retrieve full details for a single New Relic entity by GUID including tags, golden metrics, and alert status',
        inputSchema: {
          type: 'object',
          properties: {
            guid: {
              type: 'string',
              description: 'New Relic entity GUID (base64-encoded, returned by search_entities)',
            },
          },
          required: ['guid'],
        },
      },
      {
        name: 'list_applications',
        description: 'List APM applications in New Relic with optional name and language filters and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            filter_name: {
              type: 'string',
              description: 'Filter applications by name substring',
            },
            filter_language: {
              type: 'string',
              description: 'Filter by agent language: java, ruby, python, php, dotnet, nodejs, go',
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
        description: 'Get health summary, throughput, error rate, and Apdex for a specific New Relic APM application by ID',
        inputSchema: {
          type: 'object',
          properties: {
            application_id: {
              type: 'number',
              description: 'The numeric APM application ID',
            },
          },
          required: ['application_id'],
        },
      },
      {
        name: 'list_alert_policies',
        description: 'List alert policies in a New Relic account with optional name filter and pagination',
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
        name: 'create_alert_policy',
        description: 'Create a new New Relic alert policy with specified incident preference',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Name for the alert policy',
            },
            incident_preference: {
              type: 'string',
              description: 'How incidents are created: PER_POLICY (one per policy), PER_CONDITION (one per condition), PER_CONDITION_AND_TARGET (one per condition and entity). Default: PER_POLICY',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'list_nrql_conditions',
        description: 'List NRQL alert conditions for a specific policy using NerdGraph',
        inputSchema: {
          type: 'object',
          properties: {
            account_id: {
              type: 'number',
              description: 'New Relic account ID',
            },
            policy_id: {
              type: 'number',
              description: 'Alert policy ID to list conditions for',
            },
          },
          required: ['account_id', 'policy_id'],
        },
      },
      {
        name: 'create_nrql_condition',
        description: 'Create a NRQL alert condition on a policy via NerdGraph with threshold and signal configuration',
        inputSchema: {
          type: 'object',
          properties: {
            account_id: {
              type: 'number',
              description: 'New Relic account ID',
            },
            policy_id: {
              type: 'number',
              description: 'Alert policy ID to add the condition to',
            },
            name: {
              type: 'string',
              description: 'Name for the alert condition',
            },
            nrql: {
              type: 'string',
              description: 'NRQL query to evaluate (e.g. "SELECT average(duration) FROM Transaction")',
            },
            threshold: {
              type: 'number',
              description: 'Threshold value that triggers the alert',
            },
            threshold_duration: {
              type: 'number',
              description: 'Duration in seconds the threshold must be met before alerting (default: 300)',
            },
            operator: {
              type: 'string',
              description: 'Comparison operator: ABOVE, BELOW, EQUALS (default: ABOVE)',
            },
            priority: {
              type: 'string',
              description: 'Alert severity: CRITICAL or WARNING (default: CRITICAL)',
            },
          },
          required: ['account_id', 'policy_id', 'name', 'nrql', 'threshold'],
        },
      },
      {
        name: 'list_open_incidents',
        description: 'List currently open alert incidents in a New Relic account with optional policy and condition filters',
        inputSchema: {
          type: 'object',
          properties: {
            filter_policy_id: {
              type: 'number',
              description: 'Filter incidents by alert policy ID',
            },
            only_open: {
              type: 'boolean',
              description: 'Return only open (unresolved) incidents (default: true)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
          },
        },
      },
      {
        name: 'list_synthetic_monitors',
        description: 'List Synthetic monitors in New Relic via NerdGraph entitySearch; returns monitor name, type, GUID, and status',
        inputSchema: {
          type: 'object',
          properties: {
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response to retrieve the next page',
            },
            filter_name: {
              type: 'string',
              description: 'Filter monitors by name substring',
            },
          },
        },
      },
      {
        name: 'get_synthetic_monitor',
        description: 'Get details and recent check results for a specific Synthetic monitor by GUID',
        inputSchema: {
          type: 'object',
          properties: {
            guid: {
              type: 'string',
              description: 'New Relic entity GUID for the Synthetic monitor',
            },
          },
          required: ['guid'],
        },
      },
      {
        name: 'create_deployment_marker',
        description: 'Record a deployment marker on an APM application to track performance changes in New Relic',
        inputSchema: {
          type: 'object',
          properties: {
            application_id: {
              type: 'number',
              description: 'The APM application ID',
            },
            revision: {
              type: 'string',
              description: 'Deployment revision identifier (e.g. git commit SHA, version tag)',
            },
            description: {
              type: 'string',
              description: 'Human-readable description of the deployment',
            },
            user: {
              type: 'string',
              description: 'User or service that triggered the deployment',
            },
            timestamp: {
              type: 'string',
              description: 'ISO 8601 deployment timestamp (default: current time)',
            },
          },
          required: ['application_id', 'revision'],
        },
      },
      {
        name: 'list_key_transactions',
        description: 'List key transactions configured in New Relic APM with optional name filter',
        inputSchema: {
          type: 'object',
          properties: {
            filter_name: {
              type: 'string',
              description: 'Filter key transactions by name substring',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'query_nrql':
          return await this.queryNrql(args);
        case 'search_entities':
          return await this.searchEntities(args);
        case 'get_entity':
          return await this.getEntity(args);
        case 'list_applications':
          return await this.listApplications(args);
        case 'get_application':
          return await this.getApplication(args);
        case 'list_alert_policies':
          return await this.listAlertPolicies(args);
        case 'create_alert_policy':
          return await this.createAlertPolicy(args);
        case 'list_nrql_conditions':
          return await this.listNrqlConditions(args);
        case 'create_nrql_condition':
          return await this.createNrqlCondition(args);
        case 'list_open_incidents':
          return await this.listOpenIncidents(args);
        case 'list_synthetic_monitors':
          return await this.listSyntheticMonitors(args);
        case 'get_synthetic_monitor':
          return await this.getSyntheticMonitor(args);
        case 'create_deployment_marker':
          return await this.createDeploymentMarker(args);
        case 'list_key_transactions':
          return await this.listKeyTransactions(args);
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

  private get restHeaders(): Record<string, string> {
    return {
      'Api-Key': this.apiKey,
      'Content-Type': 'application/json',
    };
  }

  private async nerdgraph(query: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(this.graphqlUrl, {
      method: 'POST',
      headers: this.restHeaders,
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `NerdGraph error: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }

    let data: unknown;
    try { data = await response.json(); } catch {
      throw new Error(`New Relic returned non-JSON response (HTTP ${response.status})`);
    }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async queryNrql(args: Record<string, unknown>): Promise<ToolResult> {
    const accountId = args.account_id as number;
    const nrql = (args.nrql as string).replace(/"/g, '\\"');
    const gql = `{
      actor {
        account(id: ${accountId}) {
          nrql(query: "${nrql}") {
            results
            metadata { facets timeWindow { begin end } }
          }
        }
      }
    }`;
    return this.nerdgraph(gql);
  }

  private async searchEntities(args: Record<string, unknown>): Promise<ToolResult> {
    const query = (args.query as string).replace(/"/g, '\\"');
    const cursorArg = args.cursor ? `, cursor: "${encodeURIComponent(args.cursor as string)}"` : '';
    const gql = `{
      actor {
        entitySearch(query: "${query}"${cursorArg}) {
          results {
            nextCursor
            entities {
              guid name entityType domain accountId tags { key values }
              alertSeverity
            }
          }
          count
        }
      }
    }`;
    return this.nerdgraph(gql);
  }

  private async getEntity(args: Record<string, unknown>): Promise<ToolResult> {
    const guid = args.guid as string;
    const gql = `{
      actor {
        entity(guid: "${guid}") {
          guid name entityType domain accountId
          alertSeverity
          tags { key values }
          goldenMetrics {
            metrics {
              name title unit query
            }
          }
          ... on ApmApplicationEntity {
            applicationId
            language
            settings { apdexTarget }
          }
          ... on InfrastructureHostEntity {
            hostSummary { cpuUtilizationPercent memoryUsedPercent networkReceiveRate networkTransmitRate }
          }
        }
      }
    }`;
    return this.nerdgraph(gql);
  }

  private async listApplications(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.filter_name) params.append('filter[name]', args.filter_name as string);
    if (args.filter_language) params.append('filter[language]', args.filter_language as string);
    params.append('page', String((args.page as number) ?? 1));

    const response = await this.fetchWithRetry(`${this.baseUrl}/applications.json?${params}`, {
      method: 'GET',
      headers: this.restHeaders,
    });

    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }

    let data: unknown;
    try { data = await response.json(); } catch {
      throw new Error(`New Relic returned non-JSON response (HTTP ${response.status})`);
    }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getApplication(args: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}/applications/${encodeURIComponent(args.application_id as string)}.json`, {
      method: 'GET',
      headers: this.restHeaders,
    });

    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }

    let data: unknown;
    try { data = await response.json(); } catch {
      throw new Error(`New Relic returned non-JSON response (HTTP ${response.status})`);
    }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listAlertPolicies(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.filter_name) params.append('filter[name]', args.filter_name as string);
    params.append('page', String((args.page as number) ?? 1));

    const response = await this.fetchWithRetry(`${this.baseUrl}/alerts_policies.json?${params}`, {
      method: 'GET',
      headers: this.restHeaders,
    });

    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }

    let data: unknown;
    try { data = await response.json(); } catch {
      throw new Error(`New Relic returned non-JSON response (HTTP ${response.status})`);
    }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async createAlertPolicy(args: Record<string, unknown>): Promise<ToolResult> {
    const incidentPreference = (args.incident_preference as string) ?? 'PER_POLICY';
    const body = { policy: { name: args.name, incident_preference: incidentPreference } };

    const response = await this.fetchWithRetry(`${this.baseUrl}/alerts_policies.json`, {
      method: 'POST',
      headers: this.restHeaders,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `Failed to create alert policy: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }

    let data: unknown;
    try { data = await response.json(); } catch {
      throw new Error(`New Relic returned non-JSON response (HTTP ${response.status})`);
    }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listNrqlConditions(args: Record<string, unknown>): Promise<ToolResult> {
    const accountId = args.account_id as number;
    const policyId = args.policy_id as number;
    const gql = `{
      actor {
        account(id: ${accountId}) {
          alerts {
            nrqlConditionsSearch(searchCriteria: { policyId: ${policyId} }) {
              nrqlConditions {
                id name enabled
                nrql { query }
                signal { aggregationWindow evaluationOffset }
                terms { threshold thresholdDuration operator priority }
              }
              nextCursor
            }
          }
        }
      }
    }`;
    return this.nerdgraph(gql);
  }

  private async createNrqlCondition(args: Record<string, unknown>): Promise<ToolResult> {
    const accountId = args.account_id as number;
    const policyId = args.policy_id as number;
    const operator = (args.operator as string) ?? 'ABOVE';
    const priority = (args.priority as string) ?? 'CRITICAL';
    const thresholdDuration = (args.threshold_duration as number) ?? 300;
    const nrql = (args.nrql as string).replace(/"/g, '\\"');

    const gql = `mutation {
      alertsNrqlConditionStaticCreate(
        accountId: ${accountId}
        policyId: ${policyId}
        condition: {
          name: "${String(args.name).replace(/"/g, '\\"')}"
          enabled: true
          nrql: { query: "${nrql}" }
          terms: [{
            threshold: ${encodeURIComponent(args.threshold as string)}
            thresholdDuration: ${thresholdDuration}
            operator: ${operator}
            priority: ${priority}
            thresholdOccurrences: ALL
          }]
          signal: { aggregationWindow: 60 }
        }
      ) {
        id name enabled
        nrql { query }
        terms { threshold thresholdDuration operator priority }
      }
    }`;
    return this.nerdgraph(gql);
  }

  private async listOpenIncidents(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    const onlyOpen = args.only_open !== false;
    if (onlyOpen) params.set('filter[only_open]', 'true');
    if (args.filter_policy_id) params.set('filter[policy_id]', String(args.filter_policy_id));
    params.set('page', String((args.page as number) ?? 1));

    const response = await this.fetchWithRetry(`${this.baseUrl}/alerts_incidents.json?${params}`, {
      method: 'GET',
      headers: this.restHeaders,
    });

    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }

    let data: unknown;
    try { data = await response.json(); } catch {
      throw new Error(`New Relic returned non-JSON response (HTTP ${response.status})`);
    }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listSyntheticMonitors(args: Record<string, unknown>): Promise<ToolResult> {
    const cursorArg = args.cursor ? `, cursor: "${encodeURIComponent(args.cursor as string)}"` : '';
    const nameFilter = args.filter_name
      ? ` AND name LIKE '${String(args.filter_name).replace(/'/g, "\\'")}%'`
      : '';
    const gql = `{
      actor {
        entitySearch(query: "domain = 'SYNTH' AND type = 'MONITOR'${nameFilter}"${cursorArg}) {
          results {
            nextCursor
            entities {
              ... on SyntheticMonitorEntityOutline {
                guid name accountId monitorType monitorId
                alertSeverity
                tags { key values }
              }
            }
          }
          count
        }
      }
    }`;
    return this.nerdgraph(gql);
  }

  private async getSyntheticMonitor(args: Record<string, unknown>): Promise<ToolResult> {
    const guid = args.guid as string;
    const gql = `{
      actor {
        entity(guid: "${guid}") {
          guid name
          ... on SyntheticMonitorEntity {
            monitorId monitorType period status
            tags { key values }
            recentAlertViolations { alertSeverity closedAt label openedAt }
          }
        }
      }
    }`;
    return this.nerdgraph(gql);
  }

  private async createDeploymentMarker(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {
      deployment: {
        revision: args.revision,
      },
    };
    if (args.description) (body.deployment as Record<string, unknown>).description = args.description;
    if (args.user) (body.deployment as Record<string, unknown>).user = args.user;
    if (args.timestamp) (body.deployment as Record<string, unknown>).timestamp = args.timestamp;

    const response = await this.fetchWithRetry(`${this.baseUrl}/applications/${encodeURIComponent(args.application_id as string)}/deployments.json`, {
      method: 'POST',
      headers: this.restHeaders,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `Failed to create deployment marker: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }

    let data: unknown;
    try { data = await response.json(); } catch {
      throw new Error(`New Relic returned non-JSON response (HTTP ${response.status})`);
    }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listKeyTransactions(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.filter_name) params.append('filter[name]', args.filter_name as string);
    params.append('page', String((args.page as number) ?? 1));

    const response = await this.fetchWithRetry(`${this.baseUrl}/key_transactions.json?${params}`, {
      method: 'GET',
      headers: this.restHeaders,
    });

    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }

    let data: unknown;
    try { data = await response.json(); } catch {
      throw new Error(`New Relic returned non-JSON response (HTTP ${response.status})`);
    }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }
}

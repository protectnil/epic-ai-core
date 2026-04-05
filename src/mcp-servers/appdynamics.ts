/**
 * Cisco AppDynamics MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28 (no Cisco/AppDynamics-published server).
//   Community: https://github.com/asafkiv/appdynamics-mcp-server — transport: stdio,
//   auth: OAuth2 client credentials; 30 tools; last commit Mar 10, 2026.
//   NOT adopted: community repo (not official Cisco/AppDynamics source), fails criteria 1.
// Our adapter covers: 15 tools. Community MCP covers: 30 tools.
// Recommendation: use-rest-api — no official vendor MCP meets all four adoption criteria.
//   Monitor asafkiv/appdynamics-mcp-server for potential future use-both evaluation.
//
// Base URL: https://{account}.saas.appdynamics.com (SaaS) or http://controller.internal:8090 (on-prem)
//   Set via controllerUrl in config. Endpoints split across /controller/rest/, /controller/alerting/rest/v1/,
//   and /controller/sim/v2/user/ depending on API area.
// Auth: HTTP Basic — username format: username@accountName (e.g. admin@myaccount).
//   On-prem: admin@customer1. SaaS: admin@myaccount.
//   Password: Controller UI password.
// Docs: https://help.splunk.com/en/appdynamics-on-premises/extend-appdynamics/25.11.0/extend-splunk-appdynamics/splunk-appdynamics-apis/overview-of-splunk-appdynamics-apis
// Rate limits: Not publicly documented. Recommend < 60 req/min for production controllers.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface AppDynamicsConfig {
  controllerUrl: string;
  username: string;
  accountName: string;
  password: string;
}

export class AppDynamicsMCPServer extends MCPAdapterBase {
  private readonly controllerUrl: string;
  private readonly authHeader: string;

  constructor(config: AppDynamicsConfig) {
    super();
    this.controllerUrl = config.controllerUrl.replace(/\/$/, '');
    const credentials = `${config.username}@${config.accountName}:${config.password}`;
    this.authHeader = `Basic ${Buffer.from(credentials).toString('base64')}`;
  }

  private get headers(): Record<string, string> {
    return {
      Authorization: this.authHeader,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    };
  }

  private buildTimeParams(args: Record<string, unknown>): string {
    const timeRangeType = (args.time_range_type as string) || 'BEFORE_NOW';
    const durationInMins = (args.duration_in_mins as number) || 60;
    return `time-range-type=${encodeURIComponent(timeRangeType)}&duration-in-mins=${durationInMins}`;
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_applications',
        description: 'List all monitored applications registered in the AppDynamics Controller with their IDs, names, and descriptions.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_application',
        description: 'Get details for a specific application in AppDynamics by name or numeric ID.',
        inputSchema: {
          type: 'object',
          properties: {
            application_id: {
              type: 'string',
              description: 'Application name or numeric ID',
            },
          },
          required: ['application_id'],
        },
      },
      {
        name: 'list_tiers',
        description: 'List all tiers (service components, e.g. web servers, app servers, microservices) within an AppDynamics application.',
        inputSchema: {
          type: 'object',
          properties: {
            application_id: {
              type: 'string',
              description: 'Application name or numeric ID',
            },
          },
          required: ['application_id'],
        },
      },
      {
        name: 'list_nodes',
        description: 'List all nodes (individual JVM/process instances) within an AppDynamics application, including tier membership and machine agent status.',
        inputSchema: {
          type: 'object',
          properties: {
            application_id: {
              type: 'string',
              description: 'Application name or numeric ID',
            },
          },
          required: ['application_id'],
        },
      },
      {
        name: 'list_nodes_for_tier',
        description: 'List all nodes belonging to a specific tier within an AppDynamics application.',
        inputSchema: {
          type: 'object',
          properties: {
            application_id: {
              type: 'string',
              description: 'Application name or numeric ID',
            },
            tier_id: {
              type: 'string',
              description: 'Tier name or numeric ID',
            },
          },
          required: ['application_id', 'tier_id'],
        },
      },
      {
        name: 'list_business_transactions',
        description: 'List all business transactions tracked within an AppDynamics application, with tier, entry point type, and performance stats.',
        inputSchema: {
          type: 'object',
          properties: {
            application_id: {
              type: 'string',
              description: 'Application name or numeric ID',
            },
          },
          required: ['application_id'],
        },
      },
      {
        name: 'list_backends',
        description: 'List all registered backends (databases, queues, external services) detected by AppDynamics agents in an application.',
        inputSchema: {
          type: 'object',
          properties: {
            application_id: {
              type: 'string',
              description: 'Application name or numeric ID',
            },
          },
          required: ['application_id'],
        },
      },
      {
        name: 'get_metric_data',
        description: 'Retrieve time-series metric data for an application. Metric paths use pipe-separated segments (e.g. "Overall Application Performance|Average Response Time (ms)").',
        inputSchema: {
          type: 'object',
          properties: {
            application_id: {
              type: 'string',
              description: 'Application name or numeric ID',
            },
            metric_path: {
              type: 'string',
              description: 'Full metric path (e.g. "Overall Application Performance|Average Response Time (ms)" or "Business Transaction Performance|Business Transactions|Default Tier|my-txn|Average Response Time (ms)")',
            },
            time_range_type: {
              type: 'string',
              description: 'Time range type: BEFORE_NOW, BEFORE_TIME, AFTER_TIME, or BETWEEN_TIMES (default: BEFORE_NOW)',
            },
            duration_in_mins: {
              type: 'number',
              description: 'Duration in minutes before now when time_range_type is BEFORE_NOW (default: 60)',
            },
            rollup: {
              type: 'boolean',
              description: 'Whether to roll up all data points into a single aggregate value (default: false)',
            },
          },
          required: ['application_id', 'metric_path'],
        },
      },
      {
        name: 'list_metric_tree',
        description: 'Browse the metric hierarchy tree for an application at a given path prefix. Use to discover available metric paths.',
        inputSchema: {
          type: 'object',
          properties: {
            application_id: {
              type: 'string',
              description: 'Application name or numeric ID',
            },
            metric_path: {
              type: 'string',
              description: 'Partial metric path prefix to list children under (e.g. "Overall Application Performance" or "" for root)',
            },
          },
          required: ['application_id'],
        },
      },
      {
        name: 'list_health_rule_violations',
        description: 'List health rule violations (policy breach events) for an application within a time range, including violation severity and affected entity.',
        inputSchema: {
          type: 'object',
          properties: {
            application_id: {
              type: 'string',
              description: 'Application name or numeric ID',
            },
            time_range_type: {
              type: 'string',
              description: 'Time range type: BEFORE_NOW, BEFORE_TIME, AFTER_TIME, or BETWEEN_TIMES (default: BEFORE_NOW)',
            },
            duration_in_mins: {
              type: 'number',
              description: 'Duration in minutes before now when time_range_type is BEFORE_NOW (default: 60)',
            },
          },
          required: ['application_id'],
        },
      },
      {
        name: 'list_health_rules',
        description: 'List all health rules configured for an AppDynamics application, including their conditions, affected entity types, and enabled status.',
        inputSchema: {
          type: 'object',
          properties: {
            application_id: {
              type: 'string',
              description: 'Application name or numeric ID',
            },
          },
          required: ['application_id'],
        },
      },
      {
        name: 'list_events',
        description: 'List application events (errors, exceptions, policy violations, deployments, etc.) within a time range.',
        inputSchema: {
          type: 'object',
          properties: {
            application_id: {
              type: 'string',
              description: 'Application name or numeric ID',
            },
            event_types: {
              type: 'string',
              description: 'Comma-separated event types: APPLICATION_ERROR, DIAGNOSTIC_SESSION, POLICY_OPEN, POLICY_CLOSE, POLICY_CANCELLED, POLICY_UPGRADED, POLICY_DOWNGRADED, RESOURCE_POOL_RUN_OUT_OF_THREADS, STALL, DEADLOCK, APPLICATION_CONFIG_CHANGE, APPLICATION_DEPLOYMENT',
            },
            severities: {
              type: 'string',
              description: 'Comma-separated severity levels: INFO, WARN, ERROR (default: INFO,WARN,ERROR)',
            },
            time_range_type: {
              type: 'string',
              description: 'Time range type: BEFORE_NOW, BEFORE_TIME, AFTER_TIME, or BETWEEN_TIMES (default: BEFORE_NOW)',
            },
            duration_in_mins: {
              type: 'number',
              description: 'Duration in minutes before now when time_range_type is BEFORE_NOW (default: 60)',
            },
          },
          required: ['application_id', 'event_types'],
        },
      },
      {
        name: 'list_snapshots',
        description: 'List transaction snapshots (slow or error call chain captures) for an application, including call graph and SQL details.',
        inputSchema: {
          type: 'object',
          properties: {
            application_id: {
              type: 'string',
              description: 'Application name or numeric ID',
            },
            time_range_type: {
              type: 'string',
              description: 'Time range type: BEFORE_NOW, BEFORE_TIME, AFTER_TIME, or BETWEEN_TIMES (default: BEFORE_NOW)',
            },
            duration_in_mins: {
              type: 'number',
              description: 'Duration in minutes before now when time_range_type is BEFORE_NOW (default: 60)',
            },
            maximum_results: {
              type: 'number',
              description: 'Maximum number of snapshots to return (default: 600)',
            },
            business_transaction_id: {
              type: 'number',
              description: 'Filter snapshots to a specific business transaction ID',
            },
          },
          required: ['application_id'],
        },
      },
      {
        name: 'list_service_endpoints',
        description: 'List service endpoints detected in an AppDynamics application tier (Java/.NET only). Service endpoints represent individual URL-level operations.',
        inputSchema: {
          type: 'object',
          properties: {
            application_id: {
              type: 'string',
              description: 'Application name or numeric ID',
            },
            tier_id: {
              type: 'string',
              description: 'Tier name or numeric ID',
            },
          },
          required: ['application_id', 'tier_id'],
        },
      },
      {
        name: 'list_machines',
        description: 'List all machines (hosts) monitored by the AppDynamics Machine Agent in a Controller account.',
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
        case 'list_applications':
          return await this.listApplications();
        case 'get_application':
          return await this.getApplication(args);
        case 'list_tiers':
          return await this.listTiers(args);
        case 'list_nodes':
          return await this.listNodes(args);
        case 'list_nodes_for_tier':
          return await this.listNodesForTier(args);
        case 'list_business_transactions':
          return await this.listBusinessTransactions(args);
        case 'list_backends':
          return await this.listBackends(args);
        case 'get_metric_data':
          return await this.getMetricData(args);
        case 'list_metric_tree':
          return await this.listMetricTree(args);
        case 'list_health_rule_violations':
          return await this.listHealthRuleViolations(args);
        case 'list_health_rules':
          return await this.listHealthRules(args);
        case 'list_events':
          return await this.listEvents(args);
        case 'list_snapshots':
          return await this.listSnapshots(args);
        case 'list_service_endpoints':
          return await this.listServiceEndpoints(args);
        case 'list_machines':
          return await this.listMachines();
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

  private async listApplications(): Promise<ToolResult> {
    const response = await this.fetchWithRetry(
      `${this.controllerUrl}/controller/rest/applications?output=JSON`,
      { method: 'GET', headers: this.headers },
    );

    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `Failed to list applications: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }

    const data = await response.json();
    return {
      content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }],
      isError: false,
    };
  }

  private async getApplication(args: Record<string, unknown>): Promise<ToolResult> {
    const applicationId = args.application_id as string;

    const response = await this.fetchWithRetry(
      `${this.controllerUrl}/controller/rest/applications/${encodeURIComponent(applicationId)}?output=JSON`,
      { method: 'GET', headers: this.headers },
    );

    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `Failed to get application: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }

    const data = await response.json();
    return {
      content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }],
      isError: false,
    };
  }

  private async listTiers(args: Record<string, unknown>): Promise<ToolResult> {
    const applicationId = args.application_id as string;

    const response = await this.fetchWithRetry(
      `${this.controllerUrl}/controller/rest/applications/${encodeURIComponent(applicationId)}/tiers?output=JSON`,
      { method: 'GET', headers: this.headers },
    );

    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `Failed to list tiers: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }

    const data = await response.json();
    return {
      content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }],
      isError: false,
    };
  }

  private async listNodes(args: Record<string, unknown>): Promise<ToolResult> {
    const applicationId = args.application_id as string;

    const response = await this.fetchWithRetry(
      `${this.controllerUrl}/controller/rest/applications/${encodeURIComponent(applicationId)}/nodes?output=JSON`,
      { method: 'GET', headers: this.headers },
    );

    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `Failed to list nodes: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }

    const data = await response.json();
    return {
      content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }],
      isError: false,
    };
  }

  private async listNodesForTier(args: Record<string, unknown>): Promise<ToolResult> {
    const applicationId = args.application_id as string;
    const tierId = args.tier_id as string;

    const response = await this.fetchWithRetry(
      `${this.controllerUrl}/controller/rest/applications/${encodeURIComponent(applicationId)}/tiers/${encodeURIComponent(tierId)}/nodes?output=JSON`,
      { method: 'GET', headers: this.headers },
    );

    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `Failed to list nodes for tier: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }

    const data = await response.json();
    return {
      content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }],
      isError: false,
    };
  }

  private async listBusinessTransactions(args: Record<string, unknown>): Promise<ToolResult> {
    const applicationId = args.application_id as string;

    const response = await this.fetchWithRetry(
      `${this.controllerUrl}/controller/rest/applications/${encodeURIComponent(applicationId)}/business-transactions?output=JSON`,
      { method: 'GET', headers: this.headers },
    );

    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `Failed to list business transactions: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }

    const data = await response.json();
    return {
      content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }],
      isError: false,
    };
  }

  private async listBackends(args: Record<string, unknown>): Promise<ToolResult> {
    const applicationId = args.application_id as string;

    const response = await this.fetchWithRetry(
      `${this.controllerUrl}/controller/rest/applications/${encodeURIComponent(applicationId)}/backends?output=JSON`,
      { method: 'GET', headers: this.headers },
    );

    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `Failed to list backends: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }

    const data = await response.json();
    return {
      content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }],
      isError: false,
    };
  }

  private async getMetricData(args: Record<string, unknown>): Promise<ToolResult> {
    const applicationId = args.application_id as string;
    const metricPath = args.metric_path as string;
    const rollup = (args.rollup as boolean) || false;

    const url = `${this.controllerUrl}/controller/rest/applications/${encodeURIComponent(applicationId)}/metric-data?metric-path=${encodeURIComponent(metricPath)}&${this.buildTimeParams(args)}&rollup=${rollup}&output=JSON`;
    const response = await this.fetchWithRetry(url, { method: 'GET', headers: this.headers });

    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `Failed to get metric data: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }

    const data = await response.json();
    return {
      content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }],
      isError: false,
    };
  }

  private async listMetricTree(args: Record<string, unknown>): Promise<ToolResult> {
    const applicationId = args.application_id as string;
    const metricPath = (args.metric_path as string) || '';

    const url = `${this.controllerUrl}/controller/rest/applications/${encodeURIComponent(applicationId)}/metrics?metric-path=${encodeURIComponent(metricPath)}&output=JSON`;
    const response = await this.fetchWithRetry(url, { method: 'GET', headers: this.headers });

    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `Failed to list metric tree: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }

    const data = await response.json();
    return {
      content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }],
      isError: false,
    };
  }

  private async listHealthRuleViolations(args: Record<string, unknown>): Promise<ToolResult> {
    const applicationId = args.application_id as string;

    const url = `${this.controllerUrl}/controller/rest/applications/${encodeURIComponent(applicationId)}/problems/healthrule-violations?${this.buildTimeParams(args)}&output=JSON`;
    const response = await this.fetchWithRetry(url, { method: 'GET', headers: this.headers });

    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `Failed to list health rule violations: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }

    const data = await response.json();
    return {
      content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }],
      isError: false,
    };
  }

  private async listHealthRules(args: Record<string, unknown>): Promise<ToolResult> {
    const applicationId = args.application_id as string;

    const response = await this.fetchWithRetry(
      `${this.controllerUrl}/controller/alerting/rest/v1/applications/${encodeURIComponent(applicationId)}/health-rules`,
      { method: 'GET', headers: this.headers },
    );

    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `Failed to list health rules: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }

    const data = await response.json();
    return {
      content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }],
      isError: false,
    };
  }

  private async listEvents(args: Record<string, unknown>): Promise<ToolResult> {
    const applicationId = args.application_id as string;
    const eventTypes = args.event_types as string;
    const severities = (args.severities as string) || 'INFO,WARN,ERROR';

    const url = `${this.controllerUrl}/controller/rest/applications/${encodeURIComponent(applicationId)}/events?${this.buildTimeParams(args)}&event-types=${encodeURIComponent(eventTypes)}&severities=${encodeURIComponent(severities)}&output=JSON`;
    const response = await this.fetchWithRetry(url, { method: 'GET', headers: this.headers });

    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `Failed to list events: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }

    const data = await response.json();
    return {
      content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }],
      isError: false,
    };
  }

  private async listSnapshots(args: Record<string, unknown>): Promise<ToolResult> {
    const applicationId = args.application_id as string;
    const maximumResults = (args.maximum_results as number) || 600;

    let url = `${this.controllerUrl}/controller/rest/applications/${encodeURIComponent(applicationId)}/request-snapshots?${this.buildTimeParams(args)}&maximum-results=${maximumResults}&output=JSON`;
    if (args.business_transaction_id) {
      url += `&business-transaction-id=${encodeURIComponent(args.business_transaction_id as string)}`;
    }

    const response = await this.fetchWithRetry(url, { method: 'GET', headers: this.headers });

    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `Failed to list snapshots: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }

    const data = await response.json();
    return {
      content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }],
      isError: false,
    };
  }

  private async listServiceEndpoints(args: Record<string, unknown>): Promise<ToolResult> {
    const applicationId = args.application_id as string;
    const tierId = args.tier_id as string;

    const response = await this.fetchWithRetry(
      `${this.controllerUrl}/controller/rest/applications/${encodeURIComponent(applicationId)}/tiers/${encodeURIComponent(tierId)}/service-endpoints?output=JSON`,
      { method: 'GET', headers: this.headers },
    );

    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `Failed to list service endpoints: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }

    const data = await response.json();
    return {
      content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }],
      isError: false,
    };
  }

  private async listMachines(): Promise<ToolResult> {
    const response = await this.fetchWithRetry(
      `${this.controllerUrl}/controller/sim/v2/user/machines`,
      { method: 'GET', headers: this.headers },
    );

    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `Failed to list machines: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }

    const data = await response.json();
    return {
      content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }],
      isError: false,
    };
  }

  static catalog() {
    return {
      name: 'appdynamics',
      displayName: 'Cisco AppDynamics',
      version: '1.0.0',
      category: 'observability' as const,
      keywords: ['appdynamics', 'cisco', 'apm', 'monitoring', 'performance', 'transactions', 'metrics', 'health', 'incidents', 'traces', 'snapshots'],
      toolNames: [
        'list_applications', 'get_application', 'list_tiers', 'list_nodes',
        'list_nodes_for_tier', 'list_business_transactions', 'list_backends',
        'get_metric_data', 'list_metric_tree', 'list_health_rule_violations',
        'list_health_rules', 'list_events', 'list_snapshots',
        'list_service_endpoints', 'list_machines',
      ],
      description: 'AppDynamics APM: monitor applications, tiers, nodes, business transactions, metrics, health rules, events, and transaction snapshots.',
      author: 'protectnil' as const,
    };
  }
}

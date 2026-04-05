/**
 * InfluxData MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// No official InfluxData MCP server was found on GitHub or any MCP registry.
// This adapter targets the InfluxDB OSS API v2 (self-hosted or InfluxDB Cloud).
//
// Base URL: http://localhost:8086/api/v2 (self-hosted default; override for cloud)
// Auth: Token auth via Authorization header ("Token <api-token>") or Basic auth (username/password)
// Docs: https://docs.influxdata.com/influxdb/v2/api/
// Rate limits: Varies by deployment; InfluxDB Cloud: tiered by plan (free: 300MB write/day)

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface InfluxDataConfig {
  apiToken?: string;
  username?: string;
  password?: string;
  baseUrl?: string;
}

export class InfluxDataMCPServer extends MCPAdapterBase {
  private readonly apiToken: string | null;
  private readonly username: string | null;
  private readonly password: string | null;
  private readonly baseUrl: string;

  constructor(config: InfluxDataConfig) {
    super();
    this.apiToken = config.apiToken ?? null;
    this.username = config.username ?? null;
    this.password = config.password ?? null;
    this.baseUrl = config.baseUrl || 'http://localhost:8086/api/v2';
  }

  static catalog() {
    return {
      name: 'influxdata',
      displayName: 'InfluxDB',
      version: '1.0.0',
      category: 'data',
      keywords: [
        'influxdb', 'influxdata', 'time-series', 'timeseries', 'metrics', 'telemetry',
        'flux', 'query', 'bucket', 'measurement', 'dashboard', 'task', 'scraper',
        'organization', 'monitoring', 'alert', 'check', 'notification', 'iot',
        'sensor', 'data', 'database', 'write', 'ingest',
      ],
      toolNames: [
        'query_data', 'get_buckets', 'create_bucket', 'delete_bucket', 'get_bucket',
        'update_bucket', 'delete_time_series', 'get_organizations', 'create_organization',
        'get_organization', 'update_organization', 'delete_organization',
        'get_tasks', 'create_task', 'get_task', 'update_task', 'delete_task',
        'get_dashboards', 'create_dashboard', 'get_dashboard', 'delete_dashboard',
        'get_checks', 'get_check', 'delete_check',
        'get_notification_rules', 'get_notification_endpoints',
        'get_scrapers', 'create_scraper', 'get_scraper', 'delete_scraper',
        'get_labels', 'create_label', 'get_label', 'delete_label',
        'get_authorizations', 'create_authorization', 'delete_authorization',
        'get_health', 'get_ready', 'get_me',
      ],
      description: 'InfluxDB time-series database: query Flux/InfluxQL data, manage buckets, tasks, dashboards, alerts, scrapers, and organizations.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'query_data',
        description: 'Execute a Flux or InfluxQL query against InfluxDB and return time-series data results',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Flux or InfluxQL query string to execute',
            },
            org: {
              type: 'string',
              description: 'Organization name or ID to query against',
            },
            org_id: {
              type: 'string',
              description: 'Organization ID (alternative to org name)',
            },
            type: {
              type: 'string',
              description: 'Query language: flux (default) or influxql',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'get_buckets',
        description: 'List all buckets in an organization with optional name filter and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            org: {
              type: 'string',
              description: 'Organization name to filter buckets by',
            },
            org_id: {
              type: 'string',
              description: 'Organization ID to filter buckets by',
            },
            name: {
              type: 'string',
              description: 'Bucket name to filter by (exact match)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of buckets to return (default: 20, max: 100)',
            },
            offset: {
              type: 'number',
              description: 'Offset for pagination (default: 0)',
            },
          },
        },
      },
      {
        name: 'create_bucket',
        description: 'Create a new InfluxDB bucket in an organization with a retention policy',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Name for the new bucket',
            },
            org_id: {
              type: 'string',
              description: 'Organization ID to create the bucket in',
            },
            retention_seconds: {
              type: 'number',
              description: 'Data retention period in seconds (0 = forever, default: 0)',
            },
            description: {
              type: 'string',
              description: 'Optional description for the bucket',
            },
          },
          required: ['name', 'org_id'],
        },
      },
      {
        name: 'get_bucket',
        description: 'Retrieve details about a specific bucket by its ID, including name, retention rules, and organization',
        inputSchema: {
          type: 'object',
          properties: {
            bucket_id: {
              type: 'string',
              description: 'Bucket ID to retrieve',
            },
          },
          required: ['bucket_id'],
        },
      },
      {
        name: 'update_bucket',
        description: 'Update a bucket\'s name, description, or retention policy settings',
        inputSchema: {
          type: 'object',
          properties: {
            bucket_id: {
              type: 'string',
              description: 'Bucket ID to update',
            },
            name: {
              type: 'string',
              description: 'New name for the bucket',
            },
            description: {
              type: 'string',
              description: 'New description for the bucket',
            },
            retention_seconds: {
              type: 'number',
              description: 'New retention period in seconds (0 = forever)',
            },
          },
          required: ['bucket_id'],
        },
      },
      {
        name: 'delete_bucket',
        description: 'Delete a bucket and all its data permanently — this action is irreversible',
        inputSchema: {
          type: 'object',
          properties: {
            bucket_id: {
              type: 'string',
              description: 'Bucket ID to delete',
            },
          },
          required: ['bucket_id'],
        },
      },
      {
        name: 'delete_time_series',
        description: 'Delete time-series data from a bucket within a specified time range and optional tag filters',
        inputSchema: {
          type: 'object',
          properties: {
            org: {
              type: 'string',
              description: 'Organization name',
            },
            bucket: {
              type: 'string',
              description: 'Bucket name to delete data from',
            },
            org_id: {
              type: 'string',
              description: 'Organization ID (alternative to org name)',
            },
            bucket_id: {
              type: 'string',
              description: 'Bucket ID (alternative to bucket name)',
            },
            start: {
              type: 'string',
              description: 'Start time for delete range in RFC3339 format (e.g., "2021-01-01T00:00:00Z")',
            },
            stop: {
              type: 'string',
              description: 'Stop time for delete range in RFC3339 format',
            },
            predicate: {
              type: 'string',
              description: 'Tag filter predicate (e.g., \'_measurement="cpu" AND host="server1"\')',
            },
          },
          required: ['start', 'stop'],
        },
      },
      {
        name: 'get_organizations',
        description: 'List all organizations in the InfluxDB instance with optional name filter',
        inputSchema: {
          type: 'object',
          properties: {
            org: {
              type: 'string',
              description: 'Organization name to filter by (exact match)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of organizations to return (default: 20)',
            },
            offset: {
              type: 'number',
              description: 'Offset for pagination (default: 0)',
            },
          },
        },
      },
      {
        name: 'create_organization',
        description: 'Create a new organization in InfluxDB with an optional description',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Name for the new organization',
            },
            description: {
              type: 'string',
              description: 'Optional description for the organization',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'get_organization',
        description: 'Retrieve details about a specific organization by its ID',
        inputSchema: {
          type: 'object',
          properties: {
            org_id: {
              type: 'string',
              description: 'Organization ID to retrieve',
            },
          },
          required: ['org_id'],
        },
      },
      {
        name: 'update_organization',
        description: 'Update an organization\'s name or description',
        inputSchema: {
          type: 'object',
          properties: {
            org_id: {
              type: 'string',
              description: 'Organization ID to update',
            },
            name: {
              type: 'string',
              description: 'New organization name',
            },
            description: {
              type: 'string',
              description: 'New organization description',
            },
          },
          required: ['org_id'],
        },
      },
      {
        name: 'delete_organization',
        description: 'Delete an organization and all its resources — this action is irreversible',
        inputSchema: {
          type: 'object',
          properties: {
            org_id: {
              type: 'string',
              description: 'Organization ID to delete',
            },
          },
          required: ['org_id'],
        },
      },
      {
        name: 'get_tasks',
        description: 'List all scheduled tasks (Flux scripts that run on a schedule) with optional filters by name, user, or organization',
        inputSchema: {
          type: 'object',
          properties: {
            org: {
              type: 'string',
              description: 'Organization name to filter tasks by',
            },
            user: {
              type: 'string',
              description: 'User ID to filter tasks by owner',
            },
            name: {
              type: 'string',
              description: 'Task name to filter by',
            },
            after: {
              type: 'string',
              description: 'Return tasks after this task ID (pagination cursor)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of tasks to return (default: 100)',
            },
          },
        },
      },
      {
        name: 'create_task',
        description: 'Create a new scheduled Flux task that runs on a cron or every-interval schedule',
        inputSchema: {
          type: 'object',
          properties: {
            flux: {
              type: 'string',
              description: 'Flux script with task option (e.g., option task = {name: "my-task", every: 1h})',
            },
            org_id: {
              type: 'string',
              description: 'Organization ID to create the task in',
            },
            description: {
              type: 'string',
              description: 'Optional description for the task',
            },
          },
          required: ['flux', 'org_id'],
        },
      },
      {
        name: 'get_task',
        description: 'Retrieve details about a specific scheduled task by its ID, including Flux script and schedule',
        inputSchema: {
          type: 'object',
          properties: {
            task_id: {
              type: 'string',
              description: 'Task ID to retrieve',
            },
          },
          required: ['task_id'],
        },
      },
      {
        name: 'update_task',
        description: 'Update a task\'s Flux script, description, or status (active/inactive)',
        inputSchema: {
          type: 'object',
          properties: {
            task_id: {
              type: 'string',
              description: 'Task ID to update',
            },
            flux: {
              type: 'string',
              description: 'Updated Flux script',
            },
            description: {
              type: 'string',
              description: 'Updated task description',
            },
            status: {
              type: 'string',
              description: 'Task status: active or inactive',
            },
          },
          required: ['task_id'],
        },
      },
      {
        name: 'delete_task',
        description: 'Delete a scheduled task by its ID',
        inputSchema: {
          type: 'object',
          properties: {
            task_id: {
              type: 'string',
              description: 'Task ID to delete',
            },
          },
          required: ['task_id'],
        },
      },
      {
        name: 'get_dashboards',
        description: 'List all dashboards with optional owner filter, including cell and variable configurations',
        inputSchema: {
          type: 'object',
          properties: {
            owner: {
              type: 'string',
              description: 'User ID to filter dashboards by owner',
            },
            org: {
              type: 'string',
              description: 'Organization name to filter dashboards',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of dashboards to return (default: 20)',
            },
            offset: {
              type: 'number',
              description: 'Offset for pagination (default: 0)',
            },
          },
        },
      },
      {
        name: 'create_dashboard',
        description: 'Create a new dashboard in an organization with a name and optional description',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Name for the new dashboard',
            },
            org_id: {
              type: 'string',
              description: 'Organization ID to create the dashboard in',
            },
            description: {
              type: 'string',
              description: 'Optional description for the dashboard',
            },
          },
          required: ['name', 'org_id'],
        },
      },
      {
        name: 'get_dashboard',
        description: 'Retrieve a specific dashboard by its ID including all cells, queries, and visualizations',
        inputSchema: {
          type: 'object',
          properties: {
            dashboard_id: {
              type: 'string',
              description: 'Dashboard ID to retrieve',
            },
            include: {
              type: 'string',
              description: 'Additional properties to include: properties (cell view properties)',
            },
          },
          required: ['dashboard_id'],
        },
      },
      {
        name: 'delete_dashboard',
        description: 'Delete a dashboard and all its cells permanently',
        inputSchema: {
          type: 'object',
          properties: {
            dashboard_id: {
              type: 'string',
              description: 'Dashboard ID to delete',
            },
          },
          required: ['dashboard_id'],
        },
      },
      {
        name: 'get_checks',
        description: 'List all monitoring checks for an organization that evaluate query results and trigger notifications',
        inputSchema: {
          type: 'object',
          properties: {
            org_id: {
              type: 'string',
              description: 'Organization ID to list checks for',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of checks to return (default: 20)',
            },
            offset: {
              type: 'number',
              description: 'Offset for pagination (default: 0)',
            },
          },
          required: ['org_id'],
        },
      },
      {
        name: 'get_check',
        description: 'Retrieve a specific monitoring check by its ID including threshold configurations',
        inputSchema: {
          type: 'object',
          properties: {
            check_id: {
              type: 'string',
              description: 'Check ID to retrieve',
            },
          },
          required: ['check_id'],
        },
      },
      {
        name: 'delete_check',
        description: 'Delete a monitoring check by its ID',
        inputSchema: {
          type: 'object',
          properties: {
            check_id: {
              type: 'string',
              description: 'Check ID to delete',
            },
          },
          required: ['check_id'],
        },
      },
      {
        name: 'get_notification_rules',
        description: 'List all notification rules for an organization that define when and how to send alerts',
        inputSchema: {
          type: 'object',
          properties: {
            org_id: {
              type: 'string',
              description: 'Organization ID to list notification rules for',
            },
            check_id: {
              type: 'string',
              description: 'Filter rules by associated check ID',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of rules to return (default: 20)',
            },
          },
          required: ['org_id'],
        },
      },
      {
        name: 'get_notification_endpoints',
        description: 'List all notification endpoints (Slack, PagerDuty, HTTP, etc.) configured in an organization',
        inputSchema: {
          type: 'object',
          properties: {
            org_id: {
              type: 'string',
              description: 'Organization ID to list notification endpoints for',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of endpoints to return (default: 20)',
            },
            offset: {
              type: 'number',
              description: 'Offset for pagination (default: 0)',
            },
          },
          required: ['org_id'],
        },
      },
      {
        name: 'get_scrapers',
        description: 'List all Prometheus scraper targets with optional filters by name, organization, or bucket',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Scraper name to filter by',
            },
            org_id: {
              type: 'string',
              description: 'Organization ID to filter scrapers by',
            },
            org: {
              type: 'string',
              description: 'Organization name to filter scrapers by',
            },
          },
        },
      },
      {
        name: 'create_scraper',
        description: 'Create a new Prometheus scraper target that periodically fetches metrics from a URL and writes to a bucket',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Name for the scraper target',
            },
            url: {
              type: 'string',
              description: 'URL to scrape Prometheus metrics from',
            },
            bucket_id: {
              type: 'string',
              description: 'Bucket ID to write scraped metrics to',
            },
            org_id: {
              type: 'string',
              description: 'Organization ID to create the scraper in',
            },
          },
          required: ['name', 'url', 'bucket_id', 'org_id'],
        },
      },
      {
        name: 'get_scraper',
        description: 'Retrieve details about a specific Prometheus scraper target by its ID',
        inputSchema: {
          type: 'object',
          properties: {
            scraper_id: {
              type: 'string',
              description: 'Scraper target ID to retrieve',
            },
          },
          required: ['scraper_id'],
        },
      },
      {
        name: 'delete_scraper',
        description: 'Delete a Prometheus scraper target by its ID',
        inputSchema: {
          type: 'object',
          properties: {
            scraper_id: {
              type: 'string',
              description: 'Scraper target ID to delete',
            },
          },
          required: ['scraper_id'],
        },
      },
      {
        name: 'get_labels',
        description: 'List all labels defined in an organization, used for tagging resources like buckets and dashboards',
        inputSchema: {
          type: 'object',
          properties: {
            org_id: {
              type: 'string',
              description: 'Organization ID to list labels for',
            },
          },
        },
      },
      {
        name: 'create_label',
        description: 'Create a new label for tagging InfluxDB resources with an optional color and description',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Label name',
            },
            org_id: {
              type: 'string',
              description: 'Organization ID to create the label in',
            },
            color: {
              type: 'string',
              description: 'Hex color code for the label (e.g., "#FF0000")',
            },
            description: {
              type: 'string',
              description: 'Optional description for the label',
            },
          },
          required: ['name', 'org_id'],
        },
      },
      {
        name: 'get_label',
        description: 'Retrieve a specific label by its ID',
        inputSchema: {
          type: 'object',
          properties: {
            label_id: {
              type: 'string',
              description: 'Label ID to retrieve',
            },
          },
          required: ['label_id'],
        },
      },
      {
        name: 'delete_label',
        description: 'Delete a label by its ID',
        inputSchema: {
          type: 'object',
          properties: {
            label_id: {
              type: 'string',
              description: 'Label ID to delete',
            },
          },
          required: ['label_id'],
        },
      },
      {
        name: 'get_authorizations',
        description: 'List all API tokens (authorizations) with optional filters by user, organization, or username',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: {
              type: 'string',
              description: 'Filter authorizations by user ID',
            },
            user: {
              type: 'string',
              description: 'Filter authorizations by username',
            },
            org_id: {
              type: 'string',
              description: 'Filter authorizations by organization ID',
            },
            org: {
              type: 'string',
              description: 'Filter authorizations by organization name',
            },
          },
        },
      },
      {
        name: 'create_authorization',
        description: 'Create a new API token (authorization) with specified read/write permissions for resources',
        inputSchema: {
          type: 'object',
          properties: {
            org_id: {
              type: 'string',
              description: 'Organization ID the token belongs to',
            },
            permissions: {
              type: 'string',
              description: 'JSON array of permission objects with action (read/write) and resource type/ID',
            },
            description: {
              type: 'string',
              description: 'Optional description for the token',
            },
          },
          required: ['org_id', 'permissions'],
        },
      },
      {
        name: 'delete_authorization',
        description: 'Delete an API token (authorization) by its ID',
        inputSchema: {
          type: 'object',
          properties: {
            auth_id: {
              type: 'string',
              description: 'Authorization ID to delete',
            },
          },
          required: ['auth_id'],
        },
      },
      {
        name: 'get_health',
        description: 'Check the health status of the InfluxDB instance, returns status and version information',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_ready',
        description: 'Check readiness of the InfluxDB instance at startup, returns started status and up time',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_me',
        description: 'Retrieve the currently authenticated user\'s profile information',
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
        case 'query_data':
          return this.queryData(args);
        case 'get_buckets':
          return this.getBuckets(args);
        case 'create_bucket':
          return this.createBucket(args);
        case 'get_bucket':
          return this.getBucket(args);
        case 'update_bucket':
          return this.updateBucket(args);
        case 'delete_bucket':
          return this.deleteBucket(args);
        case 'delete_time_series':
          return this.deleteTimeSeries(args);
        case 'get_organizations':
          return this.getOrganizations(args);
        case 'create_organization':
          return this.createOrganization(args);
        case 'get_organization':
          return this.getOrganization(args);
        case 'update_organization':
          return this.updateOrganization(args);
        case 'delete_organization':
          return this.deleteOrganization(args);
        case 'get_tasks':
          return this.getTasks(args);
        case 'create_task':
          return this.createTask(args);
        case 'get_task':
          return this.getTask(args);
        case 'update_task':
          return this.updateTask(args);
        case 'delete_task':
          return this.deleteTask(args);
        case 'get_dashboards':
          return this.getDashboards(args);
        case 'create_dashboard':
          return this.createDashboard(args);
        case 'get_dashboard':
          return this.getDashboard(args);
        case 'delete_dashboard':
          return this.deleteDashboard(args);
        case 'get_checks':
          return this.getChecks(args);
        case 'get_check':
          return this.getCheck(args);
        case 'delete_check':
          return this.deleteCheck(args);
        case 'get_notification_rules':
          return this.getNotificationRules(args);
        case 'get_notification_endpoints':
          return this.getNotificationEndpoints(args);
        case 'get_scrapers':
          return this.getScrapers(args);
        case 'create_scraper':
          return this.createScraper(args);
        case 'get_scraper':
          return this.getScraper(args);
        case 'delete_scraper':
          return this.deleteScraper(args);
        case 'get_labels':
          return this.getLabels(args);
        case 'create_label':
          return this.createLabel(args);
        case 'get_label':
          return this.getLabel(args);
        case 'delete_label':
          return this.deleteLabel(args);
        case 'get_authorizations':
          return this.getAuthorizations(args);
        case 'create_authorization':
          return this.createAuthorization(args);
        case 'delete_authorization':
          return this.deleteAuthorization(args);
        case 'get_health':
          return this.getHealth();
        case 'get_ready':
          return this.getReady();
        case 'get_me':
          return this.getMe();
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

  private authHeaders(): Record<string, string> {
    if (this.apiToken) {
      return {
        'Authorization': `Token ${this.apiToken}`,
        'Content-Type': 'application/json',
      };
    }
    if (this.username && this.password) {
      return {
        'Authorization': `Basic ${btoa(`${this.username}:${this.password}`)}`,
        'Content-Type': 'application/json',
      };
    }
    return { 'Content-Type': 'application/json' };
  }

  private async request(
    path: string,
    method = 'GET',
    body?: unknown,
    acceptHeader?: string,
  ): Promise<ToolResult> {
    const headers: Record<string, string> = {
      ...this.authHeaders(),
      Accept: acceptHeader ?? 'application/json',
    };

    const options: RequestInit = { method, headers };
    if (body !== undefined && method !== 'GET') {
      options.body = JSON.stringify(body);
    }

    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, options);

    if (!response.ok) {
      let errText = '';
      try { errText = await response.text(); } catch { /* ignore */ }
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}${errText ? ` — ${errText.slice(0, 200)}` : ''}` }],
        isError: true,
      };
    }

    if (response.status === 204) {
      return {
        content: [{ type: 'text', text: JSON.stringify({ success: true, status: 204 }) }],
        isError: false,
      };
    }

    const contentType = response.headers.get('content-type') ?? '';
    const rawText = contentType.includes('csv') || contentType.includes('text')
      ? await response.text()
      : JSON.stringify(await response.json(), null, 2);

    const truncated = rawText.length > 10_000
      ? rawText.slice(0, 10_000) + `\n... [truncated, ${rawText.length} total chars]`
      : rawText;

    return {
      content: [{ type: 'text', text: truncated }],
      isError: false,
    };
  }

  private async queryData(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.org) params.append('org', String(args.org));
    if (args.org_id) params.append('orgID', String(args.org_id));
    const queryStr = params.toString() ? `?${params.toString()}` : '';
    return this.request(`/query${queryStr}`, 'POST', { query: args.query, type: args.type ?? 'flux' });
  }

  private async getBuckets(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.org) params.append('org', String(args.org));
    if (args.org_id) params.append('orgID', String(args.org_id));
    if (args.name) params.append('name', String(args.name));
    if (args.limit) params.append('limit', String(args.limit));
    if (args.offset) params.append('offset', String(args.offset));
    return this.request(`/buckets?${params.toString()}`);
  }

  private async createBucket(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {
      name: args.name,
      orgID: args.org_id,
    };
    if (args.description) body.description = args.description;
    if (args.retention_seconds !== undefined) {
      body.retentionRules = [{
        type: 'expire',
        everySeconds: args.retention_seconds,
      }];
    }
    return this.request('/buckets', 'POST', body);
  }

  private async getBucket(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request(`/buckets/${args.bucket_id}`);
  }

  private async updateBucket(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {};
    if (args.name) body.name = args.name;
    if (args.description) body.description = args.description;
    if (args.retention_seconds !== undefined) {
      body.retentionRules = [{ type: 'expire', everySeconds: args.retention_seconds }];
    }
    return this.request(`/buckets/${args.bucket_id}`, 'PATCH', body);
  }

  private async deleteBucket(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request(`/buckets/${args.bucket_id}`, 'DELETE');
  }

  private async deleteTimeSeries(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.org) params.append('org', String(args.org));
    if (args.bucket) params.append('bucket', String(args.bucket));
    if (args.org_id) params.append('orgID', String(args.org_id));
    if (args.bucket_id) params.append('bucketID', String(args.bucket_id));
    const body: Record<string, unknown> = { start: args.start, stop: args.stop };
    if (args.predicate) body.predicate = args.predicate;
    return this.request(`/delete?${params.toString()}`, 'POST', body);
  }

  private async getOrganizations(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.org) params.append('org', String(args.org));
    if (args.limit) params.append('limit', String(args.limit));
    if (args.offset) params.append('offset', String(args.offset));
    return this.request(`/orgs?${params.toString()}`);
  }

  private async createOrganization(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = { name: args.name };
    if (args.description) body.description = args.description;
    return this.request('/orgs', 'POST', body);
  }

  private async getOrganization(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request(`/orgs/${args.org_id}`);
  }

  private async updateOrganization(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {};
    if (args.name) body.name = args.name;
    if (args.description) body.description = args.description;
    return this.request(`/orgs/${args.org_id}`, 'PATCH', body);
  }

  private async deleteOrganization(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request(`/orgs/${args.org_id}`, 'DELETE');
  }

  private async getTasks(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.org) params.append('org', String(args.org));
    if (args.user) params.append('user', String(args.user));
    if (args.name) params.append('name', String(args.name));
    if (args.after) params.append('after', String(args.after));
    if (args.limit) params.append('limit', String(args.limit));
    return this.request(`/tasks?${params.toString()}`);
  }

  private async createTask(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = { flux: args.flux, orgID: args.org_id };
    if (args.description) body.description = args.description;
    return this.request('/tasks', 'POST', body);
  }

  private async getTask(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request(`/tasks/${args.task_id}`);
  }

  private async updateTask(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {};
    if (args.flux) body.flux = args.flux;
    if (args.description) body.description = args.description;
    if (args.status) body.status = args.status;
    return this.request(`/tasks/${args.task_id}`, 'PATCH', body);
  }

  private async deleteTask(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request(`/tasks/${args.task_id}`, 'DELETE');
  }

  private async getDashboards(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.owner) params.append('owner', String(args.owner));
    if (args.org) params.append('org', String(args.org));
    if (args.limit) params.append('limit', String(args.limit));
    if (args.offset) params.append('offset', String(args.offset));
    return this.request(`/dashboards?${params.toString()}`);
  }

  private async createDashboard(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = { name: args.name, orgID: args.org_id };
    if (args.description) body.description = args.description;
    return this.request('/dashboards', 'POST', body);
  }

  private async getDashboard(args: Record<string, unknown>): Promise<ToolResult> {
    const include = args.include ? `?include=${args.include}` : '';
    return this.request(`/dashboards/${args.dashboard_id}${include}`);
  }

  private async deleteDashboard(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request(`/dashboards/${args.dashboard_id}`, 'DELETE');
  }

  private async getChecks(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    params.append('orgID', String(args.org_id));
    if (args.limit) params.append('limit', String(args.limit));
    if (args.offset) params.append('offset', String(args.offset));
    return this.request(`/checks?${params.toString()}`);
  }

  private async getCheck(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request(`/checks/${args.check_id}`);
  }

  private async deleteCheck(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request(`/checks/${args.check_id}`, 'DELETE');
  }

  private async getNotificationRules(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    params.append('orgID', String(args.org_id));
    if (args.check_id) params.append('checkID', String(args.check_id));
    if (args.limit) params.append('limit', String(args.limit));
    return this.request(`/notificationRules?${params.toString()}`);
  }

  private async getNotificationEndpoints(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    params.append('orgID', String(args.org_id));
    if (args.limit) params.append('limit', String(args.limit));
    if (args.offset) params.append('offset', String(args.offset));
    return this.request(`/notificationEndpoints?${params.toString()}`);
  }

  private async getScrapers(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.name) params.append('name', String(args.name));
    if (args.org_id) params.append('orgID', String(args.org_id));
    if (args.org) params.append('org', String(args.org));
    return this.request(`/scrapers?${params.toString()}`);
  }

  private async createScraper(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request('/scrapers', 'POST', {
      name: args.name,
      url: args.url,
      bucketID: args.bucket_id,
      orgID: args.org_id,
      type: 'prometheus',
    });
  }

  private async getScraper(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request(`/scrapers/${args.scraper_id}`);
  }

  private async deleteScraper(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request(`/scrapers/${args.scraper_id}`, 'DELETE');
  }

  private async getLabels(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.org_id) params.append('orgID', String(args.org_id));
    return this.request(`/labels?${params.toString()}`);
  }

  private async createLabel(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = { name: args.name, orgID: args.org_id };
    const props: Record<string, string> = {};
    if (args.color) props.color = String(args.color);
    if (args.description) props.description = String(args.description);
    if (Object.keys(props).length) body.properties = props;
    return this.request('/labels', 'POST', body);
  }

  private async getLabel(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request(`/labels/${args.label_id}`);
  }

  private async deleteLabel(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request(`/labels/${args.label_id}`, 'DELETE');
  }

  private async getAuthorizations(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.user_id) params.append('userID', String(args.user_id));
    if (args.user) params.append('user', String(args.user));
    if (args.org_id) params.append('orgID', String(args.org_id));
    if (args.org) params.append('org', String(args.org));
    return this.request(`/authorizations?${params.toString()}`);
  }

  private async createAuthorization(args: Record<string, unknown>): Promise<ToolResult> {
    let permissions: unknown;
    try {
      permissions = typeof args.permissions === 'string'
        ? JSON.parse(args.permissions)
        : args.permissions;
    } catch {
      return {
        content: [{ type: 'text', text: 'Invalid permissions: must be a JSON array of permission objects' }],
        isError: true,
      };
    }
    const body: Record<string, unknown> = { orgID: args.org_id, permissions };
    if (args.description) body.description = args.description;
    return this.request('/authorizations', 'POST', body);
  }

  private async deleteAuthorization(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request(`/authorizations/${args.auth_id}`, 'DELETE');
  }

  private async getHealth(): Promise<ToolResult> {
    return this.request('/health');
  }

  private async getReady(): Promise<ToolResult> {
    return this.request('/ready');
  }

  private async getMe(): Promise<ToolResult> {
    return this.request('/me');
  }
}

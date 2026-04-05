/**
 * Atlassian Statuspage MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// Atlassian's official MCP server covers Jira and Confluence only — Statuspage is explicitly excluded.
// No official Statuspage MCP server exists on GitHub or npmjs.com as of 2026-03-28.
//
// Base URL: https://api.statuspage.io/v1
// Auth: Authorization: OAuth {apiKey} header — API key found in Statuspage management UI under API Info
// Docs: https://developer.statuspage.io/
// Rate limits: Not officially documented by Atlassian/Statuspage

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface StatuspageConfig {
  /**
   * Statuspage API key. Found in the Statuspage management UI under API Info.
   * Passed as: Authorization: OAuth {apiKey}
   */
  apiKey: string;
  /**
   * Your Statuspage page ID. Every endpoint is scoped to a page.
   * Found in the URL of your Statuspage management dashboard.
   */
  pageId: string;
  /** Override the base URL (default: https://api.statuspage.io/v1). */
  baseUrl?: string;
}

export class StatuspageMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly pageId: string;
  private readonly baseUrl: string;

  constructor(config: StatuspageConfig) {
    super();
    this.apiKey = config.apiKey;
    this.pageId = config.pageId;
    this.baseUrl = config.baseUrl ?? 'https://api.statuspage.io/v1';
  }

  static catalog() {
    return {
      name: 'statuspage',
      displayName: 'Statuspage',
      version: '1.0.0',
      category: 'observability' as const,
      keywords: ['statuspage', 'atlassian', 'status', 'incident', 'outage', 'component', 'maintenance', 'subscriber', 'uptime', 'metrics'],
      toolNames: [
        'get_page', 'list_components', 'create_component', 'update_component',
        'list_incidents', 'get_incident', 'create_incident', 'update_incident', 'resolve_incident',
        'list_scheduled_maintenances', 'create_scheduled_maintenance',
        'list_subscribers', 'delete_subscriber',
        'list_metrics', 'submit_metric_data',
      ],
      description: 'Manage Statuspage incidents, components, scheduled maintenances, subscribers, and metrics for Atlassian Statuspage.',
      author: 'protectnil' as const,
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'get_page',
        description: 'Retrieve metadata and configuration for the Statuspage page including name, subdomain, and status.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'list_components',
        description: 'List all components on the Statuspage page including their current status and group membership.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'create_component',
        description: 'Create a new component on the Statuspage page with a name, description, and initial status.',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Display name for the component (max 100 characters)',
            },
            description: {
              type: 'string',
              description: 'Optional description shown on the status page',
            },
            status: {
              type: 'string',
              description: 'Initial status: operational (default) | degraded_performance | partial_outage | major_outage | under_maintenance',
            },
            onlyShowIfDegraded: {
              type: 'boolean',
              description: 'Hide the component on the public page when it is operational (default: false)',
            },
            groupId: {
              type: 'string',
              description: 'Component group ID to nest this component under',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'update_component',
        description: 'Update the status or details of an existing component (e.g. mark as degraded or under maintenance).',
        inputSchema: {
          type: 'object',
          properties: {
            component_id: {
              type: 'string',
              description: 'ID of the component to update',
            },
            status: {
              type: 'string',
              description: 'New status: operational | degraded_performance | partial_outage | major_outage | under_maintenance',
            },
            name: {
              type: 'string',
              description: 'New display name for the component',
            },
            description: {
              type: 'string',
              description: 'New description for the component',
            },
          },
          required: ['component_id'],
        },
      },
      {
        name: 'list_incidents',
        description: 'List unresolved incidents on the page, optionally filtering by status or pagination.',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of incidents to return (default 25)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default 1)',
            },
          },
        },
      },
      {
        name: 'get_incident',
        description: 'Retrieve full details and update history for a specific incident by ID.',
        inputSchema: {
          type: 'object',
          properties: {
            incident_id: {
              type: 'string',
              description: 'ID of the incident to retrieve',
            },
          },
          required: ['incident_id'],
        },
      },
      {
        name: 'create_incident',
        description: 'Create a new realtime incident with initial status, affected components, and subscriber notification.',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Short title for the incident (max 100 characters)',
            },
            status: {
              type: 'string',
              description: 'Initial incident status: investigating | identified | monitoring | resolved',
            },
            body: {
              type: 'string',
              description: 'Initial incident update message shown to subscribers and on the status page',
            },
            component_ids: {
              type: 'array',
              items: { type: 'string' },
              description: 'List of component IDs affected by this incident',
            },
            impact_override: {
              type: 'string',
              description: 'Override the calculated impact: none | minor | major | critical',
            },
            deliver_notifications: {
              type: 'boolean',
              description: 'Whether to send notifications to subscribers (default: true)',
            },
          },
          required: ['name', 'status', 'body'],
        },
      },
      {
        name: 'update_incident',
        description: 'Post a new status update to an existing incident, changing status and adding a timeline message.',
        inputSchema: {
          type: 'object',
          properties: {
            incident_id: {
              type: 'string',
              description: 'ID of the incident to update',
            },
            status: {
              type: 'string',
              description: 'New incident status: investigating | identified | monitoring | resolved',
            },
            body: {
              type: 'string',
              description: 'Update message to post to the incident timeline',
            },
            deliver_notifications: {
              type: 'boolean',
              description: 'Whether to send notifications to subscribers (default: true)',
            },
          },
          required: ['incident_id', 'status', 'body'],
        },
      },
      {
        name: 'resolve_incident',
        description: 'Resolve an open incident, posting a final resolution message and notifying subscribers.',
        inputSchema: {
          type: 'object',
          properties: {
            incident_id: {
              type: 'string',
              description: 'ID of the incident to resolve',
            },
            body: {
              type: 'string',
              description: 'Resolution message to post to the incident timeline (default: "This incident has been resolved.")',
            },
          },
          required: ['incident_id'],
        },
      },
      {
        name: 'list_scheduled_maintenances',
        description: 'List upcoming, active, or completed scheduled maintenances with pagination support.',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of records to return (default 25)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default 1)',
            },
          },
        },
      },
      {
        name: 'create_scheduled_maintenance',
        description: 'Create a scheduled maintenance window with start/end times, affected components, and auto-transition.',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Title for the scheduled maintenance (max 100 characters)',
            },
            body: {
              type: 'string',
              description: 'Description of what will occur during the maintenance window',
            },
            scheduledFor: {
              type: 'string',
              description: 'ISO 8601 datetime when the maintenance window starts (e.g. "2026-04-01T02:00:00.000Z")',
            },
            scheduledUntil: {
              type: 'string',
              description: 'ISO 8601 datetime when the maintenance window ends',
            },
            component_ids: {
              type: 'array',
              items: { type: 'string' },
              description: 'List of component IDs that will be under maintenance',
            },
            autoTransitionToMaintenanceState: {
              type: 'boolean',
              description: 'Automatically set affected components to under_maintenance at start time (default: true)',
            },
            autoTransitionToOperationalState: {
              type: 'boolean',
              description: 'Automatically return components to operational at end time (default: true)',
            },
            deliver_notifications: {
              type: 'boolean',
              description: 'Whether to notify subscribers about the maintenance (default: true)',
            },
          },
          required: ['name', 'scheduledFor', 'scheduledUntil'],
        },
      },
      {
        name: 'list_subscribers',
        description: 'List email, SMS, webhook, and Slack subscribers for the page with type filtering.',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of subscribers to return (default 100)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default 1)',
            },
            type: {
              type: 'string',
              description: 'Filter by subscriber type: email, sms, webhook, slack',
            },
          },
        },
      },
      {
        name: 'delete_subscriber',
        description: 'Remove a subscriber from the page by subscriber ID, stopping all future notifications.',
        inputSchema: {
          type: 'object',
          properties: {
            subscriber_id: {
              type: 'string',
              description: 'ID of the subscriber to delete',
            },
          },
          required: ['subscriber_id'],
        },
      },
      {
        name: 'list_metrics',
        description: 'List all custom metrics configured on the Statuspage page including their providers and display settings.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'submit_metric_data',
        description: 'Submit data points for a custom metric. Used to push uptime, latency, or other numeric values to the page.',
        inputSchema: {
          type: 'object',
          properties: {
            metric_id: {
              type: 'string',
              description: 'ID of the metric to submit data for',
            },
            timestamp: {
              type: 'number',
              description: 'Unix timestamp for the data point',
            },
            value: {
              type: 'number',
              description: 'Numeric value to record for the metric at the given timestamp',
            },
          },
          required: ['metric_id', 'timestamp', 'value'],
        },
      },
    ];
  }

  private get authHeaders(): Record<string, string> {
    return {
      Authorization: `OAuth ${this.apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  private get pageBase(): string {
    return `${this.baseUrl}/pages/${encodeURIComponent(this.pageId)}`;
  }

  private async request(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<ToolResult> {
    const response = await this.fetchWithRetry(path, {
      method,
      headers: this.authHeaders,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return {
        content: [{ type: 'text', text: `Statuspage API error (HTTP ${response.status}): ${errText}` }],
        isError: true,
      };
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      return {
        content: [{ type: 'text', text: `Statuspage returned non-JSON response (HTTP ${response.status})` }],
        isError: true,
      };
    }

    return {
      content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }],
      isError: false,
    };
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'get_page':
          return this.getPage();
        case 'list_components':
          return this.listComponents();
        case 'create_component':
          return this.createComponent(args);
        case 'update_component':
          return this.updateComponent(args);
        case 'list_incidents':
          return this.listIncidents(args);
        case 'get_incident':
          return this.getIncident(args);
        case 'create_incident':
          return this.createIncident(args);
        case 'update_incident':
          return this.updateIncident(args);
        case 'resolve_incident':
          return this.resolveIncident(args);
        case 'list_scheduled_maintenances':
          return this.listScheduledMaintenances(args);
        case 'create_scheduled_maintenance':
          return this.createScheduledMaintenance(args);
        case 'list_subscribers':
          return this.listSubscribers(args);
        case 'delete_subscriber':
          return this.deleteSubscriber(args);
        case 'list_metrics':
          return this.listMetrics();
        case 'submit_metric_data':
          return this.submitMetricData(args);
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

  private async getPage(): Promise<ToolResult> {
    return this.request('GET', `${this.baseUrl}/pages/${encodeURIComponent(this.pageId)}`);
  }

  private async listComponents(): Promise<ToolResult> {
    return this.request('GET', `${this.pageBase}/components`);
  }

  private async createComponent(args: Record<string, unknown>): Promise<ToolResult> {
    const name = args.name as string;
    if (!name) {
      return { content: [{ type: 'text', text: 'name is required' }], isError: true };
    }
    const component: Record<string, unknown> = { name };
    if (args.description) component.description = args.description;
    if (args.status) component.status = args.status;
    if (args.onlyShowIfDegraded !== undefined) component.only_show_if_degraded = args.onlyShowIfDegraded;
    if (args.groupId) component.group_id = args.groupId;
    return this.request('POST', `${this.pageBase}/components`, { component });
  }

  private async updateComponent(args: Record<string, unknown>): Promise<ToolResult> {
    const componentId = args.component_id as string;
    if (!componentId) {
      return { content: [{ type: 'text', text: 'component_id is required' }], isError: true };
    }
    const component: Record<string, unknown> = {};
    if (args.status) component.status = args.status;
    if (args.name) component.name = args.name;
    if (args.description) component.description = args.description;
    return this.request('PATCH', `${this.pageBase}/components/${encodeURIComponent(componentId)}`, { component });
  }

  private async listIncidents(args: Record<string, unknown>): Promise<ToolResult> {
    const limit = (args.limit as number) ?? 25;
    const page = (args.page as number) ?? 1;
    return this.request('GET', `${this.pageBase}/incidents?limit=${limit}&page=${page}`);
  }

  private async getIncident(args: Record<string, unknown>): Promise<ToolResult> {
    const incidentId = args.incident_id as string;
    if (!incidentId) {
      return { content: [{ type: 'text', text: 'incident_id is required' }], isError: true };
    }
    return this.request('GET', `${this.pageBase}/incidents/${encodeURIComponent(incidentId)}`);
  }

  private async createIncident(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name || !args.status || !args.body) {
      return { content: [{ type: 'text', text: 'name, status, and body are required' }], isError: true };
    }
    const incident: Record<string, unknown> = {
      name: args.name,
      status: args.status,
      body: args.body,
    };
    if (args.component_ids) incident.component_ids = args.component_ids;
    if (args.impact_override) incident.impact_override = args.impact_override;
    if (args.deliver_notifications !== undefined) incident.deliver_notifications = args.deliver_notifications;
    return this.request('POST', `${this.pageBase}/incidents`, { incident });
  }

  private async updateIncident(args: Record<string, unknown>): Promise<ToolResult> {
    const incidentId = args.incident_id as string;
    if (!incidentId || !args.status || !args.body) {
      return { content: [{ type: 'text', text: 'incident_id, status, and body are required' }], isError: true };
    }
    const incident: Record<string, unknown> = {
      status: args.status,
      body: args.body,
    };
    if (args.deliver_notifications !== undefined) incident.deliver_notifications = args.deliver_notifications;
    return this.request('PATCH', `${this.pageBase}/incidents/${encodeURIComponent(incidentId)}`, { incident });
  }

  private async resolveIncident(args: Record<string, unknown>): Promise<ToolResult> {
    const incidentId = args.incident_id as string;
    if (!incidentId) {
      return { content: [{ type: 'text', text: 'incident_id is required' }], isError: true };
    }
    const incident: Record<string, unknown> = {
      status: 'resolved',
      body: (args.body as string) ?? 'This incident has been resolved.',
    };
    return this.request('PATCH', `${this.pageBase}/incidents/${encodeURIComponent(incidentId)}`, { incident });
  }

  private async listScheduledMaintenances(args: Record<string, unknown>): Promise<ToolResult> {
    const limit = (args.limit as number) ?? 25;
    const page = (args.page as number) ?? 1;
    return this.request('GET', `${this.pageBase}/incidents/scheduled?limit=${limit}&page=${page}`);
  }

  private async createScheduledMaintenance(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name || !args.scheduledFor || !args.scheduledUntil) {
      return { content: [{ type: 'text', text: 'name, scheduledFor, and scheduledUntil are required' }], isError: true };
    }
    const incident: Record<string, unknown> = {
      name: args.name,
      status: 'scheduled',
      scheduled_for: args.scheduledFor,
      scheduled_until: args.scheduledUntil,
    };
    if (args.body) incident.body = args.body;
    if (args.component_ids) incident.component_ids = args.component_ids;
    if (args.autoTransitionToMaintenanceState !== undefined) {
      incident.auto_transition_to_maintenance_state = args.autoTransitionToMaintenanceState;
    }
    if (args.autoTransitionToOperationalState !== undefined) {
      incident.auto_transition_to_operational_state = args.autoTransitionToOperationalState;
    }
    if (args.deliver_notifications !== undefined) incident.deliver_notifications = args.deliver_notifications;
    return this.request('POST', `${this.pageBase}/incidents`, { incident });
  }

  private async listSubscribers(args: Record<string, unknown>): Promise<ToolResult> {
    const limit = (args.limit as number) ?? 100;
    const page = (args.page as number) ?? 1;
    const params = new URLSearchParams({ limit: String(limit), page: String(page) });
    if (args.type) params.set('type', args.type as string);
    return this.request('GET', `${this.pageBase}/subscribers?${params}`);
  }

  private async deleteSubscriber(args: Record<string, unknown>): Promise<ToolResult> {
    const subscriberId = args.subscriber_id as string;
    if (!subscriberId) {
      return { content: [{ type: 'text', text: 'subscriber_id is required' }], isError: true };
    }
    return this.request('DELETE', `${this.pageBase}/subscribers/${encodeURIComponent(subscriberId)}`);
  }

  private async listMetrics(): Promise<ToolResult> {
    return this.request('GET', `${this.pageBase}/metrics`);
  }

  private async submitMetricData(args: Record<string, unknown>): Promise<ToolResult> {
    const metricId = args.metric_id as string;
    if (!metricId || args.timestamp === undefined || args.value === undefined) {
      return { content: [{ type: 'text', text: 'metric_id, timestamp, and value are required' }], isError: true };
    }
    const body = {
      data: {
        timestamp: args.timestamp as number,
        value: args.value as number,
      },
    };
    return this.request('POST', `${this.pageBase}/metrics/${encodeURIComponent(metricId)}/data`, body);
  }
}

/**
 * Amplitude MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://mcp.amplitude.com/mcp — transport: streamable-HTTP, auth: Amplitude API key
//   Vendor MCP: 13 tools (hosted/closed-source, beta as of 2026-03-28). Guide repo: github.com/amplitude/mcp-server-guide
//   Vendor MCP tools (13): search, query_chart, query_experiment, query_dataset, query_metric,
//   get_charts, get_dashboard, get_notebook, get_experiments, get_flags, get_session_replays,
//   get_event_properties, get_context
//   Our adapter tools (17): track_events, identify_users, get_active_users, get_event_segmentation,
//   get_funnel, get_retention, get_user_activity, get_user_search, list_cohorts, get_cohort,
//   list_event_types, get_event_type, list_user_properties, list_event_properties,
//   export_events, delete_user_data, get_deletion_job
//   Overlap: ZERO shared tools — vendor MCP covers AI-powered analytics queries;
//   our adapter covers direct REST API (ingestion, segmentation, funnels, retention, cohorts,
//   taxonomy, user privacy) — none of which are in the vendor MCP.
// Integration: use-both — MCP has 13 unique tools not in our adapter (AI queries, dashboards,
//   experiments, flags, session replays); our adapter has 17 unique tools not in the MCP
//   (event ingestion, segmentation, funnels, retention, cohorts, taxonomy, user privacy).
//   Full coverage requires union. FederationManager routes shared tools through MCP (none shared here).
// MCP-sourced tools (13): search, query_chart, query_experiment, query_dataset, query_metric,
//   get_charts, get_dashboard, get_notebook, get_experiments, get_flags, get_session_replays,
//   get_event_properties, get_context
// REST-sourced tools (17): [all tools in this adapter]
// Combined coverage: 30 tools (MCP: 13 + REST: 17 - shared: 0)
//
// Base URL (ingestion, US):  https://api2.amplitude.com/2/httpapi
// Base URL (ingestion, EU):  https://api.eu.amplitude.com/2/httpapi
// Base URL (analytics, US):  https://amplitude.com/api/2
// Base URL (analytics, EU):  https://analytics.eu.amplitude.com/api/2
// Auth: Basic auth (API key + secret key) for analytics; API key in body for ingestion
// Docs: https://www.docs.developers.amplitude.com/analytics/apis/
// Rate limits: Varies by endpoint; ingestion API allows up to 2000 events/request, 1 MB max

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface AmplitudeConfig {
  apiKey: string;
  secretKey: string;
  /** Override ingestion base URL. Defaults to https://api2.amplitude.com/2/httpapi (US).
   *  EU residency: https://api.eu.amplitude.com/2/httpapi */
  ingestionBaseUrl?: string;
  /** Override analytics base URL. Defaults to https://amplitude.com/api/2 (US).
   *  EU residency: https://analytics.eu.amplitude.com/api/2 */
  analyticsBaseUrl?: string;
}

export class AmplitudeMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly secretKey: string;
  private readonly ingestionBaseUrl: string;
  private readonly analyticsBaseUrl: string;

  constructor(config: AmplitudeConfig) {
    super();
    this.apiKey = config.apiKey;
    this.secretKey = config.secretKey;
    this.ingestionBaseUrl = config.ingestionBaseUrl ?? 'https://api2.amplitude.com/2/httpapi';
    this.analyticsBaseUrl = config.analyticsBaseUrl ?? 'https://amplitude.com/api/2';
  }

  private get basicAuthHeader(): string {
    const encoded = Buffer.from(`${this.apiKey}:${this.secretKey}`).toString('base64');
    return `Basic ${encoded}`;
  }

  get tools(): ToolDefinition[] {
    return [
      // --- Event Ingestion ---
      {
        name: 'track_events',
        description: 'Send one or more events to Amplitude via the HTTP V2 ingestion API. Accepts up to 2000 events per request under 1 MB. Events older than 5 days should use import_events instead.',
        inputSchema: {
          type: 'object',
          properties: {
            events: {
              type: 'array',
              description: 'Array of event objects. Each event must have event_type and either user_id or device_id. Optional: event_properties, user_properties, time (Unix ms), session_id, insert_id, ip, country, city, language, platform, os_name, os_version, device_model.',
              items: { type: 'object' },
            },
            options: { type: 'object', description: 'Optional upload options, e.g. { "min_id_length": 1 }' },
          },
          required: ['events'],
        },
      },
      {
        name: 'identify_users',
        description: 'Update user properties in Amplitude without sending an event. Used to set or unset user-level properties like plan, role, or account ID.',
        inputSchema: {
          type: 'object',
          properties: {
            identification: {
              type: 'array',
              description: 'Array of identify objects, each with user_id or device_id plus user_properties containing $set, $unset, $add, $append, $prepend, or $clearAll operations.',
              items: { type: 'object' },
            },
          },
          required: ['identification'],
        },
      },
      // --- Active Users & Engagement ---
      {
        name: 'get_active_users',
        description: 'Query Amplitude for active, new, or average user counts over a date range with optional bucketing interval.',
        inputSchema: {
          type: 'object',
          properties: {
            start: { type: 'string', description: 'Start date in YYYYMMDD format (e.g. 20240101)' },
            end: { type: 'string', description: 'End date in YYYYMMDD format (e.g. 20240131)' },
            m: { type: 'string', description: 'Metric to return: active (default), new, or average' },
            i: { type: 'number', description: 'Interval in days for bucketing results: 1, 7, or 30' },
          },
          required: ['start', 'end'],
        },
      },
      // --- Event Segmentation ---
      {
        name: 'get_event_segmentation',
        description: 'Run an event segmentation query returning a time series of event counts or unique user counts for a given event type with optional group-by and filters.',
        inputSchema: {
          type: 'object',
          properties: {
            e: { type: 'object', description: 'Event object specifying the event type, e.g. { "event_type": "Button Clicked" }' },
            start: { type: 'string', description: 'Start date in YYYYMMDD format' },
            end: { type: 'string', description: 'End date in YYYYMMDD format' },
            m: { type: 'string', description: 'Metric: totals (default), uniques, average, pct_dau, or formula' },
            i: { type: 'number', description: 'Interval in days: 1, 7, or 30' },
            s: { type: 'array', description: 'Array of segment filter objects (optional)', items: { type: 'object' } },
            g: { type: 'array', description: 'Array of group-by property objects (optional)', items: { type: 'object' } },
            limit: { type: 'number', description: 'Max number of group-by values to return (default: 100)' },
          },
          required: ['e', 'start', 'end'],
        },
      },
      // --- Funnels ---
      {
        name: 'get_funnel',
        description: 'Query a conversion funnel to see how users progress through a sequence of events, with optional conversion window and segment filters.',
        inputSchema: {
          type: 'object',
          properties: {
            e: { type: 'array', description: 'Array of funnel step event objects (minimum 2), each with an event_type field', items: { type: 'object' } },
            start: { type: 'string', description: 'Start date in YYYYMMDD format' },
            end: { type: 'string', description: 'End date in YYYYMMDD format' },
            converted_within: { type: 'number', description: 'Conversion window in seconds (e.g. 86400 for 1 day)' },
            s: { type: 'array', description: 'Optional segment filter array', items: { type: 'object' } },
            g: { type: 'array', description: 'Optional group-by property array', items: { type: 'object' } },
          },
          required: ['e', 'start', 'end'],
        },
      },
      // --- Retention ---
      {
        name: 'get_retention',
        description: 'Query retention analysis returning the percentage of users who return after an initial event over a date range.',
        inputSchema: {
          type: 'object',
          properties: {
            se: { type: 'object', description: 'Starting event object, e.g. { "event_type": "Sign Up" }' },
            re: { type: 'object', description: 'Return event object, e.g. { "event_type": "any" } for any event' },
            start: { type: 'string', description: 'Start date in YYYYMMDD format' },
            end: { type: 'string', description: 'End date in YYYYMMDD format' },
            retention_type: { type: 'string', description: 'Type of retention: n-day (default) or unbounded' },
            i: { type: 'number', description: 'Interval in days: 1, 7, or 30' },
          },
          required: ['se', 're', 'start', 'end'],
        },
      },
      // --- User Activity ---
      {
        name: 'get_user_activity',
        description: 'Retrieve the full event stream for a specific user by their Amplitude user ID (internal numeric ID, not customer user_id).',
        inputSchema: {
          type: 'object',
          properties: {
            user: { type: 'string', description: 'Amplitude internal user ID (numeric, e.g. 12345678)' },
            limit: { type: 'number', description: 'Maximum number of events to return (default: 1000)' },
          },
          required: ['user'],
        },
      },
      {
        name: 'get_user_search',
        description: 'Search for an Amplitude user by their customer-assigned user_id to find their internal Amplitude user ID and profile.',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: { type: 'string', description: 'The customer-assigned user_id to search for' },
          },
          required: ['user_id'],
        },
      },
      // --- Cohorts ---
      {
        name: 'list_cohorts',
        description: 'List all cohorts (behavioral audience segments) in the Amplitude project.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_cohort',
        description: 'Get the user list for a specific Amplitude cohort by its ID. Returns all user IDs in the cohort.',
        inputSchema: {
          type: 'object',
          properties: {
            cohort_id: { type: 'string', description: 'The cohort ID to retrieve user list for' },
            props: { type: 'number', description: 'Set to 1 to include user properties in response (default: 0)' },
            limit: { type: 'number', description: 'Maximum number of users to return' },
          },
          required: ['cohort_id'],
        },
      },
      // --- Taxonomy (Event/Property Management) ---
      {
        name: 'list_event_types',
        description: 'List all event types defined in the Amplitude project taxonomy including their metadata and descriptions.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_event_type',
        description: 'Get details of a specific event type from the Amplitude project taxonomy by its name.',
        inputSchema: {
          type: 'object',
          properties: {
            event_type: { type: 'string', description: 'The event type name (e.g. "Button Clicked")' },
          },
          required: ['event_type'],
        },
      },
      {
        name: 'list_user_properties',
        description: 'List all user properties defined in the Amplitude project taxonomy with their types and descriptions.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'list_event_properties',
        description: 'List all event properties defined for a specific event type in the Amplitude project taxonomy.',
        inputSchema: {
          type: 'object',
          properties: {
            event_type: { type: 'string', description: 'The event type name to list properties for' },
          },
          required: ['event_type'],
        },
      },
      // --- Data Export ---
      {
        name: 'export_events',
        description: 'Export raw event data from Amplitude for a time range. Returns compressed files with all events in the project during the period.',
        inputSchema: {
          type: 'object',
          properties: {
            start: { type: 'string', description: 'Start datetime in YYYYMMDDTHH format (e.g. 20240101T00 for midnight Jan 1)' },
            end: { type: 'string', description: 'End datetime in YYYYMMDDTHH format (exclusive)' },
          },
          required: ['start', 'end'],
        },
      },
      // --- User Privacy ---
      {
        name: 'delete_user_data',
        description: 'Submit a GDPR/CCPA deletion request for one or more user IDs or device IDs to remove all Amplitude data for those users.',
        inputSchema: {
          type: 'object',
          properties: {
            user_ids: {
              type: 'array',
              description: 'Array of customer user_ids to delete (up to 100 per request)',
              items: { type: 'string' },
            },
            device_ids: {
              type: 'array',
              description: 'Array of device_ids to delete (up to 100 per request)',
              items: { type: 'string' },
            },
            requester: { type: 'string', description: 'Email address of the person requesting the deletion (for audit trail)' },
          },
        },
      },
      {
        name: 'get_deletion_job',
        description: 'Get the status of an Amplitude user data deletion job by its job ID.',
        inputSchema: {
          type: 'object',
          properties: {
            job_id: { type: 'string', description: 'The deletion job ID returned by delete_user_data' },
          },
          required: ['job_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'track_events': return await this.trackEvents(args);
        case 'identify_users': return await this.identifyUsers(args);
        case 'get_active_users': return await this.getActiveUsers(args);
        case 'get_event_segmentation': return await this.getEventSegmentation(args);
        case 'get_funnel': return await this.getFunnel(args);
        case 'get_retention': return await this.getRetention(args);
        case 'get_user_activity': return await this.getUserActivity(args);
        case 'get_user_search': return await this.getUserSearch(args);
        case 'list_cohorts': return await this.listCohorts(args);
        case 'get_cohort': return await this.getCohort(args);
        case 'list_event_types': return await this.listEventTypes(args);
        case 'get_event_type': return await this.getEventType(args);
        case 'list_user_properties': return await this.listUserProperties(args);
        case 'list_event_properties': return await this.listEventProperties(args);
        case 'export_events': return await this.exportEvents(args);
        case 'delete_user_data': return await this.deleteUserData(args);
        case 'get_deletion_job': return await this.getDeletionJob(args);
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

  private async trackEvents(args: Record<string, unknown>): Promise<ToolResult> {
    const events = args.events as unknown[];
    if (!events || !Array.isArray(events) || events.length === 0) {
      return { content: [{ type: 'text', text: 'events array is required and must be non-empty' }], isError: true };
    }
    const body: Record<string, unknown> = { api_key: this.apiKey, events };
    if (args.options) body.options = args.options;
    const response = await this.fetchWithRetry(this.ingestionBaseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async identifyUsers(args: Record<string, unknown>): Promise<ToolResult> {
    const identification = args.identification as unknown[];
    if (!identification || !Array.isArray(identification) || identification.length === 0) {
      return { content: [{ type: 'text', text: 'identification array is required and must be non-empty' }], isError: true };
    }
    const identifyUrl = this.ingestionBaseUrl.replace('/2/httpapi', '/identify');
    const body = { api_key: this.apiKey, identification: JSON.stringify(identification) };
    const response = await this.fetchWithRetry(identifyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(body as Record<string, string>).toString(),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getActiveUsers(args: Record<string, unknown>): Promise<ToolResult> {
    const start = args.start as string;
    const end = args.end as string;
    if (!start || !end) return { content: [{ type: 'text', text: 'start and end are required' }], isError: true };
    let url = `${this.analyticsBaseUrl}/users?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`;
    if (args.m) url += `&m=${encodeURIComponent(args.m as string)}`;
    if (args.i) url += `&i=${encodeURIComponent(args.i as number)}`;
    const response = await this.fetchWithRetry(url, { method: 'GET', headers: { Authorization: this.basicAuthHeader } });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getEventSegmentation(args: Record<string, unknown>): Promise<ToolResult> {
    const e = args.e as object;
    const start = args.start as string;
    const end = args.end as string;
    if (!e || !start || !end) return { content: [{ type: 'text', text: 'e, start, and end are required' }], isError: true };
    let url = `${this.analyticsBaseUrl}/events/segmentation?e=${encodeURIComponent(JSON.stringify(e))}&start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`;
    if (args.m) url += `&m=${encodeURIComponent(args.m as string)}`;
    if (args.i) url += `&i=${encodeURIComponent(args.i as number)}`;
    if (args.s) url += `&s=${encodeURIComponent(JSON.stringify(args.s))}`;
    if (args.g) url += `&g=${encodeURIComponent(JSON.stringify(args.g))}`;
    if (args.limit) url += `&limit=${encodeURIComponent(args.limit as number)}`;
    const response = await this.fetchWithRetry(url, { method: 'GET', headers: { Authorization: this.basicAuthHeader } });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getFunnel(args: Record<string, unknown>): Promise<ToolResult> {
    const e = args.e as object[];
    const start = args.start as string;
    const end = args.end as string;
    if (!e || !Array.isArray(e) || e.length < 2 || !start || !end) {
      return { content: [{ type: 'text', text: 'e (array of at least 2 events), start, and end are required' }], isError: true };
    }
    let url = `${this.analyticsBaseUrl}/funnels?e=${encodeURIComponent(JSON.stringify(e))}&start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`;
    if (args.converted_within) url += `&converted_within=${encodeURIComponent(args.converted_within as number)}`;
    if (args.s) url += `&s=${encodeURIComponent(JSON.stringify(args.s))}`;
    if (args.g) url += `&g=${encodeURIComponent(JSON.stringify(args.g))}`;
    const response = await this.fetchWithRetry(url, { method: 'GET', headers: { Authorization: this.basicAuthHeader } });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getRetention(args: Record<string, unknown>): Promise<ToolResult> {
    const se = args.se as object;
    const re = args.re as object;
    const start = args.start as string;
    const end = args.end as string;
    if (!se || !re || !start || !end) return { content: [{ type: 'text', text: 'se, re, start, and end are required' }], isError: true };
    let url = `${this.analyticsBaseUrl}/retention?se=${encodeURIComponent(JSON.stringify(se))}&re=${encodeURIComponent(JSON.stringify(re))}&start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`;
    if (args.retention_type) url += `&retention_type=${encodeURIComponent(args.retention_type as string)}`;
    if (args.i) url += `&i=${encodeURIComponent(args.i as number)}`;
    const response = await this.fetchWithRetry(url, { method: 'GET', headers: { Authorization: this.basicAuthHeader } });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getUserActivity(args: Record<string, unknown>): Promise<ToolResult> {
    const user = args.user as string;
    if (!user) return { content: [{ type: 'text', text: 'user is required' }], isError: true };
    let url = `${this.analyticsBaseUrl}/useractivity?user=${encodeURIComponent(user)}`;
    if (args.limit) url += `&limit=${encodeURIComponent(args.limit as number)}`;
    const response = await this.fetchWithRetry(url, { method: 'GET', headers: { Authorization: this.basicAuthHeader } });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getUserSearch(args: Record<string, unknown>): Promise<ToolResult> {
    const userId = args.user_id as string;
    if (!userId) return { content: [{ type: 'text', text: 'user_id is required' }], isError: true };
    const url = `${this.analyticsBaseUrl}/usersearch?user=${encodeURIComponent(userId)}`;
    const response = await this.fetchWithRetry(url, { method: 'GET', headers: { Authorization: this.basicAuthHeader } });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listCohorts(_args: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.analyticsBaseUrl}/cohorts`, {
      method: 'GET',
      headers: { Authorization: this.basicAuthHeader },
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getCohort(args: Record<string, unknown>): Promise<ToolResult> {
    const cohortId = args.cohort_id as string;
    if (!cohortId) return { content: [{ type: 'text', text: 'cohort_id is required' }], isError: true };
    let url = `${this.analyticsBaseUrl}/cohorts/request/${encodeURIComponent(cohortId)}`;
    const params: string[] = [];
    if (args.props !== undefined) params.push(`props=${encodeURIComponent(args.props as number)}`);
    if (args.limit !== undefined) params.push(`limit=${encodeURIComponent(args.limit as number)}`);
    if (params.length > 0) url += `?${params.join('&')}`;
    const response = await this.fetchWithRetry(url, { method: 'GET', headers: { Authorization: this.basicAuthHeader } });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listEventTypes(_args: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.analyticsBaseUrl}/taxonomy/event`, {
      method: 'GET',
      headers: { Authorization: this.basicAuthHeader },
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getEventType(args: Record<string, unknown>): Promise<ToolResult> {
    const eventType = args.event_type as string;
    if (!eventType) return { content: [{ type: 'text', text: 'event_type is required' }], isError: true };
    const response = await this.fetchWithRetry(`${this.analyticsBaseUrl}/taxonomy/event/${encodeURIComponent(eventType)}`, {
      method: 'GET',
      headers: { Authorization: this.basicAuthHeader },
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listUserProperties(_args: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.analyticsBaseUrl}/taxonomy/user-property`, {
      method: 'GET',
      headers: { Authorization: this.basicAuthHeader },
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listEventProperties(args: Record<string, unknown>): Promise<ToolResult> {
    const eventType = args.event_type as string;
    if (!eventType) return { content: [{ type: 'text', text: 'event_type is required' }], isError: true };
    const response = await this.fetchWithRetry(`${this.analyticsBaseUrl}/taxonomy/event/${encodeURIComponent(eventType)}/event-property`, {
      method: 'GET',
      headers: { Authorization: this.basicAuthHeader },
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async exportEvents(args: Record<string, unknown>): Promise<ToolResult> {
    const start = args.start as string;
    const end = args.end as string;
    if (!start || !end) return { content: [{ type: 'text', text: 'start and end are required (format: YYYYMMDDTHH)' }], isError: true };
    const url = `${this.analyticsBaseUrl}/export?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`;
    const response = await this.fetchWithRetry(url, { method: 'GET', headers: { Authorization: this.basicAuthHeader } });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    // Export returns a ZIP file; return metadata about the response
    const contentType = response.headers.get('content-type') ?? 'unknown';
    const contentLength = response.headers.get('content-length') ?? 'unknown';
    return {
      content: [{ type: 'text', text: JSON.stringify({ success: true, content_type: contentType, content_length: contentLength, note: 'Binary ZIP file. Consume the stream from the raw HTTP response.' }) }],
      isError: false,
    };
  }

  private async deleteUserData(args: Record<string, unknown>): Promise<ToolResult> {
    const userIds = args.user_ids as string[] | undefined;
    const deviceIds = args.device_ids as string[] | undefined;
    if ((!userIds || userIds.length === 0) && (!deviceIds || deviceIds.length === 0)) {
      return { content: [{ type: 'text', text: 'At least one user_id or device_id is required' }], isError: true };
    }
    const body: Record<string, unknown> = {};
    if (userIds && userIds.length > 0) body.user_ids = userIds;
    if (deviceIds && deviceIds.length > 0) body.amplitude_ids = deviceIds;
    if (args.requester) body.requester = args.requester;
    const response = await this.fetchWithRetry(`${this.analyticsBaseUrl}/deletions/users`, {
      method: 'POST',
      headers: { Authorization: this.basicAuthHeader, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getDeletionJob(args: Record<string, unknown>): Promise<ToolResult> {
    const jobId = args.job_id as string;
    if (!jobId) return { content: [{ type: 'text', text: 'job_id is required' }], isError: true };
    const response = await this.fetchWithRetry(`${this.analyticsBaseUrl}/deletions/users/${encodeURIComponent(jobId)}`, {
      method: 'GET',
      headers: { Authorization: this.basicAuthHeader },
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  static catalog() {
    return {
      name: 'amplitude',
      displayName: 'Amplitude',
      version: '1.0.0',
      category: 'data' as const,
      keywords: ['amplitude'],
      toolNames: ['track_events', 'identify_users', 'get_active_users', 'get_event_segmentation', 'get_funnel', 'get_retention', 'get_user_activity', 'get_user_search', 'list_cohorts', 'get_cohort', 'list_event_types', 'get_event_type', 'list_user_properties', 'list_event_properties', 'export_events', 'delete_user_data', 'get_deletion_job'],
      description: 'Amplitude adapter for the Epic AI Intelligence Platform',
      author: 'protectnil' as const,
    };
  }
}

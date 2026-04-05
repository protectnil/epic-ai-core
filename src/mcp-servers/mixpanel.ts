/**
 * Mixpanel MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://mcp.mixpanel.com (vendor-hosted) — transport: streamable-HTTP, auth: OAuth2 PKCE
// Vendor MCP covers: 19 read/analytics tools (Run-Query, Get-Query-Schema, Get-Report, Create-Dashboard,
//   List-Dashboards, Get-Dashboard, Get-Projects, Get-Events, Get-Property-Names, Get-Property-Values,
//   Get-Event-Details, Get-Issues, Get-Lexicon-URL, Edit-Event, Edit-Property, Create-Tag, Rename-Tag,
//   Delete-Tag, Dismiss-Issues, Get-User-Replays-Data). READ and ANALYTICS ONLY — no ingestion tools.
// Our adapter covers: 15 tools (ingestion + query). Ingestion tools are not exposed by the vendor MCP.
// Recommendation: use-both — MCP covers analytics/dashboard/lexicon; our REST adapter covers all
//   ingestion endpoints (track_event, import_events, engage operations) that the MCP does not expose.
// MCP-sourced tools (0 overlap with our tools): Run-Query, Get-Query-Schema, Get-Report,
//   Create-Dashboard, List-Dashboards, Get-Dashboard, Get-Projects, Get-Events, Get-Property-Names,
//   Get-Property-Values, Get-Event-Details, Get-Issues, Get-Lexicon-URL, Edit-Event, Edit-Property,
//   Create-Tag, Rename-Tag, Delete-Tag, Dismiss-Issues, Get-User-Replays-Data
// REST-sourced tools (15): track_event, import_events, set_user_profile, increment_user_property,
//   append_user_property, union_user_property, remove_user_property, delete_user_profile,
//   query_segmentation, query_funnel, query_retention, query_profiles, query_activity_stream,
//   query_insights, query_jql
// Combined coverage: 35 tools (MCP: 20 + REST: 15 — shared: 0)
//
// Base URL (ingestion): https://api.mixpanel.com  (EU: https://api-eu.mixpanel.com)
// Base URL (query):     https://mixpanel.com/api/2.0
// Auth: Ingestion events use project token in payload.
//       Import + all Query API calls use HTTP Basic auth with service account credentials.
// Docs: https://developer.mixpanel.com/reference/overview
// Rate limits: Query API — 60 req/hr, max 5 concurrent. Ingestion — 2 GB/min or ~30k events/sec.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface MixpanelConfig {
  projectToken: string;
  serviceAccountUsername: string;
  serviceAccountSecret: string;
  /** Project ID — required for analytics query endpoints (query API uses project_id, not token). */
  projectId: string;
  /** Override ingestion base URL. Defaults to https://api.mixpanel.com
   *  EU residency: https://api-eu.mixpanel.com */
  ingestionBaseUrl?: string;
  /** Override analytics base URL. Defaults to https://mixpanel.com/api/2.0 */
  analyticsBaseUrl?: string;
}

export class MixpanelMCPServer extends MCPAdapterBase {
  private readonly projectToken: string;
  private readonly serviceAccountUsername: string;
  private readonly serviceAccountSecret: string;
  private readonly projectId: string;
  private readonly ingestionBaseUrl: string;
  private readonly analyticsBaseUrl: string;

  constructor(config: MixpanelConfig) {
    super();
    this.projectToken = config.projectToken;
    this.serviceAccountUsername = config.serviceAccountUsername;
    this.serviceAccountSecret = config.serviceAccountSecret;
    this.projectId = config.projectId;
    this.ingestionBaseUrl = config.ingestionBaseUrl ?? 'https://api.mixpanel.com';
    this.analyticsBaseUrl = config.analyticsBaseUrl ?? 'https://mixpanel.com/api/2.0';
  }

  static catalog() {
    return {
      name: 'mixpanel',
      displayName: 'Mixpanel',
      version: '1.0.0',
      category: 'misc' as const,
      keywords: [
        'mixpanel', 'analytics', 'product-analytics', 'event-tracking', 'funnel',
        'retention', 'segmentation', 'user-profile', 'cohort', 'behavioral-analytics',
        'engagement', 'jql', 'insights', 'activity-stream',
      ],
      toolNames: [
        'track_event', 'import_events', 'set_user_profile', 'increment_user_property',
        'append_user_property', 'union_user_property', 'remove_user_property',
        'delete_user_profile', 'query_segmentation', 'query_funnel', 'query_retention',
        'query_profiles', 'query_activity_stream', 'query_insights', 'query_jql',
      ],
      description: 'Mixpanel product analytics: track events, manage user profiles, and query segmentation, funnel, retention, and cohort reports.',
      author: 'protectnil' as const,
    };
  }

  private get basicAuthHeader(): string {
    const encoded = btoa(`${this.serviceAccountUsername}:${this.serviceAccountSecret}`);
    return `Basic ${encoded}`;
  }

  private async doEngagePost(record: Record<string, unknown>): Promise<ToolResult> {
    const body = `data=${encodeURIComponent(JSON.stringify(record))}`;
    const response = await this.fetchWithRetry(`${this.ingestionBaseUrl}/engage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body,
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Engage API error: HTTP ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async doQueryGet(path: string, params: Record<string, string | number | undefined>): Promise<ToolResult> {
    const qs = new URLSearchParams();
    qs.set('project_id', this.projectId);
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) qs.set(k, String(v));
    }
    const url = `${this.analyticsBaseUrl}/${path}?${qs.toString()}`;
    const response = await this.fetchWithRetry(url, {
      method: 'GET',
      headers: { Authorization: this.basicAuthHeader, Accept: 'application/json' },
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Query API error: HTTP ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'track_event',
        description: 'Track a single event via the Mixpanel ingestion API. Only accepts events within the last 5 days. Use import_events for historical data.',
        inputSchema: {
          type: 'object',
          properties: {
            event: {
              type: 'string',
              description: 'Name of the event to track',
            },
            distinct_id: {
              type: 'string',
              description: 'Unique identifier for the user performing the event',
            },
            properties: {
              type: 'object',
              description: 'Additional event properties. Token is injected automatically. Optional: $insert_id (deduplication), time (Unix seconds), ip, $city, $region, $country_code.',
            },
          },
          required: ['event', 'distinct_id'],
        },
      },
      {
        name: 'import_events',
        description: 'Bulk-import historical events via the Mixpanel /import endpoint. Accepts events of any age. Max 2000 events per request. Authenticated with service account credentials.',
        inputSchema: {
          type: 'object',
          properties: {
            events: {
              type: 'array',
              description: 'Array of event objects. Each must have: event (string), properties.distinct_id (string), properties.time (Unix seconds). Token is auto-injected if omitted.',
              items: { type: 'object' },
            },
          },
          required: ['events'],
        },
      },
      {
        name: 'set_user_profile',
        description: 'Set or update properties on a Mixpanel user profile ($set operation). Overwrites existing values for specified keys.',
        inputSchema: {
          type: 'object',
          properties: {
            distinct_id: {
              type: 'string',
              description: 'User identifier',
            },
            properties: {
              type: 'object',
              description: 'Profile properties to set (e.g. $name, $email, $phone, $first_name, $last_name, or custom properties)',
            },
            ip: {
              type: 'string',
              description: 'Optional IP address for automatic geo-resolution',
            },
          },
          required: ['distinct_id', 'properties'],
        },
      },
      {
        name: 'increment_user_property',
        description: 'Numerically increment one or more Mixpanel user profile properties ($add operation). Accepts positive or negative values.',
        inputSchema: {
          type: 'object',
          properties: {
            distinct_id: {
              type: 'string',
              description: 'User identifier',
            },
            add: {
              type: 'object',
              description: 'Object mapping property names to numeric increment values (positive or negative)',
            },
          },
          required: ['distinct_id', 'add'],
        },
      },
      {
        name: 'append_user_property',
        description: 'Append values to a list property on a Mixpanel user profile ($append operation). Creates the list if the property does not exist.',
        inputSchema: {
          type: 'object',
          properties: {
            distinct_id: {
              type: 'string',
              description: 'User identifier',
            },
            append: {
              type: 'object',
              description: 'Object mapping list property names to values to append. Each value is appended to the end of the list.',
            },
          },
          required: ['distinct_id', 'append'],
        },
      },
      {
        name: 'union_user_property',
        description: 'Union values into a list property on a Mixpanel user profile ($union operation). Only adds values not already present — prevents duplicates.',
        inputSchema: {
          type: 'object',
          properties: {
            distinct_id: {
              type: 'string',
              description: 'User identifier',
            },
            union: {
              type: 'object',
              description: 'Object mapping list property names to arrays of values to union in.',
            },
          },
          required: ['distinct_id', 'union'],
        },
      },
      {
        name: 'remove_user_property',
        description: 'Remove one or more properties from a Mixpanel user profile ($unset operation). The properties are permanently deleted from the profile.',
        inputSchema: {
          type: 'object',
          properties: {
            distinct_id: {
              type: 'string',
              description: 'User identifier',
            },
            properties: {
              type: 'array',
              description: 'Array of property names to remove from the profile',
              items: { type: 'string' },
            },
          },
          required: ['distinct_id', 'properties'],
        },
      },
      {
        name: 'delete_user_profile',
        description: 'Permanently delete a Mixpanel user profile ($delete operation). This cannot be undone. Events sent by the user are not deleted.',
        inputSchema: {
          type: 'object',
          properties: {
            distinct_id: {
              type: 'string',
              description: 'User identifier to permanently delete',
            },
          },
          required: ['distinct_id'],
        },
      },
      {
        name: 'query_segmentation',
        description: 'Run an event segmentation report returning time-series counts for an event, with optional property breakdown and filters.',
        inputSchema: {
          type: 'object',
          properties: {
            event: {
              type: 'string',
              description: 'Name of the event to analyze',
            },
            from_date: {
              type: 'string',
              description: 'Start date in YYYY-MM-DD format',
            },
            to_date: {
              type: 'string',
              description: 'End date in YYYY-MM-DD format',
            },
            type: {
              type: 'string',
              description: 'Count type: general (event counts, default), unique (distinct users), average, or median',
            },
            unit: {
              type: 'string',
              description: 'Time bucket unit: minute, hour, day (default), week, or month',
            },
            on: {
              type: 'string',
              description: 'Property expression to segment by, e.g. properties["plan"]',
            },
            where: {
              type: 'string',
              description: 'Filter expression, e.g. properties["$country_code"] == "US"',
            },
            limit: {
              type: 'number',
              description: 'Max number of segment values to return (default: 255)',
            },
          },
          required: ['event', 'from_date', 'to_date'],
        },
      },
      {
        name: 'query_funnel',
        description: 'Query a Mixpanel funnel by funnel ID to retrieve step-by-step conversion rates and drop-off counts.',
        inputSchema: {
          type: 'object',
          properties: {
            funnel_id: {
              type: 'number',
              description: 'Numeric funnel ID from the Mixpanel dashboard',
            },
            from_date: {
              type: 'string',
              description: 'Start date in YYYY-MM-DD format',
            },
            to_date: {
              type: 'string',
              description: 'End date in YYYY-MM-DD format',
            },
            unit: {
              type: 'string',
              description: 'Time unit for bucketing: day (default), week, or month',
            },
            on: {
              type: 'string',
              description: 'Property expression to segment the funnel by (optional)',
            },
            where: {
              type: 'string',
              description: 'Filter expression (optional)',
            },
          },
          required: ['funnel_id', 'from_date', 'to_date'],
        },
      },
      {
        name: 'query_retention',
        description: 'Query Mixpanel retention — returns the percentage of users who returned after a "born" event over time.',
        inputSchema: {
          type: 'object',
          properties: {
            from_date: {
              type: 'string',
              description: 'Start date in YYYY-MM-DD format',
            },
            to_date: {
              type: 'string',
              description: 'End date in YYYY-MM-DD format',
            },
            born_event: {
              type: 'string',
              description: 'Event that defines the user cohort (the "born" or first event)',
            },
            event: {
              type: 'string',
              description: 'Return event to measure. If omitted, defaults to any event.',
            },
            retention_type: {
              type: 'string',
              description: 'Type of retention: birth (default) or compounded',
            },
            unit: {
              type: 'string',
              description: 'Time unit: day (default), week, or month',
            },
          },
          required: ['from_date', 'to_date', 'born_event'],
        },
      },
      {
        name: 'query_profiles',
        description: 'Query Mixpanel user profiles matching a filter expression. Returns a paginated list of profile records.',
        inputSchema: {
          type: 'object',
          properties: {
            where: {
              type: 'string',
              description: 'Filter expression using Mixpanel profile filter syntax, e.g. properties["$country_code"] == "US" (optional, returns all if omitted)',
            },
            session_id: {
              type: 'string',
              description: 'Session ID from a previous query response to paginate through results (optional)',
            },
            page: {
              type: 'number',
              description: 'Page number when paginating with session_id (default: 0)',
            },
          },
        },
      },
      {
        name: 'query_activity_stream',
        description: 'Retrieve the event activity feed for a specific user by distinct_id — shows their event history in chronological order.',
        inputSchema: {
          type: 'object',
          properties: {
            distinct_id: {
              type: 'string',
              description: 'User identifier to fetch activity for',
            },
            from_date: {
              type: 'string',
              description: 'Start date in YYYY-MM-DD format',
            },
            to_date: {
              type: 'string',
              description: 'End date in YYYY-MM-DD format',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of events to return (default: 100)',
            },
          },
          required: ['distinct_id'],
        },
      },
      {
        name: 'query_insights',
        description: 'Query a saved Insights report by bookmark ID, returning the same chart data shown in the Mixpanel UI.',
        inputSchema: {
          type: 'object',
          properties: {
            bookmark_id: {
              type: 'number',
              description: 'Numeric ID of a saved Insights report from the Mixpanel dashboard',
            },
          },
          required: ['bookmark_id'],
        },
      },
      {
        name: 'query_jql',
        description: 'Execute a custom JQL (JavaScript Query Language) query against Mixpanel event data. JQL is in maintenance mode; prefer segmentation for new queries.',
        inputSchema: {
          type: 'object',
          properties: {
            script: {
              type: 'string',
              description: 'JQL script as a string. The script must call main() and return a transformation over join() or People()/Events().',
            },
            params: {
              type: 'object',
              description: 'Optional params object passed to the script as script_params (accessible via params in the script)',
            },
          },
          required: ['script'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'track_event':
          return await this.trackEvent(args);
        case 'import_events':
          return await this.importEvents(args);
        case 'set_user_profile':
          return await this.setUserProfile(args);
        case 'increment_user_property':
          return await this.incrementUserProperty(args);
        case 'append_user_property':
          return await this.appendUserProperty(args);
        case 'union_user_property':
          return await this.unionUserProperty(args);
        case 'remove_user_property':
          return await this.removeUserProperty(args);
        case 'delete_user_profile':
          return await this.deleteUserProfile(args);
        case 'query_segmentation':
          return await this.querySegmentation(args);
        case 'query_funnel':
          return await this.queryFunnel(args);
        case 'query_retention':
          return await this.queryRetention(args);
        case 'query_profiles':
          return await this.queryProfiles(args);
        case 'query_activity_stream':
          return await this.queryActivityStream(args);
        case 'query_insights':
          return await this.queryInsights(args);
        case 'query_jql':
          return await this.queryJql(args);
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

  private async trackEvent(args: Record<string, unknown>): Promise<ToolResult> {
    const event = args.event as string;
    const distinct_id = args.distinct_id as string;
    if (!event || !distinct_id) {
      return { content: [{ type: 'text', text: 'event and distinct_id are required' }], isError: true };
    }
    const properties: Record<string, unknown> = {
      token: this.projectToken,
      distinct_id,
      ...(args.properties as Record<string, unknown> ?? {}),
    };
    const payload = [{ event, properties }];
    const body = `data=${encodeURIComponent(JSON.stringify(payload))}`;
    const response = await this.fetchWithRetry(`${this.ingestionBaseUrl}/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body,
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Track error: HTTP ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async importEvents(args: Record<string, unknown>): Promise<ToolResult> {
    const events = args.events as unknown[];
    if (!events || !Array.isArray(events) || events.length === 0) {
      return { content: [{ type: 'text', text: 'events array is required and must be non-empty' }], isError: true };
    }
    const enriched = events.map((ev: unknown) => {
      const e = ev as Record<string, unknown>;
      const props = (e.properties as Record<string, unknown>) ?? {};
      if (!props.token) props.token = this.projectToken;
      return { ...e, properties: props };
    });
    const url = `${this.ingestionBaseUrl}/import?project_id=${encodeURIComponent(this.projectId)}`;
    const response = await this.fetchWithRetry(url, {
      method: 'POST',
      headers: { Authorization: this.basicAuthHeader, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(enriched),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Import error: HTTP ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async setUserProfile(args: Record<string, unknown>): Promise<ToolResult> {
    const distinct_id = args.distinct_id as string;
    const properties = args.properties as Record<string, unknown>;
    if (!distinct_id || !properties) {
      return { content: [{ type: 'text', text: 'distinct_id and properties are required' }], isError: true };
    }
    const record: Record<string, unknown> = {
      $token: this.projectToken,
      $distinct_id: distinct_id,
      $set: properties,
    };
    if (args.ip) record.$ip = args.ip;
    return this.doEngagePost(record);
  }

  private async incrementUserProperty(args: Record<string, unknown>): Promise<ToolResult> {
    const distinct_id = args.distinct_id as string;
    const add = args.add as Record<string, unknown>;
    if (!distinct_id || !add) {
      return { content: [{ type: 'text', text: 'distinct_id and add are required' }], isError: true };
    }
    return this.doEngagePost({ $token: this.projectToken, $distinct_id: distinct_id, $add: add });
  }

  private async appendUserProperty(args: Record<string, unknown>): Promise<ToolResult> {
    const distinct_id = args.distinct_id as string;
    const append = args.append as Record<string, unknown>;
    if (!distinct_id || !append) {
      return { content: [{ type: 'text', text: 'distinct_id and append are required' }], isError: true };
    }
    return this.doEngagePost({ $token: this.projectToken, $distinct_id: distinct_id, $append: append });
  }

  private async unionUserProperty(args: Record<string, unknown>): Promise<ToolResult> {
    const distinct_id = args.distinct_id as string;
    const union = args.union as Record<string, unknown>;
    if (!distinct_id || !union) {
      return { content: [{ type: 'text', text: 'distinct_id and union are required' }], isError: true };
    }
    return this.doEngagePost({ $token: this.projectToken, $distinct_id: distinct_id, $union: union });
  }

  private async removeUserProperty(args: Record<string, unknown>): Promise<ToolResult> {
    const distinct_id = args.distinct_id as string;
    const properties = args.properties as string[];
    if (!distinct_id || !properties) {
      return { content: [{ type: 'text', text: 'distinct_id and properties are required' }], isError: true };
    }
    return this.doEngagePost({ $token: this.projectToken, $distinct_id: distinct_id, $unset: properties });
  }

  private async deleteUserProfile(args: Record<string, unknown>): Promise<ToolResult> {
    const distinct_id = args.distinct_id as string;
    if (!distinct_id) {
      return { content: [{ type: 'text', text: 'distinct_id is required' }], isError: true };
    }
    return this.doEngagePost({ $token: this.projectToken, $distinct_id: distinct_id, $delete: '' });
  }

  private async querySegmentation(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string | number | undefined> = {
      event: args.event as string,
      from_date: args.from_date as string,
      to_date: args.to_date as string,
      type: args.type as string | undefined,
      unit: args.unit as string | undefined,
      on: args.on as string | undefined,
      where: args.where as string | undefined,
      limit: args.limit as number | undefined,
    };
    return this.doQueryGet('segmentation', params);
  }

  private async queryFunnel(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string | number | undefined> = {
      funnel_id: args.funnel_id as number,
      from_date: args.from_date as string,
      to_date: args.to_date as string,
      unit: args.unit as string | undefined,
      on: args.on as string | undefined,
      where: args.where as string | undefined,
    };
    return this.doQueryGet('funnels', params);
  }

  private async queryRetention(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string | number | undefined> = {
      from_date: args.from_date as string,
      to_date: args.to_date as string,
      born_event: args.born_event as string,
      event: args.event as string | undefined,
      retention_type: args.retention_type as string | undefined,
      unit: args.unit as string | undefined,
    };
    return this.doQueryGet('retention', params);
  }

  private async queryProfiles(args: Record<string, unknown>): Promise<ToolResult> {
    // Query Profiles is POST per Mixpanel docs (developer.mixpanel.com/reference/engage-query)
    const qs = new URLSearchParams({ project_id: this.projectId });
    const url = `${this.analyticsBaseUrl}/engage?${qs.toString()}`;
    const body: Record<string, unknown> = {};
    if (args.where !== undefined) body.where = args.where;
    if (args.session_id !== undefined) body.session_id = args.session_id;
    if (args.page !== undefined) body.page = args.page;
    const response = await this.fetchWithRetry(url, {
      method: 'POST',
      headers: { Authorization: this.basicAuthHeader, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Engage query error: HTTP ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async queryActivityStream(args: Record<string, unknown>): Promise<ToolResult> {
    const distinct_id = args.distinct_id as string;
    if (!distinct_id) {
      return { content: [{ type: 'text', text: 'distinct_id is required' }], isError: true };
    }
    const params: Record<string, string | number | undefined> = {
      distinct_id,
      from_date: args.from_date as string | undefined,
      to_date: args.to_date as string | undefined,
      limit: args.limit as number | undefined,
    };
    return this.doQueryGet('stream/query', params);
  }

  private async queryInsights(args: Record<string, unknown>): Promise<ToolResult> {
    const bookmark_id = args.bookmark_id as number;
    if (!bookmark_id) {
      return { content: [{ type: 'text', text: 'bookmark_id is required' }], isError: true };
    }
    return this.doQueryGet('insights', { bookmark_id });
  }

  private async queryJql(args: Record<string, unknown>): Promise<ToolResult> {
    const script = args.script as string;
    if (!script) {
      return { content: [{ type: 'text', text: 'script is required' }], isError: true };
    }
    const qs = new URLSearchParams({ project_id: this.projectId });
    const url = `${this.analyticsBaseUrl}/jql?${qs.toString()}`;
    const body: Record<string, unknown> = { script };
    if (args.params) body.params = JSON.stringify(args.params);
    const response = await this.fetchWithRetry(url, {
      method: 'POST',
      headers: {
        Authorization: this.basicAuthHeader,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `JQL error: HTTP ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }
}

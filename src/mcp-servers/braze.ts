/**
 * Braze MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03. Braze has not published an official MCP server on GitHub.
//
// Base URL: https://rest.iad-01.braze.com  (cluster-specific — US-01 default)
//   Other clusters: iad-02, iad-03, iad-04, iad-05, iad-06, iad-07, iad-08, eu-01, eu-02
//   Always use the cluster matching your Braze dashboard URL.
// Auth: Authorization: Bearer {api_key}
//   API keys are created in Braze Dashboard > Developer Console > API Keys.
//   Each key has granular per-endpoint permission scopes.
// Docs: https://www.braze.com/docs/api/basics/
// Rate limits: Most endpoints: 250,000 requests/hour. Campaign/Canvas detail: 1,000/hour.
//   Send endpoints: 250/minute for triggered sends.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface BrazeConfig {
  /** Braze REST API key (from Dashboard > Developer Console > API Keys) */
  apiKey: string;
  /** Braze REST endpoint URL for your cluster, e.g. https://rest.iad-01.braze.com */
  baseUrl?: string;
}

export class BrazeMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: BrazeConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = (config.baseUrl ?? 'https://rest.iad-01.braze.com').replace(/\/+$/, '');
  }

  static catalog() {
    return {
      name: 'braze',
      displayName: 'Braze',
      version: '1.0.0',
      category: 'marketing' as const,
      keywords: [
        'braze', 'marketing', 'push notification', 'email marketing', 'sms', 'campaign',
        'canvas', 'segment', 'analytics', 'customer engagement', 'messaging',
        'mobile marketing', 'in-app message', 'content block', 'email template',
        'subscription', 'unsubscribe', 'kpi', 'dau', 'mau', 'retention',
        'event tracking', 'user attribute', 'audience', 'trigger', 'schedule',
        'broadcast', 'conversion', 'funnel', 'cohort', 'ab test', 'multivariate',
      ],
      toolNames: [
        'list_campaigns',
        'get_campaign_details',
        'get_campaign_analytics',
        'list_canvases',
        'get_canvas_details',
        'get_canvas_analytics',
        'get_canvas_data_summary',
        'schedule_canvas_trigger',
        'list_segments',
        'get_segment_details',
        'get_segment_analytics',
        'list_content_blocks',
        'get_content_block',
        'list_email_templates',
        'get_email_template',
        'get_hard_bounces',
        'get_email_unsubscribes',
        'get_custom_events_list',
        'get_custom_events_analytics',
        'get_kpi_dau',
        'get_kpi_mau',
        'get_kpi_new_users',
        'get_kpi_uninstalls',
        'get_app_sessions',
        'get_news_feed_card_analytics',
        'list_news_feed_cards',
        'get_news_feed_card_details',
        'get_send_analytics',
        'get_scheduled_broadcasts',
        'get_subscription_group_status',
        'list_user_subscription_groups',
      ],
      description: 'Braze customer engagement platform: manage campaigns, canvases, segments, content blocks, email templates, and analytics for push, email, and SMS channels.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_campaigns',
        description: 'List all Braze campaigns with optional filtering by archived status and sort direction',
        inputSchema: {
          type: 'object',
          properties: {
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 0)',
            },
            include_archived: {
              type: 'boolean',
              description: 'Whether to include archived campaigns (default: false)',
            },
            sort_direction: {
              type: 'string',
              description: 'Sort order: "asc" or "desc" (default: desc by last edited)',
            },
            last_edit_time_gt: {
              type: 'string',
              description: 'Filter campaigns last edited after this ISO 8601 datetime, e.g. 2026-01-01T00:00:00Z',
            },
          },
        },
      },
      {
        name: 'get_campaign_details',
        description: 'Get full details for a specific Braze campaign including messages, schedule, and conversion events',
        inputSchema: {
          type: 'object',
          properties: {
            campaign_id: {
              type: 'string',
              description: 'Braze campaign ID (from list_campaigns)',
            },
          },
          required: ['campaign_id'],
        },
      },
      {
        name: 'get_campaign_analytics',
        description: 'Get time-series performance analytics for a Braze campaign — sends, opens, clicks, conversions',
        inputSchema: {
          type: 'object',
          properties: {
            campaign_id: {
              type: 'string',
              description: 'Braze campaign ID',
            },
            length: {
              type: 'number',
              description: 'Number of days of data to return (max: 100)',
            },
            ending_at: {
              type: 'string',
              description: 'End date for the analytics window in ISO 8601 format (default: now)',
            },
          },
          required: ['campaign_id'],
        },
      },
      {
        name: 'list_canvases',
        description: 'List all Braze Canvas multi-step journeys with optional archived filter and sort',
        inputSchema: {
          type: 'object',
          properties: {
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 0)',
            },
            include_archived: {
              type: 'boolean',
              description: 'Whether to include archived canvases (default: false)',
            },
            sort_direction: {
              type: 'string',
              description: 'Sort order: "asc" or "desc"',
            },
            last_edit_time_gt: {
              type: 'string',
              description: 'ISO 8601 datetime — only return canvases edited after this date',
            },
          },
        },
      },
      {
        name: 'get_canvas_details',
        description: 'Get full details for a specific Braze Canvas including steps, variants, and schedule',
        inputSchema: {
          type: 'object',
          properties: {
            canvas_id: {
              type: 'string',
              description: 'Braze Canvas ID (from list_canvases)',
            },
          },
          required: ['canvas_id'],
        },
      },
      {
        name: 'get_canvas_analytics',
        description: 'Get time-series analytics for a Canvas — entries, conversions, revenue per step per variant',
        inputSchema: {
          type: 'object',
          properties: {
            canvas_id: {
              type: 'string',
              description: 'Braze Canvas ID',
            },
            ending_at: {
              type: 'string',
              description: 'End of analytics window in ISO 8601 format (default: now)',
            },
            starting_at: {
              type: 'string',
              description: 'Start of analytics window in ISO 8601 format',
            },
            length: {
              type: 'number',
              description: 'Number of days to return if starting_at is omitted',
            },
            include_variant_breakdown: {
              type: 'boolean',
              description: 'Include variant-level breakdown in results',
            },
            include_step_breakdown: {
              type: 'boolean',
              description: 'Include step-level breakdown in results',
            },
          },
          required: ['canvas_id'],
        },
      },
      {
        name: 'get_canvas_data_summary',
        description: 'Get aggregated summary analytics for a Canvas over a date range — total entries, conversions, revenue',
        inputSchema: {
          type: 'object',
          properties: {
            canvas_id: {
              type: 'string',
              description: 'Braze Canvas ID',
            },
            ending_at: {
              type: 'string',
              description: 'End of summary window in ISO 8601 format',
            },
            starting_at: {
              type: 'string',
              description: 'Start of summary window in ISO 8601 format',
            },
            length: {
              type: 'number',
              description: 'Number of days if starting_at is omitted',
            },
            include_variant_breakdown: {
              type: 'boolean',
              description: 'Include per-variant breakdown',
            },
            include_step_breakdown: {
              type: 'boolean',
              description: 'Include per-step breakdown',
            },
          },
          required: ['canvas_id'],
        },
      },
      {
        name: 'schedule_canvas_trigger',
        description: 'Schedule an API-triggered Canvas send with optional audience targeting, entry properties, and recipients',
        inputSchema: {
          type: 'object',
          properties: {
            canvas_id: {
              type: 'string',
              description: 'Braze Canvas ID to trigger',
            },
            schedule: {
              type: 'object',
              description: 'Schedule object with "time" (ISO 8601) and optional "in_local_time" boolean',
            },
            audience: {
              type: 'object',
              description: 'Connected audience filter object to target specific users',
            },
            broadcast: {
              type: 'boolean',
              description: 'Set to true to send to all users matching the Canvas entry conditions',
            },
            canvas_entry_properties: {
              type: 'object',
              description: 'Key-value properties passed to Canvas entry trigger steps',
            },
            recipients: {
              type: 'array',
              description: 'Array of recipient objects: [{external_user_id: "...", canvas_entry_properties: {...}}]',
            },
          },
          required: ['canvas_id', 'schedule'],
        },
      },
      {
        name: 'list_segments',
        description: 'List all audience segments in Braze with optional sort direction',
        inputSchema: {
          type: 'object',
          properties: {
            page: {
              type: 'number',
              description: 'Page number (default: 0)',
            },
            sort_direction: {
              type: 'string',
              description: '"asc" or "desc" (default: desc)',
            },
          },
        },
      },
      {
        name: 'get_segment_details',
        description: 'Get details for a specific Braze segment including name, filter definition, and analytics tracking',
        inputSchema: {
          type: 'object',
          properties: {
            segment_id: {
              type: 'string',
              description: 'Braze segment ID (from list_segments)',
            },
          },
          required: ['segment_id'],
        },
      },
      {
        name: 'get_segment_analytics',
        description: 'Get daily size history for a Braze segment — how many users were in it over time',
        inputSchema: {
          type: 'object',
          properties: {
            segment_id: {
              type: 'string',
              description: 'Braze segment ID',
            },
            length: {
              type: 'number',
              description: 'Number of days of data to return (max: 100)',
            },
            ending_at: {
              type: 'string',
              description: 'End date for analytics in ISO 8601 format (default: now)',
            },
          },
          required: ['segment_id'],
        },
      },
      {
        name: 'list_content_blocks',
        description: 'List all reusable Content Blocks in Braze with optional date filters for modified date',
        inputSchema: {
          type: 'object',
          properties: {
            modified_after: {
              type: 'string',
              description: 'ISO 8601 datetime — only return blocks modified after this time',
            },
            modified_before: {
              type: 'string',
              description: 'ISO 8601 datetime — only return blocks modified before this time',
            },
            limit: {
              type: 'number',
              description: 'Maximum results to return (default: 100, max: 1000)',
            },
            offset: {
              type: 'number',
              description: 'Number of results to skip for pagination',
            },
          },
        },
      },
      {
        name: 'get_content_block',
        description: 'Get detailed information about a specific Braze Content Block including HTML content and inclusion data',
        inputSchema: {
          type: 'object',
          properties: {
            content_block_id: {
              type: 'string',
              description: 'Content Block ID (from list_content_blocks)',
            },
            include_inclusion_data: {
              type: 'boolean',
              description: 'Include list of campaigns/canvases that reference this block',
            },
          },
          required: ['content_block_id'],
        },
      },
      {
        name: 'list_email_templates',
        description: 'List all email templates in Braze with optional date range filters',
        inputSchema: {
          type: 'object',
          properties: {
            modified_after: {
              type: 'string',
              description: 'ISO 8601 datetime — only return templates modified after this time',
            },
            modified_before: {
              type: 'string',
              description: 'ISO 8601 datetime — only return templates modified before this time',
            },
            limit: {
              type: 'number',
              description: 'Maximum results to return (default: 100, max: 1000)',
            },
            offset: {
              type: 'number',
              description: 'Number of results to skip for pagination',
            },
          },
        },
      },
      {
        name: 'get_email_template',
        description: 'Get the full content and metadata of a specific Braze email template',
        inputSchema: {
          type: 'object',
          properties: {
            email_template_id: {
              type: 'string',
              description: 'Email template ID (from list_email_templates)',
            },
          },
          required: ['email_template_id'],
        },
      },
      {
        name: 'get_hard_bounces',
        description: 'Query email addresses that hard-bounced within a date range — useful for list hygiene',
        inputSchema: {
          type: 'object',
          properties: {
            start_date: {
              type: 'string',
              description: 'Start of date range in YYYY-MM-DD format',
            },
            end_date: {
              type: 'string',
              description: 'End of date range in YYYY-MM-DD format',
            },
            limit: {
              type: 'number',
              description: 'Maximum results to return (default: 100)',
            },
            offset: {
              type: 'number',
              description: 'Number of results to skip for pagination',
            },
            email: {
              type: 'string',
              description: 'Filter to check hard-bounce status for a specific email address',
            },
          },
        },
      },
      {
        name: 'get_email_unsubscribes',
        description: 'Query email addresses that unsubscribed within a date range',
        inputSchema: {
          type: 'object',
          properties: {
            start_date: {
              type: 'string',
              description: 'Start of date range in YYYY-MM-DD format',
            },
            end_date: {
              type: 'string',
              description: 'End of date range in YYYY-MM-DD format',
            },
            limit: {
              type: 'number',
              description: 'Maximum results to return (default: 100)',
            },
            offset: {
              type: 'number',
              description: 'Number of results to skip for pagination',
            },
            sort_direction: {
              type: 'string',
              description: '"asc" or "desc" (default: asc)',
            },
            email: {
              type: 'string',
              description: 'Filter for a specific email address unsubscribe status',
            },
          },
        },
      },
      {
        name: 'get_custom_events_list',
        description: 'List all custom events tracked in the Braze app — useful for discovering available event names',
        inputSchema: {
          type: 'object',
          properties: {
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 0)',
            },
          },
        },
      },
      {
        name: 'get_custom_events_analytics',
        description: 'Get time-series analytics for a custom event — occurrence counts over time with optional segmentation',
        inputSchema: {
          type: 'object',
          properties: {
            event: {
              type: 'string',
              description: 'Custom event name to get analytics for',
            },
            length: {
              type: 'number',
              description: 'Number of days of data to return (max: 100)',
            },
            unit: {
              type: 'string',
              description: 'Aggregation unit: "day" or "hour" (default: day)',
            },
            ending_at: {
              type: 'string',
              description: 'End of analytics window in ISO 8601 format (default: now)',
            },
            app_id: {
              type: 'string',
              description: 'Filter analytics to a specific app ID',
            },
            segment_id: {
              type: 'string',
              description: 'Filter analytics to users in a specific segment',
            },
          },
          required: ['event'],
        },
      },
      {
        name: 'get_kpi_dau',
        description: 'Get daily active users (DAU) time-series KPI data — tracks unique daily app opens',
        inputSchema: {
          type: 'object',
          properties: {
            length: {
              type: 'number',
              description: 'Number of days of data to return (max: 100)',
            },
            ending_at: {
              type: 'string',
              description: 'End of data window in ISO 8601 format (default: now)',
            },
            app_id: {
              type: 'string',
              description: 'Filter to a specific app ID',
            },
          },
        },
      },
      {
        name: 'get_kpi_mau',
        description: 'Get monthly active users (MAU) for the last 30 days — rolling 30-day unique user count',
        inputSchema: {
          type: 'object',
          properties: {
            length: {
              type: 'number',
              description: 'Number of days of data to return',
            },
            ending_at: {
              type: 'string',
              description: 'End of data window in ISO 8601 format (default: now)',
            },
            app_id: {
              type: 'string',
              description: 'Filter to a specific app ID',
            },
          },
        },
      },
      {
        name: 'get_kpi_new_users',
        description: 'Get daily new user registration counts — tracks first-time app opens per day',
        inputSchema: {
          type: 'object',
          properties: {
            length: {
              type: 'number',
              description: 'Number of days of data to return (max: 100)',
            },
            ending_at: {
              type: 'string',
              description: 'End of data window in ISO 8601 format (default: now)',
            },
            app_id: {
              type: 'string',
              description: 'Filter to a specific app ID',
            },
          },
        },
      },
      {
        name: 'get_kpi_uninstalls',
        description: 'Get daily app uninstall counts — tracks users who uninstalled the app per day',
        inputSchema: {
          type: 'object',
          properties: {
            length: {
              type: 'number',
              description: 'Number of days of data to return (max: 100)',
            },
            ending_at: {
              type: 'string',
              description: 'End of data window in ISO 8601 format (default: now)',
            },
            app_id: {
              type: 'string',
              description: 'Filter to a specific app ID',
            },
          },
        },
      },
      {
        name: 'get_app_sessions',
        description: 'Get time-series app session counts — number of sessions per day or hour with optional segment filter',
        inputSchema: {
          type: 'object',
          properties: {
            length: {
              type: 'number',
              description: 'Number of days of data (max: 100)',
            },
            unit: {
              type: 'string',
              description: 'Aggregation unit: "day" or "hour" (default: day)',
            },
            ending_at: {
              type: 'string',
              description: 'End of analytics window in ISO 8601 format (default: now)',
            },
            app_id: {
              type: 'string',
              description: 'Filter to a specific app ID',
            },
            segment_id: {
              type: 'string',
              description: 'Filter to users in a specific segment',
            },
          },
        },
      },
      {
        name: 'get_news_feed_card_analytics',
        description: 'Get time-series analytics for a News Feed card — impressions, clicks, and click-through rates',
        inputSchema: {
          type: 'object',
          properties: {
            card_id: {
              type: 'string',
              description: 'News Feed card ID',
            },
            length: {
              type: 'number',
              description: 'Number of days of data to return (max: 100)',
            },
            unit: {
              type: 'string',
              description: '"day" or "hour" (default: day)',
            },
            ending_at: {
              type: 'string',
              description: 'End of analytics window in ISO 8601 format',
            },
          },
          required: ['card_id'],
        },
      },
      {
        name: 'list_news_feed_cards',
        description: 'List all News Feed cards in Braze with optional archived filter and sort direction',
        inputSchema: {
          type: 'object',
          properties: {
            page: {
              type: 'number',
              description: 'Page number (default: 0)',
            },
            include_archived: {
              type: 'boolean',
              description: 'Include archived cards (default: false)',
            },
            sort_direction: {
              type: 'string',
              description: '"asc" or "desc"',
            },
          },
        },
      },
      {
        name: 'get_news_feed_card_details',
        description: 'Get details for a specific Braze News Feed card including content, schedule, and targeting',
        inputSchema: {
          type: 'object',
          properties: {
            card_id: {
              type: 'string',
              description: 'News Feed card ID (from list_news_feed_cards)',
            },
          },
          required: ['card_id'],
        },
      },
      {
        name: 'get_send_analytics',
        description: 'Get analytics for a specific campaign send (send_id) — tracks performance of a single send instance',
        inputSchema: {
          type: 'object',
          properties: {
            campaign_id: {
              type: 'string',
              description: 'Campaign ID that generated this send',
            },
            send_id: {
              type: 'string',
              description: 'Specific send ID to get analytics for',
            },
            length: {
              type: 'number',
              description: 'Number of days of data to return (max: 100)',
            },
            ending_at: {
              type: 'string',
              description: 'End of analytics window in ISO 8601 format',
            },
          },
          required: ['campaign_id', 'send_id'],
        },
      },
      {
        name: 'get_scheduled_broadcasts',
        description: 'Get a list of upcoming scheduled campaign and canvas broadcasts before a given time',
        inputSchema: {
          type: 'object',
          properties: {
            end_time: {
              type: 'string',
              description: 'ISO 8601 datetime — return broadcasts scheduled before this time (default: 14 days from now)',
            },
          },
        },
      },
      {
        name: 'get_subscription_group_status',
        description: "Get a user's subscription group status for SMS — whether they are subscribed or unsubscribed",
        inputSchema: {
          type: 'object',
          properties: {
            subscription_group_id: {
              type: 'string',
              description: 'Subscription group ID',
            },
            external_id: {
              type: 'string',
              description: "User's external ID (Braze user identifier)",
            },
            phone: {
              type: 'string',
              description: "User's phone number in E.164 format, e.g. +12025551234",
            },
          },
          required: ['subscription_group_id'],
        },
      },
      {
        name: 'list_user_subscription_groups',
        description: "List all SMS subscription groups and their statuses for a specific user",
        inputSchema: {
          type: 'object',
          properties: {
            external_id: {
              type: 'string',
              description: "User's external ID",
            },
            limit: {
              type: 'number',
              description: 'Maximum groups to return (default: 100)',
            },
            offset: {
              type: 'number',
              description: 'Pagination offset',
            },
            phone: {
              type: 'string',
              description: "User phone number in E.164 format",
            },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_campaigns':
          return this.listCampaigns(args);
        case 'get_campaign_details':
          return this.getCampaignDetails(args);
        case 'get_campaign_analytics':
          return this.getCampaignAnalytics(args);
        case 'list_canvases':
          return this.listCanvases(args);
        case 'get_canvas_details':
          return this.getCanvasDetails(args);
        case 'get_canvas_analytics':
          return this.getCanvasAnalytics(args);
        case 'get_canvas_data_summary':
          return this.getCanvasDataSummary(args);
        case 'schedule_canvas_trigger':
          return this.scheduleCanvasTrigger(args);
        case 'list_segments':
          return this.listSegments(args);
        case 'get_segment_details':
          return this.getSegmentDetails(args);
        case 'get_segment_analytics':
          return this.getSegmentAnalytics(args);
        case 'list_content_blocks':
          return this.listContentBlocks(args);
        case 'get_content_block':
          return this.getContentBlock(args);
        case 'list_email_templates':
          return this.listEmailTemplates(args);
        case 'get_email_template':
          return this.getEmailTemplate(args);
        case 'get_hard_bounces':
          return this.getHardBounces(args);
        case 'get_email_unsubscribes':
          return this.getEmailUnsubscribes(args);
        case 'get_custom_events_list':
          return this.getCustomEventsList(args);
        case 'get_custom_events_analytics':
          return this.getCustomEventsAnalytics(args);
        case 'get_kpi_dau':
          return this.getKpiDau(args);
        case 'get_kpi_mau':
          return this.getKpiMau(args);
        case 'get_kpi_new_users':
          return this.getKpiNewUsers(args);
        case 'get_kpi_uninstalls':
          return this.getKpiUninstalls(args);
        case 'get_app_sessions':
          return this.getAppSessions(args);
        case 'get_news_feed_card_analytics':
          return this.getNewsFeedCardAnalytics(args);
        case 'list_news_feed_cards':
          return this.listNewsFeedCards(args);
        case 'get_news_feed_card_details':
          return this.getNewsFeedCardDetails(args);
        case 'get_send_analytics':
          return this.getSendAnalytics(args);
        case 'get_scheduled_broadcasts':
          return this.getScheduledBroadcasts(args);
        case 'get_subscription_group_status':
          return this.getSubscriptionGroupStatus(args);
        case 'list_user_subscription_groups':
          return this.listUserSubscriptionGroups(args);
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

  private get headers(): Record<string, string> {
    return {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  private async get(path: string, params: Record<string, string | undefined> = {}): Promise<ToolResult> {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) qs.set(k, v);
    }
    const query = qs.toString();
    const url = `${this.baseUrl}${path}${query ? '?' + query : ''}`;
    const response = await this.fetchWithRetry(url, { method: 'GET', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Braze returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async post(path: string, body: unknown): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `API error: ${response.status} ${errText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Braze returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  // ── Tool implementations ──

  private async listCampaigns(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string | undefined> = {
      page: args.page !== undefined ? String(args.page) : undefined,
      include_archived: args.include_archived !== undefined ? String(args.include_archived) : undefined,
      sort_direction: args.sort_direction as string | undefined,
      'last_edit.time[gt]': args.last_edit_time_gt as string | undefined,
    };
    return this.get('/campaigns/list', params);
  }

  private async getCampaignDetails(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.campaign_id) return { content: [{ type: 'text', text: 'campaign_id is required' }], isError: true };
    return this.get('/campaigns/details', { campaign_id: args.campaign_id as string });
  }

  private async getCampaignAnalytics(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.campaign_id) return { content: [{ type: 'text', text: 'campaign_id is required' }], isError: true };
    const params: Record<string, string | undefined> = {
      campaign_id: args.campaign_id as string,
      length: args.length !== undefined ? String(args.length) : undefined,
      ending_at: args.ending_at as string | undefined,
    };
    return this.get('/campaigns/data_series', params);
  }

  private async listCanvases(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string | undefined> = {
      page: args.page !== undefined ? String(args.page) : undefined,
      include_archived: args.include_archived !== undefined ? String(args.include_archived) : undefined,
      sort_direction: args.sort_direction as string | undefined,
      'last_edit.time[gt]': args.last_edit_time_gt as string | undefined,
    };
    return this.get('/canvas/list', params);
  }

  private async getCanvasDetails(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.canvas_id) return { content: [{ type: 'text', text: 'canvas_id is required' }], isError: true };
    return this.get('/canvas/details', { canvas_id: args.canvas_id as string });
  }

  private async getCanvasAnalytics(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.canvas_id) return { content: [{ type: 'text', text: 'canvas_id is required' }], isError: true };
    const params: Record<string, string | undefined> = {
      canvas_id: args.canvas_id as string,
      ending_at: args.ending_at as string | undefined,
      starting_at: args.starting_at as string | undefined,
      length: args.length !== undefined ? String(args.length) : undefined,
      include_variant_breakdown: args.include_variant_breakdown !== undefined ? String(args.include_variant_breakdown) : undefined,
      include_step_breakdown: args.include_step_breakdown !== undefined ? String(args.include_step_breakdown) : undefined,
      include_deleted_step_data: args.include_deleted_step_data !== undefined ? String(args.include_deleted_step_data) : undefined,
    };
    return this.get('/canvas/data_series', params);
  }

  private async getCanvasDataSummary(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.canvas_id) return { content: [{ type: 'text', text: 'canvas_id is required' }], isError: true };
    const params: Record<string, string | undefined> = {
      canvas_id: args.canvas_id as string,
      ending_at: args.ending_at as string | undefined,
      starting_at: args.starting_at as string | undefined,
      length: args.length !== undefined ? String(args.length) : undefined,
      include_variant_breakdown: args.include_variant_breakdown !== undefined ? String(args.include_variant_breakdown) : undefined,
      include_step_breakdown: args.include_step_breakdown !== undefined ? String(args.include_step_breakdown) : undefined,
    };
    return this.get('/canvas/data_summary', params);
  }

  private async scheduleCanvasTrigger(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.canvas_id || !args.schedule) {
      return { content: [{ type: 'text', text: 'canvas_id and schedule are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      canvas_id: args.canvas_id,
      schedule: args.schedule,
    };
    if (args.audience !== undefined) body.audience = args.audience;
    if (args.broadcast !== undefined) body.broadcast = args.broadcast;
    if (args.canvas_entry_properties !== undefined) body.canvas_entry_properties = args.canvas_entry_properties;
    if (args.recipients !== undefined) body.recipients = args.recipients;
    return this.post('/canvas/trigger/schedule/create', body);
  }

  private async listSegments(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string | undefined> = {
      page: args.page !== undefined ? String(args.page) : undefined,
      sort_direction: args.sort_direction as string | undefined,
    };
    return this.get('/segments/list', params);
  }

  private async getSegmentDetails(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.segment_id) return { content: [{ type: 'text', text: 'segment_id is required' }], isError: true };
    return this.get('/segments/details', { segment_id: args.segment_id as string });
  }

  private async getSegmentAnalytics(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.segment_id) return { content: [{ type: 'text', text: 'segment_id is required' }], isError: true };
    const params: Record<string, string | undefined> = {
      segment_id: args.segment_id as string,
      length: args.length !== undefined ? String(args.length) : undefined,
      ending_at: args.ending_at as string | undefined,
    };
    return this.get('/segments/data_series', params);
  }

  private async listContentBlocks(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string | undefined> = {
      modified_after: args.modified_after as string | undefined,
      modified_before: args.modified_before as string | undefined,
      limit: args.limit !== undefined ? String(args.limit) : undefined,
      offset: args.offset !== undefined ? String(args.offset) : undefined,
    };
    return this.get('/content_blocks/list', params);
  }

  private async getContentBlock(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.content_block_id) return { content: [{ type: 'text', text: 'content_block_id is required' }], isError: true };
    const params: Record<string, string | undefined> = {
      content_block_id: args.content_block_id as string,
      include_inclusion_data: args.include_inclusion_data !== undefined ? String(args.include_inclusion_data) : undefined,
    };
    return this.get('/content_blocks/info', params);
  }

  private async listEmailTemplates(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string | undefined> = {
      modified_after: args.modified_after as string | undefined,
      modified_before: args.modified_before as string | undefined,
      limit: args.limit !== undefined ? String(args.limit) : undefined,
      offset: args.offset !== undefined ? String(args.offset) : undefined,
    };
    return this.get('/templates/email/list', params);
  }

  private async getEmailTemplate(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.email_template_id) return { content: [{ type: 'text', text: 'email_template_id is required' }], isError: true };
    return this.get('/templates/email/info', { email_template_id: args.email_template_id as string });
  }

  private async getHardBounces(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string | undefined> = {
      start_date: args.start_date as string | undefined,
      end_date: args.end_date as string | undefined,
      limit: args.limit !== undefined ? String(args.limit) : undefined,
      offset: args.offset !== undefined ? String(args.offset) : undefined,
      email: args.email as string | undefined,
    };
    return this.get('/email/hard_bounces', params);
  }

  private async getEmailUnsubscribes(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string | undefined> = {
      start_date: args.start_date as string | undefined,
      end_date: args.end_date as string | undefined,
      limit: args.limit !== undefined ? String(args.limit) : undefined,
      offset: args.offset !== undefined ? String(args.offset) : undefined,
      sort_direction: args.sort_direction as string | undefined,
      email: args.email as string | undefined,
    };
    return this.get('/email/unsubscribes', params);
  }

  private async getCustomEventsList(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string | undefined> = {
      page: args.page !== undefined ? String(args.page) : undefined,
    };
    return this.get('/events/list', params);
  }

  private async getCustomEventsAnalytics(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.event) return { content: [{ type: 'text', text: 'event is required' }], isError: true };
    const params: Record<string, string | undefined> = {
      event: args.event as string,
      length: args.length !== undefined ? String(args.length) : undefined,
      unit: args.unit as string | undefined,
      ending_at: args.ending_at as string | undefined,
      app_id: args.app_id as string | undefined,
      segment_id: args.segment_id as string | undefined,
    };
    return this.get('/events/data_series', params);
  }

  private async getKpiDau(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string | undefined> = {
      length: args.length !== undefined ? String(args.length) : undefined,
      ending_at: args.ending_at as string | undefined,
      app_id: args.app_id as string | undefined,
    };
    return this.get('/kpi/dau/data_series', params);
  }

  private async getKpiMau(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string | undefined> = {
      length: args.length !== undefined ? String(args.length) : undefined,
      ending_at: args.ending_at as string | undefined,
      app_id: args.app_id as string | undefined,
    };
    return this.get('/kpi/mau/data_series', params);
  }

  private async getKpiNewUsers(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string | undefined> = {
      length: args.length !== undefined ? String(args.length) : undefined,
      ending_at: args.ending_at as string | undefined,
      app_id: args.app_id as string | undefined,
    };
    return this.get('/kpi/new_users/data_series', params);
  }

  private async getKpiUninstalls(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string | undefined> = {
      length: args.length !== undefined ? String(args.length) : undefined,
      ending_at: args.ending_at as string | undefined,
      app_id: args.app_id as string | undefined,
    };
    return this.get('/kpi/uninstalls/data_series', params);
  }

  private async getAppSessions(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string | undefined> = {
      length: args.length !== undefined ? String(args.length) : undefined,
      unit: args.unit as string | undefined,
      ending_at: args.ending_at as string | undefined,
      app_id: args.app_id as string | undefined,
      segment_id: args.segment_id as string | undefined,
    };
    return this.get('/sessions/data_series', params);
  }

  private async getNewsFeedCardAnalytics(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.card_id) return { content: [{ type: 'text', text: 'card_id is required' }], isError: true };
    const params: Record<string, string | undefined> = {
      card_id: args.card_id as string,
      length: args.length !== undefined ? String(args.length) : undefined,
      unit: args.unit as string | undefined,
      ending_at: args.ending_at as string | undefined,
    };
    return this.get('/feed/data_series', params);
  }

  private async listNewsFeedCards(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string | undefined> = {
      page: args.page !== undefined ? String(args.page) : undefined,
      include_archived: args.include_archived !== undefined ? String(args.include_archived) : undefined,
      sort_direction: args.sort_direction as string | undefined,
    };
    return this.get('/feed/list', params);
  }

  private async getNewsFeedCardDetails(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.card_id) return { content: [{ type: 'text', text: 'card_id is required' }], isError: true };
    return this.get('/feed/details', { card_id: args.card_id as string });
  }

  private async getSendAnalytics(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.campaign_id || !args.send_id) {
      return { content: [{ type: 'text', text: 'campaign_id and send_id are required' }], isError: true };
    }
    const params: Record<string, string | undefined> = {
      campaign_id: args.campaign_id as string,
      send_id: args.send_id as string,
      length: args.length !== undefined ? String(args.length) : undefined,
      ending_at: args.ending_at as string | undefined,
    };
    return this.get('/sends/data_series', params);
  }

  private async getScheduledBroadcasts(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string | undefined> = {
      end_time: args.end_time as string | undefined,
    };
    return this.get('/messages/scheduled_broadcasts', params);
  }

  private async getSubscriptionGroupStatus(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.subscription_group_id) {
      return { content: [{ type: 'text', text: 'subscription_group_id is required' }], isError: true };
    }
    const params: Record<string, string | undefined> = {
      subscription_group_id: args.subscription_group_id as string,
      external_id: args.external_id as string | undefined,
      phone: args.phone as string | undefined,
    };
    return this.get('/subscription/status/get', params);
  }

  private async listUserSubscriptionGroups(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string | undefined> = {
      external_id: args.external_id as string | undefined,
      limit: args.limit !== undefined ? String(args.limit) : undefined,
      offset: args.offset !== undefined ? String(args.offset) : undefined,
      phone: args.phone as string | undefined,
    };
    return this.get('/subscription/user/status', params);
  }
}

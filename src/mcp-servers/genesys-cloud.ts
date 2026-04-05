/**
 * Genesys Cloud MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/MakingChatbots/genesys-cloud-mcp-server — transport: stdio, auth: OAuth2 client credentials
// Community MCP (NOT published by Genesys — published by @MakingChatbots, a personal project).
// MCP tools (8): Search Queues, Query Queue Volumes, Sample Conversations By Queue,
//   Voice Call Quality, Conversation Sentiment, Conversation Topics,
//   Search Voice Conversation, Conversation Transcript, OAuth Clients.
// MCP focuses on analytics/quality. Our adapter covers 20 tools across users, queues,
// conversations, campaigns, flows, recordings, telephony, and org management.
// Our adapter covers: 20 tools. Vendor MCP covers: 8 tools (analytics/quality focused).
// Recommendation: use-rest-api — MCP is community/unofficial (not vendor-published).
//   MCP criteria check: fails criterion 1 (not vendor-published), criterion 3 (only 8 tools).
//
// Base URL: https://api.mypurecloud.com (US East — region-configurable via constructor)
//           Other regions: api.mypurecloud.ie (EU), api.mypurecloud.com.au (AU),
//                          api.mypurecloud.jp (AP), api.cac1.pure.cloud (CA)
// Auth: OAuth2 client credentials — POST to https://login.{region}/oauth/token
//       Uses Basic auth (clientId:clientSecret) to exchange for Bearer token.
// Docs: https://developer.genesys.cloud/api/rest/
// Rate limits: Varies per endpoint; burst limits enforced. Retry-After header on 429.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface GenesysCloudConfig {
  clientId: string;
  clientSecret: string;
  region?: string;
}

export class GenesysCloudMCPServer extends MCPAdapterBase {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly apiBase: string;
  private readonly loginBase: string;
  private bearerToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(config: GenesysCloudConfig) {
    super();
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    const region = config.region || 'mypurecloud.com';
    this.apiBase = `https://api.${region}`;
    this.loginBase = `https://login.${region}`;
  }

  static catalog() {
    return {
      name: 'genesys-cloud',
      displayName: 'Genesys Cloud',
      version: '1.0.0',
      category: 'misc',
      keywords: [
        'genesys', 'genesys cloud', 'purecloud', 'contact center', 'ccaas', 'omnichannel',
        'conversation', 'queue', 'routing', 'agent', 'ivr', 'outbound', 'analytics',
        'workforce', 'quality', 'recording', 'flow', 'cx', 'customer experience',
      ],
      toolNames: [
        'list_users',
        'get_user',
        'get_user_queues',
        'list_queues',
        'get_queue',
        'list_conversations',
        'get_conversation',
        'list_campaigns',
        'get_campaign',
        'list_skills',
        'list_routing_queues',
        'get_analytics_conversations_summary',
        'query_conversation_aggregates',
        'list_recordings',
        'get_recording',
        'list_flows',
        'get_flow',
        'list_dids',
        'get_organization',
        'list_locations',
      ],
      description: 'Genesys Cloud enterprise contact center: manage conversations, queues, agents, campaigns, flows, analytics, and recordings via the PureCloud Platform API.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_users',
        description: 'List Genesys Cloud users with optional filters for department, role, and active state',
        inputSchema: {
          type: 'object',
          properties: {
            page_size: {
              type: 'number',
              description: 'Number of users per page (default: 25, max: 100)',
            },
            page_number: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            state: {
              type: 'string',
              description: 'Filter by user state: active, inactive, deleted (default: active)',
            },
            department: {
              type: 'string',
              description: 'Filter users by department name (optional)',
            },
          },
        },
      },
      {
        name: 'get_user',
        description: 'Retrieve detailed profile and contact information for a specific Genesys Cloud user by ID',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: {
              type: 'string',
              description: 'Genesys Cloud user UUID',
            },
            expand: {
              type: 'string',
              description: 'Comma-separated fields to expand: routingStatus, presence, conversationSummary, outOfOffice, geolocation, station, authorization (optional)',
            },
          },
          required: ['user_id'],
        },
      },
      {
        name: 'get_user_queues',
        description: 'Retrieve the list of routing queues a specific user is a member of',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: {
              type: 'string',
              description: 'Genesys Cloud user UUID',
            },
          },
          required: ['user_id'],
        },
      },
      {
        name: 'list_queues',
        description: 'List all routing queues in the Genesys Cloud organization with their state and membership counts',
        inputSchema: {
          type: 'object',
          properties: {
            page_size: {
              type: 'number',
              description: 'Number of queues per page (default: 25, max: 100)',
            },
            page_number: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            name: {
              type: 'string',
              description: 'Filter queues by name substring (optional)',
            },
            active: {
              type: 'boolean',
              description: 'Filter by active status (default: true)',
            },
          },
        },
      },
      {
        name: 'get_queue',
        description: 'Retrieve detailed configuration of a specific routing queue by ID',
        inputSchema: {
          type: 'object',
          properties: {
            queue_id: {
              type: 'string',
              description: 'Genesys Cloud queue UUID',
            },
          },
          required: ['queue_id'],
        },
      },
      {
        name: 'list_conversations',
        description: 'List recent conversations with optional filters for participant, queue, and communication type',
        inputSchema: {
          type: 'object',
          properties: {
            page_size: {
              type: 'number',
              description: 'Number of conversations per page (default: 25, max: 100)',
            },
            page_number: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            communication_type: {
              type: 'string',
              description: 'Filter by type: call, callback, chat, email, message, video (optional)',
            },
          },
        },
      },
      {
        name: 'get_conversation',
        description: 'Retrieve full details of a specific conversation including participants, segments, and media type',
        inputSchema: {
          type: 'object',
          properties: {
            conversation_id: {
              type: 'string',
              description: 'Genesys Cloud conversation UUID',
            },
          },
          required: ['conversation_id'],
        },
      },
      {
        name: 'list_campaigns',
        description: 'List outbound dialing campaigns with their type, state, and contact list assignments',
        inputSchema: {
          type: 'object',
          properties: {
            page_size: {
              type: 'number',
              description: 'Number of campaigns per page (default: 25, max: 100)',
            },
            page_number: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
            campaign_type: {
              type: 'string',
              description: 'Filter by type: PREVIEW, POWER, PROGRESSIVE, AGENTLESS (optional)',
            },
          },
        },
      },
      {
        name: 'get_campaign',
        description: 'Retrieve detailed configuration of a specific outbound campaign by ID',
        inputSchema: {
          type: 'object',
          properties: {
            campaign_id: {
              type: 'string',
              description: 'Genesys Cloud campaign UUID',
            },
          },
          required: ['campaign_id'],
        },
      },
      {
        name: 'list_skills',
        description: 'List all routing skills defined in the Genesys Cloud organization',
        inputSchema: {
          type: 'object',
          properties: {
            page_size: {
              type: 'number',
              description: 'Number of skills per page (default: 25, max: 100)',
            },
            page_number: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            name: {
              type: 'string',
              description: 'Filter skills by name substring (optional)',
            },
          },
        },
      },
      {
        name: 'list_routing_queues',
        description: 'List routing queues a user is a member of, or all queues visible to the current token',
        inputSchema: {
          type: 'object',
          properties: {
            page_size: {
              type: 'number',
              description: 'Number of routing queues per page (default: 25)',
            },
            page_number: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
          },
        },
      },
      {
        name: 'get_analytics_conversations_summary',
        description: 'Query conversation analytics summary statistics for a time interval including handle time and abandon rate',
        inputSchema: {
          type: 'object',
          properties: {
            interval: {
              type: 'string',
              description: 'ISO 8601 interval string for the query period (e.g. 2026-03-01T00:00:00Z/2026-03-24T23:59:59Z)',
            },
            group_by: {
              type: 'array',
              description: 'Dimensions to group results by: queueId, userId, mediaType (optional)',
            },
          },
          required: ['interval'],
        },
      },
      {
        name: 'query_conversation_aggregates',
        description: 'Run an aggregation query on conversation metrics such as nHandled, tAbandon, tTalk, tHeld for a time range',
        inputSchema: {
          type: 'object',
          properties: {
            interval: {
              type: 'string',
              description: 'ISO 8601 interval for the aggregation window (e.g. 2026-03-24T00:00:00Z/2026-03-24T23:59:59Z)',
            },
            granularity: {
              type: 'string',
              description: 'Aggregation granularity: PT30M, PT1H, P1D (ISO 8601 duration, default: P1D)',
            },
            metrics: {
              type: 'array',
              description: 'Metrics to include: nOffered, nHandled, nAbandon, tAbandon, tTalk, tHeld, tHandle (default: all)',
            },
            group_by: {
              type: 'array',
              description: 'Dimensions to group by: queueId, userId, mediaType (optional)',
            },
          },
          required: ['interval'],
        },
      },
      {
        name: 'list_recordings',
        description: 'List recordings for a specific conversation by conversation ID, with optional pagination',
        inputSchema: {
          type: 'object',
          properties: {
            conversation_id: {
              type: 'string',
              description: 'Conversation UUID to retrieve recordings for (required)',
            },
            page_size: {
              type: 'number',
              description: 'Number of recordings per page (default: 25, max: 100)',
            },
            page_number: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
          },
          required: ['conversation_id'],
        },
      },
      {
        name: 'get_recording',
        description: 'Retrieve a specific conversation recording including media download URL and metadata',
        inputSchema: {
          type: 'object',
          properties: {
            conversation_id: {
              type: 'string',
              description: 'Conversation UUID the recording belongs to',
            },
            recording_id: {
              type: 'string',
              description: 'Recording UUID',
            },
          },
          required: ['conversation_id', 'recording_id'],
        },
      },
      {
        name: 'list_flows',
        description: 'List Architect flows (IVR, inbound call, bot) with their type and publish state',
        inputSchema: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              description: 'Filter by flow type: INBOUNDCALL, OUTBOUNDCALL, BOT, INBOUNDEMAIL, INBOUNDCHAT (optional)',
            },
            page_size: {
              type: 'number',
              description: 'Number of flows per page (default: 25, max: 100)',
            },
            page_number: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
          },
        },
      },
      {
        name: 'get_flow',
        description: 'Retrieve detailed configuration of a specific Architect flow by ID',
        inputSchema: {
          type: 'object',
          properties: {
            flow_id: {
              type: 'string',
              description: 'Genesys Cloud Architect flow UUID',
            },
          },
          required: ['flow_id'],
        },
      },
      {
        name: 'list_dids',
        description: 'List Direct Inward Dial (DID) numbers assigned in the organization',
        inputSchema: {
          type: 'object',
          properties: {
            page_size: {
              type: 'number',
              description: 'Number of DID entries per page (default: 25, max: 100)',
            },
            page_number: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
          },
        },
      },
      {
        name: 'get_organization',
        description: 'Get the Genesys Cloud organization details including name, domain, region, and feature flags',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'list_locations',
        description: 'List office locations configured in the Genesys Cloud organization',
        inputSchema: {
          type: 'object',
          properties: {
            page_size: {
              type: 'number',
              description: 'Number of locations per page (default: 25, max: 100)',
            },
            page_number: {
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
        case 'list_users':
          return this.listUsers(args);
        case 'get_user':
          return this.getUser(args);
        case 'get_user_queues':
          return this.getUserQueues(args);
        case 'list_queues':
          return this.listQueues(args);
        case 'get_queue':
          return this.getQueue(args);
        case 'list_conversations':
          return this.listConversations(args);
        case 'get_conversation':
          return this.getConversation(args);
        case 'list_campaigns':
          return this.listCampaigns(args);
        case 'get_campaign':
          return this.getCampaign(args);
        case 'list_skills':
          return this.listSkills(args);
        case 'list_routing_queues':
          return this.listRoutingQueues(args);
        case 'get_analytics_conversations_summary':
          return this.getAnalyticsConversationsSummary(args);
        case 'query_conversation_aggregates':
          return this.queryConversationAggregates(args);
        case 'list_recordings':
          return this.listRecordings(args);
        case 'get_recording':
          return this.getRecording(args);
        case 'list_flows':
          return this.listFlows(args);
        case 'get_flow':
          return this.getFlow(args);
        case 'list_dids':
          return this.listDids(args);
        case 'get_organization':
          return this.getOrganization();
        case 'list_locations':
          return this.listLocations(args);
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

  private async getOrRefreshToken(): Promise<string> {
    const now = Date.now();
    if (this.bearerToken && this.tokenExpiry > now) {
      return this.bearerToken;
    }

    const response = await this.fetchWithRetry(`${this.loginBase}/oauth/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${btoa(`${this.clientId}:${this.clientSecret}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    if (!response.ok) {
      throw new Error(`OAuth2 token request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as { access_token: string; expires_in: number };
    this.bearerToken = data.access_token;
    this.tokenExpiry = now + (data.expires_in - 60) * 1000;
    return this.bearerToken;
  }


  private async apiGet(path: string): Promise<ToolResult> {
    const token = await this.getOrRefreshToken();
    const response = await this.fetchWithRetry(`${this.apiBase}${path}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apiPost(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const token = await this.getOrRefreshToken();
    const response = await this.fetchWithRetry(`${this.apiBase}${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private buildPagingParams(args: Record<string, unknown>, extra?: Record<string, string>): string {
    const params = new URLSearchParams({
      pageSize: String((args.page_size as number) || 25),
      pageNumber: String((args.page_number as number) || 1),
      ...extra,
    });
    return params.toString();
  }

  private async listUsers(args: Record<string, unknown>): Promise<ToolResult> {
    const extra: Record<string, string> = { state: (args.state as string) || 'active' };
    if (args.department) extra.department = args.department as string;
    return this.apiGet(`/api/v2/users?${this.buildPagingParams(args, extra)}`);
  }

  private async getUser(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.user_id) {
      return { content: [{ type: 'text', text: 'user_id is required' }], isError: true };
    }
    const extra: Record<string, string> = {};
    if (args.expand) extra.expand = args.expand as string;
    const qs = Object.keys(extra).length ? '?' + new URLSearchParams(extra).toString() : '';
    return this.apiGet(`/api/v2/users/${encodeURIComponent(args.user_id as string)}${qs}`);
  }

  private async getUserQueues(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.user_id) {
      return { content: [{ type: 'text', text: 'user_id is required' }], isError: true };
    }
    return this.apiGet(`/api/v2/users/${encodeURIComponent(args.user_id as string)}/queues`);
  }

  private async listQueues(args: Record<string, unknown>): Promise<ToolResult> {
    const extra: Record<string, string> = {};
    if (args.name) extra.name = args.name as string;
    if (typeof args.active === 'boolean') extra.active = String(args.active);
    return this.apiGet(`/api/v2/routing/queues?${this.buildPagingParams(args, extra)}`);
  }

  private async getQueue(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.queue_id) {
      return { content: [{ type: 'text', text: 'queue_id is required' }], isError: true };
    }
    return this.apiGet(`/api/v2/routing/queues/${encodeURIComponent(args.queue_id as string)}`);
  }

  private async listConversations(args: Record<string, unknown>): Promise<ToolResult> {
    const extra: Record<string, string> = {};
    if (args.communication_type) extra.communicationType = args.communication_type as string;
    return this.apiGet(`/api/v2/conversations?${this.buildPagingParams(args, extra)}`);
  }

  private async getConversation(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.conversation_id) {
      return { content: [{ type: 'text', text: 'conversation_id is required' }], isError: true };
    }
    return this.apiGet(`/api/v2/conversations/${encodeURIComponent(args.conversation_id as string)}`);
  }

  private async listCampaigns(args: Record<string, unknown>): Promise<ToolResult> {
    const extra: Record<string, string> = {};
    if (args.campaign_type) extra.campaignType = args.campaign_type as string;
    return this.apiGet(`/api/v2/outbound/campaigns?${this.buildPagingParams(args, extra)}`);
  }

  private async getCampaign(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.campaign_id) {
      return { content: [{ type: 'text', text: 'campaign_id is required' }], isError: true };
    }
    return this.apiGet(`/api/v2/outbound/campaigns/${encodeURIComponent(args.campaign_id as string)}`);
  }

  private async listSkills(args: Record<string, unknown>): Promise<ToolResult> {
    const extra: Record<string, string> = {};
    if (args.name) extra.name = args.name as string;
    return this.apiGet(`/api/v2/routing/skills?${this.buildPagingParams(args, extra)}`);
  }

  private async listRoutingQueues(args: Record<string, unknown>): Promise<ToolResult> {
    return this.apiGet(`/api/v2/routing/queues?${this.buildPagingParams(args)}`);
  }

  private async getAnalyticsConversationsSummary(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.interval) {
      return { content: [{ type: 'text', text: 'interval is required' }], isError: true };
    }
    const body: Record<string, unknown> = { interval: args.interval };
    if (args.group_by) body.groupBy = args.group_by;
    return this.apiPost('/api/v2/analytics/conversations/details/query', body);
  }

  private async queryConversationAggregates(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.interval) {
      return { content: [{ type: 'text', text: 'interval is required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      interval: args.interval,
      granularity: (args.granularity as string) || 'P1D',
    };
    if (args.metrics) body.metrics = args.metrics;
    if (args.group_by) body.groupBy = args.group_by;
    return this.apiPost('/api/v2/analytics/conversations/aggregates/query', body);
  }

  private async listRecordings(args: Record<string, unknown>): Promise<ToolResult> {
    // Genesys Cloud Recording API: GET /api/v2/conversations/{conversationId}/recordings
    // A conversationId is required to retrieve recordings for that conversation.
    if (!args.conversation_id) {
      return { content: [{ type: 'text', text: 'conversation_id is required to list recordings for a specific conversation' }], isError: true };
    }
    return this.apiGet(
      `/api/v2/conversations/${encodeURIComponent(args.conversation_id as string)}/recordings?${this.buildPagingParams(args)}`,
    );
  }

  private async getRecording(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.conversation_id || !args.recording_id) {
      return { content: [{ type: 'text', text: 'conversation_id and recording_id are required' }], isError: true };
    }
    return this.apiGet(`/api/v2/conversations/${encodeURIComponent(args.conversation_id as string)}/recordings/${encodeURIComponent(args.recording_id as string)}`);
  }

  private async listFlows(args: Record<string, unknown>): Promise<ToolResult> {
    const extra: Record<string, string> = {};
    if (args.type) extra.type = args.type as string;
    return this.apiGet(`/api/v2/flows?${this.buildPagingParams(args, extra)}`);
  }

  private async getFlow(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.flow_id) {
      return { content: [{ type: 'text', text: 'flow_id is required' }], isError: true };
    }
    return this.apiGet(`/api/v2/flows/${encodeURIComponent(args.flow_id as string)}`);
  }

  private async listDids(args: Record<string, unknown>): Promise<ToolResult> {
    return this.apiGet(`/api/v2/telephony/providers/edges/dids?${this.buildPagingParams(args)}`);
  }

  private async getOrganization(): Promise<ToolResult> {
    return this.apiGet('/api/v2/organizations/me');
  }

  private async listLocations(args: Record<string, unknown>): Promise<ToolResult> {
    return this.apiGet(`/api/v2/locations?${this.buildPagingParams(args)}`);
  }
}

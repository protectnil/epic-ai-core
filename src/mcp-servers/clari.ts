/**
 * Clari MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// No official Clari MCP server was found on GitHub or npm. Community repo avadh/clari-mcp-server
// has 0 stars and is unmaintained.
//
// Base URL: https://api.clari.com/v4  (Clari platform — forecasting, export, audit, admin)
// Copilot URL: https://api.copilot.clari.com  (Clari Copilot — call intelligence)
// Auth (Platform API): API key in 'apikey' request header
// Auth (Copilot API): 'X-Api-Key' + 'X-Api-Password' request headers (separate credentials)
// Docs: https://developer.clari.com/documentation/external_spec
//       https://community.clari.com/product-q-a-6/how-to-use-copilot-apis-2258
// Rate limits (Copilot): 10 req/sec burst, 100,000 req/week quota. Platform: not publicly documented.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface ClariConfig {
  apiKey: string;
  /** Base URL for the Clari platform (forecasting/pipeline). Defaults to https://api.clari.com/v4 */
  baseUrl?: string;
  /** Base URL for the Clari Copilot (call intelligence). Defaults to https://api.copilot.clari.com */
  copilotBaseUrl?: string;
  /**
   * API password for the Clari Copilot API.
   * The Copilot API requires two headers: X-Api-Key (apiKey above) and X-Api-Password (this field).
   * The Platform API (forecasting) only requires the apiKey in the 'apikey' header.
   */
  copilotApiPassword?: string;
}

export class ClariMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly copilotBaseUrl: string;
  private readonly copilotApiPassword: string;

  constructor(config: ClariConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.clari.com/v4';
    this.copilotBaseUrl = config.copilotBaseUrl || 'https://api.copilot.clari.com';
    this.copilotApiPassword = config.copilotApiPassword || '';
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'export_forecast',
        description: 'Export forecast submissions from Clari for a time period. Returns an async job ID — poll with get_export_job. Supports forecast calls, quota, adjustments, and CRM totals.',
        inputSchema: {
          type: 'object',
          properties: {
            forecastId: {
              type: 'string',
              description: 'ID of the Clari Forecast Tab to export. Found in the URL when viewing a Forecast Tab in the Clari app (e.g. "abc123").',
            },
            timePeriod: {
              type: 'string',
              description: 'Time period in YYYY_Qn format (e.g. "2026_Q1")',
            },
            typesToExport: {
              type: 'array',
              items: { type: 'string' },
              description: 'Data types: forecast | quota | forecast_updated | adjustment | crm_total | crm_closed',
            },
            currency: {
              type: 'string',
              description: 'Currency code for monetary values (e.g. "USD")',
            },
            includeHistorical: {
              type: 'boolean',
              description: 'Include historical forecast snapshots (default: false)',
            },
            exportFormat: {
              type: 'string',
              description: 'Output format: json | csv (default: json)',
            },
          },
          required: ['forecastId', 'timePeriod'],
        },
      },
      {
        name: 'get_export_job',
        description: 'Poll the status of an async Clari export job. Returns "pending", "running", "complete", or "failed" with a download URL when complete.',
        inputSchema: {
          type: 'object',
          properties: {
            jobId: {
              type: 'string',
              description: 'Job ID returned by export_forecast',
            },
          },
          required: ['jobId'],
        },
      },
      {
        name: 'list_export_jobs',
        description: 'List all running and recently completed Clari export jobs with their status and timestamps',
        inputSchema: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              description: 'Filter by job status: pending | running | complete | failed (omit for all)',
            },
          },
        },
      },
      {
        name: 'list_calls',
        description: 'List Clari Copilot call recordings with optional date range and user filters. Returns call IDs, titles, participants, and durations.',
        inputSchema: {
          type: 'object',
          properties: {
            fromDate: {
              type: 'string',
              description: 'Start date for filtering calls (ISO-8601, e.g. "2026-01-01")',
            },
            toDate: {
              type: 'string',
              description: 'End date for filtering calls (ISO-8601, e.g. "2026-03-31")',
            },
            userId: {
              type: 'string',
              description: 'Filter calls by Clari user ID',
            },
            limit: {
              type: 'number',
              description: 'Max number of calls to return (default: 50)',
            },
            offset: {
              type: 'number',
              description: 'Number of calls to skip for pagination',
            },
          },
        },
      },
      {
        name: 'get_call_details',
        description: 'Get full details for a Clari Copilot call including transcript, AI-generated summary, talk ratio, topics, and action items',
        inputSchema: {
          type: 'object',
          properties: {
            callId: {
              type: 'string',
              description: 'Clari Copilot call ID',
            },
          },
          required: ['callId'],
        },
      },
      {
        name: 'search_calls',
        description: 'Search Clari Copilot call recordings by keyword in title, transcript, or topics. Returns matching calls with relevance context.',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query — keywords found in call title, transcript, or topics',
            },
            fromDate: {
              type: 'string',
              description: 'Start date for search scope (ISO-8601)',
            },
            toDate: {
              type: 'string',
              description: 'End date for search scope (ISO-8601)',
            },
            limit: {
              type: 'number',
              description: 'Max results to return (default: 20)',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'get_call_topics',
        description: 'Get topics and keywords discussed across Clari Copilot calls with frequency counts and associated call IDs',
        inputSchema: {
          type: 'object',
          properties: {
            fromDate: {
              type: 'string',
              description: 'Start date for filtering calls (ISO-8601)',
            },
            toDate: {
              type: 'string',
              description: 'End date for filtering calls (ISO-8601)',
            },
            userId: {
              type: 'string',
              description: 'Filter topics by Clari user ID',
            },
          },
        },
      },
      {
        name: 'get_call_scorecards',
        description: 'Get scorecard evaluations for a Clari Copilot call, including criteria scores and reviewer feedback',
        inputSchema: {
          type: 'object',
          properties: {
            callId: {
              type: 'string',
              description: 'Clari Copilot call ID',
            },
          },
          required: ['callId'],
        },
      },
      {
        name: 'create_call',
        description: 'Submit an external call recording to Clari Copilot for processing. Clari generates transcript, talk ratio, topics, and AI insights. Accepts a public audio/video URL.',
        inputSchema: {
          type: 'object',
          properties: {
            title: {
              type: 'string',
              description: 'Title or subject of the call',
            },
            mediaUrl: {
              type: 'string',
              description: 'Publicly accessible URL of the audio or video recording',
            },
            startTime: {
              type: 'string',
              description: 'ISO-8601 start time (e.g. "2026-03-15T14:00:00Z")',
            },
            durationSeconds: {
              type: 'number',
              description: 'Duration of the call in seconds',
            },
            participants: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string', description: 'Participant full name' },
                  email: { type: 'string', description: 'Participant email address' },
                },
              },
              description: 'List of call participants with name and email',
            },
            crmObjectId: {
              type: 'string',
              description: 'CRM opportunity or account ID to associate with this call',
            },
          },
          required: ['title', 'mediaUrl', 'startTime'],
        },
      },
    ];
  }

  private get platformHeaders(): Record<string, string> {
    return { apikey: this.apiKey, 'Content-Type': 'application/json' };
  }

  private get copilotHeaders(): Record<string, string> {
    return {
      'X-Api-Key': this.apiKey,
      'X-Api-Password': this.copilotApiPassword,
      'Content-Type': 'application/json',
    };
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'export_forecast':
          return await this.exportForecast(args);
        case 'get_export_job':
          return await this.getExportJob(args);
        case 'list_export_jobs':
          return await this.listExportJobs(args);
        case 'list_calls':
          return await this.listCalls(args);
        case 'get_call_details':
          return await this.getCallDetails(args);
        case 'search_calls':
          return await this.searchCalls(args);
        case 'get_call_topics':
          return await this.getCallTopics(args);
        case 'get_call_scorecards':
          return await this.getCallScorecards(args);
        case 'create_call':
          return await this.createCall(args);
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

  private async exportForecast(args: Record<string, unknown>): Promise<ToolResult> {
    const forecastId = args.forecastId as string;
    const timePeriod = args.timePeriod as string;
    if (!forecastId || !timePeriod) {
      return { content: [{ type: 'text', text: 'forecastId and timePeriod are required' }], isError: true };
    }
    const body: Record<string, unknown> = { timePeriod };
    if (args.typesToExport) body.typesToExport = args.typesToExport;
    if (args.currency) body.currency = args.currency;
    if (typeof args.includeHistorical === 'boolean') body.includeHistorical = args.includeHistorical;
    if (args.exportFormat) body.exportFormat = args.exportFormat;

    const response = await this.fetchWithRetry(`${this.baseUrl}/export/forecast/${encodeURIComponent(forecastId)}`, {
      method: 'POST',
      headers: this.platformHeaders,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to export forecast: HTTP ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json().catch(() => { throw new Error(`Clari returned non-JSON (HTTP ${response.status})`); });
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async getExportJob(args: Record<string, unknown>): Promise<ToolResult> {
    const jobId = args.jobId as string;
    if (!jobId) {
      return { content: [{ type: 'text', text: 'jobId is required' }], isError: true };
    }
    const response = await this.fetchWithRetry(`${this.baseUrl}/export/jobs/${encodeURIComponent(jobId)}`, {
      headers: this.platformHeaders,
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to get export job: HTTP ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json().catch(() => { throw new Error(`Clari returned non-JSON (HTTP ${response.status})`); });
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async listExportJobs(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.status) params.set('status', args.status as string);
    const qs = params.toString() ? `?${params.toString()}` : '';
    const response = await this.fetchWithRetry(`${this.baseUrl}/export/jobs${qs}`, {
      headers: this.platformHeaders,
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to list export jobs: HTTP ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json().catch(() => { throw new Error(`Clari returned non-JSON (HTTP ${response.status})`); });
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async listCalls(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.fromDate) params.set('fromDate', args.fromDate as string);
    if (args.toDate) params.set('toDate', args.toDate as string);
    if (args.userId) params.set('userId', args.userId as string);
    if (args.limit) params.set('limit', String(args.limit));
    if (args.offset) params.set('offset', String(args.offset));
    const qs = params.toString() ? `?${params.toString()}` : '';
    const response = await this.fetchWithRetry(`${this.copilotBaseUrl}/v2/calls${qs}`, {
      headers: this.copilotHeaders,
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to list calls: HTTP ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json().catch(() => { throw new Error(`Clari Copilot returned non-JSON (HTTP ${response.status})`); });
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async getCallDetails(args: Record<string, unknown>): Promise<ToolResult> {
    const callId = args.callId as string;
    if (!callId) {
      return { content: [{ type: 'text', text: 'callId is required' }], isError: true };
    }
    const response = await this.fetchWithRetry(`${this.copilotBaseUrl}/call-details?id=${encodeURIComponent(callId)}`, {
      headers: this.copilotHeaders,
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to get call details: HTTP ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json().catch(() => { throw new Error(`Clari Copilot returned non-JSON (HTTP ${response.status})`); });
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async searchCalls(args: Record<string, unknown>): Promise<ToolResult> {
    const query = args.query as string;
    if (!query) {
      return { content: [{ type: 'text', text: 'query is required' }], isError: true };
    }
    const params = new URLSearchParams({ q: query });
    if (args.fromDate) params.set('fromDate', args.fromDate as string);
    if (args.toDate) params.set('toDate', args.toDate as string);
    if (args.limit) params.set('limit', String(args.limit));
    const response = await this.fetchWithRetry(`${this.copilotBaseUrl}/v2/calls/search?${params.toString()}`, {
      headers: this.copilotHeaders,
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to search calls: HTTP ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json().catch(() => { throw new Error(`Clari Copilot returned non-JSON (HTTP ${response.status})`); });
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async getCallTopics(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.fromDate) params.set('fromDate', args.fromDate as string);
    if (args.toDate) params.set('toDate', args.toDate as string);
    if (args.userId) params.set('userId', args.userId as string);
    const qs = params.toString() ? `?${params.toString()}` : '';
    const response = await this.fetchWithRetry(`${this.copilotBaseUrl}/v2/topics${qs}`, {
      headers: this.copilotHeaders,
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to get call topics: HTTP ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json().catch(() => { throw new Error(`Clari Copilot returned non-JSON (HTTP ${response.status})`); });
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async getCallScorecards(args: Record<string, unknown>): Promise<ToolResult> {
    const callId = args.callId as string;
    if (!callId) {
      return { content: [{ type: 'text', text: 'callId is required' }], isError: true };
    }
    const response = await this.fetchWithRetry(`${this.copilotBaseUrl}/v2/calls/${encodeURIComponent(callId)}/scorecards`, {
      headers: this.copilotHeaders,
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to get call scorecards: HTTP ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json().catch(() => { throw new Error(`Clari Copilot returned non-JSON (HTTP ${response.status})`); });
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async createCall(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.title || !args.mediaUrl || !args.startTime) {
      return { content: [{ type: 'text', text: 'title, mediaUrl, and startTime are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      title: args.title,
      mediaUrl: args.mediaUrl,
      startTime: args.startTime,
    };
    if (args.durationSeconds) body.durationSeconds = args.durationSeconds;
    if (args.participants) body.participants = args.participants;
    if (args.crmObjectId) body.crmObjectId = args.crmObjectId;

    const response = await this.fetchWithRetry(`${this.copilotBaseUrl}/create-call`, {
      method: 'POST',
      headers: this.copilotHeaders,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to create call: HTTP ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json().catch(() => { throw new Error(`Clari Copilot returned non-JSON (HTTP ${response.status})`); });
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  static catalog() {
    return {
      name: 'clari',
      displayName: 'Clari',
      version: '1.0.0',
      category: 'crm' as const,
      keywords: ['clari', 'forecast', 'revenue', 'pipeline', 'sales', 'copilot', 'call recording', 'transcript', 'deal', 'quota', 'revenue intelligence', 'win rate'],
      toolNames: ['export_forecast', 'get_export_job', 'list_export_jobs', 'list_calls', 'get_call_details', 'search_calls', 'get_call_topics', 'get_call_scorecards', 'create_call'],
      description: 'Clari adapter for the Epic AI Intelligence Platform',
      author: 'protectnil' as const,
    };
  }
}

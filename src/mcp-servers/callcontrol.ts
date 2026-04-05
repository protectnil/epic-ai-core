/**
 * CallControl API MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// No official CallControl MCP server was found on GitHub. We build a full REST wrapper
// for complete API coverage.
//
// Base URL: https://api.callcontrol.com
// Auth: API key in request header ("apiKey")
// Docs: https://callcontrol.com/api-docs
// Spec: https://api.apis.guru/v2/specs/callcontrol.com/2015-11-01/swagger.json
// Category: communication
// Rate limits: Free tier up to 2,000 queries/month for Complaints; Enterprise tiers vary

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface CallControlConfig {
  apiKey: string;
  baseUrl?: string;
}

export class CallControlMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: CallControlConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.callcontrol.com';
  }

  static catalog() {
    return {
      name: 'callcontrol',
      displayName: 'CallControl',
      version: '1.0.0',
      category: 'communication',
      keywords: [
        'callcontrol', 'phone', 'spam', 'robocall', 'reputation', 'complaints',
        'blacklist', 'whitelist', 'call blocking', 'ftc', 'fcc', 'irs',
        'quiet hours', 'community blacklist', 'caller id', 'enterprise',
      ],
      toolNames: [
        'get_complaints',
        'get_reputation',
        'report_call',
        'get_user',
        'should_block',
        'upsert_user',
      ],
      description: 'CallControl API: look up phone number spam complaints and reputation, report unwanted calls, and manage enterprise user call-blocking preferences (blacklist, whitelist, quiet hours).',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      // ── Complaints ─────────────────────────────────────────────────────────
      {
        name: 'get_complaints',
        description: 'Look up community and government complaint data for a phone number — includes FTC, FCC, IRS, and Indiana AG complaint rates plus key entity tag extractions. Free tier supports up to 2,000 queries/month.',
        inputSchema: {
          type: 'object',
          properties: {
            phoneNumber: {
              type: 'string',
              description: 'Phone number to look up complaints for (e.g. 12066194123)',
            },
          },
          required: ['phoneNumber'],
        },
      },
      // ── Reputation ─────────────────────────────────────────────────────────
      {
        name: 'get_reputation',
        description: 'Get premium reputation information for a phone number — returns spam classification, confidence score, caller name, complaint history, and call-type tags',
        inputSchema: {
          type: 'object',
          properties: {
            phoneNumber: {
              type: 'string',
              description: 'Phone number to retrieve reputation for (e.g. 12066194123)',
            },
          },
          required: ['phoneNumber'],
        },
      },
      // ── Report ─────────────────────────────────────────────────────────────
      {
        name: 'report_call',
        description: 'Report a spam or unwanted call received to help tune CallControl algorithms. Provide the phone number, whether it was unwanted, and optional details like caller type, caller name, and comment.',
        inputSchema: {
          type: 'object',
          properties: {
            PhoneNumber: {
              type: 'string',
              description: 'Phone number being reported (e.g. 12066194123)',
            },
            UnwantedCall: {
              type: 'boolean',
              description: 'Whether this was an unwanted or spam call',
            },
            CallerType: {
              type: 'string',
              description: 'Type of caller (e.g. Telemarketer, Robocall, Scam, Debt Collector)',
            },
            Comment: {
              type: 'string',
              description: 'Free-text comment describing the call',
            },
            CallTime: {
              type: 'string',
              description: 'ISO 8601 timestamp of when the call occurred',
            },
            ReportedCallerName: {
              type: 'string',
              description: 'Name the caller provided or name shown on caller ID',
            },
            ReportedCallerId: {
              type: 'string',
              description: 'Caller ID number reported by the caller',
            },
            Reporter: {
              type: 'string',
              description: 'Identifier for the reporter (optional, for enterprise tracking)',
            },
            IpAddress: {
              type: 'string',
              description: 'IP address of the reporter (optional)',
            },
            Latitude: {
              type: 'number',
              description: 'Latitude of the reporter location (optional)',
            },
            Longitude: {
              type: 'number',
              description: 'Longitude of the reporter location (optional)',
            },
          },
          required: ['PhoneNumber'],
        },
      },
      // ── Enterprise ─────────────────────────────────────────────────────────
      {
        name: 'get_user',
        description: 'Retrieve current CallControl enterprise user settings for a phone number — returns whitelist, blacklist, quiet hours, community blacklist opt-in, and other preferences',
        inputSchema: {
          type: 'object',
          properties: {
            phoneNumber: {
              type: 'string',
              description: 'User phone number to retrieve settings for (e.g. 12066194123)',
            },
          },
          required: ['phoneNumber'],
        },
      },
      {
        name: 'should_block',
        description: 'Simple enterprise call-block decision: returns whether an incoming call from a given phone number should be blocked for a specific user phone number, considering their personal preferences and community blacklist',
        inputSchema: {
          type: 'object',
          properties: {
            phoneNumber: {
              type: 'string',
              description: 'Incoming caller phone number to evaluate (e.g. 12066194123)',
            },
            userPhoneNumber: {
              type: 'string',
              description: 'The end-user phone number whose call-blocking preferences should be applied',
            },
          },
          required: ['phoneNumber', 'userPhoneNumber'],
        },
      },
      {
        name: 'upsert_user',
        description: 'Insert or update all CallControl enterprise preferences for a user — manage their whitelist, blacklist, quiet hours, community blacklist opt-in, and breakthrough rules',
        inputSchema: {
          type: 'object',
          properties: {
            PhoneNumber: {
              type: 'string',
              description: 'User phone number to create or update settings for',
            },
            WhiteList: {
              type: 'array',
              description: 'Array of phone number strings to whitelist — these calls always get through',
              items: { type: 'string' },
            },
            BlackList: {
              type: 'array',
              description: 'Array of phone number strings to blacklist — these calls are always blocked',
              items: { type: 'string' },
            },
            UseCommunityBlacklist: {
              type: 'boolean',
              description: 'Whether to use the community blacklist for call-blocking decisions (default: true)',
            },
            BreakThroughQhWithMultipleCalls: {
              type: 'boolean',
              description: 'Allow a caller to break through quiet hours by calling twice within 3 minutes',
            },
            WhiteListBreaksQh: {
              type: 'boolean',
              description: 'Allow whitelisted callers to break through quiet hours',
            },
            QuietHourList: {
              type: 'array',
              description: 'Array of quiet hour objects defining when calls should be silenced',
              items: {
                type: 'object',
                properties: {
                  DayOfWeekList: {
                    type: 'array',
                    description: 'Days of week (e.g. ["Monday","Tuesday"])',
                    items: { type: 'string' },
                  },
                  StartHourLocal: {
                    type: 'integer',
                    description: 'Quiet hour start hour in local time (0-23)',
                  },
                  StartMinLocal: {
                    type: 'integer',
                    description: 'Quiet hour start minute in local time (0-59)',
                  },
                  DurationMin: {
                    type: 'integer',
                    description: 'Duration of quiet hours in minutes',
                  },
                  TimeZoneName: {
                    type: 'string',
                    description: 'IANA time zone name (e.g. America/New_York)',
                  },
                },
              },
            },
            FirstName: {
              type: 'string',
              description: 'User first name',
            },
            LastName: {
              type: 'string',
              description: 'User last name',
            },
            Email: {
              type: 'string',
              description: 'User email address',
            },
          },
          required: ['PhoneNumber'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'get_complaints':  return this.getComplaints(args);
        case 'get_reputation':  return this.getReputation(args);
        case 'report_call':     return this.reportCall(args);
        case 'get_user':        return this.getUser(args);
        case 'should_block':    return this.shouldBlock(args);
        case 'upsert_user':     return this.upsertUser(args);
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

  // ── Private helpers ────────────────────────────────────────────────────────

  private async request(
    method: 'GET' | 'POST',
    path: string,
    body?: Record<string, unknown>,
  ): Promise<ToolResult> {
    const url = `${this.baseUrl}${path}`;
    const init: RequestInit = {
      method,
      headers: {
        apiKey: this.apiKey,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    };
    if (body && Object.keys(body).length > 0) init.body = JSON.stringify(body);
    const response = await this.fetchWithRetry(url, init);
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${errText}` }],
        isError: true,
      };
    }
    if (response.status === 204) {
      return { content: [{ type: 'text', text: '{"success":true}' }], isError: false };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  // ── Complaints ─────────────────────────────────────────────────────────────

  private async getComplaints(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.phoneNumber) {
      return { content: [{ type: 'text', text: 'phoneNumber is required' }], isError: true };
    }
    return this.request('GET', `/api/2015-11-01/Complaints/${encodeURIComponent(args.phoneNumber as string)}`);
  }

  // ── Reputation ─────────────────────────────────────────────────────────────

  private async getReputation(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.phoneNumber) {
      return { content: [{ type: 'text', text: 'phoneNumber is required' }], isError: true };
    }
    return this.request('GET', `/api/2015-11-01/Reputation/${encodeURIComponent(args.phoneNumber as string)}`);
  }

  // ── Report ─────────────────────────────────────────────────────────────────

  private async reportCall(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.PhoneNumber) {
      return { content: [{ type: 'text', text: 'PhoneNumber is required' }], isError: true };
    }
    return this.request('POST', '/api/2015-11-01/Report', args);
  }

  // ── Enterprise ─────────────────────────────────────────────────────────────

  private async getUser(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.phoneNumber) {
      return { content: [{ type: 'text', text: 'phoneNumber is required' }], isError: true };
    }
    return this.request('GET', `/api/2015-11-01/Enterprise/GetUser/${encodeURIComponent(args.phoneNumber as string)}`);
  }

  private async shouldBlock(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.phoneNumber || !args.userPhoneNumber) {
      return { content: [{ type: 'text', text: 'phoneNumber and userPhoneNumber are required' }], isError: true };
    }
    return this.request('GET', `/api/2015-11-01/Enterprise/ShouldBlock/${encodeURIComponent(args.phoneNumber as string)}/${encodeURIComponent(args.userPhoneNumber as string)}`);
  }

  private async upsertUser(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.PhoneNumber) {
      return { content: [{ type: 'text', text: 'PhoneNumber is required' }], isError: true };
    }
    return this.request('POST', '/api/2015-11-01/Enterprise/UpsertUser', args);
  }
}

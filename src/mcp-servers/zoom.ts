/**
 * Zoom MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// No official Zoom MCP server was found on GitHub or npm as of March 2026.
//
// Base URL: https://api.zoom.us/v2
// Auth: Bearer token (Server-to-Server OAuth2 access token or JWT — JWT deprecated Nov 2023)
// Docs: https://developers.zoom.us/docs/api/
// Rate limits: Varies by endpoint. Most endpoints: 10-100 req/second per account.
//   GET endpoints: ~10 req/s. POST meeting: ~100 req/day per user (heavy rate limits apply).

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface ZoomConfig {
  /** OAuth2 Server-to-Server access token. */
  accessToken: string;
  /** Override base URL (optional). Default: https://api.zoom.us/v2 */
  baseUrl?: string;
}

export class ZoomMCPServer extends MCPAdapterBase {
  private readonly accessToken: string;
  private readonly baseUrl: string;

  constructor(config: ZoomConfig) {
    super();
    this.accessToken = config.accessToken;
    this.baseUrl = config.baseUrl || 'https://api.zoom.us/v2';
  }

  static catalog() {
    return {
      name: 'zoom',
      displayName: 'Zoom',
      version: '1.0.0',
      category: 'collaboration' as const,
      keywords: [
        'zoom', 'meeting', 'webinar', 'recording', 'participant', 'user',
        'video', 'conference', 'schedule', 'registrant', 'report', 'cloud',
      ],
      toolNames: [
        'list_meetings', 'get_meeting', 'create_meeting', 'update_meeting', 'delete_meeting',
        'list_meeting_registrants', 'add_meeting_registrant',
        'list_past_meeting_instances',
        'get_meeting_participants',
        'list_recordings', 'get_recording',
        'list_webinars', 'get_webinar', 'create_webinar', 'update_webinar', 'delete_webinar',
        'list_webinar_registrants', 'add_webinar_registrant',
        'list_users', 'get_user', 'create_user', 'update_user',
        'get_meeting_report', 'get_daily_usage_report',
      ],
      description: 'Schedule and manage Zoom meetings and webinars, manage users, list recordings, add registrants, and pull usage reports.',
      author: 'protectnil' as const,
    };
  }

  get tools(): ToolDefinition[] {
    return [
      // ── Meetings ─────────────────────────────────────────────────────────────
      {
        name: 'list_meetings',
        description: 'List scheduled, live, or upcoming Zoom meetings for a user with pagination.',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: {
              type: 'string',
              description: 'User ID or email address (default: "me").',
            },
            type: {
              type: 'string',
              description: 'Meeting type: scheduled, live, upcoming, upcoming_meetings, previous_meetings (default: scheduled).',
            },
            page_size: {
              type: 'number',
              description: 'Meetings per page (default: 30, max: 300).',
            },
            next_page_token: {
              type: 'string',
              description: 'Pagination token from a previous response.',
            },
          },
        },
      },
      {
        name: 'get_meeting',
        description: 'Get full details for a specific Zoom meeting including settings, schedule, and join URL.',
        inputSchema: {
          type: 'object',
          properties: {
            meeting_id: {
              type: 'string',
              description: 'Zoom meeting ID.',
            },
          },
          required: ['meeting_id'],
        },
      },
      {
        name: 'create_meeting',
        description: 'Create a new Zoom meeting for a user with topic, schedule, duration, and settings.',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: {
              type: 'string',
              description: 'User ID or email address to create the meeting for (default: "me").',
            },
            topic: {
              type: 'string',
              description: 'Meeting topic/title.',
            },
            type: {
              type: 'number',
              description: 'Meeting type: 1=instant, 2=scheduled, 3=recurring (no fixed time), 8=recurring (fixed time) (default: 2).',
            },
            start_time: {
              type: 'string',
              description: 'Start time in UTC ISO 8601 format (yyyy-MM-ddTHH:mm:ssZ). Required for type 2 and 8.',
            },
            duration: {
              type: 'number',
              description: 'Meeting duration in minutes.',
            },
            timezone: {
              type: 'string',
              description: 'Time zone for the meeting (e.g. America/New_York). Defaults to account time zone.',
            },
            agenda: {
              type: 'string',
              description: 'Meeting agenda/description.',
            },
            password: {
              type: 'string',
              description: 'Meeting passcode (max 10 chars).',
            },
            settings: {
              type: 'object',
              description: 'Meeting settings object (host_video, participant_video, join_before_host, mute_upon_entry, etc.).',
            },
          },
          required: ['topic'],
        },
      },
      {
        name: 'update_meeting',
        description: 'Update an existing Zoom meeting\'s topic, schedule, duration, or settings.',
        inputSchema: {
          type: 'object',
          properties: {
            meeting_id: {
              type: 'string',
              description: 'Zoom meeting ID to update.',
            },
            topic: {
              type: 'string',
              description: 'Updated meeting topic.',
            },
            start_time: {
              type: 'string',
              description: 'Updated start time in UTC ISO 8601 format.',
            },
            duration: {
              type: 'number',
              description: 'Updated duration in minutes.',
            },
            agenda: {
              type: 'string',
              description: 'Updated meeting agenda.',
            },
            password: {
              type: 'string',
              description: 'Updated meeting passcode.',
            },
            settings: {
              type: 'object',
              description: 'Updated meeting settings object.',
            },
          },
          required: ['meeting_id'],
        },
      },
      {
        name: 'delete_meeting',
        description: 'Delete a scheduled Zoom meeting. Sends cancellation emails to all registered participants.',
        inputSchema: {
          type: 'object',
          properties: {
            meeting_id: {
              type: 'string',
              description: 'Zoom meeting ID to delete.',
            },
            notify_hosts: {
              type: 'boolean',
              description: 'Notify alternative hosts of the deletion (default: true).',
            },
          },
          required: ['meeting_id'],
        },
      },
      // ── Meeting Registrants ──────────────────────────────────────────────────
      {
        name: 'list_meeting_registrants',
        description: 'List registrants for a Zoom meeting with optional status filtering.',
        inputSchema: {
          type: 'object',
          properties: {
            meeting_id: {
              type: 'string',
              description: 'Zoom meeting ID.',
            },
            status: {
              type: 'string',
              description: 'Registrant status filter: pending, approved, denied (default: approved).',
            },
            page_size: {
              type: 'number',
              description: 'Results per page (default: 30, max: 300).',
            },
            next_page_token: {
              type: 'string',
              description: 'Pagination token from a previous response.',
            },
          },
          required: ['meeting_id'],
        },
      },
      {
        name: 'add_meeting_registrant',
        description: 'Register a participant for a Zoom meeting by email and name.',
        inputSchema: {
          type: 'object',
          properties: {
            meeting_id: {
              type: 'string',
              description: 'Zoom meeting ID to register for.',
            },
            email: {
              type: 'string',
              description: 'Email address of the registrant.',
            },
            first_name: {
              type: 'string',
              description: 'First name of the registrant.',
            },
            last_name: {
              type: 'string',
              description: 'Last name of the registrant.',
            },
            auto_approve: {
              type: 'boolean',
              description: 'Auto-approve the registrant (default: true).',
            },
          },
          required: ['meeting_id', 'email', 'first_name'],
        },
      },
      // ── Past Meetings ────────────────────────────────────────────────────────
      {
        name: 'list_past_meeting_instances',
        description: 'List all past instances of a recurring Zoom meeting.',
        inputSchema: {
          type: 'object',
          properties: {
            meeting_id: {
              type: 'string',
              description: 'Recurring meeting ID.',
            },
          },
          required: ['meeting_id'],
        },
      },
      {
        name: 'get_meeting_participants',
        description: 'Get the participant list for a past Zoom meeting instance including join/leave times.',
        inputSchema: {
          type: 'object',
          properties: {
            meeting_id: {
              type: 'string',
              description: 'Past meeting UUID or ID.',
            },
            page_size: {
              type: 'number',
              description: 'Results per page (default: 30, max: 300).',
            },
            next_page_token: {
              type: 'string',
              description: 'Pagination token from a previous response.',
            },
          },
          required: ['meeting_id'],
        },
      },
      // ── Recordings ───────────────────────────────────────────────────────────
      {
        name: 'list_recordings',
        description: 'List cloud recordings for a user, filtered by date range with pagination.',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: {
              type: 'string',
              description: 'User ID or email address (default: "me").',
            },
            from: {
              type: 'string',
              description: 'Start date for recordings (yyyy-MM-dd).',
            },
            to: {
              type: 'string',
              description: 'End date for recordings (yyyy-MM-dd). Range max: 30 days.',
            },
            page_size: {
              type: 'number',
              description: 'Results per page (default: 30, max: 300).',
            },
            next_page_token: {
              type: 'string',
              description: 'Pagination token from a previous response.',
            },
          },
        },
      },
      {
        name: 'get_recording',
        description: 'Get details for a specific Zoom cloud recording including download links and transcript status.',
        inputSchema: {
          type: 'object',
          properties: {
            meeting_id: {
              type: 'string',
              description: 'Meeting ID or UUID of the recorded meeting.',
            },
          },
          required: ['meeting_id'],
        },
      },
      // ── Webinars ─────────────────────────────────────────────────────────────
      {
        name: 'list_webinars',
        description: 'List scheduled Zoom webinars for a user.',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: {
              type: 'string',
              description: 'User ID or email address (default: "me").',
            },
            page_size: {
              type: 'number',
              description: 'Webinars per page (default: 30, max: 300).',
            },
            next_page_token: {
              type: 'string',
              description: 'Pagination token from a previous response.',
            },
          },
        },
      },
      {
        name: 'get_webinar',
        description: 'Get full details for a specific Zoom webinar including panelists, schedule, and registration settings.',
        inputSchema: {
          type: 'object',
          properties: {
            webinar_id: {
              type: 'string',
              description: 'Zoom webinar ID.',
            },
          },
          required: ['webinar_id'],
        },
      },
      {
        name: 'create_webinar',
        description: 'Create a new Zoom webinar for a user with topic, schedule, and registration settings.',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: {
              type: 'string',
              description: 'User ID or email address to create the webinar for (default: "me").',
            },
            topic: {
              type: 'string',
              description: 'Webinar topic/title.',
            },
            type: {
              type: 'number',
              description: 'Webinar type: 5=webinar, 6=recurring (no fixed time), 9=recurring (fixed time) (default: 5).',
            },
            start_time: {
              type: 'string',
              description: 'Start time in UTC ISO 8601 format.',
            },
            duration: {
              type: 'number',
              description: 'Webinar duration in minutes.',
            },
            agenda: {
              type: 'string',
              description: 'Webinar agenda/description.',
            },
            password: {
              type: 'string',
              description: 'Webinar passcode.',
            },
            settings: {
              type: 'object',
              description: 'Webinar settings object (approval_type, registrants_confirmation_email, etc.).',
            },
          },
          required: ['topic'],
        },
      },
      {
        name: 'update_webinar',
        description: 'Update a Zoom webinar\'s topic, schedule, duration, or settings.',
        inputSchema: {
          type: 'object',
          properties: {
            webinar_id: {
              type: 'string',
              description: 'Zoom webinar ID to update.',
            },
            topic: {
              type: 'string',
              description: 'Updated webinar topic.',
            },
            start_time: {
              type: 'string',
              description: 'Updated start time in UTC ISO 8601 format.',
            },
            duration: {
              type: 'number',
              description: 'Updated duration in minutes.',
            },
            agenda: {
              type: 'string',
              description: 'Updated webinar agenda.',
            },
            settings: {
              type: 'object',
              description: 'Updated webinar settings object.',
            },
          },
          required: ['webinar_id'],
        },
      },
      {
        name: 'delete_webinar',
        description: 'Delete a scheduled Zoom webinar and optionally send cancellation emails.',
        inputSchema: {
          type: 'object',
          properties: {
            webinar_id: {
              type: 'string',
              description: 'Zoom webinar ID to delete.',
            },
            send_cancellation_email: {
              type: 'boolean',
              description: 'Send cancellation emails to registered attendees (default: false).',
            },
          },
          required: ['webinar_id'],
        },
      },
      // ── Webinar Registrants ──────────────────────────────────────────────────
      {
        name: 'list_webinar_registrants',
        description: 'List registrants for a Zoom webinar with optional status filtering and pagination.',
        inputSchema: {
          type: 'object',
          properties: {
            webinar_id: {
              type: 'string',
              description: 'Zoom webinar ID.',
            },
            status: {
              type: 'string',
              description: 'Registrant status filter: pending, approved, denied (default: approved).',
            },
            page_size: {
              type: 'number',
              description: 'Results per page (default: 30, max: 300).',
            },
            next_page_token: {
              type: 'string',
              description: 'Pagination token from a previous response.',
            },
          },
          required: ['webinar_id'],
        },
      },
      {
        name: 'add_webinar_registrant',
        description: 'Register a participant for a Zoom webinar by email and name.',
        inputSchema: {
          type: 'object',
          properties: {
            webinar_id: {
              type: 'string',
              description: 'Zoom webinar ID to register for.',
            },
            email: {
              type: 'string',
              description: 'Email address of the registrant.',
            },
            first_name: {
              type: 'string',
              description: 'First name of the registrant.',
            },
            last_name: {
              type: 'string',
              description: 'Last name of the registrant.',
            },
          },
          required: ['webinar_id', 'email', 'first_name'],
        },
      },
      // ── Users ────────────────────────────────────────────────────────────────
      {
        name: 'list_users',
        description: 'List all Zoom users in the account with optional status and role filtering.',
        inputSchema: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              description: 'User status filter: active, inactive, pending (default: active).',
            },
            page_size: {
              type: 'number',
              description: 'Users per page (default: 30, max: 300).',
            },
            next_page_token: {
              type: 'string',
              description: 'Pagination token from a previous response.',
            },
          },
        },
      },
      {
        name: 'get_user',
        description: 'Get profile details for a specific Zoom user including plan, type, and personal meeting ID.',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: {
              type: 'string',
              description: 'User ID or email address.',
            },
          },
          required: ['user_id'],
        },
      },
      {
        name: 'create_user',
        description: 'Create a new Zoom user in the account with email, name, and user type.',
        inputSchema: {
          type: 'object',
          properties: {
            email: {
              type: 'string',
              description: 'Email address for the new user.',
            },
            first_name: {
              type: 'string',
              description: 'First name of the new user.',
            },
            last_name: {
              type: 'string',
              description: 'Last name of the new user.',
            },
            type: {
              type: 'number',
              description: 'User type: 1=basic, 2=licensed, 3=on-prem (default: 1).',
            },
            action: {
              type: 'string',
              description: 'Creation action: create (send activation email), autoCreate (no email), custCreate, ssoCreate (default: create).',
            },
          },
          required: ['email', 'first_name'],
        },
      },
      {
        name: 'update_user',
        description: 'Update a Zoom user\'s profile information including name, phone, timezone, and department.',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: {
              type: 'string',
              description: 'User ID or email address to update.',
            },
            first_name: {
              type: 'string',
              description: 'Updated first name.',
            },
            last_name: {
              type: 'string',
              description: 'Updated last name.',
            },
            phone_number: {
              type: 'string',
              description: 'Updated phone number.',
            },
            department: {
              type: 'string',
              description: 'Updated department.',
            },
            job_title: {
              type: 'string',
              description: 'Updated job title.',
            },
            timezone: {
              type: 'string',
              description: 'Updated timezone (e.g. America/New_York).',
            },
          },
          required: ['user_id'],
        },
      },
      // ── Reports ──────────────────────────────────────────────────────────────
      {
        name: 'get_meeting_report',
        description: 'Get an attendance and engagement report for a past Zoom meeting.',
        inputSchema: {
          type: 'object',
          properties: {
            meeting_id: {
              type: 'string',
              description: 'Past meeting ID or UUID.',
            },
          },
          required: ['meeting_id'],
        },
      },
      {
        name: 'get_daily_usage_report',
        description: 'Get the Zoom account\'s daily usage report for a specific month showing total meetings, participants, and minutes.',
        inputSchema: {
          type: 'object',
          properties: {
            year: {
              type: 'number',
              description: 'Year for the report (e.g. 2026).',
            },
            month: {
              type: 'number',
              description: 'Month for the report as a number 1-12.',
            },
          },
          required: ['year', 'month'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_meetings':              return await this.listMeetings(args);
        case 'get_meeting':                return await this.getMeeting(args);
        case 'create_meeting':             return await this.createMeeting(args);
        case 'update_meeting':             return await this.updateMeeting(args);
        case 'delete_meeting':             return await this.deleteMeeting(args);
        case 'list_meeting_registrants':   return await this.listMeetingRegistrants(args);
        case 'add_meeting_registrant':     return await this.addMeetingRegistrant(args);
        case 'list_past_meeting_instances': return await this.listPastMeetingInstances(args);
        case 'get_meeting_participants':   return await this.getMeetingParticipants(args);
        case 'list_recordings':            return await this.listRecordings(args);
        case 'get_recording':              return await this.getRecording(args);
        case 'list_webinars':              return await this.listWebinars(args);
        case 'get_webinar':                return await this.getWebinar(args);
        case 'create_webinar':             return await this.createWebinar(args);
        case 'update_webinar':             return await this.updateWebinar(args);
        case 'delete_webinar':             return await this.deleteWebinar(args);
        case 'list_webinar_registrants':   return await this.listWebinarRegistrants(args);
        case 'add_webinar_registrant':     return await this.addWebinarRegistrant(args);
        case 'list_users':                 return await this.listUsers(args);
        case 'get_user':                   return await this.getUser(args);
        case 'create_user':                return await this.createUser(args);
        case 'update_user':                return await this.updateUser(args);
        case 'get_meeting_report':         return await this.getMeetingReport(args);
        case 'get_daily_usage_report':     return await this.getDailyUsageReport(args);
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

  // ── Private helpers ─────────────────────────────────────────────────────────

  private headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
    };
  }

  private async request(method: string, path: string, body?: unknown): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method,
      headers: this.headers(),
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return {
        content: [{ type: 'text', text: `Zoom API error ${response.status}: ${errText}` }],
        isError: true,
      };
    }

    if (response.status === 204) {
      return { content: [{ type: 'text', text: '{"success":true}' }], isError: false };
    }

    const data: unknown = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listMeetings(args: Record<string, unknown>): Promise<ToolResult> {
    const user = (args.user_id as string) ?? 'me';
    const params = new URLSearchParams();
    params.set('type', (args.type as string) ?? 'scheduled');
    params.set('page_size', String((args.page_size as number) ?? 30));
    if (args.next_page_token) params.set('next_page_token', args.next_page_token as string);
    return this.request('GET', `/users/${encodeURIComponent(user)}/meetings?${params.toString()}`);
  }

  private async getMeeting(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.meeting_id as string;
    if (!id) return { content: [{ type: 'text', text: 'meeting_id is required' }], isError: true };
    return this.request('GET', `/meetings/${encodeURIComponent(id)}`);
  }

  private async createMeeting(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.topic) return { content: [{ type: 'text', text: 'topic is required' }], isError: true };
    const user = (args.user_id as string) ?? 'me';
    const body: Record<string, unknown> = {
      topic: args.topic,
      type: (args.type as number) ?? 2,
    };
    if (args.start_time) body.start_time = args.start_time;
    if (args.duration) body.duration = args.duration;
    if (args.timezone) body.timezone = args.timezone;
    if (args.agenda) body.agenda = args.agenda;
    if (args.password) body.password = args.password;
    if (args.settings) body.settings = args.settings;
    return this.request('POST', `/users/${encodeURIComponent(user)}/meetings`, body);
  }

  private async updateMeeting(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.meeting_id as string;
    if (!id) return { content: [{ type: 'text', text: 'meeting_id is required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.topic !== undefined) body.topic = args.topic;
    if (args.start_time !== undefined) body.start_time = args.start_time;
    if (args.duration !== undefined) body.duration = args.duration;
    if (args.agenda !== undefined) body.agenda = args.agenda;
    if (args.password !== undefined) body.password = args.password;
    if (args.settings !== undefined) body.settings = args.settings;
    return this.request('PATCH', `/meetings/${encodeURIComponent(id)}`, body);
  }

  private async deleteMeeting(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.meeting_id as string;
    if (!id) return { content: [{ type: 'text', text: 'meeting_id is required' }], isError: true };
    const params = new URLSearchParams();
    if (args.notify_hosts !== undefined) params.set('notify_hosts', String(args.notify_hosts));
    const qs = params.toString();
    return this.request('DELETE', `/meetings/${encodeURIComponent(id)}${qs ? `?${qs}` : ''}`);
  }

  private async listMeetingRegistrants(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.meeting_id as string;
    if (!id) return { content: [{ type: 'text', text: 'meeting_id is required' }], isError: true };
    const params = new URLSearchParams();
    params.set('status', (args.status as string) ?? 'approved');
    params.set('page_size', String((args.page_size as number) ?? 30));
    if (args.next_page_token) params.set('next_page_token', args.next_page_token as string);
    return this.request('GET', `/meetings/${encodeURIComponent(id)}/registrants?${params.toString()}`);
  }

  private async addMeetingRegistrant(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.meeting_id as string;
    if (!id || !args.email || !args.first_name) {
      return { content: [{ type: 'text', text: 'meeting_id, email, and first_name are required' }], isError: true };
    }
    const body: Record<string, unknown> = { email: args.email, first_name: args.first_name };
    if (args.last_name) body.last_name = args.last_name;
    const params = new URLSearchParams();
    if (args.auto_approve !== undefined) params.set('auto_approve', String(args.auto_approve));
    const qs = params.toString();
    return this.request('POST', `/meetings/${encodeURIComponent(id)}/registrants${qs ? `?${qs}` : ''}`, body);
  }

  private async listPastMeetingInstances(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.meeting_id as string;
    if (!id) return { content: [{ type: 'text', text: 'meeting_id is required' }], isError: true };
    return this.request('GET', `/past_meetings/${encodeURIComponent(id)}/instances`);
  }

  private async getMeetingParticipants(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.meeting_id as string;
    if (!id) return { content: [{ type: 'text', text: 'meeting_id is required' }], isError: true };
    const params = new URLSearchParams();
    params.set('page_size', String((args.page_size as number) ?? 30));
    if (args.next_page_token) params.set('next_page_token', args.next_page_token as string);
    return this.request('GET', `/past_meetings/${encodeURIComponent(id)}/participants?${params.toString()}`);
  }

  private async listRecordings(args: Record<string, unknown>): Promise<ToolResult> {
    const user = (args.user_id as string) ?? 'me';
    const params = new URLSearchParams();
    params.set('page_size', String((args.page_size as number) ?? 30));
    if (args.from) params.set('from', args.from as string);
    if (args.to) params.set('to', args.to as string);
    if (args.next_page_token) params.set('next_page_token', args.next_page_token as string);
    return this.request('GET', `/users/${encodeURIComponent(user)}/recordings?${params.toString()}`);
  }

  private async getRecording(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.meeting_id as string;
    if (!id) return { content: [{ type: 'text', text: 'meeting_id is required' }], isError: true };
    return this.request('GET', `/meetings/${encodeURIComponent(id)}/recordings`);
  }

  private async listWebinars(args: Record<string, unknown>): Promise<ToolResult> {
    const user = (args.user_id as string) ?? 'me';
    const params = new URLSearchParams();
    params.set('page_size', String((args.page_size as number) ?? 30));
    if (args.next_page_token) params.set('next_page_token', args.next_page_token as string);
    return this.request('GET', `/users/${encodeURIComponent(user)}/webinars?${params.toString()}`);
  }

  private async getWebinar(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.webinar_id as string;
    if (!id) return { content: [{ type: 'text', text: 'webinar_id is required' }], isError: true };
    return this.request('GET', `/webinars/${encodeURIComponent(id)}`);
  }

  private async createWebinar(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.topic) return { content: [{ type: 'text', text: 'topic is required' }], isError: true };
    const user = (args.user_id as string) ?? 'me';
    const body: Record<string, unknown> = {
      topic: args.topic,
      type: (args.type as number) ?? 5,
    };
    if (args.start_time) body.start_time = args.start_time;
    if (args.duration) body.duration = args.duration;
    if (args.agenda) body.agenda = args.agenda;
    if (args.password) body.password = args.password;
    if (args.settings) body.settings = args.settings;
    return this.request('POST', `/users/${encodeURIComponent(user)}/webinars`, body);
  }

  private async updateWebinar(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.webinar_id as string;
    if (!id) return { content: [{ type: 'text', text: 'webinar_id is required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.topic !== undefined) body.topic = args.topic;
    if (args.start_time !== undefined) body.start_time = args.start_time;
    if (args.duration !== undefined) body.duration = args.duration;
    if (args.agenda !== undefined) body.agenda = args.agenda;
    if (args.settings !== undefined) body.settings = args.settings;
    return this.request('PATCH', `/webinars/${encodeURIComponent(id)}`, body);
  }

  private async deleteWebinar(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.webinar_id as string;
    if (!id) return { content: [{ type: 'text', text: 'webinar_id is required' }], isError: true };
    const params = new URLSearchParams();
    if (args.send_cancellation_email !== undefined) {
      params.set('send_cancellation_email', String(args.send_cancellation_email));
    }
    const qs = params.toString();
    return this.request('DELETE', `/webinars/${encodeURIComponent(id)}${qs ? `?${qs}` : ''}`);
  }

  private async listWebinarRegistrants(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.webinar_id as string;
    if (!id) return { content: [{ type: 'text', text: 'webinar_id is required' }], isError: true };
    const params = new URLSearchParams();
    params.set('status', (args.status as string) ?? 'approved');
    params.set('page_size', String((args.page_size as number) ?? 30));
    if (args.next_page_token) params.set('next_page_token', args.next_page_token as string);
    return this.request('GET', `/webinars/${encodeURIComponent(id)}/registrants?${params.toString()}`);
  }

  private async addWebinarRegistrant(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.webinar_id as string;
    if (!id || !args.email || !args.first_name) {
      return { content: [{ type: 'text', text: 'webinar_id, email, and first_name are required' }], isError: true };
    }
    const body: Record<string, unknown> = { email: args.email, first_name: args.first_name };
    if (args.last_name) body.last_name = args.last_name;
    return this.request('POST', `/webinars/${encodeURIComponent(id)}/registrants`, body);
  }

  private async listUsers(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    params.set('status', (args.status as string) ?? 'active');
    params.set('page_size', String((args.page_size as number) ?? 30));
    if (args.next_page_token) params.set('next_page_token', args.next_page_token as string);
    return this.request('GET', `/users?${params.toString()}`);
  }

  private async getUser(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.user_id as string;
    if (!id) return { content: [{ type: 'text', text: 'user_id is required' }], isError: true };
    return this.request('GET', `/users/${encodeURIComponent(id)}`);
  }

  private async createUser(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.email || !args.first_name) {
      return { content: [{ type: 'text', text: 'email and first_name are required' }], isError: true };
    }
    const body = {
      action: (args.action as string) ?? 'create',
      user_info: {
        email: args.email,
        first_name: args.first_name,
        last_name: args.last_name ?? '',
        type: (args.type as number) ?? 1,
      },
    };
    return this.request('POST', '/users', body);
  }

  private async updateUser(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.user_id as string;
    if (!id) return { content: [{ type: 'text', text: 'user_id is required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.first_name !== undefined) body.first_name = args.first_name;
    if (args.last_name !== undefined) body.last_name = args.last_name;
    if (args.phone_number !== undefined) body.phone_number = args.phone_number;
    if (args.department !== undefined) body.dept = args.department;
    if (args.job_title !== undefined) body.job_title = args.job_title;
    if (args.timezone !== undefined) body.timezone = args.timezone;
    return this.request('PATCH', `/users/${encodeURIComponent(id)}`, body);
  }

  private async getMeetingReport(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.meeting_id as string;
    if (!id) return { content: [{ type: 'text', text: 'meeting_id is required' }], isError: true };
    return this.request('GET', `/report/meetings/${encodeURIComponent(id)}`);
  }

  private async getDailyUsageReport(args: Record<string, unknown>): Promise<ToolResult> {
    const year = args.year as number;
    const month = args.month as number;
    if (!year || !month) {
      return { content: [{ type: 'text', text: 'year and month are required' }], isError: true };
    }
    const params = new URLSearchParams({ year: String(year), month: String(month) });
    return this.request('GET', `/report/daily?${params.toString()}`);
  }
}

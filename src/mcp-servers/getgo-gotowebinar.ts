/**
 * GoToWebinar MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// No official GoToWebinar MCP server was found on GitHub or the LogMeIn/GoTo developer portal.
//
// Base URL: https://api.getgo.com/G2W/rest
// Auth: Bearer token (OAuth2 access token) in Authorization header.
//   Token obtained via LogMeIn OAuth2 flow: POST https://api.getgo.com/oauth/v2/token
//   with grant_type=authorization_code. Token valid for ~1 hour.
// Docs: https://goto-developer.logmein.com/get-started-building-integrations
// Rate limits: Not publicly documented. Standard GoTo API throttling applies.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface GoToWebinarConfig {
  /** OAuth2 access token */
  accessToken: string;
  /** Organizer key — required for all organizer-scoped endpoints */
  organizerKey: string;
  /** Optional base URL override */
  baseUrl?: string;
}

export class GoToWebinarMCPServer extends MCPAdapterBase {
  private readonly token: string;
  private readonly organizerKey: string;
  private readonly baseUrl: string;

  constructor(config: GoToWebinarConfig) {
    super();
    this.token = config.accessToken;
    this.organizerKey = config.organizerKey;
    this.baseUrl = (config.baseUrl ?? 'https://api.getgo.com/G2W/rest').replace(/\/+$/, '');
  }

  static catalog() {
    return {
      name: 'getgo-gotowebinar',
      displayName: 'GoToWebinar',
      version: '1.0.0',
      category: 'communication',
      keywords: [
        'gotowebinar', 'getgo', 'logmein', 'webinar', 'online event',
        'registrant', 'attendee', 'panelist', 'session', 'co-organizer',
        'video conference', 'virtual event', 'registration', 'polls', 'surveys',
        'performance', 'analytics', 'audio',
      ],
      toolNames: [
        'list_upcoming_webinars',
        'list_historical_webinars',
        'list_all_webinars',
        'get_webinar',
        'create_webinar',
        'update_webinar',
        'cancel_webinar',
        'get_webinar_meeting_times',
        'list_registrants',
        'get_registrant',
        'create_registrant',
        'delete_registrant',
        'get_registration_fields',
        'list_sessions',
        'get_session',
        'list_session_attendees',
        'get_session_attendee',
        'get_session_performance',
        'get_session_polls',
        'get_session_questions',
        'get_session_surveys',
        'get_attendee_poll_answers',
        'get_attendee_questions',
        'get_attendee_survey_answers',
        'list_panelists',
        'create_panelists',
        'delete_panelist',
        'list_coorganizers',
        'create_coorganizers',
        'delete_coorganizer',
        'get_audio_information',
        'get_webinar_performance',
        'get_organizer_sessions',
      ],
      description: 'GoToWebinar: manage webinars, registrants, attendees, panelists, co-organizers, sessions, polls, surveys, and performance analytics.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_upcoming_webinars',
        description: 'List all upcoming scheduled webinars for the organizer',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'list_historical_webinars',
        description: 'List past webinars for the organizer within a required ISO8601 date range',
        inputSchema: {
          type: 'object',
          properties: {
            fromTime: {
              type: 'string',
              description: 'Start of datetime range in ISO8601 UTC format, e.g. 2025-01-01T00:00:00Z',
            },
            toTime: {
              type: 'string',
              description: 'End of datetime range in ISO8601 UTC format, e.g. 2025-12-31T23:59:59Z',
            },
          },
          required: ['fromTime', 'toTime'],
        },
      },
      {
        name: 'list_all_webinars',
        description: 'List all webinars (historical and upcoming) for the organizer',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_webinar',
        description: 'Get full details of a specific webinar by webinar key including times, type, and settings',
        inputSchema: {
          type: 'object',
          properties: {
            webinarKey: {
              type: 'string',
              description: 'The unique key identifying the webinar',
            },
          },
          required: ['webinarKey'],
        },
      },
      {
        name: 'create_webinar',
        description: 'Create a new webinar with subject, times, time zone, and optional description',
        inputSchema: {
          type: 'object',
          properties: {
            subject: {
              type: 'string',
              description: 'Title of the webinar',
            },
            description: {
              type: 'string',
              description: 'Short description of the webinar content',
            },
            times: {
              type: 'array',
              description: 'Array of time objects each with startTime and endTime in ISO8601 UTC format',
            },
            timeZone: {
              type: 'string',
              description: 'Time zone for the webinar, e.g. America/New_York',
            },
            type: {
              type: 'string',
              description: 'Webinar type: single_session, series, or sequence (default: single_session)',
            },
          },
          required: ['subject', 'times'],
        },
      },
      {
        name: 'update_webinar',
        description: 'Update an existing webinar subject, description, times, or time zone with optional participant notification',
        inputSchema: {
          type: 'object',
          properties: {
            webinarKey: {
              type: 'string',
              description: 'The unique key identifying the webinar to update',
            },
            subject: {
              type: 'string',
              description: 'New webinar title',
            },
            description: {
              type: 'string',
              description: 'New webinar description',
            },
            times: {
              type: 'array',
              description: 'Updated array of time objects with startTime and endTime in ISO8601 UTC',
            },
            timeZone: {
              type: 'string',
              description: 'Updated time zone, e.g. America/Chicago',
            },
            notifyParticipants: {
              type: 'boolean',
              description: 'Send notification emails to existing registrants about changes (default: false)',
            },
          },
          required: ['webinarKey'],
        },
      },
      {
        name: 'cancel_webinar',
        description: 'Cancel a webinar and optionally send cancellation emails to all registrants',
        inputSchema: {
          type: 'object',
          properties: {
            webinarKey: {
              type: 'string',
              description: 'The unique key identifying the webinar to cancel',
            },
            sendCancellationEmails: {
              type: 'boolean',
              description: 'Notify all registrants of the cancellation via email (default: false)',
            },
          },
          required: ['webinarKey'],
        },
      },
      {
        name: 'get_webinar_meeting_times',
        description: 'Get all scheduled session times for a webinar including start and end times',
        inputSchema: {
          type: 'object',
          properties: {
            webinarKey: {
              type: 'string',
              description: 'The unique key identifying the webinar',
            },
          },
          required: ['webinarKey'],
        },
      },
      {
        name: 'list_registrants',
        description: 'List all registrants for a webinar with status, join URL, and registration data',
        inputSchema: {
          type: 'object',
          properties: {
            webinarKey: {
              type: 'string',
              description: 'The unique key identifying the webinar',
            },
          },
          required: ['webinarKey'],
        },
      },
      {
        name: 'get_registrant',
        description: 'Get full registration details for a single registrant including custom field answers',
        inputSchema: {
          type: 'object',
          properties: {
            webinarKey: {
              type: 'string',
              description: 'The unique key identifying the webinar',
            },
            registrantKey: {
              type: 'string',
              description: 'The unique key identifying the registrant',
            },
          },
          required: ['webinarKey', 'registrantKey'],
        },
      },
      {
        name: 'create_registrant',
        description: 'Register a new attendee for a webinar with first name, last name, and email address',
        inputSchema: {
          type: 'object',
          properties: {
            webinarKey: {
              type: 'string',
              description: 'The unique key identifying the webinar',
            },
            firstName: {
              type: 'string',
              description: "Registrant's first name",
            },
            lastName: {
              type: 'string',
              description: "Registrant's last name",
            },
            email: {
              type: 'string',
              description: "Registrant's email address",
            },
            resendConfirmation: {
              type: 'boolean',
              description: 'Resend confirmation email if this email is already registered (default: false)',
            },
          },
          required: ['webinarKey', 'firstName', 'lastName', 'email'],
        },
      },
      {
        name: 'delete_registrant',
        description: 'Remove and cancel a registrant from a webinar',
        inputSchema: {
          type: 'object',
          properties: {
            webinarKey: {
              type: 'string',
              description: 'The unique key identifying the webinar',
            },
            registrantKey: {
              type: 'string',
              description: 'The unique key identifying the registrant to remove',
            },
          },
          required: ['webinarKey', 'registrantKey'],
        },
      },
      {
        name: 'get_registration_fields',
        description: 'Get custom and standard registration form fields configured for a webinar',
        inputSchema: {
          type: 'object',
          properties: {
            webinarKey: {
              type: 'string',
              description: 'The unique key identifying the webinar',
            },
          },
          required: ['webinarKey'],
        },
      },
      {
        name: 'list_sessions',
        description: 'List all completed and scheduled sessions for a webinar with session keys and times',
        inputSchema: {
          type: 'object',
          properties: {
            webinarKey: {
              type: 'string',
              description: 'The unique key identifying the webinar',
            },
          },
          required: ['webinarKey'],
        },
      },
      {
        name: 'get_session',
        description: 'Get details for a specific webinar session including actual start/end times and attendee count',
        inputSchema: {
          type: 'object',
          properties: {
            webinarKey: {
              type: 'string',
              description: 'The unique key identifying the webinar',
            },
            sessionKey: {
              type: 'string',
              description: 'The unique key identifying the session',
            },
          },
          required: ['webinarKey', 'sessionKey'],
        },
      },
      {
        name: 'list_session_attendees',
        description: 'List all attendees who joined a specific session with attendance duration and join time',
        inputSchema: {
          type: 'object',
          properties: {
            webinarKey: {
              type: 'string',
              description: 'The unique key identifying the webinar',
            },
            sessionKey: {
              type: 'string',
              description: 'The unique key identifying the session',
            },
          },
          required: ['webinarKey', 'sessionKey'],
        },
      },
      {
        name: 'get_session_attendee',
        description: 'Get attendance details for one attendee in a session including join/leave times',
        inputSchema: {
          type: 'object',
          properties: {
            webinarKey: {
              type: 'string',
              description: 'The unique key identifying the webinar',
            },
            sessionKey: {
              type: 'string',
              description: 'The unique key identifying the session',
            },
            registrantKey: {
              type: 'string',
              description: 'The registrant key of the attendee',
            },
          },
          required: ['webinarKey', 'sessionKey', 'registrantKey'],
        },
      },
      {
        name: 'get_session_performance',
        description: 'Get performance metrics for a session: attendance rate, duration, poll participation, and engagement score',
        inputSchema: {
          type: 'object',
          properties: {
            webinarKey: {
              type: 'string',
              description: 'The unique key identifying the webinar',
            },
            sessionKey: {
              type: 'string',
              description: 'The unique key identifying the session',
            },
          },
          required: ['webinarKey', 'sessionKey'],
        },
      },
      {
        name: 'get_session_polls',
        description: 'Get poll questions and aggregated response counts for a specific session',
        inputSchema: {
          type: 'object',
          properties: {
            webinarKey: {
              type: 'string',
              description: 'The unique key identifying the webinar',
            },
            sessionKey: {
              type: 'string',
              description: 'The unique key identifying the session',
            },
          },
          required: ['webinarKey', 'sessionKey'],
        },
      },
      {
        name: 'get_session_questions',
        description: 'Get all Q&A questions submitted by attendees during a specific session',
        inputSchema: {
          type: 'object',
          properties: {
            webinarKey: {
              type: 'string',
              description: 'The unique key identifying the webinar',
            },
            sessionKey: {
              type: 'string',
              description: 'The unique key identifying the session',
            },
          },
          required: ['webinarKey', 'sessionKey'],
        },
      },
      {
        name: 'get_session_surveys',
        description: 'Get post-webinar survey questions and aggregated responses for a session',
        inputSchema: {
          type: 'object',
          properties: {
            webinarKey: {
              type: 'string',
              description: 'The unique key identifying the webinar',
            },
            sessionKey: {
              type: 'string',
              description: 'The unique key identifying the session',
            },
          },
          required: ['webinarKey', 'sessionKey'],
        },
      },
      {
        name: 'get_attendee_poll_answers',
        description: "Get a specific attendee's individual poll answers from a session",
        inputSchema: {
          type: 'object',
          properties: {
            webinarKey: {
              type: 'string',
              description: 'The unique key identifying the webinar',
            },
            sessionKey: {
              type: 'string',
              description: 'The unique key identifying the session',
            },
            registrantKey: {
              type: 'string',
              description: 'The registrant key of the attendee',
            },
          },
          required: ['webinarKey', 'sessionKey', 'registrantKey'],
        },
      },
      {
        name: 'get_attendee_questions',
        description: 'Get Q&A questions submitted by a specific attendee during a session',
        inputSchema: {
          type: 'object',
          properties: {
            webinarKey: {
              type: 'string',
              description: 'The unique key identifying the webinar',
            },
            sessionKey: {
              type: 'string',
              description: 'The unique key identifying the session',
            },
            registrantKey: {
              type: 'string',
              description: 'The registrant key of the attendee',
            },
          },
          required: ['webinarKey', 'sessionKey', 'registrantKey'],
        },
      },
      {
        name: 'get_attendee_survey_answers',
        description: "Get a specific attendee's post-webinar survey responses for a session",
        inputSchema: {
          type: 'object',
          properties: {
            webinarKey: {
              type: 'string',
              description: 'The unique key identifying the webinar',
            },
            sessionKey: {
              type: 'string',
              description: 'The unique key identifying the session',
            },
            registrantKey: {
              type: 'string',
              description: 'The registrant key of the attendee',
            },
          },
          required: ['webinarKey', 'sessionKey', 'registrantKey'],
        },
      },
      {
        name: 'list_panelists',
        description: 'List all panelists for a webinar with their names, emails, and invitation status',
        inputSchema: {
          type: 'object',
          properties: {
            webinarKey: {
              type: 'string',
              description: 'The unique key identifying the webinar',
            },
          },
          required: ['webinarKey'],
        },
      },
      {
        name: 'create_panelists',
        description: 'Add one or more panelists to a webinar by providing their names and email addresses',
        inputSchema: {
          type: 'object',
          properties: {
            webinarKey: {
              type: 'string',
              description: 'The unique key identifying the webinar',
            },
            panelists: {
              type: 'array',
              description: 'Array of panelist objects, each with name (string) and email (string) fields',
            },
          },
          required: ['webinarKey', 'panelists'],
        },
      },
      {
        name: 'delete_panelist',
        description: 'Remove a panelist from a webinar by panelist key',
        inputSchema: {
          type: 'object',
          properties: {
            webinarKey: {
              type: 'string',
              description: 'The unique key identifying the webinar',
            },
            panelistKey: {
              type: 'string',
              description: 'The unique key identifying the panelist to remove',
            },
          },
          required: ['webinarKey', 'panelistKey'],
        },
      },
      {
        name: 'list_coorganizers',
        description: 'List all co-organizers for a webinar including internal and external co-organizers',
        inputSchema: {
          type: 'object',
          properties: {
            webinarKey: {
              type: 'string',
              description: 'The unique key identifying the webinar',
            },
          },
          required: ['webinarKey'],
        },
      },
      {
        name: 'create_coorganizers',
        description: 'Add co-organizers to a webinar — internal by memberKey or external by email and name',
        inputSchema: {
          type: 'object',
          properties: {
            webinarKey: {
              type: 'string',
              description: 'The unique key identifying the webinar',
            },
            coorganizers: {
              type: 'array',
              description: 'Array of co-organizer objects: internal requires memberKey; external requires email, givenName, surname',
            },
          },
          required: ['webinarKey', 'coorganizers'],
        },
      },
      {
        name: 'delete_coorganizer',
        description: 'Remove a co-organizer from a webinar by co-organizer key',
        inputSchema: {
          type: 'object',
          properties: {
            webinarKey: {
              type: 'string',
              description: 'The unique key identifying the webinar',
            },
            coorganizerKey: {
              type: 'string',
              description: 'The member key of the co-organizer to remove',
            },
            external: {
              type: 'boolean',
              description: 'Set true if the co-organizer is external (not a GoToWebinar account holder)',
            },
          },
          required: ['webinarKey', 'coorganizerKey'],
        },
      },
      {
        name: 'get_audio_information',
        description: 'Get phone/VoIP audio conference details configured for a webinar',
        inputSchema: {
          type: 'object',
          properties: {
            webinarKey: {
              type: 'string',
              description: 'The unique key identifying the webinar',
            },
          },
          required: ['webinarKey'],
        },
      },
      {
        name: 'get_webinar_performance',
        description: 'Get aggregate performance analytics across all sessions for a webinar including attendance and engagement',
        inputSchema: {
          type: 'object',
          properties: {
            webinarKey: {
              type: 'string',
              description: 'The unique key identifying the webinar',
            },
          },
          required: ['webinarKey'],
        },
      },
      {
        name: 'get_organizer_sessions',
        description: 'Get all sessions conducted by the organizer within a required ISO8601 date range',
        inputSchema: {
          type: 'object',
          properties: {
            fromTime: {
              type: 'string',
              description: 'Start of datetime range in ISO8601 UTC format, e.g. 2025-01-01T00:00:00Z',
            },
            toTime: {
              type: 'string',
              description: 'End of datetime range in ISO8601 UTC format, e.g. 2025-12-31T23:59:59Z',
            },
          },
          required: ['fromTime', 'toTime'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_upcoming_webinars':    return this.listUpcomingWebinars();
        case 'list_historical_webinars':  return this.listHistoricalWebinars(args);
        case 'list_all_webinars':         return this.listAllWebinars();
        case 'get_webinar':               return this.getWebinar(args);
        case 'create_webinar':            return this.createWebinar(args);
        case 'update_webinar':            return this.updateWebinar(args);
        case 'cancel_webinar':            return this.cancelWebinar(args);
        case 'get_webinar_meeting_times': return this.getWebinarMeetingTimes(args);
        case 'list_registrants':          return this.listRegistrants(args);
        case 'get_registrant':            return this.getRegistrant(args);
        case 'create_registrant':         return this.createRegistrant(args);
        case 'delete_registrant':         return this.deleteRegistrant(args);
        case 'get_registration_fields':   return this.getRegistrationFields(args);
        case 'list_sessions':             return this.listSessions(args);
        case 'get_session':               return this.getSession(args);
        case 'list_session_attendees':    return this.listSessionAttendees(args);
        case 'get_session_attendee':      return this.getSessionAttendee(args);
        case 'get_session_performance':   return this.getSessionPerformance(args);
        case 'get_session_polls':         return this.getSessionPolls(args);
        case 'get_session_questions':     return this.getSessionQuestions(args);
        case 'get_session_surveys':       return this.getSessionSurveys(args);
        case 'get_attendee_poll_answers': return this.getAttendeePollAnswers(args);
        case 'get_attendee_questions':    return this.getAttendeeQuestions(args);
        case 'get_attendee_survey_answers': return this.getAttendeeSurveyAnswers(args);
        case 'list_panelists':            return this.listPanelists(args);
        case 'create_panelists':          return this.createPanelists(args);
        case 'delete_panelist':           return this.deletePanelist(args);
        case 'list_coorganizers':         return this.listCoorganizers(args);
        case 'create_coorganizers':       return this.createCoorganizers(args);
        case 'delete_coorganizer':        return this.deleteCoorganizer(args);
        case 'get_audio_information':     return this.getAudioInformation(args);
        case 'get_webinar_performance':   return this.getWebinarPerformance(args);
        case 'get_organizer_sessions':    return this.getOrganizerSessions(args);
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

  // ── HTTP helpers ────────────────────────────────────────────────────────────

  private headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.token}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    };
  }

  private async get(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, { headers: this.headers() });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async post(path: string, body: unknown): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const ct = response.headers.get('content-type') ?? '';
    const data = ct.includes('application/json') ? await response.json() : { status: response.status };
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async put(path: string, body: unknown, query?: Record<string, string>): Promise<ToolResult> {
    const qs = query ? '?' + new URLSearchParams(query).toString() : '';
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}${qs}`, {
      method: 'PUT',
      headers: this.headers(),
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: JSON.stringify({ success: true, status: response.status }) }], isError: false };
  }

  private async del(path: string, query?: Record<string, string>): Promise<ToolResult> {
    const qs = query ? '?' + new URLSearchParams(query).toString() : '';
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}${qs}`, {
      method: 'DELETE',
      headers: this.headers(),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: JSON.stringify({ success: true, status: response.status }) }], isError: false };
  }

  // ── Tool implementations ────────────────────────────────────────────────────

  private async listUpcomingWebinars(): Promise<ToolResult> {
    return this.get(`/organizers/${this.organizerKey}/upcomingWebinars`);
  }

  private async listHistoricalWebinars(args: Record<string, unknown>): Promise<ToolResult> {
    const fromTime = args.fromTime as string;
    const toTime = args.toTime as string;
    return this.get(`/organizers/${this.organizerKey}/historicalWebinars?fromTime=${encodeURIComponent(fromTime)}&toTime=${encodeURIComponent(toTime)}`);
  }

  private async listAllWebinars(): Promise<ToolResult> {
    return this.get(`/organizers/${this.organizerKey}/webinars`);
  }

  private async getWebinar(args: Record<string, unknown>): Promise<ToolResult> {
    const webinarKey = args.webinarKey as string;
    return this.get(`/organizers/${this.organizerKey}/webinars/${webinarKey}`);
  }

  private async createWebinar(args: Record<string, unknown>): Promise<ToolResult> {
    const { webinarKey: _wk, ...body } = args;
    return this.post(`/organizers/${this.organizerKey}/webinars`, body);
  }

  private async updateWebinar(args: Record<string, unknown>): Promise<ToolResult> {
    const webinarKey = args.webinarKey as string;
    const notifyParticipants = args.notifyParticipants as boolean | undefined;
    const { webinarKey: _wk, notifyParticipants: _np, ...body } = args;
    const query = notifyParticipants !== undefined ? { notifyParticipants: String(notifyParticipants) } : undefined;
    return this.put(`/organizers/${this.organizerKey}/webinars/${webinarKey}`, body, query);
  }

  private async cancelWebinar(args: Record<string, unknown>): Promise<ToolResult> {
    const webinarKey = args.webinarKey as string;
    const sendCancellationEmails = args.sendCancellationEmails as boolean | undefined;
    const query = sendCancellationEmails !== undefined ? { sendCancellationEmails: String(sendCancellationEmails) } : undefined;
    return this.del(`/organizers/${this.organizerKey}/webinars/${webinarKey}`, query);
  }

  private async getWebinarMeetingTimes(args: Record<string, unknown>): Promise<ToolResult> {
    const webinarKey = args.webinarKey as string;
    return this.get(`/organizers/${this.organizerKey}/webinars/${webinarKey}/meetingtimes`);
  }

  private async listRegistrants(args: Record<string, unknown>): Promise<ToolResult> {
    const webinarKey = args.webinarKey as string;
    return this.get(`/organizers/${this.organizerKey}/webinars/${webinarKey}/registrants`);
  }

  private async getRegistrant(args: Record<string, unknown>): Promise<ToolResult> {
    const webinarKey = args.webinarKey as string;
    const registrantKey = args.registrantKey as string;
    return this.get(`/organizers/${this.organizerKey}/webinars/${webinarKey}/registrants/${registrantKey}`);
  }

  private async createRegistrant(args: Record<string, unknown>): Promise<ToolResult> {
    const webinarKey = args.webinarKey as string;
    const resendConfirmation = args.resendConfirmation as boolean | undefined;
    const { webinarKey: _wk, resendConfirmation: _rc, ...body } = args;
    const qs = resendConfirmation !== undefined ? `?resendConfirmation=${resendConfirmation}` : '';
    const response = await this.fetchWithRetry(`${this.baseUrl}/organizers/${this.organizerKey}/webinars/${webinarKey}/registrants${qs}`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async deleteRegistrant(args: Record<string, unknown>): Promise<ToolResult> {
    const webinarKey = args.webinarKey as string;
    const registrantKey = args.registrantKey as string;
    return this.del(`/organizers/${this.organizerKey}/webinars/${webinarKey}/registrants/${registrantKey}`);
  }

  private async getRegistrationFields(args: Record<string, unknown>): Promise<ToolResult> {
    const webinarKey = args.webinarKey as string;
    return this.get(`/organizers/${this.organizerKey}/webinars/${webinarKey}/registrants/fields`);
  }

  private async listSessions(args: Record<string, unknown>): Promise<ToolResult> {
    const webinarKey = args.webinarKey as string;
    return this.get(`/organizers/${this.organizerKey}/webinars/${webinarKey}/sessions`);
  }

  private async getSession(args: Record<string, unknown>): Promise<ToolResult> {
    const webinarKey = args.webinarKey as string;
    const sessionKey = args.sessionKey as string;
    return this.get(`/organizers/${this.organizerKey}/webinars/${webinarKey}/sessions/${sessionKey}`);
  }

  private async listSessionAttendees(args: Record<string, unknown>): Promise<ToolResult> {
    const webinarKey = args.webinarKey as string;
    const sessionKey = args.sessionKey as string;
    return this.get(`/organizers/${this.organizerKey}/webinars/${webinarKey}/sessions/${sessionKey}/attendees`);
  }

  private async getSessionAttendee(args: Record<string, unknown>): Promise<ToolResult> {
    const webinarKey = args.webinarKey as string;
    const sessionKey = args.sessionKey as string;
    const registrantKey = args.registrantKey as string;
    return this.get(`/organizers/${this.organizerKey}/webinars/${webinarKey}/sessions/${sessionKey}/attendees/${registrantKey}`);
  }

  private async getSessionPerformance(args: Record<string, unknown>): Promise<ToolResult> {
    const webinarKey = args.webinarKey as string;
    const sessionKey = args.sessionKey as string;
    return this.get(`/organizers/${this.organizerKey}/webinars/${webinarKey}/sessions/${sessionKey}/performance`);
  }

  private async getSessionPolls(args: Record<string, unknown>): Promise<ToolResult> {
    const webinarKey = args.webinarKey as string;
    const sessionKey = args.sessionKey as string;
    return this.get(`/organizers/${this.organizerKey}/webinars/${webinarKey}/sessions/${sessionKey}/polls`);
  }

  private async getSessionQuestions(args: Record<string, unknown>): Promise<ToolResult> {
    const webinarKey = args.webinarKey as string;
    const sessionKey = args.sessionKey as string;
    return this.get(`/organizers/${this.organizerKey}/webinars/${webinarKey}/sessions/${sessionKey}/questions`);
  }

  private async getSessionSurveys(args: Record<string, unknown>): Promise<ToolResult> {
    const webinarKey = args.webinarKey as string;
    const sessionKey = args.sessionKey as string;
    return this.get(`/organizers/${this.organizerKey}/webinars/${webinarKey}/sessions/${sessionKey}/surveys`);
  }

  private async getAttendeePollAnswers(args: Record<string, unknown>): Promise<ToolResult> {
    const webinarKey = args.webinarKey as string;
    const sessionKey = args.sessionKey as string;
    const registrantKey = args.registrantKey as string;
    return this.get(`/organizers/${this.organizerKey}/webinars/${webinarKey}/sessions/${sessionKey}/attendees/${registrantKey}/polls`);
  }

  private async getAttendeeQuestions(args: Record<string, unknown>): Promise<ToolResult> {
    const webinarKey = args.webinarKey as string;
    const sessionKey = args.sessionKey as string;
    const registrantKey = args.registrantKey as string;
    return this.get(`/organizers/${this.organizerKey}/webinars/${webinarKey}/sessions/${sessionKey}/attendees/${registrantKey}/questions`);
  }

  private async getAttendeeSurveyAnswers(args: Record<string, unknown>): Promise<ToolResult> {
    const webinarKey = args.webinarKey as string;
    const sessionKey = args.sessionKey as string;
    const registrantKey = args.registrantKey as string;
    return this.get(`/organizers/${this.organizerKey}/webinars/${webinarKey}/sessions/${sessionKey}/attendees/${registrantKey}/surveys`);
  }

  private async listPanelists(args: Record<string, unknown>): Promise<ToolResult> {
    const webinarKey = args.webinarKey as string;
    return this.get(`/organizers/${this.organizerKey}/webinars/${webinarKey}/panelists`);
  }

  private async createPanelists(args: Record<string, unknown>): Promise<ToolResult> {
    const webinarKey = args.webinarKey as string;
    const panelists = args.panelists as unknown[];
    return this.post(`/organizers/${this.organizerKey}/webinars/${webinarKey}/panelists`, panelists);
  }

  private async deletePanelist(args: Record<string, unknown>): Promise<ToolResult> {
    const webinarKey = args.webinarKey as string;
    const panelistKey = args.panelistKey as string;
    return this.del(`/organizers/${this.organizerKey}/webinars/${webinarKey}/panelists/${panelistKey}`);
  }

  private async listCoorganizers(args: Record<string, unknown>): Promise<ToolResult> {
    const webinarKey = args.webinarKey as string;
    return this.get(`/organizers/${this.organizerKey}/webinars/${webinarKey}/coorganizers`);
  }

  private async createCoorganizers(args: Record<string, unknown>): Promise<ToolResult> {
    const webinarKey = args.webinarKey as string;
    const coorganizers = args.coorganizers as unknown[];
    return this.post(`/organizers/${this.organizerKey}/webinars/${webinarKey}/coorganizers`, coorganizers);
  }

  private async deleteCoorganizer(args: Record<string, unknown>): Promise<ToolResult> {
    const webinarKey = args.webinarKey as string;
    const coorganizerKey = args.coorganizerKey as string;
    const external = args.external as boolean | undefined;
    const query = external !== undefined ? { external: String(external) } : undefined;
    return this.del(`/organizers/${this.organizerKey}/webinars/${webinarKey}/coorganizers/${coorganizerKey}`, query);
  }

  private async getAudioInformation(args: Record<string, unknown>): Promise<ToolResult> {
    const webinarKey = args.webinarKey as string;
    return this.get(`/organizers/${this.organizerKey}/webinars/${webinarKey}/audio`);
  }

  private async getWebinarPerformance(args: Record<string, unknown>): Promise<ToolResult> {
    const webinarKey = args.webinarKey as string;
    return this.get(`/organizers/${this.organizerKey}/webinars/${webinarKey}/performance`);
  }

  private async getOrganizerSessions(args: Record<string, unknown>): Promise<ToolResult> {
    const fromTime = args.fromTime as string;
    const toTime = args.toTime as string;
    return this.get(`/organizers/${this.organizerKey}/sessions?fromTime=${encodeURIComponent(fromTime)}&toTime=${encodeURIComponent(toTime)}`);
  }
}

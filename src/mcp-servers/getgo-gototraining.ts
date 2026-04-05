/**
 * GoToTraining MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// No official GoToTraining MCP server was found on GitHub. LogMeIn (now GoTo) has not
// published a standalone MCP server for the GoToTraining API.
//
// Base URL: https://api.getgo.com/G2T/rest
// Auth: OAuth2 Bearer token — obtain via GoTo OAuth2 flow with scope "collab:training:manage"
//       Pass the access token as the "Authorization" header value (just the token, not "Bearer <token>")
//       per the API spec convention. Some endpoints accept "Bearer <token>" as well.
// Docs: https://goto-developer.logmein.com/get-started-creating-goTotraining-apps
// Rate limits: Not publicly documented; recommended to stay under 60 req/min per token
// Note: All keys (organizerKey, trainingKey, etc.) are int64 integers passed as strings

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface GoToTrainingConfig {
  /**
   * OAuth2 access token for the GoToTraining API.
   * Obtain via the GoTo OAuth2 authorization flow.
   */
  accessToken: string;
  /**
   * The organizer key (int64) for the authenticated user.
   * Required by most endpoints. Obtain from the OAuth2 token response or user profile.
   */
  organizerKey: string;
  /**
   * Override the API base URL.
   * Defaults to https://api.getgo.com/G2T/rest
   */
  baseUrl?: string;
}

export class GetgoGototrainingMCPServer extends MCPAdapterBase {
  private readonly accessToken: string;
  private readonly organizerKey: string;
  private readonly baseUrl: string;

  constructor(config: GoToTrainingConfig) {
    super();
    this.accessToken = config.accessToken;
    this.organizerKey = config.organizerKey;
    this.baseUrl = config.baseUrl || 'https://api.getgo.com/G2T/rest';
  }

  private get headers(): Record<string, string> {
    return {
      Authorization: this.accessToken,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      // --- Organizers ---
      {
        name: 'get_all_organizers',
        description: 'Get all organizers for a given account. Requires an accountKey.',
        inputSchema: {
          type: 'object',
          properties: {
            accountKey: { type: 'string', description: 'The account key (int64) to retrieve organizers for' },
          },
          required: ['accountKey'],
        },
      },
      // --- Trainings ---
      {
        name: 'list_trainings',
        description: 'Get all trainings for the authenticated organizer. Returns training details including dates, registration settings, and organizer info.',
        inputSchema: {
          type: 'object',
          properties: {
            organizerKey: { type: 'string', description: 'The organizer key (int64). Defaults to the configured organizer key if not provided.' },
          },
        },
      },
      {
        name: 'schedule_training',
        description: 'Schedule a new GoToTraining session for the organizer. Specify the training name, description, times, and registration settings.',
        inputSchema: {
          type: 'object',
          properties: {
            organizerKey: { type: 'string', description: 'The organizer key (int64). Defaults to the configured organizer key if not provided.' },
            name: { type: 'string', description: 'Training name (required)' },
            description: { type: 'string', description: 'Optional training description' },
            timeZone: { type: 'string', description: 'Time zone for the training (e.g. "America/New_York")' },
            times: {
              type: 'array',
              description: 'Array of training time slots. Each slot: { startDate: ISO8601, endDate: ISO8601 }',
              items: {
                type: 'object',
                properties: {
                  startDate: { type: 'string', description: 'Start datetime in ISO 8601 format' },
                  endDate: { type: 'string', description: 'End datetime in ISO 8601 format' },
                },
                required: ['startDate', 'endDate'],
              },
            },
            registrationSettings: {
              type: 'object',
              description: 'Optional registration settings: { disableWebRegistration: bool, disableConfirmationEmail: bool }',
            },
            organizers: {
              type: 'array',
              description: 'Optional additional organizer keys (int64 strings) for this training',
              items: { type: 'string' },
            },
          },
          required: ['name', 'times'],
        },
      },
      {
        name: 'get_training',
        description: 'Get details for a specific training by its training key, including times, registrant count, organizers, and registration settings.',
        inputSchema: {
          type: 'object',
          properties: {
            trainingKey: { type: 'string', description: 'The training key (int64) to retrieve' },
            organizerKey: { type: 'string', description: 'The organizer key (int64). Defaults to the configured organizer key if not provided.' },
          },
          required: ['trainingKey'],
        },
      },
      {
        name: 'cancel_training',
        description: 'Cancel and delete a training session. This action cannot be undone.',
        inputSchema: {
          type: 'object',
          properties: {
            trainingKey: { type: 'string', description: 'The training key (int64) to cancel' },
            organizerKey: { type: 'string', description: 'The organizer key (int64). Defaults to the configured organizer key if not provided.' },
          },
          required: ['trainingKey'],
        },
      },
      {
        name: 'get_manage_training_url',
        description: 'Get the URL that allows an organizer to manage a training session in the GoToTraining web interface.',
        inputSchema: {
          type: 'object',
          properties: {
            trainingKey: { type: 'string', description: 'The training key (int64)' },
            organizerKey: { type: 'string', description: 'The organizer key (int64). Defaults to the configured organizer key if not provided.' },
          },
          required: ['trainingKey'],
        },
      },
      {
        name: 'update_training_name_description',
        description: 'Update the name and/or description of an existing training session.',
        inputSchema: {
          type: 'object',
          properties: {
            trainingKey: { type: 'string', description: 'The training key (int64) to update' },
            name: { type: 'string', description: 'New training name' },
            description: { type: 'string', description: 'New training description' },
            organizerKey: { type: 'string', description: 'The organizer key (int64). Defaults to the configured organizer key if not provided.' },
          },
          required: ['trainingKey', 'name'],
        },
      },
      {
        name: 'update_training_times',
        description: 'Update the scheduled time slots for an existing training. Replaces all current times.',
        inputSchema: {
          type: 'object',
          properties: {
            trainingKey: { type: 'string', description: 'The training key (int64) to update' },
            timeZone: { type: 'string', description: 'Time zone for the training (e.g. "America/New_York")' },
            times: {
              type: 'array',
              description: 'Array of new time slots: [{ startDate: ISO8601, endDate: ISO8601 }]',
              items: {
                type: 'object',
                properties: {
                  startDate: { type: 'string' },
                  endDate: { type: 'string' },
                },
                required: ['startDate', 'endDate'],
              },
            },
            organizerKey: { type: 'string', description: 'The organizer key (int64). Defaults to the configured organizer key if not provided.' },
          },
          required: ['trainingKey', 'times'],
        },
      },
      // --- Organizers for Training ---
      {
        name: 'get_training_organizers',
        description: 'Get the list of organizers assigned to a specific training session.',
        inputSchema: {
          type: 'object',
          properties: {
            trainingKey: { type: 'string', description: 'The training key (int64)' },
            organizerKey: { type: 'string', description: 'The organizer key (int64). Defaults to the configured organizer key if not provided.' },
          },
          required: ['trainingKey'],
        },
      },
      {
        name: 'update_training_organizers',
        description: 'Update the list of organizers assigned to a training session. Replaces the current organizer list.',
        inputSchema: {
          type: 'object',
          properties: {
            trainingKey: { type: 'string', description: 'The training key (int64) to update' },
            organizers: {
              type: 'array',
              description: 'Array of organizer keys (int64 strings) to assign to the training',
              items: { type: 'string' },
            },
            organizerKey: { type: 'string', description: 'The organizer key (int64). Defaults to the configured organizer key if not provided.' },
          },
          required: ['trainingKey', 'organizers'],
        },
      },
      // --- Registrants ---
      {
        name: 'get_registrants',
        description: 'Get all registrants for a specific training session.',
        inputSchema: {
          type: 'object',
          properties: {
            trainingKey: { type: 'string', description: 'The training key (int64)' },
            organizerKey: { type: 'string', description: 'The organizer key (int64). Defaults to the configured organizer key if not provided.' },
          },
          required: ['trainingKey'],
        },
      },
      {
        name: 'register_for_training',
        description: 'Register an attendee for a training session. Returns a registrant key and join URL.',
        inputSchema: {
          type: 'object',
          properties: {
            trainingKey: { type: 'string', description: 'The training key (int64) to register for' },
            givenName: { type: 'string', description: 'Registrant first name' },
            surname: { type: 'string', description: 'Registrant last name' },
            email: { type: 'string', description: 'Registrant email address' },
            organizerKey: { type: 'string', description: 'The organizer key (int64). Defaults to the configured organizer key if not provided.' },
          },
          required: ['trainingKey', 'givenName', 'surname', 'email'],
        },
      },
      {
        name: 'get_registrant',
        description: 'Get details for a specific training registrant by their registrant key.',
        inputSchema: {
          type: 'object',
          properties: {
            trainingKey: { type: 'string', description: 'The training key (int64)' },
            registrantKey: { type: 'string', description: 'The registrant key (int64)' },
            organizerKey: { type: 'string', description: 'The organizer key (int64). Defaults to the configured organizer key if not provided.' },
          },
          required: ['trainingKey', 'registrantKey'],
        },
      },
      {
        name: 'cancel_registration',
        description: 'Cancel the registration of a specific registrant from a training session.',
        inputSchema: {
          type: 'object',
          properties: {
            trainingKey: { type: 'string', description: 'The training key (int64)' },
            registrantKey: { type: 'string', description: 'The registrant key (int64) to cancel' },
            organizerKey: { type: 'string', description: 'The organizer key (int64). Defaults to the configured organizer key if not provided.' },
          },
          required: ['trainingKey', 'registrantKey'],
        },
      },
      {
        name: 'update_registration_settings',
        description: 'Update registration settings for a training, such as disabling web registration or confirmation emails.',
        inputSchema: {
          type: 'object',
          properties: {
            trainingKey: { type: 'string', description: 'The training key (int64) to update' },
            disableWebRegistration: { type: 'boolean', description: 'Whether to disable web-based registration' },
            disableConfirmationEmail: { type: 'boolean', description: 'Whether to disable registration confirmation emails' },
            organizerKey: { type: 'string', description: 'The organizer key (int64). Defaults to the configured organizer key if not provided.' },
          },
          required: ['trainingKey'],
        },
      },
      // --- Training Start ---
      {
        name: 'get_start_url',
        description: 'Get the URL that allows an organizer to start a training session immediately.',
        inputSchema: {
          type: 'object',
          properties: {
            trainingKey: { type: 'string', description: 'The training key (int64)' },
            organizerKey: { type: 'string', description: 'The organizer key (int64). Defaults to the configured organizer key if not provided.' },
          },
          required: ['trainingKey'],
        },
      },
      {
        name: 'start_training',
        description: 'Start a training session immediately. Returns the join URL for attendees.',
        inputSchema: {
          type: 'object',
          properties: {
            trainingKey: { type: 'string', description: 'The training key (int64) to start' },
          },
          required: ['trainingKey'],
        },
      },
      // --- Reports ---
      {
        name: 'get_sessions_for_date_range',
        description: 'Get session details (attendance, duration, polls) for all trainings within a date range.',
        inputSchema: {
          type: 'object',
          properties: {
            startDate: { type: 'string', description: 'Start date in ISO 8601 format (e.g. "2024-01-01T00:00:00Z")' },
            endDate: { type: 'string', description: 'End date in ISO 8601 format (e.g. "2024-12-31T23:59:59Z")' },
            organizerKey: { type: 'string', description: 'The organizer key (int64). Defaults to the configured organizer key if not provided.' },
          },
          required: ['startDate', 'endDate'],
        },
      },
      {
        name: 'get_attendance_details',
        description: 'Get detailed attendance records for a specific training session identified by its session key.',
        inputSchema: {
          type: 'object',
          properties: {
            sessionKey: { type: 'string', description: 'The session key (int64) to retrieve attendance for' },
            organizerKey: { type: 'string', description: 'The organizer key (int64). Defaults to the configured organizer key if not provided.' },
          },
          required: ['sessionKey'],
        },
      },
      {
        name: 'get_session_details_for_training',
        description: 'Get all session details and attendance data for a specific training identified by its training key.',
        inputSchema: {
          type: 'object',
          properties: {
            trainingKey: { type: 'string', description: 'The training key (int64)' },
            organizerKey: { type: 'string', description: 'The organizer key (int64). Defaults to the configured organizer key if not provided.' },
          },
          required: ['trainingKey'],
        },
      },
      // --- Recordings ---
      {
        name: 'get_recordings',
        description: 'Get all available recordings for a specific training session.',
        inputSchema: {
          type: 'object',
          properties: {
            trainingKey: { type: 'string', description: 'The training key (int64)' },
          },
          required: ['trainingKey'],
        },
      },
      {
        name: 'get_recording_download',
        description: 'Get the download URL and metadata for a specific recording by its recording ID.',
        inputSchema: {
          type: 'object',
          properties: {
            trainingKey: { type: 'string', description: 'The training key (int64)' },
            recordingId: { type: 'string', description: 'The recording ID to retrieve' },
          },
          required: ['trainingKey', 'recordingId'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'get_all_organizers': return await this.getAllOrganizers(args);
        case 'list_trainings': return await this.listTrainings(args);
        case 'schedule_training': return await this.scheduleTraining(args);
        case 'get_training': return await this.getTraining(args);
        case 'cancel_training': return await this.cancelTraining(args);
        case 'get_manage_training_url': return await this.getManageTrainingUrl(args);
        case 'update_training_name_description': return await this.updateTrainingNameDescription(args);
        case 'update_training_times': return await this.updateTrainingTimes(args);
        case 'get_training_organizers': return await this.getTrainingOrganizers(args);
        case 'update_training_organizers': return await this.updateTrainingOrganizers(args);
        case 'get_registrants': return await this.getRegistrants(args);
        case 'register_for_training': return await this.registerForTraining(args);
        case 'get_registrant': return await this.getRegistrant(args);
        case 'cancel_registration': return await this.cancelRegistration(args);
        case 'update_registration_settings': return await this.updateRegistrationSettings(args);
        case 'get_start_url': return await this.getStartUrl(args);
        case 'start_training': return await this.startTraining(args);
        case 'get_sessions_for_date_range': return await this.getSessionsForDateRange(args);
        case 'get_attendance_details': return await this.getAttendanceDetails(args);
        case 'get_session_details_for_training': return await this.getSessionDetailsForTraining(args);
        case 'get_recordings': return await this.getRecordings(args);
        case 'get_recording_download': return await this.getRecordingDownload(args);
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

  private resolveOrganizerKey(args: Record<string, unknown>): string {
    return (args.organizerKey as string) || this.organizerKey;
  }

  private async apiGet(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, { method: 'GET', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apiPost(path: string, body: unknown): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    if (response.status === 204) {
      return { content: [{ type: 'text', text: JSON.stringify({ success: true }) }], isError: false };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apiPut(path: string, body: unknown): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'PUT',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    if (response.status === 204) {
      return { content: [{ type: 'text', text: JSON.stringify({ success: true }) }], isError: false };
    }
    const data = await response.json().catch(() => ({ success: true }));
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apiDelete(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, { method: 'DELETE', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: JSON.stringify({ success: true }) }], isError: false };
  }

  private async getAllOrganizers(args: Record<string, unknown>): Promise<ToolResult> {
    const accountKey = args.accountKey as string;
    if (!accountKey) return { content: [{ type: 'text', text: 'accountKey is required' }], isError: true };
    return this.apiGet(`/accounts/${encodeURIComponent(accountKey)}/organizers`);
  }

  private async listTrainings(args: Record<string, unknown>): Promise<ToolResult> {
    const orgKey = this.resolveOrganizerKey(args);
    return this.apiGet(`/organizers/${encodeURIComponent(orgKey)}/trainings`);
  }

  private async scheduleTraining(args: Record<string, unknown>): Promise<ToolResult> {
    const { name, times } = args;
    if (!name || !times) {
      return { content: [{ type: 'text', text: 'name and times are required' }], isError: true };
    }
    const orgKey = this.resolveOrganizerKey(args);
    const body: Record<string, unknown> = { name, times };
    if (args.description) body.description = args.description;
    if (args.timeZone) body.timeZone = args.timeZone;
    if (args.registrationSettings) body.registrationSettings = args.registrationSettings;
    if (args.organizers) body.organizers = args.organizers;
    return this.apiPost(`/organizers/${encodeURIComponent(orgKey)}/trainings`, body);
  }

  private async getTraining(args: Record<string, unknown>): Promise<ToolResult> {
    const trainingKey = args.trainingKey as string;
    if (!trainingKey) return { content: [{ type: 'text', text: 'trainingKey is required' }], isError: true };
    const orgKey = this.resolveOrganizerKey(args);
    return this.apiGet(`/organizers/${encodeURIComponent(orgKey)}/trainings/${encodeURIComponent(trainingKey)}`);
  }

  private async cancelTraining(args: Record<string, unknown>): Promise<ToolResult> {
    const trainingKey = args.trainingKey as string;
    if (!trainingKey) return { content: [{ type: 'text', text: 'trainingKey is required' }], isError: true };
    const orgKey = this.resolveOrganizerKey(args);
    return this.apiDelete(`/organizers/${encodeURIComponent(orgKey)}/trainings/${encodeURIComponent(trainingKey)}`);
  }

  private async getManageTrainingUrl(args: Record<string, unknown>): Promise<ToolResult> {
    const trainingKey = args.trainingKey as string;
    if (!trainingKey) return { content: [{ type: 'text', text: 'trainingKey is required' }], isError: true };
    const orgKey = this.resolveOrganizerKey(args);
    return this.apiGet(`/organizers/${encodeURIComponent(orgKey)}/trainings/${encodeURIComponent(trainingKey)}/manageUrl`);
  }

  private async updateTrainingNameDescription(args: Record<string, unknown>): Promise<ToolResult> {
    const { trainingKey, name } = args;
    if (!trainingKey || !name) {
      return { content: [{ type: 'text', text: 'trainingKey and name are required' }], isError: true };
    }
    const orgKey = this.resolveOrganizerKey(args);
    const body: Record<string, unknown> = { name };
    if (args.description) body.description = args.description;
    return this.apiPut(`/organizers/${encodeURIComponent(orgKey)}/trainings/${encodeURIComponent(trainingKey as string)}/nameDescription`, body);
  }

  private async updateTrainingTimes(args: Record<string, unknown>): Promise<ToolResult> {
    const { trainingKey, times } = args;
    if (!trainingKey || !times) {
      return { content: [{ type: 'text', text: 'trainingKey and times are required' }], isError: true };
    }
    const orgKey = this.resolveOrganizerKey(args);
    const body: Record<string, unknown> = { times };
    if (args.timeZone) body.timeZone = args.timeZone;
    return this.apiPut(`/organizers/${encodeURIComponent(orgKey)}/trainings/${encodeURIComponent(trainingKey as string)}/times`, body);
  }

  private async getTrainingOrganizers(args: Record<string, unknown>): Promise<ToolResult> {
    const trainingKey = args.trainingKey as string;
    if (!trainingKey) return { content: [{ type: 'text', text: 'trainingKey is required' }], isError: true };
    const orgKey = this.resolveOrganizerKey(args);
    return this.apiGet(`/organizers/${encodeURIComponent(orgKey)}/trainings/${encodeURIComponent(trainingKey)}/organizers`);
  }

  private async updateTrainingOrganizers(args: Record<string, unknown>): Promise<ToolResult> {
    const { trainingKey, organizers } = args;
    if (!trainingKey || !organizers) {
      return { content: [{ type: 'text', text: 'trainingKey and organizers are required' }], isError: true };
    }
    const orgKey = this.resolveOrganizerKey(args);
    return this.apiPut(`/organizers/${encodeURIComponent(orgKey)}/trainings/${encodeURIComponent(trainingKey as string)}/organizers`, organizers);
  }

  private async getRegistrants(args: Record<string, unknown>): Promise<ToolResult> {
    const trainingKey = args.trainingKey as string;
    if (!trainingKey) return { content: [{ type: 'text', text: 'trainingKey is required' }], isError: true };
    const orgKey = this.resolveOrganizerKey(args);
    return this.apiGet(`/organizers/${encodeURIComponent(orgKey)}/trainings/${encodeURIComponent(trainingKey)}/registrants`);
  }

  private async registerForTraining(args: Record<string, unknown>): Promise<ToolResult> {
    const { trainingKey, givenName, surname, email } = args;
    if (!trainingKey || !givenName || !surname || !email) {
      return { content: [{ type: 'text', text: 'trainingKey, givenName, surname, and email are required' }], isError: true };
    }
    const orgKey = this.resolveOrganizerKey(args);
    return this.apiPost(`/organizers/${encodeURIComponent(orgKey)}/trainings/${encodeURIComponent(trainingKey as string)}/registrants`, { givenName, surname, email });
  }

  private async getRegistrant(args: Record<string, unknown>): Promise<ToolResult> {
    const { trainingKey, registrantKey } = args;
    if (!trainingKey || !registrantKey) {
      return { content: [{ type: 'text', text: 'trainingKey and registrantKey are required' }], isError: true };
    }
    const orgKey = this.resolveOrganizerKey(args);
    return this.apiGet(`/organizers/${encodeURIComponent(orgKey)}/trainings/${encodeURIComponent(trainingKey as string)}/registrants/${encodeURIComponent(registrantKey as string)}`);
  }

  private async cancelRegistration(args: Record<string, unknown>): Promise<ToolResult> {
    const { trainingKey, registrantKey } = args;
    if (!trainingKey || !registrantKey) {
      return { content: [{ type: 'text', text: 'trainingKey and registrantKey are required' }], isError: true };
    }
    const orgKey = this.resolveOrganizerKey(args);
    return this.apiDelete(`/organizers/${encodeURIComponent(orgKey)}/trainings/${encodeURIComponent(trainingKey as string)}/registrants/${encodeURIComponent(registrantKey as string)}`);
  }

  private async updateRegistrationSettings(args: Record<string, unknown>): Promise<ToolResult> {
    const trainingKey = args.trainingKey as string;
    if (!trainingKey) return { content: [{ type: 'text', text: 'trainingKey is required' }], isError: true };
    const orgKey = this.resolveOrganizerKey(args);
    const body: Record<string, unknown> = {};
    if (args.disableWebRegistration !== undefined) body.disableWebRegistration = args.disableWebRegistration;
    if (args.disableConfirmationEmail !== undefined) body.disableConfirmationEmail = args.disableConfirmationEmail;
    return this.apiPut(`/organizers/${encodeURIComponent(orgKey)}/trainings/${encodeURIComponent(trainingKey)}/registrationSettings`, body);
  }

  private async getStartUrl(args: Record<string, unknown>): Promise<ToolResult> {
    const trainingKey = args.trainingKey as string;
    if (!trainingKey) return { content: [{ type: 'text', text: 'trainingKey is required' }], isError: true };
    const orgKey = this.resolveOrganizerKey(args);
    return this.apiGet(`/organizers/${encodeURIComponent(orgKey)}/trainings/${encodeURIComponent(trainingKey)}/startUrl`);
  }

  private async startTraining(args: Record<string, unknown>): Promise<ToolResult> {
    const trainingKey = args.trainingKey as string;
    if (!trainingKey) return { content: [{ type: 'text', text: 'trainingKey is required' }], isError: true };
    return this.apiGet(`/trainings/${encodeURIComponent(trainingKey)}/start`);
  }

  private async getSessionsForDateRange(args: Record<string, unknown>): Promise<ToolResult> {
    const { startDate, endDate } = args;
    if (!startDate || !endDate) {
      return { content: [{ type: 'text', text: 'startDate and endDate are required' }], isError: true };
    }
    const orgKey = this.resolveOrganizerKey(args);
    return this.apiPost(`/reports/organizers/${encodeURIComponent(orgKey)}/sessions`, { startDate, endDate });
  }

  private async getAttendanceDetails(args: Record<string, unknown>): Promise<ToolResult> {
    const sessionKey = args.sessionKey as string;
    if (!sessionKey) return { content: [{ type: 'text', text: 'sessionKey is required' }], isError: true };
    const orgKey = this.resolveOrganizerKey(args);
    return this.apiGet(`/reports/organizers/${encodeURIComponent(orgKey)}/sessions/${encodeURIComponent(sessionKey)}/attendees`);
  }

  private async getSessionDetailsForTraining(args: Record<string, unknown>): Promise<ToolResult> {
    const trainingKey = args.trainingKey as string;
    if (!trainingKey) return { content: [{ type: 'text', text: 'trainingKey is required' }], isError: true };
    const orgKey = this.resolveOrganizerKey(args);
    return this.apiGet(`/reports/organizers/${encodeURIComponent(orgKey)}/trainings/${encodeURIComponent(trainingKey)}`);
  }

  private async getRecordings(args: Record<string, unknown>): Promise<ToolResult> {
    const trainingKey = args.trainingKey as string;
    if (!trainingKey) return { content: [{ type: 'text', text: 'trainingKey is required' }], isError: true };
    return this.apiGet(`/trainings/${encodeURIComponent(trainingKey)}/recordings`);
  }

  private async getRecordingDownload(args: Record<string, unknown>): Promise<ToolResult> {
    const { trainingKey, recordingId } = args;
    if (!trainingKey || !recordingId) {
      return { content: [{ type: 'text', text: 'trainingKey and recordingId are required' }], isError: true };
    }
    return this.apiGet(`/trainings/${encodeURIComponent(trainingKey as string)}/recordings/${encodeURIComponent(recordingId as string)}`);
  }

  static catalog() {
    return {
      name: 'getgo-gototraining',
      displayName: 'GoToTraining',
      version: '1.0.0',
      category: 'education' as const,
      keywords: ['gototraining', 'getgo', 'training', 'webinar', 'elearning', 'lms', 'logmein'],
      toolNames: ['get_all_organizers', 'list_trainings', 'schedule_training', 'get_training', 'cancel_training', 'get_manage_training_url', 'update_training_name_description', 'update_training_times', 'get_training_organizers', 'update_training_organizers', 'get_registrants', 'register_for_training', 'get_registrant', 'cancel_registration', 'update_registration_settings', 'get_start_url', 'start_training', 'get_sessions_for_date_range', 'get_attendance_details', 'get_session_details_for_training', 'get_recordings', 'get_recording_download'],
      description: 'GoToTraining adapter for the Epic AI Intelligence Platform. Schedule and manage online training sessions, handle registrations, retrieve attendance reports, and access recordings via the GoToTraining REST API.',
      author: 'protectnil' as const,
    };
  }
}

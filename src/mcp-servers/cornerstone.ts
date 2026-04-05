/**
 * Cornerstone OnDemand MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// No official Cornerstone OnDemand MCP server was found on GitHub, npmjs.com, or the Cornerstone developer portal.
//
// Base URL: https://{corpname}.csod.com  (paths vary by API family — see implementations below)
//   User/Employee API: /services/api/x/users/v1/employees/
//   Learning/Transcript API: /services/api/v1/learning/ and /services/api/v1/transcripts/
// Auth: OAuth2 client credentials — token endpoint: https://{corpname}.csod.com/services/api/oauth2/token
// Docs: https://csod.dev
// Rate limits: 417 req/min, 25,000 req/hr, 600,000 req/day (Foundational APIs); varies by endpoint

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface CornerstoneConfig {
  clientId: string;
  clientSecret: string;
  corpname: string;           // subdomain, e.g. "acme" for acme.csod.com
  baseUrl?: string;           // optional override; defaults to https://{corpname}.csod.com
}

export class CornerstoneMCPServer extends MCPAdapterBase {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly corpname: string;
  private readonly baseUrl: string;
  private bearerToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(config: CornerstoneConfig) {
    super();
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.corpname = config.corpname;
    this.baseUrl = config.baseUrl || `https://${config.corpname}.csod.com`;
  }

  static catalog() {
    return {
      name: 'cornerstone',
      displayName: 'Cornerstone OnDemand',
      version: '1.0.0',
      category: 'misc',
      keywords: [
        'cornerstone', 'csod', 'lms', 'learning management', 'elearning', 'training',
        'transcript', 'course', 'learning object', 'user', 'talent', 'hr', 'onboarding',
        'curriculum', 'completion', 'enrollment', 'session', 'certification',
      ],
      toolNames: [
        'get_user', 'search_users', 'list_learning_objects', 'get_learning_object',
        'get_user_transcript', 'assign_training', 'complete_training', 'update_transcript_progress',
        'list_sessions', 'get_session', 'create_session', 'list_curricula', 'get_curriculum',
        'search_transcript', 'list_groups', 'get_group',
      ],
      description: 'Cornerstone OnDemand LMS: manage users, learning objects, transcripts, training assignments, sessions, curricula, and groups.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'get_user',
        description: 'Retrieve a single Cornerstone user record by user ID, including profile and status information',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: {
              type: 'string',
              description: 'Cornerstone user ID (numeric string)',
            },
          },
          required: ['user_id'],
        },
      },
      {
        name: 'search_users',
        description: 'Search Cornerstone users by name, email, or username with optional status and pagination filters',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search term — matched against first name, last name, email, and username',
            },
            status: {
              type: 'string',
              description: 'Filter by user status: Active, Inactive (default: Active)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            page_size: {
              type: 'number',
              description: 'Results per page (max 100, default: 50)',
            },
          },
        },
      },
      {
        name: 'list_learning_objects',
        description: 'List learning objects with optional filters for type, status, and keyword search',
        inputSchema: {
          type: 'object',
          properties: {
            lo_type: {
              type: 'string',
              description: 'Filter by learning object type: curriculum, event, session, material, test, video, online_course',
            },
            status: {
              type: 'string',
              description: 'Filter by status: Active, Inactive (default: Active)',
            },
            keyword: {
              type: 'string',
              description: 'Full-text search keyword against LO title and description',
            },
            page: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
            page_size: {
              type: 'number',
              description: 'Results per page (max 100, default: 50)',
            },
          },
        },
      },
      {
        name: 'get_learning_object',
        description: 'Retrieve full details for a single learning object by its ID, including metadata and availability',
        inputSchema: {
          type: 'object',
          properties: {
            lo_id: {
              type: 'string',
              description: 'Learning object ID',
            },
          },
          required: ['lo_id'],
        },
      },
      {
        name: 'get_user_transcript',
        description: 'Retrieve a user\'s learning transcript including enrollment status, completion dates, and scores',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: {
              type: 'string',
              description: 'Cornerstone user ID',
            },
            status: {
              type: 'string',
              description: 'Filter transcript by status: Registered, InProgress, Completed, NotStarted (default: all)',
            },
            lo_type: {
              type: 'string',
              description: 'Filter by learning object type: curriculum, event, session, material, test, video, online_course',
            },
            page: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
            page_size: {
              type: 'number',
              description: 'Results per page (max 200, default: 50)',
            },
          },
          required: ['user_id'],
        },
      },
      {
        name: 'assign_training',
        description: 'Assign a learning object to one or more users, registering them in the transcript with an optional due date',
        inputSchema: {
          type: 'object',
          properties: {
            user_ids: {
              type: 'string',
              description: 'Comma-separated list of Cornerstone user IDs to assign training to',
            },
            lo_id: {
              type: 'string',
              description: 'Learning object ID to assign',
            },
            due_date: {
              type: 'string',
              description: 'Assignment due date in ISO 8601 format (e.g. 2026-06-30T00:00:00Z)',
            },
            send_notification: {
              type: 'boolean',
              description: 'Send email notification to users upon assignment (default: true)',
            },
          },
          required: ['user_ids', 'lo_id'],
        },
      },
      {
        name: 'complete_training',
        description: 'Mark a learning object as complete in a user\'s transcript, optionally recording a score and completion date',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: {
              type: 'string',
              description: 'Cornerstone user ID',
            },
            lo_id: {
              type: 'string',
              description: 'Learning object ID to mark complete',
            },
            completion_date: {
              type: 'string',
              description: 'Completion date in ISO 8601 format (defaults to current date/time)',
            },
            score: {
              type: 'number',
              description: 'Completion score as a percentage (0–100), if applicable',
            },
          },
          required: ['user_id', 'lo_id'],
        },
      },
      {
        name: 'update_transcript_progress',
        description: 'Update a transcript record status from Registered to InProgress for a given user and learning object',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: {
              type: 'string',
              description: 'Cornerstone user ID',
            },
            lo_id: {
              type: 'string',
              description: 'Learning object ID',
            },
          },
          required: ['user_id', 'lo_id'],
        },
      },
      {
        name: 'list_sessions',
        description: 'List instructor-led training sessions for a given event learning object with date and availability filters',
        inputSchema: {
          type: 'object',
          properties: {
            event_lo_id: {
              type: 'string',
              description: 'Parent event learning object ID to list sessions for',
            },
            start_date_from: {
              type: 'string',
              description: 'Only return sessions starting on or after this date (ISO 8601)',
            },
            start_date_to: {
              type: 'string',
              description: 'Only return sessions starting on or before this date (ISO 8601)',
            },
            page: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
            page_size: {
              type: 'number',
              description: 'Results per page (max 100, default: 25)',
            },
          },
          required: ['event_lo_id'],
        },
      },
      {
        name: 'get_session',
        description: 'Retrieve full details for a specific instructor-led training session by session ID',
        inputSchema: {
          type: 'object',
          properties: {
            session_id: {
              type: 'string',
              description: 'Session ID',
            },
          },
          required: ['session_id'],
        },
      },
      {
        name: 'create_session',
        description: 'Create a new instructor-led training session for an event learning object with schedule and capacity',
        inputSchema: {
          type: 'object',
          properties: {
            event_lo_id: {
              type: 'string',
              description: 'Parent event learning object ID',
            },
            start_date: {
              type: 'string',
              description: 'Session start date and time in ISO 8601 format',
            },
            end_date: {
              type: 'string',
              description: 'Session end date and time in ISO 8601 format',
            },
            location: {
              type: 'string',
              description: 'Session location or virtual meeting URL',
            },
            max_seats: {
              type: 'number',
              description: 'Maximum number of registrations allowed',
            },
            instructor_user_id: {
              type: 'string',
              description: 'Cornerstone user ID of the session instructor',
            },
          },
          required: ['event_lo_id', 'start_date', 'end_date'],
        },
      },
      {
        name: 'list_curricula',
        description: 'List curriculum learning objects with optional keyword search and status filter',
        inputSchema: {
          type: 'object',
          properties: {
            keyword: {
              type: 'string',
              description: 'Search keyword matched against curriculum title',
            },
            status: {
              type: 'string',
              description: 'Filter by status: Active, Inactive (default: Active)',
            },
            page: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
            page_size: {
              type: 'number',
              description: 'Results per page (max 100, default: 50)',
            },
          },
        },
      },
      {
        name: 'get_curriculum',
        description: 'Retrieve a curriculum learning object by ID, including its component learning objects and completion requirements',
        inputSchema: {
          type: 'object',
          properties: {
            curriculum_id: {
              type: 'string',
              description: 'Curriculum learning object ID',
            },
          },
          required: ['curriculum_id'],
        },
      },
      {
        name: 'search_transcript',
        description: 'Search transcript records across all users by learning object ID, status, or date range for reporting',
        inputSchema: {
          type: 'object',
          properties: {
            lo_id: {
              type: 'string',
              description: 'Filter transcript records by learning object ID',
            },
            status: {
              type: 'string',
              description: 'Filter by transcript status: Registered, InProgress, Completed (default: all)',
            },
            completed_from: {
              type: 'string',
              description: 'Return completions on or after this date (ISO 8601)',
            },
            completed_to: {
              type: 'string',
              description: 'Return completions on or before this date (ISO 8601)',
            },
            page: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
            page_size: {
              type: 'number',
              description: 'Results per page (max 200, default: 50)',
            },
          },
        },
      },
      {
        name: 'list_groups',
        description: 'List Cornerstone user groups with optional keyword filter for group name',
        inputSchema: {
          type: 'object',
          properties: {
            keyword: {
              type: 'string',
              description: 'Search keyword matched against group name',
            },
            page: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
            page_size: {
              type: 'number',
              description: 'Results per page (max 100, default: 50)',
            },
          },
        },
      },
      {
        name: 'get_group',
        description: 'Retrieve details for a Cornerstone user group by group ID, including membership count',
        inputSchema: {
          type: 'object',
          properties: {
            group_id: {
              type: 'string',
              description: 'Group ID',
            },
          },
          required: ['group_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'get_user':
          return this.getUser(args);
        case 'search_users':
          return this.searchUsers(args);
        case 'list_learning_objects':
          return this.listLearningObjects(args);
        case 'get_learning_object':
          return this.getLearningObject(args);
        case 'get_user_transcript':
          return this.getUserTranscript(args);
        case 'assign_training':
          return this.assignTraining(args);
        case 'complete_training':
          return this.completeTraining(args);
        case 'update_transcript_progress':
          return this.updateTranscriptProgress(args);
        case 'list_sessions':
          return this.listSessions(args);
        case 'get_session':
          return this.getSession(args);
        case 'create_session':
          return this.createSession(args);
        case 'list_curricula':
          return this.listCurricula(args);
        case 'get_curriculum':
          return this.getCurriculum(args);
        case 'search_transcript':
          return this.searchTranscript(args);
        case 'list_groups':
          return this.listGroups(args);
        case 'get_group':
          return this.getGroup(args);
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

  // --- Auth ---

  private async getOrRefreshToken(): Promise<string> {
    const now = Date.now();
    if (this.bearerToken && this.tokenExpiry > now) {
      return this.bearerToken;
    }
    const tokenUrl = `https://${this.corpname}.csod.com/services/api/oauth2/token`;
    const response = await this.fetchWithRetry(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: this.clientId,
        client_secret: this.clientSecret,
      }).toString(),
    });
    if (!response.ok) {
      throw new Error(`OAuth2 token request failed: ${response.status} ${response.statusText}`);
    }
    const data = await response.json() as { access_token: string; expires_in: number };
    this.bearerToken = data.access_token;
    this.tokenExpiry = now + (data.expires_in - 60) * 1000;
    return this.bearerToken;
  }

  private async headers(): Promise<Record<string, string>> {
    const token = await this.getOrRefreshToken();
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  // --- Helpers ---


  private async csodGet(path: string, params: Record<string, string> = {}): Promise<ToolResult> {
    const qs = new URLSearchParams(params).toString();
    const url = `${this.baseUrl}${path}${qs ? '?' + qs : ''}`;
    const response = await this.fetchWithRetry(url, { method: 'GET', headers: await this.headers() });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async csodPost(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: await this.headers(),
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async csodPatch(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'PATCH',
      headers: await this.headers(),
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  // --- Tool implementations ---

  private async getUser(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.user_id) return { content: [{ type: 'text', text: 'user_id is required' }], isError: true };
    return this.csodGet(`/services/api/x/users/v1/employees/${encodeURIComponent(args.user_id as string)}`);
  }

  private async searchUsers(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      pagenumber: String((args.page as number) ?? 1),
      pageSize: String((args.page_size as number) ?? 50),
    };
    if (args.query) params.lastname = args.query as string;
    if (args.status) params.includeInactive = args.status === 'Inactive' ? 'true' : 'false';
    return this.csodGet('/services/api/x/users/v1/employees', params);
  }

  private async listLearningObjects(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      page: String((args.page as number) ?? 1),
      pageSize: String((args.page_size as number) ?? 50),
    };
    if (args.lo_type) params.loType = args.lo_type as string;
    if (args.status) params.status = args.status as string;
    if (args.keyword) params.keyword = args.keyword as string;
    return this.csodGet('/services/api/v1/learning/lo', params);
  }

  private async getLearningObject(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.lo_id) return { content: [{ type: 'text', text: 'lo_id is required' }], isError: true };
    return this.csodGet(`/services/api/v1/learning/lo/${encodeURIComponent(args.lo_id as string)}`);
  }

  private async getUserTranscript(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.user_id) return { content: [{ type: 'text', text: 'user_id is required' }], isError: true };
    const params: Record<string, string> = {
      page: String((args.page as number) ?? 1),
      pageSize: String((args.page_size as number) ?? 50),
    };
    if (args.status) params.status = args.status as string;
    if (args.lo_type) params.trainingType = args.lo_type as string;
    params.externalId = args.user_id as string;
    return this.csodGet('/services/api/v1/transcripts/overview', params);
  }

  private async assignTraining(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.user_ids || !args.lo_id) return { content: [{ type: 'text', text: 'user_ids and lo_id are required' }], isError: true };
    const body: Record<string, unknown> = {
      userIds: (args.user_ids as string).split(',').map(s => s.trim()),
      loId: args.lo_id,
    };
    if (args.due_date) body.dueDate = args.due_date;
    if (typeof args.send_notification === 'boolean') body.sendNotification = args.send_notification;
    return this.csodPost('/services/api/v1/transcripts/assign', body);
  }

  private async completeTraining(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.user_id || !args.lo_id) return { content: [{ type: 'text', text: 'user_id and lo_id are required' }], isError: true };
    const body: Record<string, unknown> = { userId: args.user_id, loId: args.lo_id };
    if (args.completion_date) body.completionDate = args.completion_date;
    if (args.score !== undefined) body.score = args.score;
    return this.csodPatch('/services/api/v1/transcripts/complete', body);
  }

  private async updateTranscriptProgress(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.user_id || !args.lo_id) return { content: [{ type: 'text', text: 'user_id and lo_id are required' }], isError: true };
    return this.csodPatch('/services/api/v1/transcripts/progress', { userId: args.user_id, loId: args.lo_id });
  }

  private async listSessions(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.event_lo_id) return { content: [{ type: 'text', text: 'event_lo_id is required' }], isError: true };
    const params: Record<string, string> = {
      page: String((args.page as number) ?? 1),
      pageSize: String((args.page_size as number) ?? 25),
    };
    if (args.start_date_from) params.startDateFrom = args.start_date_from as string;
    if (args.start_date_to) params.startDateTo = args.start_date_to as string;
    return this.csodGet(`/services/api/v1/learning/lo/${encodeURIComponent(args.event_lo_id as string)}/sessions`, params);
  }

  private async getSession(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.session_id) return { content: [{ type: 'text', text: 'session_id is required' }], isError: true };
    return this.csodGet(`/services/api/v1/learning/sessions/${encodeURIComponent(args.session_id as string)}`);
  }

  private async createSession(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.event_lo_id || !args.start_date || !args.end_date) {
      return { content: [{ type: 'text', text: 'event_lo_id, start_date, and end_date are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      eventLoId: args.event_lo_id,
      startDate: args.start_date,
      endDate: args.end_date,
    };
    if (args.location) body.location = args.location;
    if (args.max_seats) body.maxSeats = args.max_seats;
    if (args.instructor_user_id) body.instructorUserId = args.instructor_user_id;
    return this.csodPost('/services/api/v1/learning/sessions', body);
  }

  private async listCurricula(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      loType: 'curriculum',
      page: String((args.page as number) ?? 1),
      pageSize: String((args.page_size as number) ?? 50),
    };
    if (args.keyword) params.keyword = args.keyword as string;
    if (args.status) params.status = args.status as string;
    return this.csodGet('/services/api/v1/learning/lo', params);
  }

  private async getCurriculum(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.curriculum_id) return { content: [{ type: 'text', text: 'curriculum_id is required' }], isError: true };
    return this.csodGet(`/services/api/v1/learning/lo/${encodeURIComponent(args.curriculum_id as string)}`);
  }

  private async searchTranscript(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      page: String((args.page as number) ?? 1),
      pageSize: String((args.page_size as number) ?? 50),
    };
    if (args.lo_id) params.learningObjectId = args.lo_id as string;
    if (args.status) params.status = args.status as string;
    if (args.completed_from) params.completedFrom = args.completed_from as string;
    if (args.completed_to) params.completedTo = args.completed_to as string;
    return this.csodGet('/services/api/v1/transcripts/overview', params);
  }

  private async listGroups(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      pagenumber: String((args.page as number) ?? 1),
      pageSize: String((args.page_size as number) ?? 50),
    };
    if (args.keyword) params.lastname = args.keyword as string;
    return this.csodGet('/services/api/x/users/v1/employees/groups', params);
  }

  private async getGroup(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.group_id) return { content: [{ type: 'text', text: 'group_id is required' }], isError: true };
    const params: Record<string, string> = { id: args.group_id as string };
    return this.csodGet('/services/api/x/users/v1/employees/groups', params);
  }
}

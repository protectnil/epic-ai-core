/**
 * Cisco Webex MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28 — community repo exists but not from official Cisco org.
// Community MCP (NOT official): https://github.com/WebexSamples/webex-messaging-mcp-server —
//   52 tools, last commit 2025-10-29. WebexSamples is a Cisco samples org, NOT the Cisco vendor org.
//   Fails the "published by the vendor themselves" criterion. Use this REST adapter as primary.
//
// Base URL: https://webexapis.com/v1
// Auth: OAuth2 Bearer token (personal access token or Integration OAuth token). Access tokens valid 14 days; refresh tokens valid 90 days.
// Docs: https://developer.webex.com/docs/api/v1
// Rate limits: Varies by resource. HTTP 429 returned on excess — check Retry-After header.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface WebexConfig {
  accessToken: string;
  baseUrl?: string;
}

export class WebexMCPServer extends MCPAdapterBase {
  private readonly accessToken: string;
  private readonly baseUrl: string;

  constructor(config: WebexConfig) {
    super();
    this.accessToken = config.accessToken;
    this.baseUrl = config.baseUrl || 'https://webexapis.com/v1';
  }

  static catalog() {
    return {
      name: 'webex',
      displayName: 'Cisco Webex',
      version: '1.0.0',
      category: 'collaboration',
      keywords: ['webex', 'cisco', 'meeting', 'message', 'room', 'space', 'team', 'people', 'video', 'conference', 'collaboration', 'recording', 'webhook'],
      toolNames: [
        'list_rooms', 'get_room', 'create_room', 'update_room', 'delete_room',
        'list_messages', 'get_message', 'send_message', 'delete_message',
        'list_memberships', 'create_membership', 'delete_membership',
        'list_meetings', 'get_meeting', 'create_meeting', 'delete_meeting',
        'get_me', 'list_people', 'get_person',
        'list_webhooks', 'create_webhook', 'delete_webhook',
      ],
      description: 'Cisco Webex collaboration platform: manage rooms and spaces, send messages, schedule meetings, control team memberships, look up people, and configure webhooks for event notifications.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_rooms',
        description: 'List Webex rooms (spaces) the authenticated user is a member of with optional type and pagination filters',
        inputSchema: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              description: 'Room type filter: direct (1:1 spaces) or group (group spaces, default: group)',
            },
            team_id: {
              type: 'string',
              description: 'Filter rooms belonging to a specific team ID',
            },
            sort_by: {
              type: 'string',
              description: 'Sort field: id, lastactivity, created (default: lastactivity)',
            },
            max: {
              type: 'number',
              description: 'Maximum rooms to return (default: 100)',
            },
          },
        },
      },
      {
        name: 'get_room',
        description: 'Get details for a specific Webex room by room ID including title, type, creation date, and last activity',
        inputSchema: {
          type: 'object',
          properties: {
            room_id: {
              type: 'string',
              description: 'Webex room ID',
            },
          },
          required: ['room_id'],
        },
      },
      {
        name: 'create_room',
        description: 'Create a new Webex group room (space) with a title and optional team association',
        inputSchema: {
          type: 'object',
          properties: {
            title: {
              type: 'string',
              description: 'Title/name of the new room',
            },
            team_id: {
              type: 'string',
              description: 'Team ID to create this room within (optional — creates a standalone room if omitted)',
            },
          },
          required: ['title'],
        },
      },
      {
        name: 'update_room',
        description: 'Update the title of an existing Webex room by room ID',
        inputSchema: {
          type: 'object',
          properties: {
            room_id: {
              type: 'string',
              description: 'Webex room ID to update',
            },
            title: {
              type: 'string',
              description: 'New room title',
            },
          },
          required: ['room_id', 'title'],
        },
      },
      {
        name: 'delete_room',
        description: 'Delete a Webex room by room ID — removes the room and all its messages for all members',
        inputSchema: {
          type: 'object',
          properties: {
            room_id: {
              type: 'string',
              description: 'Webex room ID to delete',
            },
          },
          required: ['room_id'],
        },
      },
      {
        name: 'list_messages',
        description: 'List messages in a Webex room with optional date range, mentions filter, and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            room_id: {
              type: 'string',
              description: 'Webex room ID to retrieve messages from',
            },
            before: {
              type: 'string',
              description: 'Retrieve messages sent before this ISO 8601 timestamp',
            },
            before_message: {
              type: 'string',
              description: 'Retrieve messages before this message ID (for pagination)',
            },
            mentioned_people: {
              type: 'string',
              description: 'Filter messages that mention this person ID or "me"',
            },
            max: {
              type: 'number',
              description: 'Maximum messages to return (default: 50, max: 1000)',
            },
          },
          required: ['room_id'],
        },
      },
      {
        name: 'get_message',
        description: 'Get the full content of a specific Webex message by message ID',
        inputSchema: {
          type: 'object',
          properties: {
            message_id: {
              type: 'string',
              description: 'Webex message ID',
            },
          },
          required: ['message_id'],
        },
      },
      {
        name: 'send_message',
        description: 'Send a text or markdown message to a Webex room or person with optional file attachment URL',
        inputSchema: {
          type: 'object',
          properties: {
            room_id: {
              type: 'string',
              description: 'Room ID to send message to (either room_id or to_person_email required)',
            },
            to_person_email: {
              type: 'string',
              description: 'Email of person to send a direct 1:1 message to (either room_id or to_person_email required)',
            },
            text: {
              type: 'string',
              description: 'Plain text message content',
            },
            markdown: {
              type: 'string',
              description: 'Markdown formatted message content (overrides text in supporting clients)',
            },
            parent_id: {
              type: 'string',
              description: 'Message ID to reply to in a thread',
            },
          },
        },
      },
      {
        name: 'delete_message',
        description: 'Delete a Webex message by message ID',
        inputSchema: {
          type: 'object',
          properties: {
            message_id: {
              type: 'string',
              description: 'Webex message ID to delete',
            },
          },
          required: ['message_id'],
        },
      },
      {
        name: 'list_memberships',
        description: 'List members of a Webex room with their roles and email addresses',
        inputSchema: {
          type: 'object',
          properties: {
            room_id: {
              type: 'string',
              description: 'Webex room ID to list members for',
            },
            person_email: {
              type: 'string',
              description: 'Filter memberships for a specific person email',
            },
            max: {
              type: 'number',
              description: 'Maximum memberships to return (default: 100)',
            },
          },
          required: ['room_id'],
        },
      },
      {
        name: 'create_membership',
        description: 'Add a person to a Webex room by email address with optional moderator role',
        inputSchema: {
          type: 'object',
          properties: {
            room_id: {
              type: 'string',
              description: 'Webex room ID to add the person to',
            },
            person_email: {
              type: 'string',
              description: 'Email address of the person to add',
            },
            is_moderator: {
              type: 'boolean',
              description: 'Grant moderator role to the added person (default: false)',
            },
          },
          required: ['room_id', 'person_email'],
        },
      },
      {
        name: 'delete_membership',
        description: 'Remove a member from a Webex room by membership ID',
        inputSchema: {
          type: 'object',
          properties: {
            membership_id: {
              type: 'string',
              description: 'Membership ID to remove (from list_memberships)',
            },
          },
          required: ['membership_id'],
        },
      },
      {
        name: 'list_meetings',
        description: 'List Webex meetings for the authenticated user with optional date range and status filters',
        inputSchema: {
          type: 'object',
          properties: {
            meeting_type: {
              type: 'string',
              description: 'Meeting type: scheduledMeeting, meeting (default: scheduledMeeting)',
            },
            state: {
              type: 'string',
              description: 'Meeting state: active, scheduled, ready, lobby, inProgress, ended, missed, expired',
            },
            from: {
              type: 'string',
              description: 'Start of time range (ISO 8601, e.g. 2026-01-01T00:00:00Z)',
            },
            to: {
              type: 'string',
              description: 'End of time range (ISO 8601)',
            },
            max: {
              type: 'number',
              description: 'Maximum meetings to return (default: 10)',
            },
          },
        },
      },
      {
        name: 'get_meeting',
        description: 'Get full details for a specific Webex meeting by meeting ID including join link and participants',
        inputSchema: {
          type: 'object',
          properties: {
            meeting_id: {
              type: 'string',
              description: 'Webex meeting ID',
            },
          },
          required: ['meeting_id'],
        },
      },
      {
        name: 'create_meeting',
        description: 'Schedule a Webex meeting with title, start/end times, agenda, and optional password',
        inputSchema: {
          type: 'object',
          properties: {
            title: {
              type: 'string',
              description: 'Meeting title',
            },
            start: {
              type: 'string',
              description: 'Meeting start time (ISO 8601, e.g. 2026-04-01T14:00:00Z)',
            },
            end: {
              type: 'string',
              description: 'Meeting end time (ISO 8601)',
            },
            agenda: {
              type: 'string',
              description: 'Meeting agenda or description',
            },
            password: {
              type: 'string',
              description: 'Meeting password (optional)',
            },
            enabled_auto_record_meeting: {
              type: 'boolean',
              description: 'Auto-record the meeting (default: false)',
            },
          },
          required: ['title', 'start', 'end'],
        },
      },
      {
        name: 'delete_meeting',
        description: 'Delete a scheduled Webex meeting by meeting ID',
        inputSchema: {
          type: 'object',
          properties: {
            meeting_id: {
              type: 'string',
              description: 'Webex meeting ID to delete',
            },
          },
          required: ['meeting_id'],
        },
      },
      {
        name: 'get_me',
        description: 'Get the authenticated user\'s Webex profile including name, email, and organization information',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'list_people',
        description: 'Search for Webex people by name or email address within the organization',
        inputSchema: {
          type: 'object',
          properties: {
            email: {
              type: 'string',
              description: 'Filter by exact email address',
            },
            display_name: {
              type: 'string',
              description: 'Filter by display name (partial match)',
            },
            max: {
              type: 'number',
              description: 'Maximum results to return (default: 10)',
            },
          },
        },
      },
      {
        name: 'get_person',
        description: 'Get profile details for a specific Webex person by person ID including email, title, and avatar',
        inputSchema: {
          type: 'object',
          properties: {
            person_id: {
              type: 'string',
              description: 'Webex person ID',
            },
          },
          required: ['person_id'],
        },
      },
      {
        name: 'list_webhooks',
        description: 'List all webhooks configured for the authenticated Webex application',
        inputSchema: {
          type: 'object',
          properties: {
            max: {
              type: 'number',
              description: 'Maximum webhooks to return (default: 100)',
            },
          },
        },
      },
      {
        name: 'create_webhook',
        description: 'Create a Webex webhook to receive POST notifications for events like new messages, room memberships, and calls',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Descriptive name for this webhook',
            },
            target_url: {
              type: 'string',
              description: 'HTTPS URL to receive webhook POST notifications',
            },
            resource: {
              type: 'string',
              description: 'Resource to monitor: messages, rooms, memberships, meetings, recordings, telephony_calls (default: messages)',
            },
            event: {
              type: 'string',
              description: 'Event to trigger on: created, updated, deleted, started, ended, joined, left (default: created)',
            },
            filter: {
              type: 'string',
              description: 'Optional filter expression (e.g. roomId=Y2lzY28... to scope to a specific room)',
            },
            secret: {
              type: 'string',
              description: 'Secret string used to generate HMAC-SHA1 signature for webhook payload verification',
            },
          },
          required: ['name', 'target_url', 'resource', 'event'],
        },
      },
      {
        name: 'delete_webhook',
        description: 'Delete a Webex webhook by webhook ID to stop receiving event notifications',
        inputSchema: {
          type: 'object',
          properties: {
            webhook_id: {
              type: 'string',
              description: 'Webex webhook ID to delete',
            },
          },
          required: ['webhook_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_rooms':
          return this.listRooms(args);
        case 'get_room':
          return this.getRoom(args);
        case 'create_room':
          return this.createRoom(args);
        case 'update_room':
          return this.updateRoom(args);
        case 'delete_room':
          return this.deleteRoom(args);
        case 'list_messages':
          return this.listMessages(args);
        case 'get_message':
          return this.getMessage(args);
        case 'send_message':
          return this.sendMessage(args);
        case 'delete_message':
          return this.deleteMessage(args);
        case 'list_memberships':
          return this.listMemberships(args);
        case 'create_membership':
          return this.createMembership(args);
        case 'delete_membership':
          return this.deleteMembership(args);
        case 'list_meetings':
          return this.listMeetings(args);
        case 'get_meeting':
          return this.getMeeting(args);
        case 'create_meeting':
          return this.createMeeting(args);
        case 'delete_meeting':
          return this.deleteMeeting(args);
        case 'get_me':
          return this.getMe();
        case 'list_people':
          return this.listPeople(args);
        case 'get_person':
          return this.getPerson(args);
        case 'list_webhooks':
          return this.listWebhooks(args);
        case 'create_webhook':
          return this.createWebhook(args);
        case 'delete_webhook':
          return this.deleteWebhook(args);
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
      'Authorization': `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
  }

  private async webexGet(path: string, params?: Record<string, string>): Promise<ToolResult> {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}${qs}`, { headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async webexPost(path: string, body: unknown): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async webexPut(path: string, body: unknown): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'PUT',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async webexDelete(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, { method: 'DELETE', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: JSON.stringify({ status: 'deleted' }) }], isError: false };
  }

  private async listRooms(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = { max: String((args.max as number) || 100) };
    if (args.type) params.type = args.type as string;
    if (args.team_id) params.teamId = args.team_id as string;
    if (args.sort_by) params.sortBy = args.sort_by as string;
    return this.webexGet('/rooms', params);
  }

  private async getRoom(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.room_id) return { content: [{ type: 'text', text: 'room_id is required' }], isError: true };
    return this.webexGet(`/rooms/${encodeURIComponent(args.room_id as string)}`);
  }

  private async createRoom(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.title) return { content: [{ type: 'text', text: 'title is required' }], isError: true };
    const body: Record<string, unknown> = { title: args.title };
    if (args.team_id) body.teamId = args.team_id;
    return this.webexPost('/rooms', body);
  }

  private async updateRoom(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.room_id || !args.title) return { content: [{ type: 'text', text: 'room_id and title are required' }], isError: true };
    return this.webexPut(`/rooms/${encodeURIComponent(args.room_id as string)}`, { title: args.title });
  }

  private async deleteRoom(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.room_id) return { content: [{ type: 'text', text: 'room_id is required' }], isError: true };
    return this.webexDelete(`/rooms/${encodeURIComponent(args.room_id as string)}`);
  }

  private async listMessages(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.room_id) return { content: [{ type: 'text', text: 'room_id is required' }], isError: true };
    const params: Record<string, string> = {
      roomId: args.room_id as string,
      max: String((args.max as number) || 50),
    };
    if (args.before) params.before = args.before as string;
    if (args.before_message) params.beforeMessage = args.before_message as string;
    if (args.mentioned_people) params.mentionedPeople = args.mentioned_people as string;
    return this.webexGet('/messages', params);
  }

  private async getMessage(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.message_id) return { content: [{ type: 'text', text: 'message_id is required' }], isError: true };
    return this.webexGet(`/messages/${encodeURIComponent(args.message_id as string)}`);
  }

  private async sendMessage(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.room_id && !args.to_person_email) return { content: [{ type: 'text', text: 'Either room_id or to_person_email is required' }], isError: true };
    if (!args.text && !args.markdown) return { content: [{ type: 'text', text: 'Either text or markdown is required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.room_id) body.roomId = args.room_id;
    if (args.to_person_email) body.toPersonEmail = args.to_person_email;
    if (args.text) body.text = args.text;
    if (args.markdown) body.markdown = args.markdown;
    if (args.parent_id) body.parentId = args.parent_id;
    return this.webexPost('/messages', body);
  }

  private async deleteMessage(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.message_id) return { content: [{ type: 'text', text: 'message_id is required' }], isError: true };
    return this.webexDelete(`/messages/${encodeURIComponent(args.message_id as string)}`);
  }

  private async listMemberships(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.room_id) return { content: [{ type: 'text', text: 'room_id is required' }], isError: true };
    const params: Record<string, string> = {
      roomId: args.room_id as string,
      max: String((args.max as number) || 100),
    };
    if (args.person_email) params.personEmail = args.person_email as string;
    return this.webexGet('/memberships', params);
  }

  private async createMembership(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.room_id || !args.person_email) return { content: [{ type: 'text', text: 'room_id and person_email are required' }], isError: true };
    const body: Record<string, unknown> = { roomId: args.room_id, personEmail: args.person_email };
    if (typeof args.is_moderator === 'boolean') body.isModerator = args.is_moderator;
    return this.webexPost('/memberships', body);
  }

  private async deleteMembership(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.membership_id) return { content: [{ type: 'text', text: 'membership_id is required' }], isError: true };
    return this.webexDelete(`/memberships/${encodeURIComponent(args.membership_id as string)}`);
  }

  private async listMeetings(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      meetingType: (args.meeting_type as string) || 'scheduledMeeting',
      max: String((args.max as number) || 10),
    };
    if (args.state) params.state = args.state as string;
    if (args.from) params.from = args.from as string;
    if (args.to) params.to = args.to as string;
    return this.webexGet('/meetings', params);
  }

  private async getMeeting(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.meeting_id) return { content: [{ type: 'text', text: 'meeting_id is required' }], isError: true };
    return this.webexGet(`/meetings/${encodeURIComponent(args.meeting_id as string)}`);
  }

  private async createMeeting(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.title || !args.start || !args.end) return { content: [{ type: 'text', text: 'title, start, and end are required' }], isError: true };
    const body: Record<string, unknown> = { title: args.title, start: args.start, end: args.end };
    if (args.agenda) body.agenda = args.agenda;
    if (args.password) body.password = args.password;
    if (typeof args.enabled_auto_record_meeting === 'boolean') body.enabledAutoRecordMeeting = args.enabled_auto_record_meeting;
    return this.webexPost('/meetings', body);
  }

  private async deleteMeeting(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.meeting_id) return { content: [{ type: 'text', text: 'meeting_id is required' }], isError: true };
    return this.webexDelete(`/meetings/${encodeURIComponent(args.meeting_id as string)}`);
  }

  private async getMe(): Promise<ToolResult> {
    return this.webexGet('/people/me');
  }

  private async listPeople(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = { max: String((args.max as number) || 10) };
    if (args.email) params.email = args.email as string;
    if (args.display_name) params.displayName = args.display_name as string;
    return this.webexGet('/people', params);
  }

  private async getPerson(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.person_id) return { content: [{ type: 'text', text: 'person_id is required' }], isError: true };
    return this.webexGet(`/people/${encodeURIComponent(args.person_id as string)}`);
  }

  private async listWebhooks(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = { max: String((args.max as number) || 100) };
    return this.webexGet('/webhooks', params);
  }

  private async createWebhook(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name || !args.target_url || !args.resource || !args.event) {
      return { content: [{ type: 'text', text: 'name, target_url, resource, and event are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      name: args.name,
      targetUrl: args.target_url,
      resource: args.resource,
      event: args.event,
    };
    if (args.filter) body.filter = args.filter;
    if (args.secret) body.secret = args.secret;
    return this.webexPost('/webhooks', body);
  }

  private async deleteWebhook(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.webhook_id) return { content: [{ type: 'text', text: 'webhook_id is required' }], isError: true };
    return this.webexDelete(`/webhooks/${encodeURIComponent(args.webhook_id as string)}`);
  }
}

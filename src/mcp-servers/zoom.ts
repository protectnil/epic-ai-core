/**
 * Zoom MCP Server
 * Zoom REST API v2 adapter for managing meetings and recordings
 *
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */
import { ToolDefinition, ToolResult } from './types.js';

interface ZoomConfig {
  accessToken: string;
}

export class ZoomMCPServer {
  private readonly baseUrl = 'https://api.zoom.us/v2';
  private readonly headers: Record<string, string>;

  constructor(config: ZoomConfig) {
    this.headers = {
      Authorization: `Bearer ${config.accessToken}`,
      'Content-Type': 'application/json',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_meetings',
        description: 'List scheduled Zoom meetings for a user',
        inputSchema: {
          type: 'object',
          properties: {
            userId: {
              type: 'string',
              description: 'User ID or email address (default: "me")',
            },
            type: {
              type: 'string',
              description: 'Meeting type: scheduled, live, upcoming, upcoming_meetings, previous_meetings (default: scheduled)',
            },
            pageSize: {
              type: 'number',
              description: 'Number of meetings per page (default: 30, max: 300)',
            },
            nextPageToken: {
              type: 'string',
              description: 'Token for the next page of results',
            },
          },
        },
      },
      {
        name: 'create_meeting',
        description: 'Create a new Zoom meeting',
        inputSchema: {
          type: 'object',
          properties: {
            userId: {
              type: 'string',
              description: 'User ID or email address (default: "me")',
            },
            topic: {
              type: 'string',
              description: 'Meeting topic/title',
            },
            type: {
              type: 'number',
              description: 'Meeting type: 1=instant, 2=scheduled, 3=recurring_no_time, 8=recurring_with_time (default: 2)',
            },
            startTime: {
              type: 'string',
              description: 'Start time in UTC format (yyyy-MM-ddTHH:mm:ssZ)',
            },
            duration: {
              type: 'number',
              description: 'Meeting duration in minutes',
            },
            agenda: {
              type: 'string',
              description: 'Meeting agenda/description',
            },
            password: {
              type: 'string',
              description: 'Meeting passcode',
            },
          },
          required: ['topic'],
        },
      },
      {
        name: 'get_meeting',
        description: 'Get details of a specific Zoom meeting',
        inputSchema: {
          type: 'object',
          properties: {
            meetingId: {
              type: 'string',
              description: 'The Zoom meeting ID',
            },
          },
          required: ['meetingId'],
        },
      },
      {
        name: 'list_recordings',
        description: 'List cloud recordings for a user',
        inputSchema: {
          type: 'object',
          properties: {
            userId: {
              type: 'string',
              description: 'User ID or email address (default: "me")',
            },
            from: {
              type: 'string',
              description: 'Start date (yyyy-MM-dd)',
            },
            to: {
              type: 'string',
              description: 'End date (yyyy-MM-dd)',
            },
            pageSize: {
              type: 'number',
              description: 'Number of recordings per page (default: 30)',
            },
            nextPageToken: {
              type: 'string',
              description: 'Token for the next page of results',
            },
          },
        },
      },
      {
        name: 'get_meeting_participants',
        description: 'Get the list of participants for a past Zoom meeting',
        inputSchema: {
          type: 'object',
          properties: {
            meetingId: {
              type: 'string',
              description: 'The past meeting UUID or ID',
            },
            pageSize: {
              type: 'number',
              description: 'Number of participants per page (default: 30)',
            },
            nextPageToken: {
              type: 'string',
              description: 'Token for the next page of results',
            },
          },
          required: ['meetingId'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_meetings':
          return await this.listMeetings(
            args.userId as string | undefined,
            args.type as string | undefined,
            args.pageSize as number | undefined,
            args.nextPageToken as string | undefined
          );
        case 'create_meeting':
          return await this.createMeeting(
            args.userId as string | undefined,
            args.topic as string,
            args.type as number | undefined,
            args.startTime as string | undefined,
            args.duration as number | undefined,
            args.agenda as string | undefined,
            args.password as string | undefined
          );
        case 'get_meeting':
          return await this.getMeeting(args.meetingId as string);
        case 'list_recordings':
          return await this.listRecordings(
            args.userId as string | undefined,
            args.from as string | undefined,
            args.to as string | undefined,
            args.pageSize as number | undefined,
            args.nextPageToken as string | undefined
          );
        case 'get_meeting_participants':
          return await this.getMeetingParticipants(
            args.meetingId as string,
            args.pageSize as number | undefined,
            args.nextPageToken as string | undefined
          );
        default:
          return { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true };
      }
    } catch (error) {
      return {
        content: [{ type: 'text', text: error instanceof Error ? error.message : String(error) }],
        isError: true,
      };
    }
  }

  private async listMeetings(
    userId?: string,
    type?: string,
    pageSize?: number,
    nextPageToken?: string
  ): Promise<ToolResult> {
    const user = userId ?? 'me';
    const params = new URLSearchParams();
    params.append('type', type ?? 'scheduled');
    params.append('page_size', String(pageSize ?? 30));
    if (nextPageToken) params.append('next_page_token', nextPageToken);

    const response = await fetch(
      `${this.baseUrl}/users/${user}/meetings?${params}`,
      { method: 'GET', headers: this.headers }
    );
    if (!response.ok) throw new Error(`Zoom API error: ${response.status} ${response.statusText}`);
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Zoom returned non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async createMeeting(
    userId?: string,
    topic?: string,
    type?: number,
    startTime?: string,
    duration?: number,
    agenda?: string,
    password?: string
  ): Promise<ToolResult> {
    const user = userId ?? 'me';
    const body: Record<string, unknown> = {
      topic,
      type: type ?? 2,
    };
    if (startTime) body.start_time = startTime;
    if (duration) body.duration = duration;
    if (agenda) body.agenda = agenda;
    if (password) body.password = password;

    const response = await fetch(
      `${this.baseUrl}/users/${user}/meetings`,
      { method: 'POST', headers: this.headers, body: JSON.stringify(body) }
    );
    if (!response.ok) throw new Error(`Zoom API error: ${response.status} ${response.statusText}`);
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Zoom returned non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async getMeeting(meetingId: string): Promise<ToolResult> {
    const response = await fetch(
      `${this.baseUrl}/meetings/${meetingId}`,
      { method: 'GET', headers: this.headers }
    );
    if (!response.ok) throw new Error(`Zoom API error: ${response.status} ${response.statusText}`);
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Zoom returned non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async listRecordings(
    userId?: string,
    from?: string,
    to?: string,
    pageSize?: number,
    nextPageToken?: string
  ): Promise<ToolResult> {
    const user = userId ?? 'me';
    const params = new URLSearchParams();
    params.append('page_size', String(pageSize ?? 30));
    if (from) params.append('from', from);
    if (to) params.append('to', to);
    if (nextPageToken) params.append('next_page_token', nextPageToken);

    const response = await fetch(
      `${this.baseUrl}/users/${user}/recordings?${params}`,
      { method: 'GET', headers: this.headers }
    );
    if (!response.ok) throw new Error(`Zoom API error: ${response.status} ${response.statusText}`);
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Zoom returned non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async getMeetingParticipants(
    meetingId: string,
    pageSize?: number,
    nextPageToken?: string
  ): Promise<ToolResult> {
    const params = new URLSearchParams();
    params.append('page_size', String(pageSize ?? 30));
    if (nextPageToken) params.append('next_page_token', nextPageToken);

    const response = await fetch(
      `${this.baseUrl}/past_meetings/${meetingId}/participants?${params}`,
      { method: 'GET', headers: this.headers }
    );
    if (!response.ok) throw new Error(`Zoom API error: ${response.status} ${response.statusText}`);
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Zoom returned non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }
}

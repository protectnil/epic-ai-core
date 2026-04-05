/**
 * Blackboard Learn MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Blackboard Learn REST API (3900.0.0+)
// Base URL: institution-specific (e.g. https://your-institution.blackboard.com)
// Auth: OAuth2 Bearer — POST /learn/api/public/v1/oauth2/token
//       with Basic auth (application_key:application_secret) and grant_type=client_credentials
// Docs: https://developer.blackboard.com/portal/displayApi
// Rate limits: varies by institution and API tier

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface BlackboardConfig {
  applicationKey: string;
  applicationSecret: string;
  baseUrl: string;
}

export class BlackboardMCPServer extends MCPAdapterBase {
  private readonly applicationKey: string;
  private readonly applicationSecret: string;
  private readonly baseUrl: string;
  private bearerToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(config: BlackboardConfig) {
    super();
    this.applicationKey = config.applicationKey;
    this.applicationSecret = config.applicationSecret;
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
  }

  static catalog() {
    return {
      name: 'blackboard',
      displayName: 'Blackboard Learn',
      version: '1.0.0',
      category: 'education',
      keywords: ['blackboard', 'learn', 'lms', 'education', 'courses', 'grades', 'assignments', 'elearning', 'canvas', 'university', 'classroom'],
      toolNames: [
        'list_courses', 'get_course', 'list_course_users', 'get_user',
        'list_assignments', 'get_assignment', 'list_grades', 'update_grade',
        'list_announcements', 'create_announcement', 'list_content',
        'get_content_item', 'list_calendar_items', 'get_course_membership',
      ],
      description: 'Blackboard Learn LMS: manage courses, users, assignments, grades, announcements, content, and calendar items across your institution.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_courses',
        description: 'List courses in the Blackboard Learn system, optionally filtered by availability or search term',
        inputSchema: {
          type: 'object',
          properties: {
            search: {
              type: 'string',
              description: 'Search term to filter courses by name or course ID',
            },
            availability: {
              type: 'string',
              description: 'Filter by availability: Yes (available), No (unavailable), Disabled, PartiallyVisible (default: all)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of courses to return (default: 100)',
            },
            offset: {
              type: 'number',
              description: 'Paging offset for large result sets (default: 0)',
            },
          },
        },
      },
      {
        name: 'get_course',
        description: 'Get detailed information about a specific Blackboard course by its course ID',
        inputSchema: {
          type: 'object',
          properties: {
            course_id: {
              type: 'string',
              description: 'Blackboard course ID (e.g. _12345_1) or external course ID prefixed with externalId: (e.g. externalId:CS101)',
            },
          },
          required: ['course_id'],
        },
      },
      {
        name: 'list_course_users',
        description: 'List all users enrolled in a specific Blackboard course with their roles and enrollment status',
        inputSchema: {
          type: 'object',
          properties: {
            course_id: {
              type: 'string',
              description: 'Blackboard course ID',
            },
            role: {
              type: 'string',
              description: 'Filter by course role: Student, Instructor, TeachingAssistant, CourseBuilder, Grader, GuestInstructor (optional)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of users to return (default: 100)',
            },
            offset: {
              type: 'number',
              description: 'Paging offset (default: 0)',
            },
          },
          required: ['course_id'],
        },
      },
      {
        name: 'get_user',
        description: 'Get detailed information about a specific Blackboard user by their user ID',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: {
              type: 'string',
              description: 'Blackboard user ID (e.g. _67890_1) or userName prefixed with userName: (e.g. userName:jdoe)',
            },
          },
          required: ['user_id'],
        },
      },
      {
        name: 'list_assignments',
        description: 'List gradebook columns (assignments) for a course, including due dates and point values',
        inputSchema: {
          type: 'object',
          properties: {
            course_id: {
              type: 'string',
              description: 'Blackboard course ID',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of assignments to return (default: 100)',
            },
            offset: {
              type: 'number',
              description: 'Paging offset (default: 0)',
            },
          },
          required: ['course_id'],
        },
      },
      {
        name: 'get_assignment',
        description: 'Get detailed information about a specific gradebook column (assignment) in a course',
        inputSchema: {
          type: 'object',
          properties: {
            course_id: {
              type: 'string',
              description: 'Blackboard course ID',
            },
            column_id: {
              type: 'string',
              description: 'Gradebook column ID for the assignment',
            },
          },
          required: ['course_id', 'column_id'],
        },
      },
      {
        name: 'list_grades',
        description: 'List all grades for a gradebook column (assignment) in a course across all enrolled students',
        inputSchema: {
          type: 'object',
          properties: {
            course_id: {
              type: 'string',
              description: 'Blackboard course ID',
            },
            column_id: {
              type: 'string',
              description: 'Gradebook column ID',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of grade records to return (default: 100)',
            },
            offset: {
              type: 'number',
              description: 'Paging offset (default: 0)',
            },
          },
          required: ['course_id', 'column_id'],
        },
      },
      {
        name: 'update_grade',
        description: 'Update or set a grade for a specific student on a gradebook column in a course',
        inputSchema: {
          type: 'object',
          properties: {
            course_id: {
              type: 'string',
              description: 'Blackboard course ID',
            },
            column_id: {
              type: 'string',
              description: 'Gradebook column ID for the assignment',
            },
            user_id: {
              type: 'string',
              description: 'Blackboard user ID of the student',
            },
            score: {
              type: 'number',
              description: 'Numeric score to assign',
            },
            text: {
              type: 'string',
              description: 'Text grade or override text (optional)',
            },
            notes: {
              type: 'string',
              description: 'Instructor notes for the grade entry (optional)',
            },
            feedback: {
              type: 'string',
              description: 'Feedback text visible to the student (optional)',
            },
          },
          required: ['course_id', 'column_id', 'user_id'],
        },
      },
      {
        name: 'list_announcements',
        description: 'List announcements posted in a specific Blackboard course',
        inputSchema: {
          type: 'object',
          properties: {
            course_id: {
              type: 'string',
              description: 'Blackboard course ID',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of announcements to return (default: 100)',
            },
            offset: {
              type: 'number',
              description: 'Paging offset (default: 0)',
            },
          },
          required: ['course_id'],
        },
      },
      {
        name: 'create_announcement',
        description: 'Create a new announcement in a Blackboard course, visible to all enrolled users',
        inputSchema: {
          type: 'object',
          properties: {
            course_id: {
              type: 'string',
              description: 'Blackboard course ID',
            },
            title: {
              type: 'string',
              description: 'Announcement title',
            },
            body: {
              type: 'string',
              description: 'Announcement body text (supports HTML)',
            },
            draft: {
              type: 'boolean',
              description: 'If true, save as draft rather than publishing immediately (default: false)',
            },
            show_reorder_button: {
              type: 'boolean',
              description: 'Show the reorder button on the announcement (default: false)',
            },
          },
          required: ['course_id', 'title', 'body'],
        },
      },
      {
        name: 'list_content',
        description: 'List content items (folders, documents, links) within a course or a specific content folder',
        inputSchema: {
          type: 'object',
          properties: {
            course_id: {
              type: 'string',
              description: 'Blackboard course ID',
            },
            content_id: {
              type: 'string',
              description: 'Parent content folder ID to list children of (omit for top-level course content)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of content items to return (default: 100)',
            },
            offset: {
              type: 'number',
              description: 'Paging offset (default: 0)',
            },
          },
          required: ['course_id'],
        },
      },
      {
        name: 'get_content_item',
        description: 'Get detailed information about a specific content item in a Blackboard course',
        inputSchema: {
          type: 'object',
          properties: {
            course_id: {
              type: 'string',
              description: 'Blackboard course ID',
            },
            content_id: {
              type: 'string',
              description: 'Content item ID',
            },
          },
          required: ['course_id', 'content_id'],
        },
      },
      {
        name: 'list_calendar_items',
        description: 'List calendar items for a course within an optional date range',
        inputSchema: {
          type: 'object',
          properties: {
            course_id: {
              type: 'string',
              description: 'Blackboard course ID',
            },
            since: {
              type: 'string',
              description: 'Start date filter in ISO 8601 format (e.g. 2026-01-01T00:00:00Z)',
            },
            until: {
              type: 'string',
              description: 'End date filter in ISO 8601 format (e.g. 2026-12-31T23:59:59Z)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of calendar items to return (default: 100)',
            },
          },
          required: ['course_id'],
        },
      },
      {
        name: 'get_course_membership',
        description: 'Get the enrollment record for a specific user in a specific course, including their role and status',
        inputSchema: {
          type: 'object',
          properties: {
            course_id: {
              type: 'string',
              description: 'Blackboard course ID',
            },
            user_id: {
              type: 'string',
              description: 'Blackboard user ID',
            },
          },
          required: ['course_id', 'user_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_courses':
          return this.listCourses(args);
        case 'get_course':
          return this.getCourse(args);
        case 'list_course_users':
          return this.listCourseUsers(args);
        case 'get_user':
          return this.getUser(args);
        case 'list_assignments':
          return this.listAssignments(args);
        case 'get_assignment':
          return this.getAssignment(args);
        case 'list_grades':
          return this.listGrades(args);
        case 'update_grade':
          return this.updateGrade(args);
        case 'list_announcements':
          return this.listAnnouncements(args);
        case 'create_announcement':
          return this.createAnnouncement(args);
        case 'list_content':
          return this.listContent(args);
        case 'get_content_item':
          return this.getContentItem(args);
        case 'list_calendar_items':
          return this.listCalendarItems(args);
        case 'get_course_membership':
          return this.getCourseMembership(args);
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
    const response = await this.fetchWithRetry(`${this.baseUrl}/learn/api/public/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${this.applicationKey}:${this.applicationSecret}`)}`,
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

  private async authHeaders(): Promise<Record<string, string>> {
    const token = await this.getOrRefreshToken();
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  private async apiGet(path: string): Promise<ToolResult> {
    const headers = await this.authHeaders();
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, { headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apiPost(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const headers = await this.authHeaders();
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apiPatch(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const headers = await this.authHeaders();
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private buildPagingParams(args: Record<string, unknown>): URLSearchParams {
    const params = new URLSearchParams();
    if (args.limit) params.set('limit', String(args.limit));
    if (args.offset) params.set('offset', String(args.offset));
    return params;
  }

  private async listCourses(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.buildPagingParams(args);
    if (args.search) params.set('search', args.search as string);
    if (args.availability) params.set('availability.available', args.availability as string);
    return this.apiGet(`/learn/api/public/v3/courses?${params.toString()}`);
  }

  private async getCourse(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.course_id) return { content: [{ type: 'text', text: 'course_id is required' }], isError: true };
    return this.apiGet(`/learn/api/public/v3/courses/${encodeURIComponent(args.course_id as string)}`);
  }

  private async listCourseUsers(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.course_id) return { content: [{ type: 'text', text: 'course_id is required' }], isError: true };
    const params = this.buildPagingParams(args);
    if (args.role) params.set('role', args.role as string);
    return this.apiGet(`/learn/api/public/v1/courses/${encodeURIComponent(args.course_id as string)}/users?${params.toString()}`);
  }

  private async getUser(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.user_id) return { content: [{ type: 'text', text: 'user_id is required' }], isError: true };
    return this.apiGet(`/learn/api/public/v1/users/${encodeURIComponent(args.user_id as string)}`);
  }

  private async listAssignments(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.course_id) return { content: [{ type: 'text', text: 'course_id is required' }], isError: true };
    const params = this.buildPagingParams(args);
    return this.apiGet(`/learn/api/public/v2/courses/${encodeURIComponent(args.course_id as string)}/gradebook/columns?${params.toString()}`);
  }

  private async getAssignment(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.course_id || !args.column_id) {
      return { content: [{ type: 'text', text: 'course_id and column_id are required' }], isError: true };
    }
    return this.apiGet(`/learn/api/public/v2/courses/${encodeURIComponent(args.course_id as string)}/gradebook/columns/${encodeURIComponent(args.column_id as string)}`);
  }

  private async listGrades(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.course_id || !args.column_id) {
      return { content: [{ type: 'text', text: 'course_id and column_id are required' }], isError: true };
    }
    const params = this.buildPagingParams(args);
    return this.apiGet(`/learn/api/public/v2/courses/${encodeURIComponent(args.course_id as string)}/gradebook/columns/${encodeURIComponent(args.column_id as string)}/users?${params.toString()}`);
  }

  private async updateGrade(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.course_id || !args.column_id || !args.user_id) {
      return { content: [{ type: 'text', text: 'course_id, column_id, and user_id are required' }], isError: true };
    }
    const body: Record<string, unknown> = {};
    if (args.score !== undefined) body.score = args.score;
    if (args.text !== undefined) body.text = args.text;
    if (args.notes !== undefined) body.notes = args.notes;
    if (args.feedback !== undefined) body.feedback = args.feedback;
    return this.apiPatch(`/learn/api/public/v2/courses/${encodeURIComponent(args.course_id as string)}/gradebook/columns/${encodeURIComponent(args.column_id as string)}/users/${encodeURIComponent(args.user_id as string)}`, body);
  }

  private async listAnnouncements(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.course_id) return { content: [{ type: 'text', text: 'course_id is required' }], isError: true };
    const params = this.buildPagingParams(args);
    return this.apiGet(`/learn/api/public/v1/courses/${encodeURIComponent(args.course_id as string)}/announcements?${params.toString()}`);
  }

  private async createAnnouncement(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.course_id || !args.title || !args.body) {
      return { content: [{ type: 'text', text: 'course_id, title, and body are required' }], isError: true };
    }
    const payload: Record<string, unknown> = {
      title: args.title,
      body: args.body,
      draft: args.draft ?? false,
      showReorderButton: args.show_reorder_button ?? false,
    };
    return this.apiPost(`/learn/api/public/v1/courses/${encodeURIComponent(args.course_id as string)}/announcements`, payload);
  }

  private async listContent(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.course_id) return { content: [{ type: 'text', text: 'course_id is required' }], isError: true };
    const params = this.buildPagingParams(args);
    const basePath = args.content_id
      ? `/learn/api/public/v1/courses/${encodeURIComponent(args.course_id as string)}/contents/${encodeURIComponent(args.content_id as string)}/children`
      : `/learn/api/public/v1/courses/${encodeURIComponent(args.course_id as string)}/contents`;
    return this.apiGet(`${basePath}?${params.toString()}`);
  }

  private async getContentItem(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.course_id || !args.content_id) {
      return { content: [{ type: 'text', text: 'course_id and content_id are required' }], isError: true };
    }
    return this.apiGet(`/learn/api/public/v1/courses/${encodeURIComponent(args.course_id as string)}/contents/${encodeURIComponent(args.content_id as string)}`);
  }

  private async listCalendarItems(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.course_id) return { content: [{ type: 'text', text: 'course_id is required' }], isError: true };
    const params = new URLSearchParams({ courseId: args.course_id as string });
    if (args.since) params.set('since', args.since as string);
    if (args.until) params.set('until', args.until as string);
    if (args.limit) params.set('limit', String(args.limit));
    return this.apiGet(`/learn/api/public/v1/calendar/items?${params.toString()}`);
  }

  private async getCourseMembership(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.course_id || !args.user_id) {
      return { content: [{ type: 'text', text: 'course_id and user_id are required' }], isError: true };
    }
    return this.apiGet(`/learn/api/public/v1/courses/${encodeURIComponent(args.course_id as string)}/users/${encodeURIComponent(args.user_id as string)}`);
  }
}

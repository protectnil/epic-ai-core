/**
 * Canvas LMS MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28. Instructure does not publish an official MCP server.
// Community MCP servers exist but are NOT official (not published by Instructure/Canvas):
//   https://github.com/DMontgomery40/mcp-canvas-lms — v2.3.0, 54 tools, transport: stdio + streamable-HTTP,
//     last commit 2026-03-23, actively maintained. Community-authored, not vendor-official.
//   https://github.com/r-huijts/canvas-mcp — separate community project.
// Per protocol, "Official MCP" requires the vendor (Instructure) to publish it. Neither qualifies.
// Our adapter covers: 20 tools (courses, assignments, submissions, enrollments, modules, announcements, users, grades).
// Recommendation: use-rest-api — no official vendor MCP. Community MCPs documented above for reference.
//
// Base URL: https://{your-institution}.instructure.com/api/v1
//           (Canvas is self-hosted per institution; there is no single shared base URL)
// Auth: Bearer token — "Authorization: Bearer <access_token>"
//       Tokens are generated in Canvas user settings under "Approved Integrations".
//       OAuth2 is also supported for third-party apps (token endpoint: /login/oauth2/token).
// Docs: https://canvas.instructure.com/doc/api/
//       https://developerdocs.instructure.com/services/canvas
// Rate limits: 700 requests per 10 seconds per user token (by default; institution-configurable)

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface CanvasLMSConfig {
  accessToken: string;
  institutionDomain: string;
  baseUrl?: string;
}

export class CanvasLMSMCPServer extends MCPAdapterBase {
  private readonly accessToken: string;
  private readonly baseUrl: string;

  constructor(config: CanvasLMSConfig) {
    super();
    this.accessToken = config.accessToken;
    // Allow explicit baseUrl override; otherwise construct from institutionDomain
    this.baseUrl = config.baseUrl
      ?? `https://${config.institutionDomain}/api/v1`;
  }

  static catalog() {
    return {
      name: 'canvas-lms',
      displayName: 'Canvas LMS',
      version: '1.0.0',
      category: 'misc',
      keywords: [
        'canvas', 'instructure', 'lms', 'learning management', 'course', 'assignment',
        'grade', 'submission', 'enrollment', 'student', 'instructor', 'module',
        'quiz', 'announcement', 'syllabus', 'rubric', 'higher education', 'k12',
      ],
      toolNames: [
        'list_courses', 'get_course', 'list_assignments', 'get_assignment',
        'list_submissions', 'get_submission', 'grade_submission',
        'list_enrollments', 'enroll_user',
        'list_modules', 'get_module', 'list_module_items',
        'list_announcements', 'create_announcement',
        'list_users', 'get_user', 'get_user_profile',
        'list_grades', 'list_discussion_topics', 'list_pages',
      ],
      description: 'Canvas LMS: manage courses, assignments, submissions, enrollments, modules, announcements, users, and grades for higher ed and K-12 institutions.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_courses',
        description: 'List Canvas LMS courses for the authenticated user with optional enrollment type and state filters',
        inputSchema: {
          type: 'object',
          properties: {
            enrollment_type: {
              type: 'string',
              description: 'Filter by enrollment type: teacher, student, ta, observer, designer',
            },
            enrollment_state: {
              type: 'string',
              description: 'Filter by enrollment state: active, invited_or_pending, completed (default: active)',
            },
            per_page: {
              type: 'number',
              description: 'Number of courses per page (default: 10, max: 100)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            include: {
              type: 'string',
              description: 'Comma-separated extra fields: term, syllabus_body, total_scores, teachers',
            },
          },
        },
      },
      {
        name: 'get_course',
        description: 'Get detailed information for a specific Canvas LMS course by course ID',
        inputSchema: {
          type: 'object',
          properties: {
            course_id: {
              type: 'string',
              description: 'Canvas course ID (numeric, e.g. 123456)',
            },
            include: {
              type: 'string',
              description: 'Comma-separated extra fields: syllabus_body, term, total_scores, teachers, sections',
            },
          },
          required: ['course_id'],
        },
      },
      {
        name: 'list_assignments',
        description: 'List assignments for a Canvas LMS course with optional ordering and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            course_id: {
              type: 'string',
              description: 'Canvas course ID to list assignments for',
            },
            order_by: {
              type: 'string',
              description: 'Sort order: position (default), name, or due_at',
            },
            per_page: {
              type: 'number',
              description: 'Number of assignments per page (default: 10, max: 100)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
          },
          required: ['course_id'],
        },
      },
      {
        name: 'get_assignment',
        description: 'Get full details for a specific Canvas LMS assignment including due dates, points, and submission types',
        inputSchema: {
          type: 'object',
          properties: {
            course_id: {
              type: 'string',
              description: 'Canvas course ID',
            },
            assignment_id: {
              type: 'string',
              description: 'Canvas assignment ID',
            },
          },
          required: ['course_id', 'assignment_id'],
        },
      },
      {
        name: 'list_submissions',
        description: 'List all student submissions for a Canvas LMS assignment with optional grading status filter',
        inputSchema: {
          type: 'object',
          properties: {
            course_id: {
              type: 'string',
              description: 'Canvas course ID',
            },
            assignment_id: {
              type: 'string',
              description: 'Canvas assignment ID',
            },
            workflow_state: {
              type: 'string',
              description: 'Filter by state: submitted, unsubmitted, graded, pending_review (default: all)',
            },
            per_page: {
              type: 'number',
              description: 'Number of submissions per page (default: 10, max: 100)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
          },
          required: ['course_id', 'assignment_id'],
        },
      },
      {
        name: 'get_submission',
        description: 'Get a single student submission for a Canvas LMS assignment by course, assignment, and user ID',
        inputSchema: {
          type: 'object',
          properties: {
            course_id: {
              type: 'string',
              description: 'Canvas course ID',
            },
            assignment_id: {
              type: 'string',
              description: 'Canvas assignment ID',
            },
            user_id: {
              type: 'string',
              description: 'Canvas user ID of the student (use "self" for the authenticated user)',
            },
          },
          required: ['course_id', 'assignment_id', 'user_id'],
        },
      },
      {
        name: 'grade_submission',
        description: 'Set or update the grade and feedback comment for a student submission in Canvas LMS',
        inputSchema: {
          type: 'object',
          properties: {
            course_id: {
              type: 'string',
              description: 'Canvas course ID',
            },
            assignment_id: {
              type: 'string',
              description: 'Canvas assignment ID',
            },
            user_id: {
              type: 'string',
              description: 'Canvas user ID of the student',
            },
            posted_grade: {
              type: 'string',
              description: 'Grade to assign: numeric score (e.g. "85"), letter grade (e.g. "A"), or "pass"/"fail" for pass/fail assignments',
            },
            text_comment: {
              type: 'string',
              description: 'Feedback comment to leave on the submission',
            },
          },
          required: ['course_id', 'assignment_id', 'user_id'],
        },
      },
      {
        name: 'list_enrollments',
        description: 'List enrollments for a Canvas LMS course with optional type and state filters',
        inputSchema: {
          type: 'object',
          properties: {
            course_id: {
              type: 'string',
              description: 'Canvas course ID',
            },
            type: {
              type: 'string',
              description: 'Enrollment type filter: StudentEnrollment, TeacherEnrollment, TaEnrollment, ObserverEnrollment, DesignerEnrollment',
            },
            state: {
              type: 'string',
              description: 'Enrollment state filter: active, invited, inactive, rejected, completed (default: active)',
            },
            per_page: {
              type: 'number',
              description: 'Number of enrollments per page (default: 10, max: 100)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
          },
          required: ['course_id'],
        },
      },
      {
        name: 'enroll_user',
        description: 'Enroll a user in a Canvas LMS course with a specified role type',
        inputSchema: {
          type: 'object',
          properties: {
            course_id: {
              type: 'string',
              description: 'Canvas course ID to enroll the user in',
            },
            user_id: {
              type: 'string',
              description: 'Canvas user ID to enroll',
            },
            type: {
              type: 'string',
              description: 'Enrollment type: StudentEnrollment, TeacherEnrollment, TaEnrollment, ObserverEnrollment (default: StudentEnrollment)',
            },
            enrollment_state: {
              type: 'string',
              description: 'Enrollment state: active, invited (default: invited)',
            },
          },
          required: ['course_id', 'user_id'],
        },
      },
      {
        name: 'list_modules',
        description: 'List modules (course content units) for a Canvas LMS course with completion status',
        inputSchema: {
          type: 'object',
          properties: {
            course_id: {
              type: 'string',
              description: 'Canvas course ID',
            },
            per_page: {
              type: 'number',
              description: 'Number of modules per page (default: 10, max: 100)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            include: {
              type: 'string',
              description: 'Extra fields: items (include module items inline)',
            },
          },
          required: ['course_id'],
        },
      },
      {
        name: 'get_module',
        description: 'Get details for a specific Canvas LMS module by course and module ID',
        inputSchema: {
          type: 'object',
          properties: {
            course_id: {
              type: 'string',
              description: 'Canvas course ID',
            },
            module_id: {
              type: 'string',
              description: 'Canvas module ID',
            },
          },
          required: ['course_id', 'module_id'],
        },
      },
      {
        name: 'list_module_items',
        description: 'List all items (pages, assignments, quizzes, files) within a Canvas LMS module',
        inputSchema: {
          type: 'object',
          properties: {
            course_id: {
              type: 'string',
              description: 'Canvas course ID',
            },
            module_id: {
              type: 'string',
              description: 'Canvas module ID',
            },
            per_page: {
              type: 'number',
              description: 'Number of items per page (default: 10, max: 100)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
          },
          required: ['course_id', 'module_id'],
        },
      },
      {
        name: 'list_announcements',
        description: 'List announcements for one or more Canvas LMS courses with optional date range filter',
        inputSchema: {
          type: 'object',
          properties: {
            context_codes: {
              type: 'string',
              description: 'Comma-separated course context codes (e.g. course_123,course_456)',
            },
            start_date: {
              type: 'string',
              description: 'Only return announcements posted on or after this date (ISO 8601: YYYY-MM-DD)',
            },
            end_date: {
              type: 'string',
              description: 'Only return announcements posted on or before this date (ISO 8601: YYYY-MM-DD)',
            },
            per_page: {
              type: 'number',
              description: 'Number of announcements per page (default: 10, max: 100)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
          },
          required: ['context_codes'],
        },
      },
      {
        name: 'create_announcement',
        description: 'Create a new announcement (discussion topic) in a Canvas LMS course',
        inputSchema: {
          type: 'object',
          properties: {
            course_id: {
              type: 'string',
              description: 'Canvas course ID to post the announcement in',
            },
            title: {
              type: 'string',
              description: 'Announcement title',
            },
            message: {
              type: 'string',
              description: 'Announcement body text (HTML supported)',
            },
            delayed_post_at: {
              type: 'string',
              description: 'Schedule posting for a future date and time (ISO 8601: YYYY-MM-DDTHH:mm:ssZ)',
            },
          },
          required: ['course_id', 'title', 'message'],
        },
      },
      {
        name: 'list_users',
        description: 'List users in a Canvas LMS course or account with optional search and enrollment type filter',
        inputSchema: {
          type: 'object',
          properties: {
            course_id: {
              type: 'string',
              description: 'Canvas course ID to list users in (scoped to course)',
            },
            search_term: {
              type: 'string',
              description: 'Search users by name, email, or login ID',
            },
            enrollment_type: {
              type: 'string',
              description: 'Filter by enrollment type: teacher, student, ta, observer, designer',
            },
            per_page: {
              type: 'number',
              description: 'Number of users per page (default: 10, max: 100)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
          },
          required: ['course_id'],
        },
      },
      {
        name: 'get_user',
        description: 'Get account and enrollment information for a Canvas LMS user by user ID',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: {
              type: 'string',
              description: 'Canvas user ID (use "self" for the authenticated user)',
            },
          },
          required: ['user_id'],
        },
      },
      {
        name: 'get_user_profile',
        description: 'Get the public profile for a Canvas LMS user including bio, avatar, and pronouns',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: {
              type: 'string',
              description: 'Canvas user ID (use "self" for the authenticated user)',
            },
          },
          required: ['user_id'],
        },
      },
      {
        name: 'list_grades',
        description: 'List grade summaries for all students in a Canvas LMS course including current and final scores',
        inputSchema: {
          type: 'object',
          properties: {
            course_id: {
              type: 'string',
              description: 'Canvas course ID',
            },
            per_page: {
              type: 'number',
              description: 'Number of grade records per page (default: 10, max: 100)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
          },
          required: ['course_id'],
        },
      },
      {
        name: 'list_discussion_topics',
        description: 'List discussion topics (not announcements) for a Canvas LMS course',
        inputSchema: {
          type: 'object',
          properties: {
            course_id: {
              type: 'string',
              description: 'Canvas course ID',
            },
            order_by: {
              type: 'string',
              description: 'Sort order: position, recent_activity (default: position)',
            },
            scope: {
              type: 'string',
              description: 'Filter scope: locked, unlocked, pinned, unpinned',
            },
            per_page: {
              type: 'number',
              description: 'Number of topics per page (default: 10, max: 100)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
          },
          required: ['course_id'],
        },
      },
      {
        name: 'list_pages',
        description: 'List wiki pages in a Canvas LMS course with optional search and sort order',
        inputSchema: {
          type: 'object',
          properties: {
            course_id: {
              type: 'string',
              description: 'Canvas course ID',
            },
            sort: {
              type: 'string',
              description: 'Sort field: title, created_at, updated_at (default: title)',
            },
            order: {
              type: 'string',
              description: 'Sort direction: asc or desc (default: asc)',
            },
            search_term: {
              type: 'string',
              description: 'Search pages by title',
            },
            per_page: {
              type: 'number',
              description: 'Number of pages per page (default: 10, max: 100)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
          },
          required: ['course_id'],
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
        case 'list_assignments':
          return this.listAssignments(args);
        case 'get_assignment':
          return this.getAssignment(args);
        case 'list_submissions':
          return this.listSubmissions(args);
        case 'get_submission':
          return this.getSubmission(args);
        case 'grade_submission':
          return this.gradeSubmission(args);
        case 'list_enrollments':
          return this.listEnrollments(args);
        case 'enroll_user':
          return this.enrollUser(args);
        case 'list_modules':
          return this.listModules(args);
        case 'get_module':
          return this.getModule(args);
        case 'list_module_items':
          return this.listModuleItems(args);
        case 'list_announcements':
          return this.listAnnouncements(args);
        case 'create_announcement':
          return this.createAnnouncement(args);
        case 'list_users':
          return this.listUsers(args);
        case 'get_user':
          return this.getUser(args);
        case 'get_user_profile':
          return this.getUserProfile(args);
        case 'list_grades':
          return this.listGrades(args);
        case 'list_discussion_topics':
          return this.listDiscussionTopics(args);
        case 'list_pages':
          return this.listPages(args);
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
      Authorization: `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
    };
  }

  private buildParams(args: Record<string, unknown>, fields: string[]): Record<string, string> {
    const params: Record<string, string> = {};
    for (const field of fields) {
      if (args[field] !== undefined && args[field] !== null) {
        params[field] = String(args[field]);
      }
    }
    return params;
  }

  private async canvasGet(path: string, params?: Record<string, string>): Promise<ToolResult> {
    const qs = params && Object.keys(params).length > 0 ? '?' + new URLSearchParams(params).toString() : '';
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}${qs}`, { method: 'GET', headers: this.headers });
    if (!response.ok) {
      const body = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `API error: ${response.status} — ${body}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async canvasPost(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const errBody = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `API error: ${response.status} — ${errBody}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async canvasPut(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'PUT',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const errBody = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `API error: ${response.status} — ${errBody}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listCourses(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.buildParams(args, ['enrollment_type', 'enrollment_state', 'per_page', 'page', 'include']);
    if (!params.per_page) params.per_page = '10';
    return this.canvasGet('/courses', params);
  }

  private async getCourse(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.course_id) return { content: [{ type: 'text', text: 'course_id is required' }], isError: true };
    const params = this.buildParams(args, ['include']);
    return this.canvasGet(`/courses/${encodeURIComponent(args.course_id as string)}`, params);
  }

  private async listAssignments(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.course_id) return { content: [{ type: 'text', text: 'course_id is required' }], isError: true };
    const params = this.buildParams(args, ['order_by', 'per_page', 'page']);
    if (!params.per_page) params.per_page = '10';
    return this.canvasGet(`/courses/${encodeURIComponent(args.course_id as string)}/assignments`, params);
  }

  private async getAssignment(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.course_id || !args.assignment_id) return { content: [{ type: 'text', text: 'course_id and assignment_id are required' }], isError: true };
    return this.canvasGet(`/courses/${encodeURIComponent(args.course_id as string)}/assignments/${encodeURIComponent(args.assignment_id as string)}`);
  }

  private async listSubmissions(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.course_id || !args.assignment_id) return { content: [{ type: 'text', text: 'course_id and assignment_id are required' }], isError: true };
    const params = this.buildParams(args, ['workflow_state', 'per_page', 'page']);
    if (!params.per_page) params.per_page = '10';
    return this.canvasGet(`/courses/${encodeURIComponent(args.course_id as string)}/assignments/${encodeURIComponent(args.assignment_id as string)}/submissions`, params);
  }

  private async getSubmission(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.course_id || !args.assignment_id || !args.user_id) return { content: [{ type: 'text', text: 'course_id, assignment_id, and user_id are required' }], isError: true };
    return this.canvasGet(`/courses/${encodeURIComponent(args.course_id as string)}/assignments/${encodeURIComponent(args.assignment_id as string)}/submissions/${encodeURIComponent(args.user_id as string)}`);
  }

  private async gradeSubmission(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.course_id || !args.assignment_id || !args.user_id) return { content: [{ type: 'text', text: 'course_id, assignment_id, and user_id are required' }], isError: true };
    const body: Record<string, unknown> = { submission: {} };
    if (args.posted_grade) (body.submission as Record<string, unknown>).posted_grade = args.posted_grade;
    if (args.text_comment) body.comment = { text_comment: args.text_comment };
    return this.canvasPut(`/courses/${encodeURIComponent(args.course_id as string)}/assignments/${encodeURIComponent(args.assignment_id as string)}/submissions/${encodeURIComponent(args.user_id as string)}`, body);
  }

  private async listEnrollments(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.course_id) return { content: [{ type: 'text', text: 'course_id is required' }], isError: true };
    const params = this.buildParams(args, ['type', 'state', 'per_page', 'page']);
    if (!params.per_page) params.per_page = '10';
    return this.canvasGet(`/courses/${encodeURIComponent(args.course_id as string)}/enrollments`, params);
  }

  private async enrollUser(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.course_id || !args.user_id) return { content: [{ type: 'text', text: 'course_id and user_id are required' }], isError: true };
    const body = {
      enrollment: {
        user_id: args.user_id,
        type: (args.type as string) ?? 'StudentEnrollment',
        enrollment_state: (args.enrollment_state as string) ?? 'invited',
      },
    };
    return this.canvasPost(`/courses/${encodeURIComponent(args.course_id as string)}/enrollments`, body);
  }

  private async listModules(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.course_id) return { content: [{ type: 'text', text: 'course_id is required' }], isError: true };
    const params = this.buildParams(args, ['per_page', 'page', 'include']);
    if (!params.per_page) params.per_page = '10';
    return this.canvasGet(`/courses/${encodeURIComponent(args.course_id as string)}/modules`, params);
  }

  private async getModule(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.course_id || !args.module_id) return { content: [{ type: 'text', text: 'course_id and module_id are required' }], isError: true };
    return this.canvasGet(`/courses/${encodeURIComponent(args.course_id as string)}/modules/${encodeURIComponent(args.module_id as string)}`);
  }

  private async listModuleItems(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.course_id || !args.module_id) return { content: [{ type: 'text', text: 'course_id and module_id are required' }], isError: true };
    const params = this.buildParams(args, ['per_page', 'page']);
    if (!params.per_page) params.per_page = '10';
    return this.canvasGet(`/courses/${encodeURIComponent(args.course_id as string)}/modules/${encodeURIComponent(args.module_id as string)}/items`, params);
  }

  private async listAnnouncements(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.context_codes) return { content: [{ type: 'text', text: 'context_codes is required' }], isError: true };
    const params = this.buildParams(args, ['start_date', 'end_date', 'per_page', 'page']);
    if (!params.per_page) params.per_page = '10';
    // context_codes is an array parameter; append each context code
    const codes = (args.context_codes as string).split(',');
    const qs = codes.map(c => `context_codes[]=${encodeURIComponent(c.trim())}`).join('&');
    const extra = Object.keys(params).length > 0 ? '&' + new URLSearchParams(params).toString() : '';
    const response = await this.fetchWithRetry(`${this.baseUrl}/announcements?${qs}${extra}`, { method: 'GET', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async createAnnouncement(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.course_id || !args.title || !args.message) return { content: [{ type: 'text', text: 'course_id, title, and message are required' }], isError: true };
    const body: Record<string, unknown> = {
      title: args.title,
      message: args.message,
      is_announcement: true,
    };
    if (args.delayed_post_at) body.delayed_post_at = args.delayed_post_at;
    return this.canvasPost(`/courses/${encodeURIComponent(args.course_id as string)}/discussion_topics`, body);
  }

  private async listUsers(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.course_id) return { content: [{ type: 'text', text: 'course_id is required' }], isError: true };
    const params = this.buildParams(args, ['search_term', 'enrollment_type', 'per_page', 'page']);
    if (!params.per_page) params.per_page = '10';
    return this.canvasGet(`/courses/${encodeURIComponent(args.course_id as string)}/users`, params);
  }

  private async getUser(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.user_id) return { content: [{ type: 'text', text: 'user_id is required' }], isError: true };
    return this.canvasGet(`/users/${encodeURIComponent(args.user_id as string)}`);
  }

  private async getUserProfile(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.user_id) return { content: [{ type: 'text', text: 'user_id is required' }], isError: true };
    return this.canvasGet(`/users/${encodeURIComponent(args.user_id as string)}/profile`);
  }

  private async listGrades(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.course_id) return { content: [{ type: 'text', text: 'course_id is required' }], isError: true };
    const params = this.buildParams(args, ['per_page', 'page']);
    if (!params.per_page) params.per_page = '10';
    // Enrollments with grades included
    params['include[]'] = 'grades';
    params.type = 'StudentEnrollment';
    return this.canvasGet(`/courses/${encodeURIComponent(args.course_id as string)}/enrollments`, params);
  }

  private async listDiscussionTopics(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.course_id) return { content: [{ type: 'text', text: 'course_id is required' }], isError: true };
    const params = this.buildParams(args, ['order_by', 'scope', 'per_page', 'page']);
    if (!params.per_page) params.per_page = '10';
    return this.canvasGet(`/courses/${encodeURIComponent(args.course_id as string)}/discussion_topics`, params);
  }

  private async listPages(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.course_id) return { content: [{ type: 'text', text: 'course_id is required' }], isError: true };
    const params = this.buildParams(args, ['sort', 'order', 'search_term', 'per_page', 'page']);
    if (!params.per_page) params.per_page = '10';
    return this.canvasGet(`/courses/${encodeURIComponent(args.course_id as string)}/pages`, params);
  }
}

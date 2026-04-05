/**
 * Docebo MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// No official Docebo MCP server was found on GitHub. A community server exists
// (github.com/riccardo-larosa/docebo-mcp-server) but is not officially maintained by Docebo.
// Our adapter covers: 18 tools. Vendor MCP covers: 0 tools (none found).
// Recommendation: use-rest-api
//
// Base URL: https://{subdomain}.docebosaas.com (tenant-specific; set via config)
// Auth: OAuth2 client credentials — POST /oauth2/token with client_id and client_secret
// Docs: https://help.docebo.com/hc/en-us/articles/23195635608594-Overview-of-API-services-and-endpoints
//       https://doceboapi.docebosaas.com/api-browser/
//       https://developer.docebo.com/docs/api-browser-technical-information
// Rate limits: Not published. Tokens valid 14 days (expires_in); adapter refreshes 60s before expiry.
//
// Key verified endpoints:
//   GET  /learn/v1/courses                        — list courses
//   GET  /learn/v1/courses/{id}                   — get course
//   POST /learn/v1/courses                        — create course
//   PUT  /learn/v1/courses/{id}                   — update course
//   DEL  /learn/v1/courses/{id}                   — delete course
//   GET  /manage/v1/user                          — list users (note: singular "user")
//   GET  /manage/v1/user/{id}                     — get user
//   POST /manage/v1/user                          — create user
//   PUT  /manage/v1/user/{id}                     — update user / deactivate
//   POST /learn/v1/enrollments                    — enroll user(s) in course
//   DEL  /learn/v1/enrollments/{id_course}/{id_user} — unenroll user
//   GET  /learn/v1/lp                             — list learning plans
//   GET  /learn/v1/lp/{id}                        — get learning plan
//   GET  /learn/v1/certification                  — list certifications (no trailing 's')
//   GET  /certification/v1/awards/users/{user_id} — get user certifications
//   GET  /analytics/v1/reports                    — list reports

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface DoceboConfig {
  clientId: string;
  clientSecret: string;
  baseUrl: string;  // e.g. https://yourcompany.docebosaas.com
}

export class DoceboMCPServer extends MCPAdapterBase {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly baseUrl: string;
  private bearerToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(config: DoceboConfig) {
    super();
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    // Normalize: strip trailing slash
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
  }

  static catalog() {
    return {
      name: 'docebo',
      displayName: 'Docebo',
      version: '1.0.0',
      category: 'misc',
      keywords: [
        'docebo', 'lms', 'learning management', 'elearning', 'e-learning', 'training',
        'courses', 'enrollments', 'certifications', 'users', 'learning paths',
        'enterprise learning', 'compliance training', 'course catalog',
      ],
      toolNames: [
        'list_courses', 'get_course', 'create_course', 'update_course', 'delete_course',
        'list_users', 'get_user', 'create_user', 'update_user', 'deactivate_user',
        'list_enrollments', 'enroll_user', 'unenroll_user',
        'list_learning_plans', 'get_learning_plan',
        'list_certifications', 'get_user_certifications',
        'get_reports',
      ],
      description: 'Docebo enterprise LMS: manage courses, users, enrollments, learning plans, certifications, and pull training reports.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_courses',
        description: 'List courses in the Docebo catalog with optional filters for status, type, and search query',
        inputSchema: {
          type: 'object',
          properties: {
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            page_size: {
              type: 'number',
              description: 'Number of courses per page (default: 20, max: 200)',
            },
            search_text: {
              type: 'string',
              description: 'Search courses by name or description',
            },
            status: {
              type: 'string',
              description: 'Filter by course status: active, inactive (default: all)',
            },
            type: {
              type: 'string',
              description: 'Filter by course type: elearning, vilt, classroom (default: all)',
            },
            sort_by: {
              type: 'string',
              description: 'Sort field: name, creation_date, last_update (default: name)',
            },
            sort_dir: {
              type: 'string',
              description: 'Sort direction: asc or desc (default: asc)',
            },
          },
        },
      },
      {
        name: 'get_course',
        description: 'Get detailed information about a specific Docebo course by its course ID',
        inputSchema: {
          type: 'object',
          properties: {
            course_id: {
              type: 'number',
              description: 'Docebo course ID (numeric)',
            },
          },
          required: ['course_id'],
        },
      },
      {
        name: 'create_course',
        description: 'Create a new course in the Docebo catalog with name, type, and optional description',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Course name',
            },
            description: {
              type: 'string',
              description: 'Course description (HTML supported)',
            },
            course_type: {
              type: 'string',
              description: 'Course type: elearning (self-paced online), vilt (virtual instructor-led), classroom (default: elearning)',
            },
            language: {
              type: 'string',
              description: 'Language code (e.g. english, german, french)',
            },
            status: {
              type: 'string',
              description: 'Course status: active or inactive (default: active)',
            },
            duration: {
              type: 'number',
              description: 'Estimated duration in minutes',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'update_course',
        description: 'Update an existing Docebo course by course ID — name, description, status, or other fields',
        inputSchema: {
          type: 'object',
          properties: {
            course_id: {
              type: 'number',
              description: 'Docebo course ID to update',
            },
            name: {
              type: 'string',
              description: 'Updated course name',
            },
            description: {
              type: 'string',
              description: 'Updated course description',
            },
            status: {
              type: 'string',
              description: 'Updated status: active or inactive',
            },
            duration: {
              type: 'number',
              description: 'Updated duration in minutes',
            },
          },
          required: ['course_id'],
        },
      },
      {
        name: 'delete_course',
        description: 'Delete a Docebo course by course ID. This removes the course and all associated enrollments.',
        inputSchema: {
          type: 'object',
          properties: {
            course_id: {
              type: 'number',
              description: 'Docebo course ID to delete',
            },
          },
          required: ['course_id'],
        },
      },
      {
        name: 'list_users',
        description: 'List users in the Docebo platform with optional filters for status and search',
        inputSchema: {
          type: 'object',
          properties: {
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            page_size: {
              type: 'number',
              description: 'Users per page (default: 20, max: 200)',
            },
            search_text: {
              type: 'string',
              description: 'Search by username, first name, last name, or email',
            },
            status: {
              type: 'string',
              description: 'Filter by user status: active, inactive, deleted (default: active)',
            },
            sort_by: {
              type: 'string',
              description: 'Sort field: username, email, lastname, registration_date',
            },
          },
        },
      },
      {
        name: 'get_user',
        description: 'Get detailed profile information for a specific Docebo user by user ID',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: {
              type: 'number',
              description: 'Docebo user ID (numeric)',
            },
          },
          required: ['user_id'],
        },
      },
      {
        name: 'create_user',
        description: 'Create a new user account in the Docebo platform',
        inputSchema: {
          type: 'object',
          properties: {
            username: {
              type: 'string',
              description: 'Unique username for the account',
            },
            email: {
              type: 'string',
              description: 'User email address',
            },
            password: {
              type: 'string',
              description: 'Initial password (must meet Docebo password policy)',
            },
            first_name: {
              type: 'string',
              description: 'User first name',
            },
            last_name: {
              type: 'string',
              description: 'User last name',
            },
            language: {
              type: 'string',
              description: 'UI language code (e.g. english, german)',
            },
            send_notification_email: {
              type: 'boolean',
              description: 'Send welcome email to the new user (default: false)',
            },
          },
          required: ['username', 'email', 'password'],
        },
      },
      {
        name: 'update_user',
        description: 'Update an existing Docebo user profile by user ID',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: {
              type: 'number',
              description: 'Docebo user ID to update',
            },
            email: {
              type: 'string',
              description: 'Updated email address',
            },
            first_name: {
              type: 'string',
              description: 'Updated first name',
            },
            last_name: {
              type: 'string',
              description: 'Updated last name',
            },
            language: {
              type: 'string',
              description: 'Updated UI language code',
            },
          },
          required: ['user_id'],
        },
      },
      {
        name: 'deactivate_user',
        description: 'Deactivate (suspend) a Docebo user account by user ID, preventing login without deleting data',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: {
              type: 'number',
              description: 'Docebo user ID to deactivate',
            },
          },
          required: ['user_id'],
        },
      },
      {
        name: 'list_enrollments',
        description: 'List course enrollments with optional filters for course ID, user ID, and enrollment status',
        inputSchema: {
          type: 'object',
          properties: {
            course_id: {
              type: 'number',
              description: 'Filter enrollments for a specific course ID',
            },
            user_id: {
              type: 'number',
              description: 'Filter enrollments for a specific user ID',
            },
            status: {
              type: 'string',
              description: 'Filter by enrollment status: enrolled, in_progress, completed, waiting_list (default: all)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            page_size: {
              type: 'number',
              description: 'Enrollments per page (default: 20, max: 200)',
            },
          },
        },
      },
      {
        name: 'enroll_user',
        description: 'Enroll a user in a Docebo course by user ID and course ID',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: {
              type: 'number',
              description: 'Docebo user ID to enroll',
            },
            course_id: {
              type: 'number',
              description: 'Docebo course ID to enroll the user in',
            },
            level: {
              type: 'number',
              description: 'Enrollment level: 6 (student/learner, default), 7 (tutor)',
            },
            waiting: {
              type: 'boolean',
              description: 'Add to waiting list instead of enrolling directly (default: false)',
            },
          },
          required: ['user_id', 'course_id'],
        },
      },
      {
        name: 'unenroll_user',
        description: 'Remove a user enrollment from a Docebo course by user ID and course ID',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: {
              type: 'number',
              description: 'Docebo user ID to unenroll',
            },
            course_id: {
              type: 'number',
              description: 'Docebo course ID to unenroll the user from',
            },
          },
          required: ['user_id', 'course_id'],
        },
      },
      {
        name: 'list_learning_plans',
        description: 'List learning plans (learning paths) in the Docebo catalog with name and course count',
        inputSchema: {
          type: 'object',
          properties: {
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            page_size: {
              type: 'number',
              description: 'Learning plans per page (default: 20, max: 200)',
            },
            search_text: {
              type: 'string',
              description: 'Search learning plans by name',
            },
            status: {
              type: 'string',
              description: 'Filter by status: active or inactive (default: active)',
            },
          },
        },
      },
      {
        name: 'get_learning_plan',
        description: 'Get detailed information about a specific Docebo learning plan including courses and enrollment data',
        inputSchema: {
          type: 'object',
          properties: {
            learning_plan_id: {
              type: 'number',
              description: 'Docebo learning plan ID',
            },
          },
          required: ['learning_plan_id'],
        },
      },
      {
        name: 'list_certifications',
        description: 'List certifications available in the Docebo platform',
        inputSchema: {
          type: 'object',
          properties: {
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            page_size: {
              type: 'number',
              description: 'Certifications per page (default: 20, max: 200)',
            },
            search_text: {
              type: 'string',
              description: 'Search certifications by name',
            },
          },
        },
      },
      {
        name: 'get_user_certifications',
        description: 'Retrieve all certifications earned by a specific Docebo user, including expiry dates and status',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: {
              type: 'number',
              description: 'Docebo user ID to retrieve certifications for',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            page_size: {
              type: 'number',
              description: 'Certifications per page (default: 20, max: 200)',
            },
          },
          required: ['user_id'],
        },
      },
      {
        name: 'get_reports',
        description: 'List available reports in the Docebo platform for training completions, enrollments, and certifications',
        inputSchema: {
          type: 'object',
          properties: {
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            page_size: {
              type: 'number',
              description: 'Reports per page (default: 20, max: 200)',
            },
            report_type: {
              type: 'string',
              description: 'Filter by report type: user, course, enrollment, certification',
            },
          },
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
        case 'create_course':
          return this.createCourse(args);
        case 'update_course':
          return this.updateCourse(args);
        case 'delete_course':
          return this.deleteCourse(args);
        case 'list_users':
          return this.listUsers(args);
        case 'get_user':
          return this.getUser(args);
        case 'create_user':
          return this.createUser(args);
        case 'update_user':
          return this.updateUser(args);
        case 'deactivate_user':
          return this.deactivateUser(args);
        case 'list_enrollments':
          return this.listEnrollments(args);
        case 'enroll_user':
          return this.enrollUser(args);
        case 'unenroll_user':
          return this.unenrollUser(args);
        case 'list_learning_plans':
          return this.listLearningPlans(args);
        case 'get_learning_plan':
          return this.getLearningPlan(args);
        case 'list_certifications':
          return this.listCertifications(args);
        case 'get_user_certifications':
          return this.getUserCertifications(args);
        case 'get_reports':
          return this.getReports(args);
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
    const response = await this.fetchWithRetry(`${this.baseUrl}/oauth2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: this.clientId,
        client_secret: this.clientSecret,
        scope: 'api',
      }).toString(),
    });
    if (!response.ok) {
      throw new Error(`OAuth2 token request failed: ${response.status} ${response.statusText}`);
    }
    const data = await response.json() as { access_token: string; expires_in: number };
    this.bearerToken = data.access_token;
    // Tokens valid 14 days; refresh 60s early
    this.tokenExpiry = now + ((data.expires_in || 1209600) - 60) * 1000;
    return this.bearerToken;
  }

  private async authHeaders(): Promise<Record<string, string>> {
    const token = await this.getOrRefreshToken();
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  private async doceboGet(path: string, params?: Record<string, string>): Promise<ToolResult> {
    const headers = await this.authHeaders();
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}${qs}`, { headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async doceboPost(path: string, body: Record<string, unknown>): Promise<ToolResult> {
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

  private async doceboPut(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const headers = await this.authHeaders();
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async doceboDelete(path: string): Promise<ToolResult> {
    const headers = await this.authHeaders();
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, { method: 'DELETE', headers });
    if (response.status === 204 || response.ok) {
      return { content: [{ type: 'text', text: 'Deleted successfully' }], isError: false };
    }
    return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
  }

  private async listCourses(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      page: String((args.page as number) || 1),
      pageSize: String((args.page_size as number) || 20),
    };
    if (args.search_text) params.search_text = args.search_text as string;
    if (args.status) params.status = args.status as string;
    if (args.type) params.type = args.type as string;
    if (args.sort_by) params.sort_attr = args.sort_by as string;
    if (args.sort_dir) params.sort_dir = args.sort_dir as string;
    return this.doceboGet('/learn/v1/courses', params);
  }

  private async getCourse(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.course_id) return { content: [{ type: 'text', text: 'course_id is required' }], isError: true };
    return this.doceboGet(`/learn/v1/courses/${encodeURIComponent(args.course_id as string)}`);
  }

  private async createCourse(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name) return { content: [{ type: 'text', text: 'name is required' }], isError: true };
    const body: Record<string, unknown> = { name: args.name };
    if (args.description) body.description = args.description;
    if (args.course_type) body.type = args.course_type;
    if (args.language) body.language = args.language;
    if (args.status) body.status = args.status;
    if (args.duration) body.duration = args.duration;
    return this.doceboPost('/learn/v1/courses', body);
  }

  private async updateCourse(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.course_id) return { content: [{ type: 'text', text: 'course_id is required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.name) body.name = args.name;
    if (args.description) body.description = args.description;
    if (args.status) body.status = args.status;
    if (args.duration) body.duration = args.duration;
    return this.doceboPut(`/learn/v1/courses/${encodeURIComponent(args.course_id as string)}`, body);
  }

  private async deleteCourse(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.course_id) return { content: [{ type: 'text', text: 'course_id is required' }], isError: true };
    return this.doceboDelete(`/learn/v1/courses/${encodeURIComponent(args.course_id as string)}`);
  }

  private async listUsers(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      page: String((args.page as number) || 1),
      pageSize: String((args.page_size as number) || 20),
    };
    if (args.search_text) params.search_text = args.search_text as string;
    if (args.status) params.status = args.status as string;
    if (args.sort_by) params.sort_attr = args.sort_by as string;
    return this.doceboGet('/manage/v1/user', params);
  }

  private async getUser(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.user_id) return { content: [{ type: 'text', text: 'user_id is required' }], isError: true };
    return this.doceboGet(`/manage/v1/user/${encodeURIComponent(args.user_id as string)}`);
  }

  private async createUser(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.username || !args.email || !args.password) {
      return { content: [{ type: 'text', text: 'username, email, and password are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      username: args.username,
      email: args.email,
      password: args.password,
    };
    if (args.first_name) body.firstname = args.first_name;
    if (args.last_name) body.lastname = args.last_name;
    if (args.language) body.language = args.language;
    if (typeof args.send_notification_email === 'boolean') body.send_notification_email = args.send_notification_email;
    return this.doceboPost('/manage/v1/user', body);
  }

  private async updateUser(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.user_id) return { content: [{ type: 'text', text: 'user_id is required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.email) body.email = args.email;
    if (args.first_name) body.firstname = args.first_name;
    if (args.last_name) body.lastname = args.last_name;
    if (args.language) body.language = args.language;
    return this.doceboPut(`/manage/v1/user/${encodeURIComponent(args.user_id as string)}`, body);
  }

  private async deactivateUser(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.user_id) return { content: [{ type: 'text', text: 'user_id is required' }], isError: true };
    return this.doceboPut(`/manage/v1/user/${encodeURIComponent(args.user_id as string)}`, { active: false });
  }

  private async listEnrollments(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      page: String((args.page as number) || 1),
      pageSize: String((args.page_size as number) || 20),
    };
    if (args.status) params.status = args.status as string;
    if (args.user_id) params.user_id = String(args.user_id);
    if (args.course_id) {
      return this.doceboGet(`/learn/v1/enrollments/${encodeURIComponent(args.course_id as string)}`, params);
    }
    return this.doceboGet('/learn/v1/enrollments', params);
  }

  private async enrollUser(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.user_id || !args.course_id) {
      return { content: [{ type: 'text', text: 'user_id and course_id are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      users: [
        {
          user_id: args.user_id,
          level: (args.level as number) || 6,
          waiting: (args.waiting as boolean) || false,
        },
      ],
    };
    return this.doceboPost(`/learn/v1/enrollments/${encodeURIComponent(args.course_id as string)}`, body);
  }

  private async unenrollUser(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.user_id || !args.course_id) {
      return { content: [{ type: 'text', text: 'user_id and course_id are required' }], isError: true };
    }
    return this.doceboDelete(`/learn/v1/enrollments/${encodeURIComponent(args.course_id as string)}/${encodeURIComponent(args.user_id as string)}`);
  }

  private async listLearningPlans(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      page: String((args.page as number) || 1),
      pageSize: String((args.page_size as number) || 20),
    };
    if (args.search_text) params.search_text = args.search_text as string;
    if (args.status) params.status = args.status as string;
    return this.doceboGet('/learn/v1/lp', params);
  }

  private async getLearningPlan(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.learning_plan_id) return { content: [{ type: 'text', text: 'learning_plan_id is required' }], isError: true };
    return this.doceboGet(`/learn/v1/lp/${encodeURIComponent(args.learning_plan_id as string)}`);
  }

  private async listCertifications(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      page: String((args.page as number) || 1),
      pageSize: String((args.page_size as number) || 20),
    };
    if (args.search_text) params.search_text = args.search_text as string;
    // Correct endpoint: /learn/v1/certification (no trailing 's') per doceboapi.docebosaas.com
    return this.doceboGet('/learn/v1/certification', params);
  }

  private async getUserCertifications(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.user_id) return { content: [{ type: 'text', text: 'user_id is required' }], isError: true };
    const params: Record<string, string> = {
      page: String((args.page as number) || 1),
      pageSize: String((args.page_size as number) || 20),
    };
    // Correct endpoint: /certification/v1/awards/users/{user_id} per docebousandbox.docebosaas.com API explorer
    return this.doceboGet(`/certification/v1/awards/users/${encodeURIComponent(args.user_id as string)}`, params);
  }

  private async getReports(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      page: String((args.page as number) || 1),
      pageSize: String((args.page_size as number) || 20),
    };
    if (args.report_type) params.type = args.report_type as string;
    return this.doceboGet('/analytics/v1/reports', params);
  }
}

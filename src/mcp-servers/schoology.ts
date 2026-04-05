/**
 * Schoology MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28.
// No official Schoology MCP server was found on GitHub or the Schoology developer portal.
// Recommendation: use-rest-api
//
// Base URL: https://api.schoology.com/v1
// Auth: OAuth 1.0 two-legged (consumer key + secret in Authorization header, HMAC-SHA1)
// Docs: https://developers.schoology.com/api-documentation/rest-api-v1/
// Rate limits: Not publicly documented; standard throttling applies per app/consumer key

import { createHmac } from 'node:crypto';
import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface SchoologyConfig {
  consumerKey: string;
  consumerSecret: string;
  baseUrl?: string;
}

export class SchoologyMCPServer extends MCPAdapterBase {
  private readonly consumerKey: string;
  private readonly consumerSecret: string;
  private readonly baseUrl: string;

  constructor(config: SchoologyConfig) {
    super();
    this.consumerKey = config.consumerKey;
    this.consumerSecret = config.consumerSecret;
    this.baseUrl = config.baseUrl || 'https://api.schoology.com/v1';
  }

  static catalog() {
    return {
      name: 'schoology',
      displayName: 'Schoology',
      version: '1.0.0',
      category: 'misc',
      keywords: ['schoology', 'lms', 'learning management', 'education', 'course', 'assignment', 'grade', 'student', 'teacher', 'school', 'edtech', 'class'],
      toolNames: [
        'list_courses', 'get_course', 'list_course_sections', 'get_course_section',
        'list_users', 'get_user', 'list_user_enrollments',
        'list_assignments', 'get_assignment', 'create_assignment',
        'list_grades', 'get_grade',
        'list_groups', 'get_group',
        'list_schools', 'get_school',
        'list_events', 'get_event',
      ],
      description: 'Schoology LMS: access courses, sections, assignments, grades, users, groups, and school enrollment data.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_courses',
        description: 'List courses in the Schoology domain with optional building and status filters',
        inputSchema: {
          type: 'object',
          properties: {
            building_id: {
              type: 'string',
              description: 'Filter by school building ID',
            },
            start: {
              type: 'number',
              description: 'Offset for pagination (default: 0)',
            },
            limit: {
              type: 'number',
              description: 'Maximum results per page (default: 20, max: 200)',
            },
          },
        },
      },
      {
        name: 'get_course',
        description: 'Get details for a specific Schoology course by its course ID',
        inputSchema: {
          type: 'object',
          properties: {
            course_id: {
              type: 'string',
              description: 'Schoology course ID',
            },
          },
          required: ['course_id'],
        },
      },
      {
        name: 'list_course_sections',
        description: 'List all sections (class periods) of a Schoology course with enrollment counts',
        inputSchema: {
          type: 'object',
          properties: {
            course_id: {
              type: 'string',
              description: 'Course ID to list sections for',
            },
            start: {
              type: 'number',
              description: 'Offset for pagination (default: 0)',
            },
            limit: {
              type: 'number',
              description: 'Maximum results per page (default: 20)',
            },
          },
          required: ['course_id'],
        },
      },
      {
        name: 'get_course_section',
        description: 'Get details for a specific Schoology course section by course ID and section ID',
        inputSchema: {
          type: 'object',
          properties: {
            course_id: {
              type: 'string',
              description: 'Course ID',
            },
            section_id: {
              type: 'string',
              description: 'Section ID to retrieve',
            },
          },
          required: ['course_id', 'section_id'],
        },
      },
      {
        name: 'list_users',
        description: 'List users in the Schoology domain with optional role and school building filters',
        inputSchema: {
          type: 'object',
          properties: {
            role_id: {
              type: 'string',
              description: 'Filter by role ID (student, teacher, administrator)',
            },
            building_id: {
              type: 'string',
              description: 'Filter by school building ID',
            },
            start: {
              type: 'number',
              description: 'Offset for pagination (default: 0)',
            },
            limit: {
              type: 'number',
              description: 'Maximum results per page (default: 20, max: 200)',
            },
          },
        },
      },
      {
        name: 'get_user',
        description: 'Get profile and account details for a specific Schoology user by their user ID',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: {
              type: 'string',
              description: 'Schoology user ID',
            },
          },
          required: ['user_id'],
        },
      },
      {
        name: 'list_user_enrollments',
        description: 'List course and section enrollments for a specific Schoology user',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: {
              type: 'string',
              description: 'User ID to list enrollments for',
            },
            start: {
              type: 'number',
              description: 'Offset for pagination (default: 0)',
            },
            limit: {
              type: 'number',
              description: 'Maximum results per page (default: 20)',
            },
          },
          required: ['user_id'],
        },
      },
      {
        name: 'list_assignments',
        description: 'List assignments in a Schoology course section with optional due date and type filters',
        inputSchema: {
          type: 'object',
          properties: {
            section_id: {
              type: 'string',
              description: 'Course section ID to list assignments for',
            },
            start: {
              type: 'number',
              description: 'Offset for pagination (default: 0)',
            },
            limit: {
              type: 'number',
              description: 'Maximum results per page (default: 20)',
            },
          },
          required: ['section_id'],
        },
      },
      {
        name: 'get_assignment',
        description: 'Get details for a specific Schoology assignment by section ID and assignment ID',
        inputSchema: {
          type: 'object',
          properties: {
            section_id: {
              type: 'string',
              description: 'Course section ID containing the assignment',
            },
            assignment_id: {
              type: 'string',
              description: 'Assignment ID to retrieve',
            },
          },
          required: ['section_id', 'assignment_id'],
        },
      },
      {
        name: 'create_assignment',
        description: 'Create a new assignment in a Schoology course section with title, due date, and point value',
        inputSchema: {
          type: 'object',
          properties: {
            section_id: {
              type: 'string',
              description: 'Course section ID to create the assignment in',
            },
            title: {
              type: 'string',
              description: 'Assignment title',
            },
            description: {
              type: 'string',
              description: 'Assignment description or instructions (HTML supported)',
            },
            due: {
              type: 'string',
              description: 'Due date in YYYY-MM-DD HH:MM:SS format',
            },
            max_points: {
              type: 'number',
              description: 'Maximum point value for the assignment (default: 100)',
            },
            grading_scale_id: {
              type: 'string',
              description: 'ID of the grading scale to apply',
            },
          },
          required: ['section_id', 'title'],
        },
      },
      {
        name: 'list_grades',
        description: 'List grades for all students in a Schoology course section with optional assignment filter',
        inputSchema: {
          type: 'object',
          properties: {
            section_id: {
              type: 'string',
              description: 'Course section ID to retrieve grades for',
            },
            assignment_id: {
              type: 'string',
              description: 'Filter grades by specific assignment ID',
            },
          },
          required: ['section_id'],
        },
      },
      {
        name: 'get_grade',
        description: 'Get the grade for a specific student on a specific assignment in a Schoology section',
        inputSchema: {
          type: 'object',
          properties: {
            section_id: {
              type: 'string',
              description: 'Course section ID',
            },
            assignment_id: {
              type: 'string',
              description: 'Assignment ID',
            },
            user_id: {
              type: 'string',
              description: 'Student user ID',
            },
          },
          required: ['section_id', 'assignment_id', 'user_id'],
        },
      },
      {
        name: 'list_groups',
        description: 'List groups in the Schoology domain (study groups, clubs) with optional privacy filter',
        inputSchema: {
          type: 'object',
          properties: {
            privacy_level: {
              type: 'string',
              description: 'Filter by privacy: everyone or members (default: all)',
            },
            start: {
              type: 'number',
              description: 'Offset for pagination (default: 0)',
            },
            limit: {
              type: 'number',
              description: 'Maximum results per page (default: 20)',
            },
          },
        },
      },
      {
        name: 'get_group',
        description: 'Get details for a specific Schoology group by its group ID',
        inputSchema: {
          type: 'object',
          properties: {
            group_id: {
              type: 'string',
              description: 'Group ID to retrieve',
            },
          },
          required: ['group_id'],
        },
      },
      {
        name: 'list_schools',
        description: 'List school buildings in the Schoology district domain',
        inputSchema: {
          type: 'object',
          properties: {
            start: {
              type: 'number',
              description: 'Offset for pagination (default: 0)',
            },
            limit: {
              type: 'number',
              description: 'Maximum results per page (default: 20)',
            },
          },
        },
      },
      {
        name: 'get_school',
        description: 'Get details for a specific Schoology school building by its school ID',
        inputSchema: {
          type: 'object',
          properties: {
            school_id: {
              type: 'string',
              description: 'School building ID to retrieve',
            },
          },
          required: ['school_id'],
        },
      },
      {
        name: 'list_events',
        description: 'List events from the Schoology calendar with optional date range and user context',
        inputSchema: {
          type: 'object',
          properties: {
            start_date: {
              type: 'string',
              description: 'Start date filter (YYYY-MM-DD)',
            },
            end_date: {
              type: 'string',
              description: 'End date filter (YYYY-MM-DD)',
            },
            start: {
              type: 'number',
              description: 'Offset for pagination (default: 0)',
            },
            limit: {
              type: 'number',
              description: 'Maximum results per page (default: 20)',
            },
          },
        },
      },
      {
        name: 'get_event',
        description: 'Get details for a specific Schoology calendar event by its event ID',
        inputSchema: {
          type: 'object',
          properties: {
            event_id: {
              type: 'string',
              description: 'Event ID to retrieve',
            },
          },
          required: ['event_id'],
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
        case 'list_course_sections':
          return this.listCourseSections(args);
        case 'get_course_section':
          return this.getCourseSection(args);
        case 'list_users':
          return this.listUsers(args);
        case 'get_user':
          return this.getUser(args);
        case 'list_user_enrollments':
          return this.listUserEnrollments(args);
        case 'list_assignments':
          return this.listAssignments(args);
        case 'get_assignment':
          return this.getAssignment(args);
        case 'create_assignment':
          return this.createAssignment(args);
        case 'list_grades':
          return this.listGrades(args);
        case 'get_grade':
          return this.getGrade(args);
        case 'list_groups':
          return this.listGroups(args);
        case 'get_group':
          return this.getGroup(args);
        case 'list_schools':
          return this.listSchools(args);
        case 'get_school':
          return this.getSchool(args);
        case 'list_events':
          return this.listEvents(args);
        case 'get_event':
          return this.getEvent(args);
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

  /**
   * Build an OAuth 1.0 two-legged Authorization header (HMAC-SHA1).
   * Schoology uses two-legged OAuth — no access token required.
   */
  private buildOAuthHeader(method: string, url: string): string {
    const oauthTimestamp = Math.floor(Date.now() / 1000).toString();
    const oauthNonce = Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);

    const oauthParams: Record<string, string> = {
      oauth_consumer_key: this.consumerKey,
      oauth_nonce: oauthNonce,
      oauth_signature_method: 'HMAC-SHA1',
      oauth_timestamp: oauthTimestamp,
      oauth_token: '',
      oauth_version: '1.0',
    };

    // Build signature base string
    const urlObj = new URL(url);
    const baseUrl = `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}`;

    const allParams: Record<string, string> = { ...oauthParams };
    urlObj.searchParams.forEach((v, k) => { allParams[k] = v; });

    const sortedParams = Object.keys(allParams)
      .filter(k => allParams[k] !== '')
      .sort()
      .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(allParams[k])}`)
      .join('&');

    const signatureBase = [
      method.toUpperCase(),
      encodeURIComponent(baseUrl),
      encodeURIComponent(sortedParams),
    ].join('&');

    const signingKey = `${encodeURIComponent(this.consumerSecret)}&`;
    const signature = createHmac('sha1', signingKey).update(signatureBase).digest('base64');

    const headerParts: string[] = [
      `oauth_consumer_key="${this.consumerKey}"`,
      `oauth_nonce="${oauthNonce}"`,
      `oauth_signature="${encodeURIComponent(signature)}"`,
      `oauth_signature_method="HMAC-SHA1"`,
      `oauth_timestamp="${oauthTimestamp}"`,
      `oauth_version="1.0"`,
    ];

    return `OAuth realm="Schoology API", ${headerParts.join(', ')}`;
  }

  private async apiGet(path: string): Promise<ToolResult> {
    const url = `${this.baseUrl}${path}`;
    const oauthHeader = this.buildOAuthHeader('GET', url);
    const response = await this.fetchWithRetry(url, {
      headers: {
        'Authorization': oauthHeader,
        'Accept': 'application/json',
      },
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apiPost(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const url = `${this.baseUrl}${path}`;
    const oauthHeader = this.buildOAuthHeader('POST', url);
    const response = await this.fetchWithRetry(url, {
      method: 'POST',
      headers: {
        'Authorization': oauthHeader,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private buildQs(params: Record<string, string | number | undefined>): string {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) p.set(k, String(v));
    }
    const s = p.toString();
    return s ? '?' + s : '';
  }

  private async listCourses(args: Record<string, unknown>): Promise<ToolResult> {
    return this.apiGet('/courses' + this.buildQs({
      building_id: args.building_id as string,
      start: args.start as number,
      limit: (args.limit as number) || 20,
    }));
  }

  private async getCourse(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.course_id) return { content: [{ type: 'text', text: 'course_id is required' }], isError: true };
    return this.apiGet(`/courses/${encodeURIComponent(args.course_id as string)}`);
  }

  private async listCourseSections(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.course_id) return { content: [{ type: 'text', text: 'course_id is required' }], isError: true };
    return this.apiGet(`/courses/${encodeURIComponent(args.course_id as string)}/sections` + this.buildQs({ start: args.start as number, limit: (args.limit as number) || 20 }));
  }

  private async getCourseSection(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.course_id || !args.section_id) return { content: [{ type: 'text', text: 'course_id and section_id are required' }], isError: true };
    return this.apiGet(`/courses/${encodeURIComponent(args.course_id as string)}/sections/${encodeURIComponent(args.section_id as string)}`);
  }

  private async listUsers(args: Record<string, unknown>): Promise<ToolResult> {
    return this.apiGet('/users' + this.buildQs({
      role_id: args.role_id as string,
      building_id: args.building_id as string,
      start: args.start as number,
      limit: (args.limit as number) || 20,
    }));
  }

  private async getUser(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.user_id) return { content: [{ type: 'text', text: 'user_id is required' }], isError: true };
    return this.apiGet(`/users/${encodeURIComponent(args.user_id as string)}`);
  }

  private async listUserEnrollments(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.user_id) return { content: [{ type: 'text', text: 'user_id is required' }], isError: true };
    return this.apiGet(`/users/${encodeURIComponent(args.user_id as string)}/sections` + this.buildQs({ start: args.start as number, limit: (args.limit as number) || 20 }));
  }

  private async listAssignments(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.section_id) return { content: [{ type: 'text', text: 'section_id is required' }], isError: true };
    return this.apiGet(`/sections/${encodeURIComponent(args.section_id as string)}/assignments` + this.buildQs({ start: args.start as number, limit: (args.limit as number) || 20 }));
  }

  private async getAssignment(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.section_id || !args.assignment_id) return { content: [{ type: 'text', text: 'section_id and assignment_id are required' }], isError: true };
    return this.apiGet(`/sections/${encodeURIComponent(args.section_id as string)}/assignments/${encodeURIComponent(args.assignment_id as string)}`);
  }

  private async createAssignment(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.section_id || !args.title) return { content: [{ type: 'text', text: 'section_id and title are required' }], isError: true };
    const body: Record<string, unknown> = {
      title: args.title,
      max_points: (args.max_points as number) || 100,
      type: 'assignment',
    };
    if (args.description) body.description = args.description;
    if (args.due) body.due = args.due;
    if (args.grading_scale_id) body.grading_scale_id = args.grading_scale_id;
    return this.apiPost(`/sections/${encodeURIComponent(args.section_id as string)}/assignments`, body);
  }

  private async listGrades(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.section_id) return { content: [{ type: 'text', text: 'section_id is required' }], isError: true };
    const path = args.assignment_id
      ? `/sections/${encodeURIComponent(args.section_id as string)}/grades?assignment_id=${encodeURIComponent(args.assignment_id as string)}`
      : `/sections/${encodeURIComponent(args.section_id as string)}/grades`;
    return this.apiGet(path);
  }

  private async getGrade(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.section_id || !args.assignment_id || !args.user_id) {
      return { content: [{ type: 'text', text: 'section_id, assignment_id, and user_id are required' }], isError: true };
    }
    return this.apiGet(`/sections/${encodeURIComponent(args.section_id as string)}/grades?assignment_id=${encodeURIComponent(args.assignment_id as string)}&user_id=${encodeURIComponent(args.user_id as string)}`);
  }

  private async listGroups(args: Record<string, unknown>): Promise<ToolResult> {
    return this.apiGet('/groups' + this.buildQs({
      privacy_level: args.privacy_level as string,
      start: args.start as number,
      limit: (args.limit as number) || 20,
    }));
  }

  private async getGroup(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.group_id) return { content: [{ type: 'text', text: 'group_id is required' }], isError: true };
    return this.apiGet(`/groups/${encodeURIComponent(args.group_id as string)}`);
  }

  private async listSchools(args: Record<string, unknown>): Promise<ToolResult> {
    return this.apiGet('/schools' + this.buildQs({ start: args.start as number, limit: (args.limit as number) || 20 }));
  }

  private async getSchool(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.school_id) return { content: [{ type: 'text', text: 'school_id is required' }], isError: true };
    return this.apiGet(`/schools/${encodeURIComponent(args.school_id as string)}`);
  }

  private async listEvents(args: Record<string, unknown>): Promise<ToolResult> {
    return this.apiGet('/events' + this.buildQs({
      start_date: args.start_date as string,
      end_date: args.end_date as string,
      start: args.start as number,
      limit: (args.limit as number) || 20,
    }));
  }

  private async getEvent(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.event_id) return { content: [{ type: 'text', text: 'event_id is required' }], isError: true };
    return this.apiGet(`/events/${encodeURIComponent(args.event_id as string)}`);
  }
}

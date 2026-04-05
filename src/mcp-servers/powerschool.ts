/**
 * PowerSchool MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// PowerSchool SIS (Student Information System) REST API
// Base URL: institution-specific (e.g. https://your-district.powerschool.com)
// Auth: OAuth2 client credentials — POST /oauth/access_token
//       with Basic auth (client_id:client_secret) and grant_type=client_credentials
// Docs: https://support.powerschool.com/developer/
// Rate limits: varies by district license and server configuration

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface PowerSchoolConfig {
  clientId: string;
  clientSecret: string;
  baseUrl: string;
}

export class PowerSchoolMCPServer extends MCPAdapterBase {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly baseUrl: string;
  private bearerToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(config: PowerSchoolConfig) {
    super();
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
  }

  static catalog() {
    return {
      name: 'powerschool',
      displayName: 'PowerSchool',
      version: '1.0.0',
      category: 'education',
      keywords: ['powerschool', 'sis', 'student information system', 'education', 'k12', 'grades', 'attendance', 'enrollment', 'schools', 'district'],
      toolNames: [
        'list_students', 'get_student', 'list_schools', 'get_school',
        'list_sections', 'get_section', 'list_staff', 'get_staff',
        'get_attendance', 'update_attendance', 'list_assignments',
        'get_grades', 'get_gpa', 'list_terms',
      ],
      description: 'PowerSchool SIS: access students, schools, sections, staff, attendance records, grades, GPA, and academic terms across your district.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_students',
        description: 'List students in the PowerSchool system, optionally filtered by school or search term',
        inputSchema: {
          type: 'object',
          properties: {
            school_id: {
              type: 'number',
              description: 'Filter by PowerSchool school ID (optional)',
            },
            q: {
              type: 'string',
              description: 'Search query string to filter students by name or student number (optional)',
            },
            pagesize: {
              type: 'number',
              description: 'Number of records per page (default: 100, max: 1000)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
          },
        },
      },
      {
        name: 'get_student',
        description: 'Get detailed information about a specific student by their PowerSchool student ID or DCID',
        inputSchema: {
          type: 'object',
          properties: {
            student_id: {
              type: 'number',
              description: 'PowerSchool student ID (DCID)',
            },
          },
          required: ['student_id'],
        },
      },
      {
        name: 'list_schools',
        description: 'List all schools in the PowerSchool district with their names, addresses, and school numbers',
        inputSchema: {
          type: 'object',
          properties: {
            pagesize: {
              type: 'number',
              description: 'Number of records per page (default: 100)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
          },
        },
      },
      {
        name: 'get_school',
        description: 'Get detailed information about a specific school by its PowerSchool school ID',
        inputSchema: {
          type: 'object',
          properties: {
            school_id: {
              type: 'number',
              description: 'PowerSchool school ID',
            },
          },
          required: ['school_id'],
        },
      },
      {
        name: 'list_sections',
        description: 'List course sections (classes) for a school and optional term, including teacher and room assignments',
        inputSchema: {
          type: 'object',
          properties: {
            school_id: {
              type: 'number',
              description: 'PowerSchool school ID',
            },
            term_id: {
              type: 'number',
              description: 'Filter by term ID (optional)',
            },
            pagesize: {
              type: 'number',
              description: 'Number of records per page (default: 100)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
          },
          required: ['school_id'],
        },
      },
      {
        name: 'get_section',
        description: 'Get detailed information about a specific course section by its section ID',
        inputSchema: {
          type: 'object',
          properties: {
            section_id: {
              type: 'number',
              description: 'PowerSchool section ID (DCID)',
            },
          },
          required: ['section_id'],
        },
      },
      {
        name: 'list_staff',
        description: 'List staff members (teachers, administrators) in a school or across the district',
        inputSchema: {
          type: 'object',
          properties: {
            school_id: {
              type: 'number',
              description: 'Filter by school ID (optional; omit for district-wide)',
            },
            pagesize: {
              type: 'number',
              description: 'Number of records per page (default: 100)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
          },
        },
      },
      {
        name: 'get_staff',
        description: 'Get detailed information about a specific staff member by their PowerSchool staff ID',
        inputSchema: {
          type: 'object',
          properties: {
            staff_id: {
              type: 'number',
              description: 'PowerSchool staff/teacher ID (DCID)',
            },
          },
          required: ['staff_id'],
        },
      },
      {
        name: 'get_attendance',
        description: 'Get attendance records for a student across all sections or for a specific date range',
        inputSchema: {
          type: 'object',
          properties: {
            student_id: {
              type: 'number',
              description: 'PowerSchool student ID (DCID)',
            },
            from_date: {
              type: 'string',
              description: 'Start date for attendance records in YYYY-MM-DD format (optional)',
            },
            to_date: {
              type: 'string',
              description: 'End date for attendance records in YYYY-MM-DD format (optional)',
            },
          },
          required: ['student_id'],
        },
      },
      {
        name: 'update_attendance',
        description: 'Create or update an attendance record for a student for a specific date and period',
        inputSchema: {
          type: 'object',
          properties: {
            student_id: {
              type: 'number',
              description: 'PowerSchool student ID (DCID)',
            },
            section_id: {
              type: 'number',
              description: 'Section ID for the class period',
            },
            att_date: {
              type: 'string',
              description: 'Attendance date in YYYY-MM-DD format',
            },
            code_id: {
              type: 'number',
              description: 'Attendance code ID (maps to Present, Absent, Tardy, etc.)',
            },
            period_id: {
              type: 'number',
              description: 'Period ID for the attendance record',
            },
          },
          required: ['student_id', 'section_id', 'att_date', 'code_id'],
        },
      },
      {
        name: 'list_assignments',
        description: 'List assignments for a specific section with due dates and point values',
        inputSchema: {
          type: 'object',
          properties: {
            section_id: {
              type: 'number',
              description: 'PowerSchool section ID',
            },
            pagesize: {
              type: 'number',
              description: 'Number of records per page (default: 100)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
          },
          required: ['section_id'],
        },
      },
      {
        name: 'get_grades',
        description: 'Get grade records for a student in a specific section or all sections for a term',
        inputSchema: {
          type: 'object',
          properties: {
            student_id: {
              type: 'number',
              description: 'PowerSchool student ID (DCID)',
            },
            section_id: {
              type: 'number',
              description: 'Filter by specific section ID (optional)',
            },
            term_id: {
              type: 'number',
              description: 'Filter by term ID (optional)',
            },
          },
          required: ['student_id'],
        },
      },
      {
        name: 'get_gpa',
        description: 'Get cumulative and term GPA information for a student',
        inputSchema: {
          type: 'object',
          properties: {
            student_id: {
              type: 'number',
              description: 'PowerSchool student ID (DCID)',
            },
          },
          required: ['student_id'],
        },
      },
      {
        name: 'list_terms',
        description: 'List academic terms for a school, including start and end dates and term abbreviations',
        inputSchema: {
          type: 'object',
          properties: {
            school_id: {
              type: 'number',
              description: 'PowerSchool school ID',
            },
            pagesize: {
              type: 'number',
              description: 'Number of records per page (default: 100)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
          },
          required: ['school_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_students':
          return this.listStudents(args);
        case 'get_student':
          return this.getStudent(args);
        case 'list_schools':
          return this.listSchools(args);
        case 'get_school':
          return this.getSchool(args);
        case 'list_sections':
          return this.listSections(args);
        case 'get_section':
          return this.getSection(args);
        case 'list_staff':
          return this.listStaff(args);
        case 'get_staff':
          return this.getStaff(args);
        case 'get_attendance':
          return this.getAttendance(args);
        case 'update_attendance':
          return this.updateAttendance(args);
        case 'list_assignments':
          return this.listAssignments(args);
        case 'get_grades':
          return this.getGrades(args);
        case 'get_gpa':
          return this.getGpa(args);
        case 'list_terms':
          return this.listTerms(args);
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
    const response = await this.fetchWithRetry(`${this.baseUrl}/oauth/access_token`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${this.clientId}:${this.clientSecret}`)}`,
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
      'Accept': 'application/json',
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

  private buildPageParams(args: Record<string, unknown>): URLSearchParams {
    const params = new URLSearchParams();
    params.set('pagesize', String((args.pagesize as number) || 100));
    params.set('page', String((args.page as number) || 1));
    return params;
  }

  private async listStudents(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.buildPageParams(args);
    if (args.school_id) params.set('school_id', String(args.school_id));
    if (args.q) params.set('q', args.q as string);
    return this.apiGet(`/ws/v1/district/student?${params.toString()}`);
  }

  private async getStudent(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.student_id) return { content: [{ type: 'text', text: 'student_id is required' }], isError: true };
    return this.apiGet(`/ws/v1/student/${encodeURIComponent(String(args.student_id))}`);
  }

  private async listSchools(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.buildPageParams(args);
    return this.apiGet(`/ws/v1/district/school?${params.toString()}`);
  }

  private async getSchool(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.school_id) return { content: [{ type: 'text', text: 'school_id is required' }], isError: true };
    return this.apiGet(`/ws/v1/school/${encodeURIComponent(String(args.school_id))}`);
  }

  private async listSections(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.school_id) return { content: [{ type: 'text', text: 'school_id is required' }], isError: true };
    const params = this.buildPageParams(args);
    if (args.term_id) params.set('term_id', String(args.term_id));
    return this.apiGet(`/ws/v1/school/${encodeURIComponent(String(args.school_id))}/section?${params.toString()}`);
  }

  private async getSection(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.section_id) return { content: [{ type: 'text', text: 'section_id is required' }], isError: true };
    return this.apiGet(`/ws/v1/section/${encodeURIComponent(String(args.section_id))}`);
  }

  private async listStaff(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.buildPageParams(args);
    const basePath = args.school_id
      ? `/ws/v1/school/${encodeURIComponent(String(args.school_id))}/staff`
      : '/ws/v1/district/staff';
    return this.apiGet(`${basePath}?${params.toString()}`);
  }

  private async getStaff(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.staff_id) return { content: [{ type: 'text', text: 'staff_id is required' }], isError: true };
    return this.apiGet(`/ws/v1/staff/${encodeURIComponent(String(args.staff_id))}`);
  }

  private async getAttendance(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.student_id) return { content: [{ type: 'text', text: 'student_id is required' }], isError: true };
    const params = new URLSearchParams();
    if (args.from_date) params.set('from_date', args.from_date as string);
    if (args.to_date) params.set('to_date', args.to_date as string);
    const qs = params.toString();
    return this.apiGet(`/ws/v1/student/${encodeURIComponent(String(args.student_id))}/attendance${qs ? '?' + qs : ''}`);
  }

  private async updateAttendance(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.student_id || !args.section_id || !args.att_date || args.code_id === undefined) {
      return { content: [{ type: 'text', text: 'student_id, section_id, att_date, and code_id are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      attendance: {
        student_id: args.student_id,
        section_id: args.section_id,
        att_date: args.att_date,
        code_id: args.code_id,
      },
    };
    if (args.period_id !== undefined) {
      (body.attendance as Record<string, unknown>).period_id = args.period_id;
    }
    return this.apiPost('/ws/v1/student/attendance', body);
  }

  private async listAssignments(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.section_id) return { content: [{ type: 'text', text: 'section_id is required' }], isError: true };
    const params = this.buildPageParams(args);
    return this.apiGet(`/ws/v1/section/${encodeURIComponent(String(args.section_id))}/assignment?${params.toString()}`);
  }

  private async getGrades(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.student_id) return { content: [{ type: 'text', text: 'student_id is required' }], isError: true };
    const params = new URLSearchParams();
    if (args.section_id) params.set('section_id', String(args.section_id));
    if (args.term_id) params.set('term_id', String(args.term_id));
    const qs = params.toString();
    return this.apiGet(`/ws/v1/student/${encodeURIComponent(String(args.student_id))}/grade${qs ? '?' + qs : ''}`);
  }

  private async getGpa(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.student_id) return { content: [{ type: 'text', text: 'student_id is required' }], isError: true };
    return this.apiGet(`/ws/v1/student/${encodeURIComponent(String(args.student_id))}/gpa`);
  }

  private async listTerms(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.school_id) return { content: [{ type: 'text', text: 'school_id is required' }], isError: true };
    const params = this.buildPageParams(args);
    return this.apiGet(`/ws/v1/school/${encodeURIComponent(String(args.school_id))}/term?${params.toString()}`);
  }
}

/**
 * Clever Data API MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// No official Clever Data API MCP server was found on GitHub. We build a full REST wrapper
// for complete Data API coverage.
//
// Base URL: https://api.clever.com/v1.2
// Auth: HTTP Bearer token (OAuth2 access token — obtain via Clever OAuth2 flow)
// Docs: https://dev.clever.com/reference
// Spec: https://api.apis.guru/v2/specs/clever.com/1.2.0/openapi.json
// Category: education
// Rate limits: See Clever docs — Data API is scoped to district data access

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface CleverConfig {
  accessToken: string;
  baseUrl?: string;
}

export class CleverMCPServer extends MCPAdapterBase {
  private readonly accessToken: string;
  private readonly baseUrl: string;

  constructor(config: CleverConfig) {
    super();
    this.accessToken = config.accessToken;
    this.baseUrl = config.baseUrl || 'https://api.clever.com/v1.2';
  }

  static catalog() {
    return {
      name: 'clever',
      displayName: 'Clever Data API',
      version: '1.0.0',
      category: 'education',
      keywords: [
        'clever', 'education', 'edtech', 'school', 'district', 'student', 'teacher',
        'section', 'roster', 'contact', 'admin', 'school admin', 'district admin',
        'grade', 'curriculum', 'classroom', 'learning', 'k-12',
      ],
      toolNames: [
        'list_contacts', 'get_contact', 'get_contact_district', 'get_contact_student',
        'list_district_admins', 'get_district_admin',
        'list_districts', 'get_district', 'get_district_admins', 'get_district_schools',
        'get_district_sections', 'get_district_status', 'get_district_students', 'get_district_teachers',
        'list_school_admins', 'get_school_admin', 'get_school_admin_schools',
        'list_schools', 'get_school', 'get_school_district', 'get_school_sections',
        'get_school_students', 'get_school_teachers',
        'list_sections', 'get_section', 'get_section_district', 'get_section_school',
        'get_section_students', 'get_section_teacher', 'get_section_teachers',
        'list_students', 'get_student', 'get_student_contacts', 'get_student_district',
        'get_student_school', 'get_student_sections', 'get_student_teachers',
        'list_teachers', 'get_teacher', 'get_teacher_district', 'get_teacher_grade_levels',
        'get_teacher_school', 'get_teacher_sections', 'get_teacher_students',
      ],
      description: 'Clever Data API: access K-12 district, school, student, teacher, section, contact, and roster data via the Clever education platform.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      // ── Contacts ───────────────────────────────────────────────────────────
      {
        name: 'list_contacts',
        description: 'Returns a list of student contacts accessible to the authenticated application',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Maximum number of contacts to return' },
            starting_after: { type: 'string', description: 'Cursor for pagination — return records after this ID' },
            ending_before: { type: 'string', description: 'Cursor for pagination — return records before this ID' },
          },
        },
      },
      {
        name: 'get_contact',
        description: 'Returns a specific student contact by Clever contact ID',
        inputSchema: {
          type: 'object',
          properties: { id: { type: 'string', description: 'Clever contact ID' } },
          required: ['id'],
        },
      },
      {
        name: 'get_contact_district',
        description: 'Returns the district associated with a specific student contact',
        inputSchema: {
          type: 'object',
          properties: { id: { type: 'string', description: 'Clever contact ID' } },
          required: ['id'],
        },
      },
      {
        name: 'get_contact_student',
        description: 'Returns the student associated with a specific contact',
        inputSchema: {
          type: 'object',
          properties: { id: { type: 'string', description: 'Clever contact ID' } },
          required: ['id'],
        },
      },
      // ── District Admins ────────────────────────────────────────────────────
      {
        name: 'list_district_admins',
        description: 'Returns a list of district admins accessible to the authenticated application',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Maximum number of district admins to return' },
            starting_after: { type: 'string', description: 'Cursor for pagination — return records after this ID' },
            ending_before: { type: 'string', description: 'Cursor for pagination — return records before this ID' },
          },
        },
      },
      {
        name: 'get_district_admin',
        description: 'Returns a specific district admin by Clever district admin ID',
        inputSchema: {
          type: 'object',
          properties: { id: { type: 'string', description: 'Clever district admin ID' } },
          required: ['id'],
        },
      },
      // ── Districts ──────────────────────────────────────────────────────────
      {
        name: 'list_districts',
        description: 'Returns a list of districts accessible to the authenticated application — in practice returns only the district the token is scoped to',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'get_district',
        description: 'Returns a specific district by Clever district ID',
        inputSchema: {
          type: 'object',
          properties: { id: { type: 'string', description: 'Clever district ID' } },
          required: ['id'],
        },
      },
      {
        name: 'get_district_admins',
        description: 'Returns the admins for a specific district',
        inputSchema: {
          type: 'object',
          properties: { id: { type: 'string', description: 'Clever district ID' } },
          required: ['id'],
        },
      },
      {
        name: 'get_district_schools',
        description: 'Returns the schools within a specific district',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Clever district ID' },
            limit: { type: 'number', description: 'Maximum number of schools to return' },
          },
          required: ['id'],
        },
      },
      {
        name: 'get_district_sections',
        description: 'Returns the sections within a specific district',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Clever district ID' },
            limit: { type: 'number', description: 'Maximum number of sections to return' },
          },
          required: ['id'],
        },
      },
      {
        name: 'get_district_status',
        description: 'Returns the sync status for a specific district — shows last sync timestamp and sync state',
        inputSchema: {
          type: 'object',
          properties: { id: { type: 'string', description: 'Clever district ID' } },
          required: ['id'],
        },
      },
      {
        name: 'get_district_students',
        description: 'Returns the students enrolled in a specific district',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Clever district ID' },
            limit: { type: 'number', description: 'Maximum number of students to return' },
          },
          required: ['id'],
        },
      },
      {
        name: 'get_district_teachers',
        description: 'Returns the teachers employed in a specific district',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Clever district ID' },
            limit: { type: 'number', description: 'Maximum number of teachers to return' },
          },
          required: ['id'],
        },
      },
      // ── School Admins ──────────────────────────────────────────────────────
      {
        name: 'list_school_admins',
        description: 'Returns a list of school admins accessible to the authenticated application',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Maximum number of school admins to return' },
            starting_after: { type: 'string', description: 'Cursor for pagination — return records after this ID' },
            ending_before: { type: 'string', description: 'Cursor for pagination — return records before this ID' },
          },
        },
      },
      {
        name: 'get_school_admin',
        description: 'Returns a specific school admin by Clever school admin ID',
        inputSchema: {
          type: 'object',
          properties: { id: { type: 'string', description: 'Clever school admin ID' } },
          required: ['id'],
        },
      },
      {
        name: 'get_school_admin_schools',
        description: 'Returns the schools managed by a specific school admin',
        inputSchema: {
          type: 'object',
          properties: { id: { type: 'string', description: 'Clever school admin ID' } },
          required: ['id'],
        },
      },
      // ── Schools ────────────────────────────────────────────────────────────
      {
        name: 'list_schools',
        description: 'Returns a list of schools accessible to the authenticated application',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Maximum number of schools to return' },
            starting_after: { type: 'string', description: 'Cursor for pagination — return records after this ID' },
            ending_before: { type: 'string', description: 'Cursor for pagination — return records before this ID' },
          },
        },
      },
      {
        name: 'get_school',
        description: 'Returns a specific school by Clever school ID',
        inputSchema: {
          type: 'object',
          properties: { id: { type: 'string', description: 'Clever school ID' } },
          required: ['id'],
        },
      },
      {
        name: 'get_school_district',
        description: 'Returns the district that a specific school belongs to',
        inputSchema: {
          type: 'object',
          properties: { id: { type: 'string', description: 'Clever school ID' } },
          required: ['id'],
        },
      },
      {
        name: 'get_school_sections',
        description: 'Returns the sections taught at a specific school',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Clever school ID' },
            limit: { type: 'number', description: 'Maximum number of sections to return' },
          },
          required: ['id'],
        },
      },
      {
        name: 'get_school_students',
        description: 'Returns the students enrolled at a specific school',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Clever school ID' },
            limit: { type: 'number', description: 'Maximum number of students to return' },
          },
          required: ['id'],
        },
      },
      {
        name: 'get_school_teachers',
        description: 'Returns the teachers employed at a specific school',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Clever school ID' },
            limit: { type: 'number', description: 'Maximum number of teachers to return' },
          },
          required: ['id'],
        },
      },
      // ── Sections ───────────────────────────────────────────────────────────
      {
        name: 'list_sections',
        description: 'Returns a list of sections (classes/courses) accessible to the authenticated application',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Maximum number of sections to return' },
            starting_after: { type: 'string', description: 'Cursor for pagination — return records after this ID' },
            ending_before: { type: 'string', description: 'Cursor for pagination — return records before this ID' },
          },
        },
      },
      {
        name: 'get_section',
        description: 'Returns a specific section (class/course) by Clever section ID',
        inputSchema: {
          type: 'object',
          properties: { id: { type: 'string', description: 'Clever section ID' } },
          required: ['id'],
        },
      },
      {
        name: 'get_section_district',
        description: 'Returns the district that a specific section belongs to',
        inputSchema: {
          type: 'object',
          properties: { id: { type: 'string', description: 'Clever section ID' } },
          required: ['id'],
        },
      },
      {
        name: 'get_section_school',
        description: 'Returns the school that a specific section is taught at',
        inputSchema: {
          type: 'object',
          properties: { id: { type: 'string', description: 'Clever section ID' } },
          required: ['id'],
        },
      },
      {
        name: 'get_section_students',
        description: 'Returns the students enrolled in a specific section',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Clever section ID' },
            limit: { type: 'number', description: 'Maximum number of students to return' },
          },
          required: ['id'],
        },
      },
      {
        name: 'get_section_teacher',
        description: 'Returns the primary teacher for a specific section',
        inputSchema: {
          type: 'object',
          properties: { id: { type: 'string', description: 'Clever section ID' } },
          required: ['id'],
        },
      },
      {
        name: 'get_section_teachers',
        description: 'Returns all teachers (primary and co-teachers) for a specific section',
        inputSchema: {
          type: 'object',
          properties: { id: { type: 'string', description: 'Clever section ID' } },
          required: ['id'],
        },
      },
      // ── Students ───────────────────────────────────────────────────────────
      {
        name: 'list_students',
        description: 'Returns a list of students accessible to the authenticated application',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Maximum number of students to return' },
            starting_after: { type: 'string', description: 'Cursor for pagination — return records after this ID' },
            ending_before: { type: 'string', description: 'Cursor for pagination — return records before this ID' },
          },
        },
      },
      {
        name: 'get_student',
        description: 'Returns a specific student by Clever student ID',
        inputSchema: {
          type: 'object',
          properties: { id: { type: 'string', description: 'Clever student ID' } },
          required: ['id'],
        },
      },
      {
        name: 'get_student_contacts',
        description: 'Returns the contacts (guardians/parents) for a specific student',
        inputSchema: {
          type: 'object',
          properties: { id: { type: 'string', description: 'Clever student ID' } },
          required: ['id'],
        },
      },
      {
        name: 'get_student_district',
        description: 'Returns the district that a specific student belongs to',
        inputSchema: {
          type: 'object',
          properties: { id: { type: 'string', description: 'Clever student ID' } },
          required: ['id'],
        },
      },
      {
        name: 'get_student_school',
        description: 'Returns the primary school that a specific student is enrolled in',
        inputSchema: {
          type: 'object',
          properties: { id: { type: 'string', description: 'Clever student ID' } },
          required: ['id'],
        },
      },
      {
        name: 'get_student_sections',
        description: 'Returns the sections (classes) that a specific student is enrolled in',
        inputSchema: {
          type: 'object',
          properties: { id: { type: 'string', description: 'Clever student ID' } },
          required: ['id'],
        },
      },
      {
        name: 'get_student_teachers',
        description: 'Returns the teachers of a specific student across all their enrolled sections',
        inputSchema: {
          type: 'object',
          properties: { id: { type: 'string', description: 'Clever student ID' } },
          required: ['id'],
        },
      },
      // ── Teachers ───────────────────────────────────────────────────────────
      {
        name: 'list_teachers',
        description: 'Returns a list of teachers accessible to the authenticated application',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Maximum number of teachers to return' },
            starting_after: { type: 'string', description: 'Cursor for pagination — return records after this ID' },
            ending_before: { type: 'string', description: 'Cursor for pagination — return records before this ID' },
          },
        },
      },
      {
        name: 'get_teacher',
        description: 'Returns a specific teacher by Clever teacher ID',
        inputSchema: {
          type: 'object',
          properties: { id: { type: 'string', description: 'Clever teacher ID' } },
          required: ['id'],
        },
      },
      {
        name: 'get_teacher_district',
        description: 'Returns the district that a specific teacher belongs to',
        inputSchema: {
          type: 'object',
          properties: { id: { type: 'string', description: 'Clever teacher ID' } },
          required: ['id'],
        },
      },
      {
        name: 'get_teacher_grade_levels',
        description: 'Returns the grade levels for sections that a specific teacher teaches',
        inputSchema: {
          type: 'object',
          properties: { id: { type: 'string', description: 'Clever teacher ID' } },
          required: ['id'],
        },
      },
      {
        name: 'get_teacher_school',
        description: 'Returns the primary school that a specific teacher is employed at',
        inputSchema: {
          type: 'object',
          properties: { id: { type: 'string', description: 'Clever teacher ID' } },
          required: ['id'],
        },
      },
      {
        name: 'get_teacher_sections',
        description: 'Returns the sections (classes) taught by a specific teacher',
        inputSchema: {
          type: 'object',
          properties: { id: { type: 'string', description: 'Clever teacher ID' } },
          required: ['id'],
        },
      },
      {
        name: 'get_teacher_students',
        description: 'Returns the students taught by a specific teacher across all their sections',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Clever teacher ID' },
            limit: { type: 'number', description: 'Maximum number of students to return' },
          },
          required: ['id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        // Contacts
        case 'list_contacts':            return this.listResource('/contacts', args);
        case 'get_contact':              return this.getResource('/contacts', args);
        case 'get_contact_district':     return this.getResourceRelation('/contacts', args, 'district');
        case 'get_contact_student':      return this.getResourceRelation('/contacts', args, 'student');
        // District Admins
        case 'list_district_admins':     return this.listResource('/district_admins', args);
        case 'get_district_admin':       return this.getResource('/district_admins', args);
        // Districts
        case 'list_districts':           return this.listResource('/districts', args);
        case 'get_district':             return this.getResource('/districts', args);
        case 'get_district_admins':      return this.getResourceRelation('/districts', args, 'admins');
        case 'get_district_schools':     return this.getResourceRelation('/districts', args, 'schools');
        case 'get_district_sections':    return this.getResourceRelation('/districts', args, 'sections');
        case 'get_district_status':      return this.getResourceRelation('/districts', args, 'status');
        case 'get_district_students':    return this.getResourceRelation('/districts', args, 'students');
        case 'get_district_teachers':    return this.getResourceRelation('/districts', args, 'teachers');
        // School Admins
        case 'list_school_admins':       return this.listResource('/school_admins', args);
        case 'get_school_admin':         return this.getResource('/school_admins', args);
        case 'get_school_admin_schools': return this.getResourceRelation('/school_admins', args, 'schools');
        // Schools
        case 'list_schools':             return this.listResource('/schools', args);
        case 'get_school':               return this.getResource('/schools', args);
        case 'get_school_district':      return this.getResourceRelation('/schools', args, 'district');
        case 'get_school_sections':      return this.getResourceRelation('/schools', args, 'sections');
        case 'get_school_students':      return this.getResourceRelation('/schools', args, 'students');
        case 'get_school_teachers':      return this.getResourceRelation('/schools', args, 'teachers');
        // Sections
        case 'list_sections':            return this.listResource('/sections', args);
        case 'get_section':              return this.getResource('/sections', args);
        case 'get_section_district':     return this.getResourceRelation('/sections', args, 'district');
        case 'get_section_school':       return this.getResourceRelation('/sections', args, 'school');
        case 'get_section_students':     return this.getResourceRelation('/sections', args, 'students');
        case 'get_section_teacher':      return this.getResourceRelation('/sections', args, 'teacher');
        case 'get_section_teachers':     return this.getResourceRelation('/sections', args, 'teachers');
        // Students
        case 'list_students':            return this.listResource('/students', args);
        case 'get_student':              return this.getResource('/students', args);
        case 'get_student_contacts':     return this.getResourceRelation('/students', args, 'contacts');
        case 'get_student_district':     return this.getResourceRelation('/students', args, 'district');
        case 'get_student_school':       return this.getResourceRelation('/students', args, 'school');
        case 'get_student_sections':     return this.getResourceRelation('/students', args, 'sections');
        case 'get_student_teachers':     return this.getResourceRelation('/students', args, 'teachers');
        // Teachers
        case 'list_teachers':            return this.listResource('/teachers', args);
        case 'get_teacher':              return this.getResource('/teachers', args);
        case 'get_teacher_district':     return this.getResourceRelation('/teachers', args, 'district');
        case 'get_teacher_grade_levels': return this.getResourceRelation('/teachers', args, 'grade_levels');
        case 'get_teacher_school':       return this.getResourceRelation('/teachers', args, 'school');
        case 'get_teacher_sections':     return this.getResourceRelation('/teachers', args, 'sections');
        case 'get_teacher_students':     return this.getResourceRelation('/teachers', args, 'students');
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

  // ── Private helpers ────────────────────────────────────────────────────────

  private buildQuery(params: Record<string, unknown>): string {
    const allowed = ['limit', 'starting_after', 'ending_before'];
    const parts: string[] = [];
    for (const key of allowed) {
      if (params[key] !== undefined) {
        parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(params[key]))}`);
      }
    }
    return parts.length > 0 ? `?${parts.join('&')}` : '';
  }

  private async request(path: string): Promise<ToolResult> {
    const url = `${this.baseUrl}${path}`;
    const response = await this.fetchWithRetry(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        Accept: 'application/json',
      },
    });
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${errText}` }],
        isError: true,
      };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listResource(resourcePath: string, args: Record<string, unknown>): Promise<ToolResult> {
    return this.request(`${resourcePath}${this.buildQuery(args)}`);
  }

  private async getResource(resourcePath: string, args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) {
      return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    }
    return this.request(`${resourcePath}/${encodeURIComponent(args.id as string)}`);
  }

  private async getResourceRelation(
    resourcePath: string,
    args: Record<string, unknown>,
    relation: string,
  ): Promise<ToolResult> {
    if (!args.id) {
      return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    }
    const query = this.buildQuery(args);
    return this.request(`${resourcePath}/${encodeURIComponent(args.id as string)}/${relation}${query}`);
  }
}

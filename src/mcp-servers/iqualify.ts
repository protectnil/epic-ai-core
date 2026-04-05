/**
 * iQualify MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// No official iQualify MCP server was found on GitHub, npm, or the iQualify developer portal.
// No community-maintained iQualify MCP server appears in major MCP registries.
// Our adapter covers: 25 tools. Vendor MCP covers: 0 tools.
// Recommendation: use-rest-api — no vendor MCP exists. Build this REST wrapper for all deployments.
//
// Base URL: https://api.iqualify.com/v1
// Auth: API Key passed as "Authorization" header (apiKey scheme)
//   Obtain token via iQualify admin portal → Settings → API Access
// Docs: https://iqualify.com/developers/
// Rate limits: Not published. Use reasonable request spacing per plan tier.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface IQualifyConfig {
  apiKey: string;
  baseUrl?: string;
}

export class IQualifyMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: IQualifyConfig) {
    super();
    this.apiKey  = config.apiKey;
    this.baseUrl = config.baseUrl ?? 'https://api.iqualify.com/v1';
  }

  static catalog() {
    return {
      name: 'iqualify',
      displayName: 'iQualify',
      version: '1.0.0',
      category: 'education',
      keywords: [
        'iqualify', 'lms', 'learning', 'education', 'elearning', 'course', 'offering',
        'learner', 'assessment', 'quiz', 'assignment', 'progress', 'badge',
        'enrollment', 'cohort', 'discussion', 'channel', 'analytics',
        'learning management', 'online learning', 'training', 'certification',
        'user management', 'course mapping', 'marks', 'grading',
      ],
      toolNames: [
        'list_courses',
        'get_course',
        'list_offerings',
        'get_offering',
        'create_offering',
        'update_offering',
        'list_current_offerings',
        'list_past_offerings',
        'list_future_offerings',
        'get_offerings_summary',
        'get_offering_users',
        'add_user_to_offering',
        'remove_user_from_offering',
        'get_learner_progress',
        'get_all_learners_progress',
        'get_offering_assessments',
        'get_quiz_marks',
        'get_assignment_marks',
        'get_open_response_activities',
        'list_users',
        'get_user',
        'create_user',
        'update_user',
        'suspend_user',
        'award_badge',
      ],
      description: 'iQualify learning management platform: manage courses, offerings, learner enrollment, assessment marks, progress tracking, badges, and discussion channels.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      // ── Courses ────────────────────────────────────────────────────────────
      {
        name: 'list_courses',
        description: 'List all courses available in the iQualify organisation',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_course',
        description: 'Get full details for a specific course including metadata, permissions, and activations by content ID',
        inputSchema: {
          type: 'object',
          properties: {
            content_id: {
              type: 'string',
              description: 'iQualify course content ID',
            },
          },
          required: ['content_id'],
        },
      },
      // ── Offerings ─────────────────────────────────────────────────────────
      {
        name: 'list_offerings',
        description: 'List all offerings (current, past, and future) across the organisation',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_offering',
        description: 'Get full details for a specific offering by offering ID — includes dates, status, and learner count',
        inputSchema: {
          type: 'object',
          properties: {
            offering_id: {
              type: 'string',
              description: 'iQualify offering ID',
            },
          },
          required: ['offering_id'],
        },
      },
      {
        name: 'create_offering',
        description: 'Create a new course offering with scheduled start and end dates',
        inputSchema: {
          type: 'object',
          properties: {
            content_id: {
              type: 'string',
              description: 'Content ID of the course to create an offering for',
            },
            label: {
              type: 'string',
              description: 'Display label/name for the offering',
            },
            starts: {
              type: 'string',
              description: 'Offering start date in ISO 8601 format (e.g. 2026-05-01T00:00:00Z)',
            },
            ends: {
              type: 'string',
              description: 'Offering end date in ISO 8601 format (e.g. 2026-08-01T00:00:00Z)',
            },
            self_enrol: {
              type: 'boolean',
              description: 'Allow learners to self-enrol (default: false)',
            },
          },
          required: ['content_id', 'label', 'starts', 'ends'],
        },
      },
      {
        name: 'update_offering',
        description: 'Update an existing offering — change label, dates, or self-enrolment setting',
        inputSchema: {
          type: 'object',
          properties: {
            offering_id: {
              type: 'string',
              description: 'iQualify offering ID to update',
            },
            label: {
              type: 'string',
              description: 'Updated display label/name',
            },
            starts: {
              type: 'string',
              description: 'Updated start date in ISO 8601 format',
            },
            ends: {
              type: 'string',
              description: 'Updated end date in ISO 8601 format',
            },
            self_enrol: {
              type: 'boolean',
              description: 'Updated self-enrolment setting',
            },
          },
          required: ['offering_id'],
        },
      },
      {
        name: 'list_current_offerings',
        description: 'List all currently active (open) offerings in the organisation',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'list_past_offerings',
        description: 'List all past (closed/expired) offerings in the organisation',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'list_future_offerings',
        description: 'List all scheduled (future) offerings that have not yet started',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_offerings_summary',
        description: 'Get a summary of all offerings including counts and status breakdown',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      // ── Offering Users ─────────────────────────────────────────────────────
      {
        name: 'get_offering_users',
        description: 'List all users (learners, coaches, facilitators) enrolled in a specific offering',
        inputSchema: {
          type: 'object',
          properties: {
            offering_id: {
              type: 'string',
              description: 'iQualify offering ID',
            },
          },
          required: ['offering_id'],
        },
      },
      {
        name: 'add_user_to_offering',
        description: 'Enroll a user into an offering as a learner by their email address',
        inputSchema: {
          type: 'object',
          properties: {
            offering_id: {
              type: 'string',
              description: 'iQualify offering ID',
            },
            user_email: {
              type: 'string',
              description: 'Email address of the user to enroll',
            },
            role: {
              type: 'string',
              description: 'Role to assign: learner, coach, or facilitator (default: learner)',
            },
          },
          required: ['offering_id', 'user_email'],
        },
      },
      {
        name: 'remove_user_from_offering',
        description: 'Remove a user from an offering by their email address',
        inputSchema: {
          type: 'object',
          properties: {
            offering_id: {
              type: 'string',
              description: 'iQualify offering ID',
            },
            user_email: {
              type: 'string',
              description: 'Email address of the user to remove',
            },
          },
          required: ['offering_id', 'user_email'],
        },
      },
      // ── Progress & Analytics ───────────────────────────────────────────────
      {
        name: 'get_learner_progress',
        description: 'Get a specific learner\'s progress in a specific offering — completion percentage, time spent, and unit status',
        inputSchema: {
          type: 'object',
          properties: {
            offering_id: {
              type: 'string',
              description: 'iQualify offering ID',
            },
            user_email: {
              type: 'string',
              description: 'Email address of the learner',
            },
          },
          required: ['offering_id', 'user_email'],
        },
      },
      {
        name: 'get_all_learners_progress',
        description: 'Get progress data for all learners in an offering — bulk progress report for reporting and analytics',
        inputSchema: {
          type: 'object',
          properties: {
            offering_id: {
              type: 'string',
              description: 'iQualify offering ID',
            },
          },
          required: ['offering_id'],
        },
      },
      // ── Assessments & Marks ────────────────────────────────────────────────
      {
        name: 'get_offering_assessments',
        description: 'List all assessments (quizzes, assignments, open response) in an offering',
        inputSchema: {
          type: 'object',
          properties: {
            offering_id: {
              type: 'string',
              description: 'iQualify offering ID',
            },
          },
          required: ['offering_id'],
        },
      },
      {
        name: 'get_quiz_marks',
        description: 'Get quiz attempt marks and scores for all learners in an offering',
        inputSchema: {
          type: 'object',
          properties: {
            offering_id: {
              type: 'string',
              description: 'iQualify offering ID',
            },
          },
          required: ['offering_id'],
        },
      },
      {
        name: 'get_assignment_marks',
        description: 'Get assignment submission marks and grades for all learners in an offering',
        inputSchema: {
          type: 'object',
          properties: {
            offering_id: {
              type: 'string',
              description: 'iQualify offering ID',
            },
          },
          required: ['offering_id'],
        },
      },
      {
        name: 'get_open_response_activities',
        description: 'Get open response (written answer) activity submissions and responses for an offering',
        inputSchema: {
          type: 'object',
          properties: {
            offering_id: {
              type: 'string',
              description: 'iQualify offering ID',
            },
          },
          required: ['offering_id'],
        },
      },
      // ── Users ──────────────────────────────────────────────────────────────
      {
        name: 'list_users',
        description: 'List all users in the iQualify organisation with their roles and profile details',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_user',
        description: 'Get profile details for a specific user by their email address',
        inputSchema: {
          type: 'object',
          properties: {
            user_email: {
              type: 'string',
              description: 'Email address of the user',
            },
          },
          required: ['user_email'],
        },
      },
      {
        name: 'create_user',
        description: 'Create a new user account in the iQualify organisation and optionally send an invitation email',
        inputSchema: {
          type: 'object',
          properties: {
            email: {
              type: 'string',
              description: 'Email address for the new user (must be unique)',
            },
            first_name: {
              type: 'string',
              description: 'User\'s first name',
            },
            last_name: {
              type: 'string',
              description: 'User\'s last name',
            },
            role: {
              type: 'string',
              description: 'Organisation role: learner, facilitator, or admin (default: learner)',
            },
          },
          required: ['email', 'first_name', 'last_name'],
        },
      },
      {
        name: 'update_user',
        description: 'Update profile fields for an existing user by email — name, role, or custom attributes',
        inputSchema: {
          type: 'object',
          properties: {
            user_email: {
              type: 'string',
              description: 'Email address of the user to update',
            },
            first_name: {
              type: 'string',
              description: 'Updated first name',
            },
            last_name: {
              type: 'string',
              description: 'Updated last name',
            },
          },
          required: ['user_email'],
        },
      },
      {
        name: 'suspend_user',
        description: 'Suspend a user account — prevents login and access to all offerings without deleting the user',
        inputSchema: {
          type: 'object',
          properties: {
            user_email: {
              type: 'string',
              description: 'Email address of the user to suspend',
            },
          },
          required: ['user_email'],
        },
      },
      // ── Badges ─────────────────────────────────────────────────────────────
      {
        name: 'award_badge',
        description: 'Award a completion or achievement badge to a learner in a specific offering',
        inputSchema: {
          type: 'object',
          properties: {
            offering_id: {
              type: 'string',
              description: 'iQualify offering ID associated with the badge',
            },
            user_email: {
              type: 'string',
              description: 'Email address of the learner to award the badge to',
            },
            badge_id: {
              type: 'string',
              description: 'ID of the badge to award (from get_offering_badges)',
            },
          },
          required: ['offering_id', 'user_email', 'badge_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_courses':               return this.listCourses();
        case 'get_course':                 return this.getCourse(args);
        case 'list_offerings':             return this.listOfferings();
        case 'get_offering':               return this.getOffering(args);
        case 'create_offering':            return this.createOffering(args);
        case 'update_offering':            return this.updateOffering(args);
        case 'list_current_offerings':     return this.get('/offerings/current');
        case 'list_past_offerings':        return this.get('/offerings/past');
        case 'list_future_offerings':      return this.get('/offerings/future');
        case 'get_offerings_summary':      return this.get('/offerings/summary');
        case 'get_offering_users':         return this.getOfferingUsers(args);
        case 'add_user_to_offering':       return this.addUserToOffering(args);
        case 'remove_user_from_offering':  return this.removeUserFromOffering(args);
        case 'get_learner_progress':       return this.getLearnerProgress(args);
        case 'get_all_learners_progress':  return this.getAllLearnersProgress(args);
        case 'get_offering_assessments':   return this.getOfferingAssessments(args);
        case 'get_quiz_marks':             return this.getQuizMarks(args);
        case 'get_assignment_marks':       return this.getAssignmentMarks(args);
        case 'get_open_response_activities': return this.getOpenResponseActivities(args);
        case 'list_users':                 return this.get('/users');
        case 'get_user':                   return this.getUser(args);
        case 'create_user':                return this.createUser(args);
        case 'update_user':                return this.updateUser(args);
        case 'suspend_user':               return this.suspendUser(args);
        case 'award_badge':                return this.awardBadge(args);
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

  private async get(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      headers: {
        Authorization: this.apiKey,
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async post(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: {
        Authorization: this.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async patch(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'PATCH',
      headers: {
        Authorization: this.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async put(path: string, body: Record<string, unknown> = {}): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'PUT',
      headers: {
        Authorization: this.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async delete(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'DELETE',
      headers: {
        Authorization: this.apiKey,
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }
    return { content: [{ type: 'text', text: JSON.stringify({ success: true, status: response.status }) }], isError: false };
  }

  // ── Course methods ─────────────────────────────────────────────────────────

  private async listCourses(): Promise<ToolResult> {
    return this.get('/courses');
  }

  private async getCourse(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.content_id) return { content: [{ type: 'text', text: 'content_id is required' }], isError: true };
    return this.get(`/courses/${encodeURIComponent(args.content_id as string)}`);
  }

  // ── Offering methods ───────────────────────────────────────────────────────

  private async listOfferings(): Promise<ToolResult> {
    return this.get('/offerings');
  }

  private async getOffering(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.offering_id) return { content: [{ type: 'text', text: 'offering_id is required' }], isError: true };
    return this.get(`/offerings/${encodeURIComponent(args.offering_id as string)}`);
  }

  private async createOffering(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.content_id) return { content: [{ type: 'text', text: 'content_id is required' }], isError: true };
    if (!args.label) return { content: [{ type: 'text', text: 'label is required' }], isError: true };
    if (!args.starts) return { content: [{ type: 'text', text: 'starts is required' }], isError: true };
    if (!args.ends) return { content: [{ type: 'text', text: 'ends is required' }], isError: true };
    const body: Record<string, unknown> = {
      contentId: args.content_id,
      label: args.label,
      starts: args.starts,
      ends: args.ends,
    };
    if (args.self_enrol != null) body.selfEnrol = args.self_enrol;
    return this.post('/offerings', body);
  }

  private async updateOffering(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.offering_id) return { content: [{ type: 'text', text: 'offering_id is required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.label) body.label = args.label;
    if (args.starts) body.starts = args.starts;
    if (args.ends) body.ends = args.ends;
    if (args.self_enrol != null) body.selfEnrol = args.self_enrol;
    return this.patch(`/offerings/${encodeURIComponent(args.offering_id as string)}`, body);
  }

  private async getOfferingUsers(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.offering_id) return { content: [{ type: 'text', text: 'offering_id is required' }], isError: true };
    return this.get(`/offerings/${encodeURIComponent(args.offering_id as string)}/users`);
  }

  private async addUserToOffering(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.offering_id) return { content: [{ type: 'text', text: 'offering_id is required' }], isError: true };
    if (!args.user_email) return { content: [{ type: 'text', text: 'user_email is required' }], isError: true };
    const body: Record<string, unknown> = { role: args.role ?? 'learner' };
    return this.post(`/offerings/${encodeURIComponent(args.offering_id as string)}/users`, body);
  }

  private async removeUserFromOffering(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.offering_id) return { content: [{ type: 'text', text: 'offering_id is required' }], isError: true };
    if (!args.user_email) return { content: [{ type: 'text', text: 'user_email is required' }], isError: true };
    return this.delete(`/offerings/${encodeURIComponent(args.offering_id as string)}/users/${encodeURIComponent(args.user_email as string)}`);
  }

  // ── Progress & Analytics methods ───────────────────────────────────────────

  private async getLearnerProgress(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.offering_id) return { content: [{ type: 'text', text: 'offering_id is required' }], isError: true };
    if (!args.user_email) return { content: [{ type: 'text', text: 'user_email is required' }], isError: true };
    return this.get(`/users/${encodeURIComponent(args.user_email as string)}/offerings/${encodeURIComponent(args.offering_id as string)}/progress`);
  }

  private async getAllLearnersProgress(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.offering_id) return { content: [{ type: 'text', text: 'offering_id is required' }], isError: true };
    return this.get(`/offerings/${encodeURIComponent(args.offering_id as string)}/analytics/learners-progress`);
  }

  private async getOfferingAssessments(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.offering_id) return { content: [{ type: 'text', text: 'offering_id is required' }], isError: true };
    return this.get(`/offerings/${encodeURIComponent(args.offering_id as string)}/assessments`);
  }

  private async getQuizMarks(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.offering_id) return { content: [{ type: 'text', text: 'offering_id is required' }], isError: true };
    return this.get(`/offerings/${encodeURIComponent(args.offering_id as string)}/analytics/marks/quizzes`);
  }

  private async getAssignmentMarks(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.offering_id) return { content: [{ type: 'text', text: 'offering_id is required' }], isError: true };
    return this.get(`/offerings/${encodeURIComponent(args.offering_id as string)}/analytics/marks/assignments`);
  }

  private async getOpenResponseActivities(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.offering_id) return { content: [{ type: 'text', text: 'offering_id is required' }], isError: true };
    return this.get(`/offerings/${encodeURIComponent(args.offering_id as string)}/activities/openresponse`);
  }

  // ── User methods ───────────────────────────────────────────────────────────

  private async getUser(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.user_email) return { content: [{ type: 'text', text: 'user_email is required' }], isError: true };
    return this.get(`/users/${encodeURIComponent(args.user_email as string)}`);
  }

  private async createUser(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.email) return { content: [{ type: 'text', text: 'email is required' }], isError: true };
    if (!args.first_name) return { content: [{ type: 'text', text: 'first_name is required' }], isError: true };
    if (!args.last_name) return { content: [{ type: 'text', text: 'last_name is required' }], isError: true };
    const body: Record<string, unknown> = {
      email: args.email,
      firstName: args.first_name,
      lastName: args.last_name,
    };
    if (args.role) body.role = args.role;
    return this.post('/users', body);
  }

  private async updateUser(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.user_email) return { content: [{ type: 'text', text: 'user_email is required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.first_name) body.firstName = args.first_name;
    if (args.last_name) body.lastName = args.last_name;
    return this.patch(`/users/${encodeURIComponent(args.user_email as string)}`, body);
  }

  private async suspendUser(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.user_email) return { content: [{ type: 'text', text: 'user_email is required' }], isError: true };
    return this.put(`/users/${encodeURIComponent(args.user_email as string)}/suspend`);
  }

  // ── Badge methods ──────────────────────────────────────────────────────────

  private async awardBadge(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.offering_id) return { content: [{ type: 'text', text: 'offering_id is required' }], isError: true };
    if (!args.user_email) return { content: [{ type: 'text', text: 'user_email is required' }], isError: true };
    if (!args.badge_id) return { content: [{ type: 'text', text: 'badge_id is required' }], isError: true };
    return this.post(
      `/offerings/${encodeURIComponent(args.offering_id as string)}/users/${encodeURIComponent(args.user_email as string)}/badges/award`,
      { badgeId: args.badge_id },
    );
  }
}

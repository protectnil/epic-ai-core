/**
 * Greenhouse ATS MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// No official Greenhouse MCP server was found on GitHub or npm.
//
// Base URL: https://harvest.greenhouse.io/v1
// Auth: HTTP Basic Authentication — API token as username, empty password.
//       Header: Authorization: Basic base64(token:)
//       Obtain your Harvest API token from Greenhouse Settings → Dev Center → API Credential Management.
// Docs: https://developers.greenhouse.io/harvest.html
// Rate limits: 50 requests per 10-second window per integration (X-RateLimit-Limit header).
//              HTTP 429 returned on breach; retry after X-RateLimit-Reset or Retry-After header value.
// Note: Harvest API v1 is deprecated after August 31, 2026. Plan migration to Harvest v3.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface GreenhouseConfig {
  apiToken: string;
  baseUrl?: string;
}

export class GreenhouseMCPServer extends MCPAdapterBase {
  private readonly apiToken: string;
  private readonly baseUrl: string;

  constructor(config: GreenhouseConfig) {
    super();
    this.apiToken = config.apiToken;
    this.baseUrl = config.baseUrl || 'https://harvest.greenhouse.io/v1';
  }

  static catalog() {
    return {
      name: 'greenhouse',
      displayName: 'Greenhouse ATS',
      version: '1.0.0',
      category: 'misc',
      keywords: [
        'greenhouse', 'ats', 'recruiting', 'hiring', 'candidates', 'jobs', 'applications',
        'offers', 'interviews', 'scorecards', 'departments', 'talent', 'hr', 'onboarding',
      ],
      toolNames: [
        'list_candidates',
        'get_candidate',
        'search_candidates',
        'list_jobs',
        'get_job',
        'list_applications',
        'get_application',
        'advance_application',
        'reject_application',
        'list_offers',
        'get_offer',
        'list_scheduled_interviews',
        'get_scheduled_interview',
        'list_scorecards',
        'list_departments',
        'list_users',
        'get_user',
      ],
      description: 'Greenhouse ATS: manage candidates, jobs, applications, offers, interviews, and scorecards for recruiting operations.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_candidates',
        description: 'List candidates in Greenhouse with optional filters for email, updated date range, and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            email: {
              type: 'string',
              description: 'Filter candidates by email address (exact match)',
            },
            updated_after: {
              type: 'string',
              description: 'Return candidates updated after this ISO 8601 timestamp (e.g. 2024-01-01T00:00:00Z)',
            },
            updated_before: {
              type: 'string',
              description: 'Return candidates updated before this ISO 8601 timestamp',
            },
            per_page: {
              type: 'number',
              description: 'Number of candidates per page (default: 100, max: 500)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
          },
        },
      },
      {
        name: 'get_candidate',
        description: 'Retrieve a single candidate by ID including contact info, applications, and tags',
        inputSchema: {
          type: 'object',
          properties: {
            candidate_id: {
              type: 'number',
              description: 'Numeric ID of the candidate',
            },
          },
          required: ['candidate_id'],
        },
      },
      {
        name: 'search_candidates',
        description: 'Search candidates by first name, last name, or email address query string',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search term to match against candidate first name, last name, or email',
            },
            per_page: {
              type: 'number',
              description: 'Number of results per page (default: 100, max: 500)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'list_jobs',
        description: 'List all jobs with optional filters for status, department, and updated date range',
        inputSchema: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              description: 'Filter by job status: open, closed, draft (default: open)',
            },
            department_id: {
              type: 'number',
              description: 'Filter jobs by department ID',
            },
            updated_after: {
              type: 'string',
              description: 'Return jobs updated after this ISO 8601 timestamp',
            },
            per_page: {
              type: 'number',
              description: 'Number of jobs per page (default: 100, max: 500)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
          },
        },
      },
      {
        name: 'get_job',
        description: 'Retrieve a single job by ID with full details including stages, departments, and hiring team',
        inputSchema: {
          type: 'object',
          properties: {
            job_id: {
              type: 'number',
              description: 'Numeric ID of the job',
            },
          },
          required: ['job_id'],
        },
      },
      {
        name: 'list_applications',
        description: 'List applications with optional filters for job, status, candidate, and date range',
        inputSchema: {
          type: 'object',
          properties: {
            job_id: {
              type: 'number',
              description: 'Filter applications by job ID',
            },
            candidate_id: {
              type: 'number',
              description: 'Filter applications for a specific candidate ID',
            },
            status: {
              type: 'string',
              description: 'Filter by status: active, rejected, hired (default: all)',
            },
            updated_after: {
              type: 'string',
              description: 'Return applications updated after this ISO 8601 timestamp',
            },
            per_page: {
              type: 'number',
              description: 'Number of results per page (default: 100, max: 500)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
          },
        },
      },
      {
        name: 'get_application',
        description: 'Retrieve a single application by ID including current stage, status, and rejection details',
        inputSchema: {
          type: 'object',
          properties: {
            application_id: {
              type: 'number',
              description: 'Numeric ID of the application',
            },
          },
          required: ['application_id'],
        },
      },
      {
        name: 'advance_application',
        description: 'Move an application to the next stage in the hiring pipeline',
        inputSchema: {
          type: 'object',
          properties: {
            application_id: {
              type: 'number',
              description: 'Numeric ID of the application to advance',
            },
            from_stage_id: {
              type: 'number',
              description: 'ID of the current stage the application is being moved from',
            },
          },
          required: ['application_id', 'from_stage_id'],
        },
      },
      {
        name: 'reject_application',
        description: 'Reject an application with a rejection reason and optional note',
        inputSchema: {
          type: 'object',
          properties: {
            application_id: {
              type: 'number',
              description: 'Numeric ID of the application to reject',
            },
            rejection_reason_id: {
              type: 'number',
              description: 'ID of the rejection reason (obtain from GET /v1/rejection_reasons)',
            },
            notes: {
              type: 'string',
              description: 'Optional internal note explaining the rejection',
            },
            on_behalf_of: {
              type: 'number',
              description: 'Greenhouse user ID of the person performing the rejection',
            },
          },
          required: ['application_id', 'rejection_reason_id'],
        },
      },
      {
        name: 'list_offers',
        description: 'List all offers for a specific application including status, salary, and start date',
        inputSchema: {
          type: 'object',
          properties: {
            application_id: {
              type: 'number',
              description: 'Application ID to list offers for',
            },
          },
          required: ['application_id'],
        },
      },
      {
        name: 'get_offer',
        description: 'Retrieve a specific offer by ID with full compensation and status details',
        inputSchema: {
          type: 'object',
          properties: {
            offer_id: {
              type: 'number',
              description: 'Numeric ID of the offer',
            },
          },
          required: ['offer_id'],
        },
      },
      {
        name: 'list_scheduled_interviews',
        description: 'List scheduled interviews with optional filters for application, job, and date range',
        inputSchema: {
          type: 'object',
          properties: {
            application_id: {
              type: 'number',
              description: 'Filter interviews for a specific application ID',
            },
            job_id: {
              type: 'number',
              description: 'Filter interviews for a specific job ID',
            },
            starts_after: {
              type: 'string',
              description: 'Return interviews starting after this ISO 8601 timestamp',
            },
            starts_before: {
              type: 'string',
              description: 'Return interviews starting before this ISO 8601 timestamp',
            },
            per_page: {
              type: 'number',
              description: 'Number of results per page (default: 100, max: 500)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
          },
        },
      },
      {
        name: 'get_scheduled_interview',
        description: 'Retrieve a single scheduled interview by ID with attendees, location, and video conferencing details',
        inputSchema: {
          type: 'object',
          properties: {
            interview_id: {
              type: 'number',
              description: 'Numeric ID of the scheduled interview',
            },
          },
          required: ['interview_id'],
        },
      },
      {
        name: 'list_scorecards',
        description: 'List scorecards (interview feedback) for an application with interviewer ratings and notes',
        inputSchema: {
          type: 'object',
          properties: {
            application_id: {
              type: 'number',
              description: 'Application ID to list scorecards for',
            },
            per_page: {
              type: 'number',
              description: 'Number of results per page (default: 100, max: 500)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
          },
          required: ['application_id'],
        },
      },
      {
        name: 'list_departments',
        description: 'List all departments in the organization with IDs for use in job and candidate filters',
        inputSchema: {
          type: 'object',
          properties: {
            per_page: {
              type: 'number',
              description: 'Number of results per page (default: 100, max: 500)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
          },
        },
      },
      {
        name: 'list_users',
        description: 'List all Greenhouse users with their roles, email addresses, and created dates',
        inputSchema: {
          type: 'object',
          properties: {
            email: {
              type: 'string',
              description: 'Filter users by email address (exact match)',
            },
            updated_after: {
              type: 'string',
              description: 'Return users updated after this ISO 8601 timestamp',
            },
            per_page: {
              type: 'number',
              description: 'Number of results per page (default: 100, max: 500)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
          },
        },
      },
      {
        name: 'get_user',
        description: 'Retrieve a single Greenhouse user by ID including roles and permissions',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: {
              type: 'number',
              description: 'Numeric ID of the Greenhouse user',
            },
          },
          required: ['user_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_candidates':
          return this.listCandidates(args);
        case 'get_candidate':
          return this.getCandidate(args);
        case 'search_candidates':
          return this.searchCandidates(args);
        case 'list_jobs':
          return this.listJobs(args);
        case 'get_job':
          return this.getJob(args);
        case 'list_applications':
          return this.listApplications(args);
        case 'get_application':
          return this.getApplication(args);
        case 'advance_application':
          return this.advanceApplication(args);
        case 'reject_application':
          return this.rejectApplication(args);
        case 'list_offers':
          return this.listOffers(args);
        case 'get_offer':
          return this.getOffer(args);
        case 'list_scheduled_interviews':
          return this.listScheduledInterviews(args);
        case 'get_scheduled_interview':
          return this.getScheduledInterview(args);
        case 'list_scorecards':
          return this.listScorecards(args);
        case 'list_departments':
          return this.listDepartments(args);
        case 'list_users':
          return this.listUsers(args);
        case 'get_user':
          return this.getUser(args);
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

  private get authHeader(): string {
    // Basic auth: token as username, empty password
    return `Basic ${Buffer.from(`${this.apiToken}:`).toString('base64')}`;
  }

  private get headers(): Record<string, string> {
    return {
      'Authorization': this.authHeader,
      'Content-Type': 'application/json',
    };
  }

  private async ghGet(path: string, params: Record<string, string> = {}): Promise<ToolResult> {
    const qs = new URLSearchParams(params).toString();
    const url = `${this.baseUrl}${path}${qs ? '?' + qs : ''}`;
    const response = await this.fetchWithRetry(url, { method: 'GET', headers: this.headers });
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `API error: ${response.status} ${errText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async ghPost(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `API error: ${response.status} ${errText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private buildListParams(args: Record<string, unknown>, extra: Record<string, string> = {}): Record<string, string> {
    const params: Record<string, string> = {
      per_page: String((args.per_page as number) || 100),
      page: String((args.page as number) || 1),
      ...extra,
    };
    if (args.updated_after) params.updated_after = args.updated_after as string;
    if (args.updated_before) params.updated_before = args.updated_before as string;
    return params;
  }

  private async listCandidates(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.buildListParams(args);
    if (args.email) params.email = args.email as string;
    return this.ghGet('/candidates', params);
  }

  private async getCandidate(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.candidate_id) return { content: [{ type: 'text', text: 'candidate_id is required' }], isError: true };
    return this.ghGet(`/candidates/${encodeURIComponent(args.candidate_id as string)}`);
  }

  private async searchCandidates(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.query) return { content: [{ type: 'text', text: 'query is required' }], isError: true };
    const params = this.buildListParams(args, { query: args.query as string });
    return this.ghGet('/candidates', params);
  }

  private async listJobs(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.buildListParams(args);
    if (args.status) params.status = args.status as string;
    if (args.department_id) params.department_id = String(args.department_id);
    return this.ghGet('/jobs', params);
  }

  private async getJob(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.job_id) return { content: [{ type: 'text', text: 'job_id is required' }], isError: true };
    return this.ghGet(`/jobs/${encodeURIComponent(args.job_id as string)}`);
  }

  private async listApplications(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.buildListParams(args);
    if (args.job_id) params.job_id = String(args.job_id);
    if (args.candidate_id) params.candidate_id = String(args.candidate_id);
    if (args.status) params.status = args.status as string;
    return this.ghGet('/applications', params);
  }

  private async getApplication(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.application_id) return { content: [{ type: 'text', text: 'application_id is required' }], isError: true };
    return this.ghGet(`/applications/${encodeURIComponent(args.application_id as string)}`);
  }

  private async advanceApplication(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.application_id || !args.from_stage_id) {
      return { content: [{ type: 'text', text: 'application_id and from_stage_id are required' }], isError: true };
    }
    return this.ghPost(`/applications/${encodeURIComponent(args.application_id as string)}/advance`, { from_stage_id: args.from_stage_id });
  }

  private async rejectApplication(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.application_id || !args.rejection_reason_id) {
      return { content: [{ type: 'text', text: 'application_id and rejection_reason_id are required' }], isError: true };
    }
    const body: Record<string, unknown> = { rejection_reason: { id: args.rejection_reason_id } };
    if (args.notes) body.notes = args.notes;
    if (args.on_behalf_of) body.on_behalf_of = args.on_behalf_of;
    return this.ghPost(`/applications/${encodeURIComponent(args.application_id as string)}/reject`, body);
  }

  private async listOffers(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.application_id) return { content: [{ type: 'text', text: 'application_id is required' }], isError: true };
    return this.ghGet(`/applications/${encodeURIComponent(args.application_id as string)}/offers`);
  }

  private async getOffer(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.offer_id) return { content: [{ type: 'text', text: 'offer_id is required' }], isError: true };
    return this.ghGet(`/offers/${encodeURIComponent(args.offer_id as string)}`);
  }

  private async listScheduledInterviews(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.buildListParams(args);
    if (args.application_id) params.application_id = String(args.application_id);
    if (args.job_id) params.job_id = String(args.job_id);
    if (args.starts_after) params.starts_after = args.starts_after as string;
    if (args.starts_before) params.starts_before = args.starts_before as string;
    return this.ghGet('/scheduled_interviews', params);
  }

  private async getScheduledInterview(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.interview_id) return { content: [{ type: 'text', text: 'interview_id is required' }], isError: true };
    return this.ghGet(`/scheduled_interviews/${encodeURIComponent(args.interview_id as string)}`);
  }

  private async listScorecards(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.application_id) return { content: [{ type: 'text', text: 'application_id is required' }], isError: true };
    const params = this.buildListParams(args);
    return this.ghGet(`/applications/${encodeURIComponent(args.application_id as string)}/scorecards`, params);
  }

  private async listDepartments(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.buildListParams(args);
    return this.ghGet('/departments', params);
  }

  private async listUsers(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.buildListParams(args);
    if (args.email) params.email = args.email as string;
    return this.ghGet('/users', params);
  }

  private async getUser(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.user_id) return { content: [{ type: 'text', text: 'user_id is required' }], isError: true };
    return this.ghGet(`/users/${encodeURIComponent(args.user_id as string)}`);
  }
}

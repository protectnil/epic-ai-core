/**
 * BC Gov WorkBC Job Posting MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found — no vendor-published MCP server for this API.
// Our adapter covers: 5 tools (industries, job types, major projects, regions, job feed search).
// Recommendation: Use this adapter for WorkBC job board data from British Columbia.
//
// Base URL: https://workbcjobs.api.gov.bc.ca/v1
// Auth: None required — public open data API
// Docs: https://github.com/bcgov/api-specs/tree/master/jobposting
// License: Open Government License - British Columbia

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface GovBcCaJobPostingConfig {
  /** Optional base URL override (default: https://workbcjobs.api.gov.bc.ca/v1) */
  baseUrl?: string;
}

export class GovBcCaJobPostingMCPServer extends MCPAdapterBase {
  private readonly baseUrl: string;

  constructor(config: GovBcCaJobPostingConfig = {}) {
    super();
    this.baseUrl = config.baseUrl ?? 'https://workbcjobs.api.gov.bc.ca/v1';
  }

  static catalog() {
    return {
      name: 'gov-bc-ca-jobposting',
      displayName: 'BC Gov WorkBC Job Posting',
      version: '1.0.0',
      category: 'government',
      keywords: [
        'bc', 'british columbia', 'workbc', 'jobs', 'job posting', 'employment',
        'careers', 'job board', 'hiring', 'work', 'canada', 'government',
        'industries', 'regions', 'major projects', 'job types',
      ],
      toolNames: [
        'list_industries',
        'list_job_types',
        'list_major_projects',
        'list_regions',
        'search_jobs',
      ],
      description: 'WorkBC Job Posting API — search BC government job board for employment opportunities. Filter by industry, job type, region, major project, and city. Retrieve reference data for industries, job types, regions, and major projects.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_industries',
        description: 'List all industries and sub-industries defined in the WorkBC Job Board — returns IDs and captions for filtering job searches',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'list_job_types',
        description: 'List all job types defined in the WorkBC Job Board (e.g. full-time, part-time, casual) — returns IDs and captions for filtering job searches',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'list_major_projects',
        description: 'List all major projects defined in the WorkBC Job Board — returns IDs and captions for filtering job postings by major project',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'list_regions',
        description: 'List all regions within British Columbia defined in the WorkBC Job Board — returns IDs and captions for filtering job searches by region',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'search_jobs',
        description: 'Search the WorkBC Job Board for job postings in British Columbia. Filter by city, job types, region, major projects flag, and date of last request. Returns job postings changed or deleted since the specified date.',
        inputSchema: {
          type: 'object',
          properties: {
            city: {
              type: 'string',
              description: 'Filter by city name within B.C.: Victoria or Vancouver',
            },
            jobTypes: {
              type: 'array',
              description: 'Array of job type IDs to filter on (obtain IDs from list_job_types)',
              items: { type: 'integer' },
            },
            lastRequestDate: {
              type: 'string',
              description: 'ISO 8601 date — only return postings changed or deleted after this date. Defaults to today minus 10 days (e.g. "2024-01-01")',
            },
            majorProjects: {
              type: 'boolean',
              description: 'true = only postings linked to a Major Project; false = only postings without a Major Project; omit = no filter',
            },
            region: {
              type: 'integer',
              description: 'Filter by region ID (obtain IDs from list_regions)',
            },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_industries':
          return this.listIndustries();
        case 'list_job_types':
          return this.listJobTypes();
        case 'list_major_projects':
          return this.listMajorProjects();
        case 'list_regions':
          return this.listRegions();
        case 'search_jobs':
          return this.searchJobs(args);
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

  private async doGet(path: string): Promise<ToolResult> {
    const url = `${this.baseUrl}${path}`;
    const response = await this.fetchWithRetry(url, { method: 'GET', headers: { Accept: 'application/json' } });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`WorkBC Job Posting API returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async doPost(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const url = `${this.baseUrl}${path}`;
    const response = await this.fetchWithRetry(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`WorkBC Job Posting API returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listIndustries(): Promise<ToolResult> {
    return this.doGet('/Industries');
  }

  private async listJobTypes(): Promise<ToolResult> {
    return this.doGet('/jobTypes');
  }

  private async listMajorProjects(): Promise<ToolResult> {
    return this.doGet('/majorProjects');
  }

  private async listRegions(): Promise<ToolResult> {
    return this.doGet('/regions');
  }

  private async searchJobs(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {};
    if (args.city !== undefined) body.city = args.city;
    if (args.jobTypes !== undefined) body.jobTypes = args.jobTypes;
    if (args.lastRequestDate !== undefined) body.lastRequestDate = args.lastRequestDate;
    if (args.majorProjects !== undefined) body.majorProjects = args.majorProjects;
    if (args.region !== undefined) body.region = args.region;
    return this.doPost('/jobs', body);
  }
}

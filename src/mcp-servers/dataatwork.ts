/**
 * Data at Work (Open Skills API) MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// No official Data at Work / Open Skills API MCP server was found on GitHub or the MCP registry.
//
// Base URL: http://api.dataatwork.org/v1
// Auth: None required (public open data API)
// Docs: http://www.dataatwork.org  |  http://api.dataatwork.org/v1/spec/skills-api.json
// Rate limits: Not publicly documented. Apply reasonable backoff.
// Coverage: jobs (list, get, autocomplete, normalize, unusual titles, related jobs/skills),
//           skills (list, get, autocomplete, normalize, related jobs/skills)
// Note: The Open Skills API is a canonical data store for job titles, skills, and their
//       relationships — maintained by the Work Data Initiative.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface DataatworkConfig {
  baseUrl?: string;
}

export class DataatworkMCPServer extends MCPAdapterBase {
  private readonly baseUrl: string;

  constructor(config: DataatworkConfig = {}) {
    super();
    this.baseUrl = config.baseUrl || 'http://api.dataatwork.org/v1';
  }

  static catalog() {
    return {
      name: 'dataatwork',
      displayName: 'Data at Work (Open Skills API)',
      version: '1.0.0',
      category: 'data',
      keywords: [
        'dataatwork', 'open skills', 'jobs', 'skills', 'job titles', 'workforce',
        'labor market', 'skills taxonomy', 'job normalization', 'skill normalization',
        'related jobs', 'related skills', 'career', 'employment', 'HR', 'recruiting',
        'work data initiative', 'O*NET', 'occupations', 'skill matching',
      ],
      toolNames: [
        'list_jobs', 'get_job', 'autocomplete_jobs', 'normalize_job_title',
        'get_unusual_job_titles', 'get_jobs_related_to_job', 'get_skills_for_job',
        'list_skills', 'get_skill', 'autocomplete_skills', 'normalize_skill_name',
        'get_jobs_related_to_skill', 'get_skills_related_to_skill',
      ],
      description: 'Data at Work Open Skills API: canonical job titles, skill names, and their relationships. Normalize job/skill names, autocomplete, list related occupations and skills, and browse the full workforce skills taxonomy — no authentication required.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_jobs',
        description: 'List job titles and descriptions from the Open Skills taxonomy with pagination. Returns canonical job titles with unique IDs usable in other job tools.',
        inputSchema: {
          type: 'object',
          properties: {
            offset: {
              type: 'integer',
              description: 'Number of job titles to skip for pagination (default: 0)',
            },
            limit: {
              type: 'integer',
              description: 'Maximum number of job titles to return (default: 20, max: 500)',
            },
          },
        },
      },
      {
        name: 'get_job',
        description: 'Retrieve the title and full description for a specific job by its unique ID. Optionally include location-specific data by FIPS code.',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Unique job ID from list_jobs or normalize_job_title results (e.g. "15-1132.00")',
            },
            fips: {
              type: 'string',
              description: 'Optional FIPS geographic code for location-specific job data (e.g. "06" for California, "36061" for Manhattan)',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'autocomplete_jobs',
        description: 'Autocomplete job title searches by prefix, substring, or suffix. Useful for building job title search UIs or finding canonical matches for partial inputs.',
        inputSchema: {
          type: 'object',
          properties: {
            begins_with: {
              type: 'string',
              description: 'Return job titles that begin with this string (e.g. "soft" returns "Software Engineer", "Software Developer")',
            },
            contains: {
              type: 'string',
              description: 'Return job titles that contain this string (e.g. "data" returns "Data Scientist", "Data Analyst", "Big Data Engineer")',
            },
            ends_with: {
              type: 'string',
              description: 'Return job titles that end with this string (e.g. "manager" returns "Product Manager", "Engineering Manager")',
            },
          },
        },
      },
      {
        name: 'normalize_job_title',
        description: 'Normalize a free-text job title to its canonical Open Skills equivalent(s). Handles variations, abbreviations, and informal titles. Returns ranked matches with confidence scores.',
        inputSchema: {
          type: 'object',
          properties: {
            job_title: {
              type: 'string',
              description: 'Free-text job title to normalize (e.g. "Sr. Software Eng", "VP Sales", "Full Stack Dev")',
            },
            limit: {
              type: 'integer',
              description: 'Maximum number of normalized title candidates to return (default: 1)',
            },
          },
          required: ['job_title'],
        },
      },
      {
        name: 'get_unusual_job_titles',
        description: 'Retrieve a list of unusual, creative, or non-standard job titles from the Open Skills dataset. Useful for researching informal job market terminology.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_jobs_related_to_job',
        description: 'Get a list of jobs that are related to a given job ID based on shared skills and competencies. Useful for career path analysis and job recommendation.',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Unique job ID to find related jobs for (e.g. "15-1132.00" for Software Developers)',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'get_skills_for_job',
        description: 'Get the list of skills associated with a specific job title. Returns skills with their importance and relevance to the role.',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Unique job ID to retrieve skills for (e.g. "15-1132.00" for Software Developers)',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'list_skills',
        description: 'List skill names and descriptions from the Open Skills taxonomy with pagination. Returns canonical skill names with unique IDs.',
        inputSchema: {
          type: 'object',
          properties: {
            offset: {
              type: 'integer',
              description: 'Number of skills to skip for pagination (default: 0)',
            },
            limit: {
              type: 'integer',
              description: 'Maximum number of skills to return (default: 20, max: 500)',
            },
          },
        },
      },
      {
        name: 'get_skill',
        description: 'Retrieve the name and full description for a specific skill by its unique ID.',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Unique skill ID from list_skills or normalize_skill_name results',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'autocomplete_skills',
        description: 'Autocomplete skill name searches by prefix, substring, or suffix. Useful for building skill search UIs or resolving partial skill inputs to canonical names.',
        inputSchema: {
          type: 'object',
          properties: {
            begins_with: {
              type: 'string',
              description: 'Return skills that begin with this string (e.g. "python" returns "Python Programming")',
            },
            contains: {
              type: 'string',
              description: 'Return skills that contain this string (e.g. "machine" returns "Machine Learning", "Machine Vision")',
            },
            ends_with: {
              type: 'string',
              description: 'Return skills that end with this string (e.g. "analysis" returns "Data Analysis", "Systems Analysis")',
            },
          },
        },
      },
      {
        name: 'normalize_skill_name',
        description: 'Normalize a free-text skill name to its canonical Open Skills equivalent. Handles abbreviations, synonyms, and informal names (e.g. "ML" -> "Machine Learning").',
        inputSchema: {
          type: 'object',
          properties: {
            skill_name: {
              type: 'string',
              description: 'Free-text skill name to normalize (e.g. "ML", "JS", "project mgmt", "SQL databases")',
            },
          },
          required: ['skill_name'],
        },
      },
      {
        name: 'get_jobs_related_to_skill',
        description: 'Get a list of jobs that require or are associated with a specific skill. Useful for skill-to-career mapping and job recommendation by skill.',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Unique skill ID to find related jobs for',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'get_skills_related_to_skill',
        description: 'Get a list of skills that are related to a given skill ID — skills that commonly appear together or are complementary in the job market.',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Unique skill ID to find related skills for',
            },
          },
          required: ['id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_jobs':
          return this.listJobs(args);
        case 'get_job':
          return this.getJob(args);
        case 'autocomplete_jobs':
          return this.autocompleteJobs(args);
        case 'normalize_job_title':
          return this.normalizeJobTitle(args);
        case 'get_unusual_job_titles':
          return this.getUnusualJobTitles();
        case 'get_jobs_related_to_job':
          return this.getRelatedJobs(args);
        case 'get_skills_for_job':
          return this.getSkillsForJob(args);
        case 'list_skills':
          return this.listSkills(args);
        case 'get_skill':
          return this.getSkill(args);
        case 'autocomplete_skills':
          return this.autocompleteSkills(args);
        case 'normalize_skill_name':
          return this.normalizeSkillName(args);
        case 'get_jobs_related_to_skill':
          return this.getJobsRelatedToSkill(args);
        case 'get_skills_related_to_skill':
          return this.getSkillsRelatedToSkill(args);
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

  private async get(path: string, params?: Record<string, string>): Promise<ToolResult> {
    const qs = params && Object.keys(params).length > 0
      ? '?' + new URLSearchParams(params).toString()
      : '';
    const url = `${this.baseUrl}${path}${qs}`;
    const response = await this.fetchWithRetry(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `API error ${response.status}: ${errText}` }], isError: true };
    }
    const data = await response.json() as unknown;
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listJobs(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (args.offset !== undefined) params.offset = String(args.offset);
    if (args.limit !== undefined) params.limit = String(args.limit);
    return this.get('/jobs', params);
  }

  private async getJob(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    const params: Record<string, string> = {};
    if (args.fips) params.fips = args.fips as string;
    return this.get(`/jobs/${encodeURIComponent(args.id as string)}`, params);
  }

  private async autocompleteJobs(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (args.begins_with) params.begins_with = args.begins_with as string;
    if (args.contains) params.contains = args.contains as string;
    if (args.ends_with) params.ends_with = args.ends_with as string;
    return this.get('/jobs/autocomplete', params);
  }

  private async normalizeJobTitle(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.job_title) return { content: [{ type: 'text', text: 'job_title is required' }], isError: true };
    const params: Record<string, string> = { job_title: args.job_title as string };
    if (args.limit !== undefined) params.limit = String(args.limit);
    return this.get('/jobs/normalize', params);
  }

  private async getUnusualJobTitles(): Promise<ToolResult> {
    return this.get('/jobs/unusual_titles');
  }

  private async getRelatedJobs(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.get(`/jobs/${encodeURIComponent(args.id as string)}/related_jobs`);
  }

  private async getSkillsForJob(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.get(`/jobs/${encodeURIComponent(args.id as string)}/related_skills`);
  }

  private async listSkills(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (args.offset !== undefined) params.offset = String(args.offset);
    if (args.limit !== undefined) params.limit = String(args.limit);
    return this.get('/skills', params);
  }

  private async getSkill(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.get(`/skills/${encodeURIComponent(args.id as string)}`);
  }

  private async autocompleteSkills(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (args.begins_with) params.begins_with = args.begins_with as string;
    if (args.contains) params.contains = args.contains as string;
    if (args.ends_with) params.ends_with = args.ends_with as string;
    return this.get('/skills/autocomplete', params);
  }

  private async normalizeSkillName(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.skill_name) return { content: [{ type: 'text', text: 'skill_name is required' }], isError: true };
    const params: Record<string, string> = { skill_name: args.skill_name as string };
    return this.get('/skills/normalize', params);
  }

  private async getJobsRelatedToSkill(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.get(`/skills/${encodeURIComponent(args.id as string)}/related_jobs`);
  }

  private async getSkillsRelatedToSkill(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.get(`/skills/${encodeURIComponent(args.id as string)}/related_skills`);
  }
}

/**
 * Lever MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// No official Lever MCP server was found on GitHub or npm. One community repo exists
// (github.com/the-sid-dani/lever-mcp-integration, Python/stdio) and a community Go
// server on mcpmarket.com (59 tools), but neither is published by Lever Inc.
//
// Base URL: https://api.lever.co/v1
// Auth: Basic auth — API key as username, password left blank. Generate in Lever Settings > Integrations and API > API Credentials.
// Docs: https://hire.lever.co/developer/documentation
// Rate limits: 429 returned when exceeded — 2 POST requests/sec for applications; general limits not publicly documented

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface LeverConfig {
  apiKey: string;
  baseUrl?: string;
}

export class LeverMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: LeverConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.lever.co/v1';
  }

  static catalog() {
    return {
      name: 'lever',
      displayName: 'Lever',
      version: '1.0.0',
      category: 'misc',
      keywords: [
        'lever', 'ats', 'applicant tracking', 'recruiting', 'recruitment', 'crm', 'candidates',
        'opportunities', 'job postings', 'interviews', 'offers', 'pipeline', 'hiring',
        'talent acquisition', 'requisitions', 'archive', 'feedback',
      ],
      toolNames: [
        'list_opportunities', 'get_opportunity', 'search_opportunities',
        'list_contacts', 'get_contact',
        'list_postings', 'get_posting',
        'list_stages', 'list_users', 'get_user',
        'list_tags', 'list_sources',
        'list_archive_reasons',
        'list_offers', 'get_offer',
        'list_interviews', 'get_interview',
        'add_opportunity_note',
      ],
      description: 'Lever ATS+CRM recruiting: query candidates, opportunities, job postings, interview stages, offers, tags, and pipeline data for talent acquisition workflows.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_opportunities',
        description: 'List pipeline opportunities (candidates) with optional filters for stage, tag, posting, archive reason, and date range',
        inputSchema: {
          type: 'object',
          properties: {
            stage_id: {
              type: 'string',
              description: 'Filter by pipeline stage ID',
            },
            tag: {
              type: 'string',
              description: 'Filter by candidate tag (exact match)',
            },
            posting_id: {
              type: 'string',
              description: 'Filter by associated job posting ID',
            },
            archived_posting_id: {
              type: 'string',
              description: 'Filter by archived posting ID',
            },
            archived: {
              type: 'boolean',
              description: 'Include archived opportunities (default: false, active pipeline only)',
            },
            created_at_start: {
              type: 'number',
              description: 'Unix timestamp (ms) — only return opportunities created at or after this time',
            },
            created_at_end: {
              type: 'number',
              description: 'Unix timestamp (ms) — only return opportunities created at or before this time',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of opportunities to return (max 100, default: 100)',
            },
            offset: {
              type: 'string',
              description: 'Pagination offset token from a previous response',
            },
          },
        },
      },
      {
        name: 'get_opportunity',
        description: 'Get complete details for a specific opportunity (candidate) by opportunity ID including stage, applications, and tags',
        inputSchema: {
          type: 'object',
          properties: {
            opportunity_id: {
              type: 'string',
              description: 'Lever opportunity ID',
            },
          },
          required: ['opportunity_id'],
        },
      },
      {
        name: 'search_opportunities',
        description: 'Search for candidates and opportunities by name or email across the Lever pipeline',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query — matches against candidate name or email address',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results to return (max 100, default: 25)',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'list_contacts',
        description: 'List all contacts in the Lever CRM with optional date and pagination filters',
        inputSchema: {
          type: 'object',
          properties: {
            created_at_start: {
              type: 'number',
              description: 'Unix timestamp (ms) — only return contacts created at or after this time',
            },
            created_at_end: {
              type: 'number',
              description: 'Unix timestamp (ms) — only return contacts created at or before this time',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of contacts to return (max 100, default: 100)',
            },
            offset: {
              type: 'string',
              description: 'Pagination offset token from a previous response',
            },
          },
        },
      },
      {
        name: 'get_contact',
        description: 'Get profile details for a specific Lever contact by contact ID',
        inputSchema: {
          type: 'object',
          properties: {
            contact_id: {
              type: 'string',
              description: 'Lever contact ID',
            },
          },
          required: ['contact_id'],
        },
      },
      {
        name: 'list_postings',
        description: 'List job postings with optional filters for state, team, location, and distribution channel',
        inputSchema: {
          type: 'object',
          properties: {
            state: {
              type: 'string',
              description: 'Filter by posting state: published, internal, closed, draft (default: published)',
            },
            team: {
              type: 'string',
              description: 'Filter by team name',
            },
            location: {
              type: 'string',
              description: 'Filter by location',
            },
            distribution: {
              type: 'string',
              description: 'Filter by distribution channel: internal, external (default: returns all)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of postings to return (max 100, default: 100)',
            },
            offset: {
              type: 'string',
              description: 'Pagination offset token from a previous response',
            },
          },
        },
      },
      {
        name: 'get_posting',
        description: 'Get full details of a specific job posting by posting ID including description and requirements',
        inputSchema: {
          type: 'object',
          properties: {
            posting_id: {
              type: 'string',
              description: 'Lever posting ID',
            },
          },
          required: ['posting_id'],
        },
      },
      {
        name: 'list_stages',
        description: 'List all pipeline stages configured in the Lever account in their ordered sequence',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'list_users',
        description: 'List all Lever users (team members and recruiters) with optional role filter',
        inputSchema: {
          type: 'object',
          properties: {
            role: {
              type: 'string',
              description: 'Filter by user role: super admin, admin, team member, limited team member, interviewer (default: returns all)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of users to return (max 100, default: 100)',
            },
            offset: {
              type: 'string',
              description: 'Pagination offset token from a previous response',
            },
          },
        },
      },
      {
        name: 'get_user',
        description: 'Get profile and role information for a specific Lever user by user ID',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: {
              type: 'string',
              description: 'Lever user ID',
            },
          },
          required: ['user_id'],
        },
      },
      {
        name: 'list_tags',
        description: 'List all candidate tags used in the Lever account with usage counts',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of tags to return (max 100, default: 100)',
            },
            offset: {
              type: 'string',
              description: 'Pagination offset token from a previous response',
            },
          },
        },
      },
      {
        name: 'list_sources',
        description: 'List all candidate sources (e.g. LinkedIn, Referral, Job Board) configured in the Lever account',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of sources to return (max 100, default: 100)',
            },
            offset: {
              type: 'string',
              description: 'Pagination offset token from a previous response',
            },
          },
        },
      },
      {
        name: 'list_archive_reasons',
        description: 'List all archive reasons used in the Lever account for tracking why candidates were rejected or withdrawn',
        inputSchema: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              description: 'Filter by archive type: non-hired, hired (default: returns all)',
            },
          },
        },
      },
      {
        name: 'list_offers',
        description: 'List all offers for a specific opportunity with status, compensation, and approval details',
        inputSchema: {
          type: 'object',
          properties: {
            opportunity_id: {
              type: 'string',
              description: 'Lever opportunity ID to list offers for',
            },
          },
          required: ['opportunity_id'],
        },
      },
      {
        name: 'get_offer',
        description: 'Get detailed compensation and approval information for a specific offer by offer ID',
        inputSchema: {
          type: 'object',
          properties: {
            opportunity_id: {
              type: 'string',
              description: 'Lever opportunity ID the offer belongs to',
            },
            offer_id: {
              type: 'string',
              description: 'Lever offer ID',
            },
          },
          required: ['opportunity_id', 'offer_id'],
        },
      },
      {
        name: 'list_interviews',
        description: 'List scheduled interviews for a specific opportunity with interviewer, date, and feedback status',
        inputSchema: {
          type: 'object',
          properties: {
            opportunity_id: {
              type: 'string',
              description: 'Lever opportunity ID to list interviews for',
            },
          },
          required: ['opportunity_id'],
        },
      },
      {
        name: 'get_interview',
        description: 'Get details for a specific scheduled interview by panel ID including interviewers and meeting link',
        inputSchema: {
          type: 'object',
          properties: {
            opportunity_id: {
              type: 'string',
              description: 'Lever opportunity ID the interview belongs to',
            },
            panel_id: {
              type: 'string',
              description: 'Lever interview panel ID',
            },
          },
          required: ['opportunity_id', 'panel_id'],
        },
      },
      {
        name: 'add_opportunity_note',
        description: 'Add a note to an opportunity to log recruiter observations, call summaries, or status updates',
        inputSchema: {
          type: 'object',
          properties: {
            opportunity_id: {
              type: 'string',
              description: 'Lever opportunity ID to add the note to',
            },
            note: {
              type: 'string',
              description: 'Note content to add to the opportunity',
            },
            notify_followers: {
              type: 'boolean',
              description: 'Notify opportunity followers of this note (default: false)',
            },
          },
          required: ['opportunity_id', 'note'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_opportunities':
          return this.listOpportunities(args);
        case 'get_opportunity':
          return this.getOpportunity(args);
        case 'search_opportunities':
          return this.searchOpportunities(args);
        case 'list_contacts':
          return this.listContacts(args);
        case 'get_contact':
          return this.getContact(args);
        case 'list_postings':
          return this.listPostings(args);
        case 'get_posting':
          return this.getPosting(args);
        case 'list_stages':
          return this.listStages();
        case 'list_users':
          return this.listUsers(args);
        case 'get_user':
          return this.getUser(args);
        case 'list_tags':
          return this.listTags(args);
        case 'list_sources':
          return this.listSources(args);
        case 'list_archive_reasons':
          return this.listArchiveReasons(args);
        case 'list_offers':
          return this.listOffers(args);
        case 'get_offer':
          return this.getOffer(args);
        case 'list_interviews':
          return this.listInterviews(args);
        case 'get_interview':
          return this.getInterview(args);
        case 'add_opportunity_note':
          return this.addOpportunityNote(args);
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
    // Lever uses HTTP Basic auth: API key as username, empty password
    const credentials = btoa(`${this.apiKey}:`);
    return {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
  }

  private async httpGet(path: string, params: Record<string, string> = {}): Promise<ToolResult> {
    const qs = new URLSearchParams(params).toString();
    const url = `${this.baseUrl}${path}${qs ? '?' + qs : ''}`;
    const response = await this.fetchWithRetry(url, { method: 'GET', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async httpPost(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listOpportunities(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      limit: String((args.limit as number) || 100),
    };
    if (args.stage_id) params.stage_id = args.stage_id as string;
    if (args.tag) params.tag = args.tag as string;
    if (args.posting_id) params.posting_id = args.posting_id as string;
    if (args.archived_posting_id) params.archived_posting_id = args.archived_posting_id as string;
    if (typeof args.archived === 'boolean') params.archived = String(args.archived);
    if (args.created_at_start) params.created_at_start = String(args.created_at_start);
    if (args.created_at_end) params.created_at_end = String(args.created_at_end);
    if (args.offset) params.offset = args.offset as string;
    return this.httpGet('/opportunities', params);
  }

  private async getOpportunity(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.opportunity_id) return { content: [{ type: 'text', text: 'opportunity_id is required' }], isError: true };
    return this.httpGet(`/opportunities/${encodeURIComponent(args.opportunity_id as string)}`);
  }

  private async searchOpportunities(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.query) return { content: [{ type: 'text', text: 'query is required' }], isError: true };
    const params: Record<string, string> = {
      q: args.query as string,
      limit: String((args.limit as number) || 25),
    };
    return this.httpGet('/opportunities', params);
  }

  private async listContacts(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      limit: String((args.limit as number) || 100),
    };
    if (args.created_at_start) params.created_at_start = String(args.created_at_start);
    if (args.created_at_end) params.created_at_end = String(args.created_at_end);
    if (args.offset) params.offset = args.offset as string;
    return this.httpGet('/contacts', params);
  }

  private async getContact(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.contact_id) return { content: [{ type: 'text', text: 'contact_id is required' }], isError: true };
    return this.httpGet(`/contacts/${encodeURIComponent(args.contact_id as string)}`);
  }

  private async listPostings(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      limit: String((args.limit as number) || 100),
    };
    if (args.state) params.state = args.state as string;
    else params.state = 'published';
    if (args.team) params.team = args.team as string;
    if (args.location) params.location = args.location as string;
    if (args.distribution) params.distribution = args.distribution as string;
    if (args.offset) params.offset = args.offset as string;
    return this.httpGet('/postings', params);
  }

  private async getPosting(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.posting_id) return { content: [{ type: 'text', text: 'posting_id is required' }], isError: true };
    return this.httpGet(`/postings/${encodeURIComponent(args.posting_id as string)}`);
  }

  private async listStages(): Promise<ToolResult> {
    return this.httpGet('/stages');
  }

  private async listUsers(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      limit: String((args.limit as number) || 100),
    };
    if (args.role) params.role = args.role as string;
    if (args.offset) params.offset = args.offset as string;
    return this.httpGet('/users', params);
  }

  private async getUser(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.user_id) return { content: [{ type: 'text', text: 'user_id is required' }], isError: true };
    return this.httpGet(`/users/${encodeURIComponent(args.user_id as string)}`);
  }

  private async listTags(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      limit: String((args.limit as number) || 100),
    };
    if (args.offset) params.offset = args.offset as string;
    return this.httpGet('/tags', params);
  }

  private async listSources(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      limit: String((args.limit as number) || 100),
    };
    if (args.offset) params.offset = args.offset as string;
    return this.httpGet('/sources', params);
  }

  private async listArchiveReasons(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (args.type) params.type = args.type as string;
    return this.httpGet('/archive_reasons', params);
  }

  private async listOffers(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.opportunity_id) return { content: [{ type: 'text', text: 'opportunity_id is required' }], isError: true };
    return this.httpGet(`/opportunities/${encodeURIComponent(args.opportunity_id as string)}/offers`);
  }

  private async getOffer(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.opportunity_id || !args.offer_id) {
      return { content: [{ type: 'text', text: 'opportunity_id and offer_id are required' }], isError: true };
    }
    return this.httpGet(`/opportunities/${encodeURIComponent(args.opportunity_id as string)}/offers/${encodeURIComponent(args.offer_id as string)}`);
  }

  private async listInterviews(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.opportunity_id) return { content: [{ type: 'text', text: 'opportunity_id is required' }], isError: true };
    return this.httpGet(`/opportunities/${encodeURIComponent(args.opportunity_id as string)}/panels`);
  }

  private async getInterview(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.opportunity_id || !args.panel_id) {
      return { content: [{ type: 'text', text: 'opportunity_id and panel_id are required' }], isError: true };
    }
    return this.httpGet(`/opportunities/${encodeURIComponent(args.opportunity_id as string)}/panels/${encodeURIComponent(args.panel_id as string)}`);
  }

  private async addOpportunityNote(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.opportunity_id || !args.note) {
      return { content: [{ type: 'text', text: 'opportunity_id and note are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      value: args.note,
      notifyFollowers: (args.notify_followers as boolean) ?? false,
    };
    return this.httpPost(`/opportunities/${encodeURIComponent(args.opportunity_id as string)}/notes`, body);
  }
}

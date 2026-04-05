/**
 * UniCourt Enterprise APIs MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// No official UniCourt MCP server was found on GitHub as of 2026-03-28.
// Our adapter covers: 21 tools. Vendor MCP covers: 0 tools (none exists).
// Recommendation: use-rest-api — no official MCP server exists.
//
// Base URL: https://enterpriseapi.unicourt.com
// Auth: Authorization: Bearer {access_token}
//   Token obtained via POST /generateNewToken with clientId + clientSecret
//   Docs: https://docs.unicourt.com
// Rate limits: Tier-based; consult billing cycle usage endpoint

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface UniCourtConfig {
  accessToken: string;
  baseUrl?: string;
}

export class UniCourtMCPServer extends MCPAdapterBase {
  private readonly accessToken: string;
  private readonly baseUrl: string;

  constructor(config: UniCourtConfig) {
    super();
    this.accessToken = config.accessToken;
    this.baseUrl = config.baseUrl || 'https://enterpriseapi.unicourt.com';
  }

  get tools(): ToolDefinition[] {
    return [
      // Case Search
      {
        name: 'search_cases',
        description: 'Search federal and state court cases by keyword, party name, attorney, judge, docket number, or date range. Returns case IDs, titles, courts, and filing dates.',
        inputSchema: {
          type: 'object',
          properties: {
            q: {
              type: 'string',
              description: 'Search query (e.g., party name, keyword, docket number)',
            },
            sort: {
              type: 'string',
              description: 'Sort field: filedDate, lastFetchDate, etc.',
            },
            order: {
              type: 'string',
              description: 'Sort direction: asc or desc (default: desc)',
            },
            page_number: {
              type: 'number',
              description: 'Page number (1-based, default: 1)',
            },
          },
          required: ['q'],
        },
      },
      // Case Docket
      {
        name: 'get_case',
        description: 'Get full case details by caseId: title, court, filing date, status, case type, parties, and summary.',
        inputSchema: {
          type: 'object',
          properties: {
            case_id: {
              type: 'string',
              description: 'UniCourt caseId (e.g., CASEak99a698ea5413)',
            },
          },
          required: ['case_id'],
        },
      },
      {
        name: 'get_case_attorneys',
        description: 'List attorneys on a case with their law firm affiliations and representation types.',
        inputSchema: {
          type: 'object',
          properties: {
            case_id: { type: 'string', description: 'UniCourt caseId' },
            page_number: { type: 'number', description: 'Page number (1-based, default: 1)' },
          },
          required: ['case_id'],
        },
      },
      {
        name: 'get_case_parties',
        description: 'List all parties (plaintiffs, defendants, etc.) on a case with their roles and associated attorneys.',
        inputSchema: {
          type: 'object',
          properties: {
            case_id: { type: 'string', description: 'UniCourt caseId' },
            page_number: { type: 'number', description: 'Page number (1-based, default: 1)' },
          },
          required: ['case_id'],
        },
      },
      {
        name: 'get_case_docket_entries',
        description: 'Retrieve docket entries for a case — filings, orders, and events with dates, descriptions, and document links.',
        inputSchema: {
          type: 'object',
          properties: {
            case_id: { type: 'string', description: 'UniCourt caseId' },
            sort_order: { type: 'string', description: 'Sort direction: asc or desc (default: asc)' },
            page_number: { type: 'number', description: 'Page number (1-based, default: 1)' },
          },
          required: ['case_id'],
        },
      },
      {
        name: 'get_case_hearings',
        description: 'Get scheduled and past hearings for a case including hearing type, date, time, and courtroom.',
        inputSchema: {
          type: 'object',
          properties: {
            case_id: { type: 'string', description: 'UniCourt caseId' },
            page_number: { type: 'number', description: 'Page number (1-based, default: 1)' },
          },
          required: ['case_id'],
        },
      },
      {
        name: 'get_case_judges',
        description: 'List judges assigned to a case with their judicial roles.',
        inputSchema: {
          type: 'object',
          properties: {
            case_id: { type: 'string', description: 'UniCourt caseId' },
            page_number: { type: 'number', description: 'Page number (1-based, default: 1)' },
          },
          required: ['case_id'],
        },
      },
      {
        name: 'get_case_documents',
        description: 'List documents available for a case including document type, filing date, and download eligibility.',
        inputSchema: {
          type: 'object',
          properties: {
            case_id: { type: 'string', description: 'UniCourt caseId' },
            page_number: { type: 'number', description: 'Page number (1-based, default: 1)' },
          },
          required: ['case_id'],
        },
      },
      // Case Tracking
      {
        name: 'track_case',
        description: 'Subscribe to automatic updates for a case. UniCourt will fetch new docket entries, parties, and status changes on your behalf.',
        inputSchema: {
          type: 'object',
          properties: {
            case_id: { type: 'string', description: 'UniCourt caseId to track' },
            sync_type: { type: 'number', description: 'Sync type: 0 = retrieve all, 1 = retrieve new only (default: 0)' },
            schedule_type: { type: 'string', description: 'Update schedule: daily, weekly, etc.' },
          },
          required: ['case_id'],
        },
      },
      {
        name: 'list_tracked_cases',
        description: 'List all cases currently being tracked (auto-updated) on your account.',
        inputSchema: {
          type: 'object',
          properties: {
            page_number: { type: 'number', description: 'Page number (1-based, default: 1)' },
          },
        },
      },
      {
        name: 'remove_case_tracking',
        description: 'Stop tracking a case and cancel automatic updates for it.',
        inputSchema: {
          type: 'object',
          properties: {
            case_id: { type: 'string', description: 'UniCourt caseId to stop tracking' },
          },
          required: ['case_id'],
        },
      },
      // Attorney Analytics
      {
        name: 'search_attorneys',
        description: 'Search normalized attorney profiles across all courts by name, bar number, or law firm. Returns career statistics and court affiliations.',
        inputSchema: {
          type: 'object',
          properties: {
            q: { type: 'string', description: 'Attorney name or search query' },
            page_number: { type: 'number', description: 'Page number (1-based, default: 1)' },
          },
          required: ['q'],
        },
      },
      {
        name: 'get_attorney',
        description: 'Get normalized attorney profile by normAttorneyId with win/loss statistics, case types argued, and court experience.',
        inputSchema: {
          type: 'object',
          properties: {
            norm_attorney_id: { type: 'string', description: 'UniCourt normAttorneyId' },
          },
          required: ['norm_attorney_id'],
        },
      },
      // Judge Analytics
      {
        name: 'search_judges',
        description: 'Search normalized judge profiles by name or court. Returns judicial history, case volumes, and outcome tendencies.',
        inputSchema: {
          type: 'object',
          properties: {
            q: { type: 'string', description: 'Judge name or search query' },
            page_number: { type: 'number', description: 'Page number (1-based, default: 1)' },
          },
          required: ['q'],
        },
      },
      {
        name: 'get_judge',
        description: 'Get normalized judge profile by normJudgeId with case volume, ruling patterns, and associated courts.',
        inputSchema: {
          type: 'object',
          properties: {
            norm_judge_id: { type: 'string', description: 'UniCourt normJudgeId' },
          },
          required: ['norm_judge_id'],
        },
      },
      // Law Firm Analytics
      {
        name: 'search_law_firms',
        description: 'Search normalized law firm profiles by name or location with litigation statistics across federal and state courts.',
        inputSchema: {
          type: 'object',
          properties: {
            q: { type: 'string', description: 'Law firm name or search query' },
            page_number: { type: 'number', description: 'Page number (1-based, default: 1)' },
          },
          required: ['q'],
        },
      },
      {
        name: 'get_law_firm',
        description: 'Get normalized law firm profile by normLawFirmId with attorney roster, practice areas, and case outcomes.',
        inputSchema: {
          type: 'object',
          properties: {
            norm_law_firm_id: { type: 'string', description: 'UniCourt normLawFirmId' },
          },
          required: ['norm_law_firm_id'],
        },
      },
      // Case Analytics
      {
        name: 'get_case_count_by_court',
        description: 'Get aggregate case counts grouped by court with optional filters for date range, case type, and jurisdiction.',
        inputSchema: {
          type: 'object',
          properties: {
            q: { type: 'string', description: 'Optional search/filter query string' },
            page_number: { type: 'number', description: 'Page number (1-based, default: 1)' },
          },
        },
      },
      {
        name: 'get_case_count_by_area_of_law',
        description: 'Get aggregate case counts grouped by area of law (e.g., civil rights, intellectual property, bankruptcy).',
        inputSchema: {
          type: 'object',
          properties: {
            q: { type: 'string', description: 'Optional search/filter query string' },
            page_number: { type: 'number', description: 'Page number (1-based, default: 1)' },
          },
        },
      },
      // Court Standards
      {
        name: 'get_courts',
        description: 'List all courts in the UniCourt system with their type, jurisdiction, location, and coverage status.',
        inputSchema: {
          type: 'object',
          properties: {
            q: { type: 'string', description: 'Optional filter query (e.g., court name or state)' },
            page_number: { type: 'number', description: 'Page number (1-based, default: 1)' },
          },
        },
      },
      // Usage
      {
        name: 'get_billing_usage',
        description: 'Get API usage statistics for the current or a specific billing cycle including calls made, credits consumed, and remaining quota.',
        inputSchema: {
          type: 'object',
          properties: {
            billing_cycle: {
              type: 'string',
              description: 'Billing cycle identifier (e.g., "2026-03"). Omit for list of all cycles.',
            },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'search_cases':
          return await this.searchCases(args);
        case 'get_case':
          return await this.getCase(args);
        case 'get_case_attorneys':
          return await this.getCaseAttorneys(args);
        case 'get_case_parties':
          return await this.getCaseParties(args);
        case 'get_case_docket_entries':
          return await this.getCaseDocketEntries(args);
        case 'get_case_hearings':
          return await this.getCaseHearings(args);
        case 'get_case_judges':
          return await this.getCaseJudges(args);
        case 'get_case_documents':
          return await this.getCaseDocuments(args);
        case 'track_case':
          return await this.trackCase(args);
        case 'list_tracked_cases':
          return await this.listTrackedCases(args);
        case 'remove_case_tracking':
          return await this.removeCaseTracking(args);
        case 'search_attorneys':
          return await this.searchAttorneys(args);
        case 'get_attorney':
          return await this.getAttorney(args);
        case 'search_judges':
          return await this.searchJudges(args);
        case 'get_judge':
          return await this.getJudge(args);
        case 'search_law_firms':
          return await this.searchLawFirms(args);
        case 'get_law_firm':
          return await this.getLawFirm(args);
        case 'get_case_count_by_court':
          return await this.getCaseCountByCourt(args);
        case 'get_case_count_by_area_of_law':
          return await this.getCaseCountByAreaOfLaw(args);
        case 'get_courts':
          return await this.getCourts(args);
        case 'get_billing_usage':
          return await this.getBillingUsage(args);
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

  private async request(path: string, method = 'GET', body?: unknown): Promise<ToolResult> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
    };

    const response = await this.fetchWithRetry(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return {
        content: [{ type: 'text', text: `UniCourt API error ${response.status}: ${errText}` }],
        isError: true,
      };
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new Error(`UniCourt returned non-JSON response (HTTP ${response.status})`);
    }

    const text = JSON.stringify(data, null, 2);
    const truncated =
      text.length > 10_000
        ? text.slice(0, 10_000) + '\n... [truncated, ' + text.length + ' total chars]'
        : text;

    return { content: [{ type: 'text', text: truncated }], isError: false };
  }

  private async searchCases(args: Record<string, unknown>): Promise<ToolResult> {
    const q = args.q as string;
    if (!q) return { content: [{ type: 'text', text: 'q is required' }], isError: true };
    const page = (args.page_number as number) ?? 1;
    const sort = args.sort ? `&sort=${encodeURIComponent(args.sort as string)}` : '';
    const order = args.order ? `&order=${encodeURIComponent(args.order as string)}` : '';
    return this.request(`/caseSearch?q=${encodeURIComponent(q)}&pageNumber=${page}${sort}${order}`);
  }

  private async getCase(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.case_id as string;
    if (!id) return { content: [{ type: 'text', text: 'case_id is required' }], isError: true };
    return this.request(`/case/${encodeURIComponent(id)}`);
  }

  private async getCaseAttorneys(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.case_id as string;
    if (!id) return { content: [{ type: 'text', text: 'case_id is required' }], isError: true };
    const page = (args.page_number as number) ?? 1;
    return this.request(`/case/${encodeURIComponent(id)}/attorneys?pageNumber=${page}`);
  }

  private async getCaseParties(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.case_id as string;
    if (!id) return { content: [{ type: 'text', text: 'case_id is required' }], isError: true };
    const page = (args.page_number as number) ?? 1;
    return this.request(`/case/${encodeURIComponent(id)}/parties?pageNumber=${page}`);
  }

  private async getCaseDocketEntries(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.case_id as string;
    if (!id) return { content: [{ type: 'text', text: 'case_id is required' }], isError: true };
    const page = (args.page_number as number) ?? 1;
    const sortOrder = (args.sort_order as string) ?? 'asc';
    return this.request(
      `/case/${encodeURIComponent(id)}/docketEntries?pageNumber=${page}&sortOrder=${encodeURIComponent(sortOrder)}`
    );
  }

  private async getCaseHearings(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.case_id as string;
    if (!id) return { content: [{ type: 'text', text: 'case_id is required' }], isError: true };
    const page = (args.page_number as number) ?? 1;
    return this.request(`/case/${encodeURIComponent(id)}/hearings?pageNumber=${page}`);
  }

  private async getCaseJudges(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.case_id as string;
    if (!id) return { content: [{ type: 'text', text: 'case_id is required' }], isError: true };
    const page = (args.page_number as number) ?? 1;
    return this.request(`/case/${encodeURIComponent(id)}/judges?pageNumber=${page}`);
  }

  private async getCaseDocuments(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.case_id as string;
    if (!id) return { content: [{ type: 'text', text: 'case_id is required' }], isError: true };
    const page = (args.page_number as number) ?? 1;
    return this.request(`/case/${encodeURIComponent(id)}/documents?pageNumber=${page}`);
  }

  private async trackCase(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.case_id as string;
    if (!id) return { content: [{ type: 'text', text: 'case_id is required' }], isError: true };
    const body: Record<string, unknown> = { caseId: id };
    if (args.sync_type !== undefined) body.syncType = args.sync_type;
    if (args.schedule_type) body.scheduleType = args.schedule_type;
    return this.request('/caseTrack', 'PUT', body);
  }

  private async listTrackedCases(args: Record<string, unknown>): Promise<ToolResult> {
    const page = (args.page_number as number) ?? 1;
    return this.request(`/caseTracks?pageNumber=${page}`);
  }

  private async removeCaseTracking(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.case_id as string;
    if (!id) return { content: [{ type: 'text', text: 'case_id is required' }], isError: true };
    return this.request(`/caseTrack/${encodeURIComponent(id)}`, 'DELETE');
  }

  private async searchAttorneys(args: Record<string, unknown>): Promise<ToolResult> {
    const q = args.q as string;
    if (!q) return { content: [{ type: 'text', text: 'q is required' }], isError: true };
    const page = (args.page_number as number) ?? 1;
    return this.request(`/normAttorneySearch?q=${encodeURIComponent(q)}&pageNumber=${page}`);
  }

  private async getAttorney(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.norm_attorney_id as string;
    if (!id) return { content: [{ type: 'text', text: 'norm_attorney_id is required' }], isError: true };
    return this.request(`/normAttorney/${encodeURIComponent(id)}`);
  }

  private async searchJudges(args: Record<string, unknown>): Promise<ToolResult> {
    const q = args.q as string;
    if (!q) return { content: [{ type: 'text', text: 'q is required' }], isError: true };
    const page = (args.page_number as number) ?? 1;
    return this.request(`/normJudgeSearch?q=${encodeURIComponent(q)}&pageNumber=${page}`);
  }

  private async getJudge(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.norm_judge_id as string;
    if (!id) return { content: [{ type: 'text', text: 'norm_judge_id is required' }], isError: true };
    return this.request(`/normJudge/${encodeURIComponent(id)}`);
  }

  private async searchLawFirms(args: Record<string, unknown>): Promise<ToolResult> {
    const q = args.q as string;
    if (!q) return { content: [{ type: 'text', text: 'q is required' }], isError: true };
    const page = (args.page_number as number) ?? 1;
    return this.request(`/normLawFirmSearch?q=${encodeURIComponent(q)}&pageNumber=${page}`);
  }

  private async getLawFirm(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.norm_law_firm_id as string;
    if (!id) return { content: [{ type: 'text', text: 'norm_law_firm_id is required' }], isError: true };
    return this.request(`/normLawFirm/${encodeURIComponent(id)}`);
  }

  private async getCaseCountByCourt(args: Record<string, unknown>): Promise<ToolResult> {
    const page = (args.page_number as number) ?? 1;
    const q = args.q ? `&q=${encodeURIComponent(args.q as string)}` : '';
    return this.request(`/caseCountAnalyticsByCourt?pageNumber=${page}${q}`);
  }

  private async getCaseCountByAreaOfLaw(args: Record<string, unknown>): Promise<ToolResult> {
    const page = (args.page_number as number) ?? 1;
    const q = args.q ? `&q=${encodeURIComponent(args.q as string)}` : '';
    return this.request(`/caseCountAnalyticsByAreaOfLaw?pageNumber=${page}${q}`);
  }

  private async getCourts(args: Record<string, unknown>): Promise<ToolResult> {
    const page = (args.page_number as number) ?? 1;
    const q = args.q ? `&q=${encodeURIComponent(args.q as string)}` : '';
    return this.request(`/masterData/court?pageNumber=${page}${q}`);
  }

  private async getBillingUsage(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.billing_cycle) {
      return this.request(`/billingCycleUsage/${encodeURIComponent(args.billing_cycle as string)}`);
    }
    return this.request('/billingCycles');
  }

  static catalog() {
    return {
      name: 'unicourt',
      displayName: 'UniCourt',
      version: '1.0.0',
      category: 'legal' as const,
      keywords: [
        'unicourt', 'legal', 'court', 'litigation', 'case search',
        'attorney', 'judge', 'law firm', 'docket', 'PACER',
        'federal courts', 'state courts', 'analytics', 'party search',
      ],
      toolNames: [
        'search_cases', 'get_case', 'get_case_attorneys', 'get_case_parties',
        'get_case_docket_entries', 'get_case_hearings', 'get_case_judges',
        'get_case_documents', 'track_case', 'list_tracked_cases',
        'remove_case_tracking', 'search_attorneys', 'get_attorney',
        'search_judges', 'get_judge', 'search_law_firms', 'get_law_firm',
        'get_case_count_by_court', 'get_case_count_by_area_of_law',
        'get_courts', 'get_billing_usage',
      ],
      description: 'UniCourt Enterprise API adapter for the Epic AI Intelligence Platform — federal and state court case search, docket retrieval, attorney/judge/law firm analytics, and case tracking.',
      author: 'protectnil' as const,
    };
  }
}

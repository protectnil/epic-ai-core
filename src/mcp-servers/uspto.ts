/**
 * USPTO MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// No official USPTO MCP server was found on GitHub or npm.
// Note: The PatentsView legacy API was discontinued May 2025. This adapter targets the PatentSearch API
//       and the USPTO Open Data Portal (data.uspto.gov).
// BREAKING CHANGE (March 2026): PatentSearch API entity URL parameters changed from plural to singular
//   (patents→patent, inventors→inventor, assignees→assignee, claims→claim, cpc_subgroups→cpc_subgroup).
//   Also: patent_number field renamed to patent_id. Applied in this adapter as of 2026-03-28 audit.
//
// Base URL: https://search.patentsview.org (PatentSearch) + https://developer.uspto.gov (open data)
// Auth: X-Api-Key header for PatentSearch API (45 req/min per key). Open data endpoints are public.
// Docs: https://search.patentsview.org/docs/ | https://developer.uspto.gov/api-catalog
// Rate limits: 45 requests/minute per API key

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface USPTOConfig {
  apiKey: string;
  patentSearchBaseUrl?: string;
  openDataBaseUrl?: string;
}

export class USPTOMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly patentSearchBaseUrl: string;
  private readonly openDataBaseUrl: string;

  constructor(config: USPTOConfig) {
    super();
    this.apiKey = config.apiKey;
    this.patentSearchBaseUrl = config.patentSearchBaseUrl || 'https://search.patentsview.org';
    this.openDataBaseUrl = config.openDataBaseUrl || 'https://developer.uspto.gov';
  }

  static catalog() {
    return {
      name: 'uspto',
      displayName: 'USPTO',
      version: '1.0.0',
      category: 'misc',
      keywords: ['uspto', 'patent', 'trademark', 'intellectual property', 'invention', 'prior art', 'assignee', 'inventor', 'cpc', 'ipc', 'claims'],
      toolNames: [
        'search_patents', 'get_patent', 'search_inventors',
        'search_assignees', 'search_cpc_subgroups', 'get_patent_claims',
        'search_patent_citations', 'search_applications', 'get_application',
        'search_trademarks',
      ],
      description: 'USPTO patent and trademark data: search patents by keyword, inventor, or assignee, retrieve patent details and claims, search CPC classifications, and look up trademark filings.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'search_patents',
        description: 'Search USPTO patents by keyword, inventor, assignee, date range, or CPC classification code with pagination',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Full-text search query for patent title and abstract (e.g. "machine learning image recognition")',
            },
            inventor_name: {
              type: 'string',
              description: 'Filter by inventor name (partial match supported)',
            },
            assignee_name: {
              type: 'string',
              description: 'Filter by assignee organization name (e.g. Apple Inc)',
            },
            cpc_code: {
              type: 'string',
              description: 'Filter by CPC classification code (e.g. G06F16/00)',
            },
            date_from: {
              type: 'string',
              description: 'Filter patents granted on or after this date (YYYY-MM-DD)',
            },
            date_to: {
              type: 'string',
              description: 'Filter patents granted on or before this date (YYYY-MM-DD)',
            },
            limit: {
              type: 'number',
              description: 'Maximum results to return (default: 25, max: 1000)',
            },
            offset: {
              type: 'number',
              description: 'Number of results to skip for pagination (default: 0)',
            },
            fields: {
              type: 'string',
              description: 'Comma-separated fields to return: patent_id,patent_title,patent_date,assignee_organization,inventor_first_name,inventor_last_name,cpc_subgroup_id (default: all basic fields). Note: patent_number was renamed to patent_id in March 2026.',
            },
          },
        },
      },
      {
        name: 'get_patent',
        description: 'Get full details for a specific USPTO patent by patent number including claims, abstract, and citations',
        inputSchema: {
          type: 'object',
          properties: {
            patent_number: {
              type: 'string',
              description: 'USPTO patent number (e.g. 10000000 or US10000000B2)',
            },
          },
          required: ['patent_number'],
        },
      },
      {
        name: 'search_inventors',
        description: 'Search for patent inventors by name and retrieve their associated patents and co-inventor relationships',
        inputSchema: {
          type: 'object',
          properties: {
            inventor_name: {
              type: 'string',
              description: 'Inventor name to search (first, last, or full name)',
            },
            limit: {
              type: 'number',
              description: 'Maximum results to return (default: 25)',
            },
            offset: {
              type: 'number',
              description: 'Pagination offset (default: 0)',
            },
          },
          required: ['inventor_name'],
        },
      },
      {
        name: 'search_assignees',
        description: 'Search patent assignees (organizations that own patents) by name and retrieve patent counts and details',
        inputSchema: {
          type: 'object',
          properties: {
            assignee_name: {
              type: 'string',
              description: 'Assignee organization name to search (partial match)',
            },
            limit: {
              type: 'number',
              description: 'Maximum results to return (default: 25)',
            },
            offset: {
              type: 'number',
              description: 'Pagination offset (default: 0)',
            },
          },
          required: ['assignee_name'],
        },
      },
      {
        name: 'search_cpc_subgroups',
        description: 'Search USPTO Cooperative Patent Classification (CPC) subgroups to find classification codes for a technology area',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Technology description to search in CPC titles (e.g. "neural network", "CRISPR")',
            },
            limit: {
              type: 'number',
              description: 'Maximum results to return (default: 25)',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'get_patent_claims',
        description: 'Retrieve the full claims text for a specific USPTO patent by patent number',
        inputSchema: {
          type: 'object',
          properties: {
            patent_number: {
              type: 'string',
              description: 'USPTO patent number (numeric, e.g. 10000000)',
            },
          },
          required: ['patent_number'],
        },
      },
      {
        name: 'search_patent_citations',
        description: 'Find patents that cite a specific patent (forward citations) or patents cited by it (backward citations)',
        inputSchema: {
          type: 'object',
          properties: {
            patent_number: {
              type: 'string',
              description: 'USPTO patent number to find citations for',
            },
            direction: {
              type: 'string',
              description: 'Citation direction: forward (patents that cite this patent) or backward (patents this patent cites) (default: forward)',
            },
            limit: {
              type: 'number',
              description: 'Maximum citations to return (default: 50)',
            },
          },
          required: ['patent_number'],
        },
      },
      {
        name: 'search_applications',
        description: 'Search USPTO patent applications by keyword, inventor, or assignee including pending applications not yet granted',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Keyword search in application title and abstract',
            },
            assignee_name: {
              type: 'string',
              description: 'Filter by assignee organization name',
            },
            date_from: {
              type: 'string',
              description: 'Filter applications filed on or after this date (YYYY-MM-DD)',
            },
            date_to: {
              type: 'string',
              description: 'Filter applications filed on or before this date (YYYY-MM-DD)',
            },
            limit: {
              type: 'number',
              description: 'Maximum results to return (default: 25)',
            },
            offset: {
              type: 'number',
              description: 'Pagination offset (default: 0)',
            },
          },
        },
      },
      {
        name: 'get_application',
        description: 'Get details for a specific USPTO patent application by application number including status and file wrapper',
        inputSchema: {
          type: 'object',
          properties: {
            application_number: {
              type: 'string',
              description: 'USPTO application number (e.g. 16123456)',
            },
          },
          required: ['application_number'],
        },
      },
      {
        name: 'search_trademarks',
        description: 'Search USPTO trademark registrations by keyword, owner, or goods and services description',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Trademark term or keyword to search',
            },
            owner_name: {
              type: 'string',
              description: 'Filter by trademark owner/registrant name',
            },
            status: {
              type: 'string',
              description: 'Trademark status filter: LIVE, DEAD, REGISTERED, PENDING (default: LIVE)',
            },
            limit: {
              type: 'number',
              description: 'Maximum results to return (default: 25)',
            },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'search_patents':
          return this.searchPatents(args);
        case 'get_patent':
          return this.getPatent(args);
        case 'search_inventors':
          return this.searchInventors(args);
        case 'search_assignees':
          return this.searchAssignees(args);
        case 'search_cpc_subgroups':
          return this.searchCpcSubgroups(args);
        case 'get_patent_claims':
          return this.getPatentClaims(args);
        case 'search_patent_citations':
          return this.searchPatentCitations(args);
        case 'search_applications':
          return this.searchApplications(args);
        case 'get_application':
          return this.getApplication(args);
        case 'search_trademarks':
          return this.searchTrademarks(args);
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
    return {
      'X-Api-Key': this.apiKey,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
  }

  private async patentSearchPost(path: string, body: unknown): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.patentSearchBaseUrl}${path}`, {
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

  private buildPatentQuery(args: Record<string, unknown>): Record<string, unknown> {
    const filters: Record<string, unknown>[] = [];
    if (args.query) filters.push({ _text_any: { patent_abstract: args.query, patent_title: args.query } });
    if (args.inventor_name) filters.push({ _contains: { inventor_first_name: args.inventor_name } });
    if (args.assignee_name) filters.push({ _contains: { assignee_organization: args.assignee_name } });
    if (args.cpc_code) filters.push({ _eq: { cpc_subgroup_id: args.cpc_code } });
    if (args.date_from) filters.push({ _gte: { patent_date: args.date_from } });
    if (args.date_to) filters.push({ _lte: { patent_date: args.date_to } });
    return filters.length === 1 ? filters[0] : filters.length > 1 ? { _and: filters } : {};
  }

  private async searchPatents(args: Record<string, unknown>): Promise<ToolResult> {
    const query = this.buildPatentQuery(args);
    const body = {
      q: query,
      f: args.fields
        ? (args.fields as string).split(',').map(f => f.trim())
        : ['patent_id', 'patent_number', 'patent_title', 'patent_date', 'assignee_organization', 'inventor_first_name', 'inventor_last_name'],
      o: { per_page: (args.limit as number) || 25, page: Math.floor(((args.offset as number) || 0) / ((args.limit as number) || 25)) + 1 },
      s: [{ patent_date: 'desc' }],
    };
    return this.patentSearchPost('/api/query?entity=patent', body);
  }

  private async getPatent(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.patent_number) return { content: [{ type: 'text', text: 'patent_number is required' }], isError: true };
    const body = {
      q: { _eq: { patent_id: String(args.patent_number).replace(/[^0-9]/g, '') } },
      f: ['patent_id', 'patent_title', 'patent_abstract', 'patent_date', 'patent_type', 'assignee_organization', 'inventor_first_name', 'inventor_last_name', 'cpc_subgroup_id'],
    };
    return this.patentSearchPost('/api/query?entity=patent', body);
  }

  private async searchInventors(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.inventor_name) return { content: [{ type: 'text', text: 'inventor_name is required' }], isError: true };
    const body = {
      q: { _contains: { inventor_last_name: args.inventor_name } },
      f: ['inventor_id', 'inventor_first_name', 'inventor_last_name', 'inventor_city', 'inventor_state', 'inventor_country'],
      o: { per_page: (args.limit as number) || 25, page: Math.floor(((args.offset as number) || 0) / ((args.limit as number) || 25)) + 1 },
    };
    return this.patentSearchPost('/api/query?entity=inventor', body);
  }

  private async searchAssignees(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.assignee_name) return { content: [{ type: 'text', text: 'assignee_name is required' }], isError: true };
    const body = {
      q: { _contains: { assignee_organization: args.assignee_name } },
      f: ['assignee_id', 'assignee_organization', 'assignee_type', 'assignee_city', 'assignee_state', 'assignee_country'],
      o: { per_page: (args.limit as number) || 25, page: Math.floor(((args.offset as number) || 0) / ((args.limit as number) || 25)) + 1 },
    };
    return this.patentSearchPost('/api/query?entity=assignee', body);
  }

  private async searchCpcSubgroups(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.query) return { content: [{ type: 'text', text: 'query is required' }], isError: true };
    const body = {
      q: { _contains: { cpc_subgroup_title: args.query } },
      f: ['cpc_subgroup_id', 'cpc_subgroup_title', 'cpc_group_id', 'cpc_subclass_id'],
      o: { per_page: (args.limit as number) || 25 },
    };
    return this.patentSearchPost('/api/query?entity=cpc_subgroup', body);
  }

  private async getPatentClaims(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.patent_number) return { content: [{ type: 'text', text: 'patent_number is required' }], isError: true };
    const body = {
      q: { _eq: { patent_id: String(args.patent_number).replace(/[^0-9]/g, '') } },
      f: ['patent_id', 'claim_sequence', 'claim_text', 'claim_dependent'],
      o: { per_page: 100 },
    };
    return this.patentSearchPost('/api/query?entity=claim', body);
  }

  private async searchPatentCitations(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.patent_number) return { content: [{ type: 'text', text: 'patent_number is required' }], isError: true };
    const direction = (args.direction as string) || 'forward';
    // After March 2026 breaking change: patent_number→patent_id, cited_patent_number→cited_patent_id
    const field = direction === 'forward' ? 'cited_patent_id' : 'patent_id';
    const returnField = direction === 'forward' ? 'patent_id' : 'cited_patent_id';
    const body = {
      q: { _eq: { [field]: String(args.patent_number).replace(/[^0-9]/g, '') } },
      f: [field, returnField, 'patent_title', 'patent_date'],
      o: { per_page: (args.limit as number) || 50 },
    };
    return this.patentSearchPost('/api/query?entity=patent', body);
  }

  private async searchApplications(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.query) params.set('searchText', args.query as string);
    if (args.assignee_name) params.set('assigneeEntityName', args.assignee_name as string);
    if (args.date_from) params.set('dateRangeStartDate', args.date_from as string);
    if (args.date_to) params.set('dateRangeEndDate', args.date_to as string);
    params.set('rows', String((args.limit as number) || 25));
    params.set('start', String((args.offset as number) || 0));
    const response = await this.fetchWithRetry(`${this.openDataBaseUrl}/ibd/v1/applications?${params.toString()}`, {
      headers: { 'X-Api-Key': this.apiKey, 'Accept': 'application/json' },
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getApplication(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.application_number) return { content: [{ type: 'text', text: 'application_number is required' }], isError: true };
    const response = await this.fetchWithRetry(`${this.openDataBaseUrl}/ibd/v1/applications/${encodeURIComponent(args.application_number as string)}`, {
      headers: { 'X-Api-Key': this.apiKey, 'Accept': 'application/json' },
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async searchTrademarks(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.query) params.set('searchInput', args.query as string);
    if (args.owner_name) params.set('assigneeName', args.owner_name as string);
    if (args.status) params.set('liveOrDead', (args.status as string).toUpperCase() === 'DEAD' ? 'dead' : 'live');
    params.set('rows', String((args.limit as number) || 25));
    const response = await this.fetchWithRetry(`${this.openDataBaseUrl}/tsdr/v2/trademark/search?${params.toString()}`, {
      headers: { 'X-Api-Key': this.apiKey, 'Accept': 'application/json' },
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }
}

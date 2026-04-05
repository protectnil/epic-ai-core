/**
 * Crunchbase MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// No official Crunchbase MCP server was found on GitHub or the MCP registry.
// A community server (github.com/Cyreslab-AI/crunchbase-mcp-server) exists but is not official,
// has only ~5 tools (search_companies, get_company, get_funding_rounds, get_acquisitions, search_people),
// and has no recent maintenance activity. Decision: use-rest-api.
//
// Base URL: https://api.crunchbase.com/api/v4/data
// Auth: API key passed as query parameter `user_key` or header `X-cb-user-key`
// Docs: https://data.crunchbase.com/docs/using-the-api
// Rate limits: 200 calls per minute (all plans)

import { ToolDefinition, ToolResult } from './types.js';

interface CrunchbaseConfig {
  apiKey: string;
  baseUrl?: string;
}

export class CrunchbaseMCPServer {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: CrunchbaseConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.crunchbase.com/api/v4/data';
  }

  static catalog() {
    return {
      name: 'crunchbase',
      displayName: 'Crunchbase',
      version: '1.0.0',
      category: 'data',
      keywords: [
        'crunchbase', 'startup', 'company', 'funding', 'investment', 'venture capital',
        'vc', 'funding round', 'acquisition', 'investor', 'organization', 'person',
        'founder', 'series a', 'series b', 'ipo', 'valuation', 'unicorn',
      ],
      toolNames: [
        'search_organizations', 'get_organization', 'search_people', 'get_person',
        'search_funding_rounds', 'get_funding_round', 'search_acquisitions', 'get_acquisition',
        'search_investments', 'autocomplete_entities',
      ],
      description: 'Crunchbase company and funding data: search organizations, funding rounds, acquisitions, investors, and people by various filters.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'search_organizations',
        description: 'Search Crunchbase organizations (companies, startups, investors) with filters for location, category, funding status, and employee count',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Partial or full organization name to search for',
            },
            location: {
              type: 'string',
              description: 'City, region, or country to filter by (e.g. "San Francisco", "United States")',
            },
            category: {
              type: 'string',
              description: 'Industry category to filter by (e.g. "artificial-intelligence", "fintech", "saas")',
            },
            funding_status: {
              type: 'string',
              description: 'Funding status filter: early_stage_venture, late_stage_venture, ipo, acquired, seed (default: no filter)',
            },
            employee_count: {
              type: 'string',
              description: 'Employee count range: c_00001_00010, c_00011_00050, c_00051_00100, c_00101_00250, c_00251_00500, c_00501_01000, c_01001_05000, c_05001_10000, c_10001_max',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results to return (default: 25, max: 100)',
            },
            after_id: {
              type: 'string',
              description: 'Keyset pagination cursor from a previous response for the next page',
            },
          },
        },
      },
      {
        name: 'get_organization',
        description: 'Retrieve detailed profile for a specific Crunchbase organization by its permalink identifier',
        inputSchema: {
          type: 'object',
          properties: {
            entity_id: {
              type: 'string',
              description: 'Organization permalink (e.g. "openai", "stripe", "spacex")',
            },
            field_ids: {
              type: 'string',
              description: 'Comma-separated list of fields to return (e.g. "identifier,short_description,funding_total,employee_count,founded_on")',
            },
          },
          required: ['entity_id'],
        },
      },
      {
        name: 'search_people',
        description: 'Search Crunchbase people (founders, executives, investors) with filters for location, role, and associated organization',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Full or partial person name to search for',
            },
            location: {
              type: 'string',
              description: 'City, region, or country to filter by',
            },
            job_type: {
              type: 'string',
              description: 'Job type filter: board_member, advisor, investor, founder, employee',
            },
            organization_permalink: {
              type: 'string',
              description: 'Filter people associated with a specific organization permalink',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results to return (default: 25, max: 100)',
            },
            after_id: {
              type: 'string',
              description: 'Keyset pagination cursor from a previous response',
            },
          },
        },
      },
      {
        name: 'get_person',
        description: 'Retrieve detailed profile for a specific Crunchbase person by their permalink identifier',
        inputSchema: {
          type: 'object',
          properties: {
            entity_id: {
              type: 'string',
              description: 'Person permalink (e.g. "elon-musk", "sam-altman")',
            },
            field_ids: {
              type: 'string',
              description: 'Comma-separated list of fields to return (e.g. "identifier,first_name,last_name,primary_job_title,primary_organization")',
            },
          },
          required: ['entity_id'],
        },
      },
      {
        name: 'search_funding_rounds',
        description: 'Search Crunchbase funding rounds with filters for investment type, date range, funding amount, and investor',
        inputSchema: {
          type: 'object',
          properties: {
            investment_type: {
              type: 'string',
              description: 'Type of funding round: seed, angel, series_a, series_b, series_c, series_d, series_e, venture, debt_financing, convertible_note, corporate_round, equity_crowdfunding, initial_coin_offering, post_ipo_equity, post_ipo_debt, private_equity',
            },
            announced_on_after: {
              type: 'string',
              description: 'Only return rounds announced on or after this date (format: YYYY-MM-DD)',
            },
            announced_on_before: {
              type: 'string',
              description: 'Only return rounds announced on or before this date (format: YYYY-MM-DD)',
            },
            money_raised_min: {
              type: 'number',
              description: 'Minimum amount raised in USD',
            },
            money_raised_max: {
              type: 'number',
              description: 'Maximum amount raised in USD',
            },
            organization_permalink: {
              type: 'string',
              description: 'Filter rounds for a specific organization by permalink',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results to return (default: 25, max: 100)',
            },
            after_id: {
              type: 'string',
              description: 'Keyset pagination cursor from a previous response',
            },
          },
        },
      },
      {
        name: 'get_funding_round',
        description: 'Retrieve details for a specific Crunchbase funding round by its entity ID',
        inputSchema: {
          type: 'object',
          properties: {
            entity_id: {
              type: 'string',
              description: 'Funding round entity ID from a prior search result',
            },
            field_ids: {
              type: 'string',
              description: 'Comma-separated list of fields to return (e.g. "identifier,announced_on,investment_type,money_raised,lead_investors")',
            },
          },
          required: ['entity_id'],
        },
      },
      {
        name: 'search_acquisitions',
        description: 'Search Crunchbase acquisitions with filters for acquirer, acquired organization, and date range',
        inputSchema: {
          type: 'object',
          properties: {
            acquirer_permalink: {
              type: 'string',
              description: 'Permalink of the acquiring organization to filter by',
            },
            acquiree_permalink: {
              type: 'string',
              description: 'Permalink of the acquired organization to filter by',
            },
            announced_on_after: {
              type: 'string',
              description: 'Only return acquisitions announced on or after this date (format: YYYY-MM-DD)',
            },
            announced_on_before: {
              type: 'string',
              description: 'Only return acquisitions announced on or before this date (format: YYYY-MM-DD)',
            },
            price_min: {
              type: 'number',
              description: 'Minimum acquisition price in USD',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results to return (default: 25, max: 100)',
            },
            after_id: {
              type: 'string',
              description: 'Keyset pagination cursor from a previous response',
            },
          },
        },
      },
      {
        name: 'get_acquisition',
        description: 'Retrieve details for a specific Crunchbase acquisition by its entity ID',
        inputSchema: {
          type: 'object',
          properties: {
            entity_id: {
              type: 'string',
              description: 'Acquisition entity ID from a prior search result',
            },
            field_ids: {
              type: 'string',
              description: 'Comma-separated list of fields to return (e.g. "identifier,announced_on,price,acquirer_identifier,acquiree_identifier")',
            },
          },
          required: ['entity_id'],
        },
      },
      {
        name: 'search_investments',
        description: 'Search Crunchbase investments made by a specific investor organization or person',
        inputSchema: {
          type: 'object',
          properties: {
            investor_permalink: {
              type: 'string',
              description: 'Permalink of the investor (organization or person) to retrieve investments for',
            },
            investment_type: {
              type: 'string',
              description: 'Type of funding round: seed, series_a, series_b, series_c, venture (default: no filter)',
            },
            announced_on_after: {
              type: 'string',
              description: 'Only return investments announced on or after this date (format: YYYY-MM-DD)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results to return (default: 25, max: 100)',
            },
            after_id: {
              type: 'string',
              description: 'Keyset pagination cursor from a previous response',
            },
          },
        },
      },
      {
        name: 'autocomplete_entities',
        description: 'Autocomplete search for Crunchbase entity names — returns matching organizations, people, or funding rounds for a partial query string',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Partial name string to autocomplete (e.g. "Open" returns OpenAI, OpenTable, etc.)',
            },
            collection_ids: {
              type: 'string',
              description: 'Comma-separated entity types to search: organizations, people, funding_rounds, acquisitions (default: organizations)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of suggestions to return (default: 10, max: 25)',
            },
          },
          required: ['query'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'search_organizations':
          return this.searchOrganizations(args);
        case 'get_organization':
          return this.getOrganization(args);
        case 'search_people':
          return this.searchPeople(args);
        case 'get_person':
          return this.getPerson(args);
        case 'search_funding_rounds':
          return this.searchFundingRounds(args);
        case 'get_funding_round':
          return this.getFundingRound(args);
        case 'search_acquisitions':
          return this.searchAcquisitions(args);
        case 'get_acquisition':
          return this.getAcquisition(args);
        case 'search_investments':
          return this.searchInvestments(args);
        case 'autocomplete_entities':
          return this.autocompleteEntities(args);
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

  private truncate(data: unknown): string {
    const text = JSON.stringify(data, null, 2);
    return text.length > 10_000
      ? text.slice(0, 10_000) + `\n... [truncated, ${text.length} total chars]`
      : text;
  }

  private async apiGet(path: string, params: Record<string, string>): Promise<ToolResult> {
    params['user_key'] = this.apiKey;
    const qs = new URLSearchParams(params).toString();
    const url = `${this.baseUrl}${path}?${qs}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apiPost(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const url = `${this.baseUrl}${path}?user_key=${encodeURIComponent(this.apiKey)}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async searchOrganizations(args: Record<string, unknown>): Promise<ToolResult> {
    const limit = (args.limit as number) ?? 25;
    const query: unknown[] = [];
    if (args.name) {
      query.push({ type: 'predicate', field_id: 'facet_ids', operator_id: 'includes', values: ['company'] });
      query.push({ type: 'predicate', field_id: 'identifier', operator_id: 'contains', values: [args.name] });
    }
    if (args.funding_status) {
      query.push({ type: 'predicate', field_id: 'funding_stage', operator_id: 'includes', values: [args.funding_status] });
    }
    if (args.employee_count) {
      query.push({ type: 'predicate', field_id: 'num_employees_enum', operator_id: 'includes', values: [args.employee_count] });
    }
    const body: Record<string, unknown> = {
      field_ids: ['identifier', 'short_description', 'primary_role', 'location_identifiers', 'categories', 'funding_total', 'last_funding_type', 'employee_count', 'founded_on', 'website_url'],
      query,
      limit,
    };
    if (args.after_id) body.after_id = args.after_id;
    return this.apiPost('/searches/organizations', body);
  }

  private async getOrganization(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.entity_id) return { content: [{ type: 'text', text: 'entity_id is required' }], isError: true };
    const fieldIds = (args.field_ids as string) || 'identifier,short_description,funding_total,employee_count,founded_on,categories,location_identifiers,website_url,social_media';
    return this.apiGet(`/entities/organizations/${encodeURIComponent(args.entity_id as string)}`, { field_ids: fieldIds });
  }

  private async searchPeople(args: Record<string, unknown>): Promise<ToolResult> {
    const limit = (args.limit as number) ?? 25;
    const query: unknown[] = [];
    if (args.job_type) {
      query.push({ type: 'predicate', field_id: 'primary_job_title', operator_id: 'contains', values: [args.job_type] });
    }
    const body: Record<string, unknown> = {
      field_ids: ['identifier', 'first_name', 'last_name', 'primary_job_title', 'primary_organization', 'location_identifiers', 'short_bio'],
      query,
      limit,
    };
    if (args.after_id) body.after_id = args.after_id;
    return this.apiPost('/searches/people', body);
  }

  private async getPerson(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.entity_id) return { content: [{ type: 'text', text: 'entity_id is required' }], isError: true };
    const fieldIds = (args.field_ids as string) || 'identifier,first_name,last_name,primary_job_title,primary_organization,location_identifiers,short_bio,investor_stage,investor_type';
    return this.apiGet(`/entities/people/${encodeURIComponent(args.entity_id as string)}`, { field_ids: fieldIds });
  }

  private async searchFundingRounds(args: Record<string, unknown>): Promise<ToolResult> {
    const limit = (args.limit as number) ?? 25;
    const query: unknown[] = [];
    if (args.investment_type) {
      query.push({ type: 'predicate', field_id: 'investment_type', operator_id: 'includes', values: [args.investment_type] });
    }
    if (args.announced_on_after) {
      query.push({ type: 'predicate', field_id: 'announced_on', operator_id: 'gte', values: [args.announced_on_after] });
    }
    if (args.announced_on_before) {
      query.push({ type: 'predicate', field_id: 'announced_on', operator_id: 'lte', values: [args.announced_on_before] });
    }
    if (args.money_raised_min !== undefined) {
      query.push({ type: 'predicate', field_id: 'money_raised', operator_id: 'gte', values: [{ value: args.money_raised_min, currency: 'USD' }] });
    }
    if (args.money_raised_max !== undefined) {
      query.push({ type: 'predicate', field_id: 'money_raised', operator_id: 'lte', values: [{ value: args.money_raised_max, currency: 'USD' }] });
    }
    if (args.organization_permalink) {
      query.push({ type: 'predicate', field_id: 'funded_organization_identifier', operator_id: 'includes', values: [args.organization_permalink] });
    }
    const body: Record<string, unknown> = {
      field_ids: ['identifier', 'announced_on', 'investment_type', 'money_raised', 'funded_organization_identifier', 'lead_investor_identifiers', 'investor_identifiers'],
      query,
      limit,
    };
    if (args.after_id) body.after_id = args.after_id;
    return this.apiPost('/searches/funding_rounds', body);
  }

  private async getFundingRound(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.entity_id) return { content: [{ type: 'text', text: 'entity_id is required' }], isError: true };
    const fieldIds = (args.field_ids as string) || 'identifier,announced_on,investment_type,money_raised,funded_organization_identifier,lead_investor_identifiers,investor_identifiers,num_investors';
    return this.apiGet(`/entities/funding_rounds/${encodeURIComponent(args.entity_id as string)}`, { field_ids: fieldIds });
  }

  private async searchAcquisitions(args: Record<string, unknown>): Promise<ToolResult> {
    const limit = (args.limit as number) ?? 25;
    const query: unknown[] = [];
    if (args.acquirer_permalink) {
      query.push({ type: 'predicate', field_id: 'acquirer_identifier', operator_id: 'includes', values: [args.acquirer_permalink] });
    }
    if (args.acquiree_permalink) {
      query.push({ type: 'predicate', field_id: 'acquiree_identifier', operator_id: 'includes', values: [args.acquiree_permalink] });
    }
    if (args.announced_on_after) {
      query.push({ type: 'predicate', field_id: 'announced_on', operator_id: 'gte', values: [args.announced_on_after] });
    }
    if (args.announced_on_before) {
      query.push({ type: 'predicate', field_id: 'announced_on', operator_id: 'lte', values: [args.announced_on_before] });
    }
    if (args.price_min !== undefined) {
      query.push({ type: 'predicate', field_id: 'price', operator_id: 'gte', values: [{ value: args.price_min, currency: 'USD' }] });
    }
    const body: Record<string, unknown> = {
      field_ids: ['identifier', 'announced_on', 'price', 'acquirer_identifier', 'acquiree_identifier', 'acquisition_type', 'acquisition_status'],
      query,
      limit,
    };
    if (args.after_id) body.after_id = args.after_id;
    return this.apiPost('/searches/acquisitions', body);
  }

  private async getAcquisition(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.entity_id) return { content: [{ type: 'text', text: 'entity_id is required' }], isError: true };
    const fieldIds = (args.field_ids as string) || 'identifier,announced_on,price,acquirer_identifier,acquiree_identifier,acquisition_type,acquisition_status';
    return this.apiGet(`/entities/acquisitions/${encodeURIComponent(args.entity_id as string)}`, { field_ids: fieldIds });
  }

  private async searchInvestments(args: Record<string, unknown>): Promise<ToolResult> {
    const limit = (args.limit as number) ?? 25;
    const query: unknown[] = [];
    if (args.investor_permalink) {
      query.push({ type: 'predicate', field_id: 'investor_identifier', operator_id: 'includes', values: [args.investor_permalink] });
    }
    if (args.investment_type) {
      query.push({ type: 'predicate', field_id: 'funding_round_investment_type', operator_id: 'includes', values: [args.investment_type] });
    }
    if (args.announced_on_after) {
      query.push({ type: 'predicate', field_id: 'announced_on', operator_id: 'gte', values: [args.announced_on_after] });
    }
    const body: Record<string, unknown> = {
      field_ids: ['identifier', 'announced_on', 'investor_identifier', 'funded_organization_identifier', 'funding_round_identifier', 'money_invested', 'is_lead_investor'],
      query,
      limit,
    };
    if (args.after_id) body.after_id = args.after_id;
    return this.apiPost('/searches/investments', body);
  }

  private async autocompleteEntities(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.query) return { content: [{ type: 'text', text: 'query is required' }], isError: true };
    const params: Record<string, string> = {
      query: args.query as string,
      collection_ids: (args.collection_ids as string) || 'organizations',
      limit: String((args.limit as number) ?? 10),
    };
    return this.apiGet('/autocompletes', params);
  }
}

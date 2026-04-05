/**
 * PitchBook MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// PitchBook announced subscriber-only hosted integrations with Perplexity (2026-03-12) and OpenAI/ChatGPT,
// but these are managed integrations hosted by PitchBook for their subscribers — no open-source MCP server,
// no GitHub repo, no npm package, and no self-hostable endpoint has been published. Does not qualify as
// an official MCP server under the protocol criteria. Our adapter covers: 14 tools.
// Recommendation: use-rest-api
//
// Base URL: https://api.pitchbook.com
// Auth: PB-Token API key in Authorization header (Authorization: PB-Token {API_KEY})
// Docs: https://pitchbook.com/help/PitchBook-api
//       https://documenter.getpostman.com/view/5190535/TzCV1iRc (v2 Postman docs)
// Rate limits: Credit-based — each API call deducts from your allocated credits (402 returned on exhaustion)

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface PitchBookConfig {
  apiKey: string;
  baseUrl?: string;
}

export class PitchBookMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: PitchBookConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.pitchbook.com';
  }

  static catalog() {
    return {
      name: 'pitchbook',
      displayName: 'PitchBook',
      version: '1.0.0',
      category: 'finance',
      keywords: [
        'pitchbook', 'private equity', 'venture capital', 'startup', 'investment',
        'deal', 'company', 'investor', 'fund', 'fundraising', 'valuation',
        'vc', 'pe', 'mergers acquisitions', 'limited partner', 'cap table',
      ],
      toolNames: [
        'search_companies', 'get_company', 'get_company_deals', 'get_company_investors',
        'search_deals', 'get_deal',
        'search_investors', 'get_investor', 'get_investor_portfolio',
        'search_funds', 'get_fund',
        'search_people', 'get_person',
        'get_service_providers',
      ],
      description: 'PitchBook private market intelligence: search and retrieve companies, deals, investors, funds, people, and service providers with financial data and deal history.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'search_companies',
        description: 'Search for companies in PitchBook by name, industry, location, or funding stage with optional financial filters',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Company name or keyword search term',
            },
            industry: {
              type: 'string',
              description: 'Industry vertical filter (e.g. "SaaS", "Fintech", "Healthcare IT")',
            },
            location: {
              type: 'string',
              description: 'Company headquarters location (e.g. "San Francisco", "New York", "United States")',
            },
            stage: {
              type: 'string',
              description: 'Company stage filter: Seed, Early Stage VC, Late Stage VC, Public, Acquired',
            },
            min_valuation: {
              type: 'number',
              description: 'Minimum post-money valuation in USD',
            },
            max_valuation: {
              type: 'number',
              description: 'Maximum post-money valuation in USD',
            },
            limit: {
              type: 'number',
              description: 'Maximum results to return (default: 25, max: 100)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
          },
        },
      },
      {
        name: 'get_company',
        description: 'Get detailed profile for a specific company by PitchBook company ID including financials, description, and key personnel',
        inputSchema: {
          type: 'object',
          properties: {
            company_id: {
              type: 'string',
              description: 'PitchBook company ID',
            },
          },
          required: ['company_id'],
        },
      },
      {
        name: 'get_company_deals',
        description: 'Get all financing deals and transactions for a specific company including round size, investors, and valuation',
        inputSchema: {
          type: 'object',
          properties: {
            company_id: {
              type: 'string',
              description: 'PitchBook company ID',
            },
            deal_type: {
              type: 'string',
              description: 'Filter by deal type: Angel, Seed, Series A, Series B, PE Growth, Buyout, IPO, Acquisition',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of deals to return (default: 25)',
            },
          },
          required: ['company_id'],
        },
      },
      {
        name: 'get_company_investors',
        description: 'Get all investors in a specific company including ownership stake, investment date, and investor type',
        inputSchema: {
          type: 'object',
          properties: {
            company_id: {
              type: 'string',
              description: 'PitchBook company ID',
            },
          },
          required: ['company_id'],
        },
      },
      {
        name: 'search_deals',
        description: 'Search for investment deals by type, size, date, industry, or geography',
        inputSchema: {
          type: 'object',
          properties: {
            deal_type: {
              type: 'string',
              description: 'Deal type: Angel, Seed, Early Stage VC, Late Stage VC, PE Growth, Buyout, IPO, Acquisition',
            },
            industry: {
              type: 'string',
              description: 'Industry vertical filter',
            },
            location: {
              type: 'string',
              description: 'Geographic filter for deal location',
            },
            min_size: {
              type: 'number',
              description: 'Minimum deal size in USD',
            },
            max_size: {
              type: 'number',
              description: 'Maximum deal size in USD',
            },
            date_from: {
              type: 'string',
              description: 'Start date filter in YYYY-MM-DD format',
            },
            date_to: {
              type: 'string',
              description: 'End date filter in YYYY-MM-DD format',
            },
            limit: {
              type: 'number',
              description: 'Maximum results (default: 25, max: 100)',
            },
            page: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
          },
        },
      },
      {
        name: 'get_deal',
        description: 'Get full details for a specific deal including investors, company, deal terms, and post-money valuation',
        inputSchema: {
          type: 'object',
          properties: {
            deal_id: {
              type: 'string',
              description: 'PitchBook deal ID',
            },
          },
          required: ['deal_id'],
        },
      },
      {
        name: 'search_investors',
        description: 'Search for investors (VC firms, PE firms, angels, CVC) by name, type, or investment focus',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Investor name or keyword',
            },
            investor_type: {
              type: 'string',
              description: 'Type: Venture Capital, Private Equity, Angel, Corporate, Accelerator',
            },
            location: {
              type: 'string',
              description: 'Investor headquarters location',
            },
            stage_focus: {
              type: 'string',
              description: 'Preferred investment stage: Seed, Early Stage, Late Stage, Growth Equity',
            },
            limit: {
              type: 'number',
              description: 'Maximum results (default: 25)',
            },
            page: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
          },
        },
      },
      {
        name: 'get_investor',
        description: 'Get detailed profile for a specific investor including AUM, investment thesis, and key partners',
        inputSchema: {
          type: 'object',
          properties: {
            investor_id: {
              type: 'string',
              description: 'PitchBook investor ID',
            },
          },
          required: ['investor_id'],
        },
      },
      {
        name: 'get_investor_portfolio',
        description: 'Get the portfolio companies for a specific investor with deal details and current status',
        inputSchema: {
          type: 'object',
          properties: {
            investor_id: {
              type: 'string',
              description: 'PitchBook investor ID',
            },
            status: {
              type: 'string',
              description: 'Filter by company status: Active, Exited (IPO/Acquired), Bankrupt (default: all)',
            },
            limit: {
              type: 'number',
              description: 'Maximum portfolio companies to return (default: 50)',
            },
          },
          required: ['investor_id'],
        },
      },
      {
        name: 'search_funds',
        description: 'Search for private equity and venture capital funds by firm, vintage year, or fund size',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Fund name or sponsoring firm name',
            },
            fund_type: {
              type: 'string',
              description: 'Fund type: Venture Capital, Buyout, Growth Equity, Real Estate, Infrastructure',
            },
            vintage_year_from: {
              type: 'number',
              description: 'Minimum vintage year (e.g. 2020)',
            },
            vintage_year_to: {
              type: 'number',
              description: 'Maximum vintage year',
            },
            min_size: {
              type: 'number',
              description: 'Minimum fund size in USD',
            },
            limit: {
              type: 'number',
              description: 'Maximum results (default: 25)',
            },
          },
        },
      },
      {
        name: 'get_fund',
        description: 'Get full details for a specific fund including commitments, returns, strategy, and LP list',
        inputSchema: {
          type: 'object',
          properties: {
            fund_id: {
              type: 'string',
              description: 'PitchBook fund ID',
            },
          },
          required: ['fund_id'],
        },
      },
      {
        name: 'search_people',
        description: 'Search for individuals in PitchBook by name, role, firm, or industry — covers founders, investors, and executives',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Person name or role keyword',
            },
            title: {
              type: 'string',
              description: 'Job title filter (e.g. "CEO", "General Partner", "Partner")',
            },
            organization: {
              type: 'string',
              description: 'Company or firm name to scope person search',
            },
            limit: {
              type: 'number',
              description: 'Maximum results (default: 25)',
            },
          },
        },
      },
      {
        name: 'get_person',
        description: 'Get full profile for a specific person including current and past roles, investments, and board seats',
        inputSchema: {
          type: 'object',
          properties: {
            person_id: {
              type: 'string',
              description: 'PitchBook person ID',
            },
          },
          required: ['person_id'],
        },
      },
      {
        name: 'get_service_providers',
        description: 'Search for service providers (law firms, auditors, placement agents) by type and focus area',
        inputSchema: {
          type: 'object',
          properties: {
            service_type: {
              type: 'string',
              description: 'Service type: Law Firm, Accounting Firm, Placement Agent, Prime Broker, Lender',
            },
            query: {
              type: 'string',
              description: 'Service provider name or keyword',
            },
            location: {
              type: 'string',
              description: 'Geographic filter',
            },
            limit: {
              type: 'number',
              description: 'Maximum results (default: 25)',
            },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'search_companies':
          return this.searchCompanies(args);
        case 'get_company':
          return this.getCompany(args);
        case 'get_company_deals':
          return this.getCompanyDeals(args);
        case 'get_company_investors':
          return this.getCompanyInvestors(args);
        case 'search_deals':
          return this.searchDeals(args);
        case 'get_deal':
          return this.getDeal(args);
        case 'search_investors':
          return this.searchInvestors(args);
        case 'get_investor':
          return this.getInvestor(args);
        case 'get_investor_portfolio':
          return this.getInvestorPortfolio(args);
        case 'search_funds':
          return this.searchFunds(args);
        case 'get_fund':
          return this.getFund(args);
        case 'search_people':
          return this.searchPeople(args);
        case 'get_person':
          return this.getPerson(args);
        case 'get_service_providers':
          return this.getServiceProviders(args);
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
      Authorization: `PB-Token ${this.apiKey}`,
      Accept: 'application/json',
    };
  }

  private async apiGet(path: string, params: Record<string, string> = {}): Promise<ToolResult> {
    const qs = new URLSearchParams(params).toString();
    const url = `${this.baseUrl}${path}${qs ? '?' + qs : ''}`;
    const response = await this.fetchWithRetry(url, { method: 'GET', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async searchCompanies(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      limit: String((args.limit as number) ?? 25),
      page: String((args.page as number) ?? 1),
    };
    if (args.query) params.q = args.query as string;
    if (args.industry) params.industry = args.industry as string;
    if (args.location) params.location = args.location as string;
    if (args.stage) params.stage = args.stage as string;
    if (args.min_valuation) params.minValuation = String(args.min_valuation);
    if (args.max_valuation) params.maxValuation = String(args.max_valuation);
    return this.apiGet('/v2/companies/search', params);
  }

  private async getCompany(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.company_id) return { content: [{ type: 'text', text: 'company_id is required' }], isError: true };
    return this.apiGet(`/v2/companies/${encodeURIComponent(args.company_id as string)}`);
  }

  private async getCompanyDeals(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.company_id) return { content: [{ type: 'text', text: 'company_id is required' }], isError: true };
    const params: Record<string, string> = {
      limit: String((args.limit as number) ?? 25),
    };
    if (args.deal_type) params.dealType = args.deal_type as string;
    return this.apiGet(`/v2/companies/${encodeURIComponent(args.company_id as string)}/deals`, params);
  }

  private async getCompanyInvestors(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.company_id) return { content: [{ type: 'text', text: 'company_id is required' }], isError: true };
    return this.apiGet(`/v2/companies/${encodeURIComponent(args.company_id as string)}/investors`);
  }

  private async searchDeals(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      limit: String((args.limit as number) ?? 25),
      page: String((args.page as number) ?? 1),
    };
    if (args.deal_type) params.dealType = args.deal_type as string;
    if (args.industry) params.industry = args.industry as string;
    if (args.location) params.location = args.location as string;
    if (args.min_size) params.minSize = String(args.min_size);
    if (args.max_size) params.maxSize = String(args.max_size);
    if (args.date_from) params.dateFrom = args.date_from as string;
    if (args.date_to) params.dateTo = args.date_to as string;
    return this.apiGet('/v2/deals/search', params);
  }

  private async getDeal(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.deal_id) return { content: [{ type: 'text', text: 'deal_id is required' }], isError: true };
    return this.apiGet(`/v2/deals/${encodeURIComponent(args.deal_id as string)}`);
  }

  private async searchInvestors(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      limit: String((args.limit as number) ?? 25),
      page: String((args.page as number) ?? 1),
    };
    if (args.query) params.q = args.query as string;
    if (args.investor_type) params.investorType = args.investor_type as string;
    if (args.location) params.location = args.location as string;
    if (args.stage_focus) params.stageFocus = args.stage_focus as string;
    return this.apiGet('/v2/investors/search', params);
  }

  private async getInvestor(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.investor_id) return { content: [{ type: 'text', text: 'investor_id is required' }], isError: true };
    return this.apiGet(`/v2/investors/${encodeURIComponent(args.investor_id as string)}`);
  }

  private async getInvestorPortfolio(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.investor_id) return { content: [{ type: 'text', text: 'investor_id is required' }], isError: true };
    const params: Record<string, string> = {
      limit: String((args.limit as number) ?? 50),
    };
    if (args.status) params.status = args.status as string;
    return this.apiGet(`/v2/investors/${encodeURIComponent(args.investor_id as string)}/portfolio`, params);
  }

  private async searchFunds(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      limit: String((args.limit as number) ?? 25),
    };
    if (args.query) params.q = args.query as string;
    if (args.fund_type) params.fundType = args.fund_type as string;
    if (args.vintage_year_from) params.vintageYearFrom = String(args.vintage_year_from);
    if (args.vintage_year_to) params.vintageYearTo = String(args.vintage_year_to);
    if (args.min_size) params.minSize = String(args.min_size);
    return this.apiGet('/v2/funds/search', params);
  }

  private async getFund(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.fund_id) return { content: [{ type: 'text', text: 'fund_id is required' }], isError: true };
    return this.apiGet(`/v2/funds/${encodeURIComponent(args.fund_id as string)}`);
  }

  private async searchPeople(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      limit: String((args.limit as number) ?? 25),
    };
    if (args.query) params.q = args.query as string;
    if (args.title) params.title = args.title as string;
    if (args.organization) params.organization = args.organization as string;
    return this.apiGet('/v2/people/search', params);
  }

  private async getPerson(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.person_id) return { content: [{ type: 'text', text: 'person_id is required' }], isError: true };
    return this.apiGet(`/v2/people/${encodeURIComponent(args.person_id as string)}`);
  }

  private async getServiceProviders(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      limit: String((args.limit as number) ?? 25),
    };
    if (args.service_type) params.serviceType = args.service_type as string;
    if (args.query) params.q = args.query as string;
    if (args.location) params.location = args.location as string;
    return this.apiGet('/v2/service-providers/search', params);
  }
}

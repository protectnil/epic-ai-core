/**
 * Dun & Bradstreet MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: D&B publishes MCP servers via Databricks Marketplace (D&B.AI suite, announced 2025).
//   Transport: streamable-HTTP (Databricks-hosted). Auth: Databricks credentials.
//   NOTE: The D&B MCP is Databricks Marketplace-only — not a standalone GitHub/npm server accessible
//   outside of Databricks. It does not satisfy criterion 1 (no public GitHub repo or npm package).
//   Recommendation: use-rest-api. Document MCP for future evaluation if D&B publishes a standalone server.
// Our adapter covers: 12 tools. Vendor MCP (Databricks): unknown tool count (not publicly enumerated).
//
// Base URL: https://plus.dnb.com
// Auth: OAuth2 client credentials — POST /v2/token, Authorization: Basic <base64(key:secret)>,
//       Content-Type: application/json, body: {"grant_type":"client_credentials"}.
//       Access tokens expire after 24 hours (expiresIn: 86400); adapter refreshes 60 seconds early.
// Docs: https://directplus.documentation.dnb.com/
//       https://docs.dnb.com/partner/en-US/plus/token/1.0/authentication
// Rate limits: Not publicly documented; subject to contract entitlements

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface DunBradstreetConfig {
  consumerKey: string;
  consumerSecret: string;
  baseUrl?: string;
}

export class DunBradstreetMCPServer extends MCPAdapterBase {
  private readonly consumerKey: string;
  private readonly consumerSecret: string;
  private readonly baseUrl: string;
  private bearerToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(config: DunBradstreetConfig) {
    super();
    this.consumerKey = config.consumerKey;
    this.consumerSecret = config.consumerSecret;
    this.baseUrl = config.baseUrl || 'https://plus.dnb.com';
  }

  static catalog() {
    return {
      name: 'dun-bradstreet',
      displayName: 'Dun & Bradstreet',
      version: '1.0.0',
      category: 'finance',
      keywords: [
        'dun bradstreet', 'd&b', 'dnb', 'direct plus', 'duns', 'business credit',
        'company data', 'firmographics', 'credit score', 'risk rating', 'corporate hierarchy',
        'beneficial ownership', 'financial strength', 'match', 'enrichment', 'compliance',
        'kyb', 'know your business', 'commercial data',
      ],
      toolNames: [
        'match_company', 'get_company_profile', 'get_financials', 'get_credit_risk',
        'get_corporate_hierarchy', 'get_beneficial_ownership', 'search_companies',
        'get_company_contacts', 'get_industry_data', 'get_news',
        'get_firmographics', 'get_payment_insights',
      ],
      description: 'D&B Direct+ business data: match companies by name/DUNS, retrieve firmographics, credit scores, financials, corporate hierarchy, and beneficial ownership.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'match_company',
        description: 'Match an entity to a D-U-N-S number using name and location, registration number, or domain',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Company or organization name (required for name+location match)',
            },
            country_iso: {
              type: 'string',
              description: 'ISO 3166-1 alpha-2 country code e.g. US, GB, DE (required for name match)',
            },
            duns_number: {
              type: 'string',
              description: 'D-U-N-S number for direct lookup (9 digits, no dashes)',
            },
            registration_number: {
              type: 'string',
              description: 'Business registration number (EIN, company number, etc.)',
            },
            domain: {
              type: 'string',
              description: 'Company website domain or email address for domain-based match',
            },
            street_address: {
              type: 'string',
              description: 'Street address line to improve match precision',
            },
            city: {
              type: 'string',
              description: 'City name to improve match precision',
            },
            state: {
              type: 'string',
              description: 'State or province to improve match precision',
            },
            postal_code: {
              type: 'string',
              description: 'Postal or ZIP code to improve match precision',
            },
          },
        },
      },
      {
        name: 'get_company_profile',
        description: 'Retrieve a comprehensive company profile by D-U-N-S number including name, address, industry, and size',
        inputSchema: {
          type: 'object',
          properties: {
            duns_number: {
              type: 'string',
              description: 'D-U-N-S number (9 digits) of the company to retrieve',
            },
          },
          required: ['duns_number'],
        },
      },
      {
        name: 'get_financials',
        description: 'Retrieve financial statements, revenue, employee count, and growth data for a company by D-U-N-S number',
        inputSchema: {
          type: 'object',
          properties: {
            duns_number: {
              type: 'string',
              description: 'D-U-N-S number of the company',
            },
          },
          required: ['duns_number'],
        },
      },
      {
        name: 'get_credit_risk',
        description: 'Get D&B credit scores, delinquency scores, failure risk scores, and credit limit recommendations for a company',
        inputSchema: {
          type: 'object',
          properties: {
            duns_number: {
              type: 'string',
              description: 'D-U-N-S number of the company to assess',
            },
          },
          required: ['duns_number'],
        },
      },
      {
        name: 'get_corporate_hierarchy',
        description: 'Retrieve the corporate family tree showing parent, subsidiary, and branch relationships for a D-U-N-S entity',
        inputSchema: {
          type: 'object',
          properties: {
            duns_number: {
              type: 'string',
              description: 'D-U-N-S number of the company (returns global ultimate parent and all linked entities)',
            },
            levels: {
              type: 'number',
              description: 'Number of hierarchy levels to return (default: 3, max: 10)',
            },
          },
          required: ['duns_number'],
        },
      },
      {
        name: 'get_beneficial_ownership',
        description: 'Retrieve beneficial owners and significant controllers of a company for KYB and AML compliance',
        inputSchema: {
          type: 'object',
          properties: {
            duns_number: {
              type: 'string',
              description: 'D-U-N-S number of the company to check',
            },
          },
          required: ['duns_number'],
        },
      },
      {
        name: 'search_companies',
        description: 'Search the D&B Data Cloud for companies matching a name, industry, geography, or size criteria',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Full or partial company name to search for',
            },
            country_iso: {
              type: 'string',
              description: 'ISO 3166-1 alpha-2 country code to restrict search e.g. US',
            },
            sic_code: {
              type: 'string',
              description: 'SIC industry code to filter by (4-digit)',
            },
            naics_code: {
              type: 'string',
              description: 'NAICS industry code to filter by (6-digit)',
            },
            employee_range: {
              type: 'string',
              description: 'Employee count range e.g. 1-10, 11-50, 51-200, 201-1000, 1001+',
            },
            revenue_range: {
              type: 'string',
              description: 'Annual revenue range in USD e.g. <1M, 1M-10M, 10M-100M, 100M+',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            page_size: {
              type: 'number',
              description: 'Results per page (default: 25, max: 100)',
            },
          },
        },
      },
      {
        name: 'get_company_contacts',
        description: 'Retrieve key executive and contact information for a company by D-U-N-S number',
        inputSchema: {
          type: 'object',
          properties: {
            duns_number: {
              type: 'string',
              description: 'D-U-N-S number of the company',
            },
            level: {
              type: 'string',
              description: 'Contact seniority level: C-Suite, VP, Director, Manager, All (default: All)',
            },
          },
          required: ['duns_number'],
        },
      },
      {
        name: 'get_industry_data',
        description: 'Retrieve industry benchmarks, averages, and statistics for a SIC or NAICS code',
        inputSchema: {
          type: 'object',
          properties: {
            sic_code: {
              type: 'string',
              description: 'SIC industry code (4-digit) — provide sic_code or naics_code',
            },
            naics_code: {
              type: 'string',
              description: 'NAICS industry code (6-digit) — provide naics_code or sic_code',
            },
            country_iso: {
              type: 'string',
              description: 'ISO country code to scope industry data (default: US)',
            },
          },
        },
      },
      {
        name: 'get_news',
        description: 'Retrieve recent news and press coverage for a company from the D&B news feed by D-U-N-S number',
        inputSchema: {
          type: 'object',
          properties: {
            duns_number: {
              type: 'string',
              description: 'D-U-N-S number of the company',
            },
            days: {
              type: 'number',
              description: 'Number of days of news history to retrieve (default: 30, max: 365)',
            },
            limit: {
              type: 'number',
              description: 'Maximum news items to return (default: 20)',
            },
          },
          required: ['duns_number'],
        },
      },
      {
        name: 'get_firmographics',
        description: 'Retrieve detailed firmographic data including geocodes, corporate linkage, and demographic attributes for a company',
        inputSchema: {
          type: 'object',
          properties: {
            duns_number: {
              type: 'string',
              description: 'D-U-N-S number of the company',
            },
          },
          required: ['duns_number'],
        },
      },
      {
        name: 'get_payment_insights',
        description: 'Retrieve payment behavior data, trade experiences, and D&B PAYDEX score for a company',
        inputSchema: {
          type: 'object',
          properties: {
            duns_number: {
              type: 'string',
              description: 'D-U-N-S number of the company',
            },
          },
          required: ['duns_number'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'match_company': return this.matchCompany(args);
        case 'get_company_profile': return this.getCompanyProfile(args);
        case 'get_financials': return this.getFinancials(args);
        case 'get_credit_risk': return this.getCreditRisk(args);
        case 'get_corporate_hierarchy': return this.getCorporateHierarchy(args);
        case 'get_beneficial_ownership': return this.getBeneficialOwnership(args);
        case 'search_companies': return this.searchCompanies(args);
        case 'get_company_contacts': return this.getCompanyContacts(args);
        case 'get_industry_data': return this.getIndustryData(args);
        case 'get_news': return this.getNews(args);
        case 'get_firmographics': return this.getFirmographics(args);
        case 'get_payment_insights': return this.getPaymentInsights(args);
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

  private async getOrRefreshToken(): Promise<string> {
    const now = Date.now();
    if (this.bearerToken && this.tokenExpiry > now) {
      return this.bearerToken;
    }
    const response = await this.fetchWithRetry(`${this.baseUrl}/v2/token`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${this.consumerKey}:${this.consumerSecret}`)}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ grant_type: 'client_credentials' }),
    });
    if (!response.ok) {
      throw new Error(`OAuth2 token request failed: ${response.status} ${response.statusText}`);
    }
    const data = await response.json() as { access_token: string; expiresIn: number };
    this.bearerToken = data.access_token;
    // D&B tokens expire after 24h (86400s); refresh 60s early
    this.tokenExpiry = now + ((data.expiresIn ?? 86400) - 60) * 1000;
    return this.bearerToken;
  }

  private async dnbGet(path: string, params: Record<string, string> = {}): Promise<ToolResult> {
    const token = await this.getOrRefreshToken();
    const qs = Object.keys(params).length ? '?' + new URLSearchParams(params).toString() : '';
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}${qs}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async dnbPost(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const token = await this.getOrRefreshToken();
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }


  private async matchCompany(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {};
    if (args.duns_number) {
      body.matchType = 'duns';
      body.duns = args.duns_number;
    } else if (args.registration_number && args.country_iso) {
      body.matchType = 'registration';
      body.registrationNumber = args.registration_number;
      body.countryISOAlpha2Code = args.country_iso;
    } else if (args.domain) {
      body.matchType = 'domain';
      body.domain = args.domain;
    } else if (args.name && args.country_iso) {
      body.matchType = 'name';
      body.name = args.name;
      body.countryISOAlpha2Code = args.country_iso;
      if (args.street_address) body.streetAddressLine1 = args.street_address;
      if (args.city) body.addressLocality = { name: args.city };
      if (args.state) body.addressRegion = { abbreviatedName: args.state };
      if (args.postal_code) body.postalCode = args.postal_code;
    } else {
      return { content: [{ type: 'text', text: 'Provide duns_number, registration_number+country_iso, domain, or name+country_iso' }], isError: true };
    }
    return this.dnbPost('/v1/match/cleanseMatch', body);
  }

  private async getCompanyProfile(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.duns_number) return { content: [{ type: 'text', text: 'duns_number is required' }], isError: true };
    return this.dnbGet(`/v1/data/duns/${encodeURIComponent(args.duns_number as string)}`, {
      productId: 'cmpelk',
      versionId: 'v2',
    });
  }

  private async getFinancials(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.duns_number) return { content: [{ type: 'text', text: 'duns_number is required' }], isError: true };
    return this.dnbGet(`/v1/data/duns/${encodeURIComponent(args.duns_number as string)}`, {
      productId: 'cmpcvf',
      versionId: 'v2',
    });
  }

  private async getCreditRisk(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.duns_number) return { content: [{ type: 'text', text: 'duns_number is required' }], isError: true };
    return this.dnbGet(`/v1/data/duns/${encodeURIComponent(args.duns_number as string)}`, {
      productId: 'cmpcsv',
      versionId: 'v2',
    });
  }

  private async getCorporateHierarchy(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.duns_number) return { content: [{ type: 'text', text: 'duns_number is required' }], isError: true };
    const params: Record<string, string> = {
      productId: 'cmpchr',
      versionId: 'v1',
    };
    if (args.levels) params.familyTreeNestingLevel = String(args.levels);
    return this.dnbGet(`/v1/data/duns/${encodeURIComponent(args.duns_number as string)}`, params);
  }

  private async getBeneficialOwnership(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.duns_number) return { content: [{ type: 'text', text: 'duns_number is required' }], isError: true };
    return this.dnbGet(`/v1/data/duns/${encodeURIComponent(args.duns_number as string)}`, {
      productId: 'cmpbos',
      versionId: 'v1',
    });
  }

  private async searchCompanies(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      pageNumber: String((args.page as number) ?? 1),
      pageSize: String((args.page_size as number) ?? 25),
    };
    if (args.name) params.searchTerm = args.name as string;
    if (args.country_iso) params.countryISOAlpha2Code = args.country_iso as string;
    if (args.sic_code) params.primarySICv4 = args.sic_code as string;
    if (args.naics_code) params.primaryNAICS = args.naics_code as string;
    if (args.employee_range) params.employeeCountRange = args.employee_range as string;
    if (args.revenue_range) params.annualSalesVolumeRange = args.revenue_range as string;
    return this.dnbGet('/v1/search/companyList', params);
  }

  private async getCompanyContacts(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.duns_number) return { content: [{ type: 'text', text: 'duns_number is required' }], isError: true };
    const params: Record<string, string> = {
      productId: 'cmpcon',
      versionId: 'v1',
    };
    if (args.level) params.contactLevel = args.level as string;
    return this.dnbGet(`/v1/data/duns/${encodeURIComponent(args.duns_number as string)}`, params);
  }

  private async getIndustryData(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.sic_code && !args.naics_code) {
      return { content: [{ type: 'text', text: 'sic_code or naics_code is required' }], isError: true };
    }
    const params: Record<string, string> = {};
    if (args.sic_code) params.sic = args.sic_code as string;
    if (args.naics_code) params.naics = args.naics_code as string;
    if (args.country_iso) params.countryISOAlpha2Code = args.country_iso as string;
    return this.dnbGet('/v1/industry/benchmarks', params);
  }

  private async getNews(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.duns_number) return { content: [{ type: 'text', text: 'duns_number is required' }], isError: true };
    const params: Record<string, string> = {
      duns: args.duns_number as string,
      daysBack: String((args.days as number) ?? 30),
      pageSize: String((args.limit as number) ?? 20),
    };
    return this.dnbGet('/v1/data/news', params);
  }

  private async getFirmographics(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.duns_number) return { content: [{ type: 'text', text: 'duns_number is required' }], isError: true };
    return this.dnbGet(`/v1/data/duns/${encodeURIComponent(args.duns_number as string)}`, {
      productId: 'cmpfirm',
      versionId: 'v1',
    });
  }

  private async getPaymentInsights(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.duns_number) return { content: [{ type: 'text', text: 'duns_number is required' }], isError: true };
    return this.dnbGet(`/v1/data/duns/${encodeURIComponent(args.duns_number as string)}`, {
      productId: 'cmppy',
      versionId: 'v2',
    });
  }
}

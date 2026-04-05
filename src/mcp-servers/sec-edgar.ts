/**
 * SEC EDGAR MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// No official SEC EDGAR MCP server was found on GitHub. Community wrappers exist (e.g.
// stefanoamorelli/sec-edgar-mcp) but are not published or endorsed by the U.S. SEC.
//
// Base URL: https://data.sec.gov
// Auth: None required for public data APIs. User-Agent header is mandatory per SEC policy.
// Docs: https://www.sec.gov/search-filings/edgar-application-programming-interfaces
// Rate limits: ~10 req/sec per SEC fair-use policy; bursting may trigger 403. Always set User-Agent.
// Recommendation: use-rest-api — no official vendor MCP exists.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface SecEdgarConfig {
  userAgent: string;   // Required by SEC: "CompanyName contact@example.com"
  baseUrl?: string;
}

export class SecEdgarMCPServer extends MCPAdapterBase {
  private readonly userAgent: string;
  private readonly baseUrl: string;

  constructor(config: SecEdgarConfig) {
    super();
    this.userAgent = config.userAgent;
    this.baseUrl = config.baseUrl || 'https://data.sec.gov';
  }

  static catalog() {
    return {
      name: 'sec-edgar',
      displayName: 'SEC EDGAR',
      version: '1.0.0',
      category: 'finance',
      keywords: [
        'sec', 'edgar', 'filing', 'financial', 'disclosure', 'xbrl', 'company', 'cik',
        '10-k', '10-q', '8-k', 'annual report', 'quarterly report', 'securities', 'public company',
      ],
      toolNames: [
        'get_company_submissions', 'get_company_facts', 'get_company_concept',
        'get_xbrl_frames', 'search_full_text', 'get_company_tickers',
        'list_recent_filings', 'get_filing_documents',
      ],
      description: 'SEC EDGAR public filings: retrieve company submissions, XBRL financial facts, annual/quarterly reports, and full-text search across all public filings.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'get_company_submissions',
        description: 'Retrieve a company\'s filing history and metadata by CIK number, including recent 10-K, 10-Q, and 8-K filings',
        inputSchema: {
          type: 'object',
          properties: {
            cik: {
              type: 'string',
              description: 'CIK number, zero-padded to 10 digits (e.g. "0000320193" for Apple). Leading zeros optional.',
            },
          },
          required: ['cik'],
        },
      },
      {
        name: 'get_company_facts',
        description: 'Get all XBRL financial facts for a company (all reported concepts across all periods) by CIK number',
        inputSchema: {
          type: 'object',
          properties: {
            cik: {
              type: 'string',
              description: 'CIK number (zero-padded to 10 digits, e.g. "0000320193")',
            },
          },
          required: ['cik'],
        },
      },
      {
        name: 'get_company_concept',
        description: 'Retrieve all reported values for a single XBRL concept (e.g. Revenue, Assets) for a company across all filings',
        inputSchema: {
          type: 'object',
          properties: {
            cik: {
              type: 'string',
              description: 'CIK number (zero-padded to 10 digits)',
            },
            taxonomy: {
              type: 'string',
              description: 'XBRL taxonomy: us-gaap, ifrs-full, dei, or srt (default: us-gaap)',
            },
            tag: {
              type: 'string',
              description: 'XBRL concept tag name (e.g. Revenues, Assets, NetIncomeLoss, EarningsPerShareBasic)',
            },
          },
          required: ['cik', 'tag'],
        },
      },
      {
        name: 'get_xbrl_frames',
        description: 'Get a cross-company snapshot of a single XBRL fact for all filers in a given calendar period (e.g. all company revenues for Q1 2024)',
        inputSchema: {
          type: 'object',
          properties: {
            taxonomy: {
              type: 'string',
              description: 'XBRL taxonomy: us-gaap, ifrs-full, dei, or srt (default: us-gaap)',
            },
            tag: {
              type: 'string',
              description: 'XBRL concept tag (e.g. Revenues, Assets, NetIncomeLoss)',
            },
            unit: {
              type: 'string',
              description: 'Unit of measure (e.g. USD, shares, pure)',
            },
            year: {
              type: 'number',
              description: 'Calendar year (e.g. 2023)',
            },
            quarter: {
              type: 'string',
              description: 'Quarter: Q1, Q2, Q3, Q4, or omit for annual (CY). Instant facts use I suffix (e.g. Q2I)',
            },
          },
          required: ['tag', 'unit', 'year'],
        },
      },
      {
        name: 'search_full_text',
        description: 'Search full text of EDGAR filings using the EDGAR full-text search API with keyword and entity filters',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Keyword or phrase to search within filing documents',
            },
            entity: {
              type: 'string',
              description: 'Company name or ticker to filter results (optional)',
            },
            form_type: {
              type: 'string',
              description: 'SEC form type filter: 10-K, 10-Q, 8-K, S-1, DEF 14A, etc. (optional)',
            },
            date_range_start: {
              type: 'string',
              description: 'Start date for filing date filter in YYYY-MM-DD format (optional)',
            },
            date_range_end: {
              type: 'string',
              description: 'End date for filing date filter in YYYY-MM-DD format (optional)',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'get_company_tickers',
        description: 'Retrieve the full mapping of company tickers to CIK numbers for all publicly traded companies',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'list_recent_filings',
        description: 'List the most recent SEC filings across all companies, optionally filtered by form type',
        inputSchema: {
          type: 'object',
          properties: {
            form_type: {
              type: 'string',
              description: 'SEC form type to filter: 10-K, 10-Q, 8-K, S-1, DEF 14A, 4, etc. (optional)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of filings to return (default: 40, max: 40 per SEC response)',
            },
          },
        },
      },
      {
        name: 'get_filing_documents',
        description: 'Retrieve the list of documents in a specific SEC filing by accession number and CIK',
        inputSchema: {
          type: 'object',
          properties: {
            cik: {
              type: 'string',
              description: 'CIK number (zero-padded to 10 digits)',
            },
            accession_number: {
              type: 'string',
              description: 'Filing accession number with dashes (e.g. 0000320193-23-000077)',
            },
          },
          required: ['cik', 'accession_number'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'get_company_submissions':
          return this.getCompanySubmissions(args);
        case 'get_company_facts':
          return this.getCompanyFacts(args);
        case 'get_company_concept':
          return this.getCompanyConcept(args);
        case 'get_xbrl_frames':
          return this.getXbrlFrames(args);
        case 'search_full_text':
          return this.searchFullText(args);
        case 'get_company_tickers':
          return this.getCompanyTickers();
        case 'list_recent_filings':
          return this.listRecentFilings(args);
        case 'get_filing_documents':
          return this.getFilingDocuments(args);
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
      'User-Agent': this.userAgent,
      'Accept': 'application/json',
    };
  }

  private padCik(cik: string): string {
    return cik.replace(/^0+/, '').padStart(10, '0');
  }

  private async edgarGet(url: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(url, { headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getCompanySubmissions(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.cik) return { content: [{ type: 'text', text: 'cik is required' }], isError: true };
    const cik = this.padCik(args.cik as string);
    return this.edgarGet(`${this.baseUrl}/submissions/CIK${cik}.json`);
  }

  private async getCompanyFacts(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.cik) return { content: [{ type: 'text', text: 'cik is required' }], isError: true };
    const cik = this.padCik(args.cik as string);
    return this.edgarGet(`${this.baseUrl}/api/xbrl/companyfacts/CIK${cik}.json`);
  }

  private async getCompanyConcept(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.cik || !args.tag) return { content: [{ type: 'text', text: 'cik and tag are required' }], isError: true };
    const cik = this.padCik(args.cik as string);
    const taxonomy = (args.taxonomy as string) || 'us-gaap';
    const tag = args.tag as string;
    return this.edgarGet(`${this.baseUrl}/api/xbrl/companyconcept/CIK${cik}/${taxonomy}/${tag}.json`);
  }

  private async getXbrlFrames(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.tag || !args.unit || !args.year) {
      return { content: [{ type: 'text', text: 'tag, unit, and year are required' }], isError: true };
    }
    const taxonomy = (args.taxonomy as string) || 'us-gaap';
    const tag = args.tag as string;
    const unit = args.unit as string;
    const year = args.year as number;
    const quarter = args.quarter as string | undefined;
    const period = quarter ? `CY${year}${quarter}` : `CY${year}`;
    return this.edgarGet(`${this.baseUrl}/api/xbrl/frames/${taxonomy}/${tag}/${unit}/${period}.json`);
  }

  private async searchFullText(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.query) return { content: [{ type: 'text', text: 'query is required' }], isError: true };
    const params = new URLSearchParams({ q: args.query as string });
    if (args.entity) params.set('entity', args.entity as string);
    if (args.form_type) params.set('forms', args.form_type as string);
    if (args.date_range_start) params.set('dateRange', 'custom');
    if (args.date_range_start) params.set('startdt', args.date_range_start as string);
    if (args.date_range_end) params.set('enddt', args.date_range_end as string);
    const url = `https://efts.sec.gov/LATEST/search-index?${params.toString()}`;
    const response = await this.fetchWithRetry(url, { headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getCompanyTickers(): Promise<ToolResult> {
    return this.edgarGet(`${this.baseUrl}/files/company_tickers.json`);
  }

  private async listRecentFilings(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (args.form_type) params.action = args.form_type as string;
    const url = `${this.baseUrl}/cgi-bin/browse-edgar?action=getcurrent&type=${encodeURIComponent((args.form_type as string) || '')}&dateb=&owner=include&count=${args.limit || 40}&search_text=&output=atom`;
    const response = await this.fetchWithRetry(url, { headers: { 'User-Agent': this.userAgent, 'Accept': 'application/xml' } });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const text = await response.text();
    const truncated = text.length > 10_000 ? text.slice(0, 10_000) + '\n... [truncated]' : text;
    return { content: [{ type: 'text', text: truncated }], isError: false };
  }

  private async getFilingDocuments(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.cik || !args.accession_number) {
      return { content: [{ type: 'text', text: 'cik and accession_number are required' }], isError: true };
    }
    const cik = this.padCik(args.cik as string);
    const accession = (args.accession_number as string).replace(/-/g, '');
    return this.edgarGet(`${this.baseUrl}/Archives/edgar/data/${parseInt(cik, 10)}/${accession}/${encodeURIComponent(args.accession_number as string)}-index.json`);
  }
}

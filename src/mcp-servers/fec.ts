/**
 * FEC (Federal Election Commission) MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// No official FEC MCP server was found on GitHub.
//
// Base URL: https://api.open.fec.gov/v1
// Auth: api_key query parameter (sign up at https://api.data.gov/signup/ or use DEMO_KEY)
// Docs: https://api.open.fec.gov/developers/
// Rate limits: DEMO_KEY: 30 req/hr, 50 req/day. Personal key: 1,000 req/hr.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface FecConfig {
  apiKey: string;
  baseUrl?: string;
}

export class FecMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: FecConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.open.fec.gov/v1';
  }

  static catalog() {
    return {
      name: 'fec',
      displayName: 'FEC (Federal Election Commission)',
      version: '1.0.0',
      category: 'government',
      keywords: [
        'fec', 'federal election commission', 'election', 'campaign finance',
        'candidate', 'committee', 'pac', 'super pac', 'donation', 'contribution',
        'disbursement', 'expenditure', 'filing', 'political', 'fundraising',
        'campaign', 'election cycle', 'schedule a', 'schedule b', 'schedule e',
        'independent expenditure', 'government', 'open data', 'finance',
      ],
      toolNames: [
        'search_candidates',
        'get_candidate',
        'get_candidate_totals',
        'search_committees',
        'get_committee',
        'get_committee_totals',
        'list_filings',
        'list_receipts',
        'list_disbursements',
        'list_independent_expenditures',
        'list_election_dates',
        'get_audit_cases',
      ],
      description: 'Federal Election Commission (FEC) campaign finance data: search candidates and committees, retrieve contribution receipts, disbursements, filings, independent expenditures, and election dates.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      // ── Candidates ─────────────────────────────────────────────────────────
      {
        name: 'search_candidates',
        description: 'Search FEC candidates by name, office, state, party, or election cycle — returns candidate IDs and registration details',
        inputSchema: {
          type: 'object',
          properties: {
            q: {
              type: 'string',
              description: 'Full-text search on candidate name (e.g. "Biden", "Smith")',
            },
            office: {
              type: 'string',
              description: 'Federal office sought: H (House), S (Senate), P (President)',
            },
            state: {
              type: 'string',
              description: 'Two-letter US state abbreviation (e.g. CA, TX, NY)',
            },
            party: {
              type: 'string',
              description: 'Political party abbreviation (e.g. DEM, REP, IND)',
            },
            cycle: {
              type: 'number',
              description: 'Two-year election cycle (e.g. 2024, 2022, 2020)',
            },
            per_page: {
              type: 'number',
              description: 'Results per page, max 100 (default: 20)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
          },
          required: [],
        },
      },
      {
        name: 'get_candidate',
        description: 'Get detailed FEC registration information for a specific candidate by their FEC candidate ID',
        inputSchema: {
          type: 'object',
          properties: {
            candidate_id: {
              type: 'string',
              description: 'FEC candidate ID (e.g. P80001571 for a presidential candidate)',
            },
          },
          required: ['candidate_id'],
        },
      },
      {
        name: 'get_candidate_totals',
        description: 'Get fundraising totals for a candidate — total receipts, disbursements, cash on hand, and debt by election cycle',
        inputSchema: {
          type: 'object',
          properties: {
            candidate_id: {
              type: 'string',
              description: 'FEC candidate ID',
            },
            cycle: {
              type: 'number',
              description: 'Two-year election cycle to filter totals (e.g. 2024)',
            },
            per_page: {
              type: 'number',
              description: 'Results per page, max 100 (default: 20)',
            },
          },
          required: ['candidate_id'],
        },
      },
      // ── Committees ─────────────────────────────────────────────────────────
      {
        name: 'search_committees',
        description: 'Search FEC committees (PACs, party committees, candidate committees) by name, type, state, or designation',
        inputSchema: {
          type: 'object',
          properties: {
            q: {
              type: 'string',
              description: 'Full-text search on committee name',
            },
            committee_type: {
              type: 'string',
              description: 'Committee type: P (presidential), H (house), S (senate), N (PAC non-qualified), Q (PAC qualified), X (party non-qualified), Y (party qualified)',
            },
            state: {
              type: 'string',
              description: 'Two-letter US state abbreviation',
            },
            party: {
              type: 'string',
              description: 'Political party abbreviation (e.g. DEM, REP)',
            },
            cycle: {
              type: 'number',
              description: 'Two-year election cycle (e.g. 2024)',
            },
            per_page: {
              type: 'number',
              description: 'Results per page, max 100 (default: 20)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
          },
          required: [],
        },
      },
      {
        name: 'get_committee',
        description: 'Get registration details for a specific FEC committee by committee ID, including treasurer, designation, and filing frequency',
        inputSchema: {
          type: 'object',
          properties: {
            committee_id: {
              type: 'string',
              description: 'FEC committee ID (e.g. C00575795)',
            },
          },
          required: ['committee_id'],
        },
      },
      {
        name: 'get_committee_totals',
        description: 'Get financial totals for a committee — total raised, spent, cash on hand, and debt for a given election cycle',
        inputSchema: {
          type: 'object',
          properties: {
            committee_id: {
              type: 'string',
              description: 'FEC committee ID',
            },
            cycle: {
              type: 'number',
              description: 'Two-year election cycle (e.g. 2024)',
            },
          },
          required: ['committee_id'],
        },
      },
      // ── Filings ─────────────────────────────────────────────────────────────
      {
        name: 'list_filings',
        description: 'List FEC filings (Form 3, Form 3X, Form 3P etc.) for a committee or candidate, optionally filtered by filing type and date range',
        inputSchema: {
          type: 'object',
          properties: {
            committee_id: {
              type: 'string',
              description: 'Filter filings by FEC committee ID',
            },
            candidate_id: {
              type: 'string',
              description: 'Filter filings by FEC candidate ID',
            },
            form_type: {
              type: 'string',
              description: 'FEC form type (e.g. F3, F3X, F3P, F1, F2)',
            },
            min_receipt_date: {
              type: 'string',
              description: 'Earliest receipt date in YYYY-MM-DD format',
            },
            max_receipt_date: {
              type: 'string',
              description: 'Latest receipt date in YYYY-MM-DD format',
            },
            per_page: {
              type: 'number',
              description: 'Results per page, max 100 (default: 20)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
          },
          required: [],
        },
      },
      // ── Receipts (Schedule A) ───────────────────────────────────────────────
      {
        name: 'list_receipts',
        description: 'List itemized contribution receipts (Schedule A) — donations from individuals or organizations to committees',
        inputSchema: {
          type: 'object',
          properties: {
            committee_id: {
              type: 'string',
              description: 'Filter receipts by recipient committee ID',
            },
            contributor_name: {
              type: 'string',
              description: 'Search by contributor name (individual or organization)',
            },
            contributor_state: {
              type: 'string',
              description: 'Filter by contributor two-letter state abbreviation',
            },
            contributor_employer: {
              type: 'string',
              description: 'Filter by contributor employer name',
            },
            min_amount: {
              type: 'number',
              description: 'Minimum contribution amount in USD',
            },
            max_amount: {
              type: 'number',
              description: 'Maximum contribution amount in USD',
            },
            min_date: {
              type: 'string',
              description: 'Earliest contribution date in YYYY-MM-DD format',
            },
            max_date: {
              type: 'string',
              description: 'Latest contribution date in YYYY-MM-DD format',
            },
            per_page: {
              type: 'number',
              description: 'Results per page, max 100 (default: 20)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
          },
          required: [],
        },
      },
      // ── Disbursements (Schedule B) ─────────────────────────────────────────
      {
        name: 'list_disbursements',
        description: 'List itemized disbursements (Schedule B) — how committees spend money, including vendor payments and operating expenses',
        inputSchema: {
          type: 'object',
          properties: {
            committee_id: {
              type: 'string',
              description: 'Filter disbursements by spending committee ID',
            },
            recipient_name: {
              type: 'string',
              description: 'Search by recipient name (vendor or individual)',
            },
            disbursement_description: {
              type: 'string',
              description: 'Filter by disbursement purpose description keyword',
            },
            min_amount: {
              type: 'number',
              description: 'Minimum disbursement amount in USD',
            },
            max_amount: {
              type: 'number',
              description: 'Maximum disbursement amount in USD',
            },
            min_date: {
              type: 'string',
              description: 'Earliest disbursement date in YYYY-MM-DD format',
            },
            max_date: {
              type: 'string',
              description: 'Latest disbursement date in YYYY-MM-DD format',
            },
            per_page: {
              type: 'number',
              description: 'Results per page, max 100 (default: 20)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
          },
          required: [],
        },
      },
      // ── Independent Expenditures (Schedule E) ──────────────────────────────
      {
        name: 'list_independent_expenditures',
        description: 'List independent expenditures (Schedule E) — ad buys and communications expressly advocating for or against a federal candidate',
        inputSchema: {
          type: 'object',
          properties: {
            committee_id: {
              type: 'string',
              description: 'Filter by spender committee ID',
            },
            candidate_id: {
              type: 'string',
              description: 'Filter by supported or opposed candidate ID',
            },
            support_oppose_indicator: {
              type: 'string',
              description: 'Filter by position: S (support) or O (oppose)',
            },
            min_amount: {
              type: 'number',
              description: 'Minimum expenditure amount in USD',
            },
            min_date: {
              type: 'string',
              description: 'Earliest expenditure date in YYYY-MM-DD format',
            },
            max_date: {
              type: 'string',
              description: 'Latest expenditure date in YYYY-MM-DD format',
            },
            per_page: {
              type: 'number',
              description: 'Results per page, max 100 (default: 20)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
          },
          required: [],
        },
      },
      // ── Election Dates ──────────────────────────────────────────────────────
      {
        name: 'list_election_dates',
        description: 'List federal election dates, primary and general, optionally filtered by state, office, and election year',
        inputSchema: {
          type: 'object',
          properties: {
            state: {
              type: 'string',
              description: 'Two-letter US state abbreviation',
            },
            office: {
              type: 'string',
              description: 'Federal office: house, senate, or president',
            },
            election_year: {
              type: 'number',
              description: 'Four-digit election year (e.g. 2024)',
            },
            min_primary_general_date: {
              type: 'string',
              description: 'Earliest election date in YYYY-MM-DD format',
            },
            per_page: {
              type: 'number',
              description: 'Results per page, max 100 (default: 20)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
          },
          required: [],
        },
      },
      // ── Audit ───────────────────────────────────────────────────────────────
      {
        name: 'get_audit_cases',
        description: 'Retrieve FEC Final Audit Reports — enforcement cases against committees for campaign finance violations',
        inputSchema: {
          type: 'object',
          properties: {
            committee_id: {
              type: 'string',
              description: 'Filter audit cases by committee FEC ID',
            },
            committee_name: {
              type: 'string',
              description: 'Filter by audited committee name (partial match supported)',
            },
            cycle: {
              type: 'number',
              description: 'Two-year election cycle (e.g. 2024)',
            },
            per_page: {
              type: 'number',
              description: 'Results per page, max 100 (default: 20)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
          },
          required: [],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'search_candidates':             return this.searchCandidates(args);
        case 'get_candidate':                 return this.getCandidate(args);
        case 'get_candidate_totals':          return this.getCandidateTotals(args);
        case 'search_committees':             return this.searchCommittees(args);
        case 'get_committee':                 return this.getCommittee(args);
        case 'get_committee_totals':          return this.getCommitteeTotals(args);
        case 'list_filings':                  return this.listFilings(args);
        case 'list_receipts':                 return this.listReceipts(args);
        case 'list_disbursements':            return this.listDisbursements(args);
        case 'list_independent_expenditures': return this.listIndependentExpenditures(args);
        case 'list_election_dates':           return this.listElectionDates(args);
        case 'get_audit_cases':               return this.getAuditCases(args);
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

  // ── Private helpers ────────────────────────────────────────────────────────


  private async get(path: string, params: Record<string, string | number | undefined>): Promise<ToolResult> {
    const qs = new URLSearchParams();
    qs.set('api_key', this.apiKey);
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '') {
        qs.set(key, String(value));
      }
    }
    const url = `${this.baseUrl}${path}?${qs.toString()}`;
    const response = await this.fetchWithRetry(url, {});
    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `FEC API error: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }
    const data = await response.json() as Record<string, unknown>;
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  // ── Candidate methods ──────────────────────────────────────────────────────

  private async searchCandidates(args: Record<string, unknown>): Promise<ToolResult> {
    return this.get('/candidates/', {
      q: args.q as string | undefined,
      office: args.office as string | undefined,
      state: args.state as string | undefined,
      party: args.party as string | undefined,
      cycle: args.cycle as number | undefined,
      per_page: (args.per_page as number | undefined) ?? 20,
      page: (args.page as number | undefined) ?? 1,
    });
  }

  private async getCandidate(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.candidate_id) {
      return { content: [{ type: 'text', text: 'candidate_id is required' }], isError: true };
    }
    return this.get(`/candidate/${args.candidate_id as string}/`, {});
  }

  private async getCandidateTotals(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.candidate_id) {
      return { content: [{ type: 'text', text: 'candidate_id is required' }], isError: true };
    }
    return this.get(`/candidate/${args.candidate_id as string}/totals/`, {
      cycle: args.cycle as number | undefined,
      per_page: (args.per_page as number | undefined) ?? 20,
    });
  }

  // ── Committee methods ──────────────────────────────────────────────────────

  private async searchCommittees(args: Record<string, unknown>): Promise<ToolResult> {
    return this.get('/committees/', {
      q: args.q as string | undefined,
      committee_type: args.committee_type as string | undefined,
      state: args.state as string | undefined,
      party: args.party as string | undefined,
      cycle: args.cycle as number | undefined,
      per_page: (args.per_page as number | undefined) ?? 20,
      page: (args.page as number | undefined) ?? 1,
    });
  }

  private async getCommittee(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.committee_id) {
      return { content: [{ type: 'text', text: 'committee_id is required' }], isError: true };
    }
    return this.get(`/committee/${args.committee_id as string}/`, {});
  }

  private async getCommitteeTotals(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.committee_id) {
      return { content: [{ type: 'text', text: 'committee_id is required' }], isError: true };
    }
    return this.get(`/committee/${args.committee_id as string}/totals/`, {
      cycle: args.cycle as number | undefined,
    });
  }

  // ── Filing methods ─────────────────────────────────────────────────────────

  private async listFilings(args: Record<string, unknown>): Promise<ToolResult> {
    return this.get('/filings/', {
      committee_id: args.committee_id as string | undefined,
      candidate_id: args.candidate_id as string | undefined,
      form_type: args.form_type as string | undefined,
      min_receipt_date: args.min_receipt_date as string | undefined,
      max_receipt_date: args.max_receipt_date as string | undefined,
      per_page: (args.per_page as number | undefined) ?? 20,
      page: (args.page as number | undefined) ?? 1,
    });
  }

  // ── Schedule A — Receipts ──────────────────────────────────────────────────

  private async listReceipts(args: Record<string, unknown>): Promise<ToolResult> {
    return this.get('/schedules/schedule_a/', {
      committee_id: args.committee_id as string | undefined,
      contributor_name: args.contributor_name as string | undefined,
      contributor_state: args.contributor_state as string | undefined,
      contributor_employer: args.contributor_employer as string | undefined,
      min_amount: args.min_amount as number | undefined,
      max_amount: args.max_amount as number | undefined,
      min_date: args.min_date as string | undefined,
      max_date: args.max_date as string | undefined,
      per_page: (args.per_page as number | undefined) ?? 20,
      page: (args.page as number | undefined) ?? 1,
    });
  }

  // ── Schedule B — Disbursements ─────────────────────────────────────────────

  private async listDisbursements(args: Record<string, unknown>): Promise<ToolResult> {
    return this.get('/schedules/schedule_b/', {
      committee_id: args.committee_id as string | undefined,
      recipient_name: args.recipient_name as string | undefined,
      disbursement_description: args.disbursement_description as string | undefined,
      min_amount: args.min_amount as number | undefined,
      max_amount: args.max_amount as number | undefined,
      min_date: args.min_date as string | undefined,
      max_date: args.max_date as string | undefined,
      per_page: (args.per_page as number | undefined) ?? 20,
      page: (args.page as number | undefined) ?? 1,
    });
  }

  // ── Schedule E — Independent Expenditures ─────────────────────────────────

  private async listIndependentExpenditures(args: Record<string, unknown>): Promise<ToolResult> {
    return this.get('/schedules/schedule_e/', {
      committee_id: args.committee_id as string | undefined,
      candidate_id: args.candidate_id as string | undefined,
      support_oppose_indicator: args.support_oppose_indicator as string | undefined,
      min_amount: args.min_amount as number | undefined,
      min_date: args.min_date as string | undefined,
      max_date: args.max_date as string | undefined,
      per_page: (args.per_page as number | undefined) ?? 20,
      page: (args.page as number | undefined) ?? 1,
    });
  }

  // ── Calendar / Election Dates ──────────────────────────────────────────────

  private async listElectionDates(args: Record<string, unknown>): Promise<ToolResult> {
    return this.get('/calendar-dates/', {
      state: args.state as string | undefined,
      office: args.office as string | undefined,
      election_year: args.election_year as number | undefined,
      min_primary_general_date: args.min_primary_general_date as string | undefined,
      per_page: (args.per_page as number | undefined) ?? 20,
      page: (args.page as number | undefined) ?? 1,
    });
  }

  // ── Audit ──────────────────────────────────────────────────────────────────

  private async getAuditCases(args: Record<string, unknown>): Promise<ToolResult> {
    return this.get('/audit-case/', {
      committee_id: args.committee_id as string | undefined,
      committee_name: args.committee_name as string | undefined,
      cycle: args.cycle as number | undefined,
      per_page: (args.per_page as number | undefined) ?? 20,
      page: (args.page as number | undefined) ?? 1,
    });
  }
}

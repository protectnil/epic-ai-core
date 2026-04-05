/**
 * HM Land Registry Deed API MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03. HM Land Registry has not published an official MCP server.
//
// Base URL: https://api.landregistry.gov.uk/v1
// Auth: None documented in the public spec — open API for reading deeds.
//       POST /deed/ may require internal credentials in production.
// Docs: https://landregistry.github.io/dm-deed-api/
// Rate limits: Not publicly documented.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface LandRegistryUKDeedConfig {
  baseUrl?: string;
}

export class LandRegistryUKDeedMCPServer extends MCPAdapterBase {
  private readonly baseUrl: string;

  constructor(config: LandRegistryUKDeedConfig = {}) {
    super();
    this.baseUrl = config.baseUrl ?? 'https://api.landregistry.gov.uk/v1';
  }

  static catalog() {
    return {
      name: 'landregistry-uk-deed',
      displayName: 'HM Land Registry Deed API',
      version: '1.0.0',
      category: 'legal' as const,
      keywords: [
        'land registry', 'deed', 'property', 'title', 'mortgage', 'uk', 'hm land registry',
        'conveyancing', 'borrower', 'lender', 'charge', 'proprietor', 'legal', 'real estate',
        'england', 'wales', 'title number', 'deed reference',
      ],
      toolNames: [
        'create_deed',
        'get_deed',
      ],
      description: 'Create and retrieve HM Land Registry digital mortgage deeds for England and Wales. Returns deed details including title number, property, borrowers, charge clauses, and effective date.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'create_deed',
        description: 'Create a new digital mortgage deed with the HM Land Registry. Returns a URL reference to the created deed. Requires a valid deed JSON body conforming to the Land Registry deed schema.',
        inputSchema: {
          type: 'object',
          properties: {
            title_number: {
              type: 'string',
              description: 'The Land Registry title number for the property (e.g. DN1234).',
            },
            md_ref: {
              type: 'string',
              description: 'The mortgage deed reference number assigned by the lender.',
            },
            borrowers: {
              type: 'string',
              description: 'JSON array of borrower objects, each with forename, surname, and id fields.',
            },
            charge_clause: {
              type: 'string',
              description: 'The charge clause text as agreed between borrower and lender.',
            },
            additional_provisions: {
              type: 'string',
              description: 'JSON array of additional provision objects to include in the deed.',
            },
            lender: {
              type: 'string',
              description: 'JSON object with lender name and address details.',
            },
            property_address: {
              type: 'string',
              description: 'Full postal address of the mortgaged property.',
            },
          },
          required: ['title_number', 'md_ref', 'borrowers', 'charge_clause', 'lender', 'property_address'],
        },
      },
      {
        name: 'get_deed',
        description: 'Retrieve a specific HM Land Registry deed by its unique deed reference. Returns the full deed including title number, property address, borrowers, charge clauses, lender details, and effective date.',
        inputSchema: {
          type: 'object',
          properties: {
            deed_reference: {
              type: 'string',
              description: 'Unique deed reference returned when the deed was created (e.g. c91d4ef5-3afc-4608-bf5a-6bcfc6f73c51).',
            },
          },
          required: ['deed_reference'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'create_deed':
          return this.createDeed(args);
        case 'get_deed':
          return this.getDeed(args);
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

  private parseJsonArg(value: unknown, fieldName: string): [unknown, null] | [null, ToolResult] {
    if (typeof value === 'string') {
      try {
        return [JSON.parse(value), null];
      } catch {
        return [null, { content: [{ type: 'text', text: `${fieldName} must be valid JSON` }], isError: true }];
      }
    }
    return [value, null];
  }

  private async createDeed(args: Record<string, unknown>): Promise<ToolResult> {
    const required = ['title_number', 'md_ref', 'borrowers', 'charge_clause', 'lender', 'property_address'];
    for (const field of required) {
      if (!args[field]) return { content: [{ type: 'text', text: `${field} is required` }], isError: true };
    }

    const [borrowers, borrowersErr] = this.parseJsonArg(args.borrowers, 'borrowers');
    if (borrowersErr) return borrowersErr;

    const [lender, lenderErr] = this.parseJsonArg(args.lender, 'lender');
    if (lenderErr) return lenderErr;

    const body: Record<string, unknown> = {
      title_number: args.title_number,
      md_ref: args.md_ref,
      borrowers,
      charge_clause: args.charge_clause,
      lender,
      property_address: args.property_address,
    };

    if (args.additional_provisions) {
      const [provisions, provErr] = this.parseJsonArg(args.additional_provisions, 'additional_provisions');
      if (provErr) return provErr;
      body.additional_provisions = provisions;
    }

    const url = `${this.baseUrl}/deed/`;
    const response = await this.fetchWithRetry(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `API error ${response.status}: ${errText}` }], isError: true };
    }
    let data: unknown;
    try {
      data = await response.json();
    } catch {
      const text = await response.text().catch(() => '');
      return { content: [{ type: 'text', text: text || `HTTP ${response.status} OK` }], isError: false };
    }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getDeed(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.deed_reference) {
      return { content: [{ type: 'text', text: 'deed_reference is required' }], isError: true };
    }
    const ref = encodeURIComponent(args.deed_reference as string);
    const url = `${this.baseUrl}/deed/${ref}`;
    const response = await this.fetchWithRetry(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `API error ${response.status}: ${errText}` }], isError: true };
    }
    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new Error(`Land Registry returned non-JSON (HTTP ${response.status})`);
    }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }
}

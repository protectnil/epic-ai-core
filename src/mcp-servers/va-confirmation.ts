/**
 * VA Veteran Confirmation MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// No official VA.gov Veteran Confirmation MCP server was found on GitHub.
//
// Base URL: https://api.va.gov/services/veteran_confirmation/v0
// Auth: API key passed as header `apikey`
// Docs: https://developer.va.gov/explore/verification/docs/veteran_confirmation
// Rate limits: Not publicly documented. Contact VA developer support for enterprise limits.
// Sandbox: https://sandbox-api.va.gov/services/veteran_confirmation/v0

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface VAConfirmationConfig {
  apiKey: string;
  /** Optional base URL override (default: https://api.va.gov/services/veteran_confirmation/v0) */
  baseUrl?: string;
}

export class VAConfirmationMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: VAConfirmationConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? 'https://api.va.gov/services/veteran_confirmation/v0';
  }

  static catalog() {
    return {
      name: 'va-confirmation',
      displayName: 'VA Veteran Confirmation',
      version: '1.0.0',
      category: 'government',
      keywords: [
        'va', 'veteran', 'veterans affairs', 'confirmation', 'status',
        'military', 'service', 'discharge', 'eligibility', 'benefits',
        'government', 'federal', 'ssn', 'identity', 'verification',
      ],
      toolNames: ['get_veteran_status'],
      description: "Verify an individual's Veteran status with the U.S. Department of Veterans Affairs using name, SSN, and birth date. Returns confirmed or not-confirmed status.",
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'get_veteran_status',
        description: 'Confirm whether an individual is a U.S. Veteran according to VA records — requires SSN, first name, last name, and birth date; returns "confirmed" or "not confirmed"',
        inputSchema: {
          type: 'object',
          properties: {
            ssn: {
              type: 'string',
              description: 'Social Security Number for the person of interest with or without dashes (e.g. "123-45-6789" or "123456789")',
            },
            first_name: {
              type: 'string',
              description: 'First name for the person of interest',
            },
            last_name: {
              type: 'string',
              description: 'Last name for the person of interest',
            },
            birth_date: {
              type: 'string',
              description: 'Birth date for the person of interest in any valid ISO 8601 format (e.g. "1970-01-15")',
            },
            middle_name: {
              type: 'string',
              description: 'Optional middle name for the person of interest',
            },
            gender: {
              type: 'string',
              description: 'Optional gender of M or F for the person of interest',
              enum: ['M', 'F'],
            },
          },
          required: ['ssn', 'first_name', 'last_name', 'birth_date'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'get_veteran_status':
          return this.getVeteranStatus(args);
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

  private async getVeteranStatus(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.ssn) return { content: [{ type: 'text', text: 'ssn is required' }], isError: true };
    if (!args.first_name) return { content: [{ type: 'text', text: 'first_name is required' }], isError: true };
    if (!args.last_name) return { content: [{ type: 'text', text: 'last_name is required' }], isError: true };
    if (!args.birth_date) return { content: [{ type: 'text', text: 'birth_date is required' }], isError: true };

    const body: Record<string, unknown> = {
      ssn: args.ssn,
      first_name: args.first_name,
      last_name: args.last_name,
      birth_date: args.birth_date,
    };
    if (args.middle_name !== undefined) body.middle_name = args.middle_name;
    if (args.gender !== undefined) body.gender = args.gender;

    const url = `${this.baseUrl}/status`;
    const response = await this.fetchWithRetry(url, {
      method: 'POST',
      headers: {
        apikey: this.apiKey,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new Error(`VA Confirmation API returned non-JSON (HTTP ${response.status})`);
    }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }
}

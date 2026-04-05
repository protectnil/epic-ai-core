/**
 * TransUnion MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// No official TransUnion MCP server was found on GitHub or the TransUnion developer portal.
// TransUnion's primary developer resources are at techservices.transunion.com (TUXML/batch)
// and through credentialed partner integrations. The REST API is partner-gated.
//
// Base URL: https://api.transunion.com  (production; sandbox available to credentialed partners)
// Auth: OAuth2 client credentials — POST to /oauth/token with client_id and client_secret;
//       Bearer token returned. TransUnion also supports mutual TLS (mTLS) for enterprise partners.
// Docs: https://techservices.transunion.com/doc-repository
// Rate limits: Not publicly documented. Rate limits are partner-specific and enforced by contract.
//              Contact TransUnion technical services for your account limits.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface TransUnionConfig {
  clientId: string;
  clientSecret: string;
  baseUrl?: string;
}

export class TransUnionMCPServer extends MCPAdapterBase {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly baseUrl: string;
  private bearerToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(config: TransUnionConfig) {
    super();
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.baseUrl = config.baseUrl || 'https://api.transunion.com';
  }

  static catalog() {
    return {
      name: 'transunion',
      displayName: 'TransUnion',
      version: '1.0.0',
      category: 'compliance',
      keywords: [
        'transunion', 'credit bureau', 'credit report', 'credit score', 'fico',
        'identity verification', 'fraud', 'kyc', 'credit check', 'consumer report',
        'credit risk', 'idv', 'bureau', 'soft pull', 'hard pull',
      ],
      toolNames: [
        'get_credit_report',
        'get_credit_score',
        'verify_identity',
        'check_fraud_indicators',
        'get_truevalidate',
        'get_consumer_disclosure',
        'check_ofac_watchlist',
        'get_income_insights',
        'get_employment_verification',
        'check_synthetic_fraud',
        'get_device_risk',
      ],
      description: 'TransUnion credit bureau: retrieve consumer credit reports, scores, identity verification, fraud indicators, OFAC watchlist checks, and device risk signals for financial decisioning.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'get_credit_report',
        description: 'Pull a consumer credit report from TransUnion with tradelines, inquiries, public records, and derogatory marks',
        inputSchema: {
          type: 'object',
          properties: {
            first_name: {
              type: 'string',
              description: 'Consumer first name',
            },
            last_name: {
              type: 'string',
              description: 'Consumer last name',
            },
            ssn: {
              type: 'string',
              description: 'Consumer Social Security Number (9 digits, no dashes)',
            },
            dob: {
              type: 'string',
              description: 'Date of birth in YYYY-MM-DD format',
            },
            address: {
              type: 'string',
              description: 'Current street address (e.g. "123 Main St")',
            },
            city: {
              type: 'string',
              description: 'Current city',
            },
            state: {
              type: 'string',
              description: 'Current state (2-letter abbreviation, e.g. CA)',
            },
            zip: {
              type: 'string',
              description: 'Current ZIP code',
            },
            inquiry_type: {
              type: 'string',
              description: 'Pull type: hard (affects credit score) or soft (no score impact) — default: soft',
            },
          },
          required: ['first_name', 'last_name', 'ssn', 'dob', 'address', 'city', 'state', 'zip'],
        },
      },
      {
        name: 'get_credit_score',
        description: 'Retrieve TransUnion credit score models (VantageScore 4.0, FICO 9) for a consumer with score reason codes',
        inputSchema: {
          type: 'object',
          properties: {
            first_name: {
              type: 'string',
              description: 'Consumer first name',
            },
            last_name: {
              type: 'string',
              description: 'Consumer last name',
            },
            ssn: {
              type: 'string',
              description: 'Consumer Social Security Number (9 digits)',
            },
            dob: {
              type: 'string',
              description: 'Date of birth in YYYY-MM-DD format',
            },
            score_model: {
              type: 'string',
              description: 'Score model: vantage4 (VantageScore 4.0) or fico9 (FICO 9) — default: vantage4',
            },
          },
          required: ['first_name', 'last_name', 'ssn', 'dob'],
        },
      },
      {
        name: 'verify_identity',
        description: 'Verify consumer identity by cross-referencing provided PII against TransUnion\'s identity data network',
        inputSchema: {
          type: 'object',
          properties: {
            first_name: {
              type: 'string',
              description: 'Consumer first name',
            },
            last_name: {
              type: 'string',
              description: 'Consumer last name',
            },
            ssn: {
              type: 'string',
              description: 'Social Security Number (9 digits)',
            },
            dob: {
              type: 'string',
              description: 'Date of birth in YYYY-MM-DD format',
            },
            phone: {
              type: 'string',
              description: 'Phone number (10 digits, no dashes)',
            },
            email: {
              type: 'string',
              description: 'Email address',
            },
            address: {
              type: 'string',
              description: 'Street address',
            },
            city: {
              type: 'string',
              description: 'City',
            },
            state: {
              type: 'string',
              description: 'State 2-letter abbreviation',
            },
            zip: {
              type: 'string',
              description: 'ZIP code',
            },
          },
          required: ['first_name', 'last_name', 'ssn', 'dob'],
        },
      },
      {
        name: 'check_fraud_indicators',
        description: 'Check for fraud signals on a consumer identity, including SSN misuse, address discrepancies, and risk indicators',
        inputSchema: {
          type: 'object',
          properties: {
            first_name: {
              type: 'string',
              description: 'Consumer first name',
            },
            last_name: {
              type: 'string',
              description: 'Consumer last name',
            },
            ssn: {
              type: 'string',
              description: 'Social Security Number (9 digits)',
            },
            dob: {
              type: 'string',
              description: 'Date of birth in YYYY-MM-DD format',
            },
            address: {
              type: 'string',
              description: 'Current address for cross-reference',
            },
          },
          required: ['first_name', 'last_name', 'ssn', 'dob'],
        },
      },
      {
        name: 'get_truevalidate',
        description: 'TrueValidate — TransUnion\'s real-time identity and fraud risk solution that combines device signals, behavioral biometrics, and identity graph data',
        inputSchema: {
          type: 'object',
          properties: {
            session_id: {
              type: 'string',
              description: 'TrueValidate session ID from the client SDK initialization',
            },
            first_name: {
              type: 'string',
              description: 'Consumer first name',
            },
            last_name: {
              type: 'string',
              description: 'Consumer last name',
            },
            email: {
              type: 'string',
              description: 'Consumer email address',
            },
            phone: {
              type: 'string',
              description: 'Consumer phone number',
            },
          },
          required: ['session_id'],
        },
      },
      {
        name: 'get_consumer_disclosure',
        description: 'Retrieve a consumer\'s full credit disclosure report as required by FCRA for consumer-facing applications',
        inputSchema: {
          type: 'object',
          properties: {
            consumer_reference: {
              type: 'string',
              description: 'Consumer reference ID from a previous identity verification or credit pull',
            },
            include_score: {
              type: 'boolean',
              description: 'Include credit score in the disclosure (default: true)',
            },
          },
          required: ['consumer_reference'],
        },
      },
      {
        name: 'check_ofac_watchlist',
        description: 'Check a consumer or business name and identifiers against OFAC sanctions watchlists and PEP lists',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Full name of the individual or business entity to screen',
            },
            dob: {
              type: 'string',
              description: 'Date of birth in YYYY-MM-DD format (optional but improves accuracy)',
            },
            country: {
              type: 'string',
              description: 'ISO 3166-1 alpha-2 country code (optional)',
            },
            match_threshold: {
              type: 'number',
              description: 'Minimum match score threshold 0–100 to flag a result (default: 85)',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'get_income_insights',
        description: 'Estimate consumer income and income stability using credit-based income insights derived from bureau data',
        inputSchema: {
          type: 'object',
          properties: {
            first_name: {
              type: 'string',
              description: 'Consumer first name',
            },
            last_name: {
              type: 'string',
              description: 'Consumer last name',
            },
            ssn: {
              type: 'string',
              description: 'Social Security Number (9 digits)',
            },
            dob: {
              type: 'string',
              description: 'Date of birth in YYYY-MM-DD format',
            },
          },
          required: ['first_name', 'last_name', 'ssn', 'dob'],
        },
      },
      {
        name: 'get_employment_verification',
        description: 'Verify current and historical employment data through TransUnion\'s employment verification network',
        inputSchema: {
          type: 'object',
          properties: {
            first_name: {
              type: 'string',
              description: 'Consumer first name',
            },
            last_name: {
              type: 'string',
              description: 'Consumer last name',
            },
            ssn: {
              type: 'string',
              description: 'Social Security Number (9 digits)',
            },
            employer_name: {
              type: 'string',
              description: 'Employer name to verify against (optional — leave blank for full history)',
            },
          },
          required: ['first_name', 'last_name', 'ssn'],
        },
      },
      {
        name: 'check_synthetic_fraud',
        description: 'Detect synthetic identity fraud by checking whether a Social Security Number is associated with a real consumer identity',
        inputSchema: {
          type: 'object',
          properties: {
            ssn: {
              type: 'string',
              description: 'Social Security Number to check (9 digits)',
            },
            first_name: {
              type: 'string',
              description: 'First name associated with the SSN',
            },
            last_name: {
              type: 'string',
              description: 'Last name associated with the SSN',
            },
            dob: {
              type: 'string',
              description: 'Date of birth in YYYY-MM-DD format',
            },
          },
          required: ['ssn', 'first_name', 'last_name', 'dob'],
        },
      },
      {
        name: 'get_device_risk',
        description: 'Assess device risk signals (device fingerprint, IP reputation, proxy/VPN detection) for a session to detect account takeover and new account fraud',
        inputSchema: {
          type: 'object',
          properties: {
            session_id: {
              type: 'string',
              description: 'Device session ID from the TransUnion TruValidate client SDK',
            },
            ip_address: {
              type: 'string',
              description: 'IP address associated with the session (optional — enhances scoring)',
            },
            email: {
              type: 'string',
              description: 'Email address for identity correlation (optional)',
            },
          },
          required: ['session_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'get_credit_report':
          return this.getCreditReport(args);
        case 'get_credit_score':
          return this.getCreditScore(args);
        case 'verify_identity':
          return this.verifyIdentity(args);
        case 'check_fraud_indicators':
          return this.checkFraudIndicators(args);
        case 'get_truevalidate':
          return this.getTrueValidate(args);
        case 'get_consumer_disclosure':
          return this.getConsumerDisclosure(args);
        case 'check_ofac_watchlist':
          return this.checkOfacWatchlist(args);
        case 'get_income_insights':
          return this.getIncomeInsights(args);
        case 'get_employment_verification':
          return this.getEmploymentVerification(args);
        case 'check_synthetic_fraud':
          return this.checkSyntheticFraud(args);
        case 'get_device_risk':
          return this.getDeviceRisk(args);
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
    const response = await this.fetchWithRetry(`${this.baseUrl}/oauth/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${btoa(`${this.clientId}:${this.clientSecret}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });
    if (!response.ok) {
      throw new Error(`TransUnion OAuth2 token request failed: ${response.status} ${response.statusText}`);
    }
    const data = await response.json() as { access_token: string; expires_in: number };
    this.bearerToken = data.access_token;
    this.tokenExpiry = now + (data.expires_in - 60) * 1000;
    return this.bearerToken;
  }

  private async tuPost(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const token = await this.getOrRefreshToken();
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private buildConsumer(args: Record<string, unknown>): Record<string, unknown> {
    const consumer: Record<string, unknown> = {
      name: { first: args.first_name, last: args.last_name },
    };
    if (args.ssn) consumer.ssn = args.ssn;
    if (args.dob) consumer.dateOfBirth = args.dob;
    if (args.address || args.city || args.state || args.zip) {
      consumer.address = {
        street: args.address,
        city: args.city,
        state: args.state,
        zip: args.zip,
      };
    }
    if (args.phone) consumer.phone = args.phone;
    if (args.email) consumer.email = args.email;
    return consumer;
  }

  private async getCreditReport(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.first_name || !args.last_name || !args.ssn || !args.dob || !args.address || !args.city || !args.state || !args.zip) {
      return { content: [{ type: 'text', text: 'first_name, last_name, ssn, dob, address, city, state, and zip are required' }], isError: true };
    }
    return this.tuPost('/credit/v1/report', {
      consumer: this.buildConsumer(args),
      inquiryType: (args.inquiry_type as string) ?? 'soft',
    });
  }

  private async getCreditScore(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.first_name || !args.last_name || !args.ssn || !args.dob) {
      return { content: [{ type: 'text', text: 'first_name, last_name, ssn, and dob are required' }], isError: true };
    }
    return this.tuPost('/credit/v1/score', {
      consumer: this.buildConsumer(args),
      scoreModel: (args.score_model as string) ?? 'vantage4',
    });
  }

  private async verifyIdentity(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.first_name || !args.last_name || !args.ssn || !args.dob) {
      return { content: [{ type: 'text', text: 'first_name, last_name, ssn, and dob are required' }], isError: true };
    }
    return this.tuPost('/idv/v1/verify', { consumer: this.buildConsumer(args) });
  }

  private async checkFraudIndicators(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.first_name || !args.last_name || !args.ssn || !args.dob) {
      return { content: [{ type: 'text', text: 'first_name, last_name, ssn, and dob are required' }], isError: true };
    }
    return this.tuPost('/fraud/v1/indicators', { consumer: this.buildConsumer(args) });
  }

  private async getTrueValidate(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.session_id) return { content: [{ type: 'text', text: 'session_id is required' }], isError: true };
    const body: Record<string, unknown> = { sessionId: args.session_id };
    if (args.first_name || args.last_name || args.email || args.phone) {
      body.consumer = this.buildConsumer(args);
    }
    return this.tuPost('/truevalidate/v1/evaluate', body);
  }

  private async getConsumerDisclosure(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.consumer_reference) return { content: [{ type: 'text', text: 'consumer_reference is required' }], isError: true };
    return this.tuPost('/disclosure/v1/report', {
      consumerReference: args.consumer_reference,
      includeScore: (args.include_score as boolean) ?? true,
    });
  }

  private async checkOfacWatchlist(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name) return { content: [{ type: 'text', text: 'name is required' }], isError: true };
    const body: Record<string, unknown> = {
      name: args.name,
      matchThreshold: (args.match_threshold as number) ?? 85,
    };
    if (args.dob) body.dateOfBirth = args.dob;
    if (args.country) body.country = args.country;
    return this.tuPost('/compliance/v1/ofac', body);
  }

  private async getIncomeInsights(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.first_name || !args.last_name || !args.ssn || !args.dob) {
      return { content: [{ type: 'text', text: 'first_name, last_name, ssn, and dob are required' }], isError: true };
    }
    return this.tuPost('/income/v1/insights', { consumer: this.buildConsumer(args) });
  }

  private async getEmploymentVerification(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.first_name || !args.last_name || !args.ssn) {
      return { content: [{ type: 'text', text: 'first_name, last_name, and ssn are required' }], isError: true };
    }
    const body: Record<string, unknown> = { consumer: this.buildConsumer(args) };
    if (args.employer_name) body.employerName = args.employer_name;
    return this.tuPost('/employment/v1/verify', body);
  }

  private async checkSyntheticFraud(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.ssn || !args.first_name || !args.last_name || !args.dob) {
      return { content: [{ type: 'text', text: 'ssn, first_name, last_name, and dob are required' }], isError: true };
    }
    return this.tuPost('/fraud/v1/synthetic', { consumer: this.buildConsumer(args) });
  }

  private async getDeviceRisk(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.session_id) return { content: [{ type: 'text', text: 'session_id is required' }], isError: true };
    const body: Record<string, unknown> = { sessionId: args.session_id };
    if (args.ip_address) body.ipAddress = args.ip_address;
    if (args.email) body.email = args.email;
    return this.tuPost('/device/v1/risk', body);
  }
}

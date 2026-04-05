/**
 * Equifax MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// No official Equifax MCP server was found on GitHub or the MCP registry.
// A third-party listing exists in PipedreamHQ/awesome-mcp-servers but it is a
// community-built integration, not an official Equifax-published server.
// Our adapter covers: 10 tools. Vendor MCP covers: 0 tools.
// Recommendation: use-rest-api — no official Equifax MCP server exists.
//
// Base URL: https://api.equifax.com  (sandbox: https://api.sandbox.equifax.com)
// Auth: OAuth2 client credentials — POST /v2/oauth/token with client_id, client_secret, scope
//   in request body (application/x-www-form-urlencoded). Bearer token in Authorization header.
// Docs: https://developer.equifax.com/documentation
// Rate limits: Not publicly documented; production APIs require whitelisted IP addresses

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface EquifaxConfig {
  clientId: string;
  clientSecret: string;
  /** Base URL override — defaults to production endpoint */
  baseUrl?: string;
  /** OAuth2 token endpoint — defaults to production endpoint */
  tokenUrl?: string;
}

export class EquifaxMCPServer extends MCPAdapterBase {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly baseUrl: string;
  private readonly tokenUrl: string;
  private bearerToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(config: EquifaxConfig) {
    super();
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.baseUrl = config.baseUrl || 'https://api.equifax.com';
    this.tokenUrl = config.tokenUrl || 'https://api.equifax.com/v2/oauth/token';
  }

  static catalog() {
    return {
      name: 'equifax',
      displayName: 'Equifax',
      version: '1.0.0',
      category: 'finance',
      keywords: [
        'equifax', 'credit', 'credit score', 'credit report', 'credit bureau', 'credit history',
        'fraud', 'fraud prevention', 'identity verification', 'identity theft', 'risk score',
        'consumer credit', 'creditmonitoring', 'credit inquiry', 'derogatory', 'collections',
      ],
      toolNames: [
        'get_credit_score',
        'get_credit_report',
        'get_credit_score_history',
        'get_credit_monitoring_alerts',
        'verify_identity',
        'get_fraud_risk_score',
        'get_income_verification',
        'get_employment_verification',
        'search_consumer',
        'get_prequalification_score',
      ],
      description: 'Equifax credit and fraud prevention: retrieve consumer credit scores, credit reports, fraud risk scores, identity verification, income and employment verification.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'get_credit_score',
        description: 'Retrieve the current Equifax credit score for a consumer using their identifying information',
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
              description: 'Social Security Number (9 digits, no dashes)',
            },
            date_of_birth: {
              type: 'string',
              description: 'Date of birth in YYYY-MM-DD format',
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
              description: 'Two-letter state code (e.g. CA, TX)',
            },
            zip: {
              type: 'string',
              description: 'ZIP or postal code',
            },
          },
          required: ['first_name', 'last_name', 'ssn'],
        },
      },
      {
        name: 'get_credit_report',
        description: 'Retrieve a full consumer credit report including accounts, inquiries, public records, and collections',
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
              description: 'Social Security Number (9 digits, no dashes)',
            },
            date_of_birth: {
              type: 'string',
              description: 'Date of birth in YYYY-MM-DD format',
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
              description: 'Two-letter state code',
            },
            zip: {
              type: 'string',
              description: 'ZIP or postal code',
            },
          },
          required: ['first_name', 'last_name', 'ssn'],
        },
      },
      {
        name: 'get_credit_score_history',
        description: 'Retrieve credit score history for a consumer showing score changes over time',
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
              description: 'Social Security Number (9 digits, no dashes)',
            },
            months: {
              type: 'number',
              description: 'Number of months of history to return (default: 12, max: 36)',
            },
          },
          required: ['first_name', 'last_name', 'ssn'],
        },
      },
      {
        name: 'get_credit_monitoring_alerts',
        description: 'Retrieve credit monitoring alerts for a consumer such as new accounts, inquiries, or address changes',
        inputSchema: {
          type: 'object',
          properties: {
            consumer_id: {
              type: 'string',
              description: 'Equifax consumer ID from a prior enrollment',
            },
            alert_type: {
              type: 'string',
              description: 'Filter by alert type: new_account, inquiry, address_change, derogatory, all (default: all)',
            },
            since_date: {
              type: 'string',
              description: 'Return alerts since this date in YYYY-MM-DD format',
            },
          },
          required: ['consumer_id'],
        },
      },
      {
        name: 'verify_identity',
        description: 'Verify a consumer identity by matching provided PII against Equifax records and return a match confidence score',
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
              description: 'Social Security Number (9 digits, no dashes)',
            },
            date_of_birth: {
              type: 'string',
              description: 'Date of birth in YYYY-MM-DD format',
            },
            address: {
              type: 'string',
              description: 'Street address to verify',
            },
            zip: {
              type: 'string',
              description: 'ZIP or postal code',
            },
            phone: {
              type: 'string',
              description: 'Phone number (10 digits, no dashes)',
            },
          },
          required: ['first_name', 'last_name', 'ssn', 'date_of_birth'],
        },
      },
      {
        name: 'get_fraud_risk_score',
        description: 'Retrieve a fraud risk score for a consumer or transaction to assess likelihood of fraudulent activity',
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
              description: 'Social Security Number (9 digits, no dashes)',
            },
            date_of_birth: {
              type: 'string',
              description: 'Date of birth in YYYY-MM-DD format',
            },
            ip_address: {
              type: 'string',
              description: 'IP address associated with the transaction request',
            },
            device_id: {
              type: 'string',
              description: 'Device fingerprint or ID associated with the request',
            },
          },
          required: ['first_name', 'last_name', 'ssn'],
        },
      },
      {
        name: 'get_income_verification',
        description: 'Verify reported income for a consumer using Equifax employment and income data sources',
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
              description: 'Social Security Number (9 digits, no dashes)',
            },
            reported_income: {
              type: 'number',
              description: 'Annual income amount reported by the consumer (for comparison)',
            },
          },
          required: ['first_name', 'last_name', 'ssn'],
        },
      },
      {
        name: 'get_employment_verification',
        description: 'Verify current and historical employment for a consumer including employer name, dates, and position',
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
              description: 'Social Security Number (9 digits, no dashes)',
            },
            employer_name: {
              type: 'string',
              description: 'Employer name to verify (optional — returns all employers if omitted)',
            },
          },
          required: ['first_name', 'last_name', 'ssn'],
        },
      },
      {
        name: 'search_consumer',
        description: 'Search for a consumer in the Equifax database by name and identifying details to retrieve a consumer ID',
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
            date_of_birth: {
              type: 'string',
              description: 'Date of birth in YYYY-MM-DD format',
            },
            address: {
              type: 'string',
              description: 'Street address',
            },
            zip: {
              type: 'string',
              description: 'ZIP or postal code',
            },
          },
          required: ['first_name', 'last_name', 'date_of_birth'],
        },
      },
      {
        name: 'get_prequalification_score',
        description: 'Retrieve a soft-pull pre-qualification credit score that does not affect the consumer credit file',
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
              description: 'Social Security Number (9 digits, no dashes)',
            },
            date_of_birth: {
              type: 'string',
              description: 'Date of birth in YYYY-MM-DD format',
            },
            address: {
              type: 'string',
              description: 'Street address',
            },
            zip: {
              type: 'string',
              description: 'ZIP or postal code',
            },
            product_type: {
              type: 'string',
              description: 'Loan product type for prequalification context: mortgage, auto, personal, credit_card (default: personal)',
            },
          },
          required: ['first_name', 'last_name', 'ssn'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'get_credit_score':
          return this.getCreditScore(args);
        case 'get_credit_report':
          return this.getCreditReport(args);
        case 'get_credit_score_history':
          return this.getCreditScoreHistory(args);
        case 'get_credit_monitoring_alerts':
          return this.getCreditMonitoringAlerts(args);
        case 'verify_identity':
          return this.verifyIdentity(args);
        case 'get_fraud_risk_score':
          return this.getFraudRiskScore(args);
        case 'get_income_verification':
          return this.getIncomeVerification(args);
        case 'get_employment_verification':
          return this.getEmploymentVerification(args);
        case 'search_consumer':
          return this.searchConsumer(args);
        case 'get_prequalification_score':
          return this.getPrequalificationScore(args);
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

    const response = await this.fetchWithRetry(this.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: this.clientId,
        client_secret: this.clientSecret,
        scope: 'https://api.equifax.com/business/credit-reports/v1',
      }).toString(),
    });

    if (!response.ok) {
      throw new Error(`OAuth2 token request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as { access_token: string; expires_in: number };
    this.bearerToken = data.access_token;
    this.tokenExpiry = now + (data.expires_in - 60) * 1000;
    return this.bearerToken;
  }


  private buildConsumerBody(args: Record<string, unknown>): Record<string, unknown> {
    const body: Record<string, unknown> = {
      consumers: {
        name: [{ identifier: 'current', firstName: args.first_name, lastName: args.last_name }],
        socialNum: [{ identifier: 'current', number: args.ssn }],
      },
    };
    if (args.date_of_birth) {
      (body.consumers as Record<string, unknown>).dateOfBirth = args.date_of_birth;
    }
    if (args.address || args.city || args.state || args.zip) {
      (body.consumers as Record<string, unknown>).addresses = [{
        identifier: 'current',
        street1: args.address,
        city: args.city,
        state: args.state,
        zip: args.zip,
      }];
    }
    return body;
  }

  private async equifaxPost(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const token = await this.getOrRefreshToken();
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `Equifax API error: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }

    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async equifaxGet(path: string, params: Record<string, string> = {}): Promise<ToolResult> {
    const token = await this.getOrRefreshToken();
    const qs = new URLSearchParams(params).toString();
    const url = `${this.baseUrl}${path}${qs ? '?' + qs : ''}`;

    const response = await this.fetchWithRetry(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `Equifax API error: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }

    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getCreditScore(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.first_name || !args.last_name || !args.ssn) {
      return { content: [{ type: 'text', text: 'first_name, last_name, and ssn are required' }], isError: true };
    }
    const body = {
      ...this.buildConsumerBody(args),
      models: [{ identifier: 'score', modelNumber: '00476' }],
    };
    return this.equifaxPost('/business/consumer-credit/v1/report/products/score', body);
  }

  private async getCreditReport(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.first_name || !args.last_name || !args.ssn) {
      return { content: [{ type: 'text', text: 'first_name, last_name, and ssn are required' }], isError: true };
    }
    const body = {
      ...this.buildConsumerBody(args),
      models: [{ identifier: 'score', modelNumber: '00476' }],
      addOns: {
        riskModels: { identifier: 'score', scorePercentile: true },
        marketMax: { enabled: false },
      },
    };
    return this.equifaxPost('/business/consumer-credit/v1/report', body);
  }

  private async getCreditScoreHistory(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.first_name || !args.last_name || !args.ssn) {
      return { content: [{ type: 'text', text: 'first_name, last_name, and ssn are required' }], isError: true };
    }
    const months = (args.months as number) || 12;
    const body = {
      ...this.buildConsumerBody(args),
      addOns: { scoreHistory: { months } },
    };
    return this.equifaxPost('/business/consumer-credit/v1/report/products/score-history', body);
  }

  private async getCreditMonitoringAlerts(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.consumer_id) {
      return { content: [{ type: 'text', text: 'consumer_id is required' }], isError: true };
    }
    const params: Record<string, string> = {};
    if (args.alert_type && args.alert_type !== 'all') params.alertType = args.alert_type as string;
    if (args.since_date) params.sinceDate = args.since_date as string;
    return this.equifaxGet(`/v1/creditMonitoring/${encodeURIComponent(args.consumer_id as string)}/alerts`, params);
  }

  private async verifyIdentity(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.first_name || !args.last_name || !args.ssn || !args.date_of_birth) {
      return { content: [{ type: 'text', text: 'first_name, last_name, ssn, and date_of_birth are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      firstName: args.first_name,
      lastName: args.last_name,
      ssn: args.ssn,
      dateOfBirth: args.date_of_birth,
    };
    if (args.address) body.address = args.address;
    if (args.zip) body.zip = args.zip;
    if (args.phone) body.phone = args.phone;
    return this.equifaxPost('/business/identity-verification/v1/verify', body);
  }

  private async getFraudRiskScore(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.first_name || !args.last_name || !args.ssn) {
      return { content: [{ type: 'text', text: 'first_name, last_name, and ssn are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      ...this.buildConsumerBody(args),
      fraudDetection: {
        enabled: true,
        ipAddress: args.ip_address,
        deviceId: args.device_id,
      },
    };
    return this.equifaxPost('/business/consumer-credit/v1/report/products/fraud-risk', body);
  }

  private async getIncomeVerification(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.first_name || !args.last_name || !args.ssn) {
      return { content: [{ type: 'text', text: 'first_name, last_name, and ssn are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      firstName: args.first_name,
      lastName: args.last_name,
      ssn: args.ssn,
    };
    if (args.reported_income) body.reportedIncome = args.reported_income;
    return this.equifaxPost('/business/income-verification/v1/verify', body);
  }

  private async getEmploymentVerification(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.first_name || !args.last_name || !args.ssn) {
      return { content: [{ type: 'text', text: 'first_name, last_name, and ssn are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      firstName: args.first_name,
      lastName: args.last_name,
      ssn: args.ssn,
    };
    if (args.employer_name) body.employerName = args.employer_name;
    return this.equifaxPost('/business/employment-verification/v1/verify', body);
  }

  private async searchConsumer(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.first_name || !args.last_name || !args.date_of_birth) {
      return { content: [{ type: 'text', text: 'first_name, last_name, and date_of_birth are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      firstName: args.first_name,
      lastName: args.last_name,
      dateOfBirth: args.date_of_birth,
    };
    if (args.address) body.address = args.address;
    if (args.zip) body.zip = args.zip;
    return this.equifaxPost('/business/consumer-credit/v1/consumers/search', body);
  }

  private async getPrequalificationScore(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.first_name || !args.last_name || !args.ssn) {
      return { content: [{ type: 'text', text: 'first_name, last_name, and ssn are required' }], isError: true };
    }
    const body = {
      ...this.buildConsumerBody(args),
      prequalification: {
        productType: (args.product_type as string) || 'personal',
        softPull: true,
      },
    };
    return this.equifaxPost('/business/consumer-credit/v1/report/products/prequalification', body);
  }
}

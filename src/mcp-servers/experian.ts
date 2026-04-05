/**
 * Experian MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// No official Experian MCP server was found on GitHub or the MCP registry.
//
// Base URL: https://us-api.experian.com  (sandbox: https://sandbox-us-api.experian.com)
// Auth: OAuth2 — POST /oauth2/v1/token with username, password, client_id, client_secret
//   Token endpoint: https://us-api.experian.com/oauth2/v1/token
//   Sandbox token endpoint: https://sandbox-us-api.experian.com/oauth2/v1/token
// Docs: https://developer.experian.com/
// Rate limits: Not publicly documented; contact Experian for production rate limit details

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface ExperianConfig {
  clientId: string;
  clientSecret: string;
  username: string;
  password: string;
  /** Base URL — defaults to production US endpoint */
  baseUrl?: string;
  /** OAuth2 token URL — defaults to production US endpoint */
  tokenUrl?: string;
}

export class ExperianMCPServer extends MCPAdapterBase {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly username: string;
  private readonly password: string;
  private readonly baseUrl: string;
  private readonly tokenUrl: string;
  private bearerToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(config: ExperianConfig) {
    super();
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.username = config.username;
    this.password = config.password;
    this.baseUrl = config.baseUrl || 'https://us-api.experian.com';
    this.tokenUrl = config.tokenUrl || 'https://us-api.experian.com/oauth2/v1/token';
  }

  static catalog() {
    return {
      name: 'experian',
      displayName: 'Experian',
      version: '1.0.0',
      category: 'finance' as const,
      keywords: [
        'experian', 'credit', 'credit score', 'credit report', 'credit bureau', 'business credit',
        'consumer credit', 'credit risk', 'fraud', 'identity verification', 'address validation',
        'employment verification', 'income verification', 'commercial credit', 'credit decisioning',
        'intelliscore', 'business information', 'financial risk',
      ],
      toolNames: [
        'get_consumer_credit_report',
        'get_consumer_credit_score',
        'get_business_credit_report',
        'get_business_credit_score',
        'search_business',
        'verify_consumer_identity',
        'get_fraud_shield',
        'get_income_verification',
        'validate_address',
        'get_business_facts',
        'get_commercial_collections',
        'get_fico_score',
      ],
      description: 'Experian credit and business data: consumer and business credit reports, credit scores, FICO scores, identity and income verification, address validation, fraud detection.',
      author: 'protectnil' as const,
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'get_consumer_credit_report',
        description: 'Retrieve a full Experian consumer credit report including accounts, inquiries, collections, and public records',
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
              description: 'ZIP code',
            },
          },
          required: ['first_name', 'last_name', 'ssn'],
        },
      },
      {
        name: 'get_consumer_credit_score',
        description: 'Retrieve Experian credit score for a consumer with risk factors and score factors',
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
              description: 'ZIP code',
            },
          },
          required: ['first_name', 'last_name', 'ssn'],
        },
      },
      {
        name: 'get_business_credit_report',
        description: 'Retrieve a full Experian business credit report including trade lines, collections, public records, and payment trends',
        inputSchema: {
          type: 'object',
          properties: {
            bin: {
              type: 'string',
              description: 'Experian Business Identification Number (BIN)',
            },
            business_name: {
              type: 'string',
              description: 'Business name (used if BIN not available)',
            },
            address: {
              type: 'string',
              description: 'Business street address',
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
              description: 'ZIP code',
            },
            tax_id: {
              type: 'string',
              description: 'EIN / Federal Tax ID (9 digits)',
            },
          },
        },
      },
      {
        name: 'get_business_credit_score',
        description: 'Retrieve Experian Intelliscore Plus business credit score (1-100) with risk class and contributing factors',
        inputSchema: {
          type: 'object',
          properties: {
            bin: {
              type: 'string',
              description: 'Experian Business Identification Number (BIN)',
            },
            business_name: {
              type: 'string',
              description: 'Business name (used if BIN not available)',
            },
            address: {
              type: 'string',
              description: 'Business street address',
            },
            zip: {
              type: 'string',
              description: 'ZIP code',
            },
            tax_id: {
              type: 'string',
              description: 'EIN / Federal Tax ID (9 digits)',
            },
          },
        },
      },
      {
        name: 'search_business',
        description: 'Search for a business in the Experian database by name, address, or tax ID to retrieve the Experian BIN',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Business name to search for',
            },
            city: {
              type: 'string',
              description: 'City to narrow search',
            },
            state: {
              type: 'string',
              description: 'Two-letter state code',
            },
            zip: {
              type: 'string',
              description: 'ZIP code',
            },
            tax_id: {
              type: 'string',
              description: 'EIN / Federal Tax ID',
            },
            geo: {
              type: 'string',
              description: 'Geographic scope: city, state, zipcode, country (default: country)',
            },
            subcode: {
              type: 'string',
              description: 'Experian subscriber code for your account',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'verify_consumer_identity',
        description: 'Verify a consumer identity against Experian records and return a confidence score and match indicators',
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
              description: 'ZIP code',
            },
            phone: {
              type: 'string',
              description: 'Phone number (10 digits, no dashes)',
            },
            email: {
              type: 'string',
              description: 'Email address',
            },
          },
          required: ['first_name', 'last_name', 'ssn'],
        },
      },
      {
        name: 'get_fraud_shield',
        description: 'Retrieve Experian FraudShield indicators for a consumer to detect synthetic identity fraud and credit washing',
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
              description: 'ZIP code',
            },
          },
          required: ['first_name', 'last_name', 'ssn'],
        },
      },
      {
        name: 'get_income_verification',
        description: 'Verify and retrieve income estimates for a consumer using Experian income data assets',
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
          },
          required: ['first_name', 'last_name', 'ssn'],
        },
      },
      {
        name: 'validate_address',
        description: 'Validate and standardize a US postal address using Experian address validation, returning corrected address and deliverability status',
        inputSchema: {
          type: 'object',
          properties: {
            address: {
              type: 'string',
              description: 'Street address to validate',
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
              description: 'ZIP code',
            },
            country: {
              type: 'string',
              description: 'ISO 3166-1 alpha-2 country code (default: US)',
            },
          },
          required: ['address'],
        },
      },
      {
        name: 'get_business_facts',
        description: 'Retrieve Experian business facts including years in business, SIC code, employee count, and annual sales',
        inputSchema: {
          type: 'object',
          properties: {
            bin: {
              type: 'string',
              description: 'Experian Business Identification Number (BIN)',
            },
            business_name: {
              type: 'string',
              description: 'Business name (used if BIN not available)',
            },
            address: {
              type: 'string',
              description: 'Business street address',
            },
            zip: {
              type: 'string',
              description: 'ZIP code',
            },
          },
        },
      },
      {
        name: 'get_commercial_collections',
        description: 'Retrieve commercial collections history for a business from the Experian database',
        inputSchema: {
          type: 'object',
          properties: {
            bin: {
              type: 'string',
              description: 'Experian Business Identification Number (BIN)',
            },
            business_name: {
              type: 'string',
              description: 'Business name',
            },
            address: {
              type: 'string',
              description: 'Business street address',
            },
            zip: {
              type: 'string',
              description: 'ZIP code',
            },
          },
        },
      },
      {
        name: 'get_fico_score',
        description: 'Retrieve the FICO score for a consumer using Experian credit data with reason codes and score range',
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
              description: 'ZIP code',
            },
            fico_version: {
              type: 'string',
              description: 'FICO model version: FICO8, FICO9, FICO_BANKCARD8 (default: FICO8)',
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
        case 'get_consumer_credit_report':
          return this.getConsumerCreditReport(args);
        case 'get_consumer_credit_score':
          return this.getConsumerCreditScore(args);
        case 'get_business_credit_report':
          return this.getBusinessCreditReport(args);
        case 'get_business_credit_score':
          return this.getBusinessCreditScore(args);
        case 'search_business':
          return this.searchBusiness(args);
        case 'verify_consumer_identity':
          return this.verifyConsumerIdentity(args);
        case 'get_fraud_shield':
          return this.getFraudShield(args);
        case 'get_income_verification':
          return this.getIncomeVerification(args);
        case 'validate_address':
          return this.validateAddress(args);
        case 'get_business_facts':
          return this.getBusinessFacts(args);
        case 'get_commercial_collections':
          return this.getCommercialCollections(args);
        case 'get_fico_score':
          return this.getFicoScore(args);
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
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: this.username,
        password: this.password,
        client_id: this.clientId,
        client_secret: this.clientSecret,
      }),
    });

    if (!response.ok) {
      throw new Error(`Experian OAuth2 token request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as { access_token: string; expires_in: string | number };
    this.bearerToken = data.access_token;
    this.tokenExpiry = now + (Number(data.expires_in) - 60) * 1000;
    return this.bearerToken;
  }


  private async experianPost(path: string, body: Record<string, unknown>): Promise<ToolResult> {
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
        content: [{ type: 'text', text: `Experian API error: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }

    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }


  private buildConsumerRequest(args: Record<string, unknown>): Record<string, unknown> {
    const req: Record<string, unknown> = {
      primaryApplicant: {
        name: {
          firstName: args.first_name,
          lastName: args.last_name,
        },
        ssn: args.ssn,
      },
    };
    if (args.date_of_birth) {
      (req.primaryApplicant as Record<string, unknown>).dob = { dob: args.date_of_birth };
    }
    if (args.address || args.city || args.state || args.zip) {
      (req.primaryApplicant as Record<string, unknown>).currentAddress = {
        line1: args.address,
        city: args.city,
        state: args.state,
        zipCode: args.zip,
      };
    }
    return req;
  }

  private buildBusinessRequest(args: Record<string, unknown>): Record<string, unknown> {
    const req: Record<string, unknown> = {};
    if (args.bin) req.bin = args.bin;
    if (args.business_name) req.businessName = args.business_name;
    if (args.address || args.city || args.state || args.zip) {
      req.address = {
        street: args.address,
        city: args.city,
        state: args.state,
        zip: args.zip,
      };
    }
    if (args.tax_id) req.taxId = args.tax_id;
    return req;
  }

  private async getConsumerCreditReport(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.first_name || !args.last_name || !args.ssn) {
      return { content: [{ type: 'text', text: 'first_name, last_name, and ssn are required' }], isError: true };
    }
    const body = {
      ...this.buildConsumerRequest(args),
      requestor: { subscriberCode: '' },
      addOns: { riskModels: true, statements: true, trades: true, inquiries: true, publicRecords: true },
    };
    return this.experianPost('/consumerservices/credit-profile/v2/credit-report', body);
  }

  private async getConsumerCreditScore(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.first_name || !args.last_name || !args.ssn) {
      return { content: [{ type: 'text', text: 'first_name, last_name, and ssn are required' }], isError: true };
    }
    const body = {
      ...this.buildConsumerRequest(args),
      addOns: { riskModels: true },
    };
    return this.experianPost('/consumerservices/credit-profile/v2/credit-score', body);
  }

  private async getBusinessCreditReport(args: Record<string, unknown>): Promise<ToolResult> {
    const body = {
      ...this.buildBusinessRequest(args),
      reportRequest: { industryCode: '', subcode: '' },
    };
    return this.experianPost('/businessinformation/businesses/v1/report', body);
  }

  private async getBusinessCreditScore(args: Record<string, unknown>): Promise<ToolResult> {
    const body = this.buildBusinessRequest(args);
    return this.experianPost('/businessinformation/businesses/v1/intelliscore', body);
  }

  private async searchBusiness(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name) return { content: [{ type: 'text', text: 'name is required' }], isError: true };
    const body: Record<string, unknown> = {
      name: args.name,
      geo: (args.geo as string) || 'country',
    };
    if (args.city) body.city = args.city;
    if (args.state) body.state = args.state;
    if (args.zip) body.zipCode = args.zip;
    if (args.tax_id) body.taxId = args.tax_id;
    if (args.subcode) body.subcode = args.subcode;
    return this.experianPost('/businessinformation/businesses/v1/search', body);
  }

  private async verifyConsumerIdentity(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.first_name || !args.last_name || !args.ssn) {
      return { content: [{ type: 'text', text: 'first_name, last_name, and ssn are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      ...this.buildConsumerRequest(args),
    };
    if (args.phone) body.phone = args.phone;
    if (args.email) body.email = args.email;
    return this.experianPost('/consumerservices/identity/v2/verify', body);
  }

  private async getFraudShield(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.first_name || !args.last_name || !args.ssn) {
      return { content: [{ type: 'text', text: 'first_name, last_name, and ssn are required' }], isError: true };
    }
    const body = {
      ...this.buildConsumerRequest(args),
      addOns: { fraudShield: true },
    };
    return this.experianPost('/consumerservices/credit-profile/v2/fraud-shield', body);
  }

  private async getIncomeVerification(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.first_name || !args.last_name || !args.ssn) {
      return { content: [{ type: 'text', text: 'first_name, last_name, and ssn are required' }], isError: true };
    }
    return this.experianPost('/consumerservices/income-verification/v1/verify', this.buildConsumerRequest(args));
  }

  private async validateAddress(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.address) return { content: [{ type: 'text', text: 'address is required' }], isError: true };
    const body: Record<string, unknown> = {
      address: args.address,
      country: (args.country as string) || 'US',
    };
    if (args.city) body.city = args.city;
    if (args.state) body.state = args.state;
    if (args.zip) body.zip = args.zip;
    return this.experianPost('/address-validation/v1/validate', body);
  }

  private async getBusinessFacts(args: Record<string, unknown>): Promise<ToolResult> {
    const body = this.buildBusinessRequest(args);
    return this.experianPost('/businessinformation/businesses/v1/facts', body);
  }

  private async getCommercialCollections(args: Record<string, unknown>): Promise<ToolResult> {
    const body = this.buildBusinessRequest(args);
    return this.experianPost('/businessinformation/businesses/v1/collections', body);
  }

  private async getFicoScore(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.first_name || !args.last_name || !args.ssn) {
      return { content: [{ type: 'text', text: 'first_name, last_name, and ssn are required' }], isError: true };
    }
    const body = {
      ...this.buildConsumerRequest(args),
      addOns: {
        riskModels: true,
        scoreModelIndicator: (args.fico_version as string) || 'FICO8',
      },
    };
    return this.experianPost('/consumerservices/credit-profile/v2/fico-score', body);
  }
}

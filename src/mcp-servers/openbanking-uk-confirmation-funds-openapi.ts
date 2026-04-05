/**
 * OpenBanking UK Confirmation of Funds MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// No official OpenBanking UK Confirmation of Funds MCP server was found on GitHub.
//
// Base URL: Varies per ASPSP (Account Servicing Payment Service Provider).
//   Default: https://openbanking.org.uk/open-banking/v3.1/cbpii
// Auth: OAuth2 Bearer token (TPP client credentials or PSU authorization code flow).
//   FAPI headers required: x-fapi-auth-date, x-fapi-customer-ip-address, x-fapi-interaction-id.
// Docs: https://openbankinguk.github.io/read-write-api-site3/v3.1.7/profiles/confirmation-of-funds-api-profile.html
// Spec: https://api.apis.guru/v2/specs/openbanking.org.uk/confirmation-funds-openapi/3.1.7/openapi.json
// Rate limits: Defined per ASPSP. Typically 500–1000 req/min per TPP client credential.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface OpenBankingUKConfirmationFundsOpenapiConfig {
  /** OAuth2 Bearer access token issued to the TPP */
  accessToken: string;
  /** Base URL of the ASPSP's CBPII endpoint (default: https://openbanking.org.uk/open-banking/v3.1/cbpii) */
  baseUrl?: string;
  /** FAPI customer-facing IP address to forward */
  fapiCustomerIpAddress?: string;
  /** FAPI customer user-agent */
  customerUserAgent?: string;
}

export class OpenBankingUKConfirmationFundsOpenapiMCPServer extends MCPAdapterBase {
  private readonly accessToken: string;
  private readonly baseUrl: string;
  private readonly fapiCustomerIpAddress: string | undefined;
  private readonly customerUserAgent: string | undefined;

  constructor(config: OpenBankingUKConfirmationFundsOpenapiConfig) {
    super();
    this.accessToken = config.accessToken;
    this.baseUrl = config.baseUrl ?? 'https://openbanking.org.uk/open-banking/v3.1/cbpii';
    this.fapiCustomerIpAddress = config.fapiCustomerIpAddress;
    this.customerUserAgent = config.customerUserAgent;
  }

  static catalog() {
    return {
      name: 'openbanking-uk-confirmation-funds-openapi',
      displayName: 'OpenBanking UK Confirmation of Funds',
      version: '1.0.0',
      category: 'finance',
      keywords: [
        'openbanking', 'open-banking', 'uk', 'confirmation-of-funds', 'cbpii',
        'funds', 'consent', 'payment', 'bank', 'tpp', 'aspsp', 'fapi',
        'balance', 'card', 'financial', 'psd2', 'fintech',
      ],
      toolNames: [
        'create_funds_confirmation_consent',
        'get_funds_confirmation_consent',
        'delete_funds_confirmation_consent',
        'create_funds_confirmation',
      ],
      description: 'UK Open Banking CBPII API: create and manage funds confirmation consents, and confirm whether sufficient funds are available for a payment.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'create_funds_confirmation_consent',
        description: 'Create a funds confirmation consent with the ASPSP — required before checking funds availability for a specific account and optional expiry',
        inputSchema: {
          type: 'object',
          properties: {
            debtor_account_scheme_name: {
              type: 'string',
              description: 'Account identification scheme (e.g. UK.OBIE.SortCodeAccountNumber, UK.OBIE.IBAN)',
            },
            debtor_account_identification: {
              type: 'string',
              description: 'Account identifier within the chosen scheme (e.g. "60161331926819" for sort code + account number)',
            },
            debtor_account_name: {
              type: 'string',
              description: 'Name of the account holder (optional)',
            },
            debtor_account_secondary_identification: {
              type: 'string',
              description: 'Secondary identifier such as roll number (optional)',
            },
            expiration_date_time: {
              type: 'string',
              description: 'ISO 8601 datetime at which consent expires (e.g. "2026-12-31T23:59:59Z"). Omit for indefinite consent.',
            },
            x_fapi_interaction_id: {
              type: 'string',
              description: 'UUID for end-to-end traceability across the FAPI journey (optional, auto-generated if omitted)',
            },
          },
          required: ['debtor_account_scheme_name', 'debtor_account_identification'],
        },
      },
      {
        name: 'get_funds_confirmation_consent',
        description: 'Retrieve an existing funds confirmation consent by ConsentId — returns status, expiry, and debtor account details',
        inputSchema: {
          type: 'object',
          properties: {
            consent_id: {
              type: 'string',
              description: 'ConsentId returned by create_funds_confirmation_consent',
            },
            x_fapi_interaction_id: {
              type: 'string',
              description: 'UUID for FAPI interaction traceability (optional)',
            },
          },
          required: ['consent_id'],
        },
      },
      {
        name: 'delete_funds_confirmation_consent',
        description: 'Delete a funds confirmation consent by ConsentId — revokes the TPP\'s ability to check funds for the consented account',
        inputSchema: {
          type: 'object',
          properties: {
            consent_id: {
              type: 'string',
              description: 'ConsentId to revoke and delete',
            },
            x_fapi_interaction_id: {
              type: 'string',
              description: 'UUID for FAPI interaction traceability (optional)',
            },
          },
          required: ['consent_id'],
        },
      },
      {
        name: 'create_funds_confirmation',
        description: 'Check whether sufficient funds are available in the consented account for a specified amount — returns FundsAvailable true/false',
        inputSchema: {
          type: 'object',
          properties: {
            consent_id: {
              type: 'string',
              description: 'ConsentId granting permission to check funds for the account',
            },
            reference: {
              type: 'string',
              description: 'Reference string for this funds check (max 35 chars, e.g. payment reference)',
            },
            instructed_amount_currency: {
              type: 'string',
              description: 'ISO 4217 currency code (e.g. GBP, EUR)',
            },
            instructed_amount_value: {
              type: 'string',
              description: 'Amount to confirm availability for as a decimal string (e.g. "150.00")',
            },
            x_fapi_interaction_id: {
              type: 'string',
              description: 'UUID for FAPI interaction traceability (optional)',
            },
          },
          required: ['consent_id', 'reference', 'instructed_amount_currency', 'instructed_amount_value'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'create_funds_confirmation_consent':
          return this.createFundsConfirmationConsent(args);
        case 'get_funds_confirmation_consent':
          return this.getFundsConfirmationConsent(args);
        case 'delete_funds_confirmation_consent':
          return this.deleteFundsConfirmationConsent(args);
        case 'create_funds_confirmation':
          return this.createFundsConfirmation(args);
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

  private buildHeaders(interactionId?: string): Record<string, string> {
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'x-fapi-interaction-id': interactionId ?? crypto.randomUUID(),
    };
    if (this.fapiCustomerIpAddress) {
      headers['x-fapi-customer-ip-address'] = this.fapiCustomerIpAddress;
    }
    if (this.customerUserAgent) {
      headers['x-customer-user-agent'] = this.customerUserAgent;
    }
    return headers;
  }

  private async createFundsConfirmationConsent(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.debtor_account_scheme_name) {
      return { content: [{ type: 'text', text: 'debtor_account_scheme_name is required' }], isError: true };
    }
    if (!args.debtor_account_identification) {
      return { content: [{ type: 'text', text: 'debtor_account_identification is required' }], isError: true };
    }

    const debtorAccount: Record<string, string> = {
      SchemeName: args.debtor_account_scheme_name as string,
      Identification: args.debtor_account_identification as string,
    };
    if (args.debtor_account_name) {
      debtorAccount['Name'] = args.debtor_account_name as string;
    }
    if (args.debtor_account_secondary_identification) {
      debtorAccount['SecondaryIdentification'] = args.debtor_account_secondary_identification as string;
    }

    const body: Record<string, unknown> = {
      Data: { DebtorAccount: debtorAccount },
    };
    if (args.expiration_date_time) {
      (body['Data'] as Record<string, unknown>)['ExpirationDateTime'] = args.expiration_date_time;
    }

    const response = await this.fetchWithRetry(`${this.baseUrl}/funds-confirmation-consents`, {
      method: 'POST',
      headers: this.buildHeaders(args.x_fapi_interaction_id as string | undefined),
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}${errText ? ` — ${errText}` : ''}` }],
        isError: true,
      };
    }

    const result = await response.json();
    return { content: [{ type: 'text', text: this.truncate(result) }], isError: false };
  }

  private async getFundsConfirmationConsent(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.consent_id) {
      return { content: [{ type: 'text', text: 'consent_id is required' }], isError: true };
    }

    const response = await this.fetchWithRetry(
      `${this.baseUrl}/funds-confirmation-consents/${encodeURIComponent(args.consent_id as string)}`,
      {
        method: 'GET',
        headers: this.buildHeaders(args.x_fapi_interaction_id as string | undefined),
      },
    );

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}${errText ? ` — ${errText}` : ''}` }],
        isError: true,
      };
    }

    const result = await response.json();
    return { content: [{ type: 'text', text: this.truncate(result) }], isError: false };
  }

  private async deleteFundsConfirmationConsent(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.consent_id) {
      return { content: [{ type: 'text', text: 'consent_id is required' }], isError: true };
    }

    const response = await this.fetchWithRetry(
      `${this.baseUrl}/funds-confirmation-consents/${encodeURIComponent(args.consent_id as string)}`,
      {
        method: 'DELETE',
        headers: this.buildHeaders(args.x_fapi_interaction_id as string | undefined),
      },
    );

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}${errText ? ` — ${errText}` : ''}` }],
        isError: true,
      };
    }

    return {
      content: [{ type: 'text', text: JSON.stringify({ deleted: true, consent_id: args.consent_id }) }],
      isError: false,
    };
  }

  private async createFundsConfirmation(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.consent_id) {
      return { content: [{ type: 'text', text: 'consent_id is required' }], isError: true };
    }
    if (!args.reference) {
      return { content: [{ type: 'text', text: 'reference is required' }], isError: true };
    }
    if (!args.instructed_amount_currency) {
      return { content: [{ type: 'text', text: 'instructed_amount_currency is required' }], isError: true };
    }
    if (!args.instructed_amount_value) {
      return { content: [{ type: 'text', text: 'instructed_amount_value is required' }], isError: true };
    }

    const body = {
      Data: {
        ConsentId: args.consent_id as string,
        Reference: args.reference as string,
        InstructedAmount: {
          Currency: args.instructed_amount_currency as string,
          Amount: args.instructed_amount_value as string,
        },
      },
    };

    const response = await this.fetchWithRetry(`${this.baseUrl}/funds-confirmations`, {
      method: 'POST',
      headers: this.buildHeaders(args.x_fapi_interaction_id as string | undefined),
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}${errText ? ` — ${errText}` : ''}` }],
        isError: true,
      };
    }

    const result = await response.json();
    return { content: [{ type: 'text', text: this.truncate(result) }], isError: false };
  }
}

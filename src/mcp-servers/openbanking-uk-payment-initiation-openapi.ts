/**
 * Open Banking UK Payment Initiation API MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Base URL: https://openbanking.org.uk/open-banking/v3.1/pisp
// Auth: Bearer token (TPPOAuth2Security — OAuth2 client credentials with 'payments' scope)
// Spec: https://api.apis.guru/v2/specs/openbanking.org.uk/payment-initiation-openapi/3.1.7/openapi.json
// Docs: https://openbankinguk.github.io/read-write-api-site3/v3.1.7/profiles/payment-initiation-api-profile.html
// Standard: Open Banking UK Read/Write API Specification v3.1.7 (PISP — Payment Initiation Service Provider)
// Rate limits: Determined by individual ASPSP (bank) implementations

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface OpenBankingUKPaymentInitiationConfig {
  bearerToken: string;
  baseUrl?: string;
  financialId?: string;
}

export class OpenBankingUkPaymentInitiationOpenapiMCPServer extends MCPAdapterBase {
  private readonly bearerToken: string;
  private readonly baseUrl: string;
  private readonly financialId: string;

  constructor(config: OpenBankingUKPaymentInitiationConfig) {
    super();
    this.bearerToken = config.bearerToken;
    this.baseUrl = config.baseUrl || 'https://openbanking.org.uk/open-banking/v3.1/pisp';
    this.financialId = config.financialId || '';
  }

  static catalog() {
    return {
      name: 'openbanking-uk-payment-initiation-openapi',
      displayName: 'Open Banking UK Payment Initiation API',
      version: '1.0.0',
      category: 'finance',
      keywords: [
        'open banking', 'uk', 'united kingdom', 'payment initiation', 'pisp',
        'domestic payment', 'international payment', 'standing order', 'scheduled payment',
        'file payment', 'payment consent', 'funds confirmation',
        'faster payments', 'chaps', 'bacs', 'sepa', 'swift',
        'ob read write api', 'fca', 'psd2', 'aspsp', 'tpp',
        'oauth2', 'financial grade api', 'fapi',
      ],
      toolNames: [
        'create_domestic_payment_consent',
        'get_domestic_payment_consent',
        'get_domestic_payment_consent_funds_confirmation',
        'create_domestic_payment',
        'get_domestic_payment',
        'get_domestic_payment_details',
        'create_domestic_scheduled_payment_consent',
        'get_domestic_scheduled_payment_consent',
        'create_domestic_scheduled_payment',
        'get_domestic_scheduled_payment',
        'create_domestic_standing_order_consent',
        'get_domestic_standing_order_consent',
        'create_domestic_standing_order',
        'get_domestic_standing_order',
        'create_international_payment_consent',
        'get_international_payment_consent',
        'get_international_payment_consent_funds_confirmation',
        'create_international_payment',
        'get_international_payment',
        'create_international_scheduled_payment_consent',
        'get_international_scheduled_payment_consent',
        'create_international_scheduled_payment',
        'get_international_scheduled_payment',
        'create_international_standing_order_consent',
        'get_international_standing_order_consent',
        'create_international_standing_order',
        'get_international_standing_order',
      ],
      description: 'Open Banking UK Payment Initiation API v3.1.7: create and manage domestic payments, scheduled payments, standing orders, international payments, and file payments via the UK Open Banking PISP standard.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      // ── Domestic Payment Consents ──────────────────────────────────────────
      {
        name: 'create_domestic_payment_consent',
        description: 'Create a domestic payment consent — initiates the PSU authorisation flow for a single immediate domestic payment. Returns a ConsentId required to authorise and then execute the payment.',
        inputSchema: {
          type: 'object',
          properties: {
            instructedAmount: {
              type: 'object',
              description: 'Amount to pay — object with Amount (string, e.g. "100.00") and Currency (ISO 4217, e.g. "GBP")',
            },
            creditorAccountSortCode: {
              type: 'string',
              description: 'Payee sort code (6 digits, UK domestic only)',
            },
            creditorAccountNumber: {
              type: 'string',
              description: 'Payee account number (8 digits, UK domestic)',
            },
            creditorName: {
              type: 'string',
              description: 'Name of the payee',
            },
            endToEndIdentification: {
              type: 'string',
              description: 'Unique end-to-end payment reference (max 35 chars)',
            },
            remittanceInformation: {
              type: 'string',
              description: 'Free-text payment reference visible on statement (max 35 chars)',
            },
          },
          required: ['instructedAmount', 'creditorAccountSortCode', 'creditorAccountNumber', 'creditorName'],
        },
      },
      {
        name: 'get_domestic_payment_consent',
        description: 'Get the current status and details of a domestic payment consent by ConsentId.',
        inputSchema: {
          type: 'object',
          properties: {
            consentId: {
              type: 'string',
              description: 'The ConsentId returned from create_domestic_payment_consent',
            },
          },
          required: ['consentId'],
        },
      },
      {
        name: 'get_domestic_payment_consent_funds_confirmation',
        description: 'Check whether sufficient funds are available on the debtor account to fulfil a domestic payment consent.',
        inputSchema: {
          type: 'object',
          properties: {
            consentId: {
              type: 'string',
              description: 'The ConsentId of the authorised payment consent to check',
            },
          },
          required: ['consentId'],
        },
      },
      // ── Domestic Payments ──────────────────────────────────────────────────
      {
        name: 'create_domestic_payment',
        description: 'Submit a domestic payment for execution against an authorised payment consent. The ConsentId must be in Authorised status.',
        inputSchema: {
          type: 'object',
          properties: {
            consentId: {
              type: 'string',
              description: 'The authorised ConsentId from create_domestic_payment_consent',
            },
            instructedAmount: {
              type: 'object',
              description: 'Amount — must match the consented amount: {Amount: "100.00", Currency: "GBP"}',
            },
            creditorAccountSortCode: {
              type: 'string',
              description: 'Payee sort code (must match consent)',
            },
            creditorAccountNumber: {
              type: 'string',
              description: 'Payee account number (must match consent)',
            },
            creditorName: {
              type: 'string',
              description: 'Payee name (must match consent)',
            },
            endToEndIdentification: {
              type: 'string',
              description: 'Unique end-to-end payment reference (max 35 chars)',
            },
            remittanceInformation: {
              type: 'string',
              description: 'Payment reference (max 35 chars)',
            },
          },
          required: ['consentId', 'instructedAmount', 'creditorAccountSortCode', 'creditorAccountNumber', 'creditorName'],
        },
      },
      {
        name: 'get_domestic_payment',
        description: 'Get the status and details of a submitted domestic payment by DomesticPaymentId.',
        inputSchema: {
          type: 'object',
          properties: {
            domesticPaymentId: {
              type: 'string',
              description: 'The DomesticPaymentId returned from create_domestic_payment',
            },
          },
          required: ['domesticPaymentId'],
        },
      },
      {
        name: 'get_domestic_payment_details',
        description: 'Get enriched payment details for a domestic payment including clearing system reference and multi-authorisation status.',
        inputSchema: {
          type: 'object',
          properties: {
            domesticPaymentId: {
              type: 'string',
              description: 'The DomesticPaymentId to retrieve details for',
            },
          },
          required: ['domesticPaymentId'],
        },
      },
      // ── Domestic Scheduled Payment Consents ────────────────────────────────
      {
        name: 'create_domestic_scheduled_payment_consent',
        description: 'Create a consent for a future-dated domestic payment. The payment will be executed on the specified RequestedExecutionDateTime.',
        inputSchema: {
          type: 'object',
          properties: {
            requestedExecutionDateTime: {
              type: 'string',
              description: 'Scheduled execution date/time in ISO 8601 format (e.g. "2026-04-01T09:00:00Z")',
            },
            instructedAmount: {
              type: 'object',
              description: 'Amount — {Amount: "100.00", Currency: "GBP"}',
            },
            creditorAccountSortCode: {
              type: 'string',
              description: 'Payee sort code',
            },
            creditorAccountNumber: {
              type: 'string',
              description: 'Payee account number',
            },
            creditorName: {
              type: 'string',
              description: 'Payee name',
            },
            endToEndIdentification: {
              type: 'string',
              description: 'Unique end-to-end reference (max 35 chars)',
            },
          },
          required: ['requestedExecutionDateTime', 'instructedAmount', 'creditorAccountSortCode', 'creditorAccountNumber', 'creditorName'],
        },
      },
      {
        name: 'get_domestic_scheduled_payment_consent',
        description: 'Get the status and details of a domestic scheduled payment consent by ConsentId.',
        inputSchema: {
          type: 'object',
          properties: {
            consentId: {
              type: 'string',
              description: 'The ConsentId of the scheduled payment consent',
            },
          },
          required: ['consentId'],
        },
      },
      // ── Domestic Scheduled Payments ────────────────────────────────────────
      {
        name: 'create_domestic_scheduled_payment',
        description: 'Submit a domestic scheduled payment for future execution against an authorised scheduled payment consent.',
        inputSchema: {
          type: 'object',
          properties: {
            consentId: {
              type: 'string',
              description: 'The authorised ConsentId from create_domestic_scheduled_payment_consent',
            },
            requestedExecutionDateTime: {
              type: 'string',
              description: 'Execution date/time in ISO 8601 format (must match consent)',
            },
            instructedAmount: {
              type: 'object',
              description: 'Amount (must match consent) — {Amount: "100.00", Currency: "GBP"}',
            },
            creditorAccountSortCode: {
              type: 'string',
              description: 'Payee sort code',
            },
            creditorAccountNumber: {
              type: 'string',
              description: 'Payee account number',
            },
            creditorName: {
              type: 'string',
              description: 'Payee name',
            },
          },
          required: ['consentId', 'requestedExecutionDateTime', 'instructedAmount', 'creditorAccountSortCode', 'creditorAccountNumber', 'creditorName'],
        },
      },
      {
        name: 'get_domestic_scheduled_payment',
        description: 'Get the status and details of a domestic scheduled payment by DomesticScheduledPaymentId.',
        inputSchema: {
          type: 'object',
          properties: {
            domesticScheduledPaymentId: {
              type: 'string',
              description: 'The DomesticScheduledPaymentId returned from create_domestic_scheduled_payment',
            },
          },
          required: ['domesticScheduledPaymentId'],
        },
      },
      // ── Domestic Standing Order Consents ───────────────────────────────────
      {
        name: 'create_domestic_standing_order_consent',
        description: 'Create a consent for a domestic standing order — a recurring payment at a defined frequency (weekly, monthly, etc.).',
        inputSchema: {
          type: 'object',
          properties: {
            frequency: {
              type: 'string',
              description: 'Payment frequency in ISO 20022 format (e.g. "EvryDay", "EvryWorkgDay", "IntrvlWkDay:01:01", "WkInMnthDay:01:01", "IntrvlMnthDay:01:01")',
            },
            firstPaymentDateTime: {
              type: 'string',
              description: 'Date/time of the first payment in ISO 8601 format',
            },
            firstPaymentAmount: {
              type: 'object',
              description: 'Amount for the first payment — {Amount: "100.00", Currency: "GBP"}',
            },
            recurringPaymentAmount: {
              type: 'object',
              description: 'Amount for recurring payments — {Amount: "100.00", Currency: "GBP"}',
            },
            creditorAccountSortCode: {
              type: 'string',
              description: 'Payee sort code',
            },
            creditorAccountNumber: {
              type: 'string',
              description: 'Payee account number',
            },
            creditorName: {
              type: 'string',
              description: 'Payee name',
            },
            finalPaymentDateTime: {
              type: 'string',
              description: 'Date/time of the final payment (optional — omit for open-ended standing order)',
            },
          },
          required: ['frequency', 'firstPaymentDateTime', 'firstPaymentAmount', 'creditorAccountSortCode', 'creditorAccountNumber', 'creditorName'],
        },
      },
      {
        name: 'get_domestic_standing_order_consent',
        description: 'Get the status and details of a domestic standing order consent by ConsentId.',
        inputSchema: {
          type: 'object',
          properties: {
            consentId: {
              type: 'string',
              description: 'The ConsentId of the standing order consent',
            },
          },
          required: ['consentId'],
        },
      },
      // ── Domestic Standing Orders ───────────────────────────────────────────
      {
        name: 'create_domestic_standing_order',
        description: 'Set up a domestic standing order against an authorised standing order consent.',
        inputSchema: {
          type: 'object',
          properties: {
            consentId: {
              type: 'string',
              description: 'The authorised ConsentId from create_domestic_standing_order_consent',
            },
            frequency: {
              type: 'string',
              description: 'Payment frequency (must match consent)',
            },
            firstPaymentDateTime: {
              type: 'string',
              description: 'First payment date/time (must match consent)',
            },
            firstPaymentAmount: {
              type: 'object',
              description: 'First payment amount (must match consent)',
            },
            creditorAccountSortCode: {
              type: 'string',
              description: 'Payee sort code',
            },
            creditorAccountNumber: {
              type: 'string',
              description: 'Payee account number',
            },
            creditorName: {
              type: 'string',
              description: 'Payee name',
            },
          },
          required: ['consentId', 'frequency', 'firstPaymentDateTime', 'firstPaymentAmount', 'creditorAccountSortCode', 'creditorAccountNumber', 'creditorName'],
        },
      },
      {
        name: 'get_domestic_standing_order',
        description: 'Get the status and details of a domestic standing order by DomesticStandingOrderId.',
        inputSchema: {
          type: 'object',
          properties: {
            domesticStandingOrderId: {
              type: 'string',
              description: 'The DomesticStandingOrderId returned from create_domestic_standing_order',
            },
          },
          required: ['domesticStandingOrderId'],
        },
      },
      // ── International Payment Consents ─────────────────────────────────────
      {
        name: 'create_international_payment_consent',
        description: 'Create a consent for an international payment — supports SWIFT, SEPA, and other cross-border payment schemes.',
        inputSchema: {
          type: 'object',
          properties: {
            instructedAmount: {
              type: 'object',
              description: 'Amount — {Amount: "100.00", Currency: "USD"}',
            },
            currencyOfTransfer: {
              type: 'string',
              description: 'Target currency for the transfer (ISO 4217, e.g. "USD", "EUR")',
            },
            creditorAccountIban: {
              type: 'string',
              description: 'Payee IBAN for international payment',
            },
            creditorName: {
              type: 'string',
              description: 'Name of the payee',
            },
            endToEndIdentification: {
              type: 'string',
              description: 'Unique end-to-end reference (max 35 chars)',
            },
            creditorAgentBic: {
              type: 'string',
              description: 'BIC/SWIFT code of the payee bank (optional)',
            },
            remittanceInformation: {
              type: 'string',
              description: 'Payment reference (max 35 chars)',
            },
          },
          required: ['instructedAmount', 'currencyOfTransfer', 'creditorAccountIban', 'creditorName'],
        },
      },
      {
        name: 'get_international_payment_consent',
        description: 'Get the status and details of an international payment consent by ConsentId.',
        inputSchema: {
          type: 'object',
          properties: {
            consentId: {
              type: 'string',
              description: 'The ConsentId of the international payment consent',
            },
          },
          required: ['consentId'],
        },
      },
      {
        name: 'get_international_payment_consent_funds_confirmation',
        description: 'Check whether sufficient funds are available to fulfil an international payment consent.',
        inputSchema: {
          type: 'object',
          properties: {
            consentId: {
              type: 'string',
              description: 'The authorised ConsentId to check funds for',
            },
          },
          required: ['consentId'],
        },
      },
      // ── International Payments ─────────────────────────────────────────────
      {
        name: 'create_international_payment',
        description: 'Submit an international payment for execution against an authorised international payment consent.',
        inputSchema: {
          type: 'object',
          properties: {
            consentId: {
              type: 'string',
              description: 'The authorised ConsentId from create_international_payment_consent',
            },
            instructedAmount: {
              type: 'object',
              description: 'Amount (must match consent)',
            },
            currencyOfTransfer: {
              type: 'string',
              description: 'Target currency (must match consent)',
            },
            creditorAccountIban: {
              type: 'string',
              description: 'Payee IBAN',
            },
            creditorName: {
              type: 'string',
              description: 'Payee name',
            },
            endToEndIdentification: {
              type: 'string',
              description: 'Unique end-to-end reference (max 35 chars)',
            },
          },
          required: ['consentId', 'instructedAmount', 'currencyOfTransfer', 'creditorAccountIban', 'creditorName'],
        },
      },
      {
        name: 'get_international_payment',
        description: 'Get the status and details of a submitted international payment by InternationalPaymentId.',
        inputSchema: {
          type: 'object',
          properties: {
            internationalPaymentId: {
              type: 'string',
              description: 'The InternationalPaymentId returned from create_international_payment',
            },
          },
          required: ['internationalPaymentId'],
        },
      },
      // ── International Scheduled Payment Consents ───────────────────────────
      {
        name: 'create_international_scheduled_payment_consent',
        description: 'Create a consent for a future-dated international payment.',
        inputSchema: {
          type: 'object',
          properties: {
            requestedExecutionDateTime: {
              type: 'string',
              description: 'Scheduled execution date/time in ISO 8601 format',
            },
            instructedAmount: {
              type: 'object',
              description: 'Amount — {Amount: "500.00", Currency: "USD"}',
            },
            currencyOfTransfer: {
              type: 'string',
              description: 'Target currency (ISO 4217)',
            },
            creditorAccountIban: {
              type: 'string',
              description: 'Payee IBAN',
            },
            creditorName: {
              type: 'string',
              description: 'Payee name',
            },
          },
          required: ['requestedExecutionDateTime', 'instructedAmount', 'currencyOfTransfer', 'creditorAccountIban', 'creditorName'],
        },
      },
      {
        name: 'get_international_scheduled_payment_consent',
        description: 'Get the status and details of an international scheduled payment consent by ConsentId.',
        inputSchema: {
          type: 'object',
          properties: {
            consentId: {
              type: 'string',
              description: 'The ConsentId of the international scheduled payment consent',
            },
          },
          required: ['consentId'],
        },
      },
      // ── International Scheduled Payments ───────────────────────────────────
      {
        name: 'create_international_scheduled_payment',
        description: 'Submit an international scheduled payment for future execution against an authorised consent.',
        inputSchema: {
          type: 'object',
          properties: {
            consentId: {
              type: 'string',
              description: 'The authorised ConsentId from create_international_scheduled_payment_consent',
            },
            requestedExecutionDateTime: {
              type: 'string',
              description: 'Execution date/time in ISO 8601 format (must match consent)',
            },
            instructedAmount: {
              type: 'object',
              description: 'Amount (must match consent)',
            },
            currencyOfTransfer: {
              type: 'string',
              description: 'Target currency (must match consent)',
            },
            creditorAccountIban: {
              type: 'string',
              description: 'Payee IBAN',
            },
            creditorName: {
              type: 'string',
              description: 'Payee name',
            },
          },
          required: ['consentId', 'requestedExecutionDateTime', 'instructedAmount', 'currencyOfTransfer', 'creditorAccountIban', 'creditorName'],
        },
      },
      {
        name: 'get_international_scheduled_payment',
        description: 'Get the status and details of an international scheduled payment by InternationalScheduledPaymentId.',
        inputSchema: {
          type: 'object',
          properties: {
            internationalScheduledPaymentId: {
              type: 'string',
              description: 'The InternationalScheduledPaymentId returned from create_international_scheduled_payment',
            },
          },
          required: ['internationalScheduledPaymentId'],
        },
      },
      // ── International Standing Order Consents ──────────────────────────────
      {
        name: 'create_international_standing_order_consent',
        description: 'Create a consent for a recurring international standing order.',
        inputSchema: {
          type: 'object',
          properties: {
            frequency: {
              type: 'string',
              description: 'Payment frequency (ISO 20022 format, e.g. "IntrvlMnthDay:01:01")',
            },
            firstPaymentDateTime: {
              type: 'string',
              description: 'First payment date/time in ISO 8601 format',
            },
            instructedAmount: {
              type: 'object',
              description: 'Recurring payment amount — {Amount: "200.00", Currency: "EUR"}',
            },
            currencyOfTransfer: {
              type: 'string',
              description: 'Target currency for recurring transfers (ISO 4217)',
            },
            creditorAccountIban: {
              type: 'string',
              description: 'Payee IBAN',
            },
            creditorName: {
              type: 'string',
              description: 'Payee name',
            },
            finalPaymentDateTime: {
              type: 'string',
              description: 'Final payment date/time (optional — omit for open-ended)',
            },
          },
          required: ['frequency', 'firstPaymentDateTime', 'instructedAmount', 'currencyOfTransfer', 'creditorAccountIban', 'creditorName'],
        },
      },
      {
        name: 'get_international_standing_order_consent',
        description: 'Get the status and details of an international standing order consent by ConsentId.',
        inputSchema: {
          type: 'object',
          properties: {
            consentId: {
              type: 'string',
              description: 'The ConsentId of the international standing order consent',
            },
          },
          required: ['consentId'],
        },
      },
      // ── International Standing Orders ──────────────────────────────────────
      {
        name: 'create_international_standing_order',
        description: 'Set up a recurring international standing order against an authorised consent.',
        inputSchema: {
          type: 'object',
          properties: {
            consentId: {
              type: 'string',
              description: 'The authorised ConsentId from create_international_standing_order_consent',
            },
            frequency: {
              type: 'string',
              description: 'Payment frequency (must match consent)',
            },
            firstPaymentDateTime: {
              type: 'string',
              description: 'First payment date/time (must match consent)',
            },
            instructedAmount: {
              type: 'object',
              description: 'Payment amount (must match consent)',
            },
            currencyOfTransfer: {
              type: 'string',
              description: 'Target currency (must match consent)',
            },
            creditorAccountIban: {
              type: 'string',
              description: 'Payee IBAN',
            },
            creditorName: {
              type: 'string',
              description: 'Payee name',
            },
          },
          required: ['consentId', 'frequency', 'firstPaymentDateTime', 'instructedAmount', 'currencyOfTransfer', 'creditorAccountIban', 'creditorName'],
        },
      },
      {
        name: 'get_international_standing_order',
        description: 'Get the status and details of an international standing order by InternationalStandingOrderPaymentId.',
        inputSchema: {
          type: 'object',
          properties: {
            internationalStandingOrderPaymentId: {
              type: 'string',
              description: 'The InternationalStandingOrderPaymentId returned from create_international_standing_order',
            },
          },
          required: ['internationalStandingOrderPaymentId'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'create_domestic_payment_consent':                      return this.createDomesticPaymentConsent(args);
        case 'get_domestic_payment_consent':                         return this.getDomesticPaymentConsent(args);
        case 'get_domestic_payment_consent_funds_confirmation':      return this.getDomesticPaymentConsentFundsConfirmation(args);
        case 'create_domestic_payment':                              return this.createDomesticPayment(args);
        case 'get_domestic_payment':                                 return this.getDomesticPayment(args);
        case 'get_domestic_payment_details':                         return this.getDomesticPaymentDetails(args);
        case 'create_domestic_scheduled_payment_consent':            return this.createDomesticScheduledPaymentConsent(args);
        case 'get_domestic_scheduled_payment_consent':               return this.getDomesticScheduledPaymentConsent(args);
        case 'create_domestic_scheduled_payment':                    return this.createDomesticScheduledPayment(args);
        case 'get_domestic_scheduled_payment':                       return this.getDomesticScheduledPayment(args);
        case 'create_domestic_standing_order_consent':               return this.createDomesticStandingOrderConsent(args);
        case 'get_domestic_standing_order_consent':                  return this.getDomesticStandingOrderConsent(args);
        case 'create_domestic_standing_order':                       return this.createDomesticStandingOrder(args);
        case 'get_domestic_standing_order':                          return this.getDomesticStandingOrder(args);
        case 'create_international_payment_consent':                 return this.createInternationalPaymentConsent(args);
        case 'get_international_payment_consent':                    return this.getInternationalPaymentConsent(args);
        case 'get_international_payment_consent_funds_confirmation': return this.getInternationalPaymentConsentFundsConfirmation(args);
        case 'create_international_payment':                         return this.createInternationalPayment(args);
        case 'get_international_payment':                            return this.getInternationalPayment(args);
        case 'create_international_scheduled_payment_consent':       return this.createInternationalScheduledPaymentConsent(args);
        case 'get_international_scheduled_payment_consent':          return this.getInternationalScheduledPaymentConsent(args);
        case 'create_international_scheduled_payment':               return this.createInternationalScheduledPayment(args);
        case 'get_international_scheduled_payment':                  return this.getInternationalScheduledPayment(args);
        case 'create_international_standing_order_consent':          return this.createInternationalStandingOrderConsent(args);
        case 'get_international_standing_order_consent':             return this.getInternationalStandingOrderConsent(args);
        case 'create_international_standing_order':                  return this.createInternationalStandingOrder(args);
        case 'get_international_standing_order':                     return this.getInternationalStandingOrder(args);
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

  private buildDomesticAccount(sortCode: string, accountNumber: string): Record<string, unknown> {
    return {
      SchemeName: 'UK.OBIE.SortCodeAccountNumber',
      Identification: `${sortCode}${accountNumber}`,
    };
  }

  private async request(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<ToolResult> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.bearerToken}`,
      'Accept': 'application/json',
      'x-fapi-interaction-id': crypto.randomUUID(),
    };
    if (this.financialId) headers['x-fapi-financial-id'] = this.financialId;
    if (body) headers['Content-Type'] = 'application/json';

    const response = await this.fetchWithRetry(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      return {
        content: [{ type: 'text', text: `API error ${response.status} ${response.statusText}: ${text.slice(0, 500)}` }],
        isError: true,
      };
    }

    if (response.status === 204) {
      return { content: [{ type: 'text', text: 'Success (no content)' }], isError: false };
    }

    const data = await response.json() as unknown;
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  // ── Domestic Payment Consent methods ──────────────────────────────────────

  private async createDomesticPaymentConsent(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.instructedAmount)        return { content: [{ type: 'text', text: 'instructedAmount is required' }], isError: true };
    if (!args.creditorAccountSortCode) return { content: [{ type: 'text', text: 'creditorAccountSortCode is required' }], isError: true };
    if (!args.creditorAccountNumber)   return { content: [{ type: 'text', text: 'creditorAccountNumber is required' }], isError: true };
    if (!args.creditorName)            return { content: [{ type: 'text', text: 'creditorName is required' }], isError: true };
    const initiation: Record<string, unknown> = {
      InstructionIdentification: crypto.randomUUID().slice(0, 35),
      EndToEndIdentification: (args.endToEndIdentification as string) ?? crypto.randomUUID().slice(0, 35),
      InstructedAmount: args.instructedAmount,
      CreditorAccount: this.buildDomesticAccount(args.creditorAccountSortCode as string, args.creditorAccountNumber as string),
      Creditor: { Name: args.creditorName },
    };
    if (args.remittanceInformation) initiation['RemittanceInformation'] = { Unstructured: args.remittanceInformation };
    return this.request('POST', '/domestic-payment-consents', { Data: { Initiation: initiation }, Risk: {} });
  }

  private async getDomesticPaymentConsent(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.consentId) return { content: [{ type: 'text', text: 'consentId is required' }], isError: true };
    return this.request('GET', `/domestic-payment-consents/${args.consentId}`);
  }

  private async getDomesticPaymentConsentFundsConfirmation(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.consentId) return { content: [{ type: 'text', text: 'consentId is required' }], isError: true };
    return this.request('GET', `/domestic-payment-consents/${args.consentId}/funds-confirmation`);
  }

  // ── Domestic Payment methods ───────────────────────────────────────────────

  private async createDomesticPayment(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.consentId)               return { content: [{ type: 'text', text: 'consentId is required' }], isError: true };
    if (!args.instructedAmount)        return { content: [{ type: 'text', text: 'instructedAmount is required' }], isError: true };
    if (!args.creditorAccountSortCode) return { content: [{ type: 'text', text: 'creditorAccountSortCode is required' }], isError: true };
    if (!args.creditorAccountNumber)   return { content: [{ type: 'text', text: 'creditorAccountNumber is required' }], isError: true };
    if (!args.creditorName)            return { content: [{ type: 'text', text: 'creditorName is required' }], isError: true };
    const initiation: Record<string, unknown> = {
      InstructionIdentification: crypto.randomUUID().slice(0, 35),
      EndToEndIdentification: (args.endToEndIdentification as string) ?? crypto.randomUUID().slice(0, 35),
      InstructedAmount: args.instructedAmount,
      CreditorAccount: this.buildDomesticAccount(args.creditorAccountSortCode as string, args.creditorAccountNumber as string),
      Creditor: { Name: args.creditorName },
    };
    if (args.remittanceInformation) initiation['RemittanceInformation'] = { Unstructured: args.remittanceInformation };
    return this.request('POST', '/domestic-payments', { Data: { ConsentId: args.consentId, Initiation: initiation }, Risk: {} });
  }

  private async getDomesticPayment(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.domesticPaymentId) return { content: [{ type: 'text', text: 'domesticPaymentId is required' }], isError: true };
    return this.request('GET', `/domestic-payments/${args.domesticPaymentId}`);
  }

  private async getDomesticPaymentDetails(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.domesticPaymentId) return { content: [{ type: 'text', text: 'domesticPaymentId is required' }], isError: true };
    return this.request('GET', `/domestic-payments/${args.domesticPaymentId}/payment-details`);
  }

  // ── Domestic Scheduled Payment Consent methods ────────────────────────────

  private async createDomesticScheduledPaymentConsent(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.requestedExecutionDateTime) return { content: [{ type: 'text', text: 'requestedExecutionDateTime is required' }], isError: true };
    if (!args.instructedAmount)           return { content: [{ type: 'text', text: 'instructedAmount is required' }], isError: true };
    if (!args.creditorAccountSortCode)    return { content: [{ type: 'text', text: 'creditorAccountSortCode is required' }], isError: true };
    if (!args.creditorAccountNumber)      return { content: [{ type: 'text', text: 'creditorAccountNumber is required' }], isError: true };
    if (!args.creditorName)               return { content: [{ type: 'text', text: 'creditorName is required' }], isError: true };
    return this.request('POST', '/domestic-scheduled-payment-consents', {
      Data: {
        Initiation: {
          InstructionIdentification: crypto.randomUUID().slice(0, 35),
          EndToEndIdentification: (args.endToEndIdentification as string) ?? crypto.randomUUID().slice(0, 35),
          RequestedExecutionDateTime: args.requestedExecutionDateTime,
          InstructedAmount: args.instructedAmount,
          CreditorAccount: this.buildDomesticAccount(args.creditorAccountSortCode as string, args.creditorAccountNumber as string),
          Creditor: { Name: args.creditorName },
        },
      },
      Risk: {},
    });
  }

  private async getDomesticScheduledPaymentConsent(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.consentId) return { content: [{ type: 'text', text: 'consentId is required' }], isError: true };
    return this.request('GET', `/domestic-scheduled-payment-consents/${args.consentId}`);
  }

  // ── Domestic Scheduled Payment methods ────────────────────────────────────

  private async createDomesticScheduledPayment(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.consentId)                  return { content: [{ type: 'text', text: 'consentId is required' }], isError: true };
    if (!args.requestedExecutionDateTime) return { content: [{ type: 'text', text: 'requestedExecutionDateTime is required' }], isError: true };
    if (!args.instructedAmount)           return { content: [{ type: 'text', text: 'instructedAmount is required' }], isError: true };
    if (!args.creditorAccountSortCode)    return { content: [{ type: 'text', text: 'creditorAccountSortCode is required' }], isError: true };
    if (!args.creditorAccountNumber)      return { content: [{ type: 'text', text: 'creditorAccountNumber is required' }], isError: true };
    if (!args.creditorName)               return { content: [{ type: 'text', text: 'creditorName is required' }], isError: true };
    return this.request('POST', '/domestic-scheduled-payments', {
      Data: {
        ConsentId: args.consentId,
        Initiation: {
          InstructionIdentification: crypto.randomUUID().slice(0, 35),
          EndToEndIdentification: crypto.randomUUID().slice(0, 35),
          RequestedExecutionDateTime: args.requestedExecutionDateTime,
          InstructedAmount: args.instructedAmount,
          CreditorAccount: this.buildDomesticAccount(args.creditorAccountSortCode as string, args.creditorAccountNumber as string),
          Creditor: { Name: args.creditorName },
        },
      },
      Risk: {},
    });
  }

  private async getDomesticScheduledPayment(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.domesticScheduledPaymentId) return { content: [{ type: 'text', text: 'domesticScheduledPaymentId is required' }], isError: true };
    return this.request('GET', `/domestic-scheduled-payments/${args.domesticScheduledPaymentId}`);
  }

  // ── Domestic Standing Order Consent methods ───────────────────────────────

  private async createDomesticStandingOrderConsent(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.frequency)               return { content: [{ type: 'text', text: 'frequency is required' }], isError: true };
    if (!args.firstPaymentDateTime)    return { content: [{ type: 'text', text: 'firstPaymentDateTime is required' }], isError: true };
    if (!args.firstPaymentAmount)      return { content: [{ type: 'text', text: 'firstPaymentAmount is required' }], isError: true };
    if (!args.creditorAccountSortCode) return { content: [{ type: 'text', text: 'creditorAccountSortCode is required' }], isError: true };
    if (!args.creditorAccountNumber)   return { content: [{ type: 'text', text: 'creditorAccountNumber is required' }], isError: true };
    if (!args.creditorName)            return { content: [{ type: 'text', text: 'creditorName is required' }], isError: true };
    const initiation: Record<string, unknown> = {
      Frequency: args.frequency,
      Reference: crypto.randomUUID().slice(0, 35),
      FirstPaymentDateTime: args.firstPaymentDateTime,
      FirstPaymentAmount: args.firstPaymentAmount,
      CreditorAccount: this.buildDomesticAccount(args.creditorAccountSortCode as string, args.creditorAccountNumber as string),
      Creditor: { Name: args.creditorName },
    };
    if (args.recurringPaymentAmount) initiation['RecurringPaymentAmount'] = args.recurringPaymentAmount;
    if (args.finalPaymentDateTime)   initiation['FinalPaymentDateTime'] = args.finalPaymentDateTime;
    return this.request('POST', '/domestic-standing-order-consents', { Data: { Initiation: initiation }, Risk: {} });
  }

  private async getDomesticStandingOrderConsent(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.consentId) return { content: [{ type: 'text', text: 'consentId is required' }], isError: true };
    return this.request('GET', `/domestic-standing-order-consents/${args.consentId}`);
  }

  // ── Domestic Standing Order methods ───────────────────────────────────────

  private async createDomesticStandingOrder(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.consentId)               return { content: [{ type: 'text', text: 'consentId is required' }], isError: true };
    if (!args.frequency)               return { content: [{ type: 'text', text: 'frequency is required' }], isError: true };
    if (!args.firstPaymentDateTime)    return { content: [{ type: 'text', text: 'firstPaymentDateTime is required' }], isError: true };
    if (!args.firstPaymentAmount)      return { content: [{ type: 'text', text: 'firstPaymentAmount is required' }], isError: true };
    if (!args.creditorAccountSortCode) return { content: [{ type: 'text', text: 'creditorAccountSortCode is required' }], isError: true };
    if (!args.creditorAccountNumber)   return { content: [{ type: 'text', text: 'creditorAccountNumber is required' }], isError: true };
    if (!args.creditorName)            return { content: [{ type: 'text', text: 'creditorName is required' }], isError: true };
    return this.request('POST', '/domestic-standing-orders', {
      Data: {
        ConsentId: args.consentId,
        Initiation: {
          Frequency: args.frequency,
          Reference: crypto.randomUUID().slice(0, 35),
          FirstPaymentDateTime: args.firstPaymentDateTime,
          FirstPaymentAmount: args.firstPaymentAmount,
          CreditorAccount: this.buildDomesticAccount(args.creditorAccountSortCode as string, args.creditorAccountNumber as string),
          Creditor: { Name: args.creditorName },
        },
      },
      Risk: {},
    });
  }

  private async getDomesticStandingOrder(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.domesticStandingOrderId) return { content: [{ type: 'text', text: 'domesticStandingOrderId is required' }], isError: true };
    return this.request('GET', `/domestic-standing-orders/${args.domesticStandingOrderId}`);
  }

  // ── International Payment Consent methods ─────────────────────────────────

  private async createInternationalPaymentConsent(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.instructedAmount)    return { content: [{ type: 'text', text: 'instructedAmount is required' }], isError: true };
    if (!args.currencyOfTransfer)  return { content: [{ type: 'text', text: 'currencyOfTransfer is required' }], isError: true };
    if (!args.creditorAccountIban) return { content: [{ type: 'text', text: 'creditorAccountIban is required' }], isError: true };
    if (!args.creditorName)        return { content: [{ type: 'text', text: 'creditorName is required' }], isError: true };
    const initiation: Record<string, unknown> = {
      InstructionIdentification: crypto.randomUUID().slice(0, 35),
      EndToEndIdentification: (args.endToEndIdentification as string) ?? crypto.randomUUID().slice(0, 35),
      InstructedAmount: args.instructedAmount,
      CurrencyOfTransfer: args.currencyOfTransfer,
      CreditorAccount: { SchemeName: 'UK.OBIE.IBAN', Identification: args.creditorAccountIban },
      Creditor: { Name: args.creditorName },
    };
    if (args.creditorAgentBic)       initiation['CreditorAgent'] = { SchemeName: 'UK.OBIE.BICFI', Identification: args.creditorAgentBic };
    if (args.remittanceInformation)  initiation['RemittanceInformation'] = { Unstructured: args.remittanceInformation };
    return this.request('POST', '/international-payment-consents', { Data: { Initiation: initiation }, Risk: {} });
  }

  private async getInternationalPaymentConsent(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.consentId) return { content: [{ type: 'text', text: 'consentId is required' }], isError: true };
    return this.request('GET', `/international-payment-consents/${args.consentId}`);
  }

  private async getInternationalPaymentConsentFundsConfirmation(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.consentId) return { content: [{ type: 'text', text: 'consentId is required' }], isError: true };
    return this.request('GET', `/international-payment-consents/${args.consentId}/funds-confirmation`);
  }

  // ── International Payment methods ─────────────────────────────────────────

  private async createInternationalPayment(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.consentId)           return { content: [{ type: 'text', text: 'consentId is required' }], isError: true };
    if (!args.instructedAmount)    return { content: [{ type: 'text', text: 'instructedAmount is required' }], isError: true };
    if (!args.currencyOfTransfer)  return { content: [{ type: 'text', text: 'currencyOfTransfer is required' }], isError: true };
    if (!args.creditorAccountIban) return { content: [{ type: 'text', text: 'creditorAccountIban is required' }], isError: true };
    if (!args.creditorName)        return { content: [{ type: 'text', text: 'creditorName is required' }], isError: true };
    return this.request('POST', '/international-payments', {
      Data: {
        ConsentId: args.consentId,
        Initiation: {
          InstructionIdentification: crypto.randomUUID().slice(0, 35),
          EndToEndIdentification: (args.endToEndIdentification as string) ?? crypto.randomUUID().slice(0, 35),
          InstructedAmount: args.instructedAmount,
          CurrencyOfTransfer: args.currencyOfTransfer,
          CreditorAccount: { SchemeName: 'UK.OBIE.IBAN', Identification: args.creditorAccountIban },
          Creditor: { Name: args.creditorName },
        },
      },
      Risk: {},
    });
  }

  private async getInternationalPayment(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.internationalPaymentId) return { content: [{ type: 'text', text: 'internationalPaymentId is required' }], isError: true };
    return this.request('GET', `/international-payments/${args.internationalPaymentId}`);
  }

  // ── International Scheduled Payment Consent methods ───────────────────────

  private async createInternationalScheduledPaymentConsent(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.requestedExecutionDateTime) return { content: [{ type: 'text', text: 'requestedExecutionDateTime is required' }], isError: true };
    if (!args.instructedAmount)           return { content: [{ type: 'text', text: 'instructedAmount is required' }], isError: true };
    if (!args.currencyOfTransfer)         return { content: [{ type: 'text', text: 'currencyOfTransfer is required' }], isError: true };
    if (!args.creditorAccountIban)        return { content: [{ type: 'text', text: 'creditorAccountIban is required' }], isError: true };
    if (!args.creditorName)               return { content: [{ type: 'text', text: 'creditorName is required' }], isError: true };
    return this.request('POST', '/international-scheduled-payment-consents', {
      Data: {
        Initiation: {
          InstructionIdentification: crypto.randomUUID().slice(0, 35),
          EndToEndIdentification: crypto.randomUUID().slice(0, 35),
          RequestedExecutionDateTime: args.requestedExecutionDateTime,
          InstructedAmount: args.instructedAmount,
          CurrencyOfTransfer: args.currencyOfTransfer,
          CreditorAccount: { SchemeName: 'UK.OBIE.IBAN', Identification: args.creditorAccountIban },
          Creditor: { Name: args.creditorName },
        },
      },
      Risk: {},
    });
  }

  private async getInternationalScheduledPaymentConsent(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.consentId) return { content: [{ type: 'text', text: 'consentId is required' }], isError: true };
    return this.request('GET', `/international-scheduled-payment-consents/${args.consentId}`);
  }

  // ── International Scheduled Payment methods ───────────────────────────────

  private async createInternationalScheduledPayment(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.consentId)                  return { content: [{ type: 'text', text: 'consentId is required' }], isError: true };
    if (!args.requestedExecutionDateTime) return { content: [{ type: 'text', text: 'requestedExecutionDateTime is required' }], isError: true };
    if (!args.instructedAmount)           return { content: [{ type: 'text', text: 'instructedAmount is required' }], isError: true };
    if (!args.currencyOfTransfer)         return { content: [{ type: 'text', text: 'currencyOfTransfer is required' }], isError: true };
    if (!args.creditorAccountIban)        return { content: [{ type: 'text', text: 'creditorAccountIban is required' }], isError: true };
    if (!args.creditorName)               return { content: [{ type: 'text', text: 'creditorName is required' }], isError: true };
    return this.request('POST', '/international-scheduled-payments', {
      Data: {
        ConsentId: args.consentId,
        Initiation: {
          InstructionIdentification: crypto.randomUUID().slice(0, 35),
          EndToEndIdentification: crypto.randomUUID().slice(0, 35),
          RequestedExecutionDateTime: args.requestedExecutionDateTime,
          InstructedAmount: args.instructedAmount,
          CurrencyOfTransfer: args.currencyOfTransfer,
          CreditorAccount: { SchemeName: 'UK.OBIE.IBAN', Identification: args.creditorAccountIban },
          Creditor: { Name: args.creditorName },
        },
      },
      Risk: {},
    });
  }

  private async getInternationalScheduledPayment(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.internationalScheduledPaymentId) return { content: [{ type: 'text', text: 'internationalScheduledPaymentId is required' }], isError: true };
    return this.request('GET', `/international-scheduled-payments/${args.internationalScheduledPaymentId}`);
  }

  // ── International Standing Order Consent methods ──────────────────────────

  private async createInternationalStandingOrderConsent(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.frequency)           return { content: [{ type: 'text', text: 'frequency is required' }], isError: true };
    if (!args.firstPaymentDateTime) return { content: [{ type: 'text', text: 'firstPaymentDateTime is required' }], isError: true };
    if (!args.instructedAmount)    return { content: [{ type: 'text', text: 'instructedAmount is required' }], isError: true };
    if (!args.currencyOfTransfer)  return { content: [{ type: 'text', text: 'currencyOfTransfer is required' }], isError: true };
    if (!args.creditorAccountIban) return { content: [{ type: 'text', text: 'creditorAccountIban is required' }], isError: true };
    if (!args.creditorName)        return { content: [{ type: 'text', text: 'creditorName is required' }], isError: true };
    const initiation: Record<string, unknown> = {
      Frequency: args.frequency,
      FirstPaymentDateTime: args.firstPaymentDateTime,
      FirstPaymentAmount: args.instructedAmount,
      CurrencyOfTransfer: args.currencyOfTransfer,
      CreditorAccount: { SchemeName: 'UK.OBIE.IBAN', Identification: args.creditorAccountIban },
      Creditor: { Name: args.creditorName },
    };
    if (args.finalPaymentDateTime) initiation['FinalPaymentDateTime'] = args.finalPaymentDateTime;
    return this.request('POST', '/international-standing-order-consents', { Data: { Initiation: initiation }, Risk: {} });
  }

  private async getInternationalStandingOrderConsent(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.consentId) return { content: [{ type: 'text', text: 'consentId is required' }], isError: true };
    return this.request('GET', `/international-standing-order-consents/${args.consentId}`);
  }

  // ── International Standing Order methods ──────────────────────────────────

  private async createInternationalStandingOrder(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.consentId)           return { content: [{ type: 'text', text: 'consentId is required' }], isError: true };
    if (!args.frequency)           return { content: [{ type: 'text', text: 'frequency is required' }], isError: true };
    if (!args.firstPaymentDateTime) return { content: [{ type: 'text', text: 'firstPaymentDateTime is required' }], isError: true };
    if (!args.instructedAmount)    return { content: [{ type: 'text', text: 'instructedAmount is required' }], isError: true };
    if (!args.currencyOfTransfer)  return { content: [{ type: 'text', text: 'currencyOfTransfer is required' }], isError: true };
    if (!args.creditorAccountIban) return { content: [{ type: 'text', text: 'creditorAccountIban is required' }], isError: true };
    if (!args.creditorName)        return { content: [{ type: 'text', text: 'creditorName is required' }], isError: true };
    return this.request('POST', '/international-standing-orders', {
      Data: {
        ConsentId: args.consentId,
        Initiation: {
          Frequency: args.frequency,
          FirstPaymentDateTime: args.firstPaymentDateTime,
          FirstPaymentAmount: args.instructedAmount,
          CurrencyOfTransfer: args.currencyOfTransfer,
          CreditorAccount: { SchemeName: 'UK.OBIE.IBAN', Identification: args.creditorAccountIban },
          Creditor: { Name: args.creditorName },
        },
      },
      Risk: {},
    });
  }

  private async getInternationalStandingOrder(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.internationalStandingOrderPaymentId) return { content: [{ type: 'text', text: 'internationalStandingOrderPaymentId is required' }], isError: true };
    return this.request('GET', `/international-standing-orders/${args.internationalStandingOrderPaymentId}`);
  }
}

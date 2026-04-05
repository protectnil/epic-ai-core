/**
 * Adyen MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/Adyen/adyen-mcp — transport: stdio/HTTP, auth: API key
//   Actively maintained (last commit Feb 2026). Covers ~26 tools (Checkout, Management, Webhooks, Onboarding).
//   Recommendation: Use vendor MCP for full API coverage. Use this adapter for air-gapped deployments
//   or when a stable, version-pinned integration is required.
//
// Base URL: https://checkout-test.adyen.com/v71 (test)
//           https://{prefix}-checkout-live.adyenpayments.com/checkout/v71 (live)
//   Live prefix: Customer Area → Developers → API URLs → Prefix
// Auth: X-API-Key header with API key from Customer Area
// Docs: https://docs.adyen.com/api-explorer/
// Rate limits: Varies by API product; Checkout ~150 req/s; Management ~10 req/s per endpoint

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface AdyenConfig {
  apiKey: string;
  merchantAccount: string;
  /**
   * Checkout base URL.
   * Test: https://checkout-test.adyen.com/v71
   * Live: https://{prefix}-checkout-live.adyenpayments.com/checkout/v71
   */
  baseUrl?: string;
  /**
   * Management API base URL (merchant/company account management, webhooks).
   * Test: https://management-test.adyen.com/v3
   * Live: https://management-live.adyen.com/v3
   */
  managementUrl?: string;
  /**
   * Disputes API base URL.
   * Test/Live: https://ca-test.adyen.com/ca/services/DisputeService/v30
   */
  disputesUrl?: string;
}

export class AdyenMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly merchantAccount: string;
  private readonly baseUrl: string;
  private readonly disputesUrl: string;

  constructor(config: AdyenConfig) {
    super();
    this.apiKey = config.apiKey;
    this.merchantAccount = config.merchantAccount;
    this.baseUrl = config.baseUrl || 'https://checkout-test.adyen.com/v71';
    this.disputesUrl = config.disputesUrl || 'https://ca-test.adyen.com/ca/services/DisputeService/v30';
    // managementUrl is accepted in config for forward compatibility; Management API tools to be added
  }

  get tools(): ToolDefinition[] {
    return [
      // Checkout API — sessions flow
      {
        name: 'create_payment_session',
        description: 'Create a payment session for Drop-in or Components integration. Returns session ID and session data for front-end rendering.',
        inputSchema: {
          type: 'object',
          properties: {
            amount: {
              type: 'object',
              description: 'Payment amount: { value: number (minor units), currency: string (ISO 4217, e.g. "USD") }',
            },
            returnUrl: {
              type: 'string',
              description: 'URL the shopper is redirected to after payment completion',
            },
            reference: {
              type: 'string',
              description: 'Unique merchant reference for this payment (your order ID)',
            },
            countryCode: {
              type: 'string',
              description: 'ISO 3166-1 alpha-2 country code of the shopper (e.g. US, GB)',
            },
            shopperLocale: {
              type: 'string',
              description: 'Shopper locale in IETF format (e.g. en-US)',
            },
            shopperEmail: {
              type: 'string',
              description: "Shopper's email address",
            },
            shopperReference: {
              type: 'string',
              description: 'Unique identifier for the shopper in your system (used for tokenization)',
            },
          },
          required: ['amount', 'returnUrl', 'reference'],
        },
      },
      {
        name: 'get_payment_session_result',
        description: 'Retrieve the result of a completed payment session by session ID and sessionResult query parameter.',
        inputSchema: {
          type: 'object',
          properties: {
            sessionId: {
              type: 'string',
              description: 'The session ID returned from create_payment_session',
            },
            sessionResult: {
              type: 'string',
              description: 'The sessionResult query parameter returned in the returnUrl after completion',
            },
          },
          required: ['sessionId', 'sessionResult'],
        },
      },
      // Checkout API — advanced (server-side payments)
      {
        name: 'get_payment_methods',
        description: 'Retrieve available payment methods for a given shopper context, amount, and country.',
        inputSchema: {
          type: 'object',
          properties: {
            amount: {
              type: 'object',
              description: 'Amount object { value, currency } to filter applicable payment methods',
            },
            countryCode: {
              type: 'string',
              description: 'ISO 3166-1 alpha-2 country code of the shopper',
            },
            channel: {
              type: 'string',
              description: 'Channel: Web, iOS, Android, or ReactNative',
            },
            shopperLocale: {
              type: 'string',
              description: 'Shopper locale in IETF format (e.g. en-US)',
            },
          },
        },
      },
      {
        name: 'create_payment',
        description: 'Submit a server-side payment request without Drop-in. Use for tokenized, card-not-present, or server-initiated transactions.',
        inputSchema: {
          type: 'object',
          properties: {
            amount: {
              type: 'object',
              description: 'Amount object { value (minor units), currency (ISO 4217) }',
            },
            reference: {
              type: 'string',
              description: 'Unique merchant reference for this payment',
            },
            paymentMethod: {
              type: 'object',
              description: 'Payment method object (e.g. { type: "scheme", encryptedCardNumber: "...", ... })',
            },
            returnUrl: {
              type: 'string',
              description: 'URL for redirect-based payment methods',
            },
            shopperReference: {
              type: 'string',
              description: 'Shopper ID for tokenization and recurring payments',
            },
            recurringProcessingModel: {
              type: 'string',
              description: 'Recurring model: Subscription, CardOnFile, or UnscheduledCardOnFile',
            },
          },
          required: ['amount', 'reference', 'paymentMethod', 'returnUrl'],
        },
      },
      {
        name: 'get_payment_details',
        description: 'Submit additional payment details after a redirect or 3DS challenge to complete a payment.',
        inputSchema: {
          type: 'object',
          properties: {
            details: {
              type: 'object',
              description: 'Details object returned by the front-end component after 3DS/redirect completion',
            },
            paymentData: {
              type: 'string',
              description: 'The paymentData value from the original payment response',
            },
          },
          required: ['details'],
        },
      },
      // Checkout API — modifications
      {
        name: 'capture_payment',
        description: 'Capture a previously authorised payment. Use when automatic capture is disabled for the merchant account.',
        inputSchema: {
          type: 'object',
          properties: {
            paymentPspReference: {
              type: 'string',
              description: 'PSP reference of the authorised payment to capture',
            },
            amount: {
              type: 'object',
              description: 'Amount to capture { value (minor units), currency }. Must not exceed the authorised amount.',
            },
            reference: {
              type: 'string',
              description: 'Unique merchant reference for this capture request',
            },
          },
          required: ['paymentPspReference', 'amount', 'reference'],
        },
      },
      {
        name: 'refund_payment',
        description: 'Request a full or partial refund for a captured payment. Partial refunds supported.',
        inputSchema: {
          type: 'object',
          properties: {
            paymentPspReference: {
              type: 'string',
              description: 'PSP reference of the captured payment to refund',
            },
            amount: {
              type: 'object',
              description: 'Amount to refund { value (minor units), currency }. May be less than captured amount.',
            },
            reference: {
              type: 'string',
              description: 'Unique merchant reference for this refund request',
            },
          },
          required: ['paymentPspReference', 'amount', 'reference'],
        },
      },
      {
        name: 'cancel_payment',
        description: 'Cancel an authorised but not yet captured payment.',
        inputSchema: {
          type: 'object',
          properties: {
            paymentPspReference: {
              type: 'string',
              description: 'PSP reference of the authorised payment to cancel',
            },
            reference: {
              type: 'string',
              description: 'Unique merchant reference for this cancellation request',
            },
          },
          required: ['paymentPspReference', 'reference'],
        },
      },
      {
        name: 'reverse_payment',
        description: 'Cancel or refund a payment in a single call. Adyen determines the appropriate action based on payment state.',
        inputSchema: {
          type: 'object',
          properties: {
            paymentPspReference: {
              type: 'string',
              description: 'PSP reference of the payment to reverse',
            },
            reference: {
              type: 'string',
              description: 'Unique merchant reference for this reversal request',
            },
          },
          required: ['paymentPspReference', 'reference'],
        },
      },
      // Payment links
      {
        name: 'create_payment_link',
        description: 'Create a hosted payment link to send to a shopper, with optional expiry and description.',
        inputSchema: {
          type: 'object',
          properties: {
            amount: {
              type: 'object',
              description: 'Amount object { value (minor units), currency (ISO 4217) }',
            },
            reference: {
              type: 'string',
              description: 'Unique merchant reference for this payment link',
            },
            returnUrl: {
              type: 'string',
              description: 'URL the shopper is redirected to after payment',
            },
            description: {
              type: 'string',
              description: 'Description shown on the hosted payment page',
            },
            expiresAt: {
              type: 'string',
              description: 'ISO 8601 datetime when the link expires (e.g. 2026-12-31T23:59:59Z)',
            },
            shopperEmail: {
              type: 'string',
              description: "Shopper's email address for pre-population",
            },
          },
          required: ['amount', 'reference'],
        },
      },
      {
        name: 'get_payment_link',
        description: 'Retrieve the status and details of a previously created payment link.',
        inputSchema: {
          type: 'object',
          properties: {
            linkId: {
              type: 'string',
              description: 'Payment link ID returned from create_payment_link',
            },
          },
          required: ['linkId'],
        },
      },
      {
        name: 'update_payment_link',
        description: 'Update the status of a payment link, e.g. set status to inactive to expire it early.',
        inputSchema: {
          type: 'object',
          properties: {
            linkId: {
              type: 'string',
              description: 'Payment link ID to update',
            },
            status: {
              type: 'string',
              description: 'New status: active or inactive',
            },
          },
          required: ['linkId', 'status'],
        },
      },
      // Disputes
      {
        name: 'list_disputes',
        description: 'List disputes (chargebacks and retrievals) for the merchant account with optional date and status filters.',
        inputSchema: {
          type: 'object',
          properties: {
            disputeStatus: {
              type: 'string',
              description: 'Filter by status: Undefended, Defended, Won, Lost (optional)',
            },
            from: {
              type: 'string',
              description: 'ISO 8601 start date for dispute creation date filter (e.g. 2026-01-01)',
            },
            to: {
              type: 'string',
              description: 'ISO 8601 end date for dispute creation date filter (e.g. 2026-03-31)',
            },
          },
        },
      },
      {
        name: 'get_dispute',
        description: 'Retrieve details of a specific dispute by PSP reference, including defense deadline and reason.',
        inputSchema: {
          type: 'object',
          properties: {
            psp_reference: {
              type: 'string',
              description: 'PSP reference of the disputed payment',
            },
          },
          required: ['psp_reference'],
        },
      },
      {
        name: 'defend_dispute',
        description: 'Submit a defense for a dispute with a defense reason code and optional supporting documents.',
        inputSchema: {
          type: 'object',
          properties: {
            psp_reference: {
              type: 'string',
              description: 'PSP reference of the disputed payment',
            },
            defense_reason_code: {
              type: 'string',
              description: 'Defense reason code (obtain from get_dispute defenseReasons)',
            },
          },
          required: ['psp_reference', 'defense_reason_code'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'create_payment_session':
          return await this.createPaymentSession(args);
        case 'get_payment_session_result':
          return await this.getPaymentSessionResult(args);
        case 'get_payment_methods':
          return await this.getPaymentMethods(args);
        case 'create_payment':
          return await this.createPayment(args);
        case 'get_payment_details':
          return await this.getPaymentDetails(args);
        case 'capture_payment':
          return await this.capturePayment(args);
        case 'refund_payment':
          return await this.refundPayment(args);
        case 'cancel_payment':
          return await this.cancelPayment(args);
        case 'reverse_payment':
          return await this.reversePayment(args);
        case 'create_payment_link':
          return await this.createPaymentLink(args);
        case 'get_payment_link':
          return await this.getPaymentLink(args);
        case 'update_payment_link':
          return await this.updatePaymentLink(args);
        case 'list_disputes':
          return await this.listDisputes(args);
        case 'get_dispute':
          return await this.getDispute(args);
        case 'defend_dispute':
          return await this.defendDispute(args);
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

  private get checkoutHeaders(): Record<string, string> {
    return { 'X-API-Key': this.apiKey, 'Content-Type': 'application/json' };
  }

  private async postCheckout(path: string, body: unknown): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.checkoutHeaders,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `Adyen API error ${response.status}: ${errText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Adyen returned non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getCheckout(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, { method: 'GET', headers: this.checkoutHeaders });
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `Adyen API error ${response.status}: ${errText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Adyen returned non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async patchCheckout(path: string, body: unknown): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'PATCH',
      headers: this.checkoutHeaders,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `Adyen API error ${response.status}: ${errText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Adyen returned non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async createPaymentSession(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {
      merchantAccount: this.merchantAccount,
      amount: args.amount,
      returnUrl: args.returnUrl,
      reference: args.reference,
    };
    if (args.countryCode) body['countryCode'] = args.countryCode;
    if (args.shopperLocale) body['shopperLocale'] = args.shopperLocale;
    if (args.shopperEmail) body['shopperEmail'] = args.shopperEmail;
    if (args.shopperReference) body['shopperReference'] = args.shopperReference;
    return this.postCheckout('/sessions', body);
  }

  private async getPaymentSessionResult(args: Record<string, unknown>): Promise<ToolResult> {
    const sessionId = args.sessionId as string;
    const sessionResult = args.sessionResult as string;
    if (!sessionId || !sessionResult) {
      return { content: [{ type: 'text', text: 'sessionId and sessionResult are required' }], isError: true };
    }
    return this.getCheckout(`/sessions/${encodeURIComponent(sessionId)}?sessionResult=${encodeURIComponent(sessionResult)}`);
  }

  private async getPaymentMethods(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = { merchantAccount: this.merchantAccount };
    if (args.amount) body['amount'] = args.amount;
    if (args.countryCode) body['countryCode'] = args.countryCode;
    if (args.channel) body['channel'] = args.channel;
    if (args.shopperLocale) body['shopperLocale'] = args.shopperLocale;
    return this.postCheckout('/paymentMethods', body);
  }

  private async createPayment(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.amount || !args.reference || !args.paymentMethod || !args.returnUrl) {
      return { content: [{ type: 'text', text: 'amount, reference, paymentMethod, and returnUrl are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      merchantAccount: this.merchantAccount,
      amount: args.amount,
      reference: args.reference,
      paymentMethod: args.paymentMethod,
      returnUrl: args.returnUrl,
    };
    if (args.shopperReference) body['shopperReference'] = args.shopperReference;
    if (args.recurringProcessingModel) body['recurringProcessingModel'] = args.recurringProcessingModel;
    return this.postCheckout('/payments', body);
  }

  private async getPaymentDetails(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.details) {
      return { content: [{ type: 'text', text: 'details is required' }], isError: true };
    }
    const body: Record<string, unknown> = { details: args.details };
    if (args.paymentData) body['paymentData'] = args.paymentData;
    return this.postCheckout('/payments/details', body);
  }

  private async capturePayment(args: Record<string, unknown>): Promise<ToolResult> {
    const pspRef = args.paymentPspReference as string;
    if (!pspRef || !args.amount || !args.reference) {
      return { content: [{ type: 'text', text: 'paymentPspReference, amount, and reference are required' }], isError: true };
    }
    const body = { merchantAccount: this.merchantAccount, amount: args.amount, reference: args.reference };
    return this.postCheckout(`/payments/${encodeURIComponent(pspRef)}/captures`, body);
  }

  private async refundPayment(args: Record<string, unknown>): Promise<ToolResult> {
    const pspRef = args.paymentPspReference as string;
    if (!pspRef || !args.amount || !args.reference) {
      return { content: [{ type: 'text', text: 'paymentPspReference, amount, and reference are required' }], isError: true };
    }
    const body = { merchantAccount: this.merchantAccount, amount: args.amount, reference: args.reference };
    return this.postCheckout(`/payments/${encodeURIComponent(pspRef)}/refunds`, body);
  }

  private async cancelPayment(args: Record<string, unknown>): Promise<ToolResult> {
    const pspRef = args.paymentPspReference as string;
    if (!pspRef || !args.reference) {
      return { content: [{ type: 'text', text: 'paymentPspReference and reference are required' }], isError: true };
    }
    const body = { merchantAccount: this.merchantAccount, reference: args.reference };
    return this.postCheckout(`/payments/${encodeURIComponent(pspRef)}/cancels`, body);
  }

  private async reversePayment(args: Record<string, unknown>): Promise<ToolResult> {
    const pspRef = args.paymentPspReference as string;
    if (!pspRef || !args.reference) {
      return { content: [{ type: 'text', text: 'paymentPspReference and reference are required' }], isError: true };
    }
    const body = { merchantAccount: this.merchantAccount, reference: args.reference };
    return this.postCheckout(`/payments/${encodeURIComponent(pspRef)}/reversals`, body);
  }

  private async createPaymentLink(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.amount || !args.reference) {
      return { content: [{ type: 'text', text: 'amount and reference are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      merchantAccount: this.merchantAccount,
      amount: args.amount,
      reference: args.reference,
    };
    if (args.returnUrl) body['returnUrl'] = args.returnUrl;
    if (args.description) body['description'] = args.description;
    if (args.expiresAt) body['expiresAt'] = args.expiresAt;
    if (args.shopperEmail) body['shopperEmail'] = args.shopperEmail;
    return this.postCheckout('/paymentLinks', body);
  }

  private async getPaymentLink(args: Record<string, unknown>): Promise<ToolResult> {
    const linkId = args.linkId as string;
    if (!linkId) return { content: [{ type: 'text', text: 'linkId is required' }], isError: true };
    return this.getCheckout(`/paymentLinks/${encodeURIComponent(linkId)}`);
  }

  private async updatePaymentLink(args: Record<string, unknown>): Promise<ToolResult> {
    const linkId = args.linkId as string;
    const status = args.status as string;
    if (!linkId || !status) return { content: [{ type: 'text', text: 'linkId and status are required' }], isError: true };
    return this.patchCheckout(`/paymentLinks/${encodeURIComponent(linkId)}`, { status });
  }

  private async listDisputes(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams({ merchantAccountCode: this.merchantAccount });
    if (args.disputeStatus) params.set('disputeStatus', args.disputeStatus as string);
    if (args.from) params.set('from', args.from as string);
    if (args.to) params.set('to', args.to as string);
    const response = await this.fetchWithRetry(`${this.disputesUrl}/retrieveApplicableDefenseReasons?${params.toString()}`, {
      method: 'GET',
      headers: { 'X-API-Key': this.apiKey, 'Content-Type': 'application/json' },
    });
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `Adyen Disputes API error ${response.status}: ${errText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Adyen returned non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getDispute(args: Record<string, unknown>): Promise<ToolResult> {
    const pspRef = args.psp_reference as string;
    if (!pspRef) return { content: [{ type: 'text', text: 'psp_reference is required' }], isError: true };
    const params = new URLSearchParams({
      merchantAccountCode: this.merchantAccount,
      pspReference: pspRef,
    });
    const response = await this.fetchWithRetry(`${this.disputesUrl}/retrieveApplicableDefenseReasons?${params.toString()}`, {
      method: 'GET',
      headers: { 'X-API-Key': this.apiKey, 'Content-Type': 'application/json' },
    });
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `Adyen Disputes API error ${response.status}: ${errText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Adyen returned non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async defendDispute(args: Record<string, unknown>): Promise<ToolResult> {
    const pspRef = args.psp_reference as string;
    const defenseReasonCode = args.defense_reason_code as string;
    if (!pspRef || !defenseReasonCode) {
      return { content: [{ type: 'text', text: 'psp_reference and defense_reason_code are required' }], isError: true };
    }
    const body = {
      merchantAccountCode: this.merchantAccount,
      pspReference: pspRef,
      defenseReasonCode,
    };
    const response = await this.fetchWithRetry(`${this.disputesUrl}/defendDispute`, {
      method: 'POST',
      headers: { 'X-API-Key': this.apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `Adyen Disputes API error ${response.status}: ${errText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Adyen returned non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  static catalog() {
    return {
      name: 'adyen',
      displayName: 'Adyen',
      version: '1.0.0',
      category: 'commerce' as const,
      keywords: ['adyen'],
      toolNames: ['create_payment_session', 'get_payment_session_result', 'get_payment_methods', 'create_payment', 'get_payment_details', 'capture_payment', 'refund_payment', 'cancel_payment', 'reverse_payment', 'create_payment_link', 'get_payment_link', 'update_payment_link', 'list_disputes', 'get_dispute', 'defend_dispute'],
      description: 'Adyen adapter for the Epic AI Intelligence Platform',
      author: 'protectnil' as const,
    };
  }
}

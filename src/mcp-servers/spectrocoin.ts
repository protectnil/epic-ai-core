/**
 * SpectroCoin MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// No official SpectroCoin MCP server was found on GitHub.
//
// Base URL: https://spectrocoin.com/api/merchant/1
// Auth: HMAC-SHA1 signed form POST — each request is signed with the merchant's private key
//       using RSA-SHA1 (sign field = base64(rsa_sha1(message, privateKey))).
//       This adapter accepts a pre-signed `sign` value from the caller, as private key
//       handling belongs in the calling application layer.
// Docs: https://spectrocoin.com/en/merchant.html
// Rate limits: Not publicly documented; treat as standard merchant API (avoid burst)

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface SpectroCoinConfig {
  merchantId: string;
  apiId: string;
  /** Base URL override (default: https://spectrocoin.com/api/merchant/1) */
  baseUrl?: string;
}

export class SpectroCoinMCPServer extends MCPAdapterBase {
  private readonly merchantId: string;
  private readonly apiId: string;
  private readonly baseUrl: string;

  constructor(config: SpectroCoinConfig) {
    super();
    this.merchantId = config.merchantId;
    this.apiId = config.apiId;
    this.baseUrl = config.baseUrl ?? 'https://spectrocoin.com/api/merchant/1';
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'create_order',
        description: 'Create a SpectroCoin merchant payment order. Returns an order URL for the payer to complete the transaction.',
        inputSchema: {
          type: 'object',
          properties: {
            orderId: {
              type: 'string',
              description: 'Your unique order ID for this transaction',
            },
            payCurrency: {
              type: 'string',
              description: 'Currency the payer will pay in (e.g. BTC, ETH, EUR)',
            },
            payAmount: {
              type: 'number',
              description: 'Amount the payer should pay in payCurrency (mutually exclusive with receiveAmount)',
            },
            receiveCurrency: {
              type: 'string',
              description: 'Currency you receive (e.g. EUR, USD)',
            },
            receiveAmount: {
              type: 'number',
              description: 'Amount you want to receive in receiveCurrency (mutually exclusive with payAmount)',
            },
            description: {
              type: 'string',
              description: 'Human-readable order description shown to the payer',
            },
            culture: {
              type: 'string',
              description: 'UI language/locale for the payment page (e.g. en, lt, ru)',
            },
            callbackUrl: {
              type: 'string',
              description: 'URL that SpectroCoin will POST order status updates to',
            },
            successUrl: {
              type: 'string',
              description: 'URL to redirect the payer after successful payment',
            },
            failureUrl: {
              type: 'string',
              description: 'URL to redirect the payer after failed or cancelled payment',
            },
            payerEmail: {
              type: 'string',
              description: "Payer's email address (optional, pre-fills checkout form)",
            },
            payerName: {
              type: 'string',
              description: "Payer's first name (optional)",
            },
            payerSurname: {
              type: 'string',
              description: "Payer's last name (optional)",
            },
            sign: {
              type: 'string',
              description: 'Base64-encoded RSA-SHA1 signature of the request parameters. Must be computed by the caller using the SpectroCoin private key.',
            },
          },
          required: ['orderId', 'payCurrency', 'receiveCurrency', 'sign'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'create_order':
          return await this.createOrder(args);
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

  private async createOrder(args: Record<string, unknown>): Promise<ToolResult> {
    const required = ['orderId', 'payCurrency', 'receiveCurrency', 'sign'];
    for (const field of required) {
      if (!args[field]) {
        return { content: [{ type: 'text', text: `Missing required field: ${field}` }], isError: true };
      }
    }

    const payload: Record<string, unknown> = {
      merchantId: this.merchantId,
      apiId: this.apiId,
      orderId: args.orderId,
      payCurrency: args.payCurrency,
      receiveCurrency: args.receiveCurrency,
      sign: args.sign,
    };

    if (args.payAmount != null) payload.payAmount = args.payAmount;
    if (args.receiveAmount != null) payload.receiveAmount = args.receiveAmount;
    if (args.description) payload.description = args.description;
    if (args.culture) payload.culture = args.culture;
    if (args.callbackUrl) payload.callbackUrl = args.callbackUrl;
    if (args.successUrl) payload.successUrl = args.successUrl;
    if (args.failureUrl) payload.failureUrl = args.failureUrl;
    if (args.payerEmail) payload.payerEmail = args.payerEmail;
    if (args.payerName) payload.payerName = args.payerName;
    if (args.payerSurname) payload.payerSurname = args.payerSurname;

    const response = await this.fetchWithRetry(`${this.baseUrl}/createOrder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `SpectroCoin API error ${response.status}: ${errText}` }], isError: true };
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new Error(`SpectroCoin returned non-JSON response (HTTP ${response.status})`);
    }

    const text = JSON.stringify(data, null, 2);
    const truncated = text.length > 10_000
      ? text.slice(0, 10_000) + '\n... [truncated, ' + text.length + ' total chars]'
      : text;

    return { content: [{ type: 'text', text: truncated }], isError: false };
  }

  static catalog() {
    return {
      name: 'spectrocoin',
      displayName: 'SpectroCoin',
      version: '1.0.0',
      category: 'finance' as const,
      keywords: ['spectrocoin', 'crypto', 'payment', 'merchant', 'bitcoin', 'ethereum', 'order', 'checkout'],
      toolNames: ['create_order'],
      description: 'SpectroCoin merchant payment adapter: create crypto and fiat payment orders with callback and redirect support.',
      author: 'protectnil' as const,
    };
  }
}

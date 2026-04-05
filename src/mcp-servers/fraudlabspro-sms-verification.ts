/**
 * FraudLabs Pro SMS Verification MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03.
// No official FraudLabs Pro MCP server was found on GitHub.
//
// Base URL: https://api.fraudlabspro.com
// Auth: API key passed as query parameter `key`
// Docs: https://www.fraudlabspro.com/developer/api/send-verification-sms
// Rate limits: Depends on plan (free tier: 500 queries/month).
// Spec: https://api.apis.guru/v2/specs/fraudlabspro.com/sms-verification/1.0/openapi.json

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface FraudLabsProSMSConfig {
  apiKey: string;
  baseUrl?: string;
}

export class FraudLabsProSMSVerificationMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: FraudLabsProSMSConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? 'https://api.fraudlabspro.com';
  }

  static catalog() {
    return {
      name: 'fraudlabspro-sms-verification',
      displayName: 'FraudLabs Pro SMS Verification',
      version: '1.0.0',
      category: 'communication' as const,
      keywords: [
        'fraudlabspro', 'fraud', 'sms', 'verification', 'otp', 'one-time-password',
        'authentication', 'phone', 'mobile', '2fa', 'two-factor', 'chargeback',
        'fraud prevention', 'telecom',
      ],
      toolNames: [
        'send_sms_verification',
        'verify_sms_otp',
      ],
      description:
        'Send SMS verification codes and verify OTPs using FraudLabs Pro. Helps merchants minimize chargebacks and ' +
        'fraud by authenticating users via their mobile phone number.',
      author: 'protectnil' as const,
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'send_sms_verification',
        description:
          'Send an SMS with a verification code (OTP) to a recipient mobile phone number. Returns a transaction ID ' +
          'used to verify the OTP. Optionally customize the SMS message template using <otp> as the placeholder.',
        inputSchema: {
          type: 'object',
          properties: {
            tel: {
              type: 'string',
              description:
                'Recipient mobile phone number in E.164 format (e.g. +14155552671). A plus sign followed by the ' +
                'country code and number, no spaces or parentheses.',
            },
            country_code: {
              type: 'string',
              description:
                'ISO 3166 alpha-2 country code for the recipient number (e.g. US, GB). Enables basic telephone ' +
                'number validation when provided.',
            },
            mesg: {
              type: 'string',
              description:
                'Custom SMS message template (max 140 characters). Use <otp> as the placeholder for the generated ' +
                'OTP code. Example: "Your verification code is <otp>."',
            },
            format: {
              type: 'string',
              description: 'Response format: json (default) or xml.',
              enum: ['json', 'xml'],
            },
          },
          required: ['tel'],
        },
      },
      {
        name: 'verify_sms_otp',
        description:
          'Verify that a one-time password (OTP) entered by the user matches the code sent by send_sms_verification. ' +
          'Returns the verification result and any error details.',
        inputSchema: {
          type: 'object',
          properties: {
            tran_id: {
              type: 'string',
              description:
                'The transaction ID returned by send_sms_verification when the OTP SMS was sent.',
            },
            otp: {
              type: 'string',
              description: 'The OTP code entered by the recipient to verify.',
            },
            format: {
              type: 'string',
              description: 'Response format: json (default) or xml.',
              enum: ['json', 'xml'],
            },
          },
          required: ['tran_id', 'otp'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'send_sms_verification':
          return await this.sendSmsVerification(args);
        case 'verify_sms_otp':
          return await this.verifySmsOtp(args);
        default:
          return {
            content: [{ type: 'text', text: `Unknown tool: ${name}` }],
            isError: true,
          };
      }
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Tool execution failed: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }

  private async sendSmsVerification(args: Record<string, unknown>): Promise<ToolResult> {
    const tel = args.tel as string;
    if (!tel) {
      return {
        content: [{ type: 'text', text: 'tel is required' }],
        isError: true,
      };
    }

    const params = new URLSearchParams();
    params.set('key', this.apiKey);
    params.set('tel', tel);
    if (args.country_code) params.set('country_code', args.country_code as string);
    if (args.mesg) params.set('mesg', args.mesg as string);
    if (args.format) params.set('format', args.format as string);

    const response = await this.fetchWithRetry(
      `${this.baseUrl}/v1/verification/send?${params.toString()}`,
      { method: 'POST' },
    );

    if (!response.ok) {
      let errText = '';
      try { errText = await response.text(); } catch { /* ignore */ }
      return {
        content: [
          {
            type: 'text',
            text: `FraudLabs Pro API error ${response.status} ${response.statusText}: ${errText}`,
          },
        ],
        isError: true,
      };
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      const txt = await response.text().catch(() => '');
      return {
        content: [{ type: 'text', text: this.truncate(txt || JSON.stringify({ status: response.status })) }],
        isError: false,
      };
    }

    return {
      content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }],
      isError: false,
    };
  }

  private async verifySmsOtp(args: Record<string, unknown>): Promise<ToolResult> {
    const tranId = args.tran_id as string;
    const otp = args.otp as string;
    if (!tranId || !otp) {
      return {
        content: [{ type: 'text', text: 'tran_id and otp are required' }],
        isError: true,
      };
    }

    const params = new URLSearchParams();
    params.set('key', this.apiKey);
    params.set('tran_id', tranId);
    params.set('otp', otp);
    if (args.format) params.set('format', args.format as string);

    const response = await this.fetchWithRetry(
      `${this.baseUrl}/v1/verification/result?${params.toString()}`,
      { method: 'GET' },
    );

    if (!response.ok) {
      let errText = '';
      try { errText = await response.text(); } catch { /* ignore */ }
      return {
        content: [
          {
            type: 'text',
            text: `FraudLabs Pro API error ${response.status} ${response.statusText}: ${errText}`,
          },
        ],
        isError: true,
      };
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      const txt = await response.text().catch(() => '');
      return {
        content: [{ type: 'text', text: this.truncate(txt || JSON.stringify({ status: response.status })) }],
        isError: false,
      };
    }

    return {
      content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }],
      isError: false,
    };
  }
}

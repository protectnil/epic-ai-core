/**
 * MailboxValidator Email Validation MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Base URL: https://api.mailboxvalidator.com
// Auth: API key passed as query parameter "key" on each request
// Endpoint: GET /v1/validation/single
// Docs: https://www.mailboxvalidator.com/api-single-validation
// Rate limits: Depends on plan; credits consumed per validation

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface MailboxValidatorConfig {
  apiKey: string;
}

export class MailboxvalidatorValidationMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.mailboxvalidator.com';

  constructor(config: MailboxValidatorConfig) {
    super();
    this.apiKey = config.apiKey;
  }

  static catalog() {
    return {
      name: 'mailboxvalidator-validation',
      displayName: 'MailboxValidator Email Validation',
      version: '1.0.0',
      category: 'communication',
      keywords: [
        'mailboxvalidator', 'email validation', 'email verify', 'email check',
        'disposable email', 'free email', 'smtp check', 'email deliverability',
        'bounce prevention', 'email hygiene', 'email verification',
      ],
      toolNames: [
        'validate_email',
      ],
      description: 'MailboxValidator: validate a single email address for syntax, domain, SMTP reachability, disposable/free/role status, and spam risk scoring.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'validate_email',
        description: 'Validate a single email address and return full results including syntax check, domain check, SMTP check, disposable/free/role flags, spam score, and credits remaining',
        inputSchema: {
          type: 'object',
          properties: {
            email: {
              type: 'string',
              description: 'The email address to validate',
            },
          },
          required: ['email'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'validate_email': return this.validateEmail(args);
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

  private async validateEmail(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.email) {
      return { content: [{ type: 'text', text: 'email is required' }], isError: true };
    }
    const params = new URLSearchParams({
      email: args.email as string,
      key: this.apiKey,
      format: 'json',
    });
    const response = await this.fetchWithRetry(`${this.baseUrl}/v1/validation/single?${params.toString()}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) {
      const err = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `API error: ${response.status} ${err}` }], isError: true };
    }
    const data = await response.json() as Record<string, unknown>;
    // API returns error_code / error_message on bad key or missing param
    if (data.error_code && data.error_code !== '0') {
      return {
        content: [{ type: 'text', text: `MailboxValidator error ${String(data.error_code)}: ${String(data.error_message)}` }],
        isError: true,
      };
    }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }
}

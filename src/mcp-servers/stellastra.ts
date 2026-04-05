/**
 * Stellastra MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// No official Stellastra MCP server was found on GitHub as of 2026-03-28.
// Our adapter covers: 1 tool. Vendor MCP covers: 0 tools (none exists).
// Recommendation: use-our-adapter — no official MCP server exists.
//
// Base URL: https://stellastra.com/api
// Auth: Basic auth — base64(auth_email:key). Credentials obtained from Stellastra dashboard.
// Docs: https://stellastra.com/docs/api
// Rate limits: Not publicly documented

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface StellastraConfig {
  authEmail: string;
  apiKey: string;
  baseUrl?: string;
}

export class StellastraMCPServer extends MCPAdapterBase {
  private readonly authEmail: string;
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: StellastraConfig) {
    super();
    this.authEmail = config.authEmail;
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://stellastra.com/api';
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'post_review',
        description: 'Submit a star rating and review request for a cybersecurity solution. Sends verification email to the user at the provided professional email address.',
        inputSchema: {
          type: 'object',
          properties: {
            user_email: {
              type: 'string',
              description: 'Professional email address of the reviewer. Free email domains (gmail, yahoo, etc.) are not accepted.',
            },
            rating: {
              type: 'number',
              description: 'Star rating for the cybersecurity solution. Must be an integer from 1 to 5.',
            },
            user_name: {
              type: 'string',
              description: 'Optional display name of the reviewer used in the verification email. Defaults to empty string if omitted.',
            },
          },
          required: ['user_email', 'rating'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'post_review':
          return await this.postReview(args);
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

  private async postReview(args: Record<string, unknown>): Promise<ToolResult> {
    const userEmail = args.user_email as string;
    const rating = args.rating as number;
    const userName = (args.user_name as string) ?? '';

    if (!userEmail) {
      return { content: [{ type: 'text', text: 'user_email is required' }], isError: true };
    }
    if (rating === undefined || rating === null) {
      return { content: [{ type: 'text', text: 'rating is required' }], isError: true };
    }
    if (![1, 2, 3, 4, 5].includes(rating)) {
      return { content: [{ type: 'text', text: 'rating must be an integer from 1 to 5' }], isError: true };
    }

    const credentials = btoa(`${this.authEmail}:${this.apiKey}`);

    const response = await this.fetchWithRetry(`${this.baseUrl}/post-review`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_email: userEmail,
        rating,
        ...(userName ? { user_name: userName } : {}),
      }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return {
        content: [{ type: 'text', text: `Stellastra API error ${response.status}: ${errText}` }],
        isError: true,
      };
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new Error(`Stellastra returned non-JSON response (HTTP ${response.status})`);
    }

    const text = JSON.stringify(data, null, 2);
    const truncated = text.length > 10_000
      ? text.slice(0, 10_000) + '\n... [truncated, ' + text.length + ' total chars]'
      : text;

    return { content: [{ type: 'text', text: truncated }], isError: false };
  }

  static catalog() {
    return {
      name: 'stellastra',
      displayName: 'Stellastra',
      version: '1.0.0',
      category: 'cybersecurity' as const,
      keywords: ['stellastra', 'cybersecurity', 'review', 'rating', 'star-rating', 'feedback'],
      toolNames: ['post_review'],
      description: 'Stellastra cybersecurity review platform: submit star ratings and trigger verification emails for cybersecurity solution reviews.',
      author: 'protectnil' as const,
    };
  }
}

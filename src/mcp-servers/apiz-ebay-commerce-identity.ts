/**
 * eBay Commerce Identity MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// No official eBay Commerce Identity MCP server was found on GitHub.
//
// Base URL: https://apiz.ebay.com/commerce/identity/v1
// Auth: OAuth2 authorization code flow — supported scopes:
//       https://api.ebay.com/oauth/api_scope/commerce.identity.readonly (basic info + business accounts)
//       https://api.ebay.com/oauth/api_scope/commerce.identity.status.readonly
//       https://api.ebay.com/oauth/api_scope/commerce.identity.name.readonly
//       https://api.ebay.com/oauth/api_scope/commerce.identity.email.readonly
//       https://api.ebay.com/oauth/api_scope/commerce.identity.address.readonly
//       https://api.ebay.com/oauth/api_scope/commerce.identity.phone.readonly
//       Token URL: https://api.ebay.com/identity/v1/oauth2/token
// Docs: https://developer.ebay.com/api-docs/commerce/identity/overview.html
// Rate limits: Not publicly documented; standard eBay API limits apply

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface EbayIdentityConfig {
  /** OAuth2 access token with one or more commerce.identity.* scopes */
  accessToken: string;
  /** Optional base URL override */
  baseUrl?: string;
}

export class ApizEbayCommerceIdentityMCPServer extends MCPAdapterBase {
  private readonly accessToken: string;
  private readonly baseUrl: string;

  constructor(config: EbayIdentityConfig) {
    super();
    this.accessToken = config.accessToken;
    this.baseUrl = config.baseUrl ?? 'https://apiz.ebay.com/commerce/identity/v1';
  }

  static catalog() {
    return {
      name: 'apiz-ebay-commerce-identity',
      displayName: 'eBay Commerce Identity',
      version: '1.0.0',
      category: 'ecommerce' as const,
      keywords: [
        'ebay', 'commerce', 'identity', 'user', 'account', 'profile',
        'seller', 'buyer', 'business', 'individual', 'username', 'email',
        'address', 'phone', 'marketplace', 'registration', 'status',
      ],
      toolNames: ['get_user'],
      description: 'Retrieve eBay user account profile information including username, account type, status, and contact details based on OAuth2 token scopes.',
      author: 'protectnil' as const,
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'get_user',
        description: 'Retrieve the authenticated eBay user\'s account profile: username, account type (individual/business), status, contact details, and address — scoped by granted OAuth2 permissions',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
    ];
  }

  async callTool(name: string, _args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'get_user':
          return await this.getUser();
        default:
          return {
            content: [{ type: 'text', text: `Unknown tool: ${name}` }],
            isError: true,
          };
      }
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Tool execution failed: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true,
      };
    }
  }

  private async getUser(): Promise<ToolResult> {
    const url = `${this.baseUrl}/user/`;
    const response = await this.fetchWithRetry(url, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }

    const data = await response.json() as unknown;
    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      isError: false,
    };
  }
}

/**
 * Marqeta MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/marqeta/marqeta-mcp — transport: stdio, auth: Basic (MARQETA_USERNAME + MARQETA_PASSWORD)
// Our adapter covers: 20 tools (users, cards, card products, transactions, velocity controls, funding).
// Vendor MCP covers: 33 tools across 7 service categories (Card Products, Card Transitions, Cards, Disputes,
//   Transactions, Users, Velocity Control). Last release: v1.0.4, Oct 28 2025. Maintained.
// Recommendation: use-both — MCP and our REST adapter have non-overlapping coverage.
//   MCP adds: disputes (disputes_listCases, disputes_createCase), card barcode lookup, card PAN visibility,
//     related-transaction lookup, user child accounts, user notes, user SSN, card transition read, auth-token lookup.
//   Our REST adapter covers: list_funding_sources, get_funding_source — not exposed by vendor MCP.
//   Combined coverage: 20 (REST) + MCP-only tools for full Core API surface.
//
// Integration: use-both
// MCP-sourced tools (REST adapter does NOT cover): disputes_listCases, disputes_createCase,
//   cards_getCardsbyBarcode, cards_getCardsbyTokenandShowpan, cards_postCardsbyPan,
//   transactions_getTransactionsbyFundingsourcetoken, transactions_getRelatedTransactionsbyToken,
//   users_getUsersAuthbyClientAccessToken, users_getChildrenUsersbyParenttoken,
//   users_getUsersbyPhonenumber, users_getUsersNotesbyToken, users_getUsersSSNbyToken,
//   cardtransitions_getCardtransitionsbyCardToken, cardtransitions_getCardtransitionsbyToken,
//   velocitycontrol_getVelocitycontrolsbyAccountToken, velocitycontrol_getVelocitycontrolsbyUserToken,
//   velocitycontrol_deleteVelocitycontrolsToken
// REST-sourced tools (vendor MCP does NOT cover): list_funding_sources, get_funding_source
//
// Base URL: https://shared-sandbox-api.marqeta.com/v3 (sandbox) | production URL provided by Marqeta
// Auth: HTTP Basic — username is the application token, password is the access token
// Docs: https://www.marqeta.com/docs/core-api/
// Rate limits: Not publicly documented; sandbox is rate-limited. Contact Marqeta for production limits.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface MarqetaConfig {
  applicationToken: string;   // Basic auth username
  accessToken: string;        // Basic auth password
  baseUrl?: string;           // Defaults to shared sandbox; set production URL from Marqeta
  programShortCode?: string;  // Optional program identifier for multi-program setups
}

export class MarqetaMCPServer extends MCPAdapterBase {
  private readonly appToken: string;
  private readonly accessToken: string;
  private readonly baseUrl: string;
  constructor(config: MarqetaConfig) {
    super();
    this.appToken = config.applicationToken;
    this.accessToken = config.accessToken;
    this.baseUrl = (config.baseUrl ?? 'https://shared-sandbox-api.marqeta.com/v3').replace(/\/$/, '');
    // programShortCode stored in config for multi-program setups; reserved for future query scoping
    void config.programShortCode;
  }

  static catalog() {
    return {
      name: 'marqeta',
      displayName: 'Marqeta',
      version: '1.0.0',
      category: 'finance',
      keywords: [
        'marqeta', 'card issuing', 'virtual card', 'physical card', 'debit card', 'payment card',
        'transaction', 'authorization', 'cardholder', 'user', 'card product', 'velocity control',
        'spending limit', 'funding source', 'program', 'fintech', 'banking', 'spend controls',
      ],
      toolNames: [
        'list_users', 'get_user', 'create_user', 'update_user',
        'list_cards', 'get_card', 'create_card', 'transition_card',
        'list_card_products', 'get_card_product',
        'list_transactions', 'get_transaction', 'list_transactions_for_user', 'list_transactions_for_card',
        'list_velocity_controls', 'get_velocity_control', 'create_velocity_control', 'update_velocity_control',
        'list_funding_sources', 'get_funding_source',
      ],
      description: 'Marqeta card issuing platform: manage cardholders, issue virtual and physical cards, inspect transactions, configure velocity controls and spending limits, and manage funding sources.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_users',
        description: 'List cardholder users with optional filters for status, email, and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            count: {
              type: 'number',
              description: 'Number of users to return (default: 5, max: 10)',
            },
            start_index: {
              type: 'number',
              description: 'Zero-based start index for pagination (default: 0)',
            },
            fields: {
              type: 'string',
              description: 'Comma-separated fields to include in the response (default: all fields)',
            },
            sort_by: {
              type: 'string',
              description: 'Sort field: last_modified_time or created_time (default: last_modified_time)',
            },
          },
        },
      },
      {
        name: 'get_user',
        description: 'Get full profile details for a cardholder user by user token or email',
        inputSchema: {
          type: 'object',
          properties: {
            user_token: {
              type: 'string',
              description: 'Unique user token (UUID)',
            },
          },
          required: ['user_token'],
        },
      },
      {
        name: 'create_user',
        description: 'Create a new cardholder user with identity and contact information for card issuance',
        inputSchema: {
          type: 'object',
          properties: {
            first_name: {
              type: 'string',
              description: 'Cardholder first name',
            },
            last_name: {
              type: 'string',
              description: 'Cardholder last name',
            },
            email: {
              type: 'string',
              description: 'Cardholder email address',
            },
            token: {
              type: 'string',
              description: 'Custom user token (UUID). If omitted, Marqeta auto-generates one.',
            },
            phone: {
              type: 'string',
              description: 'Phone number in E.164 format (e.g. +14155552671)',
            },
            address1: {
              type: 'string',
              description: 'Street address line 1',
            },
            address2: {
              type: 'string',
              description: 'Street address line 2',
            },
            city: {
              type: 'string',
              description: 'City',
            },
            state: {
              type: 'string',
              description: 'State or province (2-letter code for US, e.g. CA)',
            },
            postal_code: {
              type: 'string',
              description: 'ZIP or postal code',
            },
            country: {
              type: 'string',
              description: 'ISO 3166-1 alpha-2 country code (e.g. US)',
            },
            identifications: {
              type: 'string',
              description: 'JSON array of identity documents: [{"type":"SSN","value":"123456789"}]',
            },
            metadata: {
              type: 'string',
              description: 'Key-value metadata as JSON string (up to 20 pairs)',
            },
          },
          required: ['first_name', 'last_name'],
        },
      },
      {
        name: 'update_user',
        description: 'Update cardholder profile fields including address, phone, email, and metadata',
        inputSchema: {
          type: 'object',
          properties: {
            user_token: {
              type: 'string',
              description: 'User token to update',
            },
            first_name: {
              type: 'string',
              description: 'Updated first name',
            },
            last_name: {
              type: 'string',
              description: 'Updated last name',
            },
            email: {
              type: 'string',
              description: 'Updated email address',
            },
            phone: {
              type: 'string',
              description: 'Updated phone number in E.164 format',
            },
            address1: {
              type: 'string',
              description: 'Updated street address line 1',
            },
            city: {
              type: 'string',
              description: 'Updated city',
            },
            state: {
              type: 'string',
              description: 'Updated state code',
            },
            postal_code: {
              type: 'string',
              description: 'Updated ZIP/postal code',
            },
            metadata: {
              type: 'string',
              description: 'Updated metadata as JSON string',
            },
          },
          required: ['user_token'],
        },
      },
      {
        name: 'list_cards',
        description: 'List cards associated with a user token or card product with status and pagination filters',
        inputSchema: {
          type: 'object',
          properties: {
            user_token: {
              type: 'string',
              description: 'Filter cards belonging to a specific user',
            },
            card_product_token: {
              type: 'string',
              description: 'Filter cards of a specific card product',
            },
            count: {
              type: 'number',
              description: 'Number of cards to return (default: 5, max: 10)',
            },
            start_index: {
              type: 'number',
              description: 'Zero-based start index for pagination (default: 0)',
            },
          },
        },
      },
      {
        name: 'get_card',
        description: 'Get full details of a specific card by card token including state, PAN (masked), and expiration',
        inputSchema: {
          type: 'object',
          properties: {
            card_token: {
              type: 'string',
              description: 'Unique card token (UUID)',
            },
          },
          required: ['card_token'],
        },
      },
      {
        name: 'create_card',
        description: 'Issue a new virtual or physical card for a user under a specific card product',
        inputSchema: {
          type: 'object',
          properties: {
            user_token: {
              type: 'string',
              description: 'Token of the user to issue the card to',
            },
            card_product_token: {
              type: 'string',
              description: 'Token of the card product (program) to issue under',
            },
            token: {
              type: 'string',
              description: 'Custom card token (UUID). Auto-generated if omitted.',
            },
            expedite: {
              type: 'boolean',
              description: 'Expedite physical card fulfillment (default: false)',
            },
            metadata: {
              type: 'string',
              description: 'Key-value metadata as JSON string',
            },
          },
          required: ['user_token', 'card_product_token'],
        },
      },
      {
        name: 'transition_card',
        description: 'Change a card state — activate, suspend, terminate, or reinstate a card',
        inputSchema: {
          type: 'object',
          properties: {
            card_token: {
              type: 'string',
              description: 'Card token to transition',
            },
            state: {
              type: 'string',
              description: 'New card state: ACTIVE, SUSPENDED, or TERMINATED',
            },
            channel: {
              type: 'string',
              description: 'Channel triggering the transition: API, ADMIN, or SYSTEM (default: API)',
            },
            reason_code: {
              type: 'string',
              description: 'Reason code for the transition (optional, for compliance tracking)',
            },
          },
          required: ['card_token', 'state'],
        },
      },
      {
        name: 'list_card_products',
        description: 'List all card products (programs) in the Marqeta account defining card behavior and controls',
        inputSchema: {
          type: 'object',
          properties: {
            count: {
              type: 'number',
              description: 'Number of card products to return (default: 5, max: 10)',
            },
            start_index: {
              type: 'number',
              description: 'Zero-based start index for pagination (default: 0)',
            },
            sort_by: {
              type: 'string',
              description: 'Sort field: last_modified_time or created_time (default: last_modified_time)',
            },
          },
        },
      },
      {
        name: 'get_card_product',
        description: 'Get configuration details of a specific card product including controls, fulfillment, and funding',
        inputSchema: {
          type: 'object',
          properties: {
            card_product_token: {
              type: 'string',
              description: 'Card product token to retrieve',
            },
          },
          required: ['card_product_token'],
        },
      },
      {
        name: 'list_transactions',
        description: 'List transactions across the program with optional filters for type, state, and date range',
        inputSchema: {
          type: 'object',
          properties: {
            count: {
              type: 'number',
              description: 'Number of transactions to return (default: 5, max: 10)',
            },
            start_index: {
              type: 'number',
              description: 'Zero-based start index for pagination (default: 0)',
            },
            type: {
              type: 'string',
              description: 'Filter by transaction type: authorization, authorization.clearing, refund, etc.',
            },
            state: {
              type: 'string',
              description: 'Filter by state: PENDING, COMPLETION, DECLINED, ERROR',
            },
            start_date: {
              type: 'string',
              description: 'Start date filter in ISO 8601 format (e.g. 2024-01-01)',
            },
            end_date: {
              type: 'string',
              description: 'End date filter in ISO 8601 format (e.g. 2024-12-31)',
            },
          },
        },
      },
      {
        name: 'get_transaction',
        description: 'Get full details of a specific transaction by token including amount, merchant, and authorization data',
        inputSchema: {
          type: 'object',
          properties: {
            transaction_token: {
              type: 'string',
              description: 'Unique transaction token',
            },
          },
          required: ['transaction_token'],
        },
      },
      {
        name: 'list_transactions_for_user',
        description: 'List all transactions for a specific cardholder user with optional date range and type filters',
        inputSchema: {
          type: 'object',
          properties: {
            user_token: {
              type: 'string',
              description: 'User token to list transactions for',
            },
            count: {
              type: 'number',
              description: 'Number of transactions to return (default: 5, max: 10)',
            },
            start_index: {
              type: 'number',
              description: 'Zero-based start index for pagination (default: 0)',
            },
            type: {
              type: 'string',
              description: 'Filter by transaction type',
            },
            start_date: {
              type: 'string',
              description: 'Start date in ISO 8601 format',
            },
            end_date: {
              type: 'string',
              description: 'End date in ISO 8601 format',
            },
          },
          required: ['user_token'],
        },
      },
      {
        name: 'list_transactions_for_card',
        description: 'List all transactions made on a specific card with optional date range filters',
        inputSchema: {
          type: 'object',
          properties: {
            card_token: {
              type: 'string',
              description: 'Card token to list transactions for',
            },
            count: {
              type: 'number',
              description: 'Number of transactions to return (default: 5, max: 10)',
            },
            start_index: {
              type: 'number',
              description: 'Zero-based start index for pagination (default: 0)',
            },
            type: {
              type: 'string',
              description: 'Filter by transaction type',
            },
            start_date: {
              type: 'string',
              description: 'Start date in ISO 8601 format',
            },
            end_date: {
              type: 'string',
              description: 'End date in ISO 8601 format',
            },
          },
          required: ['card_token'],
        },
      },
      {
        name: 'list_velocity_controls',
        description: 'List velocity controls (spending limits) configured for a user or card product',
        inputSchema: {
          type: 'object',
          properties: {
            user_token: {
              type: 'string',
              description: 'Filter velocity controls assigned to a specific user',
            },
            card_product_token: {
              type: 'string',
              description: 'Filter velocity controls assigned to a specific card product',
            },
            count: {
              type: 'number',
              description: 'Number of controls to return (default: 5, max: 10)',
            },
            start_index: {
              type: 'number',
              description: 'Zero-based start index for pagination (default: 0)',
            },
          },
        },
      },
      {
        name: 'get_velocity_control',
        description: 'Get configuration of a specific velocity control by token including limits and window',
        inputSchema: {
          type: 'object',
          properties: {
            velocity_control_token: {
              type: 'string',
              description: 'Velocity control token to retrieve',
            },
          },
          required: ['velocity_control_token'],
        },
      },
      {
        name: 'create_velocity_control',
        description: 'Create a spending velocity control to limit transaction amounts, counts, or merchant categories within a time window',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Human-readable name for this velocity control',
            },
            association: {
              type: 'string',
              description: 'JSON object scoping this control: {"user_token":"..."} or {"card_product_token":"..."}',
            },
            usage_limit: {
              type: 'number',
              description: 'Maximum number of transactions allowed in the velocity window (0 for unlimited)',
            },
            amount_limit: {
              type: 'number',
              description: 'Maximum total spend amount in the velocity window (in cents)',
            },
            velocity_window: {
              type: 'string',
              description: 'Time window for limits: DAY, WEEK, MONTH, LIFETIME, or TRANSACTION',
            },
            currency_code: {
              type: 'string',
              description: 'ISO 4217 currency code (default: USD)',
            },
            merchant_scope: {
              type: 'string',
              description: 'JSON object restricting to specific MCCs or merchant tokens',
            },
          },
          required: ['name', 'velocity_window'],
        },
      },
      {
        name: 'update_velocity_control',
        description: 'Update an existing velocity control — modify limits, window, or active status',
        inputSchema: {
          type: 'object',
          properties: {
            velocity_control_token: {
              type: 'string',
              description: 'Velocity control token to update',
            },
            name: {
              type: 'string',
              description: 'New name for the velocity control',
            },
            usage_limit: {
              type: 'number',
              description: 'New maximum transaction count',
            },
            amount_limit: {
              type: 'number',
              description: 'New maximum spend amount in cents',
            },
            active: {
              type: 'boolean',
              description: 'Enable (true) or disable (false) the velocity control',
            },
          },
          required: ['velocity_control_token'],
        },
      },
      {
        name: 'list_funding_sources',
        description: 'List funding sources (ACH accounts, program funding) available for card program funding',
        inputSchema: {
          type: 'object',
          properties: {
            user_token: {
              type: 'string',
              description: 'Filter funding sources for a specific user (for user-level funding)',
            },
            type: {
              type: 'string',
              description: 'Filter by type: ach, program, paymentcard',
            },
            count: {
              type: 'number',
              description: 'Number of funding sources to return (default: 5, max: 10)',
            },
            start_index: {
              type: 'number',
              description: 'Zero-based start index for pagination (default: 0)',
            },
          },
        },
      },
      {
        name: 'get_funding_source',
        description: 'Get details of a specific funding source by token including type, status, and balance',
        inputSchema: {
          type: 'object',
          properties: {
            funding_source_token: {
              type: 'string',
              description: 'Funding source token to retrieve',
            },
          },
          required: ['funding_source_token'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_users':
          return this.listUsers(args);
        case 'get_user':
          return this.getUser(args);
        case 'create_user':
          return this.createUser(args);
        case 'update_user':
          return this.updateUser(args);
        case 'list_cards':
          return this.listCards(args);
        case 'get_card':
          return this.getCard(args);
        case 'create_card':
          return this.createCard(args);
        case 'transition_card':
          return this.transitionCard(args);
        case 'list_card_products':
          return this.listCardProducts(args);
        case 'get_card_product':
          return this.getCardProduct(args);
        case 'list_transactions':
          return this.listTransactions(args);
        case 'get_transaction':
          return this.getTransaction(args);
        case 'list_transactions_for_user':
          return this.listTransactionsForUser(args);
        case 'list_transactions_for_card':
          return this.listTransactionsForCard(args);
        case 'list_velocity_controls':
          return this.listVelocityControls(args);
        case 'get_velocity_control':
          return this.getVelocityControl(args);
        case 'create_velocity_control':
          return this.createVelocityControl(args);
        case 'update_velocity_control':
          return this.updateVelocityControl(args);
        case 'list_funding_sources':
          return this.listFundingSources(args);
        case 'get_funding_source':
          return this.getFundingSource(args);
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

  private get authHeader(): string {
    return `Basic ${btoa(`${this.appToken}:${this.accessToken}`)}`;
  }

  private buildPaginationParams(args: Record<string, unknown>): URLSearchParams {
    const params = new URLSearchParams();
    params.set('count', String((args.count as number) ?? 5));
    params.set('start_index', String((args.start_index as number) ?? 0));
    return params;
  }

  private async apiGet(path: string, params?: URLSearchParams): Promise<ToolResult> {
    const qs = params && params.toString() ? `?${params.toString()}` : '';
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}${qs}`, {
      headers: {
        Authorization: this.authHeader,
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) {
      const err = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `API error: ${response.status} ${err}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apiPost(path: string, body: unknown): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: {
        Authorization: this.authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const err = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `API error: ${response.status} ${err}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apiPut(path: string, body: unknown): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'PUT',
      headers: {
        Authorization: this.authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const err = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `API error: ${response.status} ${err}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listUsers(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.buildPaginationParams(args);
    if (args.fields) params.set('fields', args.fields as string);
    if (args.sort_by) params.set('sort_by', args.sort_by as string);
    return this.apiGet('/users', params);
  }

  private async getUser(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.user_token) return { content: [{ type: 'text', text: 'user_token is required' }], isError: true };
    return this.apiGet(`/users/${encodeURIComponent(args.user_token as string)}`);
  }

  private async createUser(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.first_name || !args.last_name) {
      return { content: [{ type: 'text', text: 'first_name and last_name are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      first_name: args.first_name,
      last_name: args.last_name,
    };
    if (args.email) body.email = args.email;
    if (args.token) body.token = args.token;
    if (args.phone) body.phone = args.phone;
    if (args.address1) body.address1 = args.address1;
    if (args.address2) body.address2 = args.address2;
    if (args.city) body.city = args.city;
    if (args.state) body.state = args.state;
    if (args.postal_code) body.postal_code = args.postal_code;
    if (args.country) body.country = args.country;
    if (args.identifications) {
      try { body.identifications = JSON.parse(args.identifications as string); } catch { /* ignore parse error */ }
    }
    if (args.metadata) {
      try { body.metadata = JSON.parse(args.metadata as string); } catch { /* ignore parse error */ }
    }
    return this.apiPost('/users', body);
  }

  private async updateUser(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.user_token) return { content: [{ type: 'text', text: 'user_token is required' }], isError: true };
    const body: Record<string, unknown> = {};
    const fields = ['first_name', 'last_name', 'email', 'phone', 'address1', 'city', 'state', 'postal_code'];
    for (const f of fields) { if (args[f] !== undefined) body[f] = args[f]; }
    if (args.metadata) {
      try { body.metadata = JSON.parse(args.metadata as string); } catch { /* ignore parse error */ }
    }
    return this.apiPut(`/users/${encodeURIComponent(args.user_token as string)}`, body);
  }

  private async listCards(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.user_token) {
      const params = this.buildPaginationParams(args);
      return this.apiGet(`/cards/user/${encodeURIComponent(args.user_token as string)}`, params);
    }
    const params = this.buildPaginationParams(args);
    if (args.card_product_token) params.set('card_product_token', args.card_product_token as string);
    return this.apiGet('/cards', params);
  }

  private async getCard(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.card_token) return { content: [{ type: 'text', text: 'card_token is required' }], isError: true };
    return this.apiGet(`/cards/${encodeURIComponent(args.card_token as string)}`);
  }

  private async createCard(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.user_token || !args.card_product_token) {
      return { content: [{ type: 'text', text: 'user_token and card_product_token are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      user_token: args.user_token,
      card_product_token: args.card_product_token,
    };
    if (args.token) body.token = args.token;
    if (typeof args.expedite === 'boolean') body.expedite = args.expedite;
    if (args.metadata) {
      try { body.metadata = JSON.parse(args.metadata as string); } catch { /* ignore parse error */ }
    }
    return this.apiPost('/cards', body);
  }

  private async transitionCard(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.card_token || !args.state) {
      return { content: [{ type: 'text', text: 'card_token and state are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      card_token: args.card_token,
      state: args.state,
      channel: (args.channel as string) ?? 'API',
    };
    if (args.reason_code) body.reason_code = args.reason_code;
    return this.apiPost('/cardtransitions', body);
  }

  private async listCardProducts(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.buildPaginationParams(args);
    if (args.sort_by) params.set('sort_by', args.sort_by as string);
    return this.apiGet('/cardproducts', params);
  }

  private async getCardProduct(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.card_product_token) {
      return { content: [{ type: 'text', text: 'card_product_token is required' }], isError: true };
    }
    return this.apiGet(`/cardproducts/${encodeURIComponent(args.card_product_token as string)}`);
  }

  private async listTransactions(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.buildPaginationParams(args);
    if (args.type) params.set('type', args.type as string);
    if (args.state) params.set('state', args.state as string);
    if (args.start_date) params.set('start_date', args.start_date as string);
    if (args.end_date) params.set('end_date', args.end_date as string);
    return this.apiGet('/transactions', params);
  }

  private async getTransaction(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.transaction_token) {
      return { content: [{ type: 'text', text: 'transaction_token is required' }], isError: true };
    }
    return this.apiGet(`/transactions/${encodeURIComponent(args.transaction_token as string)}`);
  }

  private async listTransactionsForUser(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.user_token) return { content: [{ type: 'text', text: 'user_token is required' }], isError: true };
    const params = this.buildPaginationParams(args);
    if (args.type) params.set('type', args.type as string);
    if (args.start_date) params.set('start_date', args.start_date as string);
    if (args.end_date) params.set('end_date', args.end_date as string);
    return this.apiGet(`/transactions/user/${encodeURIComponent(args.user_token as string)}`, params);
  }

  private async listTransactionsForCard(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.card_token) return { content: [{ type: 'text', text: 'card_token is required' }], isError: true };
    const params = this.buildPaginationParams(args);
    if (args.type) params.set('type', args.type as string);
    if (args.start_date) params.set('start_date', args.start_date as string);
    if (args.end_date) params.set('end_date', args.end_date as string);
    return this.apiGet(`/transactions/card/${encodeURIComponent(args.card_token as string)}`, params);
  }

  private async listVelocityControls(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.buildPaginationParams(args);
    if (args.user_token) params.set('user_token', args.user_token as string);
    if (args.card_product_token) params.set('card_product_token', args.card_product_token as string);
    return this.apiGet('/velocitycontrols', params);
  }

  private async getVelocityControl(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.velocity_control_token) {
      return { content: [{ type: 'text', text: 'velocity_control_token is required' }], isError: true };
    }
    return this.apiGet(`/velocitycontrols/${encodeURIComponent(args.velocity_control_token as string)}`);
  }

  private async createVelocityControl(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name || !args.velocity_window) {
      return { content: [{ type: 'text', text: 'name and velocity_window are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      name: args.name,
      velocity_window: args.velocity_window,
      currency_code: (args.currency_code as string) ?? 'USD',
    };
    if (args.usage_limit !== undefined) body.usage_limit = args.usage_limit;
    if (args.amount_limit !== undefined) body.amount_limit = args.amount_limit;
    if (args.association) {
      try { body.association = JSON.parse(args.association as string); } catch { body.association = args.association; }
    }
    if (args.merchant_scope) {
      try { body.merchant_scope = JSON.parse(args.merchant_scope as string); } catch { /* ignore */ }
    }
    return this.apiPost('/velocitycontrols', body);
  }

  private async updateVelocityControl(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.velocity_control_token) {
      return { content: [{ type: 'text', text: 'velocity_control_token is required' }], isError: true };
    }
    const body: Record<string, unknown> = {};
    if (args.name !== undefined) body.name = args.name;
    if (args.usage_limit !== undefined) body.usage_limit = args.usage_limit;
    if (args.amount_limit !== undefined) body.amount_limit = args.amount_limit;
    if (typeof args.active === 'boolean') body.active = args.active;
    return this.apiPut(`/velocitycontrols/${encodeURIComponent(args.velocity_control_token as string)}`, body);
  }

  private async listFundingSources(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.buildPaginationParams(args);
    if (args.type) params.set('type', args.type as string);
    if (args.user_token) {
      return this.apiGet(`/fundingsources/user/${encodeURIComponent(args.user_token as string)}`, params);
    }
    return this.apiGet('/fundingsources/program', params);
  }

  private async getFundingSource(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.funding_source_token) {
      return { content: [{ type: 'text', text: 'funding_source_token is required' }], isError: true };
    }
    return this.apiGet(`/fundingsources/${encodeURIComponent(args.funding_source_token as string)}`);
  }
}
